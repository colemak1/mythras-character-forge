// Study pages for the spring-driven movement (pits-spring.js): the short exchange (pits-exchange-study.html) and the
// ten-beat fight (pits-fight-study.html, data-seq="fight"). Presentation only.
// The picture is a function of the time on the bar, so any moment can be stopped on, stepped through and replayed.
(function(){
const PS=window.PitsSpring,$=id=>document.getElementById(id),G=PS.GROUND,FRAME=1000/60;
// the fight page can show any registered fight (?seq=thrust); its heading and description come from the fight
const asked=(location.search.match(/[?&]seq=([\w-]+)/)||[])[1];
const seq=PS.build(asked&&PS.has(asked)&&document.body.dataset.seq==='fight'?asked:document.body.dataset.seq),total=PS.shownDur(seq);
if(seq.lead){const h=document.querySelector('h1'),p=document.querySelector('.pc-lead');if(h)h.textContent='Fight study: '+seq.title;
  if(p)p.textContent=seq.lead+' A prototype only; the live Pits does not use it.';document.title=seq.title;}
const st={td:0,playing:false,last:0,held:null,passed:{}};
const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const Y=y=>G-y,dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

// every contact, as a list: the short exchange keeps its own fields, the fight lists them
const CL=seq.contactList||[{t:seq.contacts.parry.t,kind:'parry',at:seq.contacts.parry.at,hold:90,
  a:{who:'a',along:seq.contacts.parry.alongA},b:{who:'b',along:seq.contacts.parry.alongB}},{t:seq.tk,kind:'wound',hold:60}];
const NAMES=seq.id==='spring'?'sword and dagger':'the two blades';
// the nearest any part of one fighter (body, arms, weapon) comes to the other's blade at time t
const B_PARTS=['Hd','S','M','P','K','F','bK','bF','E','Hn','oE','oHn','tip'];
function toSeg(p,a,b){const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return [a[0]+vx*u,a[1]+vy*u];}
function clearance(t){
  let best=null;
  for(const [w,o] of seq.id==='spring'?[['a','b']]:[['a','b'],['b','a']]){
    const h=PS.world(seq,w,t,'Hn'),tip=PS.world(seq,w,t,'tip');
    for(const n of B_PARTS){const p=PS.world(seq,o,t,n),q=toSeg(p,h,tip),d=dist(p,q);if(!best||d<best.d)best={d,p,q,n,o};}
  }
  return best;
}
const inContact=t=>CL.some(c=>t>=c.t-90&&t<=c.t+(c.hold||0)+90)||(seq.grips||[]).some(g=>t>=g.t0-40&&t<=g.t1+30);
// smears: where a fast blade has been in the last few hundredths of a second, as one filled shape (a layer that can be off)
function smear(id,t){
  // only the outer half of the blade, and only when the tip is really fast (over about 2 units a millisecond)
  const L=seq.fighters[id].weapon.len;
  const pts=[0,10,20,30].map(d=>({h:PS.world(seq,id,Math.max(0,t-d),'blade',L*.5),p:PS.world(seq,id,Math.max(0,t-d),'tip')}));
  const sp=dist(pts[0].p,pts[3].p);if(sp<60)return '';
  const poly=[...pts.map(x=>x.p),...pts.slice().reverse().map(x=>x.h)].map(p=>p[0].toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ');
  return '<polygon class="pc-smear" style="opacity:'+Math.min(.45,(sp-60)/120+.15).toFixed(2)+'" points="'+poly+'"/>';
}

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
  // each contact point, from the moment it is met until it lets go
  for(const c of CL)if(c.at&&t>=c.t-1&&t<=c.t+Math.max(90,c.hold||0))s+='<circle class="pc-contact" cx="'+c.at[0]+'" cy="'+Y(c.at[1])+'" r="6"/>';
  // the grip on the sword arm, while it is held: a small ring where the hand closes on the forearm
  for(const g of seq.grips||[])if(t>=g.t0&&t<=g.t1){const p=PS.world(seq,g.who,t,'oHn');
    s+='<circle class="pc-grip" cx="'+p[0]+'" cy="'+Y(p[1])+'" r="7"/>';}
  return s;
}
function readout(t){
  const c=clearance(t),pc=CL.find(k=>k.at&&k.a&&k.b&&Math.abs(t-k.t)<1);
  let s='t = '+Math.round(t)+' ms';
  if(pc){
    const a=PS.world(seq,pc.a.who,t,'blade',pc.a.along),b=PS.world(seq,pc.b.who,t,'blade',pc.b.along);
    s+=' · '+pc.kind+': '+NAMES+' '+dist(a,pc.at).toFixed(1)+' and '+dist(b,pc.at).toFixed(1)+' units from the contact point';
  }else if(CL.some(k=>k.at&&k.part&&Math.abs(t-k.t)<1)){const k=CL.find(k=>k.at&&k.part&&Math.abs(t-k.t)<1),a=PS.world(seq,k.a.who,t,'blade',k.a.along);
    s+=' · the blade is '+dist(a,k.at).toFixed(1)+' units from the '+k.part;
  }else if((seq.grips||[]).some(g=>t>=g.t0&&t<=g.t1))s+=' · the sword arm is held at the wrist';
  else if(inContact(t))s+=' · in contact';
  else s+=' · nearest '+(seq.id==='spring'?'the dagger fighter comes to the sword blade':'either fighter comes to the other\'s blade')+': '+c.d.toFixed(0)+' units ('+c.n+')';
  $('pcReadout').textContent=s;
}
function caption(t){
  let cur=seq.marks[0];for(const m of seq.marks)if(t>=m.t)cur=m;
  const who=cur.who==='a'?seq.names.a:cur.who==='b'?seq.names.b:'Both';
  $('pcCaption').innerHTML='<b>'+who+'.</b> '+cur.label;
}
// the shake at shown time td: each powered impact gives a short decaying jolt, deterministic so a still is repeatable
function shake(td){
  let x=0,y=0;
  for(const e of seq.fx){if(!e.power)continue;const dt=td-PS.shownAt(seq,e.t);if(dt<0||dt>260)continue;
    const amp=(e.kind==='wound'?5:3.2)*e.power*Math.exp(-dt/80);
    x+=amp*Math.sin(dt*.11+1);y+=amp*.7*Math.sin(dt*.157+.4);}
  return [x,y];
}
function star(at,cls,r,n){
  const x=at[0],y=Y(at[1]);let s='';
  for(const a of n?Array.from({length:n},(_,i)=>i*360/n+15):[20,80,140,200,260,320]){const c=Math.cos(a*Math.PI/180),n=Math.sin(a*Math.PI/180);
    s+='<line class="'+cls+'" x1="'+(x+c*r*.45)+'" y1="'+(y+n*r*.45)+'" x2="'+(x+c*r)+'" y2="'+(y+n*r)+'"/>';}
  return s;
}
function draw(){
  const t=PS.seqTime(seq,st.td),f=PS.frame(seq,t);
  $('pcFigs').innerHTML=f.a.svg+f.b.svg;
  let fx='';
  if($('pcSmear').checked){
    for(const id of ['a','b'])fx+=smear(id,t);
    // the impact flash: a star that opens out over 170 ms at each contact, bigger for a heavier blow (power), with a
    // bright core while the blow lands; a wound also throws a red spray along the cut
    for(const e of seq.fx){const dt=st.td-PS.shownAt(seq,e.t),pw=e.power||0;if(dt<0||dt>=170)continue;
      if(!pw){fx+=star(e.at,e.kind==='clash'?'pc-clash':'pc-woundfx',10+dt*.08);continue;}
      const r=(12+dt*.12)*pw,cls=e.kind==='clash'?'pc-clash':'pc-woundfx';
      if(dt<70)fx+='<circle class="'+cls+'-core" cx="'+e.at[0]+'" cy="'+Y(e.at[1])+'" r="'+(7*pw*(1-dt/70)+2).toFixed(1)+'"/>';
      fx+=star(e.at,cls,r,e.kind==='clash'?8:12);}
  }
  $('pcFx').innerHTML=fx;
  // the blow shakes the picture: hard while the hit-stop holds, then it dies out (a layer with the flashes)
  const sh=$('pcSmear').checked&&!reduced()?shake(st.td):[0,0];
  $('pcShake').setAttribute('transform',sh[0]||sh[1]?'translate('+sh[0].toFixed(2)+' '+sh[1].toFixed(2)+')':'');
  $('pcInspect').innerHTML=overlays(t);
  $('pcScrub').value=Math.round(st.td);
  $('pcPlay').textContent=st.playing?'Pause':st.held?'Resume':'Play';
  $('pcHold').hidden=!st.held;if(st.held)$('pcHold').textContent='Paused for a decision. '+st.held.label+' Press Resume.';
  caption(t);readout(t);
}
function tick(now){
  if(!st.playing)return;
  const dt=Math.min(50,now-st.last)*(+$('pcSpeed').value)*pace();st.last=now;
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
const pace=()=>seq.pace||1;

// the scrub bar: a tick per caption, a taller one per decision
$('pcScrub').max=Math.round(total);
for(const m of seq.marks){const i=document.createElement('i');i.style.left=(PS.shownAt(seq,m.t)/total*100)+'%';$('pcMarks').appendChild(i);}
for(const p of seq.pauses){const i=document.createElement('i');i.className='stop';i.style.left=(PS.shownAt(seq,p.t)/total*100)+'%';$('pcMarks').appendChild(i);}
// beats: a numbered mark on the bar, and a button for each
for(const b of seq.beats||[]){const i=document.createElement('i');i.className='beat';i.dataset.n=b.n;i.title=b.n+'. '+b.label;
  i.style.left=(PS.shownAt(seq,b.t)/total*100)+'%';$('pcMarks').appendChild(i);}
const GRIP=(seq.grips||[])[0];
const JUMPS=seq.beats?seq.beats.map(b=>[b.n+'. '+b.short,b.t]).concat([['End',seq.end]]):
  [['Parry contact',seq.contacts.parry.t],['Held for the decision',seq.P1],['Sword arm caught',GRIP.t0],['Counter lands',seq.tk],
  ['Arm let go',GRIP.t1+40],['Wound reaction',seq.tk+160],['Sword recovers',seq.tk+300],['End pose',seq.end]];
for(const [label,t] of JUMPS){const b=document.createElement('button');b.type='button';b.textContent=label;
  b.addEventListener('click',()=>seek(PS.shownAt(seq,t)));$('pcJumps').appendChild(b);}

$('pcPlay').addEventListener('click',play);
$('pcBack').addEventListener('click',()=>nudge(-1));$('pcFwd').addEventListener('click',()=>nudge(1));
$('pcScrub').addEventListener('input',e=>seek(+e.target.value));
for(const id of ['pcFeet','pcPath','pcClear','pcSmear'])$(id).addEventListener('change',draw);
// the fight opens with decision stops off, to judge the flow of the whole fight
if(document.body.dataset.decide==='off')$('pcDecide').checked=false;
document.addEventListener('keydown',e=>{
  if(/^(INPUT|SELECT|BUTTON)$/.test(e.target.tagName)&&e.key===' ')return;
  if(e.key===' '){e.preventDefault();play();}
  else if(e.key==='ArrowLeft'){e.preventDefault();nudge(-1);}
  else if(e.key==='ArrowRight'){e.preventDefault();nudge(1);}
});
const fit=()=>$('pcScene').setAttribute('viewBox',window.innerWidth<=600?'395 215 500 275':'330 215 600 257');
fit();window.addEventListener('resize',fit);
// a test or a review script can put the picture on an exact moment (sequence time) and read the state
window.pitsExchange={seq,pace,seek:t=>seek(PS.shownAt(seq,t)),seekShown:seek,play,state:st,clearance,total};
if(!reduced()&&!/[?&]still\b/.test(location.search))play();else draw();
})();
