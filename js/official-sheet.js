// The official Mythras character sheet (two A4 pages, from the Character
// Creation Workbook; used with the design studio's permission), filled in
// with the open character. This is what "Print sheet" prints. The page art
// is a greyscale image under absolutely positioned text; every position
// below is in PDF points (1/72 in) measured on the A4 page, so the CSS can
// lay each page out at 595.28pt × 841.89pt and print it 1:1.
//
// Positions are baselines unless noted. Rows on the sheet are 12pt apart
// (skills, equipment, weapons) or 24pt (characteristics, hit locations).
const OSHEET={
  pageW:595.28,pageH:841.89,
  img:["assets/sheet/mythras-sheet-1.png","assets/sheet/mythras-sheet-2.png"],
  blankPdf:"assets/sheet/mythras-character-sheet-blank.pdf",
  // Standard Skills and Resistances, in the sheet's printed order.
  stdRows:["Athletics","Boating","Conceal","Customs","Dance","Deceit","Drive","First Aid","Influence",
    "Insight","Locale","Perception","Ride","Sing","Stealth","Swim","Unarmed"],
  resRows:["Brawn","Endurance","Evade","Willpower"],
  hitRows:["Head","Left Arm","Right Arm","Chest","Abdomen","Left Leg","Right Leg"],
  fatigueRows:["Fresh","Winded","Tired","Wearied","Exhausted","Debilitated","Incapacitated","Semi-Conscious","Comatose","Dead"],
};
// Every length goes out in container-width units, so one layout serves the
// on-screen preview (any width) and the printed A4 page.
const oshU=v=>(v*100/OSHEET.pageW).toFixed(3)+"cqw";
// Text that fits its blank: shrink the type for long values (roughly 0.48em
// per character for the serif in use) down to a floor, then clip.
function oshText(x,y,w,text,size=8.5,cls=""){
  text=text==null?"":String(text);
  if(!text)return "";
  const fit=Math.max(5,Math.min(size,w/(text.length*0.48)));
  return '<span class="osh-t'+(cls?" "+cls:"")+'" style="left:'+oshU(x)+';top:'+oshU(y-fit*1.05)+';width:'+oshU(w)+';font-size:'+oshU(fit)+'">'+esc(text)+'</span>';
}
// Centred in a circle or box whose centre is (cx,cy).
function oshMid(cx,cy,text,size=10,w=24){
  text=text==null?"":String(text);
  if(!text)return "";
  const fit=Math.max(5,Math.min(size,w/(text.length*0.55)));
  return '<span class="osh-c" style="left:'+oshU(cx-w/2)+';top:'+oshU(cy-fit*0.62)+';width:'+oshU(w)+';font-size:'+oshU(fit)+'">'+esc(text)+'</span>';
}
// A block of wrapped lines inside a box (Notes, Cult Information).
function oshBlock(x,y,w,h,lines,size=7){
  lines=lines.filter(Boolean);
  if(!lines.length)return "";
  return '<div class="osh-b" style="left:'+oshU(x)+';top:'+oshU(y)+';width:'+oshU(w)+';height:'+oshU(h)+';font-size:'+oshU(size)+'">'
    +lines.map(l=>'<div>'+esc(l)+'</div>').join("")+'</div>';
}
function oshMark(cx,cy){return '<span class="osh-x" style="left:'+oshU(cx-5)+';top:'+oshU(cy-5)+';width:'+oshU(10)+';height:'+oshU(10)+';font-size:'+oshU(9)+'">&#10005;</span>';}
function oshRing(cx,cy){return '<span class="osh-ring" style="left:'+oshU(cx-7.5)+';top:'+oshU(cy-7.5)+';width:'+oshU(15)+';height:'+oshU(15)+'"></span>';}
const oshFormula=f=>f?String(f).replace(/x2$/," x2").replace(/\+/g," + "):"";
// "6/12" → ["6","12"]
const oshApHp=s=>{const m=String(s||"").split("/");return [m[0]||"",m[1]||""];};

// Everything the two pages show, as plain data. Kept apart from the HTML so
// tests can check the numbers without parsing markup.
function officialSheetData(){
  const c=effectiveChars(),em=entryMap(),es=allEntries();
  const pct=k=>em[k]?finalPct(k):"";
  const hw=heightWeight();
  const careerName=S.customCareer&&S.customCareer.isCustom?S.customCareer.name:S.career;
  const sp=speciesDef();
  const race=[sp&&sp.label&&sp.label!=="Human"?sp.label:"",S.culture||""].filter(Boolean).join(" / ");
  const initPenalty=armourPenaltyToInit();
  const languages=es.filter(e=>e.key.startsWith("prof:Language|")).sort((a,b)=>a.label.localeCompare(b.label));
  const profs=es.filter(e=>e.grp==="Professional"&&!e.key.startsWith("prof:Language|")).sort((a,b)=>a.label.localeCompare(b.label));
  const magicSkills=es.filter(e=>e.grp==="Magic").sort((a,b)=>a.label.localeCompare(b.label));
  const cm=S.cultMembership||{};
  const cult=[];
  if(cm.archetype){const a=cultArch();
    cult.push(cultDisplayName(cm)+(a?" — "+cultRankTitle(a,cm.rank||0):""));
    if(cm.rankYears)cult.push("Years at rank: "+cm.rankYears);
    const skills=(cm.cultSkills||[]).map(k=>em[k]&&em[k].label).filter(Boolean);
    if(skills.length)cult.push("Cult skills: "+skills.join(", "));
  }
  (S.cultFormer||[]).forEach(f=>{const a=CULT_ARCHETYPES.find(x=>x.key===f.archetype);cult.push("Former: "+(f.name||(a?a.name:""))+(f.left?" (left "+f.left+")":""));});
  const pools=[];
  for(let p=0;p<devotionalPoolCount();p++)if(devotionalMax(p)>0)pools.push({label:devotionalPoolLabel(p),cur:devotionalCur(p),max:devotionalMax(p)});
  const community=S.community||{};
  const notes=[
    S.archetype&&S.archetype!=="ordinary"&&ARCHETYPES[S.archetype]?"Tier: "+ARCHETYPES[S.archetype].label:"",
    community.family?"Family: "+community.family:"",
    community.parents?"Parents: "+community.parents:"",
    community.siblings?"Siblings: "+community.siblings:"",
    community.reputation?"Reputation: "+community.reputation:"",
    community.resources?"Resources: "+community.resources:"",
    ...familyRollLines(),
    community.household?"Marriage / children: "+community.household:"",
    ...householdRollLines(),
    community.partyTie?"Party tie: "+community.partyTie:"",
    ...coreBackgroundLines(),
    ...(community.connections||[]).map(x=>x.type+": "+x.name+(x.notes?" — "+x.notes:"")),
    S.concept.notes||"",
  ].filter(Boolean);
  const weapons=S.gearWeapons.map(n=>weaponByName(n)).filter(Boolean);
  const magic=allMagic().map(m=>{const t=MAGIC_TRAD_MAP[m.tradition]||{label:"",castSkill:"",pool:""};
    const cost=m.tradition==="folk"?"1 MP"
      :m.tradition==="sorcery"?(sorceryCost(m).mp+" MP, "+sorceryCost(m).turns+" turns")
      :m.tradition==="theism"?theismCostLabel(m)
      :m.tradition==="animism"?("POW "+(m.pow||0)+", CHA "+(m.cha||0))
      :((m.cost||0)+(t.pool==="devotional"?" pool":" MP"));
    return magicLabel(m)+" — "+t.label+" ("+t.castSkill+"), "+cost;});
  const fat=(S.play&&S.play.fatigue)||"Fresh";
  const mpMax=playMaxMagic(),mpCur=playCurMagic();
  return {
    name:S.concept.name||"",player:S.concept.player||"",race,gender:S.concept.gender||"",
    frame:S.concept.frame||"",homeland:S.concept.homeland||"",age:S.concept.age||"",
    height:hw?String(hw.ft).replace(/&prime;/g,"\u2032").replace(/&Prime;/g,"\u2033"):"",career:careerName||"",handed:S.concept.handed||"",weight:hw?hw.lb+" lb":"",
    socialClass:(S.money&&S.money.socialClass)||"",
    xpRolls:xpRollsAvailable(),
    money:S.money&&S.money.dice&&S.money.dice.length?{total:moneyTotal(),spent:moneySpentTotal(),left:moneyRemaining()}:null,
    notes,cult,pools,
    chars:["STR","CON","SIZ","DEX","INT","POW","CHA"].map(k=>c[k]),
    attrs:[apFinal(c.INT,c.DEX,S.fixedAP),dmCalc(c.STR,c.SIZ),(xpMod(c.CHA)>=0?"+":"")+xpMod(c.CHA),
      healRate(c.CON),initBonus(c.INT,c.DEX)-initPenalty,luckFinal(c.POW),moveText()],
    std:OSHEET.stdRows.map(n=>pct("std:"+n)),
    res:OSHEET.resRows.map(n=>pct("std:"+n)),
    profs:profs.map(e=>({label:e.label,formula:oshFormula(e.formula),pct:finalPct(e.key)})),
    native:pct("std:Native Tongue"),
    languages:languages.map(e=>({label:e.label.replace(/^Language\s*\(?|\)$/g,"")||e.label,pct:finalPct(e.key)})),
    magicSkills:magicSkills.map(e=>({label:e.label,formula:oshFormula(e.formula),pct:finalPct(e.key)})),
    mpMax,mpUsed:Math.max(0,mpMax-mpCur),
    passions:(S.passions||[]).map(p=>({label:p.name||"",pct:passionVal(p)})),
    magic,fatigue:OSHEET.fatigueRows.indexOf(fat),
    hit:(()=>{const rows=playHitLocationRows();const by=Object.fromEntries(rows.map(r=>[r[1],r[2]]));
      return OSHEET.hitRows.map(l=>{if(!(l in by))return null;const cur=playCurHP(l);return {max:by[l],cur:cur<by[l]?cur:""};});})(),
    creatureLocs:sp&&sp.creature?playHitLocationRows().map(r=>r[1]+" ("+r[0]+") "+r[2]+" HP"):null,
    armour:OSHEET.hitRows.map(l=>{const n=armorNameAt(l);return n&&n!=="None"?{name:armorDisplayName(l),ap:armorApAt(l),enc:armorPackedEncAt(l)}:null;}),
    armourEnc:ARMOR_LOCATIONS.reduce((a,l)=>a+armorPackedEncAt(l),0),armourPenalty:initPenalty,
    gear:(S.inventory||[]).filter(it=>it&&it.name).map(it=>({label:it.name+(it.qty>1?" ×"+it.qty:""),enc:inventoryItemEnc(it)})),
    encTotal:gearEncTotal(),burdened:c.STR*2,overloaded:c.STR*3,
    styles:stylesList().map(s=>{const d=S.styleDefs&&S.styleDefs[s.key]||{weapons:[],traits:[]};
      return {label:s.name,weapons:(d.weapons||[]).join(", "),traits:(d.traits||[]).join(", "),pct:finalPct(s.key)};}),
    unarmed:pct("std:Unarmed"),
    melee:weapons.filter(w=>w.group!=="Ranged"),ranged:weapons.filter(w=>w.group==="Ranged"),
  };
}
// Rows that don't fit on the paper are named, not silently dropped.
function oshMore(x,y,n){return n>0?oshText(x,y,120,"+ "+n+" more (see the site)",6,"osh-more"):"";}

function officialSheetPage1(d){
  let h="";
  h+=oshText(100,38,274,d.name,10)+oshText(75,54,127,d.player)+oshText(263,54,111,d.race)
   +oshText(59,70,51,d.gender)+oshText(147,70,55,d.frame)+oshText(251,70,123,d.homeland)
   +oshText(47,86,63,d.age)+oshText(151,86,51,d.height)+oshText(239,86,135,d.career)
   +oshText(75,102,35,d.handed)+oshText(151,102,51,d.weight)+oshText(259,102,115,d.socialClass);
  h+=oshMid(488,129,d.xpRolls,14,60);
  if(d.money)h+=oshBlock(407,166,165,40,["Starting: "+d.money.total+" sp","Spent: "+d.money.spent+" sp","Remaining: "+d.money.left+" sp"],8);
  h+=oshBlock(30,166,346,70,d.notes,6.8);
  h+=oshBlock(407,276,165,128,d.cult,7);
  if(d.pools.length){const p=d.pools[0];h+=oshMid(522,418,p.cur,8,24)+oshMid(554,418,p.max,8,24);
    if(d.pools.length>1)h+=oshBlock(407,388,165,14,d.pools.slice(1).map(x=>x.label+": "+x.cur+" / "+x.max),6.5);}
  d.chars.forEach((v,i)=>{h+=oshMid(152,271+i*24,v,11,19);});
  d.attrs.forEach((v,i)=>{h+=oshMid(340,271+i*24,v,10,19);});
  d.std.forEach((v,i)=>{h+=oshText(162,471+i*12,24,v,8.5,"osh-num");});
  d.res.forEach((v,i)=>{h+=oshText(162,711+i*12,24,v,8.5,"osh-num");});
  d.profs.slice(0,15).forEach((p,i)=>{const y=471+i*12;
    h+=oshText(217,y,70,p.label,7.5)+oshText(291,y,38,p.formula,6.5)+oshText(352,y,24,p.pct,8.5,"osh-num");});
  h+=oshMore(217,650,d.profs.length-15);
  h+=oshText(352,687,24,d.native,8.5,"osh-num");
  d.languages.slice(0,5).forEach((l,i)=>{const y=699+i*12;h+=oshText(217,y,108,l.label,7.5)+oshText(352,y,24,l.pct,8.5,"osh-num");});
  h+=oshMore(217,759,d.languages.length-5);
  d.magicSkills.slice(0,9).forEach((p,i)=>{const y=543+i*12;
    h+=oshText(407,y,70,p.label,7.5)+oshText(481,y,38,p.formula,6.5)+oshText(542,y,24,p.pct,8.5,"osh-num");});
  h+=oshMore(407,650,d.magicSkills.length-9);
  // Magic Points track: ring the maximum (0–30 printed); above 30, write it.
  const mpX=[409.5,424.5,440,455,470.5,485.5,500.5,515.5,531,546,563.5];
  const mpX2=[411,428,445,462,479,496,513,530,547,564];
  if(d.mpMax>=0&&d.mpMax<=10)h+=oshRing(mpX[d.mpMax],455.5);
  else if(d.mpMax<=20)h+=oshRing(mpX2[d.mpMax-11],467.5);
  else if(d.mpMax<=30)h+=oshRing(mpX2[d.mpMax-21],479.5);
  else h+=oshText(500,493,40,"Max "+d.mpMax,7);
  if(d.mpUsed)h+=oshText(542,493,24,d.mpUsed,8.5,"osh-num");
  d.passions.slice(0,6).forEach((p,i)=>{const y=687+i*12;h+=oshText(407,y,128,p.label,7.5)+oshText(542,y,24,p.pct,8.5,"osh-num");});
  h+=oshMore(407,759,d.passions.length-6);
  return h;
}
function officialSheetPage2(d){
  let h="";
  const magic=d.magic.slice(0,13);
  magic.forEach((m,i)=>{h+=oshText(30,46+i*16.1,342,m,7.5);});
  h+=oshMore(30,250,d.magic.length-13);
  if(d.fatigue>=0)h+=oshMark(412,60+d.fatigue*20);
  if(d.creatureLocs){h+=oshBlock(30,456,150,30,d.creatureLocs,5.5);}
  else d.hit.forEach((r,i)=>{if(!r)return;const y=296+i*24;h+=oshMid(135,y,r.max,11,19)+oshMid(171,y,r.cur,10,19);});
  d.armour.forEach((a,i)=>{if(!a)return;const y=296+i*24;
    h+=oshText(217,y+6,96,a.name,7.5)+oshMid(333,y-2,a.ap,9,16)+oshText(352,y+6,24,a.enc,8,"osh-num");});
  if(d.armourEnc)h+=oshText(352,471,24,d.armourEnc,8.5,"osh-num");
  if(d.armourPenalty)h+=oshText(352,483,24,"−"+d.armourPenalty,8.5,"osh-num");
  d.gear.slice(0,20).forEach((g,i)=>{const y=292+i*12;h+=oshText(407,y,128,g.label,7.5)+oshText(542,y,24,g.enc,8,"osh-num");});
  h+=oshMore(407,531,d.gear.length-20);
  h+=oshText(542,544,24,d.encTotal,8.5,"osh-num")+oshText(542,568,24,d.burdened,8.5,"osh-num")+oshText(542,580,24,d.overloaded,8.5,"osh-num");
  d.styles.slice(0,4).forEach((s,i)=>{const y=529+i*12;
    h+=oshText(27,y,96,s.label,7.5)+oshText(128,y,139,s.weapons,7)+oshText(274,y,49,s.traits,6.5)+oshText(353,y,24,s.pct,8.5,"osh-num");});
  h+=oshMore(128,590,d.styles.length-4);
  h+=oshText(353,577,24,d.unarmed,8.5,"osh-num");
  d.melee.slice(0,7).forEach((w,i)=>{const y=627+i*12,[ap,hp]=oshApHp(w.apHp);
    h+=oshText(27,y,96,w.name,7.5)+oshText(128,y,48,w.dmg,7.5)+oshText(181,y,24,w.size,7.5)+oshText(209,y,24,w.reach,7.5)
     +oshText(237,y,88,w.traits,6.5)+oshText(329,y,140,w.effects,6.5)+oshText(475,y,24,ap,7.5,"osh-num")
     +oshText(503,y,16,hp,7.5,"osh-num")+oshText(523,y,16,hp,7.5,"osh-num")+oshText(544,y,24,w.enc,7.5,"osh-num");});
  d.ranged.slice(0,3).forEach((w,i)=>{const y=723+i*12,[ap,hp]=oshApHp(w.apHp),r=String(w.range||"").split("/");
    h+=oshText(27,y,96,w.name,7.5)+oshText(128,y,48,w.dmg,7.5)+oshText(181,y,24,w.reach,7)+oshText(209,y,24,w.dmgMod,7)
     +oshText(237,y,18,r[0],6.5,"osh-num")+oshText(258,y,18,r[1],6.5,"osh-num")+oshText(279,y,18,r[2],6.5,"osh-num")
     +oshText(299,y,24,typeof w.load==="number"?w.load+" AP":"",7,"osh-num")+oshText(329,y,140,w.effects,6.5)
     +oshText(475,y,24,ap,7.5,"osh-num")+oshText(503,y,16,hp,7.5,"osh-num")+oshText(523,y,16,hp,7.5,"osh-num")+oshText(544,y,24,w.enc,7.5,"osh-num");});
  h+=oshMore(27,770,d.melee.length-7+Math.max(0,d.ranged.length-3));
  return h;
}
// blank=true prints the empty sheet (no character needed).
function officialSheetHtml(blank){
  const d=blank||!charsReady()?null:officialSheetData();
  const pages=[d?officialSheetPage1(d):"",d?officialSheetPage2(d):""];
  return '<div class="osheet" aria-label="Official Mythras character sheet">'
    +pages.map((inner,i)=>'<div class="osheet-page"><img class="osheet-art" src="'+OSHEET.img[i]+'" alt="" draggable="false">'+inner+'</div>').join("")
    +'</div>';
}
// The sheet view carries both versions, hidden on screen; print CSS shows the
// filled one, or the blank one while body has "osheet-blank". Ctrl+P on the
// sheet view therefore prints the filled official sheet too.
function officialSheetPrintHtml(){
  return '<div class="osheet-print" data-kind="filled">'+officialSheetHtml(false)+'</div>'
    +'<div class="osheet-print" data-kind="blank">'+officialSheetHtml(true)+'</div>';
}
function officialSheetControls(){
  return '<div class="exportrow osheet-actions">'
    +'<button class="nav" onclick="printOfficialSheet(false)">Print sheet</button>'
    +'<button class="nav" onclick="printOfficialSheet(true)">Print blank sheet</button>'
    +'<a class="nav" href="'+OSHEET.blankPdf+'" download>Blank sheet (PDF)</a></div>'
    +'<p class="note osheet-credit">Prints on the official Mythras character sheet (two A4 pages), filled in from this character. Sheet design and layout by Evelyn H., from the Mythras Character Creation Workbook; used with permission.</p>'
    +'<details class="osheet-preview"><summary>Preview the printed sheet</summary>'+officialSheetHtml(false)+'</details>';
}
function printOfficialSheet(blank){
  const body=document.body;
  body.classList.toggle("osheet-blank",!!blank);
  const done=()=>{body.classList.remove("osheet-blank");window.removeEventListener("afterprint",done);};
  window.addEventListener("afterprint",done);
  // Wait for the page art so the first print isn't blank behind the text.
  const imgs=[...document.querySelectorAll('.osheet-print[data-kind="'+(blank?"blank":"filled")+'"] img')];
  Promise.all(imgs.map(i=>i.complete?null:new Promise(r=>{i.onload=i.onerror=r;}))).then(()=>window.print());
}
