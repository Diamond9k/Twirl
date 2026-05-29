# Phase 1 Data Model: Foundation Integrity

This feature's "data" is the set of authoritative records it produces. Each schema below defines what a correct record looks like — the acceptance tests in `quickstart.md` check live reality against these shapes.

## Entity: Fact / State Record

A single piece of information that changes over time. **Home: Obsidian.**

| Field | Description | Example |
|---|---|---|
| key | What the fact is | "EAS build status" |
| value | Current value | "Build #5 in TestFlight" |
| last_verified | Date the value was confirmed against reality | 2026-05-28 |
| home | Obsidian path that owns it | `Active/Sprint.md` |

**Rule**: Exactly one Fact Record per fact. `CLAUDE.md` may reference it by pointer but MUST NOT restate the value.

## Entity: Behavioral Rule

An instruction governing how Claude operates. **Home: `CLAUDE.md`.** Does not change week-to-week.

| Field | Description | Example |
|---|---|---|
| rule | The protocol/behavior | "Open from ~/Twirl-Hub/repo/Twirl for skills to load" |
| stable | Must be true (week-to-week invariant) | true |

**Discriminator**: if `stable == false`, it is a Fact Record and belongs in Obsidian instead.

## Entity: Credential

A secret. **Value home: `~/.zshrc` (export).** Represented elsewhere only by name + location.

| Field | Description | Example |
|---|---|---|
| name | Env var name | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| provider | Where it authenticates | GitHub |
| consumers | Configs that reference it | `~/.cursor/mcp.json` (github), `~/.claude.json` |
| blast_radius | high / medium / low | high |
| disposition | relocate / relocate+rotate | relocate+rotate |
| rotated | y/n + date | y, 2026-05-28 |
| plaintext_remaining | MUST be n | n |

**Rotate set**: `GITHUB_PERSONAL_ACCESS_TOKEN`, Hostinger `API_TOKEN`. **Relocate-only set**: `OPENAI_API_KEY` (×2), `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `OBSIDIAN_TOKEN` (already ref), `MANUS_MCP_API_KEY` (already ref).

## Entity: Connection

An MCP server or external API. **Home: Obsidian `Connections/`.**

| Field | Description | Example |
|---|---|---|
| name | Connection name | Supabase MCP |
| type | mcp-server / api | mcp-server |
| status | verified live result | LIVE (Claude Code) |
| verify_command | Copy-paste check | `mcp list / execute_sql ping` |
| last_verified | Date | 2026-05-28 |
| notes | Caveats | Stripe MCP = Cursor-only, not in Claude Code |

**Known seed values (verified this session)**: Supabase MCP = LIVE; Obsidian MCP/REST = LIVE (recovered after ECONNREFUSED); Stripe MCP = not connected in Claude Code (Cursor-only); Manus = BLOCKED (no key); GitHub/Hostinger/Higgsfield = configured in Cursor.

## Entity: Project Catalog Entry

A parked or revenue project. **Home: Obsidian `Projects/`.** One page each.

| Field | Description | Example |
|---|---|---|
| name | Project | MiroFish |
| disk_location | Canonical path | `~/twirl-simulation` |
| state | parked / live / stub | parked (2026-05-28) |
| resume_trigger | What un-pauses it | "After Twirl launch; restart from fresh foundation" |
| mode | worked / catalogued-only | catalogued-only |

**Catalog set**: MiroFish, CloudOS dashboards (cooperbrain-os / agent-os / creative-os / life-os / blueprint-os-v2 `.html`), ScrapYard (scrapyard.to), AppFactory (4 boilerplates), RAG stub. Revenue projects = catalogued-only, no feature work.

## Entity: Repo Resolution

| Field | Description | Example |
|---|---|---|
| project | Project | Twirl |
| canonical | The one true path | `~/Twirl-Hub/repo/Twirl` |
| duplicates | Paths to archive | `~/Twirl`, `~/Documents/Twirl` |
| unique_work_checked | y/n before archiving | y |
| disposition | archived to `~/_archive/` / removed | archived |

## State Transitions (the only meaningful lifecycle here)

```
Credential:   plaintext ──relocate──▶ env-ref ──(if rotate set)──▶ rotated+env-ref
Fact:         two-homes(drift) ──reconcile──▶ one-home(Obsidian) + CLAUDE.md pointer
Repo:         N copies ──check-unique──▶ 1 canonical + archived duplicates
```
