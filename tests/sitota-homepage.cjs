const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const legacy=fs.readFileSync(path.join(root,'forge.html'),'utf8');
const publicViews=fs.readFileSync(path.join(root,'js/sitota.js'),'utf8');
const scripts=[...home.matchAll(/<script src="(js\/[^"?]+)[^"]*"/g)].map(m=>m[1]);
assert.deepEqual(scripts,['combat-rules','data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app','practice'].map(n=>'js/'+n+'.js'));
for(const route of ['my-characters','my-campaigns','wiki','account','world/welcome'])assert(home.includes('href="#/'+route+'"'),route);
assert(!home.includes('href="#/character/new"'),'Create Character must not return to the header');
assert(publicViews.includes('href="#/character/new"'),'home retains the create character card');
assert.equal((home.match(/<header\b/g)||[]).length,1);
assert(!home.includes('forge.html'),'normal navigation must stay in the unified application');
assert(!/Open (?:Mythras )?Forge/.test(home+publicViews),'no second landing-page destination');
// Codex · Stone backdrop hero (owner, 2026-11-09).
assert.match(publicViews,/st-stone-home/);
assert.match(home,/js\/sitota\.js\?v=[0-9a-f]{10}/,'home renderer is version-stamped (freshness enforced by tests/asset-versions.cjs)');
assert.match(home,/sitota-theme\.css\?v=[0-9a-f]{10}/,'Stone theme CSS is version-stamped');
assert.match(publicViews,/Art: Richard Wright/);
assert.match(publicViews, /class="st-bd-world" href="#\/world\/welcome"/, 'hero must use the quieter editorial link');
assert(!/class="st-button st-primary" href="#\/world\/welcome"/.test(publicViews),'remove ornate homepage CTA');
for(const action of ['APP.newCampaign()','APP.homeJoinCampaign()','APP.fromMenuContinue()','APP.fromMenuNew()'])assert(publicViews.includes(action),action);
assert(!/data:image\/(jpeg|png);base64/u.test(home+publicViews),'no inline AI or sample images');
assert(home.indexOf('sitota-theme.css')>home.indexOf('sitota-menus.css'),'Stone theme loads last');
assert(!home.includes('sitota-home-16x9.css'),'the old 16:9 home styles are retired');
assert.match(publicViews,/assets\/sitota-hero\.avif/,'home hero uses the painted art');
assert(fs.existsSync(path.join(root,'assets/sitota-hero.avif')),'original painted hero is missing');
assert(fs.existsSync(path.join(root,'assets/sitota-hero.webp')),'fallback painted hero is missing');
assert(!legacy.includes('<script src='),'legacy entry must redirect before starting a second runtime');
const redirect=legacy.match(/<script>([\s\S]*?)<\/script>/)[1];
for(const [search,hash] of [
 ['', '#/character/a%2Fb/play'],['?campaign=abc&x=a%20b','#/join/A%2BB'],
 ['?code=test%2Bvalue&type=recovery','#/account'],
 ['', '#access_token=test&refresh_token=test&type=recovery'],
 ['?error=access_denied&error_description=Expired%20link','#/account'],['','']
]){
 let target;vm.runInNewContext(redirect,{location:{search,hash,replace:v=>target=v}});
 assert.equal(target,'./'+search+hash,'legacy URLs preserve query and fragment byte-for-byte');
}
const css=fs.readFileSync(path.join(root,'sitota-public.css'),'utf8');
assert(!css.includes(':root'),'public variables must not override application tokens');
assert.doesNotMatch(fs.readFileSync(path.join(root,'sitota-forge.css'),'utf8'),/body\.sheet-mode \.sitota-header\{display:none\}/,'the character sheet keeps the site header (owner, 2026-11-09)');
assert.match(fs.readFileSync(path.join(root,'sitota-header.css'),'utf8'),/@media print\{\.sitota-header/,'printing still hides it');
console.log('PASS unified application host, direct navigation, retained home actions, scoped design, legacy route and auth redirects');
