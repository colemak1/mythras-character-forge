// The Pits view adapter (v0 fight-screen design, owner-chosen 2026-11-07).
// Read-only: it maps the arena engine's state (S, R and the engine's own
// predicates) to what the fight screen shows. It never changes state and holds
// no rules of its own, so rules fixes land in the engine independently.
// Loaded before the arena script; the engine globals it reads exist by the
// time any of these functions is called.

// Which prompt the screen is in: setup, intro, action, opponent, reaction,
// effects, resist, rolling or recap (Core phases map to the mockup's views).
// Screens show the presented state (V.shown) while a beat plays or a resolved blow is held back; otherwise the live state.
const pitsPresenting=()=>typeof V!=='undefined'&&!!(V.busy||V.hold);
function pitsPhase(){
  if(!S||S.phase==='setup')return 'setup';
  // While a recorded exchange is being replayed, follow the beat on screen
  // rather than the already-resolved live state (PUI-F02).
  if(typeof V!=='undefined'&&V.busy){
    const actor=V.roll?.actor;
    return actor&&S.fighters?.[actor]?.kind==='human'?'rolling':actor?'opponent':'resolving';
  }
  if(S.phase==='intro')return 'intro';
  if(S.phase==='between'||S.phase==='over')return 'recap';
  const human=id=>S.fighters?.[id]?.kind==='human';
  if(R)return human(R.actor)?'rolling':'opponent';
  const p=S.pending;
  if(p){
    if(p.kind==='reaction')return human(p.def)?'reaction':'opponent';
    if(['tripResistChoice','blindResistChoice'].includes(p.kind))return human(p.other)?'resist':'opponent';
    if(['footingSkillChoice','footingDefendChoice','impaleResist'].includes(p.kind))return 'resist';
    if(['effect','location','pinChoice','counterChoice','counterRetaliation','impalePick','impaleLeave'].includes(p.kind))return human(p.owner||p.atk)?'effects':'opponent';
    return 'opponent';
  }
  return human(S.order?.[S.turnIndex])?'action':'opponent';
}

// Every proactive action the engine offers this fighter now, with its AP
// cost, whether it is legal, and a short reason when it is not.
function pitsLegalActions(id){
  const f=S.fighters?.[id];if(!f)return [];
  const out=[],ap=f.ap||0;
  const add=(act,label,cost,why)=>out.push({act,label,ap:cost,enabled:!why,reason:why||''});
  const needs=cost=>ap<cost?`Needs ${cost} AP`:'';
  const pressed=()=>attackRestrictionTurns(f)>0||cannotAttackDueToStun(f)?'Stunned or pressed':'';
  add('attack','Attack',1,needs(1)||pressed()||(!canUseWeapon(f)?(typeof weaponBlockedWhy==='function'?weaponBlockedWhy(f):'Weapon unusable'):!(canAttackBody(id)||mustTargetWeapon(id))?'Out of reach':''));
  if(typeof canShieldStrike==='function'&&canShieldStrike(f))
    add('shieldAttack','Shield Strike',1,needs(1)||pressed()||(!shieldReachesBody(id)?'Out of reach':''));
  if(canWithdrawImpale(f))add('withdrawImpale','Withdraw Embedded Weapon',1,needs(1));
  if(f.pinnedGear)add('freePin','Free Pinned '+(f.pinnedGear==='shield'?'Shield':'Weapon'),1,needs(1));
  if(typeof entangledLoc==='function'&&entangledLoc(f))add('freeEntangle','Break Free',1,needs(1));
  if(typeof entangling==='function'){const held=entangling(f);if(held&&!held.prone)add('entangleTrip','Trip Entangled Foe',1,needs(1));}
  if(f.disarmed)add('recoverWeapon',f.droppedMetres>3?'Move to Weapon':f.recoveringWeapon?'Ready Weapon':'Pick Up Weapon',1,recoverWeaponReason(f));
  // ARM-06 (app policy): a free move of a held one-handed weapon to the other hand
  if(!f.disarmed&&!ARENA_WEAPONS[f.weapon].twoHanded&&!shieldCarried(f))add('swapHand','Switch Weapon Hand',0,swapHandReason(f));
  add('changeRange',proposedRange(id)==='short'?'Close Inside':'Change Range',1,needs(1)||(!proposedRange(id)?'No reach to contest':''));
  if(typeof canDisengage==='function')add('disengage','Disengage',1,disengageReason(f));
  add('brace','Brace',1,needs(1)||(f.braced?'Already braced':''));
  add('delay','Delay',0,'');
  add('dither','Dither',1,needs(1));
  add('stand','Regain Footing',1,needs(1)||(!f.prone?'Not prone':!canRegainFooting(f)?'Leg out of action':''));
  add('yield','Concede Bout',0,'');
  return out;
}

// The recommended choice (owner, 2026-11-16: "a recommended action every turn that starts auto selected").
// Advice only, never a rule: a fixed order of priorities over the moves the engine already allows, with one plain reason.
function pitsRecommendedAction(id){
  const f=S.fighters?.[id];if(!f)return null;
  const on=pitsLegalActions(id).filter(a=>a.enabled&&a.act!=='yield');
  const pick=(act,why)=>on.some(a=>a.act===act)?{act,why}:null;
  const gear=f.pinnedGear==='shield'?'shield':'weapon';
  return (f.prone?pick('stand','You are on the ground: get up first. Attacks on you are easier while you are prone.'):null)
    ||(f.pinnedGear?pick('freePin',`Your ${gear} is pinned. Free it so you can attack and parry with it again.`):null)
    ||pick('freeEntangle','You are entangled. Break free before it is used to trip you.')
    ||(f.disarmed?pick('recoverWeapon','You have no weapon in hand. Get it back before anything else.'):null)
    ||pick('attack','Attacking is how a bout is won. Each parry or evade later costs 1 AP, so watch what you keep.')
    ||pick('shieldAttack','Your weapon cannot attack now; the shield still can.')
    ||pick('withdrawImpale','Your weapon is stuck in them. Pull it out to fight with it again.')
    ||pick('changeRange','You cannot reach them from here. Change the range first.')
    ||pick('delay','Nothing useful to do now. Delay keeps your AP for defending.')
    ||(on[0]?{act:on[0].act,why:''}:null);
}
// The recommended answer to an attack or a range change, from the options offered (each {val,enabled,pct}).
function pitsRecommendedDefence(id,options){
  const f=S.fighters?.[id],p=S.pending,on=(options||[]).filter(d=>d.enabled);if(!f||!on.length)return null;
  const has=v=>on.find(d=>d.val===v);
  if(p?.kind==='range'){
    const o=has('oppose');
    return o&&o.pct>=40?{val:'oppose',why:`Your Evade (${o.pct}%) has a fair chance to keep the range as it is.`}
      :{val:'permit',why:'Opposing is a long shot at your Evade; keep the AP.'};
  }
  const missed=p?.attackRoll&&p.attackRoll.grade<2;
  if(missed&&f.ap<=1&&has('none'))return {val:'none',why:'Their attack already missed. Keep your last AP.'};
  const parries=on.filter(d=>d.val==='parry'||d.val==='shield').sort((a,b)=>b.pct-a.pct),ev=has('evade');
  // an Evade leaves you prone, so it is only advised when it is much better than any parry
  if(parries[0]&&(!ev||parries[0].pct+20>=ev.pct))return {val:parries[0].val,why:missed?'Their attack already missed; a good parry can still earn you Special Effects.':`Your best parry (${parries[0].pct}%). A parry keeps you on your feet; a weapon or shield also blocks damage by its size.`};
  if(ev)return {val:'evade',why:`Evade (${ev.pct}%) is your best chance${parries[0]?' by far':''}. You end up prone if it works.`};
  return has('none')?{val:'none',why:'No defence is possible now.'}:null;
}

// A plain snapshot of one fighter for the panels (and for tests).
function pitsFighterSnapshot(f){
  const w=ARENA_WEAPONS[f.weapon]||{};
  return {id:f.id,name:f.name,human:f.kind==='human',weapon:w.name,size:SIZE_WORD[w.size]||'',reach:REACH_WORD[w.reach]||'',
    ap:f.ap,apMax:f.apMax,style:f.style,
    locations:HIT_LOCS.map(loc=>({loc,hp:f.hp[loc],maxHp:f.maxHp[loc],armour:armourAt(f,loc),wound:zoneClass(f,loc)})),
    skills:{brawn:f.brawn,evade:f.evade,athletics:f.athletics,acrobatics:f.acrobatics||0,endurance:f.endurance}};
}
function pitsSnapshot(){
  return {phase:pitsPhase(),round:S.round,cycle:S.cycle,turn:S.order?.[S.turnIndex]||null,
    range:S.disengaged?'apart':!engagementInfo(typeof pitsPresenting==='function'&&pitsPresenting()&&V.shown?V.shown:null).active?'even':S.engagement==='short'?'short':'long',
    fighters:{a:pitsFighterSnapshot(S.fighters.a),b:pitsFighterSnapshot(S.fighters.b)}};
}
// Short words for the strip pill, per phase.
const PITS_PHASE_PILL={resolving:'Resolving',action:'Your turn',opponent:'Opponent',reaction:'Defend',effects:'Special Effects',resist:'Resist',rolling:'Roll',recap:'Bout over',intro:'Next opponent',setup:'Setup'};

// Percentile band for a skill: contiguous zones of critical / success /
// failure / fumble, found by grading every face 1–100 with the engine's own
// rollSkill(), so the band can never disagree with the rules.
function pitsRollBands(pct){
  const out=[];
  for(let r=1;r<=100;r++){
    const g=rollSkill(pct,r).grade,kind=['fumble','failure','success','critical'][g];
    const last=out[out.length-1];
    if(last&&last.kind===kind)last.to=r;else out.push({kind,from:r,to:r});
  }
  return out;
}
const PITS_ZONE_WORD={critical:'Critical',success:'Success',failure:'Failure',fumble:'Fumble'};
function pitsBandHtml(pct,roll){
  const bands=pitsRollBands(pct);
  const zones=bands.map(b=>`<i class="z-${b.kind}" style="flex:${b.to-b.from+1}" title="${PITS_ZONE_WORD[b.kind]} ${b.from===b.to?String(b.from).padStart(2,'0'):String(b.from).padStart(2,'0')+'–'+String(b.to).padStart(2,'0')}"></i>`).join('');
  const marker=roll==null?'':`<span class="pits-mk" style="left:calc(${(roll-0.5)}% - 1px)"${roll<8?' data-edge="l"':roll>92?' data-edge="r"':''}><b>${String(roll).padStart(2,'0')}</b></span>`;
  return `<div class="pits-band-wrap">${marker}<div class="pits-band" aria-hidden="true">${zones}</div></div>`;
}
// Odds in words: chance of each grade for a skill (count of faces).
function pitsOddsText(pct){
  const n={critical:0,success:0,failure:0,fumble:0};
  for(const b of pitsRollBands(pct))n[b.kind]+=b.to-b.from+1;
  return `<b>${n.critical+n.success}%</b> to succeed · <span class="k-c">${n.critical}% critical</span> · <span class="k-x">${n.fumble}% fumble</span>`;
}
// The skill an option would roll, for the odds preview (null when none).
function pitsOddsFor(act,val){
  const p=S.pending;
  if(act==='react'&&p?.kind==='reaction'){
    const d=S.fighters[p.def];
    if(val==='parry')return combatTarget(d,'weapon');
    if(val==='shield')return combatTarget(d,'shield');
    if(val==='evade')return evadeTarget(d);
    return null;
  }
  const f=S.fighters?.[S.order?.[S.turnIndex]];if(!f)return null;
  if(act==='attack')return combatTarget(f);
  if(act==='shieldAttack')return combatTarget(f,'shield');
  if(act==='stand'||act==='freePin'||act==='freeEntangle')return f.brawn;
  return null;
}
// Readout under the dice: the latest d100 skill roll with its verdict.
// The skill roll the screen has reached: during a replay, the latest roll
// beat already settled on screen; otherwise the latest roll (PUI-F02).
function pitsShownSkillRoll(){
  if(typeof V==='undefined')return null;
  if(!V.busy||!Array.isArray(V.events))return V.lastSkillRoll||null;
  let r=V.skillBefore||null;
  for(let i=0;i<V.events.length&&i<=V.step;i++){
    const roll=V.events[i]?.roll;if(!roll?.skill)continue;
    if(i<V.step||(V.roll&&V.roll.settled))r=roll.skill;
  }
  return r;
}
function pitsReadoutHtml(){
  const r=pitsShownSkillRoll();
  if(!r)return `<section class="pits-readout" aria-label="Last roll"><div class="pits-ro-top"><span class="label">Last roll</span><span class="pits-ro-text">No roll yet this bout</span></div>${pitsBandHtml(50,null).replace('pits-band-wrap','pits-band-wrap is-empty')}<div class="pits-ro-scale"><span>01</span><span>50</span><span>00</span></div></section>`;
  const kind=['fumble','failure','success','critical'][r.grade]||'failure';
  return `<section class="pits-readout" aria-label="Last roll"><div class="pits-ro-top"><span class="label">Last roll · ${esc(r.name)}</span><span class="pits-ro-text">${esc(r.what)}: <b>${String(r.roll).padStart(2,'0')}</b> against ${r.pct}% — <span class="o-${kind}">${PITS_ZONE_WORD[kind]}</span></span></div>${pitsBandHtml(r.pct,r.roll)}<div class="pits-ro-scale"><span>01</span><span>50</span><span>00</span></div></section>`;
}
