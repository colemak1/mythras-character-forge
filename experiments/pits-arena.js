// The Pits arena screen (the-pits-mythras layout, adapted to the Forge engine,
// owner request 2026-11-11). PRESENTATION ONLY: this file lays out what the
// engine already knows (state S, the pending decision, the dice request R,
// the replay V) as fighter plates, a round strip, a dice tray, a command deck
// and two modals. Every button it draws carries the engine's own data-act and
// data-val, so the engine's click handler does the work. No rules live here.
// Opt back into the old layout with ?layout=classic.

const PA_CLASSIC=(()=>{try{return /[?&]layout=classic\b/.test(location.search);}catch(e){return false;}})();
const PA_ZONES={
  Head:'<circle cx="60" cy="22" r="17"/>',Chest:'<rect x="38" y="44" width="44" height="42" rx="7"/>',
  Abdomen:'<rect x="42" y="88" width="36" height="34" rx="7"/>',
  'Right Arm':'<rect x="14" y="46" width="20" height="74" rx="9"/>','Left Arm':'<rect x="86" y="46" width="20" height="74" rx="9"/>',
  'Right Leg':'<rect x="38" y="126" width="20" height="72" rx="9"/>','Left Leg':'<rect x="62" y="126" width="20" height="72" rx="9"/>'};
const PA_ZT={Head:[60,26],Chest:[60,70],Abdomen:[60,110],'Right Arm':[24,88],'Left Arm':[96,88],'Right Leg':[48,166],'Left Leg':[72,166]};
const PA_WOUND={ok:'',minor:' hurt',serious:' serious',major:' major'};
const paOn=()=>!PA_CLASSIC&&typeof document!=='undefined';
function pitsArenaOn(){return paOn();}
const PA={auto:false,wired:false,autoTimer:0};
const paHuman=id=>S.fighters?.[id]?.kind==='human';
const paView=()=>(pitsPresenting()&&V.shown&&V.shown.a)?V.shown:S.fighters;

// Body map: seven zones coloured by the engine's wound level, with HP and armour.
// pick: draw each zone as a button that answers the engine's Choose Location.
function paZonesSvg(f,pick){
  return HIT_LOCS.map(loc=>{
    const lvl=zoneClass(f,loc),hit=V.impact?.target===f.id&&V.impact.location===loc;
    const name=pick?`data-act="pickloc" data-val="${esc(loc)}" role="button" tabindex="0" aria-label="Strike ${esc(loc)}, armour ${armourAt(f,loc)}"`
      :`role="img" aria-label="${esc(loc)}: ${f.hp[loc]} of ${f.maxHp[loc]} hit points, armour ${armourAt(f,loc)}, ${lvl==='ok'?'unhurt':lvl}"`;
    return `<g class="zone${PA_WOUND[lvl]||''}${hit?' pa-flash':''}" ${name}>${PA_ZONES[loc]}`
      +`<text x="${PA_ZT[loc][0]}" y="${PA_ZT[loc][1]}">${f.hp[loc]}</text>`
      +`<text class="a" x="${PA_ZT[loc][0]}" y="${PA_ZT[loc][1]+11}">A${armourAt(f,loc)}</text></g>`;
  }).join('');
}
function paConditions(f){
  const chips=[];
  const add=(t,bad)=>chips.push(`<span class="chip${bad?'':' soft'}">${esc(t)}</span>`);
  // (Prone follows the figure on the stage when the stage draws the fall later than the engine rules it)
  const shown=typeof pitsStageShownProne==='function'&&f.id?pitsStageShownProne(f.id):null;
  if(shown==null?f.prone:shown)add('Prone',1);
  if(f.bleeding)add('Bleeding',1);
  if(f.fatigue>0)add(FATIGUE_NAMES[f.fatigue]);
  if(f.disarmed)add('Disarmed',1);
  if(f.impaledWounds?.length)add('Impaled',1);
  if(f.pinnedGear)add('Pinned '+f.pinnedGear,1);
  if(entangledLoc(f))add('Entangled',1);
  if(Object.keys(f.stunnedLocations||{}).length)add('Stunned',1);
  if(f.blindedTurns)add('Blinded',1);
  if(f.braced)add('Braced');
  for(const loc of HIT_LOCS){const l=zoneClass(f,loc);if(l==='serious'||l==='major')add((l==='major'?'Major: ':'Serious: ')+loc,1);}
  return chips.length?chips.join(''):'<span class="chip none">No conditions</span>';
}
function paPlateHtml(id){
  const f=paView()[id],w=ARENA_WEAPONS[f.weapon]||{};
  const total=HIT_LOCS.reduce((n,l)=>n+Math.max(0,f.hp[l]),0),max=HIT_LOCS.reduce((n,l)=>n+f.maxHp[l],0);
  const acting=!V.busy&&S.order?.[S.turnIndex]===id&&S.phase==='fight';
  const pips=Array.from({length:f.apMax},(_,i)=>`<span class="pip${i<f.ap?' on':''}"></span>`).join('');
  const label=id==='a'?(S.mode==='pvp'?'Player one':'You'):(S.mode==='pvp'?'Player two':'Opponent');
  return `<aside class="plate ${id==='a'?'you':'foe'}${acting?' acting':''}" aria-label="${esc(label)}: ${esc(f.name)}">
    <div class="p-head"><div class="p-name"><i class="p-dot"></i>${esc(f.name)}</div>
      <div class="p-wp">${esc(f.disarmed?'Unarmed':(w.name||f.weapon))}${f.shield!=='none'?' · '+esc(SHIELDS[f.shield].name):''} · Reach ${esc(reachName(f))}</div>
      <div class="p-sk">Combat Style ${f.style}% · Evade ${f.evade}% · Init ${f.initiative??'—'}</div></div>
    <div class="p-body"><svg class="body-svg" viewBox="0 0 120 200" role="group" aria-label="${esc(f.name)} hit locations">${paZonesSvg(f)}</svg>
      <div class="p-r"><div class="row"><span class="lab">AP</span>${pips}</div>
        <div class="chips" aria-label="Conditions">${paConditions(f)}</div>
        <div class="tot"><b>${total}</b>/${max} HP total</div></div></div></aside>`;
}
function paStripHtml(){
  const ph=pitsPhase(),pill=PITS_PHASE_PILL[ph]||'',foe=['opponent','resolving'].includes(ph);
  const a=S.fighters.a,b=S.fighters.b;
  // "Engaged" unless one weapon's longer reach is actually controlling the range
  const range=S.disengaged?'Apart'+(S.gapMetres?' · '+S.gapMetres+' m':''):engagementInfo().active?'Reach advantage':'Engaged';
  const init=a.initiative!=null&&b.initiative!=null?`<div class="io" title="Initiative">Initiative: <b>${esc(a.name)}</b> ${a.initiative} · <b>${esc(b.name)}</b> ${b.initiative}</div>`:'';
  return `<div class="strip" role="status" aria-live="polite"><div class="row1"><span class="rd">Round <b>${S.round}</b></span><span class="sep"></span>
    <span class="ph${foe?' foe':''}">${esc(pill)}</span><span class="sep"></span><span class="rg">${esc(range)}</span></div>${init}</div>`;
}

// ---- Exchanges, from the engine's log: the newest is "current", the one before "previous" ----
const PA_BREAK=/^(Round |Encounter|Regain Footing|Brace|Delay|Dither|Stand Fast|Move to|Ready Weapon|Pick Up|Pin Weapon|Entangle|FIGHT)|changes range/;
const paVisibleLogs=()=>pitsPresenting()?(S.logs||[]).slice(0,V.visibleCount):(S.logs||[]);
function paExchanges(){
  const out=[];let cur=null;
  for(const l of paVisibleLogs()){
    if(l.meta&&l.meta.exid&&/(?: attacks| makes a Remise attack| strikes with the shield)$/.test(l.title)){cur={exid:l.meta.exid,atk:l.meta.actor,entries:[l]};out.push(cur);}
    // a new bout (a new opponent, a new encounter) starts its own list: the last bout's exchanges are history only
    else if(/^(New Opponent|Encounter \d)/.test(l.title)){out.length=0;cur=null;}
    else if(PA_BREAK.test(l.title))cur=null;
    else if(cur)cur.entries.push(l);
  }
  return out;
}
const paSkillLine=l=>{
  const m=/^(\d+) (?:against Combat Style|vs) (\d+)%[^A-Z]*(CRITICAL|SUCCESS|FAILURE|FUMBLE)/.exec(String(l.body||''));
  return m?{roll:+m[1],pct:+m[2],grade:m[3].toLowerCase()}:null;
};
// Plain words and arithmetic for a resolved blow (from the engine's facts, never re-derived).
function paBlowLine(l){
  const px=l.meta&&l.meta.px;if(!px)return null;
  if(l.title==='No Damaging Hit'){
    const o=pitsStageOutcome({type:'deflect',px,evaded:px.evaded});
    return {head:{evaded:'Evaded',parried:'Parried',fumble:'Fumbled attack',miss:'Missed'}[o]||'No damage',math:'No damage.',kind:o};
  }
  const o=pitsStageOutcome({type:'hit',lost:l.meta.impact?l.meta.impact.hpLost:px.wound,px});
  const parts=[`${px.total} damage`];
  if(px.blocked)parts.push(`− ${px.blocked} ${px.blockedBy==='ward'?'shield ward':'parry'}`);
  if(px.armour)parts.push(`− ${px.armour} armour`);
  const head={wound:'Wounded','partial-parry':'Wounded through a parry','partial-ward':'Wounded through a ward','full-parry':'Parried','full-ward':'Stopped by the shield ward',armour:'Armour held',zero:'No damage'}[o];
  return {head:`${head} · ${px.loc}`,math:`${parts.join(' ')} = ${px.wound} HP lost${px.before!=null?` (${px.loc} ${px.before} → ${px.after})`:''}.`,kind:o};
}
function paExchangeResult(g){
  for(let i=g.entries.length-1;i>=0;i--){const b=paBlowLine(g.entries[i]);if(b)return b;}
  return null;
}
function paExchangeHtml(g,label,open){
  if(!g)return `<section class="xch"><h4>${label}</h4><p class="none">Nothing yet. The first exchange appears here.</p></section>`;
  const res=paExchangeResult(g),who=S.fighters[g.atk];
  const rows=g.entries.map(l=>`<li><b>${esc(l.title)}</b> <span>${esc(String(l.body||'').replace(/\s+/g,' ').trim())}</span></li>`).join('');
  return `<section class="xch ${open?'cur':'prev'}"><h4>${label} · ${esc(who?who.name:'')} attacks</h4>
    <div class="res">${res?`<b>${esc(res.head)}</b><span>${esc(res.math)}</span>`:'<b>In progress</b><span>Rolls are being resolved.</span>'}</div>
    <ul>${rows}</ul></section>`;
}
// The newest relevant result for the idle tray (never reverts to an earlier skill roll).
function paResultCard(){
  const logs=paVisibleLogs();
  for(let i=logs.length-1;i>=0;i--){
    const l=logs[i],b=paBlowLine(l);
    if(b){const who=S.fighters[l.meta.actor];
      return {title:'Result',sub:esc(b.head),who:paHuman(l.meta.actor)?'you':'foe',bar:'',res:`<span class="o-${b.kind==='wound'||/partial/.test(b.kind)?'fumble':'success'}">${esc(b.math)}</span>`};}
    const sk=/(attacks|strikes with the shield|parries( with shield)?|evades)$/.test(l.title)?paSkillLine(l):null;
    if(sk){const kind=sk.grade,mine=l.meta&&paHuman(l.meta.actor);
      return {title:'Last roll',sub:esc(l.title),who:mine?'you':'foe',bar:pitsBandHtml(sk.pct,sk.roll),
        res:`<span class="o-${kind}">${String(sk.roll).padStart(2,'0')} against ${sk.pct}% — ${PITS_ZONE_WORD[kind]}</span>`};}
  }
  return null;
}

// Dice tray: the engine's own dice (inline 3D tray, or the Roll button for a manual roll).
const paPct=label=>{const m=[...String(label||'').matchAll(/(\d{1,3})%/g)];return m.length?+m[m.length-1][1]:null;};
function paTrayHtml(){
  let title='Dice tray',sub='Rolls appear here',who='you',body='',bar='',res='',btn='',cls='';
  const defsOf=r=>r.defs.map(d=>d.sides===100?'d100':'d'+d.sides).join(' + ');
  if(V.replaying)return '';   // a replay of the fight shows the fight, not the dice
  if(V.busy&&V.roll){
    const r=V.roll,pct=paPct(r.label);
    title=rollHeading(r.label);who=paHuman(r.actor)?'you':'foe';sub=pct!=null?`Target <b>${pct}%</b>`:esc(defsOf(r));
    body='<div data-inline-dice></div>';
    if(pct!=null&&r.defs.length===1&&r.defs[0].sides===100)bar=pitsBandHtml(pct,r.settled?r.values[0]:null);
    cls=' live';
  }else if(R&&!V.busy){
    const pct=paPct(R.label);
    title=rollHeading(R.label);who=paHuman(R.actor)?'you':'foe';sub=pct!=null?`Target <b>${pct}%</b>${rollDifficultyHtml(R.actor)}`:esc(defsOf(R));
    body='<div class="r-dice">'+R.defs.map(d=>d.sides===100?'<div class="die d10 lg"><span>00</span></div><div class="die d10 lg"><span>0</span></div>':`<div class="die d${d.sides}"><span>?</span></div>`).join('')+'</div>';
    if(pct!=null&&R.defs.length===1&&R.defs[0].sides===100)bar=pitsBandHtml(pct,null);
    btn=`<button type="button" class="rbtn" data-act="roll" aria-label="Roll ${esc(defsOf(R))} now"><span>Roll ${esc(defsOf(R))}</span><kbd>Space</kbd></button>`;
    cls=' await';
  }else{
    const c=paResultCard();
    if(c){title=c.title;sub=c.sub;who=c.who;bar=c.bar;res=c.res;}
  }
  return `<div class="top"><section class="roll${cls}" data-who="${who}" aria-live="polite">
    <div class="r-t">${esc(title)}</div><div class="r-s">${sub}</div>${body}${bar?`<div class="sbar">${bar}</div>`:''}
    ${res?`<div class="r-res">${res}</div>`:''}${btn}</section></div>`;
}

// Modals: Special Effects and Choose Location, only when it is a person's decision.
function paModalHtml(){
  const p=S.pending;if(V.busy||!p||pitsPhase()!=='effects')return '';
  // the desktop deck (pits-bottom.js) shows these choices in its middle column instead of a window
  if(typeof pbOn==='function'&&pbOn())return '';
  if(p.kind==='effect'){
    const owner=S.fighters[p.owner];
    return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="paModalT"><div class="mbox">
      <h2 id="paModalT">${esc(owner.name)}: Special Effects</h2>
      <p class="s">${p.effectsLeft} to choose. They are chosen before the hit location and damage are rolled.</p>${effectChoicesHtml(p)}</div></div>`;
  }
  if(p.kind==='location'){
    const target=S.fighters[p.def];
    return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="paModalT"><div class="mbox narrow">
      <h2 id="paModalT">Choose Location</h2><p class="s">Where does the blow land on ${esc(target.name)}? HP and armour shown.</p>
      <div class="locbox"><svg viewBox="0 0 120 200" role="group" aria-label="Hit locations">${paZonesSvg(target,true)}</svg></div></div></div>`;
  }
  return '';
}
// Write html into el, replacing only the top-level children whose markup changed. Rewriting everything on every
// beat restarted CSS animations (chip pop, tray pulse) even when nothing in that element had changed.
function paPatch(el,html){
  const t=document.createElement('template');t.innerHTML=html;
  const next=[...t.content.children],cur=[...el.children];
  if(next.length!==cur.length||el.childNodes.length!==cur.length||t.content.childNodes.length!==next.length){el.innerHTML=html;return;}
  next.forEach((n,i)=>{if(cur[i].outerHTML!==n.outerHTML)cur[i].replaceWith(n);});
}
// The stage calls this when a figure is seen to go down inside a movement: only the condition chips are rewritten.
function pitsArenaConditions(){
  if(typeof document==='undefined'||!paOn()||typeof S==='undefined'||!S||!S.fighters)return;
  const v=paView(),set=(q,f)=>{const el=document.querySelector(q);if(!el||!f)return;const t=document.createElement('div');t.innerHTML=paConditions(f);if(el.innerHTML!==t.innerHTML)el.innerHTML=t.innerHTML;};
  set('#pitsStage .plate.you .chips',v.a);set('#pitsStage .plate.foe .chips',v.b);set('.btgt .chips',v.b);
}
function pitsArenaHud(){
  const hud=document.querySelector('#pitsStage .ps-hud'),bar=document.querySelector('#pitsStage .pa-bar');if(!hud)return;
  const on=paOn()&&['fight','between','over'].includes(S.phase);
  document.body.classList.toggle('pa-on',on);
  document.body.dataset.bottom=typeof pitsBottomLayout==='function'?pitsBottomLayout():'current';
  if(!on){hud.innerHTML='';if(bar){bar.innerHTML='';delete bar.dataset.html;}return;}
  if(bar){const bh=pitsArenaBarHtml();if(bar.dataset.html!==bh){bar.innerHTML=bh;bar.dataset.html=bh;pitsArenaBarWire();}}
  paPatch(hud,paPlateHtml('a')+paPlateHtml('b')+paStripHtml()+paTrayHtml()+paModalHtml());
  if(!PA.wired){
    PA.wired=true;const box=document.getElementById('pitsStage');
    box.addEventListener('click',e=>decoratedClick(e));
    box.addEventListener('keydown',e=>{
      const z=e.target.closest?.('g.zone[data-act]');
      if(z&&(e.key==='Enter'||e.key===' ')){e.preventDefault();decoratedClick({target:z});}
    });
    document.addEventListener('keydown',e=>{
      if(e.code!=='Space'||!R||V.busy||/^(BUTTON|INPUT|SELECT|TEXTAREA|A|SUMMARY)$/.test(e.target.tagName||''))return;
      e.preventDefault();decoratedClick({target:document.querySelector('#pitsStage [data-act="roll"]')||document.body});
    });
  }
  const dlg=hud.querySelector('.modal');
  if(dlg&&!dlg.dataset.focused){dlg.dataset.focused='1';(dlg.querySelector('button,[tabindex]'))?.focus({preventScroll:true});}
  paFocus();
  // Auto-roll: press the Roll button for the player after a short beat.
  clearTimeout(PA.autoTimer);
  if(PA.auto&&R&&!V.busy)PA.autoTimer=setTimeout(()=>{if(PA.auto&&R&&!V.busy)decoratedClick({target:document.querySelector('#pitsStage [data-act="roll"]')||document.body});},350);
}

// Move focus (and, if needed, the page) to the decision only when it changes, as the engine does.
let paFocusKey='';
function paFocus(){
  if(S.phase!=='fight'||V.busy)return;
  const key=R?'roll:'+R.id:S.pending?'p:'+S.round+':'+S.cycle+':'+S.turnIndex+':'+S.pending.kind+':'+(S.pending.effectsLeft??''):'a:'+S.round+':'+S.cycle+':'+S.turnIndex;
  if(key===paFocusKey)return;paFocusKey=key;
  requestAnimationFrame(()=>{
    if(S.phase!=='fight'||V.busy)return;
    const modal=document.querySelector('#pitsStage .modal');
    const pick=['#root .prompt .choice:not(:disabled)','#root .act:not(:disabled)','#root .bfx','#root .brow.def:not(.off)','#root .brow.sel','#root .brow:not(.off)'];
    const target=modal?null:R?document.querySelector('#pitsStage [data-act="roll"]'):pick.map(q=>document.querySelector(q)).find(Boolean);
    if(!target)return;
    target.focus({preventScroll:true});
    const box=(R?document.getElementById('pitsStage'):target).getBoundingClientRect();
    if(box.top<0||box.bottom>innerHeight-60)target.scrollIntoView({block:R?'center':'nearest',behavior:V.reduced?'auto':'smooth'});
  });
}
// Command deck (inside #root): actions, prompt and exchange breakdown, chronicle.
const PA_ACT_SHORT={attack:'Attack',shieldAttack:'Shield Strike',changeRange:'Change Range',brace:'Brace',delay:'Delay',dither:'Dither',stand:'Regain Footing',yield:'Concede Bout'};
function paActionsHtml(){
  const phase=pitsPhase(),id=phase==='action'&&paHuman(S.order?.[S.turnIndex])?S.order[S.turnIndex]:'a';
  const f=S.fighters[id],live=phase==='action',list=pitsLegalActions(id);
  const pips=Array.from({length:f.apMax},(_,i)=>`<span class="pip${i<f.ap?' on':''}"></span>`).join('');
  const rows=list.map(a=>{
    const help=typeof actionChoiceHelp==='function'?actionChoiceHelp(a.act,f):'';
    const on=live&&a.enabled;
    return `<button type="button" class="act${a.act==='delay'?' hold':''}${a.act==='yield'?' danger':''}" data-act="${a.act}" title="${esc(live&&!a.enabled&&a.reason?a.reason:help)}" ${on?'':'disabled'}>
      <span><b>${esc(a.label)}</b><small>${esc(live&&!a.enabled&&a.reason?a.reason:help)}</small></span><span class="cst">${a.ap?a.ap+' AP':'free'}</span></button>`;
  }).join('');
  return `<h3><span>${live?(S.mode==='pvp'?esc(f.name)+': your turn':'Your turn'):'Actions'}</span><span class="pp">${pips}</span></h3>${rows}`;
}
function paPromptHtml(){
  const phase=pitsPhase(),f=S.fighters[S.order?.[S.turnIndex]]||S.fighters.a;
  if(V.busy)return `<div class="prompt"><h4>${V.replaying?'Replaying the fight':'Resolving the exchange'}</h4>${presentationControlsHtml()}</div>`;
  if(S.phase==='between'||S.phase==='over')return `<div class="prompt end">${actionHtml()}</div>`;
  if(phase==='rolling')return `<div class="prompt"><h4>Roll the dice</h4><p>Press <b>Roll</b> in the dice tray (or Space). The target is shown there.</p></div>`;
  if(phase==='action')return `<div class="prompt"><h4>${S.mode==='pvp'?esc(f.name)+', your move':'Your move'}</h4><p>You have <b>${f.ap} AP</b>. Choose an action on the left.</p>${paHelp()}</div>`;
  if(phase==='opponent')return `<div class="prompt"><h4>${esc(f.name)} acts</h4><p>The opponent's dice resolve automatically; you will be asked to react when it matters.</p></div>`;
  if(phase==='effects'&&['effect','location'].includes(S.pending?.kind))return `<div class="prompt"><h4>Choose in the window</h4><p>A decision is waiting in the window over the arena.</p></div>`;
  return `<div class="prompt">${actionHtml()}</div>`;
}
// Optional help stays out of the way until asked for.
function paHelp(){
  const g=typeof combatGuideHtml==='function'?combatGuideHtml():'';
  return g?`<details class="pa-help"><summary>How this turn works</summary>${g}</details>`:'';
}
function pitsArenaDeckHtml(){
  // an alternative bottom layout (pits-bottom.js), when one is chosen
  const alt=typeof pitsBottomDeckHtml==='function'?pitsBottomDeckHtml():'';
  if(alt)return alt;
  const ex=paExchanges(),cur=ex[ex.length-1],prev=ex[ex.length-2];
  return `<div class="deck" aria-label="Command deck">
    <div class="acts" role="group" aria-label="Your actions">${paActionsHtml()}</div>
    <div class="mid">${paPromptHtml()}
      <div class="xchs" aria-live="polite">${paExchangeHtml(cur,'Current exchange',true)}${prev?paExchangeHtml(prev,'Previous exchange',false):''}</div></div>
    <div class="chron pa-chron">${combatHistory({deck:true})}</div></div>`;
  // (the result dialog has one owner: render() in practice-combat.html appends it after the arena)
}
function pitsArenaBarHtml(){
  const bout=typeof pitsBoutBarHtml==='function'?pitsBoutBarHtml():'';
  return `<div class="pa-title"><h1>The Pits</h1><span class="pill">${esc(modeName(S.mode))}</span></div>
    <div class="pa-tools">${guidanceToggleHtml()}<button type="button" class="toolbutton" data-pa="auto" aria-pressed="${PA.auto}">Auto-roll ${PA.auto?'on':'off'}</button>
    <button type="button" class="toolbutton" data-act="help">Rules</button>
    <button type="button" class="toolbutton pacebutton" data-act="speed" aria-label="Toggle combat presentation pace" aria-pressed="${V.quick}">${V.quick?'Quick pace':'Standard pace'}</button>
    ${typeof pitsLostButtonHtml==='function'?pitsLostButtonHtml():''}
    ${typeof PitsReport!=='undefined'?'<button type="button" class="toolbutton" data-pa="report" title="Say what went wrong; it is saved with this fight\'s record for Claude and ChatGPT">Report fight</button>':''}
    <button type="button" class="toolbutton" data-pa="fs" aria-pressed="${!!document.fullscreenElement}">Full screen</button>
    <button type="button" class="toolbutton" data-act="reset">Exit battle</button></div>${bout}`;
}
function pitsArenaBarWire(){
  const b=document.querySelector('[data-pa="auto"]');
  if(b&&!b.dataset.wired){b.dataset.wired='1';b.addEventListener('click',()=>{PA.auto=!PA.auto;render();});}
  // Report fight (owner, 2026-11-14): replaces Copy fight record; copying stays inside the report window
  const rep=document.querySelector('[data-pa="report"]');
  if(rep&&!rep.dataset.wired){rep.dataset.wired='1';rep.addEventListener('click',()=>PitsReport.open(pitsFightRecord(),pitsCopyRecord));}
  const fs=document.querySelector('[data-pa="fs"]');
  if(fs&&!fs.dataset.wired){fs.dataset.wired='1';fs.addEventListener('click',()=>{
    try{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();if(p&&p.then)p.then(render,()=>{});}catch(e){}
  });}
}
// The spring trial's fight record, for reporting a fault: the dice and rulings in the order they were presented, the
// engine's log in its own order, and what the stage drew (declared actions, blows, contacts) with its clock. Copied
// to the clipboard; if the browser refuses, shown in a box to copy by hand.
function pitsFightRecord(){
  const sh=e=>e.roll?{roll:[e.roll.actor,e.roll.label,e.roll.values]}:e.checkpoint?{cp:1}:{id:e.id,t:e.title,b:e.body};
  const stage=(window.__psRecord||[]).map(r=>[r.c,r.type,r.kind||r.outcome||r.how||'',r.actor||'',r.target||'',r.loc||'',r.lost||0]);
  return JSON.stringify({record:'pits-spring-1',at:new Date().toISOString(),page:location.search,ua:navigator.userAgent,
    config,mode:S.mode,guidance:!!V.guidance,quick:!!V.quick,auto:!!PA.auto,bottom:document.body.dataset.bottom||'',
    fighters:{a:{name:S.fighters.a.name,weapon:S.fighters.a.weapon,shield:S.fighters.a.shield},b:{name:S.fighters.b.name,weapon:S.fighters.b.weapon,shield:S.fighters.b.shield}},
    presented:(V.tape||[]).map(sh),log:(S.logs||[]).map(l=>({id:l.id,t:l.title,b:l.body})),stage,
    // the moments a player pressed "What just happened?" in this bout (pits-lost.js)
    lost:typeof plMarks==='function'?plMarks():[]});
}
// (text: the record taken when the report window opened; the button shows Copied for a moment)
function pitsCopyRecord(text){
  const btn=document.querySelector('#paReport [data-r=copy]');text=text||pitsFightRecord();
  const done=()=>{if(!btn)return;btn.textContent='Copied';setTimeout(()=>{btn.textContent='Copy the fight record';},2000);};
  const box=()=>{document.getElementById('paRecord')?.remove();const d=document.createElement('div');d.id='paRecord';d.className='modal pa-rules';
    d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','Fight record');
    d.innerHTML='<div class="mbox"><h2>Fight record</h2><p>Copy all of this and paste it to Claude.</p><textarea readonly rows="12" style="width:100%"></textarea><p class="pa-rules-close"><button type="button" class="toolbutton">Close</button></p></div>';
    d.querySelector('textarea').value=text;d.querySelector('button').addEventListener('click',()=>d.remove());document.body.append(d);d.querySelector('textarea').select();};
  try{navigator.clipboard.writeText(text).then(done,box);}catch(e){box();}
}
// The battle is one screen with no page scroll, so the rules notes and the Special Effects
// catalogue (which sit below the fold outside a fight) open in a window instead.
function pitsArenaRules(){
  if(!document.body.classList.contains('pa-on'))return false;
  document.getElementById('paRules')?.remove();
  const notes=document.querySelector('#root .footer-notes'),fx=document.querySelector('#root .effects-reference');
  const part=d=>d?`<h3>${esc(d.querySelector('summary')?.textContent||'')}</h3>${[...d.children].filter(c=>c.tagName!=='SUMMARY').map(c=>c.outerHTML).join('')}`:'';
  const box=document.createElement('div');box.id='paRules';box.className='modal pa-rules';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.setAttribute('aria-label','Rules');
  box.innerHTML=`<div class="mbox"><h2>Rules</h2>${part(notes)}${part(fx)}<p class="pa-rules-close"><button type="button" class="toolbutton" data-pa="rules-close">Close</button></p></div>`;
  const close=()=>{box.remove();document.querySelector('[data-act="help"]')?.focus?.({preventScroll:true});};
  box.addEventListener('click',e=>{if(e.target===box||e.target.closest('[data-pa="rules-close"]'))close();});
  box.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  document.body.append(box);box.querySelector('button').focus({preventScroll:true});
  return true;
}

// Outside a fight (setup, opponent intro) the arena is hidden and the site navigation returns.
function pitsArenaIdle(){
  if(typeof S==='undefined'||!S||['fight','between','over'].includes(S.phase))return;
  if(document.body)document.body.classList.remove('pa-on');
  if(typeof pitsStageSync==='function')pitsStageSync();
}
