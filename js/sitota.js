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
 let h='<section class="st-characters" aria-labelledby="homeCharactersTitle"><div class="st-frame"><div class="st-characters-head"><h2 id="homeCharactersTitle">Your characters</h2><a href="#/my-characters">View all characters <span aria-hidden="true">→</span></a></div>';
 if(!owner)h+='<p class="st-character-message"><a href="#/account">Sign in</a> to see your characters here.</p>';
 else if(HOME_CHARACTERS_OWNER!==owner||HOME_CHARACTERS===null&&!HOME_CHARACTERS_ERROR)h+='<p class="st-character-message" role="status">Loading your characters…</p>';
 else if(HOME_CHARACTERS_ERROR)h+='<p class="st-character-message" role="alert">'+esc(HOME_CHARACTERS_ERROR)+' <button type="button" onclick="loadHomeCharacters();render()">Retry</button></p>';
 const rows=owner&&HOME_CHARACTERS_OWNER===owner&&!HOME_CHARACTERS_ERROR?HOME_CHARACTERS||[]:[];
 h+='<div class="st-character-grid">'+rows.map(c=>{
  const name=c.name||'Unnamed Character';
  const portrait=c.state?.concept?.portrait;
  const safePortrait=typeof portrait==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]{1,200000}$/.test(portrait);
  const initials=((name.match(/\b[A-Za-z]/g)||['?']).slice(0,2).join('')).toUpperCase();
  const meta=[c.culture,c.career].filter(Boolean).map(esc).join(' · ')||'Character in progress';
  return '<a class="st-character-card" href="#/character/'+esc(encodeURIComponent(c.id))+'/play" aria-label="Open '+esc(name)+'"><div class="st-character-portrait">'+(safePortrait?'<img src="'+portrait+'" alt="" loading="lazy">':'<span class="st-character-initials" aria-hidden="true">'+esc(initials)+'</span>')+'</div><div class="st-character-caption"><h3>'+esc(name)+'</h3><p>'+meta+'</p><span class="st-character-open">Open character <span aria-hidden="true">→</span></span></div></a>';
 }).join('');
 if(owner&&HOME_CHARACTERS_OWNER===owner&&HOME_CHARACTERS?.length===0&&!HOME_CHARACTERS_ERROR)h+='<p class="st-character-empty">Your next story starts here.<span>Create your first character to keep their sheet close at hand.</span></p>';
 return h+'<a class="st-character-card st-character-create" href="#/character/new" onclick="return siteStartCharacter(event)"><span class="st-create-mark" aria-hidden="true">+</span><span>Create character</span></a></div></div></section>';
}


/* This view follows the owner-approved 16:9 reference. Other app views unchanged. */
function sitotaHomeHTML(){
 const auto=(AUTH_USER||MOCK_AUTH)?getAutosaveInfo():null;
 return '<div class="sitota-public st-home st-home-16x9">'
 +'<section class="st-hero"><div class="st-hero-art" aria-hidden="true"></div><div class="st-frame st-hero-layout"><div class="st-hero-copy">'
 +'<div class="st-eyebrow">Valeshar Campaign</div><h1>New Sit’ota</h1><p class="st-lede">The world guide, characters, and everything<br class="st-desktop-break"> we need for the campaign.</p>'
 +'<div class="st-links"><a class="st-world-link" href="#/world/welcome">Explore Sit’ota <span class="st-arrow" aria-hidden="true">→</span></a></div>'
 +'</div></div><span class="st-hero-credit">Art: Richard Wright · © Wizards of the Coast</span></section>'
 +(MENU_MSG?'<p class="st-frame st-message" role="status">'+esc(MENU_MSG)+'</p>':'')
 +(LOCAL_SAVE_ERROR?'<p class="st-frame st-message" role="alert">'+esc(LOCAL_SAVE_ERROR)+'</p>':'')
 +(auto?'<div class="st-frame"><button class="st-continue" type="button" onclick="APP.fromMenuContinue()">Continue '+esc(auto.name)+' →</button></div>':'')
 +homeCharactersHTML()
 +'<section class="st-home-tools" aria-label="Campaign tools"><div class="st-frame st-home-tools-inner">'
 +'<div class="st-home-tool"><svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="24" cy="11" r="6"/><path d="M12 39v-5c0-8 5-12 12-12s12 4 12 12v5H12ZM9 18a5 5 0 1 1 0-10m0 15c-6 1-8 5-8 11v5h8m30-21a5 5 0 1 0 0-10m0 15c6 1 8 5 8 11v5h-8"/></svg><div><h2>Campaign</h2><p>Party board, sessions, and shared notes.</p><a href="#/my-campaigns">Open campaign →</a><div class="st-tool-secondary"><button type="button" onclick="APP.newCampaign()">Create campaign</button><button type="button" onclick="APP.homeJoinCampaign()">Join campaign</button></div></div></div>'
 +'<div class="st-home-tool"><svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M24 10C17 6 10 6 4 9v28c7-3 13-2 20 2 7-4 13-5 20-2V9c-6-3-13-3-20 1Zm0 0v29"/></svg><div><h2>Rules reference</h2><p>Search the Mythras rules.</p><a href="#/wiki">Browse rules →</a></div></div>'
 +'<div class="st-home-tool"><svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 10 18 5l13 5 13-5v32l-13 5-13-5-14 5V10Zm14-5v32m13-27v32"/></svg><div><h2>World guide</h2><p>People, places, and history of Sit’ota.</p><a href="#/world/welcome">Explore the world →</a></div></div>'
 +'</div></section></div>';
}

function worldChapterNavHTML(){
 const q=WORLD_SEARCH.toLowerCase().trim();
 return WORLD_CHAPTERS.filter(c=>(c.label+' '+c.heading+' '+c.deck+' '+c.body.replace(/<[^>]*>/g,' ')).toLowerCase().includes(q))
  .map(c=>'<a href="#/world/'+c.id+'" '+(c.id===WORLD_CHAPTER?'aria-current="page"':'')+'>'+esc(c.label)+'</a>').join('')||'<p>No chapters found.</p>';
}
function worldHTML(){
 const c=WORLD_CHAPTERS.find(c=>c.id===WORLD_CHAPTER)||WORLD_CHAPTERS[0];
 return '<section class="sitota-public st-world"><div class="st-frame"><a class="st-back" href="#/">← Back to the table</a><div class="st-world-intro"><div class="st-eyebrow">A guide for the players</div><h1>Sit’ota</h1><p>Places, people, and history as we discover them.</p></div><div class="st-guide"><aside><label for="worldSearch">Search the guide</label><input id="worldSearch" type="search" autocomplete="off" placeholder="Search chapters" value="'+esc(WORLD_SEARCH)+'" oninput="siteSearchWorld(this.value)"><nav class="st-chapters" id="worldChapterNav" aria-label="Guide chapters">'+worldChapterNavHTML()+'</nav></aside><article aria-live="polite" id="worldArticle"><div class="st-eyebrow">The Sit’ota world guide</div><h2>'+c.heading+'</h2><p class="st-deck">'+c.deck+'</p><div class="st-copy">'+c.body+'</div></article></div></div></section>';
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
 const nav=document.querySelector('.sitota-header nav');
 if(!nav)return;
 const active=['play','sheet'].includes(APPVIEW)?'library':(['campaign','board'].includes(APPVIEW)?'campaigns':APPVIEW);
 nav.querySelectorAll('[data-site-view]').forEach(link=>{
  if(link.dataset.siteView===active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 });
 const account=document.getElementById('siteAccount');
 if(account)account.title=AUTH_PROFILE&&AUTH_PROFILE.display_name?'Account — '+AUTH_PROFILE.display_name:'Account and sign-in';
}
