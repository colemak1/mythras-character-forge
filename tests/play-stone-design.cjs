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
test('R7 Impale: weapon dice rolled twice, the better one preselected, one Damage Modifier added (Core pp.97, 110)',()=>{
 setup();attack("Battleaxe","Critical",["Impale","Bleed"]);
 // rng order: weapon dice, second weapon dice, Damage Modifier, d20.
 let d=JSON.parse(run('JSON.stringify(pmRollDamageFor(S.rollLog[0],seq(0,.99,.5,.5)))'));
 assert.equal(d.weaponRoll,2);assert.equal(d.impaleRoll,7);assert.equal(d.dmRoll,2);
 assert.equal(d.impaleUse,'second');assert.equal(d.total,9,'second roll 7 + DM 2, not the first roll 2 + 2');
 d=JSON.parse(run('JSON.stringify(pmRollDamageFor(S.rollLog[0],seq(.99,0,.5,.5)))'));
 assert.equal(d.impaleUse,'first');assert.equal(d.total,9,'first roll 7 + DM 2');
 run('S.rollLog[0].damage=pmRollDamageFor(S.rollLog[0],seq(0,.99,.5,.5));APP.playImpaleChoice(0,"first")');
 assert.equal(run('S.rollLog[0].damage.total'),4,'the attacker can pick the other roll: 2 + DM 2');
 run('APP.playImpaleChoice(0,"bogus")');assert.equal(run('S.rollLog[0].damage.impaleUse'),'first');
 const h=run('pmResolveCardHTML()');assert.match(h,/Impale: 1d6\+1 rolled twice/);assert.match(h,/Pick the weapon roll now \(Core p\.97\)/);
 assert.doesNotMatch(h,/if it gets through armour/);
});
test('R4 with Impale: a negative Damage Modifier still floors the total at 0',()=>{
 setup();run('S.chars={STR:5,CON:12,SIZ:5,DEX:14,INT:13,POW:11,CHA:10}');assert.equal(run('dmCalc(5,5)'),'-1d6');
 attack("Battleaxe","Critical",["Impale"]);
 const d=JSON.parse(run('JSON.stringify(pmRollDamageFor(S.rollLog[0],seq(0,0,.99,.5)))'));
 assert.equal(d.dmRoll,-6);assert.equal(d.total,0);
});
test('R8 Choose Location: no d20; the chosen location is the one shown (Core pp.95–96)',()=>{
 setup();attack("Battleaxe","Critical",["Choose Location","Bleed"]);
 run('S.rollLog[0].damage=pmRollDamageFor(S.rollLog[0],seq(.5))');
 assert.equal(run('S.rollLog[0].damage.d20'),null);assert.equal(run('S.rollLog[0].damage.loc'),null);
 let h=run('pmResolveCardHTML()');assert.match(h,/Choose Location: <select/);assert.doesNotMatch(h,/d20 \d+ &rarr;/);
 run('APP.playSetDamageLoc(0,"Head")');assert.equal(run('S.rollLog[0].damage.loc'),'Head');
 h=run('pmResolveCardHTML()');assert.match(h,/<option selected>Head<\/option>/);assert.match(run('pmCombatStepsHTML(S.rollLog[0])'),/dmg · Head/);
 run('APP.playSetDamageLoc(0,"Tail")');assert.equal(run('S.rollLog[0].damage.loc'),null,'only real locations');
 attack("Battleaxe","Success",["Bleed"]);run('S.rollLog[0].damage=pmRollDamageFor(S.rollLog[0],seq(.5))');
 assert.equal(run('S.rollLog[0].damage.d20'),11,'without Choose Location the d20 table still applies');
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
test('R6 Maximise Damage works with natural weapons and stacks (Core p.98)',()=>{
 setup();attack("Unarmed","Critical",["Maximise Damage"]);
 const d=JSON.parse(run('JSON.stringify(pmRollDamageFor(S.rollLog[0],seq(0)))'));
 assert.equal(d.maxed,1);assert.equal(d.weaponRoll,3,'Unarmed 1d3 maximised');assert.equal(d.dmRoll,1,'DM still rolled');
 run('S.gearWeapons.push("Great club")');attack("Great club","Critical",["Maximise Damage","Maximise Damage"]);
 const g=JSON.parse(run('JSON.stringify(pmRollDamageFor(S.rollLog[0],seq(0)))'));
 assert.equal(g.maxed,2);assert.equal(g.weaponRoll,12,'both 2d6 dice maximised');
 assert.match(run('SPECIAL_EFFECTS.find(e=>e[0]==="Maximise Damage")[6]'),/also works with natural weapons/);
});
test('R9/R1: Roll damage stores the result on the roll, never changes HP, and is cleared if the result changes',()=>{
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
 const h=run('pmStyleHTML()');assert.equal((h.match(/<button type="button" class="pmx-cw/g)||[]).length,5);
});
test('phone sections: Sheet, Body, Skills, Combat, More (Home is in the ☰ menu)',()=>{
 assert.doesNotMatch(fs.readFileSync(path.join(root,'js','play.js'),'utf8'),/pmx-hometab/,'no Home tab in the phone bar (owner, 2026-11-07)');
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
test('the site top bar is hidden in Play Mode; a header menu holds the same links, and phones get Home',()=>{
 setup();const h=run('pmSiteMenuHTML()');
 for(const [href,l] of [['#/','Home'],['#/my-characters','Characters'],['#/my-campaigns','Campaign'],['#/wiki','Rules'],['#/world/welcome','World Guide'],['#/account','Account']])
  assert.match(h,new RegExp('<a href="'+href.replace(/\//g,'\\/')+'">'+l+'</a>'));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const href of ['#/','#/my-characters','#/my-campaigns','#/wiki','#/world/welcome','#/account'])assert(html.includes('href="'+href+'"'),'menu matches the site nav: '+href);
 assert.match(fs.readFileSync(path.join(root,'play-stone.css'),'utf8'),/body\.play-mode \.sitota-header\{display:none\}/);
});
test('Special Effects are a tick list: tap to choose, tap again to remove',()=>{
 setup();run('S.rollLog=[{label:"Battleaxe",pct:60,roll:4,tier:"Critical",combat:true,combatKind:"style",combatRole:"attack",oppTier:"Failure",opponentAction:"rolled",weapon:"Battleaxe",effectsPicked:[]}];PM_EFFECT_ROLL_REF=S.rollLog[0];');
 let h=run('pmResolveCardHTML()');assert.match(h,/data-fx="Bleed"><button type="button" class="pmx-se-pick" aria-pressed="false"/);
 const bleed=run('SPECIAL_EFFECTS.findIndex(e=>e[0]==="Bleed")');
 run('pmFxToggle('+bleed+')');assert.deepEqual(JSON.parse(run('JSON.stringify(S.rollLog[0].effectsPicked)')),['Bleed']);
 h=run('pmResolveCardHTML()');assert.match(h,/class="pmx-se on" data-fx="Bleed"/);
 run('pmFxToggle('+bleed+')');assert.deepEqual(JSON.parse(run('JSON.stringify(S.rollLog[0].effectsPicked)')),[]);
 assert.match(run('pmFxSummary("First sentence. Second sentence.")'),/^First sentence\.$/);
 assert.match(run('pmFxSummary("Swap a die for its full value (e.g. 1d6 becomes a 6). More.")'),/e\.g\. 1d6 becomes a 6\)\.$/,'no cut at e.g.');
});
test('the opponent result can be changed, which clears effects and damage',()=>{
 setup();run('S.rollLog=[{label:"Battleaxe",pct:60,roll:4,tier:"Critical",combat:true,combatKind:"style",combatRole:"attack",oppTier:"Failure",opponentAction:"rolled",weapon:"Battleaxe",effectsPicked:["Bleed"],damage:{total:5,loc:"Chest"}}];');
 run('APP.playClearOpponent(0)');assert.equal(run('S.rollLog[0].oppTier'),null);assert.equal(run('S.rollLog[0].effectsPicked.length'),0);assert.equal(run('S.rollLog[0].damage'),undefined);
 assert.match(run('pmResolveCardHTML()'),/Their defence: what did the opponent roll\?/);
});
test('clicking a skill shows its description, formula, value and a Roll button in the side panel',()=>{
 setup();assert.match(run('pmSkillsPanelHTML()'),/class="nm pmx-sknm" onclick="APP\.pmSkillInfo\('std:Athletics'\)"/);
 run('APP.pmSkillInfo("std:Athletics")');const h=run('pmPopupHTML()');
 assert.match(h,/aria-label="Athletics"/);assert.match(h,/Climbing, jumping, running/);assert.match(h,/Core p\.38/);assert.match(h,/STR\+DEX/);assert.match(h,/APP\.roll\('std:Athletics'\)/);
 run('APP.pmSkillInfo("std:Nonsense")');assert.equal(run('PM_POPUP.key'),'std:Athletics','unknown keys are ignored');
 assert.equal(run('skillInfo("Lore (History)").name'),'Lore','specialised skills use their base description');
 const missing=run('[...STD.map(s=>s[0]),...Object.keys(PROF)].filter(n=>!SKILL_INFO[n])');assert.deepEqual([...missing],[],'every skill has a description');
});
test('reference pages sit together under Rules reference in the ☰ menu',()=>{
 setup();assert.match(run('pmSiteMenuHTML()'),/APP\.pmPopup\('ref'\)">Rules reference/);
 const h=run('pmRulesRefHTML()');for(const k of ['rules','actions','rulesref','fxref','hazards','casting'])assert.match(h,new RegExp("APP\\.pmPopup\\('"+k+"'\\)"));
 assert.match(run('PM_POPUP={k:"fxref"};pmPopupHTML()'),/id="pm-actions"/);
 const sheet=run('pmSkillsPanelHTML()+pmBodyBoxHTML()+pmCombatTabHTML()');assert.doesNotMatch(sheet,/pmPopup\('(rules|hazards|rulesref|actions)'\)/,'no reference links on the sheet itself');
});
test('the wound watch moved from the left column into the location panel',()=>{
 setup();run('S.play.woundEvents=[{loc:"Head",severity:"serious",damage:4,outcome:"failure",resolved:false}];S.play.selectedLoc="Head";PM_POPUP={k:"loc"};');
 assert.doesNotMatch(run('pmBodyBoxHTML()'),/Wound watch/);assert.match(run('pmPopupHTML()'),/Wound watch/);
});
test('phones cannot zoom the page',()=>{
 assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/);
});
test('skill rows have no ✓ checked flag; the fumble flag and pin stay',()=>{
 setup();const h=run('pmSkillsPanelHTML()');assert.doesNotMatch(h,/pm-ckflag/);assert.match(h,/pm-xpflag/);assert.match(h,/pmx-pin/);
});
test('under the name: race, culture and career, never the campaign',()=>{
 setup();run('S.culture="Ridge-clan";S.career="Warrior";S.campaignId="c-123"');
 assert.equal(run('pmCharSubtitle()'),'Human · Ridge-clan · Warrior');
 assert.doesNotMatch(fs.readFileSync(path.join(root,'js','play.js'),'utf8'),/pmCampaignLabel/);
});
test('Settings in the ☰ menu opens a centred window with the colour scheme and the dice option',()=>{
 setup();assert.match(run('pmSiteMenuHTML()'),/APP\.pmModal\('settings'\)">Settings/);
 assert.equal(run('pmModalHTML()'),'','closed by default');
 run('APP.pmModal("settings")');assert.equal(run('PM_POPUP'),null,'not the side panel');
 const h=run('pmModalHTML()');
 assert.match(h,/class="pmx-modal" role="dialog" aria-modal="true" aria-label="Settings"/);assert.equal((h.match(/<button type="button" class="pmx-cw/g)||[]).length,5);assert.match(h,/pmToggleDice3d/);
 run('APP.pmModalClose()');assert.equal(run('pmModalHTML()'),'');run('APP.pmModal("bogus")');assert.equal(run('PM_MODAL'),null);
});
test('Roll damage sends its dice to the tray: weapon dice, Damage Modifier dice, then the d20 (live check #174)',()=>{
 setup();attack("Battleaxe","Success",["Bleed"]);
 const d=JSON.parse(run('JSON.stringify(pmRollDamageFor(S.rollLog[0],seq(.5)))'));
 assert.deepEqual(d.dice,[{sides:6,value:4},{sides:2,value:2},{sides:20,value:11}]);
 attack("Battleaxe","Critical",["Choose Location","Maximise Damage"]);
 const c=JSON.parse(run('JSON.stringify(pmRollDamageFor(S.rollLog[0],seq(.5)))'));
 assert.deepEqual(c.dice,[{sides:6,value:6},{sides:2,value:2}],'maximised die shows its full value; no d20 with Choose Location');
 run('var __dmgShown=[];pmDiceShowDamage=r=>__dmgShown.push(r.damage.total);PM_DICE_S=S;');
 attack("Battleaxe","Success",["Bleed"]);run('pmDiceSync();APP.playRollDamage(0);pmDiceSync()');
 assert.equal(run('__dmgShown.length'),1,'shown once');assert.equal(run('__dmgShown[0]'),run('S.rollLog[0].damage.total'));
 run('pmDiceSync()');assert.equal(run('__dmgShown.length'),1,'not replayed on the next render');
});
test('the Features & traits tab has a short "Traits" label for narrow columns',()=>{
 const src=fs.readFileSync(path.join(root,'js','play.js'),'utf8');
 assert.match(src,/<span class="pmx-tab-full">'\+l\+'<\/span><span class="pmx-tab-short" aria-hidden="true">Traits<\/span>/);
 assert.match(fs.readFileSync(path.join(root,'play-stone.css'),'utf8'),/@container \(max-width:440px\)\{[^}]*\{[^}]*\}\s*\.pmx-tab-full\{display:none\}\.pmx-tab-short\{display:inline\}/);
});
console.log(passed+' play stone design tests passed');
