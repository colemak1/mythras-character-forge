'use strict';
// Exercise the real sheet -> session handoff -> arena, with no account writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),stored=new Map();
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setTimeout,clearTimeout,setInterval,clearInterval,
 localStorage:{getItem:()=>null,setItem(){},removeItem(){}},sessionStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,String(v))},
 document:{querySelector:()=>null,getElementById:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/',origin:'https://example.test',pathname:'/',assign(url){ctx.destination=url;}},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app','practice']){
 let code=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')code=code.replace(/boot\(\);\s*$/,'');
 vm.runInContext(code,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx),plain=v=>JSON.parse(JSON.stringify(v));
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
run(`S=freshState();S.concept.name='Open editor';var editor=S;var editorBefore=JSON.stringify(S);
 var actor=freshState();actor.concept.name='Annunaki trainee';actor.concept.player='Luke';
 actor.chars={STR:13,CON:12,SIZ:14,DEX:15,INT:14,POW:11,CHA:10};
 actor.fixedAP=2;actor.cultStyleOn=true;actor.cultStyleName='Annunaki';
 actor.alloc.culture['style:cult']=30;actor.alloc.bonus['std:Endurance']=25;
 actor.xp.bonus['style:cult']=9;actor.xp.characteristics.permanent.STR=1;
 actor.styleDefs['style:cult']={weapons:['Broadsword','Heater','Greatsword'],traits:['Defensive Minded']};
 actor.gearWeapons=['Broadsword','Heater','Greatsword','Longbow'];
 actor.armor.Chest='Plated Mail (splinted chainmail)';actor.play.hp['Right Arm']=-2;actor.play.apUsed=2;
 actor.play.hpMaxOverride.Chest=6;
 var entry={id:'saved',ownerId:'user',state:actor};var actorBefore=JSON.stringify(actor);
 var profile=practiceSnapshot(entry);`);
check('Profile calculation preserves the editor object and saved actor byte for byte',()=>{
 assert.equal(run('S===editor'),true);assert.equal(run('JSON.stringify(S)'),run('editorBefore'));assert.equal(run('JSON.stringify(actor)'),run('actorBefore'));
});
check('Profile preserves advancement, allocated skills, fixed AP and permanent HP maximums',()=>{
 assert.equal(run('profile.chars.STR'),14);assert.equal(run('profile.styles[0].percent'),68);
 assert.equal(run('profile.apMax'),2);assert.equal(run('profile.hp.Chest'),6);assert.equal(run('profile.skills.Endurance'),49);
 assert.equal(run('profile.armour.Chest'),7);assert.equal(run('profile.armourInitPenalty'),2);
 assert.equal(run('profile.unsupportedGear[0]'),'Longbow');
});
check('A failed profile restores the editor too',()=>{
 assert.throws(()=>run('practiceSnapshot({state:freshState()})'),/characteristics/);assert.equal(run('S===editor'),true);
});
function arena(payload,forge=true){
 const output={innerHTML:'',addEventListener(){}},sandbox={console,setTimeout,clearTimeout,setInterval,clearInterval,URLSearchParams,
  location:{search:forge?'?forge=1':''},sessionStorage:{getItem:()=>payload},localStorage:{getItem:()=>null,setItem(){}},alert(){},
  document:{querySelector:s=>s==='#root'?output:s==='#homeLink'?{addEventListener(){}}:null,querySelectorAll:()=>[],getElementById:()=>null},
  window:{matchMedia:()=>({matches:false}),requestAnimationFrame(){}}};
 vm.createContext(sandbox);
 vm.runInContext(fs.readFileSync(path.join(root,'js/data.js'),'utf8'),sandbox); // the arena loads ../js/data.js first
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-character.js'),'utf8'),sandbox);
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/practice-guidance.js'),'utf8'),sandbox);
 vm.runInContext(fs.readFileSync(path.join(root,'experiments/pits-view.js'),'utf8'),sandbox);
 const source=fs.readFileSync(path.join(root,'experiments/practice-combat.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
 vm.runInContext(source,sandbox);
 return {run:s=>vm.runInContext(s,sandbox),html:()=>output.innerHTML};
}
(async()=>{
 run(`AUTH_USER={id:'user'};render=()=>{};openCharUnified=async()=>entry;`);
 await run(`APP.openCharToPractice('saved')`);
 check('Main-site Practice action passes a compact profile in this tab and leaves saves unchanged',()=>{
  assert.equal(ctx.destination,'experiments/practice-combat.html?forge=1');
  assert(!stored.get('sitota-practice-character-v1').includes('woundEvents'));
  assert.equal(run('JSON.stringify(actor)'),run('actorBefore'));
 });
 const snapshot=stored.get('sitota-practice-character-v1'),a=arena(snapshot);
 check('Imported setup shows the selected character, coverage limits and an owned trained loadout',()=>{
  assert.match(a.html(),/Annunaki trainee/);assert.match(a.html(),/Defensive Minded/);assert.match(a.html(),/Longbow/);
  assert(!a.html().includes('id="style"'));assert(!a.html().includes('Local PvP'));assert.match(a.html(),/id="practiceStyle"/);
 });
 a.run(`startRun(true)`);
 check('Arena uses exact imported combat, resistance, AP, HP and armour values',()=>{
  const f=plain(a.run('S.fighters.a')),p=plain(run('profile'));
  assert.equal(f.style,68);assert.equal(f.str,14);assert.equal(f.apMax,2);
  assert.deepEqual(f.hp,p.hp);assert.deepEqual(f.armourLocations,p.armour);
  assert.equal(f.endurance,49);assert.equal(f.armourInitPenalty,2);
  assert.equal(f.athletics,p.skills.Athletics);assert.equal(f.brawn,p.skills.Brawn);
 });
 a.run(`S.fighters.a.hp.Head=-5;S.phase='between';nextEncounter()`);
 check('Normal next opponent restores the imported maxima without changing the source',()=>{
  assert.deepEqual(plain(a.run('S.fighters.a.hp')),plain(run('profile.hp')));
  assert.equal(run('JSON.stringify(actor)'),run('actorBefore'));
 });
 a.run(`config.mode='hardcore';startRun(true);S.fighters.a.hp.Head=1;S.phase='between';nextEncounter()`);
 check('Hardcore carries only the arena injury forward; retry starts a fresh copy',()=>{
  assert.equal(a.run('S.fighters.a.hp.Head'),1);a.run('startRun(true)');assert.equal(a.run('S.fighters.a.hp.Head'),run('profile.hp.Head'));
 });
 a.run(`S.phase='setup';config.weapon='greatsword';config.shield='heater';applyPracticeLoadout()`);
 check('Two-handed selection cannot retain a shield',()=>assert.equal(a.run('config.shield'),'none'));
 const zero=JSON.parse(snapshot);zero.styles[0].percent=0;zero.skills.Evade=0;
 const z=arena(JSON.stringify(zero));z.run('readSetupInputs();startRun(true)');
 check('Imported zero-percent skills are preserved without sample-form clamping',()=>{
  assert.equal(z.run('S.fighters.a.style'),0);assert.equal(z.run('S.fighters.a.evade'),0);
 });
 const blocked=JSON.parse(snapshot);blocked.styles[0].weapons=[];
 const b=arena(JSON.stringify(blocked));b.run('startRun(true)');
 check('An unsupported loadout blocks entry instead of substituting a practice fighter',()=>{
  assert.equal(b.run('S.phase'),'setup');assert(!b.html().includes('Kethan Voss'));assert.match(b.html(),/data-act="start" disabled/);
 });
 check('Missing or malformed handoffs show recovery and cannot start a preset run',()=>{
  for(const raw of [null,'{bad}',JSON.stringify({...JSON.parse(snapshot),apMax:NaN})]){
   const bad=arena(raw);bad.run('startRun(true)');assert.equal(bad.run('S.phase'),'setup');assert.match(bad.html(),/could not be loaded/);
  }
 });
 check('A direct arena visit retains the independent demo',()=>assert.match(arena(snapshot,false).html(),/Kethan Voss/));
 run(`entry.ownerId='someone-else';`);ctx.destination=null;await run(`APP.openCharToPractice('saved')`);
 check('A character owned by someone else cannot be sent to practice',()=>assert.equal(ctx.destination,null));
 console.log(checks+' character-practice integration checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
