# Twirl — Full Diagnostic & Overhaul Report

_Method: 2 head agents × 5 sub-agents (Discovery + Diagnostic) → synthesis. Live-verified against Supabase project `qlulzatkhgblorbjndsz`._

**Findings: 75 total — 17 critical · 24 high · 22 medium · 12 low**


---


# Twirl — Overhaul & Relaunch Plan

## 1. Current State — The Honest Read

Twirl is a real, working app skeleton with a fake economy underneath it. That is the one-sentence read.

The frontend is competent: 14 screens, a clean expo-router v6 structure, a coherent (if half-finished) design system, a real signup→browse→request→contract→messaging→ledger loop. It compiles, it runs, it looks on-brand. The schema is thoughtful — 10 tables, RLS on everything, manual-capture Stripe lifecycle modeled correctly. For a solo founder this is genuinely above the bar for "an app exists."

But the moment you follow the money, it falls apart. **The marketplace does not pay sellers.** There is no `transfer_data.destination`, no `application_fee_amount`, no `transfers.create` anywhere — the captured rental funds sit in Twirl's platform Stripe balance and owners get a fake `total_earnings` integer (CRITICAL: "No real payout to owners," edge functions). **The security deposit the contract legally promises is never held** — `contract/[id].tsx:58` only confirms the rental PaymentIntent; the deposit intent is created and abandoned in `requires_payment_method` (CRITICAL, multiple findings). **The core transaction can't even complete via the intended flow** — owner taps APPROVE, the renter's tab shows a banner with no button, and `create-payment-intent` hard-requires `status='pending'`, so an approved rental is permanently unpayable (CRITICAL: "Approved rental has no path to payment").

It's worse than incomplete — it's exploitable, confirmed live. `create-payment-intent` charges the **client-supplied amount**, never compared to the rental row, so a renter pays 1 cent for anything (CONFIRMED CRITICAL). `increment_owner_earnings` is **anon-executable, SECURITY DEFINER, unguarded** — anyone with the shipped anon key can inflate any profile's earnings via PostgREST (CONFIRMED LIVE). The `rentals` UPDATE policy has **no WITH CHECK** and authenticated can write every column including `status` and `total_price` (CONFIRMED LIVE). And it's running a **`pk_live` key** while doing all of this.

On top of the money problems, it cannot pass App Store review: **no account-deletion path** (Guideline 5.1.1(v), automatic rejection), **no Terms/Privacy Policy**, **no content moderation** (report/block/review tables exist, zero app code touches them), and a **bundle-ID contradiction** (`app.json` `twirl.rentals` vs native `com.twirl.rentals`) that is the prime suspect for the existing EAS submission failure. And even if all that were fixed, the marketplace is **empty** — 3 seed items from 1 fake "Cooper Porter" profile, 0 completed rentals.

The honest read: the app is ~70% of a UI and ~15% of a marketplace. The hard, unglamorous 85% — money settlement, trust/safety, legal, ops — is the part that isn't built. The "Build #5 in TestFlight" status is misleading; what's in TestFlight is a demo that takes real money and pays no one.

## 2. Verdict: Rebuild vs. Incremental vs. Hybrid

**Verdict: Incremental hardening. Do NOT rebuild. Keep the schema, keep the frontend, keep the edge functions — fix them in place.**

Reasoning:

- **The codebase is small and the bones are right.** ~2,300 lines of screens, 10 well-designed tables, 3 deployed-and-current edge functions (the audit confirmed the deployed `release-deposit` is byte-for-byte identical to the repo — not stale). A rebuild throws away working auth, working realtime chat, a working browse/list/ledger UI, and a thoughtful RLS model to re-solve problems already solved. That's negative ROI.

- **The failures are not architectural — they're missing logic and missing guards.** "Owners aren't paid" isn't a wrong architecture; it's a missing `transfer_data.destination` on a PaymentIntent that already exists. "Deposit never held" is a missing second confirmation. "Anyone can forge earnings" is a missing `REVOKE`. "Client sets the price" is a 3-line server-side derivation. None of these require a new app — they require finishing the one you have. A rebuild would reproduce the same 14 screens and 10 tables and then *still* have to write the payout logic.

- **Budget forces it.** $389 total. A rebuild burns weeks of the most valuable resource (founder + agent time) re-achieving the current state before adding a dollar of value. Opus 4.8 + ultracode is a *force multiplier on a working codebase* — it can land the payout/deposit/RLS fixes fast precisely because the surrounding code already exists and is mapped. Point that leverage at the 85% that's missing, not at recreating the 15% that works.

- **The one defensible "rebuild" carve-out is the payment server logic, and even that is a rewrite-in-place**, not a new project. The edge functions stay; their internals change (server-derived amounts, Connect transfers, deposit confirmation, webhooks). That's hybrid-flavored within an incremental plan.

The rule for this plan: **freeze frontend feature work, harden money + security + legal first, then complete the missing UX, then seed.** Treat `pk_live` as off until the money flow is correct — switch back to `pk_test` today (HIGH: "Live Stripe key in a pre-launch app").

## 3. Launch Blockers — Ranked

Ordered as a gate list: money/security correctness → trust/legal/compliance → UX completeness → growth/seeding. Nothing below a gate ships until the gate is closed.

**TIER A — Money & Security Correctness (must close before any real charge)**

1. **REVOKE `increment_owner_earnings` from anon/authenticated.** One SQL statement. Confirmed live: anon-executable SECURITY DEFINER, lets anyone forge earnings/reputation via PostgREST. Gates launch because it's a live financial-integrity hole. **Effort: S.** (CRITICAL "increment_owner_earnings RPC is anon/authenticated-executable"; LOW search_path findings.)

2. **Lock down `rentals` UPDATE RLS.** Confirmed live: no WITH CHECK, authenticated can rewrite `status`, `total_price`, `commission_amount`, `stripe_*`. Gates launch because a renter can self-advance status and forge money fields that `release-deposit` reads. Add WITH CHECK + REVOKE on money/status columns; drive transitions through service-role edge functions. **Effort: M.** (CRITICAL "rentals UPDATE policy has no WITH CHECK.")

3. **Server-derive charge amounts in `create-payment-intent`.** Ignore client `amount`/`deposit`; compute from the fetched rental row. Gates launch because a renter can pay 1¢ for anything. **Effort: S.** (CRITICAL "create-payment-intent charges client-supplied amount.")

4. **Implement real owner payouts (Stripe Connect transfers).** Add `transfer_data.destination` = owner `stripe_account_id` + `application_fee_amount` = the 15%, or `transfers.create` on capture. Add the missing `profiles.stripe_account_id` to a migration. Gates launch because **owners are never paid** — the defining failure of a marketplace. **Effort: XL.** (CRITICAL "No real payout to owners.")

5. **Make the deposit hold real, or remove the promise.** Either confirm the deposit PaymentIntent (second sheet / SetupIntent + manual capture) or strip all deposit-hold language from the contract and listings. Gates launch because the signed contract misrepresents a hold that never happens — legal + trust exposure. **Effort: L.** (CRITICAL "Security deposit is never authorized.")

6. **Crash-safe rent-request + idempotent completion.** `item/[id].tsx` ignores insert errors and dereferences null `rentalData.id`, orphaning conversation/message rows; `release-deposit` double-credit race. Move the 3 inserts into one RPC/edge transaction; make the status flip the atomic gate (`...where status='active'`) and add Stripe idempotency keys. Gates launch because it corrupts data on the primary revenue path. **Effort: M.** (CRITICAL "Rental-creation inserts ignore errors"; HIGH "double-credit race.")

7. **Add a Stripe webhook function.** Listen for `payment_intent.succeeded`, `charge.dispute.created`, `account.updated`. Gates launch because state is 100% client-button-driven — orphaned authorizations, invisible disputes, fake "payouts set up." **Effort: L.** (HIGH "No Stripe webhook handling.")

**TIER B — Reconcile the One Working Flow**

8. **Fix the approve→pay loop and Apple Pay merchant ID.** Pick one model: drop "approved" (renter pays from pending — already works) OR accept `'approved'` in `create-payment-intent` and add a "Complete Payment" button routing to `/contract/[id]`. Fix `merchantIdentifier` mismatch (`_layout.tsx:61` `merchant.com.twirl.rentals` vs `app.json:39` `merchant.twirl.rentals`). Centralize the edge-function URL (the `EXPO_PUBLIC_API_URL` no-`/functions/v1` bug). Gates launch because the core transaction can't complete and Apple Pay throws at runtime. **Effort: M.** (CRITICAL "Approved rental has no path"; CRITICAL "Apple Pay merchantIdentifier mismatch"; HIGH "contract payment URL.")

**TIER C — Compliance & Legal (must close before submission)**

9. **In-app account deletion.** Settings screen + service-role `delete-account` edge function that anonymizes/SET-NULLs the NO-ACTION FKs. Automatic App Store rejection without it (Guideline 5.1.1(v)). **Effort: M.**

10. **Terms of Service + Privacy Policy.** Host at `twirl.rentals/terms` and `/privacy`, consent checkbox at signup, fix `PrivacyInfo.xcprivacy` (currently declares zero data collected while collecting email/photos/payment). Required for submission and for legally taking money. **Effort: M.** (CRITICAL "No ToS or Privacy Policy.")

11. **Register the Arkansas LLC (~$45).** Cooper is personally the legal intermediary on real payments and the named "arbitrator." Close before any real money or signed contract. **Effort: S.**

12. **Trust & safety: report, block, reviews + moderation read path.** Wire the unused `reports`/`blocked_users`/`reviews` tables; enforce blocks in `messages`/`conversations` RLS; add a service-role moderation read. Required for UGC apps (Guideline 1.2) and non-negotiable for young women meeting strangers. **Effort: L.** (CRITICAL "No content moderation"; HIGH "blocked_users zero enforcement," "reports unreadable.")

13. **Bundle identifier + EAS submission fix.** Canonicalize to `com.twirl.rentals` in `app.json`, align Apple Pay merchant, re-prebuild, resubmit. Prime suspect for the existing submission failure. **Effort: S.** (HIGH "Bundle identifier contradiction.")

**TIER D — UX Completeness & Observability (launch-quality)**

14. **Push notifications** (`expo-notifications`, write `push_token`, fire on message/request/approval/payment). Silent = dead transaction for an 11pm impulse user. **Effort: L.**
15. **Crash reporting + analytics** (Sentry + PostHog free tiers). Launching a money app on RN 0.81 + New Arch blind is reckless. **Effort: M.**
16. **Edit-profile/settings + display avatars** (fix the `is_verified` WITH CHECK first; render `avatar_url` everywhere). **Effort: M.**
17. **Double-booking guard** + flip `items.available` on active rental. **Effort: M.**
18. **Error states + support contact** (kill the silent-empty-vs-error ambiguity; add `mailto:` + dispute intake that sets `disputed`). **Effort: M.**

**TIER E — Growth / Cold-Start (the actual launch gate)**

19. **Purge seed data** ("Cooper Porter"/sorority="Twirl"/3 demo items, orphaned `abby@uark.edu`). **Effort: S.**
20. **Supply-first seeding sprint** — affiliates list ~50–100 real pieces before any broad invite. Inventory is the launch gate, not the build. **Effort: L.** (CRITICAL "Cold-start: marketplace is empty.")

## 4. The Roadmap — 4 to 6 Phases

### Phase 1 — Money & Security Lockdown (THE NEXT SPRINT)
**Goal:** Make it impossible to forge money/earnings/status, and stop charging real cards on a broken flow.
**Tasks:**
- Switch `.env` `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` to `pk_test_…`.
- New migration: `REVOKE EXECUTE ON FUNCTION public.increment_owner_earnings(uuid,numeric) FROM anon, authenticated, public;` + `ALTER FUNCTION ... SET search_path = ''` on it, `set_updated_at`, `is_edu_email`.
- New migration: replace `rentals` "Rental parties update rentals" policy with a WITH CHECK forbidding money-column changes and constraining `status`; `REVOKE UPDATE` on `total_price, commission_amount, deposit_amount, owner_id, renter_id, status, stripe_*` from authenticated.
- `supabase/functions/create-payment-intent/index.ts`: derive `amount`/`deposit` from fetched `rental.total_price`/`rental.deposit_amount`; drop `amount`/`deposit` from request contract.
- `git rm --cached .env.save`; add `.env*` to `.gitignore`. Enable Leaked Password Protection in Supabase Auth.
**Exit:** No anon/authenticated path can mutate earnings or rental money/status; charges derive server-side; `pk_test` in use; advisors show 0 ERROR-level findings on those functions.

### Phase 2 — Make Payments Actually Work
**Goal:** Owners get paid; deposits are real; the transaction completes.
**Tasks:**
- Migration: `alter table profiles add column if not exists stripe_account_id text` (capture the out-of-band column under version control).
- `create-payment-intent`: add `transfer_data.destination = owner.stripe_account_id` + `application_fee_amount = commission` (or `transfers.create` at capture in `release-deposit`).
- Deposit: confirm the deposit PI in `contract/[id].tsx` (second sheet or SetupIntent) **or** remove deposit-hold language from contract + listings.
- `release-deposit`: atomic completion (`update ... where status='active'`, check affected rows) + Stripe idempotency keys (`release-${rental_id}`, `pi-rental-${rental_id}`).
- New `supabase/functions/stripe-webhook/index.ts`: verify signature; handle `payment_intent.succeeded` (→paid), `charge.dispute.created` (→disputed), `account.updated` (→`payouts_enabled` flag).
- `item/[id].tsx`: move the 3 inserts into one RPC/edge transaction; check every `error`; guard `rentalData?.id`.
- Fix approve→pay (pick one model) + Apple Pay merchant ID + centralize edge-fn URL in `lib/api.ts`.
**Exit:** A test rental on `pk_test` charges the renter, transfers 85%-equivalent to a connected test account, holds a real deposit (or makes no claim), completes idempotently, and survives a forced insert failure without orphaning rows.

### Phase 3 — Schema Discipline & Compliance Backend
**Goal:** Repo reproduces prod; legal + deletion + safety backend exist.
**Tasks:**
- `supabase db pull` → baseline migration capturing all 10 tables, demographics ALTERs, **`handle_new_user()`/`on_auth_user_created`** (currently invisible in repo), and `recent_rentals_by_user`; reconcile `schema.sql` (fix the stale `is_verified` WITH CHECK so it matches the hand-fixed live policy).
- Recreate `recent_rentals_by_user` with `security_invoker=on` (or drop it — nothing reads it). `REVOKE EXECUTE` on `handle_new_user` from anon/authenticated.
- `delete-account` service-role edge function (anonymize/SET NULL the NO-ACTION FKs).
- Fix `profiles` UPDATE WITH CHECK so unverified users can self-edit.
- Enforce `blocked_users` in `messages`/`conversations` INSERT policies; add moderator read path on `reports`; add the confirmed-missing FK indexes (`messages.sender_id`, `rentals.item_id`, `conversations.item_id`).
- Draft + host ToS/Privacy; register Arkansas LLC.
**Exit:** `supabase db reset` reproduces prod; account deletion works for a transacted user; blocks enforced at DB layer; ToS/Privacy live; LLC filed.

### Phase 4 — UX Completeness & Submission
**Goal:** Pass App Store review and feel finished.
**Tasks:**
- `app/settings.tsx` + `app/edit-profile.tsx`; render `avatar_url` everywhere (shared `Avatar` component); report/block/review UI; support contact + dispute intake.
- `expo-notifications` + Sentry + PostHog.
- `+not-found.tsx`; error/loading states distinct from empty; `list.tsx` picker instead of tap-to-cycle; double-booking guard + `items.available` toggle.
- Canonicalize bundle ID to `com.twirl.rentals`; re-prebuild; complete App Store Connect (privacy answers, screenshots, support/privacy URLs, age rating); resubmit.
**Exit:** Build accepted to TestFlight under correct identity; review-readiness checklist green.

### Phase 5 — Seed & Soft Launch
**Goal:** A non-empty marketplace and a controlled first cohort.
**Tasks:**
- Purge "Cooper Porter"/3 demo items/`abby@uark.edu` seed.
- Founding-affiliate listing event (KKG/Abby, Pi Phi) → ~50–100 real items.
- Flip to `pk_live` only now, with transfers + webhooks + server-derived amounts verified.
- Invite-gated soft launch to confirmed chapters; watch the PostHog signup→list→browse→rent funnel and Sentry.
**Exit:** ≥50 live real items, ≥1 real completed end-to-end rental (renter charged, owner paid, deposit handled), zero CRITICAL advisors.

## 5. The First Step (Start Today)

**Write and apply one migration that closes the two confirmed-live financial holes, then flip the Stripe key to test.**

Concretely, in `/Users/cooperporter/Twirl-Hub/repo/Twirl/supabase/migrations/`, create `20260528_lockdown_money.sql` containing:

```sql
REVOKE EXECUTE ON FUNCTION public.increment_owner_earnings(uuid, numeric) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.increment_owner_earnings(uuid, numeric) TO service_role;
ALTER FUNCTION public.increment_owner_earnings(uuid, numeric) SET search_path = '';
```

Apply it (`supabase db push` or the Supabase MCP `apply_migration`), then change `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env` from the `pk_live_…` value to your `pk_test_…` key.

Why this first: it's a single small action that immediately neutralizes the worst confirmed-live exploit (anyone with the shipped anon key inflating earnings) and stops real cards from being charged on a flow that doesn't pay owners — and it forces you into the migration-first discipline Phase 3 needs. The `release-deposit` edge function uses the service-role key, so it keeps working. Highest risk-reduction per minute of any action on the list.

## 6. Risks That Could Sink This

- **The payout rewrite (Connect transfers) is the one XL item and the one that matters most.** It's the deepest unknown — onboarding completion, `charges_enabled` gating, destination-charge vs. separate-transfer semantics, refund/dispute handling across connected accounts. If anything sinks this, it's underestimating this. Treat it as its own focused build with a Stripe-docs research pass first; do not let it bleed into "while I'm in here" frontend work.

- **Solo-founder scope collapse.** Tiers A–E are real work. The temptation is to do the fun frontend polish (avatars, design tokens) and defer the unglamorous money/legal/safety. That inverts the only correct order. The discipline of this plan is: **no Tier D/E work until A/B/C gates close.**

- **Cold-start is the actual launch gate, and it's a people problem, not a code problem.** You can ship a flawless app to an empty marketplace and it dies on day one. Seeding 50–100 real items from affiliates is harder and slower than any code task here and depends on Abby + Pi Phi delivering. If supply isn't lined up in parallel with Phases 3–4, the August window slips regardless of code state.

- **Legal exposure is personal until the LLC + ToS exist.** Right now Cooper is personally intermediating real money (`pk_live`) and named as binding arbitrator in a contract the app can't enforce. A single damaged-garment dispute before the LLC + real deposits is direct personal liability. The ~$45 LLC and the ToS are cheap insurance that must precede real money.

- **Bleeding-edge stack fragility.** RN 0.81 + React 19 + New Arch + Reanimated v4 + the anomalous `expo-font ^55.0.6` pin is internally consistent but brittle. Run `expo-doctor` early; a partial upgrade or a wrong-major font package could break a build at the worst time (right before resubmission). Pin versions and avoid speculative upgrades during the launch run.

- **Hidden prod/repo drift.** The live `handle_new_user` trigger, the out-of-band `stripe_account_id` column, and the untracked base schema mean the repo currently *cannot* reproduce prod. Until Phase 3's `db pull` lands, any "fix" applied from the repo risks colliding with invisible live state (as the dual-writer signup already does). Don't do DDL from `schema.sql` against prod before reconciling — it would silently reintroduce the `is_verified` self-edit lockout.

- **App Store rejection loop.** Account deletion, ToS/Privacy, moderation, and an accurate privacy manifest are all hard gates. Missing any one is a full rejection-and-resubmit cycle measured in days. Front-load all of Tier C before the *first* resubmission attempt rather than discovering them one rejection at a time.


---

# Appendix A — Detailed Findings (Critical + High)


## CRITICAL (17)


### [C1] Approved rental has no path to payment — broken approve→pay loop (dead-end navigation)

- **Category:** launch-blocker · **Effort:** M · **Source agent:** Twirl Frontend & UX (app/ directory — screens, navigation, user journeys)
- **Location:** `app/(tabs)/rentals.tsx:199-213 (renter info banners, no button) + app/contract/[id].tsx (only reachable from item detail) + supabase/functions/create-payment-intent (requires status='pending')`
- **Evidence:** rentals.tsx:200 returns a <View> banner (no onPress); contract is only pushed at item/[id].tsx:79 right after the pending insert.
- **Impact:** The core marketplace transaction cannot complete via the intended flow. When an owner taps APPROVE (rentals.tsx:83 sets status='approved'), the renter's 'renting' tab only renders a static green banner 'Approved — complete payment to confirm' (rentals.tsx:200-205) with no tappable action. /contract/[id] is only ever pushed from item/[id].tsx during the initial request while status is still 'pending'. Worse, create-payment-intent filters .eq('status','pending'), so after approval the rental is permanently unpayable. The renter is told to pay but given no way to do it.
- **Fix:** Make the renting-tab 'approved' (and 'pending') states a TouchableOpacity that does router.push(`/contract/${rental.id}`). Either drop the 'approved' status entirely (renter pays directly from pending, which already works) or update create-payment-intent to accept status in ('pending','approved'). Decide on ONE canonical flow and wire the button.

### [C2] Apple Pay merchantIdentifier mismatch between _layout.tsx and app.json

- **Category:** launch-blocker · **Effort:** S · **Source agent:** Twirl Frontend & UX (app/ directory — screens, navigation, user journeys)
- **Location:** `app/_layout.tsx:61 (merchant.com.twirl.rentals) vs app.json:39 (merchant.twirl.rentals)`
- **Evidence:** _layout.tsx:61 string literal; app.json:39 plugin config.
- **Impact:** StripeProvider is initialized with merchantIdentifier='merchant.com.twirl.rentals' but the @stripe/stripe-react-native plugin in app.json registers 'merchant.twirl.rentals'. Apple Pay requires the merchant ID passed at runtime to match the one provisioned via the entitlement/plugin and registered in Apple Developer. A mismatch breaks Apple Pay payment sheets and can throw at Stripe init on the contract screen — directly undermining the only payment path.
- **Fix:** Choose one merchant ID (recommend matching the canonical bundle id, e.g. merchant.com.twirl.rentals), set it identically in app.json's stripe plugin config AND in StripeProvider, register it in Apple Developer, then rebuild.

### [C3] Security deposit is never authorized — contract terms are unenforceable

- **Category:** bug · **Effort:** L · **Source agent:** Twirl Frontend & UX (app/ directory — screens, navigation, user journeys)
- **Location:** `app/contract/[id].tsx:57-58 (depositIntentClientSecret returned but never presented)`
- **Evidence:** contract/[id].tsx:58 initPaymentSheet({ paymentIntentClientSecret, ... }) — depositIntentClientSecret destructured at :57 but unused except for deriving deposit_intent_id at :62.
- **Impact:** initPaymentSheet receives only paymentIntentClientSecret. The deposit PaymentIntent is created (manual capture) but no card is ever attached to it, so it sits in requires_payment_method and no hold exists. The contract UI (contract/[id].tsx:122-178) states '$X will be held on your card' and clauses 1,2,3,5 all depend on a real hold. At return, release-deposit can't capture/refund a never-confirmed intent. Renters agree to forfeitable-deposit terms that cannot be enforced — a launch-grade trust and legal exposure.
- **Fix:** Present/confirm the deposit hold too: after the rental sheet succeeds, run a second payment sheet for the deposit PI, or use a SetupIntent + off-session manual capture. If not feasible before launch, strip all deposit-hold language from the contract and listing to avoid making promises the system can't keep.

### [C4] Rental-creation inserts ignore errors and dereference possibly-null rentalData → crash + orphaned rows

- **Category:** bug · **Effort:** M · **Source agent:** Twirl code quality & correctness (app/, components/, hooks/, lib/, supabase/functions/)
- **Location:** `app/item/[id].tsx:48-84 (esp. :52-58 conversations insert, :60-71 rentals insert, :79 router.push(`/contract/${rentalData.id}`))`
- **Evidence:** Line 58: `}).select().single();` returns `{ data: convo }` only. Line 60-71 same pattern for rentals → `rentalData`. Line 79: `router.push(`/contract/${rentalData.id}`)` with no null check. Catch at :80 only Alerts e.message.
- **Impact:** handleRentRequest runs three inserts (conversations, rentals, messages) but destructures only `{ data }` and never checks the `error` on any of them. On the rentals insert, if RLS rejects, a constraint fails, or the network drops, `rentalData` is null. Line 79 then reads `rentalData.id`, throwing 'Cannot read property id of undefined' which is caught and shown as an Alert — but by then a conversation row and a first message row have ALREADY been written with no matching rental, permanently orphaning data (the schema's UNIQUE(user1,user2,item) also means the next attempt for the same item fails the conversation insert too, so retry is broken). The core 'rent request' action — the primary revenue path — silently corrupts data and can hard-fail with a cryptic error.
- **Fix:** Check `error` after each insert and abort early: `const { data: convo, error: cErr } = ...; if (cErr) throw cErr;` likewise for rentals and messages. Guard `if (!rentalData?.id) throw new Error('Could not create rental');` before navigating. Ideally move the 3 writes into a single edge function / RPC transaction so a failure can't leave a conversation+message without a rental. Use upsert/onConflict for the conversation to make retries idempotent.

### [C5] create-payment-intent charges client-supplied amount/deposit, never compared to the rental row it fetched

- **Category:** security · **Effort:** S · **Source agent:** Twirl code quality & correctness (app/, components/, hooks/, lib/, supabase/functions/)
- **Location:** `supabase/functions/create-payment-intent/index.ts:33-63`
- **Evidence:** Line 39 selects total_price/deposit_amount; line 48 `amount` and line 58 `amount: deposit` come straight from `await req.json()` at :33 with no equality check against the rental.
- **Impact:** The function selects `total_price, deposit_amount` from the rental (:39) but then creates the Stripe PaymentIntent using the raw `amount`/`deposit` from the request body (:48-52, :58-62), never comparing them. A renter can POST `{ rental_id, amount: 1 }` for their own pending rental and pay 1 cent for any item; conversely amounts can be set arbitrarily high. The server enforces identity and status='pending' but not the price. This defeats the entire pricing/commission model.
- **Fix:** Ignore client `amount`/`deposit`. Derive both server-side from the fetched rental: `amount = Math.round(rental.total_price * 100)`, `deposit = Math.round((rental.deposit_amount ?? 0) * 100)`. Drop `amount` from the request contract entirely.

### [C6] Deposit PaymentIntent is created but never confirmed — no security hold is ever actually placed

- **Category:** bug · **Effort:** L · **Source agent:** Twirl code quality & correctness (app/, components/, hooks/, lib/, supabase/functions/)
- **Location:** `app/contract/[id].tsx:57-58 (only paymentIntentClientSecret fed to the sheet); supabase/functions/release-deposit/index.ts:56-68`
- **Evidence:** contract :58 `initPaymentSheet({ paymentIntentClientSecret, ... })` — depositIntentClientSecret absent. :62 uses it only via `.split('_secret')[0]`. release-deposit :59/:61 only act on requires_capture/succeeded statuses the deposit PI can never reach.
- **Impact:** create-payment-intent returns both a rental and a deposit client secret, but contract/[id].tsx passes ONLY `paymentIntentClientSecret` into initPaymentSheet (:58). `depositIntentClientSecret` is only string-split to store an id (:62) and is never presented/confirmed, so no card is ever attached to the deposit intent. It stays in requires_payment_method, so at return release-deposit's branch (:59 requires_capture / :61 succeeded) never matches and does nothing. Net: the contract promises 'a security deposit of $X will be held on your card' and names late-fee/forfeiture clauses, but no money is ever held — every damage/non-return clause is unenforceable.
- **Fix:** Decide the deposit model and implement it: either present both intents (collect the deposit hold via a second confirmation / SetupIntent + off-session capture), or use a single PaymentIntent with manual capture covering rental+deposit, or drop the deposit feature until it can be built. At minimum, do not show contract language guaranteeing a hold that the code never creates.

### [C7] increment_owner_earnings RPC is anon/authenticated-executable, SECURITY DEFINER, and unguarded — arbitrary earnings forgery (CONFIRMED LIVE)

- **Category:** security · **Effort:** S · **Source agent:** Security & Money-Handling (Stripe Connect, RLS, Edge Functions, Secrets, Abuse)
- **Location:** `supabase/migrations/20260524_release_deposit_rpc.sql; live DB function public.increment_owner_earnings`
- **Evidence:** Live query: select has_function_privilege('anon', p.oid,'EXECUTE') => anon_exec:true, auth_exec:true, security_definer:true. RPC body: `update profiles set total_earnings = total_earnings + p_amount, total_rentals = total_rentals + 1 where id = p_owner_id;` with no auth.uid() guard. Advisor lint 0028/0029 flags the same.
- **Impact:** Verified on the live DB: has_function_privilege('anon', ...)=true and ('authenticated', ...)=true, prosecdef=true. Because it is SECURITY DEFINER it bypasses RLS, and it has no check that the caller is the owner or that a legitimate rental completed. Any party holding the public EXPO_PUBLIC_SUPABASE_ANON_KEY (shipped in every app binary) can call POST /rest/v1/rpc/increment_owner_earnings with {p_owner_id: <any uuid>, p_amount: 999999} and inflate any profile's total_earnings and total_rentals without limit. Today total_earnings is only a displayed counter, but the moment a real Connect payout reads this column (the intended design) this becomes direct theft. It also enables fake-reputation inflation (total_rentals) for affiliate/marketing fraud.
- **Fix:** REVOKE EXECUTE ON FUNCTION public.increment_owner_earnings(uuid,numeric) FROM anon, authenticated, public; (the release-deposit edge function uses the service-role key and will still be able to call it). Also pin search_path: ALTER FUNCTION ... SET search_path = ''. Long-term, fold the credit into release-deposit's service-role update directly rather than a public-schema RPC.

### [C8] rentals UPDATE policy has no WITH CHECK and authenticated can update every column — renter can forge status & money fields (CONFIRMED LIVE)

- **Category:** security · **Effort:** M · **Source agent:** Security & Money-Handling (Stripe Connect, RLS, Edge Functions, Secrets, Abuse)
- **Location:** `supabase/schema.sql:197 "Rental parties update rentals"; live pg_policies (with_check = null); live column_privileges (authenticated UPDATE on all rentals columns)`
- **Evidence:** pg_policies row: tablename rentals, cmd UPDATE, using ((auth.uid()=renter_id) OR (auth.uid()=owner_id)), with_check null. column_privileges: authenticated UPDATE cols include status,total_price,commission_amount,owner_id,renter_id,stripe_payment_intent,stripe_deposit_intent. Frontend already writes status client-side at rentals.tsx updateStatus and contract/[id].tsx:63.
- **Impact:** Live pg_policies confirms `Rental parties update rentals` USING (auth.uid()=renter_id OR auth.uid()=owner_id) with with_check = NULL, and authenticated holds UPDATE on commission_amount, total_price, status, owner_id, renter_id, stripe_payment_intent, stripe_deposit_intent, etc. So a renter (a rental party) can run supabase.from('rentals').update({status:'active'}) or update({total_price: 1, commission_amount: 0}) on their own rental directly from the client. This (a) lets a renter self-advance the rental so the OWNER can then immediately trigger release-deposit (collusion/grief), and (b) lets the stored money fields — which release-deposit reads to compute ownerEarnings = total_price - commission_amount — be set to anything. The status enum is the spine of the whole payment lifecycle; client write access to it means the lifecycle has no integrity.
- **Fix:** Add a WITH CHECK and/or move all status/money transitions server-side. Minimum: replace the UPDATE policy with one whose WITH CHECK forbids changing money columns and constrains status to legal next-states, and REVOKE UPDATE on (total_price, commission_amount, deposit_amount, owner_id, renter_id, status, stripe_*) from authenticated. Drive status transitions exclusively through SECURITY DEFINER edge functions/RPCs that validate the actor and the legal transition.

### [C9] create-payment-intent charges client-supplied amount/deposit without comparing to the rental row

- **Category:** security · **Effort:** S · **Source agent:** Security & Money-Handling (Stripe Connect, RLS, Edge Functions, Secrets, Abuse)
- **Location:** `supabase/functions/create-payment-intent/index.ts:33-53 (uses body `amount`,`deposit`); caller app/contract/[id].tsx:55`
- **Evidence:** Lines 37-43 select 'id, renter_id, status, total_price, deposit_amount' but lines 48-53 do `paymentIntents.create({ amount, ... })` using the destructured body `amount` from line 33; no equality check against rental.total_price.
- **Impact:** The function fetches the rental row (selecting total_price and deposit_amount) but then creates the PaymentIntent with the request-body `amount`/`deposit` verbatim, never comparing them. A renter can call the endpoint with {rental_id: <their pending rental>, amount: 1} and authorize a 1-cent charge for a multi-hundred-dollar rental. They can also under/over-set the deposit. Combined with finding above, the whole charged amount is attacker-controlled.
- **Fix:** Ignore client amount/deposit entirely. Compute amount = Math.round(rental.total_price*100) and deposit = Math.round(rental.deposit_amount*100) from the fetched rental row, and even better recompute total_price server-side from items.price_per_day * day-count + commission. Remove `amount`/`deposit` from the request contract.

### [C10] Security deposit is created as a PaymentIntent but never confirmed — no deposit is ever actually held

- **Category:** bug · **Effort:** L · **Source agent:** Security & Money-Handling (Stripe Connect, RLS, Edge Functions, Secrets, Abuse)
- **Location:** `supabase/functions/create-payment-intent/index.ts:56-70 (creates deposit PI); app/contract/[id].tsx:57-58 (only the rental client secret is put in the sheet)`
- **Evidence:** contract/[id].tsx:58 initPaymentSheet({ paymentIntentClientSecret, ... }) — depositIntentClientSecret is destructured (line 57) only to derive deposit_intent_id via string-split (line 62), never confirmed. release-deposit:59 branches on requires_capture/succeeded only.
- **Impact:** create-payment-intent returns depositIntentClientSecret, but contract/[id].tsx:58 only feeds paymentIntentClientSecret into initPaymentSheet/presentPaymentSheet. The deposit PI is therefore left in requires_payment_method/requires_confirmation — no card is ever attached or authorized. At return, release-deposit:58-64 retrieves it, finds it is neither requires_capture nor succeeded, and no-ops. Net effect: the deposit hold the signed contract explicitly promises ('$X will be held on your card') never happens. Every damage / non-return / late-fee / forfeiture clause in the 6-section rental agreement is legally and technically unenforceable. The platform absorbs 100% of damage/loss risk on every rental.
- **Fix:** Collect the deposit as a separate authorization in the payment sheet (confirm both intents — e.g. present the rental sheet, then a setup/payment sheet for the deposit, or use a single PI with a higher hold). Verify in release-deposit that the deposit PI reached requires_capture before marking the rental active. Until fixed, the contract's deposit language is misleading and should not ship.

### [C11] No real payout to owners — Express Connect onboarding collects bank info that is never used to move money

- **Category:** bug · **Effort:** XL · **Source agent:** Security & Money-Handling (Stripe Connect, RLS, Edge Functions, Secrets, Abuse)
- **Location:** `supabase/functions/create-payment-intent/index.ts (no transfer_data/application_fee/on_behalf_of); release-deposit/index.ts:44-85 (capture-to-platform + counter only); create-connect-account/index.ts (account created, never used in charges)`
- **Evidence:** create-payment-intent paymentIntents.create has only {amount,currency,capture_method,metadata} — no Connect routing. release-deposit:81-85 computes ownerEarnings and calls increment_owner_earnings RPC; no Stripe transfer. create-connect-account writes profiles.stripe_account_id (column confirmed present in live DB) but that id is read nowhere in the charge/capture path.
- **Impact:** The PaymentIntents are plain platform charges with no transfer_data.destination, no application_fee_amount, no on_behalf_of, and there is no stripe.transfers.create / payouts.create anywhere. release-deposit captures the full rental charge to Twirl's own balance and then only bumps the profiles.total_earnings integer. Owners are never actually paid through Stripe; their connected account (stripe_account_id, which DOES exist in prod — verified) is collected and abandoned. This is the defining gap for a marketplace: sellers cannot get their money. Also, the documented '85% payout' is inaccurate — ownerEarnings = total_price - commission_amount = subtotal (100% of the rental fee), since the 15% is a renter surcharge added on top.
- **Fix:** Implement destination charges or separate transfers: set application_fee_amount = commission and transfer_data.destination = owner's stripe_account_id on the rental PaymentIntent (or create a Transfer to the connected account on capture). Add a webhook on account.updated to confirm charges_enabled/payouts_enabled before allowing the owner's items to be rentable.

### [C12] No in-app account-deletion path — guaranteed App Store rejection

- **Category:** launch-blocker · **Effort:** M · **Source agent:** Launch readiness & product strategy — App Store submission, legal/compliance, trust & safety, payments operability, cold-start, observability, support/ops
- **Location:** `app/ (entire tree — no delete-account screen); supabase/functions/ (no deletion edge fn)`
- **Impact:** Apple rejects the binary on review (Guideline 5.1.1(v) requires in-app deletion for any account-creating app). This alone blocks the August 2026 launch. The DB cascade model (NO ACTION FKs from rentals/conversations/messages to profiles) would also make a real delete FAIL for any user with history, so the backend can't actually delete a transacted user either. Evidence: grep across app/ and supabase/ returned NO_ACCOUNT_DELETION_PATH; profile screen is read-only.
- **Fix:** Add a Settings screen with 'Delete account' calling a new service-role edge function that anonymizes/soft-deletes the profile and resolves the NO ACTION FK problem (SET NULL or anonymize renter_id/owner_id/sender_id). Ship before any submission.

### [C13] No Terms of Service or Privacy Policy anywhere — blocks submission and legal operation

- **Category:** launch-blocker · **Effort:** M · **Source agent:** Launch readiness & product strategy — App Store submission, legal/compliance, trust & safety, payments operability, cold-start, observability, support/ops
- **Location:** `repo root (no legal docs); app/(auth)/* (no consent); App Store Connect metadata`
- **Impact:** App Store requires a reachable Privacy Policy URL and (for a contract/payments app) a Terms/EULA; the App Privacy nutrition label cannot be truthfully completed without documented data practices. Legally, taking money and binding rental contracts with no published terms exposes the operator to liability. Evidence: find for *privacy*/*terms*/*tos*/*eula* returned only ios PrivacyInfo.xcprivacy (the manifest, not a policy); signup has no terms link/consent (NO_TERMS_LINK_AT_SIGNUP). App collects email, name, photos, chapter, hometown, payment data.
- **Fix:** Draft ToS + Privacy Policy (deposit/refund/damage/liability terms, data collection, Stripe processor disclosure), host at twirl.rentals/terms and /privacy, link them at signup behind a required consent checkbox, and enter the URLs + complete the App Privacy questionnaire in App Store Connect. Use a lawyer or vetted template for the liability/arbitration clauses.

### [C14] Marketplace does not actually pay owners (no Stripe transfer/destination charge)

- **Category:** bug · **Effort:** L · **Source agent:** Launch readiness & product strategy — App Store submission, legal/compliance, trust & safety, payments operability, cold-start, observability, support/ops
- **Location:** `supabase/functions/create-payment-intent/index.ts:48-63; supabase/functions/release-deposit/index.ts:82-85; supabase/functions/create-connect-account/index.ts`
- **Impact:** Owners list clothes, hand them over, and never receive funds through Stripe — they see a fake 'earned $X' counter. The first lender who checks their bank kills word-of-mouth in a tight sorority network. Evidence: create-payment-intent creates plain platform PaymentIntents (no application_fee_amount, no transfer_data.destination, no on_behalf_of); release-deposit captures to the platform balance then only calls increment_owner_earnings RPC; Express Connect onboarding collects bank details never used to move money.
- **Fix:** Implement destination charges (transfer_data.destination = owner's connected account, application_fee_amount = the 15% surcharge) or transfers.create on capture. Read owner stripe_account_id (also missing from schema — add a migration). Add a Stripe webhook to confirm account.updated/charges_enabled before allowing payout-eligible listings.

### [C15] Security deposit is promised in the contract but never actually held

- **Category:** bug · **Effort:** M · **Source agent:** Launch readiness & product strategy — App Store submission, legal/compliance, trust & safety, payments operability, cold-start, observability, support/ops
- **Location:** `app/contract/[id].tsx:58 (only paymentIntentClientSecret passed to initPaymentSheet); contract terms text :137-177`
- **Impact:** The contract explicitly tells users 'a security deposit of $X will be held on your card' and that it 'will be forfeited' on non-return — but no hold ever exists, making every damage/non-return/late-fee clause unenforceable and the signed agreement a misrepresentation. Evidence: create-payment-intent returns depositIntentClientSecret but contract/[id].tsx never confirms it (only the rental intent is in the sheet); the deposit PI stays in requires_payment_method, so release-deposit later no-ops on it.
- **Fix:** Confirm the deposit PaymentIntent in a second payment-sheet step (or a SetupIntent for a saved card + manual capture), or rewrite the contract language to match reality. Do not ship contract terms claiming a hold the code never places.

### [C16] No content moderation / trust & safety — report, block, review all unimplemented

- **Category:** launch-blocker · **Effort:** L · **Source agent:** Launch readiness & product strategy — App Store submission, legal/compliance, trust & safety, payments operability, cold-start, observability, support/ops
- **Location:** `app/ (no report/block/review screens); schema tables reports/blocked_users/reviews unused; reports RLS`
- **Impact:** A product whose target users are young women meeting strangers to physically exchange clothing and money has no way to report a scammer, block a harasser, or see reviews/reputation before transacting — a safety and brand-trust blocker. Moderation tooling is also absent (you can't even read reports). Evidence: find for report/block/review screens returned NONE; reviews/reports/blocked_users referenced nowhere in app/; reports RLS allows only the reporter to SELECT; blocked_users has zero enforcement in other tables' RLS; the only identity check is the forced @uark.edu suffix (no real ownership verification).
- **Fix:** Wire minimum-viable safety before launch: report button on items/profiles/conversations, block user (enforced in conversations/messages RLS), reviews flow post-completion, and a service-role moderation read path for reports. Treat reputation (reviews) as core for a stranger-to-stranger marketplace.

### [C17] Cold-start: marketplace is empty — 3 items, 1 lister, 0 completed rentals

- **Category:** launch-blocker · **Effort:** L · **Source agent:** Launch readiness & product strategy — App Store submission, legal/compliance, trust & safety, payments operability, cold-start, observability, support/ops
- **Location:** `live DB qlulzatkhgblorbjndsz (items/profiles/rentals); no supabase/seed script`
- **Impact:** A two-sided marketplace launched empty gives the first renters nothing to rent and the first lenders no buyers — both sides bounce. The founding-affiliate GTM (KKG, Pi Phi) only works if there is supply to browse day one. Evidence: live query returned total_items=3, available_items=3, distinct_listers=1, total_profiles=2, real_rentals(non-pending/cancelled)=0; no seed file under supabase/.
- **Fix:** Run a supply-first seeding sprint BEFORE the consumer launch: confirmed affiliates (Abby/KKG, Pi Phi pledge) plus 2-3 per target chapter each list 5-10 real pieces, targeting ~50-100 items before any broad invite. Build a listing-day event. Inventory is the launch gate, not the app build.

## HIGH (13)


### [H1] Undocumented schema drift: live handle_new_user() trigger on auth.users not in repo and collides with app signup

- **Category:** data-model · **Effort:** M · **Source agent:** LIVE Supabase backend & stale-data audit (project qlulzatkhgblorbjndsz)
- **Location:** `LIVE DB: public.handle_new_user() + trigger on_auth_user_created on auth.users; absent from /Users/cooperporter/Twirl-Hub/repo/Twirl/supabase/schema.sql and supabase/migrations/*`
- **Evidence:** pg_proc shows handle_new_user (security_definer=true, search_path=public); pg_trigger shows 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()'. grep 'handle_new_user|on_auth_user_created' supabase/ => NOT FOUND. Advisor: anon_security_definer_function_executable / authenticated_security_definer_function_executable for handle_new_user().
- **Impact:** Prod has a SECURITY DEFINER function public.handle_new_user() and AFTER INSERT trigger on_auth_user_created that auto-inserts a profiles row (id,email,full_name=COALESCE(meta full_name, localpart)) ON CONFLICT DO NOTHING. This is invisible to anyone reading the repo (grep for handle_new_user/on_auth_user_created in supabase/ returns nothing). It races with signup2.tsx's own profiles.upsert: the trigger fires first on auth.signUp, then the app upsert runs. The ON CONFLICT DO NOTHING in the trigger means the trigger never overwrites, but the existence of two writers for the same row is fragile and the data model is undocumented. It also explains the orphaned 'abby' user below (created before/without the trigger or with a since-deleted profile). Advisors also flag it: anon_security_definer_function_executable + authenticated_security_definer_function_executable (callable via /rest/v1/rpc/handle_new_user by anon).
- **Fix:** Add handle_new_user() + on_auth_user_created to a migration file so the repo reflects prod. Decide the single source of truth for profile creation (trigger vs signup2.tsx upsert) — recommend the trigger create the row and the app only UPDATE it, removing the dual-writer pattern. REVOKE EXECUTE on handle_new_user from anon/authenticated (it is a trigger fn, not an RPC).

### [H2] Base schema (all 10 tables) is not under migration version control — only 1 migration tracked

- **Category:** tech-debt · **Effort:** M · **Source agent:** LIVE Supabase backend & stale-data audit (project qlulzatkhgblorbjndsz)
- **Location:** `supabase/migrations/ (2 files) vs supabase_migrations.schema_migrations (1 row); supabase/schema.sql (311 lines, never applied as a migration)`
- **Evidence:** list_migrations => [{version:20260524021002,name:release_deposit_rpc}]. SELECT version,name FROM supabase_migrations.schema_migrations => same single row. Local migrations dir contains 20260511_add_profile_demographics.sql (untracked in remote ledger) + 20260524_release_deposit_rpc.sql. schema.sql exists but is not a numbered migration.
- **Impact:** list_migrations and a direct query of supabase_migrations.schema_migrations both return exactly ONE migration: 20260524021002 release_deposit_rpc. The repo also has 20260511_add_profile_demographics.sql on disk but it is NOT recorded as applied in the remote migration ledger. The entire base schema.sql (all 10 tables, RLS, helper fns, the storage bucket, the recent_rentals_by_user view) was applied out-of-band (dashboard/CLI db push without tracking). Net: the repo cannot reproduce prod, and a future 'supabase db reset' or a fresh environment would be missing everything except the RPC. This is a launch-readiness/disaster-recovery gap before August rush.
- **Fix:** Pull the live schema into a baseline migration (supabase db pull) so schema.sql, the demographics ALTERs, handle_new_user, and the view are all captured as ordered migrations. Reconcile so the local migrations dir == remote ledger before any further DDL.

### [H3] Seed/test data in production: 'Cooper Porter' demo profile owning all 3 live listings

- **Category:** stale-data · **Effort:** S · **Source agent:** LIVE Supabase backend & stale-data audit (project qlulzatkhgblorbjndsz)
- **Location:** `profiles id=c0de4624-5e68-4330-851d-b5ec665fbae4; items 7ea6a71d / bf838083 / 1d259778`
- **Evidence:** profiles row: {full_name:'Cooper Porter', sorority:'Twirl', is_verified:true}. items query: 3 rows all owner_id=c0de4624..., available=true, created 2026-05-23 00:25:11 (identical timestamp => batch-seeded). items_owned_by_seed_profile=3.
- **Impact:** The only inventory in prod (3 items: 'Champagne Slip', 'Navy Blazer Dress', 'White Linen Set') is owned by a seed profile full_name='Cooper Porter', email='cooper@uark.edu', sorority='Twirl' (not a real chapter), is_verified=true, total_rentals=0, total_earnings=0. All three are available=true, so they WILL render in the live Browse/'The Closet' grid for any real user at launch. This is placeholder/demo data masquerading as real listings — exactly the junk-seed-data risk. CLAUDE.md notes a prior 'seed purge' (commit 3a9cc7d) but these 3 rows survived.
- **Fix:** Purge or hard-flag these 3 demo items (set available=false or delete) and either delete or relabel the 'Twirl' seed profile before public launch. Replace with real founding-affiliate inventory.

### [H4] increment_owner_earnings RPC is publicly callable by anon AND authenticated roles

- **Category:** security · **Effort:** S · **Source agent:** LIVE Supabase backend & stale-data audit (project qlulzatkhgblorbjndsz)
- **Location:** `LIVE DB: public.increment_owner_earnings(p_owner_id uuid, p_amount numeric), exposed via /rest/v1/rpc/increment_owner_earnings`
- **Evidence:** get_advisors(security): two advisors for increment_owner_earnings (anon + authenticated security_definer_function_executable). Function confirmed SECURITY DEFINER in pg_proc. release-deposit edge fn calls it via service role, but EXECUTE is not revoked from anon/authenticated.
- **Impact:** Security advisors anon_security_definer_function_executable and authenticated_security_definer_function_executable both flag this SECURITY DEFINER function as callable over the public REST API by anon and authenticated roles. Because it is SECURITY DEFINER (bypasses RLS) and the only gate is supposed to be the release-deposit edge function, ANY client with the anon key can POST {p_owner_id, p_amount} to /rest/v1/rpc/increment_owner_earnings and arbitrarily inflate any profile's total_earnings and total_rentals. This is a direct financial-integrity / data-tampering hole, made worse by the fact that total_earnings is the only place the '85% payout' is recorded.
- **Fix:** REVOKE EXECUTE ON FUNCTION public.increment_owner_earnings(uuid, numeric) FROM anon, authenticated, public; grant only to service_role. Capture in migration.

### [H5] Avatars uploaded at signup but never displayed anywhere

- **Category:** ux-gap · **Effort:** M · **Source agent:** Twirl Frontend & UX (app/ directory — screens, navigation, user journeys)
- **Location:** `app/(tabs)/profile.tsx:63-65, app/(tabs)/messages.tsx:92-94, app/conversation/[id].tsx (header), app/item/[id].tsx:153-155`
- **Evidence:** profile.tsx:64 <Text className="text-3xl">👤</Text>; profile select at :53 is select('*') so avatar_url IS fetched but ignored.
- **Impact:** signup2.tsx:120 uploads avatar to item-images/{uid}/avatar.jpg and stores profiles.avatar_url, but every avatar render site hardcodes the 👤 emoji and never reads avatar_url. Users complete a photo-upload onboarding step that has zero visible payoff — the entire app shows identical placeholder faces. For a social/sorority product where identity and trust drive rentals, this is a major perceived-quality and trust gap.
- **Fix:** Read avatar_url in the profiles selects (profile.tsx:53, messages user1/user2 joins, item/[id] owner join, conversation meta) and render <Image source={{uri: avatar_url}}/> with the emoji as fallback. Build a small shared Avatar component to do this once.

### [H6] No edit-profile / settings screen — profile is permanently read-only

- **Category:** missing-feature · **Effort:** L · **Source agent:** Twirl Frontend & UX (app/ directory — screens, navigation, user journeys)
- **Location:** `app/(tabs)/profile.tsx (no edit affordance); no app/settings or app/edit-profile route exists`
- **Evidence:** profile.tsx has only signOut and add-item actions; grep of app/ finds no edit-profile/settings route.
- **Impact:** After signup, a user can never change their name, bio, year, major, size, sorority, or avatar; cannot delete account; cannot manage notifications. Sorority girls iterate on profiles constantly. Also note the schema's profiles UPDATE RLS ('not is_verified = false') currently blocks self-edits for unverified users anyway — so even if a screen existed, edits would fail. Both the UI and the policy must change.
- **Fix:** Add app/edit-profile.tsx (and a settings entry from profile header) that upserts the editable profile fields and re-uploads avatar. Coordinate with the DB team to fix the profiles UPDATE WITH CHECK so unverified users can edit their own row.

### [H7] Silent data fetches with no error handling or error UI on the main read paths

- **Category:** ux-gap · **Effort:** M · **Source agent:** Twirl Frontend & UX (app/ directory — screens, navigation, user journeys)
- **Location:** `app/(tabs)/index.tsx:53, app/(tabs)/profile.tsx:53-54, app/(tabs)/messages.tsx:40, app/(tabs)/rentals.tsx:48-53, app/item/[id].tsx:40, app/contract/[id].tsx:82-87`
- **Evidence:** index.tsx:53 `const { data } = await query.limit(50);` — no error capture; item/[id].tsx:86 returns 'loading...' whenever item is null, including permanent fetch failure.
- **Impact:** Every primary fetch destructures only { data } and ignores { error }. On a network failure or RLS denial the screen silently shows an empty state ('No pieces yet', 'no messages yet', '📦 no rentals') that is indistinguishable from genuinely-empty data. Users on flaky campus wifi will believe the marketplace is empty/broken with no retry prompt. item/[id] sets item to null on error and shows 'loading...' forever (no timeout, no error state).
- **Fix:** Capture error on each fetch, set an error state, and render a distinct error/retry UI (e.g. 'Couldn't load — tap to retry') separate from the empty state. For item/[id], add an explicit not-found/error branch instead of an infinite 'loading...'.

### [H8] AuthGuard redirect effect has stale-closure deps: reads `segments` but only depends on [session, loading]

- **Category:** bug · **Effort:** S · **Source agent:** Twirl code quality & correctness (app/, components/, hooks/, lib/, supabase/functions/)
- **Location:** `app/_layout.tsx:24-29`
- **Evidence:** Lines 24-29: effect body uses `const inAuth = segments[0] === '(auth)'` then `router.replace(...)`, but `}, [session, loading]);` at :29 omits `segments` and `router`.
- **Impact:** The useEffect reads `segments` (current route group) and `router` but its dependency array is `[session, loading]`. When the user navigates between routes WITHOUT session/loading changing, the effect does not re-run, so `inAuth` is computed from a stale `segments` snapshot. Conversely, because the effect references the latest `router`/`segments` only at the moment session/loading change, edge cases (deep link into an (auth) route while already authenticated, or a route change that races a session refresh) can fire `router.replace` against a stale segment value — producing a wrong redirect or a redirect loop. expo-router's own docs use `[session, segments]` (or at least include segments) for exactly this guard.
- **Fix:** Add `segments` (and `router` if lint requires) to the dependency array: `}, [session, loading, segments]);` so the guard re-evaluates on every navigation. Verify no redirect loop results; consider also gating on `!loading` before the first render to avoid a flash.

### [H9] increment_owner_earnings has a double-credit race (no atomic status guard, no idempotency)

- **Category:** bug · **Effort:** M · **Source agent:** Twirl code quality & correctness (app/, components/, hooks/, lib/, supabase/functions/)
- **Location:** `supabase/functions/release-deposit/index.ts:31-85 + migration increment_owner_earnings`
- **Evidence:** Read filter at :36 `.eq('status','active')`; the completion update at :75-78 is not conditioned on current status and runs before the credit at :82; capture error swallow at :49 masks the double-capture signal.
- **Impact:** release-deposit reads the rental with status='active' (:31-37), then later does an UNCONDITIONAL `update({status:'completed'})` (:75-78) and calls the unguarded RPC `increment_owner_earnings` (:82). Two near-simultaneous 'CONFIRM RETURN' taps (or a retry after a slow response) can both pass the status='active' read before either commits the completed update, so both capture the PI (Stripe rejects the 2nd, error swallowed at :49) AND both call the RPC — double-crediting profiles.total_earnings/total_rentals. No Stripe idempotency keys are used on capture/refund either.
- **Fix:** Make the status flip the gate: `update rentals set status='completed' where id=$1 and status='active'` and check affected-row count; only proceed to credit earnings if it changed from active→completed. Add Stripe idempotency keys (e.g. `idempotencyKey: rental_id` on capture/refund). Optionally guard the RPC against re-credit.

### [H10] contract payment URL uses EXPO_PUBLIC_API_URL with no fallback and no /functions/v1 — inconsistent with the other two callers

- **Category:** bug · **Effort:** S · **Source agent:** Twirl code quality & correctness (app/, components/, hooks/, lib/, supabase/functions/)
- **Location:** `app/contract/[id].tsx:52 vs app/(tabs)/rentals.tsx:112-113 vs app/(tabs)/profile.tsx:34`
- **Evidence:** contract :52 `fetch(`${process.env.EXPO_PUBLIC_API_URL}/create-payment-intent`...)`; rentals :113 `.../functions/v1/release-deposit` with `?? EXPO_PUBLIC_SUPABASE_URL`; profile :34 `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/...`.
- **Impact:** Three edge-function callers construct URLs three different ways: contract uses `${EXPO_PUBLIC_API_URL}/create-payment-intent` (no /functions/v1, no SUPABASE_URL fallback); rentals uses `${EXPO_PUBLIC_API_URL ?? EXPO_PUBLIC_SUPABASE_URL}/functions/v1/release-deposit`; profile uses `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-connect-account`. If EXPO_PUBLIC_API_URL is unset, the contract fetch goes to `undefined/create-payment-intent` and payment silently fails with an opaque error. If EXPO_PUBLIC_API_URL is set to the bare Supabase URL (a natural mistake), contract hits the wrong path (missing /functions/v1) while the other two work. This is a strong candidate for a silent payment break in production.
- **Fix:** Centralize edge-function base-URL construction in one helper, e.g. `const FUNCTIONS_BASE = (process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL) + '/functions/v1'` in lib/, and use it in all three callers so the prefix and fallback are identical.

### [H11] rentals.tsx updateStatus drives rental.status from the client with no error handling and no transition validation

- **Category:** bug · **Effort:** M · **Source agent:** Twirl code quality & correctness (app/, components/, hooks/, lib/, supabase/functions/)
- **Location:** `app/(tabs)/rentals.tsx:59-62 (updateStatus); approve/decline/handoff at :83,:91,:99`
- **Evidence:** Line 60: `await supabase.from('rentals').update({ status }).eq('id', id);` — no `{ error }` captured; callers at :83/:91/:99 assume success.
- **Impact:** updateStatus does `await supabase.from('rentals').update({ status }).eq('id', id)` and ignores the returned error, then calls fetchRentals(). If RLS or a constraint blocks the update, the user sees no error — the UI just refetches and silently shows the unchanged status (looks like a no-op tap). Combined with the schema's rentals UPDATE policy having no WITH CHECK, the client is the only thing deciding legal transitions; there is no guard that pending→approved or paid→active is valid, so a stale screen can push an illegal transition. Status integrity for the whole rental lifecycle rests on un-checked client writes.
- **Fix:** Capture and surface the error from update(); short-circuit fetchRentals on failure with an Alert. Long term, move status transitions to an edge function/RPC that validates the from→to transition and enforces who may perform it, mirroring how release-deposit already gates the owner+active case.

### [H12] 'approved' status is a dead-end: create-payment-intent only accepts status='pending', so an approved rental can never be paid

- **Category:** bug · **Effort:** M · **Source agent:** Twirl code quality & correctness (app/, components/, hooks/, lib/, supabase/functions/)
- **Location:** `app/(tabs)/rentals.tsx:83 (sets 'approved') vs supabase/functions/create-payment-intent/index.ts:42 (.eq('status','pending'))`
- **Evidence:** rentals.tsx :83 `updateStatus(rental.id, 'approved')`; create-payment-intent :42 `.eq('status','pending')`; rentals.tsx renter side (:199-213) renders info banners only, no navigation.
- **Impact:** Owner taps APPROVE → status becomes 'approved' and the renter banner says 'complete payment to confirm' (rentals.tsx:200-204). But there is NO UI path from the rentals screen to the contract/payment screen, AND create-payment-intent hard-requires status='pending' (:42), so even if the renter reached the contract screen the function returns 404 'Rental not found or not authorized'. The approve→pay loop is fundamentally broken: an approved rental is unpayable. The only working path is paying straight from 'pending' via item detail.
- **Fix:** Pick one model. Either (a) remove the 'approved' step so payment always happens from 'pending', or (b) accept both 'pending' and 'approved' in create-payment-intent's status filter AND add a 'pay now' CTA on the renter side of rentals.tsx that routes to /contract/[id]. Reconcile the banner copy with whichever path exists.

### [H13] No Stripe webhook handling — app is blind to all async Stripe events (disputes, async payment results, onboarding completion)

- **Category:** missing-feature · **Effort:** L · **Source agent:** Security & Money-Handling (Stripe Connect, RLS, Edge Functions, Secrets, Abuse)
- **Location:** `supabase/functions/ (no webhook function exists); state is entirely client-button driven`
- **Evidence:** Only three functions exist (create-connect-account, create-payment-intent, release-deposit); none verify a Stripe-Signature header or process event types. create-connect-account return_url/refresh_url point to web pages with no callback into app state.
- **Impact:** There is no endpoint listening to payment_intent.succeeded, payment_intent.payment_failed, charge.dispute.created, charge.refunded, or account.updated. Consequences: (a) if presentPaymentSheet succeeds but the subsequent rentals.update({status:'paid'}) fails (network drop), a PI is authorized while the rental stays 'pending' — orphaned money with no reconciliation; (b) chargebacks/disputes are invisible to the app; (c) the app never knows whether Connect onboarding completed, so it can show 'payouts set up' on an account that can't actually receive funds; (d) capture happens only at return — if the 7-day auth window lapses the capture in release-deposit fails into errors[] and the rental sticks in 'active' with no retry.
- **Fix:** Add a stripe-webhook edge function verifying the Stripe-Signature with the webhook secret; handle payment_intent.succeeded (set paid), charge.dispute.created (set disputed — currently a dead status), and account.updated (set a payouts_enabled flag). Reconcile orphaned authorizations.


---

# Appendix B — Launch Blockers (raw, as raised by agents)


1. Base schema is not under migration control: only 1 of the 10-table schema is captured in supabase/migrations (20260524021002); schema.sql was applied out-of-band so the repo cannot reproduce or safely migrate prod before the August launch.

2. Undocumented live trigger handle_new_user()/on_auth_user_created creates a profiles row on every auth.users insert with only (id,email,full_name) — it races/collides with signup2.tsx's full profile upsert and is invisible to anyone reading the repo; must be added to migrations and reconciled with the app signup path.

3. Production contains seed/test data (verified 'Cooper Porter' profile with sorority='Twirl' owning all 3 demo listings, orphaned abby@uark.edu auth user) that will appear in the live Browse grid at launch — must be purged and replaced with real affiliate inventory.

4. .env.save is tracked in git (git ls-files confirms) and contains real-looking publishable/anon keys — secret-hygiene blocker before going public.

5. Auth 'Leaked Password Protection Disabled' advisor (WARN) — should be enabled before public signup launch.

6. Owner-approved rentals are a dead end: the renter has NO UI path to pay an 'approved' rental. The only payment entry is /contract/[id] reached from item detail while status is 'pending'. rentals.tsx (renter/renting tab) only shows an informational 'Approved — complete payment to confirm' banner with no button. Combined with create-payment-intent requiring status='pending', once an owner approves, the rental can NEVER be paid. The entire approve→pay loop is broken. Fix: either (a) remove the approve step and let renter pay straight from pending (make the banner a button that pushes /contract/[id]), or (b) make the edge fn accept 'approved' and add a 'Complete Payment' button on the renting tab that navigates to /contract/{rental.id}.

7. merchantIdentifier mismatch: app/_layout.tsx:61 hardcodes merchant.com.twirl.rentals while app.json plugin config sets merchant.twirl.rentals. The Apple Pay merchant ID registered in the Apple Developer account must match the value passed to StripeProvider; a mismatch makes Apple Pay fail at runtime (and can surface as a Stripe init error on the contract screen). Pick one canonical value and use it in both places.

8. Security deposit is never actually held. contract/[id].tsx:58 only passes paymentIntentClientSecret (the rental charge) into initPaymentSheet; depositIntentClientSecret is created server-side but NEVER confirmed/presented, so no card auth is ever placed on the deposit. The contract screen explicitly tells the user '$X will be held on your card' and bases 5 of 6 legal clauses on that hold. release-deposit then finds the deposit PI is not in requires_capture/succeeded and no-ops. Net: a renter agrees to forfeitable-deposit terms that are technically unenforceable. This is a launch-blocking trust/legal gap, not just a money bug. Fix: confirm the deposit PI as well (second payment sheet or SetupIntent), or remove all deposit-hold language from the contract until it's real.

9. app/item/[id].tsx rent-request flow crashes on rentalData.id when any of the 3 inserts fails and orphans conversation/message rows (errors unchecked) — the primary revenue action is not crash-safe and corrupts data

10. create-payment-intent trusts client-supplied amount/deposit — a renter can pay 1 cent for any rental; must derive amount server-side from the rental row before any real-money launch

11. Security deposit is never actually held: contract/[id].tsx only confirms the rental PaymentIntent, so the deposit hold the contract legally promises (and every forfeiture/damage clause) is unenforceable

12. 'approved' rentals are unpayable (create-payment-intent requires status='pending' and no UI routes an approved rental to the contract screen) — reconcile the approve→pay loop before launch

13. contract payment edge-function URL has no /functions/v1 prefix and no fallback (EXPO_PUBLIC_API_URL) — verify the live env or payment silently fails in the production build

14. increment_owner_earnings RPC is anon/authenticated-executable and unguarded — REVOKE EXECUTE from anon+authenticated before launch (one SQL statement); any user can forge earnings via PostgREST

15. rentals UPDATE RLS has no WITH CHECK and authenticated can update every column — money/status fields are client-forgeable in production; lock down before any real money moves

16. create-payment-intent trusts client-supplied amount/deposit — derive amounts server-side from the rental row before charging

17. Deposit is never actually held (deposit client secret never confirmed) — the entire damage/deposit promise in the signed contract is unenforceable

18. No real payout path to owners (no Connect transfers/application_fee) — sellers are never actually paid; this is a marketplace-defining gap, not just a bug

19. NO in-app account-deletion path (App Store Guideline 5.1.1(v)) — automatic rejection for any app that supports account creation. Verified: no delete-account UI, no deleteUser edge function. Must add before any submission.

20. NO Terms of Service and NO Privacy Policy exist (no docs in repo, no in-app links, no consent checkbox at signup). Required for App Store submission (support/privacy/EULA URLs) AND for legally operating a money-handling P2P marketplace. App Privacy nutrition label cannot be honestly completed without a data-practices doc.

21. Payments do not pay owners and do not hold deposits: no Stripe transfer/destination charge anywhere (funds stay in Twirl's platform balance, owners 'paid' only via a total_earnings integer), and the deposit PaymentIntent is created but never confirmed in the payment sheet so the security deposit the contract promises is never actually held. You are collecting real money (pk_live key) on a flow that doesn't settle to sellers.

22. NO content moderation / trust & safety surface: report, block, and review UI are entirely unimplemented (tables exist, zero app code touches them). reports are not even readable by any moderator (RLS allows only the reporter to SELECT). Catfishing, off-platform payment, and no-show have no in-app mitigation. Unacceptable for a product aimed at young women meeting strangers to exchange goods.

23. Cold-start / no inventory: live DB has 3 items from 1 lister, 2 profiles, 0 completed rentals. There is no seed script and no supply. A two-sided marketplace with no inventory has nothing for renters to rent — launch = empty app.

24. LLC not registered: Cooper personally bears liability for damaged/lost garments, chargebacks, and dispute outcomes, and is personally the legal entity intermediating real payments. Register the Arkansas LLC (~$45) before taking real money or signing rental contracts naming 'Twirl' as arbitrator.

25. Bundle identifier contradiction (app.json `twirl.rentals` vs native/Info.plist/README `com.twirl.rentals`) — next prebuild overwrites native value and breaks App Store identity tied to ascAppId 6765989926. Prime suspect for the existing EAS submission failure (#1 roadmap blocker).


---

# Appendix C — Discovery Context Map


### AREA: Twirl Frontend — app/ directory (screens, navigation, user journeys)
# Twirl Frontend — Canonical Map (app/ directory)

Stack: Expo SDK 54, expo-router v6 (file-based routing), React Native 0.81, NativeWind v4 (Tailwind classes via `className`), Supabase JS client, Stripe React Native. All screens import the singleton `supabase` client from `@/lib/supabase` and the `useAuth()` hook from `@/hooks/useAuth`.

Notable: there is NO `app/+not-found.tsx`, NO `app/index.tsx` redirect at root, NO settings/edit-profile screen, NO reviews/reports/blocked-users screens. Tables `saved_items`, `reviews`, `reports`, `blocked_users` (from CLAUDE.md's 10-table list) are NOT touched anywhere in `app/`. The frontend uses only 7 of the 10 tables: `profiles`, `items`, `conversations`, `messages`, `rentals`, `rental_contracts` (write-only), plus Supabase Storage bucket `item-images`.

---

## GLOBAL INFRASTRUCTURE

### `@/hooks/useAuth` (hooks/useAuth.tsx)
Not a React Context — a plain hook each screen calls independently. Each caller gets its own `getSession()` + `onAuthStateChange` subscription. Returns `{ session, user, loading, signOut }`. `user` is the Supabase auth `User` (so `user.id` = auth UID = `profiles.id`). `signOut()` calls `supabase.auth.signOut()`.

### `@/lib/supabase` (lib/supabase.ts)
`createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY || EXPO_PUBLIC_SUPABASE_KEY)`. Auth session persisted in AsyncStorage; `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`. Throws at import if URL/key env missing.

### `@/lib/constants` (lib/constants.ts)
`OCCASIONS` (10: Date Night, Formals, Bid Day, Game Day, Darty, Crush Party, Philanthropy, Recruitment, Going Out, Day Event), `SIZES` (13: XS…XXL, 0…12), `CATEGORIES` (8: Dress, Top, Skirt, Pants, Jacket, Shoes, Bag, Accessories), `COMMISSION_RATE = 0.15`, `SEC_SCHOOLS` (16, unused in app/).

### `@/components/cards/ItemCard` (components/cards/ItemCard.tsx)
Shared card used by Browse + Profile. Width = `(screenWidth - 56) / 2`, aspect 3/4. Renders `item.images[0]` (fallback 👗 emoji), title (Cormorant italic) + `$${price_per_day}/day` (JetBrains Mono). Expects `{ id, title, price_per_day, size, occasion, images, profiles? }`.

### Twirl design components (referenced, live in components/twirl/): `Button` (variant "rose"), `Input` (label/placeholder/suffix/secureTextEntry), `Wordmark` (animated logo), `CornerOrnament` (decorative SVG), `StepDots` (signup progress). Used by auth screens only.

### Environment variables referenced in app/:
- `EXPO_PUBLIC_SUPABASE_URL` — base for Supabase + Edge Function calls
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_KEY` — client key
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` — StripeProvider
- `EXPO_PUBLIC_API_URL` — used inconsistently (see Edge Function note below)

### Edge Function endpoint INCONSISTENCY (real bug surface):
- `profile.tsx` calls `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-connect-account`
- `rentals.tsx` calls `${EXPO_PUBLIC_API_URL ?? EXPO_PUBLIC_SUPABASE_URL}/functions/v1/release-deposit` (includes `/functions/v1/`)
- `contract/[id].tsx` calls `${EXPO_PUBLIC_API_URL}/create-payment-intent` — note: NO `/functions/v1/` prefix and NO `SUPABASE_URL` fallback. If `EXPO_PUBLIC_API_URL` is unset OR points at the bare Supabase URL, this fetch hits the wrong path. The three call sites disagree on URL construction.

---

## SCREEN-BY-SCREEN

### 1. `app/_layout.tsx` — Root layout (route: `/`, wraps everything)
**Purpose:** Loads fonts, gates auth, provides Stripe.
**Fonts (expo-font useFonts):** CormorantGaramond_500Medium + _Italic, Inter_400/500/600, JetBrainsMono_500Medium. Until loaded → full-screen `ActivityIndicator` on `bg-twirl-paper`.
**Stripe:** `isExpoGo = Constants.appOwnership === "expo"`. In Expo Go → renders Stack WITHOUT StripeProvider (payments disabled). In dev/standalone build → wraps in `<StripeProvider publishableKey={EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.twirl.rentals">`.
**AuthGuard (the global redirect engine):** uses `useAuth()` + `useSegments()` + `useRouter()`. In `useEffect` keyed on `[session, loading]`:
- while `loading` → no-op
- `if (!session && !inAuth)` → `router.replace("/(auth)/login")`
- `if (session && inAuth)` → `router.replace("/(tabs)/")`
where `inAuth = segments[0] === "(auth)"`. This is the ONLY automatic auth routing in the app. Stack has `headerShown: false` globally (every screen draws its own header).
**State:** none persisted; `fontsLoaded` local. No DB I/O.

### 2. `app/(auth)/login.tsx` — route `/(auth)/login`
**Purpose:** Email+password sign-in. UARK-locked.
**DB writes:** `supabase.auth.signInWithPassword({ email, password })` where `email = ` `${emailLocal.toLowerCase()}@uark.edu`` (the `@uark.edu` suffix is forced; user types only the local part, and any typed `@uark.edu`/`@` is stripped on change). No table reads/writes — auth only.
**Nav in:** AuthGuard redirect, or signup back-navigation. **Nav out:** success → `router.replace("/(tabs)/")`; "Create account" → `router.push("/(auth)/signup1")`.
**State:** `emailLocal`, `password`, `loading`, `error` (all local useState).
**UI:** `SafeAreaView` bg-twirl-blush, `KeyboardAvoidingView`, `CornerOrnament`, animated `Wordmark`, error banner, two `Input`s (suffix "@uark.edu"), rose `Button`. Validation: both fields required (`"Fill in all fields"`).

### 3. `app/(auth)/signup.tsx` — route `/(auth)/signup` (5 lines — LEGACY REDIRECT)
**Investigated as instructed.** Entire file: `export default function LegacySignupRoute() { return <Redirect href="/(auth)/signup1" />; }`. It is a pure expo-router `<Redirect>` that forwards any hit on the old `/(auth)/signup` path to the new `/(auth)/signup1`. No state, no UI, no logic. Exists so stale links/deep links to the original single-screen signup don't 404.

### 4. `app/(auth)/signup1.tsx` — route `/(auth)/signup1` (step "01/02")
**Purpose:** Credential capture (email + password) — step 1 of signup. Does NOT call Supabase; just validates and forwards.
**DB:** none. **Validation:** email local part required (`"Enter your UARK email"`); password length ≥ 8 (`"Password must be at least 8 characters"`).
**Nav in:** from login "Create account", or `signup.tsx` redirect. **Nav out:** `router.push({ pathname: "/(auth)/signup2", params: { email: `${emailLocal}@uark.edu`, password } })` — credentials passed as route params (plaintext password in nav params). Back arrow → `router.back()`.
**State:** `emailLocal`, `password`, `error`.
**UI:** bg-twirl-blush, CornerOrnament, "01 / 02" counter (JetBrains Mono), "Welcome." headline (Cormorant italic 64px), copy "invite-only for verified @uark.edu", two `Input`s, `StepDots step={1} total={2}`, rose Continue `Button`.

### 5. `app/(auth)/signup2.tsx` — route `/(auth)/signup2` (steps "02/05"–"05/05") — THE ACCOUNT CREATOR
**Purpose:** Multi-step profile builder (4 internal sub-steps via local `step` 0–3) + the actual `auth.signUp` + profile insert + avatar upload. Receives `{ email, password }` via `useLocalSearchParams`.
**Internal steps (stepTitles):** 0 = "Your portrait." (avatar), 1 = "Tell us about you." (name/year/major/hometown), 2 = "Your chapter." (greek letters + size), 3 = "A little intro." (bio, 280 char counter — but no hard maxLength enforced on the TextInput).
**State (local):** `step`, `name`, `year`('27 default), `major`, `hometown`, `letters`(ΚΚΓ default), `size`(S default), `bio`, `avatarUri`, `loading`, `error`, `pendingRef` (guards double-submit).
**Constants:** `sizes=["XS","S","M","L","XL"]`, `years=["'26","'27","'28","'29"]`, `greekChoices=["ΚΚΓ","ΧΩ","ΑΔΠ","ΔΔΔ","ΚΔ","ΖΤΑ","ΑΦ","ΠΒΦ"]`.
**Avatar:** `ImagePicker.launchImageLibraryAsync` (square, quality 0.7). `uploadAvatar(userId)` → `supabase.storage.from("item-images").upload(`${userId}/avatar.jpg`, blob, {contentType:"image/jpeg", upsert:true})` then `getPublicUrl`. Failure swallowed (returns null).
**Auth signUp (with retry):** `signUpWithRetry` → `supabase.auth.signUp({ email, password, options: { data: { full_name: name, school: "University of Arkansas", sorority: letters, size } } })`. On 504 / `AuthRetryableFetchError` → sleeps 800ms, retries once.
**Profile write:** `supabase.from("profiles").upsert({ id: user.id, email, full_name: name, school: "University of Arkansas", sorority: letters, size, bio, year, major, hometown, ...(avatar_url ? {avatar_url} : {}) })`. So `profiles` columns written here: `id, email, full_name, school, sorority, size, bio, year, major, hometown, avatar_url`.
**Timeout fallback (notable resilience logic):** if signUp throws a retryable 504/`AuthRetryableFetchError` (account may have been created server-side despite timeout), it tries `signInWithPassword`, and if that succeeds, uploads avatar + upserts the same profile, then `router.replace("/(tabs)/")`. Error formatting (`formatSignupError`) sanitizes long transport-dump messages into "Request timed out. Please try again."
**Nav out:** success → `router.replace("/(tabs)/")`. Back: step>0 decrements step; step 0 → `router.replace("/(auth)/signup1")`.
**UI:** bg-twirl-cream, rotated CornerOrnament, dynamic counter `${step+2}/05`, `StepDots step={step+2} total={5}`, rose Continue/Finish `Button`. Local `LabeledInput` sub-component for text fields.

### 6. `app/(tabs)/_layout.tsx` — Tab navigator
**Purpose:** Custom floating tab bar. `<Tabs tabBar={<TwirlTabBar/>} screenOptions={{headerShown:false}}>` with 5 screens in this exact order: `index`, `list`, `rentals`, `messages`, `profile`.
**TwirlTabBar:** custom `BottomTabBarProps` renderer. Floating rounded (24px radius) PAPER card, absolute bottom, `paddingBottom: insets.bottom`, shadow. Five tabs map to `TABS` array (must stay index-aligned with screen order): BROWSE(BrowseIcon), LIST(PlusIcon), RENTALS(LedgerIcon), MESSAGES(EnvIcon), YOU(PersonIcon). Active tab: BLUSH pill bg + ROSE_DEEP icon/label; inactive: transparent + MUTED label. Icons are inline `react-native-svg`. `onPress` → `navigation.navigate(route.name)`.
**Note:** `TABS` order is hardcoded and assumed to match `state.routes` order; the displayed order (Browse, List, Rentals, Messages, You) deliberately differs from a naive alphabetical/file order — it matches the `<Tabs.Screen>` declaration order.

### 7. `app/(tabs)/index.tsx` — route `/(tabs)/` — BROWSE / "The Closet."
**Purpose:** Main marketplace grid of available items not owned by viewer.
**DB read (quoted):**
```
supabase.from("items")
  .select("*, profiles(full_name, school)")
  .eq("available", true)
  .neq("owner_id", user?.id ?? "")
  .order("created_at", { ascending: false })
  [optionally].in("occasion", occasions)   // when filter !== "All"
  .limit(50)
```
`items` columns read: `id, title, price_per_day, size, occasion, category, images, available, owner_id, created_at` (`select("*")`) joined to `profiles(full_name, school)`.
**Filters:** chips `["All","Formal","Casual","Game Day","Sorority"]` map via `OCCASION_MAP` to sets of `occasion` values (e.g. Formal → Formals/Formal/Date Night/Crush Party). `useEffect` refetches on `filter` change. Search is CLIENT-SIDE only (filters loaded `items` by title/occasion/category substring; no DB query).
**State:** `items`, `filter`("All"), `searchQuery`, `loading`. `itemCount` = filtered length, shown as "{n} pieces".
**Nav out:** `router.push(`/item/${item.id}`)` on card tap. **Nav in:** default tab / AuthGuard / `router.replace("/(tabs)/")` from many flows.
**UI:** blush header with "UARK · Spring Rush" eyebrow + "The Closet." title + piece count; pill search bar; horizontal filter chips; 2-column `FlatList` of `ItemCard` with `RefreshControl` (pull-to-refresh = `fetchItems`); empty state "No pieces yet. / Check back during rush week." `paddingBottom: 140` to clear floating tab bar.

### 8. `app/(tabs)/list.tsx` — route `/(tabs)/list` — NEW LISTING
**Purpose:** Create a new `items` row (lend a piece).
**DB writes (quoted):**
- Image upload per file: `supabase.storage.from("item-images").upload(`${user.id}/${Date.now()}.${ext}`, blob, { contentType: `image/${ext}` })` → `getPublicUrl`.
- Insert: `supabase.from("items").insert({ owner_id: user.id, title, description, price_per_day: parseFloat(pricePerDay), deposit: parseFloat(deposit)||0, size, occasion, category, images: uploadedUrls, available: true })`.
So `items` columns WRITTEN: `owner_id, title, description, price_per_day, deposit, size, occasion, category, images, available`.
**Validation:** title + price + ≥1 photo required (Alert "Missing info"). Max 5 photos.
**Inputs:** title, description(multiline), price/day(decimal-pad), deposit(decimal-pad). `size`/`occasion`/`category` are TAP-TO-CYCLE buttons (`cycleValue` rotates through SIZES/OCCASIONS/CATEGORIES) — not dropdowns/pickers (minor UX limitation; user must tap repeatedly to reach a value).
**State:** title, description, pricePerDay, deposit, size(SIZES[2]="M"), occasion(OCCASIONS[0]), category(CATEGORIES[0]), images[], loading.
**Nav out:** success Alert "Listed! 🎀" → `router.replace("/(tabs)/")`. **Nav in:** LIST tab, or Profile "+ add item" / "list your first item" → `router.push("/(tabs)/list")`.
**UI:** blush header "new listing", scrollable form, horizontal photo strip with add/remove, ink submit button "list it ✨".

### 9. `app/(tabs)/messages.tsx` — route `/(tabs)/messages` — INBOX
**Purpose:** List conversations for current user.
**DB read (quoted):**
```
supabase.from("conversations").select(`
    id, user1_id, user2_id, last_message, last_message_at,
    unread_user1, unread_user2,
    items(title),
    user1:profiles!user1_id(id, full_name),
    user2:profiles!user2_id(id, full_name)
  `)
  .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
  .order("last_message_at", { ascending: false })
```
`conversations` columns read: `id, user1_id, user2_id, last_message, last_message_at, unread_user1, unread_user2`, joined to `items(title)` and two `profiles` aliases (`user1`/`user2` via FK `user1_id`/`user2_id`).
**Shaping logic:** `viewerIsUser1 = c.user1_id === user.id`; `other_user = viewerIsUser1 ? user2 : user1`; `unread_count = viewerIsUser1 ? unread_user1 : unread_user2` (this is the BUG-04 fix referenced in CLAUDE.md, present and correct here).
**State:** `conversations`(shaped), `loading`. Refetches via `useFocusEffect` on `user?.id`.
**Nav out:** `router.push(`/conversation/${c.id}`)`. **Nav in:** MESSAGES tab.
**UI:** blush "inbox" header, FlatList rows (avatar placeholder 👤, other_user name, "re: {item.title}", last_message 1-line, date, pink unread badge). Empty state 💬 "no messages yet". Pull-to-refresh.

### 10. `app/(tabs)/profile.tsx` — route `/(tabs)/profile` — YOU
**Purpose:** Show own profile, stats, Stripe payout onboarding, and "my closet" listings.
**DB reads (quoted):**
- `supabase.from("profiles").select("*").eq("id", user.id).single()` → profile (columns used: `full_name, school, sorority, size, rating, total_rentals, total_earnings, stripe_account_id`).
- `supabase.from("items").select("*").eq("owner_id", user.id).order("created_at", {ascending:false})` → my items.
**Stripe Connect (writes none directly):** `setupPayouts()` → `supabase.auth.getSession()` then `fetch(`${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-connect-account`, { POST, Bearer access_token })` → opens returned `url` via `Linking.openURL` (Stripe Express onboarding). Shown only when `!profile.stripe_account_id`.
**State:** `profile`, `myItems`, `connectLoading`. `useEffect` on `[user]`.
**Nav out:** `signOut()` (→ AuthGuard kicks to login); `router.push("/(tabs)/list")`; `router.push(`/item/${item.id}`)`. **Nav in:** YOU tab.
**UI:** blush header (avatar 👤, name, school, sorority, sign-out button), 4 stat cards (size/rentals/earned/rating), payout setup card, "my closet" grid of `ItemCard` or empty-state "list your first item".
**Note:** read-only — no edit-profile capability exists anywhere. Avatar always renders the 👤 emoji placeholder (profile.tsx never reads/renders `avatar_url` even though signup2 uploads it).

### 11. `app/(tabs)/rentals.tsx` — route `/(tabs)/rentals` — LEDGER (rental lifecycle hub)
**Purpose:** Two-tab ledger ("renting" vs "lending") + status transitions + return/deposit release.
**DB read (quoted):**
```
const field = tab === "renting" ? "renter_id" : "owner_id";
supabase.from("rentals")
  .select("*, items(title, images, price_per_day), renter:profiles!renter_id(full_name), owner:profiles!owner_id(full_name)")
  .eq(field, user.id)
  .order("created_at", { ascending: false })
```
`rentals` columns read: `id, status, start_date, end_date, total_price, deposit_amount, stripe_payment_intent, stripe_deposit_intent` (+ joins `items(title,images,price_per_day)`, `renter`/`owner` profile names).
**DB writes:** `updateStatus(id,status)` → `supabase.from("rentals").update({ status }).eq("id", id)`.
**Status transitions (LENDING/owner actions):**
- `pending` → APPROVE → status `"approved"` ("they'll receive a payment link") / DECLINE → `"cancelled"`.
- `paid` → CONFIRM HANDOFF → status `"active"`.
- `active` → CONFIRM RETURN & RELEASE DEPOSIT → calls Edge Function `release-deposit` (not a status update): `fetch(`${EXPO_PUBLIC_API_URL ?? EXPO_PUBLIC_SUPABASE_URL}/functions/v1/release-deposit`, { POST, Bearer, body: { rental_id } })`, then refetch.
**RENTING/renter side is INFO-ONLY (no actions):** `approved` → green "complete payment to confirm" banner; `paid` → amber "Waiting for owner to confirm handoff". GAP: the renter has NO button here to actually pay an approved rental — the payment flow lives only in `contract/[id].tsx`, which is reached from item detail BEFORE approval. So an owner-approved-then-renter-pays loop is not wired from this screen (see Gaps).
**Status color map:** pending(amber), approved/paid(green), active(blue), completed(gray), cancelled/disputed(red).
**State:** `tab`("renting"), `rentals`, `loading`, `actionLoading`(per-id spinner). `useFocusEffect` on `[tab, user?.id]`. `confirmAction` wraps `Alert.alert` in a Promise.
**Nav:** no outbound navigation (self-contained). **Nav in:** RENTALS tab.
**UI:** blush "ledger" header, renting/lending segmented toggle, FlatList of rental cards (thumbnail, title, counterparty, date range, price, status pill, contextual action buttons), empty state 📦. Pull-to-refresh.

### 12. `app/item/[id].tsx` — route `/item/[id]` (stack, outside tabs) — ITEM DETAIL + RENT REQUEST
**Purpose:** Show one item, pick dates, create a rental request (+ conversation + first message), go to contract.
**DB read (quoted):** `supabase.from("items").select("*, profiles(full_name, school, sorority, rating)").eq("id", id).single()`. `items` columns used: `id, title, description, price_per_day, deposit, size, occasion, category, images, available, owner_id` + owner `profiles(full_name, school, sorority, rating)`.
**DB writes (3, on "review contract" / `handleRentRequest`):**
1. `supabase.from("conversations").insert({ user1_id: user.id, user2_id: item.owner_id, item_id: item.id, last_message: `Rental request for ${item.title}`, last_message_at: now }).select().single()` → renter is always `user1`.
2. `supabase.from("rentals").insert({ item_id, renter_id: user.id, owner_id: item.owner_id, start_date, end_date, total_price: total, commission_amount: fee, deposit_amount: item.deposit, status: "pending", conversation_id: convo.id }).select().single()`.
3. `supabase.from("messages").insert({ conversation_id: convo.id, sender_id: user.id, content: `Rental request for ${title} · {dates} · $${total}` })`.
`rentals` columns WRITTEN: `item_id, renter_id, owner_id, start_date, end_date, total_price, commission_amount, deposit_amount, status, conversation_id`.
**Pricing:** `days = max(1, ceil((end-start)/86400000))`; `subtotal = price_per_day * days`; `fee = round(subtotal * 0.15)`; `total = subtotal + fee`. Deposit displayed separately as refundable (NOT added into `total` here — but contract screen's "total charged today" uses `rental.total_price` which excludes deposit; deposit is "held" separately).
**Date picker:** `@react-native-community/datetimepicker`; start min today, end min start. Default range = now → +3 days.
**Owner-vs-viewer gating:** date picker + bottom CTA only render when `item.owner_id !== user?.id`; CTA additionally requires `item.available`. Owner viewing own item sees read-only detail.
**Nav out:** success → `router.push(`/contract/${rentalData.id}`)`; back arrow → `router.back()`. **Nav in:** from Browse cards, Profile "my closet" cards.
**State:** `item`, `imageIndex`(carousel), `startDate`, `endDate`, `showStartPicker`, `showEndPicker`, `loading`. Returns "loading..." placeholder until item fetched.
**UI:** full-bleed paging image carousel with dot indicators, back button, title/category/occasion, price, size + deposit chips, description, owner card (name/school/sorority/rating), date pickers, price breakdown card, sticky bottom "review contract · $total" button. StatusBar light over images.

### 13. `app/contract/[id].tsx` — route `/contract/[id]` (stack) — RENTAL AGREEMENT + PAYMENT
**Purpose:** Show terms, capture agreement, run Stripe payment, mark rental `paid`, write contract record.
**DB read (quoted):** `supabase.from("rentals").select("*, items(*, profiles(full_name, school)), profiles!renter_id(full_name)").eq("id", id).single()`. Reads full rental + full item (`items(*)`) incl. `deposit`, `price_per_day`, `owner_id`, plus owner profile and renter profile.
**Stripe (standalone build only — `ContractPaySection` + `useStripe`):**
- `fetch(`${EXPO_PUBLIC_API_URL}/create-payment-intent`, { POST, Bearer, body: { rental_id, amount: round(total_price*100), deposit: round(items.deposit*100) } })` → `{ paymentIntentClientSecret, depositIntentClientSecret }`.
- `initPaymentSheet({ paymentIntentClientSecret, merchantDisplayName:"Twirl", applePay, googlePay(testEnv:true), style:"alwaysLight" })` → `presentPaymentSheet()`.
**DB writes (after successful payment, quoted):**
1. `supabase.from("rental_contracts").insert({ rental_id, renter_id: user.id, owner_id: rental.items.owner_id, agreed_at: now, deposit_intent_id: depositIntentClientSecret?.split("_secret")[0], terms_version: "1.0" })`. `rental_contracts` columns WRITTEN: `rental_id, renter_id, owner_id, agreed_at, deposit_intent_id, terms_version`. This is the ONLY place `rental_contracts` is touched in the entire frontend (write-only; never read).
2. `supabase.from("rentals").update({ status: "paid", contract_agreed: true }).eq("id", id)`. (`contract_agreed` column written only here.)
**Nav out:** success → `router.replace("/(tabs)/rentals")`; back arrow → `router.back()`. **Nav in:** `router.push(`/contract/${id}`)` from item detail (immediately after rental insert, while status is still `pending`).
**Expo Go path:** `isExpoGo` → renders `PreviewPayButton` that just `Alert`s "Payments are disabled in Expo Go." — no DB writes occur in Expo Go, so in Expo Go a rental never advances past `pending` from this screen.
**State:** `rental`, `agreed` (checkbox); `ContractPaySection` has its own `loading`. Returns `null` until rental loaded.
**UI:** blush "terms" header, item/price summary (rental fee, 15% service fee, deposit held, total charged today = `rental.total_price`), 6-section rental agreement (deposit, non-return, damage, condition docs, late return, dispute resolution), agreement checkbox, pay/preview button.
**Notable ordering quirk:** the rental row already exists with `status:"pending"` before the user reaches this screen (created in item/[id].tsx). Contract+payment flips it to `paid`. So `pending` rentals can exist with no contract if the user abandons here.

### 14. `app/conversation/[id].tsx` — route `/conversation/[id]` (stack) — CHAT THREAD
**Purpose:** Realtime 1:1 messaging within a conversation.
**DB reads (quoted, parallel):**
- conv meta: `supabase.from("conversations").select("user1_id, user2_id, items(title), user1:profiles!user1_id(id, full_name), user2:profiles!user2_id(id, full_name)").eq("id", id).single()`.
- messages: `supabase.from("messages").select("id, sender_id, content, created_at").eq("conversation_id", id).eq("is_deleted", false).order("created_at", {ascending:true})`. (`messages.is_deleted` filter used — soft-delete aware.)
**DB writes:**
- Mark read on open: `supabase.from("conversations").update(isUser1 ? {unread_user1:0} : {unread_user2:0}).eq("id", id)`.
- Send: `supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, content })`. `messages` columns WRITTEN: `conversation_id, sender_id, content`.
- After send, bump counterparty unread + last message: reads `unreadCol` then `supabase.from("conversations").update({ last_message: content, last_message_at: now, [unreadCol]: prev+1 }).eq("id", id)` where `unreadCol = isUser1 ? "unread_user2" : "unread_user1"`.
**Realtime:** subscribes to a Supabase channel `conv-${id}` on `postgres_changes` INSERT to `messages` filtered `conversation_id=eq.${id}`; appends new message + scrolls to end. Channel removed on unmount. `loadConversation` de-dupes realtime-only messages against the fetched set.
**State:** `meta`, `messages`, `inputText`, `loading`, `sending`. `flatListRef` for scroll-to-end. On send failure, restores `inputText`.
**Nav out:** back arrow → `router.back()`. **Nav in:** `router.push(`/conversation/${c.id}`)` from messages inbox. (NOT reached automatically after creating a rental — item detail goes to contract, not the conversation it just created.)
**UI:** blush header (other_user name + "re: item title"), message FlatList (mine = pink right bubble, theirs = white left bubble, with timestamps), KeyboardAvoidingView compose bar with multiline input (maxLength 2000) + pink send ↑ button. Loading spinner gate.

---

## (a) FULL NAVIGATION GRAPH

Route groups: `(auth)` and `(tabs)` are layout groups (not URL segments). Stack screens `item/[id]`, `contract/[id]`, `conversation/[id]` live at root level (outside tabs, so they cover the tab bar).

```
RootLayout (_layout.tsx)  [Stack, headerShown:false, fonts gate, StripeProvider, AuthGuard]
│
├── AuthGuard logic (global):
│     !session & not in (auth)  -> replace /(auth)/login
│      session & in (auth)      -> replace /(tabs)/
│
├── (auth)  [unauthenticated]
│     login ──"Create account"──> signup1 ──Continue(params:email,password)──> signup2 ──Finish──> replace /(tabs)/
│     login ──success──> replace /(tabs)/
│     signup (legacy) ──Redirect──> signup1
│     signup2 back: step>0 -> step--, step0 -> replace signup1
│
└── (tabs)  [authenticated; custom TwirlTabBar; order: index,list,rentals,messages,profile]
      ├── index (BROWSE) ──card tap──> /item/[id]
      ├── list (LIST) ──submit──> replace /(tabs)/
      ├── rentals (LEDGER) ──(self-contained; release-deposit edge fn)
      ├── messages (INBOX) ──row tap──> /conversation/[id]
      └── profile (YOU) ──"+ add item"──> /(tabs)/list
                          ──closet card──> /item/[id]
                          ──signOut──> (AuthGuard) login
                          ──setup payouts──> external Stripe URL (Linking)

      /item/[id] ──"review contract" (creates conversation+rental+message)──> /contract/[id]
                 ──back──> previous
      /contract/[id] ──pay success (writes rental_contracts, rentals.status=paid)──> replace /(tabs)/rentals
                     ──back──> /item/[id]
      /conversation/[id] ──back──> /(tabs)/messages
```

Dead-ends / disconnected edges:
- After `item/[id]` creates a conversation, the app navigates to `/contract/[id]`, NOT to `/conversation/[id]`. The new conversation is only discoverable later via the Messages tab.
- `rentals.tsx` renter side never links back to `/contract/[id]` to pay an approved rental (no nav out at all).

## (b) END-TO-END USER JOURNEYS

1. ONBOARDING / SIGNUP:
   App open → fonts load → AuthGuard sees no session → `/(auth)/login`. Tap "Create account" → `signup1` (enter UARK email local-part + 8+ char password, validated) → push to `signup2` with `{email,password}` params → 4 sub-steps (avatar upload to Storage `item-images/{uid}/avatar.jpg`, name/year/major/hometown, chapter+size, bio) → "Finish" runs `auth.signUp` (+1 retry on 504) → on success inserts/upserts `profiles` row → `replace /(tabs)/`. Timeout-but-created edge handled via signIn fallback. (Legacy `/(auth)/signup` just redirects to signup1.)

2. BROWSE → ITEM DETAIL → RENT REQUEST:
   BROWSE tab queries `items` where available & not mine, ordered newest; filter chips map to `occasion` sets; search is client-side. Tap card → `/item/[id]` loads item+owner. Non-owner picks date range (default 3 days), sees price breakdown (subtotal + 15% fee, deposit separate). Tap "review contract" → inserts `conversations` (renter=user1), `rentals` (status `pending`, with `commission_amount`,`deposit_amount`,`conversation_id`), and a first `messages` row → push `/contract/[id]`.

3. CONTRACT SIGNING / PAYMENT:
   `/contract/[id]` loads rental+item+profiles, shows fee breakdown + 6 legal terms. User checks agreement box. Standalone build: `create-payment-intent` edge fn → Stripe PaymentSheet (initPaymentSheet/presentPaymentSheet) → on success writes `rental_contracts` (terms_version "1.0", deposit_intent_id) + updates `rentals` to `status:"paid", contract_agreed:true` → `replace /(tabs)/rentals`. Expo Go: preview-only Alert, no writes (rental stays `pending`).

4. MESSAGING:
   MESSAGES tab lists `conversations` for the user (joined to items + both profiles), with correct per-viewer unread count. Tap → `/conversation/[id]`: parallel-loads meta + non-deleted messages, resets viewer unread to 0, subscribes to realtime INSERTs on `messages`. Sending inserts a `messages` row then bumps counterparty `unread_userN` + `last_message`/`last_message_at` on the conversation.

5. RENTALS LIFECYCLE (LEDGER):
   RENTALS tab toggles renting (`renter_id`) vs lending (`owner_id`). Owner actions drive status: pending→approved/cancelled (DECLINE), paid→active (CONFIRM HANDOFF), active→`release-deposit` edge fn (CONFIRM RETURN). Renter side is informational only (approved/paid banners). Status lifecycle observed: pending → approved → paid → active → (completed via release-deposit) | cancelled | disputed. Note the payment step (pending→paid) happens via the contract screen, out-of-band from this ledger.

6. PROFILE:
   YOU tab reads own `profiles` (single) + own `items`. Shows stats (size/total_rentals/total_earnings/rating), a Stripe Connect "set up payouts" card when `stripe_account_id` is null (opens external onboarding via `create-connect-account` edge fn + Linking), and a "my closet" grid linking to item detail or the list screen. Sign out triggers AuthGuard redirect to login. Read-only — no profile editing exists.

CONNECTIONS: app/_layout.tsx AuthGuard is the single global router: it redirects between (auth) and (tabs) based on useAuth().session — every other screen relies on it for auth gating; useAuth() is called independently per-screen (no shared Context); each instance opens its own onAuthStateChange subscription; lib/supabase.ts singleton is imported by all 14 screens + useAuth for every DB/auth/storage/realtime call; item/[id].tsx is the ORIGIN of the rental flow: it writes conversations + rentals(pending) + messages in one action, then hands rentalData.id to contract/[id].tsx via route param; contract/[id].tsx consumes the rental id from item/[id], runs Stripe, and is the ONLY writer of rental_contracts and the only place rentals.status -> paid + contract_agreed=true; rentals.tsx consumes rentals created by item/[id] and advances status (approved/active) + calls release-deposit edge fn; it is the lending-side counterpart to the contract payment; messages.tsx and conversation/[id].tsx share the conversations table (user1/user2 + unread_user1/unread_user2 + last_message); conversation rows are first created by item/[id]; ItemCard.tsx is shared by index.tsx (Browse) and profile.tsx (my closet); both push to /item/[id]; Stripe is wired across _layout.tsx (StripeProvider), contract/[id].tsx (PaymentSheet via create-payment-intent), profile.tsx (Connect onboarding via create-connect-account), rentals.tsx (release-deposit) — all gated/affected by isExpoGo; Storage bucket item-images is shared: signup2.tsx writes {uid}/avatar.jpg and list.tsx writes {uid}/{timestamp}.ext; Edge Functions referenced by frontend: create-payment-intent (contract), release-deposit (rentals), create-connect-account (profile); Custom TwirlTabBar in (tabs)/_layout.tsx hardcodes the TABS array order to match <Tabs.Screen> declaration order (index,list,rentals,messages,profile)
GAPS NOTICED: Renter cannot pay an APPROVED rental from rentals.tsx — the only payment entry is contract/[id].tsx reached from item detail while status is still 'pending'. So the owner approve -> renter pay loop is not wired; an 'approved' rental has no UI path to reach the contract/payment screen again.; item/[id].tsx creates a conversation but navigates to /contract, never to /conversation — the new chat is only reachable later via the Messages tab.; Edge Function URL construction is inconsistent: contract/[id].tsx uses `${EXPO_PUBLIC_API_URL}/create-payment-intent` (no /functions/v1/ prefix, no SUPABASE_URL fallback), while rentals.tsx uses `${EXPO_PUBLIC_API_URL ?? EXPO_PUBLIC_SUPABASE_URL}/functions/v1/release-deposit` and profile.tsx uses `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-connect-account`. If EXPO_PUBLIC_API_URL is unset or equals the bare Supabase URL, the payment-intent call hits the wrong path.; profile.tsx never renders avatar_url (always shows 👤 emoji) even though signup2.tsx uploads and stores avatar_url; messages/conversation also use emoji placeholders. Avatars are written but never displayed.; No edit-profile / settings screen exists anywhere; profile is read-only after signup.; Tables saved_items, reviews, reports, blocked_users (4 of the 10 in CLAUDE.md) are never referenced in app/ — favorites, reviews, reporting, and blocking are unimplemented in the UI.; In Expo Go, contract/[id].tsx payment is a no-op Alert, so a rental created via item/[id] can never advance past 'pending' on a device running Expo Go (testing limitation).; Rentals can be orphaned in 'pending' with no rental_contracts row if the user abandons the contract screen (rental is inserted in item/[id] before any contract/payment).; list.tsx uses tap-to-CYCLE buttons for size/occasion/category rather than a picker — reaching a far value (e.g. CATEGORIES has 8) requires many taps.; signup2 bio shows a /280 counter but the TextInput has no maxLength, so >280 chars can be entered/saved.; No root app/index.tsx and no +not-found.tsx; unmatched routes have no custom handling. Deep-linking relies entirely on AuthGuard + the legacy signup redirect.; Each screen instantiates useAuth() separately (N auth subscriptions); minor inefficiency / potential for divergent loading states vs a shared Context/provider.

---

### AREA: Design System (tokens, typography, brand language, reusable components, NativeWind/Tailwind wiring)
# Twirl Design System — Complete Documentation

The design system lives in two layers: (1) a **Tailwind/NativeWind token layer** in `tailwind.config.js` defining a "Blueprint OS v0.3" canonical palette, typography, and radius scale, and (2) a small **component layer** in `components/twirl/` + `components/cards/`. There is a third, **orphaned/legacy** layer: `.twirl_theme.json` at repo root, which is a totally different (older, pink/Tailwind-default) palette that is **not imported anywhere in code**.

---

## 1. COLOR TOKENS

All colors are defined in `tailwind.config.js` under `theme.extend.colors`. There are two namespaces: `twirl.*` and `status.*`. NativeWind exposes these as classes like `bg-twirl-paper`, `text-twirl-rose`, `bg-status-pending-bg`.

### `twirl.*` palette (canonical "Design spec" names)
| Token (class form) | Hex | Role / observed use |
|---|---|---|
| `twirl-paper` | `#FDFAF4` | App background (off-white "paper"). Used 31× — primary screen bg. |
| `twirl-cream` | `#FBF5EC` | Secondary surface / card bg, Button "cream" variant, signup2 screen bg. |
| `twirl-blush` | `#F7E4DE` | Warm pink-beige. Input focused bg, ItemCard placeholder bg. Used 13×. |
| `twirl-ink` | `#2A1F26` | Canonical near-black text color. **NEVER referenced as `twirl-ink` class** (0 uses) — screens use the legacy alias `twirl-text` instead. |
| `twirl-ink-2` | `#5A4A54` | Canonical secondary text. **Class `twirl-ink-2` never used**; screens use legacy `twirl-ink2` (18×). |
| `twirl-muted` | `#A89AA0` | Muted/placeholder text. Used 36×. Also hardcoded as `"#A89AA0"` placeholderTextColor in Input. |
| `twirl-line` | `#E8DDD4` | Hairline borders / dividers. Used 34×. |
| `twirl-rose` | `#E56A8A` | Brand rose (lighter). Used 3× as class. |
| `twirl-rose-deep` | `#B84565` | Deep rose — the dominant brand accent (Wordmark default color, StepDots active, CornerOrnament strokes, ItemCard price). Used only 1× **as a class**; everywhere else it appears as the hardcoded hex `#B84565` (8× inline). |
| `twirl-clay` | `#C97B5C` | **UNUSED** — 0 references anywhere. |
| `twirl-plum` | `#6B4578` | Used by Button "plum" variant only. |
| `twirl-gold` | `#B8945A` | **UNUSED** as class (one stray inline `#B8945A` exists). |
| `twirl-moss` | `#6B7F5C` | **UNUSED** — 0 references. |
| `twirl-amber` | `#C89A3C` | **UNUSED** — 0 references. |
| `twirl-pink` (legacy alias) | `#E56A8A` | Alias of `twirl-rose`. Heavily used (23×) — the de-facto rose token in screens. |
| `twirl-text` (legacy alias) | `#2A1F26` | Alias of `twirl-ink`. Heavily used (52×) — de-facto text color. |
| `twirl-ink2` (legacy alias) | `#5A4A54` | Alias of `twirl-ink-2`. Used 18×. |

**Key inconsistency:** the canonical names (`twirl-ink`, `twirl-ink-2`, `twirl-rose`) lost to their legacy aliases (`twirl-text`, `twirl-ink2`, `twirl-pink`). The config comment explicitly says "Legacy aliases — existing screens reference these; do not remove." So the codebase migration to canonical names was never finished. New code should standardize on one set.

### `status.*` palette (rental status chips)
| Token | Hex | Intended use |
|---|---|---|
| `status-pending-bg` / `status-pending-fg` | `#FAEFD4` / `#8A6A1E` | Pending rental chip |
| `status-active-bg` / `status-active-fg` | `#E5EADD` / `#425133` | Active rental chip |
| `status-completed-bg` / `status-completed-fg` | `#EDE6DE` / `#6B5E52` | Completed chip |
| `status-declined-bg` / `status-declined-fg` | `#F1E0E0` / `#7B4141` | Declined chip |

**Entire `status.*` namespace is UNUSED as classes (0 references).** Rental status screens instead hardcode hex (e.g. `#065F46`, `#D1FAE5`, `#FEF3C7`, `#7B4141`, `#92400E`, `#991B1B`) — these are mostly Tailwind default emerald/amber/red values, NOT the Twirl status palette. This is a real visual inconsistency: the designed status system exists but the screens reimplement it with off-palette colors.

### Stray / off-palette inline colors found in screens
`#D1D5DB`, `#6B7280`, `#E5E7EB`, `#F3F4F6` (Tailwind grays), `#065F46`, `#D1FAE5` (emerald), `#FEF3C7`/`#92400E` (amber), `#FEE2E2`/`#991B1B` (red), `#DBEAFE`/`#1E40AF` (blue), `#F472B6` (the old `.twirl_theme.json` primary pink). These do not belong to the Twirl palette and indicate copy-pasted generic styling leaking in.

### `.twirl_theme.json` (ORPHANED — repo root)
A separate, older theme file, **not imported by any code** (grep for "twirl_theme" returns nothing). It is a different design direction entirely:
`primary #F472B6`, `rose #FB7185`, `blush #FDE8EF`, `cream #FFF9F5`, `text #1C1024`, `muted #9CA3AF`, `white #FFFFFF`, `border #FCE7F3`, `success #10B981`, `radius 18`, `font_size 13`, `card_gap 12`, `dark_mode false`. None of these hexes match the current `tailwind.config.js` palette except radius 18. Safe to treat as dead/legacy or a pre-redesign artifact. `dark_mode: false` confirms the app is light-mode only.

---

## 2. TYPOGRAPHY

### Fonts loaded
Three Google font families loaded via `expo-font`'s `useFonts` in `app/_layout.tsx` (lines 6-11, 35-42), sourced from `@expo-google-fonts/*` packages in `package.json`:
- `@expo-google-fonts/cormorant-garamond` (^0.4.1) → `CormorantGaramond_500Medium`, `CormorantGaramond_500Medium_Italic`
- `@expo-google-fonts/inter` (^0.4.2) → `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`
- `@expo-google-fonts/jetbrains-mono` (^0.4.1) → `JetBrainsMono_500Medium`

The root layout **blocks render until fonts load** — shows a centered `ActivityIndicator` (color `#2A1F26`) on a `bg-twirl-paper` view while `!fontsLoaded`. So there is no FOUT; fonts are guaranteed present before any screen mounts.

### Font roles (by usage)
- **Cormorant Garamond (serif)** — the brand display/serif face. `_500Medium` for the Wordmark logo (4× inline). `_500Medium_Italic` is the dominant editorial face used for titles/headings throughout (18× inline, e.g. ItemCard title at 14px). This italic serif is the signature "Twirl" voice.
- **Inter (sans)** — UI body/labels. `_400Regular` (3×), `_500Medium` (2×), `_600SemiBold` (2×). Note: Button label uses NativeWind `font-semibold` utility (system font weight) rather than the loaded `Inter_600SemiBold` — so the button text is NOT actually Inter, it's the platform default sans-serif at semibold weight.
- **JetBrains Mono (mono)** — numeric / "blueprint" labels: prices, technical metadata. `_500Medium` used 10× (e.g. ItemCard `$X/day` at 11px, letterSpacing 0.3, in rose-deep `#B84565`). The mono face reinforces the blueprint/technical aesthetic for numbers.

### Typography scale (`tailwind.config.js` `fontSize`)
| Token | Size | lineHeight | letterSpacing |
|---|---|---|---|
| `h2` | 44 | 42 | -1 |
| `h3` | 32 | 30 | -0.5 |
| `h4` | 22 | 23 | -0.3 |
| `body-l` | 16 | 24 | — |
| `body` | 14 | 21 | — |
| `btn` | 15 | 15 | 0.2 |
| `eyebrow` | 10 | 10 | 1.8 (uppercase labels) |
| `mono-xs` | 8 | 8 | 1.5 |

**Critical wiring gap:** NONE of the `fontFamily` tokens (`font-serif`, `font-serif-italic`, `font-sans`, `font-sans-medium`, `font-sans-semibold`, `font-mono`) and NONE of the `fontSize` tokens (`text-h2`, `text-h3`, `text-eyebrow`, etc.) are used anywhere as classes (0 matches across `app/` and `components/`). Instead:
- Fonts are applied via raw inline `style={{ fontFamily: "CormorantGaramond_500Medium_Italic", ... }}` literals.
- Sizes are applied via arbitrary-value classes like `text-[15px]`, `text-[10px]`, `text-[14px]`, or inline `fontSize` numbers.

So the typographic token system is **defined but bypassed**. The eyebrow style (10px, 1.8 letterSpacing, uppercase) is reimplemented inline in `Input.tsx` label: `text-[10px] tracking-[1.8px] uppercase`. New work should either adopt the tokens or delete them; right now they are documentation, not enforced.

---

## 3. SPACING SCALE

There is **no custom spacing scale** — `tailwind.config.js` only extends `colors`, `fontFamily`, `fontSize`, `borderRadius`. Spacing uses NativeWind's default Tailwind scale (`gap-2`, `mb-2`, `px-4`, `py-[15px]`, `mb-[14px]`, etc.) plus arbitrary bracket values. Observed conventions:
- Screen horizontal padding ≈ 20px (ItemCard math uses `20 * 2` gutter).
- Card grid gap = 16px (ItemCard width math `- 16`), 2-column grid.
- Input vertical rhythm: `mb-[14px]` between fields, `py-[15px]` field height.
- Button height fixed `h-[54px]`.

### Border radius scale (`tailwind.config.js` `borderRadius`)
| Token | px | Intended |
|---|---|---|
| `card` | 18 | Cards |
| `btn` | 14 | Buttons |
| `input` | 12 | Inputs |
| `pill` | 999 | Pills/dots |
| `tabbar` | 24 | Tab bar |

**Same gap as typography:** `rounded-card`, `rounded-btn`, `rounded-input`, `rounded-pill`, `rounded-tabbar` are NOT used anywhere (0 matches). Components hardcode equivalent values: Button `rounded-[14px]` (matches `btn`), Input `rounded-xl` (12px, matches `input`), ItemCard `borderRadius: 18` inline (matches `card`), StepDots `borderRadius: 999` inline (matches `pill`). The radius tokens are accurate but unused — same "defined but bypassed" pattern.

---

## 4. VISUAL BRAND LANGUAGE ("Blueprint" / ornament aesthetic)

The brand reads as **warm editorial paper meets architectural blueprint**:
- **Palette mood:** warm off-whites (`paper #FDFAF4`, `cream #FBF5EC`, `blush #F7E4DE`) as ground; deep rose `#B84565` as the single hero accent; near-black plum-tinted ink `#2A1F26` for text. Soft, feminine, premium — aimed at the "sorority girl at 11pm" user.
- **Type pairing:** italic Cormorant Garamond (editorial/fashion magazine voice) for names/titles + JetBrains Mono (technical/blueprint voice) for numbers/prices + Inter for plain UI. The serif/mono contrast is the core brand tension — fashion + engineering.
- **The "blueprint" ornament** is literally a component: `CornerOrnament.tsx` renders an SVG of two faint nested arcs (`M10 60 Q 60 10, 110 60` and an inner arc) plus a tiny center dot, all in rose `#B84565` at very low opacity (strokeOpacity 0.15-0.2, strokeWidth 0.5-0.8, dot fillOpacity 0.4). It evokes a drafting-compass / French-curve / protractor mark — a decorative "technical drawing" flourish placed in screen corners. Default container opacity 0.5, so it's a whisper-level texture, not a focal element.
- **Wordmark animation:** the `Wordmark` can animate letters of "twirl" revealing left-to-right via width expansion (reanimated `withDelay` per-letter delays `[150,450,780,1130,1450]`, 420ms `bezier(0.65,0,0.35,1)` ease), respecting OS reduce-motion (falls back to opacity fade, 200ms). Tight negative letterSpacing (`size * -0.022`) and compressed lineHeight (`size * 0.9`) give it a refined, condensed display look.
- **Progress as blueprint dots:** `StepDots` renders a row of dots where the active step is an elongated rose pill (16×4) and inactive are 4×4 `line`-colored dots — minimal, technical wayfinding for the multi-step signup/list flows.
- **Cards** are tall portrait tiles (aspectRatio 3/4) with a translucent "glass" caption strip at the bottom (`rgba(253,250,244,0.94)` = paper at 94% alpha) — frosted-paper overlay aesthetic, hairline `#E8DDD4` border at 0.5px.

---

## 5. REUSABLE COMPONENTS

All paths absolute under `/Users/cooperporter/Twirl-Hub/repo/Twirl/`. Inventory is small — 6 components total.

### `components/twirl/Button.tsx`
- **Props:** `children: ReactNode`, `onPress: () => void`, `variant?: "ink"|"rose"|"plum"|"ghost"|"cream"` (default `"ink"`), `disabled?: boolean`, `loading?: boolean`, `icon?: ReactNode`.
- **Variants** (`variantMap`):
  - `ink` → `bg-twirl-text` (#2A1F26), white text, spinner `#FDFAF4` (primary CTA).
  - `rose` → `bg-twirl-pink` (#E56A8A), white text, spinner `#FDFAF4`. NOTE: variant is named "rose" but uses the *pink/rose-light* token `#E56A8A`, NOT the deep rose `#B84565` brand accent — naming/color mismatch with the rest of the brand.
  - `plum` → `bg-twirl-plum` (#6B4578), white text.
  - `ghost` → transparent + `border-twirl-line`, ink text, dark spinner `#2A1F26`.
  - `cream` → `bg-twirl-cream` + `border-twirl-line`, ink text, dark spinner.
- **Structure:** fixed `h-[54px]`, `rounded-[14px]`, centered flex-row with `gap-2`; renders `ActivityIndicator` when `loading`, else `icon` + label (`text-[15px] font-semibold tracking-[0.2px]`). `disabled || loading` => `opacity 0.55`; pressed => `opacity 0.95` + `scale 0.985`. Press micro-interaction is the only motion.
- **Note:** label uses utility `font-semibold` (system font), not loaded `Inter_600SemiBold` — button text is not actually Inter.

### `components/twirl/Input.tsx`
- **Props:** `label?`, `value: string`, `onChangeText: (v) => void`, `placeholder?`, `secureTextEntry?`, `multiline?`, `suffix?` (trailing text like a unit).
- **Behavior:** internal `focused` state; on focus the wrapper switches to `bg-twirl-blush border-twirl-pink`, else `bg-twirl-paper border-twirl-line`. Optional uppercase eyebrow label (`text-twirl-ink2 text-[10px] tracking-[1.8px] uppercase`). `rounded-xl` (12px). Placeholder color hardcoded `#A89AA0` (= `twirl-muted`). Text input `text-twirl-text text-[15px] px-4 py-[15px]`. Suffix is `text-twirl-muted text-sm`.
- **Gaps:** no error/validation state, no helper text, no disabled state, no left icon, no keyboard-type/autocapitalize passthrough. Multiline has no min-height handling.

### `components/twirl/Wordmark.tsx`
- **Props:** `size?: number` (default 140), `color?: string` (default `#B84565` deep rose), `animated?: boolean` (default false).
- The animated brand logotype (see Brand Language §4). Uses reanimated shared values per letter, measures letter widths via off-screen `onLayout` pass first (`ready` gate), respects reduce-motion. Renders in `CormorantGaramond_500Medium`. Accessible: `accessibilityRole="image"`, `accessibilityLabel="Twirl"`.
- **Smell:** `useAnimatedStyle` is called inside a `.map()` (lines 71-76) — a React hook called in a loop. Works only because LETTERS length is constant (5), but it's a rules-of-hooks violation that would break if the letter count ever varied.

### `components/twirl/StepDots.tsx`
- **Props:** `step: number`, `total: number`. Renders `total` dots; active (index+1 === step) is rose `#B84565` 16×4 pill, inactive is `#E8DDD4` 4×4. Colors hardcoded (not token classes). Used for signup/list wizard progress.

### `components/twirl/CornerOrnament.tsx`
- **Props:** `opacity?: number` (default 0.5). Pure decorative SVG (react-native-svg) — nested faint rose arcs + center dot (see §4). Fixed 120×120. No positioning logic — caller must position it.

### `components/cards/ItemCard.tsx`
- **Props:** `item` (`{ id, title, price_per_day, size, occasion, images: string[], profiles?: { full_name, school } }`), `onPress: () => void`.
- **Layout:** width computed `(screenWidth - 40 - 16) / 2` → fixed 2-column responsive grid via `Dimensions.get("window")` (computed once at module load — does NOT respond to rotation/resize). `aspectRatio: 3/4`, `borderRadius: 18`, blush `#F7E4DE` placeholder bg, 0.5px `#E8DDD4` border. Shows first image cover-fit, or a 👗 emoji fallback at 48px. Bottom glass strip (paper @94% alpha): title in italic Cormorant 14px ink, price in JetBrains Mono 11px rose-deep `#B84565`.
- **Smell:** all styling is inline `style={{}}` — no NativeWind classes, no token classes. `size`, `occasion`, `profiles` props are typed but never rendered. `activeOpacity={0.92}` press feedback.

---

## 6. NATIVEWIND v4 + TAILWIND WIRING (exact)

NativeWind v4.2.3 + tailwindcss 3.4.17. The wiring has four required pieces, all present:

1. **Babel** (`babel.config.js`): `babel-preset-expo` is configured with `{ jsxImportSource: "nativewind" }` (so JSX compiles to NativeWind's runtime), AND `"nativewind/babel"` is added as a second preset. Also includes `babel-plugin-module-resolver` (alias `@` → repo root) and `react-native-reanimated/plugin` (MUST be last, and it is — Wordmark depends on reanimated). `api.cache(true)`.

2. **Metro** (`metro.config.js`): wraps Expo's default config with `withNativeWind(config, { input: "./global.css" })` — this tells NativeWind which CSS entry to compile and inject. Minimal, standard.

3. **CSS entry** (`global.css`): the three Tailwind directives `@tailwind base; @tailwind components; @tailwind utilities;` — nothing custom (no `@layer` overrides, no CSS variables).

4. **Import** (`app/_layout.tsx` line 1): `import "../global.css";` is the very first import in the root layout — this is what activates the compiled styles app-wide.

5. **Tailwind config** (`tailwind.config.js`): `content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"]` (scans both dirs), `presets: [require("nativewind/preset")]`, `plugins: []`. Theme extensions only (colors/font/size/radius). **Note the content globs only cover `app/` and `components/`** — any classes used in other top-level dirs (e.g. `hooks/`, `lib/`) would be purged. Fine today since UI lives only in those two dirs.

6. **Types** (`nativewind-env.d.ts`): single line `/// <reference types="nativewind/types" />` — gives `className` prop typing on RN components.

Everything is wired correctly and minimally. No CSS-variable theming, no dark mode (`dark_mode:false` in the orphaned theme confirms intent). No `darkMode` key in tailwind config = no dark variant support.

---

## 7. SUMMARY OF GAPS, UNUSED TOKENS, INCONSISTENCIES

**Unused / dead tokens:**
- Colors never referenced: `twirl-clay`, `twirl-moss`, `twirl-amber` (0 uses); `twirl-gold` (0 class uses); canonical `twirl-ink` & `twirl-ink-2` (0 — superseded by legacy `twirl-text`/`twirl-ink2`); `twirl-rose-deep` (1 class use, rest inline hex).
- The ENTIRE `status.*` palette (8 tokens) is unused — status chips reimplement with off-palette Tailwind defaults.
- ALL `fontFamily` tokens (`font-serif`, `font-mono`, etc.) unused — fonts applied via inline `fontFamily` literals.
- ALL `fontSize` tokens (`text-h2`…`text-mono-xs`) unused — sizes via `text-[Npx]` arbitrary values / inline numbers.
- ALL `borderRadius` tokens (`rounded-card`…`rounded-tabbar`) unused — radii hardcoded inline or via `rounded-xl`.

**Missing primitives (no component exists):**
- **No Card primitive** — `ItemCard` is the only card; generic surface/Card not abstracted (item detail screen hand-rolls `bg-twirl-cream border border-twirl-line rounded-2xl`).
- **No Modal / BottomSheet / Dialog.**
- **No Toast / Snackbar / Alert** primitive.
- **No Badge / Chip / Tag / StatusPill** — despite a full `status.*` palette designed for exactly this.
- **No Avatar** component (profile/avatar upload exists per project notes but no shared primitive).
- **No Typography/Text component** to enforce the type scale — every screen re-specifies fonts inline.
- **No Skeleton/Loading**, **no EmptyState**, **no Divider**, **no IconButton**, **no Select/Picker wrapper** (raw `@react-native-picker/picker`), **no Switch/Checkbox/Radio**, **no Tab/SegmentedControl** primitive.

**Visual inconsistencies / smells:**
- Two parallel naming systems (canonical vs legacy aliases) both live; screens standardized on the legacy names, so canonical names are effectively dead.
- Button `rose` variant uses light rose `#E56A8A` while the brand hero accent everywhere else is deep rose `#B84565` — variant naming implies the brand color but doesn't use it.
- Status colors in rental screens use generic Tailwind emerald/amber/red hexes instead of the designed warm `status.*` palette → status UI looks off-brand vs. the rest.
- Stray `#F472B6` (old `.twirl_theme.json` primary) and Tailwind gray defaults (`#D1D5DB`, `#6B7280`) leak into screens.
- Token system (fonts/sizes/radii) is defined but universally bypassed by inline styles → the config is aspirational documentation, not enforced. High drift risk.
- `ItemCard` width computed once at module load (no resize/rotation response); `Wordmark` calls a hook inside `.map()`.
- `.twirl_theme.json` is an orphaned, contradictory theme file at repo root — should be deleted or reconciled to avoid confusion.

CONNECTIONS: app/_layout.tsx imports global.css to activate NativeWind styles app-wide and loads all 6 font faces before any screen renders; metro.config.js -> global.css via withNativeWind input; global.css -> tailwind.config.js theme tokens via Tailwind directives; tailwind.config.js color tokens (twirl-*) are consumed as className strings in Button.tsx, Input.tsx, and across app/ screens (twirl-paper, twirl-text, twirl-pink, twirl-muted, twirl-line dominate); Font family literals (CormorantGaramond_500Medium_Italic, JetBrainsMono_500Medium, Inter_*) defined in _layout.tsx useFonts are referenced by inline style in Wordmark.tsx and ItemCard.tsx and screens — NOT via the tailwind fontFamily tokens; Brand accent deep rose #B84565 connects Wordmark default color, StepDots active, CornerOrnament strokes, and ItemCard price — but is mostly hardcoded hex, not the twirl-rose-deep token; babel.config.js reanimated plugin enables Wordmark animation; react-native-svg (package.json) powers CornerOrnament; ItemCard depends on the items table shape (title, price_per_day, size, occasion, images, profiles) — links design layer to Supabase data model; Button/Input/StepDots/Wordmark/CornerOrnament/ItemCard are the full reusable inventory consumed by app/(auth)/* signup wizard and app/(tabs)/* screens
GAPS NOTICED: Token system is defined but bypassed: 0 uses of fontFamily tokens (font-serif/mono), fontSize tokens (text-h2..mono-xs), borderRadius tokens (rounded-card..tabbar). Everything is inline literals/arbitrary values — config is aspirational, not enforced.; Entire status.* palette (8 tokens) unused; rental status chips reimplement with off-palette Tailwind emerald/amber/red defaults — off-brand and a missing StatusBadge primitive.; Unused colors: twirl-clay, twirl-moss, twirl-amber, twirl-gold (and canonical twirl-ink/twirl-ink-2 superseded by legacy aliases twirl-text/twirl-ink2).; Dual naming systems (canonical vs legacy aliases) both live; canonical names are effectively dead. The intended migration was never completed.; Missing primitives: no Card, Modal/BottomSheet, Toast/Snackbar, Badge/Chip, Avatar, Typography/Text, Skeleton, EmptyState, Divider, Select wrapper, Switch/Checkbox. Only 6 components exist total.; Button 'rose' variant uses light rose #E56A8A not the brand hero deep rose #B84565 — naming/color mismatch.; Stray off-palette hex leaking into screens: #F472B6 (old .twirl_theme.json), Tailwind grays #D1D5DB/#6B7280, generic status colors.; .twirl_theme.json is an orphaned, contradictory theme file at repo root (different pink palette) not imported by any code — delete or reconcile.; ItemCard width is computed once at module load via Dimensions.get — does not respond to rotation/resize; all styling inline (no tokens).; Wordmark calls useAnimatedStyle hook inside .map() — rules-of-hooks violation, safe only because letter count is constant.; Button label uses utility font-semibold (system font) instead of the loaded Inter_600SemiBold — button text is not actually Inter.; tailwind content globs cover only app/ and components/; classes used elsewhere (hooks/, lib/) would be purged. No darkMode key (light-only by design).

---

### AREA: Database schema (Supabase Postgres) — all 10 tables, RLS, RPCs, rental lifecycle, edge-function dependencies
# Twirl Database Schema — Full Discovery Report (A3)

Source of truth: `/Users/cooperporter/Twirl-Hub/repo/Twirl/supabase/schema.sql` (311 lines, "v2.0 security-hardened"), plus two migrations and three edge functions. The schema file declares 10 tables, 2 extensions, 3 helper functions, storage bucket + policies, and one view. Below is every table fully decomposed, then the ER map, the rental state machine, RPC inventory, and a flagged-issues section cross-checked against `app/`.

---

## EXTENSIONS & HELPER FUNCTIONS

- `create extension if not exists "uuid-ossp"` and `"pgcrypto"`.
- `set_updated_at()` — trigger fn, `language plpgsql`: `new.updated_at = now(); return new`. Attached to profiles, items, rentals (NOT to conversations/messages — those have no updated_at).
- `is_edu_email(email text)` — `language sql immutable`, regex `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.edu$`. Used as a CHECK on `profiles.email`.

---

## TABLE 1: profiles
PK: `id uuid` → `references auth.users on delete cascade`. (Profile is keyed directly to the auth user; deleting the auth user cascades the profile.)

Columns:
- `id uuid` PK, FK→auth.users ON DELETE CASCADE
- `full_name text NOT NULL` CHECK `char_length between 2 and 80`
- `email text` CHECK `is_edu_email(email)` — note: NOT unique, and nullable
- `school text` CHECK `len <= 100`
- `sorority text` CHECK `len <= 80`
- `size text` CHECK `in ('XS','S','M','L','XL','XXL')`
- `year text` CHECK `len <= 10` (added by migration, see below)
- `major text` CHECK `len <= 80` (added by migration)
- `hometown text` CHECK `len <= 80` (added by migration)
- `avatar_url text`
- `bio text` CHECK `len <= 300`
- `is_verified boolean default false`
- `is_suspended boolean default false`
- `rating numeric(3,2) default 0` CHECK `between 0 and 5`
- `total_rentals integer default 0` CHECK `>= 0`
- `total_earnings numeric(10,2) default 0` CHECK `>= 0`
- `push_token text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Indexes: `idx_profiles_school(school)`, `idx_profiles_rating(rating desc)`.
Trigger: `profiles_updated_at` BEFORE UPDATE → `set_updated_at()`.

RLS (enabled):
- `"Public profiles visible"` — SELECT `using (true)`. Every profile row (including email, push_token, total_earnings) is world-readable. See flagged issue.
- `"Users edit own profile"` — UPDATE `using (auth.uid() = id) with check (auth.uid() = id and not is_verified = false)`. The `not is_verified = false` clause is logically `is_verified = true`, intended as "can't self-verify." BUG: this WITH CHECK requires the post-update row to have `is_verified = true`. Since a normal user has `is_verified = false`, any update they attempt (e.g. editing bio) fails the check unless the row is already verified. This effectively blocks all profile self-edits for unverified users. See flagged issue.
- `"Users insert own profile"` — INSERT `with check (auth.uid() = id)`.

Migration `20260511_add_profile_demographics.sql`: `alter table profiles add column if not exists year/major/hometown` with the same CHECKs. Reason documented in-file: `signup2.tsx` upserts these and prod was missing them → signup crash. The base `schema.sql` already lists year/major/hometown, so the live schema and the file are reconciled; migration is the historical fix.

---

## TABLE 2: items
PK: `id uuid default uuid_generate_v4()`.

Columns:
- `id uuid` PK
- `owner_id uuid NOT NULL` FK→profiles(id) ON DELETE CASCADE
- `title text NOT NULL` CHECK `len between 3 and 100`
- `description text` CHECK `len <= 1000`
- `price_per_day numeric(10,2) NOT NULL` CHECK `between 1 and 500`
- `deposit numeric(10,2) default 0` CHECK `between 0 and 2000`
- `size text` CHECK `in ('XS','S','M','L','XL','XXL')`
- `occasion text` (no CHECK — free text)
- `category text` (no CHECK — free text)
- `brand text` CHECK `len <= 80`
- `images text[] default '{}'` CHECK `array_length(images,1) <= 8` (NOTE: `array_length` of an empty array is NULL, so the check passes for `'{}'`; the cap only bites for 1–8 — fine)
- `available boolean default true`
- `view_count integer default 0` CHECK `>= 0`
- `save_count integer default 0` CHECK `>= 0`
- `is_flagged boolean default false`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Indexes: `idx_items_owner(owner_id)`, `idx_items_available(available) where available=true` (partial), `idx_items_occasion(occasion)`, `idx_items_created(created_at desc)`.
Trigger: `items_updated_at` BEFORE UPDATE → `set_updated_at()`.

RLS:
- `"Public items visible"` — SELECT `using (available = true and not is_flagged)`.
- `"Owner sees all items"` — SELECT `using (auth.uid() = owner_id)`. Lets owner see their own unavailable/flagged items.
- `"Owners manage items"` — FOR ALL `using (auth.uid() = owner_id)`. NOTE: a FOR ALL policy with only `using` and no `with check` — for INSERT, Postgres falls back to using `using` as the check, so an owner can only insert rows where `owner_id = auth.uid()`. OK in practice.

---

## TABLE 3: saved_items
PK: `id uuid`. UNIQUE `(user_id, item_id)`.

Columns:
- `id uuid` PK
- `user_id uuid NOT NULL` FK→profiles(id) ON DELETE CASCADE
- `item_id uuid NOT NULL` FK→items(id) ON DELETE CASCADE
- `created_at timestamptz default now()`

Indexes: `idx_saved_user(user_id)`, `idx_saved_item(item_id)`.

RLS:
- `"Users see own saved"` — SELECT `using (auth.uid() = user_id)`.
- `"Users manage saved"` — FOR ALL `using (auth.uid() = user_id)`.

---

## TABLE 4: conversations
PK: `id uuid`. UNIQUE `(user1_id, user2_id, item_id)`.

Columns:
- `id uuid` PK
- `user1_id uuid NOT NULL` FK→profiles(id) — NO on-delete specified → defaults to NO ACTION (RESTRICT-like). Deleting a profile with conversations would fail unless cascaded elsewhere.
- `user2_id uuid NOT NULL` FK→profiles(id) — NO on-delete
- `item_id uuid` FK→items(id) — nullable, NO on-delete
- `last_message text` CHECK `len <= 1000`
- `last_message_at timestamptz`
- `unread_user1 integer default 0` CHECK `>= 0`
- `unread_user2 integer default 0` CHECK `>= 0`
- `created_at timestamptz default now()`

Indexes: `idx_conv_user1(user1_id)`, `idx_conv_user2(user2_id)`.
No updated_at, no trigger.

RLS:
- `"Participants see conversations"` — SELECT `using (auth.uid() = user1_id or auth.uid() = user2_id)`.
- `"Users create conversations"` — INSERT `with check (auth.uid() = user1_id and user1_id <> user2_id)`. Creator must be user1 and cannot DM themselves.
- `"Participants update"` — UPDATE `using (auth.uid() = user1_id or auth.uid() = user2_id)` — no WITH CHECK, so either participant can mutate any column (including the other side's unread counter, which is exactly what the app does).

The UNIQUE `(user1_id, user2_id, item_id)` is order-sensitive: (A,B,item) and (B,A,item) are distinct rows, so two people can create duplicate conversations about the same item. Also NULL item_id: Postgres treats NULLs as distinct in UNIQUE, so unlimited (A,B,NULL) duplicates are allowed.

---

## TABLE 5: messages
PK: `id uuid`.

Columns:
- `id uuid` PK
- `conversation_id uuid NOT NULL` FK→conversations(id) ON DELETE CASCADE
- `sender_id uuid NOT NULL` FK→profiles(id) — NO on-delete
- `content text NOT NULL` CHECK `len between 1 and 2000`
- `is_deleted boolean default false`
- `created_at timestamptz default now()`

Index: `idx_messages_conv(conversation_id, created_at desc)` — composite, supports the conversation-thread query.
No updated_at/trigger. No `is_read`/`read_at` column — read state is tracked only via the conversation-level `unread_user1/2` counters.

RLS:
- `"Participants see messages"` — SELECT `using (auth.uid() in (select user1_id ... union select user2_id from conversations where id = conversation_id))`. Subquery per row — correlated; relies on conversations PK lookup, acceptable.
- `"Participants send messages"` — INSERT `with check (auth.uid() = sender_id and auth.uid() in (... same subquery ...))`. Sender must be a participant and the row's sender_id must be them.
- `"Sender soft-deletes"` — UPDATE `using (auth.uid() = sender_id)`. Comment says "Soft delete only — no hard deletes" but there is NO delete-blocking policy and FOR ALL is not used; since RLS denies by default, absence of a DELETE policy already blocks hard deletes. The update policy lets a sender flip `is_deleted` (or edit `content`, since no WITH CHECK constrains columns).

---

## TABLE 6: rentals (core transactional table)
PK: `id uuid`.

Columns:
- `id uuid` PK
- `item_id uuid NOT NULL` FK→items(id) — NO on-delete (deleting an item with rentals will RESTRICT)
- `renter_id uuid NOT NULL` FK→profiles(id) — NO on-delete
- `owner_id uuid NOT NULL` FK→profiles(id) — NO on-delete
- `conversation_id uuid` FK→conversations(id) — nullable, NO on-delete
- `start_date date NOT NULL`
- `end_date date NOT NULL`
- `total_price numeric(10,2) NOT NULL` CHECK `> 0`
- `commission_amount numeric(10,2)` CHECK `>= 0` (nullable)
- `deposit_amount numeric(10,2)` CHECK `>= 0` (nullable)
- `status text default 'pending'` CHECK `in ('pending','approved','paid','active','completed','cancelled','disputed')`
- `stripe_payment_intent text` (rental charge PI id; manual-capture)
- `stripe_deposit_intent text` (deposit hold PI id; manual-capture)
- `contract_agreed boolean default false`
- `contract_agreed_at timestamptz` (declared but NEVER written by app — see flagged)
- `return_confirmed_at timestamptz` (declared but NEVER written — release-deposit only sets status='completed')
- `deposit_released_at timestamptz` (declared but NEVER written)
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- TABLE CHECK `end_date > start_date`
- TABLE CHECK `renter_id <> owner_id`

Indexes: `idx_rentals_renter(renter_id)`, `idx_rentals_owner(owner_id)`, `idx_rentals_status(status)`, `idx_rentals_dates(start_date, end_date)`.
Trigger: `rentals_updated_at` BEFORE UPDATE → `set_updated_at()`.

RLS:
- `"Rental parties see rentals"` — SELECT `using (auth.uid() = renter_id or auth.uid() = owner_id)`.
- `"Renters create rentals"` — INSERT `with check (auth.uid() = renter_id and renter_id <> owner_id)`.
- `"Rental parties update rentals"` — UPDATE `using (auth.uid() = renter_id or auth.uid() = owner_id)` — no WITH CHECK. Either party can update ANY column to ANY value, including `status`, `total_price`, `commission_amount`, stripe intent ids. The app drives status from the client (`rentals.tsx` line 60 `update({ status })`), so a malicious renter could set their own rental to `completed` or `active`, or rewrite `total_price`. See flagged issue (financial integrity).

---

## TABLE 7: rental_contracts (immutable audit log)
PK: `id uuid`.

Columns:
- `id uuid` PK
- `rental_id uuid NOT NULL` FK→rentals(id) ON DELETE CASCADE
- `renter_id uuid NOT NULL` FK→profiles(id) — NO on-delete
- `owner_id uuid NOT NULL` FK→profiles(id) — NO on-delete
- `agreed_at timestamptz NOT NULL default now()`
- `deposit_intent_id text`
- `terms_version text NOT NULL default '2.0'`
- `ip_address inet`
- `user_agent text` CHECK `len <= 500`
- `created_at timestamptz default now()`

Index: `idx_contracts_rental(rental_id)`.
No updated_at/trigger.

RLS:
- `"Contract parties see contracts"` — SELECT `using (auth.uid() = renter_id or auth.uid() = owner_id)`.
- `"Renters create contracts"` — INSERT `with check (auth.uid() = renter_id)`. Comment: "No updates or deletes — immutable audit log" (enforced by absence of UPDATE/DELETE policies under RLS-default-deny).

Note: the contract is supposed to be the legal audit record, but the app inserts it client-side with `terms_version: "1.0"` (`app/contract/[id].tsx:62`) while the schema default is `'2.0'` — version mismatch. The app also never populates `ip_address`/`user_agent`, so the "audit" fields are always NULL. `deposit_intent_id` is derived client-side by string-splitting a client_secret, which is the PI id prefix — fragile.

---

## TABLE 8: reviews
PK: `id uuid`. UNIQUE on `rental_id` (one review per rental).

Columns:
- `id uuid` PK
- `rental_id uuid NOT NULL UNIQUE` FK→rentals(id) ON DELETE CASCADE
- `reviewer_id uuid NOT NULL` FK→profiles(id) — NO on-delete
- `reviewee_id uuid NOT NULL` FK→profiles(id) — NO on-delete
- `stars integer NOT NULL` CHECK `between 1 and 5`
- `body text` CHECK `len <= 500`
- `created_at timestamptz default now()`
- TABLE CHECK `reviewer_id <> reviewee_id`

Index: `idx_reviews_reviewee(reviewee_id)`.

RLS:
- `"Reviews are public"` — SELECT `using (true)`.
- `"Reviewers create reviews"` — INSERT `with check (auth.uid() = reviewer_id)`. NOTE: no check that the reviewer was actually a party to the rental — any user can review any rental_id they can name (UNIQUE only stops a second review). Since the unique is on rental_id alone (not per-reviewer), only ONE review can ever exist per rental — meaning renter and owner cannot both review each other. See flagged issue.

---

## TABLE 9: reports (content moderation)
PK: `id uuid`.

Columns:
- `id uuid` PK
- `reporter_id uuid NOT NULL` FK→profiles(id) — NO on-delete
- `item_id uuid` FK→items(id) — nullable, NO on-delete
- `user_id uuid` FK→profiles(id) — nullable, NO on-delete (the reported user)
- `reason text NOT NULL` CHECK `in ('inappropriate','counterfeit','scam','spam','other')`
- `details text` CHECK `len <= 500`
- `resolved boolean default false`
- `created_at timestamptz default now()`

No indexes (no index on reporter_id, item_id, user_id, or resolved).

RLS:
- `"Users create reports"` — INSERT `with check (auth.uid() = reporter_id)`.
- `"Users see own reports"` — SELECT `using (auth.uid() = reporter_id)`. NOTE: there is no admin/moderator role policy, so NOBODY (except via service role) can read others' reports — moderation must happen out-of-band via the service key.

---

## TABLE 10: blocked_users
PK: `id uuid`. UNIQUE `(blocker_id, blocked_id)`.

Columns:
- `id uuid` PK
- `blocker_id uuid NOT NULL` FK→profiles(id) ON DELETE CASCADE
- `blocked_id uuid NOT NULL` FK→profiles(id) ON DELETE CASCADE
- `created_at timestamptz default now()`
- TABLE CHECK `blocker_id <> blocked_id`

No indexes beyond the PK and the implicit unique-constraint index on (blocker_id, blocked_id).

RLS:
- `"Users manage blocks"` — FOR ALL `using (auth.uid() = blocker_id)`. Block list is private to the blocker; nothing in conversations/messages/items policies references blocked_users, so blocking has NO enforcement effect on messaging or visibility at the DB layer (it's UI-only at best). See flagged issue.

---

## STORAGE
Bucket `item-images`: public, 5 MB limit, mime `jpeg/png/webp/heic`, inserted `on conflict do nothing`.
Storage policies:
- `"Public read item images"` — SELECT `using (bucket_id='item-images')`.
- `"Auth users upload item images"` — INSERT `with check (bucket_id='item-images' and auth.role()='authenticated' and (storage.foldername(name))[1] = auth.uid()::text)` — files must be under a folder named with the uploader's uid.
- `"Owners delete item images"` — DELETE `using (bucket_id='item-images' and auth.uid()::text = (storage.foldername(name))[1])`.
Note: avatars are uploaded via `uploadAvatar` in signup but there is NO dedicated avatars bucket in schema — avatars likely also go into `item-images` or another bucket created out-of-band. Worth confirming.

---

## VIEW
`recent_rentals_by_user` — `select renter_id, count(*) from rentals where created_at > now() - interval '24 hours' group by renter_id`. Intended for rate-limiting in edge functions (comment says reject if count > threshold). Not currently referenced by any edge function read (create-payment-intent does not consult it).

---

## RPC / POSTGRES FUNCTIONS INVENTORY
1. `set_updated_at()` — trigger fn (above).
2. `is_edu_email(text) -> boolean` — immutable validator (above).
3. `increment_owner_earnings(p_owner_id uuid, p_amount numeric) -> void` — from `20260524_release_deposit_rpc.sql`, `security definer`, `plpgsql`. Body: `update profiles set total_earnings = total_earnings + p_amount, total_rentals = total_rentals + 1 where id = p_owner_id`. SECURITY DEFINER lets it bypass the profiles RLS (necessary since "Users edit own profile" only allows self-update and the buggy is_verified check would block it anyway). Called by `release-deposit/index.ts:82`. NOTE: the migration filename references `release_deposit_rpc` but the function it defines is `increment_owner_earnings` — there is NO Postgres function literally named `release_deposit`; the deposit release is performed by the edge function `release-deposit`, not an RPC. The `total_rentals` counter is incremented only on the OWNER, never the renter, on completion.

---

## ENTITY-RELATIONSHIP MAP
```
auth.users 1──1 profiles (id PK = auth uid, ON DELETE CASCADE)

profiles 1──* items            (items.owner_id, CASCADE)
profiles 1──* saved_items      (saved_items.user_id, CASCADE)
items    1──* saved_items      (saved_items.item_id, CASCADE)   [UNIQUE(user_id,item_id)]

profiles 1──* conversations    (user1_id / user2_id, NO ACTION)
items    0/1─* conversations   (conversations.item_id, NO ACTION, nullable)
conversations 1──* messages    (messages.conversation_id, CASCADE)
profiles 1──* messages         (messages.sender_id, NO ACTION)

items    1──* rentals          (rentals.item_id, NO ACTION)
profiles 1──* rentals (renter) (rentals.renter_id, NO ACTION)
profiles 1──* rentals (owner)  (rentals.owner_id, NO ACTION)
conversations 0/1─* rentals    (rentals.conversation_id, NO ACTION, nullable)

rentals  1──* rental_contracts (rental_contracts.rental_id, CASCADE)
rentals  1──0/1 reviews        (reviews.rental_id, CASCADE, UNIQUE)
profiles 1──* reviews (×2: reviewer_id, reviewee_id, NO ACTION)

profiles 1──* reports (reporter), items/profiles target (all nullable, NO ACTION)
profiles *──* blocked_users    (blocker_id/blocked_id, CASCADE, UNIQUE pair)
```
Key takeaway: profiles cascade-deletes everything they OWN (items, saved, blocks) but rentals/conversations/messages/reviews use NO ACTION on the profile FK — so a profile that has ever transacted CANNOT be deleted (the cascade from auth.users → profiles would fail because rentals.renter_id/owner_id RESTRICT it). This is a hard deletion blocker. See flagged.

---

## RENTAL LIFECYCLE STATE MACHINE
Statuses (CHECK enum): `pending → approved → paid → active → completed`, plus terminal `cancelled` and `disputed`. Driven from the client; transitions observed in `app/`:

1. `pending` — created by renter in `app/item/[id].tsx:60` on "rent request". Sets total_price (=subtotal + 15% fee), commission_amount (fee), deposit_amount (= item.deposit), conversation_id. Also inserts a conversation + first message.
2. `pending → approved` — owner taps APPROVE (`rentals.tsx:83`, `updateStatus(id,'approved')`). UI comment says "they'll receive a payment link" but no notification mechanism exists in schema beyond push_token.
3. `pending → cancelled` — owner taps DECLINE (`rentals.tsx:91`).
4. → `paid` — renter agrees + pays in `app/contract/[id].tsx:63`: inserts rental_contracts row, then `update({ status:'paid', contract_agreed:true })`. Payment: `create-payment-intent` creates a MANUAL-CAPTURE rental PaymentIntent and a separate MANUAL-CAPTURE deposit PaymentIntent (hold), storing `stripe_payment_intent` and `stripe_deposit_intent`. NOTE: contract flow does NOT require status to be 'approved' first — a renter can pay straight from 'pending'; create-payment-intent even REQUIRES status='pending' (line 42 `.eq("status","pending")`), so the 'approved' step is effectively bypassed/contradictory. See flagged.
5. `paid → active` — owner taps CONFIRM HANDOFF (`rentals.tsx:99`). Item physically handed over.
6. `active → completed` — owner taps CONFIRM RETURN (`rentals.tsx`, calls `release-deposit` edge fn). The edge fn: verifies owner+status='active', CAPTURES the rental PI (actually charges renter), CANCELS the deposit hold if `requires_capture` (or REFUNDS if already captured), sets `status='completed'`, then calls `increment_owner_earnings(owner_id, total_price - commission_amount)`.
7. `disputed` — in the enum and has UI styling (`rentals.tsx:140`) but NO transition path writes it anywhere in the app. Dead state currently.

Columns tracking money/lifecycle:
- Commission: `rentals.commission_amount` (computed client-side as `round(subtotal*0.15,2)` via `COMMISSION_RATE=0.15` in `lib/constants.ts:37`). Owner payout = `total_price - commission_amount`.
- Deposit: `rentals.deposit_amount` (mirror of `items.deposit`), held via `stripe_deposit_intent`. The dedicated columns `return_confirmed_at`, `deposit_released_at`, `contract_agreed_at` exist to timestamp these milestones but are NEVER populated by the code — release-deposit only flips status. So the schema models the lifecycle more richly than the app actually records.
- Payout: handled by Stripe Connect (`create-connect-account` makes an Express account with daily payout schedule) keyed off `profiles.stripe_account_id` — but that column is MISSING from schema (below). The release-deposit fn does NOT actually transfer funds to the owner's connect account; it only captures the platform-side PI and bumps `total_earnings`. There is no `stripe.transfers.create` or `transfer_data` / `application_fee_amount` anywhere — so the 15% commission is computed and stored but NEVER routed via Connect. The capture goes to the PLATFORM account, not split to the owner. Major gap.

---

## FLAGGED SCHEMA-LEVEL ISSUES (cross-checked vs app/)

### A. Columns the frontend/edge functions expect but the schema LACKS
- **`profiles.stripe_account_id` — MISSING.** Read & written by `supabase/functions/create-connect-account/index.ts` (lines 35, 39, 62) AND read by `app/(tabs)/profile.tsx:18,91` (typed `stripe_account_id: string | null`). It is NOT in schema.sql and NOT in any migration. If the column was never added to prod, the Connect onboarding update at line 62 silently fails (Supabase update of unknown column → error) and profile.tsx's "set up payouts" gating breaks. This is the single most important schema gap — it blocks the entire payout path. Needs a migration: `alter table profiles add column stripe_account_id text;` (consider UNIQUE).

### B. RLS correctness bugs
- **profiles "Users edit own profile" WITH CHECK is wrong.** `with check (auth.uid() = id and not is_verified = false)` ≡ requires `is_verified = true` after update. Unverified users (the default) cannot update their own profile at all — bio edits, avatar, push_token updates all fail. The intent ("can't self-verify") should be `is_verified = (select is_verified from profiles where id = auth.uid())` or simply omit is_verified from the check and block it via a trigger/grant. As written it is a functional bug for the majority of users.
- **rentals "Rental parties update rentals" has no WITH CHECK.** Either party can set any column to any value. A renter can self-promote status to `completed`/`active`, or rewrite `total_price`/`commission_amount`/`stripe_*`. Status transitions and money fields must be guarded (ideally moved server-side to edge functions / RPCs with column-level guards, or a WITH CHECK + a trigger that validates legal transitions). Financial integrity risk.
- **reviews INSERT policy doesn't verify the reviewer was in the rental**, and the UNIQUE is on `rental_id` alone, so only one review per rental can ever exist (renter and owner can't both review). Likely want UNIQUE(rental_id, reviewer_id) plus a check tying reviewer/reviewee to that rental's parties.
- **blocked_users has zero enforcement.** No conversations/messages/items policy consults it, so a "block" does nothing at the DB layer.
- **reports unreadable by moderators.** Only the reporter can SELECT; no admin role policy. Moderation requires service-role tooling that doesn't exist yet.

### C. Missing indexes (on FK / filter columns)
- `messages.sender_id` — FK, no index.
- `conversations.item_id` — FK, no index.
- `rentals.item_id`, `rentals.conversation_id` — FK, no indexes (renter/owner/status/dates are indexed, but not item_id; item availability checks by date will seq-scan).
- `rental_contracts.renter_id` / `owner_id` — no index (only rental_id indexed).
- `reviews.reviewer_id` and `reviews.rental_id` — reviewee indexed; reviewer not (the `reviewer_id <> reviewee_id` and "my reviews written" queries unindexed). rental_id has the unique-constraint index so that's covered.
- `reports.reporter_id`, `reports.item_id`, `reports.user_id`, `reports.resolved` — none indexed.
- `saved_items` — covered.
Unindexed FKs also slow cascade deletes and risk lock escalation.

### D. Constraint / integrity gaps
- **No date-overlap / double-booking prevention on rentals.** Nothing stops two `paid`/`active` rentals for the same item_id over overlapping dates. `items.available` is a single boolean, not a calendar, and the app never flips it on rental. An item can be rented to multiple people for the same week.
- **`profiles.email` not UNIQUE** and nullable despite being an identity field; relies on `is_edu_email` only.
- **commission/deposit computed client-side** (`item/[id].tsx`, hardcoded `0.15` also duplicated literally in `contract/[id].tsx:119` as `* 0.15`). No DB-side enforcement that `commission_amount = round(0.15 * (total_price/1.15))` — a tampered client can submit any commission. Should be a generated column or trigger.
- **`approved` status is dead/contradictory.** Owner can move pending→approved, but `create-payment-intent` only accepts status='pending', so once approved the renter cannot pay. Either the approve step or the edge-function filter is wrong.
- **`disputed` status is unreachable** — defined + styled, never written.
- **No NOT NULL on `rentals.deposit_amount`/`commission_amount`** — release-deposit defaults them to 0 with `?? 0`, masking nulls.

### E. Denormalization / drift
- Counter columns `items.view_count`, `items.save_count`, `profiles.total_rentals`, `profiles.total_earnings`, `conversations.unread_user1/2` are all maintained ad-hoc (or not at all). `unread_user*` is incremented client-side via read-modify-write in `conversation/[id].tsx:121-131` (race-prone, not atomic; no trigger). `save_count`/`view_count` have no code that increments them (grep found none) → always 0. `total_rentals` increments only the owner in `increment_owner_earnings`, never the renter, so a profile's `total_rentals` reflects items lent, not rented — semantically ambiguous vs the "rentals" stat shown in profile.tsx:79.
- `rental_contracts.terms_version` defaults `'2.0'` but app inserts `'1.0'` (`contract/[id].tsx:62`) — version drift in the legal audit log. `ip_address`/`user_agent` audit fields never populated.

### F. Cascade / deletion model
- A profile that has ANY rental/conversation/message/review cannot be deleted because those FKs use NO ACTION (RESTRICT). Since `profiles.id` cascades from `auth.users`, deleting an auth user with transaction history will FAIL. GDPR/account-deletion will break. Decide on SET NULL vs anonymization for these FKs.

---

## SUMMARY OF MOST CRITICAL ITEMS
1. `profiles.stripe_account_id` missing from schema — payout path broken (P0).
2. Commission computed/stored but never routed through Stripe Connect; release-deposit captures to platform only — owners never get paid the 85% via Connect (P0 business logic, edge-fn level).
3. profiles UPDATE RLS blocks all self-edits for unverified users (P0 UX bug).
4. rentals UPDATE RLS allows clients to rewrite status/money (P0 security/financial).
5. No double-booking prevention; `available` never toggled (P1).
6. `approved` vs create-payment-intent `status='pending'` filter contradiction (P1 flow break).
7. Missing FK/filter indexes (messages.sender_id, conversations.item_id, rentals.item_id, reports.*, rental_contracts parties) (P2 perf).

CONNECTIONS: profiles.id is a 1:1 FK to auth.users (CASCADE) — every business table ultimately roots at the auth user via profiles; create-connect-account writes profiles.stripe_account_id, profile.tsx reads it, but schema.sql never defines the column — three-way dependency on a missing field; release-deposit edge fn -> increment_owner_earnings RPC (20260524 migration) -> profiles.total_earnings/total_rentals; rental money fields (total_price, commission_amount, deposit_amount) are computed in item/[id].tsx using lib/constants.ts COMMISSION_RATE and only validated by CHECK >=0, never recomputed server-side; rentals.stripe_payment_intent / stripe_deposit_intent are set by create-payment-intent and consumed by release-deposit; manual-capture lifecycle ties Stripe state to rental.status; conversations.unread_user1/2 are maintained by conversation/[id].tsx and read by messages.tsx (viewerIsUser1 ? unread_user1 : unread_user2) — no DB trigger, race-prone; rental.status enum is the spine connecting item/[id].tsx (pending), contract/[id].tsx (paid), rentals.tsx (approved/cancelled/active), and release-deposit (completed)
GAPS NOTICED: profiles.stripe_account_id referenced by edge fn + frontend but absent from schema and all migrations — likely a silent prod failure or an out-of-band column not captured in version control; The 15% commission is stored on rentals but NEVER routed through Stripe Connect (no transfer_data/application_fee/transfers.create anywhere) — release-deposit captures the full charge to the platform account; owner payout mechanism is incomplete; profiles UPDATE RLS WITH CHECK (not is_verified = false) blocks all profile self-edits for unverified users — appears to be an unintended logic bug; rentals UPDATE RLS has no WITH CHECK, letting either party rewrite status and money columns client-side — needs server-side guarding; No double-booking / date-overlap constraint on rentals; items.available is a single boolean and is never toggled when an item is rented; create-payment-intent requires status='pending' while rentals.tsx adds an 'approved' step — the two contradict, leaving the approved->paid path unusable; Timestamp columns return_confirmed_at, deposit_released_at, contract_agreed_at are declared but never written by any code; reviews UNIQUE(rental_id) allows only one review per rental and INSERT policy doesn't tie reviewer to the rental parties; blocked_users has no enforcement in any other table's RLS; reports table has no index and no moderator-readable policy; no admin role exists; Missing indexes on several FK columns (messages.sender_id, conversations.item_id, rentals.item_id, rental_contracts.renter_id/owner_id, all of reports.*); rental_contracts terms_version default '2.0' vs app-inserted '1.0'; ip_address/user_agent audit fields never populated; save_count/view_count on items have no incrementing code path anywhere — always 0; NO ACTION FKs from rentals/conversations/messages/reviews to profiles will block auth-user (and thus profile) deletion for any user with history; No dedicated avatars storage bucket in schema despite uploadAvatar in signup — confirm where avatars are stored

---

### AREA: Payments / Money Flow — Stripe Connect, Payment Intents, Deposit Release (Edge Functions + frontend callers)
# Twirl Money Flow — Complete End-to-End Analysis

This documents the full payment system: Stripe Express Connect onboarding, payment intent creation, and deposit release/payout. There are 3 edge functions and 4 frontend callers. **The headline finding: the system is NOT a real marketplace payment system. There are no destination/transfer charges, no application fees, and money never actually reaches owners through Stripe. The "85% payout" exists only as a number written into the app's own `profiles.total_earnings` column — it is bookkeeping, not money movement.**

---

## 1. COMMISSION MATH (where amounts originate)

`lib/constants.ts:37` — `export const COMMISSION_RATE = 0.15; // 15%`

The amount math happens entirely on the **client** in `app/item/[id].tsx`:
- `app/item/[id].tsx:43` — `days = Math.max(1, Math.ceil((endDate - startDate) / 86400000))`
- `:44` — `subtotal = (item.price_per_day ?? 0) * days`
- `:45` — `fee = Math.round(subtotal * COMMISSION_RATE * 100) / 100` (15% service fee, rounded to cents)
- `:46` — `total = subtotal + fee`

**Critical structural fact: the 15% commission is ADDED ON TOP of subtotal and charged to the RENTER.** The renter pays `subtotal + 15%`. So `total_price` already includes Twirl's cut. The owner is supposed to receive `subtotal` (the full rental fee), and Twirl keeps the 15% surcharge. This is the opposite of the more common "owner posts price, platform deducts 15%" model.

On rent request, `app/item/[id].tsx:60-71` inserts the `rentals` row with client-supplied values:
```
total_price: total,            // subtotal + 15%
commission_amount: fee,        // the 15%
deposit_amount: item.deposit,  // from the item listing
status: "pending"
```
**These money fields are written directly by the client with no server validation.** (Trust boundary issue — see Section 7.)

---

## 2. STRIPE EXPRESS CONNECT ONBOARDING (create-connect-account)

File: `supabase/functions/create-connect-account/index.ts`

**Caller:** `app/(tabs)/profile.tsx:34` `setupPayouts()` — fetches `${EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-connect-account`, POST, Bearer access_token, no body. On success, opens `url` via `Linking.openURL` (the hosted Stripe onboarding flow). The "set up payouts" CTA only renders when `!profile?.stripe_account_id` (`profile.tsx:91`).

**Inputs:** none (body ignored). Auth from `Authorization` header only.

**Auth/JWT:** `:24-30` — reads `Authorization` header, strips `Bearer `, calls `supabase.auth.getUser(token)`. Rejects with 401 if missing or invalid. Uses a module-level service-role client (`SUPABASE_SERVICE_ROLE_KEY`).

**DB reads:** `:33-37` — selects `stripe_account_id, full_name, email` from `profiles` where `id = user.id`.

**Stripe calls:**
1. If no existing `stripe_account_id`: `stripe.accounts.create({ type: "express", email, metadata: {user_id}, capabilities: { card_payments: requested, transfers: requested }, settings: { payouts: { schedule: { interval: "daily" } } } })` (`:43-56`).
2. `stripe.accountLinks.create({ account, refresh_url: "https://twirl.rentals/connect/refresh", return_url: "https://twirl.rentals/connect/return", type: "account_onboarding" })` (`:67-72`) — always generated fresh (links expire in minutes).

**DB writes:** `:60-63` — `profiles.update({ stripe_account_id })` where `id = user.id` (only on first creation).

**Returns:** `{ url: accountLink.url, account_id: accountId }`.

**Error handling:** try/catch → `console.error` + `json({error}, 500)`.

**CORS:** OPTIONS preflight at `:14-21` returns `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Headers: authorization, content-type`. The `json()` helper sets `Access-Control-Allow-Origin: *` (note: it omits `Allow-Headers` on the JSON responses here, unlike release-deposit).

**Observation:** the onboarding `return_url`/`refresh_url` point to `https://twirl.rentals/connect/...` — web URLs, not a deep link back into the Expo app. After bank setup the user lands on a website page, not the app. There is no webhook to confirm `charges_enabled`/`payouts_enabled`, so the app never knows whether onboarding actually completed; it only knows an account ID exists.

---

## 3. PAYMENT INTENT CREATION (create-payment-intent)

File: `supabase/functions/create-payment-intent/index.ts`

**Caller:** `app/contract/[id].tsx:48-69` `handleAgreeAndPay()`:
- `:52` fetch `${EXPO_PUBLIC_API_URL}/create-payment-intent` (note: uses `EXPO_PUBLIC_API_URL` with NO `/functions/v1` prefix — different env var convention than the other two callers).
- `:55` body: `{ rental_id: rental.id, amount: Math.round(rental.total_price * 100), deposit: Math.round(rental.items.deposit * 100) }` — amounts in cents, **client-supplied**.
- `:57` reads back `paymentIntentClientSecret, depositIntentClientSecret`.
- `:58` `initPaymentSheet({ paymentIntentClientSecret, ... })` — **only the RENTAL intent is put in the payment sheet. The deposit client secret is NEVER presented/confirmed** (see Section 7).
- `:60` `presentPaymentSheet()`.
- `:62` inserts `rental_contracts` row with `deposit_intent_id: depositIntentClientSecret?.split("_secret")[0]` (extracts the PI id from the client secret), `terms_version: "1.0"`.
- `:63` `rentals.update({ status: "paid", contract_agreed: true })`.

**Inputs:** `rental_id`, `amount` (cents), `deposit` (cents). `:34` rejects if `!rental_id || !amount` (400). Note `deposit` is optional and only used if `deposit > 0`.

**Auth/JWT:** `:25-31` — same pattern (Bearer → `getUser`). 401 on failure.

**DB reads:** `:37-43` — selects `rentals` row matching `id = rental_id AND renter_id = user.id AND status = "pending"`. 404 if not found. **Good:** this scopes the action to the authenticated renter and to a pending rental. **Bad:** it does NOT compare the client-supplied `amount`/`deposit` against `rental.total_price`/`rental.deposit_amount` even though it selects those columns. The amounts charged are taken verbatim from the request body, not from the DB.

**Stripe calls:**
1. `:48-53` rental PI: `paymentIntents.create({ amount, currency: "usd", capture_method: "manual", metadata: { rental_id, type: "rental", user_id } })`. **Manual capture** = authorize/hold now, capture later (at return). 
2. `:58-63` deposit PI (only if `deposit > 0`): `paymentIntents.create({ amount: deposit, currency, capture_method: "manual", metadata: { rental_id, type: "deposit", user_id } })`.

**No `application_fee_amount`, no `transfer_data.destination`, no `on_behalf_of`.** These are plain platform charges to Twirl's own Stripe balance. There is no connection between these PaymentIntents and any owner's Connect account. So:
- The owner's `stripe_account_id` is never read or used here.
- Money charged stays in the Twirl platform balance.
- The 15% "commission" is not enforced at the Stripe layer at all — it's just baked into the gross amount.

**DB writes:**
- `:66-69` if deposit: `rentals.update({ stripe_deposit_intent: depositIntent.id })`.
- `:73-76` `rentals.update({ stripe_payment_intent: paymentIntent.id })`.

**Returns:** `{ paymentIntentClientSecret, depositIntentClientSecret }`.

**Error handling / CORS:** same try/catch 500 pattern; OPTIONS returns `*` origin + `authorization, content-type` headers.

---

## 4. DEPOSIT RELEASE / PAYOUT (release-deposit)

File: `supabase/functions/release-deposit/index.ts`

**Caller:** `app/(tabs)/rentals.tsx:104-131` `handleConfirmReturn()`, triggered by the owner's "CONFIRM RETURN & RELEASE DEPOSIT" button which only shows on the **lending** tab when `rental.status === "active"` (`rentals.tsx:186-195`).
- `:113` fetch `${EXPO_PUBLIC_API_URL ?? EXPO_PUBLIC_SUPABASE_URL}/functions/v1/release-deposit` (fallback chain — yet another env var pattern), Bearer token, body `{ rental_id }`.
- On non-ok response throws `body.error`.

**Inputs:** `rental_id` only. `:28` rejects if missing (400).

**Auth/JWT:** `:19-25` — Bearer → `getUser`, 401 on failure.

**DB reads:** `:31-37` — selects rental matching `id = rental_id AND owner_id = user.id AND status = "active"`. 404 otherwise. **So only the OWNER can trigger this, and only on an active rental.** Selected fields: `owner_id, renter_id, status, total_price, commission_amount, stripe_payment_intent, stripe_deposit_intent`.

**Stripe calls:**
1. **Capture rental** `:44-53` — if `stripe_payment_intent` exists: `paymentIntents.capture(...)`. This is the moment the renter is *actually charged* for the rental (it was only authorized at contract time). "already been captured" errors are swallowed as success; any other capture error is pushed to `errors[]`.
2. **Release deposit** `:56-68` — if `stripe_deposit_intent` exists: `paymentIntents.retrieve(...)`; if status `requires_capture` → `paymentIntents.cancel(...)` (releases the auth hold); if status `succeeded` → `refunds.create({ payment_intent })` (full refund). Other statuses → no-op. Errors pushed to `errors[]`.

If `errors.length > 0` → returns `{error}, 500` **before** marking the rental complete or crediting earnings (`:70-72`). Good — a partial failure won't silently book earnings.

**DB writes:**
- `:75-78` `rentals.update({ status: "completed" })`.
- `:82-85` **the "85% payout":** `ownerEarnings = (rental.total_price ?? 0) - (rental.commission_amount ?? 0)`, then `supabase.rpc("increment_owner_earnings", { p_owner_id, p_amount: ownerEarnings })`.

**The RPC** (`supabase/migrations/20260524_release_deposit_rpc.sql`):
```sql
create or replace function increment_owner_earnings(p_owner_id uuid, p_amount numeric)
returns void language plpgsql security definer as $$
begin
  update profiles
  set total_earnings = total_earnings + p_amount,
      total_rentals  = total_rentals + 1
  where id = p_owner_id;
end; $$;
```
`security definer` — runs with the function-owner's privileges. It is called from a service-role context so RLS is bypassed regardless. No guard preventing it from being called repeatedly with arbitrary amounts (only the edge function gates who calls it).

**The "85%" is a misnomer.** Because `commission_amount` = 15% of *subtotal* (not 15% of `total_price`), and `total_price` = subtotal + 15%, the math gives:
- `ownerEarnings = total_price - commission_amount = (subtotal + 0.15·subtotal) − 0.15·subtotal = subtotal`.
- So the owner is credited the **full subtotal (100% of the rental fee)**, NOT 85% of anything. The renter's 15% surcharge is what Twirl keeps. The CLAUDE.md / memory claim of "85% payout logic verified" is inaccurate to what this code does — and regardless, **`total_earnings` is just a displayed counter on `profiles` (shown in `profile.tsx:80` "earned $X"). No Stripe transfer or payout to the owner's Connect account ever occurs.**

**Error handling / CORS:** try/catch 500; OPTIONS at `:14` returns `json(null,200)`. The `json()` helper here DOES include `Access-Control-Allow-Headers: authorization, content-type` (differs from the other two functions whose JSON helper omits it).

---

## 5. FULL LIFECYCLE (state machine)

1. **pending** — renter creates rental (`item/[id].tsx`). Money fields written by client.
2. (owner approves → **approved**) — `rentals.tsx:80-86` plain status update, no payment. NOTE: contract/payment requires status `pending` (`create-payment-intent` filters `status = "pending"`). The renter pays via contract screen which sets **paid**. The "approved" path and the "pending→pay" path are not cleanly reconciled — a renter can pay while pending; approval is a separate owner action that doesn't gate payment.
3. **paid** — contract agreed, both PaymentIntents created+authorized (manual capture, money only HELD), `rental_contracts` row inserted.
4. (owner confirms handoff → **active**) — `rentals.tsx:96-102` plain status update.
5. **completed** — owner confirms return → `release-deposit`: captures rental PI (renter charged), releases/refunds deposit PI, credits `total_earnings`.
- **cancelled** — decline path.
- **disputed** — status color exists (`rentals.tsx:140`) but no code path sets it; the contract's "Twirl as binding arbitrator" / damage-claim language has no backing implementation.

---

## 6. CONFIG / ENV INCONSISTENCIES

- Three different base-URL conventions across callers:
  - `profile.tsx`: `EXPO_PUBLIC_SUPABASE_URL` + `/functions/v1/...`
  - `contract/[id].tsx`: `EXPO_PUBLIC_API_URL` + `/...` (NO `/functions/v1`)
  - `rentals.tsx`: `EXPO_PUBLIC_API_URL ?? EXPO_PUBLIC_SUPABASE_URL` + `/functions/v1/...`
  If `EXPO_PUBLIC_API_URL` is unset, `contract` payment breaks (fetch to `undefined/create-payment-intent`); `rentals` falls back to SUPABASE_URL. These must be configured carefully or payment silently fails.
- Stripe API pinned to `2024-04-10`, stripe-deno `stripe@14`, supabase-js `@2`, all via esm.sh `target=deno`.
- `tsconfig.json` is generic (strict, ESNext, `@types/node`) and not Deno-aware — it does not affect the deployed Deno runtime, just local editor typechecking.

---

## 7. TRUST BOUNDARY & MONEY-MISROUTING RISKS

**What a malicious client can forge / exploit:**

1. **Arbitrary charge amounts (HIGH).** `create-payment-intent` charges `amount` and `deposit` straight from the request body and never compares to `rental.total_price` / `rental.deposit_amount` (which it already fetched). A renter could send `amount: 1` to pay 1 cent for any pending rental they own. Conversely the values aren't bounded upward either. Fix: derive `amount`/`deposit` server-side from the rental row, ignore client values.

2. **Forged rental money fields at creation (HIGH).** `item/[id].tsx` writes `total_price`, `commission_amount`, `deposit_amount` directly into `rentals` via supabase-js with the user's anon key (subject only to RLS). A client can insert a rental with `commission_amount: 0` and `total_price` = anything. Since `release-deposit` computes `ownerEarnings = total_price - commission_amount` from these stored fields, a malicious owner colluding (or a renter, depending on RLS) could inflate `total_earnings`. The commission is never recomputed server-side. Fix: compute commission in a trigger/edge function from the item's `price_per_day` and dates.

3. **Deposit is created but never collected (HIGH / functional bug).** `contract/[id].tsx:58` only feeds `paymentIntentClientSecret` (rental) into the payment sheet. `depositIntentClientSecret` is never confirmed via `presentPaymentSheet`. So the deposit PaymentIntent is created in `requires_payment_method`/`requires_confirmation` state and **no card is ever attached or authorized**. At return, `release-deposit` retrieves it, finds it is NOT `requires_capture` or `succeeded`, and does nothing. **Net effect: the security deposit hold the contract promises ("$X will be held on your card") never actually happens.** The forfeiture / damage / late-fee clauses in the contract are unenforceable because there is no money held.

4. **No real payout to owners (HIGH).** No `transfer_data.destination`, no `application_fee_amount`, no `transfers.create`, no `payouts.create`. The captured rental funds sit in Twirl's platform Stripe balance. Owners are "paid" only in the `total_earnings` integer. The entire Express Connect onboarding (Section 2) collects bank details that are then never used to move money. This is the single biggest gap: the marketplace does not actually pay sellers.

5. **Idempotency / double-credit (MEDIUM).** No Stripe idempotency keys on any `create`/`capture`/`refund`. `release-deposit` can be called repeatedly while status is `active`; the FIRST successful call sets status to `completed` (which then fails the `status = "active"` filter on subsequent calls — so the 404 guard prevents re-credit *after* the status flips). But within a race (two concurrent confirm taps before the update commits) both could pass the `status="active"` read and both call `increment_owner_earnings`, double-crediting earnings and double-attempting capture. The capture is idempotent-ish (Stripe rejects double capture, error swallowed), but the RPC is not guarded. Fix: make the status flip part of the same conditional update (`update ... where status='active'` and check affected rows) before crediting, or add idempotency keys.

6. **Capture timing (MEDIUM).** The renter is only actually charged for the rental at RETURN confirmation, not at handoff. If the renter's card auth expires (Stripe holds last ~7 days) before return, capture fails → pushed to `errors[]` → 500, rental stuck in `active`, owner can't complete. No retry/recapture path.

7. **CORS wide open (LOW).** All three functions return `Access-Control-Allow-Origin: *`. For a mobile app this is mostly moot, but it means any web origin can call these (auth still required via Bearer token, so the JWT is the real gate).

8. **No webhook reconciliation (MEDIUM).** Nothing listens to Stripe webhooks (`payment_intent.succeeded`, `account.updated`, `charge.dispute.created`). All state transitions are driven by client button taps + edge functions. If a payment sheet succeeds but the subsequent `rentals.update({status:'paid'})` fails (network), the rental stays `pending` while a PI is authorized — orphaned.

**Trust boundary summary:** the only thing the server enforces is *identity* (JWT → user.id) and *ownership/status scoping* on the rental row. It does NOT enforce *amounts* (forgeable) or *commission* (forgeable) and does not implement the actual *fund routing* (missing). The auth model is sound; the financial-integrity model is not.

---

## 8. SCHEMA NOTE

The `rentals` table is NOT defined in any local migration (only `20260511_add_profile_demographics.sql` and the release-deposit RPC exist under `supabase/migrations/`). The columns referenced (`renter_id, owner_id, status, total_price, commission_amount, deposit_amount, stripe_payment_intent, stripe_deposit_intent, contract_agreed, conversation_id`) and the `rental_contracts` columns (`deposit_intent_id, terms_version, agreed_at`) live only in the remote Supabase project (qlulzatkhgblorbjndsz). Their RLS policies — which determine whether the forged-money-field attacks in Section 7.2 are actually exploitable — are not in the repo and must be audited live.

CONNECTIONS: item/[id].tsx writes rentals.total_price/commission_amount/deposit_amount which release-deposit later reads to compute ownerEarnings (commission never re-validated server-side); contract/[id].tsx -> create-payment-intent edge fn -> writes rentals.stripe_payment_intent + stripe_deposit_intent; rentals.tsx -> release-deposit edge fn -> stripe capture/refund + increment_owner_earnings RPC -> profiles.total_earnings shown in profile.tsx; profile.tsx -> create-connect-account edge fn -> writes profiles.stripe_account_id (but that account is never used by create-payment-intent or release-deposit); All three edge functions use SUPABASE_SERVICE_ROLE_KEY (bypassing RLS) and gate access only via supabase.auth.getUser(Bearer token); COMMISSION_RATE (lib/constants.ts) consumed only client-side in item/[id].tsx; never imported by edge functions
GAPS NOTICED: No Stripe transfer/payout to owners exists anywhere — Express Connect onboarding collects bank info that is never used; captured funds remain in Twirl's platform balance. Owners are 'paid' only via the total_earnings counter.; create-payment-intent charges client-supplied amount/deposit without comparing to the rental row it already fetched — a renter can pay an arbitrary amount for their own pending rental.; Deposit PaymentIntent is created but never confirmed in the payment sheet (contract/[id].tsx:58 only passes the rental client secret), so no security deposit hold is ever actually placed; all contract forfeiture/damage clauses are unenforceable.; rentals money fields (total_price, commission_amount, deposit_amount) are inserted directly by the client; exploitability depends on RLS policies not present in the repo — needs a live RLS audit on the remote Supabase project.; No Stripe idempotency keys and the increment_owner_earnings RPC is unguarded, allowing potential double-credit under a concurrent confirm-return race before the status flips to completed.; No Stripe webhook handling (payment_intent.succeeded, account.updated, charge.dispute.created) — all state transitions are client-driven, risking orphaned authorizations and no Connect onboarding-complete confirmation.; 'disputed' status has UI color but no code path sets it; the contract names Twirl as binding arbitrator with no implementation.; Three inconsistent base-URL env conventions (EXPO_PUBLIC_API_URL vs EXPO_PUBLIC_SUPABASE_URL, with/without /functions/v1) — contract payment can break if EXPO_PUBLIC_API_URL is unset.; The 'rentals' and 'rental_contracts' table definitions are not in any local migration; schema and RLS live only in the remote DB (qlulzatkhgblorbjndsz).; The documented '85% payout' is inaccurate to the code: owner is credited the full subtotal (100% of rental fee); the 15% is a renter surcharge Twirl retains, and again, no real money moves.

---

### AREA: External connections, environment contract, and build/config (lib/supabase.ts, lib/constants.ts, hooks/useAuth.ts, app.json, eas.json, env, package.json, tsconfig, native iOS project)
# A5 Discovery Report — Connections, Config & Build Surface

Repo root: `/Users/cooperporter/Twirl-Hub/repo/Twirl`. Expo SDK 54 / RN 0.81.5 / React 19 app with Supabase backend and Stripe payments, built via EAS and Xcode (native `ios/` generated locally, gitignored).

---

## 1. SUPABASE CONNECTION (`lib/supabase.ts`)

**Client init:** `createClient(supabaseUrl, supabaseKey, { auth: {...} })` from `@supabase/supabase-js`.

**Env contract (the dual-key logic):**
- `supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL`
- `supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY`
- The OR chain is the **dual anon-JWT-vs-publishable-key logic**: `_ANON_KEY` is the legacy anon JWT (`eyJ…`); `_KEY` is the newer dashboard publishable key (`sb_publishable_…`). Either satisfies the client. Code comment at line 5 documents this. `_ANON_KEY` takes precedence when both are set.
- Hard fail: if neither URL nor key is present, `throw new Error("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_KEY in .env")`. This throws at module import time — any screen importing `@/lib/supabase` will crash the bundle if env is missing.

**Auth config knobs (line 16-27):**
- `storage`: custom adapter delegating `getItem`/`setItem`/`removeItem` to `@react-native-async-storage/async-storage` → **AsyncStorage session persistence** (sessions survive app restarts on device).
- `autoRefreshToken: true` — refreshes JWT before expiry.
- `persistSession: true` — writes session to the AsyncStorage adapter.
- `detectSessionInUrl: false` — correct for native (URL-based OAuth callback detection is a web concern; disabling avoids RN errors).
- NOTE: There is no app-state listener calling `supabase.auth.startAutoRefresh()/stopAutoRefresh()` on foreground/background. Supabase RN guidance recommends tying autoRefresh to `AppState`; absent here, token refresh relies purely on the timer, which is paused while the JS thread is backgrounded. Minor; flagged below.

**Resolved project (from `.env`):** `qlulzatkhgblorbjndsz.supabase.co`. This MATCHES the CLAUDE.md stack note (project `qlulzatkhgblorbjndsz`). API base for edge functions = `https://qlulzatkhgblorbjndsz.supabase.co/functions/v1`.

**Edge functions present** (`supabase/functions/`): `create-connect-account`, `create-payment-intent`, `release-deposit`, plus a `tsconfig.json`. These are the Stripe Connect server-side surface; called via `EXPO_PUBLIC_API_URL`. (tsconfig at root excludes `supabase/functions` from the app typecheck.)

---

## 2. AUTH HOOK (`hooks/useAuth.ts`)

- `useAuth()` returns `{ session, user, loading, signOut }`.
- On mount: `supabase.auth.getSession()` populates `session`/`user`, sets `loading=false`.
- Subscribes to `supabase.auth.onAuthStateChange` to keep state in sync; unsubscribes on unmount.
- `signOut = () => supabase.auth.signOut()`.
- Imports via `@/lib/supabase` alias (resolved by both tsconfig paths and babel module-resolver).
- Note: `onAuthStateChange` callback does NOT set `loading` — only the initial `getSession` does. Fine, but a sign-out won't toggle loading.

---

## 3. CONSTANTS (`lib/constants.ts`)

Pure static data, no env/connection. `SEC_SCHOOLS` (16 entries — includes "Oklahoma University"/"Texas University" which are informal names), `OCCASIONS` (10), `SIZES` (13), `CATEGORIES` (8), `COMMISSION_RATE = 0.15` (matches the 15% commission in CLAUDE.md mission).

---

## 4. STRIPE CONNECTION

**Plugin config (`app.json` plugins):**
```
["@stripe/stripe-react-native", { "merchantIdentifier": "merchant.twirl.rentals", "enableGooglePay": false }]
```
- `merchantIdentifier: "merchant.twirl.rentals"` (Apple Pay merchant ID).
- `enableGooglePay: false`.

**Publishable key env:** `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (consumed by the Stripe provider in app code; `.env.example` shows `pk_test_xxx`).

**Connect:** Server-side via the `create-connect-account` and `release-deposit` edge functions (Express Connect per CLAUDE.md / HOR decision 7.6). No secret key in the client — correct.

**Native URL schemes (`ios/Twirl/Info.plist`):** `CFBundleURLSchemes` = `["twirl", "com.twirl.rentals"]` (used by Stripe SDK return URLs / deep links).

---

## 5. EAS CONFIG (`eas.json` + `app.json` extra)

**Project identity:**
- `projectId: c65a84e0-9ea3-4bbb-aa05-9706cb442756` (in `app.json` → `extra.eas.projectId`). MATCHES the task brief.
- `owner: jimbo36` (`app.json`). MATCHES brief (and CLAUDE.md `eas whoami → jimbo36`).

**`eas.json`:**
- `cli.version: ">= 16.0.0"`, `cli.appVersionSource: "remote"` (server-managed build/version numbers).
- Build profiles:
  - `development`: `developmentClient: true`, `distribution: "internal"`, `ios.simulator: false`.
  - `preview`: `distribution: "internal"`, `ios.resourceClass: "m-medium"`.
  - `production`: `autoIncrement: true` (auto-bumps build number).
- Submit profile `production.ios`:
  - `appleId: cporter1us@hotmail.com` — MATCHES brief and MEMORY.md note (`Apple ID: cporter1us@hotmail.com`). NOTE: CLAUDE.md OPERATOR section lists `cporter2us@gmail.com` as the personal email; the Apple ID intentionally differs (`1us@hotmail`).
  - `ascAppId: 6765989926` — MATCHES brief.
  - `appleTeamId: JD84S94RNQ` — MATCHES brief.

---

## 6. FULL ENV-VAR CONTRACT

| Var | Required | Source/Purpose | Public? |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | YES (throws if missing) | Supabase REST/Auth base | YES — bundled into client |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | YES (or `_KEY`) | Legacy anon JWT (`eyJ…`) | YES — but anon key is meant to be public, RLS enforces |
| `EXPO_PUBLIC_SUPABASE_KEY` | alt to above | Publishable key (`sb_publishable_…`) | YES |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | YES (for payments) | Stripe publishable key | YES — publishable keys are safe |
| `EXPO_PUBLIC_API_URL` | YES (edge fn calls) | `https://<ref>.supabase.co/functions/v1` | YES |

**`.env.example`** documents all 5 (with `_KEY` commented out as the alt). **`.env`** (gitignored, live) holds: live values — Supabase URL `qlulzatkhgblorbjndsz`, **anon JWT** (`eyJ…` variant, not publishable), and a **`pk_live_…` Stripe key** (NOT `pk_test`), plus the API URL.

**EXPO_PUBLIC_ prefix = public-by-design:** Expo inlines every `EXPO_PUBLIC_*` var into the JS bundle. All five WILL ship in the client binary. This is acceptable for anon/publishable keys (their exposure is expected; security must rest on Supabase RLS + Stripe's publishable-key model). It is NOT acceptable for any secret. None of the five are secrets by design — verified no service-role key or Stripe secret key is referenced anywhere in the client env contract.

---

## 7. NPM DEPENDENCY INVENTORY (package.json)

**dependencies:**
| Package | Version | Role |
|---|---|---|
| `expo` | `~54.0.34` | Core SDK 54 runtime |
| `expo-router` | `~6.0.23` | File-based routing (v6); entry via `expo-router/entry` |
| `expo-constants` | `~18.0.13` | Reads `app.json` extra / manifest |
| `expo-font` | `^55.0.6` | Font loading. ⚠ version `55.x` is anomalous vs all other expo-* pinned to SDK-54 ranges (`~17/18/8`). SDK 54's expo-font is ~14.x; `^55` is suspect / likely wrong-major (flag). |
| `expo-image-picker` | `~17.0.10` | Avatar/item photo upload |
| `expo-linking` | `~8.0.12` | Deep linking (scheme `twirl`) |
| `expo-status-bar` | `~3.0.9` | Status bar control |
| `react` | `19.1.0` | React 19 |
| `react-dom` | `19.1.0` | Web rendering |
| `react-native` | `0.81.5` | RN core (SDK 54 baseline) |
| `react-native-web` | `~0.21.0` | Web target |
| `react-native-gesture-handler` | `~2.28.0` | Gestures; imported first in `index.ts` |
| `react-native-reanimated` | `~4.1.1` | Animations (v4 — requires worklets pkg, present) |
| `react-native-worklets` | `0.5.1` | Reanimated v4 worklets runtime |
| `react-native-safe-area-context` | `~5.6.0` | Safe-area insets |
| `react-native-screens` | `~4.16.0` | Native screen primitives |
| `react-native-svg` | `^15.15.4` | SVG rendering |
| `@react-native-async-storage/async-storage` | `^2.2.0` | Supabase session persistence store |
| `@react-native-community/datetimepicker` | `8.4.4` | Rental date selection |
| `@react-native-picker/picker` | `2.11.1` | Dropdowns (size/category/occasion) |
| `@stripe/stripe-react-native` | `0.50.3` | Payments + Connect + Apple Pay |
| `@supabase/supabase-js` | `^2.104.0` | Backend client |
| `nativewind` | `^4.2.3` | Tailwind-in-RN (v4) |
| `tailwindcss` | `^3.4.17` | Tailwind engine (v3, required peer for NativeWind v4) |
| `@expo-google-fonts/cormorant-garamond` | `^0.4.1` | Serif display font |
| `@expo-google-fonts/inter` | `^0.4.2` | Sans body font |
| `@expo-google-fonts/jetbrains-mono` | `^0.4.1` | Mono font |

**devDependencies:**
| Package | Version | Role |
|---|---|---|
| `@expo/ngrok` | `^4.1.3` | Tunnel for `expo start --tunnel` |
| `@types/react` | `~19.1.0` | React 19 types |
| `babel-plugin-module-resolver` | `^5.0.3` | `@` alias in babel |
| `typescript` | `~5.9.2` | TS compiler |

**Notable absences (not bugs, but inventory gaps):** no `expo-notifications` / push, no `expo-dev-client` (dev profile uses developmentClient via EAS), no Sentry/crash reporting, no test framework (jest/testing-library), no eslint/prettier in deps.

---

## 8. BUILD / SCRIPT SURFACE

**package.json scripts:** `start` (expo start), `android`/`ios` (`expo run:*`), `web`, `typecheck` (`tsc --noEmit`), `ios:prebuild` (`expo prebuild --platform ios`), `ios:pods` (`cd ios && pod install`), `ios:prep` (prebuild + pods), `ios:open` (opens `ios/Twirl.xcworkspace`). `main: "index.ts"`. `private: true`.

**`index.ts`:** `import "react-native-gesture-handler"; import "expo-router/entry";` — gesture-handler imported first (required ordering), then expo-router boot. Correct.

**`babel.config.js`:** preset `babel-preset-expo` with `jsxImportSource: "nativewind"` + `nativewind/babel`; plugins `module-resolver` (`@` → `.`) and `react-native-reanimated/plugin` (must be last — it is). Correct.

**`metro.config.js`:** `withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" })`. `global.css` exists with the 3 `@tailwind` directives. Correct.

**`tailwind.config.js`:** content globs `app/**` and `components/**`; nativewind preset; full custom `twirl` color palette, status colors, font families (Cormorant/Inter/JetBrains Mono), fontSize scale, borderRadius tokens. Fonts referenced here (e.g. `CormorantGaramond_500Medium`, `Inter_400Regular`) must be loaded at runtime via the @expo-google-fonts packages — dependency on those packages is real.

**`tsconfig.json`:** extends `expo/tsconfig.base`, `strict: true`, `baseUrl: "."`, paths `@/* → ./*`, excludes `node_modules` and `supabase/functions`.

---

## 9. NATIVE iOS PROJECT (`ios/`)

CONFIRMED PRESENT (contradicts README claim that `ios/` is gitignored-only/regenerated): full generated project on disk — `Twirl.xcworkspace`, `Twirl.xcodeproj`, `Podfile` + `Podfile.lock` (75KB, pods installed), `Pods/`, `build/`, `.xcode.env`/`.xcode.env.local`, `Podfile.properties.json`. It is NOT committed (`/ios` is in `.gitignore`), only on the local machine.
- `ios/.xcode.env.local`: `NODE_BINARY=/usr/local/bin/node`.
- `Podfile.properties.json`: `expo.jsEngine: hermes`, `EX_DEV_CLIENT_NETWORK_INSPECTOR: true`, `newArchEnabled: true`.

---

## 10. EXPO CONFIG KNOBS (`app.json`)

`name: Twirl`, `slug: twirl`, `version: 1.0.0`, `orientation: portrait`, `icon: ./assets/icon.png`, `userInterfaceStyle: light`, **`scheme: twirl`** (deep-link scheme), **`newArchEnabled: true`** (New Architecture / Fabric enabled — consistent with the native Podfile flag and reanimated v4/worklets which require it).
- `splash`: `./assets/splash-icon.png`, contain, bg `#FBF7F0`.
- `ios`: `supportsTablet: true`, **`bundleIdentifier: "twirl.rentals"`**, `infoPlist.ITSAppUsesNonExemptEncryption: false` (skips export-compliance prompt).
- `android`: adaptive icon, `edgeToEdgeEnabled: true`, `predictiveBackGestureEnabled: false`.
- `web`: favicon.
- `plugins`: `expo-router`, `@stripe/stripe-react-native`.
- `extra.router: {}`, `extra.eas.projectId`, `owner: jimbo36`.

**Assets present** (`assets/`): `icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`, `icon.svg`. App icon IS configured — the brief's "no app icon?" concern is NOT an issue; icon exists and is wired.

---

## 11. FLAGS / RISKS

### CRITICAL
- **Committed secret file `.env.save` is tracked in git** (committed in `9906b6d "wip: session work 2026-05-12 through 2026-05-18"`). It contains real-looking `EXPO_PUBLIC_*` values including a `pk_test_` Stripe key and an `sb_publishable_` Supabase key. `.gitignore` ignores `.env` and `.env*.local` but NOT `.env.save`, so this file leaked into history. ACTION: `git rm --cached .env.save`, add `.env.save` (or `.env*`) to `.gitignore`, and rotate any keys that were real. (Publishable/anon keys are public-by-design, so blast radius is low, but it is still a hygiene/secret-leak finding and the test keys should be purged.)

### HIGH — config contradictions (bundle identifier mismatch)
- **`app.json` `ios.bundleIdentifier = "twirl.rentals"`** but the **generated native project (`ios/Twirl.xcodeproj/project.pbxproj`) has `PRODUCT_BUNDLE_IDENTIFIER = com.twirl.rentals`**, and **README says `com.twirl.rentals`**, and **Info.plist URL schemes include `com.twirl.rentals`**. So three sources say `com.twirl.rentals` and only `app.json` says `twirl.rentals`. A bare `twirl.rentals` is also an unusual/likely-invalid reverse-DNS bundle ID. On the next `expo prebuild`, app.json (`twirl.rentals`) would overwrite the native `com.twirl.rentals`, changing the App Store identity tied to `ascAppId 6765989926` — a real submission-breaker. This is a prime suspect for the EAS submission failure noted as the #1 blocker. NEEDS RECONCILIATION — pick one canonical bundle ID.
- **Apple Pay merchant identifier mismatch:** `app.json` plugin sets `merchant.twirl.rentals`, but **README instructs creating `merchant.com.twirl`**. Whichever is registered in Apple Developer must match the plugin value (`merchant.twirl.rentals`); README is stale.

### MEDIUM — dependency version risk
- **`expo-font: ^55.0.6`** is out-of-band vs every other expo-* package (all pinned to SDK-54 `~` ranges). Expo SDK 54's expo-font is in the ~14.x line; `^55` looks like a wrong/typo'd major and could pull an incompatible build. Verify with `npx expo install --check` / `expo-doctor`.
- `@stripe/stripe-react-native 0.50.3` — confirm it is the SDK-54-blessed version; Stripe RN tracks Expo SDK closely and a mismatch can break the build/Apple Pay.
- React 19 + RN 0.81 + Reanimated v4 + worklets 0.5.1 + New Arch is a bleeding-edge combo; internally consistent here (worklets present, newArch on everywhere) but fragile to partial upgrades.

### LOW
- `supabase.ts` has no `AppState`-tied `startAutoRefresh/stopAutoRefresh`; token refresh won't run while backgrounded (Supabase RN best practice not followed). Minor UX/token-staleness risk.
- README is stale in multiple places (bundle ID, merchant ID) — drift between docs and actual config.
- No push-notification setup (`expo-notifications` absent) and no deep-link route config beyond the `scheme` + URL types (no `expo-router` linking prefix config / associated domains for universal links). If push or universal links are on the roadmap, both are missing.
- No crash reporting / analytics / test tooling.

### NON-ISSUES (explicitly checked from brief)
- App icon: PRESENT and wired (`assets/icon.png`, adaptive, splash, favicon).
- Deep-link scheme: PRESENT (`scheme: twirl` + Info.plist URL types).
- Secret leakage of service-role/Stripe-secret to client: NONE in the env contract — only anon/publishable/public keys, which are public by design.

CONNECTIONS: Supabase (project qlulzatkhgblorbjndsz.supabase.co) — REST/Auth via @supabase/supabase-js, anon JWT or publishable key, AsyncStorage session persistence; Supabase Edge Functions base via EXPO_PUBLIC_API_URL (/functions/v1): create-connect-account, create-payment-intent, release-deposit; Stripe (@stripe/stripe-react-native 0.50.3) — publishable key EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY (currently pk_live in .env), Apple Pay merchant.twirl.rentals, Express Connect via edge functions; EAS Build/Submit — projectId c65a84e0-9ea3-4bbb-aa05-9706cb442756, owner jimbo36; App Store Connect ascAppId 6765989926, appleId cporter1us@hotmail.com, appleTeamId JD84S94RNQ; Apple/Xcode native iOS build — bundle id mismatch (app.json twirl.rentals vs native com.twirl.rentals), Hermes, New Architecture; AsyncStorage (@react-native-async-storage/async-storage) — backing store for Supabase auth session; Expo Router v6 deep linking — scheme 'twirl' + Info.plist URL types (twirl, com.twirl.rentals)
GAPS NOTICED: CRITICAL: .env.save is tracked in git (commit 9906b6d) and contains pk_test Stripe + sb_publishable Supabase keys; .gitignore does not cover .env.save — needs git rm --cached + gitignore + key rotation; HIGH: bundle identifier contradiction — app.json says ios.bundleIdentifier 'twirl.rentals' while native project, README, and Info.plist all say 'com.twirl.rentals'; next prebuild would overwrite native value and change App Store identity (likely cause of EAS submission failure, the #1 blocker); HIGH: Apple Pay merchant mismatch — app.json plugin merchant.twirl.rentals vs README merchant.com.twirl; MEDIUM: expo-font pinned ^55.0.6 is out-of-band vs all other SDK-54 expo-* packages; likely wrong major — run expo-doctor / expo install --check; MEDIUM: confirm @stripe/stripe-react-native 0.50.3 is the SDK-54-blessed version; LOW: lib/supabase.ts lacks AppState-tied startAutoRefresh/stopAutoRefresh (Supabase RN best practice); token refresh paused while backgrounded; LOW: live .env uses pk_live Stripe key in a pre-launch app not yet App Store approved — confirm intentional (sandbox acct per CLAUDE.md suggests test key expected); LOW: README is stale (bundle id, merchant id) and says ios/ is regenerated though it exists locally; LOW: no push notifications (expo-notifications absent), no universal-link/associated-domains config, no crash reporting (Sentry), no test framework