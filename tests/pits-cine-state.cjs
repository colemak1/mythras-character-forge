// The Pits cinematic stage: state after every outcome (audit docs/pits-cinematic-bug-audit-20261115.md, CA-01 to CA-04).
// The engine's prone state, the drawn figure and the HUD's Prone chip must agree; a fighter on the ground never gets
// up without Regain Footing; a shield strike and a shield parry meet with the shield that is drawn at that moment.
// Each check failed on main before the fix. The look of everything the audit does not call wrong is held separately,
// by tests/pits-cine-look.cjs.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const C=require('../experiments/pits-cine.js');
const root=path.resolve(__dirname,'..');
let passed=0;const tests=[];const test=(n,f)=>tests.push([n,f]);
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return Math.hypot(p[0]-(a[0]+vx*u),p[1]-(a[1]+vy*u));};
C.keep(0);
const sword={kind:'blade',len:92},spear={kind:'spear',len:150};
function pair(wa,wb,shields,seed){
  let s=seed||1000000;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  const M={a:C.fighter('a',wa,false,{shield:!!(shields&&shields.a),shieldKey:'heater'}),b:C.fighter('b',wb,false,{shield:!!(shields&&shields.b),shieldKey:'heater'})};
  const g=C.gap(wa,wb,'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');return M;
}
const maxHip=(m,t0,t1)=>{let h=0;for(let t=t0;t<=t1;t+=5)h=Math.max(h,C.joints(m,t).P[1]);return h;};
// the highest a fighter on the ground goes while it acts: the one knee it attacks from (PitsCine kneel)
const GROUND=36.5;
const ALL=['wound','armour','zero','parried','full-parry','full-ward','partial-parry','partial-ward','miss','fumble','evaded'];

// ----- CA-01: a fall the engine asks for is drawn, even when no damage got through -----
test('CA-01: a Trip or a failed evade with no damage through puts the fighter down in the picture',()=>{
  for(const o of ['armour','zero']){
    const M=pair(sword,sword,null);
    const r=C.blow(M,'a',100,{outcome:o,loc:'rleg',lost:0,fall:'sit'});
    assert(M.b.down,o+': the rig does not have the tripped fighter down');
    const j=C.joints(M.b,r.end+50);assert(j.P[1]<30,o+': the tripped fighter is drawn standing (hips '+j.P[1].toFixed(0)+')');
    // the same fall from a failed evade (fall:true, the evade's)
    const M2=pair(sword,sword,null);const r2=C.blow(M2,'a',100,{outcome:o,loc:'chest',lost:0,fall:true});
    assert(M2.b.down&&C.joints(M2.b,r2.end+50).P[1]<30,o+': a failed evade with nothing through leaves the evader standing');
  }
  // the rest is unchanged: armour without a fall barely moves anyone
  const M=pair(sword,sword,null);const r=C.blow(M,'a',100,{outcome:'armour',loc:'rleg',lost:0});
  assert(!M.b.down&&C.joints(M.b,r.end+50).P[1]>50);
});

// ----- CA-02: on the ground, only Regain Footing gets up -----
test('CA-02: a fighter on the ground attacks, defends and presses from the ground, every outcome, both roles',()=>{
  for(const role of ['a','b'])for(const o of ALL){
    const M=pair(sword,sword,{b:o.endsWith('ward')});const e=C.fall(M[role],100);
    const r=C.blow(M,'a',e+200,{outcome:o,loc:'chest',lost:o==='wound'||o.startsWith('partial')?3:0,shield:o.endsWith('ward')});
    const h=maxHip(M[role],e+200,r.end+300);
    assert(h<=GROUND,(role==='a'?'the attacker':'the defender')+' on the ground rises to hips '+h.toFixed(0)+' in a '+o);
    assert(M[role].down,'the rig no longer has it down after a '+o);
    // and the blow still lands where the stage puts its sparks
    if(role==='a')for(const c of r.contacts){const j=C.joints(M.a,c.t);assert(seg(c.at,j.Hn,j.tip)<3,'from the ground, a '+o+': the weapon is '+seg(c.at,j.Hn,j.tip).toFixed(1)+' from its contact');}
  }
  // Press Advantage from the ground
  const M=pair(sword,sword,null);const e=C.fall(M.a,100);const p=C.press(M.a,M.b,e+200);
  assert(maxHip(M.a,e+200,p+300)<=GROUND,'Press Advantage stands the fighter on the ground up');
  // and Regain Footing still does
  const s=C.stand(M.a,p+400);assert(C.joints(M.a,s+50).P[1]>55,'Regain Footing does not get up');
});

// ----- CA-03: a shield strike lands with the shield -----
test('CA-03: a shield strike meets its target with the shield drawn at each contact',()=>{
  const R=C.SHIELD_R.heater;
  for(const o of ['wound','armour','parried','partial-parry','full-parry'])for(const loc of ['chest','head','abdomen','rleg'])for(const live of [false,true]){
    const M=pair(sword,sword,{a:true});let t=100;
    if(live)t=C.intent(M.a,100,'shield-strike',.5)+500;
    const r=C.blow(M,'a',t,{outcome:o,loc,lost:o==='wound'||o==='partial-parry'?3:0,strike:'shield'});
    for(const c of r.contacts){
      const d=dist(C.joints(M.a,c.t).oHn,c.at);
      assert(d<=R+2,o+' at the '+loc+(live?' (declared)':'')+': the '+c.kind+' contact is '+d.toFixed(1)+' from the shield (radius '+R+')');
    }
  }
});

// ----- CA-04: a shield parry from the ground uses the shield -----
test('CA-04: a fighter on the ground who wards with a shield meets the blow with the shield',()=>{
  const R=C.SHIELD_R.heater;
  for(const o of ['full-ward','partial-ward']){
    const M=pair(sword,sword,{b:true});const e=C.fall(M.b,100);
    const r=C.blow(M,'a',e+200,{outcome:o,loc:'chest',lost:o==='partial-ward'?2:0,shield:true});
    const c=r.contacts[0],d=dist(C.joints(M.b,c.t).oHn,c.at);
    assert.equal(c.kind,'clash');
    assert(d<=R+2,o+': the ward is '+d.toFixed(1)+' from the shield');
    // and the attacker's weapon is there too
    const j=C.joints(M.a,c.t);
    assert(seg(c.at,j.Hn,j.tip)<3,o+': the weapon is not at the ward');
  }
});

// ----- the stage: the HUD and the figure follow the rig, live and in the replay -----
function stage(replaying){
  const ctx={console,Math,JSON,Promise,location:{search:''},performance:{now:()=>0},requestAnimationFrame(){},cancelAnimationFrame(){},
    setTimeout:f=>{f();return 0;},clearTimeout(){},matchMedia:()=>({matches:false}),
    document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({style:{},classList:{add(){},remove(){}},appendChild(){}})}};
  ctx.window=ctx;vm.createContext(ctx);
  for(const f of ['experiments/pits-cine.js','experiments/pits-stage.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
  const run=s=>vm.runInContext(s,ctx);
  run(`PitsCine.keep(0);var __ev=[];V={replaying:${!!replaying},busy:false,hold:false};
    psUntil=t=>{PS.clock=Math.max(PS.clock,t);return Promise.resolve();};psHitStop=()=>Promise.resolve();
    psDom=psBurst=psDust=psBanner=psFlyWeapon=psRing=psShake=psPunch=psReticle=psHudConditions=()=>{};
    psEmit=(t,d)=>{__ev.push([t,d]);};
    PS.cine=true;PS.springOn=true;PS.clock=0;
    const wk={kind:'blade',len:92};
    for(const id of ['a','b'])PS.fig[id]={id,look:{wk,shield:false,parts:{},prone:false,swap:false,armed:true},X:0,face:id==='a'?1:-1,scale:1,pts:{hd:[0,0],Sh:[0,0],tip:[0,0],hand:[0,0]}};
    PS.M={a:PitsCine.fighter('a',wk,false,{}),b:PitsCine.fighter('b',wk,false,{})};PS.gap=PitsCine.gap(wk,wk,'long');
    PitsCine.place(PS.M.a,0,PS.gap,'guard');PitsCine.place(PS.M.b,0,PS.gap,'guard');PS.clock=100;`);
  return {run,ctx};
}
const agree=(S,what)=>{
  for(const id of ['a','b']){
    const st=JSON.parse(S.run(`JSON.stringify({chip:pitsStageShownProne('${id}'),mDown:!!PS.fig['${id}'].mDown,rig:!!PS.M['${id}'].down,hip:PitsCine.joints(PS.M['${id}'],PS.clock+400).P[1]})`));
    assert.equal(st.chip,st.rig,what+': fighter '+id+': the Prone chip and the figure disagree');
    assert.equal(st.mDown,st.rig,what+': fighter '+id+': the HUD says '+(st.mDown?'prone':'standing')+', the figure is '+(st.rig?'down':'up'));
    assert.equal(st.rig,st.hip<40,what+': fighter '+id+': the rig says '+(st.rig?'down':'up')+' with the hips at '+st.hip.toFixed(0));
  }
  const err=S.ctx.__ev.find(e=>e[0]==='cue-error');assert(!err,what+': '+(err&&err[1].message));
};
test('CA-01: the stage: a successful defensive Trip puts the attacker down in the HUD and the picture, live and replay',async()=>{
  for(const rep of [false,true]){
    const S=stage(rep);await S.run(`psMotionCue({type:'trip',actor:'b',target:'a',fell:true})`);
    agree(S,'defensive Trip'+(rep?' (replay)':''));
    assert(S.run(`!!PS.M.a.down&&!!PS.fig.a.mDown`),'the tripped attacker is not down');
  }
});
test('CA-01: the stage: a failed evade with every point stopped by armour leaves the evader down in both',async()=>{
  for(const rep of [false,true]){
    const S=stage(rep);
    S.run(`PS.ex={atk:'a',aGrade:2,react:'evade',reactGrade:1,reactTool:'weapon'}`);
    await S.run(`psMotionBlow({type:'hit',actor:'a',target:'b',loc:'chest',lost:0,px:{armour:4,react:'evade',reactGrade:1}})`);
    agree(S,'failed evade, armour'+(rep?' (replay)':''));
    assert(S.run(`!!PS.M.b.down`),'the evader is not down');
  }
});
test('CA-01/02: the stage: after every outcome, both roles, the HUD and the figure agree',async()=>{
  for(const rep of [false,true])for(const out of [{lost:4},{lost:0,px:{armour:3}},{lost:0,px:{blocked:5,afterParry:0}}]){
    for(const downed of [null,'a','b']){
      const S=stage(rep);
      if(downed)await S.run(`PS.fig.${downed}.mDown=true;PS.fig.${downed}.look.prone=true;PS.clock=PitsCine.fall(PS.M.${downed},PS.clock)+50;`);
      S.run(`PS.ex={atk:'a',aGrade:2,react:'none',reactGrade:null,reactTool:'weapon'}`);
      await S.run(`psMotionBlow(${JSON.stringify({type:'hit',actor:'a',target:'b',loc:'chest',...out})})`);
      agree(S,JSON.stringify(out)+' with '+(downed||'nobody')+' down'+(rep?' (replay)':''));
    }
  }
});

(async()=>{
  let failed=0;
  for(const [n,f] of tests){try{await f();passed++;console.log('PASS '+n);}catch(e){failed++;console.log('FAIL '+n+'\n  '+e.message+(process.env.STACK?e.stack:''));}}
  console.log(passed+' passed'+(failed?', '+failed+' failed':''));if(failed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
