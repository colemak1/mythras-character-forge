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
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return dist(p,[a[0]+vx*u,a[1]+vy*u]);};
const BODY=['Hd','S','M','P','K','F','bK','bF','E'],J=[...BODY,'Hn','oE','oHn','tip'],ids=['a','b'],other={a:'b',b:'a'};
// the movement rules of tests/pits-fight.cjs that hold for any fight (the first fault found, or null)
function fault(q,step){
  step=step||4;
  const inC=t=>q.contactList.some(c=>t>=c.t-90&&t<=c.t+(c.hold||0)+90);
  for(let t=0;t<=q.dur;t+=step)for(const id of ids){const j=PS.joints(q,id,t);
    for(const k in j.over)if(j.over[k]>.6)return id+'.'+k+' over its length at '+t;
    if(!inC(t))for(const n of BODY){const d=seg(PS.world(q,other[id],t,n),PS.world(q,id,t,'Hn'),PS.world(q,id,t,'tip'));
      if(d<2)return id+'\'s blade '+d.toFixed(1)+' from '+other[id]+'.'+n+' at '+t;}}
  for(const c of q.contactList){
    if(dist(PS.world(q,c.a.who,c.t,'blade',c.a.along),c.at)>.5)return c.kind+' at '+c.t+': the blade is off the point';
    if(c.b&&dist(PS.world(q,c.b.who,c.t,'blade',c.b.along),c.at)>.5)return c.kind+' at '+c.t+': the other blade is off the point';}
  for(const p of q.pauses)for(const id of ids){const f=PS.frame(q,p.t)[id].pose;if(f.ffy||f.bfy)return id+' has a foot up at the boundary '+p.t;
    for(const n of J)if(dist(PS.world(q,id,p.t,n),PS.world(q,id,p.t+16,n))>=3)return id+'.'+n+' jumps after the boundary '+p.t;}
  for(const id of ids){let prev=PS.frame(q,0)[id].pose;for(let t=2;t<=q.dur;t+=2){const p=PS.frame(q,t)[id].pose;
    for(const f of ['ff','bf'])if(Math.abs(p[f+'x']-prev[f+'x'])>.01&&p[f+'y']<1.5&&prev[f+'y']<1.5)return id+'.'+f+' slides at '+t;prev=p;}}
  for(let t=2;t<=q.dur;t+=2)for(const id of ids)for(const n of J){const d=dist(PS.world(q,id,t-2,n),PS.world(q,id,t,n));
    if(d>(n==='tip'?20:n==='Hn'||n==='E'?6:4))return id+'.'+n+' snaps '+d.toFixed(1)+' at '+t;}
  return null;
}
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
  for(const aid of ids)for(const loc of ['head','chest','abdomen','rarm','larm','rleg','lleg'])
    for(const [o,lost] of [['parried',0],['partial-parry',2],['wound',3],['armour',0],['miss',0],['evaded',0]]){
      const q=PW.write([{attacker:aid,loc,outcome:o,lost}]),f=fault(q,8);n++;
      if(f)bad.push(aid+' '+loc+' '+o+': '+f);
      // a blow that gets through marks the part it lands on, and only when damage got through
      if(lost>0&&o==='wound')assert(q.wounds.length===1&&q.wounds[0].who===other[aid],aid+' '+loc+': no wound mark');
      if(o==='armour')assert.equal(q.wounds.length,0);
    }
  assert.deepEqual(bad,[],bad.join('\n'));assert.equal(n,84);
});
console.log(passed+' passed');
