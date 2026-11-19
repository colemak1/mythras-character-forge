// The Pits: rulings D-R1 and D-R2 (ChatGPT (Chat) 2026-11-17, Core pp.87-88, 90-91, 110; docs/decisions.md).
// R1: a concurrent attack (tied Initiative) already committed is resolved with its pre-wound skill; switching the weapon
// to a working off hand carries no penalty; the optional injured-location grade applies only to tasks using that
// location. R2: every Serious Wound stops attacks for 1d3 Turns, Endurance or not; Endurance decides the rest.
// Regression case: report 20261117-032318 (a concurrent attack at 32%, its 48% made Hard by the wound it was concurrent
// with; later left-hand attacks at 48%).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const output={innerHTML:'',addEventListener(){}};
const ctx={console,URLSearchParams,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},
 sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
 document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
 window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
vm.createContext(ctx);
for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const run=s=>vm.runInContext(s,ctx);
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
// Answer the pending roll prompt with exact values.
const answer=(...values)=>{const label=run('R&&R.label');assert(label,'a roll is pending');run(`(()=>{const r=R;R=null;r.callback(${JSON.stringify(values)});})()`);return label;};
const logs=()=>JSON.parse(run('JSON.stringify(S.logs.map(l=>l.title+" :: "+l.body))'));
function setup(atkWeapon){
 run(`(()=>{startRun();R=null;V.busy=false;const a=S.fighters.a,b=S.fighters.b;b.kind='human';
  a.weapon=${JSON.stringify(atkWeapon)};b.weapon='sword';a.str=13;a.siz=13;b.siz=10;b.athletics=50;b.endurance=40;
  for(const f of [a,b]){f.weaponGuard=null;ensureEffectState(f);   // durability must follow the weapon set above, not the random starting one
  f.armourLocations=Object.fromEntries(HIT_LOCS.map(l=>[l,0]));f.armor=0;f.prone=false;f.disarmed=false;f.impaledWeapon=null;
   for(const l of HIT_LOCS){f.hp[l]=100;f.maxHp[l]=100;}}
  S.phase='fight';S.disengaged=false;S.ringClearance={a:6,b:6};S.gapMetres=0;S.logs=[];})()`);
}

const fighter=id=>JSON.parse(run(`JSON.stringify((f=>({style:f.style,target:combatTarget(f),evade:evadeTarget(f),canAttack:canMakeAttack(f),
 skip:f.skipAttack,disarmed:!!f.disarmed,disabled:f.disabled,hand:f.weaponHand}))(S.fighters.${id}))`));
function bout(){
 setup('sword');
 run(`(()=>{const a=S.fighters.a,b=S.fighters.b;S.pending=null;R=null;b.style=48;a.style=67;b.str=12;a.str=13;
  for(const f of [a,b]){f.ap=3;f.apMax=3;f.skipAttack=0;f.disabled=[];f.weaponHand='Right Arm';for(const l of HIT_LOCS){f.hp[l]=5;f.maxHp[l]=5;}}
  a.initiative=b.initiative=16;S.round=1;S.cycle=1;S.turnIndex=0;S.tie=null;})()`);
}
// What Kethan's blow did to the Border Deserter in report 20261117-032318: a Serious Wound to the weapon arm, Endurance
// failed: the arm is useless and the weapon falls, and 1d3 (here 1) Turns of no attacks.
const WOUND_ARM=`(()=>{const b=S.fighters.b;b.hp['Right Arm']=-1;b.disabled=['Right Arm'];b.disarmed=true;b.droppedMetres=0;b.skipAttack=1;})()`;

test('R1: a concurrent attack keeps its pre-wound skill (48%, not 32%), weapon and arm; the wound lands after it',()=>{
 bout();run(`beginConcurrentCycle()`);
 assert.equal(run('S.tie.first'),'a');assert.equal(run('S.tie.second'),'b');
 run(WOUND_ARM);
 // outside its concurrent turn the wound counts in full
 let b=fighter('b');assert.equal(b.target,32,'Serious arm wound: Hard');assert.equal(b.canAttack,false);
 run(`S.turnIndex=1;grantConcurrentTurn('b')`);
 b=fighter('b');
 assert.equal(b.target,48,'the committed attack uses the pre-wound skill');assert.equal(b.canAttack,true,'not stopped by the wound it is concurrent with');
 assert.equal(b.disarmed,false);assert.deepEqual(b.disabled,[]);
 // the roll prompt does not name a wound it no longer applies
 run(`R={actor:'b',label:'Attack · Combat Style 48%',defs:[{sides:100}]}`);assert.equal(run(`rollDifficultyHtml('b')`),'');run('R=null');
 // the cycle ends: the arm, the dropped weapon and the stun apply from now on
 run('finishConcurrentCycle()');
 b=fighter('b');assert.equal(b.disarmed,true);assert.deepEqual(b.disabled,['Right Arm']);
 assert.equal(b.skip,1,'R2: the 1d3 Turns start after the concurrent action, which does not use one up');assert.equal(b.canAttack,false);
});

test('R1: damage taken during its own concurrent turn still counts for that fighter',()=>{
 bout();run(`beginConcurrentCycle()`);run(WOUND_ARM);run(`S.turnIndex=1;grantConcurrentTurn('b')`);
 run(`S.fighters.b.hp['Right Arm']-=6`);          // 5 at the start of the cycle, -6 in its own turn: Serious
 assert.equal(fighter('b').target,32);
});

test('R1: the weapon in a working off hand uses the normal Combat Style; the injured location penalises only its own tasks',()=>{
 bout();
 run(`(()=>{const b=S.fighters.b;b.hp['Right Arm']=-1;b.disabled=['Right Arm'];b.weaponHand='Left Arm';b.disarmed=false;})()`);
 assert.equal(fighter('b').target,48,'left hand: no off-hand penalty (report 20261117-032318: 48%)');
 assert.equal(fighter('b').evade,run('S.fighters.b.evade'),'an arm wound does not touch Evade');
 // a Serious Wound to the arm that holds the weapon, not disabled: tasks with that arm are one grade harder (Core p.110)
 run(`(()=>{const b=S.fighters.b;b.disabled=[];b.weaponHand='Right Arm';})()`);assert.equal(fighter('b').target,32);
 // a Serious leg wound makes Evade harder, not the weapon arm's attacks
 run(`(()=>{const b=S.fighters.b;b.hp['Right Arm']=5;b.hp['Left Leg']=-1;})()`);
 assert.equal(fighter('b').target,48);assert(fighter('b').evade<run('S.fighters.b.evade'));
});

// R2, through the engine's own resolveWound: the 1d3 is rolled first, whatever Endurance does
const wound=(loc,endurance,stun)=>{bout();run(`resolveWound(S.fighters.a,S.fighters.b,'${loc}','serious',6,{grade:2,roll:50,label:'Success',effectiveTarget:67},()=>{})`);
 assert.match(answer(stun),/Serious Wound · 1d3 stunned turns/);assert.match(answer(endurance),/Endurance/);};
test('R2: a resisted Serious Wound still stops attacks for 1d3 Turns, and nothing more',()=>{
 wound('Right Arm',3,2);                          // Endurance 03: critical, beats the attack's 50 Success
 const b=fighter('b');assert.equal(b.skip,2);assert.equal(b.canAttack,false);assert.deepEqual(b.disabled,[]);assert.equal(b.disarmed,false);
 assert(logs().some(l=>/^SERIOUS WOUND · Right Arm :: .*Resists the additional consequence/.test(l)));
});
test('R2: a failed limb Endurance also makes the limb useless (an arm drops its weapon)',()=>{
 wound('Right Arm',99,3);
 const b=fighter('b');assert.equal(b.skip,3);assert.deepEqual(b.disabled,['Right Arm']);
});
test('R2: a failed head Endurance is unconsciousness; the fight ends',()=>{
 wound('Head',99,1);assert(['over','between'].includes(run('S.phase')));
});
test('R2: parry and evade stay open while attacks are stopped; the stop ends after its Turns',()=>{
 bout();run(`S.fighters.b.skipAttack=2`);
 assert.equal(fighter('b').canAttack,false);
 assert.equal(run(`unavailableReaction(S.fighters.b,'weapon')||''`),'','parry allowed');assert.equal(run(`cannotRespond(S.fighters.b)`),false,'evade allowed');
 run(`advanceStun(S.fighters.b)`);assert.equal(fighter('b').canAttack,false,'one Turn left');
 run(`advanceStun(S.fighters.b)`);assert.equal(fighter('b').canAttack,true,'expired after its 2 Turns');
});

test('two-handed weapon: a Serious Wound to either arm makes attacks a grade harder; to both, two (owner, 2026-11-17)',()=>{
 bout();run(`(()=>{const b=S.fighters.b;b.weapon='greatsword';b.weaponGuard=null;ensureEffectState(b);b.weaponHand='Right Arm';b.style=60;})()`);
 assert.equal(fighter('b').target,60);
 run(`S.fighters.b.hp['Left Arm']=-1`);assert.equal(fighter('b').target,40,'the arm that does not "hold" it counts too: Hard');
 run(`S.fighters.b.hp['Right Arm']=-1`);assert.equal(fighter('b').target,30,'both arms: Formidable');
 run(`R={actor:'b',label:'Attack · Combat Style 30%',defs:[{sides:100}]}`);
 assert.match(run(`rollDifficultyHtml('b')`),/Serious Right Arm wound[\s\S]*Serious Left Arm wound/);run('R=null');
 // a one-handed weapon: only the arm that holds it
 run(`(()=>{const b=S.fighters.b;b.weapon='sword';b.weaponGuard=null;ensureEffectState(b);b.hp['Right Arm']=5;})()`);
 assert.equal(fighter('b').target,60,'Left Arm wound, sword in the right hand: no penalty');
});

console.log(passed+' Serious Wound ruling tests (R1, R2) passed');
