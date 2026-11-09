"use strict";
/* ================= COMBAT RULES (shared, pure) =================
   One copy of the Mythras combat rules used by Play Mode (js/) and by The
   Pits (experiments/practice-combat.html). Loaded after data.js and before
   engine.js / the arena's inline script.

   Everything here is a pure function: values in, a plain result out. No DOM,
   no fight state, no Math.random. Dice are rolled by the caller and passed in
   as numbers, so the page's prompts, the arena AI and the tests can all drive
   the same rules. Page references are to the printed Mythras Core Rulebook.

   Tests: tests/combat-rules.cjs (one per exported rule). */
const CombatRules=(function(){

/* ---------- Characteristics (Core pp.8–10) ---------- */
// Core p.8: Action Points from INT+DEX; one more for every 12 points over 36.
function actionPoints(total){
  if(total<=12)return 1;
  if(total<=24)return 2;
  if(total<=36)return 3;
  return 3+Math.ceil((total-36)/12);
}
// Core p.8: Initiative Bonus is the average of INT and DEX, rounded up.
function initiativeBonus(total){return Math.ceil(total/2);}
// Core p.9: Healing Rate from CON; one more for every 6 points over 6.
function healingRate(con){return con<=6?1:Math.floor((con-1)/6)+1;}
// Core p.10: Hit Points per location from CON+SIZ, in steps of 5. Returned by
// kind of location, so any anatomy can map its own locations onto them.
function locationHitPoints(total){
  const step=Math.max(1,Math.ceil(total/5));
  return {head:step,chest:step+2,abdomen:step+1,arm:Math.max(1,step-1),leg:step};
}

/* ---------- Damage Modifier (Core p.9) ---------- */
const DAMAGE_MODIFIER_STEPS=[[5,"-1d8"],[10,"-1d6"],[15,"-1d4"],[20,"-1d2"],[25,"+0"],[30,"+1d2"],
  [35,"+1d4"],[40,"+1d6"],[45,"+1d8"],[50,"+1d10"],[60,"+1d12"],[70,"+2d6"],
  [80,"+1d8+1d6"],[90,"+2d8"],[100,"+1d10+1d8"],[110,"+2d10"],[120,"+2d10+1d2"],[130,"+2d10+1d4"]];
function parseModifier(label){
  const dice=[];
  for(const m of label.matchAll(/(\d+)d(\d+)/g))for(let i=0;i<Number(m[1]);i++)dice.push(Number(m[2]));
  return {label,sign:dice.length?(label[0]==="-"?-1:1):0,dice};
}
// total is STR+SIZ. dice lists the sides of each modifier die; sign says
// whether they add or subtract. Past the printed table (over 130) the last
// row is returned with extraSteps, one for each further 10 points.
function damageModifier(total){
  for(const [max,label] of DAMAGE_MODIFIER_STEPS)if(total<=max)return {...parseModifier(label),extraSteps:0};
  const last=DAMAGE_MODIFIER_STEPS[DAMAGE_MODIFIER_STEPS.length-1];
  return {...parseModifier(last[1]),extraSteps:Math.ceil((total-last[0])/10)};
}
// The value of rolled modifier dice: they add or subtract as one amount.
function damageModifierValue(modifier,rolls){return (modifier.sign||0)*rolls.reduce((a,b)=>a+b,0);}
// Core p.9/p.103: weapon damage plus the Damage Modifier, never below zero.
function totalDamage(weaponDamage,modifierValue){return Math.max(0,weaponDamage+modifierValue);}

/* ---------- Hit locations (Core p.104) ---------- */
// The table is data: [{lo,hi,name,hp}] on a d20, hp naming the row of
// locationHitPoints() the location uses. Humanoid is the default; a creature
// passes its own table.
const HUMAN_HIT_LOCATIONS=[
  {lo:1,hi:3,name:"Right Leg",hp:"leg"},{lo:4,hi:6,name:"Left Leg",hp:"leg"},
  {lo:7,hi:9,name:"Abdomen",hp:"abdomen"},{lo:10,hi:12,name:"Chest",hp:"chest"},
  {lo:13,hi:15,name:"Right Arm",hp:"arm"},{lo:16,hi:18,name:"Left Arm",hp:"arm"},
  {lo:19,hi:20,name:"Head",hp:"head"}];
// The order locations are listed on a character sheet (head first).
const HUMAN_LOCATION_ORDER=["Head","Chest","Abdomen","Right Arm","Left Arm","Right Leg","Left Leg"];
function hitLocation(roll,table=HUMAN_HIT_LOCATIONS){
  const row=table.find(r=>roll>=r.lo&&roll<=r.hi);
  return row?row.name:null;
}
// One location name per die face, for a table lookup by roll-1.
function hitLocationFaces(table=HUMAN_HIT_LOCATIONS){
  const faces=[];
  for(const r of table)for(let n=r.lo;n<=r.hi;n++)faces[n-1]=r.name;
  return faces;
}
// [["1-3","Right Leg"],…] for display.
function hitLocationRanges(table=HUMAN_HIT_LOCATIONS){
  return table.map(r=>[r.lo===r.hi?String(r.lo):r.lo+"-"+r.hi,r.name]);
}
// Hit Points for every location of a table, keyed by location name.
function hitPointsByLocation(total,table=HUMAN_HIT_LOCATIONS,order=HUMAN_LOCATION_ORDER){
  const hp=locationHitPoints(total),names=order||table.map(r=>r.name);
  return Object.fromEntries(names.map(name=>[name,hp[table.find(r=>r.name===name).hp]]));
}
// Core p.109: arms and legs are limbs; a wound there has limb consequences.
function isLimb(name){return /(Arm|Leg)$/.test(String(name));}

/* ---------- Skill rolls (Core pp.38–39, 50–51) ---------- */
const GRADE_VALUE={fumble:0,failure:1,success:2,critical:3};
// Core pp.38–39: 96–00 always fails, 01–05 always succeeds, a critical is a
// tenth of the skill (round up), a fumble is 99–00 (00 only over 100%).
// tierSkill sets the critical and fumble range when it differs from the
// target (an augmented skill keeps the primary skill's ranges).
function gradeRoll(roll,skill,tierSkill=skill){
  const critical=Math.max(0,Math.ceil(tierSkill/10));
  if(tierSkill>100?roll===100:roll>=99)return "fumble";
  if(roll>=96)return "failure";
  if(roll<=critical)return "critical";
  if(roll<=5)return "success";
  return roll<=skill?"success":"failure";
}
// Core p.50: in an opposed roll the better level of success wins; with equal
// successes the higher roll wins. Two failures have no winner. Each side is
// {grade,roll} with grade 0–3 (GRADE_VALUE).
function opposedWins(mine,theirs){
  return mine.grade>theirs.grade||(mine.grade===theirs.grade&&mine.grade>=2&&mine.roll>theirs.roll);
}
// Core p.51: when a skill is over 100%, the excess of the highest is taken
// off every participant before anyone's result is read.
function opposedTargets(a,b){
  const reduction=Math.max(0,a-100,b-100);
  return {reduction,a:Math.max(0,a-reduction),b:Math.max(0,b-reduction)};
}
// Core p.38: difficulty grades as steps harder than Standard: Hard two
// thirds, Formidable half, Herculean a tenth, Hopeless no chance.
const HARDER_GRADE_MULTIPLIER=[1,2/3,1/2,1/10,0];
function skillAtGrade(percent,stepsHarder){
  const step=Math.max(0,Math.min(4,stepsHarder));
  return Math.max(0,Math.ceil(percent*HARDER_GRADE_MULTIPLIER[step]));
}
// Core p.97 Impale: the difficulty grades an embedded weapon costs its
// victim, by the victim's SIZ and the weapon's Size step (1 Small … 5 Enormous).
function impaleGrades(siz,weaponSize){
  const row=siz<=10?[2,3,4,4,4]:siz<=20?[1,2,3,4,4]:siz<=30?[0,1,2,3,4]:siz<=40?[0,0,1,2,3]:siz<=50?[0,0,0,1,2]:[0,0,0,0,1];
  return row[Math.min(5,Math.max(1,weaponSize))-1];
}

/* ---------- Differential roll (Core pp.94, 100) ---------- */
const DIFFERENTIAL={
  critical:{critical:0,success:1,failure:2,fumble:3},
  success:{critical:-1,success:0,failure:1,fumble:2},
  failure:{critical:-2,success:-1,failure:0,fumble:0},
  fumble:{critical:-3,success:-2,failure:0,fumble:0}
};
// Special Effects won by "mine" over "theirs" (negative: theirs wins that
// many). Two unsuccessful rolls win nothing (Core p.94).
// options.failureBeatsFumble: The Pits counts a plain Failure against a
// Fumble as one effect. That differs from the table above and is kept only
// until it is ruled on (docs/decisions.md, combat engine differences).
function effectsWon(mine,theirs,options){
  const m=String(mine).toLowerCase(),t=String(theirs).toLowerCase();
  if(options&&options.failureBeatsFumble){
    if(m==="failure"&&t==="fumble")return 1;
    if(m==="fumble"&&t==="failure")return -1;
  }
  return DIFFERENTIAL[m]?.[t]??0;
}

/* ---------- Weapon Size and Reach (Core pp.63–64, 94–95, 106) ---------- */
const SIZE_STEP={S:1,M:2,L:3,H:4,E:5};
const SIZE_NAMES=["","Small","Medium","Large","Huge","Enormous"];
const REACH_STEP={T:0,S:1,M:2,L:3,VL:4};
const REACH_NAMES=["Touch","Short","Medium","Long","Very Long"];
// Core pp.94–95: a successful parry with a weapon or shield of equal or
// greater Size blocks all damage, one Size smaller blocks half, two or more
// smaller blocks none. Odd damage: the blocked half rounds up (owner,
// 2026-11-07, PIT-P01). Sizes are steps (SIZE_STEP).
function parryReduction(damage,attackSize,parrySize){
  const difference=attackSize-parrySize;
  const blocked=difference<=0?damage:difference===1?Math.ceil(damage/2):0;
  return {blocked,remaining:damage-blocked};
}
// Core p.106: a weapon used inside its Reach loses a Size step per step of
// difference (never below Small).
function crampedSize(size,reachGap){return Math.max(1,size-reachGap);}

/* ---------- Damage to a location (Core pp.94–96, 99–100, 103–104) ---------- */
// One blow: parry, a passively warded location, then armour.
//  damage      total rolled (weapon + Damage Modifier)
//  attackSize  Size step of the attacking weapon
//  parry       null, or {size,enhanced} for a successful parry (Enhance Parry
//              blocks everything, Core p.97)
//  wardSize    null, or the Size step of a shield passively covering the
//              location (Core p.92); the better of parry and ward applies
//  armour      Armour Points on the location
//  bypassArmour, sunder   those Special Effects (Core pp.96, 100)
// Returns {blocked,blockedBy,afterParry,armour,absorbed,wound,armourLost}.
function resolveBlow({damage,attackSize,parry=null,wardSize=null,armour=0,bypassArmour=false,sunder=false}){
  let blocked=0,blockedBy=null;
  if(parry){
    blocked=parry.enhanced?damage:parryReduction(damage,attackSize,parry.size).blocked;
    blockedBy="parry";
  }
  const ward=wardSize==null?0:parryReduction(damage,attackSize,wardSize).blocked;
  if(ward>blocked){blocked=ward;blockedBy="ward";}
  const worn=bypassArmour&&!sunder?0:armour;
  const afterParry=Math.max(0,damage-blocked);
  const through=Math.max(0,afterParry-worn);
  return {blocked,blockedBy,afterParry,armour:worn,absorbed:Math.min(afterParry,worn),
    wound:sunder?0:through,armourLost:sunder?through:0};
}
// Core p.109: a location's wound level from its current and maximum HP.
function woundLevel(hp,max){
  if(hp>=max)return "ok";
  if(hp>0)return "minor";
  return hp>-max?"serious":"major";
}
// Core pp.109–110: what a Serious or Major Wound does once the opposed
// Endurance roll is known. Deadlines use the Healing Rate.
//  serious: resisted → still functional; failed → limb useless (a leg also
//           drops the victim prone), head/chest/abdomen → unconscious.
//  major:   limb → incapacitated and prone, conscious only if resisted;
//           elsewhere resisted → unconscious and dying, failed → dead.
function woundOutcome({level,limb,leg=false,resisted,healingRate:rate=1}){
  if(level==="major"){
    if(limb)return {outcome:"majorLimb",fightEnds:true,prone:true,conscious:!!resisted,deadline:{unit:"minutes",value:5*rate}};
    if(resisted)return {outcome:"majorDying",fightEnds:true,prone:false,conscious:false,deadline:{unit:"combat rounds",value:2*rate}};
    return {outcome:"majorDead",fightEnds:true,prone:false,conscious:false,deadline:null};
  }
  if(resisted)return {outcome:"resisted",fightEnds:false,prone:false,conscious:true,deadline:null};
  if(!limb)return {outcome:"unconscious",fightEnds:true,prone:false,conscious:false,deadline:null};
  return {outcome:"limbDisabled",fightEnds:false,prone:!!leg,conscious:true,deadline:null};
}
// Core p.96 Bash: knocked back 1m per 2 points of rolled damage (before any
// reduction) for a shield, per 3 for a bludgeoning weapon; only against a
// target of at most twice the attacker's SIZ.
function canBash(attackerSiz,targetSiz){return targetSiz<=attackerSiz*2;}
function bashDistance(damage,shield){return Math.floor(Math.max(0,damage)/(shield?2:3));}
// Core p.104 Knockback: damage before reductions above the target's SIZ
// throws them back 1m per 5 points (or part) of the excess.
function knockbackDistance(damage,siz){
  const excess=damage-siz;
  return excess>0?Math.ceil(excess/5):0;
}
// Core p.97 Impale: pulling the weapon out does half the weapon's rolled
// damage again; a Barbed weapon does it in full (Core p.61).
function withdrawalDamage(rolled,barbed){return Math.max(0,barbed?rolled:Math.ceil(rolled/2));}
// Core pp.97, 106 Damage Weapon: the weapon's own Armour Points resist; at
// zero Hit Points it breaks. Returns {lost,hp,broken}.
function strikeWeapon(damage,armourPoints,hitPoints){
  const lost=Math.max(0,damage-armourPoints),hp=Math.max(0,hitPoints-lost);
  return {lost,hp,broken:hp<=0};
}
// Core p.97 Disarm Opponent: each step of Size difference shifts the
// defender's Combat Style a difficulty grade (bigger disarming weapon: harder
// to resist). Only works on a foe of at most twice the disarmer's STR.
function canDisarm(disarmerStr,targetStr){return targetStr<=disarmerStr*2;}
function disarmResistSkill(style,ownSize,otherSize){
  const steps=ownSize-otherSize;
  const shift=steps>=3?.1:steps===2?.5:steps===1?2/3:steps===-1?1.5:steps<=-2?2:1;
  return Math.min(200,Math.max(1,Math.round(style*shift)));
}

/* ---------- Special Effects (Core pp.95–101, summary table p.100) ---------- */
// [id, name, role (o offensive, d defensive, b both), weapon restriction,
//  roll requirement, stackable]. Names and restrictions follow the table.
const SPECIAL_EFFECTS=[
  ["accidental","Accidental Injury","d","","Attacker Fumbles",0],
  ["arise","Arise","d","","",0],
  ["bash","Bash","o","Shields or Bludgeoning","",0],
  ["bleed","Bleed","o","Cutting Weapons","",0],
  ["blind","Blind Opponent","d","","Defender Criticals",0],
  ["bypassArmour","Bypass Armour","o","","Attacker Criticals",1],
  ["choose","Choose Location","o","","See Description",0],
  ["circumventCover","Circumvent Cover","o","Ranged Weapons","",0],
  ["circumventParry","Circumvent Parry","o","","Attacker Criticals",0],
  ["close","Close Range","b","","",0],
  ["compel","Compel Surrender","b","","",0],
  ["damageWeapon","Damage Weapon","b","","",0],
  ["disarm","Disarm Opponent","b","","",0],
  ["drop","Drop Foe","o","Ranged Weapons","",0],
  ["duck","Duck Back","o","Ranged Weapons","",0],
  ["enhance","Enhance Parry","d","","Defender Criticals",0],
  ["entangle","Entangle","b","Entangling Weapons","",0],
  ["flurry","Flurry","o","Unarmed","",1],
  ["forceFailure","Force Failure","b","","Opponent Fumbles",0],
  ["grip","Grip","o","Unarmed","",0],
  ["impale","Impale","o","Impaling Weapons","",0],
  ["killSilently","Kill Silently","o","Small Weapons","See Description",0],
  ["marksman","Marksman","o","Ranged Weapons","",0],
  ["maximize","Maximise Damage","o","","Attacker Criticals",1],
  ["open","Open Range","d","","",0],
  ["overextend","Overextend Opponent","d","","",1],
  ["overpenetration","Overpenetration","o","Ranged Weapons","Critical Only",0],
  ["pinDown","Pin Down","o","Ranged Weapons","",1],
  ["pinWeapon","Pin Weapon","b","","Critical Only",0],
  ["prepareCounter","Prepare Counter","d","","",1],
  ["press","Press Advantage","o","","",0],
  ["rapidReload","Rapid Reload","o","","",1],
  ["remise","Remise","o","Small Weapon Only","",0],
  ["scar","Scar Foe","b","","",0],
  ["selectTarget","Select Target","d","","Attacker Fumbles",0],
  ["slip","Slip Free","d","","Defender Criticals",0],
  ["standFast","Stand Fast","d","","",0],
  ["stun","Stun Location","o","Bludgeoning Weapons","",0],
  ["sunder","Sunder","o","Axes, Two Handed Weapons","",0],
  ["takeWeapon","Take Weapon","b","Unarmed","",0],
  ["trip","Trip Opponent","b","","",0],
  ["malfunction","Weapon Malfunction","o","Ranged Weapons","Attacker Fumbles",0],
  ["withdraw","Withdraw","d","","",0]
].map(([id,name,role,weapon,requirement,stackable])=>({id,name,
  offensive:role!=="d",defensive:role!=="o",weapon,requirement,stackable:!!stackable}));
const EFFECT_BY_ID=Object.fromEntries(SPECIAL_EFFECTS.map(e=>[e.id,e]));
function specialEffect(id){return EFFECT_BY_ID[id]||null;}
// Whether the winner's side of the exchange may use the effect at all.
function effectRoleAllows(effect,offense){return !!effect&&(offense?effect.offensive:effect.defensive);}
// The roll an effect needs (the table's "Specific Roll" column).
//  offense          the chooser was the attacker
//  critical         the chooser rolled a critical
//  ownFumble        the chooser fumbled
//  opponentFumble   the other side fumbled
//  withoutCritical  an exemption applies to "Critical Only" (Core p.61: an
//                   Entrapping weapon may Pin Weapon without one)
function effectRequirementMet(effect,{offense,critical,ownFumble=false,opponentFumble=false,withoutCritical=false}){
  const requirement=effect&&effect.requirement||"";
  if(requirement==="Attacker Criticals")return !!offense&&!!critical;
  if(requirement==="Defender Criticals")return !offense&&!!critical;
  if(requirement==="Critical Only")return !!critical||!!withoutCritical;
  if(requirement==="Opponent Fumbles")return !!opponentFumble;
  if(requirement==="Attacker Fumbles")return offense?!!ownFumble:!!opponentFumble;
  return true;
}
// The effects a melee winner may choose from, in table-independent menu
// order, as ids. c describes the exchange with plain values:
//  offense, attackGrade, defenceGrade (0–3, defenceGrade null if undefended),
//  reaction ('parry'|'evade'|'none'), parryTool ('weapon'|'shield'),
//  weaponTargeted, vsWeapon, isRemise, maximize, effectsLeft, forceFailure,
//  chosen (ids already picked), unstackable (ids a caller cannot repeat),
//  weapon {traits,size,shield,entrapping}  the chooser's own weapon
//  attackDice                               dice in the attacking weapon
//  actor  {siz,str,prone,canUseWeapon,pinned,entangled,legsEntangled}
//  target {siz,str,prone,disarmed,weaponIntact,pinned,canUseWeapon,hasShield,
//          entangled,armoured,disadvantaged}
//  disengaged, reach {active,engagement ('long'|'short'),ownerHasLonger}
function meleeEffectOptions(c){
  const offense=!!c.offense,actor=c.actor,target=c.target,weapon=c.weapon||{},traits=weapon.traits||[];
  const ownGrade=offense?c.attackGrade:c.defenceGrade,theirGrade=offense?c.defenceGrade:c.attackGrade;
  const roll={offense,critical:ownGrade===3,ownFumble:ownGrade===0,opponentFumble:theirGrade===0,withoutCritical:!!weapon.entrapping};
  const hit=c.attackGrade>=2,out=[];
  const add=id=>{
    const e=EFFECT_BY_ID[id];
    if(e&&effectRoleAllows(e,offense)&&effectRequirementMet(e,roll))out.push(id);
  };
  if(offense){
    if(hit&&!c.weaponTargeted&&!c.vsWeapon)add("choose");
    add("press");
    if(hit){
      if(traits.includes("bleed"))add("bleed");
      if(traits.includes("impale"))add("impale");
      if(traits.includes("bash")&&canBash(actor.siz,target.siz))add("bash");
      if(traits.includes("stun"))add("stun");
      if(traits.includes("entangle")&&!weapon.shield&&actor.canUseWeapon&&!c.weaponTargeted&&!c.vsWeapon&&!target.entangled)add("entangle");
    }
    if(hit&&traits.includes("sunder")&&target.armoured)add("sunder");
    if(weapon.size===1&&!c.isRemise)add("remise");
    add("bypassArmour");
    if(c.reaction==="parry"&&c.defenceGrade>=2)add("circumventParry");
    if((c.maximize||0)<c.attackDice)add("maximize");
  }else{
    add("overextend");
    if(actor.prone)add("arise");
    if(!c.disengaged&&!actor.legsEntangled)add("withdraw");
    if(c.reaction==="parry"&&c.parryTool!=="shield"&&traits.includes("entangle")&&actor.canUseWeapon&&!target.entangled)add("entangle");
    if(c.reaction==="parry"){add("enhance");add("blind");}
    add("standFast");
    add("accidental");
  }
  // Core p.97: Compel Surrender needs a helpless or disadvantaged foe.
  if(target.disadvantaged)add("compel");
  if(!target.pinned&&(target.canUseWeapon||target.hasShield))add("pinWeapon");
  add("prepareCounter");
  if(actor.pinned||actor.entangled)add("slip");
  if(!target.prone)add("trip");
  if(!target.disarmed&&target.weaponIntact&&canDisarm(actor.str,target.str))add("disarm");
  if(target.weaponIntact&&(!offense||hit))add("damageWeapon");
  add("scar");
  // Force Failure must be combined with another effect needing an opposed roll.
  if(c.effectsLeft>=2&&!c.forceFailure)add("forceFailure");
  const reach=c.reach;
  if(reach&&reach.active&&!actor.legsEntangled){
    if(reach.engagement==="long"&&!reach.ownerHasLonger)add("close");
    if(reach.engagement==="short"&&reach.ownerHasLonger)add("open");
  }
  const once=new Set(c.unstackable||[]),chosen=c.chosen||[];
  return out.filter(id=>(EFFECT_BY_ID[id].stackable&&!once.has(id))||!chosen.includes(id));
}
// Core pp.100–101 Trip Opponent: resisted with Brawn, Evade or Acrobatics.
function tripResistSkills(hasAcrobatics){return ["brawn","evade",...(hasAcrobatics?["acrobatics"]:[])];}

return {
  actionPoints,initiativeBonus,healingRate,locationHitPoints,
  DAMAGE_MODIFIER_STEPS,damageModifier,damageModifierValue,totalDamage,
  HUMAN_HIT_LOCATIONS,HUMAN_LOCATION_ORDER,hitLocation,hitLocationFaces,hitLocationRanges,hitPointsByLocation,isLimb,
  GRADE_VALUE,gradeRoll,opposedWins,opposedTargets,skillAtGrade,impaleGrades,
  effectsWon,
  SIZE_STEP,SIZE_NAMES,REACH_STEP,REACH_NAMES,parryReduction,crampedSize,
  resolveBlow,woundLevel,woundOutcome,canBash,bashDistance,knockbackDistance,withdrawalDamage,strikeWeapon,
  canDisarm,disarmResistSkill,
  SPECIAL_EFFECTS,specialEffect,effectRoleAllows,effectRequirementMet,meleeEffectOptions,tripResistSkills
};
})();
if(typeof module!=="undefined"&&module.exports)module.exports=CombatRules;
