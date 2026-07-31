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
 // Ranged Weapons (p.65-66). "reach" holds Force (S/M/L/H/E) for these.
 {name:"Atlatl",group:"Ranged",dmg:"—",dmgMod:"—",size:"",reach:"+1 Step",range:"0+/25+/75+",load:1,effects:"—",enc:1,apHp:"1/4",traits:"",milieu:"P",cost:10},
 {name:"Blowgun",group:"Ranged",dmg:"—",dmgMod:"N",size:"",reach:"—",range:"10/20/30",load:2,effects:"—",enc:0,apHp:"1/4",traits:"",milieu:"P",cost:30},
 {name:"Bolas",group:"Ranged",dmg:"1d4",dmgMod:"N",size:"",reach:"—",range:"10/25/50",load:"—",effects:"Entangle",enc:0,apHp:"2/2",traits:"",milieu:"P-A",cost:10},
 {name:"Dagger (thrown)",group:"Ranged",dmg:"1d4",dmgMod:"Y",size:"S",reach:"S",range:"5/10/20",load:"—",effects:"Impale",enc:1,apHp:"6/8",traits:"",milieu:"All",cost:30},
 {name:"Dart",group:"Ranged",dmg:"1d4",dmgMod:"Y",size:"S",reach:"S",range:"5/10/20",load:"—",effects:"Impale",enc:0,apHp:"2/1",traits:"",milieu:"P-A",cost:10},
 {name:"Discus",group:"Ranged",dmg:"1d4+1",dmgMod:"Y",size:"L",reach:"L",range:"5/20/40",load:"—",effects:"Stun Location",enc:0,apHp:"2/3",traits:"",milieu:"A",cost:30},
 {name:"Hatchet (thrown)",group:"Ranged",dmg:"1d6",dmgMod:"Y",size:"S",reach:"S",range:"10/20/30",load:"—",effects:"Bleed",enc:1,apHp:"4/6",traits:"",milieu:"All",cost:25},
 {name:"Heavy crossbow",group:"Ranged",dmg:"1d10",dmgMod:"N",size:"H",reach:"H",range:"20/150/300",load:4,effects:"Impale, Sunder",enc:2,apHp:"4/8",traits:"",milieu:"M-E",cost:350},
 {name:"Javelin",group:"Ranged",dmg:"1d8+1",dmgMod:"Y",size:"H",reach:"H",range:"10/20/50",load:"—",effects:"Impale, Pin Weapon (Shield)",enc:1,apHp:"3/8",traits:"",milieu:"A-M",cost:20},
 {name:"Light crossbow",group:"Ranged",dmg:"1d8",dmgMod:"N",size:"L",reach:"L",range:"20/100/200",load:3,effects:"Impale",enc:1,apHp:"4/5",traits:"",milieu:"M-E",cost:150},
 {name:"Long bow",group:"Ranged",dmg:"1d8",dmgMod:"Y",size:"H",reach:"H",range:"15/125/250",load:2,effects:"Impale",enc:1,apHp:"4/7",traits:"",milieu:"M",cost:200},
 {name:"Net (thrown)",group:"Ranged",dmg:"—",dmgMod:"N",size:"",reach:"—",range:"3/5/10",load:"—",effects:"Entangle",enc:3,apHp:"2/20",traits:"",milieu:"All",cost:20},
 {name:"Recurve bow",group:"Ranged",dmg:"1d8",dmgMod:"Y",size:"H",reach:"H",range:"15/125/250",load:2,effects:"Impale",enc:1,apHp:"4/8",traits:"",milieu:"A-M",cost:225},
 {name:"Short bow",group:"Ranged",dmg:"1d6",dmgMod:"Y",size:"L",reach:"L",range:"15/100/200",load:2,effects:"Impale",enc:1,apHp:"4/4",traits:"",milieu:"P-M",cost:75},
 {name:"Shortspear (thrown)",group:"Ranged",dmg:"1d8",dmgMod:"Y",size:"L",reach:"L",range:"10/15/30",load:"—",effects:"Impale",enc:1,apHp:"4/5",traits:"",milieu:"All",cost:20},
 {name:"Sling",group:"Ranged",dmg:"1d8",dmgMod:"N",size:"L",reach:"L",range:"10/150/300",load:3,effects:"Stun Location",enc:0,apHp:"1/2",traits:"",milieu:"P-M",cost:5},
 {name:"Staff sling",group:"Ranged",dmg:"2d6",dmgMod:"N",size:"E",reach:"E",range:"5/25/50",load:4,effects:"Stun Location",enc:2,apHp:"3/6",traits:"",milieu:"A-M",cost:20},
 {name:"Stone/Rock",group:"Ranged",dmg:"1d3",dmgMod:"Y",size:"S",reach:"S",range:"5/10/20",load:"—",effects:"Stun Location",enc:0,apHp:"—",traits:"",milieu:"All",cost:0},
 {name:"Trident (thrown)",group:"Ranged",dmg:"1d8",dmgMod:"Y",size:"L",reach:"L",range:"10/15/30",load:"—",effects:"Barbed, Impale",enc:2,apHp:"4/10",traits:"",milieu:"A-M",cost:155}
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
 {name:"Blind Fighting",category:"Individual",source:"Mythras",desc:"Allows user to reduce any penalties imposed due to poor lighting or temporary blinding to be reduced by one difficulty grade."},
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
 {name:"Mounted Skirmisher",category:"Individual",source:"Mythras",desc:"The style permits launching ranged attacks whilst moving fast (but not whilst galloping)."},
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
 {name:"Skirmisher",category:"Individual",source:"Mythras",desc:"The style permits launching ranged attacks whilst at a run (but not whilst sprinting)."},
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
const ARMOR_MAP=Object.fromEntries(ARMOR_MATERIALS.map(a=>[a.name,a]));
const ARMOR_LOCATIONS=["Head","Chest","Abdomen","Each Arm","Each Leg"];
// Material Types Table (p.58) — ENC multiplier layered on top of the base
// Construction ENC above, if you want to track a specific material. Not
// wired into the AP/ENC picker (would double the picker surface for a
// refinement most tables won't need) — informational only, in Rules Notes.
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
 place:{label:"A place, concept or ideal",calc:"30 + POW + INT",needs:[]},
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
"Language":"any","Lore":"any"};

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

   - FOLK MAGIC below is complete and verbatim — spell names, traits and full
     rules text — from the Mythras Imperative SRD (srd.mythras.net), published
     by The Design Mechanism under the ORC License, which explicitly permits
     this reuse. The Imperative calls the casting skill "Magic"; in full
     Mythras the same spells are the Folk Magic list, cast off the Folk Magic
     skill, which is what this app uses.

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
 "Resist (Special)":"Resistance depends on what is being affected; see the spell's own description."
};
// Unless a spell has Concentration or Instant, it lasts the whole scene or
// action it was used for. All Folk Magic spells are Intensity and Magnitude 1
// by their minor nature.
const FOLK_MAGIC=[
 {n:"Alarm",t:["Special Duration"],d:"Casting Alarm on a location such as a room or small clearing creates a temporary psychic bond between the area and the caster. If the area is accessed by a living creature with a SIZ greater than 1, the caster is automatically made aware that something has transgressed no matter how great the distance. The Alarm is usually a distinct tingling sensation or mental twinge which will awaken the caster. Alarm can also be used on an individual object, triggering when touched or moved."},
 {n:"Avert",t:["Instant","Ranged"],d:"Avert is used to dismiss another spell within range. Avert can be cast reactively to neutralize offensive spells, by using the Counter Magic Reactive Action."},
 {n:"Befuddle",t:["Ranged","Resist (Willpower)"],d:"Befuddle causes confusion within the mind of a corporeal target. The subject of the spell has difficulty thinking straight, forgetting where it is, what it is doing and why — often lapsing into disassociated lines of thought. Befuddled targets can still act in self defense, but cannot initiate any constructive activity until the spell ends. Any sort of attack or threatening action instantly breaks the spell, whether or not it was directed specifically at the befuddled target."},
 {n:"Bladesharp",t:["Touch"],d:"Bladesharp is cast on edged and piercing melee weapons. It increases the damage of a weapon by one dice step and incidentally leaves the edge honed after the spell concludes. This spell is often used on tools such as logging axes, plows, and razors. Thus, casting this spell on a dagger increases it to 1d6+1 damage, whereas the same spell on a great axe would increase it to 2d8+2 damage. (1d4→1d6→1d8→1d10→2d6→2d8→2d10)."},
 {n:"Bludgeon",t:["Touch"],d:"Bludgeon is like Bladesharp but used on weapons and tools that deal blunt-force trauma rather than cutting or piercing damage. It is normally used to aid with threshing grain, fulling wool, or similar heavy-duty work."},
 {n:"Breath",t:["Touch"],d:"Breath permits the recipient to hold their breath for an extended period, so that they can temporarily venture into harmful environments, such as underwater; or atmospheres tainted by rock dust, gases, smoke, or poisons. The spell lasts for a maximum of half the caster's POW in minutes, during which time the recipient cannot speak, or the breath is lost, and they must immediately begin to breathe from their environment suffering any present risks — be that asphyxiation, drowning, poisoning, etc."},
 {n:"Calm",t:["Ranged","Resist (Willpower)"],d:"Calm attempts to dampen down the passions of the target, perhaps ensuring that a lovesick paramour doesn't press his suit, a frightened rival doesn't scream for help or that weapons are not drawn in anger. A calmed person is not otherwise mentally affected; thus, any sort of assault or threatening action still permits the target to defend themselves and even attack, albeit they will do so in a calm and level-headed manner."},
 {n:"Chill",t:["Instant","Touch"],d:"Chill dramatically reduces the temperature of small objects (no larger than the caster's hand) down to the temperature of ice water. Useful for rapidly cooling hot items, chilling drinks, and so forth. The spell does not freeze an object and neither does it cause any damage to its structure: it merely renders it very cold."},
 {n:"Darkness",t:["Concentration","Ranged"],d:"Darkness creates an area of shadow, equal to POW in square metres, which suppresses all light within it. This is enough volume to fill a modest room, a length of corridor or form a small cloud if cast outside. All non-magical light, including sunlight, passing into or present within the boundary is reduced to the equivalent of a dim glow."},
 {n:"Disruption",t:["Instant","Ranged","Resist (Endurance)"],d:"Disruption is used for damaging or disassembling physical objects without the need for tools. It is commonly employed to drive off or kill living creatures, such as birds or vermin. When successfully cast, Disruption inflicts 1d3 damage to a single random Hit Location or the overall Hit Points of an object. In both cases the damage ignores any armor or natural protection."},
 {n:"Extinguish",t:["Instant","Ranged"],d:"Extinguish immediately quenches flames and small fires of modest size and heat. It is useful for dousing candles, lanterns, torches, or small cook fires, but it will not work on magical or larger, more ferocious conflagrations such as pyres, burning houses or dragon flames."},
 {n:"Find (X)",t:["Concentration","Ranged","Resist (Special)"],d:"Find has many variations; always specific and learned as separate spells. It works by attuning to the natural emanations of a creature or thing, alerting the caster to its presence within the spell's range. Find can be blocked by dense or thick materials such as metal, or earth and stone at least one metre thick. The spell cannot discern emotions or thoughts. Common examples: Find Arrows (locates ammunition shot by hunters which missed its target); Find Flaw (identifies flaws in an object, such as hidden imperfections or physical damage); Find Livestock (locates a particular type of animal — can be resisted with Willpower); Find Loot (locates precious metals and gems); Find Object (locates a lost personal possession); Find Sickness (identifies the existence of disease and illness, whether magical or mundane).",spec:"what it finds, e.g. Loot"},
 {n:"Firearrow",t:["Touch"],d:"Firearrow causes all missiles thrown or fired by the recipient to burst into flame when released. Ostensibly created to act as a signal flare, it has since evolved into a combat magic. Missiles under its effect add an additional 1d3 damage but are extinguished if they impale flesh. Those that strike flammable material have a chance equal to the caster's Folk Magic skill of setting alight whatever they lodge in, such as wooden shields, thatched roofs and so on. Wooden ammunition is consumed as part of the spell."},
 {n:"Fireblade",t:["Touch"],d:"Fireblade is like Firearrow but is instead cast on hand tools and melee weapons. The original purpose of the spell is to sterilize surgical equipment, aid in slash and burn agriculture or provide illumination during darkness without the need to carry an additional light source. If cast on a weapon it inflicts an additional 1d3 damage, and has the chance of setting flammable materials alight if held to them for several rounds. Wooden hafted weapons under the effects of Fireblade will be consumed as part of the spell."},
 {n:"Glue",t:["Touch"],d:"Glue cements together two solid, inanimate objects for the duration of the spell, for example a cartwheel to its axle or a door to its frame. Whilst under the effects of the spell the items, no matter how disparate, cannot be parted unless something actively tries to wrench them apart. In this circumstance the spell has a Brawn skill equal to five times the caster's POW and fails when a superior Brawn is set against it, defeating it in an Opposed Roll. Once the spell concludes or fails, the items part completely unharmed."},
 {n:"Heal",t:["Instant","Touch"],d:"Heal has several different effects depending on the nature of the ailment it is being used on. If the subject is suffering from a minor complaint such as a headache, back pain, hangover, cold, warts and so on, then the symptoms are immediately lifted. Cast on a location suffering a Minor Wound it restores all lost Hit Points instantly. Against Serious or Major Wounds no Hit Points are recovered. However, the spell will stabilize locations, stop all bleeding and prevent imminent death from inattention."},
 {n:"Ignite",t:["Instant","Ranged"],d:"Ignite only works on flammable inorganic matter, causing a small object or hand-sized area to burst into flame. Depending on what was set alight, once burning, the flames may then spread unless quenched or countered in some way. This spell is normally used to light candles, torches, or lanterns from afar. It can also be used to start a camp or cooking fire in adverse conditions, such as using damp kindling or in strong winds."},
 {n:"Knock",t:["Instant","Touch"],d:"Knock magically unfastens any device that is currently secured with a mechanical bar or lock. It does not work on magically locked objects, only mundane ones. The spell only affects a single fastening, so if there are several locks and bars securing the object, the spell will need to be recast for each one."},
 {n:"Light",t:["Concentration","Ranged"],d:"Light must be cast on an inanimate object (this could be a branch, sword blade, spear point, torch and so on). It produces enough light to illuminate an area as though with a lantern. It can also be cast directly against a Darkness spell to counter it. In this case both spells are consumed, leaving the ambient light to illuminate the area."},
 {n:"Lock",t:["Special Duration","Touch"],d:"Lock magically secures any device that already has a mechanical bar or lock present. A Locked device can be opened only by the caster and cannot be picked by mundane means (such as by a thief using lock-picks) since the magic renders the mechanism immobile; however, it could still be forced open by breaking the object the lock is set into. The magic remains in place until opened by the caster, after which the device must be subject to a further casting of Lock to restore the enchantment. The Magic Point used to cast Lock does not recover until the spell is dismissed or concludes naturally.",holdsMp:true},
 {n:"Phantasm",t:["Concentration","Ranged"],d:"Phantasm allows the caster to weave together insubstantial or near weightless objects so that they take a shape or ghostly form. Thus, a spectral figure could be woven from a naturally occurring mist, or a face formed in a pile of dead leaves. Beyond this the spell has little effect, save to frighten, intrigue, or disconcert those that view it."},
 {n:"Sleep",t:["Resist (Endurance)","Touch"],d:"Sleep sends its recipient into a deep, peaceful sleep. It has no effect on creatures with a SIZ greater than the caster's POW. Unless the target resists, it slumbers for a number of hours equal to half the caster's POW. However, the spell takes 1d3 Rounds to take effect before the target falls unconscious. Any attempt to cast this spell in a combat situation automatically fails."},
 {n:"Vigor",t:["Touch"],d:"Vigor makes the recipient feel alive and energetic, being used to offset the effects of strenuous physical labor. For the spell's duration, all Fatigue effects gained from laborious activity are ignored (but return on the spell's dismissal)."},
 {n:"Witchsight",t:["Ranged","Resist (Willpower)"],d:"Witchsight allows the caster to see active magic, enchanted items, and invisible entities (although such things are simply shadowy representations) that lie within range and line of sight. It can also penetrate illusions or discern the true guise of shapeshifted creatures. Beings which wish to remain hidden or disguised must win an Opposed Roll of their Willpower versus the casting roll."}
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
  costRule:"Roll Exhort to invoke. The cost is drawn from the Devotional Pool rather than from general Magic Points — set your pool below, and record each Miracle's cost from your rulebook.",
  fields:[["cost","Pool cost",1],["intensity","Intensity",1]],
  contentNote:"Miracle lists are specific to each deity and cult and are Reserved Material in the core rulebook — add the Miracles your cult grants you."},
 {key:"sorcery",label:"Sorcery (Grimoire)",castSkill:"Invocation",pool:"mp",hasContent:false,
  summary:"Learned, manipulable magic from a grimoire. Invocation casts the spell; Shaping manipulates it — a caster spends Magic Points on the spell itself plus one more per shaping category applied (Duration, Range, Targets, Magnitude, Intensity), and each additional shaping also costs an extra turn to cast.",
  costRule:"The shaping calculator below computes both numbers: 1 Magic Point for the spell plus 1 per shaping applied, and casting turns to match.",
  fields:[],shaping:["Duration","Range","Targets","Magnitude","Intensity"],
  contentNote:"Grimoire spell lists are Reserved Material in the core rulebook — add the spells in the grimoire your character has studied."},
 {key:"animism",label:"Animism (Spirits)",castSkill:"Binding",pool:"none",hasContent:false,
  summary:"Shamanic magic worked through spirits rather than spells. Binding binds a spirit into service or into a fetish; Trance lets the shaman discorporate into the spirit world. A bound spirit's abilities are what the animist actually brings to bear.",
  costRule:"Roll Binding to bind or command a spirit; Trance to discorporate. Spirits are tracked below with their own POW and CHA, which is what spirit combat is fought with.",
  fields:[["pow","Spirit POW",0],["cha","Spirit CHA",0]],
  contentNote:"Spirit types and their abilities are Reserved Material in the core rulebook — record the spirits your character has bound."},
 {key:"mysticism",label:"Mysticism (Talents)",castSkill:"Mysticism",pool:"mp",hasContent:false,
  summary:"Mind over the matter of one's own body. A mystic develops Talents that push a personal capability past normal limits, sustained by Magic Points; Meditation supports the discipline. Simple in structure, but expensive to run.",
  costRule:"Roll Mysticism to invoke a Talent, paying its Magic Point cost. Record each Talent's Intensity and cost from your rulebook.",
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

   Transcribed from the Mythras Imperative SRD (srd.mythras.net, The Design
   Mechanism, ORC License), whose Experience Table is the core rulebook's.

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
   rulebook ties age to the Experience Table above; it does not ship a
   background-events roll table, and this app has no verified transcription of
   one from any supplement. Rather than fabricate a table and present it as
   rules, this is an openly-labelled generator whose only job is to prompt
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

