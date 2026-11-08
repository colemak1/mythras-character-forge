# Subsystem 8 — Campaign and live integration: acceptance inventory (Batch 1)

- **Scope:** campaign creation and rules settings, authentication, membership/invitations, character ownership and assignment, Party Board, GM tools, saving/reloading, import/export, row-level security (RLS) and multi-account live behavior.
- **Source:** inspected current `main` implementation in `js/cloud.js`, `js/app.js`, `js/router.js`, `js/play.js`, `js/render.js` and `index.html`, plus `HANDOFF.md`, `docs/decisions.md`, and `docs/subsystem-plan.md`. This is an **application contract and risk inventory**, **not** a claim that current code, Supabase policies, or deployed site passes. Rulebook references are included **only for actual Core rules**, chiefly characteristic advancement (Core pp.72–73). Most cases are product/security requirements, not Mythras rules.
- **Priority:** **P0** = unauthorized disclosure/write, ownership loss, unconfirmed loss of edits, inaccessible GM campaign; **P1** = session-night correctness and recoverability; **P2** = polish. Priorities attach to groups and examples below; Claude should prioritize every exploitable P0 before feature expansion.
- **Roles:** account A is the GM of campaign Red; B and C are Red player members; D is not a Red member and may belong to unrelated campaign Blue. A and B each own distinct characters; C may view teammates but not edit them. Use two distinct signed-in accounts/tokens and at least two browsers or profiles; **guest/mock mode is not evidence of cloud authorization**. Set up disposable fixtures; do not use players' real characters.
- **Important existing contract:** Red members intentionally can **view** their teammates' Party Board / read-only Play Mode. Nonmembers cannot. The **owner** has general edit rights. The **GM** can view and has only the documented scoped exceptions for editing a player's inventory and unassigning a character; the GM must **not** gain general character UPDATE/DELETE rights. GM Tools/session notes are GM-only. Campaign `dm_id`, membership roles and server-issued auth identity must be checked server-side, not inferred from the browser.
- **Existing owner decisions:** player-triggered dice rolls, lean table companion, Magic and Practice Combat feature work paused; supplementary books are **selection only** unless individually implemented as optional campaign mechanics. Do not convert recording a book choice into silently activating its rules.
- **Conventions:** Column 3 intentionally says **“App/security contract — not a Core rule”** when there is no relevant Mythras rule. The fourth column is a **testable intended result**, not necessarily current behavior. `Decision` scenarios are identified after the tables. A source-verification row is not equivalent to app implementation, server-policy, regression or signed-in evidence. Track these independently.

## A. Campaign creation and rules settings (C8-CFG; P0/P1)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| C8-CFG01 | Signed-in A creates campaign Red with a valid name and rule choice. | App contract — not Core. | Create **one** campaign with `dm_id=A`, its GM membership and saved rules; A can open setup, details and Party Board after reload. |
| C8-CFG02 | A submits Create twice rapidly or retries after a slow response. | App contract — not Core. | Prevent accidental duplicate campaigns and misleading duplicate success. A retry must establish which campaign was created. |
| C8-CFG03 | Campaign insert succeeds but GM membership insert fails. | App contract — not Core. | Surface failure and roll back/repair the incomplete creation; do not leave a campaign whose creator cannot access its own controls. |
| C8-CFG04 | A creates Red and changes its name or campaign notes. | App contract — not Core. | Persist exact validated name/notes across account reload and show updates on authorized clients; failed writes are visibly unsaved. |
| C8-CFG05 | B, C or D sends a direct request to rename Red or edit its notes. | App contract — not Core. | Reject at the server; UI hiding fields alone is insufficient. GM's saved value remains unchanged. |
| C8-CFG06 | A sets **ongoing training** for characteristic improvement. | Core pp.72–73: characteristic training and upkeep is the standard procedure. | Persist the selected campaign rule; linked characters see it in advancement, and unauthorized players cannot change it. |
| C8-CFG07 | A selects the optional **permanent** characteristic increase method. | Core pp.72–73: permanent increases are an alternative procedure with different costs. | Label it **optional**, persist the choice, and enforce the correct method for linked characters without replacing pre-existing advancement history. |
| C8-CFG08 | A edits the advancement method while B has a character/XP panel open. | Core pp.72–73; app integration requirement. | Do not resolve a new improvement with stale rules. Refetch/verify the campaign rule before committing an XP expenditure; preserve the character if rules cannot load. |
| C8-CFG09 | An older campaign has missing/invalid `rules_settings`. | App contract — not Core. | Show an explicit “not configured / GM review” state, not an invented default that silently spends XP under the wrong method. |
| C8-CFG10 | A selects Mythras Companion, Mythic Babylon, Classic Fantasy or M-Space as a campaign book. | App decision: additional book selection alone does not implement that book. | Save/display chosen labels; do **not** activate unimplemented supplemental rules or alter a Core calculation merely because the book is selected. |
| C8-CFG11 | A adds a duplicate or arbitrary book label and reloads. | App contract — not Core. | Persist normalized, bounded, deduplicated labels without executing or treating user input as HTML. |
| C8-CFG12 | B opens Red's details. | App contract — not Core. | Show the shared campaign name/notes, rule method and book selections; do not expose the invite code or GM-only edit controls. |
| C8-CFG13 | B or D directly opens `#/campaign-setup/<Red ID>` or calls the rules update endpoint. | App contract — not Core. | Deny edits on both route and backend; no rule change. D must not obtain Red's private record. |
| C8-CFG14 | A's rules save is rejected (offline, timeout, RLS error). | App contract — not Core. | Report that saving failed and preserve the draft; avoid showing a false “Saved” state or silently replacing remote settings. |
| C8-CFG15 | A updates session tracker state while B changes/loads rules. | App contract — not Core. | Keep `rules_settings` separate from `session_state`; saving one must not overwrite the other. |
| C8-CFG16 | Campaign Red and Blue define different rules or custom content. | App contract — not Core. | Every character uses rules/content for its **current authorized campaign**, with no stale cross-campaign cache bleed. |

## B. Authentication, account isolation and direct routes (C8-AUTH; P0/P1)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| C8-AUTH01 | Anonymous visitor visits characters, campaign, board or creation routes. | App contract — not Core. | Gate account-dependent views before loading protected data; offer sign-in without briefly displaying another account's cached data. |
| C8-AUTH02 | A signs in successfully and reloads a deep link to their own saved character. | App contract — not Core. | Resolve auth session before requesting the character; open the correct row and preserve user context. |
| C8-AUTH03 | A signs out on a browser shared with B. | App contract — not Core. | Clear account-scoped visible state (library, Board, account details and UI caches); no A character or GM notes remain in B's interface. |
| C8-AUTH04 | B signs in directly after A on the same browser. | App contract — not Core. | B sees only B's owned library and authorized campaigns; A's draft is never offered to B for recovery or claimed by B. |
| C8-AUTH05 | A has pending unsaved changes and selects Sign out. | App contract — not Core. | Finish or explicitly fail pending saves before sign-out; if saving fails, keep a recoverable owner-scoped draft and warn rather than silently discarding it. |
| C8-AUTH06 | Password-reset link opens a session on a cold load. | App contract — not Core. | Display recovery form, preserve recovery intent during async auth boot, and do not load or expose unrelated character data. |
| C8-AUTH07 | Signed-in profile is missing a display name. | App contract — not Core. | Permit the owner to complete the profile, then show stable member identity without granting different account permissions. |
| C8-AUTH08 | A changes their display name. | App contract — not Core. | Display name changes only their profile/labels, not user ID, ownership, campaign role, or membership. |
| C8-AUTH09 | B knows a different user's character UUID and pastes a builder URL. | App contract — not Core. | Server permits only authorized reads; if B is a Red member viewing A's Red character, redirect to read-only Play, **not** editable Builder. Otherwise deny without disclosing the sheet. |
| C8-AUTH10 | B pastes a teammate's direct Play link. | App contract — not Core. | Show intended read-only Play with a clear owner/viewing banner; B cannot mutate or auto-save the teammate's state. |
| C8-AUTH11 | D pastes a Red character's Play/Sheet/direct route without Red membership. | App contract — not Core. | Return unavailable/denied (not editable/readable); row ID alone is never a capability token. |
| C8-AUTH12 | B opens their own character from Play, Builder, Sheet and browser Back/Forward. | App contract — not Core. | Restore correct editability on **every** route; read-only mode from a previously viewed teammate does not stick to B's own character. |
| C8-AUTH13 | A follows a saved campaign URL after leaving/losing authorization. | App contract — not Core. | Handle denial as unavailable; do not trust a previous session's cached `CAMPAIGN_VIEW`, roles or Board data. |
| C8-AUTH14 | A switches accounts while async campaign/library queries are in flight. | App contract — not Core. | Ignore responses tied to the previous identity; stale requests cannot overwrite the new account's screen or drafts. |
| C8-AUTH15 | Supabase script/client fails to load or network is down. | App contract — not Core. | Make sign-in/cloud status explicit and avoid silently presenting a disconnected local guest session as a synced real campaign. |
| C8-AUTH16 | Guest/mock session creates a campaign or character. | App contract — not Core. | Clearly label it **local to this browser**; no shared invite/multiplayer promise and no writes to real cloud rows without real authentication. |
| C8-AUTH17 | Auth token expires while editing a saved character. | App contract — not Core. | Do not claim successful cloud save; retain recoverable local draft, prompt reauthentication, then retry under the correct owner's token. |

## C. Invites and campaign membership (C8-INV; P0/P1)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| C8-INV01 | A copies Red's invite link and shares it with B. | App contract — not Core. | Use the same actual `invite_code` accepted by the join endpoint; link points to the current site's `#/join/<code>` route. |
| C8-INV02 | B enters a valid code with lowercase letters, leading/trailing spaces. | App contract — not Core. | Normalize input and join exactly the intended campaign, not an ambiguous partial match. |
| C8-INV03 | B follows a valid invite link while signed out. | App contract — not Core. | Preserve the intended code through sign-in/sign-up and email confirmation; complete join when B is authenticated. |
| C8-INV04 | B follows a valid invite while already signed in. | App contract — not Core. | Add B once as a player member, then open Red; do not create a second campaign or impersonate GM. |
| C8-INV05 | B follows the same invite or submits Join twice. | App contract — not Core. | Membership is idempotent/unique; B remains one member and retains their existing role. |
| C8-INV06 | B submits a random, malformed or deleted campaign invite. | App contract — not Core. | Deny safely with actionable feedback; do not leak campaign details, membership lists or partial auth data. |
| C8-INV07 | B submits a code while the join RPC/network fails. | App contract — not Core. | Show failure and allow retry without claiming membership that was never committed. |
| C8-INV08 | B has a pending invite, then signs into a different account C. | App contract — not Core. | Show/complete join only for the account actually authenticated, never silently create membership for the prior user's identity. |
| C8-INV09 | A shares Red's invite with D, who belongs to Blue. | App contract — not Core. | Joining Red does not remove Blue membership or change Blue's roles/characters. |
| C8-INV10 | A player joins a campaign with no characters. | App contract — not Core. | Show Red on the campaign list and an empty party state; membership does not assign any existing personal character automatically. |
| C8-INV11 | B joins Red and reloads or logs in on another device. | App contract — not Core. | Server membership persists; Red remains available without repeating the invite flow. |
| C8-INV12 | B attempts to read another campaign's invite code via campaigns table/API. | App contract — not Core. | Reject non-GM access to codes if code visibility is GM-only; test the **API response**, not just hidden UI text. Flag schema/RLS changes needed to avoid exposing codes through broad `select('*')`. |
| C8-INV13 | An unauthenticated caller tries `join_campaign` directly. | App contract — not Core. | Require authenticated identity at the server and forbid caller-selected `user_id` or role. |
| C8-INV14 | B joins using a valid invite and supplies forged `role=dm` or `dm_id`. | App contract — not Core. | Ignore/reject the forged privilege; only Red's legitimate GM retains GM rights. |
| C8-INV15 | B joins during concurrent campaign deletion or invite revocation. | App contract — not Core. | End with either a valid joined membership to an existing campaign or an explicit failure; never an orphan membership granting phantom access. |
| C8-INV16 | The group wants invite rotation, member removal, or GM transfer. | **Decision needed; not a Core rule.** | Record whether these are supported. Until implemented, do not imply links can be revoked or GM ownership reassigned. Any future action must revoke access server-side and preserve characters. |

## D. Character ownership, assignments and detachments (C8-OWN; P0)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| C8-OWN01 | B creates/saves their own character. | App contract — not Core. | Server sets `owner_id=B` from the authenticated identity, not from a client field, import or route. |
| C8-OWN02 | B assigns their unassigned character to Red. | App contract — not Core. | Persist exactly one authoritative campaign association, if B is authorized to join Red; Board shows the character after refresh. |
| C8-OWN03 | B tries to assign their character to Blue without Blue membership. | App contract — not Core. | Deny at server; do not trust arbitrary campaign UUIDs submitted by UI or API. |
| C8-OWN04 | A (GM) opens the Red assignment picker. | App contract — not Core. | Show only **A-owned unassigned** characters, not B's or D's private/unassigned library. |
| C8-OWN05 | B or C tries to assign A's or each other's character by calling the endpoint directly. | App contract — not Core. | Reject; ownership and campaign membership checks must both pass at the server. |
| C8-OWN06 | A opens B's character in Red. | App contract — not Core. | A can view it; A does **not** become `owner_id` and cannot make general edits (GM-only inventory exception handled separately). |
| C8-OWN07 | B unassigns their own Red character. | App contract — not Core. | Clear only the campaign association, retain the same character row, content, owner and library availability. |
| C8-OWN08 | A uses GM Unassign on B's Red character. | App contract — not Core. | Use the narrow GM-specific operation to clear only `campaign_id`; **do not** grant general UPDATE or DELETE. |
| C8-OWN09 | A attempts GM Unassign against a character assigned to Blue. | App contract — not Core. | Reject at server because A is not Blue's GM; leave character and campaign association intact. |
| C8-OWN10 | B unassigns a Red character after A has the Party Board open. | App contract — not Core. | Character disappears from Red Board after event/refetch; it remains in B's own library. |
| C8-OWN11 | A unassigns B's character while B has an edit tab open. | App contract — not Core. | B's subsequent ordinary autosave **must not restore** Red's `campaign_id` from stale embedded state. |
| C8-OWN12 | B assigns an already saved character in the Builder selection. | App contract — not Core. | Make a dedicated membership-checked assignment write; a generic character-state save must not pretend to persist assignment. |
| C8-OWN13 | B begins a new campaign character directly from Red. | App contract — not Core. | Save a new B-owned character, linked to Red only after authorized create/assignment; never inherit prior character's ID or owner. |
| C8-OWN14 | B switches the campaign selection while a generic save is pending. | App contract — not Core. | Explicit assignment stays authoritative; delayed generic save cannot reverse it or attach to the wrong campaign. |
| C8-OWN15 | B opens a character whose saved `state.campaignId` conflicts with row `campaign_id`. | App contract — not Core. | Treat the database column as authoritative; reconcile in-memory state without writing the stale embedded value back. |
| C8-OWN16 | B opens another character immediately after a prior save is requested. | App contract — not Core. | Previous save completes against the previous character's row; a late response never assigns its ID or state to the new one. |
| C8-OWN17 | A tries to delete B's character, despite being Red's GM. | App contract — not Core. | Server denies DELETE; only the owner may delete their row. GM unassign is not deletion. |
| C8-OWN18 | B changes a character name, class/career, HP or inventory. | App contract — not Core. | Persist changes to **B's existing row** without transferring `owner_id` or changing `campaign_id`. |
| C8-OWN19 | B tries to alter `owner_id` through a forged save payload. | App contract — not Core. | Reject at the database (RLS/trigger), even when update is sent with B's own valid JWT. |
| C8-OWN20 | Red contains two characters with the same display name. | App contract — not Core. | Ownership, board entries and assignments are keyed by distinct IDs; no wrong-character write by name collision. |

## E. Party Board, GM tools and live observation (C8-BRD; P0/P1)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| C8-BRD01 | A opens Red's Party Board with B's character assigned. | App contract — not Core. | Show only Red-linked characters with current HP, wound severity, AP, Luck, MP, Fatigue and last-update indication. |
| C8-BRD02 | B opens Red's Board. | App contract — not Core. | B may see teammates' **read-only** status and Play sheets; B gets no GM Tools, GM notes or write privileges on teammate state. |
| C8-BRD03 | D opens Red's Board URL or calls its underlying characters API. | App contract — not Core. | Deny nonmember access to Red's characters, status and membership; never rely on a `campaign_id` query filter as authorization. |
| C8-BRD04 | B clicks A's character card, then attempts to change HP, AP, Luck, MP, skills or rolls. | App contract — not Core. | Display an unmistakable read-only state and reject every edit handler and underlying direct write. |
| C8-BRD05 | A clicks B's character card. | App contract — not Core. | Read-only for general character values; allow **only** the documented inventory exception through the scoped GM RPC. |
| C8-BRD06 | A adds an item to B's inventory and B reloads. | App contract — not Core. | Update **only** B's inventory through GM-authorization; preserve B's HP, rolls, XP, owner and campaign association. |
| C8-BRD07 | B or D calls the GM inventory RPC for a character they don't own. | App contract — not Core. | Reject unless the caller is that character's campaign GM and the character is currently in that campaign. |
| C8-BRD08 | GM inventory edit is queued but A switches characters, campaigns or signs out immediately. | App contract — not Core. | Flush or preserve the pending inventory edit with an explicit warning; do not silently drop loot distribution or apply it to a different character. |
| C8-BRD09 | B changes their HP in Play Mode and saves. | App contract — not Core. | Red Board updates from the **same saved character state**; wound severity/HP is calculated identically using shared `charVitals`. |
| C8-BRD10 | B changes AP/Luck/MP or Fatigue. | App contract — not Core. | Show the new values after a completed save/refetch, not stale prior-session values; indicate saving/offline state to users. |
| C8-BRD11 | B's character is unassigned from Red. | App contract — not Core. | Remove it from Red Board even if a filtered realtime event is missed; polling or explicit refresh recovers. |
| C8-BRD12 | Two characters have identical names but different owners/states. | App contract — not Core. | Board cards remain distinct by UUID and show the correct owner/vitals when clicked. |
| C8-BRD13 | An invalid, deleted or inaccessible character is opened from a stale Board card. | App contract — not Core. | Show unavailable/removed state; don't open a different character or leak a deleted character from memory. |
| C8-BRD14 | Realtime subscription disconnects during a game. | App contract — not Core. | Show a degraded/reconnecting state; manual refresh and periodic poll restore authorized values without clearing the board to a false empty party. |
| C8-BRD15 | Red's Board is open when A switches to Blue or signs out. | App contract — not Core. | Unsubscribe/stop old Red channel, timers and fetches; discard late Red results and do not leak Red into the next view. |
| C8-BRD16 | A opens GM Tools and adds PCs/NPCs and session notes. | App contract — not Core. | Only Red's GM may edit `session_state`; persist the tracker/notes separately from character rows and `rules_settings`. |
| C8-BRD17 | B opens GM Tools by manipulating tab state or calling campaign session-state API. | App contract — not Core. | Deny all GM-session writes server-side and never expose GM-only notes in member-facing API payloads. If current shared campaign row leaks private notes, classify a P0 disclosure. |
| C8-BRD18 | A damages B's PC in GM Combat Tracker. | App contract — not Core. | Tracker is explicitly a **GM working copy**; its damage/AP does not silently edit B's real saved sheet. Both views explain the difference. |
| C8-BRD19 | A starts a new combat round or edits NPC initiative while B is watching the Board. | App contract — not Core. | Persist changes in `session_state`, render correct active turn, and refresh authorized views without wiping rules or unrelated notes. |
| C8-BRD20 | A creates a custom weapon, armour material or Folk spell for Red. | App contract — not Core. | Only A can create/delete Red content; Red members can use it in their pickers, Blue/D see none unless separately defined there. |
| C8-BRD21 | B or D calls campaign custom-content create/delete endpoints directly. | App contract — not Core. | Reject unauthorized writes in RLS; player read access, where intended, does not imply create/delete access. |
| C8-BRD22 | A's GM-session edit fails after optimistic rendering. | App contract — not Core. | Display a persistent save error and preserve a recoverable edit; reload may not misleadingly present the optimistic value as committed. |

## F. Autosave, reload, races and failure recovery (C8-SAVE; P0/P1)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| C8-SAVE01 | B edits a character, waits for “Saved to account”, and reloads. | App contract — not Core. | Reopen the identical character and last acknowledged changes; UI “Saved” must correspond to confirmed backend persistence. |
| C8-SAVE02 | B edits a wound/HP or XP value and reloads **within the ~1.5-second debounce**. | App contract — not Core. | Preserve the most recent edit via immediate flush or explicit **owner-only recovery prompt**; never silently revert to stale server state. |
| C8-SAVE03 | B starts a two-turn action and reloads immediately. | App contract — not Core. | Recover progress, or offer draft recovery; no duplicate rolls, charges or lost turn. Prior Magic regression supplies a reusable pattern, but Magic development remains paused. |
| C8-SAVE04 | The save request is in flight when the tab closes or goes hidden. | App contract — not Core. | Attempt immediate flush and retain an owner-scoped pending draft as fallback; browser-aborted request is **not** falsely marked saved. |
| C8-SAVE05 | B accepts a recovery prompt after an unconfirmed save. | App contract — not Core. | Restore the correct local draft and its character ID, then reconcile/persist under B's ownership without duplicating the character. |
| C8-SAVE06 | B declines the recovery prompt. | App contract — not Core. | Open the committed account copy, clear/acknowledge the rejected draft, and do not re-offer it on every reopen. |
| C8-SAVE07 | B switches to a different character while character X is saving. | App contract — not Core. | Save X under X's ID and apply late responses only to X; don't overwrite character Y or claim X's ID for Y. |
| C8-SAVE08 | Two writes to the same character arrive out of order. | App contract — not Core. | Serialize or version them so the latest confirmed state wins; a delayed older write must not roll back a newer edit. |
| C8-SAVE09 | B edits the same character in two tabs/devices concurrently. | App contract — not Core. | Never silently overwrite divergent newer server state. Detect/version conflicts or preserve recovery copies and warn; **conflict policy requires product decision**. |
| C8-SAVE10 | B is offline while editing a cloud character. | App contract — not Core. | Surface unsynced state, retain recoverable local data, and avoid showing “Saved to account” until connectivity and backend acknowledgment return. |
| C8-SAVE11 | Network resumes after several offline changes. | App contract — not Core. | Retry under the same signed-in owner and row; avoid duplicates and unauthorized merge into an outdated account/campaign. |
| C8-SAVE12 | Supabase rejects a write because of RLS, quota, timeout or expired token. | App contract — not Core. | Show an actionable cloud-save failure and a recovery/export option; never swallow the error and display a successful save timestamp. |
| C8-SAVE13 | Browser localStorage is disabled or at quota during autosave. | App contract — not Core. | Warn that local draft was not saved; offer export/backup rather than claiming durable persistence. |
| C8-SAVE14 | B explicitly saves to library while an autosave is pending. | App contract — not Core. | End with one authoritative row containing the latest values; no duplicate new character from overlapping create and update. |
| C8-SAVE15 | A new cloud character has no UUID yet but an old local-format library ID is in its state. | App contract — not Core. | Do not treat a local ID as a cloud row ID; create a new B-owned cloud row with a real UUID and only then acknowledge it. |
| C8-SAVE16 | The server acknowledges an **old** snapshot while B has newer local edits. | App contract — not Core. | Do not clear the newer draft's pending indicator; only acknowledge the snapshot actually committed. |
| C8-SAVE17 | B navigates Play → Builder → Sheet → Play with unflushed changes. | App contract — not Core. | Do not refetch a stale cloud version over the current in-memory edited character; save, retain state, or offer reconciliation. |
| C8-SAVE18 | B changes portrait image, opens a different page, then returns. | App contract — not Core. | Retain the accepted image in the **same character**; avoid overwrite from stale cloud state or mismatched save response. |
| C8-SAVE19 | B's character is unassigned/reassigned by the GM during an in-flight autosave. | App contract — not Core. | Generic autosave changes state fields only and does **not** restore old `campaign_id`; the explicit association change wins. |
| C8-SAVE20 | A updates Red rules and session state concurrently. | App contract — not Core. | Isolate the fields; no last-write-wins replacement of the entire campaign row with stale values. |
| C8-SAVE21 | A signs out while a previous save failed. | App contract — not Core. | Pause sign-out or retain an account-scoped recoverable copy with clear instruction; do not destroy the only version. |
| C8-SAVE22 | B opens cloud library and the fetch fails. | App contract — not Core. | Distinguish “couldn't load” from “no characters”; retain local/current work and offer retry. |
| C8-SAVE23 | B opens campaign list and the fetch fails. | App contract — not Core. | Distinguish service outage from zero campaigns; never clear/misreport Red as deleted. |
| C8-SAVE24 | B reloads a saved imported/legacy character missing newer fields. | App contract — not Core. | Migrate/normalize safely while retaining user-entered fields, ownership, association, wounds, XP and inventory; do not reset an entire nested object because one field was absent. |
| C8-SAVE25 | Background response for A's old account arrives after signing into B. | App contract — not Core. | Ignore stale response by authenticated user, character, campaign and request generation; never render data or update B's state from A's response. |
| C8-SAVE26 | Saved character is deleted while B has it open in another tab. | App contract — not Core. | Do not silently recreate the deleted record through stale autosave; show a conflict/unavailable state and offer an explicit new-copy recovery path if appropriate. |
| C8-SAVE27 | On reload, old saved character state embeds a conflicting owner/identity field. | App contract — not Core. | Trust database ownership, not imported/saved `state._ownerId`; refuse cross-owner writes without overwriting the current library. |
| C8-SAVE28 | Board shows stale data after a missed realtime event. | App contract — not Core. | Explicit Refresh, visibility refetch and bounded polling recover; show last-updated age so stale information is recognizable. |

## G. Character import, export and backup integrity (C8-IMP; P0/P1)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| C8-IMP01 | B exports their own character from the account or character screen. | App contract — not Core. | Produce a valid portable JSON backup containing their complete usable character state, not another user's saved state. |
| C8-IMP02 | B attempts to export a teammate's row from **Advanced / Backup** by passing its UUID. | App contract — not Core. | Reject account-library export unless B owns the row; teammate viewing on Board is not authorization to access owner-only backups. |
| C8-IMP03 | B imports a valid character JSON. | App contract — not Core. | Create **one separate, unassigned character**, owned by B; save it into B's library rather than merely opening the builder. |
| C8-IMP04 | Import JSON contains prior `_libId`, `_ownerId`, `campaignId`, or another account's UUID. | App contract — not Core. | Strip/ignore imported library, ownership and campaign association metadata before saving; never overwrite or take over the source row. |
| C8-IMP05 | B imports the same valid JSON twice intentionally. | App contract — not Core. | Each import is a distinct new B-owned character with its own UUID, clearly distinguishable in the library. |
| C8-IMP06 | B imports malformed JSON or a top-level list/string. | App contract — not Core. | Reject with a clear error, create no row and leave their currently open character unchanged. |
| C8-IMP07 | B imports a guest-library backup through the **single-character** importer. | App contract — not Core. | Reject with guidance to the proper guest-backup workflow; never misinterpret a collection as a character. |
| C8-IMP08 | B imports a character file larger than the supported 2 MB limit. | App contract — not Core. | Reject before parsing/saving and leave existing data unchanged. |
| C8-IMP09 | Guest user imports a backup larger than the guest-library 10 MB limit. | App contract — not Core. | Reject without changing their local library. |
| C8-IMP10 | JSON contains unexpected nested types for characteristics, skill allocation, inventory or magic. | App contract — not Core. | Validate/normalize gracefully; reject dangerous shapes rather than crashing or wiping an open character. |
| C8-IMP11 | JSON includes a fabricated `owner_id` or `campaign_id` alongside valid character data. | App contract — not Core. | Persist only data from allowed character fields, with owner derived from JWT and campaign unassigned. |
| C8-IMP12 | JSON includes HTML/script-like character names, notes or other text. | App contract — not Core. | Escape all user text when rendering cards, Board, sheet, notes and labels; importing never executes scripts. |
| C8-IMP13 | B imports a legacy export lacking newer fields. | App contract — not Core. | Merge defaults without discarding valid saved characteristics, styles, magic, advancement, gear or wound history; preserve round-trip fidelity. |
| C8-IMP14 | B imports a character whose cloud insert fails. | App contract — not Core. | Keep the prior open character untouched and report failure; no misleading success notification or orphaned partially imported copy. |
| C8-IMP15 | B switches accounts while file parsing or import save is pending. | App contract — not Core. | Abort/ignore results tied to the old identity; cannot import as the wrong user or display old data to the new user. |
| C8-IMP16 | Guest exports, clears browser data, and imports on another browser. | App contract — not Core. | Proper backup restores local characters without claiming that guest data was cloud-synced. |
| C8-IMP17 | B exports and re-imports, then reloads. | App contract — not Core. | Character values and history survive round-trip except deliberately stripped identifiers and assignment; deviations are documented. |
| C8-IMP18 | A player deletes a character after exporting it. | App contract — not Core. | Deletion is explicit and owner-validated; a saved portable export remains restorable as a **new** character without resurrecting the old ID. |

## H. Server-enforced permissions and cross-tenant security (C8-SEC; P0)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| C8-SEC01 | Anonymous token queries `campaigns`, `characters` or `campaign_members`. | App/security contract — not Core. | Backend returns no private campaign, character or membership rows. Front-end routing is not a substitute for RLS. |
| C8-SEC02 | D queries `campaigns` with Red's known ID. | App/security contract — not Core. | D cannot fetch the campaign or its private metadata even if UUID is known. |
| C8-SEC03 | D queries `characters` with Red's ID or `campaign_id` filter. | App/security contract — not Core. | No Red character state is returned; unauthorized access is denied by policies. |
| C8-SEC04 | B directly updates or deletes A's character using valid B credentials. | App/security contract — not Core. | Reject both operations at DB level; A's record, XP, HP, inventory, campaign and owner remain unchanged. |
| C8-SEC05 | B is a legitimate Red member and requests A's character. | App/security contract — not Core. | Allow only the intended in-campaign read, not general write/DELETE. The result is read-only in the app. |
| C8-SEC06 | A requests B's character via REST as Red GM. | App/security contract — not Core. | Allow read under campaign policy; ordinary write is still rejected except scoped GM operations. |
| C8-SEC07 | A forges a generic characters UPDATE to set B's HP or owner. | App/security contract — not Core. | Deny general UPDATE regardless of a client's GM UI; `dm_update_character_inventory` is not a blanket update grant. |
| C8-SEC08 | A invokes `dm_update_character_inventory` for B's Red character. | App/security contract — not Core. | Verify current GM role and campaign in RPC; update **only** `state.inventory`, preserve all other state fields and row columns. |
| C8-SEC09 | C or D invokes `dm_update_character_inventory` on B's Red character. | App/security contract — not Core. | Deny and leave all data unchanged. |
| C8-SEC10 | A invokes `dm_unassign_character` against B's Red character. | App/security contract — not Core. | Verify campaign GM, change only `campaign_id` to null and preserve ownership/content. |
| C8-SEC11 | A invokes `dm_unassign_character` for a Blue character. | App/security contract — not Core. | Deny, including if a forged campaign ID or stale role is supplied. |
| C8-SEC12 | C requests or modifies A's session-state/GM notes via direct API. | App/security contract — not Core. | Do not expose GM-private notes to C and deny member UPDATE; separate protected data if current campaign-row SELECT exposes it. |
| C8-SEC13 | B directly updates Red `rules_settings`, `dm_id`, `invite_code` or campaign metadata. | App/security contract — not Core. | Reject unauthorized fields server-side; role escalation cannot be achieved by modifying a record. |
| C8-SEC14 | B inserts a `campaign_members` row with `role=dm`, or changes their row to `dm`. | App/security contract — not Core. | Reject. Member roles and campaign GM identity are established by trusted server paths. |
| C8-SEC15 | D inserts membership into Red without the valid join RPC/code. | App/security contract — not Core. | Reject arbitrary direct membership insert and prevent access to the Board. |
| C8-SEC16 | An authorized user creates custom content for Red. | App/security contract — not Core. | Allow only a Red GM to create/edit/delete; Red members see Red's permitted content, outsiders don't. |
| C8-SEC17 | B reads names/profiles of users unrelated to B's campaigns. | App/security contract — not Core. | Do not disclose private profile fields or unrelated account membership; expose only appropriate public display names for same-campaign members. |
| C8-SEC18 | A views Red's invite code in campaign API responses visible to members. | **Product/privacy decision; no Core rule.** | Decide whether ordinary members may share the code. If **GM-only**, protect the column/API response server-side, not merely by hiding its UI. |
| C8-SEC19 | B's membership is removed or their session loses authorization while Board is open (if removal exists). | App/security contract — not Core. | Subsequent server reads and writes are denied promptly; stale subscriptions/caches must not keep furnishing new private data. |
| C8-SEC20 | A's GM membership row is absent but campaigns row still names A as GM. | App/security contract — not Core. | Flag inconsistent state and provide a safe administrative repair/retry path; never silently transfer DM rights or make A permanently lose access. |
| C8-SEC21 | Backend security-policy migration fails partway through deployment. | App/security contract — not Core. | Deployment/verification identifies missing RLS, triggers or RPC grants; fail closed rather than quietly relaxing owner/member policies. |
| C8-SEC22 | B tries a cross-account write using a modified browser console or direct PostgREST request. | App/security contract — not Core. | All P0 denial tests pass under real user JWTs, without reliance on disabled controls, function guards or mock auth. |

## I. Campaign lifecycle, recovery and GM continuity (C8-LIFE; P0/P1)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| C8-LIFE01 | A creates a campaign and immediately reloads before all initialization completes. | App contract — not Core. | Campaign is accessible to A as GM with membership, or creation clearly failed; no unreachable orphan campaign. |
| C8-LIFE02 | A edits Red notes and immediately navigates away. | App contract — not Core. | Either flush and verify save or show pending/failed status; never quietly discard a session's notes. |
| C8-LIFE03 | B receives an invite while A's campaign creation is still pending. | App contract — not Core. | Link becomes usable only when campaign and GM membership are committed; otherwise actionable retry. |
| C8-LIFE04 | A attempts to delete Red. | App contract — not Core. | Require explicit confirmation and server authorization; linked character **content and ownership survive**, with associations cleared as intended. |
| C8-LIFE05 | B or D sends a direct DELETE for Red. | App contract — not Core. | Deny campaign deletion. |
| C8-LIFE06 | Red deletion completes while B's character is open. | App contract — not Core. | B retains their own character with no Red link; next save cannot resurrect deleted Red or corrupt the character. |
| C8-LIFE07 | Campaign is deleted while a Board/session update is in flight. | App contract — not Core. | Save rejects/invalidates cleanly; do not recreate Red, update wrong campaign, or leave phantom UI. |
| C8-LIFE08 | A leaves the group, loses account access or needs GM transfer. | **Decision needed — app account continuity, not Core.** | Define an authorized recovery/GM-transfer process that preserves campaign, rules and characters. Until supported, do not promise self-service transfer or grant GM powers by invite code. |
| C8-LIFE09 | A signs in after a service outage and sees zero campaigns. | App contract — not Core. | Distinguish an empty list from a load error and preserve access until a successful authoritative read confirms removal. |
| C8-LIFE10 | Campaign has multiple members with the same display name. | App contract — not Core. | Membership uses immutable user IDs, not names; GM rights and assigned-character ownership remain correct. |
| C8-LIFE11 | Red member leaves, is removed or joins another campaign. | App contract — not Core. | Never delete their owned characters merely because membership changes; enforce any current authorization before Board reads. |
| C8-LIFE12 | A reopens Red after editing Blue (same browser). | App contract — not Core. | Restore Red's own rules, Board, notes and custom content; no cross-campaign leakage from cached Blue state. |
| C8-LIFE13 | The group needs a session-night recovery from outage/data corruption. | **Product decision — not Core.** | Establish a recoverable owner/GM backup path and a way to tell last confirmed save from unsynced work; do not promise full campaign export/rollback until implemented. |

## J. Mandatory live / backend acceptance journeys (C8-E2E; P0/P1)

| ID | Given | Core says (p.N) | Expected app behaviour |
|---|---|---|---|
| C8-E2E01 | A creates Red; B and C join via links (one from signed-out state), D stays outside. | App contract — not Core. | A remains GM; B/C get member roles and persistent membership; D sees nothing about Red through UI or REST. |
| C8-E2E02 | B creates character X, assigns to Red, reloads on a different device. | App contract — not Core. | Same X UUID, B owner, Red association, full data and Board entry on A's session. |
| C8-E2E03 | C opens X from Red Board and attempts UI/direct API edits. | App contract — not Core. | C can read per party policy but cannot change X; negative API test records denied response and unchanged row. |
| C8-E2E04 | A opens X, edits only its inventory, then tries HP/XP/owner changes. | App contract — not Core. | Inventory RPC succeeds; all general writes are denied; B sees correct item and unchanged noninventory data. |
| C8-E2E05 | A unassigns X while B has it open and autosaving. | App contract — not Core. | X disappears from Red Board, remains B-owned and unassigned after reload, with no stale autosave reassignment. |
| C8-E2E06 | B spends XP/changes HP and refreshes within the 1.5-second save window. | App contract — not Core. | Exact edit survives or owner receives a recovery choice; no false Saved indicator or cross-owner recovery. |
| C8-E2E07 | A edits campaign rules, NPC tracker and private notes; B reloads their linked character. | Core pp.72–73 for improvement method; otherwise app contract. | B sees correct rule selection, not private GM notes; tracker and rules remain independent; unauthorized rule change fails. |
| C8-E2E08 | B imports an exported X while logged into their account. | App contract — not Core. | Creates new unassigned B-owned copy with new UUID; no takeover of original X or another owner's row. |
| C8-E2E09 | Force network failure while editing Red, then restore network and sign out/in. | App contract — not Core. | Clear not-saved warning, local recovery or retried commit; no silent lost work or inaccessible campaign. |
| C8-E2E10 | Simulate two simultaneous tabs editing the same character and campaign. | App contract — not Core. | Reproducible handling of conflicts/races; no silent rollback or cross-entity write. Record unresolved policy as a **Decision**, not Pass. |
| C8-E2E11 | Try every sensitive row/RPC with A/B/C/D JWTs instead of only buttons. | App contract — not Core. | Record allow/deny matrix per endpoint, response status, before/after rows and deployed migration version. Any unauthorized read/write blocks release. |

## Mapping, decisions and evidence requirements

**Do not mark 8/8 or claim Subsystem 8 complete from this inventory.** For each ID record `Pass`, `Guidance`, `GM-assisted`, `Not implemented`, or `Decision`, alongside (1) exact implementation path, (2) automated test name/fixture, (3) observed backend/RLS permission result where relevant, (4) signed-in live result and deployed commit, and (5) any exception. Do not mark a **P0 server permission** as passing from a UI-only or mocked test. Use throwaway accounts and characters; avoid destructive tests on real campaign data.

**Permission matrix to implement/test:**

| Operation | GM A | Player B (owns X) | Member C (does not own X) | Outsider D |
|---|---|---|---|---|
| Read Red details/Party Board/X | Yes | Yes | Yes | **No** |
| Edit Red campaign settings/GM notes | Yes | **No** | **No** | **No** |
| Edit arbitrary fields on X | **No** (except scoped inventory) | Yes | **No** | **No** |
| Update X inventory using GM RPC | Yes | **No** (use owner path) | **No** | **No** |
| GM-unassign X through RPC | Yes | **No** (use owner path) | **No** | **No** |
| Delete X | **No** | Yes | **No** | **No** |
| Create/delete Red homebrew | Yes | **No** | **No** | **No** |
| Create member with GM role | **No** via invite | **No** | **No** | **No** |

**Decisions to surface rather than quietly implement:** (1) whether in-campaign members may read invite codes and pass them along; (2) whether member removal, invite rotation and GM transfer are MVP requirements; (3) multi-tab/device edit conflict strategy (reject stale writes vs explicit merge/recovery); (4) whether campaign-wide export/restore is needed for session-night disaster recovery; (5) extent of GM's player-character edit privileges beyond the already approved **inventory-only** exception. **Default until owner decides:** retain existing restrictive permissions, no privilege expansion, no invented data-sharing or auto-merge.

**Highest-risk handoff to Claude:** `js/cloud.js` authentication, Supabase RLS/RPCs, `cloudUpsertCharacter` exclusion of ownership/assignment from routine saves, `scheduleCloudPush`/`flushCloudSaves`/draft recovery, Party Board realtime and DM inventory push; `js/router.js` cold boot/deep links; `js/app.js` character assignment/import/GM controls. Confirm deployed migrations and actual policies separately; comments in JS are design intent, not proof of database enforcement. Prioritize deny-by-default RLS and lost-save races before any new campaign features.
## App status (Claude, 2026-11-06)

Mapped against the code and against the security rules in `supabase/migrations/`. **Limit:** the repo only holds two migrations, and the base tables, the helper functions `is_campaign_member` / `is_campaign_dm`, the `characters_before_update` trigger and the "row-level security is on" switches live only in the production database. Everything marked **Pass (policy)** is proven by the SQL in the repo; it still needs one live multi-account check, because Claude can't reach the production database. Status key as in the other case files, plus **Live** = needs the multi-account check below.

### Security review findings

| # | Finding | Cases | Severity | State |
|---|---|---|---|---|
| S1 | **GM session notes and Combat Tracker NPCs were readable by every campaign member.** They lived in `campaigns.session_state`, and `campaigns_select_member` lets members read the whole campaign row. Every player's browser downloaded them whenever they opened the campaign. | SEC12, BRD17, E2E07 | High (spoilers, "secrets" box) | **Fixed in code + migration** `20261106120000_…`: new GM-only `campaign_gm_state` table, existing data copied, old column cleared and blocked. Takes effect once the owner runs the SQL. |
| S2 | A player could move their own character into **any** campaign by a direct request (no membership check on `campaign_id`). The character then shows on that campaign's Party Board. | OWN03, SEC22 | Medium | **Fixed in migration:** a trigger refuses a new or changed `campaign_id` unless the owner is a member or GM. Unchanged assignments aren't re-checked. |
| S3 | The GM inventory RPC accepted any JSON, not just a list. | BRD07, SEC08 | Low | **Fixed in migration.** |
| S4 | A GM's inventory edits (other than "Give an item") can still be overwritten by the player's open sheet saving its whole state. | BRD06, SAVE19 | Medium | Gifts fixed in PR #128. **Fixed (D-S2)** in migration `20261108120000_…`: a character revision; the player sheet won't overwrite a newer GM edit, and the GM's push won't overwrite a changed inventory. Gifts still merge quietly. Live. |
| S5 | Two tabs or devices editing the same character: last save wins, with no warning. | SAVE09, E2E10 | Medium | **Fixed (D-S2):** a stale tab or device is stopped, warned, and offered "Download my version" and "Reload latest". Live. |
| S6 | Any signed-in user can read every profile's display name. | SEC17 | Low | **Decision** (D-S3). Only display names are stored. |
| S7 | Members can read the campaign's invite code. | INV12, SEC18 | Low | **Decided (D-S1):** members keep seeing the code; the GM's "New code" replaces it. Live. |

Verified by running the new migration on Postgres 16 (PGlite) with stand-ins for Supabase's `auth.uid()` and helper functions: it runs and re-runs cleanly, copies the existing session state, blocks writes to the old column, refuses an assignment to a campaign the owner isn't in, still allows a former member's saves, refuses a non-list or non-GM inventory call, and only the campaign's own GM can read its GM row.

### Status by case

| Cases | Status | Notes |
|---|---|---|
| CFG01–CFG04, CFG06–CFG12, CFG14, CFG16 | **Pass (code)** | Campaign create, rename, notes, rules settings with validation, books list, player read-only view; failures are shown inline. Rules tests in `campaign-setup.cjs`. |
| CFG05, CFG13 | **Pass (policy) + Live** | `campaigns_update_dm`: only the GM can update the campaign row. |
| CFG15, SAVE20 | **Pass (code)** | Rules and session state are separate writes; after S1 they're in separate tables. |
| AUTH01–AUTH04, AUTH09–AUTH12, AUTH16 | **Pass (code)** | Signed-out deep links go to Account; another owner's character opens read-only in Play; autosave is per account (`unified-routes.cjs`). |
| AUTH11, SEC01–SEC03 | **Pass (policy) + Live** | All policies are `to authenticated`; outsiders get no campaign or character rows. |
| AUTH05, AUTH17, SAVE12, SAVE21 | **Pass (code)** | Pending or failed saves block sign-out with a warning; failures show "Cloud save failed" with Retry and export. |
| AUTH06–AUTH08, AUTH13–AUTH15 | **Pass (code) / Live** | Recovery link, profile name, stale links, account switch mid-request (owner checks before applying responses), Supabase unavailable. |
| INV01–INV11 | **Pass (code) + Live** | Join RPC trims and upper-cases codes, ignores repeat joins, survives sign-in and email confirmation via a stashed code. |
| INV13–INV15, SEC14, SEC15 | **Pass (policy) + Live** | `join_campaign` requires sign-in and always inserts `role='player'`; the only insert policy is a GM adding themselves as GM; there is no update policy on memberships. |
| INV16, LIFE08, LIFE11, LIFE13 | **Pass (code) + Live** | D-S1/D-S4: `rotate_campaign_invite`, `dm_remove_member` (characters unassigned, never deleted), `dm_transfer_campaign` (old GM stays as a player), and a whole-campaign backup file. `campaign-continuity.cjs`. |
| OWN01, OWN02, OWN07, OWN12, OWN13, OWN18, OWN20 | **Pass (code)** | |
| OWN03 | **Fixed (S2)** + Live | |
| OWN04–OWN06, OWN08–OWN11 | **Pass (policy) + Live** | Owner-only writes; `dm_unassign_character` checks the caller is that campaign's GM; campaign_id is never written by background saves. |
| OWN14–OWN16, OWN19, SAVE15, SAVE27 | **Pass (code)** | Per-character save queue; responses can't assign an ID to the wrong character; owner_id never sent on update, and `with check (owner_id = auth.uid())` blocks it server-side. |
| OWN17, SEC04, SEC07 | **Pass (policy) + Live** | Only `characters_all_owner` allows writes. |
| BRD01–BRD05, BRD09–BRD15, BRD18–BRD20, BRD22 | **Pass (code)** | Board, read-only teammate view, realtime with polling fallback and stale-card handling. |
| BRD06, BRD08 | **Pass (code)**, see S4 | GM inventory push is debounced and scoped. |
| BRD07, SEC08, SEC09 | **Pass (policy) + fixed (S3)** + Live | |
| BRD16, BRD17, SEC12 | **Fixed (S1)** + Live | |
| BRD21, SEC16 | **Pass (policy) + Live** | Custom content: GM-only insert, update and delete; members read. |
| SAVE01–SAVE06 | **Pass** | Reload fix, recovery prompt and decline (PR #110; live evidence in `magic-subsystem-cases.md`). |
| SAVE07, SAVE08, SAVE14, SAVE16, SAVE17, SAVE18 | **Pass** | Save queue, old acknowledgement can't clear newer draft, flush before reopening (`unified-routes.cjs`). |
| SAVE09 | **Pass (code) + Live** (S5) | Revision check, `campaign-continuity.cjs`. |
| SAVE10, SAVE11, SAVE13, SAVE22–SAVE26, SAVE28 | **Pass (code)** | Offline retry on reconnect, storage errors surfaced, load failures don't delete data, legacy fields normalised. |
| SAVE19 | See S4 | |
| IMP01, IMP03–IMP18 | **Pass (code)** | Import refuses non-objects, library backups in the single importer, oversize files; strips IDs and owner/campaign fields; text is escaped on render (`unified-routes.cjs`). |
| IMP02 | **Pass (policy) + Live** | Export reads only rows RLS returns. |
| SEC05, SEC06, SEC10, SEC11, SEC13 | **Pass (policy) + Live** | |
| SEC17, SEC18 | **Decision** (S6, S7) | |
| SEC19, SEC20 | **Pass (policy) + Live** | GM status comes from `campaigns.dm_id`, not the membership row, so a missing GM membership row doesn't lock the GM out. |
| SEC21 | **Pass (design)** | Both migrations run in one transaction. |
| SEC22 | **Live** | The core multi-account test. |
| LIFE01–LIFE07, LIFE09, LIFE10, LIFE12 | **Pass (code) + Live** | Deleting a campaign is GM-only; characters are unassigned, not deleted (`on delete set null`, to confirm live). |
| E2E01–E2E11 | **Live** | ChatGPT (Work) journeys with disposable accounts. |

### Decisions for the owner

**Answered 2026-11-07 (owner):** D-S1 visible + GM "New code" button; D-S2 warn and reload; D-S4 all three (remove member, transfer GM, download backup). D-S3 still open. See `decisions.md`.

- **D-S1 Invites:** keep invite codes visible to members, and add a "new code" button for the GM?
- **D-S2 Conflicting edits:** when the GM edits a player's inventory, or one character is open in two tabs, should the later save win (today), or should the app warn and reload?
- **D-S3 Profiles:** fine for any signed-in user to see display names?
- **D-S4 GM continuity:** add member removal, GM transfer, and a "download the whole campaign" backup?

### Live multi-account check (ChatGPT Work), after the owner runs the migration

Use disposable accounts: **A** (GM of campaign Red), **B** and **C** (Red players), **D** (outsider, GM of Blue). For each, make direct requests with that user's own token, as well as using the UI:
1. As C and D, read Red's `campaign_gm_state` row → nothing. As A → the row.
2. As B, read `campaigns` for Red → `session_state` is null.
3. As B, set your character's `campaign_id` to Blue → refused. To Red → allowed.
4. As C and D, call `dm_update_character_inventory` and `dm_unassign_character` on B's character → refused. As A → allowed; with a non-list inventory → refused.
5. As C and D, update or delete B's character → no rows changed.
6. As D, read Red's campaign, members and characters → nothing.
7. As A, edit Combat Tracker and session notes, reload → still there; open from a second tab → live update.
8. (D-S1, after migration `20261108120000_…`) As A, press New code on Red → the old code and old `#/join/` link are refused for a new account; the new one works. As B, the code is visible but there is no New code button; calling `rotate_campaign_invite` directly is refused.
9. (D-S2) As B, open the same character in two tabs; change HP in tab 1, then in tab 2 → tab 2 shows the conflict warning, the account copy keeps tab 1's change; Reload latest shows it. As A, give B an item while B's sheet is open → B's next save keeps it with no warning. As A, delete an item from B's inventory while B's sheet is open; B changes HP → B gets the warning, the deletion stands.
10. (D-S4) As A, Download campaign backup → one JSON file with the campaign, GM notes, members, characters and homebrew. As A, Remove C → C's characters leave the board but remain in C's library; C can't read Red. As A, Make GM B → B sees GM tools and notes; A becomes a player. As C or D, call `dm_remove_member` / `dm_transfer_campaign` directly → refused.
