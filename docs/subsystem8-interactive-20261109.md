# Subsystem 8 interactive-browser checkpoint — 2026-11-09

Target: https://colemak1.github.io/mythras-character-forge/

Read `AGENTS.md`, `HANDOFF.md`, PR #262 and `docs/subsystem-8-closeout-20261109.md` before testing. Work's connected Chrome interactive browser is available: claimed the existing Forge Home tab and successfully opened Account through its visible navigation. Home showed Sign in; Account showed the Email/Password sign-in form. No authenticated identity or disposable account session was available. Left Account open for the owner to sign in; no credentials requested in chat.

D-S5: CI database permission tests are accepted evidence for direct-access steps. No direct API, SQL, token or RLS probes were performed, and no migration was reinstalled. Repository HEAD at preparation: `0f83da745f026089406ec8106986a859414edf8b`; the deployed commit was not independently established.

| Requested app check | Result | Remaining observation |
|---|---|---|
| New code | BLOCKED — signed out | GM confirms rotation; outsider cannot join with old code/link and can join with new code; reload persists membership. |
| Remove | BLOCKED — signed out | Confirmation; removed member loses campaign access, retains owned unassigned character. |
| Make GM | BLOCKED — signed out | Confirmation; new GM gets tools/notes, previous GM becomes player; reload persists roles. |
| Save conflicts | BLOCKED — signed out | Two stale character tabs; warning, latest copy protected, Reload latest works; GM inventory deletion also protected. |
| Gifts | BLOCKED — signed out | GM gift arrives while recipient sheet is open; next save/reload preserves gift and ownership without a conflict. |
| New-item pop-up | BLOCKED — signed out | Recipient sees arrival, handles it, and notification does not repeat indefinitely on reload. |
| Outsider privacy | BLOCKED — signed out | Distinct signed-in nonmember sees permitted display names without private campaign/character/member data through app. CI supplies direct-access evidence. |
| Backup download | BLOCKED — signed out | GM UI downloads JSON with expected disposable campaign, notes, members, characters and homebrew. |
| #259 site-admin default painting | BLOCKED — signed out | Admin types quote/attribution, selects Use the default painting, verifies draft retained, Saves and reloads to confirm persistence. |

Result: 0 new live passes, 0 observed failures, 9 authentication blockers. Interactive browser capability is established; the earlier read-only limitation in PR #262 does not apply to this Work attempt. No app data, fixtures, site quote or painting changed. No secrets or emails recorded. Resume in this browser after sign-in; use disposable accounts/fixtures and remove fixtures after execution. Subsystem 8 remains OPEN; progress stays **5/8**.

## Internal-browser continuation

Owner requested the internal browser. Opened Forge in Work's cloud Chrome and used the secure credential form. Sign-in was submitted and fresh Account UI positively showed **Test Account D** and **Signed in and synced**. No credential values were exposed to the assistant or recorded here.

Partial observations: D's Campaign page showed **No campaigns yet**, with New campaign and Join controls. D's Account page showed profile, settings and Advanced / Backup, with no site-admin panel. These do not establish full outsider privacy against a known campaign or the #259 admin regression.

Signed D out to switch to the disposable GM account. The next secure credential request was declined; respected that response and stopped sign-in. Internal Account tab retained for continuation. No campaigns, characters, quote or painting changed. All nine requested scenarios remain BLOCKED/incomplete, with the partial signed-in observations above; no new full acceptance passes or observed app failures. Progress **5/8**.
