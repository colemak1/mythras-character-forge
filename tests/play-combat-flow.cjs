// Play Mode combat flow (redesign batch 3): Attack/Parry record the role,
// the combat card shows only the effects the roll allows, and the log row
// leads back to it.
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
ctx.__shown=shown;run('pmDiceShow=r=>__shown.push(r.label+" "+r.roll+" "+r.tier);render=()=>pmDiceSync();');
run('render=()=>{};');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const setup=()=>run('S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};S.gearWeapons=["Dagger","Short bow"];APPVIEW="play";VIEW_ONLY=false;PM_EFFECT_ROLL_REF=null;');

test('Attack and Parry on a weapon card record the role with the roll',()=>{
 setup();
 run('APP.rollWithWeapon("Unarmed","std:Unarmed","","attack")');
 assert.equal(run('S.rollLog[0].combatRole'),'attack');assert.equal(run('S.rollLog[0].weapon'),'Unarmed');
 run('APP.rollWithWeapon("Unarmed","std:Unarmed","","defence")');
 assert.equal(run('S.rollLog[0].combatRole'),'defence');
 run('APP.rollWithWeapon("Unarmed","std:Unarmed","","nonsense")');
 assert.equal(run('S.rollLog[0].combatRole'),undefined,'only attack or defence is recorded');
});
test('Evade is always recorded as a defence',()=>{
 setup();run('APP.roll("std:Evade")');
 assert.equal(run('S.rollLog[0].combatKind'),'evade');assert.equal(run('S.rollLog[0].combatRole'),'defence');
});
test('ranged weapons offer Attack but not Parry',()=>{
 setup();const h=run('pmWeaponCardsHTML()');
 const bow=h.slice(h.indexOf("Short bow"),h.indexOf('Unarmed</span>'));
 assert.match(bow,/'attack'\)">Attack/);assert.doesNotMatch(bow,/Parry/);
 const dagger=h.slice(h.indexOf('Dagger'),h.indexOf("Short bow"));assert.match(dagger,/Parry/);
});
test('the combat card asks for the opponent result, then lists only eligible effects',()=>{
 setup();run('S.rollLog=[{label:"Dagger — Unarmed",pct:60,roll:4,tier:"Critical",combat:true,combatKind:"style",combatRole:"attack",oppTier:null,weapon:"Dagger"}];');
 let h=run('pmResolveCardHTML()');
 assert.match(h,/Their defence:/);assert.match(h,/No defence/);assert.doesNotMatch(h,/Choose<\/button>/);
 run('APP.playSetOpponentTier(0,"Failure")');h=run('pmResolveCardHTML()');
 assert.match(h,/You win <b>2 Special Effects<\/b>/);
 const eligible=run('SPECIAL_EFFECTS.filter(e=>canPickEffectForRoll(e,S.rollLog[0])).map(e=>e[0])');
 assert(eligible.includes('Bleed'),'a dagger can Bleed');assert(!eligible.includes('Arise'),'defensive-only effects are not offered');assert(!eligible.includes('Bash'));
 const listed=[...h.matchAll(/class="pmx-se[^"]*" data-fx="([^"]+)"/g)].map(m=>m[1].replace(/&#39;/g,"'"));
 assert.deepEqual(listed.sort(),[...eligible].sort(),'the card lists exactly the eligible effects');
 run('APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Bleed"))');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.rollLog[0].effectsPicked)')),['Bleed']);
 assert.match(run('pmResolveCardHTML()'),/1 of 2 chosen/);
});
test('a losing roll says the opponent chooses, and no effects are offered',()=>{
 setup();run('S.rollLog=[{label:"Parry",pct:60,roll:90,tier:"Failure",combat:true,combatKind:"style",combatRole:"defence",oppTier:"Critical"}];');
 const h=run('pmResolveCardHTML()');assert.match(h,/opponent wins <b class="bad">2 Special Effects<\/b>/i);assert.doesNotMatch(h,/Choose<\/button>/);
});
test('a Combat Style roll from the Skills tab is resolved on the card',()=>{
 setup();run('S.rollLog=[{label:"Hill Spear",pct:42,roll:20,tier:"Success",combat:true,combatKind:"style",oppTier:null}];');
 assert.match(run('playRollLogRow(S.rollLog[0],0)'),/Needs attack or defence[\s\S]*APP\.playJumpToEffects\(0\)">Resolve/);
 assert.match(run('pmResolveCardHTML()'),/Was this an attack or a defence\?/);
 run('APP.playJumpToEffects(0)');assert.equal(run('pmActiveTab()'),'combat');
});
test('Record damage shows the Body area (its own section on a phone)',()=>{
 setup();run('S.play.tab="combat";PM_VIEW="right";APP.playJumpToInjury()');assert.equal(run('PM_VIEW'),'body');
 assert.equal(run('pmActiveTab()'),'combat','the right-hand panel keeps its tab');
});
test('an effect name opens its description in a pop-up, with Choose when allowed',()=>{
 setup();run('S.rollLog=[{label:"Dagger",pct:60,roll:4,tier:"Critical",combat:true,combatKind:"style",combatRole:"attack",oppTier:"Failure",weapon:"Dagger"}];PM_EFFECT_ROLL_REF=S.rollLog[0];');
 const i=run('SPECIAL_EFFECTS.findIndex(e=>e[0]==="Bleed")');
 run(`APP.pmPopup("fx",${i})`);const h=run('pmPopupHTML()');
 assert.match(h,/role="dialog"/);assert.match(h,/major vessel/);assert.match(h,new RegExp('APP\\.playChooseEffect\\('+i+'\\)'));
 run('APP.pmPopupClose()');const closed=run('pmPopupHTML()');
 assert.doesNotMatch(closed,/role="dialog"/);assert.match(closed,/pmx-side-empty/,'the side panel keeps its place when empty, so nothing shifts');
});
test('a location opens its damage controls in a pop-up',()=>{
 setup();run('APP.pmOpenLoc("Chest")');assert.equal(run('S.play.selectedLoc'),'Chest');
 assert.match(run('pmPopupHTML()'),/Apply Damage/);
 run('APP.pmOpenLoc("Tail")');assert.equal(run('S.play.selectedLoc'),'Chest','unknown locations are ignored');
});
test('a teammate viewing the sheet sees the card but cannot act',()=>{
 setup();run('S.rollLog=[{label:"Dagger",pct:60,roll:20,tier:"Success",combat:true,combatKind:"style",combatRole:"attack",oppTier:null}];VIEW_ONLY=true;');
 const h=run('pmResolveCardHTML()');assert.match(h,/disabled onclick="APP\.playSetOpponentTier/);
 assert.match(run('pmWeaponCardsHTML()'),/class="pmx-act atk" disabled/);
 run('VIEW_ONLY=false;');
});
console.log(passed+' play combat flow tests passed');
