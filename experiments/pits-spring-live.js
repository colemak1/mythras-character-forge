// The Pits: the spring movement (pits-spring.js) and the exchange writer (pits-writer.js) driving the live stage.
// A TRIAL, behind ?stage=spring (owner, 2026-11-13: "do your rec": wire one family into the live Pits behind a hidden
// switch to find the integration problems early; nothing is released). Without the switch, or when either fighter's
// weapon has no family yet, the stage keeps today's movement (PitsMotion.LIVE).
//
// The stage (pits-stage.js) talks to its movement layer through one small interface: make a fighter, place it, write a
// blow from the engine's resolved facts and get back when and where its contacts land, draw a pose at the stage's
// clock, and a few others (fall, stand, lower, yield, press, recover). This file answers the same interface:
//   - both fighters live in one writer world (PitsWriter.create), made when the stage has made both;
//   - each blow is one record for PitsWriter.exchange, written from the stage's clock: nothing is written before the
//     moment the stage has already shown (S.now);
//   - the simulation runs forward as the clock does (ensure), from the writer's checkpoints;
//   - writer time runs at PACE times the stage's clock (the owner's chosen pace for the studies).
// Stand-ins, kept simple until they have phrases: fall, stand, lower, yield, Press Advantage (nothing), recover (a walk
// back to the engine's range). Known limits are in docs/pits-animation-direction.md, "Live trial".
(function(root){
const PM=root.PitsMotion||(typeof require==='function'?require('./pits-motion.js'):null);
const PS=root.PitsSpring||(typeof require==='function'?require('./pits-spring.js'):null);
const PW=root.PitsWriter||(typeof require==='function'?require('./pits-writer.js'):null);
const L0=PM.LIVE,PACE=1.65,REC=PS.REC;

// the stage draws every blade as kind 'blade' with a length: the writer's weapon key for that length
const bladeKey=wk=>wk.thin?'rapier':wk.len<=55?'dagger':wk.len<=72?'shortsword':wk.len<=88?'falchion':wk.len<=98?'sword':wk.len<=106?'longsword':'rapier';
function supports(wk){return !!(wk&&wk.kind==='blade'&&PW.profile(bladeKey(wk)));}

// ----- fighters: the stage makes them one at a time; the world is made once both exist -----
let pend=null;
function fighter(id,wk,swap,look){
  if(!pend||pend[id])pend={};                       // a fighter made again starts a new pair (a new bout)
  const m={id,hx:PM.CENTRE+(id==='a'?-1:1)*PM.SPACING/2,face:id==='a'?1:-1,weapon:{key:wk.kind,len:wk.len},swap:!!swap,
    guard:{...PM.SWORD_GUARD},wk,shield:!!(look&&look.shield),pair:pend,spring:true};
  pend[id]=m;return m;
}
function world(m,t){
  const P=m.pair;if(P.world)return P.world;if(!P.a||!P.b)return null;
  const gap=P.gap||L0.gap(P.a.wk,P.b.wk,'long'),sh=-(gap-PM.SPACING)/2;
  const S=PW.create({weapons:{a:bladeKey(P.a.wk),b:bladeKey(P.b.wk)},shields:{a:P.a.shield?'heater':'none',b:P.b.shield?'heater':'none'},
    hx:{a:P.a.hx,b:P.b.hx},shift:{a:sh,b:sh},id:'live',title:'The Pits (spring trial)'});
  S.now=0;
  P.world={S,T0:t,next:0,over:false,shown:0};
  return P.world;
}
const tau=(w,t)=>Math.max(0,(t-w.T0)*PACE);           // stage clock -> writer time
const clock=(w,u)=>w.T0+u/PACE;                        // writer time -> stage clock
// simulate far enough ahead to draw writer time u
function ensure(w,u){const L=w.S.W.last();if(!L||L.a.length*REC<u+REC*2)w.S.W.run(Math.ceil((u+600)/REC)*REC);}

// ----- drawing -----
function guardJoints(m){const g=m.guard;return PS.solve({...g,ffy:0,bfy:0,fs:0,wr:null},m.weapon.len);}
function pose(m,t,limp){
  const w=world(m,t);if(!w)return Object.assign(guardJoints(m),{blen:m.weapon.len});
  const u=tau(w,t);ensure(w,u);
  const f=w.S.F[m.id],s=w.S.W.last()[m.id][Math.floor(u/REC)];
  const p=PS.pose(f,s,u);
  if(limp&&limp.weapon){p.h=[4,-58];p.wr=-8;}
  if(limp&&limp.off)p.o=[-3,-59];
  const j=PS.solve(p,f.weapon.len);j.blen=f.weapon.len;return j;
}

// ----- a blow: the engine's facts as one record for the writer -----
// s: {outcome (the stage's words), loc, lost, shield (the parry was the shield's), fall, defeated}
function blow(F,aid,t,s){
  const A=F[aid],did=aid==='a'?'b':'a',w=world(A,t);
  if(!w)return {tc:t,contacts:[],end:t};
  const u0=Math.max(tau(w,t),w.next);w.S.now=u0;
  const rec={attacker:aid,loc:s.loc||'chest',outcome:s.outcome||'wound',lost:s.lost||0,
    ...(s.shield?{defence:'shield'}:{}),after:s.defeated?[{type:'end',winner:aid,how:'injury'}]:[]};
  const seq=w.S.seq,c0=seq.contactList.length,m0=seq.misses.length;
  const r=PW.exchange(w.S,rec,u0);
  ensure(w,r.t);
  const out=[];
  for(const c of seq.contactList.slice(c0))out.push({t:clock(w,c.t),kind:c.kind==='wound'?'body':'clash',at:c.at,raw:c.kind});
  for(const m of seq.misses.slice(m0))out.push({t:clock(w,m.t),kind:'miss',at:PS.world({fighters:w.S.F,rec:w.S.W.last()},aid,m.t,'tip')});
  out.sort((x,y)=>x.t-y.t);
  let end=r.t;
  if(r.ended)w.over=true;
  else if(s.fall)end=fallAt(w,did,r.t);
  w.next=end;
  return {tc:out.length?out[0].t:clock(w,u0),contacts:out,end:clock(w,end),phrase:r.phrase};
}

// ----- stand-ins (kept simple until they have phrases) -----
function keyAt(m,t,fn){const w=world(m,t);if(!w)return null;const u=Math.max(tau(w,t),w.next);w.S.now=u;const e=fn(w.S.F[m.id],u,w);w.next=Math.max(w.next,e);ensure(w,e);return clock(w,e);}
function fallAt(w,id,u){const f=w.S.F[id],x=PW.standAt(f);w.S.now=Math.max(w.S.now,u);
  f.key(u,{px:x-6,py:44,lean:-16,bend:10,head:4},'together');f.key(u+300,{px:x-22,py:16,lean:-60,bend:10,head:8});
  f.key(u+700,{px:x-24,py:12,lean:-80,bend:6,head:2,h:[40,-16],w:4,o:[-40,-10]});return u+800;}
function fall(m,t){const w=world(m,t);if(!w||w.over)return t;const u=Math.max(tau(w,t),w.next);const e=fallAt(w,m.id,u);w.next=e;ensure(w,e);return clock(w,e);}
function stand(m,t){return keyAt(m,t,(f,u)=>{const x=PW.standAt(f);f.key(u,{px:x-6,py:44,lean:24,bend:10,head:-10},'together');
  f.key(u+420,{px:x,py:74,lean:6,bend:4,head:-8,h:[22,-18],w:30,o:[18,-27]});return u+620;})??t;}
function lower(m,t){const w=world(m,t);if(!w||w.over)return t;
  return keyAt(m,t,(f,u)=>{f.key(u,{lean:3,head:-14,h:[22,-36],w:-30});return u+600;})??t;}
function yieldTo(m,t){return keyAt(m,t,(f,u)=>{f.key(u,{lean:16,bend:10,head:22,h:[0,-58],w:-70,o:[4,-50]});return u+520;})??t;}
function press(A,D,t){return t;}
function react(){return 0;}
// back to the engine's range: a walk (the writer's measure step), from where the fighter stands
function recover(m,t,gap){const w=world(m,t);if(!w||w.over)return t;
  return keyAt(m,t,(f,u)=>{const want=L0.station(m,gap),e=want-PW.planned(f,'ff');
    return Math.abs(e)<6?u:PW.takeMeasure(f,u,e,null,w.S.W.look);})??t;}
function place(m,t,gap,state){
  m.pair.gap=gap;const w=m.pair.world;
  if(!w)return t+1;                                    // before the bout's first movement: the world is made at that gap
  if(state==='lying')return fall(m,t);
  return recover(m,t,gap);
}

const api={supports,fighter,gap:L0.gap,station:L0.station,place,recover,blow,fall,stand,lower,yieldTo,press,react,pose,
  PACE,bladeKey,world:m=>m.pair.world};
root.PitsSpringLive=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
