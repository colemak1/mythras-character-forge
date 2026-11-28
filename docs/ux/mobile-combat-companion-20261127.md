# Mobile Combat Companion v1 — UX Spec

*Behavior, flow, and hierarchy only; Claude owns CSS/styling/Codex · Stone tokens.*

## Who and why
Mythras players on phones at the table—fast and dense enough for experienced players, with optional inline rule hints so slower learners learn Mythras combat without feeling like the app has training wheels. Keep v1 focused strictly on **Combat + Body (Hit Locations)**.

## Flow
1. On mobile viewports, players can enter the focused **Combat Companion** (from the active character / Play Mode, with a 1-tap toggle back to the full site). Opens directly to their active character with a 1-tap character switcher in the header.
2. **Top Table Bar (always visible):** Action Points (tappable dots + "New Round" refill), Luck Points, Magic Points, Fatigue grade, and a 1-tap **Rule Hints** toggle (On/Off, saved in `localStorage`).
3. **Tab 1 — Combat (default):**
   - 1-tap **Weapon / Loadout switcher** (auto-updates Combat Style %, Reach, Weapon Size, Weapon AP/HP, and Damage + Damage Modifier from the character).
   - 1-tap **Difficulty selector** (Easy, Standard, Hard, Formidable, Herculean) showing the live adjusted % (including Fatigue/wound penalties).
   - **Action row:** Attack, Parry, Evade (each spending 1 AP when tapped, with a gentle warning if at 0 AP).
   - **Dual Dice Mode:** Works seamlessly for both **In-app roll** (1-tap d100) and **Physical dice** (1-tap outcome buttons: Critical / Success / Failure / Fumble), plus opponent's roll grade selector.
   - **Smart Special Effects picker:** Reuses `js/combat-rules.js` (`CombatRules`) to compute exact Special Effect count (0–3) and filter chips to only effects legal for the active weapon/action/grade. Veterans tap a chip in 1 second; learners tap `?` on any chip to expand a 2-line plain-English rule + tactical tip inline.
   - **Damage & Hit Location strip:** Shows weapon damage + DM and 1-tap Hit Location (1d20) roller.
   - **Active Conditions bar:** Quick toggle chips for Prone, Bleeding, Pinned, Impaled, Disabled Limb.
4. **Tab 2 — Body:**
   - Visual **tap-a-zone body map** (Head, Chest, Abdomen, Left/Right Arm, Left/Right Leg) showing current HP / max HP and Armor Points per zone.
   - Tapping any zone opens a quick damage/heal stepper (auto-soaking armor or bypassing armor) that updates character HP live via `js/cloud.js` and flags Minor / Serious / Major Wound status.
5. **Optional phone perk:** Screen-awake ("Keep Screen On") toggle via Wake Lock API when supported.

## On screen
- **Priority order:** (1) Top Table Bar (AP/Luck/MP/Fatigue + Hints toggle), (2) Active Tab content (Combat or Body), (3) Compact 2-tab bottom bar (Combat · Body) plus a quiet "Full Site" exit button.
- **Hidden until asked for:** Special Effect explanations (inside each chip's `?`), character switcher menu, and damage/heal stepper (opens on zone tap).

## States
- **Rule Hints On vs. Off:** When On, shows quiet 1-line contextual nudges (e.g., Weapon Size parry rule, 0 AP warning, Serious Wound Endurance reminder). When Off, hides all nudges for a clean veteran dashboard.
- **No active character / signed out:** Friendly prompt to pick a character or try a sample fighter.
- **Syncing / Offline:** Uses existing `js/cloud.js` autosave + sync status badge; never loses HP/AP changes if connection drops.

## Done when (for ChatGPT Work live check at 390px)
1. Opens on mobile to active character with tappable AP dots, New Round, Luck, MP, Fatigue, and working Rule Hints On/Off toggle.
2. Both in-app rolling and physical-dice outcome taps compute legal Special Effects via `CombatRules`, and tapping `?` on a chip shows its rule inline.
3. Switching weapons updates Combat Style %, Size, Reach, and Damage immediately.
4. Body tab shows all 7 hit locations with Armor and HP; applying damage updates HP, flags Minor/Serious/Major wounds, and persists after reload.
5. Bottom tab bar never collides with the bottom-right feedback button, and "Full Site" cleanly exits back to the normal site.
