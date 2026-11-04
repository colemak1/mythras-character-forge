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
console.log('Physical Dice Lab smoke tests passed: '+passed);
