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

