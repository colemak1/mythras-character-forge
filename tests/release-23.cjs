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
for(const name of ['data','engine','cloud','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,context,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,context);
run('render=()=>{};syncRouteFromState=()=>{};');
let passed=0;
async function test(name,fn){await fn();console.log('PASS '+name);passed++;}
(async()=>{
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
  run('cloudUpsertCharacter=async()=>({id:"22222222-2222-4222-8222-222222222222"});');
  await run('flushCloudSaves()');assert.equal(run('CLOUD_SAVE_ERROR'),'');
 });
 await test('failed sign-out upload retains session and recovery draft',async()=>{
  run('localStorage.setItem(AUTOSAVE_KEY+":user","recover");cloudUpsertCharacter=async()=>{throw Error("offline")};APP.signOut();');
  await new Promise(r=>setTimeout(r,20));
  assert.equal(run('AUTH_USER.id'),'user');
  assert.equal(run('localStorage.getItem(AUTOSAVE_KEY+":user")'),'recover');
  assert.match(run('AUTH_MSG.text'),/Sign-out paused/);
 });
 console.log(`${passed} release regression tests passed`);
})().catch(e=>{console.error(e);process.exitCode=1;});
