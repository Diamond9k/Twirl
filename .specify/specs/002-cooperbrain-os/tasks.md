# Tasks: CooperBrain OS (v2)

**Input**: Design docs from `specs/002-cooperbrain-os/`
**Output**: New repo at `~/cooperbrain-os/` (NOT inside Twirl)
**Time budget**: 10 focused hours / 5 calendar days (2h/day cap until May 24)
**[P]** = parallel with previous task

---

## Phase 1: Scaffold (Day 1, ~2h)

- [ ] **T001** Create `~/cooperbrain-os/` directory and `cd` into it
- [ ] **T002** Run `npx create-next-app@latest .` with: TypeScript ✓, ESLint ✓, Tailwind ✓, `src/` dir ✓, App Router ✓, no Turbopack alias customizations
- [ ] **T003** [P] Initialize git: `git init && git add -A && git commit -m "init"`
- [ ] **T004** Install runtime deps: `npm install @supabase/supabase-js @supabase/ssr drizzle-orm reactflow zustand lucide-react clsx tailwind-merge`
- [ ] **T005** Install dev deps: `npm install -D drizzle-kit @types/node`
- [ ] **T006** Initialize shadcn/ui: `npx shadcn@latest init` (style: Default, base color: Stone, css var ✓)
- [ ] **T007** Add shadcn primitives: `npx shadcn@latest add button card dialog input label sheet table tabs textarea toast`
- [ ] **T008** Configure `.env.local` and `.env.example`. Add `.env.local` to `.gitignore`
- [ ] **T009** **Cooper's task** — create Supabase project `cooperbrain-os` at supabase.com, paste creds into `.env.local`
- [ ] **T010** Write Drizzle schema in `src/lib/db/schema.ts` (all 7 tables from data-model.md)
- [ ] **T011** Configure `drizzle.config.ts` and run `npx drizzle-kit push` to apply schema
- [ ] **T012** Run seed SQL from data-model.md (key_rotations + mcp_servers + session-start workflow)
- [ ] **T013** Create `src/lib/supabase/{client,server,middleware}.ts` per @supabase/ssr docs
- [ ] **T014** Build `src/app/layout.tsx` with sidebar nav + 4 page links (Agents, MCP, Settings, Reports)
- [ ] **T015** Create 4 page stubs (`src/app/{agents,mcp,settings,reports}/page.tsx`) — each renders `<h1>` for now
- [ ] **T016** Build `src/components/nav/SidebarNav.tsx` with active-route highlighting
- [ ] **T017** Run `npm run dev` and verify all 4 pages route correctly

**Checkpoint Day 1**: `localhost:3000` loads, sidebar works, all 4 routes accessible, Supabase tables exist, Drizzle is wired.

---

## Phase 2: Agents Page (Day 2, ~2h)

- [ ] **T018** Build `src/components/agents/TaskRow.tsx` — table row with cron, status, enabled toggle
- [ ] **T019** Build `src/components/agents/AddTaskModal.tsx` — agent picker + cron field + prompt/command
- [ ] **T020** Build `src/components/agents/RunHistory.tsx` — drawer showing last 10 runs
- [ ] **T021** Implement `src/app/agents/page.tsx` with full task list + add button + drawer
- [ ] **T022** Create `src/app/api/tasks/[id]/run/route.ts` for manual "Run Now"
- [ ] **T023** Create `src/app/api/cron/dispatch/route.ts` (the cron endpoint)
- [ ] **T024** Add pg_cron schedule in Supabase SQL editor: `SELECT cron.schedule('dispatch', '* * * * *', $$SELECT net.http_post(url:='...', body:='{}')$$);`
- [ ] **T025** Build `src/components/graph/WorkflowGraph.tsx` (React Flow wrapper)
- [ ] **T026** Build 6 custom node components in `src/components/graph/nodes/*.tsx`
- [ ] **T027** Render first workflow graph on `/agents` (Schedule → Trigger → Agent → Output → AuditLog)

**Checkpoint Day 2**: Can add/edit/disable tasks. Workflow graph renders. pg_cron is firing.

---

## Phase 3: MCP Page (Day 3, ~2h)

- [ ] **T028** Build `src/app/api/fs/route.ts` with path safelist from `src/lib/fs/safelist.ts`
- [ ] **T029** Build `src/lib/fs/safelist.ts` per plan.md Decision 5
- [ ] **T030** Build `src/app/api/mcp/health/route.ts` — pings each server, writes to `mcp_servers` + `mcp_health_history`
- [ ] **T031** Build `src/components/mcp/ServerCard.tsx` with status dot + last check
- [ ] **T032** Build `src/components/mcp/AddServerModal.tsx` — outputs JSON block to paste into mcp.json (no auto-write)
- [ ] **T033** Build `src/components/mcp/TopologyGraph.tsx` (React Flow with Claude Code at center)
- [ ] **T034** Implement `src/app/mcp/page.tsx` — grid + topology graph + health refresh button
- [ ] **T035** Add a 60s client-side poll for health refresh
- [ ] **T036** Wire "Add Server" modal to copy JSON to clipboard

**Checkpoint Day 3**: MCP page shows all 4 current servers with live health. Topology graph renders. Adding a server generates the JSON correctly.

---

## Phase 4: Settings Page (Day 4, ~2h)

- [ ] **T037** Build `src/components/settings/EnvEditor.tsx` — masked rows, reveal-on-click, edit-in-place
- [ ] **T038** Build `src/components/settings/RotationTracker.tsx` — overdue/exposed status from `key_rotations`
- [ ] **T039** Build `src/components/settings/ClaudeMdEditor.tsx` — textarea + side-by-side markdown preview + diff before save
- [ ] **T040** Build `src/components/settings/ModelRouting.tsx` — visual editor for Haiku/Sonnet/Opus/Manus
- [ ] **T041** Extend `/api/fs/route.ts` to handle PUT requests for `.env` and `CLAUDE.md` (atomic write: temp + rename)
- [ ] **T042** Implement `src/app/settings/page.tsx` with tabs for Env / Rotations / CLAUDE.md / Routing
- [ ] **T043** Render Settings workflow graph (`.env` → `.zshrc` → shell → consumers)
- [ ] **T044** Wire "Rotate" buttons to open provider dashboard URLs in new tab + log to `audit_log`

**Checkpoint Day 4**: Can edit env vars and CLAUDE.md from the dashboard. Rotation tracker shows exposed keys flagged red. Audit log records every change.

---

## Phase 5: Reports Page (Day 5, ~2h)

- [ ] **T045** Build `src/lib/obsidian.ts` client (read/write helpers)
- [ ] **T046** Build `src/app/api/obsidian/[...path]/route.ts` — proxy with token injection
- [ ] **T047** Build `src/components/reports/ReportTree.tsx` — recursive vault tree
- [ ] **T048** Build `src/components/reports/SprintCard.tsx` — pinned, top of page
- [ ] **T049** Build `src/components/reports/SpecCard.tsx` — parses `tasks.md` for phase progress
- [ ] **T050** Build `src/components/reports/SearchBar.tsx` — full-text across vault + specs
- [ ] **T051** Implement `src/app/reports/page.tsx` with tree + search + spec cards
- [ ] **T052** Add "Generate Session Report" action — prompts for summary, PUTs to `Sessions/YYYY-MM-DD.md`
- [ ] **T053** Render Reports workflow graph (Session → Sprint.md → Tasks → Session log → RAG)
- [ ] **T054** [P] Polish all 4 page workflow graphs — consistent node styling, animation tuning

**Checkpoint Day 5**: All 4 pages functional. Reports search works. Session report generation hits Obsidian. Repo ready for v2 work.

---

## Hard Guardrails (enforced at every checkpoint)

- 2-hour daily cap until May 24 — if you go over, stop and review Twirl status
- After every day, write progress to Obsidian `Active/Sprint.md`
- If a Twirl task is overdue, pause CooperBrain OS that day entirely
- No deploy until May 25+

---

## Dependency Graph

```
T001 → T002 → T003,T004,T005 → T006 → T007 → T008 → T009 (Cooper) → T010 → T011 → T012
T013 → T014 → T015 → T016 → T017 (Day 1 done)

T018,T019,T020 → T021 → T022,T023 → T024 (cron live)
T025 → T026 → T027 (Day 2 done)

T028,T029 → T030 → T031,T032 → T033 → T034 → T035,T036 (Day 3 done)

T037,T038,T039,T040 → T041 → T042 → T043,T044 (Day 4 done)

T045,T046 → T047,T048,T049,T050 → T051 → T052 → T053 → T054 (Day 5 done)
```

---

## V2 Backlog (post-May 24)

- Mobile responsive design
- Vercel deploy + custom domain (`cooperbrain.os.cporter.dev` or similar)
- Manus integration (depends on MANUS_MCP_API_KEY)
- RAG search inside reports (depends on `~/cooperbrain-rag/`)
- Push notifications for task failures
- TipTap WYSIWYG for CLAUDE.md editor
- Recharts for uptime + token usage charts
- Playwright test suite
- Multi-tenant support (if Cooper ever shares this)
