"use strict";
// Build a small, disposable arena profile using the sheet's own calculations.
// The legacy calculators read S, so run them synchronously on a detached copy
// and restore the editor even when normalization or a calculation throws.
function practiceSnapshot(entry){
  const original=S;
  try{
    S=Object.assign(freshState(),JSON.parse(JSON.stringify(entry.state)));
    S.campaignId=entry.campaignId||null;
    normalizeState();
    const chars=effectiveChars();
    if(!CHARS.every(k=>Number.isFinite(chars[k])&&chars[k]>0))throw Error("Finish this character's characteristics before practicing.");
    if(chars.STR+chars.SIZ>130)throw Error("This character's Damage Modifier is outside the arena's current supported range.");
    // Every Core weapon and shield the arena supports (shared table) that the
    // Combat Style trains. Practice is a disposable bout, so the character
    // does not need to carry it; carried ones are listed first.
    const owned=typeof pmCarriedWeapons==="function"?pmCarriedWeapons():(S.gearWeapons||[]);
    const usable=n=>{const w=WEAPON_MAP[n];return !!w&&!practiceUnsupportedReason(w);};
    const styles=stylesList().map(style=>{
      const def=S.styleDefs[style.key]||{weapons:[],traits:[]};
      const trained=[...new Set(Array.isArray(def.weapons)?def.weapons:[])].filter(usable);
      const ordered=[...trained.filter(n=>owned.includes(n)),...trained.filter(n=>!owned.includes(n))];
      const pick=shield=>ordered.filter(n=>(WEAPON_MAP[n].group==="Shield")===shield).map(n=>({name:n,key:practiceWeaponKey(n)}));
      return {key:style.key,name:style.name,percent:finalPct(style.key),traits:def.traits||[],weapons:pick(false),shields:pick(true)};
    });
    const vitals=charVitals(S);
    return {version:1,name:S.concept.name||entry.name||"Unnamed character",player:AUTH_PROFILE?.display_name||S.concept.player||"Player",
      chars,styles,skills:{...Object.fromEntries(["Evade","Brawn","Endurance","Athletics","First Aid","Willpower"].map(n=>[n,finalPct("std:"+n)])),Acrobatics:finalPct(profKey("Acrobatics"))},
      apMax:vitals.baseAP,init:initBonus(chars.INT,chars.DEX),armourInitPenalty:armourPenaltyToInit(),
      hp:Object.fromEntries(vitals.locs.map(l=>[l.loc,l.max])),
      armour:Object.fromEntries(vitals.locs.map(l=>[l.loc,armorApAt(l.loc)])),
      unsupportedGear:owned.filter(n=>!usable(n)),
      species:S.species||"human"};
  }finally{S=original;}
}
let practiceOpening=false;
APP.openCharToPractice=async function(id){
  if(practiceOpening)return;
  practiceOpening=true;
  const owner=AUTH_USER?.id||(MOCK_AUTH?"local":null);
  try{
    if(!owner)throw Error("Sign in to practice with a saved character.");
    const entry=await openCharUnified(id);
    if(!entry||entry.ownerId!==owner||owner!==(AUTH_USER?.id||(MOCK_AUTH?"local":null)))throw Error("That character is not available. Reload the page and try again.");
    const snapshot=practiceSnapshot(entry);
    sessionStorage.setItem("sitota-practice-character-v1",JSON.stringify(snapshot));
    location.assign("experiments/practice-combat.html?forge=1");
  }catch(e){PITS_MSG=e.message||"Could not open The Pits.";render();}
  finally{practiceOpening=false;}
};

// ---- The Pits (owner, 2026-11-07): Practice Combat as its own top-bar tab ----
// Pick one of your characters here, instead of a button on every character card.
let PITS_MSG="",PITS_PICK="";
APP.toPits=function(){APPVIEW="pits";PITS_MSG="";if(AUTH_USER||MOCK_AUTH){LIB_CACHE=null;render();loadLibraryUnified();}else render();window.scrollTo(0,0);};
APP.pitsPick=function(id){PITS_PICK=String(id||"");};
APP.enterPits=function(){
  const id=PITS_PICK||(LIB_CACHE&&LIB_CACHE[0]&&LIB_CACHE[0].id);
  if(!id){PITS_MSG="Choose a character first.";render();return;}
  APP.openCharToPractice(id);
};
function renderPitsView(){
  document.body.classList.remove("play-mode","sheet-mode");document.body.classList.add("menu-mode");
  document.title="The Pits — New Sit’ota";
  const signedIn=!!(AUTH_USER||MOCK_AUTH),chars=Array.isArray(LIB_CACHE)?LIB_CACHE:null;
  let h='<div class="menuwrap pits-page st-page">'+stPageHead({eyebrow:'Training arena',title:'The Pits',h1Class:'pits-title',
    sub:'Fight your character against escalating opponents to learn Mythras combat before the campaign.'});
  if(PITS_MSG)h+='<p class="warn" role="alert">'+esc(PITS_MSG)+'</p>';
  h+=pitsRecordHTML();
  const fightFree='<p class="st-pits-free"><a class="st-btn" href="experiments/practice-combat.html">Fight without a character</a><span>A ready-made fighter, no character needed.</span></p>';
  if(!signedIn){$("#main").innerHTML=h+stGateHTML('pits')+fightFree+'</div>';return;}
  if(chars===null){$("#main").innerHTML=h+'<p class="note" role="status">Loading your characters&hellip;</p>'+fightFree+'</div>';return;}
  if(!chars.length){$("#main").innerHTML=h+'<div class="st-empty">You have no saved characters yet. <button type="button" class="st-btn st-btn-sm" onclick="APP.fromMenuNew()">Create a character</button></div>'+fightFree+'</div>';return;}
  if(!chars.some(c=>c.id===PITS_PICK))PITS_PICK=chars[0].id;
  // Native radios styled as cards (visible focus, 44px+ targets).
  const list='<fieldset class="st-pick"><legend>Choose your fighter</legend>'+chars.map(c=>{
    const st=stCharStats(c),line=[st.style?esc(st.style.name)+' '+st.style.pct+'%':null,st.ap!=null?st.ap+' AP':null].filter(Boolean).join(' · ')||[c.culture,c.career].filter(Boolean).map(esc).join(' · ');
    return '<label class="st-pick-row"><input type="radio" name="pitsPick" value="'+esc(c.id)+'"'+(c.id===PITS_PICK?' checked':'')+' onchange="APP.pitsPick(this.value);pitsSummaryRefresh()">'
      +stPortrait(c,'st-mono st-mono-sm')+'<span class="st-pick-txt"><b>'+esc(c.name||"Unnamed Character")+'</b><small>'+line+'</small></span><span class="st-pick-mark" aria-hidden="true"></span></label>';
  }).join('')+'</fieldset>';
  h+='<div class="st-two st-pits-two"><div>'+list+fightFree+'</div><aside class="st-summary" id="pitsSummary" aria-live="polite">'+pitsSummaryHTML()+'</aside></div></div>';
  $("#main").innerHTML=h;
}
// Selected fighter's summary: real stats from the saved character.
function pitsSummaryHTML(){
  const c=(LIB_CACHE||[]).find(x=>x.id===PITS_PICK);if(!c)return '';
  const st=stCharStats(c),meta=[c.culture,c.career].filter(Boolean).map(esc).join(' · ');
  const row=(k,v)=>v?'<div class="st-sum-row"><span>'+k+'</span><b>'+v+'</b></div>':'';
  return '<p class="st-eyebrow st-eyebrow-teal">Ready</p><h2>'+esc(c.name||"Unnamed Character")+'</h2>'+(meta?'<p class="st-sum-meta">'+meta+'</p>':'')
    +'<div class="st-sum-rows">'+row('Combat Style',st.style?esc(st.style.name)+' '+st.style.pct+'%':'')+row('Action Points',st.ap!=null?String(st.ap):'')+row('Campaign',st.campaign?esc(st.campaign):'')+'</div>'
    +'<button type="button" class="st-btn st-btn-teal" onclick="APP.enterPits()">Enter the Pits <span aria-hidden="true">→</span></button>'
    +'<p class="st-sum-note">Wounds here never touch your saved character.</p>';
}
function pitsSummaryRefresh(){const el=document.getElementById('pitsSummary');if(el)el.innerHTML=pitsSummaryHTML();}
// Record strip from the arena's local leaderboard (only when runs exist).
function pitsRecordHTML(){
  let rows=[];try{rows=JSON.parse(localStorage.getItem('sitota-practice-score-v1')||'[]');}catch(e){}
  rows=(Array.isArray(rows)?rows:[]).filter(r=>r&&r.wins>0);if(!rows.length)return '';
  const best=m=>Math.max(0,...rows.filter(r=>r.mode===m).map(r=>r.wins));
  const cell=(k,v)=>'<div><span>'+k+'</span><b>'+v+'</b></div>';
  return '<div class="st-record" aria-label="Your arena record on this device">'+cell('Best run',best('normal')||'—')+cell('Best hardcore run',best('hardcore')||'—')+cell('Fighters on the board',new Set(rows.map(r=>r.charname)).size)+'</div>';
}
