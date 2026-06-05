# Baseline Evidence — Foundation Integrity (2026-05-28, pre-mutation)

Captured before any reconciliation. Rollback copies in `~/_archive/foundation-integrity-baseline-2026-05-28/`.

## Secrets (T003)

**`~/.cursor/mcp.json` — 6 plaintext secrets** (relocate target):
- `github.GITHUB_PERSONAL_ACCESS_TOKEN` → relocate **+ rotate**
- `hostinger-mcp.API_TOKEN` → relocate **+ rotate**
- `codex.OPENAI_API_KEY` → relocate
- `code-review.ANTHROPIC_API_KEY` → relocate
- `code-review.OPENAI_API_KEY` → relocate
- `code-review.GITHUB_TOKEN` → relocate

Already env-ref (✅): `blueprint-os.OBSIDIAN_TOKEN`, `obsidian.OBSIDIAN_TOKEN`, `manus.MANUS_MCP_API_KEY`.
Non-secret literals (leave as-is): `OBSIDIAN_URL` ×2, `NODE_TLS_REJECT_UNAUTHORIZED`.

**`~/.claude.json` mcpServers**: `obsidian`, `obsidian-mac-fs` — **NO plaintext secrets** (T013 = verified clean, no work needed).

## Connections (T004)

- Obsidian REST (`127.0.0.1:27124`): **HTTP 200** — reachable, write-gate open.
- Supabase MCP: LIVE (verified earlier this session via execute_sql).

## Exposure severity (from research R3)

`~/.cursor` git work-tree has NO remote; `mcp.json` not in commit history; perms 600; not cloud-synced. Local-only, never pushed → contained.

## OPEN FEASIBILITY QUESTION (blocks T011–T012)

Cursor is a GUI app; macOS GUI apps do NOT source `~/.zshrc`. The existing `${OBSIDIAN_TOKEN}` refs in `mcp.json` only resolve if Cursor sees that var in its launch environment. **Must confirm how Cursor resolves `${VAR}` before relocating the 6 secrets**, or relocation could silently break the github/hostinger/codex/code-review MCP servers. Options: (a) verify the existing Obsidian-MCP server actually works in Cursor today; (b) set vars via `launchctl setenv` / a LaunchAgent so GUI apps inherit them; (c) keep values in mcp.json but rely on its 600 perms + contained exposure.
