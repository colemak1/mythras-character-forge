// The Pits combat procedure fixes from ChatGPT's source review
// (docs/the-pits-combat-procedure-review.md, PR #182). Both fighters are
// player-controlled so every die is answered by the test: deterministic.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const output={innerHTML:'',addEventListener(){}};
const ctx={console,URLSearchParams,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},
 sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
 document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
 window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
vm.createContext(ctx);
for(const f of ['js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js','experiments/pits-ranged.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const run=s=>vm.runInContext(s,ctx);
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
// Answer the pending roll prompt with exact values.
const answer=(...values)=>{const label=run('R&&R.label');assert(label,'a roll is pending');run(`(()=>{const r=R;R=null;r.callback(${JSON.stringify(values)});})()`);return label;};
const logs=()=>JSON.parse(run('JSON.stringify(S.logs.map(l=>l.title+" :: "+l.body))'));
function setup(atkWeapon){
 run(`(()=>{startRun();R=null;V.busy=false;const a=S.fighters.a,b=S.fighters.b;b.kind='human';
  a.weapon=${JSON.stringify(atkWeapon)};b.weapon='sword';a.str=13;a.siz=13;b.siz=10;b.athletics=50;b.endurance=40;
  for(const f of [a,b]){f.weaponGuard=null;ensureEffectState(f);   // durability must follow the weapon set above, not the random starting one
  f.armourLocations=Object.fromEntries(HIT_LOCS.map(l=>[l,0]));f.armor=0;f.prone=false;f.disarmed=false;f.impaledWeapon=null;
   for(const l of HIT_LOCS){f.hp[l]=100;f.maxHp[l]=100;}}
  S.phase='fight';S.disengaged=false;S.ringClearance={a:6,b:6};S.gapMetres=0;S.logs=[];})()`);
}
// A successful attack (no defence) already past the effect step, aimed at a chosen location.
const hit=(extra)=>run(`S.pending=Object.assign({kind:'resolving',atk:'a',def:'b',attackTarget:60,attackRoll:{grade:2,roll:20,label:'Success',effectiveTarget:60},reaction:'none',defenseRoll:null,owner:null,other:null,effectsLeft:0,chosen:[],chosenLoc:'Chest',maximize:0,evaded:false},${JSON.stringify(extra||{})});resolveHit();`);

test('ordinary Knockback without Bash: 1m per 5 points (or part) over SIZ, then Athletics to stay standing (Core p.104)',()=>{
 setup('greatsword');hit();                         // 2d8 + DM 1d2 (STR+SIZ 26)
 answer(8,8,1);                                      // 17 damage vs SIZ 10: excess 7 → 2m
 assert(logs().some(l=>/^Knockback :: 17 damage against SIZ 10: .* thrust back 2m/.test(l)),logs().join('\n'));
 assert.equal(run('S.disengaged'),true);assert.equal(run('S.ringClearance.b'),4);
 assert.match(answer(99),/Knockback · Athletics 50% to stay standing/);
 assert.equal(run('S.fighters.b.prone'),true,'failed Athletics: prone');
});
test('no Knockback when damage does not exceed SIZ; an exact 5 over gives 1m, not 2',()=>{
 setup('greatsword');hit();answer(4,5,1);           // 10 vs SIZ 10
 assert(!logs().some(l=>l.startsWith('Knockback ::')));
 setup('greatsword');hit();answer(7,7,1);           // 15 vs 10: excess 5 → 1m
 assert(logs().some(l=>/thrust back 1m/.test(l)),logs().join('\n'));
});
test('Stand Fast prevents ordinary Knockback (Core p.99); Bash keeps its own rule, never both',()=>{
 setup('greatsword');hit({standFast:true});answer(8,8,1);
 assert(logs().some(l=>/^Stand Fast :: .*holds their ground/.test(l)));assert.equal(run('S.disengaged'),false);
 setup('greatsword');hit({bash:true});answer(8,8,1);
 assert(logs().some(l=>l.startsWith('Bash ::')));assert(!logs().some(l=>l.startsWith('Knockback ::')),'not double-counted');
});
test('a Major limb wound: incapacitated and prone, with no automatic fatal clock (Core p.110)',()=>{
 setup('sword');
 run(`resolveWound(S.fighters.a,S.fighters.b,'Right Arm','major',12,{grade:2,roll:20,label:'Success',effectiveTarget:60},()=>{})`);
 answer(1);                                           // Endurance critical: holds
 assert.equal(run('S.fighters.b.prone'),true);
 assert.equal(run('S.fighters.b.criticalWindow'),null,'no fatal timer unless the GM rules the limb severed, punctured or ripped off');
 const rate=run('healingRateFor(S.fighters.b.con)');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.fighters.b.limbDeadlineIfSevered)')),{unit:'minutes',value:5*rate,location:'Right Arm'});
});
test('a resisted Major torso wound keeps its 2× Healing Rate Combat Round deadline',()=>{
 setup('sword');
 run(`resolveWound(S.fighters.a,S.fighters.b,'Chest','major',12,{grade:2,roll:20,label:'Success',effectiveTarget:60},()=>{})`);
 answer(1);
 const rate=run('healingRateFor(S.fighters.b.con)');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.fighters.b.criticalWindow)')),{unit:'combat rounds',value:2*rate,location:'Chest'});
});
test('Impale: the attacker picks a damage roll, then chooses to keep hold or leave the weapon in (Core p.97)',()=>{
 setup('dagger');hit({impale:true});                 // 1d4+1 twice + DM 1d2
 answer(2,4,1);                                       // options 3 and 5
 assert.equal(run('S.pending.kind'),'impalePick');run('chooseImpaleDamage(1)');
 assert.equal(run('S.pending.kind'),'impaleLeave','asked whether to leave it in');
 assert.match(output.innerHTML,/data-act="impaleLeave" data-val="leave"/);
 run('chooseImpaleLeave(true)');
 assert.equal(run('S.fighters.a.impaledWeapon'),null);assert.equal(run('S.fighters.a.disarmed'),true);
 assert.equal(run('S.fighters.b.impaledWounds.length'),1,'the wound keeps its penalty');
 setup('dagger');hit({impale:true});answer(2,4,1);run('chooseImpaleDamage(1)');run('chooseImpaleLeave(false)');
 assert.equal(run('S.fighters.a.impaledWeapon.loc'),'Chest','keeps hold: pull it free later');assert.equal(run('S.fighters.a.disarmed'),false);
});
test('withdrawing a Barbed weapon does full damage, a normal one half; the injury is recorded (Core pp.61, 98)',()=>{
 for(const [weapon,dmgDie,expect] of [['trident',6,6],['spear',6,4]]){   // Trident 1d8 Barbed; Shortspear 1d8+1 → 7 halved → 4
  setup(weapon);run(`S.fighters.a.impaledWeapon={target:'b',loc:'Chest',weapon:'${weapon}'};S.fighters.b.impaledWounds=[{attacker:'a',loc:'Chest',weaponSize:2}];S.fighters.b.wounds=[];finishWithdrawImpale('a',false)`);
  answer(1);answer(dmgDie);
  assert.equal(run('S.fighters.b.hp.Chest'),100-expect,weapon);
  assert.equal(run('S.fighters.b.wounds.length'),1,'withdrawal injury recorded for First Aid');
 }
 assert.equal(run('ARENA_WEAPONS.trident.barbed'),true);assert.equal(run('ARENA_WEAPONS.spear.barbed'),false);
});
test('at a longer Reach the shorter weapon may still attack the opposing weapon (Core p.106)',()=>{
 setup('dagger');run(`var __cab=canAttackBody;canAttackBody=id=>id!=='a';`);
 assert.equal(run('mustTargetWeapon("a")'),true);assert.equal(run('canMakeAttack(S.fighters.a)'),true,'attack allowed, against the weapon');
 const hpBefore=run('guardWeapon(S.fighters.b).hp');
 hit({vsWeapon:true});answer(4,1);                    // dagger 1d4+1 = 5, DM +1 → 6 vs sword AP 6
 assert(logs().some(l=>/^Weapon struck :: .*hits .*Broadsword for 6; 6 AP protects it, 0 HP lost/.test(l)),logs().join('\n'));
 assert.equal(run('guardWeapon(S.fighters.b).hp'),hpBefore);assert.equal(run('S.fighters.b.hp.Chest'),100,'no body damage');
 run('canAttackBody=__cab');
});
// Batch 2: Entangle, Entrapping, Disarm and Trip eligibility (PIT-SE01, SE02, SE07, SE08).
const effectsFor=(extra)=>JSON.parse(run(`(()=>{S.pending=Object.assign({kind:'effect',atk:'a',def:'b',owner:'a',other:'b',attackRoll:{grade:2,roll:20,label:'Success',effectiveTarget:60},defenseRoll:{grade:1,roll:80,label:'Failure'},reaction:'parry',parryTool:'weapon',chosen:[],effectsLeft:1},${JSON.stringify(extra||{})});return JSON.stringify(availableEffects(S.pending).map(e=>e[0]));})()`));
test('an Entrapping weapon can Pin Weapon without a Critical; others still need one (Core pp.61, 98)',()=>{
 setup('main-gauche');assert(effectsFor().includes('pinWeapon'),'Main Gauche: ordinary success');
 setup('whip');assert(effectsFor().includes('pinWeapon'),'Whip: ordinary success');
 setup('sword');assert(!effectsFor().includes('pinWeapon'),'Broadsword needs a Critical');
 assert(effectsFor({attackRoll:{grade:3,roll:3,label:'Critical',effectiveTarget:60}}).includes('pinWeapon'),'with a Critical');
});
test('Disarm Opponent is only offered against a foe with up to twice the attacker STR (Core p.97)',()=>{
 setup('sword');run('S.fighters.a.str=8;S.fighters.b.str=17');assert(!effectsFor().includes('disarm'),'17 > 2×8');
 run('S.fighters.b.str=16');assert(effectsFor().includes('disarm'),'16 = 2×8');
});
test('Trip Opponent can be resisted with Acrobatics as well as Brawn or Evade (Core pp.100–101)',()=>{
 setup('sword');run('S.fighters.b.acrobatics=72;S.fighters.b.brawn=40;S.fighters.b.evade=50');
 effectsFor();run(`applyEffect('trip')`);
 assert.equal(run('S.pending.kind'),'tripResistChoice');
 assert.match(output.innerHTML,/data-act="tripResist" data-val="acrobatics"><strong>Acrobatics · 72%/);
 run(`(()=>{const p=S.pending;p.kind='effect';p.resistTrip('acrobatics');})()`);
 assert.match(answer(50),/Trip · .* Acrobatics/);   // both succeed: the higher roll (50 > 20) wins
 assert.equal(run('S.fighters.b.prone'),false);assert(logs().some(l=>/^Trip Opponent :: .*Acrobatics 50\/72%.*remains standing/.test(l)),logs().join('\n'));
 run('S.fighters.b.acrobatics=0');assert.deepEqual(JSON.parse(run('JSON.stringify(tripResistOptions(S.fighters.b))')),['brawn','evade'],'untrained: not offered');
});
test('Entangle is offered to entangling weapons only, and holds the struck location (Core p.97)',()=>{
 setup('sword');assert(!effectsFor().includes('entangle'));
 setup('chain');assert(effectsFor().includes('entangle'));
 // Weapon arm: the victim cannot use what it holds.
 hit({entangle:true,chosenLoc:'Right Arm'});answer(1,1);
 assert.equal(run('S.fighters.b.entangled.loc'),'Right Arm');assert.equal(run('S.fighters.b.entangled.by'),'a');
 assert.equal(run('canUseWeapon(S.fighters.b)'),false);assert.equal(run('canMakeAttack(S.fighters.b)'),false);
 assert(logs().some(l=>/^Entangle :: .*Chain wraps .*Right Arm/.test(l)),logs().join('\n'));
 // Leg: no moving, so no range change or Withdraw.
 setup('chain');hit({entangle:true,chosenLoc:'Left Leg'});answer(1,1);
 assert.equal(run('entangledLegs(S.fighters.b)'),true);assert.equal(run('canUseWeapon(S.fighters.b)'),true);
 assert(!effectsFor({owner:'b',other:'a'}).includes('withdraw'),'a snared leg cannot withdraw');
 // Head, chest or abdomen: every skill roll one grade harder.
 setup('chain');hit({entangle:true,chosenLoc:'Chest'});answer(1,1);
 assert.equal(run('effectiveSkill(S.fighters.b,60)'),40);assert.equal(run('effectiveSkill(S.fighters.a,60)'),60);
 // Separation ends the hold.
 run('S.disengaged=true');assert.equal(run('entangledLoc(S.fighters.b)'),null);
});
test('Entangle: the holder trips for 1 AP against the original Entangle roll; the victim breaks free with Brawn (Core pp.97, 101)',()=>{
 const trip=(victimRoll)=>{
  setup('chain');hit({entangle:true,chosenLoc:'Left Leg'});answer(1,1);   // Entangle won by the attack roll 20 (Success)
  assert.deepEqual(JSON.parse(run('JSON.stringify(S.fighters.b.entangled.origin)')),{grade:2,roll:20,label:'Success',effectiveTarget:60});
  run(`S.pending=null;R=null;S.order=['a','b'];S.turnIndex=0;S.fighters.a.ap=3;S.fighters.b.ap=3;S.fighters.b.brawn=40;S.fighters.b.evade=30;S.logs=[]`);
  run(`beginEntangleTrip('a')`);assert.equal(run('S.fighters.a.ap'),2,'1 AP');
  assert.equal(run('S.pending.kind'),'tripResistChoice','no new roll for the holder: straight to the victim');
  run(`(()=>{const p=S.pending;p.kind='effect';p.resistTrip('brawn');})()`);
  assert.match(answer(victimRoll),/Trip · .* Brawn/);
 };
 trip(30);                                            // Brawn 30/40 succeeds and beats the original 20
 assert.equal(run('S.fighters.b.prone'),false);assert(logs().some(l=>/^Entangle · Trip :: .*Brawn 30\/40%.*original Entangle roll 20 \(Success\): stays standing/.test(l)),logs().join('\n'));
 trip(15);                                            // 15 succeeds but loses to 20
 assert.equal(run('S.fighters.b.prone'),true);
 trip(90);                                            // failure
 assert.equal(run('S.fighters.b.prone'),true);assert(logs().some(l=>/^Entangle · Trip :: .*falls prone/.test(l)),logs().join('\n'));
 // Victim's turn: opposed Brawn to yank free.
 run(`R=null;S.pending=null;S.phase='fight';S.order=['b','a'];S.turnIndex=0;S.fighters.b.ap=3;S.logs=[]`);
 run(`beginFreeEntangle('b')`);answer(10);answer(70);
 assert.equal(run('S.fighters.b.entangled'),null);assert(logs().some(l=>/^Entangle · Break free :: .*Left Leg is free/.test(l)),logs().join('\n'));
});
test('Entangle ends on Slip Free, on Damage Weapon or Disarm against the holder, or when the holder attacks',()=>{
 const tangled=()=>{setup('chain');run(`S.fighters.b.entangled={loc:'Left Leg',by:'a'};S.logs=[]`);};
 tangled();assert(effectsFor({owner:'b',other:'a',defenseRoll:{grade:3,roll:2,label:'Critical'}}).includes('slip'),'critical defence offers Slip Free');
 run(`applyEffect('slip')`);assert.equal(run('S.fighters.b.entangled'),null);
 tangled();effectsFor({owner:'b',other:'a',defenseRoll:{grade:2,roll:5,label:'Success'},attackRoll:{grade:1,roll:80,label:'Failure'}});
 run(`applyEffect('damageWeapon')`);assert.equal(run('S.fighters.b.entangled'),null,'Damage Weapon frees');
 tangled();run(`S.pending=null;R=null;S.order=['a','b'];S.turnIndex=0;S.fighters.a.ap=3;beginAttack('a')`);
 assert.equal(run('S.fighters.b.entangled'),null,'attacking with the chain lets go');
 assert(logs().some(l=>/^Entangle ends :: .*pulls the Chain free/.test(l)),logs().join('\n'));
});
test('a parrying Entangle (arena convention) stores the winning parry roll for the later Trip',()=>{
 setup('chain');run(`S.fighters.b.weapon='sword';`);
 effectsFor({owner:'a',other:'b',atk:'b',def:'a',attackRoll:{grade:1,roll:70,label:'Failure'},defenseRoll:{grade:2,roll:33,label:'Success',effectiveTarget:60}});
 run(`applyEffect('entangle')`);
 assert.equal(run('S.fighters.b.entangled.loc'),'Right Arm');assert.equal(run('S.fighters.b.entangled.origin.roll'),33);
});
console.log(passed+' practice procedure tests passed');
