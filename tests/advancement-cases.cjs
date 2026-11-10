// Subsystem 4 (Advancement, hazards and recovery): regression tests for the
// rows mapped "Pass (code)" in docs/advancement-cases-batch-1.md.
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
run('render=()=>{};window.alert=()=>{};');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const setup=()=>run('S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};APPVIEW="play";VIEW_ONLY=false;normalizeState();');
// Deterministic dice: Math.random returns the queued values in order.
const dice=vals=>{ctx.__q=vals.slice();run('Math.random=()=>__q.length?__q.shift():0;');};
run('var __realRandom=Math.random;');
const A='std:Athletics';

test('A4-X05/X06/X10 Experience Rolls bank in the pool; one roll per attempt, no 100% cap',()=>{
 setup();run('APP.xpAward("2")');assert.equal(run('S.xp.pool'),2);
 dice([0.99,0.99]);run(`APP.xpSpend("${A}")`);assert.equal(run('S.xp.pool'),1,'one roll spent');
 run(`S.xp.bonus["${A}"]=200;`);dice([0.99,0.0]);const before=run(`finalPct("${A}")`);run(`APP.xpSpend("${A}")`);
 assert(run(`finalPct("${A}")`)>before,'skills can rise past 100%');assert.equal(run('S.xp.pool'),0);
 run(`APP.xpSpend("${A}")`);assert.equal(run('S.xp.pool'),0,'no roll without a banked roll');
});
test('A4-X07..X09 d100 + INT vs current skill: meeting it gives 1d4+1, falling short gives +1',()=>{
 setup();run('S.xp.pool=2;');const base=run(`finalPct("${A}")`);
 // d100 -> 1 (Math.random 0), +INT 13 = 14 < 27: fail, +1
 dice([0]);run(`APP.xpSpend("${A}")`);assert.equal(run(`finalPct("${A}")`),base+1);
 // d100 -> 100 (0.999), success; d4 -> 4 (0.99): +5
 dice([0.999,0.99]);run(`APP.xpSpend("${A}")`);assert.equal(run(`finalPct("${A}")`),base+1+5);
 const h=JSON.parse(run('JSON.stringify(S.xp.history[0])'));assert.equal(h.success,true);assert.equal(h.total,100+13);
});
test('A4-X12/X13 a fumbled skill gets +1 once before the improvement roll, and never stacks',()=>{
 setup();run(`S.xp.pool=1;APP.xpToggleFumble("${A}");`);const base=run(`finalPct("${A}")`);
 run(`APP.xpToggleFumble("${A}");APP.xpToggleFumble("${A}");`);assert.equal(run(`S.xp.fumbled.filter(k=>k==="${A}").length`),1);
 dice([0]);run(`APP.xpSpend("${A}")`);
 assert.equal(run(`finalPct("${A}")`),base+1+1,'fumble +1 then failed roll +1');assert.equal(run(`S.xp.fumbled.includes("${A}")`),false);
 assert.equal(run('S.xp.history[0].fumbleApplied'),true);
});
test('A4-X16 Passions improve with the same Experience Roll',()=>{
 setup();run('S.passions=[{name:"Loyalty",type:"loyalty",startingOverride:40}];S.xp.pool=1;');
 assert.equal(run('passionVal(S.passions[0])'),40);
 dice([0]);run('APP.xpSpendPassion(0)');assert.equal(run('passionVal(S.passions[0])'),41,'failed improvement roll still gives +1');assert.equal(run('S.xp.pool'),0);
 run('S.passions.push({name:"Love",type:"romantic",subjPOW:"",subjCHA:""});S.xp.pool=1;');assert.equal(run('passionVal(S.passions[1])'),"?");run('APP.xpSpendPassion(1)');assert.equal(run('S.xp.pool'),1,'a Passion without a number is not improved');
});
test('A4-T01..T10/T15..T17 training table: 21–30 → 1d2 … +1 per further 10; exactly 20 uses 1d2; under 20 refused',()=>{
 const steps=[[20,0],[21,0],[30,0],[31,1],[40,1],[41,2],[50,2],[51,3],[60,3],[61,4],[71,5],[81,6]];
 for(const [diff,step] of steps)assert.equal(run(`trainingStep(${diff},"trainer")`),step,'difference '+diff);
 assert.equal(run('trainingStep(19,"trainer")'),null);
 const die=s=>JSON.parse(run(`JSON.stringify(trainingDie(${s}))`));
 assert.deepEqual(die(0),{sides:2,bonus:0});assert.deepEqual(die(1),{sides:3,bonus:0});assert.deepEqual(die(2),{sides:4,bonus:0});
 assert.deepEqual(die(3),{sides:6,bonus:0});assert.deepEqual(die(4),{sides:6,bonus:1});assert.deepEqual(die(7),{sides:6,bonus:4});
});
test('A4-T11..T14 a teacher shifts the step: critical +2, success +1, failure 0, fumble −1',()=>{
 for(const [r,s] of [["critical",2],["success",1],["failure",0],["fumble",-1]])assert.equal(run(`trainingStep(21,"${r}")`),s,r);
 assert.deepEqual(JSON.parse(run('JSON.stringify(trainingDie(-1))')),{sides:0,bonus:0},'a fumble at the first row can give nothing');
 assert.equal(run('trainingStep(21,"bogus")'),null);
});
test('training needs confirmation and a 20-point gap, then blocks re-training until an Experience Roll improves the skill',()=>{
 setup();const base=run(`finalPct("${A}")`);
 run(`APP.xpTrain("${A}",${base+25},"trainer",false)`);assert.equal(run(`finalPct("${A}")`),base,'unconfirmed');
 run(`APP.xpTrain("${A}",${base+10},"trainer",true)`);assert.match(run('XP_TRAIN_MSG'),/at least 20/);
 dice([0.99]);run(`APP.xpTrain("${A}",${base+25},"trainer",true)`);assert.equal(run(`finalPct("${A}")`),base+2,'1d2 rolled 2');
 const after=run(`finalPct("${A}")`);run(`APP.xpTrain("${A}",${after+25},"trainer",true)`);assert.match(run('XP_TRAIN_MSG'),/Experience Roll must improve it|before training it again/);
 run('S.xp.pool=1;');dice([0]);run(`APP.xpSpend("${A}")`);assert.equal(run(`(S.xp.trainingPending||[]).includes("${A}")`),false,'the roll clears the block');
});
test('A4-C14..C16 learning a new Professional Skill needs confirmation and 3 rolls',()=>{
 setup();run('S.xp.pool=2;APP.xpLearnProfessional("Commerce","",true)');assert.equal(run('S.xp.pool'),2);assert.match(run('XP_LEARN_MSG'),/3 banked/);
 run('S.xp.pool=3;APP.xpLearnProfessional("Commerce","",false)');assert.equal(run('S.xp.pool'),3);
 run('APP.xpLearnProfessional("Commerce","",true)');assert.equal(run('S.xp.pool'),0);
 assert(run('acquiredProfs().some(p=>p.name==="Commerce")'),'skill acquired');
});
test('A4-C09..C12 permanent improvement costs 1 + current − species minimum (Core p.73: DEX 12 → 10 rolls)',()=>{
 setup();run('S.chars.DEX=12;S.xp.pool=9;APP.xpCharacteristicPermanent("DEX",true)');assert.equal(run('effectiveChars().DEX'),12,'9 is not enough');
 run('S.xp.pool=10;APP.xpCharacteristicPermanent("DEX",true)');assert.equal(run('effectiveChars().DEX'),13);assert.equal(run('S.xp.pool'),0);
});
test('A4-C01..C08 trained characteristic: +1/10 of max, maintained by one roll per award, atrophies when stopped',()=>{
 setup();run('S.xp.pool=1;APP.xpCharacteristicTrain("STR",true)');const trained=run('effectiveChars().STR');assert(trained>13);
 run('APP.xpAward("3")');assert.equal(run('S.xp.pool'),2,'one of three rolls maintains the training');
 run('APP.xpCharacteristicToggle(0);APP.xpAward("2")');assert.equal(run('effectiveChars().STR'),13,'stopped training atrophies on the next award');
 assert.equal(run('S.xp.pool'),4);
 run('APP.xpCharacteristicTrain("SIZ",true)');assert.match(run('XP_CHAR_MSG'),/eligible/,'SIZ cannot be trained');
});
test('A4-H02..H07 natural healing: Minor per day, Serious per week, Major per month only after treatment, never above max',()=>{
 setup();const max=run('playMaxHP("Chest")'),hr=run('healRate(effectiveChars().CON)');
 run(`S.play.hp={"Chest":${max-1}}`);let i=JSON.parse(run('JSON.stringify(naturalRecoveryInfo("Chest"))'));assert.equal(i.interval,'day');assert.equal(i.rate,hr);
 run('APP.playNaturalRecovery("Chest","0")');assert.equal(run('playCurHP("Chest")'),max,'capped at max');
 run('S.play.hp={"Chest":0}');assert.equal(JSON.parse(run('JSON.stringify(naturalRecoveryInfo("Chest"))')).interval,'week');
 run(`S.play.hp={"Chest":${-max}}`);assert.equal(JSON.parse(run('JSON.stringify(naturalRecoveryInfo("Chest"))')).interval,'month');
 run('APP.playNaturalRecovery("Chest","0",false)');assert.equal(run('playCurHP("Chest")'),-max,'Major needs confirmed treatment');assert.match(run('PM_MSG'),/treatment/);
 run('APP.playNaturalRecovery("Chest","0",true)');assert.equal(run('playCurHP("Chest")'),-max+hr);
 run(`S.play.hp={"Chest":${max-3}};APP.playNaturalRecovery("Chest","1")`);assert.equal(run('playCurHP("Chest")'),Math.min(max,max-3+hr-1),'strenuous reduction');
 run(`S.play.hp={"Chest":${max-3}};APP.playNaturalRecovery("Chest","4")`);assert.equal(run('playCurHP("Chest")'),max-3,'reduction above 3 refused');
});
test('A4-F14..F16 Fatigue recovery time is the table period divided by Healing Rate',()=>{
 setup();const hr=run('healRate(effectiveChars().CON)');
 run('S.play.fatigue="Tired"');assert.match(run('fatigueRecoveryText("exertion")'),new RegExp((Math.round(180/hr/6)/10)+' hours|'+Math.round(180/hr)+' minutes'));
 assert.match(run('fatigueRecoveryText("blood")'),/one level per day/);assert.match(run('fatigueRecoveryText("asphyxiation")'),/one level per minute/);
 run('S.play.fatigue="Fresh"');assert.equal(run('fatigueRecoveryText("exertion")'),'No rest needed.');
 run('S.play.fatigue="Dead"');assert.equal(run('fatigueRecoveryText("exertion")'),'Never.');
});
run('Math.random=__realRandom;');
console.log(passed+' advancement case tests passed');
