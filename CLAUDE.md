@AGENTS.md

# Discore — Project Context

This project follows the Technical Master Blueprint (`BLUEPRINT.md`).
Read it before making any architectural decisions, adding dependencies, or creating new files.
For current implementation state and priorities, read `STATUS.md`. For UI/UX work, also read `UI-ROADMAP.md` and `DESIGN-PATTERNS.md`.

Key rules from the blueprint:
- Application source files: `.ts` / `.tsx` only (`app/`, `lib/`, `components/`). Tooling configs are exempt.
- No `any` in `/lib/scoring`.
- Supabase dual-client: never mix browser and server clients.
- RLS enabled on every table — default deny all.
- No Phase 6 features until community adoption warrants it.