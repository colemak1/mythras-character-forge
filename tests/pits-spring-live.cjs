// The spring stage's live flow (experiments/pits-spring-live.js), driven the way the stage drives it and checked
// without a browser: a declared action is drawn before its dice and held; the resolved blow then starts from that
// held pose and lands soon; nothing goes back to a guard between exchanges; a fighter on the ground stays there.
// (Owner, 2026-11-13: "the blade begins its swing and then pauses ... then everything starts moving".)
// The browser side (the clock stops, nothing moves while a person decides) is tests/visual/pits-spring-live.cjs;
// movement faults over many random fights are counted by tests/sweep/pits-live-sweep.cjs.
const assert=require('node:assert/strict');
const PL=require('../experiments/pits-spring-live.js'),PS=require('../experiments/pits-spring.js'),PW=require('../experiments/pits-writer.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const WK={sword:{kind:'blade',len:92},dagger:{kind:'blade',len:50},rapier:{kind:'blade',len:112,thin:1},mace:{kind:'club',len:70},
  spear:{kind:'spear',len:150},greatsword:{kind:'blade',len:130}};
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return Math.hypot(p[0]-(a[0]+vx*u),p[1]-(a[1]+vy*u));};
function bout(wa,wb,shield){
  const M={a:PL.fighter('a',WK[wa],false,{shield}),b:PL.fighter('b',WK[wb],false,{shield})};
  for(const id of ['a','b'])PL.place(M[id],0,PL.gap(WK[wa],WK[wb],'long'),'guard');
  PL.pose(M.a,0);const w=PL.world(M.a);
  const u=t=>Math.round((t-w.T0)*PL.PACE/2)*2,q=()=>({fighters:w.S.F,rec:w.S.W.last()});
  return {M,w,u,at:(id,t,n)=>PS.world(q(),id,u(t),n),j:(id,t)=>PS.joints(q(),id,u(t))};
}
const BODY=['Hd','S','M','P','K','F','bK','bF','E'];
const cleanHold=(B,t,what)=>{for(const id of ['a','b']){const o=id==='a'?'b':'a',hn=B.at(id,t,'Hn'),tip=B.at(id,t,'tip');
  assert(seg(B.at(id,t,'Hd'),hn,tip)>=17,what+': '+id+'\'s weapon is held across its own head');
  for(const n of BODY)assert(seg(B.at(o,t,n),hn,tip)>=2,what+': '+id+'\'s weapon is held through '+o+'.'+n);}};

test('which weapons the spring stage takes: blades, and short one-handed swung weapons as a stand-in',()=>{
  for(const k of ['sword','dagger','rapier','mace'])assert(PL.supports(WK[k]),k);
  for(const k of ['spear','greatsword'])assert(!PL.supports(WK[k]),k+' has no family yet');
  assert.equal(PW.profile('mace').family,'cut');assert(PW.profile('mace').standIn);
});
test('a declared attack draws the weapon back and comes in to striking distance, then holds cleanly',()=>{
  for(const [wa,wb] of [['sword','sword'],['sword','dagger'],['rapier','sword'],['mace','sword']])for(const pick of [0,.55,.8,.99]){
    const B=bout(wa,wb),g0=PW.gapOf(B.w.S.F.a,B.w.S.F.b),h0=B.at('a',0,'Hn'),t0=B.at('a',0,'tip');
    const t=PL.intent(B.M.a,0,'attack',pick);
    assert(t>0&&t<900,'the declared movement takes under a second of the stage clock ('+Math.round(t)+')');
    const h1=B.at('a',t,'Hn'),t1=B.at('a',t,'tip');
    assert(Math.hypot(t1[0]-t0[0],t1[1]-t0[1])>12||Math.hypot(h1[0]-h0[0],h1[1]-h0[1])>12,wa+' '+pick+': the weapon moved');
    const g1=PW.gapOf(B.w.S.F.a,B.w.S.F.b);
    assert(g1<=g0-8||g0<=180,wa+': the attacker came in to striking distance ('+g0+' to '+g1+')');
    cleanHold(B,t,wa+' against '+wb+', attack declared ('+pick+')');
  }
});
test('a declared parry, shield parry or evade moves the defender and holds cleanly; the attacker stays as it was',()=>{
  for(const [kind,shield] of [['parry',false],['shield',true],['evade',false]])for(const pick of [0,.6,.99]){
    const B=bout('sword','sword',shield);let t=PL.intent(B.M.a,0,'attack',0);
    const a0=B.at('a',t,'tip'),d0=[B.at('b',t,'tip'),B.at('b',t,'oHn'),B.at('b',t,'P')];
    const t2=PL.intent(B.M.b,t,kind,pick);assert(t2>t&&t2<t+600);
    const d1=[B.at('b',t2,'tip'),B.at('b',t2,'oHn'),B.at('b',t2,'P')];
    assert(d0.some((p,i)=>Math.hypot(p[0]-d1[i][0],p[1]-d1[i][1])>8),kind+': the defender moved');
    const a1=B.at('a',t2,'tip');assert(Math.hypot(a1[0]-a0[0],a1[1]-a0[1])<14,kind+': the attacker holds its drawn-back weapon');
    cleanHold(B,t2,kind+' declared ('+pick+')');
  }
});
test('the resolved blow starts from the held pose and lands soon: no walk first, no return to guard',()=>{
  for(const [out,loc,react] of [['wound','chest','parry'],['parried','chest','parry'],['wound','rleg','none'],['miss','abdomen','evade'],['parried','head','parry']]){
    const B=bout('sword','sword');let t=PL.intent(B.M.a,0,'attack',0);if(react!=='none')t=PL.intent(B.M.b,t,react,0);
    const r=PL.blow(B.M,'a',t,{outcome:out,loc,lost:out==='wound'?3:0,prone:react==='evade'});
    assert(r.contacts.length>=1,out+': a contact');
    assert(r.contacts[0].t-t<420,out+' '+loc+': the blow reaches its contact within 420 ms of the stage clock ('+Math.round(r.contacts[0].t-t)+')');
    assert(!B.w.S.seq.notes.slice(-6).some(n=>n.kind==='measure'),out+': no measure step before the blow');
  }
});
test('exchange after exchange, neither fighter is back in its opening guard at a hold',()=>{
  const B=bout('sword','sword'),g={a:B.j('a',0),b:B.j('b',0)};let t=0,same=0,holds=0;
  const seqs=[['a','parried','chest'],['b','wound','rarm'],['a','miss','abdomen'],['b','parried','head'],['a','armour','lleg'],['b','parried','chest']];
  for(const [aid,out,loc] of seqs){const did=aid==='a'?'b':'a';
    t=PL.intent(B.M[aid],t,'attack',.3);t=PL.intent(B.M[did],t,'parry',.3);
    t=PL.blow(B.M,aid,t,{outcome:out,loc,lost:out==='wound'?2:0}).end;holds++;
    for(const id of ['a','b']){const j=B.j(id,t);
      if(Math.hypot(j.Hn[0]-g[id].Hn[0]-(j.P[0]-g[id].P[0]),j.Hn[1]-g[id].Hn[1])<6&&Math.abs(PS.norm(j.w-g[id].w))<10)same++;}}
  assert(same<=1,'a fighter stood in its opening guard at '+same+' of '+holds*2+' holds');
});
test('what an exchange planned for after its hold is dropped when the next movement is written',()=>{
  const B=bout('sword','sword');let t=PL.intent(B.M.a,0,'attack',0);t=PL.blow(B.M,'a',t,{outcome:'parried',loc:'chest',lost:0}).end;
  const u=B.u(t),F=B.w.S.F;
  assert(F.a.keys.some(k=>k.t>u)||F.b.keys.some(k=>k.t>u),'the exchange had a recovery planned for after its hold');
  const before=JSON.stringify(B.j('a',t-40).Hn);
  PL.intent(B.M.b,t,'attack',0);
  assert(!F.a.keys.some(k=>k.t>u+1&&!(F.a.steps||[]).some(s=>s.t0<u&&k.t<=s.t1)),'a\'s old recovery keys are gone');
  assert.equal(JSON.stringify(B.j('a',t-40).Hn),before,'the picture already shown is unchanged');
});
test('an evade that ends on the ground: the evader goes down in the blow and stays down through the next exchange',()=>{
  const B=bout('sword','sword');let t=PL.intent(B.M.a,0,'attack',0);t=PL.intent(B.M.b,t,'evade',0);
  const r=PL.blow(B.M,'a',t,{outcome:'evaded',loc:'chest',lost:0,prone:true});t=r.end;
  assert(B.at('b',t,'P')[1]<40,'the evader is down at the hold (hips '+B.at('b',t,'P')[1].toFixed(0)+')');
  assert.equal(PL.fall(B.M.b,t),t,'a later fall is a no-op: already down');
  t=PL.intent(B.M.a,t,'attack',.6);const r2=PL.blow(B.M,'a',t,{outcome:'wound',loc:'chest',lost:3});
  let top=0;for(let x=t;x<=r2.end;x+=20)top=Math.max(top,B.at('b',x,'P')[1]);
  assert(top<45,'the fighter on the ground did not stand up to be hit (hips reached '+top.toFixed(0)+')');
});
test('an evade that fails: the evader is hit and goes down from the blow, in the same movement',()=>{
  const B=bout('sword','sword');let t=PL.intent(B.M.a,0,'attack',0);t=PL.intent(B.M.b,t,'evade',0);
  assert(B.at('b',t,'P')[1]>55,'still on its feet while the dice roll');
  const r=PL.blow(B.M,'a',t,{outcome:'wound',loc:'chest',lost:3,fall:true});
  assert(r.contacts.some(c=>c.kind==='body'),'the blow lands');
  assert(B.at('b',r.contacts.find(c=>c.kind==='body').t,'P')[1]>45,'standing when hit');
  assert(B.at('b',r.end,'P')[1]<40,'down at the end of the same movement');
});
test('a killing blow on a fighter already down: no getting up, the body goes limp where it lies',()=>{
  const B=bout('sword','sword');let t=PL.intent(B.M.a,0,'attack',0);
  t=PL.blow(B.M,'a',t,{outcome:'wound',loc:'rleg',lost:4,fall:true}).end;
  t=PL.intent(B.M.a,t,'attack',.9);const r=PL.blow(B.M,'a',t,{outcome:'wound',loc:'chest',lost:8,defeated:true});
  let top=0;for(let x=t;x<=r.end+400;x+=20)top=Math.max(top,B.at('b',x,'P')[1]);
  assert(top<45,'stayed down (hips reached '+top.toFixed(0)+')');
});
console.log(passed+' passed');
