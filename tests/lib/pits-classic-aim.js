// Geometry fixture for the original reach/handedness regression vectors.
const PS_IDLE={t:5,hd:0,a1:58,a2:46,w:128,ba1:-18,ba2:-34,l1:30,l2:-34,bl1:-28,bl2:16,dx:0,lift:0};
const PS_POSE={lunge:{...PS_IDLE,t:20,hd:4,ba1:-72,ba2:-10,l1:52,l2:-52,bl1:-46,bl2:-8}};
const PS_ARM=[32,30];                       // upper arm, forearm
// Geometry of a pose c for a fighter whose weapon is wk (all in the fighter's own
// frame: x forward, y down, feet at y 0, before dx and facing are applied).
function pitsStageGeom(c,wk,swap){
  const t=c.t;
  const Sh=[Math.sin(psRad(t))*58,-Math.cos(psRad(t))*58],M=[Sh[0]*.5,Sh[1]*.5],H=[0,0];
  const hd=psAdd(Sh,[Math.sin(psRad(t+c.hd))*23,-Math.cos(psRad(t+c.hd))*23]);
  // poses are role based: the weapon arm takes the (a1,a2) pair, the other arm the (ba1,ba2) pair
  const wa=[c.a1,c.a2],oa=[c.ba1,c.ba2];
  const E=psAdd(Sh,psDir(wa[0],PS_ARM[0])),Hn=psAdd(E,psDir(wa[0]+wa[1],PS_ARM[1]));
  const bE=psAdd(Sh,psDir(oa[0],PS_ARM[0])),bHn=psAdd(bE,psDir(oa[0]+oa[1],PS_ARM[1]));
  const K=psDir(c.l1,46),F=psAdd(K,psDir(c.l1+c.l2,46)),bK=psDir(c.bl1,46),bF=psAdd(bK,psDir(c.bl1+c.bl2,46));
  const low=Math.max(F[1],bF[1],hd[1]+13,Hn[1],bHn[1],K[1],bK[1],Sh[1]);
  const off=-low-4-c.lift,q=p=>[p[0],p[1]+off];
  const len=wk?wk.len:92;
  const wAng=c.w;                           // weapon angle is absolute
  const tip=psAdd(q(Hn),psDir(wAng,len));
  return {Sh:q(Sh),M:q(M),H:q(H),hd:q(hd),E:q(E),Hn:q(Hn),bE:q(bE),bHn:q(bHn),K:q(K),bK:q(bK),F:q(F),bF:q(bF),tip,off};
}
// Aim a strike: solve the lunge (dx) and the arm and weapon angles so the tip ends
// at `target` (the fighter's own frame, x forward from its standing point, y down
// from the ground line). base is the pose to start from (stance). arm 'weapon'
// uses the weapon arm; 'off' the shield arm (a shield bash). pen is how far the
// tip goes into the target. Returns {pose, tip, reach, ok}.
function pitsStageAim(base,wk,swap,target,opts){
  opts=opts||{};
  const arm=opts.arm||'weapon',pen=opts.pen==null?6:opts.pen,minDx=opts.minDx==null?0:opts.minDx,maxDx=opts.maxDx==null?260:opts.maxDx;
  const g=pitsStageGeom({...base,dx:0},wk,swap);
  const WL=arm==='off'?(opts.shieldR||16):(wk?wk.len:92),R=PS_ARM[0]+PS_ARM[1]+WL;
  const want=Math.max(10,R-pen),vy=target[1]-g.Sh[1];
  const ux=Math.sqrt(Math.max(0,want*want-vy*vy));
  const raw=target[0]-g.Sh[0]-ux;
  let dx=Math.max(minDx,Math.min(maxDx,raw));
  const pair=arm==='off'?['ba1','ba2']:['a1','a2'];
  const pose={...base,dx};
  let tip,clamped=raw>maxDx;
  const Sx=dx+g.Sh[0];
  if(raw<minDx){
    // the target is nearer than the full reach: keep the lunge and bend the arm so the tip still lands on it
    const w=psDeg(Math.atan2(target[0]-Sx,vy)),hand=[target[0]-Math.sin(psRad(w))*(WL-pen),target[1]-Math.cos(psRad(w))*(WL-pen)];
    const hv=[hand[0]-Sx,hand[1]-g.Sh[1]],d=Math.max(Math.abs(PS_ARM[0]-PS_ARM[1])+2,Math.min(PS_ARM[0]+PS_ARM[1],Math.hypot(hv[0],hv[1])));
    const th=psDeg(Math.atan2(hv[0],hv[1])),al=psDeg(Math.acos(Math.max(-1,Math.min(1,(PS_ARM[0]*PS_ARM[0]+d*d-PS_ARM[1]*PS_ARM[1])/(2*PS_ARM[0]*d)))));
    let best=null;
    for(const a1 of [th-al,th+al]){
      const E=psDir(a1,PS_ARM[0]),f=psDeg(Math.atan2(hv[0]-E[0],hv[1]-E[1]));
      if(!best||E[1]>best.ey)best={a1,a2:f-a1,ey:E[1]};
    }
    pose[pair[0]]=best.a1;pose[pair[1]]=best.a2;if(arm==='weapon')pose.w=w;
  }else{
    const vx=target[0]-Sx,ang=psDeg(Math.atan2(vx,vy));
    pose[pair[0]]=ang;pose[pair[1]]=0;if(arm==='weapon')pose.w=ang;
  }
  const gg=pitsStageGeom(pose,wk,swap);
  const sd=psDir(pose.ba1+pose.ba2,opts.shieldR||16);
  tip=arm==='off'?[gg.bHn[0]+sd[0]+dx,gg.bHn[1]+sd[1]]:[gg.tip[0]+dx,gg.tip[1]];
  return {pose,tip,reach:R,ok:!clamped&&Math.hypot(tip[0]-target[0],tip[1]-target[1])<=pen+8,angle:pose[pair[0]]};
}

