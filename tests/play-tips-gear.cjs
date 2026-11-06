// Play Mode short tips, Passion rolls and Gear tab (redesign batch 5).
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
for(const name of ['data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
run('render=()=>{};');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const setup=()=>run('S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};APPVIEW="play";VIEW_ONLY=false;normalizeState();');

test('every vitals item has a short tip, and tips are escaped text',()=>{
 setup();const h=run('pmVitalsBarHTML()');
 for(const id of ['health','ap','initiative','magic','luck','fatigue'])assert(h.includes(run(`esc(PM_TIPS.${id})`)),id+' tip shown');
 assert.equal(run('pmTip("nope")'),'');
 for(const t of Object.values(JSON.parse(run('JSON.stringify(PM_TIPS)'))))assert(t.length<=260,'tips stay short: '+t.slice(0,30));
});
test('the Luck tip matches Core: reroll, extra AP when out, or Major to Serious',()=>{
 const t=run('PM_TIPS.luck');assert.match(t,/reroll/);assert.match(t,/extra Action Point/);assert.match(t,/Major Wound to Serious/);
});
test('a Passion rolls like a skill and is logged',()=>{
 setup();run('S.passions=[{name:"Loyalty (Clan)",type:"loyalty",start:40}];passionVal=()=>40;var __r=Math.random;Math.random=()=>0.2;');
 run('APP.rollPassion(0)');run('Math.random=__r;');
 const r=JSON.parse(run('JSON.stringify(S.rollLog[0])'));
 assert.equal(r.label,'Loyalty (Clan) (Passion)');assert.equal(r.pct,40);assert.equal(r.tier,run(`resolveRoll(${r.roll==="00"?100:r.roll},40)`));assert.equal(r.combat,false);
 run('APP.rollPassion(5);APP.rollPassion("0")');assert.equal(run('S.rollLog.length'),1,'bad indexes do nothing');
 run('VIEW_ONLY=true;APP.rollPassion(0);VIEW_ONLY=false;');assert.equal(run('S.rollLog.length'),1,'not from a read-only view');
});
test('a Passion without a percentage asks for one instead of rolling',()=>{
 setup();run('S.passions=[{name:"Hate"}];passionVal=()=>"?";APP.rollPassion(0)');
 assert.equal(run('S.rollLog.length'),0);assert.match(run('PM_MSG'),/percentage/);
});
test('the Gear tab shows encumbrance against the limit and says when no armour is worn',()=>{
 setup();run('S.inventory=[{name:"Rope",qty:1,enc:1,cost:5}];');
 const h=run('pmGearPanelHTML()');
 assert.match(h,new RegExp('<b>'+run('gearEncTotal()')+'</b><span class="pmx-dim"> / '+run('encLimit()')));
 assert.match(h,/No armour worn/);assert.match(h,/value="Rope"/);
 run('S.inventory=[{name:"Anvil",qty:1,enc:99,cost:0}];');assert.match(run('pmGearPanelHTML()'),/over your limit/);
});
console.log(passed+' play tips and gear tests passed');
