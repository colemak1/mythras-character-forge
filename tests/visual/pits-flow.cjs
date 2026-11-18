// The Pits: one continuous fight (animation brief 2026-11-11). Real browser, scripted dice.
//   - a finishing blow is held until its whole exchange is resolved, then flows from contact into the collapse
//   - decisions and manual rolls pause the scene exactly (no pose drift), and it resumes from the same moment
//   - attack, parry and counterattack carry on from the pose the last motion left (no compulsory idle)
//   - Press Advantage, a limp weapon arm with the drop, and a concession look like what the engine says
//
//   node tests/visual/pits-flow.cjs        (needs playwright and a static server, see pits-layout.cjs)
const assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
// These checks read the pose library's own state (PS.fig.cur, psPlay), so they run on the earlier pose stage, which stays
// selectable with ?stage=poses. The movement stage has its own checks in pits-motion-live.cjs.
const URL_=(process.env.PITS_URL||'http://localhost:8765/experiments/practice-combat.html')+'?stage=poses&bottom=current';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const CFG={mode:'pvp',charname:'Aurel',pvpName:'Brann',weapon:'sword',pvpWeapon:'sword',style:80,pvpSkill:60,armor:0,pvpArmor:0,str:11,siz:12,pvpStr:11,pvpSiz:12};
async function boot(browser,dice){
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
  await page.addInitScript(d=>{window.__psRecord=[];window.__psPlays=[];window.__dq=d;window.__pitsDie=n=>{const q=window.__dq[n];return q&&q.length?q.shift():Math.ceil(n/2);};},dice);
  await page.goto(URL_);await page.evaluate(c=>{Object.assign(config,c);startRun(false);},CFG);await sleep(300);return page;
}
const st=page=>page.evaluate(()=>{const S=prototypeCombat.state(),V=prototypeCombat.presentation();
  return {phase:S.phase,busy:!!V.busy,hold:!!V.hold,pend:S.pending?S.pending.kind:null,hasR:!!prototypeCombat.pendingRoll(),turn:S.order?S.order[S.turnIndex]:null};});
const click=(page,q)=>page.evaluate(q=>{const e=[...document.querySelectorAll(q)].find(x=>!x.disabled);if(!e)return false;e.click();return true;},q);
async function until(page,cond,noRoll){for(let i=0;i<500;i++){const s=await st(page);
  if(s.busy){if(!(await click(page,'[data-act=continue]')))await sleep(30);}
  else if(cond(s))return s;else if(s.hasR&&!noRoll)await click(page,'[data-act=roll]');await sleep(40);}throw new Error('timeout '+JSON.stringify(await st(page)));}
const myTurn=s=>s.phase==='fight'&&!s.pend&&!s.hasR&&s.turn==='a';
// every motion the stage starts: which figure, and whether it moves toward the common idle stance
const spy=page=>page.evaluate(()=>{const orig=window.psPlay;window.psPlay=function(f,...frames){
  const last=frames[frames.length-1],pose=last&&last[0],idle=typeof pose==='object'&&PS_KEYS.every(k=>pose[k]===PS_POSE.idle[k]);
  window.__psPlays.push({id:f.id,idle,t:Math.round(performance.now())});return orig.call(this,f,...frames);};});
const pose=page=>page.evaluate(()=>['a','b'].map(i=>JSON.stringify(PS.fig[i].cur)));

(async()=>{
  const browser=await chromium.launch();let pass=0,fail=0;
  const T=async(name,f)=>{try{await f();console.log('PASS '+name);pass++;}catch(e){console.log('FAIL '+name+': '+e.message.split('\n')[0]);fail++;}};

  // ---- the finishing blow ----
  const finishing=async page=>{
    // the defender is down to a single hit point in the chest: the blow will be a Serious Wound, and a failed Endurance test ends the bout
    await until(page,myTurn);
    await page.evaluate(()=>{S.fighters.b.hp.Chest=1;render();});await sleep(150);
    page.hp0=await page.evaluate(()=>document.querySelector('.plate.foe .tot b').textContent);
    await click(page,'[data-act=attack]');await until(page,s=>s.hasR,true);await click(page,'[data-act=roll]');
    await until(page,s=>s.pend==='reaction',true);await click(page,'[data-act=react][data-val=none]');
    // roll whatever is asked until the engine waits on the defender's Endurance roll
    for(let i=0;i<400;i++){const s=await st(page);
      if(s.hasR){
        if(await page.evaluate(()=>/Endurance/.test(prototypeCombat.pendingRoll().label)))return s;
        await click(page,'[data-act=roll]');
      }else if(s.busy)await click(page,'[data-act=continue]');
      else if(s.pend==='effect')await click(page,'[data-act=skipEffect]');
      await sleep(40);}
    throw new Error('never reached the Endurance roll: '+JSON.stringify(await st(page)));
  };
  const DICE={10:[10,1],100:[3,3,95,95],20:[10],8:[8]};
  await T('a blow waits for its Endurance roll: the plates, the chronicle and the stage still show the moment before it',async()=>{
    const page=await boot(browser,DICE);await spy(page);
    await finishing(page);const hp0=page.hp0;await until(page,s=>!s.busy&&s.hasR,true);await sleep(300);
    const s=await st(page);assert(s.hold,'the blow is being held back');assert(!s.busy);
    assert.equal(await page.evaluate(()=>document.querySelector('.plate.foe .tot b').textContent),hp0,'the plate has not taken the damage yet');
    const rec=await page.evaluate(()=>window.__psRecord.map(r=>r.type));
    assert(!rec.includes('contact')&&!rec.includes('resolve'),'no contact has been drawn (saw '+rec.join(',')+')');
    assert.equal(await page.evaluate(()=>PS.paused),true,'the scene is paused while the roll waits');
    assert(!/Wound|unconscious|Limb/i.test(await page.evaluate(()=>(document.querySelector('.chron')||{innerText:''}).innerText)),'the chronicle does not give the result away');
    await page.close();
  });
  await T('while a roll waits the scene is paused exactly: no pose drift, no idle return, and it resumes from the same moment',async()=>{
    const page=await boot(browser,DICE);await finishing(page);await until(page,s=>!s.busy&&s.hasR,true);await sleep(300);
    const p0=await pose(page);const anims0=await page.evaluate(()=>document.getAnimations().filter(a=>a.effect&&a.effect.target&&a.effect.target.closest&&a.effect.target.closest('.ps-fx,.ps-ghost,.ps-scene')).map(a=>a.playState));
    await sleep(1400);
    assert.deepEqual(await pose(page),p0,'both figures are exactly where they were 1.4 s ago');
    const anims1=await page.evaluate(()=>document.getAnimations().filter(a=>a.effect&&a.effect.target&&a.effect.target.closest&&a.effect.target.closest('.ps-fx,.ps-ghost,.ps-scene')).map(a=>a.playState));
    assert(anims1.every(x=>x!=='running'),'particles and camera are paused too ('+anims1.join(',')+')');void anims0;
    // the dice and the interface stay live
    assert(await page.evaluate(()=>!!document.querySelector('#pitsStage [data-act="roll"]')),'the Roll button is still there');
    await click(page,'[data-act=roll]');await sleep(50);
    assert.equal(await page.evaluate(()=>PS.paused),false,'answered: the scene runs again');
    await page.close();
  });
  await T('the finishing blow flows from contact into the collapse: no Endurance dice after the hit, no reset, no second hit',async()=>{
    const page=await boot(browser,DICE);if(!process.env.NOSPY)await spy(page);await finishing(page);await until(page,s=>!s.busy&&s.hasR,true);
    await click(page,'[data-act=roll]');
    for(let i=0;i<400;i++){const s=await st(page);if(s.phase!=='fight'&&!s.busy)break;if(s.busy)await click(page,'[data-act=continue]');await sleep(40);}
    await sleep(500);
    const rec=await page.evaluate(()=>window.__psRecord.map(r=>r.type+(r.message?':'+r.message:'')));
    const iC=rec.indexOf('contact'),iK=rec.indexOf('collapse');
    assert(iC>=0&&iK>iC,'contact, then the collapse: '+rec.join(','));
    assert.equal(rec.filter(t=>t==='contact').length,1,'one impact, not two');
    assert(!rec.slice(iC,iK).includes('settle'),'nothing resets between the contact and the fall');
    // the dice of the Endurance test were shown before the blow, never between it and its consequence
    const order=await page.evaluate(()=>V.tape.map(e=>e.roll?'dice':(e.title||'?')));
    const hit=order.findIndex(t=>/ hits /.test(t)),lastDice=order.lastIndexOf('dice');
    assert(hit>=0&&lastDice<hit,'every die was shown before the hit entry: '+order.join(' | '));
    const lo=await page.evaluate(()=>PS.fig.b.endPose===PS_POSE.ko||PS.fig.b.end==='ko');
    assert(lo,'the defeated figure ends collapsed');
    assert.equal((await page.evaluate(()=>window.__psPlays.filter(p=>p.idle&&p.id==='b').length)),0,'the defeated figure was never sent back to idle');
    assert.deepEqual(page.errors,[]);await page.close();
  });

  // ---- continuity ----
  await T('attack, parry and counterattack carry on from each other: no compulsory idle between actions',async()=>{
    const page=await boot(browser,{10:[10,1],100:[3,3,3,3,3,3]});await spy(page);
    await until(page,myTurn);
    await click(page,'[data-act=attack]');await until(page,s=>s.hasR,true);await click(page,'[data-act=roll]');
    await until(page,s=>s.pend==='reaction',true);await click(page,'[data-act=react][data-val=parry]');
    await until(page,s=>s.hasR||s.pend||(s.phase==='fight'&&s.turn!=='a'),false);
    for(let i=0;i<500;i++){const s=await st(page);if(s.turn==='b'&&!s.pend&&!s.hasR&&!s.busy)break;if(s.hasR)await click(page,'[data-act=roll]');if(s.pend==='effect')await click(page,'[data-act=skipEffect]');if(s.busy)await click(page,'[data-act=continue]');await sleep(40);}
    // the other player counterattacks
    await click(page,'[data-act=attack]');await until(page,s=>s.hasR,true);await click(page,'[data-act=roll]');
    await until(page,s=>s.pend==='reaction'||s.pend==='effect'||s.phase!=='fight',true);
    await sleep(600);
    const plays=await page.evaluate(()=>window.__psPlays);
    assert(plays.length>=4,'several motions were played ('+plays.length+')');
    assert.equal(plays.filter(p=>p.idle).length,0,'no motion was sent back to the idle stance');
    assert.deepEqual(page.errors,[]);await page.close();
  });

  // ---- Press Advantage, a limp arm with a dropped weapon, and a concession ----
  const synthetic=async()=>{const page=await boot(browser,{10:[10,1]});await until(page,myTurn);await sleep(300);return page;};
  await T('Press Advantage: a paired, sustained relationship from the engine state; no damage, no range change, released when it ends',async()=>{
    const page=await synthetic();
    const before=await page.evaluate(()=>JSON.stringify({hp:[S.fighters.a.hp,S.fighters.b.hp],ap:[S.fighters.a.ap,S.fighters.b.ap],eng:S.engagement,dis:S.disengaged,gap:S.gapMetres}));
    await page.evaluate(()=>{S.fighters.b.pressedTurns=1;render();});await sleep(80);
    assert.deepEqual(await page.evaluate(()=>[PS.fig.a.pressRole,PS.fig.b.pressRole]),['press','cover'],'the aggressor presses and the opponent covers while the effect is active');
    await page.evaluate(()=>{window.__psRecord.length=0;psRunCue({type:'press',actor:'a',target:'b',name:'Press Advantage'});});await sleep(900);
    assert(await page.evaluate(()=>window.__psRecord.some(r=>r.type==='press')),'the effect has its own cue');
    const d=await page.evaluate(()=>({a:PS.fig.a.cur.dx,b:PS.fig.b.cur.dx,pa:PS_POSE.press.dx,pb:PS_POSE.cover.dx,label:[...document.querySelectorAll('#pitsStage .ps-num')].map(e=>e.textContent).join('|')}));
    assert(Math.abs(d.a-d.pa)<3&&Math.abs(d.b-d.pb)<3,'the pair holds its stance (a '+d.a+' b '+d.b+')');
    assert(/Press Advantage/.test(d.label),'the effect is named briefly ('+d.label+')');
    assert.equal(await page.evaluate(()=>JSON.stringify({hp:[S.fighters.a.hp,S.fighters.b.hp],ap:[S.fighters.a.ap,S.fighters.b.ap],eng:S.engagement,dis:S.disengaged,gap:S.gapMetres})),before,'no damage, AP or range change was invented');
    await sleep(1200);   // sustained: the stance does not drift back while the effect is active
    assert(Math.abs(await page.evaluate(()=>PS.fig.a.cur.dx)-d.pa)<3,'still pressing after a lull');
    await page.evaluate(()=>{S.fighters.b.pressedTurns=0;render();});await sleep(80);
    assert.deepEqual(await page.evaluate(()=>[PS.fig.a.pressRole,PS.fig.b.pressRole]),[null,null],'released when the engine says the effect is over');
    assert.deepEqual(page.errors,[]);await page.close();
  });
  await T('a disabled weapon arm hangs limp and the weapon leaves the hand at the blow; no idle reset',async()=>{
    const page=await synthetic();await spy(page);
    await page.evaluate(()=>{window.__psRecord.length=0;
      psRunCue({type:'hit',actor:'a',target:'b',loc:'rarm',lost:5,px:{total:5,wound:5,loc:'Right Arm',tool:'weapon'},
        record:{press:null,after:[{type:'wound',level:'serious',loc:'rarm'},{type:'limb',leg:false,loc:'rarm',who:'b'},{type:'drop',actor:'b'}]}});});
    await sleep(1500);
    const r=await page.evaluate(()=>({limp:PS.fig.b.forceLimp,drop:!!PS.fig.b.dropEl,types:window.__psRecord.map(x=>x.type),idle:window.__psPlays.filter(p=>p.idle).length}));
    assert.equal(r.limp,'rarm','the weapon arm hangs limp');assert(r.drop,'the weapon was dropped');
    assert(r.types.includes('contact'));assert.equal(r.idle,0,'no idle reset after the blow');
    await page.close();
  });
  await T('a disabling leg injury buckles the leg and puts the figure down; a concession looks like yielding; nothing is inferred about severing',async()=>{
    const page=await synthetic();
    await page.evaluate(()=>{psRunCue({type:'hit',actor:'a',target:'b',loc:'rleg',lost:5,px:{total:5,wound:5,loc:'Right Leg',tool:'weapon'},
      record:{press:null,after:[{type:'wound',level:'serious',loc:'rleg'},{type:'limb',leg:true,loc:'rleg',who:'b'}]}});});
    const samples=[];for(let i=0;i<26;i++){samples.push(await page.evaluate(()=>PS.fig.b.cur.l1));await sleep(60);}
    assert(Math.max(...samples)>50,'the front knee dropped (l1 reached '+Math.max(...samples).toFixed(0)+')');
    const end=await page.evaluate(()=>PS.fig.b.cur.t);assert(end<-60,'and the figure goes down (torso '+end.toFixed(0)+')');
    const p2=await synthetic();
    await p2.evaluate(()=>{window.__psRecord.length=0;psRunCue({type:'end',winner:'a',how:'concede'});});await sleep(900);
    const y=await p2.evaluate(()=>({yield:window.__psRecord.some(r=>r.type==='yield'),t:PS.fig.b.cur.t,col:window.__psRecord.some(r=>r.type==='collapse')}));
    assert(y.yield&&!y.col,'a concession yields; it is not a collapse');assert(y.t>8&&y.t<30,'bowed, not fallen (torso '+y.t.toFixed(0)+')');
    const full=await p2.evaluate(()=>/sever|ampu|dismember/i.test(pitsStageCue.toString()+pitsStageBeat.toString()));
    assert.equal(full,false,'no severing is inferred anywhere in the cue logic');
    await page.close();await p2.close();
  });
  await browser.close();console.log(`${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
