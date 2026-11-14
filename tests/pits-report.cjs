// The Pits "Report fight" (experiments/pits-report.js; owner, 2026-11-14): a report goes to the database, signed in or
// not; offline or refused, it is kept on the device and sent with the next one that goes through. No browser or
// network: the Supabase client and the storage are stand-ins.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=require('../experiments/pits-report.js');
let passed=0;const test=async(n,f)=>{await f();passed++;console.log('PASS '+n);};
const store=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};
// a stand-in client: fail (the database refuses), down (the network throws). It never asks who is signed in.
function fake({fail=null,down=false}={}){
  const rows=[];
  return {rows,auth:{getSession:async()=>{throw new Error('a report must not need a session');}},
    from:t=>{assert.equal(t,'pits_fight_reports');return {insert:async row=>{if(down)throw new Error('net');if(fail)return {error:{message:fail}};rows.push(row);return {error:null};}};}};
}
const rep=n=>({note:'note '+n,record:{record:'pits-spring-1',n},page:'experiments/practice-combat.html?stage=spring',build:'stage=abc',reporter:'Sam',at:'x'});
(async()=>{
await test('the public key and project are the same as the main site\'s (js/cloud.js)',async()=>{
  const c=fs.readFileSync(path.join(__dirname,'../js/cloud.js'),'utf8');
  assert.equal(R.SUPABASE_URL,/const SUPABASE_URL="([^"]+)"/.exec(c)[1]);
  assert.equal(R.SUPABASE_ANON_KEY,/const SUPABASE_ANON_KEY="([^"]+)"/.exec(c)[1]);
});
await test('signed in or not: the report is saved with its note, record, page, build and name; nothing is kept',async()=>{
  const s=store(),c=fake(),r=await R.send(rep(1),c,s);
  assert.deepEqual([r.sent,r.kept,r.why],[1,0,null]);
  assert.deepEqual(c.rows,[{note:'note 1',record:{record:'pits-spring-1',n:1},page:'experiments/practice-combat.html?stage=spring',build:'stage=abc',reporter:'Sam'}]);
  assert.equal(R.readQueue(s).length,0);assert.match(R.message(r),/^Sent\./);
});
await test('offline or refused: kept on this device, and the message says why',async()=>{
  for(const [opt,why,re] of [[{down:true},'offline',/could not be reached/],[{fail:'too many fight reports today'},'error',/too many/]]){
    const s=store(),r=await R.send(rep(1),fake(opt),s);
    assert.equal(r.why,why);assert.equal(r.kept,1);assert.equal(R.readQueue(s)[0].note,'note 1');assert.match(R.message(r),re);
  }
  const s=store(),r=await R.send(rep(1),null,s);assert.equal(r.why,'offline');assert.equal(R.readQueue(s).length,1);
});
await test('kept reports are sent, oldest first, with the next one that goes through',async()=>{
  const s=store();await R.send(rep(1),fake({down:true}),s);await R.send(rep(2),null,s);
  const c=fake(),r=await R.send(rep(3),c,s);
  assert.deepEqual(c.rows.map(x=>x.note),['note 1','note 2','note 3']);assert.equal(r.sent,3);assert.equal(R.readQueue(s).length,0);
  assert.match(R.message(r),/2 kept from before/);
});
await test('a retry sends what is kept without keeping a second copy',async()=>{
  const s=store();await R.send(rep(1),fake({down:true}),s);
  const c=fake(),r=await R.send(null,c,s);assert.deepEqual(c.rows.map(x=>x.note),['note 1']);assert.equal(r.sent,1);
});
await test('a failure part way keeps the rest, in order',async()=>{
  const s=store();await R.send(rep(1),null,s);await R.send(rep(2),null,s);
  let n=0;const c=fake();const ins=c.from('pits_fight_reports').insert;
  c.from=()=>({insert:async row=>(++n===2?{error:{message:'boom'}}:ins(row))});
  const r=await R.send(null,c,s);
  assert.equal(r.sent,1);assert.equal(r.why,'error');assert.deepEqual(R.readQueue(s).map(x=>x.note),['note 2']);
});
await test('at most 20 are kept; a browser that will not store says so',async()=>{
  const s=store();for(let i=0;i<25;i++)await R.send(rep(i),null,s);
  const q=R.readQueue(s);assert.equal(q.length,20);assert.equal(q[0].note,'note 5');
  const bad={getItem:()=>null,setItem:()=>{throw new Error('full');},removeItem:()=>{}};
  const r=await R.send(rep(1),null,bad);assert(r.lost);assert.match(R.message(r),/Copy the fight record/);
});
await test('the build names the Pits scripts the page runs (to tell a stale page)',async()=>{
  assert.equal(R.buildOf(['pits-motion.js?v=5c6cf25c54','https://cdn.example/x.js','pits-stage.js?v=abc123','../js/data.js?v=ff']),'motion=5c6cf25c54;stage=abc123');
});
await test('the export writes one file per new report, never rewrites one, and lists them all, newest first',async()=>{
  const X=require('../scripts/pits-reports-export.cjs');
  const rows=[{id:'aaaaaaaa-1111',created_at:'2026-11-14T03:04:05Z',reporter:'Sam',note:'first | with a pipe\nand a line',page:'p',build:'stage=1',record:{a:1}},
    {id:'bbbbbbbb-2222',created_at:'2026-11-15T10:00:00Z',reporter:null,note:'second',page:'p',build:'stage=2',record:{b:2}}];
  const p=X.plan(rows,['20261114-030405-aaaaaaaa.json']);
  assert.deepEqual(Object.keys(p.write),['20261115-100000-bbbbbbbb.json']);
  assert.deepEqual(JSON.parse(p.write['20261115-100000-bbbbbbbb.json']).record,{b:2});
  const lines=p.index.split('\n').filter(l=>l.startsWith('| 2026'));
  assert.equal(lines.length,2);assert.match(lines[0],/second/);assert.match(lines[0],/\| - \| second/);assert.match(lines[1],/\| Sam \| first \\\| with a pipe and a line/);
});
console.log(passed+' report tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
