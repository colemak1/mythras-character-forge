"use strict";
/* ================= APP HANDLERS ================= */
// Guards a handler against firing twice for one user interaction when it's
// bound to both pointerdown and click (see addPas below) -- pointerdown is
// the one that actually does the work, click is a same-tick echo of the
// same press plus the keyboard-activation path, both landing well within
// this window.
let _lastFireAt={};
function debounceFire(key,fn){const now=Date.now();if(now-(_lastFireAt[key]||0)<400)return;_lastFireAt[key]=now;fn();}
window.APP={
 go(i){if(i<0||i>=currentSteps().length)return;
   if(i>S.step){for(let s=S.step;s<i;s++){if(!stepPassed(s)){S.step=s;render();window.scrollTo(0,0);return;}}}
   S.step=i;render();window.scrollTo(0,0);},
 override(step,v){S.overrides[step]=v;render();},
 set(obj,f,v){S[obj][f]=v;renderLedger();saveAutosave();},
 async setPortrait(input){
   const file=input.files&&input.files[0];if(!file)return;
   if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){showError("Choose a JPEG, PNG, or WebP image under 5 MB.");input.value="";return;}
   const actor=S;
   try{
     const image=await createImageBitmap(file);
     const scale=Math.min(1,512/Math.max(image.width,image.height));
     const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
     const ctx=canvas.getContext("2d");ctx.fillStyle="#e4d6b9";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close();
     const portrait=canvas.toDataURL("image/jpeg",.76);
     if(portrait.length>200024)throw Error("Image is too large after resizing. Try a smaller image.");
     if(actor!==S)return;
     S.concept.portrait=portrait;saveAutosave();render();     if(cloudActive())await flushCloudSaves();
   }catch(e){showError("Portrait could not be saved: "+e.message);input.value="";}
 },
 clearPortrait(){S.concept.portrait="";render();},
 set2(f,v){S[f]=v;render();},
 /* characteristics */
 mode(m){S.charMode=m;
   if(m==="pb"){CHARS.forEach(c=>{if(!Number.isFinite(S.chars[c]))S.chars[c]=charMin(c);});}
   render();},
 rollPools(){
   const tier=ARCHETYPES[S.archetype], ord=S.archetype==="ordinary";
   const rollMain=()=>ord?(d(6)+d(6)+d(6)):(()=>{const dice=[d(6),d(6),d(6),d(6)].sort((a,b)=>a-b);return dice[1]+dice[2]+dice[3];})();
   const rollSizInt=()=>ord?(d(6)+d(6)+6):(()=>{const dice=[d(6),d(6),d(6)].sort((a,b)=>a-b);return dice[1]+dice[2]+6;})();
   S.poolA=Array.from({length:tier.mainRolls},rollMain);
   S.poolB=Array.from({length:tier.sizintRolls},rollSizInt);
   S.assignA={};S.assignB={};CHARS.forEach(c=>S.chars[c]=null);render();},
 assignInOrder(){
   const idxByValDesc=pool=>pool.map((v,i)=>i).sort((a,b)=>pool[b]-pool[a]);
   const orderA=idxByValDesc(S.poolA),orderB=idxByValDesc(S.poolB);
   S.assignA={};S.assignB={};
   ROLL_3D6.forEach((c,i)=>{if(i<orderA.length){S.assignA[c]=orderA[i];S.chars[c]=S.poolA[orderA[i]];}});
   ROLL_2D6.forEach((c,i)=>{if(i<orderB.length){S.assignB[c]=orderB[i];S.chars[c]=S.poolB[orderB[i]];}});
   render();},
 assign(c,idx){const isB=ROLL_2D6.includes(c);const asg=isB?S.assignB:S.assignA;const pool=isB?S.poolB:S.poolA;
   if(idx===""){delete asg[c];S.chars[c]=null;}
   else{asg[c]=+idx;S.chars[c]=pool[+idx];}
   render();},
 pb(c,dir){const mnOf=charMin;const mn=mnOf(c);
   const pool=pbPool();
   const cur=S.chars[c];
   // First "+" on an unset characteristic lands on its minimum, not min+1.
   const v=(cur==null)?(dir>0?mn:mn-1):cur+dir;
   if(v<mn||v>charMax(c))return;
   const otherReserved=CHARS.reduce((a,k)=>a+(k===c?0:(S.chars[k]??mnOf(k))),0);
   if(otherReserved+v>pool)return;
   S.chars[c]=v;render();},
 pbSet(c,target){const mnOf=charMin;
   const pool=pbPool();
   // Budget against the pool minus what every OTHER characteristic already
   // reserves — unset ones reserve their own minimum, not 0 — so clicking
   // "max"/"fill" on one stat can never push the total over the pool by
   // starving stats that haven't been touched yet. The pool ceiling always
   // wins here; it's never re-floored back up to mn afterward (that was the
   // bug: mn could be applied after the pool clamp and silently overspend).
   const otherReserved=CHARS.reduce((a,k)=>a+(k===c?0:(S.chars[k]??mnOf(k))),0);
   const avail=Math.max(0,pool-otherReserved);
   S.chars[c]=Math.max(0,Math.min(charMax(c),target,avail));
   render();},
 manual(c,v){const n=parseInt(v,10);S.chars[c]=Number.isFinite(n)?n:null;render();},
 fap(v){S.fixedAP=v;render();},
 /* character tier & creation method */
 /* ---- magic ---- */
 toggleFolkSpell(name){
   const i=S.magic.folk.findIndex(f=>f.name===name);
   if(i>=0)S.magic.folk.splice(i,1);
   else S.magic.folk.push({name,spec:""});
   render();},
 folkSpec(name,v){const f=S.magic.folk.find(x=>x.name===name);if(f)f.spec=v;render();},
 // Magicians begin with 1d4+1 spells; this rolls that number and fills them
 // at random for a player who'd rather not pick.
 rollStartingFolk(){
   const n=d(4)+1;const pool=allFolkSpells();const picked=[];
   for(let i=0;i<n&&pool.length;i++)picked.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
   S.magic.folk=picked.map(s=>({name:s.n,spec:""}));render();},
 clearFolk(){S.magic.folk=[];render();},
 // Same stale-DOM-click race addPas() guards against below (a click
 // landing right after a preceding field's onchange/blur already tore down
 // and rebuilt this button) -- these sit right next to Miracle/spell name
 // and stat fields, so they're just as exposed to it.
 addMagic(tradition){debounceFire('addMagic',()=>{
   S.magic.known.push({tradition,name:"",notes:"",cost:1,intensity:1,pow:0,cha:0,spiritStatus:"unbound",spiritContact:"unknown",spiritAttitude:"neutral",spiritMP:null,spiritCombatNote:"",bindingType:"none",shapings:[],shapingLevels:{},combineExtra:0,active:false,durationTurns:0,remainingTurns:0});
   render();});},
 // Update 17: Spirit negotiation, ritual outcome and spirit-combat bookkeeping.
 // The GM confirms contact, bargains and bindings; these controls never invent a successful ritual.
 spiritSelect(i,field,value){if(viewOnlyBlock())return;const m=S.magic.known[i];
   if(!m||m.tradition!=="animism")return;
   const allowed={spiritContact:["unknown","located","contacted"],spiritAttitude:["friendly","neutral","hostile"],bindingType:["none","fetish","location","creature"]};
   if(!allowed[field]||!allowed[field].includes(value))return;
   m[field]=value;render();},
 spiritMP(i,raw){if(viewOnlyBlock())return;const m=S.magic.known[i];
   if(!m||m.tradition!=="animism")return;
   const n=Number(String(raw).trim());
   if(!String(raw).trim()||!Number.isSafeInteger(n)||n<0||n>999){PM_MSG="Spirit Magic Points must be a whole number from 0 to 999.";render();return;}
   m.spiritMP=n;render();},
 spiritMPAdjust(idx,delta){if(viewOnlyBlock())return;
   const m=spiritRecordByMagicIndex(idx);
   if(!m){PM_MSG="Select a recorded spirit.";render();return;}
   if(!Number.isSafeInteger(m.spiritMP)){PM_MSG="Enter the spirit's current Magic Points on its Magic entry first.";render();return;}
   const next=m.spiritMP+delta;
   if(!Number.isSafeInteger(delta)||next<0||next>999){PM_MSG="Spirit Magic Points must remain between 0 and 999.";render();return;}
   m.spiritMP=next;PM_MSG="Spirit combat bookkeeping: "+m.name+" has "+next+" MP. Resolve attacks, defense and effects with your GM (Core pp.137–139).";render();},
 spiritCombatNote(i,v){if(viewOnlyBlock())return;const m=S.magic.known[i];if(m&&m.tradition==="animism"){m.spiritCombatNote=String(v).slice(0,800);render();}},
 spiritStatus(i,status){if(viewOnlyBlock())return;const m=S.magic.known[i];
   if(!m||m.tradition!=="animism"||!["bound","unbound"].includes(status))return;
   m.spiritStatus=status;render();},
 magicField(i,f,v){const m=S.magic.known[i];if(!m)return;
   if(f==="name"||f==="notes")m[f]=v;
   else {const raw=String(v).trim();const n=Number(raw);
     if(!raw||!Number.isInteger(n)||n<0){PM_MSG="Magic values must be non-negative whole numbers.";render();return;}
     if(m.tradition==="animism"&&f==="intensity"&&n<1){PM_MSG="Spirit Intensity must be at least 1.";render();return;}
     m[f]=n;}
   render();},
 shapingLevel(i,name,raw){const m=S.magic.known[i];if(!m||m.tradition!=="sorcery")return;
   if(!["Duration","Range","Targets","Magnitude","Intensity"].includes(name))return;
   const n=Number(raw);if(!Number.isInteger(n)||n<0||n>100){PM_MSG="Shaping level must be a whole number from 0 to 100.";render();return;}
   m.shapingLevels=sorceryLevels(m);if(n)m.shapingLevels[name]=n;else delete m.shapingLevels[name];
   m.shapings=Object.keys(m.shapingLevels);render();},
 talentDuration(i,raw){const m=S.magic.known[i];if(!m||m.tradition!=="mysticism")return;
   const str=String(raw).trim(),n=Number(str);
   if(str===""||!Number.isSafeInteger(n)||n<0||n>9999){PM_MSG="Talent duration must be a whole number of turns (0 means GM-managed).";render();return;}
   m.durationTurns=n;if(m.active)m.remainingTurns=n;render();},
 talentTurn(i){if(viewOnlyBlock())return;const m=S.magic.known[i];if(!m||m.tradition!=="mysticism"||!m.active)return;
   if(m.durationTurns===0){PM_MSG="Duration is GM-managed for this Talent.";render();return;}
   m.remainingTurns=Math.max(0,(m.remainingTurns||0)-1);
   if(m.remainingTurns===0)m.active=false;
   render();},
 combineExtra(i,raw){const m=S.magic.known[i];if(!m||m.tradition!=="sorcery")return;
   const n=Number(raw);if(!Number.isInteger(n)||n<0||n>20){PM_MSG="Extra combined spells must be a whole number from 0 to 20.";render();return;}
   m.combineExtra=n;render();},
 toggleTalent(i){if(viewOnlyBlock())return;const m=S.magic.known[i];if(!m||m.tradition!=="mysticism")return;
   if(m.active){m.active=false;m.remainingTurns=0;render();return;}
   const limits=mysticismLimits(magicSkillPct("Mysticism"),magicSkillPct("Meditation"));
   const err=mysticismActivationCheck(S.magic.known,i,limits.individual,limits.combined);
   if(err){PM_MSG=err;render();return;}
   m.active=true;m.remainingTurns=m.durationTurns||0;render();},
 sorceryCancel(){if(viewOnlyBlock())return;S.play.sorceryCasting=null;PM_MSG="Sorcery invocation cancelled; no Invocation roll was made.";render();},
 delMagic(i){debounceFire('delMagic'+i,()=>{S.magic.known.splice(i,1);render();});},
 devotional(v){S.magic.devotional=Math.max(0,parseInt(v,10)||0);
   S.magic.devotionalUsed=Math.min(S.magic.devotionalUsed,S.magic.devotional);render();},
 devotionalAdj(n){if(viewOnlyBlock())return;
   S.magic.devotionalUsed=Math.max(0,Math.min(devotionalMax(),(S.magic.devotionalUsed||0)-n));render();},
 devotionalReset(){if(viewOnlyBlock())return;S.magic.devotionalUsed=0;render();},
 // Core p.136: Calling upon a bound spirit is its own Binding action.
 // GM still adjudicates the spirit's action, POW restrictions, and possible
 // continued resistance. No generic spell or spirit combat automation.
 commandSpirit(idx){
   if(viewOnlyBlock())return;
   PM_MSG=null;
   const m=spiritRecordByMagicIndex(idx);
   const err=spiritCommandPreflight(m,playCurMagic());
   if(err){PM_MSG=err;render();return;}
   const key=magicSkillKey("Binding");
   if(!key){PM_MSG="Binding is not available on this character's sheet.";render();return;}
   const g=gradedPct(key,finalPct(key));
   if(g.pct===null){PM_MSG="Resolve this Binding action with your GM at the selected difficulty.";render();return;}
   const r=d100(),tier=resolveRoll(r,g.pct),out=spiritCommandOutcome(tier);
   if(!out){PM_MSG="Unknown Binding result; resolve with your GM.";render();return;}
   if(out.cost)S.play.magic=playCurMagic()-out.cost;
   if(out.broken)m.spiritStatus="unbound";
   if(tier==="Fumble"&&!S.xp.fumbled.includes(key))S.xp.fumbled.push(key);
   if(tier==="Critical")APP.markChecked(key);
   S.rollLog.unshift({label:"Bound spirit: "+m.name+" — Binding",pct:g.pct,roll:r===100?"00":r,tier,combat:false,oppTier:null,magic:"Command "+(out.obeyed?"succeeded":"failed")+", "+out.cost+" MP"+(out.broken?"; binding broken":"")});
   S.rollLog=S.rollLog.slice(0,8);
   PM_MSG=out.broken?"Fumble: the binding is broken. The spirit is now marked unbound; resolve its departure or hostility with the GM (Core p.136).":out.obeyed?"Binding succeeded. Resolve the spirit's specific action with the GM (Core p.136).":"Binding failed. The spirit ignores the command; resolve any consequences with the GM (Core p.136).";
   render();
 },
 // Cast a known piece of magic: roll the tradition's casting skill through
 // the same graded pipeline as any other roll, then apply the cost.
 //
 // Folk Magic's cost is the book's own result table — Critical costs nothing,
 // Success and Failure both cost 1 Magic Point (failure still burns the
 // point), Fumble costs 1d3. The other traditions use the entry's own
 // recorded cost where specific failure tables are unverified; Sorcery
 // specifically uses the Core Invocation cost table on p.165.
 castMagic(idx){
   if(viewOnlyBlock())return;
   PM_MSG=null;
   const m=allMagic()[idx];if(!m)return;
   const trad=MAGIC_TRAD_MAP[m.tradition];if(!trad)return;
   if(m.tradition==="animism"){
     PM_MSG="Animism requires a specific action: Trance, summoning (Core p.137), Binding, or spirit combat. Use the recorded spirit as a reference and resolve the action with your GM; generic spell casting is disabled to avoid inaccurate results.";
     render();return;
   }
   // Core p.165: Invocation roll takes place on the final turn of casting.
   // A Sorcery click starts/advances a tracker until that final turn. It does
   // not automatically spend action points or assume uninterrupted casting.
   if(m.tradition==="sorcery"){
     const total=sorceryCost(m).turns;
     const pending=S.play.sorceryCasting;
     if(pending && (pending.index!==idx || pending.name!==m.name || pending.total!==total)){
       PM_MSG="Another Sorcery invocation is underway. Cancel it before changing spells or shaping.";render();return;
     }
     if(total>1 && !pending){
       const err=magicCastPreflight(m,playCurMagic(),devotionalCur());
       if(err){PM_MSG=err;render();return;}
       S.play.sorceryCasting={index:idx,name:m.name,total,completed:1};
       PM_MSG="Sorcery casting turn 1 of "+total+" recorded. Advance on the next casting turn; roll Invocation only on the last turn (Core p.165).";render();return;
     }
     if(pending && pending.completed+1<pending.total){
       pending.completed++;PM_MSG="Sorcery casting turn "+pending.completed+" of "+pending.total+" recorded. No Invocation roll yet.";render();return;
     }
   }
   const blocking=magicCastPreflight(m,playCurMagic(),devotionalCur());
   if(blocking){PM_MSG=blocking;render();return;}
   const key=magicSkillKey(trad.castSkill);
   if(!key){PM_MSG="This character doesn't have the "+trad.castSkill+" skill, so there's nothing to roll. Add it as a Professional Skill first.";render();return;}
   const base=finalPct(key);const g=gradedPct(key,base);
   if(g.pct===null){PM_MSG=g.grade==="automatic"?"Automatic — the magic simply works.":"Hopeless — no casting can be attempted at this Grade.";render();return;}
   const r=d100();const tier=resolveRoll(r,g.pct);
   if(tier==="Fumble"&&!S.xp.fumbled.includes(key))S.xp.fumbled.push(key);
   if(tier==="Critical")APP.markChecked(key);
   let costTxt="",worked=(tier==="Critical"||tier==="Success");
   if(m.tradition==="folk"){
     const mp=tier==="Critical"?0:(tier==="Fumble"?d(3):1);
     // A fumble may demand more MP than remain; only deduct points owned.
     const paid=Math.min(mp,playCurMagic());
     if(paid>0)S.play.magic=playCurMagic()-paid;
     costTxt=mp===0?"no Magic Points (Critical)":paid+" Magic Point"+(paid!==1?"s":"")
       +(paid<mp?" ("+mp+" indicated by fumble; only "+paid+" available)":"");
   }else if(m.tradition!=="animism"){
     // Each tradition has its own spending outcome (Core pp.156, 165, 181).
     // Animism is not modeled as a generic spell cast; its Binding roll and
     // any spirit-summoning costs require the actual ritual context.
     const cost=m.tradition==="sorcery"?sorceryOutcomeCost(m,tier)
       :m.tradition==="theism"?theismOutcomeCost(m,tier)
       :m.tradition==="mysticism"?mysticismOutcomeCost(m,tier)
       :magicEntryCost(m);
     if(trad.pool==="devotional"){
       if(cost>devotionalCur()){PM_MSG="Not enough left in the Devotional Pool ("+devotionalCur()+" of "+devotionalMax()+") to invoke that.";render();return;}
       S.magic.devotionalUsed=(S.magic.devotionalUsed||0)+cost;
       costTxt=cost+" from the Devotional Pool";
     }else if(trad.pool==="mp"&&cost>0){
       S.play.magic=playCurMagic()-cost;
       costTxt=cost+" Magic Point"+(cost>1?"s":"");
     }else costTxt="no point cost";
   }else costTxt="nothing spent";
   const tag=g.grade!=="standard"?" ("+GRADE_LABEL[g.grade]+")":"";
   if(m.tradition==="sorcery")S.play.sorceryCasting=null;
   S.rollLog.unshift({label:magicLabel(m)+" — "+trad.castSkill+tag,pct:g.pct,
     roll:r===100?"00":r,tier,combat:false,oppTier:null,
     magic:(worked?"cast":"failed")+", "+costTxt});
   S.rollLog=S.rollLog.slice(0,8);render();},
 /* age bands (Experience Table) */
 // Changing band changes the Bonus Skill Points pool, so warn if points are
 // already sitting in it rather than silently invalidating that step.
 pickAge(key){
   if(!AGE_MAP[key]||S.age.category===key)return;
   const prev=S.age.category, spent=aSum("bonus"), oldPool=bonusPool();
   S.age.category=key;
   const nwPool=bonusPool();
   if(spent>0&&nwPool!==oldPool
      &&!confirm("This age band changes your Bonus Skill Points from "+oldPool+" to "+nwPool
        +". The "+spent+" points you have already allocated stay where they are, but the Bonus Skills step will need rebalancing to the new total. Continue?")){
     S.age.category=prev;render();return;}
   // Keep the rolled age honest against the band it now belongs to.
   const a=AGE_MAP[key];
   if(S.age.years!=null&&(S.age.years<a.base+a.n||S.age.years>a.base+a.n*6))S.age.years=null;
   render();},
 rollAge(){const a=ageBand();let t=a.base;for(let i=0;i<a.n;i++)t+=d(6);
   S.age.years=t;S.concept.age=String(t);render();},
 ageYears(v){const n=parseInt(v,10);S.age.years=Number.isFinite(n)?n:null;
   S.concept.age=Number.isFinite(n)?String(n):"";render();},
 // Official Core Background Events: keep rolled d100 results and a player's
 // brief summary, rather than reproducing the copyrighted table in the app.
 rollCoreBackgroundEvents(){
   const count=coreBackgroundRollCount();
   const saved=S.age.coreEvents||[];
   if(saved.length && !confirm("Replace your existing official Background Event rolls and notes?"))return;
   S.age.coreEvents=Array.from({length:count},()=>({roll:d100(),summary:""}));render();
 },
 editCoreBackgroundEvent(i,v){
   if(!S.age.coreEvents||!S.age.coreEvents[i])return;
   S.age.coreEvents[i].summary=String(v).slice(0,500);render();
 },
 clearCoreBackgroundEvents(){
   if(S.age.coreEvents?.length && !confirm("Clear official Background Event rolls and notes?"))return;
   S.age.coreEvents=[];render();
 },
 // Life Events: one per age band above Young (a Young character has barely
 // had time for any). House content, clearly flagged as such in the UI.
 rollLifeEvents(){
   const n=AGE_CATEGORIES.findIndex(a=>a.key===S.age.category);
   const count=Math.max(0,n);
   const pool=LIFE_EVENTS.slice();const picked=[];
   for(let i=0;i<count&&pool.length;i++)picked.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
   S.age.events=picked.map(e=>({t:e.t,effect:e.effect,applied:false}));
   render();},
 clearLifeEvents(){S.age.events=[];render();},
 delLifeEvent(i){S.age.events.splice(i,1);render();},
 // Apply an event's mechanical consequence through the app's existing
 // systems — a real Passion at its correct starting value, a real inventory
 // row, a real change to starting silver. Nothing bespoke.
 applyLifeEvent(i){
   const ev=S.age.events[i];if(!ev||ev.applied||!ev.effect)return;
   const f=ev.effect;
   if(f.type==="passion"){
     if(!S.passions.some(p=>p.name===f.name))
       S.passions.push({name:f.name,type:f.ptype||"org",subjPOW:"",subjCHA:""});
   }else if(f.type==="item"){
     S.inventory.push({name:f.name,qty:1,enc:f.enc||0});
   }else if(f.type==="silver"){
     // Expressed as a percentage of starting money so it scales with culture
     // and social class instead of being a flat number that means something
     // different to a Primitive and a Civilised character.
     const t=moneyTotal();
     if(!t){BUILDER_MSG="Roll your starting money on the Money & Gear step first — this event adjusts it by "+f.pct+"%.";render();return;}
     S.money.spent=Math.round((S.money.spent||0)-t*f.pct/100);
   }
   ev.applied=true;render();},
 /* species (non-human characters) */
 // Switching species changes the characteristic dice, so anything already
 // rolled or built is meaningless afterwards — same reasoning, and the same
 // confirmation, as switching character tier.
 pickSpecies(key){
   if(key!=="human" && key!=="" && key!==null && S.species!==key){alert("This species is legacy non-Core content and cannot be selected in Core-first mode.");return;}
   const nw=(key==="human"||!key)?(key||null):key;
   if(S.species===nw)return;
   if(charsReady()&&!confirm("Switching species resets your characteristics — each species rolls its own characteristic dice. Continue?"))return;
   S.species=nw;
   CHARS.forEach(c=>S.chars[c]=null);S.poolA=[];S.poolB=[];S.assignA={};S.assignB={};
   render();},
 // Non-human characteristics are rolled per characteristic off that species'
 // own dice, not from the two shared human pools (a dwarf's STR 2d6+9 and DEX
 // 3d6 aren't interchangeable, so there is nothing to allocate between).
 // Pulp/Paragon still get the book's "roll one extra die and drop the lowest"
 // treatment, generalised to whatever die the species uses.
 rollSpeciesAll(){const sp=speciesDef();if(!sp)return;
   CHARS.forEach(c=>{S.chars[c]=rollSpeciesChar(sp,c);});render();},
 rollSpeciesOne(c){const sp=speciesDef();if(!sp)return;
   S.chars[c]=rollSpeciesChar(sp,c);render();},
 speciesAverages(){const sp=speciesDef();if(!sp)return;
   CHARS.forEach(c=>{S.chars[c]=sp.avg[c];});render();},
 archetype(name){
   if(S.archetype===name)return;
   if(charsReady()&&!confirm("Switching character tier resets your characteristics — the dice and point-build pools differ by tier. Continue?"))return;
   S.archetype=name;S.archAdvantages=[];
   CHARS.forEach(c=>S.chars[c]=null);S.poolA=[];S.poolB=[];S.assignA={};S.assignB={};
   render();},
 toggleAdv(key){
   const n=ARCHETYPES[S.archetype].advantages;
   const i=S.archAdvantages.indexOf(key);
   if(i>=0)S.archAdvantages.splice(i,1);
   else{if(S.archAdvantages.length>=n)return;S.archAdvantages.push(key);}
   render();},
 setMode(mode){
   if(S.creationMode===mode)return;
   const hasWork=S.culture||S.career||S.qProf.some(Boolean)||aSum("culture")||aSum("career")||aSum("bonus")||aSum("quick");
   if(hasWork&&!confirm("Switching between Full Creation and Quick Character resets Culture/Career/Skill allocations made so far. Continue?"))return;
   S.creationMode=mode;
   S.culture=null;S.cultChoice=[];S.cultProf=[null,null,null];S.cultProfSpec=["","",""];S.cultStyleOn=false;S.cultStyleName="";
   S.career=null;S.carProf=[null,null,null];S.carProfSpec=["","",""];S.carStyles=[];
   S.customCareer={isCustom:false,name:"",std:[],prof:[],styleSlots:0};
   S.hobby=null;S.hobbySpec="";
   S.qProf=[null,null,null];S.qProfSpec=["","",""];S.qStyleOn=false;S.qStyleName="";
   S.alloc={culture:{},career:{},bonus:{},quick:{}};
   S.step=0;render();window.scrollTo(0,0);},
 qStyle(on){S.qStyleOn=on;if(on)S.alloc.quick["style:quick"]=5;else delete S.alloc.quick["style:quick"];this.skillsChanged();},
 /* culture */
 pickCulture(n){if(S.culture===n)return;S.culture=n;S.cultChoice=[];
   S.cultProf=[null,null,null];S.cultProfSpec=["","",""];S.alloc.culture={};
   CULTURES[n].std.forEach(sk=>{S.alloc.culture["std:"+sk]=5;});
   this.skillsChanged();},
 cultChoice(sk){const c=CULTURES[S.culture];const i=S.cultChoice.indexOf(sk);
   if(i>=0){S.cultChoice.splice(i,1);delete S.alloc.culture["std:"+sk];}
   else{if(S.cultChoice.length>=c.choice.pick){const removed=S.cultChoice.shift();delete S.alloc.culture["std:"+removed];}
     S.cultChoice.push(sk);S.alloc.culture["std:"+sk]=5;}
   this.skillsChanged();},
 cultStyle(on){S.cultStyleOn=on;if(!on){delete S.alloc.culture["style:cult"];delete S.alloc.career["style:cult"];delete S.alloc.bonus["style:cult"];
   S.carStyles.forEach(cs=>{if(cs&&cs.mode==="link")cs.mode="new";});}
   else S.alloc.culture["style:cult"]=0;
   this.skillsChanged();},
 pickProf(which,i,name){
   const picks=which==="cult"?S.cultProf:(which==="car"?S.carProf:S.qProf),
     specs=which==="cult"?S.cultProfSpec:(which==="car"?S.carProfSpec:S.qProfSpec);
   const ph=which==="cult"?"culture":(which==="car"?"career":"quick");
   if(picks[i]){delete S.alloc[ph][profKey(picks[i],specs[i])];}
   picks[i]=name||null;specs[i]="";
   if(name&&(which==="cult"||which==="quick"))S.alloc[ph][profKey(name,"")]=5;
   this.skillsChanged();},
 profSpec(which,i,v){
   const picks=which==="cult"?S.cultProf:(which==="car"?S.carProf:S.qProf),
     specs=which==="cult"?S.cultProfSpec:(which==="car"?S.carProfSpec:S.qProfSpec);
   const ph=which==="cult"?"culture":(which==="car"?"career":"quick");
   const old=profKey(picks[i],specs[i]);const nw=profKey(picks[i],v);
   if(S.alloc[ph][old]!==undefined&&old!==nw){S.alloc[ph][nw]=S.alloc[ph][old];delete S.alloc[ph][old];}
   specs[i]=v;this.skillsChanged();},
 /* career */
 pickCareer(n){
   if(n==="__custom__"){
     if(S.customCareer.isCustom&&S.career)return; // already locked in
     S.customCareer.isCustom=true;S.career=null;
     S.carProf=[null,null,null];S.carProfSpec=["","",""];S.alloc.career={};
     S.carStyles=Array(S.customCareer.styleSlots).fill(null).map(()=>({mode:"new",name:""}));
     this.skillsChanged();
   }else{
     if(S.career===n&&!S.customCareer.isCustom)return;
     S.customCareer.isCustom=false;S.career=n;
     S.carProf=[null,null,null];S.carProfSpec=["","",""];S.alloc.career={};
     S.carStyles=CAREERS[n].styleSlots.map(()=>({mode:"new",name:""}));this.skillsChanged();
   }
 },
 customCareerName(v){S.customCareer.name=v;
   if(v.trim()){S.career="__custom__";}else{S.career=null;}
   this.skillsChanged();},
 editCustomCareer(){if(S.customCareer.isCustom)S.career=null;render();window.scrollTo(0,0);},
 customCareerStd(skill){const i=S.customCareer.std.indexOf(skill);
   if(i>=0)S.customCareer.std.splice(i,1);
   else S.customCareer.std.push(skill);
   this.skillsChanged();},
 customCareerStyles(n){S.customCareer.styleSlots=n;
   const old=S.carStyles.length;
   if(n<old)S.carStyles=S.carStyles.slice(0,n);
   else for(let i=old;i<n;i++)S.carStyles.push({mode:"new",name:""});
   this.skillsChanged();},
 carStyleMode(i,m){const cs=S.carStyles[i];
   delete S.alloc.career[cs.mode==="link"?"style:cult":"style:k"+i];
   cs.mode=m;this.skillsChanged();},
 carStyleName(i,v){S.carStyles[i].name=v;this.skillsChanged();},
 skillsChanged(){reconcileSkillAllocations();render();},
 hobbySpec(v){S.hobbySpec=v;this.skillsChanged();},
 clearAllocation(phase,key){if(VIEW_ONLY)return;delete S.alloc[phase][key];render();},
 /* allocations */
 aAdj(ph,key,dir){const {pool,max}=phaseLimits(ph);
   const v=aGet(ph,key)+dir;
   if(v<0||v>max)return;
   if(dir>0&&aSum(ph)>=pool)return;
   S.alloc[ph][key]=v;render();},
 cultStyleSmallAlloc(v){S.cultStyleSmallAlloc=!!v;render();},
 aSet(ph,key,val){const {pool,max}=phaseLimits(ph);
   let v=Math.max(0,Math.min(max,parseInt(val,10)||0));
   const others=aSum(ph)-aGet(ph,key);
   v=Math.min(v,pool-others);
   S.alloc[ph][key]=v;render();},
 /* bonus */
 hobby(name){if(S.hobby){delete S.alloc.bonus[S.hobby==="__combat_style__"?"style:hobby":profKey(S.hobby,S.hobbySpec)];}
   S.hobby=name||null;S.hobbySpec="";this.skillsChanged();},
 /* Core Culture & Community, pp.21–25: narrative choices, not free mechanical bonuses. */
 communityField(key,value){
   if(!["family","parents","siblings","reputation","partyTie","resources"].includes(key))return;
   S.community[key]=String(value).slice(0,2000);render();
 },
 communityAdd(){debounceFire("communityAdd",()=>{S.community.connections.push({type:"Contact",name:"",notes:""});render();});},
 communityRemove(i){debounceFire("communityRemove"+i,()=>{if(i>=0&&i<S.community.connections.length)S.community.connections.splice(i,1);render();});},
 communityConnection(i,key,value){
   const row=S.community.connections[i];if(!row)return;
   if(key==="type")row.type=["Ally","Contact","Rival","Enemy"].includes(value)?value:"Contact";
   else if(key==="name"||key==="notes")row[key]=String(value).slice(0,key==="name"?160:1000);
   render();
 },
 /* cult & community */
 pickCult(key){S.cultMembership.archetype=(S.cultMembership.archetype===key)?null:key;
   if(S.cultMembership.archetype&&!S.cultMembership.rank)S.cultMembership.rank=0;render();},
 cultField(f,v){S.cultMembership[f]=(f==="rank")?(+v||0):v;render();},
 leaveCult(){S.cultMembership={archetype:null,name:"",rank:0};render();},
 /* passions */
 // Bound to both pointerdown and click in render.js (see the button markup
 // in stepPassions): a click immediately following an edit in another field
 // (e.g. typing a passion name then clicking "+ add passion" without
 // clicking elsewhere first) can have its click event resolve against a
 // stale button reference -- the preceding field's onchange fires on blur,
 // which calls render() and replaces the whole step's DOM, including this
 // button, before the click actually dispatches. pointerdown fires
 // immediately on press, before that blur/render cycle, so it isn't
 // affected; debounceFire absorbs the click that (still) follows it so a
 // normal press only ever adds one passion.
 addPas(){debounceFire('addPas',()=>{S.passions.push({name:"",type:"org",subjPOW:"",subjCHA:""});render();});},
 delPas(i){debounceFire('delPas'+i,()=>{S.passions.splice(i,1);render();});},
 pas(i,f,v){S.passions[i][f]=v;render();},
 pasFromCulture(){if(!S.culture)return;const c=CULTURES[S.culture];
   const types=["org","romantic","averse"];
   c.passions.forEach((name,i)=>{if(!S.passions.some(p=>p.name===name))
     S.passions.push({name,type:types[i]||"org",subjPOW:"",subjCHA:""});});
   render();},
 pasFromCult(){const a=cultArch();if(!a)return;
   const name=(a.passion||"Loyalty to ")+(S.cultMembership.name||a.name);
   if(!S.passions.some(p=>p.name===name))S.passions.push({name,type:"org",subjPOW:"",subjCHA:""});
   render();},
 /* money & inventory */
 rollMoney(){S.money.dice=[d(6),d(6),d(6),d(6)];render();},
 mon(f,v){
   if(f==="socialClass"){S.money[f]=v;render();return;}
   const n=Number(v);
   // Refuse invalid, negative or implausible currency entries rather than
   // silently converting them to zero and losing the player's input.
   if(!Number.isFinite(n)||n<0||(f==="mod"&&n===0))return;
   S.money[f]=n;render();},
 pickSocialClass(name){if(!name)return;const list=SOCIAL_CLASSES[S.culture]||[];
   const opt=list.find(([n])=>n===name);if(!opt)return;
   S.money.socialClass=opt[0];S.money.mod=opt[1];render();},
 // Same stale-DOM-click race addPas() guards against below -- these sit
 // right next to the item name/qty/enc fields in the Inventory table.
 invAdd(){debounceFire('invAdd',()=>{S.inventory.push({name:"",qty:1,enc:0,cost:0});render();});},
 invDel(i){debounceFire('invDel'+i,()=>{S.inventory.splice(i,1);render();});},
 inv(i,f,v){
   const it=S.inventory[i];if(!it)return;
   if(f==="name")it.name=v;
   else{const n=Number(v);if(!Number.isFinite(n)||n<0||(f==="qty"&&!Number.isInteger(n)))return;it[f]=n;}
   render();},
 /* weapons & armour */
 toggleWeapon(name){const i=S.gearWeapons.indexOf(name);
   if(i>=0)S.gearWeapons.splice(i,1);else S.gearWeapons.push(name);render();},
 setArmor(loc,material){S.armor[loc]=material;render();},
 /* combat style composition — any number of weapons/traits, Character Builder only */
 toggleStyleWeapon(key,name){toggleInList(styleDef(key).weapons,name);render();},
 toggleStyleTrait(key,name){toggleInList(styleDef(key).traits,name);render();},
 // Trait search re-renders on every keystroke (needed for live filtering,
 // not just on blur like every other field in this app) which would
 // normally cost the input its focus and cursor position the instant the
 // DOM gets replaced -- captured before render() and restored after.
 cstyleSearch(key,val){
   cstyleUI(key).search=val;
   const el=document.activeElement;
   const id=el&&el.id,start=el&&el.selectionStart,end=el&&el.selectionEnd;
   render();
   if(id){const fresh=document.getElementById(id);
     if(fresh){fresh.focus();try{fresh.setSelectionRange(start,end);}catch(e){}}}
 },
 // Native <details> open/closed state is lost on every re-render (the DOM
 // node is thrown away and rebuilt) unless remembered somewhere -- this is
 // exactly why picking a trait used to collapse its whole category back
 // down. No render() call needed here: the browser already opens/closes
 // the element on its own; this only has to remember that for next time.
 cstyleToggleCat(key,cat,isOpen){cstyleUI(key).openCats[cat]=isOpen;},
 /* roller */
 roll(key){const em=entryMap();const e=em[key];if(!e)return;
   PM_MSG=null;
   const base=finalPct(key);const g=gradedPct(key,base);
   if(g.pct===null){PM_MSG=g.grade==="automatic"?"Automatic — no roll needed, it just succeeds.":"Hopeless — no attempt can be made at this Grade.";render();return;}
   const pct=g.pct;const r=d100();
   const tag=g.grade!=="standard"?" ("+GRADE_LABEL[g.grade]+")":"";
   const tier=resolveRoll(r,pct);
   // Experience Rolls (core rulebook pp.71-73): a Fumble flags this skill
   // for a free +1% next time the player runs Improve Skills — automatic
   // here so nobody has to remember to mark it by hand. A Critical does NOT
   // grant that same automatic +1% (verified against the book — a common
   // misconception carried over from other d100 games); it DOES mark the
   // skill "checked" under the separate, newer checked-skill/Experience
   // Modifier system (Myth's reconstruction, not book-verified yet — see
   // xpBonusRolls() in engine.js) -- a different mechanic, not a
   // contradiction of the note above.
   if(tier==="Fumble"&&!S.xp.fumbled.includes(key))S.xp.fumbled.push(key);
   if(tier==="Critical")APP.markChecked(key);
   PM_EFFECT_ROLL_REF=null;
   S.rollLog.unshift({label:e.label+tag,pct,roll:r===100?"00":r,tier,combat:key.startsWith("style:"),oppTier:null});
   S.rollLog=S.rollLog.slice(0,8);render();},
 playSetOpponentTier(i,tier){if(VIEW_ONLY||!S.rollLog[i]||!["Critical","Success","Failure","Fumble"].includes(tier))return;
   S.rollLog[i].oppTier=tier;S.rollLog[i].effectsPicked=[];render();},
 playChooseEffect(i){if(VIEW_ONLY)return;
   const r=selectedEffectRoll(), effect=SPECIAL_EFFECTS[i];if(!canPickEffectForRoll(effect,r))return;
   const picked=r.effectsPicked||[];
   if(picked.length>=playEffectsWon(r.tier,r.oppTier)||(!effect[5]&&picked.includes(effect[0])))return;
   r.effectsPicked=[...picked,effect[0]];render();},
 playRemoveEffectChoice(i){if(VIEW_ONLY)return;
   const r=selectedEffectRoll();if(!r||!Number.isInteger(i)||i<0||i>=(r.effectsPicked||[]).length)return;
   r.effectsPicked.splice(i,1);render();},
 /* ---- Experience Rolls / Improve Skills (core rulebook pp.71-73) ---- */
 openXP(){XP_OPEN=true;render();},
 closeXP(){XP_OPEN=false;render();},
 xpAward(v,applyModifier=false){if(VIEW_ONLY)return;const n=parseInt(v,10);if(!Number.isFinite(n)||n===0)return;
   S.xp.pool=Math.max(0,S.xp.pool+n+(n>0&&applyModifier?xpMod(S.chars.CHA):0));
   render();},
 xpToggleFumble(key){const i=S.xp.fumbled.indexOf(key);
   if(i>=0)S.xp.fumbled.splice(i,1);else S.xp.fumbled.push(key);render();},
 // Manual "checked" toggle for a dramatic non-crit success the app can't
 // detect algorithmically -- same interaction as xpToggleFumble above, just
 // a different flag. See markChecked() for the auto-set path (a Critical,
 // in-app or manually logged) and xpSpend() for how a checked skill's own
 // flag clears when its Experience Roll gets spent.
 xpToggleChecked(key){const i=S.xp.checked.indexOf(key);
   if(i>=0)S.xp.checked.splice(i,1);else S.xp.checked.push(key);render();},
 // Auto-set path for a Critical on the app's own roller (roll()/castMagic()
 // below) -- the ✓ flag itself is also directly toggleable by hand
 // (xpToggleChecked above) for a physical-dice Critical or a dramatic
 // non-crit success the app can't detect on its own.
 markChecked(key){if(!S.xp.checked.includes(key))S.xp.checked.push(key);},
 // Apply a flagged skill's free Fumble +1% on its own, without spending an
 // Experience Roll (the book grants this unconditionally, not just when a
 // roll happens to also be spent on that skill).
 xpApplyFumble(key){if(!S.xp.fumbled.includes(key))return;
   const e=entryMap()[key];if(!e)return;
   S.xp.bonus[key]=(S.xp.bonus[key]||0)+1;
   S.xp.fumbled=S.xp.fumbled.filter(k=>k!==key);
   S.xp.history.unshift({type:"fumble",key,label:e.label,newPct:finalPct(key)});
   S.xp.history=S.xp.history.slice(0,25);render();},
 // Core p.72: each banked roll buys an improvement attempt at the current %.
 // Apply a pending fumble bonus before determining that current percentage.
 xpSpend(key){if(VIEW_ONLY||xpRollsAvailable()<=0)return;
   const e=entryMap()[key];if(!e)return;
   let fumbleApplied=false;
   if(S.xp.fumbled.includes(key)){
     S.xp.bonus[key]=(S.xp.bonus[key]||0)+1;
     S.xp.fumbled=S.xp.fumbled.filter(k=>k!==key);
     fumbleApplied=true;
   }
   const target=finalPct(key);
   const r=d100();const total=r+S.chars.INT;
   const success=total>=target;
   const gain=success?(d(4)+1):1;
   S.xp.bonus[key]=(S.xp.bonus[key]||0)+gain;
   S.xp.checked=S.xp.checked.filter(k=>k!==key);
   S.xp.pool=Math.max(0,S.xp.pool-1);
   S.xp.history.unshift({type:"roll",key,label:e.label,roll:r===100?"00":r,int:S.chars.INT,total,target,success,gain,fumbleApplied,newPct:finalPct(key)});
   S.xp.history=S.xp.history.slice(0,25);render();},
 // On-demand Difficulty Grade reference popover (Play Mode). Deliberately
 // bypasses render() — it's transient UI state, not character state, so it's
 // built/positioned/torn down directly against the DOM rather than round-
 // tripping through the full re-render. A second click on the same %, a
 // click anywhere else, or Escape all close it.
 toggleGradePop(key,label,ev){
   ev.stopPropagation();
   const old=$("#gradePop");
   const wasThis=old&&old.dataset.key===key;
   if(old)APP._closeGradePop();
   if(wasThis)return;
   const rows=gradeRefRows(key);
   const cur=gradeForEntry(key);
   let h='<div class="pm-gradepop-hd">'+esc(label)+'</div><table>'
    +rows.map(r=>'<tr class="'+(r.g===cur?"cur":"")+'"><td class="g">'+esc(r.label)+'</td><td class="p">'+r.text+'</td></tr>').join("")
    +'</table>';
   if(cur!==ACTIVE_GRADE)h+='<div class="pm-gradepop-note">&#9733; This skill rolls one Grade easier than the Active Grade (Advantage) &mdash; highlighted row is what you actually use.</div>';
   const pop=document.createElement("div");
   pop.id="gradePop";pop.className="pm-gradepop";pop.dataset.key=key;
   pop.innerHTML=h;
   document.body.appendChild(pop);
   const r=ev.currentTarget.getBoundingClientRect();
   const pw=pop.offsetWidth,ph=pop.offsetHeight;
   let left=Math.min(r.left,window.innerWidth-pw-8);
   let top=r.bottom+6;
   if(top+ph>window.innerHeight-8)top=r.top-ph-6;
   pop.style.left=Math.max(8,left)+"px";
   pop.style.top=Math.max(8,top)+"px";
   setTimeout(()=>{
     document.addEventListener("click",APP._gradePopOutside);
     document.addEventListener("keydown",APP._gradePopEsc);
   },0);
 },
 _closeGradePop(){
   const pop=$("#gradePop");if(pop)pop.remove();
   document.removeEventListener("click",APP._gradePopOutside);
   document.removeEventListener("keydown",APP._gradePopEsc);
 },
 _gradePopOutside(e){const pop=$("#gradePop");if(pop&&!pop.contains(e.target))APP._closeGradePop();},
 _gradePopEsc(e){if(e.key==="Escape")APP._closeGradePop();},
 setGrade(g){ACTIVE_GRADE=g;render();},
 /* play mode */
 toPlay(){APPVIEW="play";XP_OPEN=false;render();window.scrollTo(0,0);},
 backFromPlay(){
   if(VIEW_ONLY||PLAY_RETURN_VIEW==="board"){APP.toBoard(CURRENT_CAMPAIGN_ID);return;}
   APPVIEW="character";render();window.scrollTo(0,0);},
 /* standalone Character Sheet view (print/reference) */
 toSheet(returnTo){SHEET_RETURN_VIEW=returnTo||"play";APPVIEW="sheet";render();window.scrollTo(0,0);},
 backFromSheet(){APPVIEW=SHEET_RETURN_VIEW;render();window.scrollTo(0,0);},
 // My Characters card → Print: loads the character (same loader as Play/Edit)
 // then jumps straight to the sheet view instead of Play Mode or the builder.
 openCharToSheet(id){
   openCharUnified(id).then(entry=>{if(!entry)return;S=Object.assign(freshState(),entry.state);if(!Object.prototype.hasOwnProperty.call(entry.state,"_creationFlowVersion"))S._creationFlowVersion=1;normalizeState();
     S._libId=entry.id;S.campaignId=entry.campaignId;S._ownerId=entry.ownerId;
     S._pendingClaim=(entry.ownerId==="local");
     SHEET_RETURN_VIEW="library";APPVIEW="sheet";render();window.scrollTo(0,0);});},
 // Primary damage flow (see pmLocDetail in play.js): takes damage after parry
 // an attack rolled and subtracts this location's armour AP automatically
 // (core p.27) before applying it to HP, instead of making the player look
 // up the AP and do that subtraction by hand every single hit. Sets
 // PM_DMG_NOTE so the panel can show its work ("12 dealt − 4 AP → 8 taken")
 // rather than just silently updating the HP number.
 playApplyDamage(loc){if(viewOnlyBlock())return;const el=$("#playdmg-"+loc.replace(/\s+/g,"_"));const raw=el?Number(el.value):NaN;
   if(!Number.isSafeInteger(raw)||raw<=0)return;
   const armLoc=PLAY_LIMB_BASE[loc]||loc,ap=armorApAt(armLoc);
   const applied=Math.max(0,raw-ap);
   // Floor at -maxHP (not 0) so Major Wound (<=-max, core pp.109-111) stays
   // reachable — clamping at 0 made Major Wound permanently dead code.
   S.play.hp[loc]=Math.max(-playMaxHP(loc),playCurHP(loc)-applied);
   PM_DMG_NOTE={loc,raw,ap,applied};
   if(el)el.value="";render();},
 playHeal(loc){if(viewOnlyBlock())return;const el=$("#playdmg-"+loc.replace(/\s+/g,"_"));const n=el?Number(el.value):NaN;
   if(!Number.isSafeInteger(n)||n<=0)return;
   S.play.hp[loc]=Math.min(playMaxHP(loc),playCurHP(loc)+n);if(el)el.value="";render();},
 playSetHP(loc,v){if(viewOnlyBlock())return;S.play.hp[loc]=playValidHP(v,playMaxHP(loc));render();},
 // Fixed-amount direct HP adjustment (−1/−3), deliberately bypassing armour
 // entirely -- for damage that was never subject to AP in the first place
 // (poison, fire, GM fiat), not a shortcut for a
 // weapon hit. See the "Ignores armour" row in pmLocDetail.
 playQuickDamage(loc,n){if(viewOnlyBlock())return;S.play.hp[loc]=Math.max(-playMaxHP(loc),playCurHP(loc)-n);render();},
 // Selecting a location just opens the detail panel — read-only navigation,
 // always allowed even in a VIEW_ONLY session. Clears any damage-math note
 // left over from a different location so it can never show under the
 // wrong one.
 playSelectLoc(loc){S.play.selectedLoc=(S.play.selectedLoc===loc)?null:loc;PM_DMG_NOTE=null;render();},
 // Clickable pip trackers (Action/Luck Points) — click a filled pip to spend
 // it and every pip after it; click a hollow pip to restore it and every pip
 // before it. Same "slide the boundary" interaction as HP-dot trackers in
 // other VTT/sheet tools, translated onto the existing apUsed-count /
 // remaining-value state (no new per-pip identity needed since the points
 // are fungible).
 playApSetPip(i){if(viewOnlyBlock())return;const max=playMaxAP();const remain=max-Math.min(S.play.apUsed,max);
   const newRemain=i<remain?i:i+1;
   S.play.apUsed=Math.max(0,Math.min(max,max-newRemain));render();},
 // Actions tab: clicking an action button actually spends its AP cost
 // instead of just displaying it — clamped so it can never go past max
 // (a button is disabled client-side once there isn't enough left, but
 // this clamp is the real backstop).
 playSpendAP(cost){if(viewOnlyBlock())return;const max=playMaxAP();
   S.play.apUsed=Math.max(0,Math.min(max,S.play.apUsed+cost));render();},
 // "New Round" — Action Points refresh to max at the start of every
 // Combat Round in Mythras; this is that reset, since nothing else in
 // Play Mode currently tracks round boundaries.
 playNewRound(){if(viewOnlyBlock())return;S.play.apUsed=0;render();},
 playLuckSetPip(i){if(viewOnlyBlock())return;const max=playMaxLuck();const cur=playCurLuck();
   const newCur=i<cur?i:i+1;
   S.play.luck=Math.max(0,Math.min(max,newCur));render();},
 playMagicAdj(d){if(viewOnlyBlock())return;S.play.magic=Math.max(0,Math.min(playMaxMagic(),playCurMagic()+d));render();},
 playSetFatigue(v){if(viewOnlyBlock())return;if(!FATIGUE_MAP[v])return;S.play.fatigue=v;render();},
 // Step one level up or down the Fatigue track — the common case in play is
 // "failed an Endurance roll, take a level", not picking off a dropdown.
 playFatigueAdj(d){if(viewOnlyBlock())return;
   const i=FATIGUE_LEVELS.indexOf(S.play.fatigue||"Fresh");
   S.play.fatigue=FATIGUE_LEVELS[Math.max(0,Math.min(FATIGUE_LEVELS.length-1,(i<0?0:i)+d))];render();},
 // Inventory edits in Play Mode — allowed for the owner (VIEW_ONLY is false)
 // and, as a narrow exception, for the campaign DM (VIEW_ONLY_IS_DM), for
 // loot distribution / adding or removing gear mid-session. Blocked for a
 // plain party member looking at a teammate's sheet. See inventoryBlock().
 playInvAdd(){if(inventoryBlock())return;S.inventory.push({name:"",qty:1,enc:0,cost:0});render();},
 playInvDel(i){if(inventoryBlock())return;S.inventory.splice(i,1);render();},
 playInv(i,f,v){if(inventoryBlock())return;
   const it=S.inventory[i];if(!it)return;
   if(f==="name")it.name=v;
   else {const n=Number(v);if(!Number.isFinite(n)||n<0||(f==="qty"&&!Number.isInteger(n)))return;it[f]=n;}
   render();},
 // Switching tabs (Actions/Special Effects/Inventory/Features/Notes) is
 // read-only navigation, always allowed even in a VIEW_ONLY session.
 playTab(t){S.play.tab=t;render();},
 // Keep the next step of a combat roll visible after the sheet redraws.
 playJumpToEffects(i=null){PM_EFFECT_ROLL_REF=Number.isInteger(i)?S.rollLog[i]||null:null;PM_FX_SEARCH="";S.play.tab="effects";render();requestAnimationFrame(()=>{
   const panel=$("#pm-actions");if(panel)panel.scrollIntoView({block:"start"});
 });},
 playJumpToInjury(){requestAnimationFrame(()=>{
   const panel=$("#pm-vitals");if(panel)panel.scrollIntoView({block:"start"});
 });},
 /* export / import */
 exportJSON(){const data=JSON.stringify(S,null,2);
   dl((S.concept.name||"character").replace(/\s+/g,"_")+".mythras.json",data,"application/json");},
 exportMD(){dl((S.concept.name||"character").replace(/\s+/g,"_")+".md",buildMD(),"text/markdown");},
 // A downloaded JSON file is a portable backup. Import creates a separate
 // character, never silently claims an existing cloud or local library ID.
 chooseImport(){if(!AUTH_USER&&!MOCK_AUTH){APP.toAccount();return;}const input=document.getElementById("characterImportFile");if(input){input.value="";input.click();}},
 async importCharacterFile(input){
   if(!AUTH_USER&&!MOCK_AUTH){APP.toAccount();return;}
   const file=input&&input.files&&input.files[0];if(!file)return;
   const fromLibrary=APPVIEW==="library";
   const showError=msg=>{if(fromLibrary)CAMP_MSG=msg;else MENU_MSG=msg;render();};
   if(file.size>2*1024*1024){showError("Import failed: file exceeds the 2 MB character limit.");return;}
   let imported;
   try{imported=JSON.parse(await file.text());}catch(e){showError("Import failed: this is not valid JSON.");return;}
   const problem=characterImportProblem(imported);
   if(problem){showError("Import failed: "+problem);return;}
   if(hasUnsavedWork()&&!confirm("Import this character? The current character will remain in My Characters, but the character open on screen will change. Export a backup first if needed."))return;
   const blank=freshState(),restored=freshState();
   for(const key of Object.keys(blank))if(Object.prototype.hasOwnProperty.call(imported,key)){
     // Older exports may omit fields added in subsequent releases. Keep
     // newer defaults without discarding values the player actually saved.
     const incoming=imported[key],defaults=blank[key];
     restored[key]=(incoming&&defaults&&typeof incoming==="object"&&typeof defaults==="object"&&!Array.isArray(incoming)&&!Array.isArray(defaults))
       ?Object.assign({},defaults,incoming):incoming;
   }
   if(!Object.prototype.hasOwnProperty.call(imported,"_creationFlowVersion"))restored._creationFlowVersion=1;
   // Never reuse an identity from the export: that could overwrite another
   // character or make a browser guest appear to own a cloud row.
   restored._libId=null;restored._ownerId=null;restored.campaignId=null;
   restored._libLastSaved=null;restored._pendingClaim=true;
   const previous=S;
   try{
     S=restored;normalizeState();
     if(!cloudActive())saveCurrentToLibraryLocal();
     APPVIEW="character";MENU_MSG=null;CAMP_MSG=null;
     render();window.scrollTo(0,0);
   }catch(e){
     // Failed imports must preserve the character already open on screen.
     S=previous;APPVIEW=fromLibrary?"library":"menu";
     showError("Import failed: the data was invalid or could not be saved. Your previous character was preserved.");
   }
 },
 chooseGuestBackupImport(){const input=document.getElementById("guestBackupImportFile");if(input){input.value="";input.click();}},
 async importGuestBackupFile(input){
   const file=input&&input.files&&input.files[0];if(!file)return;
   const fail=msg=>{MENU_MSG=msg;APPVIEW="menu";render();};
   if(cloudActive()){fail("Guest backups cannot be imported during a signed-in cloud session.");return;}
   if(file.size>10*1024*1024){fail("Guest backup is larger than the 10 MB limit.");return;}
   let backup;
   try{backup=JSON.parse(await file.text());}catch(e){fail("Guest backup is not valid JSON.");return;}
   if(!backup||backup.format!=="mythras-forge-guest-backup"||backup.version!==1||!Array.isArray(backup.characters)){
     fail("That file is not a supported Forge guest backup.");return;
   }
   if(backup.characters.length>100){fail("Backup contains more than 100 characters; split it into smaller backups.");return;}
   for(const entry of backup.characters){
     if(!entry||typeof entry!=="object"||characterImportProblem(entry.state)){
       fail("The backup contains an invalid character; nothing was imported.");return;
     }
   }
   if(!confirm("Restore "+backup.characters.length+" guest characters? They will be added as NEW local copies; existing characters will not be replaced."))return;
   const oldLib=loadCharLibLocal();
   const added=backup.characters.map(e=>{
     const state=JSON.parse(JSON.stringify(e.state));
     state._libId=null;state._ownerId=null;state.campaignId=null;state._libLastSaved=null;state._pendingClaim=true;
     const id=genId();state._libId=id;
     return {id,campaignId:null,name:state.concept.name||"Unnamed Character",tier:state.archetype||"ordinary",
       culture:state.culture||"",career:state.career||"",savedAt:Date.now(),state};
   });
   try{saveCharLibListLocal(oldLib.concat(added));
     // Verify persistence before promising restore succeeded (Safari private
     // mode and storage quotas can reject or discard large writes).
     if(loadCharLibLocal().length!==oldLib.length+added.length)throw new Error("storage rejected backup");
     MENU_MSG="Imported "+added.length+" guest characters into My Characters. Existing characters were preserved.";
   }catch(e){fail("Restore failed: browser storage may be full or disabled. Your previous characters remain intact.");return;}
   APPVIEW="menu";render();
 },
 exportGuestBackup(){
   if(cloudActive()){MENU_MSG="Use character Export JSON for cloud characters. Guest backups only include local characters.";render();return;}
   const chars=loadCharLibLocal();
   if(!chars.length){MENU_MSG="No locally saved characters to back up yet.";render();return;}
   dl("mythras-guest-backup-"+new Date().toISOString().slice(0,10)+".json",JSON.stringify({format:"mythras-forge-guest-backup",version:1,exportedAt:new Date().toISOString(),characters:chars},null,2),"application/json");
 },
 newCharacter(){
   const hasWork=S.concept.name||charsReady()||S.culture||S.career;
   if(hasWork&&!confirm("Start a new character? This clears the current one from the screen (autosave and any exported files are unaffected until overwritten)."))return;
   S=freshState();render();window.scrollTo(0,0);},
 clearAutosave(){try{localStorage.removeItem(autosaveKey());}catch(e){}updateAutosaveTag();},
 /* main menu */
 toMenu(){APPVIEW="menu";MENU_MSG=null;render();window.scrollTo(0,0);},
 /* Rules Wiki -- see wiki.js/wiki-data.js. wikiOpen with just a chapterId
    opens that chapter at the top; passed a sectionId too (from a search
    result several subsections deep) it also scrolls to that heading once
    the chapter's HTML has actually landed in the DOM. */
 toWiki(){APPVIEW="wiki";WIKI_CHAPTER=null;render();window.scrollTo(0,0);},
 wikiOpen(chapterId,sectionId){
   WIKI_CHAPTER=chapterId;APPVIEW="wiki";render();
   if(sectionId&&sectionId!==chapterId){
     setTimeout(()=>{const el=document.getElementById("wsec-"+sectionId);if(el)el.scrollIntoView({block:"start"});},30);
   }else window.scrollTo(0,0);
 },
 wikiBack(){WIKI_CHAPTER=null;render();window.scrollTo(0,0);},
 fromMenuNew(){
   // Character creation requires a real account once cloud sync is
   // configured -- no more "build anonymously, sign in later" limbo (see
   // signOut's local-data wipe below, which is what this gate exists to
   // keep meaningful). MOCK_AUTH still bypasses it, matching the carve-out
   // newCampaign()/homeJoinCampaign() already give the local-only test
   // identity elsewhere in this file.
   // This handler is reachable from two views -- the Main Menu's own
   // button (reads MENU_MSG) and My Characters' "Create New Character"
   // empty-state button (reads CAMP_MSG, same as its delete-error
   // messages) -- so the gate has to set whichever message variable the
   // CURRENT view actually renders, or clicking it from My Characters
   // silently does nothing: the message lands in a variable nobody's
   // reading, no navigation happens either. Setting both costs nothing.
   if(!AUTH_USER&&!MOCK_AUTH){MENU_MSG="Sign in first — creating a character needs an account.";CAMP_MSG=MENU_MSG;render();return;}
   if(hasUnsavedWork()&&!confirm("Start a new character? This clears the one currently loaded (autosave and exports are unaffected until overwritten)."))return;
   S=freshState();APPVIEW="character";render();window.scrollTo(0,0);},
 fromMenuContinue(){
   // Same account gate as fromMenuNew() -- this was the actual hole: the
   // "Continue as X" link reads the autosave slot directly and never
   // checked auth state, so it bypassed the Main Menu's sign-in requirement
   // entirely. Left unfixed, it's also self-sustaining -- landing in the
   // builder this way still calls saveAutosave() on every render, which
   // re-writes the very ":local" slot this reads from (see cloud.js), so
   // the loophole would keep recreating itself even after a sign-out wipe.
   if(!AUTH_USER&&!MOCK_AUTH){MENU_MSG="Sign in first — creating a character needs an account.";render();return;}
   const info=getAutosaveInfo();if(!info)return;
   if(hasUnsavedWork()&&!confirm("Load the autosaved character? This replaces what's currently loaded."))return;
   try{const raw=localStorage.getItem(autosaveKey());const saved=JSON.parse(raw);
     S=Object.assign(freshState(),saved.S);if(!Object.prototype.hasOwnProperty.call(saved.S,"_creationFlowVersion"))S._creationFlowVersion=1;normalizeState();S._pendingClaim=true;APPVIEW="character";render();window.scrollTo(0,0);
   }catch(e){MENU_MSG="Could not load the autosaved character.";render();}},
 /* my characters */
 toLibrary(){APPVIEW="library";LIB_CACHE=null;CAMP_MSG=null;render();loadLibraryUnified();window.scrollTo(0,0);},
 openCharToPlay(id,opts){
   openCharUnified(id).then(async entry=>{if(!entry)return;S=Object.assign(freshState(),entry.state);if(!Object.prototype.hasOwnProperty.call(entry.state,"_creationFlowVersion"))S._creationFlowVersion=1;normalizeState();
     S._libId=entry.id;S.campaignId=entry.campaignId;S._ownerId=entry.ownerId;
     S._pendingClaim=(entry.ownerId==="local");
     const viewingOther=cloudActive()&&entry.ownerId!=null&&entry.ownerId!==AUTH_USER.id;
     VIEW_ONLY=viewingOther;
     VIEW_ONLY_IS_DM=viewingOther?await isDmOfCampaign(entry.campaignId):false;
     VIEW_ONLY_OWNER_NAME=(opts&&opts.ownerName)||null;
     PLAY_RETURN_VIEW=(opts&&opts.returnTo)||"menu";
     APPVIEW="play";XP_OPEN=false;render();window.scrollTo(0,0);});},
 openCharToEdit(id){
   openCharUnified(id).then(entry=>{if(!entry)return;S=Object.assign(freshState(),entry.state);if(!Object.prototype.hasOwnProperty.call(entry.state,"_creationFlowVersion"))S._creationFlowVersion=1;normalizeState();
     S._libId=entry.id;S.campaignId=entry.campaignId;S._ownerId=entry.ownerId;
     S._pendingClaim=(entry.ownerId==="local");
     APPVIEW="character";render();window.scrollTo(0,0);});},
 deleteLibChar(id,name){
   if(!confirm('Delete "'+name+'"? This can\'t be undone — Export JSON first if you want a copy.'))return;
   deleteCharUnified(id).then(()=>{LIB_CACHE=null;render();loadLibraryUnified();})
     .catch(e=>{CAMP_MSG="Could not delete character: "+e.message;render();});},
 /* account */
 toAccount(){APPVIEW="account";AUTH_MSG=null;render();window.scrollTo(0,0);},
 mockSignIn(){
   if(!GUEST_TEST_ENABLED){APP.toAccount();return;}
   // This is a browser-only guest, not a Supabase user or fake cloud identity.
   MOCK_AUTH={id:"guest-local",display_name:"Guest"};
   try{localStorage.setItem(GUEST_SESSION_KEY,"1");}catch(e){}
   MENU_MSG=null;CAMP_MSG=null;CAMP_CACHE=null;
   APPVIEW="menu";render();},
 mockSignOut(){
   // Leave locally saved characters intact; exiting guest mode isn't deletion.
   MOCK_AUTH=null;
   try{localStorage.removeItem(GUEST_SESSION_KEY);}catch(e){}
   CAMP_CACHE=null;APPVIEW="menu";render();},
 /* campaigns */
 toCampaigns(){APPVIEW="campaigns";CAMP_CACHE=null;CAMP_MSG=null;render();loadCampaignsUnified();window.scrollTo(0,0);},
 newCampaign(){
   if(!AUTH_USER&&!MOCK_AUTH){CAMP_MSG="Sign in first — campaigns need an account once cloud sync is on.";render();return;}
   createCampaignUnified("New Campaign").then(camp=>{
     CURRENT_CAMPAIGN_ID=camp.id;APPVIEW="campaign";CAMPAIGN_VIEW=null;render();
     loadCampaignViewUnified(camp.id);window.scrollTo(0,0);
   }).catch(e=>{CAMP_MSG="Could not create campaign: "+e.message;render();});},
 openCampaign(id){CURRENT_CAMPAIGN_ID=id;APPVIEW="campaign";CAMPAIGN_VIEW=null;CAMP_MSG=null;render();
   loadCampaignViewUnified(id);window.scrollTo(0,0);},
 campField(f,v){
   const camp=CAMPAIGN_VIEW&&CAMPAIGN_VIEW.campaign;if(!camp)return;
   camp[f]=v;render(); // optimistic — reflect the edit immediately
   const fn=f==="name"?renameCampaignUnified:noteCampaignUnified;
   fn(camp.id,v).catch(e=>{CAMP_MSG="Could not save: "+e.message;render();});},
 deleteCampaign(){
   const camp=CAMPAIGN_VIEW&&CAMPAIGN_VIEW.campaign;if(!camp)return;
   if(!confirm("Delete campaign \""+camp.name+"\"? Linked characters stay in place, just unassigned."))return;
   deleteCampaignUnified(camp.id).then(()=>{APPVIEW="campaigns";CAMP_CACHE=null;render();loadCampaignsUnified();})
     .catch(e=>{CAMP_MSG="Could not delete campaign: "+e.message;render();});},
 newCharacterForCampaign(){
   if(!AUTH_USER&&!MOCK_AUTH){CAMP_MSG="Sign in first — creating a character needs an account.";render();return;}
   if(hasUnsavedWork()&&!confirm("Start a new character for this campaign? This clears the one currently loaded (autosave and exports are unaffected until overwritten)."))return;
   const cid=CURRENT_CAMPAIGN_ID;S=freshState();S.campaignId=cid;APPVIEW="character";render();window.scrollTo(0,0);},
 assignPicked(){
   const sel=$("#assignPicker");if(!sel||!sel.value)return;
   assignCharUnified(sel.value,CURRENT_CAMPAIGN_ID)
     .then(()=>loadCampaignViewUnified(CURRENT_CAMPAIGN_ID))
     .catch(e=>{CAMP_MSG="Could not assign character: "+e.message;render();});},
 openLibChar(id){
   if(hasUnsavedWork()&&!confirm("Open this character? This replaces what's currently loaded."))return;
   openCharUnified(id).then(entry=>{
     if(!entry)return;
     S=Object.assign(freshState(),entry.state);if(!Object.prototype.hasOwnProperty.call(entry.state,"_creationFlowVersion"))S._creationFlowVersion=1;normalizeState();
     S._libId=entry.id;S.campaignId=entry.campaignId;S._ownerId=entry.ownerId;
     APPVIEW="character";render();window.scrollTo(0,0);
   }).catch(e=>{CAMP_MSG="Could not open character: "+e.message;render();});},
 unassignChar(id){
   unassignCharUnified(id).then(()=>loadCampaignViewUnified(CURRENT_CAMPAIGN_ID))
     .catch(e=>{CAMP_MSG="Could not unassign character: "+e.message;render();});},
 // DM detaching a PLAYER's character (not their own) from the campaign —
 // routes through the dm_unassign_character RPC, never a direct table
 // write. The DM can only do this, never delete the character outright.
 dmUnassignChar(id){
   if(!confirm("Unassign this character from the campaign? The character itself is untouched, just no longer linked here."))return;
   cloudDmUnassignCharacter(id).then(()=>loadCampaignViewUnified(CURRENT_CAMPAIGN_ID))
     .catch(e=>{CAMP_MSG="Could not unassign character: "+e.message;render();});},
 /* party board */
 toBoard(campaignId){
   if(campaignId)CURRENT_CAMPAIGN_ID=campaignId;
   APPVIEW="board";BOARD_CHARS=null;BOARD_TAB="status";render();window.scrollTo(0,0);
   boardLoad(CURRENT_CAMPAIGN_ID);},
 refreshBoard(){if(CURRENT_CAMPAIGN_ID)boardRefetch(CURRENT_CAMPAIGN_ID);},
 boardOpenChar(id,ownerName){
   APP.openCharToPlay(id,{ownerName:ownerName||null,returnTo:"board"});},
 /* GM Combat Tracker (see cloud.js: sessionStateOf/combatantFromPc/
    combatantFromNpc/COMBAT_EFFECT_TYPES/tickCombatEffects) + session notes —
    one shared optimistic mutate-then-save helper, same pattern as
    campField() above: mutate the in-memory session_state, render()
    immediately, fire the write in the background, surface a failure inline
    rather than losing the edit. */
 setBoardTab(tab){BOARD_TAB=tab;render();},
 gmSessionMutate(mutatorFn){
   const camp=CAMPAIGN_VIEW&&CAMPAIGN_VIEW.campaign;if(!camp)return;
   const st=sessionStateOf(camp);
   const before=st.combatants.slice().sort((a,b)=>b.init-a.init);
   if(!st.activeId&&before.length)st.activeId=before[Math.min(st.turnIdx,before.length-1)].id;
   mutatorFn(st);
   const after=st.combatants.slice().sort((a,b)=>b.init-a.init);
   if(!after.some(c=>c.id===st.activeId))st.activeId=after.length?after[0].id:null;
   st.turnIdx=Math.max(0,after.findIndex(c=>c.id===st.activeId));
   camp.session_state=st;
   GM_SESSION_ERROR=null;render();
   sessionStateCampaignUnified(camp.id,st).catch(e=>{GM_SESSION_ERROR="Could not save: "+e.message;render();});
 },
 gmFindCombatant(st,id){return st.combatants.find(c=>c.id===id);},
 gmAddPcInit(){
   const sel=$("#gmPcPicker");if(!sel||!sel.value)return;
   const charId=sel.value;
   APP.gmSessionMutate(st=>st.combatants.push(combatantFromPc(charId,0)));},
 // Nice-to-have: add every party member not already in the fight, in one
 // click, instead of picking them one at a time.
 gmAddAllPcs(){
   const inFight=new Set(); // recomputed fresh, not reused from render, since this can run right after gmAddPcInit
   APP.gmSessionMutate(st=>{
     st.combatants.forEach(c=>{if(c.kind==="pc")inFight.add(c.ref);});
     (BOARD_CHARS||[]).forEach(c=>{if(!inFight.has(c.id))st.combatants.push(combatantFromPc(c.id,0));});
   });},
 gmAddNpcInit(){
   const nameEl=$("#gmNpcInitName"),valEl=$("#gmNpcInitVal");
   const name=(nameEl&&nameEl.value&&nameEl.value.trim())||"";
   if(!name)return;
   const init=(valEl&&parseInt(valEl.value,10))||0;
   APP.gmSessionMutate(st=>st.combatants.push(combatantFromNpc(name,init)));},
 gmSetInit(id,val){
   const n=parseInt(val,10)||0;
   APP.gmSessionMutate(st=>{const c=APP.gmFindCombatant(st,id);if(c)c.init=n;});},
 // Nice-to-have: 1d10 + Initiative Bonus for every PC (computed off their
 // own live INT/DEX via the state actually on their combatant entry --
 // this doesn't re-fetch BOARD_CHARS, so it stays correct even for a PC
 // whose sheet changed since they were added), flat 1d10 for NPCs (no
 // characteristics on file to derive a bonus from -- the GM can still nudge
 // it by hand afterward same as any manually-entered initiative).
 gmRollAllInit(){
   APP.gmSessionMutate(st=>{
     st.combatants.forEach(c=>{
       const row=c.kind==="pc"?(BOARD_CHARS||[]).find(b=>b.id===c.ref):null;
       const bonus=row&&row.state&&row.state.chars?initBonus(row.state.chars.INT,row.state.chars.DEX):0;
       c.init=d(10)+bonus;
     });
   });},
 gmRemoveCombatant(id){
   APP.gmSessionMutate(st=>{
     const order=st.combatants.slice().sort((a,b)=>b.init-a.init);
     if(st.activeId===id){const i=order.findIndex(c=>c.id===id);
       st.activeId=order.length>1?order[(i+1)%order.length].id:null;}
     st.combatants=st.combatants.filter(c=>c.id!==id);
   });},
 gmAdvanceTurn(){
   APP.gmSessionMutate(st=>{
     if(!st.combatants.length)return;
     const order=st.combatants.slice().sort((a,b)=>b.init-a.init);
     const current=Math.max(0,order.findIndex(c=>c.id===st.activeId));
     tickCombatEffects([order[current]],"turn");
     const next=(current+1)%order.length;
     if(next===0)st.cycle=(st.cycle||1)+1;
     st.activeId=order[next].id;
   });},
 gmNewRound(){APP.gmSessionMutate(st=>{
   st.round=(st.round||1)+1;st.cycle=1;st.turnIdx=0;
   const order=st.combatants.slice().sort((a,b)=>b.init-a.init);st.activeId=order.length?order[0].id:null;
   st.combatants.forEach(c=>{c.ap.used=0;});
   tickCombatEffects(st.combatants,"round");
 });},
 gmResetRound(){APP.gmSessionMutate(st=>{st.round=1;st.cycle=1;st.turnIdx=0;
   const order=st.combatants.slice().sort((a,b)=>b.init-a.init);st.activeId=order.length?order[0].id:null;});},
 gmApAdj(id,delta){
   APP.gmSessionMutate(st=>{const c=APP.gmFindCombatant(st,id);if(!c)return;
     c.ap.used=Math.max(0,Math.min(c.ap.max,c.ap.used-delta));});},
 gmSetApMax(id,val){
   const n=Math.max(0,parseInt(val,10)||0);
   APP.gmSessionMutate(st=>{const c=APP.gmFindCombatant(st,id);if(c){c.ap.max=n;c.ap.used=Math.min(c.ap.used,n);}});},
 gmDamageLoc(id,loc,inputId){
   const el=$("#"+inputId);const n=el?parseInt(el.value,10):NaN;
   if(!Number.isFinite(n)||n<=0)return;
   APP.gmSessionMutate(st=>{const c=APP.gmFindCombatant(st,id);if(!c||!c.hp[loc])return;
     c.hp[loc].cur=Math.max(-c.hp[loc].max,c.hp[loc].cur-n);});
   if(el)el.value="";},
 gmAddLoc(id){
   const nameEl=$("#cbtlocname-"+id),hpEl=$("#cbtlochp-"+id);
   const name=(nameEl&&nameEl.value&&nameEl.value.trim())||"";if(!name)return;
   const max=Math.max(1,parseInt(hpEl&&hpEl.value,10)||10);
   APP.gmSessionMutate(st=>{const c=APP.gmFindCombatant(st,id);if(!c||c.locations.includes(name))return;
     c.locations.push(name);c.hp[name]={cur:max,max};});
   if(nameEl)nameEl.value="";if(hpEl)hpEl.value="";},
 // Removing a location also drops any effect anchored to it -- an effect
 // referencing a hit location that no longer exists on this combatant has
 // nothing left to mean.
 gmRemoveLoc(id,loc){
   APP.gmSessionMutate(st=>{const c=APP.gmFindCombatant(st,id);if(!c)return;
     c.locations=c.locations.filter(l=>l!==loc);delete c.hp[loc];
     c.effects=(c.effects||[]).filter(e=>e.loc!==loc);});},
 gmAddEffect(id){
   const typeEl=$("#cbtfxtype-"+id),locEl=$("#cbtfxloc-"+id),modeEl=$("#cbtfxmode-"+id),valEl=$("#cbtfxval-"+id);
   const type=typeEl&&typeEl.value;if(!type)return;
   const loc=(locEl&&locEl.value)||null;
   const mode=(modeEl&&modeEl.value)==="counter"?"counter":"duration";
   const value=Math.max(1,parseInt(valEl&&valEl.value,10)||1);
   APP.gmSessionMutate(st=>{const c=APP.gmFindCombatant(st,id);if(!c)return;
     const unitEl=$("#cbtfxunit-"+id);
     const unit=unitEl&&unitEl.value==="round"?"round":"turn";
     (c.effects=c.effects||[]).push({id:genId(),type,loc,mode,value,unit});});},
 gmRemoveEffect(combatantId,effectId){
   APP.gmSessionMutate(st=>{const c=APP.gmFindCombatant(st,combatantId);if(!c)return;
     c.effects=(c.effects||[]).filter(e=>e.id!==effectId);});},
 gmCombatantField(id,f,v){
   APP.gmSessionMutate(st=>{const c=APP.gmFindCombatant(st,id);if(c)c[f]=v;});},
 gmNotes(v){APP.gmSessionMutate(st=>{st.sessionNotes=v;});},
 /* Homebrew (campaign custom content) -- see cloud.js: HB_DRAFT/
    freshHbDraft/customContentByType/allWeapons/allArmorMaterialsFor/
    allFolkSpells. Drafts are plain in-memory form state until hbSubmit
    persists them; hbDelete removes a saved row outright (no in-place edit
    in this first pass -- delete and re-add covers mistakes). */
 hbField(type,field,v){
   const d=HB_DRAFT[type];if(!d)return;
   const numFields={weapon:["enc","cost"],armor:["ap","encPerLoc"],spell:[]};
   if((numFields[type]||[]).includes(field))d[field]=Math.max(0,parseFloat(v)||0);
   else if(field==="hasSpec")d[field]=!!v;
   else d[field]=v;
   render();},
 hbDiceAdj(die,delta){
   const dice=HB_DRAFT.weapon.dice;dice["d"+die]=Math.max(0,(dice["d"+die]||0)+delta);render();},
 hbFlatAdj(delta){HB_DRAFT.weapon.flatMod=(HB_DRAFT.weapon.flatMod||0)+delta;render();},
 hbToggleArmorLoc(loc){
   const locs=HB_DRAFT.armor.locations;const i=locs.indexOf(loc);
   if(i>=0)locs.splice(i,1);else locs.push(loc);render();},
 hbToggleSpellTrait(t){
   const tr=HB_DRAFT.spell.traits;const i=tr.indexOf(t);
   if(i>=0)tr.splice(i,1);else tr.push(t);render();},
 hbSubmit(type){
   const camp=CAMPAIGN_VIEW&&CAMPAIGN_VIEW.campaign;if(!camp)return;
   const d=HB_DRAFT[type];const name=(d.name||"").trim();if(!name)return;
   const data=type==="weapon"?{group:d.group,dice:d.dice,flatMod:d.flatMod,size:d.size,reach:d.reach,effects:d.effects,enc:d.enc,apHp:d.apHp,traits:d.traits,cost:d.cost}
    :type==="armor"?{ap:d.ap,encPerLoc:d.encPerLoc,locations:d.locations.slice()}
    :{traits:d.traits.slice(),hasSpec:d.hasSpec,specLabel:d.specLabel,desc:d.desc};
   HB_ERROR=null;
   createCustomContentUnified(camp.id,type,name,data).then(()=>{
     HB_DRAFT[type]=freshHbDraft(type);
     return refreshCustomContent(camp.id);
   }).catch(e=>{HB_ERROR="Could not save: "+e.message;render();});},
 hbDelete(id,type){
   const camp=CAMPAIGN_VIEW&&CAMPAIGN_VIEW.campaign;if(!camp)return;
   HB_ERROR=null;
   deleteCustomContentUnified(id,camp.id).then(()=>refreshCustomContent(camp.id))
    .catch(e=>{HB_ERROR="Could not delete: "+e.message;render();});},
 setCampaign(id){
   // cloudUpsertCharacter()'s UPDATE path deliberately never writes
   // campaign_id (see the comment there) to stop the debounced autosave
   // from clobbering a DM (re)assignment with a stale in-memory value. But
   // that meant picking a campaign here and clicking "Save to Library"
   // NEVER actually persisted the assignment for a character that already
   // had a cloud row — the general save path is blind to campaign_id by
   // design, and nothing else wrote it. Route the actual persistence
   // through the same dedicated single-field update the Campaign page's
   // own assign/unassign actions use, immediately on change, instead of
   // hoping a later generic save will carry it — it won't.
   const cid=id||null;S.campaignId=cid;BUILDER_MSG=null;render();
   if(cloudActive()&&isUuid(S._libId)){
     (cid?assignCharUnified(S._libId,cid):unassignCharUnified(S._libId))
       .catch(e=>{BUILDER_MSG="Could not update campaign assignment: "+e.message;render();});
   }
 },
 saveToLibrary(){
   BUILDER_MSG=null;
   saveToLibraryUnified(true).then(()=>{S._libLastSaved=Date.now();render();})
     .catch(e=>{BUILDER_MSG="Could not save to library: "+e.message;render();});},
 // Takes the code directly rather than reading a specific DOM element —
 // the home screen's "Join a campaign" button (homeJoinCampaign below)
 // has no visible input field of its own, per the approved design.
 joinCampaign(code){
   code=(code||"").trim();
   if(!code)return;
   cloudJoinCampaign(code).then(res=>{
     if(!res){MENU_MSG="Invalid invite code.";render();return;}
     CURRENT_CAMPAIGN_ID=res.id;APPVIEW="campaign";CAMPAIGN_VIEW=null;render();
     loadCampaignViewUnified(res.id);window.scrollTo(0,0);
   }).catch(e=>{MENU_MSG="Could not join campaign: "+e.message;render();});},
 homeJoinCampaign(){
   if(!AUTH_USER&&!MOCK_AUTH){MENU_MSG="Sign in first — joining a campaign needs an account.";render();return;}
   const code=prompt("Enter the campaign's invite code:");
   if(code)APP.joinCampaign(code);},
 // Builds the same #/join/<code> URL the router's "join" case parses (see
 // router.js), so a clicked link lands a player directly on the join flow
 // instead of them having to copy/retype the bare invite code. btnEl gets
 // transient "Copied!"/"Copy failed" feedback rather than a global message,
 // since this is a one-off per-click confirmation, not app state worth
 // surviving a re-render.
 copyInviteLink(code,btnEl){
   const url=location.origin+location.pathname+"#/join/"+encodeURIComponent(code);
   const flash=(text)=>{if(!btnEl)return;const orig=btnEl.textContent;btnEl.textContent=text;btnEl.disabled=true;
     setTimeout(()=>{btnEl.textContent=orig;btnEl.disabled=false;},1500);};
   if(navigator.clipboard&&navigator.clipboard.writeText){
     navigator.clipboard.writeText(url).then(()=>flash("Copied!")).catch(()=>flash("Copy failed"));
   }else{
     try{
       const ta=document.createElement("textarea");ta.value=url;ta.style.position="fixed";ta.style.opacity="0";
       document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);
       flash("Copied!");
     }catch(e){flash("Copy failed");}
   }},
 /* account */
 signIn(){
   AUTH_MSG=null;
   const email=($("#authEmail")&&$("#authEmail").value||"").trim();
   const pw=$("#authPw")&&$("#authPw").value||"";
   if(!email||!pw){AUTH_MSG={text:"Enter your email and password."};render();return;}
   sb.auth.signInWithPassword({email,password:pw}).then(({error})=>{
     if(error){AUTH_MSG={text:"Sign-in failed: "+error.message};render();}
   });},
 signUp(){
   AUTH_MSG=null;
   const email=($("#authEmail")&&$("#authEmail").value||"").trim();
   const pw=$("#authPw")&&$("#authPw").value||"";
   if(!email){AUTH_MSG={text:"Enter your email first."};render();return;}
   if(pw.length<8){AUTH_MSG={text:"Password must be at least 8 characters."};render();return;}
   sb.auth.signUp({email,password:pw,options:{emailRedirectTo:window.location.href}}).then(({data,error})=>{
     if(error){AUTH_MSG={text:"Sign-up failed: "+error.message};render();return;}
     // If email confirmation is required, Supabase returns a user but no
     // session yet — nothing to do here but wait; onAuthStateChange fires
     // once they click the confirmation link. If confirmation is off,
     // data.session is already populated and onAuthStateChange fires
     // immediately on its own.
     if(!data.session){AUTH_PENDING="signup";render();}
   });},
 forgotPassword(){
   AUTH_MSG=null;
   const email=($("#authEmail")&&$("#authEmail").value||"").trim();
   if(!email){AUTH_MSG={text:"Enter your email first."};render();return;}
   sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.href}).then(({error})=>{
     AUTH_MSG=error?{text:"Could not send reset email: "+error.message}:{text:"Reset email sent — check your inbox.",level:"okmsg"};
     render();
   });},
 setNewPassword(){
   AUTH_MSG=null;
   const pw=$("#authNewPw")&&$("#authNewPw").value||"";
   if(pw.length<8){AUTH_MSG={text:"Password must be at least 8 characters."};render();return;}
   sb.auth.updateUser({password:pw}).then(({error})=>{
     if(error){AUTH_MSG={text:"Could not set new password: "+error.message};render();return;}
     AUTH_RECOVERY=false;AUTH_MSG={text:"Password updated.",level:"okmsg"};render();
   });},
 setDisplayName(){
   AUTH_MSG=null;
   const el=$("#authName");const name=el&&el.value&&el.value.trim();
   if(!name)return;
   ensureProfile(name).then(render).catch(e=>{AUTH_MSG={text:"Could not save name: "+e.message};render();});},
 retryCloudSave(){
   CLOUD_SEEN_STATE.delete(S);
   flushCloudSaves().then(()=>{if(cloudActive()&&!VIEW_ONLY&&hasUnsavedWork())return saveToLibraryUnified(false);}).catch(()=>{});
 },
 signOut(){
   const uid=AUTH_USER&&AUTH_USER.id;
   // Never erase a recovery draft after a failed final upload.
   flushCloudSaves().then(()=>{
     if(!VIEW_ONLY&&hasUnsavedWork())return saveToLibraryUnified(false);
   }).then(()=>sb.auth.signOut()).then(result=>{
     if(result&&result.error)throw result.error;
     clearLocalCharacterData(uid);
     AUTH_USER=null;AUTH_PROFILE=null;AUTH_PENDING=false;CAMP_CACHE=null;
     CLOUD_SAVE_ERROR="";CLOUD_LAST_SAVED=null;
     S=freshState();APPVIEW="menu";render();
   }).catch(e=>{
     AUTH_MSG={text:"Sign-out paused because saving failed: "+e.message+". Your draft is retained. Retry or export your character first."};
     render();
   });}

};
function dl(name,content,type){const b=new Blob([content],{type});const u=URL.createObjectURL(b);
  const a=document.createElement("a");a.href=u;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(u),2000);}
function buildMD(){
  const c=S.chars,n=S.concept.name||"Unnamed Character";
  const es=allEntries();
  const careerName=S.customCareer.isCustom?S.customCareer.name:S.career||"";
  const yaml=["---","type: character","name: "+n,
   "culture: "+(S.culture||""),"career: "+careerName,
   ...(S.cultMembership.archetype?["cult: "+(S.cultMembership.name||cultArch().name)+" ("+cultRankTitle(cultArch(),S.cultMembership.rank)+")"]:[]),
   "social_class: "+(S.money.socialClass||""),
   "tier: "+S.archetype,
   ...(S.archetype!=="ordinary"&&S.archAdvantages.length?["advantages: "+S.archAdvantages.join(", ")]:[]),
   ...CHARS.map(k=>k.toLowerCase()+": "+(c[k]??"")),
   "action_points: "+(charsReady()?apFinal(c.INT,c.DEX,S.fixedAP):""),
   "damage_modifier: \""+(charsReady()?dmCalc(c.STR,c.SIZ):"")+"\"",
   "initiative: "+(charsReady()?(initBonus(c.INT,c.DEX)-armourPenaltyToInit()):""),
   "luck_points: "+(charsReady()?luckFinal(c.POW):""),
   "magic_points: "+(charsReady()?c.POW:""),
   "healing_rate: "+(charsReady()?healRate(c.CON):""),
   "movement: "+(charsReady()?moveText():"6m"),
   ...(charsReady()?["height_m: "+heightWeight().m.toFixed(2),"weight_kg: "+heightWeight().kg]:[]),
   ...(S.species?["species: "+(SPECIES_MAP[S.species]?SPECIES_MAP[S.species].label:S.species)]:[]),
   "tags:","  - character","---"].join("\n");
  let md=yaml+"\n\n# "+n+"\n\n";
  if(S.concept.homeland)md+="*"+[S.culture,S.career,S.concept.homeland].filter(Boolean).join(" · ")+"*\n\n";
  if(charsReady()){
    md+="## Characteristics\n\n| "+CHARS.join(" | ")+" |\n|"+CHARS.map(()=>"---").join("|")+"|\n| "+CHARS.map(k=>c[k]).join(" | ")+" |\n\n";
    md+="## Hit Locations\n\n| d20 | Location | HP | AP |\n|---|---|---|---|\n"
      +HIT_D20.map(([r,loc])=>{const base=loc.replace(/Right |Left /,"").replace("Arm","Each Arm").replace("Leg","Each Leg");
        const hp=hpLocsFinal(c.CON,c.SIZ).find(x=>x[0]===base);return "| "+r+" | "+loc+" | "+(hp?hp[1]:"")+" | "+armorApAt(base)+" |";}).join("\n")+"\n\n";
  }
  const grp=(g,t)=>{const list=es.filter(e=>e.grp===g).sort((a,b)=>a.label.localeCompare(b.label));
    if(!list.length)return "";
    return "## "+t+"\n\n| Skill | % |\n|---|---|\n"+list.map(e=>"| "+e.label+" | "+finalPct(e.key)+"% |").join("\n")+"\n\n";};
  md+=grp("Standard","Standard Skills")+grp("Professional","Professional Skills")+grp("Magic","Magic Skills")+grp("Combat Style","Combat Styles");
  const magicKnown=allMagic();
  if(magicKnown.length)md+="## Magic Known\n\n"
    +(devotionalMax()?"Devotional Pool: "+devotionalCur()+" / "+devotionalMax()+" MP\n\n":"")
    +"| Magic | Tradition | Cast with | Cost |\n|---|---|---|---|\n"
    +magicKnown.map(m=>{const t=MAGIC_TRAD_MAP[m.tradition];
      const cost=m.tradition==="folk"?"1 MP (0 on a Critical)"
        :m.tradition==="sorcery"?(sorceryCost(m).mp+" MP / "+sorceryCost(m).turns+" turns")
        :m.tradition==="animism"?("POW "+(m.pow||0)+", CHA "+(m.cha||0))
        :((m.cost||0)+(t.pool==="devotional"?" pool":" MP"));
      return "| "+magicLabel(m)+" | "+t.label+" | "+t.castSkill+" | "+cost+" |";}).join("\n")+"\n\n";
  if(S.community){
    const c=S.community;
    const fields=[["Family",c.family],["Parents",c.parents],["Siblings",c.siblings],["Family reputation",c.reputation],["Background resources",c.resources],["Party connection",c.partyTie]];
    const nonempty=fields.filter(([,value])=>String(value||"").trim());
    if(nonempty.length||c.connections.length){
      md+="## Community\n\n"+nonempty.map(([key,value])=>"**"+key+":** "+String(value).replace(/\n/g," ")).join("\n\n")+"\n\n";
      if(c.connections.length)md+="### Allies, Contacts, Rivals and Enemies\n\n"+c.connections.map(x=>"- **"+x.type+":** "+x.name+(x.notes?" — "+x.notes.replace(/\n/g," "):"")).join("\n")+"\n\n";
    }
  }
  if(S.passions.length)md+="## Passions\n\n| Passion | % |\n|---|---|\n"+S.passions.map(p=>"| "+(p.name||"(unnamed)")+" | "+passionVal(p)+"% |").join("\n")+"\n\n";
  if(S.gearWeapons.length)md+="## Weapons\n\n| Weapon | Damage | Reach | Effects | ENC | AP/HP |\n|---|---|---|---|---|---|\n"
    +S.gearWeapons.map(nm=>{const w=weaponByName(nm);return w?"| "+w.name+" | "+w.dmg+" | "+w.reach+" | "+w.effects+" | "+w.enc+" | "+w.apHp+" |":"";}).filter(Boolean).join("\n")+"\n\n";
  md+="## Armour\n\n| Location | Construction | AP |\n|---|---|---|\n"+ARMOR_LOCATIONS.map(l=>"| "+l+" | "+S.armor[l]+" | "+armorApAt(l)+" |").join("\n")
    +"\n\nArmour Penalty to Initiative: -"+armourPenaltyToInit()+"\n\n";
  if(S.money.dice.length)md+="## Money\n\nStarting: "+moneyTotal()+" sp — remaining: "+moneyRemaining()+" sp\n\n";
  if(S.inventory.length)md+="## Equipment\n\n"+S.inventory.map(it=>"- "+it.name+" ×"+it.qty+" (ENC "+((it.qty||0)*(it.enc||0))+")").join("\n")+"\n\n";
  if(S.concept.notes)md+="## Notes\n\n"+S.concept.notes+"\n";
  return md;
}
boot();
