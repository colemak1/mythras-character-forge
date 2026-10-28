const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map(),events={};
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setTimeout,clearTimeout,setInterval,clearInterval,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=(name,fn)=>events[name]=fn;vm.createContext(ctx);
for(const name of ['data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
run('var draws=0;render=()=>{draws++;syncRouteFromState();};renderLedger=()=>{};');
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await test('public home, guide, and rules routes retain the open character unchanged',async()=>{
  run('S=freshState();S.concept.name="Anathaym";S.alloc.bonus["std:Athletics"]=10;var before=JSON.stringify(S);');
  for(const hash of ['#/','#/world/places','#/wiki']){
   await run('applyRoute(parseRoute('+JSON.stringify(hash)+'))');
   assert.equal(run('JSON.stringify(S)'),run('before'));
   assert.notEqual(run('APPVIEW'),'account');
  }
  assert.match(run('worldHTML()'),/Shamur/);
  await run('applyRoute(parseRoute("#/world/unknown"))');assert.equal(run('currentRoute()'),'/world/welcome');
 });
 await test('signed-out private deep links gate to Account without exposing autosave names',async()=>{
  for(const hash of ['#/my-characters','#/my-campaigns','#/character/new','#/character/id/play','#/campaign/id/board']){
   await run('applyRoute(parseRoute('+JSON.stringify(hash)+'))');assert.equal(run('APPVIEW'),'account');
  }
  run('getAutosaveInfo=()=>({name:"Private draft"});');assert(!run('menuHTML()').includes('Private draft'));
  run('siteStartCharacter({});');assert.equal(run('APPVIEW'),'account');
 });
 await test('same router handles history changes between home, guide chapters and Account',async()=>{
  for(const [hash,view] of [['#/world/places','world'],['#/account','account'],['#/world/places','world'],['#/','menu']]){
   ctx.location.hash=hash;await events.hashchange();assert.equal(run('APPVIEW'),view);assert.equal(ctx.location.hash,hash);
  }
 });
 await test('signed-in library load, character edit/save, play and sheet keep identity and updated state',async()=>{
  run('AUTH_USER={id:"user"};AUTH_PROFILE={display_name:"Player"};S=freshState();S.concept.name="Original";var savedRow={id:"11111111-1111-4111-8111-111111111111",name:"Original",owner_id:"user",state:JSON.parse(JSON.stringify(S))};cloudFetchCharacters=async()=>[savedRow];sb.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:savedRow})})})});cloudUpsertCharacter=async entry=>{savedRow={...savedRow,...entry,state:entry.state};return {id:savedRow.id};};');
  await run('applyRoute(parseRoute("#/my-characters"));loadLibraryUnified()');assert.equal(run('LIB_CACHE[0].name'),'Original');
  await run('applyRoute(parseRoute("#/character/11111111-1111-4111-8111-111111111111"))');
  run('APP.set("concept","name","Revised");');await run('saveToLibraryUnified(true)');
  assert.equal(run('savedRow.state.concept.name'),'Revised');
  for(const suffix of ['/play','/sheet','']){
   await run('applyRoute(parseRoute("#/character/11111111-1111-4111-8111-111111111111'+suffix+'"))');
   assert.equal(run('S.concept.name'),'Revised');assert.equal(run('S._ownerId'),'user');
  }
  await run('flushCloudSaves()');
 });
 await test('campaign list, detail and board still call the existing loaders',async()=>{
  run('var loadedCampaigns=[];cloudFetchCampaigns=async()=>[{id:"camp"}];loadCampaignViewUnified=async id=>{loadedCampaigns.push(id);CAMPAIGN_VIEW={campaign:{id}};};boardLoad=id=>{loadedCampaigns.push("board:"+id);};');
  await run('applyRoute(parseRoute("#/my-campaigns"));loadCampaignsUnified()');assert.equal(run('CAMP_CACHE[0].id'),'camp');
  await run('applyRoute(parseRoute("#/campaign/camp"))');await run('applyRoute(parseRoute("#/campaign/camp/board"))');
  assert.equal(run('loadedCampaigns.join(",")'),'camp,camp,board:camp');
 });
 await test('signed-out invites survive sign-in and complete through the existing join flow',async()=>{
  run('AUTH_USER=null;AUTH_PROFILE=null;');await run('applyRoute(parseRoute("#/join/TABLE%2B1"))');
  assert.equal(run('APPVIEW'),'account');assert.equal(run('localStorage.getItem(PENDING_JOIN_KEY)'),'TABLE+1');
  run('sb.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{display_name:"Player"}})})})});var joinedCode;cloudJoinCampaign=async code=>{joinedCode=code;return {id:"camp"};};');
  await run('onSignedIn({id:"user",email:"player@example.test"})');assert.equal(run('joinedCode'),'TABLE+1');assert.equal(run('APPVIEW'),'campaign');assert.equal(run('takePendingJoin()'),null);
 });
 await test('cold password-recovery callbacks still select the new-password form',async()=>{
  run('AUTH_USER=null;AUTH_RECOVERY=false;location.hash="#access_token=test&type=recovery";sb.auth.onAuthStateChange=fn=>{sb.listener=fn;};sb.auth.getSession=async()=>{sb.listener("PASSWORD_RECOVERY",null);return {data:{session:null}};};');
  await run('boot()');assert.equal(run('APPVIEW'),'account');assert.equal(run('AUTH_RECOVERY'),true);assert.match(run('accountHTML()'),/Choose a new password/);
 });
 await test('JSON export and reimport preserve content while creating a separate identity',async()=>{
  run('AUTH_USER=null;AUTH_RECOVERY=false;MOCK_AUTH={id:"local"};S=freshState();S.concept.name="Portable";S._libId="old-id";S.inventory=[{name:"Rope",qty:1,enc:1,cost:2}];var exported;dl=(name,content,type)=>{exported={name,content,type};};APP.exportJSON();');
  const payload=run('exported.content');assert.equal(JSON.parse(payload).concept.name,'Portable');
  ctx.importFile={size:payload.length,text:async()=>payload};await run('APP.importCharacterFile({files:[importFile]})');
  assert.equal(run('S.concept.name'),'Portable');assert.notEqual(run('S._libId'),'old-id');assert.equal(run('S.inventory[0].name'),'Rope');assert.equal(run('APPVIEW'),'character');
 });
 console.log(passed+' unified route/workflow tests passed (Supabase calls stubbed; no live account writes)');
})().catch(e=>{console.error(e);process.exitCode=1;});
