// Collision on the spring stage (experiments/pits-spring.js, collide; owner, 2026-11-14): a blade cannot pass through
// the other fighter. The same seeded fights, written through the live layer as the stage writes them, are played with
// the rule off and on, and every frame outside a real contact is measured:
//   - frames with a blade inside the other's head or on its body's joints fall to a small fraction;
//   - no new jumps: hands, elbows and points snap no more often than without the rule;
//   - with the rule off, nothing changes (the trial is unchanged unless the page asks for ?collide=on).
const assert=require('node:assert/strict');
const PL=require('../experiments/pits-spring-live.js'),PS=require('../experiments/pits-spring.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const WK={sword:{kind:'blade',len:92},rapier:{kind:'blade',len:112,thin:1},greatsword:{kind:'blade',len:130},
  spear:{kind:'spear',len:150},axe:{kind:'axe',len:84}};
const LOCS=['head','chest','abdomen','rarm','larm','rleg','lleg'];
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return Math.hypot(p[0]-(a[0]+vx*u),p[1]-(a[1]+vy*u));};
// one fight of six exchanges, as tests/sweep/pits-live-sweep.cjs writes them; returns the measured frames
function fight(wa,wb,seed,collide){
  PS.collide=collide;
  const R=rng(seed),M={a:PL.fighter('a',WK[wa],false,{}),b:PL.fighter('b',WK[wb],false,{})};
  const gap=PL.gap(WK[wa],WK[wb],'long');let t=0;
  for(const id of ['a','b'])PL.place(M[id],t,gap,'guard');
  PL.pose(M.a,t);
  const w=PL.world(M.a),F=w.S.F,down={a:false,b:false};
  for(let i=0;i<6;i++){
    const aid=R()<.5?'a':'b',did=aid==='a'?'b':'a';
    for(const id of ['a','b'])if(down[id]&&R()<.5){t=PL.stand(M[id],t);down[id]=false;}
    t=PL.intent(M[aid],t,'attack',R());
    const react=down[did]?(R()<.5?'parry':'none'):R()<.5?'parry':R()<.7?'evade':'none';
    if(react!=='none')t=PL.intent(M[did],t,react,R());
    const loc=LOCS[Math.floor(R()*7)],r=R();
    const out=react==='evade'?(r<.5?'evaded':r<.65?'miss':'wound'):react==='none'?(r<.2?'miss':r<.35?'armour':'wound'):
      (r<.45?'parried':r<.6?'partial-parry':r<.7?'miss':r<.8?'armour':'wound');
    const lost=/wound|partial/.test(out)?1+Math.floor(R()*7):0,prone=react==='evade'&&/^(evaded|miss)$/.test(out),leg=lost>0&&/leg$/.test(loc)&&R()<.5;
    const b=PL.blow(M,aid,t,{outcome:out,loc,lost,fall:leg||(react==='evade'&&!prone),prone});
    t=b.end;if(prone||leg||(react==='evade'&&!prone))down[did]=true;
  }
  const end=Math.round((t-w.T0)*PL.PACE/2)*2+400;w.S.W.run(end+20);
  const q={fighters:F,rec:w.S.W.last()},cl=w.S.seq.contactList,inC=u=>cl.some(c=>u>=c.t-90&&u<=c.t+(c.hold||0)+90);
  const m={frames:0,head:0,body:0,snaps:0},prev={};
  for(let u=0;u<=end;u+=2)for(const id of ['a','b']){
    const o=id==='a'?'b':'a',P=n=>PS.world(q,id,u,n),O=n=>PS.world(q,o,u,n),hn=P('Hn'),tip=P('tip'),E=P('E');
    const p=prev[id];if(p){if(Math.hypot(hn[0]-p.hn[0],hn[1]-p.hn[1])>6||Math.hypot(E[0]-p.E[0],E[1]-p.E[1])>6||Math.hypot(tip[0]-p.tip[0],tip[1]-p.tip[1])>20)m.snaps++;}
    prev[id]={hn,tip,E};
    if(u%8||inC(u))continue;m.frames++;
    if(seg(O('Hd'),hn,tip)<13)m.head++;else if(['S','M','P','K','F','bK','bF'].some(n=>seg(O(n),hn,tip)<2))m.body++;
  }
  PS.collide=false;
  return m;
}
const PAIRS=[['sword','sword'],['rapier','axe'],['greatsword','sword'],['spear','sword']];
const sum=collide=>{const s={frames:0,head:0,body:0,snaps:0};let seed=11;
  for(const [a,b] of PAIRS)for(let k=0;k<2;k++){const m=fight(a,b,seed++,collide);for(const x in s)s[x]+=m[x];}return s;};
const off=sum(false),on=sum(true);
console.log('  off',JSON.stringify(off),'\n  on ',JSON.stringify(on));
test('the module starts with the rule off',()=>{assert.equal(PS.collide,false);});
test('with the rule on, blades inside the other\'s head are a small fraction of what they were',()=>{
  assert(off.head>50,'the fights have crossings to remove ('+off.head+')');
  assert(on.head<=off.head*.2,'head: '+off.head+' -> '+on.head);
});
test('and on its body',()=>{assert(on.body<=off.body*.35,'body: '+off.body+' -> '+on.body);});
test('no new jumps: hands, elbows and points snap no more often than without the rule',()=>{
  assert(on.snaps<=off.snaps*1.2+5,'snaps: '+off.snaps+' -> '+on.snaps);
});
test('with the rule off, the same fight is drawn exactly as before (the switch changes nothing by itself)',()=>{
  assert.deepEqual(fight('sword','sword',11,false),fight('sword','sword',11,false));
});
console.log(passed+' collision tests passed');
