// The Pits: shield attacks and shield Bash (Core pp.63, 91, 95-96; PIT-P07
// cases in docs/the-pits-combat-procedure-review.md). Both fighters are player
// controlled, so every die is answered by the test.
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
const answer=(...values)=>{const label=run('R&&R.label');assert(label,'a roll is pending');run(`(()=>{const r=R;R=null;r.callback(${JSON.stringify(values)});})()`);return label;};
const logs=()=>JSON.parse(run('JSON.stringify(S.logs.map(l=>l.title+" :: "+l.body))'));
function setup(shield){
 run(`(()=>{startRun();R=null;V.busy=false;const a=S.fighters.a,b=S.fighters.b;b.kind='human';
  a.weapon='sword';a.shield=${JSON.stringify(shield)};b.weapon='sword';b.shield='none';a.str=13;a.siz=13;b.siz=10;b.athletics=50;b.acrobatics=0;b.endurance=40;
  for(const f of [a,b]){f.weaponGuard=null;ensureEffectState(f);f.armourLocations=Object.fromEntries(HIT_LOCS.map(l=>[l,0]));f.armor=0;
   f.prone=false;f.disarmed=false;f.impaledWeapon=null;f.braced=false;f.ap=3;f.apMax=3;f.style=60;f.disabled=[];f.stunnedLocations={};
   for(const l of HIT_LOCS){f.hp[l]=100;f.maxHp[l]=100;}}
  S.order=['a','b'];S.turnIndex=0;S.phase='fight';S.pending=null;S.engagement=engagementInfo().active?'long':'equal';
  S.disengaged=false;S.ringClearance={a:6,b:6};S.gapMetres=0;S.tie=null;S.logs=[];})()`);
}
const hit=(extra)=>run(`S.pending=Object.assign({kind:'resolving',atk:'a',def:'b',attackTarget:60,attackRoll:{grade:2,roll:20,label:'Success',effectiveTarget:60},reaction:'none',defenseRoll:null,owner:null,other:null,effectsLeft:0,chosen:[],chosenLoc:'Chest',maximize:0,evaded:false},${JSON.stringify(extra||{})});resolveHit();`);

test('all eight shields have their Core p.63 attack lines (P07-01–08)',()=>{
 const want={buckler:[1,3,0,2,['bash','stun']],heater:[1,4,0,3,['bash','stun']],hoplite:[1,4,0,4,['bash','stun']],kite:[1,4,0,4,['bash','stun']],
  peltast:[1,4,0,3,['bash','stun']],scutum:[1,4,0,4,['bash','stun']],target:[1,3,1,3,['bash','impale']],viking:[1,4,0,3,['bash','stun']]};
 const got=JSON.parse(run('JSON.stringify(SHIELD_ATTACKS)'));
 assert.deepEqual(Object.keys(got).sort(),Object.keys(want).sort());
 for(const [k,[n,sides,bonus,size,traits]] of Object.entries(want)){
  const s=got[k];assert.deepEqual([s.dice[0],s.dice[1],s.bonus,s.size,s.reach,s.traits.slice().sort()],[n,sides,bonus,size,1,traits.slice().sort()],k);
 }
 assert.equal(run('SHIELDS.hoplite.size'),4,'defensive data unchanged');
});
test('a shield strike costs 1 AP, uses the shield profile and leaves the weapon and shield parry alone (P07-09, P07-12)',()=>{
 setup('buckler');
 assert.equal(run('canMakeShieldAttack(S.fighters.a)'),true);
 run('render()');assert.match(output.innerHTML,/data-act="shieldAttack"/);
 run(`beginAttack('a',false,'shield')`);assert.equal(run('S.fighters.a.ap'),2);
 assert.match(answer(20),/^Shield strike · Combat Style 60%/);
 assert.equal(run('S.pending.attackKey'),'shield:buckler');assert.equal(run('S.fighters.a.weapon'),'sword');
 assert.equal(run('canShieldParry(S.fighters.a)'),true,'the shield can still parry later, for AP');
});
test('shield damage: its own dice plus Damage Modifier, rolled once (P07-10)',()=>{
 setup('buckler');hit({attackKey:'shield:buckler'});
 assert.match(run('R.label'),/^Damage · Chest/);assert.equal(run('R.defs.length'),2,'1d3 + DM 1d2');
 answer(3,1);
 assert(logs().some(l=>/hits Chest :: 3 weapon \(3\) \+1d2 \(\+1\) = 4 total; 0 parry; 0 armour; 4 HP lost/.test(l)),logs().join('\n'));
});
test('parry absorption uses the striking shield\'s Size, not the sword\'s (P07-11)',()=>{
 setup('hoplite');                                    // Huge shield vs Medium parrying sword: two steps → no block
 hit({attackKey:'shield:hoplite',reaction:'parry',parryTool:'weapon',defenseRoll:{grade:2,roll:30,label:'Success'}});answer(4,1);
 assert(logs().some(l=>/= 5 total; 0 parry/.test(l)),logs().join('\n'));
 setup('hoplite');                                    // the sword itself: equal Size → blocks all
 hit({reaction:'parry',parryTool:'weapon',defenseRoll:{grade:2,roll:30,label:'Success'}});answer(8,1);
 assert(logs().some(l=>/= 9 total; 9 parry/.test(l)),logs().join('\n'));
});
test('Special Effects follow the shield: Bash for all, Stun Location or Impale (Target), not the sword\'s (P07-13)',()=>{
 const eff=(shield,key)=>{setup(shield);return JSON.parse(run(`(()=>{S.pending={kind:'effect',atk:'a',def:'b',owner:'a',other:'b',attackKey:${JSON.stringify(key)},attackRoll:{grade:2,roll:20,label:'Success'},defenseRoll:{grade:1,roll:80,label:'Failure'},reaction:'none',chosen:[],effectsLeft:1};return JSON.stringify(availableEffects(S.pending).map(e=>e[0]));})()`));};
 const buckler=eff('buckler','shield:buckler');
 assert(buckler.includes('bash')&&buckler.includes('stun'));assert(!buckler.includes('bleed')&&!buckler.includes('impale'),'nothing from the sword');
 const target=eff('target','shield:target');assert(target.includes('bash')&&target.includes('impale')&&!target.includes('stun'));
 const sword=eff('buckler','sword');assert(!sword.includes('bash'),'the sword itself cannot Bash');
});
test('Bash distance: shield 1m per two complete points, bludgeon per three; no extra metre (P07-14, P07-15)',()=>{
 assert.deepEqual([1,5,6].map(d=>run(`bashMetres(${d},true)`)),[0,2,3]);
 assert.deepEqual([1,5,6].map(d=>run(`bashMetres(${d},false)`)),[0,1,2]);
 setup('hoplite');hit({attackKey:'shield:hoplite',bash:true});answer(4,1);   // 5 damage
 assert(logs().some(l=>/^Bash :: .*knocks .* 2m back/.test(l)),logs().join('\n'));
});
test('shield Bash measures damage before parry and armour (P07-16)',()=>{
 setup('hoplite');run('S.fighters.b.armourLocations.Chest=10');
 hit({attackKey:'shield:hoplite',bash:true,reaction:'parry',parryTool:'weapon',enhanceParry:true,defenseRoll:{grade:3,roll:3,label:'Critical'}});answer(4,1);
 assert(logs().some(l=>/= 5 total; 5 parry; 0 armour; 0 HP lost/.test(l)),logs().join('\n'));
 assert(logs().some(l=>/^Bash :: .* 2m back/.test(l)),'still pushed 2m');
});
test('Bash only works up to twice the attacker\'s SIZ, and Brace doubles SIZ against it (P07-17)',()=>{
 const eff=()=>JSON.parse(run(`(()=>{S.pending={kind:'effect',atk:'a',def:'b',owner:'a',other:'b',attackKey:'shield:buckler',attackRoll:{grade:2,roll:20,label:'Success'},defenseRoll:{grade:1,roll:80,label:'Failure'},reaction:'none',chosen:[],effectsLeft:1};return JSON.stringify(availableEffects(S.pending).map(e=>e[0]));})()`));
 setup('buckler');run('S.fighters.b.siz=26');assert(eff().includes('bash'),'26 = 2×13');
 run('S.fighters.b.siz=27');assert(!eff().includes('bash'),'27 > 2×13');
 setup('hoplite');run('S.fighters.b.siz=14;S.fighters.b.braced=true');hit({attackKey:'shield:hoplite',bash:true});answer(4,1);
 assert(logs().some(l=>/^Bash :: .* is not moved by Bash/.test(l)),'braced 28 > 26: not moved');
});
test('shield Bash and ordinary Knockback never both apply (P07-18)',()=>{
 setup('hoplite');run('S.fighters.b.siz=3');hit({attackKey:'shield:hoplite',bash:true});answer(4,1);   // 5 > SIZ 3
 assert(logs().some(l=>l.startsWith('Bash ::')));assert(!logs().some(l=>l.startsWith('Knockback ::')));
});
test('hitting the barrier: Hard Athletics or Acrobatics, whichever is better (P07-19)',()=>{
 setup('hoplite');run('S.fighters.b.acrobatics=90;S.ringClearance.b=1');hit({attackKey:'shield:hoplite',bash:true});answer(4,1);
 assert.match(answer(50),/^Bash barrier · Hard Acrobatics 60%/);
 assert(logs().some(l=>/^Bash · Barrier :: .*Acrobatics 50\/60%/.test(l)),logs().join('\n'));
});
test('no shield strike without a usable shield; the weapon attack stays available (P07-20)',()=>{
 for(const block of [`S.fighters.a.shield='none'`,`S.fighters.a.disabled=['Left Arm']`,`S.fighters.a.pinnedGear='shield'`,`S.fighters.a.stunnedLocations={'Left Arm':2}`]){
  setup('buckler');run(block);
  assert.equal(run('canMakeShieldAttack(S.fighters.a)'),false,block);assert.equal(run('canMakeAttack(S.fighters.a)'),true,block);
 }
});
test('an impaling Target shield can be left in the wound: the shield is lost, the weapon is not',()=>{
 setup('target');hit({attackKey:'shield:target',impale:true});
 answer(3,3,1);run('chooseImpaleDamage(0)');run('chooseImpaleLeave(true)');
 assert.equal(run('S.fighters.a.shieldLost'),true);assert.equal(run('S.fighters.a.disarmed'),false);
 assert.equal(run('canUseWeapon(S.fighters.a)'),true);assert.equal(run('canShieldParry(S.fighters.a)'),false);
});
console.log(passed+' practice shield tests passed');
