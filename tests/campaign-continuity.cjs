// Subsystem 8 owner decisions (docs/decisions.md, 2026-11-07):
// D-S1 new invite code, D-S2 warn-and-reload on conflicting character saves,
// D-S4 remove a member, hand over the GM role, whole-campaign backup.
// The client runs against a small in-memory stand-in for the server that
// applies the same revision rule as the migration; the SQL is checked
// statically. Live multi-account checks are in docs/campaign-cases-batch-1.md.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,JSON,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
let passed=0;const test=async(n,fn)=>{await fn();passed++;console.log('PASS '+n);};
const ID='11111111-1111-4111-8111-111111111111';
// Server stand-in: one character row; state changes bump the revision
// (private.characters_bump_revision); conditional updates and the GM RPC
// refuse a stale revision.
run(`var ID="${ID}",server,writes,rpcs,noRevisions=false,raceBump=false,missingRpc=false,campRow,members,charRows,customRows;
function clone(v){return JSON.parse(JSON.stringify(v));}
function resetServer(state){server={id:ID,owner_id:"player",campaign_id:"camp",name:"Hero",state:clone(state),revision:0};writes=[];rpcs=[];noRevisions=false;raceBump=false;missingRpc=false;}
function rowOut(){const r=clone(server);if(noRevisions)delete r.revision;return r;}
function applyState(state){if(stableJson(state)!==stableJson(server.state))server.revision++;server.state=clone(state);}
sb.from=t=>{const q={t,op:"select",filters:{}};const api={
 select(){if(q.op==="update")return Promise.resolve(api.applyUpdate());return api;},
 eq(k,v){q.filters[k]=v;return api;},in(){return api;},order(){return Promise.resolve({data:t==="characters"?charRows:[],error:null});},
 update(f){q.op="update";q.row=f;return api;},
 applyUpdate(){
  if(raceBump){raceBump=false;applyState(Object.assign(clone(server.state),{race:true}));}
  writes.push({filters:clone(q.filters),row:clone(q.row)});
  if(!noRevisions&&q.filters.revision!==undefined&&q.filters.revision!==server.revision)return {data:[],error:null};
  if(noRevisions&&q.filters.revision!==undefined)return {data:null,error:{code:"42703",message:"column characters.revision does not exist"}};
  applyState(q.row.state);return {data:[rowOut()],error:null};},
 maybeSingle(){
  if(t==="characters")return Promise.resolve({data:rowOut(),error:null});
  if(t==="campaigns")return Promise.resolve({data:clone(campRow),error:null});
  if(t==="campaign_gm_state")return Promise.resolve({data:{session_state:{sessionNotes:"GM only"}},error:null});
  return Promise.resolve({data:null,error:null});}};return api;};
sb.rpc=async(fn,args)=>{rpcs.push({fn,args:clone(args)});
 if(missingRpc)return {data:null,error:{code:"PGRST202",message:"Could not find the function public."+fn}};
 if(fn==="dm_update_character_inventory"){
  if(args.p_revision!==undefined&&args.p_revision!==server.revision)return {data:null,error:{code:"40001",message:"conflict: character changed since it was opened"}};
  const st=clone(server.state);st.inventory=clone(args.p_inventory);applyState(st);return {data:server.revision,error:null};}
 if(fn==="rotate_campaign_invite")return {data:"NEWCODE123",error:null};
 return {data:null,error:null};};
render=()=>{};MOCK_AUTH=null;AUTH_USER={id:"player"};VIEW_ONLY=false;
function hero(){const s=freshState();s.concept.name="Hero";s.inventory=[{name:"Rope",qty:1,enc:1,cost:0}];return s;}
async function openAs(){const e=await openCharUnified(ID);const a=Object.assign(freshState(),e.state);a._libId=e.id;a._ownerId=e.ownerId;a.campaignId=e.campaignId;return a;}`);
(async()=>{
await test('D-S2 opening a character records its revision and a save sends it, then adopts the new one',async()=>{
 run('resetServer(hero());var tab;');
 await run('(async()=>{tab=await openAs();})()');
 assert.equal(run('tab._rev'),0);
 run('tab.combat={hp:3};');await run('saveToLibraryUnified(true,tab)');
 assert.equal(run('writes[0].filters.revision'),0,'the update is conditional on the opened revision');
 assert.equal(run('"_rev" in writes[0].row.state'),false,'the revision is a column, never stored inside the state');
 assert.equal(run('server.revision'),1);assert.equal(run('tab._rev'),1);
 run('tab.combat={hp:2};');await run('saveToLibraryUnified(true,tab)');
 assert.equal(run('server.revision'),2,'the same tab keeps saving');
});
await test('D-S2 SAVE09/E2E10 a second tab with an older copy is stopped, warned and not written',async()=>{
 run('resetServer(hero());var a,b;');await run('(async()=>{a=await openAs();b=await openAs();})()');
 run('a.concept.name="Tab A";');await run('saveToLibraryUnified(true,a)');
 run('b.concept.name="Tab B";writes=[];');
 await assert.rejects(run('saveToLibraryUnified(true,b)'),/changed somewhere else/);
 assert.equal(run('writes.length'),0,'nothing is sent');
 assert.equal(run('server.state.concept.name'),'Tab A','the newer save survives');
 assert(run('CLOUD_CONFLICTS.has(b)'));assert.match(run('CLOUD_SAVE_ERROR'),/nothing was overwritten/);
 // Later autosaves for that tab stay stopped until it reloads.
 run('S=b;b.concept.name="Tab B again";CLOUD_SEEN_STATE.delete(b);scheduleCloudPush();');
 assert.equal(run('CLOUD_PENDING_ACTORS.has(b)'),false);
 await assert.rejects(run('saveToLibraryUnified(true,b)'));assert.equal(run('writes.length'),0);
});
await test('D-S2 the warning offers Download my version and Reload latest; reload loads the account copy',async()=>{
 const warn={hidden:true,innerHTML:'',textContent:'',dataset:{}};
 const old=ctx.document.getElementById;ctx.document.getElementById=id=>id==='localSaveWarning'?warn:null;
 run('updateSaveStatus()');
 assert.equal(warn.hidden,false);assert.match(warn.innerHTML,/Download my version/);assert.match(warn.innerHTML,/Reload latest/);
 let file=null;run('dl=(n,c)=>{globalThis.lastFile={n,c};}');run('APP.exportConflictCopy()');file=run('lastFile');
 assert.match(file.n,/my-version\.mythras\.json$/);assert.equal(JSON.parse(file.c).concept.name,'Tab B again');
 assert.equal(await run('reloadConflictedCharacter()'),true);
 assert.equal(run('S.concept.name'),'Tab A');assert.equal(run('S._rev'),1);
 assert.equal(run('CLOUD_CONFLICTS.size'),0);assert.equal(run('CLOUD_SAVE_ERROR'),'');
 run('updateSaveStatus()');assert.equal(warn.hidden,true);
 run('S.concept.name="Edited after reload";');await run('saveToLibraryUnified(true,S)');
 assert.equal(run('server.state.concept.name'),'Edited after reload','saving works again');
 ctx.document.getElementById=old;
});
await test('D-S2 BRD06 a GM gift since the sheet opened is merged quietly, not reported as a conflict',async()=>{
 run('resetServer(hero());var p;');await run('(async()=>{p=await openAs();})()');
 // The GM opened at the same revision and gives an item.
 run('var gm;');await run('(async()=>{gm=await openAs();})()');
 run('gm.inventory.push({name:"Ring",qty:1,enc:0,cost:0,gift:{id:"ring123",reveal:true,note:"",at:"",seen:false}});');
 await run('dmPushInventory(gm)');assert.equal(run('server.revision'),1);
 run('p.combat={hp:1};');await run('saveToLibraryUnified(true,p)');
 assert.equal(run('CLOUD_CONFLICTS.has(p)'),false);
 assert(run('server.state.inventory.some(i=>i.name==="Ring")'),'the gift is kept');
 assert.equal(run('server.state.combat.hp'),1,'the player save went through');
});
await test('D-S2 S4 a GM inventory edit that is not a gift stops the player sheet from overwriting it',async()=>{
 run('resetServer(hero());var p2,gm2;');await run('(async()=>{p2=await openAs();gm2=await openAs();})()');
 run('gm2.inventory=[];');await run('dmPushInventory(gm2)');
 run('p2.combat={hp:5};');await assert.rejects(run('saveToLibraryUnified(true,p2)'),/changed somewhere else/);
 assert.equal(run('server.state.inventory.length'),0,'the GM removal stands');
});
await test('D-S2 the GM push adopts player saves that left the inventory alone, but stops on a changed inventory',async()=>{
 run('resetServer(hero());var p3,gm3;');await run('(async()=>{p3=await openAs();gm3=await openAs();})()');
 run('p3.combat={hp:4};');await run('saveToLibraryUnified(true,p3)');
 run('gm3.inventory.push({name:"Torch",qty:1,enc:0,cost:0});');await run('dmPushInventory(gm3)');
 assert(run('server.state.inventory.some(i=>i.name==="Torch")'));assert.equal(run('server.state.combat.hp'),4,'the player HP is untouched');
 assert.equal(run('gm3._rev'),run('server.revision'));
 run('p3._rev=server.revision;p3.inventory=[];');await run('saveToLibraryUnified(true,p3)');
 run('gm3.inventory.push({name:"Lamp",qty:1,enc:0,cost:0});');
 await assert.rejects(run('dmPushInventory(gm3)'),e=>/conflict/.test(e.message));
 assert.equal(run('server.state.inventory.length'),0,'the player removal stands');
});
await test('D-S2 a save racing another write between the check and the update is refused by the server',async()=>{
 run('resetServer(hero());var r;');await run('(async()=>{r=await openAs();})()');
 run('raceBump=true;r.combat={hp:9};');
 await assert.rejects(run('saveToLibraryUnified(true,r)'),/changed somewhere else/);
 assert.equal(run('server.state.race'),true);
});
await test('D-S2 before the migration runs, saves work as before with no revision check',async()=>{
 run('resetServer(hero());noRevisions=true;var n;');await run('(async()=>{n=await openAs();})()');
 assert.equal(run('"_rev" in n'),false);
 run('n.combat={hp:7};');await run('saveToLibraryUnified(true,n)');
 assert.equal(run('writes[0].filters.revision'),undefined);assert.equal(run('server.state.combat.hp'),7);
 run('missingRpc=true;n.inventory=[];VIEW_ONLY_IS_DM=true;');
 assert.equal(await run('cloudDmUpdateCharacterInventory(ID,[],3).catch(e=>"err:"+e.code)'),'err:PGRST202','both forms missing reports the error');
 run('missingRpc=false;');
});
await test('D-S2 a revision change alone does not schedule another cloud save',()=>{
 run('var sig=hero();sig._rev=1;var a1=cloudSignature(sig);sig._rev=2;');
 assert.equal(run('cloudSignature(sig)'),run('a1'));
});
await test('D-S1 members see the invite code; only the GM gets New code, which replaces it',async()=>{
 run(`campRow={id:"camp",name:"Red",dm_id:"gm",invite_code:"OLDCODE",created_at:new Date().toISOString(),notes:""};
 members=[{userId:"gm",role:"dm",name:"Gail"},{userId:"player",role:"player",name:"Pat"}];
 CAMPAIGN_VIEW={campaign:clone(campRow),members:clone(members),chars:[],unassigned:[]};AUTH_USER={id:"player"};`);
 let h=run('campaignDetailHTML()');
 assert.match(h,/OLDCODE/);assert.doesNotMatch(h,/New code/);assert.doesNotMatch(h,/Make GM|Remove<\/button>|campaign backup/);
 run('AUTH_USER={id:"gm"};');h=run('campaignDetailHTML()');
 assert.match(h,/New code/);assert.match(h,/old code and link stop working/);
 run('rpcs=[];');await run('APP.rotateInvite()');await new Promise(r=>setTimeout(r,0));
 assert.deepEqual(JSON.parse(run('JSON.stringify(rpcs[0])')),{fn:'rotate_campaign_invite',args:{p_campaign:'camp'}});
 assert.equal(run('CAMPAIGN_VIEW.campaign.invite_code'),'NEWCODE123');assert.match(run('campaignDetailHTML()'),/NEWCODE123/);
});
await test('D-S4 the GM can remove a player and hand over the GM role, never on themselves',async()=>{
 const h=run('campaignDetailHTML()');
 assert.equal((h.match(/APP\.removeMember\(/g)||[]).length,1,'one Remove, for the player only');
 assert.match(h,/APP\.transferGm\('player'\)/);assert.doesNotMatch(h,/APP\.removeMember\('gm'\)/);
 run('rpcs=[];loadCampaignViewUnified=async()=>{};');
 run('APP.removeMember("player")');await new Promise(r=>setTimeout(r,0));
 assert.deepEqual(JSON.parse(run('JSON.stringify(rpcs[0])')),{fn:'dm_remove_member',args:{p_campaign:'camp',p_user:'player'}});
 run('APP.transferGm("player")');await new Promise(r=>setTimeout(r,0));
 assert.deepEqual(JSON.parse(run('JSON.stringify(rpcs[1])')),{fn:'dm_transfer_campaign',args:{p_campaign:'camp',p_user:'player'}});
 run('confirm=()=>false;rpcs=[];APP.removeMember("player");APP.transferGm("player");APP.rotateInvite();confirm=()=>true;');
 await new Promise(r=>setTimeout(r,0));assert.equal(run('rpcs.length'),0,'cancelling a confirm does nothing');
 run('missingRpc=true;');run('APP.removeMember("player")');await new Promise(r=>setTimeout(r,0));
 assert.match(run('CAMP_MSG'),/campaign update on the server/);run('missingRpc=false;');
});
await test('D-S4 LIFE13 the whole-campaign backup holds the campaign, GM state, members, characters and homebrew',async()=>{
 run(`campRow.session_state={sessionNotes:"stale"};charRows=[{id:ID,name:"Hero",owner_id:"player",state:hero(),updated_at:"2026-11-08T00:00:00Z",revision:3}];
 cloudFetchMembers=async()=>clone(members);cloudFetchCustomContent=async()=>[{id:"w1",type:"weapon",name:"Hook"}];
 AUTH_USER={id:"gm"};CAMPAIGN_VIEW={campaign:clone(campRow),members:clone(members),chars:[],unassigned:[]};`);
 assert.match(run('campaignDetailHTML()'),/Download campaign backup/);
 run('globalThis.lastFile=null;');run('APP.downloadCampaignBackup()');await new Promise(r=>setTimeout(r,10));
 const f=run('lastFile');assert(f,'a file is offered');assert.match(f.n,/^Red-\d{4}-\d{2}-\d{2}\.campaign\.json$/);
 const b=JSON.parse(f.c);
 assert.equal(b.format,'mythras-forge-campaign-backup');assert.equal(b.campaign.name,'Red');
 assert.equal('session_state' in b.campaign,false,'the readable column copy is left out');
 assert.equal(b.gmSessionState.sessionNotes,'GM only');
 assert.equal(b.members.length,2);assert.equal(b.characters[0].state.concept.name,'Hero');assert.equal(b.characters[0].revision,3);
 assert.equal(b.customContent[0].name,'Hook');
 assert.equal(run('characterImportProblem(clone(lastFileState=JSON.parse(lastFile.c).characters[0].state))'),null,'each character imports again as a backup');
});
await test('the migration adds revisions, conditional GM edits, code rotation, removal and handover',()=>{
 const dir=path.join(root,'supabase/migrations'),f=fs.readdirSync(dir).find(n=>/campaign_continuity/.test(n));assert(f,'migration file exists');
 const sql=fs.readFileSync(path.join(dir,f),'utf8');
 assert.match(sql,/^begin;[\s\S]*commit;\s*$/m,'runs in one transaction');
 assert.match(sql,/add column if not exists revision bigint not null default 0/);
 assert.match(sql,/elsif new\.state is distinct from old\.state then\s+new\.revision := old\.revision \+ 1;\s+else\s+new\.revision := old\.revision;/,'only state changes count; clients cannot set it');
 assert.match(sql,/before insert or update on public\.characters/);
 assert.match(sql,/dm_update_character_inventory\(p_char uuid, p_inventory jsonb, p_revision bigint\)/);
 assert.match(sql,/p_revision is null or revision = p_revision/);
 assert.match(sql,/errcode = '40001'/);
 for(const fn of ['rotate_campaign_invite(p_campaign uuid)','dm_remove_member(p_campaign uuid, p_user uuid)','dm_transfer_campaign(p_campaign uuid, p_user uuid)']){
  assert(sql.includes('function public.'+fn),fn);
  const name=fn.split('(')[0];
  assert.match(sql,new RegExp('revoke all on function public\\.'+name+'\\([^)]*\\) from public, anon, authenticated'));
  assert.match(sql,new RegExp('grant execute on function public\\.'+name+'\\([^)]*\\) to authenticated'));
 }
 assert.equal((sql.match(/c\.dm_id = auth\.uid\(\)|c\.dm_id = v_old/g)||[]).length>=4,true,'every GM action checks the caller is the GM');
 assert.match(sql,/update public\.characters set campaign_id = null where campaign_id = p_campaign and owner_id = p_user/,'removed players keep their characters');
 assert.doesNotMatch(sql,/delete from public\.characters/);
 assert.match(sql,/The new GM must be a member/);
 assert.match(sql,/on conflict \(campaign_id, user_id\) do update set role = 'player'/);
 assert.match(sql,/cannot remove themselves/);
});
await test('D-S3 the app only ever asks for id and display_name from profiles',()=>{
 const src=fs.readFileSync(path.join(root,'js/cloud.js'),'utf8');
 const reads=[...src.matchAll(/from\("profiles"\)\.select\("([^"]*)"\)/g)].map(m=>m[1]);
 assert(reads.length>=3,'profile reads found');
 for(const cols of reads)assert.equal(cols,'id,display_name');
 assert.doesNotMatch(src,/from\("profiles"\)\.select\(\)|from\("profiles"\)\.select\("\*"\)/);
});
console.log(passed+' campaign continuity tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
