// Movement study page: plays the sequences written in pits-motion.js. Presentation only.
// The picture is a function of the time on the bar, so any moment can be stopped on and stepped through.
(function(){
const PM=window.PitsMotion,$=id=>document.getElementById(id);
const ORDER=['fight','press'],FRAME=1000/60;
const st={seq:null,td:0,playing:false,last:0,held:null,passed:{}};
const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

function load(id){
  st.seq=PM.build(id);st.td=0;st.playing=false;st.held=null;st.passed={};
  for(const b of $('pcTabs').children)b.setAttribute('aria-selected',b.dataset.id===id?'true':'false');
  const total=PM.shownDur(st.seq),marks=$('pcMarks');marks.innerHTML='';
  $('pcScrub').max=Math.round(total);
  const tick=(t,cls)=>{const i=document.createElement('i');i.className=cls||'';i.style.left=(PM.shownAt(st.seq,t)/total*100)+'%';marks.appendChild(i);};
  for(const m of st.seq.marks)tick(m.t);
  for(const p of st.seq.pauses)tick(p.t,'stop');
  // one button per exchange: each starts from the pose the last one ended in, so any of them can be watched alone
  const ex=$('pcExchanges');ex.innerHTML='';ex.hidden=st.seq.exchanges.length<2;
  st.seq.exchanges.forEach((e,i)=>{
    const b=document.createElement('button');b.type='button';
    b.textContent=(i+1)+'. '+e.label+' ('+(e.attacker==='a'?'sword':'dagger')+' attacks)';
    b.addEventListener('click',()=>{st.td=PM.shownAt(st.seq,e.t);st.held=null;st.passed={};st.playing=false;play();});
    ex.appendChild(b);
  });
  draw();
}
function caption(t){
  let cur=st.seq.marks[0];for(const m of st.seq.marks)if(t>=m.t)cur=m;
  const who=cur.who==='a'?'Sword':cur.who==='b'?'Dagger':'Both';
  $('pcCaption').innerHTML='<b>'+who+'.</b> '+cur.label;
}
function star(at,cls,r){
  const x=at[0],y=PM.GROUND-at[1];let s='';
  for(const a of [20,80,140,200,260,320]){const c=Math.cos(a*Math.PI/180),n=Math.sin(a*Math.PI/180);
    s+='<line class="'+cls+'" x1="'+(x+c*r*.45)+'" y1="'+(y+n*r*.45)+'" x2="'+(x+c*r)+'" y2="'+(y+n*r)+'"/>';}
  return s;
}
function paths(t){
  // where each point has been in the last 450 ms, and which feet are on the floor now
  let s='';
  for(const id of ['a','b']){
    const f=st.seq.fighters[id],pts=[];
    for(let u=Math.max(0,t-450);u<=t;u+=15){const w=f.at(u,'tip');pts.push(w[0].toFixed(1)+','+(PM.GROUND-w[1]).toFixed(1));}
    s+='<polyline class="pc-tip '+id+'" points="'+pts.join(' ')+'"/>';
    const p=f.pose(t);
    for(const foot of ['ff','bf'])if(p[foot+'y']<.5){const x=f.hx+f.face*p[foot+'x'];
      s+='<line class="pc-plant" x1="'+(x-7)+'" x2="'+(x+7)+'" y1="'+(PM.GROUND+6)+'" y2="'+(PM.GROUND+6)+'"/>';}
  }
  return s;
}
function draw(){
  const seq=st.seq,t=PM.seqTime(seq,st.td),f=PM.frame(seq,t);
  $('pcFigs').innerHTML=f.a.svg+f.b.svg;
  let fx='';
  for(const e of seq.fx){const dt=st.td-PM.shownAt(seq,e.t);
    if(dt>=0&&dt<170)fx+=star(e.at,e.kind==='clash'?'pc-clash':'pc-woundfx',10+dt*.08);}
  $('pcFx').innerHTML=fx;
  $('pcPaths').innerHTML=$('pcPath').checked?paths(t):'';
  $('pcScrub').value=Math.round(st.td);
  $('pcPlay').textContent=st.playing?'Pause':st.held?'Resume':'Play';
  $('pcHold').hidden=!st.held;if(st.held)$('pcHold').textContent='Paused for a decision. '+st.held.label+' Press Resume.';
  caption(t);
}
function tick(now){
  if(!st.playing)return;
  const total=PM.shownDur(st.seq),dt=Math.min(50,now-st.last)*(+$('pcSpeed').value);st.last=now;
  let td=st.td+dt;
  if($('pcDecide').checked)for(const p of st.seq.pauses){
    const at=PM.shownAt(st.seq,p.t);
    if(!st.passed[p.t]&&st.td<at&&td>=at){td=at;st.playing=false;st.held=p;st.passed[p.t]=true;}
  }
  if(td>=total){
    if($('pcLoop').checked){td=0;st.passed={};}else{td=total;st.playing=false;}
  }
  st.td=td;draw();
  if(st.playing)requestAnimationFrame(tick);
}
function play(){
  if(st.playing){st.playing=false;draw();return;}
  if(st.td>=PM.shownDur(st.seq)-1){st.td=0;st.passed={};}
  st.held=null;st.playing=true;st.last=performance.now();draw();requestAnimationFrame(tick);
}
function nudge(d){st.playing=false;st.held=null;st.td=Math.max(0,Math.min(PM.shownDur(st.seq),st.td+d*FRAME));draw();}

for(const id of ORDER){
  const b=document.createElement('button');b.type='button';b.dataset.id=id;b.setAttribute('role','tab');
  b.textContent=PM.build(id).title;b.addEventListener('click',()=>load(id));$('pcTabs').appendChild(b);
}
$('pcPlay').addEventListener('click',play);
$('pcBack').addEventListener('click',()=>nudge(-1));$('pcFwd').addEventListener('click',()=>nudge(1));
$('pcScrub').addEventListener('input',e=>{st.playing=false;st.held=null;st.passed={};st.td=+e.target.value;draw();});
$('pcPath').addEventListener('change',draw);
document.addEventListener('keydown',e=>{
  if(/^(INPUT|SELECT|BUTTON)$/.test(e.target.tagName)&&e.key===' ')return;
  if(e.key===' '){e.preventDefault();play();}
  else if(e.key==='ArrowLeft'){e.preventDefault();nudge(-1);}
  else if(e.key==='ArrowRight'){e.preventDefault();nudge(1);}
});
// frame the pair tighter on a narrow screen
const fit=()=>$('pcScene').setAttribute('viewBox',window.innerWidth<=600?'395 215 500 275':'330 215 600 257');
fit();window.addEventListener('resize',fit);
const want=(/[?&]seq=(\w+)/.exec(location.search)||[])[1];
load(ORDER.includes(want)?want:'fight');
// a test or a review script can put the picture on an exact moment
window.pitsChoreography={load,seek(td){st.playing=false;st.held=null;st.td=td;draw();},state:st};
if(!reduced()&&!/[?&]still\b/.test(location.search))play();
})();
