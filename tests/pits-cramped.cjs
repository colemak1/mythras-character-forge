// The Pits: cramped haft blows and held-but-unusable weapons at Reach. Run: node tests/pits-cramped.cjs
//  1. Core p.106 (decisions.md D-PR3, Chat review 2026-11-16): inside a shorter weapon's reach the longer weapon
//     strikes with its haft or pommel for 1d3+1, at its Size less the Reach gap. Its Special Effects follow that
//     blunt blow: no Impale, Bleed, Entangle or Sunder; Bash and Stun Location. Maximise Damage maximises the one d3
//     (3+1 before the Damage Modifier) and cannot be stacked past it.
//  2. D-PR1 (Chat review): a pinned weapon, or one held while lodged in the foe, still holds the distance (no snap),
//     but it cannot attack, parry or intercept a Change Range; the opponent closes against Evade only.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const output={innerHTML:'',addEventListener(){}};
const ctx={console,URLSearchParams,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},
 sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
 document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
 window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
vm.createContext(ctx);
for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js'])
 vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const run=s=>vm.runInContext(s,ctx),J=s=>JSON.parse(run('JSON.stringify('+s+')'));
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const answer=values=>{assert(run('!!R'),'a roll is pending');run(`(()=>{const r=R;R=null;r.callback(${JSON.stringify(values)});})()`);};

// a (aWeapon) against b (bWeapon), both player controlled, no armour, a to act.
function setup(aWeapon,bWeapon,engagement){
 run(`(()=>{startRun();R=null;V.busy=false;const a=S.fighters.a,b=S.fighters.b;b.kind='human';
  a.weapon=${JSON.stringify(aWeapon)};b.weapon=${JSON.stringify(bWeapon)};a.shield=b.shield='none';a.str=a.siz=b.str=b.siz=13;
  for(const f of [a,b]){f.weaponGuard=null;ensureEffectState(f);f.armourLocations=Object.fromEntries(HIT_LOCS.map(l=>[l,4]));f.armor=4;
   f.prone=false;f.disarmed=false;f.impaledWeapon=null;f.pinnedGear=null;f.braced=false;f.ap=3;f.apMax=3;f.style=60;f.disabled=[];
   f.stunnedLocations={};for(const l of HIT_LOCS){f.hp[l]=100;f.maxHp[l]=100;}}
  S.order=['a','b'];S.turnIndex=0;S.phase='fight';S.pending=null;S.engagement=${JSON.stringify(engagement)};
  S.disengaged=false;S.ringClearance={a:6,b:6};S.gapMetres=0;S.tie=null;S.logs=[];})()`);
}
// a has hit b with a critical against no defence: the attacker's effect menu.
const effectsAfterCrit=(extra)=>{
 run(`S.pending=Object.assign({kind:'effect',atk:'a',def:'b',owner:'a',other:'b',attackRoll:{grade:3,roll:3,label:'Critical',effectiveTarget:60},
  reaction:'none',defenseRoll:null,effectsLeft:3,chosen:[],chosenLoc:'Chest',maximize:0,evaded:false},${JSON.stringify(extra||{})});`);
 return J('availableEffects(S.pending).map(e=>e[0])');
};

/* ---------- 1. The cramped haft blow ---------- */
test('greatsword inside a dagger: the cramped blow offers no Impale, Bleed or Sunder, and does offer Bash and Stun',()=>{
 setup('greatsword','dagger','short');
 assert.equal(run("isCrampedAtReach('a')"),true);
 const ids=effectsAfterCrit();
 for(const id of ['impale','bleed','sunder'])assert(!ids.includes(id),id+' withheld');
 for(const id of ['bash','stun','maximize'])assert(ids.includes(id),id+' offered');
});
test('the same greatsword at its own reach keeps its blade effects (control)',()=>{
 setup('greatsword','dagger','long');
 const ids=effectsAfterCrit();
 for(const id of ['impale','bleed','sunder','maximize'])assert(ids.includes(id),id+' offered');
 assert(!ids.includes('bash')&&!ids.includes('stun'),'no bludgeoning effects on the blade');
});
test('a halberd inside a dagger cannot Entangle with its haft',()=>{
 setup('halberd-poleaxe','dagger','short');
 assert(!effectsAfterCrit().includes('entangle'));
});
test('Maximise on a cramped 2d8 greatsword: offered once (one d3), not twice',()=>{
 setup('greatsword','dagger','short');
 assert(!effectsAfterCrit({maximize:1,chosen:['maximize']}).includes('maximize'),'no second Maximise on a 1d3');
 setup('greatsword','dagger','long');
 assert(effectsAfterCrit({maximize:1,chosen:['maximize']}).includes('maximize'),'the 2d8 blade can still take two');
});
test('Maximise on a cramped blow: the d3 is fixed at 3, for 3+1 = 4 before the Damage Modifier',()=>{
 setup('greatsword','dagger','short');
 run(`S.pending={kind:'resolving',atk:'a',def:'b',attackTarget:60,attackRoll:{grade:3,roll:3,label:'Critical',effectiveTarget:60},
  reaction:'none',defenseRoll:null,owner:null,other:null,effectsLeft:0,chosen:['maximize'],chosenLoc:'Chest',maximize:1,evaded:false};resolveHit();`);
 const defs=J('R.defs');
 assert.equal(defs[0].sides,3,'the weapon die is a d3');
 assert.equal(defs[0].fixed,3,'maximised to 3');
 assert.equal(defs.filter(d=>/^Weapon/.test(d.label)).length,1,'one weapon die, not the greatsword’s two');
 answer([3,...defs.slice(1).map(()=>1)]);
 const hit=J("S.logs.find(l=>/hits Chest/.test(l.title)).body");
 assert.match(hit,/^4 weapon \(3\+1\)/,hit);
});
test('a cramped blow without Maximise still rolls 1d3+1',()=>{
 setup('greatsword','dagger','short');
 run(`S.pending={kind:'resolving',atk:'a',def:'b',attackTarget:60,attackRoll:{grade:2,roll:20,label:'Success',effectiveTarget:60},
  reaction:'none',defenseRoll:null,owner:null,other:null,effectsLeft:0,chosen:[],chosenLoc:'Chest',maximize:0,evaded:false};resolveHit();`);
 const defs=J('R.defs');
 assert.equal(defs[0].sides,3);assert.equal(defs[0].fixed,null);
 answer([2,...defs.slice(1).map(()=>1)]);
 assert.match(J("S.logs.find(l=>/hits Chest/.test(l.title)).body"),/^3 weapon \(2\+1\)/);
});

/* ---------- 2. Pinned and embedded weapons at Reach ---------- */
for(const [name,state] of [['pinned',"S.fighters.a.pinnedGear='weapon';S.fighters.a.pinnedBy='b';"],
  ['held while lodged in the foe',"S.fighters.a.impaledWeapon={weapon:'longspear',target:'b',loc:'Chest'};"]]){
 test(`a longspear ${name} still holds the distance (no snap): the dagger must still close`,()=>{
  setup('longspear','dagger','long');run(state);
  const r=J('engagementInfo()');
  assert(r.active&&r.longer==='a','the longspear still controls reach');
  assert.equal(J("S.engagement"),'long','the range is not reset');
  assert.equal(J("canAttackBody('b')"),false);assert.equal(J("proposedRange('b')"),'short');
 });
 test(`a longspear ${name} cannot attack, parry or intercept`,()=>{
  setup('longspear','dagger','long');run(state);
  assert.equal(J("canMakeAttack(S.fighters.a)"),false,'no attack');
  assert.equal(J("canParryAtReach('a')"),false,'no parry');
  assert.equal(J("canInterceptRange(S.fighters.a)"),false,'no interception');
  assert.equal(J("canOpposeRange(S.fighters.a)"),true,'footwork (Evade) still opposes');
 });
 test(`the dagger closing on a longspear ${name}: the intercept answer does nothing; Evade or allow decides`,()=>{
  setup('dagger','longspear','long');run(state.replace(/fighters\.a/g,'fighters.b').replace(/target:'b'/,"target:'a'"));
  run("S.order=['a','b'];S.turnIndex=0;beginChangeRange('a','short');");
  assert.equal(J('S.pending.kind'),'range');
  run("rangeReact('intercept');");
  assert(!J('!!(S.pending&&S.pending.intercepting)'),'no interception started');
  assert.equal(J('S.fighters.b.ap'),3,'no AP spent on an impossible interception');
  run("rangeReact('permit');");
  assert.equal(J('S.engagement'),'short','allowed: the dagger is inside');
 });
}
test('freed, the longspear can attack and intercept again',()=>{
 setup('longspear','dagger','long');run("S.fighters.a.pinnedGear='weapon';S.fighters.a.pinnedBy='b';");
 run('S.fighters.a.pinnedGear=null;S.fighters.a.pinnedBy=null;');
 assert.equal(J("canMakeAttack(S.fighters.a)"),true);assert.equal(J("canInterceptRange(S.fighters.a)"),true);
});
console.log(passed+' Pits cramped and held-weapon tests passed');
