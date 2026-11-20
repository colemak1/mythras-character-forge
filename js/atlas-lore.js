"use strict";
/* World Guide atlas: the lore layer (owner content, never generated).

   The geography (borders, settlements, rivers, roads) comes from the Azgaar
   export in assets/atlas/atlas-data.json; scripts/build-atlas-data.py
   rebuilds it. Everything players read about a place, and the timeline,
   lives here, keyed by the ids in that file:

   nations  {<nation id>: {summary, body}}     ids: valeshar, zhalin, the-hix ...
   places   {<settlement id>: {name, summary, body}}
            name replaces the stand-in map's name (Golshehr is Shamur).
   calendar {era, eraShort, year}               the present day; null shows none
            (the map file's 845 PE is only Azgaar's, owner 2026-11-20).
   eras     [{id, name, short, start, end}]     in order; end null = ongoing.
   events   [{id, year, label, era, title, summary, nations:[ids],
             places:[ids]}]                     label overrides the year text
            ("c. 300 PE"); nations/places light up on the map.

   An event can also have at: {x, y, name}, a point in map units for a place
   that isn't a settlement (a battlefield); it gets its own pin.
   sample: true marks a made-up event (the timeline says "Sample events").

   body is trusted HTML written by the owner or Claude (paragraphs, lists).
   summary is plain text. Anything left out shows "No entry yet". */
const ATLAS_LORE={
 nations:{
  valeshar:{summary:'A country in Sit’ota.'}
 },
 places:{
  golshehr:{name:'Shamur',summary:'The capital of Valeshar.'}
 },
 calendar:null,
 // SAMPLE ERAS AND EVENTS (owner, 2026-11-20: "fake timeline events so I can
 // see how that looks"). Made up, not canon: replace them with the real ones,
 // or delete everything marked sample.
 eras:[
  {id:'crowns',name:'Age of Crowns',short:'AC'},
  {id:'embers',name:'Age of Embers',short:'AE'}
 ],
 events:[
  {id:'founding-of-shamur',year:12,era:'crowns',sample:true,title:'The founding of Shamur',
   summary:'Three river clans raise a walled market where their roads meet. It becomes the seat of the first Valeshi kings.',places:['golshehr']},
  {id:'hix-charter',year:88,era:'crowns',sample:true,title:'The Hix Charter',
   summary:'The northern holds swear to one law at Ingosca and name themselves the Hix.',places:['ingosca']},
  {id:'treaty-of-cantia',year:141,era:'crowns',sample:true,title:'The Treaty of Cantia',
   summary:'Ba Riggelby and Menesha end forty years of border raids and open the western roads to trade.',places:['cantia','lousondelia']},
  {id:'long-winter',year:260,era:'crowns',sample:true,title:'The Long Winter',
   summary:'Three summers fail in a row across the north-east. Zhalin, the Hix and Buffalo lose a third of their people.',nations:['zhalin','the-hix','buffalo']},
  {id:'fall-of-seafordge',year:302,era:'crowns',sample:true,title:'The fall of Seafordge',
   summary:'Raiders from the sea burn the old capital of L’zar, ending the Age of Crowns.',places:['seafordge']},
  {id:'battle-of-the-steppe',year:3,era:'embers',sample:true,title:'Battle of the Khor Steppe',
   summary:'The khans of Khor break a coalition army on the open grass, far from any town.',
   nations:['khor'],at:{x:445,y:478,name:'Khor steppe'}},
  {id:'katalli-claims',year:40,era:'embers',sample:true,title:'Katalli claims the peninsula',
   summary:'Phais sends governors to every harbour on the south-western arm.',places:['phais','onion']},
  {id:'plague-ships',year:77,era:'embers',sample:true,title:'The plague ships',
   summary:'Fever comes ashore at Kuheh and spreads up the river to Godin before the ports are closed.',places:['kuheh','godin']},
  {id:'salt-war',year:120,era:'embers',sample:true,title:'The Salt War',
   summary:'Marett and Joda fight over the salt roads between Mallura and Shahafaran.',places:['mallura','shahafaran']},
  {id:'drowned-bell',label:'Undated',era:'embers',sample:true,title:'The drowned bell of Nisho',
   summary:'Fishers at Nisho say a temple bell rings under the bay before every storm.',places:['nisho']}
 ]
};
