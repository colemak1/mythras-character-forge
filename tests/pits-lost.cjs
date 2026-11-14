// The Pits "What just happened?" (experiments/pits-lost.js; owner, 2026-11-14): one press marks the moment, saves it at
// once with the whole fight record to the fight reports (no typing), and tells the player the last few actions as the
// screen has shown them. No browser or network: the database client is a stand-in.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const rows=[];
const output={innerHTML:'',addEventListener(){}};
const ctx={console,URLSearchParams,JSON,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:'',pathname:'/experiments/practice-combat.html'},
 navigator:{userAgent:'test'},sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},alert(){},
 document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},scripts:[]},
 matchMedia:()=>({matches:false}),requestAnimationFrame(){},__psRecord:[]};
ctx.window=ctx;   // as in a browser, window is the global object (pits-report.js sets window.PitsReport)
vm.createContext(ctx);
for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js','experiments/pits-game.js','experiments/pits-stage.js','experiments/pits-arena.js','experiments/pits-report.js','experiments/pits-bottom.js','experiments/pits-lost.js'])
 vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const run=s=>vm.runInContext(s,ctx);
ctx.__rows=rows;
run(`PitsReport.client=async()=>({from:t=>({insert:async row=>{__rows.push({t,row});return {error:null};}})});`);
// a bout with one exchange in the log: an attack, a failed parry, a wound
run(`(()=>{startRun();R=null;V.busy=false;S.phase='fight';S.round=2;S.cycle=1;S.order=['a','b'];S.turnIndex=0;S.pending=null;
  S.logs=[{id:1,title:'Round 2',body:'',kind:'system'},
   {id:2,title:'Kethan Voss attacks',body:'11 against Combat Style 60% · SUCCESS',kind:'roll',meta:{exid:7,actor:'a'}},
   {id:3,title:'Border Deserter parries',body:'95 vs 50% · FAILURE',kind:'roll',meta:{actor:'b'}},
   {id:4,title:'Damage',body:'Broadsword 1d8: 6',kind:'hurt',meta:{actor:'a'}}];})()`);
// the page has a body once it is drawn (the arena reads its data-bottom for the record)
ctx.document.body={dataset:{bottom:'E'},classList:{contains:()=>false}};
let passed=0;const test=async(n,f)=>{await f();passed++;console.log('PASS '+n);};
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
await test('one press marks the moment and saves it at once, with the whole fight record and no typing',async()=>{
  const m=JSON.parse(run('JSON.stringify(pitsLostMark())'));await flush();
  assert.equal(m.n,1);assert.equal(m.round,2);assert.equal(m.phase,'action');assert.equal(m.logShown,4);assert.equal(m.lastLogShown,4);
  assert.equal(rows.length,1);assert.equal(rows[0].t,'pits_fight_reports');
  const r=rows[0].row;
  assert.match(r.note,/^\[Lost #1\] Pressed "What just happened\?" in round 2/);
  assert.equal(r.record.record,'pits-spring-1','the full fight record');assert.equal(r.record.lostMark,1);
  assert.equal(r.record.lost.length,1);assert.equal(r.record.log.length,4);
});
await test('the player is told the last actions in plain words, as the deck tells them',async()=>{
  const m=JSON.parse(run('JSON.stringify(pitsLostMark())'));await flush();
  const text=m.recent.map(l=>l.text).join(' / ');
  assert.match(text,/Kethan Voss attacked/);assert.match(text,/Kethan Voss attacks: rolled 11, needed 60 or less · Success/);
  assert.match(text,/Border Deserter parries: rolled 95, needed 50 or less · Failure/);
  assert.equal(m.n,2,'a second press is the second mark');
  assert.equal(rows[1].row.record.lost.length,2,'the record carries every mark in this bout');
});
await test('during a replayed exchange only what has been shown so far is told and recorded',async()=>{
  run('V.busy=true;V.visibleCount=2;V.events=[{},{},{}];V.step=1;');
  const m=JSON.parse(run('JSON.stringify(pitsLostMark())'));await flush();
  run('V.busy=false;V.visibleCount=Infinity;');
  assert.equal(m.playing,true);assert.equal(m.beat,1);assert.equal(m.beats,3);assert.equal(m.logShown,2);assert.equal(m.logTotal,4);
  const text=m.recent.map(l=>l.text).join(' / ');
  assert.match(text,/Kethan Voss attacks/);assert.doesNotMatch(text,/parries/,'the parry has not been shown yet');
});
await test('a decision waiting is part of the mark',async()=>{
  run(`S.pending={kind:'reaction',atk:'b',def:'a',attackRoll:{roll:20,grade:2,label:'SUCCESS'}};`);
  const m=JSON.parse(run('JSON.stringify(pitsLostMark())'));await flush();run('S.pending=null');
  assert.equal(m.pending,'reaction');assert.equal(m.phase,'reaction');
});
await test('a new bout starts a fresh list of marks',async()=>{
  run(`S.fighters.b.name='Someone Else';`);
  const m=JSON.parse(run('JSON.stringify(pitsLostMark())'));await flush();
  assert.equal(m.n,1);assert.equal(rows[rows.length-1].row.record.lost.length,1);
});
await test('the button sits in the top bar next to Report fight',async()=>{
  assert.match(run('pitsArenaBarHtml()'),/data-pa="lost"[^>]*>Lost\?<\/button>\s*<button[^>]*data-pa="report"/);
});
console.log(passed+' passed');
})().catch(e=>{console.error(e);process.exit(1);});
