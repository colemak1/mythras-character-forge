// Subsystem 6, MAG-N06–N10 (docs/magic-prioritized-build-spec.md): Mysticism
// and Theism outcome costs, miracle rank, bound-spirit commands and slots, and
// pending-cast invalidation. Run with `node tests/magic-build-n06-n10.cjs`.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setTimeout,clearTimeout,setInterval,clearInterval,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
const test=(name,fn)=>{fn();console.log('PASS '+name);};
// Queue d100 results; any unexpected roll fails the test.
const dice=values=>run('var __q='+JSON.stringify(values.map(v=>(v-1)/100+0.0001))+';Math.random=()=>{if(!__q.length)throw new Error("unexpected roll");return __q.shift();};');
const msg=()=>run('PM_MSG');
const base='render=()=>{};viewOnlyBlock=()=>false;playCurMagic=()=>S.play.magic;APPVIEW="play";gradeForEntry=()=>"standard";ACTIVE_GRADE="standard";';
// ---------- MAG-N06: Mysticism outcome costs ----------
const mystic=extra=>run('S=freshState();S.chars.POW=12;S.play.magic=20;'+base
 +'S.magic.known=['+JSON.stringify(Object.assign({tradition:"mysticism",name:"Iron Skin",talentCategory:"augment",intensity:1,talentLearned:true,active:false},extra))+'];'
 +'magicSkillKey=n=>n==="Mysticism"?"myst":n==="Meditation"?"med":null;magicSkillPct=n=>n==="Mysticism"?100:n==="Meditation"?90:null;finalPct=()=>80;');
test('MAG-N06 base cost: Augment 1/Intensity, Invoke Trait 2 at Intensity 1 only, Enhance 3/Intensity',()=>{
 mystic({});
 assert.equal(run('mysticismDetails({talentCategory:"augment",intensity:3}).cost'),3);
 assert.equal(run('mysticismDetails({talentCategory:"invoke",intensity:1}).cost'),2);
 assert.equal(run('mysticismDetails({talentCategory:"invoke",intensity:2})'),null);
 assert.equal(run('mysticismDetails({talentCategory:"enhance",intensity:2}).cost'),6);
});
test('MAG-N06 final roll spends half/full/1/full MP on critical/success/failure/fumble',()=>{
 for(const [roll,tier,spent] of [[3,'Critical',3],[50,'Success',6],[90,'Failure',1],[99,'Fumble',6]]){
  mystic({talentCategory:"enhance",intensity:2});dice([]);run('APP.castMagic(0)');assert.equal(run('S.rollLog.length'),0);
  dice([roll]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].tier'),tier);assert.equal(run('S.play.magic'),20-spent,tier);
 }
 mystic({talentCategory:"invoke",intensity:1});dice([50]);run('APP.castMagic(0)');assert.equal(run('S.play.magic'),18,'Invoke Trait costs 2');
});

// ---------- MAG-N07: Theism outcomes, miracle rank, instances ----------
const theist=(extra,rank="priest",pool=9)=>run('S=freshState();S.chars.POW=12;S.play.magic=10;'+base
 +'magicSkillKey=n=>n==="Exhort"?"exhort":null;finalPct=()=>80;'
 +'S.magic.known=['+JSON.stringify(Object.assign({tradition:"theism",name:"Bless",miracleLevel:1,miracleInstances:1},extra))+'];'
 +'S.magic.devotionalCult="Sun";S.magic.devotionalRank="'+rank+'";S.magic.devotional='+pool+';');
test('MAG-N07 final Exhort spends 0/full/0/1 pool points on critical/success/failure/fumble',()=>{
 for(const [roll,tier,spent] of [[3,'Critical',0],[50,'Success',4],[90,'Failure',0],[99,'Fumble',1]]){
  theist({miracleLevel:2,miracleInstances:2});
  run('APP.castMagic(0);APP.castMagic(0)');assert.equal(run('S.rollLog.length'),0,'level 2 × 2 instances takes 3 turns');
  dice([roll]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].tier'),tier);
  assert.equal(run('devotionalCur(0)'),9-spent,tier);assert.equal(run('S.play.magic'),10,'personal MP never used');
 }
});
test('MAG-N07 a miracle above the pool\'s confirmed rank cannot be requested',()=>{
 theist({miracleLevel:3},"acolyte",6);dice([]);run('APP.castMagic(0)');
 assert.match(msg(),/level 3 miracle; the Sun pool's confirmed rank allows up to level 2/);assert.equal(run('S.play.theismCasting'),null);
 theist({miracleLevel:1},"lay",0);run('APP.castMagic(0)');assert.match(msg(),/up to level 0/);
 theist({miracleLevel:3},"highpriest");run('APP.castMagic(0)');assert.equal(run('S.play.theismCasting.completed'),1);
 assert.match(run('knownMagicEditor(MAGIC_TRAD_MAP.theism)'),/Sun/);
 theist({miracleLevel:3},"initiate",3);assert.match(run('knownMagicEditor(MAGIC_TRAD_MAP.theism)'),/level 3 miracle/);
});
test('MAG-N07 an unconfirmed cult rank blocks miracle requests but keeps the data',()=>{
 theist({miracleLevel:1},"",3);dice([]);run('APP.castMagic(0)');
 assert.match(msg(),/Confirm your rank in Sun/);assert.equal(run('S.play.theismCasting'),null);assert.equal(run('S.rollLog.length'),0);
 assert.equal(run("devotionalMax(0)"),3);assert.equal(run("S.magic.known[0].miracleLevel"),1);
 assert.match(run('knownMagicEditor(MAGIC_TRAD_MAP.theism)'),/Confirm your rank in Sun/);
 run('APP.devotionalRank("initiate")');dice([20]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].tier'),'Success');
});
test('MAG-N07 the pool ceiling is enforced before the roll',()=>{
 theist({miracleLevel:3,miracleInstances:2});run('S.magic.devotionalUsed=4');dice([]);
 run('APP.castMagic(0)');assert.match(msg(),/need 6, have 5/);assert.equal(run('S.play.theismCasting'),null);
});

// ---------- MAG-N08: bound-spirit commands ----------
const animist=extra=>run('S=freshState();S.chars.POW=12;S.chars.CHA=12;S.play.magic=10;'+base
 +'magicSkillKey=n=>n==="Binding"?"binding":null;finalPct=()=>60;gradedPct=(k,p)=>({pct:p,grade:"standard"});'
 +'S.magic.known=['+JSON.stringify(Object.assign({tradition:"animism",name:"Shade",pow:10,intensity:1,spiritStatus:"bound",spiritAcquired:"bargain"},extra))+'];');
test('MAG-N08 command costs 0/1/1/1 MP; failure is ignored, fumble breaks the binding',()=>{
 for(const [roll,tier,spent,status,re] of [[3,'Critical',0,'bound',/succeeded/],[40,'Success',1,'bound',/succeeded/],[90,'Failure',1,'bound',/ignores/],[99,'Fumble',1,'unbound',/broken/]]){
  animist({});dice([roll]);run('APP.commandSpirit(0)');
  assert.equal(run('S.rollLog[0].tier'),tier);assert.equal(run('S.play.magic'),10-spent,tier);
  assert.equal(run('S.magic.known[0].spiritStatus'),status);assert.match(msg(),re);
 }
});
test('MAG-N08 an unbound spirit, or one over the POW limit, is rejected before any charge',()=>{
 animist({spiritStatus:"unbound"});dice([]);run('APP.commandSpirit(0)');assert.match(msg(),/not marked as bound/);assert.equal(run('S.play.magic'),10);
 animist({pow:19});run('APP.commandSpirit(0)');assert.match(msg(),/exceeds your Binding limit \(18\)/);assert.equal(run('S.play.magic'),10);assert.equal(run('S.rollLog.length'),0);
});

// ---------- MAG-N09: bound-spirit slots ----------
test('MAG-N09 binding needs a GM-confirmed bargain or Spirit Combat win',()=>{
 animist({spiritStatus:"unbound",spiritAcquired:""});run('S.magic.animistRank="r4"');
 run('APP.spiritStatus(0,"bound")');assert.equal(run('S.magic.known[0].spiritStatus'),'unbound');assert.match(msg(),/Record how the spirit was acquired/);
 run('APP.spiritAcquired(0,"stolen")');assert.equal(run('S.magic.known[0].spiritAcquired'),'');
 run('APP.spiritAcquired(0,"combat");APP.spiritStatus(0,"bound")');assert.equal(run('S.magic.known[0].spiritStatus'),'bound');
});
test('MAG-N09 slots are ¼/½/¾/all CHA, and a fractional limit waits for the GM',()=>{
 animist({});
 assert.deepEqual(JSON.parse(run('JSON.stringify(ANIMIST_RANK_LABEL.slice(1).map(x=>x[1].split(":")[0]))')),["Follower","Spirit Worshipper","Shaman","High Shaman"]);
 for(const [rank,x] of [["r1",3],["r2",6],["r3",9],["r4",12]]){run('APP.animistRank("'+rank+'")');assert.equal(run('boundSpiritFormula()'),x);assert.equal(run('boundSpiritLimit()'),x);}
 run('S.chars.CHA=13;APP.animistRank("r1")');assert.equal(run('boundSpiritFormula()'),3.25);assert.equal(run('boundSpiritLimit()'),null,'no hidden rounding');
 run('S.magic.known.push({tradition:"animism",name:"Wisp",pow:5,intensity:1,spiritStatus:"unbound",spiritAcquired:"bargain"});APP.spiritStatus(1,"bound")');
 assert.equal(run('S.magic.known[1].spiritStatus'),'unbound');assert.match(msg(),/Enter the whole-number limit your GM confirms/);
 run('APP.boundLimitGM("5")');assert.equal(run('S.magic.boundLimitGM'),undefined);assert.match(msg(),/3 or 4/);
 run('APP.boundLimitGM("4");APP.spiritStatus(1,"bound")');assert.equal(run('S.magic.known[1].spiritStatus'),'bound');
 run('APP.animistRank("r2")');assert.equal(run('S.magic.boundLimitGM'),undefined,'a rank change clears the GM limit');
 run('S=JSON.parse(JSON.stringify(S));S.magic.animistRank="r9";normalizeState()');assert.equal(run('S.magic.animistRank'),'');
});
test('MAG-N09 a full set of slots blocks binding; on overflow the strongest escape',()=>{
 animist({name:"Bear",intensity:3,pow:14});run('S.chars.CHA=8;APP.animistRank("r1")');
 run('S.magic.known.push({tradition:"animism",name:"Wisp",pow:5,intensity:1,spiritStatus:"bound",spiritAcquired:"bargain"},{tradition:"animism",name:"Hawk",pow:9,intensity:1,spiritStatus:"unbound",spiritAcquired:"combat"})');
 run('APP.spiritStatus(2,"bound")');assert.match(msg(),/All 2 bound-spirit slots are in use/);
 run('APP.animistRank("r4");APP.spiritStatus(2,"bound");APP.animistRank("r1")');
 assert.deepEqual(JSON.parse(run('JSON.stringify(boundSpiritOverflow().map(m=>m.name))')),["Bear"]);
 dice([]);run('APP.commandSpirit(1)');assert.match(msg(),/strongest break free/);assert.equal(run('S.play.magic'),10);
 assert.match(run('knownMagicEditor(MAGIC_TRAD_MAP.animism)'),/the GM decides which are strongest[\s\S]*App suggestion \(highest Intensity, then POW\): Bear/);
 run('APP.releaseOverflowSpirits()');assert.equal(run('S.magic.known[0].spiritStatus'),'unbound');assert.equal(run('boundSpirits().length'),2);
 dice([40]);run('APP.commandSpirit(1)');assert.equal(run('S.rollLog[0].tier'),'Success');
});
test('MAG-N09 a spirit bound before this change stays bound',()=>{
 run('S=freshState();S.magic.known=[{tradition:"animism",name:"Old",spiritStatus:"bound"}];normalizeState()');
 assert.equal(run('S.magic.known[0].spiritStatus'),'bound');assert.equal(run('S.magic.known[0].spiritAcquired'),'');
});

// ---------- MAG-N10: invalidating a pending cast ----------
test('MAG-N10 deleting an earlier entry mid-casting needs a cancel: no roll, no charge',()=>{
 mystic({intensity:2});run('S.magic.known.unshift({tradition:"mysticism",name:"Calm",talentCategory:"augment",intensity:1,talentLearned:true,active:false})');
 run('APP.castMagic(1)');assert.equal(run('S.play.mysticismCasting.completed'),1);
 run('S.magic.known.splice(0,1)');dice([]);run('APP.castMagic(0)');
 assert.match(msg(),/changed/);assert.equal(run('S.rollLog.length'),0);assert.equal(run('S.play.magic'),20);
});
test('MAG-N10 changing a miracle\'s pool or cult mid-exhortation needs a cancel',()=>{
 theist({miracleLevel:2});run('APP.addDevotionalPool();APP.devotionalCult(1,"Moon");APP.devotionalRank("priest",1);APP.devotional("3",1);APP.miraclePool(0,"0")');
 run('APP.castMagic(0)');assert.equal(run('S.play.theismCasting.completed'),1);
 run('APP.miraclePool(0,"1")');dice([]);run('APP.castMagic(0)');assert.match(msg(),/changed/);
 assert.equal(run('devotionalCur(0)'),9);assert.equal(run('devotionalCur(1)'),3);assert.equal(run('S.rollLog.length'),0);
});
test('MAG-N10 a pending cast survives reload, resolves once, and the next click starts afresh',()=>{
 theist({miracleLevel:2});run('APP.castMagic(0);S=JSON.parse(JSON.stringify(S));normalizeState()');
 dice([50]);run('APP.castMagic(0)');assert.equal(run('devotionalCur(0)'),7);assert.equal(run('S.play.theismCasting'),null);
 run('APP.castMagic(0)');assert.equal(run('S.play.theismCasting.completed'),1,'a second click begins a new exhortation');assert.equal(run('devotionalCur(0)'),7,'no double charge');
});
test('MAG-N10 a pending cast belongs to its character: loading another has none',()=>{
 theist({miracleLevel:2});run('APP.castMagic(0);var other=freshState();other.concept.name="Other";S=JSON.parse(JSON.stringify(other));normalizeState()');
 assert.equal(run('S.play.theismCasting'),null);
});
console.log('Magic MAG-N06–N10 tests passed');
