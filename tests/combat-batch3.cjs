// Combat Batch 3 fixes (docs/combat-cases-batch-1.md, C5-B3-*): Offensive weapons,
// Entrapping and javelin Pin Weapon exceptions, weapon trait notes, wound
// wording and the combat situations reference.
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
const setup=w=>run(`S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};S.gearWeapons=${JSON.stringify(w)};APPVIEW="play";VIEW_ONLY=false;normalizeState();`);
const pin='SPECIAL_EFFECTS.find(e=>e[0]==="Pin Weapon")';
const roll=o=>JSON.stringify(Object.assign({label:"x",tier:"Success",oppTier:"Failure",combat:true,combatKind:"style",combatRole:"attack"},o));

test('C5-B3-WT07 an Offensive weapon (Whip) has no Parry, anywhere (Core p.61)',()=>{
 setup(["Whip","Dagger"]);const h=run('pmWeaponCardsHTML()');
 const whip=h.slice(h.indexOf('>Whip<'),h.indexOf('>Dagger<'));
 assert.match(whip,/>Attack</);assert.doesNotMatch(whip,/>Parry</);assert.match(whip,/Can&#39;t parry/);assert.doesNotMatch(whip,/parries as Defensive/,'Offensive overrides the Entrapping parry note');
 assert.match(h.slice(h.indexOf('>Dagger<')),/>Parry</,'ordinary weapons keep Parry');
 run(`S.rollLog=[${roll({weapon:"Whip",styleKey:null,fam:"similar",effectsPicked:["Entangle"]})}];PM_EFFECT_ROLL_REF=S.rollLog[0];PM_FX_EDIT=null;`);
 const card=run('pmResolveCardHTML()');assert.match(card,/Attack again/);assert.doesNotMatch(card,/'defence'\)">Parry/,'the quick Parry is hidden too');
});
test('C5-B3-WT04 an Entrapping weapon may Pin Weapon without a Critical',()=>{
 setup(["Main Gauche","Dagger"]);
 assert.equal(run(`canPickEffectForRoll(${pin},${roll({weapon:"Main Gauche"})})`),true);
 assert.equal(run(`canPickEffectForRoll(${pin},${roll({weapon:"Dagger"})})`),false,'others still need a Critical');
 assert.equal(run(`canPickEffectForRoll(${pin},${roll({weapon:"Dagger",tier:"Critical"})})`),true);
});
test('C5-B3-WT18 a thrown javelin may Pin Weapon without a Critical only against a shield',()=>{
 setup(["Javelin"]);
 assert.equal(run(`canPickEffectForRoll(${pin},${roll({weapon:"Javelin"})})`),false,'not without the shield');
 assert.equal(run(`canPickEffectForRoll(${pin},${roll({weapon:"Javelin",vsShield:true})})`),true);
 assert.equal(run(`canPickEffectForRoll(${pin},${roll({weapon:"Dagger",vsShield:true})})`),false,'the exception is javelin-only');
 run(`S.rollLog=[${roll({weapon:"Javelin",oppTier:null})}];PM_EFFECT_ROLL_REF=S.rollLog[0];`);
 assert.match(run('pmResolveCardHTML()'),/The target defended with a shield/);
 run('APP.playSetVsShield(0,true)');assert.equal(run('S.rollLog[0].vsShield'),true);
 run('VIEW_ONLY=true;APP.playSetVsShield(0,false);VIEW_ONLY=false;');assert.equal(run('S.rollLog[0].vsShield'),true,'read-only views cannot change it');
});
test('Batch 2 prerequisites still hold (Kill Silently, Weapon Malfunction)',()=>{
 setup(["Dagger","Short bow"]);
 assert.equal(run(`canPickEffectForRoll(SPECIAL_EFFECTS.find(e=>e[0]==="Kill Silently"),${roll({weapon:"Dagger",tier:"Critical",styleKey:"style:none"})})`),false);
 assert.equal(run(`weaponAllowsEffect(SPECIAL_EFFECTS.find(e=>e[0]==="Weapon Malfunction (Firearms)"),weaponByName("Short bow"))`),false);
});
test('C5-B3-WT06/WT11/WT13 weapon cards show Mount, Stealth and shield coverage',()=>{
 setup(["Lance","Garrotte","Buckler","Javelin","Atlatl"]);const h=run('pmWeaponCardsHTML()');
 assert.match(h,/Only from the back of a moving mount/);assert.match(h,/Only from ambush/);
 assert.match(h,/Passively blocks 2 adjacent locations/);assert.match(h,/Can parry missiles/);
 assert.match(h,/Pin Weapon against a shield without a Critical/);assert.match(h,/\+1 Force step/);
});
test('C5-B3-SE02 the Impale Effects table matches Core p.98',()=>{
 const t=JSON.parse(run('JSON.stringify(IMPALE_EFFECTS)'));
 assert.deepEqual(t[0][1],["Formidable","Herculean","Incapacitated","Incapacitated","Incapacitated"]);
 assert.deepEqual(t[1][1],["Hard","Formidable","Herculean","Incapacitated","Incapacitated"]);
 assert.deepEqual(t[2][1],["No effect","Hard","Formidable","Herculean","Incapacitated"]);
 assert.deepEqual(t[3][1],["No effect","No effect","Hard","Formidable","Herculean"]);
 assert.deepEqual(t[4][1],["No effect","No effect","No effect","Hard","Formidable"]);
});
test('the combat situations reference covers the Batch 3 guidance rows',()=>{
 const h=run('pmCombatRulesRefHTML()');
 for(const re of [/half weapon damage, no Damage Modifier, ignoring armour/,/whole Combat Round of aiming/,/each participant spends an AP/,/each defender defends/,/1m per 5 points/,/Easy Acrobatics or Standard Athletics/,/Declare before attacking/,/capped by Athletics/,/thrusting weapons work, at half damage/,/1d10\+10/,/opposed Fly/])assert.match(h,re);
 assert.match(run('pmRulesRefHTML()'),/APP\.pmPopup\('rulesref'\)/,'reachable from Rules reference in the ☰ menu (owner, 2026-11-07)');
});
test('C5-B3-WN06/WN07 wound wording: torso revival vs combat, limb deadline only when severed',()=>{
 assert.match(run('playWoundEffectText("Chest","serious")'),/can't rejoin the fight until the location is healed/);
 assert.match(run('playWoundEffectText("Left Arm","major")'),/If the limb is severed, punctured or ripped off/);
 assert.match(run('playWoundActionText("Left Arm","major")'),/If the limb is severed, punctured or ripped off/);
 assert.doesNotMatch(run('playWoundEffectText("Left Arm","major")'),/^Major Wound: immediately incapacitated, can't keep fighting\. Limb is severed/);
});
test('#149 follow-up: Sweep is limited to unusual-size weapons or creatures (Core p.105)',()=>{
 assert.match(run('pmCombatRulesRefHTML()'),/Only weapons or creatures of unusual size/);
});
test('#149 review: Knockback distance is 1m per 5 points (or part) over SIZ, no extra starting metre (Core p.104)',()=>{
 const h=run('pmCombatRulesRefHTML()');assert.match(h,/knocked back 1m per 5 points \(or part\) over/);assert.doesNotMatch(h,/one further metre|plus 1m/);
});
test('#149 follow-up: a working Pin Weapon exception replaces the Critical Only badge',()=>{
 setup(["Main Gauche","Dagger"]);
 run(`S.rollLog=[${roll({weapon:"Main Gauche"})}];PM_EFFECT_ROLL_REF=S.rollLog[0];`);
 let row=run(`fxItemHTML(${pin})`);assert.match(row,/No Critical needed/);assert.doesNotMatch(row,/>Critical Only</);
 run(`APP.pmPopup("fx",SPECIAL_EFFECTS.findIndex(e=>e[0]==="Pin Weapon"))`);assert.match(run('pmPopupHTML()'),/No Critical needed \(weapon exception\)/);run('APP.pmPopupClose()');
 run(`S.rollLog=[${roll({weapon:"Dagger",tier:"Critical"})}];PM_EFFECT_ROLL_REF=S.rollLog[0];`);
 row=run(`fxItemHTML(${pin})`);assert.match(row,/>Critical Only</,'other weapons keep the normal badge');
});
console.log(passed+' combat batch 3 tests passed');
