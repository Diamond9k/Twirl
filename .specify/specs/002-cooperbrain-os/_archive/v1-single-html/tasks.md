# Tasks: CooperBrain OS

**Input**: Design docs from `specs/002-cooperbrain-os/`
**Output file**: `~/cooperbrain-os.html` (outside repo)
**Estimated total**: 3–4 hours
**[P]** = parallel with previous task

---

## Phase 1: Scaffold (Blocking Foundation)

**Purpose**: Create the file with CONFIG, constants, and empty section shells. Everything downstream plugs into this.

- [ ] T001 Create `~/cooperbrain-os.html` with full HTML5 boilerplate, `<meta>` charset/viewport, dark background, monospace font
- [ ] T002 [P] Write CONFIG block at top of `<script>`: `obsidian.url`, `obsidian.token`, `deadlines[]`, `refresh_ms`
- [ ] T003 Write `HOR_DECISIONS[]` constant from locked list in CLAUDE.md
- [ ] T004 Write `TASKS[]` constant from TWIRL-LAUNCH/tasks.md data-model (all 32 tasks with id, phase, label)
- [ ] T005 Write CSS: dark theme, grid layout (2-col top / full-width sections), status dot styles, checkbox styles, pulse animation

**Checkpoint**: Open file in browser — dark layout renders, no JS errors in console.

---

## Phase 2: US1 — Session Start Handoff (P1) 🎯 MVP

**Goal**: Cooper opens the file and in one glance knows: top blocker, days to May 24, Obsidian live/dead, current sprint content.

**Independent Test**: Open dashboard cold with Obsidian running. Verify Sprint section shows vault content. Open with Obsidian stopped. Verify graceful "offline" state. All in under 3 seconds.

- [ ] T006 [US1] Implement `checkObsidian()` — fetch `http://127.0.0.1:27124/vault/`, set `#obsidian-status` to green/red, log response time
- [ ] T007 [US1] Implement `loadSprint()` — fetch `Active/Sprint.md` from vault, render raw markdown as `<pre>` block in `#sprint-content`, handle 404 ("Sprint not created yet — run session-end protocol")
- [ ] T008 [US1] Wire `refresh()` to call `checkObsidian()` + `loadSprint()` on load and every `CONFIG.refresh_ms`
- [ ] T009 [US1] Add `[P] Manus`, `[P] RAG`, `[P] Spec Kit` connection rows — static states (Manus: yellow "verify in terminal", RAG: yellow "verify in terminal", Spec Kit: green "installed")
- [ ] T010 [US1] Render `#last-refresh` timestamp — updates every cycle

**Checkpoint**: Sprint section shows vault content (or graceful fallback). Obsidian dot goes red within 1 refresh cycle of stopping Obsidian.

---

## Phase 3: US2 — Deadline & Budget (P2)

**Goal**: Deadlines and budget visible above the fold without scrolling.

**Independent Test**: Verify countdown math is correct. Edit budget figure — reload — verify it persisted.

- [ ] T011 [US2] Implement `updateCountdowns()` — compute `Math.ceil((targetDate - now) / 86400000)` for each deadline, update `#days-ozark` and `#days-rush`, apply urgency color (< 7 days = red, < 14 = yellow, else green)
- [ ] T012 [US2] Implement budget display — read `cooperbrain:budget` from localStorage (default 389), render `$XXX remaining` in `#budget-display`
- [ ] T013 [US2] Implement budget edit — click `[edit]` → show `<input>` → save to localStorage on Enter/blur → re-render display
- [ ] T014 [US2] Handle deadline-passed state — show "0 days — deadline passed" in red if date is in the past

**Checkpoint**: Countdowns show correct numbers. Editing budget persists on reload.

---

## Phase 4: US3 — Connection Health (P2)

**Goal**: 4 connection indicators always visible with accurate live/static states.

- [ ] T015 [US3] Refactor connection section into `renderConnections(statuses)` function — takes an object of statuses and re-renders the dot + label for each connection
- [ ] T016 [US3] Add CHECKING state (yellow pulsing dot) that shows while `fetch()` is in-flight for Obsidian
- [ ] T017 [US3] Add 3-second fetch timeout to `checkObsidian()` using `AbortController` — if timeout fires, status → OFFLINE
- [ ] T018 [P] [US3] Add "last checked" sub-label under each connection indicator showing elapsed time since last probe

**Checkpoint**: Kill Obsidian. Within 60s the dot goes red. Restart Obsidian. Within 60s it goes green.

---

## Phase 5: US4 — Task List (P3)

**Goal**: Task list renders from `TASKS[]` constant with phase groupings and persistent checkboxes.

**Independent Test**: Check off T-03. Reload page. T-03 is still checked.

- [ ] T019 [US4] Implement `renderTasks()` — group `TASKS[]` by `phase`, render phase headers, render each task as `<li>` with checkbox `input[type=checkbox]` and `data-id` attribute
- [ ] T020 [US4] On checkbox change: write `cooperbrain:tasks:${id}` to localStorage
- [ ] T021 [US4] On render: read each task's localStorage key and set `checked` accordingly
- [ ] T022 [US4] Add phase progress indicator: "Phase 0 — 3/3 done ✓" style label next to each phase header
- [ ] T023 [US4] Add collapse toggle per phase — clicking phase header collapses/expands task list (state in localStorage)

**Checkpoint**: Check 5 tasks. Reload. All 5 still checked. Phase progress counter reflects checked count.

---

## Phase 6: HOR + Session Note (Polish)

**Purpose**: Static HOR table and session note textarea — both simple, both useful.

- [ ] T024 Implement `renderHOR()` — table from `HOR_DECISIONS[]` with columns: Decision, Score, Status. Color-code status: EXECUTE=green, NEVER=red, WHEN READY/FALL 2026=yellow, CONFIRMED=blue
- [ ] T025 Implement session note textarea — `#session-note`, reads/writes `cooperbrain:session_note` in localStorage on `input` event (debounced 500ms)
- [ ] T026 Add "Copy to clipboard" button next to session note — clicking copies contents for pasting into Claude Code session

**Checkpoint**: HOR table renders. Type in session note. Reload. Note persists. Copy button works.

---

## Phase 7: Validation

- [ ] T027 Open in Safari — verify all sections render, no console errors
- [ ] T028 [P] Open in Chrome — verify same
- [ ] T029 Verify `file://` protocol works (no CORS blocks on internal fetch to localhost)
- [ ] T030 Verify graceful degradation: stop Obsidian → dashboard still shows tasks, HOR, countdowns, budget
- [ ] T031 Clear localStorage → reload → verify no crashes, budget shows default $389, all tasks unchecked
- [ ] T032 Verify countdown math: check May 24 and August 1 manually vs. calculator

**Checkpoint**: Zero crashes in all degraded states. File is ready.

---

## Dependency Graph

```
T001 → T002, T003, T004, T005 (all scaffold, parallel)
T005 (CSS done) → T006–T010 (US1 — needs layout to verify)
T006–T010 (refresh loop working) → T011–T014 (US2 — needs refresh to be wired)
T011–T014 → T015–T018 (US3 — connection states plug into existing refresh)
T015–T018 → T019–T023 (US4 — task list is standalone but depends on scaffold)
T019–T023 → T024–T026 (polish — depends on all sections rendering cleanly)
T024–T026 → T027–T032 (validation — needs full feature set)
```

---

## Notes

- The output file `~/cooperbrain-os.html` must NEVER be committed to the Twirl repo
- Add `cooperbrain-os.html` to the home directory `.gitignore` as a precaution
- The token in the CONFIG block must be updated after rotating the Obsidian key (flagged in T-32 of TWIRL-LAUNCH tasks)
- `Active/Sprint.md` does not exist in the vault yet — create it as part of the first session-end protocol run
- Total implementation estimate: 3–4 hours in one session
