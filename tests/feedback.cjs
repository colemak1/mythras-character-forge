// Site-wide feedback button (js/feedback.js; owner, 2026-11-27): a bug report or idea is saved in the Pits reports
// table with where the player was, so the export copies it with the fight reports. No browser or network: the Supabase
// client and the storage are stand-ins.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const F=require('../js/feedback.js');
const root=path.resolve(__dirname,'..');
let passed=0;const test=async(n,f)=>{await f();passed++;console.log('PASS '+n);};
const store=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};
function fake({fail=null,down=false}={}){
  const rows=[];
  return {rows,auth:{getSession:async()=>{throw new Error('feedback must not need a session');}},
    from:t=>{assert.equal(t,'pits_fight_reports');return {insert:async r=>{if(down)throw new Error('net');if(fail)return {error:{message:fail}};rows.push(r);return {error:null};}};}};
}
const loc={pathname:'/mythras-character-forge/index.html',search:'',hash:'#/campaign/abc'};
const doc={body:{dataset:{sitotaView:'campaign'},classList:{contains:()=>false}},documentElement:{dataset:{mode:'dark'}}};
const win={innerWidth:390,innerHeight:844,devicePixelRatio:3};
(async()=>{
await test('the public key and project are the same as the main site\'s (js/cloud.js)',async()=>{
  const c=fs.readFileSync(path.join(root,'js/cloud.js'),'utf8');
  assert.equal(F.SUPABASE_URL,/const SUPABASE_URL="([^"]+)"/.exec(c)[1]);
  assert.equal(F.SUPABASE_ANON_KEY,/const SUPABASE_ANON_KEY="([^"]+)"/.exec(c)[1]);
});
await test('where the player is: page, view, route, viewport and mode',async()=>{
  assert.deepEqual(F.where(loc,doc,win),{page:'mythras-character-forge/index.html',view:'campaign',hash:'#/campaign/abc',
    viewport:{w:390,h:844,dpr:3},mode:'dark'});
  const pits={body:{dataset:{},classList:{contains:c=>c==='pits-page'}},documentElement:{dataset:{}}};
  const w=F.where({pathname:'/x/experiments/practice-combat.html',search:'?stage=spring',hash:''},pits,{innerWidth:1280,innerHeight:800});
  assert.deepEqual([w.page,w.view,w.hash,w.mode,w.viewport.dpr],['experiments/practice-combat.html?stage=spring','pits',null,'light',1]);
});
await test('a bug and an idea are tagged so the export and ledger can tell them from fight reports',async()=>{
  const place=F.where(loc,doc,win);
  const b=F.row('bug','  The save button does nothing  ',place,' Sam ','UA','2026-11-27T10:00:00Z');
  assert.equal(b.note,'[Site bug] The save button does nothing');assert.equal(b.reporter,'Sam');
  assert.equal(b.page,'mythras-character-forge/index.html');assert.equal(b.build,'view=campaign;390x844');
  assert.deepEqual(b.record,{record:'site-feedback',kind:'bug',view:'campaign',hash:'#/campaign/abc',viewport:{w:390,h:844,dpr:3},mode:'dark',userAgent:'UA',at:'2026-11-27T10:00:00Z'});
  const i=F.row('idea','Dark parchment for the atlas',place,'','UA','t');
  assert.equal(i.note,'[Site idea] Dark parchment for the atlas');assert.equal(i.reporter,null);assert.equal(i.record.kind,'idea');
  assert.equal(F.row('bug','   ',place,'','',''),null,'an empty message is not sent');
  assert(F.row('bug','x'.repeat(5000),place,'','','').note.length<=4000,'fits the table\'s 4000-character note');
});
await test('every row fits the table\'s checks and the columns anyone may insert',async()=>{
  const sql=fs.readFileSync(path.join(root,'supabase/migrations/20261114120000_pits_fight_reports.sql'),'utf8');
  const cols=/grant insert \(([^)]+)\) on public\.pits_fight_reports/.exec(sql)[1].split(',').map(s=>s.trim()).sort();
  const r=F.row('idea','y',F.where(loc,doc,win),'n'.repeat(80),'u'.repeat(900),'t');
  const c=fake();await F.send(r,c,store());
  assert.deepEqual(Object.keys(c.rows[0]).sort(),cols);
  assert(c.rows[0].reporter.length<=60&&c.rows[0].page.length<=500&&c.rows[0].build.length<=200);
  assert(JSON.stringify(c.rows[0].record).length<2000,'a small record');
});
await test('offline or refused: kept on this device and sent, oldest first, with the next one',async()=>{
  const s=store(),p=F.where(loc,doc,win);
  let r=await F.send(F.row('bug','one',p,'','',''),fake({down:true}),s);assert.equal(r.why,'offline');assert.match(F.message(r),/could not be reached/);
  r=await F.send(F.row('bug','two',p,'','',''),fake({fail:'too many fight reports today'}),s);assert.equal(r.why,'error');assert.match(F.message(r),/too many/);
  r=await F.send(F.row('idea','three',p,'','',''),null,s);assert.equal(F.readQueue(s).length,3);
  const c=fake();r=await F.send(null,c,s);
  assert.deepEqual(c.rows.map(x=>x.note),['[Site bug] one','[Site bug] two','[Site idea] three']);
  assert.equal(r.sent,3);assert.equal(F.readQueue(s).length,0);assert.match(F.message(r),/2 kept from before/);
  assert.notEqual(F.QUEUE_KEY,'sitota-pits-reports-pending-v1','its own queue: a fight report never waits behind feedback');
});
await test('the button sits above the tallest bar fixed along the bottom, and ignores hidden or floating ones',async()=>{
  const vh=844,bar=(o)=>({display:'grid',visibility:'visible',position:'fixed',top:vh-68,bottom:vh,height:68,...o});
  assert.equal(F.liftFor([],vh),0);
  assert.equal(F.liftFor([bar()],vh),68);
  assert.equal(F.liftFor([bar(),bar({top:vh-90,height:90})],vh),90);
  assert.equal(F.liftFor([bar({display:'none'})],vh),0);
  assert.equal(F.liftFor([bar({position:'static'})],vh),0);
  assert.equal(F.liftFor([bar({top:100,bottom:168})],vh),0,'not along the bottom');
  assert.equal(F.liftFor([bar({height:0})],vh),0);
});
await test('every page that players use loads the button and its stylesheet before the theme',async()=>{
  for(const [page,pre] of [['index.html',''],['experiments/practice-combat.html','../']]){
    const html=fs.readFileSync(path.join(root,page),'utf8');
    assert.match(html,new RegExp('<script src="'+pre+'js/feedback\\.js\\?v='),page);
    const css=html.indexOf(pre+'sitota-feedback.css?v='),theme=html.indexOf(pre+'sitota-theme.css?v=');
    assert(css>0&&css<theme,page+': feedback stylesheet loads before the theme');
  }
});
await test('the stylesheet uses theme tokens only, and keeps the button off a Pits fight',async()=>{
  const css=fs.readFileSync(path.join(root,'sitota-feedback.css'),'utf8');
  assert.doesNotMatch(css,/#[0-9a-f]{3,8}\b/i,'no hex colours');
  assert.match(css,/var\(--fb-lift/);assert.match(css,/body\.pa-on \.fb-button/);
});
await test('the export lists site feedback with the fight reports',async()=>{
  const X=require('../scripts/pits-reports-export.cjs');
  const r=F.row('bug','broken',F.where(loc,doc,win),'Sam','',''),p=X.plan([{id:'abcdef12-0000',created_at:'2026-11-27T10:00:00Z',...r}],[]);
  assert.match(p.index,/\[Site bug\] broken/);assert.equal(Object.keys(p.write).length,1);
});
await test('the export runs by hand and every 6 hours on Pacific time, summer and winter',async()=>{
  const y=fs.readFileSync(path.join(root,'.github/workflows/pits-reports-export.yml'),'utf8');
  assert.match(y,/workflow_dispatch:/);
  const crons=[...y.matchAll(/- cron: '([^']+)'/g)].map(m=>m[1]);
  assert.deepEqual(crons,['0 1,7,13,19 * * *','0 2,8,14,20 * * *'],'PDT (UTC-7) and PST (UTC-8) hours for 12 AM, 6 AM, 12 PM, 6 PM');
  for(const c of crons)assert(y.includes("\"$SCHEDULE\" = '"+c+"'"),'the guard knows '+c);
  assert.match(y,/TZ=America\/Los_Angeles date \+%z/);
});
console.log(passed+' feedback tests passed');
})().catch(e=>{console.error(e);process.exit(1);});
