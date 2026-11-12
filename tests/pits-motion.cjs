// The Pits movement language (experiments/pits-motion.js): presentation only, and a pure function of time.
// These tests hold the animation direction to its own rules (docs/pits-animation-direction.md):
// bodies stay possible, planted feet stay planted, contacts meet, nothing snaps, exchanges chain from the pose the last
// one left, and the five points the owner raised on 2026-11-12 stay fixed.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const PM=require('../experiments/pits-motion.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const IDS=Object.keys(PM.SEQUENCES),seqs=Object.fromEntries(IDS.map(id=>[id,PM.build(id)]));
const each=f=>{for(const id of IDS)f(seqs[id],id);};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const JOINTS=['P','M','S','Hd','K','F','bK','bF','E','Hn','oE','oHn','tip'];
const BODY=['Hd','S','M','P','K','F','bK','bF','E','oE','oHn'];
// distance from a point to the stretch of blade between the hand and the tip
const toBlade=(p,f,t)=>{
  const a=f.at(t,'Hn'),b=f.at(t,'tip'),vx=b[0]-a[0],vy=b[1]-a[1];
  const u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy)));
  return dist(p,[a[0]+vx*u,a[1]+vy*u]);
};
// the nearest any of `names` on fighter f comes to g's blade between two moments
const nearest=(f,g,t0,t1,names)=>{let m=1e9;for(let t=t0;t<=t1;t+=5)for(const n of names)m=Math.min(m,toBlade(f.at(t,n),g,t));return m;};
const differs=(a,b)=>Math.abs(a.w-b.w)+dist(a.h,b.h)+dist(a.o,b.o)+Math.abs(a.py-b.py)+Math.abs(a.lean-b.lean);
const fight=seqs.fight,A=fight.fighters.a,B=fight.fighters.b,EX=fight.exchanges,CK=fight.checks;
// contact times in the fight: the parried cut, the counter, the beaten thrust, the last cut; and the miss
const T={parry:CK[0].t,counter:CK[2].t,beat:CK[3].t,end:CK[5].t,miss:EX[2].t+480};

test('two sequences: the connected fight and Press Advantage',()=>{
  assert.deepEqual(IDS,['fight','press']);
  assert(fight.dur>3500&&fight.dur<6000);
  each(s=>assert.deepEqual(s.notes,[],'a hand was asked to reach further than the arm'));
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
  // a blow lands with the weapon close to the line of the arm
  assert(Math.abs(A.joints(T.end).grip)<14&&Math.abs(B.joints(T.counter).grip)<8);
});
test('contacts meet: the blades cross at each parry, and a landed blow is on the struck part',()=>{
  each((s,id)=>{for(const c of s.checks){const at=s.fighters[c.who].at(c.t,'blade',c.along);
    assert(dist(at,c.at)<6,id+' '+c.who+' is '+dist(at,c.at).toFixed(1)+' from its contact at '+c.t);}});
  assert.equal(CK.length,6);assert.equal(seqs.press.checks.length,2);
});
test('five connected exchanges, the attacker changing, each starting from the pose the last one ended in',()=>{
  assert.deepEqual(EX.map(e=>e.attacker),['a','b','a','b','a']);
  for(let i=1;i<EX.length;i++){
    assert(EX[i].t>EX[i-1].t+400);
    // nobody is back in the opening guard when the next exchange begins: there is no reset between exchanges
    for(const f of [A,B])assert(differs(f.pose(0),f.pose(EX[i].t))>12,f.id+' is back on guard at exchange '+(i+1));
  }
  // the later cuts start from other stances than the first: the feet are somewhere else, and the cut still arrives
  assert(Math.abs(A.pose(EX[2].t).ffx-A.pose(0).ffx)>4&&Math.abs(A.pose(EX[4].t).bfx-A.pose(0).bfx)>20);
  // the lift that beats the thrust is the load of the last cut: the blade does not come back down in between
  for(let t=T.beat+170;t<=T.end-150;t+=5)assert(A.joints(t).w>95,'the blade dropped before the riposte at '+t);
  // the fighters stay in each other's reach and never pass through each other
  for(let t=0;t<=fight.dur;t+=5){const d=B.at(t,'P')[0]-A.at(t,'P')[0];assert(d>140&&d<270,'hips '+d.toFixed(0)+' apart at '+t);}
});
test('a decision pause freezes a fight in progress, and the fight goes on from exactly that pose',()=>{
  assert.equal(fight.pauses.length,2);assert.equal(seqs.press.pauses.length,1);
  each((s,id)=>{for(const p of s.pauses)for(const w of ['a','b']){const q=s.fighters[w].pose(p.t);
    assert(q.ffy<.01&&q.bfy<.01,id+' '+w+' is mid-step at the pause');
    const lo=Math.min(q.ffx,q.bfx)-4,hi=Math.max(q.ffx,q.bfx)+4;
    assert(q.px>=lo&&q.px<=hi,id+' '+w+' is off balance at the pause');}});
  for(const p of fight.pauses){
    // in progress: neither fighter has gone back to a guard, and the sword is still where the exchange left it (low)
    for(const f of [A,B])assert(differs(f.pose(0),f.pose(p.t))>25,f.id+' looks reset at the pause');
    assert(A.at(p.t,'tip')[1]<A.at(p.t,'Hn')[1]-20,'the sword has been recovered before the decision');
    // resuming: the next movement starts from this pose (no cut to another one) and starts at once
    const j0=PM.frame(fight,p.t),j1=PM.frame(fight,p.t+5),j2=PM.frame(fight,p.t+120);
    for(const w of ['a','b'])for(const n of JOINTS)assert(dist(j0[w].joints[n],j1[w].joints[n])<6,w+'.'+n+' jumps on resume');
    assert(dist(j0.b.joints.Hn,j2.b.joints.Hn)>8,'nothing happens after the pause');
  }
});
test('owner 1, the miss: momentum is carried through a step, on a base wide enough to stand on, without a squat',()=>{
  const t0=T.miss,t1=fight.pauses[1].t;
  for(let t=EX[2].t;t<=t1;t+=5)assert(A.pose(t).py>=68,'the hips sink to '+A.pose(t).py.toFixed(0)+' at '+t);
  // the rear foot comes through after the blade has gone by
  assert(A.pose(t1).bfx-A.pose(t0).bfx>=25&&A.pose(t0+40).bfy<.01);
  const q=A.pose(t1);assert(Math.abs(q.ffx-q.bfx)>=55,'the feet end '+Math.abs(q.ffx-q.bfx).toFixed(0)+' apart');
  // the body goes with the blade: the chest is carried further forward after the miss than at it
  assert(A.at(t0+170,'S')[0]>A.at(t0,'S')[0]+10);
  // and it is a miss: the blade stays clear of the whole defender, dagger included
  const near=nearest(B,A,EX[2].t,t1,[...BODY,'Hn','tip']);assert(near>15,'the blade came within '+near.toFixed(1));
});
test('owner 2, the empty hand: it guards in front or trails long behind, never folded up behind the shoulder',()=>{
  each((s,id)=>{const f=s.fighters.a;for(let t=0;t<=s.dur;t+=5){const p=f.pose(t),j=f.joints(t);
    if(p.o[0]<-5)assert(Math.hypot(p.o[0],p.o[1])>=44,id+' the arm is folded behind the back at '+t);
    assert(j.oE[1]<=j.S[1]+8,id+' the elbow is above the shoulder at '+t);
    assert(p.o[1]<=-8,id+' the hand is up by the shoulder at '+t);}});
  // on guard it is in front of the body; at the end of a cut it is out behind as a counterweight
  assert(A.pose(0).o[0]>10&&A.pose(T.parry).o[0]<-30);
});
test('owner 3, the counter: the dagger fighter has a clear lane and nothing of it crosses the lowered sword',()=>{
  const near=nearest(B,A,EX[1].t,T.counter,BODY);assert(near>25,'the dagger fighter came within '+near.toFixed(1)+' of the blade');
  // the sword lies short of where the front foot comes down, and the thrust goes in above the sword hand
  assert(A.at(T.counter,'tip')[0]<B.at(T.counter,'F')[0]-20);
  assert(B.at(T.counter,'Hn')[1]>A.at(T.counter,'Hn')[1]+25);
  // the redirect itself drops the sword beside its owner without sweeping it through the defender
  assert(nearest(B,A,T.parry+5,EX[1].t,BODY.filter(n=>n!=='E'))>10);
  // and the sword that comes up under the later thrust does not come up through the dagger fighter
  assert(nearest(B,A,EX[3].t,T.beat-30,BODY)>15);
});
test('owner 4, the attack: close measure, one step of the front foot, a compact load, hips then shoulders then blade',()=>{
  assert(PM.SPACING<=220);
  const tc=T.parry,p0=A.pose(tc-480),p1=A.pose(tc);
  assert(Math.abs(differs(p0,A.pose(0)))<.01,'the cut takes 480 ms from stillness');
  assert(p1.ffx-p0.ffx<=40&&Math.abs(p1.bfx-p0.bfx)<.01,'more than one short step');
  for(let t=tc-480;t<=tc;t+=5){const j=A.joints(t);
    assert(j.w<150,'the blade is laid back over the head at '+t);
    assert(j.Hn[1]<j.Hd[1]+PM.DIM.headR+4,'the hilt goes above the head at '+t);}
  // order: the hips have done most of their travel while the blade is still up; the chest turns after; the blade is last
  const a=A.pose(tc-290),b=A.pose(tc-150);
  assert((b.px-a.px)/(p1.px-a.px)>.6);assert(A.joints(tc-150).w>95);
  assert((b.lean+b.bend)-(a.lean+a.bend)<8&&(p1.lean+p1.bend)-(b.lean+b.bend)>15);
  const sp=(t0,t1)=>dist(A.at(t0,'tip'),A.at(t1,'tip'))/(t1-t0);
  assert(sp(tc-60,tc)>sp(tc-480,tc-290)*2.5,'the strike is not much faster than the load');
});
test('owner 5, the collapse: balance goes, then support; nothing is held up; it is over quickly',()=>{
  const tc=T.end,q=t=>B.pose(t);
  // balance first: the shoulders are well behind the hips before the hips have dropped far, and no step catches it
  const tip=[...Array(60).keys()].map(i=>tc+i*5).find(t=>{const j=B.joints(t);return j.S[0]-j.P[0]<-20;});
  assert(tip&&q(tip).py>55,'the hips drop before the body tips');
  for(let t=tc;t<=tc+350;t+=5)assert(q(t).bfy<.01,'a catching step at '+t);
  // support: the hips fall faster as they go, and the front foot comes off the floor
  assert((q(tc+220).py-q(tc+380).py)>(q(tc+60).py-q(tc+220).py)*1.5);
  assert(q(tc+380).ffy>15);
  // the dagger drops at the blow and is never lifted again; seat, back and head land in that order
  assert(B.at(tc+150,'Hn')[1]<B.at(tc,'Hn')[1]-25);
  for(let t=tc+150;t<=fight.dur;t+=5)assert(B.at(t,'tip')[1]<B.at(t,'S')[1]+6,'the dagger is held up at '+t);
  assert(q(tc+440).py<=12&&q(tc+440).lean>-80&&q(tc+520).lean<=-85);
  assert(q(fight.dur).py<20,'the beaten fighter stays down');
  // the winner has stepped back out and the point is down
  assert(A.pose(fight.dur).px<A.pose(tc).px-25&&A.joints(fight.dur).w<-40);
});
test('no common neutral pose: nobody ends in the guard they began in',()=>{
  each((s,id)=>{for(const w of ['a','b']){const f=s.fighters[w];
    assert(differs(f.pose(0),f.pose(s.dur))>12,id+' '+w+' returned to its opening guard');}});
});
test('the impact hold is the only stillness, and it is still',()=>{
  const s=fight,tc=T.parry;
  const a=PM.frame(s,PM.seqTime(s,tc+10)),b=PM.frame(s,PM.seqTime(s,tc+60));
  assert(dist(a.a.joints.tip,b.a.joints.tip)<.01,'the impact hold is still');
  assert.equal(PM.shownDur(s),s.dur+s.stops.reduce((n,x)=>n+x.d,0));assert.equal(s.stops.length,4);
});
test('wounds and effects appear at the contact, not before',()=>{
  assert.deepEqual(PM.frame(fight,T.counter-1).a.wounds,{});assert.equal(PM.frame(fight,T.counter).a.wounds.chest,'minor');
  assert.deepEqual(PM.frame(fight,T.end-1).b.wounds,{});assert.equal(PM.frame(fight,T.end).b.wounds.chest,'major');
});
test('Press Advantage: the point stays in the face and the dagger stays on the blade; no blow, no ground taken',()=>{
  const s=seqs.press,a=s.fighters.a,b=s.fighters.b,th=s.pauses[0].t;
  for(let t=th;t<=th+860;t+=10){
    assert(dist(a.at(t,'tip'),b.at(t,'Hd'))<45,'the point leaves the face at '+t);
    assert(toBlade(b.at(t,'blade',13),a,t)<6,'the dagger leaves the blade at '+t);
    assert(nearest(b,a,t,t,['Hd','S','M','P'])>8,'the press touches the body at '+t);}
  assert.deepEqual(s.wounds,[]);
});
test('presentation only: the module is a pure function of time and touches no rules, dice or page',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','experiments','pits-motion.js'),'utf8').replace(/\/\/.*$/gm,'');
  for(const bad of ['Math.random','CombatRules','document.','localStorage','Date.now','performance.'])assert(!src.includes(bad),bad);
  assert.equal(JSON.stringify(PM.frame(fight,1234)),JSON.stringify(PM.frame(PM.build('fight'),1234)));
});
console.log(passed+' passed');
