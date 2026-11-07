// The Pits view adapter (experiments/pits-view.js): engine state in, screen
// phase, legal options and fighter snapshot out. Read-only, no rules.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const output={innerHTML:'',addEventListener(){}};
const ctx={console,URLSearchParams,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},
 sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
 document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
 window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
vm.createContext(ctx);
for(const f of ['js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run(`JSON.stringify(${s})`));
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
function setup(){
 run(`(()=>{startRun();R=null;V.busy=false;const a=S.fighters.a,b=S.fighters.b;
  for(const f of [a,b]){f.weapon='sword';f.shield='none';f.weaponGuard=null;ensureEffectState(f);f.ap=2;f.apMax=2;f.prone=false;f.disarmed=false;f.braced=false;f.stunnedLocations={};f.skipAttack=0;f.pressedTurns=0;f.overextendedTurns=0;}
  S.phase='fight';S.pending=null;S.order=['a','b'];S.turnIndex=0;S.disengaged=false;S.engagement='equal';S.tie=null;})()`);
}
const acts=id=>Object.fromEntries(json(`pitsLegalActions('${id}')`).map(a=>[a.act,a]));
test('phase follows the engine: your action, opponent, reaction, effects, resist, recap',()=>{
 setup();assert.equal(run('pitsPhase()'),'action');
 run(`S.turnIndex=1`);assert.equal(run('pitsPhase()'),'opponent','computer opponent acting');
 run(`S.turnIndex=0;S.pending={kind:'reaction',atk:'b',def:'a'}`);assert.equal(run('pitsPhase()'),'reaction');
 run(`S.pending={kind:'reaction',atk:'a',def:'b'}`);assert.equal(run('pitsPhase()'),'opponent','the computer defends');
 run(`S.pending={kind:'effect',owner:'a',other:'b',atk:'a'}`);assert.equal(run('pitsPhase()'),'effects');
 run(`S.pending={kind:'tripResistChoice',owner:'b',other:'a'}`);assert.equal(run('pitsPhase()'),'resist');
 run(`S.pending=null;R={actor:'a',label:'Attack · Combat Style 60%',defs:[{sides:100}]}`);assert.equal(run('pitsPhase()'),'rolling');
 run(`R=null;S.phase='over'`);assert.equal(run('pitsPhase()'),'recap');
});
test('legal actions: AP costs, and disabled options say why',()=>{
 setup();let a=acts('a');
 assert.equal(a.attack.enabled,true);assert.equal(a.attack.ap,1);assert.equal(a.delay.ap,0);
 assert.equal(a.stand.enabled,false);assert.equal(a.stand.reason,'Not prone');
 assert.equal(a.changeRange.reason,'No reach to contest','equal reach');
 run(`S.fighters.a.ap=0`);a=acts('a');
 assert.equal(a.attack.reason,'Needs 1 AP');assert.equal(a.brace.reason,'Needs 1 AP');assert.equal(a.delay.enabled,true);
 setup();run(`S.fighters.a.skipAttack=2`);assert.equal(acts('a').attack.reason,'Stunned or pressed');
 setup();run(`S.fighters.a.prone=true`);assert.equal(acts('a').stand.enabled,true);
});
test('legal actions match the buttons the engine renders (same acts, same enabled state)',()=>{
 setup();run(`S.fighters.a.prone=true;S.fighters.a.shield='buckler';render()`);
 const html=output.innerHTML;
 for(const x of json(`pitsLegalActions('a')`)){
  const m=new RegExp(`<button[^>]*data-act="${x.act}"[^>]*>`).exec(html);
  assert(m,`${x.act} is rendered`);
  assert.equal(/\bdisabled\b/.test(m[0]),!x.enabled,`${x.act}: enabled ${x.enabled}`);
 }
});
test('snapshot: both fighters with weapon Size/Reach, locations, wounds and skills',()=>{
 setup();run(`S.fighters.b.hp.Chest=-1`);
 const s=json('pitsSnapshot()');
 assert.equal(s.phase,'action');assert.equal(s.range,'even');
 assert.equal(s.fighters.a.weapon,'Broadsword');assert.equal(s.fighters.a.size,'Medium');assert.equal(s.fighters.a.reach,'Medium');
 assert.equal(s.fighters.a.locations.length,7);
 assert.equal(s.fighters.b.locations.find(l=>l.loc==='Chest').wound,'serious');
 assert.ok('acrobatics' in s.fighters.a.skills);
});
console.log(passed+' pits view tests passed');
