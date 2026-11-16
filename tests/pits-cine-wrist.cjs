// The Pits cinematic stage: weapons stay in the hand (owner, 2026-11-16: "the weapons are still not staying in the
// hands naturally, they end up in weird angles that don't really make sense for the wrist"), and the axe is drawn as an
// axe with its landing point on the head. Each check failed before the fix.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../experiments/pits-cine.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
C.keep(0);
const sword={kind:'blade',len:92},norm=a=>((a+540)%360+360)%360-180,deg=r=>r*180/Math.PI;
const W=[sword,{kind:'blade',len:50},{kind:'axe',len:84,hands:1},{kind:'axe',len:120,hands:2},{kind:'spear',len:150,hands:1},{kind:'club',len:70,hands:1},{kind:'blade',len:130,hands:2}];
function bouts(each){
  for(const wk of W)for(const o of ['wound','parried','miss','evaded','partial-parry'])for(const loc of ['head','chest','rleg','larm'])for(const u of [.05,.5,.95]){
    C.fixChoices(u);const M={a:C.fighter('a',wk,false,{}),b:C.fighter('b',sword,false,{})};const g=C.gap(wk,sword,'long');
    C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');C.intent(M.a,100,'attack',.5);
    const r=C.blow(M,'a',800,{outcome:o,loc,lost:o==='wound'?3:0});C.fixChoices(null);each(M,r);
  }
}
test('every key holds the weapon within the wrist\'s turn',()=>{
  let n=0,bad=0;
  bouts(M=>{for(const id of ['a','b'])for(const k of M[id].keys.slice(1)){n++;const r=norm(k.v.w-k.v.fa);if(r<C.WRIST.lo-.5||r>C.WRIST.hi+.5)bad++;}});
  assert(bad/n<.01,(100*bad/n).toFixed(1)+'% of keys fold the weapon past the wrist (was 36%)');
});
// (known limits, docs/pits-animation-direction.md: the back handspring and a strike's whip-in can pass the wrist for
// a few frames in between; at every contact the weapon is in the hand)
test('drawn frames: the weapon is rarely past the wrist, and within it at every contact',()=>{
  let n=0,bad=0,worst=0;
  bouts((M,r)=>{for(const id of ['a','b']){const f=id==='a'?1:-1;for(const t of r.contacts.map(c=>c.t)){const j=C.joints(M[id],t);
    if(j.blen<(M[id].prof.to||M[id].weapon.len)-1)continue;
    const x=norm(deg(Math.atan2(j.tip[1]-j.Hn[1],f*(j.tip[0]-j.Hn[0])))-deg(Math.atan2(j.Hn[1]-j.E[1],f*(j.Hn[0]-j.E[0]))));
    worst=Math.max(worst,x<C.WRIST.lo?C.WRIST.lo-x:x>C.WRIST.hi?x-C.WRIST.hi:0);}
    for(let t=0;t<=r.end+200;t+=8){const j=C.joints(M[id],t);
    if(j.blen<(M[id].prof.to||M[id].weapon.len)-1)continue;       // (resting on the floor: the floor sets the angle)
    const x=norm(deg(Math.atan2(j.tip[1]-j.Hn[1],f*(j.tip[0]-j.Hn[0])))-deg(Math.atan2(j.Hn[1]-j.E[1],f*(j.Hn[0]-j.E[0]))));n++;
    const over=x<C.WRIST.lo?C.WRIST.lo-x:x>C.WRIST.hi?x-C.WRIST.hi:0;if(over>1)bad++;}}});
  assert(bad/n<.015,(100*bad/n).toFixed(2)+'% of frames past the wrist (was 7.4%)');
  assert(worst<2,'at a contact a weapon is '+worst.toFixed(0)+' degrees past the wrist');
});
test('the axe head is an axe: edge ahead of a downward cut, and the landing point on the head',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','experiments','pits-stage.js'),'utf8');
  const fn=src.match(/function psAxeHead\(len\)\{[\s\S]*?\n\}/)[0];const head=vm.runInNewContext(fn+';psAxeHead');
  for(const len of [58,84,120]){
    const h=head(len),us=h.blade.map(p=>p[0]),vs=h.blade.map(p=>p[1]);
    assert(h.blade.length>=8,'the blade is a shape, not a triangle');
    assert(Math.min(...vs)>0&&Math.max(...vs)>18,'the blade stands out on one side');
    assert(Math.max(...h.poll.map(p=>p[1]))<0,'the poll is on the other side');
    const at=C.profile({kind:'axe',len}).reachAt*len;
    assert(at>=Math.min(...us)&&at<=Math.max(...us),len+': the landing point ('+at.toFixed(0)+') is off the head');
  }
  // the edge (+v, drawn away from perp) leads a downward cut: the painter puts it on the side away from perp
  assert(/a\[0\]-perp\[0\]\*v,a\[1\]-perp\[1\]\*v/.test(src),'the painter no longer puts the edge on the leading side');
});
console.log(passed+' wrist and axe tests passed');
