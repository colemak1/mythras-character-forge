# The Pits UI live acceptance — 2026-11-07

Owner-only browser session on the deployed GitHub Pages site, after PRs #193–#195. UI acceptance only: **no rules verdicts**. Main Play Mode Combat remains **CLOSED**, overall progress **5/8**.

## Environment and evidence limits

- Read `AGENTS.md`, `HANDOFF.md` and `docs/subsystem-plan.md` first. Source checkout: `9ad433b` (#195).
- Signed in as owner Colemak. Used the guest Guided Tutorial, then the existing character Goat through the signed-in picker. No accounts, characters or campaigns created or deleted; no saved-character combat controls edited. Basalt was selected as requested and left selected. Sound was returned to off. The completed Goat gauntlet left a local-only leaderboard entry, 1 win.
- **Actual viewport: 1363 × 936 CSS pixels**, not the requested 1280/390. The browser API exposes no resize control. Native responsive DevTools displayed “DevTools not allowed on this page” / “Your organization has blocked the use of DevTools on this page”; ordinary window-resize shortcuts did not change the measured viewport. No restriction was bypassed. **Both exact-width checks remain BLOCKED**, not passed or failed app behavior. Screenshots are full-page browser captures, not phone simulations.
- Sound controls are observable, but this browser interface provides no audio playback observation. Hearing a hit tone remains **UNVERIFIED**.

Live asset stamps matched the local #195 file hashes:

| Asset | Live `?v=` |
|---|---|
| `experiments/pits-view.js` | `e7a97bccb2` |
| `experiments/pits-game.js` | `e255c0e542` |
| `experiments/pits-stone.css` | `e8897af5e1` |
| `play-stone.css` | `b4948b6ec4` |
| `experiments/practice-combat-ux.css` | `bda12b759c` |
| `experiments/practice-character.js` | `19ba1929b4` |
| `experiments/practice-guidance.js` | `3bb978cd88` |
| `js/data.js` | `ea343c2e36` |

## Requested checks

| Check | Result | Live observation |
|---|---|---|
| 1a. The Pits → Fight without a character; desktop layout | **PASS at 1363px only** | Left player, middle strip/prompt/dice, right foe; chronicle spans the full arena width. Stone visual structure is present. No supplied mockup artifact was independently pixel-compared. [Layout](evidence/pits-ui-20261107/pits-ui-desktop.jpg). |
| 1b. Phone ordering and exact 1280px | **BLOCKED** | Could not establish either requested viewport. No phone acceptance claimed. |
| 1c. Play Mode Settings → Basalt, reload The Pits | **PASS inheritance; FAIL readability** | Changed Pops's device colour setting from Verdigris to Basalt, returned to The Pits, and reloaded. Dark scheme persisted; rendered body classes included `pm-cw-basalt`. Setup secondary copy and leaderboard heading are extremely dim (PUI-F01). [Setup](evidence/pits-ui-20261107/pits-ui-basalt.jpg); [fight](evidence/pits-ui-20261107/pits-ui-real-character.jpg). |
| 2a. Phase pill | **PASS for observed phases; partial coverage** | Observed Your turn, Defend, Special Effects, Resist, Roll and terminal Bout over/Won. Human resistance prompt: Oppose Standing. A distinct settled Opponent pill was not captured. Playback timing issue PUI-F02 below. |
| 2b. Disabled reasons and Delay | **PASS** | Expanded More actions: Change Range says “No reach to contest”; Regain Footing says “Not prone”. Delay badge says “Holds 1 AP”. [Actions](evidence/pits-ui-20261107/pits-ui-actions.jpg). |
| 3a. Odds preview on focus | **PASS** | Attack focused: 67% succeed / 7% critical / 2% fumble. Parry: same. Tab from Parry to Evade changed preview to 46% / 5% / 2%. Imported Goat Attack showed 95% succeed / 10% critical / 2% fumble at displayed 100% target. Numbers recorded as rendered, not a fresh rules adjudication. |
| 3b. Last roll under dice | **PASS settled; FAIL playback alignment** | Marker, d100 and verdict rendered: e.g. Parry 13/67 Success and Oppose Standing 72/53 Failure. While earlier dice/playback were still running, the bar could already show a later AI result (PUI-F02). |
| 4. Hit feel, scores, Mark toast, recap | **PASS at observed desktop width** | On Goat's 11-HP right-leg hit, captured floating −11, highlighted leg and Mark toast. At that instant the live DOM also had one `.pits-shake`, one `.pits-flash` and visible `.pits-dmg`. Toast: Serious Business, +20 Glory. Glory increased to 163, Momentum Warming, Marks 3/7. Guest bout also increased Glory/Momentum/Marks. Marks opened recap mid-bout; Back to the fight returned to actions. Score bar explicitly says these features never change a roll. [Hit feedback and toast](evidence/pits-ui-20261107/pits-ui-feedback.jpg). |
| 5a. Sound | **PASS default/toggle; hearing UNVERIFIED** | First guest bout started Sound off. Toggled on; control showed Sound on. Returned it to off before leaving. Cannot certify audible tone. |
| 5b. Victory window then recap | **PASS eventual controls; FAIL transition order** | Natural guest tutorial win produced Stone VICTORY window with finishing injury, then View battlefield exposed final recap: hits 1/3, damage 9, damage taken 0, best streak ×1, four Marks, Glory 186. However recap appeared **before** damage playback and victory window, initially showing 0 damage and “No blood drawn yet” (PUI-F02). [Victory](evidence/pits-ui-20261107/pits-ui-victory.jpg); [final recap](evidence/pits-ui-20261107/pits-ui-recap.jpg); [premature recap](evidence/pits-ui-20261107/pits-ui-hit.jpg). |
| 6. Bring a real character and start | **PASS** | Picker loaded the owner's saved characters. Pops correctly could not start without a supported owned style weapon. Chose Goat instead, Broadsword / style 100%, 4 AP; Enter training grounds → Begin fight reached initiative. Played that practice copy through a win, then exited to setup. [Imported fight](evidence/pits-ui-20261107/pits-ui-real-character.jpg). |

## Failures for Claude

### PUI-F01 — Basalt setup text is too dim

Given Basalt selected in Play Mode → reload The Pits → inspect Choose your challenge, the explanatory paragraphs, practice-fighter summary, mode descriptions and leaderboard heading have very weak contrast against the charcoal surfaces. Some headings are nearly invisible. Expected: readable secondary text throughout the inherited dark scheme. This is a visual acceptance failure, not a claim that scheme persistence failed. The fight screen is substantially more legible.

### PUI-F02 — live state gets ahead of the visible playback

Given standard pace and natural rolls:

1. Immediately after the guest initiative roll, the middle still displayed Kethan Voss rolling initiative, but the phase pill already said Defend and Last roll already revealed the later foe Attack 92/45 Failure.
2. On the first guest damaging hit, the strip switched to Bout over and inserted the end recap while Damage · Head was still rolling. Initial recap said 0 damage / No blood drawn yet, then changed to 9 damage before the victory window appeared. Screenshot `pits-ui-hit.jpg` captures the premature recap and damage dice together.
3. The imported fight similarly showed Won/recap while its damage exchange was being presented. Its Last roll already showed the foe Endurance 93/53 Failure while the displayed tray was resolving damage.

Expected: phase pill, Last roll and end recap should follow the exchange currently being shown; present victory before the terminal recap, as requested. No conclusion about underlying roll correctness is made. These are one presentation-synchronization issue with several symptoms, not a reopening of Subsystem 5.

## Natural-roll evidence

- Guest tutorial: initiative d10 4 + 11 = 15; foe d10 6 + 12 = 18. Foe Attack 92/45 Failure; player Parry 13/67 Success → Trip; foe Trip resistance 79/49 Failure. Player attacks 81 and another failure, then **1/67 Critical**; foe prone Parry **29/23 Failure**. Chose Head + Maximise Damage; damage **9**, head **5 → −4**. Foe Endurance **47/53 Success**, but rendered result failed the differential resistance against the Critical and ended the bout. This paragraph records the UI, not a rule verdict.
- Imported Goat: initiative totals **19 vs 18**. Attack **2/100 Critical**, foe Parry **21/46 Success**. Chose Circumvent Parry; location **d20 2, Right Leg**; damage **d8 8 + d4 3 = 11**, foe leg **5 → −6**. Foe Endurance **93/53 Failure**; Stone victory and 1-win local streak.
- All dice were rolled through the normal UI; no seeded rolls, state edits or developer hooks were used.

## Closeout

**Partial acceptance; not an all-pass.** Desktop core controls, hit feel, score/Marks recap, eventual victory, theme inheritance and real-character entry passed at 1363px. Fix PUI-F01/PUI-F02; exact 1280px and 390px plus audible sound still need acceptance in a suitable browser. The distinct Opponent pill also needs a settled-phase observation. No production code changed. All **41** repository test scripts passed; `git diff --check` passed. Automated passes do not substitute for the blocked live checks.

## Batched live follow-up after #209

See [2026-11-07 batched live results](live-batch-pr209-20261107.md) for Pits follow-up: partial observations and explicit blocked/outstanding checks. No additional live/backend pass or subsystem closure is claimed.
