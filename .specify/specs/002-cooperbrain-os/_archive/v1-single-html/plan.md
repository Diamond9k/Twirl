# Implementation Plan: CooperBrain OS

**Branch**: `002-cooperbrain-os` | **Date**: 2026-05-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-cooperbrain-os/spec.md`

---

## Summary

A single self-contained HTML file (`~/cooperbrain-os.html`) that acts as a live command center. It reads from the Obsidian REST API over HTTP (not HTTPS, to avoid cert issues in browser), displays sprint status, connection health, countdown timers, budget, HOR decisions, and the speckit task list with persistent checkboxes. No build step. No server. Opens directly in browser via `file://` or double-click.

---

## Technical Context

**Language/Version**: HTML5 + Vanilla JS (ES2020) + CSS3
**Primary Dependencies**: None — zero external dependencies, fully offline-capable
**Storage**: localStorage (task state, budget, session notes) + Obsidian REST API (read-only, live)
**Testing**: Manual — open in browser, verify sections render, toggle checkboxes, reload
**Target Platform**: macOS Safari / Chrome, opened as local file
**Project Type**: Single-file developer dashboard
**Performance Goals**: Full render < 3 seconds; API fetch timeout 3s
**Constraints**: Must work as `file://` URL; no CDN; no build step; no server process
**Scale/Scope**: Single user (Cooper), runs on his Mac only

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|---|---|---|
| No re-debating locked decisions | PASS | HOR table is static/read-only display |
| Spec before code | PASS | This plan follows spec.md |
| No secrets in source | REQUIRES ATTENTION | Obsidian token in HTML file — see mitigation below |
| Single responsibility | PASS | Dashboard reads only, never writes to vault |
| No over-engineering | PASS | Single HTML file, vanilla JS, no abstractions |

**Token mitigation**: The Obsidian token lives in a `CONFIG` block at the very top of the HTML file, clearly labeled `// EDIT THIS`. It is never committed to the Twirl repo — the file lives at `~/cooperbrain-os.html`, outside the repo. This is acceptable for a local developer tool with no public exposure.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-cooperbrain-os/
├── plan.md         ← this file
├── research.md     ← Phase 0 complete
├── data-model.md   ← Phase 1 complete
└── tasks.md        ← Phase 2 (/speckit-tasks output)
```

### Source Code (output)

```text
~/cooperbrain-os.html    ← single output file, NOT in repo
```

The file is intentionally outside the Twirl repo to avoid committing the token and to make it a system-level tool, not a project file.

---

## Layout: Section Map

```
┌─────────────────────────────────────────────────────┐
│  COOPERBRAIN OS          [last refresh: 12:34:01]  │
├──────────────┬──────────────────────────────────────┤
│ CONNECTIONS  │  DEADLINES                           │
│ ● Obsidian   │  ⚡ 13 days → Camp Ozark (May 24)    │
│ ◑ Manus      │  📅 107 days → August Rush            │
│ ◑ RAG        ├──────────────────────────────────────┤
│ ● Spec Kit   │  BUDGET                              │
│              │  $389 remaining  [edit]              │
├──────────────┴──────────────────────────────────────┤
│ SPRINT                                              │
│ [Active/Sprint.md content or "not created yet"]     │
├─────────────────────────────────────────────────────┤
│ TASKS                    [collapse]                 │
│  Phase 0 — Schema Verification                     │
│  ☑ T-00  Confirm conversations column names        │
│  ☐ T-01  Confirm messages realtime enabled          │
│  ...                                               │
├─────────────────────────────────────────────────────┤
│ HOR DECISIONS (LOCKED)                              │
│  Remove Gluestack         8.4  EXECUTE             │
│  Supabase Edge Functions  8.5  EXECUTE             │
│  ...                                               │
├─────────────────────────────────────────────────────┤
│ SESSION NOTE                                        │
│  [textarea — persists in localStorage]              │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Breakdown

### Block 1: CONFIG + constants (~30 lines)
```html
<script>
// ══════════════════════════════════════════
// EDIT THIS BLOCK — your credentials
// ══════════════════════════════════════════
const CONFIG = {
  obsidian: { url: 'http://127.0.0.1:27124', token: 'YOUR_TOKEN' },
  deadlines: [ ... ],
  refresh_ms: 60000
}
const HOR_DECISIONS = [ ... ]
const TASKS = [ ... ]
// ══════════════════════════════════════════
</script>
```

### Block 2: CSS (~120 lines)
- Dark background `#0d1117` (GitHub dark)
- Monospace font stack
- CSS variables for status colors
- Grid layout: 2-col top, full-width sections below
- Status dot animation (pulse on CHECKING)
- Task checkbox custom styling

### Block 3: HTML skeleton (~60 lines)
- Semantic sections with `id` attributes matching the DOM state model
- No classes used for styling (IDs only) — avoids specificity issues

### Block 4: JS — init + render (~200 lines)
```
init()
  ├── renderHOR()          — static, runs once
  ├── renderTasks()        — localStorage state, runs once
  ├── bindBudget()         — edit form, localStorage
  ├── bindSessionNote()    — textarea, localStorage
  └── refresh()
        ├── checkObsidian()   → fetch /vault/ → update status dot
        ├── loadSprint()      → fetch Active/Sprint.md → render markdown
        └── updateCountdowns() → compute days remaining
```

### Block 5: refresh loop
```js
refresh()  // immediate on load
setInterval(refresh, CONFIG.refresh_ms)  // every 60s
```

---

## How CooperBrain OS Helps Me (Claude Code)

This is the key question Cooper asked. The answer is indirect but real:

**1. Reduces session bootstrap time.** Currently every session starts with a context dump (sprint, blocker, budget, deadline). With the dashboard, Cooper reads all of that visually in 10 seconds and types one line: "execute T-06." I start building immediately instead of re-absorbing 500 words of context.

**2. Makes token routing decisions visible.** The HOR decisions table ensures Cooper never asks me to re-debate locked calls. He sees the table, knows it's locked, moves on.

**3. Task completion tracking without a task manager.** The checkboxes give Cooper a persistent record of what's done. He opens a session, sees T-04 is checked (conversation route built), and hands me T-06 (deploy edge function) instead of asking "where were we?"

**4. Sprint drift prevention.** If `Active/Sprint.md` shows a different blocker than what Cooper thinks is the blocker, he catches the mismatch before opening a session — not 20 minutes in.

**5. Forces vault hygiene.** The dashboard being useful is contingent on `Active/Sprint.md` being up to date. This creates a natural incentive to run the session-end protocol (write session log, update sprint) because the dashboard degrades visibly when it's stale.

**What it does NOT do for me:**
- It doesn't give me context I don't already have — I still read the CLAUDE.md and vault files directly
- It doesn't replace session-start `curl` calls — those still happen
- It doesn't write anything I can read — it's Cooper's read layer, not my input layer

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Obsidian HTTP (not HTTPS) blocked by browser security | Medium | Test immediately on first open; fallback is to accept cert in browser settings |
| Token visible in file if file is accidentally shared | Low | File lives at `~/` outside repo; clearly labeled as sensitive |
| Vault is nearly empty — Sprint.md doesn't exist | Confirmed | Show "not created yet" gracefully; create Sprint.md as part of session-end protocol |
| localStorage cleared by browser privacy settings | Low | Warn user in UI; degrade to unchecked state, not a crash |
