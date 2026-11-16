// The Pits: reach and disengagement (owner, 2026-11-16). Run: node tests/pits-reach.cjs
//  1. Only a weapon in hand controls Reach (Core p.106, optional Closing and Opening Range). A dropped, broken, or
//     embedded-and-abandoned weapon controls nothing.
//  2. Change Range can disengage, with matched reach too (Core pp.91, 106-107; cases C5-A04, C5-M30-M32). The
//     opponent may allow it, oppose with Evade, or intercept, and an interception does not stop the move.
const assert=require('node:assert/strict');
const {arena}=require('./pits-golden.cjs');
let passed=0;const check=(name,ok)=>{assert.ok(ok,name);passed++;console.log('PASS',name);};

// A two-player bout (both human, so every prompt waits), a against b, after initiative, a to act.
function bout(aWeapon,bWeapon,extra){
  const A=arena(7);
  A.run(`config.mode='pvp';startRun();R=null;V.busy=false;
    S.fighters={a:Object.assign(mkFighter('a','Ana','human',70,${JSON.stringify(aWeapon)},0,60,3,13,13,${JSON.stringify((extra&&extra.aShield)||'none')},13,13,13),{}),
                b:Object.assign(mkFighter('b','Bo','human',70,${JSON.stringify(bWeapon)},0,60,3,13,13,${JSON.stringify((extra&&extra.bShield)||'none')},13,13,13),{})};
    beginEncounter();R=null;V.busy=false;S.pending=null;S.phase='fight';S.order=['a','b'];S.turnIndex=0;S.fighters.a.ap=S.fighters.b.ap=3;
    S.engagement=engagementInfo().active?'long':'equal';S.disengaged=false;S.gapMetres=0;`);
  return A;
}
const J=(A,x)=>JSON.parse(A.run('JSON.stringify('+x+')'));
// answer the pending dice prompt with fixed d100 values
const roll=(A,v)=>A.run(`(()=>{const r=R;R=null;r.callback([${v}]);})()`);

/* ---------- 1. Reach follows the weapon in hand ---------- */
{
  const A=bout('dagger','longspear');
  const r0=J(A,'engagementInfo()');
  check('Dagger against longspear: the Reach rules apply and the longspear is longer',r0.active&&r0.longer==='b');
  check('At long reach the dagger cannot strike the body and is offered Close Inside',!J(A,"canAttackBody('a')")&&J(A,"proposedRange('a')")==='short');
  A.run(`S.fighters.b.disarmed=true;`);
  check('A dropped longspear controls no reach',!J(A,'engagementInfo()').active);
  check('With the longspear on the floor the dagger may strike the body without closing',J(A,"canAttackBody('a')")&&J(A,"proposedRange('a')")===null);
  A.run(`S.fighters.b.disarmed=false;`);
  check('Picked up again, the longspear keeps the dagger out',J(A,'engagementInfo()').active&&!J(A,"canAttackBody('a')")&&J(A,"proposedRange('a')")==='short');
  A.run(`S.fighters.b.weaponGuard={ap:4,hp:0};S.fighters.b.disarmed=false;`);
  check('A broken longspear controls no reach (even before the disarm flag is set)',!J(A,'engagementInfo()').active&&J(A,"canAttackBody('a')"));
}
{
  // the real Impale path: the longspear lodged in the dagger fighter and let go of
  const A=bout('longspear','dagger');
  A.run(`S.fighters.a.impaledWeapon={weapon:'longspear',target:'b',loc:'Chest'};
    S.pending={kind:'impaleLeave',atk:'a',def:'b',impaleLeaveFinish:()=>{}};chooseImpaleLeave(true);`);
  check('A longspear left in the wound is abandoned and controls no reach',J(A,'S.fighters.a.disarmed')&&!J(A,'engagementInfo()').active);
  check('With the abandoned longspear the dagger is never kept out',J(A,"canAttackBody('b')")&&J(A,"proposedRange('b')")===null);
}
{
  const A=bout('dagger','spear',{bShield:'heater'});
  check('(the spear and heater are carried together)',J(A,'S.fighters.b.shield')==='heater');
  A.run(`S.fighters.b.disarmed=true;`);
  check('A disarmed fighter with a shield fights at the shield’s Reach',J(A,"heldReach(S.fighters.b)")===J(A,"SHIELD_ATTACKS.heater.reach"));
}
{
  // a matched bout that turns uneven: the one left empty-handed is never stuck on a stale 'equal' range
  const A=bout('sword','sword');
  check('Sword against sword: matched, no reach rules',!J(A,'engagementInfo()').active&&J(A,'S.engagement')==='equal');
  A.run(`S.fighters.a.disarmed=true;`);
  const r=J(A,'engagementInfo()');
  check('Disarmed with no shield, the sword now outreaches empty hands',r.active&&r.longer==='b');
  check('The empty-handed fighter is offered Close Inside, not stuck on the old range',J(A,"proposedRange('a')")==='short');
}

/* ---------- 2. Change Range to disengage ---------- */
const disengageButton=A=>{A.run('render()');const m=/<button[^>]*data-act="disengage"[^>]*>/.exec(A.run('document.querySelector("#root").innerHTML'));return m&&m[0];};
{
  const A=bout('sword','sword');
  const btn=disengageButton(A);
  check('Matched reach: Disengage is offered and enabled',!!btn&&!/disabled/.test(btn));
  check('The bottom deck lists Disengage too',J(A,"pitsLegalActions('a').find(x=>x.act==='disengage')").enabled===true);
  A.run(`beginChangeRange('a','apart');`);
  check('Disengage costs the mover 1 AP and asks the opponent',J(A,'S.fighters.a.ap')===2&&J(A,'S.pending.kind')==='range'&&J(A,'S.pending.desired')==='apart');
  A.run(`rangeReact('permit');`);
  check('Allowed: the fighters are apart and the range is not corrupted',J(A,'S.disengaged')&&J(A,'S.gapMetres')>=1&&J(A,'S.engagement')==='equal');
  check('Allowed: the defender keeps its AP',J(A,'S.fighters.b.ap')===3);
  check('The log names the disengagement',J(A,"S.logs.some(l=>l.title==='Disengage')"));
  check('Once apart, Disengage is no longer offered as legal',J(A,"pitsLegalActions(S.order[S.turnIndex]).find(x=>x.act==='disengage')").enabled===false);
}
{
  // opposed Evade: the mover wins
  const A=bout('sword','sword');
  A.run(`beginChangeRange('a','apart');rangeReact('oppose');`);
  check('Opposed: the defender spends 1 AP',J(A,'S.fighters.b.ap')===2);
  roll(A,10);roll(A,80);
  check('Opposed and the mover wins the Evade contest: apart',J(A,'S.disengaged'));
}
{
  // opposed Evade: the defender wins
  const A=bout('sword','sword');
  A.run(`beginChangeRange('a','apart');rangeReact('oppose');`);
  roll(A,80);roll(A,10);
  check('Opposed and the defender wins: still engaged, range unchanged',!J(A,'S.disengaged')&&J(A,'S.engagement')==='equal');
}
{
  // intercepted with reach advantage: the mover gets away even when the attack lands
  const A=bout('dagger','longspear');
  A.run(`beginChangeRange('a','apart');rangeReact('intercept');`);
  check('Intercept: the defender spends 1 AP and attacks first',J(A,'S.fighters.b.ap')===2&&J(A,'R.actor')==='b');
  roll(A,10);roll(A,90);
  // the interceptor won: answer whatever follows (effects, location, damage) until the action ends
  for(let i=0;i<40&&J(A,'S.phase')==='fight'&&J(A,'!!(S.pending||R)')&&!J(A,'S.disengaged');i++){
    if(J(A,'!!R')){roll(A,1);continue;}
    const k=J(A,'S.pending&&S.pending.kind');
    if(k==='effect'){A.run(`handleClick({target:{closest:()=>({dataset:{act:'skipEffect'},tagName:'BUTTON',classList:{contains:()=>false}})}})`);continue;}
    break;
  }
  check('Intercepted and hit, the mover still gets away',J(A,'S.disengaged'));
  check('The range state is never set to "apart"',J(A,'S.engagement')!=='apart');
}
{
  // the long weapon can disengage from inside too
  const A=bout('longspear','dagger');
  A.run(`S.engagement='short';`);
  check('From inside, the longspear is offered both Change Range (open) and Disengage',J(A,"proposedRange('a')")==='long'&&!!disengageButton(A)&&!/disabled/.test(disengageButton(A)));
}
{
  // an AI opponent answers a disengagement without breaking the range state
  const A=bout('sword','sword');
  A.run(`S.fighters.b.kind='ai';S.fighters.b.tactic='patient';beginChangeRange('a','apart');`);
  for(let i=0;i<40&&J(A,'!!R');i++)roll(A,50);
  check('Against the computer the disengagement resolves and the range is still a real range',['equal','long','short'].includes(J(A,'S.engagement')));
}
{
  const A=bout('sword','sword');
  A.run(`S.fighters.a.prone=true;`);
  check('A prone fighter cannot disengage',/disabled/.test(disengageButton(A)||'disabled'));
  A.run(`S.fighters.a.prone=false;S.fighters.a.ap=0;`);
  check('Without AP a fighter cannot disengage',/disabled/.test(disengageButton(A)||'disabled'));
}
console.log(passed+' Pits reach tests passed');
