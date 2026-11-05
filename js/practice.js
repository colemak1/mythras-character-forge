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
    const weapons={Broadsword:"sword",Shortspear:"spear",Mace:"mace",Dagger:"dagger",Greatsword:"greatsword"};
    const shields={Buckler:"buckler",Heater:"heater",Hoplite:"hoplite"};
    const owned=S.gearWeapons||[];
    const styles=stylesList().map(style=>{
      const def=S.styleDefs[style.key]||{weapons:[],traits:[]};
      const trained=Array.isArray(def.weapons)?def.weapons:[];
      return {key:style.key,name:style.name,percent:finalPct(style.key),traits:def.traits||[],
        weapons:owned.filter(n=>weapons[n]&&trained.includes(n)).map(n=>({name:n,key:weapons[n]})),
        shields:owned.filter(n=>shields[n]&&trained.includes(n)).map(n=>({name:n,key:shields[n]}))};
    });
    const vitals=charVitals(S);
    return {version:1,name:S.concept.name||entry.name||"Unnamed character",player:AUTH_PROFILE?.display_name||S.concept.player||"Player",
      chars,styles,skills:Object.fromEntries(["Evade","Brawn","Endurance","Athletics","First Aid","Willpower"].map(n=>[n,finalPct("std:"+n)])),
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
    if(!entry||entry.ownerId!==owner||owner!==(AUTH_USER?.id||(MOCK_AUTH?"local":null)))throw Error("That character is not available for practice. Reload My Characters and try again.");
    const snapshot=practiceSnapshot(entry);
    sessionStorage.setItem("sitota-practice-character-v1",JSON.stringify(snapshot));
    location.assign("experiments/practice-combat.html?forge=1");
  }catch(e){CAMP_MSG=e.message||"Could not open practice combat.";render();}
  finally{practiceOpening=false;}
};
