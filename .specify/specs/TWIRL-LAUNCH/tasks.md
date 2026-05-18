# Tasks — Twirl MVP (May 24 Deadline)

**Feature ID:** TWIRL-LAUNCH  
**Generated:** 2026-05-11  
**Days remaining:** 13  
**[P] = can run in parallel with previous task**  

---

## Phase 0 — Schema Verification (Day 1 Morning, ~1h)

> Confirm DB reality before writing any code. Nothing worse than fixing the wrong column name.

- [ ] **T-00** Query Supabase to confirm `conversations` column names
  ```sql
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'conversations'
  ORDER BY ordinal_position;
  ```
  → Confirm `unread_user1`, `unread_user2` exist (or `unread_count` — know the truth before patching)

- [ ] **T-01** [P] Confirm `messages` table exists and has `realtime` enabled
  - Supabase dashboard → Database → Replication → confirm `messages` row is ON
  - If not: enable it now

- [ ] **T-02** [P] Confirm `profiles.stripe_account_id` column exists
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name = 'stripe_account_id';
  ```
  → If missing: run migration in Supabase SQL editor:
  ```sql
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id varchar;
  ```

- [ ] **CHECKPOINT-0:** Schema is confirmed. Column names are known. Realtime is enabled.

---

## Phase 1 — Fix Inbox (Day 1 Afternoon, ~0.5h)

> Unblock messages.tsx before building the conversation screen. Fixing the list first means the conversation can be tested end-to-end immediately.

- [ ] **T-03** Fix `unread_count` query in `app/(tabs)/messages.tsx`
  - File: `app/(tabs)/messages.tsx:27`
  - Change select to include `unread_user1, unread_user2` (remove `unread_count`)
  - Add `user1_id` to the select so the shaping logic can determine which column applies
  - Compute `unread_count` client-side: `c.user1_id === user!.id ? c.unread_user1 : c.unread_user2`
  - Verify badge renders correctly for both user1 and user2

- [ ] **CHECKPOINT-1:** Inbox loads without error. Unread badges show correct counts.

---

## Phase 2 — Conversation Screen (Day 2, ~4h)

> The most user-visible gap. Without this, messages is a dead end.

- [ ] **T-04** Create `app/conversation/[id].tsx`
  - Fetch conversation record (other user, item title) on mount
  - Fetch all messages by `conversation_id` ordered `created_at ASC`
  - FlatList with scroll-to-bottom on new message (`ref.current.scrollToEnd`)
  - On mount: reset own unread column to 0 in `conversations`
  - Realtime subscription on `messages` table filtered by `conversation_id=eq.${id}`
  - Send handler: INSERT into `messages`, UPDATE `conversations.last_message` + `last_message_at` + increment other user's unread
  - Header: item title (italic serif) + other user's name
  - Empty state: `"say hi 👋"` centered
  - Bubble layout: own messages right (bg-twirl-pink text-white), theirs left (bg-twirl-cream text-twirl-text)
  - Sticky input bar: TextInput + send button, respects keyboard avoid

- [ ] **T-05** Wire `messages.tsx` row `onPress` to `/conversation/${c.id}`
  - Already implemented — confirm it navigates correctly with the new file in place

- [ ] **CHECKPOINT-2:** End-to-end message flow works. Send a message, see it appear in realtime. Unread count clears on open.

---

## Phase 3 — Edge Function Deploy (Day 3, ~2h)

> Payments are blocked until this is live. Everything else can demo; payments cannot.

- [ ] **T-06** Write `supabase/functions/create-payment-intent/index.ts`
  - Deno Edge Function with `npm:stripe` import
  - Accept `{ rental_id, amount, deposit }` from request body
  - Verify JWT from `Authorization` header (use Supabase service role to validate)
  - Create `PaymentIntent` for `amount` cents, `capture_method: 'automatic'`
  - Create `SetupIntent` for deposit authorization
  - Return `{ paymentIntentClientSecret, depositIntentClientSecret }`
  - Add error handling: invalid rental_id → 400, Stripe error → 500 with message

- [ ] **T-07** Set Edge Function environment variables in Supabase dashboard
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `SUPABASE_SERVICE_ROLE_KEY=...`

- [ ] **T-08** Deploy edge function
  ```bash
  supabase functions deploy create-payment-intent --project-ref qlulzatkhgblorbjndsz
  ```

- [ ] **T-09** Verify `.env` has `EXPO_PUBLIC_API_URL=https://qlulzatkhgblorbjndsz.supabase.co/functions/v1`
  - `contract/[id].tsx:32` calls `${EXPO_PUBLIC_API_URL}/create-payment-intent`
  - Confirm this resolves correctly

- [ ] **CHECKPOINT-3:** Payment flow completes in Stripe sandbox. `rentals.status` updates to `'paid'`. `rental_contracts` row inserted.

---

## Phase 4 — iPhone Runtime (Day 4, ~2h)

> Can't TestFlight without a working native build. Do this before EAS config.

- [ ] **T-10** Clean prebuild
  ```bash
  cd ~/Twirl-Hub/repo/Twirl
  npx expo prebuild --platform ios --clean
  ```

- [ ] **T-11** Install pods
  ```bash
  cd ios && pod install && cd ..
  ```

- [ ] **T-12** Launch on physical iPhone via Xcode
  - Open `ios/Twirl.xcworkspace`
  - Select physical device
  - Build + run
  - Watch for native crash on startup

- [ ] **T-13** If crash: identify module (check Xcode crash log for culprit)
  - Likely candidates: `react-native-worklets`, `react-native-reanimated`, datetimepicker
  - Resolution path: check each library's Expo SDK 54 compatibility table

- [ ] **CHECKPOINT-4:** App launches and reaches the browse screen on a physical iPhone.

---

## Phase 5 — Stripe Connect Onboarding (Day 5–6, ~3h)

> Lenders can't receive payouts without this. Not blocking first payment, but blocking first lender payout.

- [ ] **T-14** Write `supabase/functions/create-connect-account/index.ts`
  - Authenticate request (JWT from Authorization header)
  - Create Stripe Express account for `user_id`
  - Generate account link (onboarding URL)
  - Save `stripe_account_id` to `profiles` table
  - Return `{ url }` for the app to open via `Linking.openURL`

- [ ] **T-15** [P] Add "Set up payouts" section to `app/(tabs)/profile.tsx`
  - Check `profile.stripe_account_id`
  - If null: show "Set up payouts → earn from your closet" CTA button
  - If set: show "Payouts connected ✓" with Stripe green
  - On CTA press: call `create-connect-account` Edge Function, open returned URL via `Linking.openURL`

- [ ] **T-16** Deploy `create-connect-account`
  ```bash
  supabase functions deploy create-connect-account --project-ref qlulzatkhgblorbjndsz
  ```

- [ ] **CHECKPOINT-5:** Lender can tap "Set up payouts" on profile, go through Stripe Express onboarding, return to app, see "Payouts connected ✓".

---

## Phase 6 — EAS Build + TestFlight (Day 7–8, ~2h)

> This is how founding affiliates install the app. Required before any GTM.

- [ ] **T-17** Confirm Apple Developer account is active (requires $99/yr membership)

- [ ] **T-18** Add `bundleIdentifier` to `app.json`
  ```json
  "ios": {
    "supportsTablet": false,
    "bundleIdentifier": "com.twirl.app"
  }
  ```

- [ ] **T-19** Create `eas.json` in repo root
  - `development` profile: internal distribution, developmentClient: true
  - `preview` profile: internal distribution, physical device
  - `production` profile: Release build for App Store

- [ ] **T-20** Configure EAS project
  ```bash
  npm install -g eas-cli
  eas login
  eas build:configure
  ```

- [ ] **T-21** Trigger preview build
  ```bash
  eas build --platform ios --profile preview
  ```

- [ ] **T-22** Submit to TestFlight
  ```bash
  eas submit --platform ios --latest
  ```

- [ ] **T-23** [P] Add founding affiliates to TestFlight (KKG — Abby, Pi Phi)

- [ ] **CHECKPOINT-6:** TestFlight link sent to founding affiliates. App installs on their iPhones.

---

## Phase 7 — Screen Audit (Day 9–10, ~2h)

> Before affiliates test it, make sure nothing else is broken.

- [ ] **T-24** Audit `app/(tabs)/list.tsx` — listing flow
  - Can a user create a new item listing?
  - Does image upload to Supabase Storage work?
  - Does `available` default to true?

- [ ] **T-25** [P] Audit `app/(tabs)/rentals.tsx` — rental status view
  - Does it show pending + paid rentals?
  - Does it differentiate renter vs. lender view?

- [ ] **T-26** [P] Audit `app/(tabs)/profile.tsx` — profile completeness
  - Full name, school, sorority displayed
  - Sign out works
  - Stripe Connect CTA visible (from T-15)

- [ ] **T-27** [P] Verify `app/(auth)/signup1.tsx` + `signup2.tsx` multi-step flow
  - User created in `auth.users`
  - Profile row created in `profiles`

- [ ] **CHECKPOINT-7:** All five tabs function without crashes. Signup creates a usable account.

---

## Phase 8 — Seed Inventory (Day 11–12, ~1h)

> The app needs items in it for founding affiliates to actually rent something.

- [ ] **T-28** Coordinate with Abby (KKG) and Pi Phi affiliate to list 5–10 items each
  - Walk them through listing flow on TestFlight
  - Items need real photos, real prices, real sizes

- [ ] **T-29** Verify items appear in browse screen with correct filters

- [ ] **CHECKPOINT-8:** Browse screen shows real inventory. End-to-end rental can be completed with real items.

---

## Phase 9 — Final Validation (Day 13, ~1h)

- [ ] **T-30** Full end-to-end walkthrough on two iPhones
  - Account A: lender with Stripe Connect connected, one item listed
  - Account B: renter — browse, select item, pick dates, submit request, open conversation, pay via contract screen
  - Confirm: conversation receives message, rental status = 'paid', contract row created

- [ ] **T-31** `npm run typecheck` — zero errors

- [ ] **T-32** [P] Rotate Obsidian API key (flagged in COOPERBRAIN_BOOTSTRAP.md — key was exposed in plaintext)

- [ ] **CHECKPOINT-FINAL:** App is demo-ready. TestFlight link is live. May 24 deadline met.

---

## Post-May-24 Backlog (August Rush)

| Task | Est. |
|---|---|
| `capture-and-pay` Edge Function (automatic payout on return confirmation) | 3h |
| Push notifications for new messages | 4h |
| Review/rating UI after rental completes | 3h |
| Item availability calendar (lender sets unavailable dates) | 3h |
| Register Arkansas LLC (~$45) | 1h |
| Affiliate outreach: ZTA, AXO, Chi Omega, Tri Delt, full Panhellenic | ongoing |
| Founding affiliate perk: lock in $1/rental forever commission rate | 0.5h |
| App Store submission (production build) | 2h |

---

## Dependency Graph

```
T-00, T-01, T-02 (schema verify, parallel)
  └─ T-03 (fix unread query)
       └─ T-04 (conversation screen)
            └─ T-05 (wire navigation — already done)

T-06 (write edge function)
  └─ T-07 (set env vars)
       └─ T-08 (deploy)
            └─ T-09 (verify env in app)

T-10 → T-11 → T-12 → T-13? (native build chain, sequential)

T-14 → T-15 (parallel) → T-16 (deploy connect account)

T-17 → T-18 → T-19 → T-20 → T-21 → T-22 → T-23 (EAS chain)

T-24, T-25, T-26, T-27 (parallel screen audits)

T-28 → T-29 (seed inventory)

T-30 → T-31, T-32 (final validation)
```
