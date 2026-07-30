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

