# Quickstart: Foundation Integrity Verification Runbook

This is the acceptance test. Every success criterion maps to a command whose output is a binary PASS/FAIL. Run after implementation; the feature is DONE when all pass. Secret values are never printed — checks detect presence/prefix only.

## SC-002 — Zero plaintext secrets

```bash
# PASS = no output (no plaintext secret values remain)
grep -nE 'sk-ant-|sk-proj-|sk-[A-Za-z0-9]{20}|ghp_|github_pat_' ~/.cursor/mcp.json ~/.claude.json 2>/dev/null
# PASS = every credential line is a ${ENV_VAR} reference
python3 -c "import json;d=json.load(open('$HOME/.cursor/mcp.json'));[print(k,e,v) for s,c in d['mcpServers'].items() if 'env' in c for e,v in (k:=s,c['env']).__class__ and c['env'].items() if not str(v).startswith('\${')]"
```

## SC-002b — No secret duplicated in tracked/synced docs

```bash
# PASS = only placeholder/example hits (no real prefixes) in WINDOWS_CLAUDE_BOOTSTRAP.md and Obsidian
grep -rnE 'sk-ant-[A-Za-z0-9]|ghp_[A-Za-z0-9]|github_pat_[A-Za-z0-9]' ~/WINDOWS_CLAUDE_BOOTSTRAP.md ~/"Obsidian Vault/Connections/" 2>/dev/null
```

## SC-003 — Rotated keys invalid at provider

```bash
# GitHub PAT: PASS = OLD token returns 401 (run with the OLD value, expect failure)
#   curl -s -o /dev/null -w '%{http_code}' -H "Authorization: token OLD_PAT" https://api.github.com/user   # expect 401
# Hostinger: confirm in dashboard the old token is revoked. PASS = new token in ~/.zshrc only.
grep -c 'GITHUB_PERSONAL_ACCESS_TOKEN\|HOSTINGER' ~/.zshrc   # PASS = exports present
```

## SC-001 — CLAUDE.md has zero volatile facts

```bash
# PASS = no output. These patterns are facts that must live in Obsidian, not CLAUDE.md.
grep -nED 'Build #[0-9]|sandbox|pk_live|pk_test|TestFlight|RESOLVED|EAS Build|unread_count|acct_1' ~/CLAUDE.md
# PASS = a pointer to Obsidian exists
grep -nED 'Obsidian|Active/Sprint' ~/CLAUDE.md
```

## SC-004 — Connection map self-verifies

```bash
# For each entry in Obsidian Connections/, run its verify_command and compare to recorded status.
# Example seeds:
#   Supabase MCP   → execute_sql 'select 1'            (expect 1)         status LIVE
#   Obsidian REST  → curl -sk -H "Authorization: Bearer $OBSIDIAN_TOKEN" https://127.0.0.1:27124/vault/  (expect 200)
#   Stripe MCP     → recorded "not connected in Claude Code" — PASS if still absent from this session's tools
# PASS = recorded status == live result for 100% of entries.
```

## SC-005 — Memory has no contradictions

```bash
# PASS = each memory file's named facts (files/flags/status) verified against reality or corrected.
ls ~/.claude/projects/-Users-cooperporter-Twirl-Hub-repo-Twirl/memory/*.md
# Manual cross-check vs Obsidian; PASS = no fact disagrees between the two homes.
```

## SC-006 — One canonical copy per project

```bash
# PASS = exactly one active Twirl repo; others under ~/_archive/
find ~ -maxdepth 4 -name .git -type d 2>/dev/null | sed 's#/.git##' | grep -iE 'twirl|mirofish' | grep -v _archive
# Cross-check each path against the Obsidian repo-resolution record.
```

## SC-007 — Every parked/revenue project catalogued

```bash
# PASS = an Obsidian Projects/ page exists for each, with name + disk_location + state + resume_trigger.
# Catalog set: MiroFish, cooperbrain-os, agent-os, creative-os, life-os, blueprint-os-v2, ScrapYard, AppFactory, RAG-stub
```

## SC-008 — Capstone: future session can derive true state with no contradictions

Manual: read ONLY `~/CLAUDE.md` + Obsidian `Active/Sprint.md` + `Connections/`. PASS = current true state (Twirl status, connections, secrets posture) is determinable and nothing contradicts a live check.

---

**Order of execution (risk-first, per plan):** US1 (source-of-truth rule) → US2 (secrets) → US3 (connections) → US4 (memory) → US5 (repos) → US6 (catalog). Run this runbook top-to-bottom at the end; partial runs are valid per-workstream gates.
