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
  const ks=this.ch[c],k={t,v:Array.isArray(v)?v.slice():v,e:e||'io',arc:!!arc};
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
// Sword: side on, knees bent, weight a little back, the point up at the opponent's face, the empty hand back.
const SWORD_GUARD={ffx:30,ffy:0,bfx:-34,bfy:0,px:-4,py:79,lean:5,bend:4,head:-6,h:[27,-31],w:44,o:[-13,-31]};
// Dagger: lower and more square, blade forward at chest height, the empty hand up as a second guard.
const DAGGER_GUARD={ffx:26,ffy:0,bfx:-30,bfy:0,px:-3,py:73,lean:11,bend:9,head:-14,h:[35,-13],w:34,o:[19,-25]};
const WEAPONS={sword:{key:'sword',len:92,name:'Broadsword'},dagger:{key:'dagger',len:50,name:'Dagger'}};
const SPACING=300,CENTRE=600;
function pair(){
  return {a:new Fig('a',CENTRE-SPACING/2,1,WEAPONS.sword,SWORD_GUARD),b:new Fig('b',CENTRE+SPACING/2,-1,WEAPONS.dagger,DAGGER_GUARD)};
}

// ===========================================================================
// Phrases. Each one writes keys for one fighter, relative to a contact time tc.
// They start from whatever pose the fighter is in.
// ===========================================================================

// A descending cut: a short advance while the blade loads, then a passing step that carries the cut.
//   anticipation  tc-700 .. tc-400   the front foot creeps in, the weight stays back, the blade loads over the shoulder
//   drive         tc-400 .. tc-105   the rear leg pushes and passes forward; hips first, chest still open, hand left behind
//   strike        tc-175 .. tc       the foot lands, then the arm, then the blade whips through
// The caller writes where the blade is at tc (it depends on what the cut meets). short: the stride falls short (a miss).
function swordCut(A,tc,opt){
  const o=opt||{},adv=30,d=-(o.short||0),lead=30+adv,stride=140+adv+d;
  A.hold(tc-700,['p','lean','bend','head','h','w','o']);
  A.step('ff',tc-680,tc-470,lead,5);
  A.k(tc-400,{p:[6,73],lean:-5,bend:-7,head:8},'io');
  A.k(tc-400,{o:[27,-9]},'io',{arc:true}).kg(tc-400,[1,51],12,'io',{arc:true});
  A.step('bf',tc-385,tc-105,stride,15);
  A.k(tc-240,{p:[60+d*.3,71]},'in').k(tc-105,{p:[107+d*.8,65]},'lin').k(tc-10,{p:[124+d,61]},'out');
  A.k(tc-200,{lean:4,bend:-9,head:2},'io').k(tc-10,{lean:21,bend:7,head:-20},'io');
  // the hand stays back while the hips go (the elbow leads, the blade drags behind it)
  A.kg(tc-175,[-11,48],24,'io',{arc:true});
  A.k(tc-175,{o:[24,-4]},'io',{arc:true}).k(tc,{o:[-29,-17]},'in',{arc:true});
  return {tc,stride};
}
// Back out to the measure the engine says the fighters are at: the front foot passes back behind (the attack's step in
// reverse), then the other foot closes the stance. guard: the stance to end in. Returns when it is done.
function swordRetire(A,t0,guard){
  A.step('bf',t0,t0+340,guard.bfx,12);
  A.k(t0+150,{p:[(A.tr.val('px',t0)+guard.px)/2+22,68]},'in').k(t0+350,{p:[guard.px+18,guard.py-8]},'out');
  A.step('ff',t0+390,t0+580,guard.ffx,6);
  A.k(t0+620,{p:[guard.px,guard.py],lean:guard.lean,bend:guard.bend,head:guard.head},'io');
  return t0+620;
}
// The dagger reads the cut and meets it. Shared by every sequence where the cut is parried. Returns the meeting point.
function daggerParry(A,B,tc){
  B.hold(tc-430,['p','lean','bend','head','h','w','o']);
  B.k(tc-250,{p:[-8,69],lean:13,bend:10},'io').k(tc-250,{h:[29,-17],w:48,o:[21,-20]},'io',{arc:true});
  B.k(tc-25,{p:[5,76],lean:5,bend:1,head:-4},'out').k(tc-25,{o:[23,4]},'out',{arc:true});
  // where the blades meet: in front of and above B's head, on the line of the cut
  const hd=B.at(tc-25,'Hd'),C=[hd[0]-53,hd[1]+10];
  B.hold(tc-215,['h','w']);B.aim(tc-25,C,104,15,'out3',{arc:true});
  A.aimGrip(tc,C,8,62,'in',{arc:true,wease:'in3'});
  // contact: the cut is stopped; its weight goes into B's arm and knees
  B.hold(tc,['p','lean','bend','head','h','w']);B.k(tc+70,{p:[1,71],lean:7,bend:3},'out');
  return C;
}
// How each fighter stands after an exchange. Never the guard it began in: a fight does not pass through one neutral pose.
const SWORD_HURT={ffx:30,ffy:0,bfx:-34,bfy:0,px:-1,py:75,lean:9,bend:11,head:-13,h:[23,-35],w:52,o:[8,-21]};
const SWORD_POINT={ffx:30,ffy:0,bfx:-34,bfy:0,px:-5,py:81,lean:3,bend:3,head:-4,h:[36,-21],w:17,o:[-16,-28]};
const SWORD_HIGH={ffx:30,ffy:0,bfx:-34,bfy:0,px:-3,py:80,lean:3,bend:1,head:-3,h:[1,51],w:130,o:[18,-22]};
const SWORD_LOW={ffx:30,ffy:0,bfx:-34,bfy:0,px:-4,py:85,lean:2,bend:2,head:-10,h:[14,-52],w:-47,o:[-9,-44]};
const DAGGER_OUT={ffx:27,ffy:0,bfx:-30,bfy:0,px:-1,py:74,lean:9,bend:8,head:-12,h:[22,-27],w:27,o:[37,-7]};
const DAGGER_HURT={ffx:26,ffy:0,bfx:-32,bfy:0,px:-5,py:71,lean:12,bend:15,head:-17,h:[28,-23],w:41,o:[8,-17]};

// ===========================================================================
// Sequences
// ===========================================================================
function finish(seq,F){
  F.a.grip();F.b.grip();
  seq.fighters={a:F.a,b:F.b};
  seq.dur=Math.max(F.a.tr.end(),F.b.tr.end())+(seq.tail==null?400:seq.tail);
  seq.notes=[...F.a.notes.map(n=>({who:'a',...n})),...F.b.notes.map(n=>({who:'b',...n}))];
  return seq;
}
const CUT_MARKS=tc=>[
  {t:0,who:'both',label:'On guard'},
  {t:tc-700,who:'a',label:'Anticipation: the front foot creeps in, the weight stays back, the blade loads over the shoulder'},
  {t:tc-400,who:'a',label:'Drive: the rear leg pushes and passes; the hips lead and the blade is left behind'},
  {t:tc-175,who:'a',label:'Strike: the foot lands, then the arm, then the blade'}];

// 1. Attack, parry, counterattack, reaction, recovery (the reference sequence).
function seqExchange(){
  const F=pair(),A=F.a,B=F.b,tc=900,t2=tc+430;
  swordCut(A,tc);
  const C=daggerParry(A,B,tc);
  // --- the redirect: B turns the cut down and away for a moment; from there the sword's own weight carries it to the floor ---
  const hc=A.tr.val('h',tc);
  A.kg(tc+70,[hc[0]-16,hc[1]-40],-8,'out',{arc:true});
  B.k(tc+70,{h:[46,-27],w:36},'out',{arc:true});
  A.k(tc+200,{p:[129,59],lean:28,bend:9,head:-25},'out').kg(tc+200,[21,-47],-8,'out',{arc:true});
  A.k(tc+200,{o:[-33,-10]},'out',{arc:true});
  B.k(tc+200,{p:[4,72],lean:10,bend:5,head:-10},'io').k(tc+200,{h:[30,-6],w:52},'io',{arc:true});
  B.k(tc+200,{o:[30,-6]},'io',{arc:true});
  // === pause point: the attack is over. A is low and committed with the sword down; B is upright and free. ===
  // --- B enters: step in, gather, thrust. A is trying to get the sword back and has not. ---
  A.k(t2,{p:[119,64],lean:19,bend:6,head:-16},'io').kg(t2,[22,-45],-6,'io',{arc:true});
  A.k(t2,{o:[-22,-24]},'io',{arc:true});
  B.step('ff',tc+205,tc+345,58,8);
  B.k(tc+310,{p:[26,70],lean:15,bend:6},'in').k(tc+310,{h:[7,-33],w:14},'io',{arc:true});
  B.step('bf',tc+300,tc+420,-8,5);
  B.k(t2,{p:[43,66],lean:27,bend:3,head:-22},'out');
  B.reach(tc+310,A.at(tc+310,'Hn'),'io',{arc:true});B.reach(t2,[A.at(t2,'Hn')[0]+12,A.at(t2,'Hn')[1]+10],'lin');
  const chest=A.at(t2,'chest');
  B.hold(tc+310,['h','w']);B.aimGrip(t2,[chest[0]+5,chest[1]],0,50,'in');
  // --- A is struck in the chest: the chest goes back first, the head and hips follow, and the front leg passes back to catch the weight ---
  A.k(t2+110,{lean:-9,bend:-10,head:16},'out3').k(t2+340,{lean:3,bend:13,head:-3},'io');
  A.kg(t2+140,[19,-48],-4,'out',{arc:true}).k(t2+140,{o:[-30,-8]},'out',{arc:true});
  A.k(t2+90,{p:[113,67]},'out');
  const tr=swordRetire(A,t2+90,SWORD_HURT);
  // recovery: not the guard it started in. The point comes back up, the body stays closed over the wound.
  A.k(t2+520,{h:[20,-33],w:22},'io',{arc:true}).k(tr,{h:SWORD_HURT.h,w:SWORD_HURT.w},'io',{arc:true});
  A.k(t2+480,{o:[9,-20]},'io',{arc:true}).k(tr,{o:SWORD_HURT.o},'lin');
  // --- B takes the dagger back out along the line it went in, then steps out behind the empty hand ---
  B.k(t2+90,{p:[44,65]},'out');
  B.k(t2+280,{h:[15,-30],w:22},'io').k(t2+280,{lean:18,bend:6,head:-16},'io');
  B.step('bf',t2+230,t2+400,DAGGER_OUT.bfx,6);
  B.step('ff',t2+440,t2+640,DAGGER_OUT.ffx,7);
  B.k(t2+400,{p:[22,70]},'io').k(t2+690,{p:[DAGGER_OUT.px,DAGGER_OUT.py],lean:9,bend:8,head:-12},'io');
  B.k(t2+690,{h:DAGGER_OUT.h,w:DAGGER_OUT.w},'io',{arc:true}).k(t2+300,{o:[30,-14]},'io',{arc:true}).k(t2+690,{o:DAGGER_OUT.o},'io',{arc:true});
  return finish({id:'exchange',title:'Attack, parry, counterattack, reaction, recovery',
    stops:[{t:tc,d:70},{t:t2,d:80}],
    pauses:[{t:tc+200,label:'The attack is resolved. The next decision is made here, with both fighters held exactly like this.'}],
    fx:[{t:tc,kind:'clash',at:C},{t:t2,kind:'wound',at:chest}],
    checks:[{t:tc,who:'a',along:62,at:C},{t:tc,who:'b',along:15,at:C},{t:t2,who:'b',along:50,at:[chest[0]+5,chest[1]]}],
    wounds:[{t:t2,who:'a',part:'chest',level:'minor'}],
    marks:[...CUT_MARKS(tc),
      {t:tc,who:'b',label:'Contact: the dagger stops the cut; knees and elbow take its weight'},
      {t:tc+70,who:'b',label:'Redirect: turned down and away, the sword falls to the floor short of the body'},
      {t:tc+200,who:'b',label:'Counter: step in, gather; the empty hand goes to the sword arm'},
      {t:tc+310,who:'b',label:'Thrust: a straight line to the chest'},
      {t:t2,who:'a',label:'Reaction: the chest goes back first, then head and hips; the front leg passes back to catch the weight'},
      {t:t2+430,who:'both',label:'Recovery: both step out to measure and settle into new guards'}]},F);
}

// 2. A miss: nothing stops the blade, so it has to be carried round and brought back.
function seqMiss(){
  const F=pair(),A=F.a,B=F.b,tc=900;
  swordCut(A,tc,{short:78});
  A.kg(tc,[56,9],2,'in',{arc:true,wease:'in3'});
  // follow-through: the cut runs out low, short of the opponent; the body is carried forward over the front knee
  A.k(tc+120,{p:[54,60],lean:31,bend:12,head:-33},'out').k(tc+240,{p:[58,59],lean:33,bend:12,head:-34},'io');
  A.kg(tc+120,[43,-28],0,'lin',{arc:true});
  A.kg(tc+240,[36,-39],-11,'out',{arc:true});
  A.k(tc+200,{o:[-35,-4]},'out',{arc:true});
  // recovery: the point is lifted back up through the front and over the shoulder while the front foot passes back out
  const tr=swordRetire(A,tc+320,SWORD_HIGH);
  A.hold(tc+320,['h','w']);A.kg(tc+600,[34,4],38,'io',{arc:true}).kg(tr-40,SWORD_HIGH.h,14,'io',{arc:true});
  A.k(tc+560,{o:[-10,-34]},'io',{arc:true}).k(tr,{o:SWORD_HIGH.o},'io',{arc:true});
  // B: no parry was needed. The guard tightens and the weight settles back; no step, no dodge.
  B.hold(tc-430,['p','lean','bend','head','h','w','o']);
  B.k(tc-200,{p:[-8,70],lean:10,bend:9},'io').k(tc-200,{h:[23,-13],w:62,o:[19,-8]},'io',{arc:true});
  B.k(tc,{p:[-14,70],lean:5,bend:8,head:-10},'io');
  B.k(tc+520,{p:[DAGGER_OUT.px,DAGGER_OUT.py],lean:9,bend:8,head:-12},'io');
  B.k(tc+300,{h:[23,-13],w:62,o:[19,-8]},'lin').k(tc+620,{h:DAGGER_OUT.h,w:DAGGER_OUT.w,o:DAGGER_OUT.o},'io',{arc:true});
  return finish({id:'miss',title:'A miss with its follow-through',
    stops:[],pauses:[{t:tc+240,label:'The miss is resolved. The sword is spent low and the weight is over the front foot.'}],
    fx:[],wounds:[],checks:[],
    marks:[...CUT_MARKS(tc),
      {t:tc,who:'a',label:'Miss: the cut falls short and nothing stops it'},
      {t:tc+1,who:'a',label:'Follow-through: the cut runs out low and short; the body is carried forward with it'},
      {t:tc+320,who:'a',label:'Recovery: the point is lifted back up over the shoulder as the front foot passes back out'}]},F);
}

// The cut that lands (shared by the damaging hit and the fight-ending injury). Returns the struck point.
function cutLands(A,B,tc){
  swordCut(A,tc);
  // a parry that fails: the dagger starts up late and the cut comes over it
  B.hold(tc-430,['p','lean','bend','head','h','w','o']);
  B.k(tc-250,{p:[-8,69],lean:13,bend:10},'io').k(tc-250,{h:[29,-17],w:48,o:[21,-20]},'io',{arc:true});
  B.k(tc,{p:[0,73],lean:9,bend:5,head:-8},'io');
  B.hold(tc-150,['h','w','o']);B.k(tc,{h:[30,-2],w:80,o:[23,-6]},'out',{arc:true});
  const ch=B.at(tc,'chest'),T=[ch[0]-2,ch[1]+9];
  A.aimGrip(tc,T,4,88,'in',{arc:true,wease:'in3'});
  // the cut is drawn down and through, not stopped dead
  A.k(tc+170,{p:[127,60],lean:26,bend:8,head:-24},'out').kg(tc+170,[21,-45],-7,'out',{arc:true});
  return T;
}

// 3. A damaging hit and the body's answer to it.
function seqHit(){
  const F=pair(),A=F.a,B=F.b,tc=900;
  const T=cutLands(A,B,tc);
  const tr=swordRetire(A,tc+330,SWORD_POINT);
  A.hold(tc+330,['h','w']).k(tr,{h:SWORD_POINT.h,w:SWORD_POINT.w},'io',{arc:true});
  A.k(tc+330,{o:[-29,-17]},'lin').k(tr,{o:SWORD_POINT.o},'io',{arc:true});
  // B: the chest is driven back and down; the head follows late; the rear foot catches the weight; then the stance is regathered
  B.k(tc+110,{lean:-11,bend:17,head:19},'out3').k(tc+130,{p:[-15,66]},'out3');
  B.k(tc+130,{h:[31,-29],w:6},'out',{arc:true}).k(tc+130,{o:[25,-20]},'out',{arc:true});
  B.step('bf',tc+70,tc+250,-58,5);
  B.k(tc+290,{p:[-24,65],lean:-3,bend:21,head:4},'io').k(tc+330,{o:[9,-15]},'io',{arc:true});
  B.step('bf',tc+470,tc+690,DAGGER_HURT.bfx,5);
  B.k(tc+720,{p:[DAGGER_HURT.px,DAGGER_HURT.py],lean:12,bend:15,head:-17},'io');
  B.k(tc+720,{h:DAGGER_HURT.h,w:DAGGER_HURT.w},'io',{arc:true}).k(tc+720,{o:DAGGER_HURT.o},'io',{arc:true});
  return finish({id:'hit',title:'A damaging hit and the reaction to it',
    stops:[{t:tc,d:90}],pauses:[],
    fx:[{t:tc,kind:'wound',at:T}],wounds:[{t:tc,who:'b',part:'chest',level:'serious'}],checks:[{t:tc,who:'a',along:88,at:T}],
    marks:[...CUT_MARKS(tc),
      {t:tc,who:'b',label:'Contact: the cut comes over a late parry and lands'},
      {t:tc+1,who:'b',label:'Reaction: chest back and down, the head a beat behind, the rear foot catching the weight'},
      {t:tc+330,who:'both',label:'Recovery: the sword is drawn out and carried back to a point guard; the wounded fighter regathers, closed over the hurt'}]},F);
}

// 4. Press Advantage: the cut is parried, but the attacker stays on the blade and keeps the point in the face.
function seqPress(){
  const F=pair(),A=F.a,B=F.b,tc=900,th=tc+290,beat=430,n=2,tr0=th+n*beat+80;
  swordCut(A,tc);
  const C=daggerParry(A,B,tc);
  // A does not let the blade fall: the rear foot comes up under the body and the point goes over the dagger to the face
  A.step('ff',tc+90,tc+260,112,5);
  const press=(t,push,ease)=>{
    A.k(t,{p:[135+push,69],lean:13+push*.4,bend:4,head:-13},ease);
    B.k(t,{p:[-13-push*.5,68],lean:-1-push*.5,bend:7,head:-3},ease);
    // the arm is long and the blade in line with it, the point at the face
    A.kg(t,[53+push*.6,-8],2,ease,{arc:true});
    B.aim(t,A.at(t,'blade',70),101,13,ease);B.k(t,{o:[17,9]},ease,{arc:true});
    A.k(t,{o:[-24,-22]},ease,{arc:true});
  };
  press(th,0,'io');
  // held: the point keeps darting at the face and the dagger keeps answering it. No blow, no ground taken.
  for(let i=0;i<n;i++){press(th+i*beat+150,12,'out');press(th+i*beat+beat,0,'io');}
  // released when the effect ends: A passes back out, B comes forward into guard again
  A.step('ff',tr0,tr0+170,60,4);A.k(tr0+180,{p:[122,63],lean:17},'io');
  const tr=swordRetire(A,tr0+190,SWORD_POINT);
  A.hold(tr0,['h','w']).k(tr,{h:SWORD_POINT.h,w:SWORD_POINT.w},'io',{arc:true});
  A.k(tr,{o:SWORD_POINT.o},'io',{arc:true});
  B.hold(tr0+60,['p','lean','bend','head','h','w','o']);
  B.k(tr0+520,{p:[DAGGER_OUT.px,DAGGER_OUT.py],lean:9,bend:8,head:-12},'io');
  B.k(tr0+520,{h:DAGGER_OUT.h,w:DAGGER_OUT.w,o:DAGGER_OUT.o},'io',{arc:true});
  return finish({id:'press',title:'Press Advantage',
    stops:[{t:tc,d:70}],
    pauses:[{t:th,label:'Press Advantage is in force. While the engine says the defender cannot attack, the pair stays like this.'}],
    fx:[{t:tc,kind:'clash',at:C}],wounds:[],checks:[{t:tc,who:'a',along:62,at:C},{t:tc,who:'b',along:15,at:C}],
    marks:[...CUT_MARKS(tc),
      {t:tc,who:'b',label:'Contact: the dagger stops the cut'},
      {t:tc+70,who:'a',label:'Press: the rear foot comes up and the point goes over the dagger to the face'},
      {t:th,who:'both',label:'Held: the point keeps threatening, the defender stays busy covering (no blow, no ground taken)'},
      {t:tr0,who:'both',label:'Released: when the effect ends, both go back to measure'}]},F);
}

// 5. A fight-ending injury: the same cut, and the fall comes straight out of the contact.
function seqFinish(){
  const F=pair(),A=F.a,B=F.b,tc=900;
  const T=cutLands(A,B,tc);
  // B goes down along the line of the blow: chest back, knees give, seat, back, and stays there
  B.k(tc+110,{lean:-14,bend:15,head:20},'out3').k(tc+110,{p:[-14,65]},'out3');
  B.k(tc+120,{h:[34,17],w:72},'out',{arc:true}).k(tc+120,{o:[12,9]},'out',{arc:true});
  B.k(tc+330,{p:[-37,36],lean:-35,bend:18,head:9},'in').k(tc+330,{h:[38,28],w:96},'io',{arc:true}).k(tc+330,{o:[-30,-25]},'io',{arc:true});
  B.k(tc+490,{p:[-55,10],lean:-60,bend:13,head:2},'lin').k(tc+490,{o:[-37,-33]},'io',{arc:true});
  B.k(tc+560,{p:[-56,14]},'out').k(tc+650,{p:[-57,10]},'in');
  B.k(tc+740,{lean:-86,bend:4,head:-5},'in').k(tc+800,{lean:-84,bend:4},'out').k(tc+880,{lean:-86,bend:3,head:-3},'io');
  B.k(tc+740,{h:[60,1],w:5},'in',{arc:true}).k(tc+760,{o:[-56,2]},'in',{arc:true});
  B.hold(tc+560,['ffx']);B.k(tc+900,{ffx:31},'io');
  // A: the cut is drawn through; then the front foot passes back and the sword is lowered. Watching, not celebrating.
  const tr=swordRetire(A,tc+420,SWORD_LOW);
  A.hold(tc+420,['h','w']).k(tr,{h:SWORD_LOW.h,w:SWORD_LOW.w},'io',{arc:true});
  A.k(tc+420,{o:[-29,-17]},'lin').k(tr,{o:SWORD_LOW.o},'io',{arc:true});
  return finish({id:'finish',title:'A fight-ending injury',
    stops:[{t:tc,d:110}],pauses:[],
    fx:[{t:tc,kind:'wound',at:T}],wounds:[{t:tc,who:'b',part:'chest',level:'major'}],checks:[{t:tc,who:'a',along:88,at:T}],
    marks:[...CUT_MARKS(tc),
      {t:tc,who:'b',label:'Contact: the cut lands'},
      {t:tc+1,who:'b',label:'Collapse: straight out of the blow. Chest back, knees give, seat, back'},
      {t:tc+420,who:'a',label:'The winner passes back and lowers the sword (out of the fight is all the engine says)'}]},F);
}

const SEQUENCES={exchange:seqExchange,miss:seqMiss,hit:seqHit,press:seqPress,finish:seqFinish};

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
  build(id){return (SEQUENCES[id]||SEQUENCES.exchange)();}
};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.PitsMotion=api;
})(typeof window!=='undefined'?window:globalThis);
