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
// ----- shields (step 3, second family) -----
test('shields: sized by type, carried forward; a shield parry or a ward meets the blow on the shield\'s face',()=>{
  const q=PW.write([{attacker:'a',loc:'chest',outcome:'parried',lost:0,defence:'shield'}],{shields:{b:'heater'}});
  assert.equal(q.fighters.b.shieldR,19);assert.equal(q.fighters.a.shieldR,0);
  const c=q.contactList[0];assert(c.b.shield===19&&c.b.ctr,'the parry is not on the shield');assert.equal(fault(q),null);
  // a ward is the shield's, with no record of a parry
  const w=PW.write([{attacker:'a',loc:'rleg',outcome:'full-ward',lost:0}],{shields:{b:'kite'}});
  assert(w.contactList[0].b.shield===23);assert.equal(fault(w),null);
  // a shield defence by a fighter without one is drawn with the blade, and noted
  const n=PW.write([{attacker:'a',loc:'chest',outcome:'parried',lost:0,defence:'shield'}]);
  assert(n.contactList[0].b.along>0);assert(n.notes.some(x=>x.kind==='stand-in'&&/no shield/.test(x.why||'')));
  // the shield is drawn on the off hand
  assert(/ps-shield/.test(PS.frame(q,0).b.svg)&&!/ps-shield/.test(PS.frame(q,0).a.svg));
});
test('a shield strike: the face lands on the target and knocks back, is met by the blade, or stops short',()=>{
  const S={weapons:{a:'sword',b:'sword'},shields:{a:'heater'}};
  const land=PW.write([{attacker:'a',strike:'shield',loc:'chest',outcome:'wound',lost:2}],S),c=land.contactList[0];
  assert.equal(land.exchanges[0].phrase,'shieldStrike');assert(c.a.shield===19&&!c.b);
  const back=t=>PS.world(land,'b',t,'P')[0];assert(back(c.t+500)>back(c.t)+15,'the defender is not knocked back');
  const met=PW.write([{attacker:'a',strike:'shield',loc:'chest',outcome:'parried',lost:0}],S).contactList[0];
  assert(met.a.shield&&met.b.along>0);
  const miss=PW.write([{attacker:'a',strike:'shield',loc:'chest',outcome:'miss',lost:0}],S);
  assert.equal(miss.contactList.length,0);assert(miss.misses[0].shield);
  for(const q of [land,miss])assert.equal(fault(q,8),null);
});
test('the shields study (broadsword and heater against broadsword and buckler) keeps the movement rules',()=>{
  const q=PS.build('shields');assert.equal(fault(q),null);
  assert(q.contactList.filter(c=>(c.a&&c.a.shield)||(c.b&&c.b.shield)).length>=4,'too few shield contacts');
  for(const id of ['shieldStrike','lowBind','highParry','cutParried'])assert(q.exchanges.some(e=>e.phrase===id),'no '+id);
});
test('a sample of the shield sweep: shield parries, wards and shield strikes, every location',()=>{
  const bad=[];
  for(const [wa,sa,wb,sb] of [['sword','heater','sword','buckler'],['dagger','buckler','rapier','kite'],['longsword','scutum','shortsword','heater']]){
    const opt={weapons:{a:wa,b:wb},shields:{a:sa,b:sb}};
    for(const loc of LOCS)for(const r of [{outcome:'parried',lost:0,defence:'shield'},{outcome:'full-ward',lost:0},
      {strike:'shield',outcome:'wound',lost:2},{strike:'shield',outcome:'parried',lost:0}]){
      const q=PW.write([{attacker:'a',loc,...r}],opt),f=fault(q,8);if(f)bad.push(wa+'/'+sa+' v '+wb+'/'+sb+' '+loc+' '+JSON.stringify(r)+': '+f);}}
  assert.deepEqual(bad,[],bad.join('\n'));
});
test('a failed parry still looks tried: the defender goes for the parry, late and short, and the blow lands',()=>{
  // the record says so (tried), or names a defence for a blow that landed in full
  for(const r of [{tried:'parry'},{defence:'parry'}]){
    const q=PW.write([{attacker:'a',loc:'chest',outcome:'wound',lost:3,...r}]);
    assert(q.notes.some(n=>n.kind==='late parry'&&n.who==='b'),JSON.stringify(r)+': no late parry');
    assert.equal(q.contactList.length,1);assert.equal(q.contactList[0].kind,'wound');assert.equal(fault(q),null);
    // at the blow, the defender's sword hand and blade are well on their way to the parry (sword against sword: the
    // hand about 25 units from where it would be, the blade turned about 50 degrees)
    const p=PW.write([{attacker:'a',loc:'chest',outcome:'wound',lost:3}]),tc=q.contactList[0].t;
    const h=s=>PS.world(s,'b',tc,'Hn'),dh=Math.hypot(h(q)[0]-h(p)[0],h(q)[1]-h(p)[1]);
    assert(dh>15,'the parry is not attempted (the hand is '+dh.toFixed(1)+' from where it would be)');
    assert(PS.joints(q,'b',tc).w-PS.joints(p,'b',tc).w>30,'the blade does not turn toward the parry');
  }
  // with the shield, at every height; and nothing is tried when no defence was made
  for(const loc of ['head','chest','rleg']){const q=PW.write([{attacker:'a',loc,outcome:'wound',lost:3,tried:'shield'}],{shields:{b:'heater'}});
    assert(q.notes.some(n=>n.kind==='late parry'&&n.with==='shield'));assert.equal(fault(q),null);}
  assert(!PW.write([{attacker:'a',loc:'chest',outcome:'wound',lost:3}]).notes.some(n=>n.kind==='late parry'));
  // a sample across weapons
  const bad=[];for(const [wa,wb] of [['falchion','rapier'],['rapier','dagger'],['dagger','longsword']])for(const loc of LOCS){
    const q=PW.write([{attacker:'a',loc,outcome:'armour',lost:0,tried:'parry'}],{weapons:{a:wa,b:wb}}),f=fault(q,8);if(f)bad.push(wa+' v '+wb+' '+loc+': '+f);}
  assert.deepEqual(bad,[],bad.join('\n'));
});
console.log(passed+' passed');
