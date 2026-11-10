// Core pp.8–16,28–34: creation constraints and preservation across complete builds.
// Rule-entry fixtures are independently maintained in rules-smoke/core-career-entries.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const ctx={console,assert,setTimeout,clearTimeout,setInterval,clearInterval,URL,Date,Map,Set,WeakMap,
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/'},supabase:{createClient:()=>({auth:{signOut:async()=>({})}})},requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','render','router','play','app']){
 let src=fs.readFileSync(path.join(__dirname,'../js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');vm.runInContext(src,ctx,{filename:name+'.js'});
}
vm.runInContext(`
render=()=>{};
const checkStep=name=>{const v=validate(currentSteps().indexOf(name));assert(v.ok,name+': '+v.msg);};
const allocate=(phase,keys,total,cap,min=0)=>{
 keys=[...new Set(keys)];S.alloc[phase]=Object.fromEntries(keys.map(k=>[k,min]));let left=total-keys.length*min;
 for(const key of keys){const n=Math.min(cap-min,left);S.alloc[phase][key]+=n;left-=n;}
 assert.equal(left,0,'not enough eligible skills for '+phase);
};
function configured(culture,career,style,linked,age){
 S=freshState();S.charMode='pb';S.chars={STR:12,CON:10,SIZ:12,DEX:12,INT:12,POW:12,CHA:10};
 S.culture=culture;const c=CULTURES[culture];S.cultChoice=c.choice?c.choice.from.slice(0,c.choice.pick):[];
 S.cultProf=c.prof.slice(0,3).map(x=>parseOffer(x).name);S.cultProfSpec=c.prof.slice(0,3).map(x=>parseOffer(x).hint||QUICK_SPEC_HINTS[parseOffer(x).name]||'');
 S.cultStyleOn=style;S.cultStyleName=style?'Guard':'';S.cultStyleSmallAlloc=false;
 S.career=career;const k=CAREERS[career];
 S.carStyles=k.styleSlots.map((_,i)=>linked&&style?{mode:'link',link:'style:cult',name:''}:{mode:'new',name:'Career style '+i});
 S.carProf=k.prof.slice(0,3).map(x=>parseOffer(x).name);
 S.carProfSpec=k.prof.slice(0,3).map((x,i)=>{const n=parseOffer(x).name;return parseOffer(x).hint||QUICK_SPEC_HINTS[n]||'';});
 // Distinct repeated offers such as Crafter's two Crafts remain individual skills.
 S.carProfSpec=S.carProfSpec.map((s,i)=>S.carProf.indexOf(S.carProf[i])<i?s+' second':s);
 S.age.category=age;S.age.years={young:14,adult:22,middle:35,senior:54,old:75}[age];
 allocate('culture',cultureReqKeys().filter(k=>k!=='style:cult'),100,15,5);
 if(style)S.alloc.culture['style:cult']=0;
 allocate('career',careerKeys(),100,15);
 allocate('bonus',allEntries().map(e=>e.key),{young:100,adult:150,middle:200,senior:250,old:300}[age],{young:10,adult:15,middle:20,senior:25,old:30}[age]);
}
let builds=0;
for(const culture of Object.keys(CULTURES))for(const career of Object.keys(CAREERS))for(const age of ['young','adult','middle','senior','old'])for(const [style,linked] of [[false,false],[true,false],[true,true]]){
 configured(culture,career,style,linked,age);
 for(const step of ['Concept','Characteristics','Attributes','Culture','Career','Bonus Skills','Community'])checkStep(step);
 const before=JSON.stringify({chars:S.chars,alloc:S.alloc,profs:acquiredProfs(),styles:stylesList(),values:allEntries().map(e=>[e.key,finalPct(e.key)])});
 S=JSON.parse(JSON.stringify(S));normalizeState();
 const after=JSON.stringify({chars:S.chars,alloc:S.alloc,profs:acquiredProfs(),styles:stylesList(),values:allEntries().map(e=>[e.key,finalPct(e.key)])});
 assert.equal(after,before,culture+' / '+career+' / '+age+' persisted scores');
 for(const step of ['Culture','Career','Bonus Skills'])checkStep(step);
 builds++;
}
console.log('PASS',builds,'full creation builds: four cultures × 24 careers × five ages × three style/link configurations, including round trips');
// Exhaust every cultural travel choice rather than only the first option.
let travelCases=0;
for(const [culture,choices] of Object.entries({Barbarian:[['Boating'],['Ride']],Civilised:[[]],Nomadic:[['Athletics','Boating'],['Athletics','Swim'],['Athletics','Drive'],['Athletics','Ride'],['Boating','Swim'],['Boating','Drive'],['Boating','Ride'],['Swim','Drive'],['Swim','Ride'],['Drive','Ride']],Primitive:[['Athletics'],['Boating'],['Swim']]}))for(const choice of choices){
 configured(culture,'Merchant',false,false,'adult');S.cultChoice=choice;allocate('culture',cultureReqKeys(),100,15,5);checkStep('Culture');travelCases++;
}
console.log('PASS',travelCases,'cultural travel choice sets');
// Positive and negative totals/limits must be tested independently of UI clamps.
for(const [phase,step,cap] of [['culture','Culture',15],['career','Career',15],['bonus','Bonus Skills',15]]){
 configured('Civilised','Merchant',false,false,'adult');const valid=JSON.stringify(S.alloc[phase]);const keys=Object.keys(S.alloc[phase]);
 for(const bad of [-1,0.5,NaN,'5',Infinity]){S.alloc[phase]=JSON.parse(valid);S.alloc[phase][keys[0]]=bad;assert(!validate(currentSteps().indexOf(step)).ok,phase+' bad '+bad);}
 S.alloc[phase]=JSON.parse(valid);S.alloc[phase][keys[0]]=cap+1;assert(!validate(currentSteps().indexOf(step)).ok);
 S.alloc[phase]=JSON.parse(valid);S.alloc[phase]['prof:Lore|not selected']=1;assert(!validate(currentSteps().indexOf(step)).ok);
 S.alloc[phase]=JSON.parse(valid);S.alloc[phase][keys[0]]--;assert(!validate(currentSteps().indexOf(step)).ok);
}
console.log('PASS allocation invalid values, hidden skills, over-cap and wrong totals in all three pools');
// Shared known skills accumulate each pool once, never once per offer.
configured('Civilised','Merchant',true,false,'adult');S.cultProf=['Commerce','Courtesy','Streetwise'];S.cultProfSpec=['','',''];S.carProf=['Commerce','Courtesy','Streetwise'];S.carProfSpec=['','',''];
S.alloc.culture={'prof:Commerce|':7};S.alloc.career={'prof:Commerce|':13};S.alloc.bonus={'prof:Commerce|':15};
assert.equal(finalPct('prof:Commerce|'),22+7+13+15);assert.equal(acquiredProfs().filter(p=>p.name==='Commerce').length,1);
assert.equal(finalPct('std:Customs'),64);assert.equal(finalPct('std:Native Tongue'),62);
console.log('PASS overlapping culture/career skills merge exactly once with independent allocations');
S=freshState();S.chars={STR:12,CON:11,SIZ:13,DEX:8,INT:10,POW:10,CHA:10};
S.poolA=[12,11,8,10,10];S.poolB=[13,10];S.assignA={STR:0,CON:1,DEX:2,POW:3,CHA:4};S.assignB={SIZ:0,INT:1};checkStep('Characteristics');
const recorded=JSON.stringify(S);
for(const corrupt of [()=>S.assignA.CHA=3,()=>S.assignB.INT=8,()=>S.poolA[0]=13,()=>delete S.assignA.DEX]){
 S=JSON.parse(recorded);corrupt();const before=JSON.stringify(S);assert(!validate(1).ok);assert.equal(JSON.stringify(S),before);
}
S=JSON.parse(recorded);APP.manual('STR','12.5');assert.equal(S.chars.STR,12.5);assert(!validate(1).ok);
S=JSON.parse(recorded);S.poolA=[];S.poolB=[];checkStep('Characteristics');assert(creationReview().some(r=>r.text.includes('no recorded dice pools')));
console.log('PASS saved dice provenance, duplicate assignments, fractional manual input and legacy review');
S=freshState();S.chars={STR:12,CON:10,SIZ:12,DEX:12,INT:12,POW:12,CHA:10};
S.fixedAP=4;assert(!validate(2).ok);for(const ap of [0,2,3]){S.fixedAP=ap;checkStep('Attributes');}
S.passions=[{name:'Love <script>',type:'romantic',subjPOW:'',subjCHA:''}];
S.age.category='senior';S.age.years=54;S.age.coreEvents=[{roll:4,summary:'A'},{roll:40,summary:'B'},{roll:81,summary:''}];
assert(creationReview().some(r=>r.step==='Passions'&&r.status==='manual'));assert(creationReview().some(r=>r.text.startsWith('Background events:')));assert(creationReview().some(r=>r.text.startsWith('Ageing:')));
S.passions[0].startingOverride=75;S.age.coreEvents[2].summary='C';S.age.ageingReview={key:ageingReviewKey(),status:'resolved'};
assert(!creationReview().some(r=>r.status==='manual'&&['Concept','Passions'].includes(r.step)));
S.chars.STR=99;const i=currentSteps().indexOf('Characteristics');assert(creationReview().some(r=>r.status==='error'&&r.step==='Characteristics'));
S.overrides[i]=true;assert(creationReview().some(r=>r.status==='override'&&r.step==='Characteristics'));
assert.match(stepFinish(),/Review before play/);assert.doesNotMatch(stepFinish(),/<script>/);
S.age.coreEvents=[null,{roll:900,summary:'Preserve for correction'}];normalizeState();assert.equal(S.age.coreEvents[0].summary,'Preserve for correction');assert.doesNotThrow(()=>coreBackgroundEventsBlock());assert(creationReview().some(r=>r.text.startsWith('Background events:')));
console.log('PASS final review separates corrections, GM overrides and manual events/ageing/Passions; malformed event notes remain recoverable');
S=freshState();S.career='Warrior';S.carProf=['Lore','Lore',null];S.carProfSpec=['Military History','Strategy and Tactics',''];
const picks=profPickers('car',['Lore (Military History)','Lore (Strategy and Tactics)','Survival'],3);
assert.equal((picks.match(/value="Lore" selected/g)||[]).length,2,'one selected Lore option per occupied slot');
assert.equal((picks.match(/<option value="Lore"/g)||[]).length,3,'one Lore option in each picker');
assert.match(picks,/Military History; Strategy and Tactics/);assert.match(picks,/value="Strategy and Tactics"/);
S.culture='unknown old culture';S.career='unknown old career';S.alloc.culture={'std:Athletics':10};
assert.doesNotThrow(()=>stepCulture());assert.doesNotThrow(()=>stepCareer());assert.doesNotThrow(()=>creationReview());assert.equal(S.alloc.culture['std:Athletics'],10);
assert.doesNotThrow(()=>APP.pickCulture('Civilised'));assert.equal(S.culture,'Civilised');assert.doesNotThrow(()=>APP.pickCareer('Merchant'));assert.equal(S.career,'Merchant');
console.log('PASS repeated career contexts display together without changing selections; unknown legacy culture/career remains recoverable');
S=freshState();S.chars={STR:12,CON:10,SIZ:12,DEX:12,INT:12,POW:12,CHA:10};S.age.coreEvents=[{roll:81,summary:'Family fortune <script>'}];
APP.skipCoreBackgroundEvents();assert(S.age.coreEventsSkipped);assert.equal(S.age.coreEvents[0].roll,81);assert(coreBackgroundRollsValid());
S=JSON.parse(JSON.stringify(S));normalizeState();assert(S.age.coreEventsSkipped);assert(!creationReview().some(r=>r.text.startsWith('Background events:')));
assert.match(stepConcept(),/Optional Background Events skipped/);assert.match(characterSheetBody(),/Family fortune &lt;script&gt;/);assert.match(buildMD(),/Optional Background Events skipped/);assert.match(buildMD(),/d100: 81/);
VIEW_ONLY=true;S.age.coreEventsSkipped=false;APP.skipCoreBackgroundEvents();assert(!S.age.coreEventsSkipped);VIEW_ONLY=false;
console.log('PASS optional Core events can be skipped without losing notes; status, dice and summaries survive reload, sheet and export');
const originalRandom=Math.random,histogram={};
for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
 S=freshState();let i=0;Math.random=()=>(([a,b,c][i++%3]-1)/6);APP.rollPools();
 assert.equal(S.poolA.length,5);assert.equal(S.poolB.length,2);assert(S.poolA.every(v=>v===a+b+c));
 assert.equal(S.poolB[0],a+b+6);assert.equal(S.poolB[1],c+a+6);histogram[S.poolA[0]]=(histogram[S.poolA[0]]||0)+1;
}
Math.random=originalRandom;assert.deepEqual(Object.values(histogram),[1,3,6,10,15,21,25,27,27,25,21,15,10,6,3,1]);
console.log('PASS all 216 ordinary 3d6 combinations and both 2d6+6 pool calculations');
configured('Civilised','Merchant',false,false,'adult');S.money.dice=[1,1,1,1];S.age.coreEventsSkipped=true;APPVIEW='character';S.step=currentSteps().indexOf('Finish');S.chars.STR=99;
assert(stepFinish().includes('onclick="APP.toPlay()" disabled'));APP.toPlay();assert.equal(APPVIEW,'character');assert.equal(S.step,1);
S.overrides[1]=true;APP.toPlay();assert.equal(APPVIEW,'play','explicit existing GM override still honored');
console.log('PASS final action rechecks earlier creation edits and honors an explicit GM override');
S=freshState();S.overrides={1:true,2:true,3:true,4:true,5:true};APP.setMode('quick');
assert.equal(S.overrides[1],true);assert.equal(S.overrides[2],true);assert.equal(S.overrides[3],undefined);
APP.setMode('full');assert.equal(S.overrides[3],undefined);assert.equal(S.overrides[4],undefined);assert.equal(S.overrides[5],undefined);
console.log('PASS Full/Quick mode changes cannot transfer an old skill-step GM override to another step');
`,ctx,{filename:'creation-matrix'});
