// The look of the cinematic stage is locked (owner, 2026-11-16: "THE LOOK IS LOCKED"). The owner approved the stage
// exactly as it is: silhouettes, camera, pace, easing, impact frames, leaps, hit-stops. Fixes to wrong states,
// contacts and equipment must not change any move the audit (docs/pits-cinematic-bug-audit-20261115.md) does not
// call wrong. This test records, for each move blow() returns (r.move), the sampled joints and contact times of
// cases the audit does not call wrong: standing fighters, a one-handed sword (a broadsword and a short sword, so the
// cut and the thrust moves are both covered), no shield; a wound, a parry, a miss, an evade and the finishing blow,
// declared live (intent, hold, resolve) and played straight through as in the replay.
//
// Keyed by move, not by seed order: every choice is made with one fixed value (PitsCine.fixChoices), so a change to
// the seed schedule (CA-09) cannot move a recorded case. Any change to the recorded values needs the owner's OK,
// stated in the PR. To re-record (only with that OK): node tests/pits-cine-look.cjs --record
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../experiments/pits-cine.js');
const FILE=path.join(__dirname,'fixtures','pits-cine-look.json');
const RECORD=process.argv.includes('--record');
C.keep(0);
const WK={broadsword:{kind:'blade',len:92},shortsword:{kind:'blade',len:68}};
const U=[.05,.35,.65,.95];
const CASES=[
  ...['chest','head','abdomen','rarm','lleg'].map(loc=>({name:'wound-'+loc,s:{outcome:'wound',loc,lost:4}})),
  {name:'parry',s:{outcome:'parried',loc:'chest',lost:0},def:'parry'},
  {name:'miss',s:{outcome:'miss',loc:'chest',lost:0}},
  {name:'evade',s:{outcome:'evaded',loc:'chest',lost:0},def:'evade'},
  ...['chest','head'].map(loc=>({name:'finish-'+loc,s:{outcome:'wound',loc,lost:9,defeated:true}})),
];
const JOINTS=['P','Hd','Hn','tip','F','bF'],STEP=60,W=JOINTS.length*2*2;   // values per sampled frame (both fighters)
function run(wname,mode,c,u){
  C.fixChoices(u);
  const wk=WK[wname];
  const M={a:C.fighter('a',wk,false,{}),b:C.fighter('b',wk,false,{})};
  const g=C.gap(wk,wk,'long');C.place(M.a,0,g,'guard');C.place(M.b,0,g,'guard');
  let t=100;
  if(mode==='live'){C.intent(M.a,t,'attack',.5);if(c.def)C.intent(M.b,t+300,c.def,.5);t=1200;}
  const r=C.blow(M,'a',t,{...c.s,flow:mode==='replay'});
  const frames=[];
  for(let x=t;x<=r.end+300;x+=STEP)for(const id of ['a','b']){const j=C.joints(M[id],x);for(const k of JOINTS)frames.push(Math.round(j[k][0]),Math.round(j[k][1]));}
  C.fixChoices(null);
  return {move:r.move,contacts:r.contacts.map(k=>[k.t-t,k.kind]),end:r.end-t,frames};
}
const now={};
for(const w of Object.keys(WK))for(const mode of ['live','replay'])for(const c of CASES)for(const u of U){
  const r=run(w,mode,c,u);now[r.move+'|'+w+'|'+mode+'|'+c.name+'|u'+u]=r;
}
if(RECORD){
  const out={note:'Locked look of the cinematic stage. Change only with the owner\'s OK, stated in the PR (tests/pits-cine-look.cjs).',cases:{}};
  // (stored as the change from the frame before, to keep the file small)
  const enc=f=>f.map((v,i)=>i<W?v:v-f[i-W]).join(',');
  for(const k of Object.keys(now).sort())out.cases[k]={contacts:now[k].contacts,end:now[k].end,frames:enc(now[k].frames)};
  fs.writeFileSync(FILE,JSON.stringify(out,null,0).replace(/\},"/g,'},\n"')+'\n');
  console.log('recorded '+Object.keys(now).length+' cases to '+path.relative(process.cwd(),FILE));
  process.exit(0);
}
const lock=JSON.parse(fs.readFileSync(FILE,'utf8')).cases;
let passed=0;
const moves=new Set(Object.keys(lock).map(k=>k.split('|')[0]));
// every move the lock knows is still produced, and every case still produces the move it was recorded under
for(const k of Object.keys(lock)){
  const got=now[k];
  assert(got,'locked case '+k+' no longer produces its move (now: '+Object.keys(now).filter(n=>n.slice(n.indexOf('|'))===k.slice(k.indexOf('|'))).join(', ')+')');
  const L=lock[k];
  assert.deepEqual(got.contacts,L.contacts,k+': contact times changed');
  assert.equal(got.end,L.end,k+': the movement now ends at '+got.end+' ms (locked '+L.end+')');
  const f=L.frames.split(',').map(Number);for(let i=W;i<f.length;i++)f[i]+=f[i-W];
  assert.equal(got.frames.length,f.length,k+': sampled length changed');
  for(let i=0;i<f.length;i++)if(Math.abs(got.frames[i]-f[i])>1){
    const fi=Math.floor(i/W),rest=i%W,who=rest<JOINTS.length*2?'a':'b',ji=Math.floor((rest%(JOINTS.length*2))/2);
    assert.fail(k+': '+who+' '+JOINTS[ji]+' moved at '+(fi*STEP)+' ms after the blow ('+f[i]+' locked, '+got.frames[i]+' now)');
  }
  passed++;
}
assert.equal(Object.keys(now).length,Object.keys(lock).length,'the set of locked cases changed');
for(const m of ['over','rise','spin','lunge','stab'])assert(moves.has(m),'the lock has no case for the move '+m);
console.log('PASS the look is unchanged: '+passed+' cases, moves '+[...moves].sort().join(', '));
