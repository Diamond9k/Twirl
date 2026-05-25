# Data Model: Blueprint OS v0.3 Full System Revamp

**Phase 1 Output** | **Date**: 2026-05-25

> This feature does not introduce new database tables. Key entities are files, configs, and protocols — not DB rows.
> Listed here as system entities with their key attributes and relationships.

---

## Entity 1: Blueprint OS Document

**What it represents**: The versioned protocol document that governs Claude Code behavior.

| Attribute | Value |
|-----------|-------|
| Source of truth | `~/Downloads/BLUEPRINT_OS_MASTER.pdf` (v0.3) |
| Machine deployment | `CLAUDE.md` (in repo root + ~/CLAUDE.md) |
| Visual deployment | `~/Desktop/blueprint-os-v2.html` |
| Version tracking | Changelog in CLAUDE.md + self-improvement loop per session end |
| Current version | v0.3 FINAL |
| Next version | v0.4 (after first session running under v0.3) |

**Relationships**: Blueprint OS → deploys to → CLAUDE.md → governs → every Claude Code session

---

## Entity 2: Session State

**What it represents**: The live record of a Claude Code session — read at start, written at end.

| Attribute | Value |
|-----------|-------|
| Live file | `~/Obsidian Vault/Active/Sprint.md` |
| Archive | `~/Obsidian Vault/Sessions/YYYY-MM-DD.md` (one per day) |
| Memory index | `~/.claude/projects/.../memory/MEMORY.md` |
| Git commit | Every passing task: `[Rn] description` prefix |

**State transitions**: OPEN → IN_PROGRESS (session start) → COMPLETED (session end + rubric fill)

---

## Entity 3: MCP Server Registry

**What it represents**: The configured connections between Claude Code / Cursor and external services.

| Server | Type | Config Location | Status |
|--------|------|----------------|--------|
| github | CLI (npx) | ~/.cursor/mcp.json | LIVE |
| supabase | Remote URL | ~/.cursor/mcp.json | LIVE |
| stripe | Remote URL | ~/.cursor/mcp.json | LIVE |
| hostinger-mcp | CLI (npx) | ~/.cursor/mcp.json | LIVE |
| higgsfield | Remote URL | ~/.cursor/mcp.json | LIVE |
| codex | CLI (npx) | ~/.cursor/mcp.json | LIVE |
| code-review | CLI (npx) | ~/.cursor/mcp.json | LIVE |
| obsidian | CLI (node) | ~/.cursor/mcp.json | MISSING — add |
| manus | CLI | ~/.cursor/mcp.json | MISSING — blocked on API key |

---

## Entity 4: CooperBrain Connection Layer

**What it represents**: The scripts, bridges, and wrappers that connect Claude Code to external intelligence services.

| File | Purpose | Status |
|------|---------|--------|
| `~/.cooperbrain/agent-loop.py` | Autonomous agent loop | EXISTS |
| `~/.cooperbrain/obsidian-bridge.mjs` | Obsidian REST API wrapper | EXISTS |
| `~/.cooperbrain/connections.md` | Connection state doc | EXISTS |
| `~/.cooperbrain/sms.sh` | SMS dispatch | EXISTS |
| `~/.cooperbrain/manus.py` | Manus task dispatcher | MISSING — build |
| `~/cooperbrain-rag/` | RAG ingest + query system | MISSING — install |

---

## Entity 5: Twirl Rental Payment Flow

**What it represents**: The Stripe payment state machine for a rental transaction.

```
PENDING → [create-payment-intent] → AUTHORIZED (intent captured manually)
AUTHORIZED → [renter pays] → PAID
PAID → [handoff confirmed] → ACTIVE
ACTIVE → [return confirmed] → [release-deposit] → COMPLETED
                           ↘ [damage claimed] → [capture deposit] → DISPUTED
```

| Edge Function | Status | Handles |
|---------------|--------|---------|
| create-payment-intent | IMPLEMENTED — needs deploy | rental fee + deposit hold |
| release-deposit | IMPLEMENTED — verify | deposit release + lender payout |
| create-connect-account | DEPLOYED (v2, ACTIVE) | lender Stripe Express onboarding |

---

## Entity 6: Blueprint OS HTML Dashboard

**What it represents**: The single-file browser-renderable version of Blueprint OS v0.3.

| Section | Source (PDF page) | Status |
|---------|------------------|--------|
| Cover + Changelog | PG.01 | BUILD |
| System Architecture (3 layers) | PG.02 | BUILD |
| DABI Lifecycle | PG.03–PG.04 | BUILD |
| Define Gate | PG.05 | BUILD |
| Ralph Loop | PG.06 | BUILD |
| Council System | PG.07 | BUILD |
| Research Agent | PG.08 | BUILD |
| Memory + Connections | PG.09 | BUILD |
| Self-Improvement Protocol | PG.10 | BUILD |
| Review Rubric (live + blank) | PG.11–PG.12 | BUILD |
| Quick Reference + Deployment | PG.13 | BUILD |
| Token Efficiency Rules | PG.14–PG.15 | BUILD |
