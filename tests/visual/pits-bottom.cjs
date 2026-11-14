// The Pits bottom deck (experiments/pits-bottom.js, layout E): it must show the real actions and defences,
// fit the one-screen shell, keep every decision (defence, Special Effects, location) in the deck, and send the engine's own acts.
//
//   node tests/visual/pits-bottom.cjs        (needs playwright and a static server, see pits-layout.cjs)
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const BASE=process.env.PITS_URL||'http://localhost:8765/experiments/practice-combat.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const CFG={mode:'pvp',charname:'Goat',pvpName:'Border Deserter',weapon:'sword',pvpWeapon:'mace',style:100,pvpSkill:54,armor:0,pvpArmor:0,str:11,siz:12,pvpStr:11,pvpSiz:12};
async function boot(browser,vp,layout,dice){
  const ctx=await browser.newContext({viewport:vp});const page=await ctx.newPage();page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
  await page.addInitScript(d=>{window.__psRecord=[];window.__dq=d;window.__pitsDie=n=>{const q=window.__dq[n];return q&&q.length?q.shift():Math.ceil(n/2);};},dice);
  await page.goto(BASE+(layout?`?bottom=${layout}`:''));await page.evaluate(c=>{Object.assign(config,c);startRun(false);},CFG);await sleep(300);return page;
}
const st=page=>page.evaluate(()=>{const S=prototypeCombat.state(),V=prototypeCombat.presentation();
  return {phase:S.phase,busy:!!V.busy,pend:S.pending?S.pending.kind:null,hasR:!!prototypeCombat.pendingRoll(),turn:S.order?S.order[S.turnIndex]:null};});
const click=(page,sel)=>page.evaluate(q=>{const el=[...document.querySelectorAll(q)].find(e=>!e.disabled);if(!el)return false;el.click();return true;},sel);
async function until(page,cond,noRoll){for(let i=0;i<600;i++){const s=await st(page);
  if(s.busy){if(!(await click(page,'[data-act=continue]')))await click(page,'[data-act=skip]');}
  else if(cond(s))return s;else if(s.hasR&&!noRoll)await click(page,'[data-act=roll]');else if(s.pend==='effect'&&!s.hasR)await click(page,'[data-act=skipEffect]');
  await sleep(40);}throw new Error('timeout '+JSON.stringify(await st(page)));}
const myTurn=s=>s.phase==='fight'&&!s.pend&&!s.hasR&&s.turn==='a';
const dims=page=>page.evaluate(()=>({sh:document.documentElement.scrollHeight,ih:innerHeight,iw:innerWidth}));
const inView=(page,sel)=>page.evaluate(q=>{const bad=[];const w=innerWidth,h=innerHeight;
  for(const e of document.querySelectorAll(q)){const r=e.getBoundingClientRect();if(r.width&&(r.top<-1||r.bottom>h+1||r.left<-1||r.right>w+1))bad.push((e.textContent||'').trim().slice(0,20)+' '+Math.round(r.bottom));}return bad;},sel);
const fits=page=>page.evaluate(()=>{const d=document.querySelector('#root .bdeck');if(!d)return 'no deck';
  const bad=[];for(const e of [d,...d.querySelectorAll('.bprompt .prompt,.blist,.binfo,.bfxs')]){if(e.scrollHeight>e.clientHeight+1)bad.push((e.className||e.tagName)+' '+e.scrollHeight+'>'+e.clientHeight);}return bad.join('; ');});

(async()=>{
  const browser=await chromium.launch();let pass=0,fail=0;
  const T=async(name,f)=>{try{await f();console.log('PASS '+name);pass++;}catch(e){console.log('FAIL '+name+': '+e.message.split('\n')[0]);fail++;}};
  const DICE={10:[10,1],100:[11,95,37,50,50,50]};
  await T('?bottom=current keeps the older deck for comparison',async()=>{
    const page=await boot(browser,{width:1280,height:720},'current',DICE);await until(page,myTurn);
    assert.equal(await page.evaluate(()=>document.body.dataset.bottom),'current');
    assert(await page.evaluate(()=>!!document.querySelector('#root .deck .acts')&&!document.querySelector('#root .bdeck')),'the old deck is drawn');
    assert.equal(await page.evaluate(()=>document.querySelectorAll('[data-pa="layout"]').length),0,'no layout switcher');
    await page.close();
  });
  for(const vp of [{width:1280,height:720},{width:1440,height:900}]){
    await T(`${vp.width}x${vp.height}: one screen, real actions, defences named, nothing scrolls`,async()=>{
      const page=await boot(browser,vp,'',DICE);await until(page,myTurn);
      let d=await dims(page);assert.equal(d.sh,d.ih,`page height ${d.sh} equals window ${d.ih}`);
      assert.equal(await page.evaluate(()=>document.body.dataset.bottom),'E');
      assert.equal(await page.evaluate(()=>document.querySelectorAll('#root .pa-chron,#root .deck').length),0,'no chronicle panel or old deck');
      const want=await page.evaluate(()=>pitsLegalActions('a').map(a=>a.label));
      const have=await page.evaluate(()=>[...document.querySelectorAll('#root .bdeck .brow .nm')].map(e=>e.textContent.trim()));
      for(const w of want)assert(have.includes(w),`action ${w} is shown`);
      assert(/When attacked:/.test(await page.evaluate(()=>document.querySelector('#root .blist').innerText)),'defences are named');
      assert.deepEqual(await inView(page,'#root .bdeck button'),[],'every button inside the window');
      assert.equal(await fits(page),'','nothing in the deck needs scrolling: '+await fits(page));
      assert.deepEqual(page.errors,[]);await page.close();
    });
  }
  await T('a full exchange: select and confirm, defend on the left, effects and location in the middle, details on hover',async()=>{
    const vp={width:1280,height:720},page=await boot(browser,vp,'',DICE);await until(page,myTurn);
    await click(page,'[data-pa="sel"][data-val="brace"]');await sleep(100);
    assert.equal(await page.evaluate(()=>document.querySelector('#root .bgo').dataset.act),'brace','selection changes what Confirm sends');
    assert.equal((await st(page)).hasR,false,'nothing was sent yet');
    await page.hover('#root .brow[data-val="attack"]');await sleep(80);
    assert(/your attack roll/.test(await page.evaluate(()=>document.querySelector('#root .binfo').innerText)),'hovering Attack shows its odds');
    await click(page,'[data-pa="sel"][data-val="attack"]');await sleep(100);
    assert(await click(page,'#root .bgo[data-act="attack"]'));
    await until(page,s=>s.hasR,true);await click(page,'[data-act=roll]');
    await until(page,s=>s.pend==='reaction',true);await sleep(200);
    assert.equal(await page.evaluate(()=>document.querySelector('#root .btrack .now').textContent),'Defence','the tracker is on Defence');
    const rows=await page.evaluate(()=>[...document.querySelectorAll('#root .brow.def:not(.off)')].map(e=>{const r=e.getBoundingClientRect();return {v:e.dataset.val,t:r.top,b:r.bottom};}));
    assert(rows.length>=2,'defences are live');for(const r of rows)assert(r.t>=0&&r.b<=vp.height,'each defence is visible');
    await page.hover('#root .brow[data-val="evade"]');await sleep(80);
    assert(/chance to get out of the way/.test(await page.evaluate(()=>document.querySelector('#root .binfo').innerText)),'hovering Evade shows its odds');
    assert.equal(await fits(page),'','the reaction fits without scrolling');
    await click(page,'[data-pa="def"][data-val="evade"]');await sleep(80);
    await click(page,'#root .bgo[data-act="react"]');
    await until(page,s=>s.pend==='effect'&&!s.hasR&&!s.busy);await sleep(200);
    assert.equal(await page.evaluate(()=>document.querySelectorAll('.modal').length),0,'Special Effects open in the deck, not a window');
    assert.equal(await page.evaluate(()=>document.querySelector('#root .btrack .now').textContent),'Effects');
    const fx=await page.evaluate(()=>[...document.querySelectorAll('#root .bfx')].map(e=>e.dataset.val));
    assert(fx.length>=2&&fx.includes('choose'),'effects are listed: '+fx);
    await page.hover('#root .bfx[data-val="choose"]');await sleep(80);
    assert(/Choose Location/.test(await page.evaluate(()=>document.querySelector('#root .binfo h4').textContent)),'hovering an effect describes it');
    assert.deepEqual(await inView(page,'#root .bdeck button'),[],'every effect inside the window');
    await click(page,'[data-pa="fx"][data-val="choose"]');await sleep(80);await click(page,'#root .bgo[data-act="effect"]');await sleep(200);
    assert.equal((await st(page)).pend,'location');
    assert.equal(await page.evaluate(()=>document.querySelectorAll('.modal').length),0,'Choose Location is in the deck too');
    await page.evaluate(()=>document.querySelector('#root .bdo.bloc [data-act="pickloc"][data-val="Chest"]').dispatchEvent(new MouseEvent('click',{bubbles:true})));
    await until(page,s=>s.phase==='fight'&&!s.pend&&!s.hasR&&!s.busy);await sleep(300);
    const txt=await page.evaluate(()=>document.querySelector('#root .bdeck').innerText);
    assert(/Goat attacks: rolled 11/.test(txt),'the story names the attack and its roll');
    assert(/Border Deserter evades: rolled 95/.test(txt),'and the defence roll');
    assert(/Chest/.test(txt),'and where it landed');
    assert.deepEqual(page.errors,[]);await page.close();
  });
  await T('number keys select, Enter confirms; the history window opens and closes',async()=>{
    const page=await boot(browser,{width:1280,height:720},'',DICE);await until(page,myTurn);
    await page.keyboard.press('2');await sleep(120);
    assert.equal(await page.evaluate(()=>document.querySelector('#root .bgo').dataset.act),'brace');assert.equal((await st(page)).hasR,false);
    await click(page,'[data-pa="history"]');await sleep(100);
    assert(await page.evaluate(()=>!!document.querySelector('#paHistory .chronicle-entry')),'the chronicle opens in a window');
    await page.keyboard.press('Escape');await sleep(100);assert(await page.evaluate(()=>!document.getElementById('paHistory')),'Escape closes it');
    await page.keyboard.press('1');await sleep(120);await page.evaluate(()=>document.activeElement&&document.activeElement.blur());
    await page.keyboard.press('Enter');await sleep(150);assert.equal((await st(page)).hasR,true,'Enter sent the Attack');
    assert.deepEqual(page.errors,[]);await page.close();
  });
  await browser.close();console.log(`${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
