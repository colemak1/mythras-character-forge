// Play Mode "Stone" design (v0, 2026-11-07): body figure, colour schemes,
// phone sections, the four-step combat bar, and the damage + hit-location
// roll (GM-assisted: before parry and armour, never applied to HP).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const shown=[];
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,WeakSet,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
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
ctx.__shown=shown;run('pmDiceShow=r=>__shown.push(r.label+" "+r.roll+" "+r.tier);render=()=>pmDiceSync();');
run('render=()=>{};');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const setup=()=>run('S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};S.gearWeapons=["Battleaxe","Short bow","Bolas"];APPVIEW="play";VIEW_ONLY=false;PM_EFFECT_ROLL_REF=null;PM_POPUP=null;PM_VIEW="skills";');
run('seq=(...v)=>{let i=0;return ()=>v[i++%v.length];};');
// A finished attack roll with a fixed result, as the combat card would hold it.
const attack=(weapon,tier,picks)=>run('S.rollLog.unshift({label:"'+weapon+'",pct:60,roll:12,tier:"'+tier+'",combat:true,combatRole:"attack",weapon:"'+weapon+'",oppTier:"Failure",opponentAction:"rolled",effectsPicked:'+JSON.stringify(picks||[])+'});');

test('dice expressions: weapon damage and Damage Modifiers parse, other text does not',()=>{
 assert.equal(run('JSON.stringify(pmDiceTerms("1d6+1"))'),JSON.stringify({dice:[{sides:6,sign:1}],mod:1}));
 assert.equal(run('JSON.stringify(pmDiceTerms("-1d2"))'),JSON.stringify({dice:[{sides:2,sign:-1}],mod:0}));
 assert.equal(run('pmDiceTerms("+1d10+1d2").dice.length'),2);
 assert.equal(run('pmDiceTerms("+0").mod'),0);
 assert.equal(run('pmDiceTerms("—")'),null);
 assert.equal(run('pmDiceTerms("+2d10+1d4 +3 step(s) (continue progression)")'),null);
});
test('damage roll: weapon dice + Damage Modifier, then a d20 hit location (the existing HIT_D20 table)',()=>{
 setup();attack("Battleaxe","Success");
 assert.equal(run('dmCalc(13,13)'),'+1d2');
 const d=JSON.parse(run('JSON.stringify(pmRollDamageFor(S.rollLog[0],seq(.5)))'));
 // 1d6+1 with a 4 = 5; DM 1d2 with a 2 = 2; d20 11 = Chest.
 assert.equal(d.weaponRoll,5);assert.equal(d.dmRoll,2);assert.equal(d.total,7);
 assert.equal(d.d20,11);assert.equal(d.loc,'Chest');assert.equal(d.dmText,'+1d2');
 for(const [v,loc] of [[0,'Right Leg'],[.15,'Left Leg'],[.3,'Abdomen'],[.6,'Right Arm'],[.8,'Left Arm'],[.95,'Head']])
  assert.equal(run('pmRollDamageFor(S.rollLog[0],seq(.5,.5,'+v+')).loc'),loc,'d20 '+(1+Math.floor(v*20)));
});
test('Maximise Damage sets one weapon die to its maximum per pick; the Damage Modifier is still rolled',()=>{
 setup();attack("Battleaxe","Critical",["Maximise Damage"]);
 const d=JSON.parse(run('JSON.stringify(pmRollDamageFor(S.rollLog[0],seq(0)))'));
 assert.equal(d.weaponRoll,7,'1d6+1 maximised');assert.equal(d.maxed,1);assert.equal(d.dmRoll,1,'DM rolled normally');
});
test('Impale shows a second weapon roll; Choose Location is noted',()=>{
 setup();attack("Battleaxe","Critical",["Impale","Choose Location"]);
 const d=JSON.parse(run('JSON.stringify(pmRollDamageFor(S.rollLog[0],seq(.5,0,.5,.5)))'));
 assert.equal(d.impaleRoll,2);assert.equal(d.chooseLocation,true);
 run('S.rollLog[0].damage=pmRollDamageFor(S.rollLog[0],seq(.5))');
 const h=run('pmResolveCardHTML()');assert.match(h,/before parry and armour/);assert.match(h,/Impale second roll/);assert.match(h,/Choose Location/);
});
test('ranged weapons add the Damage Modifier only when the table says so',()=>{
 setup();attack("Short bow","Success");
 assert.equal(run('pmRollDamageFor(S.rollLog[0],seq(.5)).dmText'),'+1d2','Short bow: DM Y');
 attack("Bolas","Success");
 const d=JSON.parse(run('JSON.stringify(pmRollDamageFor(S.rollLog[0],seq(.5)))'));
 assert.equal(d.dmText,'none');assert.equal(d.dmRoll,0);assert.equal(d.total,3,'1d4 only');
});
test('no damage roll for a failed attack, a parry, or a roll without a weapon',()=>{
 setup();attack("Battleaxe","Failure");assert.equal(run('pmRollDamageFor(S.rollLog[0])'),null);
 attack("Battleaxe","Success");run('S.rollLog[0].combatRole="defence"');assert.equal(run('pmRollDamageFor(S.rollLog[0])'),null);
 attack("Battleaxe","Success");run('delete S.rollLog[0].weapon');assert.equal(run('pmRollDamageFor(S.rollLog[0])'),null);
});
test('Unarmed counts as a natural weapon: Maximise Damage does not apply',()=>{
 setup();attack("Unarmed","Critical",["Maximise Damage"]);
 assert.equal(run('pmRollDamageFor(S.rollLog[0],seq(0)).maxed'),0);
});
test('Roll damage stores the result on the roll, never changes HP, and is cleared if the result changes',()=>{
 setup();attack("Battleaxe","Success",["Bleed"]);
 const hp=run('JSON.stringify(S.play.hp||{})');
 assert.match(run('pmResolveCardHTML()'),/APP\.playRollDamage\(0\)">Roll damage · 1d6\+1/);
 run('APP.playRollDamage(0)');assert.ok(run('S.rollLog[0].damage.total>=0'));
 assert.equal(run('JSON.stringify(S.play.hp||{})'),hp,'HP untouched');
 run('APP.playSetOpponentTier(0,"Success")');assert.equal(run('S.rollLog[0].damage'),undefined);
 run('VIEW_ONLY=true;APP.playRollDamage(0)');assert.equal(run('S.rollLog[0].damage'),undefined,'read-only views cannot roll');
});
test('four-step bar: Attack, Opponent, Effects, Resolve',()=>{
 setup();
 assert.match(run('pmResolveCardHTML()'),/<li class="cur" aria-current="step"><b>Attack<\/b><span>pick a weapon/);
 attack("Battleaxe","Success");run('S.rollLog[0].oppTier=null');
 let h=run('pmCombatStepsHTML(S.rollLog[0])');assert.match(h,/<li class="done"><b>Attack<\/b><span>12 · Success/);assert.match(h,/class="cur" aria-current="step"><b>Opponent/);
 run('S.rollLog[0].oppTier="Failure"');h=run('pmCombatStepsHTML(S.rollLog[0])');assert.match(h,/class="cur" aria-current="step"><b>Effects<\/b><span>0 of 1/);
 run('S.rollLog[0].effectsPicked=["Bleed"]');h=run('pmCombatStepsHTML(S.rollLog[0])');assert.match(h,/<li class="done"><b>Effects<\/b><span>Bleed/);assert.match(h,/class="cur" aria-current="step"><b>Resolve/);
 run('S.rollLog[0].damage={total:6,loc:"Left Arm"}');h=run('pmCombatStepsHTML(S.rollLog[0])');assert.match(h,/<li class="done"><b>Resolve<\/b><span>6 dmg · Left Arm/);
});
test('weapon buttons show the Combat Style percentage',()=>{
 setup();run('S.cultStyleOn=true;S.cultStyleName="Ridge Warrior";S.styleDefs["style:cult"]={weapons:["Battleaxe"],traits:[]};');
 const h=run('pmWeaponCardsHTML()'),pct=run('pmPctText("style:cult")');
 assert.match(h,new RegExp('<span>Attack</span><b>'+pct+'</b></button><button class="pmx-act"[^>]*><span>Parry</span><b>'+pct+'</b>'));
});
test('body figure: seven keyboard-reachable zones, labelled with HP, armour and the wound word',()=>{
 setup();run('S.play.hp={"Abdomen":2}');
 const h=run('pmBodySvg()');
 assert.equal((h.match(/class="pmx-zone /g)||[]).length,7);
 assert.equal((h.match(/tabindex="0"/g)||[]).length,7);
 assert.match(h,/class="pmx-zone minor"[^>]*aria-label="Abdomen, 2 of \d+ hit points, armour \d+, Minor"/);
 assert.match(h,/class="pmx-zone ok"[^>]*aria-label="Head, /);
 assert.doesNotMatch(h,/<text/,'no numbers on the figure');
});
test('colour schemes: Verdigris by default, chosen per device, unknown values ignored',()=>{
 setup();store.delete('pm-colorway');
 assert.equal(run('pmColorway()'),'verdigris');
 run('pmSetColorway("basalt")');assert.equal(store.get('pm-colorway'),'basalt');assert.equal(run('pmColorway()'),'basalt');
 run('pmSetColorway("neon")');assert.equal(store.get('pm-colorway'),'basalt');
 store.set('pm-colorway','bogus');assert.equal(run('pmColorway()'),'verdigris');
 const h=run('PM_POPUP={k:"style"};pmPopupHTML()');assert.equal((h.match(/<button type="button" class="pmx-cw/g)||[]).length,5);
});
test('phone sections: Sheet, Body, Skills, Combat, More',()=>{
 setup();assert.deepEqual(JSON.parse(run('JSON.stringify(PM_PHONE_TABS.map(t=>t[1]))')),['Sheet','Body','Skills','Combat','More']);
 run('APP.playTab("body")');assert.equal(run('PM_VIEW'),'body');
 run('APP.playTab("combat")');assert.equal(run('PM_VIEW'),'right');assert.equal(run('pmActiveTab()'),'combat');
 run('APP.playTab("more")');assert.equal(run('pmActiveTab()'),'magic','More opens the tabs other than Combat');
 run('APP.playTab("notes");APP.playTab("more")');assert.equal(run('pmActiveTab()'),'notes','More keeps the last non-combat tab');
});
test('side panel keeps a slot for the physics dice tray, with Details and Roll log tabs',()=>{
 setup();const h=run('pmPopupHTML()');
 assert.match(h,/pmx-side-empty/);assert.match(h,/id="pm-trayslot"/);assert.match(h,/>Details</);assert.match(h,/Roll log/);
 const log=run('PM_POPUP={k:"log"};pmPopupHTML()');assert.match(log,/aria-selected="true" onclick="APP.pmPopup\('log'\)"/);
});
test('passions are tested, skills rolled',()=>{
 setup();run('S.passions=[{type:"loyalty",subject:"Clan",name:"Loyalty (Clan)",base:60}]');
 const h=run('pmSkillsPanelHTML()');assert.match(h,/>Test<\/button>/);assert.match(h,/>Roll<\/button>/);
});
console.log(passed+' play stone design tests passed');
