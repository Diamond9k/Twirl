# Tasks: Foundation Integrity

**Feature**: `005-foundation-integrity` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Input**: spec.md, plan.md, research.md, data-model.md, quickstart.md

**Conventions**: `[P]` = parallelizable (different files, no incomplete deps). `[USn]` = maps to user story n. `[OPERATOR]` = requires Cooper's manual action at an external provider (Claude cannot do it). Every fact-write requires Obsidian reachable (see T004 gate). Verification commands live in `quickstart.md`.

---

## Phase 1: Setup

- [ ] T001 Confirm working branch is `005-foundation-integrity` and clean tree via `git -C /Users/cooperporter/Twirl-Hub/repo/Twirl status --short`
- [ ] T002 [P] Snapshot baseline of every file to be mutated into `~/_archive/foundation-integrity-baseline-2026-05-28/`: copy `~/CLAUDE.md`, `~/.cursor/mcp.json`, `~/.claude.json`, `~/.zshrc`, `~/WINDOWS_CLAUDE_BOOTSTRAP.md` (rollback safety; secrets stay local)
- [ ] T003 [P] Capture current live-state evidence into `specs/005-foundation-integrity/baseline.md`: repo list, secret-presence grep results, connection statuses (no secret values — prefixes only)

## Phase 2: Foundational (blocking prerequisites)

- [ ] T004 Obsidian reachability gate: verify `mcp__obsidian__obsidian_list` (or `curl -sk -H "Authorization: Bearer $OBSIDIAN_TOKEN" https://127.0.0.1:27124/vault/`) returns 200 before ANY Obsidian write task; if down, STOP and surface to operator (per research R6)
- [ ] T005 Confirm the `${ENV_VAR}` expansion pattern works in `~/.cursor/mcp.json` (already proven by blueprint-os/obsidian/manus servers per research R1) — no change, just record confirmation in `baseline.md`

---

## Phase 3: US1 — Source of Truth Established (Priority: P1) 🎯 KEYSTONE

**Goal**: Obsidian owns all facts; `CLAUDE.md` owns only behavior; on disagreement Obsidian wins.
**Independent test**: `grep -nED 'Build #|sandbox|pk_live|TestFlight|RESOLVED|acct_1' ~/CLAUDE.md` returns nothing; a pointer to Obsidian exists.

- [ ] T006 [US1] Write the source-of-truth rule to Obsidian `Decisions/Source-of-Truth.md`: Obsidian=facts, CLAUDE.md=behavior, discriminator test ("changes week-to-week → Obsidian"), Obsidian-wins-on-conflict
- [ ] T007 [US1] Inventory every volatile fact currently in `~/CLAUDE.md` (GROUND TRUTH bug status, "Stripe sandbox", EAS build #, STACK versions, CONNECTION VERIFY statuses, ROADMAP, BACKGROUND) — list each with its target Obsidian home
- [ ] T008 [US1] Migrate the volatile facts into Obsidian: bug/build/stack state → `Active/Sprint.md`; connection statuses → `Connections/` (handed to US3); locked decisions → `Decisions/`; project background → `Projects/` (handed to US6)
- [ ] T009 [US1] Rewrite `~/CLAUDE.md`: remove migrated facts, replace with one-line pointers ("current state → Obsidian `Active/Sprint.md` + `Connections/`"); keep only behavior/protocol sections (DABI, Ralph, Council, session protocols, token rules)
- [ ] T010 [US1] Verify US1: run the independent-test grep from `quickstart.md` SC-001; PASS = zero volatile-fact hits + pointer present

## Phase 4: US2 — Secrets Secured (Priority: P1)

**Goal**: 6 plaintext secrets → env refs across BOTH MCP configs; rotate GitHub PAT + Hostinger; no secret value in any doc.
**Independent test**: `grep -nE 'sk-ant-|sk-proj-|ghp_|github_pat_' ~/.cursor/mcp.json ~/.claude.json` returns nothing.

- [ ] T011 [US2] Add exports for the 6 relocating secrets to `~/.zshrc` (`GITHUB_PERSONAL_ACCESS_TOKEN`, `GITHUB_TOKEN`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, Hostinger `API_TOKEN`) using their current values; `source ~/.zshrc` to confirm they load
- [ ] T012 [US2] Convert the 6 plaintext entries in `~/.cursor/mcp.json` to `${ENV_VAR}` references (github, hostinger-mcp, codex, code-review×3) matching the existing blueprint-os/obsidian/manus pattern
- [ ] T013 [P] [US2] Sweep `~/.claude.json` `mcpServers` block for plaintext secrets (second config discovered in research R2); convert any to `${ENV_VAR}` refs + add matching `~/.zshrc` exports
- [ ] T014 [US2] [OPERATOR] Rotate GitHub PAT at github.com/settings/tokens and Hostinger `API_TOKEN` in the Hostinger dashboard; paste new values — Claude updates `~/.zshrc` exports (old plaintext never returns to a config file)
- [ ] T015 [US2] Verify old GitHub PAT is invalid: `curl -s -o /dev/null -w '%{http_code}' -H "Authorization: token OLD_PAT" https://api.github.com/user` returns 401; confirm Hostinger old token revoked in dashboard
- [ ] T016 [P] [US2] Purge duplicated secret values from `~/WINDOWS_CLAUDE_BOOTSTRAP.md` — replace with key names + "value in ~/.zshrc"
- [ ] T017 [P] [US2] Verify `Obsidian Vault/Connections/APIs.md` holds names+locations only, never values (research R3 found placeholders — confirm/scrub)
- [ ] T018 [US2] Restart Cursor + Claude Code MCP and confirm all servers still connect with env-ref values; run `quickstart.md` SC-002 (PASS = no plaintext, 9/9 via refs)

## Phase 5: US3 — Connection Map Authoritative (Priority: P2)

**Goal**: One verified connection map in Obsidian with per-connection verify commands.
**Independent test**: each entry's verify command's live result matches its recorded status.

- [ ] T019 [US3] Enumerate all connections from both MCP configs + APIs (Supabase, Stripe, GitHub, Hostinger, Higgsfield, Obsidian, Manus, blueprint-os, codex, code-review)
- [ ] T020 [US3] For each, run a live reachability check from THIS Claude Code session and record the actual result (LIVE / not-connected-here / blocked)
- [ ] T021 [US3] Write `Connections/Connection-Map.md` in Obsidian per data-model Connection schema: name, type, verified status, verify_command, last_verified=2026-05-28, notes
- [ ] T022 [US3] Verify US3: re-run 2-3 entries' verify commands; PASS = recorded == live (quickstart SC-004)

## Phase 6: US4 — Memory Reconciled (Priority: P2)

**Goal**: No memory record contradicts reality or another record.
**Independent test**: each memory fact verified against live system + Obsidian; zero contradictions.

- [ ] T023 [US4] Audit each file in `~/.claude/projects/-Users-cooperporter-Twirl-Hub-repo-Twirl/memory/` against live reality (verify named files/flags/statuses still exist)
- [ ] T024 [US4] Cross-check memory facts against Obsidian `Active/Sprint.md` + `Connections/`; where they disagree, correct memory to match Obsidian (authoritative per US1) or delete if stale
- [ ] T025 [US4] Verify US4: list memory files, confirm no fact disagrees between memory and Obsidian (quickstart SC-005)

## Phase 7: US5 — Repositories De-duplicated (Priority: P3)

**Goal**: One canonical copy per project; duplicates archived after unique-content check.
**Independent test**: each project has exactly one active repo; others under `~/_archive/`.

- [ ] T026 [US5] For `~/Twirl` and `~/Documents/Twirl`: check for unique uncommitted work (`git status`, `git log` vs canonical `~/Twirl-Hub/repo/Twirl`); record findings
- [ ] T027 [US5] Archive non-canonical Twirl copies to `~/_archive/` (only after T026 confirms no unique content, or after reconciling it)
- [ ] T028 [P] [US5] Resolve MiroFish duplication: canonical `~/twirl-simulation`; record `~/Downloads/MiroFish-Offline` source URL then archive
- [ ] T029 [US5] Record canonical locations in Obsidian (`Projects/` repo-resolution note); verify SC-006 (one canonical per project)

## Phase 8: US6 — Project Catalog Complete (Priority: P3)

**Goal**: Every parked/revenue project has a one-page Obsidian record; revenue projects catalogued-only.
**Independent test**: each project has an Obsidian page with name + disk_location + state + resume_trigger.

- [ ] T030 [P] [US6] Catalog MiroFish in `Projects/MiroFish.md` (parked, ~/twirl-simulation, resume trigger from memory)
- [ ] T031 [P] [US6] Catalog the 5 CloudOS HTML dashboards (cooperbrain-os, agent-os, creative-os, life-os, blueprint-os-v2) in `Projects/CloudOS.md` with disk paths
- [ ] T032 [P] [US6] Catalog ScrapYard (scrapyard.to, revenue, catalogued-only) in `Projects/ScrapYard.md`
- [ ] T033 [P] [US6] Catalog AppFactory (4 boilerplates under ~/AppFactory, catalogued-only) in `Projects/AppFactory.md`
- [ ] T034 [P] [US6] Catalog the RAG stub (not built, ~/cooperbrain-rag does not exist) in `Projects/RAG.md`
- [ ] T035 [US6] Verify US6: confirm each catalog page has all 4 fields + correct disk path (quickstart SC-007)

---

## Phase 9: Polish & Verification

- [ ] T036 Run the FULL `quickstart.md` runbook top-to-bottom; record PASS/FAIL per SC-001..SC-008 in `specs/005-foundation-integrity/verification-results.md`
- [ ] T037 Capstone SC-008: read ONLY `~/CLAUDE.md` + Obsidian `Active/Sprint.md` + `Connections/` and confirm true current state is derivable with zero contradictions
- [ ] T038 Session-end: write Obsidian `Sessions/2026-05-28.md` (R-numbers shipped, open items), update `Active/Sprint.md`; commit all with `[T0xx]` prefixes

---

## Dependencies & Execution Order

```
Phase 1 (Setup) ─▶ Phase 2 (Foundational, incl. T004 Obsidian gate)
                        │
                        ▼
            Phase 3 (US1 Source of Truth) ◀── KEYSTONE, do first; defines where US3/US4/US6 write
                        │
        ┌───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼
   Phase 4 (US2)   Phase 5 (US3)   Phase 6 (US4)   Phase 7 (US5)
   secrets         connections      memory          repos
        │               │               │               │
        └───────────────┴───────┬───────┴───────────────┘
                                 ▼
                        Phase 8 (US6 catalog)
                                 ▼
                        Phase 9 (verify all)
```

- **US1 is the keystone**: it defines the Obsidian homes that US3/US4/US6 write into — do it first.
- **US2 (secrets) is independent of US1** and can run in parallel with Phase 3 (different files entirely).
- After US1: US3, US4, US5 are mutually independent.
- US6 depends on US5 (canonical paths) and US1 (taxonomy).
- **[OPERATOR] gate**: T014 (key rotation) blocks T015 and needs Cooper at the provider dashboards.

## Parallel Opportunities

- Phase 1: T002 + T003 in parallel.
- Phase 4: T013, T016, T017 in parallel (different files) once T011/T012 land.
- Phase 8: T030–T034 fully parallel (one file each).
- Cross-story: Phase 3 (US1) and Phase 4 (US2) can proceed concurrently — no shared files.

## Implementation Strategy

- **MVP = US1 + US2** (both P1): establishes the no-drift rule and closes the secret exposure. Everything else is reconciliation that builds on that foundation.
- **Incremental delivery**: each phase ends with its verification task; commit per phase with `[T0xx]` prefix.
- **Operator touchpoint**: only T014 needs Cooper's hands (provider key rotation). Everything else is autonomous, with the T004 Obsidian gate guarding fact-writes.

**Total tasks: 38** — Setup 3 · Foundational 2 · US1 5 · US2 8 · US3 4 · US4 3 · US5 4 · US6 6 · Polish 3.
