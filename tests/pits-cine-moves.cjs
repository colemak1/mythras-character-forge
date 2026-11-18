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
  assert(/const isDisarm=e=>e&&!e\.roll&&e\.title==='Disarm Opponent'&&e\.meta&&e\.meta\.target===id;/.test(st),'a Disarm of this fighter');
  assert(/comingDisarm=!!\(V\.busy&&Array\.isArray\(V\.events\)&&\(carried\|\|V\.events\.slice\(V\.step\|\|0\)\.some\(isDisarm\)\)\)/.test(st),
    'the sync looks ahead for a Disarm of this fighter in the playback');
  // (and back, on the cinematic stage, to a Disarm earlier in the exchange that the blow being played carries, report
  // 20261118-212902: the weapon flew twice)
  assert(/if\(isDisarm\(e\)\)\{carried=true;break;\}/.test(st),'and back to a Disarm its blow carries');
  assert(/f\.armedSeen&&\(heldDisarm\|\|waitingNow\|\|comingDisarm\)\)f\.look\.armed=true/.test(st),'and keeps the weapon drawn until then');
});

// Impale (owner, 2026-11-16: "it doesn't get stuck in the wound immediately, the swing happens then the blade teleports
// to the wound"): the point stays in the wound from the contact; the hand opens there (left in) or stays (kept hold).
test('Impale: the point stays in the wound after the contact; the hand lets go, or keeps hold',()=>{
  for(const w of ['rapier','spear','sword','dagger'])for(const [how,held,defeated] of [['left in',false,false],['kept hold',true,false],['finishing',false,true],['finishing, held',true,true]]){
    const M=pair(w,'sword',.4),what=w+' impale, '+how,t=100;
    const r=C.blow(M,'a',t,{outcome:'wound',loc:'chest',lost:defeated?12:5,impale:true,held,defeated});C.fixChoices(null);
    const tc=r.contacts[r.contacts.length-1].t;
    possible(M.a,tc,what);possible(M.b,tc,what);
    // the point is still near the wound a moment later (not drawn through and away)
    const tip0=C.joints(M.a,tc).tip,tip1=C.joints(M.a,tc+60).tip;
    assert(dist(tip0,tip1)<30,what+': the point moves '+dist(tip0,tip1).toFixed(0)+' in 60 ms after the contact');
    if(held&&!defeated)assert.equal(r.release,null,what+': kept hold, the hand does not open');
    else{assert(r.release>tc&&r.release<tc+700,what+': the hand opens after the contact ('+r.release+')');}
    if(defeated){assert.equal(r.finish,'impale',what);assert(M.b.down,what+': the struck fighter goes down');}
    for(let x=t;x<=r.end;x+=8){possible(M.a,x,what);possible(M.b,x,what);}
  }
});
test('the stage draws the Impale at its contact and lets go at the release',()=>{
  const st=fs.readFileSync(path.join(__dirname,'..','experiments','pits-stage.js'),'utf8');
  assert(/impale:!!impale&&lost>0&&!strike,held:!!\(impale&&impale\.held\)/.test(st),'the blow is told it impales, and whether it is kept hold of');
  assert(/PS\.lodgeAhead\[def\.id\]=\{loc,weapon:/.test(st),'the weapon is drawn in the wound from the contact');
  assert(/if\(r\.release&&PS\.lodgeAhead\[def\.id\]\)\{await psUntil\(r\.release\);/.test(st),'and let go at the release');
});

// Finishes chosen by the final blow's Special Effect (owner, 2026-11-16: "go for it" on Bash, Stun Location, Bleed and
// Choose Location by the part; then "do disarm and trip finishes next"). Each: bodies stay possible and on the floor, nothing jumps, the struck fighter ends down,
// and the effect names the finish.
test('a finishing blow takes its finish from the Special Effect',()=>{
  const cases=[[['bash'],'chest','bashed'],[['stun'],'head','stunned'],[['bleed'],'abdomen','bled'],[['choose'],'head','headshot'],
    [['choose'],'rleg','legout'],[['choose'],'larm','armdrop'],[['choose'],'chest',null],[['bleed','bash'],'chest','bashed'],
    [['trip'],'chest','tripped'],[['disarm'],'chest','disarmed'],[['choose','disarm'],'head','disarmed'],[['trip','stun'],'head','tripped'],
    // (owner, 2026-11-16: "continue the finisher animations")
    [['circumvent'],'chest','slipped'],[['circumvent'],'head','slipped'],[['entangle'],'rleg','yanked'],[['entangle'],'larm','yanked'],
    [['maximise'],'chest','cracked'],[['bypass'],'abdomen','cracked'],[['sunder'],'head','cracked'],[['blind'],'chest','blinded'],
    [['choose','maximise'],'head','headshot'],[['choose','sunder'],'chest','cracked'],[['bleed','blind'],'chest','bled']];
  for(const w of ['sword','rapier','greatsword','mace','spear'])for(const [fx,loc,want] of cases){
    const M=pair(w,'sword',.4),what=w+' '+fx.join('+')+' at the '+loc;
    const r=C.blow(M,'a',100,{outcome:'wound',loc,lost:12,defeated:true,fx});C.fixChoices(null);
    if(want)assert.equal(r.finish,want,what);else assert(!/bashed|stunned|bled|headshot|legout|armdrop|slipped|yanked|cracked|blinded/.test(r.finish),what+': no effect finish');
    assert(M.b.down,what+': the struck fighter ends down');
    if(want==='armdrop')assert(r.drop>r.contacts[0].t,what+': the weapon falls after the blow');else assert.equal(r.drop,null,what);
    let prev=null;
    for(let t=100;t<=r.end;t+=4){possible(M.a,t,what);possible(M.b,t,what);
      const b=C.joints(M.b,t);if(prev)for(const k of ['P','Hd'])assert(dist(b[k],prev[k])<46,what+': '+k+' jumps at '+t);prev=b;}
    // the two do not end in each other
    const ja=C.joints(M.a,r.end),jb=C.joints(M.b,r.end);
    assert(Math.abs(jb.Hd[0]-ja.F[0])>30&&Math.abs(jb.Hd[0]-ja.bF[0])>20,what+': the fallen head is not at the winner\'s feet');
    // nor does the winner stand on the fallen body (owner, 2026-11-16, the trip finish)
    for(const dt of [600,900,1200])if(100+dt<r.end){const a2=C.joints(M.a,r.contacts[0].t+dt),b2=C.joints(M.b,r.contacts[0].t+dt);
      if(b2.P[1]>30)continue;const xs=[b2.F[0],b2.bF[0],b2.Hd[0],b2.P[0]],lo=Math.min(...xs)+8,hi=Math.max(...xs)-8;
      for(const k of ['F','bF'])assert(!(a2[k][0]>lo&&a2[k][0]<hi),what+': the winner\'s foot is on the fallen body at +'+dt);}
  }
});

// Circumvent Parry: the feint draws the guard to the other line before the blow lands, and the guard is still up as
// the fighter goes down. Drawn only for a hit straight in, both standing; otherwise another finish.
test('Circumvent Parry: the guard is drawn to the other line, and stays up as the fighter falls',()=>{
  for(const w of ['sword','greatsword','mace','spear'])for(const loc of ['head','chest','rleg']){
    const M=pair(w,'sword',.4),what=w+' at the '+loc;
    const r=C.blow(M,'a',100,{outcome:'wound',loc,lost:12,defeated:true,fx:['circumvent']});C.fixChoices(null);
    assert.equal(r.finish,'slipped',what);
    const tc=r.contacts[0].t,b=C.joints(M.b,tc),hip=b.P[1],hand=b.Hn[1];
    // a high blow: the guard is low (the hand near the hips' height); otherwise it is high (by the head)
    if(loc==='head')assert(hand<hip+30,what+': the guard is low at the contact ('+hand.toFixed(0)+' vs hip '+hip.toFixed(0)+')');
    else assert(hand>b.Hd[1]-40,what+': the guard is high at the contact ('+hand.toFixed(0)+' vs head '+b.Hd[1].toFixed(0)+')');
    // still up on the knees (the weapon hand above the hip)
    const k=C.joints(M.b,tc+800);assert(k.Hn[1]-k.P[1]>-20,what+': the guard is still up on the knees');
  }
  // not for a fighter already down
  const M=pair('sword','sword',.4);C.fall(M.b,50);
  const r=C.blow(M,'a',900,{outcome:'wound',loc:'chest',lost:12,defeated:true,fx:['circumvent']});C.fixChoices(null);
  assert.notEqual(r.finish,'slipped','a fighter already down');
});
test('a heavy blow (Maximise, Bypass Armour, Sunder) asks for the armour to crack at the blow',()=>{
  const M=pair('mace','sword',.4);
  const r=C.blow(M,'a',100,{outcome:'wound',loc:'chest',lost:12,defeated:true,fx:['sunder']});C.fixChoices(null);
  const got=C.takeFx(M.a).filter(e=>e.kind==='crack');
  assert.equal(got.length,1,'one crack');assert.equal(got[0].id,'b');assert(Math.abs(got[0].t-r.contacts[0].t)<2,'at the contact');
});
test("the stage maps the engine's effect names and a blinded loser",()=>{
  const st=fs.readFileSync(path.join(__dirname,'../experiments/pits-stage.js'),'utf8');
  for(const n of ['Circumvent Parry','Entangle','Maximise Damage','Bypass Armour','Sunder'])assert(st.includes("'"+n+"':"),n);
  assert(/psBlinded\(def\.id\)\?\['blind'\]/.test(st),'a blinded loser');
  const fxs=fs.readFileSync(path.join(__dirname,'../experiments/pits-cine-fx.js'),'utf8');
  assert(/e\.kind==='crack'/.test(fxs),'the picture draws the crack');
});

console.log(passed+' passed');
