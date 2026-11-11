// The Pits: five alternative layouts for the bottom third of the battle screen
// (owner request 2026-11-11; mockups: A Command bar, B Duel table, C Ground dock,
// D Step flow, E Odds first). PRESENTATION ONLY, like pits-arena.js: every number
// comes from the engine (pitsLegalActions, combatTarget, evadeTarget, the exchange
// log) and every button that does something carries the engine's own data-act.
// The two-step layouts (D, E) keep a local "selected action" and only the confirm
// button sends the real act. The old layout stays the default ("current").
// The switcher is temporary: the owner removes it once one layout is picked.
// Choose with the Bottom list in the top bar, or open the page with ?bottom=A.

const PB_LAYOUTS=[['current','Current'],['A','A · Command bar'],['B','B · Duel table'],['C','C · Ground dock'],['D','D · Step flow'],['E','E · Odds first']];
const PB_KEY='sitota-pits-bottom-layout';
const PB={sel:null,turnKey:'',layout:null,wired:false};
const PB_ICON={
  attack:'M5 19L18 6M18 6h-5M18 6v5M4 16l4 4',shieldAttack:'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z M9 11h6',
  brace:'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',dither:'M3 12c3-5 6 5 9 0s6 5 9 0',delay:'M8 5v14M16 5v14',
  changeRange:'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4',stand:'M12 20V5M6 11l6-6 6 6',yield:'M6 21V4M6 4h11l-2 4 2 4H6'};
const pbIcon=act=>`<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PB_ICON[act]||'M12 5v14M5 12h14'}"/></svg>`;

// The layout in use: a choice made in this page, then ?bottom=, then the saved choice. Phones keep the current layout.
function pitsBottomLayout(){
  try{if(window.matchMedia&&matchMedia('(max-width:900px)').matches)return 'current';}catch(e){}
  if(PB.layout)return PB.layout;
  let v='current';
  try{
    const q=/[?&]bottom=([A-Ea-e]|current)\b/.exec(location.search);
    if(q)v=q[1].length===1?q[1].toUpperCase():'current';
    else{const s=localStorage.getItem(PB_KEY);if(PB_LAYOUTS.some(l=>l[0]===s))v=s;}
  }catch(e){}
  return v;
}
function pitsBottomSelectHtml(){
  const cur=pitsBottomLayout();
  return `<label class="pa-bl"><span>Bottom</span><select data-pa="layout" aria-label="Bottom layout">${PB_LAYOUTS.map(([k,n])=>`<option value="${k}"${k===cur?' selected':''}>${esc(n)}</option>`).join('')}</select></label>`;
}

// ---- what every layout shows ----
// Number keys follow this order (the mockups': Attack first, Concede last), not the engine's list order.
const PB_ORDER=['attack','shieldAttack','brace','dither','delay','changeRange','stand'];
const pbRank=a=>{const i=PB_ORDER.indexOf(a.act);return a.act==='yield'?999:i<0?100:i;};
const pbOrder=list=>list.map((a,i)=>[a,i]).sort((x,y)=>pbRank(x[0])-pbRank(y[0])||x[1]-y[1]).map(x=>x[0]);
const PB_MSG={action:'Choose an action',opponent:'Opponent acts',reaction:'Choose your defense',rolling:'Roll the dice',effects:'Choose a Special Effect',
  resist:'Resist',resolving:'Resolving the exchange',recap:'Bout over',intro:'Next opponent'};
function pbCtx(){
  const phase=pitsPhase(),turn=S.order?.[S.turnIndex];
  const id=phase==='action'&&paHuman(turn)?turn:'a',me=S.fighters[id],foe=S.fighters[id==='a'?'b':'a'];
  const list=pbOrder(pitsLegalActions(id)),live=phase==='action'&&!V.busy;
  // a new turn forgets the last selection; the default is Attack, then the first action that can be taken
  const key=S.round+':'+S.cycle+':'+S.turnIndex+':'+id;
  if(PB.turnKey!==key){PB.turnKey=key;PB.sel=null;}
  const on=list.filter(a=>a.enabled);
  const sel=on.find(a=>a.act===PB.sel)||on.find(a=>a.act==='attack')||on[0]||null;
  return {phase,id,me,foe,list,live,sel,showPrompt:!!V.busy||!['action','opponent'].includes(phase)};
}
const pbCost=a=>a.ap?a.ap+' AP':'free';
const pbHelp=(a,c)=>{
  const help=typeof actionChoiceHelp==='function'?actionChoiceHelp(a.act,c.me):'';
  return c.live&&!a.enabled&&a.reason?a.reason:help;
};
const pbPips=f=>`<span class="bpips" aria-label="${f.ap} of ${f.apMax} action points">${Array.from({length:f.apMax},(_,i)=>`<i class="${i<f.ap?'on':''}"></i>`).join('')}</span>`;
const pbPrompt=()=>`<div class="bprompt">${paPromptHtml()}</div>`;
const pbCount=()=>paVisibleLogs().length;
const pbHistBtn=(label)=>`<button type="button" class="toolbutton bhist" data-pa="history">${label} · ${pbCount()}</button>`;
function pbHead(c,{history=true,title}={}){
  const pill=PITS_PHASE_PILL[c.phase]||'';
  return `<div class="b-head"><span class="turnpill${c.phase==='action'?'':' idle'}"><i></i>${esc(pill)}</span>${pbPips(c.me)}<span class="b-ap">${c.me.ap} AP left</span>
    <span class="b-msg">${esc(title||(S.mode==='pvp'&&c.phase==='action'?c.me.name+': ':'')+(PB_MSG[c.phase]||''))}</span><span class="spacer"></span>${history?pbHistBtn('Full history'):''}</div>`;
}

// One action as a card (A, B).
function pbCard(a,i,c){
  const on=c.live&&a.enabled,txt=pbHelp(a,c);
  return `<button type="button" class="bact${a.act==='attack'?' primary':''}${a.act==='yield'?' danger':''}${a.act==='delay'?' hold':''}" data-act="${a.act}" title="${esc(txt)}" ${on?'':'disabled'}>
    <span class="bt"><kbd>${i<9?i+1:''}</kbd><span class="chip">${pbCost(a)}</span></span><span class="bn">${esc(a.label)}</span><span class="bd">${esc(txt)}</span></button>`;
}

// ---- the last exchange, from the engine's log ----
const PB_ROLL=/(attacks|strikes with the shield|makes a Remise attack|parries( with shield)?|evades)$/;
function pbLast(){
  const ex=paExchanges(),g=ex[ex.length-1];
  if(!g)return null;
  const rolls=[];
  for(const l of g.entries){
    if(!PB_ROLL.test(l.title))continue;
    const m=/^(\d+)\s+(?:against|vs)\s+[^0-9]*?(\d+)%[^A-Za-z]*(CRITICAL|SUCCESS|FAILURE|FUMBLE)/i.exec(String(l.body||''));
    if(m)rolls.push({side:l.meta&&l.meta.actor,title:l.title,roll:+m[1],pct:+m[2],grade:m[3].toLowerCase()});
  }
  const last=g.entries[g.entries.length-1]||{};
  return {g,rolls,res:paExchangeResult(g),round:last.round,cycle:last.cycle};
}
const pbGradeChip=r=>`<span class="chip g-${r.grade}">${esc(r.grade)}</span>`;
const pbNone='<p class="bnone">Nothing yet. The first exchange appears here.</p>';

// ---- A · Command bar ----
function pbA(c,last){
  const steps=last?last.rolls.map(r=>`<span class="bstep">${esc(r.title)} <em>${r.roll} vs ${r.pct}%</em>${pbGradeChip(r)}</span>`).join('<span class="arr">→</span>'):'';
  const res=last?(last.res?`<span class="bres"><b>${esc(last.res.head)}</b> · ${esc(last.res.math)}</span>`:'<span class="bres">In progress…</span>'):'';
  return `<div class="bdeck bA" aria-label="Command deck">${pbHead(c)}
    <div class="bA-row" role="group" aria-label="Your actions">${c.showPrompt?pbPrompt():c.list.map((a,i)=>pbCard(a,i,c)).join('')}</div>
    <div class="bA-last" aria-live="polite"><span class="lbl">Last</span>${last?steps+(steps?'<span class="arr">→</span>':'')+res:'<span class="bnone">Nothing yet. The first exchange appears here.</span>'}</div></div>`;
}

// ---- B · Duel table ----
function pbRollRow(r){
  return `<div class="broll"><div class="brt"><b>${esc(r.title)}</b><span class="g-${r.grade}">${esc(r.grade)} · need ≤ ${r.pct}</span></div>${pitsBandHtml(r.pct,r.roll)}</div>`;
}
function pbB(c,last){
  const right=last?`<header><span class="lbl">Last exchange</span>${last.round?`<span class="chip">R${last.round} · C${last.cycle||1}</span>`:''}</header>
      ${last.rolls.map(pbRollRow).join('')||'<p class="bnone">No dice rolled yet.</p>'}
      <div class="bverdict">${last.res?`<b>${esc(last.res.head)}</b><span>${esc(last.res.math)}</span>`:'<b>In progress</b><span>Rolls are being resolved.</span>'}</div>`
    :`<header><span class="lbl">Last exchange</span></header>${pbNone}`;
  return `<div class="bdeck bB" aria-label="Command deck"><div class="bB-l">${pbHead(c,{history:false})}
      <div class="bB-grid" role="group" aria-label="Your actions">${c.showPrompt?pbPrompt():c.list.map((a,i)=>pbCard(a,i,c)).join('')}</div></div>
    <div class="bB-r" aria-live="polite">${right}</div></div>`;
}

// ---- C · Ground dock ----
function pbDk(a,i,c,big){
  const on=c.live&&a.enabled,txt=pbHelp(a,c);
  return `<button type="button" class="bdk${big?' big':''}${a.act==='yield'?' danger':''}${on?'':' off'}" data-act="${a.act}" title="${esc(txt)}" aria-label="${esc(a.label+', '+pbCost(a))}" ${on?'':'disabled'}>
    <kbd>${i<9?i+1:''}</kbd><span class="ic">${pbIcon(a.act)}</span><span class="dn">${esc(a.label)}</span>
    <span class="tip"><b>${esc(a.label)} · ${pbCost(a)}</b>${esc(txt)}</span></button>`;
}
function pbCorner(r,side,res){
  if(!r)return `<div class="bcorner ${side}"><h5><span>${side==='l'?S.fighters.a.name:S.fighters.b.name}</span></h5><p class="bnone">No roll yet.</p></div>`;
  return `<div class="bcorner ${side}"><h5><span>${esc(r.title)}</span>${pbGradeChip(r)}</h5>
    <div class="bbig"><strong>${r.roll}</strong><em>needed ≤ ${r.pct}</em></div>${res?`<p>${esc(res)}</p>`:''}</div>`;
}
function pbC(c,last){
  const idx=a=>c.list.indexOf(a),left=c.list.filter(a=>['brace','dither','delay'].includes(a.act)),mid=c.list.filter(a=>['attack','shieldAttack'].includes(a.act));
  const rest=c.list.filter(a=>!left.includes(a)&&!mid.includes(a));
  const side=id=>last?last.rolls.find(r=>r.side===id):null;
  const dock=c.showPrompt?`<div class="bC-prompt">${pbPrompt()}</div>`
    :`<div class="bdock" role="group" aria-label="Your actions">${left.map(a=>pbDk(a,idx(a),c)).join('')}${mid.map(a=>pbDk(a,idx(a),c,true)).join('')}${rest.map((a,k)=>pbDk(a,idx(a),c)).join('')}</div>`;
  return `<div class="bdeck bC" aria-label="Command deck"><div class="bC-cap"><b>${esc(PB_MSG[c.phase]||'')}</b><span>${pbPips(c.me)} ${c.me.ap} AP left</span></div>
    ${pbCorner(side('a'),'l',last&&last.res?last.res.head:'')}${dock}${pbCorner(side('b'),'r',last&&last.res?last.res.math:'')}
    <button type="button" class="bhist link" data-pa="history">View full history · ${pbCount()}</button></div>`;
}

// ---- D · Step flow ----
function pbStepStrip(c,last){
  const a=c.sel,aimed=a&&['attack','shieldAttack'].includes(a.act);
  let s;
  if(c.live)s=[a?'done':'now',aimed?'now':(a?'done':''),aimed?'':(a?'now':'')];
  else if(c.phase==='opponent')s=['now','',''];
  else s=['done','done','now'];
  const lbl=[c.live&&a?'Action: '+a.label:'Choose action',c.live&&a&&!aimed?'No target needed':'Check the target','Confirm &amp; resolve'];
  const tail=last?last.rolls.map(r=>`${esc(r.title)} <em>${r.roll}</em>`).join(' → ')+(last.res?` → <strong>${esc(last.res.head)}</strong>`:' → in progress'):'Nothing yet';
  return `<div class="bsteps" role="list">${s.map((st,i)=>`<div class="${st}" role="listitem"><b>${st==='done'?'✓':i+1}</b>${lbl[i]}</div>`).join('')}<div class="blastline" role="listitem" aria-live="polite" title="${last?esc(last.rolls.map(r=>r.title+' '+r.roll+' vs '+r.pct+'%, '+r.grade).join('; ')+(last.res?'. '+last.res.math:'')):''}"><span class="lbl">Last</span><span class="bltext">${tail}</span></div></div>`;
}
function pbFoeBody(foe){
  const total=HIT_LOCS.reduce((n,l)=>n+Math.max(0,foe.hp[l]),0),max=HIT_LOCS.reduce((n,l)=>n+foe.maxHp[l],0),w=ARENA_WEAPONS[foe.weapon]||{};
  return `<div class="btgt"><svg class="body-svg" viewBox="0 0 120 200" role="group" aria-label="${esc(foe.name)} hit locations">${paZonesSvg(foe)}</svg>
    <div class="binfo"><span class="lbl">Opponent</span><h4>${esc(foe.name)}</h4>
    <dl><dt>Hit points</dt><dd>${total}/${max}</dd><dt>Weapon</dt><dd>${esc(foe.disarmed?'Unarmed':(w.name||foe.weapon))}</dd><dt>Evade</dt><dd>${evadeTarget(foe)}%</dd></dl>
    <div class="chips">${paConditions(foe)}</div></div></div>`;
}
function pbD(c,last){
  if(c.showPrompt||c.phase==='opponent'){
    return `<div class="bdeck bD" aria-label="Command deck">${pbStepStrip(c,last)}<div class="bD-main one"><div class="bcard focus">${c.showPrompt?pbPrompt():`<p class="bnone">${esc(S.fighters[S.order?.[S.turnIndex]]?.name||'The opponent')} acts. Your reactions appear here.</p>`}</div></div></div>`;
  }
  const a=c.sel,aimed=a&&['attack','shieldAttack'].includes(a.act);
  const others=c.list.filter(x=>!a||x.act!==a.act).map(x=>`<button type="button" class="bmini${x.enabled?'':' off'}" data-pa="sel" data-val="${x.act}" title="${esc(pbHelp(x,c))}" ${x.enabled?'':'disabled'}>${esc(x.label)}</button>`).join('');
  const odds=a?pitsOddsFor(a.act):null;
  const sum=a?(aimed?`${a.label} ${esc(c.foe.name)}`:a.label):'No action available';
  const need=odds!=null?`<div class="bneed"><span>You need</span><b>≤ ${odds}% on d100</b></div>`:`<div class="bneed"><span>Roll</span><b>none</b></div>`;
  return `<div class="bdeck bD" aria-label="Command deck">${pbStepStrip(c,last)}<div class="bD-main">
    <div class="bcard"><span class="lbl">1 · Action</span>${a?`<div class="bpick"><kbd>${c.list.indexOf(a)+1}</kbd><span class="bn">${esc(a.label)}</span><span class="chip">${pbCost(a)}</span></div>`:''}<div class="bminis" role="group" aria-label="Other actions">${others}</div></div>
    <div class="bcard focus"><span class="lbl">2 · Target</span>${aimed?pbFoeBody(c.foe):`<p class="bnone">${esc(a?pbHelp(a,c):'')}</p><p class="bnone">No target needed.</p>`}</div>
    <div class="bcard conf"><span class="lbl">3 · Resolve</span><div class="bsum">${sum}</div>${need}
      <button type="button" class="bgo" ${a?`data-act="${a.act}"`:'disabled'}>${a?`${esc(a.label)} · ${pbCost(a)} <kbd>Enter</kbd>`:'—'}</button></div></div></div>`;
}

// ---- E · Odds first ----
function pbOdds(a,c){
  const f=c.me,foe=c.foe,after=Math.max(0,f.ap-a.ap),cost=pbCost(a),help=pbHelp(a,c);
  if(a.act==='attack'||a.act==='shieldAttack'){
    return {lead:(a.act==='attack'?'Strike at ':'Shield strike at ')+foe.name,note:help,
      m:[[pitsOddsFor(a.act)+'%','Your target'],[evadeTarget(foe)+'%','Their Evade'],[combatTarget(foe,'weapon')+'%','Their Parry',1]]};
  }
  const roll=pitsOddsFor(a.act);
  return {lead:help,note:'',m:[roll!=null?[roll+'%','Your target']:['—','No roll'],[cost,'Cost'],[String(after),'AP left after',1]]};
}
function pbE(c,last){
  const a=c.sel;
  const list=c.list.map((x,i)=>`<button type="button" class="brow${a&&x.act===a.act&&c.live?' sel':''}${c.live&&x.enabled?'':' off'}" data-pa="sel" data-val="${x.act}" title="${esc(pbHelp(x,c))}" ${c.live&&x.enabled?'':'disabled'}><kbd>${i<9?i+1:''}</kbd><span class="nm">${esc(x.label)}</span><span class="co">${pbCost(x)}</span></button>`).join('');
  let mid;
  if(c.showPrompt)mid=`<div class="bodds">${pbPrompt()}</div>`;
  else if(!a)mid='<div class="bodds"><p class="bnone">No action available.</p></div>';
  else{
    const o=pbOdds(a,c);
    mid=`<div class="bodds"><header><h4>${esc(a.label)}</h4><span>${esc(o.lead)}</span></header>
      <div class="bmeters">${o.m.map(([v,l,hot])=>`<div class="bm${hot?' hot':''}"><span class="lbl">${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>
      <footer><p>${esc(o.note)}</p>${c.live?`<button type="button" class="bgo" data-act="${a.act}">Confirm ${esc(a.label)} <kbd>Enter</kbd></button>`:''}</footer></div>`;
  }
  const items=last?[...last.rolls.map(r=>`<li><b>${esc(r.title)}</b><span class="g-${r.grade}">${r.roll} · ${esc(r.grade)}</span><em>Needed ≤ ${r.pct} on d100</em></li>`),
    last.res?`<li class="end"><b>${esc(last.res.head)}</b><em>${esc(last.res.math)}</em></li>`:'<li class="end"><b>In progress</b></li>'].join(''):'';
  return `<div class="bdeck bE" aria-label="Command deck"><div class="blist" role="group" aria-label="Your actions"><span class="lbl">Actions ${pbPips(c.me)}</span>${list}</div>${mid}
    <div class="btl" aria-live="polite"><header><span class="lbl">Last exchange</span>${pbHistBtn('History')}</header>${last?`<ol>${items}</ol>`:pbNone}</div></div>`;
}

// The deck, drawn in place of the current one. Returns '' for the current layout so the caller keeps its own.
function pitsBottomDeckHtml(){
  const layout=pitsBottomLayout();
  if(layout==='current')return '';
  const recap=typeof pitsRecapHtml==='function'?pitsRecapHtml():'';
  const c=pbCtx(),last=pbLast();
  const body={A:pbA,B:pbB,C:pbC,D:pbD,E:pbE}[layout](c,last);
  return `${recap}${body}${resultModalHtml()}`;
}

// The history list opens in a window (the chronicle panel is gone from these layouts).
function pbOpenHistory(){
  document.getElementById('paHistory')?.remove();
  const box=document.createElement('div');box.id='paHistory';box.className='modal pa-rules';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Combat history');
  box.innerHTML=`<div class="mbox"><h2>Combat history</h2>${combatHistory({deck:true})}<p class="pa-rules-close"><button type="button" class="toolbutton" data-pa="history-close">Close</button></p></div>`;
  const close=()=>{box.remove();document.querySelector('[data-pa="history"]')?.focus?.({preventScroll:true});};
  box.addEventListener('click',e=>{if(e.target===box||e.target.closest('[data-pa="history-close"]'))close();});
  box.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  document.body.append(box);box.querySelector('button').focus({preventScroll:true});
}

// Switcher, selection, history and number keys (wired once).
function pbWire(){
  if(PB.wired||typeof document==='undefined')return;PB.wired=true;
  document.addEventListener('change',e=>{
    const s=e.target.closest?.('[data-pa="layout"]');if(!s)return;
    PB.layout=PB_LAYOUTS.some(l=>l[0]===s.value)?s.value:'current';
    try{localStorage.setItem(PB_KEY,PB.layout);}catch(err){}
    PB.sel=null;render();
  });
  document.addEventListener('click',e=>{
    const t=e.target.closest?.('[data-pa]');if(!t)return;
    if(t.dataset.pa==='sel'){PB.sel=t.dataset.val;render();}
    else if(t.dataset.pa==='history')pbOpenHistory();
  });
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||pitsBottomLayout()==='current'||!document.body.classList.contains('pa-on'))return;
    if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName||'')||document.querySelector('.modal'))return;
    const c=pbCtx();if(!c.live)return;
    const layout=pitsBottomLayout();
    if(/^[1-9]$/.test(e.key)){
      const a=c.list[+e.key-1];if(!a||!a.enabled)return;e.preventDefault();
      if(layout==='D'||layout==='E'){PB.sel=a.act;render();}
      else document.querySelector(`#root [data-act="${a.act}"]:not(:disabled)`)?.click();
    }else if(e.key==='Enter'&&(layout==='D'||layout==='E')&&!/^(BUTTON|A|SUMMARY)$/.test(e.target.tagName||'')&&c.sel){
      e.preventDefault();document.querySelector(`#root .bgo[data-act="${c.sel.act}"]`)?.click();
    }
  });
}
pbWire();
