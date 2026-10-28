# Sorcery Core corrections

- Replace Intensity Shaping with Combine; limit total points by the caster's Shaping skill.
- Apply one harder Invocation grade per extra combined spell. Preserve legacy values for explicit review and recheck casting in progress.
- Test: at Shaping 47%, allocate five points then six; verify the latter cannot cast. Test one and two Combine points, existing saves with Intensity or combined spells, cancellation and resuming casting, and JSON export/import.
- Still manual: confirm spells are different, share targets, and use the lowest relevant Invocation skill when sources differ. Existing casting trackers without a Shaping snapshot must be cancelled and restarted.
