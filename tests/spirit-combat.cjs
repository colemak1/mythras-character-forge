// Spirit Combat (AN-F06/F07) and actions while invoking (SO-C02), from
// docs/core-source-followups-20261111.md (Core pp.119, 131, 137–138).
// Run with `node tests/spirit-combat.cjs`.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setTimeout,clearTimeout,setInterval,clearInterval,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}},
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
// Queue of [value, sides] for the next random rolls.
const dice=rolls=>run('var __q='+JSON.stringify(rolls.map(([v,s])=>(v-1)/s+0.0001))+';Math.random=()=>{if(!__q.length)throw new Error("unexpected roll");return __q.shift();};');
const msg=()=>run('PM_MSG');
const reload=()=>run('S=JSON.parse(JSON.stringify(S));normalizeState();');
const base='render=()=>{};viewOnlyBlock=()=>false;playCurMagic=()=>S.play.magic;APPVIEW="play";gradeForEntry=()=>"standard";ACTIVE_GRADE="standard";confirm=()=>true;PM_MSG=null;';
const animist=(binding=60)=>run('S=freshState();S.play.magic=12;'+base
 +'magicSkillKey=n=>'+(binding===null?'null':'n==="Binding"?"bind:a":null')+';finalPct=k=>k==="bind:a"?'+binding+':k==="std:Willpower"?45:0;');
const opts=o=>JSON.parse(run('JSON.stringify(spiritEffectOptions('+JSON.stringify(o)+'))'));

// ---------- AN-F06 ----------
test('AN-F06 Spirit Damage by skill %, including the 20/21, 100/101 and 300/301 edges',()=>{
 const sd=p=>run('spiritDiceLabel(spiritDamageDice('+p+'))');
 assert.equal(sd(0),'none');assert.equal(sd(1),'1d2');assert.equal(sd(20),'1d2');assert.equal(sd(21),'1d4');
 assert.equal(sd(60),'1d6');assert.equal(sd(100),'1d10');assert.equal(sd(101),'2d6');assert.equal(sd(130),'1d8 + 1d6');
 assert.equal(sd(160),'2d8');assert.equal(sd(180),'1d10 + 1d8');assert.equal(sd(200),'2d10');assert.equal(sd(210),'2d10 + 1d2');
 assert.equal(sd(260),'2d10 + 1d6');assert.equal(sd(280),'2d10 + 1d8');assert.equal(sd(300),'3d10');assert.equal(sd(301),'3d10 + 1d2');
 assert.equal(sd(400),'4d10');
});
test('AN-F06 an animist fights with Binding; without it, Willpower',()=>{
 animist(60);assert.equal(run('spiritCombatSkill().label'),'Binding');assert.equal(run('spiritCombatSkill().pct'),60);
 animist(null);assert.match(run('spiritCombatSkill().label'),/^Willpower/);assert.equal(run('spiritCombatSkill().pct'),45);
});
test('AN-F06 an unparried hit drains MP, never Hit Points; Spirit Lance takes the better roll',()=>{
 animist(60);run('APP.spiritCombatStart("Shade","50","8","",false)');
 dice([[30,100]]);run('APP.spiritCombatExchange("pc","90")');
 const p=JSON.parse(run('JSON.stringify(S.play.spiritCombat.pending)'));
 assert.equal(p.hit,true);assert.equal(p.winner,'pc');assert.equal(p.effects,1);
 assert.equal(run('S.play.spiritCombat.foe.mp'),8,'nothing drained before Apply');
 dice([[2,6],[5,6]]);run('APP.spiritCombatApply(["Spirit Lance"])');
 assert.equal(run('S.play.spiritCombat.foe.mp'),3);assert.equal(run('JSON.stringify(S.play.hp)'),'{}');
 assert.match(run('S.play.spiritCombat.log[0]'),/1d6 = 5 MP/);
});
test('AN-F06 a parried or missed attack drains nothing',()=>{
 animist(60);run('APP.spiritCombatStart("Shade","50","8","",false)');
 dice([[30,100]]);run('APP.spiritCombatExchange("spirit","20")');
 assert.equal(run('S.play.spiritCombat.pending.hit'),false);run('APP.spiritCombatApply([])');
 assert.equal(run('S.play.magic'),12);
 dice([[95,100]]);run('APP.spiritCombatExchange("pc","20")');assert.equal(run('S.play.spiritCombat.pending.hit'),false);
 run('APP.spiritCombatApply([])');assert.equal(run('S.play.spiritCombat.foe.mp'),8);
});
test('AN-F06 the spirit hurts you: your MP falls',()=>{
 animist(60);run('APP.spiritCombatStart("Shade","50","8","",false)');
 dice([[80,100]]);run('APP.spiritCombatExchange("spirit","25")');assert.equal(run('S.play.spiritCombat.pending.hit'),true);
 dice([[4,6]]);run('APP.spiritCombatApply([])');assert.equal(run('S.play.magic'),8);
});
test('AN-F06 at zero MP the loser is helpless and the GM must choose what follows',()=>{
 animist(60);run('APP.spiritCombatStart("Shade","50","3","",false)');
 dice([[30,100]]);run('APP.spiritCombatExchange("pc","90")');dice([[6,6]]);run('APP.spiritCombatApply([])');
 assert.equal(run('S.play.spiritCombat.over.loser'),'spirit');assert.equal(run('S.play.spiritCombat.over.consequence'),'','nothing preselected');
 run('APP.spiritCombatExchange("pc","50")');assert.equal(run('S.play.spiritCombat.pending'),null,'no exchanges after defeat');
 run('APP.spiritCombatConsequence("Possession","",true)');assert.equal(run('S.play.spiritCombat.over.consequence'),'Possession');
 animist(60);run('APP.spiritCombatStart("Shade","50","3","",false)');
 dice([[30,100]]);run('APP.spiritCombatExchange("pc","90")');dice([[6,6]]);run('APP.spiritCombatApply([])');
 run('APP.spiritCombatConsequence("","",true)');assert.match(msg(),/Choose what the GM rules/);
 run('APP.spiritCombatConsequence("Binding","",false)');assert.match(msg(),/GM has decided/);
 run('APP.spiritCombatConsequence("Made up","",true)');assert.equal(run('S.play.spiritCombat.over.consequence'),'');
 reload();assert.equal(run('S.play.spiritCombat.over.loser'),'spirit');
 run('APP.spiritCombatConsequence("Binding","into a fetish",true)');reload();
 assert.equal(run('S.play.spiritCombat.over.consequence'),'Binding');assert.match(run('S.play.spiritCombat.log.at(-1)'),/GM: Binding \(into a fetish\)/);
});
test('AN-F06 a recorded spirit\'s MP follows the combat',()=>{
 animist(60);run('S.magic.known=[{tradition:"animism",name:"Ash",pow:8,cha:8,intensity:1,spiritStatus:"unbound",spiritMP:8}];normalizeState()');
 run('APP.spiritCombatStart("","50","8","0",false)');assert.equal(run('S.play.spiritCombat.foe.name'),'Ash');
 dice([[30,100]]);run('APP.spiritCombatExchange("pc","90")');dice([[3,6]]);run('APP.spiritCombatApply([])');
 assert.equal(run('S.magic.known[0].spiritMP'),5);
});
test('AN-F06 start and roll inputs are checked',()=>{
 animist(60);run('APP.spiritCombatStart("Shade","x","8","",false)');assert.equal(run('S.play.spiritCombat'),null);
 run('APP.spiritCombatStart("Shade","50","0","",false)');assert.equal(run('S.play.spiritCombat'),null);
 run('APP.spiritCombatStart("Shade","50","8","",false)');run('APP.spiritCombatExchange("pc","101")');
 assert.equal(run('S.play.spiritCombat.pending'),null);assert.match(msg(),/1–100/);
});

// ---------- AN-F07 ----------
test('AN-F07 every effect appears only in its printed column(s)',()=>{
 const all={actor:'mortal',critical:true,spiritFumbled:true,canPossess:true};
 const off=new Set([...opts({...all,role:'off'}),...opts({...all,role:'off',actor:'spirit'})]);
 const def=new Set([...opts({...all,role:'def'}),...opts({...all,role:'def',actor:'spirit'})]);
 assert.deepEqual([...off].sort(),['Bleed Essence','Compel Bargain','Drive Off','Leech Strength','Possess','Psychic Stun','Restrain','Spirit Lance','Sunder Binding','Suppress Ability']);
 assert.deepEqual([...def].sort(),['Bleed Essence','Obscure','Psychic Stun','Restrain','Sunder Binding','Suppress Ability','Turn Back','Withdraw']);
});
test('AN-F07 critical, Spirit Fumbles, mortal, spirit and possession gates',()=>{
 const o=x=>opts(Object.assign({role:'off',actor:'mortal'},x));
 assert.ok(!o({}).includes('Bleed Essence'));assert.ok(o({critical:true}).includes('Bleed Essence'));
 assert.ok(!o({}).includes('Leech Strength'));assert.ok(o({critical:true}).includes('Leech Strength'));
 assert.ok(!opts({role:'def',actor:'mortal'}).includes('Obscure'));assert.ok(opts({role:'def',actor:'mortal',critical:true}).includes('Obscure'));
 assert.ok(!o({critical:true}).includes('Sunder Binding'),'a critical is not a Spirit Fumble');assert.ok(o({spiritFumbled:true}).includes('Sunder Binding'));
 for(const m of ['Drive Off','Restrain','Suppress Ability']){assert.ok(o({}).includes(m));assert.ok(!o({actor:'spirit'}).includes(m),m+' mortal only');}
 assert.ok(!o({canPossess:true}).includes('Possess'),'mortals never possess');
 assert.ok(!o({actor:'spirit'}).includes('Possess'));assert.ok(o({actor:'spirit',canPossess:true}).includes('Possess'));
 const physical=run('JSON.stringify(SPECIAL_EFFECTS.map(x=>x[0]))');
 for(const n of o({critical:true,spiritFumbled:true}))assert.ok(!JSON.parse(physical).includes(n),n+' is not a physical effect');
});
test('AN-F07 the exchange offers only the winner\'s legal effects; GM effects are not applied',()=>{
 animist(60);run('APP.spiritCombatStart("Shade","50","8","",true)');
 dice([[99,100]]);run('APP.spiritCombatExchange("spirit","1")');// spirit Critical vs your Fumble
 const sp=JSON.parse(run('JSON.stringify(spiritCombatPendingOptions())'));
 assert.ok(sp.includes('Possess'));assert.ok(sp.includes('Leech Strength'));assert.ok(!sp.includes('Drive Off'));
 dice([[50,100]]);run('APP.spiritCombatApply(["Drive Off"])');assert.match(msg(),/Choose up to/);
 run('APP.spiritCombatEnd()');
 animist(60);run('APP.spiritCombatStart("Shade","50","8","",false)');
 dice([[1,100]]);run('APP.spiritCombatExchange("spirit","100")');// your Critical parry vs its Fumble
 const me=JSON.parse(run('JSON.stringify(spiritCombatPendingOptions())'));
 assert.ok(me.includes('Sunder Binding'));assert.ok(me.includes('Turn Back'));assert.ok(!me.includes('Spirit Lance'));
 run('APP.spiritCombatApply(["Psychic Stun","Psychic Stun","Withdraw","Turn Back","Obscure"])');assert.match(msg(),/Choose up to 3/);
 run('APP.spiritCombatApply(["Psychic Stun","Withdraw"])');
 assert.equal(run('S.play.magic'),12);assert.equal(run('S.play.spiritCombat.foe.mp'),8);
 assert.match(run('S.play.spiritCombat.log[0]'),/You chose: Psychic Stun, Withdraw \(the GM applies these\)/);
 assert.match(run('pmSpiritCombatHTML()'),/Psychic Stun, Withdraw/);
});

// ---------- SO-C02 ----------
const sorcerer=()=>run('S=freshState();S.chars.POW=12;S.play.magic=20;S.magic.known=[{tradition:"sorcery",name:"Ward",shapingLevels:{Duration:1}},{tradition:"sorcery",name:"Bolt",shapingLevels:{}}];'+base
 +'acquiredProfs=()=>[{key:"inv:a",name:"Invocation",spec:"A",src:["career"]}];normalizeState();'
 +'magicSkillKey=n=>n==="Invocation"?"inv:a":null;magicSkillPct=n=>n==="Shaping"?47:null;finalPct=k=>k==="inv:a"?80:50;');
test('SO-C02 while invoking: attacks, other skills and other spells are refused',()=>{
 sorcerer();run('APP.castMagic(0)');assert.equal(run('S.play.sorceryCasting.completed'),1);
 run('APP.roll("std:Perception")');assert.match(msg(),/another skill roll would break it \(Core p\.119\)/);
 run('APP.rollWithWeapon("Unarmed","std:Unarmed","","attack")');assert.match(msg(),/an attack would break it/);
 run('APP.castMagic(1)');assert.match(msg(),/another spell would break it/);
 assert.equal(run('S.rollLog.length'),0,'nothing rolled');assert.equal(run('S.play.magic'),20,'no MP spent');
});
test('SO-C02 parry and evade are allowed; the GM may then make the final roll harder',()=>{
 sorcerer();run('APP.castMagic(0)');
 dice([[40,100]]);run('APP.roll("std:Evade")');assert.equal(run('S.rollLog.length'),1);assert.equal(run('S.play.sorceryCasting.reacted'),true);
 dice([[40,100]]);run('APP.rollWithWeapon("Unarmed","std:Unarmed","","defence")');assert.equal(run('S.rollLog.length'),2);
 assert.match(run('pmSorceryReactionHTML()'),/You reacted while casting/);
 run('APP.sorceryGmHarder("2")');reload();run(base);assert.equal(run('S.play.sorceryCasting.gmHarder'),2);
 dice([[30,100]]);run('APP.castMagic(0)');
 assert.equal(run('S.rollLog[0].pct'),40,'80% two Grades harder (Formidable) is 40%');assert.equal(run('S.play.sorceryCasting'),null);
 dice([[10,100]]);run('APP.roll("std:Perception")');assert.equal(run('S.rollLog[0].label').startsWith('Perception'),true,'free again after the cast');
});
test('SO-C02 without a reaction the final roll is unchanged; cancel and reload never double-charge',()=>{
 sorcerer();run('APP.castMagic(0)');assert.doesNotMatch(run('pmSorceryReactionHTML()'),/You reacted/);
 run('APP.sorceryGmHarder("1")');reload();run(base);
 run('APP.sorceryCancel()');assert.equal(run('S.play.sorceryCasting'),null);assert.equal(run('S.play.magic'),20);
 dice([[10,100]]);run('APP.roll("std:Perception")');assert.equal(run('S.rollLog.length'),1,'skills allowed after cancel');
 run('APP.castMagic(0)');reload();run(base);assert.equal(run('S.play.sorceryCasting.gmHarder'),0);assert.equal(run('S.play.magic'),20);
 dice([[30,100]]);run('APP.castMagic(0)');assert.equal(run('S.rollLog[0].pct'),80);
});
console.log('spirit-combat: all tests passed');
