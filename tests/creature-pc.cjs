// Subsystem 7, CRTR-B18 builder path and CRTR-B20 per-entry mechanics
// (docs/creature-cases-batch-1.md; Core pp.8, 218–220). Fixtures are invented
// test data, not Core bestiary entries. Run with `node tests/creature-pc.cjs`.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setTimeout,clearTimeout,setInterval,clearInterval,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app','practice']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
const test=(name,fn)=>{fn();console.log('PASS '+name);};
run('render=()=>{};var __el={};document.querySelector=sel=>__el[sel]||null;');
// A sapient biped. Averages: 10.5+13+13+10.5+13+10.5+7 = 77.5 → pool 78.
const folk=(over={})=>Object.values(Object.assign({name:'Name: Test Folk',str:'STR 3d6 11',con:'CON 2d6+6 13',siz:'SIZ 2d6+6 13',dex:'DEX 3d6 11',
 mind:'INT 2d6+6 13',pow:'POW 3d6 11',cha:'CHA 2d6 7',move:'Move 6',
 locs:['1-3 Tail 2/5','4-5 Right Leg 2/5','6-7 Left Leg 2/5','8-10 Abdomen 2/6','11-14 Chest 2/7','15-16 Right Arm 2/4','17-18 Left Arm 2/4','19-20 Head 2/5'].join('\n'),
 weapon:'Weapon: Claw 1d6 natural',trait:'Traits: Night Sight',extra:''},over)).filter(Boolean).join('\n');
const parse=t=>JSON.parse(run('JSON.stringify(parseCreatureStatBlock('+JSON.stringify(t)+'))'));
const use=(text,approved)=>{run('S=freshState();normalizeState();CREATURE_PC_MSG=[];__el["#creaturePcText"]={value:'+JSON.stringify(text)+'};__el["#creaturePcApproved"]={checked:'+!!approved+'};APP.useCreaturePc()');};
const msg=()=>run('CREATURE_PC_MSG.join(" | ")');

test('CRTR-B18 the INT 8+ floor: a creature below INT 8 can\'t be a character, even with permission',()=>{
 const c=t=>JSON.stringify(parse(folk({mind:t})).creature);
 assert.match(run('creaturePcEligibility('+c('INT 1d6+1 4')+',true).reason'),/Only a creature with INT 8 or more/);
 assert.equal(run('creaturePcEligibility('+c('INT 1d6+1 7')+',true).ok'),false);
 assert.equal(run('creaturePcEligibility('+c('INT 2d6+1 8')+',true).ok'),true);
 assert.match(run('creaturePcEligibility('+c('INS 2d6+6 13')+',true).reason'),/instinctive \(INS\)/);
});
test('CRTR-B18 the builder refuses without GM approval, without INT 8+, or without all seven dice and a Move',()=>{
 use(folk(),false);assert.equal(run('S.species'),null);assert.match(msg(),/only with the GM's permission/);
 use(folk({mind:'INT 1d6+1 5'}),true);assert.equal(run('S.species'),null);assert.match(msg(),/INT 8 or more/);
 use(folk({cha:''}),true);assert.match(msg(),/CHA is missing: a character needs all seven/);
 use(folk({cha:'CHA 7'}),true);assert.match(msg(),/Add the characteristic dice for CHA/);
 use(folk({move:''}),true);assert.match(msg(),/Add the creature's Move/);
 use(folk({extra:'Waves its arms'}),true);assert.match(msg(),/Lines not understood: Waves its arms/);
 assert.match(run('creaturePcPickerHTML()'),/Play a creature your GM approved/);
});
test('CRTR-B18 an approved creature becomes the species: its dice, ranges, Move, Points Build pool and anatomy',()=>{
 run('S=freshState();normalizeState();S.chars.STR=12;');use(folk(),true);
 assert.equal(run('S.species'),'creature');assert.equal(run('S.creaturePc.gmApproved'),true);
 assert.match(run('S.creaturePc.approvedOn'),/^\d{4}-\d{2}-\d{2}$/);
 assert.equal(run('CHARS.every(c=>S.chars[c]==null)'),true,'characteristics reset');
 const sp=JSON.parse(run('JSON.stringify(speciesDef())'));
 assert.equal(sp.label,'Test Folk');assert.equal(sp.move,6);assert.equal(sp.dice.CHA,'2d6');
 assert.deepEqual(sp.bounds.STR,[3,18]);assert.deepEqual(sp.bounds.CHA,[2,12]);assert.deepEqual(sp.bounds.INT,[8,18]);
 assert.equal(run('pbPool()'),78,'averages 77.5 rounded up, no +6 (Core p.219)');
 assert.equal(sp.locations.length,8);assert.equal(run('moveBase()'),6);
 assert.match(run('speciesCard()'),/Test Folk/);assert.match(run('speciesCard()'),/Tail/);assert.match(run('speciesCard()'),/Culture and career are chosen as normal/);
 assert.match(run('speciesCard()'),/Natural weapon: Claw/);
});
test('CRTR-B18 the character\'s own INT can\'t go below 8, even when the dice could',()=>{
 use(folk({mind:'INT 2d6+3 10'}),true);
 assert.deepEqual(JSON.parse(run('JSON.stringify(charBounds("INT"))')),{min:8,max:15});
 run('S.charMode="manual";Object.assign(S.chars,{STR:11,CON:13,SIZ:13,DEX:11,INT:7,POW:11,CHA:7})');
 assert.match(run('validate(currentSteps().indexOf("Characteristics")).msg'),/INT must be between 8 and 15/);
});
test('CRTR-B18 Points Build validates the creature pool and its dice ranges',()=>{
 use(folk(),true);
 run('S.charMode="pb";Object.assign(S.chars,{STR:11,CON:13,SIZ:13,DEX:11,INT:13,POW:11,CHA:6})');
 assert.equal(run('validate(currentSteps().indexOf("Characteristics")).ok'),true,'78 points spent');
 run('S.chars.CHA=5');assert.match(run('validate(currentSteps().indexOf("Characteristics")).msg'),/use all 78 points \(77 spent\)/);
 run('S.chars.CHA=1;S.chars.STR=15');assert.match(run('validate(currentSteps().indexOf("Characteristics")).msg'),/CHA must be between 2 and 12/);
 run('S.charMode="roll";Math.random=()=>0;APP.rollSpeciesAll()');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.chars)')),{STR:3,CON:8,SIZ:8,DEX:3,INT:8,POW:3,CHA:2},'own dice; INT 2d6+6 minimum 8');
});
test('CRTR-B18 culture and career stay normal, and the sheet and Play Mode show the creature anatomy',()=>{
 use(folk(),true);
 assert.ok(run('currentSteps().includes("Culture")&&currentSteps().includes("Career")'));
 run('S.charMode="pb";Object.assign(S.chars,{STR:11,CON:13,SIZ:13,DEX:11,INT:13,POW:11,CHA:6})');
 assert.match(run('pmCharSubtitle()'),/^Test Folk/);
 assert.match(run('pmBodyBoxHTML()'),/Test Folk body: its own locations/);
 assert.match(run('creatureAnatomyTableHTML(speciesDef().locations)'),/1&ndash;3<\/td><td>Tail/);
});
test('CRTR-C03 Play Mode tracks a creature character\'s own locations, HP and natural armour (Core pp.218–219)',()=>{
 use(folk(),true);
 run('S.charMode="pb";Object.assign(S.chars,{STR:11,CON:13,SIZ:13,DEX:11,INT:13,POW:11,CHA:6});S.play=S.play||{};S.play.hp={};');
 assert.deepEqual([...run('playHPLocs()')],['Tail','Right Leg','Left Leg','Abdomen','Chest','Right Arm','Left Arm','Head']);
 const v=JSON.parse(run('JSON.stringify(charVitals().locs.map(l=>[l.loc,l.cur,l.max]))'));
 assert.deepEqual(v.find(l=>l[0]==='Tail'),['Tail',5,5]);assert.deepEqual(v.find(l=>l[0]==='Chest'),['Chest',7,7]);
 assert.equal(run('hitD20For("Tail")'),'1–3');assert.equal(run('hitD20For("Right Leg")'),'4–5');
 assert.equal(run('playLocAP("Tail")'),2,'natural armour from the entry');
 const box=run('pmBodyBoxHTML()');assert.match(box,/APP\.pmOpenLoc\('Tail'\)/);assert.doesNotMatch(box,/pmx-fig"/,'no human figure');
 // Damage goes through natural armour and lands on the creature's own location.
 run('VIEW_ONLY=false;viewOnlyBlock=()=>false;__el["#playdmg-Tail"]={value:"9"};APP.playApplyDamage("Tail")');
 assert.equal(run('playCurHP("Tail")'),-2);assert.equal(run('playHPState("Tail").cls'),'serious');
 assert.equal(run('S.play.hp["Tail"]'),-2,'stored under the creature\'s location name, so it saves and reloads');
 assert.equal(run('CombatRules.isLimb("Right Leg")'),true);assert.equal(run('CombatRules.isLimb("Tail")'),false);
 // A human character keeps the seven human boxes.
 run('S=freshState();normalizeState();');assert.equal(run('playHPLocs().length'),7);
});
test('CRTR-B18 a saved creature character survives reload; a tampered one is refused',()=>{
 use(folk(),true);
 run('var __saved=JSON.parse(JSON.stringify(S));S=Object.assign(freshState(),__saved);normalizeState()');
 assert.equal(run('S.species'),'creature');assert.equal(run('speciesDef().label'),'Test Folk');
 run('__saved.creaturePc.gmApproved=false;S=Object.assign(freshState(),JSON.parse(JSON.stringify(__saved)));normalizeState()');
 assert.equal(run('S.species'),null,'no approval, no creature');
 run('__saved.creaturePc.gmApproved=true;__saved.creaturePc.chars.INT=6;S=Object.assign(freshState(),JSON.parse(JSON.stringify(__saved)));normalizeState()');
 assert.equal(run('S.species'),null,'INT below 8 refused on load');
 run('__saved.creaturePc.chars.INT=13;var __fx=JSON.parse(JSON.stringify(__saved));');
 assert.equal(run('effectiveChars(Object.assign(__fx,{chars:{STR:11,CON:13,SIZ:13,DEX:11,INT:13,POW:11,CHA:6}})).INT'),13,'party board reads a saved creature state');
});
test('CRTR-B18 switching back to Human clears the creature; The Pits refuses a creature character',()=>{
 use(folk(),true);run('APP.pickSpecies("human")');assert.equal(run('S.species'),'human');assert.equal(run('S.creaturePc'),null);
 use(folk(),true);run('Object.assign(S.chars,{STR:11,CON:13,SIZ:13,DEX:11,INT:13,POW:11,CHA:6})');
 assert.throws(()=>run('practiceSnapshot({state:JSON.parse(JSON.stringify(S))})'),/creature character can't fight here yet/);
});
test('CRTR-B18 the GM tracker copies a permitted creature as a stat block the builder reads back',()=>{
 run('var __camp={id:"c1",session_state:null};CAMPAIGN_VIEW={campaign:__camp};sessionStateCampaignUnified=async()=>{};CREATURE_MSG={};');
 run('APP.gmCreatureDraft('+JSON.stringify(folk({extra:'Ability: Shed Skin: Once a day, sheds its skin as the entry says.'}))+');APP.gmAddCreature()');
 const id=run('__camp.session_state.combatants[0].id'),card=()=>run('combatantCardHTML(__camp.session_state.combatants[0],false)');
 assert.doesNotMatch(card(),/Copy stat block for the player/,'not before permission');
 run('APP.gmCreatureState("'+id+'","pcPermitted",true)');assert.match(card(),/Copy stat block for the player/);
 const text=run('creatureStatBlockText(__camp.session_state.combatants[0].creature)');
 const back=parse(text);assert.deepEqual(back.errors,[]);assert.deepEqual(back.unread,[]);
 assert.deepEqual(back.creature,JSON.parse(run('JSON.stringify(__camp.session_state.combatants[0].creature)')),'round trip');
 run('var __copied=null;navigator={clipboard:{writeText:t=>{__copied=t;return {then:(ok)=>ok()};}}};APP.gmCreatureCopyForPlayer("'+id+'")');
 assert.equal(run('__copied'),text);assert.match(run('CREATURE_MSG["'+id+'"]'),/Stat block copied/);
 use(text,true);assert.equal(run('S.species'),'creature');
 assert.match(run('speciesCard()'),/Ability: Shed Skin/);
});

// ---------- CRTR-B20: one child fixture per kind of entry-specific mechanic ----------
const kinds=[
 ['Ability','Ability: Shed Skin: Once a day, sheds its skin as the entry says.',{kind:'ability',name:'Shed Skin',text:'Once a day, sheds its skin as the entry says.'}],
 ['Poison','Poison: Marsh Venom: Potency, onset and effect as the entry gives.',{kind:'poison',name:'Marsh Venom',text:'Potency, onset and effect as the entry gives.'}],
 ['Magic','Magic: Folk Magic 60%, spells as listed in the entry.',{kind:'magic',name:'Magic',text:'Folk Magic 60%, spells as listed in the entry.'}],
 ['Spells','Spells: Theism: miracles as listed in the entry.',{kind:'magic',name:'Theism',text:'miracles as listed in the entry.'}],
 ['Weapon effect','Weapon effect: Claw: Bleed on a critical, as the entry says.',{kind:'weapon',name:'Claw',text:'Bleed on a critical, as the entry says.'}]
];
for(const [label,line,want] of kinds)test('CRTR-B20 '+label+' lines are kept as entered and marked GM-resolved',()=>{
 const p=parse(folk({extra:line}));assert.deepEqual(p.errors,[]);assert.deepEqual(p.unread,[]);
 assert.deepEqual(p.creature.abilities,[want]);
 run('var __camp={id:"c1",session_state:null};CAMPAIGN_VIEW={campaign:__camp};sessionStateCampaignUnified=async()=>{};CREATURE_MSG={};');
 run('APP.gmCreatureDraft('+JSON.stringify(folk({extra:line}))+');APP.gmAddCreature()');
 const html=run('combatantCardHTML(__camp.session_state.combatants[0],false)');
 assert.match(html,/<b>GM-resolved<\/b> Applied by the GM as the entry describes; the app adds no effect of its own/);
 assert.ok(html.includes(run('esc('+JSON.stringify(want.text)+')')),'entry text shown');
});
test('CRTR-B20 a weapon effect must name a listed weapon, and an ability needs a name',()=>{
 assert.match(parse(folk({extra:'Weapon effect: Tail Lash: knocks prone'})).errors.join(' '),/Weapon effect Tail Lash needs a matching Weapon: line/);
 assert.match(parse(folk({extra:'Ability: does something'})).errors.join(' '),/Write the Ability line as Name: what it does/);
});
test('CRTR-B20 traits the tracker has no controls for are listed as GM-resolved; handled ones are not',()=>{
 const c=JSON.stringify(parse(folk({trait:'Traits: Night Sight, Flying, Breathe Flame, Immunity (fire), Chaos Features, Regenerates'})).creature);
 assert.deepEqual(JSON.parse(run('JSON.stringify(creatureGmResolved('+c+').traits)')),['Night Sight','Regenerates']);
 assert.equal(run('creatureTraitHandled("Multi-Headed")'),true);assert.equal(run('creatureTraitHandled("Flyer")'),false);
});
test('CRTR-B20 older saved creatures without abilities still load and render',()=>{
 const c=parse(folk()).creature;delete c.abilities;
 assert.deepEqual(JSON.parse(run('JSON.stringify(creatureGmResolved('+JSON.stringify(c)+').abilities)')),[]);
 assert.doesNotMatch(run('creatureStatBlockText('+JSON.stringify(c)+')'),/undefined/);
});
console.log('Creature PC and per-entry tests passed');
