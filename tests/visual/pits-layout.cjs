// Layout and cancellation checks for the Pits arena (docs/pits-visual-review-20261111.md: VIS-05, VIS-06,
// and the replay-cancellation requirement). Real browser, scripted dice; see pits-scenarios.cjs.
//
//   node tests/visual/pits-layout.cjs        (needs playwright and a static server)
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const URL_=process.env.PITS_URL||'http://localhost:8765/experiments/practice-combat.html';
const OUT=process.env.PITS_OUT||path.join(__dirname,'..','..','docs','pits-visual-checks');
fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const CFG={mode:'pvp',charname:'Aurelian Maximilian Thessalonikios the Unyielding',pvpName:'Bartholomew Wolfgang Featherstonehaugh-Cholmondeley',weapon:'sword',pvpWeapon:'spear',
  style:60,pvpSkill:60,armor:0,pvpArmor:0,str:11,siz:12,pvpStr:11,pvpSiz:12};
async function boot(browser,vp,dice){
  const page=await browser.newPage({viewport:vp});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
  await page.addInitScript(d=>{window.__psRecord=[];window.__dq=d;window.__pitsDie=n=>{const q=window.__dq[n];return q&&q.length?q.shift():Math.ceil(n/2);};},dice);
  await page.goto(URL_);await page.evaluate(c=>{Object.assign(config,c);startRun(false);},CFG);await sleep(300);return page;
}
const st=page=>page.evaluate(()=>{const S=prototypeCombat.state(),V=prototypeCombat.presentation();
  return {phase:S.phase,busy:!!V.busy,pend:S.pending?S.pending.kind:null,hasR:!!prototypeCombat.pendingRoll(),turn:S.order?S.order[S.turnIndex]:null};});
const click=(page,a,v)=>page.evaluate(([a,v])=>{const q=v?`[data-act="${a}"][data-val="${v}"]`:`[data-act="${a}"]`;const el=[...document.querySelectorAll(q)].find(e=>!e.disabled);
  if(!el)return false;el.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true;},[a,v]);
async function until(page,cond,label){for(let i=0;i<600;i++){const s=await st(page);if(s.busy){if(await page.evaluate(()=>!!document.querySelector('[data-act=continue]')))await click(page,'continue');}else if(cond(s))return s;else if(s.hasR&&!label.noRoll)await click(page,'roll');await sleep(40);}throw new Error('timeout '+JSON.stringify(label.name));}
const box=(page,sel)=>page.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height};},sel);

(async()=>{
  const browser=await chromium.launch();let pass=0,fail=0;
  const T=async(name,f)=>{try{await f();console.log('PASS '+name);pass++;}catch(e){console.log('FAIL '+name+': '+e.message.split('\n')[0]);fail++;}};
  for(const vp of [{width:1280,height:800},{width:1440,height:900}]){
    await T(`${vp.width}x${vp.height}: fighters, dice and the active decision are visible together, with no site navigation`,async()=>{
      const page=await boot(browser,vp,{10:[10,1],100:[20]});
      await until(page,s=>s.phase==='fight'&&!s.pend&&!s.hasR&&s.turn==='a',{name:'turn'});
      await click(page,'attack');
      await until(page,s=>s.hasR,{name:'attack roll',noRoll:true});
      // 1. the dice tray: top centre, inside the viewport
      const tray=await box(page,'#pitsStage .roll'),stage=await box(page,'#pitsStage .ps-stage');
      assert(tray&&tray.t>=0&&tray.b<=vp.height,'tray inside the viewport');
      assert(Math.abs((tray.l+tray.r)/2-(stage.l+stage.r)/2)<=3,'tray is centred');
      assert(tray.t-stage.t<=70,'tray is at the top of the stage');
      await click(page,'roll');
      await until(page,s=>s.pend==='reaction',{name:'reaction',noRoll:true});
      // 2. the reaction prompt, fully inside the viewport without scrolling, with the fighters
      const nav=await page.evaluate(()=>{const h=document.querySelector('.sitota-header');return h?getComputedStyle(h).display:'none';});
      assert.equal(nav,'none','no top Sit’ota navigation');
      assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.st-tabbar')).display),'none','no tab bar');
      const exit=await box(page,'#pitsStage [data-act="reset"]');assert(exit&&exit.t>=0&&exit.b<=vp.height,'Exit Battle is visible');
      const prompt=await box(page,'#root .prompt'),choice=await box(page,'#root .prompt .choice');
      assert(choice,'reaction choices are drawn');assert(choice.b<=vp.height,`the choices end at ${Math.round(choice.b)} within ${vp.height}`);
      assert(prompt.t>=stage.b-2,'the decision sits just below the arena');
      const fig=await page.evaluate(()=>{const f=[...document.querySelectorAll('#pitsStage .ps-fig')].map(e=>e.getBoundingClientRect());return f.map(r=>({t:r.top,b:r.bottom,l:r.left,r:r.right}));});
      for(const f of fig)assert(f.t>=stage.t&&f.b<=stage.b,'each fighter is fully inside the stage');
      // 3. the plates and strip do not collide with the tray
      const pa=await box(page,'.plate.you'),pb=await box(page,'.plate.foe');
      assert(pa.r<=tray.l+2&&pb.l>=tray.r-2,'plates sit beside the tray, not under it');
      await page.screenshot({path:path.join(OUT,`layout-${vp.width}x${vp.height}-reaction.png`)});
      assert.deepEqual(page.errors,[]);await page.close();
    });
    await T(`${vp.width}x${vp.height}: the round strip with long names and initiative stays in its lane`,async()=>{
      const page=await boot(browser,vp,{10:[10,1]});
      await until(page,s=>s.phase==='fight'&&!s.pend&&!s.hasR,{name:'turn'});
      const strip=await box(page,'#pitsStage .strip'),pa=await box(page,'.plate.you'),pb=await box(page,'.plate.foe');
      assert(strip.l>=pa.r-1&&strip.r<=pb.l+1,`strip ${Math.round(strip.l)}-${Math.round(strip.r)} between plates ${Math.round(pa.r)}-${Math.round(pb.l)}`);
      const text=await page.evaluate(()=>document.querySelector('#pitsStage .strip').innerText);
      assert(/Engaged|Reach advantage/.test(text),'neutral range wording');assert(!/Matched reach/.test(text));
      await page.close();
    });
  }
  // ---- cancellation: Show results, a new bout and leaving must not leave old effects behind ----
  await T('Show results cuts the replay short and snaps to the real state (no old blood, banners or weapons)',async()=>{
    const page=await boot(browser,{width:1280,height:800},{10:[10,1],100:[2,95],20:[5],8:[5]});
    await until(page,s=>s.phase==='fight'&&!s.pend&&!s.hasR&&s.turn==='a',{name:'turn'});
    await click(page,'attack');await until(page,s=>s.hasR,{name:'r',noRoll:true});await click(page,'roll');
    await until(page,s=>s.pend==='reaction',{name:'react',noRoll:true});await click(page,'react','none');
    // an effect window may open (critical vs no defence): skip it, then play the hit and cut the replay short
    for(let i=0;i<200;i++){const s=await st(page);if(s.pend==='effect'){await click(page,'skipEffect');break;}if(s.hasR)await click(page,'roll');if(s.busy)break;await sleep(40);}
    for(let i=0;i<200;i++){const s=await st(page);if(s.hasR)await click(page,'roll');if(s.busy&&await page.evaluate(()=>!!document.querySelector('[data-act="skip"]'))){await sleep(900);break;}await sleep(40);}
    await click(page,'skip');await sleep(300);
    const left=await page.evaluate(()=>({fx:document.querySelectorAll('#pitsStage .ps-part-fx').length,nums:document.querySelectorAll('#pitsStage .ps-num').length,
      banner:document.querySelector('#pitsStage .ps-banner').className,dropped:document.querySelectorAll('#pitsStage .ps-dropped').length,
      anim:PS.fig.a.anim||PS.fig.b.anim}));
    assert.equal(left.fx,0,'no leftover particles');assert.equal(left.nums,0,'no leftover numbers');assert(!/ps-go/.test(left.banner),'no leftover banner');
    assert.equal(left.dropped,0);assert(!left.anim,'no animation still running');
    // and nothing arrives late
    await sleep(1500);
    const late=await page.evaluate(()=>({fx:document.querySelectorAll('#pitsStage .ps-part-fx').length,nums:document.querySelectorAll('#pitsStage .ps-num').length}));
    assert.deepEqual(late,{fx:0,nums:0},'no delayed effects');
    await page.close();
  });
  await T('Exit Battle and a new bout start clean: one weapon each, no old effects',async()=>{
    const page=await boot(browser,{width:1280,height:800},{10:[10,1],100:[2,95],20:[5],8:[5]});
    await until(page,s=>s.phase==='fight'&&!s.pend&&!s.hasR&&s.turn==='a',{name:'turn'});
    await click(page,'reset');await sleep(300);
    assert.equal(await page.evaluate(()=>document.getElementById('pitsStage').hidden),true,'the arena is hidden after Exit Battle');
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.sitota-header')).display!=='none'),true,'site navigation returns outside battle');
    await page.evaluate(c=>{Object.assign(config,c);startRun(false);},CFG);await sleep(500);
    const n=await page.evaluate(()=>({dropped:document.querySelectorAll('#pitsStage .ps-dropped').length,lodged:document.querySelectorAll('#pitsStage .ps-lodged').length,
      weapons:[...document.querySelectorAll('#pitsStage .ps-shaft')].filter(e=>e.style.display!=='none').length,fx:document.querySelectorAll('#pitsStage .ps-part-fx').length}));
    assert.deepEqual([n.dropped,n.lodged,n.fx],[0,0,0]);assert.equal(n.weapons,2,'each fighter holds exactly one weapon');
    await page.close();
  });
  await browser.close();console.log(`${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
