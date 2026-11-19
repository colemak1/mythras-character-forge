// The deck's odds match what the engine does (wide audit 2026-11-16, docs/pits-wide-audit-20261116.md, items 2 and 3;
// found in #360, ledger "Findings from old PRs"). An Evade gets out of the way only when it beats the attack roll
// (opposed, Core pp.50, 103); the attack preview lists only defences the foe could really make.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const output={innerHTML:'',addEventListener(){}};
const ctx={console,URLSearchParams,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},
 sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
 document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){}},
 window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
ctx.matchMedia=ctx.window.matchMedia;
vm.createContext(ctx);
for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js','experiments/pits-game.js','experiments/pits-stage.js','experiments/pits-arena.js','experiments/pits-bottom.js'])
 vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const run=s=>vm.runInContext(s,ctx);
run(`(()=>{startRun();R=null;V.busy=false;const a=S.fighters.a,b=S.fighters.b;
 for(const f of [a,b]){f.weapon='sword';f.shield='none';f.weaponGuard=null;ensureEffectState(f);f.ap=2;f.apMax=2;f.prone=false;f.disarmed=false;f.braced=false;
  f.stunnedLocations={};f.skipAttack=0;f.pressedTurns=0;f.overextendedTurns=0;f.fatigue=0;f.impaledWounds=[];f.entangled=null;f.blindedTurns=0;f.style=70;f.evade=60;f.brawn=40;f.acrobatics=0;f.endurance=55;f.willpower=45;}
 b.kind='human';S.mode='pvp';S.phase='fight';S.pending=null;S.order=['a','b'];S.turnIndex=0;S.disengaged=false;S.engagement='equal';S.tie=null;})()`);
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const big=h=>+/<div class="bbig"><strong>(\d+)%<\/strong>/.exec(h)[1];

test('Evade odds count only rolls that beat the attack (the audit\'s case: attack 57 on 70%, Evade 60%: 9%, not 60%)',()=>{
 const ev=run(`evadeTarget(S.fighters.b)`);
 const at=run(`JSON.stringify(rollSkill(70,57))`);
 run(`S.pending={kind:'reaction',atk:'a',def:'b',attackTarget:70,attackRoll:${at},reaction:'none',defenseRoll:null,owner:null,other:null,effectsLeft:0}`);
 const h=run(`pbDefenceOdds({val:'evade',pct:${ev},ap:1},{p:S.pending,me:S.fighters.b})`);
 let want=0;for(let v=1;v<=100;v++)if(run(`opposedBetter(rollSkill(${ev},${v}),${at})`))want++;
 assert.equal(big(h),want,'the headline is the engine\'s own count');
 if(ev===60)assert.equal(want,9,'01–06 and 58–60');
 assert.ok(big(h)<ev,'less than the bare skill');
 assert.match(h,/must beat their roll/);assert.match(h,/prone/);
});
test('a parry still counts any success (a successful parry blocks whatever the attack\'s grade)',()=>{
 const h=run(`pbDefenceOdds({val:'parry',pct:60,ap:1},{p:S.pending,me:S.fighters.b})`);
 assert.equal(big(h),run(`pbGrades(60).success+pbGrades(60).critical`));
});
test('skills over 100% are reduced before the Evade is counted, as react() does (Core p.51)',()=>{
 const at=run(`JSON.stringify(Object.assign(rollSkill(130,57),{effectiveTarget:130}))`);
 run(`S.pending.attackTarget=130;S.pending.attackRoll=${at}`);
 const h=run(`pbDefenceOdds({val:'evade',pct:60,ap:1},{p:S.pending,me:S.fighters.b})`);
 let want=0;const atk=run(`JSON.stringify(rollSkill(100,57))`);
 for(let v=1;v<=100;v++)if(run(`opposedBetter(rollSkill(30,${v}),${atk})`))want++;
 assert.equal(big(h),want);assert.match(h,/30% after the over-100% reduction/);
 run(`S.pending=null`);
});
test('the attack preview does not offer defences a foe with no AP cannot make',()=>{
 run(`S.fighters.b.ap=0`);
 const c=run(`pbCtx()`);
 const h=run(`pbActionInfo('attack',pbCtx())`);
 assert.match(h,/no AP left to defend/);assert.doesNotMatch(h,/can then parry|evade \(/);
 run(`S.fighters.b.ap=2`);
 assert.match(run(`pbActionInfo('attack',pbCtx())`),/can then parry \(\d+%\), evade \(\d+%\) or not defend/);
});
test('the attack preview leaves out a parry the foe cannot make (a disarmed foe, a shield it cannot use)',()=>{
 run(`S.fighters.b.shield='heater'`);
 const before=run(`pbActionInfo('attack',pbCtx())`);
 const usable=JSON.parse(run(`JSON.stringify(pbDefences('b',false).filter(d=>d.usable).map(d=>d.val))`));
 for(const v of ['parry','shield','evade'])assert.equal(new RegExp('\\b'+v+' \\(').test(before),usable.includes(v),v);
 run(`S.fighters.b.shield='none'`);
});
console.log(`${passed} passed`);
