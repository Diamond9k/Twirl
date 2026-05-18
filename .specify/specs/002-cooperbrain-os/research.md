# Research: CooperBrain OS

**Phase**: 0 — Pre-design decisions
**Date**: 2026-05-11

---

## Decision 1: Next.js vs single HTML file (v1)

**Decision**: Next.js 15 App Router. v1 (single HTML) archived.

**Rationale**: 4 pages with workflow graphs, mutable state, cron jobs, and auth exceed what's reasonable in a single HTML file. Next.js gives App Router + Server Actions + API routes in one mental model, and Cooper has React experience from Twirl.

**Alternatives rejected**:
- Single HTML (v1) — workflow graphs would require manual SVG or D3 setup; mutation flows get ugly
- Astro — fewer interactive patterns than React Flow needs
- Tauri — heavier (Rust toolchain); native install isn't a v1 requirement
- SvelteKit — Cooper's other stacks are React; staying consistent reduces context switching

---

## Decision 2: Supabase Postgres vs SQLite vs local JSON

**Decision**: Dedicated Supabase project (`cooperbrain-os`), separate from Twirl's project.

**Rationale**: User wanted "multi-device sync" benefit. Supabase gives RLS, magic-link auth, free tier for single user, and integrates cleanly with Next.js Server Components. A separate project keeps blast-radius tight — a CooperBrain experiment can't break Twirl.

**Alternatives rejected**:
- Reuse Twirl's Supabase project — couples unrelated systems, RLS gets confusing
- SQLite via better-sqlite3 — no remote access, no multi-device path
- Local JSON files — no concurrency safety, no migrations, no query power

---

## Decision 3: React Flow vs Mermaid vs D3 vs Cytoscape

**Decision**: React Flow 12.

**Rationale**: First-class React integration, custom node components, programmatic state, well-documented. Status-driven node coloring + animated edges are first-class features.

**Alternatives rejected**:
- Mermaid — declarative-only, no interactive editing, hard to wire to live status
- D3 — most flexible but high authoring cost for what we need
- Cytoscape — overkill for ~10 nodes per graph
- vis.js — older API, less React-friendly

---

## Decision 4: Cron execution — pg_cron vs Vercel Cron vs node-cron

**Decision**: Supabase pg_cron + Edge Function dispatcher (v1, local dev). Vercel Cron post-deploy.

**Rationale**: pg_cron is bundled into Supabase Postgres — no extra service to manage. The Edge Function reads due tasks from `scheduled_tasks`, dispatches each by `agent` type, writes `task_runs` rows. Works in local dev because Supabase cloud runs the cron, not the dev machine.

**Alternatives rejected**:
- node-cron in the Next.js process — dies when `npm run dev` stops
- launchd plists on Mac — opaque, fragile, Mac-only
- Vercel Cron — only available post-deploy; local dev wouldn't have it
- Manus-only scheduling — couples cron to a third party we don't fully control

**Trade-off accepted**: pg_cron has a 1-minute minimum granularity. Tasks needing sub-minute schedules require a different approach.

---

## Decision 5: Filesystem access — Server Action vs API route vs RSC

**Decision**: API routes only, with a safelist.

**Rationale**: Server Actions auto-serialize across the boundary which is convenient but obscures the filesystem touch. Explicit `/api/fs` routes make it auditable and let us enforce a path safelist in one place. RSC alone can't write files.

**Safelisted paths** (in `src/lib/fs/safelist.ts`):
- `~/.cooperbrain/.env` (read + write, atomic)
- `~/.cursor/mcp.json` (read only — no auto-write)
- `~/CLAUDE.md` (read + write, atomic)
- `~/Twirl-Hub/repo/Twirl/.specify/specs/**` (read only)
- `~/Twirl-Hub/repo/Twirl/CLAUDE.md` (read only — Twirl-side)
- Obsidian vault paths via the REST API, not direct FS

Everything else is rejected with 403.

---

## Decision 6: Auth — Supabase magic link vs anonymous vs API key

**Decision**: Supabase magic link to `cporter2us@gmail.com`, single-user allowlist.

**Rationale**: Even though it's a local dev tool, the Vercel deploy path means we need real auth eventually. Magic link is the lowest friction. Restricting to one email prevents accidental exposure if the URL leaks.

**Alternatives rejected**:
- No auth — dangerous once deployed
- Static API key in env — would need a separate auth layer anyway
- GitHub OAuth — overkill for one user

---

## Decision 7: Obsidian access — HTTP proxy vs direct browser fetch

**Decision**: Server-side proxy via `/api/obsidian/[...path]`.

**Rationale**: Obsidian REST API plugin uses a self-signed cert on HTTPS port 27124, OR HTTP on 27123. Browser CORS + self-signed cert makes direct fetch painful. Proxying server-side injects the bearer token (kept in `~/.cooperbrain/.env`, not in the bundle) and bypasses cert issues.

---

## Decision 8: Styling — Tailwind 4 vs styled-components vs CSS Modules

**Decision**: Tailwind CSS 4 + shadcn/ui.

**Rationale**: Twirl uses NativeWind (Tailwind for RN). Same mental model, no context switch. shadcn/ui gives high-quality primitives that match Cooper's design taste (warm cream + serif italic + monochrome).

---

## Decision 9: State management — Zustand vs Redux Toolkit vs Server Components only

**Decision**: Zustand for client state; Server Components + Server Actions for server state where possible.

**Rationale**: Zustand is 1KB, no boilerplate, perfect for the small amount of client state (active page, panel toggles, search input). Server state stays in RSC + revalidation. No Redux.

---

## Decision 10: Charts / status indicators — recharts vs visx vs custom

**Decision**: Skip charts for v1. Custom status dots + sparklines only.

**Rationale**: V1 dashboards don't need heavy charting. MCP uptime history can be a sparkline (custom inline SVG, ~30 lines). Add recharts if/when v2 reports need them.

---

## Decision 11: Testing — Playwright now vs later

**Decision**: Manual smoke tests in v1. Playwright stub configured, not used.

**Rationale**: 10 focused hours is tight. Test infrastructure pays off with longer codebase lifetime. Configure Playwright + a "loads without error" smoke per page; full test suite is post-launch.

---

## Open Questions

1. **MCP health probes** — does every MCP server expose a `/health` endpoint? Some are URL-based (Supabase, Stripe MCP), some are command-based (GitHub, Hostinger). Command-based servers can't be HTTP-pinged. v1 approach: for `type: "url"`, fetch `/health` or root; for `type: "command"`, just check if the npm package resolves. Improve in v2.

2. **Workflow graph layout** — dagre auto-layout vs manual positions. v1: dagre. If layouts feel wrong, switch to manual coordinates stored in `workflow_definitions.nodes[].position`.

3. **CLAUDE.md editor** — full markdown WYSIWYG (TipTap?) or simple textarea + preview? v1: textarea + side-by-side markdown preview. WYSIWYG is v2.

4. **Cron task output retention** — keep all `task_runs` forever or auto-delete after 30 days? v1: keep last 100 per task, delete older via daily pg_cron cleanup job.

5. **Mobile** — explicitly v2. Not solved here.
