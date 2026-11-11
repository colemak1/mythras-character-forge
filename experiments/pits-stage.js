// The Pits stage: an OPTIONAL animated stick-figure view (experiment, owner
// request 2026-11-11, from the "the-pits-mythras" prototype).
// PRESENTATION ONLY. It reads the engine's log entries and fighter state (the
// same ones the combat log shows) and draws them. It never rolls, spends AP,
// changes HP or decides anything: remove this file and its hooks and the fight
// plays exactly the same. Opt in with ?stage=1, or ?stage=duel for the
// ready-made sword-versus-spear fight.

// ---- Cues: which animation a log entry means (pure; tested in tests/pits-stage.cjs) ----
const PSTAGE_LOCS={Head:'head',Chest:'chest',Abdomen:'abdomen','Right Arm':'rarm','Left Arm':'larm','Right Leg':'rleg','Left Leg':'lleg'};
const PSTAGE_GRADE=/(CRITICAL|SUCCESS|FAILURE|FUMBLE)/;
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
  if((r=/ hits (Head|Chest|Abdomen|Right Arm|Left Arm|Right Leg|Left Leg)$/.exec(t))&&m.impact)
    return {type:'hit',actor:m.actor||actor,target:m.impact.target,loc:PSTAGE_LOCS[m.impact.location]||PSTAGE_LOCS[r[1]],lost:m.impact.hpLost||0};
  if(t==='No Damaging Hit')return {type:'deflect',evaded:/evades/.test(b)};
  if((t==='Hit Location'||t==='Choose Location')&&m.location)
    return {type:'locate',target:m.target||other(actor),loc:PSTAGE_LOCS[m.location],chosen:t==='Choose Location'};
  if(t==='Choose Location'&&(r=/targets .*?'s (Head|Chest|Abdomen|Right Arm|Left Arm|Right Leg|Left Leg)\./.exec(b)))
    return {type:'locate',target:other(actor),loc:PSTAGE_LOCS[r[1]],chosen:true};
  if(t==='Trip Opponent')return {type:'trip',actor,target:other(actor),fell:/falls prone/.test(b)};
  if(t==='Disarm Opponent'&&/lands \d+m away|drops the weapon/.test(b))
    return {type:'disarm',actor:m.actor||actor,target:m.target||other(actor),metres:+((/lands (\d+)m/.exec(b)||[])[1]||0)};
  if(t==='Regain Footing'&&/Stands up|stands unopposed/.test(b))return {type:'stand',actor:actor};
  if(t==='FIGHT ENDS')return {type:'end'};
  return null;
}
// Plain description of what to draw for one fighter (pure). f is an engine
// fighter (or a clone of one from the replay).
function pitsStageLook(f){
  const w=(typeof ARENA_WEAPONS!=='undefined'&&ARENA_WEAPONS[f.weapon])||{};
  const hand=f.weaponHand||'Right Arm';
  const level=loc=>CombatRules.woundLevel(f.hp[loc],f.maxHp[loc]);
  const parts={};
  for(const [name,key] of Object.entries(PSTAGE_LOCS))parts[key]=level(name);
  const armDown=f.hp[hand]<=0;
  return {weapon:w.reach>=3||/spear|pike|halberd/i.test(f.weapon||'')?'spear':'sword',
    armed:!f.disarmed&&!armDown,prone:!!f.prone,parts,limp:{rarm:f.hp['Right Arm']<=0,larm:f.hp['Left Arm']<=0}};
}

// ---- Everything below needs a browser; the arena calls these four hooks ----
const PSTAGE_ON=(()=>{try{return /[?&]stage=(1|duel)\b/.test(location.search);}catch(e){return false;}})();
const PSTAGE_DUEL=(()=>{try{return /[?&]stage=duel\b/.test(location.search);}catch(e){return false;}})();
const PS={fig:{},fx:null,lastId:0,epoch:0,raf:0,ready:false,banner:null};
const PS_GROUND=450,PS_SPACING={apart:430,even:270,short:200,long:330},PS_M=22;
const PS_IDLE={t:5,hd:0,a1:58,a2:46,w:128,ba1:-18,ba2:-34,l1:30,l2:-34,bl1:-28,bl2:16,dx:0,lift:0};
const PS_KEYS=Object.keys(PS_IDLE);
const psP=o=>({...PS_IDLE,...o});
const PS_POSE={
  idle:psP({}),
  windup:psP({t:-8,a1:18,a2:122,w:190,ba1:-40,ba2:-20,l1:16,l2:-20,bl1:-36,bl2:10,dx:-16}),
  strike:psP({t:20,hd:4,a1:86,a2:4,w:90,ba1:-72,ba2:-10,l1:52,l2:-52,bl1:-46,bl2:-8,dx:46}),
  whiff:psP({t:26,a1:92,a2:0,w:92,ba1:-70,ba2:-10,l1:56,l2:-48,bl1:-48,bl2:-6,dx:40}),
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
const psSvg=(tag,attrs,parent)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;};
const psReduced=()=>typeof V!=='undefined'&&V.reduced;
const psSpeed=()=>typeof V!=='undefined'&&V.quick?2.2:1;
const psSleep=ms=>{const e=PS.epoch;return new Promise((res,rej)=>setTimeout(()=>e===PS.epoch?res():rej(0),ms/psSpeed()));};

function psBuildFig(id,svg){
  const g=psSvg('g',{class:'ps-fig ps-'+(id==='a'?'left':'right')},svg.querySelector('.ps-figs'));
  const shadow=psSvg('ellipse',{class:'ps-shadow',cy:PS_GROUND+3,ry:7},svg.querySelector('.ps-figs'));
  const body=psSvg('g',{class:'ps-body'},psSvg('g',{},g));
  const back=psSvg('g',{class:'ps-back'},body);
  const e={
    lleg:psSvg('polyline',{'stroke-width':9},back),larm:psSvg('polyline',{'stroke-width':8},back),
    abdomen:psSvg('line',{'stroke-width':12},body),chest:psSvg('line',{'stroke-width':12},body),
    rleg:psSvg('polyline',{'stroke-width':10},body),head:psSvg('circle',{r:13,'stroke-width':5,class:'ps-head'},body),
    rarm:psSvg('polyline',{'stroke-width':8},body),
    shaft:psSvg('line',{'stroke-width':4,class:'ps-shaft'},body),
    guard:psSvg('line',{'stroke-width':4,class:'ps-guard'},body),
    wh:psSvg('polygon',{class:'ps-head-blade'},body)};
  const f={id,g,shadow,e,cur:{...PS_IDLE},anim:null,hx:600,tx:600,face:id==='a'?1:-1,scale:id==='a'?1:1.04,
    look:null,pts:null,flash:null,flashUntil:0,drop:null,dropEl:null,end:null,classes:{}};
  f.trail=psSvg('polyline',{class:'ps-trail',opacity:0},svg.querySelector('.ps-fx'));f.trailPts=[];
  return f;
}
function psDraw(f,now){
  const L=f.look;if(!L)return;
  const c=f.cur,down=L.prone||f.end==='ko';
  const br=!down&&!f.anim?Math.sin(now/480+(f.id==='b'?1.7:0)):0;
  let t=c.t+br*1.6,a1=c.a1+br*2,a2=c.a2,ba1=c.ba1,ba2=c.ba2;const w1=c.w+br*2;
  if(L.limp.rarm){a1=6+Math.sin(now/650)*3;a2=5;}
  if(L.limp.larm){ba1=-6+Math.sin(now/700)*3;ba2=-4;}
  const spear=L.weapon==='spear',WL=spear?150:92;
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
  const hand=q(Hn);let tip=hand;
  const show=L.armed&&!f.dropping;
  e.shaft.style.display=e.guard.style.display=e.wh.style.display=show?'':'none';
  if(show){
    tip=psAdd(hand,psDir(w1,WL));const perp=psDir(w1+90,1);
    if(!spear){
      ln(e.shaft,hand,tip);e.shaft.setAttribute('class','ps-shaft');
      const g1=psAdd(hand,psDir(w1,10));
      ln(e.guard,[g1[0]-perp[0]*9,g1[1]-perp[1]*9],[g1[0]+perp[0]*9,g1[1]+perp[1]*9]);e.wh.style.display='none';
    }else{
      const bk=psAdd(hand,psDir(w1,-36));ln(e.shaft,bk,tip);e.shaft.setAttribute('class','ps-shaft ps-wood');
      e.wh.setAttribute('points',psPts([psAdd(tip,psDir(w1,24)),[tip[0]+perp[0]*6,tip[1]+perp[1]*6],[tip[0]-perp[0]*6,tip[1]-perp[1]*6]]));
      e.guard.style.display='none';
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
  return f.look?.prone?PS_POSE.prone:PS_POSE.idle;
}
function psFrame(now){
  if(!PS.ready)return;
  const ids=['a','b'];
  for(const id of ids){
    const f=PS.fig[id];if(!f)continue;
    if(f.slide){const s=f.slide,p=Math.min(1,(now-s.t0)/s.d);f.hx=s.a+(s.b-s.a)*psEase(p);if(p>=1)f.slide=null;}
    if(f.anim){
      const a=f.anim,s=a.steps[a.i];let p=s.d>0?(now-a.t0)/s.d:1;
      if(p>=1){f.cur={...s.to};a.i++;
        if(a.i>=a.steps.length){f.anim=null;f.trailOn=false;}
        else{a.from={...f.cur};a.t0=now;f.trailOn=!!a.steps[a.i].trail;}
      }else{const k=psEase(Math.max(0,p));for(const key of PS_KEYS)f.cur[key]=a.from[key]+(s.to[key]-a.from[key])*k;}
    }else{
      const tg=psRest(f),k=psReduced()?1:.16;
      for(const key of PS_KEYS)f.cur[key]+=(tg[key]-f.cur[key])*k;
    }
    psDraw(f,now);
  }
  PS.raf=requestAnimationFrame(psFrame);
}
function psPlay(f,frames){
  const sp=psSpeed(),r=psReduced();
  const steps=frames.map(([name,d,o])=>{o=o||{};return {to:{...PS_POSE[name],...(o.dx!=null?{dx:o.dx}:{})},d:r?0:d/sp,trail:!!o.trail};});
  f.anim={steps,i:0,t0:performance.now(),from:{...f.cur}};f.trailOn=steps[0].trail;
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
  const box=document.querySelector('#pitsStage .ps-stage'),svg=box.querySelector('svg');
  const pt=svg.createSVGPoint();pt.x=w[0];pt.y=w[1];const s=pt.matrixTransform(svg.getScreenCTM()),r=box.getBoundingClientRect();
  const d=document.createElement('div');d.className='ps-num '+(cls||'');d.textContent=text;
  d.style.left=(s.x-r.left)+'px';d.style.top=(s.y-r.top)+'px';box.querySelector('.ps-nums').appendChild(d);setTimeout(()=>d.remove(),1300);
}
function psBurst(w,kind){
  if(psReduced())return;
  const fx=document.querySelector('#pitsStage .ps-fx');const n=kind==='blood'?10:7;
  for(let i=0;i<n;i++){
    const c=psSvg('circle',{cx:w[0],cy:w[1],r:2+Math.random()*3,class:'ps-'+kind},fx);
    const vx=(Math.random()-.5)*120,vy=-30-Math.random()*70;
    c.animate([{transform:'translate(0,0)',opacity:1},{transform:'translate('+vx*.55+'px,'+vy+'px)',opacity:1,offset:.38},
      {transform:'translate('+vx+'px,'+(vy+(kind==='blood'?130:60))+'px)',opacity:0}],
      {duration:(600+Math.random()*300)/psSpeed(),easing:'ease-in'}).onfinish=()=>c.remove();
  }
}
function psRing(w){
  if(psReduced())return;
  const c=psSvg('circle',{cx:w[0],cy:w[1],r:6,class:'ps-ring'},document.querySelector('#pitsStage .ps-fx'));
  c.animate([{r:6,opacity:1},{r:44,opacity:0}],{duration:420/psSpeed(),easing:'ease-out'}).onfinish=()=>c.remove();
}
function psReticle(w){
  const g=psSvg('g',{class:'ps-reticle'},document.querySelector('#pitsStage .ps-fx'));
  psSvg('circle',{cx:w[0],cy:w[1],r:20},g);
  [[-30,0,-12,0],[12,0,30,0],[0,-30,0,-12],[0,12,0,30]].forEach(l=>psSvg('line',{x1:w[0]+l[0],y1:w[1]+l[1],x2:w[0]+l[2],y2:w[1]+l[3]},g));
  g.animate([{opacity:0},{opacity:1,offset:.25},{opacity:1},{opacity:0}],{duration:psReduced()?500:850/psSpeed()}).onfinish=()=>g.remove();
}
function psShake(){
  if(psReduced())return;const b=document.querySelector('#pitsStage .ps-stage');
  b.classList.remove('ps-shake');void b.offsetWidth;b.classList.add('ps-shake');
}
function psBanner(text,cls){
  const b=document.querySelector('#pitsStage .ps-banner');if(!b)return;
  b.textContent=text;b.className='ps-banner';void b.offsetWidth;b.className='ps-banner ps-go '+(cls||'');
}
const PS_GRADE_WORD={critical:'Critical',success:'Success',failure:'Failure',fumble:'Fumble'};

// Weapon knocked away: fly it in an arc, then leave it on the floor until the
// engine says it was picked up again.
function psFlyWeapon(f,metres){
  const from=f.pts?psWorld(f,f.pts.hand):[f.X,PS_GROUND-80];
  const to=[f.X-f.face*Math.max(40,metres*PS_M),PS_GROUND+2];
  const spear=f.look?.weapon==='spear',len=spear?150:92;
  const fx=document.querySelector('#pitsStage .ps-fx');
  const g=psSvg('g',{class:'ps-dropped'},fx),inner=psSvg('g',{transform:'translate('+(-len/2)+',0)'},g);
  if(spear){psSvg('line',{x1:-36,y1:0,x2:len,y2:0,class:'ps-shaft ps-wood','stroke-width':4},inner);psSvg('polygon',{points:(len+24)+',0 '+len+',6 '+len+',-6',class:'ps-head-blade'},inner);}
  else{psSvg('line',{x1:0,y1:0,x2:len,y2:0,class:'ps-shaft','stroke-width':4},inner);psSvg('line',{x1:10,y1:-9,x2:10,y2:9,class:'ps-guard','stroke-width':4},inner);}
  f.dropEl&&f.dropEl.remove();f.dropEl=g;f.drop=to;f.dropping=true;
  const t0=performance.now(),d=psReduced()?1:760/psSpeed(),spin=(Math.random()<.5?-1:1)*540;
  const step=now=>{
    const p=Math.min(1,(now-t0)/d),x=from[0]+(to[0]-from[0])*p,y=from[1]+(to[1]-from[1])*p-Math.sin(p*Math.PI)*190;
    g.setAttribute('transform','translate('+x+','+y+') rotate('+(spin*p%360)+')');
    if(p<1)requestAnimationFrame(step);else{g.setAttribute('transform','translate('+to[0]+','+to[1]+') rotate(-4)');f.dropping=false;}
  };
  requestAnimationFrame(step);
}

// ---- One cue -> one short scripted beat (about 0.6-0.9 s) ----
async function psRunCue(cue){
  const fig=id=>PS.fig[id]||null,me=fig(cue.actor),foe=me?fig(me.id==='a'?'b':'a'):null;
  const word=PS_GRADE_WORD[cue.grade]||'';
  try{
    if(cue.type==='attack'&&me){
      psBanner((cue.shield?'Shield strike':'Attack')+(word?' · '+word:''),cue.grade==='critical'?'crit':'');
      psPlay(me,[['windup',170],[cue.good?'strike':'whiff',110,{trail:true}],[cue.good?'strike':'whiff',200]]);
      await psSleep(280);
    }else if(cue.type==='parry'&&me){
      psBanner('Parry'+(word?' · '+word:''));
      if(cue.good){psPlay(me,[['parry',130],['parry',420]]);await psSleep(140);
        const w=foe&&foe.pts?psWorld(foe,foe.pts.tip):[me.X,PS_GROUND-100];psBurst(w,'spark');psRing(w);psShake();
      }else{psPlay(me,[['flinch',140],['flinch',360]]);}
      await psSleep(380);
    }else if(cue.type==='evade'&&me){
      psBanner('Evade'+(word?' · '+word:''));
      psPlay(me,cue.good?[['evade',180],['evade',400]]:[['flinch',150],['flinch',300]]);
      await psSleep(380);
    }else if(cue.type==='locate'){
      const t=fig(cue.target);if(t){psBanner((cue.chosen?'Chosen location · ':'Hit location · ')+(cue.loc||''),cue.chosen?'crit':'');psReticle(psBodyPt(t,cue.loc));}
      await psSleep(500);
    }else if(cue.type==='hit'){
      const t=fig(cue.target);if(!t)return;
      const w=psBodyPt(t,cue.loc);
      t.flash=cue.loc;t.flashUntil=performance.now()+900;
      if(cue.lost>0){psPlay(t,[['hit',110],['hit',420]]);psBurst(w,'blood');psDom(w,'−'+cue.lost,'dmg');psShake();psBanner('Hit · '+(cue.lost)+' HP','hurt');}
      else{psPlay(t,[['parry',100],['parry',300]]);psBurst(w,'spark');psDom(w,'0','zero');psBanner('No damage');}
      await psSleep(520);
    }else if(cue.type==='deflect'){
      psBanner(cue.evaded?'Evaded':'No damage');await psSleep(300);
    }else if(cue.type==='trip'){
      const t=fig(cue.target);
      psBanner('Trip Opponent · '+(cue.fell?'down!':'stays up'),cue.fell?'crit':'');
      if(me)psPlay(me,[['strike',160],['strike',200]]);
      if(t){
        if(cue.fell){psPlay(t,[['trip',260],['prone',280]]);await psSleep(300);const w=[t.X,PS_GROUND-4];psBurst(w,'dust');psShake();}
        else{psPlay(t,[['crouch',200],['crouch',160]]);}
      }
      await psSleep(520);
    }else if(cue.type==='disarm'){
      const t=fig(cue.target);
      psBanner('Disarm Opponent','crit');
      if(me)psPlay(me,[['windup',130],['strike',100,{trail:true}],['strike',200]]);
      await psSleep(220);
      if(t){psPlay(t,[['flinch',120],['flinch',380]]);const w=t.pts?psWorld(t,t.pts.hand):[t.X,PS_GROUND-80];psBurst(w,'spark');psRing(w);psFlyWeapon(t,cue.metres);}
      await psSleep(600);
    }else if(cue.type==='stand'&&me){
      psBanner('Regain footing');psPlay(me,[['crouch',240],['idle',240]]);await psSleep(480);
    }
  }catch(e){/* a newer cue took over; fine */}
}

// ---- Hooks the arena calls ----
function psMount(){
  if(document.getElementById('pitsStage'))return true;
  const root=document.getElementById('root');if(!root||!root.parentNode)return false;
  const sec=document.createElement('section');sec.id='pitsStage';sec.className='ps-wrap';sec.setAttribute('aria-label','Fight stage (visual only)');
  sec.innerHTML='<div class="ps-stage"><svg viewBox="100 130 1000 385" role="img" aria-label="Animated view of the duel. The combat log below is the full record.">'
    +'<line class="ps-floor" x1="0" y1="'+(PS_GROUND+10)+'" x2="1200" y2="'+(PS_GROUND+10)+'"/>'
    +'<g class="ps-figs"></g><g class="ps-fx"></g></svg><div class="ps-nums" aria-hidden="true"></div>'
    +'<div class="ps-banner" aria-hidden="true"></div>'
    +'<div class="ps-names"><span class="ps-nm ps-nm-a"></span><span class="ps-nm ps-nm-b"></span></div></div>'
    +'<p class="ps-note">Stage preview · visual only. Dice, Action Points, Special Effects and the log are the normal Pits rules.</p>';
  root.parentNode.insertBefore(sec,root);
  const svg=sec.querySelector('svg');
  PS.fig={a:psBuildFig('a',svg),b:psBuildFig('b',svg)};
  PS.ready=true;PS.raf=requestAnimationFrame(psFrame);
  return true;
}
function psSetSpacing(snap){
  const info=typeof engagementInfo==='function'?engagementInfo():{active:false};
  const key=S.disengaged?'apart':!info.active?'even':S.engagement==='short'?'short':'long';
  const d=PS_SPACING[key],tx={a:600-d/2,b:600+d/2};
  for(const id of ['a','b']){const f=PS.fig[id];
    if(Math.abs(f.tx-tx[id])<1&&f.slide===null)continue;
    f.tx=tx[id];if(snap||psReduced()||f.hx===undefined){f.hx=tx[id];f.slide=null;}else f.slide={a:f.hx,b:tx[id],t0:performance.now(),d:420/psSpeed()};}
}
// Called at the end of every render(): sync state, then play the current beat.
function pitsStageSync(){
  if(!PSTAGE_ON||typeof S==='undefined'||!S||!S.fighters||S.phase==='setup'||S.phase==='intro'){
    const w=typeof document!=='undefined'&&document.getElementById&&document.getElementById('pitsStage');if(w)w.hidden=true;return;}
  if(typeof document==='undefined'||!psMount())return;
  const wrap=document.getElementById('pitsStage');wrap.hidden=false;
  // Frame the figures tighter on a phone (the stage itself sticks to the top of the screen).
  wrap.querySelector('svg').setAttribute('viewBox',window.innerWidth<=900?'170 130 860 385':'100 130 1000 385');
  const view=V.busy&&V.shown&&V.shown.a?V.shown:S.fighters;
  const names={a:S.fighters.a.name,b:S.fighters.b.name};
  for(const id of ['a','b']){
    const f=PS.fig[id];f.look=pitsStageLook(view[id]);
    document.querySelector('.ps-nm-'+id).textContent=view[id].name;
    if(f.look.armed&&f.dropEl){f.dropEl.remove();f.dropEl=null;f.drop=null;}
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
      if(cue){if(cue.type==='end'&&S.winnerId){/* poses follow once the replay ends */}
        else psRunCue(cue);}
    }
  }else{PS.epoch++;PS.lastId=Math.max(PS.lastId,...(S.logs||[]).map(l=>Number(l.id)||0));}
}
