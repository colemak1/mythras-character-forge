'use strict';
// Run: node tests/practice-combat-ux.cjs
// Presentation-only regression tests. No browser, network, or external packages.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const page = fs.readFileSync(path.join(__dirname, '../experiments/practice-combat.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../experiments/practice-combat-ux.css'), 'utf8');
const match = page.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, 'Practice Combat inline runtime exists');
assert.match(page, /practice-combat-ux\.css\?v=9/, 'UX stylesheet is linked');
assert.match(css, /\.decision-panel \.primary-actions/, 'Primary-action CSS exists');

const handlers = {};
const root = { innerHTML: '', addEventListener(type, callback) { handlers[type] = callback; } };
const home = { addEventListener() {} };
const document = {
  querySelector(selector) {
    if (selector === '#root') return root;
    if (selector === '#homeLink') return home;
    return null;
  },
  querySelectorAll() { return []; },
  getElementById() { return null; },
};
const sandbox = {
  document,
  window: {
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: () => {},
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  alert() {},
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
};
const api = vm.runInNewContext(match[1] +
  '\n;({startRun, render, state: () => S, resetRoll: () => { R = null; V.busy = false; }, setRoll: value => { R = value; }, availableEffects})',
  sandbox, { filename: 'practice-combat-inline.js' });

function check(name, predicate) {
  assert.ok(predicate, name);
  console.log('PASS', name);
}
check('Setup keeps a start action and optional customization',
  root.innerHTML.includes('data-act="start"') &&
  root.innerHTML.includes('class="fighter-customize"'));
check('Mode choices include accessible pressed state',
  root.innerHTML.includes('aria-pressed="true"'));

api.startRun();
check('Initiative requires a player roll',
  root.innerHTML.includes('data-act="roll"') &&
  root.innerHTML.includes('data-combatant="a"') &&
  root.innerHTML.includes('data-combatant="b"'));

api.resetRoll();
const state = api.state();
state.pending = null;
state.order = ['a', 'b'];
state.turnIndex = 0;
api.render();
check('Normal turn has primary Attack and More actions',
  root.innerHTML.includes('class="choicegrid primary-actions"') &&
  root.innerHTML.includes('data-act="attack"') &&
  root.innerHTML.includes('class="secondary-actions"'));
for (const action of ['attack', 'changeRange', 'brace', 'dither', 'stand', 'yield', 'help']) {
  check('Normal-turn action preserved: ' + action,
    root.innerHTML.includes('data-act="' + action + '"'));
}
check('Keyboard-accessible hit location buttons on both fighters',
  (root.innerHTML.match(/<button type="button" class="loc/g) || []).length === 14);
check('Player lane stays to the left of opponent lane',
  root.innerHTML.indexOf('data-combatant="a"') <
  root.innerHTML.indexOf('data-combatant="b"'));

state.pending = { kind: 'reaction', atk: 'b', def: 'a',
  attackRoll: { label: 'SUCCESS', grade: 2, roll: 25 } };
api.render();
check('Reactions stay fully visible',
  root.innerHTML.includes('data-act="react"') &&
  !root.innerHTML.includes('class="secondary-actions"'));

state.pending = { kind: 'effect', atk: 'a', def: 'b', owner: 'a', other: 'b',
  attackRoll: { label: 'SUCCESS', grade: 2, roll: 25 },
  defenseRoll: { label: 'FAILURE', grade: 1, roll: 77 },
  effectsLeft: 1, chosen: [] };
const available = api.availableEffects(state.pending).length;
api.render();
check('Every legal Special Effect stays visible',
  available > 0 &&
  (root.innerHTML.match(/data-act="effect"/g) || []).length === available);

state.pending = { kind: 'location', atk: 'a', def: 'b', owner: 'a', other: 'b' };
api.render();
check('Hit location choice still available', root.innerHTML.includes('data-act="pickloc"'));

state.phase = 'between';
state.wins = 1;
state.winner = 'Test fighter';
api.render();
check('Next opponent button survives end-of-bout transition',
  root.innerHTML.includes('data-act="next"'));


/* Pass 03: consequences and finishing-blow recap remain tied to wound state. */
state.phase = 'fight';
state.pending = null;
state.showEndModal = false;
state.fighters.a.hp['Right Arm'] = 0;
state.fighters.a.lastDamage = { loc: 'Right Arm', wound: 4 };
const presentation = sandbox.window.prototypeCombat.presentation();
presentation.busy = true;
presentation.highlight = { id: 'a', loc: 'Right Arm' };
presentation.stage = { kind: 'hurt', loc: 'Right Arm', target: 'a',
  entry: { title: 'Opponent hits Right Arm', body: '= 4 HP lost', kind: 'hurt',
    view: { a: state.fighters.a, b: state.fighters.b } },
  result: '-4 HP', rolling: false };
api.render();
check('Serious arm wound is visible beside the fighter',
  root.innerHTML.includes('class="injury-summary serious"') &&
  root.innerHTML.includes('Right Arm · Serious wound'));
check('Damage callout identifies actual hit location and HP lost',
  root.innerHTML.includes('class="injury-impact"') &&
  root.innerHTML.includes('4 HP lost'));
check('Outcome strip names hit location and wound severity',
  root.innerHTML.includes('Right Arm · -4 HP') &&
  root.innerHTML.includes('Serious wound'));

presentation.stage = { kind: 'location', loc: 'Right Arm', target: 'a',
  entry: { title: 'Hit Location', body: '', kind: 'system' } };
api.render();
check('Hit-location roll does not replay old damage callout',
  !root.innerHTML.includes('class="injury-impact"'));

presentation.stage = null;
presentation.highlight = null;
presentation.busy = false;
state.phase = 'over';
state.pending = null;
state.winnerId = 'a';
state.winner = state.fighters.a.name;
state.round = 3;
state.showEndModal = true;
state.finalCause = { type:'injury', location:'Right Arm', severity:'serious',
  hpLost:4, remaining:0, maxHp:4, victim:state.fighters.b.name,
  consequence:'Incapacitated' };
api.render();
check('Finishing injury recap highlights correct body location',
  root.innerHTML.includes('class="finish-location-figure"') &&
  root.innerHTML.includes('Finishing wound at Right Arm'));
check('Recap includes concrete injury and bout round',
  root.innerHTML.includes('Serious wound · Right Arm') &&
  root.innerHTML.includes('Encounter ended in round 3'));
state.finalCause = { type:'concession', victim:state.fighters.b.name };
api.render();
check('Concession recap has no invented injury diagram',
  root.innerHTML.includes('Concession') &&
  !root.innerHTML.includes('finish-location-figure'));
state.winnerId = 'b';
state.winner = state.fighters.b.name;
api.render();
check('Defeat retains appropriate result heading',
  root.innerHTML.includes('>DEFEAT</h2>'));


/* Pass 04: anatomical regions, exact engine-derived roll bands, and inspection. */
state.phase = 'fight';
state.pending = null;
presentation.busy = false;
presentation.stage = null;
presentation.highlight = null;
state.fighters.a.hp['Right Arm'] = 0;
state.fighters.a.armourLocations['Right Arm'] = 1;
state.sel = {a:'Right Arm'};
api.render();
check('New anatomical chart appears on both combatants',
  (root.innerHTML.match(/class="anatomy-chart"/g) || []).length===2 &&
  root.innerHTML.includes('class="anatomy-plate"'));
check('Anatomy has seven keyboard accessible targets per fighter',
  (root.innerHTML.match(/role="button"/g) || []).length===14 &&
  (root.innerHTML.match(/tabindex="0"/g) || []).length===14);
check('D20 ranges derived from the actual hit table',
  ['01–03','04–06','07–09','10–12','13–15','16–18','19–20'].every(x=>
    root.innerHTML.includes(x)));
check('Selected limb reveals actual local armour, not global approximation',
  root.innerHTML.includes('class="location-inspector"') &&
  root.innerHTML.includes('Armour <strong>1 AP</strong>'));
check('Injured regions include persistent wound markers',
  root.innerHTML.includes('class="anatomy-wound-mark serious"'));
check('Injured region HP gauge is empty at zero HP',
  /class="loc serious wounded sel"[\s\S]*?data-val="Right Arm"[\s\S]*?style="width:0%"/.test(root.innerHTML));
check('New fighter dossier clearly labels weapon and Combat Style',
  root.innerHTML.includes('class="fighter-profile"') &&
  root.innerHTML.includes('class="profile-weapon"') &&
  root.innerHTML.includes('class="profile-skill"'));


/* The anatomy must also work with a keyboard, not only with a mouse. */
let prevented = false;
const fakeSvgZone = {
  tagName:'g',dataset:{act:'selectloc',id:'a',val:'Left Arm'},
  classList:{contains(name){return name==='zone';}},
  closest(query){return query==='g.zone[data-act="selectloc"]'||query==='[data-act]'?this:null;}
};
handlers.keydown({target:fakeSvgZone,key:'Enter',preventDefault(){prevented=true;}});
check('Enter selects an SVG hit location without submitting a page action',
  prevented && state.sel.a==='Left Arm');
check('Keyboard-selected location is marked as pressed in the diagram',
  root.innerHTML.includes('data-val="Left Arm" tabindex="0" role="button"') &&
  root.innerHTML.includes('aria-pressed="true"'));


/* UX pass 05: readable logs, full calculations and context-sensitive help. */
state.phase='fight';
state.pending=null;
state.mode='normal';
state.showEndModal=false;
state.logs=[
  {id:1001,title:'Encounter 1 · Initiative',body:'Two combatants roll initiative.',kind:'system',detail:'Core p.90'},
  {id:1002,title:'Kethan attacks',body:'Roll 23 against Combat Style 67% — SUCCESS.',kind:'hit',detail:'Attack check'},
  {id:1003,title:'Hit Location',body:'Kethan rolls 16 (d20): Left Arm.',kind:'system',meta:{location:'Left Arm',roll:16}},
  {id:1004,title:'Kethan hits Right Arm',body:'Broadsword +2 = 4 HP lost. Armour absorbed 1.',kind:'hurt',detail:'Damage and armour'}
];
presentation.busy=false;
presentation.visibleCount=Infinity;
presentation.stage=null;
presentation.highlight=null;
presentation.showLog=false;
api.resetRoll();
api.render();
check('Combat chronicle shows the three latest events by default',
  (root.innerHTML.match(/class="chronicle-entry /g)||[]).length===3 &&
  root.innerHTML.includes('Combat chronicle'));
check('Hit narration uses actor, body location and actual HP loss',
  root.innerHTML.includes('Kethan strikes Right Arm') &&
  root.innerHTML.includes('4 HP lost'));
check('Original calculations remain inside expandable entries',
  root.innerHTML.includes('<details class="chronicle-entry') &&
  root.innerHTML.includes('Armour absorbed 1.') &&
  root.innerHTML.includes('Recorded result'));
check('Chronicle includes sourced hit-location rolls',
  root.innerHTML.includes('Left Arm · d20 16'));
presentation.showLog=true;
api.render();
check('Full history includes every recorded event',
  (root.innerHTML.match(/class="chronicle-entry /g)||[]).length===4);
check('Expanded detail is preserved after a state re-render',(()=>{
  handlers.toggle({target:{classList:{contains:k=>k==='chronicle-entry'},dataset:{logId:'1004'},open:true}});
  api.render();
  return /data-log-id="1004" open/.test(root.innerHTML);
})());
presentation.busy=true;
presentation.visibleCount=2;
api.render();
check('Chronicle does not reveal unreleased future events during playback',
  (root.innerHTML.match(/class="chronicle-entry /g)||[]).length===2 &&
  !root.innerHTML.includes('Kethan strikes Right Arm'));
presentation.busy=false;
presentation.visibleCount=Infinity;
presentation.showLog=false;
state.logs=[];
state.mode='tutorial';
state.pending={kind:'reaction',atk:'b',def:'a',attackRoll:{label:'SUCCESS',grade:2,roll:32}};
api.render();
check('Guided Tutorial explains the current defensive decision',
  root.innerHTML.includes('Defend against the attack') &&
  root.innerHTML.includes('class="tutorial-guide-details"') &&
  root.innerHTML.includes('data-act="react"'));
check('Old duplicate tutorial tip has been removed',
  !root.innerHTML.includes('class="tutorial-why"'));
state.pending=null;
api.setRoll({id:99,actor:'a',label:'Hit Location · d20',defs:[{sides:20,label:'Location'}]});
api.render();
check('Roll-time guidance explains the d20 without moving the roll prompt',
  root.innerHTML.includes('Find the hit location') &&
  root.innerHTML.includes('data-act="roll"') &&
  root.innerHTML.indexOf('data-combatant="a"') < root.innerHTML.indexOf('data-combatant="b"'));
api.resetRoll();
state.mode='normal';
api.render();
check('Normal mode stays free of tutorial prompts',
  !root.innerHTML.includes('class="tutorial-guide"'));


/* Pass 05: focus updates the existing tutorial copy, without adding a panel. */
const tutorialCopy={textContent:'Default prompt'};
const originalQuery=document.querySelector;
document.querySelector=selector=>
  selector==='.decision-panel .tutorial-guide-main span'?tutorialCopy:originalQuery(selector);
handlers.focusin({target:{closest(selector){
  return selector==='.decision-panel button.choice'?
    {dataset:{help:'A parry can absorb damage'},textContent:'Parry'}:null;
}}});
check('Tutorial choice focus replaces the hint in the existing guidance line',
  tutorialCopy.textContent==='A parry can absorb damage');
document.querySelector=originalQuery;


/* UX pass 06: newest-first chronology and faster, stable combat navigation. */
state.mode='normal';
state.phase='fight';
state.pending=null;
state.logs=[
 {id:2101,title:'First event',body:'Oldest entry',kind:'system'},
 {id:2102,title:'Second event',body:'Middle entry',kind:'system'},
 {id:2103,title:'Third event',body:'Later entry',kind:'system'},
 {id:2104,title:'Fourth event',body:'Newest entry',kind:'system'}
];
presentation.busy=false;
presentation.visibleCount=Infinity;
presentation.stage=null;
presentation.highlight=null;
presentation.showLog=false;
api.resetRoll();
api.render();
check('Default chronicle puts the most recent event first',
  root.innerHTML.indexOf('data-log-id="2104"') <
  root.innerHTML.indexOf('data-log-id="2103"'));
check('Preview shows only three newest events',
  !root.innerHTML.includes('data-log-id="2101"') &&
  (root.innerHTML.match(/class="chronicle-entry /g)||[]).length===3);
presentation.showLog=true;
api.render();
check('Full history stays reverse chronological',
  ['2104','2103','2102','2101'].map(id=>root.innerHTML.indexOf('data-log-id="'+id+'"'))
    .every((position,i,all)=>position>=0&&(i===0||position>all[i-1])));
presentation.busy=true;
presentation.visibleCount=2;
api.render();
check('Reverse chronological playback does not reveal future events',
  root.innerHTML.indexOf('data-log-id="2102"') <
  root.innerHTML.indexOf('data-log-id="2101"') &&
  !root.innerHTML.includes('data-log-id="2103"'));
presentation.busy=false;
presentation.visibleCount=Infinity;
presentation.showLog=false;

check('Detailed presentation is the default',presentation.quick===false);
api.render();
check('Detailed presentation has a labelled toggle',
  root.innerHTML.includes('DETAILED · PACE') &&
  root.innerHTML.includes('aria-label="Toggle combat presentation pace"'));
handlers.click({target:{closest(sel){return sel==='[data-act]'?{dataset:{act:'speed'}}:null;}}});
check('Pace can be switched to Quick without changing combat state',
  presentation.quick===true && root.innerHTML.includes('QUICK · PACE') &&
  state.phase==='fight');
handlers.click({target:{closest(sel){return sel==='[data-act]'?{dataset:{act:'speed'}}:null;}}});
check('Pace can be returned to Detailed',
  presentation.quick===false && root.innerHTML.includes('DETAILED · PACE'));
presentation.busy=true;
presentation.events=[state.logs[0],state.logs[1]];
handlers.click({target:{closest(sel){return sel==='[data-act]'?{dataset:{act:'speed'}}:null;}}});
check('Switching to Quick while events play skips the remaining delay',
  presentation.quick===true&&!presentation.busy);

state.pending=null;
state.order=['a','b'];
state.turnIndex=0;
api.render();
check('Normal-turn primary action still available',
  root.innerHTML.includes('class="choicegrid primary-actions"'));
handlers.toggle({target:{classList:{contains:k=>k==='secondary-actions'},open:true}});
api.render();
check('More actions stays expanded after a full screen refresh',
  presentation.moreActionsOpen===true &&
  root.innerHTML.includes('class="secondary-actions" open'));

state.mode='tutorial';
state.pending={kind:'reaction',atk:'b',def:'a',attackRoll:{grade:2,roll:21,label:'SUCCESS'}};
handlers.toggle({target:{classList:{contains:k=>k==='tutorial-guide-details'},open:true}});
api.render();
check('The expanded Why explanation survives a screen refresh',
  presentation.guideWhyOpen===true &&
  root.innerHTML.includes('class="tutorial-guide-details" open'));
check('Reaction screen says exactly what to do',
  root.innerHTML.includes('Choose your defense') &&
  root.innerHTML.includes('data-act="react"'));

state.pending=null;
state.mode='normal';
const savedQuery=document.querySelector;
const savedRAF=sandbox.window.requestAnimationFrame;
const button={focused:false,scrolled:false,focus(){this.focused=true;},
  getBoundingClientRect(){return {top:1200,bottom:1250};},
  scrollIntoView(){this.scrolled=true;}};
document.querySelector=selector=>selector.startsWith('.roll-await .roll-now,')?button:savedQuery(selector);
sandbox.window.requestAnimationFrame=callback=>callback();
sandbox.window.innerHeight=800;
api.setRoll({id:3041,actor:'a',label:'Manual d20 roll',defs:[{sides:20,label:'Hit location'}]});
api.render();
check('Next required roll gets focus and scrolls into view only when offscreen',
  button.focused && button.scrolled);
button.focused=false;button.scrolled=false;
button.getBoundingClientRect=()=>({top:180,bottom:240});
api.setRoll({id:3042,actor:'a',label:'Another manual d20 roll',defs:[{sides:20,label:'Hit location'}]});
api.render();
check('A visible roll is focused without scrolling the page',
  button.focused && !button.scrolled);
document.querySelector=savedQuery;
sandbox.window.requestAnimationFrame=savedRAF;
api.resetRoll();


/* Pass 06: the same round number in a new encounter still gets keyboard focus. */
state.phase='fight';
state.pending=null;
state.wave=41;
state.round=1;
state.cycle=1;
state.turnIndex=0;
let focusCount=0;
const originalQuery6=document.querySelector;
const originalRAF6=sandbox.window.requestAnimationFrame;
const focusTarget={focus(){focusCount++;},getBoundingClientRect(){return {top:200,bottom:260};},
  scrollIntoView(){throw new Error('Visible button should never scroll');}};
document.querySelector=selector=>selector.startsWith('.roll-await .roll-now,')?focusTarget:originalQuery6(selector);
sandbox.window.requestAnimationFrame=callback=>callback();
api.render();
const focusBeforeNextWave=focusCount;
state.wave=42;
api.render();
check('New encounter refocuses the decision even if round and turn repeat',
  focusBeforeNextWave>0&&focusCount===focusBeforeNextWave+1);
document.querySelector=originalQuery6;
sandbox.window.requestAnimationFrame=originalRAF6;
presentation.busy=true;
presentation.stage={kind:'hit',primary:'ATTACK',entry:state.logs[0],rolling:false};
api.render();
check('Playback exposes a direct Show results control',
  root.innerHTML.includes('data-act="skip"') &&
  root.innerHTML.includes('Show results'));
presentation.busy=false;
presentation.stage=null;


/* UX pass 07: resolve a whole exchange in place; never require the chronicle. */
const recapActor=state.fighters.a.name,recapTarget=state.fighters.b.name;
const eAttack={id:3301,title:recapActor+' attacks',body:'23 against Combat Style 67% — SUCCESS.',
  kind:'system',meta:{actor:'a'}};
const eDefense={id:3302,title:recapTarget+' parries',body:'48 vs 63% — SUCCESS. 2 AP remaining.',
  kind:'system',meta:{actor:'b'}};
const eAdvantage={id:3303,title:'Offensive Special Effects',body:recapActor+' gains 1 Special Effect.',kind:'hit'};
const eEffect={id:3304,title:'Bleed',body:'Bleeding is tested after penetrating damage.',kind:'hit'};
const eLocation={id:3305,title:'Hit Location',body:recapActor+' rolls 13 (d20): Right Arm.',
  kind:'system',meta:{actor:'a',target:'b',location:'Right Arm',roll:13}};
state.fighters.b.hp['Right Arm']=0;
const eHit={id:3306,title:recapActor+' hits Right Arm',
 body:'7 weapon (7) +0 (0) = 7 total; 2 parry; 1 armour; 4 HP lost.',
 kind:'hurt',view:JSON.parse(JSON.stringify(state.fighters)),meta:{actor:'a'}};
const eDisabled={id:3307,title:'Limb Disabled',body:recapTarget+"'s Right Arm becomes unusable.",kind:'hurt'};
state.phase='fight';state.mode='normal';state.pending=null;state.wave=3;
state.order=['a','b'];state.turnIndex=0;
state.logs=[{id:3300,title:'Encounter 3 · Initiative',body:'Rolls completed.',kind:'system'}];
presentation.busy=false;presentation.visibleCount=Infinity;
presentation.showLog=false;presentation.stage=null;presentation.highlight=null;
api.resetRoll();api.render();
check('Before an attack there is no invented exchange result',
  !root.innerHTML.includes('class="exchange-recap'));

state.logs.push(eAttack);
api.render();
check('After an attack the recap clearly shows its roll and awaits defense',
  root.innerHTML.includes('class="exchange-recap progress"') &&
  root.innerHTML.includes('23 / 67% · Success') &&
  root.innerHTML.includes('Awaiting response'));
check('Recap appears directly beneath the combatant dice before the next action',
  root.innerHTML.indexOf('class="exchange-board"') <
  root.innerHTML.indexOf('class="exchange-recap') &&
  root.innerHTML.indexOf('class="exchange-recap') <
  root.innerHTML.indexOf('class="decision-panel'));

state.pending={kind:'reaction',atk:'a',def:'b',attackRoll:{grade:2,label:'SUCCESS',roll:23}};
api.render();
check('An unresolved attack tells the player to choose a defense',
  root.innerHTML.includes('Choose a defense'));
state.pending=null;
state.logs.push(eDefense,eAdvantage,eEffect,eLocation,eHit,eDisabled);
api.render();
check('Complete exchange recap explains the attacker and hit body part',
  root.innerHTML.includes('strikes the Right Arm · 4 HP lost') &&
  root.innerHTML.includes('class="exchange-recap injury"'));
check('Recap shows attack, parry, Special Effect and hit together',
  root.innerHTML.includes('23 / 67% · Success') &&
  root.innerHTML.includes('Parry · 48 / 63% · Success') &&
  root.innerHTML.includes('Bleed') &&
  root.innerHTML.includes('Right Arm · 4 HP'));
check('Damage calculation is visible without opening the chronicle',
  root.innerHTML.includes('7 damage − 2 parry − 1 armour = 4 HP lost'));
check('Engine-recorded wound consequence is visible in the recap',
  root.innerHTML.includes('Serious wound · Limb disabled'));
check('Recap is derived from the same newest combat events as the chronicle',
  root.innerHTML.includes('data-log-id="3307"'));

presentation.busy=true;presentation.visibleCount=2;
api.render();
check('Playback summary hides unrevealed wound and effect results',
  root.innerHTML.includes('class="exchange-recap progress"') &&
  root.innerHTML.includes('Awaiting response') &&
  !root.innerHTML.includes('7 damage − 2 parry − 1 armour = 4 HP lost') &&
  !root.innerHTML.includes('strikes the Right Arm · 4 HP lost'));
check('Recap keeps an explicit Show results option during detailed playback',
  root.innerHTML.includes('class="recap-toolbar"') &&
  root.innerHTML.includes('data-act="skip"'));
presentation.busy=false;presentation.visibleCount=Infinity;
state.logs=[eAttack,{id:3311,title:recapTarget+' does not defend',
  body:recapTarget+' preserves Action Points.',kind:'system'},
  {id:3312,title:'No Damaging Hit',body:recapActor+"'s attack failed to connect.",kind:'system'}];
api.render();
check('Undefended miss is explained without incorrectly claiming damage',
  root.innerHTML.includes('strike misses') &&
  root.innerHTML.includes('Not defended') &&
  root.innerHTML.includes('No HP lost'));

const eBlocked={...eHit,id:3313,body:'4 weapon (4) +0 (0) = 4 total; 2 parry; 2 armour; 0 HP lost.'};
state.logs=[eAttack,eDefense,eBlocked];
api.render();
check('Armour/parry absorbing everything shows zero actual HP loss',
  root.innerHTML.includes('strikes the Right Arm · no HP lost') &&
  root.innerHTML.includes('4 damage − 2 parry − 2 armour = 0 HP lost') &&
  root.innerHTML.includes('class="exchange-recap blocked"'));

state.logs=[eAttack,eHit,{id:3320,title:'New Opponent',
  body:'New foe enters.',kind:'system'}];
api.render();
check('New opponent does not inherit previous encounter recap',
  !root.innerHTML.includes('class="exchange-recap'));
state.logs.push({id:3321,title:'Encounter 4 · Initiative',
  body:'Initiative completed.',kind:'system'});
api.render();
check('Initiative of next encounter stays free of stale damage',
  !root.innerHTML.includes('strikes the Right Arm · 4 HP lost'));


/* UX pass 07: consequence wording reflects the result, not just the roll type. */
const eBleedResist={id:3351,title:'Bleed',body:recapTarget+' Endurance 17: the bleed is avoided.',kind:'hurt'};
const eBleedStart={id:3352,title:'Bleed',body:recapTarget+' Endurance 98: bleeding begins; lose one Fatigue level.',kind:'hurt'};
const eStunResist={id:3353,title:'Stun Location',body:recapTarget+' resists the stun.',kind:'hurt'};
const eStunApplied={id:3354,title:'Stun Location',body:recapTarget+"'s Right Arm is stunned for 2 turns.",kind:'hurt'};
const eBash={id:3355,title:'Bash',body:recapActor+' knocks '+recapTarget+' 3m back. Knockback: 3m.',kind:'hit'};
state.logs=[eAttack,eHit,eBleedResist,eStunResist];
api.render();
check('Resisted bleed and stun are reported as resisted',
  root.innerHTML.includes('Bleed resisted')&&root.innerHTML.includes('Stun resisted'));
state.logs=[eAttack,eHit,eBleedStart,eStunApplied];
api.render();
check('Applied bleed and stun are reported as consequences',
  root.innerHTML.includes('Bleeding begins')&&root.innerHTML.includes('Location stunned'));
state.logs=[eAttack,eHit,eBash];
api.render();
check('Bash outcome reports the actual knockback distance',
  root.innerHTML.includes('Knocked back 3m'));
state.logs=[eAttack,eHit,
 {id:3356,title:'Wound Resisted',body:'Additional wound consequence resisted.',kind:'system'}];
api.render();
check('Wound resistance is clearly distinguished from wound severity',
  root.innerHTML.includes('Serious wound')&&
  root.innerHTML.includes('Extra injury effect resisted'));
state.logs=[eAttack,eHit,
 {id:3357,title:'Sunder',body:'Armour reduced.',kind:'hit'}];
api.render();
check('Damage to armour is noted as a separate consequence',
  root.innerHTML.includes('Armour damaged'));


/* UX 08: difficulty grade is a lasting injury consequence, not a success grade. */
const woundResolution={id:3401,title:'SERIOUS WOUND · Right Arm',
 body:recapTarget+' Endurance 29/60% (SUCCESS) opposed by attack 23 (SUCCESS). Resists the additional consequence.',kind:'hurt'};
const woundResisted={id:3402,title:'Wound Resisted',
 body:recapTarget+' remains functional; injured-body tasks are one difficulty grade harder until healed to a Minor Wound.',
 kind:'system'};
state.mode='normal';state.phase='fight';state.pending=null;
state.order=['a','b'];state.turnIndex=0;state.wave=3;
state.logs=[eAttack,eDefense,eHit,woundResolution,woundResisted];
presentation.busy=false;presentation.visibleCount=Infinity;presentation.stage=null;presentation.highlight=null;
api.resetRoll();api.render();
check('Wound resistance does not erase the serious wound',
 root.innerHTML.includes('Serious wound') &&
 root.innerHTML.includes('Extra injury effect resisted'));
check('One-grade difficulty penalty is visible beside the exchange, not buried in chronicle',
 root.innerHTML.includes('class="recap-difficulty"') &&
 root.innerHTML.includes('Injured-body tasks are one difficulty grade harder'));
check('Difficulty example names the actual wounded location and endpoint',
 root.innerHTML.includes('Standard → Hard · Right Arm · Until the wound heals to Minor'));
check('Wound-resistance explanation distinguishes the Endurance result from the penalty',
 root.innerHTML.includes('Endurance resisted the extra wound effect'));
state.logs=[eAttack,eDefense,eHit];
api.render();
check('One-grade difficulty is not fabricated for exchanges without wound resistance',
 !root.innerHTML.includes('class="recap-difficulty"'));
state.logs=[eAttack,eDefense,eHit,woundResolution,woundResisted];
presentation.busy=true;presentation.visibleCount=3;
api.render();
check('Pending wound-resistance result remains hidden until revealed',
 !root.innerHTML.includes('class="recap-difficulty"'));
presentation.busy=false;presentation.visibleCount=Infinity;

const attacker=state.fighters.a;
attacker.hp['Right Arm']=0;attacker.weaponHand='Right Arm';
attacker.prone=false;attacker.blindedTurns=0;attacker.fatigue=0;attacker.impaledWounds=[];
const normalStyle=attacker.style;
const hardTarget=Math.ceil(normalStyle*2/3);
api.setRoll({id:3403,actor:'a',label:'Attack · Combat Style '+hardTarget+'%',
 defs:[{sides:100,label:'d100'}]});
api.render();
check('An isolated serious weapon-arm modifier shows before and after targets',
 root.innerHTML.includes('class="roll-difficulty-note"') &&
 root.innerHTML.includes(normalStyle+'% → '+hardTarget+'%') &&
 root.innerHTML.includes('Serious Right Arm wound · Standard → Hard'));
attacker.prone=true;
const combinedTarget=Math.ceil(Math.ceil(normalStyle/2)*2/3);
api.setRoll({id:3404,actor:'a',label:'Attack · Combat Style '+combinedTarget+'%',
 defs:[{sides:100,label:'d100'}]});
api.render();
check('Combined conditions do not mislabel the whole reduction as just one grade',
 root.innerHTML.includes('Reduced roll target') &&
 root.innerHTML.includes('Prone · Serious Right Arm wound') &&
 !root.innerHTML.includes('Serious Right Arm wound · Standard → Hard'));
attacker.prone=false;attacker.hp['Right Arm']=attacker.maxHp['Right Arm'];
api.setRoll({id:3405,actor:'a',label:'Attack · Combat Style '+normalStyle+'%',
 defs:[{sides:100,label:'d100'}]});
api.render();
check('Unmodified rolls do not show an invented difficulty penalty',
 !root.innerHTML.includes('class="roll-difficulty-note"'));
api.resetRoll();


/* UX 09: names both the ongoing action and the specific condition behind a target. */
const impaleIntent={id:3601,title:'Impale',body:'Weapon damage will be rolled twice; choose a result.',kind:'hit'};
const impaleLodged={id:3602,title:'Impaled Weapon',
 body:recapActor+"'s Broadsword lodges in "+recapTarget+"'s Right Arm. Weapon cannot be used until withdrawn.",
 kind:'hurt'};
const impaleBlocked={id:3603,title:'Impale blocked',
 body:'Armour/parry prevents a wound; the weapon does not lodge.',kind:'system'};
state.phase='fight';state.mode='normal';state.pending=null;state.wave=3;
state.logs=[eAttack,eDefense,eAdvantage,impaleIntent,eLocation];
presentation.busy=false;presentation.visibleCount=Infinity;presentation.stage=null;
api.resetRoll();api.render();
check('Unresolved impale describes intent, not a confirmed injury',
 root.innerHTML.includes('attempts to impale '+recapTarget) &&
 !root.innerHTML.includes('impales '+recapTarget+' in the'));
state.logs.push(eHit);
api.render();
check('Weapon striking does not claim an impale before the log confirms lodgement',
 root.innerHTML.includes('strikes the Right Arm · 4 HP lost') &&
 !root.innerHTML.includes('impales '+recapTarget+' in the'));
state.logs.push(impaleLodged);
api.render();
check('Confirmed impale names the victim and specific body part',
 root.innerHTML.includes('impales '+recapTarget+' in the Right Arm · 4 HP lost') &&
 root.innerHTML.includes('Weapon lodged'));
state.logs=[eAttack,eDefense,impaleIntent,eBlocked,impaleBlocked];
api.render();
check('Blocked impale is not narrated as a lodged weapon',
 !root.innerHTML.includes('impales '+recapTarget+' in the') &&
 root.innerHTML.includes('Impale blocked'));
const tripIntent={id:3604,title:'Trip Opponent',
 body:recapTarget+' rolls 44 vs 66% (SUCCESS): remains standing.',kind:'hit'};
state.logs=[eAttack,eDefense,tripIntent];
api.render();
check('Resisted trip is reported as a resisted attempt',
 root.innerHTML.includes('resists '+recapActor+'’s trip') &&
 root.innerHTML.includes('Trip resisted'));
state.logs=[eAttack,eDefense,{...tripIntent,body:recapTarget+' fails and falls prone.'}];
api.render();
check('Successful trip narrates the knockdown',
 root.innerHTML.includes('trips '+recapTarget) &&
 root.innerHTML.includes('Opponent knocked prone'));
const extraLiveStage={entry:{id:3610,title:recapActor+' attacks'},kind:'attack',rolling:true};
state.logs=[eAttack,eDefense];
presentation.busy=true;presentation.visibleCount=2;
presentation.stage=extraLiveStage;
api.render();
check('Live attack narration appears inside recap before a result is revealed',
 root.innerHTML.includes('class="recap-live"') &&
 root.innerHTML.includes('NOW</span> '+recapActor+' attacks'));
presentation.stage={entry:{id:3611,title:recapActor+' hits Right Arm'},kind:'hurt',rolling:true};
api.render();
check('Damage animation does not leak an unrevealed injury in live caption',
 root.innerHTML.includes('NOW</span> Resolving damage') &&
 !root.innerHTML.includes('NOW</span> '+recapActor+' hits Right Arm'));
presentation.busy=false;presentation.visibleCount=Infinity;presentation.stage=null;

const causalFighter=state.fighters.a;
causalFighter.prone=false;causalFighter.blindedTurns=0;
causalFighter.hp['Right Arm']=causalFighter.maxHp['Right Arm'];
causalFighter.fatigue=2;
causalFighter.impaledWounds=[];
const fatigueTarget=Math.ceil(causalFighter.style*2/3);
api.setRoll({id:3612,actor:'a',label:'Attack · Combat Style '+causalFighter.style+'% · '+fatigueTarget+'% (Tired fatigue)',
 defs:[{sides:100,label:'d100'}]});
api.render();
check('Fatigue modifier is named specifically on a reduced target',
 root.innerHTML.includes('Tired fatigue') &&
 root.innerHTML.includes(causalFighter.style+'% → '+fatigueTarget+'%') &&
 !root.innerHTML.includes('Target reduced by combat conditions'));
causalFighter.fatigue=0;
causalFighter.hp['Right Arm']=0;
causalFighter.prone=true;
const proneSerious=Math.ceil(Math.ceil(causalFighter.style/2)*2/3);
api.setRoll({id:3613,actor:'a',label:'Attack · Combat Style '+proneSerious+'%',
 defs:[{sides:100,label:'d100'}]});
api.render();
check('Stacking a prone penalty and serious wound names both causes',
 root.innerHTML.includes('Prone · Serious Right Arm wound') &&
 root.innerHTML.includes(causalFighter.style+'% → '+proneSerious+'%'));
causalFighter.prone=false;
causalFighter.hp['Right Arm']=causalFighter.maxHp['Right Arm'];
causalFighter.impaledWounds=[{loc:'Left Leg',weaponSize:3}];
const impaleFactor=[1,2/3,1/2,1/10,0][sandbox.window.prototypeCombat.impaleGrade(causalFighter)];
const impaleSkill=Math.ceil(causalFighter.style*impaleFactor);
api.setRoll({id:3614,actor:'a',label:'Attack · Combat Style '+causalFighter.style+'% · '+impaleSkill+'% (impaled weapon)',
 defs:[{sides:100,label:'d100'}]});
api.render();
check('An embedded weapon is identified as the specific cause of the skill penalty',
 root.innerHTML.includes('Impaled weapon · Left Leg') &&
 root.innerHTML.includes(causalFighter.style+'% → '+impaleSkill+'%'));
causalFighter.impaledWounds=[];
api.resetRoll();


/* The first action has narration even before an exchange recap exists. */
state.phase='fight';state.logs=[];state.pending=null;state.mode='normal';
presentation.busy=true;presentation.visibleCount=0;
presentation.stage={kind:'attack',rolling:true,entry:{id:3617,title:recapActor+' attacks'}};
api.render();
check('Opening attack has live narration before any recap exists',
 root.innerHTML.includes('class="outcome-strip') &&
 root.innerHTML.includes('>'+recapActor+' attacks</div>'));
presentation.stage={kind:'hurt',rolling:true,entry:{id:3618,title:recapActor+' hits Left Leg'}};
api.render();
check('First-exchange damage windup does not reveal the hit location',
 root.innerHTML.includes('Resolving damage') &&
 !root.innerHTML.includes('STRIKE · LEFT LEG'));
presentation.busy=false;presentation.visibleCount=Infinity;presentation.stage=null;

console.log('Practice Combat UX smoke checks passed.');
