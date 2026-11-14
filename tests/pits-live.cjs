// The Pits stage drives its figures with the movement language (experiments/pits-motion.js, LIVE): every resolved
// exchange the engine can produce is written as phrases from the pose the fighters are in. These tests hold the live
// phrases to the same rules as the study (docs/pits-animation-direction.md): bodies stay possible, contacts meet,
// nothing snaps, planted feet stay planted, a pause point stands on two feet, and nobody returns to the opening guard.
const assert=require('node:assert/strict');
const PM=require('../experiments/pits-motion.js'),L=PM.LIVE;
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// weapons as the stage draws them (pitsStageWeaponKind)
const W={sword:{kind:'blade',len:92},dagger:{kind:'blade',len:50},shortsword:{kind:'blade',len:68},spear:{kind:'spear',len:150},
  axe:{kind:'axe',len:84},greatsword:{kind:'blade',len:130},mace:{kind:'club',len:70},rapier:{kind:'blade',len:112,thin:1}};
const PAIRS=[['sword','dagger'],['dagger','sword'],['sword','sword'],['spear','axe'],['greatsword','dagger'],['mace','rapier'],['shortsword','spear']];
const OUT=['wound','partial-parry','parried','full-ward','armour','zero','evaded','miss','fumble','partial-ward','full-parry'];
const LOCS=['chest','head','rleg','abdomen','rarm','larm','lleg'];
// one long bout per pair: blows in turn, every outcome and location, with and without a recovery between them
function bout(wa,wb,key){
  const gap=L.gap(W[wa],W[wb],key||'long'),F={a:L.fighter('a',W[wa]),b:L.fighter('b',W[wb])},log=[];
  L.place(F.a,0,gap,'guard');L.place(F.b,0,gap,'guard');let t=100;
  for(let i=0;i<OUT.length*3;i++){
    const aid=i%3?'a':'b',o=OUT[(i*4+(aid==='b'?5:0))%OUT.length],lost=/wound|partial|armour/.test(o)&&o!=='armour'?4:0;
    const r=L.blow(F,aid,t,{outcome:o,loc:LOCS[i%LOCS.length],lost,shield:/ward/.test(o)});
    log.push({aid,o,t,...r});
    t=(i%2?L.recover(F[aid],r.end+150,gap,false):r.end)+80;
  }
  return {F,log,end:t,gap};
}
const bouts=PAIRS.map(([a,b])=>({a,b,...bout(a,b)}));
// what the stage draws (a long blade between keys is kept off the floor there)
const drawn=(f,u)=>L.pose(f,u);
const JOINTS=['Hd','S','M','P','K','F','bK','bF','E','Hn','oE','oHn','tip'];

test('every outcome the engine resolves writes a blow, for every pair of weapons, from either side',()=>{
  for(const B of bouts){
    const kinds=new Set(B.log.map(l=>l.o));assert.equal(kinds.size,OUT.length,B.a+' v '+B.b);
    for(const l of B.log){assert(l.contacts.length>=1,l.o);assert(l.end>l.tc&&l.tc>l.t,l.o+' times');}
  }
});
test('bodies stay possible: no NaN, no limb stretched past its length (live tolerance 10 units: a tenth of a leg, in the stand-in recoveries), nothing below the floor',()=>{
  for(const B of bouts)for(const id of ['a','b']){const f=B.F[id];
    for(let u=0;u<B.end;u+=5){const j=drawn(f,u);
      for(const n of JOINTS){assert(Number.isFinite(j[n][0])&&Number.isFinite(j[n][1]),B.a+' '+id+' '+n+' NaN at '+u);
        assert(j[n][1]>=(n==='tip'?-6:n==='Hd'?12:-.5),B.a+' v '+B.b+' '+id+'.'+n+' below the floor at '+u);}
      for(const k in j.over)assert(j.over[k]<=10,B.a+' v '+B.b+' '+id+'.'+k+' over by '+j.over[k].toFixed(1)+' at '+u);}}
});
test('contacts meet: the blade reaches the body part at the moment the effects are drawn, and the blades cross at a parry',()=>{
  for(const B of bouts)for(const l of B.log){const A=B.F[l.aid];
    for(const c of l.contacts){
      if(c.kind==='body'){const along=L.along(A,true),j=L.pose(A,c.t),k=Math.min(1,j.blen/A.weapon.len),P=A.W([j.Hn[0]+Math.cos(j.w*Math.PI/180)*along*k,j.Hn[1]+Math.sin(j.w*Math.PI/180)*along*k]);
        // the effects are drawn on the blade, and the blade is on the part (a partial parry may leave it a little short)
        assert(dist(P,c.at)<=6,'the contact is drawn where the blade is');
        const lim=/^partial/.test(l.o)?30:9;
        assert(dist(P,c.part)<lim,B.a+' v '+B.b+' '+l.o+' misses the body by '+dist(P,c.part).toFixed(1));}
      if(c.kind==='clash'){
        // somewhere along the attacking blade
        let m=1e9;for(let s=0;s<=A.weapon.len;s+=2)m=Math.min(m,dist(A.at(c.t,'blade',s),c.at));
        assert(m<9,B.a+' v '+B.b+' '+l.o+' the blades do not meet ('+m.toFixed(1)+')');}
    }}
});
test('one continuous motion: no joint jumps between two moments, across chained blows and recoveries',()=>{
  for(const B of bouts)for(const id of ['a','b']){const f=B.F[id];let prev=null;
    for(let u=10;u<B.end;u+=5){const j=drawn(f,u);
      if(prev)for(const n of JOINTS){const lim=n==='tip'?34*Math.max(1,f.weapon.len/92)+6:22;   // the study's limit, scaled to the weapon
        assert(dist(j[n],prev[n])<lim,B.a+' v '+B.b+' '+id+'.'+n+' jumps '+dist(j[n],prev[n]).toFixed(1)+' at '+u);}
      prev=j;}}
});
test('the pause point stands: at the end of a follow-through both feet are down and the base is a fighting stance',()=>{
  for(const B of bouts)for(const l of B.log)for(const id of ['a','b']){
    const p=B.F[id].pose(l.end);
    assert(p.ffy<.5&&p.bfy<.5,B.a+' v '+B.b+' '+l.o+' '+id+' has a foot in the air at the pause');
    assert(p.ffx-p.bfx>40,B.a+' v '+B.b+' '+l.o+' '+id+' stands with its feet together ('+(p.ffx-p.bfx).toFixed(0)+')');}
});
test('a planted foot does not slide while it is down (outside falls and the stand-up stand-in)',()=>{
  for(const B of bouts)for(const id of ['a','b']){const f=B.F[id];let prev=f.pose(10);
    for(let u=15;u<B.end;u+=5){const p=f.pose(u);
      for(const foot of ['ff','bf'])if(p[foot+'y']<.01&&prev[foot+'y']<.01)
        assert(Math.abs(p[foot+'x']-prev[foot+'x'])<1.2,B.a+' v '+B.b+' '+id+'.'+foot+' slides at '+u);
      prev=p;}}
});
test('nobody returns to the opening guard: a recovery ends at the station in a different guard',()=>{
  const B=bout('sword','dagger'),f=B.F.a,end=L.recover(f,B.end+50,B.gap,true),p=f.pose(end),G=f.guard;
  assert(Math.abs(p.ffx-L.station(f,B.gap))<3,'back at the station');
  assert(dist(p.h,G.h)+Math.abs(p.w-G.w)>10,'the weapon is not in the opening guard');
});
test('a new phrase takes over from wherever the last one was cut off, with no jump',()=>{
  const F={a:L.fighter('a',W.sword),b:L.fighter('b',W.dagger)},gap=L.gap(W.sword,W.dagger,'long');
  L.place(F.a,0,gap,'guard');L.place(F.b,0,gap,'guard');
  const r=L.blow(F,'a',100,{outcome:'wound',loc:'chest',lost:3});
  const mid=r.tc-120,before=PM.solve(F.a.pose(mid),92);
  L.blow(F,'b',mid,{outcome:'parried',loc:'head',lost:0});   // a newer cue takes over mid-cut
  const after=PM.solve(F.a.pose(mid),92),next=PM.solve(F.a.pose(mid+5),92);
  for(const n of JOINTS){assert(dist(before[n],after[n])<1,n+' moved at the cut');assert(dist(after[n],next[n])<34,n+' jumps after the cut');}
});
test('range: the longer weapon sets the measure, closing in brings it to the shorter weapon, apart is furthest',()=>{
  const g=(a,b,k)=>L.gap(W[a],W[b],k);
  assert(g('spear','dagger','long')>g('sword','dagger','long'));
  assert(g('spear','dagger','short')<g('spear','dagger','long'));
  assert(g('sword','dagger','apart')>g('sword','dagger','long'));
  // a change of range is footwork, not a slide: the stance walks to its new station
  const F={a:L.fighter('a',W.sword)};L.place(F.a,0,g('sword','sword','long'),'guard');
  const p0=F.a.pose(10),end=L.walk(F.a,10,60),p=F.a.pose(end);assert(Math.abs(p.ffx-(p0.ffx+60))<1&&Math.abs(p.bfx-(p0.bfx+60))<1);
});
test('falls and the end of a fight: a defeating blow ends on the floor; the winner lowers the point; a yield bows',()=>{
  const F={a:L.fighter('a',W.sword),b:L.fighter('b',W.dagger)},gap=L.gap(W.sword,W.dagger,'long');
  L.place(F.a,0,gap,'guard');L.place(F.b,0,gap,'guard');
  const r=L.blow(F,'a',100,{outcome:'wound',loc:'chest',lost:8,defeated:true});
  assert(PM.solve(F.b.pose(r.end+50),50).Hd[1]<25,'the defeated fighter is down');
  const e=L.lower(F.a,r.end);assert(F.a.pose(e).h[1]<-50,'the winner\'s weapon hand is low');
  const G={b:L.fighter('b',W.sword)};L.place(G.b,0,gap,'guard');const y=L.yieldTo(G.b,10);
  const j=PM.solve(G.b.pose(y),92);assert(j.Hd[1]>100,'a yield is not a fall');assert(G.b.pose(y).head>15,'the head is bowed');
});
// ---- One ordinary sword exchange (owner's review, 2026-11-12): the quality standard for every other phrase ----
const SW=W.sword;
function swords(){const gap=L.gap(SW,SW,'long'),F={a:L.fighter('a',SW),b:L.fighter('b',SW)};L.place(F.a,0,gap,'guard');L.place(F.b,0,gap,'guard');return {F,gap};}
// distance from a point to a fighter's drawn blade
function toDrawnBlade(f,t,p){const j=L.pose(f,t),a=f.W(j.Hn),b=f.W(j.tip),vx=b[0]-a[0],vy=b[1]-a[1];
  const u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy)));return dist(p,[a[0]+vx*u,a[1]+vy*u]);}
const BODY=['Hd','chest','abdomen','P','K','F','bK','bF'];
const nearBody=(A,D,t0,t1)=>{let m=1e9;for(let t=t0;t<=t1;t+=5)for(const n of BODY)m=Math.min(m,toDrawnBlade(A,t,D.at(t,n)));return m;};
test('sword: a miss visibly clears the body, and its follow-through ends on the attacker\'s own side',()=>{
  for(const first of ['a','b']){
    const {F}=swords();let t=100;
    // also from the lowered sword of an earlier miss: the next movement starts from it
    for(let i=0;i<3;i++){const aid=i%2?(first==='a'?'b':'a'):first,A=F[aid],D=F[aid==='a'?'b':'a'];
      const r=L.blow(F,aid,t,{outcome:'miss',loc:'chest',lost:0});
      const m=nearBody(A,D,r.tc-150,r.end);assert(m>=14,'the missing blade comes within '+m.toFixed(1)+' of the body');
      const j=L.pose(A,r.end),tip=A.W(j.tip),near=Math.min(...['F','bF'].map(n=>A.L(D.at(r.end,n))[0]));
      assert(A.L(tip)[0]<=near-20,'the spent point is short of the defender\'s nearest foot ('+(near-A.L(tip)[0]).toFixed(0)+')');
      t=r.end+40;}
  }
});
test('sword: a parry visibly intercepts: both blades are at the meeting point, and the turned blade never crosses the defender',()=>{
  const {F}=swords();
  for(const o of ['parried','full-parry']){const r=L.blow(F,'a',100+(o==='parried'?0:2000),{outcome:o,loc:'head',lost:0}),c=r.contacts[0];
    assert(toDrawnBlade(F.a,c.t,c.at)<9,'the cut reaches the meeting point');
    assert(toDrawnBlade(F.b,c.t,c.at)<12,'the parrying blade is at the meeting point ('+toDrawnBlade(F.b,c.t,c.at).toFixed(1)+')');
    const m=nearBody(F.a,F.b,c.t+20,r.end);assert(m>=10,'the turned blade comes within '+m.toFixed(1)+' of the defender');}
});
test('sword: a hit reacts where it lands (head snaps back, abdomen folds, a leg gives, the weapon arm is knocked back)',()=>{
  const react=loc=>{const {F}=swords(),r=L.blow(F,'a',100,{outcome:'wound',loc,lost:4}),tb=r.contacts.find(c=>c.kind==='body').t;
    const p0=F.b.pose(tb),p1=F.b.pose(tb+130);return {head:p1.head-p0.head,bend:p1.bend-p0.bend,py:p1.py-p0.py,hx:p1.h[0]-p0.h[0],lean:p1.lean-p0.lean};};
  const head=react('head'),abd=react('abdomen'),leg=react('rleg'),arm=react('rarm'),chest=react('chest');
  assert(head.head>15,'the head snaps back');assert(abd.bend>12&&abd.bend>chest.bend+10,'the body folds over the abdomen');
  assert(leg.py<-8&&leg.py<chest.py-3,'the struck knee gives');assert(arm.hx<-15,'the weapon arm is knocked back');
  assert(chest.lean<-5,'the chest goes back');
});
test('sword: the cut runs preparation, commitment, contact, follow-through; hips before blade; the weight moves from the rear foot to the front',()=>{
  const {F}=swords(),A=F.a,r=L.blow(F,'a',100,{outcome:'wound',loc:'chest',lost:3}),tc=r.contacts[0].t,t0=tc-L.CUT_LEAD;
  const p=t=>A.pose(t),j=t=>L.pose(A,t),share=t=>{const q=p(t);return (q.px-q.bfx)/(q.ffx-q.bfx);};
  // preparation: the weight settles back, the shoulders turn away, the hilt comes up beside the head, not over it
  assert(share(tc-250)<share(t0)-.04,'the weight goes back onto the rear foot first');assert(p(tc-250).turn<-4,'the shoulders turn back');
  for(let t=t0;t<=tc;t+=10){const q=j(t);assert(q.Hn[1]<q.Hd[1]+2,'the hilt stays below the top of the head at '+(t-tc));}
  const wl=j(tc-250).w;assert(wl>125&&wl<175,'the blade is laid back over the shoulder, not upright ('+wl.toFixed(0)+')');
  // commitment: the front foot leaves while the blade is still back; it lands before the blade arrives
  assert(p(tc-200).ffy>1&&j(tc-200).w>100,'the foot goes while the blade is still back');assert(p(tc-30).ffy<.5,'the foot is down before contact');
  // the hips lead: most of their travel is done while the blade is still behind the shoulder
  const px0=p(t0).px,px1=p(tc).px;assert((p(tc-140).px-px0)/(px1-px0)>.45&&j(tc-140).w>90,'hips before blade');
  // contact: the weight is forward, the shoulders turned into the blow
  assert(share(tc)>share(t0)+.1,'the weight has moved forward');assert(p(tc).turn>8,'the shoulders come round into the blow');
});
test('sword: a fight-ending blow goes straight into the fall, with no recovery to guard',()=>{
  const {F}=swords(),r=L.blow(F,'a',100,{outcome:'wound',loc:'chest',lost:9,defeated:true}),tb=r.contacts[0].t;
  let prev=1e9;for(let t=tb+60;t<=tb+800;t+=20){const y=L.pose(F.b,t).P[1];assert(y<=prev+3,'the hips never rise again on the way down');prev=y;}
  assert(L.pose(F.b,tb+800).Hd[1]<30,'down');
});
// ---- Second pass on the sword exchange (owner's review, 2026-11-12): target, balance, rhythm, defensive intent ----
const tipSpeed=(f,t)=>dist(L.pose(f,t).tip,L.pose(f,t+5).tip);
const segDist=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));return dist(p,[a[0]+vx*u,a[1]+vy*u]);};
function bladeGap(f1,f2,t){const j1=L.pose(f1,t),j2=L.pose(f2,t),a=f1.W(j1.Hn),b=f1.W(j1.tip),c=f2.W(j2.Hn),e=f2.W(j2.tip);let m=1e9;
  for(let s=0;s<=1;s+=.05){m=Math.min(m,segDist([a[0]+(b[0]-a[0])*s,a[1]+(b[1]-a[1])*s],c,e),segDist([c[0]+(e[0]-c[0])*s,c[1]+(e[1]-c[1])*s],a,b));}return m;}
test('sword: the target shapes the attack from the preparation (hilt high for the head, at the shoulder for the body, low for the legs)',()=>{
  const prep=loc=>{const {F}=swords(),r=L.blow(F,'a',100,{outcome:'wound',loc,lost:3}),tc=r.contacts[0].t,t=tc-250,j=L.pose(F.a,t);
    return {hy:j.Hn[1]-j.S[1],py:F.a.pose(t).py,tipy:j.tip[1]-j.Hn[1],lean:F.a.pose(t).lean};};
  const hi=prep('head'),mid=prep('chest'),lo=prep('rleg');
  assert(hi.hy>mid.hy+8&&mid.hy>lo.hy+12,'the hilt is set by the target ('+[hi.hy,mid.hy,lo.hy].map(v=>v.toFixed(0))+')');
  assert(hi.tipy>25,'the high chamber lays the blade back and up');assert(Math.abs(mid.tipy)<20,'the body cut lays the blade back flat');
  assert(lo.tipy<-25,'the low cut carries the blade back and down');
  assert(lo.py<hi.py-3&&lo.lean>hi.lean+6,'the low cut sinks the hips and pitches the chest forward');
});
test('sword: a hit beats a guard: the defender goes to a guard as the cut is prepared, and at contact its blade is clear of the cut',()=>{
  for(const loc of ['head','chest','rleg']){const {F}=swords(),r=L.blow(F,'a',100,{outcome:'wound',loc,lost:3}),tc=r.contacts[0].t;
    const before=L.pose(F.b,tc-330),guard=L.pose(F.b,tc-160);
    assert(dist(before.tip,guard.tip)>15,loc+': the defender\'s weapon goes to a guard');
    assert(bladeGap(F.a,F.b,tc)>=12,loc+': at contact the defending blade is clear of the cut ('+bladeGap(F.a,F.b,tc).toFixed(1)+'), so a hit never reads as a parry');
    // and it is moving to cover when the cut lands: beaten by time, not standing still
    assert(dist(L.pose(F.b,tc-60).tip,L.pose(F.b,tc).tip)>3,loc+': the late guard is still moving at contact');}
});
test('sword: a parry is set before the cut arrives, then binds: the attacking blade is carried on the parrying one',()=>{
  for(const loc of ['head','chest']){const {F}=swords(),r=L.blow(F,'a',100,{outcome:'parried',loc,lost:0}),c=r.contacts[0];
    assert(toDrawnBlade(F.b,c.t-40,c.at)<12,loc+': the parrying blade is already across the line 40 ms before contact');
    assert(tipSpeed(F.b,c.t-20)<tipSpeed(F.a,c.t-20)/3,loc+': the guard waits; the cut is the fast thing');
    assert(bladeGap(F.a,F.b,c.t+60)<10,loc+': the blades stay together in the bind ('+bladeGap(F.a,F.b,c.t+60).toFixed(1)+')');
    const ja=L.pose(F.a,c.t),jb=L.pose(F.a,c.t+90);assert(jb.tip[1]<ja.tip[1]-20,loc+': the bind carries the cut down');}
});
test('sword: rhythm: a controlled preparation, a faster strike, and hips that drive without stopping',()=>{
  for(const loc of ['head','chest','rleg']){const {F}=swords(),r=L.blow(F,'a',100,{outcome:'wound',loc,lost:3}),tc=r.contacts[0].t,A=F.a;
    let prep=0,strike=0;for(let t=tc-L.CUT_LEAD;t<tc-200;t+=5)prep=Math.max(prep,tipSpeed(A,t));for(let t=tc-120;t<tc;t+=5)strike=Math.max(strike,tipSpeed(A,t));
    assert(strike>prep*1.4,loc+': the strike is clearly faster than the preparation ('+strike.toFixed(1)+' v '+prep.toFixed(1)+')');
    const hip=t=>L.pose(A,t+5).P[0]-L.pose(A,t).P[0];let peak=0;for(let t=tc-260;t<tc-20;t+=5)peak=Math.max(peak,hip(t));
    for(let t=tc-230;t<tc-40;t+=5)assert(hip(t)>peak*.2,loc+': the hips stall in the drive at '+(t-tc));}
});
test('sword: the defender\'s weapon never runs into the attacker as the attacker steps in',()=>{
  const Q=L.sequence(),BODY2=['Hd','chest','abdomen','P'];
  for(const e of Q.exchanges){const A=Q.fighters[e.attacker],D=Q.fighters[e.attacker==='a'?'b':'a'];
    const tc=Q.marks.find(m=>m.t>e.t&&/^Strike/.test(m.label)).t+140;
    for(let t=e.t;t<tc-10;t+=5){const j=L.pose(D,t),a=D.W(j.Hn),b=D.W(j.tip);
      for(const n of BODY2)assert(segDist(A.at(t,n),a,b)>=9,e.label+': the guard is in the attacker\'s '+n+' at '+(t-tc));}}
});
test('sword: the study sequence is one continuous motion: each exchange starts from the pose the last one ended in',()=>{
  const Q=L.sequence();
  for(const id of ['a','b']){const f=Q.fighters[id];let prev=null;
    for(let u=0;u<Q.dur;u+=5){const j=L.pose(f,u);
      if(prev)for(const n of JOINTS)assert(dist(j[n],prev[n])<(n==='tip'?40:22),id+'.'+n+' jumps at '+u);prev=j;}}
});
test('presentation only: the live layer reads no rules, dice or page',()=>{
  const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','experiments','pits-motion.js'),'utf8').replace(/\/\/.*$/gm,'');
  assert.doesNotMatch(src,/Math\.random|document\.|window\.|\bS\.fighters|\brollSkill|\bCombatRules/);
});
// (Work's checks A8 and A9, 2026-11-14: a polearm's or a staff's lead hand let go of the shaft when the grip point
// up the shaft was out of the arm's reach)
test('a two-handed weapon: the off hand stays on the shaft, even when the grip point is out of reach',()=>{
 const seg=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy;let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L;t=Math.max(0,Math.min(1,t));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
 const base={px:0,py:92,lean:0,bend:0,head:0,ffx:20,ffy:0,bfx:-20,bfy:0,turn:0,o:[10,-40],fs:0,wr:null};
 let n=0;
 for(const two of [10,18,40,44])for(const h of [[40,-10],[-30,10],[20,40],[50,30],[-10,-50]])for(const w of [-120,-60,0,40,90,160]){
  const j=PM.solve({...base,h,w,two},176);n++;
  assert(seg(j.oHn,j.Hn,j.tip)<=1.5,'off hand off the shaft: two '+two+', hand '+h+', angle '+w+', gap '+seg(j.oHn,j.Hn,j.tip).toFixed(1));}
 assert.equal(n,120);
});
console.log(passed+' passed');
