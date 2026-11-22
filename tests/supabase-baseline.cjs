// supabase/baseline_schema.sql must match the live catalog snapshot
// (docs/supabase-baseline-20261121.md) for the five pre-migration tables,
// minus only the columns the migrations add. tests/db/permissions.cjs runs
// the migrations on top of it.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const live=read('docs/supabase-baseline-20261121.md').split("## Live DDL")[1].match(/```sql\n([\s\S]*?)```/)[1];
const base=read('supabase/baseline_schema.sql');
// {table: [normalised column and constraint lines]}
function tables(sql){
 const out={};
 for(const m of sql.matchAll(/create table public\.(\w+) \(\n([\s\S]*?)\n\);/gi))
  out[m[1]]=m[2].split('\n').map(l=>l.trim().replace(/,$/,'').toLowerCase().replace(/\s+/g,' ')).sort();
 return out;
}
const L=tables(live),B=tables(base);
const NAMES=['profiles','campaigns','campaign_members','characters','campaign_custom_content'];
assert.deepEqual(Object.keys(L).sort(),[...NAMES].sort(),'snapshot has the five tables');
assert.deepEqual(Object.keys(B).sort(),[...NAMES].sort(),'baseline has the five tables');
// Columns added by migrations, so absent from the pre-migration baseline.
const ADDED={campaigns:['rules_settings'],characters:['revision']};
for(const migration of ['20261031174633_campaign_rule_settings.sql','20261108120000_campaign_continuity_and_save_conflicts.sql'])
 assert(fs.existsSync(path.join(root,'supabase/migrations',migration)),migration);
let n=0;
for(const t of NAMES){
 const want=L[t].filter(l=>!(ADDED[t]||[]).some(c=>l.startsWith(c+' ')));
 assert.deepEqual(B[t],want,t+' matches the live table');n++;
}
const idx=/create index campaign_custom_content_campaign_id_idx on public\.campaign_custom_content using btree \(campaign_id\);/i;
assert.match(live,idx);assert.match(base,idx);
for(const t of NAMES)assert.match(base,new RegExp('alter table public\\.'+t+' enable row level security;','i'),t+' RLS');
// The test fixture loads the baseline rather than keeping its own copy.
const fixture=read('tests/db/base-schema.sql');
assert(fixture.includes('-- @include supabase/baseline_schema.sql'));
assert.doesNotMatch(fixture,/create table public\./i,'no second copy of the base tables');
console.log(n+' baseline tables match the live snapshot');
