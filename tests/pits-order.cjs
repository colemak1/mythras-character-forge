// The Pits: the ordering gate (AGENTS.md, "Forwards, not backwards", rule 2; owner, 2026-11-18).
//
// Whole bouts are played on the cinematic stage's presentation layer (pitsStageArrange), with seeded dice and a seeded
// player who takes any button the page offers. Every log entry and every dice roll the engine produces is tagged, and
// the order the screen presents them in is checked:
//   - nothing is presented twice, and everything is presented by the end of the bout;
//   - dice are never shown after a log entry the engine produced after them (a blow is never drawn before the dice that
//     decide it: report 20261118-212902, "my guy moved before the disarm dice were rolled");
//   - log entries are presented in the engine's order;
//   - the bouts between them reach Disarm, Trip, Impale, a withdrawal and Damage Weapon (so the gate keeps covering them);
//   - the fight ends once, and every bout finishes (no stall).
// Before 2026-11-18 a Disarm moved its blow ahead of the Disarm's, the location's and the damage's dice: 34 of 120 bouts
// failed here.
//
// To add a fixed report: add its weapons and a seed that reaches the same situation to REPORTS below.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const {offered}=require('./pits-golden.cjs');
const lcg=seed=>{let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};};
const SCRIPTS=['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js',
 'experiments/pits-view.js','experiments/pits-game.js','experiments/pits-cine.js','experiments/pits-stage.js'];
const SOURCES=SCRIPTS.map(f=>[f,fs.readFileSync(path.join(root,f),'utf8')]);
const INLINE=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];

// any element the page asks to create: every property is there, every method returns another such element
const element=()=>new Proxy({style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},dataset:{},children:[]},
 {get:(t,k)=>k in t?t[k]:(typeof k==='string'?()=>element():undefined),set:(t,k,v)=>{t[k]=v;return true;}});

function arena(seed){
 const output={innerHTML:'',addEventListener(){}},timers=[];
 const ctx={console,URLSearchParams,JSON,setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},setInterval:()=>0,clearInterval(){},
  location:{search:'',pathname:'/experiments/practice-combat.html'},navigator:{userAgent:'test'},performance:{now:()=>0},
  sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},alert(){},
  document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null,
   addEventListener(){},scripts:[],createElement:()=>element()},
  matchMedia:()=>({matches:false}),requestAnimationFrame(){},__rnd:lcg(seed)};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext('Math.random=__rnd',ctx);
 for(const [f,src] of SOURCES)vm.runInContext(src,ctx,{filename:f});
 vm.runInContext(INLINE,ctx,{filename:'practice-combat-inline.js'});
 const run=x=>vm.runInContext(x,ctx);
 // the presentation's timers run at once, in order (the dice hold and the beats)
 const drain=()=>{let n=0;while(timers.length&&n++<10000)timers.shift()();};
 return {run,output,drain};
}
const fighter=(id,o)=>`Object.assign(mkFighter(${JSON.stringify(id)},${JSON.stringify(o.name)},${JSON.stringify(o.kind)},${o.style??65},`+
 `${JSON.stringify(o.weapon)},${o.armor??0},${o.evade??45},${o.level??3},${o.str??13},${o.siz??13},${JSON.stringify(o.shield??'none')},`+
 `${o.con??13},${o.dex??13},${o.int??13}),${JSON.stringify(o.extra||{})})`;
const click=(A,act,val)=>A.run(`decoratedClick({target:{closest:()=>({dataset:${JSON.stringify({act,val})},tagName:'BUTTON',classList:{contains:()=>false}})}})`);

function bout(spec){
 const A=arena(spec.seed),pick=lcg(spec.seed^0x9e3779b9);
 // tag every beat the engine produces (in order) and record the order the screen presents them in
 A.run(`(()=>{let n=0;const arrange=pitsStageArrange;window.__eng=[];window.__shown=[];
  pitsStageArrange=function(all){all.forEach(e=>{if(e.__k==null){e.__k=n++;window.__eng.push({k:e.__k,roll:!!e.roll,cp:!!e.checkpoint,
    title:e.title||(e.roll&&e.roll.label)||''});}});
   const r=arrange.apply(this,arguments);r.play.forEach(e=>window.__shown.push(e.__k));return r;};})()`);
 A.run(`startRun();R=null;V.busy=false;S.logs=[];S.logs.shift=()=>{};
  S.fighters={a:${fighter('a',spec.a)},b:${fighter('b',spec.b)}};beginEncounter();`);
 let steps=0;
 while(A.run('S.phase')==='fight'){
  A.drain();
  if(steps++>8000)return {stall:'the bout did not finish in 8000 steps'};
  if(A.run('V.busy')){A.run('V.diceHoldUntil=0;continuePresentation()');continue;}
  if(A.run('!!R')){click(A,'roll');continue;}
  A.run('render()');
  const options=offered(A.output.innerHTML);
  if(!options.length)return {stall:'nothing is offered while the fight goes on: '+A.run('JSON.stringify(S.pending)')};
  const real=options.filter(o=>o.act!=='yield'),pool=real.length?real:options;
  const attack=pool.find(o=>o.act==='attack');
  const choice=attack&&pick()<.55?attack:pool[Math.floor(pick()*pool.length)];
  click(A,choice.act,choice.val);
 }
 A.drain();
 return {eng:JSON.parse(A.run('JSON.stringify(__eng)')),shown:JSON.parse(A.run('JSON.stringify(__shown)'))};
}

// the faults of one bout, in words (empty: the bout is presented in order)
function faults(r){
 if(r.stall)return [r.stall];
 const bad=[],pos=new Map();
 r.shown.forEach((k,i)=>{if(pos.has(k))bad.push('presented twice: '+r.eng[k].title);pos.set(k,i);});
 for(const e of r.eng)if(!e.cp&&!pos.has(e.k))bad.push('never presented: '+e.title);
 const logs=r.eng.filter(e=>!e.roll&&!e.cp&&pos.has(e.k));
 for(let i=1;i<logs.length;i++)
  if(pos.get(logs[i].k)<pos.get(logs[i-1].k))
   bad.push(`log "${logs[i].title}" presented before the earlier "${logs[i-1].title}"`);
 for(let i=0;i<r.eng.length;i++){const d=r.eng[i];if(!d.roll||!pos.has(d.k))continue;
  const later=r.eng.slice(i+1).find(l=>!l.roll&&!l.cp&&pos.has(l.k)&&pos.get(l.k)<pos.get(d.k));
  if(later)bad.push(`dice "${d.title}" shown after the later "${later.title}"`);}
 const ends=r.eng.filter(e=>/^FIGHT ENDS/.test(e.title)).length;
 if(ends>1)bad.push('the fight ends '+ends+' times');
 return bad;
}

const WEAPONS=['sword','dagger','spear','longspear','longsword','battleaxe-2h','mace','rapier','trident','net','ball-chain','greatsword',
 'shortsword','whip','flail','military-flail','halberd-poleaxe','main-gauche'];
function spec(seed){
 return {seed,
  a:{name:'Goat',kind:'human',style:60+(seed%4)*13,weapon:WEAPONS[seed%WEAPONS.length],evade:48,shield:seed%5===0?'heater':'none'},
  b:{name:'Deserter',kind:seed%6===0?'human':'ai',style:55+(seed%3)*10,weapon:WEAPONS[(seed*7)%WEAPONS.length],evade:45,shield:seed%4===0?'buckler':'none'}};
}
// fixed reports, each with a seed that reaches its situation (the test also checks it still does)
const REPORTS=[
 {report:'20261118-212902 (an attacker\'s Disarm, then a hit: the hit was drawn before the location and damage dice)',
  spec:{...spec(1),a:{...spec(1).a,weapon:'dagger'},b:{...spec(1).b,weapon:'rapier'}},must:/^Disarm Opponent/},
];

let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
for(const {report,spec:s,must} of REPORTS)test('report '+report,()=>{
 const r=bout(s);assert(!r.stall,r.stall);
 assert(r.eng.some(e=>must.test(e.title)),'the seed no longer reaches the reported situation: pick another seed');
 assert.deepEqual(faults(r),[]);
});
const BOUTS=150;
const COVERS=[/^Disarm Opponent/,/^Trip Opponent/,/^Impaled Weapon/,/^Withdraw Impale/,/^Damage Weapon/];
test(`${BOUTS} seeded bouts are presented in order: no blow before its dice, nothing twice, one end, no stall`,()=>{
 const failed=[],seen=new Set();
 for(let seed=1;seed<=BOUTS;seed++){const r=bout(spec(seed)),f=faults(r);
  if(f.length)failed.push(`seed ${seed} (${spec(seed).a.weapon} v ${spec(seed).b.weapon}): ${f[0]}`);
  for(const e of r.eng||[])COVERS.forEach((c,i)=>{if(c.test(e.title))seen.add(i);});}
 assert.deepEqual(failed,[],failed.length+' of '+BOUTS+' bouts out of order');
 assert.deepEqual(COVERS.filter((c,i)=>!seen.has(i)).map(String),[],'the bouts no longer reach these: change the weapons or seeds');
});
// (the deck, not the page's older prompt that the bouts above click through: apart after a Knockback or a Disengage, the
// deck offered no way back in, so the fight could only be yielded; found by tests/visual/pits-smoke.cjs, 2026-11-19)
test('the deck offers a way back in when the fighters are apart, and recommends it',()=>{
 const A=arena(1);
 A.run(`startRun();R=null;V.busy=false;S.logs=[];S.fighters={a:${fighter('a',spec(1).a)},b:${fighter('b',spec(1).b)}};beginEncounter();`);
 const r=JSON.parse(A.run(`(()=>{S.phase='fight';S.pending=null;S.order=['a','b'];S.turnIndex=0;S.disengaged=true;S.gapMetres=2;S.fighters.a.ap=3;
   S.fighters.a.prone=false;const acts=pitsLegalActions('a');
   return JSON.stringify({re:acts.find(x=>x.act==='reengage')||null,rec:(pitsRecommendedAction('a')||{}).act,
    usable:acts.filter(x=>x.enabled&&!['delay','dither','yield','swapHand'].includes(x.act)).map(x=>x.act)});})()`));
 assert(r.re&&r.re.enabled,'Move to Engage is offered: '+JSON.stringify(r));
 assert.equal(r.rec,'reengage');
 assert(r.usable.length>0,'something other than waiting or yielding can be done');
});
test('the gate sees the fault it is for: a blow moved ahead of its dice fails',()=>{
 const r={eng:[{k:0,roll:true,title:'Hit Location · d20'},{k:1,roll:false,title:'Goat hits Head'}],shown:[1,0]};
 assert.match(faults(r).join(),/dice "Hit Location · d20" shown after the later "Goat hits Head"/);
});
console.log(passed+' Pits ordering gate tests passed');
module.exports={bout,faults,spec};
