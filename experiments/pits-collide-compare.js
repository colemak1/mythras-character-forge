// The Pits: collision comparison (owner, 2026-11-14). One seeded test fight is written twice through the live layer
// (pits-spring-live.js), once with the collision rule off and once on (pits-spring.js, collide), and both are played
// side by side on one clock. Presentation only: the outcomes are random test fights, not rolled Mythras.
(function(){
const PM=window.PitsMotion,PS=window.PitsSpring,PL=window.PitsSpringLive;
const $=id=>document.getElementById(id);
const WK={sword:{kind:'blade',len:92},rapier:{kind:'blade',len:112,thin:1},greatsword:{kind:'blade',len:130},
  axe:{kind:'axe',len:84},spear:{kind:'spear',len:150},pike:{kind:'spear',len:230},halberd:{kind:'polearm',len:176}};
const LOCS=['head','chest','abdomen','rarm','larm','rleg','lleg'];
const LOCNAME={head:'head',chest:'chest',abdomen:'abdomen',rarm:'right arm',larm:'left arm',rleg:'right leg',lleg:'left leg'};
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  const c=[a[0]+vx*u,a[1]+vy*u];return {d:Math.hypot(p[0]-c[0],p[1]-c[1]),c};};

// one fight of six exchanges (the same writing as tests/pits-collide.cjs)
function write(wa,wb,seed,collide){
  PS.collide=collide;
  try{
    const R=rng(seed),M={a:PL.fighter('a',WK[wa],false,{}),b:PL.fighter('b',WK[wb],false,{})};
    const gap=PL.gap(WK[wa],WK[wb],'long');let t=0;
    for(const id of ['a','b'])PL.place(M[id],t,gap,'guard');
    PL.pose(M.a,t);
    const w=PL.world(M.a),down={a:false,b:false},steps=[];
    for(let i=0;i<6;i++){
      const aid=R()<.5?'a':'b',did=aid==='a'?'b':'a';
      for(const id of ['a','b'])if(down[id]&&R()<.5){t=PL.stand(M[id],t);down[id]=false;}
      t=PL.intent(M[aid],t,'attack',R());
      const react=down[did]?(R()<.5?'parry':'none'):R()<.5?'parry':R()<.7?'evade':'none';
      if(react!=='none')t=PL.intent(M[did],t,react,R());
      const loc=LOCS[Math.floor(R()*7)],r=R();
      const out=react==='evade'?(r<.5?'evaded':r<.65?'miss':'wound'):react==='none'?(r<.2?'miss':r<.35?'armour':'wound'):
        (r<.45?'parried':r<.6?'partial-parry':r<.7?'miss':r<.8?'armour':'wound');
      const lost=/wound|partial/.test(out)?1+Math.floor(R()*7):0,prone=react==='evade'&&/^(evaded|miss)$/.test(out),leg=lost>0&&/leg$/.test(loc)&&R()<.5;
      const u0=Math.max(0,(t-w.T0)*PL.PACE);
      const b=PL.blow(M,aid,t,{outcome:out,loc,lost,fall:leg||(react==='evade'&&!prone),prone});
      steps.push({u:u0,text:(aid==='a'?'A':'B')+' attacks the '+LOCNAME[loc]+
        '; '+(aid==='a'?'B':'A')+' '+(react==='none'?'does not defend':react==='parry'?'parries':'evades')+': '+out.replace('-',' ')});
      t=b.end;if(prone||leg||(react==='evade'&&!prone))down[did]=true;
    }
    const end=Math.round((t-w.T0)*PL.PACE/2)*2+400;w.S.W.run(end+20);
    const seq={fighters:w.S.F,rec:w.S.W.last(),wounds:[]},cl=w.S.seq.contactList;
    return {seq,end,steps,inC:u=>cl.some(c=>u>=c.t-90&&u<=c.t+(c.hold||0)+90)};
  }finally{PS.collide=false;}
}
// where a blade is inside the other fighter at writer time u (outside a real contact): the points, for the red rings
function crossings(f,u){
  if(f.inC(u))return [];const out=[],q=f.seq;
  for(const id of ['a','b']){const o=id==='a'?'b':'a',P=n=>PS.world(q,id,u,n),O=n=>PS.world(q,o,u,n),hn=P('Hn'),tip=P('tip');
    const h=seg(O('Hd'),hn,tip);if(h.d<13){out.push(h.c);continue;}
    for(const n of ['S','M','P','K','F','bK','bF']){const s=seg(O(n),hn,tip);if(s.d<2){out.push(s.c);break;}}}
  return out;
}
const count=f=>{let n=0;for(let u=0;u<=f.end;u+=8)if(crossings(f,u).length)n++;return n;};

let A=null,B=null,u=0,playing=false,last=0;
const svgY=p=>[p[0],PM.GROUND-p[1]];
function draw(){
  for(const [f,id] of [[A,'ccOff'],[B,'ccOn']]){
    const fr=PS.frame(f.seq,Math.min(u,f.end));
    const rings=crossings(f,Math.round(Math.min(u,f.end)/2)*2).map(p=>{const s=svgY(p);return '<circle class="cc-hit" cx="'+s[0].toFixed(1)+'" cy="'+s[1].toFixed(1)+'" r="9"/>';}).join('');
    $(id).innerHTML='<rect class="ps-floorfill" x="-2400" y="'+PM.GROUND+'" width="6000" height="400"/><line class="ps-floor" x1="-2400" x2="3600" y1="'+PM.GROUND+'" y2="'+PM.GROUND+'"/>'
      +'<g class="ps-figs">'+fr.a.svg+fr.b.svg+'</g>'+rings;
  }
  const end=Math.max(A.end,B.end);$('ccScrub').value=Math.round(u/end*1000);
  const st=[...A.steps].reverse().find(s=>s.u<=u)||A.steps[0];
  $('ccReadout').textContent=(u/PL.PACE/1000).toFixed(2)+' s of '+(end/PL.PACE/1000).toFixed(2)+' s. '+(st?st.text:'');
}
function tick(now){
  if(!playing)return;const dt=Math.min(50,now-last);last=now;
  u+=dt*PL.PACE*(+$('ccSpeed').value);const end=Math.max(A.end,B.end);
  if(u>=end){if($('ccLoop').checked)u=0;else{u=end;setPlaying(false);}}
  draw();requestAnimationFrame(tick);
}
function setPlaying(on){playing=on;$('ccPlay').textContent=on?'Pause':'Play';if(on){last=performance.now();requestAnimationFrame(tick);}}
function build(){
  setPlaying(false);const [wa,wb]=$('ccPair').value.split(','),seed=+$('ccSeed').value;
  $('ccReadout').textContent='Writing the fight…';
  setTimeout(()=>{
    A=write(wa,wb,seed,false);B=write(wa,wb,seed,true);u=0;
    // both scenes framed on the fighters' stations
    const xs=['a','b'].map(id=>A.seq.fighters[id].hx),x0=Math.min(...xs)-170,x1=Math.max(...xs)+170;
    for(const id of ['ccOff','ccOn'])$(id).setAttribute('viewBox',x0+' '+(PM.GROUND-235)+' '+(x1-x0)+' 257');
    const nA=count(A),nB=count(B);
    $('ccOffN').textContent=nA+' frames with a blade inside the other fighter.';
    $('ccOnN').textContent=nB+' frames with a blade inside the other fighter.';
    draw();setPlaying(true);
  },20);
}
for(let i=1;i<=8;i++){const o=document.createElement('option');o.value=String(i);o.textContent=String(i);$('ccSeed').appendChild(o);}
$('ccPair').addEventListener('change',build);$('ccSeed').addEventListener('change',build);
$('ccPlay').addEventListener('click',()=>setPlaying(!playing));
const stepBy=d=>{setPlaying(false);u=Math.max(0,Math.min(Math.max(A.end,B.end),u+d*1000/60*PL.PACE));draw();};
$('ccBack').addEventListener('click',()=>stepBy(-1));$('ccFwd').addEventListener('click',()=>stepBy(1));
$('ccScrub').addEventListener('input',e=>{setPlaying(false);u=e.target.value/1000*Math.max(A.end,B.end);draw();});
document.addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('select,input'))return;
  if(e.key===' '){e.preventDefault();setPlaying(!playing);}else if(e.key==='ArrowLeft')stepBy(-1);else if(e.key==='ArrowRight')stepBy(1);});
build();
})();
