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
 assert.deepEqual(cue('FIGHT ENDS','Kethan wins. Marek is incapacitated.',{}),{type:'end',winner:'a'});
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
 a.run(`S.fighters.a.disarmed=false;S.fighters.a.hp['Right Arm']=0;`);l=look();
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
console.log(passed+' pits stage tests passed');
