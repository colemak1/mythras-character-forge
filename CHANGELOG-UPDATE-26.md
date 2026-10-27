# Update 26 — Password reset recovery

- Register the Supabase auth listener before restoring a session so a reset-link redirect can open the new-password form.
- Keep the account form visible when recovery is detected during startup.
- Refresh the router asset on the live site.

Test: request a new reset email, open its link once, and check that Forge shows **Choose a new password**. Then set a new password and sign in. Previously used reset links cannot be reused.

Verification: the cold-start password-recovery regression and all 11 prior release regressions passed locally. A fresh live email-link walkthrough is still needed.
