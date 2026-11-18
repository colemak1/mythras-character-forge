// The Pits: browser smoke bouts (AGENTS.md, "Forwards, not backwards", rule 4; owner, 2026-11-18).
// Whole bouts on the deployed page's default stage, with seeded dice and a seeded player who clicks any game button the
// page offers (actions, defences, every Special Effect, Impale choices, withdrawals), then Replay. A bout fails on:
//   - any page error or stage cue error (report 20261118-213134: a Damage Weapon hit threw in the dice tray and the fight
//     stopped, "stuck resolving the exchange");
//   - a stall: the screen stays busy for 20 s with no dice rolling, or nothing can be clicked while the fight goes on;
//   - the loser collapsing more than once in the fight, or more than once in its replay (report 20261118-022241);
//   - a weapon going back into a wound it has been pulled out of (report 20261118-213426).
//
//   node tests/visual/pits-smoke.cjs     (needs playwright and a static server on :8765, see pits-layout.cjs)
//   PITS_SMOKE=n  plays n bouts (default 8)
const assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const URL_=process.env.PITS_URL||'http://localhost:8765/experiments/practice-combat.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const lcg=seed=>{let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};};
// the buttons that play the game (the page's own list in decoratedClick); not menus, speed, replay or reports
const GAME=['attack','shieldAttack','react','changeRange','rangeRespond','effect','skipEffect','pickloc','impaleChoose','impaleLeave',
 'impaleResist','withdrawImpale','recoverWeapon','freePin','freeEntangle','entangleTrip','pinChoose','counterWatch','counterReturn',
 'tripResist','blindResist','footingSkill','footingDefend','reengage','brace','delay','stand'];
const WEAPONS=[['sword','dagger'],['rapier','mace'],['spear','sword'],['longspear','shortsword'],['battleaxe-2h','sword'],
 ['flail','rapier'],['trident','net'],['greatsword','dagger'],['whip','mace'],['sword','sword']];

async function bout(browser,seed,force={}){
  const [w,v]=force.weapons||WEAPONS[seed%WEAPONS.length];
  const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message+' @ '+String(e.stack||'').split('\n')[1]));
  await page.addInitScript(s=>{window.__psRecord=[];try{localStorage.setItem('sitota-practice-guidance-v1','off');}catch(e){}
    let a=s;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
    window.__pitsDie=n=>{if(n===100&&window.__next!=null){const v=window.__next;window.__next=null;return v;}return Math.ceil(rnd()*n);};
    // the wound each lodged weapon is in, every frame: a weapon must not go back into a wound it has left
    window.__lodged=[];const tick=()=>{try{window.__lodged.push(document.querySelectorAll('#pitsStage .ps-lodged').length);}catch(e){}requestAnimationFrame(tick);};
    requestAnimationFrame(tick);},seed);
  await page.goto(URL_);
  await page.evaluate(c=>{Object.assign(config,c);startRun(false);prototypeCombat.presentation().quick=true;},
    {mode:'pvp',charname:'Aurel',pvpName:'Brann',style:70+seed%25,pvpSkill:60+seed%30,weapon:w,pvpWeapon:v,armor:seed%3,pvpArmor:seed%2});
  const pick=lcg(seed*7919);
  const st=()=>page.evaluate(()=>{const S=prototypeCombat.state(),V=prototypeCombat.presentation();
    const R=prototypeCombat.pendingRoll();
    return {phase:S.phase,busy:!!V.busy,rolling:!!(V.roll&&!V.roll.settled),R:!!R,rLabel:R?R.actor+':'+R.label:'',pend:S.pending?S.pending.kind:null};});
  const offered=()=>page.evaluate(game=>[...document.querySelectorAll('#root [data-act],#pitsStage [data-act]')].filter(e=>!e.disabled&&game.includes(e.dataset.act)&&e.getClientRects().length)
    .map(e=>({act:e.dataset.act,val:e.dataset.val??null})),GAME);
  const click=(act,val)=>page.evaluate(([act,val])=>{const e=[...document.querySelectorAll(act==='roll'||act==='replayFight'?'[data-act="'+act+'"]':'#root [data-act="'+act+'"],#pitsStage [data-act="'+act+'"]')]
    .find(x=>!x.disabled&&(val==null||x.dataset.val===val));if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true;},[act,val]);
  const out={errors,stall:null,w,v};let busySince=0,idle=0,forced=false;
  const t0=Date.now();
  for(let i=0;i<20000&&!out.stall;i++){
    const s=await st();
    if(Date.now()-t0>240000){out.stall='the bout took over 4 minutes ('+JSON.stringify(s)+')';break;}
    if(process.env.PITS_DEBUG&&i%50===0)console.log(i,JSON.stringify(s));
    if(s.phase!=='fight')break;
    if(s.busy){
      if(s.rolling){busySince=0;await sleep(50);continue;}
      if(!busySince)busySince=Date.now();
      if(Date.now()-busySince>20000)out.stall='busy for 20 s with no dice rolling';
      await sleep(50);continue;
    }
    busySince=0;
    // forced: Aurel's attacks are criticals until the forced Special Effect has been chosen once
    if(s.R){if(force.effect&&!forced&&/^a:Attack/.test(s.rLabel))await page.evaluate(()=>{window.__next=1;});await click('roll');await sleep(60);continue;}
    // Choose Location: a body part is picked on the figure first, then confirmed
    if(s.pend==='location')await page.evaluate(r=>{const l=[...document.querySelectorAll('[data-act="selectloc"]')].filter(e=>!e.disabled);
      if(l.length)l[Math.floor(r*l.length)].dispatchEvent(new MouseEvent('click',{bubbles:true}));},pick());
    const opts=await offered();
    if(!opts.length){if(++idle>60)out.stall='nothing to click while the fight goes on (pending: '+s.pend+')';await sleep(50);continue;}
    idle=0;
    // attacks most of the time on a free turn, so bouts end; anything else evenly
    const attack=opts.find(o=>o.act==='attack');
    let o=attack&&pick()<.6?attack:opts[Math.floor(pick()*opts.length)];
    // the deck: an effect is a chip to pick, then confirmed
    const want=s.pend==='effect'&&force.effect&&!forced&&await page.evaluate(v=>{const c=document.querySelector(`[data-pa="fx"][data-val="${v}"]`);
      if(!c||c.disabled||c.classList.contains('off'))return false;c.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true;},force.effect);
    if(want){o={act:'effect',val:force.effect};forced=true;}
    else if(s.pend==='reaction'&&force.react)o=opts.find(x=>x.act==='react'&&x.val===force.react)||o;
    else if(force.effect&&!forced&&attack)o=attack;
    if(o.act==='react'||o.act==='effect')await page.evaluate(([pa,val])=>{const e=document.querySelector(`[data-pa="${pa}"][data-val="${val}"]`);
      if(e)e.dispatchEvent(new MouseEvent('click',{bubbles:true}));},[o.act==='react'?'def':'fx',o.val]);
    await click(o.act,o.val);await sleep(60);
  }
  await sleep(2500);
  out.end=await st();
  out.live=await page.evaluate(()=>window.__psRecord.map(r=>r.type));
  out.lodged=await page.evaluate(()=>window.__lodged);
  if(!out.stall&&['between','over'].includes(out.end.phase)){
    // the replay: the same bout again, to its end
    await page.evaluate(()=>{window.__psRecord.length=0;});
    const ok=await click('replayFight')||await page.evaluate(()=>{if(typeof startFightReplay!=='function')return false;startFightReplay();return true;});
    if(ok){const t0=Date.now();while(Date.now()-t0<90000&&(await st()).busy)await sleep(200);
      out.replay=await page.evaluate(()=>window.__psRecord.map(r=>r.type));out.replayDone=!(await st()).busy;}
  }
  out.forced=forced;
  await page.close();return out;
}

(async()=>{
  const browser=await chromium.launch();let pass=0,fail=0;
  const T=async(name,f)=>{try{await f();console.log('PASS '+name);pass++;}catch(e){console.log('FAIL '+name+': '+e.message.split('\n')[0]);fail++;}};
  const n=+process.env.PITS_SMOKE||4;
  // every Special Effect at least once (they are where the rare branches are: report 20261118-213134, Damage Weapon)
  // (each with weapons that can do it: Impale needs a point, Bash and Stun Location a crushing weapon, Sunder an axe)
  const EFFECTS=[['choose',['sword','dagger']],['press',['rapier','mace']],['trip',['spear','sword']],['disarm',['sword','sword']],
   ['bleed',['battleaxe-2h','sword']],['impale',['spear','sword']],['bash',['mace','sword']],['stun',['mace','dagger']],
   ['sunder',['battleaxe-2h','sword']],['damageWeapon',['sword','sword']],['maximize',['sword','dagger']],['bypassArmour',['rapier','mace']],
   ['circumventParry',['spear','sword']]];
  const only=process.env.PITS_ONLY?process.env.PITS_ONLY.split(','):null;
  const runs=[...Array(only?0:n)].map((_,i)=>({seed:i+1,force:{}})).concat(EFFECTS.filter(([e])=>!only||only.includes(e))
   .map(([effect,weapons],i)=>({seed:100+i,force:{effect,weapons,react:i%2?'parry':'none'}})));
  for(const {seed,force} of runs){
    const r=await bout(browser,seed,force);
    await T(`smoke bout ${seed} (${r.w} against ${r.v}${force.effect?', '+force.effect+' forced':''}): no errors, no stall, one collapse, ended and replayed`,()=>{
      if(force.effect)assert(r.forced,force.effect+' was never offered: change the weapons or the seed');
      assert.deepEqual(r.errors,[],'page errors');
      assert.equal(r.stall,null,'stalled: '+r.stall);
      assert(['between','over'].includes(r.end.phase),'the bout ended ('+r.end.phase+')');
      const cues=r.live.filter(t=>t==='cue-error');assert.equal(cues.length,0,'stage cue errors');
      assert(r.live.filter(t=>t==='collapse').length<=1,'the loser collapsed '+r.live.filter(t=>t==='collapse').length+' times');
      // lodged weapons over time: once a count falls, it never rises again without a new lodge
      const lodges=r.live.filter(t=>t==='lodge').length;let rises=0;for(let i=1;i<r.lodged.length;i++)if(r.lodged[i]>r.lodged[i-1])rises++;
      assert(rises<=lodges,`a weapon went back into a wound (${rises} times in, ${lodges} lodges)`);
      if(r.replay){assert(r.replayDone,'the replay finished');
        assert(r.replay.filter(t=>t==='collapse').length<=1,'the replay collapsed the loser '+r.replay.filter(t=>t==='collapse').length+' times');}
    });
  }
  await browser.close();
  console.log(pass+' passed, '+fail+' failed');
  process.exit(fail?1:0);
})();
