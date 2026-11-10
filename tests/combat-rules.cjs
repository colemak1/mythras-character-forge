// js/combat-rules.js: the shared, pure combat rules used by Play Mode and The
// Pits. One test per exported rule, with its Mythras Core page, then parity
// checks that both callers really use this copy.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const C=require('../js/combat-rules.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};

test('the module is pure: no DOM, no fight state, no Math.random',()=>{
 const src=fs.readFileSync(path.join(root,'js/combat-rules.js'),'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm,'');
 for(const banned of ['Math.random','document','window','localStorage','S.fighters','S.pending'])assert(!src.includes(banned),banned);
 const before=JSON.stringify(C.HUMAN_HIT_LOCATIONS);C.hitPointsByLocation(26);C.hitLocationFaces();
 assert.equal(JSON.stringify(C.HUMAN_HIT_LOCATIONS),before,'data is not changed by use');
});

/* ---------- Characteristics ---------- */
test('actionPoints: INT+DEX 12/24/36 steps, +1 per 12 above (Core p.8)',()=>{
 assert.deepEqual([2,12,13,24,25,36,37,48,49].map(C.actionPoints),[1,1,2,2,3,3,4,4,5]);
});
test('initiativeBonus: average of INT and DEX, rounded up (Core p.8)',()=>{
 assert.deepEqual([20,21,26,27].map(C.initiativeBonus),[10,11,13,14]);
});
test('healingRate: CON 6/12/18 steps, +1 per 6 above (Core p.9)',()=>{
 assert.deepEqual([3,6,7,12,13,18,19,24,25].map(C.healingRate),[1,1,2,2,3,3,4,4,5]);
});
test('locationHitPoints: CON+SIZ in steps of 5 (Core p.10)',()=>{
 assert.deepEqual(C.locationHitPoints(5),{head:1,chest:3,abdomen:2,arm:1,leg:1});
 assert.deepEqual(C.locationHitPoints(26),{head:6,chest:8,abdomen:7,arm:5,leg:6});
 assert.deepEqual(C.locationHitPoints(40),{head:8,chest:10,abdomen:9,arm:7,leg:8});
 assert.deepEqual(C.locationHitPoints(41),{head:9,chest:11,abdomen:10,arm:8,leg:9},'continues past the printed table');
});
test('damageModifier: the STR+SIZ table, as a label and as dice (Core p.9)',()=>{
 assert.deepEqual(C.damageModifier(5),{label:'-1d8',sign:-1,dice:[8],extraSteps:0});
 assert.deepEqual(C.damageModifier(25),{label:'+0',sign:0,dice:[],extraSteps:0});
 assert.deepEqual(C.damageModifier(26),{label:'+1d2',sign:1,dice:[2],extraSteps:0});
 assert.deepEqual(C.damageModifier(70).dice,[6,6]);
 assert.deepEqual(C.damageModifier(80).dice,[8,6]);
 assert.deepEqual(C.damageModifier(130).dice,[10,10,4]);
 assert.equal(C.damageModifier(131).extraSteps,1);assert.equal(C.damageModifier(150).extraSteps,2);
 assert.equal(C.DAMAGE_MODIFIER_STEPS.length,18);
});
test('damageModifierValue and totalDamage: modifier dice add or subtract, never below 0 (Core p.9)',()=>{
 assert.equal(C.damageModifierValue(C.damageModifier(80),[5,3]),8);
 assert.equal(C.damageModifierValue(C.damageModifier(12),[3]),-3);
 assert.equal(C.damageModifierValue(C.damageModifier(25),[]),0);
 assert.equal(C.totalDamage(6,2),8);assert.equal(C.totalDamage(1,-4),0);
});

/* ---------- Hit locations ---------- */
test('hitLocation: the humanoid d20 table (Core p.104)',()=>{
 const want={1:'Right Leg',3:'Right Leg',4:'Left Leg',6:'Left Leg',7:'Abdomen',9:'Abdomen',10:'Chest',12:'Chest',13:'Right Arm',15:'Right Arm',16:'Left Arm',18:'Left Arm',19:'Head',20:'Head'};
 for(const [roll,loc] of Object.entries(want))assert.equal(C.hitLocation(+roll),loc,'d20 '+roll);
 assert.equal(C.hitLocation(21),null);
 assert.deepEqual(C.HUMAN_LOCATION_ORDER,['Head','Chest','Abdomen','Right Arm','Left Arm','Right Leg','Left Leg']);
});
test('the hit-location table is data: another anatomy works without code changes',()=>{
 const serpent=[{lo:1,hi:6,name:'Tail',hp:'leg'},{lo:7,hi:14,name:'Body',hp:'chest'},{lo:15,hi:20,name:'Head',hp:'head'}];
 assert.equal(C.hitLocation(6,serpent),'Tail');assert.equal(C.hitLocation(15,serpent),'Head');
 assert.equal(C.hitLocationFaces(serpent).length,20);assert.equal(C.hitLocationFaces(serpent)[13],'Body');
 assert.deepEqual(C.hitLocationRanges(serpent),[['1-6','Tail'],['7-14','Body'],['15-20','Head']]);
 assert.deepEqual(C.hitPointsByLocation(26,serpent,null),{Tail:6,Body:8,Head:6});
});
test('hitLocationFaces, hitLocationRanges, hitPointsByLocation: humanoid defaults',()=>{
 assert.equal(C.hitLocationFaces().length,20);assert.equal(C.hitLocationFaces()[0],'Right Leg');assert.equal(C.hitLocationFaces()[19],'Head');
 assert.deepEqual(C.hitLocationRanges()[6],['19-20','Head']);
 assert.deepEqual(C.hitPointsByLocation(26),{Head:6,Chest:8,Abdomen:7,'Right Arm':5,'Left Arm':5,'Right Leg':6,'Left Leg':6});
});
test('isLimb: arms and legs (Core p.109)',()=>{
 assert.deepEqual(C.HUMAN_LOCATION_ORDER.filter(C.isLimb),['Right Arm','Left Arm','Right Leg','Left Leg']);
});

/* ---------- Skill rolls ---------- */
test('gradeRoll: critical, success, failure, fumble and the automatic bands (Core pp.38–39)',()=>{
 assert.equal(C.gradeRoll(7,65),'critical','a tenth, rounded up');assert.equal(C.gradeRoll(8,65),'success');
 assert.equal(C.gradeRoll(65,65),'success');assert.equal(C.gradeRoll(66,65),'failure');
 assert.equal(C.gradeRoll(5,3),'success','01–05 always succeeds');assert.equal(C.gradeRoll(1,3),'critical');
 assert.equal(C.gradeRoll(96,120),'failure','96–00 always fails');
 assert.equal(C.gradeRoll(99,100),'fumble');assert.equal(C.gradeRoll(100,100),'fumble');
 assert.equal(C.gradeRoll(99,101),'failure','over 100% only 00 fumbles');assert.equal(C.gradeRoll(100,150),'fumble');
 assert.equal(C.gradeRoll(8,70,80),'critical','critical range from the tier skill');
 assert.deepEqual(C.GRADE_VALUE,{fumble:0,failure:1,success:2,critical:3});
});
test('opposedWins: better level wins, then the higher roll; two failures have no winner (Core p.50)',()=>{
 const r=(grade,roll)=>({grade,roll});
 assert.equal(C.opposedWins(r(3,2),r(2,60)),true);assert.equal(C.opposedWins(r(2,60),r(3,2)),false);
 assert.equal(C.opposedWins(r(2,40),r(2,30)),true);assert.equal(C.opposedWins(r(2,30),r(2,40)),false);
 assert.equal(C.opposedWins(r(2,30),r(2,30)),false,'a tie is not a win');
 assert.equal(C.opposedWins(r(1,80),r(1,70)),false);assert.equal(C.opposedWins(r(1,80),r(0,99)),true);
});
test('opposedTargets: the excess over 100 comes off both skills (Core p.51)',()=>{
 assert.deepEqual(C.opposedTargets(80,60),{reduction:0,a:80,b:60});
 assert.deepEqual(C.opposedTargets(130,60),{reduction:30,a:100,b:30});
 assert.deepEqual(C.opposedTargets(20,150),{reduction:50,a:0,b:100});
});
test('skillAtGrade: Hard two thirds, Formidable half, Herculean a tenth, rounded up (Core p.38)',()=>{
 assert.deepEqual([0,1,2,3,4].map(g=>C.skillAtGrade(65,g)),[65,44,33,7,0]);
 assert.equal(C.skillAtGrade(65,9),0);
});
test('impaleGrades: bigger weapons in smaller victims cost more (Core p.97)',()=>{
 assert.deepEqual([1,2,3,4,5].map(s=>C.impaleGrades(10,s)),[2,3,4,4,4]);
 assert.deepEqual([1,2,3,4,5].map(s=>C.impaleGrades(13,s)),[1,2,3,4,4]);
 assert.deepEqual([1,2,3,4,5].map(s=>C.impaleGrades(45,s)),[0,0,0,1,2]);
 assert.equal(C.impaleGrades(60,5),1);
});

/* ---------- Differential roll ---------- */
test('effectsWon: the differential table (Core pp.94, 100)',()=>{
 const levels=['critical','success','failure','fumble'];
 const table=levels.map(m=>levels.map(t=>C.effectsWon(m,t)));
 assert.deepEqual(table,[[0,1,2,3],[-1,0,1,2],[-2,-1,0,0],[-3,-2,0,0]]);
 assert.equal(C.effectsWon('Critical','Fumble'),3,'case does not matter');assert.equal(C.effectsWon('x','success'),0);
 assert.equal(C.effectsWon('failure','fumble',{failureBeatsFumble:true}),1,'arena option, pending ruling D-CE1');
 assert.equal(C.effectsWon('fumble','failure',{failureBeatsFumble:true}),-1);
 assert.equal(C.effectsWon('failure','failure',{failureBeatsFumble:true}),0);
});

/* ---------- Size, Reach, parry ---------- */
test('SIZE_STEP, SIZE_NAMES, REACH_STEP, REACH_NAMES (Core pp.63–64)',()=>{
 assert.deepEqual(C.SIZE_STEP,{S:1,M:2,L:3,H:4,E:5});assert.equal(C.SIZE_NAMES[4],'Huge');
 assert.deepEqual(C.REACH_STEP,{T:0,S:1,M:2,L:3,VL:4});assert.equal(C.REACH_NAMES[4],'Very Long');
});
test('parryReduction: equal or larger blocks all, one smaller half (rounded up), two smaller none (Core pp.94–95, PIT-P01)',()=>{
 assert.deepEqual(C.parryReduction(8,2,2),{blocked:8,remaining:0});assert.deepEqual(C.parryReduction(8,2,4),{blocked:8,remaining:0});
 assert.deepEqual(C.parryReduction(8,3,2),{blocked:4,remaining:4});assert.deepEqual(C.parryReduction(7,3,2),{blocked:4,remaining:3});
 assert.deepEqual(C.parryReduction(8,4,2),{blocked:0,remaining:8});
});
test('crampedSize: a Size step lost per Reach step inside reach, never below Small (Core p.106)',()=>{
 assert.equal(C.crampedSize(4,2),2);assert.equal(C.crampedSize(2,3),1);
});

/* ---------- Damage ---------- */
test('resolveBlow: parry, then armour (Core pp.94–95, 103)',()=>{
 assert.deepEqual(C.resolveBlow({damage:9,attackSize:3,armour:2}),
  {blocked:0,blockedBy:null,afterParry:9,armour:2,absorbed:2,wound:7,armourLost:0});
 const half=C.resolveBlow({damage:9,attackSize:3,parry:{size:2},armour:2});
 assert.deepEqual([half.blocked,half.blockedBy,half.afterParry,half.wound],[5,'parry',4,2]);
 assert.equal(C.resolveBlow({damage:9,attackSize:3,parry:{size:3},armour:2}).wound,0);
 assert.equal(C.resolveBlow({damage:3,attackSize:2,armour:5}).absorbed,3,'armour absorbs no more than arrives');
});
test('resolveBlow: Enhance Parry, passive ward, Bypass Armour and Sunder (Core pp.92, 96–97, 100)',()=>{
 assert.equal(C.resolveBlow({damage:9,attackSize:4,parry:{size:1,enhanced:true}}).blocked,9,'Enhance Parry blocks all');
 const ward=C.resolveBlow({damage:8,attackSize:2,wardSize:4,armour:0});
 assert.deepEqual([ward.blocked,ward.blockedBy,ward.wound],[8,'ward',0]);
 const both=C.resolveBlow({damage:8,attackSize:3,parry:{size:2},wardSize:1});
 assert.deepEqual([both.blocked,both.blockedBy],[4,'parry'],'the better of parry and ward applies');
 assert.equal(C.resolveBlow({damage:8,attackSize:2,armour:5,bypassArmour:true}).wound,8);
 const sunder=C.resolveBlow({damage:8,attackSize:2,armour:5,sunder:true});
 assert.deepEqual([sunder.wound,sunder.armourLost],[0,3],'surplus over the armour reduces its AP');
 assert.equal(C.resolveBlow({damage:8,attackSize:2,armour:5,sunder:true,bypassArmour:true}).armourLost,3,'Sunder still meets the armour');
});
test('woundLevel: Minor above 0, Serious at 0 or less, Major at minus the maximum (Core p.109)',()=>{
 assert.deepEqual([5,4,1,0,-4,-5,-9].map(hp=>C.woundLevel(hp,5)),['ok','minor','minor','serious','serious','major','major']);
});
test('woundOutcome: Serious and Major Wound consequences (Core pp.109–110)',()=>{
 const o=x=>C.woundOutcome({healingRate:3,...x});
 assert.equal(o({level:'serious',limb:true,resisted:true}).outcome,'resisted');
 assert.deepEqual(o({level:'serious',limb:true,leg:true,resisted:false}),{outcome:'limbDisabled',fightEnds:false,prone:true,conscious:true,deadline:null});
 assert.equal(o({level:'serious',limb:true,leg:false,resisted:false}).prone,false);
 assert.equal(o({level:'serious',limb:false,resisted:false}).outcome,'unconscious');
 const limb=o({level:'major',limb:true,resisted:true});
 assert.deepEqual([limb.outcome,limb.prone,limb.conscious,limb.deadline],['majorLimb',true,true,{unit:'minutes',value:15}]);
 assert.equal(o({level:'major',limb:true,resisted:false}).conscious,false);
 assert.deepEqual(o({level:'major',limb:false,resisted:true}).deadline,{unit:'combat rounds',value:6});
 assert.equal(o({level:'major',limb:false,resisted:false}).outcome,'majorDead');
 for(const x of [{level:'major',limb:true,resisted:true},{level:'major',limb:false,resisted:true},{level:'major',limb:false,resisted:false},{level:'serious',limb:false,resisted:false}])
  assert.equal(o(x).fightEnds,true);
});
test('canBash and bashDistance: 1m per 2 (shield) or 3 (weapon), target at most twice the SIZ (Core p.96)',()=>{
 assert.equal(C.canBash(10,20),true);assert.equal(C.canBash(10,21),false);
 assert.deepEqual([1,5,6].map(d=>C.bashDistance(d,true)),[0,2,3]);assert.deepEqual([1,5,6].map(d=>C.bashDistance(d,false)),[0,1,2]);
});
test('knockbackDistance: 1m per 5 points or part over SIZ (Core p.104)',()=>{
 assert.deepEqual([13,14,18,19,24].map(d=>C.knockbackDistance(d,13)),[0,1,1,2,3]);
});
test('withdrawalDamage: half, or full for a Barbed weapon (Core pp.61, 97)',()=>{
 assert.equal(C.withdrawalDamage(7,false),4);assert.equal(C.withdrawalDamage(7,true),7);assert.equal(C.withdrawalDamage(0,false),0);
});
test('strikeWeapon: the weapon\'s AP resists, 0 HP breaks it (Core pp.97, 106)',()=>{
 assert.deepEqual(C.strikeWeapon(9,6,8),{lost:3,hp:5,broken:false});
 assert.deepEqual(C.strikeWeapon(4,6,8),{lost:0,hp:8,broken:false});
 assert.deepEqual(C.strikeWeapon(20,6,8),{lost:14,hp:0,broken:true});
});
test('canDisarm and disarmResistSkill: twice-STR limit, a grade per Size step (Core p.97)',()=>{
 assert.equal(C.canDisarm(10,20),true);assert.equal(C.canDisarm(10,21),false);
 assert.deepEqual([[2,2],[3,2],[4,2],[5,2],[2,3],[1,3]].map(([own,other])=>C.disarmResistSkill(60,own,other)),[60,40,30,6,90,120]);
 assert.equal(C.disarmResistSkill(150,1,3),200);assert.equal(C.disarmResistSkill(4,5,1),1);
});

/* ---------- Special Effects ---------- */
test('SPECIAL_EFFECTS and specialEffect: the 43 effects of the summary table (Core p.100)',()=>{
 assert.equal(C.SPECIAL_EFFECTS.length,43);assert.equal(new Set(C.SPECIAL_EFFECTS.map(e=>e.id)).size,43);
 assert.deepEqual(C.specialEffect('bypassArmour'),{id:'bypassArmour',name:'Bypass Armour',offensive:true,defensive:false,weapon:'',requirement:'Attacker Criticals',stackable:true});
 assert.deepEqual(C.SPECIAL_EFFECTS.filter(e=>e.stackable).map(e=>e.id),['bypassArmour','flurry','maximize','overextend','pinDown','prepareCounter','rapidReload']);
 assert.equal(C.specialEffect('nothing'),null);
});
test('effectRoleAllows: offensive, defensive or both',()=>{
 const ok=(id,offense)=>C.effectRoleAllows(C.specialEffect(id),offense);
 assert.deepEqual([ok('press',true),ok('press',false),ok('withdraw',true),ok('withdraw',false),ok('trip',true),ok('trip',false)],[true,false,false,true,true,true]);
 assert.equal(C.effectRoleAllows(null,true),false);
});
test('effectRequirementMet: the Specific Roll column (Core p.100; Entrapping, Core p.61)',()=>{
 const met=(id,roll)=>C.effectRequirementMet(C.specialEffect(id),roll);
 assert.equal(met('maximize',{offense:true,critical:true}),true);assert.equal(met('maximize',{offense:true,critical:false}),false);
 assert.equal(met('maximize',{offense:false,critical:true}),false);
 assert.equal(met('enhance',{offense:false,critical:true}),true);assert.equal(met('enhance',{offense:true,critical:true}),false);
 assert.equal(met('pinWeapon',{offense:true,critical:false}),false);assert.equal(met('pinWeapon',{offense:false,critical:true}),true);
 assert.equal(met('pinWeapon',{offense:true,critical:false,withoutCritical:true}),true);
 assert.equal(met('forceFailure',{offense:true,opponentFumble:true}),true);assert.equal(met('forceFailure',{offense:true}),false);
 assert.equal(met('accidental',{offense:false,opponentFumble:true}),true);assert.equal(met('malfunction',{offense:true,ownFumble:true}),true);
 assert.equal(met('trip',{offense:true}),true);assert.equal(met('choose',{offense:true}),true,'"See Description" is not a roll');
});
const exchange=o=>({offense:true,attackGrade:2,defenceGrade:1,reaction:'parry',parryTool:'weapon',maximize:0,effectsLeft:1,chosen:[],
 weapon:{traits:['bleed','impale'],size:2,shield:false,entrapping:false},attackDice:1,
 actor:{siz:13,str:13,prone:false,canUseWeapon:true,pinned:false,entangled:false,legsEntangled:false},
 target:{siz:13,str:13,prone:false,disarmed:false,weaponIntact:true,pinned:false,canUseWeapon:true,hasShield:false,entangled:false,armoured:false,disadvantaged:false},
 disengaged:false,reach:{active:false,engagement:'equal',ownerHasLonger:false},...o});
test('meleeEffectOptions: an ordinary winning attack (Core pp.95–101)',()=>{
 assert.deepEqual(C.meleeEffectOptions(exchange()),['choose','press','bleed','impale','trip','disarm','damageWeapon','scar']);
});
test('meleeEffectOptions: a critical attack adds the critical-only effects; Maximise stacks to the dice',()=>{
 const got=C.meleeEffectOptions(exchange({attackGrade:3,defenceGrade:2}));
 for(const id of ['bypassArmour','circumventParry','maximize','pinWeapon'])assert(got.includes(id),id);
 assert(!C.meleeEffectOptions(exchange({attackGrade:3,maximize:1})).includes('maximize'));
 assert(C.meleeEffectOptions(exchange({attackGrade:3,chosen:['bypassArmour']})).includes('bypassArmour'),'stackable by the table');
 assert(!C.meleeEffectOptions(exchange({attackGrade:3,chosen:['bypassArmour'],unstackable:['bypassArmour']})).includes('bypassArmour'));
 assert(!C.meleeEffectOptions(exchange({chosen:['press']})).includes('press'),'others once per exchange');
});
test('meleeEffectOptions: a winning defence',()=>{
 const base={offense:false,attackGrade:1,defenceGrade:2};
 assert.deepEqual(C.meleeEffectOptions(exchange(base)),['overextend','withdraw','standFast','prepareCounter','trip','disarm','damageWeapon','scar']);
 const crit=C.meleeEffectOptions(exchange({...base,defenceGrade:3,actor:{...exchange().actor,prone:true,pinned:true}}));
 for(const id of ['arise','enhance','blind','pinWeapon','slip'])assert(crit.includes(id),id);
 const fumbled=C.meleeEffectOptions(exchange({...base,attackGrade:0,effectsLeft:2}));
 assert(fumbled.includes('accidental'));assert(fumbled.includes('forceFailure'));
 assert(!C.meleeEffectOptions(exchange({...base,attackGrade:0,effectsLeft:1})).includes('forceFailure'),'needs a second effect to combine with');
});
test('meleeEffectOptions: weapon, state and reach conditions',()=>{
 const has=(o,id)=>C.meleeEffectOptions(exchange(o)).includes(id);
 const w=traits=>({weapon:{traits,size:2,shield:false,entrapping:false}});
 assert.equal(has(w(['bash']),'bash'),true);
 assert.equal(has({...w(['bash']),target:{...exchange().target,siz:27}},'bash'),false,'Bash: at most twice the SIZ');
 assert.equal(has(w(['sunder']),'sunder'),false);assert.equal(has({...w(['sunder']),target:{...exchange().target,armoured:true}},'sunder'),true);
 assert.equal(has({weapon:{traits:[],size:1}},'remise'),true);assert.equal(has({weapon:{traits:[],size:1},isRemise:true},'remise'),false);
 assert.equal(has({weapon:{traits:[],size:2,entrapping:true}},'pinWeapon'),true,'Entrapping needs no critical (Core p.61)');
 assert.equal(has({target:{...exchange().target,str:27}},'disarm'),false,'Disarm: at most twice the STR');
 assert.equal(has({target:{...exchange().target,prone:true}},'trip'),false);
 assert.equal(has({target:{...exchange().target,disadvantaged:true}},'compel'),true);assert.equal(has({},'compel'),false);
 assert.equal(has({attackGrade:1,defenceGrade:0},'choose'),false,'a miss wins effects but lands no blow');
 assert.equal(has({reach:{active:true,engagement:'long',ownerHasLonger:false}},'close'),true);
 assert.equal(has({offense:false,attackGrade:1,defenceGrade:2,reach:{active:true,engagement:'short',ownerHasLonger:true}},'open'),true);
 assert.equal(has({reach:{active:true,engagement:'short',ownerHasLonger:true}},'open'),false,'Open Range is defensive');
});
test('tripResistSkills: Brawn, Evade or Acrobatics (Core pp.100–101)',()=>{
 assert.deepEqual(C.tripResistSkills(false),['brawn','evade']);assert.deepEqual(C.tripResistSkills(true),['brawn','evade','acrobatics']);
});
test('every exported rule has a test here',()=>{
 const self=fs.readFileSync(__filename,'utf8');
 for(const name of Object.keys(C))assert(self.includes(name),name+' is exported but not tested');
});

/* ---------- Both callers use this copy ---------- */
const stub=()=>({console,URLSearchParams,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},
 sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
 document:{querySelector:s=>s==='#root'?{innerHTML:'',addEventListener(){}}:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
 window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}});
const page=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const inline=page.match(/<script>([\s\S]*?)<\/script>/)[1];
const arena=vm.createContext(stub());
for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),arena);
vm.runInContext(inline,arena);
const site=vm.createContext({console});
for(const f of ['js/combat-rules.js','js/data.js','js/engine.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),site);
const A=s=>vm.runInContext(s,arena),E=s=>vm.runInContext(s,site);
const playSource=fs.readFileSync(path.join(root,'js/play.js'),'utf8'),engineSource=fs.readFileSync(path.join(root,'js/engine.js'),'utf8');

test('both pages load combat-rules.js before the scripts that use it',()=>{
 assert.match(index,/<script src="js\/combat-rules\.js\?v=[0-9a-f]{10}"><\/script>\s*<script src="js\/data\.js/);
 assert.match(page,/<script src="\.\.\/js\/combat-rules\.js\?v=[0-9a-f]{10}"><\/script>\s*<script src="\.\.\/js\/data\.js/);
 assert(page.indexOf('combat-rules.js')<page.indexOf('<script>'),'before the inline script');
});
test('The Pits and the site read the same numbers for every characteristic total',()=>{
 for(let a=3;a<=21;a+=3)for(let b=3;b<=21;b+=2){
  assert.equal(A(`actionPointsFor(${a},${b})`),E(`apCalc(${a},${b})`));
  assert.equal(A(`initiativeBonusFor(${a},${b})`),E(`initBonus(${a},${b})`));
  assert.equal(A(`damageModifierFor(${a},${b}).label`).replace('−','-'),E(`dmCalc(${a},${b})`));
  const hp=JSON.parse(A(`JSON.stringify(hitPointsFor(${a},${b}))`)),rows=Object.fromEntries(JSON.parse(E(`JSON.stringify(hpLocs(${a},${b}))`)));
  assert.deepEqual([hp.Head,hp.Chest,hp.Abdomen,hp['Left Arm'],hp['Right Leg']],[rows.Head,rows.Chest,rows.Abdomen,rows['Each Arm'],rows['Each Leg']]);
 }
 for(let con=3;con<=24;con++)assert.equal(A(`healingRateFor(${con})`),E(`healRate(${con})`));
});
test('hit locations, success levels and wound levels come from the module on both sides',()=>{
 assert.deepEqual(JSON.parse(A('JSON.stringify(HIT_TABLE)')),C.hitLocationFaces());
 assert.deepEqual(JSON.parse(E('JSON.stringify(HIT_D20)')),C.hitLocationRanges());
 for(const [roll,pct] of [[1,50],[5,3],[50,50],[51,50],[96,120],[99,80],[100,130]]){
  assert.equal(A(`rollSkill(${pct},${roll}).name`),C.gradeRoll(roll,pct));
  assert.equal(E(`resolveRoll(${roll},${pct})`).toLowerCase(),C.gradeRoll(roll,pct));
 }
 assert.equal(A(`zoneClass({hp:{Head:-5},maxHp:{Head:5}},'Head')`),'major');
 assert(playSource.includes('CombatRules.woundLevel(cur,max)'));assert(playSource.includes('CombatRules.parryReduction('));
 assert(playSource.includes('CombatRules.effectsWon(mine,theirs)'));assert(playSource.includes('CombatRules.effectRequirementMet('));
});
test('no second copy of the tables is left in the callers',()=>{
 const code=inline+engineSource+playSource+fs.readFileSync(path.join(root,'js/data.js'),'utf8');
 for(const gone of ['[5,"-1d8"]','[[5,-1,8]','[[1,2,3,1,1]',"'Right Leg','Right Leg','Right Leg'",'["1-3","Right Leg"]','Critical:{Critical:0','Math.ceil(damage/2)',"r>=96?'failure'"])
  assert(!code.includes(gone),'duplicate table or rule still present: '+gone);
});
test('Play Mode\'s Special Effects table agrees with the shared table, row for row',()=>{
 const rows=vm.runInNewContext(playSource.match(/const SPECIAL_EFFECTS=\[[\s\S]*?\n\];/)[0]+';SPECIAL_EFFECTS');
 assert.equal(rows.length,C.SPECIAL_EFFECTS.length);
 rows.forEach((row,i)=>{
  const rule=C.SPECIAL_EFFECTS[i],name=rule.id==='malfunction'?'Weapon Malfunction (Firearms)':rule.name;
  assert.deepEqual([row[0],!!row[1],!!row[2],row[3],row[4]||'',!!row[5]],[name,rule.offensive,rule.defensive,rule.weapon,rule.requirement,rule.stackable],rule.id);
 });
});
test('The Pits\' catalogue is built from the shared table',()=>{
 const got=JSON.parse(A('JSON.stringify(SPECIAL_EFFECT_CATALOG.map(e=>[e.id,e.name,e.role]))'));
 assert.deepEqual(got,C.SPECIAL_EFFECTS.map(e=>[e.id,e.name,e.offensive&&e.defensive?'both':e.offensive?'offensive':'defensive']));
});
test('The Pits\' script has no line over 200 characters',()=>{
 const long=inline.split(/\r?\n/).map((l,i)=>[i+1,l.length]).filter(([,n])=>n>200);
 assert.deepEqual(long,[]);
});
console.log(passed+' combat rules tests passed');
