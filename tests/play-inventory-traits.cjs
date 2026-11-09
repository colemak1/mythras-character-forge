// Play Mode inventory: add Core weapons and gear by search (owner, 2026-11-07),
// and Combat Style Traits limited to the 26 Core traits for now.
//
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
for(const name of ['combat-rules','data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
ctx.__shown=shown;run('pmDiceShow=r=>__shown.push(r.label+" "+r.roll+" "+r.tier);render=()=>pmDiceSync();');
run('render=()=>{};');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const setup=()=>run('S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};S.money.dice=[{n:1,sides:6}];S.money.rolled=100;APPVIEW="play";VIEW_ONLY=false;VIEW_ONLY_IS_DM=false;PM_ITEM_PAY=false;PM_MSG=null;');

test('the catalogue covers Core weapons and gear, with ENC and price',()=>{
 setup();const cat=JSON.parse(run('JSON.stringify(pmItemCatalog())'));
 const bs=cat.find(x=>x.name==='Broadsword');assert.equal(bs.kind,'weapon');assert.equal(bs.enc,2);assert.equal(bs.cost,175);
 const rope=cat.find(x=>x.name==='Hemp rope (10 m)');assert.equal(rope.kind,'gear');assert.equal(rope.enc,2);assert.equal(rope.cost,10);
 assert(!cat.some(x=>x.name==='Atlatl'),'no entries without damage dice');
 const h=run('pmGearPanelHTML()');assert.match(h,/id="pmItemSearch"/);assert.match(h,/APP\.playAddCatalogItem\('weapon','Broadsword'\)/);
});
test('a found sword goes into the inventory for free and shows on the Combat tab',()=>{
 setup();const money=run('moneyRemaining()'),enc=run('gearEncTotal()');
 run('APP.playAddCatalogItem("weapon","Broadsword")');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.inventory)')),[{name:'Broadsword',qty:1,enc:2,cost:0,weapon:true}]);
 assert.equal(run('moneyRemaining()'),money,'found: no silver spent');
 assert.equal(run('gearEncTotal()'),enc+2,'ENC counted once');
 assert.deepEqual([...run('pmCarriedWeapons()')],['Broadsword']);
 assert.match(run('pmWeaponCardsHTML()'),/>Broadsword</);
 assert.match(run('PM_MSG'),/Broadsword \(also on the Combat tab\), found \(free\)/);
 run('APP.playAddCatalogItem("weapon","Broadsword")');assert.equal(run('S.inventory[0].qty'),2,'a second one stacks');
});
test('"Paid for it" uses the listed price; gear adds without the weapon flag',()=>{
 setup();const money=run('moneyRemaining()');run('PM_ITEM_PAY=true;APP.playAddCatalogItem("gear","Hemp rope (10 m)")');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.inventory[0])')),{name:'Hemp rope (10 m)',qty:1,enc:2,cost:10});
 assert.equal(run('moneyRemaining()'),money-10);
 run('PM_ITEM_PAY=false;APP.playAddCatalogItem("gear","Hemp rope (10 m)")');assert.equal(run('S.inventory.length'),2,'found and paid copies stay separate');
});
test('unknown items are ignored, and a teammate viewing the sheet cannot add',()=>{
 setup();run('APP.playAddCatalogItem("weapon","Lightsaber");APP.playAddCatalogItem("gear","Broadsword")');assert.equal(run('S.inventory.length'),0);
 run('VIEW_ONLY=true;VIEW_ONLY_IS_DM=false;APP.playAddCatalogItem("weapon","Dagger")');assert.equal(run('S.inventory.length'),0);
 run('VIEW_ONLY_IS_DM=true;APP.playAddCatalogItem("weapon","Dagger")');assert.equal(run('S.inventory.length'),1,'the GM may add loot');
});
test('Combat Style Traits: only the 26 Core traits are offered; saved supplement traits can still be removed',()=>{
 setup();assert.equal(run('offeredCombatTraits().length'),26);assert(run('offeredCombatTraits().every(t=>t.source==="Mythras")'));
 run('S.cultStyleOn=true;S.styleDefs["style:cult"]={weapons:[],traits:[]}');
 const supp=run('COMBAT_TRAITS.find(t=>t.source!=="Mythras").name');
 run('APP.toggleStyleTrait("style:cult",'+JSON.stringify(supp)+')');assert.equal(run('styleDef("style:cult").traits.length'),0,'supplement trait not addable');
 run('APP.toggleStyleTrait("style:cult","Daredevil")');assert.deepEqual([...run('styleDef("style:cult").traits')],['Daredevil']);
 run('styleDef("style:cult").traits.push('+JSON.stringify(supp)+')');
 const h=run('combatStyleBuilderHTML({key:"style:cult",name:"Test"})');
 assert.match(h,/Search the 26 Core Combat Style Traits/);assert.match(h,/\(supplement\)/);
 assert.doesNotMatch(h,new RegExp('cstyle-traitbody"><b>'+supp.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'<'),'not in the picker list');
 run('APP.toggleStyleTrait("style:cult",'+JSON.stringify(supp)+')');assert.deepEqual([...run('styleDef("style:cult").traits')],['Daredevil'],'removal still works');
});
test('the search covers Core weapons, armour, gear and ammunition only (owner, 2026-11-07)',()=>{
 setup();const cat=JSON.parse(run('JSON.stringify(pmItemCatalog())'));
 assert.deepEqual([...new Set(cat.map(x=>x.kind))].sort(),['ammo','armour','gear','weapon']);
 for(const n of ['Boots','Horse (riding)','Two-wheeled cart','Trebuchet','Trail rations (7 days)'])assert(!cat.some(x=>x.name===n),n+' is not offered');
 const suit=cat.find(x=>x.name==='Mail (mail hauberk, laminar) armour, full suit');assert.equal(suit.enc,30);assert.equal(suit.cost,6300,'Core p.58 printed suit values');
 const piece=cat.find(x=>x.name==='Mail (mail hauberk, laminar) armour, one location');assert.equal(piece.enc,5);assert.equal(piece.cost,900);
 assert.equal(cat.find(x=>x.name==='Arrows (12)').cost,4);
});
test('picked-up armour is carried at full ENC and does not change worn armour',()=>{
 setup();const enc=run('gearEncTotal()'),ap=run('armorApAt("Chest")');
 run('APP.playAddCatalogItem("armour","Mail (mail hauberk, laminar) armour, one location")');
 assert.equal(run('gearEncTotal()'),enc+5);assert.equal(run('armorApAt("Chest")'),ap);
});
console.log(passed+' play inventory and traits tests passed');
