// The Pits: fixes from the player reports of 2026-11-14 evening to 2026-11-17 (docs/pits-report-ledger.md, FR-08 to FR-15).
// The rules were right in these reports; the screen did not say what had happened. Each case uses the engine's own log
// lines from the exported reports and checks what the deck, the plates, the dice tray and the Lost? recap make of them.
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
const text=html=>String(html).replace(/<\/?(b|i|span|kbd|small)[^>]*>/g,'').replace(/<[^>]*>/g,' ').replace(/&#39;/g,"'").replace(/\s+/g,' ');
const story=A=>JSON.parse(A.run('JSON.stringify(pbStory(pbExchange()).map(l=>l.html))')).map(text);

// report 20261114-235443 / 235515: a critical Evade earns Arise, which the engine logs before the evade's own fall
const EVADE_ARISE=`[
 {id:3,title:'Kethan Voss attacks',body:'36 against Combat Style 67% — SUCCESS.',kind:'roll',meta:{exid:1,actor:'a'}},
 {id:4,title:'Border Deserter evades',body:'3 vs 45% — CRITICAL. 1 AP remaining.',kind:'system',meta:{actor:'b',exid:1}},
 {id:5,title:'Defensive Special Effects',body:'Border Deserter gains 1 Special Effect from superior success.',kind:'hit',meta:{actor:'b'}},
 {id:6,title:'Arise',body:'Border Deserter regains their feet immediately using the defensive opening (Core p.96).',kind:'hit',meta:{actor:'b'}},
 {id:7,title:'No Damaging Hit',body:'Border Deserter evades the incoming strike and is already back on their feet.',kind:'system',meta:{actor:'a',px:{evaded:true}}}]`;

test('FR-11: an Evade says it ends prone; Arise is told after the result, as the opponent\'s Special Effect',()=>{
 const A=arena();A.run(`S.logs=${EVADE_ARISE};PB.key='';`);
 const s=story(A),fall=s.findIndex(l=>/Border Deserter dives clear and ends prone: an Evade always leaves the evader on the ground/.test(l));
 const arise=s.findIndex(l=>/Border Deserter chose Arise \(Special Effect\): .*Back on their feet at once/.test(l));
 assert(fall>=0&&arise>fall,s.join('\n'));
 assert(arise===s.length-1,'Arise comes last, after the result');
});

test('FR-11: a failed Evade still says why the evader is on the ground',()=>{
 const A=arena();A.run(`S.logs=[
  {id:30,title:'Kethan Voss attacks',body:'14 against Combat Style 67% — SUCCESS.',kind:'roll',meta:{exid:4,actor:'a'}},
  {id:31,title:'Border Deserter evades',body:'82 vs 45% — FAILURE. 0 AP remaining.',kind:'system',meta:{actor:'b',exid:4}}];PB.key='';`);
 assert.match(story(A).join('\n'),/Border Deserter dives clear and ends prone: an Evade always leaves the evader on the ground, whether it succeeds or not \(Core p\.103\)/);
});

test('FR-10: no defence with 0 AP is told as no AP left, not as keeping AP; a chosen no-defence keeps AP',()=>{
 const A=arena();A.run(`S.logs=[
  {id:14,title:'Kethan Voss attacks',body:'40 against Combat Style 67% — SUCCESS.',kind:'roll',meta:{exid:2,actor:'a'}},
  {id:15,title:'Border Deserter does not defend',body:'Border Deserter has no Action Points left, so cannot parry or evade. The attack is undefended.',kind:'system'}];PB.key='';`);
 const s=story(A).join('\n');assert.match(s,/Border Deserter has no AP left: cannot parry or evade/);assert.doesNotMatch(s,/keeps/);
 A.run(`S.logs[1].body='Border Deserter chooses not to defend and keeps their Action Points. The attack is undefended.';PB.key='';`);
 assert.match(story(A).join('\n'),/Border Deserter does not defend and keeps their Action Points/);
});

test('FR-10: the engine says which it was',()=>{
 for(const ap of [0,1]){
  const A=arena();
  A.run(`S.logs=[];S.order=['a','b'];S.turnIndex=0;S.fighters.b.ap=${ap};S.pending={kind:'reaction',atk:'a',def:'b',exid:9,reaction:'none',chosen:[],
   attackRoll:{roll:20,grade:2,label:'SUCCESS'},attackKey:'sword',effectsLeft:0};`);
  try{A.run(`react('none')`);}catch(e){}   // the blow goes on to resolve; only the defence line is checked here
  const line=JSON.parse(A.run('JSON.stringify((S.logs||[]).find(l=>/does not defend$/.test(l.title))||null)'));
  assert(line,'the defence line is logged');
  assert.match(line.body,ap?/chooses not to defend and keeps their Action Points/:/has no Action Points left, so cannot parry or evade/);
 }
});

test('FR-13: a Serious Wound stun is named on Attack, on the plate and in the story while it lasts',()=>{
 const A=arena();A.run(`S.logs=[];S.fighters.a.skipAttack=3;PB.key='';`);
 const atk=JSON.parse(A.run(`JSON.stringify(pitsLegalActions('a').find(x=>x.act==='attack'))`));
 assert.equal(atk.enabled,false);assert.match(atk.reason,/^Stunned by a Serious Wound: no attacks for 3 more turns\. You can still parry, evade/);
 assert.match(text(A.run('paConditions(S.fighters.a)')),/Stunned: no attacks · 3 turns/);
 assert.match(JSON.parse(A.run('JSON.stringify(plRecent())')).map(l=>l.text).join(' / '),/Still stunned: Kethan Voss cannot attack for 3 more turns \(Serious Wound\)/);
 A.run(`S.fighters.a.skipAttack=0;S.fighters.a.pressedTurns=1;PB.key='';`);
 assert.match(JSON.parse(A.run(`JSON.stringify(pitsLegalActions('a').find(x=>x.act==='attack'))`)).reason,/^Pressed back \(Press Advantage\)/);
 assert.match(text(A.run('paConditions(S.fighters.a)')),/Pressed: no attack/);
});

test('FR-12: a Disarm is told as resisted or not, with whose Special Effect and the roll',()=>{
 const A=arena();A.run(`S.logs=[
  {id:52,title:'Border Deserter attacks',body:'45 against Combat Style 50% — SUCCESS.',kind:'roll',meta:{exid:3,actor:'b'}},
  {id:53,title:'Kethan Voss parries',body:'74 vs 67% — FAILURE. 1 AP remaining.',kind:'roll',meta:{actor:'a'}},
  {id:57,title:'Disarm Opponent',body:'Kethan Voss rolls 4 against 34% (CRITICAL). Keeps weapon.',kind:'hit',meta:{actor:'b'}}];PB.key='';`);
 assert.match(story(A).join('\n'),/You resist the disarm and keep your weapon \(Disarm Opponent, Border Deserter's Special Effect\)\. You rolled 4 against 34% · Critical success\./);
 A.run(`S.logs[2].body='Kethan Voss rolls 81 against 34% (FAILURE). Loses weapon.';PB.key='';`);
 assert.match(story(A).join('\n'),/You are disarmed \(Disarm Opponent/);
});

test('FR-09: the opponent\'s Special Effect says who chose it and what it did (Circumvent Parry)',()=>{
 const A=arena();A.run(`S.logs=[
  {id:8,title:'Border Deserter attacks',body:'1 against Combat Style 44% — CRITICAL.',kind:'roll',meta:{exid:2,actor:'b'}},
  {id:9,title:'Kethan Voss parries',body:'36 vs 67% — SUCCESS. 1 AP remaining.',kind:'roll',meta:{actor:'a'}},
  {id:10,title:'Offensive Special Effects',body:'Border Deserter gains 1 Special Effect from superior success.',kind:'hit',meta:{actor:'b'}},
  {id:11,title:'Circumvent Parry',body:'The successful parry is bypassed.',kind:'hit',meta:{actor:'b'}}];PB.key='';`);
 assert.match(story(A).join('\n'),/Border Deserter chose Circumvent Parry \(Special Effect\): The successful parry is bypassed\. The parry still succeeded, but this blow goes around it: the parry stops none of the damage\./);
});

test('FR-08b: resisting the opponent standing up says what is happening',()=>{
 const A=arena();A.run(`S.logs=[];S.fighters.b.prone=true;S.pending={kind:'footingDefendChoice',actor:'b',target:'a',finishFootingDefense(){}};PB.key='';`);
 assert.equal(A.run('pbHeadline(pbCtx())'),'Border Deserter tries to stand: resist with Brawn or Athletics');
 assert.match(text(A.run('actionHtml()')),/Border Deserter is trying to get up\. You are engaged, so standing is an opposed roll: win it and they stay down \(Core p\.92\)/);
});

test('FR-14: picking up a weapon says it is step 1 of 2',()=>{
 const A=arena();A.run(`S.fighters.a.disarmed=true;S.fighters.a.droppedMetres=0;S.fighters.a.recoveringWeapon=false;`);
 assert.match(A.run(`actionChoiceHelp('recoverWeapon',S.fighters.a)`),/^Step 1 of 2: .*It is not ready yet: Ready Weapon/);
 A.run(`S.fighters.a.recoveringWeapon=true;`);
 assert.match(A.run(`actionChoiceHelp('recoverWeapon',S.fighters.a)`),/^Step 2 of 2/);
});

test('FR-15: a win after the loser\'s concurrent action names the cause in the tray and the details panel',()=>{
 const A=arena();
 // report 20261117-032318: Head Serious Wound, Endurance failed; the loser's concurrent attack is parried, then the bout ends
 A.run(`S.logs=[
  {id:43,title:'Kethan Voss attacks',body:'7 against Combat Style 67% — CRITICAL.',kind:'roll',meta:{exid:8,actor:'a'}},
  {id:51,title:'Falling',body:"Border Deserter is going down. Border Deserter loses consciousness from a Serious Wound to Head. They tied on Initiative, so both act at the same moment: Border Deserter's own action this cycle still happens first.",kind:'hurt',meta:{actor:'b'}},
  {id:53,title:'Border Deserter attacks',body:'27 against Combat Style 48% — SUCCESS.',kind:'roll',meta:{exid:9,actor:'b'}},
  {id:54,title:'Kethan Voss parries',body:'63 vs 67% — SUCCESS. 1 AP remaining.',kind:'roll',meta:{actor:'a'}},
  {id:57,title:'FIGHT ENDS',body:'Kethan Voss wins. Border Deserter loses consciousness from a Serious Wound to Head.',kind:'hurt'}];
  S.phase='over';S.winnerId='a';S.winner='Kethan Voss';S.fighters.b.hp.Head=-2;
  S.finalCause={type:'injury',location:'Head',severity:'serious',hpLost:7,remaining:-2,maxHp:5,victim:'Border Deserter',consequence:'Unconscious',
   reason:'Border Deserter loses consciousness from a Serious Wound to Head.'};PB.key='';`);
 assert.match(text(A.run('paTrayHtml()')),/Kethan Voss wins\s*Border Deserter: serious wound to the Head\. Unconscious\./);
 assert.match(text(A.run('pbDefaultInfo(pbCtx())')),/Border Deserter: serious wound to the Head\. Unconscious\./);
 // the Falling line is told whole in the Lost? recap
 A.run(`S.logs=S.logs.slice(0,2);S.phase='fight';PB.key='';`);
 assert.match(JSON.parse(A.run('JSON.stringify(plRecent())')).map(l=>l.text).join(' / '),/Falling: .*both act at the same moment: Border Deserter's own action this cycle still happens first\./);
});

console.log(passed+' report fix tests (FR-08 to FR-15) passed');
