// FR-35 (reports 20261118-232203, 20261120-215045: "knee and elbow joints often bend the wrong way"; "the left knee
// bends weird then teleports"). The fix is behind ?stage=joints (PitsCine.natural(true)) until the owner has played it;
// the default stage is unchanged (tests/pits-cine-look.cjs). This test plays the same set of blows both ways and
// checks, with the switch on: no elbow or knee drawn bent the wrong way, no knee jumping between frames, the weapon in
// the hand at every contact, and the contacts where they were. With the switch off it checks that the fault is still
// there to catch (so the measure is real).
const assert=require('node:assert/strict');
const C=require('../experiments/pits-cine.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
C.keep(0);
const sword={kind:'blade',len:92};
const W=[sword,{kind:'blade',len:50},{kind:'axe',len:84,hands:1},{kind:'axe',len:120,hands:2},{kind:'spear',len:150,hands:1},
  {kind:'spear',len:150,hands:2},{kind:'club',len:70,hands:1},{kind:'blade',len:130,hands:2}];
const norm=a=>((a+540)%360+360)%360-180,deg=r=>r*180/Math.PI;
function bouts(natural,each){
  C.natural(natural);
  for(const wk of W)for(const o of ['wound','parried','miss','evaded'])for(const loc of ['head','chest','rleg','larm'])for(const u of [.05,.5,.95])
    for(const down of [false,true]){
      C.fixChoices(u);const M={a:C.fighter('a',wk,false,{}),b:C.fighter('b',sword,false,{})};const g=C.gap(wk,sword,'long');
      C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
      let t=100;if(down){t=C.fall(M.a,t)+200;M.a.down=true;}
      C.intent(M.a,t,'attack',.5);
      const r=C.blow(M,'a',t+700,{outcome:o,loc,lost:o==='wound'?3:0,defeated:o==='wound'&&loc==='head'&&u===.5});
      C.fixChoices(null);each(M,r,t+700,{wk,o,loc,u,down});
    }
  C.natural(false);
}
function measure(natural){
  const s={frames:0,elbow:0,knee:0,jump:0,worstJump:0,wristAtContact:0,contacts:[]};
  bouts(natural,(M,r,t0)=>{
    for(const id of ['a','b']){
      const m=M[id];let prev=null;
      for(let t=t0-300;t<=r.end+300;t+=16){
        C.pose(m,t);const j=C.joints(m,t),f=m.face;s.frames++;
        if(C.wrongWay(j.wS,j.E,j.Hn,f,1)||C.wrongWay(j.oS,j.oE,j.oHn,f,1))s.elbow++;
        // (a back thigh drawn shorter than it is, kneeling from the ground, is turned toward the viewer: which way
        // its knee bends cannot be seen in the picture, so it is not counted)
        const turned=Math.hypot(j.bK[0]-j.P[0],j.bK[1]-j.P[1])<C.DIM.thigh*.9;
        if(C.wrongWay(j.P,j.K,j.F,f,-1)||(!turned&&C.wrongWay(j.P,j.bK,j.bF,f,-1)))s.knee++;
        // a knee that moves much further than its hip in one frame has jumped to the other side of the leg
        // (a leg swinging fast moves its knee and foot together: that is movement, not a jump)
        if(prev){for(const [k,ft] of [['K','F'],['bK','bF']]){const mv=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
          const d=mv(j[k],prev[k])-Math.max(mv(j.P,prev.P),mv(j[ft],prev[ft]));
          if(d>18)s.jump++;s.worstJump=Math.max(s.worstJump,d);}}
        prev=j;
      }
      for(const c of r.contacts){const j=C.joints(m,c.t);if(id!=='a')continue;
        // (how far the weapon's landing point is from where the contact is drawn)
        if(c.at){const L=Math.hypot(j.tip[0]-j.Hn[0],j.tip[1]-j.Hn[1])||1,q=Math.min(m.prof.reachAt*m.weapon.len,L);
          s.contacts.push(Math.hypot(j.Hn[0]+(j.tip[0]-j.Hn[0])*q/L-c.at[0],j.Hn[1]+(j.tip[1]-j.Hn[1])*q/L-c.at[1]));}
        if(j.blen<(m.prof.to||m.weapon.len)-1)continue;
        const x=norm(deg(Math.atan2(j.tip[1]-j.Hn[1],m.keys[0].face*(j.tip[0]-j.Hn[0])))-deg(Math.atan2(j.Hn[1]-j.E[1],m.keys[0].face*(j.Hn[0]-j.E[0]))));
        if(x<C.WRIST.lo-2||x>C.WRIST.hi+2)s.wristAtContact++;}
    }
  });
  return s;
}
const before=measure(false),after=measure(true);
const pc=(n,s)=>(100*n/s.frames).toFixed(2)+'%';
console.log('frames '+before.frames+'; elbows wrong way '+pc(before.elbow,before)+' -> '+pc(after.elbow,after)+
  '; knees wrong way '+pc(before.knee,before)+' -> '+pc(after.knee,after)+'; knee jumps '+before.jump+' -> '+after.jump+
  ' (worst '+before.worstJump.toFixed(0)+' -> '+after.worstJump.toFixed(0)+')');
test('the fault is there to catch without the switch',()=>{
  assert(before.elbow/before.frames>.05,'elbows wrong way only '+pc(before.elbow,before)+' on the default stage');
  assert(before.knee>0,'no wrong-way knee on the default stage');
});
test('?stage=joints: no elbow drawn bent backwards',()=>assert.equal(after.elbow,0,pc(after.elbow,after)+' of frames'));
test('?stage=joints: no knee drawn bent backwards',()=>assert.equal(after.knee,0,pc(after.knee,after)+' of frames'));
test('?stage=joints: no knee jumps from one side of the leg to the other',()=>assert(after.jump<=before.jump/10,after.jump+' jumps (default '+before.jump+')'));
test('?stage=joints: the weapon is in the hand at every contact',()=>assert.equal(after.wristAtContact,0));
test('?stage=joints: the blows land where they did',()=>{
  assert.equal(after.contacts.length,before.contacts.length,'a different number of contacts');
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length,worse=after.contacts.filter((d,i)=>d>before.contacts[i]+6).length;
  console.log('  (landing point to contact: mean '+mean(before.contacts).toFixed(1)+' -> '+mean(after.contacts).toFixed(1)+'; '+worse+' of '+after.contacts.length+' more than 6 units further)');
  assert(mean(after.contacts)<=mean(before.contacts)+1,'the blows land further from their contacts on average');
  assert(worse/after.contacts.length<.02,worse+' contacts land more than 6 units further than on the default stage');
});
console.log(passed+' passed');
