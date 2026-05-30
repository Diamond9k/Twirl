# Feature Specification: Twirl Launch Readiness

**Feature Branch**: `006-twirl-launch-readiness`
**Created**: 2026-05-29
**Status**: Draft
**Target**: Safe public App Store launch with real money, ~mid-June 2026

**Input**: Take the existing Twirl app (P2P clothing-rental marketplace for sorority girls at the University of Arkansas) to a safe public App Store launch with real payments. Strategy is incremental hardening in place — not a rebuild — with the entire money flow built and proven in Stripe **test mode** before any live key is used. Grounded in the full deep-dive diagnostic at repo root `TWIRL_OVERHAUL_REPORT.md` (75 findings; 17 critical, 24 high; verified against live Supabase project `qlulzatkhgblorbjndsz`).

## Overview

Twirl looks finished but its marketplace economy does not actually work, and it carries live security and money-handling defects. This feature is the **single canonical track** to a launch that is safe for real users and real money. It is separate from, and must not overlap, `005-foundation-integrity` (Blueprint OS infrastructure cleanup — explicitly out of scope here).

The work is **strictly ordered: money and security correctness first, features and growth last.** Each phase is an independently shippable, independently testable slice. The guiding rule for the whole feature: **nothing that moves real money or real user data happens until it has been proven correct in test mode, and every irreversible action is gated behind explicit founder approval.**

The defining success condition: *a real renter rents a real item, the owner actually receives 85%, the security deposit is genuinely held and released correctly, the app passes App Store review, and the marketplace opens non-empty to founding affiliates — with zero critical security or money-handling defects.*

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Money & Security Correctness (Priority: P1)

The marketplace can no longer be cheated and no longer charges real cards on an unproven flow. A signed-in user cannot forge their earnings, cannot rewrite their own rental's price or status, and cannot dictate the amount they are charged; payment amounts are always computed by the server from the authoritative rental record. The app and the payment server both operate in Stripe **test mode** for the duration of the build.

**Why this priority**: These are the live, confirmed-exploitable defects (forgeable earnings, client-controlled charge amount, client-writable rental money/status fields). They are the only items carrying active financial-integrity risk and they gate every later phase — there is no point building features on a marketplace that can be robbed.

**Independent Test**: Attempt each exploit against the live (test-mode) system as a normal authenticated user — call the earnings RPC directly, submit a payment request with a $0.01 amount for a real rental, and try to UPDATE a rental's `status`/`total_price` via the data API. PASS only if every attempt is rejected and the server-computed amount always matches the rental record.

**Acceptance Scenarios**:

1. **Given** a signed-in (or anonymous) user, **When** they call `increment_owner_earnings` or `handle_new_user` directly via the data API, **Then** the call is rejected (execute permission revoked from `anon`/`authenticated`).
2. **Given** a renter on a real pending rental priced at $40, **When** the payment request is submitted with a client-supplied amount of $0.01, **Then** the server ignores the client amount and charges the amount derived from the rental record.
3. **Given** an authenticated renter, **When** they attempt to UPDATE their rental's `status`, `total_price`, `commission_amount`, or any `stripe_*` column via the data API, **Then** the write is rejected; legitimate status transitions occur only through server-side (service-role) functions.
4. **Given** the app and payment server, **When** any payment is initiated during the build period, **Then** it uses Stripe test keys and no real card is ever charged.

---

### User Story 2 — Payments Actually Work, Proven End-to-End in Test Mode (Priority: P1)

The complete rental money flow works correctly from request to payout. A renter can request and pay for an item; the owner actually receives their 85% via a real transfer to their connected account; the platform retains its 15%; the security deposit is genuinely placed as a hold and correctly released or captured on return. The flow is resilient: it does not crash or orphan data when a step fails, it cannot double-charge or double-credit, and the system stays correct even when payment events arrive asynchronously.

**Why this priority**: This is the heart of the product and the single largest gap — today owners are never paid and the deposit is never held. Without this, Twirl is not a marketplace. It is P1 alongside US1 because launch is impossible without it, but it depends on US1's correctness foundation.

**Independent Test**: In Stripe test mode, run a full rental lifecycle end-to-end with test cards: request → approve → pay → (deposit held) → return → deposit released and owner paid. Verify in the Stripe test dashboard that the owner's connected account received 85%, the platform fee captured 15%, and the deposit hold was placed and then released/captured. Force a mid-flow failure and a duplicate submission and confirm no orphaned rows, no double charge, and no double credit.

**Acceptance Scenarios**:

1. **Given** an approved rental, **When** the renter completes payment, **Then** the owner's connected account is credited 85% of the rental price and the platform retains 15% (verifiable in the Stripe test dashboard).
2. **Given** a rental whose contract promises a security deposit, **When** the renter pays, **Then** a real deposit hold is placed on their card; **and** on a clean return the hold is released, while on a damage claim it can be captured. *(If a genuine hold cannot be implemented for launch, all deposit-hold language is removed from the contract and listings so the app makes no promise it cannot keep.)*
3. **Given** an owner who has approved a rental, **When** the renter views it, **Then** there is a working path to complete payment (the approve→pay loop is no longer a dead end).
4. **Given** any step in the rent-request flow fails (network, validation, or permission), **When** the failure occurs, **Then** no partial/orphaned records are left behind and the user sees a clear error; **and** retrying does not create duplicates.
5. **Given** a payment or dispute event that occurs asynchronously at Stripe, **When** Stripe notifies the system, **Then** the rental's recorded state is updated to match (paid, disputed, or payout-enabled) without manual intervention.

---

### User Story 3 — Legal & App Store Compliance (Priority: P2)

The app meets the hard requirements to be accepted into the App Store and to legally operate as a money-handling marketplace: users can delete their account and data from within the app; Terms of Service and a Privacy Policy exist, are hosted, and are agreed to at signup; the iOS privacy disclosure is accurate; and users can report and block one another, with reviews supported and a path for the operator to act on reports. The operating legal entity (Arkansas LLC) exists before real money moves.

**Why this priority**: These are non-negotiable gates — missing in-app account deletion or a privacy policy is an automatic App Store rejection, and taking real money without an LLC or terms is a direct personal-liability exposure. They rank just below the money flow only because the app must first *work* before it is worth submitting.

**Independent Test**: Walk the App Store review checklist: delete a test account from within the app and confirm the data is removed/anonymized; open the hosted Terms and Privacy URLs; complete signup and confirm consent is required; submit a report and block a user and confirm the block is enforced. PASS only if every item is satisfied.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they choose to delete their account in the app, **Then** their account and personal data are deleted or anonymized (with only legally required transaction records retained), and they are signed out.
2. **Given** a new user at signup, **When** they create an account, **Then** they must agree to the Terms of Service and Privacy Policy, both reachable at public URLs.
3. **Given** a user who feels unsafe, **When** they block another user, **Then** the blocked user can no longer message or contact them; **and** a submitted report is recorded and reviewable by the operator.
4. **Given** the operator, **When** real money is about to be enabled, **Then** the Arkansas LLC is registered and named as the operating entity in the contract and policies.

---

### User Story 4 — UX Completeness & Observability (Priority: P3)

The app feels finished and the operator can see what's happening. Users receive push notifications for the events that matter (a rental request, an approval, a payment, a new message); profile photos appear throughout; users can edit their profile and reach settings; every screen shows proper loading, empty, and error states instead of silent blanks; an item can't be double-booked; and the operator has crash reporting and basic usage analytics.

**Why this priority**: This is the difference between "passes review" and "people actually use it and come back." Important for a real launch, but it sits below correctness, payments, and compliance — a working, safe, bug-free app beats a feature-rich broken one.

**Independent Test**: Exercise each surface: trigger each notification type and confirm delivery; confirm avatars render on profile, messages, conversation, and item screens; edit a profile; cut the network and confirm error/empty states (not blank screens); attempt to book an already-booked item; then confirm a crash and a key event both appear in the observability dashboards.

**Acceptance Scenarios**:

1. **Given** a user with the app installed, **When** they receive a rental request / approval / payment / message, **Then** a push notification is delivered.
2. **Given** any screen that loads data, **When** the data is loading, empty, or fails, **Then** the user sees a distinct loading, empty, or error state — never an ambiguous blank.
3. **Given** an item already rented for a date range, **When** another renter tries to book it for an overlapping range, **Then** the booking is prevented.
4. **Given** the app is in users' hands, **When** a crash or a key user action occurs, **Then** it is visible to the operator in crash-reporting/analytics.

---

### User Story 5 — Seed, Submit, and Launch (Priority: P3)

Twirl goes live correctly. The code repository is reconciled so it truly reflects the production database; all demo/test data is purged; the marketplace is seeded with real founding-affiliate inventory so it opens non-empty; the app's identity (bundle ID) is consistent so the store build succeeds; a new build is submitted and approved; and only then — after payouts, deposit holds, and event handling are all verified in test mode — are live payment keys enabled.

**Why this priority**: This is the final gate and depends on everything above being done. It is last not because it's least important but because it is the irreversible public step — it must come after correctness, payments, compliance, and polish are all proven.

**Independent Test**: Confirm the repo can reproduce the production database from scratch; confirm zero demo/test records remain; count seeded real items (target 50–100); confirm the build's identity is consistent and a build is accepted by the App Store; and confirm live keys are enabled only after a signed-off test-mode verification of the full money flow.

**Acceptance Scenarios**:

1. **Given** the production database, **When** the repository's migrations are applied to a fresh database, **Then** the result matches production (no hidden/undocumented schema).
2. **Given** the live marketplace at launch, **When** a first real user browses, **Then** they see real founding-affiliate inventory (target 50–100 items), not demo data.
3. **Given** a completed, review-ready build, **When** it is submitted to the App Store, **Then** its identity is consistent and the submission is accepted for review.
4. **Given** the full money flow verified in test mode and signed off, **When** the launch gate is reached, **Then** live payment keys are enabled — and not before.

### Edge Cases

- **A founding affiliate (owner) hasn't completed Stripe Connect onboarding when a renter tries to pay.** The system must prevent the rental from proceeding to payment (or hold funds) rather than charging a renter for an item whose owner cannot be paid.
- **A renter's deposit hold expires before the rental ends** (card authorizations don't last indefinitely). The system must define what happens (re-authorize, or accept the risk window) rather than silently losing the hold.
- **A payment succeeds at Stripe but the app loses connectivity before recording it.** The asynchronous event handler must reconcile so the rental is not stuck "unpaid" while money has moved.
- **A user deletes their account mid-rental** (as renter or owner). Deletion must not strand an in-flight rental, a held deposit, or the counterparty; in-flight obligations must resolve or block deletion with a clear reason.
- **A garment is damaged and the owner claims the deposit, but the renter disputes it.** There must be a defined dispute path and the deposit must not be both released to the renter and captured by the owner.
- **A blocked user attempts to contact someone via an existing conversation thread** (not a new one). The block must be enforced at the data layer, not only by hiding a button.
- **Production has live data created by the undocumented signup trigger that the repo doesn't know about.** Schema reconciliation must not destroy or duplicate real user rows.

## Requirements *(mandatory)*

### Functional Requirements

**Phase 1 — Money & Security Correctness (P1)**

- **FR-001**: The system MUST revoke execute permission on the `increment_owner_earnings` and `handle_new_user` database functions from the `anon` and `authenticated` roles, while preserving the user-signup trigger behavior.
- **FR-002**: The payment-creation flow MUST compute the charge amount and the deposit amount on the server from the authoritative rental record and MUST ignore any client-supplied amounts.
- **FR-003**: The system MUST prevent authenticated users from writing to rental money and status fields (`status`, `total_price`, `commission_amount`, `stripe_*`) via the data API; legitimate transitions MUST occur only through server-side functions.
- **FR-004**: The app client and the payment server MUST both operate in Stripe test mode throughout the build, until the final launch gate (FR-026).
- **FR-005**: The system MUST remove committed environment/secret files from version control and ensure all environment files are git-ignored. *(Note: a deep-scan check found no live secret keys committed; `.env.save` holds publishable/placeholder values only — this is hygiene, not an active leak.)*

**Phase 2 — Payments Work End-to-End (P1)**

- **FR-006**: The system MUST pay owners their share (85%) via a real transfer/destination charge to the owner's connected payment account, retaining the 15% platform fee, recorded against the rental.
- **FR-007**: The system MUST store each owner's connected-account identifier in a versioned schema migration.
- **FR-008**: The system MUST place a genuine security-deposit hold on the renter's card and release or capture it correctly on return — OR, if a genuine hold is not implemented for launch, MUST remove all deposit-hold language from the contract and listings.
- **FR-009**: The system MUST handle asynchronous payment events (payment succeeded, dispute created, owner-account updated) and reconcile the rental's recorded state accordingly.
- **FR-010**: The rent-request flow MUST be atomic and crash-safe — a failure at any step leaves no orphaned records — and MUST be idempotent so retries and duplicate submissions cannot double-charge or double-credit.
- **FR-011**: An owner-approved rental MUST have a working in-app path to complete payment.
- **FR-012**: The system MUST prevent payment when the owner cannot receive funds (incomplete Connect onboarding), rather than charging the renter.
- **FR-013**: Apple Pay configuration MUST be internally consistent so the payment sheet initializes without error, and the payment server location MUST be referenced consistently across the app.

**Phase 3 — Legal & App Store Compliance (P2)**

- **FR-014**: Users MUST be able to delete their account and associated personal data from within the app; the system MUST delete or anonymize that data while retaining only legally required transaction records.
- **FR-015**: Terms of Service and a Privacy Policy MUST exist, be hosted at public URLs, and be presented for agreement at signup; the iOS privacy disclosure MUST accurately reflect data collected.
- **FR-016**: Users MUST be able to report and block other users; blocks MUST be enforced at the data layer (including existing conversations); reviews MUST be supported; and reports MUST be reviewable by the operator.
- **FR-017**: The operating legal entity (Arkansas LLC) MUST be registered and named in the contract/policies before live payments are enabled. *(Founder-performed action.)*

**Phase 4 — UX Completeness & Observability (P3)**

- **FR-018**: The system MUST deliver push notifications for rental requests, approvals, payments, and new messages.
- **FR-019**: Profile photos MUST be displayed across profile, messages, conversation, and item screens; users MUST be able to edit their profile and reach a settings screen.
- **FR-020**: Every data-loading surface MUST present distinct loading, empty, and error states (no ambiguous blank screens).
- **FR-021**: The system MUST prevent double-booking of an item for overlapping rental periods and reflect availability.
- **FR-022**: The system MUST report crashes and capture basic usage analytics visible to the operator.

**Phase 5 — Seed, Submit, Launch (P3)**

- **FR-023**: The repository MUST be reconciled with the production database so that applying its migrations to a fresh database reproduces production (including the currently undocumented signup trigger, the connected-account column, and the un-versioned base schema), without destroying real data.
- **FR-024**: All demo/test data MUST be purged from production (the demo profile, the demo items, and the orphaned test user).
- **FR-025**: The marketplace MUST be seeded with real founding-affiliate inventory (target 50–100 items) before public launch. *(Founder/affiliate-driven.)*
- **FR-026**: The app's identity (bundle identifier) MUST be consistent; a new build MUST be submitted to the App Store with complete metadata; and live payment keys MUST be enabled only after the full money flow is verified in test mode and signed off.

### Key Entities

- **Rental**: The core transaction record. Authoritative source for price, commission, deposit, and status. Money/status fields are server-writable only. Moves through a lifecycle (requested → approved → paid → active → returned → completed; plus disputed/cancelled).
- **Profile**: A user (renter and/or owner). Owns listings, holds reputation/earnings (server-maintained), and — for owners — a connected-account identifier used for payouts.
- **Item (Listing)**: A garment available to rent, with availability that must reflect active rentals.
- **Rental Contract**: The agreement a renter signs, including any deposit terms — which must match what the system actually enforces.
- **Payment / Payout / Deposit**: The money objects — the renter's charge, the owner's 85% transfer, the platform's 15% fee, and the deposit hold — each recorded against a rental and reconciled with the payment processor's events.
- **Report / Block / Review**: Trust-and-safety records governing user-to-user safety and reputation; blocks are enforced at the data layer.
- **Connection / Connected Account**: An owner's payment-processor account that must be onboarded before they can be paid.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 of the confirmed critical security exploits remain reproducible (earnings forgery, $0.01 underpayment, client-side rental money/status writes all rejected).
- **SC-002**: In test mode, 100% of completed rentals result in the owner receiving exactly 85% and the platform exactly 15%, confirmed in the payment dashboard.
- **SC-003**: In test mode, the security deposit is correctly held and then released (clean return) or captured (damage claim) in 100% of test cases — or the app makes no deposit promise it does not keep.
- **SC-004**: A forced mid-flow failure and a duplicate submission each produce 0 orphaned records, 0 double charges, and 0 double credits.
- **SC-005**: 100% of App Store hard-gate items pass (in-app account deletion works; Terms and Privacy hosted and consented; report/block enforced) — verified before submission.
- **SC-006**: The marketplace opens with ≥50 real founding-affiliate items and 0 demo/test records remaining.
- **SC-007**: A fresh database built from the repository matches production with 0 undocumented schema objects.
- **SC-008**: The end-to-end goal is met at least once before public launch: a renter rents a real item, the owner is paid 85%, and the deposit is handled correctly — with 0 critical defects open.
- **SC-009**: Live payment keys are enabled only after a documented, signed-off test-mode verification of payouts, deposit handling, and event reconciliation.

## Assumptions

- **Incremental hardening, not a rebuild.** The existing ~2,300-line codebase, 10-table schema, and 3 edge functions are sound enough to harden in place; a rewrite is explicitly out of scope.
- **Test-mode-first is mandatory.** The entire money flow is built and proven with Stripe test keys; live keys are a final, founder-gated step. *(App-side test key already wired in this session.)*
- **The founder is solo and non-technical.** The AI performs all code, documents, and testing; the founder performs only human-gated actions: applying live database migrations, filing the LLC, driving affiliate inventory seeding, and submitting to the App Store. Every irreversible action (live DB change, real charge, store submission) requires explicit founder approval.
- **Founding-affiliate go-to-market.** Single-campus launch (University of Arkansas); founding affiliates (KKG, Pi Phi confirmed) supply the initial inventory. Seeding depends on their delivery and is the slowest non-code dependency.
- **Budget is ~$389.** Solutions favor free/low-cost tiers (e.g., the LLC ~$45, free observability tiers); no assumption of paid infrastructure beyond what exists.
- **Timeline target is ~mid-June 2026**, gated by App Store review time, LLC registration, and affiliate seeding — none of which the AI controls. The date flexes to protect correctness; an unsafe on-time launch is not an acceptable outcome.
- **`TWIRL_OVERHAUL_REPORT.md` (repo root) is the authoritative finding set** behind these requirements; live state was verified against Supabase project `qlulzatkhgblorbjndsz`.

## Out of Scope

- The `005-foundation-integrity` work (secrets relocation, Obsidian source-of-truth, connection/memory reconciliation) — tracked separately.
- Any full rewrite of the app, schema, or payment functions.
- Multi-campus expansion, web app, or Android-specific launch work beyond what the shared codebase already provides.
- Feature work on any other parked/revenue project.
