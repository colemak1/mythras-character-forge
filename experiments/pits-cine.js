// The Pits: the cinematic movement (owner, 2026-11-15: "make it cooler, meatier ... make me say wow").
//
// Pose to pose, like a hand-animated stick fight: a few extreme key poses per action, snapped between with strong
// easing, big travel (dashes, leaps, skids, knockbacks), and a blade that whips in last. The dice still decide
// everything: each exchange is chosen from the engine's facts (who attacks, with what, where it lands, parried, evaded,
// how hard), and the picture is a pure function of the stage clock, so a decision can stop it and a replay can run it
// again. No physics and no rules here: presentation only. It answers the same interface as PitsSpringLive, so the
// stage (pits-stage.js) drives it the same way: declare (intent), hold, resolve (blow).
//
// Frames: the world is the stage's (x to the right, y up from the floor). A pose is written in the fighter's own frame
// (x forward, toward where it faces) around a base point on the floor, and turned into world values when keyed.
// Angles are degrees in the fighter's frame: 0 forward, 90 up, -90 down, 180 back.
(function(root){
'use strict';
const DIM={thigh:46,shin:46,spine:29,neck:23,upper:32,fore:30,headR:13};
const LEG=DIM.thigh+DIM.shin,ARM=DIM.upper+DIM.fore,CENTRE=600;
const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,u)=>a+(b-a)*u;
const EASE={
  lin:u=>u,
  in:u=>u*u,
  in3:u=>u*u*u,
  out:u=>1-Math.pow(1-u,3),
  out5:u=>1-Math.pow(1-u,5),
  io:u=>u*u*(3-2*u),
  back:u=>{const c=1.9;return 1+(c+1)*Math.pow(u-1,3)+c*Math.pow(u-1,2);},
  // a thrown body: fast away, slowing (a skid)
  skid:u=>1-Math.pow(1-u,2.4),
  // up and down again within one key (jump heights are written with `arc`, not with this)
};
// kd: the back knee down on the floor (0: the leg as the feet put it; 1: kneeling on it; between, the leg turns
// from one to the other with every bone its own length: batch (b), on one knee from the ground)
const CH=['px','py','ffx','ffy','bfx','bfy','lean','bend','head','ua','fa','oua','ofa','w','turn','kd'];
const ANG=['lean','bend','head','ua','fa','oua','ofa','w'];
// parts that arrive a little after the body: the head, the empty arm, the upper spine
const LAG={head:34,oua:36,ofa:48,bend:14,turn:8};

// ----- weapons -----
// family: how it is used. cut: swung (swords, axes, clubs). thrust: driven straight (daggers, rapiers, spears).
// two: both hands, how far along the weapon the lead hand sits. heavy: slower to start, harder to stop.
function profile(wk){
  wk=wk||{kind:'blade',len:92};const k=wk.kind,len=wk.len||92;
  const p={len,kind:k,fam:'cut',two:0,heavy:false,reachAt:.72};
  if(k==='blade'){
    if(len<=68||wk.thin){p.fam='thrust';p.reachAt=.92;}
    if(len>=116){p.two=20;p.heavy=true;}
  }else if(k==='spear'||k==='trident'){p.fam='thrust';p.two=48;p.reachAt=.97;}
  else if(k==='polearm'){p.two=52;p.heavy=true;p.reachAt=.9;}
  else if(k==='staff'){p.two=44;p.reachAt=.85;}
  else if(k==='axe'){p.heavy=true;p.reachAt=.86;if(wk.two||len>=110)p.two=26;}
  else if(k==='club'||k==='pick'){p.heavy=true;p.reachAt=.92;if(len>100)p.two=26;}
  else if(k==='chain'||k==='whip'||k==='net'){p.reachAt=.95;}
  // The engine's handedness, when the stage gives it (audit CA-05): a one-handed weapon is held in one hand (a
  // shortspear with a shield), a two-handed one in both (a military flail on its handle)
  if(wk.hands===1)p.two=0;
  else if(wk.hands===2&&!p.two)p.two=k==='chain'||k==='whip'||k==='net'?22:26;
  if(p.two&&k==='blade')p.two=-12;               // a two-handed sword: the second hand on the hilt, below the first
  // what is drawn of it, along the weapon from the weapon hand (shared with the painter, CA-07)
  const ex=extent(wk);p.from=ex.from;p.to=ex.to;
  // the point that lands is on the drawn weapon
  p.reachAt=Math.min(p.reachAt,(p.to-4)/len);
  return p;
}
// The drawn extent of a weapon, along it from the weapon hand: a spear's butt and a staff's lower half are behind the
// hand; a two-handed sword or axe has a hilt or haft below it for the second hand. The painter (psPaint) draws this.
function extent(wk){
  wk=wk||{kind:'blade',len:92};const k=wk.kind,len=wk.len||92;
  if(k==='spear'||k==='trident'||k==='polearm')return {from:-36,to:len};
  if(k==='staff')return {from:-30,to:len-30};
  if(wk.hands===2&&(k==='blade'||k==='axe'||k==='club'||k==='pick'))return {from:-18,to:len};
  return {from:0,to:len};
}
// The wrist (owner, 2026-11-16: "the weapons are still not staying in the hands naturally, they end up in weird angles
// that don't really make sense for the wrist"). The weapon's angle from the forearm, in the fighter's frame (up
// positive): a hand turned palm down lets the weapon drop about 75 degrees below the line of the forearm, a hand thumb
// up holds it up to about 125 degrees above (the grip's own angle across the palm and the wrist's tilt). Past that the
// weapon would fold back along the forearm, which a wrist cannot do: it stops at the limit (solve()).
const WRIST={lo:-75,hi:125};
// how far past the wrist's turn a weapon at angle w is, on a forearm at angle fa (0: inside it)
function wristOver(w,fa){const r=((w-fa+540)%360+360)%360-180;return r<WRIST.lo-.01?WRIST.lo-r:r>WRIST.hi+.01?r-WRIST.hi:0;}
// The wrist is kept where each key is written (key()), so every pose holds the weapon in the hand and the in-betweens,
// which turn the forearm and the weapon together, keep it there too. A key asking for a weapon folded past the wrist
// first takes the elbow the other way (the hand and the weapon stay exactly where the movement put them, so contacts
// do not move); only if no elbow holds it does the weapon stop at the nearer limit.
function keepWrist(Q,h,eb){
  if(Q.w==null||Q.fa==null||!wristOver(Q.w,Q.fa))return;
  if(h){let best={fa:Q.fa,ua:Q.ua,o:wristOver(Q.w,Q.fa)};
    for(const e of [eb>0?-1:1,eb<0?0:-1,0]){const a=armAngles(h,e),o=wristOver(Q.w,a.fa);if(o<best.o-.5)best={...a,o};}
    Q.ua=best.ua;Q.fa=best.fa;if(!best.o)return;}
  const r=((Q.w-Q.fa+540)%360+360)%360-180;
  Q.w=Q.fa+(r>WRIST.hi&&r-WRIST.hi<=WRIST.lo+360-r?WRIST.hi:WRIST.lo);
}
const SHIELD_R={buckler:13,target:17,peltast:17,heater:19,viking:21,kite:22,hoplite:23,scutum:26};
const supports=()=>true;
let KEEP=1500;       // how much of the past a fighter keeps (ms); 0 keeps it all (the study tools)

// ----- the rig -----
const dirL=a=>[Math.cos(rad(a)),Math.sin(rad(a))];
// two bones from a to b; the joint goes to the side `prefer` points to
function ik2(a,b,l1,l2,prefer,free){
  let dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1e-6;
  const dd=clamp(d,Math.abs(l1-l2)+.5,l1+l2-.2),ux=dx/d,uy=dy/d;
  const x=(l1*l1-l2*l2+dd*dd)/(2*dd),h=Math.sqrt(Math.max(0,l1*l1-x*x));
  const m=[a[0]+ux*x,a[1]+uy*x],j1=[m[0]-uy*h,m[1]+ux*h],j2=[m[0]+uy*h,m[1]-ux*h];
  const s1=(j1[0]-m[0])*prefer[0]+(j1[1]-m[1])*prefer[1];
  let mid=s1>=0?j1:j2;
  // (a knee or an elbow is never under the floor: on the ground the joint goes the other way)
  if(!free&&mid[1]<1){const alt=s1>=0?j2:j1;if(alt[1]>mid[1])mid=alt;}
  return {mid,end:[a[0]+ux*dd,a[1]+uy*dd],over:d-dd};
}
// the torso in the fighter's frame from a local pose (hip, lean, bend, head, turn)
function torsoL(P){
  const a1=rad(P.lean),a2=rad(P.lean+P.bend),a3=rad(P.lean+P.bend+P.head),tu=P.turn||0;
  const H=P.hip,M=[H[0]+Math.sin(a1)*DIM.spine,H[1]+Math.cos(a1)*DIM.spine];
  const S=[M[0]+Math.sin(a2)*DIM.spine,M[1]+Math.cos(a2)*DIM.spine];
  return {H,M,S,wS:[S[0]+tu,S[1]-Math.abs(tu)*.15],oS:[S[0]-tu*.7,S[1]],Hd:[S[0]+Math.sin(a3)*DIM.neck,S[1]+Math.cos(a3)*DIM.neck]};
}
// channel values (world) -> joints (world). f: facing.
function solve(v,f,m,opt){
  opt=opt||{};
  let py=v.py;
  // a planted leg never stretches: the hips sink over a long stance instead
  for(const [fx,fy] of [[v.ffx,v.ffy],[v.bfx,v.bfy]]){
    if(fy>3)continue;const dx=Math.abs(fx-v.px);
    if(dx<LEG*.985){const top=Math.sqrt(LEG*LEG*.97-dx*dx)+fy;if(py>top)py=top;}
  }
  const a1=rad(v.lean),a2=rad(v.lean+v.bend),a3=rad(v.lean+v.bend+v.head),tu=v.turn||0;
  const P=[v.px,py],M=[P[0]+f*Math.sin(a1)*DIM.spine,P[1]+Math.cos(a1)*DIM.spine];
  const S=[M[0]+f*Math.sin(a2)*DIM.spine,M[1]+Math.cos(a2)*DIM.spine];
  const wS=[S[0]+f*tu,S[1]-Math.abs(tu)*.15],oS=[S[0]-f*tu*.7,S[1]];
  const Hd=[S[0]+f*Math.sin(a3)*DIM.neck,S[1]+Math.cos(a3)*DIM.neck];
  const D=a=>{const d=dirL(a);return [f*d[0],d[1]];};
  let ua=v.ua,fa=v.fa,oua=v.oua,ofa=v.ofa,w=v.w;
  if(opt.weapon){ua=-84;fa=-96;w=-100;}            // a disabled arm hangs
  // a pinned weapon or shield is held down where it is pinned until it is freed (audit CA-12)
  else if(opt.pinW){ua=-48;fa=-60;w=-58;}
  if(opt.off){oua=-94;ofa=-86;}
  else if(opt.pinS){oua=-58;ofa=-40;}
  const du=D(ua),df=D(fa);let E=[wS[0]+du[0]*DIM.upper,wS[1]+du[1]*DIM.upper],Hn=[E[0]+df[0]*DIM.fore,E[1]+df[1]*DIM.fore];
  // an arm lying on the ground rests on it
  if(Hn[1]<1||E[1]<1){const r=ik2(wS,[Hn[0],Math.max(1,Hn[1])],DIM.upper,DIM.fore,[0,1]);E=r.mid;Hn=r.end;}
  const len=m?(m.prof.to!=null?m.prof.to:m.weapon.len):92;let dw=D(w);
  let tip=[Hn[0]+dw[0]*len,Hn[1]+dw[1]*len],blen=len;
  // a weapon does not go through the floor: its point rests on it and it is drawn shorter (turned into the scene)
  if(tip[1]<1){
    if(Hn[1]>4){const k=(Hn[1]-1)/(Hn[1]-tip[1]);tip=[Hn[0]+(tip[0]-Hn[0])*k,1];blen=Math.max(10,len*k);}
    // (a hand on the ground: the weapon lies along it)
    else{w=Math.cos(rad(w))>=0?0:180;tip=[Hn[0]+f*Math.cos(rad(w))*len,Hn[1]];}
    dw=D(w);                                      // (the grip below follows the weapon as drawn)
  }
  let ou=D(oua),of=D(ofa),oE=[oS[0]+ou[0]*DIM.upper,oS[1]+ou[1]*DIM.upper],oHn=[oE[0]+of[0]*DIM.fore,oE[1]+of[1]*DIM.fore];
  if(oHn[1]<1||oE[1]<1){const r=ik2(oS,[oHn[0],Math.max(1,oHn[1])],DIM.upper,DIM.fore,[0,1]);oE=r.mid;oHn=r.end;}
  // both hands on a long weapon: the lead hand holds the shaft where it can reach it
  let grip=null;
  const two=m&&m.prof.two&&!opt.off&&!opt.weapon&&!opt.unarmed?m.prof.two:0;
  if(two){
    // the second hand holds the drawn shaft where it can reach it, nearest the usual grip; where no part of the shaft
    // is in reach it lets go for that moment, instead of hanging in the air beside the weapon (audit CA-06)
    const at=d=>[Hn[0]+dw[0]*d,Hn[1]+dw[1]*d],far=d=>Math.hypot(at(d)[0]-oS[0],at(d)[1]-oS[1]);
    const lo=(m.prof.from||0)+4,hi=Math.min(blen,len)-8;let d=null;
    if(far(two)<=ARM*.98&&two>=lo&&two<=hi)d=two;
    else for(let k=3;k<=hi-lo+3&&d==null;k+=3)for(const x of [two-k,two+k])if(x>=lo&&x<=hi&&far(x)<=ARM*.98){d=x;break;}
    grip=d;
    if(d!=null){const g=at(d),r=ik2(oS,[g[0],Math.max(1,g[1])],DIM.upper,DIM.fore,[-f*.3,-1]);oE=r.mid;oHn=r.end;}
  }
  const kneeWay=[f*.9,.45];
  const fl=ik2(P,[v.ffx,Math.max(0,v.ffy)],DIM.thigh,DIM.shin,kneeWay),bl=ik2(P,[v.bfx,Math.max(0,v.bfy)],DIM.thigh,DIM.shin,kneeWay);
  let bK=bl.mid,bF=bl.end;
  if(v.kd>.001)({bK,bF}=kneelLeg(P,f,bK,bF,Math.min(1,v.kd)));
  return {P,M,S,wS,oS,Hd,E,Hn,oE,oHn,K:fl.mid,F:fl.end,bK,bF,tip,w,blen,grip};
}
// The back leg kneeling (batch (b)): the knee on the floor behind the hips, the shin along the floor behind it. The
// thigh and the shin turn from the leg the feet asked for to this one by angle (u), so the bones keep their length and
// nothing jumps; the foot is wherever the leg puts it, never under the floor.
function kneelLeg(P,f,K0,F0,u){
  // (in the fighter's own frame: x forward, angles from forward, up positive)
  const L=p=>[f*(p[0]-P[0]),p[1]-P[1]],W=q=>[P[0]+f*q[0],P[1]+q[1]],at=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
  const mix=(a,b,w)=>{let d=(b-a)%(2*Math.PI);if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;return a+d*w;};
  const dh=Math.max(2,P[1]-2),kx=dh<DIM.thigh?Math.sqrt(DIM.thigh*DIM.thigh-dh*dh):6;
  // the leg on the way: the knee drawn up in front, the shin hanging (the foot never passes through the floor or
  // swaps the knee to the other side, whatever the feet do meanwhile)
  const TUCK=[rad(80),rad(-110)];
  const k0=L(K0),f0=L(F0);
  let ta,sa;
  if(u<.25){const w=u/.25;ta=mix(at([0,0],k0),TUCK[0],w);sa=mix(at(k0,f0),TUCK[1],w);}
  else{const w=(u-.25)/.75;ta=mix(TUCK[0],Math.atan2(-dh,-kx),w);sa=mix(TUCK[1],Math.PI,w);}
  let k=[Math.cos(ta)*DIM.thigh,Math.sin(ta)*DIM.thigh];
  // (nor the knee: it rests on it)
  if(k[1]<1-P[1]){const sy=(1-P[1])/DIM.thigh;k=[Math.sign(k[0]||-1)*Math.sqrt(Math.max(0,1-sy*sy))*DIM.thigh,1-P[1]];}
  let fo=[k[0]+Math.cos(sa)*DIM.shin,k[1]+Math.sin(sa)*DIM.shin];
  // (the shin does not go through the floor on the way: it turns up off it, the same length)
  if(fo[1]<-P[1]){const dy=Math.min(DIM.shin,k[1]+P[1]),dx=Math.sqrt(DIM.shin*DIM.shin-dy*dy);fo=[k[0]+Math.sign(fo[0]-k[0]||-1)*dx,k[1]-dy];}
  return {bK:W(k),bF:W(fo)};
}

// ----- the track: whole-pose keys, sampled per channel -----
function idx(ks,t){let lo=0,hi=ks.length-1;while(lo<hi){const mid=(lo+hi+1)>>1;if(ks[mid].t<=t)lo=mid;else hi=mid-1;}return lo;}
function chan(m,c,t){
  const ks=m.keys,i=idx(ks,t),a=ks[i],b=ks[i+1];
  if(!b||t<=a.t)return a.v[c];
  const u=(t-a.t)/(b.t-a.t),foot=c[1]==='f'&&(c[0]==='f'||c[0]==='b');
  const e=EASE[(b.ec&&b.ec[c])||(foot?b.fe:null)||b.e]||EASE.io;
  let x=a.v[c]+(b.v[c]-a.v[c])*e(u);
  // an arc on the way: a step lifts the foot, a jump lifts the body
  if(c==='ffy'&&b.lift&&b.lift.ff)x+=Math.sin(Math.PI*u)*b.lift.ff;
  else if(c==='bfy'&&b.lift&&b.lift.bf)x+=Math.sin(Math.PI*u)*b.lift.bf;
  else if(c==='py'&&b.arc)x+=Math.sin(Math.PI*u)*b.arc;
  return x;
}
// How much of the lag applies at t (1: all of it). A key marked `lead` (a shield strike: the shield is the blow) has
// every part arrive with the body: the lag shrinks to nothing on the way into it and comes back over 100 ms after it,
// so the picture never jumps. Everywhere else it is 1 and nothing changes.
function lagAt(m,t){
  const ks=m.keys,i=idx(ks,t),a=ks[i],b=ks[i+1];
  if(b&&b.lead)return a.lead?0:clamp((b.t-t)/((b.t-a.t)||1),0,1);
  for(let j=i;j>=0&&ks[j].t>t-100;j--)if(ks[j].lead)return clamp((t-ks[j].t)/100,0,1);
  return 1;
}
const faceAt=(m,t)=>m.keys[idx(m.keys,t)].face;
function sample(m,t,nolag){
  const v={},g=nolag?0:lagAt(m,t);for(const c of CH)v[c]=chan(m,c,nolag?t:t-(LAG[c]||0)*g);
  // an airborne body carries its feet with it
  return v;
}
function joints(m,t,opt){return solve(sample(m,t),faceAt(m,t),m,opt);}
const near=(a,ref)=>a+360*Math.round((ref-a)/360);

// A full local pose from a partial one, on top of the last one written.
function fill(m,P){
  const L=m.lastP,o={...L,...P};
  o.hip=(P.hip||L.hip).slice();o.ff=(P.ff||L.ff).slice();o.bf=(P.bf||L.bf).slice();
  return o;
}
// hand offset from the shoulder -> arm angles (elbow below the line unless eb says above)
function armAngles(h,eb){
  // (around the shoulder, not on the floor: the floor rule of ik2 would put every elbow asked to be below the shoulder
  // above it, and the weapon would sit awkwardly in the hand, owner 2026-11-16)
  const r=ik2([0,0],h,DIM.upper,DIM.fore,eb>0?[0,1]:eb<0?[-1,0]:[0,-1],true);
  return {ua:deg(Math.atan2(r.mid[1],r.mid[0])),fa:deg(Math.atan2(r.end[1]-r.mid[1],r.end[0]-r.mid[0]))};
}
// Write a key: pose P (local, partial) at time t. o: at (the base, world x), e (ease), ec (ease per channel),
// plant ('ff','bf','both': those feet stay where they are in the world), lift ({ff,bf}: step height), arc (jump
// height), spin ({w:1|-1,...}: which way an angle travels), slide (feet skid, for dust), face.
function key(m,t,P,o){
  o=o||{};const last=m.keys[m.keys.length-1],pv=last.v,f=o.face||last.face;
  if(t<=last.t)t=last.t+1;
  const base=o.at!=null?o.at:m.base;
  const Q=fill(m,P||{});
  // (the knee stays down through a hold or a lean; a pose that places the feet says whether it kneels)
  Q.kd=P&&P.kd!=null?P.kd:P&&(P.ff||P.bf)?0:(m.lastP.kd||0);
  if(P&&P.h){const a=armAngles(P.h,P.eb||0);Q.ua=a.ua;Q.fa=a.fa;}
  if(!o.free)keepWrist(Q,P&&P.h,P&&P.eb||0);
  if(P&&P.o){const a=armAngles(P.o,P.oeb||0);Q.oua=a.ua;Q.ofa=a.fa;}
  delete Q.h;delete Q.o;delete Q.eb;delete Q.oeb;
  const v={px:base+f*Q.hip[0],py:Q.hip[1],ffx:base+f*Q.ff[0],ffy:Q.ff[1],bfx:base+f*Q.bf[0],bfy:Q.bf[1],turn:Q.turn||0,kd:Q.kd};
  const pl=o.plant;
  if(pl==='ff'||pl==='both'){v.ffx=pv.ffx;v.ffy=pv.ffy;Q.ff=[f*(v.ffx-base),v.ffy];}
  if(pl==='bf'||pl==='both'){v.bfx=pv.bfx;v.bfy=pv.bfy;Q.bf=[f*(v.bfx-base),v.bfy];}
  for(const c of ANG){
    let a=near(Q[c],pv[c]);const s=o.spin&&o.spin[c];
    if(s>0&&a<pv[c]-1)a+=360;if(s<0&&a>pv[c]+1)a-=360;
    if(o.turns&&o.turns[c])a+=360*o.turns[c];
    v[c]=a;
  }
  // (the weapon and the forearm turn the same way round from the last key, never through each other: of the ways round
  // only one keeps the wrist inside its turn the whole way, even where the movement asked for a spin; a full turn
  // asked for on purpose is kept)
  if(!(o.turns&&o.turns.w)&&!o.free){const r0=pv.w-pv.fa,span=WRIST.hi-WRIST.lo;
    if(((r0-WRIST.lo)%360+360)%360<=span){const c=Math.floor((r0-WRIST.lo)/360);v.w+=360*Math.round(((WRIST.lo+WRIST.hi)/2+360*c-(v.w-v.fa))/360);}}
  // steps: a foot that moves along the floor is lifted on the way, unless it skids
  const lift={...(o.lift||{})};
  if(!o.slide)for(const k of ['ff','bf']){
    if(lift[k]!=null)continue;const d=Math.abs(v[k+'x']-pv[k+'x']);
    if(d>5&&v[k+'y']<2&&pv[k+'y']<2)lift[k]=Math.min(20,5+d*.14);
  }
  let ec=o.ec||null;
  if(v.kd!==pv.kd)ec={...(ec||{}),kd:v.kd>pv.kd?'out5':'in'};
  const k={t,v,e:o.e||'out',ec,fe:o.fe||null,lift,arc:o.arc||0,face:f,slide:!!o.slide,tag:o.tag||null};
  if(o.lead)k.lead=true;
  m.keys.push(k);
  m.base=base;m.lastP=Q;
  return t;
}
// Start writing from the picture as it is at t: what was planned for later is dropped.
function cut(m,t){
  const ks=m.keys;if(!ks.length)return;
  const f=faceAt(m,t),v=sample(m,t,true);
  while(ks.length>1&&ks[ks.length-1].t>=t)ks.pop();
  // (old keys are no longer needed once the picture has passed them)
  while(KEEP&&ks.length>3&&ks[1].t<t-KEEP)ks.shift();
  const last=ks[ks.length-1];
  if(last.t>=t)return;
  ks.push({t,v,e:'lin',ec:null,fe:null,lift:{},arc:0,face:f,slide:false,tag:'cut'});
  // the local pose that matches, around the base under the hips
  const L=m.lastP,base=m.base=(v.ffx+v.bfx)/2;
  m.lastP={...L,hip:[f*(v.px-base),v.py],ff:[f*(v.ffx-base),v.ffy],bf:[f*(v.bfx-base),v.bfy],
    lean:v.lean,bend:v.bend,head:v.head,ua:v.ua,fa:v.fa,oua:v.oua,ofa:v.ofa,w:v.w,turn:v.turn,kd:v.kd};
}

// ----- the pose library (cut family unless a name says otherwise) -----
// hip: the pelvis over the base; ff/bf: front and back foot; h/o: weapon hand and empty hand from the shoulder.
const POSE={
  guard:    {hip:[-4,68],lean:14,bend:6,head:-10,ff:[36,0],bf:[-42,0],h:[36,-8],w:58,o:[8,-34],turn:4},
  guardLow: {hip:[-8,60],lean:22,bend:6,head:-14,ff:[40,0],bf:[-48,0],h:[-10,-46],w:-152,o:[26,-18],turn:-3},
  guardHigh:{hip:[-2,72],lean:8,bend:2,head:-6,ff:[32,0],bf:[-40,0],h:[14,30],eb:1,w:122,o:[28,-16],turn:2},
  guardPoint:{hip:[-10,64],lean:10,bend:4,head:-8,ff:[40,0],bf:[-46,0],h:[30,-22],w:12,o:[-6,-30],turn:6},
  hurt:     {hip:[-10,62],lean:24,bend:14,head:-6,ff:[30,0],bf:[-40,0],h:[26,-24],w:34,o:[10,-36],turn:0},
  tall:     {hip:[0,84],lean:3,bend:0,head:0,ff:[16,0],bf:[-18,0],h:[10,-52],w:-72,o:[-4,-56],turn:0},
  // wind-ups: the weight goes back and down, the weapon as far from the target as it gets
  upHigh:   {hip:[-24,56],lean:-6,bend:-8,head:4,ff:[30,0],bf:[-54,0],h:[-18,34],eb:1,w:152,o:[34,4],turn:-8},
  upSide:   {hip:[-26,54],lean:8,bend:4,head:0,ff:[32,0],bf:[-56,0],h:[-36,-4],eb:-1,w:188,o:[32,-6],turn:-10},
  upLow:    {hip:[-22,48],lean:30,bend:8,head:-22,ff:[36,0],bf:[-56,0],h:[-22,-42],w:-146,o:[30,-14],turn:-6},
  upThrust: {hip:[-28,54],lean:14,bend:4,head:-8,ff:[34,0],bf:[-58,0],h:[-26,-14],eb:-1,w:4,o:[40,2],turn:-10},
  upStab:   {hip:[-22,58],lean:2,bend:-4,head:2,ff:[30,0],bf:[-52,0],h:[-8,36],eb:1,w:-58,o:[34,-4],turn:-8},
  upBash:   {hip:[-24,54],lean:18,bend:6,head:-10,ff:[34,0],bf:[-56,0],h:[-20,-30],w:140,o:[-6,-18],turn:8},
  // wards: where the weapon waits for the blow
  wardHigh: {hip:[-10,60],lean:4,bend:0,head:-4,ff:[32,0],bf:[-46,0],h:[30,30],eb:1,w:168,o:[20,-20],turn:4},
  wardMid:  {hip:[-12,60],lean:8,bend:2,head:-6,ff:[32,0],bf:[-48,0],h:[38,-6],w:96,o:[2,-30],turn:6},
  wardLow:  {hip:[-10,52],lean:22,bend:6,head:-16,ff:[34,0],bf:[-48,0],h:[34,-34],w:-72,o:[-4,-24],turn:6},
  wardShield:{hip:[-12,56],lean:16,bend:6,head:-8,ff:[34,0],bf:[-50,0],h:[-14,-30],w:124,o:[40,-4],turn:-8},
  // ready to spring away
  coil:     {hip:[-14,50],lean:18,bend:8,head:-12,ff:[30,0],bf:[-40,0],h:[20,-30],w:36,o:[14,-34],turn:0},
  // on the ground
  kneel:    {hip:[-6,36],lean:16,bend:8,head:-10,ff:[30,0],bf:[-34,0],h:[30,-12],w:50,o:[-8,-42],turn:2},
  prop:     {hip:[-30,12],lean:-38,bend:14,head:20,ff:[34,0],bf:[10,0],h:[28,6],w:30,o:[-30,-46],turn:0},
  flat:     {hip:[-40,7],lean:-88,bend:-2,head:-4,ff:[50,2],bf:[36,2],h:[-30,-6],w:176,o:[-34,-10],turn:0},
  // more ways to wait on the ground (batch (b)): sitting up with the weapon out in front, a hand behind; rolled back on
  // a hip with the weapon up across the body
  sit:      {hip:[-20,12],lean:-14,bend:16,head:-6,ff:[44,0],bf:[26,0],h:[34,-2],w:26,o:[-30,-52],turn:0},
  side:     {hip:[-26,10],lean:-52,bend:30,head:22,ff:[28,0],bf:[10,0],h:[26,16],eb:1,w:104,o:[-18,-44],turn:-4},
  // attacking from the ground (batch (b)), always from one knee (the back knee on the floor): a rising cut; a hand
  // on the floor driving the body behind the point; the weapon over the top and chopped down at a leg
  gUpRise:  {hip:[-6,34],lean:6,bend:4,head:-6,ff:[38,0],bf:[-76,0],kd:1,h:[-22,-34],w:-150,o:[26,-30],turn:-6},
  gUpThrust:{hip:[-12,26],lean:40,bend:10,head:-24,ff:[40,0],bf:[-70,0],kd:1,h:[-30,-6],eb:-1,w:4,o:[8,-66],turn:-8},
  gUpChop:  {hip:[-10,34],lean:-6,bend:-4,head:-2,ff:[38,0],bf:[-76,0],kd:1,h:[-6,36],eb:1,w:150,o:[24,-36],turn:-4},
  // parrying from the ground, by where the blow comes: lying back on the elbow with the weapon across above the face;
  // sitting up with it upright in front; sitting forward with it down across the legs
  gWardHigh:{hip:[-30,12],lean:-46,bend:22,head:14,h:[18,38],eb:1,w:168,o:[-28,-34]},
  gWardMid: {hip:[-24,14],lean:-18,bend:16,head:-6,h:[36,8],eb:1,w:100,o:[-30,-50]},
  gWardLow: {hip:[-18,14],lean:8,bend:14,head:-14,h:[36,-16],w:-50,o:[-30,-50]},
  face:     {hip:[30,8],lean:86,bend:4,head:6,ff:[-52,2],bf:[-38,2],h:[36,-2],w:-4,o:[30,-10],turn:0},
  yield:    {hip:[-8,40],lean:10,bend:8,head:18,ff:[30,0],bf:[-30,0],h:[6,-56],w:-80,o:[26,20],oeb:1,turn:0},
  // Compel Surrender: the weapon lowered, the off hand up and out with the white flag (the stage draws the flag)
  surrender:{hip:[-10,64],lean:-2,bend:2,head:14,ff:[26,0],bf:[-32,0],h:[8,-58],w:-84,o:[26,34],oeb:-1,turn:0},
  victory:  {hip:[0,82],lean:2,bend:-2,head:-4,ff:[18,0],bf:[-20,0],h:[20,-48],w:-64,o:[-6,-54],turn:2},
};
const READY=['guard','guardLow','guardHigh','guardPoint'];
const GROUND_READY=['prop','sit','side'];
// the body of each attack from the ground (no arm: aimed() puts the weapon on the target), its wind-up, and the
// standing move it swings like (the swing's angles, spin and follow-through)
const GROUND={
  gRise:  {body:{hip:[8,36],lean:22,bend:6,head:-12,ff:[46,0],bf:[-70,0],kd:1,turn:10,o:[-30,-44]},up:'gUpRise',like:'rise'},
  gThrust:{body:{hip:[10,30],lean:36,bend:6,head:-20,ff:[52,0],bf:[-64,0],kd:1,turn:12,o:[-34,-36]},up:'gUpThrust',like:'lunge'},
  gChop:  {body:{hip:[6,34],lean:34,bend:10,head:-18,ff:[46,0],bf:[-70,0],kd:1,turn:10,o:[-30,-40]},up:'gUpChop',like:'over'},
};

// ----- on the ground -----
// A fighter the rules have on the ground acts from there (audit CA-02): the highest it goes is the one knee it attacks
// from, until Regain Footing (stand) gets it up. low() fits a pose to that; a standing fighter's pose is unchanged.
const GROUND_HIP=36;
function low(m,P){
  if(!m.down||!P)return P;
  const h=P.hip||(m.lastP&&m.lastP.hip);if(!h||h[1]<=GROUND_HIP)return P;
  const Q={...P,hip:[h[0],GROUND_HIP]};
  for(const k of ['ff','bf'])if(Q[k]&&Q[k][1]>0)Q[k]=[Q[k][0],0];
  return Q;
}
// a key for the attacker (or the winner): on the ground if the fighter is down
function keyA(m,t,P,o){return key(m,t,low(m,P),o);}

// ----- fighters -----
let pend=null;
function fighter(id,wk,swap,look){
  if(!pend||pend[id])pend={seed:(Math.random()*1e9)|0,n:0,gap:0,fx:[]};
  const face=id==='a'?1:-1,x=CENTRE+(id==='a'?-1:1)*110;
  const m={id,hx:x,face,weapon:{key:wk.kind,len:wk.len},wk,swap:!!swap,prof:profile(wk),cine:true,
    stance:null,guard:{ffx:0,px:0},shield:!!(look&&look.shield),shieldKey:look&&look.shield?(look.shieldKey||'heater'):null,
    pair:pend,keys:[],base:x,lastP:null,down:false,over:false,hurt:false,chamber:null,ready:'guard'};
  if(m.shield)m.prof.two=0;                      // (a shield arm does not also hold the shaft)
  pend[id]=m;
  const P={...POSE.guard,ua:0,fa:0,oua:0,ofa:0};
  const a=armAngles(P.h,0),b=armAngles(P.o,0);P.ua=a.ua;P.fa=a.fa;P.oua=b.ua;P.ofa=b.fa;delete P.h;delete P.o;
  m.lastP={...P,hip:P.hip.slice(),ff:P.ff.slice(),bf:P.bf.slice()};
  m.keys.push({t:-1e9,v:toV(m,m.lastP,x,face),e:'lin',lift:{},arc:0,face,slide:false});
  return m;
}
function toV(m,Q,base,f){
  const v={px:base+f*Q.hip[0],py:Q.hip[1],ffx:base+f*Q.ff[0],ffy:Q.ff[1],bfx:base+f*Q.bf[0],bfy:Q.bf[1],turn:Q.turn||0,kd:Q.kd||0};
  for(const c of ANG)v[c]=Q[c];return v;
}
const other=m=>m.pair[m.id==='a'?'b':'a'];
// deterministic choices: the same bout replays the same way, and no two bouts are alike
// (tests only: every choice made with one fixed value, so a move can be found by name whatever the seed schedule)
let FIXED=null;
function rng(pair){if(FIXED!=null){pair.n++;const u=FIXED;return ()=>u;}let a=(pair.seed+pair.n*0x9E3779B1)|0;pair.n++;
  return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// The stream for one exchange (audit CA-09): keyed by the exchange (the stage gives the engine's log id), so the live
// blow and the replay draw the same choices however many other calls came before.
function rngKey(pair,key){
  if(FIXED!=null){const u=FIXED;return ()=>u;}
  let h=2166136261;for(const ch of String(key)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  let a=(pair.seed^h)|0;
  return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
}
const pick=(r,list)=>list[Math.min(list.length-1,Math.floor(r()*list.length))];

// how far apart the two stand for the engine's range
function gap(wa,wb,k){
  const long=Math.max(wa.len,wb.len),short=Math.min(wa.len,wb.len);
  const g=Math.round(150+.62*long);
  // (keep: the stage's long range when the Reach differs, the longer weapon's own range, the point hovering in front of the other's face and the shorter weapon well
  // short of the body, owner 2026-11-16)
  // (the longer weapon's drawn length out from its hips, then the other's face, then a hand's breadth of air)
  if(k==='keep')return Math.round(Math.max(extent(wa).to,extent(wb).to)+100);
  return k==='apart'?g+190:k==='short'?Math.round(112+.4*short):g;
}
const station=()=>0;
const fx=(m,o)=>{m.pair.fx.push(o);};
// the effects written since the last call (the stage plays them on its clock)
function takeFx(m){const p=m.pair,l=p.fx;p.fx=[];return l;}

// the ready stance a fighter comes back to: never twice the same in a row, lower and closed when hurt
function readyPose(m,r){
  if(m.down){if(m.down==='flat')return 'flat';
    m.gready=pick(r,GROUND_READY.filter(n=>n!==m.gready));return m.gready;}
  if(m.hurt)return 'hurt';
  const list=READY.filter(n=>n!==m.ready&&(m.prof.fam!=='thrust'||n!=='guardLow')&&!(m.prof.two&&n==='guardPoint'));
  m.ready=pick(r,list);return m.ready;
}
// Range stances (owner, 2026-11-16: "when a dagger is fighting a spear I want it to look like an impossible fight, but
// when you get in close it should feel like the dagger has the advantage"). Only when the weapons' Reach differs by
// enough for the engine's engagement rules (Core p.106); the stage says which (setRange). Every ready pose becomes
// the stance; the attacks and defences are unchanged.
//  keep:    the longer weapon at its own range: weight back, arms long, the point held level at the other's face.
//  kept:    the shorter weapon held off: a low wary crouch, the weapon back by the hip, the empty hand out at the point.
//  inside:  the shorter weapon inside: in close and leaning in, the weapon short and ready, the empty hand pressing.
//  cramped: the longer weapon with the other inside it: leaning away, hands pulled in, the point up and useless.
const STANCE={
  keep:   {hip:[-14,60],lean:8,bend:2,head:-6,ff:[46,0],bf:[-52,0],h:[40,-26],eb:0,w:14,o:[4,-30],turn:8},
  kept:   {hip:[-18,50],lean:12,bend:6,head:-6,ff:[34,0],bf:[-52,0],h:[8,-24],eb:0,w:34,o:[36,0],turn:-8},
  inside: {hip:[6,56],lean:28,bend:8,head:-16,ff:[42,0],bf:[-44,0],h:[30,-4],eb:0,w:4,o:[38,-12],turn:8},
  cramped:{hip:[-24,64],lean:-14,bend:-6,head:8,ff:[24,0],bf:[-52,0],h:[30,-36],eb:0,w:62,o:[2,-30],turn:-6}
};
// (small differences between the ready poses, so a stance still breathes: low, high, and a point held further out)
const STANCE_VAR={guard:{},guardLow:{hip:[0,-4],lean:4},guardHigh:{hip:[0,3],lean:-3},guardPoint:{h:[4,0]}};
function stancePose(m,name){
  const st=m.stance,P={...STANCE[st]},v=STANCE_VAR[name]||{};
  P.hip=[P.hip[0]+(v.hip?v.hip[0]:0),P.hip[1]+(v.hip?v.hip[1]:0)];P.lean+=v.lean||0;
  if(v.h)P.h=[P.h[0]+v.h[0],P.h[1]+v.h[1]];
  // a cut weapon kept long has its point at the face, a little higher; cramped, it is held upright by the body
  if(st==='keep'&&m.prof.fam!=='thrust')P.w=16;
  if(st==='cramped'&&m.prof.fam!=='thrust'){P.h=[34,-20];P.eb=0;P.w=68;}
  if(st==='kept'&&m.prof.two){P.h=[4,-28];P.w=60;}
  if(m.shield)P.o=st==='cramped'?[20,-10]:[34,-6];
  return P;
}
function setRange(M,key,longer){
  for(const id of ['a','b']){const m=M&&M[id];if(!m)continue;
    m.stance=!longer?null:key==='long'?(id===longer?'keep':'kept'):key==='short'?(id===longer?'cramped':'inside'):null;}
}
// a ready pose fitted to the weapon (long weapons are carried lower and further back; thrusters point at the face)
function fit(m,name){
  if(m.stance&&READY.includes(name)&&!m.down&&!m.hurt)return stancePose(m,name);
  const P={...POSE[name]};
  if(m.prof.fam==='thrust'&&(name==='guard'||name==='guardHigh')){P.h=name==='guard'?[30,-14]:[10,24];P.w=name==='guard'?14:-22;}
  if(m.prof.two&&name==='guard'){P.h=[14,-30];P.w=m.prof.fam==='thrust'?10:48;}
  if(m.prof.two&&name==='guardHigh'){P.h=[2,26];P.w=m.prof.fam==='thrust'?-14:112;}
  if(m.shield&&(name==='guard'||name==='guardPoint'||name==='hurt')){P.o=[34,-8];}
  return P;
}

// ----- placing (a new bout, or the picture snapped to the engine's state) -----
function place(m,t,g,state){
  const p=m.pair;p.gap=g;p.n=0;p.fx=[];
  const o=other(m);
  // around the middle of where the two are (the stage centre at the start)
  let mid=CENTRE;if(o&&o.keys.length>1&&m.keys.length>1)mid=(sample(m,t,true).px+sample(o,t,true).px)/2;
  let f=m.id==='a'?1:-1,x=mid-f*g/2;
  const ended=state==='lying'||state==='low'||state==='yield';
  if(ended&&m.keys.length>1){f=faceAt(m,t);x=(sample(m,t,true).ffx+sample(m,t,true).bfx)/2;}
  m.hurt=false;m.ready='guard';m.ward=null;
  m.down=state==='lying'?'flat':false;m.over=state==='lying'||state==='low'||state==='yield';m.chamber=null;m.face=f;
  const name=state==='lying'?'flat':state==='low'?'victory':state==='yield'?'yield':'guard';
  const last=m.keys[m.keys.length-1];
  m.keys=[{...last,t:-1e9,face:f}];m.base=x;
  key(m,t+1,fit(m,name),{at:x,e:'lin',face:f});
  m.keys.splice(0,1);m.keys[0].t=-1e9;
  return t+1;
}

// ----- small phrases -----
const KB=(lost)=>clamp(34+lost*13,40,190);
// where a body part is at t (world)
function partAt(m,t,loc){
  const j=joints(m,t),mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const wArm=m.swap?'larm':'rarm';
  if(loc==='head')return j.Hd;
  if(loc==='abdomen')return mid(j.M,j.P);
  if(loc==='rarm'||loc==='larm')return loc===wArm?j.E:j.oE;
  if(loc==='rleg')return j.K;if(loc==='lleg')return j.bK;
  return mid(j.S,j.M);
}
const heightOf=loc=>loc==='head'?'high':/leg/.test(loc||'')?'low':'mid';

// The attacker's pose with the weapon on a target: where the base has to be, and the arm that puts the blade there.
// B: the body (local pose, no arm). T: the target (world). w: the weapon's angle on arrival. q: the point of the
// weapon that arrives (a share of its length). ext: how long the arm is.
function aimed(m,B,T,w,q,ext){
  const P={...B,hip:B.hip.slice()},len=m.weapon.len;
  ext=ext||ARM*.93;
  let dy=0,S=null;
  for(let i=0;i<40;i++){
    S=torsoL(P).wS;dy=T[1]-Math.sin(rad(w))*q*len-S[1];
    if(Math.abs(dy)<=ext*.9)break;
    // out of the arm's reach up or down: the hips go there, then the blade tilts
    const need=dy-Math.sign(dy)*ext*.86,nh=clamp(P.hip[1]+need,26,m.down?GROUND_HIP:84);
    if(Math.abs(nh-P.hip[1])>1)P.hip[1]=nh;else w+=Math.sign(dy)*5;
  }
  // (still out of reach: the blow lands further along the drawn weapon, never past its end)
  const q0=q,reach=()=>{q=q0;dy=T[1]-Math.sin(rad(w))*q*len-S[1];const c=clamp(dy,-ext*.92,ext*.92),sw=Math.sin(rad(w));
    if(c!==dy&&Math.abs(sw)>.15&&m.prof.to){const q2=clamp(q+(dy-c)/(sw*len),q,(m.prof.to-2)/len);q=q2;dy=T[1]-Math.sin(rad(w))*q*len-S[1];dy=clamp(dy,-ext*.92,ext*.92);}
    else dy=c;};
  reach();
  // (the wrist, owner 2026-11-16: a blow asked to arrive with the weapon folded past the wrist arrives at the limit
  // instead, with the arm put where that weapon still lands on the target)
  for(let i=0;i<6;i++){
    const h=[Math.sqrt(Math.max(4,ext*ext-dy*dy)),dy];let fa=null,ov=Infinity;
    for(const e of [B.eb||0,1,-1,0]){const a=armAngles(h,e),x=wristOver(w,a.fa);if(x<ov){ov=x;fa=a.fa;}}
    if(ov<.5)break;
    const r=((w-fa+540)%360+360)%360-180;w=fa+(r>WRIST.hi&&r-WRIST.hi<=WRIST.lo+360-r?WRIST.hi:WRIST.lo);reach();
  }
  // the feet come in under raised hips (a leg is only so long), so the body really is where the arm was measured from
  for(const k of ['ff','bf']){
    const ft=(P[k]||[k==='ff'?40:-40,0]).slice(),h=P.hip[1]-ft[1],reach=Math.sqrt(Math.max(100,LEG*LEG*.94-h*h));
    ft[0]=clamp(ft[0],P.hip[0]-reach,P.hip[0]+reach);P[k]=ft;
  }
  const dx=Math.sqrt(Math.max(4,ext*ext-dy*dy));
  const f=faceOf(m),base=T[0]-f*(S[0]+dx+Math.cos(rad(w))*q*len);
  return {P:{...P,h:[dx,dy],w},at:base};
}
const faceOf=m=>m.keys[m.keys.length-1].face;
// stay as it is until t (so the next key is a quick change, not a drift over the whole wait)
const hold=(m,t)=>{if(m.keys[m.keys.length-1].t<t-1)key(m,t,{},{e:'lin',plant:'both'});};
const dustAt=(m,t,x,n,dir)=>fx(m,{t,kind:'dust',x,n:n||5,dir:dir||0});

// ----- declare: the start of an action, held while the dice roll and the other chooses -----
const CHAMBER={cut:['upHigh','upSide','upLow'],thrust:['upThrust','upThrust','upStab']};
function chamberFor(m,r,strike){
  if(strike==='shield')return 'upBash';
  if(m.down)return m.prof.fam==='thrust'?'gUpThrust':pick(r,['gUpRise','gUpRise','gUpThrust','gUpChop']);
  let list=CHAMBER[m.prof.fam];
  if(m.prof.fam==='thrust'&&(m.prof.two||m.weapon.len>80))list=['upThrust'];
  if(m.prof.two&&m.prof.fam==='cut')list=['upHigh','upLow','upSide'];
  return pick(r,list);
}
function windUp(m,name){
  const P={...POSE[name]};
  if(m.prof.two&&name==='upThrust'){P.h=[-30,-22];P.w=2;}
  if(m.prof.two&&name==='upHigh'){P.h=[-10,36];P.w=140;}
  if(m.down&&!name.startsWith('g')){P.hip=[-10,34];P.ff=[30,0];P.bf=[-30,0];P.lean=4;}
  return P;
}
function intent(m,t,kind,pk){
  const p=m.pair,o=other(m);if(!o||m.over)return t;
  const r=rng(p);
  cut(m,t);
  if(kind==='attack'||kind==='shield-strike'){
    const name=chamberFor(m,r,kind==='shield-strike'?'shield':null);m.chamber={name,t};
    key(m,t+90,{...windUp(m,name)},m.down?{e:'out',slide:true}:{e:'out',plant:'ff'});
    // a moving hold: it keeps sinking a little, so the pause is tense, not dead
    key(m,t+230,{hip:[m.lastP.hip[0]-4,m.lastP.hip[1]-3],lean:m.lastP.lean+2},{e:'out',plant:'both'});
    if(!m.down)dustAt(m,t+60,sample(m,t,true).bfx,3,-faceOf(m));
    return t+230;
  }
  if(m.down){
    if(kind==='evade')key(m,t+120,{h:[10,-20],w:40,head:-6},{e:'out',plant:'both'});
    else key(m,t+120,POSE.gWardMid,{e:'out',plant:'both'});
    return t+120;
  }
  if(kind==='evade'){
    key(m,t+110,POSE.coil,{e:'out',plant:'both'});
    key(m,t+220,{hip:[POSE.coil.hip[0]-3,POSE.coil.hip[1]-3]},{e:'out',plant:'both'});
    return t+220;
  }
  const name=kind==='shield'&&m.shield?'wardShield':pick(r,['wardMid','wardHigh','wardMid']);
  m.ward={name,t};
  key(m,t+100,wardPose(m,name),{e:'out',plant:'bf'});
  key(m,t+220,{hip:[m.lastP.hip[0]-2,m.lastP.hip[1]-2]},{e:'out',plant:'both'});
  return t+220;
}
function wardPose(m,name){
  const P={...POSE[name]};
  if(m.prof.two&&name==='wardHigh'){P.h=[20,34];P.w=174;}
  if(m.prof.two&&name==='wardMid'){P.h=[30,-20];P.w=84;}
  if(m.prof.two&&name==='wardLow'){P.h=[26,-30];P.w=-60;}
  if(m.prof.fam==='thrust'&&!m.prof.two&&name==='wardMid'){P.h=[40,-2];P.w=78;}
  return P;
}

// ----- the blow -----
// s: {outcome, loc, lost, shield (the defence is a shield's), strike ('shield'), fall (true | 'sit'), defeated,
// prone (an evade that ends on the ground), flow (the replay: no holds)}
function blow(M,aid,t,s){
  const A=M[aid],D=M[aid==='a'?'b':'a'];
  if(!A||!D)return {tc:t,contacts:[],end:t};
  const p=A.pair,r=s.key!=null?rngKey(p,s.key):rng(p),o=s.outcome||'miss',loc=s.loc||'chest',lost=s.lost||0;
  cut(A,t);cut(D,t);
  const hit=o==='wound'||o==='partial-parry'||o==='partial-ward';
  const stopped=o==='parried'||o==='full-parry'||o==='full-ward';
  const light=o==='armour'||o==='zero';
  const dodge=o==='evaded'||o==='miss'||o==='fumble';
  const f=faceOf(A),fd=faceOf(D);
  const chambered=!s.flow&&A.chamber&&t-A.chamber.t<60000?A.chamber.name:null;A.chamber=null;
  // (s.ward: the defence the defender declared live, given again by the replay so it repeats the live move, CA-09)
  const warded=s.ward||(!s.flow&&D.ward&&t-D.ward.t<60000?D.ward.name:null);D.ward=null;
  const H=heightOf(loc),P=A.prof,bash=s.strike==='shield'&&A.shield;
  // --- the attack: which swing ---
  // From the ground (batch (b)), up onto one knee: a rising cut, a hand on the floor and a drive behind the point, or
  // a chop over the top at a leg. gm is that move; `move` is the standing swing it swings like.
  let move,gm=null;
  if(bash)move='bash';
  else if(A.down){
    gm=s.move&&GROUND[s.move]?s.move:chambered==='gUpThrust'?'gThrust':chambered==='gUpRise'?'gRise':chambered==='gUpChop'?'gChop':
      P.fam==='thrust'?'gThrust':H==='low'?pick(r,['gChop','gChop','gRise']):pick(r,['gRise','gRise','gThrust']);
    move=GROUND[gm].like;
  }
  // (s.move: the move the live blow chose, given again by the replay: CA-09)
  else if(s.move&&s.move!=='bash'&&!GROUND[s.move])move=s.move;
  else if(P.fam==='thrust')move=chambered==='upStab'?'stab':chambered?'lunge':(!P.two&&A.weapon.len<=80&&H!=='low'&&r()<.4?'stab':'lunge');
  else move=chambered==='upHigh'?'over':chambered==='upLow'?'rise':chambered==='upSide'?'spin':
    H==='low'?pick(r,['over','rise','rise','spin']):H==='high'?pick(r,['over','over','over','spin','rise']):pick(r,['over','rise','over','rise','spin']);
  const big=!!s.defeated||lost>=7;
  // Circumvent Parry on the finishing blow (owner, 2026-11-16): a feint draws the guard to the other line and the blade
  // comes in round it; the guard is still up as the fighter falls (FX_FINISH.slipped)
  const slip=!!s.defeated&&(s.fx||[]).includes('circumvent')&&o==='wound'&&!A.down&&!D.down&&!bash;
  const leap=!slip&&!A.down&&!bash&&move==='over'&&H!=='low'&&(big||r()<.22);
  // --- timing (stage clock, ms) ---
  const heavy=P.heavy?1.25:1;
  let t0=t;
  const Ta=chambered?40:Math.round((P.fam==='thrust'?140:180)*heavy);       // wind-up
  let Ts=Math.round((P.fam==='thrust'?85:105)*heavy);                       // strike
  if(move==='spin')Ts+=60;if(leap)Ts+=110;
  const feint=slip?170:0;
  const tw=t0+Ta+feint,tc=tw+Ts;
  const contacts=[],chosen={};
  // --- the defender up to the contact, so the blow can be aimed at where the target will be ---
  const xd0=sample(D,t,true).px,away=-fd;                 // world direction the defender is driven
  let T,clashAt=null,kind='hit',groundShield=false;
  const dStart=sample(D,t,true);
  if(stopped||o==='partial-parry'||o==='partial-ward'){
    const useShield=(s.shield||o.endsWith('ward'))&&D.shield;groundShield=useShield&&!!D.down;
    const wname=D.down?null:useShield?'wardShield':H==='high'?'wardHigh':H==='low'?'wardLow':(warded&&warded!=='wardShield'?warded:'wardMid');
    hold(D,tc-150);
    // (on the ground with a shield: the shield arm comes up into the blow, audit CA-04)
    if(D.down&&useShield)key(D,tc-30,{o:[34,H==='low'?-10:16],oeb:1,head:-8},{e:'out',plant:'both'});
    // (on the ground: the body comes up into the parry too, by where the blow comes; batch (b))
    else if(D.down)key(D,tc-30,POSE[H==='high'?'gWardHigh':H==='low'?'gWardLow':'gWardMid'],{e:'out',plant:'both'});
    else key(D,tc-30,wardPose(D,wname),{e:'out5',plant:'bf'});
    const jd=joints(D,tc+60);
    // where the steel meets: the middle of a blade held across, nearer the hand when it is laid back over the head,
    // between the hands on a long shaft; the face of a shield
    const cq=D.prof.two?Math.min(.5,D.prof.two*.55/D.weapon.len):wname==='wardHigh'?.34:.55;
    clashAt=useShield?[jd.oHn[0]+fd*6,jd.oHn[1]]:[jd.Hn[0]+(jd.tip[0]-jd.Hn[0])*cq,jd.Hn[1]+(jd.tip[1]-jd.Hn[1])*cq];
    T=clashAt;kind='clash';
  }else if(dodge){
    // the blow goes where the target was
    T=partAt(D,t,loc);kind='miss';
    if(o==='miss'||o==='fumble')T=[T[0]-f*26,T[1]];
  }else if(slip){
    // the feint (below) draws the guard to the other line; it is held there as the real blow comes in
    hold(D,t0+90);
    key(D,t0+200,{...wardPose(D,H==='high'?'wardLow':'wardHigh'),hip:[D.lastP.hip[0]-4,D.lastP.hip[1]]},{e:'out5',plant:'bf'});
    hold(D,tc);
    T=partAt(D,tc,loc);
  }else if(s.tried&&!dodge&&!stopped){
    // a parry that failed (batch (c), owner 2026-11-16): it is seen tried, late or on the wrong line, and the blow
    // gets there first; no steel meets
    const tr=parryTried(D,r,t,tc,{H,loc,move,shield:s.tried==='shield'&&!!D.shield,warded:s.ward||warded});chosen.tried=tr;
    T=partAt(D,tc,loc);
  }else{
    // (the replay: a parry that was declared and failed is still seen tried, as it was live: CL-02)
    if(s.flow&&s.ward&&!D.down)key(D,t+100,wardPose(D,s.ward),{e:'out',plant:'bf'});
    // caught: a flinch as it arrives, no more
    hold(D,tc-90);
    if(!D.down)key(D,tc,{hip:[D.lastP.hip[0]-5,D.lastP.hip[1]+2],lean:D.lastP.lean-7,head:D.lastP.head+6},{e:'in',plant:'both'});
    else hold(D,tc);
    T=partAt(D,tc,loc);
  }
  // --- the attacker ---
  const q=bash?0:P.reachAt,down=!!A.down;
  // (the furthest point that can land is on the drawn weapon: CA-07)
  const qMax=Math.min(.98,P.to?(P.to-2)/A.weapon.len:.98);
  const wHit=move==='over'||move==='spin'?(H==='high'?-22:H==='mid'?-38:-58):move==='rise'?(H==='high'?38:H==='mid'?8:-30):
    move==='stab'?(H==='high'?-34:-48):(H==='high'?12:H==='mid'?-4:-30);
  let body;
  if(gm)body={...GROUND[gm].body};
  else if(down)body={hip:[6,36],lean:30,bend:8,head:-14,ff:[40,0],bf:[-36,0],turn:10,o:[-30,-30]};
  else if(bash)body={hip:[16,56],lean:26,bend:8,head:-12,ff:[52,0],bf:[-46,0],turn:-12,w:150,h:[-24,-26]};
  else if(move==='lunge')body={hip:[22,H==='low'?44:52],lean:H==='low'?40:30,bend:6,head:-22,ff:[70,0],bf:[-58,0],turn:14,o:[-44,-12]};
  else if(move==='stab')body={hip:[16,56],lean:34,bend:10,head:-20,ff:[58,0],bf:[-50,0],turn:12,o:[-36,-20]};
  else if(move==='rise')body={hip:[14,H==='high'?66:54],lean:H==='high'?6:22,bend:-4,head:-8,ff:[56,0],bf:[-50,0],turn:12,o:[-40,-30]};
  else body={hip:[18,H==='low'?40:52],lean:H==='low'?48:36,bend:10,head:-24,ff:[62,0],bf:[-54,0],turn:14,o:[-42,-22]};
  let aim;
  // the shield's face on the target: the empty arm drives it
  const bashAim=(B0,TT)=>{
    // (out of the arm's reach up or down: the hips go there first, as for a swing)
    const B={...B0,hip:B0.hip.slice()};let S=torsoL(B).oS,need=TT[1]-S[1];
    if(Math.abs(need)>ARM*.8){B.hip[1]=clamp(B.hip[1]+need-Math.sign(need)*ARM*.7,26,A.down?GROUND_HIP:84);S=torsoL(B).oS;}
    const dy=clamp(TT[1]-S[1],-ARM*.8,ARM*.8),dx=Math.sqrt(Math.max(9,(ARM*.9)**2-dy*dy));
    return {P:{...B,o:[dx,dy]},at:TT[0]-f*(S[0]+dx+10)};};
  if(bash){
    aim=bashAim({...body},T);
  }else{
    aim=aimed(A,body,T,wHit,q,down?ARM*.9:undefined);
    // not on top of the other: if the body would end too close, the arm is bent and the blow comes from further out
    const near_=x=>f*(xd0-(x.at+f*x.P.hip[0]));
    const need=D.down?128:118;
    if(near_(aim)<need){const a2=aimed(A,body,T,wHit,Math.min(qMax,q+.12),ARM*.7);if(near_(a2)>near_(aim))aim=a2;}
    if(D.down&&near_(aim)<need-10){const a3=aimed(A,body,T,wHit,qMax,ARM*.55);if(near_(a3)>near_(aim))aim=a3;}
  }
  // a miss falls short or goes past: the blade is not stopped by anything
  const xa0=sample(A,t,true).px,travel=f*(aim.at-A.base);
  // a feint at the other line (Circumvent Parry): the guard goes to meet it
  if(slip){
    const lowF=H==='high';
    keyA(A,t0+120,{hip:[-2,lowF?58:64],lean:lowF?24:14,bend:4,head:lowF?-14:-8,ff:[40,0],bf:[-46,0],h:lowF?[34,-30]:[30,24],eb:lowF?0:1,
      w:lowF?-30:40,o:[20,-20],turn:4},{at:A.base+f*10,e:'out'});
  }
  // wind-up
  if(!chambered){
    const name=gm?GROUND[gm].up:down?'kneel':bash?'upBash':move==='lunge'?'upThrust':move==='stab'?'upStab':move==='rise'?'upLow':move==='spin'?'upSide':'upHigh';
    keyA(A,tw,windUp(A,name),down?{e:'out',slide:true}:{e:'out',plant:'ff'});
    if(!down)dustAt(A,t0+40,sample(A,t,true).bfx,3,-f);
  }else keyA(A,tw,{hip:[A.lastP.hip[0]-3,A.lastP.hip[1]-2]},{e:'out',plant:'both'});
  // the strike: the body is thrown in first, the weapon whips in last
  const spin=move==='rise'?{w:1}:move==='lunge'||bash?null:{w:-1};
  const ec={px:'out',py:'out',ffx:'out',bfx:'out',lean:'out',w:move==='lunge'?'in':'in3',ua:'in',fa:'in',turn:'out'};
  // (a shield strike: the shield arrives with the body, not after it, so it is where the blow lands; audit CA-03)
  const kopt={at:aim.at,e:'in',ec,spin,tag:'strike',fe:'out',lead:bash};
  // (from the ground the body is dragged over the floor on the knee or the backside, never stepped)
  if(down){kopt.slide=true;if(Math.abs(travel)>24){fx(A,{t:tw,kind:'skid',id:A.id,t1:tc});dustAt(A,tw+20,xa0-f*20,4,-f);}}
  if(move==='spin')kopt.turns={w:-1,oua:-1,ofa:-1};
  if(leap){
    // up and over: the blade comes down with the whole body behind it
    const tm=tw+Math.round(Ts*.55),midAt=A.base+f*travel*.6;
    keyA(A,tm,{hip:[0,96],lean:-14,bend:-12,head:6,ff:[18,62],bf:[-30,70],h:[-12,40],eb:1,w:150,o:[30,20],turn:-10},{at:midAt,e:'out',fe:'out'});
    fx(A,{t:tw,kind:'jump',id:A.id,x:xa0});
    keyA(A,tc,aim.P,{...kopt,e:'in',ec:{...ec,px:'lin',py:'in',ffy:'in',bfy:'in'}});
    fx(A,{t:tc,kind:'land',x:aim.at+f*30,power:1});
  }else{
    keyA(A,tc,aim.P,kopt);
    if(travel>50&&!down){fx(A,{t:tw,kind:'dash',id:A.id,t1:tc,x0:xa0,x1:aim.at,face:f});dustAt(A,tw+10,xa0-f*30,6,-f);}
  }
  fx(A,{t:tw+Math.round(Ts*.3),kind:'swing',id:A.id,t1:tc+110,heavy:P.heavy});
  const Tc=T.slice();
  // --- what the blow meets ---
  let end=tc+500,tHit=tc;
  const ready=(m,tt,opt)=>{const n=readyPose(m,r);return key(m,tt,fit(m,n),{e:'io',...(opt||{})});};
  // the weapon jars off armour: thrown back a little (from the ground, onto the off hand)
  const jar=th=>A.down?key(A,th+90,gAfter(A,gm,'jar',move,wHit),{at:A.base-f*18,e:'out5',slide:true,spin:{w:move==='rise'?-1:1}}):
    keyA(A,th+90,{hip:[-8,60],lean:4,h:[10,30],eb:1,w:move==='rise'?-50:104,o:[-30,-10]},{at:A.base-f*26,e:'out5',slide:true,spin:{w:move==='rise'?-1:1}});
  if(stopped){
    contacts.push({t:tc,at:Tc,kind:'clash'});
    if(groundShield)hold(D,tc);       // (the shield stays on the blow until it lands)
    const style=D.down||A.down?'bounce':pick(r,['bounce','shove','bounce','slide']);chosen.style=style;
    const push=P.heavy?54:36;
    if(style==='shove'){
      // locked: the two lean into it, then the defender throws the attacker off
      keyA(A,tc+150,{hip:[aim.P.hip[0]+6,aim.P.hip[1]-4],lean:(aim.P.lean||30)+6},{e:'out',plant:'both'});
      key(D,tc+150,{hip:[D.lastP.hip[0]+8,D.lastP.hip[1]-6],lean:D.lastP.lean+10},{e:'out',plant:'both'});
      fx(A,{t:tc+20,kind:'grind',t1:tc+150,at:Tc});
      const tb=tc+150;
      key(D,tb+80,{hip:[14,60],lean:26,h:[44,6],w:64,o:[-30,-30],turn:10},{e:'out5',plant:'bf'});
      keyA(A,tb+110,{hip:[-30,64],lean:-22,bend:-10,head:14,h:[-10,30],eb:1,w:120,o:[-30,10],ff:[20,0],bf:[-50,0]},{at:A.base-f*70,e:'out5',slide:true});
      fx(A,{t:tb+10,kind:'skid',id:A.id,t1:tb+260});fx(A,{t:tb,kind:'thump',at:Tc,power:.6});
      keyA(A,tb+330,{hip:[-12,54],lean:14,h:[20,-30],w:20,ff:[34,0],bf:[-44,0]},{at:A.base-f*26,e:'out',slide:true});
      ready(A,tb+560);ready(D,tb+420,{plant:'bf'});end=tb+560;
    }else if(style==='slide'){
      // turned aside: the blade runs off down the guard and the attacker is carried past its balance
      keyA(A,tc+120,{hip:[aim.P.hip[0]+18,aim.P.hip[1]-10],lean:54,bend:10,head:-30,h:[40,-40],w:-78,o:[-40,10]},{e:'out',plant:'ff',spin:{w:-1}});
      key(D,tc+110,{hip:[D.lastP.hip[0]-16,D.lastP.hip[1]+6],lean:-4,h:[30,-20],w:-30,turn:-8},{at:D.base+away*30,e:'out',slide:true});
      fx(A,{t:tc+10,kind:'grind',t1:tc+110,at:Tc});fx(D,{t:tc+20,kind:'skid',id:D.id,t1:tc+200});
      keyA(A,tc+330,{hip:[-6,58],lean:20,h:[24,-34],w:-40,ff:[36,0],bf:[-40,0]},{at:A.base-f*20,e:'io'});
      ready(A,tc+560);ready(D,tc+440);end=tc+560;
    }else{
      // thrown back off each other: both skid
      if(A.down){
        // from the ground: knocked back onto the off hand, then down into a ground guard
        key(A,tc+90,gAfter(A,gm,'jar',move,wHit),{at:A.base-f*push*.6,e:'out5',slide:true,spin:{w:move==='rise'?-1:1}});
        fx(A,{t:tc+5,kind:'skid',id:A.id,t1:tc+200});
      }else{
      keyA(A,tc+90,{hip:[-16,60],lean:-10,bend:-8,head:10,h:[4,36],eb:1,w:move==='rise'?-60:112,o:[-34,-6],ff:[26,0],bf:[-48,0]},
        {at:A.base-f*push,e:'out5',slide:true,spin:{w:move==='rise'?-1:1}});
      key(D,tc+100,{hip:[D.lastP.hip[0]-14,Math.max(30,D.lastP.hip[1]-8)],lean:D.lastP.lean-12,head:8},{at:D.base+away*(push*.8),e:'out5',slide:true});
      fx(A,{t:tc+5,kind:'skid',id:A.id,t1:tc+240});fx(D,{t:tc+5,kind:'skid',id:D.id,t1:tc+240});
      keyA(A,tc+300,{hip:[-10,56],lean:16,h:[22,-26],w:30},{at:A.base-f*14,e:'out',slide:true});
      }
      ready(A,tc+540);ready(D,tc+460,{plant:'bf'});end=tc+540;
    }
  }else if(dodge){
    contacts.push({t:tc,at:Tc,kind:'miss'});
    // the swing carries on through the empty air
    const wEnd=move==='rise'?wHit+110:move==='lunge'?wHit-6:wHit-95;
    if(o==='fumble'&&A.down){
      // from the ground: overreached, the weapon hand and the face nearly on the floor, the off hand catching it
      key(A,tc+130,{hip:[20,30],lean:62,bend:14,head:-30,h:[40,-36],w:wEnd,o:[30,-56]},{at:A.base+f*20,e:'out',spin,slide:true});
      key(A,tc+420,{hip:[14,28],lean:56,head:-18},{e:'io',plant:'both'});
      fx(A,{t:tc+60,kind:'skid',id:A.id,t1:tc+220});
      ready(A,tc+760);end=tc+760;
    }else if(o==='fumble'){
      keyA(A,tc+130,{hip:[40,34],lean:66,bend:14,head:-34,ff:[78,0],bf:[-30,0],h:[40,-36],w:wEnd,o:[44,-40]},{at:A.base+f*30,e:'out',spin,slide:true});
      keyA(A,tc+420,{hip:[30,30],lean:60,head:-20,o:[40,-52]},{e:'io',plant:'both'});
      fx(A,{t:tc+60,kind:'skid',id:A.id,t1:tc+220});
      ready(A,tc+760);end=tc+760;
    }else if(A.down){
      // from the ground: carried on past, then back down into a ground guard
      key(A,tc+110,gAfter(A,gm,'through',move,wHit),{at:A.base+f*4,e:'out',spin,slide:true});
      ready(A,tc+460);end=tc+460;
    }else{
      keyA(A,tc+110,{hip:[10,aim.P.hip[1]-4],ff:[52,0],bf:[-46,0],lean:(aim.P.lean||30)+14,head:-28,h:move==='lunge'?aim.P.h:[36,-38],w:wEnd,o:[-46,6]},
        {at:A.base+f*(D.down?0:22),e:'out',spin,slide:true});
      keyA(A,tc+330,{hip:[-4,56],lean:20,h:[26,-34],w:move==='rise'?80:-44,ff:[38,0],bf:[-44,0]},{at:A.base-f*10,e:'io'});
      ready(A,tc+560);end=tc+560;
    }
    if(o==='evaded'||s.prone)evade(D,r,tc,{H,away,prone:!!s.prone,move,f});
    else if(!D.down&&r()<.5)evade(D,r,tc,{H,away,prone:false,move,f,small:true});
    else sway(D,r,tc,away);
    end=Math.max(end,D.keys[D.keys.length-1].t);
  }else{
    // a parry that only takes some of it: steel first, then the body
    if(o==='partial-parry'||o==='partial-ward'){
      contacts.push({t:tc,at:Tc,kind:'clash'});tHit=tc+95;
      if(groundShield)hold(D,tc);
      // the guard is beaten down and the blow goes on into the body
      key(D,tHit-20,{hip:[D.lastP.hip[0]-8,D.lastP.hip[1]-6],h:[14,-20],w:D.lastP.w-50},{e:'out',plant:'both'});
      hold(D,tHit);
      const T2=partAt(D,tHit,loc),a2=bash?bashAim({...body},T2):aimed(A,{...body,hip:[body.hip[0]+8,body.hip[1]-4]},T2,wHit-12,q);
      keyA(A,tHit,a2.P,{at:a2.at,e:'in',spin:spin,slide:true,lead:bash});
      contacts.push({t:tHit,at:T2,kind:'hit'});
    }else contacts.push({t:tc,at:Tc,kind:light?'hit':'hit'});
    const th=tHit;
    if(light&&(s.fall||s.prone)&&!D.down){
      // nothing got through, but the engine has the fighter on the ground (a Trip, a failed evade): the weapon jars off
      // as below and the fighter goes down as from a blow to the legs (audit CA-01)
      jar(th);
      goDown(D,th,recoil(loc),KB(0),D.base,away,s.fall==='sit'||/leg/.test(loc));
      ready(A,th+420);end=th+640;
    }else if(light){
      // armour, or nothing got through: the weapon jars off and the struck fighter barely gives
      jar(th);
      key(D,th+90,{hip:[D.lastP.hip[0]-10,D.lastP.hip[1]-4],lean:D.lastP.lean-10,head:10},{at:D.base+away*16,e:'out5',slide:true});
      ready(A,th+420);ready(D,th+380);end=th+420;
    }else{
      end=struck(A,D,r,th,{loc,lost,H,move,f,away,wHit,aim,defeated:!!s.defeated,fall:s.fall,prone:!!s.prone,bash,big,leap,impale:!!s.impale&&!bash,held:!!s.held,fx:s.fx||[],slip,gm});
    }
  }
  // the two never end an exchange standing in each other: the attacker gives ground
  if(!A.over&&!D.over){
    const la=A.keys[A.keys.length-1],ld=D.keys[D.keys.length-1],sep=f*(ld.v.px-la.v.px),want=D.down||A.down?120:104;
    if(sep<want){const d=f*(want-sep);la.v.px-=d;la.v.ffx-=d;la.v.bfx-=d;A.base-=d;}
  }
  // the replay runs straight on: the next exchange is written into this one's recovery
  const out={tc:contacts.length?contacts[0].t:tc,contacts,end:s.flow&&!s.defeated?Math.min(end,tHit+(dodge?250:290)):end,move:gm||move,
    ward:warded,leap,...chosen,finish:A.finished||null,release:A.release||null,drop:A.dropAt||null};A.finished=null;A.release=null;A.dropAt=null;
  return out;
}

// A failed parry (batch (c), owner 2026-11-16: "a visible failed parry"). The defender goes for the blow, but the
// blow gets there first and no steel meets. Seen from the side, a guard set straight in front of the body would
// cross any blow to the body (and read as a parry), so the attempt is made from the line the blow is not on: above
// a blow that comes up or along to the legs, below one that comes down. Three ways, chosen per blow (the replay
// repeats them):
//  late:  a sweep from the far line toward the blow, still travelling, fast, at the contact.
//  wrong: the guard has gone to the other line and is set there; it only starts back as the blow lands.
//  short: the shield is thrust out on the other line and the blow comes in round its rim.
// On the ground the arm (or the shield) comes up late. Returns the way chosen.
function parryTried(D,r,t,tc,o){
  const {H,shield,move}=o;
  // part of the way from one pose to another; the arms as angles (the poses written so far keep angles, not hands)
  const angles=P=>{const Q={...P};if(P.h){const a=armAngles(P.h,P.eb||0);Q.ua=a.ua;Q.fa=a.fa;}
    if(P.o){const a=armAngles(P.o,P.oeb||0);Q.oua=a.ua;Q.ofa=a.fa;}delete Q.h;delete Q.o;delete Q.eb;delete Q.oeb;return Q;};
  const lerpP=(A0,B0,u)=>{const A=angles(A0),B=angles(B0),out={};for(const k of Object.keys(B)){const a=A[k],b=B[k];
    out[k]=Array.isArray(b)?b.map((v,i)=>lerp(Array.isArray(a)?a[i]:v,v,u)):typeof b==='number'&&typeof a==='number'?
      (ANG.includes(k)?lerp(a,near(b,a),u):lerp(a,b,u)):b;}return out;};
  if(D.down){
    hold(D,tc-130);
    // (the arm propping the body comes off the floor and forward, low: the blow lands above it as it arrives)
    const up=shield?{o:[28,2],head:-8}:{h:[30,H==='low'?-8:4],eb:1,w:H==='low'?-30:70,head:-8};
    key(D,tc,up,{e:'in',plant:'both'});
    return 'late';
  }
  // the far line: high over a blow to the legs or one that rises; low under a blow that comes down to the head or body
  // (a lunge comes along the line, so the guard goes over it, except at the head; an overhand stab comes down)
  const high=H==='low'||(H!=='high'&&(move==='rise'||move==='lunge'));
  const right=shield?'wardShield':H==='high'?'wardHigh':H==='low'?'wardLow':'wardMid';
  // (further off the line than a ward: the hand up by the head and the blade back over it, or dropped by the hip
  // and pointed at the floor)
  let far=high?{...wardPose(D,'wardHigh'),h:[22,40],eb:1,w:D.prof.two?160:150}:{...wardPose(D,'wardLow'),h:[18,-38],w:-100,lean:16};
  if(shield)far={...wardPose(D,'wardShield'),o:high?[24,30]:[30,-40],head:high?-14:-2};
  // a declared guard already on the far line stays there
  const set=o.warded&&o.warded===(high?'wardHigh':'wardLow');
  const way=shield?'short':set||r()<.34?'wrong':'late';
  if(way==='wrong'){
    hold(D,tc-240);
    key(D,tc-60,{...far,hip:[D.lastP.hip[0]-4,D.lastP.hip[1]-2]},{e:'out5',plant:'bf'});
    // the eyes see it too late: the guard starts back to the open line as the blow lands
    key(D,tc,lerpP(D.lastP,wardPose(D,right),.12),{e:'in',plant:'both'});
    return 'wrong';
  }
  // late (or a shield thrust out short): a sweep through the far line toward the blow, still on its way at the contact
  hold(D,tc-170);
  key(D,tc-80,far,{e:'io',plant:'bf'});
  key(D,tc,lerpP(D.lastP,wardPose(D,right),.2),{e:'in',plant:'bf'});
  return way;
}

// After an attack from the ground (batch (b)): 'through', the swing carried on past the target; 'jar', thrown back
// off a parry or armour onto the off hand. Still on the knee (if it was) or seated; the hips no higher than the knee.
function gAfter(A,gm,how,move,wHit){
  if(how==='jar')return {hip:[-20,24],lean:-22,bend:10,head:12,h:[4,30],eb:1,w:move==='rise'?-60:112,o:[-30,-50]};
  if(gm==='gThrust')return {hip:[-4,30],lean:16,bend:6,head:-10,h:[-10,-16],eb:-1,w:wHit+6,o:[2,-58]};
  if(gm==='gChop')return {hip:[8,32],lean:38,bend:12,head:-20,h:[30,-40],w:wHit-70,o:[-30,-46]};
  return {hip:[10,36],lean:14,bend:-4,head:-8,h:[30,36],eb:1,w:wHit+100,o:[-40,-30]};
}
// the defender gets out of the way
function evade(D,r,tc,o){
  const away=o.away,x=D.base;
  hold(D,tc-(D.down?130:230));
  if(D.down){
    // already on the ground: a roll away from the blade
    key(D,tc-40,{hip:[-30,16],lean:-60,bend:30,head:30,ff:[10,14],bf:[-4,10],h:[10,-10],o:[-10,-30]},{e:'out'});
    key(D,tc+160,POSE.prop,{at:x+away*70,e:'out',slide:true});
    fx(D,{t:tc-20,kind:'skid',id:D.id,t1:tc+160});return;
  }
  if(o.prone){
    // a dive out of the line that ends on the ground (the rules leave an evader prone)
    key(D,tc-120,POSE.coil,{e:'out',plant:'both'});
    key(D,tc-10,{hip:[-30,56],lean:-50,bend:20,head:26,ff:[10,40],bf:[-20,48],h:[-20,20],w:100,o:[-30,10]},{at:x+away*60,e:'out',arc:20});
    key(D,tc+130,{hip:[-30,20],lean:-120,bend:40,head:30,ff:[20,22],bf:[0,30],h:[-10,-20],w:160,o:[-20,-20]},{at:x+away*120,e:'lin',spin:{lean:-1}});
    key(D,tc+300,{...POSE.prop,lean:-38-360},{at:x+away*170,e:'out',slide:true});
    D.keys[D.keys.length-1].v.lean=near(-38,D.keys[D.keys.length-2].v.lean);
    fx(D,{t:tc+120,kind:'land',x:x+away*120,power:.6});fx(D,{t:tc+130,kind:'skid',id:D.id,t1:tc+300});
    fx(D,{t:tc-110,kind:'ghost',id:D.id,t1:tc+140});
    D.down='prop';return;
  }
  const kinds=o.small?(o.H==='high'?['duck','back']:o.H==='low'?['hop','back']:['back']):
    o.H==='low'?['hop','flip','hop']:o.H==='high'?['duck','flip','back','duck']:['back','flip','back'];
  const k=pick(r,kinds);
  if(k==='duck'){
    key(D,tc-110,{hip:[-10,54],lean:20},{e:'out',plant:'both'});
    key(D,tc-25,{hip:[-18,26],lean:44,bend:26,head:-10,h:[20,-10],w:150,o:[20,-30],ff:[36,0],bf:[-46,0]},{e:'out5',plant:'both'});
    key(D,tc+170,{hip:[-18,24],lean:46},{e:'lin',plant:'both'});
    key(D,tc+330,fit(D,readyPose(D,r)),{e:'back'});
  }else if(k==='hop'){
    // straight up over a low blow, knees to the chest
    key(D,tc-120,{hip:[-6,46],lean:16},{e:'out',plant:'both'});
    key(D,tc,{hip:[-8,116],lean:10,bend:20,head:-10,ff:[14,84],bf:[-16,90],h:[20,10],w:80,o:[10,10]},{e:'out'});
    fx(D,{t:tc-110,kind:'jump',id:D.id,x});
    key(D,tc+210,{hip:[-8,48],lean:22,ff:[30,0],bf:[-38,0],h:[26,-20],w:40,o:[20,-30]},{e:'in',fe:'in'});
    fx(D,{t:tc+210,kind:'land',x,power:.5});
    key(D,tc+420,fit(D,readyPose(D,r)),{e:'io'});
  }else if(k==='flip'){
    // a back handspring out of reach
    const d=130;
    key(D,tc-130,POSE.coil,{e:'out',plant:'both'});
    key(D,tc-30,{hip:[-20,84],lean:-70,bend:-20,head:-20,ff:[26,50],bf:[6,30],h:[-30,30],eb:1,w:150,o:[-30,26],oeb:1},{at:x+away*40,e:'out',spin:{lean:-1}});
    key(D,tc+70,{hip:[0,104],lean:-190,bend:-10,head:-10,ff:[20,96],bf:[-16,104],h:[-20,-30],w:200,o:[-20,-36]},{at:x+away*80,e:'lin',spin:{lean:-1}});
    key(D,tc+170,{hip:[10,84],lean:-300,bend:20,head:10,ff:[-20,40],bf:[-40,20],h:[10,-20],w:300,o:[14,-30]},{at:x+away*110,e:'lin',spin:{lean:-1}});
    key(D,tc+260,{hip:[-8,44],lean:-336,bend:8,head:-12,ff:[34,0],bf:[-42,0],h:[26,-22],w:402,o:[22,-30]},{at:x+away*d,e:'out',spin:{lean:-1}});
    // (the same pose with the turn counted out, so nothing unwinds afterwards)
    const L=D.keys[D.keys.length-1];L.v.lean+=360;L.v.w-=360;const b=D.keys[D.keys.length-2];b.v.lean+=360;b.v.w-=360;
    const c=D.keys[D.keys.length-3];c.v.lean+=360;c.v.w-=360;const e=D.keys[D.keys.length-4];e.v.lean+=360;e.v.w-=360;
    fx(D,{t:tc-120,kind:'jump',id:D.id,x});fx(D,{t:tc-100,kind:'ghost',id:D.id,t1:tc+240});
    fx(D,{t:tc+260,kind:'land',x:x+away*d,power:.7});fx(D,{t:tc+260,kind:'skid',id:D.id,t1:tc+380});
    key(D,tc+500,fit(D,readyPose(D,r)),{e:'io'});
  }else{
    // a long slide back out of measure
    const d=100;
    key(D,tc-110,POSE.coil,{e:'out',plant:'both'});
    key(D,tc+40,{hip:[-26,50],lean:-16,bend:-8,head:12,ff:[40,0],bf:[-50,0],h:[30,10],w:70,o:[-20,-20]},{at:x+away*d,e:'out5',slide:true,arc:10});
    fx(D,{t:tc-90,kind:'dash',id:D.id,t1:tc+40,x0:x,x1:x+away*d,face:away});fx(D,{t:tc-20,kind:'skid',id:D.id,t1:tc+200});
    key(D,tc+220,{hip:[-14,52],lean:12},{e:'out',plant:'both'});
    key(D,tc+420,fit(D,readyPose(D,r)),{e:'io'});
  }
}
// a blow that was never going to land: the target only leans out of its way
function sway(D,r,tc,away){
  hold(D,tc-110);
  if(D.down){key(D,tc,{lean:D.lastP.lean-10,head:10},{e:'out',plant:'both'});key(D,tc+260,{lean:D.lastP.lean+10,head:0},{e:'io',plant:'both'});return;}
  key(D,tc-10,{hip:[D.lastP.hip[0]-16,D.lastP.hip[1]+4],lean:-18,bend:-10,head:10},{e:'out',plant:'both'});
  key(D,tc+260,fit(D,readyPose(D,r)),{e:'io',plant:'bf'});
}

// the first frame after the hit: the struck part is driven away, the rest has not caught up
function recoil(loc){
  let rec;
  if(loc==='head')rec={hip:[-10,66],lean:-30,bend:-18,head:-44,h:[-20,20],eb:1,w:130,o:[-30,24],oeb:1,ff:[30,8],bf:[-40,0]};
  else if(loc==='abdomen')rec={hip:[-30,56],lean:44,bend:34,head:24,h:[30,-30],w:-30,o:[26,-38],ff:[26,0],bf:[-30,0]};
  else if(/arm/.test(loc))rec={hip:[-12,62],lean:-16,bend:-8,head:-16,h:[-44,-10],eb:-1,w:200,o:[-20,-30],ff:[28,0],bf:[-44,0],turn:-12};
  else if(/leg/.test(loc))rec={hip:[-16,40],lean:34,bend:14,head:-6,h:[30,-36],w:-40,o:[30,-44],ff:[-10,16],bf:[-40,0]};
  else rec={hip:[-22,62],lean:-28,bend:-22,head:20,h:[-10,10],w:130,o:[-40,6],ff:[32,6],bf:[-42,0]};
  return rec;
}
// The blow lands. Returns when the movement ends.
function struck(A,D,r,th,o){
  const {loc,lost,H,move,f,away,wHit,aim,bash}=o,pw=clamp(lost/8,.3,1.6),kb=KB(lost),x=D.base;
  const spinA=move==='rise'?{w:1}:move==='lunge'||bash?null:{w:-1};
  const thrust=move==='lunge'||move==='stab';
  D.hurt=true;
  // --- the attacker's follow-through ---
  // (Impale: the blade stays in the wound from the contact on; it is not drawn through and then put there, owner 2026-11-16)
  if(o.impale)return impaled(A,D,r,th,o);
  if(o.defeated){
    return finish(A,D,r,th,o);
  }
  if(A.down&&!bash){
    // from the ground: the blade carries on (a thrust is held a moment, then drawn back), still on the knee or seated
    if(thrust)keyA(A,th+70,{hip:[aim.P.hip[0]+4,aim.P.hip[1]-2]},{e:'out',plant:'both'});
    key(A,th+(thrust?220:110),gAfter(A,o.gm,'through',move,wHit),{at:A.base+f*(thrust?-14:4),e:'out',spin:thrust?null:spinA,slide:true});
  }else if(thrust){
    // driven in, held, torn back out
    keyA(A,th+70,{hip:[aim.P.hip[0]+6,aim.P.hip[1]-2]},{e:'out',plant:'both'});
    keyA(A,th+220,{hip:[-18,58],lean:8,h:[-10,-16],eb:-1,w:wHit+6,o:[30,-10]},{at:A.base-f*24,e:'out',slide:true});
  }else if(bash){
    keyA(A,th+110,{hip:[aim.P.hip[0]+10,aim.P.hip[1]],lean:30},{e:'out',plant:'bf'});
  }else{
    // drawn through: the blade carries on past the body
    const wEnd=move==='rise'?wHit+100:wHit-88;
    keyA(A,th+110,{hip:[8,aim.P.hip[1]-2],ff:[50,0],bf:[-46,0],lean:(aim.P.lean||30)+8,head:-26,h:move==='rise'?[30,36]:[30,-40],eb:move==='rise'?1:0,w:wEnd,o:[-46,0]},
      {at:A.base+f*14,e:'out',spin:spinA,slide:true});
  }
  // --- the struck fighter ---
  const tA=th+(thrust?220:110);
  if(D.down){
    key(D,th+90,{...POSE.flat,hip:[-44,7]},{at:x+away*kb*.5,e:'out5',slide:true});
    fx(D,{t:th,kind:'skid',id:D.id,t1:th+240});
    key(D,th+520,fit(D,readyPose(D,r)),{e:'io'});
    keyA(A,tA+330,fit(A,readyPose(A,r)),{e:'io'});
    return th+560;
  }
  const fall=o.fall||o.prone;
  const launch=!fall&&(lost>=7||(o.big&&H!=='low'));
  const rec=recoil(loc);
  if(launch){
    // off the feet: thrown back through the air, landing in a skid on one hand
    const d=kb*1.25;
    key(D,th+70,{...rec,hip:[rec.hip[0],rec.hip[1]+16],ff:[30,34],bf:[-10,26]},{at:x+away*d*.3,e:'out'});
    key(D,th+250,{hip:[-10,74],lean:-64,bend:30,head:30,ff:[40,50],bf:[14,40],h:[-20,-20],w:160,o:[-30,-10]},{at:x+away*d*.75,e:'lin',arc:26});
    key(D,th+400,{hip:[-6,34],lean:30,bend:20,head:-30,ff:[40,0],bf:[-40,0],h:[20,-30],w:20,o:[-10,-58]},{at:x+away*d,e:'lin',fe:'in'});
    key(D,th+560,{hip:[-10,32],lean:36},{at:x+away*(d+46),e:'out',slide:true});
    fx(D,{t:th+10,kind:'ghost',id:D.id,t1:th+400});fx(D,{t:th+400,kind:'land',x:x+away*d,power:1});
    fx(D,{t:th+400,kind:'skid',id:D.id,t1:th+600});fx(D,{t:th,kind:'launch',id:D.id});
    key(D,th+860,fit(D,'hurt'),{e:'io'});
    // the attacker comes after it (not from the ground)
    if(!A.down)keyA(A,tA+250,{hip:[0,58],lean:18,h:[20,-30],w:-30,ff:[36,0],bf:[-42,0]},{at:A.base+f*(d*.55),e:'io'});
    keyA(A,tA+520,fit(A,readyPose(A,r)),{e:'io'});
    return th+880;
  }
  if(fall){
    goDown(D,th,rec,kb,x,away,o.fall==='sit'||/leg/.test(loc));
    keyA(A,tA+330,fit(A,readyPose(A,r)),{e:'io'});
    return th+640;
  }
  // knocked back on the feet: a hard recoil, a skid, a catching step
  key(D,th+70,rec,{at:x+away*kb*.45,e:'out5',slide:true});
  key(D,th+260,{hip:[rec.hip[0]*.6-6,Math.max(44,rec.hip[1]-8)],lean:rec.lean*.4+10,bend:rec.bend*.4+8,head:rec.head*.3,ff:[30,0],bf:[-46,0]},
    {at:x+away*kb,e:'skid',slide:true});
  fx(D,{t:th+5,kind:'skid',id:D.id,t1:th+300});
  key(D,th+540,fit(D,'hurt'),{e:'io',plant:'bf'});
  // the attacker presses after the retreating fighter
  keyA(A,tA+300,fit(A,readyPose(A,r)),{at:A.base+f*(A.down?0:Math.max(0,kb-50)),e:'io'});
  return Math.max(th+560,tA+320);
}

// the legs go, or the balance: down onto the ground, still in the fight
function goDown(D,th,rec,kb,x,away,sit){
  key(D,th+80,rec,{at:x+away*kb*.35,e:'out5',slide:true});
  if(sit){
    key(D,th+260,{hip:[-34,30],lean:-30,bend:20,head:26,ff:[36,30],bf:[10,8],h:[10,10],w:60,o:[-34,-30]},{at:x+away*kb*.6,e:'in'});
    key(D,th+400,POSE.prop,{at:x+away*kb*.7,e:'out',slide:true});
  }else{
    key(D,th+260,{hip:[-20,36],lean:20,bend:30,head:20,ff:[20,0],bf:[-30,0],h:[20,-40],w:-20,o:[20,-50]},{at:x+away*kb*.6,e:'in'});
    key(D,th+420,POSE.prop,{at:x+away*kb*.75,e:'out',slide:true});
  }
  fx(D,{t:th+380,kind:'land',x:x+away*kb*.7,power:.8});fx(D,{t:th+10,kind:'skid',id:D.id,t1:th+200});
  D.down='prop';
}
// The blow that ends the fight. Slow, enormous, final.
// Impale (owner, 2026-11-16): the point goes in and stays there. The attacker drives it home and either keeps hold
// (the stage keeps the hand on the grip) or lets go and steps back; A.release is when the hand opens, for the stage,
// which draws the weapon in the wound from the contact on. As a finishing blow: driven home, held, the struck fighter
// sags on the blade, the attacker lets go and the fighter goes down with it still in.
function impaled(A,D,r,th,o){
  const {loc,f,away,aim}=o,x=D.base,P0=aim.P,lean0=P0.lean||30;
  keyA(A,th+80,{hip:[P0.hip[0]+3,P0.hip[1]-1],lean:lean0+2},{at:A.base+f*3,e:'out',plant:'bf'});
  if(o.defeated){
    D.over=A.over=true;A.finished='impale';fx(A,{t:th,kind:'finish',id:D.id});
    if(D.down){
      // pinned to the floor: a last jerk, the point held there, let go
      key(D,th+90,{...POSE.flat,hip:[-44,7]},{e:'out5',plant:'both'});D.down='flat';
      keyA(A,th+420,{hip:[P0.hip[0]+4,P0.hip[1]-3]},{e:'lin',plant:'both'});A.release=th+420;
      keyA(A,th+640,{hip:[-14,62],lean:-4,head:-6,h:[20,-40],w:-60,o:[-10,-40]},{at:A.base-f*40,e:'out',slide:true});
      keyA(A,th+1200,POSE.victory,{e:'io'});return th+1200;
    }
    // doubled over the blade, held up on it a moment
    key(D,th+80,{hip:[-18,60],lean:30,bend:30,head:26,h:[20,-40],w:-50,o:[24,-34]},{at:x+away*10,e:'out5',slide:true});
    key(D,th+560,{hip:[-20,56],lean:34,head:32},{e:'lin',plant:'both'});
    keyA(A,th+560,{hip:[P0.hip[0]+4,P0.hip[1]-3]},{e:'lin',plant:'both'});
    // the hand opens; the winner steps back and watches it go down
    A.release=th+600;
    keyA(A,th+820,{hip:[-14,62],lean:-4,head:-6,h:[20,-40],w:-60,o:[-10,-40]},{at:A.base-f*50,e:'out',slide:true});
    fx(D,{t:th+600,kind:'burst',id:D.id,loc});
    key(D,th+860,{hip:[-4,36],lean:24,bend:30,head:34,ff:[20,0],bf:[-26,0],h:[16,-50],w:-70,o:[10,-56]},{e:'in',plant:'both'});
    key(D,th+1120,POSE.flat,{at:x+away*26,e:'in'});D.down='flat';
    fx(D,{t:th+1120,kind:'land',x:x+away*20,power:1.1});
    keyA(A,th+1600,POSE.victory,{e:'io'});
    return th+1600;
  }
  // not finished: the struck fighter buckles round the blade, close (it cannot be thrown clear of it)
  const rec=recoil(loc);
  if(D.down){key(D,th+90,{lean:D.lastP.lean-10,head:12},{e:'out5',plant:'both'});key(D,th+420,POSE.prop,{e:'io'});}
  else{
    key(D,th+70,{...rec,hip:[rec.hip[0]*.5,Math.max(48,rec.hip[1])],lean:rec.lean*.5},{at:x+away*8,e:'out5',slide:true});
    key(D,th+480,fit(D,'hurt'),{at:x+away*10,e:'io',plant:'bf'});
  }
  if(o.held){
    // kept hold: the hand stays on the grip, braced
    keyA(A,th+420,{hip:[P0.hip[0]-2,P0.hip[1]+2],lean:lean0-4},{e:'io',plant:'both'});
    return th+480;
  }
  A.release=th+240;
  keyA(A,th+240,{hip:[P0.hip[0]+3,P0.hip[1]-1]},{e:'lin',plant:'both'});
  keyA(A,th+460,{hip:[-14,60],lean:6,head:-6,h:[24,-30],w:-40,o:[-10,-36]},{at:A.base-f*40,e:'out',slide:true});
  keyA(A,th+720,fit(A,readyPose(A,r)),{e:'io'});
  return th+720;
}
function finish(A,D,r,th,o){
  const {loc,H,move,f,away,wHit,aim,bash}=o,x=D.base,thrust=move==='lunge'||move==='stab';
  D.over=A.over=true;D.down='flat';
  fx(A,{t:th,kind:'finish',id:D.id});
  let kind=D.down&&D.lastP.hip[1]<30?'ground':thrust?'run':pick(r,o.leap?['slam','slam','through']:['through','launch','through','slam']);
  if(bash)kind='launch';
  if(sample(D,th,true).py<30)kind='ground';
  // the final blow's Special Effect chooses the finish (owner, 2026-11-16); a fighter already on the floor keeps 'ground'
  if(kind!=='ground'){const fxs=o.fx||[];
    const by=[['circumvent','slipped'],['bash','bashed'],['trip','tripped'],['disarm','disarmed'],['entangle','yanked'],['stun','stunned'],['bleed','bled']];
    // (Circumvent Parry is drawn only when its feint was: a hit straight in, both standing)
    let byFx=null;for(const [k,v] of by)if(!byFx&&fxs.includes(k)&&(k!=='circumvent'||o.slip))byFx=v;
    if(!byFx&&fxs.includes('choose'))byFx=loc==='head'?'headshot':/leg/.test(loc)?'legout':/arm/.test(loc)?'armdrop':null;
    if(!byFx&&(fxs.includes('maximise')||fxs.includes('bypass')||fxs.includes('sunder')))byFx='cracked';
    if(!byFx&&fxs.includes('blind'))byFx='blinded';
    if(byFx)kind=byFx;}
  A.finished=kind;
  if(FX_FINISH[kind])return FX_FINISH[kind](A,D,r,th,o);
  if(kind==='ground'){
    keyA(A,th+140,{hip:[aim.P.hip[0]+8,aim.P.hip[1]-4]},{e:'out',plant:'both'});
    key(D,th+120,{...POSE.flat},{at:x+away*30,e:'out5',slide:true});
    keyA(A,th+700,POSE.victory,{at:A.base-f*30,e:'io'});
    return th+760;
  }
  if(kind==='through'){
    // through and past: the cut is already made when the attacker stops, far side, back turned. A held beat.
    // Then the other falls.
    const far=x+f*150;
    keyA(A,th+90,{hip:[8,46],lean:32,bend:6,head:-14,ff:[52,0],bf:[-52,0],h:[52,2],w:wHit>0?34:6,o:[-48,-6],turn:16},
      {at:far,e:'out5',slide:true,spin:move==='rise'?{w:1}:{w:-1}});
    fx(A,{t:th,kind:'dash',id:A.id,t1:th+90,x0:A.base,x1:far,face:f,big:true});fx(A,{t:th+20,kind:'skid',id:A.id,t1:th+240});
    fx(A,{t:th-10,kind:'ghost',id:A.id,t1:th+110});
    keyA(A,th+620,{hip:[10,43],lean:35},{e:'lin',plant:'both'});
    // the struck fighter stands a moment, cut, not yet knowing
    key(D,th+80,{hip:[-6,70],lean:-10,bend:-6,head:-14,h:[10,-30],w:20,o:[-10,-40]},{e:'out5',plant:'both'});
    key(D,th+520,{hip:[-8,68],lean:-14,head:-20},{e:'lin',plant:'both'});
    fx(D,{t:th+520,kind:'burst',id:D.id,loc});
    key(D,th+700,{hip:[-6,38],lean:20,bend:26,head:30,ff:[20,0],bf:[-26,0],h:[16,-50],w:-70,o:[10,-56]},{e:'in',plant:'both'});
    key(D,th+900,POSE.face,{at:x-away*24,e:'in'});
    D.keys[D.keys.length-1].v.w=near(-4,D.keys[D.keys.length-2].v.w);
    fx(D,{t:th+900,kind:'land',x:x-away*10,power:1.1});
    // the blade is flicked clean; the winner rises without looking back
    keyA(A,th+1000,{hip:[10,60],lean:14,h:[40,-30],w:-60,o:[-20,-40]},{e:'io',plant:'both',spin:{w:-1}});
    keyA(A,th+1500,{...POSE.victory,head:8},{e:'io',plant:'ff'});
    return th+1500;
  }
  if(kind==='run'){
    // run through: the point is driven home and held; the struck fighter sags on it, then slides off
    keyA(A,th+80,{hip:[aim.P.hip[0]+12,aim.P.hip[1]-4],lean:(aim.P.lean||30)+6},{at:A.base+f*14,e:'out',plant:'bf'});
    key(D,th+80,{hip:[-18,60],lean:30,bend:30,head:26,h:[20,-40],w:-50,o:[24,-34]},{at:x+away*16,e:'out5',slide:true});
    keyA(A,th+560,{hip:[aim.P.hip[0]+12,aim.P.hip[1]-6]},{e:'lin',plant:'both'});
    key(D,th+560,{hip:[-20,54],lean:36,head:34},{e:'lin',plant:'both'});
    keyA(A,th+700,{hip:[-20,60],lean:4,h:[-16,-14],eb:-1,w:wHit,o:[30,-10]},{at:A.base-f*40,e:'out',slide:true});
    fx(D,{t:th+590,kind:'burst',id:D.id,loc});
    key(D,th+820,{hip:[-4,36],lean:24,bend:30,head:34,ff:[20,0],bf:[-26,0],h:[16,-50],w:-70,o:[10,-56]},{e:'in',plant:'both'});
    key(D,th+1040,POSE.face,{at:x-away*30,e:'in'});
    D.keys[D.keys.length-1].v.w=near(-4,D.keys[D.keys.length-2].v.w);
    fx(D,{t:th+1040,kind:'land',x:x-away*10,power:1});
    keyA(A,th+1500,POSE.victory,{e:'io'});
    return th+1500;
  }
  if(kind==='slam'){
    // driven into the ground where it stood
    keyA(A,th+120,{hip:[8,44],ff:[48,0],bf:[-46,0],lean:42,head:-24,h:[34,-42],w:-80,o:[-44,10]},{e:'out',slide:true,spin:{w:-1}});
    key(D,th+90,{hip:[-20,30],lean:-50,bend:30,head:30,ff:[30,10],bf:[4,0],h:[-20,10],w:150,o:[-30,-10]},{at:x+away*30,e:'out5',slide:true});
    key(D,th+240,{...POSE.flat},{at:x+away*70,e:'out',arc:16});
    key(D,th+420,{...POSE.flat,hip:[-42,7]},{at:x+away*96,e:'out',slide:true});
    fx(D,{t:th+90,kind:'land',x:x+away*30,power:1.5});fx(D,{t:th+240,kind:'skid',id:D.id,t1:th+420});
    keyA(A,th+760,{hip:[0,56],lean:20,h:[26,-36],w:-50},{e:'io',plant:'both'});
    keyA(A,th+1300,POSE.victory,{e:'io'});
    return th+1300;
  }
  // launched: lifted off the ground, turning over in the air, down hard on the back, a bounce, still
  const d=230;
  const wEnd=move==='rise'?wHit+110:wHit-80;
  keyA(A,th+120,{hip:[aim.P.hip[0]+10,aim.P.hip[1]+6],lean:move==='rise'?-6:40,head:-10,h:move==='rise'?[26,44]:[32,-38],eb:move==='rise'?1:0,w:wEnd,o:[-46,-10]},
    {e:'out',plant:'bf',spin:move==='rise'?{w:1}:{w:-1}});
  key(D,th+80,{hip:[-10,90],lean:-40,bend:-24,head:-30,ff:[34,50],bf:[0,44],h:[-30,20],eb:1,w:140,o:[-36,24],oeb:1},{at:x+away*d*.2,e:'out'});
  key(D,th+330,{hip:[0,150],lean:-150,bend:20,head:20,ff:[30,150],bf:[4,160],h:[-20,-20],w:230,o:[-24,-28]},{at:x+away*d*.55,e:'out',spin:{lean:-1}});
  key(D,th+600,{hip:[-40,10],lean:-88-360,bend:-2,head:-4,ff:[50,6],bf:[36,4],h:[-30,-6],w:176+360,o:[-34,-10]},{at:x+away*d*.9,e:'in',spin:{lean:-1}});
  {const L=D.keys[D.keys.length-1],b=D.keys[D.keys.length-2];L.v.lean=near(-88,b.v.lean-200);L.v.w=near(176,b.v.w);}
  key(D,th+720,{...POSE.flat,hip:[-40,24]},{at:x+away*d,e:'out'});
  key(D,th+860,{...POSE.flat},{at:x+away*(d+20),e:'in'});
  D.keys[D.keys.length-1].v.lean=D.keys[D.keys.length-2].v.lean;D.keys[D.keys.length-2].v.lean=D.keys[D.keys.length-3].v.lean;
  fx(D,{t:th+10,kind:'ghost',id:D.id,t1:th+600});fx(D,{t:th,kind:'launch',id:D.id});
  fx(D,{t:th+600,kind:'land',x:x+away*d*.9,power:1.6});fx(D,{t:th+860,kind:'land',x:x+away*(d+20),power:.5});
  keyA(A,th+800,{hip:[0,62],lean:10,h:[24,-34],w:-40},{e:'io',plant:'both'});
  keyA(A,th+1400,POSE.victory,{e:'io'});
  return th+1400;
}

// ----- finishes chosen by the final blow's Special Effect (owner, 2026-11-16; docs/pits-animation-direction.md) -----
// Each draws only what the engine says: the blow landed and ended the fight, with this effect chosen. A.dropAt (Choose
// Location, an arm): when the struck fighter's weapon falls, for the stage.
// the attacker after a finishing blow that is not its own show: the blade carried on past, the guard down, the win
// (back: how far the winner gives ground, so a fighter falling forward on its face does not land at its feet)
function carryOn(A,th,o,tWin,back){
  const {move,f,wHit,aim}=o,P0=aim.P;
  if(move==='lunge'||move==='stab'){
    keyA(A,th+70,{hip:[P0.hip[0]+6,P0.hip[1]-2]},{e:'out',plant:'both'});
    keyA(A,th+240,{hip:[-18,58],lean:8,h:[-10,-16],eb:-1,w:wHit+6,o:[30,-10]},{at:A.base-f*24,e:'out',slide:true});
  }else{
    const wEnd=move==='rise'?wHit+100:wHit-88;
    keyA(A,th+110,{hip:[8,P0.hip[1]-2],ff:[50,0],bf:[-46,0],lean:(P0.lean||30)+8,head:-26,h:move==='rise'?[30,36]:[30,-40],eb:move==='rise'?1:0,w:wEnd,o:[-46,0]},
      {at:A.base+f*14,e:'out',spin:move==='rise'?{w:1}:{w:-1},slide:true});
  }
  keyA(A,th+460,{hip:[-4,60],lean:12,head:-6,h:[24,-34],w:-40,ff:[38,0],bf:[-44,0]},{at:A.base-f*(back||20),e:'io'});
  keyA(A,tWin,POSE.victory,{e:'io'});
}
// the off hand pressed to a wound (offset from the shoulder, up positive)
const CLUTCH={head:[14,22],chest:[16,-22],abdomen:[20,-46],larm:[22,-30],rarm:[22,-30],lleg:[22,-62],rleg:[22,-62]};
const FX_FINISH={
  // Bash: knocked off the feet and thrown back through the air, a heavy landing on the back, a skid, a bounce, still
  bashed(A,D,r,th,o){
    const {f,away,aim}=o,x=D.base,d=280,P0=aim.P;
    keyA(A,th+110,{hip:[P0.hip[0]+14,P0.hip[1]-4],lean:(P0.lean||30)+10,head:-20},{at:A.base+f*26,e:'out',plant:'bf'});
    keyA(A,th+600,{hip:[0,60],lean:16,h:[24,-34],w:-40,ff:[38,0],bf:[-44,0]},{e:'io',plant:'both'});
    keyA(A,th+1500,POSE.victory,{e:'io'});
    key(D,th+70,{hip:[-14,84],lean:-44,bend:-20,head:30,ff:[40,34],bf:[0,24],h:[-30,30],eb:1,w:150,o:[-36,30],oeb:1},{at:x+away*d*.2,e:'out'});
    key(D,th+300,{hip:[-10,90],lean:-76,bend:-10,head:20,ff:[50,70],bf:[30,60],h:[-30,14],w:170,o:[-30,14]},{at:x+away*d*.62,e:'lin',arc:24});
    key(D,th+440,{...POSE.flat,hip:[-40,16]},{at:x+away*d*.85,e:'in'});
    // the skid, a bounce off the floor, still
    key(D,th+600,{...POSE.flat,hip:[-36,26],head:10},{at:x+away*(d+30),e:'out'});
    key(D,th+760,POSE.flat,{at:x+away*(d+44),e:'in'});
    fx(D,{t:th,kind:'launch',id:D.id});fx(D,{t:th+10,kind:'ghost',id:D.id,t1:th+440});
    fx(D,{t:th+440,kind:'land',x:x+away*d*.85,power:1.5});fx(D,{t:th+440,kind:'skid',id:D.id,t1:th+640});
    fx(D,{t:th+760,kind:'land',x:x+away*(d+44),power:.7});
    D.down='flat';return th+1500;
  },
  // Stun Location: the struck part snaps away, a dazed sway with the arms hanging, then straight down like a puppet
  // with its strings cut: the knees, then the face
  stunned(A,D,r,th,o){
    const {loc,away}=o,x=D.base;carryOn(A,th,o,th+1500,70);
    key(D,th+70,recoil(loc),{at:x+away*14,e:'out5',slide:true});
    key(D,th+330,{hip:[-6,66],lean:-8,bend:-4,head:24,ff:[30,0],bf:[-40,0],h:[10,-58],w:-96,o:[6,-56]},{at:x+away*18,e:'io'});
    key(D,th+560,{hip:[4,64],lean:10,bend:4,head:-14,h:[14,-58],w:-90,o:[10,-58]},{e:'io',plant:'both'});
    key(D,th+760,{hip:[-2,66],lean:-4,head:18},{e:'io',plant:'both'});
    key(D,th+900,{...POSE.kneel,head:22,h:[16,-34],w:-90,o:[12,-34]},{e:'in',plant:'both'});
    key(D,th+1120,POSE.face,{at:x+away*30,e:'in'});
    fx(D,{t:th+900,kind:'land',x,power:.6});fx(D,{t:th+1120,kind:'land',x:x+away*30,power:1.1});
    D.down='flat';return th+1500;
  },
  // Bleed: a cut that does not drop the fighter at once; it stands, the hand pressed to the wound, bleeding, then goes to
  // its knees and over
  bled(A,D,r,th,o){
    const {loc,away}=o,x=D.base,c=CLUTCH[loc]||CLUTCH.chest;carryOn(A,th,o,th+1900,70);
    const rec=recoil(loc);
    key(D,th+70,{...rec,hip:[rec.hip[0]*.5,Math.max(54,rec.hip[1])],lean:rec.lean*.5},{at:x+away*10,e:'out5',slide:true});
    key(D,th+320,{hip:[-8,64],lean:12,bend:14,head:20,ff:[30,0],bf:[-40,0],h:[16,-56],w:-80,o:c,oeb:1},{e:'io',plant:'bf'});
    key(D,th+760,{hip:[-6,62],lean:18,bend:18,head:28,o:c},{e:'lin',plant:'both'});
    for(const dt of [320,700,1080,1400])fx(D,{t:th+dt,kind:'burst',id:D.id,loc});
    key(D,th+1100,{...POSE.kneel,o:c,oeb:1,head:26,lean:20},{e:'io',plant:'both'});
    key(D,th+1320,{lean:24,head:32},{e:'lin',plant:'both'});
    key(D,th+1580,POSE.face,{at:x+away*30,e:'in'});
    fx(D,{t:th+1100,kind:'land',x,power:.5});fx(D,{t:th+1580,kind:'land',x:x+away*30,power:1});
    D.down='flat';return th+1900;
  },
  // Trip Opponent: the blow takes the legs; the feet go out and the fighter lands flat on its back. The winner stands
  // over it, the point held down at it, then lowers it (one blow: the engine's)
  tripped(A,D,r,th,o){
    const {away,f,move,wHit,aim}=o,x=D.base,P0=aim.P;
    key(D,th+70,{hip:[-14,58],lean:-24,bend:-10,head:16,ff:[42,30],h:[8,38],eb:1,w:132,o:[-18,36],oeb:1},{at:x+away*10,e:'out5',plant:'bf'});
    key(D,th+230,{hip:[-34,32],lean:-40,bend:20,head:26,ff:[44,36],bf:[8,6],h:[2,22],eb:1,w:150,o:[-34,-18]},{at:x+away*24,e:'in'});
    key(D,th+380,POSE.flat,{at:x+away*36,e:'out',slide:true});
    fx(D,{t:th+380,kind:'land',x:x+away*34,power:1.2});fx(D,{t:th+380,kind:'skid',id:D.id,t1:th+500});
    D.down='flat';
    const wEnd=move==='rise'?wHit+100:wHit-70;
    keyA(A,th+110,{hip:[8,P0.hip[1]-4],lean:(P0.lean||30)+10,head:-26,h:[30,-44],w:wEnd,o:[-46,0]},{e:'out',spin:move==='rise'?{w:1}:{w:-1},plant:'bf'});
    // over the fallen fighter, clear of it (not standing on it): the point held down at it
    const jd=joints(D,th+400),xs=[jd.F[0],jd.bF[0],jd.Hd[0],jd.P[0]],edge=f>0?Math.min(...xs):Math.max(...xs);
    const body={hip:[4,62],lean:24,bend:4,head:-28,ff:[40,0],bf:[-46,0],turn:6,o:[-30,-20]};
    const a=aimed(A,body,[edge+f*60,26],-84,.98);
    const over=f*(a.at+f*a.P.ff[0]-(edge-f*14));if(over>0)a.at-=f*over;
    keyA(A,th+640,a.P,{at:a.at,e:'io'});
    keyA(A,th+1150,{hip:[a.P.hip[0],a.P.hip[1]-2]},{e:'lin',plant:'both'});
    keyA(A,th+1650,POSE.victory,{at:a.at-f*30,e:'io'});
    return th+1650;
  },
  // Disarm Opponent: the weapon leaves the hand at the blow and spins away (the stage sticks it in the floor); the
  // fighter's eyes follow it, then it finds the wound, and goes down
  disarmed(A,D,r,th,o){
    const {away}=o,x=D.base;carryOn(A,th,o,th+1700,70);
    key(D,th+80,{hip:[-12,64],lean:-12,bend:-6,head:12,h:[-8,46],eb:1,w:160,o:[10,-20]},{at:x+away*12,e:'out5',plant:'both'});
    key(D,th+420,{hip:[-10,66],lean:-18,bend:-8,head:-30,h:[0,24],eb:1,w:120,o:[0,-30]},{e:'io',plant:'both'});
    key(D,th+780,{hip:[-8,64],lean:6,bend:6,head:26,h:[10,-40],w:-60,o:[16,-30]},{e:'io',plant:'both'});
    key(D,th+1000,{...POSE.kneel,head:24},{e:'in',plant:'both'});
    key(D,th+1240,POSE.face,{at:x+away*40,e:'in'});
    fx(D,{t:th+1000,kind:'land',x,power:.5});fx(D,{t:th+1240,kind:'land',x:x+away*40,power:1});
    D.down='flat';return th+1700;
  },
  // Circumvent Parry: the blade came in round the guard (the feint drew it to the other line, in blow()); the guard is
  // still up, the arms do not move, as the body sinks to its knees and falls
  slipped(A,D,r,th,o){
    const {away}=o,x=D.base;carryOn(A,th,o,th+1500,70);
    key(D,th+70,{hip:[-14,62],lean:-8,bend:-4,head:22},{at:x+away*10,e:'out5',plant:'bf'});
    key(D,th+520,{hip:[-12,60],lean:2,head:34},{e:'lin',plant:'both'});
    key(D,th+820,{hip:[-6,36],lean:18,bend:8,head:26,ff:[30,0],bf:[-34,0]},{e:'in',plant:'bf'});
    key(D,th+1100,POSE.face,{at:x+away*30,e:'in'});
    fx(D,{t:th+520,kind:'burst',id:D.id,loc:o.loc});
    fx(D,{t:th+820,kind:'land',x,power:.5});fx(D,{t:th+1100,kind:'land',x:x+away*30,power:1});
    D.down='flat';return th+1500;
  },
  // Entangle: the weapon wraps the part it struck and the attacker hauls on it: the fighter is yanked off its feet,
  // feet first toward the attacker, down on its back and dragged a little way
  yanked(A,D,r,th,o){
    const {f,away,aim}=o,x=D.base,P0=aim.P,toA=-away;
    keyA(A,th+90,{hip:[P0.hip[0]+4,P0.hip[1]-2]},{e:'out',plant:'both'});
    // the haul: weight back, the weapon hand drawn in to the hip, a step back
    keyA(A,th+260,{hip:[-30,52],lean:-26,bend:-10,head:10,ff:[30,0],bf:[-56,0],h:[-6,-40],w:-150,o:[10,-40],turn:-6},{at:A.base-f*30,e:'out5',slide:true});
    keyA(A,th+700,{hip:[-20,58],lean:-14,head:4,h:[0,-44],w:-140,o:[6,-44]},{at:A.base-f*110,e:'io'});
    keyA(A,th+1500,POSE.victory,{e:'io'});
    fx(A,{t:th+180,kind:'skid',id:A.id,t1:th+420});
    key(D,th+70,{...recoil(o.loc),hip:[-8,60]},{at:x+away*4,e:'out5',plant:'bf'});
    // the feet go first, toward the haul; the body pivots back over them and slams down
    key(D,th+250,{hip:[10,58],lean:-62,bend:-10,head:30,ff:[84,60],bf:[56,46],h:[-20,30],eb:1,w:150,o:[-30,24],oeb:1},{at:x+toA*34,e:'out'});
    key(D,th+420,{...POSE.flat,hip:[-40,14]},{at:x+toA*60,e:'in'});
    key(D,th+760,POSE.flat,{at:x+toA*110,e:'out',slide:true});
    fx(D,{t:th+420,kind:'land',x:x+toA*40,power:1.3});fx(D,{t:th+430,kind:'skid',id:D.id,t1:th+760});
    D.down='flat';return th+1500;
  },
  // Maximise Damage, Bypass Armour, Sunder: one heavy blow; the armour cracks (sparks, a piece flies) and the fighter is
  // driven to its knees, then over
  cracked(A,D,r,th,o){
    const {f,away,aim}=o,x=D.base,P0=aim.P;
    // (the weight dropped through the blow, the feet where they landed)
    keyA(A,th+120,{hip:[P0.hip[0]+6,P0.hip[1]-6],lean:(P0.lean||30)+10,head:-22},{e:'out',plant:'both'});
    keyA(A,th+620,{hip:[-6,60],lean:14,h:[24,-34],w:-40,ff:[38,0],bf:[-44,0]},{at:A.base-f*60,e:'io'});
    keyA(A,th+1500,POSE.victory,{e:'io'});
    fx(D,{t:th,kind:'crack',id:D.id,loc:o.loc,dir:away});
    key(D,th+70,{hip:[-16,50],lean:30,bend:22,head:24,ff:[30,0],bf:[-40,0],h:[20,-50],w:-60,o:[20,-50]},{at:x+away*14,e:'out5',slide:true});
    key(D,th+240,{...POSE.kneel,head:26,lean:22,h:[18,-30],w:-80,o:[14,-30]},{at:x+away*18,e:'in',plant:'bf'});
    key(D,th+700,{lean:28,head:32},{e:'lin',plant:'both'});
    key(D,th+960,POSE.face,{at:x+away*34,e:'in'});
    fx(D,{t:th+240,kind:'land',x:x+away*18,power:1.2});fx(D,{t:th+960,kind:'land',x:x+away*34,power:1});
    D.down='flat';return th+1500;
  },
  // Blinded (the loser was blinded by an earlier Blind Opponent, still in force): a hand to the eyes, a staggering
  // half-step, a wild swing at nothing, then a fall
  blinded(A,D,r,th,o){
    const {away}=o,x=D.base;carryOn(A,th,o,th+1700,90);
    key(D,th+70,{...recoil(o.loc),o:[14,24],oeb:1},{at:x+away*14,e:'out5',slide:true});
    key(D,th+300,{hip:[-4,64],lean:-10,bend:-4,head:-16,ff:[26,0],bf:[-44,0],h:[20,30],eb:1,w:130,o:[14,24],oeb:1},{at:x+away*30,e:'io'});
    key(D,th+520,{hip:[6,60],lean:26,bend:8,head:10,h:[34,-30],w:-60,o:[14,24],oeb:1,turn:-10},{e:'out',plant:'bf',spin:{w:-1}});
    key(D,th+780,{hip:[10,56],lean:32,bend:12,head:22,ff:[34,0],bf:[-40,0],h:[20,-50],w:-90,o:[16,20],oeb:1},{at:x+away*36,e:'io'});
    key(D,th+1000,{...POSE.kneel,head:24,o:[14,22],oeb:1},{e:'in',plant:'both'});
    key(D,th+1240,POSE.face,{at:x+away*50,e:'in'});
    fx(D,{t:th+1000,kind:'land',x:x+away*36,power:.5});fx(D,{t:th+1240,kind:'land',x:x+away*50,power:1});
    D.down='flat';return th+1700;
  },
  // Choose Location, the head: it snaps back, the body turns away and drops
  headshot(A,D,r,th,o){
    const {away}=o,x=D.base;carryOn(A,th,o,th+1300);
    key(D,th+70,{...recoil('head'),turn:-24},{at:x+away*22,e:'out5',slide:true});
    key(D,th+260,{hip:[-20,52],lean:-40,bend:-10,head:-40,ff:[40,10],bf:[-30,0],h:[-20,30],w:150,o:[-30,30],turn:-40},{at:x+away*42,e:'io'});
    key(D,th+480,POSE.flat,{at:x+away*62,e:'in'});
    fx(D,{t:th+480,kind:'land',x:x+away*62,power:1.2});
    D.down='flat';return th+1300;
  },
  // Choose Location, a leg: the leg goes out from under, down onto the backside, then flat
  legout(A,D,r,th,o){
    const {loc,away}=o,x=D.base;carryOn(A,th,o,th+1300);
    key(D,th+80,recoil(loc),{at:x+away*10,e:'out5',slide:true});
    key(D,th+300,{hip:[-30,26],lean:-20,bend:20,head:20,ff:[50,24],bf:[10,4],h:[10,10],w:60,o:[-34,-20]},{at:x+away*20,e:'in'});
    key(D,th+520,POSE.prop,{e:'out',slide:true});
    key(D,th+900,POSE.flat,{at:x+away*28,e:'io'});
    fx(D,{t:th+300,kind:'land',x:x+away*20,power:1});
    D.down='flat';return th+1300;
  },
  // Choose Location, an arm: the weapon falls from the hand first, the arm clutched, then the knees and the face
  armdrop(A,D,r,th,o){
    const {loc,away}=o,x=D.base,c=CLUTCH[loc]||CLUTCH.rarm;carryOn(A,th,o,th+1400,70);
    key(D,th+70,recoil(loc),{at:x+away*16,e:'out5',slide:true});A.dropAt=th+140;
    key(D,th+360,{hip:[-12,62],lean:14,bend:16,head:20,ff:[30,0],bf:[-44,0],h:[10,-58],w:-90,o:c,oeb:1},{at:x+away*24,e:'io'});
    key(D,th+700,{...POSE.kneel,o:c,oeb:1,head:24},{e:'io',plant:'both'});
    key(D,th+1000,POSE.face,{at:x+away*40,e:'in'});
    fx(D,{t:th+700,kind:'land',x:x+away*24,power:.5});fx(D,{t:th+1000,kind:'land',x:x+away*40,power:1});
    D.down='flat';return th+1400;
  },
};

// ----- an Impale withdrawn, and a self-inflicted hit (audit CA-08, CL-04) -----
// The wielder takes hold of the weapon in the wound and tears it out, as a thrust is torn out after a hit (struck): the
// injury lands as it comes out. s: {loc, lost, defeated, flow}. Nothing new is invented: no extra body damage.
function withdraw(M,aid,t,s){
  const A=M[aid],D=M[aid==='a'?'b':'a'];if(!A||!D)return {tc:t,contacts:[],end:t};
  const loc=s.loc||'chest',lost=s.lost||0;cut(A,t);cut(D,t);
  const f=faceOf(A),away=-faceOf(D),len=A.weapon.len,held=s.held!==false;
  // (owner, 2026-11-16: "withdraw weapon looks horrible"). One pull, never a second thrust: the hand is on the grip with
  // the point in the wound along the line the stage draws it (shoulder to wound, the point PS_LODGE_IN inside); the
  // wielder braces and the wounded fighter is tugged toward it; then the hand draws straight back along the shaft and
  // the point comes out the way it went in. The injury lands as it comes out.
  const q=Math.max(.5,(len-10)/len);
  const B=P0=>({hip:P0.hip.slice(),lean:P0.lean,bend:P0.bend,head:P0.head,ff:P0.ff.slice(),bf:P0.bf.slice(),turn:P0.turn||0,o:[-30,-16]});
  const lineAt=tt=>{const T=partAt(D,tt,loc),Sh=joints(A,tt).wS;
    // the shaft runs from the shoulder's side to the wound, never steeper than the arm can hold it
    return {T,w:clamp(deg(Math.atan2(T[1]-Sh[1],f*(T[0]-Sh[0])||1)),-40,30)};};
  // the hand on the grip: at once if it kept hold, a step in and a grab if the weapon was left in the wound
  // (further off than a lean: a real step in, the time it takes, never a dash)
  const L0=lineAt(t),body0=B(A.lastP);
  const g0=aimed(A,{...body0,lean:Math.max(10,body0.lean)},L0.T,L0.w,q),far=Math.abs(g0.at-A.base);
  const tg=t+Math.round(Math.min(380,Math.max(held?70:240,far*2.4)));
  hold(D,tg);
  if(!held||far>30)keyA(A,Math.round((t+tg)/2),{hip:[body0.hip[0]+6,body0.hip[1]-2],lean:body0.lean+8,h:[30,-10],w:-20},
    {at:A.base+(g0.at-A.base)*.5,e:'io'});
  keyA(A,tg,g0.P,{at:g0.at,e:'io'});
  // the brace: the weight settles back, the wounded fighter is drawn a little toward the weapon
  const tb=tg+140;
  if(!D.down)key(D,tb,{lean:D.lastP.lean+14,head:(D.lastP.head||0)+12,hip:[D.lastP.hip[0]+6,D.lastP.hip[1]-2]},{at:D.base-away*8,e:'io',plant:'bf'});
  else hold(D,tb);
  const L1={T:partAt(D,tb,loc),w:g0.P.w};
  const g1=aimed(A,{...g0.P,lean:g0.P.lean-8,hip:[g0.P.hip[0]-6,g0.P.hip[1]-3]},L1.T,L1.w,q);
  keyA(A,tb,g1.P,{at:g1.at,e:'io',plant:'bf'});
  const tc=tb;
  const contacts=[{t:tc,at:L1.T,kind:lost>0?'tear':'clash'}];
  fx(D,{t:tc,kind:'spurt',id:D.id,loc,dir:-away,n:lost>0?Math.min(30,8+lost*3):0});
  // the pull: the hand travels back along the shaft, the point leaves the wound the way it went in
  const dw=rad(L1.w),pull=Math.max(44,Math.min(len*.6,80)),T2=[L1.T[0]-f*Math.cos(dw)*pull,L1.T[1]-Math.sin(dw)*pull];
  const g2=aimed(A,{...g1.P,lean:g1.P.lean-14,hip:[g1.P.hip[0]-14,g1.P.hip[1]-2],head:(g1.P.head||0)+6},T2,L1.w,q);
  keyA(A,tc+120,g2.P,{at:g2.at,e:'out5',slide:true});
  fx(A,{t:tc+20,kind:'skid',id:A.id,t1:tc+160});
  if(s.defeated&&!D.down){
    // the last of it: pulled after the blade, a hand to the wound, the knees, the face; the winner steps clear
    D.over=A.over=true;const c=CLUTCH[loc]||CLUTCH.chest,x=D.base;
    key(D,tc+90,{hip:[4,62],lean:30,bend:20,head:24,h:[16,-50],w:-70,o:c,oeb:1},{at:x-away*14,e:'out5',plant:'bf'});
    key(D,tc+520,{hip:[0,58],lean:36,bend:24,head:30,o:c,oeb:1},{e:'lin',plant:'both'});
    key(D,tc+760,{...POSE.kneel,head:28,lean:24,o:c,oeb:1},{e:'in',plant:'both'});
    key(D,tc+1000,POSE.face,{at:x+away*20,e:'in'});D.down='flat';
    fx(D,{t:tc+760,kind:'land',x,power:.5});fx(D,{t:tc+1000,kind:'land',x:x+away*20,power:1});
    keyA(A,tc+420,{hip:[-14,62],lean:2,head:-6,h:[20,-34],w:-50,o:[-6,-40]},{at:A.base-f*60,e:'io'});
    keyA(A,tc+1400,POSE.victory,{e:'io'});
    return {tc,contacts,end:tc+1400,move:'withdraw'};
  }
  if(D.down){key(D,tc+90,{lean:D.lastP.lean+8,head:12},{e:'out5',plant:'both'});key(D,tc+420,POSE.prop,{e:'io'});}
  else{
    // pulled after the blade, then folding round the wound
    const c=CLUTCH[loc]||CLUTCH.chest;
    key(D,tc+80,{hip:[2,60],lean:26,bend:16,head:20,o:c,oeb:1},{at:D.base-away*10,e:'out5',plant:'bf'});
    key(D,tc+480,{...fit(D,'hurt'),o:c,oeb:1},{at:D.base+away*6,e:'io',plant:'bf'});D.hurt=true;
  }
  keyA(A,tc+500,fit(A,readyPose(A,rng(A.pair))),{at:A.base-f*10,e:'io'});
  return {tc,contacts,end:s.flow?tc+320:tc+520,move:'withdraw'};
}
// a fighter hurts itself (Accidental Injury): the struck part is driven away, then the hurt guard
function flinch(m,t,loc){
  if(m.over)return t;cut(m,t);
  if(m.down){key(m,t+90,{lean:m.lastP.lean-10,head:12},{e:'out5',plant:'both'});key(m,t+400,POSE.prop,{e:'io'});return t+400;}
  key(m,t+80,recoil(loc||'chest'),{e:'out5',plant:'bf'});key(m,t+460,fit(m,'hurt'),{e:'io',plant:'bf'});m.hurt=true;return t+460;
}

// ----- the rest of what the stage asks for -----
// going down without a blow of its own (the engine put the fighter on the ground)
function fall(m,t,how){
  if(m.down)return t;
  cut(m,t);const f=faceOf(m),x=m.base;
  if(m.over){
    // out of the fight: the knees give and the body pitches forward
    key(m,t+200,{hip:[-4,36],lean:24,bend:26,head:30,ff:[20,0],bf:[-26,0],h:[16,-50],w:-70,o:[10,-56]},{e:'in',plant:'both'});
    key(m,t+420,POSE.face,{at:x+f*24,e:'in'});
    m.keys[m.keys.length-1].v.w=near(-4,m.keys[m.keys.length-2].v.w);
    fx(m,{t:t+420,kind:'land',x:x+f*10,power:.9});m.down='flat';return t+460;
  }
  key(m,t+170,{hip:[-34,30],lean:-30,bend:20,head:26,ff:[36,30],bf:[10,8],h:[10,10],w:60,o:[-34,-30]},{at:x-f*20,e:'in'});
  key(m,t+320,POSE.prop,{at:x-f*34,e:'out',slide:true});
  fx(m,{t:t+300,kind:'land',x:x-f*30,power:.7});
  m.down='prop';return t+340;
}
// back on the feet: the legs are thrown over and the body follows them up
function stand(m,t){
  cut(m,t);const x=m.base,f=faceOf(m);m.down=false;m.over=false;
  key(m,t+130,{hip:[-30,24],lean:-70,bend:30,head:30,ff:[-10,70],bf:[-30,60],h:[-20,-30],w:150,o:[-30,-40]},{e:'out'});
  key(m,t+290,{hip:[0,50],lean:30,bend:20,head:-10,ff:[26,0],bf:[-30,0],h:[20,-30],w:30,o:[20,-36]},{at:x+f*10,e:'in',arc:40});
  fx(m,{t:t+290,kind:'land',x:x+f*10,power:.6});
  key(m,t+470,fit(m,m.hurt?'hurt':'guard'),{e:'io',plant:'both'});
  return t+470;
}
// the winner: the blade is lowered and the fighter straightens
function lower(m,t){
  if(m.keys[m.keys.length-1].t>t+50)return m.keys[m.keys.length-1].t;
  cut(m,t);m.over=true;keyA(m,t+520,POSE.victory,{e:'io',plant:'ff'});return t+520;
}
function surrender(m,t){cut(m,t);m.over=true;key(m,t+460,POSE.surrender,{e:'io',plant:'ff'});return t+460;}
function yieldTo(m,t){cut(m,t);m.over=true;key(m,t+420,POSE.yield,{e:'io',plant:'ff'});return t+420;}
// ----- Trip, Disarm, Press Advantage: their own choreography (owner, 2026-11-16) -----
// Each is a phrase of its own, not a stand-in blow: the stage gives the engine's result (the trip worked or was
// resisted; the weapon goes) and the phrase only draws it. s.key: the exchange's stream, so a replay repeats it.

// Trip Opponent: the front foot is taken. A hook (the tripper's own foot behind the ankle) or a sweep (the weapon low
// along the floor, for a long shaft or from the ground). s: {fell, after (a hook straight after the tripper's own blow),
// key}. Returns {tc, contacts, end, move}; the contact is at the ankle.
function trip(M,aid,t,s){
  s=s||{};const A=M[aid],D=M[aid==='a'?'b':'a'];
  if(!A||!D||D.down||A.over||D.over)return {tc:t,contacts:[],end:t,move:null};
  const r=s.key!=null?rngKey(A.pair,s.key+'|trip'):rng(A.pair);
  cut(A,t);cut(D,t);
  const f=faceOf(A),away=-faceOf(D),sD=sample(D,t,true),x=D.base;
  const T=[sD.ffx-f*4,9];
  const move=A.down||(A.prof.two>30)?'sweep':s.after?'hook':pick(r,['hook','hook','sweep']);
  const tw=t+(s.after?90:160),tc=tw+(move==='sweep'?120:105);
  if(move==='hook'){
    // in close, the knee comes up, then the foot whips round behind the ankle and pulls
    const FX=64,at=T[0]-f*(FX+6);
    keyA(A,tw,{hip:[-10,56],lean:8,bend:4,head:-10,ff:[10,24],bf:[-30,0],h:[16,8],eb:1,w:118,o:[-24,18],oeb:1,turn:-8},
      {at:lerp(A.base,at,.7),e:'out',slide:true,ec:{ffy:'out',ffx:'in'}});
    dustAt(A,t+40,sample(A,t,true).bfx,3,-f);
    keyA(A,tc,{hip:[-4,46],lean:24,bend:8,head:-16,ff:[FX,10],bf:[-36,0],h:[14,10],eb:1,w:122,o:[-32,14],oeb:1,turn:-10},
      {at,e:'in',plant:'bf',ec:{ffx:'in3',ffy:'in'}});
    keyA(A,tc+130,{hip:[-8,50],lean:16,ff:[30,4],head:-10},{e:'out',plant:'bf'});
  }else{
    // dropped low, the weapon scythes along the floor into the ankle
    const body={hip:[0,40],lean:38,bend:8,head:-18,ff:[56,0],bf:[-50,0],turn:12,o:[-40,-6]};
    const a=aimed(A,body,T,-6,A.prof.reachAt);
    keyA(A,tw,windUp(A,'upLow'),{e:'out',plant:A.down?'both':'ff'});
    keyA(A,tc,a.P,{at:a.at,e:'in',ec:{px:'out',w:'in3',ua:'in',fa:'in'},spin:{w:1},slide:true});
    fx(A,{t:tw+20,kind:'swing',id:A.id,t1:tc+90,heavy:A.prof.heavy});
    keyA(A,tc+120,{hip:[6,a.P.hip[1]],lean:(a.P.lean||30)+6,w:-30,h:[a.P.h[0]-6,a.P.h[1]-4]},{e:'out',plant:'both',spin:{w:-1}});
    dustAt(A,tc,T[0],6,f);
  }
  hold(D,tc-60);
  const contacts=[{t:tc,at:T,kind:'trip'}];
  if(s.fell){
    // the foot goes out from under: kicked up and forward, the body tips back and sits down hard
    key(D,tc+70,{hip:[-14,58],lean:-24,bend:-10,head:16,ff:[42,30],h:[8,38],eb:1,w:132,o:[-18,36],oeb:1},{e:'out5',plant:'bf'});
    key(D,tc+220,{hip:[-34,32],lean:-40,bend:20,head:26,ff:[44,36],bf:[8,6],h:[2,22],eb:1,w:150,o:[-34,-18]},{at:x+away*18,e:'in'});
    key(D,tc+350,POSE.prop,{at:x+away*30,e:'out',slide:true});
    fx(D,{t:tc+340,kind:'land',x:x+away*24,power:.9});fx(D,{t:tc+340,kind:'skid',id:D.id,t1:tc+460});
    D.down='prop';
  }else{
    // the foot is lifted and put down again: a hop, the arms out, a catching step back
    key(D,tc+70,{hip:[-8,66],lean:-8,bend:-4,head:8,ff:[22,20],h:[30,22],eb:1,w:110,o:[-14,12],oeb:1},{e:'out5',plant:'bf'});
    key(D,tc+240,{hip:[-12,60],lean:10,ff:[30,0],bf:[-50,0],h:[30,-10],w:60,o:[10,-30]},{at:x+away*22,e:'io'});
    key(D,tc+460,fit(D,D.hurt?'hurt':'guard'),{e:'io',plant:'both'});
  }
  keyA(A,tc+(s.fell?480:420),fit(A,readyPose(A,r)),{e:'io'});
  return {tc,contacts,end:tc+(s.fell?500:480),move};
}

// Disarm Opponent: the blade binds on the other's weapon near the hand, winds round it and wrenches it out; the hand
// is thrown up and back, empty. The stage throws the weapon itself at the second contact. s: {key}.
function disarm(M,aid,t,s){
  s=s||{};const A=M[aid],D=M[aid==='a'?'b':'a'];
  if(!A||!D||A.over||D.over)return {tc:t,contacts:[],end:t,move:null};
  const r=s.key!=null?rngKey(A.pair,s.key+'|disarm'):rng(A.pair);
  cut(A,t);cut(D,t);
  const f=faceOf(A),away=-faceOf(D),x=D.base;
  const tw=t+120,tc=tw+100;
  hold(D,tc);
  const jd=joints(D,tc),B=[jd.Hn[0]+(jd.tip[0]-jd.Hn[0])*.4,jd.Hn[1]+(jd.tip[1]-jd.Hn[1])*.4];
  const a=aimed(A,{hip:[12,58],lean:24,bend:6,head:-14,ff:[52,0],bf:[-48,0],turn:10,o:[-36,-18]},B,22,.5);
  // a small cock, not a full swing: the blade only has to reach the other's
  keyA(A,tw,{hip:[-12,58],lean:8,bend:2,head:-8,ff:[34,0],bf:[-50,0],h:[10,8],eb:1,w:70,o:[-30,-20],turn:-4},{e:'out',plant:'ff'});
  keyA(A,tc,a.P,{at:a.at,e:'in',ec:{px:'out',w:'in3'}});
  // the wind: the point drops under the other's blade, round it, then flicks up hard and throws it out of the hand
  const tr=tc+110,tf=tr+70;
  keyA(A,tr,{hip:[a.P.hip[0]+6,a.P.hip[1]-4],lean:(a.P.lean||24)+6,h:[a.P.h[0]-2,a.P.h[1]-16],w:a.P.w-110},{e:'io',plant:'both',spin:{w:-1}});
  keyA(A,tf,{hip:[a.P.hip[0]+2,a.P.hip[1]+2],lean:(a.P.lean||24)-6,head:-10,h:[a.P.h[0]-6,a.P.h[1]+24],eb:1,w:a.P.w+64},{e:'out5',plant:'both',spin:{w:1}});
  keyA(A,tf+150,{hip:[-6,60],lean:6,head:-8,h:[18,24],eb:1,w:a.P.w+80},{at:A.base-f*14,e:'out',slide:true});
  hold(D,tf);
  const jr=joints(D,tf);
  const contacts=[{t:tc,at:B,kind:'clash'},{t:tf,at:jr.Hn,kind:'disarm'}];
  fx(A,{t:tc+10,kind:'grind',t1:tr,at:B});
  // the weapon hand thrown up and back, open; a step back, the hand brought in to guard
  keyA(D,tf+80,{hip:[-12,64],lean:-12,bend:-6,head:12,h:[-8,46],eb:1,w:160,o:[10,-20]},{e:'out5',plant:'both'});
  keyA(D,tf+300,{hip:[-14,60],lean:6,bend:4,head:-6,h:[24,-10],w:50,o:[18,-16]},{at:x+away*30,e:'io'});
  keyA(A,tf+460,fit(A,readyPose(A,r)),{e:'io'});
  keyA(D,tf+520,fit(D,readyPose(D,r)),{e:'io',plant:'both'});
  return {tc,contacts,end:tf+520,move:'bind'};
}

// Press Advantage: the attacker beats the other's guard aside and drives on; the other gives two steps back and
// covers up, the point in its face (the engine's hold lasts until its next turn)
function press(A,D,t){
  if(A.over||D.over)return t;
  cut(A,t);cut(D,t);const f=faceOf(A),away=-faceOf(D),x=D.base;
  if(D.down){keyA(A,t+260,{hip:[10,58],lean:26,h:[44,-24],w:-28,o:[-30,-20]},{e:'out',plant:'bf'});return t+260;}
  const body={hip:[12,60],lean:24,bend:4,head:-14,ff:[52,0],bf:[-46,0],turn:10,o:[-36,-18]};
  // the beat: the blade knocks the other's guard off line
  const jd=joints(D,t+130),B=[jd.Hn[0]+(jd.tip[0]-jd.Hn[0])*.5,jd.Hn[1]+(jd.tip[1]-jd.Hn[1])*.5];
  const b=aimed(A,{...body,hip:[16,58]},B,-30,.55);
  hold(D,t+110);
  keyA(A,t+130,b.P,{at:b.at,e:'in',ec:{px:'out',w:'in3'},slide:true});
  fx(A,{t:t+130,kind:'thump',at:B,power:.35});
  key(D,t+190,{h:[30,-34],w:-44,lean:-8,head:10,o:[-6,-24]},{e:'out5',plant:'both'});
  // two steps: the point goes to the face and stays there; the other backs off and covers
  for(const [i,d] of [[1,38],[2,74]]){
    const tt=t+130+i*190,T=partAt(D,t,'head'),a=aimed(A,body,[T[0]-f*40+away*d,T[1]-6],4,.98);
    // (the guard stays off line for the first step and only comes back up on the second)
    key(D,tt-10,{hip:[-16-i*4,62-i*3],lean:-10+i*6,bend:-6+i*6,head:-6,h:i===1?[30,-24]:[26,0],w:i===1?-24:64,o:[-10,-30],ff:[28,0],bf:[-48,0]},
      {at:x+away*d,e:'io'});
    keyA(A,tt,a.P,{at:a.at+f*40,e:'io'});
  }
  fx(D,{t:t+200,kind:'skid',id:D.id,t1:t+520});
  return t+560;
}
// the engine changed the range: the pair close, or spring apart
function recover(m,t,g){
  const o=other(m);m.pair.gap=g;if(!o||m.down||m.over)return t;
  if(m.keys[m.keys.length-1].t>t+40)t=m.keys[m.keys.length-1].t;
  const xm=sample(m,t,true).px,xo=sample(o,t,true).px,sep=Math.abs(xo-xm),f=faceOf(m);
  // each fighter takes half of the change; with a Reach difference the change is the one who makes it (owner,
  // 2026-11-16): the shorter weapon closes on its own and the longer opens on its own, the other only settles into
  // its new stance where it stands
  const share=m.stance==='inside'||m.stance==='keep'?1:m.stance==='kept'||m.stance==='cramped'?0:.5;
  // (with stances, measured between where the two stand, as the gap is, not between the hips: the stances carry
  // the hips back or forward)
  let d=(share===.5?sep-g:Math.abs(o.base-m.base)-g)*share;if(Math.abs(d)<10)return share===0?restance(m,t):t;
  cut(m,t);const r=rng(m.pair);
  if(share!==.5)d=(Math.abs(o.base-m.base)-g)*share;      // (cut puts the base where the feet are now)
  if(m.stance==='inside'&&d>0){
    // in under the point: a low dart, the empty hand batting the point up and away, then up close inside it
    key(m,t+80,{hip:[0,44],lean:34,bend:10,head:-20,h:[14,-26],w:20,o:[40,22],ff:[36,0],bf:[-48,0]},{e:'out',plant:'both'});
    key(m,t+270,{hip:[10,44],lean:30,bend:8,head:-18,h:[18,-22],w:14,o:[38,30],ff:[44,0],bf:[-40,0]},{at:m.base+f*d*.85,e:'out',slide:true});
    fx(m,{t:t+80,kind:'dash',id:m.id,t1:t+270,x0:m.base-f*d*.85,x1:m.base,face:f});fx(m,{t:t+180,kind:'skid',id:m.id,t1:t+330});
    key(m,t+440,fit(m,'guard'),{at:m.base+f*d*.15,e:'io'});
    return t+440;
  }
  if(m.stance==='keep'&&d<0){
    // the shaft punched out to make room, then a hop back to the weapon's own range, the point coming back to the face
    // (the shaft stays up while the other is close; it comes down to the face only once the distance is made)
    key(m,t+90,{hip:[6,60],lean:18,bend:4,head:-10,h:[38,-4],w:50,ff:[40,0],bf:[-48,0]},{e:'out',plant:'both'});
    key(m,t+290,{hip:[-22,58],lean:-6,bend:-4,head:2,h:[30,-10],w:34,ff:[34,0],bf:[-50,0]},{at:m.base+f*d,e:'out5',slide:true,arc:10});
    fx(m,{t:t+90,kind:'dash',id:m.id,t1:t+290,x0:m.base-f*d,x1:m.base,face:-f});fx(m,{t:t+200,kind:'skid',id:m.id,t1:t+360});
    key(m,t+480,fit(m,'guard'),{e:'io'});
    return t+480;
  }
  if(d<0){
    key(m,t+70,POSE.coil,{e:'out',plant:'both'});
    key(m,t+250,{hip:[-20,56],lean:-8,ff:[36,0],bf:[-46,0]},{at:m.base+f*d,e:'out5',slide:true,arc:12});
    fx(m,{t:t+70,kind:'dash',id:m.id,t1:t+250,x0:m.base-f*d,x1:m.base,face:-f});fx(m,{t:t+150,kind:'skid',id:m.id,t1:t+330});
  }else{
    key(m,t+90,{hip:[10,56],lean:28},{e:'out',plant:'both'});
    key(m,t+280,{hip:[4,56],lean:22,ff:[40,0],bf:[-44,0]},{at:m.base+f*d,e:'out',slide:d>80});
    if(d>60)fx(m,{t:t+90,kind:'dash',id:m.id,t1:t+280,x0:m.base-f*d,x1:m.base,face:f});
  }
  key(m,t+480,fit(m,readyPose(m,r)),{e:'io',plant:'both'});
  return t+480;
}
// into the stance the range now asks for, where the fighter stands
function restance(m,t){
  if(m.down||m.over)return t;
  if(m.keys[m.keys.length-1].t>t+40)t=m.keys[m.keys.length-1].t;
  cut(m,t);key(m,t+360,fit(m,'guard'),{e:'io',plant:'both'});return t+360;
}
const react=()=>0;

// what the stage draws: joints in the fighter's frame around m.hx
function pose(m,t,opt){
  const v=sample(m,t),f=faceAt(m,t),j=solve(v,f,m,opt);
  m.hx=j.P[0];m.face=f;
  const L=p=>[f*(p[0]-m.hx),p[1]],o={};
  for(const k of ['P','M','S','wS','oS','Hd','E','Hn','oE','oHn','K','F','bK','bF','tip'])o[k]=L(j[k]);
  o.w=j.w;o.blen=j.blen;o.world=j;
  return o;
}
// how fast the body and the point are going (units per ms), for smears and afterimages
function speed(m,t){
  const a=joints(m,t-8),b=joints(m,t+8),d=(p,q)=>Math.hypot(q[0]-p[0],q[1]-p[1])/16;
  return {body:d(a.P,b.P),tip:d(a.tip,b.tip),hand:d(a.Hn,b.Hn)};
}
// are the feet skidding at t (a key with `slide` is being travelled)
function sliding(m,t){const ks=m.keys,i=idx(ks,t),b=ks[i+1];return !!(b&&b.slide&&t>ks[i].t);}

const api={WRIST,supports,fighter,gap,station,place,setRange,stancePose,restance,recover,intent,blow,withdraw,flinch,fall,stand,lower,yieldTo,surrender,press,trip,disarm,react,pose,
  joints,sample,speed,sliding,takeFx,profile,extent,key,cut,POSE,keep:n=>{KEEP=n;},fixChoices:u=>{FIXED=u==null?null:u;},DIM,LEG,ARM,SHIELD_R,partAt,world:m=>m.pair};
root.PitsCine=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
