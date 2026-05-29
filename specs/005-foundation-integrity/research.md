# Phase 0 Research: Foundation Integrity

All unknowns resolved before design. Findings gathered live this session.

## R1 — Does `~/.cursor/mcp.json` support env-var references? (FR-003 feasibility)

**Decision**: Yes — convert the 6 plaintext entries to `${ENV_VAR}` form sourced from `~/.zshrc`.

**Rationale**: The file *already* uses this pattern in 3 servers, proving it works in this exact runtime:
- `blueprint-os` → `OBSIDIAN_TOKEN: ${OBSIDIAN_TOKEN}`
- `obsidian` → `OBSIDIAN_TOKEN: ${OBSIDIAN_TOKEN}`
- `manus` → `MANUS_MCP_API_KEY: ${MANUS_MCP_API_KEY}`

Cursor 3.3.30 (installed) supports `${...}` expansion in `env` blocks. No new mechanism needed.

**Alternatives considered**: A secrets manager (1Password CLI, `op run`) — rejected as over-abstraction (Constitution #10) for a single-user local machine; `~/.zshrc` exports are the existing, understood pattern.

## R2 — True count and location of plaintext secrets

**Decision**: Treat the count as **9 credential entries total, of which 6 are plaintext literals** needing relocation; **plus a second config file** (`~/.claude.json`) that must also be swept.

**Rationale**: Live inspection of `~/.cursor/mcp.json`:

| Server | Credential | State |
|---|---|---|
| github | `GITHUB_PERSONAL_ACCESS_TOKEN` | plaintext → relocate **+ rotate** |
| hostinger-mcp | `API_TOKEN` | plaintext → relocate **+ rotate** |
| codex | `OPENAI_API_KEY` | plaintext → relocate |
| code-review | `ANTHROPIC_API_KEY` | plaintext → relocate |
| code-review | `OPENAI_API_KEY` | plaintext → relocate |
| code-review | `GITHUB_TOKEN` | plaintext → relocate |
| blueprint-os | `OBSIDIAN_TOKEN` | already `${env-ref}` ✅ |
| obsidian | `OBSIDIAN_TOKEN` | already `${env-ref}` ✅ |
| manus | `MANUS_MCP_API_KEY` | already `${env-ref}` ✅ |

The spec's "9 plaintext" was itself a claimed-vs-actual miscount — recorded here as the corrected ground truth. **Second config discovered**: `~/.claude.json` contains its own `mcpServers` block (separate from Cursor's). It MUST be swept for plaintext secrets in the same pass, or relocation leaves a second exposed copy. This is a scope addition the spec did not name.

**Alternatives considered**: None — this is fact-finding, not a choice.

## R3 — Exposure severity (calibrates rotate-vs-relocate, FR-004)

**Decision**: Relocate all; rotate only GitHub PAT + Hostinger (highest blast radius). Confirmed contained exposure.

**Rationale** (verified this session):
- `~/.cursor` is a git work-tree but has **no remote** (`git remote -v` empty) → never pushed.
- `mcp.json` is **not in commit history** (`git log -- mcp.json` empty) → working-tree plaintext only.
- File perms `-rw-------` (600) → only the owner reads it.
- Not under any cloud-sync path (no iCloud/Dropbox/Drive in the path).
- Duplicate plaintext located in `~/WINDOWS_CLAUDE_BOOTSTRAP.md`; `Obsidian Vault/Connections/APIs.md` showed **no real-key prefixes** (placeholders, not live values).

Contained exposure ⇒ full rotation is overkill; targeted rotation of the two repo/infra-control keys is cheap insurance.

**Alternatives considered**: Rotate everything (rejected — no evidence of leak, high friction); relocate only with zero rotation (rejected — GitHub PAT + Hostinger control too much to leave un-rotated after sitting in cleartext).

## R4 — Source-of-truth taxonomy (US1)

**Decision**: Obsidian = facts/state; `CLAUDE.md` = behavior/protocol. The discriminator test: *changes week-to-week → Obsidian; rule about how Claude operates → CLAUDE.md.*

**Rationale**: The drift root-cause is volatile facts hand-maintained inside `CLAUDE.md` (bug status, "sandbox" vs live, EAS build #, connection LIVE claims). Moving every such fact to a single Obsidian home and leaving a pointer makes two-copy disagreement structurally impossible. Obsidian folders already exist (`Active/`, `Connections/`, `Decisions/`, `Projects/`, `Security/`, `Sessions/`) from the prior audit — reuse them, don't invent new taxonomy.

**Alternatives considered**: Merge CLAUDE.md into Obsidian entirely (rejected — operator wants them distinct: "Obsidian is the brain, CLAUDE.md is CLAUDE.md"); keep CLAUDE.md as master and mirror to Obsidian (rejected — mirroring is the two-copy pattern that drifts).

## R5 — Repo de-duplication method (US5)

**Decision**: For each duplicate, confirm the canonical copy, check the non-canonical copies for unique uncommitted work, then archive (move to `~/_archive/`) rather than hard-delete on first pass.

**Rationale**: Archive-before-delete is reversible; protects against deleting unique uncommitted content (edge case in spec). Canonical: `~/Twirl-Hub/repo/Twirl` (Twirl), `~/twirl-simulation` (MiroFish working copy, per memory). `~/Downloads/MiroFish-Offline` is the upstream download — record source URL, then archive.

**Alternatives considered**: Immediate `rm -rf` (rejected — irreversible, violates the "reconcile unique content first" edge case).

## R6 — Obsidian uptime as a gating dependency

**Decision**: Verify Obsidian reachable (MCP `obsidian_list` or `curl` to `127.0.0.1:27124`) immediately before any Obsidian write task; if down, block that task and surface to operator rather than writing facts to a fallback location.

**Rationale**: Obsidian REST returned `ECONNREFUSED` earlier this session, then recovered. Writing facts anywhere else "temporarily" would reintroduce the exact two-copy drift this feature eliminates.

**Alternatives considered**: Buffer writes to repo markdown and sync later (rejected for *facts* — that is two-homes; acceptable only for the spec artifacts themselves, which live in the repo by design).
