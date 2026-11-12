// The movement rules of tests/pits-fight.cjs that hold for any written fight, as one check: the first fault found,
// or null. Used by tests/pits-writer.cjs (in CI) and tests/sweep/pits-sweep.cjs (the full sweep, run by hand).
const PS=require('../../experiments/pits-spring.js');
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return dist(p,[a[0]+vx*u,a[1]+vy*u]);};
// the stance at time t (feet and hips), without drawing the figure as PS.frame does
const poseAt=(q,id,t)=>PS.pose(q.fighters[id],PS.sample(q,id,t),t);
const BODY=['Hd','S','M','P','K','F','bK','bF','E'],J=[...BODY,'Hn','oE','oHn','tip'],ids=['a','b'],other={a:'b',b:'a'};
// step: the sampling interval (ms) for the clearance and limb checks; feet, snaps and boundaries are always checked at 2
function fault(q,step){
  step=step||4;
  // each fighter's skeleton is solved once per sample and reused for every joint (world points, as PS.world gives them)
  const cache={a:new Map(),b:new Map()};
  const at=(id,t)=>{let w=cache[id].get(t);if(w)return w;const f=q.fighters[id],j=PS.joints(q,id,t);w={j};
    for(const n of J)w[n]=f.W(j[n]);cache[id].set(t,w);return w;};
  const inC=t=>q.contactList.some(c=>t>=c.t-90&&t<=c.t+(c.hold||0)+90);
  for(let t=0;t<=q.dur;t+=step)for(const id of ids){const w=at(id,t),o=at(other[id],t);
    for(const k in w.j.over)if(w.j.over[k]>.6)return id+'.'+k+' over its length at '+t;
    if(!inC(t))for(const n of BODY){const d=seg(o[n],w.Hn,w.tip);
      if(d<2)return id+'\'s blade '+d.toFixed(1)+' from '+other[id]+'.'+n+' at '+t;}}
  // a contact part is a point on a blade, or a shield's face: the off hand on the shield's centre, the point on its rim
  const off=(p,t,C)=>p.shield?Math.max(dist(PS.world(q,p.who,t,'oHn'),p.ctr),Math.abs(dist(p.ctr,C)-p.shield)):dist(PS.world(q,p.who,t,'blade',p.along),C);
  for(const c of q.contactList){
    if(off(c.a,c.t,c.at)>.5)return c.kind+' at '+c.t+': '+(c.a.shield?'the shield':'the blade')+' is off the point';
    if(c.b&&off(c.b,c.t,c.at)>.5)return c.kind+' at '+c.t+': the other '+(c.b.shield?'shield':'blade')+' is off the point';}
  for(const p of q.pauses)for(const id of ids){const f=poseAt(q,id,p.t);if(f.ffy||f.bfy)return id+' has a foot up at the boundary '+p.t;
    for(const n of J)if(dist(PS.world(q,id,p.t,n),PS.world(q,id,p.t+16,n))>=3)return id+'.'+n+' jumps after the boundary '+p.t;}
  for(const id of ids){let prev=poseAt(q,id,0);for(let t=2;t<=q.dur;t+=2){const p=poseAt(q,id,t);
    for(const f of ['ff','bf'])if(Math.abs(p[f+'x']-prev[f+'x'])>.01&&p[f+'y']<1.5&&prev[f+'y']<1.5)return id+'.'+f+' slides at '+t;prev=p;}}
  for(const id of ids){let prev=at(id,0);cache[id].clear();for(let t=2;t<=q.dur;t+=2){const w=at(id,t);
    for(const n of J){const d=dist(prev[n],w[n]);if(d>(n==='tip'?20:n==='Hn'||n==='E'?6:4))return id+'.'+n+' snaps '+d.toFixed(1)+' at '+t;}
    prev=w;cache[id].delete(t-2);}}
  return null;
}
const LOCS=['head','chest','abdomen','rarm','larm','rleg','lleg'];
const RESULTS=[['parried',0],['partial-parry',2],['wound',3],['armour',0],['miss',0],['evaded',0]];
module.exports={fault,LOCS,RESULTS,other};
