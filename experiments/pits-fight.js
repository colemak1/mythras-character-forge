// The Pits: a ten-beat fight study, broadsword against broadsword, on the spring-driven movement (pits-spring.js).
// PRESENTATION ONLY. The outcomes are scripted animation fixtures for judging the movement across a whole fight; they
// are not a claimed or validated Mythras combat sequence, and nothing here rolls or decides.
//
// Since 2026-11-12 the fight is no longer hand-written: it is the exchange writer (pits-writer.js) fed the eight
// fixture records in pits-fixtures.js, as the live Pits will feed it the engine's resolved exchanges. The writer's
// phrases are the study's beats, so the fight is the same one (tests/pits-fight.cjs holds it).
(function(root){
const PS=root.PitsSpring||(typeof require==='function'?require('./pits-spring.js'):null);
const PW=root.PitsWriter||(typeof require==='function'?require('./pits-writer.js'):null);
const FX=root.PitsFixtures||(typeof require==='function'?require('./pits-fixtures.js'):null);
function buildFight(){return PW.write(FX.FIGHT,{id:'fight',title:'A fight in ten beats'});}
PS.register('fight',buildFight);
if(typeof module!=='undefined'&&module.exports)module.exports={build:buildFight};
})(typeof window!=='undefined'?window:globalThis);
