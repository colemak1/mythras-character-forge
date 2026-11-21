// The Pits: the bottom third of the battle screen (layout E "Odds first", chosen by the owner 2026-11-14,
// then reworked for new players: "so much just happened and I don't know what's going on").
//
//   left    Your moves: the actions for your turn AND the defences for when you are attacked
//   middle  What's happening: where the exchange is (Action, Defence, Special Effects, Location, Damage),
//           what has happened so far in plain words, and the decision itself. Special Effects and Choose
//           Location are chosen here instead of in a window over the arena.
//   right   Details: whatever the pointer (or keyboard focus) is on, with its odds; otherwise the selection.
//
// PRESENTATION ONLY, like pits-arena.js: every number comes from the engine (pitsLegalActions,
// combatTarget, evadeTarget, effectiveSkill, rollSkill, CombatRules.opposedWins, effectsWonBy, the log)
// and every button that does something carries the engine's own data-act. Choices are made in two steps
// (select, then Confirm or Enter) so the details can be read first.
// Phones (<=900px) and ?bottom=current keep the older deck in pits-arena.js.

const PB={sel:null,def:null,fx:null,hover:null,key:'',wired:false};

function pitsBottomLayout(){
  try{if(window.matchMedia&&matchMedia('(max-width:900px)').matches)return 'current';}catch(e){}
  try{if(/[?&]bottom=current\b/.test(location.search))return 'current';}catch(e){}
  return 'E';
}
const pbOn=()=>pitsBottomLayout()==='E';

// ---- what is being decided, and by whom ----
// Number keys follow this order (Attack first, Concede last), not the engine's list order.
const PB_ORDER=['attack','shieldAttack','brace','dither','delay','changeRange','disengage','stand'];
const pbRank=a=>{const i=PB_ORDER.indexOf(a.act);return a.act==='yield'?999:i<0?100:i;};
const pbOrder=list=>list.map((a,i)=>[a,i]).sort((x,y)=>pbRank(x[0])-pbRank(y[0])||x[1]-y[1]).map(x=>x[0]);
const pbHuman=id=>S.fighters?.[id]?.kind==='human';
const pbOther=id=>id==='a'?'b':'a';
const pbCost=a=>a.ap?a.ap+' AP':'free';
const pbPct=n=>Math.round(n)+'%';

// The defences the engine offers the defender now (or would offer: shown greyed outside a reaction).
function pbDefences(id,live){
  const f=S.fighters[id],p=S.pending,out=[];
  if(live&&p?.kind==='range'){
    out.push({val:'permit',act:'rangeRespond',label:'Allow the move',ap:0,enabled:true});
    out.push({val:'oppose',act:'rangeRespond',label:'Oppose (Evade)',ap:1,pct:evadeTarget(f),enabled:canOpposeRange(f)});
    out.push({val:'intercept',act:'rangeRespond',label:'Intercept (attack)',ap:1,pct:combatTarget(f),enabled:canInterceptRange(f)});
    return out;
  }
  const w=ARENA_WEAPONS[f.weapon]||{};
  // usable: the defence exists for this fighter now; enabled: it can be chosen now (a reaction is waiting for it).
  // why: the plain reason an unusable defence is unusable (a pinned weapon, a stunned head, no AP...)
  // (a defence at 0% is Hopeless: no attempt can be made, so it is not offered, Core p.38, PR #336)
  const def=(o,why)=>{if(!why&&o.pct!=null&&o.pct<=0)why='Hopeless: no attempt can be made (Core p.38).';
    o.usable=!why;o.why=why||'';o.enabled=live&&o.usable;out.push(o);};
  const parryWhy=f.ap<=0?'No Action Points remaining.':(unavailableReaction(f,'weapon')||(!canParryAtReach(f.id)?'You cannot parry at this reach.':''));
  def({val:'parry',act:'react',label:'Parry ('+(f.disarmed?'weapon':w.name||'weapon')+')',ap:1,pct:combatTarget(f,'weapon')},parryWhy);
  if(f.shield!=='none')def({val:'shield',act:'react',label:'Parry ('+(SHIELDS[f.shield]?.name||'shield')+')',ap:1,pct:combatTarget(f,'shield')},
    f.ap<=0?'No Action Points remaining.':!canShieldParry(f)?(unavailableReaction(f,'shield')||'The shield cannot parry now.'):'');
  def({val:'evade',act:'react',label:'Evade',ap:1,pct:evadeTarget(f)},f.ap<=0?'No Action Points remaining.':cannotRespond(f)?unavailableReaction(f,'evade'):'');
  def({val:'none',act:'react',label:'Do not defend',ap:0},'');
  return out;
}

function pbCtx(){
  const phase=pitsPhase(),p=S.pending,turn=S.order?.[S.turnIndex];
  const reacting=!V.busy&&!R&&p&&((p.kind==='reaction'&&pbHuman(p.def))||(p.kind==='range'&&pbHuman(p.defender)));
  const choosingFx=!V.busy&&!R&&p&&['effect','location'].includes(p.kind)&&pbHuman(p.owner);
  // whose moves the left column shows: the decision's owner, else the human whose turn it is, else player one
  const id=reacting?(p.kind==='range'?p.defender:p.def):choosingFx?p.owner:pbHuman(turn)?turn:'a';
  const me=S.fighters[id],foe=S.fighters[pbOther(id)];
  const live=phase==='action'&&!V.busy&&!p&&!R;
  const list=pbOrder(pitsLegalActions(id)),defs=pbDefences(id,!!reacting);
  const key=[S.round,S.cycle,S.turnIndex,id,p?.kind||'',p?.effectsLeft??''].join(':');
  if(PB.key!==key){PB.key=key;PB.sel=null;PB.def=null;PB.fx=null;}
  const on=list.filter(a=>a.enabled);
  // the recommended move starts selected; the player can pick another before confirming
  const rec=live?pitsRecommendedAction(id):null,recD=reacting?pitsRecommendedDefence(id,defs):null;
  const sel=live?(on.find(a=>a.act===PB.sel)||on.find(a=>a.act===rec?.act)||on.find(a=>a.act==='attack')||on[0]||null):null;
  const donD=defs.filter(d=>d.enabled);
  const def=reacting?(donD.find(d=>d.val===PB.def)||donD.find(d=>d.val===recD?.val)||null):null;
  const fxList=choosingFx&&p.kind==='effect'?availableEffects(p):[];
  // (the recommended effect starts selected, as the recommended action and defence do; Idea 20261117-182931)
  const recF=choosingFx&&p.kind==='effect'?pitsRecommendedEffect(p):null;
  const fx=fxList.find(([fid])=>fid===PB.fx)||fxList.find(([fid])=>fid===recF?.id)||null;
  return {phase,p,id,me,foe,live,list,sel,defs,def,rec,recD,recF,reacting:!!reacting,choosingFx:!!choosingFx,fxList,fx};
}

// ---- left: your moves ----
const pbPips=f=>`<span class="bpips" aria-label="${f.ap} of ${f.apMax} action points">${Array.from({length:f.apMax},(_,i)=>`<i class="${i<f.ap?'on':''}"></i>`).join('')}</span>`;
function pbActionRows(c){
  return c.list.map((a,i)=>{
    const on=c.live&&a.enabled,picked=c.sel&&a.act===c.sel.act;
    return `<button type="button" class="brow${picked?' sel':''}${on?'':' off'}${on&&c.rec?.act===a.act?' rec':''}" data-pa="sel" data-val="${a.act}" data-pb-info="act:${a.act}" ${on?'':'aria-disabled="true"'}>
      <kbd>${c.live&&i<9?i+1:''}</kbd><span class="nm">${esc(a.label)}</span>${c.rec?.act===a.act?'<span class="brec">Recommended</span>':''}<span class="co">${pbCost(a)}</span></button>`;
  }).join('');
}
function pbDefenceRows(c){
  return c.defs.map((d,i)=>{
    const picked=c.def&&d.val===c.def.val;
    return `<button type="button" class="brow def${picked?' sel':''}${d.enabled?'':' off'}${d.enabled&&c.recD?.val===d.val?' rec':''}" data-pa="def" data-val="${d.val}" data-pb-info="def:${d.val}" ${d.enabled?'':'aria-disabled="true"'}>
      <kbd>${c.reacting&&i<9?i+1:''}</kbd><span class="nm">${esc(d.label)}</span>${c.recD?.val===d.val?'<span class="brec">Recommended</span>':''}${d.pct!=null?`<span class="pc">${d.pct}%</span>`:''}<span class="co">${d.ap?d.ap+' AP':'free'}</span></button>`;
  }).join('');
}
function pbLeft(c){
  // The group that matters now is open; the other stays as a one-line reminder of what exists.
  const defFirst=c.reacting||c.phase==='opponent';
  const acts=defFirst?`<section class="bgrp shut" aria-label="Actions on your turn"><p class="bsum"><b>Your turn:</b> ${c.list.filter(a=>a.enabled).slice(0,4).map(a=>esc(a.label)).join(' · ')||'none'}</p></section>`
    :`<section class="bgrp" aria-label="Actions on your turn"><span class="lbl"><span>Actions · your turn</span>${pbPips(c.me)}</span>${pbActionRows(c)}</section>`;
  const p=c.p,rangeQ=c.reacting&&p?.kind==='range';
  const defs=defFirst?`<section class="bgrp" aria-label="${rangeQ?'Answer the range change':'Defences when attacked'}"><span class="lbl"><span>${rangeQ?'Answer · range change':'Defences · when attacked'}</span>${pbPips(c.me)}</span>${pbDefenceRows(c)}</section>`
    :`<section class="bgrp shut" aria-label="Defences when attacked"><p class="bsum"><b>When attacked:</b> ${c.defs.map(d=>esc(d.label.replace(/ \(.*\)/,''))+(!d.usable?' <i>(not now)</i>':d.pct!=null?' '+d.pct+'%':'')).join(' · ')}</p></section>`;
  return `<div class="blist" role="group" aria-label="${esc(c.me.name)}: your moves">${defFirst?defs+acts:acts+defs}</div>`;
}

// ---- middle: what's happening ----
const PB_STEPS=[['act','Action'],['def','Defence'],['fx','Effects'],['loc','Location'],['dmg','Damage']];
function pbStepOf(label){
  const l=String(label||'');
  if(/^(Parry|Evade)\b/i.test(l))return 'def';
  if(/^(Hit Location|Choose Location)/i.test(l))return 'loc';
  if(/^(Damage|Impale|Bleed|Stun|Endurance|Bash)/i.test(l))return 'dmg';
  if(/^(Trip|Resist|Blind|Disarm|Damage Weapon|Accidental|Pin)/i.test(l))return 'fx';
  return 'act';
}
function pbStepNow(c){
  const p=c.p,roll=V.busy?V.roll:R;
  if(roll)return pbStepOf(roll.label);
  if(V.busy){const g=pbExchange();const last=g?.entries[g.entries.length-1];return last?pbStepOf(last.title):'act';}
  if(p){
    if(p.kind==='reaction'||p.kind==='range')return 'def';
    if(p.kind==='location')return 'loc';
    if(['impalePick','impaleLeave'].includes(p.kind))return 'dmg';
    return 'fx';
  }
  return 'act';
}
// The exchange on screen: the one in progress, else the last one.
function pbExchange(){const ex=paExchanges();return ex[ex.length-1]||null;}
const PB_ROLL=/(attacks|strikes with the shield|makes a Remise attack|parries( with shield)?|evades)$/;
const PB_GRADE_WORD={critical:'Critical success',success:'Success',failure:'Failure',fumble:'Fumble'};
function pbRollOf(l){
  if(!PB_ROLL.test(l.title))return null;
  const m=/^(\d+)\s+(?:against|vs)\s+[^0-9]*?(\d+)%[^A-Za-z]*(CRITICAL|SUCCESS|FAILURE|FUMBLE)/i.exec(String(l.body||''));
  return m?{roll:+m[1],pct:+m[2],grade:m[3].toLowerCase()}:null;
}
const pbClip=(s,n)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).trimEnd()+'…':s;};
// A Trip in plain words (report review FR-02, 2026-11-14: "looks like he tried to trip me and failed but not really sure"):
// whose Special Effect it was, the two rolls compared (the resistance and the roll that earned the trip), and the result.
function pbTripLine(l,g){
  const m=/^(.+?) (Brawn|Evade|Acrobatics) (\d+)\/(\d+)% \((\w+)\): (remains standing|falls prone)/.exec(String(l.body||''));
  if(!m)return null;
  const owner=l.meta?.actor,offensive=!owner||owner===g.atk,target=S.fighters[owner==='a'?'b':owner==='b'?'a':''];
  const you=target&&pbHuman(target.id)&&!pbHuman(owner),who=you?'You':esc(m[1]);
  // the roll the resistance had to beat: the attack roll for the attacker's trip, the defence roll for the defender's
  let vs=null;for(const e of g.entries){const r=pbRollOf(e);if(!r)continue;const atk=/(attacks|strikes with the shield|makes a Remise attack)$/.test(e.title);if(atk===offensive){vs={r,title:e.title};break;}}
  const stands=m[6]==='remains standing',res=m[5].toLowerCase(),word={critical:'Critical success',success:'Success',failure:'Failure',fumble:'Fumble'}[res]||m[5];
  const head=stands?(you?'You resist the trip and stay standing':`${who} resists the trip and stays standing`):(you?'You are tripped and fall prone':`${who} is tripped and falls prone`);
  const from=`${offensive?'the attacker':'the defender'}'s Special Effect from this exchange`;
  return {cls:stands?'fx':'hurt',html:`<b>${head}</b> (Trip Opponent, ${from}). ${who} rolled <b>${m[3]}</b> on ${m[2]} ${m[4]}% · ${esc(word)}`
    +(vs?`, against the ${offensive?'attack':'defence'} roll of <b>${vs.r.roll}</b> (${esc(PB_GRADE_WORD[vs.r.grade]||'')})`:'')+'.'};
}
// A Disarm in plain words (report 20261115-000640: "wasn't sure if I resisted the disarm"): whose Special Effect it was,
// the resisting roll, and whether the weapon stays.
function pbDisarmLine(l){
  const m=/^(.+?) rolls (\d+) against (\d+)% \((\w+)\)\. (Keeps|Loses) weapon/.exec(String(l.body||''));if(!m)return null;
  const owner=S.fighters[l.meta?.actor],target=owner?S.fighters[pbOther(owner.id)]:null;
  const you=target&&pbHuman(target.id)&&!pbHuman(owner.id),who=you?'You':esc(m[1]),keeps=m[5]==='Keeps';
  const word=PB_GRADE_WORD[m[4].toLowerCase()]||m[4];
  const head=keeps?(you?'You resist the disarm and keep your weapon':`${who} resists the disarm and keeps the weapon`)
    :(you?'You are disarmed':`${who} is disarmed`);
  return {cls:keeps?'fx':'hurt',html:`<b>${head}</b> (Disarm Opponent, ${owner?esc(owner.name)+"'s":'a'} Special Effect). ${who} rolled <b>${m[2]}</b> against ${m[3]}% · ${esc(word)}.`};
}
// A Serious or Major Wound's Endurance roll in plain words (report 20261117-184544: "it's not obvious what you need to
// roll on endurance rolls to stay up and ... what it does in general"): the two rolls, why one wins, and what it meant.
function pbWoundLine(l){
  const t=/^(SERIOUS|MAJOR) WOUND · (.+)$/.exec(l.title||'');if(!t)return null;
  const m=/^(.+?) Endurance (\d+)\/(\d+)% \((\w+)\) versus the attack (\d+) \((\w+)\)\. (Resists|Fails)[^:.]*(?:: ([^.]+))?\.(?: Endurance (\d+)% made harder by ([^.]+)\.)?/.exec(String(l.body||''));
  if(!m)return null;
  const level=t[1].toLowerCase(),loc=t[2],ok=m[7]==='Resists',owner=S.fighters[l.meta?.actor];
  const you=owner&&pbHuman(owner.id)&&!pbHuman(pbOther(owner.id)),who=you?'You':esc(m[1]);
  const st=paWoundStakes(level,loc,you?'you':m[1]),word=g=>esc(PB_GRADE_WORD[g.toLowerCase()]||g);
  // what it did, first and in plain words (report 20261120-214527: "it looks like he should have died there": a failed
  // Endurance roll on a Serious Wound to an arm costs the arm, and the fight goes on)
  const said=ok?st.ok:st.bad,over=/the bout is over/.test(said);
  const raw=you?'You':m[1],lead=ok?`${raw} ${you?'resist':'resists'}: ${said}`:said.replace(/^the /,you?'Your ':`${raw}'s `).replace(/^./,c=>c.toUpperCase());
  return {cls:ok?'fx':'hurt',html:`<b>${esc(lead)}${over?'':' The fight goes on.'}</b> `
    +`${who} ${ok?(you?'resist':'resists'):(you?'fail':'fails')} the ${level==='major'?'Major':'Serious'} Wound to the ${esc(loc)}: `
    +`Endurance <b>${m[2]}</b> against ${m[3]}%${m[9]?` (${m[9]}%, made harder by ${esc(m[10])})`:''} · ${word(m[4])}, against the attack roll of <b>${m[5]}</b> · ${word(m[6])}`
    +(m[8]?`: <b>${esc(m[8])}</b>. `:'. ')
    +`To resist, Endurance must beat the attack roll: a better grade, or the same grade and a higher roll (Core p.110). `
    +(ok?`Resisted: ${esc(st.ok)}`:`Not resisted: ${esc(st.bad)}${st.ok?` (Had it been resisted: ${esc(st.ok)})`:''}`)};
}
// Special Effects whose engine line is not enough on its own for a new player (report 20261114-235608: "parry bypass was
// not so clear... make the special effect choices made by the opponent more clear"): one plain consequence each.
const PB_FX_PLAIN={
  'Circumvent Parry':'The parry still succeeded, but this blow goes around it: the parry stops none of the damage.',
  'Bypass Armour':'Armour on the location hit does not reduce this blow.',
  'Maximise Damage':'The weapon\'s damage die counts as its highest roll.',
  'Choose Location':'No hit location roll: the attacker picks where the blow lands.',
  'Press Advantage':'The one pressed back cannot attack on their next turn, but can still parry, evade and act otherwise.',
  'Overextend Opponent':'The overextended fighter cannot attack on their next turn.',
  'Force Failure':'The defence counts as failed.',
  'Enhance Parry':'This parry stops all of the weapon\'s damage, whatever its size.',
  'Arise':'Back on their feet at once, at no AP cost.'
};
const pbFxNames=()=>new Set(typeof SPECIAL_EFFECT_NAMES==='object'?Object.values(SPECIAL_EFFECT_NAMES):Object.keys(PB_FX_PLAIN));
// Plain lines for one exchange, oldest first.
function pbStory(g){
  if(!g)return [];
  const out=[],last=[...g.entries].reverse().find(l=>paBlowLine(l))||null,fxNames=pbFxNames(),told=new Set();
  let arise=null;
  for(const l of g.entries){
    const r=pbRollOf(l);
    if(r){out.push({cls:'roll',g:r.grade,html:`<b>${esc(l.title)}</b>: rolled <b>${r.roll}</b>, needed ${r.pct} or less · <span class="g">${PB_GRADE_WORD[r.grade]}</span>`});
      // Evade always ends prone, hit or miss (Core p.103; reports 20261114-235839 "why prone?" and 235443)
      if(/ evades$/.test(l.title)){const n=l.title.replace(/ evades$/,'');
        out.push({cls:'fx',html:`<b>${esc(n)} dives clear and ends prone</b>: an Evade always leaves the evader on the ground, whether it succeeds or not (Core p.103).`});}
      continue;}
    // no parry or evade: say whether it was a choice or there was no AP left (report 20261114-235648)
    if(/ does not defend$/.test(l.title)){const noAp=/no Action Points left/.test(l.body||'');
      out.push({cls:'fx',html:`<b>${esc(l.title.replace(/ does not defend$/,''))} ${noAp?'has no AP left: cannot parry or evade':'does not defend'}</b>${noAp?'':' and keeps their Action Points'}.`});continue;}
    if(l.title==='Trip Opponent'){const t=pbTripLine(l,g);if(t){out.push(t);continue;}}
    if(l.title==='Disarm Opponent'){const t=pbDisarmLine(l);if(t){out.push(t);told.add(l.title);continue;}}
    {const t=pbWoundLine(l);if(t){out.push(t);continue;}}
    // Arise is chosen before the blow is resolved, so the engine logs it before the evade's fall: tell it after the result
    if(l.title==='Arise'){arise=l;continue;}
    // a Special Effect says who chose it, once, and what it means in plain words
    if(fxNames.has(l.title)&&!told.has(l.title)){told.add(l.title);
      const owner=S.fighters[l.meta?.actor],you=owner&&pbHuman(owner.id)&&!pbHuman(pbOther(owner.id)),plain=PB_FX_PLAIN[l.title];
      out.push({cls:'fx se',html:`<b>${owner?(you?'You':esc(owner.name))+' chose ':''}${esc(l.title)}</b> (Special Effect): ${esc(pbClip(l.body,120))}${plain?' '+esc(plain):''}`});continue;}
    // (an earlier blow of the same exchange, an Impale before its withdrawal, is told where it happened; the last is the result)
    {const b=paBlowLine(l);if(b){if(l!==last)out.push({cls:'end'+(/Wounded/.test(b.head)?' hurt':''),html:`<b>${esc(b.head)}</b> · ${esc(b.math)}`});continue;}}
    if(/^(Hit Location|Damage|Choose Location)$/i.test(l.title)||l.kind==='hit'||l.kind==='hurt')
      out.push({cls:l.kind==='hurt'?'hurt':'fx',html:`<b>${esc(l.title)}</b>: ${esc(l.title==='Falling'?String(l.body||'').replace(/\s+/g,' ').trim():pbClip(l.body,120))}`});
  }
  const res=paExchangeResult(g);
  if(res)out.push({cls:'end'+(/Wounded/.test(res.head)?' hurt':''),html:`<b>${esc(res.head)}</b> · ${esc(res.math)}`});
  if(arise){const owner=S.fighters[arise.meta?.actor];
    out.push({cls:'fx se',html:`<b>${owner?esc(owner.name)+' chose ':''}Arise</b> (Special Effect): ${esc(pbClip(arise.body,120))} ${esc(PB_FX_PLAIN.Arise)}`});}
  return out;
}
// Whatever happened after the last exchange that is not part of it (Brace, Change Range, a new round...).
// (the engine logs an attempt to get free of a pin or an entanglement as a system line; it is an action, so it is told)
const PB_FREEING=/^(Pin Weapon · |Entangle · |Entangle ends)/;
function pbSince(g){
  const logs=paVisibleLogs();const last=g?.entries[g.entries.length-1];
  const at=last?logs.lastIndexOf(last):-1,rest=logs.slice(at+1).filter(l=>l.title&&(l.kind!=='system'||PB_FREEING.test(l.title)));
  return rest.slice(-2).map(l=>({cls:'note',html:`<b>${esc(l.title)}</b>${l.body?': '+esc(/^(Falling|FIGHT ENDS)$/.test(l.title)?String(l.body).replace(/\s+/g,' ').trim():pbClip(l.body,110)):''}`}));
}
// What is still holding a fighter from an earlier exchange: told from the fighters' state, not the log, so it stays in
// view for as long as it lasts (report review FR-01: a pin outlived the two exchanges the story keeps).
function pbLasting(){
  const out=[],view=pitsPresenting()&&V.shown&&V.shown.a?V.shown:S.fighters;
  for(const id of ['a','b']){
    const f=view[id],name=S.fighters[id]?.name||'';if(!f)continue;
    const by=S.fighters[f.pinnedBy]?.name||'the opponent';
    if(f.pinnedGear){const item=f.pinnedGear==='shield'?'shield':(ARENA_WEAPONS[f.weapon]?.name||'weapon').toLowerCase();
      out.push({cls:'last',html:`<b>Still pinned</b>: ${esc(name)}'s ${esc(item)}, by ${esc(by)}. No ${f.pinnedGear==='shield'?'shield parries or strikes':'attacks or parries'} with it until ${esc(name)} frees it (Free Pinned ${f.pinnedGear==='shield'?'Shield':'Weapon'}: 1 AP, opposed Brawn).`});}
    if((f.skipAttack||0)>0)
      out.push({cls:'last',html:`<b>Still stunned</b>: ${esc(name)} cannot attack for ${f.skipAttack} more turn${f.skipAttack===1?'':'s'} (Serious Wound). Parry, evade and other actions still work.`});
    if(f.entangled&&typeof entangledLoc==='function'&&entangledLoc(f))
      out.push({cls:'last',html:`<b>Still entangled</b>: ${esc(name)}'s ${esc(f.entangled.loc)}, by ${esc(S.fighters[f.entangled.by]?.name||'the opponent')}. Break Free: 1 AP, opposed Brawn.`});
  }
  return out;
}
function pbHeadline(c){
  const p=c.p,turn=S.fighters[S.order?.[S.turnIndex]];
  const who=f=>f?esc(f.name):'';
  if(V.busy)return V.replaying?'Replaying the fight':'Watch the exchange play out';
  if(S.phase==='between'||S.phase==='over')return 'The bout is over';
  if(R)return pbHuman(R.actor)?`${who(S.fighters[R.actor])}: roll the dice`:`${who(S.fighters[R.actor])} is rolling`;
  if(p?.kind==='reaction')return pbHuman(p.def)?`${who(S.fighters[p.atk])} attacks ${who(S.fighters[p.def])}: choose a defence`:`${who(S.fighters[p.def])} is choosing a defence`;
  if(p?.kind==='range')return `${who(S.fighters[p.mover])} tries to change range`;
  if(p?.kind==='effect')return `${who(S.fighters[p.owner])} earned ${p.effectsLeft} Special Effect${p.effectsLeft===1?'':'s'} to choose`;
  if(p?.kind==='location')return `${who(S.fighters[p.owner])}: choose where the blow lands`;
  if(p?.kind==='footingDefendChoice')return pbHuman(p.target)?`${who(S.fighters[p.actor])} tries to stand: resist with Brawn or Athletics`:`${who(S.fighters[p.target])} is resisting`;
  if(p?.kind==='footingSkillChoice')return pbHuman(p.actor)?`Regain Footing: beat ${who(S.fighters[p.target])} to stand`:`${who(S.fighters[p.actor])} tries to stand`;
  if(p)return pbHuman(p.owner||p.other||p.def)?'A decision is waiting':'The opponent is deciding';
  return pbHuman(turn?.id)?`${who(turn)}'s turn: ${turn.ap} AP to spend`:`${who(turn)} is acting`;
}
// The decision, at the top of the middle column and large (Ideas 20261117-182754, 183126): the recommended choice
// and why, in a red-bordered box with its Confirm button; another pick says so instead.
function pbRecBox(isRec,why,other,btn){
  return `<div class="bdo brecbox${isRec?' is-rec':''}"><div class="brecwhy">${isRec?`<span class="brecl">Recommended</span><p><b>Recommended.</b> ${esc(why)}</p>`
    :`<span class="brecl other">Your choice</span><p>${other}</p>`}</div>${btn}</div>`;
}
function pbDecision(c){
  const p=c.p;
  if(c.live){
    const a=c.sel;
    return a?pbRecBox(c.rec?.act===a.act,c.rec?.why||'','Point at anything on the left to see its odds on the right.',
      `<button type="button" class="bgo" data-act="${a.act}">${esc(a.label)} · ${pbCost(a)} <kbd>Enter</kbd></button>`)
      :'<div class="bdo"><p class="bnone">No action available.</p></div>';
  }
  if(c.reacting){
    const d=c.def;
    return pbRecBox(!!(c.recD&&d?.val===c.recD.val),c.recD?.why||'',p.kind==='range'?'Answer on the left.':'Each defence on the left shows its odds against this roll.',
      d?`<button type="button" class="bgo" data-act="${d.act}" data-val="${d.val}">${esc(d.label)}${d.ap?' · '+d.ap+' AP':''} <kbd>Enter</kbd></button>`:'<button type="button" class="bgo" disabled>Choose first</button>');
  }
  if(c.choosingFx&&p.kind==='effect'){
    // bigger chips with what each does; the ones that change nothing now fold under "more" (still choosable)
    const chip=([id,name],i)=>`<button type="button" class="bfx${c.fx&&c.fx[0]===id?' sel':''}${c.recF?.id===id?' rec':''}" data-pa="fx" data-val="${id}" data-pb-info="fx:${id}">`
      +`<kbd>${i<9?i+1:''}</kbd><span class="bfxn">${esc(name)}</span><small>${esc((p.owner!==p.atk&&EFFECT_CHOICE_TEXT_DEFENSIVE[id])||EFFECT_CHOICE_TEXT[id]||'')}</small></button>`;
    const order=c.fxList.map((e,i)=>[e,i]),live=order.filter(([e])=>!pitsEffectIdle(e[0],p)),idle=order.filter(([e])=>pitsEffectIdle(e[0],p));
    const more=idle.length?`<details class="bfxmore"><summary>${idle.length} more that change nothing now</summary><div class="bfxs">${idle.map(([e,i])=>chip(e,i)
      +`<p class="bidle">${esc(pitsEffectIdle(e[0],p))}</p>`).join('')}</div></details>`:'';
    const go=c.fx?`<button type="button" class="bgo" data-act="effect" data-val="${c.fx[0]}">${esc(c.fx[1])} <kbd>Enter</kbd></button>`:'<button type="button" class="bgo" disabled>Choose an effect</button>';
    return `${pbRecBox(!!(c.recF&&c.fx&&c.fx[0]===c.recF.id),c.recF?(c.recF.why?`${c.fx[1]}: ${c.recF.why}`:c.fx[1]):'','Point at an effect to see what it does and its odds.',
      `<div class="bfxgo"><button type="button" class="toolbutton bskip" data-act="skipEffect">Skip</button>${go}</div>`)}
      <div class="bdo fx"><div class="bfxs" role="group" aria-label="Special Effects">${live.map(([e,i])=>chip(e,i)).join('')}</div>${more}</div>`;
  }
  if(c.choosingFx&&p.kind==='location'){
    const t=S.fighters[p.def];
    return `<div class="bdo bloc"><svg class="body-svg" viewBox="0 0 120 200" role="group" aria-label="Choose where the blow lands on ${esc(t.name)}">${paZonesSvg(t,true)}</svg>
      <p>Click a location on ${esc(t.name)}. Each shows its hit points and armour (A). Point at one for details.</p></div>`;
  }
  if(c.phase==='opponent'&&!V.busy&&!R&&!p)return `<div class="bdo"><p class="bnone">${esc(S.fighters[S.order?.[S.turnIndex]]?.name||'The opponent')} is choosing. If they attack, your defences light up on the left.</p></div>`;
  return `<div class="bdo bprompt">${paPromptHtml()}</div>`;
}
// this bout's initiative result, once it has been shown (null before it, or from an earlier bout)
function pbInitiativeNow(){
  const logs=paVisibleLogs();
  for(let i=logs.length-1;i>=0;i--){const t=logs[i].title||'';if(t==='New Opponent')return null;
    if(/^Encounter \d+ · Initiative$/.test(t))return paInitiative(logs[i]);}
  return null;
}
function pbMiddle(c){
  // the bout is over: how it ended and what next, in place of the exchange (no dialog over the arena)
  if((S.phase==='between'||S.phase==='over')&&!V.busy)return `<div class="bmid bend">${paEndHtml()}</div>`;
  const g=pbExchange(),inProgress=!!(R||c.p||V.busy);
  let lines=pbStory(g);
  // before the first exchange of a bout: who acts first, and how (report 20261117-182548)
  if(!g){const n=pbInitiativeNow();if(n)lines=[{cls:'note',html:`<b>Initiative: ${esc(n.head)}</b>. ${esc(n.a.name)} ${esc(n.a.math)}; ${esc(n.b.name)} ${esc(n.b.math)}.`}];}
  if(!inProgress)lines=lines.concat(pbSince(g));
  // (what still holds a fighter has its own line under the story, so it never scrolls away)
  const lasting=pbLasting(),still=lasting.length?`<ul class="blasting" aria-label="Still in effect">${lasting.map(l=>`<li>${l.html}</li>`).join('')}</ul>`:'';
  // newest last; the list is drawn reversed in a column-reverse box so it always shows the newest lines
  const story=lines.length?`<ul class="bstory" aria-live="polite">${lines.slice().reverse().map(l=>`<li data-k="${l.cls}"${l.g?` data-g="${l.g}"`:''}>${l.html}</li>`).join('')}</ul>`
    :'<ul class="bstory"><li data-k="note">Nothing yet. Each exchange is told here, step by step.</li></ul>';
  const step=(PB_STEPS.find(x=>x[0]===pbStepNow(c))||PB_STEPS[0])[1];
  // A decision of yours (an action, a defence, a Special Effect): the decision comes first and large, with only a small
  // line saying where the exchange is; the story shrinks under it, and gives way entirely to the Special Effects
  // (Ideas 20261117-182754, 183126, 182931). Otherwise the story is the page, as before.
  if(c.live||c.reacting||(c.choosingFx&&c.p.kind==='effect'))
    return `<div class="bmid bdecide"><p class="bkick"><span>${esc(step)}</span>${esc(pbHeadline(c))}</p>${pbDecision(c)}
      ${c.choosingFx?'':story.replace('class="bstory"','class="bstory short"')}${still}</div>`;
  return `<div class="bmid"><header><h4>${esc(pbHeadline(c))}</h4><span class="lbl">${esc(step)} · ${inProgress||!g?'this exchange':'last exchange'}</span></header>
    ${story}${still}${pbDecision(c)}</div>`;
}

// ---- right: details and odds ----
// Count the d100 faces 1..100 for a skill with the engine's own grading.
function pbGrades(pct){
  const n={critical:0,success:0,failure:0,fumble:0};
  for(const b of pitsRollBands(pct))n[b.kind]+=b.to-b.from+1;
  return n;
}
const pbGradeLine=n=>`<ul class="bodds bgrades"><li class="g-critical"><span>Critical</span><b>${n.critical}%</b></li><li class="g-success"><span>Success</span><b>${n.success}%</b></li><li class="g-failure"><span>Failure</span><b>${n.failure}%</b></li><li class="g-fumble"><span>Fumble</span><b>${n.fumble}%</b></li></ul>`;
function pbBar(parts){
  return `<div class="bbar" aria-hidden="true">${parts.filter(p=>p[1]>0).map(([cls,v])=>`<i class="${cls}" style="flex:${v}"></i>`).join('')}</div>`;
}
// The chance an opposed resistance fails against a roll already made (the effect lands), face by face.
function pbResist(pct,origin){
  const out={land:0,critical:0,beat:0,under:0,fail:0,faces:[]};
  for(let v=1;v<=100;v++){
    const r=rollSkill(pct,v),wins=CombatRules.opposedWins(r,origin);
    if(wins){out.faces.push(v);if(r.grade===3&&origin.grade<3)out.critical++;else out.beat++;}
    else{out.land++;if(r.grade>=2)out.under++;else out.fail++;}
  }
  return out;
}
const pbOriginWord=o=>`${o.roll} · ${PB_GRADE_WORD[['fumble','failure','success','critical'][o.grade]]}`;
// d100 faces as short ranges: [1,2,3,5] -> "01–03, 05"
const pbFaces=f=>{const out=[],n=v=>v===100?'00':String(v).padStart(2,'0');
  for(let i=0;i<f.length;){let j=i;while(j+1<f.length&&f[j+1]===f[j]+1)j++;out.push(i===j?n(f[i]):n(f[i])+'–'+n(f[j]));i=j+1;}return out.join(', ');};
// Why the chance is what it is (report review FR-04, 2026-11-14: "95% looks implausible"). The roll that earned the
// effect is already made, so these are odds against that roll, not against the skill in general: a resisting roll must
// get a better grade, or the same grade with a higher roll (Core p.50, as CombatRules.opposedWins: the higher roll wins between equal successes).
function pbResistWhy(r,origin){
  const word=PB_GRADE_WORD[['fumble','failure','success','critical'][origin.grade]].toLowerCase();
  const how=r.faces.length?`They resist only on <b>${pbFaces(r.faces)}</b> (${r.faces.length} face${r.faces.length===1?'':'s'} of 100)`:'No roll of theirs resists';
  return `<p class="bsmall">Your roll of <b>${origin.roll}</b> (${esc(word)}) is already made, so these odds are against it. ${how}: a resisting roll must get a better grade than yours, or the same grade with a higher roll.</p>`;
}
function pbResistHtml(skillName,pct,origin,who,cond){
  const r=pbResist(pct,origin);
  return `<div class="bwhy"><p>${esc(who)} resists with <b>${esc(skillName)} ${pct}%</b> against your <b>${pbOriginWord(origin)}</b>.</p>
    <div class="bbig"><strong>${r.land}%</strong><span>chance it works${cond?' '+esc(cond):''}</span></div>${pbBar([['ok',r.land],['no',100-r.land]])}${pbResistWhy(r,origin)}
    <ul class="bodds bgrades b3"><li class="g-fumble"><span>They resist</span><b>${100-r.land}%</b></li><li title="Same success grade but a roll no higher than yours: the higher roll wins ties"><span>Lose the tie</span><b>${r.under}%</b></li><li><span>They fail</span><b>${r.fail}%</b></li></ul></div>`;
}
function pbEffectOdds(id,p){
  const target=S.fighters[p.other],origin=p.owner===p.atk?p.attackRoll:p.defenseRoll;
  if(!target||!origin)return '';
  if(p.forceFailure&&['trip','disarm','blind','compel','stun','bleed'].includes(id))
    return '<div class="bwhy"><div class="bbig"><strong>100%</strong><span>Force Failure is active: their resistance fails automatically.</span></div></div>';
  const eff=pct=>effectiveSkill(target,pct);
  if(id==='trip'){
    const opts=tripResistOptions(target);
    const best=opts.reduce((b,k)=>tripResistPct(target,k)>tripResistPct(target,b)?k:b);
    const rows=opts.map(k=>`${TRIP_SKILL_NAMES[k]} ${eff(tripResistPct(target,k))}% → <b>${pbResist(eff(tripResistPct(target,k)),origin).land}%</b>`).join(' · ');
    return pbResistHtml(TRIP_SKILL_NAMES[best],eff(tripResistPct(target,best)),origin,target.name,'')
      +`<p class="bsmall">${pbHuman(target.id)?'They choose the skill':'They use their best skill'}: ${rows}</p>`;
  }
  if(id==='disarm'){
    const actor=S.fighters[p.owner];
    const own=(p.owner===p.atk?arenaProfile(attackKeyOf(p)):p.parryTool==='shield'?SHIELDS[actor.shield]:ARENA_WEAPONS[actor.weapon]).size;
    const pct=CombatRules.disarmResistSkill(target.style,own,ARENA_WEAPONS[target.weapon].size);
    return pbResistHtml('Combat Style (adjusted for weapon Size)',eff(pct),origin,target.name,'');
  }
  if(id==='blind'){
    const shield=target.shield!=='none'&&!ARENA_WEAPONS[target.weapon].twoHanded&&canShieldParry(target);
    const ev=evadeTarget(target),sh=shield?combatTarget(target,'shield'):0;
    return pbResistHtml(shield&&sh>ev?'Shield style':'Evade',Math.max(ev,sh),origin,target.name,'');
  }
  if(id==='compel')return pbResistHtml('Willpower',eff(target.willpower),origin,target.name,'');
  if(id==='stun'||id==='bleed')return pbResistHtml('Endurance',eff(target.endurance),p.attackRoll,target.name,'if the blow wounds')
    +'<p class="bsmall">Tested only if damage gets past parry and armour.</p>';
  return '<p class="bsmall">No roll: it happens as soon as you choose it.</p>';
}
// Effects outcome of a defence roll against the attack roll already made.
function pbDefenceOdds(d,c){
  const p=c.p;
  if(p?.kind==='range'){
    if(d.val==='permit')return '<p>The range changes. You keep your AP.</p>';
    return `<p>${d.val==='oppose'?'Opposed Evade rolls: if you win, the range stays as it is.':'You attack the mover against their Evade. The range changes whether or not you hit.'}</p>
      <p class="bsmall">Your ${d.val==='oppose'?'Evade':'attack'} ${d.pct}%:</p>${pbGradeLine(pbGrades(d.pct))}`;
  }
  const atk=p?.attackRoll,f=c.me,attacker=S.fighters[p?.atk];
  if(d.val==='none')return `<p>${esc(atk&&atk.grade<2?'Their attack missed. Not defending keeps your AP but gives up the chance to earn defensive Special Effects.':'You keep your AP. If their attack succeeded it hits you, and they may earn Special Effects.')}</p>`;
  if(!atk)return `<p>${d.pct}% to succeed.</p>${pbGradeLine(pbGrades(d.pct))}`;
  // Graded as react() grades it: skills over 100% are reduced first (Core p.51); an Evade gets out of the way only
  // when it beats the attack roll (opposed, Core pp.50, 103), a parry whenever it succeeds (wide audit 2026-11-16, #360).
  const t=CombatRules.opposedTargets(atk.effectiveTarget??p.attackTarget??0,d.pct),cut=t.reduction||0;
  const atkG=cut?rollSkill(t.a,atk.roll):atk,defPct=cut?t.b:d.pct;
  const n={you:{},them:{},even:0,stop:0};
  for(let v=1;v<=100;v++){
    const r=rollSkill(defPct,v),k=effectsWonBy(r.grade,atkG.grade);
    if(d.val==='evade'?opposedBetter(r,atkG):r.grade>=2)n.stop++;
    if(k>0)n.you[k]=(n.you[k]||0)+1;else if(k<0)n.them[-k]=(n.them[-k]||0)+1;else n.even++;
  }
  const sum=o=>Object.values(o).reduce((a,b)=>a+b,0),you=sum(n.you),them=sum(n.them);
  const rows=[...Object.entries(n.you).sort((a,b)=>b[0]-a[0]).map(([k,v])=>`<li class="ok"><span>You earn ${k} Special Effect${k>1?'s':''}</span><b>${v}%</b></li>`),
    n.even?`<li><span>No Special Effects either way</span><b>${n.even}%</b></li>`:'',
    ...Object.entries(n.them).sort((a,b)=>a[0]-b[0]).map(([k,v])=>`<li class="no"><span>${esc(attacker?.name||'They')} earns ${k}</span><b>${v}%</b></li>`)].join('');
  const what=d.val==='evade'?'get out of the way (costs 1 AP; you end up prone either way)':'parry';
  const block=d.val==='evade'?'':`<p class="bsmall">${esc(pbClip((parryChoiceHelp(f,attacker,d.val==='shield'?'shield':'weapon').split('. ')[1]||''),110))}</p>`;
  const evWhy=d.val==='evade'&&atk.grade>=2?`<p class="bsmall">Your Evade is ${d.pct}%${cut?` (${defPct}% after the over-100% reduction)`:''}, but it must beat their roll: a better grade, or the same grade with a higher roll.</p>`:'';
  return `<p>Their attack: <b>${pbOriginWord(atk)}</b>.${atk.grade<2?' It already missed; defending can still earn you Special Effects.':''}</p>
    ${evWhy}<div class="bbig"><strong>${n.stop}%</strong><span>chance to ${what}</span></div>${block}
    ${pbBar([['ok',you],['even',n.even],['no',them]])}<ul class="bodds">${rows}</ul>`;
}
const pbRecWhy=(rec,key)=>rec&&(rec.act??rec.val)===key?'<span class="btag brec-tag">Recommended</span>':'';
function pbActionInfo(act,c){
  const a=c.list.find(x=>x.act===act);if(!a)return '';
  const help=typeof actionChoiceHelp==='function'?actionChoiceHelp(act,c.me):'';
  // an action that cannot be taken now says why, and nothing else (no odds for a roll that cannot be made)
  if(!a.enabled&&a.reason)return `<header><h4>${esc(a.label)}</h4><span class="btag">${pbCost(a)}</span></header><p>${esc(a.reason)}</p><p class="bsmall">Not available now.</p>`;
  const pct=pitsOddsFor(act);
  let body=`<p>${esc(help)}</p>`;
  if(pct!=null){
    body+=`<div class="bbig"><strong>${pct}%</strong><span>${act==='attack'||act==='shieldAttack'?'your attack roll':'your roll'}</span></div>${pbGradeLine(pbGrades(pct))}`;
    if(act==='attack'||act==='shieldAttack'){
      // only the defences the foe could really use (the same checks as its defence rows; wide audit 2026-11-16, #360)
      const foe=c.foe,can=pbDefences(foe.id,false).filter(d=>d.usable&&d.val!=='none');
      const word={parry:'parry',shield:'shield',evade:'evade'};
      body+=foe.ap<=0?`<p class="bsmall">${esc(foe.name)} has no AP left to defend: a successful attack hits. Beat their grade (a Failure) and you earn Special Effects.</p>`
        :can.length?`<p class="bsmall">${esc(foe.name)} can then ${can.map(d=>word[d.val]+' ('+d.pct+'%)').join(', ')} or not defend. Beat their grade and you earn Special Effects.</p>`
        :`<p class="bsmall">${esc(foe.name)} cannot defend now: a successful attack hits. Beat their grade (a Failure) and you earn Special Effects.</p>`;
    }
  }else body+='<p class="bsmall">No roll.</p>';
  return `<header><h4>${esc(a.label)}</h4>${pbRecWhy(c.rec,act)}<span class="btag">${pbCost(a)}</span></header>${body}`;
}
function pbFxInfo(id,c){
  const p=c.p,e=CombatRules.specialEffect(id);if(!e||!p)return '';
  const text=(p.owner!==p.atk&&EFFECT_CHOICE_TEXT_DEFENSIVE[id])||EFFECT_CHOICE_TEXT[id]||'';
  const needs=[e.weapon,e.requirement,e.stackable?'can be chosen more than once':''].filter(Boolean).join(' · ');
  return `<header><h4>${esc(e.name)}</h4><span class="btag">${e.offensive&&e.defensive?'attack or defence':e.offensive?'attacker':'defender'}</span></header>
    <p>${esc(text)}</p>${needs?`<p class="bsmall">Needs: ${esc(needs)}</p>`:''}${pbEffectOdds(id,p)}<p class="bsrc">Core pp.95–101</p>`;
}
function pbLocInfo(loc,c){
  const t=S.fighters[c.p?.def];if(!t||!HIT_LOCS.includes(loc))return '';
  return `<header><h4>${esc(loc)}</h4></header><p><b>${t.hp[loc]}</b> of ${t.maxHp[loc]} hit points · armour <b>${armourAt(t,loc)}</b></p>
    <p class="bsmall">Damage beyond the armour comes off these hit points. At 0 or less it is a Serious Wound; at minus its starting hit points, a Major Wound.</p>`;
}
function pbDefaultInfo(c){
  const g=pbExchange(),res=g?paExchangeResult(g):null;
  if(c.choosingFx&&c.p.kind==='location')return `<header><h4>Choose Location</h4></header><p>Point at a location to see its hit points and armour, then click it.</p>`;
  if(c.choosingFx)return `<header><h4>Special Effects</h4></header><p>Point at an effect to see what it does and, if it needs a roll, the chance it works.</p>`;
  if((S.phase==='between'||S.phase==='over')&&!V.busy&&typeof resultParts==='function'){const r=resultParts();
    if(r.causeLine)return `<header><h4>${esc(r.winnerLine)}</h4></header><p>${esc(r.causeLine)}</p>${res?`<p class="bsmall">The last blow on screen: <b>${esc(res.head)}</b>. ${esc(res.math)}</p>`:''}`;}
  return `<header><h4>How an exchange works</h4></header>
    <ol class="bhow"><li>The attacker rolls Combat Style.</li><li>The defender may parry or evade (1 AP).</li><li>The better grade earns Special Effects.</li><li>If the blow lands: hit location, then damage minus parry and armour.</li></ol>
    ${res?`<p class="bsmall">Last result: <b>${esc(res.head)}</b>. ${esc(res.math)}</p>`:''}`;
}
function pbInfoHtml(c,key){
  const k=key||(c.choosingFx&&c.fx?'fx:'+c.fx[0]:c.reacting&&c.def?'def:'+c.def.val:c.live&&c.sel?'act:'+c.sel.act:'');
  const [kind,val]=String(k).split(/:(.*)/);
  let h='';
  if(kind==='act')h=pbActionInfo(val,c);
  else if(kind==='def'){const d=c.defs.find(x=>x.val===val);if(d)h=`<header><h4>${esc(d.label)}</h4>${pbRecWhy(c.recD,val)}<span class="btag">${d.ap?d.ap+' AP':'free'}</span></header>${d.usable===false?`<p>${esc(d.why)}</p>`:pbDefenceOdds(d,c)}`;}
  else if(kind==='fx')h=pbFxInfo(val,c);
  else if(kind==='loc')h=pbLocInfo(val,c);
  else if(kind==='cond'){const [n,w]=String(val).split('|').map(x=>{try{return decodeURIComponent(x);}catch(e){return x;}});
    h=`<header><h4>${esc(n)}</h4><span class="btag">condition</span></header><p>${esc(w||'')}</p>`;}
  return h||pbDefaultInfo(c);
}
function pbRight(c){
  return `<div class="binfo" aria-live="polite"><span class="lbl"><span>Details</span><button type="button" class="toolbutton bhist" data-pa="history">History · ${paVisibleLogs().length}</button></span><div class="binfo-body">${pbInfoHtml(c,PB.hover)}</div></div>`;
}

// The deck, drawn in place of the older one. Returns '' when the older deck is in use.
function pitsBottomDeckHtml(){
  if(!pbOn())return '';
  const c=pbCtx();
  // the result dialog is appended once, by render() in practice-combat.html
  return `<div class="bdeck bE" aria-label="Command deck">${pbLeft(c)}${pbMiddle(c)}${pbRight(c)}</div>`;
}
function pbPaintInfo(){
  const el=typeof document!=='undefined'&&document.querySelector('#root .binfo-body');
  if(el&&S?.phase==='fight')el.innerHTML=pbInfoHtml(pbCtx(),PB.hover);
}

// The history list opens in a window.
function pbOpenHistory(){
  document.getElementById('paHistory')?.remove();
  const box=document.createElement('div');box.id='paHistory';box.className='modal pa-rules';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Combat history');
  box.innerHTML=`<div class="mbox"><h2>Combat history</h2>${combatHistory({deck:true})}<p class="pa-rules-close"><button type="button" class="toolbutton" data-pa="history-close">Close</button></p></div>`;
  const close=()=>{box.remove();document.querySelector('[data-pa="history"]')?.focus?.({preventScroll:true});};
  box.addEventListener('click',e=>{if(e.target===box||e.target.closest('[data-pa="history-close"]'))close();});
  box.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  document.body.append(box);box.querySelector('button').focus({preventScroll:true});
}

// Selection, hover details, history and number keys (wired once).
function pbWire(){
  if(PB.wired||typeof document==='undefined')return;PB.wired=true;
  document.addEventListener('click',e=>{
    const t=e.target.closest?.('[data-pa]');if(!t||!t.closest('#root'))return;
    const c=pbOn()&&S?.phase==='fight'?pbCtx():null;
    if(t.dataset.pa==='history'){pbOpenHistory();return;}
    if(!c)return;
    if(t.dataset.pa==='sel'&&c.live&&c.list.some(a=>a.act===t.dataset.val&&a.enabled)){PB.sel=t.dataset.val;render();}
    else if(t.dataset.pa==='def'&&c.reacting&&c.defs.some(d=>d.val===t.dataset.val&&d.enabled)){PB.def=t.dataset.val;render();}
    else if(t.dataset.pa==='fx'&&c.choosingFx){PB.fx=t.dataset.val;render();}
  });
  const hover=e=>{
    if(!pbOn()||!document.body.classList.contains('pa-on'))return;
    const t=e.target.closest?.('#root [data-pb-info],#pitsStage .ps-hud [data-pb-info],#root .bdo.bloc [data-act="pickloc"]');
    const key=t?(t.dataset.pbInfo||'loc:'+t.dataset.val):null;
    if(key===PB.hover)return;
    // leaving an item for empty space inside the details panel keeps what is shown, so it can be read
    if(!key&&e.target.closest?.('#root .binfo'))return;
    PB.hover=key;pbPaintInfo();
  };
  document.addEventListener('mouseover',hover);
  document.addEventListener('focusin',hover);
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey||!pbOn()||!document.body.classList.contains('pa-on'))return;
    if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName||'')||document.querySelector('.modal'))return;
    if(S?.phase!=='fight'||V.busy)return;
    const c=pbCtx();
    if(/^[1-9]$/.test(e.key)){
      const i=+e.key-1;
      if(c.live){const a=c.list[i];if(!a||!a.enabled)return;PB.sel=a.act;}
      else if(c.reacting){const d=c.defs[i];if(!d||!d.enabled)return;PB.def=d.val;}
      else if(c.choosingFx&&c.fxList[i]){PB.fx=c.fxList[i][0];}
      else return;
      e.preventDefault();PB.hover=null;render();
    }else if(e.key==='Enter'&&!/^(BUTTON|A|SUMMARY)$/.test(e.target.tagName||'')){
      const go=document.querySelector('#root .bdeck .bgo[data-act]:not(:disabled)');
      if(go){e.preventDefault();go.click();}
    }
  });
}
pbWire();
