// The Pits: fixes from the player reports of 2026-11-17 (docs/pits-report-ledger.md, FR-16 to FR-20). Each case uses the
// engine's own log lines from the exported reports and checks what the deck, the plates, the dice tray and the stage's
// cues make of them. Rules and dice are unchanged; only the Endurance line now names the target actually rolled against.
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


const INIT=`{id:41,title:'Kethan Voss · Initiative',body:'Kethan Voss rolls 5 + 13 − 2 armour penalty = 16.',kind:'system'},
 {id:42,title:'Border Deserter · Initiative',body:'Border Deserter rolls 5 + 12 − 0 armour penalty = 17.',kind:'system'},
 {id:43,title:'Encounter 2 · Initiative',body:'Kethan Voss: 5+13−2 = 16. Border Deserter: 5+12−0 = 17. Border Deserter acts first.',kind:'system'}`;
const LAST_BOUT=`{id:35,title:'Kethan Voss hits Right Leg',body:'8 weapon (8) +1d2 (+2) = 10 total; 0 parry; 0 armour; 10 HP lost.',kind:'hurt',
  meta:{actor:'a',impact:{target:'b',location:'Right Leg',hpLost:10},px:{total:10,blocked:0,armour:0,wound:10,loc:'Right Leg',before:1,after:-9}}},
 {id:39,title:'FIGHT ENDS',body:'Kethan Voss wins.',kind:'hurt'},
 {id:40,title:'New Opponent',body:'Border Deserter steps forward. Your HP was restored.',kind:'system'}`;

test('FR-16: after the initiative rolls the tray and the story say who acts first, with both totals and how they were made',()=>{
 const A=arena();A.run(`S.logs=[${INIT}];PB.key='';`);
 const tray=text(A.run('paTrayHtml()'));
 assert.match(tray,/Initiative\s*Border Deserter acts first/);
 assert.match(tray,/Kethan Voss d10 5 \+ 13 bonus − 2 armour = 16/);assert.match(tray,/Border Deserter d10 5 \+ 12 bonus = 17/);
 assert.match(text(A.run('pbMiddle(pbCtx())')),/Initiative: Border Deserter acts first\. Kethan Voss d10 5 \+ 13 bonus − 2 armour = 16; Border Deserter d10 5 \+ 12 bonus = 17\./);
 A.run(`S.logs[2].body='Kethan Voss: 5+13−1 = 17. Border Deserter: 5+12−0 = 17. Tied: they act concurrently.';PB.key='';`);
 assert.match(text(A.run('paTrayHtml()')),/Tied at 17: they act at the same time/);
});

test('FR-17: a new opponent does not show the last bout\'s final blow as its result',()=>{
 const A=arena();A.run(`S.logs=[${LAST_BOUT}];PB.key='';`);
 assert.match(A.run('paTrayHtml()'),/class="roll idle"/,'nothing from the last bout');
 A.run(`S.logs=[${LAST_BOUT},${INIT}];PB.key='';`);
 const tray=text(A.run('paTrayHtml()'));assert.match(tray,/Border Deserter acts first/);assert.doesNotMatch(tray,/Right Leg/);
});

test('FR-16: the initiative result is held on screen before the first blow',()=>{
 const src=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8');
 assert.match(src,/INITIATIVE_HOLD_MS=2200/);
 assert.match(src,/if\(\/\^Encounter \\d\+ · Initiative\$\/\.test\(e\.title\|\|''\)\)\{schedulePresentation\(V\.quick\?DICE_HOLD_QUICK_MS:INITIATIVE_HOLD_MS\);return;\}/);
});

// report 20261117-183744: "54/55% (FAILURE)" was a roll against 28% (an impaled weapon makes it Formidable)
test('FR-18: the wound line names the Endurance target rolled against, and why it was lower',()=>{
 const A=arena();
 const body=JSON.parse(A.run(`(()=>{S.logs=[];const d=S.fighters.b,a=S.fighters.a;d.endurance=55;d.impaledWounds=[];d.fatigue=0;
   d.hp['Left Leg']=-3;d.maxHp['Left Leg']=5;
   const t=JSON.parse(JSON.stringify(d));
   window.__ir=0;effectiveSkill=(f,p)=>f===d?28:p;skillPenaltyCauses=f=>f===d?['impaled weapon']:[];
   requestDice=(actor,defs,label,cb)=>cb([54]);
   resolveWound(a,d,'Left Leg','serious',3,{roll:49,grade:2,label:'SUCCESS',name:'success'},()=>{});
   return JSON.stringify((S.logs.find(l=>/^SERIOUS WOUND/.test(l.title))||{}).body||'');})()`));
 assert.match(body,/^Border Deserter Endurance 54\/28% \(FAILURE\) versus the attack 49 \(SUCCESS\)\. Fails to resist: the attack has the better grade\. Endurance 55% made harder by impaled weapon\.$/);
});

test('FR-18: the story tells the Endurance roll in plain words: both rolls, how to resist, and what it meant',()=>{
 const A=arena();A.run(`S.logs=[
  {id:48,title:'Kethan Voss attacks',body:'49 against Combat Style 67% — SUCCESS.',kind:'roll',meta:{exid:5,actor:'a'}},
  {id:58,title:'SERIOUS WOUND · Left Leg',body:'Border Deserter Endurance 54/28% (FAILURE) versus the attack 49 (SUCCESS). Fails to resist. Endurance 55% made harder by impaled weapon.',kind:'hurt',meta:{actor:'b'}}];PB.key='';`);
 const s=story(A).join('\n');
 assert.match(s,/Border Deserter fails the Serious Wound to the Left Leg: Endurance 54 against 28% \(55%, made harder by impaled weapon\) · Failure, against the attack roll of 49 · Success\./);
 assert.match(s,/To resist, Endurance must beat the attack roll: a better grade, or the same grade and a higher roll \(Core p\.110\)\./);
 assert.match(s,/Not resisted: the left leg is useless until healed, and they fall prone\. \(Had it been resisted: only the wound itself\.\)/);
 A.run(`S.logs[1]={id:72,title:'MAJOR WOUND · Head',body:'Kethan Voss Endurance 45/55% (SUCCESS) versus the attack 57 (SUCCESS). Fails to resist.',kind:'hurt',meta:{actor:'a'}};PB.key='';`);
 assert.match(story(A).join('\n'),/You fail the Major Wound to the Head: .*Not resisted: You die: the bout is over\./);
});

test('FR-18: a player\'s own Endurance roll shows what it must beat, the chance, and the stakes',()=>{
 const A=arena();A.run(`S.logs=[];S.pending=null;V.busy=false;
  S.woundTest={id:'a',level:'serious',loc:'Right Arm',attack:{roll:49,grade:2,name:'success'}};
  R={actor:'a',defs:[{sides:100,label:'d100'}],label:'Endurance · serious wound to Right Arm · 55%'};`);
 const tray=text(A.run('paTrayHtml()'));
 // resisting 49 (Success) at 55%: a critical (01-06) or a success above 49 (50-55)
 assert.match(tray,/Beat the attack roll of 49 \(Success\): a better grade, or the same grade and a higher roll\. Chance to resist: 12%\./);
 assert.match(tray,/Resist: only the wound itself\. Fail: the right arm is useless until healed\./);
});

test('FR-19: Overextend Opponent has its own movement on the one overextended, carried by the failed blow',()=>{
 const A=arena();
 const c=JSON.parse(A.run(`JSON.stringify(pitsStageCue({title:'Overextend Opponent',body:'Border Deserter cannot attack on the next Turn, but may act otherwise.',meta:{actor:'a'}},{a:'Kethan Voss',b:'Border Deserter'}))`));
 assert.deepEqual(c,{type:'overextend',actor:'a',target:'b'});
 const ev=`[{id:87,title:'Border Deserter attacks',body:'57 against Combat Style 49% — FAILURE.',kind:'roll',meta:{exid:1,actor:'b'}},
  {id:88,title:'Kethan Voss parries',body:'20 vs 67% — SUCCESS. 2 AP remaining.',kind:'roll',meta:{actor:'a'}},
  {id:90,title:'Overextend Opponent',body:'Border Deserter cannot attack on the next Turn, but may act otherwise.',kind:'hit',meta:{actor:'a'}},
  {id:91,title:'No Damaging Hit',body:"Border Deserter's attack failed to connect.",kind:'system',meta:{actor:'b',px:{}}}]`;
 const names=`{a:'Kethan Voss',b:'Border Deserter'}`;
 assert.equal(JSON.parse(A.run(`JSON.stringify(pitsStageBeat(${ev},2,${names}).consumed)`)),true,'the blow draws it');
 const rec=JSON.parse(A.run(`JSON.stringify(pitsStageBeat(${ev},3,${names}).cue.record.overextend)`));
 assert.deepEqual(rec,{type:'overextend',actor:'a',target:'b'});
 const cine=fs.readFileSync(path.join(root,'experiments/pits-cine.js'),'utf8');
 assert.match(cine,/function overextend\(m,t\)/);assert.match(cine,/press,overextend,trip/);
});

test('FR-20: no reach stance while a weapon held in a wound joins the two fighters',()=>{
 const src=fs.readFileSync(path.join(root,'experiments/pits-stage.js'),'utf8');
 assert.match(src,/L\.setRange\(PS\.M,psRangeKey\(\),info\.active&&!psTiedByLodge\(\)\?info\.longer:null\);/);
});

test('Idea 20261117-192715: each condition chip says what it does, on hover or tap',()=>{
 const A=arena();A.run(`S.fighters.a.prone=true;S.fighters.a.overextendedTurns=1;S.fighters.a.blindedTurns=2;`);
 const html=A.run('paConditions(S.fighters.a)');
 assert.match(html,/title="On the ground: Combat Style and Evade are Formidable \(halved\)\. Regain Footing costs 1 AP\."/);
 assert.match(html,/title="Overextend Opponent: the last attack left this fighter off balance; it cannot attack on its next turn\./);
 assert.match(html,/title="Blinded for 2 more turns: Combat Style and Evade are Herculean \(a tenth\)\."/);
 assert.match(html,/tabindex="0"/);
 const key=/data-pb-info="(cond:[^"]+)"/.exec(html)[1].replace(/&amp;/g,'&');
 assert.match(text(A.run(`pbInfoHtml(pbCtx(),${JSON.stringify(key)})`)),/Prone condition On the ground: Combat Style and Evade are Formidable/);
});

console.log(passed+' report fix tests (FR-16 to FR-20) passed');
