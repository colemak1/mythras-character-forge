# Subsystem 8 remaining live checks — 2026-11-09

**Progress stays 5/8; closeout is not awarded.** Followed `docs/subsystem8-closeout-review-20261109.md` on PR #265's branch after reading current `AGENTS.md` and `HANDOFF.md`. Earlier scoped passes, blockers and the #259 result remain intact. This adds evidence only for the checks below.

## Deployment and method

- Work's internal Chrome, sequential secure sign-ins as disposable accounts C (initial GM) and B (initial outsider, then player and new GM). No credentials/emails recorded in this file.
- GitHub Pages deployment **7674253474** identifies commit **0f83da745f026089406ec8106986a859414edf8b**, environment `github-pages`, status **success** at 2026-11-10T05:18:00Z. Verified through the public deployment/status APIs, rather than assuming repository HEAD was deployed: [deployment](https://api.github.com/repos/colemak1/mythras-character-forge/deployments/7674253474), [status](https://api.github.com/repos/colemak1/mythras-character-forge/deployments/7674253474/statuses).
- Live DOM asset stamps matched that commit's `index.html`: cloud `a06e2a191a`, router `b777658aac`, play `abddc6233c`, app `cfdf388d2e`. This identifies the deployment and corroborates the relevant frontend assets; it does not certify production database schema.
- All Forge actions went through visible app controls/routes. Parsed only app-downloaded backup JSON locally. D-S5 direct-access evidence remains CI; no database API/token/SQL probes or migration changes.

## New results

| Remaining check | Disposition | Observed evidence |
|---|---|---|
| Outsider Party Board route | **PASS, app route** | Before joining, B opened C's known populated board route. It redirected to Home with “That campaign isn't available”; no fixture name, roster, private note or tracker contents were displayed. |
| Outsider character editor and Play routes | **PASS, app routes** | While C's saved character existed and was campaign-linked, B opened its known editor route, then Play route. Both returned to Home; character-unavailable feedback was displayed, without character data or controls. These are UI observations, not new RLS certification. |
| Player visibility of populated GM notes/tracker | **PASS** | After joining, B's board showed the authorized shared character but no GM Tools, private-note marker or NPC. C's private note and tracker had been saved beforehand and survived C's full reload. |
| GM notes/tracker persistence | **PASS** | Private note marker persisted after full board reload. NPC S8 Private Tracker retained Initiative 12 and Head HP 8/10. |
| Populated private-state transfer | **PASS** | C transferred GM to B through Make GM → Confirm. C became a player: public briefing visible, private-note/tracker controls absent from board. Fresh B sign-in exposed the same private note and tracker at 8/10 HP, plus the saved homebrew entry. |
| Non-Reveal item notice | **PASS, arrival on load** | C gave B's character S8 Quiet Gift with Reveal unchecked; Given confirmation appeared. B later loaded its sheet and saw ordinary NEW ITEM / S8 Quiet Gift with OK. OK dismissed it. Full reload did not repeat the notice; Inventory retained S8 Quiet Gift marked GIFT. Does not resolve open-sheet concurrent merge. |
| Populated campaign backup | **PASS, export contents** | App confirmed download with 2 characters. JSON contained members=2, characters=2, customContent=1. GM state contained the exact private-note marker and tracker NPC with Initiative 12 / Head cur=8,max=10. Custom armour S8 Backup Cloth was present. Public briefing marker was in the campaign record. No private backup payload or user IDs committed. |
| Public table notes | **PASS after confirmed save** | Interactive typing and leaving the field produced Saved. The confirmed public briefing appeared in the backup and in C's player view after transfer. Earlier field-fill-plus-navigation had no save acknowledgement and is not counted as persistence evidence. |

## Recovery disposition and preserved limits

- **Campaign recovery/restore: UNACCEPTED; no campaign restore control found.** GM campaign controls exposed Download campaign backup and Delete; Account → Advanced / Backup said “Import a character as a new copy” and offered Import character backup / Load saved characters. These do not establish a campaign restore path. No campaign round trip, overwrite or restore was performed. Export success does not satisfy recovery. Claude should document the supported recovery contract or implement an owner-approved restore path; no exclusion is granted here.
- **Still BLOCKED:** independent simultaneous GM/player gift merge and GM inventory-deletion-versus-stale-player-save conflict. The internal browser used here has one shared authentication session; no second isolated account session was available. Sequential switching does not resolve these cases or assignment/campaign-save races.
- **Still UNACCEPTED:** global outsider profile/display-name UI workflow (no directory/profile route was surfaced), full navigation/phone/header/session reconciliation, remaining race cases and per-case closeout reconciliation. Member display-name samples and D-S5 CI retain their previous scope. No direct-access probes repeated.
- No confirmed application failure established in these completed scenarios. No previously blocked or unaccepted scenario is silently promoted to pass.

## Cleanup

Created only S8 Remainder 20261109, S8 Private C and S8 Notice B, with disposable NPC/homebrew/gift markers. C deleted its own character; subsequent campaign load showed C with 0 characters and only B's character in the party. New GM B deleted the disposable campaign using its name-confirmation form; campaign list retained only B's unrelated existing campaign. B's character survived campaign deletion, then was deleted through its own menu; a full Characters reload showed 0 saved. Signed out and retained public Home. Existing campaigns, site quote and painting were not changed.

**Next: ChatGPT (Chat)** reconciles this evidence with the existing review; Claude handles the recovery contract or any implementation work. Keep concurrent-session blockers and remaining unaccepted scope. Progress **5/8**.
