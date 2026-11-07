// The Pits game layer (v0 design, owner-chosen 2026-11-07). PRESENTATION
// ONLY: Glory, Momentum and Marks are not Mythras rules. They watch what the
// engine reports (skill rolls and logged damage) and never read back into it:
// nothing here changes a roll, a target number, AP, HP or any fight state.
// Remove this file and its few hooks and the fight plays exactly the same.

const PITS_MARKS=[
  ['first','First Blood','Draw blood for the first time'],
  ['near','Near Thing','Miss a roll by five or less'],
  ['dead','Dead Eye','Roll a critical success'],
  ['hold','Hold the Line','Parry an attack'],
  ['footing','Stayed Standing','Resist an effect'],
  ['streak','On a Roll','Reach 3 Momentum'],
  ['serious','Serious Business','Leave a Serious wound']
];
const PITS_MOMENTUM=['Steady','Warming','Hot','Surging'];
let PG=null;
function pitsGameState(){
  if(typeof S==='undefined'||!S)return null;
  if(!PG||PG.run!==S){
    let sound=false;try{sound=localStorage.getItem('pits-sound')==='on';}catch(e){}
    PG={run:S,glory:0,momentum:0,owned:new Set(),fresh:new Set(),toast:null,recapOpen:false,sound,
      stats:{attacks:0,hits:0,dealt:0,taken:0,best:0},moment:null,seenLog:0,impacts:[]};
    // Logs already present when the run starts (initiative and so on) are not scored.
    PG.seenLog=Math.max(0,...(S.logs||[]).map(e=>Number(e.id)||0));
  }
  return PG;
}
const pitsHuman=id=>S.fighters?.[id]?.kind==='human';
// The player whose story the layer follows: fighter a (in local PvP, both are human; a is scored).
const PITS_HERO='a';

function pitsGain(points){const g=pitsGameState();const n=Math.round(points*(1+.5*g.momentum));g.glory+=n;return n;}
function pitsStreak(ok){const g=pitsGameState();g.momentum=ok?Math.min(3,g.momentum+1):0;g.stats.best=Math.max(g.stats.best,g.momentum);if(g.momentum===3)pitsEarn('streak');}
function pitsEarn(id){
  const g=pitsGameState();if(g.owned.has(id))return;
  g.owned.add(id);g.fresh.add(id);g.glory+=20;
  const m=PITS_MARKS.find(x=>x[0]===id);g.toast={title:m[1],text:m[2],at:Date.now()};
  pitsSfx('mark');
}

// Hook: every skill roll the engine resolves (called from requestSkill).
function pitsGameOnRoll(actor,label,pct,result){
  const g=pitsGameState();if(!g||actor!==PITS_HERO)return;
  const what=String(label).split(' · ')[0],ok=result.grade>=2,crit=result.grade===3;
  if(crit)pitsEarn('dead');
  if(!ok&&result.roll-pct>0&&result.roll-pct<=5){pitsEarn('near');pitsGain(3);}
  if(/^(Attack|Shield strike)$/i.test(what)){g.stats.attacks++;if(ok)g.stats.hits++;pitsStreak(ok);if(ok)pitsGain(crit?25:10);pitsSfx(crit?'crit':ok?'pick':'miss');}
  else if(/^(Parry|Evade)$/i.test(what)){pitsStreak(ok);if(ok){pitsGain(crit?14:8);if(/^Parry/i.test(what))pitsEarn('hold');}}
  else if(/^(Trip|Resist|Stun Location|Blind|Bleed|Hold|Withdraw|Break free)/i.test(what)&&ok){pitsEarn('footing');pitsGain(8);}
}

// Hook: read new log entries for damage (meta.impact), after each render.
function pitsGameOnLogs(){
  const g=pitsGameState();if(!g)return;
  const logs=S.logs||[],shown=typeof V!=='undefined'&&V.busy?logs.slice(0,V.visibleCount):logs;
  for(const e of shown){
    const id=Number(e.id)||0;if(id<=g.seenLog)continue;g.seenLog=id;
    const hit=e.meta?.impact;if(!hit||!S.fighters[hit.target])continue;
    const lost=hit.hpLost||0;
    g.impacts.push({target:hit.target,loc:hit.location,lost});
    if(hit.target===PITS_HERO){g.stats.taken+=lost;continue;}
    if(lost<=0)continue;
    g.stats.dealt+=lost;pitsEarn('first');pitsGain(10+lost*3);pitsSfx('hit');
    const f=S.fighters[hit.target];
    if(['serious','major'].includes(zoneClass(f,hit.location)))pitsEarn('serious');
    if(!g.moment||lost>g.moment.lost)g.moment={lost,text:`Hit ${f.name}’s ${String(hit.location).toLowerCase()} for ${lost} in round ${e.round||S.round}`};
  }
}

// ---- Sound and haptics: off by default; WebAudio tones only. ----
let PITS_ACTX=null;
function pitsTone(freq,dur=.1,type='sine',vol=.05,delay=0){
  try{PITS_ACTX=PITS_ACTX||new (window.AudioContext||window.webkitAudioContext)();
    const t=PITS_ACTX.currentTime+delay,o=PITS_ACTX.createOscillator(),gn=PITS_ACTX.createGain();
    o.type=type;o.frequency.value=freq;gn.gain.setValueAtTime(vol,t);gn.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(gn).connect(PITS_ACTX.destination);o.start(t);o.stop(t+dur);}catch(e){}
}
function pitsSfx(kind){
  const g=PG;if(!g||!g.sound||typeof window==='undefined')return;
  const buzz=p=>{try{navigator.vibrate&&navigator.vibrate(p);}catch(e){}};
  if(kind==='pick')pitsTone(520,.05,'sine',.03);
  else if(kind==='miss')pitsTone(220,.14,'sine',.03);
  else if(kind==='hit'){pitsTone(120,.2,'triangle',.08);buzz(40);}
  else if(kind==='crit'){pitsTone(120,.2,'triangle',.08);pitsTone(740,.25,'sine',.04,.05);buzz([30,40,60]);}
  else if(kind==='mark'){pitsTone(660,.14,'sine',.04);pitsTone(990,.22,'sine',.04,.12);buzz(25);}
}

// ---- Markup ----
const PITS_STAR='<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>';
function pitsBoutBarHtml(){
  const g=pitsGameState();if(!g||S.phase==='setup')return '';
  const pips=[0,1,2].map(i=>`<i class="${i<g.momentum?'on':''}"></i>`).join('');
  return `<section class="pits-bout" aria-label="Score, for fun">
    <div class="pits-b-item"><span class="label">Glory</span><b>${g.glory}</b></div>
    <div class="pits-b-item" aria-label="Momentum: ${PITS_MOMENTUM[g.momentum]}, ${g.momentum} of 3"><span class="label">Momentum</span><span class="pits-mom"><span class="pits-mom-pips">${pips}</span><span class="pits-mom-txt">${PITS_MOMENTUM[g.momentum]}</span></span></div>
    <button type="button" class="pits-b-item pits-b-btn" data-pits="recap" aria-label="Pit Marks: ${g.owned.size} of ${PITS_MARKS.length}. Open the bout recap"><span class="label">Marks</span><b>${g.owned.size} / ${PITS_MARKS.length}</b></button>
    <span class="pits-b-note">Glory, Momentum and Marks are for fun. They never change a roll.</span>
    <div class="pits-b-ctl"><button type="button" class="pits-tgl" data-pits="sound" aria-pressed="${g.sound}">${g.sound?'Sound on':'Sound off'}</button></div>
    ${g.toast&&Date.now()-g.toast.at<4000?`<div class="pits-toast" role="status" aria-live="polite">${PITS_STAR}<div><b>Mark earned · ${esc(g.toast.title)}</b><span>${esc(g.toast.text)} · +20 Glory</span></div></div>`:''}
  </section>`;
}
function pitsRecapHtml(){
  const g=pitsGameState();if(!g)return '';
  const over=S.phase==='between'||S.phase==='over';
  if(!over&&!g.recapOpen)return '';
  const st=g.stats;
  const marks=PITS_MARKS.map(([id,n,d])=>`<li class="pits-mark${g.owned.has(id)?' own':''}${g.fresh.has(id)?' fresh':''}">${PITS_STAR}<div><b>${n}</b><span>${g.owned.has(id)?d:'Locked · '+d}</span></div></li>`).join('');
  return `<section class="pits-recap" aria-label="Bout recap">
    <div class="decision-kicker">${over?'Bout over':'Bout in progress'}</div><h3>Pit Marks and streaks</h3>
    <div class="pits-rc-stats"><div><span class="label">Hits</span><b>${st.hits}/${st.attacks}</b></div><div><span class="label">Damage dealt</span><b>${st.dealt}</b></div><div><span class="label">Damage taken</span><b>${st.taken}</b></div><div><span class="label">Best streak</span><b>×${st.best}</b></div></div>
    <div class="pits-moment"><span class="label">Moment of the bout</span><p>${esc(g.moment?.text||'No blood drawn yet.')}</p></div>
    <span class="label">Pit Marks · ${g.owned.size} of ${PITS_MARKS.length} collected</span><ul class="pits-marks">${marks}</ul>
    <div class="pits-rc-foot"><span>Glory this bout: <b>${g.glory}</b> <small>(for fun, not a rule)</small></span>${over?'':'<button type="button" class="history-toggle" data-pits="back">Back to the fight</button>'}</div>
  </section>`;
}

// ---- After each render: wire buttons, play hit feel for new damage. ----
function pitsGameAfterRender(){
  const g=pitsGameState();if(!g||typeof document==='undefined'||!document.querySelectorAll)return;
  document.querySelectorAll('[data-pits]').forEach(b=>{
    if(b.dataset.pitsWired)return;b.dataset.pitsWired='1';
    b.addEventListener('click',()=>{
      const k=b.dataset.pits;
      if(k==='sound'){g.sound=!g.sound;try{localStorage.setItem('pits-sound',g.sound?'on':'off');}catch(e){}if(g.sound)pitsSfx('pick');}
      else if(k==='recap')g.recapOpen=!g.recapOpen;
      else if(k==='back')g.recapOpen=false;
      render();
    });
  });
  g.fresh.clear();
  const fx=g.impacts.splice(0);
  for(const hit of fx){
    const panel=document.querySelector(hit.target==='a'?'.fighter.player':'.fighter.enemy');if(!panel)continue;
    panel.classList.remove('pits-shake');void panel.offsetWidth;if(hit.lost>0)panel.classList.add('pits-shake');
    const row=panel.querySelector(`.loc[data-val="${hit.loc}"]`);if(row){row.classList.remove('pits-flash');void row.offsetWidth;row.classList.add('pits-flash');}
    const fig=panel.querySelector('.fig');
    if(fig){const n=document.createElement('span');n.className='pits-dmg'+(hit.lost>0?'':' miss');n.textContent=hit.lost>0?'−'+hit.lost:'No damage';n.setAttribute('aria-hidden','true');fig.append(n);setTimeout(()=>n.remove(),1300);}
  }
}
