# Tasks: Blueprint OS v0.3 Full System Revamp

**Input**: Design documents from `specs/004-blueprint-os-revamp/`
**Branch**: `001-blueprint-os-revamp`
**R-numbers**: R-001–R-039 across 9 domains
**Total tasks**: 41

> Blueprint OS reference: BUILD phase (PG.03). Ralph Loop on every task.
> ADVERSARIAL gate between each tier. Parallel within tiers.
> Every commit prefixed [Rn].

---

## Phase 1: Setup — Already Complete ✓

- [x] T001 Feature branch `001-blueprint-os-revamp` created via speckit-git-feature
- [x] T002 spec.md written — 39 R-numbers across 9 domains
- [x] T003 plan.md + research.md + data-model.md + contracts/ + quickstart.md generated
- [x] T004 cooperbrain-kit installed — 8 skills in ~/.claude/skills/, blueprint-os MCP in settings
- [x] T005 REVAMP_PLAN.html built at ~/Desktop/REVAMP_PLAN.html (15 pages)

**Checkpoint**: Planning artifacts complete. Ready for foundational execution.

---

## Phase 2: Foundational — Verify Live State Before Any Build

**Purpose**: Confirm all external dependencies are actually reachable. Per Blueprint OS PG.09 Step 1.

- [ ] T006 [P] Verify Obsidian REST API live: `curl -sk -H "Authorization: Bearer $OBSIDIAN_TOKEN" https://127.0.0.1:27124/vault/` — must return JSON file list
- [ ] T007 [P] Verify EAS auth: `eas whoami` — must return `jimbo36`
- [ ] T008 [P] Verify git state: `git status --short && git log --oneline -3` — confirm on branch `001-blueprint-os-revamp`
- [ ] T009 [P] Verify Supabase CLI: `supabase --version` — required for edge function deploys in Phase 4

**Checkpoint**: All tools reachable. User story execution begins.

---

## Phase 3: US1 — Claude Code Boots Under Blueprint OS v0.3 (Priority: P1) 🎯 MVP

**Goal**: CLAUDE.md becomes the machine-deployable version of Blueprint OS v0.3. Every session auto-starts with the 7-step protocol, fires the Define Gate, ends with rubric + Obsidian log + improved blueprint.

**Independent Test**: Open Claude Code cold. Give zero instructions. It MUST: read sprint state, check unstaged code, verify connections, report state, ask "What are we executing?" — all within first response.

**R-numbers**: R-001–R-009

- [ ] T010 Read ~/Downloads/BLUEPRINT_OS_MASTER.pdf (all 15 pages) — load full v0.3 content into context before any writes
- [ ] T011 [US1] Rewrite ~/CLAUDE.md — embed ALL Blueprint OS v0.3 protocols verbatim from PDF: DABI lifecycle, Define Gate trigger conditions (PG.05), Ralph Loop with convergence signals (PG.06), Council system with all 5 members + voices + FIRES ON column (PG.07), Research Agent triggers + brief format (PG.08), session start 7-step sequence (PG.09), session end 7-step sequence (PG.09), 10-dimension rubric blank table (PG.11), self-improvement protocol + version table (PG.10), 12 Never-Break rules verbatim numbered (PG.13), token efficiency rules R-TOKEN-1 through R-TOKEN-5 with violation patterns (PG.14), session budget protocol (PG.15), model routing table (Haiku/Sonnet/Opus), connection verify table — per R-001–R-009
- [ ] T012 [US1] Write ~/cooperbrain-kit/templates/CLAUDE.md — copy of the rewritten ~/CLAUDE.md so install.sh deploys it on any new machine — per kit portability requirement
- [ ] T013 [US1] Verify ~/CLAUDE.md structure: grep for "DEFINE GATE", "RALPH LOOP", "10-DIMENSION RUBRIC", "TOKEN EFFICIENCY", "12 RULES" — all must appear as section headers
- [ ] T014 [US1] Commit: `git add ~/CLAUDE.md && git commit -m "[R-001–R-009] CLAUDE.md rewrite — Blueprint OS v0.3 fully deployed"`

**Checkpoint (US1)**: CLAUDE.md contains all v0.3 protocols. Cold-open test passes. Rule 01 enforced structurally.

---

## Phase 4: US2 — Twirl App Ships to App Store (Priority: P1)

**Goal**: EAS submission succeeds. Browse screen has search. Payments work end-to-end. Lenders receive 85% via Stripe Connect.

**Independent Test**: `eas submit --platform ios --latest` completes without error. App Store Connect shows build in TestFlight. Browse screen search filters items. Rental payment creates PaymentIntent. Return triggers payout.

**R-numbers**: R-010–R-015

- [ ] T015 [P] [US2] Remove `@expo-google-fonts/fraunces` from package.json — already confirmed 0 imports by grep. Run `npm install` after removal — per R-012
- [ ] T016 [P] [US2] Restore TextInput search bar in `app/(tabs)/browse.tsx` — add controlled TextInput with `value`/`onChangeText` state, filter displayed items array by keyword match on item name/description — per R-011
- [ ] T017 [US2] Deploy create-payment-intent edge function: `supabase functions deploy create-payment-intent` — function is already fully implemented at `supabase/functions/create-payment-intent/index.ts` — per R-013
- [ ] T018 [US2] Verify release-deposit edge function: read `supabase/functions/release-deposit/index.ts` — confirm 85% payout logic (`amount * 0.85`) and Stripe Connect transfer. Deploy: `supabase functions deploy release-deposit` — per R-014
- [ ] T019 [US2] Verify unread_count mapping in `app/(tabs)/messages.tsx` line 58 — confirm `viewerIsUser1 ? c.unread_user1 : c.unread_user2` is present and correct — per R-015
- [ ] T020 [US2] Trigger new EAS build from latest commit (3a9cc7d — includes tab redesign, design tokens, all bug fixes): `eas build --platform ios --profile production` — per R-010. Do NOT use the stale .ipa from build f615ddf8.
- [ ] T021 [US2] Monitor build: poll `eas build:list --platform ios --limit 1` until status = FINISHED. Then immediately run: `eas submit --platform ios --latest` — per R-010
- [ ] T022 [US2] Commit all Twirl changes: `git add app/(tabs)/browse.tsx package.json package-lock.json && git commit -m "[R-011,R-012] restore browse search + remove fraunces dep"`

**Checkpoint (US2)**: Browse search works. Edge functions deployed. EAS submission in progress. Commit pushed.

---

## Phase 5: US3 — All MCP Connections Live and Verified (Priority: P2)

**Goal**: All 9 MCPs in ~/.cursor/mcp.json respond to a test tool call. blueprint-os MCP tools (bp_session_start, bp_define_gate, etc.) callable from Claude Code.

**Independent Test**: `/mcp` shows blueprint-os connected. `bp_define_gate` returns a gate classification. `bp_memory_read` with vault_path "Active/Sprint.md" returns sprint content.

**R-numbers**: R-016–R-019

- [ ] T023 [P] [US3] Verify obsidian-bridge.mjs at ~/.cooperbrain/obsidian-bridge.mjs exposes MCP-compatible tool definitions — read the file and check for `tools` array with `inputSchema`. If not MCP-compatible, install `npx @modelcontextprotocol/server-obsidian` and update the config path — per R-018
- [ ] T024 [US3] Add Obsidian MCP block to ~/.cursor/mcp.json — use `node ~/.cooperbrain/obsidian-bridge.mjs` as command with `OBSIDIAN_TOKEN` + `OBSIDIAN_URL` env vars — per R-016, R-018
- [ ] T025 [US3] Add Manus MCP placeholder block to ~/.cursor/mcp.json — command: `npx -y manus-mcp-client`, env: `MANUS_MCP_API_KEY: "${MANUS_MCP_API_KEY}"`. Add even without key — placeholder ready for when Cooper provides key — per R-016, R-019
- [ ] T026 [US3] Verify blueprint-os MCP is active: read ~/.claude/settings.json and ~/.cursor/mcp.json — confirm blueprint-os block is present with correct absolute path to `~/cooperbrain-kit/mcp/blueprint-os-server.js` — per R-017
- [ ] T027 [US3] Test blueprint-os MCP tool: call `bp_define_gate` — verify it returns a gate classification based on current git status — per R-017

**Checkpoint (US3)**: All 9 MCP blocks present. blueprint-os tools callable. Obsidian MCP wired.

---

## Phase 6: US4 — Blueprint OS HTML Dashboard (Priority: P2)

**Goal**: ~/Desktop/blueprint-os-v2.html opens in any browser, all 15 sections render, standalone, fillable rubric, matches Blueprint OS visual language.

**Independent Test**: Open in Safari with no internet. All 12 section headers appear. Rubric table has all 11 dimensions. No JS errors in console.

**R-numbers**: R-026–R-030

- [ ] T028 [US4] Read ~/Downloads/BLUEPRINT_OS_MASTER.pdf (if not already in context) — extract all content from all 15 pages to use as source
- [ ] T029 [US4] Build ~/Desktop/blueprint-os-v2.html — single self-contained HTML file with: grid paper background (#f5f0e8), Courier New monospace, color coding (blue=Define, green=Build, red=Critical, orange=Warning), corner brackets, page headers/footers, // comment-style section headers — 12 navigable sections: Cover+Changelog, System Architecture (3-layer Neuro/Agent/Skill), DABI Lifecycle, Define Gate + proof, Ralph Loop + convergence signals table, Council System (5 members + live May 24 example), Research Agent (triggers + brief format), Memory+Connections (7-step start/end + verify table), Self-Improvement Protocol (version table), Review Rubric (live session scores + blank 11-dim fill), Quick Reference + 12 Never-Break Rules, Token Efficiency Rules + Session Budget Protocol — per R-026–R-030
- [ ] T030 [US4] Verify ~/Desktop/blueprint-os-v2.html: open in Safari, confirm no JS console errors, all 12 sections render, rubric table has 11 rows, file opens without internet — per R-026, R-029
- [ ] T031 [US4] Verify blueprint-os-v2.html is standalone: check HTML source for any external `<script src>` or `<link href>` pointing to CDN — must have none — per R-026

**Checkpoint (US4)**: Blueprint OS HTML dashboard live. Self-improvement loop artifact complete. Cooper can send to claude.ai for external sharpening.

---

## Phase 7: US5+US6 — Cloud OS Audit + CooperBrain OS (Priority: P3)

**Goal**: All 4 Cloud OS HTML files open clean. Architecture references match Blueprint OS v0.3 (Neuro/Agent/Skill). CooperBrain OS audited against 002 spec.

**Independent Test**: Each file opens in Safari with 0 JS errors. Any v0.3 architecture reference uses correct 3-layer names.

**R-numbers**: R-031–R-039

- [ ] T032 [P] [US5] Audit ~/agent-os.html — open in browser, check JS console, grep HTML for layer architecture references, verify uses "Neuro/Agent/Skill" not legacy names — per R-031, R-033
- [ ] T033 [P] [US5] Audit ~/creative-os.html — same checks: JS errors, layer name consistency — per R-031, R-033
- [ ] T034 [P] [US5] Audit ~/life-os.html — same checks — per R-031, R-033
- [ ] T035 [US5] Audit ~/cooperbrain-os.html — check JS errors, verify 5-member Council (Architect, Operator, Skeptic, Strategist, Accountant) is accurately represented, check v0.3 3-layer architecture consistency — per R-031, R-034
- [ ] T036 [US6] Read .specify/specs/002-cooperbrain-os/spec.md — extract all phase names and key deliverables. Audit ~/cooperbrain-os.html against them — document which phases are present, which are missing — per R-037, R-038
- [ ] T037 [US6] Verify ~/cooperbrain-os.html is standalone — no external dependencies — per R-039
- [ ] T038 [US5] For any Cloud OS file with audit finding: patch the specific section (surgical edit only, no full rebuild) — per R-033, R-034

**Checkpoint (US5+US6)**: All 4 files pass audit. No JS errors. Architecture consistent with v0.3.

---

## Phase 8: Obsidian Protocol + CooperBrain Connections

**R-numbers**: R-020–R-025

- [ ] T039 Update ~/Obsidian Vault/Active/Sprint.md to reflect post-revamp state — check off completed domains, add Manus key + NOWPayments key as open external blockers — per R-020
- [ ] T040 Write session log to ~/Obsidian Vault/Sessions/2026-05-25.md — include: what shipped (R-numbers), what's open, EAS build status, external blockers — per R-021
- [ ] T041 Verify RAG system placeholder: create ~/cooperbrain-rag/ directory with requirements.txt (transformers, sentence-transformers, faiss-cpu, markdown) and ingest.py stub — per R-024. Full ingest runs after vault has substantial content.
- [ ] T042 Verify ~/.cooperbrain/manus.py exists and is executable — was created by install.sh. Confirm `python3 ~/.cooperbrain/manus.py --help` runs without import error — per R-023

---

## Phase 9: Polish + Final Smoke Tests

- [ ] T043 [P] ScrapYard domain audit: verify scrapyard.to loads and all 11 games are accessible — per R-036. NOWPayments blocked — document `NOWPAYMENTS_API_KEY` as required in Active/Sprint.md
- [ ] T044 [P] Final git status: verify all committed changes are pushed to `origin/001-blueprint-os-revamp`
- [ ] T045 Cold-open smoke test — open new Claude Code session, give zero instructions — verify 7-step session start runs automatically, Obsidian sprint is read, Define Gate fires correctly on any unstaged changes — per SC-001, SC-002
- [ ] T046 Fill 10-dimension rubric honestly for this session — per SC-008 and Blueprint OS PG.11
- [ ] T047 Self-critique: identify 1-3 weaknesses in CLAUDE.md or blueprint reasoning — classify each (AMBIGUOUS/MISSING/WRONG_ORDER/OVERSPECIFIED)
- [ ] T048 Rewrite weak sections in ~/CLAUDE.md. Increment version v0.3 → v0.4. Add changelog entry.
- [ ] T049 Return improved ~/CLAUDE.md + filled rubric to Cooper — Cooper sends to claude.ai for external adversarial sharpening

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)          → DONE ✓
Phase 2 (Foundational)   → Run immediately, no deps
Phase 3 (US1 CLAUDE.md)  → After Phase 2 ✓
Phase 4 (US2 Twirl)      → After Phase 2. Parallel with Phase 3.
Phase 5 (US3 MCP)        → After Phase 2. Parallel with 3+4.
Phase 6 (US4 HTML)       → After Phase 2. Parallel with 3+4+5.
Phase 7 (US5+6 Audit)    → After Phase 2. Parallel with 3+4+5+6.
Phase 8 (Obsidian+RAG)   → After Phase 3 (CLAUDE.md must be done first)
Phase 9 (Polish)         → After all phases complete
```

### Parallel Opportunities in Tier 0

All of these can run simultaneously:
- T010–T014 (CLAUDE.md rewrite)
- T015–T016 (Twirl search + fraunces)
- T017 (edge function deploy)
- T023–T024 (MCP wiring)
- T028–T029 (Blueprint OS HTML build)
- T032–T035 (Cloud OS audits)

### External Blockers (do not hold up other tasks)

| Task | Blocked On | Owner |
|------|-----------|-------|
| T025 (Manus MCP) | MANUS_MCP_API_KEY | Cooper → manus.im |
| T043 (NOWPayments) | NOWPAYMENTS_API_KEY | Cooper → nowpayments.io |
| T021 (EAS submit) | EAS build must FINISH first | EAS queue (~5 min) |

---

## Parallel Example: Tier 0 Launch

```
Simultaneously start:
  Agent A → T010–T014: CLAUDE.md full rewrite (highest priority)
  Agent B → T015–T022: Twirl fixes + EAS build trigger
  Agent C → T023–T027: MCP config verification + wiring
  Agent D → T028–T031: Blueprint OS HTML dashboard build
  Agent E → T032–T038: Cloud OS audit (read-only, fast)
```

---

## Implementation Strategy

### MVP (Phase 3 only): CLAUDE.md rewrite
- Complete T010–T014
- Cold-open test passes
- Blueprint OS v0.3 is live on this machine

### Full Revamp (all phases in order):
1. Phase 2: Verify live state
2. Phases 3–7: Tier 0 in parallel
3. Phase 8: Memory + connections
4. Phase 9: Smoke tests + rubric + improved blueprint returned

### On a New Machine (via cooperbrain-kit):
```bash
git clone [repo]/cooperbrain-kit ~/cooperbrain-kit
cd ~/cooperbrain-kit && chmod +x install.sh && ./install.sh
# Add OBSIDIAN_TOKEN to ~/.zshrc
# Open Claude Code → /bp-start
```
