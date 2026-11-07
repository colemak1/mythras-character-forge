// Practice Combat rules parity (owner, 2026-11-07: rules first). The arena
// must use the shared, source-checked data and formulas of the main app.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
// Arena, as the browser loads it: shared data, then its helpers and inline script.
const output={innerHTML:'',addEventListener(){}};
const arena={console,URLSearchParams,setTimeout,clearTimeout,setInterval,clearInterval,location:{search:''},
 sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
 document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
 window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
vm.createContext(arena);
const page=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8');
assert.match(page,/<script src="\.\.\/js\/data\.js\?v=[0-9a-f]+"><\/script>\s*<script src="practice-character\.js/,'the arena loads the shared data before its own scripts');
for(const f of ['js/data.js','experiments/practice-character.js','experiments/practice-guidance.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),arena);
vm.runInContext(page.match(/<script>([\s\S]*?)<\/script>/)[1],arena);
const A=s=>vm.runInContext(s,arena);
// Main app engine for the formulas.
const app={console};vm.createContext(app);
for(const f of ['js/data.js','js/engine.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),app);
const E=s=>vm.runInContext(s,app);

test('every Core melee weapon and shield the arena supports matches the shared table',()=>{
 const rows=JSON.parse(A(`JSON.stringify(WEAPONS.filter(w=>!practiceUnsupportedReason(w)).map(w=>({w,k:practiceWeaponKey(w.name)})))`));
 assert(rows.length>=40);
 const size={S:1,M:2,L:3,H:4,E:5},reach={T:0,S:1,M:2,L:3,VL:4},fx={Bleed:'bleed',Impale:'impale',Bash:'bash','Stun Location':'stun',Sunder:'sunder',Entangle:'entangle'};
 for(const {w,k} of rows){
  if(w.group==='Shield'){const s=JSON.parse(A(`JSON.stringify(SHIELDS[${JSON.stringify(k)}])`));
   assert.equal(s.name,w.name);assert.equal(s.size,size[w.size]);assert.equal(s.coverage,+(/Passive Blocks (\d+)/.exec(w.traits)[1]),w.name);continue;}
  const a=JSON.parse(A(`JSON.stringify(ARENA_WEAPONS[${JSON.stringify(k)}])`));
  const m=/^(\d+)d(\d+)(?:\+(\d+))?$/.exec(w.dmg);
  assert.deepEqual(a.dice,[+m[1],+m[2]],w.name);assert.equal(a.bonus,+(m[3]||0),w.name);
  assert.equal(a.size,size[w.size],w.name);assert.equal(a.reach,reach[w.reach],w.name);
  assert.equal(a.twoHanded,w.group==='Two-Handed',w.name);assert.equal(a.noParry,/\bOffensive\b/.test(w.traits),w.name);
  assert.deepEqual(JSON.parse(A(`JSON.stringify(WEAPON_TRAITS[${JSON.stringify(k)}])`)),w.effects.split(/,\s*/).map(e=>fx[e]).filter(Boolean),w.name);
  assert.deepEqual(JSON.parse(A(`JSON.stringify(WEAPON_DURABILITY[${JSON.stringify(k)}])`)),w.apHp.split('/').map(Number),w.name);
 }
});
test('the original five arena keys still point at the same Core weapons',()=>{
 for(const [k,n] of [['sword','Broadsword'],['spear','Shortspear'],['mace','Mace'],['dagger','Dagger'],['greatsword','Greatsword']])assert.equal(A(`ARENA_WEAPONS.${k}.name`),n);
 for(const [k,n] of [['buckler','Buckler'],['heater','Heater'],['hoplite','Hoplite']])assert.equal(A(`SHIELDS.${k}.name`),n);
});
test('ranged, mounted-only and ambush-only weapons are reported as unsupported, with a reason',()=>{
 assert.equal(A(`practiceUnsupportedReason(WEAPON_MAP['Long bow'])`),'ranged weapons are not simulated yet');
 assert.equal(A(`practiceUnsupportedReason(WEAPON_MAP['Lance'])`),'only usable from a moving mount');
 assert.equal(A(`practiceUnsupportedReason(WEAPON_MAP['Garrotte'])`),'only usable from ambush');
 assert.equal(A(`'lance' in ARENA_WEAPONS`),false);
});
test('a weapon that cannot parry (Offensive trait, Core p.61) offers no weapon parry',()=>{
 assert.equal(A(`ARENA_WEAPONS.whip.noParry`),true);assert.equal(A(`ARENA_WEAPONS.sword.noParry`),false);
});
test('Action Points, hit points, Damage Modifier and Initiative match the main app across the whole range',()=>{
 for(let a=2;a<=60;a++)for(let b=2;b<=60;b+=3){
  assert.equal(A(`actionPointsFor(${a},${b})`),E(`apCalc(${a},${b})`),'AP '+a+'+'+b);
  assert.equal(A(`initiativeBonusFor(${a},${b})`),E(`initBonus(${a},${b})`),'Initiative '+a+'+'+b);
  const hp=JSON.parse(A(`JSON.stringify(hitPointsFor(${a},${b}))`)),loc=Object.fromEntries(JSON.parse(E(`JSON.stringify(hpLocs(${a},${b}))`)));
  assert.deepEqual([hp.Head,hp.Chest,hp.Abdomen,hp['Right Arm'],hp['Right Leg']],[loc.Head,loc.Chest,loc.Abdomen,loc['Each Arm'],loc['Each Leg']],'HP '+a+'+'+b);
 }
 for(let v=2;v<=130;v++){const s=Math.floor(v/2),z=v-s;
  assert.equal(A(`damageModifierFor(${s},${z}).label`).replace('−','-'),E(`dmCalc(${s},${z})`),'DM '+v);}
});
console.log(passed+' practice rules tests passed');
