// The official Mythras sheet print (js/official-sheet.js): the numbers it
// writes come from the same functions as the site's own sheet.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,WeakSet,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},body:{classList:{toggle(){},remove(){}}}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','wiki-data','wiki','sitota','render','router','play','official-sheet','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
run('render=()=>{};');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const setup=()=>run(`S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};
 S.concept.name="Aldric <the Bold>";S.concept.player="Sam";S.culture="Barbarian";S.career="Warrior";
 S.gearWeapons=["Longsword","Heater"];S.passions=[{name:"Loyalty (Clan)",type:"loyalty",start:40}];
 APPVIEW="sheet";VIEW_ONLY=false;normalizeState();`);
const data=()=>JSON.parse(run('JSON.stringify(officialSheetData())'));

test('characteristics and attributes match the site sheet',()=>{
 setup();const d=data();
 assert.deepEqual(d.chars,[13,12,13,14,13,11,10]);
 assert.equal(d.attrs[0],run('apFinal(13,14,S.fixedAP)'));
 assert.equal(d.attrs[1],run('dmCalc(13,13)'));
 assert.equal(d.attrs[3],run('healRate(12)'));
 assert.equal(d.attrs[4],run('initBonus(13,14)-armourPenaltyToInit()'));
 assert.equal(d.attrs[5],run('luckFinal(11)'));
 assert.equal(d.attrs[6],run('moveText()'));
});
test('every skill row uses finalPct, in the sheet\'s printed order',()=>{
 setup();const d=data();
 assert.equal(d.std.length,17);assert.equal(d.res.length,4);
 assert.equal(d.std[0],run('finalPct("std:Athletics")'));
 assert.equal(d.std[3],run('finalPct("std:Customs")'));
 assert.equal(d.std[16],run('finalPct("std:Unarmed")'));
 assert.equal(d.res[3],run('finalPct("std:Willpower")'));
 assert.equal(d.native,run('finalPct("std:Native Tongue")'));
 assert.equal(d.unarmed,d.std[16]);
});
test('hit locations follow the printed order with Play Mode maximums',()=>{
 setup();const d=data();
 assert.equal(d.hit.length,7);
 assert.equal(d.hit[0].max,run('playMaxHP("Head")'));
 assert.equal(d.hit[3].max,run('playMaxHP("Chest")'));
 assert.equal(d.hit[0].cur,'','undamaged: current left for pencil');
});
test('weapons split into melee (shields included) and ranged; AP/HP split',()=>{
 setup();const d=data();
 assert.deepEqual(d.melee.map(w=>w.name),['Longsword','Heater']);
 assert.equal(run('oshApHp("6/12").join("|")'),'6|12');
});
test('the filled sheet escapes text and names rows that do not fit',()=>{
 setup();run('S.passions=Array.from({length:8},(_,i)=>({name:"P"+i,type:"love",start:30}));');
 const h=run('officialSheetHtml(false)');
 assert(h.includes('Aldric &lt;the Bold&gt;'));assert(!h.includes('<the Bold>'));
 assert(h.includes('+ 2 more (see the site)'));
 assert.equal((h.match(/class="osheet-page"/g)||[]).length,2);
 assert(h.includes('assets/sheet/mythras-sheet-1.png')&&h.includes('assets/sheet/mythras-sheet-2.png'));
});
test('the blank sheet has the art and no character text',()=>{
 setup();const h=run('officialSheetHtml(true)');
 assert(!h.includes('osh-t')&&!h.includes('Aldric'));
 assert.equal((h.match(/<img /g)||[]).length,2);
});
test('the sheet view carries both print versions and the print buttons',()=>{
 setup();const h=run('officialSheetPrintHtml()+officialSheetControls()');
 assert(h.includes('data-kind="filled"')&&h.includes('data-kind="blank"'));
 assert(h.includes('printOfficialSheet(false)')&&h.includes('printOfficialSheet(true)'));
 assert(run('characterSheetBody()').includes('printOfficialSheet(false)'));
 const cloud=fs.readFileSync(path.join(root,'js/cloud.js'),'utf8');
 assert(/officialSheetPrintHtml\(\)/.test(cloud),'renderSheetView appends the print copies');
});
test('page art, blank PDF and the script are shipped',()=>{
 for(const f of ['mythras-sheet-1.png','mythras-sheet-2.png','mythras-character-sheet-blank.pdf'])
  assert(fs.statSync(path.join(root,'assets/sheet',f)).size>10000,f);
 assert(/js\/official-sheet\.js\?v=/.test(fs.readFileSync(path.join(root,'index.html'),'utf8')));
 const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
 assert(/@page\{size:A4;margin:0\}/.test(css));
});
console.log(passed+' official sheet tests passed');
