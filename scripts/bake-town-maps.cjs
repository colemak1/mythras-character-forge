// Bake read-only town maps for the atlas (Atlas UX spec, docs/ux/atlas-20261121.md):
// open each settlement's Watabou link (Azgaar's, with the lore name), export
// the map as SVG through the generator's own menu, render it to a WebP and
// record it in assets/atlas/atlas-data.json ("towns"), which
// scripts/build-atlas-data.py keeps. The atlas shows the WebP in its own
// pan and zoom; no generator runs on the site.
//
//   node scripts/bake-town-maps.cjs golshehr [more ids...]
//
// Needs network access to watabou.github.io and Playwright's Chromium.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),DATA=path.join(ROOT,'assets/atlas/atlas-data.json'),OUT=path.join(ROOT,'assets/atlas/towns');
const SCALE=2; // WebP pixels per SVG unit: sharp when zoomed in, about 0.5 MB a city

async function exportSvg(page,url){
 await page.goto(url,{waitUntil:'load'});
 await page.waitForTimeout(8000); // the generator builds the town after load
 const x=700,y=550;
 await page.mouse.click(x,y,{button:'right'});await page.waitForTimeout(600);
 await page.mouse.move(x+50,y+138);await page.waitForTimeout(600);      // "Export as"
 await page.mouse.move(x+150,y+138);await page.mouse.move(x+168,y+138); // into the submenu
 const dl=page.waitForEvent('download',{timeout:15000});
 await page.mouse.click(x+168,y+168);                                   // "SVG"
 const file=path.join(os.tmpdir(),'town-'+Date.now()+'.svg');
 await (await dl).saveAs(file);
 return fs.readFileSync(file,'utf8');
}
async function render(page,svg,png){
 const m=/<svg[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/.exec(svg);
 const w=Math.ceil(+m[1]),h=Math.ceil(+m[2]);
 await page.setViewportSize({width:w,height:h});
 await page.setContent('<!doctype html><style>html,body{margin:0}</style>'+svg.replace(/^<\?xml[^>]*\?>/,''),{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:png,clip:{x:0,y:0,width:w,height:h}});
 return {w,h};
}
(async()=>{
 const ids=process.argv.slice(2);if(!ids.length){console.error('usage: node scripts/bake-town-maps.cjs <settlement id>...');process.exit(1);}
 const data=JSON.parse(fs.readFileSync(DATA,'utf8'));
 const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,'js/atlas-lore.js'),'utf8')+';this.L=ATLAS_LORE',ctx);
 fs.mkdirSync(OUT,{recursive:true});
 const b=await chromium.launch();
 const gen=await b.newPage({viewport:{width:1400,height:1100},acceptDownloads:true});
 await gen.route(/armoria/,r=>r.abort()); // coats of arms: not shown, and the host refuses
 const shot=await b.newPage({deviceScaleFactor:SCALE});
 data.towns=data.towns||{};
 for(const id of ids){
  const s=data.settlements.find(x=>x.id===id);
  if(!s||!s.map){console.error(id+': no such settlement with a town map');continue;}
  const name=(ctx.L.places[id]||{}).name||s.name;
  const url=s.map.replace(/([?&]name=)[^&]*/,(m,a)=>a+encodeURIComponent(name).replace(/%20/g,'+'));
  const svg=await exportSvg(gen,url);
  const png=path.join(os.tmpdir(),'town-'+id+'.png'),webp=path.join(OUT,id+'.webp');
  const {w,h}=await render(shot,svg,png);
  execFileSync('python3',['-I','-c','import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2],quality=78,method=6)',png,webp]);
  const v=crypto.createHash('sha256').update(fs.readFileSync(webp)).digest('hex').slice(0,10);
  data.towns[id]={src:'assets/atlas/towns/'+id+'.webp?v='+v,w,h,px:[w*SCALE,h*SCALE]};
  console.log(id+' ('+name+'): '+w+' x '+h+', '+Math.round(fs.statSync(webp).size/1024)+' KB');
 }
 await b.close();
 fs.writeFileSync(DATA,JSON.stringify(data));
})().catch(e=>{console.error(e);process.exit(1);});
