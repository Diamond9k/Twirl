# Implementation Plan: Blueprint OS v0.3 Full System Revamp

**Branch**: `001-blueprint-os-revamp` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/004-blueprint-os-revamp/spec.md`

> **Blueprint OS Reference**: This plan was generated following PG.03 (DABI Lifecycle — ARCHITECT phase).
> A01 → A02 → A03 → A04 → A05.  Do not start building until Cooper acknowledges A05.

---

## Summary

Apply Blueprint OS v0.3 across every project Cooper has built. Nine domains. 39 R-numbers.
Primary deliverable: CLAUDE.md becomes the machine-deployable version of Blueprint OS v0.3 — every session self-starts, self-ends, and self-improves without manual prompting. Secondary deliverables: Twirl ships to App Store, all 7 MCPs live, Blueprint OS HTML dashboard built.

**Research findings that changed the spec** (see research.md for full rationale):
- `create-payment-intent` is already fully implemented — task is deploy + verify, not build
- `unread_count` schema drift is already fixed in messages.tsx — task removed
- `~/cooperbrain-os.html` already exists — audit + update, not build from scratch
- EAS build #3 FINISHED — the .ipa exists. Failure was in submission, not build
- `~/.cooperbrain/` already exists with agent-loop.py, obsidian-bridge.mjs — not empty

---

## Technical Context

**Language/Version**: TypeScript (React Native / Expo SDK 54), Deno (Edge Functions), Python 3.x (CooperBrain scripts), HTML/JS (Cloud OS dashboards)
**Primary Dependencies**: expo-router v6, NativeWind v4, Supabase JS v2, Stripe SDK, EAS CLI, Obsidian REST API
**Storage**: Supabase PostgreSQL (project: qlulzatkhgblorbjndsz), Obsidian vault (~/Obsidian Vault), local HTML files (~/)
**Testing**: Binary pass/fail per R-number acceptance criterion. Ralph Loop on every build task.
**Target Platform**: iOS (Twirl), macOS browser (HTML dashboards), Claude Code CLI (CLAUDE.md)
**Project Type**: Multi-domain system revamp (mobile app + AI OS + connection layer)
**Performance Goals**: Session start protocol completes in under 60s. Blueprint OS HTML renders in under 2s.
**Constraints**: $389 remaining budget. No new paid services without Cooper approval. API keys already provisioned for all Tier 0 connections except Manus.
**Scale/Scope**: 1 app, 7 MCPs, 4 HTML files, 1 CLAUDE.md, 1 Obsidian vault, 1 mcp.json

---

## Constitution Check

> *Per Blueprint OS PG.03 — GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Ship before perfect | ✅ PASS | EAS submission is Tier 0 — first task in first tier |
| 2. No re-debating locked decisions | ✅ PASS | Supabase Edge Functions, Stripe, NativeWind, single campus — all preserved |
| 3. Spec before screen | ✅ PASS | Spec complete at spec.md before any code |
| 4. Schema is the contract | ✅ PASS | unread_user1/unread_user2 confirmed correct; no schema changes |
| 5. No hardcoded column positions | ✅ PASS | No column-index access in this feature |
| 6. Stripe only payment path | ✅ PASS | R-013/R-014 use Stripe exclusively |
| 7. 15% commission model | ✅ PASS | R-014 specifies 85% to lender (15% commission) |
| 8. Deposit held not charged | ✅ PASS | create-payment-intent uses `capture_method: manual` |
| 9. Council reviews architecture | ✅ PASS | Council not needed — no architecture decisions; all domains are execution |
| 10. Cooper understands his code | ✅ PASS | All changes are surgical patches; no magic abstractions |

**Constitution gate: PASS. No violations. Proceeding to Phase 1 design.**

---

## Project Structure

### Documentation (this feature)

```text
specs/004-blueprint-os-revamp/
├── plan.md           ← this file
├── research.md       ← Phase 0 output (all NEEDS CLARIFICATION resolved)
├── data-model.md     ← Phase 1 output (key entities)
├── quickstart.md     ← Phase 1 output (how to run this revamp)
├── contracts/        ← Phase 1 output (session protocol, MCP schema)
│   ├── session-protocol.md
│   └── mcp-config-schema.md
└── tasks.md          ← Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Files Touched (repository root)

```text
CLAUDE.md                                          ← Domain 1 (R-001–R-009): full rewrite
app/(tabs)/browse.tsx                              ← Domain 2 (R-011): restore search bar
package.json                                       ← Domain 2 (R-012): remove fraunces dep
supabase/functions/create-payment-intent/index.ts  ← Domain 2 (R-013): already built, deploy
supabase/functions/release-deposit/index.ts        ← Domain 2 (R-014): verify payout logic
```

### External Files Touched (outside repo)

```text
~/.cursor/mcp.json          ← Domain 3 (R-016–R-019): add Obsidian + Manus blocks
~/Obsidian Vault/           ← Domain 4 (R-020–R-022): Active/Sprint.md, session log protocol
~/.cooperbrain/manus.py     ← Domain 5 (R-023): Manus wrapper
~/cooperbrain-rag/          ← Domain 5 (R-024): RAG install
~/Desktop/blueprint-os-v2.html  ← Domain 6 (R-026–R-030): Blueprint OS HTML
~/agent-os.html             ← Domain 7 (R-031–R-034): Cloud OS audit
~/creative-os.html          ← Domain 7 (R-031–R-034): Cloud OS audit
~/life-os.html              ← Domain 7 (R-031–R-034): Cloud OS audit
~/cooperbrain-os.html       ← Domain 7 + 9 (R-031–R-039): audit existing build
```

---

## ARCHITECT Output — Build Site

> **Blueprint OS PG.03, A02–A04**: Dependency graph → Tier assignment → Coverage matrix.
> **PG.03, A05**: Report build site to Cooper. Do not start building until acknowledged.

### Dependency Graph

```
R-001–R-009 (CLAUDE.md)          ← no deps
R-010 (EAS diagnosis)            ← no deps
R-011 (browse search)            ← no deps
R-012 (fraunces removal)         ← no deps (grep already confirmed 0 imports)
R-013 (payment intent deploy)    ← no deps (implementation complete)
R-015 (unread_count verify)      ← no deps [VERIFIED FIXED — verify only]
R-016 (mcp.json add blocks)      ← no deps
R-020 (Obsidian Sprint.md)       ← no deps
R-022 (Obsidian token verify)    ← no deps
R-025 (Manus API key)            ← EXTERNAL BLOCK — Cooper must provide
R-026–R-030 (Blueprint OS HTML)  ← no deps (PDF is source of truth)
R-031–R-034 (Cloud OS audit)     ← no deps (files exist)
R-035–R-036 (ScrapYard)          ← no deps (NOWPayments key needed from Cooper)
R-037–R-039 (CooperBrain OS)     ← no deps (file exists, audit only)

R-014 (Stripe Connect payout)    ← R-013 (payment intent must be deployed)
R-017 (verify MCPs live)         ← R-016 (blocks must be added first)
R-018 (Obsidian MCP verify)      ← R-016
R-019 (Manus MCP block)          ← R-025 (needs API key)
R-021 (session log protocol)     ← R-020 (Sprint.md must exist first)
R-023 (Manus wrapper)            ← R-025 (needs API key)
R-024 (RAG install)              ← R-020 (vault needs content first)
```

### Tier Assignment (per Blueprint OS PG.03, A03)

> Tier 0 = no dependencies. Tier N = depends only on Tier N-1.
> Execute parallel within tiers. ADVERSARIAL REVIEWER at each tier boundary.

**TIER 0** — Execute in parallel, no blockers:
- T01: CLAUDE.md full rewrite → R-001–R-009
- T02: EAS submission diagnosis + resubmit → R-010
- T03: Browse screen search restore → R-011
- T04: Remove fraunces dep → R-012
- T05: Deploy create-payment-intent edge function → R-013
- T06: Verify unread_count mapping holds → R-015 *(verify only — already fixed)*
- T07: Add Obsidian + Manus MCP blocks to mcp.json → R-016
- T08: Write Active/Sprint.md to Obsidian vault → R-020
- T09: Verify Obsidian REST API token → R-022
- T10: Build Blueprint OS HTML dashboard → R-026–R-030
- T11: Audit Cloud OS files (agent-os, creative-os, life-os, cooperbrain-os) → R-031–R-034
- T12: Audit cooperbrain-os.html against 002 spec → R-037–R-039
- T13: ScrapYard NOWPayments + 11 games verify → R-035–R-036 *(blocked on NOWPayments key)*

**[ADVERSARIAL GATE T0→T1]** — P0/P1 findings block advancement.

**TIER 1** — Execute after Tier 0 passes adversarial gate:
- T14: Implement Stripe Connect payout flow → R-014 *(after payment intent deployed)*
- T15: Verify all 7 MCPs live with test calls → R-017, R-018
- T16: Write first session log to Obsidian → R-021 *(after Sprint.md written)*
- T17: Install RAG system at ~/cooperbrain-rag/ → R-024 *(after vault has content)*

**TIER 2** — Execute after Tier 1 passes adversarial gate:
- T18: Manus MCP block + Manus wrapper → R-019, R-023, R-025 *(blocked on Manus API key — Cooper's action)*

**TIER 3** — Final integration and smoke test:
- T19: Full session start protocol smoke test → SC-001, SC-002, SC-006, SC-009
- T20: Stripe payment intent end-to-end test → SC-007
- T21: 10-dimension rubric fill → SC-008

### Coverage Matrix (per Blueprint OS PG.03, A04)

| Success Criterion | Covered By | Tier |
|-------------------|------------|------|
| SC-001: Blueprint OS auto-boots | T01 (R-001–R-009) | T0 |
| SC-002: Define Gate fires correctly | T01 (R-004) | T0 |
| SC-003: EAS submission succeeds | T02 (R-010) | T0 |
| SC-004: All 7 MCPs respond | T07 + T15 (R-016–R-019) | T0/T1 |
| SC-005: Blueprint OS HTML renders | T10 (R-026–R-030) | T0 |
| SC-006: Session end ≤5 min | T01 (R-002–R-003) | T0 |
| SC-007: Stripe payment intent E2E | T05 + T14 (R-013–R-014) | T0/T1 |
| SC-008: Rubric avg ≥8.5 | T21 (embedded in CLAUDE.md) | T3 |
| SC-009: Zero sessions without Obsidian log | T16 (R-021) | T1 |
| SC-010: Cloud OS files open clean | T11 (R-031–R-034) | T0 |

All 10 SC covered. ✅

---

## External Blockers (Cooper's Action Required)

These cannot be unblocked by code — they require Cooper's input:

| Blocker | What's Needed | Affects |
|---------|---------------|---------|
| Manus API key | Log in at manus.im, get API key, `echo 'export MANUS_MCP_API_KEY="KEY"' >> ~/.zshrc` | T18 (R-019, R-023, R-025) |
| NOWPayments key | Get from NOWPayments account → add to ScrapYard config | T13 (R-035) |

Both are Tier 2+ — they do not block Tier 0 or Tier 1 work.
