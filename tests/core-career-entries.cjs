// Independent transcription from the user's Mythras Core, printed pp.29–33.
// Commas separate skill names; repeated professional names are distinct offers.
// Navigation normalizes the book's one “Navigate” spelling on p.32.
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../js/data.js'),'utf8');
const ctx=vm.createContext({});vm.runInContext(source+'\nthis.careers=CAREERS;',ctx);
const cases={
 Agent:['Conceal,Deceit,Evade,Insight,Perception,Stealth',1,'Culture,Disguise,Language,Sleight,Streetwise,Survival,Track'],
 Alchemist:['Customs,Endurance,First Aid,Insight,Locale,Perception,Willpower',0,'Commerce,Craft,Healing,Language,Literacy,Lore,Streetwise'],
 'Beast Handler':['Drive,Endurance,First Aid,Influence,Locale,Ride,Willpower',0,'Commerce,Craft,Healing,Lore,Survival,Teach,Track'],
 Courtesan:['Customs,Dance,Deceit,Influence,Insight,Perception,Sing',0,'Art,Courtesy,Culture,Gambling,Language,Musicianship,Seduction'],
 Courtier:['Customs,Dance,Deceit,Influence,Insight,Locale,Perception',0,'Art,Bureaucracy,Courtesy,Culture,Language,Lore,Oratory'],
 Crafter:['Brawn,Drive,Influence,Insight,Locale,Perception,Willpower',0,'Art,Commerce,Craft,Craft,Engineering,Mechanisms,Streetwise'],
 Entertainer:['Athletics,Brawn,Dance,Deceit,Influence,Insight,Sing',0,'Acrobatics,Acting,Oratory,Musicianship,Seduction,Sleight,Streetwise'],
 Farmer:['Athletics,Brawn,Drive,Endurance,Locale,Perception,Ride',0,'Commerce,Craft,Lore,Lore,Navigation,Survival,Track'],
 Fisher:['Athletics,Boating,Endurance,Locale,Perception,Stealth,Swim',0,'Commerce,Craft,Lore,Lore,Navigation,Seamanship,Survival'],
 Herder:['Endurance,First Aid,Insight,Locale,Perception,Ride',1,'Commerce,Craft,Healing,Navigation,Musicianship,Survival,Track'],
 Hunter:['Athletics,Endurance,Locale,Perception,Ride,Stealth',1,'Commerce,Craft,Lore,Mechanisms,Navigation,Survival,Track'],
 Merchant:['Boating,Drive,Deceit,Insight,Influence,Locale,Ride',0,'Commerce,Courtesy,Culture,Language,Navigation,Seamanship,Streetwise'],
 Miner:['Athletics,Brawn,Endurance,Locale,Perception,Sing,Willpower',0,'Commerce,Craft,Engineering,Lore,Mechanisms,Navigation,Survival'],
 Mystic:['Athletics,Endurance,Evade,Insight,Perception,Willpower',1,'Art,Folk Magic,Literacy,Lore,Meditation,Musicianship,Mysticism'],
 Official:['Customs,Deceit,Influence,Insight,Locale,Perception,Willpower',0,'Bureaucracy,Commerce,Courtesy,Language,Literacy,Lore,Oratory'],
 Physician:['Dance,First Aid,Influence,Insight,Locale,Sing,Willpower',0,'Commerce,Craft,Healing,Language,Literacy,Lore,Streetwise'],
 Priest:['Customs,Dance,Deceit,Influence,Insight,Locale,Willpower',0,'Bureaucracy,Devotion,Exhort,Folk Magic,Literacy,Lore,Oratory'],
 Sailor:['Athletics,Boating,Brawn,Endurance,Locale,Swim',1,'Craft,Culture,Language,Lore,Navigation,Seamanship,Survival'],
 Scholar:['Customs,Influence,Insight,Locale,Native Tongue,Perception,Willpower',0,'Culture,Language,Literacy,Lore,Lore,Oratory,Teach'],
 Scout:['Athletics,Endurance,First Aid,Perception,Stealth,Swim',1,'Culture,Healing,Language,Lore,Navigation,Survival,Track'],
 Shaman:['Customs,Dance,Deceit,Influence,Insight,Locale,Willpower',0,'Binding,Folk Magic,Healing,Lore,Oratory,Sleight,Trance'],
 Sorcerer:['Customs,Deceit,Influence,Insight,Locale,Perception,Willpower',0,'Folk Magic,Invocation,Language,Literacy,Lore,Shaping,Sleight'],
 Thief:['Athletics,Deceit,Evade,Insight,Perception,Stealth',1,'Acting,Commerce,Disguise,Lockpicking,Mechanisms,Sleight,Streetwise'],
 Warrior:['Athletics,Brawn,Endurance,Evade,Unarmed',2,'Craft,Engineering,Gambling,Lore,Lore,Oratory,Survival']
};
const sorted=a=>Array.from(a).sort();
assert.deepStrictEqual(sorted(Object.keys(ctx.careers)),sorted(Object.keys(cases)),'career names');
for(const [name,[standards,styleCount,professionals]] of Object.entries(cases)){
 const career=ctx.careers[name];
 assert.deepStrictEqual(sorted(career.std),sorted(standards.split(',')),name+' standard skills');
 assert.strictEqual(career.styleSlots.length,styleCount,name+' combat styles');
 assert.deepStrictEqual(sorted(career.prof.map(x=>x.replace(/\s*\(.*/,''))),sorted(professionals.split(',')),name+' professional skills');
 console.log('PASS',name);
}
// Printed parenthetical contexts, independently checked on Core pp.29–33.
// An empty array means that entry has no printed professional-skill context.
const contexts={
 Agent:['Culture (any)','Language (any)'],
 Alchemist:['Craft (Alchemy)','Language (any)','Lore (Specific Alchemical Speciality)'],
 'Beast Handler':['Craft (Animal Husbandry)','Healing (Specific Species)','Lore (Specific Species)','Teach (Specific Species)'],
 Courtesan:['Art (any)','Culture (any)','Language (any)'],
 Courtier:['Art (any)','Culture (any)','Language (any)','Lore (any)'],
 Crafter:['Art (any)','Craft (Primary)','Craft (Secondary)'],
 Entertainer:[],Farmer:['Craft (any)','Lore (Agriculture)','Lore (Animal Husbandry)'],
 Fisher:['Craft (any)','Lore (Primary Catch)','Lore (Secondary Catch)'],
 Herder:['Craft (Animal Husbandry)','Healing (Specific Species)'],
 Hunter:['Craft (Hunting Related)','Lore (Regional or Specific Species)'],
 Merchant:['Culture (any)','Language (any)'],
 Miner:['Craft (Mining)','Lore (Minerals)','Navigation (Underground)'],
 Mystic:['Art (any)','Lore (any)'],Official:['Language (any)','Lore (any)'],
 Physician:['Craft (Specific Physiological Speciality)','Language (any)','Lore (Specific Alchemical Speciality)'],
 Priest:['Devotion (Pantheon, Cult or God)','Lore (any)'],
 Sailor:['Craft (Specific Shipboard Speciality)','Culture (any)','Language (any)','Lore (any)'],
 Scholar:['Culture (any)','Language (any)','Lore (Primary)','Lore (Secondary)'],
 Scout:['Culture (any)','Language (any)','Lore (any)'],
 Shaman:['Binding (Cult, Totem or Tradition)','Lore (any)'],
 Sorcerer:['Invocation (Cult, School or Grimoire)','Language (any)','Lore (any)'],
 Thief:[],Warrior:['Craft (any)','Lore (Military History)','Lore (Strategy and Tactics)']
};
const styles={Agent:['Concealable Weapons Style'],Herder:['Specific Herding or Cultural Style'],Hunter:['Specific Hunting or Cultural Style'],Mystic:['Cultural Style'],Sailor:['Specific Shipboard or Cultural Style'],Scout:['Specific Hunting or Cultural Style'],Thief:['Concealable Weapons Style'],Warrior:['Cultural Style','Speciality Style']};
for(const name of Object.keys(cases)){
 assert.deepStrictEqual(Array.from(ctx.careers[name].prof).filter(p=>p.includes('(')),contexts[name],name+' printed contexts');
 assert.deepStrictEqual(Array.from(ctx.careers[name].styleSlots),styles[name]||[],name+' style contexts');
}
console.log('PASS all 24 career speciality contexts and Combat Style labels');
