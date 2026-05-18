# Implementation Plan: CooperBrain OS

**Branch**: `002-cooperbrain-os` | **Date**: 2026-05-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-cooperbrain-os/spec.md` (v2)

---

## Summary

A Next.js 15 web application with 4 pages (agents, mcp, settings, reports) that serves as Cooper's command center for the CooperBrain ecosystem. Reads from local files via API routes, persists state to a dedicated Supabase project, renders live workflow graphs with React Flow, and runs scheduled tasks via server-side cron. Local-first dev (`npm run dev`), deployable to Vercel post-launch.

---

## Technical Context

**Language/Version**: TypeScript 5.x + Node 20 LTS
**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui, React Flow 12, Drizzle ORM, @supabase/supabase-js, Zustand
**Storage**: Supabase Postgres (dedicated project, separate from Twirl)
**Auth**: Supabase Auth — magic-link email to cporter2us@gmail.com
**Testing**: Manual + Playwright smoke tests (post-V1)
**Target Platform**: macOS Safari/Chrome via `npm run dev`; future Vercel deploy
**Project Type**: Local-first web dashboard (single user)
**Performance Goals**: Page load < 1s; MCP health refresh < 5s
**Constraints**: No filesystem writes without confirmation; credential masking by default; Twirl May 24 deadline takes priority
**Scale/Scope**: 1 user, ~10 scheduled tasks, ~10 MCP servers, ~50 vault files

---

## Constitution Check

| Gate | Status | Notes |
|---|---|---|
| Ship before perfect | PASS | 5-day timeline; V1 is local-only, mobile is V2 |
| No re-debating locked decisions | PASS | Supabase Edge Functions, Express Connect, single-campus are Twirl decisions — CooperBrain OS doesn't touch them |
| Spec before code | PASS | This plan exists; tasks.md follows |
| Schema is the contract | PASS | Drizzle generates types from Postgres |
| Stripe is the only payment path | N/A | CooperBrain OS has no payments |
| Cooper understands his own code | PASS | App Router + Tailwind + Drizzle = mainstream stack with clear patterns |
| Twirl takes priority | ENFORCED | See "Hard Guardrails" below |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-cooperbrain-os/
├── spec.md           ← user stories (this file)
├── plan.md           ← THIS file
├── research.md       ← Phase 0 decisions
├── data-model.md     ← Postgres schema
├── tasks.md          ← Phase 2 task list
├── checklists/
│   └── requirements.md
└── _archive/
    └── v1-single-html/   ← prior single-HTML spec, superseded
```

### Source Code (new repo)

```text
~/cooperbrain-os/           ← NEW repo, not inside Twirl
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 → redirects to /agents
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── callback/route.ts
│   │   ├── agents/page.tsx
│   │   ├── mcp/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── reports/page.tsx
│   │   └── api/
│   │       ├── obsidian/[...path]/route.ts
│   │       ├── fs/route.ts
│   │       ├── mcp/health/route.ts
│   │       ├── tasks/[id]/run/route.ts
│   │       └── cron/dispatch/route.ts
│   ├── components/
│   │   ├── nav/SidebarNav.tsx
│   │   ├── graph/WorkflowGraph.tsx
│   │   ├── graph/nodes/{Service,Agent,DataStore,Tool,FileSystem,Schedule}.tsx
│   │   ├── ui/                       ← shadcn primitives
│   │   ├── agents/{TaskRow,ScheduleEditor,RunHistory,AddTaskModal}.tsx
│   │   ├── mcp/{ServerCard,AddServerModal,TopologyGraph}.tsx
│   │   ├── settings/{EnvEditor,RotationTracker,ClaudeMdEditor,ModelRouting}.tsx
│   │   └── reports/{ReportTree,SprintCard,SpecCard,SearchBar}.tsx
│   ├── lib/
│   │   ├── supabase/{client,server,middleware}.ts
│   │   ├── obsidian.ts
│   │   ├── db/
│   │   │   ├── schema.ts             ← Drizzle schemas
│   │   │   └── index.ts
│   │   └── fs/safelist.ts            ← which paths the API will read
│   └── hooks/
│       ├── useTasks.ts
│       ├── useMCPHealth.ts
│       └── useObsidian.ts
├── drizzle/                          ← generated migrations
├── public/
├── .env.local                        ← NOT committed
├── .env.example                      ← committed (placeholders)
├── drizzle.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── package.json
└── README.md
```

---

## Hard Guardrails (Protect May 24 Twirl Launch)

These are not suggestions — they're rules:

1. **2-hour daily cap** on CooperBrain OS until Twirl ships May 24
2. **Twirl tasks jump the queue** — if a CooperBrain day delays T-04/T-06/etc, that Twirl task gets the slot
3. **No Vercel deploy until May 25+** (scope creep risk)
4. **No mobile work pre-launch** (V2)
5. **End-of-day status**: write progress to `Active/Sprint.md` so we know if we're slipping

If any of these get violated, this project is paused until Twirl ships. Non-negotiable.

---

## Page Specifications

### `/agents` — Scheduled Task Control

- **Table** of tasks: name, agent type, cron, last run, status, enabled toggle
- **Row click** → drawer with full prompt + last 10 runs + edit
- **"Add Task" modal**: agent picker (Manus/Claude/curl/script), cron expression, prompt
- **"Run Now" button** per row → `/api/tasks/[id]/run`
- **Workflow graph**: `Schedule (cron)` → `Trigger` → `Agent` → `Output` → `AuditLog`
- **Cron execution**: Supabase Edge Function triggered by pg_cron, OR Vercel cron post-deploy
- **Data**: `scheduled_tasks`, `task_runs` tables

### `/mcp` — MCP Relations Dashboard

- **Grid of cards**: one per server from `~/.cursor/mcp.json` (via `/api/fs`)
- **Card**: name, type (`url`/`command`), status dot, last health check, expand for raw JSON
- **Health check API** (`/api/mcp/health`): pings each server's health endpoint, persists to `mcp_servers`
- **Topology graph**: Claude Code at center, all MCP servers as nodes, edge color = current status
- **"Add Server" wizard**: outputs JSON block to paste into mcp.json (no auto-write)
- **Data**: `~/.cursor/mcp.json` (read-only) + `mcp_servers` table for history

### `/settings` — Config + Key Rotation

- **Env editor**: rows for each var in `~/.cooperbrain/.env` with mask/reveal, last-rotated, "Rotate" button (opens provider dashboard URL)
- **Rotation tracker**: status per key (clean / overdue / exposed-in-file-X), historical events
- **CLAUDE.md editor**: WYSIWYG markdown with diff preview before save
- **Model routing rules**: visual editor for Haiku/Sonnet/Opus/Manus routing
- **Workflow graph**: `~/.cooperbrain/.env` → `~/.zshrc source` → shell env → consumers (Cursor MCP, curl, Claude Code)
- **Data**: filesystem proxy + `key_rotations` table

### `/reports` — Documents & Reports

- **Left rail**: tree of Obsidian vault + speckit specs
- **Pinned**: `Active/Sprint.md` always visible at top
- **Speckit specs**: each gets a card with phase progress (parses `tasks.md` for checkboxes)
- **Search**: full-text across vault + specs, snippet preview, jump to source
- **"Generate Session Report"**: prompts for summary, writes `Sessions/YYYY-MM-DD.md` via Obsidian PUT
- **Data**: Obsidian REST API + filesystem reads of `.specify/specs/*` + `reports` table

---

## Workflow Graphs (React Flow)

- 6 custom node types: `Service`, `Agent`, `DataStore`, `Tool`, `FileSystem`, `Schedule`
- Each node carries a status (`live` | `degraded` | `dead` | `unknown`) wired to real health checks
- Edges animate when recent data flow detected (last hit < 60s)
- Click a node → opens its config in the relevant page or drawer
- Graph definitions stored as JSON in `workflow_definitions` table (editable)
- Layout: dagre.js for auto-layout, manual override per graph

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/obsidian/[...path]` | GET, PUT, DELETE | Proxy to localhost:27124 with auth header injection |
| `/api/fs` | GET, POST | Read/write safelisted paths only (`~/.cooperbrain/.env`, `~/.cursor/mcp.json`, `~/CLAUDE.md`, vault paths) |
| `/api/mcp/health` | POST | Trigger health check across all configured MCP servers |
| `/api/tasks/[id]/run` | POST | Manually trigger a scheduled task |
| `/api/cron/dispatch` | POST | Internal — called by pg_cron to fire due tasks |

---

## Data Flow Diagrams

### Agent task lifecycle
```
Cooper creates task → INSERT scheduled_tasks
                         ↓
                     pg_cron fires every minute
                         ↓
                     /api/cron/dispatch
                         ↓
                     For each due task:
                         ├─ Manus  → POST manus.im/...
                         ├─ Claude → spawn claude --print
                         ├─ curl   → execute URL
                         └─ script → spawn shell
                         ↓
                     INSERT task_runs (success/fail)
                         ↓
                     Dashboard polls task_runs → renders update
```

### Filesystem-to-dashboard flow
```
~/.cooperbrain/.env  →  /api/fs (server-side read)  →  Settings page (browser)
                         ↑
                         only files in src/lib/fs/safelist.ts can be read
```

---

## Supabase Setup (Cooper's Action Items)

1. Go to https://supabase.com/dashboard → New Project
2. Name: `cooperbrain-os`, region: `us-east-1` (or closest)
3. Database password: generated, save to `~/.cooperbrain/.env` as `COOPERBRAIN_DB_PASSWORD`
4. Wait for project provision (~2 min)
5. Settings → API → copy `Project URL`, `anon key`, `service_role key`
6. Paste into `~/cooperbrain-os/.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
   - `SUPABASE_SERVICE_ROLE_KEY=...`
7. Run `npx drizzle-kit push` to apply schema
8. Settings → Auth → enable Email magic link, restrict to `cporter2us@gmail.com`

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Twirl deadline slips because of this | High | Hard guardrails above; 2hr daily cap; daily checkpoint |
| Supabase free tier exceeded | Low | Single user, minimal traffic; warning at 80% |
| Obsidian REST API breaks on update | Medium | Graceful degradation — vault search disabled but specs still work |
| Cron drift / missed runs | Medium | pg_cron has < 1min drift; manual "Run Now" always works |
| File-write race conditions | Low | Atomic writes (temp + rename); audit log records every write |

---

## Phases (Days 1-5)

| Day | Hours | Output |
|---|---|---|
| 1 | 2 | Repo scaffold, Supabase project ready, schema migrated, base layout + sidebar |
| 2 | 2 | `/agents` page complete + first workflow graph + cron dispatch route |
| 3 | 2 | `/mcp` page + health check API + topology graph |
| 4 | 2 | `/settings` page + filesystem API routes + key rotation tracker |
| 5 | 2 | `/reports` page + Obsidian integration + polish on all graphs |

**Total: 10 focused hours.** Realistic calendar time given Twirl pulls: 7-10 days.

---

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OBSIDIAN_TOKEN=          # reused from ~/.cooperbrain/.env
OBSIDIAN_HOST=127.0.0.1
OBSIDIAN_PORT=27124
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Out of Scope (V2)

- Mobile UI / responsive design
- Multi-user
- Manus integration (depends on Manus API key being set first)
- RAG search inside reports (depends on `~/cooperbrain-rag/` being installed)
- Vercel deployment + custom domain
- Push notifications
- Twirl-specific dashboards (separate from CooperBrain OS — those live in Twirl)
