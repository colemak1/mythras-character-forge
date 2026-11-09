// Subsystem 7, CRTR-B01–B05 (docs/creature-cases-batch-1.md): creature stat
// blocks in the GM Combat Tracker. The fixture is invented test data, not a
// Core bestiary entry. Run with `node tests/creature-cases.cjs`.
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
const hound=(over={})=>{
 const lines=Object.assign({name:'Name: Test Hound',str:'STR 2d6+3 10',con:'CON 3d6 11',siz:'SIZ 1d6+6 9',dex:'DEX 2d6+9 16',mind:'INS 2d6+6 13',pow:'POW 1d6+6 10',move:'Move 10',
  locs:['1-3 Right Hind Leg 2/4','4-6 Left Hind Leg 2/4','7-9 Hindquarters 2/5','10-12 Forequarters 2/6','13-15 Right Front Leg 2/3','16-18 Left Front Leg 2/3','19-20 Head 2+1/4'].join('\n'),
  weapon:'Weapon: Bite 1d8 natural',trait:'Trait: Night Sight',worn:'',skills:'Skills: Athletics 60%, Perception 70%'},over);
 return Object.values(lines).filter(Boolean).join('\n');
};
const parse=t=>JSON.parse(run('JSON.stringify(parseCreatureStatBlock('+JSON.stringify(t)+'))'));

test('CRTR-B02 a stat block keeps its own values, dice, move, weapons, traits and skills',()=>{
 const p=parse(hound());assert.deepEqual(p.errors,[]);assert.deepEqual(p.unread,[]);
 const c=p.creature;assert.equal(c.name,'Test Hound');assert.equal(c.chars.DEX,16);assert.equal(c.dice.STR,'2d6+3');
 assert.equal(c.move,'10');assert.deepEqual(c.weapons,[{name:'Bite',damage:'1d8',natural:true}]);assert.deepEqual(c.traits,['Night Sight']);
 assert.equal(c.locations.length,7);assert.match(c.skills,/Perception 70%/);
});
test('CRTR-B02 missing or unreadable lines are reported, never guessed',()=>{
 let p=parse(hound({name:'',pow:''}));assert(p.errors.some(e=>/Name/.test(e)));assert(p.errors.some(e=>/POW is missing/.test(e)));
 p=parse(hound({mind:'INS 13\nINT 12'}));assert(p.errors.some(e=>/not both/.test(e)));
 p=parse(hound({mind:''}));assert(p.errors.some(e=>/Give INT or INS/.test(e)));
 p=parse(hound({trait:'Breathes on things'}));assert.deepEqual(p.unread,['Breathes on things']);
});
test('CRTR-B01 an instinctive creature uses INS for AP, Initiative and INT-based skills',()=>{
 const c=JSON.stringify(parse(hound()).creature);
 assert.deepEqual(JSON.parse(run('JSON.stringify(creatureMind('+c+'))')),{key:'INS',value:13});
 const a=JSON.parse(run('JSON.stringify(creatureAttributes('+c+'))'));
 assert.equal(a.ap,3,'INS 13 + DEX 16 = 29');assert.equal(a.initBonus,15);assert.equal(a.damageMod,run('dmCalc(10,9)'));
 assert.equal(run('creatureSkillBase('+c+',"INT+POW")'),23,'Perception base uses INS');
 assert.equal(run('creatureSkillBase('+c+',"DEX×2")'),32);
 const sapient=JSON.stringify(parse(hound({mind:'INT 8'})).creature);
 assert.equal(run('creatureMind('+sapient+').key'),'INT');assert.equal(run('creatureAttributes('+sapient+').initBonus'),12);
});
test('CRTR-B03 natural armour protects but adds no Initiative penalty; worn armour does',()=>{
 const c=JSON.stringify(parse(hound()).creature);
 assert.equal(run('creatureAttributes('+c+').armourPenalty'),0);
 assert.equal(run('creatureDamageAfterArmour('+c+',"Forequarters",7)'),5,'2 natural armour');
 assert.equal(run('creatureDamageAfterArmour('+c+',"Head",7)'),4,'2 natural + 1 worn');
 assert.equal(run('creatureDamageAfterArmour('+c+',"Head",2)'),0);
 const worn=JSON.stringify(parse(hound({worn:'Worn armour ENC: 6'})).creature);
 assert.equal(run('creatureAttributes('+worn+').armourPenalty'),2,'6/5 rounds up (Core p.58)');assert.equal(run('creatureAttributes('+worn+').initBonus'),13);
});
test('CRTR-B04 hit locations come from the creature\'s own table, which must cover 1–20 once',()=>{
 const c=JSON.stringify(parse(hound()).creature);
 for(const [roll,loc] of [[1,'Right Hind Leg'],[3,'Right Hind Leg'],[4,'Left Hind Leg'],[12,'Forequarters'],[13,'Right Front Leg'],[18,'Left Front Leg'],[19,'Head'],[20,'Head']])
  assert.equal(run('creatureHitLocation('+c+','+roll+').name'),loc,'roll '+roll);
 assert.equal(run('creatureHitLocation('+c+',21)'),null);
 assert(parse(hound({locs:'1-10 Body 2/8\n12-20 Tail 1/5'})).errors.some(e=>/doesn't cover roll 11/.test(e)));
 assert(parse(hound({locs:'1-10 Body 2/8\n10-20 Tail 1/5'})).errors.some(e=>/10 is in both Body and Tail/.test(e)));
 assert(parse(hound({locs:'1-10 Wing 2/8\n11-20 wing 1/5'})).errors.some(e=>/appears twice/.test(e)));
 assert.equal(parse(hound({locs:'1-12 Coils 3/9\n13-20 Head 3/7'})).errors.length,0,'a serpent needs no arms');
});
test('CRTR-B05 natural weapons parry only with Formidable Natural Weapons',()=>{
 const plain=JSON.stringify(parse(hound()).creature);
 assert.equal(run('creatureCanParry('+plain+',{name:"Bite",natural:true}).ok'),false);
 assert.match(run('creatureCanParry('+plain+',{name:"Bite",natural:true}).reason'),/Evade or natural armour/);
 assert.equal(run('creatureCanParry('+plain+',{name:"Club",natural:false}).ok'),true);
 const fnw=JSON.stringify(parse(hound({trait:'Traits: Night Sight, Formidable Natural Weapons'})).creature);
 assert.equal(run('creatureCanParry('+fnw+',{name:"Bite",natural:true}).ok'),true);
});
test('CRTR-B02/B04 the GM tracker adds the creature with its own locations, HP and AP, and applies hits after armour',()=>{
 run('var __camp={id:"c1",session_state:null};CAMPAIGN_VIEW={campaign:__camp};sessionStateCampaignUnified=async()=>{};render=()=>{};'
  +'var __el={};document.querySelector=sel=>__el[sel]||null;');
 run('APP.gmCreatureDraft('+JSON.stringify(hound({pow:''}))+')');assert.match(run('creatureImportHTML()'),/POW is missing/);
 run('APP.gmAddCreature()');assert.equal(run('sessionStateOf(__camp).combatants.length'),0);
 run('APP.gmCreatureDraft('+JSON.stringify(hound())+');APP.gmAddCreature()');
 const c=JSON.parse(run('JSON.stringify(__camp.session_state.combatants[0])'));
 assert.equal(c.name,'Test Hound');assert.equal(c.ap.max,3);assert.deepEqual(c.locations.slice(0,2),['Right Hind Leg','Left Hind Leg']);
 assert.deepEqual(c.hp.Forequarters,{cur:6,max:6});assert(!c.locations.includes('Chest'));assert.equal(run('CREATURE_DRAFT'),'');
 const html=run('combatantCardHTML(__camp.session_state.combatants[0],false)');
 assert.match(html,/Creature/);assert.match(html,/uses INS for INT/);assert.match(html,/no parry: Evade or armour/);assert.match(html,/Roll hit location/);
 run('Math.random=()=>0.5;APP.gmCreatureRollLoc("'+c.id+'")');assert.equal(run('CREATURE_HIT["'+c.id+'"].loc'),'Forequarters','d20 11');
 run('__el["#cbtraw-'+c.id+'"]={value:"6"};APP.gmCreatureHit("'+c.id+'")');
 assert.equal(run('__camp.session_state.combatants[0].hp.Forequarters.cur'),2,'6 damage − 2 natural armour from 6 HP');
 run('Math.random=()=>0.95;APP.gmRollAllInit()');assert.equal(run('__camp.session_state.combatants[0].init'),25,'d10 (10) + Initiative bonus 15');
});

// ---------- CRTR-B06–B14: combat traits ----------
const tracker=(over)=>{run('var __camp={id:"c1",session_state:null};CAMPAIGN_VIEW={campaign:__camp};sessionStateCampaignUnified=async()=>{};render=()=>{};'
 +'var __el={};document.querySelector=sel=>__el[sel]||null;CREATURE_MSG={};CREATURE_HIT={};');
 run('APP.gmCreatureDraft('+JSON.stringify(hound(over))+');APP.gmAddCreature()');
 return run('__camp.session_state.combatants[0].id');};
const cb=()=>JSON.parse(run('JSON.stringify(__camp.session_state.combatants[0])'));
const card=()=>run('combatantCardHTML(__camp.session_state.combatants[0],false)');
const note=id=>run('CREATURE_MSG["'+id+'"]');
test('CRTR-B06 Fly replaces Evade only while airborne',()=>{
 const id=tracker({trait:'Trait: Flying',skills:'Skills: Evade 40%, Fly 75%'});
 assert.match(card(),/Defends with Evade 40%/);
 run('APP.gmCreatureState("'+id+'","airborne",true)');assert.equal(cb().cs.airborne,true);assert.match(card(),/Defends with Fly 75%/);
 tracker({skills:'Skills: Evade 40%, Fly 75%'});assert.equal(run('creatureDefence(__camp.session_state.combatants[0].creature,true).skill'),'Evade','no Flying trait, no substitution');
});
test('CRTR-B07 only a won leap adds one natural-weapon hit',()=>{
 const id=tracker({trait:'Trait: Leaper'});
 run('APP.gmCreatureLeap("'+id+'",true)');assert.match(note(id),/also lands one Bite hit \(1d8\)/);
 run('APP.gmCreatureLeap("'+id+'",false)');assert.match(note(id),/no bonus hit/);
 tracker({});assert.equal(run('creatureLeapBonus(__camp.session_state.combatants[0].creature,true)'),null,'no trait, no bonus');
 assert.doesNotMatch(card(),/Leaper/);
});
test('CRTR-B08 the grapple note shows only for a Grappler',()=>{
 tracker({trait:'Trait: Grappler'});assert.match(card(),/extra grapple follows/);
 tracker({});assert.doesNotMatch(card(),/grapple/);
});
test('CRTR-B09 each working head beyond the first adds an action; only an incapacitated or severed head loses it',()=>{
 const id=tracker({trait:'Trait: Multi-headed',locs:['1-6 Body 3/9','7-10 Tail 2/5','11-14 Left Head 2/4','15-17 Middle Head 2/4','18-20 Right Head 2/4'].join('\n')});
 assert.equal(cb().ap.max,5,'3 AP + 2 extra heads');assert.match(card(),/Working heads 3 \/ 3/);
 run('__el["#cbtdmg-'+id+'-Left_Head"]={value:"4"};APP.gmDamageLoc("'+id+'","Left Head","cbtdmg-'+id+'-Left_Head")');
 assert.equal(cb().hp['Left Head'].cur,0);assert.equal(cb().ap.max,5,'0 HP alone does not remove the action');
 assert.match(card(),/Left Head at 0 HP or less: resolve the wound/);
 run('APP.gmCreatureHead("'+id+'","Left Head",true)');assert.equal(cb().ap.max,4);assert.equal(cb().hp.Body.cur,9,'the body is untouched');
 assert.doesNotMatch(card(),/at 0 HP or less/);
 run('APP.gmApAdj("'+id+'",-4);APP.gmCreatureHead("'+id+'","Right Head",true)');
 assert.equal(cb().ap.max,3);assert.equal(cb().ap.used,3,'spent AP is capped at the new maximum');
 run('APP.gmCreatureHead("'+id+'","Right Head",false)');assert.equal(cb().ap.max,4,'a head marked by mistake can be restored');
 run('APP.gmCreatureHead("'+id+'","Body",true)');assert.deepEqual(cb().cs.headsOut,['Left Head'],'only head locations can be marked');
 tracker({locs:['1-10 Body 3/9','11-15 Left Head 2/4','16-20 Right Head 2/4'].join('\n')});assert.equal(cb().ap.max,3,'two heads without the trait add nothing');
});
test('CRTR-B10 breath costs 1 AP, needs the entry\'s recovery, and waits for it',()=>{
 const id=tracker({trait:'Trait: Breathe Flame'});
 run('APP.gmCreatureBreath("'+id+'")');assert.match(note(id),/Enter the breath recovery/);assert.equal(cb().ap.used,0);
 run('APP.gmCreatureState("'+id+'","breathRecovery","2");APP.gmCreatureBreath("'+id+'")');
 assert.equal(cb().ap.used,1);assert.match(note(id),/Evade to halve/);assert.match(card(),/Recovering: 2 turn/);
 run('APP.gmCreatureBreath("'+id+'")');assert.match(note(id),/Still recovering/);assert.equal(cb().ap.used,1);
 run('APP.gmAdvanceTurn();APP.gmAdvanceTurn()');assert.match(card(),/Breathe \(1 AP\)/,'recovered after its own turns');
 run('__camp.session_state.combatants[0].ap.used=3;APP.gmCreatureBreath("'+id+'")');assert.match(note(id),/No Action Points/);
});
test('CRTR-B11 trample refuses a target above half its SIZ',()=>{
 const id=tracker({trait:'Trait: Trample',siz:'SIZ 4d6+12 26'});
 run('__el["#cbttrample-'+id+'"]={value:"14"};APP.gmCreatureTrample("'+id+'")');assert.match(note(id),/Too big to trample: SIZ 14 is more than half the creature's SIZ 26/);
 run('__el["#cbttrample-'+id+'"]={value:"13"};APP.gmCreatureTrample("'+id+'")');assert.match(note(id),/Can trample SIZ 13/);
 assert.match(card(),/doubles the base Damage Modifier/);
 tracker({});assert.match(run('creatureTrampleCheck(__camp.session_state.combatants[0].creature,3)'),/doesn't have the Trample trait/);
});
test('CRTR-B12 venom comes only from Inject Venom, in place of damage and whatever the armour',()=>{
 const id=tracker({trait:'Trait: Venomous'});
 run('Math.random=()=>0.5;APP.gmCreatureRollLoc("'+id+'");__el["#cbtraw-'+id+'"]={value:"9"};APP.gmCreatureHit("'+id+'")');
 assert.match(note(id),/7 damage after armour\. An ordinary hit injects no venom/,'a damaging hit does not auto-inject');
 run('APP.gmCreatureVenom("'+id+'")');assert.match(note(id),/no attack damage; the poison is delivered whatever the armour/);
 assert.equal(cb().hp.Forequarters.cur,-1,'Inject Venom itself does no further damage');
 assert.equal(run('creatureVenomEligible(__camp.session_state.combatants[0].creature,true)'),true,'zero damage, armour irrelevant');
 assert.equal(run('creatureVenomEligible(__camp.session_state.combatants[0].creature,false)'),false,'no effect chosen, no venom');
 tracker({});assert.equal(run('creatureVenomEligible(__camp.session_state.combatants[0].creature,true)'),false,'no Venomous trait');
 run('APP.gmCreatureVenom("'+cb().id+'")');assert.equal(note(cb().id),undefined);assert.doesNotMatch(card(),/Inject Venom/);
});
test('CRTR-B13 frenzy is a state with an ending, not a permanent bonus',()=>{
 const id=tracker({trait:'Trait: Frenzy'});
 assert.match(card(),/Not a permanent bonus/);
 run('APP.gmCreatureState("'+id+'","frenzied",true)');assert.match(card(),/pain and fatigue penalties the trait names are ignored/);
 run('APP.gmCreatureState("'+id+'","frenzied",false)');assert.match(note(id),/Frenzy ended: apply the fatigue/);
});
test('CRTR-B14 undead: wounds don\'t incapacitate; binding location and destroy condition are recorded',()=>{
 const id=tracker({trait:'Trait: Undead'});
 assert.match(card(),/Serious and Major Wounds don&rsquo;t incapacitate or fatigue it/);
 run('APP.gmCreatureState("'+id+'","bindingLoc","Head");APP.gmCreatureState("'+id+'","destroyWhen","its binding location is destroyed")');
 assert.equal(cb().cs.bindingLoc,'Head');assert.equal(cb().cs.destroyWhen,'its binding location is destroyed');
 run('APP.gmCreatureState("'+id+'","bindingLoc","Wing")');assert.equal(cb().cs.bindingLoc,'','not one of its locations');
 run('APP.gmCreatureState("'+id+'","hp",1)');assert.equal(cb().cs.hp,undefined,'unknown state keys are ignored');
});

// ---------- CRTR-B15–B18 ----------
test('CRTR-B15 a bracketed trait keeps its sources, commas included',()=>{
 const c=parse(hound({trait:'Traits: Immunity (fire, poison), Vulnerable (silver), Allergy (iron)'})).creature;
 assert.deepEqual(c.traits,['Immunity (fire, poison)','Vulnerable (silver)','Allergy (iron)']);
});
test('CRTR-B15 the damage source is checked before armour',()=>{
 const id=tracker({trait:'Traits: Immunity (fire, poison), Vulnerable (silver), Allergy (iron)'});
 const hit=(raw,src)=>{run('Math.random=()=>0.5;APP.gmCreatureRollLoc("'+id+'");__el["#cbtraw-'+id+'"]={value:"'+raw+'"};__el["#cbtsrc-'+id+'"]={value:'+JSON.stringify(src)+'};APP.gmCreatureHit("'+id+'")');return note(id);};
 assert.match(card(),/Immunity \(fire, poison\) · Vulnerable \(silver\) · Allergy \(iron\)/);run('Math.random=()=>0.5;APP.gmCreatureRollLoc("'+id+'")');assert.match(card(),/cbtsrc-/,'source box appears with a rolled hit');
 assert.match(hit(9,'fire'),/0 damage\. Immune to fire/);assert.equal(cb().hp.Forequarters.cur,6);
 assert.match(hit(4,'silver sword'),/4 damage\. Vulnerable to silver: armour doesn't protect/);assert.equal(cb().hp.Forequarters.cur,2);
 assert.match(hit(3,'iron'),/1 damage\. Allergy \(iron\): contact at Forequarters/);
 assert.match(hit(3,''),/1 damage after armour/,'no source: ordinary armour');
 assert.match(hit(3,'firearm'),/1 damage after armour/,'a different word is not the listed source');
 tracker({});run('APP.gmCreatureRollLoc("'+cb().id+'")');assert.doesNotMatch(card(),/cbtsrc-/);
});
test('CRTR-B16 senses explain their limits and appear only with the trait',()=>{
 tracker({trait:'Traits: Camouflaged, Echolocation, Earth Sense'});
 assert.match(card(),/Not invisibility/);assert.match(card(),/Echolocation<\/b> Senses by sound, within the range/);assert.match(card(),/Earth Sense<\/b> Senses through the ground/);
 tracker({});assert.doesNotMatch(card(),/Echolocation|Camouflaged|Earth Sense/);
});
test('CRTR-B17 Intimidate resolves each target\'s Willpower and lasts the encounter',()=>{
 const id=tracker({trait:'Trait: Intimidate'});
 const roll=(who,tier)=>{run('__el["#cbtintim-'+id+'"]={value:'+JSON.stringify(who)+'};APP.gmCreatureIntimidate("'+id+'","'+tier+'")');return note(id);};
 assert.match(roll('Aria','Success'),/Aria holds their ground/);
 assert.match(roll('Bors','Failure'),/Bors spends their next round putting distance/);
 assert.match(roll('Cael','Fumble'),/Cael flees at full speed/);
 assert.match(roll('Dena','Critical'),/ignores this creature's intimidation for the rest of the encounter/);
 assert.match(roll('Dena','Fumble'),/Dena already ignores its intimidation/);assert.equal(cb().cs.intimidated.Dena,'immune');
 assert.match(roll('','Failure'),/Name the target first/);
 assert.match(card(),/Aria: holds, Bors: falls back, Cael: flees, Dena: ignores it/);
 run('APP.gmCreatureIntimidateClear("'+id+'")');assert.equal(cb().cs.intimidated,undefined);
 tracker({});run('__el["#cbtintim-'+cb().id+'"]={value:"X"};APP.gmCreatureIntimidate("'+cb().id+'","Fumble")');assert.equal(cb().cs.intimidated,undefined,'no trait, no intimidation');
});
test('CRTR-B18 only a sapient creature, with GM permission, can be a player character',()=>{
 const ins=JSON.stringify(parse(hound()).creature),sap=JSON.stringify(parse(hound({mind:'INT 12'})).creature);
 assert.match(run('creaturePcEligibility('+ins+',true).reason'),/instinctive \(INS\) creature can't be a player character/);
 assert.equal(run('creaturePcEligibility('+sap+',false).ok'),false);
 assert.equal(run('creaturePcEligibility('+sap+',true).ok'),true);
 const id=tracker({mind:'INT 12'});assert.match(card(),/only with the GM(&#39;|')s permission/);
 run('APP.gmCreatureState("'+id+'","pcPermitted",true)');assert.match(card(),/GM-permitted sapient creature/);
 tracker({});assert.doesNotMatch(card(),/As a character/);
});
// ---------- Anatomy presets, B19, B18 Points Build (Core pp.8, 218–219, 274–277) ----------
test('CRTR-B04 option: the 13 Core body plans each cover d20 1–20 once, and insert rows that need HP',()=>{
 const t=JSON.parse(run('JSON.stringify(CREATURE_ANATOMY)'));
 assert.equal(Object.keys(t).length,13);
 for(const [n,rows] of Object.entries(t)){const seen=[];rows.forEach(([lo,hi])=>{for(let r=lo;r<=hi;r++)seen.push(r);});assert.deepEqual(seen,Array.from({length:20},(_,i)=>i+1),n);}
 assert.deepEqual(t.Pachyderm.find(r=>r[2]==='Trunk'),[17,17,'Trunk']);
 assert.deepEqual(t['Tailed Arachnid'].find(r=>r[2]==='Right Pincer'),[13,15,'Right Pincer']);
 const draft=hound({locs:run('creatureAnatomyLines("Draconic")')});
 const p=parse(draft);assert.match(p.errors.join(' '),/Give Right Wing its HP/);assert.deepEqual(p.unread,[]);
 assert.deepEqual(parse(draft.replace(/0\/\?/g,'3/7')).errors,[],'filled in, the plan imports');
});
test('CRTR-B19 a Chaos Feature is rolled on the Core d100 table and kept with the creature',()=>{
 assert.equal(run('CHAOS_FEATURES.length'),50);
 const f=r=>JSON.parse(run('JSON.stringify(chaosFeatureFor('+r+'))'));
 assert.equal(f(1).name,'Acidic');assert.equal(f(2).range,'01–02');assert.equal(f(19).name,'Corroding');assert.equal(f(62).name,'Perceptive');
 assert.equal(f(63).name,'Poisonous');assert.equal(f(100).name,'Weakening');assert.equal(f(100).range,'99–00');assert.equal(f(0),null);assert.equal(f(101),null);
 const id=tracker({trait:'Trait: Chaos Feature'});
 run('APP.gmCreatureChaos("'+id+'",()=>0.385)');assert.deepEqual(cb().cs.chaos,[{roll:39}]);
 assert.match(note(id),/39–40: Intangible|Chaos Feature 39–40: Intangible/);assert.match(card(),/39–40 Intangible<\/b>: Passes through solid objects/);
 run('APP.gmCreatureChaosRemove("'+id+'",0)');assert.deepEqual(cb().cs.chaos,[]);
 tracker({});run('APP.gmCreatureChaos("'+cb().id+'",()=>0.5)');assert.equal(cb().cs&&cb().cs.chaos,undefined,'no trait, no roll');
});
test('CRTR-B18 a GM-permitted creature PC uses the nonhuman Points Build: average total, dice ranges, all points spent',()=>{
 const c=parse(hound({mind:'INT 2d6+6 13',cha:'CHA 1d6 4'})).creature,cj=JSON.stringify(c);
 const pb=JSON.parse(run('JSON.stringify(creaturePointsBuild('+cj+'))'));
 // averages 10+10.5+9.5+16+13+9.5+3.5 = 72
 assert.equal(pb.pool,72);assert.deepEqual(pb.ranges.STR,{min:5,max:15,avg:10});assert.deepEqual([pb.ranges.CHA.min,pb.ranges.CHA.max],[1,6]);
 const chk=v=>JSON.parse(run('JSON.stringify(creaturePointsCheck('+cj+','+JSON.stringify(v)+'))'));
 assert.deepEqual(chk({STR:10,CON:11,SIZ:9,DEX:16,INT:13,POW:10,CHA:3}),[]);
 assert.match(chk({STR:4,CON:11,SIZ:9,DEX:16,INT:13,POW:10,CHA:9}).join(' '),/STR can't be below 5.*CHA can't be above 6/);
 assert.match(chk({STR:10,CON:11,SIZ:9,DEX:16,INT:13,POW:10,CHA:2}).join(' '),/Spend exactly 72 points \(71 spent\)/);
 assert.equal(run('creatureDiceRange("2d6+6").avg'),13);assert.equal(run('creatureDiceRange("3d6").avg'),10.5);
 const id=tracker({mind:'INT 2d6+6 13'});run('APP.gmCreatureState("'+id+'","pcPermitted",true)');
 assert.match(card(),/Points Build: \d+ points, all spent, each within STR 5–15/);
});
console.log('Creature case tests passed');
test('live batch 2026-11-09: a board redraw keeps open sections, unsaved typing and focus, but not over a server change',()=>{
 run('globalThis.CSS=globalThis.CSS||{escape:s=>s};');
 run(`var __o=(()=>{const det={open:true,querySelector:()=>({textContent:"Add a creature from its stat block"})};
  const ta={id:"gmCreatureText",type:"textarea",tagName:"TEXTAREA",value:"Name: Wyrm",defaultValue:"",selectionStart:5,selectionEnd:5};
  const raw={id:"cbtraw-x",type:"number",tagName:"INPUT",value:"7",defaultValue:"3"};
  return {querySelectorAll:s=>s==="details"?[det]:[ta,raw],contains:()=>true};})();
  document.activeElement={id:"gmCreatureText",selectionStart:5,selectionEnd:5};
  var __snap=boardFormSnapshot(__o);
  var __det={open:false,querySelector:()=>({textContent:"Add a creature from its stat block"})};
  var __focused=null,__sel=null;
  var __ta={id:"gmCreatureText",value:"",defaultValue:"",focus(){__focused="ta";},setSelectionRange(a,b){__sel=[a,b];}};
  var __raw={id:"cbtraw-x",value:"9",defaultValue:"9"};
  var __n={querySelectorAll:s=>s==="details"?[__det]:[__ta,__raw],querySelector:s=>s==="#gmCreatureText"?__ta:s==="#cbtraw-x"?__raw:null};
  boardFormRestore(__n,__snap);`);
 assert.equal(run('__det.open'),true,'the creature form stays open');
 assert.equal(run('__ta.value'),'Name: Wyrm','typed text survives');
 assert.equal(run('__focused'),'ta');assert.deepEqual(JSON.parse(run('JSON.stringify(__sel)')),[5,5]);
 assert.equal(run('__raw.value'),'9','a field the server changed keeps the server value');
});
console.log('Board redraw test passed');
