# Research: CooperBrain OS

**Phase**: 0 — Pre-Design Research
**Feature**: 002-cooperbrain-os
**Date**: 2026-05-11

---

## Decision 1: Single HTML File vs. React/Vite App

**Decision**: Single self-contained HTML file — no build step, no npm, no bundler.

**Rationale**: Cooper opens this in a browser directly from the filesystem (`file://`). A build step creates friction and a dependency on Node running. The entire dashboard fits in one file comfortably. `fetch()` from `file://` to `localhost` works fine in modern browsers when CORS is permissive (Obsidian REST API uses `Access-Control-Allow-Origin: *`).

**Alternatives considered**:
- React/Vite app: requires `npm run dev`, adds port conflict risk, overkill for a personal dashboard
- Python Flask server: adds a process to keep alive, defeats the "just open the file" requirement

---

## Decision 2: Data Source — Obsidian REST API vs. Direct File Read

**Decision**: Obsidian REST API (`https://127.0.0.1:27124`) as primary source. Direct `fs` read is not available in browser context.

**Rationale**: The Obsidian REST API is already live, returns markdown content, and is the authoritative source for Sprint.md and vault notes. The API uses a self-signed cert on localhost — browser `fetch()` with `mode: 'no-cors'` does not return response body; instead we use a standard `fetch()` with a try/catch and the `-k` equivalent in JS (can't skip SSL verification in fetch directly). Resolution: the Obsidian REST API plugin serves over HTTPS with a self-signed cert. To read from it in a browser, we must either: (a) accept the cert once in the browser, or (b) use HTTP mode if the plugin supports it. Plugin v1.x supports both HTTP (port 27124) and HTTPS. Use HTTP to avoid cert issues.

**URL to use**: `http://127.0.0.1:27124` (not HTTPS) to avoid SSL cert prompts.

**Alternatives considered**:
- HTTPS with cert bypass: not possible in standard browser fetch
- Reading .md files directly from filesystem: `file://` protocol blocks cross-origin requests even to localhost
- Polling a local proxy: adds a server dependency

---

## Decision 3: State Persistence — localStorage vs. Obsidian Write-Back

**Decision**: localStorage for task checkbox state and budget figure. No write-back to Obsidian from the dashboard.

**Rationale**: Writing to Obsidian from the dashboard adds complexity and risk (accidental overwrites of Sprint.md). The dashboard is a read layer. Task state is transient enough that localStorage (per-browser, per-origin) is sufficient. Budget is updated manually when Cooper changes it.

**Alternatives considered**:
- Write checkbox state back to tasks.md: risk of corrupting speckit-managed file
- sessionStorage: doesn't persist across browser closes

---

## Decision 4: Styling — Inline CSS vs. CDN Framework

**Decision**: Inline CSS with CSS variables. No CDN dependencies.

**Rationale**: Dashboard must work offline and open as a `file://` URL. CDN links fail offline. A dark terminal aesthetic with green/yellow/red status dots is achievable in ~100 lines of inline CSS. Keeps the file fully self-contained.

**Alternatives considered**:
- Tailwind CDN: fails offline, overkill
- Bootstrap: same problem, heavy
- NativeWind: React Native only, irrelevant here

---

## Decision 5: Task List Source — Parse tasks.md vs. Hardcode

**Decision**: Fetch `tasks.md` from Obsidian API and parse markdown client-side. Fall back to a hardcoded snapshot if the API is unavailable.

**Rationale**: tasks.md lives in `.specify/specs/TWIRL-LAUNCH/tasks.md` in the repo, not in the Obsidian vault. The Obsidian API only serves vault files. Resolution: the dashboard reads tasks.md directly from the filesystem via a secondary approach — since the file is local, we can embed a current snapshot in the HTML as a `<script>` block (JSON) and refresh it manually when tasks change. This is pragmatic for a developer tool that Cooper controls.

**Alternative**: Serve `.specify/` via a local file server — rejected (adds process dependency).

**Final approach**: Embed task list as a JSON constant in the HTML. Cooper or I update it when tasks.md changes. This takes 2 minutes and is explicit.

---

## Decision 6: Auto-Refresh Implementation

**Decision**: `setInterval()` polling every 60 seconds re-fetches Obsidian API endpoints and updates the relevant DOM nodes in-place. No full page reload.

**Rationale**: Full page reload would flash and reset scroll position. In-place DOM updates are smooth and preserve localStorage-based checkbox states.

---

## Decision 7: Connection Health Checks

| Connection | Check Method | Green Condition |
|---|---|---|
| Obsidian | `fetch('http://127.0.0.1:27124/vault/')` | Response 200 |
| Manus | Check if `~/.cooperbrain/manus.py` exists — not possible in browser; show "check CLI" | N/A — static yellow |
| RAG | Same problem — filesystem not accessible from browser; show "check CLI" | N/A — static yellow |
| Spec Kit | Static green (already installed and verified) | Always green |

**Implication**: Manus and RAG show persistent yellow "verify in terminal" states. Only Obsidian is actually probed. This is accurate and honest.

---

## Obsidian API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `GET /vault/` | GET | Connection health check + list vault files |
| `GET /vault/Active/Sprint.md` | GET | Current sprint content |
| `GET /vault/Twirl/Bugs/` | GET | Bug list (if folder exists) |

**Note**: The vault currently has only default files (`Welcome.md`, `create a link.md`). `Active/Sprint.md` does not exist yet. The dashboard must handle 404s gracefully and show "not created yet" rather than an error.
