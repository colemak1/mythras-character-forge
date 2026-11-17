// The Pits: flexible weapons (batch (d), 2026-11-17). A flail's chain, a whip's lash and a net are drawn as a rope
// (experiments/pits-flex.js) that hangs at rest, trails a fast swing and lands on every contact; a flail is whirled
// over the head before its blow (experiments/pits-cine.js).
const assert=require('node:assert/strict');
const X=require('../experiments/pits-flex.js'),C=require('../experiments/pits-cine.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const W={flail:{kind:'chain',len:84},mflail:{kind:'chain',len:110,hands:2},whip:{kind:'whip',len:150},net:{kind:'net',len:70}};
const sword={kind:'blade',len:92};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const segs=st=>{const out=[];for(let i=1;i<st.pts.length;i++)out.push(dist(st.pts[i-1],st.pts[i]));return out;};

test('at rest a chain hangs from the handle, every link its length, nothing under the floor',()=>{
  for(const kind of ['chain','whip','net']){const len=kind==='whip'?150:84,c=X.cfg(kind),seg=(len-c.hl)/c.n;
    const st={},up=[.06,-Math.sqrt(1-.0036)];X.step(st,{kind,len,root:[0,0],dir:up,clk:0,floor:300});
    for(let t=16;t<3000;t+=16)X.step(st,{kind,len,root:[0,0],dir:up,clk:t,floor:300});
    // held upright, it falls over and hangs (y is down)
    assert(st.tip[1]!==undefined);const tip=st.pts[st.pts.length-1];
    assert(tip[1]>0,kind+': the end hangs below the hand at rest ('+tip[1].toFixed(0)+')');
    for(const d of segs(st))assert(Math.abs(d-seg)<seg*.03,kind+': a link stretched to '+d.toFixed(1)+' of '+seg.toFixed(1));
    for(const p of st.pts)assert(p[1]<=300.01);
  }
  // on the floor: a whip held low lies along it
  const st={};for(let t=0;t<2000;t+=16)X.step(st,{kind:'whip',len:150,root:[0,-40],dir:[1,0],clk:t,floor:0});
  assert(st.pts.every(p=>p[1]<=.01),'the lash goes through the floor');
  assert(st.pts.filter(p=>p[1]>-.5).length>=4,'the lash does not lie on the floor');
});
test('a held scene holds the rope: no step without the clock',()=>{
  const st={};let t=0;for(;t<400;t+=16)X.step(st,{kind:'chain',len:84,root:[0,0],dir:[Math.cos(t/60),Math.sin(t/60)],clk:t});
  const before=JSON.stringify(st.pts);for(let i=0;i<20;i++)X.step(st,{kind:'chain',len:84,root:[0,0],dir:[1,0],clk:t-16});
  // (the same clock again: nothing moves; a clock that goes back starts afresh, which is a replay)
  const st2={};let u=0;for(;u<400;u+=16)X.step(st2,{kind:'chain',len:84,root:[0,0],dir:[Math.cos(u/60),Math.sin(u/60)],clk:u});
  const b2=JSON.stringify(st2.pts);for(let i=0;i<20;i++)X.step(st2,{kind:'chain',len:84,root:[0,0],dir:[0,1],clk:u-16});
  assert.equal(JSON.stringify(st2.pts),b2);
  assert(before.length>0);
});
test('a fast swing: the whip tip trails the straight line, and is on it when pinned',()=>{
  const st={},len=150,ang=t=>-Math.PI/2+Math.PI*Math.min(1,t/160);   // a half turn in 160 ms
  let lag=0;
  for(let t=0;t<=160;t+=16){const a=ang(t);X.step(st,{kind:'whip',len,root:[0,0],dir:[Math.cos(a),Math.sin(a)],clk:t});
    const tip=st.pts[st.pts.length-1],T=X.rigid([0,0],[Math.cos(a),Math.sin(a)],len,X.cfg('whip'));lag=Math.max(lag,dist(tip,T[T.length-1]));}
  assert(lag>30,'the lash keeps up with the hand like a stick (lag '+lag.toFixed(0)+')');
  const a=ang(160),dir=[Math.cos(a),Math.sin(a)];X.step(st,{kind:'whip',len,root:[0,0],dir,clk:176,pin:1});
  const T=X.rigid([0,0],dir,len,X.cfg('whip'));assert(dist(st.pts[st.pts.length-1],T[T.length-1])<.5);
  assert.equal(X.pinAt([500],400),0);assert.equal(X.pinAt([500],500),1);assert.equal(X.pinAt([500],530),1);assert(X.pinAt([500],470)>0&&X.pinAt([500],470)<1);
  assert.equal(X.pinAt([500],700),0);
});
// The stage's way, frame by frame over real blows: the rope's root and line from the movement's joints, pinned on its
// contacts (pits-stage.js psFlex, psFlexHits)
function bout(wk,o,loc,u,each){
  C.fixChoices(u);const M={a:C.fighter('a',wk,false,{}),b:C.fighter('b',sword,false,{})},g=C.gap(wk,sword,'long');
  C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');C.intent(M.a,100,'attack',.5);
  const r=C.blow(M,'a',800,{outcome:o,loc,lost:o==='wound'?3:0});C.fixChoices(null);
  const st={},c=X.cfg(wk.kind),hits=r.contacts.map(k=>k.t),flip=p=>[p[0],-p[1]];
  for(let t=0;t<=r.end+200;t+=16){
    const ts=[t];for(const h of hits)if(h>t-16&&h<t)ts.unshift(h);   // (the stage waits for each contact's frame)
    for(const tt of ts.sort((x,y)=>x-y)){const j=C.joints(M.a,tt),Hn=flip(j.Hn),tip=flip(j.tip);
      let d=[tip[0]-Hn[0],tip[1]-Hn[1]];const l=Math.hypot(d[0],d[1])||1;d=[d[0]/l,d[1]/l];
      if(M.a.whirl&&tt>=M.a.whirl.t0&&tt<=M.a.whirl.t1){const v=(tt-M.a.whirl.t0)/(M.a.whirl.t1-M.a.whirl.t0),s=-4*Math.PI*v*v*(3-2*v),cs=Math.cos(s),sn=Math.sin(s);d=[d[0]*cs-d[1]*sn,d[0]*sn+d[1]*cs];}
      const root=[Hn[0]+d[0]*c.hl,Hn[1]+d[1]*c.hl];
      X.step(st,{kind:wk.kind,len:wk.len,root,dir:d,clk:tt,pin:X.pinAt(hits,tt),floor:0});
      each({t:tt,st,M,r,rigidTip:[Hn[0]+d[0]*wk.len,Hn[1]+d[1]*wk.len],hit:hits.includes(tt)});}
  }
  return r;
}
test('every flexible weapon lands its head on each contact, with no jump between frames',()=>{
  let n=0,worst=0,jump=0,rj=0;
  for(const wk of Object.values(W))for(const o of ['wound','parried','miss','partial-parry','armour'])for(const loc of ['head','chest','rleg'])for(const u of [.1,.6,.9]){
    let last=null,lastR=null;
    bout(wk,o,loc,u,({st,rigidTip,hit})=>{const tip=st.pts[st.pts.length-1];
      if(lastR)rj=Math.max(rj,dist(rigidTip,lastR));lastR=rigidTip.slice();
      st.pts.forEach((p,i)=>{assert(Number.isFinite(p[0])&&Number.isFinite(p[1]));if(i)assert(p[1]<=.01,'link '+i+' under the floor '+p[1].toFixed(1)+' (root '+st.pts[0][1].toFixed(1)+')');});
      if(hit){n++;worst=Math.max(worst,dist(tip,rigidTip));}
      if(last)jump=Math.max(jump,dist(tip,last));last=tip.slice();});
  }
  assert(n>100,'contacts seen: '+n);
  assert(worst<3,'a head is '+worst.toFixed(1)+' from its contact');
  console.log('  (largest step in a frame: rope head '+jump.toFixed(0)+', straight weapon '+rj.toFixed(0)+')');
  // (it never moves faster than the straight weapon it trails)
  assert(jump<=rj*1.05,'the head jumps '+jump.toFixed(0)+' in a frame, the straight weapon '+rj.toFixed(0));
});
test('a flail is whirled over the head before it comes down; a sword and a whip are not',()=>{
  const r=bout(W.flail,'wound','chest',.5,()=>{});assert(r.whirl&&r.whirl.t1-r.whirl.t0>=300,'no whirl');
  assert(r.whirl.t1<r.contacts[0].t,'the whirl runs into the blow');
  // during the whirl the head goes up over the hand
  let over=false;bout(W.flail,'wound','chest',.5,({t,st,M})=>{if(M.a.whirl&&t>M.a.whirl.t0&&t<M.a.whirl.t1&&st.pts[st.pts.length-1][1]<st.pts[0][1]-40)over=true;});
  assert(over,'the head never goes round over the hand');
  C.fixChoices(.5);const M={a:C.fighter('a',sword,false,{}),b:C.fighter('b',sword,false,{})};const g=C.gap(sword,sword,'long');
  C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');const r2=C.blow(M,'a',800,{outcome:'wound',loc:'chest',lost:3});C.fixChoices(null);
  assert.equal(r2.whirl,null);
  const r3=bout(W.whip,'wound','chest',.5,()=>{});assert.equal(r3.whirl,null);
});
test('the stage draws flexible weapons with the rope, a visible chain and a net mesh',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const st=fs.readFileSync(path.join(__dirname,'..','experiments','pits-stage.js'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'..','experiments','pits-cine.css'),'utf8');
  const html=fs.readFileSync(path.join(__dirname,'..','experiments','practice-combat.html'),'utf8');
  assert(/PitsFlex/.test(st)&&/F\.step\(st,/.test(st)&&/psFlexHits\(r\)/.test(st));
  // (the chain was a polyline with no stroke: invisible on the cinematic stage)
  for(const k of ['ps-chain','ps-lash','ps-cord','ps-net-mesh'])assert(new RegExp('\\.'+k+'\\{[^}]*stroke:').test(css),k+' has no stroke');
  assert(html.indexOf('pits-flex.js')>0&&html.indexOf('pits-flex.js')<html.indexOf('pits-stage.js'));
});
console.log(passed+' passed');
