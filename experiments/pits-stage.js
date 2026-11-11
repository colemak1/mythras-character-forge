// The Pits stage: the animated stick-figure arena (from the "the-pits-mythras"
// prototype, adapted to the Forge's own combat engine, owner request 2026-11-11).
// PRESENTATION ONLY. It reads the engine's log entries and fighter state (the
// same ones the combat log shows) and draws them. It never rolls, spends AP,
// changes HP or decides anything: every rule, die and choice comes from the
// engine in practice-combat.html.

// ---- Cues: which animation a log entry means (pure; tested in tests/pits-stage.cjs) ----
const PSTAGE_LOCS={Head:'head',Chest:'chest',Abdomen:'abdomen','Right Arm':'rarm','Left Arm':'larm','Right Leg':'rleg','Left Leg':'lleg'};
const PSTAGE_LOCNAME={head:'head',chest:'chest',abdomen:'abdomen',rarm:'right arm',larm:'left arm',rleg:'right leg',lleg:'left leg'};
const PSTAGE_LOCRE='(Head|Chest|Abdomen|Right Arm|Left Arm|Right Leg|Left Leg)';
// names: {a:'Kethan', b:'Marek'}. Returns null when an entry needs no animation.
function pitsStageCue(entry,names){
  if(!entry)return null;
  const t=String(entry.title||''),b=String(entry.body||''),m=entry.meta||{};
  const other=id=>id==='a'?'b':'a';
  const idOf=text=>['a','b'].find(id=>names[id]&&String(text).startsWith(names[id]))||null;
  const actor=m.actor||idOf(t)||idOf(b);
  const grade=((/[—-]\s*(CRITICAL|SUCCESS|FAILURE|FUMBLE)\b/.exec(b)||/\(\s*(CRITICAL|SUCCESS|FAILURE|FUMBLE)\b/.exec(b)||[])[1]||'').toLowerCase();
  const good=grade==='success'||grade==='critical';
  let r;
  if(/(?: attacks| makes a Remise attack| strikes with the shield)$/.test(t))return {type:'attack',actor,grade,good,shield:/shield$/.test(t)};
  if(/ parries( with shield)?$/.test(t))return {type:'parry',actor,grade,good,shield:/shield$/.test(t)};
  if(/ evades$/.test(t))return {type:'evade',actor,grade,good};
  if((r=new RegExp(' hits '+PSTAGE_LOCRE+'$').exec(t))&&m.impact)
    return {type:'hit',actor:m.actor||actor,target:m.impact.target,loc:PSTAGE_LOCS[m.impact.location]||PSTAGE_LOCS[r[1]],lost:m.impact.hpLost||0};
  if(t==='No Damaging Hit')return {type:'deflect',evaded:/evades/.test(b)};
  if((t==='Hit Location'||t==='Choose Location')&&m.location)
    return {type:'locate',target:m.target||other(actor),loc:PSTAGE_LOCS[m.location],chosen:t==='Choose Location'};
  if(t==='Choose Location'&&(r=new RegExp("targets .*?'s "+PSTAGE_LOCRE+'\\.').exec(b)))
    return {type:'locate',target:other(actor),loc:PSTAGE_LOCS[r[1]],chosen:true};
  if(t==='Trip Opponent'&&/falls prone|remains standing/.test(b))return {type:'trip',actor,target:other(actor),fell:/falls prone/.test(b)};
  if(t==='Disarm Opponent'&&/lands \d+m away|drops the weapon/.test(b))
    return {type:'disarm',actor:m.actor||actor,target:m.target||other(actor),metres:+((/lands (\d+)m/.exec(b)||[])[1]||0)};
  if(t==='Regain Footing'&&/Stands up|stands unopposed/.test(b))return {type:'stand',actor:actor};
  if((r=new RegExp('^(SERIOUS|MAJOR) WOUND · '+PSTAGE_LOCRE+'$').exec(t)))return {type:'wound',level:r[1].toLowerCase(),loc:PSTAGE_LOCS[r[2]]};
  if(t==='Limb Disabled')return {type:'limb',leg:/Leg/.test(b)};
  if(t==='FIGHT ENDS')return {type:'end',winner:idOf(b)};
  return null;
}
// How long the replay should stay on a beat so its animation can finish (ms).
const PSTAGE_HOLD={attack:650,parry:700,evade:700,hit:1250,deflect:1000,locate:800,trip:1250,disarm:1500,stand:800,wound:1000,limb:1000,end:1700};
function pitsStageHold(entry,names,fallback){
  const c=pitsStageCue(entry,names);return c&&PSTAGE_HOLD[c.type]?Math.max(fallback,PSTAGE_HOLD[c.type]):fallback;
}
// Weapon drawing kinds, from the engine's weapon table (pure).
function pitsStageWeaponKind(key,reach){
  const k=String(key||'');
  if(/dagger|knife/i.test(k))return {kind:'blade',len:54};
  if(/great/i.test(k))return {kind:'blade',len:128};
  if(/mace|club|hammer|flail|maul/i.test(k))return {kind:'club',len:74};
  if(/axe/i.test(k))return {kind:'axe',len:84};
  if(/spear|pike|halberd|lance|javelin/i.test(k)||reach>=3)return {kind:'spear',len:150};
  return {kind:'blade',len:92};
}
// Plain description of what to draw for one fighter (pure). f is an engine
// fighter (or a clone of one from the replay).
function pitsStageLook(f){
  const w=(typeof ARENA_WEAPONS!=='undefined'&&ARENA_WEAPONS[f.weapon])||{};
  const hand=f.weaponHand||'Right Arm';
  const level=loc=>CombatRules.woundLevel(f.hp[loc],f.maxHp[loc]);
  const parts={};
  for(const [name,key] of Object.entries(PSTAGE_LOCS))parts[key]=level(name);
  const wk=pitsStageWeaponKind(f.weapon,w.reach);
  return {weapon:wk.kind==='spear'?'spear':wk.kind==='blade'&&wk.len>=92?'sword':wk.kind,wk,
    armed:!f.disarmed&&!(f.hp[hand]<=0),prone:!!f.prone,parts,shield:!!f.shield&&f.shield!=='none',
    limp:{rarm:f.hp['Right Arm']<=0,larm:f.hp['Left Arm']<=0},scale:Math.max(.92,Math.min(1.1,.95+((+f.siz||13)-13)*.012))};
}

// ---- Everything below needs a browser ----
const PSTAGE_DUEL=(()=>{try{return /[?&]stage=duel\b/.test(location.search);}catch(e){return false;}})();
const PS={fig:{},lastId:0,epoch:0,raf:0,ready:false,seeded:false,ex:null};
const PS_GROUND=450,PS_SPACING={apart:440,even:290,short:210,long:380},PS_M=22;
const PS_IDLE={t:5,hd:0,a1:58,a2:46,w:128,ba1:-18,ba2:-34,l1:30,l2:-34,bl1:-28,bl2:16,dx:0,lift:0};
const PS_KEYS=Object.keys(PS_IDLE);
const psP=o=>({...PS_IDLE,...o});
const PS_POSE={
  idle:psP({}),
  windup:psP({t:-8,a1:18,a2:122,w:190,ba1:-40,ba2:-20,l1:16,l2:-20,bl1:-36,bl2:10,dx:-16}),
  strike:psP({t:20,hd:4,a1:86,a2:4,w:90,ba1:-72,ba2:-10,l1:52,l2:-52,bl1:-46,bl2:-8}),
  whiff:psP({t:26,a1:92,a2:0,w:92,ba1:-70,ba2:-10,l1:56,l2:-48,bl1:-48,bl2:-6}),
  guard:psP({t:0,a1:46,a2:80,w:176,ba1:-30,ba2:-40,l1:26,l2:-28,bl1:-22,bl2:10}),
  parry:psP({t:6,a1:76,a2:44,w:160,ba1:-28,ba2:-30,l1:34,l2:-36,bl1:-30,bl2:12,dx:8}),
  evade:psP({t:-24,hd:-10,a1:30,a2:40,w:112,l1:8,l2:-12,bl1:-40,bl2:20,dx:-80,lift:30}),
  hit:psP({t:-28,hd:-18,a1:20,a2:50,w:72,ba1:-60,ba2:-10,l1:14,l2:-8,bl1:-30,bl2:8,dx:-38}),
  crouch:psP({t:-14,a1:30,a2:70,w:150,l1:60,l2:-98,bl1:-70,bl2:60,dx:-10}),
  prone:psP({t:-90,hd:-12,a1:-104,a2:-8,w:-80,ba1:-120,ba2:-8,l1:86,l2:0,bl1:80,bl2:6,dx:-30}),
  trip:psP({t:-38,hd:-14,a1:168,a2:-12,w:200,ba1:120,ba2:30,l1:-64,l2:30,bl1:56,bl2:-40,dx:-34,lift:34}),
  flinch:psP({t:-14,hd:-10,a1:100,a2:-60,w:40,ba1:-60,ba2:-10,dx:-22}),
  ko:psP({t:-92,hd:-20,a1:-70,a2:-30,w:-40,ba1:-110,ba2:-20,l1:78,l2:10,bl1:70,bl2:16,dx:-50}),
  win:psP({t:-6,a1:160,a2:14,w:176,ba1:-24,ba2:-30})
};
const psRad=a=>a*Math.PI/180,psDir=(a,l)=>[Math.sin(psRad(a))*l,Math.cos(psRad(a))*l];
const psAdd=(p,q)=>[p[0]+q[0],p[1]+q[1]];
const psPts=a=>a.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
const psEase=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
const psEaseOut=p=>1-Math.pow(1-p,3);
const psSvg=(tag,attrs,parent)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;};
const psReduced=()=>typeof V!=='undefined'&&V.reduced;
const psSpeed=()=>typeof V!=='undefined'&&V.quick?2.2:1;
const psSleep=ms=>{const e=PS.epoch;return new Promise((res,rej)=>setTimeout(()=>e===PS.epoch?res():rej(0),ms/psSpeed()));};
const psSfx=k=>{try{if(typeof pitsSfx==='function')pitsSfx(k);}catch(e){}};
const psLayer=c=>document.querySelector('#pitsStage .'+c);

function psBuildFig(id,svg){
  const parent=svg.querySelector('.ps-figs');
  const g=psSvg('g',{class:'ps-fig ps-'+(id==='a'?'left':'right')},parent);
  const shadow=psSvg('ellipse',{class:'ps-shadow',cy:PS_GROUND+3,ry:7},parent);
  const body=psSvg('g',{class:'ps-body'},psSvg('g',{},g));
  const back=psSvg('g',{class:'ps-back'},body);
  const e={
    lleg:psSvg('polyline',{'stroke-width':9},back),larm:psSvg('polyline',{'stroke-width':8},back),
    shield:psSvg('circle',{r:19,class:'ps-shield'},back),
    abdomen:psSvg('line',{'stroke-width':12},body),chest:psSvg('line',{'stroke-width':12},body),
    rleg:psSvg('polyline',{'stroke-width':10},body),head:psSvg('circle',{r:13,'stroke-width':5,class:'ps-head'},body),
    rarm:psSvg('polyline',{'stroke-width':8},body),
    shaft:psSvg('line',{'stroke-width':4,class:'ps-shaft'},body),
    guard:psSvg('line',{'stroke-width':4,class:'ps-guard'},body),
    knob:psSvg('circle',{r:9,class:'ps-knob'},body),
    wh:psSvg('polygon',{class:'ps-head-blade'},body)};
  const f={id,g,shadow,e,cur:{...PS_IDLE},anim:null,done:null,hx:600,tx:600,face:id==='a'?1:-1,scale:1,
    look:null,pts:null,flash:null,flashUntil:0,dropEl:null,dropping:false,end:null,classes:{},trailOn:false,trailPts:[]};
  f.trail=psSvg('polyline',{class:'ps-trail',opacity:0},svg.querySelector('.ps-fx'));
  return f;
}
function psDraw(f,now){
  const L=f.look;if(!L)return;
  const c=f.cur,down=L.prone||f.end==='ko';
  const br=!down&&!f.anim?Math.sin(now/480+(f.id==='b'?1.7:0)):0;
  const t=c.t+br*1.6;let a1=c.a1+br*2,a2=c.a2,ba1=c.ba1,ba2=c.ba2;const w1=c.w+br*2;
  if(L.limp.rarm){a1=6+Math.sin(now/650)*3;a2=5;}
  if(L.limp.larm){ba1=-6+Math.sin(now/700)*3;ba2=-4;}
  const WL=L.wk.len;
  const H=[0,0],Sh=[Math.sin(psRad(t))*58,-Math.cos(psRad(t))*58],M=[Sh[0]*.5,Sh[1]*.5];
  const hd=psAdd(Sh,[Math.sin(psRad(t+c.hd))*23,-Math.cos(psRad(t+c.hd))*23]);
  const E=psAdd(Sh,psDir(a1,32)),Hn=psAdd(E,psDir(a1+a2,30));
  const bE=psAdd(Sh,psDir(ba1,32)),bHn=psAdd(bE,psDir(ba1+ba2,30));
  const K=psDir(c.l1,46),F=psAdd(K,psDir(c.l1+c.l2,46)),bK=psDir(c.bl1,46),bF=psAdd(bK,psDir(c.bl1+c.bl2,46));
  const low=Math.max(F[1],bF[1],hd[1]+13,Hn[1],bHn[1],K[1],bK[1],Sh[1]);
  const off=-low-4-c.lift,q=p=>[p[0],p[1]+off];
  const ln=(e,a,b)=>{e.setAttribute('x1',a[0]);e.setAttribute('y1',a[1]);e.setAttribute('x2',b[0]);e.setAttribute('y2',b[1]);};
  const e=f.e;
  ln(e.chest,q(Sh),q(M));ln(e.abdomen,q(M),q(H));
  e.head.setAttribute('cx',hd[0]);e.head.setAttribute('cy',q(hd)[1]);
  e.rleg.setAttribute('points',psPts([q(H),q(K),q(F)]));e.lleg.setAttribute('points',psPts([q(H),q(bK),q(bF)]));
  e.rarm.setAttribute('points',psPts([q(Sh),q(E),q(Hn)]));e.larm.setAttribute('points',psPts([q(Sh),q(bE),q(bHn)]));
  for(const key of Object.keys(L.parts)){
    const cls='ps-part ps-w-'+L.parts[key]+(f.flash===key&&now<f.flashUntil?' ps-flash':'');
    if(f.classes[key]!==cls){f.classes[key]=cls;e[key].setAttribute('class',cls);}
  }
  e.shield.style.display=L.shield&&!L.limp.larm?'':'none';
  if(L.shield){const s=q(bHn);e.shield.setAttribute('cx',s[0]);e.shield.setAttribute('cy',s[1]);}
  const hand=q(Hn);let tip=hand;
  const show=L.armed&&!f.dropping;
  for(const k of ['shaft','guard','knob','wh'])e[k].style.display='none';
  if(show){
    e.shaft.style.display='';
    tip=psAdd(hand,psDir(w1,WL));const perp=psDir(w1+90,1);const kind=L.wk.kind;
    if(kind==='blade'){
      ln(e.shaft,hand,tip);e.shaft.setAttribute('class','ps-shaft');
      const g1=psAdd(hand,psDir(w1,10));
      ln(e.guard,[g1[0]-perp[0]*9,g1[1]-perp[1]*9],[g1[0]+perp[0]*9,g1[1]+perp[1]*9]);e.guard.style.display='';
    }else if(kind==='spear'){
      const bk=psAdd(hand,psDir(w1,-36));ln(e.shaft,bk,tip);e.shaft.setAttribute('class','ps-shaft ps-wood');
      e.wh.setAttribute('points',psPts([psAdd(tip,psDir(w1,24)),[tip[0]+perp[0]*6,tip[1]+perp[1]*6],[tip[0]-perp[0]*6,tip[1]-perp[1]*6]]));e.wh.style.display='';
    }else{
      ln(e.shaft,hand,tip);e.shaft.setAttribute('class','ps-shaft ps-wood');
      if(kind==='club'){e.knob.setAttribute('cx',tip[0]);e.knob.setAttribute('cy',tip[1]);e.knob.style.display='';}
      else{const a=psAdd(tip,psDir(w1,-6));e.wh.setAttribute('points',psPts([a,[a[0]+perp[0]*18,a[1]+perp[1]*18],psAdd(a,psDir(w1,-22))]));e.wh.style.display='';}
    }
  }
  f.pts={H:q(H),Sh:q(Sh),M:q(M),hd:q(hd),K:q(K),bK:q(bK),E:q(E),bE:q(bE),tip,hand};
  const X=f.hx+f.face*c.dx*f.scale;f.X=X;
  f.g.setAttribute('transform','translate('+X+','+PS_GROUND+') scale('+(f.face*f.scale)+','+f.scale+')');
  f.shadow.setAttribute('cx',X);f.shadow.setAttribute('rx',(50-Math.min(c.lift,40)*.5)*f.scale);
  f.shadow.setAttribute('opacity',Math.max(.12,.4-c.lift/110));
  if(f.trailOn){f.trailPts.push([X+f.face*f.scale*tip[0],PS_GROUND+f.scale*tip[1]]);if(f.trailPts.length>9)f.trailPts.shift();}
  else if(f.trailPts.length)f.trailPts.shift();
  if(f.trailPts.length>2){f.trail.setAttribute('points',psPts(f.trailPts));f.trail.setAttribute('opacity',.7*f.trailPts.length/9);}
  else f.trail.setAttribute('opacity',0);
}
// The pose a fighter settles into when nothing is playing.
function psRest(f){
  if(f.end==='ko')return PS_POSE.ko;
  if(f.end==='win')return PS_POSE.win;
  return f.look&&f.look.prone?PS_POSE.prone:PS_POSE.idle;
}
function psFrame(now){
  if(!PS.ready)return;
  for(const id of ['a','b']){
    const f=PS.fig[id];if(!f)continue;
    if(f.slide){const s=f.slide,p=Math.min(1,(now-s.t0)/s.d);f.hx=s.a+(s.b-s.a)*psEase(p);if(p>=1)f.slide=null;}
    if(f.anim){
      const a=f.anim,s=a.steps[a.i];const p=s.d>0?(now-a.t0)/s.d:1;
      if(p>=1){f.cur={...s.to};a.i++;
        if(a.i>=a.steps.length){f.anim=null;f.trailOn=false;const r=f.done;f.done=null;if(r)r();}
        else{a.from={...f.cur};a.t0=now;f.trailOn=!!a.steps[a.i].trail;}
      }else{const k=s.ease(Math.max(0,p));for(const key of PS_KEYS)f.cur[key]=a.from[key]+(s.to[key]-a.from[key])*k;}
    }else{
      const tg=psRest(f),k=psReduced()?1:.16;
      for(const key of PS_KEYS)f.cur[key]+=(tg[key]-f.cur[key])*k;
    }
    psDraw(f,now);
  }
  PS.raf=requestAnimationFrame(psFrame);
}
// frames: [pose, ms, {dx, trail, out}]. Resolves when the sequence ends (or is replaced).
function psPlay(f,frames){
  return new Promise(res=>{
    if(f.done){const r=f.done;f.done=null;r();}
    const sp=psSpeed(),rd=psReduced();
    const steps=frames.map(([name,d,o])=>{o=o||{};return {to:{...PS_POSE[name],...(o.dx!=null?{dx:o.dx}:{})},d:rd?0:d/sp,trail:!!o.trail,ease:o.out?psEaseOut:psEase};});
    f.anim={steps,i:0,t0:performance.now(),from:{...f.cur}};f.trailOn=steps[0].trail;f.done=res;
  });
}

// ---- Effects ----
const psWorld=(f,p)=>[f.X+f.face*f.scale*p[0],PS_GROUND+f.scale*p[1]];
function psBodyPt(f,loc){
  const p=f.pts;if(!p)return [f.X||600,PS_GROUND-90];
  const mid=(x,y)=>[(x[0]+y[0])/2,(x[1]+y[1])/2];
  const q={head:p.hd,chest:mid(p.Sh,p.M),abdomen:mid(p.M,p.H),rarm:p.E,larm:p.bE,rleg:p.K,lleg:p.bK}[loc]||p.M;
  return psWorld(f,q);
}
function psDom(w,text,cls){
  const box=document.querySelector('#pitsStage .ps-stage');if(!box)return;
  const svg=box.querySelector('svg'),pt=svg.createSVGPoint();pt.x=w[0];pt.y=w[1];
  const s=pt.matrixTransform(svg.getScreenCTM()),r=box.getBoundingClientRect();
  const d=document.createElement('div');d.className='ps-num '+(cls||'');d.textContent=text;
  d.style.left=(s.x-r.left)+'px';d.style.top=(s.y-r.top)+'px';psLayer('ps-nums').appendChild(d);setTimeout(()=>d.remove(),1400);
}
function psBurst(w,kind,n){
  if(psReduced())return;
  const fx=psLayer('ps-fx');n=n||(kind==='blood'?10:8);
  for(let i=0;i<n;i++){
    const c=psSvg('circle',{cx:w[0],cy:w[1],r:2+Math.random()*3,class:'ps-'+kind},fx);
    const vx=(Math.random()-.5)*120,vy=-30-Math.random()*70;
    c.animate([{transform:'translate(0,0)',opacity:1},{transform:'translate('+vx*.55+'px,'+vy+'px)',opacity:1,offset:.38},
      {transform:'translate('+vx+'px,'+(vy+(kind==='blood'?130:60))+'px)',opacity:0}],
      {duration:(600+Math.random()*350)/psSpeed(),easing:'ease-in'}).onfinish=()=>c.remove();
  }
}
function psRing(w){
  if(psReduced())return;
  const c=psSvg('circle',{cx:w[0],cy:w[1],r:6,class:'ps-ring'},psLayer('ps-fx'));
  c.animate([{r:6,opacity:1},{r:46,opacity:0}],{duration:420/psSpeed(),easing:'ease-out'}).onfinish=()=>c.remove();
}
function psReticle(w){
  const g=psSvg('g',{class:'ps-reticle'},psLayer('ps-fx'));
  psSvg('circle',{cx:w[0],cy:w[1],r:20},g);
  [[-30,0,-12,0],[12,0,30,0],[0,-30,0,-12],[0,12,0,30]].forEach(l=>psSvg('line',{x1:w[0]+l[0],y1:w[1]+l[1],x2:w[0]+l[2],y2:w[1]+l[3]},g));
  g.animate([{opacity:0},{opacity:1,offset:.25},{opacity:1},{opacity:0}],{duration:psReduced()?500:900/psSpeed()}).onfinish=()=>g.remove();
}
function psDust(f){
  if(psReduced())return;
  for(let i=0;i<5;i++){const c=psSvg('circle',{cx:f.X+(Math.random()-.5)*50,cy:PS_GROUND-4,r:5+Math.random()*4,class:'ps-dust'},psLayer('ps-fx'));
    c.animate([{transform:'translate(0,0) scale(.6)',opacity:.5},{transform:'translate('+((Math.random()-.5)*60)+'px,-26px) scale(1.8)',opacity:0}],
      {duration:650/psSpeed(),easing:'ease-out'}).onfinish=()=>c.remove();}
}
function psGhost(f){
  if(psReduced())return;
  const wrap=psSvg('g',{},psLayer('ps-ghost')),g=f.g.cloneNode(true);wrap.appendChild(g);
  g.setAttribute('transform',f.g.getAttribute('transform'));wrap.style.opacity=.5;
  wrap.animate([{opacity:.5},{opacity:0}],{duration:500/psSpeed()}).onfinish=()=>wrap.remove();
}
function psShake(){
  if(psReduced())return;const b=psLayer('ps-stage');if(!b)return;
  b.classList.remove('ps-shake');void b.offsetWidth;b.classList.add('ps-shake');
}
function psBanner(text,cls){
  const b=psLayer('ps-banner');if(!b)return;
  b.textContent=text;b.className='ps-banner';void b.offsetWidth;b.className='ps-banner ps-go '+(cls||'');
}
// Weapon knocked away or dropped: fly it in an arc, then leave it on the floor
// until the engine says it was picked up again.
function psFlyWeapon(f,metres){
  const from=f.pts?psWorld(f,f.pts.hand):[f.X,PS_GROUND-80];
  const to=[f.X-f.face*Math.max(60,metres*PS_M+50),PS_GROUND+2];
  const wk=f.look.wk,len=wk.len;
  const g=psSvg('g',{class:'ps-dropped'},psLayer('ps-fx')),inner=psSvg('g',{transform:'translate('+(-len/2)+',0)'},g);
  if(wk.kind==='spear'){psSvg('line',{x1:-36,y1:0,x2:len,y2:0,class:'ps-shaft ps-wood','stroke-width':4},inner);
    psSvg('polygon',{points:(len+24)+',0 '+len+',6 '+len+',-6',class:'ps-head-blade'},inner);}
  else if(wk.kind==='blade'){psSvg('line',{x1:0,y1:0,x2:len,y2:0,class:'ps-shaft','stroke-width':4},inner);
    psSvg('line',{x1:10,y1:-9,x2:10,y2:9,class:'ps-guard','stroke-width':4},inner);}
  else psSvg('line',{x1:0,y1:0,x2:len,y2:0,class:'ps-shaft ps-wood','stroke-width':5},inner);
  if(f.dropEl)f.dropEl.remove();
  f.dropEl=g;f.dropping=true;
  const t0=performance.now(),d=psReduced()?1:780/psSpeed(),spin=(Math.random()<.5?-1:1)*540;
  const step=now=>{
    const p=Math.min(1,(now-t0)/d),x=from[0]+(to[0]-from[0])*p,y=from[1]+(to[1]-from[1])*p-Math.sin(p*Math.PI)*190;
    g.setAttribute('transform','translate('+x+','+y+') rotate('+(spin*p%360)+')');
    if(p<1)requestAnimationFrame(step);else{g.setAttribute('transform','translate('+to[0]+','+to[1]+') rotate(-4)');f.dropping=false;}
  };
  requestAnimationFrame(step);
}
const psLunge=(me,foe)=>{
  const gap=Math.abs((foe?foe.hx:me.hx)-me.hx),len=me.look?me.look.wk.len:92;
  return Math.max(26,Math.min(180,gap-(82+len)+12));
};

// ---- One cue -> one scripted beat ----
async function psRunCue(cue){
  const me=PS.fig[cue.actor]||null,tgt=PS.fig[cue.target]||null;
  try{
    if(cue.type==='attack'&&me){
      PS.ex={atk:me.id,grade:cue.grade,def:null,defGood:false};
      psPlay(me,[['windup',230]]);
      if(cue.grade==='critical')psBanner('Critical hit','crit');
      else if(cue.grade==='fumble')psBanner('Fumble','bad');
      await psSleep(300);
    }else if(cue.type==='parry'&&me){
      if(PS.ex){PS.ex.def='parry';PS.ex.defGood=cue.good;}
      psPlay(me,cue.good?[['parry',170],['parry',300]]:[['guard',170],['guard',300]]);await psSleep(300);
    }else if(cue.type==='evade'&&me){
      if(PS.ex){PS.ex.def='evade';PS.ex.defGood=cue.good;}
      if(cue.good){psGhost(me);psPlay(me,[['evade',170,{out:true}],['evade',260]]);psDust(me);psSfx('miss');}
      else psPlay(me,[['flinch',150],['flinch',280]]);
      await psSleep(300);
    }else if(cue.type==='locate'&&tgt){
      psReticle(psBodyPt(tgt,cue.loc));
      if(cue.chosen)psDom(psWorld(tgt,tgt.pts?tgt.pts.hd:[0,-120]),'Chosen: '+(PSTAGE_LOCNAME[cue.loc]||''),'fx');
      await psSleep(380);
    }else if(cue.type==='hit'&&tgt){
      const atk=PS.fig[cue.actor]||(PS.ex&&PS.fig[PS.ex.atk])||null;
      if(atk){psPlay(atk,[['strike',120,{dx:psLunge(atk,tgt),trail:true,out:true}],['strike',380],['idle',260]]);psSfx('miss');await psSleep(130);}
      tgt.flash=cue.loc;tgt.flashUntil=performance.now()+900;
      const w2=psBodyPt(tgt,cue.loc);
      psBurst(w2,cue.lost>0?'spark':'gray',cue.lost>0?14:8);psRing(w2);psShake();
      if(cue.lost>0){psBurst(w2,'blood',10+cue.lost*2);psDom(w2,'−'+cue.lost,'dmg');psSfx(cue.lost>=6?'crit':'hit');}
      else{psDom(w2,'Armoured','blk');psSfx('pick');}
      psPlay(tgt,[['hit',100,{out:true}],['hit',170],['idle',260]]);
      await psSleep(520);
    }else if(cue.type==='deflect'){
      const ex=PS.ex,atk=ex&&PS.fig[ex.atk],def=atk&&PS.fig[atk.id==='a'?'b':'a'];
      if(atk&&def){
        const lg=psLunge(atk,def);
        if(cue.evaded||(ex.def==='evade'&&ex.defGood)){
          psGhost(def);psPlay(atk,[['strike',120,{dx:lg+28,trail:true,out:true}],['whiff',140],['idle',260]]);
          psPlay(def,[['evade',170,{out:true}],['evade',230],['idle',260]]);psSfx('miss');psDust(def);psDom(psWorld(def,def.pts.Sh),'Evaded','blk');
        }else if(ex.def==='parry'&&ex.defGood){
          psPlay(atk,[['strike',120,{dx:lg-24,trail:true,out:true}],['hit',170,{dx:-18}],['idle',240]]);
          psPlay(def,[['parry',120],['parry',260],['idle',240]]);
          await psSleep(130);const cp=psWorld(def,def.pts.tip);psBurst(cp,'spark',16);psRing(cp);psShake();psSfx('pick');psDom(cp,'Parried','blk');
        }else{
          psPlay(atk,[['strike',120,{dx:lg,trail:true,out:true}],['whiff',140,{dx:lg}],['idle',260]]);psSfx('miss');
          psDom(psWorld(atk,atk.pts.tip),ex.grade==='fumble'?'Fumble!':'Miss','miss');
        }
      }
      await psSleep(560);
    }else if(cue.type==='trip'&&tgt&&me){
      psDom(psWorld(me,me.pts?me.pts.Sh:[0,-60]),'Trip Opponent','fx');
      psPlay(me,[['strike',150],['strike',200],['idle',240]]);
      if(cue.fell){
        await psSleep(160);await psPlay(tgt,[['trip',220,{out:true}],['prone',300]]);
        psDust(tgt);psShake();psSfx('hit');psBanner('Tripped','crit');psDom(psWorld(tgt,tgt.pts.hd),'Tripped!','fx');
      }else{psPlay(tgt,[['crouch',200],['idle',220]]);psDom(psWorld(tgt,tgt.pts.Sh),'Stays up','blk');}
      await psSleep(420);
    }else if(cue.type==='disarm'&&tgt&&me){
      psPlay(me,[['windup',130],['strike',100,{trail:true}],['idle',240]]);await psSleep(230);
      const from=psWorld(tgt,tgt.pts.hand);
      psPlay(tgt,[['flinch',140],['flinch',360],['idle',240]]);psBurst(from,'spark',14);psRing(from);psShake();psSfx('pick');
      psBanner('Disarmed','crit');psFlyWeapon(tgt,cue.metres);
      await psSleep(700);
    }else if(cue.type==='stand'&&me){
      await psPlay(me,[['crouch',220],['idle',220]]);psDust(me);
    }else if(cue.type==='wound'||cue.type==='limb'){
      if(cue.type==='wound')psBanner(cue.level==='major'?'Major wound':'Serious wound','red');
      else psBanner(cue.leg?'Legs gone':'Useless arm','red');
      psSfx('crit');await psSleep(500);
    }else if(cue.type==='end'){
      const won=cue.winner==='a';
      psBanner(cue.winner?(won?'Victory':'Defeated'):'Draw',won?'vd':'bad');psSfx('crit');
      const lo=cue.winner&&PS.fig[cue.winner==='a'?'b':'a'],wi=cue.winner&&PS.fig[cue.winner];
      if(lo)await psPlay(lo,[['hit',140],['ko',460]]);
      if(wi)psPlay(wi,[['win',340]]);
      await psSleep(500);
    }
  }catch(e){/* a newer cue took over; fine */}
}

// ---- Hooks the arena calls ----
function psMount(){
  if(document.getElementById('pitsStage'))return true;
  const root=document.getElementById('root');if(!root||!root.parentNode)return false;
  const sec=document.createElement('section');sec.id='pitsStage';sec.className='ps-wrap';sec.setAttribute('aria-label','Arena');
  sec.innerHTML='<div class="pa-bar"></div><div class="ps-stage"><svg class="ps-scene" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMax meet" aria-hidden="true">'
    +'<rect class="ps-floorfill" x="-2400" y="'+PS_GROUND+'" width="6000" height="400"/>'
    +'<line class="ps-floor" x1="-2400" x2="3600" y1="'+PS_GROUND+'" y2="'+PS_GROUND+'"/>'
    +'<ellipse class="ps-ring-line" cx="600" cy="'+PS_GROUND+'" rx="470" ry="12"/>'
    +'<g class="ps-range"></g><g class="ps-ghost"></g><g class="ps-figs"></g><g class="ps-fx"></g></svg>'
    +'<div class="ps-hud"></div><div class="ps-nums" aria-hidden="true"></div><div class="ps-banner" aria-hidden="true"></div></div>';
  root.parentNode.insertBefore(sec,root);
  const svg=sec.querySelector('svg');
  PS.fig={a:psBuildFig('a',svg),b:psBuildFig('b',svg)};
  PS.ready=true;PS.raf=requestAnimationFrame(psFrame);
  return true;
}
function psRangeKey(){
  const info=typeof engagementInfo==='function'?engagementInfo():{active:false};
  return S.disengaged?'apart':!info.active?'even':S.engagement==='short'?'short':'long';
}
function psDrawRange(key){
  const g=psLayer('ps-range');if(!g)return;
  const a=PS.fig.a.tx,b=PS.fig.b.tx,y=PS_GROUND+26;g.innerHTML='';
  psSvg('line',{x1:a,x2:b,y1:y,y2:y,class:'ps-rline'},g);
  for(const x of [a,b])psSvg('line',{x1:x,x2:x,y1:y-8,y2:y+8,class:'ps-rline thick'},g);
  const word={apart:'Apart'+(S.gapMetres?' · '+S.gapMetres+' m':''),even:'Matched reach',short:'Short reach',long:'Long reach'}[key];
  const t=psSvg('text',{x:(a+b)/2,y:y+26,class:'ps-rtext'},g);t.textContent=word.toUpperCase();
}
function psSetSpacing(snap){
  const key=psRangeKey(),d=PS_SPACING[key],tx={a:600-d/2,b:600+d/2};
  for(const id of ['a','b']){const f=PS.fig[id];
    if(f.tx!==tx[id]||snap){f.tx=tx[id];
      if(snap||psReduced()){f.hx=tx[id];f.slide=null;}else f.slide={a:f.hx,b:tx[id],t0:performance.now(),d:460/psSpeed()};}}
  psDrawRange(key);
}
// Called at the end of every render(): sync state, then play the current beat.
function pitsStageSync(){
  const wrap=typeof document!=='undefined'&&document.getElementById&&document.getElementById('pitsStage');
  const fighting=typeof S!=='undefined'&&S&&S.fighters&&['fight','between','over'].includes(S.phase);
  if(!fighting){if(wrap)wrap.hidden=true;return;}
  if(typeof document==='undefined'||!psMount())return;
  const box=document.getElementById('pitsStage');box.hidden=false;
  // Frame the figures tighter on a phone.
  box.querySelector('svg').setAttribute('viewBox',window.innerWidth<=900?'250 0 700 520':'0 0 1200 520');
  const view=V.busy&&V.shown&&V.shown.a?V.shown:S.fighters;
  const names={a:S.fighters.a.name,b:S.fighters.b.name};
  for(const id of ['a','b']){
    const f=PS.fig[id];f.look=pitsStageLook(view[id]);f.scale=f.look.scale;
    if(f.look.armed&&f.dropEl){f.dropEl.remove();f.dropEl=null;}
    // A weapon already on the floor (for example after Show results) stays there.
    if(!f.look.armed&&!f.dropEl&&view[id].disarmed&&!f.look.limp.rarm)psFlyWeapon(f,view[id].droppedMetres||2);
    f.end=null;
  }
  const over=(S.phase==='over'||S.phase==='between')&&S.winnerId&&!V.busy;
  if(over){PS.fig[S.winnerId].end='win';PS.fig[S.winnerId==='a'?'b':'a'].end='ko';}
  const fresh=!PS.seeded;PS.seeded=true;psSetSpacing(fresh);
  if(V.busy){
    const e=V.events[V.step];
    if(e&&!e.roll&&!e.checkpoint&&e.id!==PS.lastId){
      PS.lastId=e.id;PS.epoch++;
      const cue=pitsStageCue(e,names);
      if(cue)psRunCue(cue);
    }
  }else{PS.epoch++;PS.lastId=Math.max(PS.lastId,...(S.logs||[]).map(l=>Number(l.id)||0));}
}
// The replay asks how long to stay on a beat (see playBeat in the arena).
function pitsStageBeatDelay(entry,fallback){
  try{return pitsStageHold(entry,{a:S.fighters.a.name,b:S.fighters.b.name},fallback);}catch(e){return fallback;}
}
