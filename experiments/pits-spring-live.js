// The Pits: the spring movement (pits-spring.js) and the exchange writer (pits-writer.js) driving the live stage.
// A TRIAL, behind ?stage=spring (owner, 2026-11-13; nothing is released). Without the switch, or when either fighter's
// weapon has no family yet, the stage keeps today's movement (PitsMotion.LIVE).
//
// The stage (pits-stage.js) talks to its movement layer through one small interface: make a fighter, place it, draw a
// declared action before its dice (intent), write a blow from the engine's resolved facts and get back when and where
// its contacts land (blow), draw a pose at the stage's clock, and a few others (fall, stand, lower, yield, press,
// recover). This file answers that interface:
//   - both fighters live in one writer world (PitsWriter.create), made when the stage has made both;
//   - each blow is one record for PitsWriter.exchange, written from the stage's clock: nothing is written before the
//     moment the stage has already shown (S.now), and what the last exchange had planned for after that moment is
//     dropped (S.cut), so each movement starts from the pose the last one was held in, not from a guard;
//   - the picture holds still between movements (the stage stops its clock), so the moment of each hold is chosen to
//     read cleanly (holdAt);
//   - the simulation runs forward as the clock does (ensure), from the writer's checkpoints;
//   - writer time runs at PACE times the stage's clock (the owner's chosen pace for the studies).
// Stand-ins, kept simple until they have phrases: fall (a crumble), stand, lower, yield, Press Advantage, recover (a walk
// to the engine's range when it changes). How the flow works, what is weak and what is next:
// docs/pits-animation-direction.md, "Fluid flow" and "Instructions for Opus".
(function(root){
const PM=root.PitsMotion||(typeof require==='function'?require('./pits-motion.js'):null);
const PS=root.PitsSpring||(typeof require==='function'?require('./pits-spring.js'):null);
const PW=root.PitsWriter||(typeof require==='function'?require('./pits-writer.js'):null);
const L0=PM.LIVE,PACE=1.65,REC=PS.REC;
// Collision (owner, 2026-11-14): blades cannot pass through the other fighter (pits-spring.js, collide). A comparison
// for now, off unless the page is opened with ?collide=on, so the same fight can be watched both ways.
try{if(typeof location!=='undefined'&&/(^|[?&])collide=on\b/.test(location.search||''))PS.collide=true;}catch(e){}
// the replay: how long after an exchange's last contact (writer time) the next exchange may begin
const FLOW=300;

// the stage draws every weapon as a kind with a length: the writer's weapon key for it. Weapons whose family has no
// movement of its own yet move with the cut or thrust phrases as a stand-in (PitsWriter.profile marks them).
const bladeKey=wk=>wk.kind==='spear'?(wk.len<=160?'spear':wk.len<=200?'longspear':'pike'):wk.kind==='trident'?'trident':
  wk.kind==='polearm'?'halberd':wk.kind==='staff'?'quarterstaff':wk.kind==='chain'?(wk.len>100?'military-flail':'flail'):
  wk.kind==='whip'?'whip':wk.kind==='net'?'net':
  wk.kind==='axe'?(wk.two?'battleaxe-2h':wk.len>100?'great-axe':wk.len<=60?'hatchet':'axe'):
  wk.kind==='club'?(wk.len>100?'great-hammer':wk.len<=66?'club':'mace'):wk.kind==='pick'?'military-pick':
  wk.thin?'rapier':wk.len<=55?'dagger':wk.len<=72?'shortsword':wk.len<=88?'falchion':wk.len<=98?'sword':wk.len<=106?'longsword':
  wk.len<=122?'longsword-2h':'greatsword';
function supports(wk){return !!(wk&&PW.profile(bladeKey(wk)));}

// ----- fighters: the stage makes them one at a time; the world is made once both exist -----
let pend=null;
function fighter(id,wk,swap,look){
  if(!pend||pend[id])pend={};                       // a fighter made again starts a new pair (a new bout)
  const m={id,hx:PM.CENTRE+(id==='a'?-1:1)*PM.SPACING/2,face:id==='a'?1:-1,weapon:{key:wk.kind,len:wk.len},swap:!!swap,
    guard:{...PM.SWORD_GUARD},wk,shield:!!(look&&look.shield),shieldKey:look&&look.shield?(look.shieldKey||'heater'):null,pair:pend,spring:true};
  pend[id]=m;return m;
}
function world(m,t){
  const P=m.pair;if(P.world)return P.world;if(!P.a||!P.b)return null;
  const gap=P.gap||L0.gap(P.a.wk,P.b.wk,'long'),sh=-(gap-PM.SPACING)/2;
  const S=PW.create({weapons:{a:bladeKey(P.a.wk),b:bladeKey(P.b.wk)},shields:{a:P.a.shieldKey||'none',b:P.b.shieldKey||'none'},
    hx:{a:P.a.hx,b:P.b.hx},shift:{a:sh,b:sh},id:'live',title:'The Pits (spring trial)'});
  S.now=0;S.absorb=28;S.crumble=true;
  P.world={S,T0:t,next:0,over:false,shown:0};
  return P.world;
}
const tau=(w,t)=>Math.max(0,(t-w.T0)*PACE);           // stage clock -> writer time
const clock=(w,u)=>w.T0+u/PACE;                        // writer time -> stage clock
// simulate far enough ahead to draw writer time u
function ensure(w,u){const L=w.S.W.last();if(!L||L.a.length*REC<u+REC*2)w.S.W.run(Math.ceil((u+600)/REC)*REC);}
// after writing keys directly (not through PitsWriter.exchange, which looks ahead itself): simulate again from there
function rerun(w,u){w.S.W.run(Math.ceil((u+600)/REC)*REC);}

// ----- drawing -----
function guardJoints(m){const g=m.guard;return PS.solve({...g,ffy:0,bfy:0,fs:0,wr:null},m.weapon.len);}
function pose(m,t,limp){
  const w=world(m,t);if(!w)return Object.assign(guardJoints(m),{blen:m.weapon.len});
  const u=tau(w,t);ensure(w,u);
  const f=w.S.F[m.id],s=w.S.W.last()[m.id][Math.floor(u/REC)];
  const p=PS.pose(f,s,u);
  // a disabled arm hangs: eased into over a moment of the stage's clock, not snapped to
  const k=(key,on)=>{const T=m.limpT||(m.limpT={});if(!on){T[key]=null;return 0;}if(T[key]==null)T[key]=t;const x=Math.min(1,(t-T[key])/240);return x*x*(3-2*x);};
  const kw=k('w',limp&&limp.weapon),ko=k('o',limp&&limp.off),mix=(a,b,x)=>a+(b-a)*x;
  if(kw){p.h=[mix(p.h[0],4,kw),mix(p.h[1],-58,kw)];p.wr=mix(p.wr,-8,kw);}
  if(ko)p.o=[mix(p.o[0],-3,ko),mix(p.o[1],-59,ko)];
  // (a two-handed weapon is drawn with the off hand on its grip, unless that arm is disabled and hangs)
  const two=(PW.profile(bladeKey(m.wk))||{}).two;if(two&&!ko&&!(limp&&(limp.off||limp.weapon||limp.unarmed)))p.two=two;
  const j=PS.solve(p,f.weapon.len);j.blen=f.weapon.len;return j;
}

// ----- a blow: the engine's facts as one record for the writer -----
// s: {outcome (the stage's words), loc, lost, shield (the parry was the shield's), strike ('shield': the attack was a
// shield strike), fall, defeated, flow (the replay)}
function blow(F,aid,t,s){
  const A=F[aid],did=aid==='a'?'b':'a',w=world(A,t);
  if(!w)return {tc:t,contacts:[],end:t};
  const u0=Math.max(tau(w,t),w.next);w.S.now=u0;w.S.cut(u0);
  const rec={attacker:aid,loc:s.loc||'chest',outcome:s.outcome||'wound',lost:s.lost||0,...(s.prone?{prone:true}:{}),
    ...(s.shield?{defence:'shield'}:{}),...(s.strike==='shield'?{strike:'shield'}:{}),after:s.defeated?[{type:'end',winner:aid,how:'injury'}]:[]};
  // a fighter the engine has on the floor stays down through the exchange (only its arms and head move)
  for(const id of ['a','b'])w.S.F[id].grounded=!!(w.down&&w.down[id]);
  const seq=w.S.seq,c0=seq.contactList.length,m0=seq.misses.length;
  const r=PW.exchange(w.S,rec,u0);
  ensure(w,r.t);
  const out=[];
  for(const c of seq.contactList.slice(c0))out.push({t:clock(w,c.t),kind:c.kind==='wound'?'body':'clash',at:c.at,raw:c.kind});
  for(const m of seq.misses.slice(m0))out.push({t:clock(w,m.t),kind:'miss',at:PS.world({fighters:w.S.F,rec:w.S.W.last()},aid,m.t,'tip')});
  out.sort((x,y)=>x.t-y.t);
  let end=r.t;
  if(r.ended){w.over=true;
    // defeated while already on the floor: the collapse had nothing to write (grounded), so the body goes limp there
    if(w.down&&w.down[did]){const f=w.S.F[did];f.groundWrite=true;
      f.key(r.tc||u0+400,{py:13,lean:72,bend:10,head:30,h:[34,-20],w:-4,o:[26,-22]});f.groundWrite=false;}}
  if(r.down)(w.down=w.down||{})[r.down]=true;           // an evade that ended on the ground: already down
  else if(s.fall)end=fallAt(w,did,r.t,s.fall==='sit'?'sit':null);
  rerun(w,end+500);
  // (the exchange's own recovery plays on to the hold; what it had planned for after that is dropped by the next write)
  // s.flow (the replay): nothing holds between exchanges, so there is no hold to choose, and the next exchange is
  // written from a moment after the last contact, into this one's recovery: the fight runs on as one movement
  if(s.flow&&!r.ended&&!s.fall&&!r.down&&out.length){const last=Math.max(...seq.contactList.slice(c0).map(c=>c.t),...seq.misses.slice(m0).map(m=>m.t));
    end=Math.min(end,last+FLOW);}
  else if(!r.ended)end=holdAt(w,end,360,false);
  w.next=end;
  return {tc:out.length?out[0].t:clock(w,u0),contacts:out,end:clock(w,end),phrase:r.phrase};
}

// Where the picture holds still (a declared action; the end of an exchange), it is looked at for seconds, not a
// frame. So the hold is put at a moment that reads cleanly: from writer time u, the first moment (looked for up to
// `span` ms on) at which neither weapon lies across its owner's head or through the other fighter, both feet are
// down and, with `quiet`, the weapons have nearly stopped. If there is none, the best of them, else u.
const BODY=['Hd','S','M','P','K','F','bK','bF','E'];
const segd=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],k=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return Math.hypot(p[0]-(a[0]+vx*k),p[1]-(a[1]+vy*k));};
// what is wrong with fighter id's part of the picture at writer time t (0: nothing)
function badAt(w,q,t,id){
  const P=(i,n)=>PS.world(q,i,t,n),o=id==='a'?'b':'a',f=w.S.F[id],hn=P(id,'Hn'),tip=P(id,'tip');let bad=0;
  if(PS.footY(f,'ff',t)>0||PS.footY(f,'bf',t)>0)bad+=4;
  if(!(w.down&&w.down[id])&&segd(P(id,'Hd'),hn,tip)<20)bad+=2;
  for(const n of BODY)if(segd(P(o,n),hn,tip)<5){bad+=2;break;}
  return bad;
}
function holdAt(w,u,span,quiet){
  u=Math.ceil(u/REC)*REC;ensure(w,u+span+40);
  const q={fighters:w.S.F,rec:w.S.W.last()};let best=u,bs=Infinity;
  for(let t=u;t<=u+span;t+=REC*2){let bad=0,sp=0;const by={};
    for(const id of ['a','b']){by[id]=badAt(w,q,t,id);bad+=by[id];
      const t1=PS.world(q,id,t,'tip'),t2=PS.world(q,id,t+REC*2,'tip');sp=Math.max(sp,Math.hypot(t2[0]-t1[0],t2[1]-t1[1])/(REC*2));}
    if(quiet&&sp>.25)bad+=1;
    const score=bad*1000+(t-u);if(score<bs){bs=score;best=t;holdAt.by=by;}
    if(!bad)break;}
  holdAt.bad=Math.floor(bs/1000);
  return best;
}

// ----- a declared action, before its dice: the fighter commits (PitsWriter.intent) and the picture then holds -----
// kind: 'attack' | 'shield-strike' | 'parry' | 'shield' | 'evade'. Returns the stage time the movement has got there.
function intent(m,t,kind,pick){
  const w=world(m,t);if(!w||w.over)return t;
  const u=Math.max(tau(w,t),w.next);w.S.now=u;w.S.cut(u);w.next=u;
  for(const id of ['a','b'])w.S.F[id].grounded=!!(w.down&&w.down[id]);
  const e=declare(w,m.id,kind,u,pick);
  // The other fighter is still carrying on from the last exchange while this one commits. If that leaves its weapon
  // somewhere that does not read while the picture holds (across its own head, through the attacker), it readies
  // itself as the attack is declared: its weapon comes to a ward.
  const oid=m.id==='a'?'b':'a';
  if(/attack|strike/.test(kind)&&holdAt.by&&holdAt.by[oid]>=2&&!(w.down&&w.down[oid])){
    const e2=declare(w,oid,'parry',u,pick==null?0:(pick*7)%1);return clock(w,Math.max(e,e2));}
  return clock(w,e);
}
// one fighter's declared movement, written at u. The variants are tried in turn, starting from a random one (so two
// fights do not open the same way), and the first that comes to a clean hold is kept; if none does, the cleanest.
function declare(w,id,kind,u,pick){
  const n=PW.variants(w.S,id,kind),first=Math.min(n-1,Math.floor((pick==null?0:pick)*n));let best=null;
  const write=index=>{const e0=PW.intent(w.S,id,kind,u,{index});rerun(w,e0+500);return holdAt(w,e0,400,true);};
  for(let i=0;i<n;i++){const index=(first+i)%n,mk=w.S.mark(),e=write(index),bad=holdAt.by[id];
    if(!bad)return e;
    if(!best||bad<best.bad)best={index,bad};
    if(i===n-1&&best.index===index)return e;
    w.S.rollback(mk,u);}
  return write(best.index);
}

// ----- stand-ins (kept simple until they have phrases) -----
function keyAt(m,t,fn){const w=world(m,t);if(!w)return null;const u=Math.max(tau(w,t),w.next);w.S.now=u;const e=fn(w.S.F[m.id],u,w);w.next=Math.max(w.next,e);rerun(w,e);return clock(w,e);}
// how: 'sit' for a trip (the fighter is put on its backside), otherwise the crumble
function fallAt(w,id,u,how){const f=w.S.F[id],x=PW.standAt(f);w.S.now=Math.max(w.S.now,u);(w.down=w.down||{})[id]=true;
  return how==='sit'?PW.sit(f,u,x):PW.crumble(f,u,x);}
function fall(m,t){const w=world(m,t);if(!w||w.over||(w.down&&w.down[m.id]))return t;const u=Math.max(tau(w,t),w.next);const e=fallAt(w,m.id,u);w.next=e;rerun(w,e);return clock(w,e);}
function stand(m,t){const w0=world(m,t);if(w0&&w0.down)w0.down[m.id]=false;if(w0)w0.S.F[m.id].grounded=false;return keyAt(m,t,(f,u)=>{const x=PW.standAt(f);f.key(u,{px:x-6,py:44,lean:24,bend:10,head:-10},'together');
  // (from the heap the feet are under the body: the rear foot goes back to push up, the front one out into a stance)
  if(PW.planned(f,'ff')-PW.planned(f,'bf')<40){f.step('bf',u+60,u+260,x-30,4);f.step('ff',u+300,u+480,x+26,6);}
  f.key(u+420,{px:x,py:74,lean:6,bend:4,head:-8,h:[22,-18],w:30,o:[18,-27]});return u+620;})??t;}
function lower(m,t){const w=world(m,t);if(!w||w.over)return t;
  return keyAt(m,t,(f,u)=>{f.key(u,{lean:3,head:-14,h:[10,-32],w:-66});return u+600;})??t;}
function yieldTo(m,t){return keyAt(m,t,(f,u)=>{f.key(u,{lean:16,bend:10,head:22,h:[0,-58],w:-70,o:[4,-50]});return u+520;})??t;}
// Press Advantage (Core p.97): the presser keeps the point in the other's face and the other covers, giving a little
// ground with the upper body, so it cannot attack. Written from where both are; the first variant that holds cleanly
// is kept (the picture holds on it until the next action). The engine's restriction is unchanged: this only draws it.
const PRESS=[
  // (the arm well out, the forearm level, so the wrist can hold the point forward)
  {a:{lean:12,bend:8,head:-14,h:[50,-4],w:6},d:{lean:-6,bend:8,head:-4,h:[18,-10],w:74}},
  {a:{lean:10,bend:8,head:-12,h:[46,-12],w:12},d:{lean:-8,bend:8,head:-2,h:[14,-16],w:84}},
  {a:{lean:8,bend:6,head:-10,h:[42,2],w:0},d:{lean:-4,bend:6,head:-6,h:[20,-6],w:66}}];
function press(A,D,t){
  const w=world(A,t);if(!w||w.over||(w.down&&(w.down[A.id]||w.down[D.id])))return t;
  const u=Math.max(tau(w,t),w.next);w.S.now=u;w.S.cut(u);
  const fa=w.S.F[A.id],fd=w.S.F[D.id];let best=null;
  for(let i=0;i<PRESS.length;i++){const mk=w.S.mark(),v=PRESS[i];
    fa.key(u,{...v.a,h:v.a.h.slice()},'attack');fd.key(u+40,{...v.d,h:v.d.h.slice()},'cover');
    rerun(w,u+900);const e=holdAt(w,u+380,300,true),bad=holdAt.bad;
    if(!bad){w.next=e;return clock(w,e);}
    if(!best||bad<best.bad)best={i,bad};
    w.S.rollback(mk,u);}
  const v=PRESS[best.i];fa.key(u,{...v.a,h:v.a.h.slice()},'attack');fd.key(u+40,{...v.d,h:v.d.h.slice()},'cover');
  rerun(w,u+900);const e=holdAt(w,u+380,300,true);w.next=e;return clock(w,e);
}
function react(){return 0;}
// back to the engine's range (the engine changed it): a walk, the writer's measure step, from where the fighter stands
function recover(m,t,gap){const w=world(m,t);if(!w||w.over||(w.down&&w.down[m.id]))return t;
  return keyAt(m,t,(f,u)=>{w.S.cut(u);const want=L0.station(m,gap),e=want-PW.planned(f,'ff');
    return Math.abs(e)<6?u:PW.takeMeasure(f,u,e,null,w.S.W.look);})??t;}
function place(m,t,gap,state){
  m.pair.gap=gap;const w=m.pair.world;
  if(!w)return t+1;                                    // before the bout's first movement: the world is made at that gap
  if(state==='lying')return fall(m,t);
  return recover(m,t,gap);
}

const api={supports,fighter,gap:L0.gap,station:L0.station,place,recover,intent,blow,fall,stand,lower,yieldTo,press,react,pose,
  PACE,bladeKey,world:m=>m.pair.world};
root.PitsSpringLive=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
