# Subsystem 4 final focused live acceptance

Owner-only live session, 2026-11-06 (Los Angeles). Read HANDOFF first; followed the closeout gate in PR #165. No accounts created and no production code changed. This is observed live evidence, not a fresh source audit.

## Deployment and fixtures

Observed assets: `play.js?v=74f8277601`, `app.js?v=56de852493` (the pre-Stone layout). Later updates on main were not part of this live pass.

Owner: Colemak. Created exactly one disposable campaign, **Disposable S4 Final Campaign**, with optional **1d6+1** skill improvement, and one assigned **Disposable S4 Final Character**. No additional books. Human: STR/CON/SIZ/POW/CHA 12, DEX/INT 16; Healing Rate 2, Luck maximum 2. Test Loyalty started at 1% by explicit builder input.

## Results

| Check | Result | Observed evidence |
|---|---|---|
| (g) Campaign option and Experience Roll | **PASS** | Saved campaign page said skill improvement **1d6+1 (optional)**. Improve skills instruction explicitly showed **+1d6+1% (campaign option, Core p.72)**. Awarded 3 rolls. Natural Willpower ER **66 + INT 16 = 82**, versus 24%, gained **+6**, ending **30%**, within 2–7. Pool 3→2. The formula appears in the instructions; the individual history line shows the gain, not a repeated formula. |
| (g) Passion helper and floor | **PASS** | Weak option labelled **1d10**. Deepen changed Test Loyalty 1→2 (+1). Wane changed 2→0 (−2); another wane stayed 0 (applied change 0). Helper did not spend ERs. Raw wane dice are not exposed, so these are observed applied changes rather than invented raw rolls. |
| (g) Reload | **PASS** | Immediate reload offered same-owner unsynced-draft recovery; accepted it. Willpower 30%, Test Loyalty 0 and pool 2 survived. Final navigation to Characters and account reopen also retained these values. |
| (h) Maiming maximum and reload | **PASS** | Right Arm began 4/4. Opened Permanent injury: location maximum; manually chose the displayed **1→2 HP** maiming-table outcome and ticked GM confirmation. Set maximum produced **2/2**, while the other arm remained 4/4. Reload/recovery and final account reopen retained Right Arm **2/2**. This was a GM-adjudicated table selection, not a natural d3 claim. |
| (i) New-session Luck refill | **PASS** | Spent one of two Luck Points: 1/2. Advance time described new session as refilling Luck (1 of 2 now). Start a new session restored **2/2**, with the visible status confirming refill. Both Luck pips remained active on final account reopen. MP remained 12. |
| Hazard table glance | **PASS** | Body → Hazards and recovery contained Acid (p.68), Falls (p.78), Fire (p.79) and their tables. Acid listed Weak/Strong/Concentrated; falls listed distance/damage/location rows; fire listed intensities 1–5. Presence check only; source accuracy relies on #161/#163. Guidance remains GM-assisted. |

## Cleanup and evidence limits

Deleted **Disposable S4 Final Character**; it disappeared, and remained absent after reloading the account character list. The original five characters remained listed.

Opened the disposable campaign, clicked Delete campaign, verified the confirmation named **Disposable S4 Final Campaign**, and accepted it. The environment reset before the next observation. A fresh browser then required sign-in, so **campaign deletion was submitted but its saved absence after reload is unverified**. If it remains, delete only that named campaign (`dce39b81-cc93-4574-a09d-089fa74a76de`). The test character was already deleted. No other campaign was selected for deletion.

A results screenshot was captured during the pass, but workspace maintenance removed it before publication. This report preserves the observed values; no replacement screenshot or new UI pass is claimed. No invitation codes, credentials, or private GM content are included.

## Validation and handoff

All **33** current local `tests/*.cjs` scripts pass after updating the docs branch to main. The tested deployment previously had 32 scripts; the newer Stone layout adds one. No test or application files changed in this PR.

Requested functional gates **(g)–(i) PASS**, with the formula-placement and campaign-cleanup limitations above. Claude should review this evidence alongside #164/#165 and make the Subsystem 4 closeout decision. Progress remains **4/8 pending Claude closeout**. The later Stone layout/damage-helper walkthrough listed in current HANDOFF was not run and remains a separate live check.
