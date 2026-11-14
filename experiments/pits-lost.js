// The Pits: "What just happened?" (owner, 2026-11-14). One press marks the moment a player got lost and saves it at
// once, with the fight record, to the same place as "Report fight" (experiments/pits-report.js, docs/pits-reports.md),
// so Claude and ChatGPT can line the press up with the record and see why it was confusing. No typing is needed.
// The window that opens also tells the player, in plain words, what the last few actions were, and offers an optional
// note ("what confused you?"), saved as a second report with the same mark.
// Presentation only: it reads the engine (S, V, R, the log) and the decks' own story lines; it changes nothing.

const PLOST={marks:[],fight:null,wired:false};
const PL_STORY_MAX=12;

// Each new bout starts a fresh list of marks (a bout is known by its fighters and the first log entry).
function plFightKey(){return (S?.fighters?.a?.name||'')+'|'+(S?.fighters?.b?.name||'')+'|'+(S?.logs?.[0]?.id??'')+'|'+(S?.wave||1);}
function plMarks(){const k=plFightKey();if(PLOST.fight!==k){PLOST.fight=k;PLOST.marks=[];}return PLOST.marks;}

// What has happened, as the player has seen it so far (during a replayed exchange: only the beats already shown),
// newest last: the last two exchanges told step by step, then anything after them (Brace, Change Range, a new round).
function plRecent(){
  const ex=typeof paExchanges==='function'?paExchanges():[];
  const lines=[];
  for(const g of ex.slice(-2)){
    const who=S.fighters[g.atk]?.name||'Someone';
    lines.push({k:'head',text:`${who} attacked`+(ex.indexOf(g)===ex.length-1&&(R||S.pending||V.busy)?' (still going)':'')});
    if(typeof pbStory==='function')for(const l of pbStory(g))lines.push({k:l.cls,text:plText(l.html)});
    else{const r=paExchangeResult(g);if(r)lines.push({k:'end',text:r.head+' · '+r.math});}
  }
  if(typeof pbSince==='function'){const g=ex[ex.length-1]||null;for(const l of pbSince(g))lines.push({k:'note',text:plText(l.html)});}
  return lines.slice(-PL_STORY_MAX);
}
const plText=html=>String(html).replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();

// The moment, as the screen showed it: enough to find this press in the fight record and see what the player saw.
function plSnapshot(){
  const q=s=>{try{const el=document.querySelector(s);return el?plText(el.innerText||el.textContent||'').slice(0,800):'';}catch(e){return '';}};
  const logs=S.logs||[],shown=V.busy?logs.slice(0,V.visibleCount):logs,stage=window.__psRecord||[];
  return {
    at:new Date().toISOString(),
    round:S.round,cycle:S.cycle,turn:S.order?.[S.turnIndex]||null,phase:typeof pitsPhase==='function'?pitsPhase():S.phase,
    // where the presentation was: a beat being played (busy), the dice waiting (roll), a decision (pending)
    playing:!!V.busy,replaying:!!V.replaying,beat:V.busy?V.step:null,beats:V.busy?(V.events||[]).length:null,
    roll:R?{actor:R.actor,label:R.label}:null,pending:S.pending?S.pending.kind:null,
    // indexes into the fight record: log entries shown so far, the tape (presented) and the stage clock
    logShown:shown.length,logTotal:logs.length,lastLogShown:shown.length?shown[shown.length-1].id:null,
    tape:(V.tape||[]).length,stageClock:stage.length?stage[stage.length-1].c:null,stageEvents:stage.length,
    // what the player was looking at
    screen:{headline:q('#root .bmid header h4'),step:(document.querySelector('#root .btrack .now')?.textContent||'').trim(),story:q('#root .bstory'),
      tray:q('#pitsStage .roll'),strip:q('#pitsStage .strip'),details:q('#root .binfo-body'),deck:document.querySelector('#root .bdeck')?'':q('#root .deck')},
    recent:plRecent()
  };
}

// Mark the moment and save it straight away. Returns the mark.
function pitsLostMark(){
  const marks=plMarks(),mark={n:marks.length+1,...plSnapshot()};
  marks.push(mark);
  const record=JSON.parse(pitsFightRecord());record.lostMark=mark.n;
  const note=`[Lost #${mark.n}] Pressed "What just happened?" in round ${mark.round}`+(mark.screen.step?`, at ${mark.screen.step}`:'')+(mark.screen.headline?`: ${mark.screen.headline}`:'')+'.';
  plSave({note,record},mark);
  return mark;
}
function plReport(note,record){
  let reporter=null;try{reporter=localStorage.getItem(PitsReport.NAME_KEY)||null;}catch(e){}
  return {note:note.slice(0,4000),record,page:(location.pathname.split('/').slice(-2).join('/')+location.search).slice(0,500),
    build:PitsReport.buildOf([...document.scripts].map(s=>s.getAttribute('src'))),reporter,at:new Date().toISOString()};
}
async function plSave({note,record},mark){
  if(typeof PitsReport==='undefined')return;
  const r=await PitsReport.send(plReport(note,record),await PitsReport.client(),window.localStorage);
  mark.saved=!r.why;
  const s=document.querySelector('#paLost .pl-status');
  if(s)s.textContent=r.why?'Not saved yet: '+PitsReport.message(r):'Saved. This moment is marked for Claude in the fight reports.';
}

function plOpen(mark){
  document.getElementById('paLost')?.remove();
  const d=document.createElement('div');d.id='paLost';d.className='modal pa-rules';
  d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','paLostTitle');
  const story=mark.recent.length?`<ul class="pl-story">${mark.recent.map(l=>`<li data-k="${esc(l.k)}">${esc(l.text)}</li>`).join('')}</ul>`
    :'<p>Nothing has been rolled yet in this bout.</p>';
  const now=[mark.screen.headline,mark.screen.step?'Step: '+mark.screen.step:''].filter(Boolean).join(' · ');
  d.innerHTML=`<div class="mbox pa-report"><h2 id="paLostTitle">What just happened</h2>
    <p class="s">Round ${mark.round}${now?' · '+esc(now):''}</p>${story}
    <p class="pl-status" role="status">Saving this moment for Claude…</p>
    <p><label for="paLostNote">What confused you? (optional)</label></p>
    <textarea id="paLostNote" rows="3" maxlength="2000" style="width:100%" placeholder="For example: I didn't see why I lost 5 HP"></textarea>
    <p class="pa-rules-close"><button type="button" class="cta" data-l="note">Add note</button> <button type="button" class="toolbutton" data-l="close">Back to the fight</button></p></div>`;
  document.body.append(d);
  const close=()=>{d.remove();document.removeEventListener('keydown',key);document.querySelector('[data-pa="lost"]')?.focus?.({preventScroll:true});};
  const key=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',key);
  d.addEventListener('click',e=>{if(e.target===d)close();});
  d.querySelector('[data-l=close]').addEventListener('click',close);
  const noteB=d.querySelector('[data-l=note]'),ta=d.querySelector('#paLostNote');
  noteB.addEventListener('click',async()=>{
    const t=ta.value.trim();if(!t){ta.focus();return;}
    noteB.disabled=true;
    // a small record: the note belongs to the mark already saved with the whole fight
    await plSave({note:`[Lost #${mark.n} note] ${t}`,record:{record:'pits-lost-note',mark:mark.n,at:mark.at,round:mark.round,fighters:[S.fighters.a.name,S.fighters.b.name]}},{});
    noteB.textContent='Note added';ta.disabled=true;
  });
  d.querySelector('[data-l=close]').focus({preventScroll:true});
}

function pitsLost(){if(typeof S==='undefined'||!S||!S.fighters?.a)return null;const m=pitsLostMark();if(typeof document!=='undefined')plOpen(m);return m;}
function pitsLostButtonHtml(){
  return typeof PitsReport!=='undefined'?'<button type="button" class="toolbutton pl-btn" data-pa="lost" title="What just happened? Shows the last few actions and marks this moment for Claude (shortcut: ?)">Lost?</button>':'';
}
function plWire(){
  if(PLOST.wired||typeof document==='undefined')return;PLOST.wired=true;
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-pa="lost"]'))pitsLost();});
  document.addEventListener('keydown',e=>{
    if(e.key!=='?'||e.ctrlKey||e.metaKey||e.altKey||!document.body.classList.contains('pa-on'))return;
    if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName||'')||document.querySelector('.modal'))return;
    e.preventDefault();pitsLost();
  });
}
plWire();
