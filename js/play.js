"use strict";
/* ================= PLAY MODE ================= */
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
function charVitals(state){
  state=state||S;
  const c=state.chars;
  const locs=PLAY_HP_LOCS.map(loc=>{
    const key=PLAY_LIMB_BASE[loc]||loc;
    const row=hpLocsFinal(c.CON,c.SIZ).find(x=>x[0]===key);
    const max=row?row[1]:0;
    let v=state.play.hp[loc];
    if(v==null){
      // One-time migration path: earlier saves tracked "Each Arm"/"Each Leg"
      // as a single shared current-HP pool. If this specific side hasn't
      // taken damage yet under the new 7-box keys, inherit that old shared
      // value instead of silently snapping the limb back to full HP.
      const legacyKey=PLAY_LIMB_BASE[loc];
      if(legacyKey&&state.play.hp[legacyKey]!=null)v=state.play.hp[legacyKey];
    }
    const cur=v==null?max:Math.min(v,max);
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
  const maxLuck=luckFinal(c.POW), curLuck=state.play.luck==null?maxLuck:Math.min(state.play.luck,maxLuck);
  const maxMagic=c.POW, curMagic=state.play.magic==null?maxMagic:Math.min(state.play.magic,maxMagic);
  const fatigue=state.play.fatigue||"Fresh";
  // Fatigue's Action Point column is a real penalty off the maximum (-1 at
  // Exhausted, -2 Debilitated, -3 Incapacitated, no actions at all beyond
  // that), applied here rather than in apFinal() so the character sheet keeps
  // reporting the character's own rested AP while Play Mode reports what they
  // can actually spend this round. Never drops below 0.
  const fRow=FATIGUE_MAP[fatigue]||FATIGUE_MAP.Fresh;
  const baseAP=apFinal(c.INT,c.DEX,state.fixedAP);
  const maxAP=fRow.act===false?0:Math.max(0,baseAP+(fRow.ap||0));
  const apUsed=Math.min(state.play.apUsed||0,maxAP);
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
    return "Serious Wound: permanently scarred; can't attack or start casting for 1d3 rounds (can still parry/evade). "
      +(isLimb
        ? "Endurance test vs the attacker's roll or the limb goes useless until healed above 0 (leg: drop prone; arm: drop whatever it's holding)."
        : "Endurance test vs the attacker's roll or you're knocked out for minutes equal to the damage just taken.")
      +" Until healed back to Minor, all tasks using this location suffer a one-grade penalty at the GM's discretion.";
  }
  return "Major Wound: immediately incapacitated, can't keep fighting. "
    +(isLimb
      ? "Limb is severed/shattered/ripped off — you drop prone; Endurance test vs the attack roll or you black out from the agony; untreated within 5× Healing Rate minutes, you die of blood loss."
      : "Endurance test vs the attack roll or it's instant, gruesome death; even if you pass, untreated within 2× Healing Rate rounds you still die of blood loss.")
    +" Needs surgery or major magic to ever heal properly.";
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
function fatigueRecoveryText(){
  const r=fatigueRow();const mins=FATIGUE_RECOVERY_MINUTES[r.name];
  if(!mins)return r.name==="Dead"?"Never.":"No rest needed.";
  const hr=charsReady()?Math.max(1,healRate(S.chars.CON)):1;
  const t=mins/hr;
  const txt=t<60?(Math.round(t)+" minutes"):((Math.round(t/6)/10)+" hours");
  return txt+" of complete rest to shed this level ("+r.recovery+" ÷ Healing Rate "+hr+").";
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
    const armLoc=PLAY_LIMB_BASE[loc]||loc;
    return '<g class="bz'+(cls!=="ok"?" "+cls:"")+(sel?" sel":"")+'" onclick="APP.playSelectLoc(\''+loc+'\')" role="button" tabindex="0" aria-label="'+loc+'">'
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
    const armLoc=PLAY_LIMB_BASE[loc]||loc,ap=armorApAt(armLoc);
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
  const armLoc=PLAY_LIMB_BASE[loc]||loc,ap=armorApAt(armLoc);
  const sel=S.play.selectedLoc===loc;
  return '<div class="pm-locrow st-'+st+(sel?' sel':'')+'" onclick="APP.playSelectLoc(\''+loc+'\')" role="button" tabindex="0">'
   +'<span class="dot" style="background:'+pmZoneFill(loc)+'"></span>'
   +'<span class="nm">'+pmShortName(loc)+'</span>'
   +'<span class="ap" title="AP '+ap+' — '+esc(S.armor[armLoc]||"None")+'">'+PM_SHIELD_SVG+ap+'</span>'
   +'<span class="hp">'+cur+'<span>/'+max+'</span></span></div>';
}
function pmLocDetail(){
  const loc=S.play.selectedLoc;
  if(!loc)return '<div class="pm-locdetail"><p class="pm-empty">Click a body location for details and damage controls.</p></div>';
  const cur=playCurHP(loc),max=playMaxHP(loc),st=playHPState(loc);
  const armLoc=PLAY_LIMB_BASE[loc]||loc;
  const idv="playdmg-"+loc.replace(/\s+/g,"_");
  return '<div class="pm-locdetail">'
   +'<div class="dt"><b>'+esc(loc)+'</b><span class="d20">d20: '+hitD20For(loc)+'</span></div>'
   +'<div class="arm">'+esc(S.armor[armLoc]||"None")+' &mdash; AP '+armorApAt(armLoc)+'</div>'
   +'<div class="hpline">'+cur+' <span>/ '+max+' HP</span><span class="pm-woundtag '+st.cls+'">'+st.tag+'</span></div>'
   +'<div class="fx">'+esc(playWoundEffectText(loc,st.cls))+'</div>'
   +'<div class="dctl">'
   +'<button class="pm-sbtn dmg" onclick="APP.playQuickDamage(\''+loc+'\',1)">&minus;1</button>'
   +'<button class="pm-sbtn dmg" onclick="APP.playQuickDamage(\''+loc+'\',3)">&minus;3</button>'
   +'<input type="number" id="'+idv+'" placeholder="amt" min="0">'
   +'<button class="pm-sbtn dmg" onclick="APP.playDamage(\''+loc+'\')">&minus;dmg</button>'
   +'<button class="pm-sbtn" onclick="APP.playHeal(\''+loc+'\')">+heal</button>'
   +'<button class="pm-sbtn" onclick="APP.playSetHP(\''+loc+'\','+max+')">full</button>'
   +'</div></div>';
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
function pmVitalsCard(){
  const totCur=PLAY_HP_LOCS.reduce((a,l)=>a+Math.max(0,playCurHP(l)),0);
  const totMax=PLAY_HP_LOCS.reduce((a,l)=>a+playMaxHP(l),0);
  const worstRank={ok:0,minor:1,serious:2,major:3};
  const worst=PLAY_HP_LOCS.reduce((w,l)=>{const st=playHPState(l).cls;return worstRank[st]>worstRank[w]?st:w;},"ok");
  const worstLoc=PLAY_HP_LOCS.find(l=>playHPState(l).cls===worst);
  const worstTag={ok:"OK",minor:"Minor Wound",serious:"Serious Wound",major:"Major Wound"}[worst];
  const barColor=worst==="major"?"var(--pm-bad)":worst==="serious"?"var(--pm-warn)":worst==="minor"?"var(--pm-minor)":"var(--pm-good)";
  // Literal .sect-head/.ghost/.stamp from playmode-restyle-D.html — the
  // mockup's condition indicator is ONLY this rotated stamp pinned over the
  // plate (no small header badge), so it always renders, colour-coded by
  // wound tier (ok gets a muted ink/green treatment rather than red, since
  // red should read as "something's wrong" the way it does everywhere else
  // on this sheet).
  let h='<div class="pm-box" id="pm-vitals" style="height:100%">'
   +'<div class="pm-sect-head"><span class="no">02</span> VITALS — FIG. 1, THE BODY</div>'
   +'<div class="pm-ghost">02</div>'
   +'<div class="pm-stamp '+worst+'" title="'+esc(playWoundEffectText(worstLoc,worst))+'">'+worstTag+'</div>';
  h+='<div class="pm-vit-total"><span class="lbl">Total HP</span><div class="pm-totbar"><i style="width:'+(totMax>0?Math.max(0,Math.min(100,totCur/totMax*100)):0)+'%;background:'+barColor+'"></i></div>'
   +'<span class="num">'+totCur+' <span>/ '+totMax+'</span></span></div>';
  h+='<div class="pm-vit-body">'+pmBodySvg()+'<div class="pm-loclist">'+PLAY_HP_LOCS.map(pmLocRow).join("")+'</div></div>';
  h+='<div class="pm-legend"><span>Healthy</span><div class="pm-legendgrad"></div><span>Major Wound</span></div>';
  h+=pmLocDetail();
  h+='</div>';
  return h;
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
  const c=S.chars;
  const order=["STR","CON","SIZ","DEX","INT","POW","CHA"];
  const maxVal=Math.max.apply(null,order.map(k=>c[k]));
  let h='<div class="pm-rail-head"><span class="red">01</span> CHAR.</div>';
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
function pmTicker(){
  const c=S.chars,initPenalty=armourPenaltyToInit();
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
  const initFat=fRow.init||0;
  const initVal=initBonus(c.INT,c.DEX)-initPenalty+initFat;
  h+='<div class="pm-tk"><span class="k">Initiative</span><span class="v'+(initFat?" mod":"")+'" title="'
   +esc("Base "+initBonus(c.INT,c.DEX)+(initPenalty?", armour -"+initPenalty:"")+(initFat?", Fatigue ("+fRow.name+") "+initFat:""))+'">'+initVal+'</span></div>';
  h+='<div class="pm-tk"><span class="k">Heal Rate</span><span class="v">'+healRate(c.CON)+'</span></div>';
  const mv=moveRate(),gaits=moveGaits();
  h+='<div class="pm-tk"><span class="k">Move</span><span class="v'+(mv.m!==mv.base?" mod":"")+'" title="'
   +esc((mv.notes.length?mv.notes.join("; ")+". ":"Base "+mv.base+"m. ")
     +"Walk "+gaits.walk+"m"+(gaits.run?", Run "+gaits.run+"m":", Run unavailable")+(gaits.sprint?", Sprint "+gaits.sprint+"m":", Sprint unavailable"))+'">'
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
function pmCombatSection(){
  let h='<div class="pm-box"><div class="pm-sect-head bar"><span class="no">04</span> COMBAT</div>';
  // Which of this character's Combat Styles (if any) cover a given weapon —
  // built on the Combat Styles card, shown here so it's actually usable at
  // the table instead of sitting inert in character data.
  const stylesFor=n=>stylesList().filter(s=>styleDef(s.key).weapons.includes(n)).map(s=>s.name);
  if(S.gearWeapons.length){
    h+=S.gearWeapons.map(n=>{const w=WEAPON_MAP[n];if(!w)return"";
      const meta=(w.group==="Ranged"
        ?"RANGE "+esc(w.range||"—")+" &middot; LOAD "+esc(String(w.load||"—"))+(String(w.load).match(/^\d+$/)?"AP":"")
        :"SIZE "+esc(w.size||"—")+" &middot; REACH "+esc(w.reach||"—"))
       +" &middot; AP/HP "+esc(w.apHp||"—")
       +(w.effects&&w.effects!=="—"?" &middot; "+esc(w.effects).toUpperCase():"");
      const inStyle=stylesFor(n);
      return '<div class="pm-wpn"><div class="top"><span class="nm">'+esc(w.name)+'</span><span class="dmg">'+esc(w.dmg)+'</span></div>'
       +'<div class="meta">'+meta+'</div>'
       +(inStyle.length?'<div class="meta">'+esc(inStyle.join(", "))+'</div>':'')+'</div>';
    }).join("");
  }else h+='<p class="pm-empty">No weapons carried — add some on the Money &amp; Gear step.</p>';
  h+=pmFatiguePanel();
  h+='</div>';
  return h;
}
// Fatigue, with its actual mechanical consequences spelled out and applied.
// Previously a bare picker whose only effect was to store a string.
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
    h+='<div class="pm-fatfx">'+bits.join("")+'<span class="pm-fatrec">'+esc(fatigueRecoveryText())+'</span></div>';
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
// [name, offensive, defensive, weapon restriction, specific roll requirement, stackable, description]
const SPECIAL_EFFECTS=[
["Accidental Injury",0,1,"","Attacker Fumbles",0,"The defender deflects or twists the attack so it fumbles, injuring the attacker instead. Roll damage against the attacker in a random hit location using the weapon used to strike; if unarmed, it's an internal injury that ignores armour."],
["Arise",0,1,"","",0,"Lets the defender use a momentary opening to roll back up onto their feet."],
["Bash",1,0,"Shields or Bludgeoning","",0,"Bashes the opponent off balance. Shields knock them back 1m per 2 points of damage rolled (before reductions); bludgeoning weapons knock back 1m per 3 points. Forced backward into an obstacle: Hard Athletics/Acrobatics roll or fall/trip."],
["Bleed",1,0,"Cutting Weapons","",0,"Attacker opens a major vessel. If the blow overcomes Armour Points and wounds the target, the defender makes an opposed Endurance roll vs the original attack roll or starts bleeding: loses 1 HP from that location each round until staunched with a First Aid roll, and can't do anything strenuous or violent without reopening it."],
["Blind Opponent",0,1,"","Defender Criticals",0,"On a critical, the defender briefly blinds the attacker (thrown sand, a mirror-flash off a shield, etc). The attacker must win an opposed Evade (or Weapon style if using a shield) vs the defender's original parry roll, or suffer the Blindness penalty for the next 1d3 turns."],
["Bypass Armour",1,0,"","Attacker Criticals",1,"On a critical, the attacker finds a gap in the defender's armour. If the defender has both natural and worn armour, the attacker chooses which is bypassed — this can be stacked to bypass both. Magical protection counts as worn armour."],
["Choose Location",1,0,"","See Description",0,"With hand-to-hand weapons the attacker may freely pick the hit location within reach. With ranged weapons this needs a Critical, unless the target is at Close Range and either stationary or unaware of the attacker."],
["Circumvent Cover",1,0,"Ranged Weapons","",0,"Lets the shooter fire around or through the target's cover — a trick shot such as a ricochet, requiring a Critical for anything beyond a modest reduction in the cover's protection."],
["Circumvent Parry",1,0,"","Attacker Criticals",0,"On a critical, the attacker completely bypasses an otherwise-successful parry."],
["Close Range",1,1,"","",0,"Automatically changes the engagement range between the two combatants so they end up at the range favoured by the shorter weapon. Under the optional Closing & Opening Range rule (p.106, see the note above), closing inside a longer weapon's Reach also negates that weapon's ability to parry and drops its effective blocking Size by two categories until the range changes again."],
["Compel Surrender",1,1,"","",0,"Forces the chance of surrender from a helpless or disadvantaged opponent (disarmed, prone and unable to regain footing, seriously — or worse — wounded, and so on). The target makes an opposed Willpower roll vs the original attack/parry roll or capitulates. GMs may wish to reserve this for NPCs only."],
["Damage Weapon",1,1,"","",0,"Permits the character to damage the opponent's weapon as part of an attack or parry, applying the damage roll to the targeted weapon rather than its wielder. The weapon uses its own Armour Points to resist; reduced to zero Hit Points, it breaks."],
["Disarm Opponent",1,1,"","",0,"Knocks, yanks, or twists the opponent's weapon out of their hand. The opponent must make an opposed roll of their Combat Style against the character's original roll; if they lose, the weapon is flung a distance equal to the disarmer's Damage Modifier in metres (or drops at their feet with no Damage Modifier). Relative weapon size shifts the roll's difficulty grade. Only works on creatures up to twice the attacker's STR."],
["Drop Foe",1,0,"Ranged Weapons","",0,"Assuming the target suffers at least a minor wound, they're forced into an opposed test of Endurance against the attacker's hit roll. Failure means they succumb to shock and pain, becoming incapacitated. First Aid or technological/narcotic aid can end incapacitation early; otherwise it lasts one hour divided by the target's Healing Rate."],
["Duck Back",1,0,"Ranged Weapons","",0,"Lets the shooter immediately duck back into cover, without needing to wait for their next Turn to use the Take Cover action. The character must already be standing or crouching adjacent to some form of cover."],
["Enhance Parry",0,1,"","Defender Criticals",0,"On a critical, the defender manages to deflect the entire force of an attack, no matter the Size of the weapon involved."],
["Entangle",1,1,"Entangling Weapons",0,1,"Immobilises the location struck with a whip, net, or similar. An entangled arm can't use whatever it's holding; a snared leg prevents movement; an entangled head, chest, or abdomen makes all skill rolls one grade harder. On their following turn the wielder may spend an Action Point to make an automatic Trip Opponent attempt. An entangled victim can try to free themselves with an opposed Brawn roll, or by winning a Special Effect and selecting Damage Weapon, Disarm Opponent, or Slip Free."],
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
["Pin Down",1,0,"Ranged Weapons","",0,"Similar to Press Advantage, this Special Effect forces the target to make an opposed Test of their Willpower against the attacker's hit roll. Failure means the target hunkers down behind whatever cover is available, and cannot return fire on their next Turn."],
["Pin Weapon",1,1,"","Critical Only",0,"On a critical the character can pin one of their opponent's weapons or shield, using their body or positioning to hold it in place. On their turn the opponent may attempt to wrestle or manoeuvre the pinned item free, costing an Action Point and working as per the Grip Special Effect. Failure means the pinned item remains unusable; in the meantime, the opponent lacking a weapon or shield in that hand may only avoid an attack by evading, using Unarmed skill, or disengaging completely."],
["Prepare Counter",0,1,"","",1,"The defender reads the patterns of their foe and pre-plans a counter against a specific Special Effect (which should be noted down in secret). If their opponent attempts to inflict the chosen Special Effect upon them during the fight, the defender instantly substitutes the attacker's effect with an offensive or defensive one of their own, which succeeds automatically."],
["Press Advantage",1,0,"","",0,"The attacker pressures their opponent, so that their foe is forced to remain on the defensive and cannot attack on their next turn. This allows the attacker to potentially establish an unbroken sequence of attacks while the defender desperately blocks. Only effective against foes concerned with defending themselves."],
["Rapid Reload",1,0,"","",1,"When using a ranged weapon, the attacker reduces the reload time for their next shot by one. This effect can be stacked."],
["Remise",1,0,"Small Weapon Only","",0,"The attacker performs a sequential follow-up attack with a weapon of Size Small on their opponent's next turn, which forces the foe to change their proactive action into a reactive one."],
["Scar Foe",1,1,"","",0,"The opponent is given a scar that will disfigure them for the rest of their life — for example, a slice across the face, or an artfully inscribed letter across the chest."],
["Select Target",0,1,"","Attacker Fumbles",0,"When an attacker fumbles, the defender may manoeuvre or deflect the blow in such a way that it hits an adjacent bystander instead. This requires that the new target be within reach of the attacker's close combat weapon, or in the case of a ranged attack, standing along the line of fire. The new victim is taken completely by surprise and has no chance to avoid the attack, which automatically hits — but in compensation, they suffer no Special Effect from it."],
["Slip Free",0,1,"","Defender Criticals",0,"On a critical, the defender can automatically escape being Entangled, Gripped, or Pinned."],
["Stand Fast",0,1,"","",0,"The defender braces themselves against the force of an attack, allowing them to avoid the Knockback effects of any damage received."],
["Stun Location",1,0,"Bludgeoning Weapons","",0,"The attacker can use a bludgeoning weapon to temporarily stun the body part struck. If the blow overcomes Armour Points and injures the target, the defender must make an opposed roll of Endurance vs the original attack roll. If the defender fails, the Hit Location is incapacitated for a number of turns equal to the damage inflicted. A blow to the head causes the defender to stagger, winded, only able to defend."],
["Sunder",1,0,"Axes, Two Handed Weapons","",0,"The attacker may use a suitable weapon to damage the armour or natural protection of an opponent. Any weapon damage, after reductions for parrying or magic, is applied against the Armour Points value of the protection. Surplus damage in excess of the Armour Points is then used to reduce the AP value of that armoured location — ripping straps, bursting rings, creasing plates, or tearing away scales/chitin. If any damage remains after the protection has been reduced to zero AP, it carries over to the Hit Points of the location struck."],
["Take Weapon",1,1,"Unarmed","",0,"Allows an unarmed character to yank or twist an opponent's weapon out of their hand. The opponent must make an opposed roll of their Combat Style against the character's original Unarmed roll. If the target loses, their weapon is taken and from that moment on may be used by the character instead. Take Weapon differs from Disarm Opponent in that the Size of the weapon is largely irrelevant. However, the technique only works on creatures of up to twice the attacker's STR."],
["Trip Opponent",1,1,"","",0,"The character attempts to overbalance or throw their opponent to the ground. The opponent must make an opposed roll of their Brawn, Evade, or Acrobatics against the character's original roll. If the target fails, they fall prone. Quadrupeds (or creatures with even more legs) may substitute their Athletics skill for Evade, and treat the roll as one difficulty grade easier."],
["Weapon Malfunction (Firearms)",1,0,"Ranged Weapons","Attacker Fumbles",0,"The attacker's weapon malfunctions in such a way that it is rendered useless until time can be spent repairing it."],
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
// Renders the "Special Effects" tab: the Differential Roll cheat-table
// (how many effects a given margin of success wins), an optional-rule note
// on Weapon Reach, and the full, book-accurate list of effects grouped by
// tactical intent (see FX_GROUPS above) rather than alphabetically — a new
// player thinking "I want to disarm them" can jump straight to the right
// handful. Each effect is collapsed behind a <details> so the tab isn't an
// intimidating wall of text; only the summary badges (Offensive/Defensive,
// weapon restriction, roll requirement, stackable) show until expanded.
function specialEffectsPanel(){
  let h='<p class="pm-notes" style="margin-bottom:10px">Whenever you and an opponent both roll an opposed Combat Style (or Combat Style vs Evade), the <b>margin</b> between your results — read off the table below — is how many Special Effects you win. Pick freely from anything you qualify for; some can be taken more than once (marked <b>stacks</b>). Losing the roll can hand your opponent effects the same way.</p>';
  h+='<table class="pm-atktable" style="margin-bottom:14px"><tr><th>You rolled</th><th>Opponent Critical</th><th>Opponent Success</th><th>Opponent Failure</th><th>Opponent Fumble</th></tr>'
   +["Critical","Success","Failure","Fumble"].map(mine=>'<tr><td><b>'+mine+'</b></td>'
     +["Critical","Success","Failure","Fumble"].map(theirs=>{const n=playEffectsWon(mine,theirs);
       return '<td>'+(n>0?'You win '+n:(n<0?'Opponent wins '+(-n):'No benefit'))+'</td>';}).join("")+'</tr>').join("")
   +'</table>';
  // Optional Reach rule callout, made concrete using this character's own
  // equipped melee/shield weapons where possible instead of just abstract
  // categories.
  const myReach=(S.gearWeapons||[]).map(nm=>WEAPON_MAP[nm]).filter(w=>w&&REACH_ORDER.includes(w.reach))
    .map(w=>w.name+" ("+REACH_NAME[w.reach]+")");
  h+='<details class="pm-fx-item" style="margin-bottom:14px"><summary>Optional Rule: Closing &amp; Opening Range <span class="pm-fx-badge">p.106</span></summary>'
   +'<p>Weapons have a Reach — Touch, Short, Medium, Long, or Very Long, shortest to longest ('+REACH_ORDER.map(r=>REACH_NAME[r]).join(" &lt; ")+') — shown on every melee weapon and shield on your character sheet. Before anyone swings, combatants can jockey for range:</p>'
   +'<p><b>Closing in</b> (the <i>Close Range</i> Special Effect, or simple GM-adjudicated positioning): moving inside a longer weapon’s Reach means that weapon can no longer parry, and its effective blocking Size drops by <b>two categories</b> for as long as the fight stays that close — a spear or halberd becomes clumsy up close against a dagger or shortsword.</p>'
   +'<p><b>Holding them off</b> (the <i>Open Range</i> Special Effect): keeping the fight at your weapon’s longer Reach means the shorter weapon can only attack <i>your weapon itself</i> — trying to knock it aside, sunder it, grab it — not you, until they manage to close the distance.</p>'
   +(myReach.length?'<p class="pm-notes">Your weapons, shortest to longest reach: '+myReach.sort((a,b)=>REACH_ORDER.indexOf(WEAPON_MAP[a.split(" (")[0]]?.reach)-REACH_ORDER.indexOf(WEAPON_MAP[b.split(" (")[0]]?.reach)).join(", ")+'.</p>':'')
   +'</details>';
  h+='<div class="pm-fx-list">'+FX_GROUPS.map(([groupName,names])=>{
    const items=names.map(n=>SPECIAL_EFFECTS.find(e=>e[0]===n)).filter(Boolean);
    return '<div class="pm-fx-group"><h4 class="pm-fx-grouphead">'+esc(groupName)+'</h4>'
     +items.map(([name,off,def,weapon,roll,stack,text])=>{
       const badges=[off?'<span class="pm-fx-badge off">Offensive</span>':"",def?'<span class="pm-fx-badge def">Defensive</span>':"",
         weapon?'<span class="pm-fx-badge">'+esc(weapon)+'</span>':"",roll?'<span class="pm-fx-badge roll">'+esc(roll)+'</span>':"",
         stack?'<span class="pm-fx-badge stack">Stacks</span>':""].join("");
       return '<details class="pm-fx-item"><summary>'+esc(name)+' '+badges+'</summary><p>'+esc(text)+'</p></details>';
     }).join("")+'</div>';
  }).join("")
   +(()=>{ // safety net: any effect not placed in a group above still shows up, so re-grouping can never silently hide one
     const grouped=new Set(FX_GROUPS.flatMap(([,names])=>names));
     const leftover=SPECIAL_EFFECTS.filter(e=>!grouped.has(e[0]));
     if(!leftover.length)return "";
     return '<div class="pm-fx-group"><h4 class="pm-fx-grouphead">Other</h4>'+leftover.map(([name,off,def,weapon,roll,stack,text])=>{
       const badges=[off?'<span class="pm-fx-badge off">Offensive</span>':"",def?'<span class="pm-fx-badge def">Defensive</span>':"",
         weapon?'<span class="pm-fx-badge">'+esc(weapon)+'</span>':"",roll?'<span class="pm-fx-badge roll">'+esc(roll)+'</span>':"",
         stack?'<span class="pm-fx-badge stack">Stacks</span>':""].join("");
       return '<details class="pm-fx-item"><summary>'+esc(name)+' '+badges+'</summary><p>'+esc(text)+'</p></details>';
     }).join("")+'</div>';
   })()
   +'</div>';
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
   +'<span class="r">'+r.tier+'</span>';
  // Shown for every combat roll, not just Criticals/Successes — a Failure
  // or Fumble can still hand the *opponent* Special Effects off the same
  // Differential Roll table, so a new player needs to see that too, not
  // just when they themselves won.
  if(r.combat){
    if(!r.oppTier){
      row+='<div class="pm-fx-resolve">Opponent rolled: '+["Critical","Success","Failure","Fumble"].map(t=>
        '<button class="pm-btn sm" onclick="APP.playSetOpponentTier('+i+',\''+t+'\')">'+t+'</button>').join("")+'</div>';
    }else{
      const n=playEffectsWon(r.tier,r.oppTier);
      row+='<div class="pm-fx-resolve">'+(n>0?'vs opponent '+r.oppTier+' &rarr; <b>you win '+n+' Special Effect'+(n>1?"s":"")+'</b> — pick from the Special Effects tab.'
        :n<0?'vs opponent '+r.oppTier+' &rarr; <b>opponent wins '+(-n)+' Special Effect'+(-n>1?"s":"")+'</b> against you.'
        :'vs opponent '+r.oppTier+' &rarr; no Special Effects either way.')+'</div>';
    }
  }
  return row+'</div>';
}
function renderPlayView(){
  document.body.classList.remove("menu-mode");
  document.body.classList.add("play-mode");
  document.body.classList.toggle("view-only",VIEW_ONLY);
  document.title=(S.concept.name?S.concept.name+" — ":"")+"Play Mode";
  if(!charsReady()){
    $("#main").innerHTML='<div class="pm-wrap"><p><button class="pm-btn" onclick="APP.backFromPlay()">&#8592; Edit Character</button></p>'
     +'<p class="pm-empty" style="margin-top:14px">Finish Characteristics first &mdash; Play Mode needs those numbers to work from.</p></div>';
    return;
  }
  const c=S.chars;
  const name=S.concept.name||"Unnamed Character";
  const careerName=S.customCareer.isCustom?S.customCareer.name:S.career;
  const initPenalty=armourPenaltyToInit();
  const tab=S.play.tab||"actions";

  let h='<div class="pm-wrap">';

  // ---- literal masthead, ported from playmode-restyle-D.html: a slim
  // utility bar for the real nav/action buttons (D has no equivalent —
  // these are genuinely necessary live controls, so they're kept as a
  // plain bar above the masthead rather than crammed into it), then the
  // black barcode-tick top rule, the split solid/outline name, and a
  // dateline row. D's dateline is a fabricated "No. 042 · Season of Fire ·
  // Round 3" — there's no live equivalent for an edition number or combat
  // round, so that's replaced with the character's real culture/career/
  // archetype line instead of inventing session/round data.
  const backLabel=(VIEW_ONLY||PLAY_RETURN_VIEW==="board")?"&#8592; Back to Party Board":"&#8592; Edit Character";
  h+='<div class="pm-utilbar"><button class="pm-btn" onclick="APP.backFromPlay()">'+backLabel+'</button>'
   +(VIEW_ONLY?"":'<button class="pm-btn" onclick="APP.toSheet(\'play\')" title="View / print the full character sheet">Print Sheet</button>')
   +(VIEW_ONLY?"":'<button class="pm-btn" onclick="APP.openXP()" title="Experience Rolls — improve skills between sessions">Improve Skills'
     +(S.xp.pool?' <span class="pm-xpbadge">'+S.xp.pool+'</span>':'')+'</button>')
   +'</div>';
  if(VIEW_ONLY){
    h+='<div class="pm-viewonly-banner">Viewing '+esc(VIEW_ONLY_OWNER_NAME||"a teammate")+'&rsquo;s character &mdash; read-only'
     +(VIEW_ONLY_IS_DM?', except Inventory (as DM you can edit loot/gear here).':'. Only they can change it.')+'</div>';
  }
  const nameParts=name.trim().split(/\s+/);
  const firstName=nameParts.length>1?nameParts.slice(0,-1).join(" "):nameParts[0];
  const surname=nameParts.length>1?nameParts[nameParts.length-1]:"";
  // literal 3-part .mast-top from D: barcode+brand (left) · "VOL. II — PLAY
  // MODE" (center) · red issue no. + season/round (right). The issue/season/
  // round text is D's own fabricated flavour copy, not live character data —
  // per instruction it's fine to keep as a fixed stylistic constant rather
  // than strip it just because there's no real round tracker.
  h+='<div class="pm-mast">';
  h+='<div class="pm-mast-top"><span><span class="pm-barcode"></span>MYTHRAS CHARACTER FORGE</span>'
   +'<span>VOL. II &mdash; PLAY MODE</span>'
   +'<span><span class="red">No. 042</span> &middot; SEASON OF FIRE &middot; ROUND 3</span></div>';
  h+='<h1 class="pm-mast-name">'+esc(firstName)+(surname?' <span class="outline">'+esc(surname)+'</span>':'')+' <span class="fin">&#9646;</span></h1>';
  // dateline: left = bold epithet chain (culture/career/archetype) with red
  // "/" separators, matching D's "Barbarian/Hunter/Wolf-Brother..." line;
  // right = a real derived STANDING readout instead of D's fixed "WOUNDED —
  // L.LEG · ACTION PHASE" (ACTION PHASE is dropped — no round/phase state
  // to report).
  const epithetParts=[S.culture,careerName,S.archetype!=="ordinary"?ARCHETYPES[S.archetype].label:null].filter(Boolean);
  h+='<div class="pm-dateline"><span>'+(epithetParts.length?epithetParts.map(e=>esc(e).toUpperCase()).join('<span class="sep">/</span>'):"UNAFFILIATED")+'</span>'
   +'<span class="right">'+pmStandingText()+'</span></div>';
  h+='</div>';

  h+=pmTicker();

  // ---- literal 4-column sheet grid from D: 01 rail (characteristics) ·
  // 02 vitals · 03 skills · 04 combat/actions/log.
  h+='<div class="pm-columns">';

  h+='<div class="pm-col pm-col-rail">'+pmCharacteristicRail()+'</div>';
  h+='<div class="pm-col pm-col-vitals">'+pmVitalsCard()+'</div>';

  const styles=stylesList().map(s=>{const base=finalPct(s.key);const g=gradedPct(s.key,base);return {name:s.name,pct:g.pct===null?GRADE_LABEL[g.grade]:g.pct+"%"};});

  // -- col 3: one continuous scrollable skills list, ghost "03" behind the head --
  const es=allEntries();
  const grp=g=>es.filter(e=>e.grp===g).sort((a,b)=>a.label.localeCompare(b.label));
  const skrow=e=>{
    const base=finalPct(e.key);const g=gradedPct(e.key,base);
    // literal .sk row from D: bare numeral (no "%"), a gray mono base-
    // formula caption (STR+DEX etc, "x2" normalised to "×2"), and a dotted
    // .lead line — no trained/untrained bullet dot, the mockup has none.
    const pctTxt=g.pct===null?GRADE_LABEL[g.grade]:String(g.pct);
    const cbt=e.grp==="Combat Style";
    const baseFmt=(e.formula||"").replace(/x(\d)/i,"×$1").toUpperCase();
    return '<div class="pm-skillrow'+(cbt?" cbt":"")+'">'
     +'<span class="nm">'+esc(e.label)+'</span>'
     +(baseFmt?'<span class="base">'+esc(baseFmt)+'</span>':'')
     +'<span class="lead"></span>'
     +'<span class="pctval" onclick="APP.toggleGradePop(\''+jsq(e.key)+'\',\''+jsq(e.label)+'\',event)" title="Click for Difficulty Grades">'+pctTxt+'</span>'
     +'<button class="pm-btn roll" onclick="APP.roll(\''+jsq(e.key)+'\')">roll</button></div>';
  };
  h+='<div class="pm-col pm-col-skills"><div class="pm-box pm-skillsbox" style="height:100%">'
   +'<div class="pm-sect-head" title="Difficulty Grade multiplies every skill % before you roll — the GM calls a harder or easier Grade for the situation, not a fixed penalty per attempt. Very Easy x2 · Easy x1.5 · Standard x1 · Hard x2/3 · Formidable x1/2 · Herculean x1/10 · Automatic/Hopeless skip the roll entirely."><span class="no">03</span> SKILLS'+(ACTIVE_GRADE!=="standard"?' <span class="pm-gradenote">('+GRADE_LABEL[ACTIVE_GRADE]+')</span>':"")+'</div>'
   +'<div class="pm-ghost">03</div>';
  h+='<div class="pm-skillgroup"><h4>Standard</h4>'+grp("Standard").map(skrow).join("")+'</div>';
  h+='<div class="pm-skillgroup"><h4>Professional</h4>'+(grp("Professional").length?grp("Professional").map(skrow).join(""):'<p class="pm-empty">None.</p>')+'</div>';
  if(grp("Magic").length)h+='<div class="pm-skillgroup"><h4>Magic</h4>'+grp("Magic").map(skrow).join("")+'</div>';
  if(grp("Combat Style").length)h+='<div class="pm-skillgroup"><h4>Combat Styles</h4>'+grp("Combat Style").map(skrow).join("")+'</div>';
  h+='</div></div>';

  // -- col 4: 04 Combat (weapons + fatigue), tabbed section, press log --
  h+='<div class="pm-col pm-col-right">';
  h+=pmCombatSection();

  const tabs=[["actions","Actions"],["effects","Special Effects"],["inventory","Inventory"],["features","Features"],["notes","Notes"]];
  h+='<div class="pm-box" style="padding:0;overflow:hidden"><div class="pm-tabs" style="padding:0 14px;margin-top:2px">'+tabs.map(([k,l])=>'<button class="pm-tabbtn '+(tab===k?"on":"")+'" onclick="APP.playTab(\''+k+'\')">'+l+'</button>').join("")+'</div>';
  h+='<div class="pm-tabpanel" style="border:none;border-radius:0">';
  if(tab==="actions"){
    // Weapon-by-weapon hit/damage now lives permanently in the 04 Combat
    // section (col 4 top), matching D's own division of "the numbers" vs
    // "the actions" into separate blocks. This tab carries the real,
    // clickable Action Point cost list (.pm-act) — every cost below was
    // re-verified against the core rulebook's Combat Actions breakdown
    // (Proactive Actions p.91-92, Reactive Actions p.92-93, Change Range
    // p.106, Grapple p.106, Reload table p.109) rather than trusted from
    // the previous pass, which had Parry/Evade/Disengage wrong as "Free".
    // Clicking a row spends its AP from the live pool below; "New Round"
    // resets AP to max the way a fresh Combat Round does in play.
    const styleTxt=styles.length?styles.map(s=>esc(s.name)+" "+s.pct).join(", "):"No combat style yet";
    h+='<p class="pm-notes" style="margin-bottom:10px">Combat Styles: '+styleTxt+'</p>';
    const maxAPnow=playMaxAP(),usedAPnow=Math.min(S.play.apUsed,maxAPnow),remainAPnow=maxAPnow-usedAPnow;
    const reloadWeaponName=(S.gearWeapons||[]).find(n=>WEAPON_MAP[n]&&WEAPON_MAP[n].group==="Ranged"&&typeof WEAPON_MAP[n].load==="number");
    const reloadCost=reloadWeaponName?WEAPON_MAP[reloadWeaponName].load:null;
    const ACTIONS=[
      {nm:"Attack",ap:1,note:"Proactive · core rules p.91"},
      {nm:"Cast a Spell",ap:1,note:"Proactive, Cast Magic · p.91"},
      {nm:"Change Combat Stance",ap:1,note:"= Change Range (close/open/disengage) · p.106 — “stance” isn’t a named action, this maps to the real Change Range action"},
      {nm:"Ready / Draw / Sheathe Weapon",ap:1,note:"Proactive, Ready Weapon · p.92"},
      {nm:"Reload Ranged Weapon",ap:reloadCost||1,note:reloadCost?("Proactive · Reload table p.109 — "+reloadWeaponName+" takes "+reloadCost+" AP"):"Proactive · p.109 — varies 1–4 AP by weapon (no ranged weapon equipped, defaulting to 1)"},
      {nm:"Full Move",ap:1,note:"Proactive, Move · p.91"},
      {nm:"Shove / Grapple",ap:1,note:"Not extra AP beyond an Attack — Grapple is declared as your Attack (Unarmed) action · p.106. “Shove” isn’t independently named in the core rules; closest analog is the Bash Special Effect."},
      {nm:"Parry",ap:1,note:"Reactive · p.93 — corrected from “Free”"},
      {nm:"Dodge / Evade",ap:1,note:"Reactive, Evade · p.41, p.103 — corrected from “Free”"},
      {nm:"Disengage",ap:1,note:"= Change Range, opening to beyond range · p.106 — corrected from “Free”"}
    ];
    h+='<div class="pm-actbar"><span class="apread">Action Points <b>'+remainAPnow+'</b> / '+maxAPnow+' remaining</span>'
     +'<button class="pm-newround" onclick="APP.playNewRound()" title="Reset Action Points to max for a new Combat Round">New Round</button></div>';
    h+='<div class="pm-actlist">'+ACTIONS.map(a=>{
      const canAfford=a.ap<=remainAPnow;
      return '<button class="pm-act" onclick="APP.playSpendAP('+a.ap+')" title="'+esc(a.note)+'"'+(canAfford?"":" disabled")+'>'
       +'<span class="nm">'+esc(a.nm)+'<span class="note">'+esc(a.note)+'</span></span>'
       +'<span class="cost">'+a.ap+' AP</span></button>';
    }).join("")+'</div>';
    if(styles.length){
      const styleEntries=stylesList();
      h+='<div class="pm-atk-styles" style="margin-top:12px">'+styleEntries.map(s=>{const base=finalPct(s.key);const g=gradedPct(s.key,base);const pct=g.pct===null?GRADE_LABEL[g.grade]:g.pct+"%";
        return '<span class="pm-stylechip">'+esc(s.name)+' <b onclick="APP.toggleGradePop(\''+jsq(s.key)+'\',\''+jsq(s.name)+'\',event)" title="Click for Difficulty Grades">'+pct+'</b> <button class="pm-btn roll" onclick="APP.roll(\''+jsq(s.key)+'\')">roll</button></span>';}).join("")+'</div>';
    }
  }else if(tab==="inventory"){
    h+='<table class="pm-atktable"><tr><th>Location</th><th>Armour</th><th>AP</th></tr>'
     +ARMOR_LOCATIONS.map(l=>'<tr><td>'+esc(l)+'</td><td>'+esc(S.armor[l])+'</td><td>'+armorApAt(l)+'</td></tr>').join("")+'</table>';
    h+='<p class="pm-invmeta">Gear ENC '+gearEncTotal()+' / '+(encLimit()??"—")+' unencumbered'+(S.money.dice.length?(' &middot; '+(moneyTotal()-(S.money.spent||0))+' / '+moneyTotal()+' sp'):"")+'</p>';
    if(inventoryBlock()){
      // Plain party-member view of a teammate's sheet: static list, no controls.
      if(S.inventory.length)h+='<div class="pm-invlist">'+S.inventory.map(it=>'<div class="pm-invrow"><span>'+esc(it.name)+' &times;'+it.qty+'</span><span class="pm-empty">ENC '+((it.qty||0)*(it.enc||0))+'</span></div>').join("")+'</div>';
    }else{
      // Editable for the owner always, and for the DM viewing a player's
      // character (VIEW_ONLY_IS_DM) as a narrow loot/gear exception. Deliberately
      // avoids the .pm-sbtn/.pm-pip/.pm-fatsel/.pm-dctl input classes that the
      // .view-only CSS rule disables, since this stays live under VIEW_ONLY for a DM.
      h+='<table class="pm-atktable"><tr><th>Item</th><th>Qty</th><th>ENC ea</th><th></th></tr>'
       +S.inventory.map((it,i)=>'<tr><td><input type="text" value="'+esc(it.name)+'" style="width:100%" onchange="APP.playInv('+i+',\'name\',this.value)"></td>'
        +'<td><input type="number" value="'+it.qty+'" style="width:56px" onchange="APP.playInv('+i+',\'qty\',this.value)"></td>'
        +'<td><input type="number" step="0.5" value="'+it.enc+'" style="width:56px" onchange="APP.playInv('+i+',\'enc\',this.value)"></td>'
        +'<td><button class="chip" aria-label="remove item" onclick="APP.playInvDel('+i+')">&times;</button></td></tr>').join("")
       +'</table><p style="margin-top:8px"><button class="chip" onclick="APP.playInvAdd()">+ add item</button></p>';
    }
  }else if(tab==="features"){
    h+=combatStylesReadOnlyHTML();
    h+=S.passions.length?'<div class="pm-invlist">'+S.passions.map(p=>'<div class="pm-invrow"><span>'+esc(p.name||"(unnamed)")+'</span><span class="pctval">'+passionVal(p)+'%</span></div>').join("")+'</div>':'<p class="pm-empty">No passions recorded.</p>';
  }else if(tab==="effects"){
    h+=specialEffectsPanel();
  }else{
    h+=S.concept.notes?('<p class="pm-notes">'+esc(S.concept.notes).replace(/\n/g,"<br>")+'</p>'):'<p class="pm-empty">No background notes yet.</p>';
  }
  h+='</div></div>';

  h+='<div class="pm-box pm-rolllog-wrap"><div class="pm-sect-head"><span class="no">05</span> PRESS LOG &mdash; D100</div>'
   +'<p class="pm-empty" style="margin-bottom:7px">Critical &le; 1/10 skill (round up) &middot; 01&ndash;05 auto success &middot; 96&ndash;00 auto failure &middot; Fumble 99&ndash;00 (00 only if skill&gt;100). A combat Fumble isn&#39;t just a miss &mdash; it can hand your opponent free Special Effects.</p>'
   +'<div class="pm-rolllog">'
   +(S.rollLog.length?S.rollLog.map((r,i)=>playRollLogRow(r,i)).join(""):'<span class="pm-empty">No rolls yet — click "roll" beside any skill.</span>')
   +'</div></div>';
  h+='</div>'; // /pm-col-right

  h+='</div>'; // /pm-columns

  // ---- literal colophon footer, ported verbatim from D (no black bar in
  // the mockup's own CSS — small-caps mono footer text only). Right side
  // swaps D's fabricated "Specimen Sheet · Rev. D" for the real character
  // name, since there's no live equivalent for a printer's revision code.
  h+='<footer class="pm-colophon"><span>Set in Archivo &amp; Space Mono</span><span>Mythras Character Forge &middot; Play Mode &middot; '+esc(name)+'</span></footer>';

  h+='</div>';
  if(XP_OPEN&&!VIEW_ONLY)h+=xpModalHtml();
  $("#main").innerHTML=h;
}
// ---- Improve Skills modal (Experience Rolls, core rulebook pp.71-73) ----
function xpModalHtml(){
  const es=allEntries();
  const grp=g=>es.filter(e=>e.grp===g).sort((a,b)=>a.label.localeCompare(b.label));
  const row=e=>{
    const pct=finalPct(e.key);
    const flagged=S.xp.fumbled.includes(e.key);
    const used=S.xp.usedThisRun.includes(e.key);
    const canSpend=S.xp.pool>0&&!used;
    return '<div class="pm-xprow">'
     +'<button class="pm-xpflag'+(flagged?" on":"")+'" title="'+(flagged?"Fumbled — free +1% pending. Click to remove flag.":"Mark this skill as Fumbled (free +1%)")+'" onclick="APP.xpToggleFumble(\''+jsq(e.key)+'\')">&#9873;</button>'
     +'<span class="nm">'+esc(e.label)+'</span>'
     +'<span class="pctval">'+pct+'%</span>'
     +(flagged?'<button class="pm-btn sm" onclick="APP.xpApplyFumble(\''+jsq(e.key)+'\')">apply +1%</button>':'')
     +'<button class="pm-btn sm roll" '+(canSpend?"":"disabled")+' onclick="APP.xpSpend(\''+jsq(e.key)+'\')">'+(used?"used this sitting":"spend roll")+'</button>'
     +'</div>';
  };
  let h='<div class="pm-modal-backdrop" onclick="APP.closeXP()"><div class="pm-modal" onclick="event.stopPropagation()">';
  h+='<div class="pm-modal-hd"><h3>Improve Skills — Experience Rolls</h3><button class="pm-btn sm" onclick="APP.closeXP()">&times; close</button></div>';
  h+='<div class="pm-xppool"><div>Experience Rolls banked: <b>'+S.xp.pool+'</b></div>'
   +'<div class="pm-xpaward">Award <input type="number" id="xpAwardN" value="3" min="1" style="width:52px"> '
   +'<button class="pm-btn sm" onclick="APP.xpAward(document.getElementById(\'xpAwardN\').value)">+ add to pool</button> '
   +'<span class="pm-empty">core book: 2&ndash;4 per sitting, GM discretion. Awarding resets the once-per-skill cap below.</span></div></div>';
  h+='<p class="pm-empty">Spend 1 roll on a skill: roll 1d100, add INT ('+S.chars.INT+'). Total meets or beats the skill&rsquo;s current % &rarr; <b>+1d4+1%</b>. Total falls short &rarr; still <b>+1%</b> (an Experience Roll never fails outright). A skill flagged &#9873; got a Fumble since the last sitting and gets a free <b>+1%</b> (applied before any roll spent on it, doesn&rsquo;t stack) &mdash; this flags automatically when you roll a Fumble in Play Mode, or click the flag by hand. Only one Experience Roll per skill per sitting.</p>';
  h+='<div class="pm-xplist">';
  h+='<div class="pm-skillgroup"><h4>Standard</h4>'+grp("Standard").map(row).join("")+'</div>';
  if(grp("Professional").length)h+='<div class="pm-skillgroup"><h4>Professional</h4>'+grp("Professional").map(row).join("")+'</div>';
  if(grp("Magic").length)h+='<div class="pm-skillgroup"><h4>Magic</h4>'+grp("Magic").map(row).join("")+'</div>';
  if(grp("Combat Style").length)h+='<div class="pm-skillgroup"><h4>Combat Styles</h4>'+grp("Combat Style").map(row).join("")+'</div>';
  h+='</div>';
  h+='<div class="pm-xplog"><h4>Results</h4>'+(S.xp.history.length?S.xp.history.map(xpLogRow).join(""):'<p class="pm-empty">No rolls yet.</p>')+'</div>';
  h+='</div></div>';
  return h;
}
function xpLogRow(r){
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
  const c=S.chars,es=allEntries();
  const grp=g=>es.filter(e=>e.grp===g).sort((a,b)=>a.label.localeCompare(b.label));
  // Small filled/hollow dot ahead of each skill name — purely a scannability
  // aid (not a rules concept) so a first-time player can spot at a glance
  // which skills actually have points in them versus base-only. Modelled on
  // the proficiency-dot idea from D&D Beyond's skill list, adapted since
  // Mythras has no proficiency toggle — "trained" here just means invested.
  const skrows=list=>list.map(e=>{
    const base=finalPct(e.key);const g=gradedPct(e.key,base);const shifted=g.grade!==ACTIVE_GRADE;
    const why=gradeReasons(e.key);
    const whyTxt=why.length?why.map(r=>r.text).join(" · "):"";
    let valueHtml;
    if(g.pct===null)valueHtml='<span class="note" style="text-transform:capitalize" title="'+esc(whyTxt)+'">'+GRADE_LABEL[g.grade]+'</span>';
    else if(g.grade!=="standard")valueHtml='<span class="pct" title="'+esc(whyTxt)+'">'+g.pct+'%</span> <span class="note" style="text-decoration:line-through">'+base+'%</span>'+(shifted?' <span class="note" title="'+esc(whyTxt||"Grade shifted")+'">&#9733;</span>':"");
    else valueHtml='<span class="pct">'+base+'%</span>';
    const dot='<span class="trdot" style="color:'+(e.trained?"var(--verd)":"var(--faint)")+'" title="'+(e.trained?"Trained":"Base only, no points invested")+'">'+(e.trained?"&#9679;":"&#9675;")+'</span>';
    return '<div class="skrow"><span>'+dot+esc(e.label)+(e.provisional?' <span class="warn" title="Combat Style base % uses STR+DEX as a working default, same formula as Athletics/Swim/Unarmed — the book leaves each style&#39;s exact base characteristics to the Games Master/setting">&#9888;</span>':"")+'</span><span>'+valueHtml+' <button class="rollb" onclick="APP.roll(\''+jsq(e.key)+'\')">roll</button></span></div>';
  }).join("");
  let h=head("Character Sheet","A printable reference sheet — same numbers as Play Mode. Roll skills straight off it if you like; this browser autosaves as you go either way.");
  h+='<div class="card"><h3>Difficulty Grade</h3><p class="note">Shifts every skill %, and what the roll button uses, until you set it back to Standard.'
   +(S.archetype!=="ordinary"?' Endurance/Stealth/Willpower auto-shift one step easier if you took that Advantage (marked &#9733;).':"")+'</p>'
   +'<select onchange="APP.setGrade(this.value)">'+GRADES.map(([k,l])=>'<option value="'+k+'" '+(ACTIVE_GRADE===k?"selected":"")+'>'+l+'</option>').join("")+'</select>'
   +(ACTIVE_GRADE!=="standard"?' <button class="chip" onclick="APP.setGrade(\'standard\')">reset to Standard</button>':"")
   +conditionsSummary()+'</div>';
  h+='<div class="rolllog" id="rolllog">'+(S.rollLog.length?S.rollLog.map((r,i)=>'<div class="'+(i===0?"fresh ":"")+'t'+r.tier+'">d100 = '+r.roll+' vs '+esc(r.label)+' '+r.pct+'% &rarr; <b>'+r.tier+'</b></div>').join(""):'<span class="note">Roll log &mdash; click &ldquo;roll&rdquo; beside any skill. Crit &le; 1/10 skill (round up) &middot; 01&ndash;05 auto success &middot; 96&ndash;00 auto failure &middot; fumble 99&ndash;00 (00 only if skill &gt; 100).</span>')+'</div>';
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
  const hpAt=loc=>{const hp=hpLocsFinal(c.CON,c.SIZ).find(x=>x[0]===loc);return hp?hp[1]:"";};
  // ---- header band: player/character, background, title panel, contacts, equipment ----
  h+='<div class="mhead-grid">';
  h+='<div class="mbox"><div class="mbox-t">Player &amp; Character</div>'
   +mkv("Player",esc(S.concept.player||"—"))+mkv("Character",esc(S.concept.name||"Unnamed"))
   +mkv("Species",esc(speciesDef()?speciesDef().label:"Human"))
   +mkv("Culture",esc(S.culture||"—"))+mkv("Career",esc(careerName||"—"))
   +mkv("Age",esc(S.concept.age||"—"))+mkv("Gender",esc(S.concept.gender||"—"))
   +mkv("Frame",esc(S.concept.frame||"—"))+mkv("Handed",esc(S.concept.handed||"—"))
   +(()=>{const hw=heightWeight();return hw?mkv("Height",hw.m.toFixed(2)+"m ("+hw.ft+")")+mkv("Weight",hw.kg+"kg"):"";})()+'</div>';
  h+='<div class="mbox"><div class="mbox-t">Background, Community &amp; Family</div>'
   +mkv("Homeland",esc(S.concept.homeland||"—"))+mkv("Social class",esc(S.money.socialClass||"—"))
   +(S.archetype!=="ordinary"?mkv("Tier",esc(ARCHETYPES[S.archetype].label)):"")
   +'<div class="mnotesmini">'+(S.concept.notes?esc(S.concept.notes):'<span class="note">No background notes yet.</span>')+'</div></div>';
  h+='<div class="mtitlepanel"><div class="logo">Mythra<span>S</span></div><div class="sub2">Character Record</div></div>';
  h+='<div class="mbox"><div class="mbox-t">Passions (Contacts, Allies &amp; Ties)</div>'
   +(S.passions.length?S.passions.map(p=>mkv(esc(p.name||"(unnamed)"),passionVal(p)+"%")).join(""):'<span class="note">None recorded.</span>')+'</div>';
  h+='<div class="mbox"><div class="mbox-t">Equipment &amp; Armour</div>'
   +'<table class="mtiny"><tr><th>Loc</th><th>Armour</th><th class="num">AP</th></tr>'
   +ARMOR_LOCATIONS.map(l=>'<tr><td>'+esc(l)+'</td><td>'+esc(S.armor[l])+'</td><td class="num">'+armorApAt(l)+'</td></tr>').join("")+'</table>'
   +mkv("Init. penalty",initPenalty?"−"+initPenalty:"0")
   +mkv("Silver",S.money.dice.length?(moneyTotal()-(S.money.spent||0))+" / "+moneyTotal()+" sp":"—")+'</div>';
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
   +mkv("Starting",S.money.dice.length?moneyTotal()+" sp":"—")+mkv("Spent",(S.money.spent||0)+" sp")
   +mkv("Remaining",S.money.dice.length?(moneyTotal()-(S.money.spent||0))+" sp":"—")
   +mkv("Gear ENC",gearEncTotal())+mkv("Enc. limit (STR×2)",encLimit())+'</div>';
  h+='<div class="mbox mmagicbox"><div class="mbox-t">Magic Points</div><div class="mbig">'+c.POW+'</div></div>';
  h+='</div>'; // /mcol left

  h+='<div class="mcol">';
  h+='<div class="mbox"><div class="mbox-t">Hit Locations</div><div class="mhitloc-flex">'
   +'<table class="mtiny"><tr><th>d20</th><th>Loc</th><th class="num">HP</th><th class="num">AP</th></tr>'
   +HIT_D20.map(([r,loc])=>{const base=loc.replace(/Right |Left /,"Each ");
     return '<tr><td>'+r+'</td><td>'+loc+'</td><td class="num">'+hpAt(base)+'</td><td class="num">'+armorApAt(base)+'</td></tr>';}).join("")
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
  const meleeWps=S.gearWeapons.map(n=>WEAPON_MAP[n]).filter(w=>w&&w.group!=="Ranged");
  const rangedWps=S.gearWeapons.map(n=>WEAPON_MAP[n]).filter(w=>w&&w.group==="Ranged");
  h+='<div class="mbox"><div class="mbox-t">Melee &amp; Shield Weapons</div>'
   +(meleeWps.length?'<table class="mtiny"><tr><th>Weapon</th><th>Damage</th><th>Reach</th><th>Effects</th><th class="num">ENC</th><th>AP/HP</th></tr>'
     +meleeWps.map(w=>'<tr><td>'+esc(w.name)+'</td><td class="num">'+esc(w.dmg)+'</td><td>'+esc(w.reach)+'</td><td>'+esc(w.effects)+'</td><td class="num">'+w.enc+'</td><td>'+esc(w.apHp)+'</td></tr>').join("")+'</table>'
     :'<p class="note">None carried &mdash; add some on the Money &amp; Gear step.</p>')+'</div>';
  h+='<div class="mbox"><div class="mbox-t">Ranged Weapons</div>'
   +(rangedWps.length?'<table class="mtiny"><tr><th>Weapon</th><th>Damage</th><th>Range</th><th>Effects</th><th class="num">ENC</th><th>AP/HP</th></tr>'
     +rangedWps.map(w=>'<tr><td>'+esc(w.name)+'</td><td class="num">'+esc(w.dmg)+'</td><td>'+esc(w.range||"—")+'</td><td>'+esc(w.effects)+'</td><td class="num">'+w.enc+'</td><td>'+esc(w.apHp)+'</td></tr>').join("")+'</table>'
     :'<p class="note">None carried.</p>')+'</div>';
  h+='</div>'; // /mweapons-grid

  if(S.inventory.length)h+='<div class="mbox" style="margin-top:8px"><div class="mbox-t">Other Equipment</div>'
   +S.inventory.map(it=>mkv(esc(it.name)+' ×'+it.qty,'ENC '+((it.qty||0)*(it.enc||0)))).join("")+'</div>';
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
  let h=head("Finish Creating","That&rsquo;s the character built. Enter Play Mode to start using it at the table &mdash; you can always jump back into any step from the Edit button in Play Mode to make changes, nothing here is locked in.");
  h+='<div class="card"><h3>'+esc(S.concept.name||"Unnamed Character")+'</h3>'
   +(meta?'<p class="note">'+esc(meta)+'</p>':"")+'</div>';
  h+=combatStylesCard();
  h+=campaignCard();
  h+='<div class="exportrow"><button class="nav primary" onclick="APP.toPlay()">&#9654; Finish Creating &mdash; Enter Play Mode</button>'
   +'<button class="nav" onclick="APP.toSheet(\'character\')">View / Print Sheet</button></div>';
  return h;
}
// Combat Style composition — weapons and Combat Style Traits attached to
// each style the character has (name + allocation already happen on the
// Culture/Career/Quick Skills step; this is the one place to build out what
// the style actually covers). Editable here only — Play Mode's Features tab
// shows the built result read-only, it doesn't let you change it mid-game.
function combatStylesCard(){
  const styles=stylesList();
  if(!styles.length){
    return '<div class="card"><h3>Combat Styles</h3><p class="note">No Combat Style yet &mdash; take one back on the Culture, Career, or Quick Skills step (it needs a name there first), then come back here to build out its weapons and traits.</p></div>';
  }
  let h='<div class="card"><h3>Combat Styles</h3>'
   +'<p class="note">Pick as many weapons and Combat Style Traits as fit &mdash; no fixed slot count either way. Traits are the fan-compiled <i>Mythras Combat Style Traits Encyclopedia</i>; hover one for its rules text, or see the full text below once selected.</p>';
  h+=styles.map(combatStyleEditorHTML).join("");
  h+='</div>';
  return h;
}
function combatStyleEditorHTML(s){
  const d=styleDef(s.key);
  let h='<div class="cstyle-block">';
  h+='<h4 class="cstyle-name">'+esc(s.name)+'</h4>';
  h+='<div class="field"><label>Weapons ('+d.weapons.length+' selected)</label><div class="choicechips">'
   +WEAPONS.map(w=>'<button class="chip '+(d.weapons.includes(w.name)?"on":"")+'" onclick="APP.toggleStyleWeapon(\''+jsq(s.key)+'\',\''+jsq(w.name)+'\')" title="'
     +esc(w.group+" · "+w.dmg+" · Size "+w.size+" · Reach "+w.reach+(w.traits?" · "+w.traits:""))+'">'+esc(w.name)+'</button>').join("")+'</div></div>';
  h+='<div class="field"><label>Combat Style Traits ('+d.traits.length+' selected)</label>'
   +COMBAT_TRAIT_CATEGORIES.map(cat=>{
     const items=COMBAT_TRAITS.filter(t=>t.category===cat);
     return '<details class="cstyle-traitgroup"><summary>'+esc(cat)+' ('+items.length+')</summary><div class="choicechips">'
      +items.map(t=>'<button class="chip '+(d.traits.includes(t.name)?"on":"")+'" onclick="APP.toggleStyleTrait(\''+jsq(s.key)+'\',\''+jsq(t.name)+'\')" title="'+esc(t.desc)+'">'+esc(t.name)+'</button>').join("")+'</div></details>';
   }).join("")+'</div>';
  if(d.traits.length){
    h+='<div class="cstyle-traitdescs">'+d.traits.map(tn=>{
      const t=COMBAT_TRAITS.find(x=>x.name===tn);if(!t)return"";
      return '<p class="note"><b>'+esc(t.name)+'</b> <span class="cstyle-traitsrc">('+esc(t.category)+' &middot; '+esc(t.source)+')</span> &mdash; '+esc(t.desc)+'</p>';
    }).join("")+'</div>';
  }
  h+='</div>';
  return h;
}
// Read-only version of the above for Play Mode's Features tab — shows what
// was built on the Combat Styles card (name, weapons, full trait rules
// text) so a player can actually reference it at the table. No editing
// controls here; that only happens back in the Character Builder.
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
      :'<p class="pm-empty">No weapons attached — edit this style from the Character Builder&rsquo;s Finish step.</p>';
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
  if(CLOUD_ENABLED&&!AUTH_USER&&!MOCK_AUTH){
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
  +'<li>Culture: 100 points, every listed/chosen skill 5&ndash;15. Career: 100 points, max 15, &ldquo;not all of the available skills need to be improved.&rdquo; Bonus: 150 points, max 15, one hobby professional skill. Customs &amp; Native Tongue +40% each. All confirmed against the Character Creation Summary (core p.27) page image.</li>'
  +'<li>Passions starting values per the Passions Table (Culture &amp; Community, p.23), confirmed against the page image: a person (romantic/familial) 30 + loved one&rsquo;s POW+CHA; a person (platonic or averse) 30 + own POW + subject&rsquo;s CHA; an organisation, place or concept 30 + POW+INT; a race/species or an object 30 + POW&times;2.</li>'
  +'<li>Starting money per culture (Barbarian 4d6&times;50, Civilised 4d6&times;75, Nomadic 4d6&times;25, Primitive 4d6&times;10 silver) and the Social Class / Money Modifier tables (Culture &amp; Community, p.24, four per-culture tables: Barbarian, Civilised, Nomad, Primitive) are transcribed and confirmed against page images &mdash; no longer a reconstruction. The free-text Social Class field and Money Modifier number still let you override with a house rule if your table plays it differently.</li>'
  +'<li>Success tiers (Skills chapter, p.37&ndash;38, confirmed against page image): critical = one tenth of skill, fractions rounded up; 01&ndash;05 always succeeds; 96&ndash;00 always fails, regardless of skill value; fumble on 99&ndash;00, or only 00 for skills over 100. (Mythras has four tiers &mdash; no &ldquo;special&rdquo; tier.)</li>'
  +'<li>Weapons (Economics &amp; Equipment, pp.63&ndash;66: One-Handed, Shields, Two-Handed, Ranged tables) and Armour (p.58 Armour Table, 8 Construction tiers from Natural/Cured to Articulated Plate, plus the Material Types ENC-multiplier table) are transcribed and confirmed against page images. <b>Correction:</b> weapons have no STR/DEX minimum in Mythras &mdash; an earlier pass fabricated that mechanic entirely; it has been removed. Combat Style base % still uses STR+DEX for every style (marked with &#9888; on the sheet) as a working default, since the book leaves each style&rsquo;s exact base characteristics to the Games Master/setting.</li>'
  +'<li><b>Armour Penalty to Initiative</b> (p.58, confirmed against page image): total the ENC of every location of armour worn (full, not halved), divide by 5, round up, subtract from Initiative Bonus. Shown on the Sheet step next to Initiative and in the Armour card.</li>'
  +'<li><b>Quick Character</b> (Character Creation Workbook, Attribute Summary): a single 100-point pool spent across all Standard Skills, three chosen Professional Skills, and an optional Combat Style, replacing the Culture/Career/Bonus pipeline entirely. 5&ndash;15 points on any skill you invest in (0 is fine for the rest &mdash; with 20+ eligible skills, a mandatory 5 on literally every one wouldn&rsquo;t fit in 100 points). Characteristics still use the normal roll or 80-point build; there&rsquo;s no per-culture money multiplier in this mode, so enter one manually on the Money &amp; Gear step.</li>'
  +'<li><b>Pulp Hero &amp; Paragon</b> (Mythras Companion, &ldquo;Pyramids, Pulp, &amp; Paragons&rdquo;, pp.54&ndash;55, verified against page scans): different characteristic dice/point pools, 2 or 3 non-stacking Advantages, and extra Bonus Skill Points at a higher per-skill cap (Pulp +50 pts/20% cap, Paragon +100 pts/40% cap). <b>Quirk:</b> the book&rsquo;s Paragon bonus-points line is literally labelled &ldquo;Heroic characters&rdquo; rather than &ldquo;Paragon characters&rdquo; &mdash; preserved as printed.</li>'
  +'<li>Grade-easier Advantages (Endurance/Stealth/Willpower) are flagged on the Attributes step rather than converted into a flat percentage, since Mythras Grades are a situational roll modifier, not a skill bonus &mdash; baking in a number would be a guess, not a rule.</li>'
  +'<li>The doubled Healing Rate for Pulp/Paragon (Minor or Serious Wounds only, Major Wounds unaffected) is noted next to Healing Rate rather than computed, since this build doesn&rsquo;t track wound severity.</li>'
  +'<li><b>Difficulty Grade</b> (core rulebook, Skills chapter, p.38, confirmed against page image): Very Easy doubles the skill, Easy adds half again, Standard is unchanged, Hard cuts it by a third, Formidable halves it, Herculean drops it to a tenth; Automatic needs no roll and Hopeless allows none. The selector on the Sheet step applies this to every skill % and to the roll button. Rounding direction isn&rsquo;t specified in the book for this table, so results are rounded to the nearest whole percent.</li>'
  +'<li><b>Cult &amp; Community</b> (Cults &amp; Brotherhoods chapter, pp.196&ndash;200, confirmed against page images): the five organisation types (Theist Cult, Animist/Spirit Cult, Sorcery Order, Mystical Order, Brotherhood) and their rank titles &mdash; Common/Dedicated/Proven/Overseer/Leader &mdash; are the book&rsquo;s own, as are the per-rank Requirements (years of membership + a minimum number of cult skills at a minimum %) and Training Discount (0/25/50/75/100%). <b>Correction:</b> rank does not grant a flat skill % bonus &mdash; an earlier pass invented that mechanic; it has been removed. What stays intentionally setting-specific, per the book&rsquo;s own design (cults are meant to be campaign-defined), is which nine archetypes exist for Sit&#39;ota, their names/blurbs, and which skill each one teaches.</li>'
  +'<li><b>Encumbrance</b> (core rulebook, Encumbrance section, confirmed against page image): unencumbered up to STR&times;2. Over STR&times;2 (&ldquo;Burdened&rdquo;): STR/DEX-based skills, including Combat Styles, are one Grade harder, Movement &minus;2m, no sprinting. Over STR&times;3 (&ldquo;Overloaded&rdquo;): two Grades harder, Movement halved, walk-only. STR&times;4 is a hard cap &mdash; flagged but not blocked by this tool. Worn armour counts at half its packed ENC toward these totals; carried (unworn) armour counts full ENC. <b>These penalties are now applied, not just described:</b> a skill counts as STR/DEX-based if its base formula contains STR or DEX (which is every Combat Style), and the Grade shift feeds the same <code>gradeForEntry()</code> the skill list, sheet, Play Mode and every roll button already use. Until this pass the warning text promised a penalty that never reached a roll.</li>'
  +'<li><b>Fatigue</b> (Fatigue Levels table). Each level sets an <i>absolute</i> Skill Grade for all rolls (Winded/Tired Hard, Wearied/Exhausted Formidable, Debilitated/Incapacitated Herculean, Semi-Conscious and beyond Hopeless), plus Movement, Initiative and Action Point penalties, and a Recovery Period that is divided by the character&rsquo;s Healing Rate. All of it is applied automatically now; the track used to be a picker that stored a string and changed nothing. Because the table states a grade rather than a shift, Fatigue acts as a <i>floor</i> on difficulty and takes the harsher of itself and any Encumbrance shift, rather than stacking with it &mdash; the book gives no stacking rule, and summing them would be an invention. Table transcribed from the <a href="https://srd.mythras.net/" target="_blank" rel="noopener">Mythras Imperative SRD</a>, published by The Design Mechanism under the ORC License, which reproduces the core rulebook&rsquo;s own Fatigue table.</li>'
  +'<li><b>Height &amp; Weight</b> used to be a text reminder on the Concept step that never computed anything. It is now derived from SIZ, species and body frame and flows to the ledger, the Attributes step, the sheet and the Markdown export. <b>Provenance, stated plainly:</b> the core rulebook&rsquo;s Height &amp; Weight table (p.9) is <i>not</i> reproduced &mdash; this app has no verified transcription of it, and inventing one and presenting it as the book&rsquo;s table would repeat exactly the kind of fabrication that had to be scrubbed out of the weapons table. What runs instead is an explicit model: weight = mass-per-SIZ &times; SIZ (SIZ being a measure of mass), height = a species anchor scaled by the cube root of SIZ and adjusted by build (same mass, taller if Lithe, shorter if Heavy). It is pinned to the standard adult figure for an average-SIZ human and, for each demi-human, to the height its own species description states. Both figures have override boxes: type the printed table&rsquo;s value in and it wins outright.</li>'
  +'<li><b>Non-human species.</b> Picking a species on the Concept step swaps in that species&rsquo; characteristic dice (which drive the roller, the Points Build bounds and the pool), its Movement Rate, and its racial traits; everything downstream &mdash; Culture, Career, skills, Attributes, Hit Points &mdash; runs unchanged, which is how the rules handle it. The Racial Characteristics Table, Movement Rates and racial special rules come from the <a href="https://cfi-srd.mythras.net/" target="_blank" rel="noopener">Classic Fantasy Imperative SRD</a> (The Design Mechanism, ORC License) &mdash; the same engine, and the only open Mythras-family source for playable non-human dice. Its Human row is identical to core Mythras (3d6 / 2d6+6), which is the cross-check that the two agree. <b>Two seams worth knowing:</b> (1) Points Build keeps the core rulebook&rsquo;s flat 80/90/100 pool for humans but uses the species rules&rsquo; &ldquo;racial averages + 6&rdquo; for demi-humans, because a flat 80 would put a dwarf below its own species average; (2) CFI&rsquo;s &ldquo;humans get +1 Luck Point&rdquo; balance perk is <i>not</i> applied, since it is a Classic Fantasy rule rather than core Mythras and would silently inflate every human character. Racial traits are all situational Grade shifts or narrative rules, so they are recorded on the sheet rather than folded into a percentage &mdash; the same treatment the Pulp/Paragon Grade-easier Advantages already get.</li>'
  +'<li><b>Movement Rate</b> was hardcoded as the string &ldquo;6m&rdquo; in five places. It now comes from the species template (core: &ldquo;Movement is not calculated from Characteristics but is a default value which differs from species to species. The base Movement Rate for humans is 6 metres&rdquo;) and is reduced by Fatigue and Encumbrance. Gaits are Walk / Run &times;3 / Sprint &times;5; sprinting is lost while Burdened and everything above a walk while Overloaded.</li>'
  +'<li>Not modelled in v1: age bands, background events, magic spell lists.</li>'
  +'</ul></div></details>';
}

