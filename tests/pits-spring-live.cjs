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
  spear:{kind:'spear',len:150},greatsword:{kind:'blade',len:130},pike:{kind:'spear',len:230},halberd:{kind:'polearm',len:176},
  quarterstaff:{kind:'staff',len:132},flail:{kind:'chain',len:84},whip:{kind:'whip',len:150},net:{kind:'net',len:70},'battleaxe-2h':{kind:'axe',len:90,two:1}};
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

// (owner, 2026-11-14: every weapon playable on the spring stage; weapons without a family of their own are stand-ins)
test('the spring stage takes every weapon: blades with their own phrases, the rest on the cut or thrust phrases as stand-ins',()=>{
  for(const k of Object.keys(WK))assert(PL.supports(WK[k]),k);
  assert.equal(PW.profile('mace').family,'cut');assert(PW.profile('mace').standIn);
  assert.equal(PW.profile('spear').family,'thrust');assert(PW.profile('pike').two>0,'a pike is held in both hands');
  assert.equal(PW.profile('greatsword').family,'cut');assert(PW.profile('greatsword').two>0);
  assert(!PW.profile('sword').standIn&&!PW.profile('sword').two,'the broadsword keeps its own phrases, in one hand');
});
test('a two-handed weapon is drawn with the off hand on it, in front of the weapon hand',()=>{
  for(const k of ['greatsword','pike']){const wk=WK[k];
    const M={a:PL.fighter('a',wk,false,{}),b:PL.fighter('b',WK.sword,false,{})};
    for(const id of ['a','b'])PL.place(M[id],0,PL.gap(wk,WK.sword,'long'),'guard');
    const j=PL.pose(M.a,300),two=PW.profile(k).two,dir=[j.tip[0]-j.Hn[0],j.tip[1]-j.Hn[1]],L=Math.hypot(...dir);
    const want=[j.Hn[0]+dir[0]/L*two,j.Hn[1]+dir[1]/L*two],d=Math.hypot(j.oHn[0]-want[0],j.oHn[1]-want[1]);
    assert(d<12,k+': the off hand is on the weapon ('+d.toFixed(1)+' from its grip)');
    const free=PL.pose(M.a,300,{unarmed:true});assert(Math.hypot(free.oHn[0]-want[0],free.oHn[1]-want[1])>3,k+': unarmed, the off hand lets go');}
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
// (owner, 2026-11-13: "it's fine if we take a short cut and just let the body crumble")
const JN=['P','M','S','Hd','K','F','bK','bF','E','Hn','oE','oHn'];
test('a fall is the body crumbling where it stands: down onto the knees, folded over, nothing below the floor',()=>{
  for(const [what,go] of [['a leg wound',B=>{let t=PL.intent(B.M.a,0,'attack',0);t=PL.intent(B.M.b,t,'parry',0);
      return [t,PL.blow(B.M,'a',t,{outcome:'wound',loc:'rleg',lost:5,fall:true}).end];}],
    ['a killing blow',B=>{const t=PL.intent(B.M.a,0,'attack',0);return [t,PL.blow(B.M,'a',t,{outcome:'wound',loc:'chest',lost:9,defeated:true}).end+300];}],
    ['a trip',B=>{const t=PL.intent(B.M.a,0,'attack',0);return [t,PL.blow(B.M,'a',t,{outcome:'armour',loc:'rleg',lost:0,fall:true}).end];}]]){
    const B=bout('sword','sword'),[t0,end]=go(B),x0=B.at('b',t0,'P')[0];
    for(let x=t0;x<=end+600;x+=20){const j=B.j('b',x);for(const n of JN)assert(j[n][1]>-3,what+': b.'+n+' below the floor ('+j[n][1].toFixed(0)+')');}
    const j=B.j('b',end+600);
    assert(j.P[1]<30,what+': down at the end (hips '+j.P[1].toFixed(0)+')');
    assert(j.K[1]<24&&j.bK[1]<24,what+': on the knees');
    assert(j.Hd[1]<60,what+': folded over');
    assert(Math.abs(B.at('b',end+600,'P')[0]-x0)<40,what+': where it stood, not thrown across the floor');
  }
});
test('a wound to the arm: the fighter reacts and the arm hangs, but stays on its feet (not prone)',()=>{
  for(const lost of [3,6]){const B=bout('sword','sword');let t=PL.intent(B.M.a,0,'attack',0);t=PL.intent(B.M.b,t,'parry',0);
    const r=PL.blow(B.M,'a',t,{outcome:'wound',loc:'rarm',lost});let low=1e9;
    for(let x=t;x<=r.end+1500;x+=20)low=Math.min(low,B.at('b',x,'P')[1]);
    assert(low>60,'hips stayed up ('+low.toFixed(0)+')');}
});
// (owner, 2026-11-13: "the stillness should not come through in the full fight replay")
test('the replay runs on: each exchange is written from just after the last one\'s contact, with no hold between',()=>{
  const B=bout('sword','sword');let t=0,prev=null;
  for(const [a,o,l,lost] of [['a','parried','chest',0],['b','wound','chest',3],['a','miss','abdomen',0],['b','parried','head',0],['a','armour','chest',0]]){
    const r=PL.blow(B.M,a,t,{outcome:o,loc:l,lost,flow:true});
    const last=Math.max(...r.contacts.map(c=>c.t));
    assert(r.end-last<=190,o+': the next exchange may begin within 190 ms of the stage clock after the last contact ('+Math.round(r.end-last)+')');
    if(prev!=null)assert(r.contacts[0].t-prev<900,o+': the next blow lands soon after the last ('+Math.round(r.contacts[0].t-prev)+')');
    prev=last;t=r.end;}
  // and something is moving at every moment between the first and the last contact
  let still=0,run=0;const q=n=>B.at('a',n,'tip').concat(B.at('b',n,'tip'));
  for(let x=200;x<t;x+=40){const p0=q(x),p1=q(x+40);const m=Math.max(...p0.map((v,i)=>Math.abs(p1[i]-v)));run=m<.4?run+40:0;still=Math.max(still,run);}
  assert(still<=240,'no stretch of stillness longer than 240 ms ('+still+')');
});
// (Work's code findings, docs/pits-spring-code-findings-20261113.md)
test('a shield strike reaches the writer as one: landed, missed and parried, it is drawn as the shield strike',()=>{
  for(const [out,lost,want] of [['wound',1,'shieldStrike'],['miss',0,'shieldStrike'],['parried',0,'shieldStrikeMet']]){
    const M={a:PL.fighter('a',WK.sword,false,{shield:true,shieldKey:'heater'}),b:PL.fighter('b',WK.sword,false,{})};
    for(const id of ['a','b'])PL.place(M[id],0,PL.gap(WK.sword,WK.sword,'long'),'guard');PL.pose(M.a,0);const w=PL.world(M.a);
    let t=PL.intent(M.a,0,'shield-strike',0);if(out==='parried')t=PL.intent(M.b,t,'parry',0);
    const r=PL.blow(M,'a',t,{outcome:out,loc:'chest',lost,strike:'shield'});
    assert.equal(r.phrase,want,out);
    const ex=w.S.seq.exchanges.at(-1);assert.equal(ex.phrase,want);
    if(out!=='miss')assert(r.contacts.length>=1,out+': a contact');
  }
  // and the defender's shield is not mistaken for the attacker's tool
  const M={a:PL.fighter('a',WK.sword,false,{}),b:PL.fighter('b',WK.sword,false,{shield:true,shieldKey:'kite'})};
  for(const id of ['a','b'])PL.place(M[id],0,PL.gap(WK.sword,WK.sword,'long'),'guard');PL.pose(M.a,0);
  const t=PL.intent(M.a,0,'attack',0);assert.notEqual(PL.blow(M,'a',PL.intent(M.b,t,'shield',0),{outcome:'parried',loc:'chest',lost:0,shield:true}).phrase,'shieldStrike');
});
test('each shield keeps its own size: a buckler and a heater are not the same shield on the spring stage',()=>{
  const M={a:PL.fighter('a',WK.sword,false,{shield:true,shieldKey:'buckler'}),b:PL.fighter('b',WK.sword,false,{shield:true,shieldKey:'scutum'})};
  for(const id of ['a','b'])PL.place(M[id],0,PL.gap(WK.sword,WK.sword,'long'),'guard');PL.pose(M.a,0);const w=PL.world(M.a);
  assert.equal(w.S.F.a.shieldR,PW.shieldR('buckler'));assert.equal(w.S.F.b.shieldR,PW.shieldR('scutum'));
  assert(w.S.F.a.shieldR<w.S.F.b.shieldR);
  // a look without a key (an older caller) is still a shield
  const N={a:PL.fighter('a',WK.sword,false,{shield:true}),b:PL.fighter('b',WK.sword,false,{})};
  for(const id of ['a','b'])PL.place(N[id],0,PL.gap(WK.sword,WK.sword,'long'),'guard');PL.pose(N.a,0);
  assert.equal(PL.world(N.a).S.F.a.shieldR,PW.shieldR('heater'));
});
test('Press Advantage is drawn: the point stays in the other\'s face, the other covers; then it holds cleanly',()=>{
  for(const [wa,wb] of [['sword','sword'],['dagger','sword'],['sword','rapier'],['mace','sword']]){
    const B=bout(wa,wb);let t=PL.intent(B.M.a,0,'attack',0);t=PL.intent(B.M.b,t,'parry',0);
    t=PL.blow(B.M,'a',t,{outcome:'wound',loc:'chest',lost:2}).end;
    const k0=[B.w.S.F.a.keys.length,B.w.S.F.b.keys.length],e=PL.press(B.M.a,B.M.b,t);
    assert(e>t,wa+': the pressure takes time to set');
    assert(B.w.S.F.a.keys.length>k0[0]&&B.w.S.F.b.keys.length>k0[1],wa+': both fighters move');
    const tip=B.at('a',e,'tip'),hd=B.at('b',e,'Hd');
    assert(Math.hypot(tip[0]-hd[0],tip[1]-hd[1])<70,wa+' v '+wb+': the point is at the face ('+Math.round(Math.hypot(tip[0]-hd[0],tip[1]-hd[1]))+')');
    cleanHold(B,e,wa+' v '+wb+' pressed');
    // and the next action is written from there
    const t2=PL.intent(B.M.b,e,'attack',0);assert(t2>e);
  }
});
// (owner, 2026-11-13: "when tripped it should not be the go to your knees animation that goes off when you die,
// getting tripped is different and should put you on your ass")
test('a trip puts the fighter on its backside: hips on the floor, torso up, legs out toward the other; not the crumble',()=>{
  const end=fall=>{const B=bout('sword','sword');const r=PL.blow(B.M,'a',0,{outcome:'armour',loc:'rleg',lost:0,fall});const t=r.end+400;
    const p=n=>B.at('b',t,n);return {B,t,P:p('P'),S:p('S'),Hd:p('Hd'),F:p('F'),bF:p('bF'),aP:B.at('a',t,'P')};};
  const s=end('sit'),c=end(true);
  assert(s.P[1]<20,'the hips are on the floor ('+s.P[1].toFixed(0)+')');
  assert(s.S[1]-s.P[1]>45,'the torso is upright, shoulders well above the hips ('+(s.S[1]-s.P[1]).toFixed(0)+')');
  const toward=Math.sign(s.aP[0]-s.P[0]);
  for(const k of ['F','bF'])assert((s[k][0]-s.P[0])*toward>10,'the '+k+' foot is out in front, toward the other fighter');
  assert(Math.abs(s.F[0]-s.aP[0])>40,'the legs stop short of the other fighter');
  // the crumble folds over its knees: shoulders much lower over the hips than when sitting
  assert(c.S[1]-c.P[1]<s.S[1]-s.P[1]-15,'the trip is not the defeat crumble');
  cleanHold(s.B,s.t,'after the trip');
});
console.log(passed+' passed');
