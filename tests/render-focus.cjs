// Typed fields that re-render on change must not swallow the next field's
// input (live batch 2026-11-10, docs/session-zero-live-20261110.md: culture
// points typed box by box stuck at 50/100). Run with `node tests/render-focus.cjs`.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map(),timers=[],listeners={};
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setTimeout:fn=>timers.push(fn),clearTimeout(){},setInterval,clearInterval,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(t,f)=>{(listeners[t]=listeners[t]||[]).push(f);},removeEventListener(){}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app','practice']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
const test=(name,fn)=>{fn();console.log('PASS '+name);};

// A tiny page: one row of allocation boxes, rebuilt from scratch by every render.
const body={tagName:'BODY',getAttribute:()=>null};
let page=[],renders=0;
const box=key=>({tagName:'INPUT',type:'number',value:'0',attrs:{onchange:"APP.aSet('culture','"+key+"',this.value)"},
 getAttribute(k){return this.attrs[k]??null;},closest(){return this;},focus(){ctx.document.activeElement=this;},selected:false,select(){this.selected=true;}});
const keys=['std:Drive','std:Insight','std:Willpower'];
ctx.document.activeElement=body;ctx.document.body=body;ctx.document.documentElement={};
ctx.document.querySelectorAll=tag=>page.filter(n=>n.tagName===tag);
run('renderFrame=()=>{__rebuild();}');
ctx.__rebuild=()=>{renders++;const had=page.includes(ctx.document.activeElement);page=keys.map(box);
 page.forEach((n,i)=>n.value=String(run('aGet("culture",'+JSON.stringify(keys[i])+')')));
 if(had)ctx.document.activeElement=body;};
run('S=freshState();normalizeState();S.culture="Civilised";');
page=keys.map(box);

test('a typed box commits, and the render waits until focus has moved',()=>{
 const [a,b]=page;
 a.focus();a.value='10';
 ctx.event={type:'change',target:a};run('APP.aSet("culture","std:Drive","10")');ctx.event=undefined;
 assert.equal(run('aGet("culture","std:Drive")'),10,'state updates at once');
 assert.equal(renders,0,'no rebuild while focus is still moving');
 b.focus();                       // the browser moves focus to the next box
 timers.splice(0).forEach(f=>f()); // then the deferred render runs
 assert.equal(renders,1);
 assert.notEqual(ctx.document.activeElement,b,'old box is gone');
 assert.equal(ctx.document.activeElement,page[1],'focus is on the new copy of the next box');
 assert.equal(page[1].selected,true,'its value is selected so typing replaces it');
});
test('typing box after box keeps every value (was 50/100; 10/100 with Tab)',()=>{
 for(let i=1;i<keys.length;i++){
  const cur=ctx.document.activeElement;cur.value='10';
  ctx.event={type:'change',target:cur};run('APP.aSet("culture",'+JSON.stringify(keys[i])+',"10")');ctx.event=undefined;
  if(page[i+1])page[i+1].focus();else ctx.document.activeElement=body;
  timers.splice(0).forEach(f=>f());
 }
 assert.equal(run('aSum("culture")'),30);
});
test('buttons, checkboxes and selects still render at once',()=>{
 const before=renders;
 ctx.event={type:'click',target:{tagName:'BUTTON',getAttribute:()=>null}};run('render()');
 ctx.event={type:'change',target:{tagName:'INPUT',type:'checkbox'}};run('render()');
 ctx.event={type:'change',target:{tagName:'SELECT'}};run('render()');ctx.event=undefined;
 assert.equal(renders,before+3);assert.equal(timers.length,0);
});
test('several typed changes in one moment give one deferred render',()=>{
 const before=renders;
 ctx.event={type:'change',target:page[0]};run('render();render()');ctx.event=undefined;
 assert.equal(timers.length,1);timers.splice(0).forEach(f=>f());assert.equal(renders,before+1);
});
test('with the mouse, the render waits for the click, then focus goes to the pressed box',()=>{
 run('S.alloc.culture={}');page=keys.map(box);renders=0;
 const [a,b]=page;a.focus();a.value='12';
 listeners.mousedown.forEach(f=>f({target:b}));                 // press on the next box
 ctx.event={type:'change',target:a};run('APP.aSet("culture","std:Drive","12")');ctx.event=undefined;
 assert.equal(renders,0,'nothing is rebuilt under the mouse');
 b.focus();listeners.mouseup.forEach(f=>f({target:b}));          // release; the click happens here
 assert.equal(renders,0);
 timers.splice(0).forEach(f=>f());
 assert.equal(renders,1);assert.equal(ctx.document.activeElement,page[1]);assert.equal(page[1].value,'0');
 assert.equal(run('aGet("culture","std:Drive")'),12);
});
test('the "My GM approved" tick survives a re-render (Core p.218 approval)',()=>{
 run('CREATURE_PC_APPROVED=false;APP.creaturePcApproved(true)');
 assert.equal(run('CREATURE_PC_APPROVED'),true);
 assert.match(run('creaturePcPickerHTML()'),/id="creaturePcApproved" checked/);
 run('APP.creaturePcApproved(false)');
 assert.doesNotMatch(run('creaturePcPickerHTML()'),/id="creaturePcApproved" checked/);
});
