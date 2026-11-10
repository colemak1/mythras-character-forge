// D-S6 option B (owner, 2026-11-10; docs/subsystem8-recovery-contract.md):
// "Restore campaign from backup" makes a NEW campaign from a .campaign.json
// file and never overwrites anything; character import can pick one
// character from a campaign file. Round trip: build backup -> restore ->
// same rules, home settings, briefing, GM state, homebrew and characters.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,JSON,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
let passed=0;const test=async(n,fn)=>{await fn();passed++;console.log('PASS '+n);};
const file=json=>({name:'Red-2026-11-10.campaign.json',size:json.length,text:async()=>json});
run(`render=()=>{};var lastFile=null;dl=(n,c)=>{lastFile={n,c};};
function clone(v){return JSON.parse(JSON.stringify(v));}
function pc(name,extra){const s=freshState();s.concept.name=name;s.inventory=[{name:"Rope",qty:1,enc:1,cost:0}];return Object.assign(s,extra||{});}`);

// A populated local campaign: rules, home, briefing, GM notes and tracker, homebrew, two characters.
function seedLocal(){
 store.clear();
 run(`AUTH_USER=null;MOCK_AUTH={id:"local"};CAMP_RESTORE=null;CHAR_PICK=null;CAMP_MSG=null;
 var rules={characteristicImprovement:"permanent",skillImprovement:"d6",books:["Mythras Companion"],home:{quote:"Steel remembers.",cite:"Old saying",nextTitle:"Session 4",nextDate:"2026-12-01",nextWhere:"Hall"}};
 upsertCampaignLocal({id:"camp-old",name:"Red",notes:"Meet at the gate.",rulesSettings:rules,createdAt:Date.now(),
  sessionState:{combatants:[{id:"t1",kind:"pc",ref:"char-a",name:"Anath",init:12,hp:{Head:{cur:3,max:5}}},{id:"t2",kind:"pc",ref:"char-b",name:"Brin",init:9},{id:"t3",kind:"npc",ref:null,name:"Bandit",init:8}],round:2,turnIdx:1,activeId:"t1",sessionNotes:"The duke lies."}});
 saveCharLibListLocal([
  {id:"char-a",campaignId:"camp-old",name:"Anath",savedAt:Date.now(),state:Object.assign(pc("Anath",{campaignId:"camp-old"}),{_libId:"char-a"})},
  {id:"char-b",campaignId:"camp-old",name:"Brin",savedAt:Date.now(),state:Object.assign(pc("Brin",{campaignId:"camp-old"}),{_libId:"char-b"})}]);
 saveCustomContentListLocal([{id:"cc1",campaign_id:"camp-old",type:"weapon",name:"Hook Blade",data:{damage:"1d8"},created_at:"2026-11-01T00:00:00Z"},
  {id:"cc2",campaign_id:"camp-old",type:"spell",name:"Ember",data:{cost:1},created_at:"2026-11-01T00:00:00Z"}]);`);
}
async function backupJson(){
 run('CAMPAIGN_VIEW={campaign:normalizeLocalCampaign(getCampaignLocal("camp-old")),members:[],chars:[],unassigned:[]};lastFile=null;APP.downloadCampaignBackup();');
 await new Promise(r=>setTimeout(r,10));
 const f=run('lastFile');assert(f,'the backup is downloaded');return f.c;
}

(async()=>{
await test('round trip: backup -> restore makes a new campaign with the same rules, home, briefing, GM state, homebrew and characters',async()=>{
 seedLocal();const json=await backupJson();
 const before=run('clone({camps:loadCampaignsLocal(),lib:loadCharLibLocal(),cc:loadCustomContentLocal()})');
 ctx.restoreFile=file(json);await run('APP.campaignRestoreFile({files:[restoreFile]})');
 assert.equal(run('APPVIEW'),'campaigns');assert.equal(run('CAMP_MSG'),null);
 const html=run('campaignsHTML()');
 assert.match(html,/Restore campaign from backup/);assert.match(html,/Red \(restored\)/);assert.match(html,/2 custom items/);
 assert.match(html,/Anath/);assert.match(html,/Brin/);assert.match(html,/GM notes and tracker \(3 in the tracker\)/);
 assert.match(html,/Members are not copied/);
 assert.equal(JSON.stringify(run('loadCampaignsLocal()')),JSON.stringify(before.camps),'the preview writes nothing');
 await run('APP.confirmCampaignRestore()');
 const camps=run('loadCampaignsLocal()');assert.equal(camps.length,2,'a second campaign, the original kept');
 assert.deepEqual(camps.find(c=>c.id==='camp-old'),before.camps[0],'the original campaign is untouched');
 const fresh=camps.find(c=>c.id!=='camp-old');
 assert.equal(fresh.name,'Red (restored)');assert.equal(run('CURRENT_CAMPAIGN_ID'),fresh.id);assert.equal(run('APPVIEW'),'campaign');
 assert.match(run('CAMP_MSG'),/Restored as a new campaign: "Red \(restored\)" with 2 characters/);
 assert.deepEqual(fresh.rulesSettings,before.camps[0].rulesSettings,'rules and home settings');
 assert.equal(fresh.notes,'Meet at the gate.','briefing');
 assert.equal(fresh.sessionState.sessionNotes,'The duke lies.');assert.equal(fresh.sessionState.round,2);
 const lib=run('loadCharLibLocal()');assert.equal(lib.length,4,'two new copies, originals kept');
 for(const o of before.lib)assert.deepEqual(lib.find(c=>c.id===o.id),o,'original '+o.name+' untouched');
 const copies=lib.filter(c=>c.campaignId===fresh.id);assert.equal(copies.length,2);
 for(const name of ['Anath','Brin']){
  const copy=copies.find(c=>c.name===name),orig=before.lib.find(c=>c.name===name);
  assert.notEqual(copy.id,orig.id,'a new id');assert.equal(copy.state.campaignId,fresh.id);
  assert.deepEqual(copy.state.inventory,orig.state.inventory);assert.equal(copy.state.concept.name,name);
 }
 const refs=fresh.sessionState.combatants.map(c=>c.ref);
 assert.deepEqual(refs,[copies.find(c=>c.name==='Anath').id,copies.find(c=>c.name==='Brin').id,null],'tracker cards point at the new copies');
 const cc=run('loadCustomContentLocal()').filter(c=>c.campaign_id===fresh.id);
 assert.deepEqual(cc.map(c=>[c.type,c.name,c.data]),[['weapon','Hook Blade',{damage:'1d8'}],['spell','Ember',{cost:1}]]);
 assert.equal(run('loadCustomContentLocal()').filter(c=>c.campaign_id==='camp-old').length,2,'original homebrew kept');
 // Backing up the restored campaign gives the same content back.
 run('CAMPAIGN_VIEW={campaign:normalizeLocalCampaign(getCampaignLocal('+JSON.stringify(fresh.id)+')),members:[],chars:[],unassigned:[]};');
 const again=await run('buildCampaignBackup('+JSON.stringify(fresh.id)+')'),orig=JSON.parse(json);
 assert.deepEqual(again.campaign.rules_settings,orig.campaign.rules_settings);assert.equal(again.campaign.notes,orig.campaign.notes);
 assert.equal(again.gmSessionState.sessionNotes,orig.gmSessionState.sessionNotes);
 assert.deepEqual(again.customContent.map(c=>c.name),orig.customContent.map(c=>c.name));
 assert.deepEqual(again.characters.map(c=>c.state.inventory),orig.characters.map(c=>c.state.inventory));
});

await test('the GM chooses which characters to copy; unchosen tracker cards lose their link',async()=>{
 seedLocal();const json=await backupJson();
 ctx.restoreFile=file(json);await run('APP.campaignRestoreFile({files:[restoreFile]})');
 const brin=JSON.parse(json).characters.findIndex(c=>c.name==='Brin');
 run('APP.toggleRestorePick('+brin+',false)');await run('APP.confirmCampaignRestore()');
 const fresh=run('loadCampaignsLocal()').find(c=>c.id!=='camp-old');
 const copies=run('loadCharLibLocal()').filter(c=>c.campaignId===fresh.id);
 assert.deepEqual(copies.map(c=>c.name),['Anath']);
 assert.deepEqual(fresh.sessionState.combatants.map(c=>c.ref),[copies[0].id,null,null]);
 assert.equal(fresh.sessionState.combatants[1].name,'Brin','the card keeps its saved name');
});

await test('bad files are refused before anything is written, with a reason',async()=>{
 seedLocal();const good=JSON.parse(await backupJson());
 const cases=[
  [{format:'mythras-forge-guest-backup',version:1,characters:[]},/not a Forge campaign backup/],
  [Object.assign(clone(good),{version:2}),/newer version/],
  [Object.assign(clone(good),{campaign:null}),/campaign details are missing/],
  [(()=>{const b=clone(good);b.characters[1].state={concept:null};return b;})(),/character 2 \(Brin\): missing character concept/],
  [(()=>{const b=clone(good);b.customContent.push({type:'vehicle',name:'Cart'});return b;})(),/custom item 3/],
  [(()=>{const b=clone(good);b.gmSessionState=[1];return b;})(),/GM notes and tracker/]];
 function clone(v){return JSON.parse(JSON.stringify(v));}
 const camps=JSON.stringify(run('loadCampaignsLocal()'));
 for(const [bad,why] of cases){
  ctx.restoreFile=file(JSON.stringify(bad));await run('APP.campaignRestoreFile({files:[restoreFile]})');
  assert.match(run('CAMP_MSG'),why);assert.match(run('CAMP_MSG'),/^Restore failed/);assert.equal(run('CAMP_RESTORE'),null);
 }
 ctx.restoreFile=file('{not json');await run('APP.campaignRestoreFile({files:[restoreFile]})');assert.match(run('CAMP_MSG'),/not valid JSON/);
 ctx.restoreFile={size:21*1024*1024,text:async()=>'{}'};await run('APP.campaignRestoreFile({files:[restoreFile]})');assert.match(run('CAMP_MSG'),/20 MB/);
 assert.equal(JSON.stringify(run('loadCampaignsLocal()')),camps,'nothing was created');
});

await test('signed in: restore inserts a new campaign, GM state, homebrew and GM-owned copies, and never updates existing rows',async()=>{
 seedLocal();const json=await backupJson();
 run(`MOCK_AUTH=null;AUTH_USER={id:"gm2"};var calls=[],n=0;
 sb.from=t=>{const q={t};const api={
  insert(row){q.op="insert";q.row=clone(row);return api;},update(f){q.op="update";q.row=clone(f);return api;},
  upsert(row,o){calls.push({t,op:"upsert",row:clone(row)});return Promise.resolve({error:null});},
  delete(){q.op="delete";return api;},select(){return api;},order(){return Promise.resolve({data:[],error:null});},
  eq(k,v){q.eq=[k,v];if(q.op==="update"||q.op==="delete"){calls.push({t,op:q.op,row:q.row,eq:q.eq});return Promise.resolve({error:null});}return api;},
  single(){const row=Object.assign({id:t+"-new-"+(++n)},q.row);calls.push({t,op:"insert",row:clone(row)});return Promise.resolve({data:row,error:null});},
  maybeSingle(){return Promise.resolve({data:null,error:null});},
  then(res){if(q.op==="insert")calls.push({t,op:"insert",row:clone(q.row)});res({data:q.op==="insert"?null:[],error:null});}};return api;};
 GM_STATE_TABLE_MISSING=false;`);
 assert.equal(run('cloudActive()'),true);
 ctx.restoreFile=file(json);await run('APP.campaignRestoreFile({files:[restoreFile]})');await run('APP.confirmCampaignRestore()');
 const calls=JSON.parse(run('JSON.stringify(calls)'));
 const camp=calls.find(c=>c.t==='campaigns'&&c.op==='insert').row;
 assert.equal(camp.name,'Red (restored)');assert.equal(camp.dm_id,'gm2');assert.notEqual(camp.invite_code,undefined);
 assert.deepEqual(camp.rules_settings,JSON.parse(json).campaign.rules_settings);
 assert(calls.some(c=>c.t==='campaign_members'&&c.op==='insert'&&c.row.user_id==='gm2'&&c.row.role==='dm'),'the restorer is the GM member');
 assert.equal(calls.filter(c=>c.t==='campaign_members').length,1,'other members are not recreated');
 const upd=calls.filter(c=>c.op==='update');
 assert.deepEqual(upd.map(c=>[c.t,c.eq,Object.keys(c.row)]),[['campaigns',['id',camp.id],['notes']]],'the only update is the new campaign\'s briefing');
 const chars=calls.filter(c=>c.t==='characters');
 assert.equal(chars.length,2);assert(chars.every(c=>c.op==='insert'&&c.row.owner_id==='gm2'&&c.row.campaign_id===camp.id&&!('id' in c.row&&!/^characters-new/.test(c.row.id))),'new GM-owned copies');
 const cc=calls.filter(c=>c.t==='campaign_custom_content');
 assert.deepEqual(cc.map(c=>[c.row.campaign_id,c.row.type,c.row.name,c.row.created_by]),[[camp.id,'weapon','Hook Blade','gm2'],[camp.id,'spell','Ember','gm2']]);
 const gm=calls.find(c=>c.t==='campaign_gm_state');assert.equal(gm.row.campaign_id,camp.id);assert.equal(gm.row.session_state.sessionNotes,'The duke lies.');
 assert.deepEqual(gm.row.session_state.combatants.map(c=>c.ref),chars.map(c=>c.row.id).concat([null]));
 assert(!calls.some(c=>c.op==='delete'),'nothing is deleted');
 run('AUTH_USER=null;MOCK_AUTH={id:"local"};');
});

await test('a failure part-way says what was restored and leaves the new campaign open',async()=>{
 seedLocal();const json=await backupJson();
 run('var realCreate=createCustomContentUnified;createCustomContentUnified=async()=>{throw new Error("quota")};');
 ctx.restoreFile=file(json);await run('APP.campaignRestoreFile({files:[restoreFile]})');await run('APP.confirmCampaignRestore()');
 run('createCustomContentUnified=realCreate;');
 assert.match(run('CAMP_MSG'),/Restore stopped while adding custom content: quota\. The new campaign "Red \(restored\)" holds what was restored so far \(the briefing\); nothing else was changed\./);
 assert.equal(run('APPVIEW'),'campaign');assert.equal(run('loadCampaignsLocal().length'),2);
 assert.equal(run('getCampaignLocal("camp-old").name'),'Red','the original is untouched');
});

await test('Import character backup with a campaign file offers a pick list and imports one character',async()=>{
 seedLocal();const json=await backupJson();
 run('APPVIEW="account";S=freshState();S.concept.name="Open sheet";');
 ctx.importFile=file(json);await run('APP.importCharacterFile({files:[importFile]})');
 assert.equal(run('APPVIEW'),'library');
 const html=run('libraryHTML()');assert.match(html,/Import a character from &ldquo;Red&rdquo;/);assert.match(html,/Anath/);assert.match(html,/Brin/);
 assert.equal(run('loadCharLibLocal().length'),2,'nothing imported yet');
 const brin=JSON.parse(json).characters.findIndex(c=>c.name==='Brin');
 await run('APP.importPickedCharacter('+brin+')');
 const lib=run('loadCharLibLocal()');assert.equal(lib.length,3);
 const copy=lib.find(c=>!['char-a','char-b'].includes(c.id));
 assert.equal(copy.name,'Brin');assert.equal(copy.campaignId,null,'not linked to any campaign');
 assert.equal(run('S.concept.name'),'Open sheet','the open character is kept');assert.equal(run('CHAR_PICK'),null);
 // Cancel leaves everything as it was.
 ctx.importFile=file(json);await run('APP.importCharacterFile({files:[importFile]})');run('APP.cancelCharacterPick()');
 assert.equal(run('CHAR_PICK'),null);assert.equal(run('loadCharLibLocal().length'),3);
 // A broken campaign file is refused with its reason.
 const bad=JSON.parse(json);bad.characters[0].state=null;ctx.importFile=file(JSON.stringify(bad));
 run('APPVIEW="account";');await run('APP.importCharacterFile({files:[importFile]})');
 assert.match(run('AUTH_MSG.text'),/Import failed: character 1 .*expected a character object/);
 assert.match(run('characterImportProblem({format:"mythras-forge-campaign-backup"})'),/campaign backup/);
});

await test('the campaign page shows Restore from backup and the GM tools explain it',()=>{
 seedLocal();run('CAMP_CACHE=loadCampaignsLocal().map(normalizeLocalCampaign);CAMP_LOAD_ERROR="";');
 assert.match(run('campaignsHTML()'),/APP\.chooseCampaignRestore\(\)">Restore from backup/);
 assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/id="campaignRestoreFile"[^>]*onchange="APP\.campaignRestoreFile\(this\)"/);
 const src=fs.readFileSync(path.join(root,'js/cloud.js'),'utf8');
 assert.doesNotMatch(src,/any one of\s*\/\/ them can be imported again through Account > Import character backup/,'the old comment is gone');
});

console.log(passed+' campaign restore tests passed');
})().catch(e=>{console.error(e);process.exit(1);});
