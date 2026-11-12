// The Pits: a ten-beat fight study, broadsword against broadsword, on the spring-driven movement (pits-spring.js).
// PRESENTATION ONLY. The outcomes are scripted animation fixtures for judging the movement across a whole fight; they
// are not a claimed or validated Mythras combat sequence, and nothing here rolls or decides.
//
// How a beat is written:
//   - key poses for the body, steps with their weight (Fighter.walk), and blows aimed with aim():
//     the strike is keyed through its target with extreme easing (snap), and the blade is brought exactly onto
//     the contact over its last moments (a constraint). Parries are aimed at the same point, so both blades meet.
//   - every beat starts from where the last one left both fighters: nobody goes back to a guard between beats.
//   - springs are firm here (damping near 1): parts lead and follow, but nothing wobbles after an impact.
(function(root){
const PS=root.PitsSpring||(typeof require==='function'?require('./pits-spring.js'):null);
const {Fighter,simulate,pose,solve,handAt,offFor,PM,REC,rad}=PS;
const {SWORD_GUARD,WEAPONS}=PM;

// firm springs: the same order of the body as the short study, without the overshoot
const FIRM={px:[3.2,.97],py:[3.4,.95],lean:[2.9,.92],bend:[2.7,.92],head:[2.6,.88],turn:[3,.92],
  hx:[3.8,.9],hy:[3.8,.9],ox:[2.6,.88],oy:[2.6,.88],wr:[3.4,.9]};

function buildFight(){
  // on guard, points threatening but on different lines (A's a little higher, B's lower), so they do not cross
  const A=new Fighter('a',480,1,WEAPONS.sword,{...SWORD_GUARD,h:[27,-28],w:54});
  const B=new Fighter('b',720,-1,{...WEAPONS.sword},{...SWORD_GUARD,h:[26,-36],w:16});
  A.spring=B.spring=FIRM;A.minReach=B.minReach=20;
  // smooth: every key is eased into (35 ms; strikes a third of that), so nothing starts from rest with a jolt
  A.smooth=B.smooth=35;
  // steps: a foot lifts and lands on a smooth arc, and the hips start travelling as it leaves (not at mid-step)
  A.liftShape=B.liftShape=1;A.stepLead=B.stepLead=.1;
  // alive: a slow weight shift, breathing, the guard and the head never quite still (amplitudes in rig units and degrees,
  // periods in ms; each fighter has its own phases). Once B is down only the breathing is left.
  const LIFE=(ph)=>({amp:{px:2.2,py:1.3,lean:1.4,bend:.8,head:1.6,turn:1.5,hx:1.8,hy:1.6,wr:3.5,ox:2.2,oy:2},
    per:{px:1900,py:1150,lean:2300,bend:1700,head:1500,turn:2100,hx:1350,hy:1750,wr:1600,ox:1450,oy:1250},
    ph:Object.fromEntries(['px','py','lean','bend','head','turn','hx','hy','wr','ox','oy'].map((c,i)=>[c,ph+i*1.7]))});
  A.life=LIFE(0);B.life=LIFE(2.1);
  const F={a:A,b:B};
  const seq={id:'fight',title:'A fight in ten beats',fighters:F,marks:[],pauses:[],stops:[],fx:[],wounds:[],contacts:{},
    contactList:[],misses:[],notes:[],beats:[],grips:[],names:{a:'A',b:'B'},scripted:true};
  const mark=(t,who,label)=>seq.marks.push({t,who,label});
  const beat=(n,t,short,label)=>{seq.beats.push({n,t,short,label});mark(t,'both',n+'. '+label);};
  const pause=(t,label)=>seq.pauses.push({t,label});
  // No gap between beats (owner, 2026-11-12): the next action starts while the last one's recovery is still moving,
  // so a replay is one continuous movement. A decision boundary falls on that moment; holding there freezes the scene.
  const r2=t=>Math.round(t/REC)*REC;

  // ----- looking ahead: the poses at time t with everything written so far -----
  // Each look carries on from the last run's checkpoint before the earliest thing written since (dirty), so writing
  // the fight beat by beat costs about one run rather than one run per look.
  let last=null,dirty=Infinity;
  for(const f of [A,B])for(const [m,ti] of [['key',0],['step',1],['impulse',0],['pin',3]]){const orig=f[m];
    f[m]=function(...a){dirty=Math.min(dirty,a[ti]-REC*2);return orig.apply(this,a);};}
  for(const f of [A,B]){const w=f.walk;f.walk=function(foot,t0,...r){dirty=Math.min(dirty,t0-400);return w.call(this,foot,t0,...r);};}
  const run=t=>{const r=simulate(F,t,{from:PS.resumeFrom(last,dirty)});last=r;dirty=Infinity;return r;};
  const look=t=>{t=r2(t);const r=run(Math.max(t+REC,last?0:0));return {t,out:{a:r.a[t/REC],b:r.b[t/REC]}};};
  const J=(f,ctx,t)=>solve(pose(f,ctx.out[f.id],t),f.weapon.len);
  // named points on a fighter's body or blade, as functions of the running simulation (so a contact follows the body)
  const on=(f,name,u)=>(t,ctx)=>{const j=J(f,ctx,t),L=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];
    let p;
    if(name==='blade')p=[j.Hn[0]+Math.cos(rad(j.w))*u,j.Hn[1]+Math.sin(rad(j.w))*u];
    else if(name==='forearm')p=L(j.E,j.Hn,u==null?.5:u);
    else if(name==='thigh')p=L(j.P,j.K,u==null?.55:u);
    else if(name==='chest')p=L(j.M,j.S,.5);
    else if(name==='abdomen')p=L(j.P,j.M,.5);
    else p=j[name];
    return f.W(p);};
  const fixed=P=>()=>P;

  // A blow, a parry or a deflection: from tKey the hand goes (snapping) toward a point past the contact (through),
  // and over the last `blend` ms the blade is brought exactly to it: the point `along` the blade on target at tc,
  // at blade angle w. hold: how long the contact holds (the blade stays on the target, then is let go).
  function aim(f,tKey,tc,target,w,along,o){
    o=o||{};tc=r2(tc);
    const c=look(tc),q=pose(f,c.out[f.id],tc),P=target(tc,c);
    // the nearest blade angle to the one asked for that this arm can actually hold there: the hand within reach and
    // the wrist inside its turn (a level blade needs a long arm; a bent arm tips the blade up)
    w=feasible(f,q,P,along,w);
    const h=handAt(f,q,P,along,w),th=o.through||[0,0];
    f.key(tKey,{h:[h[0]+th[0],h[1]+th[1]],w:o.wKey==null?w:o.wKey},o.order||'attack',{snap:o.snap==null?true:o.snap});
    f.pin('h',along,target,tc-(o.blend||70),tc,tc+(o.hold||0),w);
    return P;
  }
  function feasible(f,q,P,along,w0){
    const tq=PS.torso(q);
    for(let d=0;d<=70;d+=2)for(const w of d?[w0+d,w0-d]:[w0]){
      const h=handAt(f,q,P,along,w),r=Math.hypot(tq.S[0]+h[0]-tq.wS[0],tq.S[1]+h[1]-tq.wS[1]);
      if(r>PS.ARM-3||r<26)continue;          // within reach, and never with the arm folded against the shoulder
      const fore=solve({...q,h,wr:0},f.weapon.len).w,g=PS.norm(w-fore);
      if(g>=PS.WRIST[0]+1&&g<=PS.WRIST[1]-1){if(d)seq.notes.push({f:f.id,asked:w0,got:w});return w;}
    }
    seq.notes.push({f:f.id,asked:w0,got:null});return w0;
  }
  // a contact for the page and the tests: both sides' points, the kind, and how long it holds
  const contact=(t,kind,P,parts)=>{const c={t:r2(t),kind,at:P,...parts};seq.contactList.push(c);return c;};

  // ============ 1. Approach and measure ============
  let t=0;
  beat(1,t,'Approach','Approach and measure: A comes in a short step, B gives a little');
  // a short moment on guard, watching (never quite still). Then A comes in one short step (front foot, then the rear foot
  // follows) and B gives a little (rear foot back, then the front foot draws after it); the points stay on each other
  A.walk('ff',320,540,52,{py:77,lift:8,settle:.5});
  A.walk('bf',680,860,-12,{py:75,lift:8,settle:.5,load:.4});
  A.key(400,{lean:7,bend:4,head:-8,h:[27,-28],w:50});
  B.walk('bf',500,700,-46,{py:77,lift:8,settle:.45});
  B.walk('ff',750,910,24,{py:77,lift:8,settle:.5,load:.25});
  B.key(580,{lean:4,bend:5,head:-7,h:[26,-36],w:16});
  t=930;pause(t,'Measure taken. A chooses to attack.');

  // ============ 2. First cut, caught by a parry ============
  beat(2,t+20,'Cut, parried','A cuts diagonally at B\'s upper body; B meets it in front of the body and gives through elbow and knees');
  const t2=t+20;
  // load: the weight settles back, the hilt comes up to the shoulder, the blade lies back
  A.key(t2,{px:-6,py:77,lean:0,bend:-3,head:-2,turn:-8,h:[12,4],w:140,o:[26,-12]});
  A.walk('ff',t2+240,t2+400,96,{py:70,lift:7,settle:.55,load:.35});
  A.key(t2+330,{lean:18,bend:8,head:-14,turn:12,o:[-30,-42]});
  const tc2=t2+520;
  // the meeting point: in front of B's upper body, a little above the shoulder
  const C2=(()=>{const c=look(tc2),s=on(B,'S')(tc2,c);return [s[0]+B.face*61,s[1]+4];})();
  B.key(tc2-260,{px:9,py:74,lean:14,bend:6,head:-12,o:[2,-30]},'cover');
  aim(B,tc2-220,tc2,fixed(C2),100,20,{order:'cover',hold:40,blend:130,snap:1.4});
  aim(A,t2+300,tc2,fixed(C2),20,72,{through:[14,-22],hold:40,blend:60});
  contact(tc2,'parry',C2,{a:{who:'a',along:72},b:{who:'b',along:20}});
  // contact: the cut stops dead; B's knees and elbow give under it
  A.impulse(tc2+1,{hx:'stop',hy:'stop',wr:'stop',px:-40});
  B.impulse(tc2+1,{py:-90,lean:-30});
  // the parry redirects: B turns the cut down and out to its own outside; A's sword ends low and wide
  B.key(tc2+40,{py:72,lean:8,bend:8,h:[26,-4],w:70},'together',{snap:true});
  A.key(tc2+40,{h:[40,-30],w:-38,lean:14,bend:6},'together',{snap:true});
  A.key(tc2+300,{px:40,py:72,lean:12,bend:6,head:-12,h:[34,-36],w:-30,o:[-20,-40]});
  B.key(tc2+300,{px:0,py:74,lean:6,bend:7,head:-10,h:[22,-10],w:60,o:[6,-28]});
  seq.stops.push({t:tc2,d:70});seq.fx.push({t:tc2,kind:'clash',at:C2});
  mark(tc2,'b','Parry: the cut is met in front of the body; B gives through the elbow and knees, and turns it down');
  t=tc2+240;pause(t,'The cut is parried and A\'s blade is low and wide. B chooses to counter.');

  // ============ 3. Counter from the parry: B cuts at the ribs, A slips it ============
  beat(3,t+40,'Counter, slipped','B counters at A\'s ribs; A draws the front foot back and turns, and the cut passes outside');
  const t3=t+40,tm3=t3+450;
  B.key(t3,{px:-4,py:73,lean:2,bend:4,head:-8,turn:-10,h:[-2,-32],w:-155},'attack');      // a low chamber at the hip, blade back
  // an advance: the front foot, then the rear foot closes up, so the hips can go over the front foot for the cut
  B.walk('ff',t3+90,t3+240,72,{py:64,lift:8,settle:.55,load:.4});
  B.walk('bf',t3+250,t3+370,-8,{py:67,lift:7,settle:.2,load:.25,lead:60});
  B.key(t3+200,{lean:14,bend:8,head:-14,turn:12,o:[-26,-40]});
  // A slips: weight back, the front foot comes back under, the chest turns away and leans out of the line
  A.walk('ff',t3+170,t3+330,84,{py:68,lift:9,settle:.35,load:.45,push:160});
  A.key(t3+190,{lean:-8,bend:-4,head:-4,turn:-16,h:[12,-42],w:-95,o:[-6,-30]},'cover');      // the sword hand drops, the point straight down, under the line of the cut
  // B's level cut: through where the ribs were, passing outside the turned body, and on into a controlled follow-through
  // the point passes about 10 units short of the turned body (exact, so the near miss is a near miss)
  // seen from the side, a cut that passes outside the body is one whose point falls just short of it
  const M3=(()=>{const c=look(tm3),p=on(A,'chest')(tm3,c);return [p[0]+A.face*12,p[1]-12];})();
  aim(B,t3+220,tm3,fixed(M3),2,90,{through:[-6,16],blend:60});
  // nothing stops it: it runs on down across B's own front, and B controls it there
  B.key(tm3+30,{h:[16,8],w:74,lean:12,bend:8},'attack',{snap:1.4});      // it runs on up past A's front and is drawn back
  B.walk('bf',tm3+130,tm3+300,-26,{py:69,lift:8,settle:.5,load:.2});
  B.key(tm3+320,{lean:9,bend:7,head:-10,turn:2,h:[24,-30],w:-30,o:[14,-26]});
  A.key(tm3+150,{px:30,py:67});
  A.key(tm3+320,{px:30,py:67,lean:6,bend:3,head:-8,turn:-4,h:[26,-14],w:58,o:[14,-26]});
  seq.misses.push({t:r2(tm3),who:'b',on:'a',t0:r2(tm3-120),t1:r2(tm3+140)});
  mark(tm3,'b','Miss: the rising cut passes just outside A\'s turned body and runs on past; B reins it in');
  t=tm3+385;pause(t,'B\'s cut has missed and B has reined it in. A chooses to press.');


  // ============ 4. Pursuit and low attack ============
  beat(4,t+5,'Low attack','A follows the recovering blade with a cut at B\'s forward thigh; B pulls the leg back and lowers the blade to cover');
  const t4=t+5,tc5=t4+560;
  // A: the hilt comes up beside the shoulder as the front foot goes in
  A.key(t4,{px:20,py:71,lean:6,bend:0,head:-6,turn:-6,h:[8,6],w:132,o:[22,-14]});
  A.walk('bf',t4+10,t4+140,20,{py:69,lift:7,settle:.8,load:.45});
  A.walk('ff',t4+230,t4+380,102,{py:68,lift:8,settle:.6,load:.15,lead:90});
  A.key(t4+300,{lean:20,bend:12,head:-18,turn:10,o:[-26,-40]});
  // B: the weight goes back over the rear leg, the front foot lifts, comes back and is set down; the blade drops to cover
  B.walk('ff',t4+200,t4+380,44,{py:66,lift:11,settle:.3,load:.38});
  B.key(t4+260,{lean:12,bend:10,head:-16,o:[16,-18]},'cover');

  // ============ 5. Blades meet low ============
  beat(5,tc5-40,'Low bind','A\'s cut meets B\'s lowered blade; A stops through the planted leg and hips, B holds its ground');
  const C5=(()=>{const c=look(tc5),k=on(B,'K')(tc5,c);return [k[0]+B.face*26,k[1]+10];})();
  aim(B,t4+260,tc5,fixed(C5),-72,48,{order:'cover',hold:130,blend:150,snap:1.3});
  aim(A,t4+330,tc5,fixed(C5),-34,70,{through:[6,-14],hold:130,blend:60});
  const bind5=contact(tc5,'bind',C5,{a:{who:'a',along:70},b:{who:'b',along:48},hold:130});
  // both take it: A's forward travel is stopped in the front leg and hips (they sink), B's knees give without sliding
  A.impulse(tc5+1,{hx:'stop',hy:'stop',wr:'stop',px:'stop',py:-60,lean:-20});
  B.impulse(tc5+1,{py:-60});
  A.key(tc5,{px:44,py:63,lean:14,bend:8},'together');
  B.key(tc5,{py:67,lean:10,bend:10},'together');
  seq.stops.push({t:r2(tc5),d:60});seq.fx.push({t:r2(tc5),kind:'clash',at:C5});
  mark(tc5,'a','Low bind: both blades stop; A\'s weight is caught in the front leg and hips, B sinks a little and holds');

  // ============ 6. Disengage and change level ============
  t=tc5+130;pause(t,'The blades are bound low. A chooses to disengage and go high.');
  beat(6,t+40,'Disengage high','A draws the blade back clear of B\'s point and cuts at the shoulder; B lifts into a high parry, stepping away');
  const t6=t+40,tc6=t6+520;
  bind5.hold=r2(t6+120)-bind5.t;          // the blades stay bound through the decision until A lifts away
  // A: the hand draws back toward the hip, then the blade comes up and over, well clear of B's point
  A.key(t6,{px:30,py:70,lean:6,bend:2,head:-8,turn:-8,h:[22,-2],w:40},'attack',{snap:1.3});    // the point lifts off B's blade
  A.key(t6+150,{lean:4,head:-6,h:[10,8],w:140,o:[22,-14]},'attack');
  // the feet follow B: the rear foot closes up, then the front foot steps in with the cut
  A.walk('bf',t6+40,t6+190,36,{py:68,lift:8,settle:.8,load:.45});
  A.walk('ff',t6+270,t6+410,122,{py:69,lift:8,settle:.55,load:.15,lead:80});
  A.key(t6+330,{lean:16,bend:8,head:-14,turn:10,o:[-24,-40]});
  // B: steps away with the rear foot and the blade comes up across, above the head
  B.walk('bf',t6+120,t6+300,-44,{py:71,lift:9,settle:.45,load:.3});
  B.key(t6+200,{lean:2,bend:0,head:-6},'cover');
  const C6=(()=>{const c=look(tc6),hd=on(B,'Hd')(tc6,c);return [hd[0]+B.face*40,hd[1]+18];})();
  aim(B,t6+220,tc6,fixed(C6),170,30,{order:'cover',hold:60,blend:150,snap:1.3});
  aim(A,t6+330,tc6,fixed(C6),20,70,{through:[10,-18],hold:60,blend:60});
  contact(tc6,'parry',C6,{a:{who:'a',along:70},b:{who:'b',along:30},hold:60});
  A.impulse(tc6+1,{hx:'stop',hy:'stop',wr:'stop'});
  A.key(tc6+40,{h:[40,0],w:110},'together',{snap:2});
  B.impulse(tc6+1,{py:-50});
  seq.stops.push({t:r2(tc6),d:60});seq.fx.push({t:r2(tc6),kind:'clash',at:C6});
  mark(tc6,'b','High parry: the cut is caught above B\'s head');

  // ============ 7. B scores a minor arm wound ============
  // no breathing gap here: A's arm is still out, and that is the opening B takes
  t=tc6+220;pause(t,'The high cut is parried and A\'s arm is out. B chooses to cut at it.');
  beat(7,t+20,'Arm wound','From the high parry B turns the blade over and cuts short onto A\'s sword forearm');
  const t7=t+20,tc7=t7+260;
  B.key(t7,{lean:10,bend:6,head:-12,turn:6},'attack');
  const fore=on(A,'forearm',.55);
  const P7=aim(B,t7+40,tc7,fore,-40,60,{through:[4,-18],hold:30,blend:70,snap:1.6});
  seq.fx.push({t:r2(tc7),kind:'wound',at:P7});
  contact(tc7,'wound',P7,{a:{who:'b',along:60},part:'forearm',on:'a',target:'forearm'});
  seq.wounds.push({t:r2(tc7),who:'a',part:'rfore',level:'minor'});
  // A recoils at the arm: the hand is knocked back and down, the elbow comes in, the guard closes; the sword is kept
  A.impulse(tc7+1,{hx:-220,hy:-160,wr:-80,lean:-30,head:60});
  A.key(tc7+20,{px:68,py:69,lean:4,bend:6,head:-10,turn:-10,h:[14,-18],w:82,o:[10,-26]},'together');
  B.key(tc7+40,{lean:8,bend:6,h:[24,-20],w:-20},'attack');
  B.key(tc7+200,{px:14,py:71,lean:8,bend:7,head:-10,h:[22,-22],w:6,o:[16,-22]});
  seq.stops.push({t:r2(tc7),d:80});
  mark(tc7,'a','The blade lands on A\'s sword forearm: the arm is knocked back, the elbow comes in, the guard closes');

  t=tc7+280;pause(t,'A is cut on the forearm and has closed up. B chooses to press with a thrust.');


  // ============ 8. A retreats under pressure ============
  beat(8,t+80,'Thrust, deflected','B advances with a thrust at the body; A gives a short step back and deflects the point outward');
  const t8=t+80,tc8=t8+420;
  // B: a short advance, the point in line, the arm extending last
  B.key(t8,{lean:10,bend:6,head:-12,turn:4,h:[10,-20],w:4,o:[18,-22]},'attack');
  B.walk('ff',t8+100,t8+250,70,{py:70,lift:8,settle:.62,load:.35});
  B.walk('bf',t8+265,t8+390,-14,{py:66,lift:7,settle:.25,load:.25,lead:60});
  B.key(t8+220,{lean:16,bend:8,head:-16,turn:12,o:[-20,-40]});
  // A: weight back, the front foot comes back, the guard stays closed (the cut arm kept near the body)
  A.walk('ff',t8+80,t8+240,100,{py:70,lift:9,settle:.3,load:.4});
  A.key(t8+120,{lean:2,bend:8,head:-8,turn:-10,h:[12,-14],w:72,o:[8,-28]},'cover');
  // where the blades meet: in front of A's chest, near B's point
  const C8=(()=>{const c=look(tc8),p=on(A,'chest')(tc8,c);return [p[0]+A.face*28,p[1]-4];})();
  aim(B,t8+260,tc8,fixed(C8),-2,78,{through:[16,0],hold:30,blend:70});
  aim(A,t8+250,tc8,fixed(C8),45,30,{order:'cover',hold:30,blend:110,snap:1.5});
  contact(tc8,'deflect',C8,{a:{who:'b',along:78},b:{who:'a',along:30},hold:30});
  // the deflection carries B's point up and out past A's head; B's weight is still going forward
  B.impulse(tc8+1,{hy:150,wr:70});
  // thrown off the line: the hand comes back and up together, so the point leaves A's line as the blade rises
  B.key(tc8+30,{h:[14,26],w:86,lean:12,bend:8},'together',{snap:1.6});
  A.key(tc8+40,{h:[16,-4],w:96},'together',{snap:1.3});
  seq.stops.push({t:r2(tc8),d:50});seq.fx.push({t:r2(tc8),kind:'clash',at:C8});
  mark(tc8,'a','Deflection: A\'s blade meets the thrust and carries the point out and up; B\'s weapon is left outside the line');

  // ============ 9. A lands the decisive counter ============
  beat(9,tc8+120,'Thigh cut','A steps into the opening with a short cut to B\'s forward thigh; the leg gives, the pelvis drops');
  const t9=tc8+120,tc9=t9+300;
  A.walk('ff',t9+20,t9+180,124,{py:68,lift:8,settle:.58,load:.35});
  A.key(t9,{lean:8,bend:6,head:-10,turn:-4,h:[8,6],w:120},'attack');
  A.key(t9+140,{lean:20,bend:10,head:-18,turn:10,o:[-20,-38]});
  const P9=aim(A,t9+150,tc9,on(B,'thigh',.5),-40,62,{through:[6,-16],hold:40,blend:60});
  contact(tc9,'wound',P9,{a:{who:'a',along:62},part:'thigh',on:'b',target:'thigh'});
  seq.wounds.push({t:r2(tc9),who:'b',part:'rthigh',level:'major'});
  seq.stops.push({t:r2(tc9),d:90});seq.fx.push({t:r2(tc9),kind:'wound',at:P9});
  // B: the cut leg gives at once; the pelvis drops, the chest comes back up over it and the arms go out to save it
  B.impulse(tc9+1,{py:-300,lean:-70,head:-60});
  B.key(tc9+10,{px:2,py:44,lean:-6,bend:4,head:-6,turn:-6,h:[-6,16],w:130,o:[24,-8]},'together');     // the sword arm flies up and back
  mark(tc9,'b','The cut lands on B\'s forward thigh: the leg gives, the pelvis drops and the chest comes back up over it');

  // ============ 10. Collapse and finish ============
  beat(10,tc9+260,'Collapse','B goes down onto the cut leg and over; A stops the blade, recovers its balance and stands guard');
  const t10=tc9+260;
  // from the thigh cut on, B is no longer guarding: the drift fades, and once down only the breathing is left
  B.life.scale=(tt,c)=>tt<tc9?1:tt>t10+700?(c==='lean'||c==='bend'?1.2:0):Math.max(0,1-(tt-tc9)/400);
  // the cut leg cannot hold: the weight drops onto that side, the hips go down and back past the rear foot and B sits
  // down hard, then goes over onto the back. The sword arm goes with the body and the empty hand takes the fall.
  // Nothing comes back up.
  B.key(t10,{px:-2,py:44,lean:-16,bend:10,head:4,h:[10,-36],w:-60,o:[-14,-30]},'together');
  B.key(t10+260,{px:-20,py:18,lean:-40,bend:12,head:10,h:[30,-30],w:-6,o:[-30,-24]});
  B.key(t10+560,{px:-22,py:13,lean:-70,bend:8,head:6,h:[40,-16],w:0,o:[-40,-10]});
  B.key(t10+900,{lean:-80,bend:6,head:2,h:[44,-12],w:2,o:[-44,-6]});
  // the rear foot is dragged in under the body as B sits; the cut leg slides out in front
  B.step('bf',t10+80,t10+260,22,4);
  B.step('ff',t10+300,t10+560,58,4);
  // A: the follow-through is stopped, the hips come back over the feet, then two steps out, guard up, elbow still in
  A.impulse(tc9+1,{hx:'stop',hy:'stop',wr:'stop'});
  // drawn out along the line it went in, then lifted clear
  A.key(tc9+20,{h:[-8,-32],w:-20},'together',{snap:2});           // drawn back along the line of the cut, the point lifting a little clear of the leg
  A.key(tc9+200,{px:70,py:68,lean:8,bend:8,head:-10,h:[12,-12],w:60,o:[12,-26]},'attack');
  A.walk('ff',t10+260,t10+440,84,{py:70,lift:9,settle:.3,load:.4});
  A.walk('bf',t10+560,t10+740,2,{py:71,lift:8,settle:.5,load:.5});
  A.walk('ff',t10+860,t10+1040,44,{py:72,lift:8,settle:.45,load:.35});
  A.key(t10+1000,{lean:10,bend:10,head:-16,turn:-8,h:[22,-36],w:-30,o:[10,-26]});
  mark(t10+600,'b','Down: B sits down hard on the cut side and goes over; B does not get up');
  mark(t10+760,'a','A stands off in a cautious guard, the cut forearm still held in close');
  t=t10+760;

  seq.end=t+1900;seq.dur=seq.end+10;
  seq.rec=run(seq.dur);seq.marks.sort((x,y)=>x.t-y.t);
  return seq;
}
PS.register('fight',buildFight);
if(typeof module!=='undefined'&&module.exports)module.exports={build:buildFight};
})(typeof window!=='undefined'?window:globalThis);
