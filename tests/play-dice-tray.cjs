// Play Mode roll tray: each new roll shows once in the dice tray; the saved
// roll log restored on load never replays, and the dice never change a result.
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
ctx.__shown=shown;run('pmDiceShow=r=>__shown.push(r.label+" "+r.roll+" "+r.tier);render=()=>pmDiceSync();');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};

test('a saved roll log restored on load does not replay',()=>{
 run('S=freshState();S.rollLog=[{label:"Athletics",pct:50,roll:12,tier:"Success"}];pmDiceSync();pmDiceSync();');
 assert.deepEqual(shown,[]);
});
test('a new roll shows once, with the logged result',()=>{
 run('S.chars={STR:13,CON:12,SIZ:13,DEX:14,INT:13,POW:11,CHA:10};');
 const before=run('S.rollLog.length');
 run('APP.roll("std:Athletics")');
 assert.equal(run('S.rollLog.length'),before+1);
 const r=JSON.parse(run('JSON.stringify(S.rollLog[0])'));
 assert.equal(shown.length,1);
 assert.equal(shown[0],r.label+' '+r.roll+' '+r.tier,'the tray shows exactly the logged roll');
 run('pmDiceSync();pmDiceSync();');
 assert.equal(shown.length,1,'re-rendering does not replay the same roll');
});
test('loading another character resets without replaying its log',()=>{
 run('S=freshState();S.rollLog=[{label:"Evade",pct:40,roll:88,tier:"Failure"}];pmDiceSync();');
 assert.equal(shown.length,1);
});
test('the animated-dice preference is remembered per browser',()=>{
 run('pmToggleDice3d(false)');assert.equal(store.get('pm-dice-3d'),'off');assert.equal(run('pmDiceAnimated()'),false);
 run('pmToggleDice3d(true)');assert.equal(store.get('pm-dice-3d'),'on');
});
test('the tray loads the Practice Combat dice module from the site root',()=>{
 const src=fs.readFileSync(path.join(root,'js','play.js'),'utf8');
 assert.match(src,/import\("\.\.\/experiments\/practice-dice\.mjs/,'dynamic import resolves relative to js/play.js');
 assert(fs.existsSync(path.join(root,'experiments','practice-dice.mjs')));
});
console.log(passed+' play dice tray tests passed');
