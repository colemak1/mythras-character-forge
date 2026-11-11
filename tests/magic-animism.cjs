// Subsystem 6, Animism finish (docs/magic-animism-finish-20261109.md,
// Core pp.131–137): AN-F01 Trance purposes by rank, AN-F02 summoning,
// AN-F03 the arrival record, AN-F04 making a binding, AN-F05 a fetish
// spirit's release and return. Run with `node tests/magic-animism.cjs`.
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
// d100 results queued as given; a die of N sides reads the same queue.
const dice=values=>run('var __q='+JSON.stringify(values.map(v=>(v-1)/100+0.0001))+';Math.random=()=>{if(!__q.length)throw new Error("unexpected roll");return __q.shift();};');
const msg=()=>run('PM_MSG');
const spirit=(over={})=>Object.assign({tradition:"animism",name:"Hearth Spirit",notes:"",intensity:2,pow:12,cha:8,spiritStatus:"unbound",spiritAcquired:"bargain",
 spiritContact:"contacted",spiritAttitude:"friendly",bindingType:"none",spiritMP:null,spiritCombatNote:""},over);
const animist=(rank,spirits=[spirit()],mp=10)=>run('S=freshState();S.chars.POW=12;S.chars.CHA=12;S.play.magic='+mp+';S.magic.animistRank='+JSON.stringify(rank)
 +';S.magic.known='+JSON.stringify(spirits)+';normalizeState();S.play.magic='+mp+';'
 +'render=()=>{};viewOnlyBlock=()=>false;playCurMagic=()=>S.play.magic;gradeForEntry=()=>"standard";ACTIVE_GRADE="standard";PM_MSG=null;'
 +'magicSkillKey=n=>n==="Trance"?"std:Trance":n==="Binding"?"binding":null;finalPct=k=>k==="std:Trance"?60:k==="binding"?50:0;'
 +'gradedPct=(k,p)=>({pct:p,grade:"standard"});');

test('AN-F01 Trance purposes and preparation follow the Core p.131 table',()=>{
 const t=(r,p,c)=>run(`trancePrep("${r}",${!!c},"${p}")`);
 assert.deepEqual(['r1','r2','r3','r4'].map(r=>t(r,'Converse')),[null,'1 hour','1 minute','1 round']);
 assert.deepEqual(['r1','r2','r3','r4'].map(r=>t(r,'Project')),[null,null,'1 hour','1 minute']);
 assert.deepEqual(['r1','r2','r3','r4'].map(r=>t(r,'Draw')),[null,null,'1 hour','1 minute']);
 assert.deepEqual(['r1','r2','r3','r4'].map(r=>t(r,'Drag')),[null,null,null,'1 hour']);
 assert.equal(t('r4','Converse',true),'1 Action');assert.equal(t('r3','Project',true),'1 minute');
 assert.deepEqual(JSON.parse(run('JSON.stringify(trancePurposesForRank("r1").map(p=>p.key))')),['Observe'],'a Follower only Observes');
 assert.deepEqual(JSON.parse(run('JSON.stringify(trancePurposesForRank("r4").map(p=>p.key))')),['Observe','Converse','Project','Draw','Drag']);
});
test('AN-F01 a Trance for a higher purpose: rank gate, 1 MP, kept after reload, Willpower prompt',()=>{
 animist('r1');dice([]);run('APP.animistTrance("Drag")');assert.match(msg(),/needs a higher animist rank/);assert.equal(run('S.play.magic'),10);
 assert.doesNotMatch(run('pmTranceHTML()'),/Drag Souls/,'not offered to a Follower');
 animist('r3');dice([30]);run('APP.animistTrance("Project")');
 assert.match(run('S.rollLog[0].magic'),/Trance: Project after 1 hour, 1 MP/);assert.equal(run('S.play.magic'),9);
 assert.match(msg(),/opposed Willpower/);
 run('S=Object.assign(freshState(),JSON.parse(JSON.stringify(S)));normalizeState()');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.play.trance)')),{purpose:'Project',prep:'1 hour',critical:false});
 assert.match(run('pmTranceHTML()'),/In Trance: Project after 1 hour/);assert.match(run('pmTranceHTML()'),/Project Self onto the Spirit Plane \(1 hour\)/);
 animist("r3");dice([70]);run('APP.animistTrance("Converse")');assert.equal(run('S.play.trance'),null,'failure: no Trance');assert.equal(run('S.play.magic'),9,'1 MP spent on failure too');
 run('S.play.trance={purpose:"Fly",prep:"1 hour"};normalizeState()');assert.equal(run('S.play.trance'),null);
});
test('AN-F02 summoning: known spirit, distance within Binding % km, Intensity MP',()=>{
 animist('r2',[spirit({name:""})]);run('APP.summonSpirit(0,"5")');assert.match(msg(),/only a known spirit/);
 animist('r2');run('APP.summonSpirit(0,"")');assert.match(msg(),/how far away/);
 run('APP.summonSpirit(0,"51")');assert.match(msg(),/within 50 km \(your Binding %/);assert.equal(run('S.play.magic'),10);
 animist('r2',[spirit({intensity:4})],3);run('APP.summonSpirit(0,"10")');assert.match(msg(),/needs 4 Magic Points/);
 assert.equal(run('S.rollLog.length'),0,'no roll when refused');
});
test('AN-F02 summoning outcomes: critical 1d3 rounds, success 1d4 minutes; never bound',()=>{
 animist('r2');dice([3,41]);run('APP.summonSpirit(0,"50")');
 assert.equal(run('S.play.magic'),8,'Intensity 2 MP');assert.equal(run('S.magic.known[0].summon.arrival'),'2 rounds');
 assert.equal(run('S.magic.known[0].spiritStatus'),'unbound');assert.match(msg(),/arrives in 2 rounds/);
 assert.match(run('S.rollLog[0].label'),/Summon Hearth Spirit/);
 run('APP.summonSpirit(0,"5")');assert.match(msg(),/already been summoned/);
 animist('r2');dice([30,76]);run('APP.summonSpirit(0,"5")');assert.equal(run('S.magic.known[0].summon.arrival'),'4 minutes');
});
test('AN-F02 a failure waits a day; a fumble suspends the bond until amends',()=>{
 animist('r2');dice([70]);run('APP.summonSpirit(0,"5")');
 assert.equal(run('S.play.magic'),8,'MP spent on the attempt');assert.equal(run('S.magic.known[0].summon'),null);
 run('APP.summonSpirit(0,"5")');assert.match(msg(),/following day/);
 run('APP.advanceTime("day")');assert.equal(run('S.magic.known[0].summonRetryBarred'),false);
 animist('r2');dice([100]);run('APP.summonSpirit(0,"5")');assert.equal(run('S.magic.known[0].bondSuspended'),true);
 run('APP.advanceTime("day")');run('APP.summonSpirit(0,"5")');assert.match(msg(),/bond is suspended|suspended this spirit's bond/);
 run('APP.spiritAmends(0,false)');assert.equal(run('S.magic.known[0].bondSuspended'),true);
 run('APP.spiritAmends(0,true)');assert.equal(run('S.magic.known[0].bondSuspended'),false);
});
test('AN-F03 the GM records attitude, opposed Willpower and service; kept after reload',()=>{
 animist('r2');dice([3,1]);run('APP.summonSpirit(0,"5")');
 run('APP.summonRecord(0,"attitude","hostile");APP.summonRecord(0,"winner","animist");APP.summonRecord(0,"service","Guard the ford");APP.summonRecord(0,"attitude","sulky")');
 run('S=Object.assign(freshState(),JSON.parse(JSON.stringify(S)));normalizeState()');
 const s=JSON.parse(run('JSON.stringify(S.magic.known[0].summon)'));
 assert.equal(s.attitude,'hostile');assert.equal(s.winner,'animist');assert.equal(s.service,'Guard the ford');assert.equal(s.tier,'Critical');
 const html=run('magicPanel()');assert.match(html,/Attitude of a Summoned Spirit/);assert.match(html,/Spirit has gone/);
 run('APP.summonEnd(0)');assert.equal(run('S.magic.known[0].summon'),null);assert.equal(run('S.magic.known[0].spiritStatus'),'unbound');
});
test('AN-F04 a binding costs Experience Rolls only when the GM confirms it complete',()=>{
 animist('r2',[spirit({spiritAcquired:""})]);run('APP.vesselStart(0,"fetish","")');assert.match(msg(),/Record how the spirit was acquired/);
 animist('r2',[spirit({intensity:3})]);run('S.xp.pool=2;APP.vesselStart(0,"fetish","")');
 assert.equal(run('S.magic.known[0].vesselWork.cost'),3);assert.equal(run('S.xp.pool'),2,'nothing charged at the start');
 run('APP.vesselComplete(0,false)');assert.match(msg(),/GM confirms/);
 run('APP.vesselComplete(0,true)');assert.match(msg(),/needs 3 Experience Rolls; you have 2/);
 run('S.xp.pool=5;APP.vesselComplete(0,true)');assert.equal(run('S.xp.pool'),2);
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.magic.known[0].vessel)')),{type:'fetish',intensity:3,recipient:''});
 assert.equal(run('S.magic.known[0].bindingType'),'fetish');assert.match(run('xpLogRow(S.xp.history[0])'),/Binding: Hearth Spirit \(fetish\) — <b>3<\/b> Experience Rolls spent/);assert.equal(run('S.magic.known[0].vesselWork'),null);
 // Upgrade of the same vessel type: only the difference. Same Intensity: nothing.
 run('S.magic.known[0].intensity=5');assert.equal(run('bindingVesselCost(S.magic.known[0],"fetish",5)'),2);
 assert.equal(run('bindingVesselCost(S.magic.known[0],"fetish",3)'),0);assert.equal(run('bindingVesselCost(S.magic.known[0],"location",5)'),5);
 run('APP.vesselStart(0,"fetish","");APP.vesselCancel(0)');assert.equal(run('S.xp.pool'),2);assert.equal(run('S.magic.known[0].vesselWork'),null);
 run('S=Object.assign(freshState(),JSON.parse(JSON.stringify(S)));normalizeState()');assert.equal(run('S.magic.known[0].vessel.intensity'),3);
});
test('AN-F04 a binding made for someone else uses their slot, not the maker\'s',()=>{
 animist('r1',[spirit({spiritStatus:"bound"}),spirit({name:"Gift Spirit",spiritStatus:"bound"})]);
 assert.equal(run('boundSpiritLimit()'),3);
 run('S.xp.pool=4;APP.vesselStart(1,"creature","Ama");APP.vesselComplete(1,true)');
 assert.match(msg(),/uses Ama's spirit slot/);assert.equal(run('boundSpirits().length'),1);
 run('APP.commandSpirit(1+S.magic.folk.length)');assert.match(msg(),/bound for Ama; they command it/);
});
test('AN-F05 a fetish spirit: release is free, return costs 1 AP in a fight; a hostile one resists',()=>{
 animist('r2',[spirit({spiritStatus:"bound",bindingType:"fetish"})]);
 run('APP.fetishRelease(0)');assert.equal(run('S.magic.known[0].manifested'),true);assert.match(msg(),/up to 12 m from the fetish/);assert.equal(run('S.play.magic'),10);
 run('S.play.initiative={order:[]};S.play.apUsed=0;APP.fetishReturn(0)');
 assert.equal(run('S.magic.known[0].manifested'),false);assert.equal(run('S.play.apUsed'),1);assert.equal(run('S.play.magic'),10,'no MP');
 animist('r2',[spirit({spiritStatus:"bound",bindingType:"fetish",spiritAttitude:"hostile"})]);
 run('APP.fetishRelease(0)');dice([80]);run('APP.fetishReturn(0)');
 assert.equal(run('S.magic.known[0].manifested'),true);assert.match(msg(),/stays out/);assert.match(run('S.rollLog[0].label'),/Return Hearth Spirit/);
 dice([20]);run('APP.fetishReturn(0)');assert.equal(run('S.magic.known[0].manifested'),false);
 animist('r2',[spirit({spiritStatus:"bound",bindingType:"location"})]);run('APP.fetishRelease(0)');assert.equal(run('S.magic.known[0].manifested'),false,'only a fetish');
 run('S.magic.known[0].manifested=true;normalizeState()');assert.equal(run('S.magic.known[0].manifested'),false);
});
test('Play Mode shows the spirit actions; junk play state is dropped on load',()=>{
 animist('r3',[spirit({spiritStatus:"bound",bindingType:"fetish"})]);
 const html=run('magicPanel()');
 assert.match(html,/Summon<\/b> · 2 MP · within 50 km/);assert.match(html,/Make a binding/);assert.match(html,/Release \(Free Action\)/);
 run('S.magic.known[0].summon={tier:"Fumble"};S.magic.known[0].vessel={type:"jar",intensity:2};S.magic.known[0].vesselWork={type:"fetish",intensity:2,cost:-1};normalizeState()');
 assert.equal(run('S.magic.known[0].summon'),null);assert.equal(run('S.magic.known[0].vessel'),null);assert.equal(run('S.magic.known[0].vesselWork'),null);
});
console.log('Animism finish tests passed');
