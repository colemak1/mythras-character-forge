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
assert.match(page, /practice-combat-ux\.css\?v=20/, 'UX stylesheet is linked');
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
  '\n;({startRun, render, state: () => S, resetRoll: () => { R = null; V.busy = false; }, setRoll: value => { R = value; }, availableEffects, d100Dice, rollSummary})',
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
  root.innerHTML.includes('Standard pace') &&
  root.innerHTML.includes('aria-label="Toggle combat presentation pace"'));
handlers.click({target:{closest(sel){return sel==='[data-act]'?{dataset:{act:'speed'}}:null;}}});
check('Pace can be switched to Quick without changing combat state',
  presentation.quick===true && root.innerHTML.includes('Quick pace') &&
  state.phase==='fight');
handlers.click({target:{closest(sel){return sel==='[data-act]'?{dataset:{act:'speed'}}:null;}}});
check('Pace can be returned to Detailed',
  presentation.quick===false && root.innerHTML.includes('Standard pace'));
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
  getBoundingClientRect(){return {top:180,bottom:240};},
  scrollIntoView(){this.scrolled=true;}};
const rollPanel={scrolled:false,scrollOptions:null,
  getBoundingClientRect(){return {top:-210,bottom:500};},
  scrollIntoView(options){this.scrolled=true;this.scrollOptions=options;}};
document.querySelector=selector=>selector.startsWith('.roll-await .roll-now,')?button:
  selector==='.roll-await'?rollPanel:savedQuery(selector);
sandbox.window.requestAnimationFrame=callback=>callback();
sandbox.window.innerHeight=800;
api.setRoll({id:3041,actor:'a',label:'Manual d20 roll',defs:[{sides:20,label:'Hit location'}]});
api.render();
check('Roll prompt heading is brought back into view even when the Roll button is visible',
  button.focused && !button.scrolled && rollPanel.scrolled &&
  rollPanel.scrollOptions?.block==='start');
button.focused=false;button.scrolled=false;rollPanel.scrolled=false;
rollPanel.getBoundingClientRect=()=>({top:180,bottom:640});
api.setRoll({id:3042,actor:'a',label:'Another manual d20 roll',defs:[{sides:20,label:'Hit location'}]});
api.render();
check('An entirely visible roll prompt is focused without scrolling the page',
  button.focused && !button.scrolled && !rollPanel.scrolled);
rollPanel.scrolled=false;
rollPanel.getBoundingClientRect=()=>({top:120,bottom:950});
api.setRoll({id:3043,actor:'a',label:'Tall manual roll',defs:[{sides:100,label:'d100'}]});
api.render();
check('An oversized prompt aligns at its top rather than hiding the modifier',
  rollPanel.scrolled && rollPanel.scrollOptions?.block==='start');
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
check('The next action appears before the dice and recap',
  root.innerHTML.indexOf('class="decision-panel') <
  root.innerHTML.indexOf('class="exchange-board"') &&
  root.innerHTML.indexOf('class="exchange-board"') <
  root.innerHTML.indexOf('class="exchange-recap') &&
  root.innerHTML.includes('<summary>Roll breakdown</summary>'));

state.pending={kind:'reaction',atk:'a',def:'b',attackRoll:{grade:2,label:'SUCCESS',roll:23}};
api.render();
check('An unresolved attack tells the player to choose a defense',
  root.innerHTML.includes('Choose your defense'));
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
  root.innerHTML.includes('class="presentation-controls"') &&
  root.innerHTML.includes('data-act="skip"'));
presentation.busy=false;presentation.visibleCount=Infinity;
state.logs=[{...eAttack,body:'93 against Combat Style 67% — FAILURE.'},
  {id:3311,title:recapTarget+' does not defend',
   body:recapTarget+' preserves Action Points.',kind:'system'},
  {id:3312,title:'No Damaging Hit',body:recapActor+"'s attack failed to connect.",kind:'system'}];
api.render();
check('Undefended miss is explained without incorrectly claiming damage',
  root.innerHTML.includes(' misses') &&
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
presentation.busy=false;presentation.visibleCount=Infinity;presentation.stage=null;presentation.roll=null;presentation.highlight=null;
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
presentation.busy=false;presentation.visibleCount=Infinity;presentation.stage=null;presentation.roll=null;
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
 root.innerHTML.includes('Target knocked prone'));
state.logs=[eAttack,eDefense];
presentation.busy=true;presentation.visibleCount=2;
presentation.stage=null;
presentation.roll={actor:'a',label:'Attack · Combat Style 67%'};
api.render();
check('Live attack narration appears inside recap before a result is revealed',
 root.innerHTML.includes('class="recap-live"') &&
 root.innerHTML.includes('NOW</span> '+recapActor+' attacks'));
presentation.roll={actor:'a',label:'Damage · Right Arm'};
api.render();
check('Damage animation does not leak an unrevealed injury in live caption',
 root.innerHTML.includes('NOW</span> Resolving damage') &&
 !root.innerHTML.includes('NOW</span> '+recapActor+' hits Right Arm'));
presentation.busy=false;presentation.visibleCount=Infinity;presentation.stage=null;presentation.roll=null;

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
presentation.roll={actor:'a',label:'Attack · Combat Style 67%'};
api.render();
check('Opening attack has live narration before any recap exists',
 root.innerHTML.includes('class="outcome-strip') &&
 root.innerHTML.includes('>'+recapActor+' attacks</div>'));
presentation.roll={actor:'a',label:'Damage · Left Leg'};
api.render();
check('First-exchange damage windup does not reveal the hit location',
 root.innerHTML.includes('Resolving damage') &&
 !root.innerHTML.includes('STRIKE · LEFT LEG'));
presentation.busy=false;presentation.visibleCount=Infinity;presentation.stage=null;presentation.roll=null;


/* Defensive trip belongs to the effect owner, not the original attacker. */
const defensiveTrip={...tripIntent,id:3620,meta:{actor:'b'}};
state.phase='fight';state.mode='normal';
state.logs=[eAttack,eDefense,defensiveTrip];state.pending=null;
presentation.busy=false;presentation.visibleCount=Infinity;presentation.stage=null;presentation.roll=null;
api.resetRoll();api.render();
check('A defensive trip credits the actual effect owner',
 root.innerHTML.includes(recapTarget+' resists '+recapTarget+'’s trip')===false &&
 root.innerHTML.includes(recapActor+' resists '+recapTarget+'’s trip'));
state.logs=[eAttack,eDefense,eAdvantage];
state.pending={kind:'tripResistChoice',owner:'b',other:'a',atk:'a',def:'b'};
api.render();
check('A pending defensive trip is narrated before a resistance roll',
 root.innerHTML.includes(recapTarget+' attempts to trip '+recapActor) &&
 root.innerHTML.includes('Choose Brawn or Evade to resist the trip'));
api.setRoll({id:3621,actor:'a',label:'Trip · '+recapActor+' Brawn',
 defs:[{sides:100,label:'d100'}]});
api.render();
check('Trip resistance prompt identifies the effect owner without duplicate narration',
 root.innerHTML.includes(recapTarget+' attempts to trip '+recapActor) &&
 !root.innerHTML.includes('class="recap-live"'));
state.pending=null;api.resetRoll();


/* UX pass 10: conditions, reach, action costs and decision emphasis. */
state.phase='fight';state.mode='normal';state.order=['a','b'];state.turnIndex=0;
state.pending=null;state.logs=[];presentation.busy=false;
presentation.stage=null;presentation.visibleCount=Infinity;
api.resetRoll();
const hero10=state.fighters.a,foe10=state.fighters.b;
const orig10={a:{...hero10,hp:{...hero10.hp}},b:{...foe10,hp:{...foe10.hp}}};
hero10.prone=false;hero10.skipAttack=0;hero10.blindedTurns=0;
hero10.bleeding=false;hero10.fatigue=0;hero10.stunnedLocations={};
hero10.impaledWounds=[];hero10.impaledWeapon=null;
hero10.pinnedGear=null;hero10.braced=false;hero10.disarmed=false;
hero10.partialLimbs={};hero10.disabled=[];hero10.shield='none';
foe10.prone=false;foe10.blindedTurns=0;foe10.bleeding=false;foe10.fatigue=0;
foe10.stunnedLocations={};foe10.impaledWounds=[];foe10.disabled=[];
foe10.partialLimbs={};foe10.pinnedGear=null;foe10.disarmed=false;
foe10.braced=false;foe10.skipAttack=0;
hero10.hp={...hero10.maxHp};foe10.hp={...foe10.maxHp};
state.disengaged=false;state.engagement='equal';state.gapMetres=0;
hero10.weapon='sword';foe10.weapon='sword';
api.render();
check('No conditions container when fighters are uninjured and unrestricted',
 !root.innerHTML.includes('class="condition-insights"'));
check('One AP attack cost and zero AP concession are explicit',
 root.innerHTML.includes('Attack · 1 AP') &&
 root.innerHTML.includes('Concede Bout · 0 AP'));
check('Uncontested reach does not insert another explanation',
 !root.innerHTML.includes('class="reach-context"'));
check('Action-ready fighter gets the visual focus rather than both fighters',
 root.innerHTML.includes('class="fighter player decision-focus') &&
 !root.innerHTML.includes('class="fighter enemy decision-focus'));
state.pending={kind:'reaction',atk:'a',def:'b',
 attackRoll:{grade:2,roll:30,label:'SUCCESS'}};
api.render();
check('Reacting opponent gets the fighter focus',
 root.innerHTML.includes('class="fighter enemy decision-focus') &&
 !root.innerHTML.includes('class="fighter player decision-focus'));
check('Defending without reaction explicitly costs zero AP',
 root.innerHTML.includes('Do Not Defend · 0 AP'));
state.pending=null;hero10.shield='buckler';
api.render();
check('Shield ward is clearly marked as a free zero AP choice',
 root.innerHTML.includes('Ward Shield · 0 AP'));
hero10.shield='none';
hero10.prone=true;hero10.skipAttack=2;hero10.bleeding=true;
api.render();
check('Prone condition explains its effects instead of only displaying a label',
 root.innerHTML.includes('Attack and Evade targets are halved.') &&
 root.innerHTML.includes('Regaining footing uses 1 AP.'));
check('Restricted attack shows remaining duration and that other actions remain',
 root.innerHTML.includes('Attack restricted') &&
 root.innerHTML.includes('2 turns remaining.') &&
 root.innerHTML.includes('Other permitted actions and reactions remain available.'));
check('Bleeding explains its start-of-round consequence',
 root.innerHTML.includes('Fatigue increases each new Combat Round'));
hero10.blindedTurns=3;hero10.fatigue=2;hero10.stunnedLocations={Head:1};
api.render();
check('More than three condition explanations are collapsed by default',
 root.innerHTML.includes('class="condition-overflow"') &&
 !root.innerHTML.includes('class="condition-overflow" data-id="a" open'));
check('Multiple conditions include severity and head-stun consequence',
 root.innerHTML.includes('Blinded') &&
 root.innerHTML.includes('Cannot respond while the head is stunned.'));
handlers.toggle({target:{classList:{contains:k=>k==='condition-overflow'},
 dataset:{id:'a'},open:true}});
api.render();
check('Expanded conditions stay open after a re-render',
 root.innerHTML.includes('class="condition-overflow" data-id="a" open'));
hero10.prone=false;hero10.skipAttack=0;hero10.bleeding=false;
hero10.blindedTurns=0;hero10.fatigue=0;hero10.stunnedLocations={};
hero10.impaledWounds=[{loc:'Right Leg',weaponSize:3}];
hero10.hp.RightArm=0;
api.render();
check('Impaled weapons name their affected location and difficulty implication',
 root.innerHTML.includes('Impaled') &&
 root.innerHTML.includes('Right Leg') &&
 root.innerHTML.includes('Embedded weapon increases skill difficulty.'));
hero10.impaledWounds=[];hero10.hp={...hero10.maxHp};
hero10.hp['Left Leg']=0;
api.render();
check('Serious leg condition explains harder Evade target',
 root.innerHTML.includes('Left Leg injury') &&
 root.innerHTML.includes('Evade is one difficulty grade harder'));
hero10.hp={...hero10.maxHp};
hero10.weapon='greatsword';foe10.weapon='dagger';
state.engagement='long';
api.render();
check('At long reach the controller and limited short-weapon fighter are named',
 root.innerHTML.includes(hero10.name+' controls long reach.') &&
 root.innerHTML.includes(foe10.name+' must close distance'));
state.engagement='short';
api.render();
check('Short reach names the fighter inside and the longer weapon restriction',
 root.innerHTML.includes(foe10.name+' has moved inside') &&
 root.innerHTML.includes(hero10.name+' attacks awkwardly'));
state.disengaged=true;state.gapMetres=4;
api.render();
check('Separated combatants see the actual disengagement distance',
 root.innerHTML.includes('Separated by 4m.') &&
 root.innerHTML.includes('Re-engage before attempting a body strike'));
state.disengaged=false;state.engagement='equal';
hero10.weapon='sword';foe10.weapon='sword';
state.pending={kind:'tripResistChoice',owner:'a',other:'b',atk:'a',def:'b'};
api.render();
check('Trip resistance focus highlights the defender choosing resistance',
 root.innerHTML.includes('class="fighter enemy decision-focus'));
state.pending={kind:'effect',owner:'a',other:'b',atk:'a',def:'b',
 effectsLeft:1,chosen:[],attackRoll:{grade:2,roll:27,label:'SUCCESS'},
 defenseRoll:{grade:1,roll:89,label:'FAILURE'}};
api.render();
check('Effect selection focus returns to its owner',
 root.innerHTML.includes('class="fighter player decision-focus'));
state.pending=null;


/* UX10: never narrate a future reach state while event playback is incomplete. */
state.phase='fight';state.pending=null;state.disengaged=false;
state.fighters.a.weapon='greatsword';state.fighters.b.weapon='dagger';
state.engagement='long';
presentation.busy=true;presentation.visibleCount=0;
presentation.stage={kind:'system',rolling:false,entry:{title:'Range changes'}};
api.render();
check('Reach explanation does not leak unrevealed range changes during playback',
 !root.innerHTML.includes('class="reach-context"'));
presentation.busy=false;presentation.stage=null;
state.engagement='long';api.render();
check('Reach explanation returns immediately after playback completes',
 root.innerHTML.includes('class="reach-context"'));
state.fighters.a.weapon='sword';state.fighters.b.weapon='sword';
state.engagement='equal';


/* An impaled weapon with no size-derived penalty should not fabricate one. */
const previousSiz10=state.fighters.a.siz;
state.phase='fight';state.pending=null;presentation.busy=false;
state.fighters.a.siz=45;
state.fighters.a.impaledWounds=[{loc:'Left Leg',weaponSize:1}];
api.render();
check('Size-zero impalement grade does not invent a skill modifier',
 sandbox.window.prototypeCombat.impaleGrade(state.fighters.a)===0 &&
 root.innerHTML.includes('Lodged weapon; no additional skill penalty from its size.'));
state.fighters.a.siz=previousSiz10;
state.fighters.a.impaledWounds=[];


/* Work-mode desktop Chrome findings — PvP initiative ownership and false dodge. */
state.phase='fight';state.mode='pvp';state.pending=null;state.logs=[];
state.order=['a','b'];state.turnIndex=0;presentation.busy=false;
api.setRoll({id:4010,actor:'b',label:'Initiative · d10',
 defs:[{sides:10,label:'Initiative'}]});
api.render();
check('PvP initiative names the active second player in the action panel',
 root.innerHTML.includes('class="decision-kicker">'+state.fighters.b.name) &&
 root.innerHTML.includes('Manual d10 roll for '+state.fighters.b.name) &&
 root.innerHTML.indexOf('data-act="roll"') < root.innerHTML.indexOf('data-combatant="a"'));
api.setRoll({id:4011,actor:'a',label:'Initiative · d10',
 defs:[{sides:10,label:'Initiative'}]});
api.render();
check('PvP first-player initiative identifies the first player',
 root.innerHTML.includes('class="decision-kicker">'+state.fighters.a.name));
api.resetRoll();
state.mode='tutorial';state.pending=null;
const otherName=state.fighters.b.name,playerName=state.fighters.a.name;
const failedAttack={id:4012,title:otherName+' attacks',
 body:'75 against Combat Style 45% — FAILURE.',kind:'system'};
const failedDodge={id:4013,title:playerName+' evades',
 body:'28 vs 67% — SUCCESS. 1 AP remaining.',kind:'system'};
const noHit={id:4014,title:'No Damaging Hit',
 body:playerName+' evades the incoming strike, ending prone.',kind:'system'};
state.logs=[failedAttack,failedDodge,noHit];
api.render();
check('Failed attack remains a miss even if the defender also evades successfully',
 root.innerHTML.includes(otherName+' misses') &&
 root.innerHTML.includes(playerName+' attempts to evade and ends prone.') &&
 !root.innerHTML.includes(playerName+' evades '+otherName+'’s strike'));
check('Miss recap retains the failed attack and resolved defensive roll',
 root.innerHTML.includes('75 / 45% · Failure') &&
 root.innerHTML.includes('Evade · 28 / 67% · Success') &&
 root.innerHTML.includes('No HP lost'));
state.logs=[{...failedAttack,id:4015,body:'20 against Combat Style 45% — SUCCESS.'},
 failedDodge,noHit];
api.render();
check('An attack successfully evaded is still described as a dodge',
 root.innerHTML.includes(playerName+' evades '+otherName+'’s strike') &&
 root.innerHTML.includes(playerName+' ends prone.'));
state.logs=[failedAttack,noHit];
api.render();
check('An undefended failed attack is simply a miss',
 root.innerHTML.includes(otherName+' misses') &&
 !root.innerHTML.includes('attempts to evade and ends prone.'));
api.resetRoll();


/* Inline rolls use the active combatant's lane; recaps print recorded values. */
state.phase='fight';state.pending=null;state.mode='pvp';
presentation.busy=false;presentation.stage=null;presentation.visibleCount=Infinity;
api.setRoll({id:5110,actor:'a',label:'Attack · Combat Style 34%',
 defs:[{sides:100,label:'d100'}]});
api.render();
const percentilePrompt=root.innerHTML.slice(root.innerHTML.indexOf('<div class="roll-await"'));
check('Manual percentile prompt shows the target and one roll button',
 percentilePrompt.includes('Target <strong>34%</strong>') &&
 percentilePrompt.includes('Roll d100</button>') &&
 !percentilePrompt.includes('class="die-shape'));
check('Recorded percentile history uses the exact result as text',
 api.rollSummary({title:'Skill check',meta:{dice:api.d100Dice(100)}}).includes('d100 100') &&
 api.rollSummary({title:'Skill check',meta:{dice:api.d100Dice(75)}}).includes('d100 75'));
api.setRoll({id:5111,actor:'a',label:'Hit Location · d20',defs:[{sides:20,label:'Hit location'}]});
api.render();
check('Hit location prompts for a d20',root.innerHTML.includes('Roll d20</button>'));
api.setRoll({id:5112,actor:'a',label:'Damage · Left Leg',
 defs:[{sides:6,label:'Weapon'},{sides:4,label:'Damage Modifier'}]});
api.render();
check('Damage prompt identifies every die in the pool',root.innerHTML.includes('Roll d6 + d4</button>'));
presentation.busy=true;
presentation.roll={actor:'b',label:'Initiative · d10'};
api.render();
check('One inline tray appears in the second player lane while that player rolls',
 (root.innerHTML.match(/data-inline-dice/g)||[]).length===1 &&
 root.innerHTML.indexOf('data-combatant="b"')<root.innerHTML.indexOf('data-inline-dice') &&
 !root.innerHTML.includes('class="die-shape') && !root.innerHTML.includes('<iframe'));
presentation.roll=null;
api.resetRoll();


const capturedRoll = vm.runInContext(`
  V.capturing=true;
  V.queue=[];
  let received;
  const defs=[{sides:100,fixed:100},{sides:8,fixed:8},{sides:3,fixed:2}];
  resolveDice('b',defs,'Mixed roll',values=>{
    received=values;
    log('Resolved roll',values.join(' + '));
  });
  V.capturing=false;
  const queue=V.queue;
  V.queue=[];
  ({received,queue});
`, sandbox);
check('The tray receives the same mixed roll values as combat, ahead of its result log',
 capturedRoll.queue.length===2 && capturedRoll.queue[0].roll.actor==='b' &&
 capturedRoll.queue[0].roll.values===capturedRoll.received &&
 capturedRoll.queue[1].body==='100 + 8 + 2');

// Scheduling regressions exercise the same entry points as the combat controls.
const locationFlow=vm.runInContext(`
 (() => {
   config.mode='pvp';
   startRun();
   R=null;
   const success={grade:2,roll:32,label:'SUCCESS'};
   const failure={grade:1,roll:90,label:'FAILURE'};
   S.pending={kind:'effect',atk:'a',def:'b',owner:'a',other:'b',
     attackRoll:success,defenseRoll:failure,effectsLeft:1,chosen:[]};
   render();
   const offered=document.querySelector('#root').innerHTML.includes('data-val="choose"');
   applyEffect('choose');
   const picker=document.querySelector('#root').innerHTML;
   chooseLocation('Left Arm');
   const damage=R?.label;
   R=null;
   return {offered,picker,damage};
 })()
`, sandbox);
check('A normal melee success that earns an effect can choose a location',
 locationFlow.offered && locationFlow.picker.includes('Choose where the hit lands') &&
 locationFlow.picker.includes('data-val="Left Arm"'));
check('A chosen location goes straight to damage for that body part',
 locationFlow.damage==='Damage · Left Arm');

const decisionFeedback=vm.runInContext(`
 (() => {
   config.mode='pvp';
   startRun();
   R=null;
   const success={grade:2,roll:32,label:'SUCCESS'};
   const failure={grade:1,roll:90,label:'FAILURE'};
   S.pending={kind:'effect',atk:'a',def:'b',owner:'a',other:'b',
     reaction:'parry',attackRoll:success,defenseRoll:failure,
     offenseCount:1,effectsLeft:1,chosen:[]};
   const reason=decisionReason();
   S.pending=null;
   const hit={title:'Test hit',kind:'hurt',meta:{impact:{target:'b',location:'Left Arm',hpLost:3}}};
   V.busy=true;
   V.events=[hit,{title:'End turn',kind:'system'}];
   skipPresentation();
   const after=document.querySelector('#root').innerHTML;
   playCaptured(()=>{});
   const cleared=document.querySelector('#root').innerHTML;
   return {reason,after,cleared};
 })()
`, sandbox);
check('Special Effect decision explains the attack and defense grades',
 decisionFeedback.reason.includes('The attack succeeded. The parry failed.') &&
 decisionFeedback.reason.includes('earned 1 Special Effect.'));
check('Skipping playback keeps the wound beside the next prompt and marks the location',
 decisionFeedback.after.includes('left arm lost 3 HP.') &&
 decisionFeedback.after.includes('recent-impact'));
check('The next captured action clears the previous wound emphasis',
 !decisionFeedback.cleared.includes('left arm lost 3 HP.') &&
 !decisionFeedback.cleared.includes('recent-impact'));

const scheduling = vm.runInContext(`
;({
  setup() {
    config.mode = 'pvp';
    V.busy = false;
    startRun();
    R = null;
    S.order = ['a', 'b'];
    return S;
  },
  advance, delayTurn, react, endAction, restrictNextAttack, advanceStun,
  attackRestrictionTurns, beginChangeRange, rangeReact, beginAttack, rollSkill, render,
  pending: () => R,
  resolve(value) {
    const request = R;
    R = null;
    request.callback([value]);
  },
  clearRoll() { R = null; }
})`, sandbox, { filename: 'practice-combat-scheduling.js' });

const bout = scheduling.setup();
const { a, b } = bout.fighters;
a.ap = b.ap = 3;
scheduling.render();
check('Human can select Delay', root.innerHTML.includes('data-act="delay"'));
scheduling.delayTurn(a);
check('Delay holds one AP and gives the opponent their turn',
  a.delaying && a.ap === 3 && bout.order[bout.turnIndex] === 'b');
bout.pending = { kind: 'reaction', atk: 'b', def: 'a', attackTarget: 65,
  attackRoll: scheduling.rollSkill(65, 30) };
scheduling.react('parry');
check('Parrying after Delay uses one AP and prompts the correct fighter',
  !a.delaying && a.ap === 2 && scheduling.pending()?.actor === 'a');
scheduling.clearRoll();
bout.pending = null;
bout.turnIndex = 0;
scheduling.delayTurn(a);
scheduling.endAction();
check('An unused Delay costs exactly one AP at the next turn',
  !a.delaying && a.ap === 1 && bout.order[bout.turnIndex] === 'a');

scheduling.restrictNextAttack(a, 'overextend');
scheduling.restrictNextAttack(a, 'overextend');
scheduling.advanceStun(a);
check('Stacked Overextend survives the turn on which it was applied',
  scheduling.attackRestrictionTurns(a) === 2);
scheduling.restrictNextAttack(a, 'press');
scheduling.advanceStun(a);
check('Press Advantage overlaps with Overextend',
  scheduling.attackRestrictionTurns(a) === 1);
scheduling.advanceStun(a);

a.weapon = 'dagger';
b.weapon = 'greatsword';
a.ap = b.ap = 3;
bout.engagement = 'long';
b.disarmed = true;
scheduling.beginChangeRange('a');
check('A disarmed fighter cannot intercept a range change',
  /data-val="intercept" disabled/.test(root.innerHTML));
scheduling.rangeReact('intercept');
check('An illegal interception spends no AP and rolls no dice',
  b.ap === 3 && !scheduling.pending());
b.disarmed = false;
b.style = a.evade = 65;
scheduling.rangeReact('intercept');
check('A legal interception spends one AP and prompts the interceptor',
  b.ap === 2 && scheduling.pending()?.actor === 'b');
scheduling.resolve(25);
check('An intercepted mover rolls their own Evade',
  scheduling.pending()?.actor === 'a');
scheduling.resolve(25);
check('An exact tie on interception causes no hit and the range changes',
  bout.engagement === 'short' && !a.prone && !scheduling.pending());

bout.turnIndex = 1;
bout.disengaged = true;
bout.gapMetres = 2;
b.kind = 'ai';
b.prone = true;
b.disabled = ['Left Leg'];
b.ap = 2;
scheduling.advance();
check('An AI that cannot stand or close the gap passes its turn',
  b.ap === 1 && bout.order[bout.turnIndex] === 'a');

a.braced = true;
bout.disengaged = false;
scheduling.beginAttack('a');
check('A stationary attack preserves Brace and prompts the fighter to roll',
  a.braced && scheduling.pending()?.actor === 'a');

console.log('Practice Combat UX and scheduling checks passed.');

const generatedBout=vm.runInContext(`
 (() => {
   config.mode='normal';
   config.weapon='mace';
   startRun(true);
   const foe=S.fighters.b;
   const intro=opponentIntroHtml();
   const waits=S.phase==='intro'&&!R&&S.logs.length===0;
   const ownWeapon=S.fighters.a.weapon;
   handleClick({target:{closest(){return {dataset:{act:'beginFight'}};}}});
   const began=S.phase==='fight'&&R?.actor==='a'&&S.fighters.b===foe;
   R=null;
   S.phase='between';
   nextEncounter();
   const nextWaits=S.phase==='intro'&&!R&&S.wave===2;
   const styles=new Set();
   let valid=true;
   for(let i=0;i<100;i++){
     const f=newEnemy(6);
     styles.add(f.tactic);
     valid&&=!!AI_STYLES[f.tactic]&&(f.tactic!=='shield'||f.shield!=='none')&&
       (f.tactic!=='reach'||WEAPONS[f.weapon].reach>=3);
   }
   config.mode='hardcore';
   startRun(true);
   const hero=S.fighters.a;
   hero.hp['Left Arm']--;
   S.phase='between';
   nextEncounter();
   const carries=S.fighters.a===hero&&S.fighters.a.hp['Left Arm']===hero.maxHp['Left Arm']-1;
   return {waits,began,nextWaits,ownWeapon,intro,styles:styles.size,valid,carries};
 })()
`,sandbox);
check('Gauntlet introduction waits for Begin fight and preserves the selected character gear',
 generatedBout.waits&&generatedBout.ownWeapon==='mace'&&generatedBout.intro.includes('Begin fight'));
check('Beginning the bout uses the previewed opponent and the next wave gets its own card',
 generatedBout.began&&generatedBout.nextWaits);
check('Generated fighting styles respect equipment and vary across opponents',
 generatedBout.valid&&generatedBout.styles>=3);
check('Hardcore carries the same injured fighter through the next opponent introduction',
 generatedBout.carries);


// Playback pauses at a new automatic action, while decisions remain their own stops.
const measuredPlayback=vm.runInContext(`
 (() => {
   R=null;
   S.phase='fight';S.order=['a','b'];S.turnIndex=0;S.pending=null;
   V.quick=false;
   const first={id:90001,title:'Opponent attacks',body:'32 against Combat Style 60% — SUCCESS.',kind:'system'};
   const result={id:90002,title:'No Damaging Hit',body:'The blow is parried.',kind:'system'};
   const next={id:90003,title:'Opponent attacks',body:'45 against Combat Style 60% — SUCCESS.',kind:'system'};
   S.logs=[first,result,next];
   V.events=[first,result,{checkpoint:true,actor:'b'},next];
   V.busy=true;V.step=0;V.visibleCount=0;
   playBeat();
   const automatic=!V.awaitingContinue&&!!V.timer&&V.stage.entry===first&&
     !presentationControlsHtml().includes('data-act="continue"');
   continuePresentation();
   const blocked=V.step===0;
   advancePresentation();
   const resultShown=!V.awaitingContinue&&V.stage.entry===result;
   advancePresentation();
   const boundary=V.awaitingContinue&&V.timer===null&&V.stage.entry===result&&
     V.visibleCount===2&&presentationControlsHtml().includes('acts next');
   continuePresentation();
   const nextAction=!V.awaitingContinue&&V.stage.entry===next;
   advancePresentation();
   const decision=!V.busy&&!V.awaitingContinue;
   // A trailing checkpoint cannot become the result when Show results is used.
   V.busy=true;V.events=[first,result,{checkpoint:true,actor:'b'}];
   skipPresentation();
   const skip=V.stage.entry===result&&!V.busy;
   V.capturing=true;V.queue=[];
   captureActionBoundary('b');
   const noEmpty=V.queue.length===0;
   V.queue=[result];captureActionBoundary('b');captureActionBoundary('b');
   const once=V.queue.length===2&&V.queue[1].checkpoint;
   V.queue=[];V.capturing=false;
   V.quick=true;V.events=[result,{checkpoint:true,actor:'b'}];V.step=1;V.busy=true;
   playBeat();
   const quick=!!V.timer;
   skipPresentation();V.quick=false;
   // A matching die/result stays together; narration gives the actual result.
   V.busy=true;V.events=[first];V.step=0;V.stage=null;
   V.roll={actor:'b',defs:[{sides:100}],values:[32],settled:true};
   first.meta={actor:'b',dice:d100Dice(32)};
   const combined=rollMatchesResult(V.roll,first);
   V.stage=stageFor(first);
   const narrated=combatNarrationHtml().includes('success')&&!combatNarrationHtml().includes(' rolls.');
   skipPresentation();
   return {automatic,blocked,resultShown,boundary,nextAction,decision,skip,noEmpty,once,quick,combined,narrated};
 })()
`,sandbox);
check('Roll results advance automatically and expose no redundant Continue',measuredPlayback.automatic&&measuredPlayback.blocked);
check('A completed result waits before the next automatic action without revealing it',measuredPlayback.resultShown&&measuredPlayback.boundary);
check('Continue starts the next action; real choices need no extra Continue',measuredPlayback.nextAction&&measuredPlayback.decision);
check('Show results skips checkpoint markers and Quick pace still advances automatically',measuredPlayback.skip&&measuredPlayback.quick);
check('Action checkpoints require earlier information and cannot be duplicated',measuredPlayback.noEmpty&&measuredPlayback.once);
check('Matching dice and their result stay together, with the result narrated',measuredPlayback.combined&&measuredPlayback.narrated);

const capturedOpening=vm.runInContext(`
 (() => {
   clearPresentationTimers();V.busy=false;V.stage=null;V.queue=[];V.quick=false;
   config.mode='normal';startRun();
   S.fighters.a.init=0;S.fighters.b.init=30;
   S.fighters.b.weapon='sword';S.fighters.a.weapon='sword';
   S.engagement='equal';
   V.capturing=true;
   performManualRoll();
   V.capturing=false;
   const events=V.queue;
   const checkpoint=events.findIndex(e=>e.checkpoint);
   const summary=events.findIndex(e=>/^Encounter.*Initiative/.test(e.title||''));
   const attack=events.findIndex(e=>e.roll?.actor==='b'&&/^Attack/.test(e.roll.label));
   const reaction=S.pending?.kind==='reaction';
   V.queue=[];R=null;
   return {correct:summary>=0&&checkpoint>summary&&attack>checkpoint,
     count:events.filter(e=>e.checkpoint).length,reaction};
 })()
`,sandbox);
check('Opponent initiative creates exactly one stop after the order summary, before their attack',
 capturedOpening.correct&&capturedOpening.count===1&&capturedOpening.reaction);

const checkpointRoles=vm.runInContext(`
 (() => {
   V.busy=true;V.roll=null;
   const attack={id:91000,title:S.fighters.a.name+' attacks',body:'31 against Combat Style 67% — SUCCESS.'};
   const result={id:91001,title:'No Damaging Hit',body:'The blow was parried.'};
   S.logs=[attack,result];V.visibleCount=2;V.stage=stageFor(result);
   S.pending={kind:'reaction',atk:'b',def:'a'};
   const held=currentExchange();
   V.busy=false;S.pending=null;
   return held.atkId==='a'&&held.defId==='b'&&!held.pending;
 })()
`,sandbox);
check('Held results keep the previous fighter roles while the next opponent attack is hidden',checkpointRoles);
