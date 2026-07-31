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
let MOCK_AUTH=null;      // {id,display_name} once "mock signed in", else null
const anyAuth=()=>AUTH_USER||MOCK_AUTH;
let CAMP_CACHE=null;     // array once loaded from the cloud, else null ("loading")
let CAMPAIGN_VIEW=null;  // {campaign,members,chars,unassigned} for whatever campaign is open
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
async function cloudCreateCampaign(name){
  const {data,error}=await sb.from("campaigns").insert({name,notes:"",dm_id:AUTH_USER.id,invite_code:genId().toUpperCase()}).select().single();
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
async function cloudDmUpdateCharacterInventory(id,inventory){
  // Same reasoning as cloudDmUnassignCharacter above — the DM has no general
  // UPDATE grant on a player's character, so this goes through a narrow
  // SECURITY DEFINER RPC that touches only state.inventory (loot distribution,
  // adding/removing gear mid-session) and nothing else on the sheet.
  const {error}=await sb.rpc("dm_update_character_inventory",{p_char:id,p_inventory:inventory});
  if(error)throw error;
}
async function cloudJoinCampaign(code){
  const {data,error}=await sb.rpc("join_campaign",{p_code:code.trim().toUpperCase()});
  if(error)throw error;
  return data&&data[0];
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
  if(error||!data)return [];
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
    tier:c.tier,culture:c.culture,career:c.career,updated_at:new Date(c.savedAt).toISOString()};
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
    const {data,error}=await sb.from("characters").update(updateFields).eq("id",entry.id).select().single();
    if(error)throw error;
    return data;
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
function saveCampaignsListLocal(list){try{localStorage.setItem(CAMPAIGNS_KEY,JSON.stringify(list));}catch(e){}}
function getCampaignLocal(id){return loadCampaignsLocal().find(c=>c.id===id)||null;}
function upsertCampaignLocal(camp){const list=loadCampaignsLocal();const i=list.findIndex(c=>c.id===camp.id);
  if(i>=0)list[i]=camp;else list.push(camp);saveCampaignsListLocal(list);}
function deleteCampaignByIdLocal(id){
  saveCampaignsListLocal(loadCampaignsLocal().filter(c=>c.id!==id));
  saveCharLibListLocal(loadCharLibLocal().map(c=>c.campaignId===id?Object.assign({},c,{campaignId:null}):c));
}
function loadCharLibLocal(){try{return JSON.parse(localStorage.getItem(CHARLIB_KEY))||[];}catch(e){return [];}}
function saveCharLibListLocal(list){try{localStorage.setItem(CHARLIB_KEY,JSON.stringify(list));}catch(e){}}
function charsInCampaignLocal(id){return loadCharLibLocal().filter(c=>c.campaignId===id);}
function unassignedCharsLocal(){return loadCharLibLocal().filter(c=>!c.campaignId);}
function saveCurrentToLibraryLocal(){
  const lib=loadCharLibLocal();
  const id=S._libId||genId();
  const entry={id,campaignId:S.campaignId||null,name:S.concept.name||"Unnamed Character",
    tier:S.archetype,culture:S.culture||"",
    career:(S.customCareer&&S.customCareer.isCustom?S.customCareer.name:S.career)||"",
    savedAt:Date.now(),state:JSON.parse(JSON.stringify(S))};
  const i=lib.findIndex(c=>c.id===id);
  if(i>=0)lib[i]=entry;else lib.push(entry);
  saveCharLibListLocal(lib);
  S._libId=id;
  return entry;
}

/* ================= UNIFIED DATA LAYER (routes to cloud or local) =================
   Every view below reads from these — never from the Local/cloudFetch*
   functions directly — so the same rendering code works whether or not
   Supabase is configured. Cloud calls are async; CAMP_CACHE / CAMPAIGN_VIEW
   are populated by a loader, then render() is called again once they land
   (a short "Loading…" state shows in between). */
const cloudActive=()=>CLOUD_ENABLED&&!!AUTH_USER;
async function loadCampaignsUnified(){
  if(cloudActive()){CAMP_CACHE=await cloudFetchCampaigns();}
  else{CAMP_CACHE=loadCampaignsLocal().map(c=>({id:c.id,name:c.name,notes:c.notes,
    created_at:new Date(c.createdAt).toISOString(),dm_id:null,invite_code:null}));}
  render();
}
// "My Characters" — every character ever autosaved (local) or owned
// (cloud), independent of which campaign (if any) they're linked to.
// localCharShape() already normalizes local library entries to the same
// {id,name,tier,culture,career,updated_at,...} shape cloudFetchCharacters
// returns, so the list view doesn't need to branch on cloud vs. local.
async function loadLibraryUnified(){
  if(cloudActive()){LIB_CACHE=await cloudFetchCharacters({mine:true});}
  else{LIB_CACHE=loadCharLibLocal().map(localCharShape);}
  render();
}
async function loadCampaignViewUnified(id){
  if(cloudActive()){
    const [campRes,members,chars,mine]=await Promise.all([
      sb.from("campaigns").select("*").eq("id",id).maybeSingle(),
      cloudFetchMembers(id),
      cloudFetchCharacters({campaignId:id}),
      cloudFetchCharacters({mine:true})
    ]);
    CAMPAIGN_VIEW={campaign:campRes.data||null,members,chars,unassigned:mine.filter(c=>!c.campaign_id)};
  }else{
    const raw=getCampaignLocal(id);
    const campaign=raw?{id:raw.id,name:raw.name,notes:raw.notes,created_at:new Date(raw.createdAt).toISOString(),dm_id:null,invite_code:null}:null;
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
}
async function createCampaignUnified(name){
  if(cloudActive())return cloudCreateCampaign(name);
  const camp={id:genId(),name,notes:"",createdAt:Date.now()};
  upsertCampaignLocal(camp);
  return {id:camp.id,name:camp.name,notes:camp.notes,created_at:new Date(camp.createdAt).toISOString(),dm_id:null,invite_code:null};
}
async function renameCampaignUnified(id,name){
  if(cloudActive())return cloudUpdateCampaign(id,{name});
  const camp=getCampaignLocal(id);if(!camp)return;camp.name=name;upsertCampaignLocal(camp);
}
async function noteCampaignUnified(id,notes){
  if(cloudActive())return cloudUpdateCampaign(id,{notes});
  const camp=getCampaignLocal(id);if(!camp)return;camp.notes=notes;upsertCampaignLocal(camp);
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
async function saveToLibraryUnified(explicit){
  if(cloudActive()){
    // A character loaded from somewhere not yet verified as belonging to
    // whoever is currently signed in (S._pendingClaim -- the autosave slot,
    // a "local" My-Characters entry, or a JSON import) may only ever be
    // attached to the cloud by an explicit "Save to Library" click, never
    // by this function's other caller, the debounced background push.
    // Without this, opening someone else's abandoned local character (or
    // the account-agnostic old "Continue" prompt) while signed in would
    // silently upload their data to whoever happens to be signed in the
    // next time the debounced push fires -- no click, no confirmation.
    if(!explicit&&S._pendingClaim&&!isUuid(S._libId))return null;
    const saved=await cloudUpsertCharacter({
      id:isUuid(S._libId)?S._libId:undefined,campaignId:S.campaignId||null,name:S.concept.name||"Unnamed Character",
      tier:S.archetype,culture:S.culture||"",
      career:(S.customCareer&&S.customCareer.isCustom?S.customCareer.name:S.career)||"",
      state:JSON.parse(JSON.stringify(S))});
    S._libId=saved.id;S._pendingClaim=false;return saved;
  }
  return saveCurrentToLibraryLocal();
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
  // Returns campaignId/ownerId straight from the DB row (or the local
  // library entry), NOT from whatever was embedded in the saved state blob
  // at last-save time — the blob can be stale if a DM unassigned/reassigned
  // the character since then, and blindly trusting it would silently undo
  // that change on the next save.
  if(cloudActive()){
    const {data,error}=await sb.from("characters").select("*").eq("id",id).maybeSingle();
    if(error||!data)return null;
    return {id:data.id,name:data.name,state:data.state,campaignId:data.campaign_id||null,ownerId:data.owner_id};
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
function scheduleCloudPush(){
  // This fires as long as there's real work worth saving (hasUnsavedWork()
  // — same gate the local-mirror path already used), regardless of whether
  // S._libId is set yet: a brand-new character (started fresh, never
  // touched local storage) auto-creates its cloud row on the first
  // debounced push without ever requiring the Save button, so it can't
  // silently disappear if the player forgets to click Save.
  //
  // The one thing this must never do is silently claim a character that
  // came from somewhere not yet verified as belonging to whoever is
  // currently signed in — S._pendingClaim marks exactly that (autosave
  // resume, a "local" My-Characters entry, a JSON import). saveToLibraryUnified()
  // itself enforces the actual rule (only an explicit Save click may claim
  // pending content); this function doesn't need its own copy of that
  // check, just to know it isn't skipping the debounce for no reason when
  // that guard quietly no-ops the push.
  if(!cloudActive()||VIEW_ONLY||!hasUnsavedWork())return;
  clearTimeout(CLOUD_PUSH_TIMER);
  CLOUD_PUSH_TIMER=setTimeout(()=>{saveToLibraryUnified(false).catch(e=>console.warn("cloud sync",e));},1500);
}
let DM_INV_PUSH_TIMER=null;
// Separate debounced push for the DM-editing-a-player's-inventory case.
// scheduleCloudPush() above deliberately never fires under VIEW_ONLY (the DM
// has no general write access), so a loot-drop edit needs its own path that
// goes through the scoped dm_update_character_inventory RPC instead of the
// normal owner upsert.
function scheduleDmInventoryPush(){
  if(!cloudActive()||!S._libId||!VIEW_ONLY_IS_DM)return;
  clearTimeout(DM_INV_PUSH_TIMER);
  DM_INV_PUSH_TIMER=setTimeout(()=>{
    cloudDmUpdateCharacterInventory(S._libId,S.inventory).catch(e=>console.warn("dm inventory sync",e));
  },1500);
}
function saveAutosave(){
  try{localStorage.setItem(autosaveKey(),JSON.stringify({S,ts:Date.now()}));}catch(e){/* storage unavailable — silently skip */}
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
  if(!cloudActive()&&hasUnsavedWork()){try{saveCurrentToLibraryLocal();}catch(e){/* best-effort */}}
  scheduleCloudPush();
  scheduleDmInventoryPush();
  updateAutosaveTag();
}
function updateAutosaveTag(){
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
// the home screen). Offers both the real Supabase magic-link flow and a
// clearly-labeled local mock session for testing Campaign features without
// needing a real inbox round-trip.
function accountHTML(){
  let h='<div class="mmenu"><div class="mmenu-topbar"><span class="mmenu-brandmark">Mythras</span><span class="mmenu-branddiv">&middot;</span><span class="mmenu-brandsub">Character Forge</span>'
   +'<button class="mmenu-acctbtn" onclick="APP.toMenu()">&#8592; Main Menu</button></div>';
  h+='<div class="mmenu-pagehead"><h1>Account</h1><p>Sign in to sync Campaigns between people and devices.</p></div>';
  h+='<div class="mmenu-authgrid">';
  h+='<div class="mmenu-panel mmenu-authpanel">';
  if(!CLOUD_ENABLED){
    h+='<div class="mmenu-panel-eyebrow">Cloud sign-in</div><p class="note">Cloud sync isn&rsquo;t configured for this copy of the app, so Campaigns stay local to this browser — no account needed.</p>';
  }else if(AUTH_RECOVERY){
    h+='<div class="mmenu-panel-eyebrow">Reset password</div><div class="mmenu-authhead"><b>Choose a new password</b>'
     +'<span>You clicked a password-reset link. Set a new password below to finish.</span></div>'
     +'<div class="mmenu-joinrow"><input type="password" id="authNewPw" placeholder="New password (8+ characters)"><button class="chip" onclick="APP.setNewPassword()">Save</button></div>';
  }else if(AUTH_USER&&AUTH_PROFILE){
    h+='<div class="mmenu-panel-eyebrow">Signed in</div><div class="mmenu-authhead"><b>'+esc(AUTH_PROFILE.display_name)+'</b><span>'+esc(AUTH_USER.email)+'</span></div>'
     +'<button class="mmenu-cta-ghost" onclick="APP.signOut()">Sign out</button>';
  }else if(AUTH_USER&&!AUTH_PROFILE){
    h+='<div class="mmenu-panel-eyebrow">One more thing</div><div class="mmenu-authhead"><b>Choose a display name</b>'
     +'<span>Signed in as '+esc(AUTH_USER.email)+'. What should other players see you as?</span></div>'
     +'<div class="mmenu-joinrow"><input type="text" id="authName" placeholder="Display name"><button class="chip" onclick="APP.setDisplayName()">Save</button></div>';
  }else{
    h+='<div class="mmenu-panel-eyebrow">Sign in</div><div class="mmenu-authhead"><b>Email &amp; password</b>'
     +'<span>Needed for Campaigns and the Party Board to sync between people and devices.</span></div>'
     +'<div class="mmenu-joinrow" style="flex-direction:column;align-items:stretch;gap:8px">'
     +'<input type="email" id="authEmail" placeholder="you@example.com">'
     +'<input type="password" id="authPw" placeholder="Password">'
     +'<div style="display:flex;gap:8px"><button class="chip" onclick="APP.signIn()">Sign in</button>'
     +'<button class="chip" onclick="APP.signUp()">Create account</button></div>'
     +'<button class="mmenu-cta-ghost sm" style="align-self:flex-start" onclick="APP.forgotPassword()">Forgot password?</button>'
     +'</div>'
     +(AUTH_PENDING==="signup"?'<p class="okmsg" style="margin-top:8px">Check your email to confirm your account, then sign in.</p>':"")
     +'<details style="margin-top:12px"><summary class="note" style="cursor:pointer">Prefer a magic link instead?</summary>'
     +'<div class="mmenu-joinrow" style="margin-top:8px"><input type="email" id="authEmailLink" placeholder="you@example.com">'
     +'<button class="chip" onclick="APP.sendMagicLink(\'authEmailLink\')">Send link</button></div>'
     +(AUTH_PENDING===true?'<p class="okmsg" style="margin-top:8px">Check your email for the sign-in link.</p>':"")
     +'</details>';
  }
  h+='</div>';
  if(CLOUD_ENABLED&&!AUTH_USER){
    h+='<div class="mmenu-panel mmenu-mockpanel"><div class="mmenu-panel-eyebrow">Test account &mdash; this browser only</div>';
    if(MOCK_AUTH){
      h+='<div class="mmenu-authhead"><b>'+esc(MOCK_AUTH.display_name)+'</b><span>Mock session &mdash; Campaign features are unlocked locally. Nothing is sent anywhere.</span></div>'
       +'<button class="mmenu-cta-ghost" onclick="APP.mockSignOut()">End test session</button>';
    }else{
      h+='<p class="note">Skip real sign-in and try the Campaign features with a fake local identity for testing &mdash; nothing leaves this browser, and it won&rsquo;t sync with anyone else.</p>'
       +'<div class="mmenu-joinrow"><input type="text" id="mockName" placeholder="Test DM name"><button class="chip" onclick="APP.mockSignIn()">Use test account</button></div>';
    }
    h+='</div>';
  }
  h+='</div></div>';
  return h;
}
function renderAccountView(){
  document.body.classList.remove("play-mode");
  document.body.classList.add("menu-mode");
  document.title="Account — Mythras Character Forge";
  $("#main").innerHTML=accountHTML();
}
// ---- Main menu, v2 ----
// Full rebuild (not a margin/width patch on v1). v1 was a single narrow
// column (max-width:840px) centered in whatever viewport width was
// available, which on any real desktop monitor left large dead margins on
// both sides — the page never used the width it had. This version composes
// like an actual landing page at desktop width: a small wordmark, then an
// asymmetric two-column hero (headline/CTA on the left, a real content
// panel — not decoration — filling the right column), then a proper
// multi-column secondary section below instead of a single stacked list.
// Home screen — "Aegean golden hour": the approved mockup
// (docs/homepage-mockup-approved.html) after a long round of iteration.
// Deliberately minimal by design (5 actions + sign-in, nothing else) rather
// than the earlier landing-page-style menu this replaced; every action
// routes to the same real handlers that page used, just reached through a
// plain button instead of a card with preview content. The one addition
// beyond the mockup itself is a small "Continue as X" link, shown only
// when there's an autosaved character to resume — dropping that outright
// would have quietly removed a real feature rather than just simplified
// the page, so it's kept but deliberately unobtrusive rather than styled
// as one of the five primary actions.
function menuHTML(){
  const auto=getAutosaveInfo();
  let h='<div class="myth-home">';
  h+='<div class="myth-home-sunglow" aria-hidden="true"></div>';
  h+='<div class="myth-home-marble" aria-hidden="true"></div>';
  h+='<div class="myth-home-col l" aria-hidden="true"></div><div class="myth-home-col r" aria-hidden="true"></div>';
  h+='<div class="myth-home-colcap l" aria-hidden="true"></div><div class="myth-home-colcap r" aria-hidden="true"></div>';
  h+='<div class="myth-home-colbase l" aria-hidden="true"></div><div class="myth-home-colbase r" aria-hidden="true"></div>';
  h+=signInButtonHTML();
  h+='<div class="myth-home-stack">';
  h+='<div class="myth-home-title">Mythras</div>';
  h+='<div class="myth-home-rule"></div>';
  h+='<div class="myth-home-menu">'
   +'<button class="myth-home-mbtn" onclick="APP.fromMenuNew()">Create a character</button>'
   +'<button class="myth-home-mbtn" onclick="APP.newCampaign()">Create a campaign</button>'
   +'<button class="myth-home-mbtn" onclick="APP.homeJoinCampaign()">Join a campaign</button>'
   +'<button class="myth-home-mbtn" onclick="APP.toLibrary()">My characters</button>'
   +'<button class="myth-home-mbtn" onclick="APP.toCampaigns()">My campaigns</button>'
   +'</div>';
  if(auto)h+='<button class="myth-home-continue" onclick="APP.fromMenuContinue()">Continue as '+esc(auto.name)+' &rarr;</button>';
  h+='</div>'; // /myth-home-stack
  h+='</div>'; // /myth-home
  return h;
}
// Top-right sign-in affordance: reflects real Supabase auth if present,
// otherwise a distinct "Test" indicator when a mock session is active, or a
// plain Sign In pill when signed out entirely. Always routes to the
// standalone Account page rather than opening a form inline.
function signInButtonHTML(){
  if(!CLOUD_ENABLED)return "";
  let label,cls="myth-home-signin";
  if(MOCK_AUTH){label="Test: "+esc(MOCK_AUTH.display_name);cls+=" is-active is-mock";}
  else if(AUTH_USER&&AUTH_PROFILE){label=esc(AUTH_PROFILE.display_name);cls+=" is-active";}
  else if(AUTH_USER){label="Finish sign-in";}
  else{label="Sign In";}
  return '<button class="'+cls+'" onclick="APP.toAccount()">'+label+'</button>';
}
function renderMenuView(){
  document.body.classList.remove("play-mode");
  document.body.classList.add("menu-mode");
  document.title="Mythras Character Forge";
  $("#main").innerHTML=menuHTML();
}
/* ---- campaign list ---- */
function campaignsHTML(){
  if(CAMP_CACHE===null)return '<div class="menuwrap"><p class="note" style="text-align:center">Loading campaigns&hellip;</p></div>';
  const camps=CAMP_CACHE.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  let h='<div class="menuwrap"><div class="menuhead"><h1>Campaigns</h1><p>'+(cloudActive()?"Synced to your account — DMs see every linked character.":"Local to this browser only.")+'</p></div>';
  h+='<p style="text-align:center;margin-bottom:20px"><button class="nav" onclick="APP.toMenu()">&#8592; Main Menu</button> <button class="nav primary" onclick="APP.newCampaign()">+ New Campaign</button></p>';
  if(!camps.length){h+='<p class="note" style="text-align:center">No campaigns yet — start one above, or join one with an invite code from the Main Menu.</p>';}
  h+='<div class="menutiles">'+camps.map(c=>{
    const mineAsDm=!cloudActive()||c.dm_id===(AUTH_USER&&AUTH_USER.id);
    return '<button class="menutile" onclick="APP.openCampaign(\''+c.id+'\')"><span class="mt-title">'+esc(c.name||"Untitled Campaign")+'</span>'
      +'<span class="mt-desc">'+(mineAsDm?"You&rsquo;re the DM":"You&rsquo;re a player")+' &middot; created '+new Date(c.created_at).toLocaleDateString()+'</span></button>';
  }).join("")+'</div></div>';
  return h;
}
function renderCampaignsView(){
  document.body.classList.remove("play-mode");
  document.body.classList.add("menu-mode");
  document.title="Campaigns — Mythras Character Forge";
  $("#main").innerHTML=campaignsHTML();
}
/* ---- my characters ---- */
function libraryHTML(){
  let h='<div class="mmenu"><div class="mmenu-topbar"><span class="mmenu-brandmark">Mythras</span><span class="mmenu-branddiv">&middot;</span><span class="mmenu-brandsub">Character Forge</span>'
   +'<button class="mmenu-acctbtn" onclick="APP.toMenu()">&#8592; Main Menu</button></div>';
  h+='<div class="mmenu-pagehead"><h1>My Characters</h1><p>'+(cloudActive()?"Every character saved to your account.":"Every character autosaved in this browser.")+'</p></div>';
  if(LIB_CACHE===null){h+='<p class="note">Loading&hellip;</p></div>';return h;}
  if(!LIB_CACHE.length){
    h+='<div class="mmenu-panel"><p class="note">No characters saved yet — start one from the Main Menu and it&rsquo;ll show up here automatically as you build it.</p>'
     +'<button class="mmenu-cta-primary" style="margin-top:14px" onclick="APP.fromMenuNew()">Create New Character &rarr;</button></div></div>';
    return h;
  }
  const list=LIB_CACHE.slice().sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
  h+='<div class="mmenu-charlist">'+list.map(c=>{
    const initials=((c.name||"?").match(/\b[A-Za-z]/g)||["?"]).slice(0,2).join("").toUpperCase();
    const tierLabel=c.tier&&c.tier!=="ordinary"&&ARCHETYPES[c.tier]?ARCHETYPES[c.tier].label:null;
    const meta=[c.culture,c.career,tierLabel].filter(Boolean).join(" &middot; ")||"Concept only, so far";
    return '<div class="mmenu-charcard"><div class="mmenu-preview-head">'
     +'<div class="mmenu-preview-portrait">'+esc(initials)+'</div><div>'
     +'<div class="mmenu-preview-name">'+esc(c.name||"Unnamed Character")+'</div>'
     +'<div class="mmenu-preview-meta">'+meta+'</div></div></div>'
     +'<div class="mmenu-charcard-ts">Saved '+new Date(c.updated_at).toLocaleString()+'</div>'
     +'<div class="mmenu-charcard-actions">'
     +'<button class="mmenu-cta-secondary" onclick="APP.openCharToPlay(\''+c.id+'\')">Play &rarr;</button>'
     +'<button class="mmenu-cta-ghost sm" onclick="APP.openCharToEdit(\''+c.id+'\')">Edit</button>'
     +'<button class="mmenu-cta-ghost sm" onclick="APP.openCharToSheet(\''+c.id+'\')">Print</button>'
     +'<button class="mmenu-charcard-del" onclick="APP.deleteLibChar(\''+c.id+'\',\''+jsq(c.name||"this character")+'\')" title="Delete">&times;</button>'
     +'</div></div>';
  }).join("")+'</div>';
  h+='</div>';
  return h;
}
function renderLibraryView(){
  document.body.classList.remove("play-mode");
  document.body.classList.add("menu-mode");
  document.title="My Characters — Mythras Character Forge";
  $("#main").innerHTML=libraryHTML();
}
/* ---- single campaign ---- */
function campaignDetailHTML(){
  if(CAMPAIGN_VIEW===null)return '<div class="menuwrap"><p class="note" style="text-align:center">Loading campaign&hellip;</p></div>';
  const {campaign:camp,members,chars,unassigned}=CAMPAIGN_VIEW;
  if(!camp)return '<div class="menuwrap"><p class="warn">Campaign not found.</p><p><button class="nav" onclick="APP.toCampaigns()">&#8592; Campaigns</button></p></div>';
  const isDM=!cloudActive()||camp.dm_id===(AUTH_USER&&AUTH_USER.id);
  let h='<div class="menuwrap">';
  h+='<p><button class="nav" onclick="APP.toCampaigns()">&#8592; Campaigns</button></p>';
  h+='<div class="card"><h3>Campaign'+(isDM?"":' <span class="note">(player view)</span>')+'</h3>';
  if(isDM){
    h+=fld("Name",'<input type="text" value="'+esc(camp.name)+'" onchange="APP.campField(\'name\',this.value)">')
     +fld("Notes",'<textarea rows="4" onchange="APP.campField(\'notes\',this.value)">'+esc(camp.notes||"")+'</textarea>');
  }else{
    h+='<p style="font-family:\'Cinzel\',serif;font-size:19px;letter-spacing:.03em;color:#8a5a12;text-transform:uppercase">'+esc(camp.name)+'</p>'
     +(camp.notes?'<p class="note" style="margin-top:6px">'+esc(camp.notes)+'</p>':"");
  }
  h+='<p class="note" style="margin-top:8px">Created '+new Date(camp.created_at).toLocaleString()
   +(cloudActive()&&isDM&&camp.invite_code?' &middot; invite code <b style="font-family:var(--mono)">'+esc(camp.invite_code)+'</b> (share this with your players)':"")+'</p>';
  h+='<p style="margin-top:12px"><button class="nav primary" onclick="APP.toBoard(\''+camp.id+'\')">Live Party Board &rarr;</button>'
   +(isDM?' <button class="chip" onclick="APP.deleteCampaign()">Delete campaign</button>':'')+'</p>';
  h+='</div>';
  if(members.length){
    h+='<div class="card"><h3>Members ('+members.length+')</h3>'
     +members.map(m=>'<div class="skrow"><span>'+esc(m.name)+'</span><span class="note" style="text-transform:capitalize">'+esc(m.role)+'</span></div>').join("")+'</div>';
  }
  h+='<div class="card"><h3>Characters ('+chars.length+')</h3>';
  if(!chars.length)h+='<p class="note">No characters linked yet.</p>';
  h+=chars.map(c=>{
    const mine=!cloudActive()||c.owner_id===(AUTH_USER&&AUTH_USER.id);
    return '<div class="skrow"><span>'+esc(c.name)+' <span class="note">&mdash; '+esc([!mine?c.owner_name:null,c.tier!=="ordinary"?c.tier:null,c.culture,c.career].filter(Boolean).join(" · "))+'</span></span>'
     +'<span>'+(mine?'<button class="chip" onclick="APP.openLibChar(\''+c.id+'\')">open</button> <button class="chip" onclick="APP.unassignChar(\''+c.id+'\')">unassign</button>'
                    :(isDM?'<button class="chip" onclick="APP.dmUnassignChar(\''+c.id+'\')">unassign</button>':'<span class="note">view via Party Board</span>'))+'</span></div>';
  }).join("");
  h+='<p style="margin-top:12px"><button class="nav" onclick="APP.newCharacterForCampaign()">+ New Character for this Campaign</button></p>';
  if(unassigned.length){
    h+='<div style="margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
     +'<select id="assignPicker"><option value="">&mdash; assign one of your saved characters &mdash;</option>'
     +unassigned.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join("")+'</select>'
     +'<button class="chip" onclick="APP.assignPicked()">assign</button></div>';
  }
  h+='</div></div>';
  return h;
}
function renderCampaignView(){
  document.body.classList.remove("play-mode");
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
// one request instead of one per event.
function boardRefetch(campaignId){
  clearTimeout(BOARD_REFETCH_TIMER);
  BOARD_REFETCH_TIMER=setTimeout(async()=>{
    BOARD_CHARS=await loadBoardUnified(campaignId);
    BOARD_LAST_FETCH=Date.now();
    if(APPVIEW==="board")render();
  },300);
}
let BOARD_LAST_FETCH=null;
async function boardLoad(campaignId){
  BOARD_CHARS=await loadBoardUnified(campaignId);
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
  const barColor=v.worst==="major"?"var(--pm-bad)":v.worst==="serious"?"var(--pm-warn)":v.worst==="minor"?"var(--pm-minor)":"var(--pm-good)";
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
  let h='<div class="menuwrap pb-wrap">';
  h+='<p><button class="nav" onclick="APP.openCampaign(\''+(CURRENT_CAMPAIGN_ID||"")+'\')">&#8592; '+(camp?esc(camp.name):"Campaign")+'</button> '
   +'<button class="nav" onclick="APP.refreshBoard()">&#8635; Refresh</button>'
   +(cloudActive()?'<span class="pb-livedot '+(BOARD_LIVE?"on":"off")+'" title="'+(BOARD_LIVE?"Live — updates arrive automatically":"Reconnecting…")+'">'+(BOARD_LIVE?"&#9679; Live":"&#9675; Connecting…")+'</span>':'')+'</p>';
  h+='<div class="menuhead"><h1>Party Board'+(camp?" — "+esc(camp.name):"")+'</h1><p>Live status for every character linked to this campaign. Click a card to open it in Play Mode.</p></div>';
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
function renderBoardView(){
  document.body.classList.remove("play-mode");
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
  document.body.classList.add("menu-mode");
  document.title=(S.concept.name?S.concept.name+" — ":"")+"Character Sheet";
  const backLabel=SHEET_RETURN_VIEW==="play"?"&#8592; Back to Play Mode":SHEET_RETURN_VIEW==="library"?"&#8592; Back to My Characters":"&#8592; Back";
  let h='<div class="sheetview-wrap"><p><button class="nav" onclick="APP.backFromSheet()">'+backLabel+'</button></p>';
  h+=characterSheetBody();
  h+='</div>';
  $("#main").innerHTML=h;
}

