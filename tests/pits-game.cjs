// The Pits game layer (experiments/pits-game.js) is presentation only:
// Glory, Momentum and Marks follow the fight but must never change it.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function arena(withGame,seed){
 const q=[];let s=seed>>>0;
 const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 const ctx={console,URLSearchParams,setTimeout:fn=>{q.push(fn);return q.length;},clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},
  sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
  document:{querySelector:s=>s==='#root'?{innerHTML:'',addEventListener(){}}:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
  window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
 vm.createContext(ctx);
 vm.runInContext('Math.random=__rnd',Object.assign(ctx,{__rnd:rnd}));
 const files=['js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js',...(withGame?['experiments/pits-game.js']:[])];
 for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 return {run:x=>vm.runInContext(x,ctx),q};
}
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
test('a whole seeded bout plays out identically with and without the game layer',()=>{
 for(const seed of [7,42,1234,98765]){
  const bout=withGame=>{const a=arena(withGame,seed);
   a.run(`startRun();R=null;V.busy=false;for(const f of Object.values(S.fighters))f.kind='ai';beginEncounter();`);
   let n=0;while(a.q.length&&n++<5000){a.q.shift()();if(a.run("S.phase")!=='fight')break;a.run('render()');}
   return a.run('JSON.stringify({logs:S.logs.map(l=>l.title+"|"+l.body),hp:Object.values(S.fighters).map(f=>f.hp),phase:S.phase})');};
  const plain=bout(false),game=bout(true);
  assert.equal(game,plain,'seed '+seed);
 }
});
test('rolls and damage score Glory, Momentum and Marks without touching fight state',()=>{
 const a=arena(true,3);
 a.run(`startRun();R=null;V.busy=false;S.fighters.b.kind='human';S.phase='fight';`);
 const before=a.run('JSON.stringify(S.fighters)');
 a.run(`pitsGameOnRoll('a','Attack · Combat Style 60%',60,{roll:40,grade:2})`);
 assert.equal(a.run('PG.glory'),15,'10 × 1.5 at Momentum 1');assert.equal(a.run('PG.momentum'),1);assert.equal(a.run('PG.stats.attacks'),1);
 a.run(`pitsGameOnRoll('a','Attack · Combat Style 60%',60,{roll:4,grade:3})`);           // critical: Dead Eye (+20), then 25 × 2 at Momentum 2
 assert.equal(a.run('PG.owned.has("dead")'),true);assert.equal(a.run('PG.glory'),15+20+50);
 a.run(`pitsGameOnRoll('a','Attack · Combat Style 60%',60,{roll:64,grade:1})`);          // failure by 4: Near Thing, momentum resets
 assert.equal(a.run('PG.owned.has("near")'),true);assert.equal(a.run('PG.momentum'),0);
 a.run(`pitsGameOnRoll('a','Parry · 55%',55,{roll:30,grade:2})`);assert.equal(a.run('PG.owned.has("hold")'),true);
 a.run(`pitsGameOnRoll('b','Attack · Combat Style 60%',60,{roll:1,grade:3})`);            // the opponent's rolls don't score
 a.run(`log('Hit','x','hurt','',{impact:{target:'b',location:'Chest',hpLost:5}});pitsGameOnLogs()`);
 assert.equal(a.run('PG.owned.has("first")'),true);assert.equal(a.run('PG.stats.dealt'),5);
 assert.match(a.run('PG.moment.text'),/chest for 5 in round 1/);
 a.run(`log('Hit','x','hurt','',{impact:{target:'a',location:'Head',hpLost:3}});pitsGameOnLogs()`);assert.equal(a.run('PG.stats.taken'),3);
 assert.equal(a.run('JSON.stringify(S.fighters)'),before,'fight state unchanged');
});
test('the bout bar and recap label the layer as not rules',()=>{
 const a=arena(true,5);a.run(`startRun();R=null;V.busy=false;S.phase='fight';PG=null;`);
 assert.match(a.run('pitsBoutBarHtml()'),/for fun\. They never change a roll/);
 a.run('pitsGameState().recapOpen=true');assert.match(a.run('pitsRecapHtml()'),/for fun, not a rule/);
 assert.match(a.run('pitsRecapHtml()'),/data-pits="back"/);
});
test('the end recap waits for the replay and the Victory window (PUI-F02)',()=>{
 const a=arena(true,9);a.run(`startRun();R=null;V.busy=false;PG=null;pitsGameState();S.phase='between';S.showEndModal=true;`);
 assert.equal(a.run('pitsRecapHtml()'),'','hidden while the Victory window is up');
 a.run(`S.showEndModal=false;V.busy=true`);assert.equal(a.run('pitsRecapHtml()'),'','hidden while the replay runs');
 a.run(`V.busy=false`);assert.match(a.run('pitsRecapHtml()'),/Pit Marks and streaks/);
});
console.log(passed+' pits game tests passed');
