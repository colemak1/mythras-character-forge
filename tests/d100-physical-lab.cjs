'use strict';
// node tests/d100-physical-lab.cjs
// Source-level smoke checks; interactive 3D rendering requires a real browser.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../experiments/d100-physical-lab.html'),'utf8');
const js=fs.readFileSync(path.join(__dirname,'../experiments/d100-physical-lab.js'),'utf8');
const geometrySource=js.match(/function facetedHundred\(\)\s*\{[\s\S]*?\n\}/)?.[0];
assert.ok(geometrySource,'100-facet geometry available');
const model=new Function(geometrySource+'\nreturn facetedHundred();')();
let passed=0;
function check(name,test){assert.ok(test,name);console.log('PASS',name);passed++;}
check('True d100 has exactly 100 faces',model.faces.length===100);
check('It has 98 four-sided facets and two cap facets',model.faces.filter(x=>x.length===4).length===98&&model.faces.filter(x=>x.length===14).length===2);
check('All numbered faces are unique',new Set(model.faces.map(f=>f.join(','))).size===100);
check('All vertices exist',model.faces.every(f=>f.every(v=>v>=0&&v<model.vertices.length)));
const sub=(p,q)=>p.map((x,i)=>x-q[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
const length=v=>Math.sqrt(dot(v,v));
check('All quad facets are planar to within one hundredth millimeter',model.faces.slice(0,98).every(f=>{
 const p=f.map(i=>model.vertices[i]),n=cross(sub(p[1],p[0]),sub(p[2],p[0]));
 return Math.abs(dot(n,sub(p[3],p[0])))/length(n)<.00001;
}));
check('Each face has nonzero area',model.faces.every(f=>{
 const p=f.map(i=>model.vertices[i]);
 return length(cross(sub(p[1],p[0]),sub(p[2],p[0])))>.00001;
}));
check('Second variant is explicitly an icosahedron with 20 faces',js.includes('new THREE.IcosahedronGeometry(1.14,0)')&&js.includes("if(faces.length!==20)"));
check('Both variants use 3D rendering',js.includes('new THREE.WebGLRenderer')&&js.includes('new THREE.MeshPhysicalMaterial'));
check('Both variants use actual rigid body physics',js.includes('new CANNON.World')&&js.includes('new CANNON.ConvexPolyhedron')&&js.includes('this.world.step('));
check('A single result is shared between both rollers',js.includes('function rollBoth(n){const roll=n??uniformD100();for(const die of instances.values())die.throw(roll);}'));
check('The sample is unbiased when Web Crypto is present',js.includes('Math.floor(4294967296 / 100) * 100')&&js.includes('a[0] % 100 + 1'));
check('One and one hundred edge cases are user-selectable',html.includes('id="force-one"')&&html.includes('id="force-hundred"'));
check('Each die can be rolled and selected independently',html.includes('data-roll="hundred"')&&html.includes('data-roll="poly"')&&html.includes('data-pick="hundred"')&&html.includes('data-pick="poly"'));
check('Renderings stay separate from Practice Combat',!js.includes('practice-combat-ux.css')&&html.includes('Standalone experiment'));
check('Module imports resolve through the page import map',html.includes('"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"')&&html.includes('"cannon-es":"https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js"'));
const noImports=js.replace(/^import.*?;\s*$/gm,'');new Function('THREE','CANNON',noImports);
check('3D renderer source parses',true);

/* Physical 2d10 addition: verify actual convex 10-face solids and 1..100 math. */
class V3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
 sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
 cross(v){const {x,y,z}=this;this.x=y*v.z-z*v.y;this.y=z*v.x-x*v.z;this.z=x*v.y-y*v.x;return this;}
 dot(v){return this.x*v.x+this.y*v.y+this.z*v.z;}
 normalize(){const n=Math.hypot(this.x,this.y,this.z);if(n===0)throw Error('Zero normal');this.x/=n;this.y/=n;this.z/=n;return this;}
 divideScalar(n){this.x/=n;this.y/=n;this.z/=n;return this;}
 toArray(){return [this.x,this.y,this.z];}
}
const sourceFunction=name=>{
 const match=js.match(new RegExp('function '+name+'\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}'));
 assert.ok(match,'Missing '+name+' source');
 return match[0];
};
const d10=new Function('THREE',sourceFunction('qFaceNormal')+'\n'+
 sourceFunction('d10Trapezohedron')+'\nreturn d10Trapezohedron();')({Vector3:V3});
check('Each percentile die has ten distinct kite faces',d10.faces.length===10&&
 d10.vertices.length===12&&
 new Set(d10.faces.map(f=>f.join(':'))).size===10&&
 d10.faces.every(f=>f.length===4));
check('Ten-sided geometry has planar facets',d10.faces.every(f=>{
 const p=f.map(i=>d10.vertices[i]),n=cross(sub(p[1],p[0]),sub(p[2],p[0]));
 return Math.abs(dot(n,sub(p[3],p[0])))/length(n)<1e-6;
}));
check('Every d10 facet is convex and its winding faces outward',d10.faces.every(f=>{
 const p=f.map(i=>d10.vertices[i]),n=cross(sub(p[1],p[0]),sub(p[2],p[0]));
 const center=p.reduce((a,b)=>a.map((v,i)=>v+b[i]),[0,0,0]).map(v=>v/4);
 return dot(n,center)>0&&d10.vertices.every(v=>dot(n,sub(v,p[0]))<1e-5);
}));
const math=new Function(sourceFunction('splitPercentile')+'\n'+
 sourceFunction('combinePercentile')+'\nreturn {splitPercentile,combinePercentile};')();
check('Every possible d100 result splits and recombines exactly',Array.from({length:100},(_,i)=>i+1)
 .every(n=>{const d=math.splitPercentile(n);return math.combinePercentile(d.tens,d.ones)===n;}));
check('Double zero represents 100, not 0',
 math.splitPercentile(100).tensLabel==='00'&&math.splitPercentile(100).onesLabel==='0'&&
 math.combinePercentile(0,0)===100);
check('01 and other single-digit results have tens 00',
 math.splitPercentile(1).tensLabel==='00'&&math.splitPercentile(1).onesLabel==='1'&&
 math.splitPercentile(7).tens===0&&math.splitPercentile(7).ones===7);
check('30 plus 0 represents 30 and 90 plus 9 represents 99',
 math.combinePercentile(30,0)===30&&math.combinePercentile(90,9)===99);
check('Percentile helpers reject malformed input',(()=>{try{math.splitPercentile(101);return false}catch{}
 try{math.combinePercentile(15,8);return false}catch{}return true;})());
check('Two additional rigid dice exist within each physics scene',
 js.includes("this.parts=[")&&js.includes("{key:'tens'")&&js.includes("{key:'ones'")&&
 js.includes("addPercentileBody(this.world,tensModel)")&&
 js.includes("addPercentileBody(this.world,onesModel)"));
check('Both d10 faces are oriented to match the sampled result',
 js.includes("result.tens/10")&&js.includes("result.ones")&&
 js.includes("new THREE.Quaternion().setFromUnitVectors"));
check('All three rigid bodies are stepped and settled together',
 js.includes("for(const p of this.parts)")&&js.includes("this.world.step(1/90")&&
 js.includes("p.visual.group.position.copy(p.pose.position)"));
check('Both scenes reveal floating correct values after settling',
 ['hundred','poly'].every(id=>html.includes('id="floating-'+id+'"')&&html.includes('id="breakdown-'+id+'"'))&&
 js.includes("label.classList.add('show')")&&js.includes("classList.remove('show')"));
check('Each style is selectable and communicates pressed state',
 ['minimal','brass','referee','paper'].every(style=>html.includes('data-presentation="'+style+'"')&&
 js.includes("'"+style+"'"))&&js.includes("button.setAttribute('aria-pressed'"));
check('Four styles update real dice material colors as well as overlays',
 js.includes("p.visual.material.color.setHex(colors[p.key])")&&
 ['minimal','brass','referee','paper'].every(style=>html.includes('main[data-presentation="'+style+'"] .floating-result')));
check('The style choice can persist without altering Practice Combat',
 js.includes("localStorage.setItem('sitota-physical-die-style'")&&
 html.includes('Practice Combat is unchanged'));

console.log('Physical Dice Lab smoke tests passed: '+passed);
