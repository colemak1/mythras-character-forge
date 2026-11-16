// Trip, Disarm and Press Advantage have their own choreography on the cinematic stage (owner, 2026-11-16: "continue
// working on animations"; HANDOFF batch (a)). What is held here: bodies stay possible and on the floor, the two never
// stand in each other, nothing jumps, the trip's contact is at the ankle and the tripper's foot or weapon is there, a
// trip that works puts the fighter down and one resisted leaves it up, the disarm binds on the other's weapon and its
// second contact is at the other's hand, Press Advantage drives the other back, and the same exchange key repeats.
// Whether it looks right is for the owner's eye (frame sheets: tests/visual/pits-cine-sheet.cjs).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../experiments/pits-cine.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
C.keep(0);
const WK={sword:{kind:'blade',len:92},dagger:{kind:'blade',len:50},rapier:{kind:'blade',len:112,thin:1},mace:{kind:'club',len:70},
  spear:{kind:'spear',len:150},greatsword:{kind:'blade',len:130,hands:2},halberd:{kind:'polearm',len:176},quarterstaff:{kind:'staff',len:132},
  flail:{kind:'chain',len:84},pike:{kind:'spear',len:230}};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return Math.hypot(p[0]-(a[0]+vx*u),p[1]-(a[1]+vy*u));};
function pair(wa,wb,u){
  C.fixChoices(u);
  const M={a:C.fighter('a',WK[wa],false,{}),b:C.fighter('b',WK[wb],false,{})};
  const g=C.gap(WK[wa],WK[wb],'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
  return M;
}
function possible(m,t,what){
  const j=C.joints(m,t),D=C.DIM;
  for(const [a,b,len] of [['P','K',D.thigh],['K','F',D.shin],['P','bK',D.thigh],['bK','bF',D.shin],['wS','E',D.upper],['E','Hn',D.fore],['oS','oE',D.upper],['oE','oHn',D.fore]])
    assert(Math.abs(dist(j[a],j[b])-len)<.6,what+': '+a+'-'+b+' is '+dist(j[a],j[b]).toFixed(1)+' long at '+t);
  for(const k of ['F','bF','K','bK','P','Hn','oHn','Hd','tip'])assert(j[k][1]>=-1,what+': '+k+' is under the floor at '+t);
}
function sound(M,t0,t1,what){
  let prev=null;
  for(let t=t0;t<=t1;t+=4){
    possible(M.a,t,what);possible(M.b,t,what);
    const a=C.joints(M.a,t),b=C.joints(M.b,t);
    assert(b.P[0]-a.P[0]>75,what+': the hips are '+(b.P[0]-a.P[0]).toFixed(0)+' apart at '+(t-t0));
    if(prev)for(const [x,y] of [[a,prev.a],[b,prev.b]])for(const k of ['P','Hd','F','bF'])
      assert(dist(x[k],y[k])<46,what+': '+k+' jumps '+dist(x[k],y[k]).toFixed(0)+' in 4 ms at '+(t-t0));
    prev={a,b};
  }
}
const KINDS=['fell','resisted','after','down'];

test('Trip Opponent: a hook or a sweep at the ankle; down if it worked, up if it was resisted',()=>{
  const moves=new Set();
  for(const wa of Object.keys(WK))for(const wb of ['sword','spear','dagger'])for(const u of [.1,.9])for(const k of KINDS){
    const M=pair(wa,wb,u),what=wa+' trips '+wb+' ('+k+', u '+u+')';let t=100;
    if(k==='down'){C.fall(M.a,100);t=600;}
    const r=C.trip(M,'a',t,{fell:k!=='resisted',after:k==='after'});
    C.fixChoices(null);moves.add(r.move);
    sound(M,t,r.end+200,what);
    assert.equal(r.contacts.length,1,what+': one contact');
    const c=r.contacts[0],a=C.joints(M.a,c.t);
    assert(c.kind==='trip'&&c.at[1]<15,what+': the contact is not at the ankle');
    assert(Math.min(dist(a.F,c.at),seg(c.at,a.Hn,a.tip))<8,what+': neither the foot nor the weapon is at the ankle');
    if(k==='down')assert.equal(r.move,'sweep',what+': from the ground the trip is a sweep');
    if(k==='after')assert.equal(r.move,M.a.prof.two>30?'sweep':'hook',what+': after a blow the trip is a hook (a long shaft sweeps)');
    const low=C.joints(M.b,r.end+50).P[1];
    if(k==='resisted')assert(low>50&&!M.b.down,what+': a resisted trip put the fighter down');
    else assert(low<30&&M.b.down,what+': a trip that worked left the fighter up');
  }
  assert(moves.has('hook')&&moves.has('sweep'),'both trips are used');
  // a fighter already on the ground is not tripped again
  const M=pair('sword','sword',.5);C.fall(M.b,100);const r=C.trip(M,'a',700,{fell:true});C.fixChoices(null);
  assert.equal(r.contacts.length,0);
});

test('Disarm Opponent: the blade binds on the other weapon, then wrenches it from the hand',()=>{
  for(const wa of Object.keys(WK))for(const wb of ['sword','spear','dagger','halberd'])for(const down of [false,true]){
    const M=pair(wa,wb,.4),what=wa+' disarms '+wb+(down?' (on the ground)':'');let t=100;
    if(down){C.fall(M.b,100);t=600;}
    const r=C.disarm(M,'a',t,{});C.fixChoices(null);
    sound(M,t,r.end+200,what);
    assert.deepEqual(r.contacts.map(c=>c.kind),['clash','disarm'],what);
    const [bind,wrench]=r.contacts,a=C.joints(M.a,bind.t),b=C.joints(M.b,bind.t);
    assert(seg(bind.at,a.Hn,a.tip)<8,what+': the blade is not at the bind');
    assert(seg(bind.at,b.Hn,b.tip)<3,what+': the bind is not on the other weapon');
    assert(dist(wrench.at,C.joints(M.b,wrench.t).Hn)<3,what+': the wrench is not at the other hand');
    // the hand is thrown up and back after the wrench (standing)
    if(!down){const h0=C.joints(M.b,wrench.t).Hn,h1=C.joints(M.b,wrench.t+80).Hn;assert(h1[1]>h0[1]+10,what+': the hand is not thrown up');}
  }
});

test('Press Advantage: a beat on the guard, then the other is driven two steps back',()=>{
  for(const wa of Object.keys(WK))for(const wb of ['sword','spear']){
    const M=pair(wa,wb,.3),what=wa+' presses '+wb;
    const x0=C.joints(M.b,100).P[0],e=C.press(M.a,M.b,100);C.fixChoices(null);
    sound(M,100,e+200,what);
    assert(C.joints(M.b,e).P[0]-x0>50,what+': the other is not driven back');
    // the point ends in the other's face
    const a=C.joints(M.a,e),b=C.joints(M.b,e);assert(dist(a.tip,b.Hd)<70,what+': the point is not at the face ('+dist(a.tip,b.Hd).toFixed(0)+')');
  }
});

test('the same exchange key draws the same trip and disarm (the replay repeats the live move)',()=>{
  const run=(fn)=>{const M={a:C.fighter('a',WK.sword,false,{}),b:C.fighter('b',WK.sword,false,{})};
    M.a.pair.seed=M.b.pair.seed=12345;const g=C.gap(WK.sword,WK.sword,'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
    const r=fn(M);return [r.move,r.end,C.joints(M.a,r.end).P.map(Math.round),C.joints(M.b,r.contacts[0].t).P.map(Math.round)];};
  for(const key of ['7','12','31']){
    assert.deepEqual(run(M=>C.trip(M,'a',100,{fell:true,key})),run(M=>C.trip(M,'a',100,{fell:true,key})));
    assert.deepEqual(run(M=>C.disarm(M,'a',100,{key})),run(M=>C.disarm(M,'a',100,{key})));
  }
});

test('the stage uses the phrases on the cinematic stage and keeps the stand-ins for the spring stage',()=>{
  const st=fs.readFileSync(path.join(__dirname,'..','experiments','pits-stage.js'),'utf8');
  assert(/L\.trip\?L\.trip\(PS\.M,me\.id/.test(st),'the defender\'s Trip uses L.trip');
  assert(/L\.disarm\?L\.disarm\(PS\.M,me\.id/.test(st),'the defender\'s Disarm uses L.disarm');
  assert(/L\.trip\(PS\.M,atk\.id,PS\.clock,\{fell:tripFell,after:true/.test(st),'the attacker\'s Trip is a hook after its blow');
});

// owner, 2026-11-16: "parry into disarm disarms twice": the blow's shown state already said disarmed, so the weapon
// flew at the parry, came back to the hand for the wrench and flew again. The sync keeps it in the hand while the
// Disarm is still to be drawn. (Browser check: tests/visual/pits-spring-scripted.cjs, "a parry that wins a Disarm".)
test('a Disarm still to be drawn keeps the weapon in the hand (it is thrown once, at the wrench)',()=>{
  const st=fs.readFileSync(path.join(__dirname,'..','experiments','pits-stage.js'),'utf8');
  assert(/comingDisarm=!!\(V\.busy&&Array\.isArray\(V\.events\)&&V\.events\.slice\(V\.step\|\|0\)\.some\(e=>e&&!e\.roll&&e\.title==='Disarm Opponent'&&e\.meta&&e\.meta\.target===id\)\)/.test(st),
    'the sync looks ahead for a Disarm of this fighter in the playback');
  assert(/f\.armedSeen&&\(heldDisarm\|\|waitingNow\|\|comingDisarm\)\)f\.look\.armed=true/.test(st),'and keeps the weapon drawn until then');
});

console.log(passed+' passed');
