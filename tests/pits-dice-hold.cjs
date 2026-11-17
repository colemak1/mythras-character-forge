// The Pits: settled dice sit still long enough to read (owner, 2026-11-16: "once the dice are rolled they need to sit
// for a second so the person playing can process the roll"). Run: node tests/pits-dice-hold.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let now=1000;const timers=[];
const output={innerHTML:'',addEventListener(){}};
const ctx={console,URLSearchParams,setTimeout:(f,ms)=>{timers.push({f,at:now+(ms||0)});return timers.length;},clearTimeout(){},
 setInterval:()=>0,clearInterval(){},location:{search:''},sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
 document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
 window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
vm.createContext(ctx);
for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js'])
 vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const page=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8');
vm.runInContext(page.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
vm.runInContext('Date.now=()=>__now()',Object.assign(ctx,{__now:()=>now}));
const run=s=>vm.runInContext(s,ctx);
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};

function beats(){
 run(`{R=null;startRun();R=null;S.phase='fight';S.pending=null;V.quick=false;
  const e1={id:91001,title:'Ana attacks',body:'32 against Combat Style 60% — SUCCESS.',kind:'system'};
  const e2={id:91002,title:'No Damaging Hit',body:'The blow misses.',kind:'system'};
  S.logs=[e1,e2];V.events=[e1,e2];V.busy=true;V.step=0;V.visibleCount=0;V.awaitingContinue=false;}`);
}
test('a hold of at least a second after the dice settle',()=>{
 assert(run('DICE_HOLD_MS')>=1000);
 assert(run('DICE_HOLD_QUICK_MS')<run('DICE_HOLD_MS'),'Fast keeps it short');
});
test('settling the dice starts the hold (both when the result follows at once and when it does not)',()=>{
 const settle=page.slice(page.indexOf('function playDiceBeat'),page.indexOf('function rollMatchesResult'));
 assert(/V\.diceHoldUntil=Date\.now\(\)\+diceHoldMs\(\);\s*if\(rollMatchesResult/.test(settle));
});
test('nothing moves on while the dice are held; it moves on once the hold is over',()=>{
 beats();
 run('V.diceHoldUntil=Date.now()+DICE_HOLD_MS;advancePresentation();');
 assert.equal(run('V.step'),0,'held: still on the same beat');
 const t=timers[timers.length-1];
 assert.equal(t.at,now+run('DICE_HOLD_MS'),'it waits out the rest of the hold');
 now+=run('DICE_HOLD_MS');t.f();
 assert.equal(run('V.step'),1,'after the hold it advances');
});
test('Fast mode holds for less',()=>{
 beats();run('V.quick=true;V.diceHoldUntil=Date.now()+diceHoldMs();');
 assert.equal(run('V.diceHoldUntil')-now,run('DICE_HOLD_QUICK_MS'));
});
test('pressing Continue skips the hold',()=>{
 beats();run('V.diceHoldUntil=Date.now()+DICE_HOLD_MS;V.awaitingContinue=true;');
 run(`decoratedClick({target:{closest:()=>({dataset:{act:'continue'},tagName:'BUTTON',classList:{contains:()=>false}})}})`);
 assert.equal(run('V.step'),1);
});
test('the automatic continue at an action boundary still waits for the hold',()=>{
 beats();run('V.diceHoldUntil=Date.now()+DICE_HOLD_MS;V.awaitingContinue=true;continuePresentation();');
 assert.equal(run('V.step'),0);
});
console.log(passed+' dice hold tests passed');
