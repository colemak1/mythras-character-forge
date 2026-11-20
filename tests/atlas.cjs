// World Guide atlas (js/atlas.js, js/atlas-lore.js, assets/atlas/): the data
// file matches the picture's canvas and the plates, lore keys point at real
// places, and the pure helpers (search, zoom, fit, routes) behave.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'assets/atlas/atlas-data.json'),'utf8'));
const ctx={console,esc:t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
vm.createContext(ctx);
for(const f of ['atlas-lore','atlas'])vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),ctx,{filename:f+'.js'});
const run=s=>vm.runInContext(s,ctx),J=s=>JSON.parse(JSON.stringify(run(s))); // J: a plain copy of a value from the vm realm
ctx.DATA=data;
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};

test('the data has the 20 nations of the overview map, on the picture\'s 4:3 canvas',()=>{
 assert.equal(data.width/data.height,4/3);
 const names=data.nations.map(n=>n.name).sort();
 assert.deepEqual(names,['Ba Riggelby','Buffalo','Desolice','Eintritt','Felindel','Jazir','Joda','Katalli','Khor','Kioke','Leefland','L’zar','Marett','Menesha','Satilan','Telesco','The Hix','Valeshar','Vish’ka','Zhalin']);
 for(const n of data.nations){
  assert.match(n.d,/^M[\d.]+ [\d.]+L/,n.name+' has an outline');
  assert(n.box[0]>=0&&n.box[2]<=data.width&&n.box[1]>=0&&n.box[3]<=data.height,n.name+' box on the canvas');
  assert(data.settlements.some(s=>s.i===n.capital&&s.capital&&s.nation===n.id),n.name+' capital is one of its settlements');
 }
});
test('every nation has its stand-in plate, and every stamped atlas file exists',()=>{
 const plates=run('ATLAS_PLATES');
 for(const n of data.nations){assert(plates[n.id],n.id+' plate');assert(fs.existsSync(path.join(root,'assets/atlas/plates',plates[n.id].split('?')[0])),n.id+' plate file');}
 for(const u of [run('ATLAS_DATA_URL'),run('ATLAS_MAP_URL')])assert(fs.existsSync(path.join(root,u.split('?')[0])),u);
});
test('settlement ids are unique and lore keys point at real places',()=>{
 const ids=new Set(data.settlements.map(s=>s.id));assert.equal(ids.size,data.settlements.length);
 const lore=run('ATLAS_LORE'),nations=new Set(data.nations.map(n=>n.id));
 for(const k of Object.keys(lore.nations))assert(nations.has(k),'lore nation '+k);
 for(const k of Object.keys(lore.places))assert(ids.has(k),'lore place '+k);
 const eras=new Set(lore.eras.map(e=>e.id)),evIds=new Set();
 for(const e of lore.events){
  assert(/^[a-z0-9-]+$/.test(e.id)&&!evIds.has(e.id),'event id '+e.id);evIds.add(e.id);
  assert(!e.era||eras.has(e.era),'event era '+e.id);
  (e.nations||[]).forEach(n=>assert(nations.has(n),e.id+' nation '+n));
  (e.places||[]).forEach(p=>assert(ids.has(p),e.id+' place '+p));
 }
});
test('Valeshar\'s capital shows its lore name, and search finds it by either name',()=>{
 const g=data.settlements.find(s=>s.id==='golshehr');
 assert.equal(g.nation,'valeshar');assert(g.capital);
 assert.equal(run('atlasPlaceName')(g),'Shamur');
 for(const q of ['sham','Golsh']){const r=run('atlasSearch')(data,q,5);assert.equal(r[0].sel,'s-golshehr',q);assert.equal(r[0].name,'Shamur');}
 const v=run('atlasSearch')(data,'vale',5);assert.equal(v[0].sel,'n-valeshar');
 assert.equal(run('atlasSearch')(data,'vishka',3)[0].sel,'n-vishka','apostrophes are ignored');
 assert.equal(run('atlasSearch')(data,'   ',3).length,0);
});
test('zoom levels, fitting and clamping',()=>{
 const lod=run('atlasLod');
 assert.deepEqual([0.5,1.3,2.5,5].map(lod),[0,1,2,3]);
 const f=run('atlasFit')([100,100,300,200],1000,500,0);
 assert.equal(f.k,5);assert.equal(f.x+200*f.k,500);assert.equal(f.y+150*f.k,250);
 const c=run('atlasClamp')({k:99,x:5000,y:-5000},800,600,1024,768,.5,6);
 assert.equal(c.k,6);assert.equal(c.x,400,'the map\'s left edge stops at the middle');assert.equal(c.y,300-768*6);
 const z=run('atlasZoomAt')({k:1,x:0,y:0},2,100,50);assert.deepEqual({...z},{k:2,x:-100,y:-50},'the point under the pointer stays put');
 const home=run('atlasHomeView')(data,{x:0,y:0,w:390,h:600});
 assert(home.k>390/data.width*1.5,'a phone starts zoomed in past fit-the-width');
});
test('selection ids round-trip and invalid ones are refused',()=>{
 const p=run('atlasParseSel');
 assert.deepEqual({...p('n-the-hix')},{kind:'n',id:'the-hix'});assert.equal(p('x-foo'),null);assert.equal(p('n-'),null);
 const ok=run('atlasSelValid');
 assert(ok(data,'n-zhalin'));assert(ok(data,'s-golshehr'));assert(!ok(data,'n-rove'));assert(!ok(data,'e-nothing'));
});
test('events sort by year, filter by era and attach to their nations and places',()=>{
 run(`ATLAS_LORE.eras.push({id:'a',name:'Age A',short:'AA'});
  ATLAS_LORE.events.push({id:'late',year:50,era:'a',title:'Late',places:['golshehr']},{id:'early',year:3,era:'a',title:'Early',nations:['khor']},{id:'undated',title:'Undated',label:'Long ago'});`);
 assert.deepEqual(J('atlasSortedEvents("all").map(e=>e.id)'),['early','late','undated']);
 assert.deepEqual(J('atlasSortedEvents("a").map(e=>e.id)'),['early','late']);
 assert.deepEqual(J('atlasEventsFor(DATA,"n","valeshar").map(e=>e.id)'),['late'],'an event at a nation\'s settlement belongs to the nation');
 assert.deepEqual(J('atlasEventsFor(DATA,"s","golshehr").map(e=>e.id)'),['late']);
 assert.equal(run('atlasYearText(ATLAS_LORE.events[0],null)'),'50 AA');
 assert.equal(run('atlasYearText(ATLAS_LORE.events[2],null)'),'Long ago');
 assert.equal(run('atlasSearch(DATA,"earl",3)[0].sel'),'e-early');
 run('ATLAS_DATA=DATA;ATLAS.era="all";ATLAS.timeline=true;');
 const tl=run('atlasTimelineHTML()');
 assert(tl.indexOf('<b>Early</b>')>0&&tl.indexOf('<b>Early</b>')<tl.indexOf('<b>Late</b>'));assert.match(tl,/Age A/);
 run('ATLAS_LORE.events.length=0;ATLAS_LORE.eras.length=0;');
 assert.match(run('atlasTimelineHTML()'),/still being written/);
});
test('the map layer draws every nation and every settlement that belongs to one',()=>{
 const svg=run('atlasSvgHTML(DATA)');
 assert.equal((svg.match(/class="atlas-nation"/g)||[]).length,20);
 assert.equal((svg.match(/class="atlas-pl"/g)||[]).length,data.settlements.filter(s=>s.nation).length);
 assert.match(svg,/data-sel="s-golshehr"[^>]*>.*?<text[^>]*>Shamur</);
 for(const g of ['sea','rivers','roads','nations','places'])assert(svg.includes('atlas-g-'+g),g);
});
test('routes: #/world opens the atlas, a selection is part of the link, chapters still work',()=>{
 const r={window:{addEventListener(){}},addEventListener(){},location:{hash:''}};vm.createContext(r);
 vm.runInContext(fs.readFileSync(path.join(root,'js/router.js'),'utf8'),r);
 const parse=h=>JSON.parse(JSON.stringify(vm.runInContext('parseRoute('+JSON.stringify(h)+')',r)));
 assert.deepEqual(parse('#/world'),{view:'world',chapterId:'atlas'});
 assert.deepEqual(parse('#/world/atlas'),{view:'world',chapterId:'atlas'});
 assert.deepEqual(parse('#/world/atlas/s-golshehr'),{view:'world',chapterId:'atlas',place:'s-golshehr'});
 assert.deepEqual(parse('#/world/places'),{view:'world',chapterId:'places'});
 assert.equal(parse('#/world/atlas/x-bad'),null);
 vm.runInContext('var APPVIEW="world",WORLD_CHAPTER="atlas",WORLD_PLACE="n-the-hix";',r);
 assert.equal(vm.runInContext('currentRoute()',r),'/world/atlas/n-the-hix');
 vm.runInContext('WORLD_PLACE=null',r);assert.equal(vm.runInContext('currentRoute()',r),'/world/atlas');
});
console.log(passed+' atlas tests passed');
