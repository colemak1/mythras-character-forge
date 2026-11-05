// Folk Magic catalogue (decision D-1): Core pp.123-129 data from
// docs/folk-magic-catalogue.json, loaded into FOLK_MAGIC in js/data.js.
// Run with `node tests/magic-folk-catalogue.cjs`.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),store=new Map();
const ctx={console,URL,URLSearchParams,Date,Map,Set,WeakMap,setTimeout,clearTimeout,setInterval,clearInterval,
 localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},
 document:{getElementById:()=>null,querySelector:()=>null,addEventListener(){},removeEventListener(){}},
 location:{hash:'#/',pathname:'/mythras-character-forge/',origin:'https://example.test'},
 supabase:{createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}})},
 requestAnimationFrame(){},confirm:()=>true};
ctx.window=ctx;ctx.scrollTo=()=>{};ctx.addEventListener=()=>{};vm.createContext(ctx);
for(const name of ['data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app']){
 let src=fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
 if(name==='app')src=src.replace(/boot\(\);\s*$/,'');
 vm.runInContext(src,ctx,{filename:name+'.js'});
}
const run=s=>vm.runInContext(s,ctx);
const test=(name,fn)=>{fn();console.log('PASS '+name);};
const source=JSON.parse(fs.readFileSync(path.join(root,'docs/folk-magic-catalogue.json'),'utf8'));
const spell=n=>source.find(s=>s.n===n);

test('the app catalogue matches docs/folk-magic-catalogue.json exactly (rerun scripts/build-folk-magic.py)',()=>{
 assert.deepEqual(JSON.parse(run('JSON.stringify(FOLK_MAGIC)')),source);
});
test('70 unique spells in book order, each with a Core page from 123 to 129',()=>{
 assert.equal(source.length,70);assert.equal(new Set(source.map(s=>s.n)).size,70);
 for(let i=1;i<source.length;i++)assert(source[i].p>=source[i-1].p,source[i].n+' is out of page order');
 assert(source.every(s=>s.p>=123&&s.p<=129&&s.d.trim()));
});
test('every trait is a known trait with an explanation, including Trigger (FM-021)',()=>{
 const known=new Set(Object.keys(run('MAGIC_TRAITS')));
 for(const s of source)for(const t of s.t)assert(known.has(t),s.n+': unknown trait '+t);
 assert.match(run('MAGIC_TRAITS.Trigger'),/expires/);
});
test('only (X) spells ask for a specialisation (FM-S05, FM-S27)',()=>{
 for(const s of source)assert.equal(!!s.spec,s.n.includes('(X)'),s.n);
 assert.match(spell('Find (X)').d,/Find Arrows.*Find Flaw.*Find Livestock.*Find Loot.*Find Object.*Find Sickness/s);
});
test('PDF extraction artefacts are fixed',()=>{
 assert.match(spell('Bladesharp').d,/2d8\+2 damage\. \(1d4>1d6>1d8>1d10>2d6>2d8>2d10\)/);
 for(const s of source){assert(!s.d.includes(' · '),s.n+' has a stray middle dot');assert(!/[a-z]\.[A-Z]/.test(s.d),s.n+' is missing a space after a full stop');}
});
test('spot checks of traits against the cases (FM-S09, S10, S16, S33, S56, S58, S61)',()=>{
 assert.deepEqual(spell('Breath').t,['Touch']);
 assert(spell('Bypass').t.includes('Trigger')&&spell('Coordination').t.includes('Trigger'));
 assert.deepEqual(spell('Heal').t,['Instant','Touch']);
 assert(spell('Shock').t.includes('Resist (Evade)'));
 assert(spell('Sleep').t.includes('Resist (Endurance)'));
 assert(spell('Spiritshield').t.includes('Concentration'));
});
test('the builder lists all 70 spells and a picked spell shows traits, page and specialisation',()=>{
 run('S=freshState();magicSkillPct=()=>40;render=()=>{};');
 const picker=run('folkMagicPicker()');
 for(const s of source)assert(picker.includes('>'+s.n+'</button>'),s.n+' missing from the picker');
 run('APP.toggleFolkSpell("Beastcall (X)");APP.folkSpec("Beastcall (X)","Wolf");');
 const after=run('folkMagicPicker()');
 assert.match(after,/Core p\.124/);assert.match(after,/placeholder="speciality: animal type"/);assert.match(after,/Resist \(Willpower\)/);
 assert.equal(run('magicLabel({tradition:"folk",name:"Beastcall (X)",spec:"Wolf"})'),'Beastcall (Wolf)');
});
test('a previously hand-typed spell name now resolves to the catalogue entry',()=>{
 run('S=freshState();S.magic.folk=[{name:"Light",spec:""}];');
 assert.equal(run('allMagic()[0].spell.t.join(", ")'),'Concentration, Ranged');
 run('render=()=>{};viewOnlyBlock=()=>false;magicSkillKey=()=>"prof:Folk Magic";finalPct=()=>50;gradedPct=()=>({pct:50,grade:"standard"});');
 assert.match(run('magicPanel()'),/ranged 50 m · Concentration, Ranged/);
});
console.log('Folk Magic catalogue tests passed');
