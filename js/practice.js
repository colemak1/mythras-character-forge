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
    // Every Core melee weapon and shield the arena supports (shared table).
    const owned=typeof pmCarriedWeapons==="function"?pmCarriedWeapons():(S.gearWeapons||[]);
    const usable=n=>{const w=WEAPON_MAP[n];return !!w&&!practiceUnsupportedReason(w);};
    const weapons=Object.fromEntries(owned.filter(n=>usable(n)&&WEAPON_MAP[n].group!=="Shield").map(n=>[n,practiceWeaponKey(n)]));
    const shields=Object.fromEntries(owned.filter(n=>usable(n)&&WEAPON_MAP[n].group==="Shield").map(n=>[n,practiceWeaponKey(n)]));
    const styles=stylesList().map(style=>{
      const def=S.styleDefs[style.key]||{weapons:[],traits:[]};
      const trained=Array.isArray(def.weapons)?def.weapons:[];
      return {key:style.key,name:style.name,percent:finalPct(style.key),traits:def.traits||[],
        weapons:owned.filter(n=>weapons[n]&&trained.includes(n)).map(n=>({name:n,key:weapons[n]})),
        shields:owned.filter(n=>shields[n]&&trained.includes(n)).map(n=>({name:n,key:shields[n]}))};
    });
    const vitals=charVitals(S);
    return {version:1,name:S.concept.name||entry.name||"Unnamed character",player:AUTH_PROFILE?.display_name||S.concept.player||"Player",
      chars,styles,skills:{...Object.fromEntries(["Evade","Brawn","Endurance","Athletics","First Aid","Willpower"].map(n=>[n,finalPct("std:"+n)])),Acrobatics:finalPct(profKey("Acrobatics"))},
      apMax:vitals.baseAP,init:initBonus(chars.INT,chars.DEX),armourInitPenalty:armourPenaltyToInit(),
      hp:Object.fromEntries(vitals.locs.map(l=>[l.loc,l.max])),
      armour:Object.fromEntries(vitals.locs.map(l=>[l.loc,armorApAt(l.loc)])),
      unsupportedGear:owned.filter(n=>!weapons[n]&&!shields[n]),
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
    sub:'Fight your character against escalating opponents to learn Mythras combat before the campaign. Wounds here never touch your saved character.'});
  if(PITS_MSG)h+='<p class="warn" role="alert">'+esc(PITS_MSG)+'</p>';
  if(!signedIn)h+=stGateHTML('pits');
  else if(chars===null)h+='<div class="card"><p class="note">Loading your characters&hellip;</p></div>';
  else if(!chars.length)h+='<div class="card"><h3>Bring a character</h3><p class="note">You have no saved characters yet.</p><p><button class="mmenu-cta-primary" onclick="APP.fromMenuNew()">Create a character</button></p></div>';
  else{
    if(!chars.some(c=>c.id===PITS_PICK))PITS_PICK=chars[0].id;
    h+='<div class="card"><h3>Bring a character</h3><label class="pits-pick">Character <select onchange="APP.pitsPick(this.value)" aria-label="Character">'
     +chars.map(c=>'<option value="'+esc(c.id)+'"'+(c.id===PITS_PICK?' selected':'')+'>'+esc(c.name||"Unnamed Character")+'</option>').join("")+'</select></label>'
     +'<p><button class="mmenu-cta-primary" onclick="APP.enterPits()">Enter the Pits &rarr;</button></p></div>';
  }
  h+='<div class="card"><h3>Or just fight</h3><p class="note">Try it with a ready-made fighter, no character needed.</p><p><a class="mmenu-cta-secondary" href="experiments/practice-combat.html">Fight without a character</a></p></div></div>';
  $("#main").innerHTML=h;
}
