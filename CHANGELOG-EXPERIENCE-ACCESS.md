# Experience access fix

- View-only sheets now reject changes to experience flags and the free fumble improvement.
- Owners can still apply an earned fumble improvement as before.
- Test: open a shared sheet in view-only mode and confirm experience controls cannot change it. On an editable sheet, flag a fumbled skill and apply its free improvement.
- Automated coverage checks that view-only calls leave the experience state unchanged. Signed-in sharing and persistence still need a live test.
