// The full sweep (step 4 of "Path to the live Pits"): every weapon with a family against every other, one exchange
// each for every hit location and result, checked against the movement rules; then the same pairings with shields.
// Too slow for CI (about ten minutes); run by hand after changing the writer:
//   node tests/sweep/pits-sweep.cjs [weapon,weapon,...] [--no-shields] [--attacker=weapon]
// (--attacker runs one attacking weapon's share, for a machine short of memory or time)
// CI runs a sample of it (tests/pits-writer.cjs).
const PW=require('../../experiments/pits-writer.js');
const {fault,LOCS}=require('../lib/pits-motion-rules.cjs');
const arg=process.argv.slice(2),W=(arg.find(a=>!a.startsWith('--'))||'dagger,shortsword,rapier,sword,longsword,falchion').split(',');
const SH=['buckler','heater','kite','scutum'];
const only=(arg.find(a=>a.startsWith('--attacker='))||'').slice(11)||null;
let bad=0,n=0;
function run(label,fights){const f=[];
  for(const [rec,opt] of fights){n++;const q=PW.write([rec],opt),e=fault(q,8);
    if(e)f.push(rec.loc+' '+rec.outcome+(rec.defence?' (shield parry)':'')+(rec.strike?' (shield strike)':'')+' '+q.exchanges[0].phrase+': '+e);}
  bad+=f.length;console.log((f.length?'FAIL ':'PASS ')+label+(f.length?'\n  '+f.join('\n  '):''));}
const OUT=[['parried',0],['wound',3],['armour',0],['miss',0]];
for(const wa of W)for(const wb of W)if(!only||wa===only)
  run(wa+' against '+wb,LOCS.flatMap(loc=>OUT.map(([outcome,lost])=>[{attacker:'a',loc,outcome,lost},{weapons:{a:wa,b:wb}}])));
if(!arg.includes('--no-shields')){let i=0;
  for(const wa of W)for(const wb of W){const sa=SH[i%4],sb=SH[(i+1)%4];i++;if(only&&wa!==only)continue;const opt={weapons:{a:wa,b:wb},shields:{a:sa,b:sb}};
    run(wa+' and '+sa+' against '+wb+' and '+sb,LOCS.flatMap(loc=>[
      [{attacker:'a',loc,outcome:'parried',lost:0,defence:'shield'},opt],[{attacker:'a',loc,outcome:'full-ward',lost:0},opt],
      [{attacker:'a',loc,outcome:'wound',lost:3},opt],[{attacker:'a',loc,outcome:'miss',lost:0},opt],
      ...[['wound',2],['armour',0],['parried',0],['miss',0]].map(([outcome,lost])=>[{attacker:'a',strike:'shield',loc,outcome,lost},opt])]));}}
console.log(n+' fights, '+bad+' with a fault');process.exit(bad?1:0);
