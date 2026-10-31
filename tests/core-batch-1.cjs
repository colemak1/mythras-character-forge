const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={console,setTimeout,clearTimeout,setInterval,clearInterval,URL,Date,Map,Set,WeakMap,
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/'},supabase:{createClient:()=>({auth:{signOut:async()=>({})}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};vm.createContext(ctx);
for(const name of ['data','engine','cloud','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
run('render=()=>{};');
const test=(name,fn)=>{fn();console.log('PASS',name)};
const reset=()=>run('S=freshState();VIEW_ONLY=false;S.chars={STR:12,CON:12,SIZ:12,DEX:14,INT:12,POW:12,CHA:13};');
test('Core p.72: CHA modifier is explicit, signed, and read-only guarded',()=>{
 for(const [cha,apply,expected] of [[13,false,3],[13,true,4],[6,false,3],[6,true,2]]){
  reset();run(`S.chars.CHA=${cha};APP.xpAward(3,${apply});`);assert.equal(run('S.xp.pool'),expected);
 }
 reset();run('S.xp.pool=5;APP.xpAward(-1,true);');assert.equal(run('S.xp.pool'),4);
 run('VIEW_ONLY=true;APP.xpAward(3,true);');assert.equal(run('S.xp.pool'),4);
 assert.doesNotMatch(run('xpModalHtml()'),/id="xpApplyModifier"[^>]*checked/);
});
test('Core p.72: repeated skill improvement spends rolls against updated percent',()=>{
 reset();run('S.xp.pool=2;S.xp.usedThisRun=["std:Athletics"];Math.random=()=>0;');
 const start=run('finalPct("std:Athletics")');
 run('APP.xpSpend("std:Athletics");APP.xpSpend("std:Athletics");');
 assert.equal(run('S.xp.pool'),0);assert.equal(run('finalPct("std:Athletics")'),start+2);
 assert.equal(run('S.xp.history[0].target'),start+1);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('S.xp.pool'),0);assert.equal(run('S.xp.bonus["std:Athletics"]'),2);
});
test('Core p.72: Passion improvement spends rolls, persists, and respects access',()=>{
 reset();run('S.passions=[{name:"Loyalty",type:"org"},{name:"Love",type:"species"}];S.xp.pool=2;Math.random=()=>0;');
 const start=run('passionVal(S.passions[0])');
 assert.match(run('xpModalHtml()'),/Passions/);
 run('APP.xpSpendPassion(0);APP.xpSpendPassion(0);');
 assert.equal(run('S.xp.pool'),0);assert.equal(run('passionVal(S.passions[0])'),start+2);
 assert.equal(run('S.xp.history[0].target'),start+1);
 assert.equal(run('passionVal(S.passions[1])'),54);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('passionVal(S.passions[0])'),start+2);
 run('S.xp.pool=1;VIEW_ONLY=true;APP.xpSpendPassion(0);');assert.equal(run('S.xp.pool'),1);
 run('VIEW_ONLY=false;APP.xpSpendPassion(99);');assert.equal(run('S.xp.pool'),1);
 run('Math.random=()=>0.99;APP.xpSpendPassion(1);');assert.equal(run('passionVal(S.passions[1])'),59);
});
test('Core p.73: learn professional skills without altering creation allocations',()=>{
 reset();run('S.xp.pool=7;');const allocations=run('JSON.stringify(S.alloc)');
 run('APP.xpLearnProfessional("Lore","History",false)');assert.equal(run('S.xp.pool'),7);
 run('APP.xpLearnProfessional("Lore","",true)');assert.equal(run('S.xp.pool'),7);
 run('APP.xpLearnProfessional("Lore","History",true)');
 assert.equal(run('S.xp.pool'),4);assert.equal(run('finalPct(profKey("Lore","History"))'),24);
 assert.equal(run('JSON.stringify(S.alloc)'),allocations);assert.match(run('xpModalHtml()'),/learned for 3 Experience Rolls/);
 run('APP.xpLearnProfessional("Lore"," history ",true)');assert.equal(run('S.xp.pool'),4);
 run('APP.xpLearnProfessional("Lore","Nature",true)');assert.equal(run('S.xp.pool'),1);
 run('APP.xpLearnProfessional("Healing","",true)');assert.equal(run('S.xp.pool'),1);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('acquiredProfs().filter(p=>p.name==="Lore").length'),2);
 assert.equal(run('finalPct(profKey("Lore","History"))'),24);
 run('S.xp.pool=3;VIEW_ONLY=true;APP.xpLearnProfessional("Healing","",true)');assert.equal(run('S.xp.pool'),3);
 run('VIEW_ONLY=false;APP.xpLearnProfessional("Healing","",true)');assert.equal(run('finalPct(profKey("Healing",""))'),24);
 run('S.xp.pool=1;Math.random=()=>0;APP.xpSpend(profKey("Healing",""))');assert.equal(run('finalPct(profKey("Healing",""))'),25);
 reset();run('delete S.xp.learnedProfs;normalizeState()');assert.equal(run('S.xp.learnedProfs.length'),0);
});
test('Core p.73: mentor training steps, repeat gate, and persistence',()=>{
 reset();run('Math.random=()=>0;S.xp.pool=2;');
 for(const [diff,sides,bonus] of [[21,2,0],[30,2,0],[31,3,0],[40,3,0],[41,4,0],[51,6,0],[61,6,1],[100,6,4],[101,6,5]]){
  assert.equal(run(`trainingDie(trainingStep(${diff},"trainer")).sides`),sides);
  assert.equal(run(`trainingDie(trainingStep(${diff},"trainer")).bonus`),bonus);
 }
 assert.equal(run('trainingStep(20,"trainer")'),null);
 assert.equal(run('trainingStep(21,"critical")'),2);
 assert.equal(run('trainingDie(trainingStep(21,"fumble")).sides'),0);
 run('APP.xpTrain("std:Athletics",46,"trainer",true)');
 assert.equal(run('finalPct("std:Athletics")'),26);assert.equal(run('S.xp.pool'),2);
 run('APP.xpTrain("std:Athletics",47,"trainer",false)');assert.equal(run('finalPct("std:Athletics")'),26);
 run('APP.xpTrain("std:Athletics",47,"trainer",true)');assert.equal(run('finalPct("std:Athletics")'),27);
 assert.equal(run('S.xp.pool'),2);assert.equal(run('S.xp.trainingPending.length'),1);
 run('APP.xpTrain("std:Athletics",60,"trainer",true)');assert.equal(run('finalPct("std:Athletics")'),27);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('S.xp.trainingPending[0]'),'std:Athletics');
 run('APP.xpSpend("std:Athletics")');assert.equal(run('S.xp.trainingPending.length'),0);
 run('APP.xpTrain("std:Athletics",60,"trainer",true)');assert.equal(run('S.xp.trainingPending.length'),1);
 run('VIEW_ONLY=true;APP.xpTrain("std:Healing",100,"trainer",true)');assert.equal(run('S.xp.trainingPending.length'),1);
 reset();run('Math.random=()=>0;APP.xpTrain("std:Athletics",47,"fumble",true)');
 assert.equal(run('finalPct("std:Athletics")'),26);assert.equal(run('S.xp.trainingPending.length'),1);
 assert.match(run('xpModalHtml()'),/Train with a mentor/);
 reset();run('delete S.xp.trainingPending;normalizeState()');assert.equal(run('S.xp.trainingPending.length'),0);
});
test('Core p.82: GM-directed Passion changes persist without spending experience',()=>{
 reset();run('S.passions=[{name:"Loyalty",type:"org"},{name:"Hope",type:"species"}];S.xp.pool=2;');
 const start=run('passionVal(S.passions[0])');
 run('APP.adjustPassion(0,"8");APP.adjustPassion(0,"-3");');
 assert.equal(run('passionVal(S.passions[0])'),start+5);assert.equal(run('S.xp.pool'),2);
 assert.match(run('xpModalHtml()'),/manual change/);
 run('APP.adjustPassion(0,"-999");APP.adjustPassion(0,"1.5");APP.adjustPassion(0,"");APP.adjustPassion(9,"1");');
 assert.equal(run('passionVal(S.passions[0])'),start+5);
 run('VIEW_ONLY=true;APP.adjustPassion(0,"5");');assert.equal(run('passionVal(S.passions[0])'),start+5);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('passionVal(S.passions[0])'),start+5);assert.equal(run('passionVal(S.passions[1])'),54);
});
test('Core p.118: starting magic guidance uses the correct skill and preserves records',()=>{
 reset();run('var oldMagicSkillPct=magicSkillPct;magicSkillPct=n=>n==="Devotion"?41:n==="Exhort"?80:40;S.magic.known=[{tradition:"theism",name:"A"},{tradition:"theism",name:"B"},{tradition:"theism",name:"C"},{tradition:"theism",name:"D"}];');
 const html=run('knownMagicEditor(MAGIC_TRADITIONS.find(t=>t.key==="theism"))');
 assert.match(html,/Devotion: 3 at 41%/);assert.match(html,/4 named abilities/);assert.match(html,/cult rank/);
 assert.equal(run('S.magic.known.length'),4);
 assert.match(run('knownMagicEditor(MAGIC_TRADITIONS.find(t=>t.key==="sorcery"))'),/Invocation: 2 at 40%/);
 run('magicSkillPct=oldMagicSkillPct;');
});
test('Core p.118: starting magic review is explicit, persistent and becomes stale',()=>{
 reset();run('var previousViewOnlyBlock=viewOnlyBlock;viewOnlyBlock=()=>false;S.magic.known=[{tradition:"theism",name:"Bless"}]');
 assert.equal(run('S.magic.startingReviewMode'),undefined);
 run('APP.startingMagicMode("new");APP.startingMagicConfirm()');
 assert.equal(run('S.magic.startingReviewSignature===startingMagicReviewSignature()'),true);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState()`);
 assert.equal(run('S.magic.startingReviewSignature===startingMagicReviewSignature()'),true);
 run('S.magic.known[0].name="Other"');assert.equal(run('S.magic.startingReviewSignature===startingMagicReviewSignature()'),false);
 run('APP.startingMagicMode("experienced")');assert.equal(run('S.magic.known.length'),1);run('viewOnlyBlock=previousViewOnlyBlock');
});
test('Core p.180: explicitly confirmed pool rank limits are non-destructive',()=>{
 reset();run('S.magic.devotional=0;APP.devotionalRank("initiate");');
 assert.equal(run('devotionalRankLimit()'),3);
 run('APP.devotional("4")');assert.equal(run('devotionalMax()'),0);assert.match(run('DEVOTIONAL_MSG'),/rank limit/);
 run('APP.devotional("3");S.magic.devotional=12;APP.devotionalRank("initiate");');
 assert.equal(run('devotionalMax()'),12);assert.match(run('knownMagicEditor(MAGIC_TRADITIONS.find(t=>t.key==="theism"))'),/points are preserved/);
 run('APP.devotional("9");');assert.equal(run('devotionalMax()'),9);
 run('S.chars.POW=13;');assert.equal(run('devotionalRankLimit()'),3.25);
 assert.match(run('knownMagicEditor(MAGIC_TRADITIONS.find(t=>t.key==="theism"))'),/confirm rounding/);
 run('S.chars.POW=12;APP.devotionalRank("lay");');assert.equal(run('devotionalRankLimit()'),0);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('S.magic.devotionalRank'),"lay");assert.equal(run('devotionalMax()'),9);
});
test('Core p.180: confirmed donation transfers personal points without adding to the old pool',()=>{
 reset();run('S.chars.POW=12;S.magic.devotionalRank="highpriest";S.magic.devotional=12;S.magic.devotionalUsed=9;S.play.magic=12');
 run('APP.devotionalDonate(7,false)');assert.equal(run('playCurMagic()'),12);
 run('APP.devotionalDonate(7,true)');assert.equal(run('playCurMagic()'),5);assert.equal(run('devotionalCur()'),7);
 run('APP.devotionalDonate(3,true)');assert.equal(run('playCurMagic()'),5);assert.equal(run('devotionalCur()'),7);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState()`);assert.equal(run('devotionalCur()'),7);
 run('VIEW_ONLY=true;APP.devotionalDonate(8,true)');assert.equal(run('playCurMagic()'),5);
});
test('Core pp.34,70–71: ageing review tracks human bands without changing characteristics',()=>{
 reset();run('S.age.category="senior";S.age.years=44;');
 assert.equal(run('humanAgeingInfo().grade'),"Easy");assert.match(run('ageingReviewBlock()'),/not been reviewed/);
 const chars=run('JSON.stringify(S.chars)');run('APP.ageingReview("resolved","Rolled at the table")');
 assert.match(run('ageingReviewBlock()'),/Rolled at the table/);assert.equal(run('JSON.stringify(S.chars)'),chars);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.match(run('ageingReviewBlock()'),/Rolled at the table/);
 run('S.age.years=50');assert.equal(run('humanAgeingInfo().grade'),"Standard");assert.match(run('ageingReviewBlock()'),/not been reviewed/);
 for(const [age,grade] of [[39,null],[40,"Easy"],[60,"Hard"],[70,"Formidable"],[80,"Herculean"],[90,"Hopeless"]]){
  run(`S.age.years=${age}`);assert.equal(run('humanAgeingInfo()?.grade||null'),grade);
 }
 run('S.species="other";S.age.category="senior";');assert.equal(run('humanAgeingInfo()'),null);assert.match(run('ageingReviewBlock()'),/may not apply/);
});
test('Core p.58: legacy armour migrates and limbs can differ without changing totals',()=>{
 reset();run('S.armor={Head:"None",Chest:"None",Abdomen:"None","Each Arm":"Half Plate (hoplite plate)","Each Leg":"None"};normalizeState();');
 const right=run('S.armor["Right Arm"]');assert.equal(run('S.armor["Left Arm"]'),right);
 const enc=run('armorEncTotal()'),cost=run('armorCostTotal()');run('normalizeState()');
 assert.equal(enc,4);assert.equal(cost,1000);assert.equal(run('armourPenaltyToInit()'),2);
 assert.equal(run('armorEncTotal()'),enc);assert.equal(run('armorCostTotal()'),cost);
 run('APP.setArmor("Right Arm","None");');assert.equal(run('armorApAt("Right Arm")'),0);assert.equal(run('S.armor["Left Arm"]'),right);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('armorApAt("Right Arm")'),0);assert.equal(run('S.armor["Left Arm"]'),right);
 run('APP.setArmor("Each Arm","None")');assert.equal(run('armorApAt("Left Arm")'),0);
 run('APP.setArmor("Right Arm","Half Plate (hoplite plate)");S.play.hp["Right Arm"]=4;S.play.hp["Left Arm"]=4;');
 ctx.document.querySelector=()=>({value:"4"});run('APP.playApplyDamage("Right Arm");APP.playApplyDamage("Left Arm");');
 assert.equal(run('S.play.hp["Right Arm"]'),4);assert.equal(run('S.play.hp["Left Arm"]'),0);ctx.document.querySelector=()=>null;
});
test('Core pp.94–95: parry calculation needs explicit result and compares all sizes',()=>{
 reset();const sizes=['Small','Medium','Large','Huge','Enormous'];
 for(let a=0;a<sizes.length;a++)for(let d=0;d<sizes.length;d++){
  const got=run(`parryDamage(8,"${sizes[a]}","${sizes[d]}","success").remaining`);
  assert.equal(got,a<=d?0:a===d+1?4:8);
 }
 assert.equal(run('parryDamage(7,"Huge","Large","success").remaining'),3.5);
 assert.equal(run('parryDamage(7,"Huge","Huge","failed").remaining'),7);
 assert.equal(run('parryDamage(7,"Huge","Huge","none").remaining'),7);
 assert.equal(run('parryDamage(7,"Huge","Huge","")'),null);
 assert.equal(run('parryDamage(-1,"Huge","Large","success")'),null);
 run('S.play.selectedLoc="Head"');assert.match(run('pmLocDetail()'),/Parry damage calculator/);
});
test('Core p.110: wound incident records track hits and survive healing and reload',()=>{
 reset();run('S.play.hp.Head=3;');ctx.document.querySelector=()=>({value:"3"});
 run('APP.playApplyDamage("Head")');assert.equal(run('S.play.woundEvents.length'),1);
 assert.equal(run('S.play.woundEvents[0].severity'),'serious');assert.equal(run('S.play.woundEvents[0].damage'),3);
 assert.match(run('pmWoundEvents("Head")'),/unconscious for 3 minutes/);
 run('APP.woundEventUpdate(0,"outcome","failure");APP.woundEventUpdate(0,"interruptionTurns","2");APP.woundEventUpdate(0,"notes","attack 46");APP.woundEventUpdate(0,"treated",true);');
 run('APP.playApplyDamage("Head")');assert.equal(run('S.play.woundEvents.length'),2);
 assert.equal(run('S.play.woundEvents[0].outcome'),'failure');assert.equal(run('S.play.woundEvents[0].interruptionTurns'),2);
 run('APP.playSetHP("Head",2);APP.woundEventResolve(0)');assert.equal(run('S.play.woundEvents[0].resolved'),true);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('S.play.woundEvents[0].notes'),'attack 46');assert.equal(run('S.play.woundEvents[0].treated'),true);
 run('APP.woundEventReopen(0);VIEW_ONLY=true;APP.woundEventUpdate(0,"notes","changed")');assert.equal(run('S.play.woundEvents[0].notes'),'attack 46');
 reset();run('S.play.hp["Right Arm"]=0;APP.playQuickDamage("Right Arm",1)');assert.equal(run('S.play.woundEvents.length'),0);
 run('delete S.play.woundEvents;normalizeState()');assert.equal(run('S.play.woundEvents.length'),0);ctx.document.querySelector=()=>null;
});
test('Core p.110: wound overview shows unresolved recorded outcomes',()=>{
 reset();run('S.play.woundEvents=[{loc:"Head",severity:"serious",damage:4,outcome:"failure",resolved:false},{loc:"Right Arm",severity:"major",damage:6,outcome:"pending",treated:false,resolved:false}]');
 const html=run('pmWoundOverview()');assert.match(html,/Wound watch/);assert.match(html,/4 minutes/);assert.match(html,/Endurance check pending/);
 run('S.play.woundEvents[0].resolved=true');assert.doesNotMatch(run('pmWoundOverview()'),/4 minutes/);
 run('S.play.woundEvents[1].resolved=true');assert.equal(run('pmWoundOverview()'),"");
});
test('Core p.80: permanent injury maximum preserves deep wounds and recalculates thresholds',()=>{
 reset();const base=run('playMaxHP("Right Arm")');assert(base>=3);
 run('S.play.hp["Right Arm"]=-playMaxHP("Right Arm");');const deep=run('playCurHP("Right Arm")');
 run('APP.playSetMaxHP("Right Arm",2,false)');assert.equal(run('playMaxHP("Right Arm")'),base);
 run('APP.playSetMaxHP("Right Arm",2,true)');assert.equal(run('playMaxHP("Right Arm")'),2);assert.equal(run('playCurHP("Right Arm")'),deep);
 assert.equal(run('playHPState("Right Arm").cls'),'major');assert.equal(run('playMaxHP("Left Arm")'),base);
 assert.equal(run('charVitals(JSON.parse(JSON.stringify(S))).locs.find(x=>x.loc==="Right Arm").max'),2);
 run('S.play.selectedLoc="Right Arm"');assert.match(run('pmLocDetail()'),/Permanent injury: location maximum/);
 run('APP.playQuickDamage("Right Arm",1)');assert.equal(run('playCurHP("Right Arm")'),deep,'further damage must not heal a deep wound');
 run('APP.playNaturalRecovery("Right Arm",0,true)');assert.equal(run('playCurHP("Right Arm")'),deep+2);
 const save=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(save)});normalizeState()`);assert.equal(run('playMaxHP("Right Arm")'),2);
 run('VIEW_ONLY=true;APP.playClearMaxHP("Right Arm",true)');assert.equal(run('playMaxHP("Right Arm")'),2);
 run('VIEW_ONLY=false;APP.playClearMaxHP("Right Arm",true)');assert.equal(run('playMaxHP("Right Arm")'),base);
 reset();run('delete S.play.hpMaxOverride;normalizeState()');assert.equal(run('Object.keys(S.play.hpMaxOverride).length'),0);
});
test('Core p.80: natural recovery uses current severity and requires Major treatment',()=>{
 reset();run('S.play.hp.Head=0;');assert.equal(run('naturalRecoveryInfo("Head").interval'),"week");
 run('APP.playNaturalRecovery("Head",0,false)');assert.equal(run('S.play.hp.Head'),2);assert.equal(run('naturalRecoveryInfo("Head").interval'),"day");
 run('S.play.hp.Head=-playMaxHP("Head");');const before=run('S.play.hp.Head');
 assert.equal(run('naturalRecoveryInfo("Head").interval'),"month");run('APP.playNaturalRecovery("Head",0,false)');assert.equal(run('S.play.hp.Head'),before);
 run('APP.playNaturalRecovery("Head",1,true)');assert.equal(run('S.play.hp.Head'),before+1);
 run('VIEW_ONLY=true;APP.playNaturalRecovery("Head",0,true)');assert.equal(run('S.play.hp.Head'),before+1);
});
test('Core p.71: fatigue guidance distinguishes recovery causes',()=>{
 reset();run('S.play.fatigue="Tired";APP.playFatigueCause("blood");');assert.match(run('fatigueRecoveryText(S.play.fatigueCause)'),/day after bleeding stops/);
 run('APP.playFatigueCause("asphyxiation")');assert.match(run('fatigueRecoveryText(S.play.fatigueCause)'),/minute after it ends/);
 run('APP.playFatigueCause("exertion")');assert.match(run('fatigueRecoveryText(S.play.fatigueCause)'),/complete rest/);
});
test('Core pp.71,79,110: damage and recovery guidance',()=>{
 reset();run('S.play.fatigue="Winded";');
 assert.match(run('playWoundEffectText("Right Arm","serious")'),/1d3 turns/);
 assert.match(run('fatigueRecoveryText()'),/Physical exertion only/);
 assert.match(run('fatigueRecoveryText()'),/day after bleeding stops/);
 assert.match(run('fatigueRecoveryText()'),/minute after it ends/);
 run('S.play.selectedLoc="Right Arm";');assert.match(run('pmLocDetail("Right Arm")'),/after parry and other reductions, before armour/);
 run('S.cultStyleOn=true;S.cultStyleName="Guard";');
 assert.equal(run('allEntries().find(e=>e.key==="style:cult").base'),26);
 assert(!run('allEntries().find(e=>e.key==="style:cult").provisional'));
});
test('Changing allocated selections frees unavailable points, retaining shared skills',()=>{
 reset();run('S.culture="Civilised";S.cultProf=["Commerce",null,null];S.alloc.culture[profKey("Commerce","")]=10;S.alloc.bonus[profKey("Commerce","")]=8;APP.pickProf("cult",0,"Courtesy");');
 assert.equal(run('aGet("culture",profKey("Commerce",""))'),0);assert.equal(run('aGet("bonus",profKey("Commerce",""))'),0);
 run('S.carProf=["Courtesy",null,null];S.alloc.bonus[profKey("Courtesy","")]=9;APP.pickProf("cult",0,"Commerce");');
 assert.equal(run('aGet("bonus",profKey("Courtesy",""))'),9);
 run('S.hobby="Lore";S.hobbySpec="Local";S.alloc.bonus[profKey("Lore","Local")]=15;APP.hobbySpec("History");');
 assert.equal(run('aGet("bonus",profKey("Lore","Local"))'),0);
 run('S.qProf=["Commerce",null,null];S.alloc.quick[profKey("Commerce","")]=15;APP.pickProf("quick",0,"Courtesy");');
 assert.equal(run('aGet("quick",profKey("Commerce",""))'),0);
});
test('Legacy hidden points remain accessible for recovery without changing saves on load',()=>{
 reset();run('S.alloc.bonus["prof:Removed"]=12;normalizeState();');
 assert.equal(run('aSum("bonus")'),12);
 assert.match(run('allocTable("bonus",[],150,0,15,"")'),/Return points to pool/);
 run('APP.clearAllocation("bonus","prof:Removed");');assert.equal(run('aSum("bonus")'),0);
});
