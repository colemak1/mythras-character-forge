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

function sitotaHomeHTML(){
 const auto=(AUTH_USER||MOCK_AUTH)?getAutosaveInfo():null;
 return '<div class="sitota-public">'
  +'<section class="st-hero"><div class="st-frame st-hero-layout"><div><div class="st-eyebrow">Our campaign, our table</div><h1>Welcome to<br><em>New Sit’ota.</em></h1><p class="st-lede">A place to keep the world close between sessions.</p><div class="st-links"><a class="st-button st-primary" href="#/world/welcome">Explore Sit’ota</a><a class="st-button" href="#/my-characters">My characters</a></div></div><aside class="st-hero-aside"><strong>At the table</strong><p>Characters, campaign notes, and the places we’ve discovered together. Pick up where you left off.</p></aside></div></section>'
  +'<section class="st-table"><div class="st-frame"><div class="st-section-head"><h2>At the Table</h2><p>The working parts of our table</p></div>'
  +(MENU_MSG?'<p class="st-message" role="status">'+esc(MENU_MSG)+'</p>':'')
  +(LOCAL_SAVE_ERROR?'<p class="st-message" role="alert">'+esc(LOCAL_SAVE_ERROR)+'</p>':'')
  +'<div class="st-table-grid"><div><div class="st-link-list">'
  +'<a href="#/my-characters"><span class="st-link-title">Your characters</span><span class="st-link-desc">Your saved sheets</span></a>'
  +'<a href="#/my-campaigns"><span class="st-link-title">Our campaign</span><span class="st-link-desc">Campaigns and party board</span></a>'
  +'<a href="#/character/new" onclick="return siteStartCharacter(event)"><span class="st-link-title">Create a character</span><span class="st-link-desc">Start a new sheet</span></a>'
  +'<a href="#/wiki"><span class="st-link-title">Rules reference</span><span class="st-link-desc">The in-app guide</span></a></div>'
  +'<div class="st-actions"><button type="button" onclick="APP.newCampaign()">Create a campaign</button><button type="button" onclick="APP.homeJoinCampaign()">Join a campaign</button><a href="#/account">Account</a></div>'
  +(auto?'<button class="st-continue" type="button" onclick="APP.fromMenuContinue()">Continue as '+esc(auto.name)+' →</button>':'')
  +(GUEST_TEST_ENABLED&&!AUTH_USER?'<button type="button" class="st-continue" onclick="APP.mockSignIn()">Continue as Guest</button>':'')
  +'</div><aside class="st-table-note"><div class="st-eyebrow">From the GM</div><p>Welcome to New Sit’ota. This space is ours.</p><p class="st-small">The world guide is public. Sign in to keep your characters and campaign close between sessions.</p><a href="#/world/welcome">Read the world guide</a></aside></div></div></section></div>';
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
