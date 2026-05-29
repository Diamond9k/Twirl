# Implementation Plan: Foundation Integrity

**Branch**: `005-foundation-integrity` | **Date**: 2026-05-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-foundation-integrity/spec.md`

## Summary

Reconcile every foundational system (secrets, connections, memory, repos, project records) from claimed-state to actual-state, and establish a single source-of-truth rule — **Obsidian owns all facts; `CLAUDE.md` owns only behavior** — so the drift that caused every prior integrity failure cannot recur. The approach is verification-driven: each requirement maps to a binary PASS/FAIL command (grep / git / curl / SQL), and the work is sequenced risk-first (source-of-truth rule and secrets before cleanup).

## Technical Context

**Language/Version**: Shell (bash/zsh), Python 3 (for JSON/parsing only); no application source code is produced.
**Primary Dependencies**: git, Supabase CLI/MCP, Obsidian Local REST API + MCP bridge, Cursor MCP config (`~/.cursor/mcp.json`), Claude Code MCP config (`~/.claude.json`), `~/.zshrc`.
**Storage**: Obsidian vault (`~/Obsidian Vault/`, markdown) = facts/state; `~/.zshrc` = secret values (env exports); git repos = code; `~/.claude/projects/.../memory/` = auto-memory.
**Testing**: Verification commands per requirement (the `quickstart.md` runbook). No unit-test framework; the test IS "does the recorded value match the live system? y/n".
**Target Platform**: macOS (`/Users/cooperporter`). Windows (`C:\Users\cport`) is a secondary mirror noted in catalog records, not worked here.
**Project Type**: Infrastructure / operations — reconciliation + documentation, no app deliverable.
**Performance Goals**: N/A (one-time reconciliation; success is correctness, not throughput).
**Constraints**: Obsidian must be reachable for writes (it flaked once this session — `ECONNREFUSED` — then recovered; treat its uptime as a gating dependency). No secret value may be written to any second location. No edits to `main` without a branch (already on `005-foundation-integrity`).
**Scale/Scope**: 1 source-of-truth rule, 9 credential entries (6 plaintext → relocate, 2 rotate), 2 MCP configs to sweep, ~7 connections to map, N memory files, ~3 duplicate-repo resolutions, ~8 project catalog entries.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) governs the **Twirl product** (Stripe flow, schema, screens, EAS). This feature is explicitly **out of that product domain** — it touches no app source, no DB schema, no payments. Applicable principles and status:

- **Principle #3 — "Write a spec before writing a screen"** (generalized: spec before change): ✅ PASS — spec.md authored and validated before this plan.
- **Principle #9 — "Council reviews architecture/GTM, not implementation details"**: ✅ PASS — Council fired on the scope decision (this-window-vs-Twirl) before planning.
- **Principle #10 — "Cooper understands his own code / no over-abstraction"**: ✅ PASS — the source-of-truth rule reduces abstraction (one home per fact) rather than adding it.
- **Non-Negotiable PR criteria** (typecheck, Supabase env, Stripe server-side, NativeWind): **N/A** — no application code is changed.

**Gate result: PASS, no violations.** Complexity Tracking section omitted (nothing to justify).

## Project Structure

### Documentation (this feature)

```text
specs/005-foundation-integrity/
├── plan.md              # This file
├── research.md          # Phase 0 — resolved unknowns (env-ref feasibility, 2nd MCP config, taxonomy)
├── data-model.md        # Phase 1 — record schemas (Credential, Connection, Fact, Catalog Entry)
├── quickstart.md        # Phase 1 — the PASS/FAIL verification runbook
├── checklists/
│   └── requirements.md  # Spec quality checklist (complete)
└── tasks.md             # Phase 2 — created by /speckit-tasks, NOT here
```

### Systems Touched (no source tree — this is the real "touch map")

```text
~/CLAUDE.md                          # STRIP volatile facts → pointers to Obsidian (US1)
~/.cursor/mcp.json                   # 6 plaintext secrets → ${ENV_VAR} refs (US2)
~/.claude.json  (mcpServers block)   # SWEEP for plaintext secrets — discovered 2nd config (US2)
~/.zshrc                             # ADD env exports for relocated/rotated secrets (US2)
~/WINDOWS_CLAUDE_BOOTSTRAP.md        # PURGE duplicated secret values (US2)
~/Obsidian Vault/
├── Connections/                     # Authoritative connection map + APIs.md scrub (US2/US3)
├── Decisions/                       # Source-of-truth rule recorded here (US1)
├── Projects/                        # Project catalog entries (US6)
├── Active/Sprint.md                 # Current-state home that CLAUDE.md points to (US1)
└── Sessions/                        # (existing) session logs
~/.claude/projects/.../memory/       # Memory audit + contradiction fixes (US4)
~/Twirl, ~/Documents/Twirl,          # Repo de-duplication → one canonical each (US5)
  ~/Downloads/MiroFish-Offline, ~/twirl-simulation
```

**Structure Decision**: No `src/` is created. The feature's deliverables are (a) reconciled config/doc files in the home directory, (b) authoritative records in the Obsidian vault, and (c) the spec artifacts in this repo. The "touch map" above is the authoritative list of what changes; `tasks.md` will assign one R-number per touched system per workstream.

## Complexity Tracking

> No constitution violations — section intentionally empty.
