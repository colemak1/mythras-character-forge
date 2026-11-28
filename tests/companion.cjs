// Combat Companion v1 (AQ-3, docs/ux/mobile-combat-companion-20261127.md):
// table bar, weapon switcher, both dice modes through CombatRules' Special
// Effects, conditions, and Body-tab damage that saves with the character.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map(),els=new Map();
const el=id=>{if(!els.has(id))els.set(id,{id,value:'',innerHTML:''});return els.get(id);};
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,WeakSet,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:id=>id.startsWith('playdmg-')?el(id):null,querySelector:s=>s==='#main'?el('main'):s.startsWith('#playdmg-')?el(s.slice(1)):null,querySelectorAll:()=>[],
  addEventListener(){},removeEventListener(){},body:{classList:{add(){},remove(){},toggle(){}}}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app','companion']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
run('render=()=>{};pmDiceHide=()=>{};');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const html=()=>{run('renderCompanionView()');return el('main').innerHTML;};
const setup=()=>{store.clear();els.clear();
 run(`S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};APPVIEW="play";VIEW_ONLY=false;normalizeState();
  ACTIVE_GRADE="standard";CC_TAB="combat";CC_WEAPON=null;CC_ROLL=null;CC_PENDING=null;CC_AP_WARN=null;CC_LOC=null;CC_FX_OPEN=null;PM_MSG=null;
  S.cultStyleOn=true;S.cultStyleName="Guard";S.styleDefs["style:cult"]={weapons:["Broadsword","Heater"],traits:[]};S.gearWeapons=["Broadsword","Heater","Dagger"];APP.ccEnter();`);};

test('it is off until entered, never for a read-only view, and Full site leaves it',()=>{
 store.clear();run('VIEW_ONLY=false');assert.equal(run('ccActive()'),false);
 run('APP.ccEnter()');assert.equal(run('ccActive()'),true);
 run('VIEW_ONLY=true');assert.equal(run('ccActive()'),false,'a teammate\'s sheet stays in full Play Mode');run('VIEW_ONLY=false');
 run('APP.ccExit()');assert.equal(run('ccActive()'),false);
});
test('table bar: AP dots, New round, Luck, MP, Fatigue and a saved Rule Hints toggle',()=>{
 setup();const h=html(),v=JSON.parse(run('JSON.stringify(charVitals())'));
 assert.equal((h.match(/aria-label="action point \d/g)||[]).length,v.maxAP);
 assert.equal((h.match(/aria-label="luck point \d/g)||[]).length,v.maxLuck);
 assert.match(h,/New round/);assert.match(h,/id="ccFatigue"/);assert.match(h,/Spend a Magic Point/);
 assert.match(h,/aria-pressed="true"[^>]*onclick="APP.ccToggleHints\(\)"/);
 run('APP.ccToggleHints()');assert.equal(store.get('cc-hints'),'off');assert.doesNotMatch(html(),/class="cc-hint"/,'hints off: no nudges');
 run('APP.ccToggleHints()');assert.match(html(),/class="cc-hint"/);
});
test('switching weapons updates the Combat Style %, Size, Reach and Damage',()=>{
 setup();const names=JSON.parse(run('JSON.stringify(ccWeapons())'));assert(names.length>=2);
 for(const n of names){run(`APP.ccWeapon(${JSON.stringify(n)})`);
  const w=JSON.parse(run(`JSON.stringify(ccWeaponDef(${JSON.stringify(n)}))`)),st=JSON.parse(run(`JSON.stringify(ccStyleFor(${JSON.stringify(n)}))`));
  const pct=run(`ccPctText(ccPctFor(ccStyleFor(${JSON.stringify(n)})))`),h=html();
  assert.match(h,new RegExp('<dt>'+st.name.replace(/[()+]/g,'\\$&')+'</dt><dd>'+pct+'</dd>'));
  if(w.group!=='Ranged')assert.match(h,new RegExp('<dt>Size</dt><dd>'+w.size+'</dd>'));
  assert(h.includes('<dt>Damage</dt><dd>'+run(`ccDamageText(ccWeaponDef(${JSON.stringify(n)}))`)+'</dd>'));}
});
test('the Difficulty selector shows each grade\'s % and sets the grade',()=>{
 setup();const key=run('ccStyleFor(ccWeapon()).key'),base=run(`finalPct(${JSON.stringify(key)})`);
 assert.match(html(),new RegExp('aria-label="Hard, '+Math.ceil(base*2/3)+'%"'));
 run('APP.ccGrade("hard")');assert.equal(run('ACTIVE_GRADE'),'hard');
 assert.match(html(),new RegExp('<dd>'+Math.ceil(base*2/3)+'%</dd>'));
 run('APP.ccGrade("hopeless")');assert.equal(run('ACTIVE_GRADE'),'hard','only the five spec grades');
});
test('in-app Attack spends 1 AP, rolls, and offers only the effects CombatRules allows',()=>{
 setup();run('Math.random=()=>0.01');run('APP.ccAction("attack")');
 assert.equal(run('S.play.apUsed'),1);assert.equal(run('CC_ROLL===S.rollLog[0]&&S.rollLog[0].combatRole'),'attack');
 assert.equal(run('S.rollLog[0].tier'),'Critical');
 run('APP.playSetOpponentTier(0,"Failure")');
 const n=run('rollEffectsWon(S.rollLog[0])');assert.equal(n,2);
 const h=html(),allowed=JSON.parse(run('JSON.stringify(SPECIAL_EFFECTS.filter(e=>canPickEffectForRoll(e,S.rollLog[0])).map(e=>e[0]))'));
 const chips=[...h.matchAll(/class="cc-fxpick"[^>]*>([^<]+)</g)].map(m=>m[1]);
 assert.deepEqual(chips,allowed.map(x=>x.replace(/'/g,'&#39;')));
 assert(!chips.includes('Arise'),'defensive-only effects are not offered on an attack');
 assert.match(h,/You win <b>2 Special Effects<\/b>/);
});
test('tapping ? on a chip shows its rule inline; picking stops at the count won',()=>{
 setup();run('Math.random=()=>0.01;APP.ccAction("attack");APP.playSetOpponentTier(0,"Failure")');
 const first=run('SPECIAL_EFFECTS.filter(e=>canPickEffectForRoll(e,S.rollLog[0]))[0][0]');
 run(`APP.ccFxInfo(${JSON.stringify(first)})`);const h=html();
 assert.match(h,/class="cc-fxrule"/);assert(h.includes(run(`esc(ccFxRule(SPECIAL_EFFECTS.find(e=>e[0]===${JSON.stringify(first)})[6]))`)));
 const idx=JSON.parse(run('JSON.stringify(SPECIAL_EFFECTS.map((e,i)=>canPickEffectForRoll(e,S.rollLog[0])&&!e[5]?i:-1).filter(i=>i>=0))'));
 for(const i of idx.slice(0,3))run('pmFxToggle('+i+')');
 assert.equal(run('S.rollLog[0].effectsPicked.length'),2);
});
test('physical dice: Attack waits for the result tap, then resolves the same way',()=>{
 setup();run('APP.ccDice("physical");APP.ccAction("attack")');
 assert.equal(run('S.play.apUsed'),1);assert.equal(run('S.rollLog.length'),0,'nothing rolled in the app');
 assert.match(html(),/Your result:/);
 run('APP.ccPhysical("Success")');assert.equal(run('S.rollLog[0].physical&&S.rollLog[0].tier'),'Success');
 run('APP.playSetOpponentTier(0,"Failure")');assert.equal(run('rollEffectsWon(S.rollLog[0])'),1);
 assert.match(html(),/You win <b>1 Special Effect<\/b>/);
 run('APP.ccAction("evade");APP.ccCancelPending()');assert.equal(run('S.play.apUsed'),1,'cancel refunds the AP');
});
test('at 0 AP the first tap warns; the second acts anyway',()=>{
 setup();run('S.play.apUsed=charVitals().maxAP;Math.random=()=>0.5');
 run('APP.ccAction("parry")');assert.equal(run('S.rollLog.length'),0);assert.match(html(),/No Action Points left this round/);
 run('APP.ccAction("parry")');assert.equal(run('S.rollLog.length'),1);assert.equal(run('S.play.apUsed'),run('charVitals().maxAP'));
 run('APP.ccNewRound()');assert.equal(run('S.play.apUsed'),0);
});
test('Body tab: all 7 locations with HP and armour; damage soaks armour, flags wounds and persists',()=>{
 setup();run('APP.ccTab("body")');let h=html();
 for(const loc of ['Head','Chest','Abdomen','Right Arm','Left Arm','Right Leg','Left Leg'])assert(h.includes('aria-label="'+loc+', '),loc);
 assert.equal((h.match(/class="cc-loc /g)||[]).length,7);
 run('APP.ccLoc("Chest")');const max=run('playMaxHP("Chest")'),ap=run('playLocAP("Chest")');
 el('playdmg-Chest').value=String(max+ap);run('APP.playApplyDamage("Chest")');
 assert.equal(run('playCurHP("Chest")'),0);assert.equal(run('playHPState("Chest").cls'),'serious');
 h=html();assert.match(h,/class="cc-flag serious"/);assert.match(h,/Opposed Endurance/);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('playCurHP("Chest")'),0,'HP survives a save and reload');
 el('playdmg-Chest').value='2';run('APP.ccRawDamage("Chest")');assert.equal(run('playCurHP("Chest")'),-2,'ignore armour');
 el('playdmg-Chest').value='5';run('APP.playHeal("Chest")');assert.equal(run('playCurHP("Chest")'),3);
});
test('condition chips save with the character; bad saved values are cleaned',()=>{
 setup();run('APP.ccCondition("prone");APP.ccCondition("bleeding");APP.ccCondition("nonsense")');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.play.conditions)')),['prone','bleeding']);
 assert.match(html(),/Formidable/,'prone hint shown');
 run('APP.ccCondition("prone")');assert.deepEqual(JSON.parse(run('JSON.stringify(S.play.conditions)')),['bleeding']);
 run('S.play.conditions=["bleeding","bleeding",3,"x"];normalizeState()');assert.deepEqual(JSON.parse(run('JSON.stringify(S.play.conditions)')),['bleeding']);
 run('delete S.play.conditions;normalizeState()');assert.equal(run('Array.isArray(S.play.conditions)'),true);
});
test('bottom bar is a phonebar (the feedback button lifts above it) with a Full site exit',()=>{
 setup();const h=html();
 assert.match(h,/<nav class="pmx-phonebar cc-tabbar"/);assert.match(h,/APP.ccTab\('combat'\)/);assert.match(h,/APP.ccTab\('body'\)/);
 assert.match(h,/onclick="APP.ccExit\(\)"/);assert.match(h,/id="forgeSaveStatus"/,'sync badge');
 assert.match(fs.readFileSync(path.join(root,'js/feedback.js'),'utf8'),/BARS='[^']*\.pmx-phonebar/);
});
test('no characteristics yet: a friendly prompt to pick a character or try a sample fighter',()=>{
 setup();run('S.chars={}');const h=html();
 assert.match(h,/Pick a character/);assert.match(h,/Try a sample fighter/);
});
test('Play Mode hands over to the companion when it is on, and offers the way in',()=>{
 setup();let drawn=false;ctx.__cc=()=>{drawn=true;};run('const __r=renderCompanionView;renderCompanionView=()=>{__cc();__r();}');
 run('renderPlayView()');assert.equal(drawn,true);
 run('APP.ccExit();renderPlayView()');assert.match(el('main').innerHTML,/class="pm-btn pmx-cc-enter"/);
});
console.log(passed+' companion tests passed');
