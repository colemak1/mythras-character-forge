// A failed parry is seen tried (batch (c), owner 2026-11-16: "a visible failed parry"). What is held here: the guard
// moves toward the blow in the last moments before it lands (late, on the wrong line, or a shield pushed out short),
// no steel meets (the defender's weapon or shield stays clear of the attacking weapon at the contact), the blow still
// lands where the engine says, bodies stay possible and nothing jumps, all three ways are used, and the same exchange
// key gives the same way (the replay repeats the live one). Whether it reads at speed is for the owner's eye
// (frame sheet: docs/pits-visual-checks/cine-parry-failed.jpg).
const assert=require('node:assert/strict');
const C=require('../experiments/pits-cine.js');
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
C.keep(0);
const WK={sword:{kind:'blade',len:92},dagger:{kind:'blade',len:50},rapier:{kind:'blade',len:112,thin:1},mace:{kind:'club',len:70},
  spear:{kind:'spear',len:150},greatsword:{kind:'blade',len:130,hands:2},halberd:{kind:'polearm',len:176},quarterstaff:{kind:'staff',len:132}};
const LOCS=['head','chest','abdomen','rarm','larm','rleg','lleg'];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// the nearest two segments come to each other (sampled)
const segGap=(a0,a1,b0,b1)=>{let m=1e9;for(let i=0;i<=20;i++)for(let k=0;k<=20;k++){
  const p=[a0[0]+(a1[0]-a0[0])*i/20,a0[1]+(a1[1]-a0[1])*i/20],q=[b0[0]+(b1[0]-b0[0])*k/20,b0[1]+(b1[1]-b0[1])*k/20];m=Math.min(m,dist(p,q));}return m;};
function pair(wa,wb,u,shield,seed){
  C.fixChoices(u);
  const M={a:C.fighter('a',WK[wa],false,{}),b:C.fighter('b',WK[wb],false,shield?{shield:true}:{})};
  if(seed!=null){M.a.pair.seed=seed;M.a.pair.n=0;}
  const g=C.gap(WK[wa],WK[wb],'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
  return M;
}
function possible(m,t,what){
  const j=C.joints(m,t),D=C.DIM;
  for(const [a,b,len] of [['P','K',D.thigh],['K','F',D.shin],['P','bK',D.thigh],['bK','bF',D.shin],['wS','E',D.upper],['E','Hn',D.fore],['oS','oE',D.upper],['oE','oHn',D.fore]])
    assert(Math.abs(dist(j[a],j[b])-len)<.6,what+': '+a+'-'+b+' is '+dist(j[a],j[b]).toFixed(1)+' long at '+t);
  for(const k of ['F','bF','K','bK','P','Hn','oHn','Hd','tip'])assert(j[k][1]>=-1,what+': '+k+' is under the floor at '+t);
}
function sound(M,t0,t1,what){
  let prev=null;
  for(let t=t0;t<=t1;t+=4){
    possible(M.a,t,what);possible(M.b,t,what);
    const a=C.joints(M.a,t),b=C.joints(M.b,t);
    if(prev)for(const [x,y] of [[a,prev.a],[b,prev.b]])for(const k of ['P','Hd','F','bF'])
      assert(dist(x[k],y[k])<46,what+': '+k+' jumps '+dist(x[k],y[k]).toFixed(0)+' in 4 ms at '+(t-t0));
    prev={a,b};
  }
}

test('a failed parry moves toward the blow, meets no steel, and the blow lands',()=>{
  const ways=new Set();let n=0;
  for(const wa of Object.keys(WK))for(const wb of Object.keys(WK))for(const loc of LOCS)for(const sh of [false,true]){
    if(sh&&WK[wb].hands)continue;
    for(const u of [.1,.6]){
      const M=pair(wa,wb,u,sh),what=wa+' hits '+wb+(sh?'+shield':'')+' at '+loc+' (u '+u+')',t=100;
      const r=C.blow(M,'a',t,{outcome:'wound',loc,lost:3,tried:sh?'shield':'parry'});
      C.fixChoices(null);n++;
      assert(['late','wrong','short'].includes(r.tried),what+': no way chosen ('+r.tried+')');ways.add(r.tried);
      if(sh)assert.equal(r.tried,'short',what+': a shield is pushed out short');
      sound(M,t,r.end+100,what);
      const tc=r.contacts[0].t,b0=C.joints(M.b,t),b1=C.joints(M.b,tc);
      // seen tried: the guard hand (or the shield hand) travels, or the weapon turns, between the start of the blow and
      // its contact (late: still on its way; wrong: set on the other line)
      const hand=sh?'oHn':'Hn',moved=dist(b0[hand],b1[hand]),turned=Math.abs(b1.w-b0.w);
      assert(moved>=10||turned>=25,what+': the parry is not seen ('+moved.toFixed(0)+' units, '+turned.toFixed(0)+' deg)');
      // no steel meets: the defence is clear of the attacking weapon at the contact
      const a=C.joints(M.a,tc);
      // (a blow to an arm on the parrying weapon lands by its grip: the blade is measured beyond the hands; a
      // blow to the arm behind the shield is not measured, the rim is on that arm)
      const out=/arm/.test(loc)?.35:0,from=[b1.Hn[0]+(b1.tip[0]-b1.Hn[0])*out,b1.Hn[1]+(b1.tip[1]-b1.Hn[1])*out];
      const gap=sh?(loc==='larm'?99:segGap(a.Hn,a.tip,b1.oHn,b1.oHn)-C.SHIELD_R.heater):segGap(a.Hn,a.tip,from,b1.tip);
      assert(gap>2,what+': the attempt meets the attacking weapon ('+gap.toFixed(1)+')');
      assert.equal(r.contacts[0].kind,'hit',what+': the blow lands');
      // the attempt is quick, not a snap: the hands move no faster than in a blow's recoil
      for(let tt=t+4;tt<=tc+40;tt+=4){const x=C.joints(M.b,tt),y=C.joints(M.b,tt-4);
        assert(dist(x.Hn,y.Hn)<46&&dist(x.oHn,y.oHn)<64,what+': a hand snaps at '+(tt-t));}
    }
  }
  assert(ways.has('late')&&ways.has('wrong')&&ways.has('short'),'all three ways are used: '+[...ways]);
  console.log('  '+n+' failed parries');
});

test('a failed parry from the ground: the arm comes up late',()=>{
  for(const wb of ['sword','spear','dagger'])for(const sh of [false,true]){
    const M=pair('sword',wb,.3,sh),what='sword hits '+wb+(sh?'+shield':'')+' on the ground';
    C.fall(M.b,100);
    const r=C.blow(M,'a',800,{outcome:'wound',loc:'chest',lost:2,tried:sh?'shield':'parry'});C.fixChoices(null);
    assert.equal(r.tried,'late',what);
    sound(M,800,r.end+100,what);
    const tc=r.contacts[0].t,h=sh?'oHn':'Hn',b0=C.joints(M.b,tc-130),b1=C.joints(M.b,tc);
    assert(dist(b0[h],b1[h])>=10||Math.abs(b1.w-b0.w)>=25,what+': the arm does not come up');
  }
});

test('the same exchange key gives the same way (the replay repeats the live one)',()=>{
  for(const loc of LOCS)for(const seed of [11,222,3333]){
    const run=()=>{const M=pair('sword','sword',null,false,seed);return C.blow(M,'a',100,{outcome:'wound',loc,lost:3,tried:'parry',key:7}).tried;};
    assert.equal(run(),run(),loc+' seed '+seed);
  }
});

test('without a failed parry, nothing changes: the guard is not moved',()=>{
  const M=pair('sword','sword',.1,false),r=C.blow(M,'a',100,{outcome:'wound',loc:'chest',lost:3});C.fixChoices(null);
  assert.equal(r.tried,undefined);
});

console.log(passed+' passed');
