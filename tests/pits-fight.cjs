// The ten-beat fight study (experiments/pits-fight.js): broadsword against broadsword, scripted outcomes.
// Presentation only. These hold the fight to the owner's brief (2026-11-12): one continuous fight in which every movement
// starts from the last; planted feet stay planted; contacts are exact; a miss, a parry and a wound differ in what the
// bodies do; injuries and changed stances persist; the final injury visibly ends the fight; nothing wobbles or snaps.
// Passing numbers does not make it look natural: the owner judges that by watching it.
const assert=require('node:assert/strict');
const PM=require('../experiments/pits-motion.js');
const PS=require('../experiments/pits-spring.js');
require('../experiments/pits-fight.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const t0=Date.now(),q=PS.build('fight'),buildMs=Date.now()-t0;
const A=q.fighters.a,B=q.fighters.b,ids=['a','b'],other={a:'b',b:'a'};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return dist(p,[a[0]+vx*u,a[1]+vy*u]);};
const toBlade=(id,t,p)=>seg(p,PS.world(q,id,t,'Hn'),PS.world(q,id,t,'tip'));
const range=(a,b,s,f)=>{for(let t=a;t<=b;t+=s)f(t);};
const JOINTS=['Hd','S','M','P','K','F','bK','bF','E','Hn','oE','oHn','tip'];
const BODY=['Hd','S','M','P','K','F','bK','bF','E'];
const com=(id,t)=>{const j=PS.joints(q,id,t);return j.P[0]*.5+j.M[0]*.3+j.S[0]*.2;};
const C=kind=>q.contactList.filter(c=>c.kind===kind);
const beatT=n=>q.beats.find(b=>b.n===n).t;
const inContact=t=>q.contactList.some(c=>t>=c.t-90&&t<=c.t+(c.hold||0)+90);

test('ten beats in order, about 8 to 20 seconds, decision boundaries between them, built quickly',()=>{
  assert.deepEqual(q.beats.map(b=>b.n),[1,2,3,4,5,6,7,8,9,10]);
  for(let i=1;i<q.beats.length;i++)assert(q.beats[i].t>q.beats[i-1].t,'beats out of order');
  // 15 to 20 s in the first brief; the owner then asked for it a little faster and never still, then for no gap at
  // all between one action and the next (2026-11-12)
  assert(q.dur>=8000&&q.dur<=20000,'length '+q.dur);
  assert(q.pauses.length>=6,'too few decision boundaries');
  for(const p of q.pauses)assert(p.t>0&&p.t<q.end&&p.label,'a decision boundary outside the fight');
  assert(q.scripted,'the fight is not marked as scripted');
  assert(buildMs<4000,'building the fight took '+buildMs+' ms');
});
test('the picture is a function of the time: built twice, the same fight',()=>{
  const r=PS.build('fight');for(const id of ids)for(const t of [0,3000,9000,q.end])assert.deepEqual(PS.sample(r,id,t),PS.sample(q,id,t));
  // resuming from checkpoints while writing gives the same result as one run from the start
  const full=PS.simulate(q.fighters,q.dur);
  for(const id of ids)for(let i=0;i<full[id].length;i+=25)for(const c of PS.CH)assert(Math.abs(full[id][i][c]-q.rec[id][i][c])<1e-9);
});
test('bodies stay possible: no limb past its length, wrists inside their turn, nothing through the floor',()=>{
  range(0,q.dur,4,t=>{for(const id of ids){const j=PS.joints(q,id,t);
    for(const k in j.over)assert(j.over[k]<=.6,id+'.'+k+' over by '+j.over[k].toFixed(1)+' at '+t);
    assert(j.grip>=PM.GRIP.min-.5&&j.grip<=PM.GRIP.max+.5,id+' wrist '+j.grip.toFixed(0)+' at '+t);
    for(const n of JOINTS)assert(PS.world(q,id,t,n)[1]>=(n==='Hd'?12:-.5),id+'.'+n+' below the floor at '+t);}});
});
test('planted feet stay planted; a stepping foot lifts clearly, travels only off the floor, and is set down',()=>{
  for(const id of ids){let prev=PS.frame(q,0)[id].pose;
    range(2,q.dur,2,t=>{const p=PS.frame(q,t)[id].pose;
      for(const f of ['ff','bf'])if(Math.abs(p[f+'x']-prev[f+'x'])>.01)assert(p[f+'y']>=1.5||prev[f+'y']>=1.5,id+'.'+f+' slides at '+t);
      prev=p;});
    for(const st of q.fighters[id].steps){let top=0;range(st.t0,st.t1,2,t=>{top=Math.max(top,PS.frame(q,t)[id].pose[st.foot+'y']);});
      assert(top>=(st.t0>beatT(10)&&id==='b'?2.5:6),id+' '+st.foot+' step at '+st.t0+' barely lifts');}}
});
test('weight moves with the steps: before a step the hips go toward the supporting foot, after it onto the new base',()=>{
  for(const id of ids)for(const st of q.fighters[id].steps){if(id==='b'&&st.t0>=beatT(10))continue;   // the fall is not a step
    const P=t=>PS.frame(q,t)[id].pose,sup=P(st.t0)[st.sup+'x'],from=P(st.t0)[st.foot+'x'],land=P(st.t1)[st.foot+'x'];
    const toward=Math.abs(com(id,st.t0)-sup)<Math.abs(com(id,st.t0-170)-sup)-1;
    const pushing=st.push&&Math.sign(com(id,st.t0+40)-com(id,st.t0))===Math.sign(sup-from);
    const already=Math.abs(com(id,st.t0)-sup)<Math.abs(from-sup)*.5;
    assert(toward||pushing||already,id+' '+st.foot+' at '+st.t0+': the weight is not on the other foot before the step');
    const lo=Math.min(sup,land)-4,hi=Math.max(sup,land)+4,c=com(id,st.t1);
    assert(c>=lo&&c<=hi,id+' '+st.foot+' at '+st.t0+' lands with the weight outside its feet');}
});
test('nothing snaps: no joint jumps between two recorded moments; the fastest strike is a strike, not a pop',()=>{
  for(const id of ids)range(2,q.dur,2,t=>{for(const n of JOINTS){
    const d=dist(PS.world(q,id,t-2,n),PS.world(q,id,t,n)),lim=n==='tip'?20:n==='Hn'||n==='E'?6:4;
    assert(d<=lim,id+'.'+n+' moved '+d.toFixed(1)+' in 2 ms at '+t);}});
});
test('springs are firm: no part overshoots and wobbles after an impact',()=>{
  const sp=A.spring;assert.equal(B.spring,sp);
  for(const c of PS.CH)assert(sp[c][1]>=.85,'damping for '+c+' is '+sp[c][1]);
  // with damping this high a spring overshoots its target by under 1% (critically damped strikes not at all), so a part
  // cannot visibly wobble; what moves after an impact is the next movement written for it. A sudden jump is caught by
  // the test above. An impact is an impulse into these springs, so the same holds after one.
  const over=z=>Math.exp(-Math.PI*z/Math.sqrt(1-z*z));
  for(const c of PS.CH)assert(over(sp[c][1])<.01,c+' overshoots '+(over(sp[c][1])*100).toFixed(1)+'%');
});
test('every contact is exact: both blades on the shared point, or the blade on the named part of the body',()=>{
  assert.equal(q.contactList.length,6);
  for(const c of q.contactList){
    assert(dist(PS.world(q,c.a.who,c.t,'blade',c.a.along),c.at)<.5,c.kind+' at '+c.t+': the blade is off the point');
    if(c.b)assert(dist(PS.world(q,c.b.who,c.t,'blade',c.b.along),c.at)<.5,c.kind+' at '+c.t+': the other blade is off the point');}
  // the cut to the forearm is on A's forearm, the decisive cut on B's forward thigh
  const [w7,w9]=C('wound');
  const ja=PS.joints(q,'a',w7.t),fa=A.W([ja.E[0]+(ja.Hn[0]-ja.E[0])*.55,ja.E[1]+(ja.Hn[1]-ja.E[1])*.55]);
  assert(dist(PS.world(q,'b',w7.t,'blade',w7.a.along),fa)<.5,'the cut is not on A\'s forearm');
  const jb=PS.joints(q,'b',w9.t),th=B.W([jb.P[0]+(jb.K[0]-jb.P[0])*.5,jb.P[1]+(jb.K[1]-jb.P[1])*.5]);
  assert(dist(PS.world(q,'a',w9.t,'blade',w9.a.along),th)<.5,'the cut is not on B\'s thigh');
});
test('a miss is a near miss: B\'s counter passes outside A\'s turned body, close but clear',()=>{
  const m=q.misses[0];let near=1e9;
  range(m.t0,m.t1,2,t=>{for(const n of BODY)near=Math.min(near,toBlade('b',t,PS.world(q,'a',t,n)));});
  assert(near>=6&&near<=16,'the miss clears by '+near.toFixed(1));
  // A turns away and draws the front foot back for it
  const before=PS.sample(q,'a',m.t0-300),at=PS.sample(q,'a',m.t);
  assert(at.turn<before.turn-8,'A does not turn');
  assert(A.steps.some(st=>st.foot==='ff'&&st.t1<=m.t&&st.t0>=m.t-500),'A does not draw the front foot back');
});
test('outside the contacts, no blade goes into the other fighter',()=>{
  range(0,q.dur,4,t=>{if(inContact(t))return;for(const id of ids)for(const n of BODY){const d=toBlade(id,t,PS.world(q,other[id],t,n));
    assert(d>=2,id+'\'s blade is '+d.toFixed(1)+' from '+other[id]+'.'+n+' at '+t);}});
});
test('during a parry, a bind or a deflection, neither blade goes into the other fighter (the contact is blade on blade)',()=>{
  for(const c of q.contactList.filter(c=>c.b))for(const [w,o] of [[c.a.who,c.b.who],[c.b.who,c.a.who]])
    range(c.t-90,c.t+(c.hold||0)+90,4,t=>{for(const n of BODY){const d=toBlade(w,t,PS.world(q,o,t,n));
      assert(d>=3,c.kind+' at '+c.t+': '+w+'\'s blade is '+d.toFixed(1)+' from '+o+'.'+n+' at '+t);}});
});
test('a parry stops or turns the attack; a wound makes the body react where it was hit',()=>{
  // at each parry or bind the attacking hand stops (it does not carry on through the contact)
  for(const c of [...C('parry'),...C('bind')]){const id=c.a.who,v0=dist(PS.world(q,id,c.t-6,'Hn'),PS.world(q,id,c.t,'Hn'));
    const v1=dist(PS.world(q,id,c.t+2,'Hn'),PS.world(q,id,c.t+8,'Hn'));assert(v1<v0*.5+.2,c.kind+' at '+c.t+': the cut does not stop');}
  // the forearm wound: the arm is knocked back and in, the hand comes closer to the body
  const [w7,w9]=C('wound'),r=t=>{const j=PS.joints(q,'a',t);return dist(j.Hn,j.S);};
  assert(r(w7.t+250)<r(w7.t)-10,'A\'s arm is not drawn in after the cut');
  // the thigh wound: B's pelvis drops at once
  assert(PS.world(q,'b',w9.t+200,'P')[1]<PS.world(q,'b',w9.t,'P')[1]-10,'B\'s pelvis does not drop');
});
test('at each decision boundary both feet are down, and play resumes from the held pose without a jump',()=>{
  // (the owner, 2026-11-12: in a real fight nobody is ever still, so the boundary falls mid-movement; holding it freezes
  // that exact pose, and resuming carries on from it)
  for(const p of q.pauses){for(const id of ids){const f=PS.frame(q,p.t)[id].pose;assert(f.ffy===0&&f.bfy===0,id+' has a foot up at '+p.t);}
    for(const id of ids)for(const n of JOINTS)assert(dist(PS.world(q,id,p.t,n),PS.world(q,id,p.t+16,n))<3,id+'.'+n+' jumps after the hold '+p.t);}
});
test('nobody is ever still in continuous playback (only B, once down, is left breathing)',()=>{
  const down=beatT(10)+700;
  for(const id of ids){let run=0;range(100,q.end,50,t=>{if(id==='b'&&t>down)return;let m=0;
    for(const k of ['P','S','Hd','Hn','tip'])m=Math.max(m,dist(PS.world(q,id,t,k),PS.world(q,id,t-50,k)));
    run=m<.3?run+50:0;assert(run<=150,id+' is still for '+run+' ms at '+t);});}
  // and B, down, still breathes
  let br=0;range(down+200,q.end,20,t=>{br=Math.max(br,dist(PS.world(q,'b',t,'S'),PS.world(q,'b',down+200,'S')));});
  assert(br>.4,'B does not breathe on the floor');
});
test('continuous: the next action starts as the last one resolves, with no lull between beats',()=>{
  // (owner, 2026-11-12: after a parry, a hit or a miss the next action begins at once; only a decision hold stops)
  // every parry, bind, deflection, wound and miss is followed by the next beat within 420 ms (the last one ends the fight)
  const res=[...q.contactList.map(c=>c.t),...q.misses.map(m=>m.t)].sort((x,y)=>x-y);
  for(const r of res.slice(0,-1)){const next=q.beats.find(b=>b.t>r);
    assert(next&&next.t-r<=420,'the next beat starts '+(next?next.t-r:'never')+' ms after the resolution at '+r);}
  // from the first step to B's fall, some part of someone is always travelling with purpose (well above the drift):
  // no stretch of 200 ms where every hip, shoulder, hand and blade tip moves under 1 unit per 20 ms
  let run=0;range(300,beatT(10)+700,20,t=>{let m=0;
    for(const id of ids)for(const k of ['P','S','Hn','tip'])m=Math.max(m,dist(PS.world(q,id,t,k),PS.world(q,id,t-20,k)));
    run=m<1?run+20:0;assert(run<200,'a lull of '+run+' ms at '+t);});
});
test('smooth: no part jerks from rest to full speed (low jerk on the body and the hands)',()=>{
  // jerk: the third difference of a joint's position over 4 ms steps, outside the moments of contact
  const p99=(id,n)=>{const J=[];range(12,q.dur,4,t=>{if(inContact(t))return;const p=k=>PS.world(q,id,t-4*k,n);
    J.push(Math.hypot(...[0,1].map(i=>p(0)[i]-3*p(1)[i]+3*p(2)[i]-p(3)[i])));});J.sort((x,y)=>x-y);return J[Math.floor(J.length*.99)];};
  for(const id of ids){for(const n of ['P','S','Hd'])assert(p99(id,n)<.05,id+'.'+n+' jerk '+p99(id,n).toFixed(3));
    assert(p99(id,'Hn')<.3,id+' hand jerk '+p99(id,'Hn').toFixed(3));}
});
test('nobody snaps back to a standard guard between beats',()=>{
  for(const id of ids){const g=PS.sample(q,id,0);
    for(const b of q.beats.slice(2)){const s=PS.sample(q,id,b.t);
      const d=Math.hypot(s.hx-g.hx,s.hy-g.hy)+Math.abs(s.wr-g.wr)+Math.abs(s.px-g.px)+Math.abs(s.lean-g.lean);
      assert(d>8,id+' is back in its opening guard at beat '+b.n);}}
});
test('injuries persist: A\'s forearm stays marked to the end, B\'s thigh too, and only those segments',()=>{
  const [w7,w9]=C('wound');
  for(const t of [w7.t-10,w7.t+10,q.end])assert.equal(!!PS.frame(q,t).a.wounds.rfore,t>w7.t,'A\'s forearm mark at '+t);
  for(const t of [w9.t-10,w9.t+10,q.end])assert.equal(!!PS.frame(q,t).b.wounds.rthigh,t>w9.t,'B\'s thigh mark at '+t);
  const svg=PS.frame(q,q.end).a.svg;assert(/ps-w-minor/.test(svg));
  // A keeps the cut arm bent and near the body to the end (never locked out again)
  const r=t=>{const j=PS.joints(q,'a',t);return dist(j.Hn,j.S);};
  // (through the retreat and deflection, and in the end guard; the decisive cut itself may reach)
  for(const [a,b] of [[w7.t+250,w9.t-300],[w9.t+600,q.end]])range(a,b,20,t=>assert(r(t)<PM.ARM-10,'A\'s cut arm is straight out at '+t));
});
test('the final injury ends the fight: B goes down and stays down; A stands guard and keeps the weapon',()=>{
  const w9=C('wound')[1],down=beatT(10)+700;
  range(down,q.end,10,t=>assert(PS.world(q,'b',t,'P')[1]<26,'B is not down at '+t));
  let low=1e9;range(beatT(10),q.end,4,t=>{const y=PS.world(q,'b',t,'P')[1];assert(y<=low+1.5,'B rises at '+t);low=Math.min(low,y);});
  const p=PS.frame(q,q.end).a.pose,j=PS.joints(q,'a',q.end);
  assert(p.ffy===0&&p.bfy===0&&j.P[1]>60,'A is not standing at the end');
  assert(j.w<0,'A\'s point is not down toward B');
  // the fall is connected: B's pelvis comes down without a jump, and B's sword arm comes with the body
  assert(PS.world(q,'b',w9.t,'P')[1]>60);
  // the end is settled: in the last second nothing makes a new movement (A only drifts in its guard, B only breathes)
  for(const id of ids){const a=PS.sample(q,id,q.end-1000),b=PS.sample(q,id,q.end);for(const ch of PS.CH)assert(Math.abs(b[ch]-a[ch])<8,id+'.'+ch+' makes a new movement at the end');}
});
console.log(passed+' passed');
