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
// turn: how far the shoulders are turned into the line (+: the weapon shoulder forward, the other back; 0 in the study)
// fs: how far the blade is turned toward the viewer (0 flat in the picture; .5 drawn at half length). A cut that comes
// round flat, at the chest or the legs, is foreshortened as it swings; it is always flat at contact.
const SCALAR=['ffx','ffy','bfx','bfy','px','py','lean','bend','head','w','turn','fs'];
const VEC=['h','o'];                       // weapon hand and off hand, measured from the shoulder
function torso(p){
  const a1=rad(p.lean),a2=rad(p.lean+p.bend),a3=rad(p.lean+p.bend+p.head);
  const P=[p.px,p.py],M=[P[0]+Math.sin(a1)*DIM.spine,P[1]+Math.cos(a1)*DIM.spine];
  const S=[M[0]+Math.sin(a2)*DIM.spine,M[1]+Math.cos(a2)*DIM.spine],tu=p.turn||0;
  // the two shoulders, seen from the side: turning into a blow brings the weapon shoulder forward and takes the other back
  return {P,M,S,wS:[S[0]+tu,S[1]-Math.abs(tu)*.15],oS:[S[0]-tu*.7,S[1]],Hd:[S[0]+Math.sin(a3)*DIM.neck,S[1]+Math.cos(a3)*DIM.neck]};
}
function solve(p,wlen){
  const t=torso(p),S=t.S,wS=t.wS,oS=t.oS;
  const fl=ik(t.P,[p.ffx,Math.max(0,p.ffy)],DIM.thigh,DIM.shin,-1),bl=ik(t.P,[p.bfx,Math.max(0,p.bfy)],DIM.thigh,DIM.shin,-1);
  const wa=ik(wS,[S[0]+p.h[0],S[1]+p.h[1]],DIM.upper,DIM.fore,1),oa=ik(oS,[S[0]+p.o[0],S[1]+p.o[1]],DIM.upper,DIM.fore,1);
  // The weapon is gripped, not hinged: its angle is the forearm's angle plus the turn of the wrist (wr).
  // Between keys the blade therefore rides with the forearm; it can only swing as far as a wrist can turn.
  const Hn=wa.end,fore=deg(Math.atan2(Hn[1]-wa.mid[1],Hn[0]-wa.mid[0])),w=p.wr==null?p.w:fore+p.wr;
  const bln=wlen*(1-clamp(p.fs||0,0,.8)),tip=[Hn[0]+Math.cos(rad(w))*bln,Hn[1]+Math.sin(rad(w))*bln];
  return {P:t.P,M:t.M,S,wS,oS,Hd:t.Hd,K:fl.mid,F:fl.end,bK:bl.mid,bF:bl.end,E:wa.mid,Hn,oE:oa.mid,oHn:oa.end,tip,
    w,grip:norm(w-fore),over:{ff:fl.over,bf:bl.over,h:wa.over,o:oa.over}};
}

// ----- tracks: one list of keys per channel -----
function Track(start){
  this.ch={};
  for(const c of SCALAR)this.ch[c]=[{t:-1e9,v:start[c]==null?0:start[c],e:'lin'}];
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
const ALL=['p','lean','bend','head','h','w','o','turn','fs'];
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
  // the wrist turns the short way between two keys: never a spin through a full turn because an angle wrapped past 180
  for(let i=1;i<out.length;i++){while(out[i].v-out[i-1].v>180)out[i].v-=360;while(out[i].v-out[i-1].v<-180)out[i].v+=360;}
  tr.ch.wr=out;
};
Fig.prototype.joints=function(t){return solve(this.tr.pose(t),this.weapon.len);};
Fig.prototype.W=function(p){return [this.hx+this.face*p[0],p[1]];};
Fig.prototype.L=function(w){return [this.face*(w[0]-this.hx),w[1]];};
// Put the weapon hand where the blade, held at angle w, has the point `along` its length on a world point.
// The body keys for time t must be written first: the hand is solved from where the shoulder will be.
Fig.prototype.aim=function(t,world,w,along,ease,opts){
  const tq=torso(this.tr.pose(t)),S=tq.S,dS=[tq.wS[0]-S[0],tq.wS[1]-S[1]],T=this.L(world);
  let h=[T[0]-Math.cos(rad(w))*along-S[0],T[1]-Math.sin(rad(w))*along-S[1]];
  const r=Math.hypot(h[0]-dS[0],h[1]-dS[1]);
  if(r>ARM-1){this.notes.push({t,what:'reach',short:+(r-ARM+1).toFixed(1)});const k=(ARM-1)/r;h=[dS[0]+(h[0]-dS[0])*k,dS[1]+(h[1]-dS[1])*k];}
  this.k(t,{h,w},ease,opts);return this;
};
// Key the weapon hand at h (from the shoulder) with the wrist turned r degrees from the forearm.
Fig.prototype.kg=function(t,h,r,ease,opts){
  const tq=torso(this.tr.pose(t)),S=tq.S,a=ik(tq.wS,[S[0]+h[0],S[1]+h[1]],DIM.upper,DIM.fore,1);
  const fore=deg(Math.atan2(a.end[1]-a.mid[1],a.end[0]-a.mid[0]));
  this.k(t,{h},ease,opts);this.tr.set('w',t,fore+r,(opts&&opts.wease)||ease);return this;
};
// Like aim, but the blade angle is not chosen freely: it is whatever the arm gives with the wrist turned r degrees.
// A blow lands with the weapon nearly in line with the forearm (r near 0); a parry holds it across (r large).
Fig.prototype.aimGrip=function(t,world,r,along,ease,opts){
  const tq=torso(this.tr.pose(t)),S=tq.S,wS=tq.wS,T=this.L(world),pref=opts&&opts.pref;
  // try every blade angle near the line to the target; keep the one whose wrist turn is closest to r with the hand in reach
  const w0=deg(Math.atan2(T[1]-S[1],T[0]-S[0]));let best=null;
  for(let w=w0-90;w<=w0+90;w+=.25){
    const h=[T[0]-Math.cos(rad(w))*along-S[0],T[1]-Math.sin(rad(w))*along-S[1]];
    const hr=Math.hypot(S[0]+h[0]-wS[0],S[1]+h[1]-wS[1]);
    if(hr>ARM-1||(opts&&opts.minR&&hr<opts.minR))continue;   // minR: a blow is struck with the arm at a working length
    const a=ik(wS,[S[0]+h[0],S[1]+h[1]],DIM.upper,DIM.fore,1);
    // pref: the blade angle the blow wants to arrive at (a cut comes down onto its target)
    const err=Math.abs(norm(deg(Math.atan2(a.end[1]-a.mid[1],a.end[0]-a.mid[0]))+r-w))+(pref==null?0:Math.abs(norm(w-pref)));
    if(!best||err<best.err)best={err,w,h};
  }
  if(!best){this.notes.push({t,what:'reach',short:1});return this.aim(t,world,w0,along,ease,opts);}
  this.k(t,{h:best.h},ease,opts);this.tr.set('w',t,best.w,(opts&&opts.wease)||ease);return this;
};
// the off hand toward a world point (as far as the arm goes)
Fig.prototype.reach=function(t,world,ease,opts){
  const tq=torso(this.tr.pose(t)),S=tq.S,dS=[tq.oS[0]-S[0],tq.oS[1]-S[1]],T=this.L(world);
  let o=[T[0]-S[0],T[1]-S[1]];const r=Math.hypot(o[0]-dS[0],o[1]-dS[1]);
  if(r>ARM-2){const k=(ARM-2)/r;o=[dS[0]+(o[0]-dS[0])*k,dS[1]+(o[1]-dS[1])*k];}
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
function daggerParry(A,B,tc,shield,alongA){
  B.hold(tc-330).rebase(tc-330,B.front);
  B.k(tc-200,{p:[-7,70],lean:13,bend:10},'io').k(tc-200,{h:[29,-17],w:48,o:[21,-20]},'io',ARC);
  B.k(tc-25,{p:[2,76],lean:4,bend:1,head:-4},'out').k(tc-25,{o:[14,-22]},'out',ARC);
  // where the blades meet: in front of and above B's head, on the line of the cut
  const hd=B.at(tc-25,'Hd'),C=[hd[0]+B.face*50,hd[1]+6];
  if(shield)B.reach(tc-25,C,'out3',ARC);   // a shield meets it with the off hand (stand-in: no shield phrase yet)
  else{B.hold(tc-170,['h','w']);
    // the dagger's own parry; a longer weapon held across has to be solved from the arm
    if(B.weapon.len<=50)B.aim(tc-25,C,104,15,'out3',ARC);else B.aimGrip(tc-25,C,70,Math.round(B.weapon.len*.3),'out3',ARC);}
  A.aimGrip(tc,C,8,Math.round(A.weapon.len*(alongA||.67)),'in',{arc:true,wease:'in3'});
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
  // a shield (the studies: fig.shieldR) is carried on the off hand, behind the body, as the stage draws it
  const sh=fig.shieldR?X(j.oHn).split(','):null;
  return '<g class="ps-fig ps-'+(fig.id==='a'?'left':'right')+'"><g class="ps-back">'
    +bone(j.P,j.bK,j.bF,9,cls('lleg'))+bone(j.oS||j.S,j.oE,j.oHn,8,cls('larm'))
    +(sh?'<circle cx="'+sh[0]+'" cy="'+sh[1]+'" r="'+fig.shieldR+'" class="ps-shield"/>':'')+'</g>'
    +line(j.M,j.P,12,cls('abdomen'))+line(j.S,j.M,12,cls('chest'))+bone(j.P,j.K,j.F,10,cls('rleg'))
    // a wound to one segment (the studies): only that segment is marked
    +(wounds&&wounds.rthigh?line(j.P,j.K,10,cls('rthigh')):'')
    +'<circle cx="'+hc[0]+'" cy="'+hc[1]+'" r="'+DIM.headR+'" stroke-width="5" class="ps-head '+cls('head')+'"/>'
    +bone(j.wS||j.S,j.E,j.Hn,8,cls('rarm'))+(wounds&&wounds.rfore?line(j.E,j.Hn,8,cls('rfore')):'')
    +line(pm,j.tip,4,'ps-shaft')+line([g[0]-d[1]*9,g[1]+d[0]*9],[g[0]+d[1]*9,g[1]-d[0]*9],4,'ps-guard')+'</g>';
}
// everything a page needs to draw one moment of a sequence (sequence time t)
function frame(seq,t){
  const out={};
  for(const id of ['a','b']){
    const f=seq.fighters[id],wounds={};
    for(const w of seq.wounds||[])if(w.who===id&&t>=w.t)wounds[w.part]=w.level;
    out[id]={joints:f.live?livePose(f,t):f.joints(t),wounds,svg:''};out[id].svg=figureSvg(f,out[id].joints,wounds);
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
  // the measure: one step of the front foot (with a gaining step if needed) reaches with the middle of the longer blade
  const g=len=>Math.round(186+.6*(len-92)),long=g(Math.max(wa.len,wb.len)),short=g(Math.min(wa.len,wb.len));
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
  for(const c of SCALAR)f.tr.set(c,t+1,p[c]==null?0:p[c],'lin');
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
// A struck fighter reacts where it was struck, then catches its weight. The part that was hit moves first; the rest follows.
//   head: the head snaps back, the empty hand comes up to the face      chest: the chest goes back, a foot catches it
//   abdomen: the body folds over the blow                                weapon arm: the arm is knocked back and down
//   other arm: it is pulled in and the shoulders turn away               legs: that knee gives and the hips drop over it
function liveReact(D,tc,lost,loc){
  D.hold(tc);D.ox=0;
  const ff=D.tr.val('ffx',tc),bf=D.tr.val('bfx',tc),px=D.tr.val('px',tc),py=D.tr.val('py',tc),k=Math.min(1,(lost||1)/6);
  const weaponArm=loc==='rarm'||loc==='larm'?((loc==='rarm')!==!!D.swap):null;
  let nf=Math.max(bf+60,ff-22),settleY=74;
  if(loc==='head'){
    D.k(tc+60,{head:24+10*k},'out3').k(tc+110,{lean:-6-6*k,bend:-6},'out').k(tc+100,{px:px-6-6*k},'out');
    D.k(tc+130,{o:[12,26]},'out',ARC);D.kg(tc+200,[14,-40],-4,'io',ARC);
  }else if(loc==='abdomen'){
    D.k(tc+90,{bend:20+8*k,lean:4,head:-16,px:px-10-6*k,py:py-5},'out3').k(tc+120,{o:[12,-36]},'out',ARC);
    D.kg(tc+200,[8,-48],-8,'io',ARC);
  }else if(weaponArm===true){
    D.kg(tc+140,[-4,-34],-14,'out',ARC).k(tc+90,{turn:-10,lean:-3},'out').k(tc+100,{px:px-5},'out');
    D.k(tc+160,{o:[18,-26]},'out',ARC);
  }else if(weaponArm===false){
    D.k(tc+80,{o:[4,-24],turn:-8},'out3',ARC).k(tc+110,{lean:-4,px:px-5},'out');
  }else if(loc==='rleg'||loc==='lleg'){
    // the struck knee gives: the hips drop over it and the body leans to keep its balance
    const front=loc==='rleg';
    D.k(tc+100,{py:py-10-8*k,px:px+(front?2:-8),lean:front?10:-2,bend:6,head:-10},'out3');
    D.kg(tc+200,[14,-42],-6,'io',ARC).k(tc+140,{o:[22,-20]},'out',ARC);
    nf=front?Math.max(bf+58,ff-8):ff;settleY=71;
  }else{
    D.k(tc+110,{lean:-5-8*k,bend:-8,head:15},'out3').k(tc+90,{px:px-6-8*k,py:70},'out');
    D.kg(tc+200,[10,-45],-6,'io',ARC).k(tc+150,{o:[16,-49]},'out',ARC);
  }
  // the weight is caught: the front foot comes back under it, and the fighter ends closed over the wound
  const base=D.guard.ffx-D.guard.bfx,nb=nf-bf>base+12?nf-base-4:bf,mid=(nf+nb)/2;
  if(Math.abs(nf-ff)>3)D.step('ff',tc+110,tc+340,nf,8);
  if(nb!==bf)D.step('bf',tc+360,tc+540,nb,5);
  D.k(tc+360,{px:mid+3,py:settleY,lean:4,bend:12,head:-4,turn:-3},'io').k(tc+560,{px:mid+1,py:settleY+2,lean:9,bend:11,head:-13,turn:0},'io');
  D.k(tc+560,{h:SWORD_HURT.h,w:SWORD_HURT.w},'io',ARC).k(tc+560,{o:SWORD_HURT.o},'io',ARC);
  return tc+560;
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
// a cut at close measure lands with the middle of the blade, so it can come down onto its target
const liveAlong=(A,hit)=>A.style==='thrust'?A.weapon.len:Math.round(A.weapon.len*(hit?.72:.67));
// How far the front foot has to go for the weapon to reach a world point (fighter frame).
function liveStride(A,t,T){
  // a low target (a knee) is further from the shoulder than its floor distance says
  const want=A.L(T)[0]-(A.style==='thrust'?50:42)-liveAlong(A,true)+Math.max(0,(120-T[1])*.4);
  return want-A.tr.val('ffx',t);
}
// The cut that misses, or the thrust that falls short: a half step from the defender, and the follow-through.
function liveMiss(A,D,td,s,out){
  if(A.style==='cut'){
    const tc=out.tc;
    // the defender slips: the weight goes back and the chest is taken out of the line, then the front foot follows
    const ta=Math.max(tc-300,td);D.hold(ta);D.ox=0;
    const dff=D.tr.val('ffx',ta),dbf=D.tr.val('bfx',ta),dpx=D.tr.val('px',ta);
    D.step('bf',ta+10,ta+150,dbf-24,5);
    D.k(tc-30,{px:dpx-18,py:74,lean:-6,bend:2,head:4,turn:-4},'out');
    // the weapon is drawn up and back out of the line, so the cut passes under it and in front of the chest
    D.hold(tc-200,['h','w']).k(tc-50,{h:[14,-2],w:78},'out',ARC).k(tc+320,{h:SWORD_POINT.h,w:SWORD_POINT.w},'io',ARC);
    D.step('ff',tc-40,tc+140,dff-18,6);
    D.k(tc+320,{px:dpx-21,py:75,lean:6,bend:6,head:-10,turn:0},'io');
    if(s.fall)out.end=liveFallAt(D,tc+160);
    // the cut passes in front of the chest; nothing stops it, so it runs on down and the body is carried after it
    const ch=livePart(D,tc,'chest'),P=[ch[0]+D.face*36,ch[1]-4];
    A.aimGrip(tc,P,6,Math.round(A.weapon.len*.89),'in',{arc:true,wease:'in',pref:-22,minR:40});
    out.contacts.push({t:tc,kind:'miss',at:P});
    A.ox=0;const px=A.tr.val('px',tc),py=A.tr.val('py',tc),bf=A.tr.val('bfx',tc);
    A.k(tc+130,{px:px+5,py:py-2,lean:21,bend:9,head:-18,turn:13},'out');
    {const ffe=A.tr.val('ffx',tc+60),base=A.guard.ffx-A.guard.bfx,nb=Math.min(bf+16,ffe-base+4);
     if(nb>bf+4)A.step('bf',tc+70,tc+300,nb,6);}
    A.k(tc+330,{px:px+12,py:72,lean:14,bend:7,head:-14,turn:8},'io').k(tc+330,{o:[-26,-46]},'io',ARC);
    // on its way down the point passes short of the defender's front knee
    {const kn=D.at(tc+80,'K'),kx=A.L(kn)[0];A.aimGrip(tc+80,A.W([kx-36,Math.max(14,kn[1]-6)]),-4,A.weapon.len,'lin',{arc:true,pref:-42,minR:36});}
    liveSpent(A,D,tc+290,'out');
    out.end=Math.max(out.end,tc+340);return;
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
// The cut at close measure. 380 ms from stillness to contact, and the target shapes it from the first frame
// (owner's review, second pass, 2026-11-12): the chamber, the stance and the line of the blade all say where it is going.
//   high (head)   the hilt comes up beside the face, the blade laid back at about 45 degrees; the body stays tall and the
//                 cut comes down steeply
//   mid (body)    the hilt stays at the rear shoulder, the blade laid back flat; the shoulders turn further away and the
//                 cut comes round level (drawn shorter as it swings toward the viewer), arriving nearly flat
//   low (legs)    the hips sink and the chest pitches forward; the hilt drops to the hip with the blade back and down,
//                 and the cut sweeps round low into the knee
// Rhythm: an unhurried preparation that arrives and settles; the blade waits behind while the foot and hips go; then
// one accelerating swing to contact, with no stop on the way. The caller aims the blade at tc; the follow-through slows.
const CUT_ZONE=loc=>loc==='head'?'high':/leg$/.test(loc||'')?'low':'mid';
const CHAMBER={
  high:{h:[5,-8],w:148,body:{py:77,lean:-1,bend:-2,head:-4,turn:-7},strike:{lean:15,bend:6,head:-12,turn:11},dy:0,fs:0},
  mid:{h:[-8,-20],w:174,body:{py:75,lean:2,bend:0,head:-8,turn:-12},strike:{lean:15,bend:4,head:-12,turn:14},dy:-2,fs:.5},
  low:{h:[-4,-42],w:-152,body:{py:72,lean:11,bend:6,head:-14,turn:-9},strike:{lean:26,bend:10,head:-22,turn:12},dy:-6,fs:.4}
};
const CUT_LEAD=520;   // from stillness to contact
function liveCut(A,tc,stride,gain,zone){
  const Z=CHAMBER[zone||'high'],f=stride/34,t0=tc-CUT_LEAD;
  A.hold(t0).rebase(t0,A.front);
  // a gaining step: the rear foot comes up during the preparation, so the front foot's step can stay short
  const g=gain>4?gain:0;
  if(g)A.step('bf',t0+10,tc-290,A.tr.val('bfx',t0)-A.ox+g,5);
  // the hips go forward with the step but stay over the base: never past the front knee
  const bf1=A.tr.val('bfx',t0)-A.ox+g,ff1=A.front+stride;
  const p0=A.tr.val('px',t0)-A.ox+g*.55,p1=Math.min(p0+4+22*f,ff1-24,(ff1+bf1)/2+14),y1=Math.max(66,78-7*f+Z.dy),pb=p0-8;
  // preparation (controlled): the weight settles back over the rear foot and the shoulders turn away; it arrives and
  // settles, and the hands are still finishing the chamber when the legs begin
  A.k(tc-280,{p:[pb,Z.body.py],lean:Z.body.lean,bend:Z.body.bend,head:Z.body.head,turn:Z.body.turn},'io');
  A.k(tc-255,{h:Z.h,w:Z.w},'io',ARC).k(tc-255,{o:[24,-8]},'io',ARC);
  // the blade waits in the chamber while the foot and hips go (a little drift, not a hold)
  A.k(tc-135,{h:[Z.h[0]+2,Z.h[1]-1],w:Z.w-4},'lin',ARC);
  if(stride>3)A.step('ff',tc-280,tc-90,A.front+stride,Z===CHAMBER.low?4:6);
  // commitment (fast): the rear leg drives; the hips gather speed, then the front knee catches them into contact.
  // The two pieces meet at the same speed, so the drive is one movement, not two.
  A.k(tc-200,{px:pb+(p1-pb)*.3,py:Z.body.py-1},'in').k(tc,{p:[p1,y1]},'out');
  A.k(tc-130,{lean:Z.body.lean+4,turn:Z.body.turn+5,bend:Z.body.bend+1,head:Z.body.head-2},'io');
  A.k(tc,{lean:Z.strike.lean,bend:Z.strike.bend,head:Z.strike.head,turn:Z.strike.turn},'in');
  // a flat cut swings toward the viewer on its way round, then lies flat again on the target
  if(Z.fs){A.k(tc-135,{fs:0},'lin').k(tc-60,{fs:Z.fs},'out').k(tc,{fs:0},'in');}
  A.k(tc-130,{o:[16,-16]},'io',ARC).k(tc,{o:[-30,-42]},'in',ARC);
}
// After the contact the rear foot comes up behind a long step, so the base is a stance again by the end of the follow-through.
function liveCutFollow(A,tc){
  const ox=A.ox;A.ox=0;
  const ff=A.tr.val('ffx',tc),bf=A.tr.val('bfx',tc),base=A.guard.ffx-A.guard.bfx;
  if(ff-bf>base+10)A.step('bf',tc+60,tc+260,ff-base-4,6);
  A.ox=ox;
}
// Where a cut comes down onto each part (blade angle in the attacker's frame)
const CUT_PREF={head:-8,chest:-14,abdomen:-22,rarm:-18,larm:-18,rleg:-50,lleg:-52};
// The spent sword: the point comes down on the attacker's own side, short of the opponent's nearest foot, so a blade that
// missed or was turned never ends across the other fighter. This is the pose the next movement starts from.
function liveSpent(A,D,t,ease){
  A.ox=0;
  const near=Math.min(A.L(D.at(t,'F'))[0],A.L(D.at(t,'bF'))[0]),ff=A.tr.val('ffx',t);
  const tip=[Math.min(near-34,ff+46),12];
  A.aimGrip(t,A.W(tip),-6,A.weapon.len,ease||'out',{arc:true,pref:-64,minR:36});
  return tip;
}
// ----- the defender's side of a cut (owner's review, second pass): nobody stands and waits to be hit -----
// Where a blade meets the cut, for each line: in front of and above the head, in front of the chest, or low over the
// front knee.
function liveParryPoint(D,t,zone){
  const part=zone==='high'?D.at(t,'Hd'):zone==='low'?D.at(t,'K'):D.at(t,'chest');
  return [part[0]+D.face*(zone==='low'?40:46),part[1]+(zone==='high'?8:zone==='low'?22:6)];
}
// the blade angle (defender's frame) that sets the guard across each line: up and across for a high or middle cut,
// point down for a low one
const PARRY_W={high:100,mid:84,low:-78};
// where the weapon hand has to be for the blade, held at angle w, to have the point `along` its length on a world
// point (as far as the arm goes); nothing is keyed
function liveHandFor(D,t,world,w,along){
  const tq=torso(D.tr.pose(t)),S=tq.S,dS=[tq.wS[0]-S[0],tq.wS[1]-S[1]],T=D.L(world);
  let h=[T[0]-Math.cos(rad(w))*along-S[0],T[1]-Math.sin(rad(w))*along-S[1]];
  const r=Math.hypot(h[0]-dS[0],h[1]-dS[1]);
  if(r>ARM-1){const k=(ARM-1)/r;h=[dS[0]+(h[0]-dS[0])*k,dS[1]+(h[1]-dS[1])*k];}
  return h;
}
// a weapon-hand position (from the shoulder) pulled in to what the arm reaches at time t
function liveArmReach(F,t,h){
  const tq=torso(F.tr.pose(t)),dS=[tq.wS[0]-tq.S[0],tq.wS[1]-tq.S[1]],r=Math.hypot(h[0]-dS[0],h[1]-dS[1]);
  if(r<=ARM-3)return h;const k=(ARM-3)/r;return [dS[0]+(h[0]-dS[0])*k,dS[1]+(h[1]-dS[1])*k];
}
// The defender reads the preparation: the weight comes back a little and the weapon goes to a guard, wherever the last
// exchange left it. Ends at tc-150, when the defence proper begins. The guard is short (the point at the attacker's
// face, the hand in front of the chest), so the attacker can step in without walking onto it.
const READ_GUARD={h:[22,-22],w:62};
// The guard a hit gets past (owner's review: a hit is an attack that finds an opening). The defender covers one line
// and the cut takes another: over a middle guard to the head; under a raised guard to the body or the legs.
const OPEN_GUARD={high:{h:[18,-42],w:-8},mid:{h:[14,8],w:82},low:{h:[16,-8],w:74}};
function liveRead(D,tc,guard){
  const t0=tc-330;D.hold(t0);D.ox=0;
  const px=D.tr.val('px',t0),py=D.tr.val('py',t0),G=guard||(D.style==='thrust'?DAGGER_OUT:READ_GUARD);
  const l0=D.tr.val('lean',t0);
  D.k(tc-200,{px:px-3,py:Math.min(py,76),lean:Math.min(l0,D.guard.lean+1),turn:-2},'io');
  D.k(tc-200,{h:liveArmReach(D,tc-200,G.h),w:G.w},'io',ARC).k(tc-200,{o:[16,-24]},'io',ARC);
  D.hold(tc-150,['h','w','px','py','lean','bend','head','turn']);
  return px;
}
// A parry that intercepts: the guard is set across the line before the cut arrives (fast, decisive, then waiting),
// the cut lands on it near its point, and the defender binds: the hilt drives forward and down and the attacker's
// blade is carried with it before it falls away. Returns the meeting point.
function liveParryCut(A,D,tc,zone,alongA,bind){
  const px=liveRead(D,tc),dl=Math.round(D.weapon.len*.3);
  D.k(tc-50,{px:px-7,lean:D.guard.lean-2,turn:-4},'out');
  const C=liveParryPoint(D,tc-50,zone);
  D.k(tc-50,{h:liveHandFor(D,tc-50,C,PARRY_W[zone],dl),w:PARRY_W[zone]},'out3',ARC).k(tc-50,{o:[12,-28]},'out',ARC);
  D.hold(tc);
  A.aimGrip(tc,C,8,Math.round(A.weapon.len*alongA),'in',{arc:true,wease:'in'});
  // the stopped blade: its weight goes into the defender's arm and knees
  D.k(tc+40,{py:D.tr.val('py',tc)-3},'out');
  if(bind){
    // the bind: the parrying blade turns down and forward, the cut is carried with it
    const t2=tc+90,hb=D.tr.val('h',tc);
    D.k(t2,{px:px-2,lean:D.guard.lean+4,turn:3},'out').k(t2,{h:liveArmReach(D,t2,[hb[0]+10,hb[1]-(zone==='low'?6:26)]),w:PARRY_W[zone]-(zone==='low'?10:100)},'out',ARC);
    // the attacker's blade is carried once both bodies are written (bindCarry)
    A.bind={t:t2,D,zone};
  }
  return C;
}
// After both fighters' keys are written: the attacker's blade rides the parrying blade down for a moment.
function liveBindCarry(A){
  const b=A.bind;if(!b)return;A.bind=null;A.ox=0;
  const P=b.D.at(b.t,'blade',Math.round(b.D.weapon.len*.3)),S=torso(A.tr.pose(b.t)).S,Q=A.L(P);
  // the blades slide on each other: the closer the bind comes, the nearer the hilt it bears on the attacking blade
  const along=Math.max(20,Math.min(A.weapon.len*.75,Math.hypot(Q[0]-S[0],Q[1]-S[1])-42));
  A.aimGrip(b.t,P,-2,Math.round(along),'out',{arc:true});
}
// A defence that is beaten: the defender sees the cut and goes to cover the line, but the blade gets there first.
// At contact the guard is still on its way (about half way), clear of the cutting blade, so the hit reads as an
// attack that beat a defence, not as a parry.
const LATE_U={high:.2,mid:.25,low:.25};
function liveLateGuard(A,D,tc,zone){
  const px=liveRead(D,tc,D.style==='thrust'?null:OPEN_GUARD[zone]),dl=Math.round(D.weapon.len*.3),h0=D.tr.val('h',tc-150),w0=D.tr.val('w',tc-150);
  const C=liveParryPoint(D,tc,zone),hp=liveHandFor(D,tc,C,PARRY_W[zone],dl),u=LATE_U[zone];
  D.k(tc,{h:[h0[0]+(hp[0]-h0[0])*u,h0[1]+(hp[1]-h0[1])*u],w:w0+(PARRY_W[zone]-w0)*u},'in',ARC);
  // the body only starts to give: the weight is still over the feet when the blade arrives
  D.k(tc,{turn:-3},'in');
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
  // a miss is a blow that falls short: the attacker commits a little less, a partial parry takes the defender's body back
  let need=liveStride(A,t1,livePart(D,t1,s.loc||'chest'))+(/^partial/.test(o)?14:0)-(A.style==='cut'&&/^(miss|fumble|evaded)$/.test(o)?18:0);
  // a cut reaches with one step of the front foot (up to 34), or a gaining step of the rear foot first (up to 36 more)
  const max=A.style==='cut'?34+50*.6:26;
  if(need>max){t1=liveWalk(A,t1,need-max+6);need=max-6;}
  const stride=Math.max(A.style==='cut'?8:12,Math.min(A.style==='cut'?34:max,need));out.stride=stride;
  if(A.style==='cut'){out.tc=t1+CUT_LEAD;liveCut(A,out.tc,stride,Math.max(0,(need-stride)/.6),CUT_ZONE(s.loc||'chest'));}
  else{
    // a long lunge brings the rear foot up behind it, so the base never gets wider than a leg can hold
    A.rebase(t1,A.front);out.tc=t1+300;
    const bf0=A.tr.val('bfx',t1)-A.ox,front=A.front+stride,base=A.guard.ffx-A.guard.bfx;
    daggerLunge(A,t1,out.tc,front,front-bf0>base+8?front-base-4:null);}
  const tc=out.tc;
  if(o==='evaded'||o==='miss'||o==='fumble'){liveMiss(A,D,td,s,out);A.grip();D.grip();return out;}
  const parried=/parry|ward|parried/.test(o);
  if(!parried&&A.style==='cut'&&!s.shield)liveLateGuard(A,D,tc,CUT_ZONE(s.loc||'chest'));
  let tb=tc;   // when the blade reaches the body
  if(parried){
    let C;
    // the parry takes the cut near its point, so the blade that is stopped never reaches past the defender's guard
    if(A.style==='cut')C=s.shield?daggerParry(A,D,tc,true,.85):liveParryCut(A,D,tc,CUT_ZONE(s.loc||'chest'),.85,!/^partial/.test(o));
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
        // turned down and away: after the bind the sword's own weight carries it down beside its owner's front foot,
        // and the defender's point comes back up into line (the opening is now the defender's)
        liveCutFollow(A,tc);
        {const kn=D.at(tc+240,'K'),kx=A.L(kn)[0];A.aimGrip(tc+240,A.W([kx-36,Math.max(14,kn[1]-4)]),-4,A.weapon.len,'in',{arc:true,pref:-55,minR:34});}
        D.ox=0;const dpx=D.tr.val('px',tc+90);
        D.k(tc+320,{px:dpx+2,py:73,lean:9,bend:5,head:-10,turn:0},'io').k(tc+320,{o:[24,-16]},'io',ARC);
        if(!s.shield)D.k(tc+320,{h:SWORD_POINT.h,w:SWORD_POINT.w+6},'io',ARC);
        {const ox=A.ox;A.ox=0;const mid=(A.tr.val('ffx',tc+400)+A.tr.val('bfx',tc+400))/2;
         A.k(tc+150,{px:mid+12,py:70,lean:19,bend:8,head:-17,turn:6},'out').k(tc+330,{px:mid+9,py:72,lean:15,bend:7,head:-15,turn:3},'io');A.ox=ox;}
        A.k(tc+240,{o:[-40,-40]},'out',ARC);
        liveBindCarry(A);liveSpent(A,D,tc+340,'out');
        out.end=tc+340;
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
  const pref=CUT_PREF[s.loc||'chest'];
  if(A.style==='cut')A.aimGrip(tb,T,6,liveAlong(A,true),parried?'io':'in',parried?{pref,minR:40}:{arc:true,wease:'in',pref,minR:40});
  else A.aimGrip(tb,T,0,liveAlong(A),parried?'io':'in');
  // the effects are drawn where the blade is: after a partial parry it can arrive a little short of the part
  const body={t:tb,kind:'body',at:T,part:T},len0=A.weapon.len;out.contacts.push(body);
  // the attacker's follow-through
  if(A.style==='cut'){
    // the cut is drawn out of the target and comes down on the attacker's own side (written after the defender's reaction)
    liveCutFollow(A,parried?tc:tb);A.ox=0;const pa=A.tr.val('px',tb);
    // drawn back out of the target along its own line before it falls, so it does not sweep through the defender's legs
    // the cut carries on through the target (slowing), drawn back and down along its own line, then settles
    {const hb=A.tr.val('h',tb),wb=A.tr.val('w',tb);A.k(tb+120,{h:[hb[0]-12,hb[1]-12],w:wb-20},'lin',ARC);}
    // the hips settle between the feet, the weight still forward over the front knee
    const mid=(A.tr.val('ffx',tb+400)+A.tr.val('bfx',tb+400))/2;
    A.k(tb+150,{px:Math.min(pa+3,mid+16),py:70,lean:20,bend:8,head:-18,turn:12},'out').k(tb+320,{px:mid+10,py:72,lean:15,bend:7,head:-14,turn:7},'io');
    out.end=tb+320;out.spend=true;
  }else{
    A.ox=0;const pa=A.tr.val('px',tb);
    A.k(tb+90,{px:pa-4,py:68},'out').k(tb+270,{h:[15,-30],w:22,lean:18,bend:6,head:-16},'io');
    out.end=tb+270;
  }
  // the defender
  if(s.defeated||s.fall)out.end=Math.max(out.end,liveFallAt(D,tb));
  else if(s.lost>0)out.end=Math.max(out.end,Math.min(tb+340,liveReact(D,tb,s.lost,s.loc)));
  else out.end=Math.max(out.end,liveGive(D,tb));
  if(out.spend)liveSpent(A,D,tb+360,'out');
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
  // balance: a leg never stretches past its length to reach a planted foot; the hips sink into a deeper stance instead
  let j=solve(p,f.weapon.len);
  for(let i=0;i<6&&Math.max(j.over.ff,j.over.bf)>.3;i++){p.py-=Math.max(j.over.ff,j.over.bf)*1.1;j=solve(p,f.weapon.len);}
  const len=f.weapon.len;
  // a long blade turned down cannot go through the floor: its point rests on it, and the blade is drawn shorter, as
  // if it pointed into the scene (the scene is flat; this keeps the picture continuous)
  j.blen=Math.hypot(j.tip[0]-j.Hn[0],j.tip[1]-j.Hn[1]);
  if(j.tip[1]<2){
    j.tip=[j.tip[0],2];const dx=j.tip[0]-j.Hn[0],dy=j.tip[1]-j.Hn[1];
    j.blen=Math.max(8,Math.hypot(dx,dy));const w=deg(Math.atan2(dy,dx));j.grip=norm(j.grip+w-j.w);j.w=w;
  }
  return j;
}
// The ordinary sword exchange as the live stage writes it, laid out for the study page (?seq=sword): the same LIVE
// phrases the Pits uses, one exchange after another, each starting from the pose the last one ended in.
function seqSword(){
  const W={kind:'blade',len:92},gap=liveGap(W,W,'long'),F={a:liveFighter('a',W),b:liveFighter('b',W)};
  F.a.live=F.b.live=true;livePlace(F.a,0,gap,'guard');livePlace(F.b,0,gap,'guard');
  const Q=newSeq('sword','Sword against sword (the live Pits)');Q.names={a:'Left',b:'Right'};
  mark(Q,0,'both','On guard at close measure');
  const HIT={chest:'Hit: the chest goes back, then a foot comes back to catch the weight',head:'Hit: the head snaps back and the empty hand comes up',
    rleg:'Hit: the struck knee gives and the hips drop over it'};
  const steps=[['a','miss','chest','A cut that misses'],['b','parried','head','A cut that is parried'],['a','wound','chest','A cut to the chest'],
    ['b','wound','head','A cut to the head'],['a','wound','rleg','A cut to the leg'],['b','kill','chest','The blow that ends it']];
  let t=150;
  for(const [aid,o,loc,label] of steps){
    const kill=o==='kill',did=aid==='a'?'b':'a';
    Q.exchanges.push({t,attacker:aid,label,by:Q.names[aid]});
    const r=liveBlow(F,aid,t,{outcome:kill?'wound':o,loc,lost:kill?9:o==='wound'?4:0,defeated:kill}),tc=r.tc;
    mark(Q,tc-380,aid,'Preparation: the weight settles onto the rear foot, the shoulders turn away, the hilt comes to the shoulder with the blade laid back');
    mark(Q,tc-250,aid,'Commitment: the front foot steps and the rear leg drives the hips; the blade is still back');
    mark(Q,tc-140,aid,'Strike: the shoulders come round, the arm goes long, the blade arrives last');
    for(const c of r.contacts){
      if(c.kind==='miss'){mark(Q,c.t,did,'Miss: the defender slips back and the cut passes in front of the chest; it runs on down on the attacker\'s own side');continue;}
      Q.stops.push({t:c.t,d:80});Q.fx.push({t:c.t,kind:c.kind==='clash'?'clash':'wound',at:c.at});
      if(c.kind==='clash')mark(Q,c.t,did,'Parry: the cut is met near its point in front of the head, then turned down beside its owner');
      else{Q.wounds.push({t:c.t,who:did,part:loc,level:kill?'major':'minor'});mark(Q,c.t,did,kill?'The blow lands and the fighter goes straight down: no recovery':HIT[loc]);}
    }
    if(kill){liveLower(F[aid],r.end);mark(Q,r.end,aid,'The winner lowers the point and watches');t=r.end+900;break;}
    Q.pauses.push({t:r.end,label:'The exchange is resolved. In the Pits the scene stops here for the next decision; the next movement starts from this pose.'});
    t=r.end+60;
  }
  Q.fighters=F;Q.marks.sort((x,y)=>x.t-y.t);Q.dur=t;Q.notes=[];
  return Q;
}
const LIVE_SEQUENCES={sword:seqSword};
const LIVE={fighter:liveFighter,gap:liveGap,station:liveStation,place:livePlace,walk:liveWalk,recover:liveRecover,
  blow:liveBlow,fall:liveFall,stand:liveStand,lower:liveLower,yieldTo:liveYield,press:livePress,react:liveReact,
  pose:livePose,part:livePart,style:liveStyle,along:liveAlong,CUT_PREF,CUT_LEAD,zone:CUT_ZONE,sequence:seqSword};

const api={LIVE,DIM,EASE,ik,solve,torso,Track,Fig,GRIP,SWORD_GUARD,DAGGER_GUARD,WEAPONS,SPACING,CENTRE,SEQUENCES,LEG,ARM,
  // display time (with the impact holds) -> sequence time
  seqTime(seq,td){let t=td;for(const s of seq.stops||[]){if(t<=s.t)break;t=Math.max(s.t,t-s.d);}return t;},
  shownDur(seq){return seq.dur+(seq.stops||[]).reduce((n,s)=>n+s.d,0);},
  // sequence time -> display time (a pause point or a mark on the scrubber)
  shownAt(seq,t){let td=t;for(const s of seq.stops||[])if(t>s.t)td+=s.d;return td;},
  GROUND,figureSvg,frame,
  build(id){return (SEQUENCES[id]||LIVE_SEQUENCES[id]||SEQUENCES.fight)();}
};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.PitsMotion=api;
})(typeof window!=='undefined'?window:globalThis);
