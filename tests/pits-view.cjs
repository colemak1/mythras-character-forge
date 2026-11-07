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
for(const f of ['js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js','experiments/pits-ranged.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
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
test('roll bands come from the engine grading: crit, auto-success 01–05, auto-fail 96–98, fumbles',()=>{
 const b=pct=>json(`pitsRollBands(${pct})`).map(x=>[x.kind,x.from,x.to]);
 assert.deepEqual(b(67),[['critical',1,7],['success',8,67],['failure',68,98],['fumble',99,100]]);
 assert.deepEqual(b(3),[['critical',1,1],['success',2,5],['failure',6,98],['fumble',99,100]],'01–05 always succeed');
 assert.deepEqual(b(120),[['critical',1,12],['success',13,95],['failure',96,99],['fumble',100,100]],'over 100: only 00 fumbles');
 assert.match(run('pitsOddsText(67)'),/<b>67%<\/b> to succeed · .*7% critical.*2% fumble/);
});
test('the readout shows the latest skill roll; odds come from the option the player would roll',()=>{
 setup();assert.match(run('pitsReadoutHtml()'),/No roll yet this bout/);
 run(`requestSkill('a',60,'Attack · Combat Style 60%',()=>{});R.callback([42])`);
 assert.match(run('pitsReadoutHtml()'),/Attack: <b>42<\/b> against 60% — <span class="o-success">Success/);
 assert.equal(run(`pitsOddsFor('attack')`),run('combatTarget(S.fighters.a)'));
 run(`S.pending={kind:'reaction',atk:'b',def:'a'}`);assert.equal(run(`pitsOddsFor('react','evade')`),run('evadeTarget(S.fighters.a)'));
});
test('during a replay the pill and Last roll follow the beat on screen, not the live state (PUI-F02)',()=>{
 setup();
 run(`V.skillBefore={actor:'a',name:'A',what:'Attack',pct:60,roll:40,grade:2};
  V.lastSkillRoll={actor:'b',name:'B',what:'Attack',pct:45,roll:92,grade:1};
  V.busy=true;V.step=0;V.roll={actor:'a',settled:false};
  V.events=[{roll:{actor:'a',skill:{actor:'a',name:'A',what:'Initiative',pct:0,roll:4,grade:2}}},{roll:{actor:'b',skill:V.lastSkillRoll}}];`);
 assert.equal(run('pitsShownSkillRoll().roll'),40,'still the roll from before this replay');
 assert.equal(run('pitsPhase()'),'rolling','the human is rolling on screen');
 run(`V.roll.settled=true`);assert.equal(run('pitsShownSkillRoll().roll'),4,'the settled beat on screen');
 run(`V.step=1;V.roll={actor:'b',settled:false}`);
 assert.equal(run('pitsShownSkillRoll().roll'),4,'later foe roll not revealed yet');assert.equal(run('pitsPhase()'),'opponent');
 run(`V.roll.settled=true`);assert.equal(run('pitsShownSkillRoll().roll'),92);
 run(`V.busy=false;V.roll=null`);assert.equal(run('pitsShownSkillRoll().roll'),92);
});
console.log(passed+' pits view tests passed');
