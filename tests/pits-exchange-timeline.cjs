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

// Owner, 2026-11-18 (report 20261118-180306): "the replay ... lost its fluidity". A clip recorded live holds still
// while a person decides and the dice roll; the replay cuts that stillness and plays the rest unchanged.
{
  const M=fighters();
  C.intent(M.a,100,'attack');C.intent(M.b,700,'parry');           // declared, then held for the dice
  const clip=C.authorTimeline(M,100,3100,(pair,t)=>C.exchange(pair,'a',t,{outcome:'wound',loc:'larm',lost:4,key:7}));
  const q=C.squeezeTimeline(JSON.parse(JSON.stringify(clip)));
  assert(q.resolve<900,'the 3 s of waiting is cut back (resolve at '+q.resolve+')');
  const live=fighters(),replay=fighters();
  C.playTimeline(live,clip,0);C.playTimeline(replay,q,0);
  // the declared wind-up is still drawn, as it was live
  for(let t=0;t<=230;t+=10)assert.deepEqual(C.joints(replay.a,t),C.joints(live.a,t),'wind-up frame '+t);
  // the blow and everything after it is the live movement, only earlier
  const d=clip.resolve-q.resolve,end=clip.result.end;
  for(const id of ['a','b'])for(let t=clip.resolve;t<=end;t+=13)assert.deepEqual(C.joints(replay[id],t-d),C.joints(live[id],t),id+' frame '+t);
  assert.equal(q.result.contacts[0].t,clip.result.contacts[0].t-d,'the contact comes with it');
  // nowhere in the replayed clip do both figures stand still longer than the kept beat
  let still=0,worst=0,prev=null;
  for(let t=0;t<=q.result.end;t+=10){const j=['a','b'].map(id=>JSON.stringify(C.joints(replay[id],t)));
    if(prev&&j[0]===prev[0]&&j[1]===prev[1])still+=10;else still=0;worst=Math.max(worst,still);prev=j;}
  assert(worst<=200,'longest stillness '+worst+' ms');
  // a clip with nothing to wait on is left alone
  const N=fighters(),plain=C.authorTimeline(N,0,0,(pair,t)=>C.exchange(pair,'a',t,{outcome:'parried',loc:'chest',key:8}));
  assert.equal(C.squeezeTimeline(plain),plain);
  console.log('PASS the replay cuts the waiting for decisions and dice; the blow itself is unchanged');
}
{
  const st=require('node:fs').readFileSync(require('node:path').join(__dirname,'../experiments/pits-stage.js'),'utf8');
  assert(/const clip=replay\?PitsCine\.squeezeTimeline\(saved\.clip\):/.test(st),'the stage replays the squeezed clip');
  console.log('PASS the stage replays each recorded exchange without its waiting');
}
