// Subsystem 6, Batch 1 (docs/magic-cases-batch-1.md): Folk Magic and general
// magic cases the app calculates. Run with `node tests/magic-folk-cases.cjs`.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setTimeout,clearTimeout,setInterval,clearInterval,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
const test=(name,fn)=>{fn();console.log('PASS '+name);};
// A Folk Magic caster at 50%: critical 01–05, success to 50, fumble 99–00.
const setup=mp=>run('S=freshState();S.magic.folk=[{name:"Light",spec:""}];S.play.magic='+mp+';render=()=>{};viewOnlyBlock=()=>false;playCurMagic=()=>S.play.magic;playMaxMagic=()=>12;'
 +'magicSkillKey=()=>"prof:Folk Magic";finalPct=()=>50;gradedPct=()=>({pct:50,grade:"standard"});');
// d100 and d(n) are constants built on Math.random, so queue the dice instead.
const dice=values=>run('var __q='+JSON.stringify(values)+';Math.random=()=>{if(!__q.length)throw new Error("unexpected roll");return __q.shift();};');
const face=(value,sides)=>(value-1)/sides+0.0001;
const cast=(roll,fumbleDie=3)=>{dice([face(roll,100),face(fumbleDie,3)]);run('APP.castMagic(0)');return run('S.rollLog[0]');};
const why=()=>run("PM_MSG");

test('FM-009 critical success works and costs no MP',()=>{
 setup(10);const log=cast(3);assert.equal(log.tier,'Critical');assert.match(log.magic,/^cast/);assert.equal(run('S.play.magic'),10);
});
test('FM-010 success works and costs 1 MP',()=>{
 setup(10);const log=cast(30);assert.equal(log.tier,'Success');assert.match(log.magic,/^cast/);assert.equal(run('S.play.magic'),9);
});
test('FM-011 failure does not work and still costs 1 MP',()=>{
 setup(10);const log=cast(80);assert.equal(log.tier,'Failure');assert.match(log.magic,/^failed/);assert.equal(run('S.play.magic'),9);
});
test('FM-012 fumble fails and costs 1d3 MP',()=>{
 for(const die of [1,2,3]){setup(10);const log=cast(100,die);assert.equal(log.tier,'Fumble');assert.match(log.magic,/^failed/);assert.equal(run('S.play.magic'),10-die);}
});
test('FM-012 a fumble never takes more MP than the caster has',()=>{
 setup(2);cast(100,3);assert.equal(run('S.play.magic'),0);
});
test('MG-021 at 0 MP no Folk Magic roll is made and nothing else happens',()=>{
 setup(0);dice([]);run('APP.castMagic(0)');
 assert.match(run('PM_MSG'),/Not enough Magic Points/);assert.equal(run('S.rollLog.length'),0);
 assert.equal(run('S.play.fatigue'),'Fresh','no automatic Fatigue at 0 MP');
});
test('FM-008 every known spell uses the one Folk Magic skill',()=>{
 setup(10);dice([face(30,100),face(30,100)]);run('S.magic.folk.push({name:"Heal",spec:""});var keys=[];magicSkillKey=k=>{keys.push(k);return "prof:Folk Magic";};APP.castMagic(0);APP.castMagic(1);');
 assert.deepEqual([...new Set(run('keys'))],['Folk Magic']);
});
test('FM-018 range is the Folk Magic percentage in metres',()=>{
 assert.equal(run('folkMagicRangeMetres(65)'),65);assert.equal(run('folkMagicRangeMetres(0)'),0);assert.equal(run('folkMagicRangeMetres(null)'),0);
});
test('FM-007, FM-013, FM-018 the Play Mode card shows 1 Turn, Intensity 1, Magnitude 1 and range',()=>{
 setup(10);run('finalPct=()=>65;gradedPct=()=>({pct:45,grade:"hard"});');
 const html=run('magicPanel()');
 assert.match(html,/1 Turn · Intensity 1 · Magnitude 1 · ranged 65 m/,'range uses the skill, not the Hard-graded chance');
});
console.log('Folk Magic case tests passed');
