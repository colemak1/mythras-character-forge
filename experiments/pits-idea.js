// The Pits: "Idea" (owner, 2026-11-15). Next to Lost? and Report fight, a window where a player suggests something for
// the Pits (a feature, a change, something they would like to see). It is saved to the same place as the fight reports
// (experiments/pits-report.js, docs/pits-reports.md) with a note starting "[Idea]", so Claude and ChatGPT find it when
// the owner says "go through the fight reports". The record is small: where the fight was when the idea came, not the
// whole fight (an idea is not a fault to replay). Presentation only: it changes nothing in the fight.

const PIDEA={wired:false};
const PI_NOTE_MAX=3990;   // the note goes in with its "[Idea] " prefix; the database allows 4000

// The small record saved with an idea.
function piRecord(){
  const f=k=>S?.fighters?.[k]?{name:S.fighters[k].name,weapon:S.fighters[k].weapon,shield:S.fighters[k].shield}:null;
  const q=s=>{try{const el=document.querySelector(s);return el?String(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,300):'';}catch(e){return '';}};
  return {record:'pits-idea',at:new Date().toISOString(),mode:S?.mode||null,round:S?.round??null,
    phase:typeof pitsPhase==='function'?pitsPhase():(S?.phase||null),fighters:{a:f('a'),b:f('b')},
    screen:{headline:q('#root .bmid header h4'),step:q('#root .btrack .now')}};
}
// The report as PitsReport.send takes it.
function piReport(text,reporter){
  return {note:('[Idea] '+String(text).trim()).slice(0,4000),record:piRecord(),
    page:(location.pathname.split('/').slice(-2).join('/')+location.search).slice(0,500),
    build:PitsReport.buildOf([...(document.scripts||[])].map(s=>s.getAttribute('src'))),
    reporter:(reporter||'').trim().slice(0,60)||null,at:new Date().toISOString()};
}
// Send an idea. Returns PitsReport.send's result, or {why:'empty'} when nothing was typed.
async function pitsIdeaSend(text,reporter){
  if(typeof PitsReport==='undefined')return {why:'offline',sent:0,kept:0};
  if(!String(text||'').trim())return {why:'empty',sent:0,kept:0};
  const rep=piReport(text,reporter);
  try{if(rep.reporter)localStorage.setItem(PitsReport.NAME_KEY,rep.reporter);}catch(e){}
  return PitsReport.send(rep,await PitsReport.client(),window.localStorage);
}
function piMessage(r){
  if(!r.why)return 'Thanks, your idea is saved for Claude and ChatGPT.'+(r.sent>1?` (${r.sent-1} kept from before went too.)`:'');
  return PitsReport.message(r);
}

function piOpen(){
  document.getElementById('paIdea')?.remove();
  const d=document.createElement('div');d.id='paIdea';d.className='modal pa-rules';
  d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','paIdeaTitle');
  d.innerHTML=`<div class="mbox pa-report"><h2 id="paIdeaTitle">Share an idea</h2>
    <p>What would make the Pits better? A feature, a change, something you'd like to see.</p>
    <textarea id="paIdeaNote" rows="5" maxlength="${PI_NOTE_MAX}" style="width:100%" aria-label="Your idea" placeholder="For example: let me pick which hand holds the shield"></textarea>
    <p class="pa-report-name"><label>Your name (optional) <input id="paIdeaName" type="text" maxlength="60" autocomplete="nickname"></label></p>
    <p class="pa-report-status" role="status"></p>
    <p class="pa-rules-close"><button type="button" class="cta" data-i="send">Send idea</button> <button type="button" class="toolbutton" data-i="close">Cancel</button></p></div>`;
  document.body.append(d);
  const ta=d.querySelector('#paIdeaNote'),nameIn=d.querySelector('#paIdeaName'),status=d.querySelector('.pa-report-status'),sendB=d.querySelector('[data-i=send]');
  try{nameIn.value=localStorage.getItem(PitsReport.NAME_KEY)||'';}catch(e){}
  let kept=false;
  const close=()=>{d.remove();document.removeEventListener('keydown',key);document.querySelector('[data-pa="idea"]')?.focus?.({preventScroll:true});};
  const key=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',key);
  d.addEventListener('click',e=>{if(e.target===d)close();});
  d.querySelector('[data-i=close]').addEventListener('click',close);
  sendB.addEventListener('click',async()=>{
    if(!ta.value.trim()){status.textContent='Type your idea first.';ta.focus();return;}
    sendB.disabled=true;status.textContent='Sending…';
    // (a retry after the idea was kept on this device sends what is kept; it does not keep a second copy)
    const r=kept?await PitsReport.send(null,await PitsReport.client(),window.localStorage):await pitsIdeaSend(ta.value,nameIn.value);
    if(r.why)kept=true;
    status.textContent=piMessage(r);
    if(!r.why){sendB.textContent='Sent';ta.disabled=true;d.querySelector('[data-i=close]').textContent='Back to the fight';}
    else sendB.disabled=false;
  });
  ta.focus({preventScroll:true});
}

function pitsIdeaButtonHtml(){
  return typeof PitsReport!=='undefined'?'<button type="button" class="toolbutton" data-pa="idea" title="Suggest something for the Pits; it is saved for Claude and ChatGPT">Idea</button>':'';
}
function piWire(){
  if(PIDEA.wired||typeof document==='undefined')return;PIDEA.wired=true;
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-pa="idea"]'))piOpen();});
}
piWire();
