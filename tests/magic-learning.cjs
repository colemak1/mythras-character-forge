// Subsystem 6, Sorcery and Theism: learning a new spell or miracle
// (docs/magic-sorcery-code-cases-20261109.md SO-C01 and
// docs/magic-theism-cults-code-cases-20261109.md TH-C02; Core pp.118, 161,
// 179–181). Recording a name is not learning it: learning in play takes
// 5 Experience Rolls, a month of study, a source and GM approval. Entries
// saved before this was tracked stay usable and are never charged. TH-C01:
// starting miracles follow the cult, its rank and its Devotion.
// Run with `node tests/magic-learning.cjs`.
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
const caster=(known,{xp=0,extra=''}={})=>run('S=freshState();S.chars.POW=12;S.chars.INT=14;S.play.magic=20;S.xp.pool='+xp+';'
 +'S.magic.known='+JSON.stringify(known)+';'+extra+'normalizeState();'
 +'render=()=>{};viewOnlyBlock=()=>false;debounceFire=(k,f)=>f();PM_MSG=null;MAGIC_LEARN_MSG=null;');
const spell=(over={})=>Object.assign({tradition:'sorcery',name:'Wrack',notes:'',shapingLevels:{}},over);
const miracle=(over={})=>Object.assign({tradition:'theism',name:'Bless Crops',notes:'',miracleLevel:1,miracleInstances:1},over);
const block=i=>run('magicAcquisitionBlock(S.magic.known['+i+'])');
const pre=i=>run('magicCastPreflight(S.magic.known['+i+'],20,20)');
const reload=()=>run('S=JSON.parse(JSON.stringify(S));normalizeState();');
const learnMsg=()=>run('MAGIC_LEARN_MSG&&MAGIC_LEARN_MSG.text');
const builder=key=>run('knownMagicEditor(MAGIC_TRADITIONS.find(t=>t.key==="'+key+'"))');

test('saved spells and miracles stay usable and are never charged',()=>{
 caster([spell(),miracle()],{xp:7});
 assert.equal(run('S.magic.known[0].acquired'),'recorded');
 assert.equal(run('S.magic.known[1].acquired'),'recorded');
 assert.equal(block(0),null);assert.equal(block(1),null);
 run('APP.magicLearn(0,"Grimoire",true)');
 assert.equal(run('S.xp.pool'),7,'no retroactive charge');
 assert.equal(run('S.magic.known[0].acquired'),'recorded');
 assert.match(builder('sorcery'),/Saved before learning was tracked/);
 assert.doesNotMatch(builder('sorcery'),/Learn \(5 Experience Rolls\)/);
});
test('a newly added spell must record how it was acquired before casting',()=>{
 caster([]);run('APP.addMagic("sorcery")');run('S.magic.known[0].name="Wrack"');
 assert.equal(run('S.magic.known[0].acquired'),'');
 assert.match(pre(0),/Record how Wrack was acquired/);
 reload();assert.equal(run('S.magic.known[0].acquired'),'','unset survives reload; not turned into recorded');
 run('APP.magicAcquired(0,"starting")');
 assert.equal(block(0),null);
 run('APP.addMagic("theism")');assert.equal(run('S.magic.known[1].acquired'),'');
 run('APP.addMagic("mysticism")');assert.equal(run('S.magic.known[2].acquired'),undefined,'other traditions unaffected');
});
test('a reference entry cannot be cast or combined',()=>{
 caster([spell({acquired:'reference'}),spell({name:'Fly',acquired:'starting',shapingLevels:{Combine:1},combinedSpells:['Wrack'],combineSharedTargets:true})]);
 assert.match(pre(0),/reference only/);
 assert.match(run('sorceryCombineCheck(S.magic.known[1])'),/Wrack is not learned yet/);
 run('S.magic.known[0].acquired="starting"');assert.equal(run('sorceryCombineCheck(S.magic.known[1])'),null);
 run('S.magic.known[0].acquired="reference"');
 const play=run('magicPanel()');assert.match(play,/REFERENCE ONLY/);
});
test('SO-C01 learning a spell needs a source, GM approval and 5 Experience Rolls',()=>{
 caster([spell({acquired:'reference'})],{xp:4});
 run('APP.magicLearn(0,"",true)');assert.match(learnMsg(),/grimoire, school or teacher/);
 run('APP.magicLearn(0,"Grimoire of Ash",false)');assert.match(learnMsg(),/month of study/);
 run('APP.magicLearn(0,"Grimoire of Ash",true)');assert.match(learnMsg(),/needs 5 Experience Rolls; you have 4/);
 assert.equal(run('S.xp.pool'),4);assert.equal(run('S.magic.known[0].acquired'),'reference');
 run('S.xp.pool=6;APP.magicLearn(0,"Grimoire of Ash",true)');
 assert.equal(run('S.xp.pool'),1);assert.equal(run('S.magic.known[0].acquired'),'learned');
 assert.equal(run('S.magic.known[0].learning.source'),'Grimoire of Ash');
 assert.equal(run('S.xp.history[0].type'),'magic-learn');assert.match(run('xpLogRow(S.xp.history[0])'),/learned for <b>5<\/b> Experience Rolls/);
 assert.equal(pre(0),null);
 run('APP.magicLearn(0,"Grimoire of Ash",true)');assert.equal(run('S.xp.pool'),1,'no second charge');
 run('APP.magicAcquired(0,"reference")');assert.equal(run('S.magic.known[0].acquired'),'learned','learned record is kept');
 reload();assert.equal(run('S.magic.known[0].acquired'),'learned');assert.equal(run('S.magic.known[0].learning.cost'),5);
 assert.match(builder('sorcery'),/Learned in play on \d{4}-\d\d-\d\d from Grimoire of Ash for 5 Experience Rolls/);
});
test('TH-C02 learning a miracle needs its level, cult and a rank that grants it',()=>{
 caster([miracle({acquired:'',miracleLevel:null}),],{xp:10,extra:'S.magic.devotionalCult="Sun";S.magic.devotionalRank="initiate";S.magic.devotional=4;'});
 run('APP.magicLearn(0,"Sun",true)');assert.match(learnMsg(),/miracle's level/);
 run('S.magic.known[0].miracleLevel=2;APP.magicLearn(0,"Sun",true)');assert.match(learnMsg(),/allows up to level 1/);
 run('S.magic.known[0].miracleLevel=1;S.magic.extraPools=[{cult:"Moon",rank:"initiate",max:2,used:0,exhortKey:""}];APP.magicLearn(0,"Sun",true)');
 assert.match(learnMsg(),/Choose which cult/);
 assert.equal(run('S.xp.pool'),10);
 run('S.magic.known[0].pool=0;S.magic.known[0].cult="Sun"');
 assert.match(builder('theism'),/id="magicLearnSrc0" value="Sun"/,'cult prefilled as the source');
 run('APP.magicLearn(0,"Sun",true)');
 assert.equal(run('S.magic.known[0].acquired'),'learned');assert.equal(run('S.xp.pool'),5);
 assert.match(run('S.xp.history[0].label'),/Miracle: Bless Crops \(from Sun\)/);
});
test('invalid saved values fail safe and the message follows its row',()=>{
 caster([spell({acquired:'bogus'}),spell({name:'Fly',acquired:'learned',learning:'junk'})]);
 assert.equal(run('S.magic.known[0].acquired'),'');assert.equal(run('S.magic.known[1].learning'),undefined);
 run('APP.magicLearn(0,"",true)');assert.equal(run('MAGIC_LEARN_MSG.index'),0);
 run('APP.delMagic(0)');assert.equal(run('MAGIC_LEARN_MSG'),null);
});
// ---------- TH-C01: starting miracles (Core pp.118, 179) ----------
const theist=(devs,known,extra='')=>caster(known,{extra:'S.magic.devotionalCult="Sun";S.magic.devotionalRank="initiate";S.magic.devotional=4;'+extra
 +'acquiredProfs=()=>'+JSON.stringify(devs.map(([spec,pct])=>({key:'dev:'+spec,name:'Devotion',spec})))+';'
 +'var __pct='+JSON.stringify(Object.fromEntries(devs.map(([spec,pct])=>['dev:'+spec,pct])))+';finalPct=k=>__pct[k]??50;'});
const fresh=(name,over={})=>miracle(Object.assign({name,acquired:''},over));
test('TH-C01 one starting miracle per 20% (or part) of the cult\'s Devotion',()=>{
 theist([['Sun',20]],[fresh('A'),fresh('B')]);
 run('APP.magicAcquired(0,"starting")');assert.equal(run('S.magic.known[0].acquired'),'starting');
 assert.match(builder('theism'),/Starting miracles for this cult: 1 \/ 1/);
 run('confirm=()=>false;APP.magicAcquired(1,"starting")');
 assert.equal(run('S.magic.known[1].acquired'),'');assert.match(learnMsg(),/Devotion allows 1 starting miracle for this cult/);
 run('S.magic.known[0].acquired="";');theist([['Sun',21]],[fresh('A',{acquired:'starting'}),fresh('B')]);
 run('confirm=()=>{throw new Error("no prompt expected")};APP.magicAcquired(1,"starting")');
 assert.equal(run('S.magic.known[1].acquired'),'starting','21% gives 2');
});
test('TH-C01 more than the allowance needs the GM, and it is kept after reload',()=>{
 theist([['Sun',15]],[fresh('A',{acquired:'starting'}),fresh('B')]);
 run('confirm=()=>true;APP.magicAcquired(1,"starting")');
 assert.equal(run('S.magic.known[1].acquired'),'starting');assert.equal(run('S.magic.known[1].startingGM'),true);
 reload();assert.equal(run('S.magic.known[1].startingGM'),true);assert.equal(run('S.magic.known[0].startingGM'),undefined);
 assert.match(builder('theism'),/beyond the Devotion allowance, GM approved/);
 run('APP.magicAcquired(1,"reference")');assert.equal(run('S.magic.known[1].startingGM'),undefined);
});
test('TH-C01 starting miracles need the cult, a level the rank grants, and Devotion',()=>{
 theist([['Sun',60]],[fresh('A',{miracleLevel:2})]);
 run('APP.magicAcquired(0,"starting")');assert.match(learnMsg(),/allows up to level 1/);
 run('S.magic.known[0].miracleLevel=null;APP.magicAcquired(0,"starting")');assert.match(learnMsg(),/miracle's level/);
 theist([],[fresh('A')]);run('APP.magicAcquired(0,"starting")');assert.match(learnMsg(),/Add the Devotion skill for Sun/);
 assert.equal(run('S.magic.known[0].acquired'),'');
});
test('TH-C01 a second cult counts its own starting miracles from its own Devotion',()=>{
 const two='S.magic.extraPools=[{cult:"Moon",rank:"initiate",max:2,used:0,exhortKey:""}];';
 theist([['Sun',20],['Moon',40]],[fresh('A',{pool:0,cult:'Sun',acquired:'starting'}),fresh('B'),fresh('C',{pool:1,cult:'Moon'}),fresh('D',{pool:1,cult:'Moon'})],two);
 run('APP.magicAcquired(1,"starting")');assert.match(learnMsg(),/Choose the miracle's cult/);
 run('confirm=()=>{throw new Error("no prompt expected")};APP.magicAcquired(2,"starting");APP.magicAcquired(3,"starting")');
 assert.equal(run('S.magic.known[2].acquired'),'starting');assert.equal(run('S.magic.known[3].acquired'),'starting','Moon 40% allows 2');
 reload();assert.equal(run('S.magic.known.filter(m=>m.acquired==="starting").length'),3);
});
console.log('magic-learning: all tests passed');
