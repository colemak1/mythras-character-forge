// The Pits bottom deck (experiments/pits-bottom.js, layout E reworked 2026-11-14): your moves on the left
// (actions and defences), what's happening in the middle (Special Effects and Choose Location chosen there,
// not in a window), details and odds on the right. Presentation only: every button carries the engine's own
// data-act, and every odd is counted face by face with the engine's own grading and opposed-roll rule.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function arena(phone=false){
 const output={innerHTML:'',addEventListener(){}};
 const ctx={console,URLSearchParams,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:''},
  sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
  document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){}},
  window:{matchMedia:()=>({matches:phone}),requestAnimationFrame(){}}};
 ctx.matchMedia=ctx.window.matchMedia;
 vm.createContext(ctx);
 for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js','experiments/pits-game.js','experiments/pits-stage.js','experiments/pits-arena.js','experiments/pits-bottom.js'])
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 const run=s=>vm.runInContext(s,ctx);
 run(`(()=>{startRun();R=null;V.busy=false;const a=S.fighters.a,b=S.fighters.b;
  for(const f of [a,b]){f.weapon='sword';f.shield='none';f.weaponGuard=null;ensureEffectState(f);f.ap=2;f.apMax=2;f.prone=false;f.disarmed=false;f.braced=false;
   f.stunnedLocations={};f.skipAttack=0;f.pressedTurns=0;f.overextendedTurns=0;f.fatigue=0;f.impaledWounds=[];f.entangled=null;f.blindedTurns=0;f.style=60;f.evade=50;f.brawn=40;f.acrobatics=0;f.endurance=55;f.willpower=45;}
  b.kind='human';S.mode='pvp';
  S.phase='fight';S.pending=null;S.order=['a','b'];S.turnIndex=0;S.disengaged=false;S.engagement='equal';S.tie=null;})()`);
 return {run};
}
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const A=arena();
const tags=(html,attr)=>[...html.matchAll(new RegExp(`<button[^>]*${attr}[^>]*>`,'g'))].map(m=>m[0]);

test('desktop uses this deck; phones keep the older one',()=>{
 assert.equal(A.run('pitsBottomLayout()'),'E');
 assert.match(A.run('pitsArenaDeckHtml()'),/class="bdeck bE"/);
 const P=arena(true);
 assert.equal(P.run('pitsBottomLayout()'),'current');
 assert.doesNotMatch(P.run('pitsArenaDeckHtml()'),/bdeck/);
});

test('on your turn: every legal action is listed to select, and only Confirm sends the engine act',()=>{
 const html=A.run('pitsArenaDeckHtml()');
 const legal=JSON.parse(A.run(`JSON.stringify(pitsLegalActions('a'))`));
 for(const x of legal)assert(tags(html,`data-pa="sel" data-val="${x.act}"`).length===1,x.act+' is listed');
 assert.deepEqual(tags(html,'class="bgo"').map(t=>/data-act="([^"]+)"/.exec(t)[1]),['attack'],'Attack is selected by default and Confirm sends it');
 assert.equal(tags(html,'data-act="react"').length,0,'no defence can be sent on your own turn');
 assert.match(html,/When attacked:/,'the defences are still named, as a reminder');
 A.run(`PB.sel='brace'`);
 assert.match(A.run('pitsArenaDeckHtml()'),/class="bgo" data-act="brace"/);
});

test('the attack details show the d100 grade split from the engine bands',()=>{
 const info=A.run(`pbInfoHtml(pbCtx(),'act:attack')`);
 // 60%: critical 01-06, success 07-60, failure 61-98, fumble 99-00
 assert.match(info,/Critical<\/span><b>6%/);assert.match(info,/Success<\/span><b>54%/);
 assert.match(info,/Failure<\/span><b>38%/);assert.match(info,/Fumble<\/span><b>2%/);
});

test('when attacked: the defences are live, the actions fold to one line, and Confirm sends react',()=>{
 A.run(`S.turnIndex=0;S.pending={kind:'reaction',atk:'a',def:'b',attackRoll:{roll:11,grade:2,label:'SUCCESS'}};PB.key='';`);
 let html=A.run('pitsArenaDeckHtml()');
 for(const v of ['parry','evade','none'])assert(tags(html,`data-pa="def" data-val="${v}"`).length===1,v+' offered');
 assert.match(html,/Your turn:/,'actions fold to a reminder');
 assert.match(html,/class="bgo" disabled/,'nothing is sent before a defence is chosen');
 A.run(`PB.def='evade'`);html=A.run('pitsArenaDeckHtml()');
 assert.match(html,/class="bgo" data-act="react" data-val="evade"/);
 assert.equal(A.run('paModalHtml()'),'','no window over the arena');
});

test('defence odds against the roll already made (Evade 50% against an 11 Success)',()=>{
 // Critical 01-05 beats a Success: 5% you earn one. Success 06-50: equal grades, no effects: 45%.
 // Failure 51-98: they earn one, 48%. Fumble 99-00: they earn two, 2%. 50% get out of the way.
 const info=A.run(`pbInfoHtml(pbCtx(),'def:evade')`);
 assert.match(info,/<strong>50%<\/strong><span>chance to get out of the way/);
 assert.match(info,/You earn 1 Special Effect<\/span><b>5%/);
 assert.match(info,/No Special Effects either way<\/span><b>45%/);
 assert.match(info,/earns 1<\/span><b>48%/);assert.match(info,/earns 2<\/span><b>2%/);
});

test('resistance odds are counted with the engine opposed rule (worked by hand)',()=>{
 // Resisting at 50% against an 11 Success: they win on 01-05 (critical) and on successes above 11 (12-50).
 // 5 + 39 = 44 faces resist, so the effect works on 56.
 assert.equal(A.run(`pbResist(50,{roll:11,grade:2}).land`),56);
 // Against a critical 03: only a critical with a higher roll resists (04-05 at 50%): 98 faces land.
 assert.equal(A.run(`pbResist(50,{roll:3,grade:3}).land`),98);
 // Against a failure, any success resists: 50 faces at 50% (01-50), so 50 land.
 assert.equal(A.run(`pbResist(50,{roll:70,grade:1}).land`),50);
});

test('Special Effects are chosen in the middle, with odds on the right, and no window',()=>{
 A.run(`S.pending={kind:'effect',atk:'a',def:'b',owner:'a',other:'b',effectsLeft:1,chosen:[],reaction:'evade',
   attackRoll:{roll:11,grade:2,label:'SUCCESS'},defenseRoll:{roll:95,grade:1,label:'FAILURE'}};PB.key='';`);
 const ids=JSON.parse(A.run('JSON.stringify(availableEffects(S.pending).map(e=>e[0]))'));
 assert(ids.includes('trip'),'trip is offered here');
 let html=A.run('pitsArenaDeckHtml()');
 for(const id of ids)assert(tags(html,`data-pa="fx" data-val="${id}"`).length===1,id+' chip');
 assert.equal(tags(html,'data-act="effect"').length,0,'nothing sent until chosen');
 assert.match(html,/data-act="skipEffect"/);
 assert.equal(A.run('paModalHtml()'),'');
 A.run(`PB.fx='trip'`);html=A.run('pitsArenaDeckHtml()');
 assert.match(html,/class="bgo" data-act="effect" data-val="trip"/);
 // b resists a trip with its best of Brawn 40 / Evade 50: Evade 50 against the 11 Success lands on 56.
 const info=A.run(`pbInfoHtml(pbCtx(),'fx:trip')`);
 assert.match(info,/resists with <b>Evade 50%/);assert.match(info,/<strong>56%<\/strong><span>chance it works/);
 // Brawn 40 against the 11 Success: 01-04 critical and 12-40 resist (4+29=33), so 67 land.
 assert.match(info,/Brawn 40% → <b>67%<\/b>/);assert.match(info,/Evade 50% → <b>56%<\/b>/);
 // an effect with no roll says so; Force Failure makes a resisted effect certain
 assert.match(A.run(`pbInfoHtml(pbCtx(),'fx:press')`),/No roll/);
 A.run('S.pending.forceFailure=true');assert.match(A.run(`pbInfoHtml(pbCtx(),'fx:trip')`),/<strong>100%<\/strong>/);
});

test('Choose Location is picked on a body map in the middle',()=>{
 A.run(`S.pending.kind='location';delete S.pending.forceFailure;`);
 const html=A.run('pitsArenaDeckHtml()');
 assert.match(html,/class="bdo bloc"[\s\S]*data-act="pickloc" data-val="Head"/);
 assert.equal(A.run('paModalHtml()'),'');
 assert.match(A.run(`pbInfoHtml(pbCtx(),'loc:Chest')`),/hit points · armour/);
});

test('the exchange tracker follows the engine: defence, effects, location',()=>{
 const now=s=>A.run(`(()=>{${s};return pbStepNow(pbCtx());})()`);
 assert.equal(now(`S.pending.kind='reaction'`),'def');
 assert.equal(now(`S.pending.kind='effect'`),'fx');
 assert.equal(now(`S.pending.kind='location'`),'loc');
 assert.equal(now(`S.pending=null`),'act');
 assert.equal(A.run(`pbStepOf('Damage · Goat')`),'dmg');assert.equal(A.run(`pbStepOf('Parry · Goat')`),'def');
});

console.log(`${passed} passed`);
