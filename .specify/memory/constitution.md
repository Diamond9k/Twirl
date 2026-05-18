# Twirl — Development Constitution

**Project:** Twirl — P2P clothing rental for U of A sorority women  
**Owner:** Cooper Porter  
**Hard deadline:** May 24, 2026 (Camp Ozark cutoff)  
**Launch target:** August 2026 (rush season)  
**Budget remaining:** ~$389  

---

## Governing Principles

### 1. Ship before perfect
Every decision weighs against May 24. If a feature does not unblock the first iPhone runtime or the first payment, it is post-launch scope. The Operator always gets a vote.

### 2. No re-debating locked decisions
These are final. Do not relitigate:
- Supabase Edge Functions (not Railway)
- Stripe Express Connect for payouts
- Single campus (U of A) launch
- NativeWind v4 + expo-router v6 stack
- Gluestack removed — no reimport, ever

### 3. Write a spec before writing a screen
Every new feature gets a spec entry before a single line of code. The spec answers: what does the user see, what does it write to the DB, what can go wrong.

### 4. The schema is the contract
Column names in Supabase are authoritative. If the app type and the DB column disagree, fix the app type. Never rename DB columns without a migration file.

### 5. Column positions are never hardcoded
Already followed in pledge-bot. Apply the same discipline here: reference columns by name, not index.

### 6. Stripe is the only payment path
No cash, Venmo, or out-of-band handling. Stripe handles renter charges and lender payouts. This is not negotiable — it's what keeps us out of legal trouble.

### 7. 15% commission is the business model
Every rental: renter pays `price_per_day × days + 15% fee + deposit`. Lender receives `price_per_day × days × 0.85` via Stripe Connect payout. Deposit is held separately.

### 8. Security deposit is always held, never charged at booking
Payment intent captures the rental fee. A separate setup intent authorizes the deposit. Deposit captured only on damage/non-return claim.

### 9. The Council reviews architecture and GTM, not implementation details
Don't run a Council session for "should this button be rounded?" Run one for "should we support multi-school launch at August rush?"

### 10. Cooper understands his own code
No magic. No over-abstraction. Code should be readable by the person who built it. Prefer 3 explicit lines over 1 clever line.

---

## Stack Constraints

| Layer | Choice | Locked |
|---|---|---|
| Framework | React Native + Expo SDK 54 | Yes |
| Router | expo-router v6 | Yes |
| Styling | NativeWind v4 + Tailwind | Yes |
| Auth + DB | Supabase (project: qlulzatkhgblorbjndsz) | Yes |
| Payments | Stripe (acct_1TOc7bH9wFsk14vQ) + Express Connect | Yes |
| Serverless | Supabase Edge Functions (Deno) | Yes |
| Distribution | EAS Build → TestFlight → App Store | Yes |

---

## Non-Negotiable Acceptance Criteria (for any PR)

- [ ] TypeScript compiles clean (`npm run typecheck`)
- [ ] No hardcoded Supabase URLs or keys in source — all via `EXPO_PUBLIC_*` env vars
- [ ] Every DB write has an error branch that surfaces to the user
- [ ] Stripe operations only run server-side (Edge Function) — no secret key in app
- [ ] New screens use NativeWind `className` — no inline StyleSheet unless unavoidable
