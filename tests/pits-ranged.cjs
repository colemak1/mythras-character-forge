'use strict';
// The Pits: ranged and thrown weapons, PIT-R01–R17 (docs/the-pits-ranged-cases.md).
// Pure rules are called directly; arena cases use two player-controlled
// fighters, so every die is answered by the test.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const output={innerHTML:'',addEventListener(){}};
const ctx={console,URLSearchParams,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},
 sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
 document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
 window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
vm.createContext(ctx);
for(const f of ['js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js','experiments/pits-ranged.js'])
 vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const run=s=>vm.runInContext(s,ctx),J=s=>JSON.parse(run(`JSON.stringify(${s})`));
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const answer=(...values)=>{const label=run('R&&R.label');assert(label,'a roll is pending');run(`(()=>{const r=R;R=null;r.callback(${JSON.stringify(values)});})()`);return label;};
const logs=()=>J('S.logs.map(l=>l.title+" :: "+l.body+(l.detail?" || "+l.detail:""))');
const hasLog=re=>assert(logs().some(l=>re.test(l)),'missing log '+re+'\n'+logs().join('\n'));
const PR='PitsRanged';
// a shoots or throws at b; gap 0 = engaged.
function setup(aWeapon,bWeapon,gap,extra=''){
 run(`(()=>{startRun();R=null;V.busy=false;const a=S.fighters.a,b=S.fighters.b;b.kind='human';
  a.weapon=${JSON.stringify(aWeapon)};b.weapon=${JSON.stringify(bWeapon)};a.shield='none';b.shield='none';
  for(const f of [a,b]){f.weaponGuard=null;f.traits=[];arenaRangedInit(f);ensureEffectState(f);f.armourLocations=Object.fromEntries(HIT_LOCS.map(l=>[l,0]));f.armor=0;
   f.prone=false;f.disarmed=false;f.impaledWeapon=null;f.impaledWounds=[];f.braced=false;f.ap=3;f.apMax=3;f.style=60;f.evade=50;f.disabled=[];f.stunnedLocations={};
   f.str=13;f.siz=13;f.athletics=40;f.brawn=50;f.endurance=50;f.willpower=50;f.blindedTurns=0;f.pressedTurns=0;f.overextendedTurns=0;f.skipAttack=0;
   for(const l of HIT_LOCS){f.hp[l]=100;f.maxHp[l]=100;}}
  S.order=['a','b'];S.turnIndex=0;S.phase='fight';S.pending=null;S.round=1;S.cycle=1;S.weather='clear';
  S.disengaged=${gap>0};S.gapMetres=${gap};S.engagement=engagementInfo().active?'long':'equal';S.ringClearance={a:6,b:6};S.tie=null;S.logs=[];
  ${extra}})()`);
}
const missileHit=(extra)=>run(`S.pending=Object.assign({kind:'resolving',atk:'a',def:'b',attackTarget:60,attackRoll:{grade:2,roll:20,label:'Success',effectiveTarget:60},
 reaction:'none',defenseRoll:null,owner:null,other:null,effectsLeft:0,chosen:[],chosenLoc:'Chest',maximize:0,evaded:false,attackKey:S.fighters.a.weapon,
 ranged:{kind:'fire',band:'close',metres:10,force:arenaProfile(S.fighters.a.weapon).size,dmgMod:arenaProfile(S.fighters.a.weapon).profile?.dmgMod,halved:false,impaleSize:arenaProfile(S.fighters.a.weapon).profile?.impaleSize,unique:false,stationary:true}},${JSON.stringify(extra||{})});resolveHit();`);

test('PIT-R01: exact Close/Effective/Long boundaries use the weapon\'s own three values; past Long, no shot',()=>{
 const bow=J(`${PR}.profileOf(WEAPON_MAP['Short bow'])`);assert.deepEqual(bow.ranges,[15,100,200]);
 assert.deepEqual([15,16,100,101,200,201].map(m=>run(`${PR}.rangeBand(${JSON.stringify(bow.ranges)},${m})`)),['close','effective','effective','long','long','out']);
 const jav=J(`${PR}.profileOf(WEAPON_MAP['Javelin'])`);assert.deepEqual(jav.ranges,[10,20,50]);assert.equal(run(`${PR}.rangeBand([10,20,50],50)`),'long');
 setup('short-bow','sword',201);
 assert.equal(run('arenaRangedReady(S.fighters.a,arenaRangedOption(S.fighters.a)).ok'),false);
 assert.match(run('arenaRangedReady(S.fighters.a,arenaRangedOption(S.fighters.a)).reason'),/Beyond Long range/);
 assert.equal(run('beginRangedAttack("a")'),false);assert.equal(run('S.fighters.a.ap'),3,'no AP spent on an impossible shot');
});
test('PIT-R01: Long range halves rolled damage and lowers Force one step; Effective adds no band penalty',()=>{
 assert.equal(run(`${PR}.bandForce(4,'long')`),3);assert.equal(run(`${PR}.bandForce(4,'effective')`),4);assert.equal(run(`${PR}.bandForce(1,'long')`),1);
 assert.equal(run(`${PR}.bandDamage(7,'long')`),4);assert.equal(run(`${PR}.bandDamage(7,'effective')`),7);
 // Short bow, SIZ 13 target at 20m (effective, no distance step) vs 200m: the band itself adds no grade.
 assert.equal(run(`${PR}.plan({pct:60,metres:20,siz:13,situational:[],ranges:[15,100,200]}).target`),60);
 setup('sling','sword',140); // sling 10/150/300: 140m is Effective; long-range damage tested below
 missileHit({ranged:{kind:'fire',band:'long',metres:200,force:2,dmgMod:false,halved:false,impaleSize:1,unique:false,stationary:true}});
 answer(7);hasLog(/Long range halves damage: 4 damage/);hasLog(/hits Chest :: 7 weapon \(7\) no Damage Modifier \(\+0\) = 4 total/);
});
test('PIT-R01: Damage Modifier only where the weapon\'s table says Yes',()=>{
 assert.equal(J(`${PR}.profileOf(WEAPON_MAP['Sling'])`).dmgMod,false);assert.equal(J(`${PR}.profileOf(WEAPON_MAP['Long bow'])`).dmgMod,true);
 setup('light-crossbow','sword',10);run('S.fighters.a.str=18;S.fighters.a.siz=18');missileHit();
 assert.match(answer(5),/^Damage · Chest$/);hasLog(/5 weapon \(5\) no Damage Modifier/);
 setup('long-bow','sword',10);run('S.fighters.a.str=18;S.fighters.a.siz=18');missileHit();
 answer(5,3);hasLog(/5 weapon \(5\) \+1d6 \(\+3\) = 8 total/);
});
test('PIT-R01/R12: Close range lets a success Choose Location against a stationary target, not a moving one or at Effective',()=>{
 setup('short-bow','sword',10);
 const opts=()=>J(`availableEffects(S.pending).map(x=>x[0])`);
 run(`S.pending={kind:'effect',atk:'a',def:'b',owner:'a',other:'b',attackRoll:{grade:2,roll:20},defenseRoll:null,reaction:'none',chosen:[],effectsLeft:1,attackKey:'short-bow',ranged:{band:'close',stationary:true}}`);
 assert(opts().includes('choose'));
 run(`S.pending.ranged.stationary=false`);assert(!opts().includes('choose'));
 run(`S.pending.ranged={band:'effective',stationary:true}`);assert(!opts().includes('choose'));
 run(`S.pending.attackRoll={grade:3,roll:3}`);assert(opts().includes('choose'),'a critical always may');
});
test('PIT-R02: SIZ 11–20 at 20m has no distance grade; at 21m it is one step harder; the 20m progression continues',()=>{
 assert.deepEqual([[20,15],[21,15],[40,15],[41,15],[20,9],[20,25],[40,25],[20,100]].map(([m,s])=>run(`${PR}.distanceSizSteps(${m},${s})`)),[0,1,1,2,1,-1,0,-2]);
 // Long bow at 21m is still Close/Effective by its own bands, but the distance table makes it Hard.
 const p=J(`${PR}.plan({pct:60,metres:21,siz:13,situational:[],ranges:[15,125,250]})`);
 assert.equal(p.band,'effective');assert.equal(p.grade,'Hard');assert.equal(p.target,40);
 setup('long-bow','sword',21);assert.equal(run('arenaRangedPlan(S.fighters.a,arenaRangedOption(S.fighters.a)).target'),40);
});
test('PIT-R03: the most severe situational grade applies (not the sum), then distance stacks on top',()=>{
 assert.equal(run(`${PR}.situationalSteps(['windLight','targetProne','mist'])`),2);
 const p=J(`${PR}.plan({pct:60,metres:21,siz:13,situational:['windLight','targetProne','mist'],ranges:[15,125,250]})`);
 assert.equal(p.steps,3);assert.equal(p.grade,'Herculean');assert.equal(p.target,6);
 setup('long-bow','sword',21,`S.weather='windModerate';S.fighters.b.prone=true;`);
 const q=J('arenaRangedPlan(S.fighters.a,arenaRangedOption(S.fighters.a))');
 assert.deepEqual(q.situational.slice().sort(),['targetProne','windModerate']);assert.equal(q.situationalSteps,2);assert.equal(q.steps,3);
});
test('PIT-R04: Aim needs a whole Combat Round, improves one situational grade once, and moving or attacking breaks it',()=>{
 assert.equal(run(`${PR}.aimComplete({round:1,cycle:1},1)`),false);assert.equal(run(`${PR}.aimComplete({round:1,cycle:1},2)`),true);
 assert.equal(run(`${PR}.aimComplete({round:1,cycle:2},2)`),false);assert.equal(run(`${PR}.aimComplete({round:1,cycle:2},3)`),true);
 assert.equal(run(`${PR}.situationalSteps(['fog'],true)`),1);assert.equal(run(`${PR}.situationalSteps(['fog','targetProne'],true)`),2,'only one modifier improves');
 assert.equal(run(`${PR}.situationalSteps([],true)`),0,'nothing to improve');
 setup('short-bow','sword',21,`S.weather='fog';`);
 const before=run('arenaRangedPlan(S.fighters.a,arenaRangedOption(S.fighters.a)).target');
 run('arenaAim("a")');assert.equal(run('S.fighters.a.ap'),2);assert.deepEqual(J('S.fighters.a.aim'),{round:1,cycle:1});
 assert.equal(run('arenaRangedPlan(S.fighters.a,arenaRangedOption(S.fighters.a)).target'),before,'not yet a whole round');
 run('S.round=2;S.pending=null;R=null');
 const aimed=J('arenaRangedPlan(S.fighters.a,arenaRangedOption(S.fighters.a))');
 assert.equal(aimed.aimed,true);assert.equal(aimed.situationalSteps,1);assert(aimed.target>before);
 run('S.round=3');assert.equal(run('arenaRangedPlan(S.fighters.a,arenaRangedOption(S.fighters.a)).target'),aimed.target,'a second round adds nothing');
 run('S.order=["a","b"];S.turnIndex=0;S.fighters.a.ap=3;arenaMove("a","walk")');assert.equal(run('S.fighters.a.aim'),null,'moving breaks it');
});
test('PIT-R05: firing spends one projectile and unloads; no ammunition means no load and no shot',()=>{
 setup('long-bow','sword',20,`S.fighters.a.missile=PitsRanged.makeAmmo(arenaProfile('long-bow').profile,2);`);
 assert.deepEqual(J('S.fighters.a.missile'),{loaded:true,ammo:1,progress:0,rapid:0,spare:0});
 assert.equal(run('beginRangedAttack("a")'),true);answer(90);
 assert.equal(run('S.fighters.a.missile.loaded'),false);
 run('react("none")');assert.equal(run('S.pending'),null);
 run('S.order=["a","b"];S.turnIndex=0;S.fighters.a.ap=3');
 assert.equal(run('arenaRangedReady(S.fighters.a,arenaRangedOption(S.fighters.a)).ok'),false);assert.equal(run('beginRangedAttack("a")'),false);
 run('arenaLoad("a")');assert.equal(run('S.fighters.a.missile.loaded'),false,'Long bow Load 2: one turn is not enough');
 assert.equal(run('S.fighters.a.ap'),2);
 run('S.order=["a","b"];S.turnIndex=0;arenaLoad("a")');assert.equal(run('S.fighters.a.missile.loaded'),true);assert.equal(run('S.fighters.a.missile.ammo'),0);
 run('PitsRanged.fire(S.fighters.a.missile)');assert.equal(run('S.order=["a","b"];S.turnIndex=0;arenaLoad("a")'),false,'nothing left to load');
 assert.match(run('arenaRangedButtonsHtml(S.fighters.a)'),/No ammunition left/);
});
test('PIT-R06: Rapid Reload shortens the next load only; a spare in the off hand switches free; thrown missiles need Ready Weapon',()=>{
 const st={loaded:false,ammo:3,progress:0,rapid:1,spare:0};
 const r1=J(`(()=>{const st=${JSON.stringify(st)};const r=PitsRanged.loadStep(st,{load:3});return [r,st];})()`);
 assert.equal(r1[0].need,2);assert.equal(r1[1].progress,1);
 const r2=J(`(()=>{const st={loaded:false,ammo:3,progress:0,rapid:2,spare:0};const r=PitsRanged.loadStep(st,{load:2});return [r,st];})()`);
 assert.equal(r2[0].free,true);assert.equal(r2[1].loaded,true);assert.equal(r2[1].rapid,0,'used up by that load');
 const r3=J(`(()=>{const st={loaded:false,ammo:3,progress:0,rapid:0,spare:1};const r=PitsRanged.loadStep(st,{load:0,thrown:true});return [r,st];})()`);
 assert.equal(r3[0].spare,true);assert.equal(r3[1].ammo,3);assert.equal(r3[1].spare,0);
 setup('javelin','sword',15);run('PitsRanged.fire(S.fighters.a.missile)');
 run('arenaLoad("a")');assert.equal(run('S.fighters.a.missile.loaded'),true);assert.equal(run('S.fighters.a.ap'),2,'Ready Weapon is one turn');hasLog(/Ready Weapon :: .*readies another Javelin/);
 // Rapid Reload chosen as an effect credits the next load.
 setup('light-crossbow','sword',15);
 run(`S.pending={kind:'effect',atk:'a',def:'b',owner:'a',other:'b',attackRoll:{grade:2,roll:20},defenseRoll:null,reaction:'none',chosen:[],effectsLeft:2,attackKey:'light-crossbow',ranged:{band:'close',stationary:true}};applyEffect('rapidReload')`);
 assert.equal(run('S.fighters.a.missile.rapid'),1);
});
test('PIT-R07: a missile can be parried only by a shield with Ranged Parry; Force against shield Size decides what it blocks',()=>{
 setup('long-bow','sword',20,`S.fighters.b.shield='buckler';`);
 run('beginRangedAttack("a")');answer(20);run('react("parry")');
 assert.equal(run('S.pending.reaction'),'none','no weapon parry against a missile');
 setup('long-bow','sword',20,`S.fighters.b.shield='buckler';`);
 run('beginRangedAttack("a")');answer(20);run('render()');
 assert.match(output.innerHTML,/data-act="react" data-val="parry" disabled/);assert.match(output.innerHTML,/A weapon cannot parry a missile/);
 assert.match(output.innerHTML,/Ranged Parry: Force 4 against shield Size 2/);
 run('react("shield")');answer(50);
 assert.equal(run('S.pending.reaction'),'parry');assert.equal(run('S.pending.parryTool'),'shield');
 // Long bow Force Huge (4) vs Buckler Medium (2): two steps larger, nothing blocked.
 run('S.pending.kind="resolving";S.pending.chosenLoc="Chest";resolveHit()');answer(6,2);hasLog(/0 absorbed \(Size 2 vs Force 4\)/);
 setup('dart','sword',8,`S.fighters.b.shield='heater';`);missileHit({reaction:'parry',parryTool:'shield',defenseRoll:{grade:2,roll:30},attackKey:'dart',ranged:{kind:'fire',band:'close',metres:8,force:1,dmgMod:true,halved:false,impaleSize:1,unique:false,stationary:true}});
 answer(4,1);hasLog(/absorbed \(Size 3 vs Force 1\)/);hasLog(/= 5 total; 5 parry/);
});
test('PIT-R08: an aware defender can Evade a missile; success avoids it but leaves them prone; failure gives no free parry',()=>{
 setup('long-bow','sword',20);run('beginRangedAttack("a")');answer(30);run('react("evade")');answer(40);
 assert.equal(run('S.fighters.b.prone'),true);assert.equal(run('S.pending===null||S.pending.kind!=="reaction"'),true);
 hasLog(/No Damaging Hit :: .*evades/);
 setup('long-bow','sword',20,`S.fighters.b.shield='heater';`);run('beginRangedAttack("a")');answer(30);run('react("evade")');answer(95);
 assert.equal(run('S.pending.reaction'),'evade');assert.notEqual(run('S.pending.parryTool'),'shield');
});
test('PIT-R09: Thrown melee weapons use their own throwing line; Throw Weapons halves an improvised throw, never a native one',()=>{
 const d=J(`PitsRanged.throwProfileFor('Dagger',[],WEAPONS)`);assert.deepEqual([d.dice,d.bonus,d.force,d.ranges,d.native],[[1,4],0,1,[5,10,20],true]);
 assert.equal(J(`PitsRanged.throwProfileFor('Dagger',['Throw Weapons'],WEAPONS)`).halved,undefined,'native line not halved again');
 assert.equal(run(`PitsRanged.throwProfileFor('Broadsword',[],WEAPONS)`),null);
 const imp=J(`PitsRanged.throwProfileFor('Broadsword',['Throw Weapons'],WEAPONS)`);assert.equal(imp.halved,true);assert.deepEqual(imp.dice,[1,8]);
 setup('dagger','sword',8);
 assert.equal(run('arenaRangedOption(S.fighters.a).key'),'thrown:dagger');assert.match(run('arenaRangedButtonsHtml(S.fighters.a)'),/Throw · 1 AP/);
 run('beginRangedAttack("a")');answer(20);assert.equal(run('S.pending.ranged.band'),'effective');assert.equal(run('S.pending.attackKey'),'thrown:dagger');
 setup('sword','sword',4,`S.fighters.a.traits=['Throw Weapons'];`);
 assert.equal(run('arenaRangedOption(S.fighters.a).key'),'thrownImp:sword');
 missileHit({attackKey:'thrownImp:sword',ranged:{kind:'throw',band:'close',metres:4,force:2,dmgMod:true,halved:true,impaleSize:2,unique:true,stationary:true}});
 answer(8,1);hasLog(/Throw Weapons halves the weapon roll: 5 damage/);
});
test('PIT-R10: a thrown weapon leaves the hand: no duplicate; a miss lands at the target, recoverable only by reaching it',()=>{
 setup('dagger','sword',8);run('beginRangedAttack("a")');
 assert.equal(run('S.fighters.a.thrownAway'),true);assert.equal(run('canUseWeapon(S.fighters.a)'),false);
 answer(95);run('react("none")');
 assert.equal(run('S.fighters.a.thrownAway'),false);assert.equal(run('S.fighters.a.disarmed'),true);hasLog(/Thrown weapon lands/);
 assert.equal(run('arenaRangedOption(S.fighters.a)'),null,'nothing left to throw');
 run('S.order=["a","b"];S.turnIndex=0;S.fighters.a.ap=3;render()');
 assert.doesNotMatch(output.innerHTML,/data-act="recoverWeapon"/,'cannot pick it up from 8m away');
 assert.match(output.innerHTML,/data-act="move" data-val="walk"/);
 // Impale: it stays in the foe and cannot be pulled back from a distance.
 setup('shortsword','sword',3);
 run(`S.fighters.a.weapon='spear';arenaRangedInit(S.fighters.a);S.fighters.a.weaponGuard=null;ensureEffectState(S.fighters.a);S.fighters.a.thrownAway=true`);
 missileHit({impale:true,attackKey:'thrown:spear',ranged:{kind:'throw',band:'close',metres:3,force:3,dmgMod:true,halved:false,impaleSize:2,unique:true,stationary:true}});
 answer(5,5,1);run('S.pending.kind==="impalePick"&&chooseImpaleDamage(0)');
 assert.equal(J('S.fighters.a.impaledWeapon').thrown,true);assert.equal(run('canWithdrawImpale(S.fighters.a)'),false);
 run('S.disengaged=false;S.gapMetres=0');assert.equal(run('canWithdrawImpale(S.fighters.a)'),true,'once at the wound it can be withdrawn');
});
test('PIT-R11: no crowd penalty and no bystander in the two-fighter arena',()=>{
 assert.deepEqual(J('PitsRanged.crowd({})'),{steps:0,bystander:null});
 assert.deepEqual(J('PitsRanged.crowd({otherPair:true})'),{steps:1,bystander:null});
 assert.deepEqual(J('PitsRanged.crowd({otherPair:true,through:true,failedOnlyByCrowd:true,bystanders:["X"]})'),{steps:2,bystander:'X'});
 setup('short-bow','sword',0);const p=J('arenaRangedPlan(S.fighters.a,arenaRangedOption(S.fighters.a))');
 assert.equal(p.steps,0,'engaged with each other: no crowd penalty');assert.equal(Object.keys(J('S.fighters')).length,2);
});
test('PIT-R12/R14: projectile Special Effects follow the weapon and Core limits; no cover, second target or melee-only effects',()=>{
 setup('long-bow','sword',30,`S.fighters.b.shield='heater';`);
 const opts=(roll,key='long-bow',band='effective')=>J(`(()=>{S.pending={kind:'effect',atk:'a',def:'b',owner:'a',other:'b',attackRoll:${JSON.stringify(roll)},defenseRoll:null,reaction:'none',chosen:[],effectsLeft:1,attackKey:'${key}',ranged:{band:'${band}',stationary:false}};return availableEffects(S.pending).map(x=>x[0]);})()`);
 const ok=opts({grade:2,roll:20});
 for(const id of ['impale','drop','marksman','pinDown','rapidReload'])assert(ok.includes(id),id);
 for(const id of ['choose','bleed','stun','press','trip','disarm','remise','bash','close','open','entangle','circumventCover','duck','overpenetration','pinWeapon','bypassArmour'])assert(!ok.includes(id),id);
 const crit=opts({grade:3,roll:3});for(const id of ['choose','bypassArmour','maximize'])assert(crit.includes(id),id);
 assert(!crit.includes('overpenetration'),'no second target in the arena');
 run(`S.fighters.a.weapon='javelin';arenaRangedInit(S.fighters.a)`);assert(opts({grade:2,roll:20},'javelin').includes('pinWeapon'),'javelin vs shield, no critical');
 run(`S.fighters.b.shield='none'`);assert(!opts({grade:2,roll:20},'javelin').includes('pinWeapon'));
 run(`S.fighters.a.weapon='sling';arenaRangedInit(S.fighters.a)`);const sl=opts({grade:2,roll:20},'sling');assert(sl.includes('stun')&&!sl.includes('impale'));
 // Defensive effects at a distance need no reach.
 const def=J(`(()=>{S.pending={kind:'effect',atk:'a',def:'b',owner:'b',other:'a',attackRoll:{grade:1,roll:80},defenseRoll:{grade:2,roll:20},reaction:'evade',chosen:[],effectsLeft:1,attackKey:'sling',ranged:{band:'effective',stationary:false}};return availableEffects(S.pending).map(x=>x[0]);})()`);
 for(const id of ['trip','disarm','withdraw','damageWeapon'])assert(!def.includes(id),id);
});
test('PIT-R13: Pin Down works without damage and stops return fire next turn',()=>{
 setup('short-bow','short-bow',20);
 run(`S.pending={kind:'effect',atk:'a',def:'b',owner:'a',other:'b',attackRoll:{grade:2,roll:40},defenseRoll:null,reaction:'none',chosen:[],effectsLeft:1,attackKey:'short-bow',ranged:{band:'effective',stationary:false}};applyEffect('pinDown')`);
 assert.match(answer(70),/Pin Down · .* Willpower/);hasLog(/cannot return fire on their next turn/);
 run('S.pending=null;R=null;S.turnIndex=1');
 assert.match(run('arenaRangedReady(S.fighters.b,arenaRangedOption(S.fighters.b)).reason'),/Pinned Down/);
 run('advanceStun(S.fighters.b)');assert.equal(run('arenaRangedReady(S.fighters.b,arenaRangedOption(S.fighters.b)).ok'),true,'only one turn');
});
test('PIT-R13: Drop Foe needs a wound, then opposed Endurance; failure incapacitates',()=>{
 setup('short-bow','sword',20);missileHit({dropFoe:true});answer(3,1);
 assert.match(answer(90),/Drop Foe · .* Endurance/);assert.notEqual(run('S.phase'),'fight','the bout ends');assert.match(run('S.endReason'),/Drop Foe/);
 setup('short-bow','sword',20);run('S.fighters.b.armourLocations.Chest=10');missileHit({dropFoe:true});answer(3,1);
 hasLog(/Drop Foe :: No wound/);assert.equal(run('S.phase'),'fight');
});
test('PIT-R13: Marksman shifts the rolled location only to an adjoining one',()=>{
 assert.deepEqual(J('PitsRanged.ADJACENT["Right Leg"]'),['Abdomen']);
 setup('short-bow','sword',20);missileHit({chosenLoc:null,marksman:true});
 answer(1);assert.equal(run('S.pending.kind'),'marksman');
 const html=run('arenaRangedPendingHtml(S.pending)');assert.match(html,/Keep Right Leg/);assert.match(html,/Shift to Abdomen/);assert.doesNotMatch(html,/Head/);
 run('chooseMarksman("Head")');assert.equal(run('S.pending.kind'),'marksman','not adjoining: refused');
 run('chooseMarksman("Abdomen")');answer(3,1);hasLog(/hits Abdomen/);
});
test('PIT-R15: a missile lodges at its printed Impale Size; the shooter does not hold it; the victim can pull it out',()=>{
 setup('long-bow','sword',20);missileHit({impale:true});answer(4,4,2,1);
 run('S.pending&&S.pending.kind==="impalePick"&&chooseImpaleDamage(0)');
 const w=J('S.fighters.b.impaledWounds[0]');assert.equal(w.weaponSize,1,'arrow Impale Size S, not Force H');assert.equal(w.missile,true);
 assert.equal(run('S.fighters.a.impaledWeapon'),null);assert.equal(run('canWithdrawImpale(S.fighters.a)'),false);
 run('S.pending=null;R=null;S.order=["a","b"];S.turnIndex=1;S.fighters.b.ap=3;render()');assert.match(output.innerHTML,/data-act="extractMissile"/);
 run('arenaExtract("b")');assert.match(answer(20),/Pull out missile · .* Brawn/);answer(6);
 assert.equal(run('S.fighters.b.impaledWounds.length'),0);hasLog(/6 damage, halved to 3/);
});
test('PIT-R16: at 12m a melee fighter Moves by Movement and gait; melee is legal only once in reach',()=>{
 setup('short-bow','sword',12);run('S.order=["b","a"];S.turnIndex=0');
 assert.equal(run('canMakeAttack(S.fighters.b)'),false);run('beginAttack("b")');assert.equal(run('S.pending'),null,'no attack across 12m');
 run('render()');assert.match(output.innerHTML,/Walk 6m · 1 AP/);assert.match(output.innerHTML,/Run 12m · 1 AP/);
 run('arenaMove("b","walk")');assert.equal(run('S.gapMetres'),6);assert.equal(run('S.disengaged'),true);assert.equal(run('S.fighters.b.ap'),2);
 run('S.order=["b","a"];S.turnIndex=0;arenaMove("b","walk")');assert.equal(run('S.disengaged'),false);assert.equal(run('S.gapMetres'),0);
 assert.equal(run('canMakeAttack(S.fighters.b)'),true);
 setup('short-bow','sword',12);run('S.order=["b","a"];S.turnIndex=0;moveEngage("b")');assert.equal(run('S.fighters.b.gait'),'run');assert.equal(run('S.disengaged'),false);
});
test('PIT-R17: no shot above a walk; Skirmishing allows running (capped by Athletics) but never sprinting',()=>{
 assert.equal(J('PitsRanged.gaitCheck("walk",[])').ok,true);assert.equal(J('PitsRanged.gaitCheck("run",[])').ok,false);
 assert.equal(J('PitsRanged.gaitCheck("run",["Skirmishing"])').cap,true);assert.equal(J('PitsRanged.gaitCheck("sprint",["Skirmishing"])').ok,false);
 setup('short-bow','sword',40);run('S.fighters.a.gait="run";S.fighters.a.gaitRound=1');
 assert.match(run('arenaRangedReady(S.fighters.a,arenaRangedOption(S.fighters.a)).reason'),/Skirmishing/);
 run('S.fighters.a.traits=["Skirmishing"]');const p=J('arenaRangedPlan(S.fighters.a,arenaRangedOption(S.fighters.a))');
 assert.equal(p.allowed,true);assert.equal(p.target,40,'capped at Athletics 40');
 run('S.fighters.a.gait="sprint"');assert.equal(run('arenaRangedReady(S.fighters.a,arenaRangedOption(S.fighters.a)).ok'),false);
 run('S.round=2');assert.equal(run('arenaRangedReady(S.fighters.a,arenaRangedOption(S.fighters.a)).ok'),true,'gait lasts for the round it was used');
 // Moving is its own action: it never adds a free shot.
 setup('short-bow','sword',40);run('arenaMove("a","walk")');assert.equal(run('S.fighters.a.missile.loaded'),true);assert.equal(run('S.fighters.a.ap'),2);
});
test('Lance and Garrotte stay unsupported; Atlatl, Blowgun, Bolas and thrown Net are not offered',()=>{
 for(const n of ['Lance','Garrotte','Atlatl','Blowgun','Bolas','Net (thrown)','Dagger (thrown)'])assert.notEqual(run(`practiceUnsupportedReason(WEAPON_MAP[${JSON.stringify(n)}])`),'',n);
 const keys=J('Object.keys(ARENA_WEAPONS).filter(k=>ARENA_WEAPONS[k].ranged)').sort();
 assert.deepEqual(keys,['dart','discus','heavy-crossbow','javelin','light-crossbow','long-bow','recurve-bow','short-bow','sling','staff-sling','stone-rock']);
});
test('a computer opponent with a bow shoots, reloads and does not stall',()=>{
 setup('sword','short-bow',20,`S.fighters.b.kind='ai';S.fighters.b.tactic='patient';`);
 run('S.order=["b","a"];S.turnIndex=0;advance()');
 assert(logs().some(l=>/shoots ::/.test(l)),logs().join('\n'));
});
console.log(passed+' The Pits ranged tests passed');
