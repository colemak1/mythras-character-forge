// The Pits: fixes from the player reports and Ideas of 2026-11-17 evening and 2026-11-18 (docs/pits-report-ledger.md,
// FR-22 to FR-25 and two Ideas). Rules and dice are unchanged.
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

// report 20261117-205457: "it looked like they exceeded the needed endurance roll but still died" (Endurance 16 against
// 27%, a success, lost to the attack's 24, also a success: the higher roll wins, Core p.110). Its numbers, on a leg (a
// wound to the abdomen would end the test's bout).
test('FR-22: an Endurance success that loses says why, in the log and in the deck',()=>{
 const A=arena();
 const body=JSON.parse(A.run(`(()=>{S.logs=[];const d=S.fighters.b,a=S.fighters.a;d.endurance=27;d.impaledWounds=[];d.fatigue=0;
   d.hp['Left Leg']=-2;d.maxHp['Left Leg']=6;
   requestDice=(actor,defs,label,cb)=>cb([16]);
   resolveWound(a,d,'Left Leg','serious',8,{roll:24,grade:2,label:'SUCCESS',name:'success'},()=>{});
   return JSON.stringify((S.logs.find(l=>/^SERIOUS WOUND/.test(l.title))||{}).body||'');})()`));
 assert.match(body,/Endurance 16\/27% \(SUCCESS\) versus the attack 24 \(SUCCESS\)\. Fails to resist: both succeeded and the attack's 24 is higher\./);
 A.run(`S.logs=[{id:48,title:'Kethan Voss attacks',body:'24 against Combat Style 67% — SUCCESS.',kind:'roll',meta:{exid:5,actor:'a'}},
  {id:58,title:'SERIOUS WOUND · Abdomen',body:${JSON.stringify(body)},kind:'hurt',meta:{actor:'b'}}];PB.key='';`);
 assert.match(story(A).join('\n'),/Endurance 16 against 27% · Success, against the attack roll of 24 · Success: both succeeded and the attack's 24 is higher\./);
 // the other cases
 const why=(e,a)=>JSON.parse(A.run(`(()=>{S.logs=[];const d=S.fighters.b;d.endurance=60;requestDice=(x,y,z,cb)=>cb([${e}]);
   resolveWound(S.fighters.a,d,'Left Leg','serious',8,${JSON.stringify(a)},()=>{});
   return JSON.stringify(S.logs.find(l=>/^SERIOUS WOUND/.test(l.title)).body);})()`));
 assert.match(why(50,{roll:24,grade:2,label:'SUCCESS',name:'success'}),/Resists the additional consequence: both succeeded and 50 is higher than the attack's 24\./);
 assert.match(why(3,{roll:24,grade:2,label:'SUCCESS',name:'success'}),/Resists the additional consequence: a better grade than the attack\./);
 assert.match(why(90,{roll:24,grade:2,label:'SUCCESS',name:'success'}),/Fails to resist: the attack has the better grade\./);
});

// Idea 20261117-210145: "the text in the endurance roll box that tells me if i miss i die is hard to read because its
// too small and too light"
test('Idea: the Endurance stakes have their own large lines in the dice tray, outside the line short screens hide',()=>{
 const A=arena();A.run(`S.pending=null;V.busy=false;
  S.woundTest={id:'a',level:'major',loc:'Head',attack:{roll:5,grade:3,name:'critical'}};
  R={actor:'a',defs:[{sides:100,label:'d100'}],label:'Endurance · major wound to Head · 63%'};`);
 const html=A.run('paTrayHtml()');
 const stakes=/<div class="r-stakes">([\s\S]*?)<\/div>/.exec(html);
 assert(stakes,'a stakes block');
 assert.match(text(stakes[1]),/Resist: .+ Fail: You die: the bout is over\./);
 const rs=/<div class="r-s">([\s\S]*?)<\/div>/.exec(html)[1];
 assert(!/r-stakes|You die/.test(rs),'not in the .r-s line, which short screens hide');
 const css=fs.readFileSync(path.join(root,'experiments/pits-arena.css'),'utf8');
 assert.match(css,/\.roll \.r-stakes p\{[^}]*font-weight:600/);assert.match(css,/\.roll \.r-stakes\{[^}]*font-size:14px/);
});

// Idea 20261117-205726: "the most important text in the bottom right of the screen is also the most difficult to read"
test('Idea: the Details panel\'s small lines are full-strength text, not dim',()=>{
 const css=fs.readFileSync(path.join(root,'experiments/pits-bottom.css'),'utf8');
 const rule=/\.bE \.binfo-body \.bsmall\{([^}]*)\}/.exec(css)[1];
 assert.doesNotMatch(rule,/pa-dim/);assert.match(rule,/font-size:13px/);
});

// report 20261117-205829: "when playing against a spear it always looks like the spear is already hitting my head"
test('FR-23: a long weapon\'s guard point stops clear of the other\'s face at an even range',()=>{
 const W={sword:{kind:'blade',len:92},spear:{kind:'spear',len:150},longspear:{kind:'spear',len:190},dagger:{kind:'blade',len:40}};
 for(const w of ['spear','longspear']){
  const M={a:C.fighter('a',W.sword,false,{}),b:C.fighter('b',W[w],false,{})},g=C.gap(W.sword,W[w],'even');
  C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
  const a=C.joints(M.a,10),b=C.joints(M.b,10);
  // (was 47 for a spear: the point drawn on the sword hand, in front of the face)
  assert(b.tip[0]-a.Hd[0]>55,w+': the point is '+(b.tip[0]-a.Hd[0]).toFixed(0)+' from the face');
 }
 // swords and daggers keep their spacing
 assert.equal(C.gap(W.sword,W.sword,'even'),207);assert.equal(C.gap(W.dagger,W.sword,'even'),207);
});

// report 20261118-022241: "replay said victory twice and looked very weird". The fight ended on the withdrawal of a held
// Impale; the replay put the fight's end on the Impale blow as well, so the loser collapsed twice. Fixed by #374 (a
// withdrawal starts its own action); this is that fight's log.
test('FR-24: the end of a fight won by a withdrawal is not drawn on the Impale blow before it',()=>{
 const A=arena(),N={a:'Kethan Voss',b:'Border Deserter'};
 const ev=[
  {id:9,title:'Kethan Voss attacks',body:'35 against Combat Style 67% — SUCCESS.',kind:'roll',meta:{exid:3,actor:'a'}},
  {id:10,title:'Border Deserter parries',body:'88 vs 47% — FAILURE. 0 AP remaining.',kind:'roll',meta:{actor:'b'}},
  {id:11,title:'Offensive Special Effects',body:'Kethan Voss gains 1 Special Effect from superior success.',kind:'system',meta:{}},
  {id:12,title:'Impale',body:'Weapon damage will be rolled twice; choose a result.',kind:'hit',meta:{actor:'a'}},
  {id:13,title:'Hit Location',body:'Kethan Voss rolls 8 (d20): Left Arm.',kind:'system',meta:{}},
  {id:14,title:'Impale · Damage selected',body:'Kethan Voss chooses option A: 6 weapon damage before the Damage Modifier.',kind:'system',meta:{}},
  {id:15,title:'Kethan Voss hits Left Arm',body:'6 weapon (6) +1d2 (+1) = 7 total; 0 parry; 0 armour; 7 HP lost.',kind:'hurt',
   meta:{actor:'a',impact:{target:'b',location:'Left Arm',hpLost:7},px:{total:7,blocked:0,armour:0,wound:7,loc:'Left Arm'}}},
  {id:16,title:'Impaled Weapon',body:"Kethan Voss's Broadsword lodges in Border Deserter's Left Arm. Choose: keep hold and pull it free on a later turn, or leave it in the wound.",kind:'hurt',meta:{}},
  {id:17,title:'Impale · Keeps hold',body:'Kethan Voss keeps hold of the weapon and can pull it free on a later turn (Ready Weapon).',kind:'system',meta:{}},
  {id:19,title:'SERIOUS WOUND · Left Arm',body:'Border Deserter Endurance 55/27% (FAILURE) versus the attack 35 (SUCCESS). Fails to resist: the attack has the better grade. Endurance 53% made harder by impaled weapon.',kind:'hurt',meta:{actor:'b'}},
  {id:20,title:'Limb Disabled',body:"Border Deserter's Left Arm becomes unusable until healed to positive HP. They cannot use that arm.",kind:'hurt',meta:{}},
  {id:21,title:'Delay',body:'Border Deserter holds an Action Point for a reaction until their next turn.',kind:'system',meta:{}},
  {id:22,title:'Withdraw Impale',body:'Kethan Voss Brawn 2 (CRITICAL) versus Border Deserter Brawn 34 (FAILURE): weapon withdrawn.',kind:'system',meta:{}},
  {id:23,title:'Withdrawal injury',body:"Kethan Voss withdraws Broadsword: 8 normal weapon damage, halved to 4. No Damage Modifier or armour reduction. Border Deserter's Left Arm is now -7 HP.",kind:'hurt',meta:{}},
  {id:24,title:'MAJOR WOUND · Left Arm',body:'Border Deserter Endurance 27/53% (SUCCESS) versus the attack 2 (CRITICAL). Fails to resist: the attack has the better grade.',kind:'hurt',meta:{actor:'b'}},
  {id:25,title:'FIGHT ENDS',body:'Kethan Voss wins. Border Deserter has a Major Limb Wound to the Left Arm: incapacitated and prone.',kind:'hurt',meta:{}}];
 const beats=JSON.parse(A.run(`JSON.stringify(${JSON.stringify(ev)}.map((e,i,all)=>{const b=pitsStageBeat(all,i,${JSON.stringify(N)});
   return b.cue?{id:e.id,type:b.cue.type,consumed:b.consumed,after:(b.cue.record&&b.cue.record.after||[]).map(c=>c.type)}:null;}).filter(Boolean))`));
 const hit=beats.find(b=>b.id===15);
 assert.equal(hit.type,'hit');assert(!hit.after.includes('end'),'the Impale blow does not end the fight: '+hit.after);
 assert(!hit.after.includes('wound')||hit.after.filter(t=>t==='wound').length===1,'only its own Serious Wound');
 assert.equal(beats.find(b=>b.id===25).consumed,false,'the end is drawn after the withdrawal');
});

// Idea 20261118-164218: "when they surrender they should drop all weapons and shields before raising the white flag"
test('Idea: a surrender drops the weapon and the shield before the flag goes up',()=>{
 const st=fs.readFileSync(path.join(root,'experiments/pits-stage.js'),'utf8');
 const fn=/function psSurrenderDrop\(f\)\{([\s\S]*?)\n\}/.exec(st);assert(fn,'psSurrenderDrop');
 assert.match(fn[1],/f\.look\.armed&&!f\.dropEl\)\{f\.finishDrop=true;f\.look\.armed=false;psFlyWeapon\(f,0\)/,'the weapon falls');
 assert.match(fn[1],/f\.look\.shield&&!f\.shieldDropEl[\s\S]*f\.shieldDropped=true;f\.look\.shield=false/,'the shield falls');
 // the cinematic end: drop, then the surrender pose and the flag later
 assert.match(st,/psSurrenderDrop\(lo\);const t0=PS\.clock\+360;end=L\.surrender\?L\.surrender\(PS\.M\[lo\.id\],t0\)[^\n]*lo\.flagAt=t0\+260;/);
 // the shield stays down when the stage re-reads the engine, and comes back for a new bout or a replay
 assert.match(st,/if\(f\.shieldDropped\)f\.look\.shield=false;/);
 assert.match(st,/if\(f\.shieldDropEl\)\{f\.shieldDropEl\.remove\(\);f\.shieldDropEl=null;\}f\.shieldDropped=false;/);
});

// Idea 20261118-164233: "lets add some victory celebrations"
test('Idea: the winner celebrates after lowering the weapon, the same way in a replay',()=>{
 const sword={kind:'blade',len:92};
 const make=()=>{const M={a:C.fighter('a',sword,false,{seed:7}),b:C.fighter('b',sword,false,{seed:7})};C.place(M.a,0,210,'guard');C.place(M.b,0,210,'guard');return M;};
 C.fixChoices(0);   // the overhead raise
 let M=make();const t1=C.lower(M.a,10),t2=C.celebrate(M.a,t1);
 assert(t2>t1+2000,'it takes a moment');
 const up=C.joints(M.a,t1+520);assert(up.Hn[1]>up.Hd[1]&&up.tip[1]>up.Hn[1]+60,'the weapon goes up over the head');
 const end=C.joints(M.a,t2),low=C.joints(M.a,t1);assert(Math.abs(end.Hn[1]-low.Hn[1])<2,'it ends in the victory stance');
 C.fixChoices(null);
 const pickOf=()=>{const m=make();const a=C.lower(m.a,10);const b=C.celebrate(m.a,a);return b-a;};
 assert.equal(pickOf(),pickOf(),'chosen from the bout, not at random');
 const st=fs.readFileSync(path.join(root,'experiments/pits-stage.js'),'utf8');
 assert.match(st,/const e1=L\.lower\(PS\.M\[wi\.id\],PS\.clock\);end=Math\.max\(end,e1\);if\(L\.celebrate\)L\.celebrate\(PS\.M\[wi\.id\],e1\);/);
 assert.match(st,/if\(L\.celebrate\)L\.celebrate\(PS\.M\[atk\.id\],e2\);/);
});

console.log(passed+' passed');
