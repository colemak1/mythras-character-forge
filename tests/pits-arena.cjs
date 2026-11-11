// The Pits arena screen (experiments/pits-arena.js) lays out what the engine
// already knows. Every button it draws must be one the engine handles, and it
// must change no rule, roll or choice.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function arena(search=''){
 const output={innerHTML:'',addEventListener(){}};
 const ctx={console,URLSearchParams,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search},
  sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
  document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
  window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
 vm.createContext(ctx);
 for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js','experiments/pits-game.js','experiments/pits-stage.js','experiments/pits-arena.js'])
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 const run=s=>vm.runInContext(s,ctx);
 run(`(()=>{startRun();R=null;V.busy=false;const a=S.fighters.a,b=S.fighters.b;
  for(const f of [a,b]){f.weapon='sword';f.shield='none';f.weaponGuard=null;ensureEffectState(f);f.ap=2;f.apMax=2;f.prone=false;f.disarmed=false;f.braced=false;f.stunnedLocations={};f.skipAttack=0;f.pressedTurns=0;f.overextendedTurns=0;}
  S.phase='fight';S.pending=null;S.order=['a','b'];S.turnIndex=0;S.disengaged=false;S.engagement='equal';S.tie=null;})()`);
 return {run,out:output};
}
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const A=arena();
test('the deck offers exactly the actions the engine allows, with the engine\'s own data-act',()=>{
 const html=A.run('pitsArenaDeckHtml()');
 const legal=JSON.parse(A.run(`JSON.stringify(pitsLegalActions('a'))`));
 for(const x of legal){
  const m=new RegExp(`<button[^>]*data-act="${x.act}"[^>]*>`).exec(html);
  assert(m,x.act+' is drawn');
  assert.equal(/\bdisabled\b/.test(m[0]),!x.enabled,`${x.act} enabled ${x.enabled}`);
 }
 assert.match(html,/Your turn/);assert.match(html,/Exchange breakdown/);assert.match(html,/Combat chronicle/);
});
test('actions are locked while it is not the player\'s turn, and say why when they are short of AP',()=>{
 A.run(`S.turnIndex=1`);
 let html=A.run('pitsArenaDeckHtml()');assert.match(html,/data-act="attack"[^>]*disabled/);
 A.run(`S.turnIndex=0;S.fighters.a.ap=0`);html=A.run('pitsArenaDeckHtml()');
 assert.match(html,/data-act="attack"[^>]*disabled[\s\S]*?Needs 1 AP/);
 A.run(`S.fighters.a.ap=2`);
});
test('plates show each fighter: HP and armour per body part, AP, conditions, and wounds colour the map',()=>{
 A.run(`S.fighters.b.hp.Chest-=3;S.fighters.b.hp['Right Leg']=0;S.fighters.b.hp['Left Arm']=-20;S.fighters.b.prone=true;S.fighters.b.ap=1`);
 const plate=A.run(`paPlateHtml('b')`);
 assert.match(plate,/plate foe/);assert.match(plate,/class="zone hurt"/,'minor wound');assert.match(plate,/class="zone serious"/,'serious wound');assert.match(plate,/class="zone major"/,'major wound');
 assert.match(plate,/Prone/);assert.match(plate,/Serious: Right Leg/);assert.match(plate,/Major: Left Arm/);
 assert.equal((plate.match(/class="pip on"/g)||[]).length,1,'1 AP left');
 assert.equal((plate.match(/<g class="zone/g)||[]).length,7,'seven body parts');
 assert.match(A.run(`paPlateHtml('a')`),/plate you/);
});
test('the strip names the round, whose turn it is and the range',()=>{
 const html=A.run('paStripHtml()');
 assert.match(html,/Round <b>1<\/b>/);assert.match(html,/Your turn/);assert.match(html,/Matched reach/);
});
test('the dice tray shows the manual roll with the Roll button, target and odds band',()=>{
 A.run(`R={id:1,actor:'a',defs:[{sides:100}],label:'Attack · Combat Style 60%',callback(){}}`);
 const html=A.run('paTrayHtml()');
 assert.match(html,/data-act="roll"/);assert.match(html,/Target <b>60%<\/b>/);assert.match(html,/pits-band/);assert.match(html,/Space/);
 A.run(`R={id:2,actor:'a',defs:[{sides:20}],label:'Hit location · d20',callback(){}}`);
 const loc=A.run('paTrayHtml()');assert.match(loc,/Roll d20/);assert.doesNotMatch(loc,/pits-band/,'no skill bar for a d20');
 A.run(`R=null`);
 assert.match(A.run('paTrayHtml()'),/Dice tray/,'idle tray before any roll');
});
test('Special Effects and Choose Location open as windows only for a person\'s own decision',()=>{
 A.run(`S.pending={kind:'effect',owner:'a',other:'b',atk:'a',def:'b',effectsLeft:1,attackRoll:{grade:3,roll:3,label:'CRITICAL'},reaction:'none',chosen:[],effectsOffered:1}`);
 let html=A.run('paModalHtml()');
 assert.match(html,/role="dialog"/);assert.match(html,/data-act="effect"/);assert.match(html,/Special Effects/);
 A.run(`S.pending={kind:'location',owner:'a',other:'b',atk:'a',def:'b',effectsLeft:0}`);
 html=A.run('paModalHtml()');
 assert.match(html,/Choose Location/);assert.equal((html.match(/data-act="pickloc"/g)||[]).length,7,'one button per body part');
 assert.match(html,/data-val="Right Arm"/);
 A.run(`S.pending={kind:'effect',owner:'b',other:'a',atk:'b',def:'a',effectsLeft:1}`);
 assert.equal(A.run('paModalHtml()'),'','the computer chooses its own effects');
 A.run(`S.pending=null`);assert.equal(A.run('paModalHtml()'),'');
});
test('a reaction is answered in the deck prompt with the engine\'s own parry / evade / take it buttons',()=>{
 A.run(`S.pending={kind:'reaction',atk:'b',def:'a',attackTarget:50,attackRoll:{roll:30,grade:2,label:'SUCCESS'},reaction:'none',defenseRoll:null,owner:null,other:null,effectsLeft:0,chosen:[],chosenLoc:null,maximize:0,evaded:false}`);
 const html=A.run('pitsArenaDeckHtml()');
 assert.match(html,/data-act="react"[^>]*data-val="parry"/);assert.match(html,/data-act="react"[^>]*data-val="evade"/);
 A.run(`S.pending=null`);
});
test('the old layout is one flag away (?layout=classic), and the engine still draws it',()=>{
 const c=arena('?layout=classic');
 assert.equal(c.run('pitsArenaOn()'),false);
 c.run('render()');assert.match(c.out.innerHTML,/class="arena"/,'classic arena markup');
 const n=arena();n.run('render()');assert.match(n.out.innerHTML,/class="deck"/,'new deck markup');assert.doesNotMatch(n.out.innerHTML,/class="arena"/);
});
test('the arena reads only: it draws buttons for the engine and never rolls or edits state',()=>{
 const src=fs.readFileSync(path.join(root,'experiments/pits-arena.js'),'utf8').replace(/\/\/.*$/gm,'');
 assert.doesNotMatch(src,/Math\.random|\bd100\(|\brollSkill\(|\brequestSkill\(|\bresolveDice\(|\blog\(|\.hp\[[^\]]+\]\s*[-+]?=[^=]|\.ap\s*[-+]?=[^=]|S\.pending\s*=[^=]/);
 const before=A.run('JSON.stringify({f:S.fighters,p:S.pending,t:S.turnIndex})');
 A.run('pitsArenaDeckHtml();paPlateHtml("a");paPlateHtml("b");paStripHtml();paTrayHtml();paModalHtml()');
 assert.equal(A.run('JSON.stringify({f:S.fighters,p:S.pending,t:S.turnIndex})'),before);
});
console.log(passed+' pits arena tests passed');
