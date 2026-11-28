/* Combat Companion v1 (AQ-3; UX spec docs/ux/mobile-combat-companion-20261127.md).
   A focused phone view of Play Mode: a table bar (AP, Luck, MP, Fatigue, Rule
   Hints), a Combat tab and a Body tab. It draws from Play Mode's own state and
   actions (play.js, app.js), and Special Effects come from CombatRules through
   canPickEffectForRoll, so nothing here is a second copy of a rule. Every
   change goes through S.play and render(), so it autosaves and syncs as Play
   Mode does. Loaded after app.js; renderPlayView() hands over when it is on. */

const CC_KEYS={on:"pm-companion",hints:"cc-hints",dice:"cc-dice"};
function ccPref(k,def){let v=null;try{v=localStorage.getItem(CC_KEYS[k]);}catch(e){}return v==null?def:v;}
function ccSetPref(k,v){try{localStorage.setItem(CC_KEYS[k],v);}catch(e){}}
// A read-only view of a teammate's sheet stays in the full Play Mode.
function ccActive(){return !VIEW_ONLY&&ccPref("on","off")==="on";}
function ccHints(){return ccPref("hints","on")!=="off";}
function ccDiceMode(){return ccPref("dice","app")==="physical"?"physical":"app";}

let CC_TAB="combat";     // combat | body
let CC_WEAPON=null;      // weapon chosen in the loadout switcher
let CC_STYLE={};         // weapon -> Combat Style key, when more than one covers it
let CC_ROLL=null;        // the roll-log entry the Combat tab is resolving
let CC_PENDING=null;     // physical dice: the action waiting for its result
let CC_AP_WARN=null;     // the action waiting for a second tap at 0 AP
let CC_SWITCH=false;     // character switcher open
let CC_LOC=null;         // Body tab: the zone whose stepper is open
let CC_HITLOC=null;      // the last free hit-location roll
let CC_FX_OPEN=null;     // the Special Effect whose rule is shown inline
let CC_WAKE=null;        // the Wake Lock while Keep Screen On holds
let CC_WAKE_WANT=false;   // Keep Screen On was asked for: taken again when the page comes back
let CC_WAKE_BOUND=false;
const CC_GRADES=[["easy","Easy"],["standard","Std"],["hard","Hard"],["formidable","Form."],["herculean","Herc."]];
const CC_TIERS=["Critical","Success","Failure","Fumble"];
const CC_CONDITIONS=[["prone","Prone"],["bleeding","Bleeding"],["pinned","Pinned"],["impaled","Impaled"],["disabled","Disabled limb"]];
const CC_CONDITION_HINTS={
  prone:"Prone: your combat rolls are Formidable against a foe on their feet (Core p.101).",
  bleeding:"Bleeding: lose one level of Fatigue at the start of each Combat Round until First Aid stops it (Core pp.71, 96).",
  pinned:"Pinned: the pinned weapon or shield is unusable until you work it free, 1 AP, worked as Grip (Pin Weapon).",
  impaled:"Impaled: while the weapon stays in, your skill rolls are harder by its Size against your SIZ (Core p.98).",
  disabled:"Disabled limb: a useless arm drops what it holds; a useless leg drops you prone (Core p.110)."
};
// Tactics only, not rules: the rule itself comes from the Special Effects table.
const CC_FX_TIPS={
  "Bleed":"Best early in a fight: the Fatigue loss keeps working every round.",
  "Bypass Armour":"Worth most against a heavily armoured foe.",
  "Choose Location":"Aim for the weapon arm to end their attacks, or a leg to slow them.",
  "Disarm Opponent":"Leaves them unarmed, which often opens Compel Surrender.",
  "Force Failure":"Use it on a parry or evade you would otherwise lose.",
  "Impale":"Lodged in, it makes their rolls harder; pulling it out costs you an action.",
  "Maximise Damage":"Pairs well with a hit to the head or a limb near its threshold.",
  "Press Advantage":"Stops them attacking next turn while you keep the pressure on.",
  "Stun Location":"A stunned arm can't attack; a stunned leg can't move.",
  "Trip Opponent":"A prone foe fights at a big penalty; follow it up quickly.",
  "Withdraw":"A clean way out of a fight that is going badly.",
  "Enhance Parry":"Blocks the whole blow, whatever the weapon sizes.",
  "Arise":"Get back up for free instead of spending your turn on it.",
  "Overextend Opponent":"Costs them their next attack; good when you are hurt.",
  "Prepare Counter":"Plan it against an attack they repeat."
};

function ccWeapons(){return [...pmCarriedWeapons().filter(n=>weaponByName(n)),"Unarmed"];}
function ccWeapon(){const list=ccWeapons();if(!list.includes(CC_WEAPON))CC_WEAPON=list[0];return CC_WEAPON;}
function ccWeaponDef(name){return name==="Unarmed"?UNARMED_WEAPON:weaponByName(name);}
// The skill a weapon rolls with: a Combat Style that covers it, else the base
// Combat Style (STR+DEX) for a substantially different weapon (Core p.88).
function ccStyleFor(name){
  if(name==="Unarmed")return {key:"std:Unarmed",fam:"",name:"Unarmed",choices:[]};
  const styles=stylesList().filter(s=>(styleDef(s.key).weapons||[]).includes(name));
  if(!styles.length)return {key:"",fam:"substantially",name:"Base Combat Style (STR+DEX)",choices:[]};
  const pick=styles.find(s=>s.key===CC_STYLE[name])||styles[0];
  return {key:pick.key,fam:"",name:pick.name,choices:styles};
}
function ccPctFor(st){
  const g=st.fam?familiarityPct(st.key||null,st.fam):gradedPct(st.key,finalPct(st.key));
  return g||{pct:null,grade:ACTIVE_GRADE};
}
// The same skill at another Difficulty Grade, with Fatigue and load applied.
function ccPctAtGrade(st,grade){const keep=ACTIVE_GRADE;ACTIVE_GRADE=grade;try{return ccPctFor(st);}finally{ACTIVE_GRADE=keep;}}
function ccPctText(g){return g.pct===null?GRADE_LABEL[g.grade]:g.pct+"%";}
function ccEvade(){return {key:"std:Evade",fam:"",name:"Evade",choices:[]};}
function ccDamageText(w){
  if(!w)return "";
  if(w===UNARMED_WEAPON)return unarmedDamageText();
  const useDM=w.group!=="Ranged"||w.dmgMod==="Y";
  const dm=useDM?String(dmCalc(effectiveChars().STR,effectiveChars().SIZ)).trim():"";
  return w.dmg+(dm&&!/^[+-]?0$/.test(dm)?(/^[+-]/.test(dm)?dm:"+"+dm):"");
}
// A Special Effect's rule in up to two sentences, for the inline "?" (spec: a 2-line rule).
function ccFxRule(text){
  const parts=String(text||"").split(/(?<=[a-z0-9)]{2}\.)\s/);let out=parts[0]||"";
  if(parts[1]&&(out+" "+parts[1]).length<=220)out+=" "+parts[1];
  return out.length>220?out.slice(0,217).replace(/\s+\S*$/,"")+"…":out;
}
function ccConditions(){return Array.isArray(S.play.conditions)?S.play.conditions:[];}
function ccRoll(){return S.rollLog.includes(CC_ROLL)?CC_ROLL:null;}
function ccHint(text){return ccHints()&&text?'<p class="cc-hint">'+text+'</p>':"";}
function ccIcon(p,size){return '<svg viewBox="0 0 24 24" width="'+(size||18)+'" height="'+(size||18)+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';}

// ---- Table bar: always on top ----
function ccTableBarHTML(){
  const v=charVitals(),left=v.maxAP-v.apUsed,f=v.fatigueRow;
  const pips=(n,on,fn,what)=>Array.from({length:n},(_,i)=>'<button type="button" class="pm-pip'+(i<on?"":" off")+'" aria-label="'+what+' '+(i+1)+(i<on?", available":", spent")+'" onclick="'+fn+'('+i+')"></button>').join("");
  return '<div class="cc-bar" role="group" aria-label="Table bar">'
   +'<div class="cc-cell cc-ap"><span class="k">AP <b>'+left+'</b>/'+v.maxAP+'</span><span class="pm-pips">'+pips(v.maxAP,left,"APP.playApSetPip","action point")+'</span>'
   +'<button type="button" class="cc-mini" onclick="APP.ccNewRound()">New round</button></div>'
   +'<div class="cc-cell"><span class="k">Luck <b>'+v.curLuck+'</b>/'+v.maxLuck+'</span><span class="pm-pips">'+pips(v.maxLuck,v.curLuck,"APP.playLuckSetPip","luck point")+'</span></div>'
   +'<div class="cc-cell"><span class="k">MP</span><span class="cc-adj"><button type="button" class="cc-mini" onclick="APP.playMagicAdj(-1)" aria-label="Spend a Magic Point">&minus;</button>'
   +'<b>'+v.curMagic+'</b><span class="cc-dim">/'+v.maxMagic+'</span><button type="button" class="cc-mini" onclick="APP.playMagicAdj(1)" aria-label="Restore a Magic Point">+</button></span></div>'
   +'<div class="cc-cell"><label class="k" for="ccFatigue">Fatigue</label><select id="ccFatigue" class="cc-select" onchange="APP.playSetFatigue(this.value)">'
   +FATIGUE_LEVELS.map(n=>'<option'+(v.fatigue===n?" selected":"")+'>'+n+'</option>').join("")+'</select>'
   +(v.fatigue!=="Fresh"?'<span class="cc-dim cc-fgrade">'+esc(GRADE_LABEL[f.grade]||"")+'</span>':'')+'</div>'
   +'<button type="button" class="cc-hints-btn" aria-pressed="'+ccHints()+'" onclick="APP.ccToggleHints()">'+ccIcon('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>',16)
   +'<span>Hints '+(ccHints()?"on":"off")+'</span></button></div>';
}

// ---- Combat tab ----
function ccLoadoutHTML(){
  const name=ccWeapon(),w=ccWeaponDef(name),st=ccStyleFor(name),g=ccPctFor(st);
  let h='<section class="cc-card" aria-label="Weapon"><div class="cc-chips" role="radiogroup" aria-label="Weapon">'
   +ccWeapons().map(n=>'<button type="button" role="radio" class="cc-chip'+(n===name?" on":"")+'" aria-checked="'+(n===name)+'" onclick="APP.ccWeapon(\''+jsq(n)+'\')">'+esc(n)+'</button>').join("")+'</div>';
  const ranged=w.group==="Ranged";
  const stats=[[st.name,ccPctText(g)]];
  if(ranged)stats.push(["Range",w.range||"—"],["Force",w.reach||"—"]);
  else stats.push(["Size",w.size||"—"],["Reach",REACH_NAME[w.reach]||w.reach||"—"]);
  stats.push(["AP/HP",w.apHp||"—"],["Damage",ccDamageText(w)]);
  h+='<dl class="cc-stats">'+stats.map(([k,v],i)=>'<div'+(i===0?' class="cc-style"':'')+'><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join("")+'</dl>';
  if(st.choices.length>1)h+='<label class="cc-small">Combat Style <select class="cc-select" onchange="APP.ccStyle(\''+jsq(name)+'\',this.value)">'
   +st.choices.map(s=>'<option value="'+esc(s.key)+'"'+(s.key===st.key?" selected":"")+'>'+esc(s.name)+'</option>').join("")+'</select></label>';
  if(st.fam)h+='<p class="cc-small cc-dim">Not in your Combat Styles: rolls at the base Combat Style, STR+DEX (Core p.88).</p>';
  return h+'</section>';
}
function ccGradeHTML(){
  const st=ccStyleFor(ccWeapon());
  const reasons=st.key?gradeReasons(st.key):[];
  return '<section class="cc-card" aria-label="Difficulty"><div class="cc-grades" role="radiogroup" aria-label="Difficulty Grade">'
   +CC_GRADES.map(([g,l])=>{const on=ACTIVE_GRADE===g;return '<button type="button" role="radio" class="cc-grade'+(on?" on":"")+'" aria-checked="'+on+'" aria-label="'+GRADE_LABEL[g]+', '+ccPctText(ccPctAtGrade(st,g))+'" onclick="APP.ccGrade(\''+g+'\')"><span>'+l+'</span><b>'+ccPctText(ccPctAtGrade(st,g))+'</b></button>';}).join("")
   +'</div>'+(reasons.length?'<p class="cc-small cc-dim">'+reasons.map(r=>esc(r.text)).join(" · ")+'</p>':'')+'</section>';
}
function ccActionsHTML(){
  const name=ccWeapon(),w=ccWeaponDef(name),st=ccStyleFor(name),v=charVitals(),left=v.maxAP-v.apUsed;
  const pct=ccPctText(ccPctFor(st)),ev=ccPctText(ccPctFor(ccEvade())),phys=ccDiceMode()==="physical";
  const canParry=weaponCanParry(w);
  const btn=(role,label,p,dis)=>'<button type="button" class="cc-act'+(role==="attack"?" atk":"")+(CC_AP_WARN===role?" warn":"")+'"'+(dis?" disabled":"")+' onclick="APP.ccAction(\''+role+'\')"><span>'+(CC_AP_WARN===role?label+" anyway":label)+'</span><b>'+p+'</b></button>';
  let h='<section class="cc-card" aria-label="Actions"><div class="cc-dicemode" role="radiogroup" aria-label="Dice">'
   +[["app","In-app roll"],["physical","Physical dice"]].map(([k,l])=>{const on=(k==="physical")===phys;return '<button type="button" role="radio" aria-checked="'+on+'" class="cc-seg'+(on?" on":"")+'" onclick="APP.ccDice(\''+k+'\')">'+l+'</button>';}).join("")
   +'</div><div class="cc-actrow">'+btn("attack","Attack",pct)+btn("parry","Parry",pct,!canParry)+btn("evade","Evade",ev)+'</div>';
  if(CC_AP_WARN)h+='<p class="cc-warn" role="status">No Action Points left this round. Tap again to act anyway, or start a New round. A Luck Point can buy one more.</p>';
  else if(left<1)h+=ccHint("Out of Action Points: New round refills them.");
  if(!canParry)h+='<p class="cc-small cc-dim">'+esc(name)+' can\'t parry.</p>';
  else h+=ccHint("Parry: a weapon the attacker's Size or bigger blocks all the damage, one Size smaller blocks half, smaller still blocks none (Core pp.94–95). Yours: "+esc(w.size||"—")+".");
  return h+'</section>';
}
function ccPendingHTML(){
  const p=CC_PENDING;if(!p)return "";
  return '<section class="cc-card cc-resolve" aria-label="Your roll"><p class="cc-prompt">Roll d100 for <b>'+esc(p.label)+'</b> against <b>'+esc(p.pctText)+'</b>. Your result:</p>'
   +'<div class="cc-tiers">'+CC_TIERS.map(t=>'<button type="button" class="cc-tier '+pmDiceTier(t)+'" onclick="APP.ccPhysical(\''+t+'\')">'+t+'</button>').join("")+'</div>'
   +'<button type="button" class="cc-link" onclick="APP.ccCancelPending()">Cancel (refunds the AP)</button></section>';
}
function ccResolveHTML(){
  const r=ccRoll();
  if(!r)return CC_PENDING?"":'<section class="cc-card cc-resolve cc-empty"><p>Tap <b>Attack</b>, <b>Parry</b> or <b>Evade</b>. Each spends 1 Action Point.</p>'
   +ccHint("Beat your opponent's roll and you win Special Effects; the better you beat them, the more you win (Core p.100).")+'</section>';
  const i=S.rollLog.indexOf(r);
  const what=r.combatRole==="attack"?"Attack":r.combatKind==="evade"?"Evade":"Parry";
  let h='<section class="cc-card cc-resolve" aria-label="Combat roll"><div class="cc-result"><b class="cc-d">'+(r.physical?"&#9856;":r.roll===100?"00":esc(String(r.roll)))+'</b>'
   +'<div><span class="pmx-tier '+pmDiceTier(r.tier)+'">'+esc(r.tier)+'</span><div class="cc-small cc-dim">'+what+' · '+esc(r.weapon||r.label)+' · '+r.pct+'%'+(r.physical?' · physical dice':'')+'</div></div></div>';
  if(!r.oppTier){
    h+='<p class="cc-prompt">'+(r.combatRole==="attack"?"Their defence roll:":"Their attack roll:")+'</p><div class="cc-tiers">'
     +CC_TIERS.map(t=>'<button type="button" class="cc-tier '+pmDiceTier(t)+'" onclick="APP.playSetOpponentTier('+i+',\''+t+'\')">'+t+'</button>').join("")
     +(r.combatRole==="attack"?'<button type="button" class="cc-tier none" onclick="APP.playNoParry('+i+')">No defence</button>':'')+'</div>';
    return h+'</section>';
  }
  const n=rollEffectsWon(r);
  h+='<p class="cc-small">Opponent: <b>'+(r.opponentAction==="no-parry"?"no defence":esc(r.oppTier))+'</b> <button type="button" class="cc-link" onclick="APP.playClearOpponent('+i+')">Change</button></p>';
  if(n>0)h+=ccEffectsHTML(r,n);
  else if(n<0)h+='<p class="cc-out bad">Your opponent wins <b>'+(-n)+' Special Effect'+(-n>1?"s":"")+'</b>. They choose.</p>';
  else h+='<p class="cc-out">No Special Effects either way.</p>';
  return h+'</section>';
}
function ccEffectsHTML(r,n){
  const picked=r.effectsPicked||[],eligible=SPECIAL_EFFECTS.filter(e=>canPickEffectForRoll(e,r));
  let h='<p class="cc-out good">You win <b>'+n+' Special Effect'+(n>1?"s":"")+'</b>: '+picked.length+' of '+n+' chosen.</p><div class="cc-fx">';
  for(const e of eligible){
    const idx=SPECIAL_EFFECTS.indexOf(e),count=picked.filter(x=>x===e[0]).length,on=count>0,can=on||picked.length<n;
    h+='<span class="cc-fxchip'+(on?" on":"")+'"><button type="button" class="cc-fxpick" aria-pressed="'+on+'"'+(can?"":" disabled")+' onclick="pmFxToggle('+idx+')">'+esc(e[0])+(count>1?" ×"+count:"")+'</button>'
     +'<button type="button" class="cc-fxq" aria-expanded="'+(CC_FX_OPEN===e[0])+'" aria-label="Rule for '+esc(e[0])+'" onclick="APP.ccFxInfo(\''+jsq(e[0])+'\')">?</button></span>';
  }
  h+='</div>';
  const open=eligible.find(e=>e[0]===CC_FX_OPEN);
  if(open){
    const req=open[4]?(pinWeaponWithoutCritical(open,r)?"No Critical needed":open[4]):"";
    h+='<div class="cc-fxrule" role="note"><b>'+esc(open[0])+'</b>'+(req||open[3]?' <span class="cc-dim">'+esc([req,open[3]].filter(Boolean).join(" · "))+'</span>':'')
     +'<p>'+esc(ccFxRule(open[6]))+'</p>'+(CC_FX_TIPS[open[0]]?'<p class="cc-dim">Tip: '+esc(CC_FX_TIPS[open[0]])+'</p>':'')+'</div>';
  }
  return h;
}
function ccDamageHTML(){
  const w=ccWeaponDef(ccWeapon()),r=ccRoll(),i=r?S.rollLog.indexOf(r):-1;
  let h='<section class="cc-card" aria-label="Damage and hit location"><div class="cc-dmgrow"><div><span class="cc-dim cc-small">Damage</span><b class="cc-dmg">'+esc(ccDamageText(w))+'</b></div>';
  if(r&&pmCanRollDamage(r)&&!r.damage)h+='<button type="button" class="cc-act atk" onclick="APP.ccRollDamage()">Roll damage</button>';
  h+='<button type="button" class="cc-act" onclick="APP.ccHitLoc()">Hit location d20</button></div>';
  if(r&&r.damage){
    const d=r.damage;
    h+='<p class="cc-small"><b class="cc-big">'+d.total+'</b> damage before parry and armour'
     +(d.chooseLocation?' · Choose Location: pick one in reach':' · d20 '+d.d20+' → <b>'+esc(d.loc)+'</b>')
     +(d.impaleRoll!=null?' · Impale rolled '+d.weaponRoll+' and '+d.impaleRoll+', the better kept':'')+'</p>';
  }
  if(CC_HITLOC)h+='<p class="cc-small">Hit location: d20 <b>'+CC_HITLOC.d20+'</b> → <b>'+esc(CC_HITLOC.loc)+'</b></p>';
  return h+'</section>';
}
function ccConditionsHTML(){
  const on=ccConditions();
  return '<section class="cc-card" aria-label="Conditions"><div class="cc-chips">'
   +CC_CONDITIONS.map(([k,l])=>'<button type="button" class="cc-chip cond'+(on.includes(k)?" on":"")+'" aria-pressed="'+on.includes(k)+'" onclick="APP.ccCondition(\''+k+'\')">'+l+'</button>').join("")
   +'</div>'+on.map(k=>ccHint(esc(CC_CONDITION_HINTS[k]))).join("")+'</section>';
}
function ccWoundHintHTML(){
  const hurt=charVitals().locs.filter(l=>l.cls==="serious"||l.cls==="major");
  if(!hurt.length)return "";
  return ccHint("Serious Wound"+(hurt.length>1?"s":"")+" ("+hurt.map(l=>esc(pmShortName(l.loc))).join(", ")+"): Endurance against the attack roll; either way no attacks for 1d3 Turns (Core p.110).");
}
function ccCombatTabHTML(){
  return ccLoadoutHTML()+ccGradeHTML()+ccActionsHTML()+ccPendingHTML()+ccResolveHTML()+ccDamageHTML()+ccConditionsHTML()+ccWoundHintHTML();
}

// ---- Body tab ----
function ccFigureHTML(){
  const order=["Chest","Abdomen","Right Leg","Left Leg","Right Arm","Left Arm","Head"];
  if(!order.every(l=>playHPLocs().includes(l))||playHPLocs().length!==7)return "";
  return '<svg class="cc-fig" viewBox="0 0 120 232" role="group" aria-label="Hit locations">'+order.map(loc=>{
    const l=charVitals().locs.find(x=>x.loc===loc);
    return '<g class="pmx-zone '+l.cls+(CC_LOC===loc?" sel":"")+'" role="button" tabindex="0" aria-label="'+loc+', '+l.cur+' of '+l.max+' hit points, armour '+playLocAP(loc)+', '+PM_WOUND_WORD[l.cls]+'"'
     +' onclick="APP.ccLoc(\''+loc+'\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();APP.ccLoc(\''+loc+'\')}"><path d="'+PM_FIG_ZONES[loc]+'"/></g>';
  }).join("")+'</svg>';
}
function ccStepperHTML(loc){
  const l=charVitals().locs.find(x=>x.loc===loc);if(!l)return "";
  const ap=playLocAP(loc),id="playdmg-"+loc.replace(/\s+/g,"_"),note=PM_DMG_NOTE&&PM_DMG_NOTE.loc===loc?PM_DMG_NOTE:null;
  const action=playWoundActionText(loc,l.cls);
  return '<div class="cc-stepper" role="group" aria-label="'+esc(loc)+' damage and healing">'
   +'<div class="cc-stepin"><button type="button" class="cc-mini" aria-label="One less" onclick="APP.ccStep(\''+id+'\',-1)">&minus;</button>'
   +'<input id="'+id+'" type="number" inputmode="numeric" min="1" max="99" value="" placeholder="0" aria-label="Points">'
   +'<button type="button" class="cc-mini" aria-label="One more" onclick="APP.ccStep(\''+id+'\',1)">+</button></div>'
   +'<div class="cc-stepbtns"><button type="button" class="cc-act atk" onclick="APP.playApplyDamage(\''+loc+'\')">Damage · armour '+ap+'</button>'
   +'<button type="button" class="cc-act" onclick="APP.ccRawDamage(\''+loc+'\')">Ignore armour</button>'
   +'<button type="button" class="cc-act" onclick="APP.playHeal(\''+loc+'\')">Heal</button></div>'
   +(note?'<p class="cc-small" role="status">'+note.raw+' dealt − '+note.ap+' armour → <b>'+note.applied+' taken</b>.</p>':'')
   +(action?'<p class="cc-flag '+l.cls+'" role="status"><b>'+esc(l.tag)+'.</b> '+esc(action)+'</p>':'')
   +(l.cls==="serious"||l.cls==="major"?ccHint(esc(playWoundEffectText(loc,l.cls))):'')+'</div>';
}
function ccBodyTabHTML(){
  const v=charVitals();
  let h='<section class="cc-card cc-body" aria-label="Hit locations"><div class="cc-bodygrid">'+ccFigureHTML()+'<div class="cc-locs">';
  for(const l of v.locs){
    const on=CC_LOC===l.loc;
    h+='<button type="button" class="cc-loc '+l.cls+(on?" on":"")+'" aria-expanded="'+on+'" onclick="APP.ccLoc(\''+jsq(l.loc)+'\')">'
     +'<span class="nm">'+esc(pmShortName(l.loc))+' <small>'+esc(hitD20For(l.loc))+'</small></span>'
     +'<span class="hp"><b>'+l.cur+'</b>/'+l.max+'</span><span class="ap">'+PM_SHIELD_SVG+playLocAP(l.loc)+'</span>'
     +'<span class="pmx-wd '+l.cls+'">'+PM_WOUND_WORD[l.cls]+'</span></button>';
  }
  h+='</div></div>';
  if(CC_LOC&&v.locs.some(l=>l.loc===CC_LOC))h+=ccStepperHTML(CC_LOC);
  else h+='<p class="cc-small cc-dim">Tap a location to take damage or heal. Damage takes off that location\'s armour first.</p>';
  return h+'</section>'+ccWoundHintHTML();
}

// ---- Header, switcher, frame ----
function ccSwitcherHTML(){
  if(!CC_SWITCH)return "";
  const list=Array.isArray(LIB_CACHE)?LIB_CACHE:null;
  let body;
  if(list===null)body='<p class="cc-small" role="status">Loading your characters…</p>';
  else if(!list.length)body='<p class="cc-small">No saved characters yet.</p>';
  else body=list.map(c=>'<button type="button" class="cc-pick'+(c.id===S._libId?" on":"")+'" onclick="APP.ccSwitchTo(\''+jsq(c.id)+'\')"><b>'+esc(c.name||"Unnamed Character")+'</b><small>'+esc([c.culture,c.career].filter(Boolean).join(" · "))+'</small></button>').join("");
  return '<div class="cc-sheet" role="dialog" aria-modal="true" aria-label="Switch character"><button type="button" class="cc-scrim" aria-label="Close" onclick="APP.ccSwitcher(false)"></button>'
   +'<div class="cc-sheet-panel"><h2>Switch character</h2>'+body+'<button type="button" class="cc-link" onclick="APP.ccSwitcher(false)">Close</button></div></div>';
}
function ccHeaderHTML(){
  const name=S.concept.name||"Unnamed Character",wake=typeof navigator!=="undefined"&&navigator&&"wakeLock" in navigator;
  return '<header class="cc-head"><button type="button" class="cc-who" aria-haspopup="dialog" onclick="APP.ccSwitcher(true)"><span class="cc-name">'+esc(name)+'</span>'+ccIcon('<path d="M6 9l6 6 6-6"/>',16)+'<span class="sr">Switch character</span></button>'
   +'<span id="forgeSaveStatus" class="cc-sync" role="status"></span>'
   +(wake?'<button type="button" class="cc-mini cc-wake" aria-pressed="'+CC_WAKE_WANT+'" onclick="APP.ccWake()">'+(CC_WAKE?"Screen stays on":"Keep screen on")+'</button>':'')+'</header>';
}
function ccEmptyHTML(){
  return '<div class="cc-empty-state"><h1>Combat Companion</h1><p>Pick a character to bring to the table, or try a ready-made fighter in The Pits.</p>'
   +'<p><button type="button" class="cc-act atk" onclick="APP.ccSwitcher(true)">Pick a character</button></p>'
   +'<p><a class="cc-link" href="experiments/practice-combat.html">Try a sample fighter</a></p></div>';
}
function renderCompanionView(){
  document.body.classList.remove("pm-fit");
  document.body.classList.add("cc-mode");
  document.title=(S.concept.name?S.concept.name+" — ":"")+"Combat Companion";
  const ready=charsReady();
  if(ready&&CC_ROLL&&!S.rollLog.includes(CC_ROLL))CC_ROLL=null;
  if(CC_ROLL)PM_EFFECT_ROLL_REF=CC_ROLL;
  let h='<div class="pm-wrap pmx cc" data-pm-style="stone" data-tab="'+CC_TAB+'">';
  if(!ready)h+=ccEmptyHTML();
  else{
    h+=ccHeaderHTML()+ccTableBarHTML();
    if(PM_MSG)h+='<p class="cc-warn" role="status">'+esc(PM_MSG)+'</p>';
    h+='<div class="cc-main">'+(CC_TAB==="body"?ccBodyTabHTML():ccCombatTabHTML())+'</div>';
  }
  h+='<nav class="pmx-phonebar cc-tabbar" aria-label="Companion sections">'
   +(ready?[["combat","Combat",PM_PHONE_ICONS.combat],["body","Body",PM_PHONE_ICONS.body]].map(([k,l,ic])=>'<button type="button" class="pmx-tab'+(CC_TAB===k?" on":"")+'"'+(CC_TAB===k?' aria-current="page"':'')+' onclick="APP.ccTab(\''+k+'\')">'+(ic||"")+l+'</button>').join(""):'')
   +'<button type="button" class="pmx-tab cc-exit" onclick="APP.ccExit()">'+ccIcon('<path d="M10 6H5v13h13v-5M14 4h6v6M20 4l-9 9"/>',22)+'Full site</button></nav>';
  h+=ccSwitcherHTML()+'</div>';
  $("#main").innerHTML=h;
  // The dice tray belongs to the full Play Mode; rolls made here are not replayed there.
  (S.rollLog||[]).forEach(r=>PM_DICE_SEEN.add(r));
  PM_DICE_S=S;PM_DICE_DAMAGE=null;
  if(typeof pmDiceHide==="function")pmDiceHide();
}

// ---- Actions ----
function ccGuard(role){
  const nope=fatigueNoActivity();if(nope)return nope;
  if(typeof sorceryCastingGuard==="function"){const g=sorceryCastingGuard(role==="attack"?"attack":"reactive");if(g)return g;}
  return null;
}
function ccSpendAP(){const v=charVitals();if(v.maxAP-v.apUsed<1)return false;S.play.apUsed=v.apUsed+1;return true;}
Object.assign(APP,{
  ccEnter(){if(VIEW_ONLY)return;ccSetPref("on","on");CC_TAB="combat";render();if(typeof window!=="undefined"&&window.scrollTo)window.scrollTo(0,0);},
  ccExit(){ccSetPref("on","off");CC_SWITCH=false;document.body.classList.remove("cc-mode");render();},
  ccTab(t){if(t!=="combat"&&t!=="body")return;CC_TAB=t;render();},
  ccToggleHints(){ccSetPref("hints",ccHints()?"off":"on");render();},
  ccDice(k){if(k!=="app"&&k!=="physical")return;ccSetPref("dice",k);CC_PENDING=null;render();},
  ccWeapon(n){if(!ccWeapons().includes(n))return;CC_WEAPON=n;CC_AP_WARN=null;render();},
  ccStyle(n,key){if(!ccStyleFor(n).choices.some(s=>s.key===key))return;CC_STYLE[n]=key;render();},
  ccGrade(g){if(!CC_GRADES.some(x=>x[0]===g))return;APP.setGrade(g);},
  ccNewRound(){CC_AP_WARN=null;APP.playNewRound();},
  ccFxInfo(name){CC_FX_OPEN=CC_FX_OPEN===name?null:name;render();},
  ccAction(role){
    if(viewOnlyBlock()||!["attack","parry","evade"].includes(role))return;
    const name=ccWeapon(),w=ccWeaponDef(name),st=role==="evade"?ccEvade():ccStyleFor(name);
    if(role==="parry"&&!weaponCanParry(w))return;
    const v=charVitals();
    if(v.maxAP-v.apUsed<1&&CC_AP_WARN!==role){CC_AP_WARN=role;render();return;}
    CC_AP_WARN=null;
    const block=ccGuard(role);if(block){PM_MSG=block;render();return;}
    const g=ccPctFor(st);
    if(g.pct===null){PM_MSG=g.grade==="automatic"?"Automatic — no roll needed, it just succeeds.":"Hopeless — no attempt can be made at this Grade.";render();return;}
    PM_MSG=null;CC_FX_OPEN=null;CC_HITLOC=null;
    const spent=ccSpendAP();
    if(ccDiceMode()==="physical"){
      CC_PENDING={role,weapon:role==="evade"?null:name,key:st.key,fam:st.fam,pct:g.pct,grade:g.grade,spent,
        label:role==="evade"?"Evade":name+" — "+st.name,pctText:g.pct+"%"};
      CC_ROLL=null;render();return;
    }
    const before=S.rollLog[0];
    if(role==="evade")APP.roll("std:Evade");
    else APP.rollWithWeapon(name,st.key,st.fam,role==="attack"?"attack":"defence");
    if(S.rollLog[0]===before){if(spent)S.play.apUsed=Math.max(0,S.play.apUsed-1);render();return;}
    CC_ROLL=S.rollLog[0];PM_EFFECT_ROLL_REF=CC_ROLL;render();},
  ccCancelPending(){const p=CC_PENDING;if(!p)return;if(p.spent)S.play.apUsed=Math.max(0,S.play.apUsed-1);CC_PENDING=null;render();},
  // Physical dice: the player rolled at the table and taps the result.
  ccPhysical(tier){
    const p=CC_PENDING;if(!p||!CC_TIERS.includes(tier)||viewOnlyBlock())return;
    CC_PENDING=null;
    const tag=p.grade!=="standard"?" ("+GRADE_LABEL[p.grade]+")":"";
    const xpKey=p.role==="evade"?"std:Evade":(p.key&&!p.fam?p.key:null);
    if(xpKey){if(tier==="Fumble"&&!S.xp.fumbled.includes(xpKey))S.xp.fumbled.push(xpKey);if(tier==="Critical")APP.markChecked(xpKey);}
    if(p.role!=="attack"&&S.play.sorceryCasting)S.play.sorceryCasting.reacted=true;
    const entry=p.role==="evade"
      ?{label:"Evade"+tag,pct:p.pct,roll:"—",tier,combat:true,combatKind:"evade",combatRole:"defence",oppTier:null,physical:true}
      :{label:p.label+tag,pct:p.pct,roll:"—",tier,combat:true,combatKind:"style",combatRole:p.role==="attack"?"attack":"defence",oppTier:null,weapon:p.weapon,styleKey:p.key||null,fam:p.fam||"",physical:true};
    PM_DICE_SEEN.add(entry);
    S.rollLog.unshift(entry);S.rollLog=S.rollLog.slice(0,8);
    CC_ROLL=entry;PM_EFFECT_ROLL_REF=entry;render();},
  ccRollDamage(){const r=ccRoll();if(!r)return;APP.playRollDamage(S.rollLog.indexOf(r));},
  ccHitLoc(){const n=d(20);CC_HITLOC={d20:n,loc:CombatRules.hitLocation(n)};render();},
  ccCondition(k){if(viewOnlyBlock()||!CC_CONDITIONS.some(c=>c[0]===k))return;
    const on=ccConditions().slice(),i=on.indexOf(k);if(i>=0)on.splice(i,1);else on.push(k);S.play.conditions=on;render();},
  ccLoc(loc){if(!playHPLocs().includes(loc))return;CC_LOC=CC_LOC===loc?null:loc;PM_DMG_NOTE=null;render();},
  ccStep(id,dlt){const el=document.getElementById(id);if(!el)return;const v=Math.max(0,Math.min(99,(Number(el.value)||0)+dlt));el.value=v?String(v):"";},
  ccRawDamage(loc){const el=document.getElementById("playdmg-"+loc.replace(/\s+/g,"_"));const n=el?Number(el.value):NaN;
    if(!Number.isSafeInteger(n)||n<=0)return;PM_DMG_NOTE={loc,raw:n,ap:0,applied:n};APP.playQuickDamage(loc,n);},
  ccSwitcher(open){CC_SWITCH=!!open;render();if(CC_SWITCH&&LIB_CACHE==null&&typeof loadLibraryUnified==="function")loadLibraryUnified();},
  ccSwitchTo(id){CC_SWITCH=false;CC_ROLL=null;CC_PENDING=null;CC_LOC=null;CC_WEAPON=null;CC_STYLE={};APP.openCharToPlay(id);},
  ccWake(){CC_WAKE_WANT=!CC_WAKE_WANT;if(!CC_WAKE_WANT&&CC_WAKE){const w=CC_WAKE;CC_WAKE=null;w.release().catch(()=>{});render();return;}ccWakeTake();}
});
// Keep Screen On (Wake Lock API, where the browser has it). The browser drops
// the lock when the page is hidden, so it is taken again on return.
async function ccWakeTake(){
  if(typeof navigator==="undefined"||!navigator.wakeLock||!CC_WAKE_WANT||CC_WAKE)return;
  if(!CC_WAKE_BOUND&&typeof document.addEventListener==="function"){CC_WAKE_BOUND=true;
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")ccWakeTake();});}
  try{CC_WAKE=await navigator.wakeLock.request("screen");
    CC_WAKE.addEventListener("release",()=>{CC_WAKE=null;if(APPVIEW==="play"&&ccActive())render();});}
  catch(e){CC_WAKE=null;CC_WAKE_WANT=false;PM_MSG="This browser would not keep the screen on.";}
  if(APPVIEW==="play"&&ccActive())render();
}
