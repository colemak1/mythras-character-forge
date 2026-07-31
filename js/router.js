"use strict";
/* ================= ROUTER (hash-based) =================
   Everything the app does -- menus, campaigns, the character builder, Play
   Mode, the printable Sheet -- already flows through one seam: a state
   mutation followed by render() (see render.js). This router hooks into
   exactly that seam instead of bolting on a parallel navigation system:

   - After every render(), syncRouteFromState() recomputes the URL hash the
     *current* state implies (APPVIEW + whatever id it's showing) and writes
     it if it's changed. Every existing APP.* handler therefore gets a
     correct URL for free, with no per-handler changes.
   - On hashchange (back/forward, a pasted link, editing the address bar),
     applyRoute() parses the hash and drives the same loaders the existing
     handlers use (openCharUnified, loadCampaignViewUnified, boardLoad, ...)
     to reach that state, then renders. If the hash already matches what the
     current state would produce, the handler no-ops -- that's how it tells
     "the app just changed this itself" apart from a real navigation, with
     no separate suppression flag to keep in sync.

   Route scheme (deliberately one URL per *major screen*, not per wizard
   step -- see PR description):
     #/                              home / main menu
     #/account                       account / sign in
     #/my-characters                 "My Characters" library
     #/my-campaigns                  "My Campaigns" list
     #/campaign/<id>                 a specific campaign
     #/campaign/<id>/board           that campaign's live Party Board
     #/character/new                 the in-progress, not-yet-identified draft
     #/character/<id>                a specific character in the builder
     #/character/<id>/play           that character in Play Mode
     #/character/<id>/sheet          that character's printable Sheet
*/

function currentRoute(){
  if(APPVIEW==="account")return "/account";
  if(APPVIEW==="library")return "/my-characters";
  if(APPVIEW==="campaigns")return "/my-campaigns";
  if(APPVIEW==="campaign")return CURRENT_CAMPAIGN_ID?"/campaign/"+encodeURIComponent(CURRENT_CAMPAIGN_ID):"/my-campaigns";
  if(APPVIEW==="board")return CURRENT_CAMPAIGN_ID?"/campaign/"+encodeURIComponent(CURRENT_CAMPAIGN_ID)+"/board":"/my-campaigns";
  if(APPVIEW==="character")return S._libId?"/character/"+encodeURIComponent(S._libId):"/character/new";
  if(APPVIEW==="play")return S._libId?"/character/"+encodeURIComponent(S._libId)+"/play":"/character/new";
  if(APPVIEW==="sheet")return S._libId?"/character/"+encodeURIComponent(S._libId)+"/sheet":"/character/new";
  return "/"; // menu
}
function syncRouteFromState(){
  const hash="#"+currentRoute();
  if(location.hash!==hash)location.hash=hash;
}
function parseRoute(hash){
  const path=(hash||"").replace(/^#/,"")||"/";
  let m;
  if(path==="/")return {view:"menu"};
  if(path==="/account")return {view:"account"};
  if(path==="/my-characters")return {view:"library"};
  if(path==="/my-campaigns")return {view:"campaigns"};
  if((m=path.match(/^\/campaign\/([^/]+)\/board$/)))return {view:"board",campaignId:decodeURIComponent(m[1])};
  if((m=path.match(/^\/campaign\/([^/]+)$/)))return {view:"campaign",campaignId:decodeURIComponent(m[1])};
  if(path==="/character/new")return {view:"character",charId:null};
  if((m=path.match(/^\/character\/([^/]+)\/play$/)))return {view:"play",charId:decodeURIComponent(m[1])};
  if((m=path.match(/^\/character\/([^/]+)\/sheet$/)))return {view:"sheet",charId:decodeURIComponent(m[1])};
  if((m=path.match(/^\/character\/([^/]+)$/)))return {view:"character",charId:decodeURIComponent(m[1])};
  return null;
}
// Loads a character by id into S, same normalization every existing opener
// (openCharToPlay/Edit/Sheet) already applies -- except when the id already
// matches what's in memory (S._libId), in which case it's reused as-is.
// That matters for back/forward specifically: Play Mode changes (damage,
// AP...) autosave through the same debounced cloud push as everywhere else
// (see scheduleCloudPush in cloud.js), so re-fetching on every back-navigation
// between, say, Play and the builder for the *same* character could briefly
// clobber an edit that hasn't finished its round trip yet. Re-fetch only
// when the id actually changes.
async function loadCharacterInto(charId){
  if(S._libId&&S._libId===charId)return true;
  const entry=await openCharUnified(charId);
  if(!entry)return false;
  S=Object.assign(freshState(),entry.state);normalizeState();
  S._libId=entry.id;S.campaignId=entry.campaignId;S._ownerId=entry.ownerId;
  S._pendingClaim=(entry.ownerId==="local");
  return true;
}
function redirectHome(msg){
  APPVIEW="menu";render();
  if(msg)alert(msg);
}
async function applyRoute(route,opts){
  opts=opts||{};
  if(!route){redirectHome("That link doesn't match anything in the app.");return;}
  switch(route.view){
    case "menu": APPVIEW="menu";render();break;
    case "account": APPVIEW="account";render();break;
    case "library": APPVIEW="library";LIB_CACHE=null;render();loadLibraryUnified();break;
    case "campaigns": APPVIEW="campaigns";CAMP_CACHE=null;render();loadCampaignsUnified();break;
    case "campaign": {
      CURRENT_CAMPAIGN_ID=route.campaignId;APPVIEW="campaign";CAMPAIGN_VIEW=null;render();
      await loadCampaignViewUnified(route.campaignId);
      // loadCampaignViewUnified already leaves CAMPAIGN_VIEW.campaign null when
      // RLS blocks the row (not a member) or the id doesn't exist -- and
      // campaignDetailHTML() already renders a "Campaign not found" fallback
      // with a way back out for exactly that state, so there's nothing extra
      // to do here; a redirect would just be a second way of saying the same
      // thing less gracefully.
      break;
    }
    case "board": {
      CURRENT_CAMPAIGN_ID=route.campaignId;APPVIEW="board";BOARD_CHARS=null;CAMPAIGN_VIEW=null;render();
      await loadCampaignViewUnified(route.campaignId);
      if(!(CAMPAIGN_VIEW&&CAMPAIGN_VIEW.campaign)){redirectHome("That campaign isn't available — it may not exist, or you may need to sign in.");return;}
      boardLoad(route.campaignId);
      break;
    }
    case "character": {
      if(!route.charId){
        // A fresh cold load has nothing in memory to lose. A warm hashchange
        // (e.g. Back landing here) might: if the in-memory draft is *already*
        // the id-less one this route describes, keep it rather than wiping
        // whatever the player was mid-typing. Anything else (a real id
        // currently loaded, or a truly cold load) starts clean, same as
        // clicking "Create a character" from the Main Menu.
        if(opts.cold||S._libId)S=freshState();
        APPVIEW="character";render();break;
      }
      const ok=await loadCharacterInto(route.charId);
      if(!ok){redirectHome("That character isn't available — it may have been deleted, or you may need to sign in.");return;}
      if(cloudActive()&&S._ownerId!=null&&S._ownerId!==AUTH_USER.id){
        // The Character Builder has no read-only mode -- every field on
        // every step is a live editor. Rather than exposing that to someone
        // who isn't the owner (RLS would reject any write, but the UI would
        // misleadingly let them try), send them to the read-only Play view
        // instead, exactly like clicking a teammate's card on the Party
        // Board already does. Delegate directly rather than bouncing through
        // a second hashchange -- S is already loaded, and going via the hash
        // would hit the play case's "already loaded, nothing to do" fast
        // path and skip the VIEW_ONLY setup below entirely.
        return applyRoute({view:"play",charId:route.charId},opts);
      }
      APPVIEW="character";render();
      break;
    }
    case "play": {
      const ok=await loadCharacterInto(route.charId);
      if(!ok){redirectHome("That character isn't available — it may have been deleted, or you may need to sign in.");return;}
      // Recomputed on every entry, not just when the character actually had
      // to be (re)fetched -- cheap (isDmOfCampaign only ever runs for a
      // genuine other-owner view, never for the owner's own back/forward),
      // and it's what keeps this correct for the redirect above, where S is
      // already loaded before this case ever runs.
      const viewingOther=cloudActive()&&S._ownerId!=null&&S._ownerId!==AUTH_USER.id;
      VIEW_ONLY=viewingOther;
      VIEW_ONLY_IS_DM=viewingOther?await isDmOfCampaign(S.campaignId):false;
      VIEW_ONLY_OWNER_NAME=null; // unknown from a direct link; the banner already falls back to "a teammate"
      if(viewingOther)CURRENT_CAMPAIGN_ID=S.campaignId||CURRENT_CAMPAIGN_ID; // so "Back to Party Board" lands on the right one
      PLAY_RETURN_VIEW="menu";
      APPVIEW="play";XP_OPEN=false;render();
      break;
    }
    case "sheet": {
      const ok=await loadCharacterInto(route.charId);
      if(!ok){redirectHome("That character isn't available — it may have been deleted, or you may need to sign in.");return;}
      SHEET_RETURN_VIEW="library";
      APPVIEW="sheet";render();
      break;
    }
  }
}
window.addEventListener("hashchange",()=>{
  if(location.hash===("#"+currentRoute()))return; // echo of our own syncRouteFromState -- not a real navigation
  applyRoute(parseRoute(location.hash),{cold:false});
});
// Boot sequence, replacing the old unconditional `initAuth();render();`.
// CLOUD_ENABLED sessions restore asynchronously (Supabase reads its saved
// session from localStorage), so a cold load of e.g. #/character/<id>/play
// has to wait for that before deciding whether the signed-in visitor is the
// owner -- otherwise the very first fetch would run as if signed out and
// (depending on how permissive an anonymous read is) either get rejected or,
// worse, show someone else's character for a moment while auth catches up.
async function boot(){
  if(CLOUD_ENABLED){
    try{
      const {data}=await sb.auth.getSession();
      if(data&&data.session)await onSignedIn(data.session.user);
    }catch(e){/* best-effort -- initAuth's own listener still catches a later resolution */}
  }
  initAuth();
  await applyRoute(parseRoute(location.hash),{cold:true});
}
