// Site-wide feedback button (owner, 2026-11-27). A small round button in the bottom-right corner of every page opens a
// popup: "Report a bug" or "Share an idea", a text box and an optional name. It records where the player was (page,
// view, viewport size, light or dark) and saves it in the same table as the Pits fight reports
// (supabase/migrations/20261114120000_pits_fight_reports.sql), so the "Export Pits fight reports" workflow copies it to
// the `pits-reports` branch with them (docs/pits-reports.md, "Site feedback"). No new table, no new permission.
//   - The note starts "[Site bug]" or "[Site idea]"; the record is small: {record:"site-feedback", ...}.
//   - Anyone can send, signed in or not, like a fight report. Offline or refused, it is kept on this device and sent
//     with the next one that goes through.
//   - On phones the button sits above whatever bar is fixed along the bottom (the tab bar, Play Mode's bar, the
//     character builder's footer), measured on the page, so it never covers navigation. In a Pits fight it is hidden:
//     the fight has its own Report fight and Idea buttons, which carry the fight record.
(function(root){
// The same project and public (anon) key as js/cloud.js (tests/feedback.cjs checks they match). The anon key is public
// by design: what it can do is limited by the database's row-level security.
const SUPABASE_URL='https://yogzdbcskpvtssgckgib.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZ3pkYmNza3B2dHNzZ2NrZ2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDcwODksImV4cCI6MjA5OTI4MzA4OX0.ErzC2pHXjlY5sV2dRP6omXFl5EQwj6gooBCikx6ftfw';
const SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
// the name is shared with the Pits windows, so a tester types it once
const QUEUE_KEY='sitota-feedback-pending-v1',NAME_KEY='sitota-pits-reporter-v1',QUEUE_MAX=20,NOTE_MAX=4000,NAME_MAX=60;
const KINDS={bug:{tag:'[Site bug]',label:'Report a bug',ask:'What went wrong? Say what you did and what you expected.'},
  idea:{tag:'[Site idea]',label:'Share an idea',ask:'What would you like to see, or see work differently?'}};
// bars fixed along the bottom of the screen that the button must sit above
const BARS='.st-tabbar,.pmx-phonebar,.foot';

// ----- the parts that do not need a browser (tested in tests/feedback.cjs) -----
// where the player is: {page, view, hash, viewport:{w,h,dpr}, mode}
function where(loc,doc,win){
  const parts=String(loc.pathname||'/').split('/').filter(Boolean);
  const page=((parts.slice(-2).join('/')||'index.html')+(loc.search||'')).slice(0,500);
  const b=doc&&doc.body,view=(b&&b.dataset&&b.dataset.sitotaView)||(b&&b.classList&&b.classList.contains('pits-page')?'pits':null);
  return {page,view:view||null,hash:String(loc.hash||'').slice(0,200)||null,
    viewport:{w:Math.round(win.innerWidth||0),h:Math.round(win.innerHeight||0),dpr:Number(win.devicePixelRatio)||1},
    mode:(doc&&doc.documentElement&&doc.documentElement.dataset&&doc.documentElement.dataset.mode)||'light'};
}
// the row saved in the database; at: ISO time it was written (kept so a late send still says when)
function row(kind,text,place,reporter,ua,at){
  const k=KINDS[kind]?kind:'bug',note=String(text||'').trim();
  if(!note)return null;
  const record={record:'site-feedback',kind:k,view:place.view,hash:place.hash,viewport:place.viewport,mode:place.mode,
    userAgent:String(ua||'').slice(0,300),at};
  return {note:(KINDS[k].tag+' '+note).slice(0,NOTE_MAX),record,page:place.page,
    build:('view='+(place.view||'-')+';'+place.viewport.w+'x'+place.viewport.h).slice(0,200),
    reporter:String(reporter||'').trim().slice(0,NAME_MAX)||null};
}
function readQueue(store){try{const v=JSON.parse(store.getItem(QUEUE_KEY)||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}}
function writeQueue(store,q){try{if(q.length)store.setItem(QUEUE_KEY,JSON.stringify(q.slice(-QUEUE_MAX)));else store.removeItem(QUEUE_KEY);return true;}catch(e){return false;}}
// Send one (and any kept from before). client: a Supabase client, or null when it could not be loaded.
// Returns {sent, kept, why: null | 'offline' | 'error', detail, lost}
async function send(item,client,store){
  const q=readQueue(store);if(item)q.push(item);
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
function message(r){
  if(r.lost)return 'Not sent, and this browser would not keep it. Copy your text and send it another way.';
  if(!r.why)return r.sent>1?'Sent, with '+(r.sent-1)+' kept from before. Thank you.':'Sent. Thank you.';
  const kept=' Kept on this device ('+r.kept+' waiting); it is sent with the next one that goes through.';
  if(r.why==='offline')return 'Not sent: the site\'s database could not be reached.'+kept;
  return 'Not sent: '+(r.detail||'the database refused it')+'.'+kept;
}
// how far above the bottom edge the button must sit: the tallest bar fixed along the bottom.
// bars: [{display, visibility, position, top, bottom, height}], vh: the viewport height
function liftFor(bars,vh){
  let h=0;
  for(const b of bars){
    if(b.display==='none'||b.visibility==='hidden'||b.position!=='fixed'||!(b.height>0))continue;
    if(b.bottom<vh-2)continue;
    h=Math.max(h,Math.ceil(vh-b.top));
  }
  return h;
}

// ----- the browser part -----
let clientP=null;
function client(){
  if(clientP)return clientP;
  clientP=new Promise(res=>{
    // its own client that never signs in or keeps a session, so it cannot disturb the site's sign-in
    const make=()=>{try{res(root.supabase&&root.supabase.createClient?root.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,
      {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'sitota-feedback-auth'}}):null);}catch(e){res(null);}};
    if(root.supabase)return make();
    const s=document.createElement('script');s.src=SDK;s.async=true;s.onload=make;s.onerror=()=>{clientP=null;res(null);};
    document.head.append(s);setTimeout(()=>{if(!root.supabase)res(null);},10000);
  });
  return clientP;
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ICON='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5z"/><path d="M8.5 8.5h7M8.5 11.5h4.5"/></svg>';

function relift(){
  const vh=root.innerHeight,bars=[];
  for(const el of document.querySelectorAll(BARS)){
    const cs=getComputedStyle(el),r=el.getBoundingClientRect();
    bars.push({display:cs.display,visibility:cs.visibility,position:cs.position,top:r.top,bottom:r.bottom,height:r.height});
  }
  document.documentElement.style.setProperty('--fb-lift',liftFor(bars,vh)+'px');
}
let raf=0;const later=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;relift();});};

function close(){
  const p=document.getElementById('fbPanel');if(!p)return;
  p.remove();document.removeEventListener('keydown',onKey,true);document.removeEventListener('pointerdown',onOutside,true);
  const b=document.getElementById('fbButton');if(b){b.setAttribute('aria-expanded','false');b.focus();}
}
function onKey(e){if(e.key==='Escape'){e.stopPropagation();close();}}
function onOutside(e){const p=document.getElementById('fbPanel'),b=document.getElementById('fbButton');
  if(p&&!p.contains(e.target)&&!(b&&b.contains(e.target))&&!p.dataset.busy)close();}

function open(kind){
  if(document.getElementById('fbPanel')){close();return;}
  const store=root.localStorage||{getItem:()=>null,setItem(){},removeItem(){}};
  const waiting=readQueue(store).length;
  let k=KINDS[kind]?kind:'bug';
  const p=document.createElement('div');p.id='fbPanel';p.className='fb-panel';
  p.setAttribute('role','dialog');p.setAttribute('aria-modal','false');p.setAttribute('aria-labelledby','fbTitle');
  p.innerHTML='<h2 id="fbTitle" class="fb-title">Feedback</h2>'
    +'<div class="fb-kinds" role="radiogroup" aria-label="Kind of feedback">'
    +Object.keys(KINDS).map(x=>'<button type="button" role="radio" class="fb-kind" data-k="'+x+'">'+KINDS[x].label+'</button>').join('')+'</div>'
    +'<label class="fb-ask" for="fbNote"></label>'
    +'<textarea id="fbNote" class="fb-note" rows="4" maxlength="'+(NOTE_MAX-12)+'"></textarea>'
    +'<label class="fb-name">Your name (optional) <input id="fbName" type="text" maxlength="'+NAME_MAX+'" autocomplete="nickname"></label>'
    +'<p class="fb-where" id="fbWhere"></p>'
    +'<p class="fb-status" id="fbStatus" role="status">'+(waiting?esc(waiting+' earlier message'+(waiting>1?'s':'')+' waiting on this device; sent with this one.'):'')+'</p>'
    +'<div class="fb-actions"><button type="button" class="fb-cancel" data-a="close">Cancel</button>'
    +'<button type="button" class="fb-send" data-a="send">Send</button></div>';
  document.body.append(p);
  const note=p.querySelector('#fbNote'),nameIn=p.querySelector('#fbName'),status=p.querySelector('#fbStatus'),
    sendB=p.querySelector('[data-a=send]'),cancelB=p.querySelector('[data-a=close]'),ask=p.querySelector('.fb-ask');
  try{nameIn.value=store.getItem(NAME_KEY)||'';}catch(e){}
  const place=where(root.location,document,root);
  p.querySelector('#fbWhere').textContent='Sent with: '+(place.view?place.view+' · ':'')+place.page+' · '+place.viewport.w+'×'+place.viewport.h;
  const pick=x=>{k=x;ask.textContent=KINDS[k].ask;
    for(const b of p.querySelectorAll('.fb-kind')){const on=b.dataset.k===k;b.setAttribute('aria-checked',String(on));b.tabIndex=on?0:-1;}};
  pick(k);
  for(const b of p.querySelectorAll('.fb-kind'))b.addEventListener('click',()=>{pick(b.dataset.k);note.focus();});
  p.querySelector('.fb-kinds').addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();
    pick(k==='bug'?'idea':'bug');p.querySelector('.fb-kind[data-k="'+k+'"]').focus();});
  cancelB.addEventListener('click',close);
  let queued=false;
  sendB.addEventListener('click',async()=>{
    if(sendB.textContent==='Sent'){close();return;}
    const item=queued?null:row(k,note.value,where(root.location,document,root),nameIn.value,root.navigator&&navigator.userAgent,new Date().toISOString());
    if(!queued&&!item){status.textContent='Type something first.';note.focus();return;}
    if(item&&item.reporter){try{store.setItem(NAME_KEY,item.reporter);}catch(e){}}
    sendB.disabled=true;p.dataset.busy='1';status.textContent='Sending…';
    const r=await send(item,await client(),store);if(r.why)queued=true;
    delete p.dataset.busy;status.textContent=message(r);sendB.disabled=false;
    if(!r.why){sendB.textContent='Sent';note.disabled=true;cancelB.textContent='Close';cancelB.focus();}
  });
  document.addEventListener('keydown',onKey,true);document.addEventListener('pointerdown',onOutside,true);
  document.getElementById('fbButton')?.setAttribute('aria-expanded','true');
  note.focus();
}

function mount(){
  if(document.getElementById('fbButton'))return;
  const b=document.createElement('button');b.type='button';b.id='fbButton';b.className='fb-button';
  b.setAttribute('aria-label','Feedback: report a bug or share an idea');b.title='Report a bug or share an idea';
  b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls','fbPanel');
  b.innerHTML=ICON;b.addEventListener('click',()=>open());
  document.body.append(b);
  relift();
  root.addEventListener('resize',later);root.addEventListener('hashchange',later);
  new MutationObserver(later).observe(document.body,{attributes:true,attributeFilter:['class','data-sitota-view'],childList:true});
  const foot=document.getElementById('foot');if(foot)new MutationObserver(later).observe(foot,{childList:true,attributes:true});
}

const api={open,close,send,message,row,where,liftFor,readQueue,KINDS,QUEUE_KEY,NAME_KEY,SUPABASE_URL,SUPABASE_ANON_KEY};
root.SiteFeedback=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof document!=='undefined'&&document.addEventListener){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
}
})(typeof window!=='undefined'?window:globalThis);
