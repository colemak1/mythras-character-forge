// Scripted bouts on the spring trial (?stage=spring), each dice roll chosen, for faults the owner reported from play
// (2026-11-13). Real browser; needs playwright and a static server (python3 -m http.server 8765).
//   - Impale, "Leave it in the wound": the weapon is drawn lodged in the wound and is not also thrown to the floor
//   - a successful Trip: the tripped fighter goes down, and the plate's Prone chip waits for the figure
//   - a miss, then the other's attack: the miss is drawn before the next attack is declared
//   - a Disarm won on a parry, or an attacker's Disarm against a parry: the weapon leaves once, at the parry
//   - Impale on the cinematic stage: the weapon is in the wound from the blow's contact
//   - a finishing blow with Choose Location: its own finish (the arm: the weapon falls and stays down)
//   - a finishing blow with the attacker's Trip or Disarm: its own finish (the Disarm's weapon stuck in the floor)
//
//   node tests/visual/pits-spring-scripted.cjs
const assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const BASE=process.env.PITS_URL||'http://localhost:8765/experiments/practice-combat.html',URL_=BASE+'?stage=spring';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PS_LODGE_IN_MAX=14;   // the lodged point is drawn 10 inside the wound
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
  await p.goto(sc.url||URL_);
  await p.evaluate(c=>{const fly=window.psFlyWeapon;window.psFlyWeapon=function(f,m,o){window.__psRecord.push({type:'fly',actor:f.id,c:PS.clock});return fly(f,m,o);};
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
    else if(s.pend==='reaction'){const r=(sc.react||[])[nr++]||'none';await click('[data-pa=def][data-val='+r+']');   // the deck: pick, then confirm
      await click('[data-act=react][data-val='+r+']')||await click('[data-act=react][data-val=none]');}
    else if(s.pend==='effect'){if(sc.effect)await click('[data-pa=fx][data-val="'+sc.effect+'"]');   // the deck: pick the chip, then confirm
      if(!(sc.effect&&await click('[data-act=effect][data-val="'+sc.effect+'"]')))await click('[data-act=skipEffect]');}
    else if(s.pend&&sc.pick&&sc.pick[s.pend])await click(sc.pick[s.pend]);
    else if(s.pend)await click('#root .prompt .choice:not([data-act=yield]):not([data-act=help])');
    else{if(attacks++>=(sc.attacks||1))break;await click('[data-act=attack]');}
    await sleep(100);}
  await sleep(1200);
  const out=await p.evaluate(()=>({rec:window.__psRecord.map(r=>({type:r.type,kind:r.kind||r.outcome||r.finish||'',actor:r.actor,c:Math.round(r.c||0)})),
    lodged:document.querySelectorAll('#pitsStage .ps-lodged').length,dropped:document.querySelectorAll('#pitsStage .ps-dropped').length,
    dropT:(document.querySelector('#pitsStage .ps-dropped')||{getAttribute:()=>''}).getAttribute('transform'),
    prone:{a:!!prototypeCombat.state().fighters.a.prone,b:!!prototypeCombat.state().fighters.b.prone},
    hips:{a:PS.fig.a.pts&&PS.fig.a.pts.P?Math.round(PS.fig.a.pts.P[1]):null,b:PS.fig.b.pts&&PS.fig.b.pts.P?Math.round(PS.fig.b.pts.P[1]):null}}));
  const frames=await p.evaluate(()=>window.__fr);
  const held=await p.evaluate(()=>{const f=PS.fig.a,el=document.querySelector('#pitsStage .ps-lodged');
    const shaft=f.e&&f.e.shaft?getComputedStyle(f.e.shaft).display:'?';
    // the lodged weapon's far end (its grip) against the hand, in stage coordinates
    let gap=null;if(el&&f.pts){const m=el.getCTM&&el.getCTM(),bb=el.getBBox();const w=PS.fig.b,lo=(PS.fighters.lodged.b||[])[0];
      if(lo){const P=psBodyPt(w,lo.loc),H=psWorld(f,f.pts.hand),len=pitsStageWeaponKind(lo.weapon,3).len;gap=Math.abs(Math.hypot(H[0]-P[0],H[1]-P[1])-(len-PS_LODGE_IN));}}
    // which end of the lodged weapon is at the wound: the point (owner, 2026-11-16: "the hilt ... is what is impaling")
    let pointIn=null;const lo2=(PS.fighters.lodged.b||[])[0];
    if(el&&lo2){const m=/translate\(([-\d.]+),([-\d.]+)\) rotate\(([-\d.]+)\)/.exec(el.getAttribute('transform')||'');
      if(m){const c=[+m[1],+m[2]],a=(+m[3])*Math.PI/180,len=pitsStageWeaponKind(lo2.weapon,3).len,P=psBodyPt(PS.fig.b,lo2.loc);
        const tip=[c[0]+Math.cos(a)*len/2,c[1]+Math.sin(a)*len/2],grip=[c[0]-Math.cos(a)*len/2,c[1]-Math.sin(a)*len/2];
        pointIn={tip:Math.round(Math.hypot(tip[0]-P[0],tip[1]-P[1])),grip:Math.round(Math.hypot(grip[0]-P[0],grip[1]-P[1]))};}}
    return {shaft,gap,pointIn,lodged:document.querySelectorAll('#pitsStage .ps-lodged').length};});
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
  // (owner, 2026-11-16: "parry into disarm disarms twice", then "the disarm should happen on the parry ... it should be
  // the same hit that disarms. Also offensive [disarms] still happen twice"). On both stages: the weapon is thrown once,
  // at the parry's own contact, with no second bind; one weapon on the floor.
  for(const [stage,url] of [['cinematic',BASE],['spring',URL_]])
    for(const [who,sc] of [['a parry that wins a Disarm',{react:['parry'],effect:'disarm',rolls:{'a:Attack':40,'b:Parry':3,'a:Resist':99}}],
                           ['an attacker\'s Disarm against a parry',{react:['parry'],effect:'disarm',rolls:{'a:Attack':1,'b:Parry':60,'b:Resist':99}}]])
    await T(who+': the weapon leaves the hand once, at the parry ('+stage+' stage)',async()=>{
      const r=await bout(browser,{url,...sc,attacks:1});
      assert.deepEqual(r.errors,[]);
      const fly=r.rec.filter(x=>x.type==='fly'),dis=r.rec.filter(x=>x.type==='contact'&&x.kind==='disarm'),
        par=r.rec.find(x=>x.type==='contact'&&/parr|deflect/.test(x.kind));
      assert(par,'the parry was drawn: '+JSON.stringify(r.rec.filter(x=>x.type==='contact')));
      assert.equal(dis.length,1,'one Disarm contact: '+JSON.stringify(dis));
      assert.equal(fly.length,1,'one throw: '+JSON.stringify(fly));
      assert.equal(dis[0].c,par.c,'the Disarm is the parry\'s own contact');
      assert.equal(r.dropped,1,'one weapon on the floor');
    });
  // (owner, 2026-11-16: "Impale ... doesn't get stuck in the wound immediately, the swing happens then the blade
  // teleports to the wound"). The cinematic stage: the weapon is in the wound at the blow's contact; left in, the hand
  // opens after it; one weapon in the wound, none thrown.
  for(const how of ['leave','hold'])
    await T('Impale ('+how+'): in the wound from the contact (cinematic stage)',async()=>{
      const r=await bout(browser,{url:BASE,config:{weapon:'rapier'},react:['none'],effect:'impale',rolls:{'a:Attack':1},
        pick:{impaleLeave:'[data-act=impaleLeave][data-val='+how+']'},attacks:1});
      assert.deepEqual(r.errors,[]);
      const hit=r.rec.find(x=>x.type==='contact'&&x.kind==='wound'),lod=r.rec.find(x=>x.type==='lodge'),rel=r.rec.find(x=>x.type==='release');
      assert(hit&&lod,'the thrust landed and lodged: '+JSON.stringify(r.rec));
      assert.equal(lod.c,hit.c,'lodged at the contact');
      if(how==='leave')assert(rel&&rel.c>hit.c,'the hand opens after the contact');else assert(!rel,'kept hold: the hand stays');
      assert.equal(r.lodged,1,'one weapon in the wound');
      assert.deepEqual(r.rec.filter(x=>x.type==='fly'),[],'no weapon thrown');
      assert(r.held.pointIn&&r.held.pointIn.tip<=PS_LODGE_IN_MAX&&r.held.pointIn.grip>r.held.pointIn.tip,'the point is in the wound, not the grip: '+JSON.stringify(r.held.pointIn));
    });
  // (owner, 2026-11-16: finishes by the final blow's Special Effect). Choose Location is picked by a person, so it is
  // shown in an earlier batch than the blow: the finish still follows it. An arm: the weapon falls and stays down.
  for(const [loc,want] of [['Right Arm','armdrop'],['Head','headshot']])
    await T('a finishing blow with Choose Location ('+loc+') has its own finish (cinematic stage)',async()=>{
      const r=await bout(browser,{url:BASE,config:{str:18,siz:18,pvpCon:3,pvpSiz:3,weapon:'greatsword'},react:['none'],effect:'choose',rolls:{'a:Attack':1},
        pick:{location:'[data-act=pickloc][data-val="'+loc+'"]'},attacks:1});
      assert.deepEqual(r.errors,[]);
      const mv=r.rec.find(x=>x.type==='move'),hit=r.rec.find(x=>x.type==='contact'&&x.kind==='wound');
      assert(hit&&r.rec.some(x=>x.type==='collapse'),'the blow finished the fight: '+JSON.stringify(r.rec));
      assert.equal(mv&&mv.kind,want,'the finish');
      if(want==='armdrop'){const fly=r.rec.filter(x=>x.type==='fly');assert.equal(fly.length,1,'the weapon falls once');assert(fly[0].c>hit.c,'after the blow');
        assert.equal(r.dropped,1,'and stays on the floor');}
    });
  // (owner, 2026-11-16: "do disarm and trip finishes next"). The attacker's Trip that works, or its Disarm, on the blow
  // that ends the fight: its own finish; the Disarm's weapon ends stuck point down in the floor.
  for(const [eff,rolls,want] of [['trip',{'a:Attack':1,'b:Trip':99,'b:Brawn':99,'b:Evade':99},'tripped'],['disarm',{'a:Attack':1,'b:Resist':99},'disarmed']])
    await T('a finishing blow with '+eff+' has its own finish (cinematic stage)',async()=>{
      const r=await bout(browser,{url:BASE,config:{str:18,siz:18,pvpCon:3,pvpSiz:3,weapon:'greatsword'},react:['none'],effect:eff,rolls,attacks:1});
      assert.deepEqual(r.errors,[]);
      const mv=r.rec.find(x=>x.type==='move');
      assert(r.rec.some(x=>x.type==='collapse'),'the blow finished the fight: '+JSON.stringify(r.rec));
      assert.equal(mv&&mv.kind,want,'the finish');
      if(eff==='disarm'){assert.equal(r.rec.filter(x=>x.type==='fly').length,1,'the weapon flies once');assert.equal(r.dropped,1);
        assert(/rotate\(90\)/.test(r.dropT||''),'stuck point down: '+r.dropT);}
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
