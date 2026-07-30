# Source Coverage Ledger — Mythras Rules Research Pass (July 2026)

Honest accounting of what actually got checked in the research session that produced `docs/mythras-rules-reference.md`, and — importantly — what didn't, and specifically *why*, so a future session (or the user) knows what's still owed rather than assuming "exhaustive" meant exhaustive.

## Environment constraints that shaped this pass

Two limitations governed almost every scoping decision below:

1. **No shell/bash access.** The sandboxed Linux workspace failed to start this session ("not supported on this device"). This ruled out: downloading and parsing PDFs (including the Combat Style Traits Encyclopedia itself), running a script to crawl the blog systematically (had to hand-fetch pages one at a time instead), and downloading/transcribing podcast audio.
2. **Web fetch tool returns full-page text, including a large fixed sidebar/footer** (WordPress.com theme boilerplate — categories list, archive-by-month list going back to 2012, subscribe widgets) on every single page. A single blog post fetch runs 8,000-15,000+ tokens of which typically under 10% is the actual post content. This made fetching dozens of individual posts prohibitively expensive; category-listing pages (which bundle several full posts per fetch) were used preferentially over one-post-at-a-time crawling.

Given those two constraints, full brute-force exhaustiveness (every single post on a 12-year, ~700-post blog; every minute of an 84-episode podcast) was not achievable in one session. What follows is what I actually did, so the gap between that and true exhaustiveness is visible rather than implied away.

## Notes from Pavis (notesfrompavis.blog)

**Fully read (category-page fetches, full post text captured):**

- **Rules** category — 4/4 posts. This is the site's own "rules" tag, so full coverage here is meaningful: starter GM resources index, Combat Flow Chart quick-reference, Crunch Mode (weapon reach/size effects), Narrow Spaces and Fighting.
- **Mythras** category — 10/10 posts, including the master "Mythras Charts and Tables" index (itself an annotated directory into dozens of other posts/PDFs).
- **Mass Combat** category — 1/1 post (naval/ship combat templates for Glorantha; setting content, not core system rules).

**Individually fetched (high-value posts pointed to by the above, fetched one at a time):**

- Encyclopedia of Mythras Combat Style Traits (original 2018 post)
- Combat Styles Combine And Go Encyclopaedic (2022 mega-update post)
- It Is Time To Scheme (Book of Schemes special effects)
- Healing Charts Refined for Mythras
- GM tips category (10/10 posts — read in full; confirmed this category is GM-craft/tooling advice, not rules-crunch, with one overlap already captured under Mythras category)

**Not crawled post-by-post, sampled only via homepage/category listings:**

- **Uncategorized** (171 posts) — the largest bucket on the site. Sampling (via the homepage's "Recent Posts" and cross-links) showed this is dominated by the author's own VTT/encounter-generator tool release notes (Fog of War tool updates, MeG creature digests, etc.) and miscellaneous Glorantha lore, not core Mythras system rules. A few individual Uncategorized posts *were* read because they were directly linked from the Rules/Mythras categories or the master charts index (e.g. "It Is Time To Scheme" is filed Uncategorized despite being rules content) — so this category wasn't ignored, just not crawled exhaustively.
- **Glorantha** (84), **RQ** (48), **Runequest** (36), **Cult** (34), **Fonrit** (17), **Monster Island** (7), **Sea** (5), **Umathela** (2), **Starting a Gloranthan Campaign** (10) — setting/lore categories. Not crawled. These matter for a Glorantha-flavored campaign but the Forge app itself (per its own data.js) is building a setting-agnostic Mythras character tool with an optional Gloranthan cult-archetype layer; lore-crawling this deeply didn't seem like the right use of a single session against the user's stated goal ("rules... to build out this app's features correctly").
- **Character Generation** (22), **Combat Style Cards** (18), **Mythras Encounter Generator** (66), **Tools** (60), **Pregen** (9) — sampled via cross-links (several Character Generation and Combat Style Cards posts surfaced and were read because the Mythras/Rules categories pointed to them), but not crawled as complete categories.

**If the user wants true exhaustiveness on this blog:** the practical path is either (a) restore shell access so a future session can script a full crawl + strip the repeated sidebar before reading, or (b) the user exports/provides the blog's own post list (WordPress export XML, or a sitemap.xml fetch) so a future session can work off a complete URL list rather than discovering posts by following internal links, which inherently under-samples older/less-linked posts.

## Combat Style Traits Encyclopedia v2.3 (Google Drive PDF)

**Not opened.** The provided link (`https://drive.google.com/uc?id=1BjlToBLetAf-P1MfCVzkNrPgaagCEi0s&export=download`) resolves to a binary file download; the web-fetch tool returned empty content. With no shell access, there was no fallback (no `curl`/`pdftotext`/Python PDF library path available).

What substitutes for direct review: `js/data.js`'s `COMBAT_TRAITS` array is explicitly commented as sourced from this exact document ("Mythras Combat Style Traits Encyclopedia V2.3"), transcribed with stated care ("typos included" — i.e., not paraphrased or auto-corrected). I treated that array as a reliable stand-in for the PDF's content for this pass, and cross-checked its category taxonomy and source attributions against what the blog posts *say* the Encyclopedia contains — they match. This is corroboration, not independent verification. A genuine line-by-line diff against the source PDF is still owed; see `docs/mythras-rules-reference.md` §6 and §11.

## Inwil's "Mythras Matters"

**Corrected framing:** the brief described this as a YouTube video series. It's an audio podcast (hosted on Buzzsprout, syndicated to Apple Podcasts/Spotify/YouTube-as-audio), 81-84 episodes, monthly since August 2019.

**Retrieved:** episode titles + show-note descriptions for episodes ~72-83 (the most recent dozen, via podbay.fm and podscan.fm) and the same for episodes 1-8 as listed on the current Apple Podcasts page (which actually showed the same recent run, 76-83, plus a "See All (84)" link I did not follow through — pagination on Apple's podcast page is JS-driven and a plain fetch only returns the first 8). One (1) episode (1.83) had a partial machine transcript visible before podscan.fm's registration gate — roughly the first 90 seconds of ~40+ minutes of audio.

**Not retrieved:** full transcripts for any episode; titles/descriptions for the ~70 earlier episodes (1.1 through roughly 1.71, spanning 2019-2024). Podscan.fm gates full transcripts behind account registration; no audio download/transcription path was available without shell access.

**What this means:** the podcast section of the reference doc (§9) is a topic index for a recent slice of the show, not a series-wide extraction. Given the podcast is monthly and has run since 2019, the ~70 unindexed earlier episodes likely include additional rules-crunch content (the recent slice alone surfaced movement/gait, sorcery casting, and multi-opponent-combat episodes — all plausible to recur as recurring themes across 6+ years of a rules-focused show).

**Recommended path to genuine exhaustiveness:** provide episode audio or transcripts directly, or grant shell access so a future session can pull the podcast RSS feed (likely at the Buzzsprout host, `buzzsprout.com/266482`) for a complete episode list with descriptions in one request, and — if transcription is wanted — run a transcription pass over the audio files (all of which have direct `.mp3` URLs, visible in the podbay.fm fetch, e.g. `https://www.buzzsprout.com/266482/episodes/<id>.mp3`).

## Core Mythras rulebook / Character Creation Workbook / Mythras Companion

No new page-scan verification was performed this session (no PDF access). The reference doc's core-rules content is my existing trained knowledge, cross-checked against `js/data.js`'s own page-cited comments rather than re-derived from scratch. Where data.js already carries a specific page citation, I deferred to it as more reliable than my recall. I found no disagreement between my knowledge and the repo's figures on characteristics, skill formulas, the Difficulty Grade table, the Damage Modifier table, or weapons/armour — see §10 of the reference doc.

## Mythras Imperative SRD

Not received this session per the user's own note in the brief. No action taken; flagged as pending in the reference doc §8.

## Repo review (`mythras-character-forge`)

Read: `js/data.js` in full (all ~460 lines — characteristics, skills, cultures, careers, weapons, combat traits, armour, cults, difficulty grades, Pulp Hero tiers, Quick Character hints). Skimmed `index.html`'s header comment for architecture/provenance notes. Did **not** read `js/engine.js`, `js/render.js` (beyond a targeted grep), `js/app.js` (beyond a targeted grep), `js/play.js`, or `js/cloud.js` in full — those are UI/state-management/cloud-sync code rather than rules data, and the brief scoped this pass to rules knowledge-building rather than a full codebase audit. If a future session needs to check how the Rules Notes in-app panel is *generated* (as opposed to what rules content it should contain), those files are the place to look.
