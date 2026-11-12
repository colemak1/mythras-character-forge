// The Pits: movement language (animation direction, docs/pits-animation-direction.md).
// PRESENTATION ONLY. Nothing here rolls, decides or changes a fight. It turns an
// exchange whose result is already known into one timeline for both fighters.
//
// Three ideas replace the pose library of pits-stage.js:
//   1. The body is driven from the ground. Feet are points on the floor that stay
//      where they are until a step moves them; the pelvis carries the weight
//      between them; legs are solved from pelvis to foot. A body can only be
//      where its feet allow.
//   2. Each body part has its own track of keys, so the hips can lead, the chest
//      follow, the hand come after and the blade last (and the blade can arrive
//      first on a parry). Hands swing in arcs around the shoulder or travel in a
//      straight line (a thrust).
//   3. An exchange is one function of time. Both fighters are written against
//      the same contact moment, and every phrase starts from the pose the last
//      one left. Any moment can be paused, stepped or replayed.
//
// Frames: a fighter's own frame has x forward (toward the opponent) and y up
// from the floor. World x runs left to right; world = hx + face * x.
(function(root){
const DIM={thigh:46,shin:46,spine:29,neck:23,upper:32,fore:30,headR:13};
const LEG=DIM.thigh+DIM.shin,ARM=DIM.upper+DIM.fore;
const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const norm=a=>((a+180)%360+360)%360-180;       // an angle as -180..180
// How far a wrist turns a held weapon from the line of the forearm (degrees, toward the thumb side).
const GRIP={min:-12,max:120};

// ----- easing: how a part travels between two keys -----
const EASE={
  lin:p=>p,
  in:p=>p*p,                               // gathers speed (a strike into contact)
  in3:p=>p*p*p,                            // late and sudden (the blade whipping through)
  out:p=>1-(1-p)*(1-p),                    // arrives and settles
  out3:p=>1-Math.pow(1-p,3),               // thrown, then caught
  io:p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2, // unhurried weight shift
  back:p=>{const c=1.6,q=p-1;return 1+(c+1)*q*q*q+c*q*q;}   // overshoots a little, then comes back
};

// ----- two-bone solve. sign is the side the middle joint bends to: +1 an elbow, -1 a knee -----
function ik(a,b,l1,l2,sign){
  const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1e-6;
  const dd=clamp(d,Math.abs(l1-l2)+.5,l1+l2-.25),ux=dx/d,uy=dy/d;
  const x=(l1*l1-l2*l2+dd*dd)/(2*dd),h=Math.sqrt(Math.max(0,l1*l1-x*x)),s=-sign;
  return {mid:[a[0]+ux*x-uy*h*s,a[1]+uy*x+ux*h*s],end:[a[0]+ux*dd,a[1]+uy*dd],over:d-dd};
}

// ----- the rig: channel values -> joint positions (fighter frame) -----
const SCALAR=['ffx','ffy','bfx','bfy','px','py','lean','bend','head','w'];
const VEC=['h','o'];                       // weapon hand and off hand, measured from the shoulder
function torso(p){
  const a1=rad(p.lean),a2=rad(p.lean+p.bend),a3=rad(p.lean+p.bend+p.head);
  const P=[p.px,p.py],M=[P[0]+Math.sin(a1)*DIM.spine,P[1]+Math.cos(a1)*DIM.spine];
  const S=[M[0]+Math.sin(a2)*DIM.spine,M[1]+Math.cos(a2)*DIM.spine];
  return {P,M,S,Hd:[S[0]+Math.sin(a3)*DIM.neck,S[1]+Math.cos(a3)*DIM.neck]};
}
function solve(p,wlen){
  const t=torso(p),S=t.S;
  const fl=ik(t.P,[p.ffx,Math.max(0,p.ffy)],DIM.thigh,DIM.shin,-1),bl=ik(t.P,[p.bfx,Math.max(0,p.bfy)],DIM.thigh,DIM.shin,-1);
  const wa=ik(S,[S[0]+p.h[0],S[1]+p.h[1]],DIM.upper,DIM.fore,1),oa=ik(S,[S[0]+p.o[0],S[1]+p.o[1]],DIM.upper,DIM.fore,1);
  // The weapon is gripped, not hinged: its angle is the forearm's angle plus the turn of the wrist (wr).
  // Between keys the blade therefore rides with the forearm; it can only swing as far as a wrist can turn.
  const Hn=wa.end,fore=deg(Math.atan2(Hn[1]-wa.mid[1],Hn[0]-wa.mid[0])),w=p.wr==null?p.w:fore+p.wr;
  const tip=[Hn[0]+Math.cos(rad(w))*wlen,Hn[1]+Math.sin(rad(w))*wlen];
  return {P:t.P,M:t.M,S,Hd:t.Hd,K:fl.mid,F:fl.end,bK:bl.mid,bF:bl.end,E:wa.mid,Hn,oE:oa.mid,oHn:oa.end,tip,
    w,grip:norm(w-fore),over:{ff:fl.over,bf:bl.over,h:wa.over,o:oa.over}};
}

// ----- tracks: one list of keys per channel -----
function Track(start){
  this.ch={};
  for(const c of SCALAR)this.ch[c]=[{t:-1e9,v:start[c],e:'lin'}];
  for(const c of VEC)this.ch[c]=[{t:-1e9,v:start[c].slice(),e:'lin'}];
}
Track.prototype.set=function(c,t,v,e,arc){
  const ks=this.ch[c],k={t,v:Array.isArray(v)?v.slice():v,e:e||'io',arc:arc||false};
  let i=ks.length;while(i>0&&ks[i-1].t>t)i--;
  if(i>0&&ks[i-1].t===t)ks[i-1]=k;else ks.splice(i,0,k);
};
Track.prototype.val=function(c,t){
  const ks=this.ch[c];let i=ks.length-1;while(i>0&&ks[i].t>t)i--;
  const a=ks[i],b=ks[i+1];if(!b||t<=a.t)return Array.isArray(a.v)?a.v.slice():a.v;
  const u=EASE[b.e]((t-a.t)/(b.t-a.t));
  if(!Array.isArray(a.v))return a.v+(b.v-a.v)*u;
  if(b.arc){
    // a swing: the hand travels around the shoulder, so it keeps its distance instead of cutting the corner
    const ra=Math.hypot(a.v[0],a.v[1]),rb=Math.hypot(b.v[0],b.v[1]);
    if(ra>2&&rb>2){
      const ta=Math.atan2(a.v[1],a.v[0]);let d=Math.atan2(b.v[1],b.v[0])-ta;
      if(b.arc!=='long'){while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;}
      const r=ra+(rb-ra)*u,th=ta+d*u;return [Math.cos(th)*r,Math.sin(th)*r];
    }
  }
  return [a.v[0]+(b.v[0]-a.v[0])*u,a.v[1]+(b.v[1]-a.v[1])*u];
};
Track.prototype.pose=function(t){
  const p={};for(const c of SCALAR)p[c]=this.val(c,t);for(const c of VEC)p[c]=this.val(c,t);
  if(this.ch.wr)p.wr=this.val('wr',t);return p;
};
Track.prototype.end=function(){let m=0;for(const c in this.ch)for(const k of this.ch[c])if(k.t>m)m=k.t;return m;};

// ----- a fighter being written: keys, steps and aiming -----
function Fig(id,hx,face,weapon,start){
  this.id=id;this.hx=hx;this.face=face;this.weapon=weapon;this.tr=new Track(start);this.notes=[];
}
// key some parts at time t. vals may use p:[x,y], ff:[x,y], bf:[x,y] as short forms. opts.arc: the hands swing.
Fig.prototype.k=function(t,vals,ease,opts){
  const arc=opts&&opts.arc;
  for(const c in vals){
    const v=vals[c];
    if(c==='p'){this.tr.set('px',t,v[0],ease);this.tr.set('py',t,v[1],ease);}
    else if(c==='ff'||c==='bf'){this.tr.set(c+'x',t,v[0],ease);this.tr.set(c+'y',t,v[1],ease);}
    else this.tr.set(c,t,v,ease,VEC.includes(c)?arc:false);
  }
  return this;
};
// keep parts exactly where they are until t (so the next key starts moving from t, not from the last key)
Fig.prototype.hold=function(t,chans){
  for(const c of chans){
    if(c==='p'){this.hold(t,['px','py']);continue;}
    this.tr.set(c,t,this.tr.val(c,t),'lin');
  }
  return this;
};
// A step: the foot leaves the floor at t0 and is planted at x by t1. Between steps a foot never moves.
Fig.prototype.step=function(foot,t0,t1,x,lift){
  const tr=this.tr,cx=foot+'x',cy=foot+'y',tm=t0+(t1-t0)*.45;
  tr.set(cx,t0,tr.val(cx,t0),'lin');tr.set(cy,t0,0,'lin');
  tr.set(cx,t1,x,'io');tr.set(cy,tm,lift==null?10:lift,'out');tr.set(cy,t1,0,'in');
  return this;
};
Fig.prototype.pose=function(t){return this.tr.pose(t);};
// Once a sequence is written, turn every blade key into a wrist key: the blade angle asked for at that moment, measured
// from where the forearm is at that moment. Contacts stay exactly where they were aimed; in between, the weapon moves
// with the arm that holds it.
Fig.prototype.grip=function(){
  const tr=this.tr,keys=tr.ch.w.map(k=>({t:k.t,e:k.e,w:k.v}));
  delete tr.ch.wr;
  const out=keys.map(k=>{const t=Math.max(k.t,0),p=tr.pose(t);p.w=k.w;const j=solve(p,this.weapon.len);return {t:k.t,v:j.grip,e:k.e};});
  tr.ch.wr=out;
};
Fig.prototype.joints=function(t){return solve(this.tr.pose(t),this.weapon.len);};
Fig.prototype.W=function(p){return [this.hx+this.face*p[0],p[1]];};
Fig.prototype.L=function(w){return [this.face*(w[0]-this.hx),w[1]];};
// Put the weapon hand where the blade, held at angle w, has the point `along` its length on a world point.
// The body keys for time t must be written first: the hand is solved from where the shoulder will be.
Fig.prototype.aim=function(t,world,w,along,ease,opts){
  const S=torso(this.tr.pose(t)).S,T=this.L(world);
  let h=[T[0]-Math.cos(rad(w))*along-S[0],T[1]-Math.sin(rad(w))*along-S[1]];
  const r=Math.hypot(h[0],h[1]);
  if(r>ARM-1){this.notes.push({t,what:'reach',short:+(r-ARM+1).toFixed(1)});h=[h[0]*(ARM-1)/r,h[1]*(ARM-1)/r];}
  this.k(t,{h,w},ease,opts);return this;
};
// Key the weapon hand at h (from the shoulder) with the wrist turned r degrees from the forearm.
Fig.prototype.kg=function(t,h,r,ease,opts){
  const S=torso(this.tr.pose(t)).S,a=ik(S,[S[0]+h[0],S[1]+h[1]],DIM.upper,DIM.fore,1);
  const fore=deg(Math.atan2(a.end[1]-a.mid[1],a.end[0]-a.mid[0]));
  this.k(t,{h},ease,opts);this.tr.set('w',t,fore+r,(opts&&opts.wease)||ease);return this;
};
// Like aim, but the blade angle is not chosen freely: it is whatever the arm gives with the wrist turned r degrees.
// A blow lands with the weapon nearly in line with the forearm (r near 0); a parry holds it across (r large).
Fig.prototype.aimGrip=function(t,world,r,along,ease,opts){
  const S=torso(this.tr.pose(t)).S,T=this.L(world);
  // try every blade angle near the line to the target; keep the one whose wrist turn is closest to r with the hand in reach
  const w0=deg(Math.atan2(T[1]-S[1],T[0]-S[0]));let best=null;
  for(let w=w0-90;w<=w0+90;w+=.25){
    const h=[T[0]-Math.cos(rad(w))*along-S[0],T[1]-Math.sin(rad(w))*along-S[1]];
    if(Math.hypot(h[0],h[1])>ARM-1)continue;
    const a=ik(S,[S[0]+h[0],S[1]+h[1]],DIM.upper,DIM.fore,1);
    const err=Math.abs(norm(deg(Math.atan2(a.end[1]-a.mid[1],a.end[0]-a.mid[0]))+r-w));
    if(!best||err<best.err)best={err,w,h};
  }
  if(!best){this.notes.push({t,what:'reach',short:1});return this.aim(t,world,w0,along,ease,opts);}
  const w=best.w,h=best.h;
  this.k(t,{h},ease,opts);this.tr.set('w',t,w,(opts&&opts.wease)||ease);return this;
};
// the off hand toward a world point (as far as the arm goes)
Fig.prototype.reach=function(t,world,ease,opts){
  const S=torso(this.tr.pose(t)).S,T=this.L(world);
  let o=[T[0]-S[0],T[1]-S[1]];const r=Math.hypot(o[0],o[1]);
  if(r>ARM-2)o=[o[0]*(ARM-2)/r,o[1]*(ARM-2)/r];
  this.k(t,{o},ease,opts);return this;
};
// world position of a named point at time t: a joint, 'chest', 'abdomen', or a point along the blade
Fig.prototype.at=function(t,name,along){
  const j=this.joints(t);let p;
  if(name==='chest')p=[(j.M[0]+j.S[0])/2,(j.M[1]+j.S[1])/2];
  else if(name==='abdomen')p=[(j.M[0]+j.P[0])/2,(j.M[1]+j.P[1])/2];
  else if(name==='blade')p=[j.Hn[0]+Math.cos(rad(j.w))*along,j.Hn[1]+Math.sin(rad(j.w))*along];
  else p=j[name];
  return this.W(p);
};

// ----- stances: how each weapon stands when nothing is happening -----
// Sword: side on, knees bent, weight a little back, the point up at the opponent's face, the empty hand low in front.
const SWORD_GUARD={ffx:30,ffy:0,bfx:-34,bfy:0,px:-4,py:79,lean:5,bend:4,head:-6,h:[27,-31],w:44,o:[15,-42]};
// Dagger: lower and more square, blade forward at chest height, the empty hand up as a second guard.
const DAGGER_GUARD={ffx:26,ffy:0,bfx:-30,bfy:0,px:-3,py:73,lean:11,bend:9,head:-14,h:[35,-13],w:34,o:[19,-25]};
const WEAPONS={sword:{key:'sword',len:92,name:'Broadsword'},dagger:{key:'dagger',len:50,name:'Dagger'}};
// The measure: a sword reaches with one lunge; a dagger has to step in first.
const SPACING=206,CENTRE=600;
const ALL=['p','lean','bend','head','h','w','o'];
function pair(){
  return {a:new Fig('a',CENTRE-SPACING/2,1,WEAPONS.sword,SWORD_GUARD),b:new Fig('b',CENTRE+SPACING/2,-1,WEAPONS.dagger,DAGGER_GUARD)};
}
// How each fighter stands after an exchange. Never the guard it began in: a fight does not pass through one neutral pose.
const SWORD_HURT={ffx:30,ffy:0,bfx:-34,bfy:0,px:-3,py:74,lean:6,bend:13,head:-12,h:[21,-27],w:60,o:[30,-25]};
const SWORD_POINT={ffx:30,ffy:0,bfx:-34,bfy:0,px:-5,py:81,lean:3,bend:3,head:-4,h:[36,-21],w:17,o:[13,-44]};
const SWORD_SHOULDER={ffx:30,ffy:0,bfx:-34,bfy:0,px:-5,py:80,lean:3,bend:1,head:-3,h:[24,8],w:108,o:[24,-30]};
const SWORD_LOW={ffx:30,ffy:0,bfx:-34,bfy:0,px:-4,py:85,lean:2,bend:2,head:-10,h:[14,-52],w:-47,o:[6,-50]};
const DAGGER_OUT={ffx:27,ffy:0,bfx:-30,bfy:0,px:-1,py:74,lean:9,bend:8,head:-12,h:[22,-27],w:27,o:[37,-7]};
const DAGGER_HURT={ffx:26,ffy:0,bfx:-32,bfy:0,px:-5,py:71,lean:12,bend:15,head:-17,h:[28,-23],w:41,o:[26,-30]};

// ===========================================================================
// Phrases. Each one writes keys relative to a contact time, starting from the
// pose the fighter is in (its first keys hold that pose).
// ===========================================================================

// A cut from the shoulder with a lunge. No big wind-up: the hand comes up beside the shoulder, the hips go, and the
// blade is the last thing to arrive.
//   prepare  tc-520 .. tc-300   weight settles back, the hand rises to the shoulder, the empty hand comes up in front
//   drive    tc-300 .. tc-70    the front foot steps out and the hips follow it; the chest is still turned back
//   strike   tc-150 .. tc       shoulder, then arm, then blade; the empty arm is thrown back as a counterweight
// The caller writes where the blade is at tc (it depends on what the cut meets). short: the lunge falls short.
function swordCut(A,tc,opt){
  const d=-((opt&&opt.short)||0);
  A.hold(tc-520,ALL);
  A.k(tc-300,{p:[-10,76],lean:1,bend:-4,head:0},'io');
  A.kg(tc-300,[24,8],20,'io',{arc:true}).k(tc-300,{o:[27,-23]},'io',{arc:true});
  A.step('ff',tc-290,tc-85,78+d,8);
  A.k(tc-180,{p:[11+d*.3,74]},'in').k(tc-70,{p:[28+d*.8,65]},'lin').k(tc-10,{p:[31+d,62]},'out');
  A.k(tc-150,{lean:7,bend:-7,head:-4},'io').k(tc-10,{lean:20,bend:6,head:-19},'io');
  // the hand stays by the shoulder while the hips go, and the wrist cocks: the blade is left behind
  A.kg(tc-150,[21,12],34,'io',{arc:true});
  A.k(tc-150,{o:[23,-27]},'io',{arc:true}).k(tc,{o:[-27,-45]},'in',{arc:true});
}
// The lunge is taken back: the front foot returns and the weight settles into a guard. Returns when it is done.
function swordRecover(A,t0,guard){
  A.hold(t0,['p','lean','bend','head']);A.step('ff',t0,t0+210,guard.ffx,6);
  A.k(t0+230,{p:[guard.px+4,guard.py-3]},'io').k(t0+340,{p:[guard.px,guard.py],lean:guard.lean,bend:guard.bend,head:guard.head},'io');
  return t0+340;
}
// The dagger reads the cut and meets it in front of the head. Returns the meeting point.
function daggerParry(A,B,tc){
  B.hold(tc-330,ALL);
  B.k(tc-190,{p:[-8,70],lean:13,bend:10},'io').k(tc-190,{h:[29,-17],w:48,o:[21,-20]},'io',{arc:true});
  B.k(tc-25,{p:[3,76],lean:5,bend:1,head:-4},'out').k(tc-25,{o:[22,-2]},'out',{arc:true});
  const hd=B.at(tc-25,'Hd'),C=[hd[0]-48,hd[1]+14];
  B.hold(tc-170,['h','w']);B.aim(tc-25,C,104,15,'out3',{arc:true});
  A.aimGrip(tc,C,10,60,'in',{arc:true,wease:'in3'});
  B.hold(tc,['p','lean','bend','head','h','w']);
  return C;
}
// The cut is parried: both arrive at the meeting point and the weight of the blow is taken. Ends in the bind.
function cutParried(A,B,tc){
  swordCut(A,tc);
  const C=daggerParry(A,B,tc);
  B.k(tc+90,{p:[0,71],lean:8,bend:4,head:-8},'out');
  A.k(tc+90,{p:[32,62],lean:22,bend:7,head:-20},'out');A.hold(tc+90,['h','w','o']);
  return {C,te:tc+90};
}
// From the bind: the empty hand goes up under the sword wrist and keeps the blade overhead, the body steps in beneath
// it, the dagger drops to the hip and goes straight to the body. The route is under the sword arm and clear.
function daggerCounter(A,B,t0){
  const t1=t0+200,t2=t0+330;
  A.hold(t0,ALL);B.hold(t0,ALL);
  const wrist=t=>{const j=A.joints(t),w=[j.Hn[0]+(j.E[0]-j.Hn[0])*.3,j.Hn[1]+(j.E[1]-j.Hn[1])*.3-5];return A.W(w);};
  B.step('ff',t0+20,t0+170,56,6);
  B.k(t1,{p:[28,65],lean:25,bend:10,head:-25},'io');
  // A is still pressing down; the wrist is caught and lifted
  const hA=A.tr.val('h',t0);
  A.k(t1,{p:[33,63],lean:19,bend:5,head:-17},'io').kg(t1,[hA[0]-5,hA[1]+8],12,'io',{arc:true});
  B.reach(t1,wrist(t1),'io',{arc:true});
  B.kg(t1,[5,-35],18,'io',{arc:true});
  B.step('bf',t0+175,t0+300,-4,4);
  A.k(t2,{p:[33,63],lean:18,bend:5,head:-16},'lin');A.hold(t2,['h','w']);
  B.k(t2,{p:[37,64],lean:30,bend:6,head:-28},'out');B.reach(t2,wrist(t2),'lin');
  const ab=A.at(t2,'abdomen'),T=[ab[0]+4,ab[1]+3];
  B.aimGrip(t2,T,0,50,'in');
  return {t2,T};
}
// Stabbed in the body: the middle folds over the wound, the lunge is snatched back, the sword arm tears free and is
// carried up and back with the body. The dagger comes out along the line it went in. Ends with both still close.
function stabReaction(A,B,t2){
  A.k(t2+110,{lean:7,bend:23,head:5},'out3').k(t2+110,{p:[23,64]},'out');
  A.step('ff',t2+90,t2+300,30,6);
  A.k(t2+320,{p:[-6,71],lean:3,bend:17,head:-9},'io');
  A.kg(t2+150,[22,15],26,'out',{arc:true}).kg(t2+320,[24,6],22,'io',{arc:true});
  A.k(t2+140,{o:[22,-36]},'out',{arc:true}).k(t2+320,{o:[30,-26]},'io',{arc:true});
  B.k(t2+80,{p:[38,63]},'out');
  B.kg(t2+260,[13,-31],16,'io').k(t2+260,{p:[30,67],lean:19,bend:7,head:-17},'io');
  B.k(t2+130,{o:[30,-2]},'io',{arc:true}).k(t2+280,{o:[36,-8]},'io',{arc:true});
  return t2+330;
}
// The dagger steps back out to the measure behind the empty hand.
function daggerOut(B,t0){
  B.hold(t0,ALL);
  B.step('bf',t0+10,t0+170,DAGGER_OUT.bfx,5);B.step('ff',t0+185,t0+360,DAGGER_OUT.ffx,6);
  B.k(t0+180,{p:[16,70]},'io').k(t0+380,{p:[DAGGER_OUT.px,DAGGER_OUT.py],lean:9,bend:8,head:-12},'io');
  B.k(t0+380,{h:DAGGER_OUT.h,w:DAGGER_OUT.w,o:DAGGER_OUT.o},'io',{arc:true});
  return t0+380;
}
// The cut lands: a parry that starts late and is beaten. Returns the struck point.
function cutLands(A,B,tc){
  swordCut(A,tc);
  B.hold(tc-200,ALL);
  B.k(tc,{p:[0,73],lean:9,bend:5,head:-8},'io');
  B.hold(tc-140,['h','w','o']);B.k(tc,{h:[30,-2],w:80,o:[23,-6]},'out',{arc:true});
  const ch=B.at(tc,'chest'),T=[ch[0]-2,ch[1]+9];
  A.aimGrip(tc,T,4,88,'in',{arc:true,wease:'in3'});
  // the cut is drawn down and through, not stopped dead
  A.k(tc+170,{p:[32,62],lean:24,bend:8,head:-22},'out').kg(tc+170,[13,-37],8,'out',{arc:true});
  A.k(tc+170,{o:[-22,-48]},'out',{arc:true});
  return T;
}
// Cut across the chest and still standing: the chest is driven back and down, the head follows late, the rear foot
// catches the weight, and the stance is gathered again, closed over the hurt.
function hitReaction(B,tc){
  B.k(tc+110,{lean:-11,bend:17,head:19},'out3').k(tc+130,{p:[-15,66]},'out3');
  B.kg(tc+130,[30,-30],20,'out',{arc:true}).k(tc+130,{o:[27,-22]},'out',{arc:true});
  B.step('bf',tc+70,tc+250,-58,5);
  B.k(tc+290,{p:[-24,65],lean:-3,bend:21,head:4},'io').k(tc+330,{o:[22,-34]},'io',{arc:true});
  B.step('bf',tc+470,tc+690,DAGGER_HURT.bfx,5);
  B.k(tc+720,{p:[DAGGER_HURT.px,DAGGER_HURT.py],lean:12,bend:15,head:-17},'io');
  B.k(tc+720,{h:DAGGER_HURT.h,w:DAGGER_HURT.w},'io',{arc:true}).k(tc+720,{o:DAGGER_HURT.o},'io',{arc:true});
  return tc+720;
}
// After a landed cut the sword is taken back with the lunge and carried to a guard.
function swordAway(A,t0,guard){
  A.hold(t0,['h','w','o']);
  const tr=swordRecover(A,t0,guard);
  A.k(tr,{h:guard.h,w:guard.w},'io',{arc:true}).k(tr,{o:guard.o},'io',{arc:true});
  return tr;
}

// ===========================================================================
// Sequences
// ===========================================================================
function finish(seq,F){
  F.a.grip();F.b.grip();
  seq.fighters={a:F.a,b:F.b};
  seq.dur=Math.max(F.a.tr.end(),F.b.tr.end())+(seq.tail==null?400:seq.tail);
  seq.notes=[...F.a.notes.map(n=>({who:'a',...n})),...F.b.notes.map(n=>({who:'b',...n}))];
  seq.exchanges=seq.exchanges||[];
  return seq;
}
const CUT_MARKS=(tc,first)=>[
  ...(first?[{t:0,who:'both',label:'On guard'}]:[]),
  {t:tc-520,who:'a',label:'Prepare: the weight settles back and the hand comes up to the shoulder'},
  {t:tc-300,who:'a',label:'Drive: the front foot steps out and the hips follow; the blade is left behind'},
  {t:tc-150,who:'a',label:'Strike: shoulder, then arm, then blade'}];
const PARRY_MARKS=tc=>[{t:tc,who:'b',label:'Contact: the dagger stops the cut; knees and elbow take its weight'}];
const COUNTER_MARKS=(t0,t2)=>[
  {t:t0+1,who:'b',label:'Counter: the empty hand goes up under the sword wrist and the body steps in beneath the blade'},
  {t:t0+200,who:'b',label:'Thrust: from the hip in a straight line, under the sword arm'},
  {t:t2,who:'a',label:'Reaction: the middle folds over the wound, the lunge is snatched back, the sword arm tears free'}];

// 1. Three exchanges that run into each other, with the attacker changing and two decision pauses.
function seqBout(){
  const F=pair(),A=F.a,B=F.b,tc=640;
  const one=cutParried(A,B,tc);                       // exchange 1: the sword attacks, the dagger parries
  const two=daggerCounter(A,B,one.te),te2=stabReaction(A,B,two.t2);   // exchange 2: the dagger attacks and lands
  const tb=daggerOut(B,te2),tc3=te2+60+520;           // exchange 3: the dagger steps out as the sword comes again
  const T=cutLands(A,B,tc3);hitReaction(B,tc3);swordAway(A,tc3+330,SWORD_POINT);
  return finish({id:'bout',title:'Three exchanges, one fight',
    stops:[{t:tc,d:70},{t:two.t2,d:80},{t:tc3,d:90}],
    exchanges:[{t0:0,t1:one.te,attacker:'a',result:'parried'},{t0:one.te,t1:te2,attacker:'b',result:'hit'},{t0:te2,t1:tc3+1060,attacker:'a',result:'hit'}],
    pauses:[{t:one.te,label:'The sword\'s attack is resolved: parried. The dagger\'s player now decides what to do, with the blades still crossed.'},
      {t:te2,label:'The dagger\'s attack is resolved: a wound. The sword\'s player decides next. Nobody has gone back to a guard.'}],
    fx:[{t:tc,kind:'clash',at:one.C},{t:two.t2,kind:'wound',at:two.T},{t:tc3,kind:'wound',at:T}],
    checks:[{t:tc,who:'a',along:60,at:one.C},{t:tc,who:'b',along:15,at:one.C},{t:two.t2,who:'b',along:50,at:two.T},{t:tc3,who:'a',along:88,at:T}],
    clear:[{t0:one.te,t1:two.t2+200}],
    wounds:[{t:two.t2,who:'a',part:'abdomen',level:'minor'},{t:tc3,who:'b',part:'chest',level:'serious'}],
    marks:[...CUT_MARKS(tc,true),...PARRY_MARKS(tc),...COUNTER_MARKS(one.te,two.t2),
      {t:te2+1,who:'b',label:'The dagger steps back out to measure while the sword, hurt, is already coming again'},
      ...CUT_MARKS(tc3).slice(1),
      {t:tc3,who:'b',label:'Contact: the cut comes over a late parry and lands'},
      {t:tc3+1,who:'b',label:'Reaction: chest back and down, the rear foot catching the weight'},
      {t:tc3+330,who:'both',label:'Recovery: the lunge is taken back; the wounded fighter regathers'}]},F);
}

// 2. Attack, parry, counterattack, reaction, recovery.
function seqExchange(){
  const F=pair(),A=F.a,B=F.b,tc=640;
  const one=cutParried(A,B,tc),two=daggerCounter(A,B,one.te),te=stabReaction(A,B,two.t2);
  daggerOut(B,te);
  A.hold(te,ALL);A.k(te+380,{p:[SWORD_HURT.px,SWORD_HURT.py],lean:6,bend:13,head:-12},'io');
  A.k(te+380,{h:SWORD_HURT.h,w:SWORD_HURT.w,o:SWORD_HURT.o},'io',{arc:true});
  return finish({id:'exchange',title:'Attack, parry, counterattack, reaction, recovery',
    stops:[{t:tc,d:70},{t:two.t2,d:80}],
    pauses:[{t:one.te,label:'The attack is resolved. The next decision is made here, with the blades still crossed.'}],
    fx:[{t:tc,kind:'clash',at:one.C},{t:two.t2,kind:'wound',at:two.T}],
    checks:[{t:tc,who:'a',along:60,at:one.C},{t:tc,who:'b',along:15,at:one.C},{t:two.t2,who:'b',along:50,at:two.T}],
    clear:[{t0:one.te,t1:two.t2+200}],
    wounds:[{t:two.t2,who:'a',part:'abdomen',level:'minor'}],
    marks:[...CUT_MARKS(tc,true),...PARRY_MARKS(tc),...COUNTER_MARKS(one.te,two.t2),
      {t:te,who:'both',label:'Recovery: the dagger steps out to measure; the sword settles, closed over the wound'}]},F);
}

// 3. A miss: nothing stops the blade, so the body has to catch itself with a step.
function seqMiss(){
  const F=pair(),A=F.a,B=F.b,tc=640;
  swordCut(A,tc,{short:44});
  A.kg(tc,[53,4],2,'in',{arc:true,wease:'in3'});
  // follow-through: the cut runs on down in front; the weight overruns the front foot and the rear foot comes up to catch it
  A.kg(tc+110,[40,-29],-2,'lin',{arc:true}).kg(tc+230,[27,-41],-8,'out',{arc:true});
  A.k(tc+110,{p:[-3,66],lean:25,bend:10,head:-26},'out');
  A.step('bf',tc+60,tc+240,-27,5);
  A.k(tc+250,{p:[4,72],lean:17,bend:8,head:-18},'io');
  A.k(tc+230,{o:[-20,-50]},'io',{arc:true});
  // recovery: back out one foot at a time, the point lifted to the shoulder
  A.step('bf',tc+340,tc+520,SWORD_SHOULDER.bfx,5);A.step('ff',tc+540,tc+730,SWORD_SHOULDER.ffx,6);
  A.hold(tc+340,['p']);A.k(tc+530,{p:[-2,75]},'io').k(tc+760,{p:[SWORD_SHOULDER.px,SWORD_SHOULDER.py],lean:3,bend:1,head:-3},'io');
  A.hold(tc+340,['h','w','o']);A.kg(tc+560,[30,-12],30,'io',{arc:true}).kg(tc+760,SWORD_SHOULDER.h,20,'io',{arc:true});
  A.k(tc+760,{o:SWORD_SHOULDER.o},'io',{arc:true});
  // B: no parry was needed. The guard tightens and the weight settles back; no step, no dodge.
  B.hold(tc-330,ALL);
  B.k(tc-150,{p:[-8,70],lean:10,bend:9},'io').k(tc-150,{h:[23,-13],w:62,o:[19,-8]},'io',{arc:true});
  B.k(tc,{p:[-17,70],lean:2,bend:8,head:-8},'io');
  B.k(tc+520,{p:[DAGGER_OUT.px,DAGGER_OUT.py],lean:9,bend:8,head:-12},'io');
  B.k(tc+300,{h:[23,-13],w:62,o:[19,-8]},'lin').k(tc+620,{h:DAGGER_OUT.h,w:DAGGER_OUT.w,o:DAGGER_OUT.o},'io',{arc:true});
  return finish({id:'miss',title:'A miss with its follow-through',
    stops:[],pauses:[{t:tc+255,label:'The miss is resolved. The sword is spent low; the rear foot has come up under the body.'}],
    fx:[],wounds:[],checks:[],
    marks:[...CUT_MARKS(tc,true),
      {t:tc,who:'a',label:'Miss: the cut falls short and nothing stops it'},
      {t:tc+1,who:'a',label:'Follow-through: the weight overruns the front foot and the rear foot steps up to catch it'},
      {t:tc+340,who:'a',label:'Recovery: back out one foot at a time, the point lifted to the shoulder'}]},F);
}

// 4. A damaging hit and the body's answer to it.
function seqHit(){
  const F=pair(),A=F.a,B=F.b,tc=640;
  const T=cutLands(A,B,tc);hitReaction(B,tc);swordAway(A,tc+330,SWORD_POINT);
  return finish({id:'hit',title:'A damaging hit and the reaction to it',
    stops:[{t:tc,d:90}],pauses:[],
    fx:[{t:tc,kind:'wound',at:T}],wounds:[{t:tc,who:'b',part:'chest',level:'serious'}],checks:[{t:tc,who:'a',along:88,at:T}],
    marks:[...CUT_MARKS(tc,true),
      {t:tc,who:'b',label:'Contact: the cut comes over a late parry and lands'},
      {t:tc+1,who:'b',label:'Reaction: chest back and down, the head a beat behind, the rear foot catching the weight'},
      {t:tc+330,who:'both',label:'Recovery: the lunge is taken back to a point guard; the wounded fighter regathers, closed over the hurt'}]},F);
}

// 5. Press Advantage: the cut is parried, but the attacker stays on the blade and keeps the point in the face.
function seqPress(){
  const F=pair(),A=F.a,B=F.b,tc=640,th=tc+320,beat=430,n=2,tr0=th+n*beat+80;
  const one=cutParried(A,B,tc);
  // A does not let the blade go: the rear foot comes up under the body and the point goes over the dagger to the face
  A.step('bf',tc+100,tc+280,6,5);
  const press=(t,push,ease)=>{
    A.k(t,{p:[45+push,72],lean:12+push*.4,bend:4,head:-13},ease);
    B.k(t,{p:[-8-push*.5,70],lean:1-push*.5,bend:7,head:-4},ease);
    A.kg(t,[44+push*.6,-5],2,ease,{arc:true});
    B.aim(t,A.at(t,'blade',84),101,13,ease);B.k(t,{o:[17,9]},ease,{arc:true});
    A.k(t,{o:[-8,-52]},ease,{arc:true});
  };
  press(th,0,'io');
  for(let i=0;i<n;i++){press(th+i*beat+150,10,'out');press(th+i*beat+beat,0,'io');}
  // released when the effect ends: the rear foot goes back, the lunge is taken back, both return to measure
  A.step('bf',tr0,tr0+190,SWORD_POINT.bfx,5);A.k(tr0+200,{p:[32,64],lean:17},'io');
  swordAway(A,tr0+210,SWORD_POINT);
  B.hold(tr0+60,ALL);
  B.k(tr0+520,{p:[DAGGER_OUT.px,DAGGER_OUT.py],lean:9,bend:8,head:-12},'io');
  B.k(tr0+520,{h:DAGGER_OUT.h,w:DAGGER_OUT.w,o:DAGGER_OUT.o},'io',{arc:true});
  return finish({id:'press',title:'Press Advantage',
    stops:[{t:tc,d:70}],
    pauses:[{t:th,label:'Press Advantage is in force. While the engine says the defender cannot attack, the pair stays like this.'}],
    fx:[{t:tc,kind:'clash',at:one.C}],wounds:[],checks:[{t:tc,who:'a',along:60,at:one.C},{t:tc,who:'b',along:15,at:one.C}],
    marks:[...CUT_MARKS(tc,true),...PARRY_MARKS(tc),
      {t:tc+90,who:'a',label:'Press: the rear foot comes up and the point goes over the dagger to the face'},
      {t:th,who:'both',label:'Held: the point keeps threatening, the defender stays busy covering (no blow, no ground taken)'},
      {t:tr0,who:'both',label:'Released: when the effect ends, both go back to measure'}]},F);
}

// 6. A fight-ending injury: the same cut, and this time nothing holds the fighter up.
function seqFinish(){
  const F=pair(),A=F.a,B=F.b,tc=640;
  const T=cutLands(A,B,tc);
  // the chest goes back; the arms go slack at once
  B.k(tc+110,{lean:-12,bend:14,head:18},'out3').k(tc+120,{p:[-14,67]},'out3');
  B.kg(tc+170,[9,-54],6,'out',{arc:true}).k(tc+170,{o:[-2,-55]},'out',{arc:true});
  // the rear foot goes back to catch the weight ...
  B.step('bf',tc+80,tc+250,-62,5);
  B.k(tc+280,{p:[-36,61],lean:-7,bend:18,head:7},'io');
  // ... and the leg does not hold: the knee folds, the hips drop behind the foot and the front foot is dragged after them
  B.k(tc+450,{p:[-60,27],lean:-40,bend:16,head:16},'in');
  B.step('ff',tc+330,tc+470,0,3);
  B.kg(tc+300,[4,-56],6,'io',{arc:true}).k(tc+300,{o:[-8,-54]},'io',{arc:true});
  B.kg(tc+450,[36,-40],4,'in',{arc:true}).k(tc+450,{o:[28,-44]},'in',{arc:true});
  // seat, then back, then head; the arms land last
  B.kg(tc+560,[52,-25],4,'lin',{arc:true}).k(tc+560,{o:[50,-27]},'lin',{arc:true});
  B.k(tc+560,{p:[-72,9],lean:-66,bend:10,head:8},'lin').k(tc+620,{p:[-73,12]},'out').k(tc+700,{p:[-74,9]},'in');
  B.k(tc+760,{lean:-87,bend:3,head:-6},'in').k(tc+820,{lean:-85,bend:3},'out').k(tc+900,{lean:-87,bend:3,head:-3},'io');
  B.kg(tc+800,[59,3],4,'in',{arc:true}).k(tc+780,{o:[-58,3]},'in',{arc:'long'});
  B.hold(tc+700,['bfx']);B.k(tc+950,{bfx:-40},'io');
  // A: the lunge is taken back and the sword lowered. Watching, not celebrating.
  swordAway(A,tc+300,SWORD_LOW);
  return finish({id:'finish',title:'A fight-ending injury',
    stops:[{t:tc,d:110}],pauses:[],
    fx:[{t:tc,kind:'wound',at:T}],wounds:[{t:tc,who:'b',part:'chest',level:'major'}],checks:[{t:tc,who:'a',along:88,at:T}],
    marks:[...CUT_MARKS(tc,true),
      {t:tc,who:'b',label:'Contact: the cut lands'},
      {t:tc+1,who:'b',label:'The arms go slack; the rear foot goes back to catch the weight'},
      {t:tc+280,who:'b',label:'Collapse: the leg does not hold. The knee folds and the hips drop behind the foot'},
      {t:tc+560,who:'b',label:'Down: seat, back, head, and the arms last'},
      {t:tc+300,who:'a',label:'The winner takes the lunge back and lowers the sword (out of the fight is all the engine says)'}]},F);
}

const SEQUENCES={bout:seqBout,exchange:seqExchange,miss:seqMiss,hit:seqHit,press:seqPress,finish:seqFinish};

// ----- drawing: the same strokes and classes as the stage (pits-stage.css), as SVG markup -----
const GROUND=450;
function figureSvg(fig,j,wounds){
  const X=p=>(fig.hx+fig.face*p[0]).toFixed(1)+','+(GROUND-p[1]).toFixed(1);
  const cls=part=>'ps-part ps-w-'+((wounds&&wounds[part])||'none');
  const line=(a,b,w,c)=>'<polyline points="'+X(a)+' '+X(b)+'" stroke-width="'+w+'" class="'+c+'"/>';
  const bone=(a,b,c,w,k)=>'<polyline points="'+X(a)+' '+X(b)+' '+X(c)+'" stroke-width="'+w+'" class="'+k+'"/>';
  // the hand closes round the grip: a little of the hilt shows behind it, the guard sits just in front
  const d=[Math.cos(rad(j.w)),Math.sin(rad(j.w))],g=[j.Hn[0]+d[0]*8,j.Hn[1]+d[1]*8],pm=[j.Hn[0]-d[0]*8,j.Hn[1]-d[1]*8];
  const hc=X(j.Hd).split(',');
  return '<g class="ps-fig ps-'+(fig.id==='a'?'left':'right')+'"><g class="ps-back">'
    +bone(j.P,j.bK,j.bF,9,cls('lleg'))+bone(j.S,j.oE,j.oHn,8,cls('larm'))+'</g>'
    +line(j.M,j.P,12,cls('abdomen'))+line(j.S,j.M,12,cls('chest'))+bone(j.P,j.K,j.F,10,cls('rleg'))
    +'<circle cx="'+hc[0]+'" cy="'+hc[1]+'" r="'+DIM.headR+'" stroke-width="5" class="ps-head '+cls('head')+'"/>'
    +bone(j.S,j.E,j.Hn,8,cls('rarm'))
    +line(pm,j.tip,4,'ps-shaft')+line([g[0]-d[1]*9,g[1]+d[0]*9],[g[0]+d[1]*9,g[1]-d[0]*9],4,'ps-guard')+'</g>';
}
// everything a page needs to draw one moment of a sequence (sequence time t)
function frame(seq,t){
  const out={};
  for(const id of ['a','b']){
    const f=seq.fighters[id],wounds={};
    for(const w of seq.wounds||[])if(w.who===id&&t>=w.t)wounds[w.part]=w.level;
    out[id]={joints:f.joints(t),wounds,svg:''};out[id].svg=figureSvg(f,out[id].joints,wounds);
  }
  return out;
}
const api={DIM,EASE,ik,solve,torso,Track,Fig,GRIP,SWORD_GUARD,DAGGER_GUARD,WEAPONS,SPACING,CENTRE,SEQUENCES,LEG,ARM,
  // display time (with the impact holds) -> sequence time
  seqTime(seq,td){let t=td;for(const s of seq.stops||[]){if(t<=s.t)break;t=Math.max(s.t,t-s.d);}return t;},
  shownDur(seq){return seq.dur+(seq.stops||[]).reduce((n,s)=>n+s.d,0);},
  // sequence time -> display time (a pause point or a mark on the scrubber)
  shownAt(seq,t){let td=t;for(const s of seq.stops||[])if(t>s.t)td+=s.d;return td;},
  GROUND,figureSvg,frame,
  build(id){return (SEQUENCES[id]||SEQUENCES.bout)();}
};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.PitsMotion=api;
})(typeof window!=='undefined'?window:globalThis);
