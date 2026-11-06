// Every local `?v=` asset reference must carry the short SHA-256 of the file
// it loads, so a changed file always gets a new URL and browsers can't keep
// serving the old copy. Fix a failure with: python3 scripts/stamp-assets.py
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const pages=['index.html','experiments/practice-combat.html'];
let checked=0;
for(const page of pages){
 const html=fs.readFileSync(path.join(root,page),'utf8');
 for(const m of html.matchAll(/(?:src|href)="([^"?#]+)\?v=([^"]*)"/g)){
  const file=path.resolve(path.dirname(path.join(root,page)),m[1]);
  assert(fs.existsSync(file),page+': '+m[1]+' does not exist');
  const want=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,10);
  assert.equal(m[2],want,page+': '+m[1]+'?v='+m[2]+' is stale. Run python3 scripts/stamp-assets.py');
  checked++;
 }
}
assert(checked>=19,'expected the site\'s scripts and stylesheets to be version-stamped, found '+checked);
console.log('PASS '+checked+' asset version stamps match their files');
