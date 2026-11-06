// Hazards and recovery notes (Core pp.68, 71, 74–80), source-checked in
// docs/advancement-hazard-notes-review.md.
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
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const h=run('pmHazardsHTML()');
test('S4-HN01 acid table: Weak 1d2/1 round, Strong 1d4/1d2, Concentrated 1d6/1d3; armour loses AP first (p.68)',()=>{
 assert.match(h,/Weak<\/td><td>1d2<\/td><td>1 round/);assert.match(h,/Strong<\/td><td>1d4<\/td><td>1d2 rounds/);assert.match(h,/Concentrated<\/td><td>1d6<\/td><td>1d3 rounds/);
 assert.match(h,/loses Armour Points/);assert.match(h,/immersion does damage every round/);
});
test('S4-HN02/HN03 asphyxiation results and recovery (p.71)',()=>{
 assert.match(h,/a critical adds no Fatigue, a success one level, a failure 1d2 levels, a fumble 1d3/);assert.match(h,/one Fatigue level per minute/);
});
test('S4-HN04 blood loss causes and recovery (p.71)',()=>{assert.match(h,/Bleed Special Effect, a Major Wound, or a bleeding disease or poison/);assert.match(h,/one level per day, starting the next day/);});
test('S4-HN05/HN06 disease and poison: exposure or onset, the specific cure, named Conditions (pp.74–75)',()=>{
 assert.match(h,/at exposure or at onset/);assert.match(h,/listed antidote or cure/);assert.doesNotMatch(h,/A successful treatment prevents further conditions/);assert.match(h,/Fever makes all skills Hard/);
});
test('S4-HN07/HN08 fall table, SIZ, Acrobatics, soft ground, vehicles (p.78)',()=>{
 for(const re of [/1m or less<\/td><td>None/,/2–5m<\/td><td>1d6 to one location/,/6–10m<\/td><td>2d6 to two/,/11–15m<\/td><td>3d6 to three/,/16–20m<\/td><td>4d6 to four/,/Each \+5m<\/td><td>\+1d6/])assert.match(h,re);
 assert.match(h,/above SIZ 20, add 1d6 per 10 points/);assert.match(h,/SIZ 9 or less/);assert.match(h,/2m shorter/);assert.match(h,/half the fall height/);
});
test('S4-HN09 fire intensity table, locations, ignition and spread (p.79)',()=>{
 for(const re of [/1 \(candle\)<\/td><td>1d2<\/td><td>1d4 rounds/,/2 \(torch\)<\/td><td>1d4<\/td><td>1d3 rounds/,/3 \(campfire\)<\/td><td>1d6<\/td><td>1d2 rounds/,/4 \(room ablaze\)<\/td><td>2d6<\/td><td>1d2 rounds/,/5 \(lava\)<\/td><td>3d6<\/td><td>Instantly/])assert.match(h,re);
 assert.match(h,/3–4 the nearest 1d4\+1; 5 all of them/);assert.match(h,/flammable material/);
});
test('S4-HN10/HN11 exertion thresholds and sleep (pp.78–79)',()=>{
 assert.match(h,/<b>Light<\/b> effort, CON hours, Very Easy; <b>Medium<\/b>, CON minutes, Easy; <b>Strenuous<\/b>, CON seconds/);assert.match(h,/twice CON hours/);
});
test('S4-HN12..HN14 healing intervals, treatment, maiming, strenuous 1d3, magic limits (p.80)',()=>{
 assert.match(h,/<b>day<\/b> \(Minor\), <b>week<\/b> \(Serious\) or <b>month<\/b> \(Major\)/);assert.match(h,/Healing skill ÷ 20/);assert.match(h,/by 1d3/);assert.match(h,/doesn't by itself cure suffocation, poison or disease/);
});
console.log(passed+' hazard note tests passed');
