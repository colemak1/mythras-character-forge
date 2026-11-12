// The ten-beat fight study page (experiments/pits-fight-study.html) in a real browser:
//   - it builds and draws without errors, quickly enough to open
//   - it plays straight through by default (decision stops off); half speed takes about twice as long
//   - with decision stops on, it holds the exact pose at each boundary and resumes from it without a jump
//   - beat buttons land on their beats; the scrubber has ten numbered beat marks; smears and flashes can be turned off
//
//   node tests/visual/pits-fight-page.cjs     (needs playwright and a static server on :8765, see pits-layout.cjs)
//   PITS_SHOTS=dir  also saves the page at 390 and 1280 wide, light and dark
const assert=require('node:assert/strict'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const URL_=process.env.PITS_URL||'http://localhost:8765/experiments/pits-fight-study.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let passed=0;const ok=n=>{passed++;console.log('PASS '+n);};
(async()=>{
  const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const t0=Date.now();await page.goto(URL_+'?still');const loadMs=Date.now()-t0;
  const S=()=>page.evaluate(()=>{const x=window.pitsExchange,s=x.state;return {td:s.td,playing:s.playing,held:!!s.held,total:x.total,
    first:window.PitsSpring.shownAt(x.seq,x.seq.pauses[0].t),figs:document.getElementById('pcFigs').innerHTML};});
  let s=await S();assert(s.figs.includes('ps-fig'));assert.deepEqual(errors,[]);
  assert(loadMs<6000,'the page took '+loadMs+' ms to open');
  assert.equal(await page.isChecked('#pcDecide'),false,'decision stops should start off');
  ok('the fight page builds and draws ('+loadMs+' ms), decision stops off');
  const marks=await page.$$eval('#pcMarks i.beat',m=>m.map(i=>i.dataset.n));assert.deepEqual(marks,['1','2','3','4','5','6','7','8','9','10']);
  ok('ten numbered beat marks on the scrubber');

  // straight through at 4x the page speed would be too fast to measure honestly; measure the first 3 s at each speed
  const run=async speed=>{await page.selectOption('#pcSpeed',String(speed));await page.evaluate(()=>window.pitsExchange.seekShown(0));
    await page.click('#pcPlay');await sleep(1500);s=await S();await page.click('#pcPlay');return s.td;};
  const n=await run(1),h=await run(.5);
  assert(!s.held,'stopped for a decision with stops off');
  assert(n>1200&&h>500&&h<n*.7,'normal advanced '+n.toFixed(0)+' ms, half '+h.toFixed(0)+' ms in the same time');
  ok('continuous playback; half speed covers about half the fight time ('+Math.round(n)+' vs '+Math.round(h)+' ms in 1.5 s)');

  // decision stops on: holds at the first boundary, the picture stays, resume continues from it
  await page.check('#pcDecide');await page.selectOption('#pcSpeed','1');await page.evaluate(()=>window.pitsExchange.seekShown(0));
  await page.click('#pcPlay');for(let i=0;i<300;i++){await sleep(25);s=await S();if(!s.playing)break;}
  assert(s.held&&Math.abs(s.td-s.first)<1,'did not hold at the first decision');
  const f0=s.figs;await sleep(300);assert.equal((await S()).figs,f0,'the picture moved while held');
  await page.selectOption('#pcSpeed','0.25');await page.click('#pcPlay');await sleep(80);
  const jump=await page.evaluate(()=>{const x=window.pitsExchange,P=window.PitsSpring,t=P.seqTime(x.seq,x.state.td),t0=x.seq.pauses[0].t;
    let m=0;for(const id of ['a','b'])for(const n of ['Hd','P','Hn','tip','F','bF']){const a=P.world(x.seq,id,t0,n),b=P.world(x.seq,id,t,n);m=Math.max(m,Math.hypot(a[0]-b[0],a[1]-b[1]));}return m;});
  await page.click('#pcPlay');
  assert(jump<3,'jumped '+jump.toFixed(1)+' on resume');
  ok('decision stops on: the exact pose is held, and play resumes from it without a jump ('+jump.toFixed(2)+')');

  // beat buttons and the smear toggle
  const btns=await page.$$eval('#pcJumps button',b=>b.map(x=>x.textContent));assert.equal(btns.length,11);
  await page.click('#pcJumps button:nth-child(9)');
  const at=await page.evaluate(()=>{const x=window.pitsExchange;return [x.state.td,window.PitsSpring.shownAt(x.seq,x.seq.beats[8].t)];});
  assert(Math.abs(at[0]-at[1])<1,'beat 9 button');
  // a fast moment: smears drawn with the layer on, none with it off
  const smeared=await page.evaluate(()=>{const x=window.pitsExchange;let n=0;
    for(const c of x.seq.contactList)for(let t=c.t-120;t<=c.t;t+=4){x.seek(t);if(document.getElementById('pcFx').innerHTML.includes('pc-smear'))n++;}return n;});
  assert(smeared>0,'no smear drawn in the strikes before any contact');
  await page.uncheck('#pcSmear');
  const off=await page.evaluate(()=>document.getElementById('pcFx').innerHTML);assert.equal(off,'','smears or flashes drawn with the layer off');
  await page.check('#pcSmear');
  ok('beat buttons land on their beats; smears and flashes can be switched off');
  assert.deepEqual(errors,[]);

  if(process.env.PITS_SHOTS){
    for(const [w,hh] of [[390,844],[1280,900]])for(const mode of ['light','dark']){
      const p=await browser.newPage({viewport:{width:w,height:hh}});
      await p.addInitScript(m=>{try{localStorage.setItem('sitota-mode',m);}catch(e){}},mode);
      await p.goto(URL_+'?still');await p.evaluate(()=>{const x=window.pitsExchange;x.seek(x.seq.contactList[5].t+20);});
      await p.screenshot({path:path.join(process.env.PITS_SHOTS,'fight-'+w+'-'+mode+'.png'),fullPage:true});
      assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)),'horizontal scroll at '+w+' '+mode);
      await p.close();
    }
    ok('no horizontal scroll at 390 or 1280, light or dark (screenshots saved)');
  }
  await browser.close();console.log(passed+' passed');
})().catch(e=>{console.error(e);process.exit(1);});
