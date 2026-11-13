# Pits spring stage: code findings for Claude — 2026-11-13

Reviewed `claude/fable-combat-fluidity-jus18q` at
`931a376c415b853263b4f7aec75e899ec686e1af`. Presentation only;
no production code or rules changed. Read AGENTS.md and HANDOFF.md first.
These findings explain the owner's requested browser review of `?stage=spring`.
The browser review used sampled screenshots, not a continuous recording.

## Fix first: incomplete exchanges play consequences early (Severity 2)

Locations: `experiments/pits-stage.js:205`, `:214–246`, `:1122–1131`,
`:1318–1326`.

`pitsStageArrange` starts holding only when it finds a `hit` or `deflect`.
An offensive Disarm can resolve before either exists, while the engine is
still waiting for hit location/damage. That batch is played immediately.
`pitsStageOrder` cannot fix this later: the effect has already been shown.
The Disarm cue independently calls `L.blow(... outcome:'parried', loc:'rarm')`,
making a second generic attack rather than part of the original exchange.
Separately, `pitsStageSync` calls `psFlyWeapon` as soon as the displayed snapshot
says `disarmed`, without checking whether the causal contact has played.

Pure reproduction using the existing stage VM harness:
`pitsStageArrange([disarmEntry], [], true, names)` returns the Disarm in
`play`, with empty `hold`. Use entry title `Disarm Opponent`, body
`Marek's weapon lands 2m away.`, meta `{actor:'a',target:'b'}`.
Browser evidence: sword critical 7 versus successful Evade 7; selected Disarm;
mace appeared on the floor before the distance roll; a separate contact pose
played before the later chest hit's location/damage rolls finished.

Fix direction: stage the full exchange, including offensive/defensive effects,
by exchange identity. Keep dice and choices available in legal engine order,
but queue consequential movement/weapon visibility until the resolved phrase's
contact. Preserve the existing defensive Trip ordering and manual dice flow.
Do not merely add Disarm to `PSTAGE_BLOW`: the later body hit and its wound
still have to form the same exchange, without duplicate swings.

Regression: offensive Disarm followed by distance, location, damage and wound
resistance rolls; no contact/drop until the whole exchange is ready; exactly
one attack plus its effect. Also cover zero-distance drop and defensive Disarm.

## Shield attacks become weapon attacks in the live adapter (Severity 2)

Locations: `experiments/pits-stage.js:1164–1183`,
`experiments/pits-spring-live.js:76–85`, `experiments/pits-writer.js:797`.

The stage has `px.tool` / `PS.ex.shield`, but `psMotionBlow` passes neither
attack-tool identity nor `strike` to `L.blow`. The adapter builds a record
without `strike`. The writer requires `rec.strike === 'shield'` to choose
`shieldStrike`. The adapter's `shield` argument means the defender's shield;
it cannot also identify the attacker's tool.

Pure reproduction: declare `PL.intent(M.a,0,'shield-strike',0)`, then
`PL.blow(M,'a',t,{outcome:'wound',loc:'chest',lost:1,strike:'shield'})`.
Even when supplied explicitly, the adapter drops `strike`; its recorded
exchange selects `cutLands`, not `shieldStrike`.

Fix direction: carry the engine's attack tool through both boundaries, keeping
it separate from defense tool. Regression must exercise stage -> adapter ->
writer, for landed, missed and parried shield attacks. Direct writer fixtures
alone do not catch this loss. Repair the existing shield phrase geometry
failure before enabling it through the corrected adapter.

## Shield identity is discarded twice (Severity 2)

Locations: `experiments/pits-stage.js:114`, `:387`;
`experiments/pits-spring-live.js:40–46`;
`experiments/pits-writer.js:53–54`, `:108`.

`pitsStageLook` reduces shield equipment to a boolean. `fighter` preserves
only that boolean; `world` maps every shield to `heater`. The stage separately
draws every shield as a circle of radius 19. Thus the writer's buckler radius
13 and other profiles are unused live. In the controlled buckler/heater VM
pair both writer radii were 19; both also appeared identical in the browser.

Fix direction: preserve the actual shield key and use compatible profile
geometry for contacts and drawing. Regression: buckler/heater remain distinct
in the adapter and renderer, with contacts on their actual surfaces.

## Press Advantage has no spring movement (Severity 2, known stand-in)

Locations: `experiments/pits-spring-live.js:177`;
`experiments/pits-stage.js:1229–1234` (`psMotionPress`).

`press(A,D,t)` just returns `t`. Calling it leaves both fighters' key lists
unchanged. The stage can show effect text but cannot create the intended
pressure/cover pose. Implement a phrase from the current positions, with a
clean held ending; do not introduce idle resets or movement during choices.
Keep the engine's restriction unchanged. Check text and pose during the same
effect, and release naturally into the next action.

## Result dialog is rendered twice (Severity 2)

Locations: `experiments/pits-arena.js:269`;
`experiments/practice-combat.html:2065`, `:2391`.

The default `arenaHtml()` returns `pitsArenaDeckHtml()`, which appends
`resultModalHtml()`. The outer `render()` appends it again. Reproduction with
`S.phase='over'; S.showEndModal=true; V.busy=false`:
`(arenaHtml()+resultModalHtml()).match(/class="result-backdrop"/g).length`
is 2. Browser accessibility snapshots likewise exposed duplicate result
dialogs/buttons. Duplicate `resultTitle`/`resultCause` IDs follow as well.

Fix direction: give the result modal one render owner. Regression: exactly
one result dialog and one set of IDs/actions for victory, defeat and draw,
including replay completion and reopening Show result. Check default,
alternative bottom layouts and classic layout.

## New bout initially labels old exchange as current (Severity 2)

Locations: `experiments/pits-arena.js:76–87`, `:264–268`;
`experiments/practice-combat.html:3004–3016`, `:3862–3867`.

`paExchanges()` scans the run's retained logs. Break entries clear `cur` but
never remove prior groups from `out`; the deck always takes `out.at(-1)` as
current. Starting the next opponent retains logs and resets the replay tape,
but does not scope these exchange groups to the new bout. VM reproduction:
old attack exid 1, Fight Ends, New Opponent, Encounter 2 Initiative still
returns group 1. Browser evidence: new opponent at full HP while Current
exchange still showed the previous opponent's finishing chest wound.

Fix direction: scope exchange summaries to the displayed bout; retain the
chronicle history. Regression: before the new opponent's first attack, Current
exchange is empty and no old opponent injury appears as its current result.

## Existing animation and layout work, not new rules defects

- Ground combat: `pits-writer.js:120–129` filters body channels and suppresses
  grounded steps/walks. `pits-spring-live.js:170–173` gets up with two keys.
  The browser ground poses are consistent with these documented stand-ins.
  Build grounded attack/defense and recovery phrases; preserve remaining prone
  until a legitimate recovery. Severity 2 visual limitation.
- Clipped action names: `pits-arena.css:259–264` combines two narrow columns
  with `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` on labels
  and help. Allow action labels to wrap or enlarge the selected action area.
  Severity 2 UI limitation, observed on the desktop review.

## Validation and handoff

Six focused pure reproductions completed: early Disarm, lost shield strike,
equal shield radii, no-op pressure, duplicate dialog and retained old exchange.
No production or test files were changed. Ran every `tests/*.cjs` file using
the AGENTS.md loop. Only `tests/pits-writer.cjs` failed: the existing shield
sample, `sword/heater v sword/buckler head`, shield strike parried, reports
`b.E snaps 8.5 at 3384`. All other root test files passed. The focused
reproductions above still expose gaps despite those passes. Browser test
scripts and the live sweep were not rerun in this code-only follow-up.
These are presentation findings, not sourcebook rulings or release approval.
Next: Claude fixes on the fluidity branch; nothing to main.

Session readiness remains 13/14; feature completeness 8/8 built, 8 closed.
