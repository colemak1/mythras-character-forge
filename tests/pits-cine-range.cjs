// Range on the cinematic stage (owner, 2026-11-16: "it's really hard to tell when you have an advantage or
// disadvantage because of range. When a dagger is fighting a spear I want it to look like an impossible fight but
// then when you get in close it should feel like the dagger has the advantage"). What is held here, for pairs whose
// Reach differs: the stances follow the range; at long range the longer weapon's point is in front of the other's
// face and reaches it with a lunge, while the shorter weapon falls well short of the other's body; inside, the
// shorter weapon reaches with room to spare and the longer weapon's point is up and clear of the other's head and
// body; a change of range is made by the one who makes it (the shorter closes, the longer opens) and the other keeps
// its feet; the opening never sweeps the shaft through the other's head; bodies stay possible and nothing jumps;
// with weapons of equal Reach nothing changes (no stance, both share the step). Whether it reads at a glance is for
// the owner (sheets: docs/pits-visual-checks/cine-range-*.jpg).
const assert=require('node:assert/strict');
const C=require('../experiments/pits-cine.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
C.keep(0);
const WK={dagger:{kind:'blade',len:50},shortsword:{kind:'blade',len:68},sword:{kind:'blade',len:92},spear:{kind:'spear',len:150},
  greatsword:{kind:'blade',len:130,hands:2},halberd:{kind:'polearm',len:176},pike:{kind:'spear',len:230}};
// [shorter, longer]
const PAIRS=[['dagger','spear'],['dagger','greatsword'],['shortsword','halberd'],['sword','pike'],['dagger','halberd']];
const LUNGE=40;   // the stage's reach band adds a lunge's step (pits-stage.js, PS_LUNGE)
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const segDist=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return Math.hypot(p[0]-(a[0]+vx*u),p[1]-(a[1]+vy*u));};
// the shorter weapon is 'a', facing right; the longer 'b'
function pair(ws,wl,key){
  const M={a:C.fighter('a',WK[ws],false,{}),b:C.fighter('b',WK[wl],false,{})};
  C.setRange(M,key,'b');
  const g=C.gap(WK[ws],WK[wl],key==='long'?'keep':key);C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
  return M;
}
// how far forward the weapon reaches from the hips, as the stage's band draws it
const reach=(m,t)=>{const j=C.joints(m,t),f=m.face;return Math.max(f*(j.tip[0]-j.P[0]),f*(j.Hn[0]-j.P[0]))+LUNGE;};
function possible(m,t,what){
  const j=C.joints(m,t),D=C.DIM;
  for(const [a,b,len] of [['P','K',D.thigh],['K','F',D.shin],['P','bK',D.thigh],['bK','bF',D.shin],['wS','E',D.upper],['E','Hn',D.fore]])
    assert(Math.abs(dist(j[a],j[b])-len)<.6,what+': '+a+'-'+b+' is '+dist(j[a],j[b]).toFixed(1)+' long at '+t);
  for(const k of ['F','bF','P','Hn','Hd','tip'])assert(j[k][1]>=-1,what+': '+k+' is under the floor at '+t);
}

test('the stances follow the range, and only when the Reach differs',()=>{
  const M={a:C.fighter('a',WK.dagger,false,{}),b:C.fighter('b',WK.spear,false,{})};
  C.setRange(M,'long','b');assert.deepEqual([M.a.stance,M.b.stance],['kept','keep']);
  C.setRange(M,'short','b');assert.deepEqual([M.a.stance,M.b.stance],['inside','cramped']);
  C.setRange(M,'long',null);assert.deepEqual([M.a.stance,M.b.stance],[null,null]);
  C.setRange(M,'apart','b');assert.deepEqual([M.a.stance,M.b.stance],[null,null]);
});

test('long range: the longer point at the face and in reach; the shorter weapon well short',()=>{
  for(const [ws,wl] of PAIRS){
    const M=pair(ws,wl,'long'),what=wl+' keeps '+ws+' off',a=C.joints(M.a,10),b=C.joints(M.b,10);
    possible(M.a,10,what);possible(M.b,10,what);
    // the point is in front of the face, not in it
    assert(b.tip[0]-a.Hd[0]>C.DIM.headR+4,what+': the point is in the face ('+(b.tip[0]-a.Hd[0]).toFixed(0)+')');
    // with a lunge it reaches past the front foot, and the point is no more than a hand's breadth off the face
    assert(b.P[0]-reach(M.b,10)<a.F[0],what+': the longer weapon does not reach ('+(b.P[0]-reach(M.b,10)-a.F[0]).toFixed(0)+' short)');
    assert(b.tip[0]-a.Hd[0]<C.DIM.headR+65,what+': the point is too far off ('+(b.tip[0]-a.Hd[0]).toFixed(0)+')');
    // the shorter weapon, with a lunge, is well short of the other's body
    assert(a.P[0]+reach(M.a,10)<b.P[0]-40,what+': the shorter weapon reaches ('+(b.P[0]-a.P[0]-reach(M.a,10)).toFixed(0)+' to spare)');
  }
});

test('inside: the shorter weapon reaches; the longer point is up and clear of the other',()=>{
  for(const [ws,wl] of PAIRS){
    const M=pair(ws,wl,'short'),what=ws+' inside '+wl,a=C.joints(M.a,10),b=C.joints(M.b,10);
    possible(M.a,10,what);possible(M.b,10,what);
    assert(a.P[0]+reach(M.a,10)>b.P[0],what+': the shorter weapon does not reach');
    // the longer weapon's shaft is clear of the other's head, and its point is above it
    assert(segDist(a.Hd,b.Hn,b.tip)>C.DIM.headR+2,what+': the shaft goes through the head ('+segDist(a.Hd,b.Hn,b.tip).toFixed(0)+')');
    assert(b.tip[1]>a.Hd[1],what+': the point is not up');
  }
});

test('a change of range is made by the one who makes it; the other keeps its feet',()=>{
  for(const [ws,wl] of PAIRS)for(const [from,to,mover] of [['long','short','a'],['short','long','b']]){
    const M=pair(ws,wl,from),what=ws+'/'+wl+' '+from+' to '+to,still=mover==='a'?'b':'a';
    const f0=C.joints(M[still],50);
    C.setRange(M,to,'b');const g=C.gap(WK[ws],WK[wl],to==='long'?'keep':to);
    const end=Math.max(C.recover(M.a,50,g),C.recover(M.b,50,g));
    const f1=C.joints(M[still],end+50),m0=C.joints(M[mover],50),m1=C.joints(M[mover],end+50);
    assert(Math.abs(f1.F[0]-f0.F[0])<2&&Math.abs(f1.bF[0]-f0.bF[0])<2,what+': the other fighter moved its feet');
    // (as far apart as a pair placed at the new range)
    const ref=pair(ws,wl,to),want=C.joints(ref.b,10).P[0]-C.joints(ref.a,10).P[0];
    assert(Math.abs(Math.abs(m1.P[0]-f1.P[0])-want)<14,what+': the mover did not get to the new range ('+Math.abs(m1.P[0]-f1.P[0]).toFixed(0)+' for '+want.toFixed(0)+')');
    assert(Math.abs(m1.P[0]-m0.P[0])>20,what+': the mover did not move');
    let prev=null;
    for(let t=50;t<=end+50;t+=4){
      possible(M.a,t,what);possible(M.b,t,what);
      const a=C.joints(M.a,t),b=C.joints(M.b,t);
      assert(b.P[0]-a.P[0]>60,what+': the hips are '+(b.P[0]-a.P[0]).toFixed(0)+' apart at '+t);
      // the longer weapon never sweeps through the shorter fighter's head
      assert(segDist(a.Hd,b.Hn,b.tip)>C.DIM.headR,what+': the shaft goes through the head at '+t);
      if(prev)for(const [x,y] of [[a,prev.a],[b,prev.b]])for(const k of ['P','Hd','F','bF'])
        assert(dist(x[k],y[k])<46,what+': '+k+' jumps at '+t);
      prev={a,b};
    }
  }
});

// (owner, 2026-11-17: "the range animations look off". The dart in was a squat slid along the floor with the other's
// point lifting before anything touched it; the way out covered the distance in two frames and then drifted.)
test('closing: the point waits for the hand, and the dart is a long low lunge',()=>{
  for(const [ws,wl] of PAIRS){
    const M=pair(ws,wl,'long'),what=ws+' darts in under '+wl,t0=50;
    C.setRange(M,'short','b');const g=C.gap(WK[ws],WK[wl],'short');
    C.recover(M.a,t0,g);C.recover(M.b,t0,g);
    // the longer weapon holds its line until the empty hand has gone up to it, then it is knocked up
    const tip0=C.joints(M.b,t0).tip;
    for(let t=t0;t<=t0+100;t+=10)assert(dist(C.joints(M.b,t).tip,tip0)<3,what+': the point moved before it was touched, at '+(t-t0));
    assert(C.joints(M.b,t0+250).tip[1]>tip0[1]+30,what+': the point was not knocked up');
    // the empty hand is at the point when it goes up (within a hand's breadth, or at the end of the arm's reach)
    const h=C.joints(M.a,t0+110);
    assert(dist(h.oHn,tip0)<24||dist(h.oHn,h.oS)>C.ARM*.85,what+': the empty hand is '+dist(h.oHn,tip0).toFixed(0)+' from the point');
    // in the dart the back leg is stretched out behind and the hips are low: a lunge, not a squat
    const j=C.joints(M.a,t0+300);
    assert(dist(j.P,j.bF)>C.LEG*.9,what+': the back leg is folded in the dart ('+dist(j.P,j.bF).toFixed(0)+')');
    assert(j.P[1]<50,what+': the dart is not low');
    assert(j.F[0]-j.bF[0]>100,what+': the feet are only '+(j.F[0]-j.bF[0]).toFixed(0)+' apart in the dart');
  }
});

test('opening: a shove, then a hop that takes its time and leaves the floor',()=>{
  for(const [ws,wl] of PAIRS){
    const M=pair(ws,wl,'short'),what=wl+' opens from '+ws,t0=50;
    C.setRange(M,'long','b');const g=C.gap(WK[ws],WK[wl],'keep');
    const x0=C.joints(M.b,t0).P[0];
    C.recover(M.a,t0,g);const end=C.recover(M.b,t0,g),x1=C.joints(M.b,end+50).P[0];
    // the shove comes first: the hands go out toward the other before the feet leave
    const s=C.joints(M.b,t0+120);
    assert(s.Hn[0]<C.joints(M.b,t0).Hn[0]-8,what+': no shove');
    assert(Math.abs(s.F[0]-C.joints(M.b,t0).F[0])<2,what+': the feet left before the shove');
    // the other is rocked back by it (its head goes back), without moving its feet
    assert(C.joints(M.a,t0+230).Hd[0]<C.joints(M.a,t0+100).Hd[0]-15,what+': the shove did not move the other');
    // the hop is not over in two frames: 40 ms after the shove less than half the way is made, and it is still
    // going 120 ms after it
    const part=t=>(C.joints(M.b,t).P[0]-x0)/(x1-x0);
    assert(part(t0+160)<.5,what+': '+(part(t0+160)*100).toFixed(0)+'% of the way 40 ms after the shove');
    assert(part(t0+240)<.9,what+': the hop is over 120 ms after the shove');
    // both feet off the floor on the way
    const mid=C.joints(M.b,t0+245);
    assert(mid.F[1]>8&&mid.bF[1]>8,what+': the feet stay on the floor ('+mid.F[1].toFixed(0)+', '+mid.bF[1].toFixed(0)+')');
  }
});

test('blows start from the stances: bodies possible, nothing jumps, the two never stand in each other',()=>{
  let n=0;
  for(const [ws,wl] of PAIRS)for(const key of ['long','short'])for(const aid of ['a','b'])
    // (evades are left to tests/pits-cine.cjs: they leave the stance at once, and the back handspring's head dips
    // under the floor at the top with or without a stance, a locked look)
    for(const outcome of ['wound','parried','miss','armour','partial-parry'])for(const loc of ['head','chest','rleg']){
      const M=pair(ws,wl,key),what=(aid==='a'?ws:wl)+' attacks at '+key+' range, '+outcome+' at '+loc;
      C.fixChoices(.4);const r=C.blow(M,aid,100,{outcome,loc,lost:outcome==='wound'?3:0});C.fixChoices(null);n++;
      let prev=null;
      for(let t=100;t<=r.end+60;t+=4){
        possible(M.a,t,what);possible(M.b,t,what);
        const a=C.joints(M.a,t),b=C.joints(M.b,t);
        assert(b.P[0]-a.P[0]>60,what+': the hips are '+(b.P[0]-a.P[0]).toFixed(0)+' apart at '+t);
        if(prev)for(const [x,y] of [[a,prev.a],[b,prev.b]])for(const k of ['P','Hd','F','bF'])
          assert(dist(x[k],y[k])<46,what+': '+k+' jumps '+dist(x[k],y[k]).toFixed(0)+' at '+t);
        prev={a,b};
      }
    }
  console.log('  '+n+' blows');
});

test('equal Reach: no stance, and both share the step as before',()=>{
  const M={a:C.fighter('a',WK.sword,false,{}),b:C.fighter('b',WK.sword,false,{})};C.setRange(M,'long',null);
  const g=C.gap(WK.sword,WK.sword,'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
  const a0=C.joints(M.a,10).P[0],b0=C.joints(M.b,10).P[0];
  const end=Math.max(C.recover(M.a,50,g-80),C.recover(M.b,50,g-80));
  const a1=C.joints(M.a,end+50).P[0],b1=C.joints(M.b,end+50).P[0];
  assert(a1-a0>20&&b0-b1>20,'both step in');
});

console.log(passed+' passed');
