'use strict';
// Owner menu redesign (2026-11-07 handoff, Part A): shared page header,
// sign-in gates, character cards with Undo delete, search/sort, campaign cards.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const timers=[];
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setInterval,clearInterval,
 setTimeout:(fn,ms)=>{timers.push({fn,ms,live:true});return timers.length;},clearTimeout:id=>{if(timers[id-1])timers[id-1].live=false;},
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:()=>null,setItem(){}},
 document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},removeEventListener(){},createElement:()=>({setAttribute(){},append(){}})},
 location:{hash:'#/',origin:'https://example.test',pathname:'/',assign(){}},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>{throw Error('no confirm() when Undo is offered');}};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app','practice']){
 let code=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')code=code.replace(/boot\(\);\s*$/,'');
 vm.runInContext(code,ctx,{filename:name+'.js'});
}
ctx.document.body={classList:{add(){},remove(){},toggle(){}},dataset:{},append(){}};
const run=s=>vm.runInContext(s,ctx);
let passed=0;const test=async(n,f)=>{await f();passed++;console.log('PASS '+n);};
const chars='[{id:"a1",name:"Kethan Voss",culture:"Civilised",career:"Soldier",updated_at:new Date(Date.now()-864e5).toISOString()},'
 +'{id:"b2",name:"Ana Brook",culture:"Barbarian",career:"Hunter",updated_at:new Date().toISOString()}]';
(async()=>{
await test('interior pages share one header and no Main Menu button',()=>{
 run('MOCK_AUTH={id:"guest-local"};LIB_CACHE='+chars+';CAMP_CACHE=[];WIKI_CHAPTER=null;');
 for(const html of ['libraryHTML()','campaignsHTML()','accountHTML()','wikiHTML()']){
  const h=run(html);assert.match(h,/<header class="st-pagehead">/,html);assert.doesNotMatch(h,/Main Menu/,html);
 }
 assert.match(run('libraryHTML()'),/APP\.fromMenuNew\(\)/,'primary action: New character');
 assert.match(run('campaignsHTML()'),/APP\.newCampaign\(\)/,'primary action: New campaign');
});
await test('signed out, Characters and Campaign show a sign-in gate',()=>{
 run('MOCK_AUTH=null;AUTH_USER=null;');
 for(const html of ['libraryHTML()','campaignsHTML()']){const h=run(html);assert.match(h,/Sign in to see your/);assert.match(h,/APP\.toAccount\(\)/);}
 assert.match(run('sitotaHomeHTML()'),/Sign in to continue/);
});
await test('character cards: real stats, Play and an Edit / Print / Delete menu',()=>{
 run('MOCK_AUTH={id:"guest-local"};LIB_CACHE='+chars+';LIB_QUERY="";LIB_SORT="recent";');
 const h=run('libraryHTML()');
 assert.match(h,/APP\.openCharToPlay\('a1'\)/);assert.match(h,/APP\.openCharToEdit\('a1'\)/);assert.match(h,/APP\.openCharToSheet\('a1'\)/);
 assert.match(h,/aria-haspopup="menu" aria-expanded="false"/);
 assert.doesNotMatch(h,/mmenu-charcard-del/,'no bare × delete button');
});
await test('search filters by name, culture or career; sort by recent or name',()=>{
 run('LIB_QUERY="hunter";');let h=run('libraryCardsHTML()');assert.match(h,/Ana Brook/);assert.doesNotMatch(h,/Kethan Voss/);
 run('LIB_QUERY="zzz";');assert.match(run('libraryCardsHTML()'),/No characters match/);
 run('LIB_QUERY="";LIB_SORT="recent";');h=run('libraryCardsHTML()');assert(h.indexOf('Ana Brook')<h.indexOf('Kethan Voss'),'most recent first');
 run('LIB_SORT="name";');h=run('libraryCardsHTML()');assert(h.indexOf('Ana Brook')<h.indexOf('Kethan Voss'),'A to Z');
 run('LIB_SORT="recent";LIB_CACHE[0].updated_at=new Date().toISOString();LIB_CACHE[1].updated_at=new Date(0).toISOString();');
 h=run('libraryCardsHTML()');assert(h.indexOf('Kethan Voss')<h.indexOf('Ana Brook'));
});
await test('Delete hides the card with an Undo; Undo keeps it, expiry deletes without confirm()',async()=>{
 run('var deleted=[];deleteCharUnified=async id=>{deleted.push(id)};loadLibraryUnified=()=>{};render=()=>{};');
 run('stDeleteWithUndo("a1","Kethan Voss")');
 assert.doesNotMatch(run('libraryCardsHTML()'),/Kethan Voss/,'hidden at once');
 run('stUndoDelete()');assert.match(run('libraryCardsHTML()'),/Kethan Voss/,'Undo brings it back');
 assert.equal(timers.at(-1).live,false,'pending delete cancelled');assert.equal(run('deleted.length'),0);
 run('stDeleteWithUndo("a1","Kethan Voss")');const t=timers.at(-1);assert.equal(t.ms,6000);
 t.fn();await new Promise(r=>setImmediate(r));
 assert.deepEqual(JSON.parse(run('JSON.stringify(deleted)')),['a1']);
});
await test('campaign cards show the role with Open / Party board, and Join with a code is on the page',()=>{
 run('MOCK_AUTH={id:"guest-local"};CAMP_CACHE=[{id:"k1",name:"Valeshar",created_at:"2026-10-01"}];');
 const h=run('campaignsHTML()');
 assert.match(h,/Valeshar/);assert.match(h,/>GM</);assert.match(h,/APP\.openCampaign\('k1'\)/);assert.match(h,/APP\.toBoard\('k1'\)/);
 assert.match(h,/Join with a code/);assert.match(h,/APP\.joinCampaign\(v\)/);
});
await test('phone tab bar and More sheet exist with the five tabs',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const t of ['menu','library','campaigns','pits','more'])assert.match(html,new RegExp('data-tab="'+t+'"'));
 assert.match(html,/id="stMoreSheet" hidden/);
});
await test('Rules is a grouped table of contents with Core page numbers, search and group chips',()=>{
 run('WIKI_CHAPTER=null;WIKI_TOC_Q="";WIKI_TOC_GROUP="all";');
 let h=run('wikiHTML()');
 for(const g of ['Making a character','Playing the game','Magic','Running the game'])assert(h.includes(g),g);
 assert.match(h,/Games Mastery<\/span><span class="st-toc-dots" aria-hidden="true"><\/span><span class="st-toc-page">p\. 278/);
 assert.doesNotMatch(h,/wiki-corebadge/,'no repeated CORE badge');assert.match(h,/Page numbers refer to the Mythras Core Rulebook/);
 run('WIKI_TOC_Q="combat";');h=run('wikiTocHTML()');assert.match(h,/>Combat</);assert.doesNotMatch(h,/>Careers</);
 run('WIKI_TOC_Q="";WIKI_TOC_GROUP="magic";');h=run('wikiTocHTML()');assert.match(h,/Sorcery/);assert.doesNotMatch(h,/>Combat</);
 run('WIKI_TOC_GROUP="all";');
});
await test('Account: Sign in / Create account tabs, an alert banner, show/hide and a profile card',()=>{
 run('AUTH_USER=null;AUTH_PROFILE=null;MOCK_AUTH=null;AUTH_RECOVERY=false;ACCOUNT_TAB="in";AUTH_MSG={text:"Wrong password."};');
 if(run('CLOUD_ENABLED')){
  let h=run('accountHTML()');
  assert.match(h,/role="tablist"/);assert.match(h,/aria-selected="true"[^>]*>Sign in</);assert.match(h,/role="alert">Wrong password\./);
  assert.match(h,/>Show</);assert.match(h,/APP\.forgotPassword\(\)/);assert.match(h,/Why sign in\?/);
  run('ACCOUNT_TAB="up";AUTH_MSG=null;');h=run('accountHTML()');assert.match(h,/onsubmit="event\.preventDefault\(\);APP\.signUp\(\)"/);
  run('AUTH_USER={id:"u",email:"a@b.c"};AUTH_PROFILE={display_name:"Luke"};');h=run('accountHTML()');
  assert.match(h,/class="st-profile"/);assert.match(h,/id="authName" class="st-input" value="Luke"/);assert.match(h,/APP\.signOut\(\)/);
 }
 run('AUTH_USER=null;AUTH_PROFILE=null;ACCOUNT_TAB="in";AUTH_MSG=null;');
});
console.log(passed+' site menu tests passed');
})().catch(e=>{console.error(e);process.exit(1);});
