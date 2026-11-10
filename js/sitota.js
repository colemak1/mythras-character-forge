"use strict";
/* Public views share the Forge renderer/router. No character state is stored
   here: visiting the table or guide must never replace an open draft. */
const WORLD_CHAPTERS=[
 {id:'welcome',label:'Start here',heading:'A book of the world',deck:'The places, people, and history around our story.',body:'<p>Use this guide when a name or place comes up at the table. These pages contain information intended for players, and will grow with the campaign.</p>'},
 {id:'places',label:'Lands & places',heading:'Lands & places',deck:'The map begins here.',body:'<span class="st-kind">Nation</span><h3>Valeshar</h3><p>A country in Sit’ota.</p><span class="st-kind">Capital</span><h3>Shamur</h3><p>The capital of Valeshar.</p>'},
 {id:'cultures',label:'Peoples & cultures',heading:'Peoples & cultures',deck:'The lives and customs of the world.',body:'<p>This chapter is awaiting its first entries.</p>'},
 {id:'faith',label:'Faith & belief',heading:'Faith & belief',deck:'Beliefs and sacred traditions.',body:'<p>This chapter is awaiting its first entries.</p>'},
 {id:'history',label:'History',heading:'History',deck:'Events that shaped Sit’ota.',body:'<p>This chapter is awaiting its first entries.</p>'},
 {id:'names',label:'Names & terms',heading:'Names & terms',deck:'A short index.',body:'<p>Sit’ota — the world.<br>Valeshar — a country.<br>Shamur — its capital.</p>'}
];
let WORLD_CHAPTER='welcome',WORLD_SEARCH='';
let HOME_CHARACTERS=null,HOME_CHARACTERS_OWNER=null,HOME_CHARACTERS_ERROR='',HOME_CHARACTERS_PENDING=null,SITE_HOME_ACTIVE=false;

function homeCharacterOwner(){return AUTH_USER?AUTH_USER.id:(MOCK_AUTH?'local':null);}
async function loadHomeCharacters(){
 const owner=homeCharacterOwner();
 if(!owner)return;
 const request={owner};
 HOME_CHARACTERS_PENDING=request;
 HOME_CHARACTERS_OWNER=owner;HOME_CHARACTERS=null;HOME_CHARACTERS_ERROR='';
 try{
  await Promise.resolve(); // Keep local and cloud loading asynchronous during render.
  if(cloudActive())await flushCloudSaves();
  if(homeCharacterOwner()!==owner||HOME_CHARACTERS_PENDING!==request)return;
  const rows=cloudActive()?await cloudFetchCharacters({mine:true}):loadCharLibLocal().map(localCharShape);
  if(homeCharacterOwner()!==owner||HOME_CHARACTERS_PENDING!==request)return;
  HOME_CHARACTERS=rows.slice().sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at)).slice(0,4);
 }catch(e){
  if(homeCharacterOwner()!==owner||HOME_CHARACTERS_PENDING!==request)return;
  HOME_CHARACTERS_ERROR='Your characters could not be loaded. Please try again.';
 }finally{
  if(HOME_CHARACTERS_PENDING===request){
   HOME_CHARACTERS_PENDING=null;
   if(APPVIEW==='menu'&&homeCharacterOwner()===owner)render();
  }
 }
}
function homeCharactersHTML(){
 const owner=homeCharacterOwner();
 let h='<section class="st-sec" aria-labelledby="homeCharactersTitle"><div class="st-frame"><div class="st-sec-h"><h2 id="homeCharactersTitle">Your characters</h2>'+(owner?'<a href="#/my-characters">View all</a>':'')+'</div>';
 if(!owner)return h+'<div class="st-waiting"><div><h3>Your table is waiting</h3><p>Sign in to see your characters here, or to start a new one.</p></div><div class="st-gate-actions"><button type="button" class="st-btn st-btn-primary" onclick="APP.toAccount()">Sign in</button></div></div></div></section>';
 if(HOME_CHARACTERS_OWNER!==owner||HOME_CHARACTERS===null&&!HOME_CHARACTERS_ERROR)h+='<p class="st-character-message" role="status">Loading your characters…</p>';
 else if(HOME_CHARACTERS_ERROR)h+='<p class="st-character-message" role="alert">'+esc(HOME_CHARACTERS_ERROR)+' <button type="button" class="st-btn st-btn-sm" onclick="loadHomeCharacters();render()">Retry</button></p>';
 const rows=(HOME_CHARACTERS_OWNER===owner&&!HOME_CHARACTERS_ERROR?HOME_CHARACTERS||[]:[]).filter(c=>!stHiddenByUndo(c)).slice(0,3);
 return h+'<div class="st-chars st-chars-home">'+rows.map(stCharCard).join('')+stNewCard()+'</div></div></section>';
}

// Hero "Continue": the most recently saved character (primary), or the
// in-progress draft when there are no saved ones yet; signed out, Sign in.
function homeContinueHTML(){
 if(!homeCharacterOwner())return '<button type="button" class="st-btn st-btn-primary st-btn-tall" onclick="APP.toAccount()">Sign in to continue</button>';
 const c=(HOME_CHARACTERS||[]).find(x=>!stHiddenByUndo(x));
 if(c){
  const st=stCharStats(c);
  return '<a class="st-resume" href="#/character/'+esc(encodeURIComponent(c.id))+'/play" aria-label="Continue '+esc(c.name||'Unnamed Character')+'">'+stPortrait(c,'st-mono st-mono-sm')
   +'<span class="st-resume-txt"><b>Continue</b><span>'+esc(c.name||'Unnamed Character')+'</span><small>Saved '+esc(stWhen(c.updated_at))+(st.style?' · '+esc(st.style.name)+' '+st.style.pct+'%':'')+'</small></span>'
   +'<span class="st-go" aria-hidden="true">→</span></a>';
 }
 const auto=getAutosaveInfo();
 return auto?'<button type="button" class="st-resume" onclick="APP.fromMenuContinue()"><span class="st-resume-txt"><b>Continue</b><span>'+esc(auto.name)+'</span><small>Character in progress</small></span><span class="st-go" aria-hidden="true">→</span></button>':'';
}

/* This view follows the owner-approved 16:9 reference, polished per the
   2026-11-07 menu redesign handoff. Other app views unchanged. */
function sitotaHomeHTML(){
 const pits=stPitsLiveLine();
 const tile=(href,icon,title,text,live,cls)=>'<a class="st-dest'+(cls?' '+cls:'')+'" href="'+href+'"><span class="st-dest-arrow" aria-hidden="true">→</span>'+icon+'<h3>'+title+'</h3><p>'+text+'</p>'+(live?'<span class="st-live">'+live+'</span>':'')+'</a>';
 const svg=d=>'<svg class="st-dest-icon" viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
 return '<div class="sitota-public st-home st-home-16x9">'
 +'<section class="st-hero"><div class="st-hero-art" aria-hidden="true"></div><div class="st-frame st-hero-layout"><div class="st-hero-copy">'
 +'<div class="st-eyebrow">Valeshar Campaign</div><h1>New Sit’ota</h1><p class="st-lede">The world guide, characters, and everything<br class="st-desktop-break"> we need for the campaign.</p>'
 +'<div class="st-ctas">'+homeContinueHTML()+'<a class="st-world-link" href="#/world/welcome">Explore Sit’ota <span class="st-arrow" aria-hidden="true">→</span></a></div>'
 +'</div></div><span class="st-hero-credit">Art: Richard Wright · © Wizards of the Coast</span></section>'
 +(MENU_MSG?'<p class="st-frame st-message" role="status">'+esc(MENU_MSG)+'</p>':'')
 +(LOCAL_SAVE_ERROR?'<p class="st-frame st-message" role="alert">'+esc(LOCAL_SAVE_ERROR)+'</p>':'')
 +homeCharactersHTML()
 +'<section class="st-sec" aria-labelledby="homeTableTitle"><div class="st-frame"><div class="st-sec-h"><h2 id="homeTableTitle">At the table</h2></div><div class="st-dests">'
 +tile('#/my-campaigns',svg('<path d="M6 21V3M6 4h11l-2 4 2 4H6"/>'),'Campaign','Party board, sessions and shared notes.','')
 +tile('#/the-pits',svg('<path d="M4 4l10 10M14 14l-2 2 4 4 2-2zM20 4L10 14M10 14l2 2-4 4-2-2z"/>'),'The Pits','Practise Mythras combat. Wounds never touch your character.',pits,'st-dest-pits')
 +tile('#/wiki',svg('<path d="M12 6C9 4 6 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/>'),'Rules','Search the Mythras rules by chapter.','')
 +tile('#/world/welcome',svg('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>'),'World Guide','People, places and history of Sit’ota.','')
 +'</div>'+(homeCharacterOwner()?'<div class="st-table-actions"><span>Starting a table?</span><button type="button" class="st-btn st-btn-sm" onclick="APP.newCampaign()">Create campaign</button><button type="button" class="st-btn st-btn-sm" onclick="APP.homeJoinCampaign()">Join a campaign</button></div>':'')+'</div></section>'
 +'<div class="st-frame st-orc"><p>Rules text is drawn from Mythras Imperative and Classic Fantasy Imperative by The Design Mechanism, used under the ORC licence. Mythras and Classic Fantasy are Reserved Material.</p></div>'
 +'</div>';
}

function worldChapterNavHTML(){
 const q=WORLD_SEARCH.toLowerCase().trim();
 return WORLD_CHAPTERS.filter(c=>(c.label+' '+c.heading+' '+c.deck+' '+c.body.replace(/<[^>]*>/g,' ')).toLowerCase().includes(q))
  .map(c=>'<a href="#/world/'+c.id+'" '+(c.id===WORLD_CHAPTER?'aria-current="page"':'')+'>'+esc(c.label)+'</a>').join('')||'<p>No chapters found.</p>';
}
function worldHTML(){
 const c=WORLD_CHAPTERS.find(c=>c.id===WORLD_CHAPTER)||WORLD_CHAPTERS[0];
 return '<section class="sitota-public st-world"><div class="st-frame"><div class="st-world-intro"><div class="st-eyebrow">A guide for the players</div><h1>Sit’ota</h1><p>Places, people, and history as we discover them.</p></div><div class="st-guide"><aside><label for="worldSearch">Search the guide</label><input id="worldSearch" type="search" autocomplete="off" placeholder="Search chapters" value="'+esc(WORLD_SEARCH)+'" oninput="siteSearchWorld(this.value)"><nav class="st-chapters" id="worldChapterNav" aria-label="Guide chapters">'+worldChapterNavHTML()+'</nav></aside><article aria-live="polite" id="worldArticle"><div class="st-eyebrow">The Sit’ota world guide</div><h2>'+c.heading+'</h2><p class="st-deck">'+c.deck+'</p><div class="st-copy">'+c.body+'</div></article></div></div></section>';
}
function siteSearchWorld(value){
 WORLD_SEARCH=value;
 document.getElementById('worldChapterNav').innerHTML=worldChapterNavHTML();
}
function renderWorldView(){
 document.body.classList.remove('play-mode','sheet-mode');
 document.body.classList.add('menu-mode');
 document.title=(WORLD_CHAPTERS.find(c=>c.id===WORLD_CHAPTER)||WORLD_CHAPTERS[0]).heading+' — Sit’ota';
 $('#main').innerHTML=worldHTML();
}
// Use the existing new-character confirmation instead of bypassing it with a
// warm #/character/new link. Modified clicks still open a normal bookmark URL.
function siteStartCharacter(event){
 if(event&&(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button>0))return true;
 if(!AUTH_USER&&!MOCK_AUTH){APP.toAccount();AUTH_MSG={text:'Sign in to create a character.'};render();}
 else APP.fromMenuNew();
 return false;
}
function updateSiteHeader(){
 // Semantic view marker for scoped visual design; no routing or data changes.
 document.body.dataset.sitotaView=APPVIEW;
 SITE_HOME_ACTIVE=APPVIEW==='menu';
 if(!homeCharacterOwner()){HOME_CHARACTERS=null;HOME_CHARACTERS_OWNER=null;HOME_CHARACTERS_ERROR='';HOME_CHARACTERS_PENDING=null;}
 const publicView=APPVIEW==='menu'||APPVIEW==='world';
 document.body.classList.toggle('sitota-public-view',publicView);
 const footer=document.getElementById('siteFooter');if(footer)footer.hidden=!publicView;
 const header=document.querySelector('.sitota-header');
 if(!header)return;
 const active=['play','sheet'].includes(APPVIEW)?'library':(['campaign','board','campaign-setup'].includes(APPVIEW)?'campaigns':APPVIEW);
 header.querySelectorAll('[data-site-view]').forEach(link=>{
  if(link.dataset.siteView===active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 });
 updateSiteTabbar(active);
 updateSiteAccount();
}
// Account button (v0 "Style A" header): the signed-in name and its initial,
// or a person icon and "Sign in" when signed out.
function siteAccountInfo(){
 const signed=!!(AUTH_USER||MOCK_AUTH);
 const name=signed?String((AUTH_PROFILE&&AUTH_PROFILE.display_name)||(MOCK_AUTH&&MOCK_AUTH.display_name)||(AUTH_USER&&AUTH_USER.email)||'Account').trim():'Account';
 const sub=!signed?'Sign in':MOCK_AUTH&&!AUTH_USER?'Guest · On this device':'Signed in · Synced';
 const m=signed&&name.match(/[A-Za-z0-9]/);
 return {signed,name,sub,initial:m?m[0].toUpperCase():''};
}
function updateSiteAccount(){
 const a=document.getElementById('siteAccount');if(!a)return;
 const info=siteAccountInfo();
 const av=document.getElementById('siteAccountAv'),nm=document.getElementById('siteAccountName'),sb=document.getElementById('siteAccountSub');
 if(av){if(info.initial)av.textContent=info.initial;else if(!av.querySelector('svg'))av.innerHTML='<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2c0-5 3.5-7 8-7s8 2 8 7v2"/></svg>';}
 if(nm)nm.textContent=info.name;
 if(sb)sb.textContent=info.sub;
 a.setAttribute('aria-label',info.signed?'Account — '+info.name:'Account and sign-in');
 a.title=info.signed?'Account — '+info.name:'Account and sign-in';
}

/* ---- Shared interior page pattern (2026-11-07 menu redesign) ----
   Every interior view (Characters, Campaign, The Pits, Rules, Account) opens
   with the same header: eyebrow, serif title, one-line subtitle and an
   optional primary action. Home is reached through the site nav, so these
   pages no longer carry a "Main Menu" button. */
function stPageHead(o){
 o=o||{};
 return '<header class="st-pagehead"><div class="st-pagehead-text">'
  +'<p class="st-eyebrow">'+esc(o.eyebrow||'Your table')+'</p>'
  +'<h1'+(o.h1Class?' class="'+o.h1Class+'"':'')+'>'+esc(o.title||'')+'</h1>'
  +(o.sub?'<p class="st-sub">'+o.sub+'</p>':'')
  +'</div>'+(o.action?'<div class="st-pageaction">'+o.action+'</div>':'')+'</header>';
}
// Signed-out pages that need an account show a gate card, not a silent jump
// to Account. kind: 'library' | 'campaigns' | 'pits'.
function stGateHTML(kind){
 const what={library:['characters','Your characters are saved to your account, so you can play them on any device.'],
  campaigns:['campaigns','Campaigns sync between the GM and players, so they need an account.'],
  pits:['characters in The Pits','Bring one of your own characters into the arena.']}[kind]||['this page',''];
 return '<section class="st-gate" aria-labelledby="stGateTitle"><svg class="st-gate-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'
  +'<h2 id="stGateTitle">Sign in to see your '+esc(what[0])+'</h2><p>'+esc(what[1])+'</p>'
  +'<div class="st-gate-actions"><button type="button" class="st-btn st-btn-primary" onclick="APP.toAccount()">Sign in</button>'
  +'<button type="button" class="st-btn" onclick="APP.toAccount()">Create account</button></div></section>';
}
function stSignedIn(){return !!(AUTH_USER||MOCK_AUTH);}
// After a route change, move focus to the page title for keyboard and
// screen-reader users (the h1 gets tabindex=-1 only while focused).
function focusPageTitle(){
 const h=document.querySelector('#main h1');if(!h)return;
 if(!h.hasAttribute('tabindex'))h.setAttribute('tabindex','-1');
 try{h.focus({preventScroll:true});}catch(e){h.focus();}
}
// Phone tab bar (below 900px): mark the active tab and close the More sheet.
function updateSiteTabbar(active){
 const bar=document.getElementById('stTabbar');if(!bar)return;
 const more=['wiki','world','account'].includes(active);
 bar.querySelectorAll('[data-tab]').forEach(t=>{
  const on=t.dataset.tab===active||(t.dataset.tab==='more'&&more);
  if(on)t.setAttribute('aria-current','page');else t.removeAttribute('aria-current');
 });
 // Any route change dismisses the More sheet (live batch 2026-11-09: it
 // stayed open over Rules and World Guide after choosing them).
 const sheet=document.getElementById('stMoreSheet');
 if(sheet&&!sheet.hidden)stCloseMore();
 document.querySelectorAll('#stMoreSheet [data-site-view]').forEach(l=>{
  if(l.dataset.siteView===active)l.setAttribute('aria-current','page');else l.removeAttribute('aria-current');
 });
}
function stOpenMore(){
 const s=document.getElementById('stMoreSheet'),b=document.getElementById('stMoreBtn');if(!s)return;
 s.hidden=false;b&&b.setAttribute('aria-expanded','true');
 const first=s.querySelector('a,button');first&&first.focus();
}
function stCloseMore(){
 const s=document.getElementById('stMoreSheet'),b=document.getElementById('stMoreBtn');if(!s)return;
 s.hidden=true;b&&b.setAttribute('aria-expanded','false');
}
// Choosing a destination closes the sheet, even when it is the page already
// shown (no route change follows then).
if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('click',e=>{
 const link=e.target&&e.target.closest&&e.target.closest('#stMoreSheet a[href]');
 if(link)stCloseMore();
});
if(typeof document!=='undefined'&&document.addEventListener)document.addEventListener('keydown',e=>{
 const s=document.getElementById('stMoreSheet');
 if(e.key==='Escape'&&s&&!s.hidden){stCloseMore();document.getElementById('stMoreBtn')?.focus();}
});

/* ---- Character cards (Home and Characters; owner menu redesign) ---- */
const ST_CARD_STATS={};
// Real numbers for a saved character: its best Combat Style, AP and campaign.
// Computed against a temporary copy of the character, never the open draft.
function stCharStats(c){
 const key=c.id+'|'+c.updated_at;if(ST_CARD_STATS[key])return ST_CARD_STATS[key];
 const out={style:null,ap:null};
 if(c.state&&typeof freshState==='function'){
  const original=S;
  try{
   S=Object.assign(freshState(),JSON.parse(JSON.stringify(c.state)));normalizeState();
   const best=stylesList().map(s=>({name:s.name,pct:finalPct(s.key)})).sort((a,b)=>b.pct-a.pct)[0];
   if(best&&best.pct>0)out.style=best;
   const v=charVitals(S);if(v&&Number.isFinite(v.baseAP))out.ap=v.baseAP;
  }catch(e){}finally{S=original;}
 }
 const camp=c.campaign_id&&Array.isArray(CAMP_CACHE)?CAMP_CACHE.find(x=>x.id===c.campaign_id):null;
 out.campaign=camp?camp.name:null;
 return ST_CARD_STATS[key]=out;
}
function stWhen(iso){
 const t=new Date(iso).getTime();if(!Number.isFinite(t))return '';
 const days=Math.floor((Date.now()-t)/86400000);
 return days<=0?'today':days===1?'yesterday':days<7?days+' days ago':days<14?'last week':new Date(iso).toLocaleDateString();
}
function stInitials(name){return ((String(name||'?').match(/\b[A-Za-z]/g)||['?']).slice(0,2).join('')).toUpperCase();}
function stHue(id){let h=0;for(const ch of String(id))h=(h*31+ch.charCodeAt(0))>>>0;return h%4;}
function stPortrait(c,cls){
 const p=c.state?.concept?.portrait;
 const safe=typeof p==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]{1,200000}$/.test(p);
 return '<div class="'+cls+' st-h'+stHue(c.id)+'" aria-hidden="true">'+(safe?'<img src="'+p+'" alt="">':esc(stInitials(c.name)))+'</div>';
}
function stCharCard(c){
 const name=c.name||'Unnamed Character',id=jsq(c.id),st=stCharStats(c);
 const tier=c.tier&&c.tier!=='ordinary'&&typeof ARCHETYPES!=='undefined'&&ARCHETYPES[c.tier]?ARCHETYPES[c.tier].label:null;
 const meta=[c.culture,c.career,tier].filter(Boolean).map(esc).join(' · ')||'Character in progress';
 const chips=(st.style?'<span class="st-chip st-chip-g">'+esc(st.style.name)+' '+st.style.pct+'%</span>':'')
  +(st.ap!=null?'<span class="st-chip">'+st.ap+' AP</span>':'')
  +(st.campaign?'<span class="st-chip st-chip-t">'+esc(st.campaign)+'</span>':'');
 return '<article class="st-cc" data-char-id="'+esc(c.id)+'"><div class="st-cc-top">'+stPortrait(c,'st-mono')
  +'<div class="st-cc-text"><h3>'+esc(name)+'</h3><div class="st-cc-meta">'+meta+'</div>'+(chips?'<div class="st-cc-stats">'+chips+'</div>':'')+'</div></div>'
  +'<div class="st-cc-foot"><span class="st-cc-when">Saved '+esc(stWhen(c.updated_at))+'</span>'
  +'<button type="button" class="st-btn st-btn-primary st-btn-sm" onclick="APP.openCharToPlay(\''+id+'\')" aria-label="Play '+esc(name)+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>Play</button>'
  +'<button type="button" class="st-menu-b" aria-haspopup="menu" aria-expanded="false" aria-controls="stPop-'+esc(c.id)+'" aria-label="More actions for '+esc(name)+'" onclick="stTogglePop(this)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button></div>'
  +'<div class="st-pop" role="menu" id="stPop-'+esc(c.id)+'" hidden>'
  +'<button type="button" role="menuitem" onclick="APP.openCharToEdit(\''+id+'\')">Edit character</button>'
  +'<button type="button" role="menuitem" onclick="APP.openCharToSheet(\''+id+'\')">Print sheet</button>'
  +'<button type="button" role="menuitem" class="st-pop-del" onclick="stDeleteWithUndo(\''+id+'\',\''+jsq(name)+'\')">Delete</button></div></article>';
}
function stCloseMenus(except){
 document.querySelectorAll('.st-pop:not([hidden])').forEach(p=>{if(p!==except){p.hidden=true;document.querySelector('[aria-controls="'+p.id+'"]')?.setAttribute('aria-expanded','false');}});
}
function stTogglePop(btn){
 const pop=document.getElementById(btn.getAttribute('aria-controls'));if(!pop)return;
 stCloseMenus(pop);const open=pop.hidden;pop.hidden=!open;btn.setAttribute('aria-expanded',String(open));
 if(open)pop.querySelector('button')?.focus();
}
if(typeof document!=='undefined'&&document.addEventListener){
 document.addEventListener('click',e=>{if(!e.target.closest?.('.st-pop,.st-menu-b'))stCloseMenus();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.st-pop:not([hidden])')){stCloseMenus();}});
}
// Delete with Undo: the card hides at once; the real delete runs only after
// the toast expires, so Undo needs no server round trip.
let ST_PENDING_DELETE=null;
function stDeleteWithUndo(id,name){
 stCloseMenus();
 if(ST_PENDING_DELETE)stFinishDelete();
 const timer=setTimeout(stFinishDelete,6000);
 ST_PENDING_DELETE={id,name,timer};
 stShowUndo(name);render();
}
function stFinishDelete(){
 const p=ST_PENDING_DELETE;if(!p)return;ST_PENDING_DELETE=null;clearTimeout(p.timer);
 stHideUndo();
 if(typeof APP.deleteLibChar==='function')APP.deleteLibChar(p.id,p.name,{confirmed:true});
}
function stUndoDelete(){
 const p=ST_PENDING_DELETE;if(!p)return;ST_PENDING_DELETE=null;clearTimeout(p.timer);stHideUndo();render();
}
function stShowUndo(name){
 let t=document.getElementById('stToast');
 if(!t){t=document.createElement('div');t.id='stToast';t.className='st-toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');document.body.append(t);}
 t.innerHTML='<span>Deleted '+esc(name)+'.</span><button type="button" class="st-btn st-btn-sm" onclick="stUndoDelete()">Undo</button>';t.hidden=false;
}
function stHideUndo(){const t=document.getElementById('stToast');if(t)t.hidden=true;}
function stHiddenByUndo(c){return !!(ST_PENDING_DELETE&&String(ST_PENDING_DELETE.id)===String(c.id));}
function stNewCard(){return '<a class="st-new-card" href="#/character/new" onclick="return siteStartCharacter(event)"><span class="st-plus" aria-hidden="true">+</span>New character</a>';}
// The Pits tile: best local run, only when one exists.
function stPitsLiveLine(){
 try{const rows=JSON.parse(localStorage.getItem('sitota-practice-score-v1')||'[]');
  const best=(Array.isArray(rows)?rows:[]).filter(r=>r&&r.wins>0).sort((a,b)=>b.wins-a.wins)[0];
  return best?'Best run: '+best.wins+' win'+(best.wins===1?'':'s')+(best.charname?' · '+esc(best.charname):''):'';
 }catch(e){return '';}
}
