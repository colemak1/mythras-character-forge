// The exchange study page (experiments/pits-exchange-study.html) in a real browser:
//   - it loads and plays without errors, at normal and half speed (half speed takes about twice as long)
//   - with "Stop where a decision would be made" ticked, playback stops on the held pose; Resume continues from it
//     without a jump; unticked, it plays straight through
//   - one frame back and forward moves the bar by 1/60 s; the jump buttons land on their moments
//   - the inspection overlays draw (planted feet, centre of mass, contact point, clearance line)
//
//   node tests/visual/pits-exchange.cjs     (needs playwright and a static server on :8765, see pits-layout.cjs)
//   PITS_SHOTS=dir  also saves the page at 390 and 1280 wide, light and dark
const assert=require('node:assert/strict'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const URL_=process.env.PITS_URL||'http://localhost:8765/experiments/pits-exchange-study.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let passed=0;const ok=n=>{passed++;console.log('PASS '+n);};
(async()=>{
  const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL_+'?still');
  const S=()=>page.evaluate(()=>{const x=window.pitsExchange,s=x.state;
    return {td:s.td,playing:s.playing,held:!!s.held,P1:window.PitsSpring.shownAt(x.seq,x.seq.P1),total:x.total,
      figs:document.getElementById('pcFigs').innerHTML};});
  let s=await S();assert(s.figs.includes('ps-fig'),'no figures drawn');assert.deepEqual(errors,[]);ok('the page loads and draws both fighters');

  // normal speed: time to the decision hold
  const toHold=async speed=>{
    await page.selectOption('#pcSpeed',String(speed));await page.evaluate(()=>window.pitsExchange.seekShown(0));
    const t0=Date.now();await page.click('#pcPlay');
    for(let i=0;i<400;i++){await sleep(25);s=await S();if(!s.playing)break;}
    return {ms:Date.now()-t0,s};
  };
  const n=await toHold(1);
  assert(n.s.held,'normal speed did not stop at the decision');assert(Math.abs(n.s.td-n.s.P1)<1,'stopped at '+n.s.td+', not at the hold');
  ok('normal speed stops on the held decision pose ('+n.ms+' ms of playback)');
  const h=await toHold(.5);
  assert(h.s.held&&Math.abs(h.s.td-h.s.P1)<1,'half speed did not stop at the hold');
  assert(h.ms>n.ms*1.6,'half speed is not slower ('+h.ms+' vs '+n.ms+' ms)');
  ok('half speed reaches the same hold in about twice the time ('+h.ms+' ms)');

  // the hold: nothing moves while held; Resume continues from the held picture
  const f0=(await S()).figs;await sleep(300);assert.equal((await S()).figs,f0,'the picture moved while held');
  const btn=await page.textContent('#pcPlay');assert.equal(btn,'Resume');
  await page.selectOption('#pcSpeed','0.25');await page.click('#pcPlay');await sleep(60);
  s=await S();assert(s.td>h.s.P1&&s.td<h.s.P1+60,'resume did not continue from the hold ('+s.td+')');
  const jump=await page.evaluate(()=>{const x=window.pitsExchange,P=window.PitsSpring,t=P.seqTime(x.seq,x.state.td);
    let m=0;for(const id of ['a','b'])for(const n of ['Hd','P','Hn','tip','F','bF']){
      const a=P.world(x.seq,id,x.seq.P1,n),b=P.world(x.seq,id,t,n);m=Math.max(m,Math.hypot(a[0]-b[0],a[1]-b[1]));}return m;});
  assert(jump<3,'the figures jumped '+jump.toFixed(1)+' when play resumed');
  ok('held pose: still while waiting; Resume continues from it without a jump ('+jump.toFixed(2)+' units)');
  await page.click('#pcPlay');

  // decision stops off: plays straight through to the end
  await page.uncheck('#pcDecide');await page.selectOption('#pcSpeed','1');await page.evaluate(()=>window.pitsExchange.seekShown(0));
  await page.click('#pcPlay');for(let i=0;i<400;i++){await sleep(25);s=await S();if(!s.playing)break;}
  assert(!s.held&&Math.abs(s.td-s.total)<1,'did not play through to the end');ok('with decision stops off, it plays straight through');
  await page.check('#pcDecide');

  // frame stepping and the jump buttons
  await page.evaluate(()=>window.pitsExchange.seekShown(1000));
  await page.click('#pcFwd');s=await S();assert(Math.abs(s.td-1000-1000/60)<.01);
  await page.click('#pcBack');await page.click('#pcBack');s=await S();assert(Math.abs(s.td-1000+1000/60)<.01);
  ok('one frame forward and back is 1/60 s');
  const jumps=await page.$$eval('#pcJumps button',b=>b.map(x=>x.textContent));
  assert.deepEqual(jumps,['Parry contact','Held for the decision','Counter lands','Wound reaction','End pose']);
  await page.click('#pcJumps button:first-child');
  const at=await page.evaluate(()=>{const x=window.pitsExchange;return [x.state.td,window.PitsSpring.shownAt(x.seq,x.seq.tc)];});
  assert(Math.abs(at[0]-at[1])<1);ok('the jump buttons land on their moments');

  // overlays
  for(const id of ['#pcFeet','#pcClear','#pcPath'])await page.check(id);
  const ov=await page.evaluate(()=>{const g=document.getElementById('pcInspect').innerHTML;
    return {plant:(g.match(/pc-plant/g)||[]).length,com:(g.match(/pc-com/g)||[]).length,contact:g.includes('pc-contact'),
      read:document.getElementById('pcReadout').textContent};});
  assert(ov.plant>=4&&ov.com===2&&ov.contact,'overlays missing at the contact');
  assert(/0\.0 and 0\.0 units from the contact point/.test(ov.read),'readout: '+ov.read);
  await page.click('#pcJumps button:nth-child(2)');
  assert((await page.innerHTML('#pcInspect')).includes('pc-gap'),'no clearance line at the hold');
  ok('overlays: planted feet, centre of mass, the contact point (both blades on it) and the clearance line');
  assert.deepEqual(errors,[]);

  if(process.env.PITS_SHOTS){
    for(const [w,h] of [[390,844],[1280,900]])for(const mode of ['light','dark']){
      const p=await browser.newPage({viewport:{width:w,height:h}});
      await p.addInitScript(m=>{try{localStorage.setItem('sitota-mode',m);}catch(e){}},mode);
      await p.goto(URL_+'?still');await p.evaluate(()=>{const x=window.pitsExchange;document.getElementById('pcFeet').click();x.seek(x.seq.tc);});
      await p.screenshot({path:path.join(process.env.PITS_SHOTS,'exchange-'+w+'-'+mode+'.png'),fullPage:true});
      const over=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
      assert(!over,'horizontal scroll at '+w+' '+mode);await p.close();
    }
    ok('no horizontal scroll at 390 or 1280, light or dark (screenshots saved)');
  }
  await browser.close();console.log(passed+' passed');
})().catch(e=>{console.error(e);process.exit(1);});
