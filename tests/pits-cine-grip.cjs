// The Pits cinematic stage: equipment and grip (audit docs/pits-cinematic-bug-audit-20261115.md, CA-05 to CA-07, and
// the owner's note that weapons sit awkwardly in the hands). Each check failed on main before the fix.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../experiments/pits-cine.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
C.keep(0);
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));return Math.hypot(p[0]-(a[0]+vx*u),p[1]-(a[1]+vy*u));};
const sword={kind:'blade',len:92};
function pair(wa,wb,shA,shB){
  const M={a:C.fighter('a',wa,false,{shield:!!shA,shieldKey:'heater'}),b:C.fighter('b',wb,false,{shield:!!shB,shieldKey:'heater'})};
  const g=C.gap(wa,wb,'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');return M;}

test('CA-05: the engine\'s handedness decides one hand or two',()=>{
  assert.equal(C.profile({kind:'spear',len:150,hands:1}).two,0,'a shortspear is one-handed');
  assert.equal(C.profile({kind:'trident',len:150,hands:1}).two,0,'a trident is one-handed');
  assert(C.profile({kind:'chain',len:110,hands:2}).two>0,'a military flail is two-handed');
  assert(C.profile({kind:'spear',len:190,hands:2}).two>0,'a longspear is two-handed');
  // a shield arm never also holds the shaft
  assert.equal(C.fighter('a',{kind:'spear',len:150},false,{shield:true}).prof.two,0);
  // and the stage passes the engine's handedness on
  const src=fs.readFileSync(path.join(__dirname,'..','experiments','pits-stage.js'),'utf8');
  assert(/hands:w\.twoHanded\?2:1/.test(src),'pitsStageLook does not pass the handedness');
  // the spear and shield's shield strike lands with the shield (CA-03's spear case)
  for(const o of ['wound','parried']){const M=pair({kind:'spear',len:150,hands:1},sword,true,false);
    const r=C.blow(M,'a',100,{outcome:o,loc:'chest',lost:o==='wound'?3:0,strike:'shield'});
    for(const c of r.contacts)assert(dist(C.joints(M.a,c.t).oHn,c.at)<=C.SHIELD_R.heater+2,'spear and shield: the shield is '+dist(C.joints(M.a,c.t).oHn,c.at).toFixed(1)+' from its strike');}
});

test('CA-06: the second hand is on the drawn shaft whenever it holds it, and holds it most of the time',()=>{
  for(const wk of [{kind:'spear',len:190,hands:2},{kind:'staff',len:132,hands:2},{kind:'blade',len:130,hands:2},{kind:'polearm',len:176,hands:2},{kind:'axe',len:120,hands:2}]){
    let n=0,held=0,worst=0;
    for(const o of ['wound','parried','miss','evaded','partial-parry'])for(const loc of ['head','chest','rleg'])for(const u of [.05,.5,.95]){
      C.fixChoices(u);const M=pair(wk,sword);C.intent(M.a,100,'attack',.5);const r=C.blow(M,'a',800,{outcome:o,loc,lost:o==='wound'||o==='partial-parry'?3:0});C.fixChoices(null);
      const ex=C.extent(wk);
      for(let t=0;t<=r.end+200;t+=10){const j=C.joints(M.a,t);n++;if(j.grip==null)continue;held++;
        const dir=[(j.tip[0]-j.Hn[0])/j.blen,(j.tip[1]-j.Hn[1])/j.blen],a=[j.Hn[0]+dir[0]*ex.from,j.Hn[1]+dir[1]*ex.from];
        worst=Math.max(worst,seg(j.oHn,a,j.tip));}
    }
    assert(worst<1.5,wk.kind+' '+wk.len+': the second hand is '+worst.toFixed(1)+' off the drawn shaft');
    assert(held/n>.8,wk.kind+' '+wk.len+': both hands on it only '+(100*held/n).toFixed(0)+'% of the time');
  }
});

test('CA-07: the weapon is where it is drawn: a quarterstaff lands on the staff, not past it',()=>{
  const st={kind:'staff',len:132,hands:2},ex=C.extent(st);
  assert.deepEqual([ex.from,ex.to],[-30,102]);
  for(const o of ['wound','parried','partial-parry'])for(const loc of ['head','chest','abdomen','rleg']){
    const M=pair(st,sword);const r=C.blow(M,'a',100,{outcome:o,loc,lost:3});
    for(const c of r.contacts){const j=C.joints(M.a,c.t);
      assert(Math.abs(dist(j.Hn,j.tip)-Math.min(ex.to,j.blen))<.5,'the rig\'s staff end is not the drawn end');
      assert(seg(c.at,j.Hn,j.tip)<3,o+' at the '+loc+': the contact is '+seg(c.at,j.Hn,j.tip).toFixed(1)+' off the drawn staff');}
  }
  // the painter draws the same extent
  const src=fs.readFileSync(path.join(__dirname,'..','experiments','pits-stage.js'),'utf8');
  assert(/PitsCine\.extent\(L\.wk\)/.test(src),'the painter does not use the shared extent');
});

test('the hold: an elbow asked to be below the shoulder is below it, and the weapon rarely folds back over the forearm',()=>{
  const M=pair(sword,sword);const j=C.joints(M.a,50),f=1;
  // the guard: the elbow under the line from the shoulder to the hand
  const cr=(j.Hn[0]-j.wS[0])*(j.E[1]-j.wS[1])-(j.Hn[1]-j.wS[1])*(j.E[0]-j.wS[0]);
  assert(cr*f<0,'the guard\'s elbow is up, not under the arm');
  const norm=a=>((a+180)%360+360)%360-180;let n=0,bad=0;
  for(const o of ['wound','parried','miss','evaded'])for(const loc of ['head','chest','rleg'])for(const u of [.05,.35,.65,.95]){
    C.fixChoices(u);const M=pair(sword,sword);C.intent(M.a,100,'attack',.5);const r=C.blow(M,'a',800,{outcome:o,loc,lost:o==='wound'?4:0});C.fixChoices(null);
    for(let t=0;t<=r.end+300;t+=20){const k=C.joints(M.a,t),fa=Math.atan2(k.Hn[1]-k.E[1],k.Hn[0]-k.E[0])*180/Math.PI,wa=Math.atan2(k.tip[1]-k.Hn[1],k.tip[0]-k.Hn[0])*180/Math.PI;
      n++;if(Math.abs(norm(wa-fa))>120)bad++;}
  }
  assert(bad/n<.09,'the sword is folded back over the forearm in '+(100*bad/n).toFixed(1)+'% of frames (was 15%)');
});
console.log(passed+' passed');
