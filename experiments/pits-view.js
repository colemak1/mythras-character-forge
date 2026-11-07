// The Pits view adapter (v0 fight-screen design, owner-chosen 2026-11-07).
// Read-only: it maps the arena engine's state (S, R and the engine's own
// predicates) to what the fight screen shows. It never changes state and holds
// no rules of its own, so rules fixes land in the engine independently.
// Loaded before the arena script; the engine globals it reads exist by the
// time any of these functions is called.

// Which prompt the screen is in: setup, intro, action, opponent, reaction,
// effects, resist, rolling or recap (Core phases map to the mockup's views).
function pitsPhase(){
  if(!S||S.phase==='setup')return 'setup';
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
  add('attack','Attack',1,needs(1)||pressed()||(!canUseWeapon(f)?'Weapon unusable':!(canAttackBody(id)||mustTargetWeapon(id))?'Out of reach':''));
  if(typeof canShieldStrike==='function'&&canShieldStrike(f))
    add('shieldAttack','Shield Strike',1,needs(1)||pressed()||(!shieldReachesBody(id)?'Out of reach':''));
  if(canWithdrawImpale(f))add('withdrawImpale','Withdraw Embedded Weapon',1,needs(1));
  if(f.pinnedGear)add('freePin','Free Pinned '+(f.pinnedGear==='shield'?'Shield':'Weapon'),1,needs(1));
  if(typeof entangledLoc==='function'&&entangledLoc(f))add('freeEntangle','Break Free',1,needs(1));
  if(typeof entangling==='function'){const held=entangling(f);if(held&&!held.prone)add('entangleTrip','Trip Entangled Foe',1,needs(1));}
  if(f.disarmed)add('recoverWeapon',f.droppedMetres>3?'Move to Weapon':f.recoveringWeapon?'Ready Weapon':'Pick Up Weapon',1,needs(1));
  add('changeRange','Change Range',1,needs(1)||(!proposedRange(id)?'No reach to contest':''));
  add('brace','Brace',1,needs(1)||(f.braced?'Already braced':''));
  add('delay','Delay',0,'');
  add('dither','Dither',1,needs(1));
  add('stand','Regain Footing',1,needs(1)||(!f.prone?'Not prone':!canRegainFooting(f)?'Leg out of action':''));
  add('yield','Concede Bout',0,'');
  return out;
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
    range:S.disengaged?'apart':!engagementInfo().active?'even':S.engagement==='short'?'short':'long',
    fighters:{a:pitsFighterSnapshot(S.fighters.a),b:pitsFighterSnapshot(S.fighters.b)}};
}
// Short words for the strip pill, per phase.
const PITS_PHASE_PILL={action:'Your turn',opponent:'Opponent',reaction:'Defend',effects:'Special Effects',resist:'Resist',rolling:'Roll',recap:'Bout over',intro:'Next opponent',setup:'Setup'};
