"use strict";
/* ================= AUTOSAVE (localStorage, best-effort) ================= */
/* ================= CLOUD CONFIG (Supabase) =================
   Fill these in to turn on Campaign accounts (DM/player split, live sync).
   Leave them blank and the app runs exactly as before — Campaigns stay
   local to this browser, no sign-in needed. See
   mythras-forge-supabase-schema.sql for the one-time database setup;
   paste your project's URL and anon (public) key below once you've run it.
   The anon key is safe to embed client-side — it's the whole point of
   Supabase's row-level-security model. */
const SUPABASE_URL="https://yogzdbcskpvtssgckgib.supabase.co";
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZ3pkYmNza3B2dHNzZ2NrZ2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3MDcwODksImV4cCI6MjA5OTI4MzA4OX0.ErzC2pHXjlY5sV2dRP6omXFl5EQwj6gooBCikx6ftfw";
const CLOUD_CONFIGURED=!!(SUPABASE_URL&&SUPABASE_ANON_KEY);
// Guarded: if the Supabase CDN script fails to load (offline, bad venue
// wifi, ad-blocker, etc.) `supabase` is undefined and calling
// .createClient() would throw a ReferenceError at script top-level, which
// kills the entire app before it ever renders. Fall back to sb=null instead
// so cloud features quietly turn off and everything else keeps working.
const sb=(CLOUD_CONFIGURED&&typeof supabase!=="undefined")?supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
// CLOUD_ENABLED reflects real usability (configured AND the client actually
// exists), not just whether keys were pasted in — every other cloud-gated
// check in the app reads this flag.
const CLOUD_ENABLED=!!sb;

let AUTH_USER=null;      // {id,email} once signed in, else null
let AUTH_PROFILE=null;   // {id,display_name} once loaded
let AUTH_PENDING=false;  // true while a magic link has been sent, awaiting click
// Mock sign-in: a client-only pretend session for testing the Campaign UI
// without a real Supabase account. Deliberately kept separate from
// AUTH_USER/cloudActive() rather than faking a real session — a fake
// AUTH_USER.id would still route Campaign actions through the real
// Supabase calls (cloudFetchCampaigns, etc.), which enforce row-level
// security against an actual authenticated JWT and would just fail. Mock
// auth instead unlocks the app's existing *local* Campaign storage path
// (createCampaignUnified/loadCampaignsUnified already fall back to
// localStorage whenever cloudActive() is false), so Campaign features are
// genuinely exercisable end-to-end, just scoped to this browser only.
// Guest sessions are explicitly local-only. Restore the marker on reload so
// users can resume characters, but never pass a guest identity to Supabase.
const GUEST_SESSION_KEY="mythrasForgeGuestMode_v1";
// Enable only in a dedicated test deployment; never in the public build.
const GUEST_TEST_ENABLED=false;
let MOCK_AUTH=(()=>{try{return GUEST_TEST_ENABLED&&localStorage.getItem(GUEST_SESSION_KEY)==="1"?{id:"guest-local",display_name:"Guest"}:null;}catch(e){return null;}})();
const anyAuth=()=>AUTH_USER||MOCK_AUTH;
let CAMP_CACHE=null;     // array once loaded from the cloud, else null ("loading")
let CAMPAIGN_VIEW=null;  // {campaign,members,chars,unassigned} for whatever campaign is open
/* GM session tools (Combat Tracker, session notes) live in one jsonb column
   on the campaign row -- campaigns.session_state -- rather than a new
   table, so they ride the exact same read/write/realtime path as `notes`
   already does. Requires a DB-side migration this app can't run itself (no
   service-role key on the client, only the anon key): run
   `alter table campaigns add column session_state jsonb;` and, if the
   `campaigns` table isn't already in the realtime publication (`characters`
   clearly is, `campaigns` never needed live updates before now),
   `alter publication supabase_realtime add table campaigns;`. Until that
   migration lands, cloud writes below fail gracefully (caught, surfaced as
   inline feedback like every other campaign write) and local-only mode
   works immediately. */
function emptySessionState(){return {combatants:[],round:1,turnIdx:0,activeId:null,sessionNotes:""};}
// Migrates the old, pre-overhaul shape (separate `initiative` turn-order
// list and `npcs` prep list, never actually linked to each other -- adding
// an NPC to initiative got its own bare name+init entry, not whatever HP/
// stats had been typed into the prep card) into the current unified
// `combatants` array. Each combatant now carries its own AP, per-location
// HP against a customizable location set, and status-effect chips directly
// -- there's no more separate "prep before the fight" bench, matching how
// gmAddNpcInit() already worked (one step, straight into the turn order).
// The old `npcs` list has no reliable link back to a specific initiative
// entry (they were never connected by id, only coincidentally both present
// during the same session), so it's left untouched in the blob rather than
// guessed-matched by name -- just never read by anything post-migration.
function sessionStateOf(camp){
  const raw=(camp&&camp.session_state)||null;
  if(!raw)return emptySessionState();
  if(raw.combatants)return raw; // already current shape
  const combatants=(raw.initiative||[]).map(e=>{
    if(e.kind==="pc")return combatantFromPc(e.ref,e.init,e.id);
    return Object.assign(combatantFromNpc(e.name,e.init,e.id));
  });
  return {combatants,round:raw.round||1,turnIdx:raw.turnIdx||0,activeId:null,sessionNotes:raw.sessionNotes||""};
}
// Default hit-location preset -- same seven locations (and the same
// Right/Left Arm|Leg -> "Each Arm"/"Each Leg" HP-sharing convention) every
// character sheet and Play Mode already use, so an NPC starts out
// book-standard-humanoid and only needs edits for actually inhuman anatomy.
const COMBAT_DEFAULT_LOCS=["Head","Chest","Abdomen","Right Arm","Left Arm","Right Leg","Left Leg"];
// One combatant per PC added to the tracker: AP and per-location HP maxes
// are seeded from the character's OWN live numbers via charVitals (the
// same pure, state-parameterized function Play Mode and the Party Board
// already use -- never duplicated math, so this can't silently drift from
// what the player's own sheet says). This is a snapshot at add-time, not a
// live link back to the character -- the GM's copy is meant to be edited
// directly during the session (spending AP, applying damage/effects)
// without needing to renegotiate every change with the player's own Play
// Mode screen, the same reasoning NPCs already got a GM-owned stat block.
function combatantFromPc(charId,init,id){
  const row=(BOARD_CHARS||[]).find(c=>c.id===charId);
  const v=row?charVitals(row.state):null;
  const hp={};
  COMBAT_DEFAULT_LOCS.forEach(loc=>{hp[loc]={cur:v?(v.locs.find(l=>l.loc===loc)?.cur??10):10,max:v?(v.locs.find(l=>l.loc===loc)?.max??10):10};});
  return {id:id||genId(),kind:"pc",ref:charId,name:row?row.name:"(removed character)",init:init||0,
    ap:{max:v?v.maxAP:2,used:v?v.apUsed:0},locations:COMBAT_DEFAULT_LOCS.slice(),hp,effects:[],stat1:"",stat2:""};
}
function combatantFromNpc(name,init,id){
  const hp={};
  COMBAT_DEFAULT_LOCS.forEach(loc=>{hp[loc]={cur:10,max:10};});
  return {id:id||genId(),kind:"npc",ref:null,name:name||"New NPC",init:init||0,
    ap:{max:2,used:0},locations:COMBAT_DEFAULT_LOCS.slice(),hp,effects:[],stat1:"",stat2:""};
}
// The 11 Special-Effect-derived status templates the GM can attach to a
// combatant (optionally at a specific hit location -- locHint is just which
// way the "add effect" picker defaults, not a hard restriction, since e.g.
// Pinned Weapon or Disarmed could plausibly still want one). mode is which
// way the counter in the UI moves: "duration" counts down to 0 (effects
// with a book-stated turn count -- Blindness "1d3 turns", Stun Location
// "turns equal to damage inflicted", Overextend/Press Advantage "can't act
// next turn"), "counter" counts up (effects that last until something
// specific resolves them -- staunched, cut free, pulled out, stood back up
// -- rather than expiring on a timer). Both are just a starting default;
// the GM can flip either when applying it.
const COMBAT_EFFECT_TYPES=[
  {key:"bleeding",label:"Bleeding",locHint:true,mode:"counter"},
  {key:"blinded",label:"Blinded",locHint:false,mode:"duration"},
  {key:"disarmed",label:"Disarmed",locHint:false,mode:"counter"},
  {key:"entangled",label:"Entangled/Gripped",locHint:true,mode:"counter"},
  {key:"impaled",label:"Impaled",locHint:true,mode:"counter"},
  {key:"overextended",label:"Overextended",locHint:false,mode:"duration"},
  {key:"pinned",label:"Pinned weapon",locHint:false,mode:"counter"},
  {key:"pressed",label:"Pressed",locHint:false,mode:"duration"},
  {key:"prone",label:"Prone",locHint:false,mode:"counter"},
  {key:"stunned",label:"Stunned location",locHint:true,mode:"duration"},
  {key:"unconscious",label:"Unconscious",locHint:false,mode:"counter"},
  {key:"breath",label:"Breath recovering",locHint:false,mode:"duration"}
];
const COMBAT_EFFECT_MAP=Object.fromEntries(COMBAT_EFFECT_TYPES.map(e=>[e.key,e]));
// Ticks every combatant's active effects one step -- duration effects count
// down and auto-clear at 0, counters just count up (the GM clears those by
// hand once resolved). Fires once per actual ROUND advancing (see
// APP.gmAdvanceTurn in app.js), not per individual turn, matching "per-round
// cadence tied to Advance Turn" -- Reset Round deliberately does NOT call
// this, since that's for correcting a mistake, not advancing time.
function tickCombatEffects(combatants,unit="round"){
  combatants.forEach(c=>{
    c.effects=(c.effects||[]).map(e=>{
      // Existing counters remain round-based; existing timed effects are
      // turn-based, matching the tracker templates and Core p.96.
      if((e.unit||(e.mode==="duration"?"turn":"round"))!==unit)return e;
      return Object.assign({},e,{value:e.value+(e.mode==="duration"?-1:1)});
    })
      .filter(e=>e.mode!=="duration"||e.value>0);
  });
}
let LIB_CACHE=null;      // characters relevant to whatever's currently shown
// Play Mode viewing someone else's character (Party Board -> click a card):
// VIEW_ONLY disables every playXxx mutator and the cloud-push scheduler so a
// party member (or the DM — see the reconciliation note near the RLS section)
// can look at a teammate's sheet live without ever being able to write to it.
let VIEW_ONLY=false;
let VIEW_ONLY_OWNER_NAME=null; // whose character this is, for the banner
let VIEW_ONLY_IS_DM=false; // true if the viewer is the DM of this character's campaign — carves out a narrow inventory-edit exception to VIEW_ONLY (see dm_update_character_inventory RPC)
let PLAY_RETURN_VIEW="menu";   // where the "back" control in Play Mode goes
// Guard called at the top of every Play Mode mutator — the UI already hides/
// disables these controls under VIEW_ONLY (see the banner in renderPlayView),
// but a direct call is still possible (e.g. a stale render), and the actual
// write would just be rejected by RLS anyway since only the owner has UPDATE
// rights on a character row. Failing fast client-side avoids a confusing
// network-error alert for something that was never going to be allowed.
function viewOnlyBlock(){return VIEW_ONLY;}
// Narrower guard for the Inventory tab specifically: blocked for a plain
// read-only party member, but NOT for the DM (who gets a real, DB-enforced
// ability to edit just the inventory list via dm_update_character_inventory —
// see cloudDmUpdateCharacterInventory / scheduleDmInventoryPush below). The
// owner is never blocked here regardless (VIEW_ONLY is false for them).
function inventoryBlock(){return VIEW_ONLY&&!VIEW_ONLY_IS_DM;}
// Looks up whether the signed-in user is the DM of the given campaign. Used
// once per Play Mode open (not cached) since it's a single cheap PK lookup
// and correctness here matters more than shaving one request — campaigns_
// select_dm/member RLS already scopes this to rows the caller may see.
async function isDmOfCampaign(campaignId){
  if(!cloudActive()||!campaignId||!AUTH_USER)return false;
  const {data}=await sb.from("campaigns").select("dm_id").eq("id",campaignId).maybeSingle();
  return !!(data&&data.dm_id===AUTH_USER.id);
}

let AUTH_RECOVERY=false; // true once a password-recovery link has been clicked — shows the "set new password" form
async function initAuth(){
  if(!CLOUD_ENABLED)return;
  sb.auth.onAuthStateChange(async(event,session)=>{
    if(event==="PASSWORD_RECOVERY"){AUTH_RECOVERY=true;APPVIEW="account";render();return;}
    if(session&&(!AUTH_USER||AUTH_USER.id!==session.user.id)){await onSignedIn(session.user);render();}
    else if(!session&&AUTH_USER){AUTH_USER=null;AUTH_PROFILE=null;CAMP_CACHE=null;render();}
  });
}
async function onSignedIn(user){
  AUTH_USER={id:user.id,email:user.email};
  AUTH_PENDING=false;
  const {data}=await sb.from("profiles").select("id,display_name").eq("id",user.id).maybeSingle();
  AUTH_PROFILE=data||null;
  CAMP_CACHE=null;
  // A campaign invite link clicked while signed out stashes its code (see
  // stashPendingJoin in the invite-link section below) and parks the visitor
  // on the Account page instead of losing the code. The moment a session
  // actually lands -- whether from signing in in-place or completing a
  // sign-up's email-confirmation round trip -- pick that code back up and
  // finish the join, rather than leaving them stranded on Account with no
  // memory of why they came.
  const pendingCode=takePendingJoin();
  if(pendingCode)await applyRoute({view:"join",code:pendingCode});
}
async function ensureProfile(name){
  if(!AUTH_USER)return;
  const {error}=await sb.from("profiles").upsert({id:AUTH_USER.id,display_name:name},{onConflict:"id"});
  if(error)throw error;
  AUTH_PROFILE={id:AUTH_USER.id,display_name:name};
}

/* ---- Cloud CRUD (all async — see CAMP_CACHE/LIB_CACHE refresh pattern below) ---- */
async function cloudFetchCampaigns(){
  const {data,error}=await sb.from("campaigns").select("*").order("created_at",{ascending:false});
  return error?[]:data;
}
async function cloudCreateCampaign(name,rules){
  const fields={name,notes:"",dm_id:AUTH_USER.id,invite_code:genId().toUpperCase()};
  if(rules!==undefined)fields.rules_settings=rules;
  const {data,error}=await sb.from("campaigns").insert(fields).select().single();
  if(error)throw error;
  // This insert used to go unchecked — if it failed (RLS, network blip),
  // the campaign row still existed with the right dm_id, but the DM had no
  // campaign_members row, so anything keying "am I DM here" off membership
  // (rather than campaigns.dm_id) silently stopped recognizing them. Surface
  // the failure and roll back the orphaned campaign rather than leaving a
  // half-created campaign with a DM who doesn't show up as a member.
  const {error:memberError}=await sb.from("campaign_members").insert({campaign_id:data.id,user_id:AUTH_USER.id,role:"dm"});
  if(memberError){
    await sb.from("campaigns").delete().eq("id",data.id);
    throw memberError;
  }
  return data;
}
async function cloudUpdateCampaign(id,fields){
  const {error}=await sb.from("campaigns").update(fields).eq("id",id);
  if(error)throw error;
}
async function cloudDeleteCampaign(id){
  const {error}=await sb.from("campaigns").delete().eq("id",id);
  if(error)throw error;
}
async function cloudDmUnassignCharacter(id){
  // Goes through the dm_unassign_character RPC rather than a direct UPDATE —
  // the DM has no general UPDATE grant on other players' characters via RLS
  // (only the owner does; see the reconciliation note near the RLS SQL), so
  // this narrow SECURITY DEFINER function is the DM's only way to detach a
  // character from their campaign. It touches campaign_id and nothing else.
  const {error}=await sb.rpc("dm_unassign_character",{p_char:id});
  if(error)throw error;
}
async function cloudDmUpdateCharacterInventory(id,inventory,revision){
  // Same reasoning as cloudDmUnassignCharacter above — the DM has no general
  // UPDATE grant on a player's character, so this goes through a narrow
  // SECURITY DEFINER RPC that touches only state.inventory (loot distribution,
  // adding/removing gear mid-session) and nothing else on the sheet.
  // With a revision (D-S2) the server refuses to write over a newer copy and
  // returns the new revision. Before the migration runs, the old form is used.
  if(Number.isSafeInteger(revision)){
    const {data,error}=await sb.rpc("dm_update_character_inventory",{p_char:id,p_inventory:inventory,p_revision:revision});
    if(!error)return Number(data);
    if(!isMissingFunctionError(error))throw error;
  }
  const {error}=await sb.rpc("dm_update_character_inventory",{p_char:id,p_inventory:inventory});
  if(error)throw error;
  return null;
}
function isMissingFunctionError(e){return !!e&&(e.code==="PGRST202"||e.code==="42883"||/could not find the function|does not exist/i.test(String(e.message||"")));}
// D-S1 and D-S4 GM actions (docs/decisions.md, 2026-11-07). Each is a
// SECURITY DEFINER RPC that checks the caller is this campaign's GM
// (supabase/migrations/20261108120000_campaign_continuity_and_save_conflicts.sql).
async function cloudRotateInvite(campaignId){
  const {data,error}=await sb.rpc("rotate_campaign_invite",{p_campaign:campaignId});
  if(error)throw error;
  return data;
}
async function cloudRemoveMember(campaignId,userId){
  const {error}=await sb.rpc("dm_remove_member",{p_campaign:campaignId,p_user:userId});
  if(error)throw error;
}
async function cloudTransferCampaign(campaignId,userId){
  const {error}=await sb.rpc("dm_transfer_campaign",{p_campaign:campaignId,p_user:userId});
  if(error)throw error;
}
function campaignActionError(e){
  return isMissingFunctionError(e)?"This needs the November 2026 campaign update on the server. Ask the site owner to run it.":e.message;
}
// D-S4 whole-campaign backup: everything the GM can read about the campaign,
// in one JSON file. Characters keep their full saved state, so any one of
// them can be imported again through Account > Import character backup.
async function buildCampaignBackup(campaignId){
  let campaign,gmState=null,members=[],characters=[],customContent=[];
  if(cloudActive()){
    const {data,error}=await sb.from("campaigns").select("*").eq("id",campaignId).maybeSingle();
    if(error)throw error;
    if(!data)throw new Error("Campaign not found");
    campaign=Object.assign({},data);delete campaign.session_state;
    if(AUTH_USER&&data.dm_id===AUTH_USER.id){
      try{gmState=await fetchGmSessionState(campaignId);}catch(e){gmState=null;}
      if(gmState==null&&data.session_state)gmState=data.session_state;
    }
    members=(await cloudFetchMembers(campaignId)).map(m=>({user_id:m.userId,name:m.name,role:m.role,joined_at:m.joinedAt}));
    characters=await cloudFetchCharacters({campaignId});
    customContent=await cloudFetchCustomContent(campaignId);
  }else{
    const local=getCampaignLocal(campaignId);if(!local)throw new Error("Campaign not found");
    campaign=normalizeLocalCampaign(local);gmState=local.sessionState||null;
    characters=charsInCampaignLocal(campaignId).map(localCharShape);
    customContent=customContentForCampaignLocal(campaignId);
  }
  return {format:"mythras-forge-campaign-backup",version:1,exportedAt:new Date().toISOString(),
    campaign,gmSessionState:gmState,members,
    characters:characters.map(c=>({id:c.id,name:c.name,owner_id:c.owner_id,owner_name:c.owner_name,updated_at:c.updated_at,revision:c.revision,state:c.state})),
    customContent};
}
async function cloudJoinCampaign(code){
  const {data,error}=await sb.rpc("join_campaign",{p_code:code.trim().toUpperCase()});
  if(error)throw error;
  return data&&data[0];
}
// ---- Invite links: "Copy Invite Link" (campaignDetailHTML) builds a
// #/join/<code> URL around the same invite_code the plain-text code display
// already used -- no DB change, just a shareable wrapper the router can act
// on directly (see the "join" case in router.js). Kept in localStorage
// rather than a module-level variable alone because the sign-up path's
// email-confirmation link reloads the page (a plain in-place sign-in
// doesn't, but there's no way to tell which one's coming when the code is
// stashed), which would otherwise lose an in-memory-only value.
const PENDING_JOIN_KEY="mythrasForgeCampaignJoin_v1";
function stashPendingJoin(code){try{localStorage.setItem(PENDING_JOIN_KEY,code);}catch(e){}}
function takePendingJoin(){
  try{const code=localStorage.getItem(PENDING_JOIN_KEY);if(code)localStorage.removeItem(PENDING_JOIN_KEY);return code;}
  catch(e){return null;}
}
async function cloudFetchMembers(campaignId){
  const {data,error}=await sb.from("campaign_members").select("user_id,role,joined_at").eq("campaign_id",campaignId);
  if(error)return [];
  const ids=data.map(m=>m.user_id);
  if(!ids.length)return [];
  const {data:profiles}=await sb.from("profiles").select("id,display_name").in("id",ids);
  const nameOf=id=>{const p=profiles&&profiles.find(p=>p.id===id);return p?p.display_name:"Unknown";};
  return data.map(m=>({userId:m.user_id,role:m.role,joinedAt:m.joined_at,name:nameOf(m.user_id)}));
}
async function cloudFetchCharacters(filter){
  let q=sb.from("characters").select("*");
  if(filter&&filter.campaignId)q=q.eq("campaign_id",filter.campaignId);
  if(filter&&filter.mine)q=q.eq("owner_id",AUTH_USER.id);
  const {data,error}=await q.order("updated_at",{ascending:false});
  if(error)throw error;
  if(!data)return [];
  const ownerIds=[...new Set(data.map(c=>c.owner_id))];
  let names={};
  if(ownerIds.length){
    const {data:profiles}=await sb.from("profiles").select("id,display_name").in("id",ownerIds);
    (profiles||[]).forEach(p=>{names[p.id]=p.display_name;});
  }
  return data.map(c=>Object.assign({},c,{owner_name:names[c.owner_id]||"Unknown"}));
}
function localCharShape(c){
  return {id:c.id,owner_id:"local",owner_name:"You",campaign_id:c.campaignId,name:c.name,
    tier:c.tier,culture:c.culture,career:c.career,state:c.state,updated_at:new Date(c.savedAt).toISOString()};
}
async function cloudUpsertCharacter(entry){
  // Insert and update are deliberately separate paths (not a single upsert)
  // so an update can NEVER include owner_id in the payload at all — a DM
  // saving/re-syncing a player's character (e.g. via debounced Play Mode
  // push while viewing it) must not be able to reassign ownership, even
  // accidentally. The characters_before_update DB trigger also blocks this
  // server-side as a second layer of defense.
  //
  // campaign_id is ALSO deliberately excluded from the UPDATE payload (it's
  // still written on INSERT) — this was the root cause of campaign
  // assignments silently reverting to null. render() calls saveAutosave()
  // -> scheduleCloudPush() -> here on basically every render in Play/
  // character views, using whatever campaign_id happens to be sitting in
  // the in-memory S snapshot at that moment. But assignCharUnified/
  // unassignCharUnified/the DM unassign RPC only ever updated campaign_id
  // in the DB directly — they never updated S.campaignId in memory. So the
  // very next autosave-triggered push after a (re)assignment clobbered it
  // straight back to whatever stale value was still in memory (typically
  // null), with no error shown. campaign_id must only ever be written by an
  // explicit assignment action — assignCharUnified/unassignCharUnified,
  // which already update it via their own dedicated .update({campaign_id})
  // calls — never by this generic background sync path.
  const updateFields={name:entry.name,tier:entry.tier,
    culture:entry.culture,career:entry.career,state:entry.state};
  if(entry.id){
    // D-S2: with a known revision, only write if nobody saved since we read it.
    let q=sb.from("characters").update(updateFields).eq("id",entry.id);
    const checked=Number.isSafeInteger(entry.revision);
    if(checked)q=q.eq("revision",entry.revision);
    const {data,error}=await q.select();
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    if(!row)throw checked?characterConflict(entry.name):new Error("Character not found on the account");
    return row;
  }
  const insertFields=Object.assign({campaign_id:entry.campaignId||null},updateFields);
  const {data,error}=await sb.from("characters").insert(Object.assign({owner_id:AUTH_USER.id},insertFields)).select().single();
  if(error)throw error;
  return data;
}
async function refreshCampaigns(){CAMP_CACHE=await cloudFetchCampaigns();render();}

const AUTOSAVE_KEY="mythrasForgeAutosave_v1";
// Scoped by signed-in identity (AUTH_USER only -- MOCK_AUTH is a local-only
// test identity, same treatment cloudActive() already gives it) so signing
// out, or a different account signing in on a shared browser, can never see
// or resume another account's in-progress "Continue" character. Without
// this the raw key above was a single slot shared by literally anyone who
// ever used this browser, signed in or not, which is how a stranger's
// abandoned work could end up offered to -- and then silently attached to
// -- whoever happens to be signed in next.
function autosaveKey(){return AUTOSAVE_KEY+":"+(AUTH_USER?AUTH_USER.id:"local");}
// Refuse malformed and library-backup JSON before it reaches normalization.
// Old character exports remain compatible without requiring a version tag.
function characterImportProblem(value){
  if(!value||typeof value!=="object"||Array.isArray(value))return "expected a character object";
  if(value.format==="mythras-forge-guest-backup")return "this is a library backup; use Import Guest Backup instead";
  if(!value.concept||typeof value.concept!=="object"||Array.isArray(value.concept))return "missing character concept";
  if(typeof value.concept.name!=="string")return "missing character name";
  if(value.chars&&(!value.chars||typeof value.chars!=="object"||Array.isArray(value.chars)))return "invalid characteristics";
  for(const field of ["age","magic","money","alloc","play","xp","community"]){
    if(value[field]!==undefined&&(!value[field]||typeof value[field]!=="object"||Array.isArray(value[field])))return "invalid "+field+" information";
  }
  for(const field of ["passions","inventory","gearWeapons"]){
    if(value[field]!==undefined&&!Array.isArray(value[field]))return "invalid "+field+" list";
  }
  if(value.magic&&value.magic.known!==undefined&&!Array.isArray(value.magic.known))return "invalid magic list";
  return null;
}
/* ================= CAMPAIGNS & CHARACTER LIBRARY (localStorage) =================
   The autosave above is a single scratch slot for whatever's currently being
   edited. Campaigns need to reference multiple *saved* characters, so this is
   a small separate library: an array of saved character snapshots, each
   optionally tagged with a campaignId. "Save to Library" on the Sheet step
   upserts the current character into it; Export JSON remains the durable,
   portable copy regardless. */
const CAMPAIGNS_KEY="mythrasForgeCampaigns_v1", CHARLIB_KEY="mythrasForgeCharLib_v1";
const genId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
function loadCampaignsLocal(){try{return JSON.parse(localStorage.getItem(CAMPAIGNS_KEY))||[];}catch(e){return [];}}
function saveVerifiedLocal(key,list){
  const serialized=JSON.stringify(list);
  localStorage.setItem(key,serialized);
  if(localStorage.getItem(key)!==serialized)throw new Error("Browser storage did not retain the save. Export a backup before leaving.");
}
function saveCampaignsListLocal(list){saveVerifiedLocal(CAMPAIGNS_KEY,list);}
function getCampaignLocal(id){return loadCampaignsLocal().find(c=>c.id===id)||null;}
function upsertCampaignLocal(camp){const list=loadCampaignsLocal();const i=list.findIndex(c=>c.id===camp.id);
  if(i>=0)list[i]=camp;else list.push(camp);saveCampaignsListLocal(list);}
function deleteCampaignByIdLocal(id){
  saveCampaignsListLocal(loadCampaignsLocal().filter(c=>c.id!==id));
  saveCharLibListLocal(loadCharLibLocal().map(c=>c.campaignId===id?Object.assign({},c,{campaignId:null}):c));
}
function loadCharLibLocal(){try{return JSON.parse(localStorage.getItem(CHARLIB_KEY))||[];}catch(e){return [];}}
function saveCharLibListLocal(list){
  // Do not silently claim a successful library write when browser storage
  // rejected it (private mode, quota limits, or disabled storage).
  const serialized=JSON.stringify(list);
  localStorage.setItem(CHARLIB_KEY,serialized);
  if(localStorage.getItem(CHARLIB_KEY)!==serialized)
    throw new Error("Character library save could not be verified");
}
// Called on sign-out (APP.signOut) so a shared/public browser never keeps
// showing "My Characters"/"Continue as X" for the account that just left --
// character creation is gated behind sign-in (see fromMenuNew/
// newCharacterForCampaign/the router's "character" case), so these keys
// should be empty for anyone signed out anyway; this just guarantees it,
// including for browsers that already had entries from before that gate
// existed. uid, if passed, is the just-signed-out account's own id, so its
// scratch "Continue" slot (autosaveKey() while signed in) is wiped too --
// otherwise the character itself would be gone from My Characters but its
// in-progress draft would still turn up next time anyone signs in as them
// on this browser.
function clearLocalCharacterData(uid){
  // Guest records belong to this device, not the account signing out.
  if(uid){try{localStorage.removeItem(AUTOSAVE_KEY+":"+uid);}catch(e){}}
}
function charsInCampaignLocal(id){return loadCharLibLocal().filter(c=>c.campaignId===id);}
function unassignedCharsLocal(){return loadCharLibLocal().filter(c=>!c.campaignId);}
function saveCurrentToLibraryLocal(){
  const lib=loadCharLibLocal();
  const id=S._libId||genId();
  // Include the assigned ID in the persisted snapshot, without changing
  // the live actor ID until the browser confirms the write succeeded.
  const state=JSON.parse(JSON.stringify(S));state._libId=id;
  const entry={id,campaignId:S.campaignId||null,name:S.concept.name||"Unnamed Character",
    tier:S.archetype,culture:S.culture||"",
    career:(S.customCareer&&S.customCareer.isCustom?S.customCareer.name:S.career)||"",
    savedAt:Date.now(),state};
  const i=lib.findIndex(c=>c.id===id);
  if(i>=0)lib[i]=entry;else lib.push(entry);
  saveCharLibListLocal(lib);
  S._libId=id;
  return entry;
}

/* ================= CAMPAIGN CUSTOM CONTENT (homebrew) =================
   Custom weapons/armor/spells belong to a specific campaign, not a global
   per-account library -- a GM's homebrew for one campaign should never
   bleed into another, and every member of that campaign should see it in
   their equipment/weapon/spell pickers automatically. Requires a DB-side
   migration this app can't run itself (no service-role key is ever shipped
   client-side) -- see the campaign_custom_content migration SQL flagged in
   the PR/report that introduced this. Until that migration is run,
   cloudFetchCustomContent below just returns [] (table doesn't exist yet),
   so campaigns keep working exactly as before; local (signed-out) mode
   needs no migration at all since it never touches Supabase.
   Row shape (cloud and local both normalize to this): {id,campaign_id,
   type:"weapon"|"armor"|"spell",name,data:{...typed fields per type},
   created_at}. */
async function cloudFetchCustomContent(campaignId){
  const {data,error}=await sb.from("campaign_custom_content").select("*").eq("campaign_id",campaignId).order("created_at",{ascending:true});
  return error?[]:data;
}
async function cloudCreateCustomContent(campaignId,type,name,data){
  const {data:row,error}=await sb.from("campaign_custom_content")
   .insert({campaign_id:campaignId,type,name,data,created_by:AUTH_USER.id}).select().single();
  if(error)throw error;
  return row;
}
async function cloudDeleteCustomContent(id){
  const {error}=await sb.from("campaign_custom_content").delete().eq("id",id);
  if(error)throw error;
}
const CUSTOM_CONTENT_KEY="mythrasForgeCustomContent_v1";
function loadCustomContentLocal(){try{return JSON.parse(localStorage.getItem(CUSTOM_CONTENT_KEY))||[];}catch(e){return [];}}
function saveCustomContentListLocal(list){saveVerifiedLocal(CUSTOM_CONTENT_KEY,list);}
function customContentForCampaignLocal(campaignId){return loadCustomContentLocal().filter(c=>c.campaign_id===campaignId);}
function createCustomContentLocal(campaignId,type,name,data){
  const row={id:genId(),campaign_id:campaignId,type,name,data,created_at:new Date().toISOString()};
  const list=loadCustomContentLocal();list.push(row);saveCustomContentListLocal(list);
  return row;
}
function deleteCustomContentLocal(id){saveCustomContentListLocal(loadCustomContentLocal().filter(c=>c.id!==id));}
async function fetchCustomContentUnified(campaignId){
  if(cloudActive())return cloudFetchCustomContent(campaignId);
  return customContentForCampaignLocal(campaignId);
}
async function createCustomContentUnified(campaignId,type,name,data){
  if(cloudActive())return cloudCreateCustomContent(campaignId,type,name,data);
  return createCustomContentLocal(campaignId,type,name,data);
}
async function deleteCustomContentUnified(id,campaignId){
  if(cloudActive())return cloudDeleteCustomContent(id);
  return deleteCustomContentLocal(id);
}
// Keyed by campaignId -> array once loaded, or null while a fetch is in
// flight -- same "populate then re-render" shape as CAMP_CACHE/BOARD_CHARS
// elsewhere in this file. Custom content is supplementary to the core data
// tables (never the only source of a picker's options), so callers treat a
// still-loading/absent cache entry as "no homebrew yet" rather than
// blocking the whole picker on it.
const CUSTOM_CONTENT_CACHE={};
async function refreshCustomContent(campaignId){
  if(!campaignId)return;
  CUSTOM_CONTENT_CACHE[campaignId]=await fetchCustomContentUnified(campaignId);
  render();
}
function ensureCustomContentLoaded(campaignId){
  if(!campaignId||CUSTOM_CONTENT_CACHE[campaignId]!==undefined)return;
  CUSTOM_CONTENT_CACHE[campaignId]=null;
  refreshCustomContent(campaignId);
}
function customContentByType(type){
  const cid=S.campaignId;if(!cid)return [];
  ensureCustomContentLoaded(cid);
  return (CUSTOM_CONTENT_CACHE[cid]||[]).filter(c=>c.type===type);
}
// Dice-pool builder for homebrew weapon damage: counts per die size plus a
// flat modifier, rendered the same way the core WEAPONS table's "dmg"
// strings read (e.g. "1d6+1d4+2"). Multiple die sizes in one pool has no
// core-rulebook precedent (real weapons only ever use one die size) but the
// spec calls for a general-purpose pool builder, so this supports it.
const CUSTOM_DICE_STEPS=[2,3,4,6,8,10];
// The Mythras Special Effect / spell trait vocabulary the homebrew spell
// form offers as toggle chips -- a deliberate subset of MAGIC_TRAITS (skips
// "Special Duration" and "Resist (Special)", both open-ended/described-in-
// prose traits that don't fit a fixed chip).
const CUSTOM_SPELL_TRAITS=["Concentration","Instant","Ranged","Resist (Endurance)","Resist (Evade)","Resist (Willpower)","Touch"];
function customDiceLabel(dice,flatMod){
  const parts=CUSTOM_DICE_STEPS.filter(n=>dice&&dice["d"+n]>0).map(n=>dice["d"+n]+"d"+n);
  let label=parts.join("+")||"0";
  const m=parseInt(flatMod,10)||0;
  if(m>0)label+="+"+m;else if(m<0)label+=String(m);
  return label;
}
function customWeaponShape(row){
  const d=row.data||{};
  return {name:row.name,group:d.group||"Custom",dmg:customDiceLabel(d.dice,d.flatMod),
   size:d.size||"",reach:d.reach||"",range:d.range||"",load:d.load||"",effects:d.effects||"",
   enc:Number(d.enc)||0,apHp:d.apHp||"",traits:d.traits||"",milieu:"Custom",cost:Number(d.cost)||0,
   custom:true,customId:row.id};
}
function customArmorShape(row){
  const d=row.data||{};
  return {name:row.name,ap:Number(d.ap)||0,encPerLoc:Number(d.encPerLoc)||0,
   locations:Array.isArray(d.locations)?d.locations:[],custom:true,customId:row.id};
}
// spec mirrors FOLK_MAGIC's own convention: a non-empty string turns on the
// "speciality" text input on the known-spell row, using that string as its
// placeholder (see folkMagicPicker in render.js).
function customSpellShape(row){
  const d=row.data||{};
  return {n:row.name,t:Array.isArray(d.traits)?d.traits:[],d:d.desc||"",
   spec:d.hasSpec?(d.specLabel||"specialization"):"",custom:true,customId:row.id};
}
function allWeapons(){return WEAPONS.concat(customContentByType("weapon").map(customWeaponShape));}
function weaponByName(name){return WEAPON_MAP[name]||allWeapons().find(w=>w.name===name);}
function allArmorMaterialsFor(loc){
  const custom=customContentByType("armor").map(customArmorShape)
   .filter(a=>!a.locations.length||a.locations.includes(loc)||a.locations.includes(loc.includes("Arm")?"Each Arm":loc.includes("Leg")?"Each Leg":loc));
  return ARMOR_MATERIALS.concat(custom);
}
function armorMaterialByName(name){
  if(ARMOR_MAP[name])return ARMOR_MAP[name];
  return customContentByType("armor").map(customArmorShape).find(a=>a.name===name)||ARMOR_MAP.None;
}
function allFolkSpells(){return FOLK_MAGIC.concat(customContentByType("spell").map(customSpellShape));}
function folkSpellByName(name){return FOLK_MAGIC_MAP[name]||allFolkSpells().find(s=>s.n===name);}

/* ================= UNIFIED DATA LAYER (routes to cloud or local) =================
   Every view below reads from these — never from the Local/cloudFetch*
   functions directly — so the same rendering code works whether or not
   Supabase is configured. Cloud calls are async; CAMP_CACHE / CAMPAIGN_VIEW
   are populated by a loader, then render() is called again once they land
   (a short "Loading…" state shows in between). */
const cloudActive=()=>CLOUD_ENABLED&&!!AUTH_USER;
// Local campaign records store session_state under the same camelCase
// convention as createdAt (converted to created_at here) -- one shared spot
// for the local->unified shape instead of the four near-identical object
// literals this used to be inlined as (list/detail/create/board-refetch).
function normalizeLocalCampaign(c){
  return c?{id:c.id,name:c.name,notes:c.notes,rules_settings:c.rulesSettings||null,session_state:c.sessionState||null,
    created_at:new Date(c.createdAt).toISOString(),dm_id:null,invite_code:null}:null;
}
let CAMP_LOAD_ERROR="",CAMP_LOAD_SEQUENCE=0;
async function loadCampaignsUnified(){
  const seq=++CAMP_LOAD_SEQUENCE,owner=AUTH_USER?.id||null,cloud=cloudActive();
  CAMP_LOAD_ERROR="";CAMP_CACHE=null;
  try{
    const camps=cloud?await cloudFetchCampaigns():loadCampaignsLocal().map(normalizeLocalCampaign);
    if(seq!==CAMP_LOAD_SEQUENCE||owner!==(AUTH_USER?.id||null)||cloud!==cloudActive())return;
    CAMP_CACHE=camps;
  }catch(e){
    if(seq!==CAMP_LOAD_SEQUENCE||owner!==(AUTH_USER?.id||null)||cloud!==cloudActive())return;
    CAMP_LOAD_ERROR="Could not load your campaigns: "+(e?.message||"Unknown error")+". Your saved campaigns have not been deleted.";
  }
  render();
}
// "My Characters" — every character ever autosaved (local) or owned
// (cloud), independent of which campaign (if any) they're linked to.
// localCharShape() already normalizes local library entries to the same
// {id,name,tier,culture,career,updated_at,...} shape cloudFetchCharacters
// returns, so the list view doesn't need to branch on cloud vs. local.
let LIB_LOAD_ERROR="";
async function loadLibraryUnified(){
  LIB_LOAD_ERROR="";
  try{
    if(cloudActive()){await flushCloudSaves();LIB_CACHE=await cloudFetchCharacters({mine:true});}
    else{LIB_CACHE=loadCharLibLocal().map(localCharShape);}
  }catch(e){LIB_LOAD_ERROR="Could not load your characters: "+e.message+". Your saved characters have not been deleted.";}
  render();
}
async function loadCampaignViewUnified(id){
 try{
  if(cloudActive()){
    const [campRes,members,chars,mine]=await Promise.all([
      sb.from("campaigns").select("*").eq("id",id).maybeSingle(),
      cloudFetchMembers(id),
      cloudFetchCharacters({campaignId:id}),
      cloudFetchCharacters({mine:true})
    ]);
    CAMPAIGN_VIEW={campaign:await withGmSessionState(campRes.data||null),members,chars,unassigned:mine.filter(c=>!c.campaign_id)};
  }else{
    const campaign=normalizeLocalCampaign(getCampaignLocal(id));
    // Always an object, even when campaign itself is null (id not found) --
    // matching the cloud branch above. CAMPAIGN_VIEW===null is how
    // campaignDetailHTML()/boardHTML() distinguish "still loading" from "here's
    // what we found (nothing)"; collapsing a not-found result back to bare
    // null made a bad/stale campaign link (typed by hand, or now reachable
    // directly via router.js) get stuck on "Loading campaign…" forever, since
    // nothing was ever going to load it deeper the second time.
    CAMPAIGN_VIEW={campaign,members:[],
      chars:campaign?charsInCampaignLocal(id).map(localCharShape):[],
      unassigned:campaign?unassignedCharsLocal().map(localCharShape):[]};
  }
  render();
 }catch(e){CAMP_MSG="Could not load campaign: "+e.message;CAMPAIGN_VIEW={campaign:null,members:[],chars:[],unassigned:[]};render();}
}
async function createCampaignUnified(name,rules){
  if(cloudActive())return cloudCreateCampaign(name,rules);
  const camp={id:genId(),name,notes:"",rulesSettings:rules||null,createdAt:Date.now()};
  upsertCampaignLocal(camp);
  return normalizeLocalCampaign(camp);
}
async function renameCampaignUnified(id,name){
  if(cloudActive())return cloudUpdateCampaign(id,{name});
  const camp=getCampaignLocal(id);if(!camp)return;camp.name=name;upsertCampaignLocal(camp);
}
async function noteCampaignUnified(id,notes){
  if(cloudActive())return cloudUpdateCampaign(id,{notes});
  const camp=getCampaignLocal(id);if(!camp)return;camp.notes=notes;upsertCampaignLocal(camp);
}
// GM session state (Combat Tracker, private session notes) lives in the
// GM-only campaign_gm_state table (migration 20261106120000). Until that
// migration is applied, fall back to the old campaigns.session_state column.
let GM_STATE_TABLE_MISSING=false;
function isMissingTableError(e){return !!e&&(e.code==="PGRST205"||e.code==="42P01"||/campaign_gm_state/.test(String(e.message||""))&&/does not exist|schema cache|not find/i.test(String(e.message||"")));}
async function fetchGmSessionState(campaignId){
  if(GM_STATE_TABLE_MISSING)return undefined;
  const {data,error}=await sb.from("campaign_gm_state").select("session_state").eq("campaign_id",campaignId).maybeSingle();
  if(error){if(isMissingTableError(error)){GM_STATE_TABLE_MISSING=true;return undefined;}throw error;}
  return data?data.session_state:null;
}
// Only the campaign's GM ever asks for its session state.
async function withGmSessionState(camp){
  if(!camp||!AUTH_USER||camp.dm_id!==AUTH_USER.id)return camp;
  const st=await fetchGmSessionState(camp.id);
  if(st!==undefined&&(st!==null||!camp.session_state))camp.session_state=st;
  return camp;
}
async function sessionStateCampaignUnified(id,sessionState){
  if(cloudActive()){
    if(!GM_STATE_TABLE_MISSING){
      const {error}=await sb.from("campaign_gm_state").upsert({campaign_id:id,session_state:sessionState,updated_at:new Date().toISOString()},{onConflict:"campaign_id"});
      if(!error)return;
      if(!isMissingTableError(error))throw error;
      GM_STATE_TABLE_MISSING=true;
    }
    return cloudUpdateCampaign(id,{session_state:sessionState});
  }
  const camp=getCampaignLocal(id);if(!camp)return;camp.sessionState=sessionState;upsertCampaignLocal(camp);
}
// Single-row refetch used by the board's realtime handler below to pick up
// GM-tool edits (initiative/NPCs/notes) made from another tab/device,
// mirroring loadBoardUnified's character refetch.
async function loadCampaignRowUnified(id){
  if(cloudActive()){const {data,error}=await sb.from("campaigns").select("*").eq("id",id).maybeSingle();if(error)throw error;return withGmSessionState(data||null);}
  return normalizeLocalCampaign(getCampaignLocal(id));
}
// Settings live on a separate campaign column; session tracker writes never overwrite it.
const CAMPAIGN_BOOKS=["Mythras Companion","Classic Fantasy","Mythic Babylon","M-Space"];
function normalizedCampaignRules(v){
 if(!v||typeof v!=="object")return null;
 const method=["training","permanent"].includes(v.characteristicImprovement)?v.characteristicImprovement:null;
 const books=Array.isArray(v.books)?v.books.filter(x=>typeof x==="string"&&x.trim()).map(x=>x.trim().slice(0,100)).slice(0,20):[];
 // Core p.72: the GM may raise skill improvement from 1d4+1 to 1d6+1 for the whole campaign.
 const skillImprovement=v.skillImprovement==="d6"?"d6":"d4";
 return {characteristicImprovement:method,skillImprovement,books:[...new Set(books)]};
}
async function saveCampaignRulesUnified(camp,rules){
 if(cloudActive()){
   const {data,error}=await sb.from("campaigns").update({rules_settings:rules}).eq("id",camp.id).select("id,rules_settings").maybeSingle();
   if(error)throw error;if(!data)throw Error("The campaign settings were not saved; check your GM access.");return data.rules_settings;
 }
 const local=getCampaignLocal(camp.id);if(!local)throw Error("Campaign not found.");
 local.rulesSettings=rules;upsertCampaignLocal(local);return rules;
}
let CHARACTER_CAMPAIGN_RULES={id:null,status:"none",rules:null};
async function refreshCharacterCampaignRules(id){
 if(!id){CHARACTER_CAMPAIGN_RULES={id:null,status:"ready",rules:null};return null;}
 const owner=AUTH_USER?.id||null;
 const row=await loadCampaignRowUnified(id);if(!row)throw Error("Campaign settings are unavailable. Try again or contact the GM.");
 const rules=normalizedCampaignRules(row.rules_settings);
 if(row.rules_settings!=null&&!rules?.characteristicImprovement)throw Error("The GM needs to review the campaign rules.");
 if((AUTH_USER?.id||null)!==owner)throw Error("The account changed while loading campaign rules.");
 if(S.campaignId===id)CHARACTER_CAMPAIGN_RULES={id,status:"ready",rules};return rules;
}
function rulesForOpenCharacter(){
 if(!S.campaignId)return {status:"standalone",rules:null};
 if(CHARACTER_CAMPAIGN_RULES.id!==S.campaignId)return {status:"loading",rules:null};
 return CHARACTER_CAMPAIGN_RULES;
}
async function deleteCampaignUnified(id){
  if(cloudActive())return cloudDeleteCampaign(id);
  return deleteCampaignByIdLocal(id);
}
// Real Supabase primary keys are UUIDs; the local-only library instead uses
// genId() (timestamp+random, no dashes) — the two formats never collide, so
// this is a safe, cheap way to tell whether S._libId (if set at all) is
// actually a cloud row id or just a leftover from local/offline use before
// ever signing in. Without this check, a stale local-format id sitting in
// S._libId would make cloudUpsertCharacter take the UPDATE path against a
// row that was never created, and the character would never actually reach
// the cloud at all (silently — the debounced push swallows the error).
function isUuid(s){return typeof s==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);}
// Serialize writes per character. Capture the actor before awaiting the server:
// a response for character A must never assign its ID to character B.
const CHARACTER_SAVE_QUEUES=new WeakMap();
const CLOUD_SAVE_JOBS=new Set();
const CLOUD_FAILED_ACTORS=new Map();
let CLOUD_SAVE_ERROR="", CLOUD_LAST_SAVED=null;
async function saveToLibraryUnified(explicit,actor=S){
  if(!cloudActive())return Promise.resolve(saveCurrentToLibraryLocal());
  if(!explicit&&actor._pendingClaim&&!isUuid(actor._libId))return Promise.resolve(null);
  const owner=AUTH_USER.id;
  const snapshot=JSON.parse(JSON.stringify(actor));
  const previous=CHARACTER_SAVE_QUEUES.get(actor)||Promise.resolve();
  const job=previous.catch(()=>{}).then(async()=>{
    if(!AUTH_USER||AUTH_USER.id!==owner)throw new Error("Account changed before saving. Reopen the original account to recover the draft.");
    // A GM may have given items through dm_update_character_inventory since
    // this sheet loaded. Pull those gifts in first so this save can't erase them.
    if(CLOUD_CONFLICTS.has(actor))throw CLOUD_CONFLICTS.get(actor);
    if(isUuid(actor._libId)&&(snapshot._ownerId==null||snapshot._ownerId===owner)){
      // Also checks the revision (D-S2): GM gifts are merged quietly, any
      // other newer save stops this one before it overwrites anything.
      const added=await syncWithServerCopy(actor);
      if(added){snapshot.inventory=JSON.parse(JSON.stringify(actor.inventory));if(actor===S&&typeof render==="function")setTimeout(render,0);}
    }
    const state=Object.assign({},snapshot);delete state._rev;
    const saved=await cloudUpsertCharacter({
      id:isUuid(actor._libId)?actor._libId:undefined,campaignId:snapshot.campaignId||null,
      name:snapshot.concept.name||"Unnamed Character",tier:snapshot.archetype,culture:snapshot.culture||"",
      career:(snapshot.customCareer&&snapshot.customCareer.isCustom?snapshot.customCareer.name:snapshot.career)||"",
      state,revision:isUuid(actor._libId)?actor._rev:undefined});
    actor._libId=saved.id;actor._pendingClaim=false;
    if(Number.isSafeInteger(saved.revision)){actor._rev=saved.revision;rememberServerCopy(saved.id,saved.revision,saved.state||state);}
    // A completed older write must not acknowledge a newer local draft.
    try{
      const key=AUTOSAVE_KEY+":"+owner,raw=localStorage.getItem(key),draft=raw?JSON.parse(raw):null;
      if(draft?.pendingCloud&&JSON.stringify(draft.S)===JSON.stringify(snapshot)){
        draft.pendingCloud=false;localStorage.setItem(key,JSON.stringify(draft));
      }
    }catch(e){/* Keep the draft available when acknowledgement storage fails. */}
    CLOUD_LAST_SAVED=Date.now();CLOUD_FAILED_ACTORS.delete(actor);
    CLOUD_SAVE_ERROR=[...CLOUD_FAILED_ACTORS.values()].join(" ");
    return saved;
  });
  CHARACTER_SAVE_QUEUES.set(actor,job);CLOUD_SAVE_JOBS.add(job);
  job.then(()=>{CLOUD_SAVE_JOBS.delete(job);updateSaveStatus();},e=>{
    CLOUD_SAVE_JOBS.delete(job);
    if(isCharacterConflict(e)){CLOUD_CONFLICTS.set(actor,e);CLOUD_FAILED_ACTORS.set(actor,conflictMessage(snapshot.concept.name));}
    else CLOUD_FAILED_ACTORS.set(actor,"Cloud save failed for "+snapshot.concept.name+": "+e.message+". Keep this tab open and retry; export JSON for a backup.");
    CLOUD_SAVE_ERROR=[...CLOUD_FAILED_ACTORS.values()].join(" ");updateSaveStatus();
  });
  updateSaveStatus();return job;
}

// Gifts on the account copy that this sheet doesn't have yet are appended to
// the in-memory character. Returns how many were added. Best effort: a failed
// read never blocks the player's own save.
async function mergeServerGifts(actor){
  try{
    const {data,error}=await sb.from("characters").select("*").eq("id",actor._libId).maybeSingle();
    if(error)return 0;
    return mergeGiftItems(actor,data?.state?.inventory);
  }catch(e){return 0;}
}
function mergeGiftItems(actor,inventory){
  {
    if(!Array.isArray(inventory))return 0;
    const have=rememberGifts(actor);
    const incoming=inventory.filter(it=>it&&typeof it==="object"&&giftValid(it.gift)&&!have.has(it.gift.id));
    if(!incoming.length)return 0;
    actor.inventory=(actor.inventory||[]).concat(incoming.map(it=>({name:String(it.name||"").slice(0,120),qty:Number.isSafeInteger(it.qty)&&it.qty>0?it.qty:1,
      enc:Number(it.enc)>=0?Number(it.enc):0,cost:Number(it.cost)>=0?Number(it.cost):0,
      gift:{id:it.gift.id,reveal:it.gift.reveal===true,note:String(it.gift.note||"").slice(0,200),at:String(it.gift.at||""),seen:it.gift.seen===true}})));
    rememberGifts(actor);
    return incoming.length;
  }
}
/* D-S2 save conflicts (docs/decisions.md, 2026-11-07). Each character row has
   a revision the server bumps whenever its state changes. A sheet remembers
   the revision it opened and saves only if it still matches; otherwise it
   stops, warns and offers to reload. GM "Give an item" gifts are the one
   change merged quietly: SERVER_COPIES remembers each server state seen
   (minus gift items), so a newer revision that differs only by gifts is
   adopted instead of reported. Before the migration runs there is no
   revision and saves behave as before (last save wins). */
const SERVER_COPIES=new Map(); // "id:revision" -> {key,invKey}; key null when only the inventory is known
const CLOUD_CONFLICTS=new Map(); // actor -> conflict error; its saves stop until reload
function stableJson(v){
  if(Array.isArray(v))return "["+v.map(stableJson).join(",")+"]";
  if(v&&typeof v==="object")return "{"+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+":"+stableJson(v[k])).join(",")+"}";
  return JSON.stringify(v===undefined?null:v);
}
function giftlessKey(state){
  if(!state||typeof state!=="object")return "";
  const copy=Object.assign({},state);delete copy._rev;
  if(Array.isArray(copy.inventory))copy.inventory=copy.inventory.filter(it=>!(it&&typeof it==="object"&&it.gift));
  return stableJson(copy);
}
function rememberServerCopy(id,rev,state){
  if(id&&Number.isSafeInteger(rev))rememberCopy(id,rev,giftlessKey(state),Array.isArray(state?.inventory)?state.inventory:[]);
}
function rememberCopy(id,rev,key,inventory){
  SERVER_COPIES.set(id+":"+rev,{key,invKey:stableJson(inventory)});
  if(SERVER_COPIES.size>200)SERVER_COPIES.delete(SERVER_COPIES.keys().next().value);
}
function characterConflict(name){
  const e=new Error((name||"This character")+" was changed somewhere else since it was opened");
  e.conflict=true;return e;
}
function isCharacterConflict(e){return !!e&&(e.conflict===true||e.code==="40001"||/^conflict:/i.test(String(e.message||"")));}
function conflictMessage(name){
  return (name||"This character")+" was saved somewhere else (another tab, device or the GM) since you opened it. Your latest changes were not saved, so nothing was overwritten. Download your version if you want to keep it, then reload the latest copy.";
}
async function syncWithServerCopy(actor){
  let row=null;
  try{const {data,error}=await sb.from("characters").select("*").eq("id",actor._libId).maybeSingle();if(!error)row=data;}catch(e){}
  if(!row)return 0; // unreadable: the conditional update still guards the write
  const added=mergeGiftItems(actor,row.state?.inventory);
  const rev=row.revision;
  if(!Number.isSafeInteger(rev))return added; // migration not run yet
  if(!Number.isSafeInteger(actor._rev)){actor._rev=rev;rememberServerCopy(row.id,rev,row.state);return added;} // opened before revisions existed
  if(rev===actor._rev)return added;
  const seen=SERVER_COPIES.get(row.id+":"+actor._rev);
  if(seen&&seen.key!=null&&seen.key===giftlessKey(row.state)){actor._rev=rev;rememberServerCopy(row.id,rev,row.state);return added;}
  throw characterConflict(actor.concept&&actor.concept.name);
}
// Reload the open character from the account after a conflict.
async function reloadConflictedCharacter(){
  const actor=S,id=actor._libId;if(!isUuid(id))return false;
  const entry=await openCharUnified(id);if(!entry)return false;
  CLOUD_CONFLICTS.delete(actor);CLOUD_FAILED_ACTORS.delete(actor);CLOUD_SEEN_STATE.delete(actor);
  const t=CLOUD_PENDING_ACTORS.get(actor);if(t){clearTimeout(t);CLOUD_PENDING_ACTORS.delete(actor);}
  CLOUD_SAVE_ERROR=[...CLOUD_FAILED_ACTORS.values()].join(" ");
  S=Object.assign(freshState(),entry.state);if(!Object.prototype.hasOwnProperty.call(entry.state,"_creationFlowVersion"))S._creationFlowVersion=1;normalizeState();
  S._libId=entry.id;S.campaignId=entry.campaignId;S._ownerId=entry.ownerId;S._pendingClaim=false;
  CLOUD_SEEN_STATE.set(S,cloudSignature(S));
  try{const key=autosaveKey(),raw=localStorage.getItem(key),draft=raw?JSON.parse(raw):null;
    if(draft?.S?._libId===id){draft.pendingCloud=false;localStorage.setItem(key,JSON.stringify(draft));}}catch(e){}
  updateSaveStatus();
  return true;
}
// The revision changes on every save; it alone is not an edit worth pushing.
function cloudSignature(actor){return JSON.stringify(actor,(k,v)=>k==="_rev"?undefined:v);}
// While the owner has Play Mode open, check for new gifts now and then.
let GIFT_POLL=null;
function startGiftPoll(){
  if(GIFT_POLL||typeof setInterval!=="function")return;
  GIFT_POLL=setInterval(async()=>{
    if(!cloudActive()||VIEW_ONLY||APPVIEW!=="play"||!isUuid(S._libId)||(typeof document!=="undefined"&&document.visibilityState==="hidden"))return;
    const actor=S;if(await mergeServerGifts(actor)&&actor===S)render();
  },30000);
}
async function unassignCharUnified(id){
  if(cloudActive()){const {error}=await sb.from("characters").update({campaign_id:null}).eq("id",id);if(error)throw error;return;}
  const lib=loadCharLibLocal();const e=lib.find(c=>c.id===id);if(!e)return;e.campaignId=null;saveCharLibListLocal(lib);
}
async function assignCharUnified(id,campaignId){
  if(cloudActive()){const {error}=await sb.from("characters").update({campaign_id:campaignId}).eq("id",id);if(error)throw error;return;}
  const lib=loadCharLibLocal();const e=lib.find(c=>c.id===id);if(!e)return;e.campaignId=campaignId;saveCharLibListLocal(lib);
}
async function openCharUnified(id){
  // Finish pending edits before reading the cloud row back into the builder.
  // Otherwise a quick return to Edit can overwrite a newly uploaded portrait.
  if(cloudActive())await flushCloudSaves();
  // Returns campaignId/ownerId straight from the DB row (or the local
  // library entry), NOT from whatever was embedded in the saved state blob
  // at last-save time — the blob can be stale if a DM unassigned/reassigned
  // the character since then, and blindly trusting it would silently undo
  // that change on the next save.
  if(cloudActive()){
    const {data,error}=await sb.from("characters").select("*").eq("id",id).maybeSingle();
    if(error||!data)return null;
    let state=data.state;
    if(Number.isSafeInteger(data.revision)){
      state=Object.assign({},data.state,{_rev:data.revision});
      rememberServerCopy(data.id,data.revision,data.state);
    }
    return {id:data.id,name:data.name,state,campaignId:data.campaign_id||null,ownerId:data.owner_id};
  }
  const entry=loadCharLibLocal().find(c=>c.id===id);
  return entry?{id:entry.id,name:entry.name,state:entry.state,campaignId:entry.campaignId||null,ownerId:"local"}:null;
}
async function deleteCharUnified(id){
  if(cloudActive()){const {error}=await sb.from("characters").delete().eq("id",id);if(error)throw error;return;}
  saveCharLibListLocal(loadCharLibLocal().filter(c=>c.id!==id));
}
let CLOUD_PUSH_TIMER=null;
// Debounced cloud sync — this is what makes Play Mode changes (damage taken,
// AP spent, Luck burned...) actually reach the DM's live Party Board instead
// of staying trapped in localStorage. Fires ~1.5s after the last edit so a
// flurry of clicks in a single combat round doesn't turn into a network
// request per click; the Party Board's own realtime subscription then picks
// up the change and refetches. Never fires for a VIEW_ONLY session (someone
// looking at a teammate's sheet from the board).
const CLOUD_PENDING_ACTORS=new Map();
const CLOUD_SEEN_STATE=new WeakMap();
function scheduleCloudPush(){
  if(!cloudActive()||VIEW_ONLY||!hasUnsavedWork())return;
  const actor=S;
  if(actor._pendingClaim&&!isUuid(actor._libId))return;
  if(CLOUD_CONFLICTS.has(actor))return;
  const signature=cloudSignature(actor);
  if(CLOUD_SEEN_STATE.get(actor)===signature)return;
  CLOUD_SEEN_STATE.set(actor,signature);
  const old=CLOUD_PENDING_ACTORS.get(actor);if(old)clearTimeout(old);
  const timer=setTimeout(()=>{
    CLOUD_PENDING_ACTORS.delete(actor);
    saveToLibraryUnified(false,actor).catch(()=>{CLOUD_SEEN_STATE.delete(actor);});
  },1500);
  CLOUD_PENDING_ACTORS.set(actor,timer);updateSaveStatus();
}
async function flushCloudSaves(){
  const actors=[...new Set([...CLOUD_PENDING_ACTORS.keys(),...CLOUD_FAILED_ACTORS.keys()])].filter(a=>!CLOUD_CONFLICTS.has(a));
  for(const timer of CLOUD_PENDING_ACTORS.values())clearTimeout(timer);
  CLOUD_PENDING_ACTORS.clear();
  const jobs=actors.map(actor=>saveToLibraryUnified(false,actor));
  await Promise.all([...CLOUD_SAVE_JOBS,...jobs]);
  updateSaveStatus();
}
function updateSaveStatus(){
  const status=document.getElementById("forgeSaveStatus");
  if(status){
    const pending=CLOUD_PENDING_ACTORS.size||CLOUD_SAVE_JOBS.size;
    status.textContent=LOCAL_SAVE_ERROR?"Not saved — export a backup":cloudActive()?
      (CLOUD_SAVE_ERROR?"Cloud save failed":pending?"Saving to account…":CLOUD_LAST_SAVED?"Saved to account":"Account connected"):
      (MOCK_AUTH?"Test guest · stored in this browser":"Sign in to save characters");
    status.dataset.error=String(!!(LOCAL_SAVE_ERROR||CLOUD_SAVE_ERROR));
  }
  const retry=document.getElementById("forgeRetrySave");
  if(retry){retry.hidden=!CLOUD_SAVE_ERROR||!cloudActive();retry.disabled=!!CLOUD_SAVE_JOBS.size;}
  const backup=document.getElementById("forgeExportRecovery");
  if(backup)backup.hidden=!(LOCAL_SAVE_ERROR||CLOUD_SAVE_ERROR);
  const warning=document.getElementById("localSaveWarning");
  if(warning){
    const text=LOCAL_SAVE_ERROR||CLOUD_SAVE_ERROR||(APPVIEW==="board"?BOARD_LOAD_ERROR:"");
    // A conflict on the open sheet offers its two ways out right in the warning.
    if(!LOCAL_SAVE_ERROR&&CLOUD_CONFLICTS.has(S)){
      warning.innerHTML=esc(CLOUD_FAILED_ACTORS.get(S)||text)+'<span class="save-warning-actions"><button type="button" onclick="APP.exportConflictCopy()">Download my version</button> <button type="button" onclick="APP.reloadAfterConflict()">Reload latest</button></span>';
      warning.dataset.conflict="true";
    }else{warning.textContent=LOCAL_SAVE_ERROR||CLOUD_SAVE_ERROR||(APPVIEW==="board"?BOARD_LOAD_ERROR:"");delete warning.dataset.conflict;}
    warning.hidden=!text;
  }
}
window.addEventListener("beforeunload",e=>{
  if(CLOUD_PENDING_ACTORS.size||CLOUD_SAVE_JOBS.size||CLOUD_SAVE_ERROR||LOCAL_SAVE_ERROR){e.preventDefault();e.returnValue="";}
});
window.addEventListener("online",()=>{if(cloudActive()&&!VIEW_ONLY){CLOUD_SEEN_STATE.delete(S);scheduleCloudPush();}});
// A reload, tab switch or mobile backgrounding inside the 1.5s debounce used
// to leave the account copy one step behind (e.g. a lost casting turn). Start
// any waiting save at once; the local draft and recovery prompt still cover a
// request the browser abandons during unload.
function flushPendingCloudSavesNow(){
  if(CLOUD_PENDING_ACTORS.size)flushCloudSaves().catch(()=>{});
}
window.addEventListener("pagehide",flushPendingCloudSavesNow);
if(typeof document!=="undefined")document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flushPendingCloudSavesNow();});

let DM_INV_PUSH_TIMER=null;
// Separate debounced push for the DM-editing-a-player's-inventory case.
// scheduleCloudPush() above deliberately never fires under VIEW_ONLY (the DM
// has no general write access), so a loot-drop edit needs its own path that
// goes through the scoped dm_update_character_inventory RPC instead of the
// normal owner upsert.
function scheduleDmInventoryPush(){
  if(!cloudActive()||!S._libId||!VIEW_ONLY_IS_DM)return;
  clearTimeout(DM_INV_PUSH_TIMER);
  const actor=S;
  if(CLOUD_CONFLICTS.has(actor))return;
  DM_INV_PUSH_TIMER=setTimeout(()=>{
    dmPushInventory(actor).catch(e=>{
      if(isCharacterConflict(e)){
        CLOUD_CONFLICTS.set(actor,e);CLOUD_FAILED_ACTORS.set(actor,conflictMessage(actor.concept&&actor.concept.name));
        CLOUD_SAVE_ERROR=[...CLOUD_FAILED_ACTORS.values()].join(" ");updateSaveStatus();
      }else console.warn("dm inventory sync",e);
    });
  },1500);
}
// The GM's inventory push carries the revision the GM opened. The player
// saving HP or skills since then is no reason to stop: if the inventory on
// the server is still the one the GM started from, adopt the new revision
// and send again. A changed inventory is a real conflict.
async function dmPushInventory(actor){
  const id=actor._libId,inventory=JSON.parse(JSON.stringify(actor.inventory||[]));
  const done=rev=>{
    if(Number.isSafeInteger(rev)){actor._rev=rev;rememberCopy(id,rev,null,inventory);}
    return rev;
  };
  try{return done(await cloudDmUpdateCharacterInventory(id,inventory,actor._rev));}
  catch(e){
    if(!isCharacterConflict(e))throw e;
    const {data:row}=await sb.from("characters").select("*").eq("id",id).maybeSingle();
    const seen=SERVER_COPIES.get(id+":"+actor._rev);
    if(row&&Number.isSafeInteger(row.revision)&&seen&&seen.invKey===stableJson(Array.isArray(row.state?.inventory)?row.state.inventory:[])){
      actor._rev=row.revision;rememberServerCopy(id,row.revision,row.state);
      return done(await cloudDmUpdateCharacterInventory(id,inventory,row.revision));
    }
    throw e;
  }
}
let LOCAL_SAVE_ERROR="";
function saveAutosave(){
  try{localStorage.setItem(autosaveKey(),JSON.stringify({S,ts:Date.now(),pendingCloud:cloudActive()&&!VIEW_ONLY}));LOCAL_SAVE_ERROR="";}
  catch(e){LOCAL_SAVE_ERROR="This browser could not save the character. Export JSON now to avoid losing changes (storage may be full or disabled).";}
  // Also keep the character library (mythrasForgeCharLib_v1) in sync on
  // every autosave, not just on an explicit "Save to Library" click. The
  // library already existed as infrastructure for Campaigns, but until now
  // a character only showed up in it if you remembered to save it there —
  // "My Characters" needs every character that's ever been worked on to
  // actually be there, matching what autosave already implies. Gated on
  // hasUnsavedWork() so a blank just-opened "New Character" doesn't spam
  // the library with empty placeholder entries.
  // Only do this LOCAL mirror when signed out — under cloud mode it's not
  // just redundant, it's actively harmful: saveCurrentToLibraryLocal()
  // assigns S._libId := genId() the very first time it runs on a brand-new
  // character (since S._libId starts undefined), and that non-UUID id would
  // then sit in S._libId *before* any real cloud save has ever happened.
  // isUuid() in saveToLibraryUnified guards against that id being trusted as
  // a real row id, but it's still cleaner not to manufacture it in the first
  // place — cloud mode has its own real source of truth (the debounced push
  // below, plus the explicit "Save to Library" button).
  if(!cloudActive()&&hasUnsavedWork()){
    try{saveCurrentToLibraryLocal();}
    catch(e){LOCAL_SAVE_ERROR="The character library could not save. Export JSON now to protect your character.";}
  }
  scheduleCloudPush();
  scheduleDmInventoryPush();
  updateAutosaveTag();
}
function updateAutosaveTag(){
  updateSaveStatus();
  const el=$("#autosaveTag");if(!el)return;
  try{const raw=localStorage.getItem(autosaveKey());
    if(raw){const t=JSON.parse(raw).ts;el.textContent="autosaved "+new Date(t).toLocaleTimeString()+" (click to clear)";el.onclick=APP.clearAutosave;el.style.cursor="pointer";}
    else{el.textContent="";el.onclick=null;el.style.cursor="";}
  }catch(e){el.textContent="";}
}

/* ================= APP-LEVEL VIEW (menu vs. character editor) =================
   This sits above the character-creator state below. As campaign tools get
   built out, they'll be additional views switched the same way, off the same
   main menu — the character creator is the first of what should become
   several "apps" this file can open into. */
let APPVIEW="menu";
let CURRENT_CAMPAIGN_ID=null;
// Inline replacement for the Main Menu's former alert() calls (bad
// autosave load, join-a-campaign guard/result, a stale deep link bouncing
// here via router.js's redirectHome) -- rendered once near the bottom of
// menuHTML(), cleared whenever the menu is (re)entered.
let MENU_MSG=null;
// Same idea, shared across Campaigns list / Campaign detail / My Characters
// -- closely related pages reached from the same Main Menu tiles, each
// clears it on its own entry point so a stale message never bleeds from one
// into another.
let CAMP_MSG=null;
// Account page (sign-in/sign-up/password errors, plus success messages like
// "Reset email sent" and "Password updated" that used to be a bare alert()).
let AUTH_MSG=null;
let ACCOUNT_BACKUPS=null;
let ACCOUNT_TAB='in'; // Account page tab: 'in' (Sign in) or 'up' (Create account)
let ACCOUNT_BACKUP_MSG="";
let XP_OPEN=false; // Improve Skills modal visibility — ephemeral UI state, not saved character data
let SHEET_RETURN_VIEW="play"; // where APP.backFromSheet() sends you back to — set by whoever opened the sheet view
function getAutosaveInfo(){
  try{const raw=localStorage.getItem(autosaveKey());if(!raw)return null;
    const saved=JSON.parse(raw);if(!saved||!saved.S)return null;
    const s=saved.S;
    const careerName=s.customCareer&&s.customCareer.isCustom?s.customCareer.name:s.career;
    const chars=s.chars||{};
    const charsSet=["STR","CON","SIZ","DEX","INT","POW","CHA"].every(k=>chars[k]!=null);
    return {name:(s.concept&&s.concept.name)||"Unnamed Character",ts:saved.ts,
      culture:s.culture||null,career:careerName||null,
      tier:s.archetype&&s.archetype!=="ordinary"?s.archetype:null,
      chars:charsSet?chars:null};
  }catch(e){return null;}
}
function hasUnsavedWork(){
  return !!(S.concept.name||charsReady()||S.culture||S.career||(S.qProf&&S.qProf.some(Boolean)));
}
function menuTile(title,desc,onclick,disabled,primary){
  return '<button class="menutile'+(primary?" primary":"")+'" '+(onclick&&!disabled?'onclick="'+onclick+'"':"")+(disabled?" disabled":"")+'><span class="mt-title">'+esc(title)+'</span><span class="mt-desc">'+esc(desc)+'</span></button>';
}
// Account is its own page now, reached via a top-right button on the Main
// Menu, rather than a form embedded in the menu body — the same pattern
// almost every real app uses (sign-in is a destination, not furniture on
// the home screen). Email & password only -- the magic-link toggle and the
// local-mock "Test Account" panel were both removed from this view; MOCK_AUTH
// itself and the code paths that check it elsewhere are untouched, this only
// drops the panel that used to set it.
function accountHTML(){
  let h='<div class="mmenu st-page">'+stPageHead({eyebrow:'Your table',title:'Account',sub:AUTH_USER&&AUTH_PROFILE?(cloudActive()?'Signed in and synced.':'Signed in.'):'Sign in to keep your characters and campaigns in sync across devices.'});
  if(GUEST_TEST_ENABLED&&!AUTH_USER){
    h+='<div class="mmenu-panel" style="margin-bottom:16px"><div class="mmenu-panel-eyebrow">Try without an account</div>'
     +'<p class="note">Guest mode works without Supabase. Characters and campaigns are saved only in this browser on this device, not synced or backed up. Export your character before clearing website data or changing devices.</p>'
     +(MOCK_AUTH?'<button class="chip" onclick="APP.mockSignOut()">Leave guest mode</button>':'<button class="mmenu-cta-primary" onclick="APP.mockSignIn()">Continue as Guest &rarr;</button>')
     +'</div>';
  }
  h+='<div class="mmenu-authgrid">';
  h+='<div class="mmenu-panel mmenu-authpanel">';
  if(!CLOUD_ENABLED){
    h+='<div class="mmenu-panel-eyebrow">Sign-in unavailable</div><p class="note">The sign-in service could not load. Check your connection and reload the page. Your saved data has not been removed.</p>';
  }else if(AUTH_RECOVERY){
    h+='<div class="mmenu-panel-eyebrow">Reset password</div><div class="mmenu-authhead"><b>Choose a new password</b>'
     +'<span>You clicked a password-reset link. Set a new password below to finish.</span></div>'
     +'<div class="mmenu-joinrow"><input type="password" id="authNewPw" placeholder="New password (8+ characters)"><button class="chip" onclick="APP.setNewPassword()">Save</button></div>';
  }else if(AUTH_USER&&AUTH_PROFILE){
    // Profile card (owner menu redesign): avatar, name, email, sync status.
    const nm=AUTH_PROFILE.display_name||'';
    h+='<div class="st-profile"><div class="st-avatar" aria-hidden="true">'+esc(stInitials(nm))+'</div><div><b>'+esc(nm)+'</b><span>'+esc(AUTH_USER.email)+'</span>'
     +'<small class="st-sync">'+(cloudActive()?'Synced to your account':'Saved in this browser')+'</small></div></div>'
     +'<label class="st-label" for="authName">Display name</label><div class="st-row"><input type="text" id="authName" class="st-input" value="'+esc(nm)+'" autocomplete="nickname">'
     +'<button type="button" class="st-btn st-btn-primary" onclick="APP.setDisplayName()">Save</button></div>'
     +'<button type="button" class="st-btn" onclick="APP.signOut()">Sign out</button>';
  }else if(AUTH_USER&&!AUTH_PROFILE){
    h+='<div class="mmenu-panel-eyebrow">One more thing</div><div class="mmenu-authhead"><b>Choose a display name</b>'
     +'<span>Signed in as '+esc(AUTH_USER.email)+'. What should other players see you as?</span></div>'
     +'<div class="mmenu-joinrow"><input type="text" id="authName" placeholder="Display name"><button class="chip" onclick="APP.setDisplayName()">Save</button></div>';
  }else{
    // Sign in / Create account tabs (owner menu redesign, 2026-11-07).
    const up=ACCOUNT_TAB==='up';
    h+='<div class="st-tabs" role="tablist" aria-label="Account"><button type="button" role="tab" id="stTabIn" aria-selected="'+!up+'" aria-controls="stAuthPane" onclick="ACCOUNT_TAB=\'in\';render()">Sign in</button>'
     +'<button type="button" role="tab" id="stTabUp" aria-selected="'+up+'" aria-controls="stAuthPane" onclick="ACCOUNT_TAB=\'up\';render()">Create account</button></div>'
     +'<form class="st-auth" id="stAuthPane" role="tabpanel" aria-labelledby="'+(up?'stTabUp':'stTabIn')+'" onsubmit="event.preventDefault();'+(up?'APP.signUp()':'APP.signIn()')+'">'
     +(AUTH_MSG?'<p class="st-banner'+(AUTH_MSG.level==='okmsg'?' st-banner-ok':'')+'" role="'+(AUTH_MSG.level==='okmsg'?'status':'alert')+'">'+esc(AUTH_MSG.text)+'</p>':'')
     +(AUTH_PENDING==="signup"?'<p class="st-banner st-banner-ok" role="status">Check your email to confirm your account, then sign in.</p>':'')
     +'<label class="st-label" for="authEmail">Email</label><input type="email" id="authEmail" class="st-input" autocomplete="email" placeholder="you@example.com">'
     +'<label class="st-label" for="authPw">Password</label><div class="st-row"><input type="password" id="authPw" class="st-input" autocomplete="'+(up?'new-password':'current-password')+'"'+(up?' placeholder="8 or more characters"':'')+'>'
     +'<button type="button" class="st-btn" aria-pressed="false" onclick="const f=document.getElementById(\'authPw\');const show=f.type===\'password\';f.type=show?\'text\':\'password\';this.setAttribute(\'aria-pressed\',show);this.textContent=show?\'Hide\':\'Show\'">Show</button></div>'
     +'<button type="submit" class="st-btn st-btn-primary st-btn-wide">'+(up?'Create account':'Sign in')+'</button>'
     +(up?'':'<button type="button" class="st-link" onclick="APP.forgotPassword()">Forgot password?</button>')
     +'</form>';
  }
  const authShown=CLOUD_ENABLED&&!AUTH_RECOVERY&&!AUTH_USER;
  if(AUTH_MSG&&!authShown)h+='<p class="st-banner'+(AUTH_MSG.level==='okmsg'?' st-banner-ok':'')+'" role="'+(AUTH_MSG.level==='okmsg'?'status':'alert')+'">'+esc(AUTH_MSG.text)+'</p>';
  h+='</div>';
  h+='<aside class="st-why"><h2>'+(AUTH_USER?'Your account':'Why sign in?')+'</h2><ul>'
   +'<li><b>Characters on every device</b><span>Autosaved to your account as you build.</span></li>'
   +'<li><b>Campaigns and the Party Board</b><span>Your GM sees every linked character.</span></li>'
   +'<li><b>The Pits</b><span>Bring your own characters into the arena.</span></li></ul></aside>';
  h+='</div>';
  if(AUTH_USER||MOCK_AUTH){
    const owner=AUTH_USER?AUTH_USER.id:"local", cache=ACCOUNT_BACKUPS&&ACCOUNT_BACKUPS.owner===owner?ACCOUNT_BACKUPS.rows:null;
    h+='<details class="mmenu-panel" style="margin-top:16px"'+(cache||ACCOUNT_BACKUP_MSG?' open':'')+'><summary>Advanced / Backup</summary><p class="note">Import a character as a new copy, or load your saved characters to download a backup.</p><button class="mmenu-cta-secondary" onclick="APP.chooseImport()">Import character backup</button> <button class="mmenu-cta-secondary" onclick="APP.loadAccountBackups()">Load saved characters</button>';
    if(ACCOUNT_BACKUP_MSG)h+='<p class="warn">'+esc(ACCOUNT_BACKUP_MSG)+'</p>';
    if(cache)h+=cache.length?cache.map(c=>'<p>'+esc(c.name||"Unnamed Character")+' <button class="mmenu-cta-ghost sm" onclick="APP.exportAccountCharacter(\''+jsq(c.id)+'\')">Download backup</button></p>').join(''):'<p class="note">No saved characters.</p>';
    if(MOCK_AUTH&&!cloudActive())h+='<p class="note">Guest library backups apply only to characters saved in this browser.</p><button class="mmenu-cta-secondary" onclick="APP.exportGuestBackup()">Export guest library</button> <button class="mmenu-cta-secondary" onclick="APP.chooseGuestBackupImport()">Import guest library</button>';
    h+='</details>';
  }
  h+='</div>';
  return h;
}
function renderAccountView(){
  document.body.classList.remove("play-mode");
  document.body.classList.remove("sheet-mode");
  document.body.classList.add("menu-mode");
  document.title="Account — Mythras Character Forge";
  $("#main").innerHTML=accountHTML();
}
// Home is the New Sit’ota table; actions retain their existing APP handlers.
function menuHTML(){return sitotaHomeHTML();}
// Top-right sign-in affordance: reflects real Supabase auth if present,
// otherwise a distinct "Test" indicator when a mock session is active, or a
// plain Sign In pill when signed out entirely. Always routes to the
// standalone Account page rather than opening a form inline.
function signInButtonHTML(){
  let label,cls="myth-home-signin";
  if(MOCK_AUTH){label="Guest";cls+=" is-active is-mock";}
  else if(AUTH_USER&&AUTH_PROFILE){label=esc(AUTH_PROFILE.display_name);cls+=" is-active";}
  else if(AUTH_USER){label="Finish sign-in";}
  else{label="Sign In";}
  return '<button class="'+cls+'" onclick="APP.toAccount()">'+label+'</button>';
}
function renderMenuView(){
  if(typeof loadHomeCharacters==='function'&&homeCharacterOwner()&&(!SITE_HOME_ACTIVE||HOME_CHARACTERS_OWNER!==homeCharacterOwner())&&(!HOME_CHARACTERS_PENDING||HOME_CHARACTERS_PENDING.owner!==homeCharacterOwner()))loadHomeCharacters();
  document.body.classList.remove("play-mode");
  document.body.classList.remove("sheet-mode");
  document.body.classList.add("menu-mode");
  document.title="New Sit’ota";
  $("#main").innerHTML=menuHTML();
}
/* ---- campaign list ---- */
function campaignsHTML(){
  if(!stSignedIn())return '<div class="menuwrap st-page">'+stPageHead({title:'Campaign',sub:'Your table: the GM, the party and what happens next.'})+stGateHTML('campaigns')+'</div>';
  if(CAMP_LOAD_ERROR)return '<div class="menuwrap"><div class="menuhead"><h1>Campaigns</h1></div><p class="warn" role="alert">'+esc(CAMP_LOAD_ERROR)+'</p><button class="chip" onclick="loadCampaignsUnified()">Retry loading campaigns</button></div>';
  if(CAMP_CACHE===null)return '<div class="menuwrap"><p class="note" style="text-align:center">Loading campaigns&hellip;</p></div>';
  const camps=CAMP_CACHE.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  let h='<div class="menuwrap st-page">'+stPageHead({title:'Campaign',sub:cloudActive()?"Synced to your account. GMs see every linked character.":"Local to this browser only.",
    action:'<button type="button" class="st-btn st-btn-primary" onclick="APP.newCampaign()"><span aria-hidden="true">+</span> New campaign</button>'});
  if(CAMP_MSG)h+='<p class="warn" style="margin-bottom:12px">'+esc(CAMP_MSG)+'</p>';
  // One card per campaign, with "Join with a code" beside them (desktop) or
  // below (phone). Owner menu redesign, 2026-11-07.
  const cards=camps.map(c=>{
    const gm=!cloudActive()||c.dm_id===(AUTH_USER&&AUTH_USER.id),id=jsq(c.id);
    return '<article class="st-camp"><div class="st-camp-head"><h3>'+esc(c.name||"Untitled Campaign")+'</h3><span class="st-role'+(gm?' st-role-gm':'')+'">'+(gm?'GM':'Player')+'</span></div>'
      +'<p class="st-camp-meta">'+(gm?'You run this table':'You play at this table')+' · started '+esc(new Date(c.created_at).toLocaleDateString())+'</p>'
      +'<div class="st-camp-actions"><button type="button" class="st-btn st-btn-primary st-btn-sm" onclick="APP.openCampaign(\''+id+'\')">Open</button>'
      +'<button type="button" class="st-btn st-btn-sm" onclick="APP.toBoard(\''+id+'\')">Party board</button></div></article>';
  }).join('');
  const join='<aside class="st-join" aria-labelledby="stJoinTitle"><h2 id="stJoinTitle">Join with a code</h2><p>Your GM can send you an invite code or link.</p>'
    +'<form onsubmit="event.preventDefault();const v=this.code.value.trim();if(v)APP.joinCampaign(v);"><label class="st-sr" for="stJoinCode">Invite code</label>'
    +'<input id="stJoinCode" name="code" class="st-input" autocomplete="off" autocapitalize="characters" placeholder="Invite code"><button type="submit" class="st-btn">Join</button></form></aside>';
  h+='<div class="st-two"><div class="st-camps">'+(cards||'<div class="st-empty">No campaigns yet. Start one with New campaign, or join one with the code your GM sends you.</div>')+'</div>'+join+'</div></div>';
  return h;
}
function renderCampaignsView(){
  document.body.classList.remove("play-mode");
  document.body.classList.remove("sheet-mode");
  document.body.classList.add("menu-mode");
  document.title="Campaigns — Mythras Character Forge";
  $("#main").innerHTML=campaignsHTML();
}
/* ---- my characters ---- */
function libraryHTML(){
  if(!stSignedIn())return '<div class="mmenu st-page">'+stPageHead({title:'Characters',sub:'Build a character, play them at the table, or take them into The Pits.'})+stGateHTML('library')+'</div>';
  const count=Array.isArray(LIB_CACHE)?LIB_CACHE.length:null;
  let h='<div class="mmenu st-page">'+stPageHead({title:'Characters',
    sub:count==null?(cloudActive()?"Every character saved to your account.":"Every character autosaved in this browser."):count+' saved '+(cloudActive()?'to your account.':'in this browser.'),
    action:'<button type="button" class="st-btn st-btn-primary" onclick="APP.fromMenuNew()"><span aria-hidden="true">+</span> New character</button>'});
  if(CAMP_MSG)h+='<p class="warn" style="margin-bottom:12px">'+esc(CAMP_MSG)+'</p>';
  if(LIB_LOAD_ERROR){h+='<p class="warn" role="alert">'+esc(LIB_LOAD_ERROR)+'</p><button class="chip" onclick="loadLibraryUnified()">Retry loading characters</button></div>';return h;}
  if(LIB_CACHE===null){h+='<p class="note">Loading&hellip;</p></div>';return h;}
  if(!LIB_CACHE.length){
    h+='<p class="st-empty-lede">No characters yet. Start one and it&rsquo;ll appear here automatically as you build it.</p><div class="st-chars">'+stNewCard()+'</div></div>';
    return h;
  }
  h+='<div class="st-tb"><div class="st-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>'
   +'<label class="st-sr" for="stCharQ">Search characters</label><input id="stCharQ" class="st-input" type="search" placeholder="Search by name, culture or career" value="'+esc(LIB_QUERY)+'" oninput="stLibSearch(this.value)"></div>'
   +'<label class="st-sr" for="stCharSort">Sort characters</label><select id="stCharSort" class="st-select" onchange="stLibSort(this.value)">'
   +'<option value="recent"'+(LIB_SORT==='recent'?' selected':'')+'>Recently saved</option><option value="name"'+(LIB_SORT==='name'?' selected':'')+'>Name A to Z</option></select></div>';
  h+='<div class="st-chars" id="stCharList">'+libraryCardsHTML()+'</div>';
  h+='</div>';
  return h;
}
// Characters page search and sort (owner menu redesign): filter in place so
// the search box keeps focus while typing.
let LIB_QUERY='',LIB_SORT='recent';
function libraryCardsHTML(){
  const q=LIB_QUERY.trim().toLowerCase();
  let list=(LIB_CACHE||[]).filter(c=>!stHiddenByUndo(c))
    .filter(c=>!q||[c.name,c.culture,c.career].filter(Boolean).join(' ').toLowerCase().includes(q));
  list=list.slice().sort(LIB_SORT==='name'?(a,b)=>String(a.name||'').localeCompare(String(b.name||'')):(a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
  if(!list.length)return '<div class="st-empty">No characters match “'+esc(LIB_QUERY)+'”.</div>';
  return list.map(stCharCard).join('')+stNewCard();
}
function stLibSearch(v){LIB_QUERY=String(v||'');const el=document.getElementById('stCharList');if(el)el.innerHTML=libraryCardsHTML();}
function stLibSort(v){LIB_SORT=v==='name'?'name':'recent';const el=document.getElementById('stCharList');if(el)el.innerHTML=libraryCardsHTML();}
function renderLibraryView(){
  document.body.classList.remove("play-mode");
  document.body.classList.remove("sheet-mode");
  document.body.classList.add("menu-mode");
  document.title="My Characters — Mythras Character Forge";
  $("#main").innerHTML=libraryHTML();
}
let CAMPAIGN_SETUP_EDIT=false,CAMPAIGN_SETUP_BUSY=false,CAMPAIGN_SETUP_DRAFT=null;
function campaignSetupHTML(){
 const camp=CAMPAIGN_SETUP_EDIT?CAMPAIGN_VIEW?.campaign:null;
 const rules=CAMPAIGN_SETUP_DRAFT?.rules||normalizedCampaignRules(camp?.rules_settings)||{characteristicImprovement:"permanent",books:[]};
 const enabled=new Set(rules.books);
 const extras=rules.books.filter(x=>!CAMPAIGN_BOOKS.includes(x)).join(", ");
 let h='<div class="menuwrap"><p><button class="nav" onclick="'+(camp?'APP.openCampaign(\''+jsq(camp.id)+'\')':'APP.toCampaigns()')+'">&#8592; Back</button></p>';
 h+='<div class="card"><h2>'+(camp?'Campaign rules':'Create campaign')+'</h2><p class="note">The GM chooses these settings for the campaign. Players see and use the selected rules for their linked characters.</p>';
 if(CAMP_MSG)h+='<p class="warn" role="alert">'+esc(CAMP_MSG)+'</p>';
 if(!camp)h+='<label>Campaign name <input id="setupCampaignName" type="text" maxlength="100" value="'+esc(CAMPAIGN_SETUP_DRAFT?.name||"")+'" placeholder="Campaign name"></label>';
 h+='<h3>Core rules</h3><p>Mythras Core Rulebook is always included.</p><label for="setupImprovement">Characteristic improvement</label> <select id="setupImprovement">'
   +'<option value="training"'+(rules.characteristicImprovement==="training"?' selected':'')+'>Core: ongoing training and maintenance</option>'
   +'<option value="permanent"'+(rules.characteristicImprovement==="permanent"?' selected':'')+'>Optional: permanent improvement</option></select>'
   +'<label for="setupSkillImprovement" style="display:block;margin-top:.8em">Skill improvement</label> <select id="setupSkillImprovement">'
   +'<option value="d4"'+(rules.skillImprovement!=="d6"?' selected':'')+'>Core: 1d4+1 per successful Experience Roll</option>'
   +'<option value="d6"'+(rules.skillImprovement==="d6"?' selected':'')+'>Optional: 1d6+1 (faster progress)</option></select>'
   +'<p class="note">Core p.72 lets the GM raise the dice step for faster progress without giving more Experience Rolls. Set it at the start of the campaign and keep it.</p>'
   +'<p class="note">Ongoing training uses recurring Experience Rolls and can fade. Permanent improvement uses the optional one-time cost (Core pp.72–73). Existing records are preserved: any ongoing training already recorded still needs maintenance until stopped.</p>';
 h+='<h3>Additional books</h3><p class="note">Record which books your group uses. These choices do not add or enable their mechanics yet; Core remains the implemented rules source.</p>';
 h+=CAMPAIGN_BOOKS.map(b=>'<label style="display:block;margin:.5em 0"><input type="checkbox" name="setupBook" value="'+esc(b)+'"'+(enabled.has(b)?' checked':'')+'> '+esc(b)+' <span class="note">— selection only</span></label>').join("");
 h+='<label>Other books (comma-separated) <input type="text" id="setupOtherBooks" maxlength="500" value="'+esc(extras)+'"></label>'
   +'<p><button type="button" class="nav primary" '+(CAMPAIGN_SETUP_BUSY?'disabled':'')+' onclick="APP.saveCampaignSetup()">'+(CAMPAIGN_SETUP_BUSY?'Saving…':camp?'Save campaign rules':'Create campaign')+'</button></p></div></div>';
 return h;
}
function renderCampaignSetupView(){document.body.classList.remove("play-mode","sheet-mode");document.body.classList.add("menu-mode");document.title="Campaign setup — Mythras Character Forge";$("#main").innerHTML=campaignSetupHTML();}
/* ---- single campaign ---- */
/* ---- Campaign manager (v0 handoff, 2026-11-09) ----
   Party first, then table notes; invite, members and GM tools in a side
   column. Every action goes through the existing APP handlers. */
const CAMP_ICON={
 person:'<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
 back:'<path d="M15 6l-6 6 6 6"/>',
 chev:'<path d="M6 9l6 6 6-6"/>'
};
function campIcon(k){return '<svg class="st-ic" viewBox="0 0 24 24" aria-hidden="true">'+CAMP_ICON[k]+'</svg>';}
function campSigilColor(name){
 const pal=['#e0b27a','#6dbfae','#e0826f','#b9a6d8','#9fc27a','#d9c46a','#7fb0d8'];
 let h=0;for(const ch of String(name||''))h=(h*31+ch.charCodeAt(0))>>>0;return pal[h%pal.length];
}
function campInitial(name){const m=String(name||'').match(/[A-Za-z0-9]/);return m?m[0].toUpperCase():'?';}
// HP, AP and Luck for a party card, worked out on a copy (never the open draft).
const CAMP_CARD_STATS={};
function campCardStats(c){
 if(!c||!c.state||typeof freshState!=='function'||typeof charVitals!=='function')return null;
 const key=c.id+'|'+(c.updated_at||'');if(key in CAMP_CARD_STATS)return CAMP_CARD_STATS[key];
 const original=S;let out=null;
 try{
  S=Object.assign(freshState(),JSON.parse(JSON.stringify(c.state)));normalizeState();
  const v=charVitals(S);
  if(v)out={hp:v.hpCur+'/'+v.hpMax,ap:Number.isFinite(v.baseAP)?v.baseAP:null,luck:v.curLuck+'/'+v.maxLuck};
 }catch(e){out=null;}finally{S=original;}
 return CAMP_CARD_STATS[key]=out;
}
function campRuleChips(rules){
 const chips=[];
 if(rules?.characteristicImprovement==="permanent")chips.push(['opt','Permanent improvement']);
 else if(rules?.characteristicImprovement==="training")chips.push(['core','Ongoing training']);
 if(rules)chips.push(rules.skillImprovement==="d6"?['opt','Skills 1d6+1']:['core','Skills 1d4+1']);
 if(rules?.books?.length)rules.books.forEach(b=>chips.push(['','+ '+b]));else chips.push(['','Core only']);
 if(!rules)chips.unshift(['','Rules not set']);
 return '<div class="st-cm-chips" aria-label="Campaign rules">'+chips.map(([k,t])=>'<span class="st-tag'+(k?' st-tag-'+k:'')+'">'+esc(t)+'</span>').join('')+'</div>';
}
function campaignDetailHTML(){
  if(CAMPAIGN_VIEW===null)return '<div class="menuwrap"><p class="note" style="text-align:center">Loading campaign&hellip;</p></div>';
  const {campaign:camp,members,chars,unassigned}=CAMPAIGN_VIEW;
  if(!camp)return '<div class="menuwrap"><p class="warn">Campaign not found.</p><p><button class="nav" onclick="APP.toCampaigns()">&#8592; Campaigns</button></p></div>';
  const cloud=cloudActive(),me=AUTH_USER&&AUTH_USER.id;
  const isDM=!cloud||camp.dm_id===me;
  const rules=normalizedCampaignRules(camp.rules_settings);
  let h='<div class="menuwrap st-page st-cm">';
  h+='<button type="button" class="st-cm-back" onclick="APP.toCampaigns()">'+campIcon('back')+'Campaigns</button>';
  h+='<header class="st-pagehead st-cm-head"><div class="st-pagehead-text"><p class="st-eyebrow">Campaign &middot; '+(isDM?'You are the GM':'Player view')+'</p>'
   +'<h1>'+esc(camp.name)+'</h1>'+campRuleChips(rules)+'</div>'
   +'<div class="st-pageaction">'+(isDM?'<button type="button" class="st-btn" onclick="APP.editCampaignRules()">Rules &amp; books</button>':'')
   +'<button type="button" class="st-btn st-btn-primary" onclick="APP.toBoard(\''+jsq(camp.id)+'\')">Live Party Board &rarr;</button></div></header>';
  if(CAMP_MSG)h+='<p class="st-cm-msg" role="status">'+esc(CAMP_MSG)+'</p>';
  h+='<div class="st-cm-grid"><div class="st-cm-main">';
  // Party
  h+='<section aria-labelledby="cmParty"><div class="st-cm-sechead"><h2 id="cmParty">Party <small>'+chars.length+(chars.length===1?' character':' characters')+'</small></h2></div><div class="st-cm-party">';
  h+=chars.map(c=>{
    const mine=!cloud||c.owner_id===me;
    const st=campCardStats(c);
    const meta=[c.tier&&c.tier!=="ordinary"?c.tier[0].toUpperCase()+c.tier.slice(1):null,c.career||c.culture].filter(Boolean).join(' · ');
    const unassign=mine?'APP.unassignChar(\''+jsq(c.id)+'\')':(isDM?'APP.dmUnassignChar(\''+jsq(c.id)+'\')':'');
    return '<article class="st-cm-card"><div class="st-cm-card-top"><span class="st-cm-sigil" style="--c:'+campSigilColor(c.name)+'" aria-hidden="true">'+esc(campInitial(c.name))+'</span>'
     +'<div class="st-cm-card-id"><h3>'+esc(c.name||'Unnamed')+'</h3>'+(meta?'<p class="st-cm-meta">'+esc(meta)+'</p>':'')
     +(cloud&&c.owner_name?'<p class="st-cm-player">'+campIcon('person')+esc(c.owner_name)+'</p>':'')+'</div>'
     +(cloud&&mine?'<span class="st-tag st-cm-you">You</span>':'')+'</div>'
     +(st?'<div class="st-cm-stats"><span class="st-cm-stat">HP<b>'+esc(st.hp)+'</b></span>'+(st.ap!=null?'<span class="st-cm-stat">AP<b>'+st.ap+'</b></span>':'')+'<span class="st-cm-stat">Luck<b>'+esc(st.luck)+'</b></span></div>':'')
     +'<div class="st-cm-card-foot">'+(mine?'<button type="button" class="st-btn st-btn-sm" onclick="APP.openLibChar(\''+jsq(c.id)+'\')">Open</button>'
        :'<button type="button" class="st-btn st-btn-sm" onclick="APP.toBoard(\''+jsq(camp.id)+'\')">View</button>')
     +'<span class="st-grow"></span>'+(unassign?'<button type="button" class="st-btn st-btn-sm st-btn-danger" onclick="'+unassign+'">Unassign</button>':'')+'</div></article>';
  }).join('');
  h+='<button type="button" class="st-cm-card st-cm-add" onclick="APP.newCharacterForCampaign()">'+campIcon('plus')+'<b>New character</b><span>Build one for this campaign</span></button>';
  h+='</div>';
  if(unassigned.length){
    h+='<p class="st-cm-subhead">Your characters not in a campaign</p>'
     +unassigned.map(c=>'<div class="st-cm-claim"><span class="st-cm-sigil st-cm-sigil-sm" style="--c:'+campSigilColor(c.name)+'" aria-hidden="true">'+esc(campInitial(c.name))+'</span>'
       +'<div class="st-cm-claim-t"><b>'+esc(c.name||'Unnamed')+'</b><span>'+esc([c.culture,c.career].filter(Boolean).join(' · ')||'Not in any campaign')+'</span></div>'
       +'<button type="button" class="st-btn st-btn-sm" onclick="APP.assignChar(\''+jsq(c.id)+'\')">Add to campaign</button></div>').join('');
  }
  h+='</section>';
  // Table notes
  h+='<section class="st-cm-panel st-cm-notes" aria-labelledby="cmNotes"><div class="st-cm-sechead"><h2 id="cmNotes">Table notes</h2>'
   +(isDM?'<span class="st-cm-saved'+(CAMP_NOTES_SAVED?' on':'')+'" aria-live="polite">'+(CAMP_NOTES_SAVED?'Saved':'')+'</span>':'')+'</div>';
  if(isDM)h+='<p class="st-cm-fine">Players see these notes as a briefing.</p><label class="st-sr" for="cmNotesText">Table notes</label>'
   +'<textarea id="cmNotesText" rows="5" placeholder="Where the party is, what they are chasing, what happens next session." onchange="APP.campField(\'notes\',this.value)">'+esc(camp.notes||"")+'</textarea>';
  else h+=camp.notes?'<p class="st-cm-brief">'+esc(camp.notes)+'</p>':'<p class="st-cm-fine">The GM has not written any notes yet.</p>';
  h+='</section></div>';
  // Side column
  h+='<aside class="st-cm-side">';
  if(cloud&&camp.invite_code){
    // D-S1: members still see the code; only the GM can replace it.
    h+='<section class="st-cm-panel" aria-labelledby="cmInvite"><h2 id="cmInvite">Invite players</h2><p class="st-cm-fine">Share the code or the link. Anyone with it can join.</p>'
     +'<div class="st-cm-code"><code>'+esc(camp.invite_code)+'</code><button type="button" class="st-btn st-btn-sm" onclick="APP.copyInviteLink(\''+jsq(camp.invite_code)+'\',this)">'+campIcon('copy')+'Copy</button></div>'
     +'<div class="st-cm-row"><button type="button" class="st-btn st-btn-primary" onclick="APP.copyInviteLink(\''+jsq(camp.invite_code)+'\',this)">Copy invite link</button>'
     +(isDM?'<button type="button" class="st-btn" aria-expanded="false" aria-controls="cmNewCode" onclick="campToggleNewCode(this)">New code</button>':'')+'</div>'
     +(isDM?'<div class="st-cm-confirm" id="cmNewCode" hidden><p>Replace the code? The old code and link stop working. Players already in the campaign stay.</p>'
       +'<div class="st-cm-row"><button type="button" class="st-btn st-btn-sm st-btn-danger" onclick="stConfirmNext();APP.rotateInvite()">Replace code</button>'
       +'<button type="button" class="st-btn st-btn-sm" onclick="campToggleNewCode(document.querySelector(\'[aria-controls=cmNewCode]\'))">Keep it</button></div></div>':'')
     +'</section>';
  }
  if(members.length){
    // D-S4: the GM can remove a player or hand the GM role to them.
    h+='<section class="st-cm-panel" aria-labelledby="cmMembers"><h2 id="cmMembers">Members <small>'+members.length+'</small></h2><ul class="st-cm-members">'
     +members.map(m=>{
       const other=cloud&&isDM&&m.userId&&m.userId!==me&&m.role!=="dm";
       const n=chars.filter(c=>c.owner_id===m.userId).length;
       return '<li class="st-cm-mem"><span class="st-cm-av" aria-hidden="true">'+esc(campInitial(m.name))+'</span>'
        +'<span class="st-cm-mem-n"><b>'+esc(m.name)+(m.userId===me?' <span class="st-cm-dim">(you)</span>':'')+'</b><span>'+n+(n===1?' character':' characters')+'</span></span>'
        +'<span class="st-tag'+(m.role==="dm"?' st-tag-gm':'')+'">'+(m.role==="dm"?'GM':'Player')+'</span>'
        +(other?'<span class="st-cm-acts"><button type="button" class="st-btn st-btn-sm" onclick="if(stTwoTap(this,\'Confirm\'))APP.transferGm(\''+jsq(m.userId)+'\')">Make GM</button>'
          +'<button type="button" class="st-btn st-btn-sm st-btn-danger" onclick="if(stTwoTap(this,\'Sure?\'))APP.removeMember(\''+jsq(m.userId)+'\')">Remove</button></span>':'')
        +'</li>';
     }).join('')+'</ul>'
     +(cloud&&isDM&&members.length>1?'<p class="st-cm-fine">Removing a player unassigns their characters here; the characters stay theirs. Making someone GM hands them the campaign, its tracker and notes; you stay on as a player.</p>':'')
     +'</section>';
  }
  if(isDM){
    h+='<details class="st-cm-panel st-cm-tools"><summary><h2>GM tools</h2>'+campIcon('chev')+'</summary><div class="st-cm-tools-in">'
     +'<label class="st-cm-label" for="cmName">Campaign name</label><input id="cmName" type="text" value="'+esc(camp.name)+'" onchange="APP.campField(\'name\',this.value)">'
     +'<button type="button" class="st-btn" onclick="APP.downloadCampaignBackup()">Download campaign backup</button>'
     +'<p class="st-cm-fine">One file with the campaign, members, characters and homebrew, for safekeeping.</p>'
     +'<p class="st-cm-fine">Created '+esc(new Date(camp.created_at).toLocaleString())+'</p>'
     +'<div class="st-cm-danger"><button type="button" class="st-btn st-btn-danger" aria-expanded="false" aria-controls="cmDelete" onclick="campToggleDelete(this)">Delete campaign&hellip;</button>'
     +'<div class="st-cm-confirm" id="cmDelete" hidden><p>Linked characters stay, just unassigned. Type <b>'+esc(camp.name)+'</b> to confirm.</p>'
     +'<label class="st-sr" for="cmDeleteName">Campaign name</label><input id="cmDeleteName" type="text" autocomplete="off" oninput="campDeleteCheck(this)">'
     +'<div class="st-cm-row"><button type="button" class="st-btn st-btn-sm st-btn-dangerfill" id="cmDeleteGo" disabled onclick="stConfirmNext();APP.deleteCampaign()">Delete forever</button></div></div></div>'
     +'</div></details>';
  }else{
    h+='<p class="st-cm-fine">Created '+esc(new Date(camp.created_at).toLocaleString())+'</p>';
  }
  h+='</aside></div></div>';
  return h;
}
let CAMP_NOTES_SAVED=false;
// Two-tap confirm: the first tap turns the button into "Confirm" for 3.5s,
// the second acts. stConfirmNext() tells the APP handler the person has
// already confirmed on the page, so it skips its own confirm() box.
let ST_CONFIRMED=false;
function stConfirmNext(){ST_CONFIRMED=true;}
function stTakeConfirmed(){const v=ST_CONFIRMED;ST_CONFIRMED=false;return v;}
function stTwoTap(btn,label){
 if(btn.dataset.armed){clearTimeout(Number(btn.dataset.armed));delete btn.dataset.armed;stConfirmNext();return true;}
 const was=btn.textContent;btn.textContent=label||'Confirm';btn.classList.add('st-armed');
 btn.dataset.armed=String(setTimeout(()=>{btn.textContent=was;btn.classList.remove('st-armed');delete btn.dataset.armed;},3500));
 return false;
}
function campToggleNewCode(btn){
 const box=document.getElementById('cmNewCode');if(!box)return;
 box.hidden=!box.hidden;if(btn)btn.setAttribute('aria-expanded',String(!box.hidden));
}
function campToggleDelete(btn){
 const box=document.getElementById('cmDelete');if(!box)return;
 box.hidden=!box.hidden;btn.setAttribute('aria-expanded',String(!box.hidden));
 if(!box.hidden)document.getElementById('cmDeleteName')?.focus();
}
function campDeleteCheck(input){
 const camp=CAMPAIGN_VIEW&&CAMPAIGN_VIEW.campaign,go=document.getElementById('cmDeleteGo');
 if(go)go.disabled=!(camp&&input.value.trim()===String(camp.name).trim());
}
function renderCampaignView(){
  document.body.classList.remove("play-mode");
  document.body.classList.remove("sheet-mode");
  document.body.classList.add("menu-mode");
  const camp=CAMPAIGN_VIEW&&CAMPAIGN_VIEW.campaign;
  document.title=(camp?camp.name+" — ":"")+"Campaigns — Mythras Character Forge";
  $("#main").innerHTML=campaignDetailHTML();
}

/* ================= PARTY BOARD (live DM dashboard) =================
   A read-mostly view over every character linked to a campaign, live-
   updated via a Supabase realtime subscription on public.characters. Each
   card is driven off charVitals(row.state) — the exact same pure function
   Play Mode itself uses — so the board can never show a different wound
   tier or HP total than the character's own Play Mode screen would. */
let BOARD_CHARS=null;          // array of {id,name,tier,culture,career,owner_id,owner_name,campaign_id,state,updated_at}, or null while loading
let BOARD_TAB="status";        // "status" (live character grid), "gm" (Combat Tracker, DM-only), or "homebrew" (custom content, DM-only)
let GM_SESSION_ERROR=null;     // set when a GM-tools save fails, cleared on the next successful edit
let CREATURE_DRAFT="";         // pasted creature stat block, before it joins the fight (CRTR-B02)
let CREATURE_HIT={};           // last rolled hit location per creature combatant id
let CREATURE_MSG={};           // last trait result per creature combatant id (leap, trample, venom, breath)
let HB_ERROR=null;             // set when a homebrew add/delete fails, cleared on the next successful action
// In-progress "new item" forms for the Homebrew tab -- one draft per type,
// reset to freshHbDraft() after a successful add. Kept separate from the
// saved rows (CUSTOM_CONTENT_CACHE) since a draft is local UI state that's
// never itself persisted until the DM clicks "add".
function freshHbDraft(type){
  if(type==="weapon")return {name:"",group:"One-Handed",dice:{d2:0,d3:0,d4:0,d6:0,d8:0,d10:0},flatMod:0,
   size:"M",reach:"M",effects:"",enc:0,apHp:"",traits:"",cost:0};
  if(type==="armor")return {name:"",ap:0,encPerLoc:0,locations:[]};
  return {name:"",traits:[],hasSpec:false,specLabel:"",desc:""};
}
let HB_DRAFT={weapon:freshHbDraft("weapon"),armor:freshHbDraft("armor"),spell:freshHbDraft("spell")};
let BOARD_SUB=null,BOARD_LIVE=false;
let BOARD_REFETCH_TIMER=null,BOARD_TICK_TIMER=null,BOARD_POLL_TIMER=null;
// Cloud rows already carry `state` + owner_name from cloudFetchCharacters();
// local/mock characters need the same shape synthesized from the raw
// library entry so boardCardHTML() never has to branch on cloud vs. local.
async function loadBoardUnified(campaignId){
  if(cloudActive())return await cloudFetchCharacters({campaignId:campaignId});
  return charsInCampaignLocal(campaignId).map(c=>({id:c.id,name:c.name,tier:c.tier,culture:c.culture,career:c.career,
    owner_id:"local",owner_name:"You",campaign_id:c.campaignId,state:c.state,updated_at:new Date(c.savedAt).toISOString()}));
}
function boardVisHandler(){if(document.visibilityState==="visible"&&APPVIEW==="board"&&CURRENT_CAMPAIGN_ID)boardRefetch(CURRENT_CAMPAIGN_ID);}
function boardSubscribe(campaignId){
  boardUnsubscribeChannel();
  if(!cloudActive())return; // realtime multiplayer only makes sense signed in
  BOARD_SUB=sb.channel("board-"+campaignId)
    .on("postgres_changes",{event:"*",schema:"public",table:"characters",filter:"campaign_id=eq."+campaignId},
        ()=>boardRefetch(campaignId))
    // Second listener on the same channel, watching the campaign row itself
    // (name/notes/session_state) so a GM's initiative/NPC/notes edit shows
    // up live for anyone else looking at this campaign's board — same
    // debounced-refetch handler as the characters listener above, requires
    // `campaigns` to be added to the realtime publication (see the comment
    // by emptySessionState() near the top of this file).
    .on("postgres_changes",{event:"*",schema:"public",table:"campaigns",filter:"id=eq."+campaignId},
        ()=>boardRefetch(campaignId))
    // GM-only session state (RLS means only the GM receives these events).
    .on("postgres_changes",{event:"*",schema:"public",table:"campaign_gm_state",filter:"campaign_id=eq."+campaignId},
        ()=>boardRefetch(campaignId))
    .subscribe(status=>{BOARD_LIVE=(status==="SUBSCRIBED");if(APPVIEW==="board")render();});
}
function boardUnsubscribeChannel(){if(BOARD_SUB){sb.removeChannel(BOARD_SUB);BOARD_SUB=null;}BOARD_LIVE=false;}
// Full teardown — called by render() the instant APPVIEW leaves "board".
function boardUnsubscribe(){
  boardUnsubscribeChannel();
  clearTimeout(BOARD_REFETCH_TIMER);
  if(BOARD_TICK_TIMER){clearInterval(BOARD_TICK_TIMER);BOARD_TICK_TIMER=null;}
  if(BOARD_POLL_TIMER){clearInterval(BOARD_POLL_TIMER);BOARD_POLL_TIMER=null;}
  document.removeEventListener("visibilitychange",boardVisHandler);
}
// Realtime delivers a row-changed *signal*, not trusted payload data (a
// character's `state` jsonb can be large) — always refetch the full list
// over REST, debounced so a burst of near-simultaneous edits collapses into
// one request instead of one per event. Also refreshes CAMPAIGN_VIEW.campaign
// (name/notes/session_state) -- it's normally only fetched once on entry via
// loadCampaignViewUnified, so without this a GM tools edit made in another
// tab would never appear here until the board was left and reopened.
function boardRefetch(campaignId){
  clearTimeout(BOARD_REFETCH_TIMER);
  BOARD_REFETCH_TIMER=setTimeout(async()=>{
    try{
    const [chars,camp]=await Promise.all([loadBoardUnified(campaignId),loadCampaignRowUnified(campaignId)]);
    BOARD_CHARS=chars;
    if(camp&&CAMPAIGN_VIEW)CAMPAIGN_VIEW.campaign=camp;
    BOARD_LAST_FETCH=Date.now();
    BOARD_LOAD_ERROR="";
    }catch(e){BOARD_LOAD_ERROR="Party update failed: "+e.message;}
    if(APPVIEW==="board")render();
  },300);
}
let BOARD_LAST_FETCH=null,BOARD_LOAD_ERROR="";
async function boardLoad(campaignId){
  try{BOARD_CHARS=await loadBoardUnified(campaignId);BOARD_LOAD_ERROR="";}
  catch(e){BOARD_LOAD_ERROR="Could not load the party: "+e.message;BOARD_CHARS=[];}
  BOARD_LAST_FETCH=Date.now();
  if(APPVIEW==="board")render();
  boardSubscribe(campaignId);
  document.addEventListener("visibilitychange",boardVisHandler);
  BOARD_TICK_TIMER=setInterval(()=>{if(APPVIEW==="board")render();},15000); // just to refresh the "updated Ns ago" ticker text
  if(cloudActive())BOARD_POLL_TIMER=setInterval(()=>boardRefetch(campaignId),60000); // backstop in case a realtime event is ever missed (e.g. the unassign-drops-out-of-filter edge case)
}
function timeAgo(ts){
  const s=Math.max(0,Math.round((Date.now()-ts)/1000));
  if(s<5)return "just now";
  if(s<60)return s+"s ago";
  const m=Math.round(s/60);if(m<60)return m+"m ago";
  return Math.round(m/60)+"h ago";
}
const BOARD_RANK={ok:0,serious:1,major:2};
const BOARD_TAG={ok:"OK",minor:"Minor",serious:"Serious",major:"Major"};
function boardMiniStrip(state){
  const v=charVitals(state);
  return '<div class="pb-strip">'+v.locs.map(l=>
    '<span class="pb-cell'+(l.cls==="major"?" major":"")+'" style="background:'+pmHpColor(l.cur,l.max,l.cls)+'" title="'+pmShortName(l.loc)+': '+l.cur+'/'+l.max+' HP — '+l.tag+'"></span>'
  ).join("")+'</div>';
}
function boardCardHTML(row){
  const state=row.state||{};
  const v=charVitals(state);
  const initials=((row.name||"?").match(/\b[A-Za-z]/g)||["?"]).slice(0,2).join("").toUpperCase();
  const meta=[row.culture,row.career].filter(Boolean).join(" · ")||"—";
  // Literal colours, not var(--pm-*) -- those custom properties are only
  // ever defined under body.play-mode (see styles.css), so referencing them
  // here on the Party Board (body.menu-mode) resolved to nothing and left
  // this bar's coloured fill invisible. Matches .pb-condchip's own palette
  // for the same condition so the chip and the bar always agree.
  const barColor=v.worst==="major"?"#a52d20":v.worst==="serious"?"#8a5a12":v.worst==="minor"?"#8a5a12":"#3c5936";
  const isMine=cloudActive()?row.owner_id===(AUTH_USER&&AUTH_USER.id):true;
  const fatTag=v.fatigue&&v.fatigue!=="Fresh"?'<span class="pb-fat">'+esc(v.fatigue)+'</span>':"";
  return '<div class="pb-card '+v.worst+'" onclick="APP.boardOpenChar(\''+row.id+'\',\''+jsq(row.owner_name||"")+'\')" role="button" tabindex="0">'
   +'<div class="pb-head"><div class="pb-portrait">'+esc(initials)+'</div><div class="pb-id">'
   +'<div class="pb-name">'+esc(row.name||"Unnamed Character")+(isMine?' <i>(you)</i>':'')+'</div>'
   +'<div class="pb-meta">'+esc(meta)+(cloudActive()&&!isMine?' · '+esc(row.owner_name||"Unknown"):"")+'</div></div>'
   +'<span class="pb-condchip '+v.worst+'">'+BOARD_TAG[v.worst]+'</span></div>'
   +'<div class="pb-hpbar"><i style="width:'+(v.hpMax>0?Math.max(0,Math.min(100,v.hpCur/v.hpMax*100)):0)+'%;background:'+barColor+'"></i></div>'
   +boardMiniStrip(state)
   +'<div class="pb-resrow"><span title="Action Points">AP '+Math.max(0,v.maxAP-v.apUsed)+'/'+v.maxAP+'</span>'
   +'<span title="Luck Points">Luck '+v.curLuck+'/'+v.maxLuck+'</span>'
   +'<span title="Magic Points">MP '+v.curMagic+'/'+v.maxMagic+'</span>'+fatTag+'</div>'
   +'<div class="pb-updated">updated '+timeAgo(new Date(row.updated_at).getTime())+'</div>'
   +'</div>';
}
function boardHTML(){
  const camp=CAMPAIGN_VIEW&&CAMPAIGN_VIEW.campaign;
  // GM Tools (initiative/NPCs/session notes) are DM-only -- same isDM check
  // campaignDetailHTML() uses. Local-only mode has no multiplayer concept,
  // so whoever's driving the browser counts as the DM there.
  const isDM=!cloudActive()||!!(camp&&camp.dm_id===(AUTH_USER&&AUTH_USER.id));
  let h='<div class="menuwrap pb-wrap">';
  h+='<p><button class="nav" onclick="APP.openCampaign(\''+(CURRENT_CAMPAIGN_ID||"")+'\')">&#8592; '+(camp?esc(camp.name):"Campaign")+'</button> '
   +'<button class="nav" onclick="APP.refreshBoard()">&#8635; Refresh</button>'
   +(cloudActive()?'<span class="pb-livedot '+(BOARD_LIVE?"on":"off")+'" title="'+(BOARD_LIVE?"Live — updates arrive automatically":"Reconnecting…")+'">'+(BOARD_LIVE?"&#9679; Live":"&#9675; Connecting…")+'</span>':'')+'</p>';
  h+='<div class="menuhead"><h1>Party Board'+(camp?" — "+esc(camp.name):"")+'</h1><p>Live status for every character linked to this campaign. Click a card to open it in Play Mode.</p></div>';
  if(isDM&&camp){
    h+='<p class="pb-tabs"><button class="chip'+(BOARD_TAB==="status"?" on":"")+'" onclick="APP.setBoardTab(\'status\')">Live Status</button> '
     +'<button class="chip'+(BOARD_TAB==="gm"?" on":"")+'" onclick="APP.setBoardTab(\'gm\')">GM Tools</button> '
     +'<button class="chip'+(BOARD_TAB==="homebrew"?" on":"")+'" onclick="APP.setBoardTab(\'homebrew\')">Homebrew</button></p>';
  }
  if(BOARD_TAB==="gm"&&isDM&&camp){h+=gmToolsHTML(camp);h+='</div>';return h;}
  if(BOARD_TAB==="homebrew"&&isDM&&camp){h+=homebrewHTML(camp);h+='</div>';return h;}
  if(BOARD_CHARS===null){h+='<p class="note" style="text-align:center">Loading party&hellip;</p></div>';return h;}
  if(!BOARD_CHARS.length){h+='<p class="note" style="text-align:center">No characters linked to this campaign yet.</p></div>';return h;}
  const sorted=BOARD_CHARS.slice().sort((a,b)=>{
    const ra=BOARD_RANK[charVitals(a.state).worst],rb=BOARD_RANK[charVitals(b.state).worst];
    return rb-ra||(a.name||"").localeCompare(b.name||"");
  });
  h+='<div class="pb-grid">'+sorted.map(boardCardHTML).join("")+'</div>';
  h+='</div>';
  return h;
}
/* ---- GM Combat Tracker: per-combatant AP, per-location damage against a
   customizable location set, and status-effect chips, plus session notes.
   Replaces the old flat initiative list + freeform-text NPC prep cards
   (which were never actually linked to each other -- see the migration
   note at sessionStateOf above). Everything lives in one
   campaigns.session_state jsonb blob, mutated optimistically the same way
   campField() handles name/notes, and refreshed for every viewer via the
   board-<id> realtime channel's campaigns listener. ---- */
function combatantEffectChipHTML(combatantId,e){
  const t=COMBAT_EFFECT_MAP[e.type];
  return '<span class="cbt-fxchip '+e.mode+'" title="'+(e.mode==="duration"?"Counts down, clears at 0":"Counts up -- clear by hand once resolved")+'">'
   +esc(t?t.label:e.type)+(e.loc?' <i>('+esc(e.loc)+')</i>':'')+' <b>'+e.value+'</b> '+esc(e.unit||(e.mode==="duration"?"turn":"round"))+'(s)'
   +'<button onclick="APP.gmRemoveEffect(\''+combatantId+'\',\''+e.id+'\')" aria-label="remove effect">&times;</button></span>';
}
function combatantCardHTML(c,isActive){
  const isPc=c.kind==="pc";
  const apRemain=Math.max(0,c.ap.max-c.ap.used);
  const locs=c.locations||[];
  return '<div class="cbt-card'+(isActive?" on":"")+'">'
   +'<div class="cbt-head"><span class="cbt-name">'+esc(c.name||"Unnamed")+' <i>'+(isPc?"PC":c.creature?"Creature":"NPC")+'</i>'+(isActive?' <strong class="cbt-active">ACTING NOW</strong>':'')+'</span>'
   +'<input type="number" class="cbt-init" value="'+c.init+'" onchange="APP.gmSetInit(\''+c.id+'\',this.value)" aria-label="Initiative" title="Initiative">'
   +'<button class="chip sm" onclick="APP.gmRemoveCombatant(\''+c.id+'\')" aria-label="remove from combat">&times;</button></div>'
   +'<div class="cbt-ap"><span class="cbt-aplbl">AP</span>'
   +'<button class="chip sm" onclick="APP.gmApAdj(\''+c.id+'\',-1)" '+(apRemain<=0?"disabled":"")+' title="Spend 1 AP">&minus;</button>'
   +'<span class="cbt-apval">'+apRemain+'</span>'
   +'<button class="chip sm" onclick="APP.gmApAdj(\''+c.id+'\',1)" '+(apRemain>=c.ap.max?"disabled":"")+' title="Restore 1 AP">+</button>'
   +'<span class="note">/ <input type="number" class="cbt-apmax" value="'+c.ap.max+'" onchange="APP.gmSetApMax(\''+c.id+'\',this.value)" aria-label="Max AP" title="Max AP"></span></div>'
   +creatureBlockHTML(c)
   +'<div class="cbt-loclist">'+locs.map(loc=>{
     const hp=(c.hp&&c.hp[loc])||{cur:0,max:0};
     const idv="cbtdmg-"+c.id+"-"+loc.replace(/\s+/g,"_");
     return '<div class="cbt-locrow"><span class="cbt-locname">'+esc(loc)+'</span>'
      +'<span class="cbt-lochp">'+hp.cur+'<span> / '+hp.max+'</span></span>'
      +'<input type="number" id="'+idv+'" class="cbt-locdmg" placeholder="dmg" min="0" aria-label="Damage to '+esc(loc)+'">'
      +'<button class="chip sm" onclick="APP.gmDamageLoc(\''+c.id+'\',\''+jsq(loc)+'\',\''+idv+'\')">apply</button>'
      +'<button class="chip sm" onclick="APP.gmRemoveLoc(\''+c.id+'\',\''+jsq(loc)+'\')" aria-label="remove location" title="Remove this location (e.g. anatomy doesn’t have one)">&times;</button></div>';
   }).join("")+'</div>'
   +'<div class="cbt-locadd">'
   +'<input type="text" id="cbtlocname-'+c.id+'" placeholder="add location, e.g. Wing">'
   +'<input type="number" id="cbtlochp-'+c.id+'" placeholder="max HP" style="width:64px">'
   +'<button class="chip sm" onclick="APP.gmAddLoc(\''+c.id+'\')">+ location</button></div>'
   +(c.effects&&c.effects.length?'<div class="cbt-fxlist">'+c.effects.map(e=>combatantEffectChipHTML(c.id,e)).join("")+'</div>':'')
   +'<div class="cbt-fxadd">'
   +'<select id="cbtfxtype-'+c.id+'">'+COMBAT_EFFECT_TYPES.map(t=>'<option value="'+t.key+'">'+esc(t.label)+'</option>').join("")+'</select>'
   +'<select id="cbtfxloc-'+c.id+'"><option value="">no location</option>'+locs.map(l=>'<option value="'+esc(l)+'">'+esc(l)+'</option>').join("")+'</select>'
   +'<select id="cbtfxmode-'+c.id+'"><option value="duration">counts down</option><option value="counter">counts up</option></select>'
   +'<select id="cbtfxunit-'+c.id+'" aria-label="Effect timing"><option value="turn">affected character turns</option><option value="round">combat rounds</option></select>'
   +'<input type="number" id="cbtfxval-'+c.id+'" value="1" min="1" style="width:48px" aria-label="Starting value">'
   +'<button class="chip sm" onclick="APP.gmAddEffect(\''+c.id+'\')">+ effect</button></div>'
   +'<input type="text" class="cbt-statnote" value="'+esc(c.stat1||"")+'" placeholder="e.g. Combat Style 65%, Dodge 40%" onchange="APP.gmCombatantField(\''+c.id+'\',\'stat1\',this.value)">'
   +'<input type="text" class="cbt-statnote" value="'+esc(c.stat2||"")+'" placeholder="special abilities, notes" onchange="APP.gmCombatantField(\''+c.id+'\',\'stat2\',this.value)">'
   +'</div>';
}
// CRTR-B02: paste a creature's stat block from your rulebook. Nothing is
// guessed: missing or unreadable lines are listed before it can be added.
function creatureImportHTML(){
  const parsed=CREATURE_DRAFT.trim()?parseCreatureStatBlock(CREATURE_DRAFT):null;
  let h='<details class="cbt-creature-import"'+(CREATURE_DRAFT?' open':'')+'><summary>Add a creature from its stat block</summary>'
   +'<p class="note">Paste or type it one item per line (Core pp.218–220). Use INS instead of INT for an animal (p.214). Location rows are d20 range, name, armour/HP; write natural+worn armour as 2+3/6. Natural weapons end with &ldquo;natural&rdquo;.</p>'
   +'<p class="note"><label for="gmCreatureAnatomy">Start the locations from a body plan (Core pp.276–277)</label> <select id="gmCreatureAnatomy" onchange="APP.gmCreatureAnatomy(this.value)"><option value="">Choose&hellip;</option>'
   +Object.keys(CREATURE_ANATOMY).map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join("")+'</select> Then fill in each location&rsquo;s armour and HP.</p>'
   +'<textarea id="gmCreatureText" rows="9" placeholder="Name: Hill Beast\nSTR 2d6+6 13\nCON 3d6 11\nSIZ 2d6+6 13\nDEX 2d6+6 13\nINS 2d6+6 13\nPOW 1d6+6 10\nMove 10\n1-3 Right Hind Leg 2/5\n...\nWeapon: Bite 1d8 natural\nTrait: Formidable Natural Weapons\nWorn armour ENC: 0\nSkills: Athletics 60%, Perception 70%" onchange="APP.gmCreatureDraft(this.value)">'+esc(CREATURE_DRAFT)+'</textarea>';
  if(parsed){
    if(parsed.errors.length)h+='<ul class="warn" style="padding-left:18px">'+parsed.errors.map(e=>'<li>'+esc(e)+'</li>').join("")+'</ul>';
    if(parsed.unread.length)h+='<p class="warn">Lines not understood (fix or move them into a Notes: line): '+parsed.unread.map(esc).join(" · ")+'</p>';
    if(!parsed.errors.length){const a=creatureAttributes(parsed.creature);
      h+='<p class="note">'+esc(parsed.creature.name)+': '+a.mind.key+' '+a.mind.value+' · Action Points '+a.ap+' · Initiative bonus '+a.initBonus+(a.armourPenalty?' (worn armour −'+a.armourPenalty+')':'')+' · Damage Modifier '+esc(a.damageMod)+' · '+parsed.creature.locations.length+' locations</p>';}
  }
  h+='<button class="chip" onclick="APP.gmAddCreature()" '+(parsed&&!parsed.errors.length&&!parsed.unread.length?'':'disabled')+'>Add creature to the fight</button></details>';
  return h;
}
function creatureBlockHTML(c){
  const cr=c.creature;if(!cr)return "";
  const a=creatureAttributes(cr),hit=CREATURE_HIT[c.id];
  const dice=k=>cr.dice&&cr.dice[k]?' <i>('+esc(cr.dice[k])+')</i>':'';
  return '<div class="cbt-creature">'
   +'<p class="note">'+CREATURE_CHARS.filter(k=>Object.hasOwn(cr.chars,k)).map(k=>k+' '+cr.chars[k]+dice(k)).join(' · ')+(cr.move?' · Move '+esc(cr.move):'')+'</p>'
   +'<p class="note">Initiative bonus '+a.initBonus+(a.armourPenalty?' (worn armour −'+a.armourPenalty+'; natural armour adds none)':'')+' · Damage Modifier '+esc(a.damageMod)+' · MP '+a.mp+(a.mind.key==="INS"?' · uses INS for INT':'')+'</p>'
   +(cr.weapons.length?'<p class="note">'+cr.weapons.map(w=>{const p=creatureCanParry(cr,w);return esc(w.name)+' '+esc(w.damage)+(w.natural?' (natural)':'')+' · '+(p.ok?'can parry':'<span title="'+esc(p.reason)+'">no parry: Evade or armour</span>');}).join(' | ')+'</p>':'')
   +(cr.traits.length?'<p class="note">Traits: '+cr.traits.map(esc).join(', ')+'</p>':'')
   +creatureTraitsHTML(c)
   +'<div class="cbt-locadd"><button class="chip sm" onclick="APP.gmCreatureRollLoc(\''+c.id+'\')">Roll hit location (d20)</button>'
   +(hit?'<span class="note"> d20 '+hit.roll+': <b>'+esc(hit.loc)+'</b>, armour '+hit.armour+'</span>'
     +'<input type="number" id="cbtraw-'+c.id+'" placeholder="damage" min="0" style="width:84px" aria-label="Damage rolled, before armour">'
     +(["Immunity","Vulnerable","Allergy"].some(n=>creatureTraitSources(cr,n).length)?'<input type="text" id="cbtsrc-'+c.id+'" placeholder="source, e.g. fire" maxlength="60" style="width:120px" aria-label="Damage source">':'')
     +'<button class="chip sm" onclick="APP.gmCreatureHit(\''+c.id+'\')">apply after armour</button>':'')
   +'</div></div>';
}
// CRTR-B06–B14: controls for the combat traits this creature has. Each one
// states what the trait changes; entry-specific values come from the GM.
function creatureTraitsHTML(c){
  const cr=c.creature,cs=c.cs||{},id=c.id,q='\''+id+'\'';
  const rows=[];
  const tog=(key,on,label)=>'<label class="mnum"><input type="checkbox" '+(on?'checked':'')+' onchange="APP.gmCreatureState('+q+',\''+key+'\',this.checked)"> '+label+'</label>';
  if(creatureTrait(cr,"Flying")){const d=creatureDefence(cr,!!cs.airborne);
    rows.push('<b>Flying</b> '+tog("airborne",cs.airborne,"Airborne")+' Defends with '+d.skill+(d.pct!=null?' '+d.pct+'%':' (add it to Skills)')+'. Ordinary flight needs no roll; unusual manoeuvres need a Fly roll (Core p.216).');}
  if(creatureTrait(cr,"Leaper"))rows.push('<b>Leaper</b> Opposed leap: <button class="chip sm" onclick="APP.gmCreatureLeap('+q+',true)">won</button> <button class="chip sm" onclick="APP.gmCreatureLeap('+q+',false)">lost</button> (Core pp.104, 216).');
  if(creatureTrait(cr,"Grappler"))rows.push('<b>Grappler</b> When a natural attack hits, the trait&rsquo;s extra grapple follows, with its parry restriction, as the entry describes (Core p.216). Other creatures get no free grapple.');
  if(creatureTrait(cr,"Multi-headed")||creatureTrait(cr,"Multi-Headed")){const out=cs.headsOut||[],h=creatureHeads(cr,c.hp,out);
    rows.push('<b>Multi-headed</b> Working heads '+h.working.length+' / '+h.heads.length+': one extra action per working head beyond the first. A head loses its action only when incapacitated or severed; the body fights on (Core p.216). '
     +h.heads.map(n=>'<label class="mnum"><input type="checkbox" '+(out.includes(n)?'checked':'')+' onchange="APP.gmCreatureHead('+q+',\''+jsq(n)+'\',this.checked)"> '+esc(n)+' incapacitated or severed</label>').join(" ")
     +(h.atZero.length?' <span class="warn">'+esc(h.atZero.join(", "))+' at 0 HP or less: resolve the wound, then mark it if incapacitated or severed.</span>':''));}
  const breath=(cr.traits||[]).find(t=>/^breathe\b/i.test(t));
  if(breath){const cooling=(c.effects||[]).find(e=>e.type==="breath"&&e.value>0);
    rows.push('<b>'+esc(breath)+'</b> Recovery from the entry <input type="number" min="1" max="99" style="width:56px" value="'+(Number(cs.breathRecovery)||'')+'" onchange="APP.gmCreatureState('+q+',\'breathRecovery\',this.value)" aria-label="Breath recovery turns"> turns. '
     +(cooling?'Recovering: '+cooling.value+' turn(s) left.':'<button class="chip sm" onclick="APP.gmCreatureBreath('+q+')">Breathe (1 AP)</button>')
     +' A cone, not a single hit: each target in it rolls Evade to halve the damage; check each target&rsquo;s locations (Core p.215).');}
  if(creatureTrait(cr,"Trample"))rows.push('<b>Trample</b> Target SIZ <input type="number" id="cbttrample-'+id+'" min="1" style="width:56px" aria-label="Target SIZ"> <button class="chip sm" onclick="APP.gmCreatureTrample('+q+')">check</button> Athletics roll; the trait doubles the base Damage Modifier ('+esc(creatureAttributes(cr).damageMod)+') and boosts attack Size. Stationary trample costs AP; a moving pass is free (Core p.218).');
  if(creatureTrait(cr,"Venomous"))rows.push('<b>Venomous</b> An ordinary hit injects no venom. On a successful attack it may choose the Inject Venom special effect instead of doing damage: the poison gets through a gap in the armour (Core pp.97, 218). <button class="chip sm" onclick="APP.gmCreatureVenom('+q+')">Inject Venom chosen</button>');
  if(creatureTrait(cr,"Frenzy"))rows.push('<b>Frenzy</b> '+tog("frenzied",cs.frenzied,"Frenzied (after its Willpower roll, GM)")+(cs.frenzied?' Limited actions; pain and fatigue penalties the trait names are ignored.':' When it ends, apply the trait&rsquo;s fatigue (Core p.216). Not a permanent bonus.'));
  if(creatureTrait(cr,"Undead"))rows.push('<b>Undead</b> Serious and Major Wounds don&rsquo;t incapacitate or fatigue it. Binding location <select onchange="APP.gmCreatureState('+q+',\'bindingLoc\',this.value)"><option value="">not recorded</option>'+(c.locations||[]).map(l=>'<option '+(cs.bindingLoc===l?'selected':'')+'>'+esc(l)+'</option>').join("")+'</select> Destroyed when <input type="text" maxlength="200" placeholder="condition from the entry" value="'+esc(cs.destroyWhen||"")+'" onchange="APP.gmCreatureState('+q+',\'destroyWhen\',this.value)"> (Core p.218).');
  const resist=["Immunity","Vulnerable","Allergy"].map(n=>[n,creatureTraitSources(cr,n)]).filter(x=>x[1].length);
  if(resist.length)rows.push('<b>'+resist.map(([n,l])=>esc(n)+' ('+esc(l.join(", "))+')').join(' · ')+'</b> Give the damage source with a hit (below); it is checked before armour (Core pp.215, 217–218).');
  CREATURE_SENSES.forEach(([n,t])=>{if(creatureTrait(cr,n))rows.push('<b>'+esc(n)+'</b> '+esc(t));});
  if(creatureTrait(cr,"Intimidate")){const log=cs.intimidated||{};
    rows.push('<b>Intimidate</b> Each target rolls Willpower. Target <input type="text" id="cbtintim-'+id+'" maxlength="60" style="width:110px" aria-label="Intimidated target"> '
     +["Critical","Success","Failure","Fumble"].map(t=>'<button class="chip sm" onclick="APP.gmCreatureIntimidate('+q+',\''+t+'\')">'+t+'</button>').join(" ")
     +(Object.keys(log).length?' '+Object.entries(log).map(([n,k])=>esc(n)+': '+({immune:"ignores it",holds:"holds",retreats:"falls back",flees:"flees"}[k]||k)).join(", ")+' <button class="chip sm" onclick="APP.gmCreatureIntimidateClear('+q+')">encounter over</button>':'')
     +' Not an automatic retreat on sight (Core p.216).');}
  if(creatureTrait(cr,"Chaos Feature")||creatureTrait(cr,"Chaos Features")){const got=cs.chaos||[];
    rows.push('<b>Chaos Feature</b> <button class="chip sm" onclick="APP.gmCreatureChaos('+q+')">Roll d100</button> Rolled on the Core table (pp.274–276) and kept with this creature; the GM applies each effect.'
     +got.map((f,i)=>{const x=chaosFeatureFor(f.roll);return x?'<br><b>'+esc(x.range)+' '+esc(x.name)+'</b>: '+esc(x.effect)+' <button class="chip sm" onclick="APP.gmCreatureChaosRemove('+q+','+i+')" aria-label="Remove '+esc(x.name)+'">remove</button>':'';}).join(""));}
  if(creatureMind(cr).key==="INT"){const e=creaturePcEligibility(cr,cs.pcPermitted===true);
    rows.push('<b>As a character</b> '+'<label class="mnum"><input type="checkbox" '+(cs.pcPermitted?'checked':'')+' onchange="APP.gmCreatureState('+q+',\'pcPermitted\',this.checked)"> GM permits it as a player character</label> '+esc(e.reason)
     +(e.ok?(()=>{const pb=creaturePointsBuild(cr);return pb.ok?' Points Build: '+pb.pool+' points, all spent, each within '+Object.entries(pb.ranges).map(([k,r])=>k+' '+r.min+'–'+r.max).join(', ')+' (Core pp.8, 219).':' '+esc(pb.reason);})():''));}
  if(!rows.length&&!CREATURE_MSG[id])return "";
  return '<div class="cbt-traits">'+rows.map(r=>'<p class="note">'+r+'</p>').join("")+(CREATURE_MSG[id]?'<p class="note" role="status"><b>'+esc(CREATURE_MSG[id])+'</b></p>':'')+'</div>';
}
function gmToolsHTML(camp){
  const st=sessionStateOf(camp);
  const order=st.combatants.slice().sort((a,b)=>b.init-a.init);
  const activeId=order.length?(order.some(c=>c.id===st.activeId)?st.activeId:order[Math.min(st.turnIdx,order.length-1)].id):null;
  const acting=order.find(c=>c.id===activeId),next=order.length>1?order[(order.findIndex(c=>c.id===activeId)+1)%order.length]:null;
  const inFight=new Set(st.combatants.filter(e=>e.kind==="pc").map(e=>e.ref));
  const pcChoices=(BOARD_CHARS||[]).filter(c=>!inFight.has(c.id));
  let h=GM_SESSION_ERROR?'<p class="warn" style="margin-bottom:10px">'+esc(GM_SESSION_ERROR)+'</p>':'';
  h+='<div class="card"><h3>Combat Tracker</h3>';
  h+='<p class="note">GM working copy: HP and AP start from the saved character, then remain separate from the player sheet. Record final changes on the player sheet. Apply damage here after armour. End the active character&rsquo;s turn with Advance turn; start a new round only when the round is complete.</p>';
  h+='<div class="pb-initctl"><span class="pb-round">Round <b>'+st.round+'</b></span>'
   +'<span class="note">Cycle '+(st.cycle||1)+'</span>'
   +(acting?'<span class="cbt-turnread" role="status"><b>Acting:</b> '+esc(acting.name||"Unnamed")+(next?' &middot; <b>Next:</b> '+esc(next.name||"Unnamed"):'')+'</span>':'')
   +'<button class="chip" onclick="APP.gmAdvanceTurn()" '+(order.length?"":"disabled")+'>Advance turn &rarr;</button>'
   +'<button class="chip" onclick="APP.gmNewRound()" '+(order.length?"":"disabled")+'>New round · restore AP</button>'
   +(order.length>1?'<button class="chip" onclick="APP.gmRollAllInit()" title="1d10 + Initiative Bonus for party characters, flat 1d10 for NPCs">Roll initiative for everyone</button>':'')+'</div>';
  h+='<div class="pb-initadd">'
   +'<select id="gmPcPicker"><option value="">&mdash; add a party character &mdash;</option>'
   +pcChoices.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join("")+'</select>'
   +'<button class="chip" onclick="APP.gmAddPcInit()" '+(pcChoices.length?"":"disabled")+'>add</button>'
   +(pcChoices.length>1?'<button class="chip" onclick="APP.gmAddAllPcs()" title="Add every remaining party member at once">add all</button>':'')+'</div>';
  h+=creatureImportHTML();
  h+='<div class="pb-initadd">'
   +'<input type="text" id="gmNpcInitName" placeholder="NPC/monster name">'
   +'<input type="number" id="gmNpcInitVal" placeholder="Init" style="width:70px">'
   +'<button class="chip" onclick="APP.gmAddNpcInit()">add</button>'
   +'</div>';
  if(order.length){
    h+='<div class="cbt-list">'+order.map(c=>combatantCardHTML(c,c.id===activeId)).join("")+'</div>';
  }else{h+='<p class="note">No one in the fight yet — add a party character or an NPC above.</p>';}
  h+='</div>';
  h+='<div class="card"><h3>Session Notes</h3>'
   +'<p class="note" style="margin-bottom:8px">Visible only to you — not shown to players on this board.</p>'
   +'<textarea rows="6" placeholder="Scene notes, secrets, reminders for this session&hellip;" onchange="APP.gmNotes(this.value)">'+esc(st.sessionNotes||"")+'</textarea></div>';
  return h;
}
/* ---- Homebrew (campaign custom content): custom weapons, armor and
   spells that belong to this campaign specifically. Any member sees them
   merged into their own weapon/armor/spell pickers in the Builder (see
   allWeapons/allArmorMaterialsFor/allFolkSpells in the Campaign Custom
   Content section above); only the DM can add or remove them here. ---- */
function hbDiceRowHTML(){
  const d=HB_DRAFT.weapon;
  return '<div class="hb-dice">'+CUSTOM_DICE_STEPS.map(n=>
    '<span class="hb-diebtn"><button class="chip sm" onclick="APP.hbDiceAdj('+n+',-1)" '+(d.dice["d"+n]<=0?"disabled":"")+' aria-label="remove d'+n+'">&minus;</button>'
    +'<b>'+d.dice["d"+n]+'d'+n+'</b>'
    +'<button class="chip sm" onclick="APP.hbDiceAdj('+n+',1)" aria-label="add d'+n+'">+</button></span>').join("")
   +'<span class="hb-diebtn"><button class="chip sm" onclick="APP.hbFlatAdj(-1)" aria-label="lower flat modifier">&minus;</button>'
   +'<b>'+(d.flatMod>0?"+":"")+d.flatMod+'</b>'
   +'<button class="chip sm" onclick="APP.hbFlatAdj(1)" aria-label="raise flat modifier">+</button></span>'
   +'<span class="note">= '+esc(customDiceLabel(d.dice,d.flatMod))+'</span></div>';
}
function hbWeaponFormHTML(){
  const d=HB_DRAFT.weapon;
  return '<div class="hb-form">'
   +'<input type="text" placeholder="Weapon name" value="'+esc(d.name)+'" onchange="APP.hbField(\'weapon\',\'name\',this.value)">'
   +'<select onchange="APP.hbField(\'weapon\',\'group\',this.value)">'
    +["One-Handed","Two-Handed","Shield","Ranged"].map(g=>'<option value="'+g+'" '+(d.group===g?"selected":"")+'>'+g+'</option>').join("")+'</select>'
   +'<label class="note">Damage'+hbDiceRowHTML()+'</label>'
   +'<div class="grid3">'
    +fld("Size",'<select onchange="APP.hbField(\'weapon\',\'size\',this.value)">'+["S","M","L","H","E"].map(s=>'<option '+(d.size===s?"selected":"")+'>'+s+'</option>').join("")+'</select>')
    +fld("Reach",'<select onchange="APP.hbField(\'weapon\',\'reach\',this.value)">'+["S","M","T","L","VL"].map(s=>'<option '+(d.reach===s?"selected":"")+'>'+s+'</option>').join("")+'</select>')
    +fld("ENC",'<input type="number" min="0" value="'+d.enc+'" onchange="APP.hbField(\'weapon\',\'enc\',this.value)">')
   +'</div>'
   +'<div class="grid3">'
    +fld("Combat Effects",'<input type="text" placeholder="Bleed, Impale" value="'+esc(d.effects)+'" onchange="APP.hbField(\'weapon\',\'effects\',this.value)">')
    +fld("AP/HP",'<input type="text" placeholder="6/8" value="'+esc(d.apHp)+'" onchange="APP.hbField(\'weapon\',\'apHp\',this.value)">')
    +fld("Cost (sp)",'<input type="number" min="0" value="'+d.cost+'" onchange="APP.hbField(\'weapon\',\'cost\',this.value)">')
   +'</div>'
   +fld("Traits",'<input type="text" placeholder="Thrown, Entrapping" value="'+esc(d.traits)+'" onchange="APP.hbField(\'weapon\',\'traits\',this.value)">')
   +'<button class="chip actionchip" onclick="APP.hbSubmit(\'weapon\')" '+(d.name.trim()?"":"disabled")+'>+ add weapon</button>'
   +'</div>';
}
function hbArmorFormHTML(){
  const d=HB_DRAFT.armor;
  return '<div class="hb-form">'
   +'<input type="text" placeholder="Armour name, e.g. Chitin Plating" value="'+esc(d.name)+'" onchange="APP.hbField(\'armor\',\'name\',this.value)">'
   +'<div class="grid3">'
    +fld("AP",'<input type="number" min="0" value="'+d.ap+'" onchange="APP.hbField(\'armor\',\'ap\',this.value)">')
    +fld("ENC / location",'<input type="number" min="0" value="'+d.encPerLoc+'" onchange="APP.hbField(\'armor\',\'encPerLoc\',this.value)">')
   +'</div>'
   +'<div class="field"><label>Hit-location coverage (none checked = fits any location)</label><div class="choicechips">'
    +ARMOR_LOCATIONS.map(l=>'<button class="chip '+(d.locations.includes(l)?"on":"")+'" onclick="APP.hbToggleArmorLoc(\''+jsq(l)+'\')">'+esc(l)+'</button>').join("")+'</div></div>'
   +'<button class="chip actionchip" onclick="APP.hbSubmit(\'armor\')" '+(d.name.trim()?"":"disabled")+'>+ add armour</button>'
   +'</div>';
}
function hbSpellFormHTML(){
  const d=HB_DRAFT.spell;
  return '<div class="hb-form">'
   +'<input type="text" placeholder="Spell name" value="'+esc(d.name)+'" onchange="APP.hbField(\'spell\',\'name\',this.value)">'
   +'<div class="field"><label>Traits</label><div class="choicechips">'
    +CUSTOM_SPELL_TRAITS.map(t=>'<button class="chip '+(d.traits.includes(t)?"on":"")+'" title="'+esc(MAGIC_TRAITS[t]||"")+'" onclick="APP.hbToggleSpellTrait(\''+jsq(t)+'\')">'+esc(t)+'</button>').join("")+'</div></div>'
   +'<label class="hb-checkrow"><input type="checkbox" '+(d.hasSpec?"checked":"")+' onchange="APP.hbField(\'spell\',\'hasSpec\',this.checked)"> Has specializations (e.g. Find (X))</label>'
   +(d.hasSpec?'<input type="text" placeholder="speciality prompt, e.g. what it finds" value="'+esc(d.specLabel)+'" onchange="APP.hbField(\'spell\',\'specLabel\',this.value)">':"")
   +fld("Description",'<textarea rows="3" placeholder="What the spell does&hellip;" onchange="APP.hbField(\'spell\',\'desc\',this.value)">'+esc(d.desc)+'</textarea>')
   +'<button class="chip actionchip" onclick="APP.hbSubmit(\'spell\')" '+(d.name.trim()?"":"disabled")+'>+ add spell</button>'
   +'</div>';
}
function hbListRowHTML(row){
  const d=row.data||{};
  let summary="";
  if(row.type==="weapon")summary=customDiceLabel(d.dice,d.flatMod)+" · "+(d.group||"Custom")+(d.effects?" · "+d.effects:"");
  else if(row.type==="armor")summary="AP "+(Number(d.ap)||0)+" · ENC "+(Number(d.encPerLoc)||0)+"/loc"+(d.locations&&d.locations.length?" · "+d.locations.join(", "):" · any location");
  else summary=(Array.isArray(d.traits)?d.traits.join(", "):"")||"—";
  return '<div class="hb-row"><div><b>'+esc(row.name)+'</b><div class="note">'+esc(summary)+'</div></div>'
   +'<button class="chip sm" onclick="APP.hbDelete(\''+row.id+'\',\''+row.type+'\')" aria-label="delete">&times;</button></div>';
}
function hbSectionHTML(camp,type,title,rulesnote){
  const rows=(CUSTOM_CONTENT_CACHE[camp.id]||[]).filter(c=>c.type===type);
  const form=type==="weapon"?hbWeaponFormHTML():type==="armor"?hbArmorFormHTML():hbSpellFormHTML();
  return '<div class="card"><h3>'+esc(title)+'</h3><p class="note">'+esc(rulesnote)+'</p>'
   +(rows.length?'<div class="hb-list">'+rows.map(hbListRowHTML).join("")+'</div>':'<p class="note">None yet.</p>')
   +form+'</div>';
}
function homebrewHTML(camp){
  ensureCustomContentLoaded(camp.id);
  let h=HB_ERROR?'<p class="warn" style="margin-bottom:10px">'+esc(HB_ERROR)+'</p>':'';
  h+='<p class="note" style="margin-bottom:10px">Homebrew content belongs to this campaign only — every member sees it merged into their own weapon/armour/spell pickers in the Builder; only you can add or remove it here.</p>';
  h+=hbSectionHTML(camp,"weapon","Custom Weapons","Shows up in Money & Gear's weapon picker and the Combat Style weapon list, marked with a ★.");
  h+=hbSectionHTML(camp,"armor","Custom Armour","Shows up as a material option in Money & Gear's armour picker, restricted to whichever locations it covers.");
  h+=hbSectionHTML(camp,"spell","Custom Folk Magic Spells","Shows up alongside core Folk Magic in the Magic step's spell picker.");
  return h;
}
function renderBoardView(){
  document.body.classList.remove("play-mode");
  document.body.classList.remove("sheet-mode");
  document.body.classList.add("menu-mode");
  const camp=CAMPAIGN_VIEW&&CAMPAIGN_VIEW.campaign;
  document.title=(camp?camp.name+" — ":"")+"Party Board — Mythras Character Forge";
  $("#main").innerHTML=boardHTML();
}
// Standalone printable Character Sheet view — reached from Play Mode, the
// builder's Finish step, or a My Characters card (see APP.toSheet /
// APP.openCharToSheet). Reuses the same body.menu-mode trick as the other
// full-bleed views above (hides #rail/#ledger/.foot, #main goes full width)
// since this isn't part of the step-flow chrome.
function renderSheetView(){
  document.body.classList.remove("play-mode");
  // "sheet-mode" alongside "menu-mode" so this view keeps the plain parchment
  // background (styles.css excludes it from the golden-hour full-bleed rule)
  // while still getting the menu-mode layout trick (hides #rail/#ledger/.foot).
  document.body.classList.add("menu-mode","sheet-mode");
  document.title=(S.concept.name?S.concept.name+" — ":"")+"Character Sheet";
  const backLabel=SHEET_RETURN_VIEW==="play"?"&#8592; Back to Play Mode":SHEET_RETURN_VIEW==="library"?"&#8592; Back to My Characters":"&#8592; Back";
  let h='<div class="sheetview-wrap"><p><button class="nav" onclick="APP.backFromSheet()">'+backLabel+'</button></p>';
  h+=characterSheetBody();
  h+='</div>';
  $("#main").innerHTML=h;
}

