const assert=require('node:assert/strict');
const C=require('../experiments/pits-cine.js');
const sword={kind:'blade',len:92};
function fighters(){
  const pair={a:C.fighter('a',sword,false,{}),b:C.fighter('b',sword,false,{})};
  for(const fighter of Object.values(pair))C.place(fighter,0,210,'guard');
  return pair;
}
const live=fighters(),replay=fighters();
let start=0;
for(const [index,facts] of [
  {outcome:'partial-parry',loc:'chest',lost:3,press:true},
  {outcome:'wound',loc:'lleg',lost:2,trip:{fell:true}},
  {outcome:'wound',loc:'head',lost:8,defeated:true},
].entries()){
  const actor=index===1?'b':'a';
  const previous=Object.values(live).map(m=>C.joints(m,start));
  C.intent(live[actor],start,'attack');
  const clip=C.authorTimeline(live,start,start+250,(M,t)=>C.exchange(M,actor,t,{...facts,key:index}));
  const r=C.playTimeline(live,clip,start);
  C.playTimeline(replay,JSON.parse(JSON.stringify(clip)),start+10000);
  for(const [i,id] of ['a','b'].entries()){
    assert.deepEqual(C.joints(live[id],start),previous[i],'opening pose '+id);
    for(let t=start;t<=r.end;t+=17)assert.deepEqual(C.joints(live[id],t),C.joints(replay[id],t+10000),'frame '+t);
  }
  start=r.end;
}
console.log('PASS three chained exchanges preserve both opening poses and reproduce both tracks on a different replay clock');
