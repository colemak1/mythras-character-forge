// D-5 / FM-F02 (docs/decisions.md, docs/magic-folk-finish-20261109.md):
// hurt while casting, Core p.119. GM-prompted, never inferred from HP.
// Run with `node tests/magic-casting-hurt.cjs`.
// `node tests/magic-build-n01-n05.cjs`.
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
const dice=values=>run('var __q='+JSON.stringify(values.map(v=>(v-1)/100+0.0001))+';Math.random=()=>{if(!__q.length)throw new Error("unexpected roll");return __q.shift();};');
const msg=()=>run('PM_MSG');
const base='render=()=>{};viewOnlyBlock=()=>false;playCurMagic=()=>S.play.magic;APPVIEW="play";gradeForEntry=()=>"standard";ACTIVE_GRADE="standard";';
const sorcery=(known)=>run('S=freshState();S.chars.POW=12;S.play.magic=20;S.magic.known='+JSON.stringify(known)+';'+base
 +'acquiredProfs=()=>[{key:"inv:a",name:"Invocation",spec:"A",src:["career"]}];'
 +'magicSkillKey=n=>n==="Invocation"?"inv:a":null;magicSkillPct=n=>n==="Shaping"?47:null;finalPct=k=>k==="inv:a"?80:0;');
const ward={tradition:"sorcery",name:"Ward",shapingLevels:{}};
const cast=(hurt,will)=>{sorcery([ward]);if(hurt)run('APP.castingHurtSet('+JSON.stringify(hurt)+')');if(will)run('APP.castingHurtWillpower('+JSON.stringify(will)+')');};

test('castingHurtEffect follows Core p.119',()=>{
 const e=h=>JSON.parse(run('JSON.stringify(castingHurtEffect('+JSON.stringify(h)+'))'));
 assert.deepEqual(e(null),{extra:0});
 assert.deepEqual(e({kind:'minor',willpower:'success'}),{extra:0});assert.deepEqual(e({kind:'minor',willpower:'failure'}),{extra:1});
 assert.deepEqual(e({kind:'serious',willpower:'success'}),{extra:1});assert.deepEqual(e({kind:'serious',willpower:'failure'}),{extra:2});
 assert.deepEqual(e({kind:'serious',willpower:null}),{pending:true});
 assert.deepEqual(e({kind:'major'}),{fails:true});assert.deepEqual(e({kind:'domination'}),{fails:true});
});
test('not hurt: the casting roll is unchanged (80%)',()=>{
 cast();dice([30]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].pct'),80);
});
test('Minor Wound: Willpower must be recorded first; a failure makes it one grade harder (80 → 54)',()=>{
 cast('minor');dice([]);run('APP.castMagic(0)');assert.match(msg(),/record the Willpower result/);assert.equal(run('S.rollLog.length'),0);
 run('APP.castingHurtWillpower("failure")');dice([30]);run('APP.castMagic(0)');
 assert.equal(run('S.rollLog[0].pct'),54);assert.match(run('S.rollLog[0].label'),/Hard/);
 assert.equal(run('S.play.castingHurt'),null,'the mark clears after the roll');
 cast('minor','success');dice([30]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].pct'),80);
});
test('Serious Wound: Willpower success one grade harder, failure two (80 → 54, 40)',()=>{
 cast('serious','success');dice([30]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].pct'),54);
 cast('serious','failure');dice([30]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].pct'),40);assert.match(run('S.rollLog[0].label'),/Formidable/);
});
test('Major Wound or mental domination: the casting fails with no roll and nothing spent',()=>{
 for(const k of ['major','domination']){
  cast(k);dice([]);run('APP.castMagic(0)');
  assert.match(run('S.rollLog[0].magic'),/failed/);assert.equal(run('S.rollLog[0].tier'),'Failure');
  assert.equal(run('S.play.magic'),20);assert.equal(run('S.play.castingHurt'),null);assert.match(msg(),/casting fails/);
 }
});
test('the control shows on the Magic tab and an invalid saved mark is dropped on load',()=>{
 cast('serious');assert.match(run('magicPanel()'),/Hurt while casting/);assert.match(run('magicPanel()'),/Willpower result/);
 run('S.play.castingHurt={kind:"bogus"};normalizeState();');assert.equal(run('S.play.castingHurt'),null);
 run('S.play.castingHurt={kind:"minor",willpower:"failure"};normalizeState();');assert.equal(run('S.play.castingHurt.kind'),'minor');
});
console.log('Casting interruption tests passed');
// ---------- AN-C01 Trance (docs/magic-animism-code-cases-20261109.md, Core p.131) ----------
const animist=(rank)=>run('S=freshState();S.chars.POW=12;S.play.magic=5;S.magic.animistRank='+JSON.stringify(rank)+';'+base
 +'magicSkillKey=n=>n==="Trance"?"std:Trance":null;finalPct=k=>k==="std:Trance"?60:0;');
test('AN-C01 Trance preparation by rank; a critical saves one step, never below an Action',()=>{
 assert.deepEqual(['r1','r2','r3','r4'].map(r=>run(`trancePrep("${r}",false)`)),['1 hour','1 minute','1 round','1 Action']);
 assert.deepEqual(['r1','r4'].map(r=>run(`trancePrep("${r}",true)`)),['1 minute','1 Action']);
 assert.equal(run('trancePrep("",false)'),null);
});
test('AN-C01 Trance is its own roll: 1 MP, Observe time shown, rank required',()=>{
 animist('');dice([]);run('APP.animistTrance()');assert.match(msg(),/Confirm the animist rank/);assert.equal(run('S.play.magic'),5);
 animist('r2');dice([30]);run('APP.animistTrance()');
 assert.equal(run('S.rollLog[0].label'),'Trance');assert.match(run('S.rollLog[0].magic'),/Observe after 1 minute, 1 MP/);assert.equal(run('S.play.magic'),4);
 animist('r2');dice([3]);run('APP.animistTrance()');assert.match(run('S.rollLog[0].magic'),/quickened: Observe after 1 round/);
 animist('r2');run('S.play.magic=0');dice([]);run('APP.animistTrance()');assert.match(msg(),/needs 1 Magic Point/);
});
test('AN-C01 a fumbled Trance bars the Spirit Plane until a day of rest',()=>{
 animist('r3');dice([100]);run('APP.animistTrance()');assert.equal(run('S.rollLog[0].tier'),'Fumble');assert.equal(run('S.play.tranceBarred'),true);
 dice([]);run('APP.animistTrance()');assert.match(msg(),/bars entering the Spirit Plane/);assert.match(run('pmTranceHTML()'),/barred for a day/);
 run('APP.advanceTime("day")');assert.equal(run('S.play.tranceBarred'),false);
});
console.log('Trance tests passed');
