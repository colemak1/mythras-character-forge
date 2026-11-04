import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Physical Dice Lab: completely separate from the Mythras rules and combat engine.
// The value is sampled uniformly first; the tumble is presentation and the final
// face is guided to match that sampled value. Never use a frame as the RNG.
const $ = id => document.getElementById(id);
const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
const UP = new THREE.Vector3(0,1,0);
const instances = new Map();
let chosen = '';
try { chosen = localStorage.getItem('sitota-physical-die-choice') || ''; } catch {}
let lastFrame = performance.now();

function uniformD100() {
  if (globalThis.crypto?.getRandomValues) {
    const a = new Uint32Array(1);
    const cutoff = Math.floor(4294967296 / 100) * 100;
    do { crypto.getRandomValues(a); } while (a[0] >= cutoff);
    return a[0] % 100 + 1;
  }
  return Math.floor(Math.random() * 100) + 1;
}

function qFaceNormal(vertices, face) {
  const a = new THREE.Vector3(...vertices[face[0]]);
  const b = new THREE.Vector3(...vertices[face[1]]);
  const c = new THREE.Vector3(...vertices[face[2]]);
  return b.sub(a).cross(c.sub(new THREE.Vector3(...vertices[face[0]]))).normalize();
}

function facetedHundred() {
  // 8 latitude rings, 14 vertices in each ring:
  // 7*14 quadrilateral sides + two 14-gonal caps = exactly 100 faces.
  const z=[-.96,-.83,-.62,-.30,.30,.62,.83,.96];
  const seg=14;
  const v=[];
  for(const y of z) {
    const r=1.13*Math.sqrt(1-y*y);
    for(let j=0;j<seg;j++) {
      const angle=j*2*Math.PI/seg;
      v.push([r*Math.cos(angle),y*1.13,r*Math.sin(angle)]);
    }
  }
  const faces=[];
  for(let i=0;i<z.length-1;i++) {
    for(let j=0;j<seg;j++) {
      const k=(j+1)%seg;
      faces.push([i*seg+j,i*seg+k,(i+1)*seg+k,(i+1)*seg+j]);
    }
  }
  faces.push(Array.from({length:seg},(_,j)=>seg-1-j));
  faces.push(Array.from({length:seg},(_,j)=>(z.length-1)*seg+j));
  if(faces.length!==100)throw Error('Incorrect hundred-face model');
  return {vertices:v,faces};
}

function polyTwenty() {
  const geo=new THREE.IcosahedronGeometry(1.14,0);
  const p=geo.getAttribute('position');
  const vertices=[];
  const ids=new Map();
  const faces=[];
  const idx=(x,y,z)=>{
    const key=[x,y,z].map(n=>n.toFixed(5)).join(',');
    if(!ids.has(key)){ids.set(key,vertices.length);vertices.push([x,y,z]);}
    return ids.get(key);
  };
  for(let i=0;i<p.count;i+=3){
    const face=[];
    for(let j=0;j<3;j++)face.push(idx(p.getX(i+j),p.getY(i+j),p.getZ(i+j)));
    faces.push(face);
  }
  geo.dispose();
  if(faces.length!==20)throw Error('Incorrect twenty-face model');
  return {vertices,faces};
}


/* A mathematically planar pentagonal trapezohedron (10 kite-shaped faces).
   Even faces are tens (00,10,...90), odd die uses units (0,...9). */
function d10Trapezohedron(){
  const radius=.52,offset=.059;
  const apex=offset*(1+Math.cos(Math.PI/5))/(1-Math.cos(Math.PI/5));
  const vertices=Array.from({length:10},(_,j)=>{
    const angle=j*Math.PI/5;
    return [radius*Math.cos(angle),j%2===0?offset:-offset,radius*Math.sin(angle)];
  });
  vertices.push([0,apex,0],[0,-apex,0]);
  const faces=[];
  for(let j=0;j<10;j+=2)faces.push([10,j,(j+1)%10,(j+2)%10]);
  for(let j=1;j<10;j+=2)faces.push([11,j,(j+1)%10,(j+2)%10]);
  // ConvexPolyhedron requires outward winding. Three.js uses this too.
  for(const face of faces){
    const n=qFaceNormal(vertices,face);
    const center=new THREE.Vector3();
    for(const i of face)center.add(new THREE.Vector3(...vertices[i]));
    center.divideScalar(face.length);
    if(n.dot(center)<0)face.reverse();
  }
  return {vertices,faces};
}
function splitPercentile(value){
  const n=Number(value);
  if(!Number.isInteger(n)||n<1||n>100)throw Error('d100 result must be 1..100');
  const normalized=n===100?0:n;
  const tens=Math.floor(normalized/10)*10,ones=normalized%10;
  return {tens,ones,tensLabel:String(tens).padStart(2,'0'),onesLabel:String(ones)};
}
function combinePercentile(tens,ones){
  if(!Number.isInteger(tens)||tens<0||tens>90||tens%10!==0||
     !Number.isInteger(ones)||ones<0||ones>9)throw Error('Invalid percentile dice');
  const n=tens+ones;return n===0?100:n;
}

function numberTexture(text,metal=false,ink=null) {
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,256,256);
  ctx.fillStyle=ink||(metal?'#e8d3ac':'#f7e7c6');
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 126px Georgia, serif';
  ctx.fillText(String(text),128,135,236);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}

function makeGeometry(spec,id){
  const {vertices,faces}=spec;
  const buf=[];
  const edgeMap=new Map();
  const faceData=[];
  const obj=new THREE.Group();
  const metal=id==='poly',isTens=id==='tens',isOnes=id==='ones',pair=isTens||isOnes;
  for(let i=0;i<faces.length;i++){
    let face=faces[i];
    let normal=qFaceNormal(vertices,face);
    const center=new THREE.Vector3();
    for(const n of face)center.add(new THREE.Vector3(...vertices[n]));
    center.divideScalar(face.length);
    if(normal.dot(center)<0){face=[...face].reverse();normal.negate();}
    faceData.push({normal,center,indices:face});
    for(let j=0;j<face.length;j++){
      const a=new THREE.Vector3(...vertices[face[j]]),b=new THREE.Vector3(...vertices[face[(j+1)%face.length]]);
      buf.push(...center.toArray(),...a.toArray(),...b.toArray());
      const i0=Math.min(face[j],face[(j+1)%face.length]),i1=Math.max(face[j],face[(j+1)%face.length]);
      edgeMap.set(i0+':'+i1,[i0,i1]);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(buf,3));
  geo.computeVertexNormals();
  const material=new THREE.MeshPhysicalMaterial({
    color:isTens?0x335449:isOnes?0xd8c9ab:metal?0x756a56:0x254e42,
    metalness:metal?.82:pair?.12:.18,roughness:metal?.31:pair?.32:.38,
    clearcoat:metal?.22:.62,clearcoatRoughness:.29,
    side:THREE.FrontSide
  });
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;
  obj.add(mesh);
  const lines=[];
  for(const [i0,i1] of edgeMap.values())lines.push(...vertices[i0],...vertices[i1]);
  const edgeGeo=new THREE.BufferGeometry();edgeGeo.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
  const edges=new THREE.LineSegments(edgeGeo,new THREE.LineBasicMaterial({color:metal?0xc1ad86:isOnes?0x92785b:0x6e9a83,transparent:true,opacity:metal?.70:pair?.68:.53}));
  obj.add(edges);
  const decalGeometries=[],decalTextures=[];
  if(id==='hundred'||pair){
    for(let i=0;i<faceData.length;i++){
      const f=faceData[i];
      const faceLabel=id==='hundred'?i+1:isTens?String(i*10).padStart(2,'0'):String(i);
      const tex=numberTexture(faceLabel,false,isOnes?'#483b2e':null);decalTextures.push(tex);
      const edgeSizes=f.indices.map((ind,j)=>new THREE.Vector3(...vertices[ind]).distanceTo(new THREE.Vector3(...vertices[f.indices[(j+1)%f.indices.length]])));
      const size=Math.max(id==='hundred'?.12:.115,Math.min(id==='hundred'?.42:.30,Math.min(...edgeSizes)*(pair?.65:.82)));
      const labelGeo=new THREE.PlaneGeometry(size,size);decalGeometries.push(labelGeo);
      const label=new THREE.Mesh(labelGeo,new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
      label.position.copy(f.center).addScaledVector(f.normal,.008);
      label.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),f.normal);
      label.renderOrder=1;obj.add(label);
    }
  } else {
    // The d20 is intentionally unnumbered; read the full 1–100 result below it.
    for(let i=0;i<faceData.length;i++){
      const f=faceData[i];
      const geo2=new THREE.RingGeometry(.018,.026,16);decalGeometries.push(geo2);
      const mark=new THREE.Mesh(geo2,new THREE.MeshBasicMaterial({color:0xe0ca9e,transparent:true,opacity:.76,side:THREE.DoubleSide}));
      mark.position.copy(f.center).addScaledVector(f.normal,.01);
      mark.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),f.normal);
      mark.renderOrder=1;obj.add(mark);
    }
  }
  return {group:obj,vertices,faces:faceData,geometry:geo,edgeGeometry:edgeGeo,material,edgeMaterial:edges.material,decalGeometries,decalTextures};
}

function tabletopTexture(){
  const c=document.createElement('canvas');c.width=c.height=512;
  const x=c.getContext('2d');x.fillStyle='#373e32';x.fillRect(0,0,512,512);
  let seed=24681357;
  function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  for(let i=0;i<6500;i++){
    const v=Math.floor(45+rand()*34);
    x.fillStyle='rgba('+v+','+(v+5)+','+(v-3)+','+(rand()*.17)+')';
    x.fillRect(rand()*512,rand()*512,rand()*4+.3,rand()*2+.3);
  }
  for(let k=0;k<18;k++){
    x.strokeStyle='rgba(19,23,18,.06)';x.lineWidth=.6;
    x.beginPath();let y=rand()*512;x.moveTo(0,y);x.bezierCurveTo(180,y+rand()*12,360,y-rand()*9,512,y+rand()*8);x.stroke();
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.4,1.4);return t;
}

function newWorld(spec){
  const world=new CANNON.World({gravity:new CANNON.Vec3(0,-21,0)});
  world.allowSleep=true;
  world.solver.iterations=18;
  world.defaultContactMaterial.friction=.53;
  world.defaultContactMaterial.restitution=.18;
  const floor=new CANNON.Body({mass:0,shape:new CANNON.Plane()});
  floor.quaternion.setFromEuler(-Math.PI/2,0,0);floor.position.y=0;
  world.addBody(floor);
  function wall(x,z,hx,hz){
    const w=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(hx,.58,hz))});
    w.position.set(x,.38,z);world.addBody(w);
  }
  wall(-2.5,0,.09,2.55);wall(2.5,0,.09,2.55);
  wall(0,-2.5,2.55,.09);wall(0,2.5,2.55,.09);
  const verts=spec.vertices.map(v=>new CANNON.Vec3(v[0],v[1],v[2]));
  const shape=new CANNON.ConvexPolyhedron({vertices:verts,faces:spec.faces.map(face=>[...face.indices])});
  const body=new CANNON.Body({mass:1.7,shape,linearDamping:.22,angularDamping:.26,allowSleep:true,sleepSpeedLimit:.1,sleepTimeLimit:.75});
  world.addBody(body);
  return {world,body};
}


function addPercentileBody(world,model){
  const vertices=model.vertices.map(v=>new CANNON.Vec3(...v));
  const shape=new CANNON.ConvexPolyhedron({vertices,faces:model.faces.map(f=>[...f.indices])});
  const body=new CANNON.Body({
    mass:.58,shape,linearDamping:.24,angularDamping:.29,
    allowSleep:true,sleepSpeedLimit:.1,sleepTimeLimit:.75
  });
  world.addBody(body);return body;
}

class DieStage {
  constructor(id){
    this.id=id;
    this.stage=$('stage-'+id);
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x1c241e);
    this.scene.fog=new THREE.Fog(0x1c241e,9,17);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.4;
    this.stage.querySelector('.stage-fallback')?.remove();
    this.stage.insertBefore(this.renderer.domElement,this.stage.firstChild);
    this.camera=new THREE.PerspectiveCamera(36,1,.08,65);
    this.yaw=.55;this.pitch=.48;this.distance=6.4;
    this.updateCamera();
    this.scene.add(new THREE.HemisphereLight(0xe9e2cb,0x1b2c20,2.2));
    const key=new THREE.DirectionalLight(0xffdfb4,3.15);key.position.set(-3.8,6,4.8);
    key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-4;key.shadow.camera.right=4;
    key.shadow.camera.top=4;key.shadow.camera.bottom=-4;key.shadow.camera.near=.5;key.shadow.camera.far=17;
    key.shadow.bias=-.0003;this.scene.add(key);
    const rim=new THREE.DirectionalLight(0xbac9c1,.82);rim.position.set(4,3,-5);this.scene.add(rim);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({map:tabletopTexture(),color:0xb0b09b,roughness:.98,metalness:0}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;this.scene.add(floor);
    const border=new THREE.Mesh(new THREE.BoxGeometry(5.25,.13,5.25),new THREE.MeshStandardMaterial({color:0x242b23,roughness:1}));
    border.position.y=-.13;border.receiveShadow=true;this.scene.add(border);
    this.spec=id==='hundred'?facetedHundred():polyTwenty();
    this.visual=makeGeometry(this.spec,id);
    this.scene.add(this.visual.group);
    const phy=newWorld(this.visual);
    this.world=phy.world;this.body=phy.body;
    // Three distinct rigid bodies: original centerpiece + two actual d10s.
    const pairSpec=d10Trapezohedron();
    const tensModel=makeGeometry(pairSpec,'tens'),onesModel=makeGeometry(pairSpec,'ones');
    this.scene.add(tensModel.group,onesModel.group);
    const tensBody=addPercentileBody(this.world,tensModel);
    const onesBody=addPercentileBody(this.world,onesModel);
    this.parts=[
      {key:'hero',visual:this.visual,body:this.body,x:0,z:-1.16},
      {key:'tens',visual:tensModel,body:tensBody,x:-1.10,z:.94},
      {key:'ones',visual:onesModel,body:onesBody,x:1.10,z:.94}
    ];
    this.percentile={tens:this.parts[1],ones:this.parts[2]};
    this.value=null;this.running=false;
    for(const part of this.parts){
      const height=part.key==='hero'?1.17:.62;
      part.body.position.set(part.x,height,part.z);part.body.sleep();
      part.visual.group.position.set(part.x,height,part.z);
    }
    this.resizeObserver=window.ResizeObserver?new ResizeObserver(()=>this.resize()):null;
    this.resizeObserver?.observe(this.stage);this.resize();
    this.installPointerDrag();
  }
  updateCamera(){
    const y=Math.sin(this.pitch)*this.distance;
    const ground=Math.cos(this.pitch)*this.distance;
    this.camera.position.set(ground*Math.sin(this.yaw),y,ground*Math.cos(this.yaw));
    this.camera.lookAt(0,.65,0);
  }
  resetView(){this.yaw=.55;this.pitch=.48;this.distance=6.4;this.updateCamera();}
  installPointerDrag(){
    let dragging=false,px=0,py=0;
    const canvas=this.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{dragging=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture?.(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{
      if(!dragging)return;
      this.yaw+=(e.clientX-px)*.006;
      this.pitch=Math.max(.22,Math.min(1.22,this.pitch-(e.clientY-py)*.006));
      px=e.clientX;py=e.clientY;this.updateCamera();
    });
    const stop=()=>dragging=false;
    canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=Math.max(4.1,Math.min(9.4,this.distance+Math.sign(e.deltaY)*.4));this.updateCamera();},{passive:false});
  }
  resize(){
    const rect=this.stage.getBoundingClientRect();
    const w=Math.max(300,Math.round(rect.width));const h=Math.max(270,Math.round(rect.height));
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  }
  setResult(n){
    const dice=splitPercentile(n),combined=combinePercentile(dice.tens,dice.ones);
    if(combined!==n)throw Error('Percentile dice must match the result');
    $('number-'+this.id).textContent=String(n).padStart(2,'0');
    $('breakdown-'+this.id).textContent=dice.tensLabel+' + '+dice.onesLabel+' = '+n;
    const t=validTarget();
    $('target-'+this.id).textContent='Target '+t+'%';
    const grade=$('grade-'+this.id);
    grade.textContent=n<=t?'Within target':'Above target';
    grade.className=n<=t?'pass':'fail';
    const label=$('floating-'+this.id);
    label.querySelector('.float-number').textContent=String(n).padStart(2,'0');
    label.querySelector('.float-math').textContent=dice.tensLabel+' + '+dice.onesLabel+' = '+n;
    label.classList.add('show');
  }
  faceUpPose(part,index){
    const face=part.visual.faces[index];
    if(!face)throw Error('Missing numbered d10 face '+index);
    const align=new THREE.Quaternion().setFromUnitVectors(face.normal.clone().normalize(),UP);
    const spin=new THREE.Quaternion().setFromAxisAngle(UP,Math.random()*2*Math.PI);
    const quat=spin.multiply(align);
    const minY=Math.min(...part.visual.vertices.map(v=>new THREE.Vector3(...v).applyQuaternion(quat).y));
    return {quat,position:new THREE.Vector3(part.x,-minY+.025,part.z)};
  }
  prepareTarget(n){
    const result=splitPercentile(n);
    this.parts[0].pose=this.faceUpPose(this.parts[0],this.id==='hundred'?n-1:(n-1)%20);
    this.percentile.tens.pose=this.faceUpPose(this.percentile.tens,result.tens/10);
    this.percentile.ones.pose=this.faceUpPose(this.percentile.ones,result.ones);
  }
  throw(n){
    this.value=n;
    this.prepareTarget(n);
    const launches=[
      {x:-.75,y:2.9,z:-1.05,vx:1.45,vz:.4},
      {x:-1.75,y:2.55,z:.8,vx:.95,vz:.05},
      {x:1.55,y:2.75,z:.8,vx:-.7,vz:-.10}
    ];
    for(let i=0;i<this.parts.length;i++){
      const p=this.parts[i],start=launches[i];
      p.body.wakeUp();
      p.body.position.set(start.x,start.y,start.z);
      p.body.quaternion.setFromEuler(Math.random()*3,Math.random()*3,Math.random()*3);
      p.body.velocity.set(start.vx,-1.1,start.vz);
      p.body.angularVelocity.set(9+Math.random()*6,11+Math.random()*5,8+Math.random()*5);
      p.body.force.set(0,0,0);p.body.torque.set(0,0,0);
      p.fromQuat=null;p.fromPos=null;
    }
    this.running=true;this.start=performance.now();this.settleStart=null;
    $('floating-'+this.id).classList.remove('show');
    $('number-'+this.id).textContent='—';
    $('breakdown-'+this.id).textContent='Tens + ones rolling…';
    $('grade-'+this.id).textContent='Rolling…';$('grade-'+this.id).className='';
    $('state-'+this.id).textContent='In motion';
    this.stage.closest('.card').querySelectorAll('button.roll').forEach(b=>b.disabled=true);
    if(reduced)this.settleImmediate();
  }
  settleImmediate(){
    this.running=false;
    for(const p of this.parts){
      p.body.sleep();
      p.visual.group.position.copy(p.pose.position);
      p.visual.group.quaternion.copy(p.pose.quat);
    }
    this.setResult(this.value);
    $('state-'+this.id).textContent='Settled';
    this.stage.closest('.card').querySelector('button.roll').disabled=false;
  }
  setFinish(theme){
    const colors={
      minimal:{tens:0x285344,ones:0xe4d3b4,hero:this.id==='hundred'?0x254e42:0x756a56},
      brass:{tens:0x513e30,ones:0xb99f72,hero:this.id==='hundred'?0x425047:0x887451},
      referee:{tens:0x242e2b,ones:0xe3ded0,hero:this.id==='hundred'?0x263a32:0x575d57},
      paper:{tens:0x563d41,ones:0xefe1c6,hero:this.id==='hundred'?0x505b4a:0x786d60}
    }[theme]||{tens:0x285344,ones:0xe4d3b4,hero:0x254e42};
    for(const p of this.parts){
      p.visual.material.color.setHex(colors[p.key]);
      if(p.key==='ones')p.visual.edgeMaterial.color.setHex(0x8a7860);
      if(p.key==='tens')p.visual.edgeMaterial.color.setHex(theme==='brass'?0xc5a86f:0x849d8c);
    }
  }
  tick(now,dt){
    if(this.running){
      const elapsed=now-this.start;
      if(elapsed<1550){
        this.world.step(1/90,Math.min(dt,.05),5);
        for(const p of this.parts){
          p.visual.group.position.set(p.body.position.x,p.body.position.y,p.body.position.z);
          p.visual.group.quaternion.set(p.body.quaternion.x,p.body.quaternion.y,p.body.quaternion.z,p.body.quaternion.w);
        }
      }else{
        if(this.settleStart===null){
          this.settleStart=now;
          for(const p of this.parts){
            p.fromQuat=p.visual.group.quaternion.clone();
            p.fromPos=p.visual.group.position.clone();
            p.body.sleep();
          }
          $('state-'+this.id).textContent='Settling';
        }
        const t=Math.min(1,(now-this.settleStart)/610),ease=1-Math.pow(1-t,3);
        for(const p of this.parts){
          p.visual.group.quaternion.copy(p.fromQuat).slerp(p.pose.quat,ease);
          p.visual.group.position.copy(p.fromPos).lerp(p.pose.position,ease);
        }
        if(t>=1)this.settleImmediate();
      }
    }
    this.renderer.render(this.scene,this.camera);
  }
}

function validTarget(){
  const t=Math.round(Number($('target').value));
  return Number.isFinite(t)?Math.max(1,Math.min(100,t)):67;
}
function updateTarget(){
  $('target').value=String(validTarget());
  for(const die of instances.values()){
    $('target-'+die.id).textContent='Target '+validTarget()+'%';
    if(!die.running&&die.value!==null)die.setResult(die.value);
  }
}
function choose(id){
  chosen=id;
  try{localStorage.setItem('sitota-physical-die-choice',id);}catch{}
  for(const name of ['hundred','poly']){
    const selected=name===id;
    $('card-'+name).classList.toggle('selected',selected);
    const button=document.querySelector('[data-pick="'+name+'"]');
    button.setAttribute('aria-pressed',String(selected));
    button.textContent=selected?'Selected':'Choose this';
  }
  $('selection').textContent='Your current pick: '+(id==='hundred'?'True hundred-sided':'Recognizable polyhedron')+' · Preference saved in this browser';
}
function rollBoth(n){const roll=n??uniformD100();for(const die of instances.values())die.throw(roll);}

try{
  for(const id of ['hundred','poly'])instances.set(id,new DieStage(id));
  $('status').textContent='3D models ready. Roll each separately or roll the same d100 value on both.';
  if(['hundred','poly'].includes(chosen))choose(chosen);
  document.querySelectorAll('button[data-roll]').forEach(b=>b.addEventListener('click',()=>instances.get(b.dataset.roll).throw(uniformD100())));
  document.querySelectorAll('button[data-pick]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.pick)));
  $('roll-both').addEventListener('click',()=>rollBoth());
  $('force-one').addEventListener('click',()=>rollBoth(1));
  $('force-hundred').addEventListener('click',()=>rollBoth(100));
  $('reset-camera').addEventListener('click',()=>{for(const d of instances.values())d.resetView();});
  $('target').addEventListener('change',updateTarget);
  window.addEventListener('resize',()=>{for(const d of instances.values())d.resize();});
  rollBoth(43);
  const loop=now=>{
    const dt=Math.min(.07,(now-lastFrame)/1000);lastFrame=now;
    for(const d of instances.values())d.tick(now,dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}catch(e){
  console.error('3D Dice Lab initialization failed',e);
  $('status').textContent='3D renderer could not start: '+(e?.message||String(e))+'. Check WebGL support and CDN access.';
  for(const id of ['hundred','poly']){
    const stage=$('stage-'+id);
    if(!stage.querySelector('canvas'))stage.querySelector('.stage-fallback').textContent='3D renderer unavailable';
  }
}
window.physicalDiceLab={variants:['hundred','poly'],uniformD100,rollBoth,choose,models:{facetedHundred,polyTwenty}};
