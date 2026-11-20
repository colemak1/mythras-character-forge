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
test('every nation has its own map, stamped, and its rectangle holds the nation',()=>{
 const crypto=require('node:crypto');
 for(const n of data.nations){
  const det=data.details[n.id];assert(det,n.id+' nation map');
  const [file,v]=det.src.split('?v=');
  assert(fs.existsSync(path.join(root,file)),det.src);
  assert.equal(v,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,10),det.src+' stamp (rerun scripts/build-atlas-plates.py)');
  assert(det.x<=n.box[0]&&det.y<=n.box[1]&&det.x+det.w>=n.box[2]&&det.y+det.h>=n.box[3],n.id+' map covers the nation');
  assert(Math.abs(det.px[0]/det.w-det.px[1]/det.h)<.05,n.id+' one scale both ways');
 }
 for(const u of [run('ATLAS_DATA_URL'),run('ATLAS_MAP_URL')])assert(fs.existsSync(path.join(root,u.split('?')[0])),u);
});
test('Katalli holds the whole peninsula (owner, 2026-11-20)',()=>{
 const k=data.nations.find(n=>n.id==='katalli');
 assert(k.box[1]<495&&k.box[3]>585&&k.box[0]<40,'the outline reaches the south-western tip: '+k.box);
 assert(data.settlements.filter(s=>s.nation==='katalli').length>=50);
 assert(!data.settlements.some(s=>!s.nation&&s.x<120&&s.y>480&&s.y<640),'no unclaimed settlement left on the peninsula');
});
test('town maps: Azgaar\'s Watabou links, with the lore name',()=>{
 const g=data.settlements.find(s=>s.id==='golshehr');
 assert.equal(g.map,'https://watabou.github.io/city-generator/?name=Golshehr&population=88943&size=77&seed=693271150001&river=0&coast=0&farms=0&citadel=1&urban_castle=0&hub=0&plaza=0&greens=0&temple=0&walls=1&shantytown=0&style=natural');
 assert.match(run('atlasTownLink')(g,'Shamur'),/\?name=Shamur&population=88943&/);
 for(const s of data.settlements){
  if(s.group==='fort')assert.equal(s.map,null,s.id);
  else if(s.group==='village')assert.match(s.map,/^https:\/\/watabou\.github\.io\/village-generator\/\?pop=/,s.id);
  else assert.match(s.map,/^https:\/\/watabou\.github\.io\/city-generator\/\?name=/,s.id);
 }
 assert.match(run('atlasTownHTML')(g,'Shamur'),/href="https:\/\/watabou[^"]*name=Shamur/,'the panel links to the generator');
});
test('a nation or its settlement opens the nation\'s own map; events and nothing do not',()=>{
 const of=run('atlasNationOf');
 assert.equal(of(data,'n-valeshar'),'valeshar');assert.equal(of(data,'s-golshehr'),'valeshar');
 assert.equal(of(data,'e-anything'),null);assert.equal(of(data,null),null);
 const det=data.details.valeshar;
 assert(run('atlasDetailScale')(det)>5,'the stand-in plate is sharper than the whole map');
 const c=run('atlasClamp')({k:6,x:99999,y:99999},800,600,1024,768,.5,10,[det.x,det.y,det.x+det.w,det.y+det.h]);
 assert.equal(c.x,400-det.x*6,'panning stops at the nation map\'s edge');
});
test('three levels: a nation opens its own map, a settlement its town map, a fort stays on the nation map (owner, 2026-11-20)',()=>{
 const lv=sel=>J('atlasLevelOf(DATA,'+JSON.stringify(sel)+')');
 assert.deepEqual(lv(null),{level:'world',nation:null,town:null});
 assert.deepEqual(lv('e-anything'),{level:'world',nation:null,town:null});
 assert.deepEqual(lv('n-valeshar'),{level:'nation',nation:'valeshar',town:null});
 assert.deepEqual(lv('s-golshehr'),{level:'town',nation:'valeshar',town:'golshehr'});
 const fort=data.settlements.find(s=>s.group==='fort'&&s.nation);
 assert.deepEqual(lv('s-'+fort.id),{level:'nation',nation:fort.nation,town:null});
 assert(run('atlasDepth("town")>atlasDepth("nation")&&atlasDepth("nation")>atlasDepth("world")'));
});
test('inside a nation the map is locked and fills the screen: nothing past its edges ever shows (owner, 2026-11-20)',()=>{
 const lock=run('atlasLockClamp'),min=run('atlasLockMin'),box={x:0,y:0,w:800,h:600},rect=[100,100,300,200];
 const kMin=min(800,600,rect);assert.equal(kMin,6,'it fills both ways: the larger of 800/200 and 600/100');
 const far=lock({k:8,x:99999,y:-99999},box,rect,kMin,20);
 assert.equal(far.x,-100*8,'the left edge stops at the screen\'s left edge');
 assert.equal(far.y,600-200*8,'the bottom edge stops at the screen\'s bottom edge');
 const other=lock({k:8,x:-99999,y:99999},box,rect,kMin,20);
 assert.equal(other.x,800-300*8);assert.equal(other.y,-100*8);
 const out=lock({k:1,x:500,y:500},box,rect,kMin,20);
 assert.equal(out.k,6,'cannot zoom out past filling the screen');
 for(const v of [out,far,other]){
  assert(v.x+rect[0]*v.k<=0&&v.x+rect[2]*v.k>=800,'covers the width');
  assert(v.y+rect[1]*v.k<=0&&v.y+rect[3]*v.k>=600,'covers the height');
 }
 const side=lock({k:6,x:-99999,y:0},{x:0,y:0,w:500,h:600},rect,kMin,20);
 assert.equal(side.x+300*6,500,'on a desktop the east edge can come as far as the panel');
});
test('the scroll wheel goes between levels: in over a nation, out past a nation\'s widest view (owner, 2026-11-20)',()=>{
 const w=o=>J('atlasWheelIntent('+JSON.stringify(o)+')'),dive=run('ATLAS_DIVE_K');
 assert.equal(w({level:'world',k:dive*.5,factor:1.2}).go,null,'far out: just zooms');
 assert.equal(w({level:'world',k:dive*.9,factor:1.2}).go,'in','crossing the dive zoom goes in');
 assert.equal(w({level:'world',k:dive*.9,factor:.8}).go,null,'zooming out on the whole map never travels');
 const n={level:'nation',kMin:3,kMax:8};
 assert.equal(w({...n,k:5,factor:.8}).go,null,'inside the range: just zooms');
 let r=w({...n,k:3,factor:.9});assert.equal(r.go,null,'one small notch at the widest view is not enough');
 r=w({...n,k:3,factor:.9,push:r.push});r=w({...n,k:3,factor:.9,push:r.push});
 assert.equal(r.go,'out','keeping on scrolling out leaves the nation');
 assert.equal(w({...n,k:8,factor:.9,push:.25}).go,null,'turning round starts the count again');
 assert.equal(w({...n,k:8,factor:1.5}).go,'in','scrolling on at the closest view goes into a town');
 assert.equal(w({level:'town',k:8,factor:.5}).go,null);
});
test('no present day until the owner sets one (845 PE is Azgaar\'s placeholder)',()=>{
 assert.equal(run('ATLAS_LORE.calendar'),null);assert.equal(run('atlasCalendar()'),null);
 run('ATLAS_DATA=DATA;ATLAS.era="all";');assert.doesNotMatch(run('atlasTimelineHTML()'),/Now ·/);
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
