const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={console,setTimeout,clearTimeout,setInterval,clearInterval,URL,Date,Map,Set,WeakMap,
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/'},supabase:{createClient:()=>({auth:{signOut:async()=>({})}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};vm.createContext(ctx);
for(const name of ['data','engine','cloud','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
run('render=()=>{};S=freshState();S.rollLog=[{label:"Spear",tier:"Critical",oppTier:"Failure",combat:true}];APP.playJumpToEffects(0);');
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
assert.equal(run('contestedRollResult(100, 0, 90, 2)'),null);
assert.match(run('specialEffectsPanel()'),/Contested roll calculator/);
console.log('PASS effect selection, limits, removal, changed result, and read-only guard');
