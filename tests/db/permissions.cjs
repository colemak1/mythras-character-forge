// Multi-account permission tests on a real Postgres (PGlite).
// Runs the stand-in base schema, then every file in supabase/migrations/ in
// order, then acts as separate signed-in users through the same roles and
// auth.uid() the Supabase API uses:
//   A = GM of Red, B and C = Red players, D = GM of Blue, E = outsider.
// Covers D-S3 (display names only, signed in only) and, at database level,
// the Subsystem 8 multi-account plan in docs/campaign-cases-batch-1.md.
// Needs @electric-sql/pglite: CI installs it into .ci-deps; locally run
//   npm install --prefix .ci-deps @electric-sql/pglite@0.2.17
// then: node tests/db/permissions.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {PGlite}=require(require.resolve('@electric-sql/pglite',{paths:[process.env.PGLITE_MODULES||path.join(root,'.ci-deps','node_modules'),root]}));
const U={A:'00000000-0000-4000-8000-00000000000a',B:'00000000-0000-4000-8000-00000000000b',C:'00000000-0000-4000-8000-00000000000c',
 D:'00000000-0000-4000-8000-00000000000d',E:'00000000-0000-4000-8000-00000000000e'};
const RED='10000000-0000-4000-8000-000000000001',BLUE='10000000-0000-4000-8000-000000000002';
const B1='20000000-0000-4000-8000-0000000000b1',C1='20000000-0000-4000-8000-0000000000c1';
let passed=0;
(async()=>{
const db=new PGlite();
await db.exec(fs.readFileSync(path.join(__dirname,'base-schema.sql'),'utf8'));
const dir=path.join(root,'supabase/migrations');
for(const f of fs.readdirSync(dir).filter(n=>n.endsWith('.sql')).sort())await db.exec(fs.readFileSync(path.join(dir,f),'utf8'));
// Run one statement as a user (or signed out with who=null). Errors come back, not thrown.
async function as(who,sql,params=[]){
 try{return await db.transaction(async tx=>{
  await tx.exec('set local role '+(who?'authenticated':'anon'));
  await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[who?U[who]:'']);
  return {rows:(await tx.query(sql,params)).rows};
 });}catch(e){return {error:e.message};}
}
const test=async(n,fn)=>{await fn();passed++;console.log('PASS '+n);};
const denied=r=>{assert(r.error,'expected an error, got '+JSON.stringify(r.rows));return r.error;};
const ok=r=>{assert(!r.error,r.error);return r.rows;};
// Fixtures, as the database owner.
await db.exec(`
insert into profiles(id,display_name,email) values
 ('${U.A}','Gail','a@example.test'),('${U.B}','Bram','b@example.test'),('${U.C}','Cass','c@example.test'),
 ('${U.D}','Dov','d@example.test'),('${U.E}','Esk','e@example.test');
insert into campaigns(id,name,dm_id,invite_code) values ('${RED}','Red','${U.A}','REDCODE'),('${BLUE}','Blue','${U.D}','BLUECODE');
insert into campaign_members values ('${RED}','${U.A}','dm'),('${RED}','${U.B}','player'),('${RED}','${U.C}','player'),('${BLUE}','${U.D}','dm');
select set_config('request.jwt.claim.sub','${U.B}',false);
insert into characters(id,owner_id,campaign_id,name,state) values ('${B1}','${U.B}','${RED}','Bram''s hero','{"inventory":[{"name":"Rope"}],"hp":10}');
select set_config('request.jwt.claim.sub','${U.C}',false);
insert into characters(id,owner_id,campaign_id,name,state) values ('${C1}','${U.C}','${RED}','Cass''s hero','{"inventory":[],"hp":8}');
select set_config('request.jwt.claim.sub','',false);
insert into campaign_gm_state(campaign_id,session_state) values ('${RED}','{"sessionNotes":"secret"}');
update campaigns set session_state='{"sessionNotes":"leak"}' where id='${RED}';`);

await test('D-S3 a signed-in outsider reads every display name, including people in no shared campaign',async()=>{
 const rows=ok(await as('E','select id,display_name from profiles order by display_name'));
 assert.deepEqual(rows.map(r=>r.display_name),['Bram','Cass','Dov','Esk','Gail']);
});
await test('D-S3 nobody reads another profile\'s private columns, not even with select *',async()=>{
 assert.match(denied(await as('E','select email from profiles')),/permission denied/);
 assert.match(denied(await as('E','select * from profiles')),/permission denied/);
 assert.match(denied(await as('B','select created_at from profiles where id=$1',[U.B])),/permission denied/,'only id and display_name are exposed');
});
await test('D-S3 signed-out visitors read nothing',async()=>{
 assert.match(denied(await as(null,'select id,display_name from profiles')),/permission denied/);
});
await test('D-S3 writes are unchanged: only your own profile, and the app\'s upsert still works',async()=>{
 assert.equal(ok(await as('E','update profiles set display_name=$1 where id=$2 returning id',['Hacked',U.B])).length,0);
 denied(await as('E','insert into profiles(id,display_name) values ($1,$2)',[U.B,'Fake']));
 denied(await as(null,'update profiles set display_name=$1',['x']));
 ok(await as('B','insert into profiles(id,display_name) values ($1,$2) on conflict (id) do update set display_name=excluded.display_name',[U.B,'Bram the Bold']));
 assert.equal(ok(await as('C','select display_name from profiles where id=$1',[U.B]))[0].display_name,'Bram the Bold');
 assert.equal((await db.query('select email from profiles where id=$1',[U.B])).rows[0].email,'b@example.test','private data untouched');
});
await test('S8 step 1-2: GM notes are GM-only; the readable campaign row carries none',async()=>{
 assert.equal(ok(await as('A','select session_state from campaign_gm_state where campaign_id=$1',[RED])).length,1);
 for(const w of ['B','C','D'])assert.equal(ok(await as(w,'select * from campaign_gm_state')).length,0,w);
 assert.equal(ok(await as('B','select session_state from campaigns where id=$1',[RED]))[0].session_state,null);
});
await test('S8 step 3: a player can only put their character in a campaign they belong to',async()=>{
 assert.match(denied(await as('B','update characters set campaign_id=$1 where id=$2',[BLUE,B1])),/belong to/);
 ok(await as('B','update characters set campaign_id=null where id=$1',[B1]));
 ok(await as('B','update characters set campaign_id=$1 where id=$2',[RED,B1]));
});
await test('S8 step 4: only the campaign GM uses the GM character RPCs; inventory must be a list',async()=>{
 for(const w of ['C','D','E']){
  denied(await as(w,"select dm_update_character_inventory($1,'[]'::jsonb)",[B1]));
  denied(await as(w,'select dm_unassign_character($1)',[B1]));
 }
 ok(await as('A',`select dm_update_character_inventory($1,'[{"name":"Rope"},{"name":"Torch"}]'::jsonb)`,[B1]));
 denied(await as('A',`select dm_update_character_inventory($1,'{"name":"x"}'::jsonb)`,[B1]));
 assert.equal((await db.query('select state->$2 as hp from characters where id=$1',[B1,'hp'])).rows[0].hp,10,'only the inventory changed');
});
await test('S8 step 5-6: other accounts cannot change or delete a character, and outsiders see nothing of Red',async()=>{
 for(const w of ['A','C','D','E']){
  assert.equal(ok(await as(w,`update characters set state='{}'::jsonb where id=$1 returning id`,[B1])).length,0,w);
  assert.equal(ok(await as(w,'delete from characters where id=$1 returning id',[B1])).length,0,w);
 }
 for(const w of ['D','E']){
  assert.equal(ok(await as(w,'select * from campaigns where id=$1',[RED])).length,0,w);
  assert.equal(ok(await as(w,'select * from campaign_members where campaign_id=$1',[RED])).length,0,w);
  assert.equal(ok(await as(w,'select * from characters where campaign_id=$1',[RED])).length,0,w);
 }
 assert.equal(ok(await as('C','select id from characters where campaign_id=$1 order by id',[RED])).length,2,'members see the party');
});
await test('D-S2 the server sets the revision: state changes bump it, clients cannot set it, stale GM edits are refused',async()=>{
 const rev=async()=>(await db.query('select revision from characters where id=$1',[B1])).rows[0].revision;
 const r0=await rev();
 ok(await as('B',`update characters set state=jsonb_set(state,'{hp}','9'), revision=999 where id=$1`,[B1]));
 assert.equal(await rev(),r0+1);
 ok(await as('B','update characters set revision=0 where id=$1',[B1]));assert.equal(await rev(),r0+1,'a bare revision write changes nothing');
 assert.equal(ok(await as('B',`update characters set state='{"hp":1}' where id=$1 and revision=$2 returning id`,[B1,r0])).length,0,'a stale save writes nothing');
 assert.match(denied(await as('A',`select dm_update_character_inventory($1,'[]'::jsonb,$2::bigint)`,[B1,r0])),/conflict/);
 assert.equal(Number(ok(await as('A',`select dm_update_character_inventory($1,'[{"name":"Rope"}]'::jsonb,$2::bigint) as r`,[B1,r0+1]))[0].r),r0+2);
});
await test('S8 step 8 (D-S1): only the GM replaces the code; the old code stops working',async()=>{
 for(const w of ['B','D'])assert.match(denied(await as(w,'select rotate_campaign_invite($1)',[RED])),/Only the GM/);
 assert.equal(ok(await as('B','select invite_code from campaigns where id=$1',[RED]))[0].invite_code,'REDCODE','members still see the code');
 const code=ok(await as('A','select rotate_campaign_invite($1) as c',[RED]))[0].c;
 assert.notEqual(code,'REDCODE');
 assert.match(denied(await as('E','select * from join_campaign($1)',['REDCODE'])),/Invalid invite code/);
 assert.equal(ok(await as('E','select * from join_campaign($1)',[code.toLowerCase()]))[0].name,'Red');
 assert.equal(ok(await as('E','select role from campaign_members where campaign_id=$1 and user_id=$2',[RED,U.E]))[0].role,'player');
});
await test('S8 step 10 (D-S4): only the GM removes members; removed players keep their characters and lose access',async()=>{
 for(const w of ['B','C','D'])assert.match(denied(await as(w,'select dm_remove_member($1,$2)',[RED,U.E])),/Only the GM/);
 assert.match(denied(await as('A','select dm_remove_member($1,$2)',[RED,U.A])),/cannot remove themselves/);
 ok(await as('A','select dm_remove_member($1,$2)',[RED,U.C]));
 assert.equal(ok(await as('C','select id,campaign_id from characters where id=$1',[C1]))[0].campaign_id,null,'unassigned, still theirs');
 assert.equal(ok(await as('C','select * from campaigns where id=$1',[RED])).length,0);
 assert.equal(ok(await as('C','select * from characters where campaign_id=$1',[RED])).length,0);
});
await test('S8 step 10 (D-S4): only the GM hands over the campaign, to a member; GM notes follow',async()=>{
 for(const w of ['B','D'])assert.match(denied(await as(w,'select dm_transfer_campaign($1,$2)',[RED,U.B])),/Only the GM/);
 assert.match(denied(await as('A','select dm_transfer_campaign($1,$2)',[RED,U.D])),/must be a member/);
 ok(await as('A','select dm_transfer_campaign($1,$2)',[RED,U.B]));
 assert.equal(ok(await as('B','select session_state from campaign_gm_state where campaign_id=$1',[RED])).length,1);
 assert.equal(ok(await as('A','select * from campaign_gm_state')).length,0);
 assert.equal(ok(await as('A','select role from campaign_members where campaign_id=$1 and user_id=$2',[RED,U.A]))[0].role,'player');
 assert.match(denied(await as('A','select rotate_campaign_invite($1)',[RED])),/Only the GM/);
 assert.equal(ok(await as('A',"update campaigns set name='Mine' where id=$1 returning id",[RED])).length,0,'the old GM can no longer edit the campaign');
});
// Site admin and site-wide Home settings (owner, 2026-11-10). E is made an admin.
await db.exec(`insert into site_admins(user_id) values ('${U.E}')`);
await test('Site settings: everyone, signed out too, reads the Home row',async()=>{
 for(const w of [null,'A','E'])assert.equal(ok(await as(w,"select id from site_settings")).length,1);
});
await test('Site settings: only an admin changes them, and only as themselves',async()=>{
 for(const w of ['A','B','D']){
  const r=await as(w,"update site_settings set home='{\"quote\":\"x\"}',updated_by=$1 where id='home' returning id",[U[w]]);
  assert(r.error||r.rows.length===0,w+' must not change site settings');
 }
 denied(await as(null,"update site_settings set home='{\"quote\":\"x\"}' where id='home' returning id"));
 denied(await as('E',"update site_settings set home='{\"quote\":\"x\"}',updated_by=$1 where id='home' returning id",[U.A]));
 assert.equal(ok(await as('E',"update site_settings set home='{\"quote\":\"Hello\"}',updated_by=$1 where id='home' returning id",[U.E])).length,1);
 assert.equal(ok(await as(null,"select home->>'quote' as q from site_settings"))[0].q,'Hello');
});
await test('Site settings: only a JPEG data URL is accepted as the picture; no new rows',async()=>{
 denied(await as('E',"update site_settings set hero_image='https://example.test/x.png',updated_by=$1 where id='home' returning id",[U.E]));
 assert.equal(ok(await as('E',"update site_settings set hero_image='data:image/jpeg;base64,AAAA',updated_by=$1 where id='home' returning id",[U.E])).length,1);
 denied(await as('E',"insert into site_settings(id) values ('other')"));
 denied(await as('E',"delete from site_settings"));
});
await test('Site admins: the list is unreadable and nobody joins it from the site; is_site_admin answers for yourself',async()=>{
 for(const w of [null,'A','E'])denied(await as(w,'select * from site_admins'));
 denied(await as('A',`insert into site_admins(user_id) values ('${U.A}')`));
 assert.equal(ok(await as('E','select is_site_admin() as a'))[0].a,true);
 assert.equal(ok(await as('A','select is_site_admin() as a'))[0].a,false);
 assert.equal(ok(await as(null,'select is_site_admin() as a'))[0].a,false);
});
// Pits fight reports (owner, 2026-11-14). E is a site admin (above); A is not.
const TOKEN='pits-export-test-token-0123456789abcdef0123456789';
await db.exec(`insert into pits_report_readers(token_sha256,label) values (encode(sha256(convert_to('${TOKEN}','UTF8')),'hex'),'test')`);
const REP="insert into pits_fight_reports(note,record,page,build) values ($1,$2,'experiments/practice-combat.html?stage=spring','abc') returning id";
await test('Pits reports: a site admin saves one, as themselves; others and signed-out visitors cannot',async()=>{
 assert.equal(ok(await as('E',REP,['The parry went through his head','{"record":"pits-spring-1"}'])).length,1);
 denied(await as('A',REP,['x','{"record":"pits-spring-1"}']));
 denied(await as(null,REP,['x','{"record":"pits-spring-1"}']));
 denied(await as('E',`insert into pits_fight_reports(user_id,note,record) values ('${U.A}','x','{}') returning id`));
});
await test('Pits reports: an empty note, a record that is not an object, or a huge note is refused',async()=>{
 denied(await as('E',REP,['   ','{"record":"pits-spring-1"}']));
 denied(await as('E',REP,['x','[1,2]']));
 denied(await as('E',REP,['x'.repeat(4001),'{}']));
});
await test('Pits reports: the reporter reads their own; nobody else does; nobody changes or deletes one',async()=>{
 assert.equal(ok(await as('E','select note from pits_fight_reports')).length,1);
 assert.equal(ok(await as('A','select note from pits_fight_reports')).length,0);
 denied(await as(null,'select note from pits_fight_reports'));
 denied(await as('E',"update pits_fight_reports set note='changed' returning id"));
 denied(await as('E','delete from pits_fight_reports returning id'));
});
await test('Pits reports: the export reads every report with the token, and nothing without it; the readers stay hidden',async()=>{
 const rows=ok(await as(null,'select note,page from pits_reports_export($1)',[TOKEN]));
 assert.deepEqual(rows.map(r=>r.note),['The parry went through his head']);
 assert.match(denied(await as(null,'select * from pits_reports_export($1)',['wrong-token-wrong-token-wrong-token-xx'])),/not allowed/);
 assert.match(denied(await as('A','select * from pits_reports_export($1)',[null])),/not allowed/);
 for(const w of [null,'A','E'])denied(await as(w,'select * from pits_report_readers'));
 denied(await as('E',"insert into pits_report_readers(token_sha256) values (repeat('a',64))"));
});
console.log(passed+' database permission tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
