# Feature Specification: CooperBrain OS

**Feature Branch**: `002-cooperbrain-os`
**Created**: 2026-05-11
**Status**: Draft — v2 (full web app — supersedes archived v1-single-html)
**Input**: A web-based operating-system dashboard with 4 pages and live workflow graphs across Cooper's CooperBrain infrastructure

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Control Scheduled Agents (Priority: P1)

Cooper opens `/agents`, sees every recurring task across his system (Manus dispatches, Claude Code session triggers, curl health checks, local scripts), and can enable, disable, edit, or manually run any of them — all from one screen.

**Why this priority**: Without this, scheduled tasks live in cron files, launchd plists, Manus configs, and shell scripts scattered across `~/`. No one source of truth. This page is the agent control panel that replaces tribal knowledge with visible state.

**Independent Test**: Open `/agents`. Add a task with cron `*/5 * * * *` that hits a curl URL. Wait 5 minutes. Verify the task ran and the audit log shows the result.

**Acceptance Scenarios**:

1. **Given** the agents page is open, **When** Cooper clicks "Add Task", **Then** a modal lets him pick an agent type (Manus/Claude/curl/script), enter a cron expression, and write a prompt or command
2. **Given** a task is enabled, **When** its cron fires, **Then** the task runs and an entry appears in its run history with status, duration, and output preview
3. **Given** a task has failed 3 times in a row, **When** Cooper opens the agents page, **Then** the task row is highlighted red and the failure reason is shown
4. **Given** Cooper clicks "Run Now" on any task, **When** the request is sent, **Then** the task executes immediately regardless of cron

---

### User Story 2 — Visualize MCP Server Health (Priority: P1)

Cooper opens `/mcp`, sees every MCP server connected to Cursor (GitHub, Supabase, Stripe, Hostinger, Manus, Obsidian) as a topology graph with live status dots, and can immediately see which integrations are healthy and which are broken.

**Why this priority**: When an MCP server breaks, debugging starts with discovery — *which one is down?* Right now that takes 10 minutes of trial-and-error. This page turns it into a 2-second glance.

**Independent Test**: Open `/mcp`. Verify all 4 currently-configured servers (github, supabase, stripe, hostinger) render with status dots. Stop one of them. Refresh. That dot turns red within 60 seconds.

**Acceptance Scenarios**:

1. **Given** `~/.cursor/mcp.json` has N servers configured, **When** the page loads, **Then** N cards render with name, type, URL, and health status
2. **Given** a server is unreachable, **When** the auto-refresh fires, **Then** its dot turns red and a timestamp shows when it last responded successfully
3. **Given** Cooper clicks "Add Server", **When** he fills in the form, **Then** the dashboard outputs the JSON block to paste into `mcp.json` (no auto-write to user config)
4. **Given** the topology graph is rendered, **When** Cooper clicks a server node, **Then** he sees the raw config + last 24h health history

---

### User Story 3 — Edit Settings & Track Key Rotation (Priority: P2)

Cooper opens `/settings`, sees every credential in `~/.cooperbrain/.env` with a "last rotated" timestamp, knows immediately which keys are overdue, exposed, or unset, and can update `CLAUDE.md` with a diff preview before saving.

**Why this priority**: Credentials drift. Exposed keys get forgotten. CLAUDE.md grows stale. This page is the maintenance surface for the infrastructure that keeps everything else working.

**Independent Test**: Open `/settings`. Verify all env vars from `.env` are listed with mask. Click "rotate" on one — the dashboard URL for that provider opens. Edit CLAUDE.md, see diff, save, verify changes hit disk.

**Acceptance Scenarios**:

1. **Given** an env var was last rotated 90 days ago, **When** the page loads, **Then** the row is highlighted yellow ("overdue")
2. **Given** an env var was found exposed in a file (e.g., COOPERBRAIN_BOOTSTRAP.md), **When** the page loads, **Then** the row is highlighted red and lists exposure locations
3. **Given** Cooper edits CLAUDE.md, **When** he clicks "Preview Diff", **Then** a unified diff is shown before save
4. **Given** Cooper changes a value in `.env`, **When** he clicks "Save", **Then** the file is updated atomically (write to temp, rename) and an entry is added to the audit log

---

### User Story 4 — Browse Reports & Documents (Priority: P2)

Cooper opens `/reports`, sees `Active/Sprint.md` pinned at the top, every speckit spec with its phase progress, every document in the Obsidian vault — all searchable. He can generate a session report and write it back to the vault from this page.

**Why this priority**: Reports and specs are the long-term memory of the system. Right now they're scattered across `~/Obsidian Vault/`, `~/Twirl-Hub/repo/Twirl/.specify/specs/`, and various Downloads files. Centralization makes review possible.

**Independent Test**: Open `/reports`. Verify `Active/Sprint.md` is visible. Click TWIRL-LAUNCH spec — see phase progress. Type "stripe" in search — get hits across vault and specs.

**Acceptance Scenarios**:

1. **Given** Obsidian REST API is live, **When** the page loads, **Then** the vault tree renders with all files
2. **Given** a search term is entered, **When** the user types, **Then** matches across vault + specs appear with file path + snippet
3. **Given** Cooper clicks "Generate Session Report", **When** he provides a session summary, **Then** the dashboard writes `Sessions/YYYY-MM-DD.md` to Obsidian via PUT
4. **Given** the dashboard is open during a Claude Code session, **When** Cooper updates Sprint.md from another window, **Then** the dashboard reflects the change within 60 seconds

---

### User Story 5 — See How Everything Works (Priority: P3)

Every page has a "How this works" panel with a live workflow graph (React Flow) showing the data flow for that domain. Nodes change color based on real status. Cooper can click any node to jump to its config.

**Why this priority**: New users (or Cooper after a 2-month gap) don't remember which file feeds which subsystem. A visual graph is faster than reading 5 docs.

**Independent Test**: Open `/settings`. The workflow graph shows: `.env` → `.zshrc source` → shell → `cursor/mcp.json` consumers + curl/scripts. All nodes are green when healthy.

**Acceptance Scenarios**:

1. **Given** a workflow graph is rendered, **When** the underlying data source is healthy, **Then** all nodes are green
2. **Given** an edge represents a recent data flow (last hit < 60s), **When** the graph renders, **Then** the edge animates
3. **Given** Cooper clicks a node, **When** the click registers, **Then** the relevant config drawer opens (e.g., clicking the "Obsidian" node in the reports graph opens the Obsidian config panel)

---

### Edge Cases

- What if Supabase is down? Pages fall back to read-only mode using last cached state from localStorage
- What if `.env` has malformed lines? Settings page shows them as errors but doesn't crash
- What if Obsidian REST API is down? Reports page disables search but still shows speckit specs from filesystem
- What if a cron task takes > 5 minutes? Run timeout, kill the process, log as failed
- What if Cooper is on his phone? Read-only mode (settings + reports view, no edits — V2 will support mobile editing)

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present 4 distinct pages: `/agents`, `/mcp`, `/settings`, `/reports`
- **FR-002**: System MUST render at least one React Flow workflow graph per page showing real-time status
- **FR-003**: System MUST read from local files (`~/.cooperbrain/.env`, `~/.cursor/mcp.json`, `~/CLAUDE.md`) via Next.js API routes — never expose filesystem to the browser directly
- **FR-004**: System MUST hit the Obsidian REST API for vault content (`http://127.0.0.1:27124`) via a server-side proxy route
- **FR-005**: System MUST persist scheduled tasks, MCP health history, key rotation events, and audit logs in a dedicated Supabase project (not Twirl's `qlulzatkhgblorbjndsz`)
- **FR-006**: System MUST authenticate via Supabase Auth — single user (Cooper), magic-link email
- **FR-007**: System MUST run cron-style scheduled tasks server-side (Supabase Edge Function + pg_cron OR Vercel cron)
- **FR-008**: System MUST mask all credential values by default and only reveal on explicit click
- **FR-009**: System MUST write atomic file updates (write to temp, rename) when modifying user config files
- **FR-010**: System MUST poll MCP server health every 60s and persist the result to Supabase
- **FR-011**: System MUST search Obsidian vault + speckit specs full-text and return matches with snippets
- **FR-012**: System MUST run as `npm run dev` on `localhost:3000` for local-only operation pre-launch

### Key Entities

- **ScheduledTask**: name, agent type, cron expression, prompt/command, enabled, last run, status, owner
- **TaskRun**: parent task, started_at, ended_at, exit code, output, error
- **MCPServer**: name, type, URL, current status, last_checked_at, config snapshot
- **KeyRotation**: key name, rotated_at, reason, exposure history
- **AuditLogEntry**: timestamp, source, event, metadata
- **WorkflowDefinition**: slug, name, nodes (React Flow), edges (React Flow)
- **Report**: title, source path, category, pinned, last_viewed_at

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 4 pages load in under 1 second on `localhost:3000` (Next.js dev server)
- **SC-002**: MCP health check covers all 4 currently-configured servers + Manus + Obsidian (6 total) within 5 seconds of page load
- **SC-003**: A new scheduled task runs reliably on its cron schedule with < 1 minute drift
- **SC-004**: Cooper can identify a broken integration in < 5 seconds of opening `/mcp`
- **SC-005**: Key rotation events are logged automatically with 100% accuracy (every rotation produces an audit entry)
- **SC-006**: Reports page surfaces any vault file within 2 seconds of save

---

## Assumptions

- Cooper runs Next.js dev server locally (`npm run dev`) for V1 — mobile/remote access is V2 scope
- The dashboard is single-user — no multi-tenant features needed
- Supabase Auth is acceptable (magic link to cporter2us@gmail.com)
- Obsidian Local REST API plugin stays installed and on port 27124
- The Twirl Supabase project is OFF-LIMITS — CooperBrain OS gets its own project
- `~/.cooperbrain/.env` remains the canonical credential store; this dashboard reads from it, never overwrites it without explicit confirmation
- React Flow is the visualization library; Mermaid is not used
- Twirl's May 24 deadline takes priority — see hard guardrails in plan.md
