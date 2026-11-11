// Subsystem 6, Organisations (docs/magic-organisations-code-cases-20261109.md,
// Core pp.196–200): OR-C01 promotion is checked but the GM decides; a veteran
// starting rank needs the GM. OR-C02 the rank discount is on training price
// only. OR-C03 leaving keeps skills and history, ends the old discount and
// new miracles from that cult.
// Run with `node tests/organisations.cjs`.
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
run('var __allEntries=allEntries,__finalPct=finalPct;');
const test=(name,fn)=>{fn();console.log('PASS '+name);};
const SKILLS={a:55,b:60,c:72,d:80,e:50,f:20};
const member=(extra='')=>run('allEntries=__allEntries;finalPct=__finalPct;S=freshState();normalizeState();render=()=>{};viewOnlyBlock=()=>false;confirm=()=>true;CULT_MSG="";'
 +'var __p='+JSON.stringify(SKILLS)+';allEntries=()=>Object.keys(__p).map(k=>({key:k,label:k.toUpperCase()}));finalPct=k=>__p[k]??30;'
 +'APP.pickCult("sea");'+extra);
const msg=()=>run('CULT_MSG');
const reload=()=>run('S=JSON.parse(JSON.stringify(S));normalizeState();');
const page=()=>run('stepCult()');

test('OR-C01 a starting rank above Common needs the GM',()=>{
 member();run('confirm=()=>false;APP.cultField("rank","2")');
 assert.equal(run('S.cultMembership.rank'),0);assert.match(msg(),/not changed/);
 run('confirm=()=>true;APP.cultField("rank","2")');
 assert.equal(run('S.cultMembership.rank'),2);assert.equal(run('S.cultMembership.startingRankGM'),true);
 reload();assert.equal(run('S.cultMembership.startingRankGM'),true);assert.match(page(),/GM-approved veteran starting rank/);
 run('APP.cultField("rank","0")');assert.equal(run('S.cultMembership.startingRankGM'),false);
 run('APP.cultField("rank","9")');assert.equal(run('S.cultMembership.rank'),0,'out of range ignored');
});
test('OR-C01 meeting the numbers never promotes by itself; the GM approves',()=>{
 member();
 assert.equal(run('cultPromotionCheck().eligible'),false);
 run('APP.cultPromote(true,false)');assert.match(msg(),/0 of 5 cult skills at 50%/);assert.equal(run('S.cultMembership.rank'),0);
 for(const k of ['a','b','c','d','e'])run('APP.cultSkill("'+k+'",true)');
 assert.equal(run('cultPromotionCheck().eligible'),true);assert.equal(run('S.cultMembership.rank'),0,'not automatic');
 run('APP.cultPromote(false,false)');assert.match(msg(),/GM .*approves/);assert.equal(run('S.cultMembership.rank'),0);
 run('S.cultMembership.rankYears=4;APP.cultPromote(true,false)');
 assert.equal(run('S.cultMembership.rank'),1);assert.equal(run('S.cultMembership.rankYears'),0,'years at the new rank start again');
 assert.match(run('S.cultMembership.history.at(-1).text'),/Promoted Lay Member → Initiate$/);
 run('APP.cultField("rank","3")');assert.equal(run('S.cultMembership.rank'),1,'picker locked after a promotion');
 assert.match(page(),/disabled onchange="APP.cultField\('rank'/);
});
test('OR-C01 Proven needs years and four skills at 70%; a GM override is recorded',()=>{
 member('S.cultMembership.rank=1;S.cultMembership.cultSkills=["a","b","c","d","e","f"];S.cultMembership.rankYears=2;');
 const chk=JSON.parse(run('JSON.stringify(cultPromotionCheck())'));
 assert.deepEqual(chk.missing,['2 of 4 cult skills at 70% or better','2 of 3 years at Initiate']);
 assert.match(page(),/GM judges a valuable gift or service/);
 run('APP.cultPromote(true,false)');assert.equal(run('S.cultMembership.rank'),1);
 run('APP.cultPromote(true,true)');assert.equal(run('S.cultMembership.rank'),2);
 assert.match(run('S.cultMembership.history.at(-1).text'),/GM override: 2 of 4 cult skills/);
 run('APP.cultSkill("zz",true)');assert.equal(run('cultPromotionCheck().marked.includes("zz")'),false,'unknown skills never count');
});
test('OR-C02 the rank discount is shown on training price only',()=>{
 member();assert.equal(run('cultTrainingDiscount()'),0);
 assert.doesNotMatch(run('xpModalHtml()'),/rank guideline/);
 run('S.cultMembership.rank=3');assert.equal(run('cultTrainingDiscount()'),75);
 assert.match(run('xpModalHtml()'),/Sea \/ Storm Cult rank guideline: <b>75% off<\/b> the price of training/);
});
test('OR-C02 rank changes leave real skill values alone',()=>{
 run('allEntries=__allEntries;finalPct=__finalPct;S=freshState();normalizeState();render=()=>{};viewOnlyBlock=()=>false;confirm=()=>true;APP.pickCult("sorcerous")');
 const key=run('cultMemberSkillKey()');const skills=()=>run('JSON.stringify(allEntries().map(e=>[e.key,finalPct(e.key)]))');
 const before=skills();run('APP.cultField("rank","3")');assert.equal(skills(),before);
 assert.ok(before.includes(JSON.stringify(key)),'cult skill listed');
});
test('OR-C03 leaving keeps the skill and history, ends the discount',()=>{
 run('allEntries=__allEntries;finalPct=__finalPct;S=freshState();normalizeState();render=()=>{};viewOnlyBlock=()=>false;confirm=()=>true;APP.pickCult("sorcerous");APP.cultField("name","Ash Lodge");S.cultMembership.rank=2');
 const key=run('cultMemberSkillKey()');
 run('confirm=()=>false;APP.leaveCult()');assert.equal(run('S.cultMembership.archetype'),'sorcerous','cancel keeps membership');
 run('confirm=()=>true;APP.leaveCult()');
 assert.equal(run('S.cultMembership.archetype'),null);assert.equal(run('cultTrainingDiscount()'),0);
 assert.equal(run('acquiredProfs().some(p=>p.key==='+JSON.stringify(key)+'&&p.src.includes("former cult"))'),true);
 reload();assert.equal(run('S.cultFormer[0].name'),'Ash Lodge');assert.equal(run('S.cultFormer[0].rank'),2);
 assert.match(page(),/Former: Ash Lodge \(Adept, left \d{4}-/);assert.match(page(),/Left Ash Lodge as Adept/);
});
test('OR-C03 switching organisations records the old one; clicking the current one leaves',()=>{
 run('allEntries=__allEntries;finalPct=__finalPct;S=freshState();normalizeState();render=()=>{};viewOnlyBlock=()=>false;confirm=()=>true;APP.pickCult("sea");S.cultMembership.rankYears=1;APP.pickCult("craft");S.cultMembership.rankYears=1');
 assert.equal(run('S.cultMembership.archetype'),'craft');assert.equal(run('S.cultFormer[0].archetype'),'sea');
 run('confirm=()=>false;APP.pickCult("warrior")');assert.equal(run('S.cultMembership.archetype'),'craft','cancel keeps current');
 run('confirm=()=>true;APP.pickCult("craft")');assert.equal(run('S.cultMembership.archetype'),null);assert.equal(run('S.cultFormer.length'),2);
});
test('OR-C03 a left cult\'s miracles are not learned or started until the GM approves rejoining',()=>{
 run('allEntries=__allEntries;finalPct=__finalPct;S=freshState();normalizeState();render=()=>{};viewOnlyBlock=()=>false;confirm=()=>true;APP.pickCult("sea");APP.cultField("name","Sun");'
  +'S.magic.devotionalCult="Sun";S.magic.devotionalRank="initiate";S.magic.devotional=3;S.xp.pool=6;'
  +'S.magic.known=[{tradition:"theism",name:"Bless",miracleLevel:1,miracleInstances:1,acquired:"reference"},{tradition:"theism",name:"Ward",miracleLevel:1,miracleInstances:1,acquired:"starting"}];normalizeState();');
 assert.equal(run('cultLeftBlock("Sun")'),null);
 run('S.cultMembership.rankYears=2;APP.leaveCult()');
 assert.match(run('magicLearnCheck(S.magic.known[0],"Sun",true)'),/left Sun/);
 assert.match(run('theismStartingCheck(S.magic.known[0]).error'),/left Sun/);
 assert.equal(run('S.magic.known.length'),2,'learned magic kept');assert.equal(run('S.magic.known[1].acquired'),'starting');
 run('APP.pickCult("sea");APP.cultField("name","Sun")');assert.equal(run('cultLeftBlock("Sun")'),null,'rejoined');
});
test('old saves keep their cult and starting-magic review',()=>{
 run('allEntries=__allEntries;finalPct=__finalPct;S=freshState();S.cultMembership={archetype:"sea",name:"Tide",rank:1};S.magic.startingReviewMode="new";'
  +'S.magic.startingReviewSignature=startingMagicReviewSignature();normalizeState();');
 assert.equal(run('S.magic.startingReviewSignature===startingMagicReviewSignature()'),true);
 assert.equal(run('S.cultMembership.rank'),1);assert.deepEqual(JSON.parse(run('JSON.stringify(S.cultFormer)')),[]);
 assert.equal(run('S.cultMembership.startingRankGM'),false);
});
test('OR-C03 an untouched same-day pick is a correction, not a departure',()=>{
 run('allEntries=__allEntries;finalPct=__finalPct;S=freshState();normalizeState();render=()=>{};viewOnlyBlock=()=>false;confirm=()=>{throw new Error("no prompt")};APP.pickCult("sea");APP.pickCult("craft")');
 assert.equal(run('S.cultMembership.archetype'),'craft');assert.equal(run('S.cultFormer.length'),0);
 assert.equal(run('S.cultMembership.history.length'),1);
 run('APP.pickCult("craft")');assert.equal(run('S.cultMembership.archetype'),null);assert.equal(run('S.cultMembership.history.length'),0);
 run('APP.pickCult("sea");S.cultMembership.history[0].date="2020-01-01";confirm=()=>true;APP.pickCult("craft")');
 assert.equal(run('S.cultFormer.length'),1,'an older membership is recorded');
});
console.log('organisations: all tests passed');
