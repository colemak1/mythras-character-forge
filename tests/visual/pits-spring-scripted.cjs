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
      if(n===10)return (window.__d10=(window.__d10||0)+1)%2?10:1;return Math.ceil(n/2);};});
  await p.goto(URL_);
  await p.evaluate(c=>{const fly=window.psFlyWeapon;window.psFlyWeapon=function(f,m){window.__psRecord.push({type:'fly',actor:f.id,c:PS.clock});return fly(f,m);};
    const emit=window.psEmit;window.psEmit=function(t,d){emit(t,d);const r=window.__psRecord[window.__psRecord.length-1];if(r&&r.type===t)r.c=PS.clock;};
    Object.assign(config,{mode:'pvp',charname:'Aurel',pvpName:'Brann',style:60,pvpSkill:60,weapon:'sword',pvpWeapon:'sword',armor:0,pvpArmor:0},c||{});startRun(false);},sc.config);
  const st=()=>p.evaluate(()=>{const S=prototypeCombat.state(),V=prototypeCombat.presentation(),R=prototypeCombat.pendingRoll();
    return {phase:S.phase,busy:!!V.busy,pend:S.pending?S.pending.kind:null,R:R?R.actor+':'+R.label.split(' ')[0]:null};});
  const click=q=>p.evaluate(q=>{const e=[...document.querySelectorAll(q)].find(x=>!x.disabled);if(!e)return false;
    e.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true;},q);
  let attacks=0,nr=0,bz=0;
  for(let i=0;i<500;i++){const s=await st();
    if(s.busy){if(++bz>250)break;await sleep(40);continue;}bz=0;
    if(s.phase!=='fight')break;
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
  await p.close();return {...out,errors};
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
  await T('a successful Trip: the tripped fighter goes down onto the floor',async()=>{
    const r=await bout(browser,{react:['none'],effect:'trip',rolls:{'a:Attack':10,'b:Trip':99,'b:Brawn':99,'b:Evade':99},attacks:1});
    assert.deepEqual(r.errors,[]);
    assert(r.rec.some(x=>x.type==='contact'&&x.kind==='trip'),'the trip was drawn');
    assert(r.prone.b,'the engine has the defender prone');
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
