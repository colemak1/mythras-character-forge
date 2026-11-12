// The Pits: golden bouts. Complete fights are played with Math.random
// replaced by a seeded generator; a player-controlled fighter answers every
// prompt and picks among the buttons the page offers from a second seeded
// stream. The whole log and the final state are compared with the fixtures in
// tests/fixtures/pits-golden.json, so a refactor of the combat rules that
// changes any roll, number or sentence fails here.
//
// Regenerate (only for an intended rules or wording change, never to get a
// refactor passing):   node tests/pits-golden.cjs --update
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const fixturePath=path.join(__dirname,'fixtures','pits-golden.json');
const SCRIPTS=['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js'];
const lcg=seed=>{let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};};

function arena(seed){
 const output={innerHTML:'',addEventListener(){}};
 const ctx={console,URLSearchParams,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},
  sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
  document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
  window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
 vm.createContext(ctx);
 vm.runInContext('Math.random=__rnd',Object.assign(ctx,{__rnd:lcg(seed)}));
 for(const f of SCRIPTS)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx,{filename:'practice-combat-inline.js'});
 return {run:x=>vm.runInContext(x,ctx),output};
}

// mkFighter(id,name,kind,style,weapon,armor,evade,level,str,siz,shield,con,dex,int)
const fighter=(id,o)=>`Object.assign(mkFighter(${JSON.stringify(id)},${JSON.stringify(o.name)},${JSON.stringify(o.kind)},${o.style??65},${JSON.stringify(o.weapon)},${o.armor??0},${o.evade??45},${o.level??3},${o.str??13},${o.siz??13},${JSON.stringify(o.shield??'none')},${o.con??13},${o.dex??13},${o.int??13}),${JSON.stringify(o.extra||{})})`;

// Buttons the page offers for a fight decision, read from the rendered HTML.
const SKIP=new Set(['swapHand','mode','lbmode','start','beginFight','reset','retry','next','dismissResult','openAid','selectloc','guidance','speed','help','togglelog','continue','skip','roll','rest','fieldAid','ward','wardloc','saveward','clearward']);
function offered(html){
 const out=[],seen=new Set();
 for(const m of html.matchAll(/<[a-z]+\b([^<>]*\bdata-act="([^"]+)"[^<>]*)>/g)){
  const attrs=m[1],act=m[2];
  if(SKIP.has(act)||/\sdisabled(?=[\s=]|$)/.test(' '+attrs))continue;
  const val=(/\bdata-val="([^"]*)"/.exec(attrs)||[])[1];
  const key=act+'\u0000'+(val??'');
  if(!seen.has(key)){seen.add(key);out.push({act,val});}
 }
 return out;
}

function playBout(spec){
 const a=arena(spec.seed),pick=lcg(spec.seed^0x9e3779b9),decisions=[];
 a.run(`startRun();R=null;V.busy=false;S.logs=[];S.logs.shift=()=>{};
  S.fighters={a:${fighter('a',spec.a)},b:${fighter('b',spec.b)}};beginEncounter();`);
 let steps=0;
 while(a.run('S.phase')==='fight'){
  assert(steps++<6000,spec.name+': bout did not finish');
  if(a.run('!!R')){a.run('performManualRoll()');continue;}
  a.run('render()');
  const options=offered(a.output.innerHTML);
  assert(options.length,spec.name+': no decision is offered, yet the fight is not over\n'+a.run('JSON.stringify(S.pending)'));
  // A player who can attack usually does; everything else is picked evenly.
  // Conceding is taken only when nothing else is offered.
  const real=options.filter(o=>o.act!=='yield'),pool=real.length?real:options;
  const attack=pool.find(o=>o.act==='attack');
  const choice=attack&&pick()<.55?attack:pool[Math.floor(pick()*pool.length)];
  decisions.push(choice.act+(choice.val==null?'':':'+choice.val));
  a.run(`handleClick({target:{closest:()=>({dataset:${JSON.stringify({act:choice.act,val:choice.val})},tagName:'BUTTON',classList:{contains:()=>false}})}})`);
 }
 const logs=JSON.parse(a.run(`JSON.stringify(S.logs.map(l=>[l.round+'.'+l.cycle,l.kind,l.title,l.body,l.detail||''].join(' | ')))`));
 const views=a.run('JSON.stringify(S.logs.map(l=>[l.meta,l.view]))');
 return {name:spec.name,seed:spec.seed,logs,decisions:decisions.join(' '),
  stateHash:crypto.createHash('sha256').update(views).digest('hex').slice(0,16),
  end:JSON.parse(a.run(`JSON.stringify({phase:S.phase,winner:S.winner,winnerId:S.winnerId??null,endReason:S.endReason,finalCause:S.finalCause??null,round:S.round,
   hp:{a:S.fighters.a.hp,b:S.fighters.b.hp},fatigue:{a:S.fighters.a.fatigue,b:S.fighters.b.fatigue},
   armour:{a:S.fighters.a.armourLocations,b:S.fighters.b.armourLocations},weaponGuard:{a:S.fighters.a.weaponGuard,b:S.fighters.b.weaponGuard}})`))};
}

// Each bout names what it must show, so the fixtures keep covering the rules
// the brief lists (docs/brief-combat-engine.md).
const BOUTS=require('./fixtures/pits-golden-bouts.cjs');
module.exports={playBout,arena,offered,BOUTS};
if(require.main!==module)return;

const played=BOUTS.map(playBout);
if(process.argv.includes('--update')){
 fs.writeFileSync(fixturePath,JSON.stringify(played,null,1)+'\n');
 console.log('Wrote '+played.length+' golden bouts ('+played.reduce((n,b)=>n+b.logs.length,0)+' log entries).');
}
const golden=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
assert.equal(golden.length,BOUTS.length,'one fixture per bout');
BOUTS.forEach((spec,i)=>{
 test(`golden bout "${spec.name}" (seed ${spec.seed}) is unchanged: ${golden[i].logs.length} log entries`,()=>{
  const now=played[i],was=golden[i];
  assert.equal(now.decisions,was.decisions,'the same decisions were offered and taken');
  now.logs.forEach((line,n)=>assert.equal(line,was.logs[n],`log entry ${n+1}`));
  assert.equal(now.logs.length,was.logs.length,'log length');
  assert.deepEqual(now.end,was.end,'final state');
  assert.equal(now.stateHash,was.stateHash,'dice shown and fighter state after every log entry');
 });
 test(`golden bout "${spec.name}" covers ${spec.covers.length} required rule${spec.covers.length===1?'':'s'}`,()=>{
  for(const [what,pattern] of spec.covers)assert(golden[i].logs.some(l=>pattern.test(l)),what+' missing from the fixture');
 });
});
test('a bout is deterministic: the same seed plays the same fight twice',()=>{
 assert.deepEqual(playBout(BOUTS[0]),played[0]);
});
console.log(passed+' Pits golden bout tests passed');
