// The Pits "Idea" button (experiments/pits-idea.js; owner, 2026-11-15): a player's suggestion is saved to the fight
// reports with a note starting "[Idea]" and a small record of where the fight was. No browser or network: the database
// client is a stand-in.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const rows=[],store={};
const output={innerHTML:'',addEventListener(){}};
const ctx={console,URLSearchParams,JSON,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:'?x=1',pathname:'/experiments/practice-combat.html'},
 navigator:{userAgent:'test'},sessionStorage:{getItem:()=>null},
 localStorage:{getItem:k=>k in store?store[k]:null,setItem(k,v){store[k]=String(v);},removeItem(k){delete store[k];}},alert(){},
 document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},
  scripts:[{getAttribute:()=>'pits-arena.js?v=abc123'}]},
 matchMedia:()=>({matches:false}),requestAnimationFrame(){},__psRecord:[]};
ctx.window=ctx;
vm.createContext(ctx);
for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js','experiments/pits-game.js','experiments/pits-stage.js','experiments/pits-arena.js','experiments/pits-report.js','experiments/pits-bottom.js','experiments/pits-lost.js','experiments/pits-idea.js'])
 vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const run=s=>vm.runInContext(s,ctx);
ctx.__rows=rows;
let fail=false;
run(`PitsReport.client=async()=>({from:t=>({insert:async row=>{if(__fail())return {error:{message:'refused'}};__rows.push({t,row});return {error:null};}})});`);
ctx.__fail=()=>fail;
run(`(()=>{startRun();R=null;V.busy=false;S.phase='fight';S.round=3;S.cycle=1;S.order=['a','b'];S.turnIndex=0;S.pending=null;S.logs=[];})()`);
ctx.document.body={dataset:{bottom:'E'},classList:{contains:()=>false}};
let passed=0;const test=async(n,f)=>{await f();passed++;console.log('PASS '+n);};
(async()=>{
await test('the top bar has an Idea button beside Lost? and Report fight',async()=>{
  const bar=run('pitsArenaBarHtml()');
  assert.match(bar,/data-pa="idea"[^>]*>Idea</);
  assert.ok(bar.indexOf('data-pa="lost"')<bar.indexOf('data-pa="idea"')&&bar.indexOf('data-pa="idea"')<bar.indexOf('data-pa="report"'),'Lost?, Idea, Report fight');
});
await test('an idea is saved to the fight reports as "[Idea] ...", with a small record and the name',async()=>{
  const r=await run(`pitsIdeaSend('  Let me choose which hand holds the shield  ','Ana')`);
  assert.equal(r.why,null);assert.equal(r.sent,1);
  assert.equal(rows.length,1);assert.equal(rows[0].t,'pits_fight_reports');
  const row=rows[0].row;
  assert.equal(row.note,'[Idea] Let me choose which hand holds the shield');
  assert.equal(row.reporter,'Ana');assert.equal(row.page,'experiments/practice-combat.html?x=1');assert.equal(row.build,'arena=abc123');
  assert.equal(row.record.record,'pits-idea');assert.equal(row.record.round,3);
  assert.equal(typeof row.record.fighters.a.name,'string');
  assert.equal(row.record.log,undefined,'not the whole fight');
  assert.equal(store[run('PitsReport.NAME_KEY')],'Ana','the name is remembered on this device, as for reports');
});
await test('an empty idea is not sent',async()=>{
  const r=await run(`pitsIdeaSend('   ','')`);
  assert.equal(r.why,'empty');assert.equal(rows.length,1);
});
await test('a refused idea is kept on the device and goes with the next send',async()=>{
  fail=true;
  const r=await run(`pitsIdeaSend('Second idea','')`);
  assert.equal(r.why,'error');assert.equal(r.kept,1);assert.equal(rows.length,1);
  fail=false;
  const r2=await run(`pitsIdeaSend('Third idea','')`);
  assert.equal(r2.sent,2);assert.deepEqual(rows.slice(1).map(x=>x.row.note),['[Idea] Second idea','[Idea] Third idea']);
});
await test('a very long idea still fits the database note limit',async()=>{
  await run(`pitsIdeaSend('x'.repeat(5000),'')`);
  assert.ok(rows[rows.length-1].row.note.length<=4000);
});
console.log(`${passed} passed`);
})().catch(e=>{console.error(e);process.exit(1);});
