// The cinematic movement of the Pits (experiments/pits-cine.js), driven the way the stage drives it and checked
// without a browser. What is held here is what the picture must never get wrong, whatever the choreography: the
// weapon really arrives where the stage puts its sparks and numbers, bodies stay possible and on the floor, the two
// never stand in each other, a declared action is held still, the dice decide who is on the ground and who has lost,
// and the same bout replays the same way. Whether it looks good is for the owner's eye (owner, 2026-11-15).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../experiments/pits-cine.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const WK={sword:{kind:'blade',len:92},dagger:{kind:'blade',len:50},rapier:{kind:'blade',len:112,thin:1},shortsword:{kind:'blade',len:68},
  mace:{kind:'club',len:70},axe:{kind:'axe',len:84},spear:{kind:'spear',len:150},greatsword:{kind:'blade',len:130},pike:{kind:'spear',len:230},
  halberd:{kind:'polearm',len:176},quarterstaff:{kind:'staff',len:132},flail:{kind:'chain',len:84},whip:{kind:'whip',len:150},
  net:{kind:'net',len:70},'battleaxe-2h':{kind:'axe',len:90,two:1},'great-hammer':{kind:'club',len:118},trident:{kind:'trident',len:150}};
const LOCS=['head','chest','abdomen','rarm','larm','rleg','lleg'];
const OUT=['wound','armour','zero','parried','full-parry','full-ward','partial-parry','partial-ward','miss','evaded','fumble'];
const seed=n=>{let a=n|0;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return Math.hypot(p[0]-(a[0]+vx*u),p[1]-(a[1]+vy*u));};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
C.keep(0);                                           // the tests look back over a whole bout
function pair(wa,wb,n,shields){
  seed(n||1);
  const M={a:C.fighter('a',WK[wa],false,{shield:!!(shields&&shields.a),shieldKey:shields&&shields.a}),
    b:C.fighter('b',WK[wb],false,{shield:!!(shields&&shields.b),shieldKey:shields&&shields.b})};
  const g=C.gap(WK[wa],WK[wb],'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
  return M;
}
// a body that can exist: every bone its own length, nothing under the floor, every number a number
function possible(m,t,what){
  const j=C.joints(m,t),D=C.DIM;
  for(const k of ['P','M','S','Hd','E','Hn','oE','oHn','K','F','bK','bF','tip'])
    assert(Number.isFinite(j[k][0])&&Number.isFinite(j[k][1]),what+': '+k+' is not a number at '+t);
  for(const [a,b,len] of [['P','K',D.thigh],['K','F',D.shin],['P','bK',D.thigh],['bK','bF',D.shin],['wS','E',D.upper],['E','Hn',D.fore],['oS','oE',D.upper],['oE','oHn',D.fore]])
    assert(Math.abs(dist(j[a],j[b])-len)<.6,what+': '+a+'-'+b+' is '+dist(j[a],j[b]).toFixed(1)+' long at '+t);
  for(const k of ['F','bF','K','bK','P','Hn','oHn','Hd','tip'])assert(j[k][1]>=-1,what+': '+k+' is under the floor at '+t+' ('+j[k][1].toFixed(1)+')');
  return j;
}

test('every weapon can fight every outcome at every location: bodies possible, the blow lands where it is said to',()=>{
  let n=0;
  for(const wa of Object.keys(WK))for(const o of OUT)for(const loc of LOCS){
    const wb=['sword','dagger','spear','greatsword'][n%4],M=pair(wa,wb,++n,o.endsWith('ward')?{b:'heater'}:null);
    const lost=o==='wound'||o.startsWith('partial')?3+n%7:0;
    const r=C.blow(M,'a',100,{outcome:o,loc,lost,shield:o.endsWith('ward'),prone:o==='evaded'});
    const what=wa+' against '+wb+', '+o+' at the '+loc;
    assert(Number.isFinite(r.end)&&r.end>100&&r.end<100+4000,what+': ends at '+r.end);
    assert(r.contacts.length>=1,what+': no contact');
    let last=0;for(const c of r.contacts){
      assert(c.t>=last&&c.t>100&&c.t<=r.end,what+': contact out of order');last=c.t;
      // the stage puts its effects at c.at when the clock reaches c.t: the weapon (or the shield) must be there
      const j=C.joints(M.a,c.t),d=seg(c.at,j.Hn,j.tip);
      assert(d<3,what+': the weapon is '+d.toFixed(1)+' from its '+c.kind+' contact');
    }
    for(let t=100;t<=r.end+200;t+=20){possible(M.a,t,what+' (attacker)');possible(M.b,t,what+' (defender)');}
  }
  assert(n>1000);
});

test('a blow lands at the height of its location, and a left arm is the weapon arm of a left-handed fighter',()=>{
  // (moved from the retired pose stage's aim test: the contact height follows the location on the rig the page draws)
  for(const w of ['sword','spear','dagger','greatsword']){
    const y={};
    for(const loc of ['head','chest','abdomen','lleg']){
      const M=pair(w,'sword',7);const r=C.blow(M,'a',100,{outcome:'wound',loc,lost:3});
      y[loc]=r.contacts.find(c=>c.kind==='hit').at[1];
    }
    assert(y.head>y.chest&&y.chest>y.abdomen&&y.abdomen>y.lleg,w+': contact heights '+JSON.stringify(y));
  }
  // arms are role based: a left-handed defender's left arm is its weapon arm, a right-handed one's is its off arm
  for(const swap of [false,true]){
    seed(3);
    const M={a:C.fighter('a',WK.sword,false,{}),b:C.fighter('b',WK.sword,swap,{})};
    const g=C.gap(WK.sword,WK.sword,'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
    const hit=C.blow(M,'a',100,{outcome:'wound',loc:'larm',lost:3}).contacts.find(c=>c.kind==='hit'),j=C.joints(M.b,hit.t);
    const weaponArm=dist(hit.at,j.E)<dist(hit.at,j.oE);
    assert.equal(weaponArm,swap,(swap?'left':'right')+'-handed: the left arm is '+(weaponArm?'the weapon':'the off')+' arm');
  }
});

test('the two never stand in each other, and a blow never jumps',()=>{
  let n=0;
  for(const [wa,wb] of [['sword','sword'],['dagger','sword'],['sword','spear'],['greatsword','dagger'],['spear','halberd'],['mace','rapier']])
  for(const o of ['wound','parried','miss','armour','partial-parry'])for(const loc of LOCS){
    const M=pair(wa,wb,++n);const r=C.blow(M,'a',100,{outcome:o,loc,lost:o==='wound'?4+n%5:o==='partial-parry'?2:0});
    const what=wa+' against '+wb+', '+o+' at the '+loc;
    let prev=null;
    for(let t=96;t<=r.end;t+=4){
      const a=C.joints(M.a,t),b=C.joints(M.b,t);
      assert(b.P[0]-a.P[0]>80,what+': the hips are '+(b.P[0]-a.P[0]).toFixed(0)+' apart at '+(t-100));
      if(prev)for(const [x,y] of [[a,prev.a],[b,prev.b]])for(const k of ['P','Hd','F','bF'])
        assert(dist(x[k],y[k])<46,what+': '+k+' jumps '+dist(x[k],y[k]).toFixed(0)+' in 4 ms at '+(t-100));
      prev={a,b};
    }
  }
});

test('a wound throws the struck fighter back, harder for a bigger wound; armour barely moves it',()=>{
  const back=(o,lost)=>{const M=pair('sword','sword',5);const x0=C.joints(M.b,100).P[0];C.blow(M,'a',100,{outcome:o,loc:'chest',lost});
    let far=0;for(let t=100;t<1400;t+=20)far=Math.max(far,C.joints(M.b,t).P[0]-x0);return far;};
  const small=back('wound',2),big=back('wound',9),arm=back('armour',0);
  assert(small>40,'a small wound moves the struck fighter '+small.toFixed(0));
  assert(big>small+40,'a big wound ('+big.toFixed(0)+') against a small one ('+small.toFixed(0)+')');
  assert(arm<small*.6,'armour: '+arm.toFixed(0));
});

test('the blow that ends the fight leaves the loser flat and the winner on its feet',()=>{
  for(const [wa,loc,n] of [['sword','chest',1],['sword','head',2],['sword','lleg',3],['dagger','abdomen',4],['spear','chest',5],['greatsword','head',6],['mace','rarm',7],['sword','chest',8],['sword','chest',9]]){
    const M=pair(wa,'sword',n);const r=C.blow(M,'a',100,{outcome:'wound',loc,lost:9,defeated:true});
    const a=C.joints(M.a,r.end+50),b=C.joints(M.b,r.end+50);
    assert(b.P[1]<22&&b.Hd[1]<40,wa+' at the '+loc+': the loser is not down (hips '+b.P[1].toFixed(0)+', head '+b.Hd[1].toFixed(0)+')');
    assert(a.P[1]>60&&a.Hd[1]>130,wa+' at the '+loc+': the winner is not standing (hips '+a.P[1].toFixed(0)+')');
    // and it stays that way: nothing the stage asks for afterwards moves the loser
    const e=C.lower(M.a,r.end+60);C.fall(M.b,r.end+60);
    assert(C.joints(M.b,e+2000).P[1]<22,'the loser gets up again');
    assert(r.end-100>900,'the last blow is over in '+(r.end-100)+' ms: it should be held');
  }
});

test('a declared action is drawn, then held completely still until the blow is resolved',()=>{
  for(const [wa,kind] of [['sword','attack'],['dagger','attack'],['spear','attack'],['greatsword','attack'],['sword','parry'],['sword','evade'],['halberd','parry']]){
    const M=pair(wa,'sword',3),m=M.a;const before=C.joints(m,100);
    const e=C.intent(m,100,kind,.5);
    assert(e>100&&e<100+400,wa+' '+kind+': the declared action takes '+(e-100)+' ms');
    const at=C.joints(m,e),later=C.joints(m,e+5000);
    assert(dist(before.Hn,at.Hn)>12||dist(before.P,at.P)>8,wa+' '+kind+': nothing moved');
    for(const k of ['P','Hd','Hn','tip','F','bF'])assert(dist(at[k],later[k])<.01,wa+' '+kind+': '+k+' drifts while held');
    possible(m,e,wa+' '+kind);
  }
  // the blow then starts from the held pose (no jump) and lands soon
  const M=pair('sword','sword',4);const e=C.intent(M.a,100,'attack',.5),held=C.joints(M.a,e+3000);
  const r=C.blow(M,'a',e+3000,{outcome:'wound',loc:'chest',lost:4});
  const j=C.joints(M.a,e+3004);for(const k of ['P','Hn','tip'])assert(dist(held[k],j[k])<14,'the blow jumps out of the hold ('+k+')');
  assert(r.tc-(e+3000)<260,'a declared blow lands '+(r.tc-(e+3000))+' ms after it is resolved');
});

test('a successful evade ends on the ground when the rules say so, and Regain Footing gets up',()=>{
  const M=pair('sword','sword',6);const r=C.blow(M,'a',100,{outcome:'evaded',loc:'chest',lost:0,prone:true});
  assert.equal(r.contacts[0].kind,'miss');
  const j=C.joints(M.b,r.end+100);assert(j.P[1]<30,'the evader is not down: hips '+j.P[1].toFixed(0));
  // the blade never touched the evader
  for(let t=100;t<=r.end;t+=6){const a=C.joints(M.a,t),b=C.joints(M.b,t);for(const k of ['Hd','S','P'])assert(seg(b[k],a.Hn,a.tip)>6,'the blade passes through the evader at '+(t-100));}
  // down, it still fights (the rules let it): attacks and parries from the ground, and stays down
  const r2=C.blow(M,'b',r.end+500,{outcome:'parried',loc:'chest',lost:0});
  assert(C.joints(M.b,r2.end+100).P[1]<45,'attacking from the ground stood the fighter up');
  const e=C.stand(M.b,r2.end+300);assert(C.joints(M.b,e+50).P[1]>55,'Regain Footing did not get up');
  // a leg that goes, or a trip, puts the struck fighter down; a plain wound does not
  const M2=pair('sword','sword',7);const r3=C.blow(M2,'a',100,{outcome:'wound',loc:'rleg',lost:5,fall:true});
  assert(C.joints(M2.b,r3.end+100).P[1]<30,'a fall did not put the fighter down');
  const M3=pair('sword','sword',8);const r4=C.blow(M3,'a',100,{outcome:'wound',loc:'rleg',lost:5});
  assert(C.joints(M3.b,r4.end+100).P[1]>45,'a wound without a fall put the fighter on the ground');
});

test('a whole bout, any order: nobody comes back to the same stance twice running, and it replays the same',()=>{
  const script=[['a','parried','head',0],['b','wound','chest',3],['a','miss','abdomen',0],['b','evaded','head',0],['a','armour','rarm',0],['b','partial-parry','lleg',2],
    ['a','wound','abdomen',6],['b','fumble','chest',0],['a','full-parry','chest',0],['b','wound','head',8]];
  const run=()=>{const M=pair('sword','sword',11);let t=100;const ends=[],snaps=[];
    for(const [who,o,loc,lost] of script){const r=C.blow(M,who,t,{outcome:o,loc,lost,flow:true});ends.push(r.end);t=r.end;
      snaps.push(C.joints(M.a,r.end).P.concat(C.joints(M.b,r.end).tip));
      for(let u=t-200;u<=t;u+=20){possible(M.a,u,'bout');possible(M.b,u,'bout');}}
    return {M,ends,snaps,t};};
  const one=run(),two=run();
  assert.deepEqual(one.ends,two.ends);assert.deepEqual(one.snaps,two.snaps);
  // (the two are still facing each other and in reach of the picture)
  const a=C.joints(one.M.a,one.t+800),b=C.joints(one.M.b,one.t+800);assert(b.P[0]>a.P[0]+80&&b.P[0]-a.P[0]<900);
  // ready stances: after two unhurt exchanges a fighter is not standing as it started
  const M=pair('sword','sword',12);const g0=C.joints(M.a,50);
  const r=C.blow(M,'a',100,{outcome:'parried',loc:'chest',lost:0});const g1=C.joints(M.a,r.end+50);
  const r2=C.blow(M,'a',r.end+400,{outcome:'parried',loc:'chest',lost:0});const g2=C.joints(M.a,r2.end+50);
  assert(dist(g0.Hn,g1.Hn)+Math.abs(g0.w-g1.w)>10,'back in the opening guard after the first exchange');
  assert(dist(g1.Hn,g2.Hn)+Math.abs(g1.w-g2.w)>10,'the same stance twice running');
});

test('the rest of what the stage asks for: range, Press Advantage, a yield, a snap to the result',()=>{
  const M=pair('sword','sword',9);
  const x0=C.joints(M.b,100).P[0]-C.joints(M.a,100).P[0];
  const g=C.gap(WK.sword,WK.sword,'apart');const e=Math.max(C.recover(M.a,100,g),C.recover(M.b,100,g));
  const x1=C.joints(M.b,e+50).P[0]-C.joints(M.a,e+50).P[0];
  assert(x1>x0+120,'breaking apart did not open the range ('+x0.toFixed(0)+' to '+x1.toFixed(0)+')');
  const s=C.gap(WK.sword,WK.sword,'short');const e2=Math.max(C.recover(M.a,e+100,s),C.recover(M.b,e+100,s));
  assert(C.joints(M.b,e2+50).P[0]-C.joints(M.a,e2+50).P[0]<x0,'closing did not close the range');
  const e3=C.press(M.a,M.b,e2+100);for(let t=e2+100;t<=e3+100;t+=20){possible(M.a,t,'press');possible(M.b,t,'press');}
  const e4=C.yieldTo(M.b,e3+200);assert(C.joints(M.b,e4+50).P[1]<50,'a yield is not drawn low');
  // Show results: each is put where the engine says, at once
  C.place(M.a,e4+100,C.gap(WK.sword,WK.sword,'long'),'low');C.place(M.b,e4+100,C.gap(WK.sword,WK.sword,'long'),'lying');
  assert(C.joints(M.b,e4+200).P[1]<22&&C.joints(M.a,e4+200).P[1]>60);
  // what the stage draws: joints in the fighter's own frame around m.hx
  const j=C.pose(M.a,e4+200,{}),w=C.joints(M.a,e4+200);
  assert(Math.abs(M.a.hx+M.a.face*j.Hd[0]-w.Hd[0])<.01&&Math.abs(j.Hd[1]-w.Hd[1])<.01);
  // a disabled arm hangs
  const limp=C.pose(M.a,e4+200,{weapon:true});assert(limp.Hn[1]<limp.wS[1]-40,'a disabled weapon arm does not hang');
});

test('the Pits page uses the cinematic stage for every route',()=>{
  const read=f=>fs.readFileSync(path.join(__dirname,'..','experiments',f),'utf8');
  const page=read('practice-combat.html'),stage=read('pits-stage.js');
  const at=n=>page.indexOf('src="'+n+'?v=');
  assert(at('pits-cine.js')>0&&at('pits-cine-fx.js')>at('pits-cine.js')&&at('pits-stage.js')>at('pits-cine-fx.js'),'the page loads the movement, its picture, then the stage');
  assert(/href="pits-cine\.css\?v=/.test(page),'the page loads the look');
  for(const old of ['pits-spring-live.js','pits-spring.js','pits-motion.js','pits-writer.js'])assert.equal(at(old),-1,old);
  assert.match(stage,/const PL=\(\)=>PitsCine;/);
});
console.log(passed+' passed');
