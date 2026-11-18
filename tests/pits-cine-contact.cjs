// The Pits cinematic stage: contacts that are not a blow to the body, the replay, lasting state and reports
// (audit docs/pits-cinematic-bug-audit-20261115.md: CA-08, CA-09, CA-12, the reporting gap; CL-01 to CL-04 reproduced
// first, each check below failed on main). The look of what the audit does not call wrong: tests/pits-cine-look.cjs.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const C=require('../experiments/pits-cine.js');
const root=path.resolve(__dirname,'..');
let passed=0;const tests=[];const test=(n,f)=>tests.push([n,f]);
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
C.keep(0);
const sword={kind:'blade',len:92};

// a stage with the cinematic movement, no page (as in tests/pits-cine-state.cjs)
function stage(replaying,extra){
  const ctx={console,Math,JSON,Promise,location:{search:''},performance:{now:()=>0},requestAnimationFrame(){},cancelAnimationFrame(){},
    setTimeout:f=>{f();return 0;},clearTimeout(){},matchMedia:()=>({matches:false}),
    document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({style:{},classList:{add(){},remove(){}},appendChild(){}})}};
  ctx.window=ctx;vm.createContext(ctx);
  for(const f of ['experiments/pits-cine.js','experiments/pits-stage.js',...(extra||[])])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
  const run=s=>vm.runInContext(s,ctx);
  run(`PitsCine.keep(0);var __ev=[];V={replaying:${!!replaying},busy:false,hold:false};
    psUntil=t=>{PS.clock=Math.max(PS.clock,t);return Promise.resolve();};psHitStop=()=>Promise.resolve();
    psDom=psBurst=psDust=psBanner=psFlyWeapon=psRing=psShake=psPunch=psReticle=psHudConditions=()=>{};
    psEmit=(t,d)=>{__ev.push([t,d]);};
    PS.cine=true;PS.springOn=true;PS.clock=0;
    const wk={kind:'blade',len:92};
    for(const id of ['a','b'])PS.fig[id]={id,look:{wk,shield:false,parts:{},prone:false,swap:false,armed:true,limp:{rarm:false,larm:false}},X:0,face:id==='a'?1:-1,scale:1,pts:{hd:[0,0],Sh:[0,0],tip:[0,0],hand:[0,0]}};
    PS.M={a:PitsCine.fighter('a',wk,false,{}),b:PitsCine.fighter('b',wk,false,{})};PS.gap=PitsCine.gap(wk,wk,'long');
    PitsCine.place(PS.M.a,0,PS.gap,'guard');PitsCine.place(PS.M.b,0,PS.gap,'guard');PS.clock=100;`);
  return {run,ctx,ev:()=>ctx.__ev};
}
const cueOf=(S,title,body,meta)=>JSON.parse(S.run(`JSON.stringify(pitsStageCue(${JSON.stringify({title,body,meta})},{a:'Aurel',b:'Brann'}))`));

test('a concurrent turn keeps the fall already shown while the engine grants the second action',()=>{
  const S=stage(false);
  S.run(`S={phase:'fight',fighters:{a:{},b:{prone:false}},tie:{second:'b',deferred:{f:{prone:true}}}};
    PS.clock=PitsCine.fall(PS.M.b,PS.clock);PS.fig.b.mDown=true;psLull();`);
  assert(S.run('!!PS.M.b.down && PS.fig.b.mDown'));
  assert(!S.ev().some(([type,data])=>type==='reconcile'&&data.kind==='up'));
  S.run('S.tie=null;psLull()');
  assert(S.ev().some(([type,data])=>type==='reconcile'&&data.kind==='up'));
});

// ----- CA-08 -----
test('CA-08: Weapon struck, Withdraw Impale and Withdrawal injury each have a cue',()=>{
  const S=stage(false);
  const w=cueOf(S,'Weapon struck','Damage Weapon resolves instead of a blow to the body.');
  assert.equal(w&&w.type,'weapon','Damage Weapon has no cue');
  assert.equal(cueOf(S,'Weapon struck',"Aurel hits Brann's Greatsword for 5; 6 AP protects it, 0 HP lost (12 remaining).",{actor:'a'}).type,'weapon');
  const wi=cueOf(S,'Withdraw Impale','Aurel Brawn 20 (Success) versus Brann Brawn 70 (Failure): weapon withdrawn.',{actor:'a'});
  assert.deepEqual([wi.type,wi.ok],['withdraw',true]);
  assert.equal(cueOf(S,'Withdraw Impale','Aurel Brawn 90 (Failure): weapon remains lodged.',{actor:'a'}).ok,false);
  const inj=cueOf(S,'Withdrawal injury','Aurel withdraws Shortspear: 9 normal weapon damage, halved to 4.',{actor:'a',target:'b',location:'Right Leg',impact:{target:'b',location:'Right Leg',hpLost:4}});
  assert.deepEqual([inj.type,inj.actor,inj.target,inj.loc,inj.lost],['withdrawHit','a','b','rleg',4]);
  // and they are replayed
  assert(S.run(`pitsStageReplayable({title:'Weapon struck',body:'x'},{a:'Aurel',b:'Brann'})`));
  assert(S.run(`pitsStageReplayable({title:'Withdrawal injury',body:'x',meta:{actor:'a',impact:{target:'b',location:'Chest',hpLost:2}}},{a:'Aurel',b:'Brann'})`));
});
test('CA-08: the weapon struck is drawn as a contact with the weapon, with no body damage, and the exchange is released',async()=>{
  for(const rep of [false,true]){
    const S=stage(rep);
    S.run(`PS.ex={atk:'a',aGrade:2,react:'parry',reactGrade:1,reactTool:'weapon'};PS.fig.a.exPose='x';PS.fig.b.exPose='y'`);
    await S.run(`psMotionCue({type:'weapon',actor:null,px:null})`);
    const contacts=JSON.parse(JSON.stringify(S.ev().filter(e=>e[0]==='contact')));
    assert.deepEqual(contacts.map(e=>e[1].kind),['weapon'],'contacts: '+JSON.stringify(contacts));
    assert(S.run(`!PS.fig.b.flash&&!PS.M.b.hurt`),'the struck weapon hurt the body');
    assert(S.run(`!PS.fig.a.exPose&&!PS.fig.b.exPose`),'the held exchange is not released');
  }
});
test('CA-08: a withdrawal tears the weapon out and lands its own injury; one that ends the fight lays the loser down',async()=>{
  for(const rep of [false,true]){
    const S=stage(rep);
    await S.run(`psMotionCue({type:'withdrawHit',actor:'a',target:'b',loc:'rleg',lost:4,record:{after:[]}})`);
    const hit=S.ev().find(e=>e[0]==='contact');
    assert(hit&&hit[1].lost===4&&hit[1].target==='b'&&hit[1].loc==='rleg','no injury contact: '+JSON.stringify(hit));
    const S2=stage(rep);
    await S2.run(`psMotionCue({type:'withdrawHit',actor:'a',target:'b',loc:'chest',lost:5,record:{after:[{type:'end',winner:'a',how:'injury'}]}})`);
    assert(S2.run(`PS.M.b.down&&PS.fig.b.mDown&&PS.fig.b.mEnd==='lying'`),'the withdrawal that ends the fight leaves the loser standing');
    assert(S2.run(`PitsCine.joints(PS.M.b,PS.clock+2000).P[1]<30`));
  }
  // the rig: the weapon is in the wound at the contact
  const M={a:C.fighter('a',{kind:'spear',len:150},false,{}),b:C.fighter('b',sword,false,{})};const g=C.gap(M.a.wk,sword,'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
  const r=C.withdraw(M,'a',100,{loc:'chest',lost:3});const c=r.contacts[0],j=C.joints(M.a,c.t);
  const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));return Math.hypot(p[0]-(a[0]+vx*u),p[1]-(a[1]+vy*u));};
  assert(seg(c.at,j.Hn,j.tip)<3,'the weapon is '+seg(c.at,j.Hn,j.tip).toFixed(1)+' from the wound it is torn out of');
});

// (owner, 2026-11-16: "Withdraw weapon looks horrible for both normal attacks and especially the finisher"). The
// withdrawal is one pull, never a second thrust: the point is never driven further into the body than the lodged point
// (10 in), the shaft keeps its line while it comes out, the point is clear of the wound at the end of the pull, nothing
// jumps, a finishing one ends with the loser down. The stage draws it as a tear (no impact frame), and two fighters
// joined by a weapon held in a wound do not step apart round it.
test('a withdrawal pulls the point straight back out of the wound',()=>{
  const C2=require('../experiments/pits-cine.js');C2.keep(0);
  const WK={sword:{kind:'blade',len:92},rapier:{kind:'blade',len:112,thin:1},spear:{kind:'spear',len:150},dagger:{kind:'blade',len:50},
    halberd:{kind:'polearm',len:176},greatsword:{kind:'blade',len:130,hands:2}};
  for(const w in WK)for(const loc of ['chest','abdomen','head','rleg','larm'])for(const held of [true,false])for(const defeated of [false,true]){
    C2.fixChoices(.4);const M={a:C2.fighter('a',WK[w],false,{}),b:C2.fighter('b',sword,false,{})};const g=C2.gap(WK[w],sword,'long');
    C2.place(M.a,0,g,'guard');C2.place(M.b,0,g,'guard');
    const r=C2.withdraw(M,'a',100,{loc,lost:5,held,defeated});C2.fixChoices(null);
    const what=w+' '+loc+(held?' held':' left in')+(defeated?' finishing':''),tc=r.contacts[0].t;
    assert.equal(r.contacts[0].kind,'tear',what);
    let prev=null;const angs=[];
    for(let t=100;t<=r.end;t+=4){const a=C2.joints(M.a,t),b=C2.joints(M.b,t);
      if(prev)for(const [x,y] of [[a,prev.a],[b,prev.b]])for(const k of ['P','Hd'])assert(Math.hypot(x[k][0]-y[k][0],x[k][1]-y[k][1])<46,what+': '+k+' jumps at '+t);
      prev={a,b};
      if(t>=tc-80&&t<=tc){const T=C2.partAt(M.b,t,loc),u=[a.tip[0]-a.Hn[0],a.tip[1]-a.Hn[1]],l=Math.hypot(...u);
        assert(((a.tip[0]-T[0])*u[0]+(a.tip[1]-T[1])*u[1])/l<16,what+': the point is driven in past the wound at '+(t-tc));}
      if(t>=tc&&t<=tc+120)angs.push(Math.atan2(a.tip[1]-a.Hn[1],a.tip[0]-a.Hn[0])*180/Math.PI);}
    assert(Math.max(...angs)-Math.min(...angs)<12,what+': the shaft turns as it comes out');
    const a=C2.joints(M.a,tc+120),T=C2.partAt(M.b,tc,loc);
    assert(Math.hypot(a.tip[0]-T[0],a.tip[1]-T[1])>30,what+': the point is still in the wound after the pull');
    if(defeated)assert(M.b.down,what+': the loser ends down');
  }
  const st=fs.readFileSync(path.join(__dirname,'../experiments/pits-stage.js'),'utf8');
  assert(/c\.kind==='tear'\)\{[\s\S]{0,300}impact\(w,defeated\?'tearFinish':'tear'/.test(st),'the stage draws a tear, not a hit');
  assert((st.match(/psTiedByLodge\(\)/g)||[]).length>=2,'no stepping apart round a held weapon');
});

test('CA-08: the deck tells the withdrawal as the end of its exchange, and a struck weapon ends its exchange',()=>{
  const output={innerHTML:'',addEventListener(){}};
  const ctx={console,URLSearchParams,JSON,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search:'',pathname:'/experiments/practice-combat.html'},
    navigator:{userAgent:'test'},sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},alert(){},
    document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},scripts:[]},
    matchMedia:()=>({matches:false}),requestAnimationFrame(){},__psRecord:[]};
  ctx.window=ctx;vm.createContext(ctx);
  for(const f of ['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js',
    'experiments/pits-game.js','experiments/pits-stage.js','experiments/pits-arena.js','experiments/pits-bottom.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
  const run=x=>vm.runInContext(x,ctx);
  run(`startRun();R=null;V.busy=false;S.fighters.a.name='Aurel';S.fighters.b.name='Brann';S.phase='fight';S.pending=null;`);
  run(`S.logs=[{id:1,title:'Aurel attacks',body:'20 against Combat Style 75% — SUCCESS.',kind:'roll',meta:{exid:1,actor:'a'}},
    {id:2,title:'Aurel hits Right Leg',body:'6 weapon (6) +0 (+0) = 6 total; 0 parry; 0 armour; 6 HP lost.',kind:'hurt',meta:{actor:'a',impact:{target:'b',location:'Right Leg',hpLost:6},px:{total:6,blocked:0,armour:0,wound:6,loc:'Right Leg',before:5,after:-1}}},
    {id:3,title:'Withdraw Impale',body:'Aurel Brawn 20 (Success): weapon withdrawn.',kind:'hit',meta:{actor:'a'}},
    {id:4,title:'Withdrawal injury',body:"Aurel withdraws Shortspear: 9 normal weapon damage, halved to 4.",kind:'hurt',meta:{actor:'a',target:'b',location:'Right Leg',impact:{target:'b',location:'Right Leg',hpLost:4}}}];PB.key='';`);
  const res=JSON.parse(run('JSON.stringify(paExchangeResult(pbExchange()))'));
  assert.match(res.head,/withdrawal · Right Leg/,'the result is still the Impale: '+res.head);
  const story=JSON.parse(run('JSON.stringify(pbStory(pbExchange()).map(x=>x.html))')).join(' / ');
  assert.match(story,/Wounded · Right Leg/,'the Impale itself is no longer told');assert.match(story,/4 HP lost as the weapon is pulled out/);
  run(`S.logs=[{id:1,title:'Aurel attacks',body:'20 against Combat Style 75% — SUCCESS.',kind:'roll',meta:{exid:1,actor:'a'}},
    {id:2,title:'Damage Weapon',body:"Aurel inflicts 5 damage on Brann's Greatsword.",kind:'hit',meta:{actor:'a'}},
    {id:3,title:'Weapon struck',body:'Damage Weapon resolves instead of a blow to the body.',kind:'system'}];PB.key='';`);
  assert.equal(JSON.parse(run('JSON.stringify(paExchangeResult(pbExchange()))')).head,'Weapon struck');
});
// ----- CA-09 -----
test('CA-09: the replay repeats the live move (the audit\'s case: same seed, a declared attack and parry, a finishing blow to the head)',()=>{
  const make=()=>{Math.random=()=>0.002;const M={a:C.fighter('a',sword,false,{}),b:C.fighter('b',sword,false,{})};const g=C.gap(sword,sword,'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');return M;};
  for(const key of [7,41,'x12']){
    const L=make();C.intent(L.a,100,'attack',.5);C.intent(L.b,400,'parry',.5);
    const live=C.blow(L,'a',1000,{outcome:'wound',loc:'head',lost:9,defeated:true,key});
    const R=make();const rep=C.blow(R,'a',100,{outcome:'wound',loc:'head',lost:9,defeated:true,flow:true,key,move:live.move,ward:live.ward});
    assert.equal(rep.move,live.move,'the replay swings '+rep.move+', live it was '+live.move);
    assert.equal(rep.finish,live.finish,'the replay finishes '+rep.finish+', live '+live.finish);
  }
  // and every outcome keeps its choices (parry style, the finish)
  for(const o of ['parried','wound','miss','evaded']){
    const L=make();C.intent(L.a,100,'attack',.5);const live=C.blow(L,'a',1000,{outcome:o,loc:'chest',lost:o==='wound'?4:0,key:'k'+o});
    const R=make();const rep=C.blow(R,'a',100,{outcome:o,loc:'chest',lost:o==='wound'?4:0,flow:true,key:'k'+o,move:live.move,ward:live.ward});
    assert.deepEqual([rep.move,rep.style||null],[live.move,live.style||null],o+': the replay differs');
  }
});
test('CA-09: the stage keeps the seed and each blow\'s move on the tape, and the replay draws them again',async()=>{
  const S=stage(false);
  S.run(`psMotionFigs();PS.cueFor=17;PS.ex={atk:'a',aGrade:2,react:'parry',reactGrade:1,reactTool:'weapon'};`);
  await S.run(`psIntent('a','attack');psIntent('b','parry');PS.clock+=800;psMotionBlow({type:'hit',actor:'a',target:'b',loc:'head',lost:3,px:{}})`);
  const live=S.ev().find(e=>e[0]==='move')[1];const tape=JSON.parse(S.run('JSON.stringify(PS.cineTape)'));
  assert(tape.seed!=null&&tape.by[17]&&tape.by[17].move===live.move,'the tape: '+JSON.stringify(tape));
  // the replay: new figures (a new seed), the tape given back
  const R=stage(true);
  R.run(`PS.cineTape=${JSON.stringify(tape)};PS.M={};PS.fig.a.look.wk=PS.fig.b.look.wk={kind:'blade',len:92};PS.springOn=true;PS.cine=true;psMotionFigs();PS.cueFor=17;PS.ex={atk:'a',aGrade:2,react:'parry',reactGrade:1,reactTool:'weapon'};`);
  assert.equal(R.run('PS.M.a.pair.seed'),tape.seed,'the replay\'s figures have a new seed');
  await R.run(`psMotionBlow({type:'hit',actor:'a',target:'b',loc:'head',lost:3,px:{}})`);
  const rep=R.ev().find(e=>e[0]==='move')[1];
  assert.deepEqual([rep.move,rep.ward],[live.move,live.ward]);
});

// ----- CA-12 -----
test('CA-12: a pinned weapon (or shield) is held down while the pin lasts',()=>{
  const S=stage(false);
  const look=JSON.parse(S.run(`ARENA_WEAPONS={sword:{reach:'M'}};CombatRules={woundLevel:()=> 'none'};JSON.stringify(pitsStageLook({weapon:'sword',hp:{},maxHp:{},pinnedGear:'weapon',pinnedBy:'b'}))`));
  assert.equal(look.pinned,'weapon');
  assert.equal(JSON.parse(S.run(`JSON.stringify(pitsStageLook({weapon:'sword',hp:{},maxHp:{}}))`)).pinned,null);
  const opt=JSON.parse(S.run(`JSON.stringify(psPoseOpt({},{swap:false,limp:{rarm:false,larm:false},armed:true,pinned:'weapon'}))`));
  assert(opt.pinW,'the rig is not told');
  const M={a:C.fighter('a',sword,false,{shield:true})};C.place(M.a,0,200,'guard');
  const free=C.pose(M.a,100,{}),pinned=C.pose(M.a,100,{pinW:true}),pinS=C.pose(M.a,100,{pinS:true});
  assert(pinned.tip[1]<15,'the pinned weapon\'s point is not down ('+pinned.tip[1].toFixed(0)+')');
  assert(pinned.Hn[1]<free.Hn[1]-15,'the pinned weapon hand is not held down');
  assert(pinS.oHn[1]<free.oHn[1]-10,'the pinned shield is not held down');
});

// ----- the reporting gap -----
test('reports carry the stage, both cinematic asset stamps and the seed',()=>{
  const R=require('../experiments/pits-report.js');
  const b=R.buildOf(['pits-stage.js?v=abc123','pits-cine.js?v=1111aaaa','pits-cine-fx.js?v=2222bbbb']);
  assert(/cine=1111aaaa/.test(b)&&/cine-fx=2222bbbb/.test(b),'build: '+b);
  const src=fs.readFileSync(path.join(root,'experiments/pits-arena.js'),'utf8');
  const fn=src.slice(src.indexOf('function pitsFightRecord'),src.indexOf('\n}\n',src.indexOf('function pitsFightRecord'))+2);
  const ctx={PS:{cine:true,springOn:true},psCineTape:()=>({seed:42,by:{7:{move:'over'}}}),V:{tape:[]},S:{fighters:{a:{},b:{}},logs:[],mode:'pvp'},PA:{},config:{},
    location:{search:''},navigator:{userAgent:'t'},document:{body:{dataset:{}}},window:{}};
  vm.createContext(ctx);vm.runInContext(fn+';var __r=JSON.parse(pitsFightRecord());',ctx);
  assert.equal(ctx.__r.stageName,'cine');assert.deepEqual(JSON.parse(JSON.stringify(ctx.__r.cine)),{seed:42,choices:{7:{move:'over'}}});
});

// ----- CL-01 to CL-04: reproduced, then fixed -----
test('CL-01: after a hand switch (or a new weapon), the rig knows: arm targets are the drawn arms',()=>{
  const S=stage(false);
  S.run(`PS.fig.a.look={...PS.fig.a.look,swap:true,wk:{kind:'axe',len:84}};psMotionFigs();`);
  assert(S.run('PS.M.a.swap===true'),'the rig keeps the old weapon hand');
  assert(S.run(`PS.M.a.weapon.len===84&&PS.M.a.prof.heavy===true`),'the rig keeps the old weapon');
  // the right arm (now the empty arm) is aimed at the drawn empty arm
  const m=S.run(`JSON.stringify([PitsCine.partAt(PS.M.a,200,'rarm'),PitsCine.joints(PS.M.a,200).oE])`);const [p,oE]=JSON.parse(m);
  assert(dist(p,oE)<.01);
});
test('CL-02: in the replay, a declared parry that failed is still seen tried before the blow lands',()=>{
  const M={a:C.fighter('a',sword,false,{}),b:C.fighter('b',sword,false,{})};const g=C.gap(sword,sword,'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
  const plain=C.joints(M.b,100);
  const r=C.blow(M,'a',100,{outcome:'wound',loc:'chest',lost:3,flow:true,ward:'wardHigh'});
  const j=C.joints(M.b,r.tc-100);
  assert(dist(j.Hn,plain.Hn)>15&&j.Hn[1]>plain.Hn[1],'the failed parry is not drawn in the replay');
});
test('CL-03: afterimages carry only what the figure holds, and none with reduced motion',()=>{
  const els=[];
  const mkEl=tag=>{const e={tag,attrs:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attrs[k]=String(v);},
    appendChild(c){this.children.push(c);return c;},insertBefore(c){this.children.unshift(c);return c;},remove(){},querySelector:()=>mkEl('g'),get firstChild(){return this.children[0]||null;},
    get nextSibling(){return null;},innerHTML:''};els.push(e);return e;};
  const S=stage(false);
  S.ctx.document.createElementNS=(ns,tag)=>mkEl(tag);S.ctx.document.createElement=t=>mkEl(t);
  vm.runInContext(fs.readFileSync(path.join(root,'experiments/pits-cine-fx.js'),'utf8'),S.ctx,{filename:'pits-cine-fx.js'});
  const sec=mkEl('section');sec.querySelector=()=>mkEl('div');const svg=mkEl('svg');svg.querySelector=()=>mkEl('g');
  S.ctx.__sec=sec;S.ctx.__svg=svg;
  S.run(`PitsCineFx.mount(__sec,__svg,PS,450);`);
  const ghosts=()=>els.filter(e=>/pc-ghost /.test(e.attrs.class||''));
  // a fast dash: the attacker leaps in
  S.run(`PS.fig.a.look.armed=false;var __r=PitsCine.blow(PS.M,'a',200,{outcome:'wound',loc:'chest',lost:9});`);
  const fast=S.run(`(()=>{let best=0,bt=0;for(let t=200;t<__r.tc;t+=4){const s=PitsCine.speed(PS.M.a,t).body;if(s>best){best=s;bt=t;}}return bt;})()`);
  S.run(`PS.clock=${fast};PitsCineFx.frame(0,16,false);`);
  const ga=ghosts().filter(e=>/pc-a/.test(e.attrs.class)).filter(e=>e.attrs.opacity&&+e.attrs.opacity>0);
  assert(ga.length,'(the dash shows no afterimage at all)');
  for(const g of ga){const blade=g.children.find(c=>/pc-g-blade/.test(c.attrs.class||''));assert.equal(blade.attrs.opacity,'0','a disarmed fighter\'s afterimage carries a blade');}
  // reduced motion: nothing
  S.run(`V.reduced=true;PS.clock=${fast}+1;PitsCineFx.frame(0,16,false);`);
  assert(!ghosts().some(e=>+e.attrs.opacity>0),'afterimages are drawn with reduced motion');
});
test('CL-04: an Accidental Injury is drawn on the fighter who hurt itself',async()=>{
  const S=stage(false);
  const c=cueOf(S,'Accidental Injury','Brann accidentally hits Left Leg: 4 self-inflicted damage, armour ignored. 5 → 1 HP.',{actor:'b',target:'b',location:'Left Leg',impact:{target:'b',location:'Left Leg',hpLost:4}});
  assert.deepEqual([c&&c.type,c&&c.actor,c&&c.loc,c&&c.lost],['selfhit','b','lleg',4]);
  const before=JSON.parse(S.run(`JSON.stringify(PitsCine.joints(PS.M.b,PS.clock).Hd)`));
  await S.run(`psMotionCue(${JSON.stringify(c)})`);
  const hit=S.ev().find(e=>e[0]==='contact');assert(hit&&hit[1].target==='b'&&hit[1].kind==='self');
  assert(S.run(`PS.M.b.hurt===true`));
  assert(S.run(`PS.M.a.keys.length`)<=3,'the other fighter moved');
});

(async()=>{
  let failed=0;
  for(const [n,f] of tests){try{await f();passed++;console.log('PASS '+n);}catch(e){failed++;console.log('FAIL '+n+'\n  '+e.message+(process.env.STACK?e.stack:''));}}
  console.log(passed+' passed'+(failed?', '+failed+' failed':''));if(failed)process.exit(1);
})();
