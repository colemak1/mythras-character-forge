// The spring-driven exchange study (experiments/pits-spring.js): one attack, parry, counter, wound and recovery.
// Presentation only. These hold the study to what the owner asked to inspect (docs/pits-animation-direction.md,
// "Spring exchange study"): bodies possible and on the ground, one shared contact point, clearance, a local wound
// reaction, held poses that stand still, continuation without a snap, and end stances that are new.
// Passing numbers does not make the fight look natural; that is judged by watching it.
const assert=require('node:assert/strict');
const PM=require('../experiments/pits-motion.js');
const PS=require('../experiments/pits-spring.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const q=PS.build(),A=q.fighters.a,B=q.fighters.b,pc=q.contacts.parry;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy)));
  return dist(p,[a[0]+vx*u,a[1]+vy*u]);};
const toSword=(p,t)=>seg(p,PS.world(q,'a',t,'Hn'),PS.world(q,'a',t,'tip'));
const JOINTS=['Hd','S','M','P','K','F','bK','bF','E','Hn','oE','oHn','tip'];
const BODY=['Hd','S','M','P','K','F','bK','bF'];
const range=(t0,t1,step,f)=>{for(let t=t0;t<=t1;t+=step)f(t);};

test('the exchange is built the same way every time (the picture is a function of the time)',()=>{
  const r=PS.build();
  for(const id of ['a','b'])for(const t of [0,pc.t,q.P1,q.tk,q.end])assert.deepEqual(PS.sample(r,id,t),PS.sample(q,id,t));
  assert(q.tc<q.P1&&q.P1<q.tk&&q.tk<q.end&&q.end<q.dur);
});
test('bodies stay possible: no arm or leg reaches past its length, nothing below the floor, the wrist within its turn',()=>{
  range(0,q.dur,2,t=>{for(const id of ['a','b']){const j=PS.joints(q,id,t);
    for(const k in j.over)assert(j.over[k]<=.6,id+'.'+k+' over by '+j.over[k].toFixed(1)+' at '+t);
    assert(j.grip>=PM.GRIP.min-.5&&j.grip<=PM.GRIP.max+.5,id+' wrist at '+j.grip.toFixed(1)+' at '+t);
    for(const n of JOINTS)assert(PS.world(q,id,t,n)[1]>=(n==='Hd'?12:-.01),id+'.'+n+' below the floor at '+t);}});
});
test('a planted foot never slides: a foot moves only while it is off the floor',()=>{
  for(const id of ['a','b']){let prev=PS.frame(q,0)[id].pose;
    range(2,q.dur,2,t=>{const p=PS.frame(q,t)[id].pose;
      for(const f of ['ff','bf'])if(Math.abs(p[f+'x']-prev[f+'x'])>.01)
        assert(p[f+'y']>0||prev[f+'y']>0,id+'.'+f+' slid at '+t);
      prev=p;});}
});
test('nothing snaps: no joint jumps between two recorded moments (2 ms), the blade tip included',()=>{
  for(const id of ['a','b'])range(2,q.dur,2,t=>{for(const n of JOINTS){
    const d=dist(PS.world(q,id,t-2,n),PS.world(q,id,t,n)),lim=n==='tip'?8:n==='Hn'||n==='E'?4:2.5;
    assert(d<=lim,id+'.'+n+' moved '+d.toFixed(1)+' in 2 ms at '+t);}});
});
test('the parry has one contact point, and both blades are on it',()=>{
  assert(dist(PS.world(q,'a',pc.t,'blade',pc.alongA),pc.at)<.5,'the sword is not on the contact point');
  assert(dist(PS.world(q,'b',pc.t,'blade',pc.alongB),pc.at)<.5,'the dagger is not on the contact point');
  // it is taken high, in front of the defender's head, with the sword still coming down
  const hd=PS.world(q,'b',pc.t,'Hd'),j=PS.joints(q,'a',pc.t);
  assert(pc.at[1]>hd[1]-15&&pc.at[0]<hd[0]-30,'the contact is not high and in front of the head');
  assert(j.w>20&&j.w<60,'the sword is not coming down at the contact ('+j.w.toFixed(0)+')');
  // the bind: for 80 ms the dagger stays on the sword's edge while the defender lifts it away
  range(pc.t,pc.t+80,2,t=>assert(toSword(PS.world(q,'b',t,'blade',pc.alongB),t)<2,'the blades part at '+t));
});
test('the defender yields at the contact: the knees and the elbow give',()=>{
  const p0=PS.sample(q,'b',pc.t),p1=PS.sample(q,'b',pc.t+60);
  assert(p1.py<p0.py-3,'the hips do not drop');
  const e0=PS.joints(q,'b',pc.t),e1=PS.joints(q,'b',pc.t+60);
  const r=j=>dist(j.Hn,j.wS);assert(r(e1)<r(e0)-2,'the arm does not give');
});
test('the cut never passes through the defender (outside the contact, the blade keeps clear of the body)',()=>{
  range(q.tc-300,q.P1,2,t=>{for(const n of BODY){const d=toSword(PS.world(q,'b',t,n),t);
    assert(d>=(n==='Hd'?13+6:8),'the sword is '+d.toFixed(1)+' from the dagger fighter\'s '+n+' at '+t);}});
});
test('the counter goes in beneath the displaced sword and keeps clear of it',()=>{
  // at the held decision the sword is high: its hand is above the defender's head
  assert(PS.world(q,'a',q.P1,'Hn')[1]>PS.world(q,'b',q.P1,'Hd')[1],'the sword is not displaced high');
  const g=q.grips[0],gripping=t=>t>=g.t0-40&&t<=g.t1+30;   // (closing on it, and letting go)
  range(q.P1,q.tk+300,2,t=>{for(const n of JOINTS){if(gripping(t)&&(n==='oHn'||n==='oE'))continue;   // holding the arm, below
    const d=toSword(PS.world(q,'b',t,n),t);
    assert(d>=10,'the sword is '+d.toFixed(1)+' from the dagger fighter\'s '+n+' at '+t);}});
  // the dagger enters lower than the sword hand
  range(q.tk-150,q.tk,2,t=>assert(PS.world(q,'b',t,'tip')[1]<PS.world(q,'a',t,'Hn')[1]-20,'the dagger is not under the sword at '+t));
});
// the point on the sword arm the dagger fighter holds: the forearm just behind the wrist
const forearm=t=>{const j=PS.joints(q,'a',t);return A.W([j.Hn[0]+(j.E[0]-j.Hn[0])*.25,j.Hn[1]+(j.E[1]-j.Hn[1])*.25]);};
test('the sword arm is caught, held and let go (owner, 2026-11-12: make the control and its release clear)',()=>{
  const g=q.grips[0];assert(g&&g.t0>q.P1&&g.t0<q.tk&&g.t1>q.tk,'the grip does not span the thrust');
  // before the catch the sword is on its way down; it is caught in front of the body, not folded beside the head
  const c=PS.world(q,'a',g.t0,'Hn'),s0=PS.world(q,'a',g.t0,'S'),hd=PS.world(q,'a',g.t0,'Hd');
  assert(c[0]-s0[0]>25,'the sword hand is not out in front when it is caught');
  assert(dist(c,hd)>35,'the sword hand is caught beside the head');
  assert(c[1]<PS.world(q,'a',q.P1,'Hn')[1]-8,'the sword does not start down before the catch');
  // held: the dagger fighter's hand is on the forearm, the sword hand does not come down (it is lifted a little)
  range(g.t0+20,g.t1,2,t=>{assert(dist(PS.world(q,'b',t,'oHn'),forearm(t))<2,'the empty hand is off the arm at '+t);
    assert(PS.world(q,'a',t,'Hn')[1]>=c[1]-1,'the held arm comes down at '+t);});
  // let go: the hand comes away from the arm, and the arm drops only after it is free
  assert(dist(PS.world(q,'b',g.t1+60,'oHn'),forearm(g.t1+60))>12,'the empty hand does not come away');
  assert(PS.world(q,'a',g.t1+200,'Hn')[1]<PS.world(q,'a',g.t1,'Hn')[1]-15,'the arm does not drop once free');
});
test('the empty hands do something: the sword fighter\'s goes to the wound and stays there',()=>{
  const abd=t=>{const j=PS.joints(q,'a',t);return A.W([(j.M[0]+j.P[0])/2,(j.M[1]+j.P[1])/2]);};
  for(const t of [q.tk+400,q.end])assert(dist(PS.world(q,'a',t,'oHn'),abd(t))<20,'the empty hand is not on the wound at '+t);
});
test('the sword comes back on a deliberate path, clear of the face: the hilt leads, the point follows',()=>{
  const g=q.grips[0];
  range(g.t1,q.end,2,t=>{const hd=PS.world(q,'a',t,'Hd'),h=PS.world(q,'a',t,'Hn');
    assert(dist(h,hd)>=30,'the sword hand is '+dist(h,hd).toFixed(1)+' from the face at '+t);
    const d=seg(hd,h,PS.world(q,'a',t,'tip'));assert(d>=18,'the blade passes '+d.toFixed(1)+' from the face at '+t);});
  const y0=PS.world(q,'a',g.t1,'Hn')[1],first=(f)=>{for(let t=g.t1;t<=q.end;t+=2)if(f(t))return t;return q.end;};
  const hilt=first(t=>PS.world(q,'a',t,'Hn')[1]<y0-12),point=first(t=>PS.joints(q,'a',t).w<60);
  assert(hilt<point-150,'the point comes down with the hilt (hilt '+hilt+', point '+point+')');
  // deliberate, not a sweep: the blade turns at well under half the speed of the cut
  const turn=(t0,t1)=>{let m=0;for(let t=t0+10;t<=t1;t+=10)m=Math.max(m,Math.abs(PS.joints(q,'a',t).w-PS.joints(q,'a',t-10).w));return m;};
  assert(turn(g.t1,q.end)<turn(q.tc-200,q.tc)*.4,'the recovery swings the blade nearly as fast as the cut');
  // the point comes down only once the dagger fighter has stepped out (no sweep across the other fighter)
  const lastStep=Math.max(...B.steps.map(s=>s.t1));assert(point>lastStep-200,'the point comes down while the dagger fighter is still close');
});
test('steps carry weight: push off, a clear lift, set down, then the weight goes onto the new base',()=>{
  const com=(id,t)=>{const j=PS.joints(q,id,t);return j.P[0]*.5+j.M[0]*.3+j.S[0]*.2;};
  let n=0;
  for(const id of ['a','b'])for(const st of q.fighters[id].steps){n++;
    const P=t=>PS.frame(q,t)[id].pose,sup=P(st.t0)[st.sup+'x'],from=P(st.t0)[st.foot+'x'],land=P(st.t1)[st.foot+'x'];
    let top=0;range(st.t0,st.t1,2,t=>{top=Math.max(top,P(t)[st.foot+'y']);
      // the foot travels only while it is clearly off the floor (no gliding along it)
      if(Math.abs(P(t)[st.foot+'x']-P(t-2)[st.foot+'x'])>.05)assert(P(t)[st.foot+'y']>=2,id+' '+st.foot+' glides at '+t);});
    assert(top>=8,id+' '+st.foot+' step barely lifts ('+top.toFixed(1)+')');
    // before the foot leaves, the hips go toward the foot that will carry the weight (or are driven there by a push)
    const toward=Math.abs(com(id,st.t0)-sup)<Math.abs(com(id,st.t0-170)-sup)-2;
    const pushing=st.push&&Math.sign(com(id,st.t0+40)-com(id,st.t0))===Math.sign(sup-from);
    assert(toward||pushing,id+' '+st.foot+': the weight does not go onto the other foot before the step');
    // set down inside the base it makes; then the weight goes on (the hips keep moving onto the new base)
    const lo=Math.min(sup,land)-3,hi=Math.max(sup,land)+3,c1=com(id,st.t1);
    assert(c1>=lo&&c1<=hi,id+' '+st.foot+' lands with the weight outside its feet');
    assert(Math.abs(P(st.t1+120).px-P(st.t1).px)>1.5,id+' '+st.foot+': no weight transfer after the foot is set down');
  }
  assert(n>=3,'the retreat has fewer than three steps');
});
test('the final wounded stance: bent over the wound, weight back, a low guard',()=>{
  const s=PS.sample(q,'a',q.end),j=PS.joints(q,'a',q.end),p=PS.frame(q,q.end).a.pose;
  assert(s.bend>=18,'not bent over the wound ('+s.bend.toFixed(0)+')');
  const c=j.P[0]*.5+j.M[0]*.3+j.S[0]*.2;assert(c<(p.ffx+p.bfx)/2,'the weight is not back');
  assert(j.Hn[1]<j.S[1]-25,'the guard is not low');assert(j.w<0&&j.w>-45,'the point is not low and forward ('+j.w.toFixed(0)+')');
  assert(j.Hn[0]>j.S[0]+10,'the sword is not in front of the body');
});
test('the wound reaction starts at the hit: the dagger is in the abdomen, the hips move first and the head follows',()=>{
  const j=PS.joints(q,'a',q.tk),abd=A.W([(j.M[0]+j.P[0])/2+4,(j.M[1]+j.P[1])/2]);
  assert(dist(PS.world(q,'b',q.tk,'blade',q.contacts.counter.along),abd)<.5,'the dagger is not at the abdomen');
  const mv=(n,t)=>dist(PS.world(q,'a',q.tk,n),PS.world(q,'a',t,n));
  assert(mv('P',q.tk+30)>mv('Hd',q.tk+30)*.8,'the reaction does not start low');
  assert(mv('Hd',q.tk+200)>mv('Hd',q.tk+30)+3,'the head does not follow');
  // a step gives ground soon after
  assert(A.steps.some(st=>st.t0>q.tk&&st.t0<q.tk+400),'no step to give ground after the hit');
  // a minor wound: still standing and holding the sword at the end, the wound still marked
  const end=PS.frame(q,q.end).a;assert.equal(end.wounds.abdomen,'minor');
  assert(end.joints.P[1]>60,'the wounded fighter is not on its feet');
});
// the centre of mass, roughly as the page draws it
const com=(id,t)=>{const j=PS.joints(q,id,t);return j.P[0]*.5+j.M[0]*.3+j.S[0]*.2;};
test('the held poses stand: both feet down, weight between them, nobody moving',()=>{
  for(const T of [q.P1,q.end])for(const id of ['a','b']){
    const p=PS.frame(q,T)[id].pose;assert(p.ffy===0&&p.bfy===0,id+' has a foot in the air at '+T);
    const c=com(id,T);assert(c>p.bfx+8&&c<p.ffx-4,id+' is off balance at '+T);
    const a=PS.sample(q,id,T-20),b=PS.sample(q,id,T);
    for(const ch of PS.CH)assert(Math.abs(b[ch]-a[ch])<.5,id+'.'+ch+' still moving at the hold '+T);
  }
});
test('continuing from the held decision does not snap: the first frames after it barely move',()=>{
  for(const id of ['a','b'])for(const n of JOINTS){
    const d=dist(PS.world(q,id,q.P1,n),PS.world(q,id,q.P1+16,n));assert(d<1.5,id+'.'+n+' jumps '+d.toFixed(1)+' after the hold');}
});
test('the order of the body in the cut: hips before the hand, the hand before the blade',()=>{
  // from the moment the drive is keyed (the load before it gathers the weight back and the hilt up)
  const t0=q.marks.find(m=>/^Drive/.test(m.label)).t;
  const start=(f,lim)=>{for(let t=t0;t<q.tc;t+=2)if(f(t)>lim)return t;return q.tc;};
  const P0=PS.world(q,'a',t0,'P'),H0=PS.world(q,'a',t0,'Hn'),w0=PS.joints(q,'a',t0).w;
  const hips=start(t=>dist(PS.world(q,'a',t,'P'),P0),3),hand=start(t=>dist(PS.world(q,'a',t,'Hn'),H0),6);
  const blade=start(t=>Math.abs(PS.joints(q,'a',t).w-w0),20);
  assert(hips<hand&&hand<blade,'order: hips '+hips+', hand '+hand+', blade '+blade);
  // the front foot is down before the contact
  assert.equal(PS.frame(q,q.tc-30).a.pose.ffy,0,'the front foot is still in the air at the contact');
});
test('nobody returns to the guard they began in',()=>{
  const g={a:PM.SWORD_GUARD,b:PM.DAGGER_GUARD};
  for(const id of ['a','b']){const s=PS.sample(q,id,q.end),j=PS.joints(q,id,q.end);
    const d=Math.hypot(s.hx-g[id].h[0],s.hy-g[id].h[1])+Math.hypot(s.ox-g[id].o[0],s.oy-g[id].o[1])+Math.abs(j.w-g[id].w)+Math.abs(s.py-g[id].py)+Math.abs(s.lean-g[id].lean);
    assert(d>40,id+' ends in its opening guard ('+d.toFixed(0)+')');}
  // nor on the way there (a touch would read as another parry)
  range(q.tk+200,q.end,2,t=>{for(const n of ['tip','Hn','E']){const d=toSword(PS.world(q,'b',t,n),t);
    assert(d>15,'the dagger fighter\'s '+n+' comes '+d.toFixed(1)+' from the sword in the recovery at '+t);}});
  // and the blades do not cross in the end poses
  assert(toSword(PS.world(q,'b',q.end,'tip'),q.end)>15&&toSword(PS.world(q,'b',q.end,'Hn'),q.end)>15,'the blades cross at the end');
});
test('the page has what it needs: captions, two decision holds, the hit-stops',()=>{
  assert(q.marks.length>=8);assert.equal(q.pauses.length,2);
  assert.deepEqual(q.stops.map(s=>s.t),[q.tc,q.tk]);
  assert.equal(PS.shownDur(q),q.dur+q.stops.reduce((n,s)=>n+s.d,0));
});
console.log(passed+' passed');
