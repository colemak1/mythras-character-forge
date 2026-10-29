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
