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
function shiftGradeEasier(g,n){const i=GRADE_ORDER.indexOf(g);return GRADE_ORDER[Math.max(1,i-(n==null?1:n))];}
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
   harder; over STR x3 "Overloaded" makes them two Grades harder. It is a
   relative SHIFT, and it only touches STR/DEX skills.

   Fatigue (Fatigue Levels table, see FATIGUE_TABLE): each level states an
   absolute Skill Grade for the character's rolls, and it applies to every
   skill, not just physical ones. So it behaves as a FLOOR on difficulty
   rather than another shift — a Winded character rolls at Hard, and a
   Winded *and* Burdened character rolls their Combat Style at Formidable
   (Standard shifted one harder by the load = Hard, which the Winded floor
   then does not worsen... but Overloaded's two steps take it to Formidable,
   which is worse than the floor and therefore wins). Taking the harsher of
   the two rather than summing them keeps the table's own wording intact
   instead of inventing a stacking rule the book does not state. */
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
function fatigueGradeFloor(){const r=fatigueRow();return r&&r.grade?r.grade:null;}
function gradeForEntry(key){
  let g=ACTIVE_GRADE;
  const advKey=GRADE_EASIER_ADV[key];
  if(advKey&&hasAdv(advKey))g=shiftGradeEasier(g);
  const steps=encGradeSteps(key);
  if(steps>0)g=shiftGradeHarder(g,steps);
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
  if(advKey&&hasAdv(advKey))out.push({dir:"easier",text:ARCHETYPES[S.archetype].label+" Advantage: one Grade easier"});
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
  return {walk:r.m,run:r.walkOnly?null:(r.m+steps*0.5)*3,
    sprint:(r.walkOnly||r.noSprint)?null:(r.m+steps)*5,info:r};
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
  const derivedM=a.heightAt*Math.pow(siz/avgSiz,1/3)*build;
  const derivedKg=a.massPerSiz*siz;
  const om=parseFloat(S.concept.heightM), ok=parseFloat(S.concept.weightKg);
  const m=Number.isFinite(om)&&om>0?om:derivedM;
  const kg=Number.isFinite(ok)&&ok>0?ok:derivedKg;
  return {m:Math.round(m*100)/100,kg:Math.round(kg),
    derivedM:Math.round(derivedM*100)/100,derivedKg:Math.round(derivedKg),
    overriddenH:m!==derivedM,overriddenW:kg!==derivedKg,
    ft:mToFtIn(m),lb:Math.round(kg*2.2046),species:spKey,build:S.concept.frame||"Medium"};
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
function resolveRoll(roll,skill){
  const crit=Math.max(1,Math.ceil(skill/10));
  const fumble=skill>100?(roll===100):(roll>=99);
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
 magic:{folk:[],known:[],devotional:0,devotionalUsed:0},
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
 community:{family:"",parents:"",siblings:"",reputation:"",connections:[],partyTie:"",resources:""},
 _creationFlowVersion:2,
 qProf:[null,null,null], qProfSpec:["","",""], qStyleOn:false, qStyleName:"",
 alloc:{culture:{},career:{},bonus:{},quick:{}},
 passions:[],
 money:{dice:[],mod:1,socialClass:"",spent:0,quickMult:50},
 inventory:[],
 gearWeapons:[],
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
 play:{hp:{},luck:null,magic:null,apUsed:0,tab:"actions",fatigue:"Fresh",selectedLoc:null,sorceryCasting:null},
 // Experience Rolls (core rulebook pp.71-73, cross-checked against the
 // Mythras Core pp.71–72, checked against the uploaded rulebook — see audit for
 // citations). pool = banked, unspent Experience Rolls. fumbled = skill
 // keys currently flagged for their free +1% (auto-set on a Fumble roll in
 // Play Mode, or toggled by hand), cleared once applied. bonus = cumulative
 // % gained per skill key from this system, folded into finalPct() so every
 // existing display (skill list, sheet, roll log) picks it up automatically.
 // Legacy usedThisRun is retained for save compatibility and no longer limits improvement.
 xp:{pool:0,fumbled:[],bonus:{},usedThisRun:[],history:[],checked:[]}
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
  for(const key of ["family","parents","siblings","reputation","partyTie","resources"]){
    if(typeof S.community[key]!=="string")S.community[key]="";
  }
  S.community.connections=Array.isArray(S.community.connections)?S.community.connections.filter(x=>x&&typeof x==="object"):[];
  S.community.connections=S.community.connections.map(x=>({type:["Ally","Contact","Rival","Enemy"].includes(x.type)?x.type:"Contact",name:String(x.name||"").slice(0,160),notes:String(x.notes||"").slice(0,1000)}));
  if(S.cultStyleSmallAlloc===undefined)S.cultStyleSmallAlloc=true; // existing guests keep requested Sit’ota style allocation behavior
  S.alloc=S.alloc||{};S.alloc.culture=S.alloc.culture||{};S.alloc.career=S.alloc.career||{};
  S.gearWeapons=S.gearWeapons||[];
  S.armor=S.armor||{};ARMOR_LOCATIONS.forEach(l=>{if(!S.armor[l])S.armor[l]="None";});
  S.alloc.bonus=S.alloc.bonus||{};S.alloc.quick=S.alloc.quick||{};
  S.creationMode=S.creationMode||"full";S.archetype=S.archetype||"ordinary";
  if(S.species===undefined)S.species=null;
  S.age=S.age||{category:"adult",years:null,events:[]};
  if(!AGE_MAP[S.age.category])S.age.category="adult";
  S.age.events=S.age.events||[];
  S.age.coreEvents=Array.isArray(S.age.coreEvents)?S.age.coreEvents:[];
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
    }
    if(m.tradition==="mysticism"){
      m.active=!!m.active;
      m.durationTurns=Number.isInteger(Number(m.durationTurns))&&Number(m.durationTurns)>=0?Number(m.durationTurns):0;
      m.remainingTurns=m.active&&Number.isInteger(Number(m.remainingTurns))&&Number(m.remainingTurns)>=0?Number(m.remainingTurns):0;
    }
  }
  if(typeof S.magic.devotional!=="number")S.magic.devotional=0;
  if(typeof S.magic.devotionalUsed!=="number")S.magic.devotionalUsed=0;
  if(S.concept&&S.concept.heightM===undefined)S.concept.heightM="";
  if(S.concept&&S.concept.weightKg===undefined)S.concept.weightKg="";
  S.archAdvantages=S.archAdvantages||[];
  S.qProf=S.qProf||[null,null,null];S.qProfSpec=S.qProfSpec||["","",""];
  S.qStyleOn=!!S.qStyleOn;S.qStyleName=S.qStyleName||"";
  S.styleDefs=S.styleDefs||{};
  S.cultMembership=S.cultMembership||{archetype:null,name:"",rank:0};
  if(typeof S.cultMembership.rank!=="number")S.cultMembership.rank=0; // migrate old string ranks
  if(S.money&&S.money.quickMult==null)S.money.quickMult=50;
  S.play=S.play||{hp:{},luck:null,magic:null,apUsed:0,tab:"actions",fatigue:"Fresh",selectedLoc:null};
  S.play.hp=S.play.hp||{};
  // A multi-turn invocation is a manual tracker, never an automatic spell effect.
  if(S.play.sorceryCasting && (!Number.isInteger(S.play.sorceryCasting.index) ||
      !Number.isInteger(S.play.sorceryCasting.completed) ||
      !Number.isInteger(S.play.sorceryCasting.total) ||
      S.play.sorceryCasting.completed<1 ||
      S.play.sorceryCasting.total<2 ||
      S.play.sorceryCasting.completed>=S.play.sorceryCasting.total))S.play.sorceryCasting=null;
  if(typeof S.play.apUsed!=="number")S.play.apUsed=0;
  if(!S.play.tab)S.play.tab="actions";
  if(!FATIGUE_MAP[S.play.fatigue])S.play.fatigue="Fresh";
  if(!Number.isFinite(S.play.apUsed)||S.play.apUsed<0)S.play.apUsed=0;
  if(!Number.isFinite(S.play.luck)||S.play.luck<0)S.play.luck=null;
  if(!Number.isFinite(S.play.magic)||S.play.magic<0)S.play.magic=null;
  for(const [loc,hp] of Object.entries(S.play.hp)){
    if(!Number.isFinite(hp))delete S.play.hp[loc];
  }
  if(S.play.selectedLoc===undefined)S.play.selectedLoc=null;
  S.xp=S.xp||{pool:0,fumbled:[],bonus:{},usedThisRun:[],history:[],checked:[]};
  S.xp.fumbled=S.xp.fumbled||[];S.xp.bonus=S.xp.bonus||{};
  S.xp.usedThisRun=S.xp.usedThisRun||[];S.xp.history=S.xp.history||[];
  S.xp.checked=S.xp.checked||[];
  if(typeof S.xp.pool!=="number")S.xp.pool=0;
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
function coreBackgroundRollCount(){return Math.max(0,AGE_CATEGORIES.findIndex(a=>a.key===ageBand().key));}
function coreBackgroundRollsValid(){return (S.age.coreEvents||[]).length===coreBackgroundRollCount();}
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
function baseOf(f,c){c=c||S.chars;if(!charsReady())return 0;
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
function aSum(ph){return Object.values(S.alloc[ph]).reduce((a,b)=>a+(b||0),0);}
function finalPct(key){const em=entryMap();const e=em[key];if(!e)return 0;
  const cult=(key==="std:Customs"||key==="std:Native Tongue")?40:0;
  // NOTE: this previously omitted aGet("quick",key) — Quick Character mode's
  // own 100-point allocation was validated (had to sum to exactly 100) but
  // never actually added to the displayed/rolled %, so a Quick Character's
  // invested points silently did nothing on both the allocation table and
  // the final sheet. Fixed here; aGet returns 0 for phases with no entry for
  // this key, so this is a no-op for Full Creation characters.
  return e.base+cult+aGet("culture",key)+aGet("career",key)+aGet("bonus",key)+aGet("quick",key)+xpBonus(key);}
// Cumulative permanent % gained for a skill via Experience Rolls (see the
// xp section of freshState). Folded straight into finalPct so every place
// that reads a skill's % — Play Mode list, Actions tab, Sheet, roll log —
// reflects Experience improvement with no extra plumbing.
function xpBonus(key){return (S.xp&&S.xp.bonus&&S.xp.bonus[key])||0;}
// Core pp.71–72: checked skill flags are observational only and do not
// award Experience Rolls. A GM award is stored in the banked pool.
function xpBonusRolls(){return 0;}
// Experience Modifier is applied when the GM awards rolls (APP.xpAward).
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
// fumble/full. Half points are rounded up to a payable integer.
function sorceryOutcomeCost(entry,tier){
  const full=sorceryCost(entry).mp;
  if(tier==="Failure")return 0;
  if(tier==="Critical")return Math.ceil(full/2);
  return full;
}
// Core p.181: Exhort spends 0 on Critical or Failure, full on Success,
// and precisely 1 Devotional Pool MP on Fumble (regardless of miracle rank).
function theismOutcomeCost(entry,tier){
  const full=Math.max(0,Number(entry.cost)||0);
  if(tier==="Critical"||tier==="Failure")return 0;
  if(tier==="Fumble")return 1;
  return full;
}
// Core p.156: Mysticism spends half on Critical, full on Success/Fumble,
// and exactly 1 MP on Failure. Keep the talent cost explicitly recorded
// because different talent categories have different base costs.
function mysticismOutcomeCost(entry,tier){
  const full=Math.max(0,Number(entry.cost)||0);
  if(tier==="Failure")return 1;
  if(tier==="Critical")return Math.ceil(full/2);
  return full;
}
// Core p.156 & 157: maximum individual Intensity = floor(Mysticism/20);
// simultaneous total Intensity <= floor(Meditation/10).
function mysticismLimits(mysticismPct,meditationPct){
  return {individual:Math.max(0,Math.floor(Number(mysticismPct||0)/20)),
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
function spiritCommandPreflight(m,mp){
  if(!m || m.tradition!=="animism")return "Select an Animism spirit.";
  if(!String(m.name||"").trim())return "Name the spirit before attempting a command.";
  if(m.spiritStatus!=="bound")return "This spirit is not marked as bound. Confirm its binding with your GM first.";
  if(!Number.isFinite(mp)||mp<1)return "You need at least 1 Magic Point available to attempt a bound-spirit command.";
  return null;
}
function magicEntryCost(entry){
  if(entry.tradition==="sorcery")return sorceryCost(entry).mp;
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
  if(entry.tradition==="folk" && mp<1)return "Not enough Magic Points to attempt Folk Magic (minimum 1 MP).";
  const cost=magicEntryCost(entry);
  if(t.pool==="mp" && entry.tradition!=="folk" && (!Number.isInteger(cost)||cost<1))
    return "Set a valid positive Magic Point cost from the Core rulebook.";
  if(t.pool==="devotional" && (!Number.isInteger(Number(entry.cost))||Number(entry.cost)<1))
    return "Set a valid positive Devotional Pool cost from the Core rulebook.";
  if(t.pool==="mp" && mp<cost)return "Not enough Magic Points: need "+cost+", have "+mp+".";
  if(t.pool==="devotional" && dp<cost)return "Not enough Devotional Pool points: need "+cost+", have "+dp+".";
  return null;
}
function devotionalMax(){return Math.max(0,parseInt(S.magic.devotional,10)||0);}
function devotionalCur(){return Math.max(0,devotionalMax()-(S.magic.devotionalUsed||0));}
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
  if(!S.culture)return [];
  const c=CULTURES[S.culture];const keys=c.std.map(n=>"std:"+n);
  S.cultChoice.forEach(n=>keys.push("std:"+n));
  S.cultProf.forEach((p,i)=>{if(p)keys.push(profKey(p,S.cultProfSpec[i]));});
  if(S.cultStyleOn)keys.push("style:cult"); // Optional; zero cultural points is legal.
  return keys;
}
function careerKeys(){
  if(!S.career)return [];
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
   case "Characteristics":{
    if(!charsReady())return bad("Assign a value to all seven characteristics.");
    // Range check runs in EVERY entry mode. It used to sit inside the
    // charMode==="pb" branch below, which meant Roll mode and Manual entry
    // skipped it entirely and a hand-typed STR of 21 validated clean. The
    // bound itself is whatever the character's species can actually roll
    // (charBounds), so this stays correct once non-human templates exist.
    for(const c of CHARS){const {min,max}=charBounds(c);
      if(S.chars[c]<min||S.chars[c]>max)
        return bad(c+" must be between "+min+" and "+max+charRangeSource()+" — "+c+" is currently "+S.chars[c]+".");}
    if(S.charMode==="pb"){
      const pool=pbPool();
      const total=CHARS.reduce((a,c)=>a+S.chars[c],0);
      if(total!==pool)return bad("Points build must use all "+pool+" points ("+total+" spent).");
    }
    return ok();}
   case "Attributes":{
    if(S.archetype!=="ordinary"){
      const t=ARCHETYPES[S.archetype];
      if(S.archAdvantages.length!==t.advantages)return bad("Choose exactly "+t.advantages+" Advantage"+(t.advantages>1?"s":"")+".");
    }
    return ok();}
   case "Culture":{
    if(!S.culture)return bad("Choose a culture.");
    const c=CULTURES[S.culture];
    if(c.choice&&S.cultChoice.length!==c.choice.pick)return bad("Pick "+c.choice.pick+" cultural standard skill"+(c.choice.pick>1?"s":"")+" ("+c.choice.text+").");
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
    if(!S.career)return bad("Choose a career.");
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
    const careerOffers=S.customCareer.isCustom?Object.keys(PROF):k.prof;
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
    if(!S.hobby)return bad("Choose a hobby Professional Skill or Combat Style.");
    if(S.hobby==="__combat_style__"&&!(S.hobbySpec||"").trim())return bad("Name your hobby Combat Style.");
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
    if(!Number.isFinite(S.money.mod)||S.money.mod<=0)return bad("Money modifier must be positive.");
    if(S.money.dice.length&& (S.money.dice.length!==4||S.money.dice.some(x=>!Number.isInteger(x)||x<1||x>6)))return bad("Starting money must use four valid six-sided dice.");
    if(S.inventory.some(it=>!Number.isInteger(it.qty)||it.qty<0||!Number.isFinite(it.enc)||it.enc<0||!Number.isFinite(Number(it.cost||0))||Number(it.cost||0)<0))return bad("Inventory needs whole nonnegative quantities, nonnegative ENC and nonnegative prices.");
    if(!S.money.dice.length)return bad("Roll your starting money before completing Money & Gear.");
    if(typeof gearEncTotal==="function"&&Number.isFinite(S.chars.STR)&&S.chars.STR>0&&gearEncTotal()>S.chars.STR*4)return bad("Your gear exceeds STR × 4 ENC, the carrying limit in Mythras Core p.77.");
    const total=moneyTotal(),spent=moneySpentTotal();
    if(spent>total)return bad("You've spent "+spent+" sp but only have "+total+" sp — reduce gear or additional spending by "+(spent-total)+" sp.");
    return ok();}
   default:return ok();
  }
}
const stepPassed=i=>validate(i).ok||S.overrides[i];

