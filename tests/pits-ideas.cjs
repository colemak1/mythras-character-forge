// The Pits: the five player Ideas of 2026-11-17 (docs/pits-report-ledger.md, "Ideas"), built at the owner's request.
// The deck's decision first and large, the recommended choice bordered red; a recommended Special Effect and the ones
// that change nothing folded away; opposed rolls side by side; Impale keeps the higher roll and shows the lower leave.
// (The parry that skips its location and damage rolls is tested in tests/practice-procedure.cjs.)
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



test('the decision comes first in the middle, large, in a red-bordered box when it is the recommended one',()=>{
 const A=arena();A.run(`S.logs=[];S.order=['a','b'];S.turnIndex=0;S.pending=null;R=null;V.busy=false;S.fighters.a.ap=2;PB.key='';PB.sel=null;`);
 const html=A.run('pbMiddle(pbCtx())');
 assert.match(html,/class="bmid bdecide"><p class="bkick"><span>Action<\/span>/);
 const box=html.indexOf('brecbox is-rec'),story=html.indexOf('class="bstory short"');
 assert(box>0&&story>box,'the recommendation comes before the story');
 assert.match(html,/<span class="brecl">Recommended<\/span><p><b>Recommended\.<\/b> Attacking is how a bout is won/);
 assert.match(A.run('pbLeft(pbCtx())'),/class="brow sel rec" data-pa="sel" data-val="attack"/);
 // another pick: the box says so and is not red
 A.run(`PB.sel='brace'`);const other=A.run('pbMiddle(pbCtx())');
 assert.doesNotMatch(other,/is-rec/);assert.match(other,/<span class="brecl other">Your choice<\/span>/);
});

const FX=`S.logs=[];V.busy=false;R=null;S.fighters.b.armourLocations=Object.fromEntries(HIT_LOCS.map(l=>[l,0]));S.fighters.b.armor=0;
 S.pending={kind:'effect',atk:'a',def:'b',owner:'a',other:'b',effectsLeft:1,chosen:[],reaction:'parry',parryTool:'weapon',
  attackRoll:{roll:10,grade:2,label:'SUCCESS'},defenseRoll:{roll:80,grade:1,label:'FAILURE'}};PB.key='';PB.fx=null;`;

test('Special Effects: the recommended one is pre-selected and bordered; ones that change nothing fold under "more"',()=>{
 const A=arena();A.run(FX);
 const ids=JSON.parse(A.run('JSON.stringify(availableEffects(S.pending).map(e=>e[0]))'));
 const rec=JSON.parse(A.run('JSON.stringify(pitsRecommendedEffect(S.pending))'));
 // the recommendation is the computer fighters' own best score, among the effects that change something
 const best=JSON.parse(A.run(`JSON.stringify(effectScores(S.pending).filter(([id])=>!pitsEffectIdle(id,S.pending)).sort((a,b)=>b[1]-a[1])[0][0])`));
 assert.equal(rec.id,best);assert(rec.why.length>10,'with a reason');
 const html=A.run('pbMiddle(pbCtx())');
 assert.match(html,new RegExp(`class="bgo" data-act="effect" data-val="${rec.id}"`),'pre-selected: Confirm sends it');
 assert.match(html,new RegExp(`class="bfx sel rec" data-pa="fx" data-val="${rec.id}"`));
 for(const id of ids)assert.equal(html.split(`data-pa="fx" data-val="${id}"`).length-1,1,id+' still choosable');
 // no armour on them: Bypass Armour is folded away with its reason, if offered; Scar Foe always
 assert.match(html,/<details class="bfxmore"><summary>\d+ more that change nothing now<\/summary>[\s\S]*data-val="scar"[\s\S]*A scar for the story/);
 assert.doesNotMatch(html,/class="bstory/,'no fight history while choosing');
});

test('Special Effects: Stand Fast and Enhance Parry change nothing when the attack missed',()=>{
 const A=arena();
 assert.match(A.run(`pitsEffectIdle('standFast',{owner:'b',atk:'a',other:'a',attackRoll:{grade:1}})`),/no blow lands/);
 assert.equal(A.run(`pitsEffectIdle('standFast',{owner:'b',atk:'a',other:'a',attackRoll:{grade:2}})`),'');
 assert.match(A.run(`pitsEffectIdle('enhance',{owner:'b',atk:'a',other:'a',attackRoll:{grade:0}})`),/no blow lands/);
});

test('the AI still picks with its own style and randomness on top of the same scores',()=>{
 const src=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8');
 assert.match(src,/function aiChooseEffect\(p\)\{\n const actor=S\.fighters\[p\.owner\];\n return effectScores\(p\)\.map\(\(\[id,w\]\)=>\[id,w\+\(AI_STYLES\[actor\.tactic\]\?\.effects\[id\]\?\?0\)\+Math\.random\(\)\*13\]\)/);
});

test('an opposed roll carries the roll it must beat, and the tray shows both side by side',()=>{
 const A=arena();
 A.run(`render=()=>{};S.logs=[];V.busy=false;R=null;S.fighters.b.kind='human';S.fighters.b.brawn=53;
  opposing(S.fighters.a,'attack',{roll:30,grade:2});requestSkill('b',53,'Trip · Border Deserter Brawn',()=>{});`);
 assert.deepEqual(JSON.parse(A.run('JSON.stringify(R.vs)')),{who:'Kethan Voss',what:'attack',roll:30,grade:2});
 assert.equal(A.run('R.pct'),53,'the target travels with the roll');
 const before=text(A.run('paTrayHtml()'));
 // Brawn 53 against a 30 Success: 01-06 critical and 31-53 higher successes win: 29
 assert.match(before,/Kethan Voss · attack\s*30\s*Success\s*vs\s*Border Deserter · 53%\s*\?\s*to roll\s*Chance to win: 29%/);
 assert.equal(A.run('NEXT_VS'),null,'used once');
 // after: Brann's 35 beats the 30 on the same grade
 A.run(`V.busy=true;V.roll={actor:'b',defs:[{sides:100}],label:R.label,vs:R.vs,pct:53,values:[35],settled:true};R=null;`);
 assert.match(text(A.run('paTrayHtml()')),/Border Deserter · 53%\s*35\s*Success\s*Border Deserter wins: the same grade, the higher roll/);
 A.run(`V.roll.values=[60];`);assert.match(text(A.run('paTrayHtml()')),/Kethan Voss wins: the better grade/);
 // a roll with nothing to beat shows no side by side
 A.run(`V.roll.vs=null;`);assert.doesNotMatch(A.run('paTrayHtml()'),/class="rvs"/);
});

test('each opposed roll in the engine names what it is against',()=>{
 const src=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8');
 for(const label of ['Trip · \\$\\{target','Resist disarm','Resist surrender','Blind Opponent · \\$\\{target','Stun Location · \\$\\{def','Bleed · \\$\\{def',
   'Endurance · \\$\\{cls\\} wound','Hold on · ','Hold pin · ','Oppose standing','Resist withdrawal','Trip · \\$\\{victim'])
  assert.match(src,new RegExp('opposing\\([^\\n]*\\);?\\s*(?:\\n\\s*)?(?:if\\(opposed\\)\\{opposing[^\\n]*)?requestSkill\\([^\\n]*`'+label),label);
});

test('Impale: the tray shows both weapon rolls and the lower one leaves',()=>{
 const A=arena();
 A.run(`V.busy=true;R=null;V.roll={actor:'a',label:'Damage · Chest · roll weapon twice',settled:true,values:[3,6,2],
  defs:[{sides:8,label:'Weapon A 1'},{sides:8,label:'Weapon B 1'},{sides:2,label:'DM 1'}]};`);
 const html=A.run('paTrayHtml()');
 assert.match(html,/<span class="rimp-gone"><small>Roll A<\/small><b>3<\/b><\/span><span class="rimp-keep"><small>Roll B<\/small><b>6<\/b><\/span>/);
 assert.match(text(html),/Impale keeps the higher weapon roll:\s*6/);
 A.run(`V.roll.label='Damage · Chest'`);assert.doesNotMatch(A.run('paTrayHtml()'),/rimp/);
});

test('a whole parry says why no location or damage was rolled',()=>{
 const A=arena();A.run(`S.logs=[
  {id:1,title:'Kethan Voss attacks',body:'30 against Combat Style 70% — SUCCESS.',kind:'roll',meta:{exid:1,actor:'a'}},
  {id:2,title:'Border Deserter parries',body:'20 vs 60% — SUCCESS. 1 AP remaining.',kind:'roll',meta:{actor:'b'}},
  {id:3,title:'No Damaging Hit',body:'x',kind:'system',meta:{actor:'a',px:{react:'parry',reactGrade:2,aGrade:2,wholeParry:true}}}];PB.key='';`);
 assert.match(story(A).join('\n'),/Parried · No damage: the parry stops the whole blow whatever is rolled, so no location or damage roll\./);
});

console.log(passed+' Pits idea tests passed');
