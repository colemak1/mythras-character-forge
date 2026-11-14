// Deterministic browser scenarios for the Pits arena (docs/pits-visual-review-20261111.md).
// Both fighters are people (local PvP), so every choice and every die is scripted: the
// engine's dice come from a queue per die size (window.__pitsDie, a test-only seam in
// practice-combat.html). Each scenario plays one real exchange in a real browser, records
// the stage's events (window.__psRecord), screenshots the stage at the moment of contact,
// and asserts the engine's HP/AP/state together with the animation's own contact geometry.
//
//   node tests/visual/pits-scenarios.cjs [name ...]          (needs playwright; a static server)
//   PITS_URL=http://localhost:8765/experiments/practice-combat.html  PITS_OUT=docs/pits-visual-checks
//
// Not part of the CI run (CI has no browser); screenshots land in PITS_OUT.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const URL_=process.env.PITS_URL||'http://localhost:8765/experiments/practice-combat.html';
const OUT=process.env.PITS_OUT||path.join(__dirname,'..','..','docs','pits-visual-checks');
const VIEW={width:1280,height:800};
fs.mkdirSync(OUT,{recursive:true});

const A='Kethan',B='Second';
// Shared start: both fighters 3 AP, no Damage Modifier dice, Kethan acts first.
const base=o=>({config:{mode:'pvp',charname:A,pvpName:B,weapon:'sword',shield:'none',style:60,evade:45,armor:0,str:11,siz:12,con:13,dex:13,int:13,
  pvpWeapon:'sword',pvpShield:'none',pvpSkill:60,pvpEvade:45,pvpArmor:0,pvpStr:11,pvpSiz:12,pvpCon:13,pvpDex:13,pvpInt:13,...(o||{})}});
const INIT={10:[10,1]};
// roll order inside one exchange: d100 attack, d100 defence, d20 location, weapon dice
const SC=[
 {name:'01-full-weapon-parry',cfg:base(),dice:{...INIT,100:[20,10],20:[11],8:[4]},turns:[{act:'attack',h:{reaction:'react:parry'}}],
  check:r=>{r.outcome('full-parry');r.hp(B,0);r.ap(A,-1);r.ap(B,-1);r.contactAway('full-parry');}},
 {name:'02-shield-parry',cfg:base({pvpShield:'heater'}),dice:{...INIT,100:[20,10],20:[11],8:[4]},turns:[{act:'attack',h:{reaction:'react:shield'}}],
  check:r=>{r.outcome('full-parry');r.hp(B,0);r.contactAway('full-parry');}},
 {name:'03-partial-parry',cfg:base({pvpWeapon:'dagger'}),dice:{...INIT,100:[20,10],20:[11],8:[6]},turns:[{act:'attack',h:{reaction:'react:parry'}}],
  check:r=>{r.outcome('partial-parry');r.hpLoss(B,'Chest',3,6);r.contact('deflect');r.contact('partial-parry');}},
 {name:'04-armour-only',cfg:base({pvpArmor:6}),dice:{...INIT,100:[20],20:[11],8:[3]},turns:[{act:'attack',h:{reaction:'react:none'}}],
  check:r=>{r.outcome('armour');r.hp(B,0);r.noBlood();r.contactAt('armour');}},
 {name:'05-miss',cfg:base(),dice:{...INIT,100:[90]},turns:[{act:'attack',h:{reaction:'react:none'}}],
  check:r=>{r.outcome('miss');r.hp(B,0);r.noBlood();}},
 {name:'06-evade-success',cfg:base(),dice:{...INIT,100:[20,40]},turns:[{act:'attack',h:{reaction:'react:evade'}}],
  check:r=>{r.outcome('evaded');r.hp(B,0);r.prone(B,true);r.noBlood();}},
 {name:'07-evade-failure-hit',cfg:base(),dice:{...INIT,100:[20,95],20:[11],8:[5]},turns:[{act:'attack',h:{reaction:'react:evade'}}],
  check:r=>{r.outcome('wound');r.hpLoss(B,'Chest',5,5);r.contactAt('wound');}},
 {name:'08-blocked-critical',cfg:base(),dice:{...INIT,100:[2,10],20:[11],8:[4]},turns:[{act:'attack',h:{reaction:'react:parry',effect:'skipEffect'}}],
  check:r=>{r.banner('Critical attack');r.noBanner('Critical hit');r.outcome('full-parry');r.hp(B,0);}},
 {name:'09-head-hit',cfg:base(),dice:{...INIT,100:[20],20:[20],8:[5]},turns:[{act:'attack',h:{reaction:'react:none'}}],
  check:r=>{r.outcome('wound');r.hpLoss(B,'Head',5,5);r.contactAt('wound');}},
 {name:'10-torso-hit',cfg:base(),dice:{...INIT,100:[20],20:[11],8:[5]},turns:[{act:'attack',h:{reaction:'react:none'}}],
  check:r=>{r.outcome('wound');r.hpLoss(B,'Chest',5,5);r.contactAt('wound');}},
 {name:'11-leg-hit',cfg:base(),dice:{...INIT,100:[20],20:[5],8:[5]},turns:[{act:'attack',h:{reaction:'react:none'}}],
  check:r=>{r.outcome('wound');r.hpLoss(B,'Left Leg',5,5);r.contactAt('wound');}},
 {name:'12-spear-thrust-leg',cfg:base({weapon:'spear'}),dice:{...INIT,100:[20],20:[5],6:[3]},turns:[{act:'attack',h:{reaction:'react:none'}}],
  check:r=>{r.outcome('wound');r.contactAt('wound');}},
 {name:'13-choose-location-leg',cfg:base(),dice:{...INIT,100:[2],8:[5]},turns:[{act:'attack',h:{reaction:'react:none',effect:'effect:choose',location:'pickloc:Left Leg'}}],
  check:r=>{r.outcome('wound');r.hpLoss(B,'Left Leg',5,5);r.contactAt('wound');r.locate('lleg');}},
 {name:'14-trip-and-stand',cfg:base(),dice:{...INIT,100:[2,95,40,95],8:[]},turns:[
   {act:'attack',h:{reaction:'react:none',effect:'effect:trip',tripResist:'tripResist:brawn',location:'skip'}}],
  check:r=>{r.prone(B,true);r.event('contact','trip');}},
 {name:'15-disarm',cfg:base(),dice:{...INIT,100:[2,95],20:[11]},turns:[{act:'attack',h:{reaction:'react:none',effect:'effect:disarm',location:'skip'}}],
  check:r=>{r.event('contact','disarm');r.flag(B,'disarmed',true);}},
 {name:'16-impale-held',cfg:base({weapon:'spear'}),dice:{...INIT,100:[2],20:[5],6:[3,4]},turns:[{act:'attack',h:{reaction:'react:none',effect:'effect:impale',impaleLeave:'impaleLeave:hold'}}],
  check:r=>{r.lodged(B,true);r.flag(A,'hasImpaled',true);}},
 {name:'17-impale-abandoned',cfg:base({weapon:'spear'}),dice:{...INIT,100:[2],20:[5],6:[3,4]},turns:[{act:'attack',h:{reaction:'react:none',effect:'effect:impale',impaleLeave:'impaleLeave:leave'}}],
  check:r=>{r.lodged(B,false);r.flag(A,'disarmed',true);}},
 {name:'18-victory',cfg:base({weapon:'greatsword'}),dice:{...INIT,100:[2],20:[20],10:[10],8:[]},turns:[{act:'attack',h:{reaction:'react:none',effect:'effect:maximize',location:'skip'}}],
  check:r=>{r.over();}},
];

// ---------------- harness ----------------
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function boot(browser,sc){
  const page=await browser.newPage({viewport:VIEW});
  page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
  await page.addInitScript(()=>{window.__psRecord=[];window.__psFreeze=true;window.__dq={};
    window.__pitsDie=n=>{const q=window.__dq[n];return q&&q.length?q.shift():Math.ceil(n/2);};});
  await page.goto(URL_+'?bottom=current');
  await page.evaluate(sc=>{window.__dq=sc.dice;Object.assign(config,sc.cfg.config);startRun(false);},{dice:sc.dice,cfg:sc.cfg});
  await sleep(300);
  return page;
}
const state=page=>page.evaluate(()=>{
  const S=prototypeCombat.state(),V=prototypeCombat.presentation(),f=id=>({hp:{...S.fighters[id].hp},ap:S.fighters[id].ap,prone:S.fighters[id].prone,disarmed:!!S.fighters[id].disarmed,
    impaledWounds:(S.fighters[id].impaledWounds||[]).length,impaledWeapon:!!S.fighters[id].impaledWeapon});
  return {phase:S.phase,busy:!!V.busy,pend:S.pending?S.pending.kind:null,hasR:!!prototypeCombat.pendingRoll(),rLabel:(prototypeCombat.pendingRoll()||{}).label,turn:S.order?S.order[S.turnIndex]:null,
    a:f('a'),b:f('b'),winnerId:S.winnerId||null,logs:S.logs.slice(-8).map(l=>l.title)};});
const clickSel=(page,spec)=>{
  const [act,val]=spec.split(':');
  return page.evaluate(([act,val])=>{
    const q=val!=null?`[data-act="${act}"][data-val="${val}"]`:`[data-act="${act}"]`;
    const el=[...document.querySelectorAll(q)].find(e=>!e.disabled&&!e.hasAttribute('disabled'));
    if(!el)return false;el.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true;},[act,val]);
};
async function shoot(page,sc,r){
  // screenshot each new contact event of the stage the moment it is recorded
  const rec=await page.evaluate(()=>window.__psRecord);
  for(let i=r.seen;i<rec.length;i++){
    if(rec[i].type==='contact'){const f=path.join(OUT,`${sc.name}-${rec[i].kind}.png`);
      await (await page.$('#pitsStage .ps-stage')).screenshot({path:f});r.shots.push(path.basename(f));await page.evaluate(()=>window.__psThaw());}
  }
  r.seen=rec.length;
}
// Play until the exchange has fully resolved and it is a person's turn again (or the fight ended).
async function drain(page,sc,r,h){
  for(let i=0;i<900;i++){
    await shoot(page,sc,r);
    const st=await state(page);
    if(st.busy){if(await page.evaluate(()=>!!document.querySelector('[data-act=continue]')))await clickSel(page,'continue');await sleep(30);continue;}
    if(st.phase!=='fight')return st;
    if(st.hasR){await clickSel(page,'roll');await sleep(60);continue;}
    if(st.pend){
      const want=h[st.pend==='tripResistChoice'?'tripResist':st.pend==='impaleLeave'?'impaleLeave':st.pend]||h.any||(st.pend==='effect'?'skipEffect':st.pend==='impalePick'?'impaleChoose:0':undefined);
      if(!want)throw new Error(`${sc.name}: no handler for pending ${st.pend}`);
      if(want==='skip'||want==='skipEffect'){await clickSel(page,st.pend==='effect'?'skipEffect':want);}
      else if(!await clickSel(page,want)){if(st.pend==='effect'&&h.effect&&!await clickSel(page,'skipEffect'))await sleep(60);else await sleep(60);}
      await sleep(80);continue;
    }
    // no pending decision: if the exchange is done we are back at "action"
    if(r.acted)return st;
    await sleep(40);
  }
  throw new Error(sc.name+': did not settle');
}
async function runScenario(browser,sc){
  const page=await boot(browser,sc),r={seen:0,shots:[],acted:false,page,rec:[],errors:page.errors};
  // initiative: manual d10 rolls until both are in and the replay is over
  for(let k=0;k<600;k++){
    await shoot(page,sc,r);const st=await state(page);
    if(st.busy){if(await page.evaluate(()=>!!document.querySelector('[data-act=continue]')))await clickSel(page,'continue');await sleep(30);continue;}
    if(st.hasR){await clickSel(page,'roll');await sleep(100);continue;}
    break;
  }
  r.before=await state(page);
  if(process.env.PITS_DEBUG)console.log('before',JSON.stringify({phase:r.before.phase,busy:r.before.busy,pend:r.before.pend,hasR:r.before.hasR,rLabel:r.before.rLabel,turn:r.before.turn}));
  for(const turn of sc.turns){
    for(let k=0;k<300&&!await clickSel(page,turn.act);k++)await sleep(30);
    r.acted=true;
    await drain(page,sc,r,turn.h);
    for(let k=0;k<400&&(await state(page)).busy;k++){await shoot(page,sc,r);await sleep(30);}
  }
  await sleep(400);await shoot(page,sc,r);
  r.after=await state(page);r.rec=await page.evaluate(()=>window.__psRecord);
  await (await page.$('#pitsStage .ps-stage')).screenshot({path:path.join(OUT,`${sc.name}-after.png`)});
  return r;
}
// ---------------- assertions ----------------
function api(r,sc){
  const id=n=>n===A?'a':'b';
  const dist=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
  const ev=(t,k)=>r.rec.filter(e=>e.type===t&&(k==null||e.kind===k||e.outcome===k));
  return {
    outcome:k=>assert(ev('resolve',k).length>0,`${sc.name}: outcome ${k}, saw ${JSON.stringify(ev('resolve').map(e=>e.outcome))}`),
    hp:(n,d)=>assert.deepEqual(Object.values(r.after[id(n)].hp),Object.values(r.before[id(n)].hp).map(v=>v+d),`${n} HP unchanged by ${d}`),
    hpLoss:(n,loc,loss,total)=>assert.equal(r.before[id(n)].hp[loc]-r.after[id(n)].hp[loc],loss,`${n} ${loc} HP lost`),
    ap:(n,d)=>assert.equal(r.after[id(n)].ap-r.before[id(n)].ap,d,`${n} AP change`),
    prone:(n,v)=>assert.equal(r.after[id(n)].prone,v,`${n} prone`),
    flag:(n,k,v)=>{const s=r.after[id(n)];const val=k==='hasImpaled'?s.impaledWeapon:s[k];assert.equal(!!val,v,`${n} ${k}`);},
    lodged:(n,held)=>{const s=r.after[id(n)];assert.equal(s.impaledWounds>0,true,`${n} has a weapon in the wound`);
      const h=r.after[id(n)==='a'?'b':'a'];assert.equal(h.impaledWeapon,held,`wielder still holds it: ${held}`);},
    contact:k=>assert(ev('contact',k).length>0,`${sc.name}: a ${k} contact was shown`),
    event:(t,k)=>assert(ev(t,k).length>0,`${sc.name}: ${t} ${k}`),
    // the tip really is on the struck body part
    contactAt:k=>{const c=ev('contact',k)[0];assert(c&&c.tip&&c.point,`${sc.name}: contact ${k} has geometry`);
      const d=dist(c.tip,c.point);assert(d<=26,`${sc.name}: tip ${d.toFixed(0)}px from the struck part (<=26)`);},
    // a parry stops the blow away from the body
    contactAway:k=>{const c=ev('contact',k)[0];assert(c&&c.tip,`${sc.name}: contact ${k} has geometry`);
      const res=ev('resolve',k)[0];assert(c.point&&dist(c.tip,c.point)<=22,`${sc.name}: tip on the guard point`);
      assert(res,`${sc.name}: resolved as ${k}`);},
    locate:loc=>assert(ev('locate').some(e=>e.loc===loc),`${sc.name}: location ring on ${loc}`),
    noBlood:()=>assert(!r.rec.some(e=>e.type==='contact'&&e.lost>0),`${sc.name}: no injury shown`),
    banner:t=>assert(r.banners.some(b=>b===t),`${sc.name}: banner "${t}" shown, saw ${JSON.stringify(r.banners)}`),
    noBanner:t=>assert(!r.banners.includes(t),`${sc.name}: no banner "${t}"`),
    over:()=>assert.notEqual(r.after.phase,'fight',`${sc.name}: the fight ended`),
  };
}
(async()=>{
  const only=process.argv.slice(2);
  const browser=await chromium.launch();let fail=0,pass=0;
  for(const sc of SC){
    if(only.length&&!only.some(o=>sc.name.includes(o)))continue;
    try{
      const r=await runScenario(browser,sc);
      r.banners=await r.page.evaluate(()=>window.__psBanners||[]);
      assert.deepEqual(r.errors,[],'page errors');
      try{sc.check(api(r,sc));}catch(e){e.state={b:r.after.b,logs:r.after.logs,contact:r.rec.filter(x=>x.type==='contact'),rec:r.rec.map(x=>x.type+':'+(x.outcome||x.kind||'')).join(' ')};throw e;}
      console.log('PASS '+sc.name+'  ['+r.shots.join(', ')+']');pass++;await r.page.close();
    }catch(e){console.log('FAIL '+sc.name+': '+e.message.split('\n')[0]);if(process.env.PITS_DEBUG&&e.state)console.log(JSON.stringify(e.state));fail++;}
  }
  await browser.close();console.log(`${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
