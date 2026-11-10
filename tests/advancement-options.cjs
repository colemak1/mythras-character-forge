// Subsystem 4 options: 1d6+1 skill improvement as a campaign rule (Core p.72) and
// the Passion Deepening and Waning helper (Core p.82).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const shown=[];
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,WeakSet,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
run('render=()=>{};window.alert=m=>{__alerts.push(m)};var __alerts=[];var __realRandom=Math.random;');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const setup=()=>run('S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};APPVIEW="play";VIEW_ONLY=false;normalizeState();__alerts=[];');
const dice=vals=>{ctx.__q=vals.slice();run('Math.random=()=>__q.length?__q.shift():0;');};
const A='std:Athletics';

test('campaign rules keep the skill improvement choice; anything else means Core 1d4+1',()=>{
 assert.equal(run('normalizedCampaignRules({characteristicImprovement:"training",skillImprovement:"d6"}).skillImprovement'),'d6');
 assert.equal(run('normalizedCampaignRules({characteristicImprovement:"training"}).skillImprovement'),'d4');
 assert.equal(run('normalizedCampaignRules({characteristicImprovement:"training",skillImprovement:"d20"}).skillImprovement'),'d4');
});
test('standalone characters use Core 1d4+1; a campaign with the option uses 1d6+1',()=>{
 setup();assert.equal(run('skillImprovementDie()'),4);
 run('S.campaignId="c1";CHARACTER_CAMPAIGN_RULES={id:"c1",status:"ready",rules:{characteristicImprovement:"training",skillImprovement:"d6",books:[]}};');
 assert.equal(run('skillImprovementDie()'),6);
 run('CHARACTER_CAMPAIGN_RULES.rules.skillImprovement="d4"');assert.equal(run('skillImprovementDie()'),4);
});
test('a successful Experience Roll gains 1d6+1 under the campaign option',()=>{
 setup();run('S.campaignId="c1";CHARACTER_CAMPAIGN_RULES={id:"c1",status:"ready",rules:{characteristicImprovement:"training",skillImprovement:"d6",books:[]}};S.xp.pool=1;');
 const base=run(`finalPct("${A}")`);dice([0.999,0.99]);run(`APP.xpSpend("${A}")`);
 assert.equal(run(`finalPct("${A}")`),base+7,'d100 100 succeeds; d6 rolls 6, +1');
 run('S.passions=[{name:"Loyalty",type:"loyalty",startingOverride:40}];S.xp.pool=1;');dice([0.999,0.99]);run('APP.xpSpendPassion(0)');
 assert.equal(run('passionVal(S.passions[0])'),47,'Passions use the same option');
 run('Math.random=__realRandom;');
});
test('while campaign rules are loading, nothing is spent or changed',()=>{
 setup();run(`S.campaignId="c1";CHARACTER_CAMPAIGN_RULES={id:null,status:"none",rules:null};S.xp.pool=1;APP.xpToggleFumble("${A}");`);
 const base=run(`finalPct("${A}")`);run(`APP.xpSpend("${A}")`);
 assert.equal(run('S.xp.pool'),1);assert.equal(run(`finalPct("${A}")`),base);assert.equal(run(`S.xp.fumbled.includes("${A}")`),true);
 assert.match(run('__alerts[0]'),/still loading/);
});
test('Passion shift: Weak 1d10, Moderate 1d10+5, Strong 1d10+10; waning stops at 0 (Core p.82)',()=>{
 setup();run('S.passions=[{name:"Love",type:"loyalty",startingOverride:40}];');
 dice([0.99]);run('APP.passionShift(0,"weak",1)');assert.equal(run('passionVal(S.passions[0])'),50);
 dice([0]);run('APP.passionShift(0,"moderate",1)');assert.equal(run('passionVal(S.passions[0])'),56);
 dice([0]);run('APP.passionShift(0,"strong",-1)');assert.equal(run('passionVal(S.passions[0])'),45);
 run('S.passions[0].startingOverride=5;S.passions[0].xpBonus=0;');dice([0.99]);run('APP.passionShift(0,"strong",-1)');assert.equal(run('passionVal(S.passions[0])'),0,'never below 0');
 const h=JSON.parse(run('JSON.stringify(S.xp.history[0])'));assert.equal(h.shift,'strong');assert.equal(h.roll,10);
 run('Math.random=__realRandom;');
});
test('Passion shift rejects bad input and read-only views',()=>{
 setup();run('S.passions=[{name:"Love",type:"loyalty",startingOverride:40}];APP.passionShift(0,"huge",1);APP.passionShift(0,"weak",2);APP.passionShift(5,"weak",1);');
 assert.equal(run('passionVal(S.passions[0])'),40);
 run('VIEW_ONLY=true;APP.passionShift(0,"weak",1);VIEW_ONLY=false;');assert.equal(run('passionVal(S.passions[0])'),40);
 assert.match(run('xpModalHtml()'),/APP\.passionShift\(0,/);
});
// #255: the Improve skills help showed "+1d4+1%" for a 1d6+1 campaign. The die
// only comes from skillImprovementDie(), so help and roll match once rules are
// ready; before that the help guessed 1d4. It must never name a die it doesn't know.
test('Improve skills help names the same die the roll uses, and never guesses 1d4 (#255)',()=>{
 setup();run('S.campaignId="c1";S.xp.pool=1;CHARACTER_CAMPAIGN_RULES={id:"c1",status:"ready",rules:{characteristicImprovement:"training",skillImprovement:"d6",books:[]}};');
 let h=run('xpModalHtml()');assert.match(h,/\+1d6\+1%/);assert.doesNotMatch(h,/\+1d4\+1%/);
 run('CHARACTER_CAMPAIGN_RULES={id:"c1",status:"loading",rules:null};');
 h=run('xpModalHtml()');assert.doesNotMatch(h,/\+1d4\+1%/,'loading: no guessed die');assert.match(h,/loading this campaign/);
 run('CHARACTER_CAMPAIGN_RULES={id:"c1",status:"error",rules:null};');
 h=run('xpModalHtml()');assert.doesNotMatch(h,/\+1d4\+1%/,'failed: no guessed die');assert.match(h,/could not be loaded/);assert.match(h,/APP\.openXP\(\)/,'offers Retry');
 run('__alerts=[];');run(`APP.xpSpend("${A}")`);
 assert.equal(run('S.xp.pool'),1,'nothing spent after a failed load');assert.match(run('__alerts[0]'),/could not be loaded/);
 run('S.campaignId=null;');assert.match(run('xpModalHtml()'),/\+1d4\+1%/,'standalone: Core 1d4+1');
});
console.log(passed+' advancement option tests passed');
