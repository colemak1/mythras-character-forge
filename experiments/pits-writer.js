// The Pits: the exchange writer. Turns resolved exchanges (the engine's facts: who attacks, where, the defence, the
// outcome, the damage, what follows) into spring movement for both fighters, one exchange after another, each starting
// from wherever the last one left them. PRESENTATION ONLY: nothing here rolls or decides.
//
// Step 1 of "Path to the live Pits" (docs/pits-animation-direction.md). The phrases are the ten-beat fight study's
// beats, written for an attacker and a defender instead of for A and B:
//   - every foot and hip position in a phrase is relative to where that fighter stands when the phrase starts (the
//     midpoint of its planned feet), so a phrase can be played from any place on the floor, by either fighter;
//   - the measure is the attacker's job: if the gap between the two is not the one the phrase was written for, the
//     attacker first takes the measure (a step in or out, weight handled), then the phrase runs;
//   - the no-gap rule and the crunch (hit-stops, impulses, flashes, shake) come with the phrases;
//   - each exchange ends on a decision boundary (seq.pauses), where the live Pits would hold.
// Proof: the ten-beat fight (pits-fight.js) is these phrases fed eight fixture records, and passes tests/pits-fight.cjs.
// Which phrase an exchange gets: see PICK below. Combinations without a phrase of their own borrow the nearest one and
// say so in seq.notes (kind 'stand-in'); weapon families and hit locations come in later steps.
(function(root){
const PS=root.PitsSpring||(typeof require==='function'?require('./pits-spring.js'):null);
const {Fighter,simulate,pose,solve,handAt,PM,REC,rad}=PS;
const {SWORD_GUARD,WEAPONS}=PM;

// firm springs: the same order of the body as the short study, without the overshoot
const FIRM={px:[3.2,.97],py:[3.4,.95],lean:[2.9,.92],bend:[2.7,.92],head:[2.6,.88],turn:[3,.92],
  hx:[3.8,.9],hy:[3.8,.9],ox:[2.6,.88],oy:[2.6,.88],wr:[3.4,.9]};
// alive: a slow weight shift, breathing, the guard and the head never quite still (amplitudes in rig units and degrees,
// periods in ms; each fighter has its own phases)
const LIFE=(ph)=>({amp:{px:2.2,py:1.3,lean:1.4,bend:.8,head:1.6,turn:1.5,hx:1.8,hy:1.6,wr:3.5,ox:2.2,oy:2},
  per:{px:1900,py:1150,lean:2300,bend:1700,head:1500,turn:2100,hx:1350,hy:1750,wr:1600,ox:1450,oy:1250},
  ph:Object.fromEntries(['px','py','lean','bend','head','turn','hx','hy','wr','ox','oy'].map((c,i)=>[c,ph+i*1.7]))});
const r2=t=>Math.round(t/REC)*REC;

// ----- weapons: how each is held and moved (the stage's weapon keys, pitsStageWeaponKind in pits-stage.js) -----
// family 'cut': the one-handed sword phrases. family 'thrust': short blades and the rapier (the point leads).
// Phrases are written for the broadsword (92); contact points along a blade scale with its length, and the attacker
// stands closer or further by the difference in reach. Other weapons have no family yet (later steps).
function profile(key){
  const k=String(key||'sword');
  if(/^(dagger|knife|main-gauche)$/.test(k))return {key:k,len:50,family:'thrust'};
  if(k==='shortsword')return {key:k,len:68,family:'thrust'};
  if(k==='rapier')return {key:k,len:112,family:'thrust',thin:true};
  if(k==='sword'||k==='broadsword')return {key:k,len:92,family:'cut'};
  if(k==='longsword')return {key:k,len:104,family:'cut'};
  if(/^(falchion|sabre|scimitar)$/.test(k))return {key:k,len:84,family:'cut'};
  return null;
}
// shields (Core p.63 sizes): the radius it is drawn with. Carried on the off hand.
const SHIELD_R={buckler:13,target:17,heater:19,kite:23,hoplite:25,scutum:26};
const shieldR=key=>key&&key!=='none'?(SHIELD_R[key]||19):0;
// Own head (Work's check, 2026-11-13): seen from the side, a blade held back over the shoulder or upright in front of
// the face crosses the wielder's own head. Chambers lie flatter behind the shoulder, under the head (h [12,-8], 160);
// raised holds put the hilt above the head (h [16,40], 150); upright covers stand the blade further out in front.
// a shield-bearer keeps the shield forward in front of the chest (offset from the shoulders), not the empty arm swung
const COVER=[26,-18];
const SWORD=92,REACH=.75;
// a contact point written for the broadsword, on this blade: on a shorter blade at the same fraction of its length;
// on a longer one with as much blade beyond it as the broadsword has (the extra length is on the hilt side, so a long
// blade's point does not reach past a contact into the other's body)
const al=(f,along)=>f.weapon.len<=SWORD?along*f.weapon.len/SWORD:f.weapon.len-(SWORD-along);

// where a fighter stands: the midpoint of its feet as planned so far (the last step written for each foot)
function planned(f,foot){let s=null;for(const x of f.feet[foot])if(!s||x.t1>=s.t1)s=x;return s?s.x:f.home[foot];}
const standAt=f=>(planned(f,'ff')+planned(f,'bf'))/2;
// the gap between two fighters' stands, on the floor
const gapOf=(a,b)=>Math.abs(b.W([standAt(b),0])[0]-a.W([standAt(a),0])[0]);

// A fighter as a phrase sees it: every x (feet, hips) is moved by dx, so the phrase's numbers, written for where the
// study had this fighter, land relative to where it actually is.
// (A step's weight shift can start up to 170 ms before its phrase, so before the decision boundary. Fine for a
// record written ahead; the live stage cannot write into the past, and will need it clamped: see the direction doc.)
function placed(f,dx){
  const mv0=p=>p&&p.px!=null?{...p,px:p.px+dx}:p;
  // a phrase's empty-hand posture is the shield held forward when this fighter carries one
  const mv=p=>{p=mv0(p);return p&&f.shieldR&&p.o?{...p,o:COVER.slice()}:p;};
  return {f,dx,id:f.id,face:f.face,
    walk(foot,t0,t1,x,o){f.walk(foot,t0,t1,x+dx,o);return this;},
    step(foot,t0,t1,x,lift){f.step(foot,t0,t1,x+dx,lift);return this;},
    key(t,p,order,o){f.key(t,mv(p),order,o);return this;},
    impulse(t,v){f.impulse(t,v);return this;}};
}

function create(opt){
  opt=opt||{};
  const names=opt.names||{a:'A',b:'B'};
  const wk={a:'sword',b:'sword',...(opt.weapons||{})},sk={a:'none',b:'none',...(opt.shields||{})},notes=[];
  const arm=id=>{const p=profile(wk[id]);if(!p)notes.push({kind:'stand-in',weapon:wk[id],who:id});
    return {...WEAPONS.sword,name:wk[id],...(p||profile('sword')),key:wk[id]};};
  // on guard, points threatening but on different lines (A's a little higher, B's lower), so they do not cross
  const A=new Fighter('a',480,1,arm('a'),{...SWORD_GUARD,h:[27,-28],w:54});
  const B=new Fighter('b',720,-1,arm('b'),{...SWORD_GUARD,h:[26,-36],w:16});
  for(const f of [A,B]){
    f.spring=FIRM;f.minReach=20;
    // smooth: every key is eased into (35 ms; strikes a third of that), so nothing starts from rest with a jolt
    f.smooth=35;
    // steps: a foot lifts and lands on a smooth arc, and the hips start travelling as it leaves
    f.liftShape=1;f.stepLead=.1;
  }
  A.life=LIFE(0);B.life=LIFE(2.1);
  for(const f of [A,B]){f.shieldR=shieldR(sk[f.id]);f.shieldKey=sk[f.id];
    if(f.shieldR){f.guard.o=COVER.slice();f.start.ox=COVER[0];f.start.oy=COVER[1];}}
  const F={a:A,b:B};
  const seq={id:opt.id||'fight',title:opt.title||'A fight',fighters:F,marks:[],pauses:[],stops:[],fx:[],wounds:[],contacts:{},
    contactList:[],misses:[],notes,beats:[],grips:[],names,scripted:true,records:[],exchanges:[]};

  // ----- looking ahead: the poses at time t with everything written so far -----
  // Each look carries on from the last run's checkpoint before the earliest thing written since (dirty), so writing
  // the fight exchange by exchange costs about one run rather than one run per look.
  let last=null,dirty=Infinity;
  for(const f of [A,B])for(const [m,ti] of [['key',0],['step',1],['impulse',0],['pin',3]]){const orig=f[m];
    f[m]=function(...a){dirty=Math.min(dirty,a[ti]-REC*2);return orig.apply(this,a);};}
  for(const f of [A,B]){const w=f.walk;f.walk=function(foot,t0,...r){dirty=Math.min(dirty,t0-400);return w.call(this,foot,t0,...r);};}
  const run=t=>{const r=simulate(F,t,{from:PS.resumeFrom(last,dirty)});last=r;dirty=Infinity;return r;};
  const look=t=>{t=r2(t);const r=run(t+REC);return {t,out:{a:r.a[t/REC],b:r.b[t/REC]}};};
  const U=f=>f.f||f;
  const J=(f,ctx,t)=>{f=U(f);return solve(pose(f,ctx.out[f.id],t),f.weapon.len);};
  // named points on a fighter's body or blade, as functions of the running simulation (so a contact follows the body)
  const on=(f0,name,u)=>{const f=U(f0);return (t,ctx)=>{const j=J(f,ctx,t),L=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];
    let p;
    if(name==='blade')p=[j.Hn[0]+Math.cos(rad(j.w))*u,j.Hn[1]+Math.sin(rad(j.w))*u];
    else if(name==='forearm')p=L(j.E,j.Hn,u==null?.5:u);
    else if(name==='offarm')p=L(j.oE,j.oHn,u==null?.5:u);
    else if(name==='thigh')p=L(j.P,j.K,u==null?.55:u);
    else if(name==='bthigh')p=L(j.P,j.bK,u==null?.55:u);
    else if(name==='chest')p=L(j.M,j.S,.5);
    else if(name==='abdomen')p=L(j.P,j.M,.5);
    else p=j[name];
    return f.W(p);};};
  const fixed=P=>()=>P;
  function feasible(f,q,P,along,w0){
    const tq=PS.torso(q);
    for(let d=0;d<=70;d+=2)for(const w of d?[w0+d,w0-d]:[w0]){
      const h=handAt(f,q,P,along,w),r=Math.hypot(tq.S[0]+h[0]-tq.wS[0],tq.S[1]+h[1]-tq.wS[1]);
      if(r>PS.ARM-3||r<26)continue;          // within reach, and never with the arm folded against the shoulder
      const fore=solve({...q,h,wr:0},f.weapon.len).w,g=PS.norm(w-fore);
      if(g>=PS.WRIST[0]+1&&g<=PS.WRIST[1]-1){if(d)seq.notes.push({f:f.id,asked:w0,got:w});return w;}
    }
    return null;
  }
  // the angle, and if no angle fits at that point of the blade, a point a little further out or nearer the hilt
  // (a longer blade, close in): {w, along}. The broadsword's own contacts all fit at the point asked.
  function fit(f,q,P,along,w0){
    for(const k of [1,1.1,.9,1.2,.8,.7]){const a=Math.min(f.weapon.len-2,along*k),w=feasible(f,q,P,a,w0);
      if(w!=null){if(k!==1)seq.notes.push({f:f.id,kind:'along',asked:along,got:a});return {w,along:a};}}
    seq.notes.push({f:f.id,asked:w0,got:null});return {w:w0,along};
  }
  // A blow, a parry or a deflection: from tKey the hand goes (snapping) toward a point past the contact (through),
  // and over the last `blend` ms the blade is brought exactly to it: the point `along` the blade on target at tc,
  // at blade angle w. hold: how long the contact holds. The blade angle is the nearest the arm can hold there.
  function aim(f0,tKey,tc,target,w,along,o){
    const f=U(f0);o=o||{};tc=r2(tc);along=al(f,along);
    const c=look(tc),q=pose(f,c.out[f.id],tc),P=target(tc,c);
    ({w,along}=fit(f,q,P,along,w));
    const h=handAt(f,q,P,along,w),th=o.through||[0,0];
    f.key(tKey,{h:[h[0]+th[0],h[1]+th[1]],w:o.wKey==null?w:o.wKey},o.order||'attack',{snap:o.snap==null?true:o.snap});
    f.pin('h',along,target,tc-(o.blend||70),tc,tc+(o.hold||0),w);
    P.along=along;          // the point of the blade actually on the contact (already for this blade)
    f._aim={t:tc,along};
    return P;
  }
  // A decision boundary must freeze a pose, not a blur: both feet down and nothing moving fast. If the phrase's own
  // boundary is not like that (played from another place or after another phrase), it waits (up to 160 ms) for a quiet
  // moment; never earlier, which would cut the exchange's own movement short.
  const JN=['Hd','S','M','P','K','F','bK','bF','E','Hn','oE','oHn','tip'];
  function motion(t){
    const r=run(t+16+REC);let m=0;
    for(const f of [A,B]){
      if(PS.footY(f,'ff',t)>0||PS.footY(f,'bf',t)>0)return Infinity;
      const j0=solve(pose(f,r[f.id][t/REC],t),f.weapon.len),j1=solve(pose(f,r[f.id][(t+16)/REC],t+16),f.weapon.len);
      for(const n of JN)m=Math.max(m,Math.hypot(j1[n][0]-j0[n][0],j1[n][1]-j0[n][1]));
    }
    return m;
  }
  function settle(t){
    const t0=t;t=r2(t);if(motion(t)<4.5)return t0;
    let best=t,bm=Infinity;
    for(let d=10;d<=160;d+=10){const u=t+d,m=motion(u);
      if(m<2.5)return u;if(m<bm){bm=m;best=u;}}
    return best;
  }
  // The defender meets the blow at C: with the blade (aim), or, when the record says the parry or the ward was the
  // shield's and this fighter has one, with the shield's face. The shield's centre is set back from C toward the
  // defender, a little below the line of the blow, and the off hand is pinned there; the blow pushes the arm back.
  function guard(f0,st,tKey,tc,target,w,along,o){
    const f=U(f0);o=o||{};
    if(!(st&&st.defence==='shield'&&f.shieldR))return aim(f0,tKey,tc,target,w,along,o);
    tc=r2(tc);const c=look(tc),q=pose(f,c.out[f.id],tc),R=f.shieldR;let C=target(tc,c);
    // the blow meets the front of the shield if the off hand reaches there, else a rim further down (low blows: the
    // lower rim, the shield held above the point)
    // and if no rim reaches, the shield meets the blow higher, at the lowest point it can reach (the attacker aims there)
    const oS=f.W(PS.torso(q).oS),reach=x=>{const r=Math.hypot(x[0]-oS[0],x[1]-oS[1]);return r<=PS.ARM-4&&r>=24;};let ctr=null;   // (nor pushed round the shoulder)
    for(let lift=0;lift<=80&&!ctr;lift+=2){const Cl=[C[0],C[1]+lift];
      for(const a of [12,-10,-30,-50,-70,-90]){const u=[f.face*Math.cos(rad(a)),Math.sin(rad(a))],x=[Cl[0]-u[0]*R,Cl[1]-u[1]*R];
        if(reach(x)){ctr=x;if(lift)seq.notes.push({kind:'shield-higher',who:f.id,by:lift});C=Cl;break;}}}
    if(!ctr)ctr=[C[0]-f.face*R,C[1]];
    f.key(tKey,{o:PS.offFor(f,q,ctr)},o.order||'cover',{snap:o.snap==null?true:o.snap});
    f.pin('o',null,()=>ctr,tc-(o.blend||70),tc,tc+(o.hold||0));
    f.impulse(tc+1,{ox:-180,oy:-40});
    // the sword is kept back and low, ready, while the shield takes the blow (held forward in guard, the point is
    // where the parried attacker's arm comes down)
    f.key(tKey,{h:[12,-36],w:-60},'cover');
    f._block={t:tc,R,ctr};return C;
  }
  // The shield's face driven onto C (a shield strike): the off hand keyed toward it and pinned where the face is on C.
  // o.toward: a second target (the chest); if the off hand cannot put the face on the first, the face goes to the
  // nearest point between the two that it can reach.
  function shieldTo(f0,tKey,tc,target,o){
    const f=U(f0);o=o||{};tc=r2(tc);const c=look(tc),q=pose(f,c.out[f.id],tc),R=f.shieldR;let C=target(tc,c);
    if(o.toward){const T2=o.toward(tc,c),oS=f.W(PS.torso(q).oS);
      for(let k=0;k<=1.001;k+=.1){const X=[C[0]+(T2[0]-C[0])*k,C[1]+(T2[1]-C[1])*k],cx=[X[0]-f.face*R,X[1]];
        const r=Math.hypot(cx[0]-oS[0],cx[1]-oS[1]);if(r<=PS.ARM-4&&r>=26){if(k)seq.notes.push({kind:'shield-nearer',who:f.id,by:+k.toFixed(1)});C=X;break;}}
      const tgt=C;target=()=>tgt;}
    const ctr=[C[0]-f.face*R,C[1]];
    f.key(tKey,{o:PS.offFor(f,q,[ctr[0]+f.face*(o.through||0),ctr[1]])},'attack',{snap:o.snap==null?1.6:o.snap});
    f.pin('o',null,()=>ctr,tc-(o.blend||60),tc,tc+(o.hold||0));
    f._block={t:tc,R,ctr};return C;
  }
  // A parry that fails (the record: tried 'parry' or 'shield'): the defender goes for the place a parry would meet the
  // blow (C), with the blade or the shield, but is set moving late (from tKey, the body under it) and stops a little
  // short of the line, so the blow gets there first. No contact: the blow lands as written.
  // short: how far short of the line it stops (12 unless asked)
  function tryParry(f0,st,tKey,tc,C,w,along,short){
    const f=U(f0);if(!st||!st.tried)return;tc=r2(tc);
    const c=look(tc),q=pose(f,c.out[f.id],tc),Cs=[C[0]-f.face*(short==null?12:short),C[1]];
    if(st.tried==='shield'&&f.shieldR){const R=f.shieldR,ctr=[Cs[0]-f.face*R*Math.cos(rad(12)),Cs[1]-R*Math.sin(rad(12))];
      f.key(tKey,{o:PS.offFor(f,q,ctr)},'cover');}
    else{const r=fit(f,q,Cs,al(f,along),w);f.key(tKey,{h:handAt(f,q,Cs,r.along,r.w),w:r.w},'cover');}
    seq.notes.push({kind:'late parry',who:f.id,t:tc,with:st.tried});
  }
  const W={seq,F,names,look,on,fixed,aim,guard,shieldTo,tryParry,r2,settle,
    mark:(t,who,label)=>seq.marks.push({t,who,label}),
    beat(n,t,short,label){seq.beats.push({n,t,short,label});W.mark(t,'both',n+'. '+label);},
    pause:(t,label)=>seq.pauses.push({t,label}),
    contact(t,kind,P,parts){
      // a part met by a shield (guard above) is the shield's face, not a point on a blade
      for(const k of ['a','b']){const f=parts[k]&&F[parts[k].who];
        if(f&&f._block&&f._block.t===r2(t)){parts[k]={who:f.id,shield:f._block.R,ctr:f._block.ctr};f._block=null;}}
      // a blade part is the point the aim actually put on the contact (it may have moved along the blade to fit)
      for(const k of ['a','b'])if(parts[k]&&!parts[k].exact&&!parts[k].shield){const f=F[parts[k].who];
        parts[k]={...parts[k],along:f._aim&&f._aim.t===r2(t)?f._aim.along:al(f,parts[k].along)};}
      for(const k of ['a','b'])if(parts[k])delete parts[k].exact;
      const c={t:r2(t),kind,at:P,...parts};seq.contactList.push(c);return c;},
    stop:(t,d)=>seq.stops.push({t:r2(t),d}),
    fx:(t,kind,at,power)=>seq.fx.push({t:r2(t),kind,at,power}),
    nm:f=>names[U(f).id]};
  return {W,seq,F,t:0,n:0,bind:null,over:false};
}

// ===================================================================================================================
// The phrases. Each is written in the frame the study had for its two roles (ref: where each stood, gap: the measure),
// takes the time it may start (the last decision boundary) and returns the next one. a: the attacker, d: the defender.
// ===================================================================================================================
const PHRASES={};

// ----- the opening: the attacker comes in a short step, the defender gives a little -----
PHRASES.approach={ref:{a:-2,d:-2},gap:244,width:{a:64,d:64},lead:0,run(W,a,d,t){
  const A=W.nm(a),D=W.nm(d);
  W.beat(W.n(),t,'Approach','Approach and measure: '+A+' comes in a short step, '+D+' gives a little');
  // a short moment on guard, watching (never quite still). Then a short step in (front foot, then the rear follows);
  // the defender gives (rear foot back, then the front foot draws after it); the points stay on each other
  a.walk('ff',t+320,t+540,52,{py:77,lift:8,settle:.5});
  a.walk('bf',t+680,t+860,-12,{py:75,lift:8,settle:.5,load:.4});
  a.key(t+400,{lean:7,bend:4,head:-8,h:[27,-28],w:50});
  d.walk('bf',t+500,t+700,-46,{py:77,lift:8,settle:.45});
  d.walk('ff',t+750,t+910,24,{py:77,lift:8,settle:.5,load:.25});
  d.key(t+580,{lean:4,bend:5,head:-7,h:[26,-36],w:16});
  return {end:t+930,label:'Measure taken. '+A+' chooses to attack.'};
}};

// ----- a cut at the upper body, met by a parry in front of the body and turned down -----
PHRASES.cutParried={ref:{a:20,d:-11},gap:231,width:{a:64,d:70},lead:20,run(W,a,d,t2,st){
  const A=W.nm(a),D=W.nm(d);
  W.beat(W.n(),t2,'Cut, parried',A+' cuts diagonally at '+D+'\'s upper body; '+D+' meets it in front of the body and gives through elbow and knees');
  // load: the weight settles back, the hilt comes up to the shoulder, the blade lies back
  a.key(t2,{px:-6,py:77,lean:0,bend:-3,head:-2,turn:-8,h:[12,-8],w:160,o:[26,-12]});
  a.walk('ff',t2+240,t2+400,96,{py:70,lift:7,settle:.55,load:.35});
  a.key(t2+330,{lean:18,bend:8,head:-14,turn:12,o:[-30,-42]});
  const tc=t2+520;
  // the meeting point: in front of the defender's upper body, a little above the shoulder
  let C=(()=>{const c=W.look(tc),s=W.on(d,'S')(tc,c);return [s[0]+d.face*61,s[1]+4];})();
  d.key(tc-260,{px:9,py:74,lean:14,bend:6,head:-12,o:[2,-30]},'cover');
  C=W.guard(d,st,tc-220,tc,W.fixed(C),100,20,{order:'cover',hold:40,blend:130,snap:1.4});
  W.aim(a,t2+300,tc,W.fixed(C),20,72,{through:[14,-22],hold:40,blend:60});
  W.contact(tc,'parry',C,{a:{who:a.id,along:72},b:{who:d.id,along:20},hold:40});
  // contact: the cut stops dead; the defender's knees and elbow give under it
  a.impulse(tc+1,{hx:'stop',hy:'stop',wr:'stop',px:-90,lean:-25,head:40});
  d.impulse(tc+1,{px:-50,py:-160,lean:-60,head:-50});
  // the parry redirects: the cut is turned down and out; the attacker's sword ends low and wide
  d.key(tc+40,{py:72,lean:8,bend:8,h:[26,-4],w:70},'together',{snap:true});
  a.key(tc+40,{h:[32,-34],w:-46,lean:14,bend:6},'together',{snap:true});
  a.key(tc+300,{px:40,py:72,lean:12,bend:6,head:-12,h:[34,-36],w:-30,o:[-20,-40]});
  d.key(tc+300,{px:0,py:74,lean:6,bend:7,head:-10,h:[22,-10],w:60,o:[6,-28]});
  W.stop(tc,140);W.fx(tc,'clash',C,1);
  W.mark(tc,d.id,'Parry: the cut is met in front of the body; '+D+' gives through the elbow and knees, and turns it down');
  return {end:tc+240,label:'The cut is parried and '+A+'\'s blade is low and wide.'};
}};

// ----- a rising cut at the ribs that the defender slips: it passes just outside the turned body -----
PHRASES.cutMissed={ref:{a:-11,d:42},gap:209,width:{a:70,d:108},lead:40,run(W,a,d,t3){
  const A=W.nm(a),D=W.nm(d),tm=t3+450;
  W.beat(W.n(),t3,'Counter, slipped',A+' counters at '+D+'\'s ribs; '+D+' draws the front foot back and turns, and the cut passes outside');
  a.key(t3,{px:-4,py:73,lean:2,bend:4,head:-8,turn:-10,h:[-2,-32],w:-155},'attack');      // a low chamber at the hip, blade back
  // an advance: the front foot, then the rear foot closes up, so the hips can go over the front foot for the cut
  a.walk('ff',t3+90,t3+240,72,{py:64,lift:8,settle:.55,load:.4});
  a.walk('bf',t3+250,t3+370,-8,{py:67,lift:7,settle:.2,load:.25,lead:60});
  a.key(t3+200,{lean:14,bend:8,head:-14,turn:12,o:[-26,-40]});
  // the slip: weight back, the front foot comes back under, the chest turns away and leans out of the line
  d.walk('ff',t3+170,t3+330,84,{py:68,lift:9,settle:.35,load:.45,push:160});
  d.key(t3+190,{lean:-8,bend:-4,head:-4,turn:-16,h:[12,-42],w:-95,o:[-6,-30]},'cover');
  // seen from the side, a cut that passes outside the body is one whose point falls just short of it
  const M=(()=>{const c=W.look(tm),p=W.on(d,'chest')(tm,c);return [p[0]+d.face*12,p[1]-12];})();
  W.aim(a,t3+220,tm,W.fixed(M),2,90,{through:[-6,16],blend:60});
  // nothing stops it: it runs on up past the defender's front and is drawn back
  a.key(tm+30,{h:[30,8],w:70,lean:12,bend:8},'attack',{snap:1.4});
  a.walk('bf',tm+130,tm+300,-26,{py:69,lift:8,settle:.5,load:.2});
  a.key(tm+320,{lean:9,bend:7,head:-10,turn:2,h:[24,-30],w:-30,o:[14,-26]});
  d.key(tm+150,{px:30,py:67});
  d.key(tm+320,{px:30,py:67,lean:6,bend:3,head:-8,turn:-4,h:[26,-14],w:58,o:[14,-26]});
  W.seq.misses.push({t:W.r2(tm),who:a.id,on:d.id,t0:W.r2(tm-120),t1:W.r2(tm+140)});
  W.mark(tm,a.id,'Miss: the rising cut passes just outside '+D+'\'s turned body and runs on past; '+A+' reins it in');
  return {end:tm+385,label:A+'\'s cut has missed and '+A+' has reined it in.'};
}};

// ----- a cut at the forward thigh, met low: the blades bind -----
PHRASES.lowBind={ref:{a:36,d:23},gap:181,width:{a:96,d:98},lead:5,run(W,a,d,t4,st){
  const A=W.nm(a),D=W.nm(d),tc=t4+560;
  W.beat(W.n(),t4,'Low attack',A+' follows the recovering blade with a cut at '+D+'\'s forward thigh; '+D+' pulls the leg back and lowers the blade to cover');
  // the hilt comes up beside the shoulder as the front foot goes in
  a.key(t4,{px:20,py:71,lean:6,bend:0,head:-6,turn:-6,h:[12,-8],w:160,o:[22,-14]});
  a.walk('bf',t4+10,t4+140,20,{py:69,lift:7,settle:.8,load:.45});
  a.walk('ff',t4+230,t4+380,102,{py:68,lift:8,settle:.6,load:.15,lead:90});
  a.key(t4+300,{lean:20,bend:12,head:-18,turn:10,o:[-26,-40]});
  // the weight goes back over the rear leg, the front foot lifts, comes back and is set down; the blade drops to cover
  d.walk('ff',t4+200,t4+380,44,{py:66,lift:11,settle:.3,load:.38});
  d.key(t4+260,{lean:12,bend:10,head:-16,o:[16,-18]},'cover');
  W.beat(W.n(),tc-40,'Low bind',A+'\'s cut meets '+D+'\'s lowered blade; '+A+' stops through the planted leg and hips, '+D+' holds its ground');
  let C=(()=>{const c=W.look(tc),k=W.on(d,'K')(tc,c);return [k[0]+d.face*26,k[1]+10];})();
  C=W.guard(d,st,t4+260,tc,W.fixed(C),-72,48,{order:'cover',hold:130,blend:150,snap:1.3});
  W.aim(a,t4+330,tc,W.fixed(C),-34,70,{through:[6,-14],hold:130,blend:60});
  const bind=W.contact(tc,'bind',C,{a:{who:a.id,along:70},b:{who:d.id,along:48},hold:130});
  // both take it: the attacker's travel is stopped in the front leg and hips (they sink), the defender's knees give
  a.impulse(tc+1,{hx:'stop',hy:'stop',wr:'stop',px:'stop',py:-100,lean:-35});
  d.impulse(tc+1,{py:-110,lean:-25});
  a.key(tc,{px:44,py:63,lean:14,bend:8},'together');
  d.key(tc,{py:67,lean:10,bend:10},'together');
  W.stop(tc,130);W.fx(tc,'clash',C,.9);
  W.mark(tc,a.id,'Low bind: both blades stop; '+A+'\'s weight is caught in the front leg and hips, '+D+' sinks a little and holds');
  return {end:tc+100,label:'The blades are bound low.',bind};
}};

// ----- out of a bind (or a low line), a cut at the head, parried above it -----
PHRASES.highParry={ref:{a:61,d:9},gap:170,width:{a:82,d:70},lead:40,run(W,a,d,t6,st){
  const A=W.nm(a),D=W.nm(d),tc=t6+520;
  W.beat(W.n(),t6,'Disengage high',A+' draws the blade back clear of '+D+'\'s point and cuts at the shoulder; '+D+' lifts into a high parry, stepping away');
  // the hand draws back toward the hip, then the blade comes up and over, well clear of the defender's point
  a.key(t6,{px:30,py:70,lean:6,bend:2,head:-8,turn:-8,h:[22,-2],w:40},'attack',{snap:1.3});    // the point lifts off the blade
  a.key(t6+150,{lean:4,head:-6,h:[12,-8],w:160,o:[22,-14]},'attack');
  // the feet follow: the rear foot closes up, then the front foot steps in with the cut
  a.walk('bf',t6+40,t6+190,36,{py:68,lift:8,settle:.8,load:.45});
  a.walk('ff',t6+270,t6+410,122,{py:69,lift:8,settle:.55,load:.15,lead:80});
  a.key(t6+330,{lean:16,bend:8,head:-14,turn:10,o:[-24,-40]});
  // the defender steps away with the rear foot and the blade comes up across, above the head
  d.walk('bf',t6+120,t6+300,-44,{py:71,lift:9,settle:.45,load:.3});
  d.key(t6+200,{lean:2,bend:0,head:-6},'cover');
  // (a shorter blade is parried higher: met just above the head, a dagger would lie across its own fighter's head)
  let C=(()=>{const c=W.look(tc),hd=W.on(d,'Hd')(tc,c);return [hd[0]+d.face*40,hd[1]+18+Math.max(0,SWORD-d.f.weapon.len)*.3];})();
  C=W.guard(d,st,t6+220,tc,W.fixed(C),170,30,{order:'cover',hold:60,blend:150,snap:1.3});
  W.aim(a,t6+330,tc,W.fixed(C),20,70,{through:[10,-18],hold:60,blend:60});
  W.contact(tc,'parry',C,{a:{who:a.id,along:70},b:{who:d.id,along:30},hold:60});
  a.impulse(tc+1,{hx:'stop',hy:'stop',wr:'stop',px:-60,lean:-25});
  a.key(tc+40,{h:[40,0],w:110},'together',{snap:2});
  d.impulse(tc+1,{py:-130,lean:-30,head:-40});
  W.stop(tc,130);W.fx(tc,'clash',C,1);
  W.mark(tc,d.id,'High parry: the cut is caught above '+D+'\'s head');
  return {end:tc+220,label:'The high cut is parried and '+A+'\'s arm is out.'};
}};

// ----- a short cut onto the opponent's sword forearm (a minor wound): the arm is knocked back, the guard closes -----
PHRASES.armCut={ref:{a:0,d:79},gap:161,width:{a:88,d:86},lead:20,run(W,a,d,t7,st){
  const A=W.nm(a),D=W.nm(d),tc=t7+260;
  W.beat(W.n(),t7,'Arm wound','From the high parry '+A+' turns the blade over and cuts short onto '+D+'\'s sword forearm');
  a.key(t7,{lean:10,bend:6,head:-12,turn:6},'attack');
  const P=W.aim(a,t7+40,tc,W.on(d,'forearm',.55),-40,60,{through:[4,-18],hold:30,blend:70,snap:1.6});
  W.fx(tc,'wound',P,1.3);
  W.contact(tc,'wound',P,{a:{who:a.id,along:60},part:'forearm',on:d.id,target:'forearm'});
  W.seq.wounds.push({t:W.r2(tc),who:d.id,part:'rfore',level:st.level||'minor'});
  // the defender recoils at the arm: the hand is knocked back and down, the elbow comes in, the guard closes
  d.impulse(tc+1,{px:-70,hx:-320,hy:-220,wr:-120,lean:-60,head:110});
  d.key(tc+20,{px:68,py:69,lean:4,bend:6,head:-10,turn:-10,h:[22,-18],w:70,o:[10,-26]},'together');
  a.key(tc+40,{lean:8,bend:6,h:[24,-20],w:-20},'attack');
  a.key(tc+200,{px:14,py:71,lean:8,bend:7,head:-10,h:[22,-22],w:6,o:[16,-22]});
  W.stop(tc,190);
  W.mark(tc,d.id,'The blade lands on '+D+'\'s sword forearm: the arm is knocked back, the elbow comes in, the guard closes');
  return {end:tc+280,tc,label:D+' is cut on the forearm and has closed up.',hurt:{[d.id]:'rarm'}};
}};

// ----- an advancing thrust, deflected up and out -----
PHRASES.thrustDeflected={ref:{a:0,d:79},gap:161,width:{a:88,d:86},lead:80,run(W,a,d,t8,st){
  const A=W.nm(a),D=W.nm(d),tc=t8+420;
  W.beat(W.n(),t8,'Thrust, deflected',A+' advances with a thrust at the body; '+D+' gives a short step back and deflects the point outward');
  // a short advance, the point in line, the arm extending last
  a.key(t8,{lean:10,bend:6,head:-12,turn:4,h:[10,-20],w:4,o:[18,-22]},'attack');
  a.walk('ff',t8+100,t8+250,70,{py:70,lift:8,settle:.62,load:.35});
  a.walk('bf',t8+265,t8+390,-14,{py:66,lift:7,settle:.25,load:.25,lead:60});
  a.key(t8+220,{lean:16,bend:8,head:-16,turn:12,o:[-20,-40]});
  // weight back, the front foot comes back, the guard stays closed
  d.walk('ff',t8+80,t8+240,100,{py:70,lift:9,settle:.3,load:.4});
  d.key(t8+120,{lean:2,bend:8,head:-8,turn:-10,h:[12,-14],w:72,o:[8,-28]},'cover');
  let C=(()=>{const c=W.look(tc),p=W.on(d,'chest')(tc,c);return [p[0]+d.face*28,p[1]-4];})();
  C=W.guard(d,st,t8+250,tc,W.fixed(C),45,30,{order:'cover',hold:30,blend:110,snap:1.5});
  W.aim(a,t8+260,tc,W.fixed(C),-2,78,{through:[16,0],hold:30,blend:70});
  W.contact(tc,'deflect',C,{a:{who:a.id,along:78},b:{who:d.id,along:30},hold:30});
  // the deflection carries the point up and out past the defender's head; the attacker's weight is still going forward
  a.impulse(tc+1,{hy:210,wr:100,lean:-20});d.impulse(tc+1,{py:-60,lean:-25});
  a.key(tc+30,{h:[30,18],w:70,lean:12,bend:8},'together',{snap:1.6});
  d.key(tc+40,{h:[32,-6],w:74},'together',{snap:1.3});
  W.stop(tc,110);W.fx(tc,'clash',C,.8);
  W.mark(tc,d.id,'Deflection: '+D+'\'s blade meets the thrust and carries the point out and up; '+A+'\'s weapon is left outside the line');
  // the decision boundary waits for the thrown blade to slow (the study ran straight on into the thigh cut; every
  // exchange now ends on a decision, and a hold must freeze a pose, not a blur)
  return {end:tc+200,label:A+'\'s thrust is deflected and the line is open.'};
}};

// ----- a short cut into the forward thigh: the leg gives, the pelvis drops -----
PHRASES.legCut={ref:{a:68,d:28},gap:144,width:{a:64,d:84},lead:0,run(W,a,d,t9,st){
  const A=W.nm(a),D=W.nm(d),tc=t9+300;
  W.beat(W.n(),t9,'Thigh cut',A+' steps into the opening with a short cut to '+D+'\'s forward thigh; the leg gives, the pelvis drops');
  a.walk('ff',t9+20,t9+180,124,{py:68,lift:8,settle:.58,load:.35});
  a.key(t9,{lean:8,bend:6,head:-10,turn:-4,h:[12,-8],w:150},'attack');
  a.key(t9+140,{lean:20,bend:10,head:-18,turn:10,o:[-20,-38]});
  // (in the study the defender's blade had just been thrown out by a deflection; from anywhere else its point is
  // still in line, so it drops to cover low as the cut comes, too late)
  const inLine=()=>{const c=W.look(t9+60),j=solve(pose(d.f,c.out[d.id],t9+60),d.f.weapon.len);return Math.abs(PS.norm(j.w))<=45;};
  if((!st.prev||st.prev.phrase!=='thrustDeflected'||st.prev.attacker===a.id)&&inLine())d.key(t9+60,{lean:8,bend:8,head:-12,h:[12,-32],w:-44-Math.max(0,d.f.weapon.len-SWORD)*1.5,o:[10,-26]},'cover');   // a longer blade covers more steeply
  if(st.tried){const c=W.look(tc),k=W.on(d,'K')(tc,c);W.tryParry(d,st,tc-220,tc,[k[0]+d.face*26,k[1]+10],-72,48,22+Math.max(0,d.f.weapon.len-SWORD));}   // (a longer blade stops further short: the attacker's front knee comes in under it)
  const P=W.aim(a,t9+150,tc,W.on(d,'thigh',.5),-40,62,{through:[6,-16],hold:40,blend:60});
  W.contact(tc,'wound',P,{a:{who:a.id,along:62},part:'thigh',on:d.id,target:'thigh'});
  if(!(st.lost>0)){
    // armour: the blow lands and is stopped; the leg takes it, the knee gives a little, nothing more
    W.stop(tc,110);W.fx(tc,'wound',P,.7);
    d.impulse(tc+1,{py:-120,lean:-30,head:-40});
    W.mark(tc,d.id,'The cut lands on '+D+'\'s thigh and is stopped by the armour');
  }else{
  W.seq.wounds.push({t:W.r2(tc),who:d.id,part:'rthigh',level:st.level||'major'});
  W.stop(tc,220);W.fx(tc,'wound',P,1.8);
  // the cut leg gives at once; the pelvis drops, the chest comes back up over it and the arms go out to save it
  d.impulse(tc+1,{py:-380,lean:-100,head:-110});
  // the sword arm flies up and back (a blade longer than the broadsword, held point down, would sweep its point
  // through the attacker on the way up, so it is flung back with the point going down instead)
  const lng=d.f.weapon.len>SWORD&&(()=>{const c=W.look(tc),j=solve(pose(d.f,c.out[d.id],tc),d.f.weapon.len);return PS.norm(j.w)<0;})();
  d.key(tc+10,{px:2,py:44,lean:-6,bend:4,head:-6,turn:-6,h:lng?[-10,-12]:[10,40],w:lng?-130:150,o:[24,-8]},'together');
  W.mark(tc,d.id,'The cut lands on '+D+'\'s forward thigh: the leg gives, the pelvis drops and the chest comes back up over it');
  }
  if(!st.final){
    // the fight goes on: the blade is drawn out along its line and lifted clear (as in the collapse), and the defender
    // catches the weight on the cut leg and comes back up into a low, hurt guard
    a.impulse(tc+1,{hx:'stop',hy:'stop',wr:'stop',py:-50});
    a.key(tc+20,{h:[-8,-32],w:-20},'together',{snap:2});
    if(st.lost>0){
      a.key(tc+200,{px:70,py:68,lean:8,bend:8,head:-10,h:[12,-12],w:60,o:[12,-26]},'attack');
      d.key(tc+260,{px:8,py:60,lean:10,bend:12,head:-12,turn:-4,h:[16,-20],w:40,o:[14,-28]});
    }else{
      // the defender is still up, so the point is kept low and off the line while the attacker settles back
      a.key(tc+200,{px:60,py:70,lean:8,bend:8,head:-10,h:[10,-26],w:-10,o:[12,-26]},'attack');
      // (after a late low parry with the blade, the blade stays down: brought up, a long one sweeps past the attacker)
      d.key(tc+260,st.tried==='parry'?{lean:8,bend:8,head:-10,o:[12,-26]}:{lean:8,bend:8,head:-10,h:[18,-20],w:24,o:[12,-26]});
    }
    return {end:tc+460,tc,label:st.lost>0?D+' is cut in the thigh and has caught the weight.':'The cut is stopped by armour.'};
  }
  return {end:tc+260,tc,label:D+' is cut deep in the thigh.',down:d.id};
}};

// ----- a cut that gets through to the head, the chest, the belly or an arm, from an ordinary exchange -----
// The study's first cut (cutParried), with the defender's cover too late: the blade arrives on the part, holds a
// moment, and is drawn out along its line; the body reacts where it was hit. armour/zero: the same blow, a smaller
// reaction and no mark.
// The raised hold (hilt above the head, blade lying back), reached in two steps: the hand goes up above the head with
// the point still forward, then the blade lies back. In one step the blade stands upright in front of the face while
// the hand is still rising (own head: Work's check, 2026-11-13).
function raiseHigh(f,t,order){f.key(t,{h:[24,46],w:70},order||'cover');f.key(t+120,{h:[20,48],w:140},order||'cover');}
// a cover key with what a tried parry moves taken out (the blade for a parry, the shield for a shield)
function tryKeep(st,p){if(!st||!st.tried)return p;const q={...p};
  if(st.tried==='shield')delete q.o;else{delete q.h;delete q.w;}return q;}
const LANDS={
  head:{part:'Hd',mark:'head',w:10,along:70,react:{px:-70,lean:-70,head:220},say:'the head snaps back'},
  chest:{part:'chest',mark:'chest',w:16,along:70,react:{px:-90,lean:-110,head:90},say:'the chest is driven back'},
  abdomen:{part:'abdomen',mark:'abdomen',w:-4,along:76,react:{px:-60,py:-120,lean:120,bend:90,head:-80},say:'the body folds over the blow'},
  rarm:{part:'forearm',mark:'rfore',w:-20,along:64,react:{px:-50,hx:-300,hy:-200,wr:-120,lean:-40,head:90},say:'the sword arm is knocked back'},
  larm:{part:'offarm',mark:'larm',w:-10,along:66,react:{px:-50,ox:-260,oy:-160,turn:-90,lean:-30},say:'the empty arm is torn back and the shoulders turn away'}};
PHRASES.cutLands={ref:{a:20,d:-11},gap:165,width:{a:64,d:70},lead:20,run(W,a,d,t2,st){
  const A=W.nm(a),D=W.nm(d),L=LANDS[st.loc]||LANDS.chest,hurt=st.lost>0,k=hurt?1:.45,tc=t2+520;
  W.beat(W.n(),t2,'Cut lands',A+' cuts at '+D+'\'s '+(st.loc==='rarm'||st.loc==='larm'?'arm':st.loc)+'; '+D+'\'s cover comes too late');
  a.key(t2,{px:-6,py:77,lean:0,bend:-3,head:-2,turn:-8,h:[12,-8],w:160,o:[26,-12]});
  a.walk('ff',t2+240,t2+400,96,{py:70,lift:7,settle:.55,load:.35});
  a.key(t2+330,{lean:18,bend:8,head:-14,turn:12,o:[-30,-42]});
  // the defender starts to cover, late: the blade only begins to come across
  // (when a parry was tried, the blade, or the shield, is left to it, below)
  d.key(tc-140,tryKeep(st,{lean:10,bend:6,head:-12,h:[22,-10],w:70,o:[6,-28]}),'cover');
  // a failed parry: the defender goes for where the parry would have met the cut (high: above the head), too late
  if(st.tried){const c=W.look(tc),hi=st.loc==='head',p=W.on(d,hi?'Hd':'S')(tc,c);
    W.tryParry(d,st,tc-220,tc,hi?[p[0]+d.face*40,p[1]+18]:[p[0]+d.face*61,p[1]+4],hi?170:100,hi?30:20);}
  const tgt=L.part==='Hd'?(t,c)=>{const p=W.on(d,'Hd')(t,c);return [p[0]+d.face*10,p[1]+4];}:W.on(d,L.part,L.part==='forearm'||L.part==='offarm'?.55:null);
  const P=W.aim(a,t2+300,tc,tgt,L.w,L.along,{through:[10,-18],hold:30,blend:60});
  W.contact(tc,'wound',P,{a:{who:a.id,along:P.along,exact:true},part:st.loc,on:d.id,target:L.part});
  if(hurt)W.seq.wounds.push({t:W.r2(tc),who:d.id,part:L.mark,level:st.level||'minor'});
  W.stop(tc,hurt?190:110);W.fx(tc,'wound',P,hurt?1.3:.7);
  d.impulse(tc+1,Object.fromEntries(Object.entries(L.react).map(([c,v])=>[c,v*k])));
  // drawn out along its own line, quickly, then back to a guard over the front knee
  a.impulse(tc+1,{hx:'stop',hy:'stop',wr:'stop',px:-40});
  // (after a late high parry the defender's arm is up over the head: the blade comes straight back along its line)
  a.key(tc+30,st.tried&&st.loc==='head'?{h:[-6,-14]}:{h:[12,-8],w:55},'together',{snap:2});           // back and up, clear of the legs
  a.key(tc+300,{px:40,py:72,lean:12,bend:6,head:-12,h:[24,-22],w:40,o:[-20,-40]});
  // the defender rides it and comes back into a closed, hurt guard
  d.key(tc+260,{px:-6,py:72,lean:10,bend:10,head:-12,turn:-8,h:[16,-16],w:60,o:[10,-26]});
  W.mark(tc,d.id,hurt?'The cut lands: '+L.say:'The cut lands but does not get through');
  return {end:tc+340,tc,label:hurt?D+' is cut.':'The blow is stopped by armour.'};
}};

// ===== the thrust family: short blades and the rapier. The point leads, the arm extends last, and the blade comes
// back out along the line it went in. Written in the same frame as the deflected thrust. =====
const THRUST_AT={
  head:{part:'Hd',w:6,react:{px:-70,lean:-70,head:220}},
  chest:{part:'chest',w:-2,react:{px:-90,lean:-110,head:90}},
  abdomen:{part:'abdomen',w:-10,react:{px:-60,py:-120,lean:120,bend:90,head:-80}},
  rarm:{part:'forearm',w:-8,react:{px:-50,hx:-300,hy:-200,wr:-120,lean:-40,head:90}},
  larm:{part:'offarm',w:-6,react:{px:-50,ox:-260,oy:-160,turn:-90,lean:-30}},
  rleg:{part:'thigh',w:-30,react:{py:-160,lean:-40,head:-60}},
  lleg:{part:'bthigh',w:-32,react:{py:-160,lean:-40,head:-60}}};
// a parry tried against a weapon inside the point: where the strong of the blade goes (from the chest), its angle
const INS={x:34,y:-14,w:78,al:8};
const XL={back:1,px:1,w:1.5,deep:.8};
const MARK={head:'head',chest:'chest',abdomen:'abdomen',rarm:'rfore',larm:'larm',rleg:'rthigh',lleg:'lleg'};
function thrustIn(W,a,t8){
  // a short advance, the point in line, the arm extending last
  a.key(t8,{lean:10,bend:6,head:-12,turn:4,h:[10,-20],w:4,o:[18,-22]},'attack');
  a.walk('ff',t8+100,t8+250,70,{py:70,lift:8,settle:.62,load:.35});
  a.walk('bf',t8+265,t8+390,-14,{py:66,lift:7,settle:.25,load:.25,lead:60});
  a.key(t8+220,{lean:16,bend:8,head:-16,turn:12,o:[-20,-40]});
}
PHRASES.thrustLands={ref:{a:0,d:79},gap:161,width:{a:88,d:86},lead:80,run(W,a,d,t8,st){
  const A=W.nm(a),D=W.nm(d),tc=t8+420,T=THRUST_AT[st.loc]||THRUST_AT.chest,hurt=st.lost>0,k=hurt?1:.45;
  // the arm that is hit is the one making the failed parry (the sword arm, or the shield arm pushing the shield out)
  const parryArm=(st.tried==='parry'&&st.loc==='rarm')||(st.tried==='shield'&&st.loc==='larm');
  W.beat(W.n(),t8,'Thrust lands',A+' advances with a thrust at '+D+'\'s '+(st.loc||'chest')+'; '+D+'\'s cover is too late');
  thrustIn(W,a,t8);
  d.key(tc-120,tryKeep(st,{lean:6,bend:8,head:-10,turn:-6,h:[16,-14],w:60,o:[8,-28]}),'cover');
  // (a short weapon already inside a long blade's point: the attempt is made with the strong of the blade, near the
  // hilt, upright across the chest; brought down with the point, the long blade would come down on the attacker)
  // (and a blade longer than a longsword, which has no room for the point that close in)
  if(st.tried){const c=W.look(tc),p=W.on(d,'chest')(tc,c),inside=d.f.weapon.len>a.f.weapon.len+15||d.f.weapon.len>100;
    // (when the parrying arm is the one hit, it reaches further out, or seen from the side the stab to it passes
    // through the body)
    const out=parryArm?44:28;
    W.tryParry(d,st,tc-220,tc,inside?[p[0]+d.face*INS.x,p[1]+INS.y]:[p[0]+d.face*out,p[1]-4],inside?INS.w:62,inside?INS.al:30);   // (beaten up harder than a parry would, so it shows)
    // the arm that is hit is the one that was parrying: the attempt ends there, the arm pulled in
    if(parryArm)d.key(tc+40,st.tried==='shield'?{o:[16,-24]}:{h:[8,-24]},'together');}
  // (the shield arm of a shield-bearer is held forward behind the shield: the thrust takes it near the elbow)
  const tgt=T.part==='Hd'?(t,c)=>{const p=W.on(d,'Hd')(t,c);return [p[0]+d.face*10,p[1]+4];}:W.on(d,T.part,/arm$/.test(T.part)?(T.part==='offarm'&&d.f.shieldR?.2:.55):null);
  // a longer blade is driven less far past the mark, so it is not buried deeper than it can be drawn out
  // (a thrust at the sword arm while it is out in front parrying stops at the arm: driven on, it reaches the chest)
  const deep=parryArm?0:Math.max(0,16-Math.max(0,a.f.weapon.len-SWORD)*XL.deep);
  const P=W.aim(a,t8+260,tc,tgt,T.w,84,{through:[deep,0],hold:30,blend:70});
  W.contact(tc,'wound',P,{a:{who:a.id,along:P.along,exact:true},part:st.loc,on:d.id,target:T.part});
  if(hurt)W.seq.wounds.push({t:W.r2(tc),who:d.id,part:MARK[st.loc]||'chest',level:st.level||'minor'});
  W.stop(tc,hurt?170:100);W.fx(tc,'wound',P,hurt?1.2:.6);
  // (an arm that is hit recoils once the blade lets go of it, or it drags the attacker's arm with it)
  d.impulse(/arm$/.test(st.loc||'')?tc+31:tc+1,Object.fromEntries(Object.entries(T.react).map(([c,v])=>[c,v*k])));
  // drawn straight back out along the line it went in, then a guard over the front knee
  // (a blade longer than the broadsword is drawn back further and settles with the point higher, clear of the body)
  const xl=Math.max(0,a.f.weapon.len-SWORD);
  // the body's travel stops at the contact too, or it carries the blade further in while the hand draws back
  a.impulse(tc+1,{hx:'stop',hy:'stop',wr:'stop',px:'stop'});
  // (from a stab at the head the hand comes back lower, or the blade is drawn back across its own fighter's head)
  a.key(tc+40,st.loc==='head'?{h:[-6-xl*XL.back,-34],w:4}:{h:[-6-xl*XL.back,-22]},'together',{snap:2});
  a.key(tc+300,{px:24-xl*XL.px,py:72,lean:10,bend:6,head:-12,h:[14-xl*XL.back*.5,-22],w:20+xl*XL.w,o:[16,-24]});
  d.key(tc+260,{lean:10,bend:10,head:-12,turn:-8,h:[16,-16],w:50,o:[10,-26]});
  W.mark(tc,d.id,hurt?'The thrust goes in and is drawn out':'The thrust lands but does not get through');
  return {end:tc+340,tc,label:hurt?D+' is stabbed.':'The thrust is stopped by armour.'};
}};
PHRASES.thrustMissed={ref:{a:0,d:79},gap:161,width:{a:88,d:86},lead:80,run(W,a,d,t8){
  const A=W.nm(a),D=W.nm(d),tm=t8+420;
  W.beat(W.n(),t8,'Thrust, short',A+' advances with a thrust; '+D+' gives two steps back and the point falls short');
  thrustIn(W,a,t8);
  // the defender gives ground: front foot, then rear foot, the body back and the guard closed
  d.walk('ff',t8+80,t8+240,100,{py:70,lift:9,settle:.3,load:.4});
  d.walk('bf',t8+250,t8+390,14,{py:71,lift:8,settle:.45,load:.3,lead:60});
  d.key(t8+120,{lean:-2,bend:6,head:-6,turn:-10,h:[12,-14],w:62,o:[8,-28]},'cover');
  const M=(()=>{const c=W.look(tm),p=W.on(d,'chest')(tm,c);return [p[0]+d.face*14,p[1]-2];})();
  W.aim(a,t8+260,tm,W.fixed(M),-2,90,{through:[8,0],blend:60});
  a.key(tm+40,{h:[0,-22],lean:10,bend:6},'attack',{snap:1.4});
  a.key(tm+300,{px:24,py:72,lean:10,bend:6,head:-12,h:[14,-22],w:20,o:[16,-24]});
  W.seq.misses.push({t:W.r2(tm),who:a.id,on:d.id,t0:W.r2(tm-120),t1:W.r2(tm+140)});
  W.mark(tm,a.id,'Short: the point stops just in front of '+D+' and is drawn back');
  return {end:tm+340,label:A+'\'s thrust has fallen short.'};
}};

// ===== shields: a strike with the shield (the engine's "strikes with the shield"). Written in the deflected thrust's
// frame, closer in. The weapon is held up and out of the way; the shield shoulder turns in and the face is driven onto
// the target. Lands: the defender is knocked back a step. Parried: the defender's blade meets the face. Missed: the
// defender gives two steps and the face stops short. =====
const BASH_AT={head:'Hd',chest:'chest',abdomen:'abdomen',rarm:'forearm',larm:'chest',rleg:'abdomen',lleg:'abdomen'};
PHRASES.shieldStrike={ref:{a:0,d:79},gap:125,width:{a:88,d:86},lead:60,run(W,a,d,t0,st){
  const A=W.nm(a),D=W.nm(d),tc=t0+400,o=st.outcome||'wound',miss=/^(miss|evaded|fumble)$/.test(o),
    parried=/parr|ward/.test(o)&&!(st.lost>0),hurt=st.lost>0;
  W.beat(W.n(),t0,'Shield strike',A+' steps in and drives the shield at '+D+(miss?'; '+D+' gives ground':parried?'; '+D+' meets it with the blade':''));
  // the chamber: the weapon up and back out of the way, the shield drawn in, the shield shoulder turning in
  // (raised in two steps: the hand goes up above the head with the point still forward, then the blade lies back; in
  // one, the blade stands upright in front of the face while the hand is still rising)
  a.key(t0,{lean:8,bend:8,head:-10,turn:-12,h:[24,46],w:70,o:[10,-16]},'attack');
  a.key(t0+120,{h:[20,48],w:140},'attack');
  a.walk('ff',t0+80,t0+230,70,{py:70,lift:8,settle:.62,load:.35});
  a.walk('bf',t0+245,t0+370,-14,{py:66,lift:7,settle:.3,load:.25,lead:60});
  a.key(t0+220,{lean:18,bend:10,head:-16,turn:8});
  let C;
  if(miss){
    d.walk('ff',t0+80,t0+240,100,{py:70,lift:9,settle:.3,load:.4});
    d.walk('bf',t0+250,t0+390,14,{py:71,lift:8,settle:.45,load:.3,lead:60});
    d.key(t0+120,{lean:-2,bend:6,head:-6,turn:-10,h:[12,-14],w:62},'cover');
    C=(()=>{const c=W.look(tc),p=W.on(d,'chest')(tc,c);return [p[0]+d.face*14,p[1]];})();
    W.shieldTo(a,t0+240,tc,W.fixed(C),{through:6});
    W.seq.misses.push({t:W.r2(tc),who:a.id,on:d.id,t0:W.r2(tc-120),t1:W.r2(tc+140),shield:true});
    W.mark(tc,a.id,'Short: the shield stops just in front of '+D);
  }else if(parried){
    // the meeting point is where the striker's shield comfortably reaches (three quarters out in front of the off
    // shoulder); the defender's blade, which has the reach, meets it there
    // (drawn back toward the striker, never closer than 30 from its shoulder, if the defender's sword shoulder is
    // nearer than 44: a long blade needs room to come onto it)
    C=(()=>{const c=W.look(tc),q=pose(a.f,c.out[a.id],tc),oS=a.f.W(PS.torso(q).oS),R=a.f.shieldR;
      const qd=pose(d.f,c.out[d.id],tc),wS=d.f.W(PS.torso(qd).wS);let ext=PS.ARM*.72;
      while(ext>30&&Math.abs(oS[0]+a.face*(ext+R)-wS[0])<44)ext-=2;
      return [oS[0]+a.face*(ext+R),oS[1]-6];})();
    W.shieldTo(a,t0+240,tc,W.fixed(C),{through:8,hold:40});
    W.aim(d,t0+230,tc,W.fixed(C),80,40,{order:'cover',hold:40,blend:110,snap:1.4});
    W.contact(tc,'parry',C,{a:{who:a.id},b:{who:d.id,along:40},hold:40});
    a.impulse(tc+1,{ox:-160,px:-40});d.impulse(tc+1,{py:-90,lean:-30,head:-30});
    raiseHigh(d,tc+50,'together');          // the blade comes off the shield into the raised hold
    // and both give ground, so they do not stay chest to chest: the striker steps back, the defender pushes off a step
    a.walk('bf',tc+80,tc+240,-44,{py:72,lift:8,settle:.4,load:.4,lead:60});
    a.walk('ff',tc+260,tc+420,40,{py:73,lift:7,settle:.45,load:.3,lead:60});
    d.walk('bf',tc+120,tc+280,6,{py:71,lift:8,settle:.4,load:.3,lead:60});
    W.stop(tc,110);W.fx(tc,'clash',C,.9);
    W.mark(tc,d.id,'The shield is met by '+D+'\'s blade');
  }else{
    const part=BASH_AT[st.loc]||'chest';
    C=W.shieldTo(a,t0+240,tc,W.on(d,part,part==='forearm'?.5:null),{through:10,hold:30,toward:W.on(d,'chest')});
    W.contact(tc,'wound',C,{a:{who:a.id},part:st.loc,on:d.id,target:part});
    if(hurt)W.seq.wounds.push({t:W.r2(tc),who:d.id,part:MARK[st.loc]||'chest',level:st.level||'minor'});
    W.stop(tc,hurt?170:120);W.fx(tc,'wound',C,hurt?1.2:.8);
    // knocked back: the chest and head go back, a step back catches the weight
    d.impulse(tc+31,{px:-150,py:-60,lean:-90,head:80});
    d.walk('bf',tc+90,tc+250,6,{py:70,lift:8,settle:.4,load:.3,lead:40});
    d.walk('ff',tc+280,tc+430,92,{py:72,lift:7,settle:.45,load:.3,lead:40});
    a.impulse(tc+1,{ox:-80,px:'stop'});
    W.mark(tc,d.id,'The shield lands and '+D+' is knocked back a step');
  }
  // back to a guard, the shield forward, the weapon still up; out of the clinch (the parried strike has stepped back
  // already), and only then the weapon down into a guard
  a.key(tc+260,{px:24,py:72,lean:10,bend:6,head:-12,turn:0,h:[20,48],w:140,o:[26,-18]});
  if(!parried){a.walk('bf',tc+240,tc+400,-44,{py:72,lift:8,settle:.4,load:.4,lead:60});
    a.walk('ff',tc+420,tc+580,40,{py:73,lift:7,settle:.45,load:.3,lead:60});}
  // (lowered in two steps, the reverse of the raise: the point comes forward while the hand is still high, then down)
  a.key(tc+(parried?440:600),{h:[24,46],w:70},'cover');
  a.key(tc+(parried?560:720),{h:[16,-20],w:60},'cover');
  // the defender settles: while still close, with the striker's sword arm raised, the sword stays hanging behind (a
  // swing to a guard would cross the striker); once both have stepped apart it comes up into an upright hold above
  // the shoulder, which the arm keeps still (the hanging hold, with the hand pressed against the shoulder, sways)
  d.key(tc+300,{lean:8,bend:8,head:-10,turn:-6});
  raiseHigh(d,tc+460,'cover');
  return {end:tc+(parried?860:900),tc,label:miss?A+'\'s shield strike falls short.':parried?'The shield strike is met.':D+' is knocked back.'};
}};

// ----- the end: the defender goes down on the cut leg and over; the attacker recovers and stands guard -----
// (follows the blow when the engine says it ended the fight: after the thigh cut in the same frame, written on from
// it; after any other blow from where the two stand, with the same falls and steps)
PHRASES.collapse={ref:{a:68,d:28},gap:null,lead:0,run(W,a,d,t10,st){
  const A=W.nm(a),D=W.nm(d),tc=st.tc;
  W.beat(W.n(),t10,'Collapse',D+' goes down onto the cut leg and over; '+A+' stops the blade, recovers its balance and stands guard');
  // from the wound on, the defender is no longer guarding: the drift fades, and once down only the breathing is left
  d.f.life.scale=(tt,c)=>tt<tc?1:tt>t10+700?(c==='lean'||c==='bend'?1.2:0):Math.max(0,1-(tt-tc)/400);
  // the cut leg cannot hold: the weight drops onto that side, the hips go down and back past the rear foot and the
  // defender sits down hard, then goes over onto the back. Nothing comes back up.
  // after the thigh cut the sword goes down in front, along the floor. After a blow at close quarters the other is
  // right there, so the sword is held up, clear of both, until the winner has stepped back, and then lies along the
  // body toward the feet (laid behind, it would lie across the fallen fighter's own head)
  const back=!st.inFrame,BW=back?[110,100,20,4]:[-60,-6,0,2];
  d.key(t10,{px:-2,py:44,lean:-16,bend:10,head:4,h:back?[30,-8]:[10,-36],w:BW[0],o:[-14,-30]},'together');
  d.key(t10+260,{px:-20,py:18,lean:-40,bend:12,head:10,h:[30,-30],w:BW[1],o:[-30,-24]});
  d.key(t10+560,{px:-22,py:13,lean:-70,bend:8,head:6,h:[40,-16],w:BW[2],o:[-40,-10]});
  d.key(t10+900,{lean:-80,bend:6,head:2,h:[44,-12],w:BW[3],o:[-44,-6]});
  // the rear foot is dragged in under the body as the defender sits; the cut leg slides out in front
  d.step('bf',t10+80,t10+260,22,4);
  d.step('ff',t10+300,t10+560,58,4);
  // the attacker: the follow-through is stopped, the blade drawn out along the line it went in and lifted clear, the
  // hips come back over the feet, then two steps out, guard up, the cut arm still held in
  a.impulse(tc+1,{hx:'stop',hy:'stop',wr:'stop',py:-50});
  a.key(tc+20,{h:[-8,-32],w:-20},'together',{snap:2});
  a.key(tc+200,{px:70,py:68,lean:8,bend:8,head:-10,h:[12,-12],w:60,o:[12,-26]},'attack');
  a.walk('ff',t10+260,t10+440,84,{py:70,lift:9,settle:.3,load:.4});
  a.walk('bf',t10+560,t10+740,2,{py:71,lift:8,settle:.5,load:.5});
  a.walk('ff',t10+860,t10+1040,44,{py:72,lift:8,settle:.45,load:.35});
  a.key(t10+1000,{lean:10,bend:10,head:-16,turn:-8,h:[22,-36],w:-30,o:[10,-26]});
  W.mark(t10+600,d.id,'Down: '+D+' sits down hard on the cut side and goes over; '+D+' does not get up');
  W.mark(t10+760,a.id,A+' stands off in a cautious guard, the cut forearm still held in close');
  return {end:t10+760,final:true};
}};

// ----- which phrase an exchange gets -----
// rec: {attacker:'a'|'b', loc, outcome (the stage's words: parried, full-parry, partial-parry, wound, armour, zero,
// miss, evaded, fumble), lost, action ('cut' or 'thrust'; a sword thrusts at the abdomen unless told), after:[cues]}
const ZONE=loc=>loc==='head'?'high':/leg$/.test(loc||'')?'low':/arm$/.test(loc||'')?'arm':'mid';
function pick(rec,prev,family){
  if(rec.strike==='shield')return {id:'shieldStrike',exact:true};
  const o=rec.outcome,z=ZONE(rec.loc),act=rec.action||(rec.loc==='abdomen'?'thrust':'cut');
  const parried=/parr|ward/.test(o)&&!(rec.lost>0),missed=/^(miss|evaded|fumble)$/.test(o);
  if(family==='thrust'){
    // short blades and the rapier thrust; a thrust at the legs that is parried is met low, like a cut (stand-in)
    if(missed)return {id:'thrustMissed',exact:true};
    if(parried)return z==='low'?{id:'lowBind',exact:false}:{id:'thrustDeflected',exact:true};
    return {id:'thrustLands',exact:!/^partial/.test(o)};
  }
  if(missed)return {id:'cutMissed',exact:act==='cut'&&z==='mid'};
  if(parried){
    if(act==='thrust')return {id:'thrustDeflected',exact:true};
    if(z==='low')return {id:'lowBind',exact:true};
    if(z==='high')return {id:'highParry',exact:true};
    return {id:'cutParried',exact:z==='mid'};
  }
  // it lands (a wound, or nothing got through the armour). A partial parry is drawn as a blow that lands (stand-in).
  const exact=!/^partial/.test(o);
  if(z==='low')return {id:'legCut',exact};
  // the short cut onto the forearm needs the arm out after a high parry; otherwise a full cut that lands
  if(rec.loc==='rarm'&&prev&&prev.phrase==='highParry'&&prev.attacker!==rec.attacker)return {id:'armCut',exact};
  return {id:'cutLands',exact:exact&&act==='cut'};
}
const other=id=>id==='a'?'b':'a';
const ended=rec=>(rec.after||[]).some(c=>c.type==='end'&&c.winner===rec.attacker&&c.how==='injury');

// The measure: the attacker steps in (front foot first) or out (rear foot first) by e, with its weight handled.
function takeMeasure(f,t,e,want,look){
  // the last exchange's recovery is let finish (its keys can run past its decision boundary), then the blade comes up
  // into a middle guard first, so a point left low by the last exchange is not carried into a leg
  t=Math.max(t,...f.keys.map(k=>k.t+110));          // (a key reaches the blade up to 90 ms after its time)
  const n=Math.ceil(Math.abs(e)/48),d=e/n;let u=t;
  // stepping in, the blade comes up into a middle guard at once
  // (closing to a measure shorter than the blade's reach, e.g. a long blade or a shield strike, the point is carried
  // up, or it runs into the other fighter on the way in)
  if(e>0)f.key(t,{h:[22,-18],w:want!=null&&want<f.weapon.len+50?80:38,lean:6,bend:4,head:-8},'cover');
  // (stepping back, the blade keeps its angle and only travels back with the hand and the step, and comes up into
  // guard once the step is made: turned up or down at once, its point can cross the other's body or raised arm)
  // (where the hand goes depends on the blade: an upright one keeps the hand forward of the face, or it stands through
  // the head; one pointing forward or down has the hand drawn in, so it comes back out of the other fighter's way)
  else f.key(t,{h:(()=>{if(!look)return [20,-22];const c=look(t),j=solve(pose(f,c.out[f.id],t),f.weapon.len),w=PS.norm(j.w);
      return w>45&&w<135?[20,-22]:[2,-24];})(),lean:2,bend:4,head:-8},'cover').key(t+560*Math.ceil(Math.abs(e)/48)-120,{h:[22,-18],w:30},'cover');
  for(let i=0;i<n;i++){
    const lead=d>0?'ff':'bf',trail=d>0?'bf':'ff';
    f.walk(lead,u+170,u+330,planned(f,lead)+d,{py:74,lift:8,settle:.5,load:.4});
    f.walk(trail,u+400,u+560,planned(f,trail)+d,{py:74,lift:7,settle:.5,load:.3});
    u+=560;
  }
  return u+40;
}

// one phrase, played from wherever the two stand. keep: the frames of the phrase before (a phrase that carries on
// from it, like the collapse after the wound, is written in the same frame)
function play(S,id,aid,t,st,keep){
  const P=PHRASES[id],F=S.F,A=F[aid],D=F[aid==='a'?'b':'a'];
  const width=f=>planned(f,'ff')-planned(f,'bf');
  if(api.calibrate&&!keep){api.calibrate(id,{a:standAt(A),d:standAt(D)},gapOf(A,D),{a:width(A),d:width(D)});}
  // a stance left wider or narrower than the phrase was written for is gathered first (the rear foot), by both
  if(P.width&&!keep){let u=t;
    for(const [f,role] of [[A,'a'],[D,'d']]){const e=width(f)-P.width[role];if(Math.abs(e)<=16)continue;
      const t0=Math.max(t,...f.keys.map(k=>k.t+110));
      f.walk('bf',t0+170,t0+330,planned(f,'bf')+e,{py:74,lift:7,settle:.5,load:.35});
      S.seq.notes.push({kind:'gather',t,who:f.id,by:Math.round(e)});u=Math.max(u,t0+370);}
    t=u;}
  // a defender with the clearly longer weapon lifts the point as the shorter one comes inside it (the side view
  // cannot show the point carried off the line, and a point held in line would run into the attacker)
  // (a shield strike counts as the short weapon: it comes in to the shield's length)
  if(!keep&&P.gap!=null&&D.weapon.len>(id==='shieldStrike'?30:A.weapon.len)+15){const t0=Math.max(t,...D.keys.map(k=>k.t+110));
    // (against a shield strike, which comes in chest to chest, the hand comes back to the shoulder and the blade
    // goes up and over to hang behind, out of the way)
    if(id==='shieldStrike')raiseHigh(D,t0,'cover');else D.key(t0,{h:[24,-14],w:70},'cover');   // (hand out in front: upright close in, the blade stands through the face)
    S.seq.notes.push({kind:'inside',t:t0,who:D.id});}
  if(P.gap!=null&&!keep){
    // (the measure follows the attacker's reach with its weapon; a shield strike's reach is the shield's)
    const e=gapOf(A,D)-(P.gap+(id==='shieldStrike'?0:(A.weapon.len-SWORD)*REACH));
    if(Math.abs(e)>1){S.seq.notes.push({kind:'measure',t,who:aid,by:Math.round(e)});t=takeMeasure(A,t,e,gapOf(A,D)-e,S.W.look);}
  }
  const a=placed(A,keep?keep.a:standAt(A)-P.ref.a),d=placed(D,keep?keep.d:standAt(D)-P.ref.d);
  const r=P.run(S.W,a,d,t+P.lead,st||{});
  r.dx={a:a.dx,d:d.dx};
  return r;
}

// Write a whole fight from records. opt: names, id, title. The first exchange is preceded by the approach.
function write(records,opt){
  const S=create(opt),{W,seq}=S;let n=0;W.n=()=>++n;
  let t=0;
  const first=records[0];
  if(first){const r=play(S,'approach',first.attacker,t);t=W.settle(r.end);W.pause(t,r.label);}
  for(const rec of records){
    seq.records.push(rec);
    const p=pick(rec,seq.exchanges[seq.exchanges.length-1],S.F[rec.attacker].weapon.family);
    if(!p.exact)seq.notes.push({kind:'stand-in',rec,phrase:p.id});
    const tStart=t;
    // the defence was the shield's: the record says so (a parry with the shield), or the outcome is a ward
    const defence=rec.defence||(/ward/.test(rec.outcome||'')?'shield':null);
    // a parry that was tried and failed: the record says so (tried), or names a defence for a blow that landed in full
    const tried=rec.tried||(rec.defence&&/^(wound|armour|zero)$/.test(rec.outcome||'')?rec.defence:null);
    if(rec.strike==='shield'&&!S.F[rec.attacker].shieldR)seq.notes.push({kind:'stand-in',rec,why:'a shield strike by a fighter with no shield'});
    if(defence==='shield'&&!S.F[other(rec.attacker)].shieldR)seq.notes.push({kind:'stand-in',rec,why:'a shield defence by a fighter with no shield'});
    const r=play(S,p.id,rec.attacker,t,{level:rec.lost>=6?'major':'minor',loc:rec.loc,lost:rec.lost,final:ended(rec),defence,tried,outcome:rec.outcome,
      prev:seq.exchanges[seq.exchanges.length-1]});
    // a bind holds through the decision until the next movement lifts away from it
    if(S.bind){S.bind.hold=r2(tStart+PHRASES[p.id].lead+120)-S.bind.t;S.bind=null;}
    if(r.bind)S.bind=r.bind;
    seq.exchanges.push({t:tStart,attacker:rec.attacker,phrase:p.id,end:r.end});
    if(ended(rec)){const r2_=play(S,'collapse',rec.attacker,r.end,{tc:r.tc,inFrame:p.id==='legCut'},p.id==='legCut'?r.dx:null);t=r2_.end;S.over=true;break;}
    t=W.settle(r.end);W.pause(t,r.label+' The next decision.');
  }
  seq.end=t+(S.over?1900:1200);seq.dur=seq.end+10;
  // played at 1.65 times the fight's own time (owner, 2026-11-12). The movement is written and tested in fight time;
  // the page plays it faster, hit-stops and flashes included (they are shown time)
  seq.pace=1.65;
  seq.rec=simulate(S.F,seq.dur);seq.marks.sort((x,y)=>x.t-y.t);
  // last look at the decision boundaries, with everything written: the next exchange's preparation can start just
  // before a boundary and set something moving there. Such a boundary is moved earlier (never later, so no decision
  // falls after the next movement has begun), up to 80 ms, to the quietest moment with both feet down.
  const JN=['Hd','S','M','P','K','F','bK','bF','E','Hn','oE','oHn','tip'];
  const still=t=>{let m=0;for(const id of ['a','b']){const f=S.F[id];
      if(PS.footY(f,'ff',t)>0||PS.footY(f,'bf',t)>0)return Infinity;
      for(const n of JN){const p0=PS.world(seq,id,t,n),p1=PS.world(seq,id,t+16,n);m=Math.max(m,Math.hypot(p1[0]-p0[0],p1[1]-p0[1]));}}
    return m;};
  for(const p of seq.pauses){if(still(p.t)<2.5)continue;
    let best=p.t,bm=still(p.t);
    for(let u=r2(p.t)-2;u>=p.t-80;u-=2){const m=still(u);if(m<bm){bm=m;best=u;}if(m<2)break;}
    // the last boundary of an unfinished fight has nothing after it, so it may also wait for the movement to settle
    if(bm>=2.5&&p===seq.pauses[seq.pauses.length-1]&&!S.over)
      for(let u=r2(p.t)+2;u<=p.t+300;u+=2){const m=still(u);if(m<bm){bm=m;best=u;}if(m<2)break;}
    if(best!==p.t){seq.notes.push({kind:'boundary',from:p.t,to:best});p.t=best;}}
  return seq;
}

const api={calibrate:null,write,pick,PHRASES,ZONE,standAt,gapOf};
root.PitsWriter=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
