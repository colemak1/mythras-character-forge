// Play Mode skills search and pins, and Body tab rows (redesign batch 4).
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
run('render=()=>{};');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const setup=()=>run('S=freshState();S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};APPVIEW="play";VIEW_ONLY=false;normalizeState();');

test('pinning a skill adds a Pinned group at the top; unpinning removes it',()=>{
 setup();assert.doesNotMatch(run('pmSkillsPanelHTML()'),/<h4>Pinned<\/h4>/);
 run('APP.playTogglePin("std:Perception")');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.play.pinned)')),['std:Perception']);
 const h=run('pmSkillsPanelHTML()');
 assert(h.indexOf('<h4>Pinned</h4>')<h.indexOf('<h4>Standard</h4>'),'Pinned comes first');
 const pinnedBlock=h.slice(h.indexOf('<h4>Pinned</h4>'),h.indexOf('<h4>Standard</h4>'));
 assert.match(pinnedBlock,/Perception/);assert.doesNotMatch(pinnedBlock,/Athletics/);
 run('APP.playTogglePin("std:Perception")');assert.equal(run('S.play.pinned.length'),0);
});
test('pins survive a save and reload, and bad saved values are cleaned',()=>{
 setup();run('APP.playTogglePin("std:Stealth")');
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.play.pinned)')),['std:Stealth']);
 run('S.play.pinned=["std:Stealth","std:Stealth",42,null];normalizeState();');
 assert.deepEqual(JSON.parse(run('JSON.stringify(S.play.pinned)')),['std:Stealth']);
 run('delete S.play.pinned;normalizeState();');assert.equal(run('Array.isArray(S.play.pinned)'),true);
});
test('only real skills can be pinned, and not from a read-only view',()=>{
 setup();run('APP.playTogglePin("std:NoSuchSkill");APP.playTogglePin({})');assert.equal(run('S.play.pinned.length'),0);
 run('VIEW_ONLY=true;APP.playTogglePin("std:Perception");VIEW_ONLY=false;');assert.equal(run('S.play.pinned.length'),0);
});
test('every skill row is searchable by name and formula',()=>{
 setup();const h=run('pmSkillsPanelHTML()');
 assert.match(h,/class="pmx-skillsearch"/);
 assert.match(h,/data-search="athletics str\+dex"/);
});
test('location rows show an HP bar, the d20 range and the wound status as a word',()=>{
 setup();run('S.play.hp={"Chest":2}');
 const row=run('pmLocRow("Chest")');const max=run('playMaxHP("Chest")');
 assert.match(row,new RegExp('width:'+Math.round(2/max*100)+'%'));
 assert.match(row,/class="pmx-wd minor">Minor</,'wound level is a word, not only a colour');
 assert.match(row,/Chest <small>10–12<\/small>/,'d20 hit-location range');
 assert.match(run('pmLocRow("Head")'),/width:100%/);
});
console.log(passed+' play skills and body tests passed');
