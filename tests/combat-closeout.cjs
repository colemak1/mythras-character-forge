// Subsystem 5 closeout cases (docs/combat-cases-batch-1.md C5-CL*; docs/combat-closeout-review.md).
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
const setup=()=>run('S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};S.gearWeapons=["Broadsword","Buckler","Javelin"];APPVIEW="play";VIEW_ONLY=false;normalizeState();PM_EFFECT_ROLL_REF=null;');
const atk=o=>JSON.stringify(Object.assign({label:"Broadsword",pct:60,roll:20,tier:"Success",oppTier:"Failure",combat:true,combatKind:"style",combatRole:"attack",weapon:"Broadsword"},o));

test('C5-CL01 first successful attack on a Surprised target earns +1 Special Effect (Core p.105 example: 2)',()=>{
 setup();run(`S.rollLog=[${atk({})}];`);
 assert.equal(run('rollEffectsWon(S.rollLog[0])'),1);
 run('APP.playSetTargetSurprised(0,true)');
 assert.equal(run('rollEffectsWon(S.rollLog[0])'),2,'Success vs automatic Failure + surprise bonus');
 const h=run('PM_EFFECT_ROLL_REF=S.rollLog[0];pmResolveCardHTML()');assert.match(h,/You win <b>2 Special Effects<\/b> <span class="pmx-dim">\(including 1 for surprise\)/);
 run('APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Bleed"));APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Choose Location"))');
 assert.equal(run('S.rollLog[0].effectsPicked.length'),2,'both effects can be chosen');
 run('APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Trip Opponent"))');assert.equal(run('S.rollLog[0].effectsPicked.length'),2,'no third');
});
test('the surprise bonus needs a successful attack, and never applies to a defence or a failed attack',()=>{
 setup();
 assert.equal(run(`rollEffectsWon(${atk({tier:"Failure",oppTier:"Failure",targetSurprised:true})})`),0);
 assert.equal(run(`rollEffectsWon(${atk({combatRole:"defence",targetSurprised:true})})`),1);
 assert.equal(run(`rollEffectsWon(${atk({tier:"Critical",oppTier:"Failure",targetSurprised:true})})`),3);
 run(`S.rollLog=[${atk({tier:"Failure"})}];PM_EFFECT_ROLL_REF=S.rollLog[0];`);assert.doesNotMatch(run('pmResolveCardHTML()'),/Target was Surprised/,'no checkbox on a failed attack');
});
test('marking the target Surprised is separate from your own Surprised flag and survives reload',()=>{
 setup();run(`S.play.surprised=false;S.rollLog=[${atk({})}];APP.playSetTargetSurprised(0,true);`);
 assert.equal(run('S.play.surprised'),false,'your own Surprised flag is untouched');
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('S.rollLog[0].targetSurprised'),true);assert.equal(run('rollEffectsWon(S.rollLog[0])'),2);
});
test('changing the surprise flag clears chosen effects, and read-only views cannot change it',()=>{
 setup();run(`S.rollLog=[${atk({targetSurprised:true,effectsPicked:["Bleed","Choose Location"]})}];APP.playSetTargetSurprised(0,false);`);
 assert.equal(run('S.rollLog[0].effectsPicked.length'),0);
 run('VIEW_ONLY=true;APP.playSetTargetSurprised(0,true);VIEW_ONLY=false;');assert.equal(run('S.rollLog[0].targetSurprised'),false);
});
test('C5-CL06..CL08 grappling: location effects, Damage Modifier follow-up, Struggle opposed skills',()=>{
 const h=run('pmCombatRulesRefHTML()');
 assert.match(h,/held <b>arm or leg<\/b> is unusable/);assert.match(h,/<b>head or torso<\/b> makes the victim\\?'s skill rolls Hard|head or torso<\/b> makes the victim/);
 assert.match(h,/equal to your <b>Damage Modifier<\/b>/);assert.match(h,/opposed Brawn or Unarmed against whichever the grappler prefers/);
 assert.match(run('pmActionsInfoHTML()'),/Struggle[\s\S]*opposed Brawn or Unarmed/);
});
test('C5-CL10 Choose Location cannot target a passively blocked location',()=>{
 assert.match(run('SPECIAL_EFFECTS.find(e=>e[0]==="Choose Location")[6]'),/can't pick a location the defender is passively blocking/);
 setup();assert.match(run('pmWeaponCardsHTML()'),/Choose Location can&#39;t target them/);
});
test('C5-CL11 a second throwing weapon held in the off-hand readies as a Free Action',()=>{
 assert.match(run('pmActionsInfoHTML()'),/off-hand moves to the throwing hand as a Free Action/);
});
test('final fight step 8: both End fight controls do the same full reset',()=>{
 for(const how of ['APP.playClearInitiative()','APP.advanceTime("fight")']){
  setup();run('S.play.initiative={total:23,roll:8,bonus:15};S.play.apUsed=1;S.play.surprised=true;'+how);
  assert.equal(run('S.play.initiative'),null,how);assert.equal(run('S.play.apUsed'),0,how);assert.equal(run('S.play.surprised'),false,how);
 }
 setup();run('S.play.initiative={total:23,roll:8,bonus:15};S.play.apUsed=1;VIEW_ONLY=true;APP.playClearInitiative();VIEW_ONLY=false;');
 assert.equal(run('S.play.apUsed'),1,'read-only views cannot end the fight');
});
console.log(passed+' combat closeout tests passed');
