"use strict";
/* ================= PLAY MODE ================= */
// Transient "why didn't that roll happen" feedback (missing skill, Hopeless
// Grade, Devotional Pool exhausted) for roll()/castMagic() below -- shown as
// a line above the roll log (both the dense Play Mode one and the printable
// Character Sheet's own mini roll log, the two places those buttons live)
// instead of a blocking alert(). Cleared at the top of each new roll/cast
// attempt so it never lingers past whatever prompted it.
let PM_MSG=null;
// Masthead campaign label (see pmCampaignLabel below, used in place of D's
// fabricated "No. 042" edition number). Keyed by campaignId so switching
// between characters linked to different campaigns (or the same one
// again) never shows a stale name, without refetching one already
// resolved this session. Ephemeral, like PM_MSG above -- not part of
// character state, resets on reload.
let PM_CAMPAIGN_NAME_CACHE={};
// Resolves S.campaignId to that campaign's name for the masthead, via the
// same loadCampaignRowUnified() the Party Board's own refetch already uses
// (cloud row or local-storage record, whichever mode is active) -- Play
// Mode's render() is synchronous and can't await a fetch mid-render, so
// this kicks the fetch off on first call for a given id and returns null
// (caller falls back to a neutral label) until it resolves, at which point
// it re-renders once with the real name cached for next time.
function pmCampaignLabel(){
  if(!S.campaignId)return "";
  if(S.campaignId in PM_CAMPAIGN_NAME_CACHE)return PM_CAMPAIGN_NAME_CACHE[S.campaignId];
  PM_CAMPAIGN_NAME_CACHE[S.campaignId]=null;
  loadCampaignRowUnified(S.campaignId).then(camp=>{
    PM_CAMPAIGN_NAME_CACHE[S.campaignId]=camp?camp.name:"";
    if(APPVIEW==="play")render();
  });
  return null;
}
// Transient "here's the armour math that just happened" confirmation for
// playApplyDamage() (see APP.playApplyDamage in app.js) -- {loc,raw,ap,
// applied} for whichever location most recently had damage applied through
// the auto-armour flow, or null. Ephemeral like PM_MSG above (not part of
// character state, doesn't need to survive a reload); cleared whenever the
// selected location changes so a stale note from a different body part can
// never show under the wrong location's controls.
let PM_DMG_NOTE=null;
// Session tracking for a finished character: current HP per hit location,
// current Luck/Magic Points, and an Action-Points-used-this-round counter.
// All derived maxes reuse the exact same functions the sheet already uses
// (hpLocsFinal/luckFinal/c.POW) so Play Mode can never drift from the
// character-gen numbers — only S.play holds anything new.
const PLAY_HP_LOCS=["Head","Chest","Abdomen","Right Arm","Left Arm","Right Leg","Left Leg"];
// The core Hit Locations table (pp.9-10) gives one shared max-HP value for
// "Each Arm" and "Each Leg" — both arms have the same max, both legs have
// the same max. But current HP lost to a hit is per-side (a wound to the
// right arm shouldn't drain the left arm's HP too), so Play Mode tracks 7
// separate boxes while still deriving each one's max off the existing
// shared "Each Arm"/"Each Leg" sheet numbers below.
const PLAY_LIMB_BASE={"Right Arm":"Each Arm","Left Arm":"Each Arm","Right Leg":"Each Leg","Left Leg":"Each Leg"};
// charVitals(state): pure function computing every Play Mode / Party Board
// number off an arbitrary character state object (defaults to the global S
// being edited). This exists so the live Party Board can read another
// character's saved `state` blob (fetched straight from Supabase, never
// loaded into S) using the exact same math Play Mode uses on its own
// character — the two can never drift apart on wound-tier thresholds,
// HP totals, or resource maxes, because they're the same code path.
// Core and Companion-derived bonuses belong to the character being inspected,
// not whichever character the GM currently has open in the editor.
function playStateHasAdv(state,id){return state.archetype!=="ordinary"&&Array.isArray(state.archAdvantages)&&state.archAdvantages.includes(id);}
function playStateHPMax(state){
  const base=hpLocs(effectiveChars(state).CON,effectiveChars(state).SIZ);
  return playStateHasAdv(state,"hp")?base.map(([name,hp])=>[name,hp+(state.archetype==="paragon"?2:1)]):base;
}
function playStateLuckMax(state){
  let v=luckPts(effectiveChars(state).POW);
  if(playStateHasAdv(state,"luck"))v+=state.archetype==="paragon"?2:1;
  return v;
}
function playStateAPMax(state){
  let v=apCalc(effectiveChars(state).INT,effectiveChars(state).DEX,state.fixedAP);
  if(playStateHasAdv(state,"ap"))v++;
  return v;
}
function playValidHP(value,max){
  if(value==null)return max;
  const v=Number(value);
  return Number.isFinite(v)&&Number.isSafeInteger(Math.trunc(v))?Math.min(max,Math.trunc(v)):max;
}
function charVitals(state){
  state=state||S;
  const c=effectiveChars(state);
  const locs=PLAY_HP_LOCS.map(loc=>{
    const key=PLAY_LIMB_BASE[loc]||loc;
    const row=playStateHPMax(state).find(x=>x[0]===key);
    const baseMax=row?row[1]:0, recorded=state.play.hpMaxOverride?.[loc];
    const hasOverride=Number.isSafeInteger(recorded)&&recorded>=1&&recorded<=baseMax;
    const max=hasOverride?recorded:baseMax;
    let v=state.play.hp[loc];
    if(v==null){
      // One-time migration path: earlier saves tracked "Each Arm"/"Each Leg"
      // as a single shared current-HP pool. If this specific side hasn't
      // taken damage yet under the new 7-box keys, inherit that old shared
      // value instead of silently snapping the limb back to full HP.
      const legacyKey=PLAY_LIMB_BASE[loc];
      if(legacyKey&&state.play.hp[legacyKey]!=null)v=state.play.hp[legacyKey];
    }
    // Preserve a pre-existing deeper wound when lowering a location maximum;
    // clamping it to the new threshold would silently heal that injury.
    const cur=v!=null&&Number.isFinite(Number(v))?Math.min(max,Math.trunc(Number(v))):playValidHP(v,max);
    // Wound tiers per the core rulebook's "Damage and Wound Levels" (Combat
    // chapter): based on the location's own current remaining Hit Points
    // compared to its starting max, to zero, and to the negative of that
    // max — NOT single-hit damage magnitude, NOT a fabricated half-max
    // threshold. Undamaged: full HP. Minor Wound: any positive HP below
    // max (mechanically identical to undamaged — no penalty either way —
    // but shown as its own visual tier so a damaged-but-stable location
    // doesn't read as untouched). Serious Wound: at 0 or below but not yet
    // at -max. Major Wound: at -max or lower.
    let cls,tag;
    if(cur>=max){cls="ok";tag="OK";}
    else if(cur>0){cls="minor";tag="Minor Wound";}
    else if(cur>-max){cls="serious";tag="Serious Wound";}
    else{cls="major";tag="Major Wound";}
    return {loc,cur,max,cls,tag};
  });
  const rank={ok:0,minor:1,serious:2,major:3};
  const worst=locs.reduce((w,l)=>rank[l.cls]>rank[w]?l.cls:w,"ok");
  const worstLoc=locs.find(l=>l.cls===worst)||null;
  const hpCur=locs.reduce((a,l)=>a+Math.max(0,l.cur),0);
  const hpMax=locs.reduce((a,l)=>a+l.max,0);
  const maxLuck=playStateLuckMax(state), curLuck=state.play.luck==null?maxLuck:Math.max(0,Math.min(Number(state.play.luck)||0,maxLuck));
  const maxMagic=c.POW, curMagic=state.play.magic==null?maxMagic:Math.max(0,Math.min(Number(state.play.magic)||0,maxMagic));
  const fatigue=state.play.fatigue||"Fresh";
  // Fatigue's Action Point column is a real penalty off the maximum (-1 at
  // Exhausted, -2 Debilitated, -3 Incapacitated, no actions at all beyond
  // that), applied here rather than in apFinal() so the character sheet keeps
  // reporting the character's own rested AP while Play Mode reports what they
  // can actually spend this round. Never drops below 0.
  const fRow=FATIGUE_MAP[fatigue]||FATIGUE_MAP.Fresh;
  const baseAP=playStateAPMax(state);
  const maxAP=fRow.act===false?0:Math.max(0,baseAP+(fRow.ap||0));
  const apUsed=Math.max(0,Math.min(Number(state.play.apUsed)||0,maxAP));
  return {locs,worst,worstLoc,hpCur,hpMax,maxLuck,curLuck,maxMagic,curMagic,
    maxAP,baseAP,apUsed,fatigue,fatigueRow:fRow};
}
function playMaxHP(loc,state){const l=charVitals(state).locs.find(x=>x.loc===loc);return l?l.max:0;}
function playCurHP(loc,state){const l=charVitals(state).locs.find(x=>x.loc===loc);return l?l.cur:0;}
function playHPState(loc,state){const l=charVitals(state).locs.find(x=>x.loc===loc);return l?{tag:l.tag,cls:l.cls}:{tag:"OK",cls:"ok"};}
const PLAY_LIMB_LOCS=["Right Arm","Left Arm","Right Leg","Left Leg"];
// Short, book-accurate effect summaries surfaced as tooltips so a new player
// never has to go dig through the rulebook mid-fight to know what a wound
// tag actually does to them.
function playWoundEffectText(loc,cls){
  const isLimb=PLAY_LIMB_LOCS.includes(loc);
  if(cls==="ok")return "Undamaged — no mechanical penalty.";
  if(cls==="minor")return "Minor Wound: no mechanical penalty, but the location is damaged — a follow-up hit here has less HP to work through before it becomes a Serious Wound.";
  if(cls==="serious"){
    return "Serious Wound: permanently scarred; can't attack or start casting for 1d3 turns (can still parry/evade). "
      +(isLimb
        ? "Endurance test vs the attacker's roll or the limb goes useless until healed above 0 (leg: drop prone; arm: drop whatever it's holding)."
        : "Endurance test vs the attacker's roll or you're knocked out for minutes equal to the damage just taken. First Aid or Healing can wake you, but you can't rejoin the fight until the location is healed (Core p.110).")
      +" Until healed back to Minor, all tasks using this location suffer a one-grade penalty at the GM's discretion.";
  }
  return "Major Wound: immediately incapacitated, can't keep fighting. "
    +(isLimb
      ? "You drop prone; Endurance test vs the attack roll or you black out from the agony. If the limb is severed, punctured or ripped off, it must be treated within 5× Healing Rate minutes or you die of blood loss (Core p.110)."
      : "Endurance test vs the attack roll or it's instant, gruesome death; even if you pass, untreated within 2× Healing Rate rounds you still die of blood loss.")
    +" Natural healing requires successful treatment with the Healing skill; consult the GM for lasting injuries (Core p.80).";
}
// Core p.110: the displayed wound category follows remaining location HP.
// These checks are *not* resolved by HP arithmetic; record the opposed
// Endurance roll, incapacitation and first aid at the table.
function playWoundActionText(loc,cls){
  const limb=PLAY_LIMB_LOCS.includes(loc);
  if(cls==="serious")return limb
    ? "GM check: Opposed Endurance versus the attack roll. On failure the limb becomes useless; for a leg fall prone, for an arm drop held items."
    : "GM check: Opposed Endurance versus the attack roll. On failure lose consciousness for minutes equal to the damage from this attack; no rejoining the fight until the location heals, even if revived.";
  if(cls==="major")return limb
    ? "URGENT: Opposed Endurance; on failure unconscious. If the limb is severed, punctured or ripped off, treat within 5 × Healing Rate minutes or death from blood loss may result."
    : "URGENT: Opposed Endurance; on failure death. If successful, treat within 2 × Healing Rate combat rounds or death may result.";
  return "";
}
function playMaxLuck(state){return charVitals(state).maxLuck;}
function playCurLuck(state){return charVitals(state).curLuck;}
function playMaxMagic(state){return charVitals(state).maxMagic;}
function playCurMagic(state){return charVitals(state).curMagic;}
function playMaxAP(state){return charVitals(state).maxAP;}
// Reload Action Point cost isn't a flat number in the rulebook — it's
// per-weapon (Reload table, Ranged Combat chapter p.109: Atlatl 1 Turn;
// Blowgun/Long Bow/Recurve Bow/Short Bow 2 Turns; Light Crossbow/Sling 3
// Turns; Heavy Crossbow/Staff Sling 4 Turns — 1 Turn costs 1 Action Point).
// The Actions tab reads the actual equipped ranged weapon's "load" stat
// (already tracked in WEAPON_MAP for the Combat-section readout) instead
// of hardcoding a single number that would be wrong for most weapons.
// Fatigue track. This used to be a bare list of level names with the note
// "deliberately just a label picker, not a formula" — the effects are now
// applied for real off FATIGUE_TABLE (skill Grade floor, Movement, Initiative
// and Action Points), so the list is derived from that table instead of being
// a second, independent copy of the level names that could drift from it.
const FATIGUE_LEVELS=FATIGUE_TABLE.map(f=>f.name);
// Recovery Period / Healing Rate, rendered as human-readable rest time.
function fatigueRecoveryText(cause){
  const r=fatigueRow();const mins=FATIGUE_RECOVERY_MINUTES[r.name];
  if(!mins)return r.name==="Dead"?"Never.":"No rest needed.";
  if(cause==="blood")return "Blood loss: one level per day, starting the day after bleeding stops (Core p.71).";
  if(cause==="asphyxiation")return "Asphyxiation: normally one level per minute after it ends; the GM may limit full recovery (Core p.71).";
  const hr=charsReady()?Math.max(1,healRate(effectiveChars().CON)):1;
  const t=mins/hr;
  const txt=t<60?(Math.round(t)+" minutes"):((Math.round(t/6)/10)+" hours");
  if(cause==="exertion")return "Physical exertion: "+txt+" of complete rest to shed this level ("+r.recovery+" ÷ Healing Rate "+hr+").";
  return "Physical exertion only: "+txt+" of complete rest to shed this level ("+r.recovery+" ÷ Healing Rate "+hr+"). Blood loss: one level per day, starting the day after bleeding stops. Asphyxiation: normally one level per minute after it ends; the GM may limit full recovery (Core pp.71,79).";
}
function naturalRecoveryInfo(loc){
  const max=playMaxHP(loc),cur=playCurHP(loc),cls=playHPState(loc).cls;
  if(!max||cur>=max||!["minor","serious","major"].includes(cls))return null;
  return {cls,interval:cls==="minor"?"day":cls==="serious"?"week":"month",rate:charsReady()?healRate(effectiveChars().CON):0};
}
function gradedPassivePct(key){const g=gradedPct(key,finalPct(key));return g.pct===null?GRADE_LABEL[g.grade]:g.pct+"%";}
function hitD20For(loc){const e=HIT_D20.find(x=>x[1]===loc);return e?e[0].replace("-","–"):"—";}
// ---- Vitals & Armour body diagram: colour ramp for the 7-zone figure and
// per-location dot. Uses the SAME wound-tier boundaries as playHPState()
// (>0 ok, <=0 & >-max serious, <=-max major) for the two "hurt" states that
// actually carry mechanical weight; healthy-vs-damaged-but-positive is a
// pure cosmetic gradient layered on top, matching the approved mockup —
// never surfaced as its own wound-tier *label* anywhere (the label always
// stays "OK", consistent with playHPState()/playWoundEffectText() already
// treating any positive HP as one undifferentiated tier).
const PM_C_HEALTHY=[65,75,87],PM_C_AMBER=[207,138,46],PM_C_RED=[214,65,54],
      PM_C_SERIOUS=[176,48,38],PM_C_MAJOR=[95,15,10];
function pmMix(a,b,t){return "rgb("+a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(",")+")";}
// Pure color math factored out of pmZoneFill/pmZoneStroke so the Party
// Board's read-only per-teammate hit-location strip can use the exact same
// gradient as Play Mode's live body diagram without touching global S —
// it's handed cur/max/cls straight from charVitals(otherCharsState).
// Restyled for "The Specimen" skin: undamaged zones stay an unfilled
// paper-ink wash (so the plate reads as line art, not a colour-coded
// heatmap) and only wounded zones pick up the red ink used everywhere
// else on the sheet — a two-tone graphic language instead of a
// green/amber/red gradient, deliberately starker/higher-contrast to match
// the rest of the newsprint restyle.
function pmHpColor(cur,max,cls){
  if(cls==="major")return "rgba(224,52,15,.55)";
  if(cls==="serious")return "rgba(224,52,15,.25)";
  if(cls==="minor"){
    const f=max>0?1-cur/max:0;
    return "rgba(224,52,15,"+(0.05+f*0.15).toFixed(2)+")";
  }
  return "rgba(22,19,14,.05)";
}
function pmHpStroke(cur,max,cls){
  if(cls==="minor")return "#58170b";
  if(cls!=="ok")return "#e0340f";
  return "#16130e";
}
function pmZoneFill(loc,state){const l=charVitals(state).locs.find(x=>x.loc===loc);return pmHpColor(l.cur,l.max,l.cls);}
function pmZoneStroke(loc,state){const l=charVitals(state).locs.find(x=>x.loc===loc);return pmHpStroke(l.cur,l.max,l.cls);}
function pmShortName(l){return l.replace("Right ","R. ").replace("Left ","L. ");}
const PM_SHIELD_SVG='<svg viewBox="0 0 10 12" fill="currentColor" width="9" height="11" style="vertical-align:-1px;margin-right:2px"><path d="M5 0 L10 1.8 V6 Q10 10 5 12 Q0 10 0 6 V1.8 Z"/></svg>';
// 7-zone humanoid figure — geometry ported from the approved mockup
// (playmode-redesign-mockup.html) verbatim; fill/stroke/major-pulse computed
// live from real Play Mode state instead of the mockup's static sample data.
const PM_ZONE_SHAPES={
  "Head":["path",'d="M100,34 a20,23 0 1 0 40,0 a20,23 0 1 0 -40,0 Z"'],
  "Chest":["path",'d="M86,62 L154,62 Q160,62 160,70 L152,146 Q151.5,151 146,151 L94,151 Q88.5,151 88,146 L80,70 Q80,62 86,62 Z"'],
  "Abdomen":["path",'d="M95,155 L145,155 Q149,155 149,159 L153,196 Q154,205 145,205 L95,205 Q86,205 87,196 L91,159 Q91,155 95,155 Z"'],
  "Right Arm":["rect",'x="-9" y="0" width="18" height="138" rx="9" transform="translate(70,68) rotate(9)"'],
  "Left Arm":["rect",'x="-9" y="0" width="18" height="138" rx="9" transform="translate(170,68) rotate(-9)"'],
  "Right Leg":["rect",'x="-12" y="0" width="24" height="148" rx="11" transform="translate(104,208) rotate(3)"'],
  "Left Leg":["rect",'x="-12" y="0" width="24" height="148" rx="11" transform="translate(136,208) rotate(-3)"']
};
// Leader-line anchors (in the inner 240x360 body coordinate space) for the
// patent-drawing plate treatment — literal port of D's leadered labels:
// HEAD/R.ARM/ABDOMEN/R.LEG run to the left edge, CHEST/L.ARM/L.LEG to the
// right, exactly matching the mockup's own left/right split of the same 7
// zones. Eyeballed against each zone's own shape in PM_ZONE_SHAPES.
// (No hand-drawn annotation ellipse anymore — dropped per user feedback;
// the leader-line highlight + hatching on the zone itself is enough to flag
// a wound without an extra circled-scribble layer on top.)
const PM_LEADER_LEFT=[["Head",100,34],["Right Arm",63,120],["Abdomen",90,175],["Right Leg",90,260]];
const PM_LEADER_RIGHT=[["Chest",155,90],["Left Arm",185,120],["Left Leg",152,260]];
function pmBodySvg(){
  const zonesHtml=PLAY_HP_LOCS.map(loc=>{
    const [tag,attrs]=PM_ZONE_SHAPES[loc];
    const fill=pmZoneFill(loc),stroke=pmZoneStroke(loc);
    const cls=playHPState(loc).cls;
    const sel=S.play.selectedLoc===loc;
    const armLoc=loc;
    return '<g class="bz'+(cls!=="ok"?" "+cls:"")+(sel?" sel":"")+'" onclick="APP.pmOpenLoc(\''+loc+'\')" role="button" tabindex="0" aria-label="'+loc+'">'
     +'<'+tag+' class="shape" '+attrs+' style="fill:'+fill+';stroke:'+stroke+'"/>'
     +'<'+tag+' class="hatch" '+attrs+' fill="url(#pmhatch)" stroke="none"/>'
     +'<title>'+loc+' — '+playCurHP(loc)+'/'+playMaxHP(loc)+' HP · AP '+armorApAt(armLoc)+'</title></g>';
  }).join("");
  // Highlight whichever location is worst off, same rule pmVitalsCard()/
  // pmStandingText() use — only ever one leader-line highlighted on the
  // plate at a time, matching the mockup. Covers Minor as well as Serious/
  // Major now, so a location that's merely taken damage still gets its own
  // (distinctly styled) leader-line callout instead of looking untouched.
  const worstRank={ok:0,minor:1,serious:2,major:3};
  const worstLoc=PLAY_HP_LOCS.reduce((w,l)=>worstRank[playHPState(l).cls]>worstRank[playHPState(w).cls]?l:w,PLAY_HP_LOCS[0]);
  const worstCls=playHPState(worstLoc).cls;
  // Leader lines + dot markers + name/HP labels on both edges — the
  // "patent drawing" device the mockup uses instead of a plain side list.
  const OX=70,OY=10; // offset of the nested body svg within the outer plate
  const leader=(loc,ix,iy,side)=>{
    const ax=ix+OX,ay=iy+OY;
    const edgeX=side==="left"?14:366,bendX=side==="left"?80:300;
    const wound=loc===worstLoc&&worstCls!=="ok";
    const minor=wound&&worstCls==="minor";
    const cur=playCurHP(loc),max=playMaxHP(loc);
    const armLoc=loc,ap=armorApAt(armLoc);
    const tierSuffix=worstCls==="major"?"MAJOR":worstCls==="serious"?"SERIOUS":"MINOR";
    const nm=pmShortName(loc).toUpperCase()+(wound?" — "+tierSuffix:"");
    const anchor=side==="left"?"start":"end";
    const cls=(wound?" wound":"")+(minor?" minor":"");
    return '<path class="pm-leader'+cls+'" d="M'+ax+' '+ay+' L'+bendX+' '+ay+' L'+edgeX+' '+ay+'"/>'
     +'<circle class="pm-leader-dot'+cls+'" cx="'+ax+'" cy="'+ay+'" r="2.5"/>'
     +'<text class="pm-leader-lbl'+cls+'" x="'+edgeX+'" y="'+(ay-6)+'" text-anchor="'+anchor+'">'
       +'<tspan class="pm-leader-nm">'+esc(nm)+'</tspan></text>'
     +'<text class="pm-leader-lbl'+cls+'" x="'+edgeX+'" y="'+(ay+11)+'" text-anchor="'+anchor+'">'
       +'<tspan class="pm-leader-hp">'+cur+'/'+max+' <tspan>AP'+ap+'</tspan></tspan></text>';
  };
  const leaders=PM_LEADER_LEFT.map(([loc,x,y])=>leader(loc,x,y,"left")).join("")
   +PM_LEADER_RIGHT.map(([loc,x,y])=>leader(loc,x,y,"right")).join("");
  return '<div class="pm-figwrap"><svg viewBox="0 0 380 400" aria-label="Hit location diagram">'
   +'<defs><pattern id="pmhatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">'
   +'<rect width="7" height="7" fill="rgba(224,52,15,.12)"/><line x1="0" y1="0" x2="0" y2="7" stroke="#e0340f" stroke-width="2.2"/></pattern></defs>'
   +'<svg x="'+OX+'" y="'+OY+'" width="240" height="360" viewBox="0 0 240 360">'+zonesHtml+'</svg>'
   +leaders+'</svg>'
   +'<div class="pm-figcap">FIG.1 &mdash; HIT LOCATIONS D20</div></div>';
}
function pmLocRow(loc){
  const cur=playCurHP(loc),max=playMaxHP(loc),st=playHPState(loc).cls;
  const armLoc=loc,ap=armorApAt(armLoc);
  const sel=S.play.selectedLoc===loc;
  return '<div class="pm-locrow st-'+st+(sel?' sel':'')+'" onclick="APP.pmOpenLoc(\''+loc+'\')" role="button" tabindex="0">'
   +'<span class="dot" style="background:'+pmZoneFill(loc)+'"></span>'
   +'<span class="nm">'+pmShortName(loc)+'</span>'
   +'<span class="ap" title="AP '+ap+' — '+esc(armorDisplayName(armLoc))+'">'+PM_SHIELD_SVG+ap+'</span>'
   +'<span class="pmx-hpbar" aria-hidden="true"><i style="width:'+(max>0?Math.max(0,Math.min(100,Math.round(cur/max*100))):0)+'%"></i></span>'
   +'<span class="hp">'+cur+'<span>/'+max+'</span></span>'
   +'<span class="pmx-locst">'+esc(playHPState(loc).tag)+'</span></div>';
}
// Redesigned damage entry (was a flat row of −1/−3/amount-input/−dmg/+heal/
// full buttons, all doing raw HP arithmetic with no armour involved at all
// -- every hit required the player to look up this location's AP and
// subtract it by hand before typing a number in). Now split into two
// clearly-labelled groups: a primary "Apply Damage" flow that takes the
// raw damage a weapon/attack rolled and subtracts this location's AP
// automatically (core p.27, "Armour Points... reduce the amount of damage
// inflicted"), and a secondary row for adjustments that were never meant to
// go through armour at all -- GM-resolved direct damage, healing,
// GM fiat -- kept small and explicitly labelled so it reads as the
// exception, not the default.
// Incident records stay separate from current location HP and require the
// player/GM to record checks, treatment and timing; no live clock or forced outcome.
function pmWoundEvents(loc){
  const events=(S.play.woundEvents||[]).map((e,i)=>({e,i})).filter(x=>x.e&&x.e.loc===loc);
  if(!events.length)return "";
  const hr=charsReady()?healRate(effectiveChars().CON):0;
  return '<div class="pm-notes"><h4>Recorded wound incidents</h4><p>Resolve opposed rolls and timing at the table. Recording an incident does not apply conditions automatically.</p>'
   +events.map(({e,i})=>{
     const limb=PLAY_LIMB_LOCS.includes(loc),serious=e.severity==="serious";
     const consequence=serious?(limb?"On a failed check: limb unusable until HP is positive; legs cause a fall, arms drop held items unless strapped.":"On a failed check: unconscious for "+(Number.isSafeInteger(e.damage)?e.damage:"the attack’s damage")+" minutes."):(limb?"Incapacitated and prone; a failed check causes unconsciousness. For a severed, punctured or ripped-off limb, treatment is needed within "+(5*hr)+" minutes.":"Unconscious and incapacitated; a failed check causes death. If successful, treatment is needed within "+(2*hr)+" combat rounds.");
     return '<details class="pm-fx-item"><summary>'+esc(serious?"Serious":"Major")+' wound · '+esc(String(e.damage))+ ' damage · '+(e.resolved?'resolved':'open')+'</summary><p>'+esc(consequence)+'</p>'
      +'<label>Opposed Endurance outcome <select '+(e.resolved?'disabled':'')+' onchange="APP.woundEventUpdate('+i+',\'outcome\',this.value)">'+[["pending","Pending"],["success","Succeeded"],["failure","Failed"]].map(([v,label])=>'<option value="'+v+'" '+(e.outcome===v?'selected':'')+'>'+label+'</option>').join("")+'</select></label>'
      +(serious?' <label>Attack/casting interruption <select '+(e.resolved?'disabled':'')+' onchange="APP.woundEventUpdate('+i+',\'interruptionTurns\',this.value)"><option value="">Not recorded</option>'+[1,2,3].map(n=>'<option value="'+n+'" '+(e.interruptionTurns===n?'selected':'')+'>'+n+' turn'+(n===1?'':'s')+'</option>').join("")+'</select></label>':'')
      +' <label><input type="checkbox" '+(e.treated?'checked':'')+' '+(e.resolved?'disabled':'')+' onchange="APP.woundEventUpdate('+i+',\'treated\',this.checked)"> Treatment recorded</label>'
      +'<p><label>Attack roll, timing, or other notes <input type="text" maxlength="500" value="'+esc(String(e.notes||""))+'" '+(e.resolved?'disabled':'')+' onchange="APP.woundEventUpdate('+i+',\'notes\',this.value)"></label></p>'
      +'<button type="button" class="pm-btn sm" onclick="APP.'+(e.resolved?'woundEventReopen':'woundEventResolve')+'('+i+')">'+(e.resolved?'Reopen incident':'Mark incident resolved')+'</button></details>';
   }).join("")+'</div>';
}
// Core pp.94–95: reduction depends on the effective weapon sizes after
// a successful parry. This calculator does not assume a roll or modify HP.
const PARRY_SIZES=["Small","Medium","Large","Huge","Enormous"];
function parryDamage(damage,attackSize,defenceSize,result){
  if(!Number.isSafeInteger(damage)||damage<0||!["success","failed","none"].includes(result))return null;
  if(result!=="success")return {remaining:damage,blocked:0};
  if(!PARRY_SIZES.includes(attackSize)||!PARRY_SIZES.includes(defenceSize))return null;
  const delta=PARRY_SIZES.indexOf(attackSize)-PARRY_SIZES.indexOf(defenceSize);
  const remaining=delta<=0?0:delta===1?damage/2:damage;
  return {remaining,blocked:damage-remaining};
}
function pmParryCalculate(form){
  const raw=form.elements.damage.value.trim(),out=form.querySelector('[data-parry-result]');
  const result=/^\d+$/.test(raw)?parryDamage(Number(raw),form.elements.attackSize.value,form.elements.defenceSize.value,form.elements.result.value):null;
  if(!result){out.textContent="Enter a non-negative whole damage amount and choose a defence result. For a successful parry, choose both weapon sizes.";return;}
  out.textContent="Parry blocks "+result.blocked+"; "+result.remaining+" damage remains before armour."+(Number.isInteger(result.remaining)?"":" A half point remains: use the GM’s rounding decision before entering damage.");
}
function pmLocDetail(){
  const loc=S.play.selectedLoc;
  if(!loc)return '<div class="pm-locdetail"><p class="pm-empty">Tap a location to record damage or healing.</p></div>';
  const cur=playCurHP(loc),max=playMaxHP(loc),st=playHPState(loc);
  const armLoc=loc,ap=armorApAt(armLoc);
  const idv="playdmg-"+loc.replace(/\s+/g,"_");
  const note=PM_DMG_NOTE&&PM_DMG_NOTE.loc===loc?PM_DMG_NOTE:null, recovery=naturalRecoveryInfo(loc);
  return '<div class="pm-locdetail">'
   +'<div class="dt"><b>'+esc(loc)+'</b><span class="d20">d20: '+hitD20For(loc)+'</span></div>'
   +'<div class="arm">'+esc(armorDisplayName(armLoc))+' &mdash; AP '+ap+'</div>'
   +'<details class="pm-fx-item"><summary>Permanent injury: location maximum</summary><p>After GM adjudication, enter the location’s reduced maximum HP (Core p.80). Wound thresholds use the reduced maximum. This does not determine the injury, alter hit-location rolls, or automatically treat the wound.</p>'
   +(()=>{const base=playStateHPMax(S).find(x=>x[0]===(PLAY_LIMB_BASE[loc]||loc))?.[1];if(!base)return'';
     return '<p class="pm-notes">Permanent Injury table (1d3; HP lost rounded up): '+[1,2,3].map(r=>'<button type="button" class="pm-btn sm" onclick="document.getElementById(\'injuryMax\').value='+maimedMaxHP(base,r)+'">'+r+' → '+maimedMaxHP(base,r)+' HP</button>').join(' ')+' from '+base+' HP. Pick the result, then confirm and set.</p>';})()+'<label>Maximum HP <input type="number" id="injuryMax" min="1" value="'+max+'" style="width:65px"></label> <label><input type="checkbox" id="injuryConfirm"> GM confirms this adjustment</label> <button type="button" class="pm-btn sm" onclick="APP.playSetMaxHP(\''+loc+'\',document.getElementById(\'injuryMax\').value,document.getElementById(\'injuryConfirm\').checked)">Set maximum</button> <button type="button" class="pm-btn sm" onclick="APP.playClearMaxHP(\''+loc+'\',document.getElementById(\'injuryConfirm\').checked)">Restore calculated maximum</button></details>'
   +'<div class="hpline">'+cur+' <span>/ '+max+' HP</span><span class="pm-woundtag '+st.cls+'">'+st.tag+'</span></div>'
   +'<div class="fx">'+esc(playWoundEffectText(loc,st.cls))+'</div>'
   +(playWoundActionText(loc,st.cls)?'<p class="pm-notes" role="status">'+esc(playWoundActionText(loc,st.cls))+'</p>':'')
   +pmWoundEvents(loc)
   +'<details class="pm-fx-item"><summary>Parry damage calculator <span class="pm-fx-badge">Core pp.94–95</span></summary><p>Enter damage after modifiers and any applicable Special Effects. Choose the actual parry result. Weapon sizes are needed only for a successful parry. The result is before armour; this calculator does not change HP.</p><form onsubmit="event.preventDefault();pmParryCalculate(this)"><label>Attack damage <input name="damage" type="number" min="0" step="1" required></label> <label>Attacking size <select name="attackSize"><option value="">Choose size</option>'+PARRY_SIZES.map(n=>'<option>'+n+'</option>').join("")+'</select></label> <label>Parrying size <select name="defenceSize"><option value="">Choose size</option>'+PARRY_SIZES.map(n=>'<option>'+n+'</option>').join("")+'</select></label> <label>Defence <select name="result" required><option value="">Choose result</option><option value="success">Successful parry (including critical)</option><option value="failed">Failed or fumbled parry</option><option value="none">No parry</option></select></label> <button type="submit" class="pm-btn sm">Calculate</button><p data-parry-result role="status"></p></form><p>Choose any earned Special Effects before rolling damage and hit location. A defender can spend an Action Point to parry a missed attack and potentially earn effects. An omitted parry counts as a failure for the differential result (Core pp.94–95).</p></details>'
   +'<p class="pm-notes">Enter damage after parry and other reductions, before armour. Forge subtracts location AP (Core p.110).</p>'
   +'<div class="pm-dmgctl">'
   +'<div class="pm-dmgrow">'
   +'<input type="number" id="'+idv+'" placeholder="damage after parry" min="0" aria-label="Damage after parry and other reductions, before armour">'
   +'<button class="pm-sbtn dmg primary" onclick="APP.playApplyDamage(\''+loc+'\')">Apply Damage</button>'
   +'</div>'
   +'<div class="pm-dmgnote">'+(note
     ?'Last hit: <b>'+note.raw+'</b> dealt &minus; AP <b>'+note.ap+'</b> &rarr; <b>'+note.applied+'</b> HP taken'+(note.applied===0?' (armour stopped it)':"")
     :'AP <b>'+ap+'</b> subtracted automatically')+'</div>'
   +'<div class="pm-dmgsec">'
   +'<span class="pm-dmgseclbl" title="Use for damage the GM has resolved as bypassing armour, such as a fall. Bleed Special Effect causes Fatigue loss instead (Core p.96).">Ignores armour (direct HP only):</span>'
   +'<button class="pm-sbtn dmg sm" onclick="APP.playQuickDamage(\''+loc+'\',1)">&minus;1</button>'
   +'<button class="pm-sbtn dmg sm" onclick="APP.playQuickDamage(\''+loc+'\',3)">&minus;3</button>'
   +'<button class="pm-sbtn sm" onclick="APP.playHeal(\''+loc+'\')">+heal</button>'
   +'<button class="pm-sbtn sm" onclick="APP.playSetHP(\''+loc+'\','+max+')">full</button>'
   +(recovery?'<div class="pm-notes"><p>Natural recovery: after one '+recovery.interval+', recover up to '+recovery.rate+' HP (Core p.80). Recheck severity for the next interval. Strenuous activity can reduce the rate; enter the GM-confirmed reduction. Pulp/Paragon healing modifiers are GM-managed.</p><label>Rate reduction <input type="number" id="naturalReduction" min="0" max="3" value="0" style="width:55px"></label> '+(recovery.cls==="major"?'<label><input type="checkbox" id="naturalTreated"> GM confirms successful treatment</label> ':'')+'<button class="pm-btn sm" onclick="APP.playNaturalRecovery(\''+loc+'\',document.getElementById(\'naturalReduction\').value,document.getElementById(\'naturalTreated\')?.checked||false)">Apply one '+recovery.interval+'</button></div>':'')
   +'<p class="pm-notes">Bleed Special Effect: lose Fatigue levels, not HP (Core p.96). Use the Fatigue tracker.</p>'+'</div></div></div>';
}
// Real STANDING readout for the dateline's right-hand slot, replacing D's
// fixed "WOUNDED — L.LEG · ACTION PHASE" sample text with the actual worst
// wound on the sheet right now (or OK if nothing's hurt).
function pmStandingText(){
  const worstRank={ok:0,minor:1,serious:2,major:3};
  const worst=PLAY_HP_LOCS.reduce((w,l)=>{const st=playHPState(l).cls;return worstRank[st]>worstRank[w]?st:w;},"ok");
  if(worst==="ok")return "STANDING: OK";
  const worstLoc=PLAY_HP_LOCS.find(l=>playHPState(l).cls===worst);
  const label=worst==="major"?"MAJOR WOUND":worst==="serious"?"WOUNDED":"MINOR WOUND";
  return "STANDING: "+label+" &mdash; "+pmShortName(worstLoc).toUpperCase().replace(/\s+/g,"");
}
// A compact incident overview, derived only from saved events and explicit
// outcomes. Timing and treatment remain player/GM decisions (Core p.110).
function pmWoundOverview(){
  const events=(S.play.woundEvents||[]).filter(e=>e&&!e.resolved&&PLAY_HP_LOCS.includes(e.loc));
  if(!events.length)return "";
  const hr=charsReady()?healRate(effectiveChars().CON):0;
  return '<div class="pm-fx-selection"><b>Wound watch · '+events.length+' open</b><span>Track turns and treatment at the table. Select a location to update an incident.</span>'
    +events.map(e=>{
      const limb=PLAY_LIMB_LOCS.includes(e.loc),major=e.severity==="major";
      const outcome=e.outcome==="success"?"Endurance succeeded":e.outcome==="failure"?"Endurance failed":"Endurance check pending";
      let reminder=major?(e.treated?"Treatment recorded; GM resolves recovery.":limb?"Treatment deadline may be "+(5*hr)+" minutes, depending on injury.":"If the check succeeds, treatment deadline is "+(2*hr)+" combat rounds.")
       :e.outcome==="failure"?(limb?(playCurHP(e.loc)>0?"Location now has positive HP; GM resolves limb status.":"Limb unusable until positive HP."):"Unconsciousness duration: "+e.damage+" minutes; GM tracks elapsed time."):"Check interruption and outcome.";
      return '<div><button type="button" class="pm-btn sm" onclick="APP.playSelectLoc(\''+jsq(e.loc)+'\')">'+esc(e.loc)+'</button> <b>'+esc(major?"Major":"Serious")+'</b> · '+esc(outcome)+'<br><span>'+esc(reminder)+'</span></div>';
    }).join("")+'</div>';
}
// ---- Characteristic rail (col 1) — literal port of .rail/.rail-head/.chx
// from playmode-restyle-D.html: STR..CHA stacked vertically down the left
// edge, each with a big numeral, a "x5%" line (a decorative device lifted
// straight from the mockup, not a stat used anywhere else in this app —
// it's a deterministic function of the real characteristic score) and a
// tick-bar, with the character's highest characteristic picked out in red
// exactly like DEX was in the approved sample. The "idx" column reads
// "/07" on every row, matching the mockup's own (static) markup verbatim. ----
function pmCharacteristicRail(){
  const c=effectiveChars();
  const order=["STR","CON","SIZ","DEX","INT","POW","CHA"];
  const maxVal=Math.max.apply(null,order.map(k=>c[k]));
  let h='<div class="pm-sect-head bar">CHAR.</div>';
  h+=order.map(k=>{
    const v=c[k],x5=v*5,tickw=Math.max(0,Math.min(100,x5-3));
    return '<div class="pm-chx'+(v===maxVal?" hi":"")+'"><div class="row1"><span class="lbl">'+k+'</span><span class="idx">/07</span></div>'
     +'<div class="val">'+v+'</div><div class="x5">&times;5 = '+x5+'%</div>'
     +'<div class="tick"><i style="width:'+tickw+'%"></i></div></div>';
  }).join("");
  return h;
}
// ---- Attribute ticker (full-width band directly under the masthead) —
// literal port of .ticker/.tk/.pips/.pip. Action Points and Luck Points
// are rendered as click-to-spend pip rows exactly like the mockup's own
// Action Pts row (the mockup shows Luck as flat "2/2" text since it's a
// static image; pips are used for both here so the two identical "small
// spendable pool" mechanics share one interaction pattern). Magic Points
// keeps its +/- stepper since it's a wider-range pool, not a pip count.
// Core pp.58, 90: Initiative Bonus (average of INT and DEX, rounded up) minus
// the armour penalty (total worn armour ENC / 5, rounded up), plus the
// current Fatigue modifier. The fight's initiative is 1d10 + this value.
// Core p.105: a surprised character's initiative is 10 lower.
function playInitiativeBonusNow(){
  const c=effectiveChars(),armour=armourPenaltyToInit(),fat=fatigueRow().init||0,surprise=S.play.surprised?-10:0;
  return {base:initBonus(c.INT,c.DEX),armour,fat,surprise,total:initBonus(c.INT,c.DEX)-armour+fat+surprise};
}
function pmTicker(){
  const c=effectiveChars(),initPenalty=armourPenaltyToInit();
  const maxAP=playMaxAP(),usedAP=Math.min(S.play.apUsed,maxAP),remainAP=maxAP-usedAP;
  const maxLuck=playMaxLuck(),curLuck=playCurLuck();
  const maxMagic=playMaxMagic(),curMagic=playCurMagic();
  let h='<div class="pm-ticker">';
  h+='<div class="pm-tk"><span class="k">Action Pts</span><span class="pm-pips" title="Click a pip to spend / restore">'
   +Array.from({length:maxAP},(_,i)=>'<button class="pm-pip'+(i<remainAP?"":" off")+'" aria-label="action point" onclick="APP.playApSetPip('+i+')"></button>').join("")+'</span></div>';
  h+='<div class="pm-tk"><span class="k">Damage Mod</span><span class="v">'+dmCalc(c.STR,c.SIZ)+'</span></div>';
  // Initiative and Move both carry live Fatigue/Encumbrance penalties now, so
  // they're marked (and titled) when they're showing something other than the
  // character's rested, unladen figure.
  const fRow=fatigueRow();
  const ib=playInitiativeBonusNow(),initFat=ib.fat,initVal=ib.total;
  h+='<div class="pm-tk"><span class="k">Initiative</span><span class="v'+(initFat?" mod":"")+'" title="'
   +esc("Base "+initBonus(c.INT,c.DEX)+(initPenalty?", armour -"+initPenalty:"")+(initFat?", Fatigue ("+fRow.name+") "+initFat:""))+'">'+initVal+'</span></div>';
  h+='<div class="pm-tk"><span class="k">Heal Rate</span><span class="v">'+healRate(c.CON)+'</span></div>';
  const mv=moveRate(),gaits=moveGaits();
  h+='<div class="pm-tk"><span class="k">Move</span><span class="v'+(mv.m!==mv.base?" mod":"")+'" title="'
   +esc((mv.notes.length?mv.notes.join("; ")+". ":"Base "+mv.base+"m. ")
     +"Walk "+gaits.walk+"m"+(gaits.run!==null?", Run "+gaits.run+"m":", Run unavailable")+(gaits.sprint!==null?", Sprint "+gaits.sprint+"m":", Sprint unavailable")+(initPenalty?"; armour reduces run and sprint by "+initPenalty+"m":""))+'">'
   +mv.m+'<small>m</small></span></div>';
  h+='<div class="pm-tk"><span class="k">Luck</span><span class="pm-pips" title="Click a pip to spend / restore">'
   +Array.from({length:maxLuck},(_,i)=>'<button class="pm-pip'+(i<curLuck?"":" off")+'" aria-label="luck point" onclick="APP.playLuckSetPip('+i+')"></button>').join("")+'</span></div>';
  h+='<div class="pm-tk"><span class="k">Magic</span><span class="v">'+curMagic+'<small>/'+maxMagic+'</small></span>'
   +'<span class="adj"><button onclick="APP.playMagicAdj(-1)" aria-label="magic minus">&minus;</button><button onclick="APP.playMagicAdj(1)" aria-label="magic plus">+</button></span></div>';
  h+='</div>';
  return h;
}
// ---- Col 4, sect A "04 COMBAT" — literal .wpn weapon blocks, no tiles/
// pips (those live in the ticker now, matching the mockup's own division:
// the ticker carries the combat-adjacent numbers, this section is purely
// the weapon list). Fatigue has nowhere in the mockup's Combat section —
// it's real tracked state with no equivalent there, so it's appended below
// the weapons as a flagged addition rather than invented into the ticker.
// Hazards and recovery reference for the side panel (Core pp.68, 71, 74–80).
// Short paraphrases with page numbers; every outcome stays with the GM.
// Source-checked in docs/advancement-hazard-notes-review.md.
function pmHazardsHTML(){
  const sec=(t,b)=>'<details class="pmx-actinfo"><summary>'+t+'</summary>'+b+'</details>';
  return '<p class="pmx-small">Reminders for the GM to resolve at the table. Enter any damage with the location\'s HP controls; nothing here is applied automatically.</p>'
   +sec("Acid (p.68)",'<table class="pmx-minitable"><tr><th>Acid</th><th>Damage</th><th>Lasts</th></tr><tr><td>Weak</td><td>1d2</td><td>1 round</td></tr><tr><td>Strong</td><td>1d4</td><td>1d2 rounds</td></tr><tr><td>Concentrated</td><td>1d6</td><td>1d3 rounds</td></tr></table><p>A splash or spray stops after its duration; immersion does damage every round until the victim is removed and treated. Armour soaks the damage but loses Armour Points to it; at 0 AP it\'s ruined and the acid reaches the location.</p>')
   +sec("Asphyxiation (p.71)",'<p>Prepared breath-holding lasts Endurance skill in seconds; unprepared, half that when passive or a fifth when strenuous. When time runs out, check Endurance each round: a critical adds no Fatigue, a success one level, a failure 1d2 levels, a fumble 1d3. Once breathing resumes, usually recover one Fatigue level per minute; the GM may keep a level for lung damage from smoke or water.</p>')
   +sec("Blood loss (p.71)",'<p>Common causes: the Bleed Special Effect, a Major Wound, or a bleeding disease or poison. Serious unchecked blood loss can kill, so stopping it comes first. Track the Fatigue it causes; once bleeding stops, recover one level per day, starting the next day.</p>')
   +sec("Disease and poison (pp.74–75)",'<p>Each one lists how it\'s applied, its Potency against a resistance skill (usually Endurance or Willpower), onset, duration, Conditions and cure. The GM may test resistance at exposure or at onset. Its listed antidote or cure, or suitable healing magic, can stop further Conditions, but harm already done may remain. Each named Condition works differently (for example, Fever makes all skills Hard; Exhaustion adds Fatigue): check it on p.75.</p>')
   +sec("Falls (p.78)",'<table class="pmx-minitable"><tr><th>Fall</th><th>Damage</th></tr><tr><td>1m or less</td><td>None</td></tr><tr><td>2–5m</td><td>1d6 to one location</td></tr><tr><td>6–10m</td><td>2d6 to two</td></tr><tr><td>11–15m</td><td>3d6 to three</td></tr><tr><td>16–20m</td><td>4d6 to four</td></tr><tr><td>Each +5m</td><td>+1d6</td></tr></table><p>Roll damage separately for each random location; armour doesn\'t help. Creatures of SIZ 9 or less count the fall as 1–10m shorter, depending on size; above SIZ 20, add 1d6 per 10 points. A successful Acrobatics roll counts the fall as 2m shorter, and without a Serious or Major Wound you land on your feet. Soft ground may halve the distance (GM). Falling from a moving vehicle: its speed in metres per round counts as half the fall height.</p>')
   +sec("Fire (p.79)",'<table class="pmx-minitable"><tr><th>Intensity</th><th>Damage/round</th><th>Ignites</th></tr><tr><td>1 (candle)</td><td>1d2</td><td>1d4 rounds</td></tr><tr><td>2 (torch)</td><td>1d4</td><td>1d3 rounds</td></tr><tr><td>3 (campfire)</td><td>1d6</td><td>1d2 rounds</td></tr><tr><td>4 (room ablaze)</td><td>2d6</td><td>1d2 rounds</td></tr><tr><td>5 (lava)</td><td>3d6</td><td>Instantly</td></tr></table><p>Intensity 1–2 hits one location; 3–4 the nearest 1d4+1; 5 all of them. Burning flammable material damages itself and the flesh beneath, ignoring armour, and spreads to as many locations per round as its Intensity until put out.</p>')
   +sec("Exertion and sleep (pp.78–79)",'<p>Roll Athletics, Brawn or Endurance (whichever suits the effort) after: <b>Light</b> effort, CON hours, Very Easy; <b>Medium</b>, CON minutes, Easy; <b>Strenuous</b>, CON seconds (rounded up to the next round), Standard. Each failure adds one Fatigue level. Awake for twice CON hours: check Endurance, then again after each further half-CON hours, one grade harder each time; each failure adds a level.</p>')
   +sec("Healing (p.80)",'<p>Each location heals your Healing Rate per <b>day</b> (Minor), <b>week</b> (Serious) or <b>month</b> (Major), switching to the faster rate as the wound improves. A Major Wound needs a successful Healing roll first; left untreated, a Major Wound (not a lost limb) becomes a permanent injury after days equal to Healing skill ÷ 20. Strenuous activity cuts the Healing Rate by 1d3 (GM rolls). Magic that heals physical trauma can stop bleeding and immediate death even if the injury remains, but it doesn\'t by itself cure suffocation, poison or disease.</p>')
   +'<p class="pmx-small">Fatigue recovery by cause is in the Fatigue panel; daily healing is in Advance time.</p>';
}
function pmFatiguePanel(){
  const r=fatigueRow();
  const v=charVitals();
  const mv=moveRate();
  const idx=FATIGUE_TABLE.indexOf(r);
  let h='<div class="pm-fatrow"><span title="Fatigue Levels table — each level sets an absolute Skill Grade and penalises Movement, Initiative and Action Points.">Fatigue</span>'
   +'<select class="pm-fatsel" onchange="APP.playSetFatigue(this.value)">'
   +FATIGUE_LEVELS.map(f=>'<option '+(r.name===f?"selected":"")+'>'+f+'</option>').join("")+'</select>'
   +'<span class="pm-fatstep"><button class="pm-sbtn" title="Recover a level" onclick="APP.playFatigueAdj(-1)">&minus;</button>'
   +'<button class="pm-sbtn dmg" title="Accrue a level" onclick="APP.playFatigueAdj(1)">+</button></span></div>';
  if(idx>0){
    const bits=[];
    bits.push('<span class="fx-g">All skill rolls: <b>'+GRADE_LABEL[r.grade]+'</b></span>');
    bits.push('<span>Move <b>'+(mv.immobile?"immobile":mv.m+"m")+'</b></span>');
    if(r.init)bits.push('<span>Initiative <b>'+r.init+'</b></span>');
    if(r.ap)bits.push('<span>Action Points <b>'+r.ap+'</b> (now '+v.maxAP+'/'+v.baseAP+')</span>');
    if(r.act===false)bits.push('<span class="fx-bad"><b>No activities possible</b></span>');
    h+='<div class="pm-fatfx">'+bits.join("")+'<label>Recovery cause <select onchange="APP.playFatigueCause(this.value)"><option value="" '+(!S.play.fatigueCause?'selected':'')+'>All guidance</option><option value="exertion" '+(S.play.fatigueCause==='exertion'?'selected':'')+'>Physical exertion</option><option value="blood" '+(S.play.fatigueCause==='blood'?'selected':'')+'>Blood loss</option><option value="asphyxiation" '+(S.play.fatigueCause==='asphyxiation'?'selected':'')+'>Asphyxiation</option></select></label><span class="pm-fatrec">'+esc(fatigueRecoveryText(S.play.fatigueCause))+'</span></div>';
  }
  return h;
}

/* ================= SPECIAL EFFECTS (Combat chapter, "Special Effects" &
   "Special Effects Summary") =================
   Whenever two combatants make a Differential Roll of opposed skills
   (Combat Style vs Combat Style, or Combat Style vs Evade), the winner's
   margin of success — read straight off the Differential Roll Results
   table below — is how many Special Effects they get to pick, mixing and
   matching freely from anything they qualify for. Transcribed directly off
   the rulebook's own Special Effects Summary table (p.100) plus each
   effect's full description (pp.96-102), not paraphrased from memory. */
const DIFF_TABLE={
  Critical:{Critical:0,Success:1,Failure:2,Fumble:3},
  Success:{Critical:-1,Success:0,Failure:1,Fumble:2},
  Failure:{Critical:-2,Success:-1,Failure:0,Fumble:0},
  Fumble:{Critical:-3,Success:-2,Failure:0,Fumble:0}
};
function playEffectsWon(mine,theirs){return DIFF_TABLE[mine]?.[theirs] ?? 0;}
// Core p.105: the first attack on a Surprised target, if successful, gains a
// bonus Special Effect (e.g. Success vs automatic Failure = 2). Recorded per
// roll by the player; the GM confirms it really is the first such attack.
function rollSurpriseBonus(r){return !!(r&&r.targetSurprised&&r.combatRole==="attack"&&(r.tier==="Critical"||r.tier==="Success")&&r.oppTier&&playEffectsWon(r.tier,r.oppTier)>=0);}
function rollEffectsWon(r){if(!r||!r.oppTier)return 0;return playEffectsWon(r.tier,r.oppTier)+(rollSurpriseBonus(r)?1:0);}
// Core pp.50–51: compare already-modified skills, then subtract the same
// excess over 100 from each participant before determining either result.
function contestedRollResult(skillA,rollA,skillB,rollB){
  if(![skillA,skillB].every(n=>Number.isInteger(n)&&n>=0)||
     ![rollA,rollB].every(n=>Number.isInteger(n)&&n>=1&&n<=100))return null;
  const reduction=Math.max(0,skillA-100,skillB-100);
  const a=Math.max(0,skillA-reduction), b=Math.max(0,skillB-reduction);
  const tierA=resolveRoll(rollA,a), tierB=resolveRoll(rollB,b);
  const rank={Fumble:0,Failure:1,Success:2,Critical:3};
  let opposed;
  if(rank[tierA]<2&&rank[tierB]<2)opposed="Both failed: the GM can call for a reroll or describe the outcome.";
  else if(rank[tierA]!==rank[tierB])opposed=rank[tierA]>rank[tierB]?"First participant wins.":"Second participant wins.";
  else if(rollA===rollB)opposed="Equal successful rolls: ask the GM to adjudicate the tie.";
  else opposed=rollA>rollB?"First participant wins (higher successful roll).":"Second participant wins (higher successful roll).";
  return {reduction,a,b,tierA,tierB,opposed,differential:playEffectsWon(tierA,tierB)};
}
function pmCalculateContest(form){
  const values=["skillA","rollA","skillB","rollB"].map(n=>form.elements[n].value.trim());
  const result=values.some(v=>!/^\d+$/.test(v))?null:contestedRollResult(...values.map(Number));
  const out=form.querySelector('[data-contest-result]');
  if(!result){out.textContent="Enter whole-number skills of 0 or more and rolls from 1 to 100 (use 100 for 00).";return;}
  const d=result.differential;
  out.textContent="Shared reduction: "+result.reduction+"%. Adjusted skills: "+result.a+"% and "+result.b+"%. Results: "+result.tierA+" and "+result.tierB+". Opposed: "+result.opposed+" Differential: "+(d>0?"first participant gains "+d+" level(s).":d<0?"second participant gains "+(-d)+" level(s).":"no benefit.");
}

function pmCalculateModifiedSkill(form){
  const primary=form.elements.primary.valueAsNumber;
  const secondary=form.elements.secondary.valueAsNumber;
  const roll=form.elements.roll.valueAsNumber;
  const method=form.elements.method.value;
  const out=form.querySelector('[data-modified-skill-result]');
  if(![primary,secondary].every(n=>Number.isSafeInteger(n)&&n>=0)||
     !Number.isInteger(roll)||roll<1||roll>100||!["cap","augment"].includes(method)){
    out.textContent="Enter whole-number skill percentages and a roll from 1 to 100.";
    return;
  }
  const augmented=method==="augment";
  const target=augmented?primary+Math.round(secondary/5):Math.min(primary,secondary);
  if(!Number.isSafeInteger(target)){out.textContent="The adjusted percentage is too large.";return;}
  out.textContent=target+"% target. "+resolveRoll(roll,target,augmented?primary:target)+"."
    +(augmented?" Critical and fumble thresholds use "+primary+"%.":"");
}

// The weapon a combat roll was made with. Unarmed is the default style every
// human has (Core p.105): Size S, Reach T, 1d3 + Damage Modifier.
// Core p.105: 1d3 plus the Damage Modifier, which already carries its sign
// ("+1d2", "-1d4"); a +0 modifier adds nothing.
function unarmedDamageText(){const dm=String(dmCalc(effectiveChars().STR,effectiveChars().SIZ)).trim();return /^[+-]?0$/.test(dm)?"1d3":"1d3"+(/^[+-]/.test(dm)?dm:"+"+dm);}
const UNARMED_WEAPON={name:"Unarmed",group:"Unarmed",size:"S",reach:"T",dmg:"1d3",effects:""};
function weaponForRoll(name){return name==="Unarmed"?UNARMED_WEAPON:(name?weaponByName(name)||null:null);}
// Core p.100 lists a weapon type for some Special Effects. The weapon tables
// name the weapon-specific effects each weapon can use (Bash, Bleed,
// Entangle, Impale, Stun Location, Sunder), so those are checked against the
// weapon's own list; the rest by weapon group or Size. With no weapon
// recorded on the roll, every effect stays available for the GM to judge.
const WEAPON_LISTED_EFFECTS=new Set("Bash,Bleed,Entangle,Impale,Stun Location,Sunder".split(","));
// The Combat Style a roll used, if known: weapon rolls record it; a Combat
// Style roll from the Skills list records its key too. Older log entries
// without one fall back to any of the character's styles.
function rollHasTrait(r,trait){
  const keys=r&&r.styleKey?[r.styleKey]:stylesList().map(s=>s.key);
  return keys.some(k=>(styleDef(k).traits||[]).includes(trait));
}
// Core p.61: an Entrapping weapon may Pin Weapon without a Critical; p.62
// footnote: a thrown javelin may Pin Weapon against a shield without one.
function weaponTraits(w){return String(w&&w.traits||"").split(/,\s*/).filter(Boolean);}
function pinWeaponWithoutCritical(effect,r){
  if(!effect||effect[0]!=="Pin Weapon"||!r||!r.weapon)return false;
  const w=weaponByName(r.weapon);if(!w)return false;
  if(weaponTraits(w).includes("Entrapping"))return true;
  return w.name==="Javelin"&&w.group==="Ranged"&&r.combatRole==="attack"&&r.vsShield===true;
}
// Core p.61: Offensive weapons cannot be used to parry.
function weaponCanParry(w){return !!w&&w.group!=="Ranged"&&!weaponTraits(w).includes("Offensive");}
// Core p.101: Weapon Malfunction is a firearms effect only.
function isFirearm(w){return !!w&&(w.firearm===true||/\b(arquebus|musket|pistol|rifle|carbine|blunderbuss|handgonne|firearm|gun)\b/i.test(w.name||""));}
function weaponAllowsEffect(effect,w){
  const req=effect&&effect[3];
  if(!req||!w)return true;
  if(effect[0]==="Weapon Malfunction (Firearms)")return isFirearm(w);
  if(WEAPON_LISTED_EFFECTS.has(effect[0]))return String(w.effects||"").split(/,\s*/).includes(effect[0]);
  if(req==="Ranged Weapons")return w.group==="Ranged";
  if(req==="Unarmed")return w.group==="Unarmed";
  if(/Small/.test(req))return w.size==="S";
  return true;
}
// Core p.88: using a weapon outside your Combat Style. The penalty can never
// take the skill below the base Combat Style (STR+DEX).
const WEAPON_FAMILIARITY=[
  ["similar","Similar weapon: no penalty",0],
  ["broadly","Broadly similar: 1 grade harder",1],
  ["reasonably","Reasonably different: 2 grades harder",2],
  ["combined","Unfamiliar weapon used with a trained one: 1 grade harder",1],
  ["substantially","Substantially different: base STR+DEX",null]
];
function familiarityPct(styleKey,fam){
  const row=WEAPON_FAMILIARITY.find(f=>f[0]===fam);if(!row)return null;
  const c=effectiveChars(),sit=styleKey?gradeForEntry(styleKey):ACTIVE_GRADE,sitMult=GRADE_MULT[sit];
  if(sitMult==null)return {pct:null,grade:sit};
  const floor=Math.max(0,Math.round((c.STR+c.DEX)*sitMult));
  if(row[2]===null||!styleKey)return {pct:floor,grade:sit,floored:true};
  const g=shiftGradeHarder(sit,row[2]),m=GRADE_MULT[g];
  const pct=m==null?0:Math.max(0,Math.round(finalPct(styleKey)*m));
  return pct<floor?{pct:floor,grade:g,floored:true}:{pct,grade:g,floored:false};
}
let PM_EFFECT_ROLL_REF=null;
let PM_FX_SEARCH="";
let PM_FX_EDIT=null;   // the roll whose full effect list is reopened after all choices are made
function selectedEffectRoll(){
  const r=S.rollLog.includes(PM_EFFECT_ROLL_REF)?PM_EFFECT_ROLL_REF:null;
  return r&&r.combat&&["attack","defence"].includes(r.combatRole)&&r.oppTier&&rollEffectsWon(r)>0?r:null;
}
function canPickEffectForRoll(effect,r){
  if(!effect||!r||!["attack","defence"].includes(r.combatRole))return false;
  if(r.combatRole==="attack"&&!effect[1]||r.combatRole==="defence"&&!effect[2])return false;
  if(r.combatKind==="evade"&&["Enhance Parry","Blind Opponent"].includes(effect[0]))return false;
  if(r.weapon&&!weaponAllowsEffect(effect,weaponForRoll(r.weapon)))return false;
  // Core pp.89, 97: Kill Silently needs a Combat Style with Assassination (the
  // GM confirms the first-attack-on-a-surprised-victim condition).
  if(effect[0]==="Kill Silently"&&!rollHasTrait(r,"Assassination"))return false;
  const requirement=effect[4]||"";
  if(requirement==="Attacker Criticals"&&(r.combatRole!=="attack"||r.tier!=="Critical"))return false;
  if(requirement==="Defender Criticals"&&(r.combatRole!=="defence"||r.tier!=="Critical"))return false;
  if(requirement==="Critical Only"&&r.tier!=="Critical"&&!pinWeaponWithoutCritical(effect,r))return false;
  if(requirement==="Opponent Fumbles"&&r.oppTier!=="Fumble")return false;
  if(requirement==="Attacker Fumbles"&&(r.combatRole==="attack"?r.tier:r.oppTier)!=="Fumble")return false;
  return true;
}
// [name, offensive, defensive, weapon restriction, specific roll requirement, stackable, description]
const SPECIAL_EFFECTS=[
["Accidental Injury",0,1,"","Attacker Fumbles",0,"The defender deflects or twists the attack so it fumbles, injuring the attacker instead. Roll damage against the attacker in a random hit location using the weapon used to strike; if unarmed, it's an internal injury that ignores armour."],
["Arise",0,1,"","",0,"Lets the defender use a momentary opening to roll back up onto their feet."],
["Bash",1,0,"Shields or Bludgeoning","",0,"Bashes the opponent off balance. Shields knock them back 1m per 2 points of damage rolled (before reductions); bludgeoning weapons knock back 1m per 3 points. Bash only works against creatures of at most twice the attacker’s SIZ. Forced backward into an obstacle: Hard Athletics/Acrobatics roll or fall/trip."],
["Bleed",1,0,"Cutting Weapons","",0,"Attacker opens a major vessel. If the blow penetrates armour and wounds the target, the defender opposes the attack roll with Endurance. On failure, they lose one level of Fatigue at the start of each Combat Round until collapse and possible death. First Aid can stop the bleeding, but strenuous or violent activity reopens the wound. Core p.96 (Blood Loss p.71). Bleeding does NOT automatically subtract 1 location HP each round."],
["Blind Opponent",0,1,"","Defender Criticals",0,"On a critical, the defender briefly blinds the attacker (thrown sand, a mirror-flash off a shield, etc). The attacker must win an opposed Evade (or Weapon style if using a shield) vs the defender's original parry roll, or suffer the Blindness penalty for the next 1d3 turns."],
["Bypass Armour",1,0,"","Attacker Criticals",1,"On a critical, the attacker finds a gap in the defender's armour. If the defender has both natural and worn armour, the attacker chooses which is bypassed — this can be stacked to bypass both. Magical protection counts as worn armour."],
["Choose Location",1,0,"","See Description",0,"With hand-to-hand weapons the attacker may freely pick the hit location within reach. With ranged weapons this needs a Critical, unless the target is at Close Range and either stationary or unaware of the attacker. In close combat it can't pick a location the defender is passively blocking; choose another location in reach instead (p.105)."],
["Circumvent Cover",1,0,"Ranged Weapons","",0,"Lets the shooter fire around or through the target's cover — a trick shot such as a ricochet, requiring a Critical for anything beyond a modest reduction in the cover's protection."],
["Circumvent Parry",1,0,"","Attacker Criticals",0,"On a critical, the attacker completely bypasses an otherwise-successful parry."],
["Close Range",1,1,"","",0,"Automatically changes the engagement range between the two combatants so they end up at the range favoured by the shorter weapon. Under the optional Closing & Opening Range rule (p.106, see the note above), closing inside a longer weapon's Reach (two or more Reach steps longer) also negates that weapon's ability to parry; its Size drops by as many steps as the difference in Reach, and it only inflicts 1d3+1 damage, until the range changes again."],
["Compel Surrender",1,1,"","",0,"Forces the chance of surrender from a helpless or disadvantaged opponent (disarmed, prone and unable to regain footing, seriously — or worse — wounded, and so on). No damage is inflicted: the target is threatened rather than struck. If the target can understand the demand, it makes an opposed Willpower roll vs the original attack/parry roll or capitulates. GMs may wish to reserve this for NPCs only."],
["Damage Weapon",1,1,"","",0,"Permits the character to damage the opponent's weapon as part of an attack or parry, applying the damage roll to the targeted weapon rather than its wielder. The weapon uses its own Armour Points to resist; reduced to zero Hit Points, it breaks."],
["Disarm Opponent",1,1,"","",0,"Knocks, yanks, or twists the opponent's weapon out of their hand. The opponent must make an opposed roll of their Combat Style against the character's original roll; if they lose, the weapon is flung a distance equal to the disarmer's Damage Modifier in metres (or drops at their feet with no Damage Modifier). Relative weapon size shifts the roll's difficulty grade. Only works on creatures up to twice the attacker's STR."],
["Drop Foe",1,0,"Ranged Weapons","",0,"Assuming the target suffers at least a minor wound, they're forced into an opposed test of Endurance against the attacker's hit roll. Failure means they succumb to shock and pain, becoming incapacitated. First Aid or technological/narcotic aid can end incapacitation early; otherwise it lasts one hour divided by the target's Healing Rate."],
["Duck Back",1,0,"Ranged Weapons","",0,"Lets the shooter immediately duck back into cover, without needing to wait for their next Turn to use the Take Cover action. The character must already be standing or crouching adjacent to some form of cover."],
["Enhance Parry",0,1,"","Defender Criticals",0,"On a critical, the defender manages to deflect the entire force of an attack, no matter the Size of the weapon involved."],
["Entangle",1,1,"Entangling Weapons",0,0,"Immobilises the location struck with a whip, net, or similar. An entangled arm can't use whatever it's holding; a snared leg prevents movement; an entangled head, chest, or abdomen makes all skill rolls one grade harder. On their following turn the wielder may spend an Action Point to make an automatic Trip Opponent attempt. An entangled victim can try to free themselves with an opposed Brawn roll, or by winning a Special Effect and selecting Damage Weapon, Disarm Opponent, or Slip Free."],
["Flurry",1,0,"Unarmed",0,1,"An unarmed attacker can make an immediate follow-up attack using a different limb or body part, without needing to wait for their next turn. The additional attack still costs an Action Point, but potentially allows several attacks in sequence before the defender can respond."],
["Force Failure",1,1,"","Opponent Fumbles",0,"Used when an opponent fumbles: the character can combine Force Failure with any other Special Effect that requires an opposed roll to work, causing the opponent to fail their resistance roll by default — automatically disarmed, tripped, etc."],
["Grip",1,0,"Unarmed","",0,"Provided the opponent is within the attacker's Unarmed reach, they can use an empty hand (or similar gripping limb — claws, tail) to hold onto the opponent, preventing them from changing range or disengaging. The opponent may attempt to break free on their turn with an opposed roll of Brawn or Unarmed."],
["Impale",1,0,"Impaling Weapons","",0,"The attacker drives an impaling weapon deep into the defender. Roll weapon damage twice and choose the better result, if armour is penetrated and a wound caused. The attacker can leave the weapon in the wound — inflicting a difficulty grade on the victim's future skill attempts, worse for larger weapons in smaller victims — or yank it free next turn (unopposed Brawn roll, or opposed if the opponent resists) for further injury equal to half the normal damage roll to the same location."],
["Kill Silently",1,0,"Small Weapons","See Description",0,"Restricted to Combat Styles trained with the Assassination benefit. Neutralises a victim in complete silence, covering their mouth or grasping their throat while stabbing, cutting, or garrotting. This prevents the victim from crying out or otherwise raising an alarm. If the attack inflicts a Serious or Major Wound, the victim automatically fails their Endurance roll. Kill Silently can only be used on a surprised opponent, and only on the first attack against them."],
["Marksman",1,0,"Ranged Weapons","",0,"Permits the shooter to move the hit location struck by his shot one step to an immediately adjoining body area — physiology and common sense should apply to what's a plausible retarget."],
["Maximise Damage",1,0,"","Attacker Criticals",1,"On a critical the character may substitute one of their weapon's damage dice for its full value (e.g. 1d6 becomes a 6). Can be stacked. Does not affect the Damage Modifier of the attacker, which must still be rolled normally; cannot be used with natural weapons."],
["Open Range",0,1,"","",0,"Permits the character to automatically change the engagement range between themselves and their opponent, so they end up at the range favoured by the longer weapon. Under the optional Closing & Opening Range rule (p.106, see the note above), holding a foe at your weapon's longer Reach restricts their shorter weapon to attacking your weapon itself (trying to knock it aside, grab it, etc) rather than you, until they can close the distance."],
["Overextend Opponent",0,1,"","",1,"The defender sidesteps or retreats at an inconvenient moment, causing the attacker to overreach themselves. The opponent cannot attack on their next turn. This Special Effect can be stacked."],
["Overpenetration",1,0,"Ranged Weapons","Critical Only",0,"If shooting at densely packed opponents or into a tightly packed group, this effect allows the shot to travel completely through the first victim's body armour and strike a second victim behind them, at half damage due to attenuation/slowing down of the shot."],
["Pin Down",1,0,"Ranged Weapons","",1,"Similar to Press Advantage, this Special Effect forces the target to make an opposed Test of their Willpower against the attacker's hit roll. Failure means the target hunkers down behind whatever cover is available, and cannot return fire on their next Turn."],
["Pin Weapon",1,1,"","Critical Only",0,"On a critical the character can pin one of their opponent's weapons or shield, using their body or positioning to hold it in place. On their turn the opponent may attempt to wrestle or manoeuvre the pinned item free, costing an Action Point and working as per the Grip Special Effect. Failure means the pinned item remains unusable; in the meantime, the opponent lacking a weapon or shield in that hand may only avoid an attack by evading, using Unarmed skill, or disengaging completely."],
["Prepare Counter",0,1,"","",1,"The defender reads the patterns of their foe and pre-plans a counter against a specific Special Effect (which should be noted down in secret). If their opponent attempts to inflict the chosen Special Effect upon them during the fight, the defender instantly substitutes the attacker's effect with an offensive or defensive one of their own, which succeeds automatically."],
["Press Advantage",1,0,"","",0,"The attacker pressures their opponent, so that their foe is forced to remain on the defensive and cannot attack on their next turn. This allows the attacker to potentially establish an unbroken sequence of attacks while the defender desperately blocks. Only effective against foes concerned with defending themselves."],
["Rapid Reload",1,0,"","",1,"When using a ranged weapon, the attacker reduces the reload time for their next shot by one. This effect can be stacked."],
["Remise",1,0,"Small Weapon Only","",0,"The attacker performs a sequential follow-up attack with a weapon of Size Small on their opponent's next turn, which forces the foe to change their proactive action into a reactive one."],
["Scar Foe",1,1,"","",0,"The opponent is given a scar that will disfigure them for the rest of their life — for example, a slice across the face, or an artfully inscribed letter across the chest."],
["Select Target",0,1,"","Attacker Fumbles",0,"When an attacker fumbles, the defender may manoeuvre or deflect the blow in such a way that it hits an adjacent bystander instead. This requires that the new target be within reach of the attacker's close combat weapon, or in the case of a ranged attack, standing along the line of fire. The new victim is taken completely by surprise and has no chance to avoid the attack, which automatically hits — but in compensation, they suffer no Special Effect from it."],
["Slip Free",0,1,"","Defender Criticals",0,"On a critical, the defender can automatically escape being Entangled, Gripped, or Pinned."],
["Stand Fast",0,1,"","",0,"The defender braces themselves against the force of an attack, allowing them to avoid the Knockback effects of any damage received."],
["Stun Location",1,0,"Bludgeoning Weapons","",0,"The attacker can use a bludgeoning weapon to temporarily stun the body part struck. If the blow overcomes Armour Points and injures the target, the defender must make an opposed roll of Endurance vs the original attack roll. If the defender fails, the Hit Location is incapacitated for a number of turns equal to the damage inflicted. A torso hit (chest or abdomen) leaves the defender staggered and winded, able only to defend. A head hit renders the defender briefly insensible. Core p.100."],
["Sunder",1,0,"Axes, Two Handed Weapons","",0,"The attacker may use a suitable weapon to damage the armour or natural protection of an opponent. Any weapon damage, after reductions for parrying or magic, is applied against the Armour Points value of the protection. Surplus damage in excess of the Armour Points is then used to reduce the AP value of that armoured location — ripping straps, bursting rings, creasing plates, or tearing away scales/chitin. If any damage remains after the protection has been reduced to zero AP, it carries over to the Hit Points of the location struck."],
["Take Weapon",1,1,"Unarmed","",0,"Allows an unarmed character to yank or twist an opponent's weapon out of their hand. The opponent must make an opposed roll of their Combat Style against the character's original Unarmed roll. If the target loses, their weapon is taken and from that moment on may be used by the character instead. Take Weapon differs from Disarm Opponent in that the Size of the weapon is largely irrelevant. However, the technique only works on creatures of up to twice the attacker's STR."],
["Trip Opponent",1,1,"","",0,"The character attempts to overbalance or throw their opponent to the ground. The opponent must make an opposed roll of their Brawn, Evade, or Acrobatics against the character's original roll. If the target fails, they fall prone. Quadrupeds (or creatures with even more legs) may substitute their Athletics skill for Evade, and treat the roll as one difficulty grade easier."],
["Weapon Malfunction (Firearms)",1,0,"Ranged Weapons","Attacker Fumbles",0,"The attacker's weapon malfunctions in such a way that it is rendered useless until time can be spent repairing it. Core p.100 lists this as offensive and requiring the attacker to fumble; those conditions cannot produce a winning offensive effect in the standard differential table. Ask the GM to adjudicate and record the result manually."],
["Withdraw",0,1,"","",0,"The defender may automatically withdraw out of reach, breaking off engagement with that particular opponent."]
];

// Reach categories (core p.106), shortest to longest. Every melee/shield
// entry in WEAPONS already carries one of these in its "reach" field — this
// just gives that existing data an order so Play Mode can explain, in plain
// language, which of a character's actual weapons out-reaches which.
const REACH_ORDER=["T","S","M","L","VL"];
const REACH_NAME={T:"Touch",S:"Short",M:"Medium",L:"Long",VL:"Very Long"};
// Groups the 43 Special Effects by what the winner is actually trying to
// accomplish (per notesfrompavis.blog's "Tactics of Selecting Special
// Effects" posts) instead of alphabetically — lets a player who knows
// "I want to disarm them" jump straight to the relevant handful instead of
// scanning the full list. Effects not mentioned by name fall into a final
// "Other" bucket automatically, so this can never silently drop one.
const FX_GROUPS=[
  ["Hurt or finish them off",["Bleed","Impale","Maximise Damage","Bypass Armour","Circumvent Cover","Overpenetration","Drop Foe","Kill Silently"]],
  ["Disarm, break, or steal their edge",["Disarm Opponent","Take Weapon","Damage Weapon","Sunder"]],
  ["Stop them acting / force a bad turn",["Press Advantage","Pin Down","Force Failure","Overextend Opponent","Compel Surrender","Remise"]],
  ["Immobilise, trap, or knock down",["Bash","Entangle","Grip","Pin Weapon","Stun Location","Trip Opponent"]],
  ["Control range and positioning",["Close Range","Open Range","Circumvent Parry","Choose Location","Marksman","Withdraw"]],
  ["Protect yourself / recover",["Enhance Parry","Stand Fast","Arise","Slip Free","Select Target","Blind Opponent","Accidental Injury","Prepare Counter","Weapon Malfunction (Firearms)"]],
  ["Follow-up attacks & tempo",["Flurry","Rapid Reload","Duck Back"]],
  ["Battlefield theatre",["Scar Foe"]]
];
// Shared by every effect row below (was duplicated verbatim between the
// FX_GROUPS loop and the "Other" leftover bucket) -- data-search carries a
// lowercased "name + rules text" blob for pmFxFilter() below to match
// against without re-lowercasing on every keystroke.
function fxItemHTML(effect){
  const [name,off,def,weapon,roll,stack,text]=effect;
  const selected=selectedEffectRoll(), picked=selected?.effectsPicked||[];
  const count=picked.filter(n=>n===name).length;
  const canChoose=canPickEffectForRoll(effect,selected)&&picked.length<rollEffectsWon(selected)&&(!count||stack)&&!VIEW_ONLY;
  const choose=canChoose?'<button type="button" class="pm-btn sm pm-fx-choose" onclick="event.preventDefault();event.stopPropagation();APP.playChooseEffect('+SPECIAL_EFFECTS.indexOf(effect)+')">Choose</button>':"";
  const badges=[off?'<span class="pm-fx-badge off">Offensive</span>':"",def?'<span class="pm-fx-badge def">Defensive</span>':"",
    weapon?'<span class="pm-fx-badge">'+esc(weapon)+'</span>':"",roll?(selected&&pinWeaponWithoutCritical(effect,selected)?'<span class="pm-fx-badge roll" title="Critical Only normally; this weapon\'s exception applies (Core pp.61–62)">No Critical needed</span>':'<span class="pm-fx-badge roll">'+esc(roll)+'</span>'):"",
    stack?'<span class="pm-fx-badge stack">Stacks</span>':""].join("");
  return '<div class="pm-fx-item pmx-fxrow" data-search="'+esc((name+" "+text).toLowerCase())+'"><button type="button" class="pmx-link pmx-fxname" onclick="APP.pmPopup(\'fx\','+SPECIAL_EFFECTS.indexOf(effect)+')" title="What it does">'+esc(name)+'</button> '+badges+choose+'</div>';
}
// One tactical-intent group (see FX_GROUPS) as a collapsible <details> --
// open by default (matches what the list always looked like before), but
// now a player can fold away groups they don't need instead of just
// scrolling past them, and pmFxFilter() below can hide a group outright
// when nothing in it matches an active search.
function fxGroupHTML(groupName,effects){
  if(!effects.length)return "";
  return '<details class="pm-fx-group" open><summary class="pm-fx-grouphead"><span>'+esc(groupName)+'</span><span class="pm-fx-groupcount">'+effects.length+'</span></summary>'
   +'<div class="pm-fx-groupbody">'+effects.map(fxItemHTML).join("")+'</div></details>';
}
// Renders the "Special Effects" tab: the Differential Roll cheat-table
// (how many effects a given margin of success wins), an optional-rule note
// on Weapon Reach, a search box, and the full, book-accurate list of
// effects grouped by tactical intent (see FX_GROUPS above) rather than
// alphabetically — a new player thinking "I want to disarm them" can jump
// straight to the right handful, or just type "disarm". Each effect is
// collapsed behind its own <details> so the tab isn't an intimidating wall
// of text; only the summary badges (Offensive/Defensive, weapon
// restriction, roll requirement, stackable) show until expanded, and now
// each *group* is independently collapsible too.
function specialEffectsPanel(){
  let h='<p class="pm-notes">Choose an effect below. Open it for its requirements and outcome; your roll result tells you how many you may choose.</p>';
  const r=selectedEffectRoll();
  if(r){
    const picked=r.effectsPicked||[], limit=rollEffectsWon(r);
    h+='<div class="pm-fx-selection"><b>'+esc(r.label)+': '+picked.length+'/'+limit+' chosen</b>'
      +(picked.length?'<div class="pm-fx-picks">'+picked.map((name,i)=>'<button type="button" class="pm-btn sm" title="Remove '+esc(name)+'" onclick="APP.playRemoveEffectChoice('+i+')">'+esc(name)+' &times;</button>').join("")+'</div>':"")
      +'<span>Role: '+(r.combatRole==='attack'?'attacker':'defender')+'. Check weapon and situational requirements with your GM. Selection records the choice; resolve its outcome at the table.</span></div>';
  }
  h+='<input type="text" class="pm-fx-search" aria-label="Search Special Effects" value="'+esc(PM_FX_SEARCH)+'" placeholder="Search '+SPECIAL_EFFECTS.length+' Special Effects by name or effect&hellip;" oninput="pmFxFilter(this)">';
  h+='<div class="pm-fx-list">'+FX_GROUPS.map(([groupName,names])=>{
    const items=names.map(n=>SPECIAL_EFFECTS.find(e=>e[0]===n)).filter(Boolean);
    return fxGroupHTML(groupName,items);
  }).join("")
   +fxGroupHTML("Other",SPECIAL_EFFECTS.filter(e=>!new Set(FX_GROUPS.flatMap(([,names])=>names)).has(e[0])))
   +'</div>';
  h+='<details class="pm-fx-item" style="margin-top:14px"><summary>Contested roll calculator <span class="pm-fx-badge">Core pp.50–51</span></summary><p>Enter each participant’s effective skill after difficulty and other modifiers, and their d100 roll. Use 100 for 00. This calculator does not change your roll log.</p><form onsubmit="event.preventDefault();pmCalculateContest(this)"><label>First skill % <input name="skillA" type="number" min="0" step="1" required></label> <label>First roll <input name="rollA" type="number" min="1" max="100" step="1" required></label> <label>Second skill % <input name="skillB" type="number" min="0" step="1" required></label> <label>Second roll <input name="rollB" type="number" min="1" max="100" step="1" required></label> <button class="pm-btn sm" type="submit">Compare rolls</button><p data-contest-result role="status"></p></form></details>';
  h+='<details class="pm-fx-item" style="margin-top:14px"><summary>How many Special Effects? <span class="pm-fx-badge">Roll comparison</span></summary><div class="pm-tablewrap"><table class="pm-atktable"><tr><th>You rolled</th><th>Opponent Critical</th><th>Opponent Success</th><th>Opponent Failure</th><th>Opponent Fumble</th></tr>'
   +["Critical","Success","Failure","Fumble"].map(mine=>'<tr><td><b>'+mine+'</b></td>'
     +["Critical","Success","Failure","Fumble"].map(theirs=>{const n=playEffectsWon(mine,theirs);
       return '<td>'+(n>0?'You win '+n:(n<0?'Opponent wins '+(-n):'No benefit'))+'</td>';}).join("")+'</tr>').join("")
   +'</table></div></details>';
  // Optional Reach rule callout, made concrete using this character's own
  // equipped melee/shield weapons where possible instead of just abstract
  // categories.
  const myReach=(S.gearWeapons||[]).map(nm=>weaponByName(nm)).filter(w=>w&&w.group!=="Ranged"&&REACH_ORDER.includes(w.reach)) // ranged weapons keep Force in this field, not Reach
    .map(w=>w.name+" ("+REACH_NAME[w.reach]+")");
  h+='<details class="pm-fx-item" style="margin-bottom:14px"><summary>Optional Rule: Closing &amp; Opening Range <span class="pm-fx-badge">p.106</span></summary>'
   +'<p>Weapons have a Reach — Touch, Short, Medium, Long, or Very Long, shortest to longest ('+REACH_ORDER.map(r=>REACH_NAME[r]).join(" &lt; ")+') — shown on every melee weapon and shield on your character sheet. Before anyone swings, combatants can jockey for range:</p>'
   +'<p><b>Closing in</b> (the <i>Close Range</i> Special Effect, or simple GM-adjudicated positioning): moving inside a longer weapon’s Reach means that weapon can no longer parry. It can still strike with the haft, but its Size drops by <b>as many steps as the difference between the two weapons’ Reach</b>, and it only inflicts <b>1d3+1</b> damage, for as long as the fight stays that close. These rules apply only when the Reach difference is two or more steps: a dagger (Short) against a falchion (Medium) suffers nothing, against a great axe (Long) it does (Core p.106).</p>'
   +'<p><b>Holding them off</b> (the <i>Open Range</i> Special Effect): keeping the fight at your weapon’s longer Reach means the shorter weapon can only attack <i>your weapon itself</i> — trying to knock it aside, sunder it, grab it — not you, until they manage to close the distance.</p>'
   +(myReach.length?'<p class="pm-notes">Your weapons, shortest to longest reach: '+myReach.sort((a,b)=>REACH_ORDER.indexOf((weaponByName(a.split(" (")[0])||{}).reach)-REACH_ORDER.indexOf((weaponByName(b.split(" (")[0])||{}).reach)).join(", ")+'.</p>':'')
   +'</details>';
  return h;
}
// Pure client-side filter for the search box above -- deliberately NOT
// routed through APP.*/render() like the rest of this app's interactions:
// re-rendering the whole Play Mode tree on every keystroke would tear out
// and rebuild the <input> itself, losing focus and cursor position after
// every character typed. This just walks the already-rendered DOM
// directly. Groups with zero matches hide entirely rather than just
// showing empty; groups with a match force themselves open so the result
// is actually visible. Clearing the search (q="") restores every item's
// visibility without touching open/closed state, so a group the player
// manually collapsed stays collapsed rather than snapping back open.
function pmFxFilter(input){
  const q=input.value.trim().toLowerCase();
  PM_FX_SEARCH=input.value;
  document.querySelectorAll('.pm-fx-group').forEach(group=>{
    let anyVisible=false;
    group.querySelectorAll('.pm-fx-item').forEach(item=>{
      const match=!q||(item.dataset.search||"").includes(q);
      item.style.display=match?"":"none";
      if(match)anyVisible=true;
    });
    group.style.display=anyVisible?"":"none";
    if(q&&anyVisible)group.open=true;
  });
}
// Play Mode's Magic tab: everything the character knows, grouped by
// tradition, each castable — which rolls the tradition's actual casting skill
// through the same graded pipeline as any other roll and deducts the cost
// from the right pool.
function pmCastingNotesHTML(){
  return '<p class="pm-empty">Sorcery and Mysticism use turn trackers; rolls occur on the final turn. AP and interruption are GM-managed. Mysticism activation and durations are manual; confirm each Talent category with the GM. Casting is blocked if you lack the minimum available points. Folk Magic, Sorcery, Mysticism, and Theism use distinct result-dependent costs (Core pp.122, 156, 165, 181). Animism has separate bound-spirit commands and manual tracking for spirit contact, binding vessel, and spirit-combat MP (Core pp.134–139); summoning, ritual Binding and spirit combat outcomes still require GM resolution. Consult Mythras Core and your GM for other requirements and effects.</p>';
}
function magicPanel(){
  const all=allMagic();
  const prep=(S.play.mysticismCasting?'<p class="pm-empty">Talent preparation: '+S.play.mysticismCasting.completed+' / '+S.play.mysticismCasting.total+' turns. <button class="pm-btn sm" onclick="APP.mysticismCancel()">Cancel preparation</button> Resolve interruption and other actions with your GM.</p>':'')
   +(S.play.theismCasting?'<p class="pm-empty">Miracle exhortation: '+S.play.theismCasting.completed+' / '+S.play.theismCasting.total+' turns. <button class="pm-btn sm" onclick="APP.theismCancel()">Cancel exhortation</button> Resolve interruption with your GM.</p>':'');
  if(!all.length)return prep+'<p class="pm-empty">No magic known — pick some up on the Magic step in the Character Builder.</p>';
  let h='<div class="pm-magicpools">'
   +'<span>Magic Points <b>'+playCurMagic()+'</b>/'+playMaxMagic()+'</span>';
  if(devotionalMax()>0){
    h+='<span>Devotional Pool <b>'+devotionalCur()+'</b>/'+devotionalMax()+'</span>'
     +'<span class="pm-devadj"><button class="pm-sbtn" onclick="APP.devotionalAdj(1)" aria-label="restore devotional point">+</button>'
     +'<button class="pm-sbtn dmg" onclick="APP.devotionalAdj(-1)" aria-label="spend devotional point">&minus;</button>'
     +'<button class="pm-btn sm" onclick="APP.devotionalReset()">refill</button></span>';
  }
  h+='</div>'+prep;
  if(devotionalMax()>0)h+='<details class="pm-fx-item"><summary>Donate personal Magic Points <span class="pm-fx-badge">Core p.180</span></summary><p>At a suitable holy place, confirm the donation with the GM. This uses the Core suggested rule: the pool becomes the donation amount if greater than the current pool, rather than adding the donation to it. Other sources and variants remain manual.</p><label>Points donated <input id="devDonation" type="number" min="1" step="1"></label> <label><input id="devDonationConfirmed" type="checkbox"> Holy place and donation confirmed</label> <button type="button" class="pm-btn sm" onclick="APP.devotionalDonate(document.getElementById(\'devDonation\').value,document.getElementById(\'devDonationConfirmed\').checked)">Donate</button><p>Manual +, − and refill controls above remain available for GM-directed adjustments.</p></details>';
  const poolLimit=devotionalRankLimit();
  if(Number.isInteger(poolLimit)&&devotionalMax()>poolLimit)h+='<p class="warn" role="alert">The recorded Devotional Pool exceeds the confirmed rank limit ('+poolLimit+'). Review it in the builder before casting; saved points are preserved.</p>';
  MAGIC_TRADITIONS.forEach(t=>{
    const items=all.map((m,idx)=>({m,idx})).filter(x=>x.m.tradition===t.key);
    if(!items.length)return;
    const key=magicSkillKey(t.castSkill);
    const pctTxt=key?(()=>{const g=gradedPct(key,finalPct(key));return g.pct===null?GRADE_LABEL[g.grade]:g.pct+"%";})():"no skill";
    h+='<div class="pm-skillgroup"><h4>'+esc(t.label)+' <span class="pm-empty">'+esc(t.castSkill)+' '+pctTxt+'</span></h4>';
    h+=items.map(({m,idx})=>{
      let meta="";
      if(t.key==="folk")meta="1 MP base · 1 Turn · Intensity 1 · Magnitude 1 · ranged "+folkMagicRangeMetres(key?finalPct(key):0)+" m"+(m.spell?.t?.length?" · "+m.spell.t.join(", "):"");
      else if(t.key==="sorcery"){const c=sorceryCost(m);meta=c.mp+" MP · "+c.turns+" turn"+(c.turns>1?"s":"")+(c.shapings?" · "+Object.entries(sorceryLevels(m)).map(([k,v])=>k+" "+v).join(", "):" · unshaped")+(c.combinedSpells?" · +"+c.combinedSpells+" combined":"");}
      else if(t.key==="animism")meta="POW "+(m.pow||0)+" · CHA "+(m.cha||0)+" · Intensity "+(m.intensity||1)+" · "+(m.spiritStatus==="bound"?"BOUND":"UNBOUND")+(Number.isInteger(m.spiritMP)?" · spirit MP "+m.spiritMP:"");
      else if(t.key==="theism"){const d=theismDetails(m);meta=d?d.cost+" from pool · "+d.turns+" turns":"Confirm miracle level in builder";}
      else if(t.key==="mysticism"){const det=mysticismDetails(m);meta=(det?det.cost+" MP":"Confirm Talent category and Intensity")+" · Intensity "+(m.intensity||1)+(m.active?" · ACTIVE":"");}
      else meta=(m.cost||0)+(t.pool==="devotional"?" from pool":" MP")+" · Intensity "+(m.intensity||1)+(t.key==="mysticism"&&m.active?" · ACTIVE":"");
      const body=(t.key==="folk"&&m.spell)?m.spell.d:(m.notes||"");
      const castingKey={sorcery:"sorceryCasting",mysticism:"mysticismCasting",theism:"theismCasting"}[t.key];
      const casting=castingKey&&S.play[castingKey]?.index===idx?S.play[castingKey]:null;
      if(casting)meta+=" · CASTING "+casting.completed+"/"+casting.total;
      if(t.key==="mysticism"&&m.active&&m.durationTurns>0)meta+=" · "+(m.remainingTurns||0)+" turns left";
      return '<details class="pm-fx-item"'+(casting?' open':'')+'><summary>'+esc(magicLabel(m))
       +' <span class="pm-fx-badge">'+esc(meta)+'</span>'
       +'<button class="pm-btn roll" onclick="event.preventDefault();event.stopPropagation();'+(t.key==="animism"?'APP.commandSpirit('+idx+')':'APP.castMagic('+idx+')')+'">'+(t.key==="animism"?"Command spirit":"cast")+'</button></summary>'
       +(casting?'<button class="pm-btn sm" onclick="APP.'+({sorcery:"sorceryCancel",mysticism:"mysticismCancel",theism:"theismCancel"}[t.key])+'()">Cancel casting</button>':'')
       +(t.key==="animism"?'<div class="pm-fx-resolve">Contact: '+esc(m.spiritContact||"unknown")+' · Attitude: '+esc(m.spiritAttitude||"neutral")+' · Vessel: '+esc(m.bindingType||"none")+'. Summoning and ritual binding require GM resolution (Core pp.134–137).</div>'
        +'<div class="pm-fx-resolve">Spirit combat MP (manual): '+(Number.isInteger(m.spiritMP)?m.spiritMP:'not tracked')+' <button class="pm-btn sm" onclick="APP.spiritMPAdjust('+idx+',-1)">−1</button> <button class="pm-btn sm" onclick="APP.spiritMPAdjust('+idx+',1)">+1</button></div>'
        +(m.spiritCombatNote?'<p>'+esc(m.spiritCombatNote)+'</p>':''): '')
       +(t.key==="mysticism"&&m.active&&m.durationTurns>0?'<button class="pm-btn sm" onclick="APP.talentTurn('+ (idx-S.magic.folk.length) +')">Advance Talent 1 turn</button>':'')
       +(body?'<p>'+esc(body)+'</p>':'<p class="pm-empty">No effect text recorded — add it on the Magic step.</p>')+'</details>';
    }).join("");
    h+='</div>';
  });
  h+='<p class="pmx-small"><button type="button" class="pmx-link" onclick="APP.pmPopup(\'casting\')">How casting works here</button></p>';
  return h;
}
// A roll-log row. Combat Style rolls that beat a Success (i.e. Critical or
// Success) get an inline "opponent rolled..." picker so a first-timer can
// immediately see how many Special Effects that roll actually won, instead
// of having to separately look up the Differential Roll table themselves.
// ---- Literal .log-e/.d/.w/.r "press log" row from playmode-restyle-D.html.
// D's own tiering is static (one example row per tier), but the classes
// map directly onto the real tier this roll actually resolved to: Critical
// gets the full-bleed inverted treatment, Failure/Fumble get the red
// strikethrough treatment, Success gets the plain default row.
function playRollLogRow(r,i){
  const tierCls=r.tier==="Critical"?" crit":(r.tier==="Failure"||r.tier==="Fumble")?" fail":"";
  let row='<div class="log-e'+tierCls+(i===0?" fresh":"")+'">'
   +'<span class="d">'+(r.roll===100?"00":r.roll)+'</span>'
   +'<span class="w">vs '+esc(r.label)+' '+r.pct+'%</span>'
   +'<span class="r">'+r.tier+'</span>'
   +(r.magic?'<div class="pm-fx-resolve">'+esc(r.magic)+'</div>':"");
  // Shown for every combat roll, not just Criticals/Successes — a Failure
  // or Fumble can still hand the *opponent* Special Effects off the same
  // Differential Roll table, so a new player needs to see that too, not
  // just when they themselves won.
  // The full combat flow (role, weapon, opponent result, effects) lives on
  // the Combat tab's card; the log row is a summary that leads there.
  if(r.combat){
    let sum;
    if(!r.combatRole||!r.oppTier)sum='Needs '+(!r.combatRole?'attack or defence':'the opponent\'s result')+'.';
    else{const n=rollEffectsWon(r),opp=r.opponentAction==='no-parry'?'no defence':'opponent '+r.oppTier;
      sum='vs '+opp+' &rarr; '+(n>0?'<b>you win '+n+' Special Effect'+(n>1?"s":"")+'</b>':n<0?'<b>opponent wins '+(-n)+'</b>':'no Special Effects');}
    row+='<div class="pm-fx-resolve">'+sum+' <button class="pm-btn sm" onclick="APP.playJumpToEffects('+i+')">'+(!r.combatRole||!r.oppTier?'Resolve':(r.effectsPicked||[]).length?'Change effects':'Open')+'</button>'
      +(r.combatRole&&r.oppTier?' <button class="pm-btn sm" onclick="APP.playJumpToInjury()">Record injury</button>':'')
      +((r.effectsPicked||[]).length?' <span>Chosen: '+esc(r.effectsPicked.join(', '))+'</span>':'')+'</div>';
  }
  return row+'</div>';
}
// ---- New item gifts (GM → player) ----
// A GM gives an item from the player's Inventory tab. It is stored on the
// item itself as gift:{id,reveal,note,at,seen}. The owner's sheet shows a
// pop-up for each unseen gift: a small notice, or the full reveal when the
// GM ticked "Reveal".
function giftValid(g){return !!g&&typeof g==="object"&&typeof g.id==="string"&&/^[a-z0-9]{4,40}$/.test(g.id);}
// Every gift id this sheet has ever held, so a gift the player later drops
// is never pulled back in from an older account copy.
function rememberGifts(state){
  state=state||S;state.play=state.play||{};
  const known=new Set(Array.isArray(state.play.giftKnown)?state.play.giftKnown:[]);
  for(const it of state.inventory||[])if(giftValid(it.gift))known.add(it.gift.id);
  state.play.giftKnown=[...known].slice(-200);
  return known;
}
function unseenGifts(state){state=state||S;return (state.inventory||[]).filter(it=>giftValid(it.gift)&&it.gift.seen!==true);}
function giftDetailText(it){
  const bits=[(it.qty||1)>1?"×"+it.qty:"",Number(it.enc)>0?"ENC "+it.enc:"",Number(it.cost)>0?it.cost+" sp":""].filter(Boolean);
  return bits.join(" · ");
}
function giftPopupHtml(){
  if(VIEW_ONLY||APPVIEW!=="play")return "";
  const gifts=unseenGifts();if(!gifts.length)return "";
  const it=gifts[0],g=it.gift,more=gifts.length-1,detail=giftDetailText(it);
  const note=g.note?'<p class="gift-note">'+esc(g.note)+'</p>':'';
  const tail=more?'<span class="gift-more">'+more+' more new item'+(more>1?'s':'')+'</span>':'';
  if(g.reveal){
    return '<div class="gift-reveal" role="dialog" aria-modal="true" aria-labelledby="giftRevealName">'
     +'<div class="gift-panel"><div class="gift-rays" aria-hidden="true"></div>'
     +'<p class="gift-kicker">New item</p>'
     +'<h2 id="giftRevealName" class="gift-name">'+esc(it.name||"Unnamed item")+'</h2>'
     +(detail?'<p class="gift-detail">'+esc(detail)+'</p>':'')+note
     +'<div class="gift-actions">'+tail+'<button type="button" class="pm-btn" onclick="APP.giftSeen(\''+g.id+'\')" autofocus>Continue</button></div>'
     +'</div></div>';
  }
  return '<div class="gift-toast" role="status"><span class="gift-kicker">New item</span>'
   +'<b>'+esc(it.name||"Unnamed item")+'</b>'+(detail?' <span>'+esc(detail)+'</span>':'')+note
   +'<div class="gift-actions">'+tail+'<button type="button" class="pm-btn sm" onclick="APP.giftSeen(\''+g.id+'\')">OK</button></div></div>';
}
function gmGiveItemFormHtml(){
  if(!VIEW_ONLY_IS_DM)return "";
  return '<details class="pm-fx-item gift-give" open><summary>Give an item <span class="pm-fx-badge">GM</span></summary>'
   +'<p class="pm-empty">The player sees a "New item" notice next time their sheet saves or loads. Tick Reveal for the full-screen reveal.</p>'
   +'<label>Item <input type="text" id="giftName" maxlength="120"></label> '
   +'<label>Qty <input type="number" id="giftQty" min="1" step="1" value="1" style="width:56px"></label> '
   +'<label>ENC ea <input type="number" id="giftEnc" min="0" step="0.5" value="0" style="width:56px"></label> '
   +'<label>sp ea <input type="number" id="giftCost" min="0" step="0.01" value="0" style="width:64px"></label><br>'
   +'<label>Note (optional) <input type="text" id="giftNote" maxlength="200" placeholder="e.g. Found in the bandit chief\'s chest"></label> '
   +'<label><input type="checkbox" id="giftReveal"> Reveal</label> '
   +'<button type="button" class="pm-btn sm" onclick="APP.gmGiveItem()">Give item</button>'
   +(GIFT_MSG?'<p role="status">'+esc(GIFT_MSG)+'</p>':'')+'</details>';
}
let GIFT_MSG="";
// ---- Play Mode frame (UX batch 1, owner-approved 2026-11-06) ----
// Header, a fixed vitals bar, and three columns: characteristics, a tabbed
// workspace, and the rolls panel. Every panel below reuses the existing
// builders unchanged; only the arrangement is new. The look is a swappable
// style (data-pm-style) so a player style picker can be added later.
// Desktop: three columns that each scroll inside the window (owner's sketch,
// 2026-11-06): stats and body | skills | tabbed panel. Phones show one of
// them at a time, picked from the bottom bar.
const PM_TABS=[["combat","Combat"],["magic","Spells"],["gear","Inventory"],["features","Features & traits"],["notes","Notes"]];
const PM_PHONE_TABS=[["stats","Stats"],["skills","Skills"],["combat","Combat"],["magic","Spells"],["gear","Items"],["features","Traits"],["notes","Notes"]];
let PM_VIEW="skills";   // phone only: stats | skills | right
let PM_POPUP=null;      // {k, i} for the description pop-up
function pmActiveTab(){
  const legacy={actions:"combat",effects:"combat",inventory:"gear",skills:"combat",body:"combat",stats:"combat"};
  let k=legacy[S.play.tab]||S.play.tab;
  if(!PM_TABS.some(t=>t[0]===k))k="combat";
  return k;
}
function pmSkillsPanelHTML(){
  let h='';
  const es=allEntries();
  const grp=g=>es.filter(e=>e.grp===g).sort((a,b)=>a.label.localeCompare(b.label));
  const skrow=e=>{
    const base=finalPct(e.key);const g=gradedPct(e.key,base);
    // literal .sk row from D: bare numeral (no "%"), a gray mono base-
    // formula caption (STR+DEX etc, "x2" normalised to "×2"), and a dotted
    // .lead line — no trained/untrained bullet dot, the mockup has none.
    const fluency=isSpokenLanguage(e.key);
    const pctTxt=fatigueNoActivity()?"—":fluency?String(base):g.pct===null?GRADE_LABEL[g.grade]:String(g.pct);
    const cbt=e.grp==="Combat Style";
    const baseFmt=(e.formula||"").replace(/x(\d)/i,"×$1").toUpperCase();
    const checked=S.xp.checked.includes(e.key);
    const fumbled=S.xp.fumbled.includes(e.key);
    // Checked-skill flag (Experience Roll eligibility) -- small icon toggle
    // rather than a native checkbox, bronze accent. Manual toggle for a
    // dramatic non-crit success the app can't detect on its own; auto-set
    // on a Critical (in-app roll, or the Improve Skills modal's own copy).
    const ckflag='<button class="pm-ckflag'+(checked?" on":"")+'" title="'+(checked?"Checked (note only). Click to clear.":"Mark checked (note only)")+'" onclick="APP.xpToggleChecked(\''+jsq(e.key)+'\')">&#10003;</button>';
    // Fumble flag -- direct toggle, not a "log a result" step: most tables
    // roll real dice instead of clicking "roll" below, so flip this the
    // instant a physical die actually comes up a Fumble. Same flag/icon
    // (.pm-xpflag) and same downstream effect (a free +1% next Improve
    // Skills, via xpApplyFumble) as the Improve Skills modal's own copy —
    // this is just a second, faster place to reach the identical S.xp.
    // fumbled toggle, not a separate mechanic. Used to be a "log…" dropdown
    // (Critical/Fumble options) that recorded a Press Log entry as a side
    // effect; dropped in favour of "flip a switch when I fumble" -- Critical
    // was always redundant with the ✓ flag above anyway, and the log entry
    // wasn't something a physical-dice table actually wanted.
    const fumbleflag='<button class="pm-xpflag'+(fumbled?" on":"")+'" title="'+(fumbled?"Fumbled — free +1% pending. Click to remove flag.":"Mark this skill as Fumbled (free +1% next Improve Skills)")+'" onclick="APP.xpToggleFumble(\''+jsq(e.key)+'\')">&#9873;</button>';
    const pinned=S.play.pinned.includes(e.key);
    const pin='<button class="pmx-pin'+(pinned?" on":"")+'" aria-pressed="'+pinned+'" title="'+(pinned?"Unpin":"Pin to the top")+'" onclick="APP.playTogglePin(\''+jsq(e.key)+'\')">'+(pinned?"&#9733;":"&#9734;")+'</button>';
    return '<div class="pm-skillrow'+(cbt?" cbt":"")+'" data-search="'+esc((e.label+" "+(e.formula||"")).toLowerCase())+'">'
     +pin+(fluency?"":ckflag+fumbleflag)
     +'<span class="nm">'+esc(e.label)+'</span>'
     +(baseFmt?'<span class="base">'+esc(baseFmt)+'</span>':'')
     +'<span class="lead"></span>'
     +(fluency?'<span class="pctval" title="Spoken fluency">'+pctTxt+'</span>':'<span class="pctval" onclick="APP.toggleGradePop(\''+jsq(e.key)+'\',\''+jsq(e.label)+'\',event)" title="Click for Difficulty Grades">'+pctTxt+'</span>'
     +'<button class="pm-btn roll" onclick="APP.roll(\''+jsq(e.key)+'\')">roll</button>')+'</div>';
  };
  h+='<div class="pm-box pm-skillsbox">'
   +'<div class="pm-sect-head" title="Difficulty Grade adjusts rolled skill percentages — the GM calls a harder or easier Grade for the situation, not a fixed penalty per attempt. Very Easy x2 · Easy x1.5 · Standard x1 · Hard x2/3 · Formidable x1/2 · Herculean x1/10 · Automatic/Hopeless skip the roll entirely."><span class="no">03</span> SKILLS'+pmTip("grade")+(ACTIVE_GRADE!=="standard"?' <span class="pm-gradenote">('+GRADE_LABEL[ACTIVE_GRADE]+')</span>':"")+'</div>'
   +'<div class="pm-ghost">03</div>';
  h+='<input type="search" class="pmx-skillsearch" aria-label="Search skills" placeholder="Search skills&hellip;" value="'+esc(PM_SKILL_SEARCH)+'" oninput="pmSkillFilter(this)">';
  const pinnedEntries=S.play.pinned.map(k=>es.find(e=>e.key===k)).filter(Boolean);
  if(pinnedEntries.length)h+='<div class="pm-skillgroup pmx-pinned"><h4>Pinned</h4>'+pinnedEntries.map(skrow).join("")+'</div>';
  else h+='<p class="pmx-dim pmx-small pmx-pinhint">Tip: tap &#9734; to pin the skills you use most to the top.</p>';
  h+='<div class="pm-skillgroup"><h4>Standard</h4>'+grp("Standard").map(skrow).join("")+'</div>';
  h+='<div class="pm-skillgroup"><h4>Professional</h4>'+(grp("Professional").length?grp("Professional").map(skrow).join(""):'<p class="pm-empty">None.</p>')+'</div>';
  if(grp("Magic").length)h+='<div class="pm-skillgroup"><h4>Magic</h4>'+grp("Magic").map(skrow).join("")+'</div>';
  if(grp("Combat Style").length)h+='<div class="pm-skillgroup"><h4>Combat Styles</h4>'+grp("Combat Style").map(skrow).join("")+'</div>';
  h+=pmPassionsHTML();
  h+='<p class="pmx-small"><button type="button" class="pmx-link" onclick="APP.pmPopup(\'rules\')">GM skill and task rulings</button> <span class="pmx-dim">Core pp.38, 50–52, 65–67</span></p>';
  h+='</div>';

  return h;
}
// Client-side filter, like pmFxFilter: re-rendering on each keystroke would
// rebuild the input and lose focus.
let PM_SKILL_SEARCH="";
function pmSkillFilter(input){
  const q=input.value.trim().toLowerCase();PM_SKILL_SEARCH=input.value;
  const box=input.closest(".pm-skillsbox")||document;
  box.querySelectorAll(".pm-skillgroup").forEach(g=>{
    let any=false;
    g.querySelectorAll(".pm-skillrow").forEach(row=>{const m=!q||(row.dataset.search||"").includes(q);row.style.display=m?"":"none";if(m)any=true;});
    g.style.display=any?"":"none";
  });
}
function pmSkillRulesHTML(){
  return ''
   +'<p><b>Retry.</b> If the GM allows one more attempt after failure, make it one grade harder. A second failure ends attempts for the foreseeable future.</p>'
   +'<p><b>Augment or cap.</b> For a GM-approved augmentation, use one assisting skill and add 20% of its value to the primary skill. Judge criticals and fumbles using the unaugmented primary skill. A cap limits the primary skill to the secondary skill when the secondary skill is lower.</p>'
   +'<form onsubmit="event.preventDefault();pmCalculateModifiedSkill(this)"><label>Method <select name="method"><option value="augment">Augment</option><option value="cap">Cap</option></select></label> <label>Primary % <input name="primary" type="number" min="0" step="1" required></label> <label>Secondary % <input name="secondary" type="number" min="0" step="1" required></label> <label>d100 (100 for 00) <input name="roll" type="number" min="1" max="100" step="1" required></label> <button type="submit" class="pm-btn sm">Check result</button><p role="status" data-modified-skill-result></p></form>'
   +'<p><b>Spoken fluency (Core pp.42, 47).</b> Use Native Tongue or Language to judge fluency or cap a verbal skill. When judging a related dialect, treat fluency at least one grade harder as appropriate to the divergence.</p>'
   +'<p><b>Group rolls.</b> For a team roll, use the highest skill if one success helps everyone, or the lowest if one failure costs everyone. For a sorting roll, compare one shared roll to each person’s skill. For proportional success, use the skill percentage as the share of the group that succeeds.</p>'
   +'<p><b>Task rounds.</b> The GM sets the duration of a round and any deadline. Track +50% for a critical, +25% for a success, 0% for a failure, or −25% for a fumble. An acceptable result takes 100%. Use the Core Item Quality and Enhancements tables for crafting outcomes.</p>'
   +'<p><b>Optional simplified modifiers.</b> The GM can use flat changes of +40, +20, 0, −20, −40 and −80 percentage points from Very Easy through Herculean. In a contest, the GM can round the shared reduction up to the next multiple of ten when the highest modified skill exceeds 100%. Apply either option manually if your table uses it.</p>'
   +'<p>Use the calculator for a single roll with GM-approved percentages. Augmentation rounds to the nearest whole percent, following the 33% example on p.50. For contests, resolve shared over-100 adjustments separately. The calculator does not change your character or roll log.</p>';
}
function pmActionList(){
    const reloadActions=(S.gearWeapons||[]).map(n=>weaponByName(n))
      .filter(w=>w&&w.group==="Ranged"&&Number.isInteger(w.load)&&w.load>0)
      .map(w=>({nm:"Reload: "+w.name,ap:w.load,note:"Proactive · Core p.109; "+w.name+" reload takes "+w.load+" AP total"}));
    // Core pp.91–93. Every Combat Action costs 1 AP unless it is a Free
    // Action. Delay costs nothing when declared: the AP is paid by the
    // reaction it is later used for, or lost if unused by the next turn.
    const ACTIONS=[
      {nm:"Attack",ap:1,kind:"Proactive",note:"Strike with a hand-to-hand weapon or use a ranged weapon · p.91"},
      {nm:"Brace",ap:1,kind:"Proactive",note:"SIZ counts 50% higher against Knockback and Leaping attacks, doubled against Bash, until you move · p.91"},
      {nm:"Cast Magic",ap:1,kind:"Proactive",note:"1 AP per casting turn; release any time before your next turn, then Hold Magic · p.91"},
      {nm:"Change Range",ap:1,kind:"Proactive",note:"Close in, open range or disengage · pp.91, 106–107"},
      {nm:"Dither",ap:1,kind:"Proactive",note:"Do nothing useful. Also what happens if you take no proactive action · p.91"},
      {nm:"Hold Magic",ap:1,kind:"Proactive",note:"Keep a completed spell ready; allows Counter Spell with it · p.91"},
      {nm:"Mount",ap:1,kind:"Proactive",note:"Mount or dismount; large mounts may take several turns · p.91"},
      {nm:"Move",ap:1,kind:"Proactive",note:"Only when not engaged; reaching a foe needs no extra AP to engage · pp.91–92"},
      {nm:"Outmanoeuvre",ap:1,kind:"Proactive",note:"Group opposed Evade; foes who fail can't attack you this round · pp.92, 104"},
      {nm:"Ready Weapon",ap:1,kind:"Proactive",note:"Draw, sheathe or withdraw; a dropped weapon nearby takes two turns. A second throwing weapon already held in the off-hand moves to the throwing hand as a Free Action · pp.92, 109"},
      ...reloadActions,
      {nm:"Regain Footing",ap:1,kind:"Proactive",note:"Stand up; if engaged, win an opposed Brawn or Athletics roll first · p.92"},
      {nm:"Struggle",ap:1,kind:"Proactive",note:"Break free of a Grapple, Pin Weapon and similar: opposed Brawn or Unarmed against whichever of those the grappler prefers; win and you escape · pp.92, 106"},
      {nm:"Counter Spell",ap:1,kind:"Reactive",note:"Needs one-turn countering magic, or magic already held · p.92"},
      {nm:"Evade",ap:1,kind:"Reactive",note:"Dive clear; leaves you prone unless something prevents it · pp.92, 103"},
      {nm:"Interrupt",ap:1,kind:"Reactive",note:"Delaying characters only: act after a foe declares · p.92"},
      {nm:"Parry",ap:1,kind:"Reactive",note:"Block, deflect or dodge an incoming attack · pp.92, 94"}
    ];
    const FREE_ACTIONS=[
      ["Delay","Save your action for a reaction; the AP is paid by that reaction or lost if unused by your next turn · p.91"],
      ["Assess Situation","If not engaged: a Perception roll · p.93"],
      ["Drop Weapon","p.93"],["Signal","If not engaged · p.93"],["Speak","Short phrases only · p.93"],
      ["Use Luck Point","p.93"],["Ward Location","Set before the attack roll; the ward lasts until that weapon attacks or parries · pp.93, 105"]
    ];
    return {ACTIONS,FREE_ACTIONS};
}
function pmActionsInfoHTML(){
  const {ACTIONS,FREE_ACTIONS}=pmActionList();
  return '<dl class="pmx-deflist">'+ACTIONS.map(a=>'<div><dt>'+esc(a.nm)+' <span class="pmx-dim">'+a.kind+', '+a.ap+' AP</span></dt><dd>'+esc(a.note)+'</dd></div>').join("")
   +FREE_ACTIONS.map(([n,t])=>'<div><dt>'+esc(n)+' <span class="pmx-dim">Free</span></dt><dd>'+esc(t)+'</dd></div>').join("")+'</dl>';
}
function pmActionsPanelHTML(){
  let h='<div class="pm-box pmx-actions"><h3>Actions <span class="pmx-dim">tap to spend AP</span></h3>';
    // AP costs verified against Core pp.91–93, 106, 109.
    const maxAPnow=playMaxAP(),usedAPnow=Math.min(S.play.apUsed,maxAPnow),remainAPnow=maxAPnow-usedAPnow;
    // Reload is weapon-specific; using the first equipped ranged weapon silently
    // charged the wrong AP whenever a character carried two different launchers.
    const {ACTIONS}=pmActionList();
    // Chips spend AP; what each action does is one tap away, not on screen.
    for(const kind of ["Proactive","Reactive"]){
      h+='<div class="pmx-actgroup"><span class="lbl">'+kind+(kind==="Proactive"?' <span class="pmx-dim">on your turn</span>':' <span class="pmx-dim">against each incoming threat</span>')+'</span><div class="pmx-chips">'
       +ACTIONS.filter(a=>a.kind===kind).map(a=>{
        const canAfford=a.ap<=remainAPnow&&!(S.play.surprised&&a.nm==="Attack")&&!VIEW_ONLY;
        return '<button class="pmx-chip" onclick="APP.playSpendAP('+a.ap+')" title="'+esc(a.note)+'"'+(canAfford?"":" disabled")+'>'+esc(a.nm)+' <span>'+a.ap+' AP</span></button>';
      }).join("")+'</div></div>';
    }
    h+='<p class="pmx-small"><button type="button" class="pmx-link" onclick="APP.pmPopup(\'actions\')">What each action does</button> · <button type="button" class="pmx-link" onclick="APP.pmPopup(\'rulesref\')">Combat situations</button> <span class="pmx-dim">impale, aiming, outmanoeuvre, knockback, mounted…</span></p>';
  h+='</div>';
  return h;
}
function pmGearPanelHTML(){
  const enc=gearEncTotal(),lim=encLimit(),over=lim!=null&&enc>lim;
  let h='<div class="pm-box pmx-gearsum">'
   +'<div class="pmx-gearstat"><span class="lbl">Encumbrance'+pmTip("enc")+'</span><b'+(over?' class="warn"':'')+'>'+enc+'</b><span class="pmx-dim"> / '+(lim??"—")+(over?' &middot; over your limit':' unencumbered')+'</span>'
   +(lim?'<span class="pmx-encbar" aria-hidden="true"><i style="width:'+Math.min(100,Math.round(enc/lim*100))+'%"'+(over?' class="over"':'')+'></i></span>':'')+'</div>'
   +(S.money.dice.length?'<div class="pmx-gearstat"><span class="lbl">Money</span><b>'+moneyRemaining()+'</b><span class="pmx-dim"> / '+moneyTotal()+' sp</span></div>':'')
   +'</div>';
  const worn=ARMOR_LOCATIONS.filter(l=>armorApAt(l)>0||armorDisplayName(l)!=="None");
  h+='<div class="pm-box"><h3>Armour</h3>'
   +(worn.length?'<div class="pmx-armour">'+ARMOR_LOCATIONS.map(l=>'<div><span>'+esc(l)+'</span><span class="pmx-dim">'+esc(armorDisplayName(l))+'</span><b>'+armorApAt(l)+' AP</b></div>').join("")+'</div>'
     :'<p class="pm-empty">No armour worn. Add it on the Money &amp; Gear step.</p>')+'</div>';
  h+='<div class="pm-box"><h3>Inventory</h3>';
    if(inventoryBlock()){
      // Plain party-member view of a teammate's sheet: static list, no controls.
      h+=S.inventory.length?'<div class="pm-invlist">'+S.inventory.map(it=>'<div class="pm-invrow"><span>'+esc(it.name)+' &times;'+it.qty+'</span><span class="pm-empty">ENC '+inventoryItemEnc(it)+'</span></div>').join("")+'</div>':'<p class="pm-empty">Nothing carried.</p>';
    }else{
      // Editable for the owner always, and for the DM viewing a player's
      // character (VIEW_ONLY_IS_DM) as a narrow loot/gear exception. Deliberately
      // avoids the .pm-sbtn/.pm-pip/.pm-fatsel/.pm-dmgrow input classes that the
      // .view-only CSS rule disables, since this stays live under VIEW_ONLY for a DM.
      h+=gmGiveItemFormHtml();
      h+='<div class="pmx-inv"><div class="pmx-invhead"><span>Item</span><span>Qty</span><span>ENC each</span><span>sp each</span><span title="Worn everyday clothing doesn\'t count toward ENC">Worn</span><span></span></div>'
       +S.inventory.map((it,i)=>'<div class="pmx-invrow">'
        +'<span class="nm"><input type="text" aria-label="Item name" value="'+esc(it.name)+'" onchange="APP.playInv('+i+',\'name\',this.value)">'+(giftValid(it.gift)?'<span class="pm-fx-badge" title="Given by the GM">'+(it.gift.seen===true?'gift':'new')+'</span>':'')+'</span>'
        +'<span><small class="pmx-invlbl">Qty</small><input type="number" aria-label="Quantity" value="'+it.qty+'" onchange="APP.playInv('+i+',\'qty\',this.value)"></span>'
        +'<span><small class="pmx-invlbl">ENC each</small><input type="number" aria-label="ENC each" min="0" step="0.5" value="'+it.enc+'" onchange="APP.playInv('+i+',\'enc\',this.value)"></span>'
        +'<span><small class="pmx-invlbl">sp each</small><input type="number" aria-label="Silver each" min="0" step="0.01" value="'+(it.cost||0)+'" onchange="APP.playInv('+i+',\'cost\',this.value)"></span>'
        +'<span><small class="pmx-invlbl">Worn</small><input type="checkbox" aria-label="Worn everyday clothing" '+(it.wornClothing===true?'checked':'')+' onchange="APP.playInv('+i+',\'wornClothing\',this.checked)"></span>'
        +'<span><button class="pmx-mini" aria-label="Remove '+esc(it.name)+'" onclick="APP.playInvDel('+i+')">&times;</button></span></div>').join("")
       +(S.inventory.length?'':'<p class="pm-empty">Nothing carried yet.</p>')
       +'</div><p style="margin-top:10px"><button class="pmx-mini" onclick="APP.playInvAdd()">+ Add item</button></p>';
    }
  h+='</div>';
  return h;
}
function pmPassionsHTML(){
  if(!S.passions.length)return "";
  return '<div class="pm-skillgroup pmx-passions"><h4>Passions</h4>'+S.passions.map((p,i)=>{const v=passionVal(p),num=typeof v==="number";
    return '<div class="pm-skillrow pmx-passion" data-search="'+esc(String(p.name||"passion").toLowerCase())+' passion"><span class="nm">'+esc(p.name||"(unnamed)")+'</span><span class="lead"></span><span class="pctval">'+v+'</span>'
     +(num?'<button class="pm-btn roll"'+(VIEW_ONLY?' disabled':'')+' onclick="APP.rollPassion('+i+')">roll</button>':'')+'</div>';}).join("")+'</div>';
}
function pmFeaturesPanelHTML(){
  return '<div class="pm-box"><h3>Combat Styles and traits</h3>'+combatStylesReadOnlyHTML()+'</div>';
}
function pmNotesPanelHTML(){
  return '<div class="pm-box"><h3>Notes</h3>'
   +(S.concept.notes?('<p class="pm-notes">'+esc(S.concept.notes).replace(/\n/g,"<br>")+'</p>'):'<p class="pm-empty">No background notes yet. Add them on the Concept step.</p>')+'</div>';
}
function pmTrackersHTML(){
  const v=charVitals(),maxAP=v.maxAP,remainAP=maxAP-Math.min(S.play.apUsed,maxAP);
  const ib=playInitiativeBonusNow(),ini=S.play.initiative;
  const row=(k,tip,val)=>'<div class="pmx-cell pmx-trk"><span class="k">'+k+pmTip(tip)+'</span><span class="val">'+val+'</span></div>';
  let h='<div class="pmx-trackers">';
  h+=row("Action Points","ap",'<span class="pm-pips">'+Array.from({length:maxAP},(_,i)=>'<button class="pm-pip'+(i<remainAP?"":" off")+'" aria-label="action point '+(i+1)+'" onclick="APP.playApSetPip('+i+')"></button>').join("")+'</span>'
    +'<button type="button" class="pmx-mini" onclick="APP.playNewRound()" title="New combat round: restore all AP">New round</button>');
  h+=row("Initiative","initiative",fatigueNoActivity()?'<span class="pmx-dim">—</span>':ini?'<b>'+ini.total+'</b> <span class="pmx-dim">d10 '+ini.roll+' + '+ini.bonus+'</span> <button type="button" class="pmx-mini" onclick="APP.playClearInitiative()" title="Ends the fight: clears initiative and Surprised, restores Action Points">End fight</button>'
    :'<span class="pmx-dim">+'+ib.total+'</span> <button type="button" class="pmx-mini" onclick="APP.playRollInitiative()">Roll</button>');
  h+=row("Magic Points","magic",'<b>'+v.curMagic+'</b><span class="pmx-dim">/'+v.maxMagic+'</span><span class="adj"><button class="pmx-mini" onclick="APP.playMagicAdj(-1)" aria-label="spend magic point">&minus;</button><button class="pmx-mini" onclick="APP.playMagicAdj(1)" aria-label="restore magic point">+</button></span>');
  h+=row("Luck","luck",'<span class="pm-pips">'+Array.from({length:v.maxLuck},(_,i)=>'<button class="pm-pip'+(i<v.curLuck?"":" off")+'" aria-label="luck point '+(i+1)+'" onclick="APP.playLuckSetPip('+i+')"></button>').join("")+'</span>');
  h+=row("Fatigue","fatigue",'<select class="pm-fatsel" aria-label="Fatigue level" onchange="APP.playSetFatigue(this.value)">'+FATIGUE_LEVELS.map(f=>'<option '+(v.fatigue===f?"selected":"")+'>'+f+'</option>').join("")+'</select>');
  h+='</div>';
  const r=fatigueRow();
  if(fatigueNoActivity())h+='<p class="pmx-small pmx-warntext pmx-noact" role="status">'+esc(fatigueNoActivity())+'</p>';
  else if(FATIGUE_TABLE.indexOf(r)>0)h+='<p class="pmx-small pmx-warntext">'+esc(v.fatigue)+': skill rolls '+GRADE_LABEL[r.grade]+(r.ap?', Action Points '+r.ap:'')+(r.init?', Initiative '+r.init:'')+'. <button type="button" class="pmx-link" onclick="APP.pmPopup(\'fatigue\')">Details</button></p>';
  return h;
}
// D&D Beyond-style top row: the seven characteristics, then the trackers used
// every round, across the full width above the columns.
function pmTopRowHTML(){
  const c=effectiveChars();
  return '<div class="pmx-top" role="group" aria-label="Characteristics and trackers"><div class="pmx-chars-row">'
   +["STR","CON","SIZ","DEX","INT","POW","CHA"].map(k=>'<div class="pmx-cell pmx-char" title="'+k+' ×5 = '+(c[k]*5)+'%"><span class="k">'+k+'</span><b>'+c[k]+'</b></div>').join("")
   +'</div>'+pmTrackersHTML()+'</div>';
}
function pmAttrsBoxHTML(){
  const c=effectiveChars(),mv=moveRate(),ib=playInitiativeBonusNow();
  return '<div class="pm-box pmx-attrbox"><h3>Attributes</h3><dl class="pmx-attrs">'
   +'<div><dt>Damage modifier</dt><dd>'+esc(dmCalc(c.STR,c.SIZ))+'</dd></div>'
   +'<div><dt>Initiative bonus</dt><dd>'+ib.total+'</dd></div>'
   +'<div><dt>Movement</dt><dd>'+mv.m+' m</dd></div>'
   +'<div><dt>Healing rate</dt><dd>'+healRate(c.CON)+'</dd></div>'
   +'<div><dt>Experience modifier</dt><dd>'+(xpMod(c.CHA)>=0?"+":"")+xpMod(c.CHA)+'</dd></div>'
   +'</dl></div>';
}
function pmStatsColumnHTML(){
  return pmAttrsBoxHTML()+pmBodyBoxHTML();
}
function pmBodyBoxHTML(){
  const v=charVitals();
  const worstTag={ok:"Unhurt",minor:"Minor Wound",serious:"Serious Wound",major:"Major Wound"}[v.worst];
  return '<div class="pm-box pmx-bodybox" id="pm-vitals"><h3>Body'+pmTip("health")+' <span class="pmx-health '+v.worst+'">'+worstTag+(v.worstLoc&&v.worst!=="ok"?' · '+esc(v.worstLoc.loc):'')+'</span></h3>'
   +'<div class="pm-vit-body">'+pmBodySvg()+'<div class="pm-loclist">'+PLAY_HP_LOCS.map(pmLocRow).join("")+'</div></div>'
   +pmWoundOverview()
   +'<p class="pmx-small"><button type="button" class="pmx-link" onclick="APP.pmPopup(\'hazards\')">Hazards and recovery</button> <span class="pmx-dim">Core pp.71, 74–80</span></p></div>';
}
function pmRollLogHTML(){
  return '<div class="pm-rolllog">'+(S.rollLog.length?S.rollLog.map((r,i)=>playRollLogRow(r,i)).join(""):'<span class="pm-empty">No rolls yet — click "roll" beside any skill.</span>')+'</div>'
   +'<details class="pmx-rollhelp"><summary>How results work</summary><p>Critical &le; 1/10 skill (round up) &middot; 01&ndash;05 auto success &middot; 96&ndash;00 auto failure &middot; Fumble 99&ndash;00 (00 only if skill&gt;100). A combat Fumble isn&#39;t just a miss &mdash; it can hand your opponent free Special Effects.</p></details>'
   +'<label class="pmx-dicepref"><input type="checkbox" '+(pmDiceAnimated()?'checked':'')+' onchange="pmToggleDice3d(this.checked)"> Animated dice</label>';
}
// One pop-up for descriptions and secondary detail, so reading a rule never
// pushes the sheet around. Re-rendered with the page, so it stays current.
// Core p.108 Distance Penalties as a small calculator. Updates in place on
// input (no re-render), so typing keeps focus.
function pmRangeHelperHTML(){
  return '<p class="pmx-small">Distance is separate from the weapon\'s Range. These steps stack on top of the most severe situational modifier (Core p.108).</p>'
   +'<div class="pmx-rangeform"><label>Distance (m)<input type="number" min="1" step="1" inputmode="numeric" id="pmRangeDist" oninput="pmRangeUpdate()"></label>'
   +'<label>Target SIZ<input type="number" min="1" max="300" step="1" inputmode="numeric" id="pmRangeSiz" oninput="pmRangeUpdate()" placeholder="human ≈ 11–20"></label></div>'
   +'<label class="pmx-small">Situational grade <select id="pmRangeSit" onchange="pmRangeUpdate()">'+["standard","hard","formidable","herculean"].map(g=>'<option value="'+g+'">'+GRADE_LABEL[g]+'</option>').join("")+'</select></label>'
   +'<p class="pmx-rangeout" id="pmRangeOut" role="status">Enter a distance and the target\'s SIZ.</p>'
   +'<details class="pmx-actinfo"><summary>Firing into a crowd</summary><p>At the edge of a crowd or melee the attack is at least Hard; into or across it, usually Formidable. If you miss <b>only because of that crowd penalty</b> (you would have hit without it), a bystander in the line of fire is struck instead; the GM picks one at random if several. The bystander may Evade or Parry if aware, and none of your Special Effects apply to them (Core p.108).</p></details>'
   +'<details class="pmx-actinfo"><summary>Firing on the move</summary><p>Ranged attacks normally can\'t be made moving faster than a walk. A Combat Style with Skirmishing can fire while running (not sprinting), capped at your Athletics skill. Mounted or in a vehicle, the attack is capped by the controller\'s Ride or Drive skill (Core p.108).</p></details>';
}
function pmRangeUpdate(){
  const out=document.getElementById("pmRangeOut");if(!out)return;
  const res=rangeSizeSteps(document.getElementById("pmRangeDist")?.value,document.getElementById("pmRangeSiz")?.value);
  if(!res){out.textContent="Enter a distance of 1m or more and a target SIZ from 1 to 300. Bigger targets are the GM's call.";return;}
  const n=res.steps,sit=document.getElementById("pmRangeSit")?.value||"standard";
  const fin=n>0?shiftGradeHarder(sit,n):n<0?shiftGradeEasier(sit,-n):sit;
  out.innerHTML=(n===0?"No effect":(Math.abs(n)+" step"+(Math.abs(n)>1?"s ":" ")+(n>0?"harder":"easier")))
    +" &rarr; <b>"+esc(GRADE_LABEL[fin])+"</b> with a "+esc(GRADE_LABEL[sit])+" situation."
    +(res.extrapolated?" Beyond 140m: continued from the table's progression; confirm with your GM.":"");
}
// Core p.98 Impale Effects: grade imposed on the victim's skill rolls while
// the weapon stays embedded, by victim SIZ (rows) and weapon Size (columns).
const IMPALE_EFFECTS=[["1–10",["Formidable","Herculean","Incapacitated","Incapacitated","Incapacitated"]],["11–20",["Hard","Formidable","Herculean","Incapacitated","Incapacitated"]],["21–30",["No effect","Hard","Formidable","Herculean","Incapacitated"]],["31–40",["No effect","No effect","Hard","Formidable","Herculean"]],["41–50",["No effect","No effect","No effect","Hard","Formidable"]]];
function pmCombatRulesRefHTML(){
  const sec=(t,b)=>'<details class="pmx-actinfo"><summary>'+t+'</summary>'+b+'</details>';
  return '<p class="pmx-small">Short reminders for situations the GM resolves at the table. Page numbers are Mythras Core.</p>'
   +sec("Impale: effects and pulling free",'<p>While the weapon stays in, the victim\'s skill rolls get harder by weapon Size vs their SIZ (p.98). Above SIZ 50, follow the table\'s progression.</p><table class="pmx-minitable"><tr><th>Victim SIZ</th><th title="Small">S</th><th title="Medium">M</th><th title="Large">L</th><th title="Huge">H</th><th title="Enormous">E</th></tr>'
     +IMPALE_EFFECTS.map(([z,row])=>'<tr><td><b>'+z+'</b></td>'+row.map(c=>'<td title="'+c+'">'+({"No effect":"—","Hard":"Hard","Formidable":"Form.","Herculean":"Herc.","Incapacitated":"Incap."}[c])+'</td>').join("")+'</tr>').join("")+'</table>'
     +'<p class="pmx-small">Weapon Size: S Small, M Medium, L Large, H Huge, E Enormous. Form. Formidable, Herc. Herculean, Incap. Incapacitated, — no effect.</p>'
     +'<p><b>Pulling free:</b> a Ready Weapon action; Brawn (opposed if the victim resists). Success does half weapon damage, no Damage Modifier, ignoring armour; Barbed weapons do full damage. While impaled, the attacker can\'t parry with that weapon (pp.97–98).</p>')
   +sec("Aiming",'<p>A whole Combat Round of aiming reduces one situational penalty by one grade. More rounds give no extra benefit (p.107).</p>')
   +sec("Outmanoeuvre (several foes)",'<p>One group test: your Evade against each foe trying to surround you; each participant spends an AP. Each foe who fails to beat you can\'t attack you again this round. Beat them all and you may withdraw or choose one to stay engaged with. Being outnumbered gives no skill penalty in itself (p.104).</p>')
   +sec("Sweep attacks",'<p>Only weapons or creatures of unusual size (a dragon\'s tail, a giant\'s club) can sweep a closely clumped group. One attack roll applies to everyone in its path; each defender defends and takes effects separately, and all effects happen at once. The GM decides how many are caught (p.105).</p>')
   +sec("Knockback",'<p>If damage before armour and parrying exceeds your SIZ, you are knocked back 1m per 5 points (or part) over, and must make an Easy Acrobatics or Standard Athletics roll to stay standing (p.104).</p>')
   +sec("Pulling a blow",'<p>Declare before attacking. A hit does half damage (p.105).</p>')
   +sec("Grappling",'<p>Declare a grapple instead of a strike: you need an empty limb that can grip, within Touch. Opposed: your Unarmed against the defender\'s combat skill; win to take hold, and either side may earn Special Effects. A held <b>arm or leg</b> is unusable; a held <b>head or torso</b> makes the victim\'s skill rolls Hard. On later turns you may crush, twist or strangle for damage equal to your <b>Damage Modifier</b> (not a normal 1d3 strike); the victim may oppose with Unarmed or Brawn to reduce or block it. To escape, the victim uses <b>Struggle</b> (1 AP): opposed Brawn or Unarmed against whichever the grappler prefers (p.106).</p>')
   +sec("Climbing and swimming",'<p><b>Climbing:</b> combat skills capped by Athletics; a biped fights with one limb (p.106).<br><b>Swimming:</b> capped by Swim. Underwater only thrusting weapons work, at half damage; bites, strangling and ramming are unaffected. Water Combat lifts the Swim cap (pp.89, 106).</p>')
   +sec("Mounted and aerial combat",'<p><b>Mounted:</b> combat skill capped by Ride unless the style has Mounted Combat. Against a foe on foot below you, the GM may use 1d10+10 for the hit location. Spend 1 AP to defend your mount with your Combat Style or Ride. A faster mount can withdraw freely if it isn\'t attacking (p.104).<br><b>Aerial:</b> close in with opposed Fly (or the mount\'s Ride); winners may attack that pass. Fast passes work like charging through contact (pp.103–104).</p>');
}
function pmAdvanceTimeHTML(){
  const opt=(k,label,desc)=>'<div class="pmx-advopt"><button type="button" class="pm-btn pmx-pri" onclick="APP.advanceTime(\''+k+'\')">'+label+'</button><p>'+desc+'</p></div>';
  const minor=PLAY_HP_LOCS.filter(l=>naturalRecoveryInfo(l)?.interval==="day").length;
  return opt("day","Rest one day","Each Minor Wound heals your Healing Rate ("+(charsReady()?healRate(effectiveChars().CON):0)+" HP). "+(minor?minor+" location"+(minor>1?"s":"")+" will heal.":"No Minor Wounds right now.")+" Serious and Major Wounds heal per week or month (Core p.80).")
   +opt("fatigue","Recover one Fatigue level","Now: "+esc(S.play.fatigue||"Fresh")+". How long that takes depends on the cause; your GM decides.")
   +opt("fight","End the fight","Clears initiative and Surprised, and restores all Action Points.")
   +opt("session","Start a new session","Refills Luck Points ("+playCurLuck()+" of "+playMaxLuck()+" now). Magic Points stay manual.");
}
function pmPopupHTML(){
  if(!PM_POPUP)return '<aside class="pmx-side pmx-side-empty" aria-label="Details"><p class="pmx-dim">Details appear here. Choose a Special Effect, a body location, or the roll log.</p></aside>';
  const k=PM_POPUP.k;let title="",body="";
  if(k==="loc"){const loc=S.play.selectedLoc;if(!loc){PM_POPUP=null;return "";}title=loc;body=pmLocDetail();}
  else if(k==="fx"){const e=SPECIAL_EFFECTS[PM_POPUP.i];if(!e){PM_POPUP=null;return "";}
    title=e[0];const r=selectedEffectRoll(),picked=r?.effectsPicked||[];
    const can=r&&canPickEffectForRoll(e,r)&&picked.length<rollEffectsWon(r)&&(!picked.includes(e[0])||e[5])&&!VIEW_ONLY;
    body='<p class="pmx-fxbadges">'+[e[1]?'<span class="pm-fx-badge off">Offensive</span>':"",e[2]?'<span class="pm-fx-badge def">Defensive</span>':"",e[3]?'<span class="pm-fx-badge">'+esc(e[3])+'</span>':"",e[4]?(r&&pinWeaponWithoutCritical(e,r)?'<span class="pm-fx-badge roll">No Critical needed (weapon exception)</span>':'<span class="pm-fx-badge roll">'+esc(e[4])+'</span>'):"",e[5]?'<span class="pm-fx-badge stack">Stacks</span>':""].join(" ")+'</p><p>'+esc(e[6])+'</p>'
     +(can?'<p><button type="button" class="pm-btn pmx-pri" onclick="APP.playChooseEffect('+PM_POPUP.i+');APP.pmPopupClose()">Choose '+esc(e[0])+'</button></p>':'');}
  else if(k==="log"){title="Roll log";body=pmRollLogHTML();}
  else if(k==="actions"){title="Combat actions";body=pmActionsInfoHTML();}
  else if(k==="hazards"){title="Hazards and recovery";body=pmHazardsHTML();}
  else if(k==="fatigue"){title="Fatigue";body=pmFatiguePanel();}
  else if(k==="rules"){title="GM skill and task rulings";body=pmSkillRulesHTML();}
  else if(k==="casting"){title="How casting works here";body=pmCastingNotesHTML();}
  else if(k==="advance"){title="Advance time";body=pmAdvanceTimeHTML();}
  else if(k==="rulesref"){title="Combat situations";body=pmCombatRulesRefHTML();}
  else if(k==="range"){title="Distance and target size";body=pmRangeHelperHTML();}
  else {PM_POPUP=null;return "";}
  // A side panel, like D&D Beyond's: it takes its own column on desktop, so
  // nothing on the sheet is covered; a sheet from the bottom on phones.
  return '<aside class="pmx-side" role="dialog" aria-label="'+esc(title)+'">'
   +'<div class="pmx-pophead"><h2>'+esc(title)+'</h2><button type="button" class="pmx-popx" aria-label="Close" onclick="APP.pmPopupClose()">&times;</button></div>'
   +'<div class="pmx-popbody" data-scroll="side-'+esc(k)+'">'+body+'</div></aside>';
}
// Keep each column's scroll position across re-renders (every click redraws).
function pmSaveScroll(){const m={};document.querySelectorAll("[data-scroll]").forEach(el=>{m[el.dataset.scroll]=el.scrollTop;});return m;}
function pmRestoreScroll(m){document.querySelectorAll("[data-scroll]").forEach(el=>{if(m[el.dataset.scroll]!=null)el.scrollTop=m[el.dataset.scroll];});}
function pmFitDash(){
  const d=document.querySelector(".pmx-dash");if(!d||!d.getBoundingClientRect)return;
  const top=Math.max(0,Math.round(d.getBoundingClientRect().top+(window.scrollY||0)));
  d.style.setProperty("--pm-top",top+"px");
  // Anything below or around the dashboard (margins, site chrome) must not
  // make the page scroll: take any remaining overflow off the height.
  const doc=document.documentElement,extra=doc&&doc.scrollHeight-window.innerHeight;
  if(extra>0&&extra<200)d.style.setProperty("--pm-top",(top+extra)+"px");
}
let PM_RESIZE_BOUND=false;
function renderPlayView(){
  document.body.classList.remove("menu-mode","sheet-mode");
  document.body.classList.add("play-mode","pm-style-clean","pm-fit");
  document.body.classList.toggle("view-only",VIEW_ONLY);
  document.title=(S.concept.name?S.concept.name+" — ":"")+"Play Mode";
  if(!VIEW_ONLY){rememberGifts(S);if(cloudActive())startGiftPoll();}
  if(!charsReady()){
    $("#main").innerHTML='<div class="pm-wrap pmx"><p><button class="pm-btn" onclick="APP.backFromPlay()">&#8592; Edit Character</button></p>'
     +'<p class="pm-empty" style="margin-top:14px">Finish Characteristics first &mdash; Play Mode needs those numbers to work from.</p></div>';
    return;
  }
  const name=S.concept.name||"Unnamed Character";
  const careerName=S.customCareer.isCustom?S.customCareer.name:S.career;
  const tab=pmActiveTab();
  const backLabel=(VIEW_ONLY||PLAY_RETURN_VIEW==="board")?"&#8592; Party Board":"&#8592; Edit character";
  const species=S.archetype!=="ordinary"?ARCHETYPES[S.archetype].label:null;
  const sub=[species,S.culture,careerName,pmCampaignLabel()].filter(Boolean).map(esc).join(" · ");
  const initials=name.split(/\s+/).filter(w=>/^[A-Za-z]/.test(w)).slice(0,2).map(w=>w[0].toUpperCase()).join("")||"?";
  const scroll=pmSaveScroll();
  let h='<div class="pm-wrap pmx pmx-dash" data-pm-style="clean" data-view="'+(PM_VIEW==="right"?"right":PM_VIEW)+'"'+'>';
  h+='<header class="pmx-head">'
   +'<div class="pmx-avatar">'+(S.concept.portrait?'<img src="'+S.concept.portrait+'" alt="">':'<span>'+esc(initials)+'</span>')+'</div>'
   +'<div class="pmx-id"><button class="pmx-back" onclick="APP.backFromPlay()">'+backLabel+'</button>'
   +'<h1 class="pmx-name">'+esc(name)+'</h1>'+(sub?'<p class="pmx-sub">'+sub+'</p>':'')+'</div>'
   +'<div class="pmx-headbtns">'
   +'<button class="pm-btn" onclick="APP.pmPopup(\'log\')">Roll log'+(S.rollLog.length?' <span class="pmx-dim">'+S.rollLog.length+'</span>':'')+'</button>'
   +(VIEW_ONLY?"":'<button class="pm-btn" onclick="APP.pmPopup(\'advance\')">Advance time</button>')
   +(VIEW_ONLY?"":'<button class="pm-btn pmx-pri" onclick="APP.openXP()">Improve skills'+(S.xp.pool?' <span class="pm-xpbadge">'+S.xp.pool+'</span>':'')+'</button>')
   +'</div></header>';
  if(VIEW_ONLY){
    h+='<div class="pm-viewonly-banner">Viewing '+esc(VIEW_ONLY_OWNER_NAME||"a teammate")+'&rsquo;s character &mdash; read-only'
     +(VIEW_ONLY_IS_DM?', except Inventory (as DM you can edit loot/gear here).':'. Only they can change it.')+'</div>';
  }
  if(PM_MSG)h+='<p class="warn pmx-msg" role="status">'+esc(PM_MSG)+'</p>';
  h+=pmTopRowHTML();
  h+='<div class="pmx-cols">';
  h+='<section class="pmx-col pmx-col-stats" data-scroll="stats" aria-label="Characteristics and body">'+pmStatsColumnHTML()+'</section>';
  h+='<section class="pmx-col pmx-col-skills" data-scroll="skills" aria-label="Skills">'+pmSkillsPanelHTML()+'</section>';
  h+='<section class="pmx-col pmx-col-right" aria-label="'+esc(PM_TABS.find(t=>t[0]===tab)[1])+'"><nav class="pmx-tabs" aria-label="Sections">'
   +PM_TABS.map(([k,l])=>'<button type="button" class="pmx-tab'+(tab===k?" on":"")+'"'+(tab===k?' aria-current="page"':'')+' onclick="APP.playTab(\''+k+'\')">'+l+'</button>').join("")
   +'</nav><div class="pmx-scroll" data-scroll="right-'+tab+'">';
  if(tab==="combat")h+=pmCombatTabHTML();
  else if(tab==="gear")h+=pmGearPanelHTML();
  else if(tab==="magic")h+='<div class="pm-box">'+magicPanel()+'</div>';
  else if(tab==="features")h+=pmFeaturesPanelHTML();
  else h+=pmNotesPanelHTML();
  h+='</div></section>'+pmPopupHTML()+'</div>';
  const phoneOn=k=>PM_VIEW==="right"?k===tab:k===PM_VIEW;
  h+='<nav class="pmx-phonebar" aria-label="Play Mode sections">'+PM_PHONE_TABS.map(([k,l])=>'<button type="button" class="pmx-tab'+(phoneOn(k)?" on":"")+'" onclick="APP.playTab(\''+k+'\')">'+l+'</button>').join("")+'</nav>';
  h+='</div>';
  if(XP_OPEN&&!VIEW_ONLY)h+=xpModalHtml();
  h+=giftPopupHtml();
  $("#main").innerHTML=h;
  pmRestoreScroll(scroll);
  pmFitDash();
  if(!PM_RESIZE_BOUND&&typeof window.addEventListener==="function"){PM_RESIZE_BOUND=true;
    window.addEventListener("resize",pmFitDash);
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&PM_POPUP&&APPVIEW==="play")APP.pmPopupClose();});}
  if(tab==="combat"&&PM_FX_SEARCH){const search=document.querySelector(".pm-fx-search");if(search)pmFxFilter(search);}
  if(PM_SKILL_SEARCH){const search=document.querySelector(".pmx-skillsearch");if(search)pmSkillFilter(search);}
  pmDiceSync();
}
// ---- Short tips (Play Mode redesign batch 5) ----
// A "?" beside a term opens one or two plain sentences. Pure CSS: it opens on
// hover or keyboard/tap focus, so it works on phones without extra script.
const PM_TIPS={
  health:"Each hit location has its own Hit Points. Below its maximum is a Minor Wound, 0 or less is a Serious Wound, and minus its maximum or worse is a Major Wound.",
  ap:"Action Points are how many things you can do in a combat round: attacks, parries, evades and other actions usually cost 1 each. They all come back at the start of a new round.",
  initiative:"Roll 1d10 plus your Initiative Bonus once at the start of a fight. Highest acts first, and the order stays for the whole fight (Core p.90).",
  magic:"Magic Points pay for spells. They come back as your GM decides.",
  luck:"One Luck Point per action: reroll any roll that affects you (or make a foe reroll against you), gain one extra Action Point when you have none left, or downgrade a Major Wound to Serious. They refill at the start of each session.",
  fatigue:"Each level of Fatigue makes skill rolls harder and can cut Movement, Initiative and Action Points. How you recover depends on the cause: see the Body tab.",
  grade:"Your GM may call a roll easier or harder. The Grade multiplies your skill for that roll: Easy ×1.5, Hard ×2/3, Formidable ×1/2 (Core p.38).",
  effects:"When you beat your opponent's roll, you win Special Effects: extra results such as disarming, tripping or bleeding them. The better you beat them, the more you get (Core p.100).",
  surprised:"Caught off guard: −10 initiative, no defending until your turn comes up, and no attacking this round (Core p.105).",
  enc:"ENC is how heavy your gear is. Carrying more than your limit makes physical skills harder."
};
function pmTip(id){
  const t=PM_TIPS[id];if(!t)return "";
  return '<span class="pmx-tip" tabindex="0" role="button" aria-label="What is this?" onclick="event.stopPropagation()">?<span class="pmx-tip-body" role="tooltip">'+esc(t)+'</span></span>';
}
// ---- Combat tab (Play Mode redesign batch 3) ----
// One place for a fight: the turn strip, the latest combat roll with the
// opponent's result and the Special Effects it allows, each weapon with
// Attack and Parry, then the action list. The full Special Effects
// reference stays available, folded away.
function pmPctText(key){const g=gradedPct(key,finalPct(key));return g.pct===null?GRADE_LABEL[g.grade]:g.pct+"%";}
function pmTurnStripHTML(){
  const ib=playInitiativeBonusNow(),rec=S.play.initiative;
  const max=playMaxAP(),remain=max-Math.min(S.play.apUsed,max);
  let h='<div class="pm-box pmx-turn">'
   +'<div class="pmx-turn-item"><span class="lbl">Initiative</span>'
   +(rec?'<b>'+rec.total+'</b> <span class="pmx-dim">d10 '+rec.roll+' + '+rec.bonus+'</span> <button class="pmx-mini" onclick="APP.playClearInitiative()" title="Initiative lasts the whole fight (Core p.90). Ending the fight clears it and Surprised, and restores Action Points">End fight</button>'
     :'<button class="pmx-mini" onclick="APP.playRollInitiative()" title="Roll 1d10 + Initiative Bonus '+ib.total+' (Core p.90)">Roll d10 + '+ib.total+'</button>'
      +' <label class="pmx-dim">or your d10 <input id="playInitD10" type="number" min="1" max="10" inputmode="numeric"></label> <button class="pmx-mini" onclick="APP.playSetInitiative()">Set</button>')
   +'</div>'
   +'<label class="pmx-turn-item pmx-surprised"><input type="checkbox" '+(S.play.surprised?'checked':'')+' onchange="APP.playSetSurprised(this.checked)"> Surprised</label>'+pmTip("surprised")
   +'</div>';
  if(S.play.surprised)h+='<p class="warn pmx-warn" role="status">Surprised (Core p.105): initiative −10; you can\'t defend until your initiative comes up; the first successful attack against you gains one extra Special Effect; no offensive actions for the rest of this round. New round clears it.</p>';
  return h;
}
// The roll the combat card works on: the one chosen from the log, else the
// newest combat roll.
function pmResolveIndex(){
  const i=S.rollLog.indexOf(PM_EFFECT_ROLL_REF);
  if(i>=0&&S.rollLog[i].combat)return i;
  return S.rollLog.findIndex(r=>r.combat);
}
function pmResolveCardHTML(){
  const i=pmResolveIndex();
  if(i<0)return '<div class="pm-box pmx-resolve" id="pm-resolve"><h3>Combat roll</h3><p class="pm-empty">Press <b>Attack</b> or <b>Parry</b> on a weapon below. The result appears here, with the Special Effects it lets you choose.</p></div>';
  const r=S.rollLog[i];
  if(!PM_EFFECT_ROLL_REF||!S.rollLog.includes(PM_EFFECT_ROLL_REF))PM_EFFECT_ROLL_REF=r;
  const ro=VIEW_ONLY?' disabled':'';
  // Finished roll: one summary line with the next actions on it, so the next
  // Attack or a quick Parry is one tap away (owner, 2026-11-06).
  const n0=r.combatRole&&r.oppTier?rollEffectsWon(r):0;
  if(r.combatRole&&r.oppTier&&(n0<=0||(r.effectsPicked||[]).length>=n0)&&PM_FX_EDIT!==r){
    const picked=r.effectsPicked||[];
    const what=r.combatRole==="attack"?"Attack":r.combatKind==="evade"?"Evade":"Parry";
    const w=r.weapon&&r.weapon!=="Unarmed"?weaponByName(r.weapon):null;
    const canRepeat=r.combatKind!=="evade"&&r.weapon&&(r.styleKey||r.fam);
    const again=(role,label)=>'<button type="button" class="pmx-act'+(role==="attack"?' atk':'')+'"'+ro+' onclick="APP.rollWithWeapon(\''+jsq(r.weapon)+'\',\''+jsq(r.styleKey||'')+'\',\''+jsq(r.fam||'')+'\',\''+role+'\')">'+label+'</button>';
    return '<div class="pm-box pmx-resolve pmx-resolve-done" id="pm-resolve">'
     +'<div class="pmx-doneline"><b class="pmx-resolve-d">'+(r.roll===100?"00":esc(String(r.roll)))+'</b><span class="pmx-tier '+pmDiceTier(r.tier)+'">'+esc(r.tier)+'</span>'
     +'<span class="pmx-donetext">'+what+' '+esc(r.weapon||r.label)+' vs '+(r.opponentAction==="no-parry"?'no defence':esc(r.oppTier))+' &rarr; '
     +(n0>0?'<b class="good">'+esc(picked.join(", "))+'</b>':n0<0?'opponent wins <b class="bad">'+(-n0)+' Special Effect'+(-n0>1?"s":"")+'</b>':'no effects')+'</span></div>'
     +'<div class="pmx-doneacts">'
     +(canRepeat?again("attack","Attack again")+(w&&!weaponCanParry(w)?'':again("defence","Parry")):'')
     +(r.combatKind==="evade"?'<button type="button" class="pmx-act"'+ro+' onclick="APP.roll(\'std:Evade\')">Evade again</button>':'')
     +'<button type="button" class="pmx-mini" onclick="PM_FX_EDIT=S.rollLog['+i+'];render()">Change</button>'
     +'<button type="button" class="pmx-mini" onclick="APP.playJumpToInjury()">Record damage</button></div></div>';
  }
  let h='<div class="pm-box pmx-resolve" id="pm-resolve"><h3>Combat roll'+(i>0?' <span class="pmx-dim">(earlier roll)</span>':'')+'</h3>'
   +'<div class="pmx-resolve-top"><b class="pmx-resolve-d">'+(r.roll===100?"00":esc(String(r.roll)))+'</b>'
   +'<span class="pmx-tier '+pmDiceTier(r.tier)+'">'+esc(r.tier)+'</span>'
   +'<span class="pmx-resolve-lbl">'+(r.combatRole==="attack"?"Attack":r.combatRole==="defence"?(r.combatKind==="evade"?"Evade":"Parry"):"")+' '+esc(r.label)+' <span class="pmx-dim">'+r.pct+'%</span></span></div>';
  if(!r.combatRole){
    h+='<div class="pmx-step"><span>Was this an attack or a defence?</span> '
     +(r.combatKind==="evade"?'':'<button class="pmx-mini"'+ro+' onclick="APP.playSetCombatRole('+i+',\'attack\')">Attack</button> ')
     +'<button class="pmx-mini"'+ro+' onclick="APP.playSetCombatRole('+i+',\'defence\')">Defence</button></div>';
  }
  if(r.combatKind!=="evade"&&!r.weapon){
    const opts=["Unarmed",...(S.gearWeapons||[])];
    h+='<div class="pmx-step"><label>Weapon <select'+ro+' onchange="APP.playSetRollWeapon('+i+',this.value)"><option value="">Not recorded (all effects shown)</option>'
     +opts.map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join("")+'</select></label></div>';
  }
  if(r.combatRole){
    const noParry=r.opponentAction==="no-parry";
    h+='<div class="pmx-step"><span>'+(r.combatRole==="attack"?"Their defence:":"Their attack:")+'</span> '
     +["Critical","Success","Failure","Fumble"].map(t=>'<button class="pmx-mini'+(r.oppTier===t&&!noParry?' on':'')+'"'+ro+' onclick="APP.playSetOpponentTier('+i+',\''+t+'\')">'+t+'</button>').join(" ")
     +(r.combatRole==="attack"?' <button class="pmx-mini'+(noParry?' on':'')+'"'+ro+' onclick="APP.playNoParry('+i+')" title="They didn\'t parry or evade: treat as a Failure (Core p.100)">No defence</button>':'')+'</div>';
  }
  if(r.weapon==="Javelin"&&r.combatRole==="attack"&&r.tier!=="Critical")h+='<div class="pmx-step"><label><input type="checkbox"'+ro+(r.vsShield?' checked':'')+' onchange="APP.playSetVsShield('+i+',this.checked)"> The target defended with a shield</label> <span class="pmx-dim">Pin Weapon without a Critical (Core p.62)</span></div>';
  if(r.combatRole==="attack"&&(r.tier==="Critical"||r.tier==="Success"))h+='<div class="pmx-step"><label><input type="checkbox"'+ro+(r.targetSurprised?' checked':'')+' onchange="APP.playSetTargetSurprised('+i+',this.checked)"> Target was Surprised, and this is the first successful attack on them</label> <span class="pmx-dim">+1 Special Effect (Core p.105)</span></div>';
  if(r.combatRole&&r.oppTier){
    const n=rollEffectsWon(r);
    if(n>0){
      const picked=r.effectsPicked||[];
      const eligible=SPECIAL_EFFECTS.filter(e=>canPickEffectForRoll(e,r));
      h+='<p class="pmx-outcome good">You win <b>'+n+' Special Effect'+(n>1?"s":"")+'</b>'+(rollSurpriseBonus(r)?' <span class="pmx-dim">(including 1 for surprise)</span>':'')+pmTip("effects")+': '+picked.length+' of '+n+' chosen.</p>';
      if(picked.length)h+='<div class="pm-fx-picks">'+picked.map((name,k)=>'<button type="button" class="pmx-mini on"'+ro+' title="Remove '+esc(name)+'" onclick="APP.playRemoveEffectChoice('+k+')">'+esc(name)+' &times;</button>').join(" ")+'</div>';
      if(picked.length>=n&&PM_FX_EDIT!==r)h+='<p class="pmx-small">All chosen. <button type="button" class="pmx-link" onclick="PM_FX_EDIT=S.rollLog['+i+'];render()">Change</button></p>';
      else h+='<div class="pmx-fx-eligible">'+eligible.map(fxItemHTML).join("")+'</div>'
       +'<p class="pmx-dim pmx-small">Showing the '+eligible.length+' effects this roll allows'+(r.weapon?' with '+esc(r.weapon):'')+'. Check situational requirements with your GM.</p>';
    }else if(n<0){
      h+='<p class="pmx-outcome bad">Your opponent wins <b>'+(-n)+' Special Effect'+(-n>1?"s":"")+'</b> against you. They choose.</p>';
    }else h+='<p class="pmx-outcome">No Special Effects either way.</p>';
    h+='<div class="pmx-step"><button class="pmx-mini" onclick="APP.playJumpToInjury()">Record damage on Body</button></div>';
  }
  return h+'</div>';
}
// Short, rule-bearing notes for a weapon's traits (Core pp.61–65).
function pmWeaponNotes(w){
  const t=weaponTraits(w),out=[];
  const pb=t.find(x=>/^Passive Blocks \d+ locations$/.test(x));
  if(pb)out.push("Passively blocks "+pb.match(/\d+/)[0]+" adjacent locations (double when crouching); Choose Location can't target them");
  if(t.includes("Ranged Parry"))out.push("Can parry missiles");
  if(t.includes("Offensive"))out.push("Can't parry");
  if(t.includes("Entrapping"))out.push("Pin Weapon without a Critical"+(weaponCanParry(w)?"; parries as Defensive":""));
  if(t.includes("Defensive"))out.push("Parrying: attacker counts one Size smaller");
  if(t.includes("Flexible"))out.push("A shield parrying it counts one Size smaller");
  if(t.includes("Mount"))out.push("Only from the back of a moving mount");
  if(t.includes("Stealth"))out.push("Only from ambush");
  if(t.includes("Set"))out.push("Can be set against a charge");
  if(t.includes("Barbed"))out.push("Full damage when pulled free");
  if(t.includes("Thrown"))out.push("Can also be thrown; a second one held in the off-hand readies as a Free Action");
  if(w.name==="Javelin")out.push("Thrown: Pin Weapon against a shield without a Critical; a second one held in the off-hand readies as a Free Action");
  if(w.name==="Atlatl")out.push("Launcher: +1 Force step and +0/+25/+75m range to the dart or javelin it throws");
  return out.length?esc(out.join(" · "))+' <span class="pmx-dim">(Core pp.61–65)</span>':"";
}
function pmWeaponCardsHTML(){
  const styles=stylesList();
  const btns=(weapon,key,fam,canParry)=>{
    const a='<button class="pmx-act atk"'+(VIEW_ONLY?' disabled':'')+' onclick="APP.rollWithWeapon(\''+jsq(weapon)+'\',\''+jsq(key)+'\',\''+fam+'\',\'attack\')">Attack</button>';
    const p=canParry?'<button class="pmx-act"'+(VIEW_ONLY?' disabled':'')+' onclick="APP.rollWithWeapon(\''+jsq(weapon)+'\',\''+jsq(key)+'\',\''+fam+'\',\'defence\')">Parry</button>':'';
    return a+p;
  };
  const meta=w=>(w.group==="Ranged"
      ?["Range "+(w.range||"—"),"Force "+(w.reach||"—"),"DM "+(w.dmgMod||"—"),"Load "+(w.load??"—")+(typeof w.load==="number"?" AP":"")].concat(w.impaleSize?["Impale size "+w.impaleSize]:[])
      :["Size "+(w.size||"—"),"Reach "+(REACH_NAME[w.reach]||w.reach||"—")])
     .concat(["AP/HP "+(w.apHp||"—")]).concat(w.effects&&w.effects!=="—"?[w.effects]:[]).map(esc).join(" · ");
  let h='<div class="pm-box pmx-weapons"><h3>Weapons</h3>';
  for(const n of S.gearWeapons||[]){
    const w=weaponByName(n);if(!w)continue;
    const ranged=w.group==="Ranged",canParry=weaponCanParry(w),covering=styles.filter(s=>styleDef(s.key).weapons.includes(n));
    h+='<div class="pmx-wpn"><div class="pmx-wpn-head"><span class="nm">'+esc(w.name)+'</span><span class="dmg">'+esc(w.dmg)+'</span></div>'
     +'<div class="pmx-wpn-meta">'+meta(w)+(ranged?' · <button type="button" class="pmx-link" onclick="APP.pmPopup(\'range\')">Distance helper</button>':'')+'</div>';
    const notes=pmWeaponNotes(w);if(notes)h+='<div class="pmx-wpn-note">'+notes+'</div>';
    if(covering.length){
      h+=covering.map(s=>'<div class="pmx-wpn-roll"><span class="sty">'+esc(s.name)+' <b>'+pmPctText(s.key)+'</b></span>'+btns(n,s.key,"",canParry)+'</div>').join("");
    }else{
      const id=esc(n.replace(/\W+/g,"_"));
      h+='<div class="pmx-wpn-roll unfam"><span class="sty">Not in your Combat Styles (Core p.88)</span>'
       +'<select id="fam-'+id+'">'+WEAPON_FAMILIARITY.filter(f=>styles.length||f[0]==="substantially").map(f=>'<option value="'+f[0]+'">'+esc(f[1])+'</option>').join("")+'</select>'
       +(styles.length>1?'<select id="famstyle-'+id+'">'+styles.map(s=>'<option value="'+esc(s.key)+'">'+esc(s.name)+'</option>').join("")+'</select>':'')
       +'<button class="pmx-act atk"'+(VIEW_ONLY?' disabled':'')+' onclick="APP.rollUnfamiliarWeapon(\''+jsq(n)+'\',\'attack\')">Attack</button>'
       +(canParry?'<button class="pmx-act"'+(VIEW_ONLY?' disabled':'')+' onclick="APP.rollUnfamiliarWeapon(\''+jsq(n)+'\',\'defence\')">Parry</button>':'')+'</div>';
    }
    h+='</div>';
  }
  // Core pp.105–106: every human can fight unarmed with the Unarmed skill.
  h+='<div class="pmx-wpn"><div class="pmx-wpn-head"><span class="nm">Unarmed</span><span class="dmg">'+esc(unarmedDamageText())+'</span></div>'
   +'<div class="pmx-wpn-meta">Size S · Reach Touch · Core pp.105–106</div>'
   +'<div class="pmx-wpn-roll"><span class="sty">Unarmed <b>'+pmPctText("std:Unarmed")+'</b></span>'+btns("Unarmed","std:Unarmed","",true)+'</div></div>';
  // Evade is the defence that doesn't use a weapon (Core p.103).
  h+='<div class="pmx-wpn pmx-evade"><div class="pmx-wpn-roll"><span class="sty">Evade <b>'+pmPctText("std:Evade")+'</b> <span class="pmx-dim">dive clear; usually leaves you prone</span></span>'
   +'<button class="pmx-act"'+(VIEW_ONLY?' disabled':'')+' onclick="APP.roll(\'std:Evade\')">Evade</button></div></div>';
  if(!(S.gearWeapons||[]).length)h+='<p class="pm-empty">No weapons carried. Add some on the Money &amp; Gear step.</p>';
  return h+'</div>';
}
function pmCombatTabHTML(){
  const fxOpen=!!PM_FX_SEARCH;
  // The roll card folds to a summary once effects are chosen, so the weapons'
  // Attack/Parry sit right under it for the next roll or a quick parry.
  return pmResolveCardHTML()+pmWeaponCardsHTML()+pmTurnStripHTML()+pmActionsPanelHTML()
   +'<details class="pm-box pmx-fxref" id="pm-actions"'+(fxOpen?' open':'')+'><summary><h3>Special Effects reference</h3><span class="pmx-dim">all '+SPECIAL_EFFECTS.length+', with rules text</span></summary>'+specialEffectsPanel()+'</details>';
}
// ---- Roll tray (Play Mode redesign batch 2) ----
// Each new d100 roll is shown in a small tray using the physics dice from
// Practice Combat (experiments/practice-dice.mjs). The tray lives outside
// #main, so a re-render while the dice tumble doesn't cut the animation.
// The roll itself is already decided and logged before the tray appears;
// the dice only show it. Without WebGL-free canvas or the dice module (no
// network), the tray shows the number straight away.
let PM_DICE_ENGINE=null,PM_DICE_S=null,PM_DICE_TIMER=0,PM_DICE_CANCEL=null;
const PM_DICE_SEEN=new WeakSet();
function pmDiceEngine(){
  if(!PM_DICE_ENGINE)PM_DICE_ENGINE=import("../experiments/practice-dice.mjs?v=2").catch(()=>null);
  return PM_DICE_ENGINE;
}
function pmDiceAnimated(){
  try{if(localStorage.getItem("pm-dice-3d")==="off")return false;}catch(e){}
  return !(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches);
}
function pmDiceTier(t){return t==="Critical"?"crit":t==="Success"?"ok":t==="Fumble"?"fumble":"fail";}
// Called at the end of every Play Mode render: animates only a roll made
// since the last render, never the saved log restored on load.
function pmDiceSync(){
  const log=S.rollLog||[];
  const first=PM_DICE_S!==S;PM_DICE_S=S;
  const fresh=log[0],isNew=!first&&fresh&&!PM_DICE_SEEN.has(fresh);
  log.forEach(r=>PM_DICE_SEEN.add(r));
  if(isNew)pmDiceShow(fresh);
}
function pmDiceShow(r){
  let tray=document.getElementById("pm-dicetray");
  if(!tray){tray=document.createElement("div");tray.id="pm-dicetray";tray.className="pmx-dicetray";tray.setAttribute("role","status");tray.setAttribute("aria-live","polite");document.body.appendChild(tray);}
  if(PM_DICE_CANCEL){try{PM_DICE_CANCEL();}catch(e){}PM_DICE_CANCEL=null;}
  clearTimeout(PM_DICE_TIMER);
  const value=r.roll==="00"?100:Number(r.roll);
  tray.className="pmx-dicetray show rolling";
  tray.innerHTML='<button class="pmx-dicetray-x" aria-label="Close" onclick="pmDiceHide()">&times;</button>'
   +'<button class="pmx-dicetray-log" onclick="pmDiceHide();APP.pmPopup(\'log\')">Log</button>'
   +'<div class="pmx-dicetray-label">'+esc(r.label)+' <span>'+r.pct+'%</span></div>'
   +'<canvas aria-hidden="true"></canvas>'
   +'<div class="pmx-dicetray-out"><b>'+(r.roll==="00"?"00":String(r.roll).padStart(2,"0"))+'</b><span class="pmx-tier '+pmDiceTier(r.tier)+'">'+esc(r.tier)+'</span></div>';
  const settle=()=>{if(tray.dataset.for!==String(value)+r.label)return;tray.classList.remove("rolling");tray.classList.add("settled");
    PM_DICE_TIMER=setTimeout(pmDiceHide,r.combat?9000:5000);};
  tray.dataset.for=String(value)+r.label;
  if(!pmDiceAnimated()){tray.querySelector("canvas").hidden=true;settle();return;}
  const fallback=setTimeout(()=>{tray.querySelector("canvas").hidden=true;settle();},1200);
  pmDiceEngine().then(engine=>{
    if(tray.dataset.for!==String(value)+r.label)return;
    clearTimeout(fallback);
    if(!engine){tray.querySelector("canvas").hidden=true;settle();return;}
    try{PM_DICE_CANCEL=engine.animateDice(tray.querySelector("canvas"),[{sides:100}],[value],1000,settle);}
    catch(e){console.warn("dice",e);tray.querySelector("canvas").hidden=true;settle();}
  });
}
function pmDiceHide(){
  clearTimeout(PM_DICE_TIMER);
  if(PM_DICE_CANCEL){try{PM_DICE_CANCEL();}catch(e){}PM_DICE_CANCEL=null;}
  const tray=document.getElementById("pm-dicetray");if(tray){tray.className="pmx-dicetray";tray.dataset.for="";}
}
function pmToggleDice3d(on){try{localStorage.setItem("pm-dice-3d",on?"on":"off");}catch(e){}render();}
// ---- Improve Skills modal (Experience Rolls, core rulebook pp.71-73) ----
let XP_LEARN_MSG="", XP_TRAIN_MSG="", XP_CHAR_MSG="";
function xpModalHtml(){
  const es=allEntries();
  const grp=g=>es.filter(e=>e.grp===g).sort((a,b)=>a.label.localeCompare(b.label));
  const row=e=>{
    const pct=finalPct(e.key);
    const flagged=S.xp.fumbled.includes(e.key);
    const checked=S.xp.checked.includes(e.key);
    const canSpend=xpRollsAvailable()>0;
    return '<div class="pm-xprow">'
     +'<button class="pm-xpflag'+(flagged?" on":"")+'" title="'+(flagged?"Fumbled — free +1% pending. Click to remove flag.":"Mark this skill as Fumbled (free +1%)")+'" onclick="APP.xpToggleFumble(\''+jsq(e.key)+'\')">&#9873;</button>'
     +'<button class="pm-ckflag'+(checked?" on":"")+'" title="'+(checked?"Checked (note only). Click to clear.":"Mark checked (note only)")+'" onclick="APP.xpToggleChecked(\''+jsq(e.key)+'\')">&#10003;</button>'
     +'<span class="nm">'+esc(e.label)+'</span>'
     +'<span class="pctval">'+pct+'%</span>'
     +(flagged?'<button class="pm-btn sm" onclick="APP.xpApplyFumble(\''+jsq(e.key)+'\')">apply +1%</button>':'')
     +'<button class="pm-btn sm roll" '+(canSpend?"":"disabled")+' onclick="APP.xpSpend(\''+jsq(e.key)+'\')">spend roll</button>'
     +'</div>';
  };
  let h='<div class="pm-modal-backdrop" onclick="APP.closeXP()"><div class="pm-modal" onclick="event.stopPropagation()">';
  h+='<div class="pm-modal-hd"><h3>Improve Skills &amp; Passions — Experience Rolls</h3><button class="pm-btn sm" onclick="APP.closeXP()">&times; close</button></div>';
  h+='<div class="pm-xppool"><div class="pm-xpformula">'
   +'<span class="pm-xpfterm">'+S.xp.pool+' banked (GM-awarded)</span>'
   +'<span class="pm-xpfop">=</span>'
   +'<span class="pm-xpftotal"><b>'+xpRollsAvailable()+'</b> roll'+(xpRollsAvailable()===1?"":"s")+' available</span>'
   +'</div><p class="pm-empty" style="margin:0">Core rules: the GM awards Experience Rolls; apply the CHA Experience Modifier only when the GM confirms that influence can help or hinder. Checked skills are notes only and do not add rolls.</p>'
   +'<label><input type="checkbox" id="xpApplyModifier"> Apply Experience Modifier (GM approval)</label>'
   +'<div class="pm-xpaward">Award <input type="number" id="xpAwardN" value="3" min="1" style="width:52px"> '
   +'<button class="pm-btn sm" onclick="APP.xpAward(document.getElementById(\'xpAwardN\').value,document.getElementById(\'xpApplyModifier\').checked)">+ add to pool</button> '
   +'<span class="pm-empty">core book: 2&ndash;4 per sitting, GM discretion. The optional CHA adjustment applies once to a positive award when selected.</span></div></div>';
  h+='<p class="pm-empty">Spend 1 roll on a skill: roll 1d100, add INT ('+effectiveChars().INT+'). Total meets or beats the skill&rsquo;s current % &rarr; <b>+1d'+(skillImprovementDie()||4)+'+1%</b>'+(skillImprovementDie()===6?' <span class="pm-empty">(campaign option, Core p.72)</span>':'')+'. Total falls short &rarr; still <b>+1%</b> (an Experience Roll never fails outright). A skill flagged &#9873; got a Fumble since the last sitting and gets a free <b>+1%</b> (applied before any roll spent on it, doesn&rsquo;t stack) &mdash; this flags automatically when you roll a Fumble in Play Mode, or click the flag by hand. A skill flagged &#10003; is marked for reference only; it does not grant a free Experience Roll. You may spend additional banked rolls on the same skill; each uses its updated percentage.</p>';
  const charAdv=S.xp.characteristics||{permanent:{},training:[]},training=characteristicTraining(S);
  const active=training.filter(t=>t.active).length;
  const campaignRuleState=rulesForOpenCharacter(),ruleMode=campaignRuleState.rules?.characteristicImprovement;
  const ruleReady=["standalone","ready"].includes(campaignRuleState.status);
  const modeNote=!S.campaignId?"Standalone character: both methods are available.":campaignRuleState.status==="error"?"Campaign rules could not be loaded. Reopen this panel when connected.":!ruleReady?"Loading campaign rules…":ruleMode==="permanent"?"Your GM selected permanent improvement.":ruleMode==="training"?"Your GM selected ongoing training.":"The GM has not configured this older campaign; both methods remain available.";
  h+='<details class="pm-fx-item"'+(XP_CHAR_MSG?' open':'')+'><summary>Improve characteristics <span class="pm-fx-badge">Core pp.72–73</span></summary>'
   +'<p>Training costs one banked roll per step now and one roll from each future award while maintained. Stopped training loses one step per characteristic with each new award. SIZ cannot increase through mundane means. The optional permanent method costs rolls once and requires GM approval.</p>'
   +'<p class="note">'+esc(modeNote)+'</p>'
   +'<p>Training maintenance: '+active+' roll'+(active===1?'':'s')+' per award. Each award records one award event; award only once per allotment. Creation scores remain separate; editing them or changing species recalculates the current score and cap.</p>'
   +'<label>Characteristic <select id="xpCharKey">'+CHARS.filter(k=>k!=="SIZ").map(k=>'<option value="'+k+'">'+k+' — natural '+S.chars[k]+', current '+effectiveChars()[k]+', maximum '+charMax(k)+'</option>').join("")+'</select></label> '
   +'<label><input type="checkbox" id="xpCharConfirm"> GM approves the method and costs</label> '
   +(ruleReady&&ruleMode!=="permanent"?'<button type="button" class="pm-btn sm" onclick="APP.xpCharacteristicTrain(document.getElementById(\'xpCharKey\').value,document.getElementById(\'xpCharConfirm\').checked)">Add training step</button> ':'')
   +(ruleReady&&ruleMode!=="training"?'<button type="button" class="pm-btn sm" onclick="APP.xpCharacteristicPermanent(document.getElementById(\'xpCharKey\').value,document.getElementById(\'xpCharConfirm\').checked)">Buy permanent +1</button>':'')
   +'<p>Permanent +1 cost: 1 + current score − species minimum. Training step: one tenth of species maximum, rounded up following the book’s examples, capped at the species maximum.</p>'
   +(training.length?'<p>Training steps:</p>'+training.map((t,i)=>'<div>'+esc(t.key)+' +'+t.bonus+' · '+(t.active?'maintained':'stopped')+' <button type="button" class="pm-btn sm" onclick="APP.xpCharacteristicToggle('+i+')">'+(t.active?'Stop':'Resume')+'</button></div>').join(""):'<p>No training steps recorded.</p>')
   +'<p role="status">'+esc(XP_CHAR_MSG)+'</p></details>';
  h+='<details class="pm-fx-item"><summary>Learn a new Professional Skill <span class="pm-fx-badge">Core p.73</span></summary><p>Find a source of education, complete a month of study and practice, and obtain your GM’s approval. Learning costs 3 Experience Rolls plus any in-game costs. Confirm any additional cult, magic or other prerequisites with your GM.</p><label>Skill <select id="xpLearnName">'+Object.keys(PROF).sort().map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join("")+'</select></label> <label>Speciality or tradition, if applicable <input id="xpLearnSpec" type="text" maxlength="100"></label><br><label><input id="xpLearnConfirmed" type="checkbox"> Education, month of study and GM approval confirmed</label> <button class="pm-btn sm" type="button" onclick="APP.xpLearnProfessional(document.getElementById(\'xpLearnName\').value,document.getElementById(\'xpLearnSpec\').value,document.getElementById(\'xpLearnConfirmed\').checked)">Learn for 3 rolls</button><p class="pm-empty">Specialities are required for Art, Binding, Craft, Culture, Devotion, Invocation, Language and Lore.</p><p role="status">'+esc(XP_LEARN_MSG)+'</p></details>';
  h+='<details class="pm-fx-item"><summary>Train with a mentor <span class="pm-fx-badge">Core p.73</span></summary><p>Complete one full week on one skill at a time. The mentor must have at least 20 percentage points more in that skill. Resolve availability, costs and any teacher’s Teach roll with your GM. After training, improve that skill with an Experience Roll before training it again.</p><label>Skill <select id="xpTrainKey">'+es.map(e=>'<option value="'+esc(e.key)+'">'+esc(e.label)+' ('+finalPct(e.key)+'%)'+((S.xp.trainingPending||[]).includes(e.key)?' — needs Experience Roll':'')+'</option>').join("")+'</select></label> <label>Mentor’s skill % <input id="xpTrainMentor" type="number" min="0" step="1"></label> <label>Mentor <select id="xpTrainResult"><option value="trainer">Trainer (no Teach roll)</option><option value="critical">Teacher: critical</option><option value="success">Teacher: success</option><option value="failure">Teacher: failure</option><option value="fumble">Teacher: fumble</option></select></label><br><label><input type="checkbox" id="xpTrainConfirmed"> Week and GM approval confirmed</label> <button type="button" class="pm-btn sm" onclick="APP.xpTrain(document.getElementById(\'xpTrainKey\').value,document.getElementById(\'xpTrainMentor\').value,document.getElementById(\'xpTrainResult\').value,document.getElementById(\'xpTrainConfirmed\').checked)">Complete training</button><p class="pm-empty">A mentor exactly 20 points better uses the first row (1d2), by house ruling. The Core cash guideline is 1 sp per 5% in the skill plus 1 sp per 10% in Teach, per week. A trainer takes one student at a time. A teacher can take several, using Teach ÷ 10 as a guide. The GM tracks payment, timing and any cult or guild discounts.</p><p role="status">'+esc(XP_TRAIN_MSG)+'</p></details>';
  h+='<div class="pm-xplist">';
  h+='<div class="pm-skillgroup"><h4>Standard</h4>'+grp("Standard").map(row).join("")+'</div>';
  if(grp("Professional").length)h+='<div class="pm-skillgroup"><h4>Professional</h4>'+grp("Professional").map(row).join("")+'</div>';
  if(grp("Magic").length)h+='<div class="pm-skillgroup"><h4>Magic</h4>'+grp("Magic").map(row).join("")+'</div>';
  if(grp("Combat Style").length)h+='<div class="pm-skillgroup"><h4>Combat Styles</h4>'+grp("Combat Style").map(row).join("")+'</div>';
  if(S.passions.length)h+='<div class="pm-skillgroup"><h4>Passions</h4>'+S.passions.map((p,i)=>'<div class="pm-xprow"><span class="nm">'+esc(p.name||"(unnamed)")+'</span><span class="pctval">'+passionVal(p)+'%</span><button class="pm-btn sm roll" '+(xpRollsAvailable()>0&&typeof passionVal(p)==="number"?"":"disabled")+' onclick="APP.xpSpendPassion('+i+')">spend roll</button><label>Change <input type="number" step="1" id="passionChange'+i+'" aria-label="Change '+esc(p.name||"unnamed Passion")+'" style="width:65px"></label><button class="pm-btn sm" onclick="APP.adjustPassion('+i+',document.getElementById(\'passionChange'+i+'\').value)">apply</button><span class="pm-passionshift" title="Core p.82 Deepening and Waning: the GM picks the strength"><select id="passionShift'+i+'" aria-label="Strength of change for '+esc(p.name||"unnamed Passion")+'"><option value="weak">Weak (1d10)</option><option value="moderate">Moderate (1d10+5)</option><option value="strong">Strong (1d10+10)</option></select>'
      +'<button class="pm-btn sm" '+(typeof passionVal(p)==="number"?"":"disabled")+' onclick="APP.passionShift('+i+',document.getElementById(\'passionShift'+i+'\').value,1)">deepen</button>'
      +'<button class="pm-btn sm" '+(typeof passionVal(p)==="number"?"":"disabled")+' onclick="APP.passionShift('+i+',document.getElementById(\'passionShift'+i+'\').value,-1)">wane</button></span></div>').join("")+'<p class="pm-empty">For a GM-directed change from play, roll it with deepen or wane at the strength the GM picks (Weak 1d10, Moderate 1d10+5, Strong 1d10+10), or enter a positive or negative amount (Core p.82). Applying it does not spend an Experience Roll; the GM decides the change. Values cannot fall below zero.</p></div>';
  h+='</div>';
  h+='<div class="pm-xplog"><h4>Results</h4>'+(S.xp.history.length?S.xp.history.map(xpLogRow).join(""):'<p class="pm-empty">No rolls yet.</p>')+'</div>';
  h+='</div></div>';
  return h;
}
function xpLogRow(r){
  if(r.type==="training")return '<div class="pm-xplogrow">'+esc(r.label)+' — training <b>+'+r.gain+'%</b> &rarr; now <b>'+r.newPct+'%</b></div>';
  if(r.type==="learn")return '<div class="pm-xplogrow">'+esc(r.label)+' — learned for 3 Experience Rolls &rarr; starting at <b>'+r.newPct+'%</b></div>';
  if(r.type==="passion-adjustment")return '<div class="pm-xplogrow">'+esc(r.label)+' — manual change <b>'+(r.delta>0?"+":"")+r.delta+'%</b> &rarr; now <b>'+r.newPct+'%</b></div>';
  if(r.type==="fumble")return '<div class="pm-xplogrow fumble">'+esc(r.label)+' — Fumble bonus <b>+1%</b> &rarr; now <b>'+r.newPct+'%</b></div>';
  return '<div class="pm-xplogrow'+(r.success?" ok":"")+'">'+esc(r.label)+' — d100 '+r.roll+' + INT '+r.int+' = <b>'+r.total+'</b> vs '+r.target+'% &rarr; '
   +(r.success?"met/beat it":"fell short")+', <b>+'+r.gain+'%</b>'+(r.fumbleApplied?" (fumble +1% applied first)":"")+' &rarr; now <b>'+r.newPct+'%</b></div>';
}
// Standing conditions that are silently altering every percentage on the
// sheet. Encumbrance and Fatigue both used to be display-only; now that they
// really do move the numbers, the sheet has to say so somewhere the reader
// can't miss, or a shrunken Athletics score looks like a bug.
function conditionsSummary(){
  if(!charsReady())return "";
  const rows=[];
  const enc=encStatus();
  if(enc&&enc.level!=="ok"){
    rows.push(['<b>'+esc(enc.label)+'</b> (gear ENC '+gearEncTotal()+' vs STR&times;2 = '+encLimit()+')',
      enc.steps+' Grade'+(enc.steps>1?"s":"")+' harder on every STR/DEX skill and Combat Style']);
  }
  const f=fatigueRow();
  if(f.name!=="Fresh"){
    const bits=['all skill rolls at <b>'+GRADE_LABEL[f.grade]+'</b>'];
    if(f.init)bits.push('Initiative '+f.init);
    if(f.ap)bits.push('Action Points '+f.ap);
    rows.push(['<b>Fatigue: '+esc(f.name)+'</b>',bits.join(", ")]);
  }
  const mv=moveRate();
  if(mv.m!==mv.base)rows.push(['<b>Movement</b>',mv.base+'m &rarr; '+mv.m+'m &mdash; '+esc(mv.notes.join("; "))]);
  if(!rows.length)return '<p class="note" style="margin-top:8px">No standing conditions &mdash; unencumbered and Fresh, so every % below is the character&rsquo;s plain skill.</p>';
  return '<div class="condbox"><h4>Conditions currently applied to these numbers</h4>'
   +rows.map(r=>'<div class="condrow"><span>'+r[0]+'</span><span>'+r[1]+'</span></div>').join("")
   +'<p class="note">Set Fatigue in Play Mode; change carried gear on the Money &amp; Gear step.</p></div>';
}
// The dense print-style character sheet. Used to be the builder's final
// step ("Sheet & Export"); now that Play Mode covers everything a player
// needs during a session, this is instead a standalone reference/printout
// reachable from Play Mode, the Finish step, and each My Characters card
// (see APPVIEW "sheet" / APP.toSheet / renderSheetView below).
function characterSheetBody(){
  const c=effectiveChars(),es=allEntries();
  const grp=g=>es.filter(e=>e.grp===g).sort((a,b)=>a.label.localeCompare(b.label));
  // Small filled/hollow dot ahead of each skill name — purely a scannability
  // aid (not a rules concept) so a first-time player can spot at a glance
  // which skills actually have points in them versus base-only. Modelled on
  // the proficiency-dot idea from D&D Beyond's skill list, adapted since
  // Mythras has no proficiency toggle — "trained" here just means invested.
  const skrows=list=>list.map(e=>{
    if(isSpokenLanguage(e.key))return '<div class="skrow"><span>'+esc(e.label)+'</span><span class="pct" title="Spoken fluency">'+finalPct(e.key)+'%</span></div>';
    const base=finalPct(e.key);const g=gradedPct(e.key,base);const shifted=g.grade!==ACTIVE_GRADE;
    const why=gradeReasons(e.key);
    const whyTxt=why.length?why.map(r=>r.text).join(" · "):"";
    let valueHtml;
    if(g.pct===null)valueHtml='<span class="note" style="text-transform:capitalize" title="'+esc(whyTxt)+'">'+GRADE_LABEL[g.grade]+'</span>';
    else if(g.grade!=="standard")valueHtml='<span class="pct" title="'+esc(whyTxt)+'">'+g.pct+'%</span> <span class="note" style="text-decoration:line-through">'+base+'%</span>'+(shifted?' <span class="note" title="'+esc(whyTxt||"Grade shifted")+'">&#9733;</span>':"");
    else valueHtml='<span class="pct">'+base+'%</span>';
    const dot='<span class="trdot" style="color:'+(e.trained?"var(--verd)":"var(--faint)")+'" title="'+(e.trained?"Trained":"Base only, no points invested")+'">'+(e.trained?"&#9679;":"&#9675;")+'</span>';
    return '<div class="skrow"><span>'+dot+esc(e.label)+'</span><span>'+valueHtml+' <button class="rollb" onclick="APP.roll(\''+jsq(e.key)+'\')">roll</button></span></div>';
  }).join("");
  let h=head("Character Sheet","A printable reference sheet — same numbers as Play Mode. Roll skills straight off it if you like; this browser autosaves as you go either way.");
  h+='<div class="card"><h3>Difficulty Grade</h3><p class="note">Shifts rolled skill percentages until you set it back to Standard.'
   +(S.archetype!=="ordinary"?' Endurance/Stealth/Willpower auto-shift one step easier if you took that Advantage (marked &#9733;).':"")+'</p>'
   +'<select onchange="APP.setGrade(this.value)">'+GRADES.map(([k,l])=>'<option value="'+k+'" '+(ACTIVE_GRADE===k?"selected":"")+'>'+l+'</option>').join("")+'</select>'
   +(ACTIVE_GRADE!=="standard"?' <button class="chip" onclick="APP.setGrade(\'standard\')">reset to Standard</button>':"")
   +conditionsSummary()+'</div>';
  h+=(PM_MSG?'<p class="warn" style="margin-top:6px">'+esc(PM_MSG)+'</p>':'')
   +'<div class="rolllog" id="rolllog">'+(S.rollLog.length?S.rollLog.map((r,i)=>'<div class="'+(i===0?"fresh ":"")+'t'+r.tier+'">d100 = '+r.roll+' vs '+esc(r.label)+' '+r.pct+'% &rarr; <b>'+r.tier+'</b></div>').join(""):'<span class="note">Roll log &mdash; click &ldquo;roll&rdquo; beside any skill. Crit &le; 1/10 skill (round up) &middot; 01&ndash;05 auto success &middot; 96&ndash;00 auto failure &middot; fumble 99&ndash;00 (00 only if skill &gt; 100).</span>')+'</div>';
  // Dense, print-style grid sheet — modelled on the official Mythras
  // character sheet's layout (small bordered boxes, a title panel, compact
  // Characteristics/Attributes tables, a Hit Locations table with a body
  // dot-diagram, a wide Skills table, and Melee/Ranged weapon tables along
  // the bottom) rather than the earlier stacked-cards design. Fields that
  // don't have a Mythras equivalent (e.g. a strict "Contacts/Allies/Enemies"
  // sub-system) are adapted to the closest real mechanic — Passions, here.
  h+='<div class="card sheet msheet">';
  if(!charsReady()){
    h+='<p class="warn">Set characteristics first to build the sheet.</p></div>';
    h+=campaignCard();
    h+='<div class="exportrow"><button class="nav" onclick="window.print()">Print sheet</button></div>';
    return h+rulesNotes();
  }
  const initPenalty=armourPenaltyToInit();
  const careerName=S.customCareer.isCustom?S.customCareer.name:S.career;
  const hpAt=loc=>playMaxHP(loc);
  // ---- header band: player/character, background, title panel, contacts, equipment ----
  h+='<div class="mhead-grid">';
  h+='<div class="mbox"><div class="mbox-t">Player &amp; Character</div>'
   +mkv("Player",esc(S.concept.player||"—"))+mkv("Character",esc(S.concept.name||"Unnamed"))
   +mkv("Species",esc(speciesDef()?speciesDef().label:"Human"))
   +mkv("Culture",esc(S.culture||"—"))+mkv("Career",esc(careerName||"—"))
   +mkv("Age",esc(S.concept.age||"—"))+mkv("Gender",esc(S.concept.gender||"—"))
   +mkv("Frame",esc(S.concept.frame||"—"))+mkv("Handed",esc(S.concept.handed||"—"))
   +(()=>{const hw=heightWeight();return hw?mkv("Height",hw.ft)+mkv("Weight",hw.lb+" lb"):"";})()+'</div>';
  h+='<div class="mbox"><div class="mbox-t">Background, Community &amp; Family</div>'
   +mkv("Homeland",esc(S.concept.homeland||"—"))+mkv("Social class",esc(S.money.socialClass||"—"))
   +(S.archetype!=="ordinary"?mkv("Tier",esc(ARCHETYPES[S.archetype].label)):"")
   +((S.community&&S.community.family)?mkv('Family',esc(S.community.family)):'')
   +((S.community&&S.community.parents)?mkv('Parents',esc(S.community.parents)):'')
   +((S.community&&S.community.siblings)?mkv('Siblings',esc(S.community.siblings)):'')
   +((S.community&&S.community.reputation)?mkv('Reputation',esc(S.community.reputation)):'')
   +((S.community&&S.community.resources)?mkv('Resources',esc(S.community.resources)):'')
   +(familyRollLines().length?'<div class="mnotesmini">'+familyRollLines().map(x=>'<div>'+esc(x)+'</div>').join('')+'</div>':'')
   +((S.community&&S.community.household)?mkv('Marriage / children',esc(S.community.household)):'')
   +(householdRollLines().length?'<div class="mnotesmini">'+householdRollLines().map(x=>'<div>'+esc(x)+'</div>').join('')+'</div>':'')
   +((S.community&&S.community.partyTie)?mkv('Party tie',esc(S.community.partyTie)):'')
   +(coreBackgroundLines().length?'<div class="mnotesmini">'+coreBackgroundLines().map(x=>'<div>'+esc(x)+'</div>').join('')+'</div>':'')
   +'<div class="mnotesmini">'+(S.concept.notes?esc(S.concept.notes):'<span class="note">No background notes yet.</span>')+'</div></div>';
  h+='<div class="mtitlepanel"><div class="logo">Mythra<span>S</span></div><div class="sub2">Character Record</div></div>';
  h+='<div class="mbox"><div class="mbox-t">Passions (Contacts, Allies &amp; Ties)</div>'
   +(S.passions.length?S.passions.map(p=>mkv(esc(p.name||"(unnamed)"),passionVal(p)+"%")).join(""):'<span class="note">No Passions recorded.</span>')
   +(S.community&&S.community.connections&&S.community.connections.length?'<div class="mnotesmini">'
     +S.community.connections.map(x=>'<div><b>'+esc(x.type)+':</b> '+esc(x.name)+(x.notes?' — '+esc(x.notes):'')+'</div>').join('')+'</div>':'')+'</div>';
  h+='<div class="mbox"><div class="mbox-t">Equipment &amp; Armour</div>'
   +'<table class="mtiny"><tr><th>Loc</th><th>Armour</th><th class="num">AP</th></tr>'
   +ARMOR_LOCATIONS.map(l=>'<tr><td>'+esc(l)+'</td><td>'+esc(armorDisplayName(l))+'</td><td class="num">'+armorApAt(l)+'</td></tr>').join("")+'</table>'
   +mkv("Init. penalty",initPenalty?"−"+initPenalty:"0")
   +mkv("Silver",S.money.dice.length?moneyRemaining()+" / "+moneyTotal()+" sp":"—")+'</div>';
  h+='</div>'; // /mhead-grid

  // ---- main grid: characteristics/attributes/money (left), hit locations +
  // difficulty grades (mid), skills (right, wide) ----
  h+='<div class="mmain-grid">';
  h+='<div class="mcol">';
  h+='<div class="mbox"><div class="mbox-t">Characteristics</div><table class="mchtable">'
   +[["STR",c.STR,"Damage Mod",dmCalc(c.STR,c.SIZ)],
     ["CON",c.CON,"Healing Rate",healRate(c.CON)+(S.archetype!=="ordinary"?"×2":"")],
     ["SIZ",c.SIZ,"Damage Mod",dmCalc(c.STR,c.SIZ)],
     ["DEX",c.DEX,"Initiative",initBonus(c.INT,c.DEX)-initPenalty],
     ["INT",c.INT,"Action Points",apFinal(c.INT,c.DEX,S.fixedAP)],
     ["POW",c.POW,"Luck Points",luckFinal(c.POW)],
     ["CHA",c.CHA,"Exp. Mod",(xpMod(c.CHA)>=0?"+":"")+xpMod(c.CHA)]
    ].map(([nm,v,lk,lv])=>'<tr><td class="nm">'+nm+'</td><td class="vv">'+v+'</td><td class="lk">'+lk+'</td><td class="lv">'+lv+'</td></tr>').join("")
   +'</table></div>';
  h+='<div class="mbox"><div class="mbox-t">Attributes</div><table class="mchtable">'
   +[["Movement",moveText()],["Magic Points",c.POW],["Action Points",apFinal(c.INT,c.DEX,S.fixedAP)],
     ["Damage Modifier",dmCalc(c.STR,c.SIZ)],["Initiative Bonus",initBonus(c.INT,c.DEX)-initPenalty],
     ["Healing Rate",healRate(c.CON)],["Luck Points",luckFinal(c.POW)],["Experience Mod.",(xpMod(c.CHA)>=0?"+":"")+xpMod(c.CHA)]
    ].map(([nm,v])=>'<tr><td class="nm" colspan="3">'+nm+'</td><td class="vv">'+v+'</td></tr>').join("")
   +'</table></div>';
  h+='<div class="mbox"><div class="mbox-t">Money &amp; Wealth</div>'
   +mkv("Starting",S.money.dice.length?moneyTotal()+" sp":"—")+mkv("Spent",moneySpentTotal()+" sp")
   +mkv("Remaining",S.money.dice.length?moneyRemaining()+" sp":"—")
   +mkv("Gear ENC",gearEncTotal())+mkv("Enc. limit (STR×2)",encLimit())+'</div>';
  h+='<div class="mbox mmagicbox"><div class="mbox-t">Magic Points</div><div class="mbig">'+c.POW+'</div></div>';
  h+='</div>'; // /mcol left

  h+='<div class="mcol">';
  h+='<div class="mbox"><div class="mbox-t">Hit Locations</div><div class="mhitloc-flex">'
   +'<table class="mtiny"><tr><th>d20</th><th>Loc</th><th class="num">HP</th><th class="num">AP</th></tr>'
   +HIT_D20.map(([r,loc])=>{const base=loc.replace(/Right |Left /,"Each ");
     return '<tr><td>'+r+'</td><td>'+loc+'</td><td class="num">'+hpAt(loc)+'</td><td class="num">'+armorApAt(loc)+'</td></tr>';}).join("")
   +'</table>'+bodyDiagramSvg()+'</div></div>';
  h+='<div class="mbox"><div class="mbox-t">Difficulty Grades</div><table class="mtiny">'
   +GRADES.map(([k,l])=>'<tr><td>'+l+'</td><td class="num">'+(GRADE_MULT[k]==null?(k==="automatic"?"no roll":"can&rsquo;t attempt"):(k==="standard"?"&mdash;":"&times;"+GRADE_MULT[k]))+'</td></tr>').join("")
   +'</table><p class="note" style="margin-top:4px">Current: <b>'+GRADE_LABEL[ACTIVE_GRADE]+'</b> (set on the Sheet controls above)</p></div>';
  h+='</div>'; // /mcol mid

  h+='<div class="mcol mskillscol"><div class="mbox mskillsbox"><div class="mbox-t">Skills</div>'
   +'<div class="mskillgrid">'
   +'<div><h4 class="msub">Standard</h4><div class="mskgrid">'+skrows(grp("Standard"))+'</div></div>'
   +'<div><h4 class="msub">Professional</h4><div class="mskgrid">'+(grp("Professional").length?skrows(grp("Professional")):'<span class="note">None yet.</span>')
     +(grp("Magic").length?'<h4 class="msub" style="margin-top:8px">Magic</h4><div class="mskgrid">'+skrows(grp("Magic"))+'</div>':"")
     +(grp("Combat Style").length?'<h4 class="msub" style="margin-top:8px">Combat Styles</h4><div class="mskgrid">'+skrows(grp("Combat Style"))+'</div>':"")+'</div></div>'
   +'</div></div></div>';
  h+='</div>'; // /mmain-grid

  // ---- weapons row ----
  h+='<div class="mweapons-grid">';
  const meleeWps=S.gearWeapons.map(n=>weaponByName(n)).filter(w=>w&&w.group!=="Ranged");
  const rangedWps=S.gearWeapons.map(n=>weaponByName(n)).filter(w=>w&&w.group==="Ranged");
  h+='<div class="mbox"><div class="mbox-t">Melee &amp; Shield Weapons</div>'
   +(meleeWps.length?'<table class="mtiny"><tr><th>Weapon</th><th>Damage</th><th>Reach</th><th>Effects</th><th class="num">ENC</th><th>AP/HP</th></tr>'
     +meleeWps.map(w=>'<tr><td>'+esc(w.name)+'</td><td class="num">'+esc(w.dmg)+'</td><td>'+esc(w.reach)+'</td><td>'+esc(w.effects)+'</td><td class="num">'+w.enc+'</td><td>'+esc(w.apHp)+'</td></tr>').join("")+'</table>'
     :'<p class="note">None carried &mdash; add some on the Money &amp; Gear step.</p>')+'</div>';
  h+='<div class="mbox"><div class="mbox-t">Ranged Weapons</div>'
   +(rangedWps.length?'<table class="mtiny"><tr><th>Weapon</th><th>Damage</th><th>Range</th><th>Force</th><th>DM</th><th>Load</th><th>Impale</th><th>Effects</th><th class="num">ENC</th><th>AP/HP</th></tr>'
     +rangedWps.map(w=>'<tr><td>'+esc(w.name)+'</td><td class="num">'+esc(w.dmg)+'</td><td>'+esc(w.range||"—")+'</td><td>'+esc(w.reach||"—")+'</td><td>'+esc(w.dmgMod||"—")+'</td><td>'+esc(typeof w.load==="number"?String(w.load)+" AP":"—")+'</td><td>'+esc(w.impaleSize||"—")+'</td><td>'+esc(w.effects)+'</td><td class="num">'+w.enc+'</td><td>'+esc(w.apHp)+'</td></tr>').join("")+'</table>'
     :'<p class="note">None carried.</p>')+'</div>';
  h+='</div>'; // /mweapons-grid

  const magic=allMagic();
  if(magic.length){
    h+='<div class="mbox" style="margin-top:8px"><div class="mbox-t">Magic Known</div>';
    if(devotionalMax()>0)h+=mkv("Devotional Pool",devotionalCur()+" / "+devotionalMax()+" MP");
    h+='<table class="mtiny"><tr><th>Magic</th><th>Tradition</th><th>Cast with</th><th>Cost</th></tr>'
     +magic.map(m=>{const t=MAGIC_TRAD_MAP[m.tradition];
       const cost=m.tradition==="folk"?"1 MP (0 on a Critical)"
         :m.tradition==="sorcery"?(sorceryCost(m).mp+" MP / "+sorceryCost(m).turns+" turns")
         :m.tradition==="theism"?theismCostLabel(m)
         :m.tradition==="animism"?("POW "+(m.pow||0)+", CHA "+(m.cha||0))
         :((m.cost||0)+(t.pool==="devotional"?" pool":" MP"));
       return '<tr><td>'+esc(magicLabel(m))+'</td><td>'+esc(t.label)+'</td><td>'+esc(t.castSkill)+'</td><td>'+esc(cost)+'</td></tr>';}).join("")
     +'</table></div>';
  }
  if(S.inventory.length)h+='<div class="mbox" style="margin-top:8px"><div class="mbox-t">Other Equipment</div>'
   +S.inventory.map(it=>mkv(esc(it.name)+' ×'+it.qty,'ENC '+inventoryItemEnc(it))).join("")+'</div>';
  h+='</div>';
  h+='<div class="exportrow"><button class="nav" onclick="window.print()">Print sheet</button></div>';
  h+=rulesNotes();
  return h;
}
// Builder's final step. Used to be the dense "Sheet & Export" printout
// itself; now that Play Mode is where a finished character actually lives,
// this is just the closing action — campaign assignment/save (the one
// genuinely unfinished piece of business) plus a big "enter Play Mode"
// button. The full printable sheet moved to characterSheetBody(), one click
// away via "View / Print Sheet" here, from Play Mode, or from a My
// Characters card.
function stepFinish(){
  const careerName=S.customCareer.isCustom?S.customCareer.name:S.career;
  const meta=[S.culture,careerName,S.archetype!=="ordinary"?ARCHETYPES[S.archetype].label:null].filter(Boolean).join(" · ");
  const review=creationReview();
  let h=head("Finish Creating","Review your character, save it, then enter Play Mode. You can return to any creation step from Edit in Play Mode.");
  h+='<div class="card"><h3>'+esc(S.concept.name||"Unnamed Character")+'</h3>'
   +(meta?'<p class="note">'+esc(meta)+'</p>':"")+'</div>';
  if(review.length){h+='<div class="card"><h3>Review before play</h3><p class="note">Corrections, recorded GM overrides and details to settle with the GM are listed separately. Manual reminders do not change saved scores or apply effects automatically.</p><ul>';
    for(const r of review)h+='<li><b>'+esc(r.status==='error'?'Correction':r.status==='override'?'GM override':'GM / manual')+':</b> '+esc(r.text)+' <button class="chip" onclick="APP.go('+currentSteps().indexOf(r.step)+')">Review '+esc(r.step)+'</button></li>';
    h+='</ul></div>';
  }else h+='<p class="note">Creation checks passed. Setting-specific choices, starting possessions and magic access still require your GM&rsquo;s agreement.</p>';
  h+=campaignCard();
  h+='<div class="exportrow"><button class="nav primary" onclick="APP.toPlay()" '+(review.some(r=>r.status==='error')?'disabled':'')+'>&#9654; Finish Creating &mdash; Enter Play Mode</button>'
   +'<button class="nav" onclick="APP.toSheet(\'character\')">View / Print Sheet</button></div>';
  return h;
}
// Read-only recap of each Combat Style for Play Mode's Features tab — the
// actual weapons/traits builder (combatStyleBuilderHTML, in render.js) now
// lives inline on whichever step names the style (Culture/Career/Quick
// Skills), not here. No editing controls here; that only happens on those
// steps.
// Racial traits, read-only, for Play Mode's Features tab. These are
// situational Grade shifts the GM calls for, so they live here as reference
// text rather than being folded into a percentage — the same treatment the
// Pulp/Paragon Grade-easier Advantages get.
function speciesTraitsReadOnlyHTML(){
  const sp=speciesDef();
  if(!sp||!sp.traits.length)return "";
  return '<div class="pm-cstyle-ro"><div class="pm-cstyle-block"><h4>'+esc(sp.label)+' &mdash; racial traits</h4>'
   +'<p class="pm-notes">Movement '+sp.move+'m &middot; lifespan '+esc(sp.lifespan)+'</p>'
   +sp.traits.map(([n,d])=>'<details class="pm-fx-item"><summary>'+esc(n)+'</summary><p>'+esc(d)+'</p></details>').join("")
   +'</div></div>';
}
function combatStylesReadOnlyHTML(){
  const styles=stylesList();
  if(!styles.length)return speciesTraitsReadOnlyHTML();
  return speciesTraitsReadOnlyHTML()+'<div class="pm-cstyle-ro">'+styles.map(s=>{
    const d=styleDef(s.key);
    let h='<div class="pm-cstyle-block"><h4>'+esc(s.name)+'</h4>';
    h+=d.weapons.length?'<p class="pm-notes"><b>Weapons:</b> '+d.weapons.map(esc).join(", ")+'</p>'
      :'<p class="pm-empty">No weapons attached — edit this style back on the Culture, Career, or Quick Skills step.</p>';
    if(d.traits.length){
      h+=d.traits.map(tn=>{
        const t=COMBAT_TRAITS.find(x=>x.name===tn);if(!t)return"";
        return '<details class="pm-fx-item"><summary>'+esc(t.name)+' <span class="pm-fx-badge">'+esc(t.category)+'</span></summary><p>'+esc(t.desc)+'</p></details>';
      }).join("");
    }else h+='<p class="pm-empty">No Combat Style Traits attached.</p>';
    h+='</div>';
    return h;
  }).join("")+'</div>';
}
function campaignCard(){
  if(!AUTH_USER&&!MOCK_AUTH){
    return '<div class="card"><h3>Campaign</h3><p class="note">Sign in from the Main Menu to link this character to a campaign and save it to your account.</p></div>';
  }
  if(CAMP_CACHE===null){loadCampaignsUnified();return '<div class="card"><h3>Campaign</h3><p class="note">Loading campaigns&hellip;</p></div>';}
  const camps=CAMP_CACHE;
  let h='<div class="card"><h3>Campaign</h3>';
  h+=fld("Assign to campaign",'<select onchange="APP.setCampaign(this.value)"><option value="">&mdash; none &mdash;</option>'
    +camps.map(c=>'<option value="'+esc(c.id)+'" '+(S.campaignId===c.id?"selected":"")+'>'+esc(c.name)+'</option>').join("")+'</select>');
  if(!camps.length)h+='<p class="note">No campaigns yet — create one from the Main Menu, then come back here to link this character.</p>';
  h+='<p style="margin-top:8px"><button class="nav" onclick="APP.saveToLibrary()">Save to Library</button> '
   +(S._libId?'<span class="note">Saved'+(cloudActive()?" to your account":" to this browser&rsquo;s library")+(S._libLastSaved?(" · "+new Date(S._libLastSaved).toLocaleTimeString()):"")+'</span>'
             :'<span class="note">Not yet saved'+(cloudActive()?" to your account":" to this browser&rsquo;s library")+' &mdash; Export JSON remains the durable, portable copy.</span>')+'</p>';
  h+='</div>';
  return h;
}
function rulesNotes(){
  return '<details class="rn"><summary>Rules notes &amp; audit trail</summary><div class="body"><ul>'
  +'<li>Attribute tables (Action Points, Damage Modifier, Experience Modifier, Healing Rate, Luck Points, Initiative, Hit Points per location, Humanoid Hit Location d20 table) checked against core pp.9&ndash;10 and p.109 page images. Damage Modifier&rsquo;s lowest band is &minus;1D8 (an earlier text-extraction pass had misread this as &minus;1D6).</li>'
  +'<li>Skill base formulas from the workbook character sheet and core skill chapter. <b>Quirk:</b> the workbook&rsquo;s allocation worksheet misprints Locale as DEX+POW and Perception as CHA+POW; the core rulebook and the workbook&rsquo;s own sheet give Locale INT&times;2 and Perception INT+POW &mdash; the core values are used here.</li>'
  +'<li><b>Quirk:</b> culture tables print the skill as &ldquo;Navigate&rdquo;; the skills chapter defines &ldquo;Navigation (INT+POW)&rdquo; &mdash; normalised to Navigation.</li>'
  +'<li>Culture: 100 points, every required cultural skill 5&ndash;15; optional cultural Combat Style may stay at 0. Career: 100 points, max 15, &ldquo;not all of the available skills need to be improved.&rdquo; Bonus: age-dependent pool and cap from Core p.34 (Adult: 150 points, max 15), with one optional hobby Professional Skill or Combat Style. Customs &amp; Native Tongue +40% each. All confirmed against the Character Creation Summary (core p.27) page image.</li>'
  +'<li>Passions starting values per the Passions Table (Culture &amp; Community, p.23), confirmed against the page image: a person (romantic/familial) 30 + loved one&rsquo;s POW+CHA; a person (platonic or averse) 30 + own POW + subject&rsquo;s CHA; an organisation, place or concept 30 + POW+INT; a race/species or an object 30 + POW&times;2.</li>'
  +'<li>Starting money per culture (Barbarian 4d6&times;50, Civilised 4d6&times;75, Nomadic 4d6&times;25, Primitive 4d6&times;10 silver) and the Social Class / Money Modifier tables (Culture &amp; Community, p.24, four per-culture tables: Barbarian, Civilised, Nomad, Primitive) are transcribed and confirmed against page images &mdash; no longer a reconstruction. The free-text Social Class field and Money Modifier number still let you override with a house rule if your table plays it differently.</li>'
  +'<li>Success tiers (Skills chapter, p.37&ndash;38, confirmed against page image): critical = one tenth of skill, fractions rounded up; 01&ndash;05 always succeeds; 96&ndash;00 always fails, regardless of skill value; fumble on 99&ndash;00, or only 00 for skills over 100. (Mythras has four tiers &mdash; no &ldquo;special&rdquo; tier.)</li>'
  +'<li>Weapons (Economics &amp; Equipment, pp.63&ndash;66: One-Handed, Shields, Two-Handed, Ranged tables) and Armour (p.58 Armour Table, 8 Construction tiers from Natural/Cured to Articulated Plate, plus the Material Types ENC-multiplier table, applied via GM-approved overrides) are transcribed and confirmed against page images. <b>Correction:</b> weapons have no STR/DEX minimum in Mythras &mdash; an earlier pass fabricated that mechanic entirely; it has been removed. Every Combat Style uses STR+DEX as its Basic Percentage (Core p.12); the GM defines its weapons and setting context.</li>'
  +'<li><b>Armour Penalty to Initiative</b> (p.58, confirmed against page image): total the ENC of every location of armour worn (full, not halved), divide by 5, round up, subtract from Initiative Bonus. Shown on the Sheet step next to Initiative and in the Armour card.</li>'
  +'<li><b>Quick Character</b> (Character Creation Workbook, Attribute Summary): a single 100-point pool spent across all Standard Skills, three chosen Professional Skills, and an optional Combat Style, replacing the Culture/Career/Bonus pipeline entirely. 5&ndash;15 points on any skill you invest in (0 is fine for the rest &mdash; with 20+ eligible skills, a mandatory 5 on literally every one wouldn&rsquo;t fit in 100 points). Characteristics still use the normal roll or 80-point build; there&rsquo;s no per-culture money multiplier in this mode, so enter one manually on the Money &amp; Gear step.</li>'
  +'<li><b>Pulp Hero &amp; Paragon</b> (Mythras Companion, &ldquo;Pyramids, Pulp, &amp; Paragons&rdquo;, pp.54&ndash;55, verified against page scans): different characteristic dice/point pools, 2 or 3 non-stacking Advantages, and extra Bonus Skill Points at a higher per-skill cap (Pulp +50 pts/20% cap, Paragon +100 pts/40% cap). <b>Quirk:</b> the book&rsquo;s Paragon bonus-points line is literally labelled &ldquo;Heroic characters&rdquo; rather than &ldquo;Paragon characters&rdquo; &mdash; preserved as printed.</li>'
  +'<li>Grade-easier Advantages (Endurance/Stealth/Willpower) are flagged on the Attributes step rather than converted into a flat percentage, since Mythras Grades are a situational roll modifier, not a skill bonus &mdash; baking in a number would be a guess, not a rule.</li>'
  +'<li>The doubled Healing Rate for Pulp/Paragon (Minor or Serious Wounds only, Major Wounds unaffected) is noted next to Healing Rate rather than computed, since automatic recovery also requires knowing the treatment history.</li>'
  +'<li><b>Difficulty Grade</b> (core rulebook, Skills chapter, p.38, confirmed against page image): Very Easy doubles the skill, Easy adds half again, Standard is unchanged, Hard cuts it by a third, Formidable halves it, Herculean drops it to a tenth; Automatic needs no roll and Hopeless allows none. The selector on the Sheet step applies this to every skill % and to the roll button. Rounding direction isn&rsquo;t specified in the book for this table, so results are rounded to the nearest whole percent.</li>'
  +'<li><b>Cult &amp; Community</b> (Cults &amp; Brotherhoods chapter, pp.196&ndash;200, confirmed against page images): the five organisation types (Theist Cult, Animist/Spirit Cult, Sorcery Order, Mystical Order, Brotherhood) and their rank titles &mdash; Common/Dedicated/Proven/Overseer/Leader &mdash; are the book&rsquo;s own, as are the per-rank Requirements (years of membership + a minimum number of cult skills at a minimum %) and Training Discount (0/25/50/75/100%). <b>Correction:</b> rank does not grant a flat skill % bonus &mdash; an earlier pass invented that mechanic; it has been removed. What stays intentionally setting-specific, per the book&rsquo;s own design (cults are meant to be campaign-defined), is which nine archetypes exist for Sit&#39;ota, their names/blurbs, and which skill each one teaches.</li>'
  +'<li><b>Encumbrance</b> (core rulebook, Encumbrance section, confirmed against page image): unencumbered up to STR&times;2. Over STR&times;2 (&ldquo;Burdened&rdquo;): STR/DEX-based skills, including Combat Styles, are one Grade harder, Movement &minus;2m, no sprinting. Over STR&times;3 (&ldquo;Overloaded&rdquo;): two Grades harder, Movement halved, walk-only. STR&times;4 is a hard cap &mdash; flagged but not blocked by this tool. Worn armour counts at half its packed ENC toward these totals; carried (unworn) armour counts full ENC. <b>These penalties are now applied, not just described:</b> a skill counts as STR/DEX-based if its base formula contains STR or DEX (which is every Combat Style), and the Grade shift feeds the same <code>gradeForEntry()</code> the skill list, sheet, Play Mode and every roll button already use. Until this pass the warning text promised a penalty that never reached a roll.</li>'
  +'<li><b>Fatigue</b> (Fatigue Levels table). Each level sets an <i>absolute</i> Skill Grade for all rolls (Winded/Tired Hard, Wearied/Exhausted Formidable, Debilitated/Incapacitated Herculean, Semi-Conscious and beyond Hopeless), plus Movement, Initiative and Action Point penalties, and a Recovery Period that is divided by the character&rsquo;s Healing Rate. All of it is applied automatically now; the track used to be a picker that stored a string and changed nothing. Because the table states a grade rather than a shift, Fatigue acts as a <i>floor</i> on difficulty and takes the harsher of itself and any Encumbrance shift, rather than stacking with it &mdash; the book gives no stacking rule, and summing them would be an invention. Table transcribed from the <a href="https://srd.mythras.net/" target="_blank" rel="noopener">Mythras Imperative SRD</a>, published by The Design Mechanism under the ORC License, which reproduces the core rulebook&rsquo;s own Fatigue table.</li>'
  +'<li><b>Age bands</b> (Experience Table, &ldquo;Creating Experienced Characters&rdquo;). Age was free text with no mechanical effect; it now sets the Bonus Skill Points pool and the per-skill cap &mdash; Young 100/+10, Adult 150/+15, Middle Aged 200/+20, Senior 250/+25, Old 300/+30 &mdash; with the age dice (10+1d6 up to 60+5d6) rollable. Adult is 150/+15, exactly what the app previously hardcoded, so a default character is unaffected. Composing this with the character tiers: the Pulp/Paragon extra points are additive, and for the cap an <i>Ordinary</i> character simply takes their age band&rsquo;s (the tier table&rsquo;s 15 is not a permission, it is just the Adult row restated), while Pulp and Paragon genuinely raise the ceiling and so take whichever of the two caps is more generous. The table carries no characteristic modifiers for age &mdash; a common assumption from other d100 games, but not something this table does &mdash; so none are applied. Transcribed from the <a href="https://srd.mythras.net/" target="_blank" rel="noopener">Mythras Imperative SRD</a> (The Design Mechanism, ORC License).</li>'
  +'<li><b>Life events are house content and are labelled as such in the app.</b> Core p.18 contains an official Background Events table, with age-based rolls on p.34. This optional house-event generator is separate from that table. Rather than invent a table and present it as rules, the generator is an openly-flagged backstory prompt &mdash; but every event carrying a mechanical consequence applies it through a system the app already models correctly (a Passion at its proper book-derived starting value, an inventory row, or a percentage change to starting silver that scales with culture and social class). No new mechanic is invented, and every result stays editable.</li>'
  +'<li><b>Height &amp; Weight:</b> human height ranges and the three body-frame weight ranges use the verified Core p.9 table. The midpoint is a convenience; choose the actual values within the range (p.10). Manual overrides are retained. Legacy non-human estimates are not Core creature tables.</li>'
  +'<li><b>Non-human species.</b> Picking a species on the Concept step swaps in that species&rsquo; characteristic dice (which drive the roller, the Points Build bounds and the pool), its Movement Rate, and its racial traits; everything downstream &mdash; Culture, Career, skills, Attributes, Hit Points &mdash; runs unchanged, which is how the rules handle it. The Racial Characteristics Table, Movement Rates and racial special rules come from the <a href="https://cfi-srd.mythras.net/" target="_blank" rel="noopener">Classic Fantasy Imperative SRD</a> (The Design Mechanism, ORC License) &mdash; the same engine, and the only open Mythras-family source for playable non-human dice. Its Human row is identical to core Mythras (3d6 / 2d6+6), which is the cross-check that the two agree. <b>Two seams worth knowing:</b> (1) Points Build keeps the core rulebook&rsquo;s flat 80/90/100 pool for humans but uses the species rules&rsquo; &ldquo;racial averages + 6&rdquo; for demi-humans, because a flat 80 would put a dwarf below its own species average; (2) CFI&rsquo;s &ldquo;humans get +1 Luck Point&rdquo; balance perk is <i>not</i> applied, since it is a Classic Fantasy rule rather than core Mythras and would silently inflate every human character. Racial traits are all situational Grade shifts or narrative rules, so they are recorded on the sheet rather than folded into a percentage &mdash; the same treatment the Pulp/Paragon Grade-easier Advantages already get.</li>'
  +'<li><b>Movement Rate</b> was hardcoded as the string &ldquo;6m&rdquo; in five places. It now comes from the species template (core: &ldquo;Movement is not calculated from Characteristics but is a default value which differs from species to species. The base Movement Rate for humans is 6 metres&rdquo;) and is reduced by Fatigue and Encumbrance. Gaits are Walk / Run &times;3 / Sprint &times;5; sprinting is lost while Burdened and everything above a walk while Overloaded.</li>'
  +'<li><b>Magic.</b> The app has always had the magic <i>skills</i>; the Magic step is where a caster now gets magic to spend them on, castable from Play Mode with the tradition&rsquo;s own skill rolled through the same Difficulty Grade pipeline as everything else and the cost taken from the right pool. <b>Core-first magic:</b> the unverified Imperative spell catalogue is removed. Record Core-verified magic with your GM; consult Core pp.121&ndash;129 for Folk Magic details. <b>Theism, Sorcery, Animism and Mysticism content is deliberately absent:</b> the miracle lists, grimoires, spirit rosters and talents are Reserved Material in the core rulebook, this repo has no verified transcription of any of them, and fabricating spell lists would be far worse than a stated gap. What ships for those four is partial tracking support, requiring GM adjudication &mdash; Theism&rsquo;s Devotional Pool invoked with Exhort, Sorcery&rsquo;s per-component Shaping point and Combine cost tracker (GM confirms legal point limits and effects), Animism&rsquo;s bound spirits with their own POW and CHA, Mysticism&rsquo;s Talents &mdash; with you entering the magic your own rulebook and GM allow.</li>'
  +'<li><b>Historical ORC attribution.</b> Earlier project versions contained Imperative-derived text, including a Folk Magic catalogue that has now been removed. The provenance of any remaining tables must be audited before publication: the Racial Characteristics Table, Movement Rates and racial traits from <i>Classic Fantasy Imperative</i>. Both are published by The Design Mechanism under the ORC License. Based on Mythras Imperative, written by Pete Nash and Lawrence Whitaker, published by The Design Mechanism, Copyright 2023. Mythras and Classic Fantasy, published by The Design Mechanism, are Reserved Material under that licence and are not reproduced here.</li>'
  +'</ul></div></details>';
}

