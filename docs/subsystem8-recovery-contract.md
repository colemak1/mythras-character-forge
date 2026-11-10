# Subsystem 8: campaign recovery and restore contract (C8-LIFE13)

Claude, 2026-11-10, after ChatGPT's closeout review (#265) recorded campaign restore/recovery as **UNACCEPTED**. Code read at `main` 2a8d715. Not a closeout: Subsystem 8 stays **OPEN**, progress **5/8**.

## What the app does today (checked in code)

| Part | Today | Where |
|---|---|---|
| Character saves | Every save goes to the account. The page shows "Saving to account…", "Saved to account" or "Cloud save failed", with a Retry button. A local save failure says "Not saved — export a backup". | `updateSaveStatus()`, `js/cloud.js` |
| Conflicting saves (D-S2) | A save that would overwrite a newer server copy is stopped, with a warning and Reload. | `revision` column and trigger; live PASS in #265 |
| Single character backup | Download one character as `.mythras.json`; Account > Import character backup creates a **new** character (never overwrites, never reuses an id, campaign link cleared). | `exportJSON`, `importCharacterFile`, `js/app.js` |
| Campaign backup (D-S4) | GM downloads one `.campaign.json`: campaign row and rules, GM private state (notes, tracker), members, every character's full state, custom content. Live PASS with populated data in #265. | `buildCampaignBackup()`, `js/cloud.js` |
| Campaign restore | **None.** No control reads a campaign backup. Character import **rejects** the campaign file ("missing character concept"), so the code comment saying its characters "can be imported again" is wrong today. | gap |
| Server-side recovery | Depends on the Supabase project's own backups (plan-dependent). Not verified. | Supabase dashboard |

So the backup is a complete **archive**, but there is no in-app way back from it. C8-LIFE13 says not to promise rollback until it exists; nothing in the UI promises it, but nothing restores either.

## Contract options (owner decision D-S6)

**Owner decided 2026-11-10: option B.** Not yet built; acceptance needs Claude's round-trip test and one Work live round trip.

**A. Archive only.** Document that the campaign backup is a read-only archive. Recovery means: players keep their own characters in their accounts; a lost character is rebuilt by importing a single-character file; campaign rules, GM notes, tracker and homebrew are re-entered by hand from the file. Small code change: character import accepts a campaign backup and lets you pick one character from it (fixes the wrong comment). Work then tests that pick-and-import round trip.

**B. Restore as a new campaign (recommended).** Everything in A, plus a GM control "Restore campaign from backup":
- It always creates a **new** campaign owned by the person restoring; it never overwrites or rolls back an existing campaign or character (no data loss from a stale file, no permission questions about other people's rows).
- Restored: name (marked "restored"), rules settings, home settings, public briefing, GM private notes and tracker, custom content.
- Characters: the GM chooses which to restore; each becomes a **new copy owned by the GM** in the new campaign (players' originals are untouched). Players rejoin with the new invite code and keep using their own characters, or the GM hands a copy over by export and import.
- Members are not recreated: membership needs each player's own sign-in.
- Validation: right `format` and `version`, size limit, and every character state passing the existing import checks; the file is shown as a preview (counts, campaign name, export date) before anything is written.
- No migration expected: it uses the existing create-campaign, GM-state, custom-content and character-save calls. Claude adds tests (round trip: build backup → restore → same rules, GM state, homebrew, character states); Work runs one live round trip.

**C. In-place rollback.** Restore over the existing campaign. Not recommended: it can silently undo other players' newer saves and needs new server permissions.

**Server-side (any option):** ChatGPT (Work) reads, without changing anything, which automatic database backups the Supabase plan provides and records it (no secrets). The contract then says plainly whether an outage beyond the app's own backup is recoverable.

## What stays open regardless

- Independent, differently signed-in GM/player inventory races: **BLOCKED** until Work has isolated sessions.
- Global profile/display-name workflow, full route/phone/header/session checks and the other assignment/save races: **UNACCEPTED**.
- One-to-one reconciliation of every applicable case with dated evidence.
- D-S5: CI database permission tests remain the direct-access evidence; UI samples are not RLS tests.
- Progress stays **5/8**.
