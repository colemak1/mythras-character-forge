# Magic batch 5 — Theism and cult-linked miracles: code-needed cases

**Source:** *Mythras 2e Core*, printed pp.178–191; indexed PDF p.178 checked; case ledger `docs/magic-subsystem-cases.md` TH-B01–10. **Implementation comparison:** engine already has per-cult Devotion/Exhort keys, separate pool caps with POW aggregate, miracle level and pool-rank checks, per-rank turns, outcomes. No duplicate MAG-N05–N08; the engine also already computes multiple miracle instances (`theismDetails`, p.181), so that is excluded.

| ID | Core page | Required code delta and acceptance |
|---|---|---|
| TH-C01 | **p.179** | When a new theist chooses **starting miracles**, allow only those of their approved cult and permitted rank, up to **one miracle per 20% Devotion**. Treat starting entitlement and learning a later miracle separately; require GM confirmation before awarding more than the starting allocation. Test a low-Devotion boundary, a second cult and save/reload. |
| TH-C02 | **pp.118, 179–181** | A **newly learned miracle after creation** must have its source/cult/rank and confirmed learning procedure (normally **5 Experience Rolls and one month** per general magical ability learning rule), not appear for free just because a string was added to the Magic list. Keep record-only imported entries from being silently recharged. |

**Owner exclusions:** MP/donation recovery is manual (D-2); extended active miracle tracking and temporary pool reductions are GM-managed (D-3), not new automatic state requirements. Individual miracles pp.182–191 need per-entry child cases before automated effects. Progress 5/8.