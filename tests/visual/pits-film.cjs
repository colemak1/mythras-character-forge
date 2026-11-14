// A film strip of the live Pits on the spring stage (?stage=spring), for LOOKING at the movement: a real bout in a
// real browser, slowed down, one stage frame every STEP ms of the stage clock, laid out as contact sheets. Frames where
// the picture holds still (a person choosing, the dice) are captured once and outlined in red with what the page was
// waiting for. Not a test: it asserts nothing. Use it before saying a movement change looks right.
//
//   node tests/visual/pits-film.cjs '<config json>' [seed=21] [reactions=parry,evade,none] [frames=96]
//   e.g. node tests/visual/pits-film.cjs '{"weapon":"sword","pvpWeapon":"dagger","armor":4,"pvpArmor":4}' 33 parry,evade
//        node tests/visual/pits-film.cjs '{"mode":"normal","armor":5}' 12        (against the arena's own opponent)
//   config: the page's config (mode 'pvp' by default so both sides' choices are made by the script; weapon, pvpWeapon,
//   shield, pvpShield, armor, pvpArmor; armour makes the bout last). reactions: what the defender chooses, in turn.
//   env: PITS_URL, OUT (folder, default the system temp folder), SLOW (.2), STEP (50), COLS (8), FROM (stage clock ms).
// Needs playwright and a static server at the repository root (python3 -m http.server 8765).
const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const URL_=(process.env.PITS_URL||'http://localhost:8765/experiments/practice-combat.html')+'?stage=spring';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cfg=JSON.parse(process.argv[2]||'{}'),seed=+(process.argv[3]||21),reacts=(process.argv[4]||'parry,evade,none').split(','),MAXF=+(process.argv[5]||96);
const SLOW=+(process.env.SLOW||.2),STEP=+(process.env.STEP||50),COLS=+(process.env.COLS||8),FROM=+(process.env.FROM||0);
const OUT=process.env.OUT||fs.mkdtempSync(path.join(os.tmpdir(),'pits-film-'));
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch(),page=await b.newPage({viewport:{width:1280,height:800}});
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  // seeded dice, and the animation clock slowed (every frame callback is handed a slower time)
  await page.addInitScript(([s,slow])=>{window.__psRecord=[];let a=s;const rnd=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
    window.__pitsDie=n=>Math.ceil(rnd()*n);Math.random=rnd;
    const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>cb(t*slow));},[seed,SLOW]);
  await page.goto(URL_);
  const base={mode:'pvp',charname:'Aurel',pvpName:'Brann',style:75,pvpSkill:70,armor:0,pvpArmor:0,str:13,siz:13,pvpStr:13,pvpSiz:13,weapon:'sword',pvpWeapon:'sword'};
  await page.evaluate(c=>{Object.assign(config,c);startRun(false);},{...base,...cfg});await sleep(400);
  const click=q=>page.evaluate(q=>{const e=[...document.querySelectorAll(q)].find(x=>!x.disabled);if(!e)return false;e.click();return true;},q);
  const stage=await page.$('#pitsStage .ps-stage');
  let nr=0,stuck=0,lastC=-1e9,lastShot=-1e9,still=0;const frames=[];
  const snap=async label=>{const f=path.join(OUT,'f'+String(frames.length).padStart(3,'0')+'.png');await stage.screenshot({path:f});frames.push({f,label});};
  for(let i=0;i<6000&&frames.length<MAXF;i++){
    const s=await page.evaluate(()=>{const S=prototypeCombat.state(),V=prototypeCombat.presentation();
      return {phase:S.phase,busy:!!V.busy,pend:S.pending?S.pending.kind:null,hasR:!!prototypeCombat.pendingRoll(),c:PS.clock,dice:!!(V.roll&&!V.roll.settled),
        spring:!!PS.springOn,w:S.fighters.a.weapon+' against '+S.fighters.b.weapon};});
    if(i===0)console.log(s.w+(s.spring?'':'  (NOT on the spring stage: a weapon has no family yet)'));
    const moving=s.c>lastC+.01;lastC=s.c;
    if(s.c>=FROM&&s.phase==='fight'){
      if(moving){still=0;if(s.c>=lastShot+STEP){lastShot=s.c;await snap(String(Math.round(s.c)));}}
      else if(++still===3)await snap('HELD: '+(s.hasR?'roll':s.pend||(s.busy?(s.dice?'dice':'playing'):'choose action')));
    }
    if(['between','over'].includes(s.phase)&&!s.busy){await sleep(2500);await snap('END');break;}
    if(s.busy||moving||still<4){await sleep(15);continue;}
    if(s.hasR)await click('[data-act=roll]');
    else if(s.pend==='reaction'){const r=reacts[nr++%reacts.length];await click('[data-act=react][data-val='+r+']')||await click('[data-act=react][data-val=none]');}
    else if(s.pend==='effect')await click('#root .prompt [data-act=effect]')||await click('[data-act=skipEffect]');
    else if(s.pend==='location')await click('[data-act=pickloc]');
    else if(s.pend)await click('#root .prompt [data-act=stand]')||await click('#root .prompt .choice:not([data-act=yield]):not([data-act=help])');
    else if(s.phase==='fight'&&!await click('[data-act=attack]')){stuck++;await click('[data-act=stand]')||await click('[data-act=recoverWeapon]')||await click('[data-act=yield]');if(stuck>12)break;}
    await sleep(30);
  }
  const rec=await page.evaluate(()=>window.__psRecord.map(r=>r.type+(r.kind?':'+r.kind:'')+(r.outcome?':'+r.outcome:'')+(r.message?':'+r.message:'')));
  console.log('page errors: '+(errs.length?errs.join('; '):'none'));console.log('stage events: '+rec.join(' '));
  // contact sheets: the frames cropped to the figures, in rows, drawn by the browser
  const sheet=await b.newPage({viewport:{width:COLS*230,height:800}});
  for(let n=0;n*COLS*5<frames.length;n++){const part=frames.slice(n*COLS*5,(n+1)*COLS*5);
    await sheet.setContent('<body style="margin:0;background:#fff;font:11px sans-serif"><div style="display:grid;grid-template-columns:repeat('+COLS+',230px)">'+
      part.map(x=>'<div style="position:relative;width:230px;height:112px;overflow:hidden;box-sizing:border-box;border:'+(/HELD|END/.test(x.label)?'3px solid #c0392b':'1px solid #ddd')+'">'+
        '<img src="data:image/png;base64,'+fs.readFileSync(x.f).toString('base64')+'" style="position:absolute;left:-170px;top:-92px;width:574px">'+
        '<span style="position:absolute;left:4px;top:2px;color:'+(/HELD|END/.test(x.label)?'#a02010':'#555')+'">'+x.label+'</span></div>').join('')+'</div></body>');
    await sleep(200);const out=path.join(OUT,'sheet'+n+'.png');
    await sheet.screenshot({path:out,clip:{x:0,y:0,width:COLS*230,height:Math.ceil(part.length/COLS)*112}});console.log(out);}
  await b.close();
})();
