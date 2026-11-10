# Magic batch 3 — Mysticism: code-needed cases

**Source:** *Mythras 2e Core*, printed pp.155–160; indexed PDF p.155 checked; existing `docs/magic-subsystem-cases.md` MY-B01–B10. **Implementation comparison:** `js/engine.js` already gates learned Talents, half-POW learned count, individual and aggregate Intensities, preparation, costs, and tracks active Talent turns. Do not re-implement those.

| ID | Core page | Required code delta and acceptance |
|---|---|---|
| MY-C01 | **p.157** | **Switching the distinct Talents in regular practice** is not just unticking Learned and adding another. If the user changes the practiced set at the half-POW cap, show the required meditation/retraining procedure for GM confirmation and record the swap. An existing saved Talent must not silently disappear when its practice status changes. |
| MY-C02 | **p.157** | When a caster is **disrupted while maintaining multiple active Talents**, prompt the applicable opposed Willpower resolution for **each** affected Talent independently; drop only those whose concentration fails. Do not end all Talents after one generic roll. Because timing and injury are GM-resolved, this is a prompted workflow, not auto-triggered HP detection. |
| MY-C03 | **pp.156–157** | **Augment Skill** applies difficulty-grade shifts up to **Very Easy**, with excess levels retained to absorb later penalties. If the active Talent is linked to a Play Mode skill roll, calculate the final grade from its Intensity and other modifiers without increasing beyond the cap. Ensure the display and actual roll agree. |

**Excluded:** An invented automatic Talent catalogue/effect engine; individual Core Talent choices on pp.157–160 require separately checked children before being automated. Existing active-state toggle remains per D-3. Progress 5/8.