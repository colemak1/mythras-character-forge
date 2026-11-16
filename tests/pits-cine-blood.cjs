// The Pits cinematic stage: blood on the floor (audit docs/pits-cinematic-bug-audit-20261115.md, CA-11). The check
// failed on main before the fix. (CA-10, the fallen head in the floor, is kept as it is: owner, 2026-11-16, "the head
// going into the floor looks natural in the final product".)
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};

test('CA-11: blood on the floor fades once, by its deadline',()=>{
  const els=[];
  const mkEl=tag=>{const e={tag,attrs:{},children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attrs[k]=String(v);},
    appendChild(c){this.children.push(c);return c;},insertBefore(c){this.children.unshift(c);return c;},remove(){this.gone=true;},querySelector:()=>mkEl('g'),
    querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,right:1200,bottom:520,width:1200,height:520}),
    get firstChild(){return this.children[0]||null;},get nextSibling(){return null;},innerHTML:''};els.push(e);return e;};
  const ctx={console,Math,JSON,location:{search:''},performance:{now:()=>0},requestAnimationFrame(){},
    document:{createElementNS:(ns,t)=>mkEl(t),createElement:t=>mkEl(t)}};
  ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'experiments/pits-cine.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'experiments/pits-cine-fx.js'),'utf8'),ctx);
  const sec=mkEl('section'),svg=mkEl('svg');ctx.__sec=sec;ctx.__svg=svg;
  vm.runInContext(`var V={reduced:false};const wk={kind:'blade',len:92};
    var PS={clock:0,fig:{},M:{a:PitsCine.fighter('a',wk,false,{}),b:PitsCine.fighter('b',wk,false,{})}};
    PitsCine.place(PS.M.a,0,300,'guard');PitsCine.place(PS.M.b,0,300,'guard');
    PitsCineFx.mount(__sec,__svg,PS,450);PitsCineFx.burst([600,300],'blood',30);`,ctx);
  // 12 s of frames: nothing that landed is still there
  for(let t=0;t<12000;t+=16)vm.runInContext(`PitsCineFx.frame(${t},16,false)`,ctx);
  const all=els.filter(e=>e.attrs.class==='pc-blood'),left=all.filter(e=>!e.gone);
  assert(all.length===30,'(no blood was spilled)');
  assert.equal(left.length,0,left.length+' drops of blood still there after 12 s (each lives at most its life plus 900 ms after it lands)');
});
console.log(passed+' passed');
