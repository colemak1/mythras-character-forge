"use strict";
/* ================= WORLD GUIDE ATLAS (#/world/atlas) =================
   An interactive map of Sit'ota with a timeline under it, in the spirit of
   the Roshar atlas the owner pointed at (2026-11-20).

   - The base picture (assets/atlas/sitota-map.webp) and the vector layer
     (assets/atlas/atlas-data.json, built by scripts/build-atlas-data.py from
     the Azgaar export) share one canvas: data.width x data.height.
   - Lore and the timeline come from ATLAS_LORE (js/atlas-lore.js).
   - The map pans and zooms with a CSS transform on one "world" element, so
     the picture and the SVG move together. Strokes don't scale; markers and
     labels are counter-scaled with the --k custom property.
   - Selection lives in the route: #/world/atlas/n-<nation>, s-<settlement>
     or e-<event>. Selecting updates the hash without a re-render.
   - Three levels (owner, 2026-11-20): the whole map, a nation's own map,
     and a town's map. Choosing a nation flies in through the clouds to the
     nation's own map (data.details: one picture per nation and the
     rectangle it covers in map units) and locks there: it pans and zooms,
     but stops at its edges. Choosing a settlement with a street map flies
     on through the clouds into it: a read-only picture baked from the
     Watabou city Azgaar generates for it (data.towns, made by
     scripts/bake-town-maps.cjs), in the same pan and zoom. The breadcrumb
     goes back up the same way. Until the detailed maps are drawn the nation
     maps are the stand-in national plates (scripts/build-atlas-plates.py).
   - Full bleed (Atlas UX spec, docs/ux/atlas-20261121.md): at every level
     the picture covers the whole stage. The zoom stops where it covers it
     and panning stops at its edges, so no grey shows round it.

   Pure helpers (atlasSearch, atlasLod, atlasFit, atlasClamp, ...) take
   plain values so tests/atlas.cjs can check them without a browser. */

const ATLAS_DATA_URL='assets/atlas/atlas-data.json?v=b8b75988df';
// The open sea round the picture (scripts/build-atlas-sea.py): a parchment
// tile laid ATLAS_SEA map units past every edge, under the picture's faded,
// unframed edge (owner, 2026-11-22: no border, and room to see the whole
// continent zoomed out).
const ATLAS_SEA_URL='assets/atlas/sea-tile.webp?v=9e96186dd8';
const ATLAS_SEA=1600,ATLAS_SEA_TILE=200/1.5; // tile size in map units (the picture is 1.5 px per unit)
const ATLAS_MAP_URL='assets/atlas/sitota-map.webp?v=1bea6796c2';
const ATLAS_LAYERS=[
 {id:'borders',label:'Borders',on:true},
 {id:'places',label:'Settlements',on:true},
 {id:'rivers',label:'Rivers',on:false},
 {id:'roads',label:'Roads & trails',on:false},
 {id:'sea',label:'Sea routes',on:false}
];
// Zoom (screen pixels per map unit) at which each detail level starts:
// cities, then towns and their names, then villages. Absolute, so a phone
// and a desktop show the same density of names at the same size.
const ATLAS_LOD=[1.5,2.3,4]; // 1.5: a desktop landing (about 1.25, full bleed) shows the nations' names alone
const ATLAS_K_MAX=6; // the stand-in picture is 1.5 px per unit; past this it is mush
const ATLAS_GROUP_LABEL={capital:'Capital',city:'City',town:'Town',village:'Village',fort:'Fort'};

let ATLAS_DATA=null,ATLAS_LOADING=null,ATLAS_ERROR='';
let WORLD_PLACE=null; // selected id ("n-valeshar"), part of the route
const ATLAS={view:null,fit:1,layers:null,panel:null,timeline:null,era:'all',drag:null,pointers:new Map(),anim:0,ro:null,lastTap:0,nation:null,level:'world',town:null,travel:0,flying:false};

/* ---------- pure helpers ---------- */
function atlasLore(){return typeof ATLAS_LORE==='object'&&ATLAS_LORE?ATLAS_LORE:{nations:{},places:{},eras:[],events:[]};}
function atlasPlaceName(s){const l=(atlasLore().places||{})[s.id];return l&&l.name?l.name:s.name;}
function atlasNation(data,id){return (data.nations||[]).find(n=>n.id===id)||null;}
function atlasSettlement(data,id){return (data.settlements||[]).find(s=>s.id===id)||null;}
function atlasEvent(id){return (atlasLore().events||[]).find(e=>e.id===id)||null;}
// The present day comes from the lore only: the map file's calendar is
// Azgaar's placeholder (owner, 2026-11-20), so nothing shows until it is set.
function atlasCalendar(){
 const c=atlasLore().calendar;
 return c&&c.year!=null?c:null;
}
// The nation whose own map a selection opens: a nation, or a settlement's nation.
function atlasNationOf(data,sel){
 const p=atlasParseSel(sel);if(!p||!data)return null;
 if(p.kind==='n')return atlasNation(data,p.id)?p.id:null;
 if(p.kind==='s'){const s=atlasSettlement(data,p.id);return s&&s.nation||null;}
 // An event that happened inside one nation opens on that nation's map.
 const ev=atlasEvent(p.id),ns=ev?atlasEventNations(data,ev):[];
 return ns.length===1?ns[0]:null;
}
// Where an event happened: its settlements, and its own point (at: {x, y,
// name} in map units) for a place that isn't a settlement, like a battlefield.
function atlasEventPoints(data,ev){
 const pts=(ev.places||[]).map(id=>atlasSettlement(data,id)).filter(Boolean).map(s=>({x:s.x,y:s.y,name:atlasPlaceName(s)}));
 if(ev.at&&isFinite(ev.at.x)&&isFinite(ev.at.y))pts.unshift({x:ev.at.x,y:ev.at.y,name:ev.at.name||'',own:true});
 return pts;
}
// The nations an event belongs to: those it names, and its settlements'.
function atlasEventNations(data,ev){
 const ns=(ev.nations||[]).slice();
 (ev.places||[]).forEach(id=>{const s=atlasSettlement(data,id);if(s&&s.nation&&!ns.includes(s.nation))ns.push(s.nation);});
 return ns;
}
function atlasDetail(data,id){return id&&data&&data.details&&data.details[id]||null;}
// A settlement's baked street map ({src, w, h, px}), or null: only these
// open a town level (data.towns, scripts/bake-town-maps.cjs).
function atlasTown(data,id){return id&&data&&data.towns&&data.towns[id]||null;}
// Pixels per map unit of a nation map: past this zoom it only gets blurrier.
function atlasDetailScale(det){return det?det.px[0]/det.w:0;}
// Azgaar's town map link, with the lore name in place of the map file's
// (what scripts/bake-town-maps.cjs opens; the site no longer links to it).
function atlasTownLink(s,name){
 if(!s||!s.map)return null;
 return s.map.replace(/([?&](?:name)=)[^&]*/,(m,a)=>a+encodeURIComponent(name||s.name).replace(/%20/g,'+'));
}
function atlasYearText(ev,cal){
 if(ev.label)return ev.label;
 const era=(atlasLore().eras||[]).find(e=>e.id===ev.era);
 const short=era&&era.short||cal&&cal.eraShort||'';
 return ev.year==null?'':String(ev.year)+(short?' '+short:'');
}
// In era order (as listed in the lore), then by year; undated last in
// their era, and events with no era after all the eras.
function atlasSortedEvents(era){
 const eras=(atlasLore().eras||[]).map(e=>e.id),ei=e=>{const i=eras.indexOf(e.era);return i<0?eras.length:i;};
 return (atlasLore().events||[]).filter(e=>!era||era==='all'||e.era===era)
  .slice().sort((a,b)=>ei(a)-ei(b)||(a.year==null?Infinity:a.year)-(b.year==null?Infinity:b.year));
}
// Events that mention a nation or settlement (a settlement's nation counts too).
function atlasEventsFor(data,kind,id){
 return atlasSortedEvents('all').filter(e=>kind==='n'
  ?(e.nations||[]).includes(id)||(e.places||[]).some(p=>{const q=atlasSettlement(data,p);return q&&q.nation===id;})
  :(e.places||[]).includes(id));
}
function atlasParseSel(sel){
 const m=/^([nse])-([a-z0-9-]+)$/.exec(sel||'');
 return m?{kind:m[1],id:m[2]}:null;
}
function atlasSelValid(data,sel){
 const p=atlasParseSel(sel);if(!p)return false;
 if(p.kind==='e')return !!atlasEvent(p.id);
 if(!data)return true; // can't check before the data loads
 return p.kind==='n'?!!atlasNation(data,p.id):!!atlasSettlement(data,p.id);
}
// Search nations, settlements (by map and lore name) and events.
function atlasSearch(data,q,limit){
 q=String(q||'').trim().toLowerCase();if(!q||!data)return [];
 const norm=s=>String(s||'').toLowerCase().replace(/[’']/g,'');
 const nq=norm(q),hits=[];
 const score=name=>{const n=norm(name);return n.startsWith(nq)?0:n.includes(nq)?1:-1;};
 (data.nations||[]).forEach(n=>{const s=score(n.name);if(s>=0)hits.push({sel:'n-'+n.id,name:n.name,kind:'Nation',rank:s});});
 (data.settlements||[]).forEach(p=>{
  const shown=atlasPlaceName(p),s=Math.min(...[score(shown),score(p.name)].map(v=>v<0?9:v));
  if(s<9){const nat=atlasNation(data,p.nation);
   hits.push({sel:'s-'+p.id,name:shown,kind:(ATLAS_GROUP_LABEL[p.group]||'Settlement')+(nat?' · '+nat.name:'')+(atlasTown(data,p.id)?' · street map':''),rank:s+(p.capital?0:p.group==='city'?.2:.4)});}
 });
 (atlasLore().events||[]).forEach(e=>{const s=score(e.title);if(s>=0)hits.push({sel:'e-'+e.id,name:e.title,kind:'Event',rank:s+.1});});
 return hits.sort((a,b)=>a.rank-b.rank||a.name.localeCompare(b.name)).slice(0,limit||12);
}
// Detail level for a zoom (px per map unit): 0 = capitals only.
function atlasLod(k){let l=0;ATLAS_LOD.forEach(t=>{if(k>=t)l++;});return l;}
// Box around every nation: the land worth showing at first.
function atlasLandBox(data){
 const b=(data.nations||[]).map(n=>n.box);
 if(!b.length)return [0,0,data.width,data.height];
 return [Math.min(...b.map(x=>x[0])),Math.min(...b.map(x=>x[1])),Math.max(...b.map(x=>x[2])),Math.max(...b.map(x=>x[3]))];
}
// The first view: the land fitted in the free part of the screen. On a
// tall, narrow screen fitting the width leaves the land tiny, so it fills
// most of the height instead (pan sideways to see the rest).
function atlasHomeView(data,f){
 const land=atlasLandBox(data),fit=atlasFit(land,f.w,f.h,12);
 let k=fit.k;
 if(f.h>f.w*1.15)k=Math.min(fit.k*2.6,(f.h*.62)/(land[3]-land[1]));
 const cx=(land[0]+land[2])/2,cy=(land[1]+land[3])/2;
 return {k,x:f.x+f.w/2-cx*k,y:f.y+f.h/2-cy*k};
}
// Scale and offset that fit box [x0,y0,x1,y1] (map units) in a w x h viewport.
function atlasFit(box,w,h,pad){
 pad=pad==null?24:pad;
 const bw=Math.max(1,box[2]-box[0]),bh=Math.max(1,box[3]-box[1]);
 const k=Math.max(.01,Math.min((w-2*pad)/bw,(h-2*pad)/bh));
 return {k,x:w/2-(box[0]+bw/2)*k,y:h/2-(box[1]+bh/2)*k};
}
// Keep the map (or rect [x0,y0,x1,y1]: a nation's or a town's own map)
// over the whole viewport, and the zoom in range: its edges stop at the
// viewport's, so no grey shows (Atlas UX spec). Narrower than the viewport
// (only below the covering zoom), it is centred.
function atlasClamp(v,w,h,mapW,mapH,kMin,kMax,rect){
 const k=Math.min(kMax,Math.max(kMin,v.k)),r=rect||[0,0,mapW,mapH];
 const fit=(lo,hi,val)=>lo>hi?(lo+hi)/2:Math.min(hi,Math.max(lo,val));
 return {k,x:fit(w-r[2]*k,-r[0]*k,v.x)+0,y:fit(h-r[3]*k,-r[1]*k,v.y)+0}; // +0: never -0
}
// What the whole map's zoom and panning keep in view: the land, with a
// margin of sea (and the title cartouche under it). Zoomed all the way out
// it all fits, with sea round it; zoomed in, panning stops at its edges.
function atlasWorldRect(data){
 const b=atlasLandBox(data);
 return [b[0]-40,b[1]-40,b[2]+40,b[3]+95];
}
// The smallest zoom at which rect fits in a w x h viewport.
function atlasFitK(w,h,rect){return Math.min(w/(rect[2]-rect[0]),h/(rect[3]-rect[1]));}
// The smallest zoom at which rect covers a w x h viewport.
function atlasCoverK(w,h,rect){return Math.max(w/(rect[2]-rect[0]),h/(rect[3]-rect[1]));}
function atlasZoomAt(v,factor,px,py){
 const k=v.k*factor;return {k,x:px-(px-v.x)*factor,y:py-(py-v.y)*factor};
}
// The level a selection opens: the whole map ('world'), a nation's own map
// ('nation'), or a settlement's town map ('town'). A settlement with no
// baked street map (a fort, or one not baked yet) is shown on its nation's map.
function atlasLevelOf(data,sel){
 const nation=atlasNationOf(data,sel);
 if(!nation||!atlasDetail(data,nation))return {level:'world',nation:null,town:null};
 const p=atlasParseSel(sel);
 if(p.kind==='s'&&atlasTown(data,p.id))return {level:'town',nation,town:p.id};
 return {level:'nation',nation,town:null};
}
// Scroll-wheel trips between levels (owner, 2026-11-20). On the whole map,
// zooming in past ATLAS_DIVE_K over a nation dives into it. Inside a nation,
// scrolling on past its widest view flies back out, and past its closest
// view over a town goes into the town. Inside a town, scrolling on past its
// widest view goes back to the nation. push carries the scroll already spent
// against a limit (log of the zoom asked for), so a stray notch doesn't go.
const ATLAS_DIVE_K=ATLAS_LOD[1],ATLAS_WHEEL_PUSH=.3;
function atlasWheelIntent(s){
 const dir=s.factor>1?1:s.factor<1?-1:0;let push=s.push||0;
 if(!dir||Math.sign(push)===-dir)push=0;
 if(s.level==='world')return {push:0,go:dir>0&&s.k*s.factor>=ATLAS_DIVE_K?'in':null};
 if(s.level==='town'&&dir>0)return {push:0,go:null};
 const atLimit=dir<0?s.k<=s.kMin*1.001:s.k>=s.kMax*.999;
 if(!atLimit)return {push:0,go:null};
 push+=Math.log(s.factor);
 return Math.abs(push)>=ATLAS_WHEEL_PUSH?{push:0,go:dir>0?'in':'out'}:{push,go:null};
}
function atlasDepth(level){return level==='town'?2:level==='nation'?1:0;}
// The breadcrumb for a level: Sit'ota, then the nation, then the town. Every
// step but the last goes back to it; the last is where you are.
function atlasCrumbs(data,at){
 const c=[{label:'Sit’ota',sel:null}],n=at.nation&&atlasNation(data,at.nation),s=at.town&&atlasSettlement(data,at.town);
 if(n&&at.level!=='world')c.push({label:n.name,sel:'n-'+n.id});
 if(s&&at.level==='town')c.push({label:atlasPlaceName(s),sel:'s-'+s.id});
 return c;
}
function atlasCrumbsHTML(data,at){
 const c=atlasCrumbs(data,at);
 return '<ol>'+c.map((x,i)=>'<li>'+(i?'<span class="atlas-crumb-sep" aria-hidden="true">›</span>':'')
  +(i===c.length-1?'<span class="atlas-crumb" aria-current="location">'+esc(x.label)+'</span>'
   :'<button type="button" class="atlas-crumb" onclick="atlasSelect('+(x.sel?'\''+x.sel+'\',{fly:true}':'null')+')">'+esc(x.label)+'</button>')
  +'</li>').join('')+'</ol>';
}

/* ---------- markup ---------- */
function atlasLayersState(){
 if(!ATLAS.layers){ATLAS.layers={};ATLAS_LAYERS.forEach(l=>ATLAS.layers[l.id]=l.on);}
 return ATLAS.layers;
}
function atlasHTML(){
 const layers=atlasLayersState();
 // Arriving from another page starts from the whole map (or the selection).
 if(typeof document!=='undefined'&&document.getElementById&&!document.getElementById('atlasRoot'))ATLAS.view=null;
 // The timeline starts folded, so the landing shows the whole continent
 // edge to edge (Atlas UX spec); it opens from its bar.
 if(ATLAS.timeline===null)ATLAS.timeline=false;
 const icon=d=>'<svg class="i" viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
 return '<section class="atlas" id="atlasRoot" aria-labelledby="atlasTitle" data-timeline="'+(ATLAS.timeline?'open':'closed')+'"'
  +Object.keys(layers).map(k=>' data-layer-'+k+'="'+(layers[k]?'on':'off')+'"').join('')+'>'
  +'<h1 class="atlas-sr" id="atlasTitle" tabindex="-1">Atlas of Sit’ota</h1>'
  +'<div class="atlas-stage">'
  +'<div class="atlas-map" id="atlasMap" aria-label="Map of Sit’ota. Drag to pan, scroll or pinch to zoom, or use the arrow keys and plus and minus." tabindex="0" role="application">'
  +'<div class="atlas-world" id="atlasWorld"><div class="atlas-sea" id="atlasSea"></div><img class="atlas-base" src="'+ATLAS_MAP_URL+'" alt="" draggable="false" decoding="async"><div class="atlas-details" id="atlasDetails"></div><svg class="atlas-svg" id="atlasSvg" aria-hidden="true"></svg><img class="atlas-town" id="atlasTownImg" alt="" draggable="false" decoding="async" hidden></div>'
  +'<p class="atlas-status" id="atlasStatus" role="status">Loading the atlas…</p>'
  +'</div>'
  +'<div class="atlas-clouds" id="atlasClouds" aria-hidden="true" hidden></div>'
  +'<div class="atlas-top">'
  +'<nav class="atlas-crumbs" id="atlasCrumbs" aria-label="Where you are in the atlas">'+atlasCrumbsHTML(ATLAS_DATA||{},{level:'world'})+'</nav>'
  +'<div class="atlas-search"><label class="atlas-sr" for="atlasSearch">Search the atlas</label>'
  +'<span class="atlas-search-ic" aria-hidden="true">'+icon('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>')+'</span>'
  +'<input id="atlasSearch" type="search" autocomplete="off" placeholder="Search places and events" aria-controls="atlasResults" aria-autocomplete="list" oninput="atlasOnSearch(this.value)" onkeydown="atlasSearchKey(event)">'
  +'<div class="atlas-results" id="atlasResults" role="listbox" aria-label="Search results" hidden></div></div>'
  +'<div class="atlas-tools">'
  +'<button type="button" class="atlas-tool atlas-tool-icon" onclick="atlasOpenList()" aria-label="Nations list" title="Nations">'+icon('<path d="M4 6h16M4 12h16M4 18h10"/>')+'<span>Nations</span></button>'
  +'<button type="button" class="atlas-tool atlas-tool-icon" id="atlasLayersBtn" aria-label="Map layers" aria-expanded="false" aria-controls="atlasLayers" onclick="atlasToggleLayers()" title="Map layers">'+icon('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>')+'<span>Layers</span></button>'
  +'<a class="atlas-tool atlas-tool-icon" href="#/world/welcome" aria-label="Guide chapters" title="Guide chapters">'+icon('<path d="M12 6C9 4 6 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/>')+'<span>Guide</span></a>'
  +'</div>'
  +'<div class="atlas-layers" id="atlasLayers" hidden><p>Show on the map</p>'
  +ATLAS_LAYERS.map(l=>'<label><input type="checkbox" '+(layers[l.id]?'checked ':'')+'onchange="atlasSetLayer(\''+l.id+'\',this.checked)"> '+esc(l.label)+'</label>').join('')
  +'</div></div>'
  +'<div class="atlas-zoom" role="group" aria-label="Zoom">'
  +'<button type="button" onclick="atlasZoomBy(1.6)" aria-label="Zoom in">'+icon('<path d="M12 5v14M5 12h14"/>')+'</button>'
  +'<button type="button" onclick="atlasZoomBy(1/1.6)" aria-label="Zoom out">'+icon('<path d="M5 12h14"/>')+'</button>'
  +'<button type="button" onclick="atlasHome()" aria-label="Show the whole map">'+icon('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')+'</button>'
  +'</div>'
  +'<aside class="atlas-panel" id="atlasPanel" aria-label="Atlas entry" hidden></aside>'
  +'</div>'
  +atlasTimelineHTML()
  +'</section>';
}
function atlasTimelineHTML(){
 const cal=atlasCalendar(),eras=atlasLore().eras||[],evs=atlasSortedEvents(ATLAS.era);
 const sel=atlasParseSel(WORLD_PLACE),selEv=sel&&sel.kind==='e'?sel.id:null;
 let body='';
 if(!evs.length)body='<p class="atlas-tl-empty">'+((atlasLore().events||[]).length?'No events in this era yet.':'The chronicle of Sit’ota is still being written. Events appear here as the campaign uncovers them.')+'</p>';
 else{
  let lastEra=null;
  body='<ol class="atlas-tl-track" id="atlasTrack">'+evs.map(e=>{
   let head='';
   if(e.era!==lastEra){const era=eras.find(x=>x.id===e.era);if(era)head='<li class="atlas-tl-era" aria-hidden="true">'+esc(era.name)+'</li>';lastEra=e.era;}
   return head+'<li><button type="button" class="atlas-tl-ev" data-ev="'+esc(e.id)+'"'+(e.id===selEv?' aria-current="true"':'')+' onclick="atlasSelect(\'e-'+esc(e.id)+'\',{fly:true})">'
    +'<span class="atlas-tl-yr">'+esc(atlasYearText(e,cal))+'</span><b>'+esc(e.title)+'</b></button></li>';
  }).join('')+'</ol>';
 }
 return '<section class="atlas-tl" id="atlasTimeline" aria-label="Timeline">'
  +'<div class="atlas-tl-bar">'
  +'<button type="button" class="atlas-tl-toggle" aria-expanded="'+(ATLAS.timeline?'true':'false')+'" aria-controls="atlasTlBody" onclick="atlasToggleTimeline()"><span>Timeline</span><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg></button>'
  +((atlasLore().events||[]).some(e=>e.sample)?'<span class="atlas-tl-sample" title="Made up to show how the timeline looks; not canon.">Sample events</span>':'')
  +(cal?'<span class="atlas-tl-now" title="The present day">Now · '+esc(String(cal.year)+' '+(cal.eraShort||cal.era||''))+'</span>':'')
  +(eras.length?'<div class="atlas-tl-eras" role="group" aria-label="Era">'+[{id:'all',name:'All eras'}].concat(eras).map(e=>'<button type="button" aria-pressed="'+(ATLAS.era===e.id)+'" onclick="atlasSetEra(\''+esc(e.id)+'\')">'+esc(e.name)+'</button>').join('')+'</div>':'')
  +(evs.length?'<div class="atlas-tl-step"><button type="button" onclick="atlasStep(-1)" aria-label="Earlier event">‹</button><button type="button" onclick="atlasStep(1)" aria-label="Later event">›</button></div>':'')
  +'</div><div class="atlas-tl-body" id="atlasTlBody">'+body+'</div></section>';
}
function atlasSvgHTML(data){
 const lod=s=>s.capital?0:s.group==='city'?1:s.group==='town'?2:3;
 const route=kinds=>(data.routes||[]).filter(r=>kinds.includes(r.kind)).map(r=>'<path class="atlas-route atlas-route-'+(r.kind==='roads'?'road':r.kind==='searoutes'?'sea':'trail')+'" d="'+r.d+'"/>').join('');
 const rivers=(data.rivers||[]).map(r=>'<path class="atlas-river" style="--w:'+Math.min(3,.6+Math.sqrt(r.w||0)/14).toFixed(2)+'px" d="'+r.d+'"/>').join('');
 const nations=(data.nations||[]).map(n=>'<path class="atlas-nation" data-sel="n-'+n.id+'" d="'+n.d+'"><title>'+esc(n.name)+'</title></path>').join('');
 const places=(data.settlements||[]).filter(s=>s.nation).sort((a,b)=>lod(b)-lod(a)).map(s=>'<g class="atlas-pl'+(atlasTown(data,s.id)?' has-town':'')+(atlasPlaceName(s)!==s.name?' is-renamed':'')+'" data-lod="'+lod(s)+'" data-n="'+s.nation+'" data-sel="s-'+s.id+'" transform="translate('+s.x+' '+s.y+')"><g class="atlas-pl-s">'
  +(atlasTown(data,s.id)?'<circle class="atlas-pl-town" r="9.5"/>':'')+(s.capital?'<circle class="atlas-pl-ring" r="6"/>':'')+'<circle class="atlas-pl-dot" r="'+(s.capital?3.4:s.group==='city'?3:2.4)+'"/><circle class="atlas-pl-hit" r="10"/>'
  +'<text x="7" y="4">'+esc(atlasPlaceName(s))+'</text></g><title>'+esc(atlasPlaceName(s))+'</title></g>').join('');
 return '<g class="atlas-g-sea">'+route(['searoutes'])+'</g>'
  +'<g class="atlas-g-rivers">'+rivers+'</g>'
  +'<g class="atlas-g-roads">'+route(['trails','roads'])+'</g>'
  +'<g class="atlas-g-nations">'+nations+'</g>'
  +'<g class="atlas-g-places">'+places+'</g>'
  +'<g class="atlas-g-events" id="atlasEvMarks"></g>';
}

/* ---------- mounting ---------- */
function atlasLoad(){
 if(ATLAS_DATA)return Promise.resolve(ATLAS_DATA);
 if(!ATLAS_LOADING)ATLAS_LOADING=fetch(ATLAS_DATA_URL).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
  .then(d=>{ATLAS_DATA=d;ATLAS_ERROR='';return d;})
  .catch(e=>{ATLAS_ERROR='The atlas could not be loaded. Check your connection and try again.';ATLAS_LOADING=null;throw e;});
 return ATLAS_LOADING;
}
function atlasEl(id){return document.getElementById(id);}
function atlasMount(){
 const root=atlasEl('atlasRoot');if(!root)return;
 atlasLoad().then(data=>{
  if(!root.isConnected)return;
  const svg=atlasEl('atlasSvg');
  svg.setAttribute('viewBox','0 0 '+data.width+' '+data.height);
  svg.innerHTML=atlasSvgHTML(data);
  const world=atlasEl('atlasWorld');world.style.width=data.width+'px';world.style.height=data.height+'px';
  const sea=atlasEl('atlasSea');
  if(sea)Object.assign(sea.style,{left:-ATLAS_SEA+'px',top:-ATLAS_SEA+'px',width:data.width+2*ATLAS_SEA+'px',height:data.height+2*ATLAS_SEA+'px',
   backgroundImage:'url("'+ATLAS_SEA_URL+'")',backgroundSize:ATLAS_SEA_TILE+'px '+ATLAS_SEA_TILE+'px'});
  atlasEl('atlasStatus').hidden=true;
  atlasBind();
  // A re-render while the atlas is open (sign-in, theme) keeps the view.
  const prev=ATLAS.view;ATLAS.view=null;
  // The new DOM is at the whole map: no nation or town open yet.
  ATLAS.nation=null;ATLAS.level='world';ATLAS.town=null;ATLAS.travel++;ATLAS.flying=false;
  const tl=atlasEl('atlasTimeline');if(tl)tl.outerHTML=atlasTimelineHTML();
  const sel=WORLD_PLACE&&atlasSelValid(data,WORLD_PLACE)?WORLD_PLACE:null;
  if(!sel)WORLD_PLACE=null;
  // The drawer stays closed until a place is chosen (Atlas UX spec).
  atlasShowPanel(sel?'detail':null);
  atlasReset(true);
  if(sel)atlasSelect(sel,{fly:true,instant:true,keepRoute:true,view:prev});
  else if(prev)atlasApply(prev);
 }).catch(()=>{
  const st=atlasEl('atlasStatus');
  if(st){st.innerHTML=esc(ATLAS_ERROR)+' <button type="button" class="st-btn st-btn-sm" onclick="atlasMount()">Retry</button>';st.setAttribute('role','alert');}
 });
}
function atlasDesktop(){return !(typeof matchMedia==='function'&&matchMedia('(max-width:899px)').matches);}
function atlasReduced(){return typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;}
function atlasSize(){const m=atlasEl('atlasMap');return m?{w:m.clientWidth,h:m.clientHeight}:{w:1,h:1};}
// The part of the screen a nation's map is centred in: beside the panel on
// a desktop; the whole map on a phone, where the panel is a sheet.
function atlasLockBox(){
 if(atlasDesktop())return atlasFreeBox();
 const {w,h}=atlasSize();return {x:0,y:0,w,h};
}
// Each level's zoom range: from the zoom that covers the stage (no grey
// round the map) to past its picture's sharpness.
function atlasLimits(){
 const {w,h}=atlasSize(),d=ATLAS_DATA;
 const town=ATLAS.level==='town'?atlasTown(d,ATLAS.town):null,det=ATLAS.level==='nation'?atlasDetail(d,ATLAS.nation):null;
 if(town){
  const rect=[0,0,town.w,town.h],kMin=atlasCoverK(w,h,rect);
  return {kMin,kMax:Math.max(kMin*4,town.px[0]/town.w*1.5),rect};
 }
 if(det){
  const rect=[det.x,det.y,det.x+det.w,det.y+det.h],kMin=atlasCoverK(w,h,rect);
  return {kMin,kMax:Math.max(ATLAS_K_MAX,atlasDetailScale(det)*1.25,kMin*2),rect};
 }
 // The whole map: out until all the land fits, the sea filling round it.
 const rect=atlasWorldRect(d),kMin=atlasFitK(w,h,rect);ATLAS.fit=kMin;
 return {kMin,kMax:Math.max(kMin*2,ATLAS_K_MAX),rect};
}
// The view kept inside the current level's limits.
function atlasClampView(v){
 const d=ATLAS_DATA,{w,h}=atlasSize(),lim=atlasLimits();
 return atlasClamp(v,w,h,d.width,d.height,lim.kMin,lim.kMax,lim.rect);
}
// While flying (or travelling through the clouds) the view is drawn as it
// comes; it was clamped where it is going.
function atlasApply(v){
 if(!(ATLAS.flying&&ATLAS.flyFree))v=atlasClampView(v);
 ATLAS.view=v;
 const world=atlasEl('atlasWorld'),root=atlasEl('atlasRoot');if(!world)return;
 world.style.transform='translate('+v.x.toFixed(1)+'px,'+v.y.toFixed(1)+'px) scale('+v.k.toFixed(4)+')';
 world.style.setProperty('--k',v.k.toFixed(4));
 root.dataset.lod=atlasLod(v.k);
}
const ATLAS_EASE={
 inOut:t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,
 in:t=>t*t*t,               // speeding up into the clouds
 out:t=>1-Math.pow(1-t,3)   // slowing down out of them
};
// Fly the view to target. opts.free: don't clamp the target (the first half
// of a trip through the clouds goes past the level's limits).
function atlasAnimateTo(target,instant,opts){
 opts=opts||{};
 cancelAnimationFrame(ATLAS.anim);
 if(!opts.free)target=atlasClampView(target);
 const from=ATLAS.view;
 if(!from||instant||atlasReduced()){ATLAS.flying=false;atlasApply(target);return Promise.resolve();}
 const t0=performance.now(),dur=opts.dur||520,ease=ATLAS_EASE[opts.ease||'inOut'];ATLAS.flying=true;ATLAS.flyFree=!!opts.free;
 return new Promise(done=>{
  const step=now=>{
   const t=Math.min(1,(now-t0)/dur),e=ease(t);
   // Zoom geometrically so the move reads as one smooth flight.
   const k=from.k*Math.pow(target.k/from.k,e);
   atlasApply({k,x:from.x+(target.x-from.x)*e,y:from.y+(target.y-from.y)*e});
   if(t<1)ATLAS.anim=requestAnimationFrame(step);
   else{ATLAS.flying=false;if(!opts.free)atlasApply(ATLAS.view);done();}
  };
  ATLAS.anim=requestAnimationFrame(step);
 });
}
function atlasReset(instant){
 if(!ATLAS_DATA)return;
 atlasAnimateTo(atlasHomeView(ATLAS_DATA,atlasFreeBox()),instant===true);
}
// The "whole map" button: out of a nation's or town's map first.
function atlasHome(){if(ATLAS.level!=='world')atlasSelect(null);else atlasReset();}
// "‹": one level up, a town to its nation, a nation to the whole map.
function atlasUp(){
 if(ATLAS.level==='town'&&ATLAS.nation)atlasSelect('n-'+ATLAS.nation,{fly:true});
 else atlasSelect(null);
}
// A zoom about a point, stopped at the level's zoom limits: the point under
// the pointer stays put even at the limit (the map used to slide away).
function atlasZoomIn(v,f,px,py){
 const lim=atlasLimits(),k=Math.min(lim.kMax,Math.max(lim.kMin,v.k*f));
 return atlasZoomAt(v,k/v.k,px,py);
}
// The wheel at a level's edge: true when it set off a trip.
function atlasWheelLevel(f,px,py,cx,cy){
 if(!ATLAS.view||!ATLAS_DATA)return false;
 const now=Date.now();if(now-(ATLAS.wheelAt||0)>500)ATLAS.push=0;ATLAS.wheelAt=now;
 const lim=atlasLimits(),v=ATLAS.view;
 const it=atlasWheelIntent({level:ATLAS.level,k:v.k,kMin:lim.kMin,kMax:lim.kMax,factor:f,push:ATLAS.push});
 ATLAS.push=it.push;
 if(!it.go)return false;
 if(ATLAS.level==='world'){
  // The nation under the pointer (a settlement's dot counts as its nation).
  const hits=document.elementsFromPoint?document.elementsFromPoint(cx,cy):[];
  let id=null;
  for(const el of hits){
   const n=el.closest&&el.closest('path.atlas-nation,.atlas-pl');
   if(n){id=n.classList.contains('atlas-pl')?n.getAttribute('data-n'):n.getAttribute('data-sel').slice(2);break;}
  }
  if(!id||!atlasDetail(ATLAS_DATA,id))return false; // over the sea: keep zooming
  atlasSelect('n-'+id,{fly:true});return true;
 }
 if(it.go==='out'){atlasUp();return true;}
 // In: the town nearest the pointer, if one is close.
 let best=null,bd=48;
 (ATLAS_DATA.settlements||[]).forEach(s=>{
  if(s.nation!==ATLAS.nation||!atlasTown(ATLAS_DATA,s.id))return;
  const d=Math.hypot(v.x+s.x*v.k-px,v.y+s.y*v.k-py);if(d<bd){bd=d;best=s;}
 });
 if(!best)return false;
 atlasSelect('s-'+best.id,{fly:true});return true;
}
function atlasZoomBy(f,px,py){
 if(!ATLAS.view)return;
 const {w,h}=atlasSize();
 atlasAnimateTo(atlasZoomIn(ATLAS.view,f,px==null?w/2:px,py==null?h/2:py));
}
// The panel covers part of the map: fly to the part it leaves free.
// On a phone the search bar and buttons cover the top too.
function atlasFreeBox(){
 const {w,h}=atlasSize(),panel=atlasEl('atlasPanel');
 if(atlasDesktop())return {x:0,y:0,w:panel&&!panel.hidden?Math.max(200,w-panel.offsetWidth-16):w,h};
 const top=atlasEl('atlasRoot')&&atlasEl('atlasRoot').querySelector('.atlas-top'),y=top?Math.min(h*.4,top.offsetTop+top.offsetHeight):0;
 const bottom=panel&&!panel.hidden?panel.offsetHeight:0;
 return {x:0,y,w,h:Math.max(140,h-y-bottom)};
}
// The view that shows box: nations fit their free space (up to zoom 3, or
// their own map's sharpness); settlements go to at least kMin.
// kCap: no closer than this (an event keeps some of its surroundings).
const ATLAS_EVENT_K=3.6;
function atlasBoxView(box,kMin,kCap){
 const f=atlasFreeBox(),fit=atlasFit(box,f.w,f.h,Math.min(60,f.w*.1));
 const sharp=atlasDetailScale(atlasDetail(ATLAS_DATA,ATLAS.level==='nation'?ATLAS.nation:null))||3,kTop=Math.max(ATLAS_K_MAX,sharp);
 let k=kMin?Math.max(kMin,Math.min(fit.k,kTop),ATLAS.view?Math.min(ATLAS.view.k,kTop):0):Math.min(fit.k,sharp);
 if(kCap)k=Math.min(k,kCap);
 const cx=(box[0]+box[2])/2,cy=(box[1]+box[3])/2;
 return {k,x:f.x+f.w/2-cx*k,y:f.y+f.h/2-cy*k};
}
function atlasFlyToBox(box,instant,kMin,kCap){return atlasAnimateTo(atlasBoxView(box,kMin,kCap),instant);}

/* ---------- interaction ---------- */
function atlasBind(){
 const map=atlasEl('atlasMap');if(!map||map.dataset.bound)return;
 map.dataset.bound='1';
 map.addEventListener('wheel',e=>{
  e.preventDefault();if(ATLAS.travelling)return;
  cancelAnimationFrame(ATLAS.anim);ATLAS.flying=false;
  const r=map.getBoundingClientRect(),dy=e.deltaMode===1?e.deltaY*16:e.deltaY;
  const f=Math.exp(-dy*.0016),px=e.clientX-r.left,py=e.clientY-r.top;
  if(atlasWheelLevel(f,px,py,e.clientX,e.clientY))return;
  atlasApply(atlasZoomIn(ATLAS.view,f,px,py));
 },{passive:false});
 map.addEventListener('pointerdown',e=>{
  if(e.button>0||ATLAS.travelling)return;
  cancelAnimationFrame(ATLAS.anim);ATLAS.flying=false;
  ATLAS.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  ATLAS.drag={x:e.clientX,y:e.clientY,view:Object.assign({},ATLAS.view),moved:false,pinch:null};
  if(ATLAS.pointers.size===2){
   const [a,b]=[...ATLAS.pointers.values()];
   ATLAS.drag.pinch={dist:Math.hypot(a.x-b.x,a.y-b.y),mx:(a.x+b.x)/2,my:(a.y+b.y)/2};ATLAS.drag.moved=true;
  }
 });
 map.addEventListener('pointermove',e=>{
  const d=ATLAS.drag;if(!d||!ATLAS.pointers.has(e.pointerId))return;
  ATLAS.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const r=map.getBoundingClientRect();
  if(d.pinch&&ATLAS.pointers.size>=2){
   const [a,b]=[...ATLAS.pointers.values()];
   const dist=Math.hypot(a.x-b.x,a.y-b.y),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
   const v=atlasZoomIn(d.view,dist/d.pinch.dist,d.pinch.mx-r.left,d.pinch.my-r.top);
   atlasApply({k:v.k,x:v.x+mx-d.pinch.mx,y:v.y+my-d.pinch.my});return;
  }
  const dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(!d.moved&&Math.hypot(dx,dy)<6)return;
  if(!d.moved){d.moved=true;try{map.setPointerCapture(e.pointerId);}catch(_){}map.classList.add('is-dragging');}
  atlasApply({k:d.view.k,x:d.view.x+dx,y:d.view.y+dy});
 });
 const end=e=>{
  const d=ATLAS.drag;ATLAS.pointers.delete(e.pointerId);
  if(!d)return;
  if(ATLAS.pointers.size){ // one finger left after a pinch: keep panning from here
   const [p]=[...ATLAS.pointers.values()];ATLAS.drag={x:p.x,y:p.y,view:Object.assign({},ATLAS.view),moved:true,pinch:null};return;
  }
  ATLAS.drag=null;map.classList.remove('is-dragging');
  if(d.moved||e.type==='pointercancel')return;
  const hit=document.elementFromPoint(e.clientX,e.clientY);
  const t=hit&&hit.closest&&hit.closest('[data-sel]');
  const now=Date.now();
  if(!t&&now-ATLAS.lastTap<320){const r=map.getBoundingClientRect();atlasZoomBy(1.8,e.clientX-r.left,e.clientY-r.top);ATLAS.lastTap=0;return;}
  ATLAS.lastTap=now;
  if(ATLAS.level==='town'){if(atlasEl('atlasPanel').hidden)atlasShowPanel('detail');return;} // a picture: nothing to choose
  if(t)atlasSelect(t.getAttribute('data-sel'),{fly:!t.classList.contains('atlas-pl')});
  else if(ATLAS.level==='nation'){
   // Locked in a nation's map, an empty click comes back to the nation
   // (and its drawer, if closed); leaving is the breadcrumb.
   if(WORLD_PLACE!=='n-'+ATLAS.nation)atlasSelect('n-'+ATLAS.nation);
   else if(atlasEl('atlasPanel').hidden)atlasShowPanel('detail');
  }
  else if(WORLD_PLACE)atlasSelect(null);
 };
 map.addEventListener('pointerup',end);map.addEventListener('pointercancel',end);
 map.addEventListener('keydown',e=>{
  const {w,h}=atlasSize(),v=ATLAS.view,step=80;if(!v||ATLAS.travelling)return;
  const moves={ArrowLeft:[step,0],ArrowRight:[-step,0],ArrowUp:[0,step],ArrowDown:[0,-step]};
  if(moves[e.key]){e.preventDefault();atlasAnimateTo({k:v.k,x:v.x+moves[e.key][0],y:v.y+moves[e.key][1]});}
  else if(e.key==='+'||e.key==='='){e.preventDefault();atlasZoomBy(1.6);}
  else if(e.key==='-'||e.key==='_'){e.preventDefault();atlasZoomBy(1/1.6);}
  else if(e.key==='0'){e.preventDefault();atlasReset();}
  void w;void h;
 });
 const root=atlasEl('atlasRoot');
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented){
  const res=atlasEl('atlasResults');if(res&&!res.hidden){res.hidden=true;return;}
  const lay=atlasEl('atlasLayers');if(lay&&!lay.hidden){atlasToggleLayers(false);return;}
  if(ATLAS.level!=='world')atlasUp();else if(WORLD_PLACE)atlasSelect(null);else if(!atlasEl('atlasPanel').hidden&&!atlasDesktop())atlasShowPanel(null);
 }});
 if(typeof ResizeObserver==='function'){
  ATLAS.ro&&ATLAS.ro.disconnect();
  ATLAS.ro=new ResizeObserver(()=>{if(!map.isConnected){ATLAS.ro.disconnect();return;}if(ATLAS.view)atlasApply(ATLAS.view);});
  ATLAS.ro.observe(map);
 }
}
function atlasSetLayer(id,on){
 atlasLayersState()[id]=!!on;
 const root=atlasEl('atlasRoot');if(root)root.setAttribute('data-layer-'+id,on?'on':'off');
}
function atlasToggleLayers(force){
 const p=atlasEl('atlasLayers'),b=atlasEl('atlasLayersBtn');if(!p)return;
 const open=force==null?p.hidden:force;p.hidden=!open;b.setAttribute('aria-expanded',String(open));
}
function atlasToggleTimeline(){
 ATLAS.timeline=!ATLAS.timeline;
 const root=atlasEl('atlasRoot');if(!root)return;
 root.dataset.timeline=ATLAS.timeline?'open':'closed';
 const b=root.querySelector('.atlas-tl-toggle');if(b)b.setAttribute('aria-expanded',String(ATLAS.timeline));
}
function atlasSetEra(id){
 ATLAS.era=id;const tl=atlasEl('atlasTimeline');if(tl)tl.outerHTML=atlasTimelineHTML();
}
function atlasStep(dir){
 const evs=atlasSortedEvents(ATLAS.era);if(!evs.length)return;
 const sel=atlasParseSel(WORLD_PLACE),i=sel&&sel.kind==='e'?evs.findIndex(e=>e.id===sel.id):-1;
 const next=i<0?(dir>0?0:evs.length-1):Math.min(evs.length-1,Math.max(0,i+dir));
 atlasSelect('e-'+evs[next].id,{fly:true});
}

/* ---------- search ---------- */
let ATLAS_RESULTS=[];
function atlasOnSearch(q){
 const box=atlasEl('atlasResults');if(!box)return;
 ATLAS_RESULTS=atlasSearch(ATLAS_DATA,q,10);
 if(!String(q).trim()){box.hidden=true;box.innerHTML='';return;}
 box.hidden=false;
 box.innerHTML=ATLAS_RESULTS.length?ATLAS_RESULTS.map((r,i)=>'<button type="button" role="option" id="atlasRes'+i+'" onclick="atlasPickResult('+i+')"><b>'+esc(r.name)+'</b><small>'+esc(r.kind)+'</small></button>').join('')
  :'<p>No places or events found.</p>';
}
function atlasPickResult(i){
 const r=ATLAS_RESULTS[i];if(!r)return;
 const box=atlasEl('atlasResults'),input=atlasEl('atlasSearch');
 if(box){box.hidden=true;}if(input)input.value='';
 atlasSelect(r.sel,{fly:true});
}
function atlasSearchKey(e){
 const box=atlasEl('atlasResults');
 if(e.key==='Enter'){e.preventDefault();atlasPickResult(0);}
 else if(e.key==='ArrowDown'&&box&&!box.hidden){const f=box.querySelector('button');if(f){e.preventDefault();f.focus();}}
 else if(e.key==='Escape'&&box&&!box.hidden){e.preventDefault();box.hidden=true;}
}

/* ---------- selection and the panel ---------- */
function atlasMark(sel){
 const svg=atlasEl('atlasSvg');if(!svg)return;
 atlasEventMarks(null);
 svg.querySelectorAll('.is-sel,.is-lit').forEach(el=>el.classList.remove('is-sel','is-lit'));
 const p=atlasParseSel(sel);if(!p)return;
 if(p.kind==='e'){
  const ev=atlasEvent(p.id)||{};
  (ev.nations||[]).forEach(id=>{const el=svg.querySelector('[data-sel="n-'+id+'"]');if(el)el.classList.add('is-lit');});
  (ev.places||[]).forEach(id=>{const el=svg.querySelector('[data-sel="s-'+id+'"]');if(el)el.classList.add('is-lit');});
  atlasEventMarks(ev);
  return;
 }
 const el=svg.querySelector('[data-sel="'+sel+'"]');if(el)el.classList.add('is-sel');
 if(p.kind==='s'){const s=atlasSettlement(ATLAS_DATA,p.id),n=s&&svg.querySelector('[data-sel="n-'+s.nation+'"]');if(n)n.classList.add('is-lit');}
}
// Pins where the chosen event happened: the first carries its title, each
// the name of its place.
function atlasEventMarks(ev){
 const g=atlasEl('atlasEvMarks');if(!g)return;
 g.innerHTML=ev&&ATLAS_DATA?atlasEventMarksSVG(atlasEventPoints(ATLAS_DATA,ev),ev.title):'';
}
function atlasEventMarksSVG(pts,title){
 return pts.map((p,i)=>'<g class="atlas-ev" transform="translate('+p.x+' '+p.y+')"><g class="atlas-ev-s">'
  +'<circle class="atlas-ev-pulse" r="9"/>'
  +'<path class="atlas-ev-pin" d="M0 0C-4 -7 -9 -11 -9 -18A9 9 0 1 1 9 -18C9 -11 4 -7 0 0Z"/><circle class="atlas-ev-eye" cy="-18" r="3.4"/>'
  +(i===0?'<text class="atlas-ev-title" y="-34">'+esc(title)+'</text>':'')
  // A settlement shows its own name already; a point of its own gets one here.
  +(p.own&&p.name?'<text class="atlas-ev-sub" x="13" y="-14">'+esc(p.name)+'</text>':'')
  +'</g></g>').join('');
}
function atlasSelect(sel,opts){
 opts=opts||{};
 if(sel&&!atlasSelValid(ATLAS_DATA,sel))sel=null;
 WORLD_PLACE=sel||null;
 if(!opts.keepRoute&&typeof syncRouteFromState==='function')syncRouteFromState();
 if(!ATLAS_DATA)return;
 atlasMark(WORLD_PLACE);
 const track=atlasEl('atlasTrack');
 if(track)track.querySelectorAll('.atlas-tl-ev').forEach(b=>{const on=WORLD_PLACE==='e-'+b.dataset.ev;if(on){b.setAttribute('aria-current','true');b.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});}else b.removeAttribute('aria-current');});
 const to=atlasLevelOf(ATLAS_DATA,WORLD_PLACE);
 // A trip to another level swaps the drawer when the map swaps, behind the
 // clouds (atlasTravel), so it never names the place before the map shows it.
 if(to.level!==ATLAS.level||to.nation!==ATLAS.nation||to.town!==ATLAS.town){atlasTravel(to,opts);return;}
 atlasShowPanel(WORLD_PLACE?'detail':null);
 if(WORLD_PLACE&&opts.fly&&to.level!=='town'){
  const p=atlasParseSel(WORLD_PLACE),box=atlasSelBox(p);
  if(box)atlasFlyToBox(box,opts.instant,p.kind==='s'?3:0,p.kind==='e'?ATLAS_EVENT_K:0);
 }
}

/* ---------- levels and the trip through the clouds ---------- */
const ATLAS_TRAVEL_IN=280,ATLAS_TRAVEL_OUT=420; // owner: the first cut (650/950) was far too slow
function atlasWait(ms){return new Promise(r=>setTimeout(r,ms));}
// Go to another level (owner, 2026-11-20): the view dives toward where it
// is going while clouds close in, the level changes behind them, and the
// clouds part on the new level settling into place. Instant on arrival from
// a link, and with reduced motion.
async function atlasTravel(to,opts){
 const id=++ATLAS.travel,root=atlasEl('atlasRoot');if(!root)return;
 const from={level:ATLAS.level,nation:ATLAS.nation,town:ATLAS.town};
 const deeper=atlasDepth(to.level)>=atlasDepth(from.level);
 const instant=opts.instant||atlasReduced()||!ATLAS.view||typeof root.animate!=='function';
 let clouds=null;
 if(instant){cancelAnimationFrame(ATLAS.anim);atlasCloudsClear();}
 else{
  ATLAS.travelling=true;root.classList.add('is-travelling');
  const {w,h}=atlasSize(),f=deeper&&from.level!=='town'?atlasTravelFocus(to):{x:w/2,y:h/2};
  clouds=atlasClouds(deeper,f.x,f.y);
  atlasAnimateTo(atlasZoomAt(ATLAS.view,deeper?4:.3,f.x,f.y),false,{free:true,dur:ATLAS_TRAVEL_IN,ease:'in'});
  await atlasWait(ATLAS_TRAVEL_IN);
  if(id!==ATLAS.travel)return;
  cancelAnimationFrame(ATLAS.anim);
 }
 const ready=atlasEnterLevel(to);
 // The drawer changes with the map, before the view is worked out (the
 // drawer takes part of the screen on a phone).
 atlasShowPanel(WORLD_PLACE?'detail':null);
 const target=atlasClampView(atlasLevelView(to,from));
 if(instant){ATLAS.flying=false;atlasApply(opts.view||target);atlasTravelDone();return;}
 await Promise.race([ready,atlasWait(2500)]);
 if(id!==ATLAS.travel)return;
 const f=atlasLockBox();
 // The new level starts a little further out (in, going deeper) and
 // settles in as the clouds part.
 ATLAS.flying=false;
 const lim=atlasLimits(),k0=deeper?Math.max(lim.kMin,target.k*.4):target.k*2.4;
 atlasApply(atlasZoomAt(target,k0/target.k,f.x+f.w/2,f.y+f.h/2));
 clouds.part();
 await atlasAnimateTo(target,false,{dur:ATLAS_TRAVEL_OUT,ease:'out'});
 if(id===ATLAS.travel)atlasTravelDone();
}
function atlasTravelDone(){
 ATLAS.travelling=false;
 const root=atlasEl('atlasRoot');if(root)root.classList.remove('is-travelling');
}
// Where on the screen the trip heads: the nation or town chosen.
function atlasTravelFocus(to){
 const v=ATLAS.view,{w,h}=atlasSize();
 let x=null,y=null;
 if(to.level==='town'){const s=atlasSettlement(ATLAS_DATA,to.town);if(s){x=s.x;y=s.y;}}
 else if(to.nation){const n=atlasNation(ATLAS_DATA,to.nation);if(n){x=(n.box[0]+n.box[2])/2;y=(n.box[1]+n.box[3])/2;}}
 else{const b=atlasHomeView(ATLAS_DATA,atlasFreeBox());return {x:b.x+(ATLAS_DATA.width/2)*b.k,y:b.y+(ATLAS_DATA.height/2)*b.k};}
 if(x==null)return {x:w/2,y:h/2};
 // Keep it on screen, so the dive never heads off the edge.
 return {x:Math.min(w*.85,Math.max(w*.15,v.x+x*v.k)),y:Math.min(h*.85,Math.max(h*.15,v.y+y*v.k))};
}
// The view a level opens on: the whole map (or an event's places); the
// nation (or the town just left, or a fort chosen); all of a town's map.
function atlasLevelView(to,from){
 const d=ATLAS_DATA,p=atlasParseSel(WORLD_PLACE);
 if(to.level==='world'){
  const box=p&&p.kind==='e'?atlasSelBox(p):null;
  return box?atlasBoxView(box,0,ATLAS_EVENT_K):atlasHomeView(d,atlasFreeBox());
 }
 if(to.level==='town'){const t=atlasTown(d,to.town),{w,h}=atlasSize(),k=atlasCoverK(w,h,[0,0,t.w,t.h]);return {k,x:(w-t.w*k)/2,y:(h-t.h*k)/2};}
 const back=from&&from.level==='town'&&from.nation===to.nation&&atlasSettlement(d,from.town);
 const s=back||(p&&p.kind==='s'?atlasSettlement(d,p.id):null);
 if(s){const f=atlasLockBox(),k=Math.max(3,atlasDetailScale(atlasDetail(d,to.nation))*.55);return {k,x:f.x+f.w/2-s.x*k,y:f.y+f.h/2-s.y*k};}
 // An event inside the nation: its pins.
 const ebox=p&&p.kind==='e'?atlasSelBox(p):null;
 return ebox?atlasBoxView(ebox,0,ATLAS_EVENT_K):atlasBoxView(atlasNation(d,to.nation).box,0);
}
// Show a level: the nation's own map alone (the whole map and the other
// nations hidden, its settlements shown), or a town's map over everything.
// Resolves when the new picture is ready to be seen.
function atlasEnterLevel(to){
 const root=atlasEl('atlasRoot'),svg=atlasEl('atlasSvg');if(!root||!svg)return Promise.resolve();
 const ready=[];
 ATLAS.level=to.level;ATLAS.town=to.town||null;root.dataset.level=to.level;
 const id=to.nation||null,det=atlasDetail(ATLAS_DATA,id);
 if(ATLAS.nation!==id){
  ATLAS.nation=id;
  if(id){root.dataset.nation=id;if(det.labels)root.dataset.labels='';else delete root.dataset.labels;}
  else{delete root.dataset.nation;delete root.dataset.labels;}
  svg.querySelectorAll('.in-nation').forEach(el=>el.classList.remove('in-nation'));
  svg.querySelectorAll('.is-current').forEach(el=>el.classList.remove('is-current'));
  if(id){
   svg.querySelectorAll('.atlas-pl[data-n="'+id+'"]').forEach(el=>el.classList.add('in-nation'));
   const path=svg.querySelector('[data-sel="n-'+id+'"]');if(path)path.classList.add('is-current');
  }
 }
 const box=atlasEl('atlasDetails');
 box.querySelectorAll('img').forEach(img=>img.classList.toggle('is-on',img.dataset.n===id&&img.dataset.ready==='1'));
 if(id){
  let img=box.querySelector('img[data-n="'+id+'"]');
  if(!img){
   img=document.createElement('img');img.alt='';img.draggable=false;img.dataset.n=id;img.decoding='async';
   Object.assign(img.style,{left:det.x+'px',top:det.y+'px',width:det.w+'px',height:det.h+'px'});
   img.src=det.src;box.appendChild(img);
   ready.push(new Promise(done=>{
    const show=()=>{img.dataset.ready='1';if(ATLAS.nation===id)img.classList.add('is-on');done();};
    const fail=()=>{if(ATLAS.nation===id)atlasMissing('nation');done();};
    (img.decode?img.decode():Promise.resolve()).then(show,()=>{if(img.complete&&!img.naturalWidth)fail();else{img.addEventListener('load',show,{once:true});img.addEventListener('error',fail,{once:true});}});
   }));
  }else if(img.dataset.ready==='1')img.classList.add('is-on');
 }
 // A town's street map: a baked picture in the same pan and zoom (no
 // generator, nothing to edit).
 const ti=atlasEl('atlasTownImg'),town=to.level==='town'&&atlasTown(ATLAS_DATA,to.town);
 if(ti){
  ti.hidden=!town;
  if(town&&ti.dataset.town!==to.town){
   ti.dataset.town=to.town;ti.dataset.ready='';
   Object.assign(ti.style,{width:town.w+'px',height:town.h+'px'});
   ready.push(new Promise(done=>{
    ti.onload=()=>{ti.dataset.ready='1';done();};
    ti.onerror=()=>{if(ti.dataset.town===to.town)atlasMissing('town');done();};
   }));
   ti.src=town.src;
  }else if(!town&&ti.dataset.town){ti.dataset.town='';ti.removeAttribute('src');}
 }
 const crumbs=atlasEl('atlasCrumbs');if(crumbs)crumbs.innerHTML=atlasCrumbsHTML(ATLAS_DATA,to);
 return Promise.all(ready);
}
// Clouds closing in toward (fx, fy), deeper: puffs grow out of the
// distance; going up: they fall back in from around the edges. A haze
// behind them covers the screen while the level changes. part() opens them.
function atlasClouds(deeper,fx,fy){
 const box=atlasEl('atlasClouds');atlasCloudsClear();
 if(!box||typeof box.animate!=='function')return {part(){}};
 box.hidden=false;
 const {w,h}=atlasSize(),R=Math.max(w,h),n=18,puffs=[];
 const haze=document.createElement('div');haze.className='atlas-haze';box.appendChild(haze);
 haze.animate([{opacity:0},{opacity:0,offset:.3},{opacity:1}],{duration:ATLAS_TRAVEL_IN,easing:'ease-in',fill:'forwards'});
 const C='translate(-50%,-50%) ';
 for(let i=0;i<n;i++){
  const a=(i/n)*Math.PI*2+Math.random()*.5,r=R*(.04+Math.random()*.42),s=R*(.42+Math.random()*.4);
  const el=document.createElement('div');el.className='atlas-puff'+(i%3?'':' atlas-puff-b');
  Object.assign(el.style,{left:(fx+Math.cos(a)*r).toFixed(0)+'px',top:(fy+Math.sin(a)*r*.7).toFixed(0)+'px',width:s.toFixed(0)+'px',height:(s*.6).toFixed(0)+'px'});
  box.appendChild(el);
  const away=(m,sc)=>C+'translate('+(Math.cos(a)*R*m).toFixed(0)+'px,'+(Math.sin(a)*R*m).toFixed(0)+'px) scale('+sc+')';
  el.animate(deeper?[{transform:C+'scale(.15)',opacity:0},{transform:C+'scale(1)',opacity:1}]
   :[{transform:away(.6,3),opacity:0},{transform:C+'scale(1)',opacity:1}],
   {duration:ATLAS_TRAVEL_IN,delay:i*5,easing:'ease-in',fill:'forwards'});
  puffs.push({el,gone:deeper?away(.8,3.4):C+'scale(.2)'});
 }
 return {part(){
  haze.animate([{opacity:1},{opacity:0}],{duration:ATLAS_TRAVEL_OUT*.3,easing:'ease-out',fill:'forwards'});
  puffs.forEach((p,i)=>p.el.animate([{transform:C+'scale(1)',opacity:1},{transform:p.gone,opacity:0}],
   {duration:ATLAS_TRAVEL_OUT,delay:i*4,easing:'cubic-bezier(.2,.6,.3,1)',fill:'forwards'}));
  setTimeout(()=>{if(haze.parentNode===box)atlasCloudsClear();},ATLAS_TRAVEL_OUT+n*4+60);
 }};
}
function atlasCloudsClear(){const box=atlasEl('atlasClouds');if(box){box.hidden=true;box.innerHTML='';}}
function atlasSelBox(p){
 const d=ATLAS_DATA;
 if(p.kind==='n'){const n=atlasNation(d,p.id);return n&&n.box;}
 if(p.kind==='s'){const s=atlasSettlement(d,p.id);return s&&[s.x-14,s.y-10,s.x+14,s.y+10];}
 const ev=atlasEvent(p.id);if(!ev)return null;
 // Its pins when it has any; otherwise the nations it names.
 const pts=atlasEventPoints(d,ev);
 const boxes=(pts.length?pts.map(s=>[s.x-40,s.y-26,s.x+40,s.y+10]):(ev.nations||[]).map(id=>(atlasNation(d,id)||{}).box)).filter(Boolean);
 if(!boxes.length)return null;
 return [Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))];
}
// The nations list. On the whole map it clears the selection; inside a
// nation or town it only changes the panel (the level stays locked).
function atlasOpenList(){if(WORLD_PLACE&&ATLAS.level==='world'){WORLD_PLACE=null;syncRouteFromState();atlasMark(null);}atlasShowPanel('list');const p=atlasEl('atlasPanel');const h=p&&p.querySelector('h2');if(h)h.focus();}
function atlasShowPanel(mode){
 const panel=atlasEl('atlasPanel');if(!panel)return;
 ATLAS.panel=mode;
 if(!mode){panel.hidden=true;panel.innerHTML='';return;}
 panel.hidden=false;
 panel.innerHTML=mode==='list'?atlasListHTML():atlasDetailHTML(atlasParseSel(WORLD_PLACE));
 panel.scrollTop=0;
}
// ×: inside a nation or town it only closes the drawer, to see the map
// (the breadcrumb goes up). On the whole map it clears the choice.
function atlasCloseBtn(){return '<button type="button" class="atlas-panel-x" onclick="atlasClose()" aria-label="Close">×</button>';}
function atlasClose(){
 if(ATLAS.level!=='world'||!WORLD_PLACE)atlasShowPanel(null);
 else atlasSelect(null);
}
// A nation's or town's picture that will not load (Atlas UX spec, error
// state): say so in the drawer, with the way back up.
function atlasMissing(kind){
 const panel=atlasEl('atlasPanel');if(!panel||!ATLAS_DATA)return;
 if(panel.hidden)atlasShowPanel('detail');
 if(panel.querySelector('.atlas-missing'))return;
 const n=atlasNation(ATLAS_DATA,ATLAS.nation),up=kind==='town'&&n?{sel:'n-'+n.id,label:n.name}:{sel:null,label:'Sit’ota'};
 const p=document.createElement('div');p.className='atlas-missing';p.setAttribute('role','alert');
 p.innerHTML='<p>The '+(kind==='town'?'street':'nation’s')+' map could not be loaded. Check your connection, or go back.</p>'
  +'<button type="button" class="st-btn st-btn-sm" onclick="atlasSelect('+(up.sel?'\''+up.sel+'\',{fly:true}':'null')+')">‹ '+esc(up.label)+'</button>';
 const h=panel.querySelector('h2');if(h)h.after(p);else panel.prepend(p);
}
function atlasListHTML(){
 const d=ATLAS_DATA;
 return atlasCloseBtn()+'<p class="atlas-kicker">The atlas</p><h2 tabindex="-1">Nations of Sit’ota</h2>'
  +'<p class="atlas-lede">Choose a nation on the map or below. Zoom in to see more settlements; those marked with a ring open a street map.</p>'
  +'<ul class="atlas-list">'+d.nations.map(n=>'<li><button type="button" onclick="atlasSelect(\'n-'+n.id+'\',{fly:true})"><span class="atlas-swatch" aria-hidden="true"></span>'+esc(n.name)
  +'<small>'+d.settlements.filter(s=>s.nation===n.id).length+'</small></button></li>').join('')+'</ul>'
  +'<p class="atlas-note">Stand-in maps. Borders and settlements come from the working map file and may change.</p>';
}
// While the lore is still being written, the facts below it carry the entry.
const ATLAS_NO_LORE='<p class="atlas-empty">Lore coming soon.</p>';
function atlasLoreBody(l){
 if(!l)return ATLAS_NO_LORE;
 return (l.summary?'<p class="atlas-summary">'+esc(l.summary)+'</p>':'')+(l.body?'<div class="atlas-body">'+l.body+'</div>':'')
  ||ATLAS_NO_LORE;
}
const ATLAS_MAP_ICON='<svg class="i atlas-mapic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>';
function atlasEventsHTML(evs){
 if(!evs.length)return '';
 const cal=atlasCalendar();
 return '<h3>In the timeline</h3><ul class="atlas-evlist">'+evs.map(e=>'<li><button type="button" onclick="atlasSelect(\'e-'+esc(e.id)+'\',{fly:true})"><span>'+esc(atlasYearText(e,cal))+'</span>'+esc(e.title)+'</button></li>').join('')+'</ul>';
}
function atlasLink(sel,name){return '<button type="button" class="atlas-link" onclick="atlasSelect(\''+sel+'\',{fly:true})">'+esc(name)+'</button>';}
function atlasDetailHTML(p){
 const d=ATLAS_DATA,lore=atlasLore();if(!p)return atlasListHTML();
 const back='<button type="button" class="atlas-back" onclick="atlasOpenList()">‹ Nations</button>';
 if(p.kind==='n'){
  const n=atlasNation(d,p.id),cap=d.settlements.find(s=>s.i===n.capital);
  const places=d.settlements.filter(s=>s.nation===n.id).sort((a,b)=>(b.capital-a.capital)||((a.group==='city'?0:1)-(b.group==='city'?0:1))||b.size-a.size);
  return atlasCloseBtn()+back+'<p class="atlas-kicker">Nation</p><h2 tabindex="-1">'+esc(n.name)+'</h2>'
   +atlasLoreBody((lore.nations||{})[n.id])
   +'<dl class="atlas-facts">'+(cap?'<div><dt>Capital</dt><dd>'+atlasLink('s-'+cap.id,atlasPlaceName(cap))+(atlasPlaceName(cap)!==cap.name?' <small>('+esc(cap.name)+' on the stand-in map)</small>':'')+'</dd></div>':'')
   +'<div><dt>Settlements</dt><dd>'+places.length+'</dd></div>'
   +'<div><dt>Street maps</dt><dd>'+(places.filter(s=>atlasTown(d,s.id)).length||'None yet')+'</dd></div>'
   +'<div><dt>Area</dt><dd>≈ '+Number(Math.round(n.areaSqMi/1000)*1000).toLocaleString('en-US')+' sq mi</dd></div></dl>'
   +atlasEventsHTML(atlasEventsFor(d,'n',n.id))
   +(places.length?'<h3>Settlements</h3><ul class="atlas-places">'+places.map(s=>'<li'+(atlasTown(d,s.id)?' class="has-town"':'')+'>'+atlasLink('s-'+s.id,atlasPlaceName(s))+'<small>'+esc(ATLAS_GROUP_LABEL[s.group]||'')+(s.port?' · port':'')+(atlasTown(d,s.id)?' · '+ATLAS_MAP_ICON+'street map':'')+'</small></li>').join('')+'</ul>':'')
   +(atlasDetail(d,n.id)?'<p class="atlas-note">The nation map is a stand-in until the detailed map is drawn.</p>':'');
 }
 if(p.kind==='s'){
  const s=atlasSettlement(d,p.id),n=atlasNation(d,s.nation),name=atlasPlaceName(s);
  const kind=s.capital&&n?'Capital of '+n.name:(ATLAS_GROUP_LABEL[s.group]||'Settlement')+(n?' in '+n.name:'');
  return atlasCloseBtn()+(n?'<button type="button" class="atlas-back" onclick="atlasSelect(\'n-'+n.id+'\',{fly:true})">‹ '+esc(n.name)+'</button>':back)
   +'<p class="atlas-kicker">'+esc(kind)+'</p><h2 tabindex="-1">'+esc(name)+'</h2>'
   +(name!==s.name?'<p class="atlas-alias">'+esc(s.name)+' on the stand-in map</p>':'')
   +atlasLoreBody((lore.places||{})[s.id])
   +'<dl class="atlas-facts">'+(n?'<div><dt>Nation</dt><dd>'+atlasLink('n-'+n.id,n.name)+'</dd></div>':'')
   +'<div><dt>Tier</dt><dd>'+esc(ATLAS_GROUP_LABEL[s.group]||'Settlement')+(s.port?', port':'')+'</dd></div>'
   +'<div><dt>Street map</dt><dd>'+(atlasTown(d,s.id)?ATLAS_MAP_ICON+'Yes':'Not yet')+'</dd></div></dl>'
   +atlasTownHTML(d,s,name)
   +atlasEventsHTML(atlasEventsFor(d,'s',s.id));
 }
 const e=atlasEvent(p.id),cal=atlasCalendar(),era=(lore.eras||[]).find(x=>x.id===e.era);
 const links=(e.nations||[]).map(id=>{const n=atlasNation(d,id);return n&&atlasLink('n-'+id,n.name);})
  .concat((e.places||[]).map(id=>{const s=atlasSettlement(d,id);return s&&atlasLink('s-'+id,atlasPlaceName(s));})).filter(Boolean);
 return atlasCloseBtn()+'<p class="atlas-kicker">'+esc(atlasYearText(e,cal))+(era?' · '+esc(era.name):'')+'</p><h2 tabindex="-1">'+esc(e.title)+'</h2>'
  +(e.sample?'<p class="atlas-alias">A sample event, made up to show the timeline. Not canon.</p>':'')
  +atlasLoreBody(e.summary||e.body?{summary:e.summary,body:e.body}:null)
  +(links.length?'<h3>Where</h3><p class="atlas-where">'+links.join('')+'</p>':'');
}
// A settlement's street map fills the map once the trip through the clouds
// arrives; the drawer says where it comes from. Read-only: no generator
// controls and no link to regenerate it (Atlas UX spec).
function atlasTownHTML(d,s,name){
 if(!atlasTown(d,s.id))return '';
 return '<h3>Street map</h3><p class="atlas-town-note">Drag, scroll or pinch to explore '+esc(name)+'.</p>'
  +'<p class="atlas-note">Made with Watabou’s '+(/village-generator/.test(s.map||'')?'Village':'Medieval Fantasy City')+' Generator, from Azgaar’s map. A stand-in until the town is drawn.</p>';
}

/* Called by the router when only the selection changed (back/forward). */
function atlasRouteTo(sel){
 if(!atlasEl('atlasRoot')||!ATLAS_DATA)return false;
 atlasSelect(sel,{fly:true,keepRoute:true});return true;
}
