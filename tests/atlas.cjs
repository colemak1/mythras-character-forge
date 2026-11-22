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
 const html=run('atlasTownHTML')(data,g,'Shamur');
 assert.match(html,/Street map/);assert.doesNotMatch(html,/href=|generator ↗/,'read-only: no link to regenerate it (Atlas UX spec)');
 assert.equal(run('atlasTownHTML')(data,data.settlements.find(s=>s.map&&!(data.towns||{})[s.id]),'X'),'','no street map baked: nothing');
});
test('street maps are baked pictures, stamped, on the site (Atlas UX spec: no generator, no iframe)',()=>{
 const crypto=require('node:crypto'),ids=Object.keys(data.towns||{});
 assert(ids.includes('golshehr'),'Shamur has a street map');
 for(const id of ids){
  const t=data.towns[id],s=data.settlements.find(x=>x.id===id);
  assert(s&&s.map,id+' is a settlement with a town');
  const [file,v]=t.src.split('?v=');
  assert(fs.existsSync(path.join(root,file)),t.src);
  assert.equal(v,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,10),t.src+' stamp');
  assert(t.w>0&&t.h>0&&t.px[0]/t.w>=1,id+' size');
 }
 const js=fs.readFileSync(path.join(root,'js/atlas.js'),'utf8');
 assert.doesNotMatch(js,/<iframe/,'no generator iframe (it trapped the scroll wheel)');
});
test('one label for a renamed place: the plate\'s old name is erased (Work 2026-11-20, Shamur over Golshehr)',()=>{
 const erase=fs.readFileSync(path.join(root,'scripts/patch-plate-labels.py'),'utf8');
 for(const s of data.settlements){
  if(run('atlasPlaceName')(s)===s.name||!(data.details[s.nation]||{}).labels)continue;
  assert(new RegExp('"'+s.id+'":').test(erase),s.id+' is renamed in the lore: add its plate label to scripts/patch-plate-labels.py');
 }
 assert.match(run('atlasSvgHTML(DATA)'),/class="atlas-pl has-town is-renamed"[^>]*data-sel="s-golshehr"/,'it keeps its own label at the nation level, and shows its street map');
});
test('a nation or its settlement opens the nation\'s own map; events and nothing do not',()=>{
 const of=run('atlasNationOf');
 assert.equal(of(data,'n-valeshar'),'valeshar');assert.equal(of(data,'s-golshehr'),'valeshar');
 assert.equal(of(data,'e-anything'),null);assert.equal(of(data,null),null);
 const det=data.details.valeshar;
 assert(run('atlasDetailScale')(det)>5,'the stand-in plate is sharper than the whole map');
 const c=run('atlasClamp')({k:6,x:99999,y:99999},800,600,1024,768,.5,10,[det.x,det.y,det.x+det.w,det.y+det.h]);
 assert.equal(c.x,-det.x*6,'panning stops with the nation map\'s edge at the screen\'s');
});
test('three levels: a nation opens its own map, a settlement its town map, a fort stays on the nation map (owner, 2026-11-20)',()=>{
 const lv=sel=>J('atlasLevelOf(DATA,'+JSON.stringify(sel)+')');
 assert.deepEqual(lv(null),{level:'world',nation:null,town:null});
 assert.deepEqual(lv('e-anything'),{level:'world',nation:null,town:null});
 assert.deepEqual(lv('n-valeshar'),{level:'nation',nation:'valeshar',town:null});
 assert.deepEqual(lv('s-golshehr'),{level:'town',nation:'valeshar',town:'golshehr'});
 const fort=data.settlements.find(s=>s.group==='fort'&&s.nation);
 assert.deepEqual(lv('s-'+fort.id),{level:'nation',nation:fort.nation,town:null});
 const unbaked=data.settlements.find(s=>s.map&&s.nation&&!data.towns[s.id]);
 assert.deepEqual(lv('s-'+unbaked.id),{level:'nation',nation:unbaked.nation,town:null},'no street map baked yet: the nation map');
 assert(run('atlasDepth("town")>atlasDepth("nation")&&atlasDepth("nation")>atlasDepth("world")'));
});
test('full bleed at every level: the map covers the screen, no grey round it (Atlas UX spec, 2026-11-21)',()=>{
 const cover=run('atlasCoverK'),clamp=run('atlasClamp'),rect=[100,100,300,200];
 const kMin=cover(800,600,rect);assert.equal(kMin,6,'zooms out only until it covers the screen');
 const far=clamp({k:6,x:99999,y:-99999},800,600,1024,768,kMin,20,rect);
 assert.equal(far.x,-100*6,'its west edge stops at the screen\'s left');
 assert.equal(far.y,600-200*6,'its south edge at the screen\'s bottom');
 assert.equal(clamp({k:1,x:0,y:0},800,600,1024,768,kMin,20,rect).k,kMin);
 for(const [w,h] of [[1280,700],[390,560],[1920,800]]){
  const k=cover(w,h,[0,0,data.width,data.height]),v=clamp({k:k*.5,x:500,y:500},w,h,data.width,data.height,k,20);
  assert(v.x<=0&&v.y<=0&&v.x+data.width*v.k>=w-1e-9&&v.y+data.height*v.k>=h-1e-9,'the whole map covers '+w+' x '+h);
 }
});
test('the breadcrumb: Sit’ota › Valeshar › Shamur, every step but the last goes back (Atlas UX spec)',()=>{
 const c=at=>J('atlasCrumbs(DATA,'+JSON.stringify(at)+')');
 assert.deepEqual(c({level:'world'}),[{label:'Sit’ota',sel:null}]);
 assert.deepEqual(c({level:'nation',nation:'valeshar'}).map(x=>x.label),['Sit’ota','Valeshar']);
 assert.deepEqual(c({level:'town',nation:'valeshar',town:'golshehr'}),[{label:'Sit’ota',sel:null},{label:'Valeshar',sel:'n-valeshar'},{label:'Shamur',sel:'s-golshehr'}]);
 const html=run('atlasCrumbsHTML(DATA,{level:"town",nation:"valeshar",town:"golshehr"})');
 assert.match(html,/<button[^>]*onclick="atlasSelect\(null\)">Sit’ota<\/button>/);
 assert.match(html,/<button[^>]*onclick="atlasSelect\('n-valeshar',\{fly:true\}\)">Valeshar<\/button>/);
 assert.match(html,/<span class="atlas-crumb" aria-current="location">Shamur<\/span>/);
});
test('placeholder entries show the facts and "Lore coming soon", never "No entry yet" (Atlas UX spec)',()=>{
 run('ATLAS_DATA=DATA;');
 const vish=run('atlasDetailHTML({kind:"n",id:"vishka"})');
 assert.match(vish,/Lore coming soon/);assert.match(vish,/<dt>Street maps<\/dt>/);
 const unbaked=data.settlements.find(s=>s.map&&s.nation&&!data.towns[s.id]&&!(run('ATLAS_LORE.places')[s.id]));
 const pl=run('atlasDetailHTML({kind:"s",id:'+JSON.stringify(unbaked.id)+'})');
 for(const re of [/Lore coming soon/,/<dt>Nation<\/dt>/,/<dt>Tier<\/dt>/,/<dt>Street map<\/dt><dd>Not yet/])assert.match(pl,re);
 assert.match(run('atlasDetailHTML({kind:"s",id:"golshehr"})'),/<dt>Street map<\/dt><dd><svg[^]*?Yes/);
 for(const f of ['atlas','atlas-lore'])assert.doesNotMatch(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),/No entry yet/);
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
 assert.equal(w({level:'town',k:8,kMin:3,kMax:12,factor:.5}).go,null,'a town zooms out first');
 let t=w({level:'town',k:3,kMin:3,kMax:12,factor:.8});t=w({level:'town',k:3,kMin:3,kMax:12,factor:.8,push:t.push});
 assert.equal(t.go,'out','then scrolling on out goes back to the nation');
 assert.equal(w({level:'town',k:12,kMin:3,kMax:12,factor:1.5}).go,null,'nothing deeper than a town');
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
 assert.deepEqual([0.5,1.3,1.6,2.5,5].map(lod),[0,0,1,2,3],'a desktop landing (k about 1.25) shows no settlement names over the nations\' own');
 const f=run('atlasFit')([100,100,300,200],1000,500,0);
 assert.equal(f.k,5);assert.equal(f.x+200*f.k,500);assert.equal(f.y+150*f.k,250);
 const c=run('atlasClamp')({k:99,x:5000,y:-5000},800,600,1024,768,.5,6);
 assert.equal(c.k,6);assert.equal(c.x,0,'the map\'s left edge stops at the screen\'s');assert.equal(c.y,600-768*6);
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
test('sample events: marked as samples, and each shows where it happened (owner, 2026-11-20)',()=>{
 const evs=run('ATLAS_LORE.events');assert(evs.length>=8&&evs.every(e=>e.sample),'every made-up event is marked sample');
 run('ATLAS_DATA=DATA;ATLAS.era="all";');assert.match(run('atlasTimelineHTML()'),/Sample events/);
 for(const e of evs){
  const pts=J('atlasEventPoints(DATA,ATLAS_LORE.events.find(x=>x.id==='+JSON.stringify(e.id)+'))');
  const box=J('atlasSelBox({kind:"e",id:'+JSON.stringify(e.id)+'})');
  assert(box&&box[2]>box[0],e.id+' has somewhere to fly to');
  if(!(e.nations||[]).length||(e.places||[]).length||e.at)assert(pts.length,e.id+' has a pin');
 }
 const of=run('atlasNationOf');
 assert.equal(of(data,'e-founding-of-shamur'),'valeshar','an event in one nation opens on its map');
 assert.equal(of(data,'e-battle-of-the-steppe'),'khor','a battlefield of its own, in Khor');
 assert.equal(of(data,'e-treaty-of-cantia'),null,'two nations: the whole map');
 assert.equal(of(data,'e-long-winter'),null);
 const marks=run('atlasEventMarksSVG(atlasEventPoints(DATA,atlasEvent("battle-of-the-steppe")),"Battle of the Khor Steppe")');
 assert.match(marks,/translate\(445 478\)/);assert.match(marks,/>Battle of the Khor Steppe</);assert.match(marks,/>Khor steppe</);
 const two=run('atlasEventMarksSVG(atlasEventPoints(DATA,atlasEvent("salt-war")),"The Salt War")');
 assert.equal((two.match(/class="atlas-ev"/g)||[]).length,2,'a pin at each place');
 assert.equal((two.match(/>The Salt War</g)||[]).length,1,'the title once');
});
test('events sort by year, filter by era and attach to their nations and places',()=>{
 run('ATLAS_LORE.events.length=0;ATLAS_LORE.eras.length=0;'); // without the samples
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
 assert.equal((svg.match(/class="atlas-pl[" ]/g)||[]).length,data.settlements.filter(s=>s.nation).length);
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
