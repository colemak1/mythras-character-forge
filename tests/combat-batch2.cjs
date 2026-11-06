// Combat Batch 2 fixes (docs/combat-cases-batch-1.md, C5-B2-*): Core p.89 traits,
// Kill Silently and Weapon Malfunction prerequisites, p.106 Reach and the
// p.108 distance/target-SIZ table.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const shown=[];
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,WeakSet,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
run('render=()=>{};');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const trait=n=>JSON.parse(run(`JSON.stringify(COMBAT_TRAITS.find(t=>t.name===${JSON.stringify(n)})||null)`));

test('C5-B2-T04 Blind Fighting ignores poor-light and blindness penalties (Core p.89)',()=>{
 const t=trait('Blind Fighting');assert.match(t.desc,/ignore any penalties/);assert.doesNotMatch(t.desc,/one difficulty grade/);
});
test('C5-B2-T21 the Core trait is named Skirmishing, with the Athletics cap',()=>{
 assert.equal(trait('Skirmisher'),null);const t=trait('Skirmishing');assert.match(t.desc,/Athletics/);assert.equal(t.source,'Mythras');
});
test('saved styles with the old Skirmisher name are migrated without losing other traits',()=>{
 run('S=freshState();S.styleDefs={"style:x":{weapons:["Sling"],traits:["Skirmisher","Daredevil"]},"style:y":{weapons:[],traits:["Skirmisher","Skirmishing"]}};normalizeState();');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.styleDefs["style:x"].traits)')),['Skirmishing','Daredevil']);
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.styleDefs["style:y"].traits)')),['Skirmishing'],'no duplicate after migration');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.styleDefs["style:x"].weapons)')),['Sling']);
});
test('C5-B2-T27 Mounted Skirmisher is not labelled as a Core p.89 trait',()=>{
 assert.notEqual(trait('Mounted Skirmisher').source,'Mythras');
 assert.equal(run('COMBAT_TRAITS.filter(t=>t.source==="Mythras").length'),26,'exactly the 26 Core p.89 traits');
});
test('C5-B2-T01 Kill Silently needs a Combat Style with Assassination (Core pp.89, 97)',()=>{
 run('S=freshState();S.styleDefs={"style:a":{weapons:["Dagger"],traits:[]}};stylesList=()=>[{key:"style:a",name:"Knife"}];');
 const ks='SPECIAL_EFFECTS.find(e=>e[0]==="Kill Silently")';
 const roll='{label:"Dagger",tier:"Critical",oppTier:"Failure",combat:true,combatKind:"style",combatRole:"attack",weapon:"Dagger",styleKey:"style:a"}';
 assert.equal(run(`canPickEffectForRoll(${ks},${roll})`),false,'no Assassination: not allowed');
 run('S.styleDefs["style:a"].traits=["Assassination"]');
 assert.equal(run(`canPickEffectForRoll(${ks},${roll})`),true,'with Assassination: allowed (GM confirms surprise)');
 assert.equal(run(`canPickEffectForRoll(${ks},Object.assign(${roll},{weapon:"Broadsword"}))`),false,'still a Small weapon only');
});
test('C5-B2-X15 Weapon Malfunction is offered only for firearms (Core p.101)',()=>{
 const wm='SPECIAL_EFFECTS.find(e=>e[0]==="Weapon Malfunction (Firearms)")';
 assert.equal(run(`weaponAllowsEffect(${wm},weaponByName("Short bow"))`),false);
 assert.equal(run(`weaponAllowsEffect(${wm},{name:"Arquebus",group:"Ranged"})`),true);
 assert.equal(run(`weaponAllowsEffect(${wm},{name:"Flintlock",group:"Ranged",firearm:true})`),true);
});
test('C5-B2-X12 optional Reach: Size drops by the Reach difference, haft does 1d3+1 (Core p.106)',()=>{
 const src=fs.readFileSync(path.join(root,'js','play.js'),'utf8');
 assert.doesNotMatch(src,/by <b>two categories<\/b>|Size by two categories/);
 assert.match(src,/difference between the two weapons’ Reach/);assert.match(src,/1d3\+1/);assert.match(src,/two or more/);
});
test('C5-B2-G30..G36 every printed cell of the Core p.108 distance table',()=>{
 // [distance, SIZ, steps] with harder positive, from the rendered printed table.
 const printed=[[1,0,1,0,-1,-1,-2,-2],[21,0,1,1,0,-1,-1,-2],[41,0,2,1,1,0,-1,-1],[61,0,2,2,1,1,0,-1],[81,0,3,2,2,1,1,0],[101,0,3,3,2,2,1,1],[121,0,4,3,3,2,2,1]];
 const sizes=[10,20,40,80,150,300],sizesLow=[1,11,21,41,81,151];
 for(const [d,,...row] of printed)for(let c=0;c<6;c++){
  for(const z of [sizes[c],sizesLow[c]])for(const dd of [d,d+19]){
   const r=JSON.parse(run(`JSON.stringify(rangeSizeSteps(${dd},${z}))`));
   assert.equal(r.steps,row[c],`${dd}m SIZ ${z}`);assert.equal(r.extrapolated,false);
  }
 }
});
test('beyond 140m the table progression continues and is flagged for the GM',()=>{
 const a=JSON.parse(run('JSON.stringify(rangeSizeSteps(150,10))')),b=JSON.parse(run('JSON.stringify(rangeSizeSteps(170,10))'));
 assert.equal(a.extrapolated,true);assert(b.steps>=a.steps&&a.steps>=4,'never easier with more distance');
});
test('out-of-table input gives no answer instead of a guess',()=>{
 for(const [d,z] of [[0,10],[50,0],[50,301],["x",10]])assert.equal(run(`rangeSizeSteps(${JSON.stringify(d)},${JSON.stringify(z)})`),null);
});
test('the distance helper is reachable from ranged weapon cards and explains crowd fire',()=>{
 run('S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};S.gearWeapons=["Short bow","Dagger"];APPVIEW="play";normalizeState();');
 const h=run('pmWeaponCardsHTML()');const bow=h.slice(h.indexOf('Short bow'),h.indexOf('Dagger'));
 assert.match(bow,/APP\.pmPopup\('range'\)/);assert.doesNotMatch(h.slice(h.indexOf('Dagger')),/pmPopup\('range'\)/);
 const p=run('pmRangeHelperHTML()');assert.match(p,/bystander/);assert.match(p,/none of your Special Effects/);assert.match(p,/Skirmishing/);
});
console.log(passed+' combat batch 2 tests passed');
