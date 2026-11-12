// The full sweep (step 4 of "Path to the live Pits"): every weapon with a family against every other, one exchange
// each for every hit location and result, checked against the movement rules. Too slow for CI (several minutes);
// run by hand after changing the writer:  node tests/sweep/pits-sweep.cjs [weapon,weapon,...]
// CI runs a sample of it (tests/pits-writer.cjs).
const PW=require('../../experiments/pits-writer.js');
const {fault,LOCS}=require('../lib/pits-motion-rules.cjs');
const W=(process.argv[2]||'dagger,shortsword,rapier,sword,longsword,falchion').split(',');
const OUT=[['parried',0],['wound',3],['armour',0],['miss',0]];
let bad=0,n=0;
for(const wa of W)for(const wb of W){const f=[];
  for(const loc of LOCS)for(const [o,lost] of OUT){n++;
    const q=PW.write([{attacker:'a',loc,outcome:o,lost}],{weapons:{a:wa,b:wb}}),e=fault(q,8);
    if(e)f.push(loc+' '+o+' ('+q.exchanges[0].phrase+'): '+e);}
  bad+=f.length;console.log((f.length?'FAIL ':'PASS ')+wa+' against '+wb+(f.length?'\n  '+f.join('\n  '):''));}
console.log(n+' fights, '+bad+' with a fault');process.exit(bad?1:0);
