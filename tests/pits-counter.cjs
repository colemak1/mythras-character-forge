// The Pits: a defender's Disarm or Trip drawn as one movement with the blow it answers (owner, 2026-11-18: "a miss that
// gets parried successfully and then disarm should look like a missed swing then the defender swipes the blade out of
// their hand, all in one single motion ... a hit and critical parry ... should look like a parry where you also get the
// effect"). What is held here: bodies stay possible and apart, the counter's contact is where it should be and comes
// straight after the miss or the parry, a long weapon sweeps, and the stage carries the counter in the blow's record and
// gives its own Trip or Disarm beat no movement. How it looks is for the owner's eye (tests/visual/pits-cine-sheet.cjs,
// a case with `counter`).
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const C=require('../experiments/pits-cine.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
C.keep(0);
const WK={sword:{kind:'blade',len:92},dagger:{kind:'blade',len:50},mace:{kind:'club',len:70},spear:{kind:'spear',len:150},
  greatsword:{kind:'blade',len:130,hands:2},halberd:{kind:'polearm',len:176},quarterstaff:{kind:'staff',len:132}};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return Math.hypot(p[0]-(a[0]+vx*u),p[1]-(a[1]+vy*u));};
function pair(wa,wb,u){
  C.fixChoices(u);
  const M={a:C.fighter('a',WK[wa],false,{}),b:C.fighter('b',WK[wb],false,{})};
  M.a.pair.seed=11;   // (the stage gives the pair the bout's seed)
  const g=C.gap(WK[wa],WK[wb],'even');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
  return M;
}
function possible(m,t,what){
  const j=C.joints(m,t),D=C.DIM;
  for(const [a,b,len] of [['P','K',D.thigh],['K','F',D.shin],['P','bK',D.thigh],['bK','bF',D.shin],['wS','E',D.upper],['E','Hn',D.fore]])
    assert(Math.abs(dist(j[a],j[b])-len)<.6,what+': '+a+'-'+b+' is '+dist(j[a],j[b]).toFixed(1)+' long at '+t);
  for(const k of ['F','bF','P','Hn','Hd'])assert(j[k][1]>=-1,what+': '+k+' is under the floor at '+t);
}
function sound(M,t0,t1,what){
  let prev=null;
  for(let t=t0;t<=t1;t+=4){
    possible(M.a,t,what);possible(M.b,t,what);
    const a=C.joints(M.a,t),b=C.joints(M.b,t);
    assert(b.P[0]-a.P[0]>60,what+': the hips are '+(b.P[0]-a.P[0]).toFixed(0)+' apart at '+(t-t0));
    if(prev)for(const [x,y] of [[a,prev.a],[b,prev.b]])for(const k of ['P','Hd','F','bF'])
      assert(dist(x[k],y[k])<46,what+': '+k+' jumps '+dist(x[k],y[k]).toFixed(0)+' in 4 ms at '+(t-t0));
    prev={a,b};
  }
}
// the blow by 'a', then the counter by 'b' from the blow's first contact, as the stage writes it (psMotionBlow)
function exchange(wa,wb,u,kind,via,fell){
  const M=pair(wa,wb,u);
  const r=C.blow(M,'a',100,{outcome:via==='miss'?'miss':'parried',loc:'chest',key:'k'});
  const start=r.contacts[0].t+(via==='miss'?60:30);
  const rc=kind==='disarm'?C.counterDisarm(M,'b',start,{via,key:'k'}):C.trip(M,'b',start,{fell,after:true,counter:true,key:'k'});
  C.fixChoices(null);
  return {M,r,rc,start};
}

test('a defender\'s Disarm after a miss or out of a parry: one movement, the contact on the weapon hand',()=>{
  for(const wa of ['sword','mace','dagger','spear'])for(const wb of ['sword','mace','spear','greatsword'])for(const via of ['miss','parry'])for(const u of [.1,.9]){
    const what=wb+' disarms '+wa+' ('+via+', u '+u+')',{M,r,rc,start}=exchange(wa,wb,u,'disarm',via);
    sound(M,100,rc.end+100,what);
    assert.equal(rc.contacts.length,1,what+': one contact');const c=rc.contacts[0];
    assert.equal(c.kind,'disarm');
    // straight on from the miss or the parry: no pause before the counter lands
    assert(c.t-r.contacts[0].t<=(via==='parry'?120:220),what+': the counter lands '+(c.t-r.contacts[0].t)+' ms after the '+via);
    const a=C.joints(M.a,c.t),b=C.joints(M.b,c.t);
    assert(dist(a.Hn,c.at)<30&&seg(c.at,a.Hn,a.tip)<4,what+': the contact is '+dist(a.Hn,c.at).toFixed(0)+' from the weapon hand, '+seg(c.at,a.Hn,a.tip).toFixed(0)+' off its weapon');
    assert(seg(c.at,b.Hn,b.tip)<12,what+': the defender\'s weapon is '+seg(c.at,b.Hn,b.tip).toFixed(0)+' from the contact');
    assert.equal(rc.move,via==='parry'?'beat':'strip');
  }
});

test('a defender\'s Trip after a miss or out of a parry: a hook, or a sweep with a long weapon; down if it worked',()=>{
  for(const wa of ['sword','mace'])for(const wb of ['sword','dagger','spear','halberd','quarterstaff'])for(const via of ['miss','parry'])for(const fell of [true,false]){
    const what=wb+' trips '+wa+' ('+via+(fell?'':', resisted')+')',{M,r,rc}=exchange(wa,wb,.5,'trip',via,fell);
    sound(M,100,rc.end+100,what);
    const c=rc.contacts[0];assert(c&&c.kind==='trip'&&c.at[1]<15,what+': the contact is not at the ankle');
    assert(c.t-r.contacts[0].t<=300,what+': the trip lands '+(c.t-r.contacts[0].t)+' ms after the '+via);
    assert.equal(rc.move,WK[wb].len>=130||WK[wb].hands===2?'sweep':'hook',what+': '+rc.move);
    const low=C.joints(M.a,rc.end+50).P[1];
    if(fell)assert(low<30&&M.a.down,what+': the trip that worked left the attacker up');else assert(low>50&&!M.a.down,what+': a resisted trip put the attacker down');
  }
});

test('the same exchange draws the same counter (a replay repeats it)',()=>{
  const j=x=>JSON.stringify(C.joints(x.M.b,x.rc.contacts[0].t));
  assert.equal(j(exchange('sword','sword',null,'disarm','miss')),j(exchange('sword','sword',null,'disarm','miss')));
});

// the stage: the engine logs the defender's effect before the blow it answered
function stage(){
  const ctx={console,JSON,location:{search:''},document:{querySelector:()=>null,querySelectorAll:()=>[]}};ctx.window=ctx;vm.createContext(ctx);
  for(const f of ['js/combat-rules.js','experiments/pits-cine.js','experiments/pits-stage.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
  return s=>vm.runInContext(s,ctx);
}
const N={a:'Kethan Voss',b:'Border Deserter'};
const ATTACK={id:1,title:'Kethan Voss attacks',body:'71 against Combat Style 67% — FAILURE.',kind:'roll',meta:{exid:1,actor:'a'}};
const PARRY={id:2,title:'Border Deserter parries',body:'20 vs 60% — SUCCESS. 1 AP remaining.',kind:'roll',meta:{actor:'b'}};
const NOHIT={id:9,title:'No Damaging Hit',body:"Kethan Voss's attack failed to connect.",kind:'system',meta:{actor:'a',px:{}}};
const beats=(run,ev)=>JSON.parse(run(`(()=>{const ev=pitsStageOrder(${JSON.stringify(ev)},${JSON.stringify(N)});
  return JSON.stringify(ev.map((e,i)=>{const b=pitsStageBeat(ev,i,${JSON.stringify(N)});return b.cue?{id:e.id,type:b.cue.type,consumed:b.consumed,counter:b.cue.record?b.cue.record.counter:undefined,trip:b.cue.record?b.cue.record.trip:undefined}:null;}).filter(Boolean));})()`));

test('the stage carries a defender\'s Disarm in the blow it answered, and the Disarm beat has no movement of its own',()=>{
  const run=stage();assert.equal(run('PS_CINE'),true);
  const ev=[ATTACK,PARRY,{id:5,title:'Disarm Opponent',body:"Kethan Voss's Broadsword lands 2m away.",kind:'hit',meta:{actor:'b',target:'a'}},NOHIT];
  const b=beats(run,ev),blow=b.find(x=>x.type==='deflect'),dis=b.find(x=>x.type==='disarm');
  assert.deepEqual(blow.counter,{kind:'disarm',actor:'b',metres:2});assert.equal(dis.consumed,true);
});

test('the stage carries a defender\'s Trip in the blow it answered, its dice first, and the Trip beat has no movement',()=>{
  const run=stage();
  const ev=[ATTACK,PARRY,{roll:['a','Resist trip · Kethan Voss Brawn',[80]]},{id:6,title:'Trip Opponent',body:'Kethan Voss falls prone.',kind:'hit',meta:{actor:'b'}},NOHIT];
  const ordered=JSON.parse(run(`JSON.stringify(pitsStageOrder(${JSON.stringify(ev)},${JSON.stringify(N)}).map(e=>e.id||'roll'))`));
  assert.deepEqual(ordered,[1,2,'roll',6,9],'the trip and its dice stay before the blow');
  const b=beats(run,ev),blow=b.find(x=>x.type==='deflect'),trip=b.find(x=>x.type==='trip');
  assert.deepEqual(blow.counter,{kind:'trip',actor:'b',fell:true});assert.equal(blow.trip,null,'not the attacker\'s trip');
  assert.equal(trip.consumed,true);
  // the attacker's own Trip is unchanged: the blow carries it as before, no counter
  const own=[{...ATTACK,body:'20 against Combat Style 67% — SUCCESS.'},{...PARRY,body:'90 vs 60% — FAILURE. 1 AP remaining.'},
    {id:6,title:'Trip Opponent',body:'Border Deserter falls prone.',kind:'hit',meta:{actor:'a'}},{...NOHIT,body:''}];
  const ob=beats(run,own).find(x=>x.type==='deflect');assert.equal(ob.counter,null);assert.equal(ob.trip.actor,'a');
});

test('psMotionBlow: a failed attack with a counter is drawn as a miss, and the counter follows from its first contact',()=>{
  const st=fs.readFileSync(path.join(root,'experiments/pits-stage.js'),'utf8');
  assert.match(st,/const via=!counter\?null:evading\?'evade':aGrade!=null&&aGrade<2\?'miss':'parry';/);
  assert.match(st,/const bOut=via==='miss'&&\/\^\(parried\|full-parry\|full-ward\)\$\/\.test\(out\)\?'miss':out;/);
  assert.match(st,/psCineBlow\(atk\.id,\{outcome:bOut,/);
  assert.match(st,/const start=via==='evade'\?r\.end:\(r\.contacts\.length\?r\.contacts\[0\]\.t:r\.tc\)\+\(via==='miss'\?60:30\);/);
  // (the old fly at the parry contact does not also throw the weapon)
  assert.match(st,/if\(disarm&&!flown&&!counter&&/);
});

console.log(passed+' passed');
