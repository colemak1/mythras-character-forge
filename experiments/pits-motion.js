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
//   3. A fight is one function of time. Both fighters are written against
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
// ox is where the fighter's stance is standing now (see rebase): phrases write floor positions from there,
// so the same phrase works wherever the last one left the feet.
function Fig(id,hx,face,weapon,start){
  this.id=id;this.hx=hx;this.face=face;this.weapon=weapon;this.tr=new Track(start);this.notes=[];this.ox=0;
}
const FLOORX=['px','ffx','bfx'];
// key some parts at time t. vals may use p:[x,y], ff:[x,y], bf:[x,y] as short forms. opts.arc: the hands swing.
Fig.prototype.k=function(t,vals,ease,opts){
  const arc=opts&&opts.arc,ox=this.ox;
  for(const c in vals){
    const v=vals[c];
    if(c==='p'){this.tr.set('px',t,v[0]+ox,ease);this.tr.set('py',t,v[1],ease);}
    else if(c==='ff'||c==='bf'){this.tr.set(c+'x',t,v[0]+ox,ease);this.tr.set(c+'y',t,v[1],ease);}
    else this.tr.set(c,t,FLOORX.includes(c)?v+ox:v,ease,VEC.includes(c)?arc:false);
  }
  return this;
};
// keep parts exactly where they are until t (so the next key starts moving from t, not from the last key)
const ALL=['p','lean','bend','head','h','w','o'];
Fig.prototype.hold=function(t,chans){
  for(const c of chans||ALL){
    if(c==='p'){this.hold(t,['px','py']);continue;}
    if(this.tr.ch[c].some(k=>k.t===t))continue;
    this.tr.set(c,t,this.tr.val(c,t),'lin');
  }
  return this;
};
// A phrase starts from the stance the fighter is in: measure the floor from the front foot (front is where the
// front foot stands in the weapon's guard).
Fig.prototype.rebase=function(t,front){this.ox=this.tr.val('ffx',t)-front;return this;};
// the last moment anything was written for this fighter
Fig.prototype.free=function(){return this.tr.end();};
// A step: the foot leaves the floor at t0 and is planted at x by t1. Between steps a foot never moves.
Fig.prototype.step=function(foot,t0,t1,x,lift){
  const tr=this.tr,cx=foot+'x',cy=foot+'y',tm=t0+(t1-t0)*.45;
  tr.set(cx,t0,tr.val(cx,t0),'lin');tr.set(cy,t0,0,'lin');
  tr.set(cx,t1,x+this.ox,'io');tr.set(cy,tm,lift==null?10:lift,'out');tr.set(cy,t1,0,'in');
  return this;
};
Fig.prototype.pose=function(t){return this.tr.pose(t);};
// Once a sequence is written, turn every blade key into a wrist key: the blade angle asked for at that moment, measured
// from where the forearm is at that moment. Contacts stay exactly where they were aimed; in between, the weapon moves
// with the arm that holds it.
Fig.prototype.grip=function(){
  const tr=this.tr,keys=tr.ch.w.map(k=>({t:k.t,e:k.e,w:k.v}));
  delete tr.ch.wr;
  const out=keys.map(k=>{
    const t=Math.max(k.t,0),p=tr.pose(t);p.w=k.w;
    return {t:k.t,v:solve(p,this.weapon.len).grip,e:k.e};
  });
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
  this.k(t,{h:best.h},ease,opts);this.tr.set('w',t,best.w,(opts&&opts.wease)||ease);return this;
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
// Sword: side on, knees bent, weight a little back, the point up at the opponent's face. The empty hand is carried in
// front of the body at the bottom of the ribs: a second guard, and the counterweight when the sword arm goes out.
const SWORD_GUARD={ffx:30,ffy:0,bfx:-34,bfy:0,px:-4,py:80,lean:5,bend:4,head:-6,h:[27,-31],w:44,o:[18,-27]};
// Dagger: lower and more square, blade forward at chest height, the empty hand up as a second guard.
const DAGGER_GUARD={ffx:26,ffy:0,bfx:-30,bfy:0,px:-3,py:73,lean:11,bend:9,head:-14,h:[35,-13],w:34,o:[19,-25]};
const WEAPONS={sword:{key:'sword',len:92,name:'Broadsword'},dagger:{key:'dagger',len:50,name:'Dagger'}};
// The fighters stand close enough that the sword reaches with one step of the front foot (owner, 2026-11-12).
const SPACING=200,CENTRE=600,FRONT={sword:30,dagger:26};
function pair(){
  return {a:new Fig('a',CENTRE-SPACING/2,1,WEAPONS.sword,SWORD_GUARD),b:new Fig('b',CENTRE+SPACING/2,-1,WEAPONS.dagger,DAGGER_GUARD)};
}
const ARC={arc:true};

// ===========================================================================
// Phrases. Each one writes keys for one fighter, relative to a contact time tc.
// They start from whatever pose and stance the fighter is in.
// ===========================================================================

// A descending cut on one step of the front foot. 480 ms from stillness to contact.
//   load    tc-480 .. tc-290   the weight settles back, the hilt comes up beside the head, the blade tips back over
//                              the shoulder; the empty hand comes forward as the shoulders turn
//   drive   tc-290 .. tc-150   the front foot leaves, the hips go; the chest is still open and the blade is left behind
//   strike  tc-150 .. tc       the shoulders come round, the arm goes out, the foot lands, and the blade arrives last
// The caller writes where the blade is at tc (it depends on what the cut meets).
// opt.stride: how far the front foot goes (34 from measure). opt.load false: the blade is already up (a riposte).
function swordCut(A,tc,opt){
  const o=opt||{},stride=o.stride==null?34:o.stride,f=stride/34,t1=tc-290;
  if(o.load===false)A.hold(t1).rebase(t1,FRONT.sword);
  else{
    A.hold(tc-480).rebase(tc-480,FRONT.sword);
    A.k(t1,{p:[-8,78],lean:2,bend:-3,head:1},'io').kg(t1,[15,29],-6,'io',ARC);
    A.k(t1,{o:[25,-13]},'io',ARC);
  }
  const p0=A.tr.val('px',t1)-A.ox,p1=p0+4+30*f,y1=80-13*f;
  if(stride>3)A.step('ff',tc-275,tc-65,30+stride,6);
  A.k(tc-150,{p:[p0+(p1-p0)*.66,(78+y1)/2+1],lean:7,bend:-5,head:0},'io');
  A.k(tc,{p:[p1,y1],lean:17,bend:8,head:-15},'io');
  A.kg(tc-150,[10,31],3,'io',ARC);
  // the empty arm goes the other way: forward while the blade is back, then down past the hip and out behind
  A.k(tc-150,{o:[23,-9]},'io',ARC).k(tc,{o:[-40,-44]},'in',ARC);
  return tc;
}
// The dagger reads the cut and meets it. Shared by every sequence where the cut is parried. Returns the meeting point.
function daggerParry(A,B,tc){
  B.hold(tc-330).rebase(tc-330,FRONT.dagger);
  B.k(tc-200,{p:[-7,70],lean:13,bend:10},'io').k(tc-200,{h:[29,-17],w:48,o:[21,-20]},'io',ARC);
  B.k(tc-25,{p:[2,76],lean:4,bend:1,head:-4},'out').k(tc-25,{o:[14,-22]},'out',ARC);
  // where the blades meet: in front of and above B's head, on the line of the cut
  const hd=B.at(tc-25,'Hd'),C=[hd[0]-50,hd[1]+6];
  B.hold(tc-170,['h','w']);B.aim(tc-25,C,104,15,'out3',ARC);
  A.aimGrip(tc,C,8,62,'in',{arc:true,wease:'in3'});
  // contact: the cut is stopped; its weight goes into B's arm and knees
  B.hold(tc);B.k(tc+70,{p:[0,71],lean:7,bend:3},'out');
  return C;
}
// A dagger thrust on a short step: gather, then a straight line. The caller aims the blade at t2.
//   t0 .. t0+130   the front foot goes in, the hand is drawn back to the hip
//   t0+130 .. t2   the body goes in behind the point; the rear foot closes up if follow is set
function daggerLunge(B,t0,t2,front,follow){
  B.hold(t0);
  B.step('ff',t0+10,t0+150,front,7);
  B.k(t0+125,{p:[front-33,71],lean:16,bend:6},'in').k(t0+125,{h:[8,-30],w:12},'io',ARC);
  if(follow!=null)B.step('bf',t0+165,t2-15,follow,5);
  B.k(t2,{p:[front-25,69],lean:25,bend:3,head:-20},'out');
  B.hold(t0+130,['h','w']);
}

// ===========================================================================
// Exchanges. Each one starts from the pose the last one ended in, at time t0, and returns when it is over.
// S collects what the page and the tests need to know: contacts, pauses, wounds, captions.
// ===========================================================================
function newSeq(id,title){return {id,title,stops:[],pauses:[],fx:[],wounds:[],checks:[],marks:[],exchanges:[]};}
const mark=(S,t,who,label)=>S.marks.push({t,who,label});
function cutMarks(S,tc,loaded){
  if(!loaded)mark(S,tc-480,'a','Load: the weight settles back, the hilt comes up beside the head, the empty hand comes forward');
  mark(S,tc-290,'a','Drive: the front foot goes and the hips with it; the chest is still open and the blade is left behind');
  mark(S,tc-150,'a','Strike: shoulders, then the arm, then the blade; the foot lands as it arrives');
}

// Sword cuts; the dagger parries and turns the cut down and short. Ends at the decision pause.
function exCutParried(S,F,t0){
  const A=F.a,B=F.b,tc=t0+480;
  S.exchanges.push({t:t0,attacker:'a',label:'Cut, parry, redirect'});
  swordCut(A,tc);cutMarks(S,tc);
  const C=daggerParry(A,B,tc);
  // the redirect: B turns the cut down and away for a moment; from there the sword's own weight carries it down.
  // It falls close to A's own front foot, hand low, so the line to A's chest is open above it.
  const hc=A.tr.val('h',tc),hb=B.tr.val('h',tc);
  A.hold(tc).kg(tc+60,[hc[0]-34,hc[1]-12],0,'lin',ARC).kg(tc+130,[hc[0]-43,hc[1]-44],-10,'out',ARC);
  B.k(tc+110,{h:[hb[0]+3,hb[1]-28],w:38},'out',ARC);
  A.k(tc+220,{p:[29,66],lean:20,bend:8,head:-19},'out').kg(tc+220,[5,-43],-11,'out',ARC);
  A.k(tc+220,{o:[-46,-38]},'out',ARC);
  B.k(tc+220,{p:[3,72],lean:10,bend:5,head:-10},'io').k(tc+220,{h:[30,-8],w:50},'io',ARC);
  B.k(tc+220,{o:[27,-12]},'io',ARC);
  S.stops.push({t:tc,d:70});S.fx.push({t:tc,kind:'clash',at:C});
  S.checks.push({t:tc,who:'a',along:62,at:C},{t:tc,who:'b',along:15,at:C});
  mark(S,tc,'b','Contact: the dagger stops the cut; knees and elbow take its weight');
  mark(S,tc+1,'b','Redirect: turned down and away, the sword drops beside its owner\'s front foot');
  S.pauses.push({t:tc+230,label:'The attack is resolved: the sword is down and its owner is committed. '
    +'The dagger fighter chooses what to do with the opening.'});
  return tc+230;
}

// Dagger counters over the lowered sword and wounds; both step out. The attacker has changed.
function exCounter(S,F,t0){
  const A=F.a,B=F.b,t2=t0+300;
  S.exchanges.push({t:t0,attacker:'b',label:'Counter over the lowered sword'});
  daggerLunge(B,t0,t2,44,-16);
  // A is trying to get the sword back and has not
  A.hold(t0).k(t2,{p:[27,67],lean:19,bend:6,head:-15},'io').kg(t2,[1,-40],-11,'io',ARC);
  A.k(t2,{o:[-34,-36]},'io',ARC);
  // the empty hand goes out low over the sword: if the sword comes up, it comes up into that
  B.k(t0+125,{o:[35,-20]},'io',ARC).k(t2,{o:[30,-31]},'io',ARC);
  const chest=A.at(t2,'chest'),T=[chest[0]+5,chest[1]+3];
  B.aimGrip(t2,T,0,50,'in');
  // A is struck: the chest goes back first, the head and hips follow, and the front foot comes back to catch the weight
  A.k(t2+110,{lean:-5,bend:-8,head:15},'out3').k(t2+90,{p:[21,70]},'out');
  A.kg(t2+140,[10,-45],-6,'out',ARC).k(t2+150,{o:[16,-49]},'out',ARC);
  A.step('ff',t2+90,t2+330,36,8);
  A.k(t2+340,{p:[4,74],lean:4,bend:12,head:-4},'io').k(t2+540,{p:[2,76],lean:9,bend:11,head:-13},'io');
  // recovery: the point comes back up, the body stays closed over the wound, the empty hand comes back in front
  A.k(t2+540,{h:SWORD_HURT.h,w:SWORD_HURT.w},'io',ARC).k(t2+540,{o:SWORD_HURT.o},'io',ARC);
  // B takes the dagger back out along the line it went in, then steps out behind the empty hand
  B.k(t2+90,{p:[20,68]},'out').k(t2+270,{h:[15,-30],w:22},'io').k(t2+270,{lean:18,bend:6,head:-16},'io');
  B.step('bf',t2+210,t2+380,-30,6);B.step('ff',t2+410,t2+590,26,7);
  B.k(t2+390,{p:[10,70]},'io').k(t2+640,{p:[-1,74],lean:9,bend:8,head:-12},'io');
  B.k(t2+640,{h:DAGGER_OUT.h,w:DAGGER_OUT.w},'io',ARC).k(t2+290,{o:[30,-14]},'io',ARC).k(t2+640,{o:DAGGER_OUT.o},'io',ARC);
  S.stops.push({t:t2,d:80});S.fx.push({t:t2,kind:'wound',at:T});
  S.checks.push({t:t2,who:'b',along:50,at:T});S.wounds.push({t:t2,who:'a',part:'chest',level:'minor'});
  mark(S,t0,'b','Counter: a short step in; the hand is drawn back, the empty hand goes out over the sword hand');
  mark(S,t0+130,'b','Thrust: a straight line over the lowered sword to the chest');
  mark(S,t2,'a','Reaction: the chest goes back first, then head and hips; the front foot comes back to catch the weight');
  mark(S,t2+340,'both','Both step out. Nobody returns to the guard they started in');
  return t2+560;
}

// Sword cuts again from the hurt guard and misses; the momentum is carried through a step. Ends at a decision pause.
function exCutMisses(S,F,t0){
  const A=F.a,B=F.b,tc=t0+480;
  S.exchanges.push({t:t0,attacker:'a',label:'A cut that misses'});
  swordCut(A,tc,{stride:26});cutMarks(S,tc);
  // B gives a half step and the cut passes in front
  B.hold(tc-240).rebase(tc-240,FRONT.dagger);
  B.step('bf',tc-220,tc-80,-52,5);
  B.k(tc-60,{p:[-20,72],lean:3,bend:7,head:-8},'io').k(tc-60,{h:[5,-22],w:96},'io',ARC);
  B.k(tc-60,{o:[13,-21]},'io',ARC);
  B.step('ff',tc-40,tc+120,6,5);
  B.k(tc+150,{p:[-25,72],lean:8,bend:8,head:-12},'io');
  B.k(tc+340,{h:[13,-25],w:26},'io',ARC).k(tc+340,{o:[24,-22],lean:12},'io',ARC);
  // nothing stops the blade: it runs on down, the chest follows it, and the rear foot has to come through to
  // put a base back under the body
  A.kg(tc,[30,7],2,'in',{arc:true,wease:'in3'});
  A.kg(tc+110,[26,-20],0,'lin',ARC).kg(tc+250,[17,-42],-3,'out',ARC);
  A.step('bf',tc+40,tc+290,-6,7);
  A.k(tc+170,{p:[27,70],lean:25,bend:10,head:-24},'io').k(tc+340,{p:[29,76],lean:15,bend:8,head:-15},'io');
  A.k(tc+190,{o:[-43,-22]},'out',ARC).k(tc+340,{o:[-24,-46]},'io',ARC);
  mark(S,tc,'a','Miss: the dagger fighter gives a half step and the cut passes in front; nothing stops it');
  mark(S,tc+40,'a','Follow-through: the blade runs on down, the chest goes with it, and the rear foot comes through under the body');
  S.pauses.push({t:tc+350,label:'The miss is resolved: the sword is spent low and the two are a step closer. '
    +'The dagger fighter chooses.'});
  return tc+350;
}

// Dagger thrusts at the spent sword fighter; the sword comes up under it and carries it over. Ends with the sword high.
function exThrustBeaten(S,F,t0){
  const A=F.a,B=F.b,t4=t0+310;
  S.exchanges.push({t:t0,attacker:'b',label:'A thrust beaten upward'});
  B.rebase(t0,FRONT.dagger);daggerLunge(B,t0,t4,50,null);
  B.k(t4,{o:[22,-20]},'io',ARC);
  // the parry: the blade first, the body under it afterwards. The weight goes back onto the rear foot.
  A.hold(t0+30).rebase(t0+30,FRONT.sword);
  A.k(t0+130,{p:[-3,76],lean:11,bend:6,head:-11},'io').kg(t0+130,[13,-36],52,'io',ARC);
  A.k(t4-20,{p:[-5,77],lean:8,bend:4,head:-8},'out').kg(t4-20,[33,-21],54,'out',ARC);
  A.k(t4-20,{o:[4,-50]},'io',ARC);
  const C=A.at(t4-20,'blade',30);
  A.hold(t4);B.aim(t4,C,19,35,'in');B.hold(t4);
  // carried up and over: the same lift that clears the dagger loads the next cut
  A.k(t4+170,{p:[-7,78],lean:3,bend:-3,head:0},'io').kg(t4+170,[15,29],-6,'io',ARC);
  A.k(t4+170,{o:[24,-14]},'io',ARC);
  B.k(t4+150,{p:[17,69],lean:17,bend:0,head:-13},'out').k(t4+90,{h:[36,25],w:102},'out',ARC);
  B.k(t4+150,{o:[25,-18]},'out',ARC);
  A.hold(t4+170);B.hold(t4+170,['p','lean','bend','head','o']);
  S.stops.push({t:t4,d:60});S.fx.push({t:t4,kind:'clash',at:C});
  S.checks.push({t:t4,who:'a',along:30,at:C},{t:t4,who:'b',along:35,at:C});
  mark(S,t0,'b','Thrust: the dagger goes in at the spent sword fighter');
  mark(S,t0+30,'a','Parry: the blade comes up first, across the line; the weight goes back under it');
  mark(S,t4,'a','The dagger is carried up and over. The lift that clears it is the load for the next cut');
  return t4+170;
}

// Sword cuts down from the lift and ends the fight; the dagger fighter's legs go and it falls.
function exCutEnds(S,F,t0){
  const A=F.a,B=F.b,tc=t0+290;
  S.exchanges.push({t:t0,attacker:'a',label:'The cut that ends it'});
  // B has been lifted open and is trying to get back out: the weight is going onto the rear leg when the cut lands
  B.hold(t0).step('ff',t0+40,t0+230,30,6);
  B.k(tc,{p:[4,72],lean:8,bend:2,head:-8},'io').k(tc,{h:[30,1],w:58},'io',ARC);
  B.k(tc,{o:[27,-12]},'io',ARC);
  swordCut(A,tc,{stride:30,load:false});cutMarks(S,tc,true);
  const ch=B.at(tc,'chest'),T=[ch[0]-2,ch[1]+9];
  A.aimGrip(tc,T,10,82,'in',{arc:true,wease:'in3'});
  // the cut is drawn down and through, then the winner steps back out and lowers the point. Watching, not celebrating.
  const pa=A.tr.val('px',tc)-A.ox;
  A.k(tc+170,{p:[pa+2,71],lean:22,bend:8,head:-21},'out').kg(tc+170,[9,-44],-10,'out',ARC);
  A.step('ff',tc+210,tc+420,10,7);
  A.k(tc+440,{p:[-10,78],lean:7,bend:4,head:-12},'io');
  A.step('bf',tc+460,tc+660,-50,6);
  A.k(tc+700,{p:[-21,83],lean:3,bend:3,head:-14},'io');
  A.hold(tc+210,['h','w']).k(tc+700,{h:SWORD_LOW.h,w:SWORD_LOW.w},'io',ARC);
  A.hold(tc+200,['o']).k(tc+700,{o:SWORD_LOW.o},'io',ARC);
  collapseBack(B,tc);
  S.stops.push({t:tc,d:110});S.fx.push({t:tc,kind:'wound',at:T});
  S.checks.push({t:tc,who:'a',along:82,at:T});S.wounds.push({t:tc,who:'b',part:'chest',level:'major'});
  mark(S,tc,'b','Contact: the cut lands');
  mark(S,tc+1,'b','Collapse: the chest goes back past the feet, the knee folds, the front foot comes off the floor');
  mark(S,tc+380,'b','Down: seat, back, head; the empty arm arrives last. The winner steps out and lowers the point');
  return tc+900;
}
// Balance and support giving way. The blow takes the chest back past the feet; there is no step to catch it. The rear
// knee folds and the hips drop behind the heel, faster and faster; the front foot is pulled off the floor; seat, back
// and head land in turn. The dagger arm goes dead at the blow and hangs; the empty hand goes to the wound and lands
// last. Nothing is held up.
function collapseBack(B,tc){
  B.hold(tc);
  B.k(tc+90,{lean:-14,bend:12,head:20},'out3').k(tc+100,{p:[-2,70]},'out3');
  B.k(tc+220,{p:[-19,54],lean:-34,bend:12,head:16},'in');
  B.k(tc+380,{p:[-46,14],lean:-58,bend:12,head:4},'lin').k(tc+440,{p:[-50,10]},'out');
  B.k(tc+500,{p:[-51,12]},'out').k(tc+570,{p:[-52,10]},'in');
  B.k(tc+520,{lean:-86,bend:4,head:-8},'in').k(tc+590,{lean:-82,bend:5,head:-3},'out').k(tc+690,{lean:-86,bend:3,head:-3},'io');
  // the front foot comes off the floor as the weight goes back, lands again, and the leg lets go
  B.hold(tc+190,['ffx','ffy']).k(tc+380,{ff:[36,26]},'io').k(tc+580,{ff:[38,0]},'in');
  B.hold(tc+620,['ffx']).k(tc+800,{ffx:33},'io');
  B.hold(tc+470,['bfx']).k(tc+760,{bfx:-13},'io');
  // the dagger arm: dropped, hanging, dragged, then along the floor
  B.kg(tc+140,[9,-51],-9,'out',ARC).kg(tc+270,[20,-47],12,'io',ARC).kg(tc+380,[34,-34],38,'io',ARC);
  B.kg(tc+450,[48,-24],30,'io',ARC).kg(tc+520,[60,-7],4,'lin',ARC);
  // the empty hand: to the wound, away as the body goes over, down last
  B.k(tc+120,{o:[19,-22]},'out',ARC).k(tc+230,{o:[18,-19]},'io',ARC).k(tc+400,{o:[28,22]},'io',ARC);
  B.k(tc+660,{o:[-51,-5]},'in',ARC).k(tc+720,{o:[-51,-1]},'out').k(tc+790,{o:[-51,-6]},'in');
}
// How each fighter stands after an exchange. Never the guard it began in: a fight does not pass through one neutral pose.
const SWORD_HURT={h:[23,-35],w:52,o:[13,-30]};
const SWORD_POINT={h:[36,-21],w:17,o:[15,-31]};
const SWORD_LOW={h:[2,-57],w:-62,o:[11,-47]};
const DAGGER_OUT={h:[22,-27],w:27,o:[34,-8]};

// ===========================================================================
// Sequences
// ===========================================================================
function finish(seq,F){
  F.a.grip();F.b.grip();
  seq.fighters={a:F.a,b:F.b};
  seq.marks.sort((x,y)=>x.t-y.t);
  seq.dur=Math.max(F.a.tr.end(),F.b.tr.end())+(seq.tail==null?400:seq.tail);
  seq.notes=[...F.a.notes.map(n=>({who:'a',...n})),...F.b.notes.map(n=>({who:'b',...n}))];
  return seq;
}

// 1. Five connected exchanges. Each begins from the pose the last one ended in; the attacker changes three times;
//    the scene stops for a decision twice.
function seqFight(){
  const F=pair(),S=newSeq('fight','A fight in five exchanges');
  mark(S,0,'both','On guard, close enough that one step reaches');
  let t=150;
  t=exCutParried(S,F,t);
  t=exCounter(S,F,t);
  t=exCutMisses(S,F,t);
  t=exThrustBeaten(S,F,t);
  exCutEnds(S,F,t);
  return finish(S,F);
}

// 2. Press Advantage: the cut is parried, but the attacker stays on the blade and keeps the point in the face.
function seqPress(){
  const F=pair(),A=F.a,B=F.b,S=newSeq('press','Press Advantage'),tc=630,th=tc+290,beat=430,n=2,tr0=th+n*beat+80;
  mark(S,0,'both','On guard');
  swordCut(A,tc);cutMarks(S,tc);
  const C=daggerParry(A,B,tc);
  // A does not let the blade fall: the rear foot comes up under the body and the point goes over the dagger to the face
  A.hold(tc).step('bf',tc+50,tc+230,4,5);
  const press=(t,push,ease)=>{
    A.k(t,{p:[36+push,73],lean:11+push*.4,bend:4,head:-11},ease);
    B.k(t,{p:[-11-push*.5,69],lean:-1-push*.5,bend:7,head:-3},ease);
    // the arm is long and the blade in line with it, the point at the face
    A.kg(t,[45+push*.5,-15],3,ease,ARC);
    B.aim(t,A.at(t,'blade',66),101,13,ease);B.k(t,{o:[17,7]},ease,ARC);
    A.k(t,{o:[-34,-47]},ease,ARC);
  };
  press(th,0,'io');
  // held: the point keeps darting at the face and the dagger keeps answering it. No blow, no ground taken.
  for(let i=0;i<n;i++){press(th+i*beat+150,10,'out');press(th+i*beat+beat,0,'io');}
  // released when the effect ends: A steps back out, B comes forward into guard again
  A.step('bf',tr0,tr0+190,-34,5);
  A.k(tr0+200,{p:[20,72],lean:12},'io');
  A.step('ff',tr0+220,tr0+430,30,6);
  A.k(tr0+470,{p:[-5,81],lean:3,bend:3,head:-4},'io');
  A.hold(tr0,['h','w','o']).k(tr0+470,{h:SWORD_POINT.h,w:SWORD_POINT.w},'io',ARC).k(tr0+470,{o:SWORD_POINT.o},'io',ARC);
  B.hold(tr0+60);
  B.k(tr0+520,{p:[-1,74],lean:9,bend:8,head:-12},'io').k(tr0+520,{h:DAGGER_OUT.h,w:DAGGER_OUT.w,o:DAGGER_OUT.o},'io',ARC);
  S.stops.push({t:tc,d:70});S.fx.push({t:tc,kind:'clash',at:C});
  S.checks.push({t:tc,who:'a',along:62,at:C},{t:tc,who:'b',along:15,at:C});
  S.pauses.push({t:th,label:'Press Advantage is in force. While the engine says the defender cannot attack, the pair stays like this.'});
  mark(S,tc,'b','Contact: the dagger stops the cut');
  mark(S,tc+70,'a','Press: the rear foot comes up and the point goes over the dagger to the face');
  mark(S,th,'both','Held: the point keeps threatening, the defender stays busy covering (no blow, no ground taken)');
  mark(S,tr0,'both','Released: when the effect ends, the sword fighter steps back out');
  S.exchanges.push({t:0,attacker:'a',label:'Press Advantage'});
  return finish(S,F);
}

const SEQUENCES={fight:seqFight,press:seqPress};

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
  build(id){return (SEQUENCES[id]||SEQUENCES.fight)();}
};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.PitsMotion=api;
})(typeof window!=='undefined'?window:globalThis);
