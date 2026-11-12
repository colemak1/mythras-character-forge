// The exchange writer (experiments/pits-writer.js): resolved exchanges in, spring movement out (step 1 of "Path to the
// live Pits", docs/pits-animation-direction.md). Presentation only.
// The ten-beat fight is the writer fed the fixture records; tests/pits-fight.cjs holds that fight to the owner's brief.
// Here: the records and the phrase table, and the movement rules on fights the study never had (roles swapped,
// another order, every outcome at every hit location from the opening).
const assert=require('node:assert/strict');
const PS=require('../experiments/pits-spring.js');
const PW=require('../experiments/pits-writer.js');
const FX=require('../experiments/pits-fixtures.js');
require('../experiments/pits-fight.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const {fault,LOCS,RESULTS,other}=require('./lib/pits-motion-rules.cjs');
const ids=['a','b'];
const swap=r=>r.map(x=>({...x,attacker:other[x.attacker],after:x.after&&x.after.map(c=>c.winner?{...c,winner:other[c.winner]}:c)}));

test('the fixtures are engine-shaped records, and the study is them, written exchange by exchange',()=>{
  for(const r of FX.FIGHT){assert(ids.includes(r.attacker));assert(/^(head|chest|abdomen|[rl](arm|leg))$/.test(r.loc));
    assert(/^(parried|full-parry|partial-parry|wound|armour|zero|miss|evaded|fumble)$/.test(r.outcome));assert(Number.isInteger(r.lost));}
  const q=PS.build('fight');
  assert.deepEqual(q.exchanges.map(e=>e.phrase),['cutParried','cutMissed','lowBind','highParry','armCut','thrustDeflected','legCut']);
  assert.deepEqual(q.beats.map(b=>b.short),['Approach','Cut, parried','Counter, slipped','Low attack','Low bind','Disengage high',
    'Arm wound','Thrust, deflected','Thigh cut','Collapse']);
  // the study's own places: no measure taken, no stance gathered, no stand-in, no boundary moved
  assert.deepEqual(q.notes.filter(n=>n.kind),[]);
  assert.equal(q.pauses.length,7);          // the approach and six exchanges; the last one ends the fight
});
test('the phrase for each kind of result',()=>{
  const P=(r,prev)=>PW.pick({attacker:'a',lost:0,...r},prev).id;
  assert.equal(P({loc:'chest',outcome:'parried'}),'cutParried');
  assert.equal(P({loc:'head',outcome:'full-parry'}),'highParry');
  assert.equal(P({loc:'lleg',outcome:'parried'}),'lowBind');
  assert.equal(P({loc:'abdomen',outcome:'parried'}),'thrustDeflected');
  for(const o of ['miss','evaded','fumble'])assert.equal(P({loc:'chest',outcome:o}),'cutMissed');
  assert.equal(P({loc:'rleg',outcome:'wound',lost:4}),'legCut');
  assert.equal(P({loc:'head',outcome:'wound',lost:4}),'cutLands');
  assert.equal(P({loc:'chest',outcome:'armour'}),'cutLands');
  // the short cut onto the forearm only when the other's arm is out after its own high cut was parried
  assert.equal(P({loc:'rarm',outcome:'wound',lost:2}),'cutLands');
  assert.equal(P({loc:'rarm',outcome:'wound',lost:2},{phrase:'highParry',attacker:'b'}),'armCut');
  // a partial parry is drawn as a blow that lands, and says so
  assert.equal(PW.pick({attacker:'a',loc:'chest',outcome:'partial-parry',lost:2}).exact,false);
});
test('a fight ends where the record says the blow ended it, and not otherwise',()=>{
  const last=FX.FIGHT[FX.FIGHT.length-1];
  const ends=PW.write([last]);assert.equal(ends.beats[ends.beats.length-1].short,'Collapse');
  const goes=PW.write([{...last,after:[]}]);assert(!goes.beats.some(b=>b.short==='Collapse'));
  assert(goes.pauses.length===2,'an unfinished fight ends on a decision');
});
test('the same fight with the roles swapped keeps the movement rules',()=>{
  const q=PW.write(swap(FX.FIGHT));assert.equal(fault(q),null);
  assert.equal(q.contactList.length,6);assert.equal(q.exchanges[0].attacker,'b');
});
test('another order, from other places: the attacker takes the measure, and the rules hold',()=>{
  const F=FX.FIGHT,q=PW.write([F[0],F[2],F[3],F[6]]);
  assert(q.notes.some(n=>n.kind==='measure'),'no measure was taken');
  assert.equal(fault(q),null);
});
test('the faults found by trying other orders stay fixed: one parried cut three times; a shuffled fight',()=>{
  const F=FX.FIGHT;
  // the parried cut, turned down, used to pass the defender's sword elbow; repeated, it went through it
  assert.equal(fault(PW.write([F[0],F[0],F[0],F[6]])),null);
  // after a cut lands at close measure, the next attacker steps back and used to lower the blade through the other
  assert.equal(fault(PW.write([F[1],F[0],F[4],F[5],F[3],F[6]])),null);
});
test('every result at every hit location, by either fighter, from the opening',()=>{
  const bad=[];let n=0;
  for(const aid of ids)for(const loc of LOCS)
    for(const [o,lost] of RESULTS){
      const q=PW.write([{attacker:aid,loc,outcome:o,lost}]),f=fault(q,8);n++;
      if(f)bad.push(aid+' '+loc+' '+o+': '+f);
      // a blow that gets through marks the part it lands on, and only when damage got through
      if(lost>0&&o==='wound')assert(q.wounds.length===1&&q.wounds[0].who===other[aid],aid+' '+loc+': no wound mark');
      if(o==='armour')assert.equal(q.wounds.length,0);
    }
  assert.deepEqual(bad,[],bad.join('\n'));assert.equal(n,84);
});
// ----- weapons (step 3): profiles, the thrust family, and a sample of the full sweep (tests/sweep/pits-sweep.cjs) -----
test('weapons: a profile per weapon key; short blades and the rapier thrust, the swords cut; others are stand-ins',()=>{
  const q=PW.write([{attacker:'a',loc:'chest',outcome:'wound',lost:3}],{weapons:{a:'dagger',b:'longsword'}});
  assert.equal(q.fighters.a.weapon.len,50);assert.equal(q.fighters.b.weapon.len,104);
  assert.equal(q.exchanges[0].phrase,'thrustLands');
  const P=(fam,r)=>PW.pick({attacker:'a',lost:0,...r},null,fam).id;
  assert.equal(P('thrust',{loc:'chest',outcome:'parried'}),'thrustDeflected');
  assert.equal(P('thrust',{loc:'head',outcome:'miss'}),'thrustMissed');
  assert.equal(P('thrust',{loc:'rleg',outcome:'wound',lost:2}),'thrustLands');
  assert.equal(P('cut',{loc:'chest',outcome:'wound',lost:2}),'cutLands');
  const s=PW.write([{attacker:'a',loc:'chest',outcome:'parried',lost:0}],{weapons:{a:'great-axe'}});
  assert(s.notes.some(n=>n.kind==='stand-in'&&n.weapon==='great-axe'),'an unknown weapon is not noted as a stand-in');
});
test('contact points scale with the blade: the same fraction on a shorter blade, the same blade beyond on a longer one',()=>{
  for(const [w,len] of [['dagger',50],['sword',92],['rapier',112]]){
    const q=PW.write([{attacker:'a',loc:'chest',outcome:'parried',lost:0}],{weapons:{a:'sword',b:w}}),c=q.contactList[0];
    assert(Math.abs(c.b.along-(len<=92?20*len/92:len-72))<1e-9,w+': the parry is at '+c.b.along);}
});
test('the thrust family\'s study (dagger against broadsword) keeps the movement rules',()=>{
  const q=PS.build('thrust');assert.equal(fault(q),null);
  for(const id of ['thrustMissed','thrustDeflected','thrustLands','cutParried','highParry'])
    assert(q.exchanges.some(e=>e.phrase===id),'the study has no '+id);
  assert.equal(q.beats[q.beats.length-1].short,'Collapse');assert(q.lead&&q.title);
});
test('a fight ended by any blow ends in the collapse, with the fallen weapon kept clear of the winner',()=>{
  const END=[{type:'end',winner:'a',how:'injury'}];
  for(const [w,loc] of [['dagger','abdomen'],['sword','chest'],['sword','head'],['rapier','chest']]){
    const q=PW.write([{attacker:'a',loc,outcome:'wound',lost:8,after:END}],{weapons:{a:w,b:'sword'}});
    assert.equal(q.beats[q.beats.length-1].short,'Collapse');assert.equal(fault(q,8),null,w+' '+loc);}
});
test('a sample of the sweep: one pairing per kind (short, long, cut, thrust, both ways), every location, four results',()=>{
  const bad=[];
  for(const [wa,wb] of [['dagger','sword'],['sword','dagger'],['rapier','longsword'],['longsword','rapier'],['shortsword','falchion'],['dagger','rapier']])
    for(const loc of LOCS)for(const [o,lost] of [['parried',0],['wound',3],['armour',0],['miss',0]]){
      const q=PW.write([{attacker:'a',loc,outcome:o,lost}],{weapons:{a:wa,b:wb}}),f=fault(q,8);
      if(f)bad.push(wa+' v '+wb+' '+loc+' '+o+': '+f);}
  assert.deepEqual(bad,[],bad.join('\n'));
});
console.log(passed+' passed');
