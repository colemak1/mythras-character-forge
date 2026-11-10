// Golden bouts for tests/pits-golden.cjs. Fighter "a" is player controlled
// (prompts and choices answered from the seed); fighter "b" is the AI, except
// in the last bout where both are AI. "covers" lists what each fixture must
// contain: [what, pattern matched against a log line]. A log line reads
// "round.cycle | kind | title | body | detail".
const P={
 halfParry:['parry by a weapon one Size smaller (half blocked)',/Successful weapon parry: \d+ absorbed \(Size 2 vs 3\)/],
 serious:['a Serious Wound',/ \| SERIOUS WOUND · /],
 impale:['Impale lodging the weapon',/ \| Impaled Weapon \| /],
 impalePick:['Impale rolling weapon damage twice',/ \| Impale · Damage selected \| /],
 withdraw:['withdrawing an impaled weapon',/ \| Withdrawal injury \| /],
 entangle:['Entangle',/ \| Entangle \| /],
 entangleTrip:['the Trip that follows an Entangle',/ \| Entangle · Trip \| /],
 knockback:['Knockback',/ \| Knockback \| /],
 shieldStrike:['a shield strike',/strikes with the shield/],
 bash:['shield Bash',/ \| Bash \| .*(knocks|is not moved)/],
 tie:['concurrent tied Initiative',/ \| Tied Initiative \| /],
 effects:['Special Effects won',/Special Effects \| /],
 range:['a contested change of range',/ \| Change Range · /]
};
module.exports=[
 {name:'sword against a two-handed axe',seed:246,covers:[P.halfParry,P.serious,P.effects],
  a:{name:'Asha',kind:'human',style:72,weapon:'sword',evade:50,str:14,siz:13,con:12,dex:14,int:13},
  b:{name:'Borik',kind:'ai',style:68,weapon:'battleaxe-2h',armor:2,str:15,siz:15,con:14,dex:11,int:11,extra:{tactic:'patient'}}},
 {name:'spear against a barbed trident',seed:225,covers:[P.impale,P.impalePick,P.withdraw],
  a:{name:'Cade',kind:'human',style:75,weapon:'spear',armor:1,evade:48,str:13,siz:12,con:13,dex:15,int:12},
  b:{name:'Dessa',kind:'ai',style:70,weapon:'trident',armor:1,str:13,siz:13,con:13,dex:13,int:13,extra:{tactic:'aggressive'}}},
 {name:'ball and chain against a net',seed:144,covers:[P.entangle,P.entangleTrip],
  a:{name:'Esme',kind:'human',style:70,weapon:'ball-chain',evade:55,str:13,siz:11,con:14,dex:13,int:14,extra:{acrobatics:60}},
  b:{name:'Faro',kind:'ai',style:74,weapon:'net',armor:1,evade:60,str:12,siz:12,con:12,dex:16,int:12,extra:{tactic:'elusive'}}},
 {name:'mace and hoplite shield against a great club',seed:230,covers:[P.shieldStrike,P.bash,P.knockback],
  a:{name:'Gisla',kind:'human',style:78,weapon:'mace',shield:'hoplite',armor:3,evade:40,str:16,siz:9,con:15,dex:12,int:12},
  b:{name:'Hrolf',kind:'ai',style:66,weapon:'great-club',armor:1,str:17,siz:16,con:14,dex:10,int:10,extra:{tactic:'aggressive'}}},
 {name:'two computer fighters with tied Initiative',seed:358,covers:[P.tie,P.effects,P.range],
  a:{name:'Ivo',kind:'ai',style:70,weapon:'longsword',shield:'heater',armor:2,str:13,siz:13,con:13,dex:13,int:13,extra:{tactic:'shield'}},
  b:{name:'Jarn',kind:'ai',style:70,weapon:'shortsword',shield:'buckler',armor:2,str:13,siz:13,con:13,dex:13,int:13,extra:{tactic:'reach'}}}
];
