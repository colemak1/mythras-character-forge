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
  this.front=start.ffx;   // where the front foot stands in this fighter's guard
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
  const len=this.weapon.len;
  const out=keys.map(k=>{
    const t=Math.max(k.t,0),p=tr.pose(t);p.w=k.w;
    return {t:k.t,v:solve(p,len).grip,e:k.e};
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
const SPACING=200,CENTRE=600;
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
  if(o.load===false)A.hold(t1).rebase(t1,A.front);
  else{
    A.hold(tc-480).rebase(tc-480,A.front);
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
function daggerParry(A,B,tc,shield){
  B.hold(tc-330).rebase(tc-330,B.front);
  B.k(tc-200,{p:[-7,70],lean:13,bend:10},'io').k(tc-200,{h:[29,-17],w:48,o:[21,-20]},'io',ARC);
  B.k(tc-25,{p:[2,76],lean:4,bend:1,head:-4},'out').k(tc-25,{o:[14,-22]},'out',ARC);
  // where the blades meet: in front of and above B's head, on the line of the cut
  const hd=B.at(tc-25,'Hd'),C=[hd[0]+B.face*50,hd[1]+6];
  if(shield)B.reach(tc-25,C,'out3',ARC);   // a shield meets it with the off hand (stand-in: no shield phrase yet)
  else{B.hold(tc-170,['h','w']);
    // the dagger's own parry; a longer weapon held across has to be solved from the arm
    if(B.weapon.len<=50)B.aim(tc-25,C,104,15,'out3',ARC);else B.aimGrip(tc-25,C,70,Math.round(B.weapon.len*.3),'out3',ARC);}
  A.aimGrip(tc,C,8,Math.round(A.weapon.len*.67),'in',{arc:true,wease:'in3'});
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
  B.hold(tc-240).rebase(tc-240,B.front);
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
  B.rebase(t0,B.front);daggerLunge(B,t0,t4,50,null);
  B.k(t4,{o:[22,-20]},'io',ARC);
  // the parry: the blade first, the body under it afterwards. The weight goes back onto the rear foot.
  A.hold(t0+30).rebase(t0+30,A.front);
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
// ===========================================================================
// Live: the Pits stage (pits-stage.js) writes phrases from a resolved exchange.
// The stage keeps one clock per bout; every call below writes keys from the clock time t, starting from the pose
// the fighter is in now (anything written for later than t is dropped first). Nothing here decides a result: the
// stage passes in what the engine already resolved.
// Phrases exist for the sword-and-dagger study only. Other weapons borrow the nearer of the two: a short blade or a
// thrusting weapon stands and attacks like the dagger, everything else like the sword. Falls (a trip, a leg giving
// way, an evade that ends prone) borrow the collapse; standing up, yielding and the winner lowering the point are plain
// stand-ins. They are listed in docs/pits-animation-direction.md.
// ===========================================================================
// Drop everything written after t: keep the pose exactly as it is drawn at t (the blade too), land a foot that was in the air.
Fig.prototype.cut=function(t){
  const tr=this.tr,drawn=this.joints(t).w;
  delete tr.ch.wr;
  for(const c in tr.ch){
    const v=c==='w'?drawn:tr.val(c,t),ks=tr.ch[c];
    while(ks.length>1&&ks[ks.length-1].t>=t)ks.pop();
    // forget keys long past (the stage sets keep; a bout can last many minutes)
    if(this.keep){let i=0;while(i+1<ks.length&&ks[i+1].t<t-this.keep)i++;if(i>0)ks.splice(0,i);}
    ks.push({t,v:Array.isArray(v)?v.slice():v,e:'lin',arc:false});
  }
  for(const f of ['ff','bf'])if(tr.val(f+'y',t)>.5)tr.set(f+'y',t+90,0,'in');
  this.ox=0;
  return this;
};
const THRUSTS=/^(spear|trident)$/;
const liveStyle=wk=>wk.len<=68||wk.thin||THRUSTS.test(wk.kind)?'thrust':'cut';
const LIVE_PART={head:'Hd',chest:'chest',abdomen:'abdomen',rleg:'K',lleg:'bK'};
function livePart(f,t,loc){
  // the weapon arm is drawn in front; for a left-handed fighter that arm is the left one
  if(loc==='rarm'||loc==='larm')return f.at(t,(loc==='rarm')!==!!f.swap?'E':'oE');
  return f.at(t,LIVE_PART[loc]||'chest');
}
// how far apart the two stand (between their hx-relative stations), from the engine's range and the weapon lengths
function liveGap(wa,wb,key){
  const g=len=>Math.round(200+.67*(len-92)),long=g(Math.max(wa.len,wb.len)),short=g(Math.min(wa.len,wb.len));
  return key==='apart'?long+170:key==='short'?Math.min(long,Math.max(170,short)):Math.max(170,long);
}
function liveFighter(id,wk,swap){
  const style=liveStyle(wk),guard=style==='thrust'?DAGGER_GUARD:SWORD_GUARD;
  const f=new Fig(id,CENTRE+(id==='a'?-1:1)*SPACING/2,id==='a'?1:-1,{key:wk.kind,len:wk.len},guard);
  f.style=style;f.guard=guard;f.swap=!!swap;f.grip();
  return f;
}
// the front foot's place in the fighter's own frame when standing at its station for this gap
const liveStation=(f,gap)=>f.guard.ffx-(gap-SPACING)/2;
// steps that move the whole stance by dx (forward is positive). The leading foot goes first; no sliding.
function liveWalk(f,t,dx){
  if(Math.abs(dx)<8)return t;
  const n=Math.ceil(Math.abs(dx)/62),d=dx/n;let u=t;f.ox=0;f.hold(t);
  for(let i=0;i<n;i++){
    const lead=d>0?'ff':'bf',trail=d>0?'bf':'ff';
    f.step(lead,u,u+200,f.tr.val(lead+'x',u)+d,7);
    f.step(trail,u+150,u+350,f.tr.val(trail+'x',u)+d,6);
    const px=f.tr.val('px',u);f.k(u+200,{px:px+d*.6},'io').k(u+350,{px:px+d},'io');
    u+=350;
  }
  return u;
}
// static poses (a new bout, or the picture snapped to the engine's state)
let LYING=null;
function lyingPose(){
  if(LYING)return LYING;
  const f=new Fig('x',0,1,{len:92},SWORD_GUARD);collapseBack(f,0);
  LYING=f.pose(1200);return LYING;
}
function livePlace(f,t,gap,state){
  f.cut(t);
  const off=liveStation(f,gap)-f.guard.ffx;let p;
  if(state==='lying'){p={...lyingPose()};}
  else{p={...f.guard,h:f.guard.h.slice(),o:f.guard.o.slice()};
    if(state==='low')Object.assign(p,{h:SWORD_LOW.h,w:SWORD_LOW.w,o:SWORD_LOW.o,py:83,lean:3,head:-14});
    if(state==='yield')Object.assign(p,{h:[0,-58],w:-70,o:[4,-50],py:78,lean:16,bend:10,head:22});}
  for(const c of ['ffx','bfx','px'])p[c]+=off;
  for(const c of SCALAR)f.tr.set(c,t+1,p[c],'lin');
  for(const c of VEC)f.tr.set(c,t+1,p[c],'lin');
  f.grip();return t+1;
}
// After a blow, or once a lull has gone on: back to the station, in a guard that is not the opening one.
function liveRecover(f,t,gap,hurt){
  f.cut(t);
  const ff=f.tr.val('ffx',t),bf=f.tr.val('bfx',t);
  const G=f.guard,base=G.ffx-G.bfx,want=liveStation(f,gap);
  // widen or narrow the stance first, then walk to the station
  let u=t;
  if(Math.abs((ff-bf)-base)>12){f.step('bf',u,u+200,ff-base,6);u+=200;}
  u=liveWalk(f,u,want-ff);
  const set=f.style==='thrust'?DAGGER_OUT:hurt?SWORD_HURT:SWORD_POINT;
  const end=Math.max(u,t+520),mid=want-G.ffx;
  f.k(end,{px:G.px+mid+2,py:G.py-2,lean:G.lean+(hurt?4:0),bend:G.bend+(hurt?4:0),head:G.head-4},'io');
  f.k(end,{h:set.h,w:set.w},'io',ARC).k(end,{o:set.o},'io',ARC);
  f.grip();return end;
}
// A struck fighter: the chest goes back first, head and hips follow, the front foot comes back to catch the weight.
function liveReact(D,tc,lost){
  D.hold(tc);D.ox=0;
  const ff=D.tr.val('ffx',tc),bf=D.tr.val('bfx',tc),px=D.tr.val('px',tc),k=Math.min(1,(lost||1)/6);
  const nf=Math.max(bf+60,ff-26),mid=(nf+bf)/2;
  D.k(tc+110,{lean:-5-8*k,bend:-8,head:15},'out3').k(tc+90,{px:px-6-8*k,py:70},'out');
  D.kg(tc+140,[10,-45],-6,'out',ARC).k(tc+150,{o:[16,-49]},'out',ARC);
  D.step('ff',tc+90,tc+330,nf,8);
  D.k(tc+340,{px:mid+3,py:74,lean:4,bend:12,head:-4},'io').k(tc+540,{px:mid+1,py:76,lean:9,bend:11,head:-13},'io');
  D.k(tc+540,{h:SWORD_HURT.h,w:SWORD_HURT.w},'io',ARC).k(tc+540,{o:SWORD_HURT.o},'io',ARC);
  return tc+540;
}
// A blow that lands but does no harm (armour, or nothing got through): a small give at the chest, no flinch.
function liveGive(D,tc){
  D.hold(tc);const lean=D.tr.val('lean',tc);
  D.k(tc+80,{lean:lean-6},'out').k(tc+260,{lean},'io');return tc+260;
}
function liveFall(D,t){D.cut(t).rebase(t,D.front);collapseBack(D,t);D.grip();return t+800;}
function liveStand(f,t,gap){
  f.cut(t);
  const G=f.guard,off=liveStation(f,gap)-G.ffx;
  // stand-in: the hips come forward over the feet, then up into a guard
  f.k(t+260,{px:off-6,py:40,lean:30,bend:10,head:-10},'io').k(t+260,{ffx:G.ffx+off,ffy:0,bfx:G.bfx+off,bfy:0},'io');
  f.k(t+620,{px:G.px+off,py:G.py,lean:G.lean,bend:G.bend,head:G.head},'io');
  f.k(t+620,{h:SWORD_HURT.h,w:SWORD_HURT.w},'io',ARC).k(t+620,{o:SWORD_HURT.o},'io',ARC);
  f.grip();return t+620;
}
// The winner lowers the point and watches. A yielding fighter lowers the weapon and bows (stand-ins).
function liveLower(f,t){
  f.cut(t);f.k(t+600,{lean:3,head:-14},'io').k(t+600,{h:SWORD_LOW.h,w:SWORD_LOW.w},'io',ARC).k(t+600,{o:SWORD_LOW.o},'io',ARC);
  f.grip();return t+600;
}
function liveYield(f,t){
  f.cut(t);f.k(t+520,{lean:16,bend:10,head:22,py:Math.min(78,f.tr.val('py',t))},'io');
  f.k(t+520,{h:[0,-58],w:-70},'io',ARC).k(t+520,{o:[4,-50]},'io',ARC);
  f.grip();return t+520;
}
// Press Advantage: the attacker stays on the blade with the point in the face; the defender covers. Held until released.
function livePress(A,D,t){
  A.cut(t);D.cut(t);
  const aff=A.tr.val('ffx',t),dff=D.tr.val('ffx',t),dbf=D.tr.val('bfx',t);
  A.step('bf',t+30,t+210,aff-60,5);
  A.k(t+260,{px:aff-28,py:73,lean:11,bend:4,head:-11},'io').kg(t+260,[45,-15],3,'io',ARC).k(t+260,{o:[-34,-47]},'io',ARC);
  D.k(t+260,{px:(dff+dbf)/2-9,py:69,lean:-1,bend:7,head:-3},'io');
  D.aim(t+260,A.at(t+260,'blade',Math.round(A.weapon.len*.72)),101,Math.round(D.weapon.len*.26),'io');
  D.k(t+260,{o:[17,7]},'io',ARC);
  A.grip();D.grip();return t+260;
}
// The blade-angle-free aim of a strike at a body point, for either attack style.
const liveAlong=(A,hit)=>A.style==='thrust'?A.weapon.len:Math.round(A.weapon.len*(hit?.89:.67));
// How far the front foot has to go for the weapon to reach a world point (fighter frame).
function liveStride(A,t,T){
  // a low target (a knee) is further from the shoulder than its floor distance says
  const want=A.L(T)[0]-(A.style==='thrust'?50:42)-liveAlong(A,true)+Math.max(0,(120-T[1])*.4);
  return want-A.tr.val('ffx',t);
}
// The cut that misses, or the thrust that falls short: a half step from the defender, and the follow-through.
function liveMiss(A,D,td,s,out){
  if(A.style==='cut'){
    const tc=out.tc,dS=out.stride-26;
    const T=livePart(D,tc,'chest');out.contacts.push({t:tc,kind:'miss',at:[T[0]-D.face*30,T[1]+40]});
    A.kg(tc,[30,7],2,'in',{arc:true,wease:'in3'});
    A.kg(tc+110,[26,-20],0,'lin',ARC).kg(tc+250,[17,-42],-3,'out',ARC);
    A.step('bf',tc+40,tc+290,-6+dS,7);
    A.k(tc+170,{p:[27+dS,70],lean:25,bend:10,head:-24},'io').k(tc+340,{p:[29+dS,76],lean:15,bend:8,head:-15},'io');
    A.k(tc+190,{o:[-43,-22]},'out',ARC).k(tc+340,{o:[-24,-46]},'io',ARC);
    out.end=tc+340;
  }else{
    const tc=out.tc,T=livePart(D,tc,'chest'),P=[T[0]-D.face*36,T[1]+18];A.ox=0;
    A.aimGrip(tc,P,0,liveAlong(A),'in');out.contacts.push({t:tc,kind:'miss',at:P});
    const px=A.tr.val('px',tc);A.k(tc+120,{px:px+6,lean:28},'out').k(tc+320,{h:[15,-30],w:22,lean:18,bend:6,head:-16},'io');
    out.end=tc+320;
  }
  // the defender gives a half step and the attack passes in front
  const ta=Math.max(out.tc-240,td);D.hold(ta).rebase(ta,D.front);
  D.step('bf',ta+20,ta+160,D.guard.bfx-22,5);
  D.k(ta+180,{p:[-20,72],lean:3,bend:7,head:-8},'io').k(ta+180,{o:[13,-21]},'io',ARC);
  D.step('ff',ta+200,ta+360,D.guard.ffx-20,5);
  D.k(ta+390,{p:[-25,72],lean:8,bend:8,head:-12},'io');
  if(s.fall)out.end=Math.max(out.end,liveFallAt(D,out.tc+160));
}
const inReach=h=>{const r=Math.hypot(h[0],h[1]);return r>ARM-2?[h[0]*(ARM-2)/r,h[1]*(ARM-2)/r]:h;};
function liveFallAt(D,t){D.rebase(t,D.front);collapseBack(D,t);return t+800;}
// One resolved blow. s: {outcome, loc, lost, shield (the parry was made with a shield), fall (the defender ends on
// the floor), defeated (the blow ends the fight)}. Returns {tc, contacts:[{t,kind:'clash'|'body'|'miss',at}], end}:
// end is the end of the follow-through, where the scene may stop for a decision.
function liveGather(f,t){
  const ff=f.tr.val('ffx',t),bf=f.tr.val('bfx',t),G=f.guard,base=G.ffx-G.bfx;
  if(Math.abs(ff-bf-base)<=8)return t;
  f.hold(t);f.step('bf',t,t+200,ff-base,6);f.k(t+210,{px:ff-base/2+G.px-(G.ffx+G.bfx)/2},'io');return t+210;
}
function liveBlow(F,aid,t,s){
  const A=F[aid],D=F[aid==='a'?'b':'a'],o=s.outcome;
  A.cut(t);D.cut(t);
  const out={tc:0,contacts:[],end:t,stride:0};
  // recovery belongs to the start of the next movement: a stance left wide or narrow by the last one is put right first
  let t1=liveGather(A,t);const td=liveGather(D,t);
  // close the measure first if one step will not reach
  // a partial parry takes the defender's body back a little before the blade gets through
  let need=liveStride(A,t1,livePart(D,t1,s.loc||'chest'))+(/^partial/.test(o)?14:0);
  const max=A.style==='cut'?40:26;
  if(need>max){t1=liveWalk(A,t1,need-max+6);need=max-6;}
  const stride=Math.max(A.style==='cut'?8:12,Math.min(max,need));out.stride=stride;
  if(A.style==='cut'){out.tc=t1+480;swordCut(A,out.tc,{stride});}
  else{
    // a long lunge brings the rear foot up behind it, so the base never gets wider than a leg can hold
    A.rebase(t1,A.front);out.tc=t1+300;
    const bf0=A.tr.val('bfx',t1)-A.ox,front=A.front+stride,base=A.guard.ffx-A.guard.bfx;
    daggerLunge(A,t1,out.tc,front,front-bf0>base+8?front-base-4:null);}
  const tc=out.tc;
  if(o==='evaded'||o==='miss'||o==='fumble'){liveMiss(A,D,td,s,out);A.grip();D.grip();return out;}
  const parried=/parry|ward|parried/.test(o);
  let tb=tc;   // when the blade reaches the body
  if(parried){
    let C;
    if(A.style==='cut')C=daggerParry(A,D,tc,s.shield);
    else{
      // the thrust is met by the defender's blade coming up under it, blade first, the body under it afterwards
      D.hold(t1+30).rebase(t1+30,D.front);
      D.k(t1+130,{p:[-3,76],lean:11,bend:6,head:-11},'io').kg(t1+130,[13,-36],52,'io',ARC);
      D.k(tc-20,{p:[-5,77],lean:8,bend:4,head:-8},'out');
      if(s.shield){const ch=livePart(D,tc-20,'chest');C=[ch[0]+D.face*34,ch[1]+10];D.reach(tc-20,C,'out',ARC);}
      else{D.kg(tc-20,[33,-21],54,'out',ARC);C=D.at(tc-20,'blade',Math.round(D.weapon.len*.33));}
      A.hold(tc-110,['h','w']);A.aimGrip(tc,C,6,Math.round(A.weapon.len*.7),'in');A.hold(tc);
    }
    out.contacts.push({t:tc,kind:'clash',at:C});
    if(o==='parried'||o==='full-parry'||o==='full-ward'){
      if(A.style==='cut'){
        // turned down and away: the sword's own weight carries it down beside its owner's front foot
        const hc=A.tr.val('h',tc),hb=D.tr.val('h',tc);
        A.hold(tc).kg(tc+60,inReach([hc[0]-34,hc[1]-12]),0,'lin',ARC).kg(tc+130,inReach([hc[0]-43,hc[1]-44]),-10,'out',ARC);
        if(!s.shield)D.k(tc+110,{h:[hb[0]+3,hb[1]-28],w:38},'out',ARC);
        A.k(tc+220,{p:[29+stride-34,66],lean:20,bend:8,head:-19},'out').kg(tc+220,[5,-43],-11,'out',ARC);
        A.k(tc+220,{o:[-46,-38]},'out',ARC);
        D.k(tc+220,{p:[3,72],lean:10,bend:5,head:-10},'io').k(tc+220,{o:[27,-12]},'io',ARC);
        if(!s.shield)D.k(tc+220,{h:[30,-8],w:50},'io',ARC);
        out.end=tc+230;
      }else{
        // carried up and over: the thrust is lifted off the line and comes back
        A.k(tc+90,{h:[36,25],w:102},'out',ARC).k(tc+150,{lean:17,bend:0,head:-13},'out');
        A.k(tc+380,{h:[15,-30],w:22,lean:12},'io',ARC);
        D.k(tc+170,{p:[-7,78],lean:3,bend:-3,head:0},'io');
        if(!s.shield)D.kg(tc+170,[15,29],-6,'io',ARC);
        out.end=tc+380;
      }
      A.grip();D.grip();return out;
    }
    tb=tc+130;   // a partial parry: held for a moment at the guard, the rest drives through
  }
  // the blade reaches the body part
  const T=livePart(D,tb,s.loc||'chest');
  // after a partial parry the blade is pushed on through from where the guard held it: a straight, even drive
  if(A.style==='cut')A.aimGrip(tb,T,10,liveAlong(A,true),parried?'io':'in',parried?null:{arc:true,wease:'in3'});
  else A.aimGrip(tb,T,0,liveAlong(A),parried?'io':'in');
  // the effects are drawn where the blade is: after a partial parry it can arrive a little short of the part
  const body={t:tb,kind:'body',at:T,part:T},len0=A.weapon.len;out.contacts.push(body);
  // the attacker's follow-through
  if(A.style==='cut'){
    A.ox=0;const pa=A.tr.val('px',tb);
    A.k(tb+170,{px:pa+2,py:71,lean:22,bend:8,head:-21},'out').kg(tb+170,[9,-44],-10,'out',ARC);
    out.end=tb+260;
  }else{
    A.ox=0;const pa=A.tr.val('px',tb);
    A.k(tb+90,{px:pa-4,py:68},'out').k(tb+270,{h:[15,-30],w:22,lean:18,bend:6,head:-16},'io');
    out.end=tb+270;
  }
  // the defender
  if(s.defeated||s.fall)out.end=Math.max(out.end,liveFallAt(D,tb));
  else if(s.lost>0)out.end=Math.max(out.end,Math.min(tb+340,liveReact(D,tb,s.lost)));
  else out.end=Math.max(out.end,liveGive(D,tb));
  A.grip();D.grip();
  {const j=livePose(A,tb),al=liveAlong(A,true)*Math.min(1,j.blen/len0),P=A.W([j.Hn[0]+Math.cos(rad(j.w))*al,j.Hn[1]+Math.sin(rad(j.w))*al]);
   if(Math.hypot(P[0]-T[0],P[1]-T[1])>6)body.at=P;}
  return out;
}
// the drawn joints of a fighter at time t (fighter frame, y up), with a disabled arm hanging
function livePose(f,t,limp){
  const p=f.pose(t);
  if(limp&&limp.weapon){p.h=[4,-58];p.wr=-8;}
  if(limp&&limp.off)p.o=[-3,-59];
  const j=solve(p,f.weapon.len),len=f.weapon.len;
  // a long blade turned down cannot go through the floor: its point rests on it, and the blade is drawn shorter, as
  // if it pointed into the scene (the scene is flat; this keeps the picture continuous)
  j.blen=len;
  if(j.tip[1]<2){
    j.tip=[j.tip[0],2];const dx=j.tip[0]-j.Hn[0],dy=j.tip[1]-j.Hn[1];
    j.blen=Math.max(8,Math.hypot(dx,dy));const w=deg(Math.atan2(dy,dx));j.grip=norm(j.grip+w-j.w);j.w=w;
  }
  return j;
}
const LIVE={fighter:liveFighter,gap:liveGap,station:liveStation,place:livePlace,walk:liveWalk,recover:liveRecover,
  blow:liveBlow,fall:liveFall,stand:liveStand,lower:liveLower,yieldTo:liveYield,press:livePress,react:liveReact,
  pose:livePose,part:livePart,style:liveStyle};

const api={LIVE,DIM,EASE,ik,solve,torso,Track,Fig,GRIP,SWORD_GUARD,DAGGER_GUARD,WEAPONS,SPACING,CENTRE,SEQUENCES,LEG,ARM,
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
