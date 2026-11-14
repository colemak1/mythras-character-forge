'use strict';
// Short teaching summaries checked against the user's uploaded Mythras Core:
// printed pp.91-95, the Special Effects table p.100, and optional reach pp.106-107.
// Categories organize choices; legality and resolution stay in the combat engine.
function readGuidancePreference(){
 try{return localStorage.getItem('sitota-practice-guidance-v1')!=='off';}catch{return true;}
}
function guidanceEnabled(){return S.mode==='tutorial'||V.guidance;}
function guidanceToggleHtml(){
 return `<button class="toolbutton guidance-toggle" data-act="guidance" aria-label="Toggle combat guidance" aria-pressed="${guidanceEnabled()}" ${S.mode==='tutorial'?'disabled title="Guided Tutorial always includes explanations"':''}>Guidance ${guidanceEnabled()?'On':'Off'}</button>`;
}
function combatGuidance(){
 const p=S.pending;
 const owner=S.fighters?.[R?.actor||currentDecisionOwner()];
 if(R){
  const label=R.label||'';
  if(/initiative/i.test(label))return {heading:'Set the order',prompt:'Roll the d10 to establish who acts first.',reason:'The arena adds the fighter’s initiative bonus and armour penalty. Each fighter then gets a proactive turn in initiative order during each cycle.',source:'Core pp.90-91'};
  if(/^Attack ·/i.test(label))return {heading:'Attack roll',prompt:'Roll your Combat Style. A hit can still be defended against.',reason:'Attack and defense success levels are compared. The better result can earn Special Effects independently of whether damage gets through.',source:'Core pp.94-95'};
  if(/^(Parry|Evade) ·/i.test(label))return {heading:'Defense roll',prompt:'Roll your defense, then compare it with the attack.',reason:'Parry reduces damage according to weapon Size. Evade uses an opposed roll and leaves the fighter prone in this arena.',source:'Core pp.92, 94-95, 103'};
  if(/hit location|location\s*[·:]|d20/i.test(label))return {heading:'Find the hit location',prompt:'Roll the d20 to find which body region was struck.',reason:'The hit location determines which armour and location HP apply. Special Effects are chosen before this roll.',source:'Core pp.94-95'};
  if(/damage/i.test(label))return {heading:'Roll damage',prompt:'Roll the requested dice; the result will be applied to the struck location.',reason:'A successful parry can reduce damage before the remaining damage meets location armour. Selected Special Effects can alter the result.',source:'Core pp.94-95'};
  return {heading:'Make your roll',prompt:'Roll the skill or resistance shown above.',reason:'The current effect or resistance determines which skill is rolled. Its result will appear in the exchange summary.',source:'Consult the current effect in Core pp.95-101'};
 }
 if(p?.kind==='reaction'){
  const f=S.fighters[p.def];
  if(f.ap<=0)return {heading:'No Action Points left',prompt:'You cannot spend an Action Point on a defense this round.',reason:'Choosing no defense is treated as a failed defense. A successful attacker can gain Special Effects; armour and existing passive blocks still apply.',source:'Core pp.91, 93-95'};
  if(cannotRespond(f))return {heading:'You cannot react',prompt:unavailableReaction(f,'evade'),reason:'The disabled defense choices show the current restriction. This exchange must resolve without an active defense.',source:'Current arena conditions'};
  if(p.attackRoll?.grade<2)return {heading:'Why respond to a miss?',prompt:'Parry for a chance at defensive Special Effects, or keep your Action Point.',reason:'A missed attack does not require a parry to stop damage. A defender may still spend an Action Point and try to win defensive Special Effects from the better success level.',source:'Core pp.94-95'};
  return {heading:'Defend against the attack',prompt:'Spend 1 Action Point on a defense, or keep it and accept the risk.',reason:'A parry can stop all, half or none of the damage depending on relative weapon Size. Evade can avoid the strike but leaves you prone. Declining a defense counts as a failed defense.',source:'Core pp.92, 94-95, 103'};
 }
 if(p?.kind==='effect')return {heading:'Spend your advantage',prompt:`Choose ${p.effectsLeft} remaining Special Effect${p.effectsLeft===1?'':'s'} before hit location and damage.`,reason:'The difference in success levels earns Special Effects. Effects can control the fight, change damage or alter position; earning an effect does not by itself guarantee that you avoided damage.',source:'Core pp.94-95, 100'};
 if(p?.kind==='range')return {heading:'Respond to the movement',prompt:'Allow the change, oppose it with Evade, or intercept with an attack.',reason:'Allowing the change saves your AP. Opposing can preserve the present range. An interception can hit the mover, but does not stop the range change.',source:'Core pp.106-107'};
 if(p?.kind==='ward')return {heading:'Choose shield coverage',prompt:'Cover the locations you want to protect before the next attack roll.',reason:'A shield can passively protect its covered locations. Using that shield for an active parry ends its existing ward.',source:'Core p.93'};
 if(p?.kind==='location')return {heading:'Choose a body region',prompt:'Compare the target’s current HP and armour at each location.',reason:'Choose Location replaces the random hit-location roll. Location armour still matters unless another effect bypasses it.',source:'Core pp.95-96'};
 if(p?.kind==='footingSkillChoice'||p?.kind==='footingDefendChoice')return {heading:'Contest the footing',prompt:'Choose Brawn or Athletics using the percentages shown.',reason:'While engaged, Regain Footing requires an opposed Brawn or Athletics test before the fighter can stand.',source:'Core p.92'};
 // Impale and trip decisions get their own advice, never the generic
 // Attack/Delay text (live batch 2026-11-09).
 if(p?.kind==='impalePick')return {heading:'Choose the Impale damage',prompt:'Pick one of the two damage rolls; the Damage Modifier is added once.',
  reason:'Impale rolls the weapon damage twice and the attacker keeps the roll they prefer. The weapon may then lodge in the wound.',source:'Core p.97'};
 if(p?.kind==='impaleLeave')return {heading:'Keep hold or let go',prompt:'Keep hold to pull the weapon free on a later turn, or leave it in the wound and fight on without it.',
  reason:'A lodged weapon makes the victim\u2019s skills harder while it stays in. Pulling it free takes a Ready Weapon action and a Brawn roll, and does more damage to the wound.',source:'Core p.97'};
 if(p?.kind==='impaleResist')return {heading:'Resist the withdrawal?',prompt:'Resist with Brawn to keep the weapon in, or allow it to be pulled out.',
  reason:'Resisting turns the withdrawal into an opposed Brawn roll. If the weapon comes free, the wound takes half the weapon\u2019s damage, with no armour.',source:'Core pp.97-98'};
 if(p?.kind==='tripResistChoice')return {heading:'Keep your feet',prompt:'Choose the skill to resist the trip with, using the percentages shown.',
  reason:'The victim of Trip Opponent resists with Brawn, Evade or Acrobatics against the attacker\u2019s original roll. Failing means falling prone.',source:'Core p.101'};
 if(p)return {heading:'Resolve the current choice',prompt:'Choose one of the options shown to continue.',reason:'This decision belongs to the effect or roll in progress; its options show what each does.',source:'Core pp.95-101'};
 if(owner?.prone)return {heading:'You are prone',prompt:'Regain Footing is available if your legs can support you; attacking from the ground has a penalty.',reason:'An engaged fighter must win an opposed Brawn or Athletics test to regain footing. The arena also shows the restrictions caused by disabled or stunned legs.',source:'Core pp.92, 101; current arena conditions'};
 if(owner?.disarmed)return {heading:'Your weapon is down',prompt:'Recover your weapon, then ready it on a later turn.',reason:'A nearby dropped weapon takes two turns to recover and ready. The arena charges an additional movement action when the weapon is beyond its short movement gap.',source:'Core p.92; arena movement convention'};
 if(owner&&proposedRange(owner.id)==='short')return {heading:'Their weapon keeps you out',prompt:'Close Inside to reach their body, or Delay to preserve a reaction.',reason:'With the optional reach rules, a substantially shorter weapon cannot directly reach the opponent’s body at long range. Closing is a contested action unless the opponent permits it.',source:'Core pp.106-107'};
 if(owner&&isCrampedAtReach(owner.id))return {heading:'They are inside your reach',prompt:'Open the range to restore your weapon’s normal use, or make a cramped attack.',reason:'At short range the longer weapon cannot parry normally and attacks with reduced Size and damage. The arena shows the cramped damage on the Attack choice.',source:'Core pp.106-107'};
 if(owner?.ap===1)return {heading:'Your last Action Point',prompt:'Attacking now leaves no AP for a later defense this round. Delay preserves a reaction.',reason:'Attacks and most reactions draw from the same Action Points. A delayed action expires if unused before your next turn; the arena does not implement Interrupt.',source:'Core pp.91-92; arena limitation'};
 return {heading:'Choose your approach',prompt:'Attack to pressure the opponent, or Delay to keep an Action Point available for a reaction.',reason:'Each proactive turn allows one action. Attacks and reactions use the same pool of Action Points, which resets at the start of the next round.',source:'Core pp.91-92'};
}
function combatGuideHtml(){
 if(S.phase!=='fight'||V.busy||!guidanceEnabled()||(R&&S.mode!=='tutorial'))return '';
 const g=combatGuidance(),tutorial=S.mode==='tutorial';
 return `<aside class="${tutorial?'tutorial-guide':'combat-guide'}" aria-label="Combat guidance"><div class="${tutorial?'tutorial-guide-main':'combat-guide-main'}"><strong>${esc(g.heading)}</strong><span>${esc(g.prompt)}</span></div><details class="tutorial-guide-details" ${V.guideWhyOpen?'open':''}><summary>Why?</summary><p>${esc(g.reason)}</p><p class="guide-source">${esc(g.source)}</p></details></aside>`;
}
// Pin Weapon (Core pp.97–98) in plain words: what is pinned, who holds it, what it blocks and how to free it
// (report review FR-01, 2026-11-14: players could not tell why Attack and Parry had gone grey).
function pinnedWhy(f,gear){
 const holder=S.fighters?.[f.pinnedBy]?.name||'the opponent',item=gear==='shield'?'shield':(ARENA_WEAPONS[f.weapon]?.name||'weapon').toLowerCase();
 return `Your ${item} is pinned by ${holder}: no ${gear==='shield'?'shield parries or shield strikes':'attacks or parries'} with it until it is freed. `
  +`Free it on your turn with Free Pinned ${gear==='shield'?'Shield':'Weapon'} (1 AP, your Brawn against ${holder}'s).`;
}
// Why the weapon cannot be used at all (the causes canUseWeapon checks), in the order a player can do something about them.
function weaponBlockedWhy(f){
 const hand=f.weaponHand||'Right Arm',held=typeof entangledLoc==='function'?entangledLoc(f):null;
 if(f.pinnedGear==='weapon')return pinnedWhy(f,'weapon');
 if(f.disarmed)return 'Your weapon is on the ground: recover it first.';
 if(held&&(held===hand||(ARENA_WEAPONS[f.weapon].twoHanded&&held.endsWith('Arm'))))
  return `Your ${held} is entangled: no attacks or parries with the weapon until you Break Free (1 AP, opposed Brawn).`;
 if(f.impaledWeapon&&!String(f.impaledWeapon.weapon||'').startsWith('shield:'))return 'Your weapon is embedded in the opponent: withdraw it first.';
 if(guardWeapon(f).hp<=0)return 'Your weapon is broken.';
 if(limbDisabled(f,hand)||f.stunnedLocations?.[hand])return 'Your weapon arm cannot be used.';
 if(ARENA_WEAPONS[f.weapon].twoHanded)return 'Both arms are needed for this weapon and one cannot be used.';
 return 'Your weapon cannot be used.';
}
function unavailableReaction(f,tool){
 if(f.ap<=0)return 'No Action Points remaining.';
 if(cannotRespond(f))return f.stunnedLocations?.Head?'Your head is stunned; you cannot react.':`Fatigue (${FATIGUE_NAMES[f.fatigue]}) prevents a reaction.`;
 if(tool==='shield'){
  if(ARENA_WEAPONS[f.weapon].twoHanded)return 'Both hands are committed to your weapon.';
  if(f.pinnedGear==='shield')return pinnedWhy(f,'shield');
  if(!armUsable(f,shieldArmOf(f)))return 'Your shield arm cannot be used.';
 }else{
  if(!canUseWeapon(f))return weaponBlockedWhy(f);
  if(!canParryAtReach(f.id))return 'The opponent is inside your weapon’s parrying reach.';
 }
 return '';
}
function parryChoiceHelp(f,attacker,tool){
 const blocked=unavailableReaction(f,tool);if(blocked)return blocked;
 const size=tool==='shield'?SHIELDS[f.shield].size:ARENA_WEAPONS[f.weapon].size;
 const attackingSize=isCrampedAtReach(attacker.id)?Math.max(1,ARENA_WEAPONS[attacker.weapon].size-engagementInfo().gap):ARENA_WEAPONS[attacker.weapon].size;
 const diff=attackingSize-size;
 const protection=diff<=0?'all':diff===1?'half':'no';
 const missed=S.pending?.attackRoll?.grade<2;
 if(missed)return `${effectiveSkill(f,combatTarget(f,tool))}% parry target. Try to earn defensive Special Effects${tool==='shield'&&f.warded.length?'; releases your ward':''}.`;
 return `${effectiveSkill(f,combatTarget(f,tool))}% parry target. Size comparison: ${protection} damage blocked on a successful parry${tool==='shield'&&f.warded.length?'; releases your ward':''}.`;
}
function reactionChoicesHtml(p){
 const f=S.fighters[p.def],attacker=S.fighters[p.atk];
 const button=(value,name,description,disabled=false)=>`<button class="choice" data-act="react" data-val="${value}" ${disabled?'disabled':''} title="${esc(description)}"><strong>${name}</strong><small>${esc(description)}</small></button>`;
 const missed=p.attackRoll?.grade<2;
 return `<div class="turnline"><h3>Choose your defense</h3><span>${f.ap} AP available</span></div><div class="choicegrid reaction-choices">`+
  button('parry','Parry (Weapon) · 1 AP',parryChoiceHelp(f,attacker,'weapon'),f.ap<=0||!canParryAtReach(f.id))+
  (f.shield!=='none'?button('shield','Parry (Shield) · 1 AP',parryChoiceHelp(f,attacker,'shield'),f.ap<=0||!canShieldParry(f)):'')+
  button('evade','Evade · 1 AP',f.ap<=0||cannotRespond(f)?unavailableReaction(f,'evade'):`${effectiveSkill(f,evadeTarget(f))}% Evade target. ${missed?'Try for defensive Special Effects; you still finish prone.':'Try to avoid the attack; you finish prone.'}`,f.ap<=0||cannotRespond(f))+
  button('none','Do Not Defend · 0 AP',missed?'Keep your AP; pass up the chance to earn defensive Special Effects.':'Keep your AP; a successful attack can damage you and earn Special Effects.')+'</div>';
}
function actionChoiceHelp(act,f){
 if(!f)return '';
 switch(act){
  case 'attack':
   if(f.ap<1)return 'No Action Points remaining.';
   if(cannotRespond(f))return unavailableReaction(f,'evade');
   if(f.skipAttack>0)return 'Recovering from a wound: you cannot attack this turn.';
   if(f.pressedTurns>0)return 'Press Advantage prevents attacking this turn.';
   if(f.overextendedTurns>0)return 'Overextend Opponent prevents attacking this turn.';
   if(cannotAttackDueToStun(f))return 'A stunned location prevents attacking this turn.';
   if(!canUseWeapon(f))return unavailableReaction(f,'weapon')||'Your weapon cannot be used in the current condition.';
   if(isCrampedAtReach(f.id))return 'Cramped strike · 1d3+1 plus Damage Modifier; reduced weapon Size.';
   if(!canAttackBody(f.id))return 'Their body is beyond your reach. Close Inside first.';
   return `${effectiveSkill(f,combatTarget(f))}% attack target. Spend 1 AP to attack; the opponent can react.`;
  case 'delay':return 'Hold an AP for a reaction. If unused before your next turn, that AP is lost.';
  case 'ward':return `Passively cover up to ${SHIELDS[f.shield].coverage} locations. An active shield parry releases the ward.`;
  case 'stand':return !f.prone?'You are already standing.':canRegainFooting(f)?'Stand using an opposed Brawn or Athletics test while engaged.':'A disabled or stunned leg prevents standing.';
  case 'changeRange':return f.ap<1?'No Action Points remaining.':proposedRange(f.id)==='short'?'Close Inside to reach their body. They may oppose or intercept.':proposedRange(f.id)==='long'?'Open the range to restore your longer weapon’s normal use.':'No useful reach change is available in this position.';
  case 'brace':return f.braced?'You are already braced.':'Spend 1 AP to resist knockback; bracing ends when you move.';
  case 'dither':return 'Spend 1 AP without another action. Delay instead if you want to preserve a reaction.';
  case 'recoverWeapon':return f.droppedMetres>3?'Spend 1 AP moving to the dropped weapon.':f.recoveringWeapon?'Spend 1 AP to ready the weapon you picked up.':'Spend 1 AP to pick up the weapon; ready it on a later turn.';
  case 'reengage':return f.prone?'Stand before moving to engage.':S.gapMetres>3?'The arena charges 1 AP to cross this gap.':'Return to melee range; this short arena gap costs no Move AP.';
  case 'freePin':return f?.pinnedGear?pinnedWhy(f,f.pinnedGear).replace(/ Free it on your turn.*/,'')+' This action: 1 AP, your Brawn against theirs; win and the item is free.':'Contest the pin to free your trapped item.';
  case 'swapHand':return swapHandReason(f)||'Free. Move the weapon to your other working hand. House policy, not Core RAW.';
  case 'withdrawImpale':return 'Spend 1 AP and test Brawn to withdraw the embedded weapon.';
  default:return '';
 }
}
function decorateDecisionChoices(html){
 const f=S.fighters?.[S.order?.[S.turnIndex]];
 if(S.pending)return html;
 return html.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/g,(all,attrs,body)=>{
  const act=attrs.match(/\bdata-act="([^"]+)"/)?.[1],help=actionChoiceHelp(act,f);
  if(!help)return all;
  body=body.replace(/<small>[\s\S]*?<\/small>/g,'');
  return `<button${attrs}>${body}<small>${esc(help)}</small></button>`;
 });
}
function effectChoicesHtml(p){
 const options=availableEffects(p);
 const groups=[['Control the opponent',new Set(['press','overextend','trip','disarm','pinWeapon','prepareCounter','blind','compel','forceFailure'])],['Damage and protection',new Set(['choose','bleed','impale','bash','stun','sunder','remise','bypassArmour','circumventParry','maximize','damageWeapon','scar','accidental','enhance','standFast'])],['Position and recovery',new Set(['close','open','withdraw','arise','slip'])]];
 const assigned=new Set(groups.flatMap(([,ids])=>[...ids]));
 groups.push(['Other legal effects',new Set(options.map(([id])=>id).filter(id=>!assigned.has(id)))]);
 return `<div class="turnline"><h3>Choose a Special Effect</h3><span>${p.effectsLeft} remaining</span></div><div class="effect-groups">`+groups.map(([title,ids])=>{
  const items=options.filter(([id])=>ids.has(id));
  return items.length?`<section class="effect-group" aria-label="${title}"><h4>${title}</h4><div class="choicegrid">${items.map(([id,name,description])=>`<button class="choice" data-act="effect" data-val="${id}"><strong>${esc(name)}</strong><small>${esc(description)}</small></button>`).join('')}</div></section>`:'';
 }).join('')+'</div><button class="toolbutton" style="width:100%;margin-top:9px" data-act="skipEffect">Skip remaining effects</button>';
}
