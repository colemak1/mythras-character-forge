const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..');
const ctx={console,setTimeout,clearTimeout,setInterval,clearInterval,URL,Date,Map,Set,WeakMap,
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/'},supabase:{createClient:()=>({auth:{signOut:async()=>({})}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};vm.createContext(ctx);
for(const name of ['data','engine','cloud','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
run('render=()=>{};');
const test=(name,fn)=>{fn();console.log('PASS',name)};
const reset=()=>run('S=freshState();VIEW_ONLY=false;S.chars={STR:12,CON:12,SIZ:12,DEX:14,INT:12,POW:12,CHA:13};');
test('Core p.33 custom career stays editable and counts styles within seven',()=>{
 reset();run('APP.pickCareer("__custom__");APP.customCareerName("Artificer");');
 assert.equal(run('S.career'),null);assert.match(run('stepCareer()'),/Build your custom career/);
 run('S.customCareer.std=["Athletics","Brawn","Endurance","Evade","First Aid","Locale"];APP.customCareerStyles(2);APP.confirmCustomCareer();');
 assert.equal(run('S.career'),null);assert.match(run('stepCareer()'),/Remove selections to continue/);
 run('APP.customCareerStyles(1);APP.confirmCustomCareer();');assert.equal(run('S.career'),'__custom__');
 run('APP.editCustomCareer();');assert.equal(run('S.customCareer.name'),'Artificer');assert.equal(run('S.customCareer.std.length'),6);
 run('S.career="__custom__";S.customCareer.styleSlots=2;');assert.match(run('validate(currentSteps().indexOf("Career")).msg'),/at most seven/);
});
test('editing a custom career preserves allocations for skills still offered',()=>{
 reset();run('APP.pickCareer("__custom__");APP.customCareerName("Artificer");APP.customCareerStd("Athletics");APP.customCareerStyles(1);APP.confirmCustomCareer();S.carStyles[0].name="Guard";S.carProf[0]="Healing";S.alloc.career={"std:Athletics":15,"style:k0":10,"prof:Healing|":12};APP.editCustomCareer();APP.customCareerStd("Brawn");');
 assert.equal(run('S.alloc.career["std:Athletics"]'),15);
 assert.equal(run('S.alloc.career["style:k0"]'),10);
 assert.equal(run('S.alloc.career["prof:Healing|"]'),12);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();APP.confirmCustomCareer();`);
 assert.equal(run('S.alloc.career["std:Athletics"]'),15);assert.equal(run('S.alloc.career["style:k0"]'),10);assert.equal(run('S.alloc.career["prof:Healing|"]'),12);
 run('APP.editCustomCareer();APP.customCareerStd("Athletics");');
 assert.equal(run('S.alloc.career["std:Athletics"]'),undefined);assert.equal(run('S.alloc.career["style:k0"]'),10);
});
test('Core p.33 custom careers save seven offers and retain unavailable selected skills for correction',()=>{
 reset();run('APP.pickCareer("__custom__");APP.customCareerName("Explorer");APP.customCareerStd("Athletics");APP.customCareerOffer(0,"Lore");APP.customCareerOffer(1,"Lore");APP.customCareerOffer(2,"Healing");APP.customCareerStyles(3);APP.confirmCustomCareer();S.carStyles.forEach((x,i)=>x.name="Style "+i);S.carProf=["Lore","Lore","Healing"];S.carProfSpec=["History","Nature",""];S.alloc.career[profKey("Lore","History")]=12;');
 assert.equal(run('S.career'),'__custom__');assert.equal(run('S.carStyles.length'),3);
 assert.equal(run('professionalPicksError(S.carProf,S.carProfSpec,S.customCareer.profOffers,null,"Career")'),null);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();APP.editCustomCareer();APP.customCareerOffer(0,"");APP.confirmCustomCareer();`);
 assert.equal(run('S.alloc.career[profKey("Lore","History")]'),12);
 assert.doesNotMatch(run('validate(currentSteps().indexOf("Career")).msg'),/Add enough Lore/);
 run('APP.editCustomCareer();APP.customCareerOffer(1,"");APP.confirmCustomCareer();');
 assert.match(run('stepCareer()'),/Lore \(no longer offered\)/);
 assert.equal(run('S.alloc.career[profKey("Lore","History")]'),12);
});
test('one custom offer permits distinct specialities while duplicates remain invalid',()=>{
 reset();run('APP.pickCareer("__custom__");APP.customCareerName("Scholar");APP.customCareerOffer(0,"Lore");APP.confirmCustomCareer();S.carProf=["Lore","Lore",null];S.carProfSpec=["History","Nature",""];');
 assert.equal(run('professionalPicksError(S.carProf,S.carProfSpec,S.customCareer.profOffers,null,"Career")'),null);
 assert.match(run('validate(currentSteps().indexOf("Career")).msg'),/Spend exactly 100/);
 run('S.carProfSpec[1]="History";');assert.match(run('validate(currentSteps().indexOf("Career")).msg'),/twice/);
 run('S.carProf=["Literacy",null,null];');assert.match(run('profPickers("car",["Literacy"],3)'),/choose the spoken language/i);
 run('S.hobby="Literacy";');assert.match(run('stepBonus()'),/choose the spoken language/i);
});
test('legacy custom career selections remain available and migrate on editing',()=>{
 reset();run('S.customCareer={isCustom:true,name:"Old",std:["Athletics"],prof:[],styleSlots:0};S.career="__custom__";S.carProf=["Healing",null,null];S.alloc.career[profKey("Healing","")]=15;');
 assert.match(run('stepCareer()'),/Healing/);run('APP.editCustomCareer();');
 assert.equal(run('S.customCareer.profOffers[0]'),'Healing');assert.equal(run('S.alloc.career[profKey("Healing","")]'),15);
});
test('Core p.34 permits spending bonus points without choosing a hobby',()=>{
 reset();run('S.hobby=null;S.alloc.bonus={};STD.slice(0,10).forEach(([n])=>S.alloc.bonus["std:"+n]=15);');
 assert.equal(run('validate(currentSteps().indexOf("Bonus Skills")).ok'),true);
 assert.match(run('stepBonus()'),/Hobby skill \(optional\)/);
});
test('Core p.34 human age ranges, mismatch warnings and category changes preserve data',()=>{
 reset();
 for(const [category,low,high] of [['young',11,16],['adult',17,27],['middle',28,43],['senior',44,64],['old',65,90]]){
  run(`S.age.category=${JSON.stringify(category)};S.age.years=${low};`);assert.equal(run('ageRangeIssue()'),null);
  run(`S.age.years=${high};`);assert.equal(run('ageRangeIssue()'),null);
  run(`S.age.years=${high+1};`);assert.match(run('ageRangeIssue()'),/normally covers/);
 }
 run('S.age.category="adult";S.age.years=40;S.concept.age="40";S.alloc.bonus={"std:Athletics":15};');
 assert.equal(run('validate(0).ok'),false);assert.equal(run('bonusPool()'),150);
 assert.match(run('ageCard()'),/Record GM exception/);
 run('APP.pickAge("middle")');assert.equal(run('S.age.years'),40);assert.equal(run('S.concept.age'), '40');
 assert.equal(run('S.alloc.bonus["std:Athletics"]'),15);assert.equal(run('bonusPool()'),200);assert.equal(run('validate(0).ok'),true);
 run('APP.pickAge("adult");APP.approveAgeRange();');assert.equal(run('validate(0).ok'),true);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);assert.equal(run('validate(0).ok'),true);
 run('APP.ageYears("41")');assert.equal(run('validate(0).ok'),false);assert.equal(run('S.alloc.bonus["std:Athletics"]'),15);
 run('APP.ageYears("1.5");APP.approveAgeRange();');assert.equal(run('validate(0).ok'),false);
 run('S.species="elf";S.age.years=100;');assert.equal(run('ageRangeIssue()'),null);
});
test('Core pp.44–48 requires specialities for literacy, instruments, mysticism and navigation',()=>{
 reset();
 for(const [name,spec] of [['Literacy','Native Tongue'],['Musicianship','Wind'],['Mysticism','Temple'],['Navigation','Underground']]){
  ctx.skillName=name;ctx.skillSpec=spec;
  assert.match(run('professionalPicksError([skillName],[""],[skillName],null,"Career")'),/speciality/);
  assert.equal(run('professionalPicksError([skillName],[skillSpec],[skillName],null,"Career")'),null);
 }
 run('S.hobby="Navigation";S.hobbySpec="";');assert.match(run('validate(currentSteps().indexOf("Bonus Skills")).msg'),/speciality/);
 run('S.hobbySpec="Sea";');assert.doesNotMatch(run('validate(currentSteps().indexOf("Bonus Skills")).msg'),/speciality/);
});
test('naming legacy unspecialised skills preserves their bonus points',()=>{
 reset();run('S.culture="Barbarian";S.cultProf=["Navigation",null,null];S.alloc.culture[profKey("Navigation","")]=10;S.alloc.bonus[profKey("Navigation","")]=7;APP.profSpec("cult",0,"Sea");');
 assert.equal(run('aGet("culture",profKey("Navigation","Sea"))'),10);assert.equal(run('aGet("bonus",profKey("Navigation","Sea"))'),7);
 run('S.hobby="Musicianship";S.hobbySpec="";S.alloc.bonus[profKey("Musicianship","")]=12;APP.hobbySpec("Wind");');
 assert.equal(run('aGet("bonus",profKey("Musicianship","Wind"))'),12);
});
test('Core p.47 linked literacy is capped by the selected spoken skill without losing points',()=>{
 reset();run('S.culture="Civilised";S.cultProf=["Literacy","Language",null];S.cultProfSpec=["Coastal","Coastal",""];S.alloc.culture[profKey("Literacy","Coastal")]=15;S.alloc.culture[profKey("Language","Coastal")]=5;');
 const lk=run('profKey("Literacy","Coastal")'),lang=run('profKey("Language","Coastal")');ctx.lk=lk;ctx.lang=lang;
 assert.equal(run('finalPct(lk)'),39);run('APP.literacyLink(lk,lang);');assert.equal(run('finalPct(lk)'),30);
 assert.equal(run('aGet("culture",lk)'),15);assert.match(run('literacyLinksHTML()'),/uncapped 39%/);
 run('S.alloc.bonus[lang]=15;');assert.equal(run('finalPct(lk)'),39);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);assert.equal(run('finalPct(lk)'),39);assert.equal(run('S.literacyLinks[lk]'),lang);
 run('APP.literacyLink(lk,"std:Native Tongue");');assert.equal(run('finalPct(lk)'),39);
 run('APP.literacyLink(lk,"std:Athletics");');assert.equal(run('S.literacyLinks[lk]'),"std:Native Tongue");
 run('S.literacyLinks[lk]="prof:Language|missing";');assert.equal(run('finalPct(lk)'),39);assert.match(run('literacyLinksHTML()'),/no longer available/);
});
test('linked Literacy advancement respects the spoken-language limit without spending a roll at cap',()=>{
 reset();ctx.alert=()=>{};run('S.culture="Civilised";S.cultProf=["Literacy","Language",null];S.cultProfSpec=["Coastal","Coastal",""];S.alloc.culture[profKey("Literacy","Coastal")]=5;S.alloc.culture[profKey("Language","Coastal")]=4;S.xp.pool=3;');
 const lk=run('profKey("Literacy","Coastal")'),lang=run('profKey("Language","Coastal")');ctx.lk=lk;ctx.lang=lang;
 run('APP.literacyLink(lk,lang);');const pool=run('S.xp.pool');run('APP.xpSpend(lk);');assert.equal(run('S.xp.pool'),pool);
 run('S.alloc.culture[lang]=10;');const before=run('rawSkillPct(lk,entryMap())');run('APP.xpSpend(lk);');
 assert.equal(run('S.xp.pool'),pool-1);assert(run('rawSkillPct(lk,entryMap())')<=run('rawSkillPct(lang,entryMap())'));assert(run('rawSkillPct(lk,entryMap())')>before);
 run('S.xp.fumbled.push(lk);S.alloc.culture[lang]=rawSkillPct(lk,entryMap())-25+1;');
 const rolls=run('S.xp.pool');run('APP.xpSpend(lk);');assert.equal(run('S.xp.pool'),rolls);assert.equal(run('S.xp.fumbled.includes(lk)'),false);
});
test('switching creation mode removes stale literacy links and preserves learned skills',()=>{
 reset();run('S.culture="Civilised";S.cultProf=["Literacy","Language",null];S.cultProfSpec=["Coastal","Coastal",""];S.xp.learnedProfs=[{name:"Literacy",spec:"Ancient"}];APP.literacyLink(profKey("Literacy","Coastal"),profKey("Language","Coastal"));APP.literacyLink(profKey("Literacy","Ancient"),"std:Native Tongue");APP.setMode("quick");');
 assert.equal(run('S.literacyLinks[profKey("Literacy","Coastal")]'),undefined);
 assert.equal(run('S.literacyLinks[profKey("Literacy","Ancient")]'),'std:Native Tongue');
});
test('changing a speciality does not overwrite points already on the destination skill',()=>{
 reset();run('S.career="Scholar";S.carProf=["Lore","Lore",null];S.carProfSpec=["History","Nature",""];S.alloc.career[profKey("Lore","History")]=7;S.alloc.career[profKey("Lore","Nature")]=8;APP.profSpec("car",0,"Nature");');
 assert.equal(run('aGet("career",profKey("Lore","Nature"))'),15);assert.equal(run('aSum("career")'),15);
 assert.match(run('validate(currentSteps().indexOf("Career")).msg'),/twice/);
});
test('reselecting a custom career during editing preserves selections and allocations',()=>{
 reset();run('APP.pickCareer("__custom__");APP.customCareerName("Scout");APP.customCareerStd("Athletics");APP.customCareerStyles(1);APP.confirmCustomCareer();S.carStyles[0].name="Bow";S.carProf[0]="Healing";S.alloc.career["std:Athletics"]=12;APP.editCustomCareer();APP.pickCareer("__custom__");');
 assert.equal(run('S.carStyles[0].name'),'Bow');assert.equal(run('S.carProf[0]'),'Healing');assert.equal(run('S.alloc.career["std:Athletics"]'),12);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();APP.confirmCustomCareer();`);
 assert.equal(run('S.alloc.career["std:Athletics"]'),12);assert.equal(run('S.carStyles[0].name'),'Bow');
});
test('reselecting a professional skill preserves its speciality and allocated points',()=>{
 reset();run('S.career="Warrior";S.carProf=["Lore",null,null];S.carProfSpec=["Military History","",""];S.alloc.career[profKey("Lore","Military History")]=12;APP.pickProf("car",0,"Lore");');
 assert.equal(run('S.carProfSpec[0]'),'Military History');assert.equal(run('aGet("career",profKey("Lore","Military History"))'),12);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);assert.equal(run('aGet("career",profKey("Lore","Military History"))'),12);
});
test('adding another unspecialised professional choice does not overwrite existing points',()=>{
 for(const mode of ['cult','quick']){
  reset();ctx.mode=mode;run('if(mode==="cult"){S.culture="Civilised";S.cultProf=["Lore",null,null];}else{S.creationMode="quick";S.qProf=["Lore",null,null];}');
  run('window.constPhase=mode==="cult"?"culture":"quick";S.alloc[constPhase][profKey("Lore","")]=12;APP.pickProf(mode,1,"Lore");');
  assert.equal(run('aGet(constPhase,profKey("Lore",""))'),12);
 }
});
test('removing one duplicate professional choice preserves the remaining allocation',()=>{
 for(const mode of ['cult','car','quick']){
  reset();ctx.mode=mode;
  run('if(mode==="cult"){S.culture="Civilised";S.cultProf=["Lore","Lore",null];S.cultProfSpec=["History","History",""];}else if(mode==="car"){S.career="Scholar";S.carProf=["Lore","Lore",null];S.carProfSpec=["History","History",""];}else{S.creationMode="quick";S.qProf=["Lore","Lore",null];S.qProfSpec=["History","History",""];}window.phase=mode==="cult"?"culture":mode==="car"?"career":"quick";S.alloc[phase][profKey("Lore","History")]=12;APP.pickProf(mode,0,"");');
  assert.equal(run('aGet(phase,profKey("Lore","History"))'),12);
  const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);assert.equal(run('aGet(phase,profKey("Lore","History"))'),12);
  run('APP.pickProf(mode,1,"");');assert.equal(run('aGet(phase,profKey("Lore","History"))'),0);
 }
});
test('changing one duplicate speciality leaves the shared points on the remaining skill',()=>{
 reset();run('S.career="Scholar";S.carProf=["Lore","Lore",null];S.carProfSpec=["History","History",""];S.alloc.career[profKey("Lore","History")]=12;APP.profSpec("car",0,"Nature");');
 assert.equal(run('aGet("career",profKey("Lore","History"))'),12);assert.equal(run('aGet("career",profKey("Lore","Nature"))'),0);assert.equal(run('aSum("career")'),12);
});
test('changing career warns before discarding selected career work',()=>{
 reset();run('APP.pickCareer("Scholar");S.carProf[0]="Lore";S.carProfSpec[0]="History";S.alloc.career[profKey("Lore","History")]=12;');
 ctx.confirm=()=>false;run('APP.pickCareer("Warrior");');assert.equal(run('S.career'),'Scholar');assert.equal(run('aGet("career",profKey("Lore","History"))'),12);
 run('APP.pickCareer("__custom__");');assert.equal(run('S.career'),'Scholar');assert.equal(run('S.carProfSpec[0]'),'History');
 ctx.confirm=()=>true;run('APP.pickCareer("Warrior");');assert.equal(run('S.career'),'Warrior');assert.equal(run('aSum("career")'),0);
});
test('changing culture warns before discarding work but not for seeded defaults',()=>{
 reset();let prompts=0;ctx.confirm=()=>{prompts++;return false};run('APP.pickCulture("Civilised");APP.pickCulture("Barbarian");');assert.equal(prompts,0);assert.equal(run('S.culture'),'Barbarian');
 run('S.cultProf[0]="Lore";S.cultProfSpec[0]="History";S.alloc.culture[profKey("Lore","History")]=10;S.alloc.bonus[profKey("Lore","History")]=8;APP.pickCulture("Civilised");');
 assert.equal(prompts,1);assert.equal(run('S.culture'),'Barbarian');assert.equal(run('aGet("culture",profKey("Lore","History"))'),10);assert.equal(run('aGet("bonus",profKey("Lore","History"))'),8);
 ctx.confirm=()=>true;run('APP.pickCulture("Civilised");');assert.equal(run('S.culture'),'Civilised');assert.equal(run('aGet("culture",profKey("Lore","History"))'),0);ctx.confirm=()=>true;
});
test('reducing custom career styles warns before removing work',()=>{
 reset();run('APP.pickCareer("__custom__");APP.customCareerName("Scout");APP.customCareerStyles(2);S.carStyles[1].name="Spear";S.alloc.career["style:k1"]=12;S.styleDefs["style:k1"]={weapons:["Spear"],traits:[]};');
 ctx.confirm=()=>false;run('APP.customCareerStyles(1);');assert.equal(run('S.customCareer.styleSlots'),2);assert.equal(run('S.carStyles[1].name'),'Spear');assert.equal(run('aGet("career","style:k1")'),12);
 ctx.confirm=()=>true;run('APP.customCareerStyles(1);');assert.equal(run('S.customCareer.styleSlots'),1);assert.equal(run('S.carStyles.length'),1);ctx.confirm=()=>true;
});
test('changing one linked career style preserves shared cultural-style points',()=>{
 reset();run('S.cultStyleOn=true;S.cultStyleName="Guard";S.customCareer={isCustom:true,name:"Soldier",std:[],styleSlots:2};S.career="__custom__";S.carStyles=[{mode:"link",name:""},{mode:"link",name:""}];S.alloc.career["style:cult"]=12;APP.carStyleMode(0,"link");');
 assert.equal(run('aGet("career","style:cult")'),12);run('APP.carStyleMode(0,"new");');assert.equal(run('aGet("career","style:cult")'),12);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);assert.equal(run('aGet("career","style:cult")'),12);
 run('APP.carStyleMode(1,"new");');assert.equal(run('aGet("career","style:cult")'),0);
});
test('removing a cultural style warns and cancellation preserves every allocation',()=>{
 reset();run('S.cultStyleOn=true;S.cultStyleName="Guard";S.carStyles=[{mode:"link",name:""}];S.alloc.culture["style:cult"]=5;S.alloc.career["style:cult"]=10;S.alloc.bonus["style:cult"]=7;');
 ctx.confirm=()=>false;run('APP.cultStyle(false);');assert.equal(run('S.cultStyleOn'),true);assert.equal(run('S.carStyles[0].mode'),'link');
 for(const ph of ['culture','career','bonus'])assert(run(`aGet(${JSON.stringify(ph)},"style:cult")`)>0);
 ctx.confirm=()=>true;run('APP.cultStyle(false);');assert.equal(run('S.cultStyleOn'),false);assert.equal(run('S.carStyles[0].mode'),'new');assert.equal(run('aGet("career","style:cult")'),0);
});
test('Core p.10 human hit-location table across every printed band and extension',()=>{
 const expected=[[1,3,2,1,1],[2,4,3,1,2],[3,5,4,2,3],[4,6,5,3,4],[5,7,6,4,5],[6,8,7,5,6],[7,9,8,6,7],[8,10,9,7,8],[9,11,10,8,9]];
 for(let i=0;i<expected.length;i++)for(const total of [i*5+1,i*5+5]){
  ctx.total=total;assert.deepEqual(Array.from(run('hpLocs(total,0)'),x=>x[1]),expected[i]);
 }
});
test('Core p.8 characteristic inputs reject fractional values without altering stored data',()=>{
 reset();run('S.charMode="pb";S.chars={STR:10.5,CON:9.5,SIZ:12,DEX:12,INT:12,POW:12,CHA:12};');
 assert.match(run('validate(currentSteps().indexOf("Characteristics")).msg'),/whole number/);assert.equal(run('S.chars.STR'),10.5);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);assert.equal(run('S.chars.STR'),10.5);
});
test('Core p.23 Passion table uses each target formula and leaves missing values unresolved',()=>{
 reset();run('S.chars.POW=12;S.chars.INT=14;');
 for(const [type,pow,cha,expected] of [['romantic',11,9,50],['platonic','',9,51],['averse','',9,51],['org','','',56],['place','','',56],['species','','',54],['object','','',54]]){
  ctx.p={type,subjPOW:pow,subjCHA:cha};assert.equal(run('passionVal(p)'),expected,type);
 }
 ctx.p={type:'romantic',subjPOW:'',subjCHA:'9'};assert.equal(run('passionVal(p)'),'?');
 ctx.p={type:'averse',subjCHA:''};assert.equal(run('passionVal(p)'),'?');
 ctx.p={type:'averse',subjCHA:'-1'};assert.equal(run('passionVal(p)'),'?');
 run('S.passions=[{name:"Love",type:"romantic",subjPOW:"",subjCHA:"9"}];S.xp.pool=1;APP.xpSpendPassion(0);');assert.equal(run('S.xp.pool'),1);assert.match(run('stepPassions()'),/Enter the subject characteristics/);
});
test('Core pp.21,24 culture money multipliers and social class modifiers',()=>{
 const expected={Barbarian:[50,[["Outcast",0.25],["Slave",0.5],["Freeman",1],["Gentry",3],["Ruling",5]]],Civilised:[75,[["Outcast",0.25],["Slave",0.5],["Freeman",1],["Gentry",3],["Aristocracy",5],["Ruling",10]]],Nomadic:[25,[["Outcast",0.25],["Slave",0.5],["Freeman",1],["Ruling",3]]],Primitive:[10,[["Outcast",0.25],["Freeman",1],["Ruling",2]]]};
 for(const [culture,[mult,classes]] of Object.entries(expected)){
  reset();ctx.culture=culture;run('S.culture=culture;S.money.dice=[1,2,3,4];');assert.equal(run('baseMult()'),mult);
  for(const [name,mod] of classes){ctx.className=name;run('APP.pickSocialClass(className)');assert.equal(run('S.money.mod'),mod);assert.equal(run('moneyTotal()'),10*mult*mod);}
 }
});
test('Core pp.62–67 crew equipment and vehicle reference stays separate from personal gear',()=>{
 reset();
 const before=run('JSON.stringify(S)');
 const html=run('stepMoney()');
 assert.match(html,/Equipment reference and GM procedures/);
 assert.match(html,/Ballista<\/th><td>4d6<\/td><td>200 \/ 400<\/td><td>5<\/td><td>2 \/ 4/);
 assert.match(html,/Four-wheeled freight wagon<\/th><td>10<\/td><td>200<\/td><td>2/);
 assert.match(html,/Herculean with improvised tools/);
 assert.equal(run('JSON.stringify(S)'),before);
});
test('Core pp.60–61 tool presets add editable inventory with exact silver prices',()=>{
 reset();
 run('APP.addCoreTool("");APP.addCoreTool(1000);');
 assert.equal(run('S.inventory.length'),0);
 run('APP.addCoreTool(CORE_TOOLS.findIndex(([name])=>name==="Nails or tacks (50)"));APP.inv(0,"qty","3");');
 assert.equal(run('inventoryCostTotal()'),0.6);
 assert.equal(run('inventoryEncTotal()'),0);
 run('APP.addCoreTool(CORE_TOOLS.findIndex(([name])=>name==="Hemp rope (10 m)"));');
 assert.equal(run('inventoryCostTotal()'),10.6);
 assert.equal(run('inventoryEncTotal()'),2);
 assert.match(run('stepMoney()'),/Lockboxes|lockboxes/);
});
test('Core p.77 worn clothing is exempt, with carried clothing and zero-ENC groups counted',()=>{
 reset();
 run('S.chars={STR:10,CON:10,SIZ:10,DEX:10,INT:10,POW:10,CHA:10};S.inventory=[{name:"Coat",qty:1,enc:1,cost:4},{name:"Buttons",qty:19,enc:0},{name:"Boots",qty:1,enc:0}];S.gearWeapons=["Dagger"];');
 assert.equal(run('gearEncTotal()'),2);
 run('APP.inv(0,"wornClothing",true);APP.playInv(2,"wornClothing",true);');
 assert.equal(run('zeroEncItemCount()'),20);
 assert.equal(run('gearEncTotal()'),1);
 assert.equal(run('inventoryCostTotal()'),4);
 run('APP.playInv(0,"wornClothing",false);');
 assert.equal(run('gearEncTotal()'),2);
 assert.match(run('stepMoney()'),/Worn everyday clothing/);
 run('S.gearWeapons=[];S.inventory=[{name:"Load",qty:1,enc:20}];');
 for(const [enc,label] of [[20,"Unencumbered"],[20.5,"Burdened"],[30,"Burdened"],[30.5,"Overloaded"],[40,"Overloaded"],[40.5,"Over the hard cap"]]){
   run(`S.inventory[0].enc=${enc}`);
   assert.equal(run('encStatus().label'),label);
 }
});
test('background wealth adjusts available funds once without changing purchases',()=>{
 reset();
 run('S.culture="Civilised";S.money.dice=[1,2,3,4];S.money.spent=10;S.age.events=[{effect:{type:"silver",pct:40}}];APP.applyLifeEvent(0);APP.applyLifeEvent(0);');
 assert.equal(run('S.money.spent'),10);
 assert.equal(run('moneyTotal()'),1050);
 assert.equal(run('moneyRemaining()'),1040);
});
test('Core p.22 personal connections explain manually tracked Group Luck',()=>{
 reset();assert.match(run('stepCommunity()'),/Group Luck starts at 2 plus 1 per character/);assert.match(run('stepCommunity()'),/Track this shared pool with the GM/);
});
test('Core p.24 social class roll tables cover every result and preserve roll on save',()=>{
 const reference={Barbarian:[[1,5,"Outcast"],[6,15,"Slave"],[16,80,"Freeman"],[81,95,"Gentry"],[96,100,"Ruling"]],Civilised:[[1,2,"Outcast"],[3,20,"Slave"],[21,70,"Freeman"],[71,95,"Gentry"],[96,99,"Aristocracy"],[100,100,"Ruling"]],Nomadic:[[1,5,"Outcast"],[6,10,"Slave"],[11,90,"Freeman"],[91,100,"Ruling"]],Primitive:[[1,5,"Outcast"],[6,80,"Freeman"],[81,100,"Ruling"]]};
 for(const [culture,rows] of Object.entries(reference))for(let n=1;n<=100;n++){ctx.culture=culture;ctx.roll=n;assert.equal(run('socialClassForRoll(culture,roll)[0]'),rows.find(([lo,hi])=>n>=lo&&n<=hi)[2]);}
 reset();run('S.culture="Civilised";Math.random=()=>0.99;APP.rollSocialClass();');assert.equal(run('S.money.socialClass'),'Ruling');assert.equal(run('S.money.mod'),10);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);assert.equal(run('S.money.classRoll.roll'),100);
 ctx.confirm=()=>false;run('APP.rollSocialClass();');assert.equal(run('S.money.classRoll.roll'),100);ctx.confirm=()=>true;
 run('APP.pickSocialClass("Freeman");');assert.equal(run('S.money.classRoll'),null);
 assert.equal(run('socialClassForRoll("Civilised",0)'),null);
});
test('cultural loyalty suggestions use the target category from Core pp.14–16',()=>{
 for(const [culture,type] of [['Barbarian','platonic'],['Civilised','place'],['Nomadic','platonic'],['Primitive','platonic']]){
  reset();ctx.culture=culture;run('S.culture=culture;APP.pasFromCulture()');assert.equal(run('S.passions[0].type'),type,culture);
 }
});
test('Core p.8 rolled-order assignment uses each roll once within its dice group',()=>{
 reset();run('S.charMode="roll";S.poolA=[7,8,9,10,11];S.poolB=[12,13];APP.assignRolledOrder();');
 assert.deepEqual(Array.from(run('CHARS.map(c=>S.chars[c])')),[7,8,12,9,13,10,11]);
 assert.equal(run('validate(currentSteps().indexOf("Characteristics")).ok'),true);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.deepEqual(Array.from(run('CHARS.map(c=>S.chars[c])')),[7,8,12,9,13,10,11]);
 assert.match(run('stepChars()'),/Assign in rolled order/);
});
test('Core pp.11–12 all standard skill formulas and Anathaym base example',()=>{
 reset();run('S.chars={STR:11,CON:13,SIZ:10,DEX:16,INT:14,POW:7,CHA:9};');
 const expected={Athletics:27,Boating:24,Brawn:21,Conceal:23,Customs:28,Dance:25,Deceit:23,Drive:23,Endurance:26,Evade:32,'First Aid':30,Influence:18,Insight:21,Locale:28,'Native Tongue':23,Perception:21,Ride:23,Sing:16,Stealth:30,Swim:24,Unarmed:27,Willpower:14};
 const formulas={Athletics:"STR+DEX",Boating:"STR+CON",Brawn:"STR+SIZ",Conceal:"DEX+POW",Customs:"INTx2",Dance:"DEX+CHA",Deceit:"INT+CHA",Drive:"DEX+POW",Endurance:"CONx2",Evade:"DEXx2","First Aid":"INT+DEX",Influence:"CHAx2",Insight:"INT+POW",Locale:"INTx2","Native Tongue":"INT+CHA",Perception:"INT+POW",Ride:"DEX+POW",Sing:"CHA+POW",Stealth:"DEX+INT",Swim:"STR+CON",Unarmed:"STR+DEX",Willpower:"POWx2"};
 assert.equal(run('STD.length'),Object.keys(expected).length);
 for(const [name,formula] of Object.entries(formulas)){ctx.skillName=name;assert.equal(run('STD_MAP[skillName]'),formula,name);}
 for(const [name,value] of Object.entries(expected)){ctx.skillName=name;assert.equal(run('entryMap()["std:"+skillName].base'),value,name);}
 run('S.cultStyleOn=true;S.cultStyleName="Guard";');assert.equal(run('entryMap()["style:cult"].base'),27);
 assert.equal(run('finalPct("std:Customs")'),68);assert.equal(run('finalPct("std:Native Tongue")'),63);
});
test('Core p.8 roll assignment rejects reused and invalid pool indices without losing existing values',()=>{
 reset();run('S.poolA=[7,8,9,10,11];S.poolB=[12,13];APP.assign("STR",0);APP.assign("CON",1);');
 run('APP.assign("CON",0);');assert.equal(run('S.chars.CON'),8);assert.equal(run('S.assignA.CON'),1);
 run('APP.assign("CON",99);APP.assign("STR",-1);APP.assign("NOT_A_CHAR",0);');assert.equal(run('S.chars.CON'),8);assert.equal(run('S.chars.STR'),7);
 run('APP.assign("SIZ",0);APP.assign("INT",0);');assert.equal(run('S.chars.SIZ'),12);assert.equal(run('S.chars.INT'),12);
 // INT retains its prior independent value when an invalid selection is rejected.
 assert.equal(run('S.assignB.INT'),undefined);
});
test('each culture and published career can coexist and retain its eligible standard skills',()=>{
 const cultures=Array.from(run('Object.keys(CULTURES)')),careers=Array.from(run('Object.keys(CAREERS)'));
 assert.equal(cultures.length,4);assert.equal(careers.length,24);
 for(const culture of cultures)for(const career of careers){
  reset();ctx.culture=culture;ctx.career=career;run('APP.pickCulture(culture);APP.pickCareer(career);');
  assert.equal(run('S.culture'),culture);assert.equal(run('S.career'),career);
  assert.equal(run('CULTURES[culture].std.every(n=>cultureReqKeys().includes("std:"+n))'),true,`${culture} cultural skills`);
  assert.equal(run('CAREERS[career].std.every(n=>careerKeys().includes("std:"+n))'),true,`${career} career skills`);
  assert.equal(run('S.carStyles.length'),run('CAREERS[career].styleSlots.length'));
 }
});
test('Core pp.38,77,79: hardest task, encumbrance or fatigue grade applies',()=>{
 reset();run('ACTIVE_GRADE="hard";S.inventory=[{name:"Load",qty:1,enc:25}]');
 assert.equal(run('gradeForEntry("std:Athletics")'),'hard');
 run('S.inventory[0].enc=37');assert.equal(run('gradeForEntry("std:Athletics")'),'formidable');
 run('S.inventory[0].enc=25;S.play.fatigue="Wearied"');assert.equal(run('gradeForEntry("std:Athletics")'),'formidable');
 run('S.play.fatigue="Fresh"');assert.equal(run('gradeForEntry("std:Willpower")'),'hard');
 run('ACTIVE_GRADE="standard"');assert.equal(run('gradeForEntry("std:Willpower")'),'standard');
});
test('Core p.70: armour reduces running and sprinting but not walking',()=>{
 reset();run('S.xp.bonus["std:Athletics"]=26');const before=run('moveGaits()');
 run('S.armor.Head="Half Plate (hoplite plate)"');const penalty=run('armourPenaltyToInit()');assert(penalty>0);
 const after=run('moveGaits()');assert.equal(after.walk,before.walk);assert.equal(after.run,before.run-penalty);assert.equal(after.sprint,before.sprint-penalty);
});
test('Core p.79: immobilized characters cannot run or sprint from Athletics',()=>{
 reset();run('S.xp.bonus["std:Athletics"]=75;S.play.fatigue="Incapacitated"');
 assert.equal(run('moveGaits().walk'),0);assert.equal(run('moveGaits().run'),null);assert.equal(run('moveGaits().sprint'),null);
});
test('Core p.77: twenty zero-ENC items count as one ENC',()=>{
 reset();run('S.inventory=[{name:"Arrow",qty:19,enc:0}]');assert.equal(run('gearEncTotal()'),0);
 run('S.inventory[0].qty=20');assert.equal(run('gearEncTotal()'),1);
 run('S.inventory.push({name:"Needle",qty:20,enc:0},{name:"",qty:20,enc:0},{name:"Unknown",qty:2,enc:null})');
 assert.equal(run('gearEncTotal()'),2);
});
test('Core p.110: damage preserves deep negative HP through editing, saving and recovery',()=>{
 reset();run('S.play.hp.Head=5');ctx.document.querySelector=()=>({value:'20'});
 run('APP.playApplyDamage("Head")');assert.equal(run('playCurHP("Head")'),-15);
 assert.equal(run('playHPState("Head").cls'),'major');
 run('APP.playSetHP("Head",-15);APP.playQuickDamage("Head",3)');assert.equal(run('playCurHP("Head")'),-18);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState()`);
 assert.equal(run('playCurHP("Head")'),-18);run('APP.playNaturalRecovery("Head",0,true)');
 assert.equal(run('playCurHP("Head")'),-16);ctx.document.querySelector=()=>null;
});
test('Core p.100: Pin Down stacks and Entangle does not',()=>{
 assert.equal(run('SPECIAL_EFFECTS.find(e=>e[0]==="Pin Down")[5]'),1);
 assert.equal(run('SPECIAL_EFFECTS.find(e=>e[0]==="Entangle")[5]'),0);
});
test('Core pp.70–71: ageing records failures using the proper table, persists and recalculates',()=>{
 reset();run('S.age.years=55;S.age.category="senior";');const base=run('finalPct("std:Athletics")');
 run('APP.recordAgeing("40","failure","1","2","failure","4","3",true)');
 assert.equal(run('effectiveChars().STR'),10);assert.equal(run('effectiveChars().POW'),9);
 assert.equal(run('S.chars.STR'),12);assert.equal(run('finalPct("std:Athletics")'),base-2);
 assert.equal(run('S.age.ageingEvents[0].band'),"Early Middle Age");
 run('APP.recordAgeing("40","success","","","success","","",true)');assert.equal(run('S.age.ageingEvents.length'),1);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState()`);
 assert.equal(run('effectiveChars().STR'),10);assert.equal(run('effectiveChars(JSON.parse(JSON.stringify(S))).POW'),9);
 run('APP.recordAgeing("50","success","","","success","","",true)');assert.equal(run('S.age.ageingEvents.length'),2);
 run('APP.undoAgeing()');assert.equal(run('S.age.ageingEvents.length'),1);
});
test('ageing checks validate outcomes, bands, GM confirmation and terminal frailty',()=>{
 reset();run('S.age.years=45;S.chars.STR=2;');
 run('APP.recordAgeing("50","success","","","success","","",true);APP.recordAgeing("40","failure","7","3","success","","",true);APP.recordAgeing("40","failure","1","3","success","","",false)');
 assert.equal(run('(S.age.ageingEvents||[]).length'),0);
 run('VIEW_ONLY=true;APP.recordAgeing("40","failure","1","3","success","","",true)');assert.equal(run('(S.age.ageingEvents||[]).length'),0);
 run('VIEW_ONLY=false;APP.recordAgeing("40","failure","1","3","success","","",true)');
 assert.equal(run('effectiveChars().STR'),0);assert.equal(run('S.age.ageingEvents[0].terminal'),true);assert.match(run('ageingReviewBlock()'),/terminal frailty/);
});
test('legacy saves retain natural scores and older ageing notes without automatic losses',()=>{
 reset();run('S.chars.STR=21;delete S.xp.characteristics;S.age.years=65;S.age.ageingReview={status:"resolved",note:"Already handled"};normalizeState()');
 assert.equal(run('effectiveChars().STR'),21);assert.equal(run('S.age.ageingEvents.length'),0);
});
test('all ageing effect table rolls select the correct characteristics',()=>{
 for(const [roll,physical,mental] of [[1,'STR','INT'],[2,'STR','INT'],[3,'CON','POW'],[4,'CON','POW'],[5,'DEX','CHA'],[6,'DEX','CHA']]){
  reset();run(`S.age.years=40;APP.recordAgeing("40","failure","${roll}","1","failure","${roll}","1",true)`);
  assert.equal(run('S.age.ageingEvents[0].effects[0].key'),physical);
  assert.equal(run('S.age.ageingEvents[0].effects[1].key'),mental);
 }
});
test('ageing loss can be counteracted by training without exceeding the species maximum',()=>{
 reset();run('S.age.years=40;S.chars.STR=18;S.xp.pool=3;APP.recordAgeing("40","failure","1","3","success","","",true)');
 assert.equal(run('effectiveChars().STR'),15);
 run('APP.xpCharacteristicTrain("STR",true)');assert.equal(run('effectiveChars().STR'),17);
 run('APP.xpCharacteristicTrain("STR",true)');assert.equal(run('effectiveChars().STR'),18);
});
test('Core pp.72–73: characteristic advancement maintains separate natural values and derived stats',()=>{
 reset();run('S.xp.pool=20;');const skill=run('finalPct("std:Athletics")');
 run('APP.xpCharacteristicTrain("STR",true)');
 assert.equal(run('S.chars.STR'),12);assert.equal(run('effectiveChars().STR'),14);assert.equal(run('finalPct("std:Athletics")'),skill+2);assert.equal(run('S.xp.pool'),19);
 run('APP.xpAward(3,false)');assert.equal(run('S.xp.pool'),21);
 run('APP.xpCharacteristicPermanent("DEX",true)');assert.equal(run('effectiveChars().DEX'),15);assert.equal(run('S.xp.pool'),9);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState()`);
 assert.equal(run('effectiveChars().STR'),14);assert.equal(run('effectiveChars().DEX'),15);
 assert.equal(run('effectiveChars(JSON.parse(JSON.stringify(S))).STR'),14);
 run('APP.xpCharacteristicToggle(0);APP.xpAward(3,false)');
 assert.equal(run('effectiveChars().STR'),12);assert.equal(run('effectiveChars().DEX'),15);assert.equal(run('S.xp.pool'),12);
});
test('characteristic improvement respects caps, permission, award maintenance and creation scores',()=>{
 reset();run('S.xp.pool=20;S.chars.STR=17;APP.xpCharacteristicTrain("STR",true)');
 assert.equal(run('effectiveChars().STR'),18);assert.equal(run('S.xp.characteristics.training[0].bonus'),1);
 run('APP.xpCharacteristicTrain("STR",true);APP.xpCharacteristicPermanent("SIZ",true)');assert.equal(run('S.xp.pool'),19);
 run('VIEW_ONLY=true;APP.xpCharacteristicToggle(0);APP.xpCharacteristicPermanent("CON",true);APP.xpAward(3,false)');
 assert.equal(run('S.xp.pool'),19);assert.equal(run('S.xp.characteristics.training[0].active'),true);
 run('VIEW_ONLY=false;S.xp.characteristics.training.push({key:"DEX",bonus:2,active:true});APP.xpAward(1,false)');
 assert.equal(run('S.xp.pool'),19);assert.equal(run('effectiveChars().DEX'),16);
 run('S.charMode="pb";S.chars={STR:12,CON:11,SIZ:12,DEX:11,INT:12,POW:11,CHA:11};');
 assert.equal(run('validate(currentSteps().indexOf("Characteristics")).ok'),true);
});
test('atrophy preserves damage when CON and location maximum decrease',()=>{
 reset();run('S.xp.pool=2;S.chars.CON=10;APP.xpCharacteristicTrain("CON",true);S.play.hp.Head=-9;APP.xpCharacteristicToggle(0);APP.xpAward(2,false)');
 assert.equal(run('effectiveChars().CON'),10);assert.equal(run('playCurHP("Head")'),-9);
});
test('stopped training can resume and loses one step per characteristic on an award',()=>{
 reset();run('S.xp.pool=8;APP.xpCharacteristicTrain("STR",true);APP.xpCharacteristicTrain("STR",true);APP.xpCharacteristicToggle(0);APP.xpCharacteristicToggle(1)');
 run('APP.xpCharacteristicToggle(0);APP.xpAward(3,false)');
 assert.equal(run('S.xp.characteristics.training.length'),1);assert.equal(run('S.xp.characteristics.training[0].active'),true);
 assert.equal(run('effectiveChars().STR'),14);assert.equal(run('S.xp.pool'),8);
 run('APP.xpCharacteristicToggle(0);APP.xpAward(3,false)');assert.equal(run('effectiveChars().STR'),12);
});
test('Core p.72: CHA modifier is explicit, signed, and read-only guarded',()=>{
 for(const [cha,apply,expected] of [[13,false,3],[13,true,4],[6,false,3],[6,true,2]]){
  reset();run(`S.chars.CHA=${cha};APP.xpAward(3,${apply});`);assert.equal(run('S.xp.pool'),expected);
 }
 reset();run('S.xp.pool=5;APP.xpAward(-1,true);');assert.equal(run('S.xp.pool'),4);
 run('VIEW_ONLY=true;APP.xpAward(3,true);');assert.equal(run('S.xp.pool'),4);
 assert.doesNotMatch(run('xpModalHtml()'),/id="xpApplyModifier"[^>]*checked/);
});
test('Core p.72: repeated skill improvement spends rolls against updated percent',()=>{
 reset();run('S.xp.pool=2;S.xp.usedThisRun=["std:Athletics"];Math.random=()=>0;');
 const start=run('finalPct("std:Athletics")');
 run('APP.xpSpend("std:Athletics");APP.xpSpend("std:Athletics");');
 assert.equal(run('S.xp.pool'),0);assert.equal(run('finalPct("std:Athletics")'),start+2);
 assert.equal(run('S.xp.history[0].target'),start+1);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('S.xp.pool'),0);assert.equal(run('S.xp.bonus["std:Athletics"]'),2);
});
test('view-only experience flags and fumble improvement cannot mutate a character',()=>{
 reset();run('S.xp.fumbled=["std:Athletics"];S.xp.checked=["std:Athletics"];VIEW_ONLY=true;');
 const before=run('JSON.stringify(S.xp)');
 run('APP.xpToggleFumble("std:Athletics");APP.xpToggleChecked("std:Athletics");APP.xpApplyFumble("std:Athletics");');
 assert.equal(run('JSON.stringify(S.xp)'),before);
 run('VIEW_ONLY=false;APP.xpApplyFumble("std:Athletics")');
 assert.equal(run('S.xp.bonus["std:Athletics"]'),1);
 assert.equal(run('S.xp.fumbled.length'),0);
});
test('Core p.72: Passion improvement spends rolls, persists, and respects access',()=>{
 reset();run('S.passions=[{name:"Loyalty",type:"org"},{name:"Love",type:"species"}];S.xp.pool=2;Math.random=()=>0;');
 const start=run('passionVal(S.passions[0])');
 assert.match(run('xpModalHtml()'),/Passions/);
 run('APP.xpSpendPassion(0);APP.xpSpendPassion(0);');
 assert.equal(run('S.xp.pool'),0);assert.equal(run('passionVal(S.passions[0])'),start+2);
 assert.equal(run('S.xp.history[0].target'),start+1);
 assert.equal(run('passionVal(S.passions[1])'),54);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('passionVal(S.passions[0])'),start+2);
 run('S.xp.pool=1;VIEW_ONLY=true;APP.xpSpendPassion(0);');assert.equal(run('S.xp.pool'),1);
 run('VIEW_ONLY=false;APP.xpSpendPassion(99);');assert.equal(run('S.xp.pool'),1);
 run('Math.random=()=>0.99;APP.xpSpendPassion(1);');assert.equal(run('passionVal(S.passions[1])'),59);
});
test('Core p.73: learn professional skills without altering creation allocations',()=>{
 reset();run('S.xp.pool=7;');const allocations=run('JSON.stringify(S.alloc)');
 run('APP.xpLearnProfessional("Lore","History",false)');assert.equal(run('S.xp.pool'),7);
 run('APP.xpLearnProfessional("Lore","",true)');assert.equal(run('S.xp.pool'),7);
 run('APP.xpLearnProfessional("Lore","History",true)');
 assert.equal(run('S.xp.pool'),4);assert.equal(run('finalPct(profKey("Lore","History"))'),24);
 assert.equal(run('JSON.stringify(S.alloc)'),allocations);assert.match(run('xpModalHtml()'),/learned for 3 Experience Rolls/);
 run('APP.xpLearnProfessional("Lore"," history ",true)');assert.equal(run('S.xp.pool'),4);
 run('APP.xpLearnProfessional("Lore","Nature",true)');assert.equal(run('S.xp.pool'),1);
 run('APP.xpLearnProfessional("Healing","",true)');assert.equal(run('S.xp.pool'),1);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('acquiredProfs().filter(p=>p.name==="Lore").length'),2);
 assert.equal(run('finalPct(profKey("Lore","History"))'),24);
 run('S.xp.pool=3;VIEW_ONLY=true;APP.xpLearnProfessional("Healing","",true)');assert.equal(run('S.xp.pool'),3);
 run('VIEW_ONLY=false;APP.xpLearnProfessional("Healing","",true)');assert.equal(run('finalPct(profKey("Healing",""))'),24);
 run('S.xp.pool=1;Math.random=()=>0;APP.xpSpend(profKey("Healing",""))');assert.equal(run('finalPct(profKey("Healing",""))'),25);
 reset();run('delete S.xp.learnedProfs;normalizeState()');assert.equal(run('S.xp.learnedProfs.length'),0);
});
test('Core p.73: mentor training steps, repeat gate, and persistence',()=>{
 reset();run('Math.random=()=>0;S.xp.pool=2;');
 for(const [diff,sides,bonus] of [[21,2,0],[30,2,0],[31,3,0],[40,3,0],[41,4,0],[51,6,0],[61,6,1],[100,6,4],[101,6,5]]){
  assert.equal(run(`trainingDie(trainingStep(${diff},"trainer")).sides`),sides);
  assert.equal(run(`trainingDie(trainingStep(${diff},"trainer")).bonus`),bonus);
 }
 assert.equal(run('trainingStep(20,"trainer")'),null);
 assert.equal(run('trainingStep(21,"critical")'),2);
 assert.equal(run('trainingDie(trainingStep(21,"fumble")).sides'),0);
 run('APP.xpTrain("std:Athletics",46,"trainer",true)');
 assert.equal(run('finalPct("std:Athletics")'),26);assert.equal(run('S.xp.pool'),2);
 run('APP.xpTrain("std:Athletics",47,"trainer",false)');assert.equal(run('finalPct("std:Athletics")'),26);
 run('APP.xpTrain("std:Athletics",47,"trainer",true)');assert.equal(run('finalPct("std:Athletics")'),27);
 assert.equal(run('S.xp.pool'),2);assert.equal(run('S.xp.trainingPending.length'),1);
 run('APP.xpTrain("std:Athletics",60,"trainer",true)');assert.equal(run('finalPct("std:Athletics")'),27);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('S.xp.trainingPending[0]'),'std:Athletics');
 run('APP.xpSpend("std:Athletics")');assert.equal(run('S.xp.trainingPending.length'),0);
 run('APP.xpTrain("std:Athletics",60,"trainer",true)');assert.equal(run('S.xp.trainingPending.length'),1);
 run('VIEW_ONLY=true;APP.xpTrain("std:Healing",100,"trainer",true)');assert.equal(run('S.xp.trainingPending.length'),1);
 reset();run('Math.random=()=>0;APP.xpTrain("std:Athletics",47,"fumble",true)');
 assert.equal(run('finalPct("std:Athletics")'),26);assert.equal(run('S.xp.trainingPending.length'),1);
 assert.match(run('xpModalHtml()'),/Train with a mentor/);
 reset();run('delete S.xp.trainingPending;normalizeState()');assert.equal(run('S.xp.trainingPending.length'),0);
});
test('Core p.82: GM-directed Passion changes persist without spending experience',()=>{
 reset();run('S.passions=[{name:"Loyalty",type:"org"},{name:"Hope",type:"species"}];S.xp.pool=2;');
 const start=run('passionVal(S.passions[0])');
 run('APP.adjustPassion(0,"8");APP.adjustPassion(0,"-3");');
 assert.equal(run('passionVal(S.passions[0])'),start+5);assert.equal(run('S.xp.pool'),2);
 assert.match(run('xpModalHtml()'),/manual change/);
 run('APP.adjustPassion(0,"-999");APP.adjustPassion(0,"1.5");APP.adjustPassion(0,"");APP.adjustPassion(9,"1");');
 assert.equal(run('passionVal(S.passions[0])'),start+5);
 run('VIEW_ONLY=true;APP.adjustPassion(0,"5");');assert.equal(run('passionVal(S.passions[0])'),start+5);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('passionVal(S.passions[0])'),start+5);assert.equal(run('passionVal(S.passions[1])'),54);
});
test('Core p.118: starting magic guidance uses the correct skill and preserves records',()=>{
 reset();run('var oldMagicSkillPct=magicSkillPct;magicSkillPct=n=>n==="Devotion"?41:n==="Exhort"?80:40;S.magic.known=[{tradition:"theism",name:"A"},{tradition:"theism",name:"B"},{tradition:"theism",name:"C"},{tradition:"theism",name:"D"}];');
 const html=run('knownMagicEditor(MAGIC_TRADITIONS.find(t=>t.key==="theism"))');
 assert.match(html,/Devotion: 3 at 41%/);assert.match(html,/4 named abilities/);assert.match(html,/cult rank/);
 assert.equal(run('S.magic.known.length'),4);
 assert.match(run('knownMagicEditor(MAGIC_TRADITIONS.find(t=>t.key==="sorcery"))'),/Invocation: 2 at 40%/);
 run('magicSkillPct=oldMagicSkillPct;');
});
test('Core p.118: starting magic review is explicit, persistent and becomes stale',()=>{
 reset();run('var previousViewOnlyBlock=viewOnlyBlock;viewOnlyBlock=()=>false;S.magic.known=[{tradition:"theism",name:"Bless"}]');
 assert.equal(run('S.magic.startingReviewMode'),undefined);
 run('APP.startingMagicMode("new");APP.startingMagicConfirm()');
 assert.equal(run('S.magic.startingReviewSignature===startingMagicReviewSignature()'),true);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState()`);
 assert.equal(run('S.magic.startingReviewSignature===startingMagicReviewSignature()'),true);
 run('S.magic.known[0].name="Other"');assert.equal(run('S.magic.startingReviewSignature===startingMagicReviewSignature()'),false);
 run('APP.startingMagicMode("experienced")');assert.equal(run('S.magic.known.length'),1);run('viewOnlyBlock=previousViewOnlyBlock');
});
test('Core p.180: explicitly confirmed pool rank limits are non-destructive',()=>{
 reset();run('S.magic.devotional=0;APP.devotionalRank("initiate");');
 assert.equal(run('devotionalRankLimit()'),3);
 run('APP.devotional("4")');assert.equal(run('devotionalMax()'),0);assert.match(run('DEVOTIONAL_MSG'),/rank limit/);
 run('APP.devotional("3");S.magic.devotional=12;APP.devotionalRank("initiate");');
 assert.equal(run('devotionalMax()'),12);assert.match(run('knownMagicEditor(MAGIC_TRADITIONS.find(t=>t.key==="theism"))'),/points are preserved/);
 run('APP.devotional("9");');assert.equal(run('devotionalMax()'),9);
 run('S.chars.POW=13;');assert.equal(run('devotionalRankLimit()'),3.25);
 assert.match(run('knownMagicEditor(MAGIC_TRADITIONS.find(t=>t.key==="theism"))'),/confirm rounding/);
 run('S.chars.POW=12;APP.devotionalRank("lay");');assert.equal(run('devotionalRankLimit()'),0);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('S.magic.devotionalRank'),"lay");assert.equal(run('devotionalMax()'),9);
});
test('Core p.180: confirmed donation transfers personal points without adding to the old pool',()=>{
 reset();run('S.chars.POW=12;S.magic.devotionalRank="highpriest";S.magic.devotional=12;S.magic.devotionalUsed=9;S.play.magic=12');
 run('APP.devotionalDonate(7,false)');assert.equal(run('playCurMagic()'),12);
 run('APP.devotionalDonate(7,true)');assert.equal(run('playCurMagic()'),5);assert.equal(run('devotionalCur()'),7);
 run('APP.devotionalDonate(3,true)');assert.equal(run('playCurMagic()'),5);assert.equal(run('devotionalCur()'),7);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState()`);assert.equal(run('devotionalCur()'),7);
 run('VIEW_ONLY=true;APP.devotionalDonate(8,true)');assert.equal(run('playCurMagic()'),5);
});
test('Core pp.34,70–71: ageing review tracks human bands without changing characteristics',()=>{
 reset();run('S.age.category="senior";S.age.years=44;');
 assert.equal(run('humanAgeingInfo().grade'),"Easy");assert.match(run('ageingReviewBlock()'),/not been reviewed/);
 const chars=run('JSON.stringify(S.chars)');run('APP.ageingReview("resolved","Rolled at the table")');
 assert.match(run('ageingReviewBlock()'),/Rolled at the table/);assert.equal(run('JSON.stringify(S.chars)'),chars);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.match(run('ageingReviewBlock()'),/Rolled at the table/);
 run('S.age.years=50');assert.equal(run('humanAgeingInfo().grade'),"Standard");assert.match(run('ageingReviewBlock()'),/not been reviewed/);
 for(const [age,grade] of [[39,null],[40,"Easy"],[60,"Hard"],[70,"Formidable"],[80,"Herculean"],[90,"Hopeless"]]){
  run(`S.age.years=${age}`);assert.equal(run('humanAgeingInfo()?.grade||null'),grade);
 }
 run('S.species="other";S.age.category="senior";');assert.equal(run('humanAgeingInfo()'),null);assert.match(run('ageingReviewBlock()'),/may not apply/);
});
test('Core pp.70–71: recorded ageing applies both losses once and survives reload',()=>{
 reset();run('S.age.years=54');
 const base=run('finalPct("std:Brawn")');
 run('APP.recordAgeing(40,"failure",2,2,"failure",4,1,true)');
 assert.equal(run('effectiveChars().STR'),10);
 assert.equal(run('effectiveChars().POW'),11);
 assert.equal(run('S.chars.STR'),12);
 assert.equal(run('finalPct("std:Brawn")'),base-2);
 run('APP.recordAgeing(40,"failure",2,2,"failure",4,1,true)');
 assert.equal(run('S.age.ageingEvents.length'),1);
 run('S=JSON.parse(JSON.stringify(S));normalizeState()');
 assert.equal(run('effectiveChars().STR'),10);
 run('APP.undoAgeing()');
 assert.equal(run('finalPct("std:Brawn")'),base);
});
test('Core p.58: legacy armour migrates and limbs can differ without changing totals',()=>{
 reset();run('S.armor={Head:"None",Chest:"None",Abdomen:"None","Each Arm":"Half Plate (hoplite plate)","Each Leg":"None"};normalizeState();');
 const right=run('S.armor["Right Arm"]');assert.equal(run('S.armor["Left Arm"]'),right);
 const enc=run('armorEncTotal()'),cost=run('armorCostTotal()');run('normalizeState()');
 assert.equal(enc,4);assert.equal(cost,1000);assert.equal(run('armourPenaltyToInit()'),2);
 assert.equal(run('armorEncTotal()'),enc);assert.equal(run('armorCostTotal()'),cost);
 run('APP.setArmor("Right Arm","None");');assert.equal(run('armorApAt("Right Arm")'),0);assert.equal(run('S.armor["Left Arm"]'),right);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('armorApAt("Right Arm")'),0);assert.equal(run('S.armor["Left Arm"]'),right);
 run('APP.setArmor("Each Arm","None")');assert.equal(run('armorApAt("Left Arm")'),0);
 run('APP.setArmor("Right Arm","Half Plate (hoplite plate)");S.play.hp["Right Arm"]=4;S.play.hp["Left Arm"]=4;');
 ctx.document.querySelector=()=>({value:"4"});run('APP.playApplyDamage("Right Arm");APP.playApplyDamage("Left Arm");');
 assert.equal(run('S.play.hp["Right Arm"]'),4);assert.equal(run('S.play.hp["Left Arm"]'),0);ctx.document.querySelector=()=>null;
});
test('Core pp.94–95: parry calculation needs explicit result and compares all sizes',()=>{
 reset();const sizes=['Small','Medium','Large','Huge','Enormous'];
 for(let a=0;a<sizes.length;a++)for(let d=0;d<sizes.length;d++){
  const got=run(`parryDamage(8,"${sizes[a]}","${sizes[d]}","success").remaining`);
  assert.equal(got,a<=d?0:a===d+1?4:8);
 }
 assert.equal(run('parryDamage(7,"Huge","Large","success").remaining'),3.5);
 assert.equal(run('parryDamage(7,"Huge","Huge","failed").remaining'),7);
 for(const result of ["none","failed"])assert.equal(run(`parryDamage(7,"","","${result}").remaining`),7);
 assert.equal(run('parryDamage(7,"","","success")'),null);
 assert.equal(run('parryDamage(7,"Huge","Huge","none").remaining'),7);
 assert.equal(run('parryDamage(7,"Huge","Huge","")'),null);
 assert.equal(run('parryDamage(-1,"Huge","Large","success")'),null);
 run('S.play.selectedLoc="Head"');assert.match(run('pmLocDetail()'),/Parry damage calculator/);
});
test('Core p.110: wound incident records track hits and survive healing and reload',()=>{
 reset();run('S.play.hp.Head=3;');ctx.document.querySelector=()=>({value:"3"});
 run('APP.playApplyDamage("Head")');assert.equal(run('S.play.woundEvents.length'),1);
 assert.equal(run('S.play.woundEvents[0].severity'),'serious');assert.equal(run('S.play.woundEvents[0].damage'),3);
 assert.match(run('pmWoundEvents("Head")'),/unconscious for 3 minutes/);
 run('APP.woundEventUpdate(0,"outcome","failure");APP.woundEventUpdate(0,"interruptionTurns","2");APP.woundEventUpdate(0,"notes","attack 46");APP.woundEventUpdate(0,"treated",true);');
 run('APP.playApplyDamage("Head")');assert.equal(run('S.play.woundEvents.length'),2);
 assert.equal(run('S.play.woundEvents[0].outcome'),'failure');assert.equal(run('S.play.woundEvents[0].interruptionTurns'),2);
 run('APP.playSetHP("Head",2);APP.woundEventResolve(0)');assert.equal(run('S.play.woundEvents[0].resolved'),true);
 const saved=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(saved)});normalizeState();`);
 assert.equal(run('S.play.woundEvents[0].notes'),'attack 46');assert.equal(run('S.play.woundEvents[0].treated'),true);
 run('APP.woundEventReopen(0);VIEW_ONLY=true;APP.woundEventUpdate(0,"notes","changed")');assert.equal(run('S.play.woundEvents[0].notes'),'attack 46');
 reset();run('S.play.hp["Right Arm"]=0;APP.playQuickDamage("Right Arm",1)');assert.equal(run('S.play.woundEvents.length'),0);
 run('delete S.play.woundEvents;normalizeState()');assert.equal(run('S.play.woundEvents.length'),0);ctx.document.querySelector=()=>null;
});
test('Core p.110: wound overview shows unresolved recorded outcomes',()=>{
 reset();run('S.play.woundEvents=[{loc:"Head",severity:"serious",damage:4,outcome:"failure",resolved:false},{loc:"Right Arm",severity:"major",damage:6,outcome:"pending",treated:false,resolved:false}]');
 const html=run('pmWoundOverview()');assert.match(html,/Wound watch/);assert.match(html,/4 minutes/);assert.match(html,/Endurance check pending/);
 run('S.play.woundEvents[0].resolved=true');assert.doesNotMatch(run('pmWoundOverview()'),/4 minutes/);
 run('S.play.woundEvents[1].resolved=true');assert.equal(run('pmWoundOverview()'),"");
});
test('Core p.80: permanent injury maximum preserves deep wounds and recalculates thresholds',()=>{
 reset();const base=run('playMaxHP("Right Arm")');assert(base>=3);
 run('S.play.hp["Right Arm"]=-playMaxHP("Right Arm");');const deep=run('playCurHP("Right Arm")');
 run('APP.playSetMaxHP("Right Arm",2,false)');assert.equal(run('playMaxHP("Right Arm")'),base);
 run('APP.playSetMaxHP("Right Arm",2,true)');assert.equal(run('playMaxHP("Right Arm")'),2);assert.equal(run('playCurHP("Right Arm")'),deep);
 assert.equal(run('playHPState("Right Arm").cls'),'major');assert.equal(run('playMaxHP("Left Arm")'),base);
 assert.equal(run('charVitals(JSON.parse(JSON.stringify(S))).locs.find(x=>x.loc==="Right Arm").max'),2);
 run('S.play.selectedLoc="Right Arm"');assert.match(run('pmLocDetail()'),/Permanent injury: location maximum/);
 run('APP.playQuickDamage("Right Arm",1)');assert.equal(run('playCurHP("Right Arm")'),deep-1,'further damage must reduce a deep wound');
 run('APP.playNaturalRecovery("Right Arm",0,true)');assert.equal(run('playCurHP("Right Arm")'),deep+1);
 const save=run('JSON.stringify(S)');run(`S=JSON.parse(${JSON.stringify(save)});normalizeState()`);assert.equal(run('playMaxHP("Right Arm")'),2);
 run('VIEW_ONLY=true;APP.playClearMaxHP("Right Arm",true)');assert.equal(run('playMaxHP("Right Arm")'),2);
 run('VIEW_ONLY=false;APP.playClearMaxHP("Right Arm",true)');assert.equal(run('playMaxHP("Right Arm")'),base);
 reset();run('delete S.play.hpMaxOverride;normalizeState()');assert.equal(run('Object.keys(S.play.hpMaxOverride).length'),0);
});
test('Core p.80: natural recovery uses current severity and requires Major treatment',()=>{
 reset();run('S.play.hp.Head=0;');assert.equal(run('naturalRecoveryInfo("Head").interval'),"week");
 run('APP.playNaturalRecovery("Head",0,false)');assert.equal(run('S.play.hp.Head'),2);assert.equal(run('naturalRecoveryInfo("Head").interval'),"day");
 run('S.play.hp.Head=-playMaxHP("Head");');const before=run('S.play.hp.Head');
 assert.equal(run('naturalRecoveryInfo("Head").interval'),"month");run('APP.playNaturalRecovery("Head",0,false)');assert.equal(run('S.play.hp.Head'),before);
 run('APP.playNaturalRecovery("Head",1,true)');assert.equal(run('S.play.hp.Head'),before+1);
 run('VIEW_ONLY=true;APP.playNaturalRecovery("Head",0,true)');assert.equal(run('S.play.hp.Head'),before+1);
});
test('Core p.71: fatigue guidance distinguishes recovery causes',()=>{
 reset();run('S.play.fatigue="Tired";APP.playFatigueCause("blood");');assert.match(run('fatigueRecoveryText(S.play.fatigueCause)'),/day after bleeding stops/);
 run('APP.playFatigueCause("asphyxiation")');assert.match(run('fatigueRecoveryText(S.play.fatigueCause)'),/minute after it ends/);
 run('APP.playFatigueCause("exertion")');assert.match(run('fatigueRecoveryText(S.play.fatigueCause)'),/complete rest/);
});
test('Core pp.71,79,110: damage and recovery guidance',()=>{
 reset();run('S.play.fatigue="Winded";');
 assert.match(run('playWoundEffectText("Right Arm","serious")'),/1d3 turns/);
 assert.match(run('fatigueRecoveryText()'),/Physical exertion only/);
 assert.match(run('fatigueRecoveryText()'),/day after bleeding stops/);
 assert.match(run('fatigueRecoveryText()'),/minute after it ends/);
 run('S.play.selectedLoc="Right Arm";');assert.match(run('pmLocDetail("Right Arm")'),/after parry and other reductions, before armour/);
 run('S.cultStyleOn=true;S.cultStyleName="Guard";');
 assert.equal(run('allEntries().find(e=>e.key==="style:cult").base'),26);
 assert(!run('allEntries().find(e=>e.key==="style:cult").provisional'));
});
test('Changing allocated selections frees unavailable points, retaining shared skills',()=>{
 reset();run('S.culture="Civilised";S.cultProf=["Commerce",null,null];S.alloc.culture[profKey("Commerce","")]=10;S.alloc.bonus[profKey("Commerce","")]=8;APP.pickProf("cult",0,"Courtesy");');
 assert.equal(run('aGet("culture",profKey("Commerce",""))'),0);assert.equal(run('aGet("bonus",profKey("Commerce",""))'),0);
 run('S.carProf=["Courtesy",null,null];S.alloc.bonus[profKey("Courtesy","")]=9;APP.pickProf("cult",0,"Commerce");');
 assert.equal(run('aGet("bonus",profKey("Courtesy",""))'),9);
 run('S.hobby="Lore";S.hobbySpec="Local";S.alloc.bonus[profKey("Lore","Local")]=15;APP.hobbySpec("History");');
 assert.equal(run('aGet("bonus",profKey("Lore","Local"))'),0);
 run('S.qProf=["Commerce",null,null];S.alloc.quick[profKey("Commerce","")]=15;APP.pickProf("quick",0,"Courtesy");');
 assert.equal(run('aGet("quick",profKey("Commerce",""))'),0);
});
test('Legacy hidden points remain accessible for recovery without changing saves on load',()=>{
 reset();run('S.alloc.bonus["prof:Removed"]=12;normalizeState();');
 assert.equal(run('aSum("bonus")'),12);
 assert.match(run('allocTable("bonus",[],150,0,15,"")'),/Return points to pool/);
 run('APP.clearAllocation("bonus","prof:Removed");');assert.equal(run('aSum("bonus")'),0);
});
