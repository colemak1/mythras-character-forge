// The Pits: Serious Wounds to the weapon and shield arms (docs/pits-serious-weapon-arm-cases-20261111.md, ARM-01 to ARM-06).
// Engine tests: a failed Endurance test on an arm drops what it holds unless strapped on; a dropped weapon takes a working free
// hand and two actions to recover; handedness; two-handed weapons; the shield arm; and the free hand switch (app policy, not Core RAW).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function arena(){
 const ctx={console,URLSearchParams,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},
  sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
  document:{querySelector:s=>s==='#root'?{innerHTML:'',addEventListener(){}}:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
  window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
 vm.createContext(ctx);
 for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js'])
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx,{filename:'practice-combat-inline.js'});
 return x=>vm.runInContext(x,ctx);
}
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const J=(A,x)=>JSON.parse(A(`JSON.stringify(${x})`));
// A one-on-one with the hero (a) holding the given weapon, optionally with a shield and a left-handed grip.
function setup(o={}){
 const A=arena();
 A(`startRun();R=null;V.busy=false;S.logs=[];
  S.fighters={a:mkFighter('a','Asha','human',65,${JSON.stringify(o.weapon||'sword')},0,45,3,13,13,${JSON.stringify(o.shield||'none')},13,13,13),
   b:mkFighter('b','Brann','ai',60,'sword',0,45,3,13,13,'none',13,13,13)};
  ${o.left?"handed(S.fighters.a,true);":''}beginEncounter();S.order=['a','b'];S.turnIndex=0;S.pending=null;R=null;V.busy=false;S.phase='fight';S.round=1;
  S.fighters.a.ap=S.fighters.a.apMax;S.fighters.a.skipAttack=0;`);
 return A;
}
const shieldKey=A=>A(`Object.keys(SHIELDS).find(k=>k!=='none'&&SHIELD_ATTACKS[k])`);
const act=(A,name)=>A(`handleClick({target:{closest:()=>({dataset:{act:${JSON.stringify(name)}}})}})`);
const legal=(A,id='a')=>J(A,`pitsLegalActions(${JSON.stringify(id)})`);

test('ARM-01: a failed Endurance test on the weapon arm drops the weapon; the arm is useless until healed',()=>{
 const A=setup();
 assert.equal(A('canUseWeapon(S.fighters.a)'),true);
 A(`applyLimbDisabled(S.fighters.a,'Right Arm',false)`);
 assert.equal(A('!!S.fighters.a.disarmed'),true,'the weapon fell');assert.equal(A('S.fighters.a.droppedMetres'),0,'at their feet');
 assert.equal(A(`S.fighters.a.disabled.includes('Right Arm')`),true);assert.equal(A('canUseWeapon(S.fighters.a)'),false);
 assert.equal(A('S.logs.some(l=>l.title==="Weapon Dropped")'),true);
 assert.equal(A('armUsable(S.fighters.a,"Right Arm")'),false,'the arm cannot be used');
});
test('ARM-01: a resisted wound is not an automatic disarm, and an arm that does not hold the weapon does not drop it',()=>{
 const A=setup();
 const out=J(A,`CombatRules.woundOutcome({level:'serious',limb:true,leg:false,resisted:true,healingRate:3})`);
 assert.notEqual(out.outcome,'limbDisabled','a successful Endurance test does not disable the arm');
 A(`applyLimbDisabled(S.fighters.a,'Left Arm',false)`);
 assert.equal(A('!!S.fighters.a.disarmed'),false,'the off arm held nothing');assert.equal(A('canUseWeapon(S.fighters.a)'),true,'a right-hander keeps fighting');
});
test('ARM-01: a left-handed fighter holds the weapon in the left hand and the shield on the right arm',()=>{
 const A=setup({left:true});
 assert.equal(A('S.fighters.a.weaponHand'),'Left Arm');assert.equal(A('S.fighters.a.shieldHand'),'Right Arm');
 A(`applyLimbDisabled(S.fighters.a,'Right Arm',false)`);
 assert.equal(A('!!S.fighters.a.disarmed'),false,'the right arm held nothing');assert.equal(A('canUseWeapon(S.fighters.a)'),true);
 A(`applyLimbDisabled(S.fighters.a,'Left Arm',false)`);
 assert.equal(A('!!S.fighters.a.disarmed'),true,'the left (weapon) arm drops it');
 const B=arena();B(`config.leftHanded=true;config.pvpLeftHanded=false;S={mode:'pvp'};`);
 assert.equal(B(`newHero().weaponHand`),'Left Arm','the setup option makes a left-handed hero');
 assert.equal(B(`newEnemy(1).weaponHand`),'Right Arm');
});
test('ARM-02: recovery takes a working free hand and two actions; the weapon ends up in that hand',()=>{
 const A=setup();A(`applyLimbDisabled(S.fighters.a,'Right Arm',false)`);
 let acts=legal(A).find(x=>x.act==='recoverWeapon');assert(acts&&acts.enabled,'Pick Up Weapon is offered');assert.equal(acts.label,'Pick Up Weapon');
 const ap=A('S.fighters.a.ap');
 A('recoverWeaponStep(S.fighters.a)');
 assert.equal(A('S.fighters.a.weaponHand'),'Left Arm','picked up with the working hand');assert.equal(A('S.fighters.a.recoveringWeapon'),true);
 assert.equal(A('!!S.fighters.a.disarmed'),true,'not ready yet');assert.equal(A('canUseWeapon(S.fighters.a)'),false);
 assert.equal(legal(A).find(x=>x.act==='recoverWeapon').label,'Ready Weapon');
 A('recoverWeaponStep(S.fighters.a)');
 assert.equal(A('!!S.fighters.a.disarmed'),false);assert.equal(A('S.fighters.a.ap'),ap-2,'two actions, 2 AP');
 assert.equal(A('canUseWeapon(S.fighters.a)'),true,'fighting on with the other hand');
});
test('ARM-02: a disabled hand cannot recover; neither can a hand the strapped shield keeps busy; a far weapon needs a move first',()=>{
 let A=setup();A(`applyLimbDisabled(S.fighters.a,'Right Arm',false);applyLimbDisabled(S.fighters.a,'Left Arm',false)`);
 assert.equal(A('recoverWeaponReason(S.fighters.a)'),'No working free hand');
 assert.equal(legal(A).find(x=>x.act==='recoverWeapon').enabled,false);
 const k=shieldKey(setup());A=setup({shield:k});A(`applyLimbDisabled(S.fighters.a,'Right Arm',false)`);
 assert.equal(A('!!S.fighters.a.shieldLost'),false,'the strapped shield stays on');
 assert.equal(A('recoverWeaponReason(S.fighters.a)'),'No working free hand','the only good arm carries the shield');
 assert.equal(A('canMakeShieldAttack(S.fighters.a)||canShieldStrike(S.fighters.a)'),true,'but the shield can still strike');
 A=setup();A(`S.fighters.a.disarmed=true;S.fighters.a.droppedMetres=5`);
 assert.equal(legal(A).find(x=>x.act==='recoverWeapon').label,'Move to Weapon');
 A('recoverWeaponStep(S.fighters.a)');assert.equal(A('S.fighters.a.droppedMetres'),0);assert.equal(A('S.fighters.a.recoveringWeapon'),false,'moving is the first of three steps');
});
test('ARM-02: losing the hand mid-recovery drops the weapon again',()=>{
 const A=setup();A(`applyLimbDisabled(S.fighters.a,'Right Arm',false)`);A('recoverWeaponStep(S.fighters.a)');
 assert.equal(A('S.fighters.a.recoveringWeapon'),true);
 A(`applyLimbDisabled(S.fighters.a,'Left Arm',false)`);
 assert.equal(A('S.fighters.a.recoveringWeapon'),false);assert.equal(A('!!S.fighters.a.disarmed'),true);assert.equal(A('recoverWeaponReason(S.fighters.a)'),'No working free hand');
});
test('ARM-03: a two-handed weapon is not lost when one arm fails, but it cannot be used (or recovered) with one hand',()=>{
 const A=setup({weapon:'greatsword'});
 assert.equal(A('ARENA_WEAPONS[S.fighters.a.weapon].twoHanded'),true);
 A(`applyLimbDisabled(S.fighters.a,'Right Arm',false)`);
 assert.equal(A('!!S.fighters.a.disarmed'),false,'still gripped by the good hand');
 assert.equal(A('canUseWeapon(S.fighters.a)'),false,'no attack or parry that needs both hands');
 assert.equal(A('canParryAtReach("a")'),false);
 assert.equal(legal(A).some(x=>x.act==='swapHand'),false,'no hand switch for a two-handed weapon');
 A(`S.fighters.a.disarmed=true`);assert.equal(A('recoveryHand(S.fighters.a)'),null,'needs both hands to pick it up');
 const B=setup({weapon:'greatsword'});B(`S.fighters.a.disarmed=true`);assert(B('recoveryHand(S.fighters.a)'),'both hands working: recoverable');
});
test('ARM-04: a disabled shield arm keeps the strapped shield but cannot use it; the weapon arm carries on',()=>{
 const k=shieldKey(setup());
 let A=setup({shield:k});
 assert.equal(A('canShieldParry(S.fighters.a)'),true);
 A(`applyLimbDisabled(S.fighters.a,'Left Arm',false)`);
 assert.equal(A('!!S.fighters.a.shieldLost'),false,'strapped: not dropped');assert.equal(A('S.fighters.a.shield')===k,true);
 assert.equal(A('canShieldParry(S.fighters.a)'),false,'no active parry');assert.equal(A('canShieldStrike(S.fighters.a)'),false,'no shield strike');
 assert.equal(A('armUsable(S.fighters.a,shieldArmOf(S.fighters.a))'),false,'no newly chosen ward');
 assert.equal(A('!!S.fighters.a.disarmed'),false);assert.equal(A('canUseWeapon(S.fighters.a)'),true,'the one-handed weapon is unaffected');
 A=setup({shield:k,left:true});
 assert.equal(A('shieldArmOf(S.fighters.a)'),'Right Arm','for a left-hander the shield is on the right');
 A(`applyLimbDisabled(S.fighters.a,'Right Arm',false)`);
 assert.equal(A('canShieldParry(S.fighters.a)'),false);assert.equal(A('canUseWeapon(S.fighters.a)'),true);
 const ward=setup({shield:k});ward(`applyLimbDisabled(S.fighters.a,'Left Arm',false)`);act(ward,'ward');
 assert.equal(ward('S.pending'),null,'the Ward Location choice does not open');
});
test('ARM-05: the Pits is melee only; a dropped weapon cannot be rescued by a hand switch',()=>{
 const A=setup();
 assert.equal(legal(A).some(x=>/throw/i.test(x.label)),false,'no throwing action in the Pits');
 A(`applyLimbDisabled(S.fighters.a,'Right Arm',false)`);
 assert.match(A('swapHandReason(S.fighters.a)'),/ground/);
});
test('ARM-06 (app policy): switching a held one-handed weapon between two working hands is free, with no readying step',()=>{
 const A=setup();
 const sw=legal(A).find(x=>x.act==='swapHand');assert(sw&&sw.enabled&&sw.ap===0,'a free action is offered');
 const ap=A('S.fighters.a.ap'),turn=A('S.turnIndex');
 act(A,'swapHand');
 assert.equal(A('S.fighters.a.weaponHand'),'Left Arm');assert.equal(A('S.fighters.a.ap'),ap,'costs no AP');
 assert.equal(A('S.turnIndex'),turn,'does not end the turn');assert.equal(A('canUseWeapon(S.fighters.a)'),true,'usable at once');
 assert.equal(A('S.logs.at(-1).detail').includes('not Core RAW'),true,'labelled as app policy');
 act(A,'swapHand');assert.equal(A('S.fighters.a.weaponHand'),'Right Arm','and back again (left/right reversal)');
 assert.equal(A('S.fighters.a.ap'),ap,'no extra attack or cost');
 const L=setup({left:true});act(L,'swapHand');assert.equal(L('S.fighters.a.weaponHand'),'Right Arm','a left-hander switches to the right');
});
test('ARM-06: not allowed when a hand is useless, the destination is occupied, or the weapon is on the ground',()=>{
 const k=shieldKey(setup());
 let A=setup({shield:k});assert.equal(legal(A).some(x=>x.act==='swapHand'),false,'with a shield the other hand is busy: not offered');
 assert.match(A('swapHandReason(S.fighters.a)'),/shield/);
 A=setup();A(`S.fighters.a.disabled.push('Left Arm')`);assert.match(A('swapHandReason(S.fighters.a)'),/other hand/);
 act(A,'swapHand');assert.equal(A('S.fighters.a.weaponHand'),'Right Arm','the act is refused');
 A=setup();A(`S.fighters.a.stunnedLocations['Right Arm']=2`);assert.match(A('swapHandReason(S.fighters.a)'),/weapon arm/);
 A=setup();A(`applyLimbDisabled(S.fighters.a,'Right Arm',false)`);
 assert.equal(A('S.fighters.a.weaponHand'),'Right Arm','a failed Endurance test drops the weapon at once: it is too late to pass it to the other hand');
});
test('between fights the weapon is picked up again, in a working hand',()=>{
 const A=setup();A(`applyLimbDisabled(S.fighters.a,'Right Arm',false)`);A('rearmBetweenFights(S.fighters.a)');
 assert.equal(A('!!S.fighters.a.disarmed'),false);assert.equal(A('S.fighters.a.weaponHand'),'Left Arm');assert.equal(A('canUseWeapon(S.fighters.a)'),true);
});
console.log(passed+' ARM tests passed');
