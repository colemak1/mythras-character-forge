# Devotional Pool rank checks

- Confirm the rank associated with the tracked Devotional Pool. For a whole-number rank limit, the builder prevents increasing above that limit. An existing oversized pool is preserved and flagged for review before casting.
- Test POW 12 / Initiate: a new pool of 3 is accepted, 4 is rejected. Open an older pool above 3 and confirm its value is retained and flagged; correct it and save/reopen. Test an unconfirmed rank and a fractional result with your GM.
- Still unfinished: separate multiple-cult pools, combined pool totals, fractional rounding, and signed-in production verification.
