// The Pits: tied Initiative acts concurrently (Core p.90; PIT-P02 cases in
// docs/the-pits-combat-procedure-review.md). Both fighters are player
// controlled, so nothing is decided by random dice.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const output={innerHTML:'',addEventListener(){}};
const ctx={console,URLSearchParams,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},
 sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
 document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
 window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
vm.createContext(ctx);
for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const run=s=>vm.runInContext(s,ctx);
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const logs=()=>JSON.parse(run('JSON.stringify(S.logs.map(l=>l.title+" :: "+l.body))'));
// Fighters with fixed Initiative parts; nothing pending; start of a cycle.
function setup(a,b){
 run(`(()=>{startRun();R=null;V.busy=false;const A=S.fighters.a,B=S.fighters.b;B.kind='human';
  for(const f of [A,B]){f.weapon='sword';f.weaponGuard=null;ensureEffectState(f);f.armourInitPenalty=0;f.fatigue=0;f.ap=3;f.apMax=3;f.prone=false;f.disarmed=false;f.exertionRounds=0;f.con=13;
   for(const l of HIT_LOCS){f.hp[l]=100;f.maxHp[l]=100;}}
  A.initRoll=${a[0]};A.init=${a[1]};B.initRoll=${b[0]};B.init=${b[1]};
  for(const f of [A,B])f.initiative=f.initRoll+f.init-f.armourInitPenalty-fatigueInitLoss(f);
  S.order=A.initiative>=B.initiative?['a','b']:['b','a'];
  S.phase='fight';S.pending=null;S.round=1;S.cycle=1;S.turnIndex=0;S.tie=null;S.disengaged=false;S.gapMetres=0;S.logs=[];})()`);
}
test('equal final totals tie even with different d10 faces, and act concurrently (P02-01)',()=>{
 setup([5,10],[7,8]);                                 // 15 and 15
 run('advance()');
 assert.equal(run('S.tie&&S.tie.key'),'1:1:1');
 assert(logs().some(l=>/^Tied Initiative :: .*both have Initiative 15, so they act concurrently/.test(l)),logs().join('\n'));
});
test('the same d10 face with different totals is not a tie: the higher total acts first (P02-03)',()=>{
 setup([5,8],[5,10]);                                 // 13 and 15
 run('advance()');
 assert.equal(run('S.tie'),null);assert.deepEqual(JSON.parse(run('JSON.stringify(S.order)')),['b','a']);
});
test('what the first tied fighter does cannot stop the second one\'s action that cycle; it lands right after (P02-02, P02-04)',()=>{
 setup([5,10],[7,8]);run('advance()');
 assert.equal(run('S.order[0]'),'a','cycle 1: A declares first (arena convention)');
 // During A's turn A trips, stuns, disarms, entangles and presses B.
 run(`(()=>{const B=S.fighters.b;B.prone=true;B.skipAttack=3;B.disarmed=true;B.pressedTurns=1;B.entangled={loc:'Right Arm',by:'a',origin:{grade:2,roll:20,label:'Success'}};B.ap=2;})()`);
 run('S.turnIndex=1;grantConcurrentTurn("b")');
 assert.equal(run('S.fighters.b.prone'),false);assert.equal(run('S.fighters.b.disarmed'),false);
 assert.equal(run('S.fighters.b.entangled'),null);assert.equal(run('canMakeAttack(S.fighters.b)'),true,'B may still attack this cycle');
 assert.equal(run('S.fighters.b.ap'),2,'AP B spent reacting stays spent');
 // B's turn ends; A's effects now apply.
 run('advanceStun(S.fighters.b);S.turnIndex=2;finishConcurrentCycle()');
 assert.equal(run('S.fighters.b.prone'),true);assert.equal(run('S.fighters.b.disarmed'),true);
 assert.equal(run('S.fighters.b.skipAttack'),3,'the stun starts after the concurrent action');
 assert.equal(run('S.fighters.b.entangled.loc'),'Right Arm');assert.equal(run('S.tie'),null);
});
test('a reaction that helped the second fighter during the first turn is kept (Arise during a parry)',()=>{
 setup([5,10],[7,8]);run('S.fighters.b.prone=true;advance()');
 run('S.fighters.b.prone=false;S.turnIndex=1;grantConcurrentTurn("b")');
 assert.equal(run('S.fighters.b.prone'),false);
 run('S.turnIndex=2;finishConcurrentCycle()');assert.equal(run('S.fighters.b.prone'),false);
});
test('a defeat in the first tied turn waits for the second fighter\'s action; both falling is a draw (P02-04)',()=>{
 setup([5,10],[7,8]);run('advance()');
 run(`S.pending={kind:'resolving'};endFight('a','Second dies immediately from a Major Wound to Head.')`);
 assert.equal(run('S.phase'),'fight','the bout is not over yet');assert.equal(run('S.turnIndex'),1);
 assert(logs().some(l=>/^Falling :: .*concurrent action this cycle still happens first/.test(l)),logs().join('\n'));
 assert.equal(run('S.tie.granted'),true,'B gets the concurrent turn');
 run(`S.pending={kind:'resolving'};endAction()`);         // B's action ends without felling A
 assert.notEqual(run('S.phase'),'fight');assert.equal(run('S.winnerId'),'a');
 // Mutual: B fells A during the concurrent turn.
 setup([5,10],[7,8]);run('advance()');
 run(`S.pending={kind:'resolving'};endFight('a','B falls.')`);
 run(`endFight('b','A falls.')`);
 assert.equal(run('S.phase'),'over');assert.equal(run('S.winnerId'),null);assert.match(run('S.endReason'),/Both fighters fall in the same concurrent exchange/);
});
test('ties alternate the declaring fighter each cycle (P02-05)',()=>{
 setup([5,10],[7,8]);run('S.cycle=2;advance()');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.order)')),['b','a']);assert.equal(run('S.tie.second'),'a');
});
test('later rounds keep the original d10s; a tie formed by a Fatigue penalty acts concurrently; a broken tie does not (P02-06–08)',()=>{
 setup([5,10],[5,12]);                                // 15 and 17
 run(`S.fighters.b.fatigue=3;S.fighters.a.ap=0;S.fighters.b.ap=0;S.turnIndex=2;finishCombatRound()`);
 assert.equal(run('S.round'),2);assert.equal(run('S.fighters.b.initRoll'),5,'no new d10');
 assert.equal(run('S.fighters.b.initiative'),15,'17 − 2 Fatigue');assert.equal(run('S.tie&&S.tie.key'),'1:2:1');
 setup([5,10],[5,12]);
 run(`S.fighters.a.fatigue=3;S.fighters.a.ap=0;S.fighters.b.ap=0;S.turnIndex=2;finishCombatRound()`);
 assert.equal(run('S.tie'),null);assert.deepEqual(JSON.parse(run('JSON.stringify(S.order)')),['b','a'],'13 vs 17: higher first');
});
console.log(passed+' practice initiative tests passed');
