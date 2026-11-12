// The Pits stage: the animated stick-figure arena (from the "the-pits-mythras"
// prototype, adapted to the Forge's own combat engine).
// PRESENTATION ONLY. It reads the engine's log entries (their meta carries the
// resolved facts of each blow) and fighter state, and draws them. It never
// rolls, spends AP, changes HP or decides anything: every rule, die and choice
// comes from the engine in practice-combat.html.

// ---------------------------------------------------------------------------
// Pure part (no DOM): cues, outcomes, weapon drawing kinds, rig geometry, aim.
// Tested in tests/pits-stage.cjs.
// ---------------------------------------------------------------------------
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
  if(/(?: attacks| makes a Remise attack| strikes with the shield)$/.test(t))
    return {type:'attack',actor,grade,good,shield:/shield$/.test(t)||m.tool==='shield',exid:m.exid||0};
  if(/ parries( with shield)?$/.test(t))return {type:'parry',actor,grade,good,shield:/shield$/.test(t)||m.tool==='shield',exid:m.exid||0};
  if(/ evades$/.test(t))return {type:'evade',actor,grade,good,exid:m.exid||0};
  if((r=new RegExp(' hits '+PSTAGE_LOCRE+'$').exec(t))&&m.impact)
    return {type:'hit',actor:m.actor||actor,target:m.impact.target,loc:PSTAGE_LOCS[m.impact.location]||PSTAGE_LOCS[r[1]],lost:m.impact.hpLost||0,px:m.px||null};
  if(t==='No Damaging Hit')return {type:'deflect',actor:m.actor||null,evaded:/evades/.test(b),px:m.px||null};
  if((t==='Hit Location'||t==='Choose Location')&&m.location)
    return {type:'locate',target:m.target||other(actor),loc:PSTAGE_LOCS[m.location],chosen:t==='Choose Location'};
  if(t==='Choose Location'&&(r=new RegExp("targets .*?'s "+PSTAGE_LOCRE+'\\.').exec(b)))
    return {type:'locate',target:other(actor),loc:PSTAGE_LOCS[r[1]],chosen:true};
  if(t==='Trip Opponent'&&/falls prone|remains standing/.test(b))return {type:'trip',actor,target:other(actor),fell:/falls prone/.test(b)};
  if(t==='Disarm Opponent'&&/lands \d+m away|drops the weapon/.test(b))
    return {type:'disarm',actor:m.actor||actor,target:m.target||other(actor),metres:+((/lands (\d+)m/.exec(b)||[])[1]||0)};
  if(t==='Regain Footing'&&/Stands up|stands unopposed/.test(b))return {type:'stand',actor:actor};
  if((r=new RegExp('^(SERIOUS|MAJOR) WOUND · '+PSTAGE_LOCRE+'$').exec(t)))return {type:'wound',level:r[1].toLowerCase(),loc:PSTAGE_LOCS[r[2]]};
  if(t==='Limb Disabled'){const lr=new RegExp(PSTAGE_LOCRE).exec(b);return {type:'limb',leg:/Leg/.test(b),loc:lr?PSTAGE_LOCS[lr[1]]:null,who:idOf(b)};}
  if(t==='Weapon Dropped')return {type:'drop',actor:m.actor||idOf(b)};
  if(t==='Press Advantage')return {type:'press',actor,target:other(actor),name:t};
  if(t==='Impaled Weapon')return {type:'lodge',actor};
  if(t==='FIGHT ENDS'){
    // only what the engine's own wording says: a concession, an injury, or blood loss/exhaustion; nothing is inferred from the damage
    const how=/concede/i.test(b)?'concede':/blood loss|fatigue|exertion|exhaustion|neither fighter/i.test(b)?'fatigue':'injury';
    return {type:'end',winner:idOf(b),how};
  }
  return null;
}
// What a resolved blow looked like, from the engine's own facts (px). One of:
// wound, partial-parry, partial-ward, full-parry, full-ward, armour, zero (hits);
// evaded, parried, miss, fumble (no damaging hit).
function pitsStageOutcome(cue,ex){
  const px=cue.px||{};
  if(cue.type==='hit'){
    if(cue.lost>0)return px.blocked>0?(px.blockedBy==='ward'?'partial-ward':'partial-parry'):'wound';
    if(px.blocked>0&&px.afterParry===0)return px.blockedBy==='ward'?'full-ward':'full-parry';
    if(px.armour>0)return 'armour';
    return 'zero';
  }
  if(px.evaded||cue.evaded)return 'evaded';
  const react=px.react||(ex&&ex.react),grade=px.reactGrade!=null?px.reactGrade:(ex?ex.reactGrade:null);
  if(react==='parry'&&grade>=2)return 'parried';
  return (px.aGrade===0||(ex&&ex.aGrade===0))?'fumble':'miss';
}
// How long the replay should stay on a beat so its animation can finish (ms).
// Windup and guard are held through the dice (exPose), so a beat only needs its own motion plus a short read;
// the dice tray is the reading pause. Targets follow the prototype: strike ~120ms, hit 100+170ms, recover ~250ms.
const PSTAGE_HOLD={attack:350,parry:350,evade:650,hit:1100,deflect:1100,locate:500,trip:900,disarm:1000,stand:500,wound:600,limb:600,lodge:600,end:1800};
function pitsStageHold(entry,names,fallback){
  const c=pitsStageCue(entry,names);return c&&PSTAGE_HOLD[c.type]?PSTAGE_HOLD[c.type]:fallback;
}
// How a weapon (an engine ARENA_WEAPONS key) is drawn. Unknown keys get a
// plain haft rather than a wrong blade.
function pitsStageWeaponKind(key,reach){
  const k=String(key||'');
  if(/^(dagger|knife|main-gauche)$/.test(k))return {kind:'blade',len:50};
  if(/^(shortsword|hatchet)$/.test(k))return /hatchet/.test(k)?{kind:'axe',len:58}:{kind:'blade',len:68};
  if(/^(falchion|sabre|scimitar)$/.test(k))return {kind:'blade',len:84};
  if(/^rapier$/.test(k))return {kind:'blade',len:112,thin:1};
  if(/^(sword|longsword)$/.test(k))return {kind:'blade',len:k==='sword'?92:104};
  if(/^(greatsword|longsword-2h)$/.test(k))return {kind:'blade',len:k==='greatsword'?130:118};
  if(/axe/.test(k)&&!/halberd/.test(k))return {kind:'axe',len:/great/.test(k)?120:84};
  if(/^(halberd-poleaxe|glaive-rhomphaia)$/.test(k))return {kind:'polearm',len:176};
  if(/^trident$/.test(k))return {kind:'trident',len:150};
  if(/^(spear)$/.test(k))return {kind:'spear',len:150};
  if(/^(longspear|xyston)$/.test(k))return {kind:'spear',len:190};
  if(/^pike-sarissa$/.test(k))return {kind:'spear',len:230};
  if(/^quarterstaff$/.test(k))return {kind:'staff',len:132};
  if(/^(club|mace)$/.test(k))return {kind:'club',len:k==='club'?66:70};
  if(/^(great-club|great-hammer)$/.test(k))return {kind:'club',len:118};
  if(/^military-pick$/.test(k))return {kind:'pick',len:82};
  if(/^(flail|military-flail|ball-chain|chain)$/.test(k))return {kind:'chain',len:/military/.test(k)?110:84};
  if(/^whip$/.test(k))return {kind:'whip',len:150};
  if(/^net$/.test(k))return {kind:'net',len:70};
  return {kind:'staff',len:Math.max(60,Math.min(150,(+reach||2)*40+30))};
}
// Plain description of what to draw for one fighter (pure). f is an engine
// fighter (or a clone of one from the replay).
function pitsStageLook(f){
  const w=(typeof ARENA_WEAPONS!=='undefined'&&ARENA_WEAPONS[f.weapon])||{};
  const hand=f.weaponHand||'Right Arm';
  const level=loc=>CombatRules.woundLevel(f.hp[loc],f.maxHp[loc]);
  const out=loc=>(f.disabled||[]).includes(loc)&&!(f.partialLimbs&&f.partialLimbs[loc]);
  const parts={};
  for(const [name,key] of Object.entries(PSTAGE_LOCS))parts[key]=level(name);
  const wk=pitsStageWeaponKind(f.weapon,w.reach);
  return {weapon:wk.kind,wk,swap:hand==='Left Arm',
    armed:!f.disarmed,prone:!!f.prone,parts,shield:!!f.shield&&f.shield!=='none'&&!f.shieldLost,
    // an arm hangs limp only when the engine has disabled it (a failed Endurance test), not just because its hit points are low
    limp:{rarm:out('Right Arm'),larm:out('Left Arm')},pressed:(f.pressedTurns||0)>0,scale:Math.max(.92,Math.min(1.1,.95+((+f.siz||13)-13)*.012))};
}
// What the engine says is stuck in, or wrapped around, a fighter right now (pure).
// lodged: [{loc,weapon,holder,held}] from impaledWounds; held when the wielder
// still has hold of it (their impaledWeapon points at this wound).
function pitsStageLodged(fighters,id){
  const v=fighters[id];if(!v)return [];
  return (v.impaledWounds||[]).filter(w=>w&&w.loc).map(w=>{
    const h=fighters[w.attacker],held=!!(h&&h.impaledWeapon&&h.impaledWeapon.target===id&&h.impaledWeapon.loc===w.loc);
    return {loc:PSTAGE_LOCS[w.loc]||'chest',weapon:w.weapon||(h&&h.weapon)||'sword',holder:w.attacker,held};
  });
}
function pitsStageEntangle(fighters,id){
  const v=fighters[id];return v&&v.entangled&&v.entangled.by?{loc:PSTAGE_LOCS[v.entangled.loc]||'rarm',by:v.entangled.by}:null;
}

// ----- Rig geometry (units are the drawing's own; y grows downward) -----
const PS_IDLE={t:5,hd:0,a1:58,a2:46,w:128,ba1:-18,ba2:-34,l1:30,l2:-34,bl1:-28,bl2:16,dx:0,lift:0};
const PS_KEYS=Object.keys(PS_IDLE);
const psRad=a=>a*Math.PI/180,psDeg=r=>r*180/Math.PI;
const psDir=(a,l)=>[Math.sin(psRad(a))*l,Math.cos(psRad(a))*l];
const psAdd=(p,q)=>[p[0]+q[0],p[1]+q[1]];
const PS_ARM=[32,30];                       // upper arm, forearm
// Geometry of a pose c for a fighter whose weapon is wk (all in the fighter's own
// frame: x forward, y down, feet at y 0, before dx and facing are applied).
function pitsStageGeom(c,wk,swap){
  const t=c.t;
  const Sh=[Math.sin(psRad(t))*58,-Math.cos(psRad(t))*58],M=[Sh[0]*.5,Sh[1]*.5],H=[0,0];
  const hd=psAdd(Sh,[Math.sin(psRad(t+c.hd))*23,-Math.cos(psRad(t+c.hd))*23]);
  // poses are role based: the weapon arm takes the (a1,a2) pair, the other arm the (ba1,ba2) pair
  const wa=[c.a1,c.a2],oa=[c.ba1,c.ba2];
  const E=psAdd(Sh,psDir(wa[0],PS_ARM[0])),Hn=psAdd(E,psDir(wa[0]+wa[1],PS_ARM[1]));
  const bE=psAdd(Sh,psDir(oa[0],PS_ARM[0])),bHn=psAdd(bE,psDir(oa[0]+oa[1],PS_ARM[1]));
  const K=psDir(c.l1,46),F=psAdd(K,psDir(c.l1+c.l2,46)),bK=psDir(c.bl1,46),bF=psAdd(bK,psDir(c.bl1+c.bl2,46));
  const low=Math.max(F[1],bF[1],hd[1]+13,Hn[1],bHn[1],K[1],bK[1],Sh[1]);
  const off=-low-4-c.lift,q=p=>[p[0],p[1]+off];
  const len=wk?wk.len:92;
  const wAng=c.w;                           // weapon angle is absolute
  const tip=psAdd(q(Hn),psDir(wAng,len));
  return {Sh:q(Sh),M:q(M),H:q(H),hd:q(hd),E:q(E),Hn:q(Hn),bE:q(bE),bHn:q(bHn),K:q(K),bK:q(bK),F:q(F),bF:q(bF),tip,off};
}
// Body-part points in a fighter's own frame (for aiming and effects).
function pitsStagePart(g,loc){
  const mid=(x,y)=>[(x[0]+y[0])/2,(x[1]+y[1])/2];
  return {head:g.hd,chest:mid(g.Sh,g.M),abdomen:mid(g.M,g.H),rarm:g.E,larm:g.bE,rleg:g.K,lleg:g.bK}[loc]||g.M;
}
// Aim a strike: solve the lunge (dx) and the arm and weapon angles so the tip ends
// at `target` (the fighter's own frame, x forward from its standing point, y down
// from the ground line). base is the pose to start from (stance). arm 'weapon'
// uses the weapon arm; 'off' the shield arm (a shield bash). pen is how far the
// tip goes into the target. Returns {pose, tip, reach, ok}.
function pitsStageAim(base,wk,swap,target,opts){
  opts=opts||{};
  const arm=opts.arm||'weapon',pen=opts.pen==null?6:opts.pen,minDx=opts.minDx==null?0:opts.minDx,maxDx=opts.maxDx==null?260:opts.maxDx;
  const g=pitsStageGeom({...base,dx:0},wk,swap);
  const WL=arm==='off'?(opts.shieldR||16):(wk?wk.len:92),R=PS_ARM[0]+PS_ARM[1]+WL;
  const want=Math.max(10,R-pen),vy=target[1]-g.Sh[1];
  const ux=Math.sqrt(Math.max(0,want*want-vy*vy));
  const raw=target[0]-g.Sh[0]-ux;
  let dx=Math.max(minDx,Math.min(maxDx,raw));
  const pair=arm==='off'?['ba1','ba2']:['a1','a2'];
  const pose={...base,dx};
  let tip,clamped=raw>maxDx;
  const Sx=dx+g.Sh[0];
  if(raw<minDx){
    // the target is nearer than the full reach: keep the lunge and bend the arm so the tip still lands on it
    const w=psDeg(Math.atan2(target[0]-Sx,vy)),hand=[target[0]-Math.sin(psRad(w))*(WL-pen),target[1]-Math.cos(psRad(w))*(WL-pen)];
    const hv=[hand[0]-Sx,hand[1]-g.Sh[1]],d=Math.max(Math.abs(PS_ARM[0]-PS_ARM[1])+2,Math.min(PS_ARM[0]+PS_ARM[1],Math.hypot(hv[0],hv[1])));
    const th=psDeg(Math.atan2(hv[0],hv[1])),al=psDeg(Math.acos(Math.max(-1,Math.min(1,(PS_ARM[0]*PS_ARM[0]+d*d-PS_ARM[1]*PS_ARM[1])/(2*PS_ARM[0]*d)))));
    let best=null;
    for(const a1 of [th-al,th+al]){
      const E=psDir(a1,PS_ARM[0]),f=psDeg(Math.atan2(hv[0]-E[0],hv[1]-E[1]));
      if(!best||E[1]>best.ey)best={a1,a2:f-a1,ey:E[1]};
    }
    pose[pair[0]]=best.a1;pose[pair[1]]=best.a2;if(arm==='weapon')pose.w=w;
  }else{
    const vx=target[0]-Sx,ang=psDeg(Math.atan2(vx,vy));
    pose[pair[0]]=ang;pose[pair[1]]=0;if(arm==='weapon')pose.w=ang;
  }
  const gg=pitsStageGeom(pose,wk,swap);
  const sd=psDir(pose.ba1+pose.ba2,opts.shieldR||16);
  tip=arm==='off'?[gg.bHn[0]+sd[0]+dx,gg.bHn[1]+sd[1]]:[gg.tip[0]+dx,gg.tip[1]];
  return {pose,tip,reach:R,ok:!clamped&&Math.hypot(tip[0]-target[0],tip[1]-target[1])<=pen+8,angle:pose[pair[0]]};
}

// ----- One exchange as one record (pure; tested in tests/pits-stage.cjs) -----
// The beats of a batch (log entries, dice and checkpoints) arrive in the order the engine produced them. A blow is
// presented only once its whole exchange is resolved: any resistance roll or decision that follows the contact is
// finished first, so the contact flows straight into its real consequence. Dice are always shown at once.
const PSTAGE_BLOW=['hit','deflect'];
const PSTAGE_AFTER=['wound','limb','drop','lodge','end'];
function pitsStageKind(e,names){
  if(!e)return 'none';if(e.roll)return 'roll';if(e.checkpoint)return 'checkpoint';
  const c=pitsStageCue(e,names);return c?c.type:'other';
}
// events: this batch. held: non-dice beats already held back for the exchange in progress.
// waiting: the engine is waiting on a person (a roll or a choice) at the end of the batch.
// Returns {play, hold}: the beats to present now, in order, and the beats still held back.
function pitsStageArrange(events,held,waiting,names){
  events=events||[];held=held||[];
  const kinds=events.map(e=>pitsStageKind(e,names));
  const dice=i=>events.filter((e,k)=>i(k)&&e.roll),rest=i=>events.filter((e,k)=>i(k)&&!e.roll);
  let lastAtk=-1;kinds.forEach((k,i)=>{if(k==='attack')lastAtk=i;});
  let head=events,tail=[];
  const play=[];let hold=[];
  if(held.length){
    if(lastAtk>=0){
      // the next exchange begins in this batch: the held one is over first
      const before=i=>i<lastAtk;
      play.push(...dice(before),...held,...rest(before));
      tail=events.slice(lastAtk);head=[];
    }else if(!waiting){
      return {play:[...dice(()=>true),...held,...rest(()=>true)],hold:[]};
    }else{
      return {play:dice(()=>true),hold:[...held,...rest(()=>true)]};
    }
  }
  const list=tail.length?tail:head;
  if(list.length){
    const ks=list.map(e=>pitsStageKind(e,names));
    const b=ks.findIndex(k=>PSTAGE_BLOW.includes(k));
    if(waiting&&b>=0){
      play.push(...list.slice(0,b),...list.slice(b).filter(e=>e.roll));
      hold=list.slice(b).filter(e=>!e.roll);
    }else play.push(...list);
  }
  return {play,hold};
}
// What one beat is, given the beats around it. A blow takes its exchange's effects (Press Advantage) and consequences
// (wound, disabled limb, dropped weapon, the end of the fight) into one record, and those beats then have no motion of their own.
// Returns {cue, consumed}.
function pitsStageBeat(events,step,names){
  const e=events[step],cue=pitsStageCue(e,names);
  if(!cue)return {cue:null,consumed:false};
  const k=i=>pitsStageKind(events[i],names);
  let a0=-1,a1=events.length;
  for(let i=step;i>=0;i--)if(k(i)==='attack'){a0=i;break;}
  for(let i=step+1;i<events.length;i++)if(k(i)==='attack'){a1=i;break;}
  const inEx=(lo,hi,types)=>{const out=[];for(let i=lo;i<hi;i++){const c=pitsStageCue(events[i],names);if(c&&types.includes(c.type)&&!events[i].roll&&!events[i].checkpoint)out.push(c);}return out;};
  if(PSTAGE_BLOW.includes(cue.type)){
    return {cue:{...cue,record:{press:inEx(a0+1,step,['press'])[0]||null,after:inEx(step+1,a1,PSTAGE_AFTER)}},consumed:false};
  }
  if(cue.type==='press'){
    const later=inEx(step+1,a1,PSTAGE_BLOW).length>0;
    return later?{cue,consumed:true}:{cue,consumed:false};
  }
  if(PSTAGE_AFTER.includes(cue.type)){
    // a consequence after a blow of the same exchange is part of that blow's motion
    const earlier=inEx(a0+1,step,PSTAGE_BLOW).length>0;
    return earlier?{cue,consumed:true}:{cue,consumed:false};
  }
  return {cue,consumed:false};
}

// ---------------------------------------------------------------------------
// Browser part
// ---------------------------------------------------------------------------
const PSTAGE_DUEL=(()=>{try{return /[?&]stage=duel\b/.test(location.search);}catch(e){return false;}})();
// The movement language of docs/pits-animation-direction.md drives the figures; ?stage=poses keeps the earlier pose
// library for comparison until the owner has judged the new movement at the table.
const PS_MOTION=(()=>{try{return typeof PitsMotion!=='undefined'&&!/[?&]stage=poses\b/.test(location.search);}catch(e){return false;}})();
const PS={clock:0,M:{},gap:0,busyUntil:0,paused:false,cuePromise:null,cueFor:0,fig:{},lastId:0,epoch:0,raf:0,ready:false,seeded:false,ex:null,run:null,wasBusy:false,fighters:{},lodge:{},tether:{},events:[]};
const PS_GROUND=450,PS_SPACING={apart:440,even:300,short:220,long:390},PS_M=22;
const psP=o=>({...PS_IDLE,...o});
const PS_POSE={
  idle:psP({}),
  windup:psP({t:-8,a1:18,a2:122,w:190,ba1:-40,ba2:-20,l1:16,l2:-20,bl1:-36,bl2:10,dx:-16}),
  cock:psP({t:-10,a1:40,a2:70,w:84,ba1:-40,ba2:-20,l1:16,l2:-20,bl1:-36,bl2:10,dx:-24}),
  lunge:psP({t:20,hd:4,ba1:-72,ba2:-10,l1:52,l2:-52,bl1:-46,bl2:-8}),
  whiff:psP({t:26,a1:92,a2:0,w:92,ba1:-70,ba2:-10,l1:56,l2:-48,bl1:-48,bl2:-6}),
  guard:psP({t:0,a1:46,a2:80,w:176,ba1:-30,ba2:-40,l1:26,l2:-28,bl1:-22,bl2:10}),
  brace:psP({t:4,a1:60,a2:30,w:150,l1:34,l2:-34,bl1:-26,bl2:12}),
  evade:psP({t:-24,hd:-10,a1:30,a2:40,w:112,l1:8,l2:-12,bl1:-40,bl2:20,dx:-80,lift:30}),
  hit:psP({t:-28,hd:-18,a1:20,a2:50,w:72,ba1:-60,ba2:-10,l1:14,l2:-8,bl1:-30,bl2:8,dx:-38}),
  step1:psP({t:6,l1:36,l2:-22,bl1:-30,bl2:12}),
  step2:psP({t:2,l1:-8,l2:-14,bl1:-54,bl2:6}),
  stagger:psP({t:-8,hd:-6,dx:-12}),
  recoil:psP({t:-14,hd:-6,a1:70,a2:50,w:150,ba1:-50,ba2:-10,dx:-30}),
  crouch:psP({t:-14,a1:30,a2:70,w:150,l1:60,l2:-98,bl1:-70,bl2:60,dx:-10}),
  prone:psP({t:-90,hd:-12,a1:-104,a2:-8,w:-80,ba1:-120,ba2:-8,l1:86,l2:0,bl1:80,bl2:6,dx:-8}),
  trip:psP({t:-38,hd:-14,a1:168,a2:-12,w:200,ba1:120,ba2:30,l1:-64,l2:30,bl1:56,bl2:-40,dx:-34,lift:34}),
  flinch:psP({t:-14,hd:-10,a1:100,a2:-60,w:40,ba1:-60,ba2:-10,dx:-22}),
  ko:psP({t:-92,hd:-20,a1:-70,a2:-30,w:-40,ba1:-110,ba2:-20,l1:78,l2:10,bl1:70,bl2:16,dx:-50}),
  win:psP({t:-6,a1:160,a2:14,w:176,ba1:-24,ba2:-30}),
  // a leg gives way: the front (right) or back (left) knee drops
  buckleR:psP({t:-16,hd:-8,a1:30,a2:60,w:120,l1:64,l2:-108,bl1:-22,bl2:36,dx:-24}),
  buckleL:psP({t:-16,hd:-8,a1:30,a2:60,w:120,l1:20,l2:-30,bl1:-74,bl2:96,dx:-22}),
  // yielding: the weapon lowered, the head and shoulders bowed
  yield:psP({t:16,hd:14,a1:22,a2:24,w:166,ba1:-18,ba2:-32,l1:34,l2:-44,bl1:-30,bl2:28,dx:-10}),
  // Press Advantage: the aggressor keeps the weapon up and forward and leans in; the opponent covers up and takes their weight back
  press:psP({t:4,a1:56,a2:58,w:78,ba1:-44,ba2:-20,l1:30,l2:-30,bl1:-30,bl2:14,dx:14}),
  cover:psP({t:-12,hd:-8,a1:40,a2:92,w:182,ba1:-30,ba2:-50,l1:20,l2:-30,bl1:-34,bl2:20,dx:-14})
};
// A pose part-way between two (a ready stance is between idle and guard: a fighter in combat is not at ease).
const psMix=(a,b,k)=>{const o={};for(const key of PS_KEYS)o[key]=a[key]+(b[key]-a[key])*k;return o;};
const psReady=()=>psMix(PS_POSE.idle,PS_POSE.guard,.5);
const psPts=a=>a.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
const psEase=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
const psEaseOut=p=>1-Math.pow(1-p,3);
const psEaseAcc=p=>Math.pow(Math.max(0,Math.min(1,p)),1.8);   // a strike accelerates into contact
// Joints do not all move on one curve: the legs and hips lead, the shoulder, elbow and finally the weapon follow.
const PS_LAG={t:0,hd:.06,dx:0,lift:0,l1:0,l2:.05,bl1:0,bl2:.05,a1:.08,ba1:.08,a2:.16,ba2:.16,w:.24};
const psKey=(key,p,ease)=>{const d=PS_LAG[key]||0;return ease(Math.max(0,Math.min(1,(p-d)/(1-d))));};
// Momentum: the speed a joint had when a new motion replaces the old one is not thrown away; it decays out as a short
// overshoot, so a reversal shows visible braking instead of a dead stop.
const PS_TAU=40;
function psMomentum(f,now){
  const m=f.mom;if(!m)return null;const tm=(now-m.t0);if(tm>PS_TAU*7){f.mom=null;return null;}
  const k=tm*Math.exp(-tm/PS_TAU),o={};for(const key of PS_KEYS)o[key]=(m.v[key]||0)*k;return o;
}
const psSvg=(tag,attrs,parent)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;};
const psReduced=()=>typeof V!=='undefined'&&V.reduced;
const psSpeed=()=>typeof V!=='undefined'&&V.quick?2.2:1;
const psSleep=ms=>{const e=PS.epoch;return new Promise((res,rej)=>setTimeout(()=>e===PS.epoch?res():rej(0),ms/psSpeed()));};
const psSfx=k=>{try{if(typeof pitsSfx==='function')pitsSfx(k);}catch(e){}};
const psLayer=c=>document.querySelector('#pitsStage .'+c);
// Test and review hook: every stage event is recorded when a page asks for it.
function psEmit(type,data){
  try{if(window.__psRecord){window.__psRecord.push({t:Math.round(performance.now()),type,...data});
    // a review page may freeze the picture at the moment of contact (window.__psFreeze) and thaw it after the screenshot
    if(type==='contact'&&window.__psFreeze)psFreeze();}}catch(e){}
  // the plates take the damage when the blade reaches the body, not at the guard of a partial parry
  if(type==='contact'&&data.kind!=='deflect'){try{if(typeof pitsStageOnContact==='function')pitsStageOnContact();}catch(e){}}
}
const psFigs=()=>[PS.fig.a,PS.fig.b];
function psFreeze(){
  if(PS.freeze)return;PS.freeze=performance.now();
  try{document.getAnimations().forEach(a=>a.pause());}catch(e){}
  setTimeout(psThaw,2500);
}
function psThaw(){
  if(!PS.freeze)return;const gap=performance.now()-PS.freeze;PS.freeze=0;
  for(const f of psFigs()){if(f.anim)f.anim.t0+=gap;if(f.slide)f.slide.t0+=gap;}
  try{document.getAnimations().forEach(a=>a.play());}catch(e){}
}
window.__psThaw=()=>psThaw();

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
    wh:psSvg('polygon',{class:'ps-head-blade'},body),
    wh2:psSvg('polygon',{class:'ps-head-blade'},body),
    wire:psSvg('polyline',{class:'ps-wire',fill:'none'},body)};
  const f={id,g,shadow,e,cur:{...PS_IDLE},anim:null,done:null,hx:600,tx:600,face:id==='a'?1:-1,scale:1,
    look:null,pts:null,flash:null,flashUntil:0,dropEl:null,dropping:false,end:null,classes:{},trailOn:false,trailPts:[],holdPose:null,slide:null,X:600};
  f.trail=psSvg('polyline',{class:'ps-trail',opacity:0},svg.querySelector('.ps-fx'));
  return f;
}
// Supporting feet stay planted while the body travels; a foot steps (one at a time, with a small lift) only when the
// pose has carried it out of reach, so a lunge reads as steps, not sliding. Legs are solved two-bone from the hip.
function psPlantFeet(f,g,pose,L,now){
  const down=L.prone||f.end==='ko'||pose.lift>8||Math.abs(pose.t)>36;
  if(down){f.plant=null;return;}
  const sc=f.scale,fc=f.face,X=f.hx+fc*pose.dx*sc,P=f.plant=f.plant||{};
  const stepping=n=>P[n]&&P[n].d&&now<P[n].t0+P[n].d;
  for(const [foot,knee,other] of [['F','K','bF'],['bF','bK','F']]){
    const want=X+fc*sc*g[foot][0];
    let st=P[foot];if(!st)st=P[foot]={x:want,from:want,to:want,t0:0,d:0};
    if(st.d&&now>=st.t0+st.d){st.x=st.to;st.d=0;}
    if(!st.d&&Math.abs(st.x-want)>30*sc&&!stepping(other)){st.from=st.x;st.to=want+(want>st.x?1:-1)*8*sc;st.t0=now;st.d=130/psSpeed();}
    let fx=st.x,lift=0;
    if(st.d){const u=Math.min(1,(now-st.t0)/st.d);fx=st.from+(st.to-st.from)*psEase(u);lift=Math.sin(u*Math.PI)*12;}
    const ox=(fx-X)/(fc*sc),hip=g.H,tx=ox-hip[0],ty=g[foot][1]-lift-hip[1],d0=Math.hypot(tx,ty)||1,d=Math.min(90,d0),ux=tx/d0,uy=ty/d0;
    const half=d/2,h=Math.sqrt(Math.max(0,46*46-half*half)),kx=hip[0]+ux*half,ky=hip[1]+uy*half;
    const c1=[kx-uy*h,ky+ux*h],c2=[kx+uy*h,ky-ux*h],k0=g[knee];
    g[knee]=Math.hypot(c1[0]-k0[0],c1[1]-k0[1])<Math.hypot(c2[0]-k0[0],c2[1]-k0[1])?c1:c2;
    g[foot]=[hip[0]+ux*d,hip[1]+uy*d];
  }
}
// Draw one fighter from its current pose (cur) and look.
function psDraw(f,now){
  const L=f.look;if(!L)return;
  if(f.forceLimp)L.limp[f.forceLimp]=true;
  if(PS_MOTION&&PS.M[f.id]){psDrawMotion(f,L,now);return;}
  const mo=psMomentum(f,now),c=mo?Object.fromEntries(PS_KEYS.map(k=>[k,f.cur[k]+mo[k]])):f.cur,down=L.prone||f.end==='ko';
  const br=!down&&!f.anim&&!f.holdPose&&!f.exPose&&!f.pressRole?Math.sin(now/480+(f.id==='b'?1.7:0)):0;
  const pose={...c,t:c.t+br*1.6,a1:c.a1+br*2,w:c.w+br*2};
  if(f.pressRole==='press'&&!f.anim)pose.w+=Math.sin(now/230)*6;   // a threat, never a resolved blow
  if(f.pressRole==='cover'&&!f.anim)pose.t+=Math.sin(now/340)*2;
  // anatomy: a disabled arm hangs limp (the engine says so)
  const wLimp=L.swap?L.limp.larm:L.limp.rarm,oLimp=L.swap?L.limp.rarm:L.limp.larm;
  if(wLimp){pose.a1=6+Math.sin(now/650)*3;pose.a2=5;}
  if(oLimp){pose.ba1=-6+Math.sin(now/700)*3;pose.ba2=-4;}
  const g=pitsStageGeom(pose,L.wk,L.swap);
  psPlantFeet(f,g,pose,L,now);
  psPaint(f,L,g,pose.w,c.dx,c.lift,pose,now);
}
// The movement language (pits-motion.js): the figure is a function of the stage clock. Its joints are measured with y up
// from the floor; the drawing below has y down, and its weapon angle is measured from straight down.
function psDrawMotion(f,L,now){
  const m=PS.M[f.id],wLimp=L.swap?L.limp.larm:L.limp.rarm,oLimp=L.swap?L.limp.rarm:L.limp.larm;
  const j=PitsMotion.LIVE.pose(m,PS.clock,{weapon:wLimp,off:oLimp}),q=p=>[p[0],-p[1]];
  const g={Sh:q(j.S),M:q(j.M),H:q(j.P),hd:q(j.Hd),E:q(j.E),Hn:q(j.Hn),bE:q(j.oE),bHn:q(j.oHn),K:q(j.K),bK:q(j.bK),F:q(j.F),bF:q(j.bF)};
  f.scale=1;f.hx=m.hx;
  // the shadow lifts with the hips when the figure is on the floor
  psPaint(f,L,g,j.w+90,0,Math.max(0,Math.min(40,(70-j.P[1])*.5)),null,now,j.blen);
}
function psPaint(f,L,g,w1,dx,lift,pose,now,blen){
  const e=f.e,c={dx,lift};
  const ln=(el,a,b)=>{el.setAttribute('x1',a[0]);el.setAttribute('y1',a[1]);el.setAttribute('x2',b[0]);el.setAttribute('y2',b[1]);};
  ln(e.chest,g.Sh,g.M);ln(e.abdomen,g.M,g.H);
  e.head.setAttribute('cx',g.hd[0]);e.head.setAttribute('cy',g.hd[1]);
  e.rleg.setAttribute('points',psPts([g.H,g.K,g.F]));e.lleg.setAttribute('points',psPts([g.H,g.bK,g.bF]));
  // the weapon arm draws as 'rarm' unless the engine's weapon hand is the left
  const frontArm=L.swap?'larm':'rarm',backArm=L.swap?'rarm':'larm';
  e[frontArm].setAttribute('points',psPts([g.Sh,g.E,g.Hn]));e[backArm].setAttribute('points',psPts([g.Sh,g.bE,g.bHn]));
  for(const key of Object.keys(L.parts)){
    const cls='ps-part ps-w-'+L.parts[key]+(f.flash===key&&now<f.flashUntil?' ps-flash':'');
    if(f.classes[key]!==cls){f.classes[key]=cls;e[key].setAttribute('class',cls);}
  }
  const oLimp=L.swap?L.limp.rarm:L.limp.larm;
  e.shield.style.display=L.shield&&!oLimp?'':'none';
  if(L.shield){e.shield.setAttribute('cx',g.bHn[0]);e.shield.setAttribute('cy',g.bHn[1]);}
  const hand=g.Hn;let tip=hand;
  const show=L.armed&&!f.dropping;
  for(const k of ['shaft','guard','knob','wh','wh2','wire'])e[k].style.display='none';
  if(show){
    const kind=L.wk.kind,len=blen||L.wk.len;tip=psAdd(hand,psDir(w1,len));
    const perp=psDir(w1+90,1),at=(d)=>psAdd(hand,psDir(w1,d));
    e.shaft.style.display='';e.shaft.setAttribute('class','ps-shaft'+(L.wk.thin?' thin':''));
    if(kind==='blade'){
      ln(e.shaft,hand,tip);const g1=at(10);
      ln(e.guard,[g1[0]-perp[0]*9,g1[1]-perp[1]*9],[g1[0]+perp[0]*9,g1[1]+perp[1]*9]);e.guard.style.display='';
    }else if(kind==='spear'||kind==='trident'||kind==='polearm'){
      ln(e.shaft,at(-36),tip);e.shaft.setAttribute('class','ps-shaft ps-wood');
      const a=psAdd(tip,psDir(w1,kind==='polearm'?20:24));
      e.wh.setAttribute('points',psPts([a,[tip[0]+perp[0]*6,tip[1]+perp[1]*6],[tip[0]-perp[0]*6,tip[1]-perp[1]*6]]));e.wh.style.display='';
      if(kind==='trident'){const p1=at(len-26),p2=psAdd(p1,psDir(w1,26));
        e.guard.setAttribute('class','ps-guard');ln(e.guard,[p1[0]-perp[0]*9,p1[1]-perp[1]*9],[p1[0]+perp[0]*9,p1[1]+perp[1]*9]);e.guard.style.display='';
        e.wh2.setAttribute('points',psPts([psAdd(p2,[-perp[0]*9,-perp[1]*9]),[p1[0]-perp[0]*9,p1[1]-perp[1]*9],[p1[0]-perp[0]*7,p1[1]-perp[1]*7]]));e.wh2.style.display='';}
      if(kind==='polearm'){const a2=psAdd(at(len-26),[perp[0]*18,perp[1]*18]);
        e.wh2.setAttribute('points',psPts([at(len-4),at(len-34),a2]));e.wh2.style.display='';}
    }else if(kind==='staff'){ln(e.shaft,at(-30),at(len-30));e.shaft.setAttribute('class','ps-shaft ps-wood');}
    else if(kind==='axe'){
      ln(e.shaft,hand,tip);e.shaft.setAttribute('class','ps-shaft ps-wood');
      const a=at(len-4);e.wh.setAttribute('points',psPts([a,[a[0]+perp[0]*20,a[1]+perp[1]*20],at(len-26)]));e.wh.style.display='';
    }else if(kind==='club'||kind==='pick'){
      ln(e.shaft,hand,tip);e.shaft.setAttribute('class','ps-shaft ps-wood');
      if(kind==='club'){e.knob.setAttribute('cx',tip[0]);e.knob.setAttribute('cy',tip[1]);e.knob.setAttribute('r',len>100?13:9);e.knob.style.display='';}
      else{e.wh.setAttribute('points',psPts([psAdd(tip,psDir(w1,12)),[tip[0]+perp[0]*8,tip[1]+perp[1]*8],[tip[0]-perp[0]*8,tip[1]-perp[1]*8]]));e.wh.style.display='';}
    }else if(kind==='chain'||kind==='whip'||kind==='net'){
      // flexible weapons: a short handle and a hanging, swinging end
      const sw=Math.sin(now/260+(f.id==='b'?2:0))*(f.anim||PS_MOTION?0:8),hl=kind==='net'?26:30;
      const h2=at(hl);ln(e.shaft,hand,h2);e.shaft.setAttribute('class','ps-shaft ps-wood');
      const end=psAdd(h2,psDir(w1+sw,len-hl)),mid=psAdd(h2,psDir(w1-sw*1.6,(len-hl)/2));
      e.wire.setAttribute('points',psPts([h2,mid,end]));e.wire.style.display='';tip=end;
      if(kind==='chain'){e.knob.setAttribute('cx',end[0]);e.knob.setAttribute('cy',end[1]);e.knob.setAttribute('r',9);e.knob.style.display='';}
      if(kind==='net'){e.knob.setAttribute('cx',end[0]);e.knob.setAttribute('cy',end[1]);e.knob.setAttribute('r',24);e.knob.setAttribute('class','ps-knob ps-net');e.knob.style.display='';}
    }
  }
  const X=f.hx+f.face*c.dx*f.scale;f.X=X;
  f.pts={...g,tip,hand,pose:pose||{w:w1,dx,lift}};
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
  if(f.endPose)return f.endPose;       // a collapse or a yield from the finishing contact stays where it ended
  if(f.exPose)return f.exPose;         // mid-exchange: hold the windup or guard until the blow resolves
  if(f.pressRole==='press')return PS_POSE.press;   // Press Advantage lasts exactly as long as the engine says it does
  if(f.pressRole==='cover')return PS_POSE.cover;
  if(f.holdPose)return f.holdPose;
  return f.look&&f.look.prone?PS_POSE.prone:PS_POSE.idle;
}
const psWorld=(f,p)=>[f.X+f.face*f.scale*p[0],PS_GROUND+f.scale*p[1]];
// world point -> a fighter's own frame measured from its standing point hx
const psLocal=(f,w)=>[f.face*(w[0]-f.hx)/f.scale,(w[1]-PS_GROUND)/f.scale];
// A body part of fighter f as it stands at rest (not mid-animation), in world coordinates.
function psPartRest(f,loc){
  const g=pitsStageGeom(psRest(f),f.look.wk,f.look.swap);
  const p=pitsStagePart(g,loc),dx=psRest(f).dx||0;
  return [f.hx+f.face*f.scale*(dx+p[0]),PS_GROUND+f.scale*p[1]];
}
// While a person is deciding or rolling, the scene is paused as one: figures, trails, particles and camera stay exactly
// where they are (the interface and the dice stay live). It resumes from the same physical moment.
function psSetPaused(on){
  if(!!on===PS.paused)return;PS.paused=!!on;
  try{for(const a of document.getAnimations()){
    const t=a.effect&&a.effect.target;if(!t||!t.closest)continue;
    // text overlays (banner, numbers) keep finishing
    if(t.closest('.ps-fx,.ps-ghost,.ps-scene')||t.classList.contains('ps-stage')){if(on)a.pause();else a.play();}
  }}catch(e){}
}
const PS_RELAX=1600;   // a real lull (nothing moving for this long) lets a figure ease back to its ready stance
function psFrame(now){
  if(!PS.ready)return;
  if(PS.freeze){PS.raf=requestAnimationFrame(psFrame);return;}
  const dt=PS.lastFrame?Math.min(100,now-PS.lastFrame):0;PS.lastFrame=now;
  const stopped=PS.stopUntil&&now<PS.stopUntil;   // hit-stop: a few frames of stillness at contact
  if(PS_MOTION){
    // one clock for the whole bout: a decision stops it, a contact holds it for a moment, nothing else moves the picture
    if(!PS.paused&&!stopped)PS.clock+=dt*psSpeed();
    if(!PS.paused)psLull();
    for(const id of ['a','b'])if(PS.fig[id])psDraw(PS.fig[id],now);
    psDrawLodged(now);PS.raf=requestAnimationFrame(psFrame);return;
  }
  for(const id of ['a','b']){
    const f=PS.fig[id];if(!f)continue;
    if(PS.paused||stopped){
      // time stands still: nothing advances and nothing drifts (a paused picture is not redrawn at all)
      if(f.anim)f.anim.t0+=dt;if(f.slide)f.slide.t0+=dt;if(f.relaxAt)f.relaxAt+=dt;if(f.mom)f.mom.t0+=dt;
      if(!PS.paused)psDraw(f,now);continue;
    }
    const before={...f.cur};
    if(f.slide){const s=f.slide,p=Math.min(1,(now-s.t0)/s.d);f.hx=s.a+(s.b-s.a)*psEase(p);if(p>=1)f.slide=null;}
    if(f.anim){
      const a=f.anim,s=a.steps[a.i];const p=s.d>0?(now-a.t0)/s.d:1;
      if(p>=1){f.cur={...s.to};a.i++;
        if(a.i>=a.steps.length){f.anim=null;f.trailOn=false;f.relaxAt=now+PS_RELAX/psSpeed();const r=f.done;f.done=null;if(r)r();}
        else{a.from={...f.cur};a.t0=now;f.trailOn=!!a.steps[a.i].trail;}
      }else{for(const key of PS_KEYS)f.cur[key]=a.from[key]+(s.to[key]-a.from[key])*psKey(key,Math.max(0,p),s.ease);}
    }else{
      // no motion playing: hold the last pose through a lull instead of snapping back to a common stance
      const lull=f.relaxAt&&now<f.relaxAt,duringDice=typeof V!=='undefined'&&V.busy&&V.roll;
      const tg=psRest(f);
      if(!lull&&!duringDice||tg===f.exPose||f.end||f.endPose){const k=psReduced()?1:.16;for(const key of PS_KEYS)f.cur[key]+=(tg[key]-f.cur[key])*k;}
    }
    // speed of each joint, for the next motion to inherit
    f.vel=f.vel||{};if(dt>0)for(const key of PS_KEYS){const v=(f.cur[key]-before[key])/dt;f.vel[key]=(f.vel[key]||0)*.5+v*.5;}
    psDraw(f,now);
  }
  psDrawLodged(now);
  PS.raf=requestAnimationFrame(psFrame);
}
// psPlay(f,[pose,ms,{trail,out}],[pose,ms],...): one or more frames in order; resolves when
// the sequence ends (or is replaced). pose is a PS_POSE name or a pose object.
function psPlay(f,...frames){
  return new Promise(res=>{
    if(f.done){const r=f.done;f.done=null;r();}
    const sp=psSpeed(),rd=psReduced();
    const steps=frames.map(([pose,d,o])=>{o=o||{};
      const to=typeof pose==='string'?{...PS_POSE[pose]}:{...PS_IDLE,...pose};
      if(typeof pose==='string'&&o.dx!=null)to.dx=o.dx;
      return {to,d:rd?0:d/sp,trail:!!o.trail,ease:o.acc?psEaseAcc:o.out?psEaseOut:psEase};});
    // carry the speed of the motion this one replaces (position is continuous already: it starts from where the figure is)
    if(f.vel&&!psReduced()){const v={};let any=false;for(const key of PS_KEYS){const x=Math.max(-.45,Math.min(.45,f.vel[key]||0));v[key]=x;if(Math.abs(x)>.02)any=true;}
      f.mom=any?{v,t0:performance.now()}:null;}
    f.anim={steps,i:0,t0:performance.now(),from:{...f.cur}};f.relaxAt=0;f.trailOn=steps[0].trail;f.done=res;
  });
}

// ---- Effects ----
function psBodyPt(f,loc){
  const p=f.pts;if(!p)return [f.X||600,PS_GROUND-90];
  return psWorld(f,pitsStagePart(p,loc));
}
function psDom(w,text,cls){
  const box=document.querySelector('#pitsStage .ps-stage');if(!box)return;
  const svg=box.querySelector('svg'),pt=svg.createSVGPoint();pt.x=w[0];pt.y=w[1];
  const s=pt.matrixTransform(svg.getScreenCTM()),r=box.getBoundingClientRect();
  const d=document.createElement('div');d.className='ps-num '+(cls||'');d.textContent=text;
  d.style.left=(s.x-r.left)+'px';d.style.top=(s.y-r.top)+'px';psLayer('ps-nums').appendChild(d);setTimeout(()=>d.remove(),1600);
}
function psBurst(w,kind,n){
  if(psReduced())return;
  const fx=psLayer('ps-fx');n=n||(kind==='blood'?10:8);
  for(let i=0;i<n;i++){
    const c=psSvg('circle',{cx:w[0],cy:w[1],r:2+Math.random()*3,class:'ps-'+kind+' ps-part-fx'},fx);
    const vx=(Math.random()-.5)*120,vy=-30-Math.random()*70;
    c.animate([{transform:'translate(0,0)',opacity:1},{transform:'translate('+vx*.55+'px,'+vy+'px)',opacity:1,offset:.38},
      {transform:'translate('+vx+'px,'+(vy+(kind==='blood'?130:60))+'px)',opacity:0}],
      {duration:(600+Math.random()*350)/psSpeed(),easing:'ease-in'}).onfinish=()=>c.remove();
  }
}
function psRing(w){
  if(psReduced())return;
  const c=psSvg('circle',{cx:w[0],cy:w[1],r:6,class:'ps-ring ps-part-fx'},psLayer('ps-fx'));
  c.animate([{r:6,opacity:1},{r:46,opacity:0}],{duration:420/psSpeed(),easing:'ease-out'}).onfinish=()=>c.remove();
}
function psReticle(w){
  const g=psSvg('g',{class:'ps-reticle ps-part-fx'},psLayer('ps-fx'));
  psSvg('circle',{cx:w[0],cy:w[1],r:20},g);
  [[-30,0,-12,0],[12,0,30,0],[0,-30,0,-12],[0,12,0,30]].forEach(l=>psSvg('line',{x1:w[0]+l[0],y1:w[1]+l[1],x2:w[0]+l[2],y2:w[1]+l[3]},g));
  g.animate([{opacity:0},{opacity:1,offset:.25},{opacity:1},{opacity:0}],{duration:psReduced()?500:900/psSpeed()}).onfinish=()=>g.remove();
}
function psDust(f){
  if(psReduced())return;
  for(let i=0;i<5;i++){const c=psSvg('circle',{cx:f.X+(Math.random()-.5)*50,cy:PS_GROUND-4,r:5+Math.random()*4,class:'ps-dust ps-part-fx'},psLayer('ps-fx'));
    c.animate([{transform:'translate(0,0) scale(.6)',opacity:.5},{transform:'translate('+((Math.random()-.5)*60)+'px,-26px) scale(1.8)',opacity:0}],
      {duration:650/psSpeed(),easing:'ease-out'}).onfinish=()=>c.remove();}
}
function psGhost(f){
  if(psReduced())return;
  const wrap=psSvg('g',{class:'ps-part-fx'},psLayer('ps-ghost')),g=f.g.cloneNode(true);wrap.appendChild(g);
  g.setAttribute('transform',f.g.getAttribute('transform'));wrap.style.opacity=.5;
  wrap.animate([{opacity:.5},{opacity:0}],{duration:500/psSpeed()}).onfinish=()=>wrap.remove();
}
function psShake(){
  if(psReduced())return;const b=psLayer('ps-stage');if(!b)return;
  b.classList.remove('ps-shake');void b.offsetWidth;b.classList.add('ps-shake');
}
// Resolves when the first frame of a figure's current motion is complete (the strike has fully arrived), so contact is
// never timed by a guess.
const psStepDone=f=>new Promise((res,rej)=>{const e=PS.epoch;const tick=()=>{if(e!==PS.epoch)return rej(0);if(!f.anim||f.anim.i>=1)return res();requestAnimationFrame(tick);};tick();});
// A few frames of stillness at contact (the cue waits too), and a brief push-in on the whole scene.
function psHitStop(ms){
  if(psReduced()||!(ms>0))return Promise.resolve();
  PS.stopUntil=performance.now()+ms/psSpeed();return psSleep(ms);
}
function psPunch(power){
  if(psReduced())return;const sc=document.querySelector('#pitsStage .ps-scene');if(!sc||!sc.animate)return;
  const k=1+Math.min(.05,.012+power*.004);
  sc.animate([{transform:'scale(1)'},{transform:'scale('+k+')',offset:.25},{transform:'scale(1)'}],{duration:260/psSpeed(),easing:'ease-out'});
}
function psBanner(text,cls){
  try{if(window.__psRecord)(window.__psBanners=window.__psBanners||[]).push(text);}catch(e){}
  const b=psLayer('ps-banner');if(!b)return;
  b.textContent=text;b.className='ps-banner';void b.offsetWidth;b.className='ps-banner ps-go '+(cls||'');
  b.onanimationend=()=>{b.className='ps-banner';};   // it clears itself, so nothing stale is left once it has played
}
// Remove every transient effect and stop every animation: used on Show results,
// a new bout, leaving the screen and any time the replay is cut short.
function psClearEffects(){
  for(const c of ['ps-fx','ps-ghost']){const g=psLayer(c);if(g)for(const n of [...g.children]){if(n.classList&&(n.classList.contains('ps-part-fx')||n.classList.contains('ps-dropped')||n.classList.contains('ps-tether')))n.remove();}}
  const nums=psLayer('ps-nums');if(nums)nums.innerHTML='';
  const b=psLayer('ps-banner');if(b){b.className='ps-banner';b.textContent='';}
  const st=psLayer('ps-stage');if(st)st.classList.remove('ps-shake');
}
// Snap everything to the authoritative state (no animation).
// keepExchange: an exchange is waiting on a person, so clear the effects but keep the held windup and guard.
function psSettle(keepExchange){
  PS.epoch++;if(!keepExchange)PS.ex=null;
  for(const id of ['a','b']){const f=PS.fig[id];if(!f)continue;
    if(f.done){const r=f.done;f.done=null;r();}
    f.anim=null;f.mom=null;f.vel=null;f.plant=null;f.relaxAt=0;f.endPose=null;f.forceLimp=null;if(!keepExchange)f.exPose=null;f.trailOn=false;f.trailPts=[];f.flash=null;f.dropping=false;f.slide=null;f.hx=f.tx;
    if(f.dropEl&&f.look&&f.look.armed){f.dropEl.remove();f.dropEl=null;}
    f.cur={...psRest(f)};}
  if(PS_MOTION){PS.busyUntil=PS.clock;for(const id of ['a','b']){const f=PS.fig[id];if(!f)continue;f.mEnd=null;if(PS.M[id]&&f.look)psPlaceM(id);}}
  psClearEffects();{const b=psLayer('ps-banner');if(b)b.className='ps-banner';}psEmit('settle',{});
}
// Weapon knocked away or dropped: fly it in an arc, then leave it on the floor
// until the engine says it was picked up again.
function psWeaponShape(parent,wk){
  const len=wk.len,inner=psSvg('g',{transform:'translate('+(-len/2)+',0)'},parent);
  const k=wk.kind;
  if(k==='spear'||k==='trident'||k==='polearm'){psSvg('line',{x1:-36,y1:0,x2:len,y2:0,class:'ps-shaft ps-wood','stroke-width':4},inner);
    psSvg('polygon',{points:(len+24)+',0 '+len+',6 '+len+',-6',class:'ps-head-blade'},inner);}
  else if(k==='blade'){psSvg('line',{x1:0,y1:0,x2:len,y2:0,class:'ps-shaft','stroke-width':4},inner);psSvg('line',{x1:10,y1:-9,x2:10,y2:9,class:'ps-guard','stroke-width':4},inner);}
  else if(k==='axe'){psSvg('line',{x1:0,y1:0,x2:len,y2:0,class:'ps-shaft ps-wood','stroke-width':4},inner);psSvg('polygon',{points:(len-4)+',0 '+(len+2)+',20 '+(len-26)+',0',class:'ps-head-blade'},inner);}
  else if(k==='club'||k==='pick'||k==='chain'){psSvg('line',{x1:0,y1:0,x2:len,y2:0,class:'ps-shaft ps-wood','stroke-width':5},inner);psSvg('circle',{cx:len,cy:0,r:k==='club'&&len>100?13:9,class:'ps-knob'},inner);}
  else psSvg('line',{x1:0,y1:0,x2:len,y2:0,class:'ps-shaft ps-wood','stroke-width':4},inner);
  return inner;
}
function psFlyWeapon(f,metres){
  const from=f.pts?psWorld(f,f.pts.hand):[f.X,PS_GROUND-80];
  const to=[f.X-f.face*Math.max(60,metres*PS_M+50),PS_GROUND+2];
  const g=psSvg('g',{class:'ps-dropped'},psLayer('ps-fx'));psWeaponShape(g,f.look.wk);
  if(f.dropEl)f.dropEl.remove();
  f.dropEl=g;f.dropping=true;
  const t0=performance.now(),d=psReduced()?1:780/psSpeed(),spin=(Math.random()<.5?-1:1)*540,tok=PS.epoch;
  const step=now=>{
    if(!g.isConnected){f.dropping=false;return;}
    const p=Math.min(1,(now-t0)/d),x=from[0]+(to[0]-from[0])*p,y=from[1]+(to[1]-from[1])*p-Math.sin(p*Math.PI)*190;
    g.setAttribute('transform','translate('+x+','+y+') rotate('+(spin*p%360)+')');
    if(p<1)requestAnimationFrame(step);else{g.setAttribute('transform','translate('+to[0]+','+to[1]+') rotate(-4)');f.dropping=false;}
  };
  requestAnimationFrame(step);
}

// ---- Lodged weapons and entanglement: drawn every frame from engine state ----
function psDrawLodged(now){
  const fx=psLayer('ps-fx');if(!fx||!PS.fig.a||!PS.fig.a.look)return;
  const keep=new Set();
  for(const id of ['a','b']){
    const v=PS.fig[id];if(!v||!v.pts)continue;
    for(const w of (PS.fighters.lodged&&PS.fighters.lodged[id])||[]){
      const key='L:'+id+':'+w.loc+':'+w.holder;keep.add(key);
      const holder=PS.fig[w.holder];if(!holder||!holder.pts)continue;
      let el=PS.lodge[key];
      if(!el||!el.isConnected){el=PS.lodge[key]=psSvg('g',{class:'ps-lodged'},fx);psWeaponShape(el,pitsStageWeaponKind(w.weapon,3));}
      const P=psBodyPt(v,w.loc),len=pitsStageWeaponKind(w.weapon,3).len;
      // the weapon points back toward its wielder; if abandoned, out and slightly up
      const H=w.held?holder.pts&&psWorld(holder,holder.pts.hand):[P[0]+(holder.X>v.X?1:-1)*len,P[1]-len*.35];
      const ang=Math.atan2(H[1]-P[1],H[0]-P[0]);
      el.setAttribute('transform','translate('+(P[0]+Math.cos(ang)*len/2)+','+(P[1]+Math.sin(ang)*len/2)+') rotate('+psDeg(ang)+')');
    }
    const t=PS.fighters.tether&&PS.fighters.tether[id];
    if(t){
      const key='T:'+id;keep.add(key);const holder=PS.fig[t.by];if(!holder||!holder.pts)continue;
      let el=PS.tether[key];if(!el||!el.isConnected)el=PS.tether[key]=psSvg('path',{class:'ps-tether',fill:'none'},fx);
      const A=psWorld(holder,holder.pts.tip),B=psBodyPt(v,t.loc),sag=18+Math.sin(now/300)*3;
      el.setAttribute('d','M'+A[0]+','+A[1]+' Q'+(A[0]+B[0])/2+','+((A[1]+B[1])/2+sag)+' '+B[0]+','+B[1]);
    }
  }
  for(const reg of [PS.lodge,PS.tether])for(const k of Object.keys(reg)){if(!keep.has(k)){reg[k].remove();delete reg[k];}}
}
// When a wielder still holds a lodged weapon, keep their arm reaching into the wound.
function psHoldLodged(){
  for(const id of ['a','b']){
    const f=PS.fig[id];f.holdPose=null;
    for(const [vid,list] of Object.entries(PS.fighters.lodged||{}))for(const w of list){
      if(w.holder!==id||!w.held)continue;
      const v=PS.fig[vid];if(!v||!v.look||!f.look)continue;
      const T=psLocal(f,psPartRest(v,w.loc)),aim=pitsStageAim(PS_POSE.lunge,f.look.wk,f.look.swap,T,{pen:4,maxDx:240});
      f.holdPose=aim.pose;
    }
  }
}

function psReleaseExchange(){for(const f of psFigs())if(f)f.exPose=null;}
const psExchangeHeld=()=>psFigs().some(f=>f&&f.exPose);
// ---- One cue -> one scripted beat ----
const psOther=f=>PS.fig[f.id==='a'?'b':'a'];
// The target point of a strike in the attacker's frame, from the defender's body part.
function psStrikeTarget(atk,def,loc){return psLocal(atk,psPartRest(def,loc||'chest'));}
// Where a blow is stopped: in front of the struck part, along the line of the strike,
// within what the defender's guard can actually reach.
function psContactPoint(atk,def,loc,tool){
  const T=psPartRest(def,loc||'chest'),Sa=psWorld(atk,[atk.pts?atk.pts.Sh[0]:0,atk.pts?atk.pts.Sh[1]:-70]);
  const Sd=psWorld(def,[def.pts?def.pts.Sh[0]:0,def.pts?def.pts.Sh[1]:-70]);
  const ux=Sa[0]-T[0],uy=Sa[1]-T[1],ul=Math.hypot(ux,uy)||1;
  const R=tool==='shield'?62:62+def.look.wk.len;
  const k=Math.max(18,Math.min(64,R-14-Math.hypot(T[0]-Sd[0],T[1]-Sd[1])));
  return [T[0]+ux/ul*k,T[1]+uy/ul*k];
}
// The defender's guard raised so the weapon (or shield) meets point C.
function psGuardAt(def,C,tool){
  const local=psLocal(def,C),shield=tool==='shield'&&def.look.shield;
  const aim=pitsStageAim(PS_POSE.guard,def.look.wk,def.look.swap,local,shield?{arm:'off',pen:0,maxDx:60,minDx:-20,shieldR:14}:{pen:0,maxDx:60,minDx:-20});
  return aim.pose;
}
// A strike posed at a target, with windup matching the weapon (cut or thrust).
function psStrikePose(atk,target,opts){
  const aim=pitsStageAim(PS_POSE.lunge,atk.look.wk,atk.look.swap,target,{arm:opts&&opts.arm,pen:opts&&opts.pen,shieldR:16});
  return aim;
}
const psThrust=k=>/^(spear|trident|polearm|staff|whip|net|chain)$/.test(k);
const psWindupFor=wk=>psThrust(wk.kind)||wk.thin?PS_POSE.cock:PS_POSE.windup;

const psReplaying=()=>typeof V!=='undefined'&&!!V.replaying;

async function psRunCue(cue){
  if(PS_MOTION&&PS.M.a&&PS.M.b)return psMotionCue(cue);
  const me=PS.fig[cue.actor]||null,tgt=PS.fig[cue.target]||null;
  // An exchange is one motion: the attacker stays wound up and the defender stays in guard
  // (exPose) through the dice and choices, and the blow releases from there. Anything that
  // is not part of that build-up lets go of the held poses.
  if(cue.type==='attack'||!['parry','evade','locate','hit','deflect'].includes(cue.type))psReleaseExchange();
  try{
    if(cue.type==='attack'&&me){
      PS.ex={exid:cue.exid,atk:me.id,aGrade:cue.grade==='fumble'?0:cue.grade==='failure'?1:cue.grade==='success'?2:3,shield:cue.shield,react:'none',reactGrade:null,reactTool:'weapon'};
      const shield=cue.shield&&me.look.shield;
      me.exPose=shield?PS_POSE.guard:psWindupFor(me.look.wk);psPlay(me,[me.exPose,230]);
      // the roll stage: a critical here is a critical ATTACK, not yet a hit
      if(cue.grade==='critical')psBanner('Critical attack','crit');
      else if(cue.grade==='fumble')psBanner('Fumble','bad');
      psEmit('attack',{actor:me.id,grade:cue.grade});await psSleep(300);
    }else if(cue.type==='parry'&&me){
      if(PS.ex){PS.ex.react='parry';PS.ex.reactGrade=cue.grade==='fumble'?0:cue.grade==='failure'?1:cue.grade==='success'?2:3;PS.ex.reactTool=cue.shield?'shield':'weapon';}
      me.exPose=PS_POSE.guard;psPlay(me,[PS_POSE.guard,200]);psEmit('guard',{actor:me.id,grade:cue.grade});await psSleep(260);
    }else if(cue.type==='evade'&&me){
      if(PS.ex){PS.ex.react='evade';PS.ex.reactGrade=cue.grade==='fumble'?0:cue.grade==='failure'?1:cue.grade==='success'?2:3;}
      me.exPose=PS_POSE.brace;psPlay(me,[PS_POSE.brace,200]);psEmit('brace',{actor:me.id,grade:cue.grade});await psSleep(260);
    }else if(cue.type==='locate'&&tgt){
      const w=psBodyPt(tgt,cue.loc);psReticle(w);
      if(cue.chosen)psDom(psWorld(tgt,tgt.pts?tgt.pts.hd:[0,-120]),'Chosen: '+(PSTAGE_LOCNAME[cue.loc]||''),'fx');
      psEmit('locate',{target:tgt.id,loc:cue.loc,point:w.map(Math.round)});await psSleep(420);
    }else if(cue.type==='hit'||cue.type==='deflect'){
      await psResolveBlow(cue);psReleaseExchange();
    }else if(cue.type==='trip'&&tgt&&me){
      psDom(psWorld(me,me.pts?me.pts.Sh:[0,-60]),'Trip Opponent','fx');
      const aim=psStrikePose(me,psLocal(me,psPartRest(tgt,'rleg')),{});
      psPlay(me,[psWindupFor(me.look.wk),130],[aim.pose,150,{acc:true}]);
      if(cue.fell){
        await psSleep(150);psEmit('contact',{kind:'trip',actor:me.id,target:tgt.id,point:psBodyPt(tgt,'rleg').map(Math.round)});
        {const leg=psBodyPt(tgt,'rleg');psBurst(leg,'spark',10);psRing(leg);}
        await psHitStop(60);
        await psPlay(tgt,[PS_POSE.trip,220,{out:true}],[PS_POSE.prone,300]);
        psDust(tgt);psShake();psPunch(4);psSfx('hit');psBanner('Tripped','crit');psDom(psWorld(tgt,tgt.pts.hd),'Tripped!','fx');
      }else{psPlay(tgt,[PS_POSE.crouch,200],[PS_POSE.idle,220]);psDom(psWorld(tgt,tgt.pts.Sh),'Stays up','blk');}
      await psSleep(500);
    }else if(cue.type==='disarm'&&tgt&&me){
      const hand=tgt.pts?psWorld(tgt,tgt.pts.hand):psBodyPt(tgt,'rarm');
      const aim=psStrikePose(me,psLocal(me,hand),{});
      psPlay(me,[psWindupFor(me.look.wk),130],[aim.pose,110,{trail:true,acc:true}]);await psSleep(240);
      psEmit('contact',{kind:'disarm',actor:me.id,target:tgt.id,point:hand.map(Math.round)});
      psBurst(hand,'spark',14);psRing(hand);psShake();psSfx('pick');
      await psHitStop(70);psPunch(5);
      psPlay(tgt,[PS_POSE.flinch,140]);
      psBanner('Disarmed','crit');psFlyWeapon(tgt,cue.metres);
      await psSleep(600);
    }else if(cue.type==='stand'&&me){
      await psPlay(me,[PS_POSE.crouch,220]);psDust(me);await psPlay(me,[PS_POSE.idle,220]);
    }else if(cue.type==='wound'||cue.type==='limb'){
      if(cue.type==='wound')psBanner(cue.level==='major'?'Major wound':'Serious wound','red');
      else psBanner(cue.leg?'Legs gone':'Useless arm','red');
      psSfx('crit');await psSleep(500);
    }else if(cue.type==='lodge'&&me){
      psBanner('Weapon lodged','red');psSfx('crit');psEmit('lodge',{actor:me.id});await psSleep(500);
    }else if(cue.type==='press'&&me&&tgt){
      await psPressFinish(me,tgt,{record:{press:cue}});
    }else if(cue.type==='drop'&&me){
      if(!me.dropEl&&me.look&&!me.look.armed)psFlyWeapon(me,0);await psSleep(300);
    }else if(cue.type==='end'){
      // Only what the engine's own wording says. A concession is a yield; an injury or exhaustion with no finishing contact is a
      // collapse straight from where the figure stands. Nothing is inferred about severing or death.
      const won=cue.winner==='a';
      psBanner(cue.winner?(won?'Victory':'Defeated'):'Draw',won?'vd':'bad');psSfx('crit');
      const lo=cue.winner&&PS.fig[cue.winner==='a'?'b':'a'],wi=cue.winner&&PS.fig[cue.winner];
      if(lo){
        if(cue.how==='concede'){lo.endPose=PS_POSE.yield;psEmit('yield',{target:lo.id});await psPlay(lo,[PS_POSE.yield,480]);}
        else{lo.endPose=PS_POSE.ko;await psPlay(lo,[PS_POSE.ko,520]);}
      }
      if(wi){wi.endPose=PS_POSE.win;psPlay(wi,[PS_POSE.win,360]);}
      await psSleep(420);
    }
  }catch(e){/* a newer cue took over (it rejects with 0): fine. Anything else is a real error: record it for the tests */
    if(e!==0)psEmit('cue-error',{cue:cue.type,message:String(e&&e.message||e)});}
}

// The single strike of an exchange, once its result is known: anticipation was
// the windup, now contact (or avoidance), then the consequence, then settle.
async function psResolveBlow(cue){
  const ex=PS.ex||{},px=cue.px||{};
  const atkId=cue.actor||ex.atk||(cue.target?(cue.target==='a'?'b':'a'):null);
  const atk=PS.fig[atkId],def=atk&&psOther(atk);if(!atk||!def||!atk.pts||!def.pts)return;
  atk.exPose=null;                          // the strike releases from the windup; the defender keeps their guard until it lands
  if(!def.anim)def.cur={...psRest(def)};   // the defender is where the engine says they are before we aim at them
  const out=pitsStageOutcome(cue,ex),tool=(px.tool||(ex.shield?'shield':'weapon')),shield=tool==='shield'&&atk.look.shield;
  const loc=cue.loc||'chest',reactTool=px.reactTool||ex.reactTool||'weapon';
  const armKind=shield?'off':'weapon';
  const T=psStrikeTarget(atk,def,loc);
  const lift=out==='wound'||out==='partial-parry'||out==='partial-ward'||out==='armour'||out==='zero';
  psEmit('resolve',{outcome:out,loc,lost:cue.lost||0,actor:atk.id,target:def.id,px});
  // --- avoided: evade, a miss or a fumble ---
  if(out==='evaded'){
    // the engine puts an evader prone; the strike goes through where they were
    const aim=pitsStageAim(PS_POSE.lunge,atk.look.wk,atk.look.swap,T,{arm:armKind,pen:-10});
    psGhost(def);psPlay(atk,[aim.pose,130,{trail:true,acc:true}],[PS_POSE.whiff,170],[psReady(),260]);
    psPlay(def,[PS_POSE.evade,170,{out:true}]);psSfx('miss');psDust(def);
    await psStepDone(atk);psEmit('contact',{kind:'evaded',actor:atk.id,target:def.id,point:aim.tip.map(Math.round)});
    psBurst(aim.tip,'gray',6);psRing(aim.tip);
    psDom(psWorld(def,def.pts.Sh),'Evaded','blk');await psSleep(psReplaying()?300:420);
    psPlay(def,[def.look&&def.look.prone?PS_POSE.prone:psReady(),300]);   // the engine puts an evader prone; otherwise a ready stance, not idle
    return;
  }
  if(out==='miss'||out==='fumble'){
    // well wide of the body: over the shoulder (miss) or off balance (fumble)
    const wide=[T[0]+(out==='fumble'?-30:12),T[1]-(out==='fumble'?10:46)];
    const aim=pitsStageAim(PS_POSE.lunge,atk.look.wk,atk.look.swap,wide,{arm:armKind,pen:0});
    psPlay(atk,[aim.pose,130,{trail:true,acc:true}],[out==='fumble'?PS_POSE.whiff:psReady(),260]);
    psSfx('miss');await psStepDone(atk);psEmit('contact',{kind:out,actor:atk.id,target:def.id,point:aim.tip.map(Math.round)});
    psBurst(aim.tip,'gray',5);
    psDom(psWorld(atk,atk.pts.tip),out==='fumble'?'Fumble!':'Miss','miss');await psSleep(psReplaying()?300:420);
    return;
  }
  // --- contact with the defender's weapon or shield ---
  const parried=out==='parried'||out==='full-parry'||out==='full-ward'||out==='partial-parry'||out==='partial-ward';
  let C=null;
  if(parried){
    C=psContactPoint(atk,def,loc,out.endsWith('ward')?'shield':reactTool);
    psPlay(def,[psGuardAt(def,C,out.endsWith('ward')?'shield':reactTool),110,{out:true}]);
  }
  if(out==='parried'||out==='full-parry'||out==='full-ward'){
    // stopped at the guard: contact away from the body, then recoil
    const aim=pitsStageAim(PS_POSE.lunge,atk.look.wk,atk.look.swap,psLocal(atk,C),{arm:armKind,pen:0});
    psPlay(atk,[aim.pose,130,{trail:true,acc:true}]);await psStepDone(atk);
    psEmit('contact',{kind:out,actor:atk.id,target:def.id,point:C.map(Math.round),tip:psWorld(atk,atk.pts.tip).map(Math.round)});
    psBurst(C,'spark',16);psRing(C);psShake();psSfx('pick');psDom(C,out.endsWith('ward')?'Shield ward':'Parried','blk');
    psPlay(atk,[PS_POSE.recoil,160],[psReady(),300]);
    if(cue.type==='hit'&&px.blocked)psDom([C[0],C[1]+26],'−'+px.blocked,'blk');
    await psSleep(psReplaying()?380:520);await psPressFinish(atk,def,cue);return;
  }
  if(out==='partial-parry'||out==='partial-ward'){
    // stopped for a moment at the guard, then the rest drives through to the body
    const a1=pitsStageAim(PS_POSE.lunge,atk.look.wk,atk.look.swap,psLocal(atk,C),{arm:armKind,pen:0});
    psPlay(atk,[a1.pose,110,{trail:true,acc:true}]);await psStepDone(atk);
    psEmit('contact',{kind:'deflect',actor:atk.id,target:def.id,point:C.map(Math.round)});
    psBurst(C,'spark',12);psRing(C);psSfx('pick');psDom(C,(out.endsWith('ward')?'Ward':'Parry')+' −'+px.blocked,'blk');await psSleep(130);
  }
  // --- contact with the body part ---
  const a2=pitsStageAim(PS_POSE.lunge,atk.look.wk,atk.look.swap,T,{arm:armKind});
  // a failed parry: the guard is beaten aside as the blow goes through it (not the same picture as no defence at all)
  const failedParry=!parried&&ex.react==='parry'&&ex.reactGrade!=null&&ex.reactGrade<2;
  if(failedParry){const beaten={...PS_POSE.guard,w:PS_POSE.guard.w+52,a1:PS_POSE.guard.a1+22,t:8};psPlay(def,[beaten,95,{out:true}]);psSfx('miss');}
  if(!parried)psPlay(atk,[a2.pose,130,{trail:true,acc:true}]);else psPlay(atk,[a2.pose,120,{out:true}]);
  await psStepDone(atk);
  const w2=psBodyPt(def,loc);
  def.flash=cue.lost>0?loc:null;def.flashUntil=performance.now()+900;
  psEmit('contact',{kind:out,actor:atk.id,target:def.id,loc,point:w2.map(Math.round),tip:psWorld(atk,atk.pts.tip).map(Math.round),lost:cue.lost||0});
  if(cue.lost>0){
    psBurst(w2,'spark',10);psRing(w2);psShake();psBurst(w2,'blood',10+cue.lost*2);
    psDom(w2,'−'+cue.lost,'dmg');psSfx(cue.lost>=6?'crit':'hit');
    if(px.armour>0)psDom([w2[0],w2[1]+28],'Armour −'+px.armour,'blk');
    await psHitStop(45+Math.min(70,cue.lost*9));psPunch(cue.lost);
    // a harder blow throws the defender back further
    const rc={...PS_POSE.hit,dx:PS_POSE.hit.dx-Math.min(42,cue.lost*5)};
    // The finishing consequences come from the engine's resolved record, and flow directly from the contact.
    const after=(cue.record&&cue.record.after)||[],endC=after.find(c=>c.type==='end'),limbC=after.find(c=>c.type==='limb'),dropC=after.find(c=>c.type==='drop');
    const defeated=!!endC&&endC.winner===atk.id&&endC.how==='injury';
    if(limbC&&limbC.loc&&limbC.loc!=='leg'){
      const arm=limbC.loc==='larm'||limbC.loc==='rarm'?limbC.loc:null;
      if(arm){def.forceLimp=arm;       // a disabled arm hangs limp; a dropped weapon leaves the hand at the blow
        if(dropC&&!def.dropEl){psSleep(60).then(()=>{if(!def.dropEl)psFlyWeapon(def,0);}).catch(()=>{});}}
    }
    if(defeated){
      const leg=limbC&&(limbC.leg||/leg/.test(limbC.loc||''));
      psPlay(def,[rc,100,{out:true}],...(leg?[[limbC.loc==='rleg'?PS_POSE.buckleR:PS_POSE.buckleL,150]]:[]),[PS_POSE.ko,420]);
      def.endPose=PS_POSE.ko;psEmit('collapse',{target:def.id,actor:atk.id,how:endC.how});
      await psSleep(psReplaying()?330:420);
      const won=endC.winner==='a';psBanner(won?'Victory':'Defeated',won?'vd':'bad');psSfx('crit');
      atk.endPose=PS_POSE.win;psPlay(atk,[PS_POSE.win,360]);await psSleep(380);return;
    }
    if(limbC&&(limbC.leg||/leg/.test(limbC.loc||''))){
      // the leg gives way, and the engine puts them down
      psPlay(def,[rc,100,{out:true}],[limbC.loc==='rleg'?PS_POSE.buckleR:PS_POSE.buckleL,200],[PS_POSE.prone,240]);
      await psSleep(psReplaying()?420:540);await psPressFinish(atk,def,cue);return;
    }
    psPlay(def,[rc,110,{out:true}],[rc,170]);
  }else{
    // armour, or nothing got through: neutral feedback, no injury, no flinch
    psBurst(w2,'gray',8);psRing(w2);psSfx('pick');
    psDom(w2,out==='armour'?'Armour −'+px.armour:'No damage','blk');
    psPlay(def,[PS_POSE.stagger,100]);
  }
  await psSleep(psReplaying()?260:380);
  // the strike recovers toward a ready stance (not idle); the defender rides the blow out until their own action
  psPlay(atk,[psReady(),300]);
  await psPressFinish(atk,def,cue);
  if(!psReplaying())await psSleep(240);
}
// Press Advantage, paired: the aggressor carries the attack through (weapon up and forward, leaning in), the opponent covers
// up and shifts their weight back. A small coordinated advance and yield, within the engagement distance; no contact, no
// damage, no extra attack. The relationship holds while the engine says the effect is active (see psRest), then releases.
async function psPressFinish(atk,def,cue){
  const rec=cue&&cue.record;if(!rec||!rec.press)return;
  psPlay(atk,[PS_POSE.press,240,{out:true}]);psPlay(def,[PS_POSE.cover,260,{out:true}]);
  psDom(psWorld(atk,atk.pts?atk.pts.Sh:[0,-60]),'Press Advantage','fx');psEmit('press',{actor:atk.id,target:def.id});
  await psSleep(300);
}

// ---- The movement language: one exchange is one timeline for both fighters (pits-motion.js) ----
// Each cue writes phrases from the stage clock, starting from the pose the figure is in. The effects (sparks, numbers,
// sound, the plates) wait for the clock to reach the contact the phrase was written against.
const PL=()=>PitsMotion.LIVE;
// the point of a fighter's drawn weapon nearest to a world point (where the blades actually met)
function psOnBlade(f,w){
  if(!f.pts)return w;const a=psWorld(f,f.pts.hand),b=psWorld(f,f.pts.tip),vx=b[0]-a[0],vy=b[1]-a[1];
  const u=Math.max(0,Math.min(1,((w[0]-a[0])*vx+(w[1]-a[1])*vy)/((vx*vx+vy*vy)||1)));return [a[0]+vx*u,a[1]+vy*u];
}
const psW=p=>[p[0],PS_GROUND-p[1]];          // the rig's world (y up from the floor) -> the stage's (y down)
function psUntil(t){
  const e=PS.epoch;
  if(psReduced()){PS.clock=Math.max(PS.clock,t);return Promise.resolve();}
  return new Promise((res,rej)=>{const tick=()=>{if(e!==PS.epoch)return rej(0);if(PS.clock>=t)return res();requestAnimationFrame(tick);};tick();});
}
const psHurt=f=>!!f.look&&Object.values(f.look.parts).some(v=>v&&v!=='none');
function psStateOf(f){return f.mEnd||(f.end==='ko'||(f.look&&f.look.prone)?'lying':f.end==='win'?'low':'guard');}
function psPlaceM(id){
  const f=PS.fig[id],m=PS.M[id];if(!f||!m)return;
  const st=psStateOf(f);PL().place(m,PS.clock,PS.gap,st);f.spent=false;f.mDown=st==='lying';
}
// a rig for each fighter, rebuilt (and placed) when the weapon or the weapon hand changes
function psMotionFigs(){
  for(const id of ['a','b']){
    const f=PS.fig[id];if(!f||!f.look)continue;const wk=f.look.wk,m=PS.M[id];
    if(!m||m.weapon.len!==wk.len||m.weapon.key!==wk.kind||m.swap!==!!f.look.swap){PS.M[id]=PL().fighter(id,wk,f.look.swap);PS.M[id].keep=20000;psPlaceM(id);}
  }
}
// A lull: once nothing has moved for a while, a fighter left spent by the last exchange gets back to its station, and a
// figure the engine has put on (or taken off) the floor without a motion of its own goes down or gets up.
function psLull(){
  const L=PL();
  for(const id of ['a','b']){
    const f=PS.fig[id],m=PS.M[id];if(!f||!m||!f.look||PS.clock<PS.busyUntil+300)continue;
    if(f.look.prone&&!f.mDown){f.mDown=true;f.spent=false;PS.busyUntil=Math.max(PS.busyUntil,L.fall(m,PS.clock));continue;}
    if(!f.look.prone&&f.mDown&&!f.end&&!f.mEnd){f.mDown=false;PS.busyUntil=Math.max(PS.busyUntil,L.stand(m,PS.clock,PS.gap));continue;}
    if(!f.spent||PS.clock<PS.busyUntil+1300||f.end||f.mEnd||f.mDown||f.pressRole)continue;
    f.spent=false;PS.busyUntil=Math.max(PS.busyUntil,L.recover(m,PS.clock,PS.gap,psHurt(f)));
  }
}
async function psMotionCue(cue){
  const me=PS.fig[cue.actor]||null,tgt=PS.fig[cue.target]||null,L=PL();
  const g=x=>x==='fumble'?0:x==='failure'?1:x==='success'?2:3;
  try{
    if(cue.type==='attack'&&me){
      // nothing moves yet: the attack is drawn once its result is known, as one movement from load to follow-through
      PS.ex={exid:cue.exid,atk:me.id,aGrade:g(cue.grade),shield:cue.shield,react:'none',reactGrade:null,reactTool:'weapon'};
      if(cue.grade==='critical')psBanner('Critical attack','crit');else if(cue.grade==='fumble')psBanner('Fumble','bad');
      psEmit('attack',{actor:me.id,grade:cue.grade});await psSleep(300);
    }else if(cue.type==='parry'&&me){
      if(PS.ex){PS.ex.react='parry';PS.ex.reactGrade=g(cue.grade);PS.ex.reactTool=cue.shield?'shield':'weapon';}
      psEmit('guard',{actor:me.id,grade:cue.grade});await psSleep(200);
    }else if(cue.type==='evade'&&me){
      if(PS.ex){PS.ex.react='evade';PS.ex.reactGrade=g(cue.grade);}
      psEmit('brace',{actor:me.id,grade:cue.grade});await psSleep(200);
    }else if(cue.type==='locate'&&tgt){
      const w=psBodyPt(tgt,cue.loc);psReticle(w);
      if(cue.chosen)psDom(psWorld(tgt,tgt.pts?tgt.pts.hd:[0,-120]),'Chosen: '+(PSTAGE_LOCNAME[cue.loc]||''),'fx');
      psEmit('locate',{target:tgt.id,loc:cue.loc,point:w.map(Math.round)});await psSleep(420);
    }else if(cue.type==='hit'||cue.type==='deflect'){
      await psMotionBlow(cue);psReleaseExchange();
    }else if(cue.type==='trip'&&tgt&&me){
      // stand-in until trips have a phrase: a blow at the front leg; if it goes, the fall
      psDom(psWorld(me,me.pts?me.pts.Sh:[0,-60]),'Trip Opponent','fx');
      const r=L.blow(PS.M,me.id,PS.clock,{outcome:'armour',loc:'rleg',lost:0,fall:cue.fell});
      PS.busyUntil=r.end;me.spent=tgt.spent=true;if(cue.fell)tgt.mDown=true;
      const c=r.contacts[r.contacts.length-1],w=psW(c.at);await psUntil(c.t);
      psEmit('contact',{kind:'trip',actor:me.id,target:tgt.id,point:w.map(Math.round)});psBurst(w,'spark',10);psRing(w);
      await psHitStop(60);
      if(cue.fell){await psUntil(c.t+380);psDust(tgt);psShake();psPunch(4);psSfx('hit');psBanner('Tripped','crit');psDom(psWorld(tgt,tgt.pts.hd),'Tripped!','fx');}
      else psDom(psWorld(tgt,tgt.pts.Sh),'Stays up','blk');
      await psUntil(r.end);
    }else if(cue.type==='disarm'&&tgt&&me){
      // stand-in until disarms have a phrase: the blow meets the weapon and the weapon goes
      const r=L.blow(PS.M,me.id,PS.clock,{outcome:'parried',loc:'rarm',lost:0});
      PS.busyUntil=r.end;me.spent=tgt.spent=true;
      const c=r.contacts[0],w=psW(c.at);await psUntil(c.t);
      psEmit('contact',{kind:'disarm',actor:me.id,target:tgt.id,point:w.map(Math.round)});
      psBurst(w,'spark',14);psRing(w);psShake();psSfx('pick');
      await psHitStop(70);psPunch(5);psBanner('Disarmed','crit');psFlyWeapon(tgt,cue.metres);
      await psUntil(r.end);
    }else if(cue.type==='stand'&&me){
      me.mDown=false;const end=L.stand(PS.M[me.id],PS.clock,PS.gap);PS.busyUntil=Math.max(PS.busyUntil,end);
      psDust(me);await psUntil(end);
    }else if(cue.type==='wound'||cue.type==='limb'){
      if(cue.type==='wound')psBanner(cue.level==='major'?'Major wound':'Serious wound','red');
      else psBanner(cue.leg?'Legs gone':'Useless arm','red');
      psSfx('crit');await psSleep(500);
    }else if(cue.type==='lodge'&&me){
      psBanner('Weapon lodged','red');psSfx('crit');psEmit('lodge',{actor:me.id});await psSleep(500);
    }else if(cue.type==='press'&&me&&tgt){
      await psMotionPress(me,tgt,{record:{press:cue}});
    }else if(cue.type==='drop'&&me){
      if(!me.dropEl&&me.look&&!me.look.armed)psFlyWeapon(me,0);await psSleep(300);
    }else if(cue.type==='end'){
      // only what the engine's own wording says: a concession yields; an injury or exhaustion with no finishing contact
      // falls from where the figure stands
      const won=cue.winner==='a';
      psBanner(cue.winner?(won?'Victory':'Defeated'):'Draw',won?'vd':'bad');psSfx('crit');
      const lo=cue.winner&&PS.fig[cue.winner==='a'?'b':'a'],wi=cue.winner&&PS.fig[cue.winner];
      let end=PS.clock;
      if(lo){
        if(cue.how==='concede'){lo.mEnd='yield';psEmit('yield',{target:lo.id});end=L.yieldTo(PS.M[lo.id],PS.clock);}
        else{lo.mEnd='lying';if(!lo.mDown){lo.mDown=true;end=L.fall(PS.M[lo.id],PS.clock);}}
      }
      if(wi){wi.mEnd='low';end=Math.max(end,L.lower(PS.M[wi.id],PS.clock));}
      PS.busyUntil=Math.max(PS.busyUntil,end);await psUntil(Math.min(end,PS.clock+700));
    }
  }catch(e){if(e!==0)psEmit('cue-error',{cue:cue.type,message:String(e&&e.message||e)});}
}
// The blow of an exchange, once its result is known: the phrases are chosen from the engine's facts, and the effects
// land when the drawn weapon gets there.
async function psMotionBlow(cue){
  const ex=PS.ex||{},px=cue.px||{},L=PL();
  const atkId=cue.actor||ex.atk||(cue.target?(cue.target==='a'?'b':'a'):null);
  const atk=PS.fig[atkId],def=atk&&psOther(atk);if(!atk||!def||!PS.M[atk.id]||!PS.M[def.id])return;
  const out=pitsStageOutcome(cue,ex),loc=cue.loc||'chest',lost=cue.lost||0;
  const reactTool=px.reactTool||ex.reactTool||'weapon',shield=out.endsWith('ward')||(reactTool==='shield'&&!!def.look.shield);
  const after=(cue.record&&cue.record.after)||[],endC=after.find(c=>c.type==='end'),limbC=after.find(c=>c.type==='limb'),dropC=after.find(c=>c.type==='drop');
  const defeated=lost>0&&!!endC&&endC.winner===atk.id&&endC.how==='injury';
  const leg=lost>0&&!!limbC&&(limbC.leg||/leg/.test(limbC.loc||''));
  psEmit('resolve',{outcome:out,loc,lost,actor:atk.id,target:def.id,px});
  const r=L.blow(PS.M,atk.id,PS.clock,{outcome:out,loc,lost,shield,fall:leg&&!defeated,defeated});
  PS.busyUntil=r.end;atk.spent=def.spent=true;
  if(defeated||leg)def.mDown=true;if(defeated)def.mEnd='lying';
  for(const c of r.contacts){
    await psUntil(c.t);const w=psW(c.at);
    if(c.kind==='miss'){
      psEmit('contact',{kind:out,actor:atk.id,target:def.id,point:w.map(Math.round)});
      psBurst(w,'gray',5);psSfx('miss');
      if(out==='evaded'){psRing(w);psDom(psWorld(def,def.pts.Sh),'Evaded','blk');}
      else psDom(w,out==='fumble'?'Fumble!':'Miss','miss');
    }else if(c.kind==='clash'){
      const full=out==='parried'||out==='full-parry'||out==='full-ward';
      psEmit('contact',{kind:full?out:'deflect',actor:atk.id,target:def.id,point:w.map(Math.round),tip:psOnBlade(atk,w).map(Math.round)});
      psBurst(w,'spark',full?16:12);psRing(w);psSfx('pick');
      if(full){psShake();psDom(w,out.endsWith('ward')?'Shield ward':'Parried','blk');if(cue.type==='hit'&&px.blocked)psDom([w[0],w[1]+26],'−'+px.blocked,'blk');}
      else psDom(w,(out.endsWith('ward')?'Ward':'Parry')+' −'+px.blocked,'blk');
      await psHitStop(full?70:50);
    }else{
      def.flash=lost>0?loc:null;def.flashUntil=performance.now()+900;
      psEmit('contact',{kind:out,actor:atk.id,target:def.id,loc,point:w.map(Math.round),tip:psWorld(atk,atk.pts.tip).map(Math.round),lost});
      if(lost>0){
        psBurst(w,'spark',10);psRing(w);psShake();psBurst(w,'blood',10+lost*2);
        psDom(w,'−'+lost,'dmg');psSfx(lost>=6?'crit':'hit');
        if(px.armour>0)psDom([w[0],w[1]+28],'Armour −'+px.armour,'blk');
        // a disabled arm hangs from the blow on, and a dropped weapon leaves the hand
        const arm=limbC&&!leg&&(limbC.loc==='larm'||limbC.loc==='rarm')?limbC.loc:null;
        if(arm){def.forceLimp=arm;if(dropC&&!def.dropEl)psSleep(60).then(()=>{if(!def.dropEl)psFlyWeapon(def,0);}).catch(()=>{});}
        if(defeated)psEmit('collapse',{target:def.id,actor:atk.id,how:endC.how});
        await psHitStop(45+Math.min(70,lost*9));psPunch(lost);
      }else{
        psBurst(w,'gray',8);psRing(w);psSfx('pick');
        psDom(w,out==='armour'?'Armour −'+px.armour:'No damage','blk');
      }
    }
  }
  await psUntil(r.end);
  if(defeated){
    const won=endC.winner==='a';psBanner(won?'Victory':'Defeated',won?'vd':'bad');psSfx('crit');
    atk.mEnd='low';const e2=L.lower(PS.M[atk.id],PS.clock);PS.busyUntil=Math.max(PS.busyUntil,e2);
    await psUntil(Math.min(e2,PS.clock+380));return;
  }
  await psMotionPress(atk,def,cue);
}
// Press Advantage: the attacker stays on the blade with the point in the face, held until the engine ends the effect.
async function psMotionPress(atk,def,cue){
  const rec=cue&&cue.record;if(!rec||!rec.press||!PS.M[atk.id]||!PS.M[def.id])return;
  const end=PL().press(PS.M[atk.id],PS.M[def.id],PS.clock);PS.busyUntil=Math.max(PS.busyUntil,end);atk.spent=def.spent=true;
  psDom(psWorld(atk,atk.pts?atk.pts.Sh:[0,-60]),'Press Advantage','fx');psEmit('press',{actor:atk.id,target:def.id});
  await psUntil(end);
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
// The range state to draw: the one recorded with the beat being replayed, else the live one.
const psRng=()=>(typeof V!=='undefined'&&pitsPresenting()&&V.shown&&V.shownRange)||{disengaged:!!S.disengaged,engagement:S.engagement,gap:S.gapMetres||0};
function psRangeKey(){
  const info=typeof engagementInfo==='function'?engagementInfo():{active:false},r=psRng();
  return r.disengaged?'apart':!info.active?'even':r.engagement==='short'?'short':'long';
}
// The range meter names the range by weapon length: the longer weapon's reach while it controls the distance
// (or both are about even), Close once the shorter weapon has closed inside it.
const PS_REACH_WORD=['Touch','Close','Medium','Long','Very long'];
function psRangeWord(key,r){
  if(key==='apart')return 'Apart'+(r.gap?' · '+r.gap+' m':'');
  if(key==='short')return 'Close range';
  const w=id=>(typeof ARENA_WEAPONS!=='undefined'&&ARENA_WEAPONS[S.fighters[id].weapon]||{}).reach;
  const reach=Math.max(w('a')??2,w('b')??2);
  return (PS_REACH_WORD[reach]||'Medium')+' range';
}
function psDrawRange(key){
  const g=psLayer('ps-range');if(!g)return;
  const a=PS.fig.a.tx,b=PS.fig.b.tx,y=PS_GROUND+26;g.innerHTML='';
  psSvg('line',{x1:a,x2:b,y1:y,y2:y,class:'ps-rline'},g);
  for(const x of [a,b])psSvg('line',{x1:x,x2:x,y1:y-8,y2:y+8,class:'ps-rline thick'},g);
  const word=psRangeWord(key,psRng());
  const t=psSvg('text',{x:(a+b)/2,y:y+26,class:'ps-rtext'},g);t.textContent=word.toUpperCase();
}
// A replay of the whole fight starts the stage from nothing (no old weapons on the floor, spacing re-seeded).
function pitsStageReset(){PS.run=null;}
function psSetSpacing(snap){
  if(PS_MOTION&&PS.fig.a.look&&PS.fig.b.look){
    // a change of range is footwork: the fighters step to their new places (no sliding)
    const key=psRangeKey(),L=PL(),gap=L.gap(PS.fig.a.look.wk,PS.fig.b.look.wk,key),moved=gap!==PS.gap;PS.gap=gap;
    psMotionFigs();
    for(const id of ['a','b']){const f=PS.fig[id],m=PS.M[id];
      if(moved&&snap)psPlaceM(id);
      else if(moved&&!f.mDown&&!f.mEnd){if(PS.clock>=PS.busyUntil){f.spent=false;PS.busyUntil=Math.max(PS.busyUntil,L.recover(m,PS.clock,gap,psHurt(f)));}else f.spent=true;}
      f.tx=m.hx+m.face*(L.station(m,gap)-m.guard.ffx+m.guard.px);}
    psDrawRange(key);return;
  }
  const key=psRangeKey(),d=PS_SPACING[key],tx={a:600-d/2,b:600+d/2};
  for(const id of ['a','b']){const f=PS.fig[id];
    if(f.tx!==tx[id]||snap){f.tx=tx[id];
      if(snap||psReduced()){f.hx=tx[id];f.slide=null;}
      else{f.slide={a:f.hx,b:tx[id],t0:performance.now(),d:460/psSpeed()};
        // a step-in: alternate the legs while sliding, with dust at the push-off (prototype step1/step2)
        if(!f.exPose&&!f.dropping){psDust(f);psPlay(f,[PS_POSE.step1,150],[PS_POSE.step2,150],[PS_POSE.idle,160]);}}}}
  psDrawRange(key);
}
// Called at the end of every render(): sync state, then play the current beat.
function pitsStageSync(){
  const wrap=typeof document!=='undefined'&&document.getElementById&&document.getElementById('pitsStage');
  const fighting=typeof S!=='undefined'&&S&&S.fighters&&['fight','between','over'].includes(S.phase);
  if(!fighting){if(wrap&&!wrap.hidden){psSettle();PS.run=null;PS.seeded=false;}if(wrap)wrap.hidden=true;return;}
  if(typeof document==='undefined'||!psMount())return;
  const box=document.getElementById('pitsStage');box.hidden=false;
  // Frame the figures tighter on a phone.
  box.querySelector('svg').setAttribute('viewBox',window.innerWidth<=900?'250 0 700 520':'0 0 1200 520');
  const view=pitsPresenting()&&V.shown&&V.shown.a?V.shown:S.fighters;
  const names={a:S.fighters.a.name,b:S.fighters.b.name};
  // A new bout or a new opponent: forget the old one completely.
  const fresh=PS.run!==S||PS.fighters.b!==S.fighters.b;
  if(fresh){psSettle();for(const k of Object.keys(PS.lodge)){PS.lodge[k].remove();delete PS.lodge[k];}
    for(const id of ['a','b']){const f=PS.fig[id];if(f.dropEl){f.dropEl.remove();f.dropEl=null;}f.look=null;}
    PS.run=S;PS.seeded=false;PS.lastId=0;PS.fighters={a:S.fighters.a,b:S.fighters.b};
    PS.M={};PS.gap=0;for(const id of ['a','b']){const f=PS.fig[id];f.mEnd=null;f.mDown=false;f.spent=false;f.forceLimp=null;}}
  for(const id of ['a','b']){
    const f=PS.fig[id];f.look=pitsStageLook(view[id]);f.scale=f.look.scale;
    if(f.look.armed&&f.dropEl){f.dropEl.remove();f.dropEl=null;}
    // A weapon already on the floor (for example after Show results) stays there.
    if(!f.look.armed&&!f.dropEl&&view[id].disarmed)psFlyWeapon(f,view[id].droppedMetres||2);
    f.end=null;
  }
  // Press Advantage: the effect is active while the engine says the opponent still cannot attack (pressedTurns).
  {const pr=['a','b'].filter(i=>view[i]&&(view[i].pressedTurns||0)>0),active=S.phase==='fight'&&pr.length===1?pr[0]:null;
   for(const id of ['a','b']){const f=PS.fig[id];f.pressRole=active?(id===active?'cover':'press'):null;
     // released: the pair gets out of it at the next lull
     if(f.pressWas&&!f.pressRole)f.spent=true;f.pressWas=f.pressRole;}}
  PS.fighters.lodged={a:pitsStageLodged(view,'a'),b:pitsStageLodged(view,'b')};
  PS.fighters.tether={a:pitsStageEntangle(view,'a'),b:pitsStageEntangle(view,'b')};
  const over=(S.phase==='over'||S.phase==='between')&&S.winnerId&&!V.busy;
  if(over){PS.fig[S.winnerId].end='win';PS.fig[S.winnerId==='a'?'b':'a'].end='ko';}
  const firstTime=!PS.seeded;PS.seeded=true;psSetSpacing(firstTime);
  // The playback ended. Cut short (Show results, Stop replay): snap to the real state. Played to its end: do not snap or
  // reset anything; the figures stay in the pose the motion left them in and relax only after a real lull.
  // While an exchange waits on a person (a reaction, a Special Effect, a roll) the windup and guard are held.
  const inExchange=S.phase==='fight'&&!!(S.pending||(typeof R!=='undefined'&&R));
  const waiting=!V.busy&&psExchangeHeld()&&inExchange;
  if(!V.busy&&!waiting)psReleaseExchange();
  if(PS.wasBusy&&!V.busy){
    if(V.skipped){psSettle(waiting);V.skipped=false;}
  }
  PS.wasBusy=!!V.busy;
  psHoldLodged();
  if(V.busy){
    const e=V.events[V.step];
    if(e&&!e.roll&&!e.checkpoint&&e.id!==PS.lastId){
      PS.lastId=e.id;
      const b=pitsStageBeat(V.events,V.step,names);
      PS.cueFor=e.id;
      if(b.consumed)PS.cuePromise=null;      // part of the blow's own motion: nothing to start, and nothing to cancel
      else{PS.epoch++;PS.cuePromise=b.cue?psRunCue(b.cue):null;}
    }
  }else{
    // entries held back for an unfinished exchange have not been presented yet: they must still start their cue when their turn comes
    PS.epoch++;PS.lastId=Math.max(PS.lastId,...(S.logs||[]).slice(0,V.hold?V.hold.visible:undefined).map(l=>Number(l.id)||0));
  }
  // Decisions pause the scene as one; it stays exactly as it is until the person has answered.
  psSetPaused(!V.busy&&(inExchange||!!V.hold));
}
// The stage reports when the motion of a beat is done, so playback can be paced by the animation itself.
const pitsStageMounted=()=>!!PS.ready&&!!document.getElementById('pitsStage')&&!document.getElementById('pitsStage').hidden;
function pitsStageCueDone(id){return PS.cueFor===id&&PS.cuePromise?PS.cuePromise:null;}
// The replay asks how long to stay on a beat (see playBeat in the arena).
function pitsStageBeatDelay(entry,fallback){
  try{return pitsStageHold(entry,{a:S.fighters.a.name,b:S.fighters.b.name},fallback);}catch(e){return fallback;}
}
// Replay filter: only entries that have something to show, and not the reticle beat (the strike already shows where it lands).
function pitsStageReplayable(entry,names){
  try{const c=pitsStageCue(entry,names);return !!c&&c.type!=='locate';}catch(e){return false;}
}
