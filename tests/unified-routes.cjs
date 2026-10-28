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
  assert.equal(run('S._libId'),'old-id');assert.equal(run('S.inventory[0].name'),'Rope');assert.equal(run('APPVIEW'),'library');assert.equal(run('LIB_CACHE[0].name'),'Portable');assert.notEqual(run('LIB_CACHE[0].id'),'old-id');
 });
 await test('portrait upload survives an immediate cloud reopen and appears on Home',async()=>{
  const originalCreate=ctx.document.createElement;
  ctx.createImageBitmap=async()=>({width:512,height:512,close(){}});
  ctx.document.createElement=()=>({getContext:()=>({fillRect(){},drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,AAAA'});
  run('MOCK_AUTH=null;AUTH_USER={id:"portrait-user"};APPVIEW="character";VIEW_ONLY=false;S=freshState();S.concept.name="Portrait Hero";S._libId="11111111-1111-4111-8111-111111111111";var portraitRow={id:S._libId,name:S.concept.name,owner_id:AUTH_USER.id,state:JSON.parse(JSON.stringify(S))};cloudUpsertCharacter=async entry=>{await new Promise(r=>setTimeout(r,10));portraitRow={...portraitRow,...entry};return {id:portraitRow.id};};sb.from=()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:portraitRow})})})});');
  const upload=run('APP.setPortrait({files:[{type:"image/png",size:1000}]})');
  await upload;
  assert.equal(run('portraitRow.state.concept.portrait'),'data:image/jpeg;base64,AAAA');
  run('S.concept.portrait="data:image/jpeg;base64,BBBB";saveAutosave();');
  const reopened=await run('openCharUnified(S._libId)');
  assert.equal(reopened.state.concept.portrait,'data:image/jpeg;base64,BBBB');
  run('S=JSON.parse(JSON.stringify(portraitRow.state));normalizeState();cloudFetchCharacters=async()=>[portraitRow];APPVIEW="menu";');
  await run('loadHomeCharacters()');
  assert.match(run('homeCharactersHTML()'),/data:image\/jpeg;base64,BBBB/);
  await run('APP.clearPortrait()');
  assert.equal((await run('openCharUnified(S._libId)')).state.concept.portrait,'');
  ctx.document.createElement=originalCreate;
 });
 await test('account backups export the selected saved character without replacing the open character',async()=>{
  run('AUTH_USER={id:"owner",email:"x@example.test"};AUTH_PROFILE={display_name:"Player"};MOCK_AUTH=null;S=freshState();S.concept.name="Open character";var backupState=freshState();backupState.concept.name="Saved character";backupState.concept.portrait="data:image/jpeg;base64,AAAA";var backupRows=[{id:"saved-id",owner_id:"owner",name:"Saved character",state:backupState,updated_at:new Date().toISOString()}];LIB_CACHE=backupRows;cloudFetchCharacters=async()=>backupRows;var exportedBackup=null;dl=(name,content,type)=>{exportedBackup={name,content,type};};');
  assert.doesNotMatch(run('libraryHTML()'),/Advanced \/ Backup|Download character backup/);assert.match(run('accountHTML()'),/Advanced \/ Backup/);
  await run('APP.loadAccountBackups()');assert.match(run('accountHTML()'),/Download backup/);
  run('APP.exportAccountCharacter("saved-id")');assert.equal(JSON.parse(run('exportedBackup.content')).concept.name,'Saved character');assert.equal(JSON.parse(run('exportedBackup.content')).concept.portrait,'data:image/jpeg;base64,AAAA');assert.equal(run('S.concept.name'),'Open character');
  run('AUTH_USER={id:"other",email:"other@example.test"};');assert.doesNotMatch(run('accountHTML()'),/Saved character/);run('AUTH_USER={id:"owner",email:"x@example.test"};');
  run('cloudUpsertCharacter=async entry=>{if(entry.id)throw Error("must insert");backupRows.push({id:"new-copy",owner_id:"owner",name:entry.name,state:entry.state,updated_at:new Date().toISOString()});return {id:"new-copy"};};');
  ctx.importFile={size:run('exportedBackup.content.length'),text:async()=>run('exportedBackup.content')};await run('APP.importCharacterFile({files:[importFile]})');assert.equal(run('S.concept.name'),'Open character');assert.equal(run('APPVIEW'),'library');assert.equal(run('LIB_CACHE.find(x=>x.id==="new-copy").state.concept.portrait'),'data:image/jpeg;base64,AAAA');
 });
 await test('failed cloud import leaves the open character and account view intact',async()=>{
  run('AUTH_USER={id:"owner"};MOCK_AUTH=null;APPVIEW="account";S=freshState();S.concept.name="Keep me";var attempted=false;cloudUpsertCharacter=async()=>{attempted=true;throw Error("offline")};');
  const payload=run('JSON.stringify(freshState())');ctx.importFile={size:payload.length,text:async()=>payload};
  await run('APP.importCharacterFile({files:[importFile]})');assert.equal(run('attempted'),true);assert.equal(run('S.concept.name'),'Keep me');assert.equal(run('APPVIEW'),'account');assert.match(run('AUTH_MSG.text'),/Import failed/);
 });
 await test('folk magic supports manually recorded spells and skill-based starting guidance',async()=>{
  run('S=freshState();magicSkillPct=()=>41;');
  assert.match(run('folkMagicPicker()'),/3 at 41%/);assert.doesNotMatch(run('folkMagicPicker()'),/1d4\+1/);
  const oldGet=ctx.document.getElementById;ctx.document.getElementById=id=>id==='folkManualName'?{value:'Light'}:null;
  run('APP.addFolkManual()');assert.equal(run('S.magic.folk[0].name'),'Light');assert.match(run('folkMagicPicker()'),/Player-recorded spell/);
  run('APP.addFolkManual()');assert.equal(run('S.magic.folk.length'),1);ctx.document.getElementById=oldGet;
 });
 await test('Sorcery rechecks shaping and applies Combine difficulty to the final roll',async()=>{
  run('S=freshState(); S.magic.known=[{tradition:"sorcery",name:"Ward",shapingLevels:{Combine:1},combineExtra:0}]; S.play.magic=20; APPVIEW="play"; allMagic=()=>S.magic.known; magicSkillKey=()=>"invocation"; magicSkillPct=()=>47; finalPct=()=>90; gradeForEntry=()=>"standard"; playCurMagic=()=>S.play.magic; Math.random=()=>0.49; viewOnlyBlock=()=>false; render=()=>{};');
  run('APP.castMagic(0)'); assert.equal(run('S.play.sorceryCasting.completed'),1);
  run('S.magic.known[0].shapingLevels.Combine=6;APP.castMagic(0)'); assert.match(run('PM_MSG'),/exceeds/);assert.equal(run('S.rollLog.length'),0);
  run('S.magic.known[0].shapingLevels.Combine=1;APP.castMagic(0)');assert.equal(run('S.rollLog[0].pct'),60);assert.equal(run('S.rollLog[0].tier'),'Success');assert.equal(run('S.play.sorceryCasting'),null);
  run('S.magic.known[0].shapingLevels={Combine:2};APP.castMagic(0);APP.castMagic(0)');assert.equal(run('S.rollLog[0].pct'),45);assert.equal(run('S.rollLog[0].tier'),'Failure');
 });
 await test('bound spirit POW over Binding limit cannot roll or spend points',async()=>{
  run('S=freshState();S.play.magic=10;S.magic.known=[{tradition:"animism",name:"Shade",pow:16,spiritStatus:"bound"}];S.magic.folk=[];magicSkillKey=()=>"binding";finalPct=()=>45;playCurMagic=()=>S.play.magic;viewOnlyBlock=()=>false;render=()=>{};');
  run('APP.commandSpirit(0)');assert.match(run('PM_MSG'),/exceeds/);assert.equal(run('S.play.magic'),10);assert.equal(run('S.rollLog.length'),0);
  run('S.magic.known[0].pow=15;APP.commandSpirit(0)');assert.equal(run('S.rollLog.length'),1);
 });
 console.log(passed+' unified route/workflow tests passed (Supabase calls stubbed; no live account writes)');
})().catch(e=>{console.error(e);process.exitCode=1;});
