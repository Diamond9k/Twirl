# Feature Specification: Blueprint OS v0.3 Full System Revamp

**Feature Branch**: `001-blueprint-os-revamp`
**Created**: 2026-05-25
**Status**: Draft
**Version**: 1.0

---

## Overview

A full-system revamp applying Blueprint OS v0.3 protocols across every project Cooper has built. This is not a feature — it is an operating system upgrade. After completion, Claude Code operates under Blueprint OS v0.3 every session without additional prompting, every project is wired to its correct services, and every connection is live and verified.

Nine domains. All traceable to R-numbers. Nothing ships without passing its acceptance criteria.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Claude Code Boots Under Blueprint OS v0.3 (Priority: P1)

Cooper opens Claude Code from `~/Twirl-Hub/repo/Twirl/`. Without any additional prompting, Claude Code runs the 7-step session start protocol: reads memory, checks unstaged code, fires the Define Gate if needed, verifies connections, reports what is working and what is broken, and asks what Cooper wants to execute.

**Why this priority**: Every other user story depends on Claude Code behaving correctly from session start. If the OS layer isn't embedded, every session requires manual setup.

**Independent Test**: Open Claude Code cold, give no instructions. Observe that it runs the session start protocol automatically, reads Active/Sprint.md from Obsidian, and delivers a state report within the first response.

**Acceptance Scenarios**:

1. **Given** Claude Code is opened from the Twirl directory, **When** the session starts with no user input, **Then** Claude Code reads CLAUDE.md → MEMORY.md → Sessions/latest → Active/Sprint.md and reports: connections status, #1 blocker, days since launch, top task
2. **Given** there are unstaged changes from a prior session, **When** session starts, **Then** the Define Gate fires — Claude Code writes R-numbers from memory/spec BEFORE reading any diff
3. **Given** a session ends, **When** Cooper says "end session", **Then** Claude Code fills the 10-dimension rubric, writes session log to Obsidian, updates Active/Sprint.md, commits code, and returns improved blueprint v+1

---

### User Story 2 — Twirl App Ships to App Store (Priority: P1)

Cooper submits Twirl to the App Store via EAS. The submission succeeds on the first attempt. The app launches without crashes. The browse screen has a search bar. Payments process via Stripe. Lenders receive payouts.

**Why this priority**: This is the May 24 goal (now post-deadline). Revenue requires App Store presence.

**Independent Test**: EAS submission completes with status UPLOADED. TestFlight build appears in App Store Connect. Browse screen shows search bar. Rental flow completes end-to-end including payment.

**Acceptance Scenarios**:

1. **Given** EAS is configured, **When** `eas submit` runs, **Then** the submission succeeds and the build appears in App Store Connect with no errors
2. **Given** the app is running, **When** the browse screen loads, **Then** a functional search bar is visible and filters items by keyword
3. **Given** a rental is created, **When** the renter taps Pay, **Then** a payment intent is created, charged, and the rental status updates to paid
4. **Given** a rental is returned, **When** the lender marks it returned, **Then** 85% of the payment is transferred to the lender's Stripe Express account

---

### User Story 3 — All MCP Connections Live and Verified (Priority: P2)

Cooper opens Cursor. All 7 MCP servers appear connected: GitHub, Supabase, Stripe, Hostinger, Obsidian, and Manus. Each tool is callable. No authentication errors.

**Why this priority**: Dead MCPs break every workflow that depends on external services.

**Independent Test**: Run `/mcp` in Claude Code. All 7 servers show as connected. Execute one tool from each server and receive a valid response.

**Acceptance Scenarios**:

1. **Given** `~/.cursor/mcp.json` is updated, **When** Cursor opens, **Then** GitHub, Supabase, Stripe, Hostinger, Obsidian, and Manus all show as connected
2. **Given** the Obsidian MCP is live, **When** a read is requested on `Active/Sprint.md`, **Then** the current sprint content is returned
3. **Given** the Manus MCP is live, **When** a research task is dispatched, **Then** a job ID is returned and status is trackable

---

### User Story 4 — Blueprint OS HTML Dashboard Live (Priority: P2)

Cooper opens `~/Desktop/blueprint-os-v2.html` in a browser. The full Blueprint OS v0.3 system renders as an interactive single-file dashboard with all 15 pages of content: architecture diagram, DABI lifecycle, Define Gate, Ralph Loop, Council system, Research Agent, Memory system, Self-Improvement protocol, Review Rubric, Token Efficiency rules, Quick Reference, and 12 Never-Break Rules.

**Why this priority**: The HTML file is the shareable, browser-renderable version of the OS — used for onboarding, self-improvement loop, and external sharpening.

**Independent Test**: Open file in Safari. All 15 sections render. Navigation works. Machine-readable text layer present. File is standalone (no external deps).

**Acceptance Scenarios**:

1. **Given** the HTML file exists at `~/Desktop/blueprint-os-v2.html`, **When** opened in any modern browser, **Then** all sections render without errors and all navigation is functional
2. **Given** the file is standalone, **When** opened without internet connection, **Then** all content renders completely
3. **Given** the 10-dimension rubric section, **When** viewed, **Then** a fillable blank rubric is visible with all 10 dimensions

---

### User Story 5 — Cloud OS Suite Verified and Consistent (Priority: P3)

Cooper opens BrainOS, AgentOS, CreativeOS, and LifeOS HTML files. Each renders correctly, links between them work where applicable, and all are consistent with Blueprint OS v0.3 architecture (3-layer: Neuro/Agent/Skill).

**Why this priority**: These files are built. Verification is lower effort than the others, but consistency matters for the ecosystem narrative.

**Independent Test**: Open each file. Check for rendering errors. Spot-check 3 Blueprint OS concepts in each file for consistency.

**Acceptance Scenarios**:

1. **Given** all 4 HTML files exist in `~/`, **When** each is opened, **Then** none produce JavaScript errors and all sections render
2. **Given** Blueprint OS v0.3 defines 3 layers (Neuro, Agent, Skill), **When** any Cloud OS file references the architecture, **Then** it uses the v0.3 layer names and descriptions

---

### User Story 6 — CooperBrain OS Built (Priority: P3)

Cooper opens `~/cooperbrain-os.html`. The full CooperBrain OS renders from the spec at `.specify/specs/002-cooperbrain-os/`. All phases complete. The file is the single-file interactive hub Cooper envisioned.

**Why this priority**: Spec is written. This is execution-only. Deferred since May 24 for good reason.

**Independent Test**: File exists, opens without errors, renders all phases from the spec.

**Acceptance Scenarios**:

1. **Given** the spec at `002-cooperbrain-os` exists, **When** CooperBrain OS is built, **Then** `~/cooperbrain-os.html` exists and all spec sections are represented
2. **Given** the file opens, **When** interactive elements are used, **Then** they respond correctly with no console errors

---

### Edge Cases

- What if Obsidian is not running when session starts? → Report connection failure, skip vault steps, continue with available memory
- What if EAS submission fails again? → Circuit breaker fires after 3 attempts, Cooper gets 3 resolution paths with confidence scores
- What if a Cloud OS HTML file is missing from disk? → Report as broken in session start, add to sprint backlog
- What if the Manus API key is not available? → Skip Manus MCP block, document in Active/Sprint.md as blocked on external credential
- What if the Define Gate fires and R-numbers conflict with prior spec? → Surface conflict to Cooper before proceeding

---

## Requirements *(mandatory)*

### Domain 1: Claude Code Operating System (CLAUDE.md)

- **R-001**: CLAUDE.md MUST embed all Blueprint OS v0.3 protocols as executable instructions: DABI lifecycle, Define Gate, Ralph Loop, Council system, Research Agent system, Memory protocol (7-step start + 7-step end), Token Efficiency rules (R-TOKEN-1 through R-TOKEN-5), 12 Never-Break rules, and the 10-dimension review rubric
- **R-002**: CLAUDE.md MUST define the session start 7-step sequence as a mandatory, ordered checklist that Claude Code executes at the beginning of every session
- **R-003**: CLAUDE.md MUST define the session end 7-step sequence including: git commit, Obsidian log, Active/Sprint.md update, 10-dim rubric fill, self-critique, blueprint version increment, return improved blueprint to Cooper
- **R-004**: CLAUDE.md MUST define the Define Gate trigger conditions: clean → proceed normally; unstaged from prior session → write R-numbers from memory BEFORE reading diff
- **R-005**: CLAUDE.md MUST include the Council system with all 5 members (Architect, Operator, Skeptic, Strategist, Accountant) and their trigger conditions, voices, and output format
- **R-006**: CLAUDE.md MUST include model routing table: Haiku for read/synthesis/logging, Sonnet for code gen/Council/decisions, Opus for multi-file architecture only
- **R-007**: CLAUDE.md MUST include the 12 Never-Break rules verbatim with rule numbers
- **R-008**: CLAUDE.md MUST include token efficiency rules with violation patterns so Claude Code self-corrects before burning budget
- **R-009**: CLAUDE.md MUST remain structurally stable across sessions — no rewrites of sections that didn't change (R-TOKEN-5 compliance)

### Domain 2: Twirl App

- **R-010**: EAS submission failure MUST be diagnosed — root cause identified and fixed before resubmit
- **R-011**: Browse screen MUST restore a functional search TextInput that filters visible items by keyword
- **R-012**: The `@expo-google-fonts/fraunces` package MUST be removed from `package.json` if it has zero imports in the codebase
- **R-013**: `supabase/functions/create-payment-intent/index.ts` MUST be implemented: accept rental_id, create Stripe PaymentIntent for correct amount, return client_secret
- **R-014**: Stripe Express Connect payout flow MUST be implemented: after rental marked returned, release deposit, transfer 85% to lender's connected account
- **R-015**: The `unread_count` query in messages.tsx MUST be updated to use the correct schema columns `unread_user1` / `unread_user2` instead of the non-existent `unread_count` column

### Domain 3: MCP Server Configuration

- **R-016**: `~/.cursor/mcp.json` MUST contain working configuration blocks for all 7 MCPs: GitHub, Supabase, Stripe, Hostinger, Obsidian, and Manus
- **R-017**: Each MCP block MUST be verified live — a test tool call confirms the connection before marking as done
- **R-018**: Obsidian MCP MUST use the local REST API at `https://127.0.0.1:27124` with the `$OBSIDIAN_TOKEN` from `~/.zshrc`
- **R-019**: Manus MCP block MUST be added using the `MANUS_MCP_API_KEY` once obtained — placeholder documented if key not yet available

### Domain 4: Obsidian Vault Protocol

- **R-020**: `Active/Sprint.md` MUST exist in the Obsidian vault and be updated at every session end
- **R-021**: Session logs MUST be written to `Sessions/YYYY-MM-DD.md` at every session end using the session end protocol
- **R-022**: The Obsidian REST API token MUST be verified live (`curl -sk -H "Authorization: Bearer $OBSIDIAN_TOKEN" https://127.0.0.1:27124/vault/`) at every session start

### Domain 5: CooperBrain Connections

- **R-023**: `~/.cooperbrain/manus.py` MUST be created as a Python wrapper that dispatches tasks to Manus using the `MANUS_MCP_API_KEY`
- **R-024**: The RAG system at `~/cooperbrain-rag/` MUST be installed with `requirements.txt` and `ingest.py` — vault content ingested on first run
- **R-025**: `MANUS_MCP_API_KEY` MUST be sourced — either retrieved from Manus account or documented as a hard-block requiring Cooper's action

### Domain 6: Blueprint OS HTML Dashboard

- **R-026**: `~/Desktop/blueprint-os-v2.html` MUST be a single self-contained HTML file with no external dependencies
- **R-027**: The file MUST render all 15 Blueprint OS v0.3 pages as navigable sections: cover/changelog, system architecture, DABI lifecycle, Define Gate, Ralph Loop, Council system, Research Agent, Memory + Connections, Self-Improvement protocol, Review Rubric (live scores + blank), Quick Reference, Token Efficiency, Session Budget Protocol
- **R-028**: The file MUST include a fillable blank 10-dimension rubric (interactive or copy-paste ready)
- **R-029**: The file MUST include machine-readable text layer (no content locked inside images)
- **R-030**: Design MUST match Blueprint OS visual language: monospace font, grid paper background, color-coded sections (blue=define, green=build, red=critical, orange=warning)

### Domain 7: Cloud OS Audit

- **R-031**: All 4 Cloud OS files MUST exist on disk: `~/cooperbrain-os.html` (to be built), `~/agent-os.html`, `~/creative-os.html`, `~/life-os.html`
- **R-032**: Each existing file MUST open without JavaScript errors in Safari
- **R-033**: Any reference to Blueprint OS architecture in Cloud OS files MUST use v0.3 layer names (Neuro/Agent/Skill)
- **R-034**: BrainOS MUST be audited against the Blueprint OS Council system — verify 5-member Council is accurately represented

### Domain 8: ScrapYard

- **R-035**: NOWPayments API key MUST be added to ScrapYard's configuration — crypto payment option enabled
- **R-036**: All 11 games MUST be verified as live and functional at scrapyard.to

### Domain 9: CooperBrain OS Build

- **R-037**: `~/cooperbrain-os.html` MUST be built from the spec at `.specify/specs/002-cooperbrain-os/`
- **R-038**: All phases defined in the 002-cooperbrain-os spec MUST be represented in the output file
- **R-039**: The file MUST be standalone HTML with no external dependencies

---

### Key Entities

- **Blueprint OS**: The operating protocol document (v0.3 → v0.4+) that governs Claude Code behavior across all sessions
- **CLAUDE.md**: The machine-readable ground truth file that Claude Code loads every session — the physical deployment of Blueprint OS
- **Active/Sprint.md**: The live Obsidian file tracking current session state, blockers, and priorities
- **Session Log**: The per-session Obsidian file (`Sessions/YYYY-MM-DD.md`) recording what shipped, what's open, rubric scores
- **MCP Server**: Machine-to-machine connection point between Claude Code/Cursor and an external service
- **R-number**: A numbered, testable requirement traceable from spec through implementation to validation

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Claude Code runs the session start protocol automatically on every cold open — zero additional prompting required
- **SC-002**: The Define Gate fires correctly 100% of the time when unstaged prior-session code is detected
- **SC-003**: EAS submission succeeds — Twirl appears in App Store Connect TestFlight within 24 hours of resubmit
- **SC-004**: All 7 MCP servers respond to a test tool call within a single session — zero authentication failures
- **SC-005**: `~/Desktop/blueprint-os-v2.html` opens in under 2 seconds and renders all 15 sections without errors
- **SC-006**: Session end protocol completes in under 5 minutes — rubric filled, log written, sprint updated, commit pushed
- **SC-007**: Stripe payment intent flow processes a test rental end-to-end without manual intervention
- **SC-008**: 10-dimension rubric average ≥ 8.5/10 after first session running under the revamped Blueprint OS
- **SC-009**: Zero sessions end without a written Obsidian log after the revamp is deployed
- **SC-010**: All 4 Cloud OS HTML files open without JavaScript errors

---

## Assumptions

- Cooper will provide the `MANUS_MCP_API_KEY` when requested — if not available, Manus domain is parked as blocked
- Obsidian is running on the Mac at session start — if not, session start reports the failure and continues
- Stripe sandbox credentials are already configured in `.env` — live keys are out of scope
- ScrapYard's codebase is accessible on disk for the NOWPayments integration
- The Blueprint OS HTML build uses the PDF content from `~/Downloads/BLUEPRINT_OS_MASTER.pdf` as source of truth
- Cloud OS HTML files are at `~/cooperbrain-os.html`, `~/agent-os.html`, `~/creative-os.html`, `~/life-os.html` — these paths are from memory and will be verified before acting
- CooperBrain OS spec at `.specify/specs/002-cooperbrain-os/` is complete and ready for implementation
- `fraunces` has zero imports — this will be grep-verified before removing
