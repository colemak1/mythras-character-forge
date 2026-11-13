// The spring trial on the live Pits stage (?stage=spring: experiments/pits-spring-live.js drives the figures with the
// exchange writer). Whole bouts in a real browser, left to play at their own pace, for blade pairings (one with shields);
// a pairing without a family falls back to the movement stage. Nothing here is released (owner, 2026-11-13).
//   - no page errors and no cue errors; every kind of blow reaches its contact
//   - a declared action is drawn before its dice (the attacker's weapon drawn back, the defender's ward or crouch),
//     and then the picture is completely still: no joint moves while the stage clock is stopped, and the clock only
//     runs for written movement (never through a person's choice or the dice)
//   - nobody gets up while the engine has them on the ground (the evader that went down early, stood up to be hit
//     and went down again), and there is no reset to stances between rounds
//   - the figures are always drawn (finite joints) and the replay of the whole fight plays without errors
//   - ?stage=poses still opens the earlier pose stage
//
//   node tests/visual/pits-spring-live.cjs     (needs playwright and a static server, see pits-layout.cjs)
//   PITS_SHOTS=dir  also saves a stage screenshot at the first contact of each kind
const assert=require('node:assert/strict'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const URL_=(process.env.PITS_URL||'http://localhost:8765/experiments/practice-combat.html')+'?stage=spring';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const st=page=>page.evaluate(()=>{const S=prototypeCombat.state(),V=prototypeCombat.presentation();
  return {phase:S.phase,busy:!!V.busy,pend:S.pending?S.pending.kind:null,hasR:!!prototypeCombat.pendingRoll(),turn:S.order?S.order[S.turnIndex]:null,
    paused:PS.paused,clock:PS.clock,motion:PS_MOTION,spring:!!PS.springOn,round:S.round,
    finite:['a','b'].every(i=>{const p=PS.fig[i].pts;return !p||['Sh','H','F','bF','Hn','tip'].every(k=>Number.isFinite(p[k][0])&&Number.isFinite(p[k][1]));})};});
const click=(page,q)=>page.evaluate(q=>{const e=[...document.querySelectorAll(q)].find(x=>!x.disabled);if(!e)return false;e.click();return true;},q);
async function bout(browser,cfg,seed,shots){
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
  await page.addInitScript(s=>{window.__psRecord=[];let a=s;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
    window.__pitsDie=n=>Math.ceil(rnd()*n);
    // every animation frame: the stage clock, what the page is waiting for, and where the figures are
    window.__frames=[];const tick=()=>{try{if(typeof PS!=='undefined'&&PS.fig&&PS.fig.a&&PS.fig.a.pts&&PS.fig.b.pts&&typeof prototypeCombat!=='undefined'){
        const S=prototypeCombat.state(),V=prototypeCombat.presentation();
        const P=id=>{const f=PS.fig[id],p=f.pts;return {j:['H','hand','tip','hd','F','bF'].map(k=>[Math.round(f.X+f.face*p[k][0]),Math.round(p[k][1])]),ep:!!S.fighters[id].prone};};
        window.__frames.push({t:performance.now(),c:PS.clock,wait:!V.busy&&S.phase==='fight',dice:!!(V.busy&&V.roll&&!V.roll.settled),a:P('a'),b:P('b')});}}catch(e){}
      requestAnimationFrame(tick);};requestAnimationFrame(tick);},seed);
  await page.goto(URL_);await page.evaluate(c=>{Object.assign(config,c);startRun(false);},cfg);await sleep(300);
  const out={paused:0,frozenMoves:0,stalls:0,page};let prev=null,busySince=0,shot={};let nr=0;
  for(let i=0;i<4000;i++){
    const s=await st(page);assert(s.finite,'a figure has a non-finite joint');
    if(prev&&prev.paused&&s.paused){out.paused++;if(Math.abs(s.clock-prev.clock)>0.5)out.frozenMoves++;}
    prev=s;
    if(shots){const rec=await page.evaluate(()=>window.__psRecord.filter(r=>r.type==='contact').map(r=>r.kind));
      for(const k of rec)if(!shot[k]){shot[k]=1;await (await page.$('#pitsStage .ps-stage')).screenshot({path:path.join(shots,cfg.weapon+'-'+cfg.pvpWeapon+'-'+k+'.png')});}}
    if(['between','over'].includes(s.phase)&&!s.busy)break;
    if(s.busy){if(!busySince)busySince=Date.now();if(Date.now()-busySince>4000){out.stalls++;await click(page,'[data-act=continue]');busySince=0;}await sleep(40);continue;}
    busySince=0;
    if(s.hasR)await click(page,'[data-act=roll]');
    // (the reaction depends on how many there have been, not on the loop's timing, so the same fight plays each run)
    else if(s.pend==='reaction'){nr++;await click(page,'[data-act=react][data-val='+(nr%3===1?'evade':nr%3===2?'parry':'none')+']')||await click(page,'[data-act=react][data-val=none]');}
    else if(s.pend==='effect')await click(page,'#root .prompt [data-act=effect]')||await click(page,'[data-act=skipEffect]');
    else if(s.pend==='location')await click(page,'[data-act=pickloc]');
    else if(i>2500&&s.phase==='fight'&&!s.pend&&await click(page,'[data-act=yield]')){}
    else if(s.pend)await click(page,'#root .prompt [data-act=stand]')||await click(page,'#root .prompt .choice:not([data-act=yield]):not([data-act=help])');   // (never concedes by accident; stands up after an evade)
    else if(s.phase==='fight')await click(page,'[data-act=attack]');
    await sleep(40);
  }
  out.end=await st(page);
  out.rec=await page.evaluate(()=>window.__psRecord.map(r=>({type:r.type,kind:r.kind,message:r.message,actor:r.actor})));
  // from the frames: movement with the clock stopped; the clock running while the page waits or the dice roll, beyond
  // a declared action getting to its hold; getting up while the engine has the fighter prone
  const fr=await page.evaluate(()=>window.__frames);out.still=0;out.ran=0;out.rose=0;
  let run=0;const low={a:false,b:false};
  for(let i=1;i<fr.length;i++){const f=fr[i],g=fr[i-1];
    if(f.c===g.c)for(const id of ['a','b']){const k=f[id].j.findIndex((p,k)=>Math.hypot(p[0]-g[id].j[k][0],p[1]-g[id].j[k][1])>1);
      if(k>=0){out.still++;out.stillWhat=id+'.'+['H','hand','tip','hd','F','bF'][k]+' at clock '+Math.round(f.c)+' '+JSON.stringify(g[id].j[k])+'->'+JSON.stringify(f[id].j[k]);break;}}
    if((f.wait&&g.wait)||(f.dice&&g.dice)){if(f.c!==g.c){run+=f.c-g.c;out.ran=Math.max(out.ran,run);}else run=0;}else run=0;
    for(const id of ['a','b']){const y=f[id].j[0][1];if(!low[id]&&y>-32)low[id]=true;else if(low[id]&&y<-55){low[id]=false;if(f[id].ep)out.rose++;}}}
  return out;
}
(async()=>{
  const browser=await chromium.launch();let pass=0,fail=0;
  const T=async(name,f)=>{try{await f();console.log('PASS '+name);pass++;}catch(e){console.log('FAIL '+name+': '+e.message.split('\n')[0]);fail++;}};
  const base={mode:'pvp',charname:'Aurel',pvpName:'Brann',style:75,pvpSkill:70,armor:0,pvpArmor:0,str:13,siz:13,pvpStr:13,pvpSiz:13};
  const shots=process.env.PITS_SHOTS||null;const kinds=new Set();let first=null;
  // (seed 21: a full fight with a successful evade under this reaction order; some seeds end in one exchange, when the
  // first blow disables the opponent's weapon arm and the engine has it concede)
  for(const [w,v,seed,sh] of [['sword','dagger',21],['rapier','shortsword',23],['sword','sword',5,{shield:'heater',pvpShield:'buckler'}]]){
    await T(`a whole bout, ${w} against ${v}${sh?' with shields':''}, plays on the spring trial with no errors`,async()=>{
      const r=await bout(browser,{...base,weapon:w,pvpWeapon:v,...(sh||{})},seed,shots);
      if(!first)first=r.page;else await r.page.close();
      assert(r.end.spring,'the spring trial is on for this bout');
      assert(['between','over'].includes(r.end.phase),'the bout ended ('+r.end.phase+')');
      assert.deepEqual(r.page.errors,[]);
      const errs=r.rec.filter(x=>x.type==='cue-error');assert.deepEqual(errs,[],'cue errors: '+JSON.stringify(errs));
      const c=r.rec.filter(x=>x.type==='contact');assert(c.length>=1,'contacts were drawn ('+c.length+')');c.forEach(x=>kinds.add(x.kind));
      assert(r.paused>0,'the scene paused for a decision at least once');
      // every attack is declared (the weapon drawn back) before its dice are shown, by the fighter that attacks
      const seen=r.rec.filter(x=>x.type==='intent'||x.type==='attack'||x.type==='resolve');let open=null;
      for(const x of seen){if(x.type==='intent'&&/attack|strike/.test(x.kind))open=x.actor;
        else if(x.type==='attack')assert.equal(open,x.actor,'an attack was shown without its declared movement');
        else if(x.type==='resolve')open=null;}
      assert(r.rec.some(x=>x.type==='intent'&&/parry|shield|evade/.test(x.kind)),'a declared defence was drawn');
      assert(!r.rec.some(x=>x.type==='round-reset'),'no reset to stances between rounds');
      assert.equal(r.still,0,'nothing moved while the stage clock was stopped ('+r.still+' frames: '+r.stillWhat+')');
      // (a declared action getting to its hold takes well under a second of the stage clock, a step in included)
      assert(r.ran<950,'the clock ran '+Math.round(r.ran)+' ms while the page waited for a person or the dice');
      assert.equal(r.rose,0,'a fighter the engine has prone got up');
      assert(r.stalls<=2,'the playback paced itself ('+r.stalls+' stalls)');
    });
  }
  await T('blows of several kinds reached their contact (a wound, a parry and an evade)',async()=>{
    assert(kinds.has('wound'),'a wound: '+[...kinds]);
    assert(kinds.has('evaded'),'an evade: '+[...kinds]);
    assert([...kinds].some(k=>/parr|deflect|ward/.test(k)),'a parry: '+[...kinds]);
  });
  await T('the whole fight replays on the spring trial without errors',async()=>{
    // (the first bout's page has sat in a background tab while the others ran, where the browser throttles its
    // animation clock: bring it to the front before replaying)
    const page=first;await page.bringToFront();page.errors.length=0;await page.evaluate(()=>{window.__psRecord.length=0;});
    if(!await click(page,'[data-act=replayFight]')){await click(page,'[data-act=dismissResult]');await sleep(150);assert(await click(page,'[data-act=replayFight]'),'a Replay fight button');}
    for(let i=0;i<1500;i++){const s=await st(page);if(!s.busy&&i>10)break;await sleep(60);}
    const rec=await page.evaluate(()=>window.__psRecord.map(r=>r.type));
    assert(rec.filter(t=>t==='contact').length>=3,'the replay drew the contacts again');
    assert(!rec.includes('cue-error'));assert.deepEqual(page.errors,[]);await page.close();
  });
  await T('a pairing without a family (longspear) keeps the movement stage',async()=>{
    const page=await browser.newPage();await page.goto(URL_);
    await page.evaluate(c=>{Object.assign(config,c);startRun(false);},{...base,weapon:'longspear',pvpWeapon:'sword'});await sleep(800);
    const s=await st(page);assert.equal(s.spring,false);assert.equal(s.motion,true);await page.close();
  });
  await browser.close();console.log(`${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
