// Subsystem 6, MAG-N01–N05 (docs/magic-prioritized-build-spec.md): Sorcery
// Shaping budget, Combine, cost by component, Mysticism limits and learned
// Talents, and separate Theism pools. Run with
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
// Queue d100 results; any unexpected roll fails the test.
const dice=values=>run('var __q='+JSON.stringify(values.map(v=>(v-1)/100+0.0001))+';Math.random=()=>{if(!__q.length)throw new Error("unexpected roll");return __q.shift();};');
const msg=()=>run('PM_MSG');
const base='render=()=>{};viewOnlyBlock=()=>false;playCurMagic=()=>S.play.magic;APPVIEW="play";gradeForEntry=()=>"standard";ACTIVE_GRADE="standard";';
const sorcery=(known,{shaping=47,inv=[["inv:a","A",80]]}={})=>run('S=freshState();S.chars.POW=12;S.play.magic=20;S.magic.known='+JSON.stringify(known)+';'+base
 +'var __inv='+JSON.stringify(inv)+';acquiredProfs=()=>__inv.map(([key,spec])=>({key,name:"Invocation",spec,src:["career"]}));'
 +'magicSkillKey=n=>n==="Invocation"?(__inv[0]||[])[0]||null:null;magicSkillPct=n=>n==="Shaping"?'+shaping+':null;'
 +'finalPct=k=>{const x=__inv.find(i=>i[0]===k);return x?x[2]:0;};');

// ---------- MAG-N01: Shaping budget ----------
test('MAG-N01 Shaping 47% gives 5 points across the five components',()=>{
 sorcery([]);
 assert.equal(run('magicCastPreflight({tradition:"sorcery",name:"W",shapingLevels:{Combine:1,Duration:1,Magnitude:1,Range:1,Targets:1}},20,0)'),null);
 assert.match(run('magicCastPreflight({tradition:"sorcery",name:"W",shapingLevels:{Duration:3,Range:3}},20,0)'),/exceeds your limit \(6 \/ 5\)/);
});
test('MAG-N01 Intensity is not a selectable Shaping component',()=>{
 assert.deepEqual(run('JSON.stringify(MAGIC_TRAD_MAP.sorcery.shaping)'),JSON.stringify(["Combine","Duration","Magnitude","Range","Targets"]));
 sorcery([{tradition:"sorcery",name:"Ward",shapingLevels:{}}]);
 run('APP.shapingLevel(0,"Intensity","2")');assert.equal(run('S.magic.known[0].shapingLevels.Intensity'),undefined);
});
test('MAG-N01 a legacy Intensity value is preserved, not turned into Magnitude, and blocks casting',()=>{
 sorcery([{tradition:"sorcery",name:"Old",shapingLevels:{Intensity:2}}]);
 run('normalizeState();S=JSON.parse(JSON.stringify(S));normalizeState();'+base);
 assert.equal(run('S.magic.known[0].shapingLevels.Intensity'),2);
 assert.equal(run('S.magic.known[0].shapingLevels.Magnitude'),undefined);
 assert.equal(run('sorceryLevels(S.magic.known[0]).Magnitude'),undefined);
 dice([]);run('APP.castMagic(0)');assert.match(msg(),/Legacy Intensity/);assert.equal(run('S.rollLog.length'),0);
});

// ---------- MAG-N02: Combine ----------
const ward=extra=>Object.assign({tradition:"sorcery",name:"Ward",shapingLevels:{Combine:1}},extra);
test('MAG-N02 Combine needs a different recorded spell chosen and shared targets confirmed',()=>{
 for(const [entry,re] of [
  [ward({}),/choose it in the builder \(0 chosen/],
  [ward({combinedSpells:["Ward"],combineSharedTargets:true}),/different spells/],
  [ward({combinedSpells:["Fly"],combineSharedTargets:true}),/not a recorded Sorcery spell/],
  [ward({combinedSpells:["Shield"]}),/share the same target/],
 ]){
  sorcery([entry,{tradition:"sorcery",name:"Shield"}]);dice([]);run('APP.castMagic(0)');
  assert.match(msg(),re);assert.equal(run('S.rollLog.length'),0);assert.equal(run('S.play.sorceryCasting'),null);assert.equal(run('S.play.magic'),20);
 }
 sorcery([ward({shapingLevels:{Combine:2},combinedSpells:["Shield","shield"],combineSharedTargets:true}),{tradition:"sorcery",name:"Shield"}]);
 assert.match(run('sorceryCombineCheck(S.magic.known[0])'),/appears twice/);
});
test('MAG-N02 a valid Combine 1 rolls one grade harder and the Play card names the spells',()=>{
 sorcery([ward({combinedSpells:["Shield"],combineSharedTargets:true}),{tradition:"sorcery",name:"Shield"}]);
 assert.match(run('magicPanel()'),/combined with Shield/);
 run('APP.castMagic(0)');assert.equal(run('S.play.sorceryCasting.completed'),1);
 dice([30]);run('APP.castMagic(0)');
 const log=run('S.rollLog[0]');assert.equal(log.pct,53,'80% at Hard');assert.match(log.label,/Hard/);assert.equal(log.tier,'Success');
});
test('MAG-N02 combined spells from different Invocation skills roll the lower one',()=>{
 const inv=[["inv:a","Fire School",80],["inv:b","Grimoire of Wards",50]];
 sorcery([ward({combinedSpells:["Shield"],combineSharedTargets:true,invocationKey:"inv:a"}),{tradition:"sorcery",name:"Shield",invocationKey:"inv:b"}],{inv});
 assert.equal(run('sorceryRollKey(S.magic.known[0])'),'inv:b');
 run('APP.castMagic(0)');dice([30]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].pct'),33,'50% at Hard');
});
test('MAG-N02 with several Invocation skills a spell must name its source',()=>{
 const inv=[["inv:a","Fire School",80],["inv:b","Grimoire of Wards",50]];
 sorcery([{tradition:"sorcery",name:"Bolt",shapingLevels:{}}],{inv});
 dice([]);run('APP.castMagic(0)');assert.match(msg(),/Choose which Invocation skill/);assert.equal(run('S.rollLog.length'),0);
 run('APP.invocationSource(0,"inv:z")');assert.equal(run('S.magic.known[0].invocationKey'),undefined);
 run('APP.invocationSource(0,"inv:b")');dice([30]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].pct'),50);
});
test('MAG-N02 the combined spells must fit the Shaping budget',()=>{
 sorcery([ward({shapingLevels:{Combine:2,Range:4},combinedSpells:["Shield","Light"],combineSharedTargets:true}),{tradition:"sorcery",name:"Shield"},{tradition:"sorcery",name:"Light"}]);
 dice([]);run('APP.castMagic(0)');assert.match(msg(),/exceeds your limit \(6 \/ 5\)/);
});
test('MAG-N02 changing the combined spell mid-casting needs a cancel, and choices survive a reload',()=>{
 sorcery([ward({combinedSpells:["Shield"],combineSharedTargets:true}),{tradition:"sorcery",name:"Shield"},{tradition:"sorcery",name:"Light"}]);
 run('APP.castMagic(0)');run('APP.combinedSpell(0,0,"Light");APP.castMagic(0)');
 assert.match(msg(),/Cancel it/);assert.equal(run('S.rollLog.length'),0);
 run('S=JSON.parse(JSON.stringify(S));normalizeState();'+base);
 assert.equal(run('S.magic.known[0].combinedSpells[0]'),'Light');assert.equal(run('S.magic.known[0].combineSharedTargets'),true);
});

// ---------- MAG-N03: cost and turns by modified component ----------
test('MAG-N03 Duration 1 + Range 1 costs 3 MP and takes 3 turns, rolling only on the last',()=>{
 const spell={tradition:"sorcery",name:"Ward",shapingLevels:{Duration:1,Range:1}};
 sorcery([spell]);
 assert.equal(run('sorceryCost(S.magic.known[0]).mp'),3);assert.equal(run('sorceryCost(S.magic.known[0]).turns'),3);
 run('S.magic.known[0].shapingLevels={Duration:2,Range:3}');assert.equal(run('sorceryCost(S.magic.known[0]).mp'),3,'points within a component do not add cost');
 for(const [roll,tier,spent] of [[3,'Critical',2],[30,'Success',3],[90,'Failure',0],[99,'Fumble',3]]){
  sorcery([spell]);dice([]);run('APP.castMagic(0);APP.castMagic(0)');
  assert.equal(run('S.rollLog.length'),0);assert.equal(run('S.play.magic'),20);
  dice([roll]);run('APP.castMagic(0)');
  assert.equal(run('S.rollLog[0].tier'),tier);assert.equal(run('S.play.magic'),20-spent,tier+' spends '+spent);
 }
});

// ---------- MAG-N04: Mysticism ----------
const mystic=(known,{pow=12,myst=34,med=54}={})=>run('S=freshState();S.chars.POW='+pow+';S.play.magic=20;S.magic.known='+JSON.stringify(known)+';'+base
 +'magicSkillKey=n=>n==="Mysticism"?"myst":n==="Meditation"?"med":null;magicSkillPct=n=>n==="Mysticism"?'+myst+':n==="Meditation"?'+med+':null;finalPct=()=>'+myst+';');
const talent=extra=>Object.assign({tradition:"mysticism",name:"Iron Skin",talentCategory:"augment",intensity:1,talentLearned:true,active:false},extra);
test('MAG-N04 Mysticism 34% allows Intensity 2 but not 3',()=>{
 mystic([talent({intensity:3})]);dice([]);run('APP.castMagic(0)');assert.match(msg(),/individual Intensity limit \(2\)/);
 mystic([talent({intensity:2})]);run('APP.castMagic(0)');assert.equal(run('S.play.mysticismCasting.completed'),1);
});
test('MAG-N04 total active Intensity may not exceed Meditation / 10',()=>{
 mystic([talent({name:"A",intensity:2,active:true}),talent({name:"B",intensity:2,active:true}),talent({name:"C",intensity:2})],{myst:60,med:54});
 dice([]);run('APP.castMagic(2)');assert.match(msg(),/combined Intensity limit \(5\)/);
 run('APP.toggleTalent(2)');assert.equal(run('S.magic.known[2].active'),false);
});
test('MAG-N04 a recorded Talent is not learned until confirmed, and cannot be used',()=>{
 mystic([talent({talentLearned:undefined})]);run('normalizeState();'+base);
 assert.equal(run('S.magic.known[0].talentLearned'),false);
 dice([]);run('APP.castMagic(0)');assert.match(msg(),/not automatically learned/);assert.equal(run('S.rollLog.length'),0);
 run('APP.toggleTalent(0)');assert.equal(run('S.magic.known[0].active'),false);
 run('APP.talentLearned(0,true)');dice([20]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].tier'),'Success');
});
test('MAG-N04 at most half POW distinct Talents can be learned',()=>{
 mystic([talent({name:"A",talentLearned:false}),talent({name:"B",talentLearned:false}),talent({name:"a",intensity:2,talentLearned:false}),talent({name:"C",talentLearned:false})],{pow:5});
 run('APP.talentLearned(0,true);APP.talentLearned(1,true);APP.talentLearned(2,true)');
 assert.deepEqual([0,1,2].map(i=>run('S.magic.known['+i+'].talentLearned')),[true,true,true],'the same Talent at a second Intensity counts once');
 run('APP.talentLearned(3,true)');assert.equal(run('S.magic.known[3].talentLearned'),false);assert.match(msg(),/half their POW in distinct Talents \(2 at POW 5/);
 run('S.chars.POW=3');dice([]);run('APP.castMagic(0)');assert.match(msg(),/exceed half POW/);assert.equal(run('S.rollLog.length'),0);
 run('APP.talentLearned(1,false)');dice([20]);run('APP.castMagic(0)');assert.equal(run('S.rollLog.length'),1);
});

// ---------- MAG-N05: separate Theism pools ----------
const theist=()=>run('S=freshState();S.chars.POW=12;S.play.magic=10;'+base
 +'magicSkillKey=n=>n==="Exhort"?"exhort":null;finalPct=()=>80;'
 +'S.magic.known=[{tradition:"theism",name:"Bless",miracleLevel:1,miracleInstances:1},{tradition:"theism",name:"Smite",miracleLevel:2,miracleInstances:1}];'
 +'S.magic.devotionalCult="Sun";S.magic.devotionalRank="priest";S.magic.devotional=6;');
test('MAG-N05 a second cult gets its own pool; existing miracles are not reassigned silently',()=>{
 theist();run('APP.addDevotionalPool();APP.devotionalCult(1,"Storm");APP.devotionalRank("acolyte",1);APP.devotional("6",1)');
 assert.equal(run('devotionalPoolCount()'),2);assert.equal(run('S.magic.known[0].pool'),undefined);assert.equal(run('S.magic.known[0].cult'),undefined);assert.equal(run('devotionalMax(1)'),6);
 dice([]);run('APP.castMagic(0)');assert.match(msg(),/Choose which cult/);assert.equal(run('S.rollLog.length'),0);
 assert.equal(run('devotionalPoolLabel(1)'),'Storm pool');
 const html=run('knownMagicEditor(MAGIC_TRAD_MAP.theism)');
 assert.match(html,/Storm/);assert.match(html,/Remove this cult/);assert.match(html,/now held: 12/);
});
test('MAG-N05 combined held pool MP may not exceed POW',()=>{
 theist();run('APP.addDevotionalPool();APP.devotionalRank("highpriest",1);APP.devotional("7",1)');
 assert.equal(run('devotionalMax(1)'),0);assert.match(run('DEVOTIONAL_MSG'),/at most POW \(12\).*13/);
 run('APP.devotional("6",1)');assert.equal(run('devotionalHeldTotal()'),12);
 run('S.magic.devotional=9;S.magic.extraPools[0].used=3;S.play.magic=10');
 run('APP.devotionalAdj(1,1)');assert.equal(run('devotionalCur(1)'),3);assert.match(msg(),/at most POW/);
 run('APP.devotionalReset(1)');assert.equal(run('devotionalCur(1)'),3);
 run('S.magic.devotionalUsed=4');run('APP.devotionalDonate("5",true,1)');assert.equal(run('devotionalCur(1)'),5);assert.equal(run('S.play.magic'),5);
 run('S.magic.devotionalUsed=0;S.play.magic=10');run('APP.devotionalDonate("6",true,1)');assert.match(msg(),/at most POW/);assert.equal(run('S.play.magic'),10);
});
test('MAG-N05 a miracle needs its pool chosen and draws only on that pool',()=>{
 theist();run('APP.addDevotionalPool();APP.devotionalCult(1,"Storm");APP.devotionalRank("acolyte",1);APP.devotional("6",1);S.magic.known.push({tradition:"theism",name:"Gust",miracleLevel:1,miracleInstances:1})');
 dice([]);run('APP.castMagic(2)');assert.match(msg(),/Choose which cult/);assert.equal(run('S.rollLog.length'),0);
 run('APP.miraclePool(2,"1");S.magic.extraPools[0].used=6');
 run('APP.castMagic(2)');assert.match(msg(),/Not enough Devotional Pool points: need 1, have 0/);
 assert.equal(run('S.play.magic'),10,'personal MP untouched');assert.equal(run('devotionalCur(0)'),6,'other pool untouched');
 run('S.magic.extraPools[0].used=0');dice([20]);run('APP.castMagic(2)');
 assert.equal(run('S.rollLog[0].tier'),'Success');assert.equal(run('devotionalCur(1)'),5);assert.equal(run('devotionalCur(0)'),6);assert.equal(run('S.play.magic'),10);
 assert.match(run('S.rollLog[0].magic'),/1 from the Storm pool/);
});
test('MAG-N05 removing a pool clears its miracles and keeps others pointing at the right pool',()=>{
 theist();run('APP.addDevotionalPool();APP.addDevotionalPool();APP.miraclePool(0,"1");APP.miraclePool(1,"2");APP.removeDevotionalPool(1)');
 assert.equal(run('devotionalPoolCount()'),2);assert.equal(run('S.magic.known[0].pool'),undefined);assert.equal(run('S.magic.known[1].pool'),1);
});
test('MAG-N05 an old single-pool save loads as pool 1, and pools survive a JSON round trip',()=>{
 run('S=freshState();S.chars.POW=12;S.magic={folk:[],known:[{tradition:"theism",name:"Bless",miracleLevel:1,miracleInstances:1}],devotional:5,devotionalUsed:2,devotionalRank:"priest"};normalizeState();'+base);
 assert.equal(run('devotionalPoolCount()'),1);assert.equal(run('devotionalCur(0)'),3);assert.equal(run('theismPoolIndex(S.magic.known[0])'),0);
 run('APP.addDevotionalPool();APP.devotional("4",1);S.magic.known[0].pool=9;S=JSON.parse(JSON.stringify(S));normalizeState()');
 assert.equal(run('devotionalMax(1)'),4);assert.equal(run('S.magic.known[0].pool'),undefined,'an out-of-range pool reference is dropped for review');
 run('S.magic.extraPools=[{cult:5,rank:"pope",max:-3,used:9}];normalizeState()');
 assert.equal(run('JSON.stringify(S.magic.extraPools[0])'),JSON.stringify({cult:"5",rank:"",max:0,used:0}));
});
// Two cults whose miracles are requested with different Exhort skills.
const twoCults=()=>{theist();run('var __ex=[["exhort:sun","Sun",70],["exhort:storm","Storm",40]];acquiredProfs=()=>__ex.map(([key,spec])=>({key,name:"Exhort",spec,src:["learned"]}));'
 +'finalPct=k=>{const x=__ex.find(i=>i[0]===k);return x?x[2]:0;};'
 +'APP.addDevotionalPool();APP.devotionalCult(1,"Storm");APP.devotionalRank("acolyte",1);APP.devotional("6",1);APP.miraclePool(0,"0");APP.miraclePool(1,"1");');};
test('MAG-N05 each cult requests its miracles with its own Exhort skill',()=>{
 twoCults();
 assert.equal(run('S.magic.known[0].cult'),'Sun');assert.equal(run('S.magic.known[1].cult'),'Storm');
 assert.equal(run('miracleCultChoice(S.magic.known[1])'),1);
 run('S.magic.known.push({tradition:"theism",name:"Old",miracleLevel:1,miracleInstances:1,pool:0})');
 assert.equal(run('miracleCultChoice(S.magic.known[2])'),null,'a bare legacy pool index is shown as unconfirmed');run('S.magic.known.pop()');
 assert.equal(run('exhortKeyForPool(0)'),'exhort:sun');assert.equal(run('exhortKeyForPool(1)'),'exhort:storm');
 dice([50]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].pct'),70);assert.equal(run('S.rollLog[0].tier'),'Success');
 run('APP.castMagic(1)');dice([50]);run('APP.castMagic(1)');assert.equal(run('S.rollLog[0].pct'),40);assert.equal(run('S.rollLog[0].tier'),'Failure');
 assert.equal(run('devotionalCur(1)'),6,'a failed Exhort spends nothing');
});
test('MAG-N05 a miracle of one cult is rejected through another cult\'s pool',()=>{
 twoCults();run('S.magic.known[1].pool=0');
 dice([]);run('APP.castMagic(1)');assert.match(msg(),/Smite belongs to Storm, not Sun/);
 assert.equal(run('S.rollLog.length'),0);assert.equal(run('devotionalCur(0)'),6);assert.equal(run('S.play.magic'),10);
 run('APP.devotionalCult(1,"Thunder")');run('APP.miraclePool(1,"1");APP.devotionalCult(1,"Storm")');
 run('APP.castMagic(1)');assert.match(msg(),/belongs to Thunder, not Storm/,'renaming a pool needs the miracle re-confirmed');
});
test('MAG-N05 with several Exhort skills and no name match, the pool must choose one',()=>{
 twoCults();run('APP.devotionalCult(1,"Moon");APP.miraclePool(1,"1")');
 assert.equal(run('exhortKeyForPool(1)'),null);
 dice([]);run('APP.castMagic(1)');assert.match(msg(),/Choose which Exhort skill the Moon pool uses/);
 run('APP.poolExhort(1,"exhort:nope")');assert.equal(run('exhortKeyForPool(1)'),null);
 run('APP.poolExhort(1,"exhort:storm")');assert.equal(run('exhortKeyForPool(1)'),'exhort:storm');
 assert.match(run('knownMagicEditor(MAGIC_TRAD_MAP.theism)'),/Exhort used for this cult/);
 run('S=JSON.parse(JSON.stringify(S));normalizeState()');assert.equal(run('S.magic.extraPools[0].exhortKey'),'exhort:storm');
 run('APP.poolExhort(1,"")');assert.equal(run('exhortKeyForPool(1)'),null);
});
test('MAG-N05 a single-cult legacy theist casts unchanged',()=>{
 theist();dice([20]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].tier'),'Success');assert.equal(run('devotionalCur(0)'),5);
});

// ---------- MAG-N10 (partial): pending Sorcery source guard ----------
test('MAG-N10 changing a combined spell\'s Invocation source mid-casting needs a cancel',()=>{
 const inv=[["inv:a","Fire School",80],["inv:b","Grimoire of Wards",50]];
 sorcery([ward({combinedSpells:["Shield"],combineSharedTargets:true,invocationKey:"inv:a"}),{tradition:"sorcery",name:"Shield",invocationKey:"inv:b"}],{inv});
 run('APP.castMagic(0)');assert.equal(run('S.play.sorceryCasting.completed'),1);
 run('APP.invocationSource(1,"inv:a")');dice([]);run('APP.castMagic(0)');
 assert.match(msg(),/Cancel it/);assert.equal(run('S.rollLog.length'),0);assert.equal(run('S.play.magic'),20);
 run('APP.invocationSource(1,"inv:b")');dice([30]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].pct'),33,'restored sources resolve on the final turn with the lower skill at Hard');
});
console.log('Magic MAG-N01–N05 tests passed');
