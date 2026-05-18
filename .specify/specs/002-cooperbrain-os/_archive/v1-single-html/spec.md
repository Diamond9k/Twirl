# Feature Specification: CooperBrain OS

**Feature Branch**: `002-cooperbrain-os`
**Created**: 2026-05-11
**Status**: Draft
**Input**: Self-contained HTML dashboard — live command center for the CooperBrain system

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Session Start Handoff (Priority: P1)

Cooper opens his browser before starting a Claude Code session. In under 10 seconds he can see today's blocker, days until May 24, current sprint task, and which connections are live — without typing anything or dumping context into the chat.

**Why this priority**: Every session currently starts with a context re-dump. This eliminates that overhead. A 30-second visual read replaces a 3-message setup sequence.

**Independent Test**: Open `cooperbrain-os.html` cold. Without any other action, verify the dashboard shows: sprint status, connection health, days to deadline, and the top-priority task. This delivers value even if no other section is built.

**Acceptance Scenarios**:

1. **Given** Obsidian is running and the REST API is live, **When** Cooper opens the dashboard, **Then** the Sprint section shows the current content of `Active/Sprint.md` within 2 seconds
2. **Given** Obsidian is NOT running, **When** Cooper opens the dashboard, **Then** the Sprint section shows "Obsidian offline" with a red indicator — it does not crash or show a blank screen
3. **Given** the dashboard is open for 60 seconds, **When** it auto-refreshes, **Then** any vault changes appear without a manual page reload

---

### User Story 2 — Deadline and Budget Awareness (Priority: P2)

Cooper glances at the dashboard at any point in the day and immediately knows: days until May 24, days until August rush, and budget remaining — without opening a spreadsheet, a note, or asking me.

**Why this priority**: Deadline and budget slippage happen when they're not visible. Making them unavoidable prevents drift.

**Independent Test**: Open the dashboard. Verify the countdown and budget figures are visible above the fold on a 13" MacBook screen without scrolling.

**Acceptance Scenarios**:

1. **Given** today is May 11 2026, **When** the dashboard loads, **Then** it shows "13 days to Camp Ozark" and "107 days to August rush" with correct arithmetic
2. **Given** Cooper updates the budget figure in localStorage, **When** the page refreshes, **Then** the new figure persists and is displayed
3. **Given** the deadline has passed, **When** the dashboard loads, **Then** the countdown shows "0 days — deadline passed" in red, not a negative number

---

### User Story 3 — Connection Health (Priority: P2)

Cooper can see at a glance which system connections are live (green), unconfigured (yellow), or dead (red): Obsidian, Manus, RAG, Spec Kit.

**Why this priority**: Half the friction in sessions comes from discovering a connection is broken mid-task. Surface this at startup instead.

**Independent Test**: With Obsidian running and Manus unconfigured, open the dashboard. Obsidian shows green, Manus shows yellow ("needs API key"), RAG shows yellow ("not indexed"), Spec Kit shows green.

**Acceptance Scenarios**:

1. **Given** Obsidian REST API responds at localhost:27124, **When** the dashboard loads, **Then** Obsidian shows a green dot and "live"
2. **Given** Obsidian is unreachable, **When** the dashboard loads, **Then** Obsidian shows a red dot and "offline" — the rest of the dashboard still loads
3. **Given** `~/cooperbrain-rag/` directory does not exist, **When** the dashboard loads, **Then** RAG shows yellow and "not built"

---

### User Story 4 — Task List at a Glance (Priority: P3)

Cooper sees the current speckit task list from `TWIRL-LAUNCH/tasks.md` rendered as a readable checklist. He can mark tasks complete directly on the dashboard, and the state persists in localStorage.

**Why this priority**: Useful but not blocking. Session handoff (P1) works without this.

**Independent Test**: Open dashboard. Verify task list renders. Check off one task. Reload. Verify the checked state persists.

**Acceptance Scenarios**:

1. **Given** the tasks.md file is readable via Obsidian API or direct file reference, **When** the dashboard loads, **Then** the task list renders with phase headers and individual tasks
2. **Given** Cooper checks a task, **When** he reloads the page, **Then** that task remains checked
3. **Given** tasks.md is unreachable, **When** the dashboard loads, **Then** the task section shows "tasks unavailable" — not a blank section

---

### Edge Cases

- What if localhost:27124 is slow to respond? → 3-second fetch timeout per connection; show "checking..." during pending state, never block rendering
- What if localStorage is full or disabled? → Degrade gracefully; checkboxes still work in-session, just don't persist
- What if Cooper opens the dashboard on his PC (Windows)? → Vault path differs; connection checks use the same API URL so this still works if Obsidian is running and the port is the same
- What if the Obsidian token rotates? → Token is read from a `<meta>` tag or a config block at the top of the HTML file so Cooper only edits one place

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST load and render completely in a single HTML file with no external dependencies, no build step, and no local server
- **FR-002**: System MUST attempt a live fetch from the Obsidian REST API on load and on each 60-second auto-refresh cycle
- **FR-003**: System MUST display a connection health indicator (green/yellow/red) for each of: Obsidian, Manus, RAG System, Spec Kit
- **FR-004**: System MUST display a real-time countdown to May 24 2026 and August 1 2026, computed from the system clock — no hardcoded strings
- **FR-005**: System MUST display current budget remaining, editable by Cooper and persisted in localStorage
- **FR-006**: System MUST display the content of `Active/Sprint.md` from the Obsidian vault if the API is reachable
- **FR-007**: System MUST display the locked HOR decisions table (static — not fetched, these are finalized)
- **FR-008**: System MUST display a task list with persistent checkboxes (localStorage) derived from the speckit tasks
- **FR-009**: System MUST degrade gracefully for every connection failure — no section may show a blank white box or JS error on screen
- **FR-010**: System MUST store the Obsidian API token in a single editable config block at the top of the file — not scattered through the code

### Key Entities

- **Connection**: name, status (live/unconfigured/offline), last-checked timestamp, check function
- **Sprint**: raw markdown content from vault, rendered as formatted text
- **Deadline**: name, target date, days remaining (computed), urgency level
- **Task**: id, phase, text, checked state (localStorage), phase header
- **BudgetEntry**: current amount (localStorage), last-updated timestamp

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dashboard reaches a fully rendered, readable state in under 3 seconds on first open (Obsidian running)
- **SC-002**: Cooper can extract his top-priority task and deadline status with a single glance — no scrolling required on a 13" screen
- **SC-003**: All four connection indicators update within 5 seconds of a connection state change (Obsidian goes down → red within next refresh cycle)
- **SC-004**: Session start time (first message to Claude Code) decreases — Cooper types "execute T-06" instead of a 3-paragraph context dump
- **SC-005**: Zero broken UI states — every section shows something useful even when its data source is unavailable

---

## Assumptions

- Obsidian is the authoritative data store — the dashboard reads from it, never writes task state back to it (task state lives in localStorage)
- The Obsidian REST API token changes rarely; updating it means editing one line in the HTML file
- Cooper runs this on his Mac in a modern browser (Safari or Chrome) — no IE/Edge legacy support needed
- The dashboard does not need authentication — it runs locally on his machine, not served publicly
- Spec Kit tasks are stable enough to be partially static — the phase structure doesn't change every session
- CooperBrain OS is a developer tool for Cooper only, not a user-facing Twirl feature — design is functional first, aesthetics second
- RAG system and Manus are checked by probing their expected file locations/config, not by live API ping (since they may not have servers)
