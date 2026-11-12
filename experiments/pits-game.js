// The Pits feel layer: sound and haptics (off by default) and the shake and flash on a hit.
// PRESENTATION ONLY: nothing here changes a roll, a target number, AP, HP or any fight state.
// (Glory, Momentum, Pit Marks and the bout recap were removed 2026-11-11 at the owner's request.)

let PG=null;
function pitsGameState(){
  if(typeof S==='undefined'||!S)return null;
  if(!PG||PG.run!==S){
    let sound=false;try{sound=localStorage.getItem('pits-sound')==='on';}catch(e){}
    PG={run:S,sound,seenLog:0,impacts:[]};
    // Logs already present when the run starts (initiative and so on) are not played.
    PG.seenLog=Math.max(0,...(S.logs||[]).map(e=>Number(e.id)||0));
  }
  return PG;
}

// Hook: every skill roll the engine resolves (called from requestSkill): a sound for the hero's rolls.
function pitsGameOnRoll(actor,label,pct,result){
  const g=pitsGameState();if(!g||actor!=='a')return;
  const what=String(label).split(' · ')[0],ok=result.grade>=2,crit=result.grade===3;
  if(/^(Attack|Shield strike)$/i.test(what))pitsSfx(crit?'crit':ok?'pick':'miss');
}

// Hook: read new log entries for damage (meta.impact), after each render.
function pitsGameOnLogs(){
  const g=pitsGameState();if(!g)return;
  const logs=S.logs||[],shown=typeof V!=='undefined'&&pitsPresenting()?logs.slice(0,V.visibleCount):logs;
  for(const e of shown){
    const id=Number(e.id)||0;if(id<=g.seenLog)continue;g.seenLog=id;
    const hit=e.meta?.impact;if(!hit||!S.fighters[hit.target])continue;
    const lost=hit.hpLost||0;
    g.impacts.push({target:hit.target,loc:hit.location,lost});
    if(hit.target!=='a'&&lost>0)pitsSfx('hit');
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
}

// ---- Markup: the sound switch (the arena bar shows it) ----
function pitsBoutBarHtml(){
  const g=pitsGameState();if(!g||S.phase==='setup')return '';
  return `<section class="pits-bout" aria-label="Sound">
    <div class="pits-b-ctl"><button type="button" class="pits-tgl" data-pits="sound" aria-pressed="${g.sound}">${g.sound?'Sound on':'Sound off'}</button></div>
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
      render();
    });
  });
  const fx=g.impacts.splice(0);
  for(const hit of fx){
    const panel=document.querySelector(hit.target==='a'?'.fighter.player':'.fighter.enemy');if(!panel)continue;
    panel.classList.remove('pits-shake');void panel.offsetWidth;if(hit.lost>0)panel.classList.add('pits-shake');
    const row=panel.querySelector(`.loc[data-val="${hit.loc}"]`);if(row){row.classList.remove('pits-flash');void row.offsetWidth;row.classList.add('pits-flash');}
    const fig=panel.querySelector('.fig');
    if(fig){const n=document.createElement('span');n.className='pits-dmg'+(hit.lost>0?'':' miss');n.textContent=hit.lost>0?'−'+hit.lost:'No damage';n.setAttribute('aria-hidden','true');fig.append(n);setTimeout(()=>n.remove(),1300);}
  }
}
