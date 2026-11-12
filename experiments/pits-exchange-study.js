// Exchange study page: plays the spring-driven exchange from pits-spring.js. Presentation only.
// The picture is a function of the time on the bar, so any moment can be stopped on, stepped through and replayed.
(function(){
const PS=window.PitsSpring,$=id=>document.getElementById(id),G=PS.GROUND,FRAME=1000/60;
const seq=PS.build(),total=PS.shownDur(seq);
const st={td:0,playing:false,last:0,held:null,passed:{}};
const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const Y=y=>G-y,dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

// the nearest any part of the dagger fighter (body, arms, dagger) comes to the sword blade at time t
const B_PARTS=['Hd','S','M','P','K','F','bK','bF','E','Hn','oE','oHn','tip'];
function toSeg(p,a,b){const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return [a[0]+vx*u,a[1]+vy*u];}
function clearance(t){
  const h=PS.world(seq,'a',t,'Hn'),tip=PS.world(seq,'a',t,'tip');let best=null;
  for(const n of B_PARTS){const p=PS.world(seq,'b',t,n),q=toSeg(p,h,tip),d=dist(p,q);if(!best||d<best.d)best={d,p,q,n};}
  return best;
}
const inContact=t=>{const c=seq.contacts;return Math.abs(t-c.parry.t)<=90||(t>=seq.tk&&t<=seq.tk+60)||(seq.grips||[]).some(g=>t>=g.t0-40&&t<=g.t1+30);};

function overlays(t){
  let s='';
  if($('pcFeet').checked)for(const id of ['a','b']){
    const f=seq.fighters[id],fr=PS.frame(seq,t)[id],j=fr.joints,q=fr.pose;
    const planted=[];
    for(const foot of ['ff','bf'])if(q[foot+'y']<.5){const x=f.hx+f.face*q[foot+'x'];planted.push(x);
      s+='<line class="pc-plant" x1="'+(x-7)+'" x2="'+(x+7)+'" y1="'+(G+6)+'" y2="'+(G+6)+'"/>';}
    if(planted.length===2)s+='<line class="pc-base" x1="'+Math.min(...planted)+'" x2="'+Math.max(...planted)+'" y1="'+(G+12)+'" y2="'+(G+12)+'"/>';
    // the centre of mass, roughly: hips, then the trunk and head
    const cx=j.P[0]*.5+j.M[0]*.3+j.S[0]*.2,com=f.hx+f.face*cx;
    s+='<path class="pc-com" d="M'+(com-5)+' '+(G+18)+'L'+(com+5)+' '+(G+18)+'L'+com+' '+(G+11)+'Z"/>';
    // a limb asked to reach further than it goes is circled
    for(const [k,n] of [['ff','F'],['bf','bF'],['h','Hn'],['o','oHn']])if(j.over[k]>.6){
      const p=f.W(j[n]);s+='<circle class="pc-strain" cx="'+p[0]+'" cy="'+Y(p[1])+'" r="9"/>';}
  }
  if($('pcPath').checked)for(const id of ['a','b']){
    const pts=[];for(let u=Math.max(0,t-450);u<=t;u+=10){const w=PS.world(seq,id,u,'tip');pts.push(w[0].toFixed(1)+','+Y(w[1]).toFixed(1));}
    s+='<polyline class="pc-tip '+id+'" points="'+pts.join(' ')+'"/>';
  }
  if($('pcClear').checked&&!inContact(t)){
    const c=clearance(t);
    s+='<line class="pc-gap" x1="'+c.p[0]+'" y1="'+Y(c.p[1])+'" x2="'+c.q[0]+'" y2="'+Y(c.q[1])+'"/>';
  }
  // the parry's one contact point, from the moment it is met until the bind lets go
  const pc=seq.contacts.parry;
  if(t>=pc.t-1&&t<=pc.t+90)s+='<circle class="pc-contact" cx="'+pc.at[0]+'" cy="'+Y(pc.at[1])+'" r="6"/>';
  // the grip on the sword arm, while it is held: a small ring where the hand closes on the forearm
  for(const g of seq.grips||[])if(t>=g.t0&&t<=g.t1){const p=PS.world(seq,g.who,t,'oHn');
    s+='<circle class="pc-grip" cx="'+p[0]+'" cy="'+Y(p[1])+'" r="7"/>';}
  return s;
}
function readout(t){
  const c=clearance(t),pc=seq.contacts.parry;
  let s='t = '+Math.round(t)+' ms';
  if(Math.abs(t-pc.t)<1){
    const a=PS.world(seq,'a',t,'blade',pc.alongA),b=PS.world(seq,'b',t,'blade',pc.alongB);
    s+=' · parry: sword and dagger '+dist(a,pc.at).toFixed(1)+' and '+dist(b,pc.at).toFixed(1)+' units from the contact point';
  }else if((seq.grips||[]).some(g=>t>=g.t0&&t<=g.t1))s+=' · the sword arm is held at the wrist';
  else if(inContact(t))s+=' · in contact';
  else s+=' · nearest the dagger fighter comes to the sword blade: '+c.d.toFixed(0)+' units ('+c.n+')';
  $('pcReadout').textContent=s;
}
function caption(t){
  let cur=seq.marks[0];for(const m of seq.marks)if(t>=m.t)cur=m;
  const who=cur.who==='a'?seq.names.a:cur.who==='b'?seq.names.b:'Both';
  $('pcCaption').innerHTML='<b>'+who+'.</b> '+cur.label;
}
function star(at,cls,r){
  const x=at[0],y=Y(at[1]);let s='';
  for(const a of [20,80,140,200,260,320]){const c=Math.cos(a*Math.PI/180),n=Math.sin(a*Math.PI/180);
    s+='<line class="'+cls+'" x1="'+(x+c*r*.45)+'" y1="'+(y+n*r*.45)+'" x2="'+(x+c*r)+'" y2="'+(y+n*r)+'"/>';}
  return s;
}
function draw(){
  const t=PS.seqTime(seq,st.td),f=PS.frame(seq,t);
  $('pcFigs').innerHTML=f.a.svg+f.b.svg;
  let fx='';
  for(const e of seq.fx){const dt=st.td-PS.shownAt(seq,e.t);if(dt>=0&&dt<170)fx+=star(e.at,e.kind==='clash'?'pc-clash':'pc-woundfx',10+dt*.08);}
  $('pcFx').innerHTML=fx;
  $('pcInspect').innerHTML=overlays(t);
  $('pcScrub').value=Math.round(st.td);
  $('pcPlay').textContent=st.playing?'Pause':st.held?'Resume':'Play';
  $('pcHold').hidden=!st.held;if(st.held)$('pcHold').textContent='Paused for a decision. '+st.held.label+' Press Resume.';
  caption(t);readout(t);
}
function tick(now){
  if(!st.playing)return;
  const dt=Math.min(50,now-st.last)*(+$('pcSpeed').value);st.last=now;
  let td=st.td+dt;
  if($('pcDecide').checked)for(const p of seq.pauses){
    const at=PS.shownAt(seq,p.t);
    if(!st.passed[p.t]&&st.td<at&&td>=at){td=at;st.playing=false;st.held=p;st.passed[p.t]=true;}
  }
  if(td>=total){if($('pcLoop').checked){td=0;st.passed={};}else{td=total;st.playing=false;}}
  st.td=td;draw();
  if(st.playing)requestAnimationFrame(tick);
}
function play(){
  if(st.playing){st.playing=false;draw();return;}
  if(st.td>=total-1){st.td=0;st.passed={};}
  st.held=null;st.playing=true;st.last=performance.now();draw();requestAnimationFrame(tick);
}
function seek(td){st.playing=false;st.held=null;st.td=Math.max(0,Math.min(total,td));
  // a pause already behind the bar does not stop playback again
  st.passed={};for(const p of seq.pauses)if(PS.shownAt(seq,p.t)<=st.td)st.passed[p.t]=true;draw();}
const nudge=d=>seek(st.td+d*FRAME);

// the scrub bar: a tick per caption, a taller one per decision
$('pcScrub').max=Math.round(total);
for(const m of seq.marks){const i=document.createElement('i');i.style.left=(PS.shownAt(seq,m.t)/total*100)+'%';$('pcMarks').appendChild(i);}
for(const p of seq.pauses){const i=document.createElement('i');i.className='stop';i.style.left=(PS.shownAt(seq,p.t)/total*100)+'%';$('pcMarks').appendChild(i);}
const GRIP=(seq.grips||[])[0];
const JUMPS=[['Parry contact',seq.contacts.parry.t],['Held for the decision',seq.P1],['Sword arm caught',GRIP.t0],['Counter lands',seq.tk],
  ['Arm let go',GRIP.t1+40],['Wound reaction',seq.tk+160],['Sword recovers',seq.tk+300],['End pose',seq.end]];
for(const [label,t] of JUMPS){const b=document.createElement('button');b.type='button';b.textContent=label;
  b.addEventListener('click',()=>seek(PS.shownAt(seq,t)));$('pcJumps').appendChild(b);}

$('pcPlay').addEventListener('click',play);
$('pcBack').addEventListener('click',()=>nudge(-1));$('pcFwd').addEventListener('click',()=>nudge(1));
$('pcScrub').addEventListener('input',e=>seek(+e.target.value));
for(const id of ['pcFeet','pcPath','pcClear'])$(id).addEventListener('change',draw);
document.addEventListener('keydown',e=>{
  if(/^(INPUT|SELECT|BUTTON)$/.test(e.target.tagName)&&e.key===' ')return;
  if(e.key===' '){e.preventDefault();play();}
  else if(e.key==='ArrowLeft'){e.preventDefault();nudge(-1);}
  else if(e.key==='ArrowRight'){e.preventDefault();nudge(1);}
});
const fit=()=>$('pcScene').setAttribute('viewBox',window.innerWidth<=600?'395 215 500 275':'330 215 600 257');
fit();window.addEventListener('resize',fit);
// a test or a review script can put the picture on an exact moment (sequence time) and read the state
window.pitsExchange={seq,seek:t=>seek(PS.shownAt(seq,t)),seekShown:seek,play,state:st,clearance,total};
if(!reduced()&&!/[?&]still\b/.test(location.search))play();else draw();
})();
