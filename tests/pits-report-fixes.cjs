// The Pits: fixes from the player reports reviewed 2026-11-14 (docs/pits-reports-review-20261114.md, FR-01 to FR-07).
// Each case uses the engine's own log lines from the saved records (docs/pits-records/), with the kinds and meta the
// engine gives them, and checks what the deck, the Lost? recap and the stage make of them.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function arena(){
 const output={innerHTML:'',addEventListener(){}};
 const ctx={console,URLSearchParams,JSON,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:'',pathname:'/experiments/practice-combat.html'},
  navigator:{userAgent:'test'},sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},alert(){},
  document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},scripts:[]},
  matchMedia:()=>({matches:false}),requestAnimationFrame(){},__psRecord:[]};
 ctx.window=ctx;
 vm.createContext(ctx);
 for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js',
  'experiments/pits-game.js','experiments/pits-stage.js','experiments/pits-arena.js','experiments/pits-bottom.js','experiments/pits-report.js','experiments/pits-lost.js'])
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 const run=s=>vm.runInContext(s,ctx);
 run(`(()=>{startRun();R=null;V.busy=false;const a=S.fighters.a,b=S.fighters.b;a.name='Kethan Voss';b.name='Border Deserter';
  for(const f of [a,b]){f.weapon='sword';f.shield='none';f.weaponGuard=null;ensureEffectState(f);f.ap=2;f.apMax=2;f.prone=false;f.disarmed=false;
   f.stunnedLocations={};f.skipAttack=0;f.pressedTurns=0;f.overextendedTurns=0;f.fatigue=0;f.impaledWounds=[];f.entangled=null;f.blindedTurns=0;}
  b.weapon='mace';S.phase='fight';S.pending=null;S.order=['b','a'];S.turnIndex=1;S.round=1;S.cycle=1;S.disengaged=false;S.engagement='equal';})()`);
 ctx.document.body={dataset:{bottom:'E'},classList:{contains:()=>false}};
 return {run,ctx};
}
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const text=html=>String(html).replace(/<\/?(b|i|span|kbd)[^>]*>/g,'').replace(/<[^>]*>/g,' ').replace(/&#39;/g,"'").replace(/\s+/g,' ');

// FR-01: Lost #1 (docs/pits-records/20261114-190707-a3bff8a7.json), log 4 to 10: a critical 2 against a failed parry 69,
// Pin Weapon then Bypass Armour, then the blow
const PIN_EXCHANGE=`[
 {id:4,title:'Border Deserter attacks',body:'2 against Combat Style 45% — CRITICAL.',kind:'roll',meta:{exid:1,actor:'b'}},
 {id:5,title:'Kethan Voss parries',body:'69 vs 67% — FAILURE. 2 AP remaining.',kind:'roll',meta:{actor:'a'}},
 {id:6,title:'Offensive Special Effects',body:'Border Deserter gains 2 Special Effects from superior success.',kind:'hit',meta:{actor:'b'}},
 {id:7,title:'Pin Weapon',body:"Border Deserter pins Kethan Voss's weapon. The item cannot be used until freed with an Action Point and opposed Brawn (Core pp.97–98).",kind:'hit',meta:{actor:'b',target:'a'}},
 {id:8,title:'Bypass Armour',body:'Worn armour on the final hit location will not absorb this attack.',kind:'hit',meta:{actor:'b'}},
 {id:9,title:'Hit Location',body:'Border Deserter rolls 17 (d20): Left Arm.',kind:'hit',meta:{actor:'b',target:'a',location:'Left Arm'}},
 {id:10,title:'Border Deserter hits Left Arm',body:'1 weapon (1) +0 (+0) = 1 total; 0 parry; 0 armour; 1 HP lost.',kind:'hurt',meta:{actor:'b'}}]`;

test('FR-01: Pin Weapon stays in its exchange, with Bypass Armour, in the deck and the Lost? recap',()=>{
 const A=arena();
 A.run(`S.logs=${PIN_EXCHANGE};S.fighters.a.pinnedGear='weapon';S.fighters.a.pinnedBy='b';PB.key='';`);
 assert.deepEqual(JSON.parse(A.run('JSON.stringify(paExchanges().map(g=>g.entries.map(l=>l.id)))')),[[4,5,6,7,8,9,10]],'one exchange, pin included');
 const story=text(A.run('pitsArenaDeckHtml()'));
 assert.match(story,/Pin Weapon: Border Deserter pins Kethan Voss's weapon/);assert.match(story,/Bypass Armour:/);
 const recent=JSON.parse(A.run('JSON.stringify(plRecent())')).map(l=>l.text).join(' / ');
 assert.match(recent,/Pin Weapon: Border Deserter pins/);assert.match(recent,/Bypass Armour/);
 assert.match(recent,/Still pinned: Kethan Voss's broadsword, by Border Deserter\. No attacks or parries with it until Kethan Voss frees it \(Free Pinned Weapon: 1 AP, opposed Brawn\)/);
});

test('FR-01: the pin is still explained after later exchanges have pushed it out of the story',()=>{
 const A=arena();
 A.run(`S.logs=${PIN_EXCHANGE}.concat([
  {id:11,title:'Kethan Voss attacks',body:'30 against Combat Style 67% — SUCCESS.',kind:'roll',meta:{exid:2,actor:'a'}},
  {id:12,title:'No Damaging Hit',body:'x',kind:'system',meta:{actor:'a'}},
  {id:13,title:'Border Deserter attacks',body:'40 against Combat Style 45% — SUCCESS.',kind:'roll',meta:{exid:3,actor:'b'}},
  {id:14,title:'No Damaging Hit',body:'x',kind:'system',meta:{actor:'b'}}]);
  S.fighters.a.pinnedGear='weapon';S.fighters.a.pinnedBy='b';PB.key='';`);
 assert.match(text(A.run('pitsArenaDeckHtml()')),/Still pinned: Kethan Voss's broadsword, by Border Deserter/);
 assert.match(JSON.parse(A.run('JSON.stringify(plRecent())')).map(l=>l.text).join(' / '),/Still pinned/);
});

test('FR-01: Attack and Parry say who pinned which weapon, what it blocks and how to free it',()=>{
 const A=arena();
 A.run(`S.logs=${PIN_EXCHANGE};S.fighters.a.pinnedGear='weapon';S.fighters.a.pinnedBy='b';PB.key='';`);
 const atk=JSON.parse(A.run(`JSON.stringify(pitsLegalActions('a').find(x=>x.act==='attack'))`));
 assert.equal(atk.enabled,false);
 assert.match(atk.reason,/Your broadsword is pinned by Border Deserter: no attacks or parries with it until it is freed\. Free it on your turn with Free Pinned Weapon \(1 AP, your Brawn against Border Deserter's\)/);
 assert(JSON.parse(A.run(`JSON.stringify(pitsLegalActions('a').find(x=>x.act==='freePin'))`)).enabled,'Free Pinned Weapon is offered');
 assert.match(text(A.run(`pbInfoHtml(pbCtx(),'act:attack')`)),/pinned by Border Deserter/);
 // when Border Deserter attacks again (Lost #2): the parry is unusable and says why; evade is still offered
 A.run(`S.turnIndex=0;S.pending={kind:'reaction',atk:'b',def:'a',attackRoll:{roll:20,grade:2,label:'SUCCESS'}};PB.key='';`);
 const defs=JSON.parse(A.run('JSON.stringify(pbCtx().defs)'));
 const parry=defs.find(d=>d.val==='parry');assert.equal(parry.enabled,false);assert.match(parry.why,/pinned by Border Deserter/);
 assert.equal(defs.find(d=>d.val==='evade').enabled,true);
 assert.match(text(A.run(`pbInfoHtml(pbCtx(),'def:parry')`)),/Your broadsword is pinned by Border Deserter/);
 // outside a reaction the reminder line does not offer a parry percentage for a pinned weapon
 A.run(`S.pending=null;S.turnIndex=1;PB.key='';`);
 assert.match(text(A.run('pitsArenaDeckHtml()')),/When attacked: Parry \(not now\) · Evade/);
 assert.match(text(A.run('conditionInsightsHtml(S.fighters.a)')),/Held by Border Deserter: no attacks or parries with it until freed/);
});

test('FR-01: the escape attempt is told (it is logged as a system line)',()=>{
 const A=arena();
 A.run(`S.logs=${PIN_EXCHANGE}.concat([{id:23,title:'Pin Weapon · Escape',body:'Kethan Voss Brawn 30/53% versus Border Deserter Brawn 70/45%. Frees weapon.',kind:'system',meta:{actor:'a'}}]);PB.key='';`);
 assert.deepEqual(JSON.parse(A.run('JSON.stringify(paExchanges().map(g=>g.entries.length))')),[7],'the escape is not part of the exchange');
 assert.match(text(A.run('pitsArenaDeckHtml()')),/Pin Weapon · Escape: Kethan Voss Brawn 30\/53%/);
 assert.match(JSON.parse(A.run('JSON.stringify(plRecent())')).map(l=>l.text).join(' / '),/Pin Weapon · Escape/);
});

// FR-02/03: Lost #3 and the report at 19:09:51 (docs/pits-records/20261114-190820-6215d805.json): Border Deserter's
// attack 15/45 undefended earns a Trip; Kethan Voss resists 45/53 and stays up; then location and damage, one blow.
const NAMES={a:'Kethan Voss',b:'Border Deserter'};
const TRIP_BATCH=`[
 {roll:{actor:'b',label:'Attack · Combat Style 45%'}},
 {id:12,title:'Border Deserter attacks',body:'15 against Combat Style 45% — SUCCESS.',kind:'roll',meta:{exid:2,actor:'b'}},
 {id:13,title:'Kethan Voss does not defend',body:'Kethan Voss preserves Action Points.',kind:'system',meta:{actor:'a'}},
 {id:14,title:'Offensive Special Effects',body:'Border Deserter gains 1 Special Effect from superior success.',kind:'hit',meta:{actor:'b'}},
 {roll:{actor:'a',label:'Trip · Kethan Voss Brawn'}},
 {id:15,title:'Trip Opponent',body:'Kethan Voss Brawn 45/53% (SUCCESS): remains standing.',kind:'hit',meta:{actor:'b'}},
 {roll:{actor:'b',label:'Hit Location · d20'}},
 {id:16,title:'Hit Location',body:'Border Deserter rolls 1 (d20): Right Leg.',kind:'hit',meta:{actor:'b',target:'a',location:'Right Leg'}},
 {roll:{actor:'b',label:'Damage · Right Leg'}},
 {id:17,title:'Border Deserter hits Right Leg',body:'1 weapon (1) +0 (+0) = 1 total; 0 parry; 1 armour; 0 HP lost.',kind:'hurt',meta:{actor:'b',impact:{target:'a',location:'Right Leg',hpLost:0},px:{total:1,armour:1,wound:0,loc:'Right Leg'}}}]`;
const label=e=>e.roll?'roll:'+e.roll.label.split(' · ')[0]:String(e.id);

test('FR-03: the attacker\'s Trip keeps the engine order: every roll before the one blow it belongs to',()=>{
 const A=arena();
 const play=JSON.parse(A.run(`JSON.stringify(pitsStageArrange(${TRIP_BATCH},[],false,${JSON.stringify(NAMES)}).play)`)).map(label);
 assert.deepEqual(play,['roll:Attack','12','13','14','roll:Trip','15','roll:Hit Location','16','roll:Damage','17'],'no hit before the trip resistance');
 // and while the engine still waits for the location and the damage (a person rolls them), the trip is held with the blow
 const first=JSON.parse(A.run(`JSON.stringify(pitsStageArrange(${TRIP_BATCH}.slice(0,6),[],true,${JSON.stringify(NAMES)}))`));
 assert.deepEqual(first.hold.map(label),['15']);
 const rest=JSON.parse(A.run(`JSON.stringify(pitsStageArrange(${TRIP_BATCH}.slice(6),${JSON.stringify(first.hold)},false,${JSON.stringify(NAMES)}).play)`)).map(label);
 assert(rest.indexOf('15')<rest.indexOf('17'),'the trip is told before the blow');
});

test('FR-03: one attack is drawn once: the Trip has no movement of its own, the blow carries it (both results)',()=>{
 const A=arena();
 for(const [body,fell] of [['Kethan Voss Brawn 45/53% (SUCCESS): remains standing.',false],['Kethan Voss Brawn 80/53% (FAILURE): falls prone.',true]]){
  const ev=A.run(`(()=>{const e=${TRIP_BATCH};e[5].body=${JSON.stringify(body)};return JSON.stringify(e);})()`);
  const beats=JSON.parse(A.run(`JSON.stringify(${ev}.map((e,i)=>e.roll?null:pitsStageBeat(${ev},i,${JSON.stringify(NAMES)})))`));
  const trip=beats[5],blow=beats[9];
  assert.equal(trip.consumed,true,'the trip does not swing a second time');
  assert.equal(blow.consumed,false);assert.equal(blow.cue.type,'hit');
  assert.deepEqual([blow.cue.record.trip.actor,blow.cue.record.trip.fell],['b',fell],'the blow knows the trip and its result');
 }
});

test('FR-03: a defender\'s Trip still draws the blocked blow first, then its own sweep',()=>{
 const A=arena();
 const ev=`[{id:1,title:'Kethan Voss attacks',body:'40 against Combat Style 67% — SUCCESS.',kind:'roll',meta:{exid:1,actor:'a'}},
  {id:2,title:'Border Deserter parries',body:'03 vs 45% — CRITICAL.',kind:'roll',meta:{actor:'b'}},
  {id:3,title:'Trip Opponent',body:'Kethan Voss Brawn 80/53% (FAILURE): falls prone.',kind:'hit',meta:{actor:'b'}},
  {id:4,title:'No Damaging Hit',body:'Border Deserter parries the blow.',kind:'system',meta:{actor:'a',px:{react:'parry',reactGrade:3}}}]`;
 assert.deepEqual(JSON.parse(A.run(`JSON.stringify(pitsStageArrange(${ev},[],false,${JSON.stringify(NAMES)}).play)`)).map(label),['1','2','4','3']);
 const ordered=A.run(`JSON.stringify(pitsStageArrange(${ev},[],false,${JSON.stringify(NAMES)}).play)`);
 assert.equal(JSON.parse(A.run(`JSON.stringify(pitsStageBeat(${ordered},3,${JSON.stringify(NAMES)}))`)).consumed,false,'its own sweep');
});

test('FR-02: the deck says plainly that the trip was resisted, with both rolls and whose effect it was',()=>{
 const A=arena();
 A.run(`S.logs=${TRIP_BATCH}.filter(e=>!e.roll);S.fighters.b.kind='ai';S.fighters.a.kind='human';PB.key='';`);
 const deck=text(A.run('pitsArenaDeckHtml()'));
 assert.match(deck,/You resist the trip and stay standing \(Trip Opponent, the attacker's Special Effect from this exchange\)\. You rolled 45 on Brawn 53% · Success, against the attack roll of 15 \(Success\)\./);
 const recent=JSON.parse(A.run('JSON.stringify(plRecent())')).map(l=>l.text);
 const iTrip=recent.findIndex(t=>/resist the trip/.test(t)),iLoc=recent.findIndex(t=>/^Hit Location/.test(t));
 assert(iTrip>=0&&iTrip<iLoc,'told in order: the trip, then where the blow landed');
 A.run(`S.logs.find(l=>l.title==='Trip Opponent').body='Kethan Voss Brawn 80/53% (FAILURE): falls prone.';PB.key='';`);
 assert.match(text(A.run('pitsArenaDeckHtml()')),/You are tripped and fall prone/);
});

// FR-04: report 19:49:25 (docs/pits-records/20261114-194925-1e948e3a.json): an effect after a successful attack 59/67
// against Brawn 49 showed 95%. That is right for the roll already made (only a critical 01–05 beats a success of 59);
// the opposed comparison is not changed, the panel now says why.
test('FR-04: conditional odds name the roll already made and the faces that resist',()=>{
 const A=arena();
 const h=text(A.run(`pbResistHtml('Brawn',49,{roll:59,grade:2},'Border Deserter','')`));
 assert.match(h,/95% chance it works/);
 assert.match(h,/Your roll of 59 \(success\) is already made, so these odds are against it\. They resist only on 01–05 \(5 faces of 100\)/);
 // a lower attack roll: equal successes above it resist too (16 to 49), as the engine's own comparison says
 const h2=text(A.run(`pbResistHtml('Brawn',49,{roll:15,grade:2},'Border Deserter','')`));
 assert.match(h2,/They resist only on 01–05, 16–49 \(39 faces of 100\)/);assert.match(h2,/61% chance it works/);
 assert.equal(A.run('CombatRules.opposedWins({roll:45,grade:2},{roll:15,grade:2})'),true,'opposed rule unchanged');
});

// FR-07: the end of report 19:54:25 (docs/pits-records/20261114-195425-9374a0c7.json), logs 66 to 76: a head hit with a
// Major Wound under tied Initiative; the loser still acts once (Delay), then the fight ends.
test('FR-07: a blow that finishes a fighter who still acts once carries that, so the stage holds no Press Advantage on it',()=>{
 const A=arena();
 const ev=`[
  {id:66,title:'Kethan Voss attacks',body:'57 against Combat Style 67% — SUCCESS.',kind:'roll',meta:{exid:9,actor:'a'}},
  {id:67,title:'Border Deserter parries',body:'62 vs 49% — FAILURE. 1 AP remaining.',kind:'roll',meta:{actor:'b'}},
  {id:69,title:'Press Advantage',body:'Border Deserter cannot attack on the next Turn, but may act otherwise.',kind:'hit',meta:{actor:'a'}},
  {id:70,title:'Hit Location',body:'Kethan Voss rolls 19 (d20): Head.',kind:'hit',meta:{actor:'a',target:'b',location:'Head'}},
  {roll:{actor:'b',label:'Endurance · major wound to Head'}},
  {id:71,title:'Kethan Voss hits Head',body:'5 weapon (5) +1d2 (+1) = 6 total; 0 parry; 0 armour; 6 HP lost.',kind:'hurt',meta:{actor:'a',impact:{target:'b',location:'Head',hpLost:6},px:{total:6,wound:6,loc:'Head'}}},
  {id:72,title:'MAJOR WOUND · Head',body:'Border Deserter Endurance 45/55% (SUCCESS) versus the attack 57 (SUCCESS). Fails to resist.',kind:'hurt',meta:{actor:'b'}},
  {id:73,title:'Falling',body:'Border Deserter is going down, but their concurrent action this cycle still happens first. Border Deserter dies immediately from a Major Wound to Head.',kind:'hurt',meta:{actor:'b'}},
  {id:74,title:'Concurrent turn',body:'x',kind:'system',meta:{actor:'b'}},
  {checkpoint:1},
  {id:75,title:'Delay',body:'Border Deserter holds an Action Point for a reaction until their next turn.',kind:'system',meta:{actor:'b'}},
  {id:76,title:'FIGHT ENDS',body:'Kethan Voss wins. Border Deserter dies immediately from a Major Wound to Head.',kind:'system',meta:{}}]`;
 const play=JSON.parse(A.run(`JSON.stringify(pitsStageArrange(${ev},[],false,${JSON.stringify(NAMES)}).play)`));
 const i=play.findIndex(e=>e.id===71),beat=JSON.parse(A.run(`JSON.stringify(pitsStageBeat(${JSON.stringify(play)},${i},${JSON.stringify(NAMES)}))`));
 assert.deepEqual(beat.cue.record.after.map(c=>c.type),['wound','falling','end'],'the wound, the fall to come and the end belong to the blow');
 assert.equal(beat.cue.record.press.type,'press');
 const fallBeat=JSON.parse(A.run(`JSON.stringify(pitsStageBeat(${JSON.stringify(play)},${play.findIndex(e=>e.id===73)},${JSON.stringify(NAMES)}))`));
 assert.equal(fallBeat.consumed,true,'Falling has no movement of its own');
 assert(play.findIndex(e=>e.roll)<i,'the Endurance roll is shown before the blow it decides');
});

console.log(passed+' passed');
