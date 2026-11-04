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
assert.match(page, /practice-combat-ux\.css\?v=5/, 'UX stylesheet is linked');
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

console.log('Practice Combat UX smoke checks passed.');
