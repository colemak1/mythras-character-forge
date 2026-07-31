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
 set(obj,f,v){S[obj][f]=v;renderLedger();},
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
   const n=d(4)+1;const pool=FOLK_MAGIC.slice();const picked=[];
   for(let i=0;i<n&&pool.length;i++)picked.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
   S.magic.folk=picked.map(s=>({name:s.n,spec:""}));render();},
 clearFolk(){S.magic.folk=[];render();},
 addMagic(tradition){
   S.magic.known.push({tradition,name:"",notes:"",cost:1,intensity:1,pow:0,cha:0,shapings:[]});
   render();},
 magicField(i,f,v){const m=S.magic.known[i];if(!m)return;
   m[f]=(f==="name"||f==="notes")?v:(parseInt(v,10)||0);render();},
 toggleShaping(i,name){const m=S.magic.known[i];if(!m)return;
   m.shapings=m.shapings||[];toggleInList(m.shapings,name);render();},
 delMagic(i){S.magic.known.splice(i,1);render();},
 devotional(v){S.magic.devotional=Math.max(0,parseInt(v,10)||0);
   S.magic.devotionalUsed=Math.min(S.magic.devotionalUsed,S.magic.devotional);render();},
 devotionalAdj(n){if(viewOnlyBlock())return;
   S.magic.devotionalUsed=Math.max(0,Math.min(devotionalMax(),(S.magic.devotionalUsed||0)-n));render();},
 devotionalReset(){if(viewOnlyBlock())return;S.magic.devotionalUsed=0;render();},
 // Cast a known piece of magic: roll the tradition's casting skill through
 // the same graded pipeline as any other roll, then apply the cost.
 //
 // Folk Magic's cost is the book's own result table — Critical costs nothing,
 // Success and Failure both cost 1 Magic Point (failure still burns the
 // point), Fumble costs 1d3. The other traditions use the entry's own
 // recorded cost, spent only when the casting succeeds, since their cost
 // rules live in the player's rulebook and guessing a failure cost would be
 // an invention.
 castMagic(idx){
   if(viewOnlyBlock())return;
   const m=allMagic()[idx];if(!m)return;
   const trad=MAGIC_TRAD_MAP[m.tradition];if(!trad)return;
   const key=magicSkillKey(trad.castSkill);
   if(!key){alert("This character doesn't have the "+trad.castSkill+" skill, so there's nothing to roll. Add it as a Professional Skill first.");return;}
   const base=finalPct(key);const g=gradedPct(key,base);
   if(g.pct===null){alert(g.grade==="automatic"?"Automatic — the magic simply works.":"Hopeless — no casting can be attempted at this Grade.");return;}
   const r=d100();const tier=resolveRoll(r,g.pct);
   if(tier==="Fumble"&&!S.xp.fumbled.includes(key))S.xp.fumbled.push(key);
   let costTxt="",worked=(tier==="Critical"||tier==="Success");
   if(m.tradition==="folk"){
     const mp=tier==="Critical"?0:(tier==="Fumble"?d(3):1);
     if(mp>0)S.play.magic=Math.max(0,playCurMagic()-mp);
     costTxt=mp===0?"no Magic Points (Critical)":mp+" Magic Point"+(mp>1?"s":"");
   }else if(worked){
     const cost=magicEntryCost(m);
     if(trad.pool==="devotional"){
       if(cost>devotionalCur()){alert("Not enough left in the Devotional Pool ("+devotionalCur()+" of "+devotionalMax()+") to invoke that.");return;}
       S.magic.devotionalUsed=(S.magic.devotionalUsed||0)+cost;
       costTxt=cost+" from the Devotional Pool";
     }else if(trad.pool==="mp"&&cost>0){
       S.play.magic=Math.max(0,playCurMagic()-cost);
       costTxt=cost+" Magic Point"+(cost>1?"s":"");
     }else costTxt="no point cost";
   }else costTxt="nothing spent";
   const tag=g.grade!=="standard"?" ("+GRADE_LABEL[g.grade]+")":"";
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
 // Life Events: one per age band above Young (a Young character has barely
 // had time for any). House content, clearly flagged as such in the UI.
 rollLifeEvents(){
   const n=AGE_CATEGORIES.findIndex(a=>a.key===S.age.category);
   const count=Math.max(1,n);
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
     if(!t){alert("Roll your starting money on the Money & Gear step first — this event adjusts it by "+f.pct+"%.");return;}
     S.money.spent=Math.round((S.money.spent||0)-t*f.pct/100);
   }
   ev.applied=true;render();},
 /* species (non-human characters) */
 // Switching species changes the characteristic dice, so anything already
 // rolled or built is meaningless afterwards — same reasoning, and the same
 // confirmation, as switching character tier.
 pickSpecies(key){
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
 qStyle(on){S.qStyleOn=on;if(on)S.alloc.quick["style:quick"]=5;else delete S.alloc.quick["style:quick"];render();},
 /* culture */
 pickCulture(n){if(S.culture===n)return;S.culture=n;S.cultChoice=[];
   S.cultProf=[null,null,null];S.cultProfSpec=["","",""];S.alloc.culture={};
   CULTURES[n].std.forEach(sk=>{S.alloc.culture["std:"+sk]=5;});
   render();},
 cultChoice(sk){const c=CULTURES[S.culture];const i=S.cultChoice.indexOf(sk);
   if(i>=0){S.cultChoice.splice(i,1);delete S.alloc.culture["std:"+sk];}
   else{if(S.cultChoice.length>=c.choice.pick){const removed=S.cultChoice.shift();delete S.alloc.culture["std:"+removed];}
     S.cultChoice.push(sk);S.alloc.culture["std:"+sk]=5;}
   render();},
 cultStyle(on){S.cultStyleOn=on;if(!on){delete S.alloc.culture["style:cult"];delete S.alloc.career["style:cult"];delete S.alloc.bonus["style:cult"];
   S.carStyles.forEach(cs=>{if(cs&&cs.mode==="link")cs.mode="new";});}
   else S.alloc.culture["style:cult"]=5;
   render();},
 pickProf(which,i,name){
   const picks=which==="cult"?S.cultProf:(which==="car"?S.carProf:S.qProf),
     specs=which==="cult"?S.cultProfSpec:(which==="car"?S.carProfSpec:S.qProfSpec);
   const ph=which==="cult"?"culture":(which==="car"?"career":"quick");
   if(picks[i]){delete S.alloc[ph][profKey(picks[i],specs[i])];}
   picks[i]=name||null;specs[i]="";
   if(name&&(which==="cult"||which==="quick"))S.alloc[ph][profKey(name,"")]=5;
   render();},
 profSpec(which,i,v){
   const picks=which==="cult"?S.cultProf:(which==="car"?S.carProf:S.qProf),
     specs=which==="cult"?S.cultProfSpec:(which==="car"?S.carProfSpec:S.qProfSpec);
   const ph=which==="cult"?"culture":(which==="car"?"career":"quick");
   const old=profKey(picks[i],specs[i]);const nw=profKey(picks[i],v);
   if(S.alloc[ph][old]!==undefined&&old!==nw){S.alloc[ph][nw]=S.alloc[ph][old];delete S.alloc[ph][old];}
   specs[i]=v;render();},
 /* career */
 pickCareer(n){
   if(n==="__custom__"){
     if(S.customCareer.isCustom&&S.career)return; // already locked in
     S.customCareer.isCustom=true;S.career=null;
     S.carProf=[null,null,null];S.carProfSpec=["","",""];S.alloc.career={};
     S.carStyles=Array(S.customCareer.styleSlots).fill(null).map(()=>({mode:"new",name:""}));
     render();
   }else{
     if(S.career===n&&!S.customCareer.isCustom)return;
     S.customCareer.isCustom=false;S.career=n;
     S.carProf=[null,null,null];S.carProfSpec=["","",""];S.alloc.career={};
     S.carStyles=CAREERS[n].styleSlots.map(()=>({mode:"new",name:""}));render();
   }
 },
 customCareerName(v){S.customCareer.name=v;
   if(v.trim()){S.career="__custom__";}else{S.career=null;}
   render();},
 editCustomCareer(){if(S.customCareer.isCustom)S.career=null;render();window.scrollTo(0,0);},
 customCareerStd(skill){const i=S.customCareer.std.indexOf(skill);
   if(i>=0)S.customCareer.std.splice(i,1);
   else S.customCareer.std.push(skill);
   render();},
 customCareerStyles(n){S.customCareer.styleSlots=n;
   const old=S.carStyles.length;
   if(n<old)S.carStyles=S.carStyles.slice(0,n);
   else for(let i=old;i<n;i++)S.carStyles.push({mode:"new",name:""});
   render();},
 carStyleMode(i,m){const cs=S.carStyles[i];
   delete S.alloc.career[cs.mode==="link"?"style:cult":"style:k"+i];
   cs.mode=m;render();},
 carStyleName(i,v){S.carStyles[i].name=v;render();},
 /* allocations */
 aAdj(ph,key,dir){const {pool,max}=phaseLimits(ph);
   const v=aGet(ph,key)+dir;
   if(v<0||v>max)return;
   if(dir>0&&aSum(ph)>=pool)return;
   S.alloc[ph][key]=v;render();},
 aSet(ph,key,val){const {pool,max}=phaseLimits(ph);
   let v=Math.max(0,Math.min(max,parseInt(val,10)||0));
   const others=aSum(ph)-aGet(ph,key);
   v=Math.min(v,pool-others);
   S.alloc[ph][key]=v;render();},
 /* bonus */
 hobby(name){if(S.hobby){delete S.alloc.bonus[profKey(S.hobby,S.hobbySpec)];}
   S.hobby=name||null;S.hobbySpec="";render();},
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
 delPas(i){S.passions.splice(i,1);render();},
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
 mon(f,v){S.money[f]=(f==="socialClass")?v:(parseFloat(v)||0);render();},
 pickSocialClass(name){if(!name)return;const list=SOCIAL_CLASSES[S.culture]||[];
   const opt=list.find(([n])=>n===name);if(!opt)return;
   S.money.socialClass=opt[0];S.money.mod=opt[1];render();},
 invAdd(){S.inventory.push({name:"",qty:1,enc:0});render();},
 invDel(i){S.inventory.splice(i,1);render();},
 inv(i,f,v){S.inventory[i][f]=(f==="name")?v:(parseFloat(v)||0);render();},
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
   const base=finalPct(key);const g=gradedPct(key,base);
   if(g.pct===null){alert(g.grade==="automatic"?"Automatic — no roll needed, it just succeeds.":"Hopeless — no attempt can be made at this Grade.");return;}
   const pct=g.pct;const r=d100();
   const tag=g.grade!=="standard"?" ("+GRADE_LABEL[g.grade]+")":"";
   const tier=resolveRoll(r,pct);
   // Experience Rolls (core rulebook pp.71-73): a Fumble flags this skill
   // for a free +1% next time the player runs Improve Skills — automatic
   // here so nobody has to remember to mark it by hand. Critical does NOT
   // factor into Experience at all (verified against the book — a common
   // misconception carried over from other d100 games).
   if(tier==="Fumble"&&!S.xp.fumbled.includes(key))S.xp.fumbled.push(key);
   S.rollLog.unshift({label:e.label+tag,pct,roll:r===100?"00":r,tier,combat:key.startsWith("style:"),oppTier:null});
   S.rollLog=S.rollLog.slice(0,8);render();},
 playSetOpponentTier(i,tier){if(!S.rollLog[i])return;S.rollLog[i].oppTier=tier;render();},
 /* ---- Experience Rolls / Improve Skills (core rulebook pp.71-73) ---- */
 openXP(){XP_OPEN=true;render();},
 closeXP(){XP_OPEN=false;render();},
 xpAward(v){const n=parseInt(v,10);if(!Number.isFinite(n)||n===0)return;
   S.xp.pool=Math.max(0,S.xp.pool+n);
   if(n>0)S.xp.usedThisRun=[]; // a fresh award = a new "sitting" for the once-per-skill cap
   render();},
 xpToggleFumble(key){const i=S.xp.fumbled.indexOf(key);
   if(i>=0)S.xp.fumbled.splice(i,1);else S.xp.fumbled.push(key);render();},
 // Apply a flagged skill's free Fumble +1% on its own, without spending an
 // Experience Roll (the book grants this unconditionally, not just when a
 // roll happens to also be spent on that skill).
 xpApplyFumble(key){if(!S.xp.fumbled.includes(key))return;
   const e=entryMap()[key];if(!e)return;
   S.xp.bonus[key]=(S.xp.bonus[key]||0)+1;
   S.xp.fumbled=S.xp.fumbled.filter(k=>k!==key);
   S.xp.history.unshift({type:"fumble",key,label:e.label,newPct:finalPct(key)});
   S.xp.history=S.xp.history.slice(0,25);render();},
 // Spend one banked Experience Roll on a skill: 1d100 + INT vs current %
 // (equal-or-beat = +1d4+1%, otherwise still +1%). If the skill is flagged
 // Fumbled, that free +1% is applied first per the book, then the roll is
 // made against the now-updated %. One roll per skill per sitting.
 xpSpend(key){if(VIEW_ONLY||S.xp.pool<=0||S.xp.usedThisRun.includes(key))return;
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
   S.xp.pool--;S.xp.usedThisRun.push(key);
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
   openCharUnified(id).then(entry=>{if(!entry)return;S=Object.assign(freshState(),entry.state);normalizeState();
     S._libId=entry.id;S.campaignId=entry.campaignId;S._ownerId=entry.ownerId;
     S._pendingClaim=(entry.ownerId==="local");
     SHEET_RETURN_VIEW="library";APPVIEW="sheet";render();window.scrollTo(0,0);});},
 playDamage(loc){if(viewOnlyBlock())return;const el=$("#playdmg-"+loc.replace(/\s+/g,"_"));const n=el?parseInt(el.value,10):NaN;
   if(!Number.isFinite(n)||n<=0)return;
   // Floor at -maxHP (not 0) so Major Wound (<=-max, core pp.109-111) stays
   // reachable — clamping at 0 made Major Wound permanently dead code.
   S.play.hp[loc]=Math.max(-playMaxHP(loc),playCurHP(loc)-n);if(el)el.value="";render();},
 playHeal(loc){if(viewOnlyBlock())return;const el=$("#playdmg-"+loc.replace(/\s+/g,"_"));const n=el?parseInt(el.value,10):NaN;
   if(!Number.isFinite(n)||n<=0)return;
   S.play.hp[loc]=Math.min(playMaxHP(loc),playCurHP(loc)+n);if(el)el.value="";render();},
 playSetHP(loc,v){if(viewOnlyBlock())return;S.play.hp[loc]=v;render();},
 // Quick fixed-amount damage buttons (−1/−3) on the Vitals & Armour detail
 // panel — separate from playDamage() above, which reads the adjacent
 // custom-amount input instead.
 playQuickDamage(loc,n){if(viewOnlyBlock())return;S.play.hp[loc]=Math.max(-playMaxHP(loc),playCurHP(loc)-n);render();},
 // Selecting a location just opens the detail panel — read-only navigation,
 // always allowed even in a VIEW_ONLY session.
 playSelectLoc(loc){S.play.selectedLoc=(S.play.selectedLoc===loc)?null:loc;render();},
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
 playSetFatigue(v){if(viewOnlyBlock())return;S.play.fatigue=v;render();},
 // Step one level up or down the Fatigue track — the common case in play is
 // "failed an Endurance roll, take a level", not picking off a dropdown.
 playFatigueAdj(d){if(viewOnlyBlock())return;
   const i=FATIGUE_LEVELS.indexOf(S.play.fatigue||"Fresh");
   S.play.fatigue=FATIGUE_LEVELS[Math.max(0,Math.min(FATIGUE_LEVELS.length-1,(i<0?0:i)+d))];render();},
 // Inventory edits in Play Mode — allowed for the owner (VIEW_ONLY is false)
 // and, as a narrow exception, for the campaign DM (VIEW_ONLY_IS_DM), for
 // loot distribution / adding or removing gear mid-session. Blocked for a
 // plain party member looking at a teammate's sheet. See inventoryBlock().
 playInvAdd(){if(inventoryBlock())return;S.inventory.push({name:"",qty:1,enc:0});render();},
 playInvDel(i){if(inventoryBlock())return;S.inventory.splice(i,1);render();},
 playInv(i,f,v){if(inventoryBlock())return;S.inventory[i][f]=(f==="name")?v:(parseFloat(v)||0);render();},
 // Switching tabs (Actions/Special Effects/Inventory/Features/Notes) is
 // read-only navigation, always allowed even in a VIEW_ONLY session.
 playTab(t){S.play.tab=t;render();},
 /* export / import */
 exportJSON(){const data=JSON.stringify(S,null,2);
   dl((S.concept.name||"character").replace(/\s+/g,"_")+".mythras.json",data,"application/json");},
 exportMD(){dl((S.concept.name||"character").replace(/\s+/g,"_")+".md",buildMD(),"text/markdown");},
 importJSON(){
   const hasWork=S.concept.name||charsReady()||S.culture||S.career;
   if(hasWork&&!confirm("Importing will replace the character currently on screen. Continue?"))return;
   const f=$("#importFile");f.onchange=()=>{const file=f.files[0];if(!file)return;
   const rd=new FileReader();rd.onload=()=>{try{const data=JSON.parse(rd.result);
     if(!data.chars||!data.concept)throw new Error("Not a Character Forge file");
     S=Object.assign(freshState(),data);normalizeState();S._pendingClaim=true;render();}catch(e){alert("Import failed: "+e.message);}};
   rd.readAsText(file);f.value="";};f.click();},
 newCharacter(){
   const hasWork=S.concept.name||charsReady()||S.culture||S.career;
   if(hasWork&&!confirm("Start a new character? This clears the current one from the screen (autosave and any exported files are unaffected until overwritten)."))return;
   S=freshState();render();window.scrollTo(0,0);},
 clearAutosave(){try{localStorage.removeItem(autosaveKey());}catch(e){}updateAutosaveTag();},
 /* main menu */
 toMenu(){APPVIEW="menu";render();window.scrollTo(0,0);},
 fromMenuNew(){
   if(hasUnsavedWork()&&!confirm("Start a new character? This clears the one currently loaded (autosave and exports are unaffected until overwritten)."))return;
   S=freshState();APPVIEW="character";render();window.scrollTo(0,0);},
 fromMenuContinue(){
   const info=getAutosaveInfo();if(!info)return;
   if(hasUnsavedWork()&&!confirm("Load the autosaved character? This replaces what's currently loaded."))return;
   try{const raw=localStorage.getItem(autosaveKey());const saved=JSON.parse(raw);
     S=Object.assign(freshState(),saved.S);normalizeState();S._pendingClaim=true;APPVIEW="character";render();window.scrollTo(0,0);
   }catch(e){alert("Could not load the autosaved character.");}},
 fromMenuImport(){
   if(hasUnsavedWork()&&!confirm("Importing will replace the character currently loaded. Continue?"))return;
   const f=$("#menuImportFile");f.onchange=()=>{const file=f.files[0];if(!file)return;
   const rd=new FileReader();rd.onload=()=>{try{const data=JSON.parse(rd.result);
     if(!data.chars||!data.concept)throw new Error("Not a Character Forge file");
     S=Object.assign(freshState(),data);normalizeState();S._pendingClaim=true;APPVIEW="character";render();window.scrollTo(0,0);
   }catch(e){alert("Import failed: "+e.message);}};
   rd.readAsText(file);f.value="";};f.click();},
 /* my characters */
 toLibrary(){APPVIEW="library";LIB_CACHE=null;render();loadLibraryUnified();window.scrollTo(0,0);},
 openCharToPlay(id,opts){
   openCharUnified(id).then(async entry=>{if(!entry)return;S=Object.assign(freshState(),entry.state);normalizeState();
     S._libId=entry.id;S.campaignId=entry.campaignId;S._ownerId=entry.ownerId;
     S._pendingClaim=(entry.ownerId==="local");
     const viewingOther=cloudActive()&&entry.ownerId!=null&&entry.ownerId!==AUTH_USER.id;
     VIEW_ONLY=viewingOther;
     VIEW_ONLY_IS_DM=viewingOther?await isDmOfCampaign(entry.campaignId):false;
     VIEW_ONLY_OWNER_NAME=(opts&&opts.ownerName)||null;
     PLAY_RETURN_VIEW=(opts&&opts.returnTo)||"menu";
     APPVIEW="play";XP_OPEN=false;render();window.scrollTo(0,0);});},
 openCharToEdit(id){
   openCharUnified(id).then(entry=>{if(!entry)return;S=Object.assign(freshState(),entry.state);normalizeState();
     S._libId=entry.id;S.campaignId=entry.campaignId;S._ownerId=entry.ownerId;
     S._pendingClaim=(entry.ownerId==="local");
     APPVIEW="character";render();window.scrollTo(0,0);});},
 deleteLibChar(id,name){
   if(!confirm('Delete "'+name+'"? This can\'t be undone — Export JSON first if you want a copy.'))return;
   deleteCharUnified(id).then(()=>{LIB_CACHE=null;render();loadLibraryUnified();})
     .catch(e=>alert("Could not delete character: "+e.message));},
 /* account */
 toAccount(){APPVIEW="account";render();window.scrollTo(0,0);},
 mockSignIn(){
   const el=$("#mockName");const name=(el&&el.value&&el.value.trim())||"Test DM";
   MOCK_AUTH={id:"mock-"+genId(),display_name:name};
   CAMP_CACHE=null;render();},
 mockSignOut(){MOCK_AUTH=null;CAMP_CACHE=null;render();},
 /* campaigns */
 toCampaigns(){APPVIEW="campaigns";CAMP_CACHE=null;render();loadCampaignsUnified();window.scrollTo(0,0);},
 newCampaign(){
   if(CLOUD_ENABLED&&!AUTH_USER&&!MOCK_AUTH){alert("Sign in first — campaigns need an account once cloud sync is on.");return;}
   createCampaignUnified("New Campaign").then(camp=>{
     CURRENT_CAMPAIGN_ID=camp.id;APPVIEW="campaign";CAMPAIGN_VIEW=null;render();
     loadCampaignViewUnified(camp.id);window.scrollTo(0,0);
   }).catch(e=>alert("Could not create campaign: "+e.message));},
 openCampaign(id){CURRENT_CAMPAIGN_ID=id;APPVIEW="campaign";CAMPAIGN_VIEW=null;render();
   loadCampaignViewUnified(id);window.scrollTo(0,0);},
 campField(f,v){
   const camp=CAMPAIGN_VIEW&&CAMPAIGN_VIEW.campaign;if(!camp)return;
   camp[f]=v;render(); // optimistic — reflect the edit immediately
   const fn=f==="name"?renameCampaignUnified:noteCampaignUnified;
   fn(camp.id,v).catch(e=>alert("Could not save: "+e.message));},
 deleteCampaign(){
   const camp=CAMPAIGN_VIEW&&CAMPAIGN_VIEW.campaign;if(!camp)return;
   if(!confirm("Delete campaign \""+camp.name+"\"? Linked characters stay in place, just unassigned."))return;
   deleteCampaignUnified(camp.id).then(()=>{APPVIEW="campaigns";CAMP_CACHE=null;render();loadCampaignsUnified();})
     .catch(e=>alert("Could not delete campaign: "+e.message));},
 newCharacterForCampaign(){
   if(hasUnsavedWork()&&!confirm("Start a new character for this campaign? This clears the one currently loaded (autosave and exports are unaffected until overwritten)."))return;
   const cid=CURRENT_CAMPAIGN_ID;S=freshState();S.campaignId=cid;APPVIEW="character";render();window.scrollTo(0,0);},
 assignPicked(){
   const sel=$("#assignPicker");if(!sel||!sel.value)return;
   assignCharUnified(sel.value,CURRENT_CAMPAIGN_ID)
     .then(()=>loadCampaignViewUnified(CURRENT_CAMPAIGN_ID))
     .catch(e=>alert("Could not assign character: "+e.message));},
 openLibChar(id){
   if(hasUnsavedWork()&&!confirm("Open this character? This replaces what's currently loaded."))return;
   openCharUnified(id).then(entry=>{
     if(!entry)return;
     S=Object.assign(freshState(),entry.state);normalizeState();
     S._libId=entry.id;S.campaignId=entry.campaignId;S._ownerId=entry.ownerId;
     APPVIEW="character";render();window.scrollTo(0,0);
   }).catch(e=>alert("Could not open character: "+e.message));},
 unassignChar(id){
   unassignCharUnified(id).then(()=>loadCampaignViewUnified(CURRENT_CAMPAIGN_ID))
     .catch(e=>alert("Could not unassign character: "+e.message));},
 // DM detaching a PLAYER's character (not their own) from the campaign —
 // routes through the dm_unassign_character RPC, never a direct table
 // write. The DM can only do this, never delete the character outright.
 dmUnassignChar(id){
   if(!confirm("Unassign this character from the campaign? The character itself is untouched, just no longer linked here."))return;
   cloudDmUnassignCharacter(id).then(()=>loadCampaignViewUnified(CURRENT_CAMPAIGN_ID))
     .catch(e=>alert("Could not unassign character: "+e.message));},
 /* party board */
 toBoard(campaignId){
   if(campaignId)CURRENT_CAMPAIGN_ID=campaignId;
   APPVIEW="board";BOARD_CHARS=null;render();window.scrollTo(0,0);
   boardLoad(CURRENT_CAMPAIGN_ID);},
 refreshBoard(){if(CURRENT_CAMPAIGN_ID)boardRefetch(CURRENT_CAMPAIGN_ID);},
 boardOpenChar(id,ownerName){
   APP.openCharToPlay(id,{ownerName:ownerName||null,returnTo:"board"});},
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
   const cid=id||null;S.campaignId=cid;render();
   if(cloudActive()&&isUuid(S._libId)){
     (cid?assignCharUnified(S._libId,cid):unassignCharUnified(S._libId))
       .catch(e=>alert("Could not update campaign assignment: "+e.message));
   }
 },
 saveToLibrary(){
   saveToLibraryUnified(true).then(()=>{S._libLastSaved=Date.now();render();})
     .catch(e=>alert("Could not save to library: "+e.message));},
 joinCampaign(){
   const el=$("#joinCode");const code=el&&el.value&&el.value.trim();
   if(!code)return;
   cloudJoinCampaign(code).then(res=>{
     if(!res){alert("Invalid invite code.");return;}
     CURRENT_CAMPAIGN_ID=res.id;APPVIEW="campaign";CAMPAIGN_VIEW=null;render();
     loadCampaignViewUnified(res.id);window.scrollTo(0,0);
   }).catch(e=>alert("Could not join campaign: "+e.message));},
 /* account */
 signIn(){
   const email=($("#authEmail")&&$("#authEmail").value||"").trim();
   const pw=$("#authPw")&&$("#authPw").value||"";
   if(!email||!pw){alert("Enter your email and password.");return;}
   sb.auth.signInWithPassword({email,password:pw}).then(({error})=>{
     if(error)alert("Sign-in failed: "+error.message);
   });},
 signUp(){
   const email=($("#authEmail")&&$("#authEmail").value||"").trim();
   const pw=$("#authPw")&&$("#authPw").value||"";
   if(!email){alert("Enter your email first.");return;}
   if(pw.length<8){alert("Password must be at least 8 characters.");return;}
   sb.auth.signUp({email,password:pw,options:{emailRedirectTo:window.location.href}}).then(({data,error})=>{
     if(error){alert("Sign-up failed: "+error.message);return;}
     // If email confirmation is required, Supabase returns a user but no
     // session yet — nothing to do here but wait; onAuthStateChange fires
     // once they click the confirmation link. If confirmation is off,
     // data.session is already populated and onAuthStateChange fires
     // immediately on its own.
     if(!data.session){AUTH_PENDING="signup";render();}
   });},
 forgotPassword(){
   const email=($("#authEmail")&&$("#authEmail").value||"").trim();
   if(!email){alert("Enter your email first.");return;}
   sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.href}).then(({error})=>{
     alert(error?("Could not send reset email: "+error.message):"Reset email sent — check your inbox.");
   });},
 setNewPassword(){
   const pw=$("#authNewPw")&&$("#authNewPw").value||"";
   if(pw.length<8){alert("Password must be at least 8 characters.");return;}
   sb.auth.updateUser({password:pw}).then(({error})=>{
     if(error){alert("Could not set new password: "+error.message);return;}
     AUTH_RECOVERY=false;alert("Password updated.");render();
   });},
 sendMagicLink(fieldId){
   const el=$("#"+(fieldId||"authEmail"));const email=el&&el.value&&el.value.trim();
   if(!email){alert("Enter your email first.");return;}
   sb.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.href}}).then(({error})=>{
     if(error){alert("Could not send link: "+error.message);return;}
     AUTH_PENDING=true;render();
   });},
 setDisplayName(){
   const el=$("#authName");const name=el&&el.value&&el.value.trim();
   if(!name)return;
   ensureProfile(name).then(render).catch(e=>alert("Could not save name: "+e.message));},
 signOut(){sb.auth.signOut().then(()=>{AUTH_USER=null;AUTH_PROFILE=null;AUTH_PENDING=false;CAMP_CACHE=null;APPVIEW="menu";render();});}
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
  if(S.passions.length)md+="## Passions\n\n| Passion | % |\n|---|---|\n"+S.passions.map(p=>"| "+(p.name||"(unnamed)")+" | "+passionVal(p)+"% |").join("\n")+"\n\n";
  if(S.gearWeapons.length)md+="## Weapons\n\n| Weapon | Damage | Reach | Effects | ENC | AP/HP |\n|---|---|---|---|---|---|\n"
    +S.gearWeapons.map(nm=>{const w=WEAPON_MAP[nm];return w?"| "+w.name+" | "+w.dmg+" | "+w.reach+" | "+w.effects+" | "+w.enc+" | "+w.apHp+" |":"";}).filter(Boolean).join("\n")+"\n\n";
  md+="## Armour\n\n| Location | Construction | AP |\n|---|---|---|\n"+ARMOR_LOCATIONS.map(l=>"| "+l+" | "+S.armor[l]+" | "+armorApAt(l)+" |").join("\n")
    +"\n\nArmour Penalty to Initiative: -"+armourPenaltyToInit()+"\n\n";
  if(S.money.dice.length)md+="## Money\n\nStarting: "+moneyTotal()+" sp — remaining: "+moneyRemaining()+" sp\n\n";
  if(S.inventory.length)md+="## Equipment\n\n"+S.inventory.map(it=>"- "+it.name+" ×"+it.qty+" (ENC "+((it.qty||0)*(it.enc||0))+")").join("\n")+"\n\n";
  if(S.concept.notes)md+="## Notes\n\n"+S.concept.notes+"\n";
  return md;
}
initAuth();
render();
