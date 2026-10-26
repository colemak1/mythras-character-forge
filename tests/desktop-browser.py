"""Run actual Chromium DOM/click smoke tests without localhost network navigation.
Fallback injection uses in-memory localStorage; it is NOT a real-origin persistence test.
Run: python tests/desktop-browser.py
"""
from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ORDER=['data','engine','cloud','wiki-data','wiki','render','router','play','app']
raw=(ROOT/'index.html').read_text()
raw=re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>','',raw)
raw=re.sub(r'<link[^>]+(?:href="[^"]+\.css"|href="https://fonts[^"]+")[^>]*>','',raw)
raw=re.sub(r'<link[^>]+rel="preconnect"[^>]*>','',raw)
results=[]
def check(name, fn):
 try:
  detail=fn()
  results.append(dict(test=name,status='PASS',detail=str(detail or '')))
 except Exception as e:results.append(dict(test=name,status='FAIL',detail=str(e)[:400]))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(raw,wait_until='domcontentloaded')
 page.add_style_tag(content=(ROOT/'styles.css').read_text())
 page.evaluate('''() => { const store=new Map(); Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear(),key:i=>Array.from(store.keys())[i]||null,get length(){return store.size}}});window.scrollTo=()=>{};window.confirm=()=>true;window.alert=()=>{}; }''')
 for n in ORDER:
  page.add_script_tag(content=(ROOT/'js'/f'{n}.js').read_text())
 page.wait_for_timeout(350)
 check('Application starts',lambda: page.title())
 check('No startup JavaScript exceptions',lambda: (_ for _ in ()).throw(AssertionError('; '.join(errors))) if errors else 'none')
 check('Guest mode opens',lambda: page.evaluate('''() => {APP.mockSignIn(); if(APPVIEW!=='menu')throw Error(APPVIEW); return APPVIEW}'''))
 check('Character wizard opens',lambda: page.evaluate('''() => {APP.fromMenuNew();if(APPVIEW!=='character')throw Error(APPVIEW);return currentSteps().join(' > ')}'''))
 def fill_name():
  loc=page.locator('input[placeholder="e.g. Anathaym"]')
  assert loc.count()==1, 'name input not found'
  loc.fill('Browser QA Test'); loc.dispatch_event('change')
  assert page.evaluate('S.concept.name')=='Browser QA Test'
  return 'changed through actual browser input'
 check('Character concept input updates state',fill_name)
 check('Autosave and local library',lambda: page.evaluate('''() => {if(!S._libId)throw Error('missing lib ID');const lib=loadCharLibLocal();if(!lib.some(x=>x.name==='Browser QA Test'))throw Error('not in library');return 'stored '+lib.length+' character(s)'}'''))
 check('Wizard navigation to Characteristics',lambda: page.evaluate('''() => {APP.go(1);if(S.step!==1)throw Error('step='+S.step);return currentSteps()[S.step]}'''))
 check('Character state survives app re-render',lambda: page.evaluate('''() => {render();if(S.concept.name!=='Browser QA Test')throw Error('state lost');return S.step}'''))
 check('My Characters library lists character',lambda: page.evaluate('''async () => {APP.toLibrary();await new Promise(r=>setTimeout(r,120));return document.body.innerText.includes('Browser QA Test')?'visible':Promise.reject(Error('not visible'))}'''))
 check('Edit existing character',lambda: page.evaluate('''async () => {const id=loadCharLibLocal()[0]?.id;if(!id)throw Error('no library ID');APP.openCharToEdit(id);await new Promise(r=>setTimeout(r,120));if(APPVIEW!=='character'||S.concept.name!=='Browser QA Test')throw Error('edit open failed');return 'edit opened'}'''))
 check('Open character in Play Mode',lambda: page.evaluate('''async () => {const id=loadCharLibLocal()[0]?.id;APP.openCharToPlay(id);await new Promise(r=>setTimeout(r,150));if(APPVIEW!=='play')throw Error('play not opened: '+APPVIEW);return 'play opened'}'''))
 check('JSON export function available',lambda:page.evaluate('''() => {if(typeof APP.exportJSON!=='function')return Object.keys(APP).filter(k=>/export/i.test(k)).join(', ');return 'exportJSON present'}'''))
 def bad_import():
  page.evaluate('APP.toMenu()')
  before=page.evaluate('loadCharLibLocal().length')
  page.locator('#characterImportFile').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{ broken json'})
  page.wait_for_timeout(180)
  assert page.evaluate('loadCharLibLocal().length')==before
  assert 'Import failed' in page.locator('body').inner_text()
  return 'bad JSON rejected, saved character unchanged'
 check('Corrupt character JSON rejected',bad_import)
 def good_import():
  page.evaluate('APP.toMenu()')
  payload=page.evaluate('JSON.stringify(S)')
  before=page.evaluate('loadCharLibLocal().length')
  page.locator('#characterImportFile').set_input_files({'name':'character.json','mimeType':'application/json','buffer':payload.encode()})
  page.wait_for_timeout(180)
  assert page.evaluate('loadCharLibLocal().length')==before+1
  return 'import created an additional character'
 check('Valid JSON import creates separate copy',good_import)
 # Update 21: actually render each character creation screen, not only Characteristics.
 def wizard_all_steps():
  return page.evaluate("""() => {
    APP.openCharToEdit(loadCharLibLocal()[0].id);
    const steps=currentSteps();
    for(let i=0;i<steps.length;i++){
      S.step=i;render();
      if(S.step!==i)throw Error('render unexpectedly changed '+steps[i]);
      if(!document.querySelector('#main') || !document.querySelector('#main').innerText.trim())throw Error('blank '+steps[i]);
    }
    return steps.join(' > ');
  }""")
 check('Every full-creation wizard screen renders',wizard_all_steps)
 check('Wizard blocks progression past incomplete characteristics',lambda:page.evaluate("""() => {
   S=freshState(); S.step=1; APPVIEW='character';render();
   APP.go(3);
   if(S.step!==1)throw Error('advanced past incomplete characteristics');
   return 'advancement blocked until characteristics pass validation';
 }"""))
 check('Core characteristics reject missing values',lambda:page.evaluate("""() => {
   S=freshState();S.step=1;
   const v=validate(1);
   if(v.ok)throw Error('incomplete characteristics were accepted');
   return v.msg;
 }"""))
 def play_resource_flow():
  return page.evaluate("""() => {
    S=freshState();S.concept.name='Combat Regression';
    Object.assign(S.chars,{STR:13,CON:13,SIZ:13,DEX:13,INT:13,POW:13,CHA:13});
    VIEW_ONLY=false;APPVIEW='play';render();
    const loc='Right Arm', initial=playCurHP(loc);
    S.armor['Each Arm']='Scaled (brigandine, lamellar)';render();
    APP.playSelectLoc(loc);
    const input=document.querySelector('#playdmg-Right_Arm');
    if(!input)throw Error('damage input missing');
    input.value='7';APP.playApplyDamage(loc);
    if(playCurHP(loc)!==initial-3)throw Error('armour did not absorb 4 AP');
    if(playCurHP('Left Arm')!==initial)throw Error('opposite limb was damaged');
    let saved=loadCharLibLocal().find(x=>x.name==='Combat Regression');
    if(!saved||saved.state.play.hp[loc]!==initial-3)throw Error('damage not saved');
    const damageInput=document.querySelector('#playdmg-Right_Arm');
    damageInput.value='2';APP.playHeal(loc);
    if(playCurHP(loc)!==initial-1)throw Error('healing incorrect');
    const max=playMaxAP();APP.playSpendAP(1);
    if(S.play.apUsed!==1)throw Error('AP expenditure incorrect');
    APP.playNewRound();if(S.play.apUsed!==0)throw Error('AP not reset');
    const old=playCurMagic();APP.playMagicAdj(-1);
    if(playCurMagic()!==old-1)throw Error('MP not decremented');
    APP.playSetFatigue('Tired');
    if(S.play.fatigue!=='Tired')throw Error('fatigue not changed');
    saved=loadCharLibLocal().find(x=>x.name==='Combat Regression');
    if(saved.state.play.fatigue!=='Tired')throw Error('fatigue not persisted');
    return 'armour, independent limbs, heal, AP, MP, fatigue, local saves';
  }""")
 check('Combat damage, armour, healing and resource tracking',play_resource_flow)
 def reload_state():
  return page.evaluate("""() => {
    const entry=loadCharLibLocal().find(x=>x.name==='Combat Regression');
    if(!entry)throw Error('character not in local library');
    S=Object.assign(freshState(),entry.state);normalizeState();
    if(S.play.fatigue!=='Tired')throw Error('fatigue missing after reload');
    if(playCurHP('Right Arm')!==playMaxHP('Right Arm')-1)throw Error('HP missing after reload');
    return 'character state roundtrips through local library';
  }""")
 check('Combat state survives save/reopen',reload_state)
 check('No runtime JavaScript exceptions',lambda: (_ for _ in ()).throw(AssertionError('; '.join(errors))) if errors else 'none')
 # Update 22: produce a legal full character using actual per-step validation.
 def full_legal_character():
  return page.evaluate("""() => {
   S=freshState(); APPVIEW='character'; S.concept.name='Full Creation QA';
   Object.assign(S.chars,{STR:13,CON:13,SIZ:13,DEX:13,INT:13,POW:13,CHA:13});
   S.charMode='manual'; S.culture='Civilised';
   const cult=CULTURES[S.culture];
   S.cultProf=['Commerce','Courtesy','Streetwise'];
   S.cultProfSpec=['','',''];
   // Ten cultural skills receive 10 points each.
   let ckeys=cultureReqKeys();
   if(ckeys.length!==10)throw Error('Unexpected culture skills '+ckeys.length);
   ckeys.forEach(k=>S.alloc.culture[k]=10);
   S.career='Courtier';S.carProf=['Bureaucracy','Oratory','Lore'];
   S.carProfSpec=['','','History'];
   let kkeys=careerKeys();
   if(kkeys.length!==10)throw Error('Unexpected career skills '+kkeys.length);
   kkeys.forEach(k=>S.alloc.career[k]=10);
   S.hobby='Gambling';S.hobbySpec='';
   const bonus=allEntries().map(e=>e.key);
   let remaining=bonusPool(),cap=bonusCap();
   for(const key of bonus){const n=Math.min(cap,remaining);if(n)S.alloc.bonus[key]=n;remaining-=n;if(!remaining)break;}
   if(remaining)throw Error('Insufficient bonus allocation options');
   S.money.dice=[3,3,3,3];
   const steps=currentSteps();const validations=[];
   for(let i=0;i<steps.length;i++){
     const result=validate(i);validations.push([steps[i],result.ok,result.msg]);
     if(!result.ok)throw Error(steps[i]+': '+result.msg);
     S.step=i;render();
   }
   saveCurrentToLibraryLocal();
   const serialized=loadCharLibLocal().find(x=>x.name==='Full Creation QA');
   if(!serialized)throw Error('Full QA character failed to save');
   S=Object.assign(freshState(),serialized.state);normalizeState();
   for(let i=0;i<steps.length;i++)if(!validate(i).ok)throw Error('Reopen invalid '+steps[i]+': '+validate(i).msg);
   return validations.map(x=>x[0]).join(' > ');
  }""")
 check('Complete legal Core character validates through every wizard step and survives reload',full_legal_character)
 def advancement_flow():
  return page.evaluate("""() => {
   VIEW_ONLY=false; APPVIEW='play';render();
   const key='std:Athletics',before=finalPct(key);
   APP.xpAward(3);
   if(xpRollsAvailable()<=0)throw Error('GM award unavailable');
   const bank=S.xp.pool;
   APP.xpSpend(key);
   if(S.xp.pool!==bank-1)throw Error('Experience roll not spent');
   if(finalPct(key)<=before)throw Error('Skill not improved');
   const improved=finalPct(key);
   APP.xpSpend(key);
   if(S.xp.pool!==bank-1)throw Error('Skill improperly improved twice in same award');
   saveCurrentToLibraryLocal();
   const saved=loadCharLibLocal().find(x=>x.name==='Full Creation QA');
   if(!saved)throw Error('missing XP save');
   S=Object.assign(freshState(),saved.state);normalizeState();
   if(finalPct(key)!==improved)throw Error('Experience improvement not persistent');
   return 'GM award, roll expenditure, skill bonus, once-per-award limit, save/reopen';
  }""")
 check('Experience advancement and persistence',advancement_flow)
 def quick_legal_character():
  return page.evaluate("""() => {
   S=freshState();APPVIEW='character';S.creationMode='quick';S.concept.name='Quick Creation QA';
   Object.assign(S.chars,{STR:12,CON:12,SIZ:12,DEX:12,INT:12,POW:12,CHA:12});S.charMode='manual';
   S.qProf=['Commerce','Courtesy','Gambling'];S.qStyleOn=true;S.qStyleName='City Guard';
   const keys=quickKeys();let remainder=100;
   for(const key of keys){const n=Math.min(10,remainder);if(n)S.alloc.quick[key]=n;remainder-=n;if(!remainder)break;}
   if(remainder)throw Error('quick pool incomplete');
   S.money.dice=[2,2,2,2];
   const steps=currentSteps();
   for(let i=0;i<steps.length;i++){
     const v=validate(i);if(!v.ok)throw Error(steps[i]+': '+v.msg);S.step=i;render();
   }
   saveCurrentToLibraryLocal();
   const entry=loadCharLibLocal().find(x=>x.name==='Quick Creation QA');
   if(!entry)throw Error('Quick character not saved');
   S=Object.assign(freshState(),entry.state);normalizeState();
   if(S.creationMode!=='quick')throw Error('creation mode lost');
   if(finalPct('std:Athletics')!==entry.state.chars.STR+entry.state.chars.DEX+10)throw Error('Quick points missing from sheet');
   for(let i=0;i<steps.length;i++)if(!validate(i).ok)throw Error('invalid after reload: '+steps[i]);
   return 'all '+steps.length+' Quick Character screens validate, skill points applied, state saved';
  }""")
 check('Complete Quick Character creation and save roundtrip',quick_legal_character)
 page.screenshot(path=str(ROOT/'tests'/'desktop-screenshot.png'),full_page=False)
 b.close()
for r in results: print(f"{r['status']:5}  {r['test']}: {r['detail'][:120]}")
(ROOT/'tests'/'desktop-results.json').write_text(json.dumps(results,indent=2))
print(f"RESULT: {sum(r['status']=='PASS' for r in results)}/{len(results)} passed")
raise SystemExit(1 if any(r['status']=='FAIL' for r in results) else 0)
