'use strict';
// Site admin (owner, 2026-11-10): the Home quote and picture for everyone,
// edited from the Account page by a site admin. Database rules are tested
// in tests/db/permissions.cjs; this covers the page.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setInterval,clearInterval,setTimeout:()=>0,clearTimeout(){},
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:()=>null,setItem(){}},
 document:{querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},removeEventListener(){},createElement:()=>({setAttribute(){},append(){}})},
 location:{hash:'#/',origin:'https://example.test',pathname:'/',assign(){}},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){}};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['combat-rules','data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app','practice']){
 let code=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')code=code.replace(/boot\(\);\s*$/,'');
 vm.runInContext(code,ctx,{filename:name+'.js'});
}
ctx.document.body={classList:{add(){},remove(){},toggle(){}},dataset:{},append(){}};
const run=s=>vm.runInContext(s,ctx);
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
const JPEG='data:image/'+'jpeg;base64,QUJD';

test('the panel shows only for a signed-in site admin',()=>{
 run('AUTH_USER={id:"u1",email:"x@example.test"};AUTH_PROFILE={id:"u1",display_name:"X"};SITE_ADMIN=false;SITE_HOME={};');
 assert.doesNotMatch(run('accountHTML()'),/Site home page/);
 run('SITE_ADMIN=true;');
 const h=run('accountHTML()');
 assert.match(h,/Site home page/);assert.match(h,/id="siteQuote"/);assert.match(h,/saveSiteHome\(\)/);
 run('AUTH_USER=null;');assert.equal(run('siteAdminPanelHTML()'),'','signed out: no panel');
});
test('Home uses the site quote and picture when no campaign quote is set',()=>{
 run('AUTH_USER=null;MOCK_AUTH=null;CAMP_CACHE=null;SITE_HOME={home:{quote:"Salt and iron.",cite:"Harbour saying",credit:"A. Painter"},hero_image:"'+JPEG+'"};');
 const h=run('sitotaHomeHTML()');
 assert.match(h,/Salt and iron\./);assert.match(h,/Harbour saying/);
 assert.match(h,new RegExp('src="'+JPEG.replace(/[+/]/g,'\\$&')+'"'));
 assert.match(h,/Art: A\. Painter\./);assert.doesNotMatch(h,/Richard Wright/,'the bundled credit goes with the bundled painting');
});
test('a campaign quote set by its GM still shows first',()=>{
 run('MOCK_AUTH={id:"guest-local"};CAMP_CACHE=[{id:"c1",name:"Red",created_at:new Date().toISOString(),rules_settings:{home:{quote:"Campaign words."}}}];');
 const h=run('sitotaHomeHTML()');
 assert.match(h,/Campaign words\./);assert.doesNotMatch(h,/Salt and iron/);
 run('MOCK_AUTH=null;CAMP_CACHE=null;');
});
test('no site settings: the title, the bundled painting and its credit',()=>{
 run('SITE_HOME={};');
 const h=run('sitotaHomeHTML()');
 assert.match(h,/st-bd-title/);assert.match(h,/assets\/sitota-hero\.webp/);assert.match(h,/Art: Richard Wright/);
});
test('only a JPEG data URL is used as the picture',()=>{
 run('SITE_HOME={hero_image:"https://evil.example/x.jpg"};');
 assert.equal(run('siteHomeSettings().image'),'');
 run('SITE_HOME={hero_image:"data:image/svg+xml;base64,PHN2Zz4="};');
 assert.equal(run('siteHomeSettings().image'),'');
});
test('while the settings load, the picture waits instead of flashing the old one',()=>{
 run('SITE_HOME=null;');
 if(run('CLOUD_ENABLED'))assert.match(run('sitotaHomeHTML()'),/st-bd-wait/);
 run('SITE_HOME={};');
});
console.log(passed+' site admin tests passed');
