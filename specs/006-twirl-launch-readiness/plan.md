# Implementation Plan: Twirl Launch Readiness

**Branch**: `006-twirl-launch-readiness` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-twirl-launch-readiness/spec.md`
**Authoritative diagnostic**: `TWIRL_OVERHAUL_REPORT.md` (repo root) — 75 findings (17 critical, 24 high), verified against live Supabase `qlulzatkhgblorbjndsz`.

## Summary

Take the existing Twirl app to a **safe** public App Store launch with real payments via **incremental hardening in place — not a rebuild** (codebase is ~2,300 lines, bones are sound). Work is **strictly ordered: money & security correctness first, growth last.** The entire money flow is built and proven in **Stripe test mode** before any live key is used, and every irreversible step is gated behind explicit founder approval.

Technical approach: lock down the two exploitable RPCs and rental-row writes (DB grants + RLS), move all money math server-side into Supabase Edge Functions (Deno), implement real Stripe Connect destination charges (85/15 split) + a genuine deposit hold via separate authorization, add a Stripe webhook for async reconciliation, make the rent flow atomic/idempotent, then layer compliance (account deletion, ToS/privacy, block/report), UX/observability, and finally schema reconciliation + seed + submit + flip-to-live.

## Technical Context

**Language/Version**: TypeScript (React Native app), Deno (Edge Functions), SQL (Postgres 15 / Supabase)
**Primary Dependencies**: Expo SDK ~54.0.34, expo-router ~6.0.23, @supabase/supabase-js ^2.104.0, @stripe/stripe-react-native 0.50.3, NativeWind ^4.2.3, RN 0.81.5
**Storage**: Supabase Postgres — project `qlulzatkhgblorbjndsz`, 10 tables (profiles, items, saved_items, conversations, messages, rentals, rental_contracts, reviews, reports, blocked_users)
**Testing**: `npm run typecheck` (clean gate, per constitution); Stripe **test mode** end-to-end with test cards; manual independent-test scripts per user story; Supabase security advisor for grant verification
**Target Platform**: iOS 15+ (EAS Build → TestFlight → App Store). Single campus: U of A.
**Project Type**: Mobile app + serverless API (Expo client + Supabase Edge Functions)
**Performance Goals**: N/A for launch — correctness over latency. Money operations must be exactly-once, not fast.
**Constraints**: Budget ~$389. Stripe secret key server-side only (never in app). All config via `EXPO_PUBLIC_*`. Test-mode-first mandatory until FR-026 gate. Auto-mode safety-blocks live-DB and live-key writes — those route to founder gates.
**Scale/Scope**: ~50–100 seeded items at launch; founding affiliates (KKG, Pi Phi) → Panhellenic. ~13 app screens, 4 Edge Functions, 10 tables.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| 1. Ship before perfect | ✅ | Strict P1→P3 ordering; deposit hold has a documented fallback (FR-008) so it can't block launch indefinitely |
| 2. No re-debating locked decisions | ✅ | Plan uses Supabase Edge Functions, Stripe Express Connect, single campus, NativeWind v4 + expo-router v6 — no relitigation |
| 3. Spec before screen | ✅ | This plan follows the canonical 006 spec (FR-001…026) |
| 4. Schema is the contract | ✅ | FR-007/FR-023 add connected-account column + reconcile schema via versioned migrations only |
| 5. Column positions never hardcoded | ✅ | All access by name; enforced in review |
| 6. Stripe is the only payment path | ✅ | No cash/Venmo; renter charge + lender payout both Stripe |
| 7. 15% commission | ✅ | FR-006: owner 85% destination charge, platform 15% |
| 8. Deposit held, never charged at booking | ✅ | FR-008: separate authorization hold, captured only on claim |
| Non-negotiable PR criteria | ✅ | typecheck clean, no hardcoded keys, DB writes have error branches, Stripe server-side only, NativeWind className |

**Gate result: PASS.** No violations. Complexity Tracking section omitted (nothing to justify).

> ⚠️ Constitution header still lists "Hard deadline: May 24, 2026 (Camp Ozark cutoff)". The 006 founder decision **superseded** this to "one clean safe public launch ~mid-June 2026 — date flexes to protect correctness." The constitution should be reconciled (out-of-band edit), but this does not block planning.

## FOUNDER GATES (human-only — tracked across the whole plan)

These four actions cannot be auto-executed (live-DB / live-key / legal / real-world). Each is wired to the phase it unblocks. **No phase that depends on a gate is "done" until the gate clears.**

| # | Gate | Blocks | Phase | How |
|---|---|---|---|---|
| **G1** | **Run the lockdown SQL** in Supabase SQL Editor (`supabase/migrations/20260528_lockdown_money_rpcs.sql`) | Closes the live earnings-forgery exploit (FR-001) | **Phase 1** | Paste file contents → run in SQL Editor → confirm via security advisor |
| **G2** | **Set `STRIPE_SECRET_KEY = sk_test_…`** in Supabase → Edge Functions → Secrets | Completes test-mode switch (FR-004); without it the *server* is still live | **Phase 1/2** | Supabase dashboard → Edge Functions → Secrets |
| **G3** | **File the Arkansas LLC** (~$45) | Naming the operating entity in contract/policies (FR-017) before live money | **Phase 3** | Arkansas SOS filing; then name entity in legal docs |
| **G4** | **Drive affiliate inventory seeding** — 50–100 real items (KKG/Abby, Pi Phi) | Non-empty marketplace at launch (FR-025); slowest non-code dependency — **start now in parallel** | **Phase 5** | Affiliate outreach + listing; can run during all earlier phases |

> **G1 and G2 are the two that make the current TestFlight build safe.** Until both clear, Build #5 remains "takes real money, pays no one" — do not promote it. **G4 is the long pole — kick it off in parallel immediately; it does not wait for code.**

## Project Structure

### Documentation (this feature)

```text
specs/006-twirl-launch-readiness/
├── spec.md              # Canonical spec (FR-001…026) — DONE
├── plan.md              # This file
├── research.md          # Phase 0 output — key technical decisions resolved
├── data-model.md        # Phase 1 output — entities, server-writable fields, lifecycle
├── quickstart.md        # Phase 1 output — test-mode end-to-end verification script
├── contracts/           # Phase 1 output — Edge Function request/response contracts
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root) — real layout

```text
app/                                  # expo-router screens
├── (auth)/{login,signup,signup1,signup2}.tsx
├── (tabs)/{index,list,messages,profile,rentals,_layout}.tsx
├── conversation/[id].tsx
├── contract/[id].tsx
├── item/[id].tsx
└── _layout.tsx
                                      # ⚠ NEW: payment/checkout path (FR-011) — app/checkout.tsx absent today
lib/
├── supabase.ts                       # client
└── constants.ts
supabase/
├── functions/
│   ├── create-payment-intent/        # FR-002: server-computed amount (currently trusts client) 🔴
│   ├── create-connect-account/       # FR-006/012: Connect onboarding
│   ├── release-deposit/              # FR-008: deposit release/capture
│   └── (NEW) stripe-webhook/         # FR-009: async event reconciliation
└── migrations/
    ├── 20260511_add_profile_demographics.sql
    ├── 20260524_release_deposit_rpc.sql
    ├── 20260528_lockdown_money_rpcs.sql   # G1 — written, NOT applied
    └── (NEW) connected-account column (FR-007), rental-write RLS (FR-003),
              block-enforcement RLS (FR-016), schema reconciliation (FR-023)
legal/
└── privacy-policy.md                 # DRAFT v1 — needs hosting + ToS (FR-015)
marketing/
└── twirl-what-is-it.html             # explainer
```

**Structure Decision**: Mobile + serverless API. Client (Expo/expo-router) stays thin; **all money logic lives in Edge Functions + Postgres RLS/grants**. No new top-level structure — the work is hardening existing dirs and adding one Edge Function (`stripe-webhook`) plus migrations.

## Phased Approach (maps to spec user stories)

### Phase 1 — Money & Security Correctness (P1) — FR-001…005
The marketplace can't be cheated and the server is in test mode.
- **FR-001 / G1**: Apply lockdown migration — revoke `anon`/`authenticated` execute on `increment_owner_earnings` + `handle_new_user`; harden `search_path`. *(Migration written; founder runs it.)*
- **FR-002**: Rewrite `create-payment-intent` to compute charge + deposit from the authoritative `rentals` row; ignore client amount entirely.
- **FR-003**: RLS migration — block authenticated UPDATE on `rentals.status/total_price/commission_amount/stripe_*`; transitions only via service-role functions.
- **FR-004 / G2**: App already `pk_test_`; founder sets server `STRIPE_SECRET_KEY=sk_test_`. **Verify both ends test-mode.**
- **FR-005**: Confirm env files git-ignored (hygiene — no active leak found).
- **Independent test**: run the 3 exploit attempts from spec US1 → all rejected.

### Phase 2 — Payments Work End-to-End in Test Mode (P1) — FR-006…013
The full rental money flow works and is crash-safe.
- **FR-007**: Migration — add owner connected-account column to `profiles`.
- **FR-006**: `create-payment-intent` → Stripe Connect destination charge, 85% to owner, 15% platform fee, recorded on rental.
- **FR-008**: Separate authorization (setup/manual-capture intent) for the deposit hold; release on clean return, capture on claim. **Fallback**: if a genuine hold can't ship, strip all deposit-hold language from contract + listings (no broken promise).
- **FR-009**: NEW `stripe-webhook` Edge Function — handle `payment_intent.succeeded`, `charge.dispute.created`, `account.updated`; reconcile rental state.
- **FR-010**: Make rent-request atomic + idempotent (idempotency key; no orphaned rows on mid-flow failure; retries safe).
- **FR-011**: Build the approve→pay path (likely `app/checkout.tsx`) so an approved rental has a working payment screen.
- **FR-012**: Block payment when owner Connect onboarding incomplete.
- **FR-013**: Apple Pay config consistent; payment-server reference consistent across app.
- **Independent test**: full lifecycle in Stripe test dashboard — owner gets 85%, platform 15%, deposit held→released/captured; forced failure + duplicate submission leave no orphans/double-charge.

### Phase 3 — Legal & App Store Compliance (P2) — FR-014…017
Hard App Store + money-handling gates.
- **FR-014**: In-app account deletion (delete/anonymize personal data; retain legally required tx records; sign out).
- **FR-015**: Host ToS + Privacy Policy at public URLs (privacy draft exists); require consent at signup; accurate iOS privacy disclosure.
- **FR-016**: Block/report enforced at data layer (RLS, including existing conversations); reviews supported; reports operator-reviewable.
- **FR-017 / G3**: Founder files Arkansas LLC, then name entity in contract/policies. **Gates live-money enablement.**

### Phase 4 — UX Completeness & Observability (P3) — FR-018…022
- **FR-018**: Push notifications (request/approval/payment/message).
- **FR-019**: Profile photos across profile/messages/conversation/item; profile edit + settings reachable.
- **FR-020**: Distinct loading/empty/error states everywhere — no blank screens.
- **FR-021**: Prevent double-booking on overlapping ranges; reflect availability.
- **FR-022**: Crash reporting + basic analytics visible to operator.

### Phase 5 — Seed, Submit, Launch (P3) — FR-023…026
The irreversible public step — only after everything above is proven.
- **FR-023**: Reconcile repo migrations to reproduce production (capture undocumented signup trigger, connected-account column, un-versioned base schema) without destroying real data.
- **FR-024**: Purge demo/test data (demo profile, demo items, orphaned test user).
- **FR-025 / G4**: Seed 50–100 real founding-affiliate items. *(Founder/affiliate-driven — start in parallel now.)*
- **FR-026**: Make bundle ID consistent; submit new build with complete metadata; **enable live keys ONLY after test-mode money flow is signed off — and not before.**

## Dependency Order & Parallelism

```
G4 (seed) ───────────────────────────────────────────────► (parallel, start now)

Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5
  │           │            │                       │
  G1,G2     (uses G2)      G3 ──────────────────► FR-026 live-key flip
```
- Phase 1 must complete before Phase 2 (no payments on an exploitable marketplace).
- G1+G2 unblock everything money-related and make TestFlight #5 safe.
- G3 (LLC) can proceed any time but **gates the final live flip**.
- G4 (inventory) is the slowest real-world dependency — **run it from day one in parallel.**

## Complexity Tracking

*No constitution violations — section intentionally empty.*

## Next Step

Phase 1 design artifacts (Phase 0/1 of the plan command): `research.md`, `data-model.md`, `contracts/`, `quickstart.md` — then `/speckit-tasks` to generate `tasks.md`, then `/speckit-implement` phase by phase with founder approving each irreversible gate.
