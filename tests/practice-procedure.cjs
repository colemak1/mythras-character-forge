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
for(const f of ['js/data.js','experiments/practice-character.js','experiments/practice-guidance.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
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
console.log(passed+' practice procedure tests passed');
