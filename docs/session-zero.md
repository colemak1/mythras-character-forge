# Session Zero: what the first campaign needs

Owner, 2026-11-10. This file sets the priority order. Work that moves an item here to **Ready** comes first. Everything else waits unless the owner asks for it.

Status words: **Ready** (built, tested in code, and used at least once on the live site), **Built** (built and tested in code; one live check left), **Partial** (some of it built), **Owner** (needs an owner decision or an owner check in real play).

## Progress

Two numbers, reported at the end of every batch instead of a long status:

- **Session readiness:** Ready items in the checklist below, out of the total. Today: **13 of 14** (items 9, 10 and 14 passed live 2026-11-10; item 2 after the HP recheck, `creature-hp-live-275-20261110.md`). Only item 11, the owner's two-device check, is left.
- **Feature completeness:** subsystems built (code done, whether or not closed) out of 8. Today: **7 of 8 built**, 7 closed. Subsystem 7 reclosed 2026-11-11 after its limb HP fix passed live; Subsystem 8 closed 2026-11-10. Magic (6) is the one still being built: Folk Magic done, Animism (live-checked, Spirit Combat GM-managed) and Mysticism built 2026-11-11.

The close count in `subsystem-plan.md` (now 7/8) stays, but it is no longer the headline.

## The checklist

### Before the table

| # | What the GM and players need | Status | Left to do |
|---|---|---|---|
| 1 | Each player makes a human character on their own account, saves, and it reopens unchanged | **Ready** | Subsystem 1 closed |
| 2 | A player can build a GM-approved creature character | **Ready** | Full build passed live 2026-11-10 (`session-zero-live-273-20261110.md`); the limb HP fix passed live (`creature-hp-live-275-20261110.md`) |
| 3 | GM makes a campaign; players join with the code; New code, Remove and Make GM work | **Ready** | Passed live 2026-11-09 |
| 4 | Starting gear and money, with costs and ENC added up | **Ready** | Subsystem 3 closed |
| 5 | GM gives an item; the player sees it after reload | **Ready** | Passed live (one player at a time) |
| 6 | Magic for the traditions this campaign starts with | **Ready** | Owner, 2026-11-10: the first campaign uses almost no magic. Folk Magic is built and used live. The other traditions are still built in full before Session 1, but after the items above |

### At the table

| # | What the GM and players need | Status | Left to do |
|---|---|---|---|
| 7 | Skill rolls with difficulty, augmenting and opposed rolls in Play Mode | **Ready** | Subsystem 2 closed |
| 8 | Melee combat: hit locations, armour, Special Effects, wounds | **Ready** | Subsystem 5 closed |
| 9 | GM tracker with NPCs and creatures: add, roll location, damage after armour | **Ready** | Passed live 2026-11-10 (`session-zero-live-20261110.md`) |
| 10 | Rabble and Underlings, several creatures at once | **Ready** | Passed live 2026-11-10 |
| 11 | GM changes a player's item while that player is editing: nothing is lost | **Owner** | Stale-save warning is built and tested in code. Owner and one other person: 10 minutes on two devices (see below) |

### After the session

| # | What the GM and players need | Status | Left to do |
|---|---|---|---|
| 12 | Experience rolls and skill improvement | **Ready** | Subsystem 4 closed |
| 13 | GM downloads a campaign backup | **Ready** | Passed live 2026-11-10 |
| 14 | Restore a backup as a new campaign; the tracker opens | **Ready** | Passed live 2026-11-10 (`session-zero-live-273-20261110.md`): restored copy's GM Tools drew an NPC and a creature card |

**Backups are manual.** The Supabase project is on the Free plan, which has no automatic backups the owner can restore from. Until that changes, the GM downloads a campaign backup after every session.

### The two-device check (item 11)

Owner as GM on one device, a second person (or a second account on a phone) as the player:

1. The player opens their character's sheet and starts editing (types in Notes, don't save).
2. The GM gives that character an item.
3. The player saves. Expected: a warning that the character changed, and nothing is overwritten. After reload, both the item and the player's edit can be kept.
4. Bonus, same sitting: the player joins a **restored** campaign with its new code.

If anything is lost, that is a Severity 1 bug for Claude. If it works, item 11 is **Ready** and the blocked race checks move to Known limits.

## Not blocking Session Zero

These stay open. None of them holds up the first campaign. They are kept here so nothing is forgotten.

**Later features**
- All of Subsystem 6: Animism, Mysticism, Sorcery, Theism and cults, Organisations (owner, 2026-11-10: build them all "just in case", in the order in `roadmap.md`, the owner started it 2026-11-11 while item 11 waits on the two-device check). Session 1 is a few months away, so there is time.
- Campaign creator redesign (Mockup B), player style picker
- The Pits: ranged combat (shelved), unarmed
- Owned or commissioned home painting (owner sends art)

**Known limits (built and tested in code; extra live checks only)**
- Subsystem 8 (closed 2026-11-10): two independent player accounts racing on the same inventory; a second independent player owner; global profiles; the full phone route matrix; case-by-case reconciliation of `campaign-cases-batch-1.md`. Covered for now by item 11 and by the database permission tests in CI (D-S5).
- Subsystem 7 (reclosed 2026-11-11 after the limb HP fix passed live; full list in `subsystem-plan.md`): Core p.218 Vulnerable reading (worn armour still counts) unconfirmed for lack of the page; Vulnerable with worn armour, Intimidate "stopped threatening" and nonhuman Play Mode wounds tested in code only; Chaos d100 and anatomy tables not row-audited by Chat; many traits GM-resolved by design; The Pits refuses creature characters.
- Magic Audit fixture checks (combined POW cap, multiple cults, Animist rank limits): only when that tradition is in use.
- Real-phone sound and touch: the owner notices these in real play.
- Small live rechecks from earlier batches (1d6+1 improvement help text, home quote survives "Use the default painting", phone More sheet): fold into any Work batch that has room, never a batch of their own.
