// The Pits: spring-driven exchange study (one attack -> parry -> counter -> wound -> recovery).
// PRESENTATION ONLY: nothing here rolls or decides. The results are fixed in advance and labelled as such on the page.
//
// Reference: David Rosen, "An Indie Approach to Procedural Animation" (GDC 2014), slides only (the recording was not
// watched). The ideas taken from the slide headings, and how they are used here:
//   - few key poses, spring interpolation: each fighter has a handful of authored key poses; every body part follows
//     its target with its own damped spring, so parts arrive at different times and carry momentum through a key
//     instead of all stopping at it;
//   - overlapping simple systems: the feet are explicit steps (a planted foot never moves), the legs and arms are
//     solved (the rig from pits-motion.js), and contacts are constraints applied on top of the springs;
//   - impact compression and recoil springs: a parry or a hit is a velocity impulse into the springs (knees give,
//     the chest goes back, the arm is knocked), not a separate keyed pose.
// The whole exchange is simulated once at a fixed 1 ms step and stored, so the picture is still a function of the time
// on the bar: it can be paused, stepped frame by frame and replayed exactly.
(function(root){
const PM=root.PitsMotion||(typeof require==='function'?require('./pits-motion.js'):null);
const {DIM,solve,torso,SWORD_GUARD,DAGGER_GUARD,WEAPONS,GROUND,ARM}=PM;
const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
const norm=a=>((a+180)%360+360)%360-180;
const DT=1,REC=2,WRIST=[PM.GRIP.min,PM.GRIP.max],LEGLEN=PM.LEG;                         // simulation step and recording interval (ms)

// ----- the springs: [frequency (Hz), damping ratio] per channel -----
// The hips are heavy and well damped; the chest a little looser; the head and the empty hand follow and overshoot;
// the weapon hand is quick; the wrist (the blade's angle in the hand) is quickest and least damped, so it whips last.
const CH=['px','py','lean','bend','head','turn','hx','hy','ox','oy','wr'];
const SPRING={px:[3.2,.95],py:[3.4,.9],lean:[2.9,.8],bend:[2.7,.72],head:[2.4,.62],turn:[3,.8],
  hx:[3.8,.8],hy:[3.8,.8],ox:[2.4,.6],oy:[2.4,.6],wr:[3.2,.75]};
// Order of the body: a new key reaches each part this many ms later. Legs and hips first, the blade last.
const LAG={attack:{px:0,py:0,turn:25,lean:35,bend:50,head:70,hx:60,hy:60,ox:40,oy:40,wr:90},
  // a parry or a cover: the blade first, the body settles under it
  cover:{wr:0,hx:0,hy:0,ox:20,oy:20,head:40,lean:60,bend:70,turn:60,px:90,py:90},
  together:{px:0,py:0,turn:0,lean:0,bend:0,head:0,hx:0,hy:0,ox:0,oy:0,wr:0}};

// ----- a fighter being written -----
function Fighter(id,hx,face,weapon,guard){
  this.id=id;this.hx=hx;this.face=face;this.weapon=weapon;this.guard=guard;
  this.feet={ff:[],bf:[]};this.home={ff:guard.ffx,bf:guard.bfx};
  this.keys=[];this.impulses=[];this.pins=[];this.events=[];
  const p={...guard,h:guard.h.slice(),o:guard.o.slice()};
  this.start=flat(p,wristFor(p,guard.w,weapon.len));
}
// a key pose in the fighter's own frame. w is the blade's angle as seen (converted to a wrist turn from the key's own arm)
// opt.snap: the parts this key moves get there faster and without overshoot (a strike: the easing kept extreme, the
// fast part short), until the next key for that part. A number is how much faster (default 1.8).
Fighter.prototype.key=function(t,pose,order,opt){
  this.keys.push({t,pose,order:order||'attack',snap:opt&&opt.snap?(opt.snap===true?1.8:opt.snap):0});return this;};
Fighter.prototype.step=function(foot,t0,t1,x,lift){this.feet[foot].push({t0,t1,x,lift:lift==null?8:lift});return this;};
// A step with its weight handled. Before the foot leaves, the hips go over the other foot (that leg is loaded, the
// knees give a little: the push); the foot lifts, travels and is set down; then the hips move onto the new base.
// settle: where between the support foot and the placed foot the weight ends (0 = on the support foot).
Fighter.prototype.walk=function(foot,t0,t1,x,opt){
  const o=opt||{},other=foot==='ff'?'bf':'ff',sup=footX(this,other,t0),from=footX(this,foot,t0),py=o.py==null?74:o.py;
  this.step(foot,t0,t1,x,o.lift==null?10:o.lift);
  this.key(t0-(o.lead==null?170:o.lead),{px:sup+(from-sup)*(o.load==null?.2:o.load),py:py-3});
  // the hips travel while the foot is in the air (a spring arrives late, so the key is set at mid-step)
  this.key(t0+(t1-t0)*.4,{px:sup+(x-sup)*(o.settle==null?.45:o.settle),py});
  // push: the foot that is about to leave drives the hips toward the support foot (out of a lunge, where the stance is
  // too long for the hips to get over the rear foot first)
  if(o.push)this.impulse(t0,{px:Math.sign(sup-from)*o.push});
  this.steps=(this.steps||[]).concat([{foot,t0,t1,sup:other,push:!!o.push}]);
  return this;
};
Fighter.prototype.impulse=function(t,v){this.impulses.push({t,v});return this;};
// a contact constraint: from t0 the hand is blended toward the place where the point `along` the blade (or the empty
// hand, along null) is on target(t); fully there from t1 to t2; released at t2 with the momentum it had.
Fighter.prototype.pin=function(hand,along,target,t0,t1,t2,w){this.pins.push({hand,along,target,t0,t1,t2,wSet:w});return this;};
Fighter.prototype.W=function(p){return [this.hx+this.face*p[0],p[1]];};
Fighter.prototype.L=function(w){return [this.face*(w[0]-this.hx),w[1]];};

function flat(p,wr){return {px:p.px,py:p.py,lean:p.lean,bend:p.bend,head:p.head,turn:p.turn||0,
  hx:p.h[0],hy:p.h[1],ox:p.o[0],oy:p.o[1],wr};}
// the wrist turn that gives blade angle w with the arm of pose p
function wristFor(p,w,len){const j=solve({...p,w,wr:null,ffx:30,ffy:0,bfx:-30,bfy:0},len);return norm(w-(j.w-j.grip));}
function pose(f,s,t){
  const q={ffx:footX(f,'ff',t),ffy:footY(f,'ff',t),bfx:footX(f,'bf',t),bfy:footY(f,'bf',t),
    px:s.px,py:s.py,lean:s.lean,bend:s.bend,head:s.head,turn:s.turn,h:[s.hx,s.hy],o:[s.ox,s.oy],w:0,wr:s.wr,fs:0};
  return q;
}
const sm=u=>u<=0?0:u>=1?1:u*u*(3-2*u);
// A step, from the floor up: the foot pushes off (it rises before it travels), swings, is set down at its place
// (it arrives a moment before it takes weight), and only travels while it is clearly off the floor.
const STEP_GO=.14,STEP_SET=.88;
function footX(f,foot,t){
  let x=f.home[foot];
  for(const s of f.feet[foot]){
    if(t>=s.t1)x=s.x;
    else if(t>s.t0){const u=(t-s.t0)/(s.t1-s.t0);return x+(s.x-x)*sm((u-STEP_GO)/(STEP_SET-STEP_GO));}
    else break;
  }
  return x;
}
function footY(f,foot,t){
  for(const s of f.feet[foot])if(t>s.t0&&t<s.t1)return s.lift*Math.pow(Math.sin(Math.PI*(t-s.t0)/(s.t1-s.t0)),.6);
  return 0;
}

// Resolve key poses into per-channel target lists (each part switches at key time + its lag).
function targets(f){
  f.keys.sort((a,b)=>a.t-b.t);
  const tg={};for(const c of CH)tg[c]=[{t:-1e9,v:f.start[c]}];
  const cur={...f.guard,h:f.guard.h.slice(),o:f.guard.o.slice()};let curW=f.guard.w;
  for(const k of f.keys){
    Object.assign(cur,k.pose);if(k.pose.w!=null)curW=k.pose.w;
    const fl=flat(cur,wristFor(cur,curW,f.weapon.len)),lag=LAG[k.order];
    const set=new Set();
    for(const n in k.pose){if(n==='h'){set.add('hx');set.add('hy');}else if(n==='o'){set.add('ox');set.add('oy');}
      else if(n==='w')set.add('wr');else set.add(n);}
    if(k.pose.h)set.add('wr');            // the wrist is re-solved when the arm moves, so the blade keeps its asked angle
    for(const c of set)tg[c].push({t:k.t+lag[c],v:fl[c],s:k.snap});
  }
  for(const c of CH)tg[c].sort((a,b)=>a.t-b.t);
  return tg;
}
const at=(list,t)=>{let v=list[0].v;for(const k of list){if(k.t<=t)v=k.v;else break;}return v;};

// where the hand must be (from the shoulder) for the blade point `along` to sit on world point P, keeping the wrist turn
function handFor(f,q,P,along){
  const T=f.L(P);let h=q.h.slice();
  for(let i=0;i<4;i++){
    const j=solve({...q,h},f.weapon.len),S=j.S;
    h=[T[0]-Math.cos(rad(j.w))*along-S[0],T[1]-Math.sin(rad(j.w))*along-S[1]];
  }
  return h;
}
// the same with the blade's angle given: one placement, no search
function handAt(f,q,P,along,w){const S=torso(q).S,T=f.L(P);return [T[0]-Math.cos(rad(w))*along-S[0],T[1]-Math.sin(rad(w))*along-S[1]];}
function offFor(f,q,P){const S=torso(q).S,T=f.L(P);return [T[0]-S[0],T[1]-S[1]];}

// ----- the simulation: both fighters, one clock -----
// opt.from: a checkpoint of an earlier run (rec._snaps) to carry on from, when nothing before it has changed.
// Every run keeps checkpoints every 200 ms, so a sequence written beat by beat need not start again from zero.
const SNAP=200;
const pinState=F=>Object.fromEntries(Object.keys(F).map(id=>[id,F[id].pins.map(p=>({prev:p.prev&&{...p.prev},w:p.w,lastW:p.lastW}))]));
function simulate(F,dur,opt){
  const ids=Object.keys(F),st={},tg={},rec={},from=opt&&opt.from;let t0=0;
  for(const id of ids){const f=F[id];for(const p of f.pins){p.prev=null;p.w=null;p.lastW=null;}tg[id]=targets(f);st[id]={x:{...f.start},v:Object.fromEntries(CH.map(c=>[c,0]))};rec[id]=[];}
  let ctxOut;
  if(from){
    t0=from.t+DT;
    for(const id of ids){st[id]={x:{...from.st[id].x},v:{...from.st[id].v}};rec[id]=from.rec[id].slice(0,from.n);
      F[id].pins.forEach((p,i)=>{const k=from.pins[id][i];if(k){p.prev=k.prev&&{...k.prev};p.w=k.w;p.lastW=k.lastW;}});}
    ctxOut=from.out;
  }
  const ctx={F,st,dur,out:ctxOut},ptr={};for(const id of ids)ptr[id]=Object.fromEntries(CH.map(c=>[c,0]));
  const snaps=from?from.prior.filter(x=>x.t<=from.t):[];
  for(let t=t0;t<=dur;t+=DT){
    for(const id of ids){
      const f=F[id],s=st[id];
      for(const im of f.impulses)if(im.t>t-DT&&im.t<=t)for(const c in im.v){if(im.v[c]==='stop')s.v[c]=0;else s.v[c]+=im.v[c];}
      for(const c of CH){
        // the current target for this part (a pointer that only moves forward: time only moves forward)
        const L=tg[id][c];let i=ptr[id][c];while(i+1<L.length&&L[i+1].t<=t)i++;ptr[id][c]=i;
        const e=L[i],sp=(F[id].spring||SPRING)[c],hz=sp[0]*(e.s||1),z=e.s?1:sp[1],w=2*Math.PI*hz,target=e.v;
        // semi-implicit Euler, per second
        const a=w*w*(target-s.x[c])-2*z*w*s.v[c];
        s.v[c]+=a*DT/1000;s.x[c]+=s.v[c]*DT/1000;
        // a wrist only turns so far: at its limit the blade stops turning in the hand (a joint limit, not a spring)
        if(c==='wr'&&(s.x.wr<WRIST[0]||s.x.wr>WRIST[1])){s.x.wr=Math.max(WRIST[0],Math.min(WRIST[1],s.x.wr));s.v.wr=0;}
      }
    }
    // contacts: hard while held (the state is moved), blended in the picture while coming in
    const out={};
    for(const id of ids){
      const f=F[id],s=st[id],o={...s.x};
      for(const p of f.pins){
        if(t<p.t0||t>p.t2+DT)continue;
        const q=pose(f,o,t),P=p.target(t,ctx),held=t>=p.t1;
        // a held blade keeps the angle it had when the contact was made: the hand moves, the wrist takes up the difference
        if(p.hand==='h'&&held&&p.w==null)p.w=p.wSet!=null?p.wSet:p.lastW!=null?p.lastW:solve(q,f.weapon.len).w;
        // coming in: the blade turns toward the angle the contact asks for (wSet) as the hand comes to the point
        const u=held?1:sm((t-p.t0)/(p.t1-p.t0)),wNow=solve(q,f.weapon.len).w;
        const wIn=held?p.w:p.wSet!=null?wNow+norm(p.wSet-wNow)*u:wNow;
        let d=p.hand==='h'?handAt(f,q,P,p.along,wIn):offFor(f,q,P);
        // the wrist only turns so far: settle on a blade angle the hand can actually hold there, and place the hand for it
        if(p.hand==='h')for(let i=0;i<4;i++){const j=solve({...q,h:d,wr:0},f.weapon.len),fore=j.w;
          const wf=fore+Math.max(WRIST[0],Math.min(WRIST[1],norm(wIn-fore)));d=handAt(f,q,P,p.along,wf);}
        // a contact never asks an arm to reach further than it goes: past that, the hand is pulled out of it
        const tq=torso(q),sh=p.hand==='h'?tq.wS:tq.oS,dx=tq.S[0]+d[0]-sh[0],dy=tq.S[1]+d[1]-sh[1],r=Math.hypot(dx,dy);
        if(r>ARM-1){const k=(ARM-1)/r;d[0]=sh[0]+dx*k-tq.S[0];d[1]=sh[1]+dy*k-tq.S[1];}
        const kx=p.hand==='h'?'hx':'ox',ky=p.hand==='h'?'hy':'oy';
        if(t>=p.t1){
          // held: the state is moved there; on release it keeps the speed the contact gave it
          if(t>p.t2){continue;}
          const nx=d[0],ny=d[1];
          const pv=p.prev;
          if(pv&&pv.t===t-DT){s.v[kx]=(nx-pv.x)/DT*1000;s.v[ky]=(ny-pv.y)/DT*1000;}else{s.v[kx]=0;s.v[ky]=0;}
          s.x[kx]=o[kx]=nx;s.x[ky]=o[ky]=ny;p.prev={t,x:nx,y:ny};
          if(p.hand==='h'){const j=solve({...q,h:[nx,ny]},f.weapon.len);s.x.wr=o.wr=Math.max(WRIST[0],Math.min(WRIST[1],norm(p.w-(j.w-j.grip))));s.v.wr=0;}
        }else{
          o[kx]+=(d[0]-o[kx])*u;o[ky]+=(d[1]-o[ky])*u;(o._blend=o._blend||{})[kx]=1;
          if(p.hand==='h'){const j=solve({...pose(f,o,t)},f.weapon.len);o.wr=Math.max(WRIST[0],Math.min(WRIST[1],norm(wIn-(j.w-j.grip))));}
          if(p.hand==='h')p.lastW=solve(pose(f,o,t),f.weapon.len).w;
        }
      }
      out[id]=o;
    }
    // an arm is only so long: a hand carried past its reach stops there (a joint limit, like the wrist's)
    for(const id of ids){const f=F[id],s=st[id],o=out[id],tq=torso(pose(f,o,t));
      for(const [kx,ky,sh] of [['hx','hy',tq.wS],['ox','oy',tq.oS]]){
        const dx=tq.S[0]+o[kx]-sh[0],dy=tq.S[1]+o[ky]-sh[1],r=Math.hypot(dx,dy);
        // nor can a hand pass through its own shoulder (where the elbow would flip): with minReach set, it goes round
        if(f.minReach&&r<f.minReach){const L=f._dir||(f._dir={}),d0=L[kx]||[1,0],
            u=r>1e-3?[dx/r,dy/r]:d0,nx=sh[0]+u[0]*f.minReach-tq.S[0],ny=sh[1]+u[1]*f.minReach-tq.S[1];
          L[kx]=u;o[kx]=nx;o[ky]=ny;if(!(o._blend&&o._blend[kx])){s.x[kx]=nx;s.x[ky]=ny;}continue;}
        if(f.minReach&&r>1e-3)(f._dir||(f._dir={}))[kx]=[dx/r,dy/r];
        if(r<=ARM-1)continue;
        const ux=dx/r,uy=dy/r,k=(ARM-1)/r,nx=sh[0]+dx*k-tq.S[0],ny=sh[1]+dy*k-tq.S[1];
        o[kx]=nx;o[ky]=ny;if(!(o._blend&&o._blend[kx])){s.x[kx]=nx;s.x[ky]=ny;}
        const vo=s.v[kx]*ux+s.v[ky]*uy;if(vo>0){s.v[kx]-=vo*ux;s.v[ky]-=vo*uy;}
      }}
    // a leg is only so long: when the hips would pull a foot's leg straighter than it goes, they sink into a deeper
    // stance instead (and, if a foot is too far away for that, they stay within reach of it)
    for(const id of ids){const f=F[id],s=st[id],o=out[id],q=pose(f,o,t),R=LEGLEN-.3;
      for(const ft of ['ff','bf']){const fx=q[ft+'x'],fy=Math.max(0,q[ft+'y']),dx=o.px-fx;
        if(Math.hypot(dx,o.py-fy)<=R)continue;
        if(Math.abs(dx)>=R-1){o.px=s.x.px=fx+Math.sign(dx)*(R-1);if(Math.sign(s.v.px)===Math.sign(dx))s.v.px=0;}
        const ny=fy+Math.sqrt(Math.max(0,R*R-(o.px-fx)*(o.px-fx)));
        if(ny<o.py){o.py=s.x.py=ny;if(s.v.py>0)s.v.py=0;}
      }}
    // a blade cannot go through the floor: one that would, rests on it (the wrist gives, the hand stays)
    for(const id of ids){const f=F[id],s=st[id],o=out[id],j=solve(pose(f,o,t),f.weapon.len),L=f.weapon.len*(1-Math.min(.8,0));
      if(j.tip[1]>=0)continue;
      const fore=j.w-j.grip,sn=Math.max(-1,Math.min(1,-j.Hn[1]/L)),wA=deg(Math.asin(sn)),cands=[wA,180-wA];
      // keep the blade pointing the way it was (forward or back), as near its current angle as the floor allows
      const pick=cands.reduce((b,c)=>Math.abs(norm(c-j.w))<Math.abs(norm(b-j.w))?c:b);
      o.wr=s.x.wr=Math.max(WRIST[0],Math.min(WRIST[1],norm(pick-fore)));s.v.wr=0;}
    // momentum is not lost on release (the speed the held contact gave is kept, capped so a jump cannot fling a hand)
    for(const id of ids)for(const c of ['hx','hy','ox','oy'])st[id].v[c]=Math.max(-900,Math.min(900,st[id].v[c]));
    for(const id of ids)delete out[id]._blend;
    if(t%REC===0)for(const id of ids)rec[id].push({...out[id]});
    ctx.out=out;ctx.t=t;
    if(t%SNAP===0)snaps.push({t,n:rec[ids[0]].length,out,pins:pinState(F),
      st:Object.fromEntries(ids.map(id=>[id,{x:{...st[id].x},v:{...st[id].v}}]))});
  }
  Object.defineProperty(rec,'_snaps',{value:snaps,enumerable:false});
  return rec;
}
// carry on from the last checkpoint of an earlier run that is before `dirty` (the earliest time anything was added)
function resumeFrom(prev,dirty){
  if(!prev||!prev._snaps)return null;
  let s=null;for(const x of prev._snaps)if(x.t<dirty)s=x;else break;
  return s&&{...s,rec:prev,prior:prev._snaps};
}

// ----- the exchange -----
// Results fixed in advance (labelled on the page): the cut is parried; the dagger counters to the abdomen and wounds
// (a minor wound: the fighter can go on); both recover into new stances.
const SPACING=200,CENTRE=600;
function build(){
  const A=new Fighter('a',CENTRE-SPACING/2,1,WEAPONS.sword,SWORD_GUARD);
  const B=new Fighter('b',CENTRE+SPACING/2,-1,WEAPONS.dagger,DAGGER_GUARD);
  const F={a:A,b:B},seq={id:'spring',title:'Attack, parry, counter, wound, recovery',fighters:F,marks:[],pauses:[],stops:[],
    fx:[],wounds:[],contacts:{},names:{a:'Sword',b:'Dagger'}};
  const mark=(t,who,label)=>seq.marks.push({t,who,label});
  mark(0,'both','On guard. Results are fixed in advance for this study: parried, then a counter that wounds');

  // 1. The cut. Load, drive, strike; the strike's key is past the target, so the blade is still travelling fast
  //    when it is met (a spring slows as it arrives; aiming through keeps the speed into contact).
  const t0=180;
  A.key(t0,{px:-12,py:77,lean:-1,bend:-4,head:1,turn:-8,h:[12,2],w:140,o:[27,-10]});
  A.step('ff',t0+220,t0+360,50,7);
  A.key(t0+240,{px:12,py:75,lean:8,bend:0,head:-4,turn:6,h:[22,8],w:128});
  A.key(t0+290,{px:25,py:70,lean:17,bend:9,head:-14,turn:14,h:[56,-34],w:-40,o:[-34,-44]});
  // The contact is where the free cut is when its blade, coming down, passes 42 degrees: high in front of the
  // dagger fighter's head (at this measure a level blade would already be in the head). Found from the cut itself,
  // so the attacker is not steered into it; only the defender aims.
  const alongA=Math.round(A.weapon.len*.6);
  const free=simulate({a:A},t0+700);let tc=t0+290;
  while(tc<t0+700&&solve(pose(A,free.a[tc/REC],tc),A.weapon.len).w>42)tc+=REC;
  const jA=solve(pose(A,free.a[tc/REC],tc),A.weapon.len);
  const C=A.W([jA.Hn[0]+Math.cos(rad(jA.w))*alongA,jA.Hn[1]+Math.sin(rad(jA.w))*alongA]);
  mark(t0,'a','Load: the weight settles onto the rear foot, the hilt comes up beside the head, the blade lies back');
  mark(t0+220,'a','Drive: the front foot steps and the hips go with it; the blade is left behind');
  mark(t0+290,'a','Strike: hips, then chest, then the arm; the blade comes last and fastest');
  // B reads it and covers early: the dagger goes up across the line, blade first, the body settles under it
  B.key(tc-340,{py:70,lean:9,bend:8,head:-12,h:[24,-12],w:62,o:[18,-20]});
  B.key(tc-260,{px:26,py:69,lean:14,bend:6});
  B.key(tc-170,{px:30,py:69,lean:6,bend:5,head:-8,h:[24,10],w:112,o:[16,-18]},'cover');
  // and steps in to meet it: the cut is taken early, before it has come down to the head
  B.step('ff',tc-300,tc-150,62,5);
  seq.contacts.parry={t:tc,at:C,alongA,alongB:26};
  // the dagger comes to the meeting point (blended in over 140 ms, exact at contact), holds it through the bind
  B.pin('h',26,()=>C,tc-140,tc,tc+20);
  // impact: the cut is stopped dead (its hand and blade lose their speed); the defender's knees and elbow give
  A.impulse(tc+1,{hx:'stop',hy:'stop',wr:'stop',py:-30});
  B.impulse(tc+1,{py:-110,lean:-50,bend:40});
  // the redirect: the defender sinks under the bind and lifts; the sword is carried up and off the line.
  // While bound, the sword rides the dagger (its own contact point is pinned to the dagger's).
  B.key(tc,{py:62,lean:15,bend:12,head:-16,h:[42,22],w:118,o:[22,-16]},'together');
  const daggerPt=(t,ctx)=>{const q=pose(B,ctx.out?ctx.out.b:B.start,t),j=solve(q,B.weapon.len);
    return B.W([j.Hn[0]+Math.cos(rad(j.w))*26,j.Hn[1]+Math.sin(rad(j.w))*26]);};
  A.pin('h',alongA,daggerPt,tc+1,tc+2,tc+90);
  A.key(tc+30,{px:18,py:75,lean:4,bend:0,head:-6,turn:4,h:[26,26],w:80,o:[10,-30]},'together');
  A.key(tc+260,{px:20,py:73,lean:5,bend:0,head:-6,turn:2,h:[22,18],w:112,o:[16,-24]});
  B.key(tc+200,{px:2,py:65,lean:14,bend:10,head:-14,h:[28,-6],w:66,o:[24,-12]});
  seq.stops.push({t:tc,d:70});seq.fx.push({t:tc,kind:'clash',at:C});
  mark(tc,'b','Parry: one contact point, in front of the dagger fighter\'s head. The knees and elbow give under the blow');
  mark(tc+1,'b','Redirect: the dagger fighter sinks under the bind and lifts; the sword is carried up and off the line');
  const P1=tc+560;
  seq.pauses.push({t:P1,label:'The parry is resolved: the sword is high and off the line, the dagger fighter is low and close. '
    +'In the Pits the dagger fighter would choose the next action now.'});
  mark(P1,'both','Held for the decision: both poses stand on two feet, nobody is moving');

  // 2. The counter, from the held poses. The sword fighter starts to bring the sword back down; the dagger fighter steps
  //    in under it, catches the sword arm at the wrist with the empty hand and stops it there, and thrusts low while
  //    holding it. The arm is held (it cannot come down) until the dagger fighter lets go to step out.
  const tk=P1+330,tg=P1+190,tr=tk+40;
  B.step('ff',P1+50,P1+170,84,8).step('bf',P1+172,P1+272,8,7);
  B.key(P1+10,{px:40,py:60,lean:22,bend:8,head:-16,turn:-12,h:[8,-26],w:10,o:[34,24]});
  // the sword starts down and forward: the hand leads, the point is still up
  A.key(P1+20,{py:74,lean:7,bend:2,head:-8,turn:8,h:[44,0],w:58,o:[18,-20]});
  let rec=simulate(F,tg+5);
  // the catch: the sword hand stops where it is caught (an impulse), and is held there; the dagger fighter then lifts
  // it a little as the thrust goes in (the arm is driven up and back, the sword fighter leans away from the push)
  const qg=pose(A,rec.a[tg/REC],tg),jg=solve(qg,A.weapon.len),caught=A.W(jg.Hn);
  const lifted=[caught[0]-6*A.face,caught[1]+12];
  const held=t=>{const u=sm((t-tg)/(tk-tg));return [caught[0]+(lifted[0]-caught[0])*u,caught[1]+(lifted[1]-caught[1])*u];};
  A.impulse(tg+1,{hx:'stop',hy:'stop',wr:'stop'});
  A.pin('h',0,held,tg,tg+1,tr+50);
  A.key(tg,{lean:-1,bend:-3,head:-2,turn:2,w:92},'together');
  // the empty hand on the forearm just behind the wrist (never on the blade)
  const wrist=(t,ctx)=>{const q=pose(A,ctx.out?ctx.out.a:A.start,t),j=solve(q,A.weapon.len);
    return A.W([j.Hn[0]+(j.E[0]-j.Hn[0])*.25,j.Hn[1]+(j.E[1]-j.Hn[1])*.25]);};
  B.pin('o',null,wrist,P1+60,tg,tr);
  seq.grips=[{who:'b',t0:tg,t1:tr}];
  rec=simulate(F,tk+5);
  const qA2=pose(A,rec.a[tk/REC],tk),jA2=solve(qA2,A.weapon.len);
  const abd=[(jA2.M[0]+jA2.P[0])/2+4,(jA2.M[1]+jA2.P[1])/2];
  const qB2=pose(B,rec.b[tk/REC],tk),T=A.W(abd);
  B.key(tk-180,{px:62,py:63,lean:26,bend:4,head:-20,h:handFor(B,qB2,T,46),w:6});
  const abdomen=(t,ctx)=>{const q=pose(A,ctx.out?ctx.out.a:A.start,t),j=solve(q,A.weapon.len);
    return A.W([(j.M[0]+j.P[0])/2+4,(j.M[1]+j.P[1])/2]);};
  B.pin('h',46,abdomen,tk-110,tk,tk+25);
  seq.contacts.counter={t:tk,along:46};
  mark(P1,'b','Counter: a short step in under the raised sword as the sword fighter starts to bring it down');
  mark(tg,'b','Control: the empty hand catches the sword arm at the wrist and stops it; the sword cannot come down');
  mark(tk-180,'b','Thrust: low and straight to the abdomen while the sword arm is held up');

  // 3. The wound. The reaction starts at the abdomen: the hips are pushed back, the body folds over the wound, the
  //    head follows late. The sword arm is still held, so it stays up until it is let go.
  A.impulse(tk,{px:-150,bend:320,lean:-60,head:200,py:-50});
  A.key(tk,{px:-8,py:72,lean:4,bend:24,head:-24,turn:-4,o:[6,-34]},'together');
  const ownWound=(t,ctx)=>{const q=pose(A,ctx.out?ctx.out.a:A.start,t),j=solve(q,A.weapon.len);
    return A.W([(j.M[0]+j.P[0])/2+7,(j.M[1]+j.P[1])/2]);};
  A.pin('o',null,ownWound,tk+40,tk+220,tk+1400);
  seq.stops.push({t:tk,d:90});seq.fx.push({t:tk,kind:'wound',at:T});
  seq.wounds.push({t:tk,who:'a',part:'abdomen',level:'minor'});
  mark(tk,'a','Hit to the abdomen: the hips go back and the body folds over the wound, the head follows; the sword arm is still held');

  // 4. Release and recovery. The dagger fighter lets go with a small push and steps out, rear foot first.
  //    The sword comes down on a deliberate path: the elbow drops and the hilt comes down in front of the chest
  //    with the point still up (clear of the face), then the point is lowered into a low guard as the weight goes back.
  B.key(tr,{o:[16,-10]},'together');                     // the empty hand lets go and comes back down to the chest, clear of the sword
  B.impulse(tr+1,{ox:-260,oy:-160});                     // a small push off the arm as it lets go
  B.key(tk+60,{lean:18,bend:6,head:-16,h:[12,-24],w:14},'together');
  // out of the lunge: the front foot pushes off and comes back first (the weight goes back onto the rear foot),
  // then the rear foot steps back from the front one
  B.walk('ff',tk+240,tk+420,44,{py:66,lift:11,load:.3,settle:.15,push:220});
  B.walk('bf',tk+500,tk+660,-20,{py:68,lift:10,load:.3,settle:.5});
  B.key(tk+300,{h:[12,-8],w:76});                       // the dagger comes up to cover as it steps out
  B.key(tk+660,{lean:14,bend:8,head:-14,o:[24,6]});
  A.impulse(tr+50,{hx:'stop',hy:-180});                  // let go, the arm drops under its own weight
  A.key(tr+50,{h:[30,-10],w:88});                            // released: the elbow drops, the hilt comes down in front of the shoulder
  A.key(tk+200,{h:[24,-20],w:84});                      // the hilt in front of the chest, the point still up, clear of the face
  A.key(tk+480,{h:[26,-28],w:24});                      // once the dagger fighter is out: the point comes down toward the opponent
  A.key(tk+680,{h:[24,-34],w:-26});                     // a low guard: point at the opponent's knees
  // gives ground with the front foot, the weight carried back over the rear leg
  A.walk('ff',tk+300,tk+490,28,{py:72,lift:10,load:.3,settle:.12,push:180});
  A.key(tk+520,{lean:12,bend:22,head:-20,turn:-6});    // closed over the wound: the shoulders round, the wound side away
  mark(tr,'b','Release: the hand lets go with a small push; the dagger comes back out along its line');
  mark(tk+240,'b','Steps out: the front foot pushes off and comes back under the body; then the rear foot steps back');
  mark(tk+260,'a','The sword comes down: elbow first, the hilt in front of the chest with the point up, then the point lowers');
  const end=tk+1150;
  mark(tk+700,'both','New stances: the sword fighter bent over the wound, weight back, point low; the dagger fighter low, empty hand up');
  seq.pauses.push({t:end,label:'End of the exchange. Both stay in these poses for the next decision; the next exchange starts from them.'});
  seq.dur=end+10;seq.P1=P1;seq.tk=tk;seq.tc=tc;seq.end=end;
  seq.rec=simulate(F,seq.dur);
  seq.marks.sort((x,y)=>x.t-y.t);
  return seq;
}

// ----- reading the stored simulation -----
function sample(seq,id,t){
  const r=seq.rec[id],i=Math.max(0,Math.min(r.length-1,t/REC)),a=Math.floor(i),b=Math.min(r.length-1,a+1),u=i-a,o={};
  for(const c of CH)o[c]=r[a][c]+(r[b][c]-r[a][c])*u;
  return o;
}
function joints(seq,id,t){const f=seq.fighters[id];return solve(pose(f,sample(seq,id,t),t),f.weapon.len);}
function world(seq,id,t,name,along){
  const f=seq.fighters[id],j=joints(seq,id,t);let p;
  if(name==='abdomen')p=[(j.M[0]+j.P[0])/2,(j.M[1]+j.P[1])/2];
  else if(name==='chest')p=[(j.M[0]+j.S[0])/2,(j.M[1]+j.S[1])/2];
  else if(name==='blade')p=[j.Hn[0]+Math.cos(rad(j.w))*along,j.Hn[1]+Math.sin(rad(j.w))*along];
  else p=j[name];
  return f.W(p);
}
function frame(seq,t){
  const out={};
  for(const id of ['a','b']){
    const f=seq.fighters[id],wounds={};
    for(const w of seq.wounds)if(w.who===id&&t>=w.t)wounds[w.part]=w.level;
    const j=joints(seq,id,t);out[id]={joints:j,wounds,svg:PM.figureSvg(f,j,wounds),pose:pose(f,sample(seq,id,t),t)};
  }
  return out;
}
// Other sequences (pits-fight.js) register here and are built with build(id); the short exchange is the default.
const SEQS={};
function buildAny(id){return id&&SEQS[id]?SEQS[id]():build();}
const api={build:buildAny,register:(id,fn)=>{SEQS[id]=fn;},frame,joints,world,sample,simulate,Fighter,SPRING,LAG,CH,REC,GROUND,
  // the pieces a sequence is written with
  pose,solve,torso,handAt,offFor,footX,sm,rad,norm,WRIST,ARM,PM,resumeFrom,
  seqTime:PM.seqTime,shownDur:PM.shownDur,shownAt:PM.shownAt};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.PitsSpring=api;
})(typeof window!=='undefined'?window:globalThis);
