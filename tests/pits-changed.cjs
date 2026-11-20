// The Tests workflow skips the Pits browser bouts on changes that cannot reach
// The Pits (owner, 2026-11-20). scripts/pits-changed.py decides; a change to the
// Pits page, any file it loads, experiments/ or the browser tests must run them.
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),path=require('node:path');
const script=path.resolve(__dirname,'../scripts/pits-changed.py');
const touches=files=>execFileSync('python3',[script],{input:files.join('\n')}).toString().trim()==='true';
assert.equal(touches(['js/atlas.js','sitota-atlas.css','assets/atlas/atlas-data.json','docs/world-atlas.md']),false,'atlas-only changes skip the bouts');
assert.equal(touches(['README.md']),false);
for(const f of ['experiments/practice-combat.html','experiments/pits-cine.js','js/combat-rules.js','sitota-theme.css','tests/visual/pits-smoke.cjs','.github/workflows/tests.yml','scripts/pits-changed.py'])
 assert.equal(touches(['docs/x.md',f]),true,f+' must run the bouts');
console.log('PASS the Pits browser bouts run exactly when a change can reach The Pits');
