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
 eras:[],
 events:[]
};
