# Architecture specs

Owned by **Gemini (Neon)**, the project architect (owner, 2026-11-21). See `AGENTS.md`, "Roles".

One short file per system or decision, named `<system>-<yyyymmdd>.md`. Keep it to what Claude needs to build:

1. **Goal**: one or two lines, and the Session Zero item or owner request it serves.
2. **Decisions**: module boundaries, data shapes (including saved data and any Supabase tables), and options rejected in one line each.
3. **Files**: the files Claude will create or change.
4. **Tests**: what must be tested, including any migration for old saved data.
5. **Open questions** for the owner, or rule cases for ChatGPT (Chat).

Rules come from Mythras Core via ChatGPT (Chat); an architecture spec never rules on them. Lasting decisions also get a line in `docs/decisions.md` starting "Architecture:".
