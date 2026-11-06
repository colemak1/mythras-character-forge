# Play Mode UX audit and redesign proposal

_Claude, 2026-11-06. Status: **awaiting owner approval.** No redesign code until the owner approves the direction._

The full proposal with screenshots and mockups is a private page shared with the owner. This file is the text summary for both assistants.

## Audit (new player, typical Barbarian Warrior, laptop 1440 px and phone 390 px)

| Severity | Finding |
|---|---|
| High | Everything is on screen at once: four columns, ~2,100 px of scrolling on a laptop and ~4,900 px on a phone. |
| High | Roll results land in the Press Log at the bottom right, ~4,000 px below the skills on a phone. |
| High | One attack is spread over four places: weapon card, Actions tab (AP), Press Log (role and opponent result), Special Effects tab. |
| High | The page scrolls sideways: weapon-card dropdowns overflow (1,530 px wide on a 1,440 px screen; 488 px on a 390 px phone). |
| Medium | Special Effects always lists all 43, even after a roll has decided which are allowed. |
| Medium | Reference text and page numbers are mixed into controls (action list, "Core p.N" everywhere). |
| Medium | Inventory, Magic and Notes are hidden in a tab strip under Combat. |
| Medium | Characteristics take a full phone screen before anything used in play. |
| Low | Visual noise: ornamented borders on every box, low-contrast tiny labels, 40+ identical Roll buttons. |
| Low | Weapons in a Combat Style with no weapons listed all show unfamiliar-weapon dropdowns. |

## Principles

1. **The table first:** design for "what can I do now, and what happened?". Reference one tap away.
2. **One place for a roll:** every roll lands in one roll panel (laptop) or bottom sheet (phone), and the follow-ups continue there.
3. **Show what applies:** only affordable actions and allowed effects; one-sentence explanations on hover or tap, page numbers tucked away.
4. **Keep the engine:** same data, rules code and tests; a new layout over existing functions.

## Proposed layout

- **Laptop:** name bar with Edit, Sheet and Improve; a fixed vitals bar (Health with worst wound, AP pips, Initiative, Magic, Luck, Fatigue); three columns: compact characteristics and pinned skills, a tabbed workspace (Combat, Skills, Body, Gear, Magic, Notes), and the roll panel.
- **Combat tab:** weapons with Attack and Parry buttons; AP chips for common actions plus "More…"; Free actions as small chips.
- **Roll panel:** roll and result, opponent result, "You win N Special Effects" with only the allowed effects, then Roll damage; recent history below.
- **Phone:** compact vitals strip, bottom tab bar (Combat, Skills, Body, Gear, More), skill search, and the roll panel as a bottom sheet.

## Build plan (each batch its own PR, checked live before the next)

1. **Frame:** vitals bar, three-column layout, tabs, phone tab bar, no sideways scrolling.
2. **Roll panel:** one panel or sheet for every roll, with history.
3. **Combat flow:** Attack and Parry per weapon; opponent result, allowed effects and damage in the panel; action chips.
4. **Skills and body:** search, pinned skills, compact characteristics, Body tab.
5. **Gear, magic, polish:** tidy tabs, citations into info tips, contrast and spacing in light and dark.

## Questions for the owner

1. Look: keep the Sit'ota parchment-and-amber look but quieter (as mocked up), or go cleaner and more neutral?
2. Default tab: Combat or Skills?
3. Dice: digital rolls with an option to type a physical roll everywhere?
4. Rule help: one-sentence tips with page numbers hidden until opened?
5. Anything else that annoys players at the table?
