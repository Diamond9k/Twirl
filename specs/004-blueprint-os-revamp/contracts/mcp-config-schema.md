# Contract: MCP Config Schema

**File**: `~/.cursor/mcp.json`
**Purpose**: Defines all MCP connections for Claude Code / Cursor

---

## Current State (7 servers configured)

```json
github, supabase, stripe, hostinger-mcp, higgsfield, codex, code-review
```

## Target State (9 servers — add Obsidian + Manus)

### Obsidian MCP Block to Add

```json
"obsidian": {
  "command": "node",
  "args": ["/Users/cooperporter/.cooperbrain/obsidian-bridge.mjs"],
  "env": {
    "OBSIDIAN_TOKEN": "${OBSIDIAN_TOKEN}",
    "OBSIDIAN_URL": "https://127.0.0.1:27124"
  }
}
```

**Note**: obsidian-bridge.mjs already exists at `~/.cooperbrain/obsidian-bridge.mjs`.
Verify it exposes MCP-compatible tool definitions before wiring.
If not MCP-compatible, use `npx @modelcontextprotocol/server-obsidian` (community server).

### Manus MCP Block to Add (placeholder until API key obtained)

```json
"manus": {
  "command": "npx",
  "args": ["-y", "manus-mcp-client"],
  "env": {
    "MANUS_MCP_API_KEY": "${MANUS_MCP_API_KEY}"
  }
}
```

**Blocked on**: Cooper providing `MANUS_MCP_API_KEY`.
**Action**: `echo 'export MANUS_MCP_API_KEY="YOUR_KEY"' >> ~/.zshrc && source ~/.zshrc`

---

## Verification Protocol (per R-017, R-018)

After adding blocks, verify each new server:
1. Restart Cursor
2. Run `/mcp` in Claude Code — confirm server appears as connected
3. Execute one tool call per new server — confirm valid response
4. If fail: check env var export in ~/.zshrc, check server command path

---

## Security Note

mcp.json contains API keys in env blocks. Do not commit this file to git.
The file is at `~/.cursor/mcp.json` (outside all repos) — safe from accidental commit.
