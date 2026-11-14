// Scripted bouts on the spring trial (?stage=spring), each dice roll chosen, for faults the owner reported from play
// (2026-11-13). Real browser; needs playwright and a static server (python3 -m http.server 8765).
//   - Impale, "Leave it in the wound": the weapon is drawn lodged in the wound and is not also thrown to the floor
//   - a successful Trip: the tripped fighter goes down, and the plate's Prone chip waits for the figure
//   - a miss, then the other's attack: the miss is drawn before the next attack is declared
//
//   node tests/visual/pits-spring-scripted.cjs
const assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const URL_=(process.env.PITS_URL||'http://localhost:8765/experiments/practice-combat.html')+'?stage=spring';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// sc: {config, react:[...], effect, pick:{pendingKind:selector}, rolls:{'a:Attack':n}, attacks}
async function bout(browser,sc){
  const p=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.__psRecord=[];try{localStorage.setItem('sitota-practice-guidance-v1','off');}catch(e){}
    // the first fighter wins the initiative; a d100 is the scripted value when one is set, otherwise middling
    window.__pitsDie=n=>{if(n===100&&window.__next!=null){const v=window.__next;window.__next=null;return v;}
      if(n===10)return (window.__d10=(window.__d10||0)+1)%2?10:1;return Math.ceil(n/2);};
    // every frame: the defender's hips and whether its plate says Prone (for the chip's timing)
    window.__fr=[];const tick=()=>{try{const f=PS.fig.b;if(f.pts&&f.pts.H)window.__fr.push({hip:f.pts.H[1],chip:!!pitsStageShownProne('b')});}catch(e){}requestAnimationFrame(tick);};
    requestAnimationFrame(tick);});
  await p.goto(URL_);
  await p.evaluate(c=>{const fly=window.psFlyWeapon;window.psFlyWeapon=function(f,m){window.__psRecord.push({type:'fly',actor:f.id,c:PS.clock});return fly(f,m);};
    const emit=window.psEmit;window.psEmit=function(t,d){emit(t,d);const r=window.__psRecord[window.__psRecord.length-1];if(r&&r.type===t)r.c=PS.clock;};
    Object.assign(config,{mode:'pvp',charname:'Aurel',pvpName:'Brann',style:60,pvpSkill:60,weapon:'sword',pvpWeapon:'sword',armor:0,pvpArmor:0},c||{});startRun(false);},sc.config);
  const st=()=>p.evaluate(()=>{const S=prototypeCombat.state(),V=prototypeCombat.presentation(),R=prototypeCombat.pendingRoll();
    return {phase:S.phase,busy:!!V.busy,pend:S.pending?S.pending.kind:null,R:R?R.actor+':'+R.label.split(' ')[0]:null};});
  const click=q=>p.evaluate(q=>{const e=[...document.querySelectorAll(q)].find(x=>!x.disabled);if(!e)return false;
    e.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true;},q);
  let attacks=0,nr=0,bz=0;const probes=[];
  for(let i=0;i<500;i++){const s=await st();
    if(s.busy){if(++bz>250)break;await sleep(40);continue;}bz=0;
    if(s.phase!=='fight')break;
    if(s.R&&sc.probe&&sc.probe.includes(s.R))probes.push({at:s.R,dropped:await p.evaluate(()=>document.querySelectorAll('#pitsStage .ps-dropped').length)});
    if(s.R){await p.evaluate(v=>{window.__next=v==null?null:v;},(sc.rolls||{})[s.R]);await click('[data-act=roll]');}
    else if(s.pend==='reaction'){const r=(sc.react||[])[nr++]||'none';await click('[data-act=react][data-val='+r+']')||await click('[data-act=react][data-val=none]');}
    else if(s.pend==='effect'){if(!(sc.effect&&await click('[data-act=effect][data-val="'+sc.effect+'"]')))await click('[data-act=skipEffect]');}
    else if(s.pend&&sc.pick&&sc.pick[s.pend])await click(sc.pick[s.pend]);
    else if(s.pend)await click('#root .prompt .choice:not([data-act=yield]):not([data-act=help])');
    else{if(attacks++>=(sc.attacks||1))break;await click('[data-act=attack]');}
    await sleep(100);}
  await sleep(1200);
  const out=await p.evaluate(()=>({rec:window.__psRecord.map(r=>({type:r.type,kind:r.kind||r.outcome||'',actor:r.actor,c:Math.round(r.c||0)})),
    lodged:document.querySelectorAll('#pitsStage .ps-lodged').length,dropped:document.querySelectorAll('#pitsStage .ps-dropped').length,
    prone:{a:!!prototypeCombat.state().fighters.a.prone,b:!!prototypeCombat.state().fighters.b.prone},
    hips:{a:PS.fig.a.pts&&PS.fig.a.pts.P?Math.round(PS.fig.a.pts.P[1]):null,b:PS.fig.b.pts&&PS.fig.b.pts.P?Math.round(PS.fig.b.pts.P[1]):null}}));
  const frames=await p.evaluate(()=>window.__fr);
  const held=await p.evaluate(()=>{const f=PS.fig.a,el=document.querySelector('#pitsStage .ps-lodged');
    const shaft=f.e&&f.e.shaft?getComputedStyle(f.e.shaft).display:'?';
    // the lodged weapon's far end (its grip) against the hand, in stage coordinates
    let gap=null;if(el&&f.pts){const m=el.getCTM&&el.getCTM(),bb=el.getBBox();const w=PS.fig.b,lo=(PS.fighters.lodged.b||[])[0];
      if(lo){const P=psBodyPt(w,lo.loc),H=psWorld(f,f.pts.hand),len=pitsStageWeaponKind(lo.weapon,3).len;gap=Math.abs(Math.hypot(H[0]-P[0],H[1]-P[1])-len);}}
    return {shaft,gap,lodged:document.querySelectorAll('#pitsStage .ps-lodged').length};});
  await p.close();return {...out,errors,probes,frames,held};
}
(async()=>{
  const browser=await chromium.launch();let pass=0,fail=0;
  const T=async(name,f)=>{try{await f();console.log('PASS '+name);pass++;}catch(e){console.log('FAIL '+name+': '+e.message.split('\n')[0]);fail++;}};
  await T('Impale, weapon left in the wound: drawn lodged, not thrown to the floor as well',async()=>{
    const r=await bout(browser,{config:{weapon:'rapier'},react:['none'],effect:'impale',rolls:{'a:Attack':1},
      pick:{impaleLeave:'[data-act=impaleLeave][data-val=leave]'},attacks:1});
    assert.deepEqual(r.errors,[]);
    assert(r.rec.some(x=>x.type==='contact'&&x.kind==='wound'),'the thrust landed');
    assert.equal(r.lodged,1,'the weapon is drawn lodged in the wound');
    assert.deepEqual(r.rec.filter(x=>x.type==='fly'),[],'no weapon was thrown');
    assert.equal(r.dropped,0,'no weapon lies on the floor');
  });
  // (Work's check B4, 2026-11-14: the disarmed weapon lay on the floor while the hit location still waited for its roll)
  await T('Disarm by the attacker: the weapon stays in hand until the blow lands, then lies on the floor once',async()=>{
    const r=await bout(browser,{config:{str:18,siz:18},react:['none'],effect:'disarm',rolls:{'a:Attack':1,'b:Resist':99},
      probe:['a:Disarm','a:Hit','a:Damage'],attacks:1});
    assert.deepEqual(r.errors,[]);
    assert(r.probes.length>=2,'the exchange waited on the rolls: '+JSON.stringify(r.probes));
    assert.deepEqual(r.probes.filter(x=>x.dropped),[],'no weapon on the floor before the blow: '+JSON.stringify(r.probes));
    assert.equal(r.dropped,1,'the weapon lies on the floor once the blow has landed');
  });
  // (Work's check B6, 2026-11-14: Keep hold drew two blades, one in the wound and one in the hand, the arm pulled back)
  await T('Impale, Keep hold: one weapon, lodged in the wound, with the hand on its grip',async()=>{
    const r=await bout(browser,{config:{weapon:'rapier'},react:['none'],effect:'impale',rolls:{'a:Attack':1},
      pick:{impaleLeave:'[data-act=impaleLeave][data-val=hold]'},attacks:1});
    assert.deepEqual(r.errors,[]);
    assert.equal(r.held.lodged,1,'the weapon is drawn lodged in the wound');
    assert.equal(r.held.shaft,'none','no second weapon is drawn in the hand');
    assert(r.held.gap!=null&&r.held.gap<=4,'the hand is on the grip (off by '+r.held.gap+')');
  });
  await T('a successful Trip: the tripped fighter goes down onto the floor',async()=>{
    const r=await bout(browser,{react:['none'],effect:'trip',rolls:{'a:Attack':10,'b:Trip':99,'b:Brawn':99,'b:Evade':99},attacks:1});
    assert.deepEqual(r.errors,[]);
    assert(r.rec.some(x=>x.type==='contact'&&x.kind==='trip'),'the trip was drawn');
    assert(r.prone.b,'the engine has the defender prone');
    // (Work's check B1, 2026-11-14: the plate said Prone while the tripped fighter was still upright and lowering)
    const fr=r.frames,first=fr.findIndex(x=>x.chip),seated=fr[fr.length-1].hip;
    assert(first>=0,'the plate says Prone once the fighter is down');
    const top=Math.min(...fr.slice(0,first).map(x=>x.hip));
    assert(Math.abs(fr[first].hip-seated)<=3,'Prone shown only once sat down: hips at '+Math.round(fr[first].hip)+', seated at '+Math.round(seated)+', standing at '+Math.round(top));
  });
  await T('a miss, then the other attacks at once: the miss is drawn before the next attack is declared',async()=>{
    const r=await bout(browser,{react:['none','parry'],rolls:{'a:Attack':95,'b:Attack':10,'a:Parry':10},attacks:2});
    assert.deepEqual(r.errors,[]);
    const i=r.rec.findIndex(x=>x.type==='contact'&&x.kind==='miss'&&x.actor==='a'),j=r.rec.findIndex(x=>x.type==='intent'&&x.actor==='b'&&x.kind==='attack');
    assert(i>=0&&j>=0,'both were drawn');assert(i<j,'the miss came first');
    assert(r.rec[i].c<=r.rec[j].c,'and earlier on the stage clock');
  });
  await browser.close();console.log(pass+' passed, '+fail+' failed');process.exit(fail?1:0);
})();
