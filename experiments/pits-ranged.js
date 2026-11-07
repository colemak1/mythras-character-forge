'use strict';
// The Pits: ranged and thrown weapons (PIT-R01–R17 in
// docs/the-pits-ranged-cases.md). Part 1 (PitsRanged) is pure Core rules with
// no arena state, so tests can call it directly. Part 2 wires those rules into
// the arena in practice-combat.html, which loads this file first and calls
// these functions at run time. Lance and Garrotte stay unsupported.

const PitsRanged=(()=>{
 const STEP={S:1,M:2,L:3,H:4,E:5};
 const GRADES=['Very Easy','Easy','Standard','Hard','Formidable','Herculean','Hopeless'];
 const MULT=[2,1.5,1,2/3,1/2,1/10,0];
 // Core p.65 lines the arena leaves out (shared list in js/data.js).
 const UNSUPPORTED=typeof PRACTICE_RANGED_SKIP==='object'?PRACTICE_RANGED_SKIP:{};
 const EFFECT_KEYS={Impale:'impale',Bleed:'bleed','Stun Location':'stun',Sunder:'sunder'};
 // Arena convention (not Core): projectiles carried into one bout.
 const AMMO=[[/crossbow/i,12],[/bow/i,12],[/sling/i,12],[/^Javelin$/,3],[/^Dart$/,5],[/^Stone/,5]];
 // Core p.108 ranged situational modifiers, as difficulty steps.
 const SITUATIONAL={
  windLight:[1,'Light wind'],windModerate:[2,'Moderate wind'],windStrong:[3,'Strong wind'],gale:[4,'Gale'],
  mist:[1,'Target partly obscured'],fog:[2,'Target heavily obscured'],obscured:[3,'Target completely obscured'],
  targetRunning:[1,'Target running'],targetSprinting:[2,'Target sprinting'],targetProne:[2,'Target prone'],
  attackerProne:[3,'Shooter prone'],unstable:[1,'Unstable footing'],blinded:[4,'Shooter blinded']};
 // Core p.98 Marksman: one step to an immediately adjoining body area.
 const ADJACENT={'Head':['Chest'],'Chest':['Head','Abdomen','Right Arm','Left Arm'],'Abdomen':['Chest','Right Leg','Left Leg'],
  'Right Arm':['Chest'],'Left Arm':['Chest'],'Right Leg':['Abdomen'],'Left Leg':['Abdomen']};

 function dice(dmg){const m=/^(\d+)d(\d+)(?:\+(\d+))?$/.exec(String(dmg||''));return m?{dice:[+m[1],+m[2]],bonus:+(m[3]||0)}:null;}
 function apHp(w){const v=String(w.apHp||'').split('/').map(Number);return v.length===2&&v.every(Number.isFinite)?v:[1,1];}
 // Core p.65 item: three range values, Force (stored in "reach"), Load,
 // Damage Modifier Y/N and the projectile's own Special Effects.
 function profileOf(w){
  const dd=dice(w&&w.dmg);if(!dd||w.group!=='Ranged'||UNSUPPORTED[w.name])return null;
  const ranges=String(w.range||'').split('/').map(Number);
  if(ranges.length!==3||ranges.some(n=>!Number.isFinite(n)||n<=0))return null;
  const effects=String(w.effects||'').split(/,\s*/),load=Number.isFinite(Number(w.load))?Number(w.load):0;
  return {name:w.name,...dd,force:STEP[w.reach]||1,impaleSize:STEP[w.impaleSize]||STEP[w.size]||1,ranges,load,thrown:load===0,
   dmgMod:w.dmgMod==='Y',traits:effects.map(e=>EFFECT_KEYS[e]).filter(Boolean),barbed:effects.includes('Barbed'),
   pinShield:effects.includes('Pin Weapon (Shield)'),twoHanded:/bow|^Staff sling$/i.test(w.name),apHp:apHp(w),
   ammo:(AMMO.find(([re])=>re.test(w.name))||[0,1])[1]};
 }
 // PIT-R09: a Thrown melee weapon uses its own throwing line; a style with
 // Throw Weapons may throw another one-handed melee weapon at half damage.
 // Arena convention (not Core): improvised throws use the 5/10/20m line.
 function throwProfileFor(meleeName,traits,weapons){
  const w=(weapons||[]).find(x=>x.name===meleeName);if(!w||w.group==='Ranged'||w.group==='Shield')return null;
  if(/\bThrown\b/.test(w.traits||'')){
   const line=weapons.find(x=>x.name===meleeName+' (thrown)'),p=line&&profileOf(line);
   return p?{...p,native:true,load:0,thrown:true}:null;
  }
  const dd=dice(w.dmg);
  if(!dd||w.group!=='One-Handed'||!(traits||[]).includes('Throw Weapons'))return null;
  const effects=String(w.effects||'').split(/,\s*/);
  return {name:w.name+' (thrown)',...dd,force:STEP[w.size]||2,impaleSize:STEP[w.size]||2,ranges:[5,10,20],load:0,thrown:true,
   dmgMod:true,traits:effects.map(e=>EFFECT_KEYS[e]).filter(Boolean),barbed:/\bBarbed\b/.test(w.traits||''),pinShield:false,
   twoHanded:false,halved:true,improvised:true,apHp:apHp(w),ammo:1};
 }
 // PIT-R01: exact boundaries belong to the nearer band; past Long, no shot.
 function rangeBand(ranges,metres){
  const m=Math.max(0,Number(metres)||0);
  return m<=ranges[0]?'close':m<=ranges[1]?'effective':m<=ranges[2]?'long':'out';
 }
 function bandForce(force,band){return band==='long'?Math.max(1,force-1):force;}
 function bandDamage(total,band){return band==='long'?Math.ceil(Math.max(0,total)/2):Math.max(0,total);}
 // PIT-R02: Core p.108 distance x target SIZ table, 20m rows. Cells for
 // SIZ 10 or less beyond 20m are derived (see decisions.md, needs a check).
 function sizBand(siz){const s=Number(siz)||0;return s<=10?0:s<=20?1:s<=40?2:s<=80?3:s<=150?4:s<=300?5:6;}
 function distanceSizSteps(metres,siz){
  const m=Math.max(0,Number(metres)||0),row=m<=20?0:Math.ceil(m/20)-1,band=sizBand(siz);
  if(band===0)return row===0?1:row===1?2:row<=5?3:4;
  let steps=row-band+1;
  if(band>=5&&row<=6)steps=Math.min(steps,1);
  return Math.max(-2,Math.min(4,steps));
 }
 // PIT-R03/R04: the single most severe situational grade; a completed Aim
 // improves one of them by one grade. Distance/SIZ stacks on top of this.
 function situationalSteps(ids,aimed){
  const g=(ids||[]).map(id=>SITUATIONAL[id]?.[0]||0).sort((a,b)=>b-a);
  if(aimed&&g.length&&g[0]>0)g[0]--;
  return Math.max(0,...g);
 }
 function gradeName(steps){return GRADES[Math.max(-2,Math.min(4,steps))+2];}
 function gradeTarget(pct,steps){const s=Math.max(-2,Math.min(4,steps));return s===4?0:Math.ceil(pct*MULT[s+2]);}
 // PIT-R17: no ordinary shot above a walk; Skirmishing allows running only.
 function gaitCheck(gait,traits){
  if(!gait||gait==='walk')return {ok:true,cap:false};
  if(gait==='run'&&(traits||[]).includes('Skirmishing'))return {ok:true,cap:true};
  return {ok:false,cap:false,reason:gait==='sprint'?'No shooting while sprinting.':'Shooting while running needs the Skirmishing trait.'};
 }
 // One shot's target number from every rule above.
 function plan(o){
  const band=rangeBand(o.ranges,o.metres),distanceSteps=distanceSizSteps(o.metres,o.siz);
  const sit=situationalSteps(o.situational,o.aimed),steps=Math.max(-2,Math.min(4,sit+distanceSteps));
  const gait=gaitCheck(o.gait,o.traits);
  let target=gradeTarget(o.pct,steps),reason='';
  if(gait.cap)target=Math.min(target,Number(o.athletics)||0);
  if(band==='out')reason='Beyond Long range.';
  else if(!gait.ok)reason=gait.reason;
  else if(steps>=4)reason='Hopeless: the shot cannot be attempted.';
  return {band,distanceSteps,situationalSteps:sit,steps,grade:gradeName(steps),target,allowed:!reason,reason,aimed:!!o.aimed,capped:gait.cap};
 }
 // PIT-R05/R06: ammunition and loading. st = {loaded, ammo, progress, rapid, spare}.
 function makeAmmo(profile,count){
  const total=Math.max(0,Math.round(count??profile.ammo??1));
  return {loaded:total>0,ammo:Math.max(0,total-1),progress:0,rapid:0,spare:0};
 }
 function fire(st){if(!st.loaded)return false;st.loaded=false;st.progress=0;return true;}
 function loadNeeded(st,profile){return Math.max(0,(profile.load||1)-(st.rapid||0));}
 // One Load/Ready step. free: no AP or turn (a spare already in the off hand,
 // or Rapid Reload took the whole time away).
 function loadStep(st,profile){
  if(st.loaded)return {done:true,free:true,already:true};
  if(profile.thrown&&st.spare>0){st.spare--;st.loaded=true;return {done:true,free:true,spare:true};}
  if(st.ammo<=0)return {error:'No ammunition left.'};
  const need=loadNeeded(st,profile);
  if(need===0){st.ammo--;st.loaded=true;st.rapid=0;st.progress=0;return {done:true,free:true,rapid:true};}
  st.progress++;
  if(st.progress>=need){st.ammo--;st.loaded=true;st.progress=0;st.rapid=0;return {done:true,free:false,need};}
  return {done:false,free:false,progress:st.progress,need};
 }
 // PIT-R04: one whole Combat Round. Begun on a round's first cycle it is
 // ready next round; begun later, the following round must pass whole.
 function aimComplete(aim,round){return !!aim&&round>=aim.round+(aim.cycle<=1?1:2);}
 // PIT-R16: Move covers Movement x1 walking, x3 running, x5 sprinting.
 function moveMetres(rate,gait){return (Number(rate)||6)*({walk:1,run:3,sprint:5}[gait]||1);}
 // PIT-R11: crowd shots need another melee pair; the two-fighter arena has
 // none, so there is no penalty and no bystander to hit.
 function crowd(ctx){
  if(!ctx||!ctx.otherPair)return {steps:0,bystander:null};
  return {steps:ctx.through?2:1,bystander:ctx.failedOnlyByCrowd?(ctx.bystanders||[])[0]||null:null};
 }
 // PIT-R12/R14: offensive Special Effects a projectile can legally earn.
 const RANGED_ONLY=new Set(['drop','marksman','pinDown','rapidReload','circumventCover','duck','overpenetration']);
 const CONTACT=new Set(['press','trip','disarm','damageWeapon','remise','close','open','bash','entangle']);
 function offenceAllowed(id,c){
  if(['impale','bleed','stun','sunder'].includes(id))return c.success&&(c.profile.traits||[]).includes(id);
  if(id==='choose')return c.critical||(c.band==='close'&&c.stationaryOrUnaware&&c.success);
  if(id==='pinWeapon')return !!c.profile.pinShield&&c.defenderShield;
  if(id==='circumventCover'||id==='duck')return !!c.cover;
  if(id==='overpenetration')return c.critical&&!!c.secondTarget;
  if(CONTACT.has(id))return false;
  return true;
 }
 // Defensive effects that need the attacker within reach.
 const NEEDS_REACH=new Set(['trip','disarm','damageWeapon','entangle','blind','close','open','withdraw','pinWeapon']);
 return {STEP,GRADES,SITUATIONAL,ADJACENT,RANGED_ONLY,NEEDS_REACH,profileOf,throwProfileFor,rangeBand,bandForce,bandDamage,
  sizBand,distanceSizSteps,situationalSteps,gradeName,gradeTarget,gaitCheck,plan,makeAmmo,fire,loadNeeded,loadStep,aimComplete,
  moveMetres,crowd,offenceAllowed};
})();
if(typeof window!=='undefined')window.PitsRanged=PitsRanged;

// ---- Part 2: arena wiring (uses practice-combat.html globals at run time) ----
const NO_DAMAGE_MODIFIER={count:0,sides:6,sign:0,label:'no Damage Modifier'};
const ARENA_RANGED_ACTS=['rangedFire','rangedLoad','rangedAim','move','extractMissile','clearShield','marksmanLoc'];
const ARENA_DISTANCES=[0,12,20,40];
const ARENA_WEATHER={clear:'Clear and still',windLight:'Light wind',windModerate:'Moderate wind',mist:'Mist (partly obscured)',fog:'Thick fog'};

function arenaRangedInit(f){
 const w=ARENA_WEAPONS[f.weapon];
 Object.assign(f,{traits:f.traits||[],movement:f.movement||6,gait:null,gaitRound:0,aim:null,pinnedDownTurns:0,thrownAway:false,shieldFouled:false});
 f.missile=w&&w.ranged?PitsRanged.makeAmmo(w.profile):null;
 return f;
}
function arenaThrowKey(f){
 const w=ARENA_WEAPONS[f.weapon];if(!w||w.ranged)return null;
 const p=PitsRanged.throwProfileFor(w.name,f.traits,WEAPONS);
 return p?(p.improvised?'thrownImp:':'thrown:')+f.weapon:null;
}
// arenaProfile() for 'thrown:<key>' (native line) and 'thrownImp:<key>'.
function arenaThrownProfile(key){
 const [kind,base]=String(key).split(':'),w=ARENA_WEAPONS[base];if(!w)return null;
 const p=PitsRanged.throwProfileFor(w.name,kind==='thrownImp'?['Throw Weapons']:[],WEAPONS);if(!p)return null;
 return {name:p.name,dice:p.dice,bonus:p.bonus,size:p.force,reach:0,twoHanded:false,noParry:true,barbed:p.barbed,entrapping:false,ranged:true,profile:p,traits:p.traits};
}
function arenaRangedOption(f){
 const w=ARENA_WEAPONS[f.weapon];
 if(w?.ranged)return {key:f.weapon,profile:w.profile,kind:'fire'};
 if(f.thrownAway||f.disarmed)return null;
 const key=arenaThrowKey(f);return key?{key,profile:arenaThrownProfile(key).profile,kind:'throw'}:null;
}
function arenaOpponent(f){return S.fighters[f.id==='a'?'b':'a'];}
function arenaDistance(){return S.disengaged?Math.max(0,S.gapMetres||0):0;}
function arenaMoving(f){return f.gaitRound===S.round?f.gait:null;}
function arenaSituational(f,t){
 const out=[];
 if(S.weather&&S.weather!=='clear')out.push(S.weather);
 const tg=arenaMoving(t);if(tg==='run')out.push('targetRunning');if(tg==='sprint')out.push('targetSprinting');
 if(t.prone)out.push('targetProne');if(f.prone)out.push('attackerProne');if(f.blindedTurns>0)out.push('blinded');
 return out;
}
function arenaRangedPlan(f,opt){
 const t=arenaOpponent(f),situational=arenaSituational(f,t);
 const plan=PitsRanged.plan({pct:f.style,metres:arenaDistance(),siz:t.siz,situational,aimed:PitsRanged.aimComplete(f.aim,S.round),
  gait:arenaMoving(f),traits:f.traits,athletics:f.athletics,ranges:opt.profile.ranges});
 // A Serious weapon-arm wound is an injury grade, applied after the table.
 if(f.weaponHand&&zoneClass(f,f.weaponHand)==='serious')plan.target=Math.ceil(plan.target*2/3);
 plan.situational=situational;return plan;
}
// Whether f may shoot or throw right now, with the reason if not.
function arenaRangedReady(f,opt){
 if(!opt)return {ok:false,reason:'No missile weapon in hand.'};
 if(f.ap<1)return {ok:false,reason:'No Action Points remaining.'};
 if(cannotRespond(f)||cannotAttackDueToStun(f)||attackRestrictionTurns(f)>0)return {ok:false,reason:'You cannot attack this turn.'};
 if(f.pinnedDownTurns>0)return {ok:false,reason:'Pinned Down: you cannot return fire this turn.'};
 if(!canUseWeapon(f))return {ok:false,reason:'Your weapon cannot be used in the current condition.'};
 if(opt.kind==='fire'&&!f.missile?.loaded)return {ok:false,reason:opt.profile.thrown?'Ready another missile first.':'Load the weapon first.'};
 const plan=arenaRangedPlan(f,opt);
 return plan.allowed?{ok:true,plan}:{ok:false,reason:plan.reason,plan};
}
function arenaShieldStopsMissiles(d){
 const w=WEAPONS.find(x=>x.group==='Shield'&&practiceWeaponKey(x.name)===d.shield);
 return !!w&&/\bRanged Parry\b/.test(w.traits||'')&&canShieldParry(d);
}
function beginRangedAttack(id){
 if(S.phase!=='fight'||S.pending||R)return false;
 const f=S.fighters[id],t=arenaOpponent(f),opt=arenaRangedOption(f),ready=arenaRangedReady(f,opt);
 if(!ready.ok)return false;
 const plan=ready.plan,band=plan.band;
 f.ap--;reopenBandage(f,'a ranged attack');f.aim=null;
 if(opt.kind==='fire')PitsRanged.fire(f.missile);else f.thrownAway=true;
 const ranged={kind:opt.kind,band,metres:arenaDistance(),force:PitsRanged.bandForce(opt.profile.force,band),dmgMod:opt.profile.dmgMod,
  halved:!!opt.profile.halved,impaleSize:opt.profile.impaleSize,unique:opt.kind==='throw',stationary:!arenaMoving(t),pinShield:!!opt.profile.pinShield};
 requestSkill(f.id,plan.target,`Ranged attack · Combat Style ${plan.target}%`,at=>{
  S.pending={kind:'reaction',atk:id,def:t.id,attackTarget:plan.target,attackRoll:at,reaction:'none',defenseRoll:null,owner:null,other:null,effectsLeft:0,
   chosen:[],chosenLoc:null,maximize:0,evaded:false,isRemise:false,attackKey:opt.key,vsWeapon:false,ranged};
  const parts=[`${ranged.metres}m, ${band} range`,`distance and SIZ ${plan.distanceSteps>0?'+':''}${plan.distanceSteps}`];
  if(plan.situationalSteps)parts.push(`situation +${plan.situationalSteps}`);if(plan.aimed)parts.push('aimed');if(plan.capped)parts.push('capped by Athletics');
  log(`${f.name} ${opt.kind==='throw'?'throws':'shoots'}`,`${at.roll} against Combat Style ${plan.target}% (${plan.grade}: ${parts.join(', ')}) — ${at.label}.`,'system',
   `${opt.profile.name}. ${f.ap} AP left.${opt.kind==='fire'&&f.missile?` ${f.missile.ammo} in reserve.`:''}`,{actor:f.id,dice:d100Dice(at.roll)});
  if(t.kind==='ai'){
   const shield=arenaShieldStopsMissiles(t),evade=!t.prone&&!cannotRespond(t)&&at.grade>=2&&Math.random()<.45;
   react(t.ap<=0?'none':shield&&at.grade>=2?'shield':evade?'evade':'none');
  }else render();
 });
 return true;
}
// PIT-R07/R08: no weapon parry against a missile; a shield needs Ranged Parry.
function arenaRangedReaction(p,d,action){
 if(!p?.ranged)return action;
 if(action==='parry')return 'none';
 if(action==='shield'&&!arenaShieldStopsMissiles(d))return 'none';
 if(action==='evade')d.aim=null;
 return action;
}
function arenaAttackSize(p,aw,cramped){return p.ranged?p.ranged.force:cramped?Math.max(1,aw.size-engagementInfo().gap):aw.size;}
// PIT-R01/R09: improvised throws halve the weapon roll; Long range halves damage.
function arenaRangedDamage(p,dmg,weaponDmg){
 const notes=[];let weapon=weaponDmg.total;
 if(p.ranged.halved){weapon=Math.ceil(weapon/2);notes.push('Throw Weapons halves the weapon roll');}
 let total=Math.max(0,weapon+(dmg.dmValue||0));
 if(p.ranged.band==='long'){total=PitsRanged.bandDamage(total,'long');notes.push('Long range halves damage');}
 dmg.total=total;p.ranged.damageNote=notes.join('; ');
 if(notes.length)log('Ranged damage',`${notes.join('; ')}: ${total} damage before parry and armour.`,'system');
}
// PIT-R10/R15: a missile lodges at its printed Impale Size; the shooter does
// not hold it. A thrown weapon stays in the wound until someone pulls it out.
function arenaRangedImpale(p,atk,def,loc,akey,aw){
 def.impaledWounds.push({attacker:atk.id,loc,weaponSize:p.ranged.impaleSize||aw.size,missile:true,weapon:akey,unique:p.ranged.unique});
 if(p.ranged.unique)atk.impaledWeapon={target:def.id,loc,weapon:akey,thrown:true};
 log('Impaled missile',`${aw.name} lodges in ${def.name}'s ${loc}. ${p.ranged.unique?`${atk.name} must reach ${def.name} to pull it free.`:'It stays there until pulled out.'}`,'hurt','Core pp.97, 109',{actor:atk.id,target:def.id,location:loc});
}
// PIT-R10: a thrown weapon that did not lodge lands where the target stands.
function arenaRangedSettle(p){
 if(!p?.ranged?.unique)return;
 const a=S.fighters[p.atk];
 if(!a?.thrownAway||a.impaledWeapon?.thrown)return;
 a.thrownAway=false;a.disarmed=true;a.droppedMetres=0;a.recoveringWeapon=false;
 log('Thrown weapon lands',`The ${ARENA_WEAPONS[a.weapon].name} lies on the ground at ${S.fighters[p.def].name}'s feet. Reach it, pick it up and ready it.`,'system','',{actor:a.id});
}
// PIT-R12/R14: filter the melee list for a missile and add the ranged effects.
function arenaRangedEffects(p,offense,actor,target,out,add,crit){
 const drop=ids=>{for(let i=out.length-1;i>=0;i--)if(ids(out[i][0]))out.splice(i,1);};
 if(!offense){if(S.disengaged)drop(id=>PitsRanged.NEEDS_REACH.has(id));return;}
 const profile=(ARENA_WEAPONS[p.attackKey]?.profile)||arenaThrownProfile(p.attackKey)?.profile;
 const c={critical:crit,success:p.attackRoll?.grade>=2,band:p.ranged.band,stationaryOrUnaware:p.ranged.stationary,profile,
  defenderShield:target.shield!=='none'&&!target.shieldLost&&!target.shieldFouled,cover:false,secondTarget:false};
 drop(id=>!PitsRanged.offenceAllowed(id,c));
 const has=id=>out.some(x=>x[0]===id);
 if(!has('choose')&&PitsRanged.offenceAllowed('choose',c))add('choose',crit?'Critical: pick where the missile lands.':'Close range, stationary target: pick where it lands.');
 for(const id of ['impale','bleed','stun','sunder'])if(!has(id)&&PitsRanged.offenceAllowed(id,c))add(id);
 if(!has('pinWeapon')&&PitsRanged.offenceAllowed('pinWeapon',c))add('pinWeapon','Javelin fouls their shield until they clear it');
 add('drop','A wound forces opposed Endurance or they collapse');
 add('marksman','Shift the rolled location to an adjoining one');
 add('pinDown','Opposed Willpower or they cannot return fire next turn');
 add('rapidReload','Your next reload takes one turn less');
}
function arenaRangedApplyEffect(effect,p,actor,target){
 const note=(t,b)=>log(t,b,'hit','',{actor:actor.id});
 if(effect==='drop'){p.dropFoe=true;note('Drop Foe',`${actor.name} aims for shock: a wound forces ${target.name} to test Endurance.`);finishOneEffect();return true;}
 if(effect==='marksman'){p.marksman=true;note('Marksman',`${actor.name} may shift the hit to an adjoining location.`);finishOneEffect();return true;}
 if(effect==='rapidReload'){if(actor.missile)actor.missile.rapid=(actor.missile.rapid||0)+1;note('Rapid Reload',`${actor.name}'s next reload takes one turn less (${actor.missile?.rapid||0} stacked).`);finishOneEffect();return true;}
 if(effect==='pinWeapon'){target.shieldFouled=true;target.warded=[];note('Pin Weapon · Shield',`The ${arenaProfile(p.attackKey).name} fouls ${target.name}'s shield; it cannot parry or ward until cleared (1 AP).`);finishOneEffect();return true;}
 if(effect==='pinDown'){
  requestSkill(target.id,target.willpower??50,`Pin Down · ${target.name} Willpower`,res=>{
   const resists=opposedBetter(res,p.attackRoll);
   if(!resists){const own=S.order[S.turnIndex]===target.id;target.pinnedDownTurns=Math.max(target.pinnedDownTurns||0,own?2:1);}
   log('Pin Down',`${target.name} Willpower ${res.roll} (${res.label}) vs attack ${p.attackRoll.roll}: ${resists?'keeps their nerve':'cannot return fire on their next turn'}.`,'hit','Core p.98',{actor:actor.id,dice:d100Dice(res.roll)});
   finishOneEffect();
  });
  return true;
 }
 return false;
}
// PIT-R13 Marksman: after the random roll, move one step to an adjoining area.
function arenaMarksman(p,loc,next){
 const options=PitsRanged.ADJACENT[loc]||[];if(!options.length)return false;
 const atk=S.fighters[p.atk],def=S.fighters[p.def];
 if(atk.kind==='human'){p.kind='marksman';p.marksmanFrom=loc;p.marksmanFinish=next;render();return true;}
 const best=[loc,...options].sort((x,y)=>(def.hp[x]-armourAt(def,x))-(def.hp[y]-armourAt(def,y)))[0];
 if(best!==loc)log('Marksman',`${atk.name} shifts the hit from ${loc} to ${best}.`,'hit','',{actor:atk.id});
 next(best);return true;
}
function chooseMarksman(loc){
 const p=S.pending;if(!p||p.kind!=='marksman'||R)return;
 if(loc!==p.marksmanFrom&&!(PitsRanged.ADJACENT[p.marksmanFrom]||[]).includes(loc))return;
 const next=p.marksmanFinish;p.kind='resolving';p.marksmanFinish=null;
 if(loc!==p.marksmanFrom)log('Marksman',`${S.fighters[p.atk].name} shifts the hit from ${p.marksmanFrom} to ${loc}.`,'hit','',{actor:p.atk});
 next(loc);
}
// PIT-R13 Drop Foe: needs a wound, then opposed Endurance or incapacitation.
function arenaDropFoe(p,atk,def,wound,next){
 p.dropDone=true;
 if(wound<=0){log('Drop Foe',`No wound, so ${def.name} does not test against shock.`,'system');return false;}
 requestSkill(def.id,def.endurance,`Drop Foe · ${def.name} Endurance`,res=>{
  const resists=opposedBetter(res,p.attackRoll);
  log('Drop Foe',`${def.name} Endurance ${res.roll} (${res.label}) vs attack ${p.attackRoll.roll}: ${resists?'fights through the shock':'collapses, incapacitated by shock and pain'}.`,'hurt','Core p.97',{actor:def.id,dice:d100Dice(res.roll)});
  if(resists)next();else endFight(atk.id,`${def.name} is incapacitated by shock and pain (Drop Foe).`);
 });
 return true;
}
// PIT-R05/R06: Load (projectile weapons) or Ready (thrown missiles).
function arenaLoad(id){
 if(S.phase!=='fight'||S.pending||R)return false;
 const f=S.fighters[id],opt=arenaRangedOption(f);if(!opt||opt.kind!=='fire'||!f.missile)return false;
 const st=f.missile,need=PitsRanged.loadNeeded(st,opt.profile);
 if(st.loaded||(st.ammo<=0&&!(opt.profile.thrown&&st.spare>0)))return false;
 if(need>0&&!(opt.profile.thrown&&st.spare>0)&&f.ap<1)return false;
 const res=PitsRanged.loadStep(st,opt.profile);f.aim=null;
 const verb=opt.profile.thrown?'Ready Weapon':'Load';
 if(res.free){
  log(verb,res.spare?`${f.name} switches the spare in the off hand to the throwing hand (free action).`:`${f.name} reloads at once: Rapid Reload covered the whole Load time.`,'system','Core pp.92, 99',{actor:id});
  render();return true;
 }
 f.ap--;
 log(verb,res.done?`${f.name} ${opt.profile.thrown?'readies another':'finishes loading the'} ${opt.profile.name}. ${st.ammo} left in reserve.`:`${f.name} loads (${res.progress} of ${res.need} turns).`,'system','Core pp.65, 109',{actor:id});
 advanceStun(f);S.turnIndex++;advance();return true;
}
// PIT-R04: Aim spends a turn; it is ready after one whole Combat Round.
function arenaAim(id){
 if(S.phase!=='fight'||S.pending||R)return false;
 const f=S.fighters[id],opt=arenaRangedOption(f);
 if(!opt||f.ap<1||(opt.kind==='fire'&&!f.missile?.loaded))return false;
 f.ap--;if(!f.aim)f.aim={round:S.round,cycle:S.cycle};
 const ready=PitsRanged.aimComplete(f.aim,S.round);
 log('Aim',ready?`${f.name} holds the aim; the next shot is already aimed (further aiming adds nothing).`:`${f.name} takes aim. After a whole Combat Round the next shot improves one situational grade.`,'system','Core p.107',{actor:id});
 advanceStun(f);S.turnIndex++;advance();return true;
}
// PIT-R16: Move changes the metre gap by Movement x gait; melee needs gap 0.
function arenaMove(id,gait){
 if(S.phase!=='fight'||S.pending||R||!S.disengaged)return false;
 const f=S.fighters[id];if(!f||f.ap<1||f.prone||entangledLegs(f)||!['walk','run','sprint'].includes(gait))return false;
 const gap=Math.max(0,S.gapMetres||0),metres=PitsRanged.moveMetres(f.movement,gait),left=Math.max(0,gap-metres);
 f.ap--;f.braced=false;f.aim=null;f.gait=gait;f.gaitRound=S.round;S.gapMetres=left;
 if(left===0){S.disengaged=false;if(engagementInfo().active)S.engagement='long';}
 log('Move',`${f.name} ${gait==='walk'?'walks':gait==='run'?'runs':'sprints'} ${Math.min(gap,metres)}m${left?`; ${left}m still separate them.`:' and engages.'}`,'system','Core p.91: Movement × '+({walk:1,run:3,sprint:5}[gait])+'.',{actor:id});
 advanceStun(f);S.turnIndex++;advance();return true;
}
// PIT-R15: someone at the wound pulls a missile out (Ready Weapon + Brawn).
function arenaExtractable(f){return (f.impaledWounds||[]).find(w=>w.missile)||null;}
function arenaExtract(id){
 if(S.phase!=='fight'||S.pending||R)return false;
 const f=S.fighters[id],w=arenaExtractable(f);if(!w||f.ap<1)return false;
 f.ap--;S.pending={kind:'missileExtract',actor:id};
 requestSkill(id,f.brawn,`Pull out missile · ${f.name} Brawn`,br=>{
  if(br.grade<2){log('Pull out missile',`${f.name} Brawn ${br.roll} (${br.label}): it stays lodged.`,'system','',{actor:id,dice:d100Dice(br.roll)});endAction();return;}
  f.impaledWounds=f.impaledWounds.filter(x=>x!==w);
  const wd=arenaProfile(w.weapon),thrower=S.fighters[w.attacker];
  if(w.unique&&thrower?.impaledWeapon?.thrown){thrower.impaledWeapon=null;thrower.thrownAway=false;thrower.disarmed=true;thrower.droppedMetres=0;thrower.recoveringWeapon=false;}
  requestDice(id,Array.from({length:wd.dice[0]},(_,i)=>({sides:wd.dice[1],label:'Extraction '+(i+1)})),`Pull out missile · ${wd.barbed?'full (Barbed)':'half'} damage · ${w.loc}`,values=>{
   const raw=values.reduce((a,b)=>a+b,0)+wd.bonus,wound=Math.max(0,wd.barbed?raw:Math.ceil(raw/2));
   f.hp[w.loc]-=wound;registerWound(f,w.loc,wound);f.lastDamage={loc:w.loc,wound,attacker:f.name,weapon:wd.name};
   log('Pull out missile',`${f.name} Brawn ${br.roll} (${br.label}) pulls the ${wd.name} out: ${raw} damage, ${wd.barbed?'full (Barbed)':'halved to '+wound}, no armour or Damage Modifier.${w.unique?' It drops at '+f.name+"'s feet.":''}`,'hurt','Core pp.97–98',{actor:id,target:id,location:w.loc,impact:{target:id,location:w.loc,hpLost:wound}});
   const cls=zoneClass(f,w.loc);
   if(wound>0&&(cls==='serious'||cls==='major'))resolveWound(thrower||f,f,w.loc,cls,wound,br,()=>endAction());else endAction();
  });
 });
 return true;
}
function arenaClearShield(id){
 const f=S.fighters[id];if(S.pending||R||!f?.shieldFouled||f.ap<1)return false;
 f.ap--;f.shieldFouled=false;log('Clear shield',`${f.name} wrenches the missile out of the shield (1 AP).`,'system','',{actor:id});
 advanceStun(f);S.turnIndex++;advance();return true;
}
// AI turn for anyone holding a missile weapon or separated from the foe.
// Returns true when it took the turn.
function arenaRangedAiTurn(id){
 const f=S.fighters[id],opt=arenaRangedOption(f);
 if(f.shieldFouled&&f.ap>0&&!S.disengaged&&Math.random()<.5)return arenaClearShield(id);
 if(arenaExtractable(f)&&f.ap>0&&Math.random()<.4)return arenaExtract(id);
 if(opt?.kind==='fire'){
  const ready=arenaRangedReady(f,opt);
  if(ready.ok)return beginRangedAttack(id);
  if(!f.missile.loaded&&(f.missile.ammo>0||f.missile.spare>0))return arenaLoad(id);
  if(!f.missile.loaded){endFight(arenaOpponent(f).id,`${f.name} has no missiles left and concedes the bout.`);return true;}
  if(ready.plan?.band==='out'&&S.disengaged)return arenaMove(id,'walk');
  f.ap--;advanceStun(f);log('Hold',`${f.name} holds: ${ready.reason}`,'system','',{actor:id});S.turnIndex++;advance();return true;
 }
 if(!S.disengaged||(S.gapMetres||0)<=3)return false;
 if(opt&&arenaRangedReady(f,opt).ok&&Math.random()<.3)return beginRangedAttack(id);
 if(f.prone||entangledLegs(f))return false;
 return arenaMove(id,S.gapMetres>f.movement?'run':'walk');
}
function arenaAmmoText(f,opt){
 if(opt.kind==='throw')return 'Your only '+ARENA_WEAPONS[f.weapon].name.toLowerCase()+': it leaves your hand';
 const st=f.missile;return `${st.loaded?'Loaded':'Unloaded'} · ${st.ammo} in reserve`+(st.rapid?` · Rapid Reload ${st.rapid}`:'');
}
function arenaRangedButtonsHtml(f){
 const opt=arenaRangedOption(f),out=[];
 if(opt&&(opt.kind==='fire'||S.disengaged)){
  const ready=arenaRangedReady(f,opt),plan=ready.plan||arenaRangedPlan(f,opt);
  out.push(`<button class="choice gold" data-act="rangedFire" ${ready.ok?'':'disabled'}><strong>${opt.kind==='throw'?'Throw':'Shoot'} · 1 AP</strong><small>${esc(ready.ok?`${plan.target}% (${plan.grade}) · ${plan.band} range · ${arenaAmmoText(f,opt)}`:ready.reason)}</small></button>`);
  if(opt.kind==='fire'&&!f.missile.loaded){
   const need=PitsRanged.loadNeeded(f.missile,opt.profile),spare=opt.profile.thrown&&f.missile.spare>0,can=f.missile.ammo>0||spare;
   out.push(`<button class="choice" data-act="rangedLoad" ${can&&(f.ap>=1||need===0||spare)?'':'disabled'}><strong>${opt.profile.thrown?'Ready Weapon':'Load'}${need===0||spare?' · free':' · 1 AP'}</strong><small>${can?(opt.profile.thrown?'Draw the next missile':`${f.missile.progress} of ${need} Load turns done`):'No ammunition left'}</small></button>`);
  }
  if(opt.kind==='throw'||f.missile.loaded)out.push(`<button class="choice" data-act="rangedAim" ${f.ap>=1?'':'disabled'}><strong>Aim · 1 AP</strong><small>${PitsRanged.aimComplete(f.aim,S.round)?'Aimed: the next shot eases one situational grade':f.aim?'Aiming: ready after a whole Combat Round':'Ready after a whole Combat Round; moving breaks it'}</small></button>`);
 }
 if(arenaExtractable(f))out.push(`<button class="choice" data-act="extractMissile" ${f.ap>=1?'':'disabled'}><strong>Pull out missile · 1 AP</strong><small>Brawn; half its damage again (full if Barbed)</small></button>`);
 if(f.shieldFouled)out.push(`<button class="choice" data-act="clearShield" ${f.ap>=1?'':'disabled'}><strong>Clear shield · 1 AP</strong><small>A javelin fouls your shield</small></button>`);
 return out.join('');
}
function arenaSeparatedHtml(f){
 const gap=S.gapMetres||0,move=g=>{const m=PitsRanged.moveMetres(f.movement,g);return `<button class="choice${g==='walk'?' gold':''}" data-act="move" data-val="${g}" ${f.ap<1||f.prone||entangledLegs(f)?'disabled':''}><strong>${g==='walk'?'Walk':g==='run'?'Run':'Sprint'} ${Math.min(gap,m)}m · 1 AP</strong><small>${m>=gap?'Reach your opponent':`${gap-m}m left`}${g==='walk'?'':' · harder to hit with missiles'}</small></button>`;};
 const moves=gap<=3?`<button class="choice gold" data-act="reengage" ${f.prone?'disabled':''}><strong>Move to Engage</strong><small>Short gap: no separate Move action</small></button>`:['walk','run','sprint'].map(move).join('');
 return `<div class="turnline"><h3>${esc(f.name)} · Separated</h3><span>${gap}m gap · ${f.ap} AP</span></div><div class="choicegrid">${arenaRangedButtonsHtml(f)}${moves}${f.prone&&canRegainFooting(f)?'<button class="choice" data-act="stand"><strong>Regain Footing · 1 AP</strong></button>':''}<button class="choice" data-act="dither"><strong>Wait · 1 AP</strong></button><button class="choice" data-act="yield"><strong>Concede Bout · 0 AP</strong></button></div>`;
}
function arenaRangedPendingHtml(p){
 if(p?.kind!=='marksman')return '';
 const def=S.fighters[p.def],locs=[p.marksmanFrom,...(PitsRanged.ADJACENT[p.marksmanFrom]||[])];
 return `<div class="turnline"><h3>Marksman · shift the hit?</h3><span>Rolled ${esc(p.marksmanFrom)}</span></div><div class="choicegrid">${locs.map((l,i)=>`<button class="choice${i?'':' gold'}" data-act="marksmanLoc" data-val="${esc(l)}"><strong>${i?'Shift to ':'Keep '}${esc(l)}</strong><small>${def.hp[l]}/${def.maxHp[l]} HP · ${armourAt(def,l)} armour</small></button>`).join('')}</div>`;
}
function arenaRangedSetupHtml(){
 const dist=ARENA_DISTANCES.map(m=>`<option value="${m}" ${Number(config.startDistance||0)===m?'selected':''}>${m?m+' m apart':'Engaged (0 m)'}</option>`).join('');
 const weather=Object.entries(ARENA_WEATHER).map(([k,n])=>`<option value="${k}" ${(config.weather||'clear')===k?'selected':''}>${n}</option>`).join('');
 return `<div class="formgrid ranged-setup"><label>Starting distance<select id="startDistance">${dist}</select></label><label>Arena conditions<select id="weather">${weather}</select></label></div>`;
}
function arenaReadRangedSetup(){
 const d=$('#startDistance'),w=$('#weather');
 if(d&&ARENA_DISTANCES.includes(Number(d.value)))config.startDistance=Number(d.value);
 if(w&&ARENA_WEATHER[w.value])config.weather=w.value;
}
function arenaApplyStartDistance(){
 const gap=Number(config.startDistance)||0;S.weather=config.weather||'clear';
 if(gap>0){S.disengaged=true;S.gapMetres=gap;}
}
function arenaRangedClick(act,v){
 if(act==='marksmanLoc'){chooseMarksman(v);return;}
 const id=S.order?.[S.turnIndex],f=S.fighters?.[id];if(f?.kind!=='human')return;
 if(act==='rangedFire')beginRangedAttack(id);
 else if(act==='rangedLoad')arenaLoad(id);
 else if(act==='rangedAim')arenaAim(id);
 else if(act==='move')arenaMove(id,v);
 else if(act==='extractMissile')arenaExtract(id);
 else if(act==='clearShield')arenaClearShield(id);
}
