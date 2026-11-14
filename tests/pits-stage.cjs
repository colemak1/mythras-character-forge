// The Pits stage preview (experiments/pits-stage.js) is visual only: it reads
// log entries and fighter state, and must never change a fight.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function arena(withStage,seed,search=''){
 const q=[];let s=seed>>>0;
 const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 const ctx={console,URLSearchParams,setTimeout:fn=>{q.push(fn);return q.length;},clearTimeout(){},setInterval:()=>0,clearInterval(){},location:{search},
  sessionStorage:{getItem:()=>null},localStorage:{getItem:()=>null,setItem(){}},alert(){},
  document:{querySelector:s=>s==='#root'?{innerHTML:'',addEventListener(){}}:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
  window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
 vm.createContext(ctx);
 vm.runInContext('Math.random=__rnd',Object.assign(ctx,{__rnd:rnd}));
 const files=['js/combat-rules.js','js/data.js','experiments/practice-character.js','experiments/practice-guidance.js','experiments/pits-view.js',...(withStage?['experiments/pits-stage.js','experiments/pits-arena.js']:[])];
 for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
 return {run:x=>vm.runInContext(x,ctx),q};
}
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const names={a:'Kethan',b:'Marek'};
const A=arena(true,1),cue=(title,body,meta)=>JSON.parse(A.run(`JSON.stringify(pitsStageCue(${JSON.stringify({title,body,meta})},${JSON.stringify(names)}))`));

test('attacks, parries and evades carry who acted and how it went',()=>{
 let c=cue('Kethan attacks','42 against Combat Style 67% — SUCCESS.',{actor:'a'});
 assert.deepEqual([c.type,c.actor,c.grade,c.good],['attack','a','success',true]);
 c=cue('Marek attacks','63 against Combat Style 44% — FAILURE.',{actor:'b'});
 assert.deepEqual([c.type,c.actor,c.grade,c.good],['attack','b','failure',false]);
 c=cue('Marek strikes with the shield','03 against Combat Style 44% — CRITICAL.',{actor:'b'});
 assert.equal(c.shield,true);assert.equal(c.grade,'critical');
 c=cue('Kethan parries','30 vs 67% — SUCCESS. 1 AP remaining.',{actor:'a'});
 assert.deepEqual([c.type,c.good],['parry',true]);
 c=cue('Marek parries with shield','90 vs 40% — FAILURE. 0 AP remaining.',{actor:'b'});
 assert.deepEqual([c.type,c.good,c.shield],['parry',false,true]);
 c=cue('Kethan evades','12 vs 45% — SUCCESS. 1 AP remaining.',{actor:'a'});
 assert.deepEqual([c.type,c.good],['evade',true]);
});
test('a hit names the target, the body part (from the engine) and the HP lost',()=>{
 const c=cue('Kethan hits Right Arm','8 total; 0 parry; 0 armour; 5 HP lost.',{actor:'a',impact:{target:'b',location:'Right Arm',hpLost:5}});
 assert.deepEqual([c.type,c.actor,c.target,c.loc,c.lost],['hit','a','b','rarm',5]);
 assert.equal(cue('Marek hits Head','x',{actor:'b',impact:{target:'a',location:'Head',hpLost:0}}).lost,0);
 assert.equal(cue('No Damaging Hit','Marek evades the incoming strike, ending prone.',{}).type,'deflect');
});
test('Choose Location, human and computer, and the rolled Hit Location',()=>{
 let c=cue('Choose Location','Kethan selects Chest before damage is rolled.',{actor:'a',target:'b',location:'Chest'});
 assert.deepEqual([c.type,c.target,c.loc,c.chosen],['locate','b','chest',true]);
 c=cue('Choose Location',"Marek targets Kethan's Left Leg.",{actor:'b'});
 assert.deepEqual([c.type,c.target,c.loc,c.chosen],['locate','a','lleg',true]);
 c=cue('Hit Location','Kethan rolls 8 (d20): Abdomen.',{actor:'a',target:'b',location:'Abdomen',roll:8});
 assert.deepEqual([c.target,c.loc,c.chosen],['b','abdomen',false]);
});
test('Trip Opponent, Disarm Opponent and Regain Footing',()=>{
 let c=cue('Trip Opponent','Marek Brawn 80/46% (FAILURE): falls prone.',{actor:'a'});
 assert.deepEqual([c.type,c.actor,c.target,c.fell],['trip','a','b',true]);
 assert.equal(cue('Trip Opponent','Marek Evade 12/46% (SUCCESS): remains standing.',{actor:'a'}).fell,false);
 c=cue('Disarm Opponent',"Marek's weapon lands 3m away. A distant weapon must be approached, then picked up and readied.",{actor:'a',target:'b'});
 assert.deepEqual([c.type,c.target,c.metres],['disarm','b',3]);
 assert.equal(cue('Disarm Opponent','Marek rolls 70 against 40% (FAILURE). Keeps weapon.',{actor:'a'}),null,'a kept weapon needs no animation');
 assert.equal(cue('Disarm Opponent','Marek drops the weapon at their feet (+0 Damage Modifier).',{actor:'a',target:'b'}).metres,0);
 c=cue('Regain Footing','Kethan Brawn 40/50% versus Marek Athletics 20/50%. Stands up.',{});
 assert.deepEqual([c.type,c.actor],['stand','a']);
 assert.equal(cue('Regain Footing','Kethan Brawn 90/50% versus Marek 20/50%. Remains prone.',{}),null);
});
test('wounds, disabled limbs and the end of the fight',()=>{
 assert.deepEqual(cue('SERIOUS WOUND · Left Leg','Marek takes 3.',{}),{type:'wound',level:'serious',loc:'lleg'});
 assert.equal(cue('MAJOR WOUND · Head','x',{}).level,'major');
 assert.equal(cue('MINOR WOUND · Head','x',{}),null,'a minor wound needs no banner (the part just turns red)');
 assert.equal(cue('Limb Disabled',"Marek's Right Leg becomes unusable until healed. They fall prone.",{}).leg,true);
 assert.equal(cue('Limb Disabled',"Marek's Left Arm becomes unusable. They cannot use that arm.",{}).leg,false);
 assert.deepEqual(cue('FIGHT ENDS','Kethan wins. Marek is incapacitated.',{}),{type:'end',winner:'a',how:'injury'});
 assert.equal(cue('FIGHT ENDS','Marek wins. Kethan dies.',{}).winner,'b');
});
test('beats last as long as their own motion plus a short read; unknown beats use the replay default',()=>{
 // the windup and guard are held through the dice, so the dice tray is the reading pause
 const hold=(t,b,m,f)=>A.run(`pitsStageHold(${JSON.stringify({title:t,body:b,meta:m})},${JSON.stringify(names)},${f})`);
 const atk=hold('Kethan attacks','42 against Combat Style 67% — SUCCESS.',{actor:'a'},900);
 assert(atk>=300&&atk<=450,'an attack beat is short (about 350 ms), got '+atk);
 const hit=hold('Kethan hits Chest','x',{actor:'a',impact:{target:'b',location:'Chest',hpLost:3}},900);
 assert(hit>=1000&&hit<=1300,'a hit holds about 1.1 s, got '+hit);assert(hit>atk,'a hit holds longer than an attack');
 assert.equal(hold('Round 2','x',{},900),900,'a beat with no cue uses the default');
 assert.equal(hold('Disarm Opponent','Marek drops the weapon at their feet.',{actor:'a',target:'b'},2000)<=1000,true);
});
test('weapons draw as the right kind, from the engine weapon table',()=>{
 const k=(key,reach)=>JSON.parse(A.run(`JSON.stringify(pitsStageWeaponKind(${JSON.stringify(key)},${reach}))`));
 assert.equal(k('sword',2).kind,'blade');assert.equal(k('dagger',1).len<k('sword',2).len,true);
 assert.equal(k('greatsword',3).len>k('sword',2).len,true);assert.equal(k('spear',3).kind,'spear');
 assert.equal(k('mace',2).kind,'club');assert.equal(k('battleaxe',2).kind,'axe');assert.equal(k('hatchet',1).kind,'axe');
 assert.equal(k('quarterstaff',4).kind,'staff');assert.equal(k('trident',3).kind,'trident');assert.equal(k('whip',4).kind,'whip');
 assert.equal(k('net',3).kind,'net');assert.equal(k('flail',2).kind,'chain');assert.equal(k('halberd-poleaxe',4).kind,'polearm');
 assert.equal(k('something-new',3).kind,'staff','an unknown key gets a plain haft, never a wrong blade');
});
const J=x=>JSON.parse(A.run(`JSON.stringify(${x})`));
test('blow outcomes come from the engine facts: wound, partial and full parry, ward, armour, evade, miss',()=>{
 const hit=(lost,px)=>J(`pitsStageOutcome({type:'hit',lost:${lost},px:${JSON.stringify(px)}})`);
 assert.equal(hit(5,{blocked:0,afterParry:7,armour:2}),'wound');
 assert.equal(hit(3,{blocked:2,blockedBy:'parry',afterParry:5,armour:2}),'partial-parry');
 assert.equal(hit(2,{blocked:3,blockedBy:'ward',afterParry:4,armour:2}),'partial-ward');
 assert.equal(hit(0,{blocked:6,blockedBy:'parry',afterParry:0,armour:0}),'full-parry');
 assert.equal(hit(0,{blocked:6,blockedBy:'ward',afterParry:0,armour:0}),'full-ward');
 assert.equal(hit(0,{blocked:0,afterParry:2,armour:2}),'armour','armour stopped it: not an injury, not a parry');
 assert.equal(hit(0,{blocked:0,afterParry:0,armour:0}),'zero');
 const miss=px=>J(`pitsStageOutcome({type:'deflect',px:${JSON.stringify(px)}})`);
 assert.equal(miss({evaded:true}),'evaded');
 assert.equal(miss({react:'parry',reactGrade:2,aGrade:1}),'parried');
 assert.equal(miss({react:'parry',reactGrade:1,aGrade:1}),'miss','a failed parry is not a parry');
 assert.equal(miss({react:'none',aGrade:0}),'fumble');
 assert.equal(miss({react:'none',aGrade:1}),'miss');
});
test('a critical attack is named at the roll stage and the hit cue carries the engine facts',()=>{
 const c=cue('Kethan attacks','03 against Combat Style 60% — CRITICAL.',{actor:'a',exid:7,tool:'weapon'});
 assert.deepEqual([c.type,c.grade,c.exid],['attack','critical',7]);
 const h=cue('Marek hits Left Leg','x',{actor:'b',impact:{target:'a',location:'Left Leg',hpLost:5},px:{exid:7,total:7,blocked:0,armour:2,wound:5,before:6,after:1}});
 assert.equal(h.px.total,7);assert.equal(h.loc,'lleg');
 const d=cue('No Damaging Hit',"Kethan's attack failed to connect.",{actor:'a',px:{evaded:false,react:'parry',reactGrade:3,aGrade:1}});
 assert.equal(d.type,'deflect');assert.equal(d.px.reactGrade,3);
});
test('aim: the weapon tip ends on the struck body part, and head, torso and leg strikes sit at different heights',()=>{
 const wk={kind:'blade',len:92},base=J('PS_POSE.lunge');
 const parts={head:[170,-165],chest:[170,-105],abdomen:[170,-70],lleg:[170,-30]};
 const tipY={},ang={};
 for(const [loc,T] of Object.entries(parts)){
  const r=J(`pitsStageAim(PS_POSE.lunge,${JSON.stringify(wk)},false,${JSON.stringify(T)},{})`);
  assert.equal(r.ok,true,loc+' is reachable');
  assert(Math.hypot(r.tip[0]-T[0],r.tip[1]-T[1])<=14,`${loc}: tip within 14 of the target, got ${r.tip}`);
  tipY[loc]=r.tip[1];ang[loc]=r.angle;
 }
 assert(tipY.head<tipY.chest&&tipY.chest<tipY.abdomen&&tipY.abdomen<tipY.lleg,'contact height follows the location');
 assert(ang.head>ang.chest&&ang.chest>ang.lleg,'the weapon points up at the head and down at the leg');
 const sp=J(`pitsStageAim(PS_POSE.lunge,{kind:'spear',len:150},false,[200,-60],{})`);
 assert.equal(sp.ok,true);assert(Math.hypot(sp.tip[0]-200,sp.tip[1]+60)<=14);
 const far=J(`pitsStageAim(PS_POSE.lunge,${JSON.stringify(wk)},false,[600,-60],{maxDx:100})`);
 assert.equal(far.ok,false,'out of reach is reported, not faked');
});
test('aim: a shield bash uses the off arm; a left-handed wielder keeps role-based arms',()=>{
 const r=J(`pitsStageAim(PS_POSE.lunge,{kind:'blade',len:92},false,[110,-90],{arm:'off',shieldR:16,pen:0})`);
 assert.equal(r.ok,true);assert.notEqual(r.pose.ba1,J('PS_POSE.lunge').ba1,'the off arm moved');assert.equal(r.pose.a1,J('PS_POSE.lunge').a1,'the weapon arm did not');
 const l=J(`pitsStageLook({weapon:'sword',weaponHand:'Left Arm',hp:{'Right Arm':5,'Left Arm':0,Head:6,Chest:8,Abdomen:7,'Right Leg':6,'Left Leg':6},maxHp:{'Right Arm':5,'Left Arm':5,Head:6,Chest:8,Abdomen:7,'Right Leg':6,'Left Leg':6},shield:'none',siz:13})`);
 assert.equal(l.swap,true);assert.equal(l.armed,true,'a resisted Serious Wound leaves the weapon in the hand: the engine says when it drops (disarmed)');
 assert.equal(J(`pitsStageLook({weapon:'sword',weaponHand:'Left Arm',disarmed:true,hp:{'Right Arm':5,'Left Arm':0,Head:6,Chest:8,Abdomen:7,'Right Leg':6,'Left Leg':6},maxHp:{'Right Arm':5,'Left Arm':5,Head:6,Chest:8,Abdomen:7,'Right Leg':6,'Left Leg':6}})`).armed,false,'a weapon the engine dropped is not drawn in the hand');
 const HP="hp:{'Right Arm':5,'Left Arm':5,Head:6,Chest:8,Abdomen:7,'Right Leg':6,'Left Leg':6},maxHp:{'Right Arm':5,'Left Arm':5,Head:6,Chest:8,Abdomen:7,'Right Leg':6,'Left Leg':6}";
 assert.equal(J(`pitsStageLook({weapon:'sword',${HP},shield:'buckler'})`).shieldKey,'buckler','the shield keeps its kind (Work, 2026-11-13)');
 assert.equal(J(`pitsStageLook({weapon:'sword',${HP},shield:'none'})`).shieldKey,null);
});
test('lodged weapons and entanglement are read from engine state: held, abandoned, withdrawn',()=>{
 const f=(a,b)=>JSON.stringify({a,b});
 const wound={attacker:'b',loc:'Left Leg',weaponSize:2,weapon:'spear'};
 const held=J(`pitsStageLodged(${f({impaledWounds:[wound]},{weapon:'spear',impaledWeapon:{target:'a',loc:'Left Leg',weapon:'spear'}})},'a')`);
 assert.deepEqual(held,[{loc:'lleg',weapon:'spear',holder:'b',held:true}]);
 const abandoned=J(`pitsStageLodged(${f({impaledWounds:[wound]},{weapon:'spear',impaledWeapon:null,disarmed:true})},'a')`);
 assert.equal(abandoned[0].held,false);assert.equal(abandoned[0].weapon,'spear','the weapon that stays in the wound is still drawn');
 const withdrawn=J(`pitsStageLodged(${f({impaledWounds:[]},{weapon:'spear',impaledWeapon:null})},'a')`);
 assert.deepEqual(withdrawn,[],'withdrawn: nothing left in the wound');
 assert.deepEqual(J(`pitsStageEntangle(${f({entangled:{loc:'Right Arm',by:'b'}},{})},'a')`),{loc:'rarm',by:'b'});
 assert.equal(J(`pitsStageEntangle(${f({entangled:null},{})},'a')`),null);
});
test('the engine records the weapon in the wound it lodged, so an abandoned weapon can still be drawn',()=>{
 const src=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8');
 assert.match(src,/def\.impaledWounds\.push\(\{attacker:atk\.id,loc,weaponSize:aw\.size,weapon:akey\}\)/);
 assert.match(src,/function hitPx\(/);assert.match(src,/function noHitPx\(/);
});
test('entries with no visual meaning are ignored',()=>{
 for(const t of ['Round 2','Encounter 1 · Initiative','Kethan does not defend','Brace','Sunder'])assert.equal(cue(t,'x',{actor:'a'}),null,t);
});
test('the look of a fighter follows the engine: wounds, prone, disarmed, arm down, weapon',()=>{
 const a=arena(true,2);a.run(`startRun();R=null;V.busy=false;`);
 const look=()=>JSON.parse(a.run(`JSON.stringify(pitsStageLook(S.fighters.a))`));
 let l=look();
 assert.equal(l.weapon,'blade');assert.equal(l.armed,true);assert.equal(l.prone,false);
 assert(Object.values(l.parts).every(v=>v==='ok'),'unhurt: nothing red');
 a.run(`S.fighters.a.hp.Chest-=2;S.fighters.a.hp['Left Leg']=0;S.fighters.a.hp.Head=-20;`);
 l=look();
 assert.equal(l.parts.chest,'minor');assert.equal(l.parts.lleg,'serious');assert.equal(l.parts.head,'major');assert.equal(l.parts.abdomen,'ok','only damaged parts change');
 a.run(`S.fighters.a.prone=true;S.fighters.a.disarmed=true;`);l=look();
 assert.equal(l.prone,true);assert.equal(l.armed,false,'disarmed shows no weapon');
 a.run(`S.fighters.a.disarmed=false;S.fighters.a.hp['Right Arm']=0;S.fighters.a.disabled.push('Right Arm');`);l=look();
 assert.equal(l.armed,true,'the weapon is drawn until the engine drops it (a resisted wound keeps it)');assert.equal(l.limp.rarm,true,'but the arm hangs');
 a.run(`S.fighters.a.disarmed=true;`);assert.equal(look().armed,false,'a dropped weapon is not drawn in the hand');
 a.run(`S.fighters.b.weapon='spear'`);assert.equal(JSON.parse(a.run(`JSON.stringify(pitsStageLook(S.fighters.b))`)).weapon,'spear');
});
test('?stage=duel is Sword v Spear; without it the usual setup opens',()=>{
 const d=arena(true,3,'?stage=duel');
 assert.equal(d.run('S.fighters.a.weapon'),'sword');assert.equal(d.run('S.fighters.b.weapon'),'spear');
 assert.equal(d.run('S.phase'),'intro','opens at the opponent intro');
 const plain=arena(true,3);assert.equal(plain.run('PSTAGE_DUEL'),false);assert.equal(plain.run('S.phase'),'setup');
});
test('every entry of whole seeded bouts maps to a sensible cue; hits match the engine impact',()=>{
 let hits=0,cues=0;
 for(const seed of [7,42,1234,98765,31337]){
  const a=arena(true,seed);
  a.run(`startRun();R=null;V.busy=false;for(const f of Object.values(S.fighters))f.kind='ai';beginEncounter();`);
  let n=0;while(a.q.length&&n++<5000){a.q.shift()();if(a.run("S.phase")!=='fight')break;a.run('render()');}
  const logs=JSON.parse(a.run('JSON.stringify(S.logs.map(l=>({title:l.title,body:l.body,meta:l.meta})))'));
  const nm=JSON.parse(a.run('JSON.stringify({a:S.fighters.a.name,b:S.fighters.b.name})'));
  for(const l of logs){
   const c=JSON.parse(a.run(`JSON.stringify(pitsStageCue(${JSON.stringify(l)},${JSON.stringify(nm)}))`));
   if(!c)continue;cues++;
   if(c.type==='hit'){hits++;assert.equal(c.target,l.meta.impact.target);assert.equal(c.lost,l.meta.impact.hpLost);assert(c.loc,'known body part');}
   if(['attack','parry','evade'].includes(c.type))assert(['a','b'].includes(c.actor)&&c.grade,l.title);
  }
 }
 assert(cues>20&&hits>3,`saw ${cues} cues, ${hits} hits`);
});
test('the stage never changes a fight: same seeded bouts with and without it',()=>{
 for(const seed of [7,42,1234,98765]){
  const bout=withStage=>{const a=arena(withStage,seed);
   a.run(`startRun();R=null;V.busy=false;for(const f of Object.values(S.fighters))f.kind='ai';beginEncounter();`);
   let n=0;while(a.q.length&&n++<5000){a.q.shift()();if(a.run("S.phase")!=='fight')break;a.run('render()');}
   return a.run('JSON.stringify({logs:S.logs.map(l=>l.title+"|"+l.body),hp:Object.values(S.fighters).map(f=>f.hp),ap:Object.values(S.fighters).map(f=>f.ap),phase:S.phase})');};
  assert.equal(bout(true),bout(false),'seed '+seed);
 }
});
test('the stage reads only: no rule or dice code in it',()=>{
 const src=fs.readFileSync(path.join(root,'experiments/pits-stage.js'),'utf8').replace(/\/\/.*$/gm,'');
 assert.doesNotMatch(src,/Math\.random\(\)\s*\*\s*100|\bd100\(|\brollSkill\(|\brequestSkill\(|\blog\(|\.hp\[[^\]]+\]\s*[-+]?=[^=]|\.ap\s*[-+]?=[^=]/,'no engine calls or writes');
});
test('cues for Press Advantage, a dropped weapon, a disabled limb and how a fight ended (only what the engine says)',()=>{
 assert.deepEqual(cue('Press Advantage','Marek cannot attack on the next Turn, but may act otherwise.',{actor:'a'}),{type:'press',actor:'a',target:'b',name:'Press Advantage'});
 assert.equal(cue('Overextend Opponent','Marek cannot attack on the next Turn.',{actor:'a'}),null,'Overextend keeps the generic look');
 assert.deepEqual(cue('Weapon Dropped',"Kethan's Right Arm is useless and the weapon falls from it.",{actor:'a'}),{type:'drop',actor:'a'});
 const lm=cue('Limb Disabled',"Kethan's Left Leg becomes unusable until healed to positive HP. They fall prone.",{});
 assert.equal(lm.type,'limb');assert.equal(lm.leg,true);assert.equal(lm.loc,'lleg');assert.equal(lm.who,'a');
 assert.equal(cue('FIGHT ENDS','Marek wins. Kethan concedes the training bout.',{}).how,'concede');
 assert.equal(cue('FIGHT ENDS','Marek wins. Kethan has a Major Limb Wound to the Right Leg: incapacitated and prone.',{}).how,'injury');
 assert.equal(cue('FIGHT ENDS','Marek wins. Kethan is incapacitated by blood loss.',{}).how,'fatigue');
 assert.equal(cue('FIGHT ENDS','Marek wins. Kethan has a Major Limb Wound to the Right Arm: incapacitated and prone. Remains conscious. If the GM rules the limb severed, punctured or ripped off, untreated blood loss becomes fatal after 15 minutes.',{}).how,'injury',
  'a Major Limb Wound ends the fight by the blow, though its text names blood loss');
 assert.equal(cue('FIGHT ENDS','Marek wins. Kethan collapses from blood loss (Incapacitated Fatigue; no actions possible).',{}).how,'fatigue');
 assert.equal(cue('FIGHT ENDS','Marek wins. Kethan dies immediately from a Major Wound to Head.',{}).how,'injury','a death is still only "injury": nothing about severing is inferred');
});
// The beats of one batch, as the stage sees them.
const B=(title,body,meta)=>({id:++bid,title,body,meta:meta||{}});let bid=0;
const D=()=>({roll:{label:'d100'}});
const KIND=e=>e.roll?'dice':(JSON.parse(A.run(`JSON.stringify(pitsStageCue(${JSON.stringify(e)},${JSON.stringify(names)}))`))||{}).type||'other';
const arrange=(events,held,waiting)=>JSON.parse(A.run(`JSON.stringify(pitsStageArrange(${JSON.stringify(events)},${JSON.stringify(held)},${waiting},${JSON.stringify(names)}))`));
const HIT=()=>B('Kethan hits Right Leg','x',{actor:'a',impact:{target:'b',location:'Right Leg',hpLost:5},px:{total:5}});
const ATK=()=>B('Kethan attacks','42 against Combat Style 67% — SUCCESS.',{actor:'a',exid:1});
const WND=()=>B('SERIOUS WOUND · Right Leg','Marek Endurance 70/60% (FAILURE) versus the attack 30 (SUCCESS). Fails to resist.',{actor:'b'});
test('the blow of an exchange is held back while the engine waits for the exchange to finish',()=>{
 const atk=ATK(),loc=B('Hit Location','x',{actor:'a',target:'b',location:'Right Leg'}),hit=HIT();
 // the hit is logged and the engine now waits for the defender's Endurance roll: only the build-up is shown
 let r=arrange([atk,loc,hit],[],true);
 assert.deepEqual(r.play.map(e=>e.id),[atk.id,loc.id]);assert.deepEqual(r.hold.map(e=>e.id),[hit.id]);
 // the Endurance dice are shown at once; the wound entry joins the held ones while the engine still waits
 const wnd=WND(),dice=D();
 r=arrange([dice,wnd],r.hold,true);
 assert.equal(r.play.length,1);assert.equal(r.play[0].roll!=null,true,'the dice play now');assert.deepEqual(r.hold.map(e=>e.id),[hit.id,wnd.id]);
 // the exchange is resolved: the dice, then the whole record in order
 const end=B('FIGHT ENDS','Kethan wins. Marek has a Major Limb Wound to the Right Leg: incapacitated and prone.',{});
 const held=r.hold;r=arrange([end],held,false);
 assert.deepEqual(r.play.map(e=>e.id),[hit.id,wnd.id,end.id]);assert.deepEqual(r.hold,[]);
});
test('with nothing to wait for, or no blow yet, nothing is held; a new attack closes the held exchange first',()=>{
 const atk=ATK(),hit=HIT();
 assert.equal(arrange([atk,hit],[],false).hold.length,0,'no one to wait for: the exchange plays whole');
 assert.equal(arrange([atk],[],true).hold.length,0,'no blow yet: the windup plays and holds by itself');
 const next=B('Marek attacks','50 against Combat Style 60% — SUCCESS.',{actor:'b',exid:2}),r=arrange([next],[hit],true);
 assert.deepEqual(r.play.map(e=>e.id),[hit.id,next.id],'the held blow plays before the next attack');assert.equal(r.hold.length,0);
});
const DI=l=>({id:++bid,roll:{label:l||'d100'}}),DA=()=>DI('Attack · Combat Style 60%');
test('a finished exchange is not held back behind the next one: its blow plays before the next attack is declared',()=>{
 // Kethan misses; Marek attacks at once (an automatic action) and the engine now waits for Kethan's reaction
 const atk=ATK(),miss=B('No Damaging Hit','Marek does not defend. The attack misses.',{actor:'a'}),d2=DA(),next=B('Marek attacks','50 against Combat Style 60% — SUCCESS.',{actor:'b',exid:2});
 const r=arrange([DI(),atk,miss,d2,next],[],true);
 const ids=r.play.map(e=>e.id),at=e=>ids.indexOf(e.id);
 assert(ids.includes(miss.id),'the miss plays now');assert(at(miss)<at(d2)&&at(miss)<at(next),'the miss before the next attack and its dice');
 assert.equal(r.hold.length,0);
 // a blow held for its own exchange, then a batch that starts the next attack with its dice: the held blow first
 const hit=HIT(),late=DI(),d3=DA(),a3=B('Marek attacks','x',{actor:'b',exid:3});
 const r2=arrange([late,d3,a3],[hit],true),p2=r2.play.map(e=>e.id);
 assert(p2.indexOf(hit.id)>p2.indexOf(late.id)&&p2.indexOf(hit.id)<p2.indexOf(d3.id),'the held blow after its own late dice, before the next attack\'s dice');
});
test('a parry that wins a Trip or a Disarm: the blocked blow is drawn first, then the sweep',()=>{
 const atk=ATK(),par=B('Marek parries','x',{actor:'b'}),dt=DI(),trip=B('Trip Opponent','Kethan fails to resist and falls prone.',{actor:'b'}),dh=B('No Damaging Hit','Marek parries the blow.',{actor:'a'});
 const r=arrange([atk,par,dt,trip,dh],[],false),ids=r.play.map(e=>e.id);
 assert.deepEqual(ids,[atk.id,par.id,dh.id,dt.id,trip.id]);
 const dis=B('Disarm Opponent','The weapon lands 2m away.',{actor:'b'}),dh2=B('No Damaging Hit','x',{actor:'a'});
 assert.deepEqual(arrange([dis,dh2],[],false).play.map(e=>e.id),[dh2.id,dis.id]);
});
test('an offensive Disarm waits for its whole exchange, then is part of the one blow (Work, 2026-11-13)',()=>{
 const beat=(ev,i)=>JSON.parse(A.run(`JSON.stringify(pitsStageBeat(${JSON.stringify(ev)},${i},${JSON.stringify(names)}))`));
 for(const body of ["Marek's weapon lands 2m away.","Marek drops the weapon at their feet."]){
  // the attack, the effect chosen and resolved (with its distance roll) while location and damage are still to come
  const atk=ATK(),dd=DI('Disarm distance · d4'),dis=B('Disarm Opponent',body,{actor:'a',target:'b'});
  let r=arrange([atk,dd,dis],[],true);
  assert(!r.play.some(e=>e.id===dis.id),'the Disarm is not drawn while the engine still waits');assert.deepEqual(r.hold.map(e=>e.id),[dis.id]);
  assert(r.play.some(e=>e.id===dd.id),'its dice still show at once');
  // location, damage, then the Endurance roll: still held
  const loc=B('Hit Location','x',{actor:'a',target:'b',location:'Chest'}),dl=DI('Hit Location · d20');
  r=arrange([dl,loc],r.hold,true);assert(!r.play.some(e=>!e.roll),'nothing but dice while waiting');
  const hit=B('Kethan hits Chest','x',{actor:'a',impact:{target:'b',location:'Chest',hpLost:4},px:{total:4}}),dm=DI('Damage · Chest');
  r=arrange([dm,hit],r.hold,true);assert(!r.play.some(e=>!e.roll));
  const wnd=WND(),de=DI('Endurance');
  r=arrange([de,wnd],r.hold,false);
  const ids=r.play.map(e=>e.id),at=e=>ids.indexOf(e.id);
  assert(at(hit)>=0&&at(dis)>=0&&at(hit)<at(dis),'the blow first, then the Disarm');
  // one attack and its effect: the Disarm is folded into the blow, which knows where the weapon goes
  const ev=r.play,bi=at(hit),di=at(dis),hb=beat([atk,...ev],bi+1),db=beat([atk,...ev],di+1);
  assert.equal(hb.cue.record.disarm.type,'disarm');assert.equal(db.consumed,true,'no second swing for the Disarm');
  // and so in play, where the attack entry was in an earlier batch than its blow
  const hb2=beat(ev,bi),db2=beat(ev,di);
  assert.equal(hb2.cue.record.disarm&&hb2.cue.record.disarm.type,'disarm','without the attack entry: still part of the blow');assert.equal(db2.consumed,true);
 }
 // a defensive Disarm (the defender's, after a parry): drawn after the parry, with its own movement
 const atk=ATK(),par=B('Marek parries','x',{actor:'b'}),dis=B('Disarm Opponent',"Kethan's weapon lands 1m away.",{actor:'b',target:'a'}),dh=B('No Damaging Hit','x',{actor:'a'});
 const r=arrange([atk,par,dis,dh],[],false),ids=r.play.map(e=>e.id);
 assert.deepEqual(ids,[atk.id,par.id,dh.id,dis.id]);
 const db=JSON.parse(A.run(`JSON.stringify(pitsStageBeat(${JSON.stringify(r.play)},3,${JSON.stringify(names)}))`));
 assert.equal(db.consumed,false,'the defender\'s Disarm keeps its own movement');
});
test('a blow takes its effects and consequences into one record; those beats have no motion of their own',()=>{
 const atk=ATK(),press=B('Press Advantage','Marek cannot attack on the next Turn, but may act otherwise.',{actor:'a'}),hit=HIT(),wnd=WND(),
  limb=B('Limb Disabled',"Marek's Right Leg becomes unusable until healed to positive HP. They fall prone.",{}),end=B('FIGHT ENDS','Kethan wins. Marek is incapacitated.',{});
 const ev=[atk,press,hit,wnd,limb,end],beat=i=>JSON.parse(A.run(`JSON.stringify(pitsStageBeat(${JSON.stringify(ev)},${i},${JSON.stringify(names)}))`));
 assert.equal(beat(0).consumed,false);
 assert.equal(beat(1).consumed,true,'Press Advantage plays with the blow, not before it');
 const b=beat(2);assert.equal(b.consumed,false);assert.equal(b.cue.record.press.type,'press');assert.deepEqual(b.cue.record.after.map(c=>c.type),['wound','limb','end']);
 for(const i of [3,4,5])assert.equal(beat(i).consumed,true,'consequence '+i+' is part of the blow');
 const lone=[B('FIGHT ENDS','Marek wins. Kethan concedes the training bout.',{})];
 assert.equal(JSON.parse(A.run(`JSON.stringify(pitsStageBeat(${JSON.stringify(lone)},0,${JSON.stringify(names)}))`)).consumed,false,'a concession has no blow: it plays by itself');
 const solo=[B('Press Advantage','x',{actor:'a'})];
 assert.equal(JSON.parse(A.run(`JSON.stringify(pitsStageBeat(${JSON.stringify(solo)},0,${JSON.stringify(names)}))`)).consumed,false,'Press Advantage with no blow plays by itself');
});
test('every Pits script parses (a syntax error in the browser-only part must not pass unnoticed)',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
 for(const f of fs.readdirSync(path.join(root,'experiments')).filter(n=>/^pits-.*\.js$|^practice-guidance\.js$/.test(n)))
  new vm.Script(fs.readFileSync(path.join(root,'experiments',f),'utf8'),{filename:f});
 const html=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8');
 new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1],{filename:'practice-combat-inline.js'});
});
// (owner's fight record, 2026-11-14: against the computer, the opponent's Serious Wound and Endurance dice came after
// the blow, so the knockout and Victory were drawn before the roll that caused them)
test('an automatic fighter\'s wound dice are shown before the blow they follow, not after the knockout',()=>{
 const R=label=>({roll:{actor:'b',label,values:[1]}});
 const atk=ATK(),dmg={roll:{actor:'a',label:'Damage · Head',values:[8,1]}},hit=B('Kethan hits Head','9 total',{actor:'a',impact:{target:'b',location:'Head',hpLost:9},px:{total:9}});
 const stun=R('Serious Wound · 1d3 stunned turns'),st=B('Serious Wound · Stunned','Marek cannot attack for the next 3 Turns.',{});
 const endu=R('Endurance · serious wound to Head'),wnd=B('SERIOUS WOUND · Head','Marek Endurance 44/53% (SUCCESS) versus the attack 3 (CRITICAL). Fails to resist.',{});
 const end=B('FIGHT ENDS','Kethan wins. Marek loses consciousness from a Serious Wound to Head.',{});
 const r=arrange([atk,dmg,hit,stun,st,endu,wnd,end],[],false);
 const lab=e=>e.roll?e.roll.label.split(' ')[0]:e.title;
 assert.deepEqual(r.play.map(lab),['Kethan attacks','Damage','Serious','Endurance','Kethan hits Head','Serious Wound · Stunned','SERIOUS WOUND · Head','FIGHT ENDS']);
 // dice after the exchange (a new turn) stay where they are
 const r2=arrange([atk,dmg,hit,B('Round 2','AP refresh.',{}),R('Regain Footing · Marek brawn')],[],false);
 assert.deepEqual(r2.play.map(lab),['Kethan attacks','Damage','Kethan hits Head','Round 2','Regain']);
});
console.log(passed+' pits stage tests passed');
