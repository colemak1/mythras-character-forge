const fs=require('fs'),vm=require('vm'),assert=require('assert');
const path=require('path'),root=path.resolve(__dirname,'..');
const store=new Map(),nodes=new Map();
const element=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false,dataset:{},style:{}});return nodes.get(id);};
const context={console,setTimeout,clearTimeout,setInterval,clearInterval,URL,Date,Map,Set,WeakMap,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:element,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/'},supabase:{createClient:()=>({auth:{signOut:async()=>({})}})},
 requestAnimationFrame(){},confirm:()=>true};
context.window=context;context.addEventListener=()=>{};context.scrollTo=()=>{};
vm.createContext(context);
for(const name of ['data','engine','cloud','sitota','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,context,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,context);
run('render=()=>{};syncRouteFromState=()=>{};');
let passed=0;
async function test(name,fn){await fn();console.log('PASS '+name);passed++;}
(async()=>{
 await test('failed campaign reads show recovery instead of an empty account',async()=>{
  run('AUTH_USER={id:"qa"};var originalFetch=cloudFetchCampaigns;cloudFetchCampaigns=async()=>{throw Error("connection lost")};');
  await run('loadCampaignsUnified()');
  assert.match(run('campaignsHTML()'),/Retry loading campaigns/);
  assert(!run('campaignsHTML()').includes('No campaigns yet'));
  run('cloudFetchCampaigns=async()=>[]');await run('loadCampaignsUnified()');
  assert.equal(run('CAMP_LOAD_ERROR'),'');
  assert(run('campaignsHTML()').includes('No campaigns yet'));
  run('cloudFetchCampaigns=originalFetch;AUTH_USER=null;');
 });
 await test('campaign loads do not cross account changes',async()=>{
  run('AUTH_USER={id:"first"};var releaseCampaign;cloudFetchCampaigns=()=>new Promise(r=>releaseCampaign=r);');
  const pending=run('loadCampaignsUnified()');
  run('AUTH_USER={id:"second"};releaseCampaign([{id:"first-private"}]);');await pending;
  assert.equal(run('CAMP_CACHE'),null);
  run('cloudFetchCampaigns=originalFetch;AUTH_USER=null;');
 });
 await test('public homepage omits guest entry and added utility links',()=>{
  run('AUTH_USER=null;MOCK_AUTH=null;');
  assert(!run('menuHTML()').includes('APP.mockSignIn()'));
  assert(!run('menuHTML()').includes('APP.exportGuestBackup()'));
  assert(!run('menuHTML()').includes('APP.chooseImport()'));
  assert(run('signInButtonHTML()').includes('APP.toAccount()'));
  assert(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('forge-releasebar'));
 });
 await test('guest entry and protected deep links require an account',async()=>{
  run('APP.mockSignIn();');assert.equal(run('MOCK_AUTH'),null);
  for(const view of ['character','library','campaigns','board','play','sheet']){
   await run('applyRoute({view:'+JSON.stringify(view)+'})');
   assert.equal(run('APPVIEW'),'account');
  }
 });
 await test('failed campaign and homebrew writes are reported',()=>{
  const original=context.localStorage.setItem;context.localStorage.setItem=()=>{throw Error('quota');};
  assert.throws(()=>run('saveCampaignsListLocal([])'),/quota/);
  assert.throws(()=>run('saveCustomContentListLocal([])'),/quota/);
  context.localStorage.setItem=original;
 });
 await test('account cleanup preserves guest characters and campaigns',()=>{
  run('localStorage.setItem(CHARLIB_KEY,"guest");localStorage.setItem(CAMPAIGNS_KEY,"camp");localStorage.setItem(AUTOSAVE_KEY+":user","draft");clearLocalCharacterData("user");');
  assert.equal(run('localStorage.getItem(CHARLIB_KEY)'),'guest');
  assert.equal(run('localStorage.getItem(CAMPAIGNS_KEY)'),'camp');
  assert.equal(run('localStorage.getItem(AUTOSAVE_KEY+":user")'),null);
 });
 await test('adding PC preserves current injury and spent AP',()=>{
  run('S=freshState();S.chars={STR:12,CON:12,SIZ:12,DEX:12,INT:12,POW:12,CHA:12};S.play.hp.Head=1;S.play.apUsed=1;BOARD_CHARS=[{id:"pc",name:"Injured",state:S}];');
  assert.equal(run('combatantFromPc("pc").hp.Head.cur'),1);
  assert.equal(run('combatantFromPc("pc").ap.used'),1);
 });
 await test('turns advance cycles; new round alone restores AP',()=>{
  run('CAMPAIGN_VIEW={campaign:{id:"camp",session_state:{round:1,turnIdx:0,combatants:[combatantFromNpc("A",20,"a"),combatantFromNpc("B",10,"b")]}}};sessionStateCampaignUnified=async()=>{};CAMPAIGN_VIEW.campaign.session_state.combatants[0].ap.used=1;');
  run('APP.gmAdvanceTurn();APP.gmAdvanceTurn();');
  assert.equal(run('CAMPAIGN_VIEW.campaign.session_state.round'),1);
  assert.equal(run('CAMPAIGN_VIEW.campaign.session_state.cycle'),2);
  assert.equal(run('CAMPAIGN_VIEW.campaign.session_state.combatants[0].ap.used'),1);
  run('APP.gmNewRound();');
  assert.equal(run('CAMPAIGN_VIEW.campaign.session_state.round'),2);
  assert.equal(run('CAMPAIGN_VIEW.campaign.session_state.combatants[0].ap.used'),0);
 });
 await test('turn effects and round effects use separate clocks',()=>{
  run('var actors=[{effects:[{id:"turn",mode:"duration",unit:"turn",value:2},{id:"round",mode:"duration",unit:"round",value:2}]}];tickCombatEffects(actors,"turn");');
  assert.equal(run('actors[0].effects[0].value'),1);
  assert.equal(run('actors[0].effects[1].value'),2);
  run('tickCombatEffects(actors,"round");');
  assert.equal(run('actors[0].effects[0].value'),1);
  assert.equal(run('actors[0].effects[1].value'),1);
 });
 await test('overlapping cloud saves serialize and never assign IDs to another character',async()=>{
  run('AUTH_USER={id:"user"};S=freshState();S.concept.name="A";var actorA=S;var calls=[];var release;cloudUpsertCharacter=async entry=>{calls.push(entry);if(calls.length===1)await new Promise(r=>release=r);return {id:"11111111-1111-4111-8111-111111111111"};};');
  const first=run('saveToLibraryUnified(true)');await Promise.resolve();await Promise.resolve();
  const second=run('actorA.concept.name="A revised";saveToLibraryUnified(true,actorA)');
  run('S=freshState();S.concept.name="B";release();');await Promise.all([first,second]);
  assert.equal(run('S._libId'),undefined);
  assert.equal(run('calls.length'),2);
  assert.equal(run('calls[0].name'),'A');
  assert.equal(run('calls[1].name'),'A revised');
  assert.equal(run('calls[1].id'),'11111111-1111-4111-8111-111111111111');
 });
 await test('failed cloud save remains visible and can be retried',async()=>{
  run('cloudUpsertCharacter=async()=>{throw Error("offline")};');
  await assert.rejects(run('saveToLibraryUnified(true)'),/offline/);
  assert.match(run('CLOUD_SAVE_ERROR'),/offline/);
  assert.equal(element('forgeRetrySave').hidden,false);
  assert.equal(element('forgeExportRecovery').hidden,false);
  run('cloudUpsertCharacter=async()=>({id:"22222222-2222-4222-8222-222222222222"});');
  await run('flushCloudSaves()');assert.equal(run('CLOUD_SAVE_ERROR'),'');
  assert.equal(element('forgeRetrySave').hidden,true);
  assert.equal(element('forgeExportRecovery').hidden,true);
 });
 await test('failed sign-out upload retains session and recovery draft',async()=>{
  run('localStorage.setItem(AUTOSAVE_KEY+":user","recover");cloudUpsertCharacter=async()=>{throw Error("offline")};APP.signOut();');
  await new Promise(r=>setTimeout(r,20));
  assert.equal(run('AUTH_USER.id'),'user');
  assert.equal(run('localStorage.getItem(AUTOSAVE_KEY+":user")'),'recover');
  assert.match(run('AUTH_MSG.text'),/Sign-out paused/);
 });
 await test('cold password recovery redirect opens the new-password form',async()=>{
  run('AUTH_USER=null;AUTH_RECOVERY=false;APPVIEW="menu";location.hash="#/account";onSignedIn=async()=>{};sb.auth.onAuthStateChange=cb=>{globalThis.recoveryListener=cb};sb.auth.getSession=async()=>{recoveryListener("PASSWORD_RECOVERY",{user:{id:"qa"}});return {data:{session:{user:{id:"qa"}}}}};');
  await run('boot()');
  assert.equal(run('AUTH_RECOVERY'),true);
  assert.equal(run('APPVIEW'),'account');
  assert.match(run('accountHTML()'),/Choose a new password/);
 });
 await test('combat roll result offers direct effect and injury controls',()=>{
  const row=run('playRollLogRow({roll:21,label:"Sword",pct:60,tier:"Success",combat:true,combatRole:"attack",oppTier:"Failure"},0)');
  assert.match(row,/APP\.playJumpToEffects\(0\)/);
  assert.match(row,/APP\.playJumpToInjury\(\)/);
  assert.match(fs.readFileSync(path.join(root,'js','play.js'),'utf8'),/id="pm-actions"/);
 });
 console.log(`${passed} release regression tests passed`);
})().catch(e=>{console.error(e);process.exitCode=1;});
