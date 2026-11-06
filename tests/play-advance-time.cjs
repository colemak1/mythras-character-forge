// Advance Time menu and combat tab order (owner, 2026-11-06).
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
const setup=()=>run('S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};S.gearWeapons=["Dagger"];APPVIEW="play";VIEW_ONLY=false;normalizeState();PM_MSG=null;');

test('Rest one day heals Minor Wounds by the Healing Rate only',()=>{
 setup();const hr=run('healRate(effectiveChars().CON)');const chestMax=run('playMaxHP("Chest")'),armMax=run('playMaxHP("Left Arm")');
 run(`S.play.hp={"Chest":${chestMax-1},"Left Arm":0,"Head":-${run('playMaxHP("Head")')}}`);
 run('APP.advanceTime("day")');
 assert.equal(run('playCurHP("Chest")'),Math.min(chestMax,chestMax-1+hr),'Minor Wound heals, capped at max');
 assert.equal(run('playCurHP("Left Arm")'),0,'a Serious Wound is not healed by a day');
 assert.match(run('PM_MSG'),/Serious: heals per week/);assert.match(run('PM_MSG'),/Major: needs treatment/);
});
test('Recover one Fatigue level steps down once and stops at Fresh',()=>{
 setup();run('S.play.fatigue=FATIGUE_LEVELS[2];APP.advanceTime("fatigue")');assert.equal(run('S.play.fatigue'),run('FATIGUE_LEVELS[1]'));
 run('S.play.fatigue="Fresh";APP.advanceTime("fatigue")');assert.equal(run('S.play.fatigue'),'Fresh');assert.match(run('PM_MSG'),/Already Fresh/);
});
test('End the fight clears initiative and Surprised and restores AP',()=>{
 setup();run('S.play.initiative={total:20,roll:6,bonus:14};S.play.apUsed=2;S.play.surprised=true;APP.advanceTime("fight")');
 assert.equal(run('S.play.initiative'),null);assert.equal(run('S.play.apUsed'),0);assert.equal(run('S.play.surprised'),false);
});
test('Start a new session refills Luck and leaves Magic Points alone (D-2)',()=>{
 setup();run('S.play.luck=0;S.play.magic=3;APP.advanceTime("session")');
 assert.equal(run('playCurLuck()'),run('playMaxLuck()'));assert.equal(run('S.play.magic'),3);
});
test('Advance Time is blocked in a read-only view and ignores unknown options',()=>{
 setup();run('S.play.luck=0;VIEW_ONLY=true;APP.advanceTime("session");VIEW_ONLY=false;');assert.equal(run('S.play.luck'),0);
 run('APP.advanceTime("year")');assert.equal(run('S.play.luck'),0);
});
test('the menu offers all four options',()=>{
 setup();const h=run('pmAdvanceTimeHTML()');
 for(const k of ['day','fatigue','fight','session'])assert.match(h,new RegExp(`APP\\.advanceTime\\('${k}'\\)`));
});
test('the roll card sits directly above the weapons',()=>{
 setup();const h=run('pmCombatTabHTML()');
 assert(h.indexOf('pmx-resolve')<h.indexOf('pmx-weapons'),'card, then weapons');
 assert(h.indexOf('pmx-weapons')<h.indexOf('pmx-turn'),'weapons before the turn strip');
});
test('once all effects are chosen the list folds away, and Change reopens it',()=>{
 setup();run('S.rollLog=[{label:"Dagger",pct:60,roll:20,tier:"Success",combat:true,combatKind:"style",combatRole:"attack",oppTier:"Failure",weapon:"Dagger",effectsPicked:["Bleed"]}];PM_EFFECT_ROLL_REF=S.rollLog[0];PM_FX_EDIT=null;');
 let h=run('pmResolveCardHTML()');assert.match(h,/<b>Bleed<\/b>/);assert.doesNotMatch(h,/pmx-fx-eligible/);assert.doesNotMatch(h,/Their defence:/,'the finished card is a one-line summary');
 run('PM_FX_EDIT=S.rollLog[0]');h=run('pmResolveCardHTML()');assert.match(h,/pmx-fx-eligible/);
});
console.log(passed+' advance time and combat order tests passed');
