// The Pits movement language (experiments/pits-motion.js): presentation only, and a pure function of time.
// These tests hold the animation direction to its own rules (docs/pits-animation-direction.md):
// bodies stay possible, planted feet stay planted, contacts meet, nothing snaps, and no phrase ends in the guard it began in.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const PM=require('../experiments/pits-motion.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const IDS=Object.keys(PM.SEQUENCES),seqs=Object.fromEntries(IDS.map(id=>[id,PM.build(id)]));
const each=f=>{for(const id of IDS)f(seqs[id],id);};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const JOINTS=['P','M','S','Hd','K','F','bK','bF','E','Hn','oE','oHn','tip'];

test('the five sequences exist and the reference one is the full exchange',()=>{
  assert.deepEqual(IDS,['exchange','miss','hit','press','finish']);
  each(s=>{assert(s.dur>1500&&s.dur<4000);assert.deepEqual(s.notes,[],'a hand was asked to reach further than the arm');});
});
test('bodies stay possible: no leg or arm is ever stretched past its length, nothing goes through the floor',()=>{
  each((s,id)=>{for(let t=0;t<=s.dur;t+=5){const f=PM.frame(s,t);
    for(const w of ['a','b']){const j=f[w].joints;
      for(const k in j.over)assert(j.over[k]<=.6,id+' '+w+'.'+k+' over by '+j.over[k].toFixed(1)+' at '+t);
      for(const n of JOINTS)assert(j[n][1]>=(n==='Hd'?12:n==='tip'?-4:-.01),id+' '+w+'.'+n+' below the floor at '+t);}}});
});
test('a planted foot does not slide: it moves only while it is off the floor',()=>{
  each((s,id)=>{for(const w of ['a','b']){const f=s.fighters[w];let prev=f.pose(0);
    for(let t=5;t<=s.dur;t+=5){const p=f.pose(t);
      for(const foot of ['ff','bf']){
        const lying=p.py<30;   // a fallen fighter's leg may straighten along the floor
        if(!lying&&p[foot+'y']<.01&&prev[foot+'y']<.01)assert(Math.abs(p[foot+'x']-prev[foot+'x'])<.01,id+' '+w+'.'+foot+' slides at '+t);}
      prev=p;}}});
});
test('one continuous motion: no joint jumps between two moments, including across the impact holds',()=>{
  each((s,id)=>{let prev=PM.frame(s,0);
    for(let td=5;td<=PM.shownDur(s);td+=5){const f=PM.frame(s,PM.seqTime(s,td));
      for(const w of ['a','b'])for(const n of JOINTS){
        const d=dist(f[w].joints[n],prev[w].joints[n]);assert(d<(n==='tip'?34:22),id+' '+w+'.'+n+' jumps '+d.toFixed(1)+' at '+td);}
      prev=f;}});
});
test('the weapon is held, not hinged: the blade never turns further from the forearm than a wrist can',()=>{
  each((s,id)=>{for(let t=0;t<=s.dur;t+=5)for(const w of ['a','b']){const g=PM.frame(s,t)[w].joints.grip;
    assert(g>=PM.GRIP.min-.5&&g<=PM.GRIP.max+.5,id+' '+w+' wrist at '+g.toFixed(0)+' degrees at '+t);}});
  // between keys the blade rides with the arm: when the forearm swings, the blade swings with it
  const A=seqs.exchange.fighters.a,j0=A.joints(725),j1=A.joints(860);
  const fore=j=>j.w-j.grip;assert(Math.abs((j1.w-j0.w)-(fore(j1)-fore(j0)))<40);
  // a blow lands with the weapon in line with the arm
  assert(Math.abs(seqs.hit.fighters.a.joints(900).grip)<12);
});
test('contacts meet: the blades cross at the parry, and a landed blow is on the struck part',()=>{
  each((s,id)=>{for(const c of s.checks){const at=s.fighters[c.who].at(c.t,'blade',c.along);
    assert(dist(at,c.at)<6,id+' '+c.who+' is '+dist(at,c.at).toFixed(1)+' from its contact at '+c.t);}});
  assert(seqs.exchange.checks.length===3&&seqs.hit.checks.length===1);
});
test('a miss touches nothing: the blade stays clear of the defender for the whole cut',()=>{
  const s=seqs.miss;let near=1e9;
  for(let t=0;t<=s.dur;t+=5){const tip=s.fighters.a.at(t,'tip');
    for(const n of ['Hd','S','M','P','K','F','Hn','oHn'])near=Math.min(near,dist(tip,s.fighters.b.at(t,n)));}
  assert(near>18,'the point came within '+near.toFixed(1));
});
test('no common neutral pose: every fighter ends in a different guard from the one it began in',()=>{
  each((s,id)=>{for(const w of ['a','b']){const a=s.fighters[w].pose(0),b=s.fighters[w].pose(s.dur);
    const diff=Math.abs(a.w-b.w)+dist(a.h,b.h)+dist(a.o,b.o)+Math.abs(a.py-b.py)+Math.abs(a.lean-b.lean);
    assert(diff>12,id+' '+w+' returned to its opening guard');}});
});
test('the fighters end where the engine has them: back at measure, unless one is down',()=>{
  each((s,id)=>{const a=s.fighters.a.pose(s.dur),b=s.fighters.b.pose(s.dur);
    assert(Math.abs(a.px)<8,id+' sword ends '+a.px.toFixed(0)+' from its place');
    if(id!=='finish')assert(Math.abs(b.px)<8,id+' dagger ends '+b.px.toFixed(0)+' from its place');});
  assert(seqs.finish.fighters.b.pose(seqs.finish.dur).py<20,'the beaten fighter stays down');
});
test('a decision pause is a pose that can be held: weight between the feet, both feet down',()=>{
  each((s,id)=>{for(const p of s.pauses)for(const w of ['a','b']){const q=s.fighters[w].pose(p.t);
    assert(q.ffy<.01&&q.bfy<.01,id+' '+w+' is mid-step at the pause');
    const lo=Math.min(q.ffx,q.bfx)-4,hi=Math.max(q.ffx,q.bfx)+4;
    assert(q.px>=lo&&q.px<=hi,id+' '+w+' is off balance at the pause');}});
  assert(seqs.exchange.pauses.length===1&&seqs.press.pauses.length===1);
});
test('the strike has changes of speed: slow to load, fastest into contact, still at the impact hold',()=>{
  const s=seqs.exchange,A=s.fighters.a,tc=s.checks[0].t,sp=(t0,t1)=>dist(A.at(t0,'tip'),A.at(t1,'tip'))/(t1-t0);
  const load=sp(tc-700,tc-400),strike=sp(tc-60,tc);
  assert(strike>load*3.5,'strike '+strike.toFixed(2)+' against load '+load.toFixed(2));
  const a=PM.frame(s,PM.seqTime(s,tc+10)),b=PM.frame(s,PM.seqTime(s,tc+60));
  assert(dist(a.a.joints.tip,b.a.joints.tip)<.01,'the impact hold is still');
  assert.equal(PM.shownDur(s),s.dur+150);
});
test('the hips lead and the blade follows: the pelvis has done most of its travel while the blade is still back',()=>{
  const A=seqs.exchange.fighters.a,tc=900,p0=A.pose(tc-400),p1=A.pose(tc-175),p2=A.pose(tc);
  assert((p1.px-p0.px)/(p2.px-p0.px)>.6);
  assert(A.joints(tc-175).w>110,'the blade is still behind the shoulder when the hips have gone');
});
test('wounds and effects appear at the contact, not before',()=>{
  const s=seqs.hit,tc=s.wounds[0].t;
  assert.deepEqual(PM.frame(s,tc-1).b.wounds,{});assert.equal(PM.frame(s,tc).b.wounds.chest,'serious');
});
test('presentation only: the module is a pure function of time and touches no rules, dice or page',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','experiments','pits-motion.js'),'utf8').replace(/\/\/.*$/gm,'');
  for(const bad of ['Math.random','CombatRules','document.','localStorage','Date.now','performance.'])assert(!src.includes(bad),bad);
  assert.equal(JSON.stringify(PM.frame(seqs.exchange,1234)),JSON.stringify(PM.frame(PM.build('exchange'),1234)));
});
console.log(passed+' passed');
