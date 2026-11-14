// Every Pits weapon on the spring trial (?stage=spring), in a real browser: one whole bout per weapon against a
// rotating opponent, with seeded dice and varied reactions. For each bout: the spring trial took it, no page or cue
// errors, the bout ended, nothing moved while the stage clock was stopped, and nobody the engine has prone got up.
// Not in CI (several minutes). Needs playwright and a static server (python3 -m http.server 8765).
//   node tests/sweep/pits-weapons-browser.cjs [weapon,weapon,...] [pages in parallel=4]
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const URL_=(process.env.PITS_URL||'http://localhost:8765/experiments/practice-combat.html')+'?stage=spring';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ONLY=process.argv[2]?process.argv[2].split(','):null,PAR=+(process.argv[3]||4);
async function bout(browser,weapon,foe,seed){
  const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(s=>{window.__psRecord=[];try{localStorage.setItem('sitota-practice-guidance-v1','off');}catch(e){}
    let a=s;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
    window.__pitsDie=n=>Math.ceil(rnd()*n);
    window.__frames=[];const tick=()=>{try{if(PS.fig.a.pts&&PS.fig.b.pts){const S=prototypeCombat.state();
      const P=id=>{const f=PS.fig[id],p=f.pts;return {j:['H','hand','tip','hd','F','bF'].map(k=>[Math.round(f.X+f.face*p[k][0]),Math.round(p[k][1])]),ep:!!S.fighters[id].prone};};
      window.__frames.push({c:PS.clock,a:P('a'),b:P('b')});if(window.__frames.length>20000)window.__frames.splice(0,5000);}}catch(e){}requestAnimationFrame(tick);};
    requestAnimationFrame(tick);},seed);
  await page.goto(URL_);
  await page.evaluate(([w,v])=>{const sh=k=>ARENA_WEAPONS[k]&&!ARENA_WEAPONS[k].twoHanded;
    Object.assign(config,{mode:'pvp',charname:'Aurel',pvpName:'Brann',style:75,pvpSkill:70,armor:3,pvpArmor:3,weapon:w,pvpWeapon:v,
      shield:'none',pvpShield:'none'});startRun(false);},[weapon,foe]);
  await sleep(300);
  const st=()=>page.evaluate(()=>{const S=prototypeCombat.state(),V=prototypeCombat.presentation();
    return {phase:S.phase,busy:!!V.busy,pend:S.pending?S.pending.kind:null,R:!!prototypeCombat.pendingRoll(),spring:!!PS.springOn};});
  const click=q=>page.evaluate(q=>{const e=[...document.querySelectorAll(q)].find(x=>!x.disabled);if(!e)return false;e.click();return true;},q);
  let nr=0,stalls=0,busySince=0,s;
  for(let i=0;i<3000;i++){
    s=await st();if(['between','over'].includes(s.phase)&&!s.busy)break;
    if(s.busy){if(!busySince)busySince=Date.now();if(Date.now()-busySince>5000){stalls++;await click('[data-act=continue]');busySince=0;}await sleep(40);continue;}
    busySince=0;
    if(s.R)await click('[data-act=roll]');
    else if(s.pend==='reaction'){nr++;await click('[data-act=react][data-val='+(nr%3===1?'parry':nr%3===2?'evade':'none')+']')||await click('[data-act=react][data-val=none]');}
    else if(s.pend==='effect')await click('#root .prompt [data-act=effect]')||await click('[data-act=skipEffect]');
    else if(s.pend==='location')await click('[data-act=pickloc]');
    else if(i>2200&&await click('[data-act=yield]')){}
    else if(s.pend)await click('#root .prompt [data-act=stand]')||await click('#root .prompt .choice:not([data-act=yield]):not([data-act=help])');
    else await click('[data-act=attack]')||await click('[data-act=stand]')||await click('[data-act=dither]');
    await sleep(40);
  }
  const out=await page.evaluate(()=>({rec:window.__psRecord.filter(r=>/contact|cue-error/.test(r.type)).map(r=>[r.type,r.kind,r.message]),fr:window.__frames}));
  let still=0,rose=0;const low={a:false,b:false};
  for(let i=1;i<out.fr.length;i++){const f=out.fr[i],g=out.fr[i-1];
    if(f.c===g.c)for(const id of ['a','b'])if(f[id].j.some((p,k)=>Math.hypot(p[0]-g[id].j[k][0],p[1]-g[id].j[k][1])>1)){still++;break;}
    for(const id of ['a','b']){const y=f[id].j[0][1];if(!low[id]&&y>-32)low[id]=true;else if(low[id]&&y<-55){low[id]=false;if(f[id].ep)rose++;}}}
  await page.close();
  const faults=[];
  if(!s.spring)faults.push('not on the spring trial');
  if(!['between','over'].includes(s.phase))faults.push('the bout did not end ('+s.phase+')');
  if(errors.length)faults.push('page errors: '+errors.slice(0,2).join(' / '));
  const ce=out.rec.filter(r=>r[0]==='cue-error');if(ce.length)faults.push('cue errors: '+ce.slice(0,2).map(r=>r[2]).join(' / '));
  if(still)faults.push(still+' frames moved with the clock stopped');
  if(rose)faults.push('a prone fighter got up '+rose+' times');
  if(stalls>2)faults.push(stalls+' stalls');
  return {faults,contacts:out.rec.filter(r=>r[0]==='contact').length};
}
(async()=>{
  const browser=await chromium.launch();
  const page=await browser.newPage();await page.goto(URL_);
  const all=await page.evaluate(()=>Object.keys(ARENA_WEAPONS));await page.close();
  const list=ONLY||all;let bad=0,i=0;const jobs=list.map((w,k)=>({w,foe:all[(k*7+3)%all.length],seed:101+k}));
  const run=async()=>{while(i<jobs.length){const j=jobs[i++];let r;
    try{r=await bout(browser,j.w,j.foe,j.seed);}catch(e){r={faults:['harness: '+e.message.split('\n')[0]],contacts:0};}
    if(r.faults.length)bad++;
    console.log((r.faults.length?'FAIL ':'PASS ')+j.w+' against '+j.foe+' ('+r.contacts+' contacts)'+(r.faults.length?': '+r.faults.join('; '):''));}};
  await Promise.all(Array.from({length:PAR},run));
  await browser.close();console.log(list.length+' weapons, '+bad+' with a fault');process.exit(bad?1:0);
})();
