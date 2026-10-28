const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const legacy=fs.readFileSync(path.join(root,'forge.html'),'utf8');
const publicViews=fs.readFileSync(path.join(root,'js/sitota.js'),'utf8');
const scripts=[...home.matchAll(/<script src="(js\/[^"?]+)[^"]*"/g)].map(m=>m[1]);
assert.deepEqual(scripts,['data','engine','cloud','wiki-data','wiki','sitota','render','router','play','app'].map(n=>'js/'+n+'.js'));
for(const route of ['my-characters','my-campaigns','wiki','character/new','account','world/welcome'])assert(home.includes('href="#/'+route+'"'),route);
assert.equal((home.match(/<header\b/g)||[]).length,1);
assert(!home.includes('forge.html'),'normal navigation must stay in the unified application');
assert(!/Open (?:Mythras )?Forge/.test(home+publicViews),'no second landing-page destination');
assert.match(publicViews,/st-home-16x9/);
assert.match(home,/js\/sitota\.js\?v=4/,'home renderer cache version must advance with the redesign');
assert.match(home,/sitota-home-16x9\.css\?v=2/,'painted homepage CSS cache version must advance');
assert.match(publicViews,/Art: Richard Wright/);
for(const action of ['APP.newCampaign()','APP.homeJoinCampaign()','APP.fromMenuContinue()','APP.fromMenuNew()'])assert(publicViews.includes(action),action);
assert(!/data:image\/(jpeg|png);base64/u.test(home+publicViews),'no inline AI or sample images');
assert(home.includes('sitota-home-16x9.css'),'16:9 stylesheet missing');
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
assert.match(fs.readFileSync(path.join(root,'sitota-forge.css'),'utf8'),/body\.sheet-mode \.sitota-header\{display:none\}/);
console.log('PASS unified application host, direct navigation, retained home actions, scoped design, legacy route and auth redirects');
