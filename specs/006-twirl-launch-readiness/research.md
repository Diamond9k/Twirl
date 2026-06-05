# Phase 0 Research: Twirl Launch Readiness

**Branch**: `006-twirl-launch-readiness` | **Date**: 2026-06-02
Resolves the technical unknowns from `plan.md` Technical Context. Each decision is grounded in the locked constitution (Stripe Express Connect, Edge Functions) and the `TWIRL_OVERHAUL_REPORT.md` findings.

---

## D1 — Owner payout mechanism (FR-006)

**Decision**: **Destination charge** with `transfer_data[destination] = <owner connected account>` and `application_fee_amount = 15%`, created server-side in `create-payment-intent` Edge Function.

**Rationale**: Single charge object handles renter charge, owner 85% transfer, and platform 15% fee atomically — no separate transfer call to orphan on failure (directly serves FR-010 crash-safety). Matches the locked "Stripe Express Connect" decision. Platform stays merchant of record.

**Alternatives considered**:
- *Separate Transfer after charge*: two API calls → second can fail and orphan money. Rejected (violates FR-010).
- *Direct charge on connected account*: owner becomes merchant of record → wrong liability model for a marketplace taking 15%. Rejected.

---

## D2 — Security-deposit hold (FR-008)

**Decision**: Separate **manual-capture PaymentIntent** (`capture_method: manual`) on the renter's card for the deposit amount, distinct from the rental-fee charge. Released via `cancel` on clean return, captured via `capture` on a damage claim. **Documented fallback**: if a reliable hold can't ship for launch, remove ALL deposit-hold language from `rental_contracts` + listings.

**Rationale**: Satisfies constitution principle #8 ("deposit held, never charged at booking") exactly — authorization places a hold without capturing funds. Manual-capture is the standard Stripe primitive for a temporary hold. The fallback guarantees the app never *promises* a hold it can't deliver (FR-008 explicit escape hatch → can't block launch).

**Open risk (carry to data-model + edge cases)**: card authorizations expire (~7 days). For rentals longer than the auth window, the hold lapses. Launch stance: **document the window and accept the risk for v1** (short rentals), or re-authorize — decide per rental duration. Flag in `quickstart.md` test.

**Alternatives considered**:
- *SetupIntent + off-session charge later*: saves a payment method but does NOT place a hold — funds aren't reserved, so a damaged-item claim may find no money. Rejected (breaks the "held" promise).
- *Capture deposit at booking, refund on return*: charges the renter real money up front. Rejected (violates principle #8).

---

## D3 — Server-computed amounts & RPC lockdown (FR-001, FR-002, FR-003)

**Decision**: (a) Apply `20260528_lockdown_money_rpcs.sql` (revoke anon/authenticated execute on the two RPCs — **G1**). (b) `create-payment-intent` reads the `rentals` row by id, recomputes `price_per_day × days`, `15%` fee, and deposit server-side; **client-supplied amount is ignored**. (c) New RLS migration blocks authenticated UPDATE on `rentals.{status,total_price,commission_amount,stripe_*}`.

**Rationale**: Directly closes the three confirmed-exploitable holes (earnings forgery, $0.01-pay-for-anything, client-writable money/status). Server is the only writer of money fields → the rental row is the single source of truth (constitution #4).

**Verification**: Supabase security advisor must show the two functions no longer anon/authenticated-executable; manual exploit attempts (US1 independent test) all rejected.

---

## D4 — Async event reconciliation (FR-009)

**Decision**: New `stripe-webhook` Edge Function, signature-verified, handling `payment_intent.succeeded`, `charge.dispute.created`, `account.updated`. Each handler updates the rental's recorded state via service-role; **idempotent by Stripe event id** (dedup table or upsert guard).

**Rationale**: Money can move at Stripe even if the app loses connectivity (spec edge case). The webhook is the authoritative reconciliation path so a rental is never stuck "unpaid" while paid, and disputes/onboarding updates land without manual work.

**Alternatives considered**:
- *Client confirms payment and writes status*: client is offline-fragile and was exactly the attack surface we're closing in D3. Rejected.

---

## D5 — Idempotent, atomic rent flow (FR-010)

**Decision**: Generate a client idempotency key per rent-request attempt; pass to Stripe (`Idempotency-Key`) and guard the rental insert. Sequence: create rental row (status=`requested`) → on payment, transition via service-role only after Stripe confirms. No money field written before Stripe success.

**Rationale**: Retries and double-taps cannot double-charge or double-credit; a mid-flow failure leaves at most a `requested` row, never a half-paid one.

---

## D6 — In-app account deletion (FR-014)

**Decision**: Edge Function (service-role) that, on user request: anonymizes/deletes profile PII, removes auth user, retains only legally required transaction records (rentals/payouts) in anonymized form, then signs the user out. Block deletion (with clear reason) if the user has an in-flight rental or held deposit (spec edge case).

**Rationale**: App Store hard requirement; must not strand an in-flight rental, held deposit, or counterparty.

---

## D7 — Block enforcement at data layer (FR-016)

**Decision**: Enforce `blocked_users` via **RLS** on `messages`/`conversations` so a blocked user cannot insert into an existing thread — not just a hidden button.

**Rationale**: Spec edge case explicitly calls out blocking via an *existing* conversation. UI-only hiding is bypassable; RLS is authoritative.

---

## D8 — Push, observability, double-booking (FR-018, FR-021, FR-022)

**Decision**:
- **Push**: Expo Notifications (already in Expo stack) for request/approval/payment/message.
- **Double-booking (FR-021)**: enforce server-side — exclusion on overlapping date ranges for an item (Postgres range check / constraint), not client validation.
- **Observability (FR-022)**: lightweight crash reporting + event analytics (vendor TBD — pick a free-tier that fits ~$389 budget; Sentry free tier is the leading candidate). **NEEDS DECISION at Phase 4 start** — not blocking earlier phases.

**Rationale**: Stay inside the Expo/Supabase stack and the budget. Double-booking must be a DB-level guarantee because availability is money-adjacent.

---

## D9 — Schema reconciliation (FR-023, FR-024)

**Decision**: Introspect live `qlulzatkhgblorbjndsz`, write a baseline migration capturing the **un-versioned base schema + undocumented signup trigger + connected-account column**, so a fresh DB reproduces production. Then a separate, reviewed purge of demo/test data. Never destroy real user rows (created by the live signup trigger).

**Rationale**: Constitution #4 (schema is the contract) + spec edge case (production has live trigger-created data the repo doesn't know about). Reconcile before launch so the repo is authoritative.

---

## Unresolved → carried forward

| Item | Where resolved |
|---|---|
| Deposit auth-window policy (re-auth vs accept risk) | data-model.md state transitions + quickstart test |
| Observability vendor choice | Phase 4 start (D8) — non-blocking |
| Exact demo/test rows to purge | data-model.md + a reviewed purge script (FR-024) |

All other NEEDS CLARIFICATION resolved. Ready for Phase 1 (data-model.md, contracts/, quickstart.md).
