// Run with `node tests/rules-smoke.cjs`; no external dependencies.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const code=['data','engine'].map(n=>fs.readFileSync(path.join(root,'js',n+'.js'),'utf8')).join('\n');
const ctx=vm.createContext({console});vm.runInContext(code,ctx);
const evalRule=x=>vm.runInContext(x,ctx);
const test=(name,run)=>{run();console.log('PASS',name)};
test('core: checked skills give no free Experience Rolls',()=>{
 evalRule('S.xp.pool=0;S.xp.checked=["std:Athletics"];S.chars.CHA=13;');
 assert.equal(evalRule('xpRollsAvailable()'),0);
});
test('core: banked GM-awarded Experience Rolls are available',()=>{
 evalRule('S.xp.pool=4;');assert.equal(evalRule('xpRollsAvailable()'),4);
});
test('cultural style may have 0 allocation',()=>{
 evalRule('S.culture="Civilised"; S.cultStyleOn=true;S.cultStyleName="Guard";');
 assert(evalRule('cultureReqKeys().includes("style:cult")'));
});
test('hobby Combat Style appears in character skills',()=>{
 evalRule('S.hobby="__combat_style__";S.hobbySpec="Duelist";');
 assert(evalRule('stylesList().some(s=>s.key==="style:hobby"&&s.name==="Duelist")'));
});
test('baseline attributes',()=>{
 assert.equal(evalRule('apCalc(12,12)'),2);
 assert.equal(evalRule('apCalc(18,18)'),3);
 assert.equal(evalRule('luckPts(13)'),3);
});

test('Athletics improves running and sprinting (Core pp.39, 70)',()=>{
 evalRule('encStatus=()=>({level:"ok"});S=freshState();S.chars={STR:13,CON:13,SIZ:13,DEX:13,INT:13,POW:13,CHA:13};S.xp.bonus["std:Athletics"]=26;');
 // Base skill STR+DEX=26, bonus 26 -> Athletics 52%, two 25% steps.
 assert.equal(evalRule('moveGaits().walk'),6);
 assert.equal(evalRule('moveGaits().run'),21);
 assert.equal(evalRule('moveGaits().sprint'),40);
});
test('Core-first: Imperative Folk Magic catalogue is not loaded',()=>{
 assert.equal(evalRule('FOLK_MAGIC.length'),0);
});
test('Core-first: human characteristic dice remain available',()=>{
 assert.equal(evalRule('SPECIES_MAP.human.dice.STR'),'3d6');
 assert.equal(evalRule('SPECIES_MAP.human.dice.SIZ'),'2d6+6');
});

test('Core p.34 background event counts are 0/1/2/3/4',()=>{
 const expected=[0,1,2,3,4];
 for(let i=0;i<5;i++){
  evalRule('S.age.category='+JSON.stringify(['young','adult','middle','senior','old'][i]));
  assert.equal(evalRule('coreBackgroundRollCount()'),expected[i]);
 }
});
test('older guest saves without Core events are migrated safely',()=>{
 evalRule('S=freshState(); delete S.age.coreEvents; normalizeState();');
 assert.equal(evalRule('Array.isArray(S.age.coreEvents)'),true);
});

// Regression: requested 1–4 point cultural style option, while preserving a strict Core mode.
test('cultural Combat Style: 0–4 permitted in labeled Sit’ota mode; 1–4 rejected in strict Core mode',()=>{
 evalRule('S=freshState();S.culture="Civilised";S.cultStyleOn=true;S.cultStyleName="Guard";S.cultProf=["Art","Commerce","Craft"];S.cultProfSpec=["Sculpture","","Pottery"];');
 const req=evalRule('cultureReqKeys().filter(x=>x!=="style:cult")');
 assert.equal(req.length,10);
 for(let v=0;v<=4;v++){
   evalRule('S.alloc.culture={};');
   for(const k of req)evalRule('S.alloc.culture['+JSON.stringify(k)+']=10;');
   evalRule('S.alloc.culture['+JSON.stringify(req[0])+']='+(10-v)+';S.alloc.culture["style:cult"]='+v+';S.cultStyleSmallAlloc=true;');
   const result=evalRule('validate(currentSteps().indexOf("Culture"))');
   assert(result.ok,`style allocation ${v}: ${result.msg}`);
 }
 evalRule('S.cultStyleSmallAlloc=false;S.alloc.culture["style:cult"]=3;');
 const strictResult=evalRule('validate(currentSteps().indexOf("Culture"))');
 assert(!strictResult.ok && /5–15 cultural points/.test(strictResult.msg),strictResult.msg);
 evalRule('S.alloc.culture["style:cult"]=0;S.alloc.culture['+JSON.stringify(req[0])+']=10;');
 assert(evalRule('validate(currentSteps().indexOf("Culture")).ok'));
});
test('all four Core cultures define enough eligible skills for 100 cultural points',()=>{
 const names=evalRule('Object.keys(CULTURES)');
 assert.equal(names.length,4);
 for(const name of names){
  const data=evalRule('CULTURES['+JSON.stringify(name)+']');
  assert(data.std.length>=5,`${name}: missing standard skills`);
  assert(data.prof.length>=3,`${name}: missing professional options`);
  assert(data.money>0,`${name}: missing starting-money multiplier`);
  assert(new Set(data.std).size===data.std.length,`${name}: duplicate standard skill`);
 }
});
test('all 24 Core careers have legal pool size and distinct Standard Skills',()=>{
 const names=evalRule('Object.keys(CAREERS)');
 assert.equal(names.length,24);
 for(const name of names){
  const data=evalRule('CAREERS['+JSON.stringify(name)+']');
  assert(data.std.length+data.styleSlots.length>=5,`${name}: too few standard skills`);
  assert(data.prof.length>=3,`${name}: fewer than three professional choices`);
  assert(data.std.length+data.styleSlots.length+3>=7,`${name}: cannot allocate 100 at max 15 each`);
  assert(new Set(data.std).size===data.std.length,`${name}: duplicate standard skill`);
 }
});


test('Culture rejects unavailable Professional Skills even from imported saves',()=>{
 evalRule('S=freshState();S.culture="Civilised";S.cultProf=["Healing","Commerce","Courtesy"];');
 const err=evalRule('validate(currentSteps().indexOf("Culture")).msg');
 assert(/not an available/.test(err),err);
});
test('Career permits separate Lore specialities but rejects identical duplicates',()=>{
 evalRule('S=freshState();S.career="Scholar";S.carProf=["Lore","Lore",null];S.carProfSpec=["History","Geography",""];');
 const v=evalRule('professionalPicksError(S.carProf,S.carProfSpec,CAREERS.Scholar.prof,null,"Career")');
 assert.equal(v,null,v);
 evalRule('S.carProfSpec[1]="History";');
 const dupe=evalRule('professionalPicksError(S.carProf,S.carProfSpec,CAREERS.Scholar.prof,null,"Career")');
 assert(/twice/.test(dupe),dupe);
});
test('Culture rejects invalid negative points regardless of total',()=>{
 evalRule('S=freshState();S.culture="Civilised";S.cultProf=["Art","Commerce","Craft"];S.cultProfSpec=["Painting","","Wood"];S.alloc.culture={"std:Deceit":-1};');
 const err=evalRule('validate(currentSteps().indexOf("Culture")).msg');
 assert(/non-negative whole number/.test(err),err);
});
test('Career rejects points assigned to another career after switching',()=>{
 evalRule('S=freshState();S.career="Scholar";S.alloc.career={"std:Athletics":5};');
 const err=evalRule('validate(currentSteps().indexOf("Career")).msg');
 assert(/unavailable career skill/.test(err),err);
});
test('Bonus allocation rejects values greater than its cap',()=>{
 evalRule('S=freshState();S.hobby="Lore";S.hobbySpec="History";S.alloc.bonus={"std:Athletics":99};');
 const err=evalRule('validate(currentSteps().indexOf("Bonus Skills")).msg');
 assert(/more than/.test(err),err);
});

test('Update 05: Community is included in full and quick flows',()=>{
 evalRule('S=freshState();');
 assert(evalRule('currentSteps().includes("Community")'));
 assert.equal(evalRule('currentSteps().indexOf("Community")'),6);
 evalRule('S.creationMode="quick";');
 assert.equal(evalRule('currentSteps().indexOf("Community")'),4);
});
test('Update 05: old full-mode wizard position and overrides migrate once',()=>{
 evalRule('S=freshState();S._creationFlowVersion=1;S.step=6;S.overrides={"5":true,"6":true,"9":true};normalizeState();');
 assert.equal(evalRule('S.step'),7);
 assert.equal(evalRule('S.overrides[5]'),true);
 assert.equal(evalRule('S.overrides[7]'),true);
 assert.equal(evalRule('S.overrides[10]'),true);
 evalRule('normalizeState();');assert.equal(evalRule('S.step'),7);
});
test('Update 05: old quick-mode wizard position migrates correctly',()=>{
 evalRule('S=freshState();S.creationMode="quick";S._creationFlowVersion=1;S.step=4;normalizeState();');
 assert.equal(evalRule('S.step'),5);
});
test('Update 05: empty Community can be skipped; invalid unnamed contact blocks progress',()=>{
 evalRule('S=freshState();');assert(evalRule('validate(currentSteps().indexOf("Community")).ok'));
 evalRule('S.community.connections.push({type:"Contact",name:"",notes:""});');
 assert(/Name every/.test(evalRule('validate(currentSteps().indexOf("Community")).msg')));
 evalRule('S.community.connections[0].name="Priest";');
 assert(evalRule('validate(currentSteps().indexOf("Community")).ok'));
});
test('Update 05: Community fields and relationships are preserved across JSON round-trip',()=>{
 evalRule('S=freshState();S.community.family="Clan A";S.community.partyTie="Friends";S.community.connections=[{type:"Enemy",name:"Lord",notes:"Feud"}];');
 const saved=JSON.parse(evalRule('JSON.stringify(S)'));
 evalRule('S=Object.assign(freshState(),'+JSON.stringify(saved)+');normalizeState();');
 assert.equal(evalRule('S.community.family'),'Clan A');
 assert.equal(evalRule('S.community.connections[0].type'),'Enemy');
 assert.equal(evalRule('S.community.partyTie'),'Friends');
});
test('Update 05: corrupt relationship records safely normalize',()=>{
 evalRule('S=freshState();S.community={connections:[null,{type:"Unknown",name:5,notes:null}]};normalizeState();');
 assert.equal(evalRule('S.community.connections.length'),1);
 assert.equal(evalRule('S.community.connections[0].type'),'Contact');
});
test('Update 05: financial validation rejects negative spending and modifier',()=>{
 evalRule('S=freshState();S.money.spent=-5;');
 assert(/Additional spending/.test(evalRule('validate(currentSteps().indexOf("Money & Gear")).msg')));
 evalRule('S.money.spent=0;S.money.mod=-1;');
 assert(/Money modifier/.test(evalRule('validate(currentSteps().indexOf("Money & Gear")).msg')));
 evalRule('S.money.mod=1;S.inventory=[{name:"Stone",qty:-3,enc:1}];');
 assert(/Inventory/.test(evalRule('validate(currentSteps().indexOf("Money & Gear")).msg')));
});

// Render the new step without a browser to catch malformed handlers or omissions.
test('Update 05: Community HTML renders with all relationship fields',()=>{
 vm.runInContext(fs.readFileSync(path.join(root,'js','render.js'),'utf8'),ctx);
 evalRule('S=freshState();S.community.connections=[{type:"Ally",name:"Vara",notes:"Friend"}];');
 const html=evalRule('stepCommunity()');
 for(const x of ['Family & community','Allies, Contacts, Rivals & Enemies','APP.communityField','APP.communityConnection','Vara','Why this party?'])assert(html.includes(x),`Missing ${x}`);
});


test('Update 06: inventory quantity times unit price updates silver ledger',()=>{
 evalRule('S=freshState();S.culture="Civilised";S.chars={STR:13,CON:13,SIZ:13,DEX:13,INT:13,POW:13,CHA:13};S.money.dice=[3,3,3,3];S.inventory=[{name:"Torch",qty:3,enc:1,cost:4}];');
 evalRule('armorCostTotal=()=>0;weaponsCost=()=>0;');
 assert.equal(evalRule('inventoryCostTotal()'),12);
 assert.equal(evalRule('moneySpentTotal()'),evalRule('gearCostTotal()')+12);
 assert.equal(evalRule('moneyRemaining()'),evalRule('moneyTotal()')-evalRule('moneySpentTotal()'));
});
test('Update 06: inventory legacy item without price is safely zero-priced',()=>{
 evalRule('S=freshState();S.inventory=[{name:"Old Save Item",qty:2,enc:1}];');
 assert.equal(evalRule('inventoryCostTotal()'),0);
});
test('Update 06: creator requires 4d6 money to be rolled',()=>{
 evalRule('S=freshState();S.culture="Civilised";S.chars={STR:13,CON:13,SIZ:13,DEX:13,INT:13,POW:13,CHA:13};');
 assert(/Roll your starting money/.test(evalRule('validate(currentSteps().indexOf("Money & Gear")).msg')));
});
test('Update 06: creator rejects STR x4 hard ENC limit',()=>{
 evalRule('armorEncTotal=()=>0;weaponsEnc=()=>0;');
 evalRule('S=freshState();S.culture="Civilised";S.chars={STR:10,CON:13,SIZ:13,DEX:13,INT:13,POW:13,CHA:13};S.money.dice=[6,6,6,6];S.inventory=[{name:"Anvil",qty:1,enc:41,cost:0}];');
 assert(/STR × 4/.test(evalRule('validate(currentSteps().indexOf("Money & Gear")).msg')));
});
test('Update 06: invalid inventory quantity and price are rejected',()=>{
 evalRule('S=freshState();S.money.dice=[6,6,6,6];S.inventory=[{name:"Bad",qty:1.5,enc:0,cost:1}];');
 assert(/Inventory/.test(evalRule('validate(currentSteps().indexOf("Money & Gear")).msg')));
 evalRule('S.inventory=[{name:"Bad",qty:1,enc:0,cost:-1}];');
 assert(/Inventory/.test(evalRule('validate(currentSteps().indexOf("Money & Gear")).msg')));
});

// Update 07: Play Mode must compute party members from their own data, not active S.
vm.runInContext(fs.readFileSync(path.join(root,'js','play.js'),'utf8'),ctx);
test('Update 07: party vitals do not inherit open-character Pulp advantages',()=>{
 evalRule('S=freshState();S.chars={STR:13,CON:13,SIZ:13,DEX:13,INT:13,POW:13,CHA:13};S.archetype="paragon";S.archAdvantages=["hp","ap","luck"];');
 const v=evalRule('charVitals({...freshState(), chars:{STR:13,CON:13,SIZ:13,DEX:13,INT:13,POW:13,CHA:13}})');
 assert.equal(v.maxAP,evalRule("apCalc(13,13)"));assert.equal(v.maxLuck,3);assert.equal(v.locs.find(l=>l.loc==="Head").max,evalRule('hpLocs(13,13).find(x=>x[0]==="Head")[1]'));
});
test('Update 07: party member with own Paragon advantages keeps bonuses',()=>{
 const v=evalRule('charVitals({...freshState(), archetype:"paragon", archAdvantages:["hp","ap","luck"],chars:{STR:13,CON:13,SIZ:13,DEX:13,INT:13,POW:13,CHA:13}})');
 assert.equal(v.maxAP,evalRule("apCalc(13,13)")+1);assert.equal(v.maxLuck,5);assert.equal(v.locs.find(l=>l.loc==="Head").max,evalRule('hpLocs(13,13).find(x=>x[0]==="Head")[1]')+2);
});
test('Update 07: wound values are bounded and bad imported HP does not break sheet',()=>{
 assert.equal(evalRule('playValidHP(500,6)'),6);assert.equal(evalRule('playValidHP(-500,6)'),-6);
 assert.equal(evalRule('playValidHP("bad",6)'),6);assert.equal(evalRule('playValidHP(2.9,6)'),2);
 evalRule('S=freshState();S.chars={STR:13,CON:13,SIZ:13,DEX:13,INT:13,POW:13,CHA:13};S.play.hp.Head=999;');
 assert.equal(evalRule('charVitals().locs.find(x=>x.loc==="Head").cur'),evalRule('playMaxHP("Head")'));
});
test('Update 07: invalid saved fatigue falls back to Fresh',()=>{
 evalRule('S=freshState();S.play.fatigue="Imaginary";normalizeState();');
 assert.equal(evalRule('S.play.fatigue'),'Fresh');
});

// Update 08 — sourcebook-verified weapons, armour and Bleed behaviour.
const playSource=fs.readFileSync(path.join(root,'js','play.js'),'utf8');
test('Core p.96: Bleed loses Fatigue, not 1 hit point per round',()=>{
 assert(/lose one level of Fatigue at the start of each Combat Round/.test(playSource));
 assert(!/loses 1 HP from that location each round/.test(playSource));
 assert(/Bleed Special Effect: lose Fatigue levels, not HP/.test(playSource));
});
test('Core p.63: one-handed weapons and shields are present exactly once',()=>{
 const w=evalRule('WEAPONS.filter(w=>w.group==="One-Handed")');
 const sh=evalRule('WEAPONS.filter(w=>w.group==="Shield")');
 assert.equal(w.length,23);assert.equal(sh.length,8);
 assert.equal(new Set([...w,...sh].map(x=>x.name)).size,31);
});
test('Core p.63: select weapon row values from printed sourcebook table',()=>{
 const cases={
  'Ball & chain':{dmg:'1d6+1',size:'M',reach:'M',enc:2,apHp:'6/8',cost:250},
  'Dagger':{dmg:'1d4+1',size:'S',reach:'S',enc:0,apHp:'6/8',cost:30},
  'Lance':{dmg:'1d10+2',size:'H',reach:'VL',enc:3,apHp:'4/10',cost:150},
  'Longsword':{dmg:'1d8',size:'M',reach:'L',enc:2,apHp:'6/12',cost:250},
  'Shortspear':{dmg:'1d8+1',size:'M',reach:'L',enc:2,apHp:'4/5',cost:20},
  'Whip':{dmg:'1d3',size:'M',reach:'VL',enc:1,apHp:'2/8',cost:100},
  'Buckler':{dmg:'1d3',size:'M',reach:'S',enc:1,apHp:'6/9',cost:50},
  'Scutum':{dmg:'1d4',size:'H',reach:'S',enc:4,apHp:'4/18',cost:450},
  'Viking':{dmg:'1d4',size:'L',reach:'S',enc:3,apHp:'4/12',cost:300}
 };
 for(const [name,expected] of Object.entries(cases)){const actual=evalRule('WEAPON_MAP['+JSON.stringify(name)+']');assert(actual,name+' missing');for(const [k,v] of Object.entries(expected))assert.equal(actual[k],v,name+' '+k);}
});
test('core armor table: basic AP and ENC entries stay consistent',()=>{
 const cases=[['None',0,0],['Natural/Cured (furs, hides)',1,2],['Padded/Quilted (aketon, gambeson)',2,1],['Half Plate (hoplite plate)',5,4],['Articulated Plate (gothic plate)',8,7]];
 for(const [name,ap,enc] of cases){const armor=evalRule('ARMOR_MAP['+JSON.stringify(name)+']');assert(armor,name);assert.equal(armor.ap,ap);assert.equal(armor.encPerLoc,enc);}
});
test('combat special effects list is unique and searchable',()=>{
 const names=[...playSource.matchAll(/^\["([^"\n]+)",[01],[01],/gm)].map(m=>m[1]);
 assert(names.length>=35);assert.equal(names.length,new Set(names).size);
 assert(names.includes('Bleed'));assert(names.includes('Choose Location'));
});

// Update 09 — Core p.97, 98, 100, 110 combat rule parity and player reminders.
test('Update 09: Stun Location distinguishes torso from head (Core p.100)',()=>{
 const effect=playSource.match(/\["Stun Location"[^\n]+/)[0];
 assert(/torso hit/.test(effect));assert(/head hit renders/.test(effect));
 assert(!/head causes the defender to stagger/.test(effect));
});
test('Update 09: Bash includes twice-SIZ restriction (Core p.97)',()=>{
 const effect=playSource.match(/\["Bash"[^\n]+/)[0];
 assert(/twice the attacker/.test(effect));
});
test('Update 09: Compel Surrender is explicitly non-damaging (Core p.98)',()=>{
 const effect=playSource.match(/\["Compel Surrender"[^\n]+/)[0];
 assert(/No damage is inflicted/.test(effect));
});
test('Update 09: Serious and Major wound checks visible for limbs and torso',()=>{
 assert(/function playWoundActionText/.test(playSource));
 assert(/5 × Healing Rate minutes/.test(playSource));
 assert(/2 × Healing Rate combat rounds/.test(playSource));
 assert(/role=\"status\"/.test(playSource));
});
test('Update 09: Full core armour table AP, ENC and printed suit costs',()=>{
 const expected=[
  ['None',0,0,'0/0/0'],['Natural/Cured (furs, hides)',1,2,'14/140/3'],
  ['Padded/Quilted (aketon, gambeson)',2,1,'7/560/2'],
  ['Laminated (linothorax, bezainted)',3,2,'14/1260/3'],
  ['Scaled (brigandine, lamellar)',4,3,'21/2240/5'],
  ['Half Plate (hoplite plate)',5,4,'28/3500/6'],
  ['Mail (mail hauberk, laminar)',6,5,'30/6300/7'],
  ['Plated Mail (splinted chainmail)',7,6,'42/9800/9'],
  ['Articulated Plate (gothic plate)',8,7,'49/16800/10']
 ];
 for(const [name,ap,enc,suit] of expected){
  const a=evalRule('ARMOR_MAP['+JSON.stringify(name)+']');
  assert.equal(a.ap,ap,name);assert.equal(a.encPerLoc,enc,name);assert.equal(a.suit,suit,name);
 }
});

// Update 10 — sourcebook visually verified against Core p.65 ranged table.
test('Update 10: complete ranged catalogue and Core p.65 range/load/force data',()=>{
 const items=evalRule('WEAPONS.filter(w=>w.group==="Ranged")');
 assert.equal(items.length,19);
 const cases={
 'Heavy crossbow': ['1d10','20/150/300',4,'H','N','S'],
 'Light crossbow': ['1d8','20/100/200',3,'L','N','S'],
 'Long bow':['1d8','15/125/250',2,'H','Y','S'],
 'Javelin':['1d8+1','10/20/50','—','H','Y','M'],
 'Short bow':['1d6','15/100/200',2,'L','Y','S'],
 'Trident (thrown)':['1d8','10/15/30','—','L','Y','M'],
 'Sling':['1d8','10/150/300',3,'L','N',null],
 'Staff sling':['2d6','5/25/50',4,'E','N',null]
 };
 for(const [name,expected] of Object.entries(cases)){
  const w=evalRule('WEAPON_MAP['+JSON.stringify(name)+']');
  assert(w,name); assert.deepEqual([w.dmg,w.range,w.load,w.reach,w.dmgMod,w.impaleSize||null],expected,name);
 }
 for(const w of items){
  assert(/^(?:\d+\/?\d+\/?\d+|0\+\/25\+\/75\+)$/.test(w.range),w.name+' has invalid range');
  assert(typeof w.load==='number'||w.load==='—',w.name+' has invalid reload');
  assert(w.effects.includes('Impale')?!!w.impaleSize:!w.impaleSize,w.name+' impale size issue');
 }
});
test('Update 10: reload actions are weapon-specific rather than first-weapon-derived',()=>{
 assert(playSource.includes('const reloadActions=(S.gearWeapons||[])'));
 assert(playSource.includes('...reloadActions,'));
 assert(!playSource.includes('reloadWeaponName'));
 assert(!playSource.includes('Reload Ranged Weapon",ap:reloadCost||1'));
});
test('Update 10: all ranged stat columns display on digital sheet and Play Mode',()=>{
 assert(playSource.includes('<th>Force</th><th>DM</th><th>Load</th><th>Impale</th>'));
 assert(playSource.includes('IMPALE SIZE'));
 assert(fs.readFileSync(path.join(root,'js','render.js'),'utf8').includes('w.impaleSize'));
});

// Update 11 — resource safety (magic details still require chapter-by-chapter audit).
test('Update 11: no magic casting on an unnamed entry',()=>{
 assert(/Name this/.test(evalRule('magicCastPreflight({tradition:"sorcery",name:"",shapings:[]},10,10)')));
});
test('Update 11: low MP stops Folk Magic and Sorcery before dice roll',()=>{
 evalRule('var originalMagicSkillPct=magicSkillPct;magicSkillPct=()=>50');
 assert(/Not enough Magic Points/.test(evalRule('magicCastPreflight({tradition:"folk",name:"Light"},0,0)')));
 assert(/Not enough Magic Points/.test(evalRule('magicCastPreflight({tradition:"sorcery",name:"Ward",shapings:["Range","Duration"]},2,0)')));
 assert.equal(evalRule('magicCastPreflight({tradition:"sorcery",name:"Ward",shapings:["Range","Duration"]},3,0)'),null);
 evalRule('magicSkillPct=originalMagicSkillPct');
});
test('Update 11: devotional cost cannot exceed remaining pool',()=>{
 assert(/Confirm/.test(evalRule('magicCastPreflight({tradition:"theism",name:"Bless",cost:3},20,10)')));
 assert(/Not enough Devotional Pool/.test(evalRule('magicCastPreflight({tradition:"theism",name:"Bless",cost:3,miracleLevel:3,miracleInstances:1},20,2)')));
 assert.equal(evalRule('magicCastPreflight({tradition:"theism",name:"Bless",miracleLevel:3,miracleInstances:1},0,3)'),null);
});
test('Update 11: zero-cost imported talent cannot silently cast',()=>{
 assert(/positive Magic Point cost/.test(evalRule('magicCastPreflight({tradition:"mysticism",name:"Focus",cost:0},9,9)')));
});
test('Update 11: casts precheck before rolling and never overspend Magic Points',()=>{
 const app=fs.readFileSync(path.join(root,'js','app.js'),'utf8');
 assert(app.indexOf('magicCastPreflight(m,playCurMagic(),devotionalCur())')<app.indexOf('const r=d100();'));
 assert(app.includes('const paid=Math.min(mp,playCurMagic())'));
 assert(!app.includes('S.play.magic=Math.max(0,playCurMagic()-cost)'));
});

// Update 12 — Sorcery Invocation result table, Core p.165.
test('Update 12: Sorcery failure spends zero, fumble full, critical half, success full',()=>{
 const v='({tradition:"sorcery",name:"Test",shapings:["Range","Duration"]})';
 assert.equal(evalRule('sorceryOutcomeCost('+v+',"Failure")'),0);
 assert.equal(evalRule('sorceryOutcomeCost('+v+',"Fumble")'),3);
 assert.equal(evalRule('sorceryOutcomeCost('+v+',"Success")'),3);
 assert.equal(evalRule('sorceryOutcomeCost('+v+',"Critical")'),2);
});
test('Update 12: Sorcery critical rounds partial Magic Point cost up',()=>{
 assert.equal(evalRule('sorceryOutcomeCost({shapings:[]},"Critical")'),1);
 assert.equal(evalRule('sorceryOutcomeCost({shapings:["Range"]},"Critical")'),1);
});
test('Update 12: Sorcery cost is not charged generically only on success',()=>{
 const app=fs.readFileSync(path.join(root,'js','app.js'),'utf8');
 assert(app.includes('m.tradition!=="animism"')); 
 assert(app.includes('sorceryOutcomeCost(m,tier)'));
});

// Update 13 — Core p.181 Exhort cost table.
test('Update 13: Theism Exhort Critical / Failure 0, Fumble 1, Success full',()=>{
 const e='{tradition:"theism",name:"Miracle",cost:3}';
 for(const [tier,val] of [['Critical',0],['Failure',0],['Fumble',1],['Success',3]])
  assert.equal(evalRule('theismOutcomeCost('+e+','+JSON.stringify(tier)+')'),val);
});
test('Core p.181: miracle level and instances determine cost and exhortation turns',()=>{
 assert.equal(evalRule('theismDetails({miracleLevel:2,miracleInstances:1}).cost'),2);
 assert.equal(evalRule('theismDetails({miracleLevel:2,miracleInstances:1}).turns'),2);
 assert.equal(evalRule('theismDetails({miracleLevel:2,miracleInstances:3}).cost'),6);
 assert.equal(evalRule('theismDetails({miracleLevel:2,miracleInstances:3}).turns'),4);
 for(const [tier,val] of [['Critical',0],['Failure',0],['Fumble',1],['Success',6]])assert.equal(evalRule('theismOutcomeCost({miracleLevel:2,miracleInstances:3},'+JSON.stringify(tier)+')'),val);
});
test('Update 13: Mysticism cost by roll outcome (Core p.156)',()=>{
 const e='{tradition:"mysticism",name:"Talent",cost:5}';
 for(const [tier,val] of [['Critical',3],['Failure',1],['Fumble',5],['Success',5]])
  assert.equal(evalRule('mysticismOutcomeCost('+e+','+JSON.stringify(tier)+')'),val);
});
test('Update 13: Mysticism per-talent and concurrent intensity limits',()=>{
 assert.equal(evalRule('mysticismLimits(34,54).individual'),2);
 assert.equal(evalRule('mysticismLimits(63,54).individual'),4); // tentative rounding
 assert.equal(evalRule('mysticismLimits(63,54).combined'),5);
 assert.equal(evalRule('mysticismLimits(19,9).individual'),1); // tentative rounding
});
test('Update 13: separate magic outcomes used in cast path',()=>{
 const app=fs.readFileSync(path.join(root,'js','app.js'),'utf8');
 assert(app.includes('theismOutcomeCost(m,tier)'));
 assert(app.includes('mysticismOutcomeCost(m,tier)'));
 assert(app.includes('m.tradition==="animism"'));
});

// Update 14 — Core pp.164–165, 157.
test('Update 14: Shaping levels preserve cost by distinct modified categories',()=>{
 const e='{shapingLevels:{Range:3,Duration:2},combineExtra:0}';
 assert.equal(evalRule('sorceryCost('+e+').mp'),3);
 assert.equal(evalRule('sorceryCost('+e+').turns'),3);
 assert.equal(evalRule('sorceryCost('+e+').shapingPoints'),5);
});
test('Update 14: Combine adds one MP per extra spell, not casting turns',()=>{
 const e='{shapingLevels:{Range:3},combineExtra:2}';
 assert.equal(evalRule('sorceryCost('+e+').mp'),5);
 assert.equal(evalRule('sorceryCost('+e+').turns'),3);
});
test('Core p.162: Shaping budget, legacy review and Combine difficulty',()=>{
 evalRule('var oldShapingPct=magicSkillPct;magicSkillPct=()=>47');
 assert.equal(evalRule('magicCastPreflight({tradition:"sorcery",name:"Ward",shapingLevels:{Range:3,Combine:2}},20,0)'),null);
 assert.match(evalRule('magicCastPreflight({tradition:"sorcery",name:"Ward",shapingLevels:{Range:4,Combine:2}},20,0)'),/exceeds/);
 assert.match(evalRule('magicCastPreflight({tradition:"sorcery",name:"Ward",shapingLevels:{Intensity:1}},20,0)'),/Intensity/);
 assert.match(evalRule('magicCastPreflight({tradition:"sorcery",name:"Ward",shapingLevels:{Range:1.5}},20,0)'),/Invalid Shaping/);
 assert.match(evalRule('magicCastPreflight({tradition:"sorcery",name:"Ward",shapingLevels:{},combineExtra:1},20,0)'),/legacy/);
 evalRule('magicSkillPct=()=>null');
 assert.equal(evalRule('magicCastPreflight({tradition:"sorcery",name:"Ward",shapingLevels:{}},20,0)'),null);
 assert.match(evalRule('magicCastPreflight({tradition:"sorcery",name:"Ward",shapingLevels:{Range:1}},20,0)'),/exceeds/);
 evalRule('magicSkillPct=oldShapingPct;ACTIVE_GRADE="standard";S.play.fatigue="Fresh";encGradeSteps=()=>0');
 assert.equal(evalRule('sorceryInvocationGrade("test",90,1).grade'), 'hard');
 assert.equal(evalRule('sorceryInvocationGrade("test",90,2).pct'),45);
});
test('Draft Shaping rounding behavior at boundaries is explicit',()=>{
 evalRule('var savedMagicSkillPct=magicSkillPct');
 for(const [skill,allowed] of [[1,1],[10,1],[11,2],[19,2],[20,2],[21,3],[47,5]]){
  evalRule('magicSkillPct=()=>'+skill);
  assert.equal(evalRule('magicCastPreflight({tradition:"sorcery",name:"Ward",shapingLevels:{Range:'+allowed+'}},50,0)'),null);
  assert.match(evalRule('magicCastPreflight({tradition:"sorcery",name:"Ward",shapingLevels:{Range:'+(allowed+1)+'}},50,0)'),/exceeds/);
 }
 evalRule('magicSkillPct=savedMagicSkillPct');
});
test('Legacy sorcery data survives normalization and JSON round trip',()=>{
 evalRule('S=freshState();S.magic.known=[{tradition:"sorcery",name:"Legacy",shapingLevels:{Intensity:2,Range:1},combineExtra:2}];normalizeState();S=JSON.parse(JSON.stringify(S));normalizeState()');
 assert.equal(evalRule('S.magic.known[0].shapingLevels.Intensity'),2);
 assert.equal(evalRule('S.magic.known[0].combineExtra'),2);
 assert.match(evalRule('magicCastPreflight(S.magic.known[0],30,0)'),/Intensity/);
});
test('Update 14: old shaping chip arrays remain supported',()=>{
 assert.equal(evalRule('sorceryCost({shapings:["Range","Duration"]}).mp'),3);
});
test('Update 14: active talent limits guard individual and combined intensity',()=>{
 const arr='[{tradition:"mysticism",name:"A",intensity:3,active:true},{tradition:"mysticism",name:"B",intensity:3,active:false}]';
 assert.equal(evalRule('mysticismActiveTotal('+arr+')'),3);
 assert(/combined/.test(evalRule('mysticismActivationCheck('+arr+',1,4,5)')));
 assert.equal(evalRule('mysticismActivationCheck('+arr+',1,4,6)'),null);
 assert(/individual/.test(evalRule('mysticismActivationCheck('+arr+',1,2,10)')));
});
test('Update 14: migration preserves old magic entries',()=>{
 evalRule('S=freshState();S.magic.known=[{tradition:"sorcery",name:"A",shapings:["Range","Duration"]},{tradition:"mysticism",name:"B",intensity:1}];normalizeState()');
 assert.equal(evalRule('S.magic.known[0].shapingLevels.Range'),1);
 assert.equal(evalRule('S.magic.known[0].shapingLevels.Duration'),1);
 assert.equal(evalRule('S.magic.known[1].active'),false);
});

test('Update 15: Sorcery cast tracker migrates and survives valid saves',()=>{
 evalRule('S=freshState(); S.play.sorceryCasting={index:0,name:"Spell",completed:1,total:3};normalizeState();');
 assert.equal(evalRule('S.play.sorceryCasting.completed'),1);
 evalRule('S.play.sorceryCasting={index:0,name:"Spell",completed:3,total:3};normalizeState();');
 assert.equal(evalRule('S.play.sorceryCasting'),null);
});
test('Update 15: old Mysticism entries migrate duration safely',()=>{
 evalRule('S=freshState(); S.magic.known=[{tradition:"mysticism",name:"Talent",intensity:2,active:true}]; normalizeState();');
 assert.equal(evalRule('S.magic.known[0].durationTurns'),0);
 assert.equal(evalRule('S.magic.known[0].remainingTurns'),0);
 assert.equal(evalRule('S.magic.known[0].active'),true);
});
test('Update 15: Mysticism durations do not alter the combined Intensity rule',()=>{
 evalRule('S=freshState(); S.magic.known=[{tradition:"mysticism",name:"A",intensity:2,active:true,durationTurns:3,remainingTurns:2},{tradition:"mysticism",name:"B",intensity:3,active:false,durationTurns:4,remainingTurns:0}];');
 assert.equal(evalRule('mysticismActiveTotal(S.magic.known)'),2);
 assert(evalRule('mysticismActivationCheck(S.magic.known,1,5,4)'));
});

// Update 16: Core p.136 bound spirit commands.
test('Update 16: command outcomes follow Core p.136',()=>{
 for(const [tier,cost,broken,obeyed] of [['Critical',0,false,true],['Success',1,false,true],['Failure',1,false,false],['Fumble',1,true,false]]){
   const r=evalRule('spiritCommandOutcome('+JSON.stringify(tier)+')');
   assert.equal(r.cost,cost);assert.equal(r.broken,broken);assert.equal(r.obeyed,obeyed);
 }
});
test('Update 16: unbound spirits and insufficient MP cannot be commanded',()=>{
 assert(/not marked as bound/.test(evalRule('spiritCommandPreflight({tradition:"animism",name:"Shade",spiritStatus:"unbound"},5)')));
 assert(/at least 1 Magic Point/.test(evalRule('spiritCommandPreflight({tradition:"animism",name:"Shade",spiritStatus:"bound"},0)')));
 assert.equal(evalRule('spiritCommandPreflight({tradition:"animism",name:"Shade",spiritStatus:"bound",pow:15},2,45)'),null);
 assert.match(evalRule('spiritCommandPreflight({tradition:"animism",name:"Shade",spiritStatus:"bound",pow:16},2,45)'),/exceeds/);
 assert.match(evalRule('spiritCommandPreflight({tradition:"animism",name:"Shade",spiritStatus:"bound",pow:0},2,45)'),/POW/);
});
test('Update 16: old Animism saves are safely marked unbound',()=>{
 evalRule('S=freshState();S.magic.known=[{tradition:"animism",name:"Shade",pow:10,cha:9}];normalizeState();');
 assert.equal(evalRule('S.magic.known[0].spiritStatus'),'unbound');
 assert.equal(evalRule('S.magic.known[0].intensity'),1);
 evalRule('S.magic.known[0].spiritStatus="bound";normalizeState();');
 assert.equal(evalRule('S.magic.known[0].spiritStatus'),'bound');
});

test('Update 17: spirit record lookup returns saved mutable record, not display copy',()=>{
 evalRule('S=freshState();S.magic.folk=[{name:"Example",spec:""}];S.magic.known=[{tradition:"animism",name:"Ancestor",spiritStatus:"bound",intensity:2}]');
 assert.equal(evalRule('spiritRecordByMagicIndex(0)'),null);
 assert.equal(evalRule('spiritRecordByMagicIndex(1).name'),'Ancestor');
 evalRule('spiritRecordByMagicIndex(1).spiritStatus="unbound"');
 assert.equal(evalRule('S.magic.known[0].spiritStatus'),'unbound');
});
test('Update 17: older spirits migrate without inventing contact, ritual success, or MP',()=>{
 evalRule('S=freshState();S.magic.known=[{tradition:"animism",name:"Ancestor",spiritStatus:"bound",intensity:3}];normalizeState()');
 assert.equal(evalRule('S.magic.known[0].spiritContact'),'unknown');
 assert.equal(evalRule('S.magic.known[0].bindingType'),'none');
 assert.equal(evalRule('S.magic.known[0].spiritMP'),null);
 assert.equal(evalRule('S.magic.known[0].spiritStatus'),'bound');
});
test('Update 17: bad spirit combat state is discarded without affecting binding',()=>{
 evalRule('S=freshState();S.magic.known=[{tradition:"animism",name:"Wolf",spiritStatus:"unbound",spiritMP:-5,spiritAttitude:"nonsense"}];normalizeState()');
 assert.equal(evalRule('S.magic.known[0].spiritMP'),null);
 assert.equal(evalRule('S.magic.known[0].spiritAttitude'),'neutral');
 assert.equal(evalRule('S.magic.known[0].spiritStatus'),'unbound');
});

// Update 18: portable save validation and loss-prevention wiring.
// Exercise the actual import guard from cloud.js in isolation, without
// booting Supabase/network/browser UI.
const cloudSource=fs.readFileSync(path.join(root,'js/cloud.js'),'utf8');
const guardMatch=cloudSource.match(/function characterImportProblem\(value\)\{[\s\S]*?\n\}/);
assert(guardMatch,'character import guard missing');
const importCtx=vm.createContext({});vm.runInContext(guardMatch[0],importCtx);
const importProblem=x=>vm.runInContext('characterImportProblem('+JSON.stringify(x)+')',importCtx);
test('Update 18: valid legacy character export is accepted',()=>{
 assert.equal(importProblem({concept:{name:'Ari'},chars:{STR:13},inventory:[],magic:{known:[]}}),null);
});
test('Update 18: malformed and backup payloads are refused as characters',()=>{
 for(const bad of [null,[],{}, {concept:null},{concept:{name:9}},
  {concept:{name:'X'},inventory:{}},
  {concept:{name:'X'},magic:{known:{}}},
  {format:'mythras-forge-guest-backup',characters:[]}]){
  assert(importProblem(bad),JSON.stringify(bad));
 }
});
test('Update 18: independent character and guest backup import/export controls exist',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
 for(const marker of ['characterImportFile','guestBackupImportFile','localSaveWarning'])assert(html.includes(marker),marker);
 for(const action of ['importCharacterFile(input)','importGuestBackupFile(input)','exportGuestBackup()','chooseImport()'])assert(app.includes(action),action);
 assert(app.includes('restored._libId=null'),'imports must not overwrite existing character IDs');
});
test('Update 18: local storage errors are surfaced, not silently ignored',()=>{
 assert(cloudSource.includes('LOCAL_SAVE_ERROR="This browser could not save'));
 assert(cloudSource.includes('warning.textContent=LOCAL_SAVE_ERROR'));
});

test('Update 19: local character library refuses failed writes',()=>{
 const cloud=fs.readFileSync(path.join(root,'js/cloud.js'),'utf8');
 assert(cloud.includes('throw new Error("Character library save could not be verified")'));
 const match=cloud.match(/function saveCharLibListLocal\(list\)\{[\s\S]*?\n\}/);
 assert(match,'library persistence implementation available');
 const storage={data:{},setItem(k,v){this.data[k]=v;},getItem(k){return this.data[k]||null;}};
 const testCtx=vm.createContext({localStorage:storage,CHARLIB_KEY:'test'});
 vm.runInContext(match[0],testCtx);
 vm.runInContext('saveCharLibListLocal([{id:"ok"}])',testCtx);
 assert(storage.data.test.includes('ok'));
 storage.getItem=()=>null;
 assert.throws(()=>vm.runInContext('saveCharLibListLocal([{id:"bad"}])',testCtx),/could not be verified/);
});
