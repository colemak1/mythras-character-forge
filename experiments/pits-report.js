// The Pits: "Report fight" (owner, 2026-11-14). A window where the owner types what went wrong; the note is saved with
// the fight record (pitsFightRecord in pits-arena.js) to the site's database (supabase/migrations/
// 20261114120000_pits_fight_reports.sql). A manual GitHub workflow copies the reports into the repository, where Claude
// and ChatGPT read them (docs/pits-reports.md).
// Anyone can send a report, signed in or not (owner, 2026-11-14), with an optional name so testers can be told apart.
// Offline or refused, a report is kept on this device and sent with the next one that goes through, so nothing typed is
// lost; it can also be copied by hand.
(function(root){
// The same project and public (anon) key as js/cloud.js (tests/pits-report.cjs checks they match). The anon key is
// public by design: what it can do is limited by the database's row-level security.
const SUPABASE_URL='https://yogzdbcskpvtssgckgib.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZ3pkYmNza3B2dHNzZ2NrZ2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDcwODksImV4cCI6MjA5OTI4MzA4OX0.ErzC2pHXjlY5sV2dRP6omXFl5EQwj6gooBCikx6ftfw';
const SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
const QUEUE_KEY='sitota-pits-reports-pending-v1',NAME_KEY='sitota-pits-reporter-v1',QUEUE_MAX=20,NOTE_MAX=4000,NAME_MAX=60;

// ----- the parts that do not need a browser (tested in tests/pits-report.cjs) -----
// which build of the Pits scripts the page is running (their ?v= stamps), so a report from a stale page shows as one
function buildOf(scripts){
  const want=['pits-stage','pits-spring','pits-writer','pits-spring-live','pits-motion','pits-arena'],out=[];
  for(const src of scripts||[]){const m=/([a-z-]+)\.js\?v=([0-9a-f]+)/.exec(src||'');if(m&&want.includes(m[1]))out.push(m[1].replace('pits-','')+'='+m[2]);}
  return out.join(';').slice(0,200);
}
function readQueue(store){try{const v=JSON.parse(store.getItem(QUEUE_KEY)||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}}
function writeQueue(store,q){try{if(q.length)store.setItem(QUEUE_KEY,JSON.stringify(q.slice(-QUEUE_MAX)));else store.removeItem(QUEUE_KEY);return true;}catch(e){return false;}}
// Send one report (and any kept from before). client: a Supabase client, or null when it could not be loaded.
// Returns {sent: how many went, kept: how many wait on this device, why: null | 'offline' | 'error', detail}
async function send(report,client,store){
  const q=readQueue(store);if(report)q.push(report);
  const keep=(why,detail)=>{const ok=writeQueue(store,q);return {sent:0,kept:ok?Math.min(q.length,QUEUE_MAX):0,why,detail,lost:!ok};};
  if(!client)return keep('offline');
  let sent=0;
  while(q.length){
    const x=q[0];
    try{const r=await client.from('pits_fight_reports').insert({note:x.note,record:x.record,page:x.page||null,build:x.build||null,reporter:x.reporter||null});
      if(r.error)return {...keep('error',r.error.message),sent};}
    catch(e){return {...keep('offline'),sent};}
    q.shift();sent++;
  }
  writeQueue(store,q);
  return {sent,kept:0,why:null};
}
// what to tell the owner after a send
function message(r){
  if(r.lost)return 'Not sent, and this browser would not keep it. Use "Copy the fight record" below and paste it with your note.';
  if(!r.why)return r.sent>1?'Sent, with '+(r.sent-1)+' kept from before. Tell Claude "go through the fight reports" when you want them looked at.':
    'Sent. Tell Claude "go through the fight reports" when you want them looked at.';
  const kept=' Kept on this device ('+r.kept+' waiting); it is sent with the next report that goes through.';
  if(r.why==='offline')return 'Not sent: the site\'s database could not be reached.'+kept;
  return 'Not sent: '+(r.detail||'the database refused it')+'.'+kept;
}

// ----- the browser part -----
let clientP=null;
function client(){
  if(clientP)return clientP;
  clientP=new Promise(res=>{
    const make=()=>{try{res(root.supabase&&root.supabase.createClient?root.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null);}catch(e){res(null);}};
    if(root.supabase)return make();
    const s=document.createElement('script');s.src=SDK;s.async=true;s.onload=make;s.onerror=()=>{clientP=null;res(null);};
    document.head.append(s);setTimeout(()=>{if(!root.supabase)res(null);},10000);
  });
  return clientP;
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// open the window; record: the fight record (JSON text) taken now, so the fight going on does not change it
function open(recordText,copy){
  document.getElementById('paReport')?.remove();
  let record;try{record=JSON.parse(recordText);}catch(e){record={record:'unreadable',text:String(recordText).slice(0,500000)};}
  const waiting=readQueue(root.localStorage||{getItem:()=>null}).length;
  const d=document.createElement('div');d.id='paReport';d.className='modal pa-rules';
  d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','paReportTitle');
  d.innerHTML='<div class="mbox pa-report"><h2 id="paReportTitle">Report this fight</h2>'
    +'<p>What went wrong? Name the moment if you can, for example: "my second parry: his sword went through my head".</p>'
    +'<textarea id="paReportNote" rows="6" maxlength="'+NOTE_MAX+'" style="width:100%" aria-label="What went wrong"></textarea>'
    +'<p class="pa-report-name"><label>Your name (optional) <input id="paReportName" type="text" maxlength="'+NAME_MAX+'" autocomplete="nickname"></label></p>'
    +'<p class="pa-report-status" id="paReportStatus" role="status">'+(waiting?esc(waiting+' earlier report'+(waiting>1?'s':'')+' waiting on this device; sent with this one.'):'')+'</p>'
    +'<p class="pa-rules-close"><button type="button" class="cta" data-r="send">Send report</button> '
    +'<button type="button" class="toolbutton" data-r="close">Cancel</button> '
    +'<button type="button" class="toolbutton" data-r="copy">Copy the fight record</button></p></div>';
  document.body.append(d);
  const nameIn=d.querySelector('#paReportName');try{nameIn.value=root.localStorage.getItem(NAME_KEY)||'';}catch(e){}
  const note=d.querySelector('#paReportNote'),status=d.querySelector('#paReportStatus'),sendB=d.querySelector('[data-r=send]');
  let queued=false;
  const close=()=>{d.remove();document.removeEventListener('keydown',key);};
  const key=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',key);
  d.querySelector('[data-r=close]').addEventListener('click',close);
  d.querySelector('[data-r=copy]').addEventListener('click',()=>{if(copy)copy(recordText);});
  sendB.addEventListener('click',async()=>{
    const text=note.value.trim();
    if(!text){status.textContent='Type what went wrong first.';note.focus();return;}
    sendB.disabled=true;status.textContent='Sending…';
    const rep={note:text.slice(0,NOTE_MAX),record,page:(location.pathname.split('/').slice(-2).join('/')+location.search).slice(0,500),
      build:buildOf([...document.scripts].map(s=>s.getAttribute('src'))),reporter:nameIn.value.trim().slice(0,NAME_MAX)||null,at:new Date().toISOString()};
    try{if(rep.reporter)root.localStorage.setItem(NAME_KEY,rep.reporter);}catch(e){}
    // (a retry after a report was kept on this device sends what is kept; it does not keep a second copy)
    const r=await send(queued?null:rep,await client(),root.localStorage);if(r.why)queued=true;
    status.textContent=message(r);
    if(!r.why){sendB.textContent='Sent';note.disabled=true;d.querySelector('[data-r=close]').textContent='Close';}
    else sendB.disabled=false;
  });
  note.focus();
}
const api={open,send,message,buildOf,readQueue,QUEUE_KEY,SUPABASE_URL,SUPABASE_ANON_KEY};
root.PitsReport=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
