# Feature Specification: Foundation Integrity

**Feature Branch**: `005-foundation-integrity`  
**Created**: 2026-05-28  
**Status**: Draft  
**Input**: User description: "Foundation Integrity — reconcile claimed-state vs actual-state across all foundational systems and establish one source of truth so they stop drifting."

## Overview

This is foundation/infrastructure work, **not Twirl product work** (Twirl launch hardening is handled in a separate context window).

**Core principle: one fact, one home.** Every integrity failure to date has been the same fact existing in two places with the copies disagreeing — `~/CLAUDE.md` said "Stripe sandbox" while `.env` shipped `pk_live`; `CLAUDE.md` claimed session logs were written every session while only 2 files existed across 18 days; connections were marked LIVE while Obsidian was unreachable. The goal is to reconcile every foundational system to ground truth and assign each fact exactly one authoritative home, so drift cannot recur.

Every requirement below is expressed as a binary PASS/FAIL check: *does the record match reality? y/n.*

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Source of Truth Established (Priority: P1)

The operator (and any future session) can rely on a single rule for where every kind of information lives: **Obsidian owns all facts and state; `CLAUDE.md` owns only behavior and protocol.** When the two ever disagree on a fact, Obsidian wins. `CLAUDE.md` is stripped of every volatile fact and instead points to Obsidian for current state.

**Why this priority**: This is the keystone. Without a single-home rule, every other reconciliation re-drifts within weeks — exactly what happened before. Fixing this once prevents the recurring root cause.

**Independent Test**: Open `~/CLAUDE.md` and scan for any fact that changes week-to-week (build numbers, bug status, sandbox/live mode, connection status). PASS only if none remain and each has been replaced by a pointer to its Obsidian home.

**Acceptance Scenarios**:

1. **Given** `CLAUDE.md` currently contains a "GROUND TRUTH bug status" block, **When** the source-of-truth rule is applied, **Then** that block is removed from `CLAUDE.md` and exists instead in Obsidian, with `CLAUDE.md` pointing to it.
2. **Given** a fact appears in both `CLAUDE.md` and Obsidian, **When** they disagree, **Then** the documented rule designates Obsidian as authoritative and the `CLAUDE.md` copy is removed (not edited to match).
3. **Given** a new piece of information needs a home, **When** the operator applies the test "changes week-to-week → Obsidian; rule about how Claude operates → CLAUDE.md", **Then** the correct destination is unambiguous.

---

### User Story 2 - Secrets Secured (Priority: P1)

The nine plaintext credentials currently sitting in `~/.cursor/mcp.json` are removed from cleartext and replaced with environment-variable references; the two highest-blast-radius keys are rotated; and no live secret value remains duplicated in any tracked or synced document.

**Why this priority**: This is the only foundational item carrying live security risk. Exposure is currently contained (the file is local-only, `600` perms, never pushed — `~/.cursor` has no git remote and `mcp.json` is not in commit history), so the response is calibrated rather than a full fire drill, but it must be closed.

**Independent Test**: Grep `~/.cursor/mcp.json` and all tracked/synced docs for live key prefixes (`sk-ant-`, `sk-proj-`, `ghp_`, `github_pat_`, etc.). PASS only if zero plaintext secret values are found and every credential resolves through an env reference.

**Acceptance Scenarios**:

1. **Given** `mcp.json` holds 9 plaintext credentials, **When** secrets are relocated, **Then** each is replaced by a `${ENV_VAR}` reference sourced from `~/.zshrc` and the config still functions.
2. **Given** the GitHub PAT and Hostinger token are the highest-blast-radius keys, **When** rotation is performed, **Then** the old values are invalidated at their providers and the new values exist only in `~/.zshrc`.
3. **Given** secret values were duplicated in `WINDOWS_CLAUDE_BOOTSTRAP.md` and possibly `Obsidian Vault/Connections/APIs.md`, **When** the purge runs, **Then** those documents contain only key *names and locations*, never values.

---

### User Story 3 - Connection Map Authoritative (Priority: P2)

A single authoritative connection map lives in Obsidian `Connections/`, listing every MCP server and external API, its real reachability status (verified, not claimed), a copy-paste verify command, and a last-verified timestamp.

**Why this priority**: Connection status is the most frequently-drifted fact class. A verifiable map with per-connection check commands turns "is it live?" from a guess into a one-command test.

**Independent Test**: For any connection in the map, run its listed verify command. PASS only if the live result matches the recorded status for every entry.

**Acceptance Scenarios**:

1. **Given** `CLAUDE.md` previously asserted connections were "LIVE", **When** the map is built, **Then** each entry's status reflects an actual reachability check performed during this work (e.g., Supabase MCP reachable; Stripe MCP not connected in Claude Code; Manus blocked).
2. **Given** a connection entry, **When** the operator runs its verify command later, **Then** the command exists, is correct, and its output confirms or contradicts the recorded status.

---

### User Story 4 - Memory Reconciled (Priority: P2)

The memory system (`~/.claude` memory files plus Obsidian) is audited for correctness and internal contradictions; stale "ground truth" is corrected so no two memory records disagree about the same fact.

**Why this priority**: Memory is what future sessions trust by default. Contradictory or stale memory silently propagates wrong decisions, but it is lower-risk than live secrets and depends on the source-of-truth rule (US1) being settled first.

**Independent Test**: Cross-check every memory record against current reality and against the Obsidian record of the same fact. PASS only if no contradictions remain.

**Acceptance Scenarios**:

1. **Given** a memory record names a file, flag, or status, **When** it is verified against the live system, **Then** it either matches reality or is corrected/deleted.
2. **Given** the same fact is recorded in both `~/.claude` memory and Obsidian, **When** they are compared, **Then** they agree (with Obsidian authoritative per US1).

---

### User Story 5 - Repositories De-duplicated (Priority: P3)

Each project resolves to exactly one canonical on-disk location; duplicate copies are archived or removed; canonical locations are recorded in Obsidian.

**Why this priority**: Duplicate repos create the risk that edits or audits land in the wrong tree, but this is cleanup that can follow the higher-risk reconciliations.

**Independent Test**: List all git repos under `~`. PASS only if each project (Twirl, MiroFish, etc.) has exactly one canonical copy and its location matches the Obsidian record.

**Acceptance Scenarios**:

1. **Given** three Twirl repos exist (`~/Twirl`, `~/Documents/Twirl`, `~/Twirl-Hub/repo/Twirl`), **When** de-duplication runs, **Then** the canonical one (`~/Twirl-Hub/repo/Twirl`) remains active and the others are archived or removed.
2. **Given** MiroFish is duplicated across `~/Downloads` and `~/twirl-simulation`, **When** resolved, **Then** one canonical copy remains and Obsidian records its location.

---

### User Story 6 - Project Catalog Complete (Priority: P3)

Every parked and revenue project has a one-page Obsidian record capturing what it is, where it lives on disk, its current state, and its resume trigger — so nothing is lost. Revenue projects are catalogued only; no feature work is performed on any catalogued project.

**Why this priority**: Cataloguing prevents projects from being forgotten, but it is documentation, not risk reduction, so it ranks last.

**Independent Test**: Enumerate parked/revenue projects (MiroFish, CloudOS dashboards, ScrapYard, AppFactory, RAG stub). PASS only if each has an Obsidian page with all four fields populated and the on-disk path is correct.

**Acceptance Scenarios**:

1. **Given** the list of parked/revenue projects, **When** the catalog is built, **Then** each has an Obsidian page with name, disk location, current state, and resume trigger.
2. **Given** a revenue project (CloudOS, ScrapYard, AppFactory), **When** it is catalogued, **Then** only a record is created and no code/feature change is made to it.

### Edge Cases

- What happens when a fact legitimately needs to be referenced in `CLAUDE.md` for Claude's behavior (e.g., "open from the Twirl dir")? → It stays as a *behavioral instruction*, not a *state fact*; the test in US1 distinguishes them.
- How is a secret handled if it cannot be rotated without breaking a live dependency (e.g., an in-use connected account)? → Relocate now, flag the rotation as deferred with the blocking dependency recorded.
- What happens if Obsidian (the source of truth) is unreachable during the work? → Writes block until it is restored; no facts are written to a second location as a workaround (that would reintroduce drift).
- What happens to a duplicate repo that contains unique uncommitted work? → It is not deleted until its unique content is reconciled into the canonical copy or explicitly recorded as discardable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define and document a single source-of-truth rule: Obsidian is authoritative for all facts and state; `CLAUDE.md` holds only behavior/protocol; on any disagreement, Obsidian wins.
- **FR-002**: `~/CLAUDE.md` MUST contain zero volatile facts (build numbers, bug status, sandbox/live mode, connection status, project state). Each removed fact MUST be replaced by a pointer to its Obsidian home.
- **FR-003**: All 9 credentials in `~/.cursor/mcp.json` MUST be replaced with environment-variable references; no plaintext secret value may remain in the file.
- **FR-004**: The GitHub PAT and Hostinger token MUST be rotated at their providers; the remaining credentials (OpenAI ×2, Anthropic, Obsidian ×2, Manus) MUST be relocated without mandatory rotation.
- **FR-005**: No live secret value may remain in any tracked or synced document (`WINDOWS_CLAUDE_BOOTSTRAP.md`, `Obsidian Vault/Connections/APIs.md`, and any others discovered); such documents MUST store key names and locations only.
- **FR-006**: A single authoritative connection map MUST exist in Obsidian `Connections/`, listing every MCP server and API with verified reachability status, a verify command, and a last-verified timestamp.
- **FR-007**: Every connection status in the map MUST reflect an actual reachability check performed during this work, not a claim copied from prior documentation.
- **FR-008**: The memory system (`~/.claude` memory files and Obsidian) MUST be audited so that no two records contradict each other about the same fact, and stale records MUST be corrected or deleted.
- **FR-009**: Each project MUST resolve to exactly one canonical on-disk location; duplicate copies MUST be archived or removed only after any unique content is reconciled.
- **FR-010**: Canonical project locations MUST be recorded in Obsidian.
- **FR-011**: Every parked and revenue project MUST have a one-page Obsidian catalog record containing name, disk location, current state, and resume trigger.
- **FR-012**: No feature/code work may be performed on any catalogued parked or revenue project as part of this feature.
- **FR-013**: Twirl product/launch hardening and the Stripe key swap MUST be excluded from this feature's scope.

### Key Entities

- **Fact/State Record**: A single piece of information that changes over time (status, mode, number). Authoritative home: Obsidian. Attributes: value, last-verified date, owning workstream.
- **Behavioral Rule**: An instruction governing how Claude operates (protocol, workflow). Authoritative home: `CLAUDE.md`. Does not change week-to-week.
- **Credential**: A secret (API key/token). Stored as an env-var reference in `~/.zshrc`; represented elsewhere only by name + location. Attributes: name, provider, blast-radius tier, rotated y/n.
- **Connection**: An MCP server or external API. Attributes: name, type, verified status, verify command, last-verified timestamp.
- **Project Catalog Entry**: A parked or revenue project record. Attributes: name, disk location, current state, resume trigger, worked-or-catalogued-only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of foundational facts have exactly one authoritative home; a scan of `~/CLAUDE.md` finds zero volatile facts remaining.
- **SC-002**: 0 plaintext secret values exist in `~/.cursor/mcp.json` or in any tracked/synced document; 9 of 9 credentials resolve through env references.
- **SC-003**: 2 of 2 highest-blast-radius keys (GitHub PAT, Hostinger) are rotated and the old values are confirmed invalid at their providers.
- **SC-004**: 100% of connection-map entries pass their own verify command (recorded status matches live result).
- **SC-005**: 0 contradictions remain across memory records when cross-checked against reality and against Obsidian.
- **SC-006**: Each project has exactly 1 canonical on-disk location matching its Obsidian record.
- **SC-007**: 100% of parked/revenue projects have an Obsidian catalog page with all four required fields populated.
- **SC-008**: A future session, reading only `CLAUDE.md` + Obsidian, can determine current true state with no contradictions surfaced.

## Assumptions

- Obsidian is reachable for the duration of the work (verified online this session via the Local REST API plugin / MCP bridge).
- Secret exposure is local-only: `~/.cursor` has no git remote, `mcp.json` is not in commit history, and file permissions are `600` — verified this session. The relocate-plus-targeted-rotation response is calibrated to that contained exposure.
- `~/Twirl-Hub/repo/Twirl` is the canonical Twirl repo (per existing `CLAUDE.md`).
- The operator performs provider-side actions that require human auth (regenerating the GitHub PAT and Hostinger token); Claude re-wires the references.
- Catalogued projects are intentionally frozen; reviving any of them is a separate future feature.
- Twirl money-flow work and Stripe test-mode keys are owned by a separate context window and are out of scope here.
