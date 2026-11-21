// The Pits: fixes from the player reports of 2026-11-18 night and 2026-11-20 (docs/pits-report-ledger.md,
// FR-30 to FR-33). Rules and dice are unchanged.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const C=require('../experiments/pits-cine.js');
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
  S.phase='fight';S.pending=null;S.order=['a','b'];S.turnIndex=0;S.round=1;S.cycle=1;S.disengaged=false;S.engagement='equal';})()`);
 ctx.document.body={dataset:{bottom:'E'},classList:{contains:()=>false}};
 return {run,ctx};
}
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const text=html=>String(html).replace(/<\/?(b|i|span|kbd|small)[^>]*>/g,'').replace(/<[^>]*>/g,' ').replace(/&#39;/g,"'").replace(/\s+/g,' ');
const story=A=>JSON.parse(A.run('JSON.stringify(pbStory(pbExchange()).map(l=>l.html))')).map(text);

// report 20261120-214527: "it still doesnt make sense whats going on when an endurance roll is done, it looks like he
// should have died there" (a Serious Wound to the left arm, Endurance 96 against 27% failed: the arm is useless and the
// fight goes on). The story opens with what happened, in plain words.
test('FR-30: the Endurance story leads with what happened, and says when the fight goes on',()=>{
 const A=arena();A.run(`S.logs=[
  {id:10,title:'Kethan Voss attacks',body:'60 against Combat Style 67% — SUCCESS.',kind:'roll',meta:{exid:5,actor:'a'}},
  {id:20,title:'SERIOUS WOUND · Left Arm',body:'Border Deserter Endurance 96/27% (FAILURE) versus the attack 60 (SUCCESS). Fails to resist: the attack has the better grade. Endurance 53% made harder by impaled weapon.',kind:'hurt',meta:{actor:'b'}}];PB.key='';`);
 let s=story(A).join('\n');
 assert.match(s,/Border Deserter's left arm is useless until healed\. The fight goes on\. Border Deserter fails the Serious Wound to the Left Arm: Endurance 96/);
 A.run(`S.logs[1]={id:20,title:'SERIOUS WOUND · Left Arm',body:'Border Deserter Endurance 5/53% (SUCCESS) versus the attack 60 (SUCCESS). Resists the additional consequence: a better grade than the attack.',kind:'hurt',meta:{actor:'b'}};PB.key='';`);
 assert.match(story(A).join('\n'),/Border Deserter resists: only the wound itself\. The fight goes on\./);
 A.run(`S.logs[1]={id:72,title:'MAJOR WOUND · Head',body:'Kethan Voss Endurance 45/55% (SUCCESS) versus the attack 57 (SUCCESS). Fails to resist.',kind:'hurt',meta:{actor:'a'}};PB.key='';`);
 s=story(A).join('\n');
 assert.match(s,/You die: the bout is over\. You fail the Major Wound/);assert.doesNotMatch(s,/fight goes on/);
});

// report 20261120-214915: "contested rolls in general are hard to follow and hard to see if you won the roll or not". In
// its bout, freeing a pinned weapon failed on two failures (59/52% against 56/53%), and the dice tray named the one
// trying to get free as the winner while the pin held: a tie or two failures go to the side that did not have to beat.
test('FR-31: the dice tray names the right winner when the first roll is the one that has to win',()=>{
 const A=arena();
 A.run(`render=()=>{};S.logs=[];V.busy=false;R=null;S.fighters.a.kind='human';S.fighters.b.kind='human';S.fighters.a.brawn=53;
  opposing(S.fighters.b,'Brawn',{roll:59,grade:1},'first');requestSkill('a',53,'Hold pin · Kethan Voss Brawn',()=>{});`);
 assert.equal(A.run('R.vs.mustBeat'),'first');
 const before=text(A.run('paTrayHtml()'));
 // Kethan keeps the pin on any roll that Border Deserter's failed 59 does not beat: everything but a fumble (99, 00)
 assert.match(before,/Chance to win: 98%/);assert.match(before,/a tie or two failures: Kethan Voss/);
 A.run(`V.busy=true;V.roll={actor:'a',defs:[{sides:100}],label:R.label,pct:53,vs:R.vs,settled:true,values:[56]};`);
 const after=text(A.run('paTrayHtml()'));
 assert.match(after,/Kethan Voss wins: both failed, and Border Deserter had to beat the other roll/);
 // a resist (the default) still has to beat the roll before it
 A.run(`V.busy=false;R=null;opposing(S.fighters.b,'attack',{roll:30,grade:2});requestSkill('a',53,'Resist disarm · Kethan Voss',()=>{});
  V.busy=true;V.roll={actor:'a',defs:[{sides:100}],label:R.label,pct:53,vs:R.vs,settled:true,values:[30]};`);
 assert.match(text(A.run('paTrayHtml()')),/Border Deserter wins: the same roll, and Kethan Voss had to beat it/);
});

test('FR-31: every opposed roll in the log gives both grades and the reason, naming who won',()=>{
 const A=arena();
 const last=t=>JSON.parse(A.run(`JSON.stringify(S.logs.filter(l=>l.title===${JSON.stringify(t)}).pop().body)`));
 A.run(`S.logs=[];const f=S.fighters.b,h=S.fighters.a;f.kind='ai';h.kind='ai';f.brawn=52;h.brawn=53;f.ap=2;S.order=['b','a'];S.turnIndex=0;
  f.pinnedGear='weapon';f.pinnedBy='a';const q=[59,56];requestDice=(x,y,z,cb)=>cb([q.shift()]);advance=()=>{};
  beginFreePinnedGear('b');`);
 assert.equal(last('Pin Weapon · Escape'),"Border Deserter Brawn 59/52% (FAILURE) versus Kethan Voss Brawn 56/53% (FAILURE). The weapon remains pinned: both failed, and Border Deserter had to beat the other roll.");
 A.run(`S.fighters.b.ap=2;const q2=[30,80];requestDice=(x,y,z,cb)=>cb([q2.shift()]);beginFreePinnedGear('b');`);
 assert.equal(last('Pin Weapon · Escape'),'Border Deserter Brawn 30/52% (SUCCESS) versus Kethan Voss Brawn 80/53% (FAILURE). Frees weapon: Border Deserter has the better grade.');
});
// report 20261120-214809: "that exchange looked very bad" (a critical parry that won Pin Weapon and Blind Opponent). The
// pinned weapon arm went to its held-down pose in one frame. The rig takes how far the arm has gone there, and the
// stage turns it over PS_ARM_TO ms (a disabled arm going limp too).
test('FR-32: a pinned or disabled arm turns to its pose over a moment, not in one frame',()=>{
 C.keep(0);const sw={kind:'blade',len:92},m=C.fighter('a',sw,false,{});C.place(m,0,200,'guard');
 const free=C.joints(m,0,{}),half=C.joints(m,0,{pinW:.5}),pinned=C.joints(m,0,{pinW:true}),d=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
 assert(d(free.Hn,pinned.Hn)>10,'pinned, the hand is held down elsewhere');
 assert(d(half.Hn,free.Hn)>2&&d(half.Hn,pinned.Hn)>2,'halfway, the hand is between the two');
 assert.deepEqual(C.joints(m,0,{pinW:1}).Hn,pinned.Hn);
 const limp=C.joints(m,0,{weapon:true}),lh=C.joints(m,0,{weapon:.5});assert(d(lh.Hn,free.Hn)>2&&d(lh.Hn,limp.Hn)>2,'a disabled arm too');
 const src=fs.readFileSync(path.join(root,'experiments/pits-stage.js'),'utf8');
 assert.match(src,/pinW:to\('pw',/);assert.match(src,/const PS_ARM_TO=\d+;/);
});
console.log(passed+' passed');
