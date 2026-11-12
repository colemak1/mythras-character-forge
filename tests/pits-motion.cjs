// The Pits movement language (experiments/pits-motion.js): presentation only, and a pure function of time.
// These tests hold the animation direction to its own rules (docs/pits-animation-direction.md):
// bodies stay possible, planted feet stay planted, contacts meet, nothing snaps, and no phrase ends in the guard it began in.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const PM=require('../experiments/pits-motion.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const IDS=Object.keys(PM.SEQUENCES),seqs=Object.fromEntries(IDS.map(id=>[id,PM.build(id)]));
const each=f=>{for(const id of IDS)f(seqs[id],id);};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const JOINTS=['P','M','S','Hd','K','F','bK','bF','E','Hn','oE','oHn','tip'];

test('the six sequences exist and the first is the connected bout',()=>{
  assert.deepEqual(IDS,['bout','exchange','miss','hit','press','finish']);
  each(s=>{assert(s.dur>1500&&s.dur<4000);assert.deepEqual(s.notes,[],'a hand was asked to reach further than the arm');});
});
test('bodies stay possible: no leg or arm is ever stretched past its length, nothing goes through the floor',()=>{
  each((s,id)=>{for(let t=0;t<=s.dur;t+=5){const f=PM.frame(s,t);
    for(const w of ['a','b']){const j=f[w].joints;
      for(const k in j.over)assert(j.over[k]<=.6,id+' '+w+'.'+k+' over by '+j.over[k].toFixed(1)+' at '+t);
      for(const n of JOINTS)assert(j[n][1]>=(n==='Hd'?12:n==='tip'?-4:-.01),id+' '+w+'.'+n+' below the floor at '+t);}}});
});
test('a planted foot does not slide: it moves only while it is off the floor',()=>{
  each((s,id)=>{for(const w of ['a','b']){const f=s.fighters[w];let prev=f.pose(0);
    for(let t=5;t<=s.dur;t+=5){const p=f.pose(t);
      for(const foot of ['ff','bf']){
        const lying=p.py<30;   // a fallen fighter's leg may straighten along the floor
        if(!lying&&p[foot+'y']<.01&&prev[foot+'y']<.01)assert(Math.abs(p[foot+'x']-prev[foot+'x'])<.01,id+' '+w+'.'+foot+' slides at '+t);}
      prev=p;}}});
});
test('one continuous motion: no joint jumps between two moments, including across the impact holds',()=>{
  each((s,id)=>{let prev=PM.frame(s,0);
    for(let td=5;td<=PM.shownDur(s);td+=5){const f=PM.frame(s,PM.seqTime(s,td));
      for(const w of ['a','b'])for(const n of JOINTS){
        const d=dist(f[w].joints[n],prev[w].joints[n]);assert(d<(n==='tip'?34:22),id+' '+w+'.'+n+' jumps '+d.toFixed(1)+' at '+td);}
      prev=f;}});
});
test('the weapon is held, not hinged: the blade never turns further from the forearm than a wrist can',()=>{
  each((s,id)=>{for(let t=0;t<=s.dur;t+=5)for(const w of ['a','b']){const g=PM.frame(s,t)[w].joints.grip;
    assert(g>=PM.GRIP.min-.5&&g<=PM.GRIP.max+.5,id+' '+w+' wrist at '+g.toFixed(0)+' degrees at '+t);}});
  // between keys the blade rides with the arm: when the forearm swings, the blade swings with it
  const A=seqs.exchange.fighters.a,j0=A.joints(500),j1=A.joints(610);
  const fore=j=>j.w-j.grip;assert(Math.abs((j1.w-j0.w)-(fore(j1)-fore(j0)))<40);
  // a blow lands with the weapon in line with the arm
  assert(Math.abs(seqs.hit.fighters.a.joints(640).grip)<12);
});
test('contacts meet: the blades cross at the parry, and a landed blow is on the struck part',()=>{
  each((s,id)=>{for(const c of s.checks){const at=s.fighters[c.who].at(c.t,'blade',c.along);
    assert(dist(at,c.at)<6,id+' '+c.who+' is '+dist(at,c.at).toFixed(1)+' from its contact at '+c.t);}});
  assert(seqs.exchange.checks.length===3&&seqs.hit.checks.length===1);
});
test('a miss touches nothing: the blade stays clear of the defender for the whole cut',()=>{
  const s=seqs.miss;let near=1e9;
  for(let t=0;t<=s.dur;t+=5){const tip=s.fighters.a.at(t,'tip');
    for(const n of ['Hd','S','M','P','K','F','Hn','oHn'])near=Math.min(near,dist(tip,s.fighters.b.at(t,n)));}
  assert(near>15,'the point came within '+near.toFixed(1));
});
test('no common neutral pose: every fighter ends in a different guard from the one it began in',()=>{
  each((s,id)=>{for(const w of ['a','b']){const a=s.fighters[w].pose(0),b=s.fighters[w].pose(s.dur);
    const diff=Math.abs(a.w-b.w)+dist(a.h,b.h)+dist(a.o,b.o)+Math.abs(a.py-b.py)+Math.abs(a.lean-b.lean);
    assert(diff>12,id+' '+w+' returned to its opening guard');}});
});
test('the fighters end where the engine has them: back at measure, unless one is down',()=>{
  each((s,id)=>{const a=s.fighters.a.pose(s.dur),b=s.fighters.b.pose(s.dur);
    assert(Math.abs(a.px)<8,id+' sword ends '+a.px.toFixed(0)+' from its place');
    if(id!=='finish')assert(Math.abs(b.px)<8,id+' dagger ends '+b.px.toFixed(0)+' from its place');});
  assert(seqs.finish.fighters.b.pose(seqs.finish.dur).py<20,'the beaten fighter stays down');
});
test('a decision pause is a pose that can be held: weight between the feet, both feet down',()=>{
  each((s,id)=>{for(const p of s.pauses)for(const w of ['a','b']){const q=s.fighters[w].pose(p.t);
    assert(q.ffy<.01&&q.bfy<.01,id+' '+w+' is mid-step at the pause');
    const lo=Math.min(q.ffx,q.bfx)-4,hi=Math.max(q.ffx,q.bfx)+4;
    assert(q.px>=lo&&q.px<=hi,id+' '+w+' is off balance at the pause');}});
  assert(seqs.exchange.pauses.length===1&&seqs.press.pauses.length===1&&seqs.bout.pauses.length===2);
});
test('the strike has changes of speed: slow to load, fastest into contact, still at the impact hold',()=>{
  const s=seqs.exchange,A=s.fighters.a,tc=s.checks[0].t,sp=(t0,t1)=>dist(A.at(t0,'tip'),A.at(t1,'tip'))/(t1-t0);
  const load=sp(tc-520,tc-300),strike=sp(tc-60,tc);
  assert(strike>load*3.5,'strike '+strike.toFixed(2)+' against load '+load.toFixed(2));
  const a=PM.frame(s,PM.seqTime(s,tc+10)),b=PM.frame(s,PM.seqTime(s,tc+60));
  assert(dist(a.a.joints.tip,b.a.joints.tip)<.01,'the impact hold is still');
  assert.equal(PM.shownDur(s),s.dur+150);
});
test('the hips lead and the blade follows: the pelvis has done most of its travel while the blade is still back',()=>{
  const A=seqs.exchange.fighters.a,tc=640,p0=A.pose(tc-300),p1=A.pose(tc-110),p2=A.pose(tc);
  assert((p1.px-p0.px)/(p2.px-p0.px)>.6);
  assert(A.joints(tc-110).w>95,'the blade is still upright by the shoulder when the hips have gone');
  // no big wind-up: the hand never goes above the head while preparing
  for(let t=tc-520;t<=tc-150;t+=10){const j=A.joints(t);assert(j.Hn[1]<j.Hd[1]+4,'hand above the head at '+t);}
});
test('three connected exchanges: the attacker changes, and each begins from the pose the last one left',()=>{
  const s=seqs.bout;
  assert.deepEqual(s.exchanges.map(e=>e.attacker),['a','b','a']);
  assert.deepEqual(s.exchanges.slice(1).map(e=>e.t0),s.pauses.map(p=>p.t),'each later exchange starts at a decision pause');
  // at a pause nobody has gone back to a guard: the fighters are closer than measure and not in their opening poses
  for(const p of s.pauses){
    const a=s.fighters.a.pose(p.t),b=s.fighters.b.pose(p.t),a0=s.fighters.a.pose(0),b0=s.fighters.b.pose(0);
    assert(dist(a.h,a0.h)+dist(b.h,b0.h)>30,'a guard was resumed at the pause at '+p.t);
    // resuming continues from exactly that position: nothing moves in the first instant
    const f0=PM.frame(s,p.t),f1=PM.frame(s,p.t+1);
    for(const w of ['a','b'])for(const n of JOINTS)assert(dist(f0[w].joints[n],f1[w].joints[n])<1.5,w+'.'+n+' jumps on resume');
  }
  assert(s.fighters.b.pose(s.pauses[1].t).px>20,'the dagger is still in close at the second pause');
});
test('the counter has a clear route: while the dagger goes in, the sword stays off the dagger fighter',()=>{
  const segd=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1];let u=((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy);
    u=Math.max(0,Math.min(1,u));return Math.hypot(p[0]-a[0]-u*vx,p[1]-a[1]-u*vy);};
  for(const id of ['bout','exchange']){const s=seqs[id],A=s.fighters.a,B=s.fighters.b;
    for(const c of s.clear)for(let t=c.t0;t<=c.t1;t+=5){
      const h=A.at(t,'blade',14),tip=A.at(t,'tip');
      for(const n of ['Hd','S','M','P','K','F','bK','bF']){
        const d=segd(B.at(t,n),h,tip)-(n==='Hd'?PM.DIM.headR:5);
        assert(d>8,id+': the sword is '+d.toFixed(1)+' from the dagger fighter\'s '+n+' at '+t);}}}
});
test('a miss is caught with a step, not a squat; a collapse is a fall, not a sit',()=>{
  const m=seqs.miss,A=m.fighters.a,q=A.pose(m.pauses[0].t);
  assert(Math.abs(q.ffx-q.bfx)>=45,'feet '+Math.abs(q.ffx-q.bfx).toFixed(0)+' apart after the miss');
  assert(q.py>=68,'hips at '+q.py.toFixed(0)+' after the miss');
  // the rear foot moved to catch the weight
  assert(Math.abs(q.bfx-A.pose(0).bfx)>4);
  const f=seqs.finish,B=f.fighters.b,tc=f.checks[0].t;
  // a catching step is tried before the hips go down, the body is already toppling back as they drop, and the arms hang
  assert(B.pose(tc+260).bfx<B.pose(tc).bfx-20&&B.pose(tc+260).py>55);
  assert(B.pose(tc+450).lean<-30);
  const j=B.joints(tc+300);assert(j.Hn[1]<j.S[1]-45,'the dagger arm is not hanging');
});
test('wounds and effects appear at the contact, not before',()=>{
  const s=seqs.hit,tc=s.wounds[0].t;
  assert.deepEqual(PM.frame(s,tc-1).b.wounds,{});assert.equal(PM.frame(s,tc).b.wounds.chest,'serious');
});
test('presentation only: the module is a pure function of time and touches no rules, dice or page',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','experiments','pits-motion.js'),'utf8').replace(/\/\/.*$/gm,'');
  for(const bad of ['Math.random','CombatRules','document.','localStorage','Date.now','performance.'])assert(!src.includes(bad),bad);
  assert.equal(JSON.stringify(PM.frame(seqs.exchange,1234)),JSON.stringify(PM.frame(PM.build('exchange'),1234)));
});
console.log(passed+' passed');
