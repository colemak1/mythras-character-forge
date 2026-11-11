// The five bottom-third layouts of the Pits (experiments/pits-bottom.js): each one must show the real actions,
// fit the one-screen shell, keep reactions reachable, and send the engine's own acts.
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
  const bad=[];for(const e of [d,...d.querySelectorAll('.bprompt .prompt,.bB-grid,.bodds,.bcard,.btl,.blist,.bB-r')]){if(e.scrollHeight>e.clientHeight+1)bad.push((e.className||e.tagName)+' '+e.scrollHeight+'>'+e.clientHeight);}return bad.join('; ');});

(async()=>{
  const browser=await chromium.launch();let pass=0,fail=0;
  const T=async(name,f)=>{try{await f();console.log('PASS '+name);pass++;}catch(e){console.log('FAIL '+name+': '+e.message.split('\n')[0]);fail++;}};
  const DICE={10:[10,1],100:[11,95,37,50,50,50]};
  await T('the current layout stays the default (no switcher choice made)',async()=>{
    const page=await boot(browser,{width:1280,height:720},'',DICE);await until(page,myTurn);
    assert.equal(await page.evaluate(()=>document.body.dataset.bottom),'current');
    assert(await page.evaluate(()=>!!document.querySelector('#root .deck .acts')&&!document.querySelector('#root .bdeck')),'the old deck is drawn');
    assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('[data-pa="layout"] option')].map(o=>o.value)),['current','A','B','C','D','E']);
    await page.close();
  });
  for(const L of ['A','B','C','D','E']){
    for(const vp of [{width:1280,height:720},{width:1440,height:900}]){
      await T(`${L} at ${vp.width}x${vp.height}: one screen, real actions, no chronicle panel, history entry only where designed`,async()=>{
        const page=await boot(browser,vp,L,DICE);await until(page,myTurn);
        let d=await dims(page);assert.equal(d.sh,d.ih,`page height ${d.sh} equals window ${d.ih}`);
        assert.equal(await page.evaluate(()=>document.body.dataset.bottom),L);
        assert(await page.evaluate(l=>!!document.querySelector('#root .bdeck.b'+l),L),'the layout is drawn');
        assert.equal(await page.evaluate(()=>document.querySelectorAll('#root .pa-chron,#root .deck').length),0,'no chronicle panel or old deck');
        // every legal action the engine offers is drawn (as a card, dock button or list row) with its cost
        const want=await page.evaluate(()=>pitsLegalActions('a').map(a=>a.label));
        const have=await page.evaluate(()=>[...document.querySelectorAll('#root .bdeck .bact .bn,#root .bdeck .bdk .dn,#root .bdeck .brow .nm,#root .bdeck .bpick .bn,#root .bdeck .bmini')].map(e=>e.textContent.trim()));
        for(const w of want)assert(have.includes(w),`action ${w} is shown`);
        assert.deepEqual(await inView(page,'#root .bdeck button'),[],'every button inside the window');
        assert.equal(await fits(page),'','nothing in the deck needs scrolling');
        const hist=await page.evaluate(()=>!!document.querySelector('#root [data-pa="history"]'));
        assert.equal(hist,['A','C','E'].includes(L),'history entry only where the mockup has one');
        assert.deepEqual(page.errors,[]);await page.close();
      });
    }
    await T(`${L}: attack goes through the engine, the reaction choices stay visible, and the last exchange reads from the log`,async()=>{
      const vp={width:1280,height:720},page=await boot(browser,vp,L,DICE);await until(page,myTurn);
      // selecting layouts (D, E) send nothing until the confirm button; the others send the act on click
      if(L==='D'||L==='E'){
        await click(page,'[data-pa="sel"][data-val="brace"]');await sleep(100);
        assert.equal(await page.evaluate(()=>document.querySelector('#root .bgo').dataset.act),'brace','selection changes what Confirm sends');
        assert.equal((await st(page)).hasR,false,'nothing was sent yet');
        await click(page,'[data-pa="sel"][data-val="attack"]');await sleep(100);
        assert.equal(await page.evaluate(()=>document.querySelector('#root .bgo').dataset.act),'attack');
        assert(await click(page,'#root .bgo[data-act="attack"]'));
      }else assert(await click(page,'#root .bdeck [data-act="attack"]'));
      await until(page,s=>s.hasR,true);await click(page,'[data-act=roll]');
      await until(page,s=>s.pend==='reaction',true);await sleep(200);
      const ch=await page.evaluate(()=>[...document.querySelectorAll('#root .bdeck .choice')].map(e=>{const r=e.getBoundingClientRect();return {t:r.top,b:r.bottom,w:r.width};}));
      assert(ch.length>=2,'reaction choices are drawn');for(const c of ch)assert(c.t>=0&&c.b<=vp.height&&c.w>40,'each choice is visible');
      assert.equal(await fits(page),'','the reaction fits without scrolling');
      assert.equal((await dims(page)).sh,vp.height);
      await click(page,'[data-act="react"][data-val="evade"]');await until(page,s=>s.phase==='fight'&&!s.pend&&!s.hasR);await sleep(300);
      const txt=await page.evaluate(()=>document.querySelector('#root .bdeck').innerText);
      assert(/Goat attacks/.test(txt)&&/11/.test(txt),'the last exchange names the attack and its roll');
      assert(/Border Deserter evades/.test(txt)&&/95/.test(txt),'and the defence roll');
      assert.deepEqual(page.errors,[]);await page.close();
    });
  }
  await T('A: number keys act, and a history window opens and closes',async()=>{
    const page=await boot(browser,{width:1280,height:720},'A',DICE);await until(page,myTurn);
    await page.keyboard.press('1');await sleep(150);assert.equal((await st(page)).hasR,true,'1 starts the Attack');
    await page.close();
    const p2=await boot(browser,{width:1280,height:720},'A',DICE);await until(p2,myTurn);
    await click(p2,'[data-pa="history"]');await sleep(100);
    assert(await p2.evaluate(()=>!!document.querySelector('#paHistory .chronicle-entry')),'the chronicle opens in a window');
    await p2.keyboard.press('Escape');await sleep(100);assert(await p2.evaluate(()=>!document.getElementById('paHistory')),'Escape closes it');
    await p2.close();
  });
  await T('E: Enter confirms the selected action, number keys only select',async()=>{
    const page=await boot(browser,{width:1280,height:720},'E',DICE);await until(page,myTurn);
    await page.keyboard.press('2');await sleep(120);
    assert.equal(await page.evaluate(()=>document.querySelector('#root .bgo').dataset.act),'brace');assert.equal((await st(page)).hasR,false);
    await page.keyboard.press('1');await sleep(120);await page.evaluate(()=>document.activeElement&&document.activeElement.blur());
    await page.keyboard.press('Enter');await sleep(150);assert.equal((await st(page)).hasR,true,'Enter sent the Attack');
    await page.close();
  });
  await T('the switcher changes the layout live and remembers the choice',async()=>{
    const page=await boot(browser,{width:1280,height:720},'',DICE);await until(page,myTurn);
    for(const L of ['C','A','current','E']){
      await page.selectOption('[data-pa="layout"]',L);await sleep(200);
      assert.equal(await page.evaluate(()=>document.body.dataset.bottom),L);
      assert.equal(await page.evaluate(l=>l==='current'?!!document.querySelector('#root .deck'):!!document.querySelector('#root .bdeck.b'+l),L),true,'drawn: '+L);
      assert.equal((await dims(page)).sh,720);
    }
    assert.equal(await page.evaluate(()=>localStorage.getItem('sitota-pits-bottom-layout')),'E');
    await page.reload();await page.evaluate(c=>{Object.assign(config,c);startRun(false);},CFG);await sleep(300);await until(page,myTurn,false);
    assert.equal(await page.evaluate(()=>document.body.dataset.bottom),'E','a reload keeps the choice');
    assert.deepEqual(page.errors,[]);await page.close();
  });
  await browser.close();console.log(`${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
