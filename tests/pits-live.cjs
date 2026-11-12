// The Pits stage drives its figures with the movement language (experiments/pits-motion.js, LIVE): every resolved
// exchange the engine can produce is written as phrases from the pose the fighters are in. These tests hold the live
// phrases to the same rules as the study (docs/pits-animation-direction.md): bodies stay possible, contacts meet,
// nothing snaps, planted feet stay planted, a pause point stands on two feet, and nobody returns to the opening guard.
const assert=require('node:assert/strict');
const PM=require('../experiments/pits-motion.js'),L=PM.LIVE;
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// weapons as the stage draws them (pitsStageWeaponKind)
const W={sword:{kind:'blade',len:92},dagger:{kind:'blade',len:50},shortsword:{kind:'blade',len:68},spear:{kind:'spear',len:150},
  axe:{kind:'axe',len:84},greatsword:{kind:'blade',len:130},mace:{kind:'club',len:70},rapier:{kind:'blade',len:112,thin:1}};
const PAIRS=[['sword','dagger'],['dagger','sword'],['sword','sword'],['spear','axe'],['greatsword','dagger'],['mace','rapier'],['shortsword','spear']];
const OUT=['wound','partial-parry','parried','full-ward','armour','zero','evaded','miss','fumble','partial-ward','full-parry'];
const LOCS=['chest','head','rleg','abdomen','rarm','larm','lleg'];
// one long bout per pair: blows in turn, every outcome and location, with and without a recovery between them
function bout(wa,wb,key){
  const gap=L.gap(W[wa],W[wb],key||'long'),F={a:L.fighter('a',W[wa]),b:L.fighter('b',W[wb])},log=[];
  L.place(F.a,0,gap,'guard');L.place(F.b,0,gap,'guard');let t=100;
  for(let i=0;i<OUT.length*3;i++){
    const aid=i%3?'a':'b',o=OUT[(i*4+(aid==='b'?5:0))%OUT.length],lost=/wound|partial|armour/.test(o)&&o!=='armour'?4:0;
    const r=L.blow(F,aid,t,{outcome:o,loc:LOCS[i%LOCS.length],lost,shield:/ward/.test(o)});
    log.push({aid,o,t,...r});
    t=(i%2?L.recover(F[aid],r.end+150,gap,false):r.end)+80;
  }
  return {F,log,end:t,gap};
}
const bouts=PAIRS.map(([a,b])=>({a,b,...bout(a,b)}));
// what the stage draws (a long blade between keys is kept off the floor there)
const drawn=(f,u)=>L.pose(f,u);
const JOINTS=['Hd','S','M','P','K','F','bK','bF','E','Hn','oE','oHn','tip'];

test('every outcome the engine resolves writes a blow, for every pair of weapons, from either side',()=>{
  for(const B of bouts){
    const kinds=new Set(B.log.map(l=>l.o));assert.equal(kinds.size,OUT.length,B.a+' v '+B.b);
    for(const l of B.log){assert(l.contacts.length>=1,l.o);assert(l.end>l.tc&&l.tc>l.t,l.o+' times');}
  }
});
test('bodies stay possible: no NaN, no limb stretched past its length (live tolerance 10 units: a tenth of a leg, in the stand-in recoveries), nothing below the floor',()=>{
  for(const B of bouts)for(const id of ['a','b']){const f=B.F[id];
    for(let u=0;u<B.end;u+=5){const j=drawn(f,u);
      for(const n of JOINTS){assert(Number.isFinite(j[n][0])&&Number.isFinite(j[n][1]),B.a+' '+id+' '+n+' NaN at '+u);
        assert(j[n][1]>=(n==='tip'?-6:n==='Hd'?12:-.5),B.a+' v '+B.b+' '+id+'.'+n+' below the floor at '+u);}
      for(const k in j.over)assert(j.over[k]<=10,B.a+' v '+B.b+' '+id+'.'+k+' over by '+j.over[k].toFixed(1)+' at '+u);}}
});
test('contacts meet: the blade reaches the body part at the moment the effects are drawn, and the blades cross at a parry',()=>{
  for(const B of bouts)for(const l of B.log){const A=B.F[l.aid];
    for(const c of l.contacts){
      if(c.kind==='body'){const along=A.style==='thrust'?A.weapon.len:Math.round(A.weapon.len*.89),j=L.pose(A,c.t),k=Math.min(1,j.blen/A.weapon.len),P=A.W([j.Hn[0]+Math.cos(j.w*Math.PI/180)*along*k,j.Hn[1]+Math.sin(j.w*Math.PI/180)*along*k]);
        // the effects are drawn on the blade, and the blade is on the part (a partial parry may leave it a little short)
        assert(dist(P,c.at)<=6,'the contact is drawn where the blade is');
        const lim=/^partial/.test(l.o)?30:9;
        assert(dist(P,c.part)<lim,B.a+' v '+B.b+' '+l.o+' misses the body by '+dist(P,c.part).toFixed(1));}
      if(c.kind==='clash'){
        // somewhere along the attacking blade
        let m=1e9;for(let s=0;s<=A.weapon.len;s+=2)m=Math.min(m,dist(A.at(c.t,'blade',s),c.at));
        assert(m<9,B.a+' v '+B.b+' '+l.o+' the blades do not meet ('+m.toFixed(1)+')');}
    }}
});
test('one continuous motion: no joint jumps between two moments, across chained blows and recoveries',()=>{
  for(const B of bouts)for(const id of ['a','b']){const f=B.F[id];let prev=null;
    for(let u=10;u<B.end;u+=5){const j=drawn(f,u);
      if(prev)for(const n of JOINTS){const lim=n==='tip'?34*Math.max(1,f.weapon.len/92)+6:22;   // the study's limit, scaled to the weapon
        assert(dist(j[n],prev[n])<lim,B.a+' v '+B.b+' '+id+'.'+n+' jumps '+dist(j[n],prev[n]).toFixed(1)+' at '+u);}
      prev=j;}}
});
test('the pause point stands: at the end of a follow-through both feet are down and the base is a fighting stance',()=>{
  for(const B of bouts)for(const l of B.log)for(const id of ['a','b']){
    const p=B.F[id].pose(l.end);
    assert(p.ffy<.5&&p.bfy<.5,B.a+' v '+B.b+' '+l.o+' '+id+' has a foot in the air at the pause');
    assert(p.ffx-p.bfx>40,B.a+' v '+B.b+' '+l.o+' '+id+' stands with its feet together ('+(p.ffx-p.bfx).toFixed(0)+')');}
});
test('a planted foot does not slide while it is down (outside falls and the stand-up stand-in)',()=>{
  for(const B of bouts)for(const id of ['a','b']){const f=B.F[id];let prev=f.pose(10);
    for(let u=15;u<B.end;u+=5){const p=f.pose(u);
      for(const foot of ['ff','bf'])if(p[foot+'y']<.01&&prev[foot+'y']<.01)
        assert(Math.abs(p[foot+'x']-prev[foot+'x'])<1.2,B.a+' v '+B.b+' '+id+'.'+foot+' slides at '+u);
      prev=p;}}
});
test('nobody returns to the opening guard: a recovery ends at the station in a different guard',()=>{
  const B=bout('sword','dagger'),f=B.F.a,end=L.recover(f,B.end+50,B.gap,true),p=f.pose(end),G=f.guard;
  assert(Math.abs(p.ffx-L.station(f,B.gap))<3,'back at the station');
  assert(dist(p.h,G.h)+Math.abs(p.w-G.w)>10,'the weapon is not in the opening guard');
});
test('a new phrase takes over from wherever the last one was cut off, with no jump',()=>{
  const F={a:L.fighter('a',W.sword),b:L.fighter('b',W.dagger)},gap=L.gap(W.sword,W.dagger,'long');
  L.place(F.a,0,gap,'guard');L.place(F.b,0,gap,'guard');
  const r=L.blow(F,'a',100,{outcome:'wound',loc:'chest',lost:3});
  const mid=r.tc-120,before=PM.solve(F.a.pose(mid),92);
  L.blow(F,'b',mid,{outcome:'parried',loc:'head',lost:0});   // a newer cue takes over mid-cut
  const after=PM.solve(F.a.pose(mid),92),next=PM.solve(F.a.pose(mid+5),92);
  for(const n of JOINTS){assert(dist(before[n],after[n])<1,n+' moved at the cut');assert(dist(after[n],next[n])<34,n+' jumps after the cut');}
});
test('range: the longer weapon sets the measure, closing in brings it to the shorter weapon, apart is furthest',()=>{
  const g=(a,b,k)=>L.gap(W[a],W[b],k);
  assert(g('spear','dagger','long')>g('sword','dagger','long'));
  assert(g('spear','dagger','short')<g('spear','dagger','long'));
  assert(g('sword','dagger','apart')>g('sword','dagger','long'));
  // a change of range is footwork, not a slide: the stance walks to its new station
  const F={a:L.fighter('a',W.sword)};L.place(F.a,0,g('sword','sword','long'),'guard');
  const end=L.walk(F.a,10,60),p=F.a.pose(end);assert(Math.abs(p.ffx-(F.a.guard.ffx+60))<1&&Math.abs(p.bfx-(F.a.guard.bfx+60))<1);
});
test('falls and the end of a fight: a defeating blow ends on the floor; the winner lowers the point; a yield bows',()=>{
  const F={a:L.fighter('a',W.sword),b:L.fighter('b',W.dagger)},gap=L.gap(W.sword,W.dagger,'long');
  L.place(F.a,0,gap,'guard');L.place(F.b,0,gap,'guard');
  const r=L.blow(F,'a',100,{outcome:'wound',loc:'chest',lost:8,defeated:true});
  assert(PM.solve(F.b.pose(r.end+50),50).Hd[1]<25,'the defeated fighter is down');
  const e=L.lower(F.a,r.end);assert(F.a.pose(e).h[1]<-50,'the winner\'s weapon hand is low');
  const G={b:L.fighter('b',W.sword)};L.place(G.b,0,gap,'guard');const y=L.yieldTo(G.b,10);
  const j=PM.solve(G.b.pose(y),92);assert(j.Hd[1]>100,'a yield is not a fall');assert(G.b.pose(y).head>15,'the head is bowed');
});
test('presentation only: the live layer reads no rules, dice or page',()=>{
  const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','experiments','pits-motion.js'),'utf8').replace(/\/\/.*$/gm,'');
  assert.doesNotMatch(src,/Math\.random|document\.|window\.|\bS\.fighters|\brollSkill|\bCombatRules/);
});
console.log(passed+' passed');
