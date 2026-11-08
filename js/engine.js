"use strict";
/* ================= ATTRIBUTE ENGINE (pure functions) ================= */
function apCalc(INT,DEX,fixed){if(fixed)return fixed;const v=INT+DEX;
  if(v<=12)return 1;if(v<=24)return 2;if(v<=36)return 3;return 3+Math.ceil((v-36)/12);}
function dmCalc(STR,SIZ){const v=STR+SIZ;for(const[m,l]of DM_TABLE){if(v<=m)return l;}
  const steps=Math.ceil((v-130)/10);return "+2d10+1d4 +"+steps+" step(s) (continue progression)";}
function xpMod(CHA){return CHA<=6?-1:Math.floor((CHA-7)/6);}
function healRate(CON){return CON<=6?1:Math.floor((CON-1)/6)+1;}
function luckPts(POW){return POW<=6?1:Math.floor((POW-1)/6)+1;}
function initBonus(INT,DEX){return Math.ceil((INT+DEX)/2);}
function hpLocs(CON,SIZ){const i=Math.max(1,Math.ceil((CON+SIZ)/5));
  return [["Head",i],["Chest",i+2],["Abdomen",i+1],["Each Arm",Math.max(1,i-1)],["Each Leg",i]];}
const HIT_D20=[["1-3","Right Leg"],["4-6","Left Leg"],["7-9","Abdomen"],["10-12","Chest"],["13-15","Right Arm"],["16-18","Left Arm"],["19-20","Head"]];

// Optional family tables, uploaded Mythras Core p.25 (visually verified).
// Resolve one d100 with an injected die function; retain every follow-up roll.
const FAMILY_TABLES={parents:"Parents",siblings:"Siblings",extended:"Extended family",reputation:"Family reputation",connections:"Family connections"};
function familyTableResult(table,roll,die=d){
  if(!Object.hasOwn(FAMILY_TABLES,table)||!Number.isInteger(roll)||roll<1||roll>100)return null;
  const dice=[];
  const take=sides=>{const value=die(sides);if(!Number.isInteger(value)||value<1||value>sides)throw new RangeError("Invalid family die");dice.push({sides,value});return value;};
  let summary="";
  if(table==="parents")summary=roll<=20?"Both parents living":roll<=40?"Single parent: father":roll<=60?"One birth parent and a stepparent":roll<=80?"Single parent: mother":"Both parents dead";
  if(table==="siblings")summary=roll<=10?"No siblings":take(roll<=30?4:roll<=70?6:roll<=90?8:10)+" sibling(s)";
  if(table==="extended"){
    const band=roll<=10?0:roll<=30?1:roll<=70?2:roll<=90?3:4;
    const g=band===0?0:take(band===1?2:3)+(band<=2?-1:band===4?1:0);
    const a=band===0?0:take([0,2,3,4,6][band]);
    const c=band===0?0:take([0,3,4,6,8][band]);
    summary=g+" grandparent(s); "+a+" aunt(s)/uncle(s); "+c+" cousin(s)";
  }
  if(table==="reputation"){
    if(roll<=15)summary="Poor reputation; "+take(3)+" enemies or rivals";
    else if(roll<=35)summary="Sound reputation, with hidden secrets; 1 enemy or rival";
    else if(roll<=65)summary="Sound reputation; no additional relationships";
    else if(roll<=85)summary="Good reputation, potentially vulnerable to scandal; 1 contact or ally";
    else summary="Excellent reputation; "+take(3)+" contacts or allies";
  }
  if(table==="connections"){
    const count=roll<=20?0:roll<=80?1:roll<=90?2:roll<=95?3:4;
    const reach=count===0?"No notable connections":count===1?"Community connections":count===2?"Local influence":count===3?"Regional influence":"National influence";
    const ties=Array.from({length:count},()=>["Ally","Contact","Enemy","Rival"][take(4)-1]);
    summary=reach+(ties.length?"; "+ties.join(", "):"");
  }
  return {roll,dice,summary};
}
// Core p.23 Marriage box. Compare the raw d100 with base Influence, not its trained value.
function marriageResult(roll,baseInfluence){
  if(!Number.isInteger(roll)||roll<1||roll>100||!Number.isSafeInteger(baseInfluence)||baseInfluence<0)return null;
  return {roll,baseInfluence,status:roll<=baseInfluence/10?"Married":roll<=baseInfluence?"Betrothed":"Neither married nor betrothed by this roll"};
}
function childrenResult(category,die=d){
  const bands={young:[1,4,0],adult:[1,4,0],middle:[2,6,15],senior:[3,6,25],old:[4,6,40]};
  if(!Object.hasOwn(bands,category))return null;
  const dice=[];const take=sides=>{const value=die(sides);if(!Number.isInteger(value)||value<1||value>sides)throw new RangeError("Invalid family die");dice.push({sides,value});return value;};
  const count=take(4)-1,ages=[];const [n,sides,add]=bands[category];
  for(let child=0;child<count;child++){let age=add;for(let i=0;i<n;i++)age+=take(sides);ages.push(age);}
  return {category,count,ages,dice};
}
function householdRollLines(community=S.community){
  const lines=[];const m=community?.marriageRoll,c=community?.childrenRoll;
  if(m)lines.push("Marital status — d100: "+m.roll+"; base Influence: "+m.baseInfluence+" → "+m.status);
  if(c)lines.push("Children (parent category: "+(AGE_MAP[c.category]?.label||c.category)+") — "+c.count+(c.count?"; ages: "+c.ages.join(", "):"")+"; "+c.dice.map(x=>"d"+x.sides+": "+x.value).join(", ")+(new Set(c.ages).size<c.ages.length?". Identical ages indicate twins or triplets.":""));
  return lines;
}
function familyRollLines(community=S.community){
  return Object.entries(FAMILY_TABLES).filter(([key])=>community?.rolls?.[key]).map(([key,label])=>{
    const r=community.rolls[key];return label+" — d100: "+r.roll+(r.dice.length?"; "+r.dice.map(x=>"d"+x.sides+": "+x.value).join(", "):"")+" → "+r.summary;
  });
}

// Advantage-aware wrappers (Pulp Hero / Paragon). Grade-easier Advantages
// (Endurance/Stealth/Willpower) and the doubled Healing Rate on Minor/Serious
// Wounds are deliberately NOT folded into a flat number here — Mythras
// Grades are a situational roll modifier, not a skill bonus, and this app
// has no wound-severity tracking yet, so a flat adjustment would be a guess
// rather than a rule. They're surfaced as flags/notes near the relevant
// value instead (see stepAttrs/characterSheetBody).
const hasAdv=key=>S.archetype!=="ordinary"&&S.archAdvantages.includes(key);
function apFinal(INT,DEX,fixed){let v=apCalc(INT,DEX,fixed);if(hasAdv("ap"))v+=1;return v;}
function luckFinal(POW){let v=luckPts(POW);if(hasAdv("luck"))v+=(S.archetype==="paragon"?2:1);return v;}
function hpLocsFinal(CON,SIZ){const base=hpLocs(CON,SIZ);if(!hasAdv("hp"))return base;
  const bonus=S.archetype==="paragon"?2:1;return base.map(([l,v])=>[l,v+bonus]);}

// Grade math: shift one step toward Very Easy (used for the Pulp/Paragon
// Endurance/Stealth/Willpower "one Grade easier" Advantages), then apply the
// resulting grade's multiplier to a base skill %.
function shiftGradeEasier(g,n){const i=GRADE_ORDER.indexOf(g);return i===0?g:GRADE_ORDER[Math.max(1,i-(n==null?1:n))];}
// Shifting harder can reach Hopeless (the step past Herculean) but never
// wraps round to Automatic, mirroring shiftGradeEasier's floor at Very Easy.
function shiftGradeHarder(g,n){const i=GRADE_ORDER.indexOf(g);return GRADE_ORDER[Math.min(GRADE_ORDER.length-1,i+(n==null?1:n))];}
const gradeHardness=g=>GRADE_ORDER.indexOf(g);

/* ---- Conditions that make rolls harder: Encumbrance and Fatigue ----
   Both of these were computed and displayed but never reached an actual roll.
   They meet here, in the one function every % readout and every roll button
   already goes through (gradeForEntry -> gradedPct).

   Encumbrance (core rulebook, Encumbrance section): over STR x2 "Burdened"
   makes skills that use STR or DEX — Combat Styles included — one Grade
   harder; over STR x3 "Overloaded" makes them two Grades harder. For
   competing penalties we interpret these from Standard as Hard and
   Formidable, and use the hardest applicable grade (Core pp.38,77,79).
   Fatigue applies to all skills; encumbrance only to STR/DEX skills. */
function skillUsesStrDex(key){
  const e=entryMap()[key];
  const f=(e&&e.formula)||"";
  return /STR|DEX/.test(f);
}
// 0 / 1 / 2 Grade steps from carried weight, or null when characteristics
// aren't set yet. Only STR/DEX-based skills are affected.
function encGradeSteps(key){
  const st=encStatus();
  if(!st||st.level==="ok")return 0;
  if(!skillUsesStrDex(key))return 0;
  return st.steps||0;
}
function fatigueRow(){return FATIGUE_MAP[(S.play&&S.play.fatigue)||"Fresh"]||FATIGUE_MAP.Fresh;}
// Core p.79: Comatose means no activities are possible, and Dead is its own
// state, not just a Hopeless Grade like Semi-Conscious.
function fatigueNoActivity(){const n=fatigueRow().name;return n==="Comatose"?"Comatose: no activities are possible (Core p.79).":n==="Dead"?"Dead: the character can take no actions.":null;}
// Core p.108: grade steps for distance and target SIZ (independent of the
// weapon's own Range). Returns {steps, extrapolated} or null for input the
// table doesn't cover (distance under 1m, SIZ under 1 or over 300). Beyond
// 140m the book says "follow table progression"; we continue each column at
// one step per 40m, as the printed rows do, and flag it for the GM.
function rangeSizeSteps(distance,siz){
  const d=Number(distance),z=Number(siz);
  if(!Number.isFinite(d)||!Number.isFinite(z)||d<1||z<1||z>300)return null;
  const col=RANGE_SIZ_BANDS.findIndex(([lo,hi])=>z>=lo&&z<=hi);
  const row=Math.ceil(d/20)-1;
  if(row<RANGE_DISTANCE_TABLE.length)return {steps:RANGE_DISTANCE_TABLE[row][col],extrapolated:false};
  const last=RANGE_DISTANCE_TABLE.length-1,extra=row-last;
  return {steps:RANGE_DISTANCE_TABLE[last-(extra%2)][col]+Math.ceil(extra/2),extrapolated:true};
}
function fatigueGradeFloor(){const r=fatigueRow();return r&&r.grade?r.grade:null;}
function gradeForEntry(key){
  let g=ACTIVE_GRADE;
  const advKey=GRADE_EASIER_ADV[key];
  if(advKey&&hasAdv(advKey))g=shiftGradeEasier(g);
  const steps=encGradeSteps(key);
  if(steps>0){const encGrade=shiftGradeHarder("standard",steps);if(gradeHardness(encGrade)>gradeHardness(g))g=encGrade;}
  const floor=fatigueGradeFloor();
  if(floor&&gradeHardness(floor)>gradeHardness(g))g=floor;
  return g;
}
// Everything currently making a given skill's Grade differ from the Active
// Grade, as short labelled reasons — so the sheet and Play Mode can say WHY a
// number moved instead of silently showing a different percentage.
function gradeReasons(key){
  const out=[];
  const advKey=GRADE_EASIER_ADV[key];
  if(advKey&&hasAdv(advKey)&&shiftGradeEasier(ACTIVE_GRADE)!==ACTIVE_GRADE)out.push({dir:"easier",text:ARCHETYPES[S.archetype].label+" Advantage: one Grade easier"});
  const steps=encGradeSteps(key);
  if(steps>0){const st=encStatus();
    out.push({dir:"harder",text:st.label+": "+steps+" Grade"+(steps>1?"s":"")+" harder (STR/DEX skill)"});}
  const floor=fatigueGradeFloor();
  if(floor)out.push({dir:"harder",text:"Fatigue ("+fatigueRow().name+"): rolls are "+GRADE_LABEL[floor]});
  return out;
}

/* ---- Movement Rate ----
   Was the hardcoded string "6m" in five separate places. Base comes from the
   species template (core rulebook: "Movement is not calculated from
   Characteristics but is a default value which differs from species to
   species. The base Movement Rate for humans is 6 metres"), then Fatigue and
   Encumbrance modify it. */
function moveBase(){const sp=speciesDef();return sp&&sp.move!=null?sp.move:6;}
function moveRate(){
  let m=moveBase();const notes=[];let immobile=false,noSprint=false,walkOnly=false;
  const f=fatigueRow();
  if(f&&f.move!=null){
    if(f.move==="immobile"||f.move==="none"){immobile=true;m=0;notes.push("Fatigue ("+f.name+"): immobile");}
    else if(f.move==="half"){m=m/2;notes.push("Fatigue ("+f.name+"): Movement halved");}
    else {m=m+f.move;notes.push("Fatigue ("+f.name+"): "+f.move+"m");}
  }
  const st=encStatus();
  if(st&&st.level!=="ok"){
    if(st.level==="warn"){m=m-2;noSprint=true;notes.push("Burdened: -2m, no sprinting");}
    else {m=m/2;walkOnly=true;notes.push("Overloaded: Movement halved, walk only");}
  }
  m=Math.max(0,Math.round(m*2)/2);
  return {base:moveBase(),m,notes,immobile,noSprint,walkOnly};
}
// Gaits (core rulebook; restated in the Imperative SRD's Community Errata):
// Run is Move x3, Sprint is Move x5. Sprinting is unavailable while Burdened
// and everything above a walk is unavailable while Overloaded.
function moveGaits(){
  const r=moveRate();
  // Core p.39: each full 25% Athletics adds 0.5m to the base
  // running rate or 1m to the base sprinting rate, before multipliers.
  const athletics=Math.max(0,finalPct("std:Athletics"));
  const steps=Math.floor(athletics/25);
  const armour=typeof armourPenaltyToInit==="function"?armourPenaltyToInit():0;
  return {walk:r.m,run:(r.immobile||r.walkOnly)?null:Math.max(0,(r.m+steps*0.5)*3-armour),
    sprint:(r.immobile||r.walkOnly||r.noSprint)?null:Math.max(0,(r.m+steps)*5-armour),info:r};
}
const moveText=()=>{const r=moveRate();return r.immobile?"0m":(r.m+"m");};

/* ---- Height & Weight ----
   Was a one-line reminder on the Concept step ("read them off the Height &
   Weight table from SIZ and frame") that never computed anything. Now derived
   from SIZ, species and build per the model documented at HW_ANCHORS, and
   overridable — S.concept.heightM / weightKg, when set, win outright, so
   anyone working from the printed table can just type the book's figure in
   and have it flow to the sheet and the export like any other value. */
function heightWeight(){
  if(!charsReady())return null;
  const spKey=(speciesDef()&&speciesDef().key)||"human";
  const a=HW_ANCHORS[spKey]||HW_ANCHORS.human;
  const avgSiz=(SPECIES_MAP[spKey]||SPECIES_MAP.human).avg.SIZ;
  const build=BUILD_FACTORS[S.concept.frame]||1;
  const siz=S.chars.SIZ;
  let derivedM=a.heightAt*Math.pow(siz/avgSiz,1/3)*build;
  let derivedKg=a.massPerSiz*siz;
  let ranges=null;
  if(spKey==="human" && Number.isInteger(siz) && siz>=1){
    // Core p.9. Use the midpoint as a convenient default; players may select
    // any value in the printed range or retain a previously entered override.
    const heights=[[1,45],[46,80],[81,105],[106,120],[121,130],[131,140],[141,150]];
    const height=siz<=7?heights[siz-1]:[151+5*(siz-8),155+5*(siz-8)];
    const frame=S.concept.frame||"Medium";
    const factor=frame==="Lithe"?5:frame==="Heavy"?9:7;
    const weight=[factor*(siz-1)+1,factor*siz];
    ranges={height,weight};
    derivedM=(height[0]+height[1])/200;
    derivedKg=(weight[0]+weight[1])/2;
  }
  const om=parseFloat(S.concept.heightM), ok=parseFloat(S.concept.weightKg);
  const m=Number.isFinite(om)&&om>0?om:derivedM;
  const kg=Number.isFinite(ok)&&ok>0?ok:derivedKg;
  return {m:Math.round(m*100)/100,kg:Math.round(kg),
    derivedM:Math.round(derivedM*100)/100,derivedKg:Math.round(derivedKg),
    overriddenH:m!==derivedM,overriddenW:kg!==derivedKg,
    ft:mToFtIn(m),lb:Math.round(kg*2.2046),species:spKey,build:S.concept.frame||"Medium",ranges};
}
function mToFtIn(m){const totalIn=Math.round(m*39.3701);return Math.floor(totalIn/12)+"&prime;"+(totalIn%12)+"&Prime;";}
// Imperial for the two personal-body stats (feet/inches, pounds) -- unlike
// Movement, which stays in metres because that's a core Mythras mechanic
// (encounter distances, the Movement Rate table) rather than a personal
// stat a player thinks about in book units.
function heightWeightText(){const hw=heightWeight();
  return hw?(hw.ft+" / "+hw.lb+" lb"):"—";}
function gradedPct(key,basePct){
  const g=gradeForEntry(key);const mult=GRADE_MULT[g];
  return mult==null?{pct:null,grade:g}:{pct:Math.max(0,Math.round(basePct*mult)),grade:g};
}
function sorceryInvocationGrade(key,basePct,extra){
  const grade=shiftGradeHarder(gradeForEntry(key),extra),mult=GRADE_MULT[grade];
  return {grade,pct:mult==null?null:Math.max(0,Math.round(basePct*mult))};
}
// Reference table for the on-demand Difficulty Grade popover in Play Mode —
// every Grade's effect on one skill's % at a glance, independent of whatever
// ACTIVE_GRADE is currently set. Automatic/Hopeless have no %, just a note.
function gradeRefRows(key){
  const base=finalPct(key);
  return GRADES.map(([g,label])=>{
    const mult=GRADE_MULT[g];
    const text=mult==null?(g==="automatic"?"no roll":"can't attempt"):(Math.max(0,Math.round(base*mult))+"%");
    return {g,label,text};
  });
}

/* ================= SUCCESS TIERS (core, Skills chapter) ================= */
function resolveRoll(roll,skill,tierSkill=skill){
  const crit=Math.max(0,Math.ceil(tierSkill/10));
  const fumble=tierSkill>100?(roll===100):(roll>=99);
  if(fumble)return "Fumble";
  if(roll>=96)return "Failure";           // 96-00 always fails
  if(roll<=crit)return "Critical";        // 1/10 of skill, round up
  if(roll<=5)return "Success";            // 01-05 always succeeds
  return roll<=skill?"Success":"Failure";
}
const d=n=>1+Math.floor(Math.random()*n);
const d100=()=>d(100);

/* ================= STATE ================= */
let S=freshState();
function freshState(){return {
 step:0, overrides:{},
 creationMode:"full", archetype:"ordinary", archAdvantages:[],
 // null = plain human on the core rulebook's own dice. A key into SPECIES_MAP
 // swaps in that species' characteristic dice, bounds, Movement Rate and
 // traits (see the Species step).
 species:null,
 // Age band (Experience Table). `years` is the rolled or typed age; `events`
 // holds generated Life Events and whether each has been applied.
 age:{category:"adult",years:null,events:[],coreEvents:[]},
 // Magic the character actually knows. `folk` holds Folk Magic spell names
 // (plus a speciality for Find (X)); `known` holds entries for the four
 // traditions whose content lives in the player's own rulebook. `devotional`
 // is the Magic Points a theist has invested in their Devotional Pool, and
 // `devotionalUsed` how much of it is currently spent.
 magic:{folk:[],known:[],devotional:0,devotionalUsed:0,devotionalCult:"",extraPools:[]},
 campaignId:null, _libId:null, _libLastSaved:null,
 // True whenever this character's data came from somewhere not yet
 // verified as belonging to whoever is currently signed in -- the autosave
 // slot, a "local" My-Characters entry, or a JSON import. false here (a
 // brand-new, blank character, or one already explicitly saved under the
 // current account) is what allows the debounced background cloud push to
 // silently create a row for it; see saveToLibraryUnified()/
 // scheduleCloudPush() in cloud.js. Never rely on a loaded blob's own
 // stored value for this — every place that loads a character sets it
 // explicitly based on where the data actually came from, not on
 // whatever it happened to be the last time this exact JSON was saved.
 _pendingClaim:false,
 // heightM / weightKg are optional hand-typed overrides — blank means "use
 // the figure derived from SIZ, species and build" (see heightWeight()).
 concept:{name:"",player:"",gender:"",age:"",frame:"Medium",handed:"Right",homeland:"",notes:"",heightM:"",weightKg:"",portrait:""},
 chars:{STR:null,CON:null,SIZ:null,DEX:null,INT:null,POW:null,CHA:null},
 charMode:"roll", poolA:[], poolB:[], assignA:{}, assignB:{}, fixedAP:0,
 culture:null, cultChoice:[], cultProf:[null,null,null], cultProfSpec:["","",""],
 cultStyleOn:false, cultStyleName:"", cultStyleSmallAlloc:true,
 // Combat Style composition — weapons and Combat Style Traits attached to
 // each named style, keyed by the same style key stylesList()/S.alloc
 // already use ("style:cult", "style:k"+i, "style:quick"). Kept separate
 // from the style's name/allocation (which drive the %) since a style can
 // be renamed or reslotted without losing what's been built into it.
 styleDefs:{},
 career:null, carProf:[null,null,null], carProfSpec:["","",""], carStyles:[],
 customCareer:{isCustom:false,name:"",std:[],prof:[],styleSlots:0},
 hobby:null, hobbySpec:"",
 cultMembership:{archetype:null,name:"",rank:0},
 community:{family:"",parents:"",siblings:"",reputation:"",connections:[],partyTie:"",resources:"",rolls:{},household:""},
 _creationFlowVersion:2,
 qProf:[null,null,null], qProfSpec:["","",""], qStyleOn:false, qStyleName:"",
 alloc:{culture:{},career:{},bonus:{},quick:{}},
 passions:[],
 money:{dice:[],mod:1,socialClass:"",spent:0,eventAdjustment:0,quickMult:50},
 inventory:[],
 gearWeapons:[],
 armorSubstance:{},
 armor:{Head:"None",Chest:"None",Abdomen:"None","Each Arm":"None","Each Leg":"None"},
 rollLog:[],
 // Play Mode — session-to-session tracking, separate from the static
 // character-gen numbers above. Deliberately simple: current values only,
 // per-character (not per-campaign-session), every reset is a manual button
 // press rather than an automatic rule (real end-of-session/end-of-round
 // bookkeeping is a GM call, not something to guess at here). hp/luck/magic
 // start at null, meaning "at max" — they're only written once the player
 // actually spends/takes damage, so a freshly-finished character always
 // shows full without needing an extra initialization step.
 play:{hp:{},hpMaxOverride:{},woundEvents:[],luck:null,magic:null,apUsed:0,tab:"skills",fatigue:"Fresh",selectedLoc:null,sorceryCasting:null,mysticismCasting:null,theismCasting:null,initiative:null,surprised:false,pinned:[]},
 // Experience Rolls (core rulebook pp.71-73, cross-checked against the
 // Mythras Core pp.71–72, checked against the uploaded rulebook — see audit for
 // citations). pool = banked, unspent Experience Rolls. fumbled = skill
 // keys currently flagged for their free +1% (auto-set on a Fumble roll in
 // Play Mode, or toggled by hand), cleared once applied. bonus = cumulative
 // % gained per skill key from this system, folded into finalPct() so every
 // existing display (skill list, sheet, roll log) picks it up automatically.
 // Legacy usedThisRun is retained for save compatibility and no longer limits improvement.
 xp:{characteristics:{permanent:{},training:[]},pool:0,fumbled:[],bonus:{},usedThisRun:[],history:[],checked:[],learnedProfs:[],trainingPending:[]}
};}
function normalizeState(){
  S.concept=S.concept||{};
  if(typeof S.concept.portrait!=="string"||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]{1,200000}$/.test(S.concept.portrait))S.concept.portrait="";
  // Defensive coercion only -- every actual load path (openCharToPlay/Edit/
  // Sheet, fromMenuContinue, import) sets the real value explicitly right
  // after calling this, based on where the data came from. This just keeps
  // the field boolean if something ever skips that.
  S._pendingClaim=!!S._pendingClaim;
  // Migrate wizard navigation without shifting the meaning of saved steps.
  // Update 05 inserts Community immediately before Passions in both modes.
  if((S._creationFlowVersion||1)<2){
    const insertedAt=S.creationMode==="quick"?4:6;
    if(Number.isInteger(S.step)&&S.step>=insertedAt)S.step++;
    const old=S.overrides||{};S.overrides={};
    Object.entries(old).forEach(([key,value])=>{const n=Number(key);if(Number.isInteger(n))S.overrides[n>=insertedAt?n+1:n]=value;});
    S._creationFlowVersion=2;
  }
  S.community=S.community||{};
  for(const key of ["family","parents","siblings","reputation","partyTie","resources","household"]){
    if(typeof S.community[key]!=="string")S.community[key]="";
  }
  // Only retain reproducible table records. Old/manual narrative fields remain intact.
  const familyRolls={};
  for(const key of Object.keys(FAMILY_TABLES)){
    const old=S.community.rolls?.[key];if(!old||!Array.isArray(old.dice))continue;
    let next=0;
    try{const result=familyTableResult(key,old.roll,sides=>{const x=old.dice[next++];return x?.sides===sides?x.value:NaN;});
      if(result&&next===old.dice.length)familyRolls[key]=result;
    }catch(e){/* malformed optional roll record */}
  }
  if(S.community.marriageRoll){const m=S.community.marriageRoll;S.community.marriageRoll=marriageResult(m.roll,m.baseInfluence);}
  if(S.community.childrenRoll){
    const old=S.community.childrenRoll;let next=0;S.community.childrenRoll=null;
    try{const result=childrenResult(old.category,sides=>{const x=old.dice?.[next++];return x?.sides===sides?x.value:NaN;});if(result&&next===old.dice?.length)S.community.childrenRoll=result;}catch(e){/* malformed optional roll */}
  }
  S.community.rolls=familyRolls;
  S.community.connections=Array.isArray(S.community.connections)?S.community.connections.filter(x=>x&&typeof x==="object"):[];
  S.community.connections=S.community.connections.map(x=>({type:["Ally","Contact","Rival","Enemy"].includes(x.type)?x.type:"Contact",name:String(x.name||"").slice(0,160),notes:String(x.notes||"").slice(0,1000)}));
  if(S.cultStyleSmallAlloc===undefined)S.cultStyleSmallAlloc=true; // existing guests keep requested Sit’ota style allocation behavior
  S.alloc=S.alloc||{};S.alloc.culture=S.alloc.culture||{};S.alloc.career=S.alloc.career||{};
  S.gearWeapons=S.gearWeapons||[];
  S.armor=S.armor||{};
  for(const [loc,old] of [["Right Arm","Each Arm"],["Left Arm","Each Arm"],["Right Leg","Each Leg"],["Left Leg","Each Leg"]])
    if(S.armor[loc]==null)S.armor[loc]=S.armor[old]||"None";
  ARMOR_LOCATIONS.forEach(l=>{if(!S.armor[l])S.armor[l]="None";});
  S.alloc.bonus=S.alloc.bonus||{};S.alloc.quick=S.alloc.quick||{};
  S.creationMode=S.creationMode||"full";S.archetype=S.archetype||"ordinary";
  if(S.fixedAP==null)S.fixedAP=0;
  if(S.species===undefined)S.species=null;
  S.age=S.age||{category:"adult",years:null,events:[]};
  if(!AGE_MAP[S.age.category])S.age.category="adult";
  S.age.events=S.age.events||[];
  S.age.coreEvents=Array.isArray(S.age.coreEvents)?S.age.coreEvents.filter(e=>e&&typeof e==='object'&&!Array.isArray(e)).map(e=>({roll:e.roll,summary:String(e.summary||'').slice(0,500)})):[];
  S.age.coreEventsSkipped=S.age.coreEventsSkipped===true;
  if(!Array.isArray(S.age.ageingEvents))S.age.ageingEvents=[];
  S.magic=S.magic||{folk:[],known:[],devotional:0,devotionalUsed:0};
  S.magic.folk=S.magic.folk||[];S.magic.known=S.magic.known||[];
  // Legacy versions stored Sorcery shaping as an array of selected names.
  // Preserve those records, upgrading each selected component to one point.
  for(const m of S.magic.known){
    if(m.tradition==="sorcery"){
      if(!m.shapingLevels || typeof m.shapingLevels!=="object"){
        m.shapingLevels={};for(const name of (Array.isArray(m.shapings)?m.shapings:[]))m.shapingLevels[name]=1;
      }
      m.combineExtra=Math.max(0,Math.floor(Number(m.combineExtra)||0));
    }
    if(m.tradition==="animism"){
      // Older records had no binding status. Do not silently assume the spirit
      // is bound: an explicit GM/player confirmation is required.
      if(!["bound","unbound"].includes(m.spiritStatus))m.spiritStatus="unbound";
      if(!Number.isSafeInteger(m.intensity)||m.intensity<1)m.intensity=1;
      if(!["unknown","located","contacted"].includes(m.spiritContact))m.spiritContact="unknown";
      if(!["friendly","neutral","hostile"].includes(m.spiritAttitude))m.spiritAttitude="neutral";
      if(!["none","fetish","location","creature"].includes(m.bindingType))m.bindingType="none";
      if(!Number.isSafeInteger(m.spiritMP)||m.spiritMP<0||m.spiritMP>999)m.spiritMP=null;
      m.spiritCombatNote=String(m.spiritCombatNote||"").slice(0,800);
      if(!["bargain","combat"].includes(m.spiritAcquired))m.spiritAcquired="";
    }
    if(m.tradition==="sorcery"){
      // MAG-N02: which other recorded spells a Combine casting joins, and the
      // player's confirmation that they share target(s). Never inferred.
      m.combinedSpells=Array.isArray(m.combinedSpells)?m.combinedSpells.map(x=>String(x||"").slice(0,120)).slice(0,20):[];
      m.combineSharedTargets=m.combineSharedTargets===true;
      if(m.invocationKey!=null&&typeof m.invocationKey!=="string")delete m.invocationKey;
    }
    if(m.tradition==="mysticism"){
      // MAG-N04: a recorded Talent is not learned until the GM confirms it.
      m.talentLearned=m.talentLearned===true;
      m.active=!!m.active;
      m.durationTurns=Number.isInteger(Number(m.durationTurns))&&Number(m.durationTurns)>=0?Number(m.durationTurns):0;
      m.remainingTurns=m.active&&Number.isInteger(Number(m.remainingTurns))&&Number(m.remainingTurns)>=0?Number(m.remainingTurns):0;
    }
  }
  if(typeof S.magic.devotional!=="number")S.magic.devotional=0;
  if(typeof S.magic.devotionalUsed!=="number")S.magic.devotionalUsed=0;
  normalizeDevotionalPools();
  if(!Object.hasOwn(ANIMIST_RANK_FRACTION,S.magic.animistRank))S.magic.animistRank="";
  if(!Number.isSafeInteger(S.magic.boundLimitGM)||S.magic.boundLimitGM<0)delete S.magic.boundLimitGM;
  if(S.concept&&S.concept.heightM===undefined)S.concept.heightM="";
  if(S.concept&&S.concept.weightKg===undefined)S.concept.weightKg="";
  S.archAdvantages=S.archAdvantages||[];
  S.qProf=S.qProf||[null,null,null];S.qProfSpec=S.qProfSpec||["","",""];
  S.qStyleOn=!!S.qStyleOn;S.qStyleName=S.qStyleName||"";
  S.styleDefs=S.styleDefs||{};
  S.cultMembership=S.cultMembership||{archetype:null,name:"",rank:0};
  if(typeof S.cultMembership.rank!=="number")S.cultMembership.rank=0; // migrate old string ranks
  if(S.money&&S.money.quickMult==null)S.money.quickMult=50;
  // Older applied wealth events could leave a negative spending balance.
  S.money.eventAdjustment??=0;
  if(S.money.eventAdjustment===0&&Number.isFinite(S.money.spent)&&S.money.spent<0&&
     S.age.events.some(ev=>ev?.applied&&ev.effect?.type==="silver")){
    S.money.eventAdjustment=-S.money.spent;
    S.money.spent=0;
  }
  S.play=S.play||{hp:{},luck:null,magic:null,apUsed:0,tab:"skills",fatigue:"Fresh",selectedLoc:null};
  S.play.hp=S.play.hp||{};
  if(!S.play.hpMaxOverride||typeof S.play.hpMaxOverride!=="object"||Array.isArray(S.play.hpMaxOverride))S.play.hpMaxOverride={};
  if(!Array.isArray(S.play.woundEvents))S.play.woundEvents=[];
  // A multi-turn invocation is a manual tracker, never an automatic spell effect.
  if(S.play.sorceryCasting && (!Number.isInteger(S.play.sorceryCasting.index) ||
      !Number.isInteger(S.play.sorceryCasting.completed) ||
      !Number.isInteger(S.play.sorceryCasting.total) ||
      S.play.sorceryCasting.completed<1 ||
      S.play.sorceryCasting.total<2 ||
      S.play.sorceryCasting.completed>=S.play.sorceryCasting.total))S.play.sorceryCasting=null;
  const mc=S.play.mysticismCasting;
  if(mc && (!Number.isInteger(mc.index)||mc.index<0||!Number.isInteger(mc.completed)||!Number.isInteger(mc.total)||mc.completed<1||mc.total<2||mc.completed>=mc.total||typeof mc.signature!=="string"))S.play.mysticismCasting=null;
  const tc=S.play.theismCasting;
  if(tc && (!Number.isInteger(tc.index)||tc.index<0||!Number.isInteger(tc.completed)||!Number.isInteger(tc.total)||tc.completed<1||tc.total<2||tc.completed>=tc.total||typeof tc.signature!=="string"))S.play.theismCasting=null;
  if(typeof S.play.apUsed!=="number")S.play.apUsed=0;
  if(!S.play.tab)S.play.tab="skills";
  if(!FATIGUE_MAP[S.play.fatigue])S.play.fatigue="Fresh";
  if(!Number.isFinite(S.play.apUsed)||S.play.apUsed<0)S.play.apUsed=0;
  if(!Number.isFinite(S.play.luck)||S.play.luck<0)S.play.luck=null;
  if(!Number.isFinite(S.play.magic)||S.play.magic<0)S.play.magic=null;
  for(const [loc,hp] of Object.entries(S.play.hp)){
    if(!Number.isFinite(hp))delete S.play.hp[loc];
  }
  if(S.play.selectedLoc===undefined)S.play.selectedLoc=null;
  // Renamed Core traits (e.g. Skirmisher -> Skirmishing, Core p.89).
  if(S.styleDefs&&typeof S.styleDefs==="object")for(const d of Object.values(S.styleDefs)){
    if(d&&Array.isArray(d.traits))d.traits=[...new Set(d.traits.map(t=>TRAIT_RENAMES[t]||t))];}
  // Pinned skills (Play Mode): keys only, unique, capped so a bad save can't bloat the sheet.
  S.play.pinned=Array.isArray(S.play.pinned)?[...new Set(S.play.pinned.filter(k=>typeof k==="string"&&k.length<200))].slice(0,30):[];
  S.play.surprised=S.play.surprised===true;
  S.play.giftKnown=Array.isArray(S.play.giftKnown)?S.play.giftKnown.filter(x=>typeof x==="string"&&/^[a-z0-9]{4,40}$/.test(x)).slice(-200):[];
  const ini=S.play.initiative;
  if(!ini||!Number.isInteger(ini.roll)||ini.roll<1||ini.roll>10||!Number.isInteger(ini.bonus)||ini.total!==ini.roll+ini.bonus)S.play.initiative=null;
  S.xp=S.xp||{pool:0,fumbled:[],bonus:{},usedThisRun:[],history:[],checked:[]};
  S.xp.fumbled=S.xp.fumbled||[];S.xp.bonus=S.xp.bonus||{};
  S.xp.usedThisRun=S.xp.usedThisRun||[];S.xp.history=S.xp.history||[];
  S.xp.checked=S.xp.checked||[];
  if(!Array.isArray(S.xp.learnedProfs))S.xp.learnedProfs=[];
  if(!Array.isArray(S.xp.trainingPending))S.xp.trainingPending=[];
  if(typeof S.xp.pool!=="number")S.xp.pool=0;
  if(!S.xp.characteristics||typeof S.xp.characteristics!=="object")S.xp.characteristics={permanent:{},training:[]};
  const adv=S.xp.characteristics;
  if(!adv.permanent||typeof adv.permanent!=="object"||Array.isArray(adv.permanent))adv.permanent={};
  if(!Array.isArray(adv.training))adv.training=[];
}
// Cult & Community is temporarily pulled out of the flow (user's own call,
// to revisit later) — stepCult() and all its supporting data/functions are
// left intact below, just not wired into currentSteps()/stepFns(), so it's
// a one-line change in each array to bring back.
function currentSteps(){
  return S.creationMode==="quick"
   ?["Concept","Characteristics","Attributes","Quick Skills","Community","Passions","Magic","Money & Gear","Finish"]
   :["Concept","Characteristics","Attributes","Culture","Career","Bonus Skills","Community","Passions","Magic","Money & Gear","Finish"];
}
function stepFns(){
  return S.creationMode==="quick"
   ?[stepConcept,stepChars,stepAttrs,stepQuickSkills,stepCommunity,stepPassions,stepMagic,stepMoney,stepFinish]
   :[stepConcept,stepChars,stepAttrs,stepCulture,stepCareer,stepBonus,stepCommunity,stepPassions,stepMagic,stepMoney,stepFinish];
}
function ageBand(){return AGE_MAP[(S.age&&S.age.category)||"adult"]||AGE_MAP.adult;}
// Core p.34 gives human age categories as dice expressions. Non-human
// lifespans require GM-defined ranges, so do not impose human ranges there.
function ageRangeIssue(){
  const age=S.age.years;
  if(age==null||age==="")return null;
  if(!Number.isInteger(age)||age<0)return "Enter a non-negative whole number for age.";
  if(S.species&&S.species!=="human")return null;
  const band=ageBand(),min=band.base+band.n,max=band.base+6*band.n;
  return age<min||age>max?band.label+" normally covers ages "+min+"–"+max+". Change the age or category, or record the GM's exception.":null;
}
function ageRangeKey(){return JSON.stringify([S.species||"human",S.age.category,S.age.years]);}
function ageRangeApproved(){return S.age.rangeApproval===ageRangeKey();}
// Core pp.34,70–71 distinguish creation categories from human ageing bands.
function humanAgeingInfo(){
  if(S.species&&S.species!=="human")return null;
  const age=Number(S.age.years);
  if(S.age.years==null||!Number.isInteger(age)||age<40)return null;
  const band=age>=90?["Dotage","Hopeless"]:age>=80?["Advanced Old Age","Herculean"]:age>=70?["Old Age","Formidable"]:age>=60?["Late Middle Age","Hard"]:age>=50?["Middle Age","Standard"]:["Early Middle Age","Easy"];
  return {label:band[0],grade:band[1],age};
}
function ageingReviewKey(){return JSON.stringify([S.species||"human",S.age.category,S.age.years]);}
function coreBackgroundRollCount(){return Math.max(0,AGE_CATEGORIES.findIndex(a=>a.key===ageBand().key));}
function coreBackgroundRollsValid(){return S.age.coreEventsSkipped||(S.age.coreEvents||[]).length===coreBackgroundRollCount();}
function coreBackgroundLines(){
  const lines=S.age.coreEventsSkipped?['Optional Background Events skipped; any saved results below are retained notes.']:[];
  for(const [i,e] of (S.age.coreEvents||[]).entries())if(e)lines.push('Core Background Event '+(i+1)+' — d100: '+e.roll+'; '+(String(e.summary||'').trim()||'Result awaiting player / GM review.'));
  return lines;
}
// Bonus Skill Points now come from the Experience Table's age band rather than
// a hardcoded 150/15. Adult is 150/+15, which is exactly what was hardcoded,
// so nothing changes for a default character.
//
// Composing age with the Pulp/Paragon tiers: the tier's extra points are
// additive (the Companion describes them as an addition to the character's
// bonus points). For the cap, note that ARCHETYPES.ordinary.bonusCap is 15
// only because 15 *is* the Adult row of the Experience Table — it is not a
// tier permission, so an Ordinary character takes their age band's cap
// unmodified (a Young Ordinary character is capped at +10, not +15). Pulp and
// Paragon do genuinely raise the ceiling, and since both numbers are
// permissions rather than penalties the more generous one wins: a Senior Pulp
// Hero gets 250+50 points at a cap of 25 (the age band's, above Pulp's 20),
// while a Paragon of any age keeps 40.
function bonusPool(){return ageBand().bonus+(ARCHETYPES[S.archetype].bonusExtra||0);}
function bonusCap(){
  const age=ageBand().cap;
  if(S.archetype==="ordinary")return age;
  return Math.max(age,ARCHETYPES[S.archetype].bonusCap||age);
}
function phaseLimits(ph){
  if(ph==="bonus")return {pool:bonusPool(),max:bonusCap()};
  return {pool:100,max:15};
}

/* ================= HELPERS ================= */
const $=s=>document.querySelector(s);
const esc=t=>String(t==null?"":t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const jsq=k=>esc(String(k).replace(/\\/g,"\\\\").replace(/'/g,"\\'"));
const charsReady=()=>CHARS.every(c=>Number.isFinite(S.chars[c])&&S.chars[c]>0);
// The character's species template, or null for "plain human core rules".
// Species templates (characteristic dice, Movement Rate, traits) land here in
// a later pass; charBounds() below is already written against it so the range
// check has exactly one definition to widen when they arrive.
function speciesDef(){return (typeof SPECIES_MAP!=="undefined"&&S.species)?(SPECIES_MAP[S.species]||null):null;}
// Legal range for one characteristic. For humans this is the core rulebook's
// own 3-18 (8-18 for INT/SIZ) — the range the 3d6 / 2d6+6 dice can actually
// produce. Species templates carry their own dice, so their bounds are the
// min/max of those dice instead (see SPECIES in data.js). Deliberately a
// single shared helper rather than an inline literal, because the bound is
// needed in four separate places (Points Build stepper, Manual entry input
// attributes, validate(), and the species blurb) and they were previously
// allowed to disagree — which is exactly how the Roll/Manual validation hole
// in the audit happened.
function charBounds(c){
  const sp=speciesDef();
  const b=sp&&sp.bounds&&sp.bounds[c];
  if(b)return {min:b[0],max:b[1]};
  return {min:(c==="INT"||c==="SIZ")?8:3,max:18};
}
const charMin=c=>charBounds(c).min, charMax=c=>charBounds(c).max;
// Natural creation scores remain untouched. Advancement travels with the
// character and can be computed for party-board states other than global S.
function effectiveChars(state){
  state=state||S;const out={...state.chars},a=state.xp?.characteristics;
  const adv=a||{permanent:{},training:[]};
  const sp=(typeof SPECIES_MAP!=="undefined"&&state.species)?SPECIES_MAP[state.species]:null;
  for(const k of CHARS){
    if(!Number.isFinite(out[k])||k==="SIZ")continue;
    const max=sp?.bounds?.[k]?.[1]??18;
    const p=adv.permanent?.[k],permanent=Number.isSafeInteger(p)&&p>0?p:0;
    const trained=Array.isArray(adv.training)?adv.training.reduce((n,t)=>n+(t?.key===k&&Number.isSafeInteger(t.bonus)&&t.bonus>0?t.bonus:0),0):0;
    const events=Array.isArray(state.age?.ageingEvents)?state.age.ageingEvents:[];
    const loss=events.reduce((n,e)=>n+(Array.isArray(e?.effects)?e.effects.reduce((sum,v)=>sum+(v?.key===k&&Number.isInteger(v.loss)&&v.loss>=1&&v.loss<=3?v.loss:0),0):0),0);
    const adjusted=out[k]+permanent+trained-loss;
    // Do not silently cap old imported scores when there is no advancement.
    out[k]=Math.max(0,(permanent||trained)?Math.min(max,adjusted):adjusted);
  }
  return out;
}
function characteristicTraining(state){return Array.isArray(state.xp?.characteristics?.training)?state.xp.characteristics.training:[];}

// Where the bound the player just tripped over comes from, so the validation
// message explains itself instead of just asserting a number.
function charRangeSource(){const sp=speciesDef();return sp?" for a "+sp.label:" for a human";}
// Roll one characteristic off a species' own dice. Pulp Hero and Paragon use
// the book's "Dice Roll, High" treatment — roll one extra die of the same
// size and discard the lowest — generalised here to whatever die the species
// happens to use (2d4+4, 1d3+2, 3d6+3 and so on), rather than assuming d6.
function rollSpeciesChar(sp,c){
  const d=parseDice(sp.dice[c]);if(!d)return null;
  const extra=S.archetype==="ordinary"?0:1;
  const rolls=Array.from({length:d.n+extra},()=>1+Math.floor(Math.random()*d.sides)).sort((a,b)=>a-b);
  return rolls.slice(extra).reduce((a,b)=>a+b,0)+d.mod;
}
// True when characteristics come from one shared pool per dice group (plain
// human core rules: 3d6 x5 and 2d6+6 x2, freely assignable) rather than a
// separate die per characteristic.
function usesHumanPools(){const sp=speciesDef();return !sp||sp.key==="human";}
// Points Build pool. Humans use the core rulebook's flat pool per character
// tier (80 / 90 / 100); species templates override this with their own.
function pbPool(){
  const sp=speciesDef();
  const base=ARCHETYPES[S.archetype].pbPoints;
  if(!sp||sp.pbPool==null)return base;
  return sp.pbPool+(base-ARCHETYPES.ordinary.pbPoints);
}
function baseOf(f,c){c=c||effectiveChars();if(!charsReady())return 0;
  if(f.endsWith("x2"))return 2*c[f.slice(0,-2)];
  return f.split("+").reduce((a,k)=>a+c[k],0);}
function parseOffer(str){const m=str.match(/^([^(]+?)\s*\((.+)\)\s*$/);
  return m?{name:m[1].trim(),hint:m[2].trim()}:{name:str.trim(),hint:null};}
const profKey=(n,s)=>"prof:"+n+"|"+String(s||"").trim().toLowerCase();
const profLabel=(n,s)=>s?n+" ("+s+")":n;

// Acquired professional-skill instances. In Full mode: culture + career +
// hobby merge by key. In Quick Character mode: the three skills picked on
// the Quick Skills step instead (Culture/Career aren't used at all).
function acquiredProfs(){
  const out=new Map();
  const add=(name,spec,src)=>{if(!name)return;const k=profKey(name,spec);
    if(!out.has(k))out.set(k,{key:k,name,spec:String(spec||"").trim(),src:[]});
    out.get(k).src.push(src);};
  if(S.creationMode==="quick"){
    S.qProf.forEach((p,i)=>{if(p)add(p,S.qProfSpec[i],"quick");});
  }else{
    S.cultProf.forEach((p,i)=>{if(p)add(p,S.cultProfSpec[i],"culture");});
    S.carProf.forEach((p,i)=>{if(p)add(p,S.carProfSpec[i],"career");});
    if(S.hobby&&S.hobby!=="__combat_style__")add(S.hobby,S.hobbySpec,"hobby");
  }
  const ca=cultArch();if(ca)add(ca.skill,S.cultMembership.name||ca.name,"cult");
  (S.xp?.learnedProfs||[]).forEach(p=>{if(p&&Object.hasOwn(PROF,p.name)&&typeof p.spec==="string")add(p.name,p.spec,"learned");});
  return [...out.values()];
}
// Combat styles: culture style + career slots (a slot may link to an existing
// style) in Full mode; the single optional Quick Skills style in Quick mode.
function stylesList(){
  if(S.creationMode==="quick"){
    return S.qStyleOn?[{key:"style:quick",name:S.qStyleName||"Combat Style",src:"quick"}]:[];
  }
  const out=[];
  if(S.cultStyleOn)out.push({key:"style:cult",name:S.cultStyleName||"Cultural Combat Style",src:"culture"});
  if(S.hobby==="__combat_style__"&&(S.hobbySpec||"").trim())out.push({key:"style:hobby",name:S.hobbySpec.trim(),src:"hobby"});
  S.carStyles.forEach((cs,i)=>{
    if(!cs||cs.mode==="off")return;
    if(cs.mode==="link"){if(!out.some(s=>s.key===cs.link))return;/* linked to culture style */}
    else {
      // Validation blocks progress past Career while a "new style" slot is
      // unnamed, but a GM override can bypass that — so still guard here
      // rather than falling back to the slot's category label (e.g.
      // "Cultural Style") as a literal, nonsense-looking skill name.
      if(!(cs.name||"").trim())return;
      out.push({key:"style:k"+i,name:cs.name,src:"career"});
    }
  });
  return out;
}
// Get-or-create the weapon/trait composition attached to a Combat Style
// (keyed the same way as S.alloc — see the styleDefs comment in freshState).
// Any number of weapons and any number of traits, player's choice; nothing
// here is validated against a fixed slot count.
function styleDef(key){return S.styleDefs[key]||(S.styleDefs[key]={weapons:[],traits:[]});}
function toggleInList(list,item){const i=list.indexOf(item);if(i>=0)list.splice(i,1);else list.push(item);}
// All keys eligible for the Quick Character 100-point pool: every Standard
// Skill, the three chosen Professional Skills, and the optional Combat Style.
function quickKeys(){
  const keys=STD.map(([n])=>"std:"+n);
  S.qProf.forEach((p,i)=>{if(p)keys.push(profKey(p,S.qProfSpec[i]));});
  if(S.qStyleOn)keys.push("style:quick");
  return [...new Set(keys)];
}
const aGet=(ph,k)=>S.alloc[ph][k]||0;
// "Trained" (for the sheet's proficiency-dot indicator, not a rules term):
// has the player put any points into this Standard Skill, or does it get an
// automatic bonus (Customs/Native Tongue +40)? Purely cosmetic — helps the
// eye find a character's actual strengths at a glance. Cult/Community
// membership grants access to a skill, not a flat % bonus (see the
// CULT_ORG_TYPES comment above), so it no longer factors in here.
function hasInvestment(key){return aGet("culture",key)+aGet("career",key)+aGet("bonus",key)+aGet("quick",key)>0;}
function allEntries(){
  const e=[];
  STD.forEach(([n,f])=>{const key="std:"+n;
    e.push({key,label:n,base:baseOf(f),formula:f,grp:"Standard",
      trained:hasInvestment(key)||key==="std:Customs"||key==="std:Native Tongue"});});
  acquiredProfs().forEach(p=>e.push({key:p.key,label:profLabel(p.name,p.spec),base:baseOf(PROF[p.name]||"INTx2"),formula:PROF[p.name],grp:MAGIC.has(p.name)?"Magic":"Professional",trained:true}));
  stylesList().forEach(s=>e.push({key:s.key,label:s.name,base:baseOf("STR+DEX"),formula:"STR+DEX",grp:"Combat Style",trained:true}));
  return e;
}
const entryMap=()=>Object.fromEntries(allEntries().map(x=>[x.key,x]));
// Core pp.42,47: spoken-language skills represent fluency.
const isSpokenLanguage=key=>key==="std:Native Tongue"||key.startsWith("prof:Language|");
function aSum(ph){return Object.values(S.alloc[ph]).reduce((a,b)=>a+(b||0),0);}
function rawSkillPct(key,em){const e=em[key];if(!e)return 0;
  const cult=(key==="std:Customs"||key==="std:Native Tongue")?40:0;
  // NOTE: this previously omitted aGet("quick",key) — Quick Character mode's
  // own 100-point allocation was validated (had to sum to exactly 100) but
  // never actually added to the displayed/rolled %, so a Quick Character's
  // invested points silently did nothing on both the allocation table and
  // the final sheet. Fixed here; aGet returns 0 for phases with no entry for
  // this key, so this is a no-op for Full Creation characters.
  return e.base+cult+aGet("culture",key)+aGet("career",key)+aGet("bonus",key)+aGet("quick",key)+xpBonus(key);}
// Apply the Core p.47 Literacy cap only when a player explicitly links an
// existing spoken language. Old unlinked saves stay intact and remain manual.
function literacyLanguageKey(key,em){
  if(!key.startsWith("prof:Literacy|")||!em[key])return null;
  const linked=(S.literacyLinks||{})[key];
  return typeof linked==="string"&&em[linked]&&(linked==="std:Native Tongue"||linked.startsWith("prof:Language|"))?linked:null;
}
function literacyHeadroom(key){const em=entryMap(),language=literacyLanguageKey(key,em);
  return language?Math.max(0,rawSkillPct(language,em)-rawSkillPct(key,em)):Infinity;
}
function finalPct(key){const em=entryMap();if(!em[key])return 0;
  const raw=rawSkillPct(key,em),language=literacyLanguageKey(key,em);
  return language?Math.min(raw,rawSkillPct(language,em)):raw;
}
// Core p.73 training chart, indexed in steps. The text requires a trainer at
// least 20% better but the first table row starts at 21; the owner ruled
// (2026-11-06) that exactly 20 uses the first row (1d2).
function trainingStep(difference,teachResult){
  if(!Number.isSafeInteger(difference)||difference<20)return null;
  if(difference===20)difference=21;
  const shift={trainer:0,failure:0,success:1,critical:2,fumble:-1};
  if(!Object.hasOwn(shift,teachResult))return null;
  return Math.ceil((difference-20)/10)-1+shift[teachResult];
}
// Core p.80 Permanent Injury table: a 1d3 result of 1 or 2 removes one or
// two thirds of the location's Hit Points, 3 leaves a single Hit Point. The
// owner ruled (2026-11-06) that fractional HP lost rounds up, as usual.
function maimedMaxHP(max,result){
  if(!Number.isSafeInteger(max)||max<1||![1,2,3].includes(result))return null;
  if(result===3)return 1;
  return Math.max(1,max-Math.ceil(max*result/3));
}
function trainingDie(step){
  if(step<0)return {sides:0,bonus:0};
  if(step<3)return {sides:[2,3,4][step],bonus:0};
  return {sides:6,bonus:step-3};
}
// Cumulative permanent % gained for a skill via Experience Rolls (see the
// xp section of freshState). Folded straight into finalPct so every place
// that reads a skill's % — Play Mode list, Actions tab, Sheet, roll log —
// reflects Experience improvement with no extra plumbing.
function xpBonus(key){return (S.xp&&S.xp.bonus&&S.xp.bonus[key])||0;}
// Core pp.71–72: checked skill flags are observational only and do not
// award Experience Rolls. A GM award is stored in the banked pool.
function xpBonusRolls(){return 0;}
// Experience Modifier is applied when the GM awards rolls (APP.xpAward).
// Core p.72: the improvement die is 1d4 (+1), or 1d6 (+1) if the campaign's
// GM chose the optional faster rule. Standalone characters use Core. While a
// campaign's rules are still loading, returns null so nothing is spent.
function skillImprovementDie(){
  if(typeof rulesForOpenCharacter!=="function"||!S.campaignId)return 4;
  const st=rulesForOpenCharacter();
  if(st.status!=="ready")return null;
  return st.rules?.skillImprovement==="d6"?6:4;
}
function xpRollsAvailable(){return Math.max(0,S.xp.pool||0);}
/* ================= MAGIC =================
   Which magic skills the character actually acquired, so the Magic step can
   show the traditions they can use and flag the ones they can't yet. Magic
   skills arrive as Professional Skills through Culture, Career, hobby or the
   Quick Skills pool, so this reads them straight off acquiredProfs(). */
function magicSkillKey(name){
  const p=acquiredProfs().find(x=>x.name===name);
  return p?p.key:null;
}
function hasMagicSkill(name){return !!magicSkillKey(name);}
function magicSkillPct(name){const k=magicSkillKey(name);return k?finalPct(k):null;}
// A tradition is "available" once the character has its casting skill. Theism
// also wants Devotion (to build the pool) and Sorcery wants Shaping (to
// manipulate), so those are reported as supporting skills rather than
// blockers — a theist with Exhort but no Devotion can still invoke, they just
// have no pool to invoke from.
const TRADITION_SUPPORT={theism:["Devotion"],sorcery:["Shaping"],animism:["Trance"],mysticism:["Meditation"]};
function traditionStatus(t){
  const cast=hasMagicSkill(t.castSkill);
  const support=(TRADITION_SUPPORT[t.key]||[]).map(n=>({name:n,has:hasMagicSkill(n),pct:magicSkillPct(n)}));
  return {available:cast,castPct:magicSkillPct(t.castSkill),support};
}
function knownOf(traditionKey){return S.magic.known.filter(m=>m.tradition===traditionKey);}
// Core pp.164–165: Shaping points can be split among components.
// Each distinct altered component costs one MP and one casting Turn.
// Combine costs one additional MP per extra spell but does NOT add casting
// Turns for each extra spell (the Combine exception in Invocation Time).
function sorceryLevels(entry){
  if(entry.shapingLevels && typeof entry.shapingLevels==="object"){
    const out={};
    for(const k of ["Combine","Duration","Range","Targets","Magnitude"]){
      const n=Number(entry.shapingLevels[k]);if(Number.isInteger(n)&&n>0)out[k]=n;
    }
    if(!Object.hasOwn(entry.shapingLevels,"Combine") && Number(entry.combineExtra)>0)out.Combine=Math.floor(Number(entry.combineExtra));
    return out;
  }
  const out={};for(const k of (Array.isArray(entry.shapings)?entry.shapings:[])){
    if(["Combine","Duration","Range","Targets","Magnitude"].includes(k))out[k]=1;
  }if(!out.Combine && Number(entry.combineExtra)>0)out.Combine=Math.floor(Number(entry.combineExtra));return out;
}
function sorceryCost(entry){
  const levels=sorceryLevels(entry);
  const categories=Object.keys(levels).length;
  const points=Object.values(levels).reduce((a,b)=>a+b,0);
  const extra=levels.Combine||0;
  return {mp:1+categories+extra,turns:1+categories,shapings:categories,
    shapingPoints:points,combinedSpells:extra};
}
// MAG-N02 (Core p.162): each Combine point joins one more *different*
// recorded spell. The spells share target(s); the player confirms that.
function magicNameKey(v){return String(v||"").trim().toLowerCase();}
// Only the first Combine-many choices count; lowering Combine keeps the rest
// saved but unused.
function sorceryCombinedNames(entry){
  const n=sorceryLevels(entry).Combine||0;
  return (Array.isArray(entry.combinedSpells)?entry.combinedSpells:[]).slice(0,n).map(x=>String(x||"").trim()).filter(Boolean);
}
function sorceryCombineCheck(entry,known){
  const n=sorceryLevels(entry).Combine||0;if(!n)return null;
  known=known||S.magic.known;
  const names=sorceryCombinedNames(entry);
  if(names.length!==n)return "Combine "+n+" joins "+n+" other spell"+(n>1?"s":"")+" to this one; choose "+(n>1?"them":"it")+" in the builder ("+names.length+" chosen, Core p.162).";
  const seen=new Set([magicNameKey(entry.name)]);
  for(const name of names){
    const k=magicNameKey(name);
    if(seen.has(k))return "Combined spells must be different spells; "+name+" appears twice (Core p.162).";
    seen.add(k);
    if(!known.some(m=>m.tradition==="sorcery"&&magicNameKey(m.name)===k))return name+" is not a recorded Sorcery spell.";
  }
  if(entry.combineSharedTargets!==true)return "Confirm that the combined spells share the same target(s) before casting (Core p.162).";
  return null;
}
// Invocation skills are per school or grimoire. With several, a spell must
// say which one it comes from; with one, that one is used.
function invocationOptions(){return acquiredProfs().filter(p=>p.name==="Invocation");}
function sorceryInvocationKeyFor(entry){
  const opts=invocationOptions();
  if(opts.length>1){const o=opts.find(x=>x.key===entry?.invocationKey);return o?o.key:null;}
  return magicSkillKey("Invocation");
}
// MAG-N02: a combined casting rolls the lowest Invocation of the spells
// involved when they come from different sources (Core p.162).
function sorceryRollKey(entry,known){
  known=known||S.magic.known;
  const records=[entry].concat(sorceryCombinedNames(entry)
    .map(name=>known.find(m=>m.tradition==="sorcery"&&magicNameKey(m.name)===magicNameKey(name))).filter(Boolean));
  const keys=records.map(sorceryInvocationKeyFor);
  if(keys.some(k=>!k))return null;
  return keys.reduce((low,k)=>finalPct(k)<finalPct(low)?k:low);
}
// MAG-N10 guard: everything that decides a pending Sorcery roll. Changing a
// combined spell, or any involved spell's Invocation source, mid-casting
// needs a cancel rather than a silent switch at the final roll.
function sorceryPendingCombo(entry,known){
  known=known||S.magic.known;
  const names=sorceryCombinedNames(entry);
  const sources=[entry].concat(names.map(n=>known.find(m=>m.tradition==="sorcery"&&magicNameKey(m.name)===magicNameKey(n))||null))
    .map(r=>r?sorceryInvocationKeyFor(r)||"":"missing");
  return JSON.stringify([names,sources]);
}
// MAG-N04 (Core p.155): a mystic practises at most half their POW in distinct
// Talents. Names are compared case-insensitively; one Talent recorded at two
// Intensities counts once. Integer count against POW/2 needs no rounding.
function mysticismLearnedNames(entries){
  return new Set(entries.filter(m=>m.tradition==="mysticism"&&m.talentLearned===true&&String(m.name||"").trim()).map(m=>magicNameKey(m.name)));
}
function mysticismLearnCheck(entries,index,pow){
  const m=entries[index];if(!m||m.tradition!=="mysticism")return "Not a Mysticism Talent.";
  if(!String(m.name||"").trim())return "Name the Talent before marking it learned.";
  if(!Number.isSafeInteger(pow)||pow<1)return "Confirm POW before marking Talents learned.";
  const names=mysticismLearnedNames(entries);names.add(magicNameKey(m.name));
  if(names.size*2>pow)return "A mystic can practise at most half their POW in distinct Talents ("+Math.floor(pow/2)+" at POW "+pow+", Core p.155).";
  return null;
}
function mysticismTalentReady(entries,index,pow){
  const m=entries[index];if(!m||m.tradition!=="mysticism")return "Not a Mysticism Talent.";
  if(m.talentLearned!==true)return "Mark this Talent as learned (GM confirmed) first. A recorded or catalogue Talent is not automatically learned (Core p.155).";
  const count=mysticismLearnedNames(entries).size;
  if(Number.isSafeInteger(pow)&&pow>=1&&count*2>pow)return count+" learned Talents exceed half POW ("+Math.floor(pow/2)+" at POW "+pow+"). Review them in the builder before using any (Core p.155).";
  return null;
}
function mysticismActiveTotal(entries){
  return entries.filter(m=>m.tradition==="mysticism"&&m.active)
    .reduce((total,m)=>total+Math.max(0,Math.floor(Number(m.intensity)||0)),0);
}
function mysticismActivationCheck(entries,index,individual,combined){
  const m=entries[index];if(!m||m.tradition!=="mysticism")return "Not a Mysticism Talent.";
  if(m.active)return null;
  const intensity=Number(m.intensity);
  if(!Number.isInteger(intensity)||intensity<1)return "Intensity must be a positive whole number.";
  if(intensity>individual)return "This Talent exceeds the individual Intensity limit ("+individual+").";
  const other=mysticismActiveTotal(entries);
  if(other+intensity>combined)return "Active Talents would exceed the combined Intensity limit ("+combined+").";
  return null;
}
// Core p.165 Invocation Costs: success/full, critical/half, failure/zero,
// fumble/full. Core gives no rounding for an odd half: the app rounds up as
// policy pending owner decision D-4, not as a book rule.
function sorceryOutcomeCost(entry,tier){
  const full=sorceryCost(entry).mp;
  if(tier==="Failure")return 0;
  if(tier==="Critical")return Math.ceil(full/2);
  return full;
}
// Core p.181: Exhort spends 0 on Critical or Failure, full on Success,
// and precisely 1 Devotional Pool MP on Fumble (regardless of miracle rank).
function theismDetails(entry){
  const level=Number(entry.miracleLevel),instances=Number(entry.miracleInstances);
  if(!Number.isInteger(level)||level<1||level>3||!Number.isInteger(instances)||instances<1||instances>100)return null;
  return {cost:level*instances,turns:level+instances-1};
}
function theismCostLabel(entry){const d=theismDetails(entry);return d?d.cost+" pool / "+d.turns+" turns":"level needs review";}
function theismOutcomeCost(entry,tier){
  const details=theismDetails(entry),full=details?details.cost:Math.max(0,Number(entry.cost)||0);
  if(tier==="Critical"||tier==="Failure")return 0;
  if(tier==="Fumble")return 1;
  return full;
}
// Core p.156: calculate the base cost from the Talent category and Intensity.
// Existing manually recorded costs are retained until the player selects a category.
function mysticismDetails(entry){
  const intensity=Number(entry.intensity);
  if(!Number.isSafeInteger(intensity)||intensity<1)return null;
  if(entry.talentCategory==="augment")return {cost:intensity};
  if(entry.talentCategory==="enhance")return Number.isSafeInteger(intensity*3)?{cost:intensity*3}:null;
  if(entry.talentCategory==="invoke"&&intensity===1)return {cost:2};
  return null;
}
// Core p.156: a critical costs half. Odd halves round up as app policy
// pending D-4; the book does not give a direction.
function mysticismOutcomeCost(entry,tier){
  const full=mysticismDetails(entry)?.cost;
  if(full==null)return null;
  if(tier==="Failure")return 1;
  if(tier==="Critical")return Math.ceil(full/2);
  return full;
}
// Core pp.155–157: individual Intensity uses Mysticism, concurrent Intensity
// uses Meditation. The printed 34% example gives 2; other individual rounding
// boundaries remain unverified and should be confirmed with the GM.
function mysticismLimits(mysticismPct,meditationPct){
  return {individual:Math.max(0,Math.ceil(Number(mysticismPct||0)/20)),
    combined:Math.max(0,Math.floor(Number(meditationPct||0)/10))};
}
// Core p.136: Calling upon a binding costs an Action and uses Binding.
// Critical: no MP; success: 1 MP; failure: 1 MP; fumble: binding broken.
// This deliberately does NOT resolve spirit obedience, hostility, or powers.
function spiritCommandOutcome(tier){
  if(tier==="Critical")return {cost:0,broken:false,obeyed:true};
  if(tier==="Success")return {cost:1,broken:false,obeyed:true};
  if(tier==="Failure")return {cost:1,broken:false,obeyed:false};
  if(tier==="Fumble")return {cost:1,broken:true,obeyed:false};
  return null;
}
function spiritCommandPreflight(m,mp,bindingPct){
  if(!m || m.tradition!=="animism")return "Select an Animism spirit.";
  if(!String(m.name||"").trim())return "Name the spirit before attempting a command.";
  if(m.spiritStatus!=="bound")return "This spirit is not marked as bound. Confirm its binding with your GM first.";
  if(!Number.isFinite(mp)||mp<1)return "You need at least 1 Magic Point available to attempt a bound-spirit command.";
  if(!Number.isFinite(bindingPct)||bindingPct<=0)return "Add the Binding skill before commanding a spirit.";
  if(!Number.isSafeInteger(Number(m.pow))||Number(m.pow)<1)return "Enter the spirit's POW before attempting a command; consult your GM if unknown.";
  if(boundSpiritOverflow().length)return "More spirits are bound than your rank allows, so the strongest break free (Core p.136). Ask your GM which, mark them not bound in the builder, then command again.";
  const limit=3*Math.ceil(bindingPct/10);
  if(Number(m.pow)>limit)return "The spirit's POW exceeds your Binding limit ("+limit+"); the command fails (Core pp.131, 136).";
  return null;
}
// MAG-N09 (Core pp.135–136): bound-spirit slots by animist rank are ¼, ½, ¾
// or all of CHA (Follower, Spirit Worshipper, Shaman, High Shaman). The saved
// keys stay r1–r4. A fractional result is not rounded by the app: the GM
// confirms the whole-number limit (S.magic.boundLimitGM), which must lie
// between the fraction's floor and ceiling.
const ANIMIST_RANK_FRACTION={r1:0.25,r2:0.5,r3:0.75,r4:1};
const ANIMIST_RANK_LABEL=[["","Not confirmed"],["r1","Follower: ¼ CHA"],["r2","Spirit Worshipper: ½ CHA"],["r3","Shaman: ¾ CHA"],["r4","High Shaman: all CHA"]];
function boundSpiritFormula(){
  const f=ANIMIST_RANK_FRACTION[S.magic.animistRank],cha=Number(effectiveChars().CHA);
  if(f==null||!Number.isSafeInteger(cha)||cha<1)return null;
  return cha*f;
}
function boundSpiritLimit(){
  const x=boundSpiritFormula();if(x==null)return null;
  if(Number.isInteger(x))return x;
  const gm=S.magic.boundLimitGM;
  return Number.isInteger(gm)&&gm>=Math.floor(x)&&gm<=Math.ceil(x)?gm:null;
}
function boundSpirits(){return S.magic.known.filter(m=>m.tradition==="animism"&&m.spiritStatus==="bound");}
// Core p.136: over the limit, the strongest spirit(s) break free. Core doesn't
// define "strongest", so this is only the app's suggestion for the GM
// (highest Intensity, then POW). Commands stay blocked until the GM-chosen
// spirits are marked free.
function boundSpiritOverflow(){
  const limit=boundSpiritLimit(),bound=boundSpirits();
  if(limit==null||bound.length<=limit)return [];
  return bound.slice().sort((a,b)=>(Number(b.intensity)||0)-(Number(a.intensity)||0)||(Number(b.pow)||0)-(Number(a.pow)||0)).slice(0,bound.length-limit);
}
// A spirit is bound only after a GM-confirmed bargain or Spirit Combat win,
// and only into a free slot.
function spiritBindCheck(m){
  if(!m||m.tradition!=="animism")return "Select an Animism spirit.";
  if(!["bargain","combat"].includes(m.spiritAcquired))return "Record how the spirit was acquired (a bargain, or winning Spirit Combat, GM confirmed) before binding it (Core pp.135–136).";
  const formula=boundSpiritFormula(),limit=boundSpiritLimit();
  if(formula==null)return "Confirm your animist rank and CHA before binding: they set how many spirits you can hold (Core p.136).";
  if(limit==null)return "Your rank gives "+formula+" bound spirits. Enter the whole-number limit your GM confirms before binding.";
  if(boundSpirits().filter(x=>x!==m).length>=limit)return "All "+limit+" bound-spirit slots are in use (Core p.136).";
  return null;
}
// Starting-magic review is an explicit snapshot, never inferred from old saves.
function startingMagicReviewSignature(){
  return JSON.stringify({folk:S.magic.folk,known:S.magic.known.map(m=>[m.tradition,m.name,m.miracleLevel]),rank:S.magic.devotionalRank,cult:S.cultMembership,culture:S.culture,career:S.career,skills:["Folk Magic","Binding","Mysticism","Invocation","Devotion"].map(magicSkillPct)});
}
// Core pp.122–123 (ChatGPT case FM-007, FM-013, FM-018): Folk Magic casts in
// one Turn at Intensity 1 and Magnitude 1. Ranged spells reach the Folk Magic
// percentage in metres; difficulty grades change the casting chance only,
// never the spell's reach (Core p.120, MG-043).
function folkMagicRangeMetres(folkPct){
  const pct=Number(folkPct);
  return Number.isFinite(pct)&&pct>0?Math.floor(pct):0;
}
function magicEntryCost(entry){
  if(entry.tradition==="sorcery")return sorceryCost(entry).mp;
  if(entry.tradition==="theism")return theismDetails(entry)?.cost||0;
  if(entry.tradition==="mysticism")return mysticismDetails(entry)?.cost||0;
  return Math.max(0,parseInt(entry.cost,10)||0);
}
// Devotional Pool: Magic Points a theist has offered to their deity. It is a
// separate reserve from general Magic Points, which is why it is tracked on
// its own rather than coming out of playCurMagic().
// Update 11: never attempt a magic roll when its minimum known resource
// requirement cannot be paid.  Only a known, named entry may be invoked.
// This is a user-interface safety check, not an override of the GM's
// judgement about ritual conditions, spirit powers, or spell availability.
function magicCastPreflight(entry, availableMP, availableDevotion){
  if(!entry || !MAGIC_TRAD_MAP[entry.tradition])return "Unknown magical tradition.";
  if(!String(entry.name||"").trim())return "Name this spell, spirit, miracle, or talent before using it.";
  if(entry.tradition==="sorcery"){
    if(Number(entry.shapingLevels?.Intensity)>0 || entry.shapings?.includes("Intensity"))return "Legacy Intensity shaping needs review before casting.";
    if(Number(entry.combineExtra)>0)return "Review the legacy combined-spell count before casting.";
    for(const [name,value] of Object.entries(entry.shapingLevels||{})){
      if(!["Combine","Duration","Magnitude","Range","Targets"].includes(name) || !Number.isInteger(Number(value)) || Number(value)<0)
        return "Invalid Shaping value for "+name+"; review this entry before casting.";
    }
    const points=sorceryCost(entry).shapingPoints, skill=magicSkillPct("Shaping");
    const limit=skill==null?0:Math.ceil(Math.max(0,skill)/10);
    if(points>limit)return "Shaping allocation exceeds your limit ("+points+" / "+limit+").";
  }
  const mp=Math.max(0,Number(availableMP)||0);
  const dp=Math.max(0,Number(availableDevotion)||0);
  const t=MAGIC_TRAD_MAP[entry.tradition];
  if(entry.tradition==="mysticism"&&!mysticismDetails(entry))return "Confirm the Talent category and a valid Intensity before casting; invoked traits use Intensity 1 (Core p.156).";
  if(entry.tradition==="theism"&&!theismDetails(entry))return "Confirm this miracle's cult level and number of instances before casting (Core p.181).";
  if(entry.tradition==="theism"&&theismPoolIndex(entry)===null)return theismAssociationCheck(entry);
  if(entry.tradition==="folk" && mp<1)return "Not enough Magic Points to attempt Folk Magic (minimum 1 MP).";
  const cost=magicEntryCost(entry);
  if(t.pool==="mp" && entry.tradition!=="folk" && (!Number.isInteger(cost)||cost<1))
    return "Set a valid positive Magic Point cost from the Core rulebook.";
  if(t.pool==="devotional" && (!Number.isInteger(cost)||cost<1))
    return "Set a valid positive Devotional Pool cost from the Core rulebook.";
  if(t.pool==="mp" && mp<cost)return "Not enough Magic Points: need "+cost+", have "+mp+".";
  if(t.pool==="devotional" && dp<cost)return "Not enough Devotional Pool points: need "+cost+", have "+dp+".";
  return null;
}
// MAG-N05 (Core p.180): one Devotional Pool per cult. Pool 0 keeps the
// original fields (devotional, devotionalUsed, devotionalRank, devotionalCult)
// so older saves and builds still read it; further cults are in extraPools.
const DEVOTIONAL_RANKS=["","lay","initiate","acolyte","priest","highpriest"];
const MAX_DEVOTIONAL_POOLS=8;
function normalizeDevotionalPools(){
  S.magic.devotionalCult=String(S.magic.devotionalCult||"").slice(0,120);
  if(!DEVOTIONAL_RANKS.includes(S.magic.devotionalRank||""))S.magic.devotionalRank="";
  S.magic.extraPools=(Array.isArray(S.magic.extraPools)?S.magic.extraPools:[])
    .filter(x=>x&&typeof x==="object"&&!Array.isArray(x)).slice(0,MAX_DEVOTIONAL_POOLS-1).map(x=>{
      const max=Number.isSafeInteger(Number(x.max))&&Number(x.max)>=0?Number(x.max):0;
      const used=Number.isSafeInteger(Number(x.used))&&Number(x.used)>=0?Math.min(max,Number(x.used)):0;
      const out={cult:String(x.cult||"").slice(0,120),rank:DEVOTIONAL_RANKS.includes(x.rank)?x.rank:"",max,used};
      if(typeof x.exhortKey==="string"&&x.exhortKey)out.exhortKey=x.exhortKey.slice(0,200);
      return out;
    });
  if(typeof S.magic.devotionalExhortKey!=="string"||!S.magic.devotionalExhortKey)delete S.magic.devotionalExhortKey;
  for(const m of S.magic.known)if(m.tradition==="theism"){if(m.cult!=null)m.cult=String(m.cult).slice(0,120);}
  const count=devotionalPoolCount();
  for(const m of S.magic.known)if(m.tradition==="theism"&&m.pool!=null&&!(Number.isInteger(m.pool)&&m.pool>=0&&m.pool<count))delete m.pool;
}
function devotionalPoolCount(){return 1+(Array.isArray(S.magic.extraPools)?S.magic.extraPools.length:0);}
function devotionalPool(p=0){
  if(p===0)return {cult:S.magic.devotionalCult||"",rank:S.magic.devotionalRank||"",exhortKey:S.magic.devotionalExhortKey||"",
    max:Math.max(0,parseInt(S.magic.devotional,10)||0),used:Math.max(0,Number(S.magic.devotionalUsed)||0)};
  const x=Number.isInteger(p)&&p>0?(S.magic.extraPools||[])[p-1]:null;
  return x?{cult:x.cult||"",rank:x.rank||"",exhortKey:x.exhortKey||"",max:Math.max(0,parseInt(x.max,10)||0),used:Math.max(0,Number(x.used)||0)}:null;
}
function setDevotionalPool(p,patch){
  if(p===0){
    const map={cult:"devotionalCult",rank:"devotionalRank",max:"devotional",used:"devotionalUsed",exhortKey:"devotionalExhortKey"};
    for(const [k,v] of Object.entries(patch))S.magic[map[k]]=v;
    return;
  }
  const x=(S.magic.extraPools||[])[p-1];if(x)Object.assign(x,patch);
}
function devotionalMax(p=0){return devotionalPool(p)?.max||0;}
function devotionalCur(p=0){const x=devotionalPool(p);return x?Math.max(0,x.max-x.used):0;}
// Core p.180. Rank is confirmed for this pool, not inferred from the
// character's general cult field. Fractional limits need GM interpretation.
function devotionalRankLimit(p=0){
  const fractions={lay:0,initiate:0.25,acolyte:0.5,priest:0.75,highpriest:1};
  const rank=devotionalPool(p)?.rank,pow=Number(effectiveChars().POW);
  if(!Object.prototype.hasOwnProperty.call(fractions,rank)||!Number.isSafeInteger(pow)||pow<1)return null;
  return pow*fractions[rank];
}
// MAG-N05: the MP held across all of a theist's pools may not exceed POW.
function devotionalHeldTotal(){let t=0;for(let p=0;p<devotionalPoolCount();p++)t+=devotionalCur(p);return t;}
function devotionalHeldCheck(p,newHeld){
  const pow=Number(effectiveChars().POW);if(!Number.isSafeInteger(pow)||pow<1)return null;
  const total=devotionalHeldTotal()-devotionalCur(p)+newHeld;
  return total>pow?"All Devotional Pools together may hold at most POW ("+pow+") Magic Points; this would make "+total+" (Core p.180).":null;
}
function devotionalPoolLabel(p){const x=devotionalPool(p);return x?(x.cult?x.cult:"Cult "+(p+1))+" pool":"pool";}
// MAG-N05: a pool's Exhort skill. An explicit choice wins; otherwise an
// Exhort whose speciality names the pool's cult; otherwise the character's
// only Exhort. Several candidates and no choice = null (ask, never guess).
function exhortOptions(){return acquiredProfs().filter(p=>p.name==="Exhort");}
function exhortKeyForPool(p){
  const pool=devotionalPool(p);if(!pool)return null;
  const opts=exhortOptions();
  if(!opts.length)return magicSkillKey("Exhort");
  if(pool.exhortKey){const o=opts.find(x=>x.key===pool.exhortKey);return o?o.key:null;}
  const match=opts.filter(x=>x.spec&&pool.cult&&magicNameKey(x.spec)===magicNameKey(pool.cult));
  if(match.length===1)return match[0].key;
  return opts.length===1?opts[0].key:null;
}
// MAG-N07 (Core pp.179–181): a miracle's level (1 Initiate, 2 Acolyte,
// 3 Priest) must be within the confirmed rank of the pool it draws on. A Lay
// Member has no pool. Until the rank is confirmed no miracle can be requested;
// saved pool and miracle data are kept.
const POOL_RANK_MIRACLE={lay:0,initiate:1,acolyte:2,priest:3,highpriest:3};
function theismRankCheck(m,pi){
  const rank=devotionalPool(pi)?.rank;
  if(!Object.hasOwn(POOL_RANK_MIRACLE,rank))return "Confirm your rank in "+(devotionalPool(pi)?.cult||"this cult")+" (Rank for this pool, in the builder) before requesting miracles. Rank decides which miracles and how large a pool you have (Core pp.180–181).";
  const level=Number(m.miracleLevel),max=POOL_RANK_MIRACLE[rank];
  if(Number.isInteger(level)&&level>max)return (m.name||"This miracle")+" is a level "+level+" miracle; the "+devotionalPoolLabel(pi)+"'s confirmed rank allows up to level "+max+" (Core pp.179–181).";
  return null;
}
// MAG-N05: a miracle belongs to one cult. With several pools it must name
// that cult, and the pool it draws on must be the same cult's. Legacy
// miracles are never reassigned silently.
function theismAssociationCheck(m){
  const n=devotionalPoolCount(),pi=theismPoolIndex(m);
  if(pi===null)return "Choose which cult's Devotional Pool this miracle draws on. Pools are separate; personal Magic Points and other cults' pools are never used instead (Core pp.180–181).";
  const pool=devotionalPool(pi);
  if(n>1&&!pool.cult)return "Name the cult for "+devotionalPoolLabel(pi)+" in the builder before requesting its miracles.";
  if(n>1&&!String(m.cult||"").trim())return "Confirm which cult "+(m.name||"this miracle")+" comes from in the builder (Core p.180).";
  if(String(m.cult||"").trim()&&magicNameKey(m.cult)!==magicNameKey(pool.cult))return (m.name||"This miracle")+" belongs to "+m.cult+", not "+(pool.cult||"this pool")+". A cult's miracles are requested only through that cult (Core pp.180–181).";
  const rankErr=theismRankCheck(m,pi);if(rankErr)return rankErr;
  if(!exhortKeyForPool(pi))return exhortOptions().length>1?"Choose which Exhort skill the "+devotionalPoolLabel(pi)+" uses, in the builder.":"Add the Exhort skill before requesting a miracle.";
  return null;
}
// A miracle draws only on its own cult's pool. With one pool, that pool;
// with several, the miracle must name one. null = not confirmed.
function theismPoolIndex(m){
  const n=devotionalPoolCount();
  if(m?.pool==null)return n===1?0:null;
  return Number.isInteger(m.pool)&&m.pool>=0&&m.pool<n?m.pool:null;
}
// Every piece of magic the character knows, in one list, for the sheet and
// Play Mode's Magic tab.
function allMagic(){
  const out=S.magic.folk.map(f=>({tradition:"folk",name:f.name,spec:f.spec||"",
    spell:folkSpellByName(f.name)||null}));
  return out.concat(S.magic.known.map(m=>Object.assign({},m)));
}
// allMagic returns presentation copies; mutations MUST use the saved record.
function spiritRecordByMagicIndex(idx){
  if(!Number.isInteger(idx))return null;
  const i=idx-S.magic.folk.length;
  const m=S.magic.known[i];
  return m&&m.tradition==="animism"?m:null;
}
function magicLabel(m){
  if(m.tradition==="folk")return m.spec?m.name.replace(/\(X\)/,"("+m.spec+")"):m.name;
  return m.name||"(unnamed)";
}

/* ================= VALIDATION ================= */
function cultureReqKeys(){
  if(!S.culture||!Object.hasOwn(CULTURES,S.culture))return [];
  const c=CULTURES[S.culture];const keys=c.std.map(n=>"std:"+n);
  S.cultChoice.forEach(n=>keys.push("std:"+n));
  S.cultProf.forEach((p,i)=>{if(p)keys.push(profKey(p,S.cultProfSpec[i]));});
  if(S.cultStyleOn)keys.push("style:cult"); // Optional; zero cultural points is legal.
  return keys;
}
function careerKeys(){
  // A custom career remains active while its editor is open; clearing the
  // selection temporarily must not discard every existing career allocation.
  if(!S.career&&!S.customCareer.isCustom)return [];
  const k=S.customCareer.isCustom?{std:S.customCareer.std,styleSlots:Array(S.customCareer.styleSlots).fill(null)}:CAREERS[S.career];
  if(!k)return [];
  const keys=k.std.map(n=>"std:"+n);
  k.styleSlots.forEach((_,i)=>{const cs=S.carStyles[i];
    keys.push(cs&&cs.mode==="link"?"style:cult":"style:k"+i);});
  S.carProf.forEach((p,i)=>{if(p)keys.push(profKey(p,S.carProfSpec[i]));});
  return [...new Set(keys)];
}
// Selection edits return points from unavailable skills to their original pool.
// Existing/imported saves retain their allocations until the player edits or clears them.
function reconcileSkillAllocations(){
  const allowed={culture:cultureReqKeys(),career:careerKeys(),quick:quickKeys(),bonus:allEntries().map(e=>e.key)};
  for(const [phase,keys] of Object.entries(allowed)){
    const keep=new Set(keys);
    for(const key of Object.keys(S.alloc[phase]))if(!keep.has(key))delete S.alloc[phase][key];
  }
}
// Validate selectable Professional Skills independently of the browser's dropdown.
// Different named specialities of a skill (for example Lore (Primary) and
// Lore (Secondary)) are separate skills; an identical skill+speciality isn't.
function professionalPicksError(picks,specs,offers,required,kind){
  const allowed=new Set(offers.map(o=>parseOffer(o).name));
  const used=new Set();
  const selected=picks.filter(Boolean).length;
  if(required!==null&&selected!==required)return kind+" needs exactly "+required+" Professional Skills.";
  if(selected>3)return kind+" may select at most three Professional Skills.";
  for(let i=0;i<picks.length;i++){
    const name=picks[i];if(!name)continue;
    if(!allowed.has(name))return name+" is not an available "+kind+" Professional Skill.";
    const offered=offers.map(parseOffer).filter(o=>o.name===name);
    const hint=(offered.find(o=>o.hint)||{}).hint||QUICK_SPEC_HINTS[name];
    const spec=String(specs[i]||"").trim();
    if(hint&&!spec)return "Give "+name+" a speciality ("+hint+").";
    const id=profKey(name,spec);
    if(used.has(id))return "You selected "+profLabel(name,spec)+" twice. Choose a different Professional Skill or speciality.";
    used.add(id);
  }
  return null;
}
// Imported/old saves can contain invalid values even when on-screen inputs
// clamp values; reject these instead of accepting a seemingly valid total.
function allocationError(phase,allowed,cap){
  const eligible=new Set(allowed);
  for(const [key,value] of Object.entries(S.alloc[phase]||{})){
    if(typeof value!=="number"||!Number.isInteger(value)||value<0)
      return "Invalid "+phase+" allocation for "+key+": enter a non-negative whole number.";
    if(value>0&&!eligible.has(key))return "Points remain on an unavailable "+phase+" skill: "+key+".";
    if(value>cap)return "No "+phase+" skill may receive more than "+cap+" points ("+key+").";
  }
  return null;
}
function validate(step){
  const ok=m=>({ok:true,msg:m||""}), bad=m=>({ok:false,msg:m});
  const name=currentSteps()[step];
  switch(name){
   case "Concept":{
    const issue=ageRangeIssue();
    if(issue&&(!Number.isInteger(S.age.years)||S.age.years<0||!ageRangeApproved()))return bad(issue);
    return ok();}
   case "Characteristics":{
    if(!charsReady())return bad("Assign a value to all seven characteristics.");
    // Range check runs in EVERY entry mode. It used to sit inside the
    // charMode==="pb" branch below, which meant Roll mode and Manual entry
    // skipped it entirely and a hand-typed STR of 21 validated clean. The
    // bound itself is whatever the character's species can actually roll
    // (charBounds), so this stays correct once non-human templates exist.
    for(const c of CHARS){const {min,max}=charBounds(c);
      if(!Number.isInteger(S.chars[c]))return bad(c+" must be a whole number.");
      if(S.chars[c]<min||S.chars[c]>max)
        return bad(c+" must be between "+min+" and "+max+charRangeSource()+" — "+c+" is currently "+S.chars[c]+".");}
    if(S.charMode==="pb"){
      const pool=pbPool();
      const total=CHARS.reduce((a,c)=>a+S.chars[c],0);
      if(total!==pool)return bad("Points build must use all "+pool+" points ("+total+" spent).");
    }
    // Old/manual saves may have no roll provenance. Retain them for GM review,
    // but a recorded assignment must actually use its recorded pool once.
    if(S.charMode==="roll"&&usesHumanPools()&&(S.poolA.length||S.poolB.length)){
      for(const [names,pool,assigned] of [[ROLL_3D6,S.poolA,S.assignA],[ROLL_2D6,S.poolB,S.assignB]]){
        const used=new Set();
        for(const c of names){const i=assigned[c];
          if(!Number.isInteger(i)||i<0||i>=pool.length||used.has(i)||pool[i]!==S.chars[c])
            return bad("The recorded dice assignment for "+c+" is missing, reused or does not match its pool. Reassign the rolls, or use Manual for GM-agreed values.");
          used.add(i);
        }
      }
    }
    return ok();}
   case "Attributes":{
    if(![0,2,3].includes(S.fixedAP))return bad("Fixed Action Points must be off, 2 or 3 for this table option.");
    if(S.archetype!=="ordinary"){
      const t=ARCHETYPES[S.archetype];
      if(S.archAdvantages.length!==t.advantages)return bad("Choose exactly "+t.advantages+" Advantage"+(t.advantages>1?"s":"")+".");
    }
    return ok();}
   case "Culture":{
    if(!S.culture||!Object.hasOwn(CULTURES,S.culture))return bad("Choose a listed culture. Saved skill points are retained for review.");
    const c=CULTURES[S.culture];
    if(c.choice&&S.cultChoice.length!==c.choice.pick)return bad("Pick "+c.choice.pick+" cultural standard skill"+(c.choice.pick>1?"s":"")+" ("+c.choice.text+").");
    if(c.choice&&(new Set(S.cultChoice).size!==S.cultChoice.length||S.cultChoice.some(sk=>!c.choice.from.includes(sk))))
      return bad("Choose distinct cultural standard skills from the listed options.");
    if(!c.choice&&S.cultChoice.length)return bad("Remove extra cultural standard skill choices for this culture.");
    if(S.cultStyleOn&&!S.cultStyleName.trim())return bad("Give your cultural combat style a name (or turn off “Take a cultural combat style”).");
    if(S.cultProf.filter(Boolean).length!==3)return bad("Select three Professional Skills from the culture's options.");
    for(let i=0;i<3;i++){const p=S.cultProf[i];if(!p)continue;
      const off=c.prof.map(parseOffer).find(o=>o.name===p);
      if(off&&off.hint&&!S.cultProfSpec[i].trim())return bad("Give "+p+" a speciality ("+off.hint+").");}
    const professionError=professionalPicksError(S.cultProf,S.cultProfSpec,c.prof,3,"Culture");
    if(professionError)return bad(professionError);
    const req=cultureReqKeys();
    const allocationProblem=allocationError("culture",req,15);
    if(allocationProblem)return bad(allocationProblem);
    for(const k of Object.keys(S.alloc.culture)){if(aGet("culture",k)>0&&!req.includes(k))return bad("Cultural points were left on a skill no longer in your culture list — remove them.");}
    for(const k of req){const v=aGet("culture",k);
      if((k!=="style:cult"&&v<5)||v>15||(k==="style:cult"&&v>0&&v<5&&!S.cultStyleSmallAlloc)){const em=entryMap();return bad((em[k]?em[k].label:k)+" must receive "+(k==="style:cult"&&S.cultStyleSmallAlloc?"0–15":"5–15")+" cultural points (has "+v+").");}}
    const s=aSum("culture");
    if(s!==100)return bad("Spend exactly 100 cultural points ("+s+" spent).");
    return ok();}
   case "Career":{
    if(!S.career||(!S.customCareer.isCustom&&!Object.hasOwn(CAREERS,S.career)))return bad("Choose a listed or custom career. Saved skill points are retained for review.");
    if(S.customCareer.isCustom&&S.customCareer.std.length+S.customCareer.styleSlots>7)
      return bad("Custom careers may have at most seven Standard Skills, including Combat Styles.");
    const k=S.customCareer.isCustom?null:CAREERS[S.career];
    // A style slot left in "new style" mode with a blank name used to fall
    // back to the slot's category label (e.g. "Cultural Style") as the
    // literal skill name, producing a nonsense "Combat Style: Cultural
    // Style" row on the sheet. Block progress instead until it's named or
    // switched to "same as cultural style".
    for(let i=0;i<(S.carStyles||[]).length;i++){const cs=S.carStyles[i];
      if(cs&&cs.mode==="new"&&!(cs.name||"").trim()){
        const slotLabel=S.customCareer.isCustom?"Combat Style "+(i+1):(k&&k.styleSlots[i])||"combat style";
        return bad("Give your "+slotLabel+" a name (or set it to “same as cultural style”).");}}
    for(let i=0;i<3;i++){const p=S.carProf[i];if(!p)continue;
      if(k&&!k.prof.map(o=>parseOffer(o).name).includes(p))return bad(p+" is not one of this career's professional skills — pick another or clear it.");
      const off=k?k.prof.map(parseOffer).find(o=>o.name===p):null;
      const hint=(off&&off.hint)?off.hint:QUICK_SPEC_HINTS[p];
      if(hint&&!S.carProfSpec[i].trim())return bad("Give "+p+" a speciality ("+hint+").");}
    const configuredOffers=S.customCareer.isCustom&&Array.isArray(S.customCareer.profOffers);
    const careerOffers=S.customCareer.isCustom?(configuredOffers?S.customCareer.profOffers.filter(Boolean):Object.keys(PROF)):k.prof;
    if(configuredOffers){
      if(S.customCareer.profOffers.filter(Boolean).length>7||S.customCareer.profOffers.some(o=>o&&!Object.hasOwn(PROF,o)))return bad("Choose at most seven valid custom career Professional Skill options.");
    }
    const professionError=professionalPicksError(S.carProf,S.carProfSpec,careerOffers,null,"Career");
    if(professionError)return bad(professionError);
    const allowed=careerKeys();
    const allocationProblem=allocationError("career",allowed,15);
    if(allocationProblem)return bad(allocationProblem);
    for(const key of Object.keys(S.alloc.career)){if(aGet("career",key)>0&&!allowed.includes(key))return bad("Career points were left on a skill outside this career — remove them.");}
    for(const key of allowed){const v=aGet("career",key);
      if(v<0||v>15){const em=entryMap();return bad((em[key]?em[key].label:key)+" cannot receive more than 15 career points.");}}
    const s=aSum("career");
    if(s!==100)return bad("Spend exactly 100 career points ("+s+" spent).");
    return ok();}
   case "Quick Skills":{
    if(S.qProf.filter(Boolean).length!==3)return bad("Select three Professional Skills.");
    for(let i=0;i<3;i++){const p=S.qProf[i];if(!p)continue;
      const hint=QUICK_SPEC_HINTS[p];
      if(hint&&!S.qProfSpec[i].trim())return bad("Give "+p+" a speciality (e.g. "+hint+").");}
    const professionError=professionalPicksError(S.qProf,S.qProfSpec,Object.keys(PROF),3,"Quick Character");
    if(professionError)return bad(professionError);
    const req=quickKeys();
    const allocationProblem=allocationError("quick",req,15);
    if(allocationProblem)return bad(allocationProblem);
    for(const k of Object.keys(S.alloc.quick)){if(aGet("quick",k)>0&&!req.includes(k))return bad("Points were left on a skill no longer selected — remove them.");}
    // The 5-15 band binds on whichever skills you actually invest in, not on
    // every eligible skill at once — with 22 Standard Skills plus 3
    // Professional Skills and a Combat Style all in play, requiring a
    // mandatory 5 on literally all of them would need 130+ points from a
    // 100-point pool. A skill left at 0 is simply not developed this pass.
    for(const k of req){const v=aGet("quick",k);
      if(v>15){const em=entryMap();return bad((em[k]?em[k].label:k)+" cannot receive more than 15 points (has "+v+").");}
      if(v>0&&v<5){const em=entryMap();return bad((em[k]?em[k].label:k)+" must receive at least 5 points once you invest in it (has "+v+").");}}
    const s=aSum("quick");
    if(s!==100)return bad("Spend exactly 100 points ("+s+" spent).");
    return ok();}
   case "Bonus Skills":{
    if(S.hobby==="__combat_style__"&&!(S.hobbySpec||"").trim())return bad("Name your hobby Combat Style.");
    if(S.hobby&&S.hobby!=="__combat_style__"&&QUICK_SPEC_HINTS[S.hobby]&&!(S.hobbySpec||"").trim())
      return bad("Give your hobby "+S.hobby+" a speciality ("+QUICK_SPEC_HINTS[S.hobby]+").");
    const pool=bonusPool(),cap=bonusCap();
    const keys=allEntries().map(e=>e.key);
    const allocationProblem=allocationError("bonus",keys,cap);
    if(allocationProblem)return bad(allocationProblem);
    for(const key of Object.keys(S.alloc.bonus)){if(aGet("bonus",key)>0&&!keys.includes(key))return bad("Bonus points rest on a removed skill — clear them.");}
    for(const key of keys){if(aGet("bonus",key)>cap)return bad("No skill may receive more than "+cap+" bonus points.");}
    const s=aSum("bonus");
    if(s!==pool)return bad("Spend exactly "+pool+" bonus points ("+s+" spent).");
    return ok();}
   case "Community":{
    const c=S.community;
    for(const x of c.connections){
      if(!["Ally","Contact","Rival","Enemy"].includes(x.type))return bad("A community connection has an invalid relationship type.");
      if(!String(x.name||"").trim())return bad("Name every added ally, contact, rival or enemy (or remove the blank row).");
    }
    return ok();}
   case "Money & Gear":{
    // Every other pool (Culture/Career/Bonus) hard-blocks overspending; this
    // one only ever turned the remaining total red and let you proceed
    // anyway. gearCostTotal() (weapons + armour, auto-summed) plus whatever
    // manual "additional" spending is entered must not exceed starting money
    // -- going under budget is fine, only going over blocks the step.
    if(!Number.isFinite(S.money.spent)||S.money.spent<0)return bad("Additional spending must be zero or a positive amount.");
    if(!Number.isFinite(S.money.eventAdjustment??0))return bad("The background money adjustment must be a finite number.");
    if(!Number.isFinite(S.money.mod)||S.money.mod<=0)return bad("Money modifier must be positive.");
    if(S.money.dice.length&& (S.money.dice.length!==4||S.money.dice.some(x=>!Number.isInteger(x)||x<1||x>6)))return bad("Starting money must use four valid six-sided dice.");
    if(S.inventory.some(it=>!Number.isInteger(it.qty)||it.qty<0||!Number.isFinite(it.enc)||it.enc<0||!Number.isFinite(Number(it.cost||0))||Number(it.cost||0)<0))return bad("Inventory needs whole nonnegative quantities, nonnegative ENC and nonnegative prices.");
    if(!S.money.dice.length)return bad("Roll your starting money before completing Money & Gear.");
    if(typeof gearEncTotal==="function"&&Number.isFinite(S.chars.STR)&&S.chars.STR>0&&gearEncTotal()>effectiveChars().STR*4)return bad("Your gear exceeds STR × 4 ENC, the carrying limit in Mythras Core p.77.");
    const total=moneyTotal(),spent=moneySpentTotal();
    if(spent>total)return bad("You've spent "+spent+" sp but only have "+total+" sp — reduce gear or additional spending by "+(spent-total)+" sp.");
    return ok();}
   default:return ok();
  }
}
const stepPassed=i=>validate(i).ok||S.overrides[i];

// Final review is deliberately descriptive: optional/GM-assessed details do
// not become fabricated automatic bonuses or mandatory backstory choices.
function creationReview(){
  const rows=[];const add=(step,status,text)=>rows.push({step,status,text});
  currentSteps().forEach((name,i)=>{if(name==='Finish')return;const v=validate(i);
    if(!v.ok)add(name,S.overrides[i]?'override':'error',v.msg);
  });
  const events=S.age.coreEvents||[],count=coreBackgroundRollCount();
  if(!S.age.coreEventsSkipped&&(events.length!==count||events.some(e=>!e||!Number.isInteger(e.roll)||e.roll<1||e.roll>100||!String(e.summary||'').trim())))
    add('Concept','manual','Background events: these are optional (p.17). If using them, record the '+count+' age-based Core table result'+(count===1?'':'s')+' or agree the outcomes with your GM (pp.18–20,34). You can explicitly skip them on Concept. Mechanical effects are resolved with the GM.');
  if(['senior','old'].includes(ageBand().key)||humanAgeingInfo()){
    if(S.age.ageingReview?.key!==ageingReviewKey()||!['resolved','override'].includes(S.age.ageingReview?.status))add('Concept','manual','Ageing: review the applicable bands with your GM and record the results or a GM review (pp.34,70–71).');
  }
  if(S.charMode==='roll'&&usesHumanPools()&&!S.poolA.length&&!S.poolB.length)
    add('Characteristics','manual','This saved character has no recorded dice pools. Confirm the starting scores with your GM, or record them as Manual. Saved scores are unchanged.');
  for(const p of S.passions||[])if(passionVal(p)==='?')add('Passions','manual','Passion '+(p.name||'(unnamed)')+': enter the required subject characteristics or a GM-agreed starting percentage (p.23).');
  const em=entryMap();
  for(const p of acquiredProfs())if(p.name==='Literacy'&&!literacyLanguageKey(p.key,em))
    add(S.creationMode==='quick'?'Quick Skills':'Bonus Skills','manual',p.label||profLabel(p.name,p.spec)+': link the associated spoken language to apply its Literacy limit (p.47).');
  return rows;
}

