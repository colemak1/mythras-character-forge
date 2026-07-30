"use strict";
/* ================= RENDER: FRAME ================= */
function render(){
  // The Difficulty Grade popover lives outside #main (see toggleGradePop),
  // so it isn't wiped by the innerHTML rebuild below — close it explicitly
  // on every render so it can never go stale against whatever just changed
  // (e.g. a dropdown onchange that fires without a bubbling document click).
  if($("#gradePop"))APP._closeGradePop();
  // Party Board runs a realtime subscription + a couple of timers for as
  // long as it's on screen — tear all of that down the instant navigation
  // moves anywhere else, so a stale subscription never keeps polling/pushing
  // renders after the user has left the page.
  if(APPVIEW!=="board")boardUnsubscribe();
  if(APPVIEW==="menu"){renderMenuView();return;}
  if(APPVIEW==="library"){renderLibraryView();return;}
  if(APPVIEW==="account"){renderAccountView();return;}
  if(APPVIEW==="campaigns"){renderCampaignsView();return;}
  if(APPVIEW==="campaign"){renderCampaignView();return;}
  if(APPVIEW==="board"){renderBoardView();return;}
  if(APPVIEW==="play"){renderPlayView();saveAutosave();return;}
  if(APPVIEW==="sheet"){renderSheetView();return;}
  document.body.classList.remove("menu-mode","play-mode");
  renderRail();renderMain();renderLedger();renderFoot();saveAutosave();
  document.title=(S.concept.name?S.concept.name+" — ":"")+"Mythras Character Forge";}
function renderRail(){
  $("#rail").innerHTML='<button class="railstep menuback" onclick="APP.toMenu()"><span class="n">&#9776;</span><span class="lbl">Main Menu</span></button>'
   +currentSteps().map((s,i)=>{
    const cls=["railstep"];if(i===S.step)cls.push("active");
    if(i<S.step&&stepPassed(i))cls.push("done");
    return '<button class="'+cls.join(" ")+'" onclick="APP.go('+i+')"><span class="n">'+(i<S.step&&stepPassed(i)?"&#10003;":i+1)+'</span><span class="lbl">'+s+'</span></button>';
  }).join("");
}
function renderLedger(){
  let h='<h3>Characteristics</h3><div class="ledchars">'+CHARS.map(c=>'<div class="lc"><b>'+(S.chars[c]??"&mdash;")+'</b><span>'+c+'</span></div>').join("")+'</div>';
  if(charsReady()){
    const c=S.chars;
    h+='<h3>Attributes</h3>'
      +led("Action Points",apFinal(c.INT,c.DEX,S.fixedAP))
      +led("Damage Mod",dmCalc(c.STR,c.SIZ))
      +led("Initiative",initBonus(c.INT,c.DEX))
      +led("Luck Points",luckFinal(c.POW))
      +led("Magic Points",c.POW)
      +led("Healing Rate",healRate(c.CON))
      +led("Exp. Modifier",(xpMod(c.CHA)>=0?"+":"")+xpMod(c.CHA))
      +led("Movement",moveText()+(moveRate().m!==moveBase()?' <span class="note">(base '+moveBase()+'m)</span>':""))
      +led("Height / Weight",heightWeightText());
    h+='<h3>Hit Points</h3><table class="ledhp">'+hpLocsFinal(c.CON,c.SIZ).map(([l,v])=>'<tr><td>'+l+'</td><td>'+v+'</td></tr>').join("")+'</table>';
  }
  const stepName=currentSteps()[S.step];
  const poolByName={"Culture":["culture",100,"Cultural"],"Career":["career",100,"Career"],
    "Bonus Skills":["bonus",bonusPool(),"Bonus"],"Quick Skills":["quick",100,"Quick"]};
  const p=poolByName[stepName];
  if(p){const sp=aSum(p[0]);h+='<h3>'+p[2]+' points</h3>'+led("Spent",sp+" / "+p[1])+led("Remaining",p[1]-sp);}
  if(S.money.dice.length){const t=moneyTotal();h+='<h3>Silver</h3>'+led("Starting",t+" sp")+led("Remaining",(t-(S.money.spent||0))+" sp");}
  if(stepName==="Money & Gear"){h+='<h3>Gear</h3>'+led("Total ENC",gearEncTotal())+led("Unencumbered limit",encLimit()??"—");}
  $("#ledger").innerHTML=h;
}
const led=(k,v)=>'<div class="ledrow"><span>'+k+'</span><b>'+v+'</b></div>';
function renderFoot(){
  const v=validate(S.step);
  const steps=currentSteps();
  const last=S.step===steps.length-1;
  const overridable=["Characteristics","Attributes","Culture","Career","Bonus Skills","Quick Skills"].includes(steps[S.step]);
  const foot=$("#foot");
  foot.innerHTML=
   '<button class="nav" onclick="APP.go('+(S.step-1)+')" '+(S.step===0?"disabled":"")+'>&#8592; Back</button>'
  +'<span class="vmsg '+(v.ok?"okmsg":"warn")+'">'+esc(v.msg||(v.ok&&!last?"Step complete.":""))+'</span>'
  +(overridable&&!v.ok?'<label><input type="checkbox" '+(S.overrides[S.step]?"checked":"")+' onchange="APP.override('+S.step+',this.checked)"> GM override &mdash; proceed anyway</label>':"")
  +(last?'':'<button class="nav primary" onclick="APP.go('+(S.step+1)+')" '+(stepPassed(S.step)?"":"disabled")+'>Next &#8594;</button>');
  // Footer height varies with wrapping (long validation messages, GM override
  // checkbox, narrow screens). Measure it and feed #main's bottom clearance
  // from actual layout instead of a guessed constant, so content is never
  // hidden behind the fixed footer.
  requestAnimationFrame(()=>{
    document.documentElement.style.setProperty("--foot-h",foot.offsetHeight+"px");
  });
}

/* ================= RENDER: STEPS ================= */
function renderMain(){
  const f=stepFns()[S.step];
  $("#main").innerHTML=f();
}
function head(t,l){return '<h2 class="stephead">'+t+'</h2><p class="steplede">'+l+'</p>';}
function fld(label,inner){return '<div class="field"><label>'+label+'</label>'+inner+'</div>';}
function tIn(obj,f,val,ph){return '<input type="text" value="'+esc(val)+'" placeholder="'+esc(ph||"")+'" onchange="APP.set(\''+obj+'\',\''+f+'\',this.value)">';}

function modeCard(){
  return '<div class="card"><h3>Creation method</h3><div class="modeseg">'
   +'<button class="'+(S.creationMode==="full"?"on":"")+'" onclick="APP.setMode(\'full\')">Full Creation</button>'
   +'<button class="'+(S.creationMode==="quick"?"on":"")+'" onclick="APP.setMode(\'quick\')">Quick Character</button>'
   +'</div><p class="note">'+(S.creationMode==="full"
     ?"Culture (100 pts) + Career (100 pts) + Bonus (150 pts) &mdash; full customisation."
     :"The Workbook&rsquo;s fast alternative: skip Culture and Career, pick three Professional Skills and an optional Combat Style, then spend a flat 100 points (5&ndash;15 per skill). Characteristics are generated the normal way either way.")
   +'</p></div>';
}
function archetypeCard(){
  const tiers=[["ordinary","Ordinary"],["pulp","Pulp Hero"],["paragon","Paragon"]];
  let h='<div class="card"><h3>Character tier</h3><div class="modeseg">'
   +tiers.map(([k,l])=>'<button class="'+(S.archetype===k?"on":"")+'" onclick="APP.archetype(\''+k+'\')">'+l+'</button>').join("")+'</div>';
  if(S.archetype==="ordinary"){
    h+='<p class="note">Standard Mythras characters &mdash; the default for most campaigns.</p>';
  }else{
    const t=ARCHETYPES[S.archetype];
    h+='<div class="rulequote">'+t.quote+'</div>'
     +'<p class="note">Characteristics: '+t.charNote+'. Bonus Skill Points: +'+t.bonusExtra+' (cap '+t.bonusCap+'% per skill, set on the Bonus Skills step). Advantages: choose '+t.advantages+' (set on the Attributes step). Healing Rate is doubled for Minor or Serious Wounds &mdash; Major Wounds heal at the standard rate.</p>';
  }
  return h+'</div>';
}
// Species picker. Non-human characters were previously impossible — there was
// no path at all, and Movement was the literal string "6m". Picking a species
// swaps in its characteristic dice (which drives the roller, the Points Build
// bounds and the pool), its Movement Rate, and its racial traits.
function speciesCard(){
  const cur=S.species||"human";
  let h='<div class="card"><h3>Species</h3>'
   +'<p class="note">Non-human characters are built exactly like humans &mdash; same Culture, Career, skills and Attributes &mdash; but roll their own characteristic dice and have their own Movement Rate. Everything downstream adapts automatically.</p>'
   +'<div class="pickgrid pickgrid-sm">'+SPECIES.map(sp=>
     '<button class="pick '+(cur===sp.key?"on":"")+'" onclick="APP.pickSpecies(\''+sp.key+'\')">'
     +'<span class="pn">'+esc(sp.label)+'</span>'
     +'<div class="pd">'+esc(sp.blurb)+'</div>'
     +'<div class="pmeta">Move '+sp.move+'m &middot; '+esc(sp.lifespan)+'</div></button>').join("")+'</div>';
  const sp=SPECIES_MAP[cur];
  h+='<table class="rt speciestbl"><tr><th>&nbsp;</th>'+CHARS.map(c=>'<th class="num">'+c+'</th>').join("")+'</tr>'
   +'<tr><td>Dice</td>'+CHARS.map(c=>'<td class="num">'+esc(sp.dice[c])+'</td>').join("")+'</tr>'
   +'<tr><td>Range</td>'+CHARS.map(c=>'<td class="num">'+sp.bounds[c][0]+'&ndash;'+sp.bounds[c][1]+'</td>').join("")+'</tr>'
   +'<tr><td>Average</td>'+CHARS.map(c=>'<td class="num">'+sp.avg[c]+'</td>').join("")+'</tr></table>';
  h+='<p class="note">Points Build pool for a '+esc(sp.label)+(S.archetype!=="ordinary"?" "+ARCHETYPES[S.archetype].label:"")+': <b>'+pbPool()+'</b> points.'
   +(sp.key==="human"
     ?' (Core rulebook&rsquo;s flat pool.)'
     :' (Racial averages '+sp.avgTotal+' + 6, per the species rules'+(S.archetype!=="ordinary"?", + this tier&rsquo;s increment":"")+'.)')+'</p>';
  if(sp.traits.length){
    h+='<div class="field"><label>Racial traits</label>'
     +sp.traits.map(([n,d])=>'<p class="note"><b>'+esc(n)+'</b> &mdash; '+esc(d)+'</p>').join("")
     +'<p class="note"><i>These are situational Grade shifts and narrative rules, so &mdash; exactly as with the Pulp/Paragon Grade-easier Advantages &mdash; they are recorded on your sheet rather than folded into a percentage. Characteristic dice and Movement Rate are applied automatically.</i></p></div>';
  }
  h+='<p class="note rulesrc">Characteristic dice, Movement Rates and racial traits from the <a href="https://cfi-srd.mythras.net/" target="_blank" rel="noopener">Classic Fantasy Imperative SRD</a> (The Design Mechanism, ORC License). Its Human row matches core Mythras exactly.</p>';
  return h+'</div>';
}
// Height & Weight, computed rather than the text reminder that used to sit
// here. Both figures are overridable — the point of the override boxes is
// that anyone with the printed Height & Weight table can enter its exact
// value and have it flow to the sheet and export like any other field.
function heightWeightCard(){
  const c=S.concept;
  const hw=heightWeight();
  let h='<div class="card"><h3>Height &amp; Weight</h3>';
  if(!hw){
    h+='<p class="note">Set characteristics first &mdash; height and weight are derived from SIZ, your species and your body frame. You can also type them in by hand once SIZ is known.</p>';
    return h+'</div>';
  }
  const sp=speciesDef();
  h+='<div class="hwreadout">'
   +'<div class="hwbig"><span class="hwv">'+hw.m.toFixed(2)+'<small>m</small></span><span class="hwsub">'+hw.ft+'</span><span class="hwlbl">Height</span></div>'
   +'<div class="hwbig"><span class="hwv">'+hw.kg+'<small>kg</small></span><span class="hwsub">'+hw.lb+' lb</span><span class="hwlbl">Weight</span></div>'
   +'<div class="hwfrom">from SIZ <b>'+S.chars.SIZ+'</b> &middot; '+esc(sp?sp.label:"Human")+' &middot; '+esc(hw.build)+' frame'
   +(hw.overriddenH||hw.overriddenW?'<br><span class="note">Hand-entered value in use (derived would be '+hw.derivedM.toFixed(2)+'m / '+hw.derivedKg+'kg).</span>':"")
   +'</div></div>';
  h+='<div class="grid2">'
   +fld("Height override (metres)",'<input type="number" step="0.01" min="0" value="'+esc(c.heightM)+'" placeholder="'+hw.derivedM.toFixed(2)+'" onchange="APP.set(\'concept\',\'heightM\',this.value)">')
   +fld("Weight override (kg)",'<input type="number" step="1" min="0" value="'+esc(c.weightKg)+'" placeholder="'+hw.derivedKg+'" onchange="APP.set(\'concept\',\'weightKg\',this.value)">')
   +'</div>';
  h+='<p class="note">Body frame (set above) redistributes the same SIZ: a Lithe build is taller and leaner for its mass, Heavy is shorter and denser. Weight tracks SIZ directly, since SIZ <i>is</i> the character&rsquo;s mass.</p>';
  h+='<p class="note rulesrc">The core rulebook&rsquo;s Height &amp; Weight table (p.9) is not reproduced here &mdash; this app has no verified transcription of it, and inventing one would be worse than saying so. These are computed from a stated model (see <code>HW_ANCHORS</code> in data.js) pinned to the standard adult figure for an average-SIZ human and, for each demi-human, to the height its own species description gives. If you have the table in front of you, type its value into the override boxes and it wins outright.</p>';
  return h+'</div>';
}
function stepConcept(){
  const c=S.concept;
  return head("Concept","Who is this character? Keep it simple for now &mdash; the numbers come next, and everything here is free text.")
  +modeCard()+archetypeCard()+speciesCard()
  +'<div class="card"><div class="grid2">'
  +fld("Character name",tIn("concept","name",c.name,"e.g. Anathaym"))
  +fld("Player",tIn("concept","player",c.player,""))
  +fld("Gender",tIn("concept","gender",c.gender,""))
  +fld("Age",tIn("concept","age",c.age,"adult by default"))
  +fld("Homeland",tIn("concept","homeland",c.homeland,"e.g. a region of Sit'ota"))
  +fld("Handedness",'<select onchange="APP.set(\'concept\',\'handed\',this.value)">'+["Right","Left","Ambidextrous"].map(o=>'<option '+(c.handed===o?"selected":"")+'>'+o+'</option>').join("")+'</select>')
  +fld("Body frame",'<select onchange="APP.set(\'concept\',\'frame\',this.value)">'+["Lithe","Medium","Heavy"].map(o=>'<option '+(c.frame===o?"selected":"")+'>'+o+'</option>').join("")+'</select>')
  +'</div>'+fld("Concept notes",'<textarea rows="3" onchange="APP.set(\'concept\',\'notes\',this.value)">'+esc(c.notes)+'</textarea>')
  +'</div>'+heightWeightCard();
}

function stepChars(){
  let body="";
  const tier=ARCHETYPES[S.archetype];
  const isOrd=S.archetype==="ordinary";
  if(S.charMode==="roll"&&!usesHumanPools()){
    // Each characteristic has its own die for a non-human species, so there
    // is no shared pool to allocate between — roll them individually, with a
    // re-roll on each in case the GM allows it.
    const sp=speciesDef();
    body='<div class="card"><h3>Roll '+esc(sp.label)+' characteristics</h3>'
    +'<div class="rulequote">&ldquo;Demi-human characters are created in almost the same way as humans. Characteristics are determined using the Characteristic dice for that species, which will result in different Characteristic values and ranges, but otherwise all the other elements: Attributes, Culture, Class and so on, are factored as normal.&rdquo;</div>'
    +(isOrd?"":'<p class="note">'+esc(ARCHETYPES[S.archetype].label)+': one extra die is rolled for each characteristic and the lowest discarded.</p>')
    +'<p><button class="chip actionchip" onclick="APP.rollSpeciesAll()" style="font-size:13.5px">Roll all seven</button> '
    +'<button class="nav" onclick="APP.speciesAverages()" style="border:1px solid var(--line);border-radius:5px;padding:6px 14px">Use racial averages</button></p>'
    +'<div class="charrow" style="margin-top:12px">'
    +CHARS.map(c=>'<div class="charbox"><div class="cname">'+c+'</div><div class="cval">'+(S.chars[c]??"&mdash;")+'</div>'
      +'<div class="cctl"><button class="chip actionchip" onclick="APP.rollSpeciesOne(\''+c+'\')">roll '+esc(sp.dice[c])+'</button></div>'
      +'<div class="crange">'+sp.bounds[c][0]+'&ndash;'+sp.bounds[c][1]+'</div></div>').join("")
    +'</div></div>';
  }else if(S.charMode==="roll"){
    const quote=isOrd
     ?"&ldquo;3d6 for STR, CON, DEX, POW and CHA. 2d6+6 for INT and SIZ. Allocate results to fit the concept. Results may be allocated in the order listed, or distributed as the Games Master and players agree.&rdquo;"
     :tier.quote;
    body='<div class="card"><h3>Roll the dice</h3>'
    +'<div class="rulequote">'+quote+'</div>'
    +'<p><button class="chip actionchip" onclick="APP.rollPools()" style="font-size:13.5px">Roll all pools</button> '
    +(S.poolA.length?'<button class="nav" onclick="APP.assignInOrder()" style="border:1px solid var(--line);border-radius:5px;padding:6px 14px">Assign highest first</button>':"")+'</p>'
    +(S.poolA.length?'<p style="margin-top:8px"><b>Main pool:</b> '+S.poolA.map(v=>'<span class="dicechip">'+v+'</span>').join("")+' &nbsp; <b>SIZ/INT pool:</b> '+S.poolB.map(v=>'<span class="dicechip">'+v+'</span>').join("")+(S.poolA.length>ROLL_3D6.length||S.poolB.length>ROLL_2D6.length?' <span class="note">(one spare in each pool to discard, per the book)</span>':"")+'</p>':"")
    +'<div class="charrow" style="margin-top:12px">'
    +CHARS.map(c=>{
      const isB=ROLL_2D6.includes(c);const pool=isB?S.poolB:S.poolA;const asg=isB?S.assignB:S.assignA;
      const opts=['<option value="">&mdash;</option>'].concat(pool.map((v,i)=>{
        const used=Object.entries(asg).some(([cc,ii])=>ii===i&&cc!==c);
        return '<option value="'+i+'" '+(asg[c]===i?"selected":"")+(used?" disabled":"")+'>'+v+'</option>';}));
      return '<div class="charbox"><div class="cname">'+c+'</div><div class="cval">'+(S.chars[c]??"&mdash;")+'</div><select onchange="APP.assign(\''+c+'\',this.value)">'+opts.join("")+'</select></div>';
    }).join("")+'</div></div>';
  }else if(S.charMode==="pb"){
    const total=CHARS.reduce((a,c)=>a+(S.chars[c]||0),0);
    const pool=pbPool();
    body='<div class="card"><h3>Points build &mdash; '+pool+' points</h3>'
    +'<div class="rulequote">'+(isOrd
      ?"&ldquo;Alternatively distribute 80 points amongst the characteristics. Minimum 3 (8 for INT and SIZ), maximum 18. Use all the points.&rdquo;"
      :"&ldquo;If using the Points Build method, players build their character from a pre-set pool of "+pool+" points.&rdquo; &mdash; Mythras Companion")+'</div>'
    +'<div class="pool"><span>Points</span><span class="pv '+(total===pool?"ok":(total>pool?"bad":""))+'">'+total+' / '+pool+'</span>'
     +'<div class="pbar"><i style="width:'+Math.min(100,total/pool*100)+'%"></i></div><span class="note">'+(pool-total)+' left</span></div>'
    +'<div class="charrow" style="margin-top:10px">'+CHARS.map(c=>{
      const {min:mn,max:mx}=charBounds(c);
      return '<div class="charbox"><div class="cname">'+c+'</div><div class="cval">'+(S.chars[c]??"&mdash;")+'</div><div class="cctl"><button aria-label="decrease '+c+'" onclick="APP.pb(\''+c+'\',-1)">&minus;</button><button aria-label="increase '+c+'" onclick="APP.pb(\''+c+'\',1)">+</button></div>'
       +'<div class="cctl" style="margin-top:3px"><button class="chip actionchip" onclick="APP.pbSet(\''+c+'\','+mn+')">min</button><button class="chip actionchip" onclick="APP.pbSet(\''+c+'\','+mx+')">max</button></div>'
       +'<div class="crange">'+mn+'&ndash;'+mx+'</div></div>';
    }).join("")+'</div></div>';
  }else{
    // Manual entry is still free-typing (it exists for pre-rolled/GM-supplied
    // numbers), but the input now advertises the same bound validate() will
    // actually enforce, instead of the old arbitrary max="21" that matched no
    // rule at all and let 19-21 through unchallenged.
    const rangeTxt=speciesDef()
      ? esc(speciesDef().label)+" range: "+CHARS.map(c=>c+" "+charMin(c)+"&ndash;"+charMax(c)).join(", ")
      : "Human range is 3&ndash;18 (INT and SIZ 8&ndash;18).";
    body='<div class="card"><h3>Manual entry</h3><p class="note">For pre-rolled or GM-supplied values. '+rangeTxt+' Out-of-range values are blocked on the Next button &mdash; use the GM override below if the character is deliberately superhuman.</p>'
    +'<div class="charrow" style="margin-top:10px">'+CHARS.map(c=>{
      const {min:mn,max:mx}=charBounds(c);const v=S.chars[c];
      const oob=Number.isFinite(v)&&(v<mn||v>mx);
      return '<div class="charbox'+(oob?" oob":"")+'"><div class="cname">'+c+'</div><input type="number" min="'+mn+'" max="'+mx+'" value="'+(v??"")+'" onchange="APP.manual(\''+c+'\',this.value)"><div class="crange">'+mn+'&ndash;'+mx+'</div></div>';
    }).join("")+'</div></div>';
  }
  const spNow=speciesDef();
  return head("Characteristics","Seven characteristics drive everything downstream &mdash; attributes, skill bases and hit points all cascade from these.")
  +(spNow&&spNow.key!=="human"?'<p class="note">Rolling as a <b>'+esc(spNow.label)+'</b> (Movement '+spNow.move+'m). Change species on the Concept step.</p>':"")
  +'<div class="modeseg">'
  +'<button class="'+(S.charMode==="roll"?"on":"")+'" onclick="APP.mode(\'roll\')">Roll dice</button>'
  +'<button class="'+(S.charMode==="pb"?"on":"")+'" onclick="APP.mode(\'pb\')">Points build ('+pbPool()+')</button>'
  +'<button class="'+(S.charMode==="manual"?"on":"")+'" onclick="APP.mode(\'manual\')">Manual</button>'
  +'</div>'+body;
}

function advCard(){
  if(S.archetype==="ordinary")return "";
  const t=ARCHETYPES[S.archetype];
  return '<div class="card"><h3>Advantages &mdash; choose '+t.advantages+'</h3>'
   +'<p class="note">Advantages cannot be stacked &mdash; pick each one at most once.</p>'
   +ADVANTAGE_DEFS.map(a=>{
     const label=a.label(S.archetype);
     const checked=S.archAdvantages.includes(a.key);
     const disabled=(!checked&&S.archAdvantages.length>=t.advantages);
     return '<label style="display:block;margin:4px 0"><input type="checkbox" '+(checked?"checked":"")+' '+(disabled?"disabled":"")+' onchange="APP.toggleAdv(\''+a.key+'\')"> '+label+'</label>';
   }).join("")+'</div>';
}
function stepAttrs(){
  if(!charsReady())return head("Attributes","Derived automatically from characteristics.")+'<div class="card"><p class="warn">Set all seven characteristics first.</p></div>';
  const c=S.chars;
  const rows=[
   ["Action Points",apFinal(c.INT,c.DEX,S.fixedAP)+(hasAdv("ap")?" (Advantage +1)":""),S.fixedAP?"fixed by house rule":"INT+DEX = "+(c.INT+c.DEX)],
   ["Damage Modifier",dmCalc(c.STR,c.SIZ),"STR+SIZ = "+(c.STR+c.SIZ)],
   ["Experience Modifier",(xpMod(c.CHA)>=0?"+":"")+xpMod(c.CHA),"CHA "+c.CHA],
   ["Healing Rate",healRate(c.CON)+(S.archetype!=="ordinary"?" (&times;2 vs Minor/Serious Wounds)":""),"CON "+c.CON],
   ["Initiative Bonus",initBonus(c.INT,c.DEX),"average of DEX &amp; INT, fractions up"],
   ["Luck Points",luckFinal(c.POW)+(hasAdv("luck")?" (Advantage +"+(S.archetype==="paragon"?2:1)+")":""),"POW "+c.POW],
   ["Magic Points",c.POW,"equal to POW"],
   ["Height",(()=>{const hw=heightWeight();return hw.m.toFixed(2)+"m";})(),(()=>{const hw=heightWeight();return hw.ft+" &mdash; SIZ "+c.SIZ+", "+esc(hw.build)+" frame";})()],
   ["Weight",(()=>{const hw=heightWeight();return hw.kg+"kg";})(),(()=>{const hw=heightWeight();return hw.lb+" lb &mdash; SIZ "+c.SIZ;})()],
   ["Movement Rate",moveText(),(()=>{const r=moveRate();const sp=speciesDef();
     const src=sp?sp.label+" base "+r.base+"m":"human base 6m";
     return r.notes.length?src+" &mdash; "+r.notes.join("; "):src;})()]];
  return head("Attributes","Nothing to enter here &mdash; every attribute is computed from the verified core tables and updates live if you revisit characteristics.")
  +'<div class="card"><div class="attrgrid">'+rows.map(r=>'<div class="attr"><div class="an">'+r[0]+'</div><div class="av">'+r[1]+'</div><div class="ah">'+r[2]+'</div></div>').join("")+'</div>'
  +'<p class="note" style="margin-top:10px"><b>Optional rule &mdash; Fixed Action Points:</b> &ldquo;all characters can start the game with either 2 or 3 Action Points, regardless of INT and DEX.&rdquo; '
  +'<label><input type="radio" name="fap" '+(S.fixedAP===0?"checked":"")+' onchange="APP.fap(0)"> off</label> '
  +'<label><input type="radio" name="fap" '+(S.fixedAP===2?"checked":"")+' onchange="APP.fap(2)"> 2</label> '
  +'<label><input type="radio" name="fap" '+(S.fixedAP===3?"checked":"")+' onchange="APP.fap(3)"> 3</label></p></div>'
  +advCard()
  +(S.archetype!=="ordinary"&&(hasAdv("endurance")||hasAdv("stealth")||hasAdv("willpower"))
    ?'<div class="card"><h3>Grade-easier Advantages</h3><p class="note">'
     +["endurance","stealth","willpower"].filter(hasAdv).map(k=>k[0].toUpperCase()+k.slice(1)).join(", ")
     +' rolls are one Grade easier for this character. Grades are a situational roll modifier in Mythras, not a skill bonus, so this isn&rsquo;t folded into the % shown below &mdash; apply it at the table when the roll comes up.</p></div>'
    :"")
  +'<div class="card"><h3>Hit Points per Location</h3><p class="note">CON+SIZ = '+(c.CON+c.SIZ)+'. Locations rolled on 1d20 in play.'+(hasAdv("hp")?' Includes the Advantage bonus below.':"")+'</p>'
  +'<table class="rt"><tr><th>d20</th><th>Location</th><th class="num">HP</th></tr>'
  +HIT_D20.map(([r,loc])=>{const base=loc.replace(/Right |Left /,"").replace("Arm","Each Arm").replace("Leg","Each Leg");
    const hp=hpLocsFinal(c.CON,c.SIZ).find(x=>x[0]===base||x[0]===loc);
    return '<tr><td>'+r+'</td><td>'+loc+'</td><td class="num">'+(hp?hp[1]:"")+'</td></tr>';}).join("")
  +'</table></div>';
}
/* ---- shared allocation table ---- */
function allocTable(phase,rows,pool,min,max,quote,groupOrder){
  const spent=aSum(phase),rem=pool-spent;
  const seen=new Set();rows=rows.filter(r=>!seen.has(r.key)&&seen.add(r.key));
  // Optional section grouping (Standard/Professional/Magic/Combat Style) —
  // used on the Bonus Skills step, which otherwise dumps 25+ rows into one
  // flat alphabetical list with no way to tell what kind of skill you're
  // looking at. Stable-sorts rows into groupOrder, then inserts a labelled
  // header row wherever the group changes. Culture/Career/Quick callers
  // don't pass groupOrder, so they render exactly as before.
  if(groupOrder)rows=rows.slice().sort((a,b)=>groupOrder.indexOf(a.grp)-groupOrder.indexOf(b.grp));
  return '<div class="pool"><span>Points</span><span class="pv '+(spent===pool?"ok":(spent>pool?"bad":""))+'">'+spent+' / '+pool+'</span>'
   +'<div class="pbar"><i style="width:'+Math.min(100,spent/pool*100)+'%"></i></div><span class="note">'+rem+' left'+(min?' &middot; '+min+'&ndash;'+max+' each':' &middot; max '+max+' each')+'</span></div>'
   +(quote?'<div class="rulequote">'+quote+'</div>':"")
   +'<table class="alloc"><tr><th>Skill</th><th class="num">Base</th><th>'+phase+' pts</th><th class="num">Total %</th></tr>'
   +rows.map((r,i)=>{
     const v=aGet(phase,r.key);
     const bad=(v>max)||(min?(v>0&&v<min):(v<0));
     const groupHead=(groupOrder&&(i===0||rows[i-1].grp!==r.grp))
       ?'<tr class="allocgrp"><td colspan="4">'+esc(r.grp||"")+'</td></tr>':"";
     return groupHead+'<tr class="'+(bad?"bad ":"")+(r.required?"req":"")+'"><td>'+esc(r.label)+'</td><td class="num">'+r.base+(r.plus40?" +40":"")+'</td>'
      +'<td><span class="stp"><button aria-label="decrease points" onclick="APP.aAdj(\''+phase+'\',\''+jsq(r.key)+'\',-1)">&minus;</button>'
      +'<input type="number" value="'+v+'" min="0" max="'+max+'" onchange="APP.aSet(\''+phase+'\',\''+jsq(r.key)+'\',this.value)">'
      +'<button aria-label="increase points" onclick="APP.aAdj(\''+phase+'\',\''+jsq(r.key)+'\',1)">+</button>'
      +'<button class="chip actionchip" onclick="APP.aSet(\''+phase+'\',\''+jsq(r.key)+'\','+(min||0)+')">min</button>'
      +'<button class="chip actionchip" onclick="APP.aSet(\''+phase+'\',\''+jsq(r.key)+'\','+max+')">max</button>'
      +'</span></td>'
      +'<td class="num">'+finalPct(r.key)+'%</td></tr>';}).join("")
   +'</table>';
}
function rowFor(key,required){const em=entryMap();const e=em[key];if(!e)return null;
  return {key,label:e.label,base:e.base,required:!!required,plus40:(key==="std:Customs"||key==="std:Native Tongue")};}

/* ---- step: culture ---- */
function stepCulture(){
  let h=head("Culture","Your cultural background: +40% to Customs and Native Tongue, three Professional Skills, an optional Combat Style, and 100 points across all of them.");
  h+='<div class="pickgrid">'+Object.keys(CULTURES).map(n=>'<button class="pick '+(S.culture===n?"on":"")+'" onclick="APP.pickCulture(\''+n+'\')"><span class="pn">'+n+'</span><div class="pd">'+CULTURES[n].blurb+'</div></button>').join("")+'</div>';
  if(!S.culture)return h;
  const c=CULTURES[S.culture];
  h+='<div class="card"><h3>Standard skills</h3><p class="note">'+c.std.join(", ")+(c.choice?"; <i>"+esc(c.choice.text)+"</i>":"")+'</p>';
  if(c.choice){h+='<div class="choicechips">'+c.choice.from.map(sk=>'<button class="chip '+(S.cultChoice.includes(sk)?"on":"")+'" onclick="APP.cultChoice(\''+sk+'\')">'+sk+'</button>').join("")+'</div>';}
  h+='<p class="note">Customs and Native Tongue gain <b>+40%</b> each, irrespective of the culture chosen (applied automatically).</p></div>';
  h+='<div class="card"><h3>Three professional skills</h3>'+profPickers("cult",c.prof,3)+'</div>';
  h+='<div class="card"><h3>Combat style <span class="note">(optional &mdash; &ldquo;If desired, select a single Combat Style&rdquo;)</span></h3>'
   +'<p><label><input type="checkbox" '+(S.cultStyleOn?"checked":"")+' onchange="APP.cultStyle(this.checked)"> Take a cultural combat style</label></p>'
   +(S.cultStyleOn?fld("Style name (weapons &amp; traits per your GM)",'<input type="text" value="'+esc(S.cultStyleName)+'" placeholder="e.g. '+esc(c.styles.split(",")[0].trim())+'" onchange="APP.set2(\'cultStyleName\',this.value)">'):"")
   +'<p class="note">Examples for '+S.culture+': '+esc(c.styles)+'</p></div>';
  const rows=cultureReqKeys().map(k=>rowFor(k,true)).filter(Boolean);
  h+='<div class="card"><h3>Allocate 100 cultural points</h3>'
   +allocTable("culture",rows,100,5,15,"&ldquo;Distribute 100 points amongst the listed Standard Skills, the chosen Professional Skills, and the Combat Style (if selected)&hellip; each skill must receive a minimum of 5% and cannot receive more than 15%.&rdquo;")+'</div>';
  h+='<div class="card"><h3>Cultural passions</h3><p class="note">Suggested for '+S.culture+': '+c.passions.map(esc).join(" &middot; ")+' &mdash; set values at the Passions step.</p></div>';
  return h;
}
function profPickers(which,offers,slots){
  const picks=which==="cult"?S.cultProf:(which==="car"?S.carProf:S.qProf),
    specs=which==="cult"?S.cultProfSpec:(which==="car"?S.carProfSpec:S.qProfSpec);
  const parsed=offers.map(parseOffer);
  // Fallback to the generic speciality hints (used elsewhere for Quick
  // Character / custom careers) when an offer string has no "(hint)" of its
  // own — e.g. a custom career's flat, unparenthesised skill list — so a
  // speciality box still appears for skills that always need one (Craft,
  // Lore, Language, etc.) instead of silently skipping it.
  const hintFor=name=>{const o=parsed.find(x=>x.name===name);return (o&&o.hint)?o.hint:(QUICK_SPEC_HINTS[name]||null);};
  let h="";
  for(let i=0;i<slots;i++){
    const cur=picks[i]||"";
    const hint=cur?hintFor(cur):null;
    h+='<div style="display:flex;gap:8px;align-items:center;margin:5px 0;flex-wrap:wrap">'
     +'<span class="note" style="width:18px">'+(i+1)+'.</span>'
     +'<select onchange="APP.pickProf(\''+which+'\','+i+',this.value)"><option value="">&mdash; choose &mdash;</option>'
     +parsed.filter(o=>o.name===cur||!picks.some((p,j)=>j!==i&&p===o.name)).map(o=>'<option value="'+esc(o.name)+'" '+(cur===o.name?"selected":"")+'>'+esc(o.name+(hintFor(o.name)?" ("+hintFor(o.name)+")":""))+'</option>').join("")+'</select>'
     +(hint?'<input type="text" value="'+esc(specs[i])+'" placeholder="speciality: '+esc(hint)+'" style="flex:1;min-width:160px" onchange="APP.profSpec(\''+which+'\','+i+',this.value)">':"")
     +'</div>';
  }
  return h;
}

/* ---- step: career ---- */
function stepCareer(){
  let h=head("Career","Your profession before adventuring: up to three Professional Skills and 100 points, no more than 15 to any one skill. Not every listed skill needs points.");
  h+='<div class="pickgrid">'+Object.keys(CAREERS).map(n=>'<button class="pick '+(S.career===n&&!S.customCareer.isCustom?"on":"")+'" onclick="APP.pickCareer(\''+n+'\')"><span class="pn">'+n+'</span></button>').join("");
  h+='<button class="pick '+(S.customCareer.isCustom?"on":"")+'" onclick="APP.pickCareer(\'__custom__\')"><span class="pn">Custom Career</span><div class="pd">Build your own using the core rules</div></button></div>';
  
  // If custom is being built and not yet named, show the builder
  if(S.customCareer.isCustom && !S.career){
    h+='<div class="card"><h3>Build your custom career</h3>'
     +'<div class="field" style="margin-bottom:12px"><label>Career name</label><input type="text" value="'+esc(S.customCareer.name)+'" placeholder="e.g. Mercenary, Scholar, Scout" onchange="APP.customCareerName(this.value)" style="width:100%;"></div>'
     +'<div class="field" style="margin-bottom:12px"><label>Standard skills (pick any, no limits)</label><div class="choicechips">'
     +STD.map(([sk,_])=>'<button class="chip '+(S.customCareer.std.includes(sk)?"on":"")+'" onclick="APP.customCareerStd(\''+sk+'\')">'+sk+'</button>').join("")
     +'</div></div>'
     +'<div class="field" style="margin-bottom:12px"><label>Professional skills (pick up to 3)</label>'
     +profPickers("car",Object.keys(PROF).sort(),3)
     +'</div>'
     +'<div class="field"><label>Combat style slots (0–2)</label>'
     +'<select onchange="APP.customCareerStyles(+this.value)" style="width:100%;">'
     +'<option value="0" '+(S.customCareer.styleSlots===0?"selected":"")+'>None</option>'
     +'<option value="1" '+(S.customCareer.styleSlots===1?"selected":"")+'>One</option>'
     +'<option value="2" '+(S.customCareer.styleSlots===2?"selected":"")+'>Two</option>'
     +'</select></div>'
     +'<p class="note" style="margin-top:10px">Give it a name above to lock it in and continue &mdash; you can always come back and edit the standard skills or style slots later from the &ldquo;Edit custom career&rdquo; button.</p></div>';
    return h;
  }

  if(!S.career)return h;
  const k=S.customCareer.isCustom?{std:S.customCareer.std,styleSlots:Array(S.customCareer.styleSlots).fill(null)}:CAREERS[S.career];
  h+='<div class="card"><h3>Standard skills</h3><p class="note">'+k.std.join(", ")+(k.styleSlots.length?"; Combat Style: "+k.styleSlots.map((s,i)=>s||("Combat Style "+(i+1))).join("; Combat Style: "):"")+'</p>'
   +(S.customCareer.isCustom?'<p style="margin-top:8px"><button class="chip" onclick="APP.editCustomCareer()">Edit custom career (standard skills / style slots)</button></p>':"")+'</div>';
  if(k.styleSlots.length){
    h+='<div class="card"><h3>Career combat style'+(k.styleSlots.length>1?"s":"")+'</h3>';
    k.styleSlots.forEach((slot,i)=>{
      const cs=S.carStyles[i]||{mode:"new",name:""};
      h+='<div style="margin:6px 0"><span class="note">'+(S.customCareer.isCustom?"Combat Style "+(i+1):esc(slot))+':</span> '
       +'<select onchange="APP.carStyleMode('+i+',this.value)">'
       +'<option value="new" '+(cs.mode==="new"?"selected":"")+'>new style</option>'
       +(S.cultStyleOn?'<option value="link" '+(cs.mode==="link"?"selected":"")+'>same as cultural style</option>':"")
       +'</select> '
       +(cs.mode==="new"?'<input type="text" value="'+esc(cs.name)+'" placeholder="style name" onchange="APP.carStyleName('+i+',this.value)">':'<span class="note">'+esc(S.cultStyleName||"Cultural Combat Style")+'</span>')
       +'</div>';
    });
    h+='<p class="note">&ldquo;Choosing a Style or Professional Skill previously gained via cultural background simply allows the character to further apply some of their career skill points.&rdquo;</p></div>';
  }
  const carProfOffers=S.customCareer.isCustom?Object.keys(PROF).sort():k.prof;
  h+='<div class="card"><h3>Up to three professional skills</h3>'+profPickers("car",carProfOffers,3)+'</div>';
  const rows=careerKeys().map(key=>rowFor(key,false)).filter(Boolean);
  h+='<div class="card"><h3>Allocate 100 career points</h3>'
   +allocTable("career",rows,100,0,15,"&ldquo;Distribute 100 points amongst the career&rsquo;s listed Standard Skills and whatever Professional Skills were chosen&hellip; Not all of the available skills need to be improved, but no individual skill can receive more than 15%.&rdquo;")+'</div>';
  return h;
}

/* ---- step: bonus ---- */
function stepBonus(){
  const pool=bonusPool(),cap=bonusCap(),tierExtra=ARCHETYPES[S.archetype].bonusExtra||0;
  let h=head("Bonus Skill Points","Free development: "+pool+" points across anything the character knows, no more than "+cap+"% to any one skill &mdash; plus one extra Professional Skill as a hobby.");
  const hobOff=Object.keys(PROF).sort();
  h+='<div class="card"><h3>Hobby skill</h3>'
   +'<div class="rulequote">&ldquo;Default characters have 150 points with a limit of assigning no more than 15 points per skill. Choose one additional Professional skill as a hobby speciality.&rdquo;'
   +(tierExtra?' &mdash; '+ARCHETYPES[S.archetype].label+' adds +'+tierExtra+' points and raises the per-skill cap to '+cap+'% (Mythras Companion, pp.54&ndash;55).':"")+'</div>'
   +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
   +'<select onchange="APP.hobby(this.value)"><option value="">&mdash; choose a hobby skill &mdash;</option>'
   +hobOff.map(n=>'<option '+(S.hobby===n?"selected":"")+'>'+n+'</option>').join("")+'</select>'
   +(S.hobby?'<input type="text" value="'+esc(S.hobbySpec)+'" placeholder="speciality (if any)" onchange="APP.set2(\'hobbySpec\',this.value)">':"")
   +'</div></div>';
  const es=allEntries();
  h+='<div class="card"><h3>Allocate '+pool+' bonus points</h3>'
   +allocTable("bonus",es.map(e=>({key:e.key,label:(e.grp==="Combat Style"?"Combat Style: ":"")+e.label,base:e.base,plus40:(e.key==="std:Customs"||e.key==="std:Native Tongue"),grp:e.grp})),pool,0,cap,"",["Standard","Professional","Magic","Combat Style"])+'</div>';
  return h;
}
/* ---- step: quick skills (Workbook fast alternative to Culture/Career) ---- */
function stepQuickSkills(){
  let h=head("Quick Skills","The Workbook's fast alternative to Culture and Career: skip both, pick three Professional Skills and (optionally) one Combat Style, then spend a flat 100 points across whichever skills you want to raise &mdash; 5 to 15 on any skill you invest in; leave the rest at 0.");
  const offers=Object.keys(PROF).sort().map(n=>QUICK_SPEC_HINTS[n]?n+" ("+QUICK_SPEC_HINTS[n]+")":n);
  h+='<div class="card"><h3>Three professional skills</h3>'+profPickers("quick",offers,3)+'</div>';
  h+='<div class="card"><h3>Combat style <span class="note">(optional)</span></h3>'
   +'<p><label><input type="checkbox" '+(S.qStyleOn?"checked":"")+' onchange="APP.qStyle(this.checked)"> Take a Combat Style</label></p>'
   +(S.qStyleOn?fld("Style name (weapons &amp; traits per your GM)",'<input type="text" value="'+esc(S.qStyleName)+'" placeholder="e.g. Pit Fighter" onchange="APP.set2(\'qStyleName\',this.value)">'):"")
   +'</div>';
  h+='<p class="note">Customs and Native Tongue gain <b>+40%</b> each, irrespective of method, applied automatically below.</p>';
  const rows=quickKeys().map(k=>rowFor(k,true)).filter(Boolean);
  h+='<div class="card"><h3>Allocate 100 points</h3>'
   +allocTable("quick",rows,100,5,15,"&ldquo;Distribute 100 points amongst the listed Standard Skills, the chosen Professional Skills, and the Combat Style (if selected)&hellip; each skill must receive a minimum of 5% and cannot receive more than 15%.&rdquo; &mdash; Character Creation Workbook")+'</div>';
  return h;
}

/* ---- step: cult & community ---- */
function stepCult(){
  let h=head("Cult & Community","Optional: a religious cult, order, or plain community affiliation. Grants access to the skill it teaches plus a starter Passion (added on the next step) — entirely skippable if this character isn't affiliated with anything.");
  h+='<div class="pickgrid">'+CULT_ARCHETYPES.map(a=>'<button class="pick '+(S.cultMembership.archetype===a.key?"on":"")+'" onclick="APP.pickCult(\''+a.key+'\')"><span class="pn">'+esc(a.name)+'</span><div class="pd">'+esc(a.blurb)+' &mdash; '+esc(cultOrgType(a).label)+'</div></button>').join("")+'</div>';
  if(!S.cultMembership.archetype){
    h+='<p class="note">No affiliation selected &mdash; that&rsquo;s a fine choice for plenty of characters. Pick an archetype above only if it fits the concept.</p>';
    return h;
  }
  const a=cultArch();const tier=S.cultMembership.rank||0;
  h+='<div class="card"><h3>Details</h3>'
   +fld("Name it for Sit&#39;ota (deity, order, town, clan &mdash; your call)",'<input type="text" value="'+esc(S.cultMembership.name)+'" placeholder="e.g. '+esc(a.name)+'" onchange="APP.cultField(\'name\',this.value)">')
   +fld("Rank ("+esc(cultOrgType(a).label)+")",'<select onchange="APP.cultField(\'rank\',this.value)">'+CULT_TIERS.map((t,i)=>'<option value="'+i+'" '+(tier===i?"selected":"")+'>'+esc(cultRankTitle(a,i))+' ('+t+')</option>').join("")+'</select>')
   +'<p class="note" style="margin-top:6px">Grants access to <b>'+esc(a.skill)+'</b> ('+esc(S.cultMembership.name||a.name)+'), shown on the Sheet step under Magic/Professional skills. Rank itself carries no skill % bonus in the book &mdash; it gates which magic the organisation teaches you and a Training Discount of <b>'+CULT_TIER_TRAINING_DISCOUNT[tier]+'%</b> off future skill training (an economic modifier between sessions, not applied here).</p>'
   +'<p class="note" style="margin-top:6px"><b>Requirement for '+esc(cultRankTitle(a,tier))+':</b> '+CULT_TIER_REQUIREMENTS[tier]+(tier>0?' &mdash; a starting character usually won&rsquo;t meet this yet; pick a higher rank only for a returning/veteran PC with your GM&rsquo;s sign-off.':"")+'</p>'
   +'<p style="margin-top:8px"><button class="chip" onclick="APP.leaveCult()">Remove this affiliation</button></p>'
   +'</div>';
  return h;
}
/* ---- step: passions ---- */
function stepPassions(){
  let h=head("Passions","Optional but recommended: a Loyalty, a Love and a Hate. Starting values follow the book&rsquo;s table and depend on what the passion is aimed at.");
  h+='<div class="card">';
  if(!S.passions.length)h+='<p class="note">No passions yet &mdash; add one below'+(S.culture?', or start from your culture&rsquo;s suggestions':"")+'.</p>';
  S.passions.forEach((p,i)=>{
    const t=PASSION_TYPES[p.type];
    h+='<div style="border:1px solid var(--line-soft);border-radius:6px;padding:10px;margin-bottom:8px">'
     +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
     +'<input type="text" value="'+esc(p.name)+'" placeholder="e.g. Loyalty to Clan Chieftain" style="flex:1;min-width:180px" onchange="APP.pas('+i+',\'name\',this.value)">'
     +'<select onchange="APP.pas('+i+',\'type\',this.value)">'+Object.entries(PASSION_TYPES).map(([k,v])=>'<option value="'+k+'" '+(p.type===k?"selected":"")+'>'+v.label+'</option>').join("")+'</select>'
     +'<button class="chip" onclick="APP.delPas('+i+')">remove</button></div>'
     +'<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:6px" class="note">'
     +'Formula: '+t.calc
     +(t.needs.includes("subjPOW")?' &nbsp;subject POW <input type="number" value="'+(p.subjPOW||"")+'" onchange="APP.pas('+i+',\'subjPOW\',this.value)">':"")
     +(t.needs.includes("subjCHA")?' &nbsp;subject CHA <input type="number" value="'+(p.subjCHA||"")+'" onchange="APP.pas('+i+',\'subjCHA\',this.value)">':"")
     +' &nbsp;&rarr; <b style="font-family:var(--mono);color:var(--bronze-hi)">'+passionVal(p)+'%</b></div></div>';
  });
  h+='<p><button class="chip" onclick="APP.addPas()">+ add passion</button>'
   +(S.culture?' <button class="chip" onclick="APP.pasFromCulture()">use '+S.culture+' suggestions</button>':"")
   +(S.cultMembership.archetype?' <button class="chip" onclick="APP.pasFromCult()">use '+esc(S.cultMembership.name||cultArch().name)+' suggestion</button>':"")+'</p></div>';
  return h;
}
function passionVal(p){
  if(!charsReady())return "?";const c=S.chars;
  switch(p.type){
   case "romantic":return 30+(+p.subjPOW||0)+(+p.subjCHA||0);
   case "platonic":case "averse":return 30+c.POW+(+p.subjCHA||0);
   case "org":case "place":return 30+c.POW+c.INT;
   case "species":case "object":return 30+c.POW*2;
  }return 30;
}

/* ---- weapons & armour helpers ---- */
// No STR/DEX minimum mechanic exists for weapons in Mythras (an earlier
// pass fabricated one) — real weapon stats are Damage, Size, Reach, Combat
// Effects, ENC, the weapon's own AP/HP, Traits, Milieu and Cost, all now
// transcribed from the book (see the WEAPONS data-block comment above).
function weaponsEnc(){return S.gearWeapons.reduce((a,n)=>{const w=WEAPON_MAP[n];return a+(w?w.enc:0);},0);}
// Worn armour counts at half its packed ENC value while worn; carried
// (unworn) armour counts full ENC (core rulebook, Encumbrance section,
// confirmed against page image). "Each Arm"/"Each Leg" are single pickers
// covering two physical locations apiece, so they're weighted x2 here to
// match the book's 7-location totals (Head, Chest, Abdomen, R/L Arm, R/L Leg).
function armorEncAt(loc){const m=ARMOR_MAP[S.armor[loc]]||ARMOR_MAP.None;return m.encPerLoc*0.5;}
function armorLocWeight(loc){return (loc==="Each Arm"||loc==="Each Leg")?2:1;}
function armorEncTotal(){return ARMOR_LOCATIONS.reduce((a,l)=>a+armorEncAt(l)*armorLocWeight(l),0);}
function armorApAt(loc){const m=ARMOR_MAP[S.armor[loc]]||ARMOR_MAP.None;return m.ap;}
function gearEncTotal(){return S.inventory.reduce((a,it)=>a+(it.qty||0)*(it.enc||0),0)+weaponsEnc()+armorEncTotal();}
// Armour Penalty to Initiative (core rulebook, p.58, confirmed against page
// image): sum the FULL (unhalved) ENC of every worn armour location, divide
// by 5, round up, subtract from Initiative Bonus. Worked example in the book:
// a full Plated Mail suit (ENC 6/location x 7 locations = 42) => 42/5 = 8.4,
// rounded up to 9 => Initiative Penalty -9.
function armourPenaltyToInit(){
  const total=ARMOR_LOCATIONS.reduce((a,l)=>{const m=ARMOR_MAP[S.armor[l]]||ARMOR_MAP.None;return a+m.encPerLoc*armorLocWeight(l);},0);
  return total<=0?0:Math.ceil(total/5);
}
// Encumbrance (core rulebook, Encumbrance section, confirmed against page
// image): unencumbered up to STR x2. Over STR x2 ("Burdened"): skills using
// STR or DEX (including Combat Styles) are one Grade harder, Movement -2m,
// no sprinting, counts as Medium activity for Fatigue. Over STR x3
// ("Overloaded"): two Grades harder, Movement halved and walk-only, counts
// as Strenuous activity for Fatigue. STR x4 is a hard cap — cannot be
// carried at all, encumbered or not.
function encLimit(){return charsReady()?S.chars.STR*2:null;}
// `steps` is the number of Difficulty Grades this load actually costs a
// STR/DEX-based skill. It used to exist only inside the message string, which
// is why the penalty was displayed but never applied — engine.js's
// encGradeSteps() reads it now and feeds it straight into gradeForEntry().
function encStatus(){
  if(!charsReady())return null;
  const total=gearEncTotal(),lim=S.chars.STR*2,over=S.chars.STR*3,cap=S.chars.STR*4;
  if(total<=lim)return {level:"ok",steps:0,label:"Unencumbered",msg:"Within your unencumbered limit."};
  if(total<=over)return {level:"warn",steps:1,label:"Burdened",msg:"Burdened &mdash; over STR&times;2 ("+lim+"): STR/DEX-based skills (including Combat Styles) are one Grade harder, Movement -2m, no sprinting."};
  if(total<=cap)return {level:"bad",steps:2,label:"Overloaded",msg:"Overloaded &mdash; over STR&times;3 ("+over+"): STR/DEX-based skills are two Grades harder, Movement halved, walk-only."};
  return {level:"bad",steps:2,label:"Over the hard cap",msg:"Over the STR&times;4 hard cap ("+cap+") &mdash; this much cannot physically be carried, per the book. Penalties shown are Overloaded&rsquo;s; the book simply does not allow this load at all."};
}
// Shows the encumbrance penalty as applied numbers rather than as a sentence
// describing a penalty that used to never happen: which skills are affected,
// what Grade they now roll at, and what the load does to Movement.
function encEffectPanel(){
  const st=encStatus();if(!st||st.level==="ok")return "";
  const affected=allEntries().filter(e=>skillUsesStrDex(e.key));
  const sample=affected.slice(0,6).map(e=>{
    const g=gradedPct(e.key,finalPct(e.key));
    return '<tr><td>'+esc(e.label)+'</td><td class="num">'+finalPct(e.key)+'%</td>'
      +'<td class="num">'+(g.pct===null?GRADE_LABEL[g.grade]:g.pct+"%")+'</td>'
      +'<td>'+GRADE_LABEL[g.grade]+'</td></tr>';}).join("");
  const r=moveRate();
  return '<div class="encfx"><b>Applied now:</b> '+affected.length+' STR/DEX-based skill'+(affected.length===1?"":"s")
   +' (Combat Styles included) roll at <b>'+GRADE_LABEL[gradeForEntry("std:Athletics")]+'</b>'
   +' &middot; Movement <b>'+r.m+'m</b>'+(r.noSprint?" (no sprinting)":"")+(r.walkOnly?" (walk only)":"")
   +'<table class="rt"><tr><th>Skill</th><th class="num">Base</th><th class="num">Encumbered</th><th>Grade</th></tr>'+sample+'</table>'
   +(affected.length>6?'<p class="note">&hellip;and '+(affected.length-6)+' more &mdash; every STR/DEX skill on the sheet now shows the reduced figure.</p>':"")
   +'</div>';
}
/* ---- step: money & gear ---- */
function baseMult(){
  if(S.creationMode==="quick")return S.money.quickMult||0;
  return S.culture?CULTURES[S.culture].money:0;
}
function moneyTotal(){const base=S.money.dice.reduce((a,b)=>a+b,0);
  return Math.round(base*baseMult()*(S.money.mod||1));}
function stepMoney(){
  const mult=S.creationMode==="quick"?S.money.quickMult:(S.culture?CULTURES[S.culture].money:null);
  let h=head("Money & Gear","Starting silver comes from culture and social class; gear is whatever you buy with it. Encumbrance is totted up and flagged against your STR&times;2 limit, but not enforced &mdash; nothing here blocks you from carrying more.");
  h+='<div class="card"><h3>Starting money</h3>'
   +'<div class="rulequote">&ldquo;Barbarians: 4d6 &times;50 &middot; Civilised: 4d6 &times;75 &middot; Nomadic: 4d6 &times;25 &middot; Primitive: 4d6 &times;10 silver pieces. Multiply the character&rsquo;s starting money by the Money Modifier to determine the available cash&hellip;&rdquo;</div>'
   +(S.creationMode==="quick"?fld("Money multiplier (no culture in Quick Character &mdash; pick one to match the concept, e.g. 50)",'<input type="number" value="'+mult+'" onchange="APP.mon(\'quickMult\',this.value)">'):"")
   +(mult===null?'<p class="warn">Pick a culture first &mdash; the multiplier depends on it.</p>':
   '<p><button class="chip" onclick="APP.rollMoney()">Roll 4d6</button> '
    +(S.money.dice.length?S.money.dice.map(v=>'<span class="dicechip">'+v+'</span>').join("")+' &times; '+mult+' &times; modifier':"")+'</p>'
   +(SOCIAL_CLASSES[S.culture]?fld("Social class (Culture &amp; Community, p.24)",'<select onchange="APP.pickSocialClass(this.value)"><option value="">&mdash; choose, or type your own below &mdash;</option>'
     +SOCIAL_CLASSES[S.culture].map(([nm,mod])=>'<option value="'+esc(nm)+'" '+(S.money.socialClass===nm?"selected":"")+'>'+esc(nm)+' (&times;'+mod+')</option>').join("")+'</select>'):"")
   +'<div class="grid3" style="margin-top:8px">'
   +fld("Social class (free text, overrides the picker above)",'<input type="text" value="'+esc(S.money.socialClass)+'" placeholder="e.g. Freeman" onchange="APP.mon(\'socialClass\',this.value)">')
   +fld("Money modifier (from your social class table)",'<input type="number" step="0.5" value="'+S.money.mod+'" onchange="APP.mon(\'mod\',this.value)">')
   +fld("Silver spent on gear",'<input type="number" value="'+S.money.spent+'" onchange="APP.mon(\'spent\',this.value)">')
   +'</div>'
   +(S.money.dice.length?'<p style="margin-top:6px">Starting money: <b style="font-family:var(--mono);color:var(--bronze-hi)">'+moneyTotal()+' sp</b> &nbsp;&middot;&nbsp; remaining: <b style="font-family:var(--mono)">'+(moneyTotal()-(S.money.spent||0))+' sp</b></p>':"")
   +'<p class="note">Roll picks the class name automatically; use the free-text field if your Games Master gives you a specific title or a different Money Modifier.</p>')
   +'</div>';
  h+='<div class="card"><h3>Weapons</h3><p class="note">One-Handed, Two-Handed, Shield and Ranged tables (Economics &amp; Equipment, pp.63&ndash;66). No weapon has a STR/DEX minimum in Mythras.</p>'
   +'<div class="choicechips">'+WEAPONS.map(w=>'<button class="chip '+(S.gearWeapons.includes(w.name)?"on":"")+'" onclick="APP.toggleWeapon(\''+jsq(w.name)+'\')" title="'+esc(w.group+" · "+w.dmg+" · Size "+w.size+" · Reach "+w.reach+" · "+w.effects+" · ENC "+w.enc+" · AP/HP "+w.apHp+(w.traits?" · "+w.traits:"")+" · "+w.cost+"sp")+'">'+esc(w.name)+'</button>').join("")+'</div>'
   +(S.gearWeapons.length?'<table class="alloc" style="margin-top:8px"><tr><th>Weapon</th><th>Damage</th><th>Reach</th><th>Effects</th><th class="num">ENC</th><th>AP/HP</th></tr>'
     +S.gearWeapons.map(n=>{const w=WEAPON_MAP[n];if(!w)return"";
       return '<tr><td>'+esc(w.name)+' <span class="note">('+esc(w.group)+')</span></td><td class="num">'+esc(w.dmg)+'</td><td>'+esc(w.reach)+'</td><td class="note">'+esc(w.effects)+'</td><td class="num">'+w.enc+'</td>'
        +'<td class="note">'+esc(w.apHp)+'</td></tr>';}).join("")+'</table>':"")
   +'</div>';
  h+='<div class="card"><h3>Armour</h3><p class="note">Armour Table (Economics &amp; Equipment, p.58). Armour Points (AP) reduce damage to that location; worn armour counts as half its packed ENC, and total worn ENC also reduces Initiative (see below).</p>'
   +'<div class="grid3">'+ARMOR_LOCATIONS.map(loc=>fld(loc,'<select onchange="APP.setArmor(\''+jsq(loc)+'\',this.value)">'
     +ARMOR_MATERIALS.map(m=>'<option value="'+esc(m.name)+'" '+(S.armor[loc]===m.name?"selected":"")+'>'+esc(m.name)+' (AP '+m.ap+')</option>').join("")+'</select>')).join("")+'</div>'
   +'<p class="note" style="margin-top:6px">Armour ENC (worn, halved): <b style="font-family:var(--mono)">'+armorEncTotal()+'</b> &nbsp;&middot;&nbsp; Armour Penalty to Initiative: <b style="font-family:var(--mono)">-'+armourPenaltyToInit()+'</b></p></div>';
  h+='<div class="card"><h3>Inventory</h3><table class="alloc"><tr><th>Item</th><th class="num">Qty</th><th class="num">ENC each</th><th></th></tr>'
   +S.inventory.map((it,i)=>'<tr><td><input type="text" value="'+esc(it.name)+'" style="width:100%" onchange="APP.inv('+i+',\'name\',this.value)"></td>'
    +'<td class="num"><input type="number" value="'+it.qty+'" onchange="APP.inv('+i+',\'qty\',this.value)"></td>'
    +'<td class="num"><input type="number" step="0.5" value="'+it.enc+'" onchange="APP.inv('+i+',\'enc\',this.value)"></td>'
    +'<td><button class="chip" aria-label="remove item" onclick="APP.invDel('+i+')">&times;</button></td></tr>').join("")
   +'</table><p style="margin-top:8px"><button class="chip" onclick="APP.invAdd()">+ add item</button> &nbsp;<span class="note">Inventory ENC: <b style="font-family:var(--mono)">'+S.inventory.reduce((a,it)=>a+(it.qty||0)*(it.enc||0),0)+'</b> &nbsp;&middot;&nbsp; Total gear ENC (weapons + armour + inventory): <b style="font-family:var(--mono)">'+gearEncTotal()+'</b>'
   +(encLimit()!==null?' &nbsp;&middot;&nbsp; Unencumbered limit (STR&times;2): <b style="font-family:var(--mono)">'+encLimit()+'</b>':"")+'</span>'
   +(encStatus()&&encStatus().level!=="ok"?'<p class="'+(encStatus().level==="bad"?"warn":"note")+'" style="margin-top:4px">'+encStatus().msg+'</p>'+encEffectPanel():"")+'</p></div>';
  return h;
}
/* ---- step: sheet & export ---- */
// One key/value row for the dense sheet's small boxes (Player & Character,
// Background, Equipment, Money, etc). Value is expected pre-escaped/safe
// where it comes from esc() already; plain numbers pass through fine.
function mkv(k,v){return '<div class="mkv"><span>'+k+'</span><b>'+v+'</b></div>';}
// Small inline body-outline diagram for the Hit Locations box — seven dots
// (Head/Chest/Abdomen/R+L Arm/R+L Leg) each showing that location's current
// AP, echoing the dot-diagram most printed Mythras/BRP-family sheets use
// next to the Hit Location table.
function bodyDiagramSvg(){
  const pts=[["Head",30,9],["Chest",30,27],["Abdomen",30,43],
    ["Right Arm",13,29],["Left Arm",47,29],["Right Leg",22,70],["Left Leg",38,70]];
  return '<svg viewBox="0 0 60 90" class="mbodysvg" aria-hidden="true">'
   +pts.map(([lbl,x,y])=>{const base=lbl.replace(/Right |Left /,"Each ");const ap=armorApAt(base);
     return '<circle cx="'+x+'" cy="'+y+'" r="7.5"><title>'+esc(lbl)+' — AP '+ap+'</title></circle>'
      +'<text x="'+x+'" y="'+(y+2.6)+'" text-anchor="middle">'+ap+'</text>';}).join("")
   +'</svg>';
}
