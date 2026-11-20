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

   Pure helpers (atlasSearch, atlasLod, atlasFit, atlasClamp, ...) take
   plain values so tests/atlas.cjs can check them without a browser. */

const ATLAS_DATA_URL='assets/atlas/atlas-data.json?v=82db89bd34';
const ATLAS_MAP_URL='assets/atlas/sitota-map.webp?v=1bea6796c2';
const ATLAS_PLATE_DIR='assets/atlas/plates/';
const ATLAS_PLATES={ // nation id -> plate file (stand-in national maps)
 telesco:'telesco.webp?v=c9836f6e5d',menesha:'menesha.webp?v=e415c53217','ba-riggelby':'ba-riggelby.webp?v=ecb2048128',
 jazir:'jazir.webp?v=ee51895450',felindel:'felindel.webp?v=5c6d6b9e5f',lzar:'lzar.webp?v=12c8a06211',
 satilan:'satilan.webp?v=5424ef0c6d',vishka:'vishka.webp?v=4838c98f92',eintritt:'eintritt.webp?v=efaf42f4db',
 katalli:'katalli.webp?v=53e99f559c',kioke:'kioke.webp?v=1a1039104a',leefland:'leefland.webp?v=03a80fb81f',
 khor:'khor.webp?v=b1b8361752','the-hix':'the-hix.webp?v=ec4d982fb6',buffalo:'buffalo.webp?v=8bfff525e1',
 zhalin:'zhalin.webp?v=5901869062',desolice:'desolice.webp?v=d0cbb63cd0',marett:'marett.webp?v=8a86205652',
 joda:'joda.webp?v=e4fd3a62b1',valeshar:'valeshar.webp?v=aee5d8ce71'
};
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
const ATLAS_LOD=[1.25,2.3,4];
const ATLAS_K_MAX=6; // the stand-in picture is 1.5 px per unit; past this it is mush
const ATLAS_GROUP_LABEL={capital:'Capital',city:'City',town:'Town',village:'Village',fort:'Fort'};

let ATLAS_DATA=null,ATLAS_LOADING=null,ATLAS_ERROR='';
let WORLD_PLACE=null; // selected id ("n-valeshar"), part of the route
const ATLAS={view:null,fit:1,layers:null,panel:null,timeline:null,era:'all',drag:null,pointers:new Map(),anim:0,ro:null,lastTap:0};

/* ---------- pure helpers ---------- */
function atlasLore(){return typeof ATLAS_LORE==='object'&&ATLAS_LORE?ATLAS_LORE:{nations:{},places:{},eras:[],events:[]};}
function atlasPlaceName(s){const l=(atlasLore().places||{})[s.id];return l&&l.name?l.name:s.name;}
function atlasNation(data,id){return (data.nations||[]).find(n=>n.id===id)||null;}
function atlasSettlement(data,id){return (data.settlements||[]).find(s=>s.id===id)||null;}
function atlasEvent(id){return (atlasLore().events||[]).find(e=>e.id===id)||null;}
function atlasCalendar(data){
 const c=atlasLore().calendar||data&&data.calendar||null;
 return c&&c.year!=null?c:null;
}
function atlasYearText(ev,cal){
 if(ev.label)return ev.label;
 const era=(atlasLore().eras||[]).find(e=>e.id===ev.era);
 const short=era&&era.short||cal&&cal.eraShort||'';
 return ev.year==null?'':String(ev.year)+(short?' '+short:'');
}
function atlasSortedEvents(era){
 return (atlasLore().events||[]).filter(e=>!era||era==='all'||e.era===era)
  .slice().sort((a,b)=>(a.year==null?Infinity:a.year)-(b.year==null?Infinity:b.year));
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
   hits.push({sel:'s-'+p.id,name:shown,kind:(ATLAS_GROUP_LABEL[p.group]||'Settlement')+(nat?' · '+nat.name:''),rank:s+(p.capital?0:p.group==='city'?.2:.4)});}
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
// Keep the middle of the viewport over the map, and the zoom in range.
function atlasClamp(v,w,h,mapW,mapH,kMin,kMax){
 const k=Math.min(kMax,Math.max(kMin,v.k));
 const x=Math.min(w/2,Math.max(w/2-mapW*k,v.x)),y=Math.min(h/2,Math.max(h/2-mapH*k,v.y));
 return {k,x,y};
}
function atlasZoomAt(v,factor,px,py){
 const k=v.k*factor;return {k,x:px-(px-v.x)*factor,y:py-(py-v.y)*factor};
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
 const mobile=typeof matchMedia==='function'&&matchMedia('(max-width:899px)').matches;
 if(ATLAS.timeline===null)ATLAS.timeline=!mobile;
 const icon=d=>'<svg class="i" viewBox="0 0 24 24" aria-hidden="true">'+d+'</svg>';
 return '<section class="atlas" id="atlasRoot" aria-labelledby="atlasTitle" data-timeline="'+(ATLAS.timeline?'open':'closed')+'"'
  +Object.keys(layers).map(k=>' data-layer-'+k+'="'+(layers[k]?'on':'off')+'"').join('')+'>'
  +'<h1 class="atlas-sr" id="atlasTitle" tabindex="-1">Atlas of Sit’ota</h1>'
  +'<div class="atlas-stage">'
  +'<div class="atlas-map" id="atlasMap" aria-label="Map of Sit’ota. Drag to pan, scroll or pinch to zoom, or use the arrow keys and plus and minus." tabindex="0" role="application">'
  +'<div class="atlas-world" id="atlasWorld"><img class="atlas-base" src="'+ATLAS_MAP_URL+'" alt="" draggable="false" decoding="async"><svg class="atlas-svg" id="atlasSvg" aria-hidden="true"></svg></div>'
  +'<p class="atlas-status" id="atlasStatus" role="status">Loading the atlas…</p>'
  +'</div>'
  +'<div class="atlas-top">'
  +'<div class="atlas-search"><label class="atlas-sr" for="atlasSearch">Search the atlas</label>'
  +'<span class="atlas-search-ic" aria-hidden="true">'+icon('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>')+'</span>'
  +'<input id="atlasSearch" type="search" autocomplete="off" placeholder="Search places and events" aria-controls="atlasResults" aria-autocomplete="list" oninput="atlasOnSearch(this.value)" onkeydown="atlasSearchKey(event)">'
  +'<div class="atlas-results" id="atlasResults" role="listbox" aria-label="Search results" hidden></div></div>'
  +'<div class="atlas-tools">'
  +'<button type="button" class="atlas-tool" onclick="atlasOpenList()" aria-label="Nations list" title="Nations">'+icon('<path d="M4 6h16M4 12h16M4 18h10"/>')+'<span>Nations</span></button>'
  +'<button type="button" class="atlas-tool" id="atlasLayersBtn" aria-expanded="false" aria-controls="atlasLayers" onclick="atlasToggleLayers()" title="Map layers">'+icon('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>')+'<span>Layers</span></button>'
  +'<a class="atlas-tool" href="#/world/welcome" title="Guide chapters">'+icon('<path d="M12 6C9 4 6 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/>')+'<span>Guide</span></a>'
  +'</div>'
  +'<div class="atlas-layers" id="atlasLayers" hidden><p>Show on the map</p>'
  +ATLAS_LAYERS.map(l=>'<label><input type="checkbox" '+(layers[l.id]?'checked ':'')+'onchange="atlasSetLayer(\''+l.id+'\',this.checked)"> '+esc(l.label)+'</label>').join('')
  +'</div></div>'
  +'<div class="atlas-zoom" role="group" aria-label="Zoom">'
  +'<button type="button" onclick="atlasZoomBy(1.6)" aria-label="Zoom in">'+icon('<path d="M12 5v14M5 12h14"/>')+'</button>'
  +'<button type="button" onclick="atlasZoomBy(1/1.6)" aria-label="Zoom out">'+icon('<path d="M5 12h14"/>')+'</button>'
  +'<button type="button" onclick="atlasReset()" aria-label="Show the whole map">'+icon('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')+'</button>'
  +'</div>'
  +'<aside class="atlas-panel" id="atlasPanel" aria-label="Atlas entry" hidden></aside>'
  +'</div>'
  +atlasTimelineHTML()
  +'<dialog class="atlas-plate" id="atlasPlate" aria-label="National map"><form method="dialog"><button class="atlas-plate-close" aria-label="Close">×</button></form><img id="atlasPlateImg" alt=""><p id="atlasPlateCap"></p></dialog>'
  +'</section>';
}
function atlasTimelineHTML(){
 const cal=atlasCalendar(ATLAS_DATA),eras=atlasLore().eras||[],evs=atlasSortedEvents(ATLAS.era);
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
 const places=(data.settlements||[]).filter(s=>s.nation).sort((a,b)=>lod(b)-lod(a)).map(s=>'<g class="atlas-pl" data-lod="'+lod(s)+'" data-sel="s-'+s.id+'" transform="translate('+s.x+' '+s.y+')"><g class="atlas-pl-s">'
  +(s.capital?'<circle class="atlas-pl-ring" r="6"/>':'')+'<circle class="atlas-pl-dot" r="'+(s.capital?3.4:s.group==='city'?3:2.4)+'"/><circle class="atlas-pl-hit" r="10"/>'
  +'<text x="7" y="4">'+esc(atlasPlaceName(s))+'</text></g><title>'+esc(atlasPlaceName(s))+'</title></g>').join('');
 return '<g class="atlas-g-sea">'+route(['searoutes'])+'</g>'
  +'<g class="atlas-g-rivers">'+rivers+'</g>'
  +'<g class="atlas-g-roads">'+route(['trails','roads'])+'</g>'
  +'<g class="atlas-g-nations">'+nations+'</g>'
  +'<g class="atlas-g-places">'+places+'</g>';
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
  atlasEl('atlasStatus').hidden=true;
  atlasBind();
  // A re-render while the atlas is open (sign-in, theme) keeps the view.
  const prev=ATLAS.view;ATLAS.view=null;
  const tl=atlasEl('atlasTimeline');if(tl)tl.outerHTML=atlasTimelineHTML();
  const sel=WORLD_PLACE&&atlasSelValid(data,WORLD_PLACE)?WORLD_PLACE:null;
  if(!sel)WORLD_PLACE=null;
  atlasShowPanel(sel?'detail':atlasDesktop()?'list':null);
  if(prev)atlasApply(prev);else atlasReset(true);
  if(sel)atlasSelect(sel,{fly:!prev,instant:true,keepRoute:true});
 }).catch(()=>{
  const st=atlasEl('atlasStatus');
  if(st){st.innerHTML=esc(ATLAS_ERROR)+' <button type="button" class="st-btn st-btn-sm" onclick="atlasMount()">Retry</button>';st.setAttribute('role','alert');}
 });
}
function atlasDesktop(){return !(typeof matchMedia==='function'&&matchMedia('(max-width:899px)').matches);}
function atlasSize(){const m=atlasEl('atlasMap');return m?{w:m.clientWidth,h:m.clientHeight}:{w:1,h:1};}
function atlasLimits(){
 const {w,h}=atlasSize(),d=ATLAS_DATA;
 const fit=Math.min(w/d.width,h/d.height);ATLAS.fit=fit;
 return {kMin:fit*.8,kMax:Math.max(fit*2,ATLAS_K_MAX)};
}
function atlasApply(v){
 const d=ATLAS_DATA,{w,h}=atlasSize(),lim=atlasLimits();
 v=atlasClamp(v,w,h,d.width,d.height,lim.kMin,lim.kMax);ATLAS.view=v;
 const world=atlasEl('atlasWorld'),root=atlasEl('atlasRoot');if(!world)return;
 world.style.transform='translate('+v.x.toFixed(1)+'px,'+v.y.toFixed(1)+'px) scale('+v.k.toFixed(4)+')';
 world.style.setProperty('--k',v.k.toFixed(4));
 root.dataset.lod=atlasLod(v.k);
}
function atlasAnimateTo(target,instant){
 cancelAnimationFrame(ATLAS.anim);
 const from=ATLAS.view;
 const reduce=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!from||instant||reduce){atlasApply(target);return;}
 const t0=performance.now(),dur=520;
 const step=now=>{
  const t=Math.min(1,(now-t0)/dur),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  // Zoom geometrically so the move reads as one smooth flight.
  const k=from.k*Math.pow(target.k/from.k,e);
  atlasApply({k,x:from.x+(target.x-from.x)*e,y:from.y+(target.y-from.y)*e});
  if(t<1)ATLAS.anim=requestAnimationFrame(step);
 };
 ATLAS.anim=requestAnimationFrame(step);
}
function atlasReset(instant){
 if(!ATLAS_DATA)return;
 atlasAnimateTo(atlasHomeView(ATLAS_DATA,atlasFreeBox()),instant===true);
}
function atlasZoomBy(f,px,py){
 if(!ATLAS.view)return;
 const {w,h}=atlasSize();
 atlasAnimateTo(atlasZoomAt(ATLAS.view,f,px==null?w/2:px,py==null?h/2:py));
}
// The panel covers part of the map: fly to the part it leaves free.
function atlasFreeBox(){
 const {w,h}=atlasSize(),panel=atlasEl('atlasPanel');
 if(!panel||panel.hidden)return {x:0,y:0,w,h};
 if(atlasDesktop())return {x:0,y:0,w:Math.max(200,w-panel.offsetWidth-16),h};
 return {x:0,y:0,w,h:Math.max(140,h-panel.offsetHeight)};
}
// Nations fit their free space up to zoom 3; settlements go to at least kMin.
function atlasFlyToBox(box,instant,kMin){
 const f=atlasFreeBox(),fit=atlasFit(box,f.w,f.h,Math.min(60,f.w*.1));
 const k=kMin?Math.max(kMin,Math.min(fit.k,ATLAS_K_MAX),ATLAS.view?Math.min(ATLAS.view.k,ATLAS_K_MAX):0):Math.min(fit.k,3);
 const cx=(box[0]+box[2])/2,cy=(box[1]+box[3])/2;
 atlasAnimateTo({k,x:f.x+f.w/2-cx*k,y:f.y+f.h/2-cy*k},instant);
}

/* ---------- interaction ---------- */
function atlasBind(){
 const map=atlasEl('atlasMap');if(!map||map.dataset.bound)return;
 map.dataset.bound='1';
 map.addEventListener('wheel',e=>{
  e.preventDefault();cancelAnimationFrame(ATLAS.anim);
  const r=map.getBoundingClientRect(),dy=e.deltaMode===1?e.deltaY*16:e.deltaY;
  atlasApply(atlasZoomAt(ATLAS.view,Math.exp(-dy*.0016),e.clientX-r.left,e.clientY-r.top));
 },{passive:false});
 map.addEventListener('pointerdown',e=>{
  if(e.button>0)return;
  cancelAnimationFrame(ATLAS.anim);
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
   const v=atlasZoomAt(d.view,dist/d.pinch.dist,d.pinch.mx-r.left,d.pinch.my-r.top);
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
  if(t)atlasSelect(t.getAttribute('data-sel'),{fly:t.classList.contains('atlas-pl')?false:true});
  else if(WORLD_PLACE)atlasSelect(null);
 };
 map.addEventListener('pointerup',end);map.addEventListener('pointercancel',end);
 map.addEventListener('keydown',e=>{
  const {w,h}=atlasSize(),v=ATLAS.view,step=80;if(!v)return;
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
  if(WORLD_PLACE)atlasSelect(null);else if(!atlasEl('atlasPanel').hidden&&!atlasDesktop())atlasShowPanel(null);
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
 svg.querySelectorAll('.is-sel,.is-lit').forEach(el=>el.classList.remove('is-sel','is-lit'));
 const p=atlasParseSel(sel);if(!p)return;
 if(p.kind==='e'){
  const ev=atlasEvent(p.id)||{};
  (ev.nations||[]).forEach(id=>{const el=svg.querySelector('[data-sel="n-'+id+'"]');if(el)el.classList.add('is-lit');});
  (ev.places||[]).forEach(id=>{const el=svg.querySelector('[data-sel="s-'+id+'"]');if(el)el.classList.add('is-lit');});
  return;
 }
 const el=svg.querySelector('[data-sel="'+sel+'"]');if(el)el.classList.add('is-sel');
 if(p.kind==='s'){const s=atlasSettlement(ATLAS_DATA,p.id),n=s&&svg.querySelector('[data-sel="n-'+s.nation+'"]');if(n)n.classList.add('is-lit');}
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
 if(!WORLD_PLACE){atlasShowPanel(atlasDesktop()?'list':null);return;}
 atlasShowPanel('detail');
 if(opts.fly){
  const p=atlasParseSel(WORLD_PLACE),box=atlasSelBox(p);
  if(box)atlasFlyToBox(box,opts.instant,p.kind==='s'?3:0);
 }
}
function atlasSelBox(p){
 const d=ATLAS_DATA;
 if(p.kind==='n'){const n=atlasNation(d,p.id);return n&&n.box;}
 if(p.kind==='s'){const s=atlasSettlement(d,p.id);return s&&[s.x-14,s.y-10,s.x+14,s.y+10];}
 const ev=atlasEvent(p.id);if(!ev)return null;
 const boxes=(ev.nations||[]).map(id=>(atlasNation(d,id)||{}).box).concat((ev.places||[]).map(id=>{const s=atlasSettlement(d,id);return s&&[s.x-14,s.y-10,s.x+14,s.y+10];})).filter(Boolean);
 if(!boxes.length)return null;
 return [Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))];
}
function atlasOpenList(){if(WORLD_PLACE){WORLD_PLACE=null;syncRouteFromState();atlasMark(null);}atlasShowPanel('list');const p=atlasEl('atlasPanel');const h=p&&p.querySelector('h2');if(h)h.focus();}
function atlasShowPanel(mode){
 const panel=atlasEl('atlasPanel');if(!panel)return;
 ATLAS.panel=mode;
 if(!mode){panel.hidden=true;panel.innerHTML='';return;}
 panel.hidden=false;
 panel.innerHTML=mode==='list'?atlasListHTML():atlasDetailHTML(atlasParseSel(WORLD_PLACE));
 panel.scrollTop=0;
}
function atlasCloseBtn(){return '<button type="button" class="atlas-panel-x" onclick="'+(WORLD_PLACE?'atlasSelect(null)':'atlasShowPanel(null)')+'" aria-label="Close">×</button>';}
function atlasListHTML(){
 const d=ATLAS_DATA;
 return (atlasDesktop()?'':atlasCloseBtn())+'<p class="atlas-kicker">The atlas</p><h2 tabindex="-1">Nations of Sit’ota</h2>'
  +'<p class="atlas-lede">Choose a nation on the map or below. Zoom in to see more settlements.</p>'
  +'<ul class="atlas-list">'+d.nations.map(n=>'<li><button type="button" onclick="atlasSelect(\'n-'+n.id+'\',{fly:true})"><span class="atlas-swatch" aria-hidden="true"></span>'+esc(n.name)
  +'<small>'+d.settlements.filter(s=>s.nation===n.id).length+'</small></button></li>').join('')+'</ul>'
  +'<p class="atlas-note">Stand-in maps. Borders and settlements come from the working map file and may change.</p>';
}
function atlasLoreBody(l){
 if(!l)return '<p class="atlas-empty">No entry yet.</p>';
 return (l.summary?'<p class="atlas-summary">'+esc(l.summary)+'</p>':'')+(l.body?'<div class="atlas-body">'+l.body+'</div>':'')
  ||'<p class="atlas-empty">No entry yet.</p>';
}
function atlasEventsHTML(evs){
 if(!evs.length)return '';
 const cal=atlasCalendar(ATLAS_DATA);
 return '<h3>In the timeline</h3><ul class="atlas-evlist">'+evs.map(e=>'<li><button type="button" onclick="atlasSelect(\'e-'+esc(e.id)+'\',{fly:true})"><span>'+esc(atlasYearText(e,cal))+'</span>'+esc(e.title)+'</button></li>').join('')+'</ul>';
}
function atlasLink(sel,name){return '<button type="button" class="atlas-link" onclick="atlasSelect(\''+sel+'\',{fly:true})">'+esc(name)+'</button>';}
function atlasDetailHTML(p){
 const d=ATLAS_DATA,lore=atlasLore();if(!p)return atlasListHTML();
 const back='<button type="button" class="atlas-back" onclick="atlasOpenList()">‹ Nations</button>';
 if(p.kind==='n'){
  const n=atlasNation(d,p.id),cap=d.settlements.find(s=>s.i===n.capital);
  const places=d.settlements.filter(s=>s.nation===n.id).sort((a,b)=>(b.capital-a.capital)||((a.group==='city'?0:1)-(b.group==='city'?0:1))||b.size-a.size);
  const plate=ATLAS_PLATES[n.id];
  return atlasCloseBtn()+back+'<p class="atlas-kicker">Nation</p><h2 tabindex="-1">'+esc(n.name)+'</h2>'
   +atlasLoreBody((lore.nations||{})[n.id])
   +'<dl class="atlas-facts">'+(cap?'<div><dt>Capital</dt><dd>'+atlasLink('s-'+cap.id,atlasPlaceName(cap))+(atlasPlaceName(cap)!==cap.name?' <small>('+esc(cap.name)+' on the stand-in map)</small>':'')+'</dd></div>':'')
   +'<div><dt>Settlements</dt><dd>'+places.length+'</dd></div>'
   +'<div><dt>Area</dt><dd>≈ '+Number(Math.round(n.areaSqMi/1000)*1000).toLocaleString('en-US')+' sq mi</dd></div></dl>'
   +(plate?'<button type="button" class="atlas-plate-btn" onclick="atlasOpenPlate(\''+n.id+'\')"><img src="'+ATLAS_PLATE_DIR+plate+'" alt="" loading="lazy"><span>National map</span></button>':'')
   +atlasEventsHTML(atlasEventsFor(d,'n',n.id))
   +(places.length?'<h3>Settlements</h3><ul class="atlas-places">'+places.map(s=>'<li>'+atlasLink('s-'+s.id,atlasPlaceName(s))+'<small>'+esc(ATLAS_GROUP_LABEL[s.group]||'')+(s.port?' · port':'')+'</small></li>').join('')+'</ul>':'');
 }
 if(p.kind==='s'){
  const s=atlasSettlement(d,p.id),n=atlasNation(d,s.nation),name=atlasPlaceName(s);
  const kind=s.capital&&n?'Capital of '+n.name:(ATLAS_GROUP_LABEL[s.group]||'Settlement')+(n?' in '+n.name:'');
  return atlasCloseBtn()+(n?'<button type="button" class="atlas-back" onclick="atlasSelect(\'n-'+n.id+'\',{fly:true})">‹ '+esc(n.name)+'</button>':back)
   +'<p class="atlas-kicker">'+esc(kind)+'</p><h2 tabindex="-1">'+esc(name)+'</h2>'
   +(name!==s.name?'<p class="atlas-alias">'+esc(s.name)+' on the stand-in map</p>':'')
   +atlasLoreBody((lore.places||{})[s.id])
   +'<dl class="atlas-facts">'+(n?'<div><dt>Nation</dt><dd>'+atlasLink('n-'+n.id,n.name)+'</dd></div>':'')
   +'<div><dt>Kind</dt><dd>'+esc(ATLAS_GROUP_LABEL[s.group]||'Settlement')+(s.port?', port':'')+'</dd></div></dl>'
   +atlasEventsHTML(atlasEventsFor(d,'s',s.id));
 }
 const e=atlasEvent(p.id),cal=atlasCalendar(d),era=(lore.eras||[]).find(x=>x.id===e.era);
 const links=(e.nations||[]).map(id=>{const n=atlasNation(d,id);return n&&atlasLink('n-'+id,n.name);})
  .concat((e.places||[]).map(id=>{const s=atlasSettlement(d,id);return s&&atlasLink('s-'+id,atlasPlaceName(s));})).filter(Boolean);
 return atlasCloseBtn()+'<p class="atlas-kicker">'+esc(atlasYearText(e,cal))+(era?' · '+esc(era.name):'')+'</p><h2 tabindex="-1">'+esc(e.title)+'</h2>'
  +atlasLoreBody(e.summary||e.body?{summary:e.summary,body:e.body}:null)
  +(links.length?'<h3>Where</h3><p class="atlas-where">'+links.join('')+'</p>':'');
}
function atlasOpenPlate(id){
 const dlg=atlasEl('atlasPlate'),n=atlasNation(ATLAS_DATA,id);if(!dlg||!n)return;
 atlasEl('atlasPlateImg').src=ATLAS_PLATE_DIR+ATLAS_PLATES[id];
 atlasEl('atlasPlateImg').alt='National map of '+n.name;
 atlasEl('atlasPlateCap').textContent=n.name+' — stand-in national map';
 if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
}

/* Called by the router when only the selection changed (back/forward). */
function atlasRouteTo(sel){
 if(!atlasEl('atlasRoot')||!ATLAS_DATA)return false;
 atlasSelect(sel,{fly:true,keepRoute:true});return true;
}
