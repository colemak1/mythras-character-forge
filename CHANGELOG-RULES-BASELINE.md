# Rules baseline

- Reconcile the master checklist with releases through PR #45; mark partial work and outstanding verification clearly.
- Restore a visible retry message when campaigns cannot be loaded, so a connection error is not mistaken for an empty account.
- Update stale homepage and combat-navigation regression expectations to match the current interface.
- Test: sign in, open Campaigns, simulate a failed connection and retry when connectivity returns. Confirm existing campaigns appear. Signed-in production testing remains outstanding.
