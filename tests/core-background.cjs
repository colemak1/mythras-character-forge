const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={console,setTimeout,clearTimeout,setInterval,clearInterval,URL,Date,Map,Set,WeakMap,
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/'},supabase:{createClient:()=>({auth:{signOut:async()=>({})}})},requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');if(name==='app')src=src.replace(/boot\(\);\s*$/,'');vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx),test=(name,fn)=>{fn();console.log('PASS',name)};
const reset=()=>run('S=freshState();VIEW_ONLY=false;render=()=>{};S.chars={STR:12,CON:12,SIZ:12,DEX:14,INT:12,POW:12,CHA:13};');
const result=(table,roll,max=false)=>{ctx.table=table;ctx.roll=roll;ctx.max=max;return JSON.parse(run('JSON.stringify(familyTableResult(table,roll,sides=>max?sides:1))'));};
// Independent transcription of the rendered Core p.25 table bands, including zero follow-up dice.
const cases={
 parents:[[1,20,'Both parents living',[]],[21,40,'Single parent: father',[]],[41,60,'One birth parent and a stepparent',[]],[61,80,'Single parent: mother',[]],[81,100,'Both parents dead',[]]],
 siblings:[[1,10,'No siblings',[]],[11,30,'1 sibling(s)',[4]],[31,70,'1 sibling(s)',[6]],[71,90,'1 sibling(s)',[8]],[91,100,'1 sibling(s)',[10]]],
 extended:[[1,10,'0 grandparent(s); 0 aunt(s)/uncle(s); 0 cousin(s)',[]],[11,30,'0 grandparent(s); 1 aunt(s)/uncle(s); 1 cousin(s)',[2,2,3]],[31,70,'0 grandparent(s); 1 aunt(s)/uncle(s); 1 cousin(s)',[3,3,4]],[71,90,'1 grandparent(s); 1 aunt(s)/uncle(s); 1 cousin(s)',[3,4,6]],[91,100,'2 grandparent(s); 1 aunt(s)/uncle(s); 1 cousin(s)',[3,6,8]]],
 reputation:[[1,15,'Poor reputation; 1 enemies or rivals',[3]],[16,35,'Sound reputation, with hidden secrets; 1 enemy or rival',[]],[36,65,'Sound reputation; no additional relationships',[]],[66,85,'Good reputation, potentially vulnerable to scandal; 1 contact or ally',[]],[86,100,'Excellent reputation; 1 contacts or allies',[3]]],
 connections:[[1,20,'No notable connections',[]],[21,80,'Community connections; Ally',[4]],[81,90,'Local influence; Ally, Ally',[4,4]],[91,95,'Regional influence; Ally, Ally, Ally',[4,4,4]],[96,100,'National influence; Ally, Ally, Ally, Ally',[4,4,4,4]]]
};
test('Core p.25: all 500 family table results and every follow-up die size',()=>{
 for(const [table,bands] of Object.entries(cases))for(const [lo,hi,summary,dice] of bands)for(let r=lo;r<=hi;r++){
  const got=result(table,r);assert.equal(got.roll,r);assert.equal(got.summary,summary,table+' '+r);assert.deepEqual(got.dice,dice.map(sides=>({sides,value:1})));
 }
});
test('Core p.25: maximum follow-up counts and all connection types',()=>{
 for(const [r,expected] of [[11,4],[31,6],[71,8],[91,10]])assert.equal(result('siblings',r,true).summary,expected+' sibling(s)');
 for(const [r,expected] of [[11,'1 grandparent(s); 2 aunt(s)/uncle(s); 3 cousin(s)'],[31,'2 grandparent(s); 3 aunt(s)/uncle(s); 4 cousin(s)'],[71,'3 grandparent(s); 4 aunt(s)/uncle(s); 6 cousin(s)'],[91,'4 grandparent(s); 6 aunt(s)/uncle(s); 8 cousin(s)']])assert.equal(result('extended',r,true).summary,expected);
 assert.match(result('reputation',1,true).summary,/3 enemies or rivals/);assert.match(result('reputation',100,true).summary,/3 contacts or allies/);
 assert.equal(run('familyTableResult("connections",100,(()=>{let n=0;return ()=>++n;})()).summary'),'National influence; Ally, Contact, Enemy, Rival');
 for(const r of [0,101,1.5,'20',null])assert.equal(result('parents',r),null);assert.equal(result('unknown',50),null);
 assert.throws(()=>run('familyTableResult("siblings",20,()=>0)'),/Invalid family die/);
});
test('family rolls persist and reproduce; malformed records cannot fabricate outcomes',()=>{
 reset();run('S.community.parents="Written parents";S.community.connections=[{type:"Enemy",name:"Existing",notes:"Keep"}];S.community.rolls={extended:familyTableResult("extended",100,()=>1),connections:familyTableResult("connections",100,()=>4)};');
 const before=run('JSON.stringify(S.community)');run('S=JSON.parse(JSON.stringify(S));normalizeState();');assert.equal(run('JSON.stringify(S.community)'),before);
 assert.match(run('stepCommunity()'),/Written parents/);assert.match(run('stepCommunity()'),/National influence; Rival, Rival, Rival, Rival/);
 run('S.community.rolls.parents={roll:1,dice:[],summary:"forged"};S.community.rolls.siblings={roll:20,dice:[{sides:6,value:4}],summary:"forged"};normalizeState();');
 assert.equal(run('S.community.rolls.parents.summary'),'Both parents living');assert.equal(run('S.community.rolls.siblings'),undefined);
 assert.equal(run('S.community.connections[0].name'),'Existing');
});
test('family handler preserves notes, honors reroll cancellation and blocks view-only changes',()=>{
 reset();run('debounceFire=(key,fn)=>fn();Math.random=()=>0;S.community.family="Existing family";S.community.connections=[{type:"Contact",name:"Mira",notes:"Friend"}];APP.rollFamily("parents");');
 assert.equal(run('S.community.rolls.parents.roll'),1);assert.equal(run('S.community.family'),'Existing family');assert.equal(run('S.community.connections.length'),1);
 ctx.confirm=()=>false;run('Math.random=()=>0.999;APP.rollFamily("parents");');assert.equal(run('S.community.rolls.parents.roll'),1);
 ctx.confirm=()=>true;run('APP.rollFamily("parents");');assert.equal(run('S.community.rolls.parents.roll'),100);
 run('VIEW_ONLY=true;APP.rollFamily("siblings");APP.rollFamily("unknown");');assert.equal(run('S.community.rolls.siblings'),undefined);
 run('VIEW_ONLY=false;APP.rollFamily("unknown");');assert.equal(run('S.community.rolls.unknown'),undefined);
});
test('Core p.23: GM starting override replaces formula while preserving earned changes',()=>{
 reset();run('S.passions=[{name:"Love",type:"romantic",subjPOW:"",subjCHA:"",xpBonus:8}];APP.pas(0,"startingOverride","75");');
 assert.equal(run('passionVal(S.passions[0])'),83);assert.match(run('stepPassions()'),/earned Passion changes still apply/);
 run('S=JSON.parse(JSON.stringify(S));normalizeState();');assert.equal(run('passionVal(S.passions[0])'),83);
 for(const v of ['-1','1.5','invalid','Infinity']){ctx.input=v;run('APP.pas(0,"startingOverride",input);');assert.equal(run('passionVal(S.passions[0])'),83);}
 run('APP.pas(0,"startingOverride","0");');assert.equal(run('passionVal(S.passions[0])'),8);
 run('VIEW_ONLY=true;APP.pas(0,"startingOverride","100");');assert.equal(run('passionVal(S.passions[0])'),8);
 run('VIEW_ONLY=false;APP.pas(0,"startingOverride","");');assert.equal(run('passionVal(S.passions[0])'),'?');
 run('APP.pas(0,"subjPOW","11");APP.pas(0,"subjCHA","9");');assert.equal(run('passionVal(S.passions[0])'),58);
 run('APP.pas(0,"type","concept");');assert.equal(run('passionVal(S.passions[0])'),62);assert.match(run('stepPassions()'),/A concept or ideal/);
 run('APP.pas(0,"xpBonus","900");');assert.equal(run('S.passions[0].xpBonus'),8);
});
test('Core p.23: marital status uses base Influence and its one-tenth threshold',()=>{
 for(let roll=1;roll<=100;roll++){
  ctx.roll=roll;const got=JSON.parse(run('JSON.stringify(marriageResult(roll,26))'));
  assert.equal(got.status,roll<=2?'Married':roll<=26?'Betrothed':'Neither married nor betrothed by this roll');
 }
 assert.equal(run('marriageResult(3,30).status'),'Married');assert.equal(run('marriageResult(4,30).status'),'Betrothed');
 for(const r of [0,101,1.5]){ctx.roll=r;assert.equal(run('marriageResult(roll,26)'),null);}
 reset();run('Math.random=()=>0.03;S.alloc.bonus["std:Influence"]=15;APP.rollHousehold("marriage");');
 assert.equal(run('S.community.marriageRoll.baseInfluence'),26);assert.equal(run('S.community.marriageRoll.status'),'Betrothed');
 const saved=run('JSON.stringify(S.community.marriageRoll)');ctx.confirm=()=>false;run('Math.random=()=>0;APP.rollHousehold("marriage");');assert.equal(run('JSON.stringify(S.community.marriageRoll)'),saved);
 ctx.confirm=()=>true;run('VIEW_ONLY=true;APP.rollHousehold("marriage");');assert.equal(run('JSON.stringify(S.community.marriageRoll)'),saved);
});
test('Core pp.23,34: optional child counts and ages cover all five parent categories',()=>{
 for(const [category,min,max,sides,n] of [['young',1,4,4,1],['adult',1,4,4,1],['middle',17,27,6,2],['senior',28,43,6,3],['old',44,64,6,4]]){
  ctx.category=category;
  const low=JSON.parse(run('JSON.stringify(childrenResult(category,(()=>{let i=0;return ()=>i++===0?4:1;})()))'));
  assert.equal(low.count,3);assert.deepEqual(low.ages,[min,min,min]);assert.equal(low.dice.length,1+3*n);assert.deepEqual(low.dice.slice(1).map(x=>x.sides),Array(3*n).fill(sides));
  const high=JSON.parse(run('JSON.stringify(childrenResult(category,sides=>sides))'));assert.deepEqual(high.ages,[max,max,max]);
  assert.equal(run('childrenResult(category,()=>1).count'),0);assert.equal(run('childrenResult(category,()=>1).dice.length'),1);
 }
 assert.equal(run('childrenResult("unknown")'),null);
 reset();run('S.community.household="Agreed household";S.community.marriageRoll=marriageResult(2,26);S.community.childrenRoll=childrenResult("middle",sides=>sides);S=JSON.parse(JSON.stringify(S));normalizeState();');
 assert.equal(run('S.community.household'),'Agreed household');assert.deepEqual(JSON.parse(run('JSON.stringify(S.community.childrenRoll.ages)')),[27,27,27]);assert.match(run('householdRollLines().join(" ")'),/twins or triplets/);
 run('S.community.childrenRoll.dice[1].sides=4;normalizeState();');assert.equal(run('S.community.childrenRoll'),null);
});
test('saved background rolls and household notes reach both sheet and Markdown export',()=>{
 reset();run('S.concept.name="Background QA";S.community.parents="Parent note";S.community.siblings="Sibling note";S.community.resources="Resource note";S.community.household="Household note";S.community.rolls.parents=familyTableResult("parents",60);S.community.marriageRoll=marriageResult(2,26);S.community.childrenRoll=childrenResult("adult",()=>1);');
 const sheet=run('characterSheetBody()'),md=run('buildMD()');
 for(const text of ['Parent note','Sibling note','Resource note','Household note','One birth parent and a stepparent','Married','base Influence: 26','Children (parent category: Adult) — 0']){assert.ok(sheet.includes(text),'sheet: '+text);assert.ok(md.includes(text),'markdown: '+text);}
 run('S.community.household="<img src=x onerror=alert(1)>";');assert.doesNotMatch(run('characterSheetBody()'),/<img src=x/);assert.match(run('characterSheetBody()'),/&lt;img/);
});
