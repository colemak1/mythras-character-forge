const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const forge=fs.readFileSync(path.join(root,'forge.html'),'utf8');
const original=require('node:child_process').execFileSync('git',['show','6d2e63918276371c5cdd562b6b84c8e7695dc74d:index.html'],{cwd:root,encoding:'utf8'});
for(const script of [...original.matchAll(/<script src="([^"]*js\/[^"]+)"/g)].map(m=>m[1]))
 assert(forge.includes(`<script src="${script}"`),'Forge application script changed: '+script);
assert.match(forge,/sitota-forge\.css/);
assert.match(forge,/class="sitota-header"/);
assert.match(home,/Welcome to<br><em>New Sit’ota/);
assert.match(home,/href="#\/world\/welcome"/);
for(const route of ['my-characters','my-campaigns','wiki','character/new','account'])
 assert(home.includes('forge.html#/'+route),'missing Forge link: '+route);
assert.match(home,/location\.replace\('forge\.html'\+location\.search\+location\.hash\)/);
assert.match(home,/\['code','token_hash','error','error_code','error_description','type'\]/);
assert(!home.includes('SUPABASE_ANON_KEY'),'public homepage should not load app configuration');
assert(!/data:image\/(jpeg|png);base64|<img\b|[✦⚔✧]/u.test(home),'homepage must not include generated art or decorative emoji');
console.log('PASS Sit’ota homepage, guide, Forge links, auth handoff, art-free visual system');
