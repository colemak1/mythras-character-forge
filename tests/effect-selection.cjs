const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={console,setTimeout,clearTimeout,setInterval,clearInterval,URL,Date,Map,Set,WeakMap,
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/'},supabase:{createClient:()=>({auth:{signOut:async()=>({})}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
assert.match(run('SPECIAL_EFFECTS.find(e=>e[0]==="Weapon Malfunction (Firearms)")[6]'),/GM to adjudicate/);
assert.equal(run('canPickEffectForRoll(SPECIAL_EFFECTS.find(e=>e[0]==="Weapon Malfunction (Firearms)"),{combatRole:"attack",tier:"Fumble",oppTier:"Success"})'),true);
assert.equal(run('playEffectsWon("Fumble","Success")'),-2);
// Core p.51 differential table, transcribed independently from rendered page.
const tiers=['Critical','Success','Failure','Fumble'],rolls=[1,20,90,99];
const expected=[[0,1,2,3],[-1,0,1,2],[-2,-1,0,0],[-3,-2,0,0]];
for(let i=0;i<4;i++)for(let j=0;j<4;j++){
 const result=run(`contestedRollResult(80,${rolls[i]},80,${rolls[j]})`);
 assert.equal(result.tierA,tiers[i]);assert.equal(result.tierB,tiers[j]);
 assert.equal(result.differential,expected[i][j],`${tiers[i]} vs ${tiers[j]}`);
}

run('render=()=>{};S=freshState();S.rollLog=[{label:"Spear",tier:"Critical",oppTier:"Failure",combat:true,combatRole:"attack"}];APP.playJumpToEffects(0);');
assert.match(run('specialEffectsPanel()'),/Spear: 0\/2 chosen/);
run('APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Bleed"));');
assert.equal(run('S.rollLog[0].effectsPicked.length'),1);
assert.match(run('playRollLogRow(S.rollLog[0],0)'),/Chosen: Bleed/);
run('APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Bleed"));');
assert.equal(run('S.rollLog[0].effectsPicked.length'),1,'non-stackable effects cannot be repeated');
run('APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Arise"));');
assert.equal(run('S.rollLog[0].effectsPicked.length'),1,'defensive-only effect cannot be chosen for attack');
run('APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Maximise Damage"));');
assert.equal(run('S.rollLog[0].effectsPicked.length'),2);
run('APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Maximise Damage"));');
assert.equal(run('S.rollLog[0].effectsPicked.length'),2,'margin limits choices');
run('APP.playRemoveEffectChoice(0);');
assert.equal(run('S.rollLog[0].effectsPicked[0]'),'Maximise Damage');
run('APP.playSetOpponentTier(0,"Success");');
assert.equal(run('S.rollLog[0].effectsPicked.length'),0,'changing opponent result invalidates picks');
run('APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Maximise Damage"));');
assert.equal(run('S.rollLog[0].effectsPicked.length'),1);
run('S.rollLog[0].tier="Success";APP.playSetOpponentTier(0,"Failure");APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Maximise Damage"));');
assert.equal(run('S.rollLog[0].effectsPicked.length'),0,'critical-only choices require a critical');
run('S.rollLog[0].tier="Critical";APP.playSetOpponentTier(0,"Failure");APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Maximise Damage"));APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Maximise Damage"));');
assert.equal(run('S.rollLog[0].effectsPicked.length'),2,'stackable choices can repeat up to the margin');
run('VIEW_ONLY=true;APP.playRemoveEffectChoice(0);APP.playChooseEffect(0);');
assert.equal(run('S.rollLog[0].effectsPicked.length'),2,'read-only view cannot edit picks');
run('VIEW_ONLY=false;APP.playSetOpponentTier(0,"Critical");');
assert.equal(run('selectedEffectRoll()'),null,'tied result has no selection context');
run('S=freshState();S.rollLog=[{label:"Other character",tier:"Critical",oppTier:"Failure",combat:true}];');
assert.equal(run('selectedEffectRoll()'),null,'selection context does not cross characters');
// Explicit roles control eligibility and the attacker-fumble prerequisite.
run('S=freshState();S.rollLog=[{label:"Parry",tier:"Critical",oppTier:"Fumble",combat:true}];APP.playJumpToEffects(0)');
assert.equal(run('selectedEffectRoll()'),null,'role must be explicit');
run('APP.playSetCombatRole(0,"defence");APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Accidental Injury"));');
assert.equal(run('S.rollLog[0].effectsPicked[0]'),'Accidental Injury');
run('APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Enhance Parry"));');assert.equal(run('S.rollLog[0].effectsPicked.length'),2);
run('APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Bleed"));');assert.equal(run('S.rollLog[0].effectsPicked.length'),2);
run('APP.playSetCombatRole(0,"attack")');assert.equal(run('S.rollLog[0].effectsPicked.length'),0);
run('APP.playNoParry(0)');assert.equal(run('S.rollLog[0].oppTier'),'Failure');assert.equal(run('S.rollLog[0].opponentAction'),'no-parry');
run('APP.playSetCombatRole(0,"defence")');assert.equal(run('S.rollLog[0].oppTier'),null);
run('S.rollLog=[{label:"Evade",combat:true,combatKind:"evade",tier:"Critical",oppTier:"Failure"}];APP.playSetCombatRole(0,"attack")');assert.equal(run('S.rollLog[0].combatRole'),undefined);
run('APP.playSetCombatRole(0,"defence");APP.playJumpToEffects(0);APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Enhance Parry"));');assert.equal(run('(S.rollLog[0].effectsPicked||[]).length'),0);
run('S.rollLog[0].oppTier="Fumble";APP.playChooseEffect(SPECIAL_EFFECTS.findIndex(e=>e[0]==="Accidental Injury"))');assert.equal(run('S.rollLog[0].effectsPicked[0]'),'Accidental Injury');
const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);assert.equal(run('S.rollLog[0].combatRole'),'defence');
// Shared excess is applied before critical/success/fumble evaluation.
assert.equal(run('contestedRollResult(130, 10, 90, 70).reduction'),30);
assert.equal(run('contestedRollResult(130, 10, 90, 70).a'),100);
assert.equal(run('contestedRollResult(130, 10, 90, 70).b'),60);
assert.equal(run('contestedRollResult(130, 10, 90, 70).tierA'),'Critical');
assert.equal(run('contestedRollResult(130, 10, 90, 70).tierB'),'Failure');
assert.equal(run('contestedRollResult(130, 10, 90, 70).differential'),2);
assert.match(run('contestedRollResult(80, 45, 70, 60).opposed'),/Second participant wins/);
assert.match(run('contestedRollResult(80, 90, 70, 90).opposed'),/Both failed/);
assert.match(run('contestedRollResult(80, 30, 70, 30).opposed'),/adjudicate/);
assert.equal(run('contestedRollResult(200, 5, 30, 99).b'),0);
// Core pp.37,51: 01–05 always succeeds, but 0% has no critical range.
const zero=run('contestedRollResult(200, 5, 30, 1)');
assert.equal(zero.b,0);assert.equal(zero.tierB,'Success');assert.equal(zero.differential,1);
assert.equal(run('resolveRoll(1,0)'),'Success');
assert.equal(run('resolveRoll(1,1)'),'Critical');
assert.equal(run('resolveRoll(5,0)'),'Success');
assert.equal(run('resolveRoll(6,0)'),'Failure');
assert.equal(run('contestedRollResult(100, 0, 90, 2)'),null);
assert.match(run('specialEffectsPanel()'),/Contested roll calculator/);
console.log('PASS effect selection, limits, removal, changed result, and read-only guard');

run('S=freshState();render=()=>{};APP.roll("std:Native Tongue")');
assert.equal(run('S.rollLog.length'),0);
assert.match(run('PM_MSG'),/fluency/);
assert.equal(run('isSpokenLanguage("prof:Language|korathian")'),true);
assert.equal(run('isSpokenLanguage("prof:Literacy|korathian")'),false);

// Core p.50 examples and thresholds through the Play Mode calculator.
for(const [method,primary,secondary,roll,expected] of [
 ["augment",38,33,4,"45% target. Critical."],
 ["augment",38,33,5,"45% target. Success."],
 ["augment",38,33,45,"45% target. Success."],
 ["augment",38,33,46,"45% target. Failure."],
 ["augment",98,25,99,"103% target. Fumble."],
 ["augment",101,25,99,"106% target. Failure."],
 ["cap",48,23,3,"23% target. Critical."],
 ["cap",48,23,24,"23% target. Failure."],
 ["cap",48,70,49,"48% target. Failure."],
 ["cap",48,23,0,"Enter whole-number skill percentages"]
]){
 ctx.skillInput={method:{value:method},primary:{valueAsNumber:primary},secondary:{valueAsNumber:secondary},roll:{valueAsNumber:roll}};
 const result=run('(()=>{const output={};pmCalculateModifiedSkill({elements:skillInput,querySelector:()=>output});return output.textContent;})()');
 assert(result.startsWith(expected),result);
}
