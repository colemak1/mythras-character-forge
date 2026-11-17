// The Pits: the picture around the cinematic movement (pits-cine.js). The hall behind the fighters, a camera that
// follows and pushes in, the smear of a fast blade, afterimages on a dash, headbands that stream behind the head,
// dust, sparks and blood, and the impact frame when a blow lands. Presentation only: it reads the fighters' joints and
// the effects the movement asks for, and draws. The stage (pits-stage.js) calls mount, frame, reset and the impacts.
const PitsCineFx=(()=>{
'use strict';
const NS='http://www.w3.org/2000/svg';
const mk=(tag,attrs,parent,first)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);
  if(parent){if(first)parent.insertBefore(e,parent.firstChild);else parent.appendChild(e);}return e;};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const pts=a=>a.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
let PS=null,G=450,sec=null,svg=null,stage=null,L={},ready=false;
const cam={x:600,h:430,punch:0,sk:0,ox:0,oy:0,still:0,lastClock:0,hold:0,holdUntil:0,init:false};
let parts=[],queue=[],active=[],scarf={},ghost={},smear={},J={},seen=0;
let impactUntil=0,flashEl=null,slowUntil=0,slowRate=1,letterUntil=0,box={w:1200,h:520,at:0,side:0,top:0,zoom:1.6};
const reduced=()=>{try{return typeof V!=='undefined'&&V.reduced;}catch(e){return false;}};
const Y=y=>G-y;                                  // the movement's world (y up) -> the picture (y down)
const rnd=(a,b)=>a+Math.random()*(b-a);

function mount(section,svgEl,ps,ground){
  PS=ps;G=ground;sec=section;svg=svgEl;stage=section.querySelector('.ps-stage');
  const defs=mk('defs',{},svg,true);
  const grad=(id,a,b,x2,y2)=>{const g=mk('linearGradient',{id,x1:0,y1:0,x2:x2||0,y2:y2==null?1:y2},defs);
    mk('stop',{offset:0,class:a},g);mk('stop',{offset:1,class:b},g);};
  grad('pcWall','pc-s-wall-top','pc-s-wall-bot');grad('pcFloor','pc-s-floor-top','pc-s-floor-bot');
  grad('pcPillar','pc-s-pillar-a','pc-s-pillar-b',1,0);
  {const g=mk('radialGradient',{id:'pcGlow'},defs);mk('stop',{offset:0,class:'pc-s-glow-in'},g);mk('stop',{offset:1,class:'pc-s-glow-out'},g);}
  // the hall, behind everything
  const back=L.back=mk('g',{class:'pc-back'},svg);svg.insertBefore(back,defs.nextSibling);
  mk('rect',{class:'pc-wall',x:-60000,y:G-2400,width:120000,height:2400,fill:'url(#pcWall)'},back);
  L.far=mk('g',{class:'pc-far'},back);L.farEls=[];
  for(let i=0;i<12;i++){const g=mk('g',{},L.far);
    mk('ellipse',{cx:0,cy:G-250,rx:150,ry:250,fill:'url(#pcGlow)'},g);
    mk('rect',{class:'pc-window',x:-19,y:G-360,width:38,height:210,rx:19},g);L.farEls.push(g);}
  L.mid=mk('g',{class:'pc-mid'},back);L.midEls=[];
  for(let i=0;i<10;i++){const g=mk('g',{},L.mid);
    mk('rect',{class:'pc-pillar',x:-26,y:G-2400,width:52,height:2400,fill:'url(#pcPillar)'},g);
    mk('rect',{class:'pc-pillar-foot',x:-36,y:G-22,width:72,height:22},g);L.midEls.push(g);}
  mk('rect',{class:'pc-floor',x:-60000,y:G,width:120000,height:900,fill:'url(#pcFloor)'},back);
  mk('rect',{class:'pc-floor-edge',x:-60000,y:G,width:120000,height:5},back);
  // under the figures: the black of an impact frame, dust, afterimages, smears, headbands
  const figs=svg.querySelector('.ps-figs');
  L.under=mk('g',{class:'pc-under'},svg);svg.insertBefore(L.under,figs);
  L.black=mk('rect',{class:'pc-black',x:-60000,y:G-3000,width:120000,height:5000,opacity:0},L.under);
  L.rays=mk('g',{class:'pc-rays',opacity:0},L.under);
  L.dust=mk('g',{class:'pc-dustl'},L.under);
  L.ghost=mk('g',{class:'pc-ghosts'},L.under);
  L.smear=mk('g',{class:'pc-smears'},L.under);
  L.scarf=mk('g',{class:'pc-scarves'},L.under);
  for(const id of ['a','b']){
    smear[id]=mk('path',{class:'pc-smear pc-smear-'+id,d:''},L.smear);
    scarf[id]={els:[mk('polyline',{class:'pc-scarf pc-'+id,points:''},L.scarf),mk('polyline',{class:'pc-scarf pc-scarf2 pc-'+id,points:''},L.scarf)],p:[null,null]};
    ghost[id]=[];for(let k=0;k<3;k++){const g=mk('g',{class:'pc-ghost pc-'+id,opacity:0},L.ghost);
      ghost[id].push({g,a:mk('polyline',{class:'pc-g-leg'},g),b:mk('polyline',{class:'pc-g-leg'},g),c:mk('polyline',{class:'pc-g-body'},g),
        d:mk('polyline',{class:'pc-g-arm'},g),e:mk('polyline',{class:'pc-g-arm'},g),h:mk('circle',{r:15},g),w:mk('line',{class:'pc-g-blade'},g)});}
  }
  // over the figures: sparks, lines of speed, the flash
  L.over=mk('g',{class:'pc-over'},svg);
  L.flash=mk('rect',{class:'pc-flash',x:-60000,y:G-3000,width:120000,height:5000,opacity:0},L.over);
  // the bars of a film, for the last blow and the replay
  for(const c of ['pc-bar pc-bar-top','pc-bar pc-bar-bot']){const d=document.createElement('div');d.className=c;stage.appendChild(d);}
  ready=true;
}

// ----- particles (the picture's own coordinates) -----
function spawn(o){
  if(parts.length>260){const old=parts.shift();old.el.remove();}
  parts.push(o);return o;
}
function dust(x,n,dir,spread){
  if(!ready||reduced())return;
  for(let i=0;i<(n||5);i++){
    const r=rnd(5,11),el=mk('circle',{class:'pc-dust',r,cx:0,cy:0},L.dust);
    spawn({el,k:'dust',x:x+rnd(-1,1)*(spread||16),y:G-rnd(2,8),vx:(dir||0)*rnd(.05,.22)+rnd(-.04,.04),vy:-rnd(.02,.09),g:0,life:rnd(380,720),age:0,r,grow:rnd(1.4,2.4)});
  }
}
function sparks(w,n,dir,hot){
  for(let i=0;i<n;i++){
    const a=rnd(0,Math.PI*2),sp=rnd(.25,.95),el=mk('line',{class:'pc-spark'+(hot&&i%3===0?' hot':'')},L.over);
    spawn({el,k:'spark',x:w[0],y:w[1],vx:Math.cos(a)*sp+(dir||0)*.2,vy:Math.sin(a)*sp-.25,g:.0022,life:rnd(180,420),age:0,len:rnd(10,26)});
  }
}
function blood(w,n,dir){
  for(let i=0;i<n;i++){
    const r=rnd(2,5.5),el=mk('circle',{class:'pc-blood',r},L.over);
    spawn({el,k:'blood',x:w[0],y:w[1],vx:(dir||0)*rnd(.1,.75)+rnd(-.12,.12),vy:-rnd(.1,.7),g:.0026,life:rnd(500,900),age:0,r});
  }
}
function lines(x,y,dir,n,len){
  for(let i=0;i<n;i++){const el=mk('line',{class:'pc-line'},L.over);
    spawn({el,k:'line',x:x+rnd(-30,30),y:y+rnd(-70,40),vx:-dir*rnd(.2,.5),vy:0,g:0,life:rnd(140,260),age:0,len:(len||90)*rnd(.5,1.2),dir});}
}
function ring(w,big){
  if(!ready||reduced())return;
  const el=mk('circle',{class:'pc-ring',cx:w[0],cy:w[1],r:4},L.over);
  spawn({el,k:'ring',x:w[0],y:w[1],vx:0,vy:0,g:0,life:big?380:260,age:0,r1:big?120:60});
}
// a ring of dust thrown out along the floor where something heavy lands
function gring(x,power){
  if(!ready||reduced())return;
  const el=mk('ellipse',{class:'pc-ring',cx:x,cy:G-2,rx:6,ry:2},L.dust);
  spawn({el,k:'gring',x,y:G-2,vx:0,vy:0,g:0,life:340,age:0,r1:90+power*50});
}
function star(w,size){
  const el=mk('polygon',{class:'pc-star'},L.over);
  spawn({el,k:'star',x:w[0],y:w[1],vx:0,vy:0,g:0,life:150,age:0,size:size||60,rot:rnd(0,90)});
}
function slash(w,dir,len){
  const el=mk('polygon',{class:'pc-slash'},L.over),a=rnd(-.9,-.3)*dir;
  spawn({el,k:'slash',x:w[0],y:w[1],vx:0,vy:0,g:0,life:200,age:0,len:len||150,a});
}
function burst(w,kind,n){
  if(!ready||reduced())return;
  if(kind==='blood')blood(w,n||10,0);else if(kind==='spark')sparks(w,n||10,0,true);
  else for(let i=0;i<(n||6);i++){const el=mk('circle',{class:'pc-chip',r:rnd(1.5,3.5)},L.over);
    spawn({el,k:'blood',x:w[0],y:w[1],vx:rnd(-.3,.3),vy:-rnd(.1,.4),g:.002,life:rnd(300,500),age:0,r:2});}
}
function stepParts(dt){
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];p.age+=dt;const u=p.age/p.life;
    if(u>=1){p.el.remove();parts.splice(i,1);continue;}
    p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
    const el=p.el;
    if(p.k==='dust'){el.setAttribute('cx',p.x);el.setAttribute('cy',p.y);el.setAttribute('r',p.r*(1+u*p.grow));el.setAttribute('opacity',(.55*(1-u)).toFixed(3));p.vx*=.985;}
    else if(p.k==='spark'){const s=Math.hypot(p.vx,p.vy)||1,l=p.len*(1-u*.6);el.setAttribute('x1',p.x);el.setAttribute('y1',p.y);
      el.setAttribute('x2',p.x-p.vx/s*l);el.setAttribute('y2',p.y-p.vy/s*l);el.setAttribute('opacity',(1-u*u).toFixed(3));}
    else if(p.k==='blood'){if(!p.landed&&p.y>G+rnd(2,14)){p.landed=true;p.y=Math.min(p.y,G+14);p.vx=0;p.vy=0;p.g=0;p.life=Math.max(p.life,p.age+900);}  // (one fade deadline, set when it lands: CA-11)
      el.setAttribute('cx',p.x);el.setAttribute('cy',p.y);el.setAttribute('opacity',(1-u*u*u).toFixed(3));}
    else if(p.k==='line'){const l=p.len*(1-u);el.setAttribute('x1',p.x);el.setAttribute('y1',p.y);el.setAttribute('x2',p.x-p.dir*l);el.setAttribute('y2',p.y);el.setAttribute('opacity',(.8*(1-u)).toFixed(3));}
    else if(p.k==='shard'){if(p.y>G-2){p.y=G-2;p.vx*=.5;p.vy=0;p.g=0;p.vr=0;}else p.rot+=p.vr*dt;
      const c=Math.cos(p.rot*Math.PI/180),q=Math.sin(p.rot*Math.PI/180),s=p.s;
      el.setAttribute('points',pts([[-s,-s*.5],[s,-s*.3],[s*.4,s*.6]].map(([x,y])=>[p.x+x*c-y*q,p.y+x*q+y*c])));
      el.setAttribute('opacity',(u<.7?1:(1-u)/.3).toFixed(3));p.vx*=.995;}
    else if(p.k==='ring'){el.setAttribute('r',4+(p.r1-4)*(1-Math.pow(1-u,3)));el.setAttribute('opacity',(1-u).toFixed(3));el.setAttribute('stroke-width',(7*(1-u)+1).toFixed(1));}
    else if(p.k==='gring'){const r=6+(p.r1-6)*(1-Math.pow(1-u,3));el.setAttribute('rx',r);el.setAttribute('ry',r*.16);el.setAttribute('opacity',(.8*(1-u)).toFixed(3));el.setAttribute('stroke-width',(5*(1-u)+1).toFixed(1));}
    else if(p.k==='star'){const s=p.size*(.5+u*1.1),t=s*.13,P=[];
      for(let k=0;k<8;k++){const a=(p.rot+k*45)*Math.PI/180,r=k%2?t:s*(k%4?0.62:1);P.push([p.x+Math.cos(a)*r,p.y+Math.sin(a)*r]);}
      el.setAttribute('points',pts(P));el.setAttribute('opacity',(1-u*u).toFixed(3));}
    else if(p.k==='slash'){const l=p.len*(.4+u*.8),wd=9*(1-u),c=Math.cos(p.a),s=Math.sin(p.a);
      el.setAttribute('points',pts([[p.x-c*l,p.y-s*l],[p.x+s*wd,p.y-c*wd],[p.x+c*l,p.y+s*l],[p.x-s*wd,p.y+c*wd]]));el.setAttribute('opacity',(1-u).toFixed(3));}
  }
}

// ----- the camera -----
const FLOOR=.12;          // the share of the picture below the fighters' feet
let film_=false;
// What covers the picture: the fighters' plates at the sides and the dice in the middle (pits-arena.js draws them over
// the stage). The camera frames the fight in what is left. In the replay they are put away and the whole picture is used.
function measure(){
  box.w=stage.clientWidth||1200;box.h=stage.clientHeight||520;box.side=0;box.top=box.h*.04;box.zoom=1.32;
  if(film_){box.top=box.h*.1;box.zoom=1.55;return;}
  const R=stage.getBoundingClientRect(),mid=R.left+R.width/2;
  for(const el of stage.querySelectorAll('.ps-hud > *')){
    const r=el.getBoundingClientRect();if(!r.width||!r.height||r.bottom<R.top+4)continue;
    if(r.left<mid&&r.right>mid){if(r.height<R.height*.75)box.top=Math.max(box.top,r.bottom-R.top);}
    else if(r.height>R.height*.3)box.side=Math.max(box.side,r.right<mid?r.right-R.left:R.right-r.left);
  }
  if(box.side>box.w*.36)box.side=0;       // narrow screens: the plates are not beside the fight
}
function shake(k){if(!reduced())cam.sk=Math.min(26,Math.max(cam.sk,7*(k||1)));}
function punch(power){if(!reduced())cam.punch=Math.min(.2,Math.max(cam.punch,.045+(power||1)*.012));}
function camera(now,dt,moving){
  if(now-box.at>400){box.at=now;measure();}
  const asp=box.w/box.h,a=J.a,b=J.b;
  let tx=cam.x,th=cam.h;
  if(a&&b){
    const xs=[a.P[0],b.P[0]],sep=Math.abs(xs[0]-xs[1]),top=Math.max(a.Hd[1],b.Hd[1],a.P[1]+60,b.P[1]+60);
    tx=(xs[0]+xs[1])/2;
    // as close as the picture allows: the fighters stay clear of the plates and the dice (see measure), with room
    // above for a leap and to the sides for a swing
    const floorPx=box.h*(1-FLOOR),colW=Math.max(200,box.w-2*box.side);
    let sc=Math.min(box.zoom,(floorPx-box.top-6)/(Math.max(205,top+34)),colW/(sep+(film_?330:210)));
    // (never so far back that the fight is lost: on a short screen a tall dice tray may then touch the heads)
    sc=Math.max(sc,Math.min(.8,box.w/(sep+260),floorPx/(top+40)));
    if(now<cam.holdUntil)sc*=cam.hold;
    // a held moment (a choice, the dice): the camera creeps in
    cam.still=moving?0:cam.still+dt;sc*=1+Math.min(.05,cam.still/90000);
    th=box.h/Math.max(.2,sc);
  }
  if(!cam.init){cam.x=tx;cam.h=th;cam.init=true;}
  const kx=1-Math.exp(-dt/170),kh=1-Math.exp(-dt/(th>cam.h?130:420));
  cam.x+=(tx-cam.x)*kx;cam.h+=(th-cam.h)*kh;
  cam.punch*=Math.exp(-dt/150);cam.sk*=Math.exp(-dt/110);
  if(cam.sk>.3){cam.ox=rnd(-1,1)*cam.sk;cam.oy=rnd(-1,1)*cam.sk*.7;}else{cam.ox=cam.oy=0;}
  const h=cam.h*(1-cam.punch),w=h*asp,x=cam.x-w/2+cam.ox,y=G+h*FLOOR-h+cam.oy;
  svg.setAttribute('viewBox',x.toFixed(1)+' '+y.toFixed(1)+' '+w.toFixed(1)+' '+h.toFixed(1));
  // the hall slides past more slowly the further away it is
  const layer=(els,p,sp,off)=>{const c=cam.x*p,k0=Math.floor((c-w)/sp)-1;
    for(let i=0;i<els.length;i++)els[i].setAttribute('transform','translate('+((k0+i)*sp+off+cam.x*(1-p)).toFixed(1)+',0)');};
  layer(L.farEls,.28,330,120);layer(L.midEls,.62,610,300);
}

// ----- per fighter: smear, afterimages, headband -----
function drawSmear(id,m,clock,shown){
  const el=smear[id],sp=shown?PitsCine.speed(m,clock):{tip:0};
  if(sp.tip<1.2){el.setAttribute('d','');return;}
  // Where the blade has just been, as a crescent: widest at the blade, thinning to nothing at its tail. The outer
  // edge follows the point; the inner edge starts at the middle of the blade and closes on the point's path.
  const n=12,span=clamp(150/sp.tip,22,60),outer=[],inner=[];
  let turned=0,prev=null;
  for(let k=0;k<=n;k++){
    const j=k?PitsCine.joints(m,clock-k*span/n):J[id],u=k/n,q=.5+.5*Math.pow(u,.8);
    const a=Math.atan2(j.tip[1]-j.Hn[1],j.tip[0]-j.Hn[0]);
    if(prev!=null){let d=Math.abs(a-prev);if(d>Math.PI)d=2*Math.PI-d;turned+=d;}prev=a;
    if(turned>2.6)break;                          // never more than most of a half turn: a crescent, not a wheel
    outer.push([j.tip[0],Y(j.tip[1])]);inner.push([j.Hn[0]+(j.tip[0]-j.Hn[0])*q,Y(j.Hn[1]+(j.tip[1]-j.Hn[1])*q)]);
  }
  if(outer.length<3){el.setAttribute('d','');return;}
  inner[inner.length-1]=outer[outer.length-1];
  el.setAttribute('d','M'+pts(outer).replace(/ /g,' L')+' L'+pts(inner.reverse()).replace(/ /g,' L')+' Z');
  el.setAttribute('opacity',clamp((sp.tip-.9)*.45,.3,.9).toFixed(2));
}
// (opt: the arms and equipment as the figure is drawn, so an afterimage never carries a blade the figure does not
// hold, or a healthy arm it does not have; nothing at all with reduced motion: CL-03)
function drawGhosts(id,m,clock,on,opt,blade){
  const sp=PitsCine.speed(m,clock).body,show=!reduced()&&(on||sp>1.05);
  for(let k=0;k<3;k++){
    const g=ghost[id][k];if(!show){g.g.setAttribute('opacity',0);continue;}
    const j=PitsCine.joints(m,clock-(k+1)*26,opt),P=a=>pts(a.map(p=>[p[0],Y(p[1])]));
    g.a.setAttribute('points',P([j.P,j.K,j.F]));g.b.setAttribute('points',P([j.P,j.bK,j.bF]));g.c.setAttribute('points',P([j.P,j.M,j.S]));
    g.d.setAttribute('points',P([j.wS,j.E,j.Hn]));g.e.setAttribute('points',P([j.oS,j.oE,j.oHn]));
    g.h.setAttribute('cx',j.Hd[0]);g.h.setAttribute('cy',Y(j.Hd[1]));
    g.w.setAttribute('x1',j.Hn[0]);g.w.setAttribute('y1',Y(j.Hn[1]));g.w.setAttribute('x2',j.tip[0]);g.w.setAttribute('y2',Y(j.tip[1]));
    g.w.setAttribute('opacity',blade?1:0);
    g.g.setAttribute('opacity',(.34-k*.1).toFixed(2));
  }
}
function drawScarf(id,m,dt,now){
  const S=scarf[id],j=J[id],f=m.face,N=[9,7];
  const ang=Math.atan2(j.Hd[1]-j.S[1],j.Hd[0]-j.S[0]);
  // tied at the back of the head
  const ax=j.Hd[0]-f*12*Math.sin(ang)-f*2,ay=Y(j.Hd[1])+f*12*Math.cos(ang)*f*.2+1;
  for(let c=0;c<2;c++){
    let p=S.p[c];const seg=c?8:9.5;
    if(!p||Math.hypot(p[0].x-ax,p[0].y-ay)>260){p=S.p[c]=[];for(let i=0;i<N[c];i++)p.push({x:ax-f*i*3,y:ay+i*seg*.9,px:ax-f*i*3,py:ay+i*seg*.9});}
    p[0].x=ax;p[0].y=ay+c*2;
    const h=Math.min(dt,34)/16;
    for(let i=1;i<p.length;i++){const q=p[i],vx=(q.x-q.px)*.9,vy=(q.y-q.py)*.9;q.px=q.x;q.py=q.y;
      q.x+=vx+(-f*.05+Math.sin(now/260+i*.9+c*2+(id==='b'?1.7:0))*.05)*h*h;q.y+=vy+.38*h*h;}
    for(let it=0;it<3;it++)for(let i=1;i<p.length;i++){const a=p[i-1],q=p[i],dx=q.x-a.x,dy=q.y-a.y,d=Math.hypot(dx,dy)||1,k=(d-seg)/d;
      q.x-=dx*k;q.y-=dy*k;if(q.y>G-2)q.y=G-2;}
    S.els[c].setAttribute('points',pts(p.map(q=>[q.x,q.y])));
  }
}

// ----- what the movement asks for, on the stage clock -----
function fire(e,now){
  const m=e.id&&PS.M[e.id],j=e.id&&J[e.id];
  if(e.kind==='dust')dust(e.x,e.n,e.dir);
  else if(e.kind==='dash'){dust(e.x0,e.big?12:7,-e.face,22);lines(e.x0+e.face*40,G-110,e.face,e.big?12:6,e.big?220:120);active.push({kind:'ghost',id:e.id,t1:e.t1+70});}
  else if(e.kind==='skid'||e.kind==='ghost'||e.kind==='grind')active.push({...e,next:0});
  else if(e.kind==='jump')dust(e.x,6,0,20);
  else if(e.kind==='land'){dust(e.x-14,Math.round(5+e.power*4),-1,10);dust(e.x+14,Math.round(5+e.power*4),1,10);shake(e.power*.9);
    if(e.power>=1)gring(e.x,e.power);}
  else if(e.kind==='thump'){ring([e.at[0],Y(e.at[1])]);shake(e.power);}
  else if(e.kind==='launch'&&j){lines(j.P[0],Y(j.P[1])+40,m.face,5,80);}
  else if(e.kind==='burst'&&m){
    // the cut that was already made opens
    const w=PitsCine.partAt(m,PS.clock,e.loc||'chest'),p=[w[0],Y(w[1])];
    if(!reduced()){blood(p,26,-m.face);blood(p,10,m.face);slash(p,-m.face,190);star(p,70);shake(1.6);punch(4);flash(.5,90,now);}
  }
  else if(e.kind==='finish'){letterUntil=now+3600;stage.classList.add('pc-letter');}
  else if(e.kind==='spurt'&&m&&e.n&&!reduced()){
    // a weapon torn out: the blood follows the blade out of the wound, toward the one pulling it
    const w=PitsCine.partAt(m,PS.clock,e.loc||'chest'),p=[w[0],Y(w[1])];blood(p,e.n,e.dir||0);blood(p,Math.round(e.n/3),0);}
  else if(e.kind==='crack'&&m)crack(PitsCine.partAt(m,PS.clock,e.loc||'chest'),e.dir||0);
}
// armour cracks under a heavy blow (Maximise Damage, Bypass Armour, Sunder): a spray of sparks, pieces of plate fly off
// and tumble to the floor
function crack(w,dir){
  if(!ready||reduced())return;
  const p=[w[0],Y(w[1])];
  sparks(p,22,dir,true);ring(p,true);
  for(let i=0;i<4;i++){const el=mk('polygon',{class:'pc-shard'},L.over),s=rnd(5,10);
    spawn({el,k:'shard',x:p[0],y:p[1],vx:dir*rnd(.15,.5)+rnd(-.15,.15),vy:-rnd(.3,.75),g:.0024,life:rnd(1300,1800),age:0,s,rot:rnd(0,360),vr:rnd(-.9,.9)});}
}
function runActive(clock,dt){
  for(let i=active.length-1;i>=0;i--){
    const e=active[i];if(clock>e.t1){active.splice(i,1);continue;}
    const j=J[e.id];
    if(e.kind==='skid'&&j){e.next-=dt;if(e.next<=0){e.next=34;const m=PS.M[e.id],dir=Math.sign(PitsCine.joints(m,clock).P[0]-PitsCine.joints(m,clock-20).P[0])||0;
      dust(j.F[0],1,dir*.6,6);dust(j.bF[0],1,dir*.6,6);}}
    else if(e.kind==='grind'){e.next-=dt;if(e.next<=0&&!reduced()){e.next=22;sparks([e.at[0],Y(e.at[1])],2,0,true);}}
  }
}
const ghosting=id=>active.some(e=>e.kind==='ghost'&&e.id===id);

function flash(op,ms,now){if(reduced())return;L.flash.setAttribute('opacity',op);flashEl={until:now+ms,op,ms};}
// A blow arrives (called by the stage at the contact, in the picture's coordinates). power: wound size, or 0..1.
function impact(w,kind,power,dir){
  if(!ready||reduced())return;
  const now=performance.now();
  if(kind==='clash'){
    sparks(w,Math.round(16+power*14),0,true);star(w,46+power*30);ring(w);punch(1+power*2);shake(.7+power*.7);
    if(power>=1)flash(.28,70,now);
  }else if(kind==='tear'||kind==='tearFinish'){
    // a weapon torn out of a wound (dir: the way the blade travels): no impact frame, no star; a short jolt, and for the
    // last one the slow look and the bars
    ring(w);punch(1+Math.min(3,(power||1)*.3));shake(.6+Math.min(1.2,(power||1)/6));
    if(kind==='tearFinish'){slowUntil=now+900;slowRate=.4;cam.hold=.7;cam.holdUntil=now+1300;letterUntil=now+3600;stage.classList.add('pc-letter');}
  }else if(kind==='miss'){
    lines(w[0],w[1]+30,dir,4,70);
  }else{
    const fin=kind==='finish',lost=power||1;
    // the impact frame: for a few frames the world is black and the fighters white, lines flying out from the blow
    impactUntil=now+(fin?170:70+Math.min(60,lost*7));
    sec.classList.add('pc-impact');L.black.setAttribute('opacity',.94);
    L.rays.innerHTML='';L.rays.setAttribute('opacity',1);
    const n=fin?26:16;for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2+rnd(-.1,.1),r0=rnd(70,150),r1=rnd(420,1000),wd=rnd(.004,.016);
      mk('polygon',{points:pts([[w[0]+Math.cos(a)*r0,w[1]+Math.sin(a)*r0],[w[0]+Math.cos(a-wd)*r1,w[1]+Math.sin(a-wd)*r1],[w[0]+Math.cos(a+wd)*r1,w[1]+Math.sin(a+wd)*r1]])},L.rays);}
    slash(w,dir,fin?240:130+lost*8);star(w,fin?110:54+lost*5);
    blood(w,Math.round(8+lost*3),dir);sparks(w,8,dir,false);
    punch(fin?9:1.5+lost*.6);shake(fin?2.6:1+lost/5);
    if(fin){slowUntil=now+1150;slowRate=.3;cam.hold=.8;cam.holdUntil=now+1500;letterUntil=now+4200;stage.classList.add('pc-letter');}
  }
}

function frame(now,dt,stopped){
  if(!ready||!PS.M.a||!PS.M.b||!PS.M.a.cine)return;
  const clock=PS.clock,moving=clock!==cam.lastClock;cam.lastClock=clock;
  for(const id of ['a','b'])J[id]=PitsCine.joints(PS.M[id],clock);
  // effects the movement has written since the last frame
  const got=PitsCine.takeFx(PS.M.a);if(got.length){queue.push(...got);queue.sort((p,q)=>p.t-q.t);}
  while(queue.length&&queue[0].t<=clock){const e=queue.shift();if(clock-e.t<400)try{fire(e,now);}catch(err){}}
  if(moving)runActive(clock,dt);
  for(const id of ['a','b']){
    const m=PS.M[id],f=PS.fig[id],armed=!!(f&&f.look&&f.look.armed&&!f.dropEl&&!f.dropping);
    const opt=f&&f.look&&typeof psPoseOpt==='function'?psPoseOpt(f,f.look):{},blade=armed&&!(typeof psHeldLodge==='function'&&f&&psHeldLodge(f));
    // (a chain, lash or net is its own trail: the straight blade's smear and afterimage blade are not drawn for it)
    const stiff=blade&&!(m.weapon&&/^(chain|whip|net)$/.test(m.weapon.key));
    drawSmear(id,m,clock,stiff&&!reduced());drawGhosts(id,m,clock,!reduced()&&ghosting(id),opt,stiff);drawScarf(id,m,dt,now);
  }
  if(!stopped)stepParts(dt);
  // the impact frame and the flash end on the real clock
  if(impactUntil&&now>=impactUntil){impactUntil=0;sec.classList.remove('pc-impact');L.black.setAttribute('opacity',0);L.rays.setAttribute('opacity',0);L.rays.innerHTML='';flash(.45,110,now);}
  if(flashEl){const u=1-(flashEl.until-now)/flashEl.ms;if(u>=1){L.flash.setAttribute('opacity',0);flashEl=null;}else L.flash.setAttribute('opacity',(flashEl.op*(1-u)).toFixed(3));}
  // the last blow is seen slowly
  if(slowUntil){if(now>=slowUntil){slowUntil=0;PS.rate=1;}else PS.rate=slowRate+(1-slowRate)*Math.pow(clamp(1-(slowUntil-now)/1150,0,1),3);}
  if(letterUntil&&now>=letterUntil&&!replayBars){letterUntil=0;stage.classList.remove('pc-letter');}
  camera(now,dt,moving);
}
let replayBars=false;
// the replay of a whole fight is shown as a film
function film(on){if(!!on===replayBars)return;replayBars=film_=!!on;box.at=0;if(stage){stage.classList.toggle('pc-letter',!!on||!!letterUntil);stage.classList.toggle('pc-film',!!on);}}
function reset(){
  for(const p of parts)p.el.remove();parts=[];queue=[];active=[];impactUntil=0;slowUntil=0;flashEl=null;letterUntil=0;
  if(!ready)return;
  sec.classList.remove('pc-impact');L.black.setAttribute('opacity',0);L.rays.setAttribute('opacity',0);L.rays.innerHTML='';L.flash.setAttribute('opacity',0);
  if(!replayBars)stage.classList.remove('pc-letter');
  for(const id of ['a','b']){smear[id].setAttribute('d','');for(const g of ghost[id])g.g.setAttribute('opacity',0);}
  cam.punch=0;cam.sk=0;cam.still=0;cam.holdUntil=0;
}
return {mount,frame,reset,impact,burst,ring,dust,shake,punch,film,cam};
})();
if(typeof window!=='undefined')window.PitsCineFx=PitsCineFx;
