// Subsystem 5 (docs/combat-cases-batch-1.md): combat mechanics the app
// calculates, checked against Mythras Core pp.51, 58, 86-111.
// Run with `node tests/combat-cases.cjs`.
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
run('render=()=>{};viewOnlyBlock=()=>false;');

test('C5-R01 Action Points: 1 at INT+DEX 12, 2 at 13-24, 3 at 25-36, +1 per further 12',()=>{
 for(const [sum,ap] of [[12,1],[13,2],[24,2],[25,3],[36,3],[37,4],[48,4],[49,5]])assert.equal(run(`apCalc(${sum-6},6)`),ap,'INT+DEX '+sum);
});
test('C5-R03 Initiative Bonus is the average of INT and DEX, rounded up',()=>{
 assert.equal(run('initBonus(13,14)'),14);assert.equal(run('initBonus(12,14)'),13);
});
test('C5-R05/R06 armour penalty is total worn armour ENC / 5 rounded up; 7 locations of ENC 4 give -6 (pp.58, 90)',()=>{
 run('S=freshState();armorPackedEncAt=()=>4;');assert.equal(run('armourPenaltyToInit()'),6);
 run('armorPackedEncAt=()=>0;');assert.equal(run('armourPenaltyToInit()'),0);
 run('armorPackedEncAt=loc=>loc==="Head"?5:0;');assert.equal(run('armourPenaltyToInit()'),1);
});
test('C5-R03/R07 initiative roll is 1d10 + current bonus, kept for the fight, and validated on load',()=>{
 run('S=freshState();var __ib=playInitiativeBonusNow;playInitiativeBonusNow=()=>({base:14,armour:2,fat:0,total:12});var __r=Math.random;Math.random=()=>0.65;APP.playRollInitiative();Math.random=__r;');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.play.initiative)')),{roll:7,bonus:12,total:19});
 run('S.play.apUsed=2;APP.playNewRound();');assert.equal(run('S.play.initiative.total'),19,'a new round keeps initiative');
 run('document.getElementById=id=>id==="playInitD10"?{value:"11"}:null;APP.playSetInitiative();');assert.match(run('PM_MSG'),/1 to 10/);
 run('document.getElementById=id=>id==="playInitD10"?{value:"3"}:null;APP.playSetInitiative();');assert.equal(run('S.play.initiative.total'),15);
 run('S.play.initiative={roll:3,bonus:12,total:99};normalizeState();');assert.equal(run('S.play.initiative'),null,'tampered totals are dropped');
 run('APP.playRollInitiative();APP.playClearInitiative();');assert.equal(run('S.play.initiative'),null);
 run('playInitiativeBonusNow=__ib;');
});
test('C5-R13 New Round restores every Action Point',()=>{
 run('S=freshState();playMaxAP=()=>3;APP.playSpendAP(1);APP.playSpendAP(1);');assert.equal(run('S.play.apUsed'),2);
 run('APP.playNewRound()');assert.equal(run('S.play.apUsed'),0);
});
test('C5-A01..A23 the action list follows Core pp.91-93 names and costs',()=>{
 const src=fs.readFileSync(path.join(root,'js/play.js'),'utf8');
 for(const n of ['Attack','Brace','Cast Magic','Change Range','Dither','Hold Magic','Mount','Move','Outmanoeuvre','Ready Weapon','Regain Footing','Struggle'])
  assert.match(src,new RegExp('\\{nm:"'+n+'",ap:1,kind:"Proactive"'),n);
 for(const n of ['Counter Spell','Evade','Interrupt','Parry'])assert.match(src,new RegExp('\\{nm:"'+n+'",ap:1,kind:"Reactive"'),n);
 for(const n of ['Delay','Assess Situation','Drop Weapon','Signal','Speak','Use Luck Point','Ward Location'])assert.match(src,new RegExp('\\["'+n+'"'),n+' is a free (0 AP) entry');
 assert.doesNotMatch(src,/Change Combat Stance|Shove \/ Grapple|Dodge \/ Evade/,'non-Core action labels are gone');
});
test('C5-P03..P10, E01, E02 Differential table (Core p.51)',()=>{
 const t=(a,b)=>run(`playEffectsWon("${a}","${b}")`);
 assert.equal(t('Success','Failure'),1);assert.equal(t('Critical','Failure'),2);assert.equal(t('Success','Fumble'),2);assert.equal(t('Critical','Fumble'),3);
 assert.equal(t('Success','Success'),0);assert.equal(t('Critical','Critical'),0);assert.equal(t('Failure','Failure'),0);
 assert.equal(t('Failure','Fumble'),0);assert.equal(t('Fumble','Fumble'),0);assert.equal(t('Failure','Success'),-1);
});
test('C5-P09 no parry counts as a failed defence',()=>{
 run('S=freshState();S.rollLog=[{label:"Sword",pct:60,roll:30,tier:"Success",combat:true,combatKind:"style",combatRole:"attack",oppTier:null}];APP.playNoParry(0);');
 assert.equal(run('S.rollLog[0].oppTier'),'Failure');assert.equal(run('playEffectsWon(S.rollLog[0].tier,S.rollLog[0].oppTier)'),1);
});
test('C5-P12..P14 parry stops all, half or none by weapon Size difference',()=>{
 const p=(atk,def)=>JSON.parse(run(`JSON.stringify(parryDamage(8,"${atk}","${def}","success"))`)).remaining;
 assert.equal(p('Huge','Huge'),0);assert.equal(p('Medium','Large'),0);assert.equal(p('Huge','Large'),4);assert.equal(p('Huge','Medium'),8);assert.equal(p('Huge','Small'),8);
 assert.equal(JSON.parse(run('JSON.stringify(parryDamage(8,"Huge","Small","failed"))')).remaining,8);
});
test('C5-P17/W03 humanoid hit locations on 1d20 (Core p.109)',()=>{
 assert.equal(run('JSON.stringify(HIT_D20)'),JSON.stringify([["1-3","Right Leg"],["4-6","Left Leg"],["7-9","Abdomen"],["10-12","Chest"],["13-15","Right Arm"],["16-18","Left Arm"],["19-20","Head"]]));
});
test('C5-W04..W06 wound level follows remaining location HP (Core p.110)',()=>{
 run('S=freshState();playStateHPMax=()=>[["Head",6],["Chest",8],["Abdomen",7],["Each Arm",5],["Each Leg",6]];');
 const tag=hp=>{run(`S.play.hp={Head:${hp}}`);return run('charVitals().locs.find(l=>l.loc==="Head").cls');};
 assert.equal(tag(6),'ok');assert.equal(tag(1),'minor');assert.equal(tag(0),'serious');assert.equal(tag(-5),'serious');assert.equal(tag(-6),'major');assert.equal(tag(-9),'major');
});
test('C5-W01, W02, W07 applied damage subtracts location armour, net damage never goes negative, and Serious hits log a wound check',()=>{
 run('S=freshState();playStateHPMax=()=>[["Head",6],["Chest",8],["Abdomen",7],["Each Arm",5],["Each Leg",6]];armorApAt=()=>4;');
 run('document.querySelector=()=>({value:"3"});APP.playApplyDamage("Chest");');assert.equal(run('playCurHP("Chest")'),8,'3 damage vs 4 AP does nothing');
 run('document.querySelector=()=>({value:"12"});APP.playApplyDamage("Chest");');assert.equal(run('playCurHP("Chest")'),0);
 assert.equal(run('S.play.woundEvents.length'),1);assert.equal(run('S.play.woundEvents[0].severity'),'serious');
});
test('C5-E05, E06, E07, SE01..SE43 all 43 Special Effects match the Core p.100 summary',()=>{
 const book={'Accidental Injury':[0,1,'','Attacker Fumbles',0],'Arise':[0,1,'','',0],'Bash':[1,0,'Shields or Bludgeoning','',0],'Bleed':[1,0,'Cutting Weapons','',0],
 'Blind Opponent':[0,1,'','Defender Criticals',0],'Bypass Armour':[1,0,'','Attacker Criticals',1],'Choose Location':[1,0,'','See Description',0],'Circumvent Cover':[1,0,'Ranged Weapons','',0],
 'Circumvent Parry':[1,0,'','Attacker Criticals',0],'Close Range':[1,1,'','',0],'Compel Surrender':[1,1,'','',0],'Damage Weapon':[1,1,'','',0],'Disarm Opponent':[1,1,'','',0],
 'Drop Foe':[1,0,'Ranged Weapons','',0],'Duck Back':[1,0,'Ranged Weapons','',0],'Enhance Parry':[0,1,'','Defender Criticals',0],'Entangle':[1,1,'Entangling Weapons','',0],
 'Flurry':[1,0,'Unarmed','',1],'Force Failure':[1,1,'','Opponent Fumbles',0],'Grip':[1,0,'Unarmed','',0],'Impale':[1,0,'Impaling Weapons','',0],
 'Kill Silently':[1,0,'Small Weapons','See Description',0],'Marksman':[1,0,'Ranged Weapons','',0],'Maximise Damage':[1,0,'','Attacker Criticals',1],'Open Range':[0,1,'','',0],
 'Overextend Opponent':[0,1,'','',1],'Overpenetration':[1,0,'Ranged Weapons','Critical Only',0],'Pin Down':[1,0,'Ranged Weapons','',1],'Pin Weapon':[1,1,'','Critical Only',0],
 'Prepare Counter':[0,1,'','',1],'Press Advantage':[1,0,'','',0],'Rapid Reload':[1,0,'','',1],'Remise':[1,0,'Small Weapon Only','',0],'Scar Foe':[1,1,'','',0],
 'Select Target':[0,1,'','Attacker Fumbles',0],'Slip Free':[0,1,'','Defender Criticals',0],'Stand Fast':[0,1,'','',0],'Stun Location':[1,0,'Bludgeoning Weapons','',0],
 'Sunder':[1,0,'Axes, Two Handed Weapons','',0],'Take Weapon':[1,1,'Unarmed','',0],'Trip Opponent':[1,1,'','',0],'Weapon Malfunction (Firearms)':[1,0,'Ranged Weapons','Attacker Fumbles',0],'Withdraw':[0,1,'','',0]};
 const app=JSON.parse(run('JSON.stringify(SPECIAL_EFFECTS)'));assert.equal(app.length,43);
 for(const e of app){const b=book[e[0]];assert(b,e[0]+' is not in the Core summary');assert.deepEqual([+!!e[1],+!!e[2],e[3]||'',e[4]||'',+!!e[5]],b,e[0]);}
});
test('C5-E06 critical-only and fumble-only effects are offered only on the right rolls',()=>{
 const can=(n,r)=>run(`canPickEffectForRoll(SPECIAL_EFFECTS.find(e=>e[0]==="${n}"),${JSON.stringify(r)})`);
 assert.equal(can('Maximise Damage',{combatRole:'attack',tier:'Success',oppTier:'Failure'}),false);
 assert.equal(can('Maximise Damage',{combatRole:'attack',tier:'Critical',oppTier:'Failure'}),true);
 assert.equal(can('Enhance Parry',{combatRole:'defence',tier:'Critical',oppTier:'Success'}),true);
 assert.equal(can('Enhance Parry',{combatRole:'defence',tier:'Critical',oppTier:'Success',combatKind:'evade'}),false);
 assert.equal(can('Accidental Injury',{combatRole:'defence',tier:'Success',oppTier:'Fumble'}),true);
 assert.equal(can('Accidental Injury',{combatRole:'defence',tier:'Success',oppTier:'Failure'}),false);
 assert.equal(can('Arise',{combatRole:'attack',tier:'Success',oppTier:'Failure'}),false,'defensive-only effect refused to an attacker');
});
test('C5-E07 stackable effects can be picked repeatedly; others once; never more than won',()=>{
 run('S=freshState();S.rollLog=[{label:"Axe",pct:60,roll:3,tier:"Critical",combat:true,combatKind:"style",combatRole:"attack",oppTier:"Fumble",effectsPicked:[]}];PM_EFFECT_ROLL_REF=S.rollLog[0];');
 const idx=n=>run(`SPECIAL_EFFECTS.findIndex(e=>e[0]==="${n}")`);
 run(`APP.playChooseEffect(${idx('Maximise Damage')});APP.playChooseEffect(${idx('Maximise Damage')});APP.playChooseEffect(${idx('Bleed')});APP.playChooseEffect(${idx('Bleed')});`);
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.rollLog[0].effectsPicked)')),['Maximise Damage','Maximise Damage','Bleed']);
 run(`APP.playChooseEffect(${idx('Press Advantage')})`);assert.equal(run('S.rollLog[0].effectsPicked.length'),3,'critical vs fumble wins exactly 3');
});
test('Weapon-linked rolls filter weapon-specific Special Effects (Core p.100 and weapon tables)',()=>{
 const ok=(eff,w)=>run(`weaponAllowsEffect(SPECIAL_EFFECTS.find(e=>e[0]==="${eff}"),weaponForRoll(${JSON.stringify(w)}))`);
 assert.equal(ok('Bleed','Dagger'),true);assert.equal(ok('Impale','Dagger'),true);assert.equal(ok('Bash','Dagger'),false);
 assert.equal(ok('Bash','Club'),true);assert.equal(ok('Stun Location','Club'),true);assert.equal(ok('Bleed','Club'),false);
 assert.equal(ok('Sunder','Battleaxe'),true);assert.equal(ok('Sunder','Shortsword'),false);
 assert.equal(ok('Bash','Heater'),true,'shields Bash');assert.equal(ok('Entangle','Net'),true);
 assert.equal(ok('Grip','Unarmed'),true);assert.equal(ok('Flurry','Dagger'),false);assert.equal(ok('Take Weapon','Unarmed'),true);
 assert.equal(ok('Remise','Dagger'),true,'Small weapon');assert.equal(ok('Remise','Broadsword'),false);
 assert.equal(ok('Marksman','Broadsword'),false);assert.equal(ok('Choose Location','Club'),true,'no weapon type');
 assert.equal(run('weaponAllowsEffect(SPECIAL_EFFECTS.find(e=>e[0]==="Bleed"),null)'),true,'no weapon recorded: GM decides');
 run('S=freshState();S.gearWeapons=["Club"];S.rollLog=[{label:"Club",pct:60,roll:20,tier:"Success",combat:true,combatKind:"style",combatRole:"attack",oppTier:"Failure",effectsPicked:[]}];');
 assert.equal(run('canPickEffectForRoll(SPECIAL_EFFECTS.find(e=>e[0]==="Bleed"),S.rollLog[0])'),true);
 run('APP.playSetRollWeapon(0,"Club")');assert.equal(run('canPickEffectForRoll(SPECIAL_EFFECTS.find(e=>e[0]==="Bleed"),S.rollLog[0])'),false);
 assert.equal(run('canPickEffectForRoll(SPECIAL_EFFECTS.find(e=>e[0]==="Stun Location"),S.rollLog[0])'),true);
 run('APP.playSetRollWeapon(0,"Greatsword")');assert.equal(run('S.rollLog[0].weapon'),'Club','only carried weapons or Unarmed');
});
test('rolling with a weapon records it; Unarmed rolls count as combat rolls',()=>{
 run('S=freshState();S.gearWeapons=["Club"];finalPct=()=>60;gradedPct=(k,b)=>({pct:b,grade:"standard"});var __r=Math.random;Math.random=()=>0.2;');
 assert(run('!!entryMap()["std:Unarmed"]'),'every character has the Unarmed skill');
 run('APP.rollWithWeapon("Club","std:Unarmed","")');assert.equal(run('S.rollLog[0].weapon'),'Club');assert.equal(run('S.rollLog[0].combat'),true);
 run('APP.rollWithWeapon("Unarmed","std:Unarmed","")');assert.equal(run('S.rollLog[0].weapon'),'Unarmed');
 run('APP.roll("std:Unarmed")');assert.equal(run('S.rollLog[0].combat'),true);run('Math.random=__r;');
});
test('C5-ST03..ST08 unfamiliar weapons: grade steps, never below STR+DEX (Core p.88)',()=>{
 run('S=freshState();effectiveChars=()=>({STR:12,DEX:14,CON:10,SIZ:12,INT:12,POW:10,CHA:10});finalPct=()=>80;ACTIVE_GRADE="standard";gradeForEntry=()=>ACTIVE_GRADE;');
 const f=fam=>JSON.parse(run(`JSON.stringify(familiarityPct("style:x","${fam}"))`));
 assert.equal(f('similar').pct,80);assert.equal(f('broadly').pct,53);assert.equal(f('broadly').grade,'hard');
 assert.equal(f('reasonably').pct,40);assert.equal(f('combined').pct,53);assert.equal(f('substantially').pct,26);
 run('finalPct=()=>45;');assert.equal(f('reasonably').pct,26,'floor at STR+DEX 26');assert.equal(f('reasonably').floored,true);
 run('ACTIVE_GRADE="hard";');assert.equal(f('substantially').pct,17,'situational grade still applies to the base');
 assert.equal(JSON.parse(run('JSON.stringify(familiarityPct(null,"broadly"))')).pct,17,'no styles: base STR+DEX');
});
test('C5-M22 surprise: initiative -10, no Attack, cleared by New Round (Core p.105)',()=>{
 run('S=freshState();effectiveChars=()=>({STR:12,DEX:14,CON:10,SIZ:12,INT:12,POW:10,CHA:10});armourPenaltyToInit=()=>0;fatigueRow=()=>({init:0});');
 const before=run('playInitiativeBonusNow().total');run('APP.playSetSurprised(true)');
 assert.equal(run('playInitiativeBonusNow().total'),before-10);
 run('var __r=Math.random;Math.random=()=>0.45;APP.playRollInitiative();Math.random=__r;');assert.equal(run('S.play.initiative.total'),5+before-10);
 run('APP.playNewRound()');assert.equal(run('S.play.surprised'),false);assert.equal(run('S.play.initiative.total'),5+before-10,'the rolled initiative keeps its penalty');
 run('S.play.surprised="yes";normalizeState();');assert.equal(run('S.play.surprised'),false);
});
test('unarmed damage shows the Damage Modifier with a single sign (PR #123 live finding)',()=>{
 run('effectiveChars=()=>({STR:10,SIZ:10,DEX:10,INT:10,CON:10,POW:10,CHA:10});');
 for(const [dm,want] of [['+0','1d3'],['+1d2','1d3+1d2'],['-1d4','1d3-1d4'],['+1d6+1d4','1d3+1d6+1d4']]){run(`dmCalc=()=>${JSON.stringify(dm)};`);assert.equal(run('unarmedDamageText()'),want,dm);}
});
test('A4-H24..H27 maiming: one third, two thirds (HP lost rounded up), or 1 HP (Core p.80, owner ruling)',()=>{
 const m=(max,r)=>run(`maimedMaxHP(${max},${r})`);
 assert.equal(m(6,1),4);assert.equal(m(6,2),2);assert.equal(m(6,3),1);
 assert.equal(m(5,1),3,'5/3 = 1.67 lost, rounded up to 2');assert.equal(m(5,2),1,'10/3 = 3.33 lost, rounded up to 4');
 assert.equal(m(2,1),1);assert.equal(m(1,2),1,'never below 1');assert.equal(m(6,4),null);
});
console.log('Combat case tests passed');
