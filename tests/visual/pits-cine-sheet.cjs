// Frame sheets of the cinematic stage, for LOOKING at a move (owner's OK on a sheet before a look change merges).
// Not a test: it asserts nothing. It opens the real Pits page, starts a two-player bout with the weapons asked for,
// stops the page's own clock, writes one blow on the real rig (PitsCine.blow) and draws it with the real painter
// (psDraw), one frame every STEP ms of the stage clock, into one sheet per case.
//
//   node tests/visual/pits-cine-sheet.cjs '<cases json>' [out folder]
//   a case: {name, weapon, pvpWeapon, shield, pvpShield, outcome, loc, lost, strike, shieldWard, down:'a'|'b', u (fixed
//   choice, 0..1), from, to (ms after the blow), guard (true: also a frame of each fighter's guard first)}
//   env: PITS_URL (default http://localhost:8765/experiments/practice-combat.html), STEP (40), COLS (8), DARK (1)
// Needs playwright and a static server at the repository root (python3 -m http.server 8765).
const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
let chromium;try{({chromium}=require('playwright'));}catch(e){console.log('SKIP: playwright is not installed here');process.exit(0);}
const URL_=process.env.PITS_URL||'http://localhost:8765/experiments/practice-combat.html';
const STEP=+(process.env.STEP||40),COLS=+(process.env.COLS||8);
const cases=JSON.parse(process.argv[2]||'[{"name":"sword-wound","weapon":"sword","pvpWeapon":"sword","outcome":"wound","loc":"chest","lost":4}]');
const OUT=process.argv[3]||fs.mkdtempSync(path.join(os.tmpdir(),'pits-cine-sheet-'));
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch(),page=await b.newPage({viewport:{width:1280,height:800},colorScheme:process.env.DARK?'dark':'light'});
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  for(const c of cases){
    await page.goto(URL_);
    const base={mode:'pvp',charname:'Aurel',pvpName:'Brann',style:75,pvpSkill:70,armor:0,pvpArmor:0,weapon:'sword',pvpWeapon:'sword',shield:'none',pvpShield:'none'};
    await page.evaluate(cf=>{Object.assign(config,cf);startRun(false);},{...base,...Object.fromEntries(['weapon','pvpWeapon','shield','pvpShield'].filter(k=>c[k]).map(k=>[k,c[k]]))});
    await page.waitForTimeout(500);
    const info=await page.evaluate(c=>{
      PS.freeze=true;psMotionFigs();const L=PL();L.keep(0);
      if(c.u!=null&&L.fixChoices)L.fixChoices(c.u);
      for(const id of ['a','b'])L.place(PS.M[id],PS.clock,PS.gap,'guard');
      let t=PS.clock+50;
      if(c.down){t=L.fall(PS.M[c.down],t)+200;PS.fig[c.down].mDown=true;}
      const r=L.blow(PS.M,'a',t,{outcome:c.outcome||'wound',loc:c.loc||'chest',lost:c.lost||0,strike:c.strike||null,shield:!!c.shieldWard,fall:c.fall||false});
      if(L.fixChoices)L.fixChoices(null);
      window.__sheet={t,r};
      return {t,end:r.end,move:r.move,contacts:r.contacts.map(k=>[k.t-t,k.kind]),w:S.fighters.a.weapon+' / '+S.fighters.b.weapon};
    },c);
    const shots=[];
    const from=c.from!=null?c.from:-60,to=c.to!=null?c.to:Math.min(info.end-info.t+120,1600);
    const times=[];for(let x=from;x<=to;x+=STEP)times.push(x);
    for(const k of info.contacts)if(!times.includes(k[0]))times.push(k[0]);times.sort((p,q)=>p-q);
    const draw=dt=>page.evaluate(dt=>{PS.clock=window.__sheet.t+dt;const now=performance.now();for(const id of ['a','b'])psDraw(PS.fig[id],now);
        const X=psFx();if(X)try{X.frame(now,16,false);}catch(e){}
        const r=document.querySelector('#pitsStage .ps-figs').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];},dt);
    // (one crop for the whole case: the figures over every frame, with a margin)
    let box=null;for(const dt of times){const r=await draw(dt);box=box?[Math.min(box[0],r[0]),Math.min(box[1],r[1]),Math.max(box[2],r[2]),Math.max(box[3],r[3])]:r;}
    const clip={x:Math.max(0,box[0]-24),y:Math.max(0,box[1]-24),width:box[2]-box[0]+48,height:box[3]-box[1]+48};
    for(const dt of times){
      await draw(dt);
      const f=path.join(OUT,c.name+'-'+String(shots.length).padStart(3,'0')+'.png');await page.screenshot({path:f,clip});
      const hit=info.contacts.find(k=>k[0]===dt);shots.push({f,label:(dt>=0?'+':'')+dt+' ms'+(hit?' · '+hit[1]:'')});
    }
    const sheet=await b.newPage({viewport:{width:COLS*240,height:600}});
    await sheet.setContent('<body style="margin:0;background:#fff;font:12px sans-serif"><div style="padding:6px 8px;font-weight:bold">'+c.name+' — '+info.w+' — '+(c.outcome||'wound')+' at the '+(c.loc||'chest')+' — move '+info.move+'</div><div style="display:grid;grid-template-columns:repeat('+COLS+',240px)">'+
      shots.map(s=>'<figure style="margin:0;border:1px solid #ccc"><img src="data:image/png;base64,'+fs.readFileSync(s.f).toString('base64')+'" style="width:240px;display:block"><figcaption style="padding:2px 4px'+(s.label.includes('·')?';background:#fde68a':'')+'">'+s.label+'</figcaption></figure>').join('')+'</div></body>');
    const out=path.join(OUT,c.name+'.png');await sheet.screenshot({path:out,fullPage:true});await sheet.close();
    for(const s of shots)fs.unlinkSync(s.f);
    console.log(out+'  ('+info.move+', contacts '+info.contacts.map(k=>k[1]+'@'+k[0]).join(' ')+')');
  }
  console.log('page errors: '+(errs.length?errs.join('; '):'none'));
  await b.close();
})();
