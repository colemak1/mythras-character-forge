"use strict";
/* ================= VERIFIED RULES DATA ================= */
const CHARS=["STR","CON","SIZ","DEX","INT","POW","CHA"];
const ROLL_3D6=["STR","CON","DEX","POW","CHA"], ROLL_2D6=["INT","SIZ"];

// Standard skills & base formulas (core rulebook / workbook sheet)
const STD=[["Athletics","STR+DEX"],["Boating","STR+CON"],["Brawn","STR+SIZ"],
["Conceal","DEX+POW"],["Customs","INTx2"],["Dance","DEX+CHA"],["Deceit","INT+CHA"],
["Drive","DEX+POW"],["Endurance","CONx2"],["Evade","DEXx2"],["First Aid","INT+DEX"],
["Influence","CHAx2"],["Insight","INT+POW"],["Locale","INTx2"],["Native Tongue","INT+CHA"],
["Perception","INT+POW"],["Ride","DEX+POW"],["Sing","CHA+POW"],["Stealth","DEX+INT"],
["Swim","STR+CON"],["Unarmed","STR+DEX"],["Willpower","POWx2"]];
const STD_MAP=Object.fromEntries(STD);

// Professional (and magic) skills & base formulas (workbook allocation sheet)
const PROF={"Acting":"CHAx2","Acrobatics":"STR+DEX","Art":"CHA+POW","Binding":"CHA+POW",
"Bureaucracy":"INTx2","Commerce":"INT+CHA","Courtesy":"INT+CHA","Craft":"DEX+INT",
"Culture":"INTx2","Devotion":"CHA+POW","Disguise":"INT+CHA","Engineering":"INTx2",
"Exhort":"INT+CHA","Folk Magic":"CHA+POW","Gambling":"INT+POW","Healing":"INT+POW",
"Invocation":"INTx2","Language":"INT+CHA","Literacy":"INTx2","Lockpicking":"DEXx2",
"Lore":"INTx2","Mechanisms":"DEX+INT","Meditation":"INT+CON","Musicianship":"DEX+CHA",
"Mysticism":"POW+CON","Navigation":"INT+POW","Oratory":"POW+CHA","Seamanship":"INT+CON",
"Seduction":"INT+CHA","Shaping":"INT+POW","Sleight":"DEX+CHA","Streetwise":"POW+CHA",
"Survival":"CON+POW","Teach":"INT+CHA","Trance":"POW+CON","Track":"INT+CON"};
const MAGIC=new Set(["Binding","Devotion","Exhort","Folk Magic","Invocation","Meditation","Mysticism","Shaping","Trance"]);

/* ================= SPECIES / NON-HUMAN CHARACTERS =================
   The core Mythras rulebook builds humans; non-human player characters are
   handled by giving the species its own characteristic dice and Movement Rate
   and otherwise running character creation unchanged ("Demi-human characters
   are created in almost the same way as humans. Characteristics are determined
   using the Characteristic dice for that species, which will result in
   different Characteristic values and ranges, but otherwise all the other
   elements: Attributes, Culture, Class and so on, are factored as normal.").

   SOURCE. The Racial Characteristics Table below, the Movement Rates, and the
   racial special rules are transcribed from the Classic Fantasy Imperative
   SRD (cfi-srd.mythras.net), published by The Design Mechanism under the ORC
   License — the same Mythras engine, and the only *open* Mythras-family
   source for playable non-human characteristic dice. Its Human row is
   identical to core Mythras (STR/CON/DEX/POW/CHA 3d6, SIZ/INT 2d6+6), which
   is the cross-check that the two agree.

   POINTS BUILD. Two different, individually faithful models meet here, and
   the seam is deliberate rather than smoothed over:
     - Human keeps the core rulebook's flat pool (80 / 90 / 100 by tier), which
       this app already had verified against the page.
     - Non-humans use the CFI model — start from the racial averages and
       spend 6 more points — because a flat 80 would put a dwarf (racial
       averages summing to 85) below its own species average. pbPool below is
       that sum plus 6; the tier increment (+10 Pulp / +20 Paragon) rides on
       top exactly as it does for humans.

   MOVEMENT. CFI states Movement in feet and puts humans at 20 feet; core
   Mythras puts humans at 6 metres. Converting at that anchor (0.3 m/ft) gives
   20ft = 6m and 15ft = 4.5m, which is what the `move` field holds.

   TRAITS. Every racial special rule below is either situational ("one grade
   easier on Perception rolls to spot something") or narrative (lifespan,
   literacy). This app's existing, deliberate convention is that situational
   Grade shifts are surfaced as flags rather than baked into a percentage —
   the same call already made for the Pulp/Paragon Grade-easier Advantages,
   for the same reason: a Grade is a roll modifier the GM calls for, not a
   skill bonus. Only the three hard numbers (characteristic dice, the bounds
   they imply, and Movement Rate) are applied automatically.

   NOT INCLUDED. CFI gives humans "+1 Luck Point" as a balance perk against
   demi-human abilities. That is a Classic Fantasy rule, not core Mythras, and
   folding it in would silently inflate every plain human character this app
   has ever built — so it is omitted. */
const SPECIES=[
 {key:"human",label:"Human",move:6,pbPool:null,lifespan:"~100 years",
  blurb:"The core rulebook's default. Adaptable, fast-learning, found everywhere.",
  dice:{STR:"3d6",CON:"3d6",SIZ:"2d6+6",DEX:"3d6",INT:"2d6+6",POW:"3d6",CHA:"3d6"},
  traits:[]},
 {key:"dwarf",label:"Dwarf",move:4.5,lifespan:"~450 years",
  blurb:"Mountain-hall crafters and miners: strong, tough, materialistic, deeply suspicious of magic.",
  dice:{STR:"2d6+9",CON:"2d6+9",SIZ:"2d4+4",DEX:"3d6",INT:"2d6+6",POW:"3d6",CHA:"2d6+2"},
  traits:[
   ["Darkvision","Sees 60 feet in dim light as though bright (Standard Perception rolls), and in darkness as though dim (Perception rolls are Hard), in shades of grey only. Does not work in magical darkness."],
   ["Magic Resistance","Willpower rolls to resist Arcane magic are one Grade easier. No effect on Divine magic."],
   ["Poison Resistance","Endurance rolls relating to poison are one Grade easier."],
   ["Tunnel Sense","An Easy Perception roll detects stonework pits, deadfalls and traps, slopes and grades, approximate depth underground, new construction, and shifting walls, within 10 feet."],
   ["Literate","Typically able to read and write any language they can speak."]]},
 {key:"elf",label:"Elf",move:6,lifespan:"~1,100 years",
  blurb:"Long-lived woodland folk — graceful, remote, keenly perceptive, and hard to charm.",
  dice:{STR:"2d6+4",CON:"3d6",SIZ:"2d6+4",DEX:"2d6+9",INT:"2d6+7",POW:"2d6+7",CHA:"3d6"},
  traits:[
   ["Sharp Vision","All Perception rolls to spot something are one Grade easier."],
   ["Resistance to Sleep and Charm","Willpower rolls to resist Sleep and Charm effects are two Grades easier. May drop the resistance voluntarily."],
   ["Stealthy","Wearing nothing more restrictive than light armour, Stealth rolls are one Grade easier."],
   ["Elven Chain","Adept at casting Arcane magic while wearing elven chain."],
   ["Literate","Typically able to read and write any language they can speak."]]},
 {key:"gnome",label:"Gnome",move:4.5,lifespan:"~700 years",
  blurb:"Smallest of the demi-humans: burrow-dwelling gem-cutters, incorrigible jokers, close kin to dwarves.",
  dice:{STR:"2d6+1",CON:"2d6+6",SIZ:"1d3+2",DEX:"3d6+2",INT:"2d6+8",POW:"2d6+7",CHA:"3d6"},
  traits:[
   ["Darkvision","Sees 60 feet in dim light as though bright (Standard Perception rolls), and in darkness as though dim (Perception rolls are Hard), in shades of grey only. Does not work in magical darkness."],
   ["Magic Resistance","Willpower rolls to resist Arcane magic are one Grade easier — two Grades easier against illusions. No effect on Divine magic."],
   ["Poison Resistance","Endurance rolls relating to poison are one Grade easier."],
   ["Tunnel Sense","An Easy Perception roll detects stonework pits, deadfalls and traps, slopes and grades, approximate depth underground, new construction, and shifting walls, within 10 feet."],
   ["Literate","Typically able to read and write any language they can speak."]]},
 {key:"halfelf",label:"Half-Elf",move:6,lifespan:"~300 years",
  blurb:"Elf and human both, at home in neither — the elven gifts at half strength, the human wanderlust at full.",
  dice:{STR:"3d6",CON:"3d6",SIZ:"2d6+6",DEX:"2d6+6",INT:"2d6+6",POW:"2d6+6",CHA:"3d6"},
  traits:[
   ["Sharp Vision","All Perception rolls to spot something are one Grade easier."],
   ["Resistance to Sleep and Charm","Willpower rolls to resist Sleep and Charm effects are one Grade easier. May drop the resistance voluntarily."],
   ["Stealthy","Wearing nothing more restrictive than light armour, Stealth rolls are one Grade easier."],
   ["Elven Chain","Adept at casting Arcane magic while wearing elven chain."],
   ["Literate","Typically able to read and write any language they can speak."]]},
 {key:"halforc",label:"Half-Orc",move:6,lifespan:"~80 years",
  blurb:"Frontier-born and frontier-shaped: bigger and stronger than a human, and trusted by almost nobody.",
  dice:{STR:"2d6+9",CON:"2d6+6",SIZ:"2d6+9",DEX:"3d6",INT:"2d6+5",POW:"3d6",CHA:"2d6+1"},
  traits:[
   ["Darkvision","Sees 60 feet in dim light as though bright (Standard Perception rolls), and in darkness as though dim (Perception rolls are Hard), in shades of grey only. Does not work in magical darkness."],
   ["Survival Bonus (Specific)","If raised among orcs, Survival rolls in the character's area of origin are one Grade easier."],
   ["Illiterate (if orc-raised)","Typically unable to read or write. Literacy costs 1 Experience Roll and a month of training under a literate teacher for half-skill literacy in one known language, and the same again for full literacy."]]},
 {key:"halfling",label:"Halfling",move:4.5,lifespan:"~170 years",
  blurb:"Shire-dwelling farmers and gossips, physically slight but startlingly lucky and quiet on their feet.",
  dice:{STR:"2d6+1",CON:"2d6+7",SIZ:"1d4+5",DEX:"3d6+3",INT:"2d6+6",POW:"2d6+9",CHA:"2d6+5"},
  traits:[
   ["Stealthy","Wearing nothing more restrictive than light armour, Stealth rolls are one Grade easier."],
   ["Magic Resistance","Willpower rolls to resist Arcane magic are one Grade easier. No effect on Divine magic."],
   ["Poison Resistance","Endurance rolls relating to poison are one Grade easier."],
   ["Exposure Tolerance (Feet)","No adverse effects from exposure while barefoot, whatever the temperature. The rest of the body suffers exposure normally."],
   ["Literate","Typically able to read and write any language they can speak."]]}
];
/* ---- Height & Weight ----
   PROVENANCE, PLEASE READ BEFORE CHANGING THESE NUMBERS.

   The core rulebook's Height and Weight table (p.9) is Reserved Material and
   is not reproduced here — this app has no verified transcription of it, and
   inventing one and calling it the book's table would be exactly the kind of
   fabrication the rest of this file has had to be cleaned of twice already
   (see the weapon STR/DEX-minimum and Half Plate notes above).

   What this IS: an explicit, stated model, computed from SIZ and build, with
   both figures overridable by hand for anyone who has the book open. SIZ is
   a measure of mass, so:

     weight = massPerSiz x SIZ                          (build-independent:
                                                         SIZ *is* the mass)
     height = heightAt x (SIZ / avgSIZ)^(1/3) x build   (same mass, taller if
                                                         lithe, shorter if
                                                         heavy — cube root
                                                         because mass scales
                                                         with the cube of a
                                                         linear dimension)

   ANCHORS. Human is pinned at the standard adult figure for its average SIZ
   of 13: 1.75 m and 75 kg. Each demi-human's heightAt is pinned to the height
   its own species description states (Dwarf "between 4'8" and 4'10"", Gnome
   "3'4" to 3'7"", Halfling "an average of 4'0" to 4'3"", Elf "around the same
   height as humans", Half-Orc "standing taller than a human on average") at
   that species' average SIZ, and massPerSiz is set from each species' stated
   build — dwarves stocky, elves and halflings slight. Those height quotes are
   real, cited text from the Classic Fantasy Imperative SRD; the mass
   constants are this app's calibration, not a book table. */
const BUILD_FACTORS={"Lithe":1.06,"Medium":1.0,"Heavy":0.94};
const HW_ANCHORS={
 human:   {heightAt:1.75,massPerSiz:5.8},
 dwarf:   {heightAt:1.45,massPerSiz:7.5},  // 4'9" — stocky, dense
 elf:     {heightAt:1.75,massPerSiz:5.2},  // human height, slender build
 gnome:   {heightAt:1.05,massPerSiz:5.5},  // 3'5"
 halfelf: {heightAt:1.75,massPerSiz:5.6},
 halforc: {heightAt:1.90,massPerSiz:6.2},  // "taller than a human on average"
 halfling:{heightAt:1.26,massPerSiz:4.5}   // 4'1.5" — slight
};
// Parse "2d6+9" / "1d3+2" / "3d6" into {n, sides, mod} so bounds, averages and
// rolls all derive from the one dice string rather than being three separate
// hand-maintained columns that could disagree.
function parseDice(str){
  const m=/^(\d+)d(\d+)([+-]\d+)?$/.exec(String(str).trim());
  if(!m)return null;
  return {n:+m[1],sides:+m[2],mod:m[3]?+m[3]:0};
}
const diceMin=d=>d.n+d.mod, diceMax=d=>d.n*d.sides+d.mod;
// The book prints a "racial average" in parentheses after each dice score and
// uses it as the Points Build starting value. It is the true dice average
// rounded up (e.g. 3d6 = 10.5 -> 11, 2d4+4 = 9), which reproduces every
// printed value in the source table.
const diceAvg=d=>Math.ceil(d.n*(d.sides+1)/2)+d.mod;
function rollDice(d){let t=d.mod;for(let i=0;i<d.n;i++)t+=1+Math.floor(Math.random()*d.sides);return t;}
// Precompute bounds / averages / points-build pool onto each species entry.
SPECIES.forEach(sp=>{
  sp.bounds={};sp.avg={};let sum=0;
  CHARS.forEach(c=>{const d=parseDice(sp.dice[c]);
    sp.bounds[c]=[diceMin(d),diceMax(d)];sp.avg[c]=diceAvg(d);sum+=sp.avg[c];});
  sp.avgTotal=sum;
  // Human deliberately keeps the core rulebook's own flat pool (pbPool null
  // means "fall through to ARCHETYPES[tier].pbPoints"); demi-humans use the
  // CFI "racial averages + 6" model.
  if(sp.pbPool===undefined)sp.pbPool=sum+6;
});
const SPECIES_MAP=Object.fromEntries(SPECIES.map(s=>[s.key,s]));

// Cultures (workbook Culture Summary; money from core p.21, verified visually)
const CULTURES={
"Barbarian":{money:50,
  std:["Athletics","Brawn","Endurance","First Aid","Locale","Perception"],
  choice:{pick:1,from:["Boating","Ride"],text:"and either Boating or Ride"},
  prof:["Craft (any)","Healing","Lore (any)","Musicianship","Navigation","Seamanship","Survival","Track"],
  styles:"Barbarian Fyrdman, Berserker, Horse Eater, Seaborne Reiver, Weapon Thegn, Wolf Hunter",
  passions:["Loyalty to Clan Chieftain","Love (friend, sibling or romantic lover)","Hate (creature, rival or clan)"],
  blurb:"Clans and chieftains, raids and feuds; hardy folk of hill, forest and fjord."},
"Civilised":{money:75,
  std:["Conceal","Deceit","Drive","Influence","Insight","Locale","Willpower"],
  choice:null,
  prof:["Art (any)","Commerce","Craft (any)","Courtesy","Language (any)","Lore (any)","Musicianship","Streetwise"],
  styles:"Citizen Legionary, City-state Phalangite, Levied Archer, Light Skirmisher, Street Thug, Town Militia",
  passions:["Loyalty to Town/City","Love (friend, sibling or romantic lover)","Hate (rival, gang, district or city)"],
  blurb:"Towns, laws, markets and intrigue; life shaped by crowds and coin."},
"Nomadic":{money:25,
  std:["Endurance","First Aid","Locale","Perception","Stealth"],
  choice:{pick:2,from:["Athletics","Boating","Swim","Drive","Ride"],text:"and two of Athletics, Boating, Swim, Drive or Ride, depending on the primary mode of travel"},
  prof:["Craft (any)","Culture (any)","Language (any)","Lore (any)","Musicianship","Navigation","Survival","Track"],
  styles:"Camel Cavalry, Feathered Death Flinger, Horse Lord, Whale Hunter, Wheeled Warrior, Wolf Runner",
  passions:["Loyalty to Tribal Chieftain/Khan","Love (friend, sibling or romantic lover)","Hate (creature, rival or tribe)"],
  blurb:"Always moving: herds, wagons, boats; survival by the road and the season."},
"Primitive":{money:10,
  std:["Brawn","Endurance","Evade","Locale","Perception","Stealth"],
  choice:{pick:1,from:["Athletics","Boating","Swim"],text:"and one of Athletics, Boating or Swim"},
  prof:["Craft (any)","Healing","Lore (any)","Musicianship","Navigation","Survival","Track"],
  styles:"Flint Death Dealer, Ghost Warrior, Head Hunter, Jaguar Brother, Jungle Savage, Savannah Hunter",
  passions:["Loyalty to Chief/Headman","Love (friend, sibling or romantic lover)","Hate (something that scares or intimidates you)"],
  blurb:"Deep wilds and old spirits; stone, bone and the wisdom of the hunt."}};

// Careers (workbook Career Summary, all 24). styleSlots = combat styles in the
// career's standard-skill list; prof = professional options (pick up to 3).
const CAREERS={
"Agent":{std:["Conceal","Deceit","Evade","Insight","Perception","Stealth"],styleSlots:["Concealable Weapons Style"],
  prof:["Culture (any)","Disguise","Language (any)","Sleight","Streetwise","Survival","Track"]},
"Alchemist":{std:["Customs","Endurance","First Aid","Insight","Locale","Perception","Willpower"],styleSlots:[],
  prof:["Commerce","Craft (Alchemy)","Healing","Language (any)","Literacy","Lore (Specific Alchemical Speciality)","Streetwise"]},
"Beast Handler":{std:["Drive","Endurance","First Aid","Influence","Locale","Ride","Willpower"],styleSlots:[],
  prof:["Commerce","Craft (Animal Husbandry)","Healing (Specific Species)","Lore (Specific Species)","Survival","Teach (Specific Species)","Track"]},
"Courtesan":{std:["Customs","Dance","Deceit","Influence","Insight","Perception","Sing"],styleSlots:[],
  prof:["Art (any)","Courtesy","Culture (any)","Gambling","Language (any)","Musicianship","Seduction"]},
"Courtier":{std:["Customs","Dance","Deceit","Influence","Insight","Locale","Perception"],styleSlots:[],
  prof:["Art (any)","Bureaucracy","Courtesy","Culture (any)","Language (any)","Lore (any)","Oratory"]},
"Crafter":{std:["Brawn","Drive","Influence","Insight","Locale","Perception","Willpower"],styleSlots:[],
  prof:["Art (any)","Commerce","Craft (Primary)","Craft (Secondary)","Engineering","Mechanisms","Streetwise"]},
"Entertainer":{std:["Athletics","Brawn","Dance","Deceit","Influence","Insight","Sing"],styleSlots:[],
  prof:["Acrobatics","Acting","Oratory","Musicianship","Seduction","Sleight","Streetwise"]},
"Farmer":{std:["Athletics","Brawn","Drive","Endurance","Locale","Perception","Ride"],styleSlots:[],
  prof:["Commerce","Craft (any)","Lore (Agriculture)","Lore (Animal Husbandry)","Navigation","Survival","Track"]},
"Fisher":{std:["Athletics","Boating","Endurance","Locale","Perception","Stealth","Swim"],styleSlots:[],
  prof:["Commerce","Craft (any)","Lore (Primary Catch)","Lore (Secondary Catch)","Navigation","Seamanship","Survival"]},
"Herder":{std:["Endurance","First Aid","Insight","Locale","Perception","Ride"],styleSlots:["Specific Herding or Cultural Style"],
  prof:["Commerce","Craft (Animal Husbandry)","Healing (Specific Species)","Navigation","Musicianship","Survival","Track"]},
"Hunter":{std:["Athletics","Endurance","Locale","Perception","Ride","Stealth"],styleSlots:["Specific Hunting or Cultural Style"],
  prof:["Commerce","Craft (Hunting Related)","Lore (Regional or Specific Species)","Mechanisms","Navigation","Survival","Track"]},
"Merchant":{std:["Boating","Drive","Deceit","Insight","Influence","Locale","Ride"],styleSlots:[],
  prof:["Commerce","Courtesy","Culture (any)","Language (any)","Navigation","Seamanship","Streetwise"]},
"Miner":{std:["Athletics","Brawn","Endurance","Locale","Perception","Sing","Willpower"],styleSlots:[],
  prof:["Commerce","Craft (Mining)","Engineering","Lore (Minerals)","Mechanisms","Navigation (Underground)","Survival"]},
"Mystic":{std:["Athletics","Endurance","Evade","Insight","Perception","Willpower"],styleSlots:["Cultural Style"],
  prof:["Art (any)","Folk Magic","Literacy","Lore (any)","Meditation","Musicianship","Mysticism"]},
"Official":{std:["Customs","Deceit","Influence","Insight","Locale","Perception","Willpower"],styleSlots:[],
  prof:["Bureaucracy","Commerce","Courtesy","Language (any)","Literacy","Lore (any)","Oratory"]},
"Physician":{std:["Dance","First Aid","Influence","Insight","Locale","Sing","Willpower"],styleSlots:[],
  prof:["Commerce","Craft (Specific Physiological Speciality)","Healing","Language (any)","Literacy","Lore (Specific Alchemical Speciality)","Streetwise"]},
"Priest":{std:["Customs","Dance","Deceit","Influence","Insight","Locale","Willpower"],styleSlots:[],
  prof:["Bureaucracy","Devotion (Pantheon, Cult or God)","Exhort","Folk Magic","Literacy","Lore (any)","Oratory"]},
"Sailor":{std:["Athletics","Boating","Brawn","Endurance","Locale","Swim"],styleSlots:["Specific Shipboard or Cultural Style"],
  prof:["Craft (Specific Shipboard Speciality)","Culture (any)","Language (any)","Lore (any)","Navigation","Seamanship","Survival"]},
"Scholar":{std:["Customs","Influence","Insight","Locale","Native Tongue","Perception","Willpower"],styleSlots:[],
  prof:["Culture (any)","Language (any)","Literacy","Lore (Primary)","Lore (Secondary)","Oratory","Teach"]},
"Scout":{std:["Athletics","Endurance","First Aid","Perception","Stealth","Swim"],styleSlots:["Specific Hunting or Cultural Style"],
  prof:["Culture (any)","Healing","Language (any)","Lore (any)","Navigation","Survival","Track"]},
"Shaman":{std:["Customs","Dance","Deceit","Influence","Insight","Locale","Willpower"],styleSlots:[],
  prof:["Binding (Cult, Totem or Tradition)","Folk Magic","Healing","Lore (any)","Oratory","Sleight","Trance"]},
"Sorcerer":{std:["Customs","Deceit","Influence","Insight","Locale","Perception","Willpower"],styleSlots:[],
  prof:["Folk Magic","Invocation (Cult, School or Grimoire)","Language (any)","Literacy","Lore (any)","Shaping","Sleight"]},
"Thief":{std:["Athletics","Deceit","Evade","Insight","Perception","Stealth"],styleSlots:["Concealable Weapons Style"],
  prof:["Acting","Commerce","Disguise","Lockpicking","Mechanisms","Sleight","Streetwise"]},
"Warrior":{std:["Athletics","Brawn","Endurance","Evade","Unarmed"],styleSlots:["Cultural Style","Speciality Style"],
  prof:["Craft (any)","Engineering","Gambling","Lore (Military History)","Lore (Strategy and Tactics)","Oratory","Survival"]}};

// Weapons & armour. Transcribed directly from the core rulebook (Economics &
// Equipment chapter, pp.63-66 Weapons tables, p.58 Armour Table) — page
// images checked visually via the PDF, not the earlier text-extraction pass.
// No STR/DEX minimum mechanic exists for weapons in Mythras; that was an
// earlier fabrication and has been removed. Fields: dmg (damage), size
// (S/M/L/H/E — melee only), reach (S/M/T/L/VL for melee/shields; Force
// S/M/L/H/E for ranged, see the "force" flag), effects (Combat Effects),
// enc, apHp ("AP/HP" of the weapon itself), traits, milieu (era/culture
// code — A=Ancient, P=Primitive, M=Medieval, R=Renaissance, E=Enlightenment,
// I=Industrial), cost (silver pieces).
const WEAPONS=[
 // One-Handed Weapons (p.63)
 {name:"Ball & chain",group:"One-Handed",dmg:"1d6+1",size:"M",reach:"M",effects:"Bash, Entangle, Stun Location",enc:2,apHp:"6/8",traits:"Flexible",milieu:"M",cost:250},
 {name:"Battleaxe",group:"One-Handed",dmg:"1d6+1",size:"M",reach:"M",effects:"Bleed, Sunder",enc:1,apHp:"4/8",traits:"",milieu:"A-R",cost:100},
 {name:"Broadsword",group:"One-Handed",dmg:"1d8",size:"M",reach:"M",effects:"Bleed, Impale",enc:2,apHp:"6/10",traits:"",milieu:"A-E",cost:175},
 {name:"Chain",group:"One-Handed",dmg:"1d4",size:"M",reach:"M",effects:"Entangle",enc:1,apHp:"8/6",traits:"Flexible",milieu:"A-I",cost:10},
 {name:"Club",group:"One-Handed",dmg:"1d6",size:"M",reach:"S",effects:"Bash, Stun Location",enc:1,apHp:"4/4",traits:"",milieu:"All",cost:5},
 {name:"Dagger",group:"One-Handed",dmg:"1d4+1",size:"S",reach:"S",effects:"Bleed, Impale",enc:0,apHp:"6/8",traits:"Thrown",milieu:"All",cost:30},
 {name:"Hatchet",group:"One-Handed",dmg:"1d6",size:"S",reach:"S",effects:"Bleed",enc:1,apHp:"4/6",traits:"Thrown",milieu:"All",cost:25},
 {name:"Falchion",group:"One-Handed",dmg:"1d6+2",size:"M",reach:"M",effects:"Bleed",enc:1,apHp:"6/10",traits:"",milieu:"A-M",cost:200},
 {name:"Flail",group:"One-Handed",dmg:"1d6",size:"M",reach:"M",effects:"Bash",enc:1,apHp:"3/6",traits:"Flexible",milieu:"A-M",cost:25},
 {name:"Knife",group:"One-Handed",dmg:"1d3",size:"S",reach:"S",effects:"Bleed, Impale",enc:0,apHp:"5/4",traits:"",milieu:"All",cost:10},
 {name:"Lance",group:"One-Handed",dmg:"1d10+2",size:"H",reach:"VL",effects:"Impale, Sunder",enc:3,apHp:"4/10",traits:"Mount",milieu:"A-M",cost:150},
 {name:"Longsword",group:"One-Handed",dmg:"1d8",size:"M",reach:"L",effects:"Bleed, Impale",enc:2,apHp:"6/12",traits:"",milieu:"M-R",cost:250},
 {name:"Mace",group:"One-Handed",dmg:"1d8",size:"M",reach:"S",effects:"Bash, Stun Location",enc:1,apHp:"6/6",traits:"",milieu:"A-R",cost:100},
 {name:"Main Gauche",group:"One-Handed",dmg:"1d4",size:"S",reach:"S",effects:"Bleed",enc:0,apHp:"6/10",traits:"Entrapping",milieu:"M-E",cost:180},
 {name:"Military pick",group:"One-Handed",dmg:"1d6+1",size:"M",reach:"M",effects:"Stun Location, Sunder",enc:3,apHp:"6/10",traits:"",milieu:"M-E",cost:180},
 {name:"Net",group:"One-Handed",dmg:"1d4",size:"S",reach:"L",effects:"Entangle",enc:3,apHp:"2/20",traits:"Entrapping, Thrown",milieu:"All",cost:20},
 {name:"Rapier",group:"One-Handed",dmg:"1d8",size:"M",reach:"L",effects:"Impale",enc:1,apHp:"5/8",traits:"",milieu:"E",cost:100},
 {name:"Sabre",group:"One-Handed",dmg:"1d6+1",size:"M",reach:"M",effects:"Bleed, Impale",enc:1,apHp:"6/8",traits:"",milieu:"E-I",cost:225},
 {name:"Scimitar",group:"One-Handed",dmg:"1d8",size:"M",reach:"M",effects:"Bleed",enc:2,apHp:"6/10",traits:"",milieu:"M-E",cost:200},
 {name:"Shortspear",group:"One-Handed",dmg:"1d8+1",size:"M",reach:"L",effects:"Impale",enc:2,apHp:"4/5",traits:"Set, Thrown",milieu:"All",cost:20},
 {name:"Shortsword",group:"One-Handed",dmg:"1d6",size:"M",reach:"S",effects:"Bleed, Impale",enc:1,apHp:"6/8",traits:"",milieu:"All",cost:100},
 {name:"Trident",group:"One-Handed",dmg:"1d8",size:"M",reach:"L",effects:"Impale",enc:2,apHp:"4/10",traits:"Barbed, Thrown",milieu:"A-M",cost:155},
 {name:"Whip",group:"One-Handed",dmg:"1d3",size:"M",reach:"VL",effects:"Entangle, Stun Location",enc:1,apHp:"2/8",traits:"Entrapping, Flexible, Offensive",milieu:"A-M",cost:100},
 // Shields (p.63)
 {name:"Buckler",group:"Shield",dmg:"1d3",size:"M",reach:"S",effects:"Bash, Stun Location",enc:1,apHp:"6/9",traits:"Ranged Parry, Passive Blocks 2 locations",milieu:"M-E",cost:50},
 {name:"Heater",group:"Shield",dmg:"1d4",size:"L",reach:"S",effects:"Bash, Stun Location",enc:2,apHp:"6/12",traits:"Ranged Parry, Passive Blocks 3 locations",milieu:"M",cost:150},
 {name:"Hoplite",group:"Shield",dmg:"1d4",size:"H",reach:"S",effects:"Bash, Stun Location",enc:3,apHp:"6/15",traits:"Ranged Parry, Passive Blocks 4 locations",milieu:"A-M",cost:300},
 {name:"Kite",group:"Shield",dmg:"1d4",size:"H",reach:"S",effects:"Bash, Stun Location",enc:3,apHp:"4/15",traits:"Ranged Parry, Passive Blocks 4 locations",milieu:"M",cost:300},
 {name:"Peltast",group:"Shield",dmg:"1d4",size:"L",reach:"S",effects:"Bash, Stun Location",enc:2,apHp:"4/12",traits:"Ranged Parry, Passive Blocks 3 locations",milieu:"A-M",cost:150},
 {name:"Scutum",group:"Shield",dmg:"1d4",size:"H",reach:"S",effects:"Bash, Stun Location",enc:4,apHp:"4/18",traits:"Ranged Parry, Passive Blocks 5 locations",milieu:"A-M",cost:450},
 {name:"Target",group:"Shield",dmg:"1d3+1",size:"L",reach:"S",effects:"Bash, Impale",enc:2,apHp:"4/9",traits:"Ranged Parry, Passive Blocks 3 locations",milieu:"A-E",cost:150},
 {name:"Viking",group:"Shield",dmg:"1d4",size:"L",reach:"S",effects:"Bash, Stun Location",enc:3,apHp:"4/12",traits:"Ranged Parry, Passive Blocks 4 locations",milieu:"M",cost:300},
 // Two-Handed Weapons (p.64)
 {name:"Battleaxe (2H)",group:"Two-Handed",dmg:"1d8+1",size:"L",reach:"M",effects:"Bleed, Sunder",enc:1,apHp:"4/8",traits:"",milieu:"A-M",cost:100},
 {name:"Garrotte",group:"Two-Handed",dmg:"1d2",size:"S",reach:"T",effects:"—",enc:0,apHp:"1/2",traits:"Stealth",milieu:"A-I",cost:15},
 {name:"Glaive / Rhomphaia",group:"Two-Handed",dmg:"1d10+2",size:"L",reach:"L",effects:"Bleed, Sunder",enc:2,apHp:"4/10",traits:"",milieu:"A-M",cost:250},
 {name:"Great axe",group:"Two-Handed",dmg:"2d6+2",size:"H",reach:"L",effects:"Bleed, Sunder",enc:2,apHp:"4/10",traits:"",milieu:"A-M",cost:125},
 {name:"Great club",group:"Two-Handed",dmg:"2d6",size:"H",reach:"L",effects:"Bash, Stun Location",enc:3,apHp:"4/10",traits:"",milieu:"All",cost:50},
 {name:"Great hammer",group:"Two-Handed",dmg:"1d10+3",size:"H",reach:"L",effects:"Bash, Stun Location, Sunder",enc:3,apHp:"4/10",traits:"",milieu:"M-E",cost:250},
 {name:"Greatsword",group:"Two-Handed",dmg:"2d8",size:"H",reach:"L",effects:"Bleed, Impale, Sunder",enc:4,apHp:"6/12",traits:"",milieu:"M-E",cost:300},
 {name:"Halberd / Poleaxe",group:"Two-Handed",dmg:"1d8+2",size:"L",reach:"VL",effects:"Entangle, Impale, Sunder",enc:4,apHp:"4/10",traits:"Set",milieu:"A-E",cost:200},
 {name:"Longspear",group:"Two-Handed",dmg:"1d10+1",size:"L",reach:"VL",effects:"Impale",enc:2,apHp:"4/10",traits:"Set",milieu:"All",cost:30},
 {name:"Longsword (2H)",group:"Two-Handed",dmg:"1d10",size:"L",reach:"L",effects:"Bleed, Impale, Sunder",enc:2,apHp:"6/12",traits:"",milieu:"M-E",cost:250},
 {name:"Military flail",group:"Two-Handed",dmg:"1d10",size:"L",reach:"L",effects:"Bash, Stun Location",enc:3,apHp:"4/10",traits:"Flexible",milieu:"A-M",cost:250},
 {name:"Pike / Sarissa",group:"Two-Handed",dmg:"1d10+2",size:"L",reach:"VL",effects:"Impale",enc:4,apHp:"4/12",traits:"Set",milieu:"A-M",cost:90},
 {name:"Quarterstaff",group:"Two-Handed",dmg:"1d8",size:"M",reach:"L",effects:"Stun Location",enc:2,apHp:"4/8",traits:"Defensive",milieu:"All",cost:20},
 {name:"Xyston",group:"Two-Handed",dmg:"1d10",size:"L",reach:"VL",effects:"Impale",enc:3,apHp:"4/10",traits:"Set, Double Ended",milieu:"A",cost:100},
 // Ranged Weapons (Core p.65). "reach" holds Force (S/M/L/H/E) for these.
 // impaleSize is the distinct Impale Size column, not the Force/size of the projectile.
 // Numeric load values are Action Points, whereas em dash indicates no reload action.
 {name:"Atlatl",group:"Ranged",dmg:"—",dmgMod:"—",size:"",reach:"+1 Step",range:"+0/+25/+75",load:1,effects:"—",enc:1,apHp:"1/4",traits:"",milieu:"P",cost:10},
 {name:"Blowgun",group:"Ranged",dmg:"—",dmgMod:"N",size:"",reach:"—",range:"10/20/30",load:2,effects:"—",enc:0,apHp:"1/4",traits:"",milieu:"P",cost:30},
 {name:"Bolas",group:"Ranged",dmg:"1d4",dmgMod:"N",size:"",reach:"—",range:"10/25/50",load:"—",effects:"Entangle",enc:0,apHp:"2/2",traits:"",milieu:"P-A",cost:10},
 {name:"Dagger (thrown)",group:"Ranged",impaleSize:"S",dmg:"1d4",dmgMod:"Y",size:"S",reach:"S",range:"5/10/20",load:"—",effects:"Impale",enc:0,apHp:"6/8",traits:"",milieu:"All",cost:30},
 {name:"Dart",group:"Ranged",impaleSize:"S",dmg:"1d4",dmgMod:"Y",size:"S",reach:"S",range:"5/10/20",load:"—",effects:"Impale",enc:0,apHp:"2/1",traits:"",milieu:"P-A",cost:10},
 {name:"Discus",group:"Ranged",dmg:"1d4+1",dmgMod:"Y",size:"L",reach:"L",range:"5/20/40",load:"—",effects:"Stun Location",enc:0,apHp:"2/3",traits:"",milieu:"A",cost:30},
 {name:"Hatchet (thrown)",group:"Ranged",dmg:"1d6",dmgMod:"Y",size:"S",reach:"S",range:"10/20/30",load:"—",effects:"Bleed",enc:1,apHp:"4/6",traits:"",milieu:"All",cost:25},
 {name:"Heavy crossbow",group:"Ranged",impaleSize:"S",dmg:"1d10",dmgMod:"N",size:"H",reach:"H",range:"20/150/300",load:4,effects:"Impale, Sunder",enc:2,apHp:"4/8",traits:"",milieu:"M-E",cost:350},
 {name:"Javelin",group:"Ranged",impaleSize:"M",dmg:"1d8+1",dmgMod:"Y",size:"H",reach:"H",range:"10/20/50",load:"—",effects:"Impale, Pin Weapon (Shield)",enc:1,apHp:"3/8",traits:"",milieu:"A-M",cost:20},
 {name:"Light crossbow",group:"Ranged",impaleSize:"S",dmg:"1d8",dmgMod:"N",size:"L",reach:"L",range:"20/100/200",load:3,effects:"Impale",enc:1,apHp:"4/5",traits:"",milieu:"M-E",cost:150},
 {name:"Long bow",group:"Ranged",impaleSize:"S",dmg:"1d8",dmgMod:"Y",size:"H",reach:"H",range:"15/125/250",load:2,effects:"Impale",enc:1,apHp:"4/7",traits:"",milieu:"M",cost:200},
 {name:"Net (thrown)",group:"Ranged",dmg:"—",dmgMod:"N",size:"",reach:"—",range:"3/5/10",load:"—",effects:"Entangle",enc:3,apHp:"2/20",traits:"",milieu:"All",cost:20},
 {name:"Recurve bow",group:"Ranged",impaleSize:"S",dmg:"1d8",dmgMod:"Y",size:"H",reach:"H",range:"15/125/250",load:2,effects:"Impale",enc:1,apHp:"4/8",traits:"",milieu:"A-M",cost:225},
 {name:"Short bow",group:"Ranged",impaleSize:"S",dmg:"1d6",dmgMod:"Y",size:"L",reach:"L",range:"15/100/200",load:2,effects:"Impale",enc:1,apHp:"4/4",traits:"",milieu:"P-M",cost:75},
 {name:"Shortspear (thrown)",group:"Ranged",impaleSize:"M",dmg:"1d8",dmgMod:"Y",size:"L",reach:"L",range:"10/15/30",load:"—",effects:"Impale",enc:1,apHp:"4/5",traits:"",milieu:"All",cost:20},
 {name:"Sling",group:"Ranged",dmg:"1d8",dmgMod:"N",size:"L",reach:"L",range:"10/150/300",load:3,effects:"Stun Location",enc:0,apHp:"1/2",traits:"",milieu:"P-M",cost:5},
 {name:"Staff sling",group:"Ranged",dmg:"2d6",dmgMod:"N",size:"E",reach:"E",range:"5/25/50",load:4,effects:"Stun Location",enc:2,apHp:"3/6",traits:"",milieu:"A-M",cost:20},
 {name:"Stone/Rock",group:"Ranged",dmg:"1d3",dmgMod:"Y",size:"S",reach:"S",range:"5/10/20",load:"—",effects:"Stun Location",enc:0,apHp:"—",traits:"",milieu:"All",cost:0},
 {name:"Trident (thrown)",group:"Ranged",impaleSize:"M",dmg:"1d8",dmgMod:"Y",size:"L",reach:"L",range:"10/15/30",load:"—",effects:"Barbed, Impale",enc:2,apHp:"4/10",traits:"",milieu:"A-M",cost:155}
];
const WEAPON_MAP=Object.fromEntries(WEAPONS.map(w=>[w.name,w]));

// Combat Style Traits, sourced from the fan-compiled "Mythras Combat Style
// Traits Encyclopedia V2.3" (notesfrompavis.wordpress.com; Mythras is a
// registered trademark of The Design Mechanism Inc., traits used here with
// the compiler's stated permission). category mirrors the encyclopedia's
// own column (Individual / Unarmed / Ranged / Formation (3+ same trait) /
// Siege weapons, or a comma-joined combination where the source lists more
// than one). Transcribed from the source PDF with line-wrap hyphenation and
// a couple of column-bleed text-extraction artifacts cleaned up; mechanical
// wording is otherwise left as published, typos included.
const COMBAT_TRAITS=[
 {name:"Antelope Lancer",category:"Individual",source:"AiG",desc:"Performing a mounted charge with this combat style does not incur the one step difficulty penalty to hit. Allows rider to ignore the skill cap placed upon combat rolls by the Ride skill. When using a ranged weapon, shift a random Hit Location roll to an adjoining body location."},
 {name:"Assassination",category:"Individual",source:"Mythras",desc:"Allows the user access to the normally restricted 'Kill Silently' special effect."},
 {name:"Batter Aside",category:"Individual, Unarmed",source:"Mythras",desc:"If the fighter's Damage Modifier is two or more steps greater than his opponent's, his weapon is considered one size larger for the purposes of bypassing parries."},
 {name:"Batter Down",category:"Individual",source:"Mythic Rome",desc:"If the fighter's Damage Modifier is one or more steps greater than his opponent's, his Damage Modifier roll is counted as double solely for the purposes of calculating Knockback."},
 {name:"Beast-back Lancer",category:"Individual",source:"Mythras",desc:"Performing a mounted charge with this combat style does not incur the one step difficulty penalty to hit."},
 {name:"Berserker",category:"Individual",source:"Hyborean",desc:"The style emphasises entering into a violent frenzy where personal safety and pain are disregarded. At the beginning of a fight, or upon taking an injury, a berserker may attempt to roll his POW x5 to enter a frenzy. When in a frenzy: Damage modifier is increased by one step. Parrying or Evading attacks are one step more difficult. Endurance rolls for resisting the effects of injury are one step easier. Effects of Fatigue are ignored. After the fight any deferred Fatigue levels plus one additional level are applied."},
 {name:"Bison Tribe Combat Style",category:"Individual",source:"AiG",desc:"Performing a mounted charge with this combat style does not incur the one step difficulty penalty to hit. Allows rider to ignore the skill cap placed upon combat rolls by the Ride skill. Permits clubs and axes to roll the weapon's damage twice and pick the best result, but only when using the Damage Weapon special effect against shields."},
 {name:"Blind Fighting",category:"Individual",source:"Mythras",desc:"Allows user to ignore any penalties imposed due to poor lighting or temporary blinding (Core p.89)."},
 {name:"Blind Fighting (Weird of Hali)",category:"Individual",source:"Weird of Hali",desc:"Allows user to ignore any penalties imposed due to poor lighting or temporary blinding."},
 {name:"Block and Catch",category:"Unarmed",source:"raleel campaign",desc:"Allows for the use of the Grip special effect as a defensive special effect."},
 {name:"Body Slam",category:"Unarmed",source:"Mythic Constantinople",desc:"After taking a turn of movement, you can engage an opponent with a crashing blow with your arm or shoulder. Make an opposed Athletics roll versus the defender's Brawn or Evade. If you win, then the defender is automatically knocked down with you astride them. He suffers his own Damage Modifier (if any) in damage to a random location from the fall. If your Athletics fails, the defender has weathered or sidestepped the impact. If you win one or more levels of success you may select suitable Special Effects as per normal combat (Bash and Flurry are both popular)."},
 {name:"Cautious Fighter",category:"Individual",source:"Mythras",desc:"Can use the Change Range action to automatically withdraw from engagement with no need to roll."},
 {name:"Chariot Fighting",category:"Individual",source:"Mythras",desc:"Style allows those riding in a chariot to ignore the skill cap placed upon their combat rolls by the driver's Drive skill."},
 {name:"Chi Push (requires Push Hands)",category:"Unarmed",source:"raleel campaign",desc:"The character may add his POW/5 to the distance pushed on a Bash special effect with unarmed attacks. Alternatively, for a more wuxia game, use Mysticism/10."},
 {name:"Chokehold",category:"Unarmed",source:"raleel campaign",desc:"If you have established a grapple against an opponent's head, you may choose to apply 1d2 levels of fatigue instead of damage. These levels of fatigue recover very quickly (healing rate per round) once the grapple is broken. Does not generally work on Undead."},
 {name:"Claymore",category:"Individual",source:"Stupor Mundi - Alephtar Games",desc:"Use a longsword with two hands (add 1 to damage and one level to weapon Force). This weapon and technique were only used by Scotsmen at the time."},
 {name:"Cloak Defense",category:"Individual",source:"Stupor Mundi - Alephtar Games",desc:"Your cloak provides one point of armor as long as you are not engaged in melee."},
 {name:"Create Opening",category:"Individual",source:"Hyborean",desc:"This technique for wielders of two weapons involves pushing aside an enemy's defenses with one weapon and following up with the other. The Style allows usage of the 'Flurry' Special Effect for dual-wielders; the follow-up attack must be with a different weapon. Two weapons only."},
 {name:"Cross Parry",category:"Individual",source:"Hyborean",desc:"A wielder of two weapons can choose to attempt a cross-parry. This increases the difficulty of a parry by one grade, but increases the size of the parry to one size larger than the larger of the parrying weapons. Two Size M or smaller weapons only."},
 {name:"Crossbow Handling",category:"Ranged",source:"Hyborean",desc:"Despite their many disadvantages, given the right training crossbows are simple to use. Any shot taken without penalty (Standard difficulty) instead becomes Easy difficulty. Crossbows only."},
 {name:"Dagger Prowess",category:"Individual",source:"Stupor Mundi - Alephtar Games",desc:"Permits the user to treat his knife and dagger blocks and parries as 'Medium' sized, enabling him to better defend himself from armed opponents."},
 {name:"Daredevil",category:"Individual, Unarmed",source:"Mythras",desc:"May use Evade to dodge blows in hand to hand combat without ending up prone."},
 {name:"Defensive Minded",category:"Individual",source:"Mythras",desc:"Increases the Size of your weapon when parrying by one step, provided no offensive action is taken that round."},
 {name:"Diadochi Pike",category:"Formation (3+ same trait)",source:"Diadochi Warlords",desc:"Allows a group of three or more shield users to overlap their protection, adding one to the number of locations which can be protected with passive blocking, and resisting Knockback, Leaping attacks and Bash as if using the Brace action. All of the characters need to have this. Negates auto Combat Effect for missiles if a hard combat Style roll is made."},
 {name:"Do or Die",category:"Individual",source:"Mythras",desc:"Allows dual weapon combinations to use the Flurry special effect, provided that each subsequent attack utilises the alternating weapon."},
 {name:"Dodge",category:"Individual",source:"Shores Of Korantia",desc:"This Combat Style can be used to dodge incoming blows with the effectiveness of a parry (Size S), without going prone as when Evading."},
 {name:"Eight Jab Doom",category:"Unarmed",source:"Monster Island",desc:"Unarmed, fingertip Needles (MI pg 21). Permits the user to treat his Unarmed blocks and parries as 'Medium' sized, enabling him to better defend himself from armed opponents."},
 {name:"Excellent Footwork",category:"Individual",source:"Mythras",desc:"When fighting on slippery, wobbling surfaces the user can ignore the skill cap placed on combat rolls by the Acrobatics skill."},
 {name:"Flamboyance",category:"Individual",source:"Book of Quests",desc:"Any uses of the combat style to pose impressively and beautifully are one difficulty grade easier than normal. This trait is often found in societies where actual combat is rare and the intent is to use the combat style more as a highly stylised dance than as an actual fighting technique."},
 {name:"Flurry",category:"Individual",source:"Shores Of Korantia",desc:"Any active shield parry can immediately be followed up by a sword blow at the cost of a further Action Point."},
 {name:"Formation Fighting",category:"Formation (3+ same trait)",source:"Mythras",desc:"Permits a group of three or more warriors to draw into close formation, placing more open or disordered opponents at a disadvantage (provided the 'unit' cannot be outflanked) and thus reducing each foe's Action Points by one if they engage. All of the group need to have this."},
 {name:"Grappler",category:"Unarmed",source:"raleel campaign",desc:"The style grants its user an advantage when entangling or immobilising opponents, making a foe's opposed rolls to evade or break free one difficulty grade harder. (Rq6 pg 135)"},
 {name:"Grappling Transition",category:"Unarmed",source:"raleel campaign",desc:"When grappling, if you succeed on a grapple check to do damage, you may instead shift the location of your grapple to an adjacent location."},
 {name:"Ground Fighter",category:"Unarmed",source:"raleel campaign",desc:"While prone and fighting against another prone opponent, you suffer a Hard penalty instead of a Formidable one."},
 {name:"Hawkeye",category:"Ranged",source:"Shores Of Korantia",desc:"Penalties for shooting smaller than man-size targets are reduced by one grade."},
 {name:"Hidden Weapons",category:"Individual",source:"Mythras",desc:"Allows the user to utilise seemingly innocuous objects noted as part of the style as deadly weapons, with no chance of accidental breakage despite apparent delicacy (fans or musical instruments for example)."},
 {name:"Hooker",category:"Individual",source:"Mythic Rome",desc:"Allows use of the Pin Weapon special effect on a normal success."},
 {name:"Horse Archery",category:"Ranged",source:"Stupor Mundi - Alephtar Games",desc:"Shooting arrows from galloping horseback. Applies only to bow. Style allows rider to ignore the skill cap placed upon combat rolls by the Ride skill. The style permits launching ranged attacks whilst galloping."},
 {name:"Immobilise",category:"Unarmed",source:"Mythic Constantinople",desc:"When you have someone grappled or entangled, in lieu of damage you may use your action to try to immobilise the hit location you are grappling. Roll your Combat Style opposed by your target's Endurance; if successful, adjudicate like the Stun Location Special Effect (Mythras page 99), but this does not need a level of success to employ and only lasts for as long as you maintain the grapple."},
 {name:"Impromptu Weapons",category:"Individual",source:"Monster Island",desc:"Treat any objects as club. (MI pg 41)"},
 {name:"Improved Surrender",category:"Individual",source:"Stupor Mundi - Alephtar Games",desc:"You can use the Compel Surrender effect defensively against any opponent of the same religion even when he or she is not at a disadvantage. If you win, your foe does not surrender but rather feels that you are too holy to harm and must stop attacking you (but not your friends). If you later attack the enemy the effect is negated."},
 {name:"Intimidating Scream",category:"Individual",source:"Mythras",desc:"Style encourages frequent yells and bellows in combat to intimidate foes, making any psychological resistance rolls inflicted on an opponent one grade harder."},
 {name:"Intimidating Scream (Formation)",category:"Formation (3+ same trait)",source:"Mythic Rome",desc:"Style encourages frequent yells and bellows in combat to intimidate foes, making any psychological resistance rolls inflicted on an opponent one grade harder. This trait allows the formation to utilise the Intimidate creature ability but only before combat starts or when they have their opponents at a severe disadvantage. Opponents must make an unopposed Willpower roll to hold their ground; a success allows a character to stand his ground, whereas a failure indicates that they must spend the next round instinctively placing distance between themselves and the creature. If he fumbles the Willpower roll, then the character flees at maximum speed. A critical success allows the character to ignore any further intimidation attempts by the creature or its brethren during that encounter."},
 {name:"Iron Holds",category:"Unarmed",source:"Hyborean",desc:"This unarmed style teaches techniques to maintain holds on an opponent. Any opposed rolls to escape from the Grip Special Effect or Grappling are one step harder. Unarmed only."},
 {name:"Joint Locks",category:"Unarmed",source:"Weird of Hali",desc:"Style includes joint locks that permit immobilizing or throwing an opponent after a successful grip effect."},
 {name:"Joint Lock",category:"Unarmed",source:"raleel campaign",desc:"If you have established a grapple against an opponent's limb (as determined by the GM), step up your damage mod one step when applying grappling damage. Does not work on things without bones."},
 {name:"Kick Training",category:"Unarmed",source:"raleel campaign",desc:"You can make kick attacks. For your attack, your unarmed damage and reach increases by one step. If a defender uses the trip special effect against you for this attack, your roll to resist is Hard."},
 {name:"Knockout",category:"Unarmed",source:"Hyborean",desc:"This unarmed style emphasises powerful blows to the head to knock the opponent unconscious. When using the Stun Location special effect on the enemy's head, the roll to resist is one grade more difficult. Unarmed only. Human (or human-like) opponents only."},
 {name:"Knockout Blow",category:"Individual",source:"Mythras",desc:"When attacking with surprise, treat any Stun Location as lasting minutes instead of turns."},
 {name:"Kuschile Archery",category:"Ranged",source:"AiG",desc:"Permits up to three arrows to be held in the drawing hand so that they may be released sequentially with no delay for reloading between each shot. Priming the hand requires an entire round during which no other aggressive action may be performed."},
 {name:"Lancer",category:"Individual",source:"Hyborean",desc:"This Combat Style emphasizes devastating charges with Lances or other weapons. Performing a mounted charge with this combat style does not incur the one step difficulty penalty."},
 {name:"Longbow",category:"Ranged",source:"Stupor Mundi - Alephtar Games",desc:"+1 to Longbow damage (this represents both the real superiority of the longbow as a field weapon and the fact that it required dedicated training)."},
 {name:"Longshot",category:"Ranged",source:"Hyborean",desc:"The style emphasises accurate fire at extreme ranges. When firing ranged weapons, use the row one step above the correct row for Distance (i.e. when shooting at 125m, use the 101-120m row)."},
 {name:"Lunge",category:"Individual",source:"Hyborean",desc:"Mastery of the rapier allows for lightning-fast strikes. This style allows usage of the 'Flurry' Special Effect. Rapier only."},
 {name:"Mancatcher",category:"Individual",source:"Mythras",desc:"The style grants its user an advantage when entangling or immobilising opponents, making a foe's opposed rolls to evade or break free one difficulty grade harder."},
 {name:"Marksmanship",category:"Individual",source:"Hyborean",desc:"This style focuses on accurate ranged fire and striking small targets. When rolling a random Hit Location, the location struck may be shifted to an adjoining Hit location. Ranged Weapons only."},
 {name:"Morokanth Fu",category:"Unarmed",source:"AiG",desc:"On a successful unarmed attack may immediately apply a defensive special effect in addition to any offensive special effect. Defensive is ALWAYS applied if the morokanth does not use a made weapon. (GB pg 31, BaB pg 52)"},
 {name:"Mounted Combat",category:"Individual",source:"Mythras",desc:"Style allows rider to ignore the skill cap placed upon combat rolls by the Ride skill."},
 {name:"Mounted Skirmisher",category:"Individual",source:"Supplement (not in Core p.89)",desc:"The style permits launching ranged attacks whilst moving fast (but not whilst galloping)."},
 {name:"On the Fly",category:"Ranged",source:"Shores Of Korantia",desc:"Reduce ranged attack penalties for a fast moving target by one grade."},
 {name:"Pavisier",category:"Individual",source:"Hyborean",desc:"This combat style includes training in carrying a pavise that can be deployed for protection. When carrying a pavise on the back it is considered to be 'worn' (one-half ENC). Wearing a pavise on the back allows for passive blocking for attacks coming from the rear."},
 {name:"Pelorian Cavalry",category:"Individual",source:"AiG",desc:"Performing a mounted charge with this combat style does not incur the one step difficulty penalty to hit. Allows rider to ignore the skill cap placed upon combat rolls by the Ride skill. Permits launching ranged attacks whilst moving fast (but not whilst galloping)."},
 {name:"Phalanx",category:"Formation (3+ same trait)",source:"Shores Of Korantia",desc:"In phalanx formation the unit's hedged spears and/or shields combine to provide some protection for the group against missiles. The unit's average Lore (Tactics and Drill) is used to oppose incoming missile fire, which prevents the automatic award of a Special Effect if ranged attacks are not actively parried."},
 {name:"Pike Phalanx",category:"Formation (3+ same trait)",source:"rangerdan's combat style traits",desc:"Permits a group of three or more warriors to draw into close formation, placing more open or disordered opponents at a disadvantage (provided the 'unit' cannot be outflanked) and thus reducing each foe's Action Points by one if they engage. All of the group need to have this. Any enemies engaged with the first rank of pike phalangites at range L or shorter can be engaged by the second rank of phalangites with their pikes. Any enemies engaged with the first rank of pike phalangites at range S or shorter can be engaged by the second and third rank of phalangites with their pikes. Every pike phalangite is considered to have Passive Blocking of size L on one random hit location (determine the protected location randomly each time a pikeman is struck by missile fire). This is in addition to any passive protection from a pikeman's shield."},
 {name:"Pike-and-Shield",category:"Formation (3+ same trait)",source:"Hyborean",desc:"Permits a group of three or more warriors to draw into close formation, placing more open or disordered opponents at a disadvantage (provided the 'unit' cannot be outflanked) and thus reducing each foe's Action Points by one if they engage. All of the group need to have this. This style allows a fighter in formation to use the shield's Passive Blocking ability on 2 locations against ranged attacks even though he is carrying a two-handed weapon. Pike and Buckler only."},
 {name:"Poisoner",category:"Individual",source:"Hyborean",desc:"The style includes training in using poison on weapons and delivering it effectively to the target. The user of this Combat Style may use a Special Effect to 'Inject Poison', in order to deliver an Injected poison to the target on an unprotected area, ignoring any armour, but forfeiting a damage roll. Inject Poison follows the same rules as Choose Location with regards to usage with ranged weapons. The GM may rule that a sufficiently armoured target has no unprotected areas and is therefore immune to Inject Poison."},
 {name:"Prancing",category:"Individual",source:"AiG",desc:"May use the springing leaps of his mount to evade ranged attacks without going prone by rolling against Ride skill. In addition may fire at the top of a jump ignoring passive cover from shields."},
 {name:"Press Home",category:"Formation (3+ same trait)",source:"Mythic Rome",desc:"Allows the formation to engage and keep an enemy unit at Short reach, penalising foes using longer weapons."},
 {name:"Pressure Points",category:"Unarmed",source:"Weird of Hali",desc:"Any successful hit has the stun location effect due to the character's knowledge of vulnerable points."},
 {name:"Pull Blows",category:"Individual",source:"Sorandib",desc:"'Pull' blows as a Special Effect, choosing the extent of the damage he wishes to inflict up to the weapon's maximum, with a minimum of 1. Using this manoeuvre automatically negates the duellist's Damage Bonus."},
 {name:"Push",category:"Unarmed",source:"raleel campaign",desc:"The attacker may use the Bash special effect with his Unarmed attacks. They are treated as a weapon for determining distance pushed."},
 {name:"Push Hands (requires Push)",category:"Unarmed",source:"raleel campaign",desc:"If the attacker can use the Bash special effect with his unarmed attacks, treat them as a shield for the purposes of the knockback on this special effect."},
 {name:"Ranged Marksman",category:"Ranged",source:"Mythras",desc:"When using a ranged weapon, shift a random Hit Location roll to an adjoining body location."},
 {name:"Rapid Fire",category:"Ranged",source:"Shores Of Korantia",desc:"The archer can reload and fire prepared ammunition as a single Action up to three times, however, each shot is at one grade of difficulty higher than the last (Hard, Formidable, Herculean)."},
 {name:"Reload Drill",category:"Ranged",source:"Hyborean",desc:"This style includes heavily drilled actions for improving the reload times of ranged weapons. Reduce Reload time of one weapon by one action. Rapid Reload is no longer available as a Special Effect for that weapon."},
 {name:"Sacrifice Throw",category:"Unarmed",source:"raleel campaign",desc:"When performing a Trip special effect, the character attempting may impose a Formidable penalty to his opponent's attempt to resist. If the resistance roll fails, both end up prone."},
 {name:"Sagittan Peltast",category:"Ranged",source:"AiG",desc:"When using a ranged weapon, shift a random Hit Location roll to an adjoining body location. The style permits launching ranged attacks whilst at a run (but not whilst sprinting)."},
 {name:"Sea Legs",category:"Individual",source:"Hyborean",desc:"Practitioners of this Combat Style are used to fighting on the unstable surface of a sea-faring ship. They may ignore the penalty for 'Fighting while on unstable ground' in this situation."},
 {name:"Shield Splitter",category:"Individual",source:"Mythras",desc:"Permits clubs and axes to roll the weapon's damage twice and pick the best result, but only when using the Damage Weapon special effect against shields."},
 {name:"Shield Wall",category:"Formation (3+ same trait)",source:"Mythras",desc:"Allows a group of three or more shield users to overlap their protection, adding one to the number of locations which can be protected with passive blocking, and resisting Knockback, Leaping attacks and Bash as if using the Brace action. All of the characters need to have this."},
 {name:"Showmanship",category:"Individual",source:"Hyborean",desc:"This style emphasises exaggerated moves and flourishes intended to impress an audience or taunt an opponent. Using this style in combat allows a combatant to spend an available Special Effect to 'put on a show' for all onlookers as a demonstration of prowess, humour or disdain. Roll an appropriate skill (Combat Style, Perform, Dance, other) to determine the effect. If used to impress an audience, a successful roll may sway the audience to the fighter's favour. If used to enrage or intimidate an opponent, the opponent may resist with a Willpower roll, with a failure leading to a penalty to actions at the GM's discretion."},
 {name:"Siege Warfare",category:"Siege weapons",source:"Mythras",desc:"The style permits its user to ignore the skill cap placed upon combat rolls by the Athletics skill when making assaults whilst scaling walls or crawling through tunnels."},
 {name:"Skirmishing",category:"Individual",source:"Mythras",desc:"The style permits launching ranged attacks whilst at a run (but not whilst sprinting). The attack cannot exceed the user's Athletics skill (Core pp.89, 108)."},
 {name:"Solid Stance",category:"Individual",source:"Mythic Rome",desc:"Resist Knockback, Leaping Attacks and Bash as if using the brace action."},
 {name:"Spear Phalanx",category:"Formation (3+ same trait)",source:"rangerdan's combat style traits",desc:"Permits a group of three or more warriors to draw into close formation, placing more open or disordered opponents at a disadvantage (provided the 'unit' cannot be outflanked) and thus reducing each foe's Action Points by one if they engage. Allows a group of three or more shield users to overlap their protection, adding one to the number of locations which can be protected with passive blocking, and resisting Knockback, Leaping attacks and Bash as if using the Brace action. All of the characters need to have this. Any enemies engaged with the first rank of spear phalangites at range S or shorter can be engaged by the second rank of phalangites with their spears."},
 {name:"Street Fighter",category:"Individual",source:"Sofia of the Ironlands",desc:"When opponent tries to change range to get out of your closed range, they may do so at a Hard Difficulty Modifier."},
 {name:"Street Mob",category:"Formation (3+ same trait)",source:"Mythic Rome",desc:"Permits a group of three or more fellow citizens to utilise the Intimidate creature ability but only before combat starts or when they have their opponents at a severe disadvantage. The mob may intimidate opponents as a prelude to combat or to avoid it altogether: growls, snarls, roars, surges and so forth. Opponents must make an unopposed Willpower roll to hold their ground; a success allows a character to stand his ground, whereas a failure indicates that they must spend the next round instinctively placing distance between themselves and the creature. If he fumbles the Willpower roll, then the character flees at maximum speed. A critical success allows the character to ignore any further intimidation attempts by the creature or its brethren during that encounter. The effect continues for as long as the creature continues to act in a threatening manner, which includes it making an attack."},
 {name:"Strong Pull",category:"Ranged",source:"Hyborean",desc:"This Combat Style emphasises strength training and techniques to maximise a bow's pull. Increase the Damage Modifier when firing the bow by one step."},
 {name:"Sucker Punch",category:"Individual",source:"Weird of Hali",desc:"The style includes trick attacks, and on a Critical Success these gain the benefits of surprise (see Surprise, p.59)."},
 {name:"Sure-footed",category:"Individual",source:"Shores Of Korantia",desc:"No penalties for fighting on a heaving deck, and marines are even taught to hurl a javelin from a seated position without penalty."},
 {name:"Swashbuckling",category:"Individual",source:"Mythras",desc:"Style allows the user to engage in attacks and evades made whilst jumping or swinging into (or disengaging from) combat, ignoring any skill cap placed on it by the Athletics skill."},
 {name:"Take Down",category:"Unarmed",source:"Mythic Constantinople",desc:"Unarmed Combat - Using leg sweeps or throws that use the opponent's weight against him, rolls to resist your Trip Special Effect are made at one difficulty grade harder."},
 {name:"Testudo",category:"Formation (3+ same trait)",source:"rangerdan's combat style traits",desc:"Permits a group of three or more warriors to draw into close formation, placing more open or disordered opponents at a disadvantage (provided the 'unit' cannot be outflanked) and thus reducing each foe's Action Points by one if they engage. Allows a group of three or more shield users to overlap their protection, adding one to the number of locations which can be protected with passive blocking, and resisting Knockback, Leaping attacks and Bash as if using the Brace action. All of the characters need to have this. The unit may form a testudo with heavy shields granting Passive Blocking to all locations for all members of the unit except those at the flanks and rear. A unit in testudo formation may not move faster than a walk."},
 {name:"Throw Weapons",category:"Ranged",source:"Mythras",desc:"Any nominal melee weapon in the style can also be thrown at no penalty to skill, but when used in this way a weapon's damage roll is halved."},
 {name:"Toxic Touch",category:"Unarmed",source:"Monster Island",desc:"May wield small venomous creatures as part of the Unarmed skill, inflicting the creature's damage instead of their own. (MI pg 41)"},
 {name:"Trained Beast",category:"Individual",source:"Mythras",desc:"Intended for styles which emphasise fighting in close coordination with an animal companion (such as trained birds of prey, pet wolves, and so on), the user may utilise any of his Action Points to defend against attacks launched at his beast."},
 {name:"Unarmed Prowess",category:"Unarmed",source:"Mythras",desc:"Permits the user to treat his Unarmed blocks and parries as 'Medium' sized, enabling him to better defend himself from armed opponents."},
 {name:"Unarmed Throws",category:"Unarmed",source:"Hyborean",desc:"This unarmed style teaches techniques to use an opponent's weight against him and drop him prone. When using the Trip Opponent Special Effect the Brawn, Evade or Acrobatics roll to avoid falling prone is one step harder. Unarmed only."},
 {name:"Versatile",category:"Individual",source:"Shores Of Korantia",desc:"Any ENC 1 single handed weapon can be used with only one grade of difficulty harder."},
 {name:"Volley Fire",category:"Formation (3+ same trait)",source:"Mythic Constantinople",desc:"Requires three or more combatants with the same Combat Style Trait to all be attacking with missile weapons at the same target or targets. As long as at least one of the combatants succeeds in an attack roll, the enemy is affected by the Pin Down Special Effect in addition to any other Special Effects earned from levels of success. This tactic can be used against a group of enemy soldiers of equal or lesser frontage than the archers."},
 {name:"Water Combat",category:"Individual",source:"Mythras",desc:"The style allows its user to ignore the skill cap placed on combat rolls by the Swim skill."},
 {name:"Windage",category:"Ranged",source:"Shores Of Korantia",desc:"Reduce the difficulty imposed by wind strength by one grade."}
];
const COMBAT_TRAIT_CATEGORIES=[...new Set(COMBAT_TRAITS.map(t=>t.category))];

// Armour Table (p.58), Base Construction rows — AP/ENC per location, and the
// pre-computed full 7-location Suit ENC/Cost/Armour Penalty for reference.
// Half Plate's suit stats confirmed 28/3500/6 against the page image (an
// earlier OCR-only pass had misread this as "2/3500/6").
const ARMOR_MATERIALS=[
 {name:"None",ap:0,encPerLoc:0,suit:"0/0/0"},
 {name:"Natural/Cured (furs, hides)",ap:1,encPerLoc:2,suit:"14/140/3"},
 {name:"Padded/Quilted (aketon, gambeson)",ap:2,encPerLoc:1,suit:"7/560/2"},
 {name:"Laminated (linothorax, bezainted)",ap:3,encPerLoc:2,suit:"14/1260/3"},
 {name:"Scaled (brigandine, lamellar)",ap:4,encPerLoc:3,suit:"21/2240/5"},
 {name:"Half Plate (hoplite plate)",ap:5,encPerLoc:4,suit:"28/3500/6"},
 {name:"Mail (mail hauberk, laminar)",ap:6,encPerLoc:5,suit:"30/6300/7"},
 {name:"Plated Mail (splinted chainmail)",ap:7,encPerLoc:6,suit:"42/9800/9"},
 {name:"Articulated Plate (gothic plate)",ap:8,encPerLoc:7,suit:"49/16800/10"}
];
// Core pp.60–61. Costs are in silver, including copper prices at 10 cp/sp.
const CORE_TOOLS=[
 ["Abacus",1,8],["Astrolabe",1,200],["Backpack / satchel",1,5],["Bedroll",1,1],
 ["Bit and bridle",1,15],["Block and tackle",1,15],["Bottle",0,2],["Candle (6 hours)",1,1],
 ["Chain (2 m)",2,40],["Large chest",5,80],["Small chest",3,40],["Travel cooking pot",2,3],
 ["Basic craft tools",2,75],["Riding crop",0,15],["Crowbar",1,25],["Doorjamb",2,5],
 ["Driver’s whip",0,25],["Falconer’s kit",1,30],["Mount feed (one day)",1,0.5],
 ["Wine goblet (glass)",0,8],["First aid kit",0,25],["Fish hooks (20)",0,1],
 ["Fishing kit",1,15],["Fishing net",4,10],["Flint and tinder",0,1],["Game snares and traps",1,1],
 ["Goad",1,25],["Grappling hook",0,5],["Hammer / saw / mallet / chisel",1,1],
 ["Healer’s kit",1,150],["Hourglass",1,20],["Knife (tool)",0,5],["Rope ladder (3 m)",4,2],
 ["Basic lantern",1,10],["Lock picks",0,75],["Lodestone",0,5],["Milling stone",2,8],
 ["Hand mirror",1,12],["Wooden mug / beaker / dish / plate",0,0.5],["Musical instrument",2,70],
 ["Nails or tacks (50)",0,0.2],["Oil flask",1,1],["Papyrus or paper (one sheet)",0,0.5],
 ["Pickaxe",1,35],["Pole (3 m)",1,1],["Quills and ink",1,30],["Quiver",0,2],
 ["Folding razor",0,3],["Hemp rope (10 m)",2,10],["Large sack",1,0.5],["Small sack",0,0.2],
 ["Riding saddle",3,60],["War saddle",4,90],["Saddlebag",2,20],["Hand saw",1,1],
 ["Scythe / sickle",2,30],["Sextant",1,25],["Ship’s compass",1,70],["Horse shoes",1,10],
 ["Spade / hoe / pitchfork",1,25],["Torch (1 hour)",0,0.4],["Torch (6 hours)",1,0.8],
 ["Waterskin or canteen",1,0.5],["Wax block",1,0.2]
];

const ARMOR_MAP=Object.fromEntries(ARMOR_MATERIALS.map(a=>[a.name,a]));
const ARMOR_LOCATIONS=["Head","Chest","Abdomen","Right Arm","Left Arm","Right Leg","Left Leg"];
// Core p.58 material multipliers for GM-approved armour construction.
const MATERIAL_ENC_MULT={"Bone":1.5,"Bronze":1,"Chitin":0.75,"Iron":1,"Ivory":1.25,
 "Leather":2,"Linen":1,"Shell":2,"Silk":0.75,"Steel":0.75,"Stone":3};

// Social Class / Money Modifier tables, per culture (Culture & Community
// chapter, p.24) — transcribed and confirmed against the page image.
const SOCIAL_CLASSES={
 "Barbarian":[["Outcast",0.25],["Slave",0.5],["Freeman",1],["Gentry",3],["Ruling",5]],
 "Civilised":[["Outcast",0.25],["Slave",0.5],["Freeman",1],["Gentry",3],["Aristocracy",5],["Ruling",10]],
 "Nomadic":[["Outcast",0.25],["Slave",0.5],["Freeman",1],["Ruling",3]],
 "Primitive":[["Outcast",0.25],["Freeman",1],["Ruling",2]]
};

// Core p.24 social class d100 upper bounds, aligned with SOCIAL_CLASSES.
const SOCIAL_CLASS_ROLL_BOUNDS={Barbarian:[5,15,80,95,100],Civilised:[2,20,70,95,99,100],Nomadic:[5,10,90,100],Primitive:[5,80,100]};
function socialClassForRoll(culture,roll){
  const bounds=SOCIAL_CLASS_ROLL_BOUNDS[culture],classes=SOCIAL_CLASSES[culture];
  if(!bounds||!classes||!Number.isInteger(roll)||roll<1||roll>100)return null;
  return classes[bounds.findIndex(upper=>roll<=upper)]||null;
}

// Damage Modifier table (core p.9, verified visually)
const DM_TABLE=[[5,"-1d8"],[10,"-1d6"],[15,"-1d4"],[20,"-1d2"],[25,"+0"],[30,"+1d2"],
[35,"+1d4"],[40,"+1d6"],[45,"+1d8"],[50,"+1d10"],[60,"+1d12"],[70,"+2d6"],
[80,"+1d8+1d6"],[90,"+2d8"],[100,"+1d10+1d8"],[110,"+2d10"],[120,"+2d10+1d2"],[130,"+2d10+1d4"]];

// Passions (workbook Passions Examples table)
const PASSION_TYPES={
 romantic:{label:"Romantic or familial (loved one)",calc:"30 + loved one's POW + CHA",needs:["subjPOW","subjCHA"]},
 platonic:{label:"A person — platonic",calc:"30 + own POW + subject's CHA",needs:["subjCHA"]},
 averse:{label:"A person — averse (hate/fear)",calc:"30 + own POW + subject's CHA",needs:["subjCHA"]},
 org:{label:"An organisation or group",calc:"30 + POW + INT",needs:[]},
 species:{label:"A race or species",calc:"30 + POW x2",needs:[]},
 place:{label:"A place",calc:"30 + POW + INT",needs:[]},
 concept:{label:"A concept or ideal",calc:"30 + POW + INT",needs:[]},
 object:{label:"An object or substance",calc:"30 + POW x2",needs:[]}};

// Cult & Community. The rank ladder, requirements and training-discount
// numbers below are transcribed from the Cults & Brotherhoods chapter
// (pp.196-199, "Comparative Rank Titles" table + per-rank Requirements/
// Duties/Privileges/Training sections), confirmed against the page images.
// The five organisation types (Theist Cult / Animist Cult / Sorcery Order /
// Mystical Order / Brotherhood) and their rank titles are the book's own —
// what stays setting-specific (and IS meant to, per the book: cults are
// deliberately campaign-defined) is which deity/spirit/order a given
// archetype represents, its name, and which skill it teaches. The
// archetypes themselves, their names/blurbs and the skill each teaches
// remain a house list for Sit'ota, not a book table.
//
// Important correction from an earlier pass: rank does NOT grant a flat
// skill % bonus in the book — there is no such mechanic. What rank actually
// gates is (a) which magic the organisation will teach you, and (b) a
// Training Discount (cheaper skill training between sessions, an economic
// modifier, not a stat bump). Advancing past Common also requires already
// having specific cult skills at specific %s for a minimum number of years
// — i.e. rank is earned through play, not picked freely at chargen. This
// tool still lets you set a starting rank (a returning/veteran PC might
// reasonably start above Common with GM sign-off), but no longer folds it
// into any skill's %, and the Cult step now shows the real requirement text
// so an out-of-reach rank is visibly a choice, not a free bonus.
const CULT_ORG_TYPES={
 theist:{label:"Theist Cult",ranks:["Lay Member","Initiate","Acolyte","Priest","High Priest"]},
 animist:{label:"Animist / Spirit Cult",ranks:["Follower","Spirit Worshipper","Shaman","High Shaman","Spirit Lord"]},
 sorcery:{label:"Sorcery Order",ranks:["Novice","Apprentice","Adept","Mage","Arch Mage"]},
 mystical:{label:"Mystical Order",ranks:["Aspirant","Student","Disciple","Master","Sage"]},
 brotherhood:{label:"Brotherhood / Guild",ranks:["Associate","Apprentice","Journeyman","Master","Grand Master"]}
};
// Generic tier index shared by every organisation type (p.197-200).
const CULT_TIERS=["Common","Dedicated","Proven","Overseer","Leader"];
const CULT_TIER_REQUIREMENTS=[
 "Basic understanding of the organisation's beliefs; a small donation of time or money each visit to the shrine/temple, or to pay dues.",
 "Know at least 5 cult skills at 50% or better.",
 "Dedicated member for a minimum of 3 years; know at least 4 cult skills at 70% or better; a valuable gift or service rendered to the cult.",
 "Proven member for a minimum of 5 years; know at least 3 cult skills at 90% or better.",
 "Overseer for a minimum of 10 years; know at least 2 cult skills at 110% or better; an invaluable service performed for the cult."
];
const CULT_TIER_TRAINING_DISCOUNT=[0,25,50,75,100]; // % off training costs, p.199 — not a skill bonus
const CULT_ARCHETYPES=[
 {key:"warrior",org:"theist",name:"Warrior Cult",skill:"Devotion",passion:"Devotion to ",blurb:"A martial brotherhood sworn to a war god or ancestor-champion — combat rites and blood oaths."},
 {key:"healer",org:"animist",name:"Healing Cult",skill:"Folk Magic",passion:"Devotion to ",blurb:"Menders and midwives keeping the old healing rites."},
 {key:"trickster",org:"animist",name:"Trickster Cult",skill:"Folk Magic",passion:"Devotion to ",blurb:"Storytellers and rule-benders devoted to a clever, dangerous spirit."},
 {key:"death",org:"animist",name:"Death / Ancestor Cult",skill:"Trance",passion:"Loyalty to ",blurb:"Tenders of the dead and speakers for ancestors."},
 {key:"nature",org:"animist",name:"Nature / Earth Cult",skill:"Folk Magic",passion:"Devotion to ",blurb:"Keepers of the wild places and the turning seasons."},
 {key:"craft",org:"brotherhood",name:"Craft / Smith Guild",skill:"Devotion",passion:"Loyalty to ",blurb:"A guild-cult of makers, sworn to a patron of the forge or loom."},
 {key:"sea",org:"theist",name:"Sea / Storm Cult",skill:"Devotion",passion:"Devotion to ",blurb:"Sailors and fisherfolk who propitiate the waters."},
 {key:"sorcerous",org:"sorcery",name:"Sorcerous Order",skill:"Invocation",passion:"Loyalty to ",blurb:"A school or lodge of learned magic — doctrine and study rather than devotion."},
 {key:"community",org:"brotherhood",name:"Community / Ancestral Ties",skill:"Culture",passion:"Loyalty to ",blurb:"Not a religion at all — just the obligations and standing of your home community."}
];
function cultArch(){return CULT_ARCHETYPES.find(a=>a.key===S.cultMembership.archetype)||null;}
function cultOrgType(a){return CULT_ORG_TYPES[(a&&a.org)||"theist"];}
function cultRankTitle(a,tierIdx){return cultOrgType(a).ranks[tierIdx]||CULT_TIERS[tierIdx];}
function cultMemberSkillKey(){const a=cultArch();return a?profKey(a.skill,S.cultMembership.name||a.name):null;}

// Quick Character (Character Creation Workbook, "Attribute Summary" quick-gen
// box): a flat 100-point pool across all Standard Skills, three chosen
// Professional Skills, and one optional Combat Style — 5-15 each — instead
// of the full Culture(100)+Career(100)+Bonus(150) pipeline. Characteristics
// still use the normal roll or 80-point build; these hints just let the
// three Professional Skill pickers show a speciality field where the core
// skill list conventionally needs one (matches the Culture/Career "(any)"
// style offers already used elsewhere in this file).
const QUICK_SPEC_HINTS={"Art":"any","Binding":"Cult, Totem or Tradition","Craft":"any",
"Culture":"any","Devotion":"Pantheon, Cult or God","Invocation":"Cult, School or Grimoire",
"Language":"any","Lore":"any","Literacy":"associated language",
"Musicianship":"instrument group","Mysticism":"tradition or foundation","Navigation":"region or environment"};

// Pulp Hero / Paragon character tiers (Mythras Companion, "Pyramids, Pulp, &
// Paragons", pp.54-55, verified against page scans). Advantages cannot be
// stacked (pick each at most once). The Companion's own text labels the
// Paragon bonus-skill-points line "Heroic characters" — a book quirk,
// preserved rather than silently corrected.
const ADVANTAGE_DEFS=[
 {key:"ap",label:()=>"+1 Action Point"},
 {key:"luck",label:t=>"+"+(t==="paragon"?2:1)+" Luck Point"+(t==="paragon"?"s":"")},
 {key:"hp",label:t=>"+"+(t==="paragon"?2:1)+" Hit Point"+(t==="paragon"?"s":"")+" to each Hit Location"},
 {key:"endurance",label:()=>"Endurance rolls are one Grade easier"},
 {key:"stealth",label:()=>"Stealth rolls are one Grade easier"},
 {key:"willpower",label:()=>"Willpower rolls are one Grade easier"}
];
const ARCHETYPES={
 ordinary:{label:"Ordinary", pbPoints:80, mainRolls:5, sizintRolls:2, advantages:0, bonusExtra:0, bonusCap:15},
 pulp:{label:"Pulp Hero", pbPoints:90, mainRolls:5, sizintRolls:2, advantages:2, bonusExtra:50, bonusCap:20,
   charNote:"4d6 drop-lowest &times;5 (STR/CON/DEX/POW/CHA) and 3d6+6 drop-lowest &times;2 (SIZ/INT), or a 90-point build",
   quote:"&ldquo;Roll 4d6 and discard the lowest die, five times, and then assign the results to STR, CON, DEX, POW, and CHA. Next, roll 3d6+6 and discard the lowest die twice and assign these numbers to SIZ and INT. If using the Points Build method, players build their character from a pre-set pool of 90 points.&rdquo; &mdash; Mythras Companion, p.54"},
 paragon:{label:"Paragon", pbPoints:100, mainRolls:6, sizintRolls:3, advantages:3, bonusExtra:100, bonusCap:40,
   charNote:"4d6 drop-lowest &times;6 (keep best 5 of STR/CON/DEX/POW/CHA) and 3d6+6 drop-lowest &times;3 (keep best 2 of SIZ/INT), or a 100-point build",
   quote:"&ldquo;Roll 4d6, discarding the lowest die six times, then assign the five results of your choice (typically, the highest five) to STR, CON, DEX, POW, and CHA. Next, roll 3d6+6, discarding the lowest die three times and assign the two results of your choice (typically, the highest two) to SIZ and INT. If using the Points Build method, players build their character from a pre-set pool of 100 points.&rdquo; &mdash; Mythras Companion, p.55"}
};

/* ================= MAGIC =================
   The app has always had the magic *skills* (Binding, Devotion, Exhort, Folk
   Magic, Invocation, Meditation, Mysticism, Shaping, Trance) but nothing to
   spend them on, so a caster finished character creation holding a percentage
   and no magic.

   WHAT IS AND ISN'T REPRODUCED HERE, because the difference matters:

   - FOLK MAGIC catalogue is disabled until each spell is independently verified
     against Mythras Core (p.123 onward) and licensed for republication.
     Custom spell entries remain available for GM-curated content.

   - THEISM, SORCERY, ANIMISM and MYSTICISM content — the miracle lists, the
     grimoires, the spirit rosters, the talents — is Reserved Material in the
     Mythras core rulebook and is NOT reproduced. This repo has no verified
     transcription of any of it, and fabricating spell lists would be far
     worse than a gap. What ships instead is each tradition's *mechanics*: the
     correct pools, the correct casting skill, the correct cost arithmetic and
     roll resolution, with the player entering the magic their own rulebook
     and GM allow them. That is a working system with the content left to the
     book, not a stub.

   MAGIC_TRAITS: the trait vocabulary the Folk Magic list uses. */
const MAGIC_TRAITS={
 "Concentration":"The spell's effects remain in place if the caster continues to concentrate on maintaining it. Concentration requires the caster to be free of all physical and mental distractions: any such disturbance interrupts the concentration, resulting in the spell's immediate dismissal.",
 "Instant":"The spell's effects happen immediately. It has no duration.",
 "Ranged":"Can be cast at a distance of up to the caster's Folk Magic score in metres. The caster must know the location of the target; if they cannot directly see or sense it, the casting roll is one grade harder.",
 "Touch":"The caster must be in physical contact with the target while the spell is cast. Touching the target's carried accoutrements is enough.",
 "Special Duration":"The spell states its own duration in its description rather than lasting the scene.",
 "Resist (Endurance)":"The target may resist with an Opposed Roll of Endurance against the casting result. Resisting with Endurance is a passive action.",
 "Resist (Willpower)":"The target may resist with an Opposed Roll of Willpower against the casting result. Resisting with Willpower is a passive action.",
 "Resist (Evade)":"The target may resist with an Opposed Roll of Evade against the casting result. Evading costs an Action Point — a target with none left is powerless against the spell.",
 "Resist (Special)":"Resistance depends on what is being affected; see the spell's own description.",
 "Trigger":"The spell can be cast in advance and held until its trigger condition occurs, with no further casting cost. It expires if not triggered before the scene ends (Core p.123)."
};
// Unless a spell has Concentration or Instant, it lasts the whole scene or
// action it was used for. All Folk Magic spells are Intensity and Magnitude 1
// by their minor nature.
// Core pp.123-129, all 70 spells. Generated from docs/folk-magic-catalogue.json
// by scripts/build-folk-magic.py; edit the JSON, then rerun the script.
const FOLK_MAGIC=[
 {"n": "Alarm", "t": ["Special Duration"], "d": "Casting Alarm on a location such as a room or small clearing creates a temporary psychic bond between the area and the caster. If the area is accessed by a living creature with a SIZ greater than 1, the caster is automatically made aware that something has transgressed no matter how great the distance. The Alarm is usually a distinct tingling sensation or mental twinge which will awaken the caster. Alarm can also be used on an individual object, triggering when touched or moved. The spell does not determine who or what has crossed the alarmed threshold, and neither does it prevent ingress. It lasts until triggered, but the Magic Point used to cast it does not recover until the spell is dismissed or concludes naturally. Once activated Alarm must be cast again.", "p": 123},
 {"n": "Appraise", "t": ["Instant", "Touch"], "d": "Appraise allows the immediate assessment of the quality of physical goods of combined ENC or SIZ equal to the caster's POW. The spell determines whether or not identical looking items are of the same or similar quality, or if one or more is either flawed or of a higher quality. The spell does not work on organic things, only on inanimate objects. Neither does it determine what flaws or enhancements are present; merely that they exist.", "p": 123},
 {"n": "Avert", "t": ["Instant", "Ranged"], "d": "Avert is used to dismiss another Folk Magic spell within range. Avert can be cast reactively to neutralise offensive spells, by using the Counter Magic Reactive Action.", "p": 123},
 {"n": "Babble", "t": ["Resist (Willpower)", "Touch"], "d": "Babble mangles anything spoken by its target. It does not affect what the target is thinking, only what is verbally issued. Thus Babble can seriously disrupt orders being issued by a commanding officer to his troops, but it cannot influence what the commander is thinking or his intentions. Depending on the necessity for verbal components, Babble may be able to adversely influence spell casting.", "p": 123},
 {"n": "Beastcall (X)", "t": ["Instant", "Ranged", "Resist (Willpower)"], "d": "Beastcall is used to attract a single, specific animal, the type being specified in the spell, within range. The animal summoned cannot be sapient, and it may also resist the spell using its Willpower. If it fails to resist, it is naturally drawn, in a passive fashion, to the caster, whereupon the spell dissipates, and the creature acts as it normally would, finding itself in proximity to the caster. Physical obstacles or adverse actions (such as a wall, river or line of spears, or a harsh yank on a set of reins or leash) also cause the spell to fail.", "p": 124, "spec": "animal type"},
 {"n": "Befuddle", "t": ["Ranged", "Resist (Willpower)"], "d": "Befuddle causes confusion within the mind of a corporeal target. The subject of the spell has difficulty thinking straight, forgetting where it is, what it is doing, and why — often lapsing into disassociated lines of thought. Befuddled targets can still act in self defence, but cannot initiate any constructive activity until the spell ends. Any sort of attack or threatening action instantly breaks the spell, whether or not it was directed specifically at the befuddled target.", "p": 124},
 {"n": "Bladesharp", "t": ["Touch"], "d": "Bladesharp is cast on edged and piercing melee weapons. It increases the damage of a weapon by one dice step, and incidentally leaves the edge honed after the spell concludes. This spell is often used on tools such as logging axes, ploughs and razors. Thus casting this spell on a dagger increases it to 1d6+1 damage, whereas the same spell on a great axe would increase it to 2d8+2 damage. (1d4>1d6>1d8>1d10>2d6>2d8>2d10)", "p": 124},
 {"n": "Bludgeon", "t": ["Touch"], "d": "Bludgeon is similar to Bladesharp but used on weapons and tools that deal blunt-force trauma rather than cutting or piercing damage. It is normally used to aid with threshing grain, fulling wool, or similar heavy duty work.", "p": 124},
 {"n": "Breath", "t": ["Touch"], "d": "Breath permits the recipient to hold their breath for an extended period, so that they can temporarily venture into harmful environments, such as underwater; or atmospheres tainted by rock dust, gases, smoke or poisons. The spell lasts for a maximum of half the caster's POW in minutes, during which time the recipient cannot speak or the breath is lost, and they immediately begin to asphyxiate (or become poisoned).", "p": 124},
 {"n": "Bypass", "t": ["Touch", "Trigger"], "d": "Bypass is used to cross the threshold of an area under the effect of an Alarm spell without triggering the Alarm. When cast the spell is held in preparation, triggering on contact with an Alarm spell. Of course the caster must suspect that an Alarm spell exists in the first place. Bypass does not negate the Alarm, and it must be cast for each crossing of the Alarm spell's threshold.", "p": 124},
 {"n": "Calculate", "t": ["Instant", "Ranged"], "d": "Calculate allows the immediate calculation of numbers, weight or size of a thing, be it soldiers amassed in battle formation, the length of a rope or weight of a sack of rice. The spell always yields a precise quantity, but not value or quality. Only items which are directly observable (seen, lifted, smelled, and so on), and within range can be calculated. The spell will work when cast on a container — assuming, of course, that the container is not empty.", "p": 124},
 {"n": "Calm", "t": ["Ranged", "Resist (Willpower)"], "d": "Calm attempts to dampen down the passions or the target, perhaps ensuring that a lovesick paramour doesn't press his suit, a frightened rival doesn't scream for help or that weapons are not drawn in anger. A calmed person is not otherwise mentally affected, thus any sort of assault or threatening action still permits the target to defend themselves, and even attack, albeit they will do so in a calm and level headed manner.", "p": 124},
 {"n": "Chill", "t": ["Instant", "Touch"], "d": "Chill dramatically reduces the temperature of small objects (with an ENC no larger than a third of the caster's POW) down to the temperature of ice water. Useful for rapidly cooling hot items, chilling drinks, and so forth. The spell does not freeze an object, and neither does it cause any damage to its structure: it merely renders it very cold.", "p": 124},
 {"n": "Cleanse", "t": ["Instant", "Touch"], "d": "Cleanse is used to rid an object, person or small area of dirt, grease, grime, bad smells, and so on. It does not organise or tidy the target or area; merely cleans them to a spick-and-span state. This spell is often used to launder clothes. The caster can cleanse an area equal to POW in square metres.", "p": 125},
 {"n": "Cool", "t": ["Concentration", "Touch"], "d": "Cool protects the recipient from the effects of muggy atmospheres and heat prostration, guarding them from any Fatigue caused by the natural environment. The spell does not stop the effects of heat related magic, but will make any resistance roll one difficulty grade easier. Someone under the effects of this spell wearing full hoplite armour could march through a tropical rain forest during the height of summer without harm. Cool affects a target of SIZ up to the caster's POW x2.", "p": 125},
 {"n": "Coordination", "t": ["Touch", "Trigger"], "d": "Coordination enhances manual dexterity and agility when performing a single task. When cast in preparation it permits the recipient a chance to re-roll a single skill check where coordination is required, such as Acrobatics, Lockpicking and so on. The recipient may choose the better of the two rolls, but the spell is expended in the process.", "p": 125},
 {"n": "Curse", "t": ["Special Duration"], "d": "Curse must be cast in combination with a second spell of a harmful nature. Its one and only effect is to increase the duration of the accompanying spell so that it is continuous. This comes at a cost however, since the Magic Point used to cast the curse does not return until the caster drops the curse willingly, the curse is dispelled, or the spell to which it is bound breaks naturally. Curse is commonly combined with spells such as Befuddle, Demoralise, Dullblade, Repugnance, and so on.", "p": 125},
 {"n": "Darkness", "t": ["Concentration", "Ranged"], "d": "Darkness creates an area of shadow, equal to POW in square metres, which suppresses all light within it. This is enough volume to fill a modest room, a length of corridor or form a small cloud if cast outside. All non-magical light, including sunlight, passing into or present within the boundary is reduced to the equivalent of a dim glow.", "p": 125},
 {"n": "Deflect", "t": ["Touch"], "d": "Deflect wards the recipient against tiny impacts of foreign material, such as rain drops, a cloud of midges or even flying grains of sand. The protection is limited to individual objects smaller than a child's fingernail, and thus cannot prevent normal missile weapons from striking a character.", "p": 125},
 {"n": "Demoralise", "t": ["Ranged", "Resist (Willpower)"], "d": "Demoralise temporarily fills the target with a sense of despondency towards a particular person, species, situation or object. When confronted with the subject of this despondency, any proactive skill attempts made by the afflicted character related to the source are one grade harder. However a direct assault from the subject instantly breaks the spell. Thus a character could be given a demoralising dread of heights, ensuring that any Athletic skill used for climbing or Acrobatics skill for balancing would be one difficulty grade harder.", "p": 125},
 {"n": "Dishevel", "t": ["Instant", "Touch"], "d": "Dishevel is the reverse of the Cleanse spell. Objects affected are immediately covered in grime, dust, cobwebs, and so forth. The spell can be used to make brand new objects look old and weathered or help prevent normally well turned out people from being recognised. The caster can dishevel an area equal to POW in square metres.", "p": 125},
 {"n": "Disruption", "t": ["Instant", "Ranged", "Resist (Endurance)"], "d": "Disruption is used for damaging or dissembling physical objects without the need for tools. It is commonly employed to drive off or kill living creatures, such as birds or vermin. When successfully cast, Disruption inflicts 1d3 damage to a single random Hit Location or the overall Hit Points of an object. In both cases the damage ignores any armour or natural protection.", "p": 125},
 {"n": "Dry", "t": ["Instant", "Touch"], "d": "Dry removes all extraneous moisture from an object or person, either slicking off to form a puddle or evaporating in a cloud of vapour. It is normally used to dry off after heavy rain or help protect equipment from rotting, but has a number of other versatile uses. The caster can dry an object up to POW x2 in SIZ.", "p": 125},
 {"n": "Dullblade", "t": ["Ranged"], "d": "Dullblade is the reverse of Bladesharp reducing the keenness of weapons and tools. It reduces the damage inflicted by the weapon by one step, and can never keep a sharp edge.", "p": 125},
 {"n": "Extinguish", "t": ["Instant", "Ranged"], "d": "Extinguish immediately quenches flames and small fires of modest size and heat. It is useful for dousing candles, lanterns, torches or small cook fires, but it will not work on magical or larger, more ferocious conflagrations such as pyres, burning houses or dragon flames.", "p": 125},
 {"n": "Fanaticism", "t": ["Ranged", "Resist (Willpower)"], "d": "Fanaticism is the reverse of Demoralise. It grants the target a wildly excessive or irrational devotion, dedication, or enthusiasm for a particular person, species, situation or object. Its effect is to grant the recipient a temporary Passion equal to the Folk Magic skill of the caster. Fanaticism can be used to counter Demoralise, and vice versa.", "p": 126},
 {"n": "Find (X)", "t": ["Concentration", "Ranged", "Resist (Special)"], "d": "Find has many variations, always specific, and learned as separate spells. Some common examples are given below. It works by attuning to the natural emanations of a creature or thing, alerting the caster to its presence within the spell's range. Find can be blocked by dense or thick materials such as metal, or earth and stone at least one metre thick. The spell cannot discern emotions or thoughts. Find Arrows: Locates ammunition shot by hunters, which miss their target. Find Flaw: Identifies any flaws in an object, such as hidden imperfections or physical damage. Find Livestock: Locates a particular type of animal. Can be resisted with Willpower. Find Loot: Locates precious metals and gems. Find Object: Locates a lost personal possession. Find Sickness: Identifies the existence of disease and illness, whether magical or mundane.", "p": 126, "spec": "Find variant (Arrows, Flaw, Livestock, Loot, Object, or Sickness)"},
 {"n": "Firearrow", "t": ["Touch"], "d": "Firearrow causes all missiles thrown or fired by the recipient to burst into flame when released. Ostensibly created to act as a signal flare, it has since evolved into a combat magic. Missiles under its effect add an additional 1d3 damage, but are extinguished if they impale flesh. Those that strike flammable material have a chance equal to the caster's Folk Magic skill of setting alight whatever they lodge in, such as wooden shields, thatched roofs, and so on. Wooden ammunition is consumed as part of the spell.", "p": 126},
 {"n": "Fireblade", "t": ["Touch"], "d": "Fireblade is similar to Firearrow but is instead cast on hand tools and melee weapons. The original purpose of the spell is to sterilise surgical equipment, aid in slash and burn agriculture or provide illumination during darkness without the need to carry an additional light source. If cast on a weapon it inflicts an additional 1d3 damage, and has the chance of setting flammable materials alight if held to them for several rounds (see Fire on page 79). Wooden hafted weapons under the effects of Fireblade will be consumed as part of the spell.", "p": 126},
 {"n": "Frostbite", "t": ["Ranged", "Resist (Endurance)"], "d": "Frostbite works directly on living, organic tissue, inflicting numbness and pain in one of the recipient's extremities, for example fingers, toes, buttocks, nose & ears, and so on. The caster must either touch a specific extremity or roll randomly if cast at range. If the spell is not resisted the area affected suffers sensory numbness followed by lingering pain for the duration, making skill tests utilising that location one difficulty grade harder. Frostbite does not deal direct damage but makes the affected area of limited use for a while. For instance, a victim suffering frostbite to the buttocks cannot sit without extreme discomfort.", "p": 126},
 {"n": "Glamour", "t": ["Concentration", "Ranged", "Resist (Willpower)"], "d": "Glamour makes the target alluring so that people are naturally attracted to them. The particular nature of the glamour must be chosen when cast, and can be anything from increased natural beauty, a softer more sultry voice or even a seductively perfumed body scent. Whilst the spell grants no mechanical benefits, it does ensure that the recipient will gain a chance to gather themselves an audience, engage the attention of someone they wish to make contact with, or provide a distraction enabling accomplices an opportunity to perform nefarious deeds.", "p": 126},
 {"n": "Glue", "t": ["Touch"], "d": "Glue cements together two solid, inanimate objects for the duration of the spell, for example a cart wheel to its axle or a door to its frame. Whilst under the effects of the spell the items, no matter how disparate, cannot be parted unless something actively tries to wrench them apart. In this circumstance the spell has a Brawn skill equal to five times the caster's POW, and fails when a superior Brawn is set against it, defeating it in an opposed roll. Once the spell concludes or fails the items part completely unharmed.", "p": 126},
 {"n": "Heal", "t": ["Instant", "Touch"], "d": "Heal has several different effects depending on the nature of the ailment it is being used on. If the subject is suffering from a minor complaint such as a headache, back pain, hangover, cold, warts, and so on, then the symptoms are immediately lifted. Cast on a location suffering a Minor Wound it restores all lost Hit Points instantly. Against Serious or Major Wounds no Hit Points are recovered. However the spell will stabilise locations, stop all bleeding, and prevent imminent death from inattention.", "p": 126},
 {"n": "Heat", "t": ["Instant", "Touch"], "d": "Heat dramatically increases the temperature of small objects (with an ENC no larger than a third of the caster's POW) up to the temperature of boiling water. This versatile spell is useful for mulling wine, cooking food without a fire, or warming a bed prior to sleep. It does not affect living tissue although it can affect clothing and armour, heating it to uncomfortable levels.", "p": 127},
 {"n": "Ignite", "t": ["Instant", "Ranged"], "d": "Ignite only works on flammable inorganic matter, causing a small object or hand-sized area to burst into flame. Depending on what was set alight, once burning, the flames may then spread unless quenched or countered in some way. This spell is normally used to light candles, torches or lanterns from afar. It can also be used to start a camp or cooking fire in adverse conditions, such as using damp kindling or in strong winds.", "p": 127},
 {"n": "Incognito", "t": ["Resist (Endurance)", "Touch", "Trigger"], "d": "Incognito alters the facial features of the recipient to a bland, unmemorable countenance. It does not affect the voice, mannerisms or physical size/presence of the recipient, but ensures that visually they do not stand out from the crowd. Anyone under the effects of Incognito is actively ignored by those who might otherwise be searching for him; he is simply overlooked and discounted.", "p": 127},
 {"n": "Ironhand", "t": ["Touch"], "d": "Ironhand allows the recipient to hold anything that would otherwise cause damage (such as extremely hot or cold items, or those dripping acid) without causing themselves injury. Thus a user could grasp a brand from a fire, lift a bubbling cauldron from a spit or even reach through a steam vent to grab an object on the other side. It does not grant total immunity from damage, merely stops it from conducting through the skin of the recipient's hands. The spell does not protect anything worn on the hand, so rings, gloves, and such like will suffer the effects of the source.", "p": 127},
 {"n": "Knock", "t": ["Instant", "Touch"], "d": "Knock magically unfastens any device that is currently secured with a mechanical bar or lock. It does not work on magically locked objects, only mundane ones. The spell only affects a single fastening, so if there are several locks and bars securing the object, the spell will need to be recast for each one.", "p": 127},
 {"n": "Light", "t": ["Concentration", "Ranged"], "d": "Light must be cast on an inanimate object (this could be a branch, sword blade, spear point, torch, and so on). It produces enough light to illuminate an area as though with a lantern. It can also be cast directly against a Darkness spell to counter it. In this case both spells are consumed, leaving the ambient light to illuminate the area.", "p": 127},
 {"n": "Lock", "t": ["Special Duration", "Touch"], "d": "Lock magically secures any device that already has a mechanical bar or lock present. A Locked device can be opened only by the caster, and cannot be picked by mundane means (such as by a thief using lock-picks) since the magic renders the mechanism immobile; however it could still be forced open by breaking the object the lock is set into. The magic remains in place until opened by the caster, after which the device must be subject to a further casting of Lock to restore the enchantment. The Magic Point used to cast Lock does not recover until the spell is dismissed or concludes naturally.", "p": 127},
 {"n": "Magnify", "t": ["Concentration"], "d": "Magnify allows the caster to see something twice as close as it really is. Useful for close work as well as out in the field.", "p": 127},
 {"n": "Might", "t": ["Touch"], "d": "Might permits the recipient to engage in impressive acts of physical brawn. It adds the caster's POW to the recipient's STR, but only for the purposes of lifting, breaking, and contests of strength as defined under the Brawn skill. It does not increase the character's Damage Modifier when inflicting combat damage.", "p": 127},
 {"n": "Mimic", "t": ["Touch", "Trigger"], "d": "Mimic allows the recipient to perfectly mimic the voice and mannerisms of someone the caster has seen and heard personally. It does not affect their physical appearance.", "p": 127},
 {"n": "Mindspeech", "t": ["Concentration", "Ranged", "Resist (Willpower)"], "d": "Mindspeech allows telepathy between the caster and a target, enabling verbal intercourse without needing to speak aloud. The caster and target must share the same language, or else the spell will merely transmit unintelligible gobbledegook. Attempting to cast Mindspeech on somebody beyond range automatically fails.", "p": 127},
 {"n": "Mobility", "t": ["Touch"], "d": "Mobility increases the Movement rate of the recipient by 1d3 metres for the spell's duration. It is often used by hunters, herders, and those seeking to escape pursuit.", "p": 127},
 {"n": "Pathway", "t": ["Touch"], "d": "Pathway enables the recipient to more easily travel through heavy vegetation, safe from being scratched, snagged or otherwise hindered. Under its enchantment Movement rates are not reduced in woods, jungles, swamps, and similar overgrown terrain.", "p": 127},
 {"n": "Perfume", "t": ["Concentration", "Ranged", "Resist (Willpower)"], "d": "Perfume either negates a noxious odour or imbibes an odourless substance with a pleasing fragrance. The spell does not affect the properties of the source of a stench (so a rotting carcass is still rotten) - it merely makes its presence tolerable.", "p": 128},
 {"n": "Pet", "t": ["Concentration", "Resist (Willpower)", "Touch"], "d": "Pet allows the caster to take mental control of a small creature, sending it off to scout, fetch or perform some other complex task. It can be cast on any creature neither of whose SIZ and INT characteristics may exceed half the caster's CHA. If the targeted creature is the already the loyal pet of the caster it does not need to resist the spell.", "p": 128},
 {"n": "Phantasm", "t": ["Concentration", "Ranged"], "d": "Phantasm allows the caster to weave together insubstantial or near weightless objects so that they take a shape or ghostly form. Thus a spectral figure could be woven from a naturally occurring mist, or a face formed in a pile of dead leaves. Beyond this the spell has little effect, save to frighten, intrigue or disconcert those that view it.", "p": 128},
 {"n": "Pierce", "t": ["Touch"], "d": "Pierce can be cast on any item with a point, helping it to penetrate thick surfaces. It is normally used to help sew leather, punch holes in metal or hammer pitons into stone. Any weapon or tool enhanced with this spell ignores the first two Armour Points of the person, creature or object struck.", "p": 128},
 {"n": "Polish", "t": ["Instant", "Touch"], "d": "Polish instantly buffs an object of ENC or SIZ of up to the caster's POW to a high sheen making it glossy, shiny, and highly desirable even if the quality of the article is sub-par.", "p": 128},
 {"n": "Preserve", "t": ["Instant", "Touch"], "d": "Preserve prevents organic matter, both vegetable and animal, from bacterial decay and putrefaction for 1d3 months, by sterilising it. If the material is later smoked, pickled or salted it is preserved indefinitely. The spell can halt decay that has begun, but not reverse it. The caster can affect an amount of organic matter with SIZ or ENC equal to their POW.", "p": 128},
 {"n": "Protection", "t": ["Touch"], "d": "Protection is useful in a wide range of tasks where there is a risk of accidental injury such as working in a foundry or mine. The first time the character would normally take damage that penetrates protective clothing or armour, the Protection spell will trigger, and reduce the damage taken by 1d3 points. The spell then dissipates. The spell only protects against physical damage so won't help against events such as fire, choking, and so on.", "p": 128},
 {"n": "Repair", "t": ["Instant", "Touch"], "d": "Repair fixes physical damage to an inanimate object. Each separate successful casting repairs 1d3 Hit Points of damage.", "p": 128},
 {"n": "Repugnance", "t": ["Concentration", "Ranged", "Resist (Willpower)"], "d": "Repugnance twists the appearance of the target so that they cause distaste in all those that see, hear or smell them. The particular effect must be chosen when cast, and can be anything from a great wart on the end of a nose, a high pitched nasal voice or even pungent body odour. Whatever is chosen, it will cause people to turn away from the victim or make excuses so as to leave their presence as quickly as possible.", "p": 128},
 {"n": "Shock", "t": ["Instant", "Ranged", "Resist (Evade)"], "d": "Shock produces a mild electrical discharge which may be directed at living things. The caster must either touch a specific extremity or roll randomly if cast at range. If the spell is not resisted, the shocked location is stunned for 1d3 Turns; armour does not protect. The spell makes a loud crack when cast.", "p": 128},
 {"n": "Shove", "t": ["Instant", "Ranged", "Resist (Special)"], "d": "Shove allows the caster to telekinetically move an object by giving it a single crude push. The item is not moved with enough force to inflict damage, and is still subject to gravity. The spell affects an amount of ENC or SIZ equal to the caster's POW. Living targets can resist with either Endurance or Evade.", "p": 128},
 {"n": "Sleep", "t": ["Resist (Endurance)", "Touch"], "d": "Sleep sends its recipient into a deep, peaceful sleep. It has no effect on creatures with a SIZ greater than the caster's POW. Unless the target resists, it slumbers for a number of hours equal to the half the caster's POW. However the spell takes 1d3 Rounds to take effect before the target falls unconscious. Any attempt to cast this spell in a combat situation automatically fails.", "p": 128},
 {"n": "Slow", "t": ["Ranged", "Resist (Endurance)"], "d": "Slow is the direct opposite of Mobility, slowing Movement Rate by 1d3+3 metres, if the target fails to resist.", "p": 128},
 {"n": "Speedart", "t": ["Instant", "Touch", "Trigger"], "d": "Speedart boosts the velocity of thrown or fired missiles so that they travel farther before losing efficacy. The spell increases the effective range by 1.5 times the weapon's normal distance.", "p": 128},
 {"n": "Spiritshield", "t": ["Concentration", "Resist (Willpower)", "Touch"], "d": "This spell creates a shield around the recipient which deters spirits from entering. Any spirit wishing to attack or possess the recipient must overcome the spell by winning an opposed test of their Willpower against the caster's Folk Magic skill.", "p": 129},
 {"n": "Tidy", "t": ["Instant", "Ranged"], "d": "Tidy immediately restores a number of items (up to the caster's POW) within the spell's range to a neat, tidy, and orderly fashion. Items larger than 3 ENC are shifted to a more orderly position but will require manual intervention to tidy properly.", "p": 129},
 {"n": "Tire", "t": ["Ranged", "Resist (Endurance)"], "d": "Tire inflicts one level of Fatigue on the subject unless resisted.", "p": 129},
 {"n": "Translate", "t": ["Concentration", "Resist (Willpower)", "Touch"], "d": "Translate permits the caster to understand any language spoken to him, by setting up a psychic link with the target. The translation provided is often imperfect, as complex terms or concepts cannot be comprehended, but it does allow simple communication. The spell works between sapient creatures with a definite, constructed language, and still relies on being able to see, hear or otherwise perceive the target as in normal conversation. If cast upon a creature of animal awareness, communication is restricted to the simple reception of emotional state.", "p": 129},
 {"n": "Tune", "t": ["Instant", "Touch"], "d": "Tune ensures that the musical instrument touched is in perfect pitch no matter the dampness, temperature or its general condition, ensuring that the following performance is unaffected.", "p": 129},
 {"n": "Ventriloquism", "t": ["Concentration", "Ranged", "Resist (Willpower)"], "d": "Ventriloquism allows the caster to project their voice anywhere within range. The caster needs only to think the projected words, not actually to speak them physically, which can disconcert those unaware of what is going on. If cast upon a living creature, the caster can take control of their vocal cords, and speak through them instead.", "p": 129},
 {"n": "Vigour", "t": ["Touch"], "d": "Vigour makes the recipient feel alive and energetic, being used to offset the effects of strenuous physical labour. For the spell's duration, all Fatigue effects gained from laborious activity are ignored (but return on the spell's dismissal). It negates the effects of a Tire spell.", "p": 129},
 {"n": "Voice", "t": ["Concentration", "Ranged", "Resist (Willpower)"], "d": "Voice amplifies the recipient's intonation and delivery so that it becomes compelling when issuing verbal commands. All who can hear the speaker are forced to listen. Their vocalisation also carries across and through even the loudest background noise (howling gales, the roar of a waterfall, the clash of arms on a battlefield) up to a range of ten times the recipient's CHA in metres.", "p": 129},
 {"n": "Warmth", "t": ["Concentration", "Touch"], "d": "Warmth protects the recipient from the effects of freezing atmospheres and exposure, and from Fatigue caused by the natural environment. The spell does not stop the effects of cold-related magic cast at them, but will make any resistance roll one difficulty grade easier. Thus a person under the effects of this spell could walk about on a glacier during midwinter in their underclothes without harm. Warmth affects an object of SIZ up to the caster's POW x2.", "p": 129},
 {"n": "Witchsight", "t": ["Ranged", "Resist (Willpower)"], "d": "Witchsight allows the caster to see active magic, enchanted items, and invisible entities (although such things are simply shadowy representations) that lie within range and line of sight. It can also penetrate illusions or discern the true guise of shapeshifted creatures. Beings which wish to remain hidden or disguised must win an opposed test of their Willpower versus the casting roll.", "p": 129}
];
const FOLK_MAGIC_MAP=Object.fromEntries(FOLK_MAGIC.map(s=>[s.n,s]));

/* The four traditions whose content is Reserved Material. Each entry records
   what the app CAN do faithfully: which skill rolls to cast, what pool the
   cost comes out of, and what fields a given piece of magic needs so the app
   can compute and track it. `fields` drives the entry form; `castSkill` is the
   Professional Skill rolled; `pool` is which resource the cost is drawn from. */
const MAGIC_TRADITIONS=[
 {key:"folk",label:"Folk Magic",castSkill:"Folk Magic",pool:"mp",hasContent:true,
  summary:"Universal, low-powered, everyday magic — the hedge-witch's repertoire. Cast with the Folk Magic skill for a Magic Point; every Folk Magic spell is Intensity and Magnitude 1 by its minor nature.",
  costRule:"Critical: free. Success: 1 Magic Point, and the spell works. Failure: 1 Magic Point, and it doesn't. Fumble: 1d3 Magic Points, and it doesn't.",
  fields:[]},
 {key:"theism",label:"Theism (Miracles)",castSkill:"Exhort",pool:"devotional",hasContent:false,
  summary:"Divine magic granted by a deity. The worshipper invests Magic Points into a Devotional Pool dedicated to their god (governed by the Devotion skill), and invokes Miracles from that pool using Exhort. A successfully exhorted Miracle manifests at its full Magnitude and Intensity.",
  costRule:"Core p.181: Exhort Critical and Failure spend 0 points; Success spends the miracle's full rank cost (Initiate 1, Acolyte 2, Priest 3); Fumble spends 1 point. Pool replenishment requires worship or other divine sources.",
  fields:[["cost","Pool cost",1],["intensity","Intensity",1]],
  contentNote:"Miracle lists are specific to each deity and cult and are Reserved Material in the core rulebook — add the Miracles your cult grants you."},
 {key:"sorcery",label:"Sorcery (Grimoire)",castSkill:"Invocation",pool:"mp",hasContent:false,
  summary:"Learned magic from a grimoire. Invocation casts, Shaping alters spell components. Multiple Shaping points can modify one component; each distinct altered category increases MP cost and casting Turns by one. Combine adds one MP per extra spell (without an extra casting Turn for each).",
  costRule:"Core pp.164–165: Critical costs half (rounded up); Success full; Failure none; Fumble full. Supports per-component Shaping levels and Combine cost; GM confirms legal limits, spell-specific restrictions and actual effects.",
  fields:[],shaping:["Combine","Duration","Magnitude","Range","Targets"],
  contentNote:"Grimoire spell lists are Reserved Material in the core rulebook — add the spells in the grimoire your character has studied."},
 {key:"animism",label:"Animism (Spirits)",castSkill:"Binding",pool:"none",hasContent:false,
  summary:"Shamanic magic worked through spirits rather than spells. Binding binds a spirit into service or into a fetish; Trance lets the shaman discorporate into the spirit world. A bound spirit's abilities are what the animist actually brings to bear.",
  costRule:"Core pp.130–143: Trance, summoning, Binding and spirit combat are distinct actions. Summoning requires MP equal to spirit Intensity and a Binding roll; consult Core p.137. Use entries as references rather than one-click generic spell casting.",
  fields:[["pow","Spirit POW",0],["cha","Spirit CHA",0]],
  contentNote:"Spirit types and their abilities are Reserved Material in the core rulebook — record the spirits your character has bound."},
 {key:"mysticism",label:"Mysticism (Talents)",castSkill:"Mysticism",pool:"mp",hasContent:false,
  summary:"Mind over the matter of one's own body. A mystic develops Talents that push a personal capability past normal limits, sustained by Magic Points; Meditation supports the discipline. Simple in structure, but expensive to run.",
  costRule:"Core pp.156–157: Critical spends half the talent cost (rounded up); Success and Fumble spend full cost; Failure spends 1 MP. Talent preparation takes one turn per Intensity. Individual and combined Intensity limits use Mysticism and Meditation; the book's 34% example permits Intensity 2, while other individual rounding boundaries need GM confirmation.",
  fields:[["cost","Magic Point cost",1],["intensity","Intensity",1]],
  contentNote:"Talent lists are Reserved Material in the core rulebook — add the Talents your character has developed."}
];
const MAGIC_TRAD_MAP=Object.fromEntries(MAGIC_TRADITIONS.map(t=>[t.key,t]));

/* ================= AGE BANDS =================
   The Experience Table ("Creating Experienced Characters"). Age is not
   flavour text in Mythras: it sets how many Bonus Skill Points the character
   gets and how many of them may go on any one skill. Adult — 150 points, max
   +15 — is the default every other part of this app was already hardcoded to,
   so an Adult character's numbers are unchanged by this table arriving.

   Checked against the Age Table in Mythras Core, p.34.

   The book's own caveat, worth repeating in the UI: "the noted Age Bonus
   should be treated as approximate, as campaigns advance at different rates".
   Note also that the table gives no characteristic modifiers for age — a
   common assumption from other d100 games, but not something this table
   does, so nothing of the sort is applied here. */
const AGE_CATEGORIES=[
 {key:"young", label:"Young",       dice:"10+1d6", base:10,n:1, bonus:100,cap:10,
  blurb:"Barely out of childhood — quick, untested, with everything still ahead."},
 {key:"adult", label:"Adult",       dice:"15+2d6", base:15,n:2, bonus:150,cap:15,
  blurb:"The default starting adventurer: trained, capable, not yet weathered."},
 {key:"middle",label:"Middle Aged", dice:"25+3d6", base:25,n:3, bonus:200,cap:20,
  blurb:"A working life already behind them, and the competence that comes with it."},
 {key:"senior",label:"Senior",      dice:"40+4d6", base:40,n:4, bonus:250,cap:25,
  blurb:"Decades of practice; the kind of person younger adventurers ask for advice."},
 {key:"old",   label:"Old",         dice:"60+5d6", base:60,n:5, bonus:300,cap:30,
  blurb:"A lifetime's expertise. Whether the body still cooperates is the GM's call."}
];
const AGE_MAP=Object.fromEntries(AGE_CATEGORIES.map(a=>[a.key,a]));

/* ---- Life Events ----
   HOUSE CONTENT, NOT A BOOK TABLE — flagged as such in the UI. The core
   rulebook provides official Background Events on pp.18-20, with age-based
   rolls on p.34; the separate Core workflow records those rolls and notes.
   This optional house generator is not a transcription of that table.
   It is an openly-labelled generator whose only job is to prompt
   backstory — but every entry that has a mechanical consequence expresses it
   through something the app already models properly (a Passion at its correct
   book-derived starting value, an inventory item, a change to starting
   silver), applied with one click and fully editable afterwards. Nothing here
   invents a mechanic.
   effect: null | {type:"passion",name,ptype} | {type:"item",name,enc}
           | {type:"silver",pct} | {type:"note"} */
const LIFE_EVENTS=[
 {t:"A mentor took you in and taught you their trade. You never quite repaid them.",
  effect:{type:"passion",name:"Loyalty to your old mentor",ptype:"platonic"}},
 {t:"You lost someone early. It shaped how you deal with people.",
  effect:{type:"passion",name:"Love (the one you lost)",ptype:"romantic"}},
 {t:"A rival bested you publicly, and you have never let it go.",
  effect:{type:"passion",name:"Hate (your old rival)",ptype:"averse"}},
 {t:"You survived something that killed everyone else present.",
  effect:{type:"passion",name:"Fear (whatever it was)",ptype:"object"}},
 {t:"You swore an oath to a lord, captain or elder, and it still binds you.",
  effect:{type:"passion",name:"Loyalty to the one you swore to",ptype:"org"}},
 {t:"You fell in with a crew, a warband or a company for a few years.",
  effect:{type:"passion",name:"Loyalty to your old company",ptype:"org"}},
 {t:"You inherited a keepsake from a relative you barely knew.",
  effect:{type:"item",name:"Family heirloom",enc:0}},
 {t:"You came away from a bad job with a weapon that wasn't yours.",
  effect:{type:"item",name:"Someone else's blade",enc:1}},
 {t:"A journey took you far further from home than you meant to go.",
  effect:{type:"passion",name:"Love (a distant place)",ptype:"place"}},
 {t:"You were cheated badly enough to change how you do business.",
  effect:{type:"passion",name:"Distrust (merchants and moneylenders)",ptype:"species"}},
 {t:"A windfall passed through your hands. Some of it stuck.",
  effect:{type:"silver",pct:25}},
 {t:"A debt, a fine or a bad season stripped you of most of what you had.",
  effect:{type:"silver",pct:-25}},
 {t:"You spent a stretch somewhere you would rather not discuss — a cell, a ship, a siege.",
  effect:{type:"note"}},
 {t:"You took a wound that healed badly and still aches before rain.",
  effect:{type:"note"}},
 {t:"You raised someone else's child, or your own, and it cost you years.",
  effect:{type:"passion",name:"Protect (the child you raised)",ptype:"platonic"}},
 {t:"You found a faith, a philosophy or a discipline that steadied you.",
  effect:{type:"passion",name:"Uphold (your creed)",ptype:"place"}},
 {t:"You made an enemy of an institution rather than a person.",
  effect:{type:"passion",name:"Hate (the institution that wronged you)",ptype:"org"}},
 {t:"A stretch of genuine prosperity — a trade, a farm, a shop that worked.",
  effect:{type:"silver",pct:40}},
 {t:"You buried a friend and have carried the obligation ever since.",
  effect:{type:"passion",name:"Loyalty to a dead friend's memory",ptype:"org"}},
 {t:"You picked up a tool of your trade good enough to be worth keeping.",
  effect:{type:"item",name:"Fine tools of your trade",enc:2}},
 {t:"Somewhere in there you learned to read, or wish you had.",effect:{type:"note"}},
 {t:"You were on the wrong side of something and had to leave in a hurry.",
  effect:{type:"passion",name:"Fear (being recognised)",ptype:"object"}},
 {t:"A stranger did you an enormous kindness you have never been able to return.",
  effect:{type:"passion",name:"Seek (the stranger who helped you)",ptype:"platonic"}},
 {t:"You spent years in service to a household, and know its secrets.",
  effect:{type:"passion",name:"Loyalty to the household you served",ptype:"org"}}
];

// Difficulty Grade table (core rulebook, Skills chapter — verified against
// page scan; the core table is multiplicative, not a flat percentage).
// Automatic/Hopeless bypass the % entirely (no roll needed / can't attempt).
const GRADES=[["automatic","Automatic"],["veasy","Very Easy"],["easy","Easy"],
["standard","Standard"],["hard","Hard"],["formidable","Formidable"],
["herculean","Herculean"],["hopeless","Hopeless"]];
const GRADE_LABEL=Object.fromEntries(GRADES);
const GRADE_ORDER=GRADES.map(g=>g[0]);
const GRADE_MULT={automatic:null,veasy:2,easy:1.5,standard:1,hard:2/3,formidable:0.5,herculean:0.1,hopeless:null};
// Pulp Hero / Paragon "one Grade easier" Advantages, keyed by the Standard
// Skill they apply to.
const GRADE_EASIER_ADV={"std:Endurance":"endurance","std:Stealth":"stealth","std:Willpower":"willpower"};
let ACTIVE_GRADE="standard"; // session-only difficulty grade, applied on the Sheet step

// Fatigue Levels table — transcribed from the Mythras Imperative SRD's Game
// System > Fatigue section (srd.mythras.net), which is published under the
// ORC License and reproduces the core rulebook's own Fatigue table. This was
// previously a bare list of level names with no mechanical effect attached;
// the five effect columns below are the book's.
//   grade    — the Skill Grade column. This is an ABSOLUTE grade the level
//              imposes, not a relative shift: "Winded" means skill rolls are
//              made at Hard, full stop. It therefore acts as a floor (see
//              fatigueGradeFloor / gradeForEntry in engine.js) rather than
//              stacking step-by-step with other penalties.
//   move     — Movement column. null = no penalty, a number = metres off the
//              Movement Rate, "half" = halved, "immobile"/"none" = can't move.
//   init/ap  — flat penalties to Initiative and to maximum Action Points.
//   act      — false once the level bars all activity outright.
const FATIGUE_TABLE=[
 {name:"Fresh",         grade:null,        move:null,      init:0, ap:0, act:true,  recovery:"—"},
 {name:"Winded",        grade:"hard",      move:null,      init:0, ap:0, act:true,  recovery:"15 minutes"},
 {name:"Tired",         grade:"hard",      move:-1,        init:0, ap:0, act:true,  recovery:"3 hours"},
 {name:"Wearied",       grade:"formidable",move:-2,        init:-2,ap:0, act:true,  recovery:"6 hours"},
 {name:"Exhausted",     grade:"formidable",move:"half",    init:-4,ap:-1,act:true,  recovery:"12 hours"},
 {name:"Debilitated",   grade:"herculean", move:"half",    init:-6,ap:-2,act:true,  recovery:"18 hours"},
 {name:"Incapacitated", grade:"herculean", move:"immobile",init:-8,ap:-3,act:true,  recovery:"24 hours"},
 {name:"Semi-Conscious",grade:"hopeless",  move:"none",    init:null,ap:null,act:false,recovery:"36 hours"},
 {name:"Comatose",      grade:"hopeless",  move:"none",    init:null,ap:null,act:false,recovery:"48 hours"},
 {name:"Dead",          grade:"hopeless",  move:"none",    init:null,ap:null,act:false,recovery:"Never"}
];
const FATIGUE_MAP=Object.fromEntries(FATIGUE_TABLE.map(f=>[f.name,f]));
// Recovery time is the table's Recovery Period divided by Healing Rate (SRD:
// "The amount of complete rest needed to recover from each level of accrued
// Fatigue is equal to the Recovery Period divided by the character's Healing
// Rate"), so the raw column above is only half the answer — see fatigueRow().
const FATIGUE_RECOVERY_MINUTES={"Fresh":0,"Winded":15,"Tired":180,"Wearied":360,
 "Exhausted":720,"Debilitated":1080,"Incapacitated":1440,"Semi-Conscious":2160,
 "Comatose":2880,"Dead":null};


// Trait names that changed to match the Core p.89 table; saved styles are
// migrated on load (normalizeState), so nothing a player picked is lost.
const TRAIT_RENAMES={"Skirmisher":"Skirmishing"};
// Core p.108 Distance Penalties: rows are 20m bands (1-20m ... 121-140m),
// columns are target SIZ bands. Positive = steps harder, negative = easier.
const RANGE_SIZ_BANDS=[[0,10,"10 or less"],[11,20,"11-20"],[21,40,"21-40"],[41,80,"41-80"],[81,150,"81-150"],[151,300,"151-300"]];
const RANGE_DISTANCE_TABLE=[
 [ 1, 0,-1,-1,-2,-2],
 [ 1, 1, 0,-1,-1,-2],
 [ 2, 1, 1, 0,-1,-1],
 [ 2, 2, 1, 1, 0,-1],
 [ 3, 2, 2, 1, 1, 0],
 [ 3, 3, 2, 2, 1, 1],
 [ 4, 3, 3, 2, 2, 1]
];

// Short skill descriptions for Play Mode's side panel: our own summaries of
// Mythras Core pp.38–50 (printed pages), not the book's text. [summary, page]
const SKILL_INFO={
"Athletics":["Climbing, jumping, running and other broad physical feats. Armour reduces how far you can climb, run or jump.","38"],
"Boating":["Handling small craft such as rowing boats, canoes and rafts on rivers, lakes and near the shore. Large ocean-going ships use Seamanship.","39"],
"Brawn":["Applying raw strength with good technique: lifting, breaking things and contests of strength. You can lift and carry up to your STR in SIZ, or drag double that, without a roll.","39"],
"Conceal":["Hiding objects rather than yourself: a cart behind rocks, a scroll in a library, a trap or a secret door. Stealth covers hiding yourself.","39"],
"Customs":["Knowing your own community's codes, rites, rituals and taboos, and behaving correctly when it matters. A critical spots a subtle social nuance that helps now or later.","40"],
"Dance":["Moving rhythmically and accurately, whether for fun, at court or in a ritual or war dance.","40"],
"Deceit":["Hiding the truth: lying, misleading a guard, bluffing at cards, or masking your real feelings and motives. It is usually opposed by Insight.","40"],
"Drive":["Controlling carts, carriages, chariots and sleds. Roll when doing something out of the ordinary, crossing bad ground or driving unfamiliar beasts.","40"],
"Endurance":["Your capacity to withstand pain, fatigue and physical stress. Used above all to resist the effects of injuries, poisons and disease.","41"],
"Evade":["Escaping danger you can see coming: diving for cover from missiles, avoiding traps, or changing the engagement distance in combat. Some magic is resisted with Evade. Usually opposed, sometimes a straight roll.","41"],
"First Aid":["Treating minor injuries and stabilising serious ones. It can be applied only once per specific injury; each wound or location is treated separately.","41"],
"Influence":["Persuading others, from changing a mind to bribing an official. Usually opposed by Perception, Willpower or Influence, and harder the bigger the ask.","42"],
"Insight":["Reading someone's words and body language to judge their motives and state of mind, including spotting a lie (opposed by Deceit). It can also read situations.","42"],
"Locale":["Understanding the plants, animals, terrain and weather of the area where you grew up: where the fish are, where to shelter, what the season brings.","42"],
"Native Tongue":["How well you speak your own language. It is not rolled; it sets how fluently you can converse (see Language).","42"],
"Perception":["Noticing things, both general awareness and a focused search. Darkness and other conditions change the difficulty.","42"],
"Ride":["Controlling and staying on a mount, from mules to elephants or flying beasts. An unfamiliar species is one grade harder; a different medium (a rider on a flying mount) is two.","43"],
"Sing":["Carrying a tune, from chants to complex songs: keeping rhythm and key and remembering the words.","43"],
"Stealth":["Hiding yourself and moving quietly. Cover, darkness and noise make it easier; open ground or a quiet night make it harder.","43"],
"Swim":["Staying afloat and moving through water. Rough seas, strong currents and white water make the roll harder.","43"],
"Unarmed":["The Combat Style everyone has: the brawling and wrestling of your culture. It works like any other Combat Style, including criticals and fumbles.","43"],
"Willpower":["Concentration, resolve and mental resilience. Used to resist magic and to endure traumatic events; the mental counterpart of Endurance.","44"],
"Acrobatics":["Balance, gymnastics, juggling and tumbling. A success lets you cross a narrow or unstable surface at full speed, and it can reduce damage from an unexpected fall.","44"],
"Acting":["Convincingly playing a different personality, on stage or in a social situation. Works well with Disguise and Deceit.","44"],
"Art":["One chosen art form, such as painting, poetry or sculpture. Each art form is a separate skill.","44"],
"Binding":["An animist's magical skill for exerting will over spirits: binding them into fetishes, controlling them, and summoning or bargaining with known spirits. See the Animism chapter.","44"],
"Bureaucracy":["Working with administrative procedures, records and officials. It cannot exceed the Language or Literacy skill you work in.","45"],
"Commerce":["Valuing goods and trading them for the best price, understanding business deals, and fencing stolen goods. Opposed by Commerce or Willpower.","45"],
"Courtesy":["Correct manners and etiquette in polite or formal company. Failing makes later social rolls harder; a fumble gives real offence and ends the conversation.","45"],
"Craft":["One chosen trade, used to make its items. Time depends on the product; quality depends on skill, materials and care.","45"],
"Culture":["Like Customs, but for one named foreign society.","45"],
"Devotion":["A theist's magical skill: depth of devotion to a deity, the power of miracles they can call on, and their standing in the cult. See the Theism chapter.","45"],
"Disguise":["Creating a convincing disguise with costume, make-up and wigs. Missing time or materials makes it harder; Acting can augment it.","45"],
"Engineering":["Designing and building large structures, from houses and bridges to siege engines, and judging a structure's soundness or weak points.","46"],
"Exhort":["A theist's magical skill for calling on and channelling the power of the gods. See the Theism chapter.",""],
"Folk Magic":["Casting the simple, common spells of Folk Magic. See the Folk Magic chapter.",""],
"Gambling":["Games of chance, especially for money: judging the odds and spotting a cheat. Opposed or unopposed depending on the game.","46"],
"Healing":["In-depth medical knowledge from your culture's practices, from herbs to surgery. Used to treat Serious and Major Wounds, diseases and poisons.","46"],
"Invocation":["A sorcerer's magical skill for casting spells from one grimoire or teacher; it also sets the spells' Intensity. See the Sorcery chapter.","47"],
"Language":["Speaking and understanding a language other than your own. Like Native Tongue it is not rolled; it sets how fluently you can converse.","47"],
"Literacy":["Reading and writing one language. Speaking a language fluently does not mean you can read it.","47"],
"Lockpicking":["Opening mechanical locks without the key, and forcing bolted or barred doors and windows without damage. Usually opposed by the lock maker's Mechanisms.","47"],
"Lore":["One chosen body of knowledge, such as history, astronomy, monsters, politics or tactics. A critical makes a related follow-up roll one grade easier.","47"],
"Mechanisms":["Building and taking apart small mechanical devices such as traps. Separate from Lockpicking and from Engineering's large constructions.","48"],
"Meditation":["Reaching deep calm and concentration. Technically magical: it is central to Mysticism, but anyone can use it.","48"],
"Musicianship":["Playing one group of similar instruments: someone who plays the reed pipe can play a flute, but not a harp.","48"],
"Mysticism":["A mystic's magical skill for superhuman acts drawn from inner discipline, tied to one path. See the Mysticism chapter.","48"],
"Navigation":["Finding the way in one region or environment, such as the open sea or underground, using landmarks, stars and other signs. A critical finds a shortcut.","48"],
"Oratory":["Swaying a large crowd with a speech, from politics to rallying troops. Used instead of Influence when persuading many people at once.","48"],
"Seamanship":["Like Boating, but for large ships under sail or oar, including keeping the ship in good repair.","48"],
"Seduction":["Romantic or sexual persuasion, quite different from Influence. It can take hours to weeks, and the target resists with Willpower.","49"],
"Shaping":["A sorcerer's magical skill for shaping a spell's effects (range, duration, targets and so on). See the Sorcery chapter.","49"],
"Sleight":["Palming or hiding small objects, pickpocketing, cutting purses and creating distractions. Also used to cheat at games, against the other players' Perception or Gambling.","49"],
"Streetwise":["Knowing a settlement's places and contacts, from dangerous neighbourhoods to finding services, legal or not. A fumble attracts unwanted attention.","49"],
"Survival":["Living in the wild without civilisation's comforts: foraging, building a fire, finding shelter. Usually only rolled when you lack equipment or conditions turn bad.","49"],
"Teach":["Passing on knowledge and techniques clearly. It is not rolled; it limits what you can teach (see Training).","49"],
"Track":["Following game or quarry by the signs of its passing: prints, bruised leaves, displaced stones.","49"],
"Trance":["An animist's magical skill for reaching the state that lets them perceive and enter the Spirit World. See the Animism chapter.","50"]
};
function skillInfo(label){const base=String(label||"").replace(/\s*\(.*$/,"").trim();return SKILL_INFO[base]?{name:base,text:SKILL_INFO[base][0],page:SKILL_INFO[base][1]}:null;}
