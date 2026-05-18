# Data Model: CooperBrain OS

**Storage**: localStorage (browser) + Obsidian vault (read-only) + embedded JSON constants

---

## localStorage Schema

All keys prefixed `cooperbrain:` to avoid collisions.

| Key | Type | Description |
|---|---|---|
| `cooperbrain:budget` | number | Current remaining budget in USD |
| `cooperbrain:budget_updated` | ISO string | Timestamp of last budget edit |
| `cooperbrain:tasks:<id>` | boolean | Checked state per task, keyed by task ID |
| `cooperbrain:session_note` | string | Free-text note for current session |

---

## Embedded Constants (in `<script>` block)

```js
const CONFIG = {
  obsidian: {
    url: 'http://127.0.0.1:27124',
    token: 'YOUR_TOKEN_HERE'  // single edit point at top of file
  },
  deadlines: [
    { label: 'Camp Ozark',    date: '2026-05-24', urgency: 'critical' },
    { label: 'August Rush',   date: '2026-08-01', urgency: 'high'     }
  ],
  budget: {
    initial: 500,
    default_remaining: 389
  }
}

const HOR_DECISIONS = [
  { decision: 'Remove Gluestack',          score: 8.4, status: 'EXECUTE'    },
  { decision: 'Supabase Edge Functions',   score: 8.5, status: 'EXECUTE'    },
  { decision: 'Stripe Express Connect',    score: 7.6, status: 'EXECUTE'    },
  { decision: 'Single campus launch',      score: 9.2, status: 'CONFIRMED'  },
  { decision: 'Live futures $100',         score: 2.1, status: 'NEVER'      },
  { decision: 'Lucid 25K funded account',  score: 6.3, status: 'WHEN READY' },
  { decision: 'Car detailing',             score: 5.8, status: 'FALL 2026'  }
]

const TASKS = [
  // Phase 0 — Schema Verification
  { id: 'T-00', phase: 0, label: 'Confirm conversations column names in Supabase' },
  { id: 'T-01', phase: 0, label: 'Confirm messages realtime enabled' },
  { id: 'T-02', phase: 0, label: 'Confirm profiles.stripe_account_id exists' },
  // Phase 1 — Fix Inbox
  { id: 'T-03', phase: 1, label: 'Fix unread_count query in messages.tsx' },
  // Phase 2 — Conversation Screen
  { id: 'T-04', phase: 2, label: 'Create app/conversation/[id].tsx' },
  { id: 'T-05', phase: 2, label: 'Wire messages.tsx onPress to conversation route' },
  // Phase 3 — Edge Function
  { id: 'T-06', phase: 3, label: 'Write create-payment-intent/index.ts' },
  { id: 'T-07', phase: 3, label: 'Set Edge Function env vars in Supabase dashboard' },
  { id: 'T-08', phase: 3, label: 'Deploy create-payment-intent' },
  { id: 'T-09', phase: 3, label: 'Verify EXPO_PUBLIC_API_URL in .env' },
  // Phase 4 — iPhone Runtime
  { id: 'T-10', phase: 4, label: 'Clean prebuild: expo prebuild --platform ios --clean' },
  { id: 'T-11', phase: 4, label: 'pod install' },
  { id: 'T-12', phase: 4, label: 'Launch on physical iPhone via Xcode' },
  { id: 'T-13', phase: 4, label: 'Diagnose crash if any' },
  // Phase 5 — Stripe Connect
  { id: 'T-14', phase: 5, label: 'Write create-connect-account Edge Function' },
  { id: 'T-15', phase: 5, label: 'Add "Set up payouts" CTA to profile.tsx' },
  { id: 'T-16', phase: 5, label: 'Deploy create-connect-account' },
  // Phase 6 — EAS Build
  { id: 'T-17', phase: 6, label: 'Confirm Apple Developer account active' },
  { id: 'T-18', phase: 6, label: 'Add bundleIdentifier to app.json' },
  { id: 'T-19', phase: 6, label: 'Create eas.json' },
  { id: 'T-20', phase: 6, label: 'eas build:configure' },
  { id: 'T-21', phase: 6, label: 'eas build --platform ios --profile preview' },
  { id: 'T-22', phase: 6, label: 'eas submit to TestFlight' },
  { id: 'T-23', phase: 6, label: 'Add affiliates to TestFlight' },
  // Phase 7 — Screen Audit
  { id: 'T-24', phase: 7, label: 'Audit list.tsx (listing flow)' },
  { id: 'T-25', phase: 7, label: 'Audit rentals.tsx' },
  { id: 'T-26', phase: 7, label: 'Audit profile.tsx' },
  { id: 'T-27', phase: 7, label: 'Audit signup1/signup2 flow' },
  // Phase 8 — Seed
  { id: 'T-28', phase: 8, label: 'Coordinate with Abby + Pi Phi to list items' },
  { id: 'T-29', phase: 8, label: 'Verify items in browse screen' },
  // Phase 9 — Final Validation
  { id: 'T-30', phase: 9, label: 'Full end-to-end walkthrough on two iPhones' },
  { id: 'T-31', phase: 9, label: 'npm run typecheck — zero errors' },
  { id: 'T-32', phase: 9, label: 'Rotate Obsidian API key (exposed in plaintext)' }
]
```

---

## DOM State Model

| Element | Source | Updates via |
|---|---|---|
| `#obsidian-status` | `fetch()` to Obsidian | Auto-refresh (60s) |
| `#sprint-content` | `fetch()` `Active/Sprint.md` | Auto-refresh (60s) |
| `#days-ozark` | `new Date()` vs `2026-05-24` | Auto-refresh (60s) |
| `#days-rush` | `new Date()` vs `2026-08-01` | Auto-refresh (60s) |
| `#budget-display` | localStorage | Budget edit form |
| `.task-checkbox[data-id]` | localStorage | User click |
| `#session-note` | localStorage | User typing |
| `#hor-table` | `HOR_DECISIONS` constant | Static on load |

---

## State Transitions: Connection Health

```
CHECKING → LIVE     (fetch 200)
CHECKING → OFFLINE  (fetch fails / timeout)
CHECKING → CHECKING (on next refresh cycle)

LIVE    → CHECKING  (auto-refresh fires)
OFFLINE → CHECKING  (auto-refresh fires)
```

Status colors:
- `LIVE` → `#22c55e` (green)
- `CHECKING` → `#eab308` (yellow, pulsing)
- `OFFLINE` → `#ef4444` (red)
- `STATIC_YELLOW` → `#eab308` (Manus, RAG — no live check possible)
