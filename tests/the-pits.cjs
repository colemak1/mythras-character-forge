'use strict';
// The Pits (owner, 2026-11-07): Practice Combat is its own top-bar tab where you
// pick a character, instead of a button on every character card.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),stored=new Map();
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setTimeout,clearTimeout,setInterval,clearInterval,
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,String(v))},
 document:{querySelector:()=>null,getElementById:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/',origin:'https://example.test',pathname:'/',assign(url){ctx.destination=url;}},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app','practice']){
 let code=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')code=code.replace(/boot\(\);\s*$/,'');
 vm.runInContext(code,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx),plain=v=>JSON.parse(JSON.stringify(v));
const main={innerHTML:''};ctx.document.body={classList:{add(){},remove(){},toggle(){}},dataset:{}};ctx.document.getElementById=id=>id==='main'?main:null;ctx.document.querySelector=s=>s==='#main'?main:null;
let passed=0;const test=async(n,f)=>{await f();passed++;console.log('PASS '+n);};
(async()=>{
await test('"The Pits" is a top-bar tab with its own route',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/<a href="#\/the-pits" data-site-view="pits"><svg[^>]*>.*?<\/svg>The Pits<\/a>/);
 assert.equal(run('parseRoute("#/the-pits").view'),'pits');
 run('AUTH_USER=null;MOCK_AUTH=null;render=()=>{};APP.toPits()');assert.equal(run('APPVIEW'),'pits');assert.equal(run('currentRoute()'),'/the-pits');
 const fight=fs.readFileSync(path.join(root,'experiments','practice-combat.html'),'utf8');
 assert.match(fight,/<header class="sitota-header">/,'the fight page carries the site header (owner, 2026-11-09)');
 assert.match(fight,/href="\.\.\/index\.html#\/the-pits" data-site-view="pits" aria-current="page"/,'with The Pits marked active');
 assert.match(fight,/id="homeLink"/,'Reset bout is kept');
});
await test('character cards no longer carry their own Practice button',()=>{
 assert.doesNotMatch(fs.readFileSync(path.join(root,'js','cloud.js'),'utf8'),/openCharToPractice/);
});
await test('signed out: the page offers sign-in and a fight without a character',()=>{
 run('AUTH_USER=null;MOCK_AUTH=null;LIB_CACHE=null;PITS_MSG="";renderPitsView()');
 assert.match(main.innerHTML,/<h1 class="pits-title">The Pits<\/h1>/);assert.match(main.innerHTML,/APP\.toAccount\(\)/);
 assert.match(main.innerHTML,/href="experiments\/practice-combat\.html">Fight without a character/);
});
await test('signed in: pick a character and enter; the chosen one is sent to the arena',async()=>{
 run('AUTH_USER={id:"user"};LIB_CACHE=[{id:"c1",name:"Kaelen"},{id:"c2",name:"Mira"}];PITS_PICK="";renderPitsView()');
 // Owner menu redesign: native radio cards replace the <select>.
 assert.match(main.innerHTML,/name="pitsPick" value="c1" checked/);assert.match(main.innerHTML,/name="pitsPick" value="c2" onchange/);
 run('var __opened=null;APP.openCharToPractice=id=>{__opened=id;};APP.pitsPick("c2");APP.enterPits()');
 assert.equal(run('__opened'),'c2');
 run('LIB_CACHE=[];renderPitsView()');assert.match(main.innerHTML,/no saved characters yet/);assert.match(main.innerHTML,/Fight without a character/);
});
await test('the arena is named The Pits and links back to it',()=>{
 const page=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8');
 assert.match(page,/<title>The Pits — Sit’ota<\/title>/);assert.match(page,/<h1>The Pits<\/h1>/);
 assert.doesNotMatch(page,/Practice Combat/);assert.doesNotMatch(page.match(/<div class="pits-subbar">[\s\S]*?<\/div>/)[0],/#\/my-characters/,"the back link goes to The Pits, not My Characters");
 assert.match(page,/href="\.\.\/index\.html#\/the-pits"/);
});
await test('any Core melee weapon a character carries goes to the arena, not just the original five',()=>{
 run(`var a=freshState();a.concept.name='Axe';a.chars={STR:13,CON:12,SIZ:14,DEX:15,INT:14,POW:11,CHA:10};a.cultStyleOn=true;a.cultStyleName='Axes';
  a.styleDefs['style:cult']={weapons:['Battleaxe','Kite','Long bow'],traits:[]};a.gearWeapons=['Battleaxe','Kite','Long bow','Lance'];
  var pr=practiceSnapshot({id:'x',ownerId:'user',state:a});`);
 assert.deepEqual(JSON.parse(run('JSON.stringify(pr.styles[0].weapons)')),[{name:'Battleaxe',key:'battleaxe'}]);
 assert.deepEqual(JSON.parse(run('JSON.stringify(pr.styles[0].shields)')),[{name:'Kite',key:'kite'}]);
 assert.deepEqual(JSON.parse(run('JSON.stringify(pr.unsupportedGear)')),['Long bow','Lance']);
});
await test('a weapon the style trains can be practised even when the character does not carry it',()=>{
 run(`var c=freshState();c.concept.name='Unarmed kit';c.chars={STR:13,CON:12,SIZ:14,DEX:15,INT:14,POW:11,CHA:10};c.cultStyleOn=true;c.cultStyleName='Spear and shield';
  c.styleDefs['style:cult']={weapons:['Longspear','Viking','Shortsword'],traits:[]};c.gearWeapons=['Shortsword'];
  var pc=practiceSnapshot({id:'y',ownerId:'user',state:c});`);
 assert.deepEqual(JSON.parse(run('JSON.stringify(pc.styles[0].weapons)')),[{name:'Shortsword',key:'shortsword'},{name:'Longspear',key:'longspear'}],'carried first');
 assert.deepEqual(JSON.parse(run('JSON.stringify(pc.styles[0].shields)')),[{name:'Viking',key:'viking'}]);
 assert.deepEqual(JSON.parse(run('JSON.stringify(pc.unsupportedGear)')),[]);
});
console.log(passed+' The Pits tests passed');
})().catch(e=>{console.error(e);process.exit(1);});
