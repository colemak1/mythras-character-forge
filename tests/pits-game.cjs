// The Pits game layer (experiments/pits-game.js) is presentation only:
// Sound and the hit shake follow the fight but must never change it.
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
 const files=['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js',...(withGame?['experiments/pits-game.js']:[])];
 for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 return {run:x=>vm.runInContext(x,ctx),q};
}
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
test('a whole seeded bout plays out identically with and without the feel layer',()=>{
 for(const seed of [7,42,1234,98765]){
  const bout=withGame=>{const a=arena(withGame,seed);
   a.run(`startRun();R=null;V.busy=false;for(const f of Object.values(S.fighters))f.kind='ai';beginEncounter();`);
   let n=0;while(a.q.length&&n++<5000){a.q.shift()();if(a.run("S.phase")!=='fight')break;a.run('render()');}
   return a.run('JSON.stringify({logs:S.logs.map(l=>l.title+"|"+l.body),hp:Object.values(S.fighters).map(f=>f.hp),phase:S.phase})');};
  const plain=bout(false),game=bout(true);
  assert.equal(game,plain,'seed '+seed);
 }
});
test('the scoring layer is gone: no Glory, Momentum, Pit Marks, streak or recap anywhere',()=>{
 const a=arena(true,5);a.run(`startRun();R=null;V.busy=false;S.phase='fight';PG=null;`);
 const bar=a.run('pitsBoutBarHtml()');
 assert.doesNotMatch(bar,/Glory|Momentum|Marks|for fun|streak/i);assert.match(bar,/data-pits="sound"/,'the sound switch stays');
 assert.equal(a.run('typeof pitsRecapHtml'),'undefined');assert.equal(a.run('typeof pitsEarn'),'undefined');
 const html=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8');
 assert.doesNotMatch(html,/result-streak|Pit Marks|win streak|streak \$\{/i);
});
test('hits still feed the hit shake and flash, and rolls never touch fight state',()=>{
 const a=arena(true,3);
 a.run(`startRun();R=null;V.busy=false;S.fighters.b.kind='human';S.phase='fight';`);
 const before=a.run('JSON.stringify(S.fighters)');
 a.run(`pitsGameOnRoll('a','Attack · Combat Style 60%',60,{roll:40,grade:2})`);
 a.run(`log('Hit','x','hurt','',{impact:{target:'b',location:'Chest',hpLost:5}});pitsGameOnLogs()`);
 assert.equal(a.run('JSON.stringify(PG.impacts)'),'[{"target":"b","loc":"Chest","lost":5}]');
 assert.equal(a.run('JSON.stringify(S.fighters)'),before,'fight state unchanged');
});
console.log(passed+' pits game tests passed');
