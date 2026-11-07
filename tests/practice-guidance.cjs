'use strict';
// Verify decision context, displayed targets, retained legal choices and the
// source-verified shield ward transition through the real arena runtime.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),saved=new Map();
function arena(){
 const handlers={},output={innerHTML:'',addEventListener(type,fn){handlers[type]=fn;}};
 const context={console,URLSearchParams,setTimeout,clearTimeout,setInterval,clearInterval,
  localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,String(v))},
  document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
  window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}},alert(){}};
 vm.createContext(context);
 const page=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8');
 vm.runInContext(fs.readFileSync(path.join(root,'js/data.js'),'utf8'),context); // the arena loads ../js/data.js first
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-guidance.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'experiments/pits-view.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'experiments/pits-ranged.js'),'utf8')+'\n'+page.match(/<script>([\s\S]*?)<\/script>/)[1],context);
 const run=s=>vm.runInContext(s,context);
 return {handlers,run,html:()=>output.innerHTML,fresh(){run(`startRun();R=null;V.busy=false;S.phase='fight';S.order=['a','b'];S.turnIndex=0;S.pending=null;V.events=[];render();`);}};
}
const a=arena();let passed=0;
function check(name,fn){a.fresh();fn();passed++;console.log('PASS '+name);}
function click(act){a.handlers.click({target:{closest:()=>({dataset:{act}})}});}
check('A normal turn exposes both pressure and conserving a reaction without opening More actions',()=>{
 const main=a.html().split('<details class="secondary-actions"')[0];
 assert.match(main,/data-act="attack"/);assert.match(main,/data-act="delay"/);
 assert.match(main,/Hold an AP for a reaction/);assert(!main.includes('data-act="continue"'));
});
check('Guidance and choice descriptions are visible without hover; the duplicate hover helper is absent',()=>{
 assert.match(a.html(),/class="combat-guide"/);assert.match(a.html(),/<small>[^<]+attack target/);
 assert(!a.html().includes('id="choiceHelp"'));assert.equal(a.handlers.pointerover,undefined);
});
check('Normal roll prompts avoid duplicate teaching text while Tutorial keeps its roll explanation',()=>{
 a.run(`R={id:22,actor:'a',label:'Parry · 67%',defs:[{sides:100,label:'d100'}]};render()`);
 assert(!a.html().includes('class="combat-guide"'));assert.match(a.html(),/data-act="roll"/);
 a.run(`S.mode='tutorial';render()`);assert.match(a.html(),/class="tutorial-guide"/);
});
check('A miss explains the reason to parry and the alternative of keeping AP',()=>{
 a.run(`S.pending={kind:'reaction',atk:'b',def:'a',attackRoll:{grade:1,roll:82,label:'FAILURE'}};render()`);
 assert.match(a.html(),/Why respond to a miss/);assert.match(a.html(),/defensive Special Effects/);assert.match(a.html(),/keep your Action Point/);
});
check('Weapon and shield parries explain different Size outcomes against the same incoming weapon',()=>{
 a.run(`S.fighters.b.weapon='greatsword';S.fighters.a.weapon='dagger';S.fighters.a.shield='heater';S.pending={kind:'reaction',atk:'b',def:'a',attackRoll:{grade:2,roll:32,label:'SUCCESS'}};render()`);
 const html=a.html();assert.match(html,/no damage blocked on a successful parry/);assert.match(html,/half damage blocked on a successful parry/);
 assert.match(html,/Evade target. Try to avoid the attack; you finish prone/);
});
check('Shown attack and defense targets include existing fatigue penalties',()=>{
 a.run('S.fighters.a.fatigue=4;render()');
 const target=a.run('effectiveSkill(S.fighters.a,combatTarget(S.fighters.a))');assert.match(a.html(),new RegExp(target+'% attack target'));
 a.run(`S.pending={kind:'reaction',atk:'b',def:'a',attackRoll:{grade:2,roll:22,label:'SUCCESS'}};render()`);
 assert.match(a.html(),new RegExp(target+'% parry target'));
});
check('No-AP defense choices are disabled and explain why',()=>{
 a.run(`S.fighters.a.ap=0;S.pending={kind:'reaction',atk:'b',def:'a',attackRoll:{grade:2,roll:22,label:'SUCCESS'}};render()`);
 assert.match(a.html(),/data-val="parry" disabled/);assert.match(a.html(),/No Action Points remaining/);assert.match(a.html(),/No Action Points left/);
});
check('An existing shield ward permits an active shield parry and is released when selected',()=>{
 a.run(`S.fighters.a.shield='heater';S.fighters.a.warded=['Head','Chest'];S.pending={kind:'reaction',atk:'b',def:'a',chosen:[],attackRoll:{grade:2,roll:22,label:'SUCCESS'}};render()`);
 assert.match(a.html(),/releases your ward/);assert.equal(a.run('canShieldParry(S.fighters.a)'),true);
 const ap=a.run('S.fighters.a.ap');a.run(`react('shield')`);
 assert.equal(a.run('S.fighters.a.warded.length'),0);assert.equal(a.run('S.fighters.a.ap'),ap-1);assert.match(a.run('R.label'),/^Parry/);
});
check('A weapon parry keeps the separate shield ward intact',()=>{
 a.run(`S.fighters.a.shield='heater';S.fighters.a.warded=['Head'];S.pending={kind:'reaction',atk:'b',def:'a',chosen:[],attackRoll:{grade:2,roll:22,label:'SUCCESS'}};react('parry')`);
 assert.equal(a.run('S.fighters.a.warded[0]'),'Head');
});
check('Guidance toggle changes no combat state, AP, pending roll or presentation pace and persists',()=>{
 const before=a.run('JSON.stringify(S)'),pace=a.run('V.quick');click('guidance');
 assert.equal(a.run('JSON.stringify(S)'),before);assert.equal(a.run('R'),null);assert.equal(a.run('V.quick'),pace);
 assert(!a.html().includes('class="combat-guide"'));assert.equal(saved.get('sitota-practice-guidance-v1'),'off');
 const next=arena();assert.equal(next.run('V.guidance'),false);click('guidance');
});
check('Tutorial always keeps guidance enabled even if ordinary guidance was turned off',()=>{
 a.run(`S.mode='tutorial';V.guidance=false;render()`);const before=a.run('JSON.stringify(S)');click('guidance');
 assert.match(a.html(),/class="tutorial-guide"/);assert.equal(a.run('JSON.stringify(S)'),before);a.run('V.guidance=true');
});
check('Every legal Special Effect remains available once after grouping, without spending resources',()=>{
 a.run(`S.pending={kind:'effect',owner:'a',other:'b',atk:'a',def:'b',chosen:[],effectsLeft:2,attackRoll:{grade:3},defenseRoll:{grade:1},reaction:'parry'};`);
 const before=a.run('JSON.stringify(S)');
 const legal=Array.from(a.run('availableEffects(S.pending).map(x=>x[0])')).sort();
 const html=a.run('effectChoicesHtml(S.pending)');const shown=[...html.matchAll(/data-act="effect" data-val="([^"]+)"/g)].map(m=>m[1]).sort();
 assert.deepEqual(shown,legal);assert.equal(a.run('JSON.stringify(S)'),before);assert.match(html,/Control the opponent/);assert.match(html,/Damage and protection/);
});
check('The last AP and reach disadvantage produce different practical context',()=>{
 a.run('S.fighters.a.ap=1;render()');assert.match(a.html(),/Your last Action Point/);
 a.run(`S.fighters.a.weapon='dagger';S.fighters.b.weapon='greatsword';S.engagement='long';render()`);
 assert.match(a.html(),/Their weapon keeps you out/);const main=a.html().split('<details class="secondary-actions"')[0];assert.match(main,/data-act="changeRange"/);
});
check('A disabled attack names the actual restriction instead of a generic condition',()=>{
 a.run('S.fighters.a.pressedTurns=1;render()');assert.match(a.html(),/Press Advantage prevents attacking/);
 a.run('S.fighters.a.pressedTurns=0;S.fighters.a.overextendedTurns=1;render()');assert.match(a.html(),/Overextend Opponent prevents attacking/);
});
console.log(passed+' tactical-guidance integration checks passed');
