# Data Model: CooperBrain OS

**Database**: Postgres via dedicated Supabase project `cooperbrain-os` (separate from Twirl's `qlulzatkhgblorbjndsz`)
**ORM**: Drizzle
**Schema source of truth**: `src/lib/db/schema.ts`

---

## Tables

### `scheduled_tasks`

Cron-style recurring tasks. The agent control center.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | `gen_random_uuid()` |
| `name` | text NOT NULL | Human-readable label |
| `agent` | text NOT NULL | `manus` \| `claude_code` \| `curl` \| `script` |
| `cron` | text NOT NULL | Standard cron syntax (5-field) |
| `prompt` | text | For agent types that take a prompt |
| `command` | text | For `curl` / `script` agents |
| `enabled` | boolean NOT NULL DEFAULT true | |
| `last_run_at` | timestamptz | Updated on every dispatch |
| `last_status` | text | `success` \| `failed` \| `running` \| `pending` |
| `consecutive_failures` | int NOT NULL DEFAULT 0 | Reset on success |
| `metadata` | jsonb | Free-form, e.g., env vars to inject |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

**Indexes**: `(enabled, last_run_at)` for the dispatch query

---

### `task_runs`

History of every task execution. Audit trail.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `task_id` | uuid (FK → scheduled_tasks) NOT NULL | ON DELETE CASCADE |
| `started_at` | timestamptz NOT NULL DEFAULT now() | |
| `ended_at` | timestamptz | NULL while running |
| `exit_code` | int | 0 = success |
| `status` | text NOT NULL | `running` \| `success` \| `failed` \| `timeout` |
| `output` | text | stdout, capped at 64KB |
| `error` | text | stderr or exception message |
| `duration_ms` | int generated always as ((ended_at - started_at) * 1000) stored | |

**Indexes**: `(task_id, started_at DESC)` for the run-history drawer

---

### `mcp_servers`

State table for MCP server health monitoring. Source of truth for config is `~/.cursor/mcp.json` — this table tracks *observed* state over time.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `name` | text NOT NULL UNIQUE | Matches key in mcp.json `mcpServers` |
| `type` | text NOT NULL | `url` \| `command` |
| `url` | text | For type=`url` |
| `command` | text | For type=`command` |
| `current_status` | text NOT NULL | `live` \| `degraded` \| `down` \| `unknown` |
| `last_checked_at` | timestamptz NOT NULL | |
| `last_live_at` | timestamptz | Updated only on green status |
| `last_error` | text | Most recent failure reason |
| `config_snapshot` | jsonb | Full mcp.json entry at last sync |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

---

### `mcp_health_history`

Time series of MCP health checks. For uptime charts.

| Column | Type | Notes |
|---|---|---|
| `id` | bigserial (PK) | |
| `server_id` | uuid (FK → mcp_servers) NOT NULL | ON DELETE CASCADE |
| `checked_at` | timestamptz NOT NULL DEFAULT now() | |
| `status` | text NOT NULL | `live` \| `degraded` \| `down` |
| `response_ms` | int | |
| `error` | text | |

**Indexes**: `(server_id, checked_at DESC)`; partition by month (post-V1 optimization)

---

### `key_rotations`

Track when credentials were last rotated and where they were exposed.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `key_name` | text NOT NULL | e.g., `OBSIDIAN_TOKEN`, `GITHUB_PAT` |
| `last_rotated_at` | timestamptz | NULL if never rotated |
| `next_due_at` | timestamptz | Computed: `last_rotated_at + interval '90 days'` |
| `exposure_history` | jsonb | `[{file, found_at, severity, mitigated_at}, ...]` |
| `provider` | text | `obsidian` \| `github` \| `stripe` \| etc — used to generate dashboard URL |
| `notes` | text | Free-form |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

**Constraints**: UNIQUE(`key_name`)

---

### `audit_log`

Every meaningful action — dashboard or background.

| Column | Type | Notes |
|---|---|---|
| `id` | bigserial (PK) | |
| `ts` | timestamptz NOT NULL DEFAULT now() | |
| `source` | text NOT NULL | `dashboard` \| `cron` \| `api` \| `cli` |
| `event` | text NOT NULL | e.g., `task.created`, `key.rotated`, `env.updated` |
| `actor` | text | Usually `cooper` (single user) |
| `target` | text | Resource ID or path affected |
| `meta` | jsonb | Free-form payload |

**Indexes**: `(ts DESC)`; `(event, ts DESC)` for per-event filtering

---

### `workflow_definitions`

React Flow graph data. Lets us edit graphs without code changes.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `slug` | text NOT NULL UNIQUE | e.g., `session-start`, `twirl-launch`, `mcp-topology` |
| `name` | text NOT NULL | Display name |
| `description` | text | |
| `nodes` | jsonb NOT NULL | React Flow node array |
| `edges` | jsonb NOT NULL | React Flow edge array |
| `is_dynamic` | boolean NOT NULL DEFAULT false | If true, refreshed live from `mcp_servers` etc |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

---

### `reports`

Pointer / pin / metadata table for documents — actual content stays in Obsidian / filesystem.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | |
| `title` | text NOT NULL | |
| `source_type` | text NOT NULL | `obsidian` \| `specify_spec` \| `local_file` |
| `path` | text NOT NULL | URL path or file path |
| `category` | text | `sprint` \| `session` \| `spec` \| `report` |
| `pinned` | boolean NOT NULL DEFAULT false | Pinned reports appear at top |
| `last_viewed_at` | timestamptz | |
| `metadata` | jsonb | Free-form (e.g., spec phase progress) |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | |

---

## Row Level Security

Since this is single-user (Cooper only), RLS is permissive:

```sql
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON scheduled_tasks
  FOR ALL USING (auth.uid() = 'COOPER_USER_UUID'::uuid);
-- Apply same pattern to all tables
```

The `service_role` key bypasses RLS for cron dispatch and Edge Functions.

---

## Seed Data (run after migration)

```sql
-- Initial key rotation rows (one per credential)
INSERT INTO key_rotations (key_name, provider, notes) VALUES
  ('OBSIDIAN_TOKEN', 'obsidian', 'Exposed in COOPERBRAIN_BOOTSTRAP.md and ~/Downloads/CLAUDE.md — rotate'),
  ('GITHUB_PAT', 'github', 'Exposed in ~/.cursor/mcp.json — rotate'),
  ('SUPABASE_SERVICE_ROLE_KEY', 'supabase', 'Not yet set'),
  ('STRIPE_SECRET_KEY', 'stripe', 'Not yet set'),
  ('MANUS_MCP_API_KEY', 'manus', 'Not yet obtained'),
  ('EXPO_TOKEN', 'expo', 'Not yet set'),
  ('HOSTINGER_API_TOKEN', 'hostinger', 'Plaintext in ~/.cursor/mcp.json');

-- Initial MCP server rows from current mcp.json
INSERT INTO mcp_servers (name, type, url, current_status, last_checked_at) VALUES
  ('github', 'command', NULL, 'unknown', now()),
  ('supabase', 'url', 'https://mcp.supabase.com/mcp', 'unknown', now()),
  ('stripe', 'url', 'https://mcp.stripe.com', 'unknown', now()),
  ('hostinger-mcp', 'command', NULL, 'unknown', now());

-- Static workflow: session-start protocol
INSERT INTO workflow_definitions (slug, name, nodes, edges) VALUES
  ('session-start', 'Session Start Protocol',
   '[{"id":"1","type":"FileSystem","data":{"label":"Obsidian Vault"}},
     {"id":"2","type":"Service","data":{"label":"Obsidian REST API"}},
     {"id":"3","type":"DataStore","data":{"label":"Active/Sprint.md"}},
     {"id":"4","type":"Agent","data":{"label":"Claude Code"}},
     {"id":"5","type":"Tool","data":{"label":"Report blocker + days to May 24"}}]'::jsonb,
   '[{"source":"1","target":"2"},
     {"source":"2","target":"3"},
     {"source":"3","target":"4"},
     {"source":"4","target":"5"}]'::jsonb);
```

---

## Drizzle Schema (TypeScript)

Lives at `src/lib/db/schema.ts`. Generated migrations land in `drizzle/`. Apply with `npx drizzle-kit push`.

Example excerpt:

```typescript
import { pgTable, uuid, text, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const scheduledTasks = pgTable('scheduled_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  agent: text('agent', { enum: ['manus', 'claude_code', 'curl', 'script'] }).notNull(),
  cron: text('cron').notNull(),
  prompt: text('prompt'),
  command: text('command'),
  enabled: boolean('enabled').notNull().default(true),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastStatus: text('last_status'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

Full schema lives in the repo, not in this doc.
