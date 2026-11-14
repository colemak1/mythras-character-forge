// The end of a fight (experiments/practice-combat.html): the Victory screen can be opened again, the whole fight can be
// replayed uninterrupted, the range meter names the range by weapon length, and the scoring layer is gone.
//
//   node tests/visual/pits-replay.cjs        (needs playwright and a static server, see pits-layout.cjs)
const assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const URL_=process.env.PITS_URL||'http://localhost:8765/experiments/practice-combat.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const CFG={mode:'normal',charname:'Goat',weapon:'sword',style:80,armor:0,str:13,siz:13};
const st=page=>page.evaluate(()=>{const S=prototypeCombat.state(),V=prototypeCombat.presentation();
  return {phase:S.phase,busy:!!V.busy,replaying:!!V.replaying,pend:S.pending?S.pending.kind:null,hasR:!!prototypeCombat.pendingRoll(),turn:S.order?S.order[S.turnIndex]:null};});
const click=(page,sel)=>page.evaluate(q=>{const el=[...document.querySelectorAll(q)].find(e=>!e.disabled);if(!el)return false;el.click();return true;},sel);
async function playToEnd(page){
  for(let i=0;i<6000;i++){const s=await st(page);
    if(['between','over'].includes(s.phase)&&!s.busy)return s;
    if(s.busy){if(!(await click(page,'[data-act=continue]')))await click(page,'[data-act=skip]');}
    else if(s.hasR)await click(page,'[data-act=roll]');
    else if(s.pend==='reaction')await click(page,'[data-act=react][data-val=none]');
    else if(s.pend==='effect')await click(page,'[data-act=skipEffect]');
    else if(s.pend==='location')await click(page,'[data-act=pickloc]');
    else if(i>2500&&s.phase==='fight'&&!s.pend&&s.turn==='a'&&await click(page,'[data-act=yield]')){}   // a fight that drags on is conceded
    else if(s.pend)await click(page,'#root .prompt .choice');   // any other choice (resist, withdraw, ...): the first offered
    else if(s.phase==='fight'&&s.turn==='a')await click(page,'[data-act=attack]');
    await sleep(15);}
  throw new Error('the fight did not end');
}
(async()=>{
  const browser=await chromium.launch();let pass=0,fail=0;
  const T=async(name,f)=>{try{await f();console.log('PASS '+name);pass++;}catch(e){console.log('FAIL '+name+': '+e.message.split('\n')[0]);fail++;}};
  const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__psRecord=[];let a=0x2f6e2b1;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
    window.__pitsDie=n=>n===100?Math.ceil(rnd()*60):Math.ceil(rnd()*n);});
  await page.goto(URL_+'?bottom=current');await page.evaluate(c=>{Object.assign(config,c);startRun(false);},CFG);await sleep(400);
  await click(page,'[data-act=speed]');
  await T('the range meter names the range by weapon length (sword, a Medium reach)',async()=>{
    const txt=await page.evaluate(()=>document.querySelector('#pitsStage .ps-rtext')?.textContent);
    assert(/range$/i.test(txt||''),'got '+txt);assert(!/engaged/i.test(txt),'no longer just "Engaged"');
    assert(/^(medium|close|long|very long|touch) range$/i.test(txt));
  });
  await T('no Glory, Momentum, Pit Marks, streak or recap is drawn',async()=>{
    const body=await page.evaluate(()=>document.body.innerText);
    assert(!/Glory|Momentum|Pit Marks|Marks \d|streak|Moment of the bout/i.test(body),'scoring text found');
    assert.equal(await page.evaluate(()=>document.querySelectorAll('.pits-toast,.pits-recap,.pits-marks').length),0);
  });
  let over;
  await T('a whole fight plays to the end',async()=>{over=await playToEnd(page);assert(['between','over'].includes(over.phase));});
  await T('the result screen can be dismissed and opened again',async()=>{
    assert(await page.evaluate(()=>!!document.querySelector('.result-modal')),'the result window is up at the end');
    await click(page,'[data-act=dismissResult]');await sleep(150);
    assert.equal(await page.evaluate(()=>!!document.querySelector('.result-modal')),false,'dismissed');
    assert(await page.evaluate(()=>!!document.querySelector('#root [data-act="showResult"]')),'a Show result button is on the screen');
    await click(page,'[data-act=showResult]');await sleep(150);
    assert(await page.evaluate(()=>!!document.querySelector('.result-modal')),'the result window is back');
    assert(await page.evaluate(()=>!!document.querySelector('.result-modal [data-act="replayFight"]')),'and offers the replay');
    assert.equal(await page.evaluate(()=>/streak/i.test(document.querySelector('.result-modal').innerText)),false,'no streak line');
    await click(page,'[data-act=dismissResult]');await sleep(150);
  });
  await T('Replay fight plays the whole fight again, uninterrupted, from the start to the end',async()=>{
    assert(await page.evaluate(()=>!!document.querySelector('#root [data-act="replayFight"]')),'a Replay fight button is on the screen');
    const finalHp=await page.evaluate(()=>Object.values(prototypeCombat.state().fighters).map(f=>Object.values(f.hp).reduce((a,b)=>a+Math.max(0,b),0)));
    const logs=await page.evaluate(()=>prototypeCombat.state().logs.length);
    await page.evaluate(()=>{window.__psRecord.length=0;window.__replayT0=performance.now();});
    await click(page,'[data-act=replayFight]');await sleep(60);
    let s=await st(page);assert(s.busy&&s.replaying,'replaying');
    const seen={hp:[],continues:0,modal:false,tray:0,dice:0,steps:new Set(),first:null};
    for(let i=0;i<3000;i++){
      s=await st(page);if(!s.busy)break;
      const snap=await page.evaluate(()=>({hp:[...document.querySelectorAll('.plate .tot b')].map(e=>+e.textContent),cont:!!document.querySelector('[data-act=continue]'),
        modal:!!document.querySelector('.result-modal'),tray:!!document.querySelector('#pitsStage .roll'),dice:!!prototypeCombat.presentation().roll,step:prototypeCombat.presentation().step,vis:prototypeCombat.presentation().visibleCount}));
      if(!seen.first)seen.first=snap;seen.hp.push(snap.hp.join('/'));if(snap.cont)seen.continues++;if(snap.modal)seen.modal=true;if(snap.tray)seen.tray++;if(snap.dice)seen.dice++;seen.steps.add(snap.step);
      await sleep(30);
    }
    assert(!s.busy,'the replay finished');
    assert.equal(seen.continues,0,'never stopped for Continue');assert.equal(seen.modal,false,'the result window stays away while it plays');
    // paced by the animation itself: it opens on the first real action and never sits idle between cues
    const rec=await page.evaluate(()=>({t0:window.__replayT0,ev:window.__psRecord.filter(r=>r.type!=='settle').map(r=>r.t)}));
    assert(rec.ev.length>3,'cues were played');
    assert(rec.ev[0]-rec.t0<900,'the first cue starts at once, not after dead initiative beats ('+Math.round(rec.ev[0]-rec.t0)+' ms)');
    const gaps=rec.ev.slice(1).map((t,i)=>t-rec.ev[i]);
    assert(Math.max(...gaps)<2600,'no long stretch with nothing happening (longest gap '+Math.round(Math.max(...gaps))+' ms)');
    assert.equal(seen.tray,0,'no dice tray during the replay');assert.equal(seen.dice,0,'no dice beats during the replay');
    assert(seen.steps.size>5,'many beats played ('+seen.steps.size+')');
    const startHp=seen.first.hp,max=await page.evaluate(()=>Object.values(prototypeCombat.state().fighters).map(f=>Object.values(f.maxHp).reduce((a,b)=>a+b,0)));
    assert.deepEqual(startHp,max,'both fighters start the replay at full health');
    assert(new Set(seen.hp).size>2,'health changed along the way');
    const after=await page.evaluate(()=>({hp:Object.values(prototypeCombat.state().fighters).map(f=>Object.values(f.hp).reduce((a,b)=>a+Math.max(0,b),0)),logs:prototypeCombat.state().logs.length,phase:prototypeCombat.state().phase}));
    assert.deepEqual(after.hp,finalHp,'the fight itself is unchanged');assert.equal(after.logs,logs);assert(['between','over'].includes(after.phase));
  });
  await T('Stop replay cuts it short and the end of the fight is shown as it was',async()=>{
    await click(page,'[data-act=replayFight]');await sleep(80);assert((await st(page)).replaying);
    assert(await page.evaluate(()=>/stop replay/i.test(document.body.innerText)),'a Stop replay button is shown');
    await click(page,'[data-act=skip]');await sleep(200);const s=await st(page);assert(!s.busy&&!s.replaying);
  });
  assert.deepEqual(errors,[]);
  await browser.close();console.log(`${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
