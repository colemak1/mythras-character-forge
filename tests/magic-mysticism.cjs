// Subsystem 6, Mysticism (docs/magic-mysticism-code-cases-20261109.md and the
// MY-C03 ruling in docs/magic-animism-finish-20261109.md, Core pp.155–157):
// MY-C01 switching Talents in practice, MY-C02 one concentration roll per
// active Talent, MY-C03 Augment Skill on the real skill roll.
// Run with `node tests/magic-mysticism.cjs`.
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
const talent=(over={})=>Object.assign({tradition:"mysticism",name:"Iron Will",notes:"",talentCategory:"augment",intensity:1,talentLearned:true,active:false},over);
const mystic=(known,{pow=12}={})=>run('S=freshState();S.chars.POW='+pow+';S.play.magic=20;S.magic.known='+JSON.stringify(known)+';normalizeState();'
 +'render=()=>{};viewOnlyBlock=()=>false;ACTIVE_GRADE="standard";PM_MSG=null;MYSTIC_MSG="";TALENT_SWAP=null;finalPct=()=>50;');
const pct=(key='std:Athletics')=>JSON.parse(run('JSON.stringify(gradedPct('+JSON.stringify(key)+',50))'));

// ---------- MY-C03: Augment Skill on the linked roll ----------
test('MY-C03 one grade easier per Intensity, capped at Very Easy',()=>{
 mystic([talent({intensity:3,active:true,augmentSkill:'std:Athletics'})]);
 assert.deepEqual(pct(),{pct:100,grade:'veasy'},'Standard + 3 → Very Easy');
 assert.deepEqual(pct('std:Brawn'),{pct:50,grade:'standard'},'other skills unchanged');
 run('ACTIVE_GRADE="formidable"');assert.deepEqual(pct(),{pct:75,grade:'easy'},'two harder + 3 → Easy (excess kept)');
 run('ACTIVE_GRADE="herculean"');assert.equal(pct().grade,'standard');
 run('ACTIVE_GRADE="veasy"');assert.equal(pct().grade,'veasy','never past Very Easy');
 run('ACTIVE_GRADE="automatic"');assert.equal(pct().grade,'automatic');
 run('ACTIVE_GRADE="hopeless"');assert.equal(pct().grade,'hopeless');
});
test('MY-C03 only an active, learned, linked Augment Talent counts; two add up',()=>{
 const linked={intensity:1,active:true,augmentSkill:'std:Athletics'};
 for(const over of [{active:false},{talentLearned:false},{augmentSkill:''},{talentCategory:'enhance'}]){
  mystic([talent(Object.assign({},linked,over))]);run('ACTIVE_GRADE="hard"');assert.equal(pct().grade,'hard',JSON.stringify(over));
 }
 mystic([talent(linked),talent(Object.assign({},linked,{name:'Swift Body'}))]);run('ACTIVE_GRADE="formidable"');
 assert.equal(pct().grade,'standard');
});
test('MY-C03 the roll, its label and the reasons use the same grade',()=>{
 mystic([talent({intensity:2,active:true,augmentSkill:'std:Athletics'})]);run('ACTIVE_GRADE="hard"');
 dice([70]);run('APP.roll("std:Athletics")');
 assert.equal(run('S.rollLog[0].pct'),75);assert.equal(run('S.rollLog[0].tier'),'Success');assert.match(run('S.rollLog[0].label'),/\(Easy\)/);
 assert.match(run('JSON.stringify(gradeReasons("std:Athletics"))'),/Augment Skill Talent Iron Will: 2 Grades easier/);
});
test('MY-C03 a roll\'s own harder grades are netted before the cap',()=>{
 mystic([talent({intensity:3,active:true,augmentSkill:'std:Athletics'})]);
 assert.equal(run('gradeWithExtra("std:Athletics",1)'),'veasy','Standard + 3 easier + 1 harder');
 assert.equal(run('gradeWithExtra("std:Athletics",4)'),'hard');
 assert.equal(run('gradeWithExtra("std:Brawn",1)'),'hard','no Talent: shifts as before');
});
test('MY-C03 the link is saved, kept after reload, and offered in the builder',()=>{
 mystic([talent()]);run('APP.talentAugmentSkill(0,"std:Athletics")');assert.equal(run('S.magic.known[0].augmentSkill'),'std:Athletics');
 run('APP.talentAugmentSkill(0,"nope")');assert.equal(run('S.magic.known[0].augmentSkill'),'std:Athletics','unknown skill refused');
 run('S=Object.assign(freshState(),JSON.parse(JSON.stringify(S)));normalizeState()');assert.equal(run('S.magic.known[0].augmentSkill'),'std:Athletics');
 assert.match(run('knownMagicEditor(MAGIC_TRADITIONS.find(t=>t.key==="mysticism"))'),/Augments skill/);
 run('S.magic.known[0].augmentSkill=7;normalizeState()');assert.equal(run('"augmentSkill" in S.magic.known[0]'),false);
});

// ---------- MY-C02: concentration after a disruption ----------
test('MY-C02 each active Talent gets its own Willpower prompt; only losers end',()=>{
 mystic([talent({name:'A',active:true}),talent({name:'B',active:true,intensity:2}),talent({name:'C'})]);
 run('APP.talentDisrupted()');assert.match(msg(),/each active Talent separately/);
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.play.talentDisruption.talents.map(t=>t.name))')),['A','B']);
 assert.match(run('pmTalentDisruptionHTML()'),/Roll Willpower/);
 dice([30]);run('APP.talentDisruptionRoll(0)');assert.match(run('S.rollLog[0].magic'),/concentration on A/);
 run('S=Object.assign(freshState(),JSON.parse(JSON.stringify(S)));normalizeState()');assert.equal(run('S.play.talentDisruption.talents.length'),2,'kept after reload');
 run('APP.talentDisruptionResolve(0,true)');assert.equal(run('S.magic.known[0].active'),true);
 run('APP.talentDisruptionResolve(0,false)');assert.equal(run('S.magic.known[1].active'),false);assert.match(msg(),/B ends/);
 assert.equal(run('S.play.talentDisruption'),null);
});
test('MY-C02 nothing to test with no active Talent; a changed Talent is not ended',()=>{
 mystic([talent({name:'A'})]);run('APP.talentDisrupted()');assert.match(msg(),/No Talent is active/);assert.equal(run('S.play.talentDisruption'),null);
 mystic([talent({name:'A',active:true})]);run('APP.talentDisrupted();S.magic.known[0].name="Z";APP.talentDisruptionResolve(0,false)');
 assert.equal(run('S.magic.known[0].active'),true);assert.match(msg(),/changed or removed/);
 run('S.play.talentDisruption={talents:[{index:"x"}]};normalizeState()');assert.equal(run('S.play.talentDisruption'),null);
});

// ---------- MY-C01: switching the Talents in practice ----------
test('MY-C01 at the half-POW cap a new Talent needs a GM-confirmed switch',()=>{
 mystic([talent({name:'A'}),talent({name:'a',intensity:2,active:true}),talent({name:'B'}),talent({name:'C',talentLearned:false})],{pow:4});
 run('APP.talentLearned(3,true)');assert.equal(run('S.magic.known[3].talentLearned'),false);assert.match(msg(),/choose the Talent it replaces/);
 assert.equal(run('TALENT_SWAP'),3);assert.match(run('knownMagicEditor(MAGIC_TRADITIONS.find(t=>t.key==="mysticism"))'),/Switch Talents/);
 run('APP.talentSwap(3,"A",false)');assert.match(run('MYSTIC_MSG'),/Confirm with your GM/);assert.equal(run('S.magic.known[3].talentLearned'),false);
 run('APP.talentSwap(3,"Q",true)');assert.match(run('MYSTIC_MSG'),/Choose the practised Talent/);
 run('APP.talentSwap(3,"A",true)');
 assert.deepEqual([0,1,2,3].map(i=>run('S.magic.known['+i+'].talentLearned')),[false,false,true,true]);
 assert.equal(run('S.magic.known[1].active'),false,'the replaced Talent ends');assert.equal(run('S.magic.known.length'),4,'nothing deleted');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.magic.talentSwaps.map(x=>[x.from,x.to]))')),[['A','C']]);
 assert.equal(run('TALENT_SWAP'),null);
});
test('MY-C01 stopping practice keeps the Talent and is logged; the log survives reload',()=>{
 mystic([talent({name:'A'}),talent({name:'B'})],{pow:4});
 run('APP.talentLearned(1,false)');assert.equal(run('S.magic.known[1].talentLearned'),false);assert.equal(run('S.magic.known.length'),2);
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.magic.talentSwaps.map(x=>[x.from,x.to]))')),[['B','']]);
 run('S=Object.assign(freshState(),JSON.parse(JSON.stringify(S)));normalizeState()');assert.equal(run('S.magic.talentSwaps.length'),1);
 assert.match(run('knownMagicEditor(MAGIC_TRADITIONS.find(t=>t.key==="mysticism"))'),/stopped practising B/);
 run('confirm=()=>false;APP.talentLearned(0,false)');assert.equal(run('S.magic.known[0].talentLearned'),true,'cancelled');run('confirm=()=>true');
 run('APP.talentLearned(1,true)');assert.equal(run('S.magic.known[1].talentLearned'),true,'under the cap: no switch needed');
});
test('Play Mode shows Mark active / End Talent and the linked skill',()=>{
 mystic([talent({augmentSkill:'std:Athletics'})]);run('magicSkillKey=n=>n==="Mysticism"?"std:Athletics":null');
 const h=run('magicPanel()');assert.match(h,/augments Athletics/);assert.match(h,/Mark active/);
 run('magicSkillPct=n=>n==="Mysticism"?60:60;APP.toggleTalent(0)');assert.equal(run('S.magic.known[0].active'),true);
 assert.match(run('magicPanel()'),/End Talent/);assert.match(run('magicPanel()'),/Disrupted/);
});
