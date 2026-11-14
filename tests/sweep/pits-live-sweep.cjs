// The live flow, swept headless: whole fights driven through the same interface the stage uses (pits-spring-live.js:
// a declared attack, a declared defence, the resolved blow; falls, getting up), from wherever the last exchange left
// both fighters, and checked against the movement rules (tests/lib/pits-motion-rules.cjs) plus two of its own for the
// moments the picture holds still while a person decides or the dice roll:
//   - a frozen blade is not across its owner's head, and not through the other fighter's body.
// The studies' sweep (pits-sweep.cjs) checks single exchanges from guard; this one checks what real play does.
// Not in CI (minutes). Run by hand after changing the writer, the phrases or the live layer:
//   node tests/sweep/pits-live-sweep.cjs [fights per pairing=6] [exchanges per fight=6] [weapon,weapon,...]
// It prints each fault and a count by kind. The count is the number to drive down; it is not zero yet.
const PL=require('../../experiments/pits-spring-live.js'),PS=require('../../experiments/pits-spring.js');
const {fault}=require('../lib/pits-motion-rules.cjs');
const N=+(process.argv[2]||6),X=+(process.argv[3]||6);
const WK={dagger:{kind:'blade',len:50},shortsword:{kind:'blade',len:68},rapier:{kind:'blade',len:112,thin:1},sword:{kind:'blade',len:92},
  longsword:{kind:'blade',len:104},falchion:{kind:'blade',len:84},mace:{kind:'club',len:70},axe:{kind:'axe',len:84},
  // every other weapon in the Pits (stand-ins on the cut and thrust phrases, 2026-11-14)
  'battleaxe-2h':{kind:'axe',len:90,two:1},'longsword-2h':{kind:'blade',len:118},greatsword:{kind:'blade',len:130},
  'great-axe':{kind:'axe',len:120},'great-hammer':{kind:'club',len:118},quarterstaff:{kind:'staff',len:132},
  halberd:{kind:'polearm',len:176},flail:{kind:'chain',len:84},'military-flail':{kind:'chain',len:110},whip:{kind:'whip',len:150},
  net:{kind:'net',len:70},spear:{kind:'spear',len:150},trident:{kind:'trident',len:150},longspear:{kind:'spear',len:190},pike:{kind:'spear',len:230}};
const W=(process.argv[4]||'sword,dagger,rapier,longsword,mace').split(',');
const LOCS=['head','chest','abdomen','rarm','larm','rleg','lleg'];
const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const seg=(p,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],u=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vy)/(vx*vx+vy*vy||1)));
  return Math.hypot(p[0]-(a[0]+vx*u),p[1]-(a[1]+vy*u));};
const BODY=['Hd','S','M','P','K','F','bK','bF','E'];
function fight(wa,wb,shield,seed){
  const R=rng(seed),M={a:PL.fighter('a',WK[wa],false,{shield}),b:PL.fighter('b',WK[wb],false,{shield})};
  const gap=PL.gap(WK[wa],WK[wb],'long');let t=0;const frozen=[],log=[];
  for(const id of ['a','b'])PL.place(M[id],t,gap,'guard');
  PL.pose(M.a,t);                                              // (the first drawing makes the pair's world)
  const w=PL.world(M.a),F=w.S.F,tau=x=>(x-w.T0)*PL.PACE,down={a:false,b:false};
  // the frozen picture at stage time x: each blade against its owner's head and the other's body
  const hold=(x,what)=>{const u=Math.round(tau(x)/2)*2,q={fighters:F,rec:w.S.W.last()};
    for(const id of ['a','b']){const o=id==='a'?'b':'a',P=n=>PS.world(q,id,u,n),hd=P('Hd'),hn=P('Hn'),tip=P('tip');
      if(!down[id]&&seg(hd,hn,tip)<17){frozen.push(what+': '+id+'\'s weapon is held across its own head');
        if(process.env.DEBUG)console.log('   DEBUG',what,id,'d',seg(hd,hn,tip).toFixed(1),'live down',JSON.stringify(w.down||{}),'sweep down',JSON.stringify(down),'grounded',F[id].grounded,'after',log[log.length-1]);}
      for(const n of BODY)if(seg(PS.world(q,o,u,n),hn,tip)<2){frozen.push(what+': '+id+'\'s weapon is held through '+o+'.'+n);break;}}};
  let over=false;
  for(let i=0;i<X&&!over;i++){
    const aid=R()<.5?'a':'b',did=aid==='a'?'b':'a';
    // a fighter on the floor may get up first
    for(const id of ['a','b'])if(down[id]&&R()<.5){t=PL.stand(M[id],t);down[id]=false;hold(t,'after getting up');}
    t=PL.intent(M[aid],t,'attack',R());hold(t,'attack declared');
    const react=down[did]?(R()<.5?'parry':'none'):R()<.45?'parry':R()<.6?(shield?'shield':'parry'):R()<.8?'evade':'none';
    if(react!=='none'){t=PL.intent(M[did],t,react,R());hold(t,react+' declared');}
    const loc=LOCS[Math.floor(R()*7)],r=R(),last=i===X-1&&R()<.5;
    const out=react==='evade'?(r<.5?'evaded':r<.65?'miss':'wound'):react==='none'?(r<.2?'miss':r<.35?'armour':'wound'):
      (r<.45?(react==='shield'?'full-ward':'parried'):r<.6?'partial-parry':r<.7?'miss':r<.8?'armour':'wound');
    const lost=/wound|partial/.test(out)?1+Math.floor(R()*7):0,defeated=last&&lost>0;
    const prone=react==='evade'&&/^(evaded|miss)$/.test(out),leg=lost>0&&/leg$/.test(loc)&&R()<.5;
    const b=PL.blow(M,aid,t,{outcome:out,loc,lost,shield:react==='shield',fall:(leg||(react==='evade'&&!prone))&&!defeated,defeated,prone});
    log.push(aid+' '+react+' '+out+' '+loc+(defeated?' END':''));
    t=b.end;if(prone||leg||(react==='evade'&&!prone))down[did]=true;if(defeated)over=true;else hold(t,'after '+out+' ('+b.phrase+')');
  }
  const end=Math.round(tau(t)/2)*2+400;
  w.S.W.run(end+20);
  const q={fighters:F,rec:w.S.W.last(),contactList:w.S.seq.contactList,pauses:[],dur:end};
  let e=null;try{e=fault(q,8);}catch(err){e='error: '+err.message;}
  return {e,frozen:[...new Set(frozen)],log};
}
const kinds={};let n=0,bad=0,seed=1;
const kind=e=>e.replace(/-?\d+(\.\d+)?/g,'N').replace(/\b[ab]\b(?=[.'])/g,'X').replace(/ at N.*$/,'');
for(let i=0;i<W.length;i++)for(let j=i;j<W.length;j++)for(const sh of [false,true]){
  if(sh&&(i+j)%2)continue;                                     // (half the pairings also with shields)
  const f=[];
  for(let k=0;k<N;k++){n++;const r=fight(W[i],W[j],sh,seed++),all=[...(r.e?[r.e]:[]),...r.frozen];
    if(all.length){bad++;f.push('seed '+(seed-1)+': '+all.join('; ')+'\n      ['+r.log.join(' | ')+']');for(const x of all)kinds[kind(x)]=(kinds[kind(x)]||0)+1;}}
  console.log((f.length?'FAIL ':'PASS ')+W[i]+' against '+W[j]+(sh?', both with shields':'')+(f.length?' ('+f.length+' of '+N+')\n    '+f.join('\n    '):''));
}
console.log('\n'+n+' fights of up to '+X+' exchanges, '+bad+' with a fault. By kind:');
for(const [k,v] of Object.entries(kinds).sort((a,b)=>b[1]-a[1]))console.log(String(v).padStart(5)+'  '+k);
