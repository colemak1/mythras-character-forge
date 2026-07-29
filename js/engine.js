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
function shiftGradeEasier(g){const i=GRADE_ORDER.indexOf(g);return GRADE_ORDER[Math.max(1,i-1)];}
function gradeForEntry(key){
  const advKey=GRADE_EASIER_ADV[key];
  return (advKey&&hasAdv(advKey))?shiftGradeEasier(ACTIVE_GRADE):ACTIVE_GRADE;
}
function gradedPct(key,basePct){
  const g=gradeForEntry(key);const mult=GRADE_MULT[g];
  return mult==null?{pct:null,grade:g}:{pct:Math.max(0,Math.round(basePct*mult)),grade:g};
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
 campaignId:null, _libId:null, _libLastSaved:null,
 concept:{name:"",player:"",gender:"",age:"",frame:"Medium",handed:"Right",homeland:"",notes:""},
 chars:{STR:null,CON:null,SIZ:null,DEX:null,INT:null,POW:null,CHA:null},
 charMode:"roll", poolA:[], poolB:[], assignA:{}, assignB:{}, fixedAP:0,
 culture:null, cultChoice:[], cultProf:[null,null,null], cultProfSpec:["","",""],
 cultStyleOn:false, cultStyleName:"",
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
 play:{hp:{},luck:null,magic:null,apUsed:0,tab:"actions",fatigue:"Fresh",selectedLoc:null},
 // Experience Rolls (core rulebook pp.71-73, cross-checked against the
 // Mythras Imperative SRD "Character Improvement" section — see chat for
 // citations). pool = banked, unspent Experience Rolls. fumbled = skill
 // keys currently flagged for their free +1% (auto-set on a Fumble roll in
 // Play Mode, or toggled by hand), cleared once applied. bonus = cumulative
 // % gained per skill key from this system, folded into finalPct() so every
 // existing display (skill list, sheet, roll log) picks it up automatically.
 // usedThisRun tracks the "same skill may not benefit from more than one
 // Experience Roll per session" cap — reset whenever new rolls are awarded,
 // since this app has no other concept of a game "session" boundary.
 xp:{pool:0,fumbled:[],bonus:{},usedThisRun:[],history:[]}
};}
function normalizeState(){
  S.alloc=S.alloc||{};S.alloc.culture=S.alloc.culture||{};S.alloc.career=S.alloc.career||{};
  S.gearWeapons=S.gearWeapons||[];
  S.armor=S.armor||{};ARMOR_LOCATIONS.forEach(l=>{if(!S.armor[l])S.armor[l]="None";});
  S.alloc.bonus=S.alloc.bonus||{};S.alloc.quick=S.alloc.quick||{};
  S.creationMode=S.creationMode||"full";S.archetype=S.archetype||"ordinary";
  S.archAdvantages=S.archAdvantages||[];
  S.qProf=S.qProf||[null,null,null];S.qProfSpec=S.qProfSpec||["","",""];
  S.qStyleOn=!!S.qStyleOn;S.qStyleName=S.qStyleName||"";
  S.styleDefs=S.styleDefs||{};
  S.cultMembership=S.cultMembership||{archetype:null,name:"",rank:0};
  if(typeof S.cultMembership.rank!=="number")S.cultMembership.rank=0; // migrate old string ranks
  if(S.money&&S.money.quickMult==null)S.money.quickMult=50;
  S.play=S.play||{hp:{},luck:null,magic:null,apUsed:0,tab:"actions",fatigue:"Fresh",selectedLoc:null};
  S.play.hp=S.play.hp||{};
  if(typeof S.play.apUsed!=="number")S.play.apUsed=0;
  if(!S.play.tab)S.play.tab="actions";
  if(!S.play.fatigue)S.play.fatigue="Fresh";
  if(S.play.selectedLoc===undefined)S.play.selectedLoc=null;
  S.xp=S.xp||{pool:0,fumbled:[],bonus:{},usedThisRun:[],history:[]};
  S.xp.fumbled=S.xp.fumbled||[];S.xp.bonus=S.xp.bonus||{};
  S.xp.usedThisRun=S.xp.usedThisRun||[];S.xp.history=S.xp.history||[];
  if(typeof S.xp.pool!=="number")S.xp.pool=0;
}
// Cult & Community is temporarily pulled out of the flow (user's own call,
// to revisit later) — stepCult() and all its supporting data/functions are
// left intact below, just not wired into currentSteps()/stepFns(), so it's
// a one-line change in each array to bring back.
function currentSteps(){
  return S.creationMode==="quick"
   ?["Concept","Characteristics","Attributes","Quick Skills","Passions","Money & Gear","Finish"]
   :["Concept","Characteristics","Attributes","Culture","Career","Bonus Skills","Passions","Money & Gear","Finish"];
}
function stepFns(){
  return S.creationMode==="quick"
   ?[stepConcept,stepChars,stepAttrs,stepQuickSkills,stepPassions,stepMoney,stepFinish]
   :[stepConcept,stepChars,stepAttrs,stepCulture,stepCareer,stepBonus,stepPassions,stepMoney,stepFinish];
}
function bonusPool(){return 150+(ARCHETYPES[S.archetype].bonusExtra||0);}
function bonusCap(){return ARCHETYPES[S.archetype].bonusCap||15;}
function phaseLimits(ph){
  if(ph==="bonus")return {pool:bonusPool(),max:bonusCap()};
  return {pool:100,max:15};
}

/* ================= HELPERS ================= */
const $=s=>document.querySelector(s);
const esc=t=>String(t==null?"":t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const jsq=k=>esc(String(k).replace(/\\/g,"\\\\").replace(/'/g,"\\'"));
const charsReady=()=>CHARS.every(c=>Number.isFinite(S.chars[c])&&S.chars[c]>0);
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
    if(S.hobby)add(S.hobby,S.hobbySpec,"hobby");
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
  stylesList().forEach(s=>e.push({key:s.key,label:s.name,base:baseOf("STR+DEX"),formula:"STR+DEX",grp:"Combat Style",provisional:true,trained:true}));
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
/* ================= VALIDATION ================= */
function cultureReqKeys(){
  if(!S.culture)return [];
  const c=CULTURES[S.culture];const keys=c.std.map(n=>"std:"+n);
  S.cultChoice.forEach(n=>keys.push("std:"+n));
  S.cultProf.forEach((p,i)=>{if(p)keys.push(profKey(p,S.cultProfSpec[i]));});
  if(S.cultStyleOn)keys.push("style:cult");
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
function validate(step){
  const ok=m=>({ok:true,msg:m||""}), bad=m=>({ok:false,msg:m});
  const name=currentSteps()[step];
  switch(name){
   case "Characteristics":{
    if(!charsReady())return bad("Assign a value to all seven characteristics.");
    if(S.charMode==="pb"){
      const pool=ARCHETYPES[S.archetype].pbPoints;
      const total=CHARS.reduce((a,c)=>a+S.chars[c],0);
      if(total!==pool)return bad("Points build must use all "+pool+" points ("+total+" spent).");
      for(const c of CHARS){const mn=(c==="INT"||c==="SIZ")?8:3;
        if(S.chars[c]<mn||S.chars[c]>18)return bad(c+" must be between "+mn+" and 18.");}
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
    const req=cultureReqKeys();
    for(const k of Object.keys(S.alloc.culture)){if(aGet("culture",k)>0&&!req.includes(k))return bad("Cultural points were left on a skill no longer in your culture list — remove them.");}
    for(const k of req){const v=aGet("culture",k);
      if(v<5||v>15){const em=entryMap();return bad((em[k]?em[k].label:k)+" must receive between 5 and 15 cultural points (has "+v+").");}}
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
    const allowed=careerKeys();
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
    const req=quickKeys();
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
    if(!S.hobby)return bad("Pick a hobby Professional Skill — the book allocates one alongside the bonus points.");
    const pool=bonusPool(),cap=bonusCap();
    const keys=allEntries().map(e=>e.key);
    for(const key of Object.keys(S.alloc.bonus)){if(aGet("bonus",key)>0&&!keys.includes(key))return bad("Bonus points rest on a removed skill — clear them.");}
    for(const key of keys){if(aGet("bonus",key)>cap)return bad("No skill may receive more than "+cap+" bonus points.");}
    const s=aSum("bonus");
    if(s!==pool)return bad("Spend exactly "+pool+" bonus points ("+s+" spent).");
    return ok();}
   default:return ok();
  }
}
const stepPassed=i=>validate(i).ok||S.overrides[i];

