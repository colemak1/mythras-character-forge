// The Pits: difficulty grades do not add up; the hardest applies (Core p.38, with pp.101, 110; ChatGPT (Chat) from the
// page, PR #336, 2026-11-14). Built 2026-11-19.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function arena(){
 const output={innerHTML:'',addEventListener(){}};
 const ctx={console,URLSearchParams,JSON,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:'',pathname:'/experiments/practice-combat.html'},
  navigator:{userAgent:'test'},sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},alert(){},
  document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},scripts:[]},
  matchMedia:()=>({matches:false}),requestAnimationFrame(){},__psRecord:[]};
 ctx.window=ctx;
 vm.createContext(ctx);
 for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js',
  'experiments/pits-game.js','experiments/pits-stage.js','experiments/pits-arena.js','experiments/pits-bottom.js','experiments/pits-report.js','experiments/pits-lost.js'])
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 const run=s=>vm.runInContext(s,ctx);
 run(`(()=>{startRun();R=null;V.busy=false;const a=S.fighters.a,b=S.fighters.b;a.name='Kethan Voss';b.name='Border Deserter';
  for(const f of [a,b]){f.weapon='sword';f.shield='none';f.weaponGuard=null;ensureEffectState(f);f.ap=2;f.apMax=2;f.prone=false;f.disarmed=false;
   f.stunnedLocations={};f.skipAttack=0;f.pressedTurns=0;f.overextendedTurns=0;f.fatigue=0;f.impaledWounds=[];f.entangled=null;f.blindedTurns=0;}
  S.phase='fight';S.pending=null;S.order=['a','b'];S.turnIndex=0;S.round=1;S.cycle=1;S.disengaged=false;S.engagement='equal';})()`);
 ctx.document.body={dataset:{bottom:'E'},classList:{contains:()=>false}};
 return {run,ctx};
}
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const A=arena();
const reset=`(()=>{const f=S.fighters.a;f.style=80;f.evade=60;f.prone=false;f.fatigue=0;f.impaledWounds=[];f.entangled=null;f.blindedTurns=0;
  for(const l of Object.keys(f.hp))f.hp[l]=f.maxHp[l];f.ap=2;})()`;

// the percentage a real defence is rolled at (what the dice are thrown against)
const rolledDefence=(action)=>JSON.parse(A.run(`(()=>{const a=S.fighters.a,b=S.fighters.b;b.ap=2;a.ap=2;
  S.pending={kind:'reaction',atk:'b',def:'a',attackTarget:60,attackRoll:{roll:30,grade:2,label:'SUCCESS',name:'success'},reaction:'none',
   defenseRoll:null,owner:null,other:null,effectsLeft:0};let seen=null;const keep=requestDice;
  requestDice=(actor,defs,label,cb)=>{if(seen==null)seen=NEXT_PCT;throw 'stop';};
  try{react('${action}');}catch(e){}requestDice=keep;return JSON.stringify(seen);})()`));
test('prone (Formidable) and Wearied (Formidable): the parry and evade are rolled at Formidable, not a quarter',()=>{
 A.run(reset);A.run(`S.fighters.a.prone=true;S.fighters.a.fatigue=3;`);
 assert.equal(rolledDefence('parry'),40,'80% at Formidable is 40% (it was 20%)');
 A.run(reset);A.run(`S.fighters.a.prone=true;S.fighters.a.fatigue=3;`);
 assert.equal(rolledDefence('evade'),30,'60% at Formidable is 30% (it was 15%)');
});
test('Winded (Hard) and prone (Formidable): rolled at the harder, Formidable',()=>{
 A.run(reset);A.run(`S.fighters.a.prone=true;S.fighters.a.fatigue=1;`);
 assert.equal(rolledDefence('parry'),40);
});
test('Fatigue and an entangled torso: the harder applies, not both',()=>{
 A.run(reset);A.run(`S.fighters.a.fatigue=1;S.fighters.a.entangled={loc:'Chest',by:'b'};`);
 assert.equal(A.run('generalGradeSteps(S.fighters.a)'),1,'Hard and Hard is Hard');
 assert.equal(A.run('effectiveSkill(S.fighters.a,60)'),40);
});
test('two seriously wounded (still usable) legs: Evade is Hard, not Formidable',()=>{
 A.run(reset);A.run(`(()=>{const f=S.fighters.a;f.hp['Right Leg']=-1;})()`);
 assert.equal(A.run('evadeTarget(S.fighters.a)'),40,'one leg: Hard');
 A.run(`S.fighters.a.hp['Left Leg']=-1`);
 assert.equal(A.run('evadeTarget(S.fighters.a)'),40,'two legs: still Hard');
});
test('a target already graded is rolled at that percentage, not graded again',()=>{
 A.run(reset);A.run(`S.fighters.a.fatigue=3;`);
 const got=JSON.parse(A.run(`(()=>{let seen=null;const keep=requestDice;requestDice=(actor,defs,label,cb)=>{seen=NEXT_PCT;cb([99]);};
   requestGradedSkill('a',combatTarget(S.fighters.a),'Attack',()=>{});requestDice=keep;return JSON.stringify(seen);})()`));
 assert.equal(got,40,'Wearied once: 40%, not 20%');
});
test('a Hopeless defence (0%) is not offered, and is not rolled if asked for',()=>{
 A.run(reset);A.run(`S.fighters.a.style=0;`);
 const parry=JSON.parse(A.run(`JSON.stringify(pbDefences('a',true).find(d=>d.val==='parry'))`));
 assert(!parry.usable&&/Hopeless/.test(parry.why),'not offered: '+JSON.stringify(parry));
 const r=JSON.parse(A.run(`(()=>{const a=S.fighters.a,b=S.fighters.b;b.ap=2;a.ap=2;
   S.pending={kind:'reaction',atk:'b',def:'a',attackTarget:60,attackRoll:{roll:30,grade:2,label:'SUCCESS',name:'success'},reaction:'none',
    defenseRoll:null,owner:null,other:null,effectsLeft:0};let rolled=false;const keep=requestDice;requestDice=(actor,defs,label,cb)=>{rolled=true;cb([50]);};
   try{react('parry');}catch(e){}requestDice=keep;return JSON.stringify({rolled,ap:a.ap,reaction:S.pending?S.pending.reaction:'done'});})()`));
 assert.equal(r.ap,2,'no AP spent: '+JSON.stringify(r));
});
console.log(passed+' Pits grade tests passed');
