// Subsystem 8 security (docs/campaign-cases-batch-1.md): GM-private session
// state, campaign assignment checks and the GM inventory RPC. The SQL is
// checked statically here; live multi-account checks are in the case file.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
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
// A tiny PostgREST stand-in that records which tables were touched.
run(`var calls=[],gmRow=null,gmMissing=false,gmFail=null,campRow={id:"c1",name:"Red",dm_id:"gm",session_state:null};
sb.from=t=>{const q={t,op:"select",filters:{}};calls.push(q);const api={
 select(){return api;},eq(k,v){q.filters[k]=v;return api;},order(){return api;},
 upsert(row){q.op="upsert";q.row=row;return Promise.resolve({error:gmMissing?{code:"PGRST205",message:"Could not find the table 'public.campaign_gm_state' in the schema cache"}:gmFail});},
 update(f){q.op="update";q.row=f;return api;},
 maybeSingle(){if(t==="campaign_gm_state")return Promise.resolve(gmMissing?{data:null,error:{code:"PGRST205",message:"Could not find the table"}}:{data:gmRow,error:null});
  return Promise.resolve({data:JSON.parse(JSON.stringify(campRow)),error:null});},
 then(res,rej){return Promise.resolve({data:null,error:null}).then(res,rej);}};return api;};
render=()=>{};MOCK_AUTH=null;`);
(async()=>{
await test('C8-SEC12/BRD17 a player never requests the GM session state',async()=>{
 run('AUTH_USER={id:"player"};calls=[];gmRow={session_state:{sessionNotes:"secret"}};');
 const camp=await run('loadCampaignRowUnified("c1")');
 assert(!run('calls.some(c=>c.t==="campaign_gm_state")'),'no request to the GM table');
 assert.equal(camp.session_state,null);
});
await test('the GM reads session state from the GM-only table',async()=>{
 run('AUTH_USER={id:"gm"};calls=[];GM_STATE_TABLE_MISSING=false;gmMissing=false;gmRow={session_state:{sessionNotes:"secret",combatants:[]}};');
 const camp=await run('loadCampaignRowUnified("c1")');
 assert.equal(camp.session_state.sessionNotes,'secret');
});
await test('GM tool saves go to the GM-only table, never the readable campaign row',async()=>{
 run('calls=[];');await run('sessionStateCampaignUnified("c1",{sessionNotes:"x",combatants:[]})');
 assert(run('calls.some(c=>c.t==="campaign_gm_state"&&c.op==="upsert"&&c.row.campaign_id==="c1")'));
 assert(!run('calls.some(c=>c.t==="campaigns"&&c.op==="update")'));
});
await test('before the migration runs, the app falls back to the old column and keeps working',async()=>{
 run('calls=[];GM_STATE_TABLE_MISSING=false;gmMissing=true;campRow.session_state={sessionNotes:"old",combatants:[]};');
 const camp=await run('loadCampaignRowUnified("c1")');assert.equal(camp.session_state.sessionNotes,'old');
 run('calls=[];');await run('sessionStateCampaignUnified("c1",{sessionNotes:"y",combatants:[]})');
 assert(run('calls.some(c=>c.t==="campaigns"&&c.op==="update"&&c.row.session_state.sessionNotes==="y")'));
 run('gmMissing=false;campRow.session_state=null;GM_STATE_TABLE_MISSING=false;');
});
await test('other save errors are reported, not silently redirected to the readable column',async()=>{
 run('calls=[];gmFail={code:"42501",message:"permission denied"};');
 await assert.rejects(run('sessionStateCampaignUnified("c1",{sessionNotes:"z",combatants:[]})'));
 assert(!run('calls.some(c=>c.t==="campaigns"&&c.op==="update")'));run('gmFail=null;');
});
await test('the migration enforces GM-only access, clears the old copy, checks assignments and the inventory RPC',()=>{
 const dir=path.join(root,'supabase/migrations'),f=fs.readdirSync(dir).find(n=>/gm_private_state/.test(n));assert(f,'migration file exists');
 const sql=fs.readFileSync(path.join(dir,f),'utf8');
 assert.match(sql,/create table if not exists public\.campaign_gm_state/);
 assert.match(sql,/alter table public\.campaign_gm_state enable row level security/);
 assert.match(sql,/for all to authenticated\s+using \(exists \(select 1 from public\.campaigns c where c\.id = campaign_gm_state\.campaign_id and c\.dm_id = \(select auth\.uid\(\)\)\)\)/);
 assert.match(sql,/update public\.campaigns set session_state = null/);
 assert.match(sql,/new\.session_state := null/);
 assert.match(sql,/new\.campaign_id is distinct from old\.campaign_id/,'unchanged assignments are not re-checked');
 assert.match(sql,/is_campaign_member\(new\.campaign_id\) or private\.is_campaign_dm\(new\.campaign_id\)/);
 assert.match(sql,/jsonb_typeof\(p_inventory\) <> 'array'/);
 assert.match(sql,/^begin;[\s\S]*commit;\s*$/m,'runs in one transaction');
});
console.log(passed+' campaign security tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
