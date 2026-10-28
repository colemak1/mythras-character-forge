# Character import and Core magic

- Import a character backup directly into My Characters as a new independent copy, preserving the open character and showing errors on failure.
- Replace the unsupported starting Folk Magic dice allowance with Core's skill-based guidance and allow GM-approved names to be recorded when the catalogue is empty.
- Correct Mysticism's individual Intensity at 34% to 2. The draft rounds other fractions up as a tentative interpretation; the GM should confirm boundaries. Specialist Folk Magic rounding and starting allowances remain GM-managed.

Test: sign in, import a backup from Account, verify it appears in My Characters, reopen it and reload; check portrait and that the original remains separate. Try invalid JSON and a failed network save. For a Folk Magic character verify default starting guidance and add a name; for Mysticism 34% verify maximum Intensity 2. Cloud behavior is stubbed in automated tests; real account and browser testing remain outstanding. Mysticism preparation and activation prerequisites are not addressed here.
