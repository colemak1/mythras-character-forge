// The ten-beat fight study as the engine would report it: eight resolved exchanges, in the stage's own words (the
// outcomes pitsStageOutcome gives, the hit locations, the damage that got through, and the cues that follow).
// SCRIPTED ANIMATION FIXTURES: not a claimed or validated Mythras sequence. The exchange writer (pits-writer.js) turns
// them into the fight; beats 4 and 5 are one exchange (a low cut, parried into a bind), and beat 10 is what follows the
// last record (the wound ends the fight).
(function(root){
const FIGHT=[
  {attacker:'a',weapon:'broadsword',loc:'chest',outcome:'parried',lost:0},           // 2. a cut at the upper body, parried
  {attacker:'b',weapon:'broadsword',loc:'chest',outcome:'evaded',lost:0},            // 3. the counter at the ribs, slipped
  {attacker:'a',weapon:'broadsword',loc:'rleg',outcome:'parried',lost:0},            // 4-5. a cut at the thigh, met low
  {attacker:'a',weapon:'broadsword',loc:'head',outcome:'parried',lost:0},            // 6. a cut at the head, parried high
  {attacker:'b',weapon:'broadsword',loc:'rarm',outcome:'wound',lost:2},              // 7. onto the sword forearm
  {attacker:'b',weapon:'broadsword',loc:'abdomen',outcome:'parried',lost:0},         // 8. a thrust, deflected
  {attacker:'a',weapon:'broadsword',loc:'rleg',outcome:'wound',lost:8,               // 9. the thigh cut that ends it
    after:[{type:'limb',loc:'rleg',leg:true},{type:'end',winner:'a',how:'injury'}]},
];
// The thrust family's study (step 3): a dagger (A) against a broadsword (B). Every thrust phrase, and the sword's cuts
// met by the dagger: B's cut parried at the body and at the head, a slipped cut, A's thrust falling short, deflected,
// landing, and the stab that ends it. Also scripted fixtures, not a validated Mythras sequence.
const THRUST=[
  {attacker:'b',weapon:'sword',loc:'chest',outcome:'parried',lost:0},
  {attacker:'a',weapon:'dagger',loc:'chest',outcome:'miss',lost:0},
  {attacker:'b',weapon:'sword',loc:'head',outcome:'parried',lost:0},
  {attacker:'a',weapon:'dagger',loc:'abdomen',outcome:'parried',lost:0},
  {attacker:'b',weapon:'sword',loc:'chest',outcome:'evaded',lost:0},
  {attacker:'a',weapon:'dagger',loc:'rarm',outcome:'wound',lost:2},
  {attacker:'a',weapon:'dagger',loc:'abdomen',outcome:'wound',lost:7,
    after:[{type:'end',winner:'a',how:'injury'}]},
];
// The shields study: broadsword and heater (A) against broadsword and buckler (B). Shield parries at the body, the
// head and low (a ward), a parry with the blade, shield strikes that land and are met, and the cut that ends it.
const SHIELDS=[
  {attacker:'b',weapon:'sword',loc:'chest',outcome:'parried',lost:0,defence:'shield'},
  {attacker:'a',weapon:'sword',loc:'head',outcome:'parried',lost:0,defence:'shield'},
  {attacker:'b',weapon:'sword',loc:'rleg',outcome:'full-ward',lost:0},
  {attacker:'a',strike:'shield',loc:'chest',outcome:'wound',lost:1},
  {attacker:'b',weapon:'sword',loc:'abdomen',outcome:'parried',lost:0},
  {attacker:'a',weapon:'sword',loc:'chest',outcome:'evaded',lost:0},
  {attacker:'a',strike:'shield',loc:'chest',outcome:'parried',lost:0},
  {attacker:'a',weapon:'sword',loc:'rleg',outcome:'wound',lost:7,after:[{type:'end',winner:'a',how:'injury'}]},
];
const api={FIGHT,THRUST,SHIELDS};
root.PitsFixtures=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
