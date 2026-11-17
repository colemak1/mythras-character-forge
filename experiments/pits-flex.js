// The Pits: flexible weapons (batch (d), 2026-11-17). A flail's chain, a whip's lash and a net are drawn as a rope that
// trails the hand, not as a rigid stick: it hangs at rest, lags behind a fast swing and catches up with a snap, lies on
// the floor, and lands exactly where the movement says the blow lands.
//
// Pure, no page: the stage (pits-stage.js, psFlex) steps it every frame with the stage clock, so it stops when the
// scene is held and runs slow in slow motion. The movement (pits-cine.js) still aims the weapon as a straight line
// (its contacts are on that line); this only draws it. Frames: the stage's world, x to the right, y DOWN (SVG).
//
// How: a chain of links (Verlet). Each step every link is pulled toward where it would be on the straight weapon, by an
// amount that grows with the speed of the swing (a fast swing pulls a chain straight; at rest it hangs), weaker toward
// the tip of a whip (so the lash rolls out behind the hand and cracks). Near a contact (`pin`) it is laid onto the
// straight weapon, so the head is where the sparks are.
(function(root){
'use strict';
// n: links. hl: the handle along the weapon from the hand. base, boost: the pull toward the straight weapon (per
// second) at rest and in a full-speed swing. tipK: the pull at the tip against the root. g: gravity, units/s^2.
const KIND={
  chain:{n:6,hl:30,base:.05,boost:46,tipK:.8,g:1500,damp:.988,ref:650},
  whip: {n:12,hl:30,base:.25,boost:34,tipK:.18,g:900,damp:.992,ref:700},
  net:  {n:5,hl:8,base:.1,boost:30,tipK:.6,g:1100,damp:.985,ref:600}
};
const STEP=1000/120;        // ms of simulated time per substep
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function cfg(kind){return KIND[kind]||KIND.chain;}
// the straight weapon's link points: from the handle's end along dir
function rigid(root,dir,len,c){const seg=(len-c.hl)/c.n,out=[];for(let i=0;i<=c.n;i++)out.push([root[0]+dir[0]*i*seg,root[1]+dir[1]*i*seg]);return out;}
function reset(st,o){
  const c=cfg(o.kind);st.kind=o.kind;st.len=o.len;st.pts=rigid(o.root,o.dir,o.len,c);st.old=st.pts.map(p=>p.slice());
  st.root=o.root.slice();st.tip=st.pts[c.n].slice();st.open=0;st.clk=o.clk;
  // two seconds at rest, so a new weapon starts hanging, not stiff
  if(!o.stiff)for(let i=0;i<240;i++)sub(st,c,o.root,o.dir,o.len,STEP/1000,0,0,o.floor);
  return st;
}
// one substep (h in seconds); tension 0..1
function sub(st,c,root,dir,len,h,tension,pin,floor){
  const seg=(len-c.hl)/c.n,P=st.pts,O=st.old,T=rigid(root,dir,len,c);
  for(let i=1;i<=c.n;i++){
    const p=P[i],o=O[i],vx=(p[0]-o[0])*c.damp,vy=(p[1]-o[1])*c.damp;
    O[i]=p.slice();p[0]+=vx;p[1]+=vy+c.g*h*h;
    const k=(c.base+c.boost*tension)*(1-(1-c.tipK)*i/c.n),a=1-Math.exp(-k*h);
    p[0]+=(T[i][0]-p[0])*a;p[1]+=(T[i][1]-p[1])*a;
  }
  P[0]=root.slice();O[0]=root.slice();
  // the links keep their length (the handle end is held)
  for(let it=0;it<8;it++){
    for(let i=1;i<=c.n;i++){
      const a=P[i-1],b=P[i],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1e-6,e=(d-seg)/d;
      if(i===1){b[0]-=dx*e;b[1]-=dy*e;}
      else{a[0]+=dx*e*.5;a[1]+=dy*e*.5;b[0]-=dx*e*.5;b[1]-=dy*e*.5;}
    }
    P[0]=root.slice();
    if(floor!=null)for(let i=1;i<=c.n;i++)if(P[i][1]>floor){P[i][1]=floor;O[i][0]+=(P[i][0]-O[i][0])*.4;}
  }
  // laid onto the straight weapon near a contact (the speed it had is kept, so it carries on round after)
  if(pin>0)for(let i=1;i<=c.n;i++){const dx=(T[i][0]-P[i][0])*pin,dy=(T[i][1]-P[i][1])*pin;P[i][0]+=dx;P[i][1]+=dy;O[i][0]+=dx;O[i][1]+=dy;
    if(floor!=null&&P[i][1]>floor)P[i][1]=floor;}
}
// o: {kind, len, root (world, the handle's end), dir (unit, world, along the straight weapon), clk (ms, the stage
// clock), tension (0..1, or null: from the speed of the straight weapon's tip), pin (0..1), floor (world y)}
// Returns st, with st.pts (n+1 points from the handle's end to the tip), st.tip and st.open (0..1, how open a net is).
function step(st,o){
  const c=cfg(o.kind);
  if(!st.pts||st.kind!==o.kind||st.len!==o.len)return reset(st,o);
  let dt=o.clk-st.clk;
  // a jump (a new bout, the replay starting over, a figure placed anew) starts the rope again
  if(dt<0||dt>500||Math.hypot(o.root[0]-st.root[0],o.root[1]-st.root[1])>180)return reset(st,o);
  if(dt===0)return st;                       // the scene is held: the rope is held with it
  const tip=[o.root[0]+o.dir[0]*o.len,o.root[1]+o.dir[1]*o.len];
  const sp=Math.hypot(tip[0]-st.tip[0],tip[1]-st.tip[1])/(dt/1000);
  // (below a slow drift, a guard breathing or a step, it hangs as it is: only a real swing pulls it out)
  const tension=o.tension!=null?clamp(o.tension,0,1):clamp((sp-150)/c.ref,0,1);
  const n=Math.max(1,Math.ceil(dt/STEP)),h=dt/n/1000;
  for(let i=0;i<n;i++){
    // the handle's end and the straight weapon move through the frame, not in one jump
    const u=(i+1)/n,r=[st.root[0]+(o.root[0]-st.root[0])*u,st.root[1]+(o.root[1]-st.root[1])*u];
    const d0=st.dir||o.dir,dx=d0[0]+(o.dir[0]-d0[0])*u,dy=d0[1]+(o.dir[1]-d0[1])*u,dl=Math.hypot(dx,dy)||1;
    sub(st,c,r,[dx/dl,dy/dl],o.len,h,tension,o.pin||0,o.floor);
  }
  st.root=o.root.slice();st.dir=o.dir.slice();st.tip=tip;st.clk=o.clk;
  // a net opens as it is swung and closes again as it slows
  st.open+=(tension-st.open)*(1-Math.exp(-dt/(tension>st.open?60:260)));
  return st;
}
// How far a contact pins the rope onto the straight weapon at clock t: laid on over the last 70 ms before it, held
// for 40 ms (the frame that draws the contact may come a little after it), let go over 90 ms
function pinAt(hits,t){
  let p=0;
  for(const h of hits||[]){const d=t-h;
    const v=d<-70||d>130?0:d<=0?1-(-d/70):d<=40?1:1-(d-40)/90;p=Math.max(p,v*v*(3-2*v));}
  return p;
}
const api={KIND,cfg,reset,step,pinAt,rigid};
root.PitsFlex=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
