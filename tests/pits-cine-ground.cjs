// The Pits cinematic stage, batch (b): fighting from the ground (docs/pits-animation-direction.md, "Fighting from the
// ground"). A fighter the rules have on the ground attacks from one knee (the back knee on the floor) with one of three
// moves, parries with its body as well as its arm, and waits in more than one pose. What is held here: bodies stay
// possible (the kneeling leg included) and on the floor, the hips no higher than the knee, nothing jumps, the weapon
// is on every contact, the two never end up in each other, the fighter is still down after, and a replay repeats the
// move. Whether it looks right is for the owner's eye (sheets in docs/pits-visual-checks/cine-ground-*.jpg).
const assert=require('node:assert/strict');
const C=require('../experiments/pits-cine.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return Math.hypot(p[0]-(a[0]+vx*u),p[1]-(a[1]+vy*u));};
C.keep(0);
const WK={sword:{kind:'blade',len:92},dagger:{kind:'blade',len:50},rapier:{kind:'blade',len:112,thin:1},mace:{kind:'club',len:70},
  axe:{kind:'axe',len:84},spear:{kind:'spear',len:150},greatsword:{kind:'blade',len:130},halberd:{kind:'polearm',len:176}};
const LOCS=['head','chest','abdomen','rarm','larm','rleg','lleg'];
const ALL=['wound','armour','zero','parried','full-parry','full-ward','partial-parry','partial-ward','miss','fumble','evaded'];
const GROUND=36.5,GM=['gRise','gThrust','gChop'];
const seed=n=>{let a=n|0;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
function pair(wa,wb,n,shield){
  seed(n);
  const M={a:C.fighter('a',WK[wa],false,{}),b:C.fighter('b',WK[wb],false,{shield:!!shield,shieldKey:'heater'})};
  const g=C.gap(WK[wa],WK[wb],'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');return M;
}
function possible(m,t,what){
  const j=C.joints(m,t),D=C.DIM;
  for(const [a,b,len] of [['P','K',D.thigh],['K','F',D.shin],['P','bK',D.thigh],['bK','bF',D.shin],['wS','E',D.upper],['E','Hn',D.fore],['oS','oE',D.upper],['oE','oHn',D.fore]])
    assert(Math.abs(dist(j[a],j[b])-len)<.6,what+': '+a+'-'+b+' is '+dist(j[a],j[b]).toFixed(1)+' long at '+t);
  for(const k of ['F','bF','K','bK','P','Hn','oHn','tip'])assert(j[k][1]>=-1,what+': '+k+' is under the floor at '+t+' ('+j[k][1].toFixed(1)+')');
  return j;
}
const lost=o=>o==='wound'||o.startsWith('partial')?3:0;

test('from the ground: every weapon, outcome and location, declared or not; the body stays down and possible, the blow lands, nothing jumps',()=>{
  let n=0;const seen={};
  for(const wa of Object.keys(WK))for(const o of ALL)for(const loc of LOCS){
    const wb=['sword','spear','dagger','greatsword'][n%4],M=pair(wa,wb,++n,o.endsWith('ward'));
    let t=C.fall(M.a,100)+200;
    const live=n%2===0;if(live)t=C.intent(M.a,t,'attack',.5)+400;
    const r=C.blow(M,'a',t,{outcome:o,loc,lost:lost(o),shield:o.endsWith('ward'),key:'e'+n});
    const what=wa+' against '+wb+', '+o+' at the '+loc+(live?' (declared)':'');
    assert(GM.includes(r.move),what+': the move from the ground is '+r.move);seen[r.move]=(seen[r.move]||0)+1;
    if(C.profile(WK[wa]).fam==='thrust')assert.equal(r.move,'gThrust',what+': a thrusting weapon from the ground');
    for(const c of r.contacts){const j=C.joints(M.a,c.t),d=seg(c.at,j.Hn,j.tip);assert(d<3,what+': the weapon is '+d.toFixed(1)+' from its '+c.kind+' contact');}
    // on one knee as the first blow lands: the back knee and the shin on the floor
    const j=C.joints(M.a,r.contacts[0].t);
    assert(j.bK[1]<4&&j.bF[1]<8,what+': not on the knee at the contact (knee '+j.bK[1].toFixed(0)+', foot '+j.bF[1].toFixed(0)+')');
    // a drive behind the point pushes off the floor with the off hand (when it is not on the shaft)
    if(r.move==='gThrust'&&!C.profile(WK[wa]).two){let lo=1e9;for(let x=t-300;x<=r.contacts[0].t;x+=5)lo=Math.min(lo,C.joints(M.a,x).oHn[1]);
      assert(lo<14,what+': the off hand never comes nearer the floor than '+lo.toFixed(0)+' in a drive from the ground');}
    let prev=null;
    for(let x=t-50;x<=r.end+300;x+=4){
      const a=C.joints(M.a,x),b=C.joints(M.b,x);
      assert(a.P[1]<=GROUND,what+': the hips rise to '+a.P[1].toFixed(0)+' at '+(x-t));
      // (the legs more strictly than the stage's other tests: a kneeling leg swapping sides is what could go wrong)
      if(prev)for(const k of ['P','Hd','K','F','bK','bF','Hn'])assert(dist(a[k],prev[k])<(k==='Hn'?46:30),what+': '+k+' jumps '+dist(a[k],prev[k]).toFixed(0)+' in 4 ms at '+(x-t));
      prev=a;
      if((x-t)%20===0){possible(M.a,x,what+' (attacker)');possible(M.b,x,what+' (defender)');}
    }
    assert(M.a.down,what+': no longer down after');
    // the two do not end in each other
    const e=r.end+300,ha=C.joints(M.a,e).P[0],hb=C.joints(M.b,e).P[0];assert(hb-ha>80,what+': the hips end '+(hb-ha).toFixed(0)+' apart');
  }
  for(const m of GM)assert(seen[m]>=20,'the move '+m+' is hardly used ('+(seen[m]||0)+')');
});

test('the struck fighter is never stood on: while a blow from the ground plays out, the hips stay apart',()=>{
  let n=0;
  for(const wa of ['sword','dagger','spear','greatsword','mace'])for(const o of ['wound','parried','armour','miss','partial-parry'])for(const loc of LOCS){
    const M=pair(wa,'sword',++n);const t=C.fall(M.a,100)+200;
    const r=C.blow(M,'a',t,{outcome:o,loc,lost:o==='wound'?4+n%5:o==='partial-parry'?2:0});
    for(let x=t;x<=r.end;x+=4){const d=C.joints(M.b,x).P[0]-C.joints(M.a,x).P[0];
      assert(d>70,wa+', '+o+' at the '+loc+' from the ground: the hips are '+d.toFixed(0)+' apart at '+(x-t));}
  }
});

test('a replay repeats the move from the ground',()=>{
  for(let n=1;n<=40;n++){
    const loc=LOCS[n%7],s={outcome:'wound',loc,lost:3};
    const M=pair('sword','sword',n);const t=C.fall(M.a,100)+200;const r=C.blow(M,'a',t,s);
    // (the replay starts from its own bout, another seed; it is given the live move back)
    const M2=pair('sword','sword',n+500);const t2=C.fall(M2.a,100)+200;const r2=C.blow(M2,'a',t2,{...s,move:r.move,flow:true});
    assert.equal(r2.move,r.move,'the replay drew '+r2.move+' for '+r.move);
  }
});

test('parrying from the ground: the body comes up into the parry by where the blow comes, and stays down',()=>{
  const lean={};
  for(const loc of ['head','chest','rleg'])for(const o of ['parried','partial-parry']){
    const M=pair('sword','sword',7);const t=C.fall(M.b,100)+200;
    const r=C.blow(M,'a',t,{outcome:o,loc,lost:o==='partial-parry'?2:0});
    const j=C.joints(M.b,r.contacts[0].t);
    assert(j.P[1]<=GROUND,'a parry from the ground at the '+loc+' rises to '+j.P[1].toFixed(0));
    for(let x=t;x<=r.end+200;x+=20)possible(M.b,x,'parry from the ground at the '+loc);
    if(o==='parried')lean[loc]=C.sample(M.b,r.contacts[0].t-10,true).lean;
    // a blow at the head is met above the head
    if(loc==='head'&&o==='parried')assert(r.contacts[0].at[1]>j.Hd[1],'a blow at the head is parried below the head from the ground');
    assert(M.b.down,'the parry from the ground stood the fighter up');
  }
  assert(lean.head<lean.chest-10&&lean.chest<lean.rleg-10,'the body does not come up differently by where the blow comes ('+JSON.stringify(lean)+')');
});

test('on the ground a fighter waits in more than one pose, never the same twice running',()=>{
  const M=pair('sword','sword',3);let t=C.fall(M.b,100)+200;const got=[];
  for(let i=0;i<10;i++){
    const r=C.blow(M,'a',t,{outcome:i%2?'parried':'armour',loc:'chest',lost:0});
    got.push(M.b.gready);t=r.end+200;
    possible(M.b,t,'waiting on the ground');assert(C.joints(M.b,t).P[1]<=GROUND,'waiting on the ground with the hips at '+C.joints(M.b,t).P[1].toFixed(0));
  }
  for(let i=1;i<got.length;i++)assert.notEqual(got[i],got[i-1],'the same ground pose twice running: '+got.join(', '));
  assert(new Set(got).size>=3,'only '+[...new Set(got)].join(', ')+' on the ground');
});

console.log(passed+' passed');
