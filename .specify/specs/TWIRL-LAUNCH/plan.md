# Technical Plan — Twirl MVP

**Feature ID:** TWIRL-LAUNCH  
**Deadline:** 2026-05-24  
**Days remaining:** 13  

---

## Architecture Overview

```
iPhone (Expo / RN)
  ├── expo-router v6  (file-based navigation)
  ├── NativeWind v4   (Tailwind → StyleSheet)
  ├── @supabase/supabase-js  (DB + Auth + Realtime)
  └── @stripe/stripe-react-native  (Payment Sheet)
          │
          ▼
    Supabase (qlulzatkhgblorbjndsz)
      ├── Auth  (email/password)
      ├── Postgres  (10 tables)
      ├── Realtime  (messages channel)
      └── Edge Functions (Deno)
              ├── create-payment-intent  [EXISTS, NOT DEPLOYED]
              ├── create-connect-account  [MISSING]
              └── capture-and-pay  [MISSING — post-launch]
          │
          ▼
    Stripe (acct_1TOc7bH9wFsk14vQ)
      ├── Payment Intents  (rental fee capture)
      ├── Setup Intents  (deposit authorization)
      └── Express Connect  (lender payouts)
```

---

## Current State Audit

### What exists and works
| File | State |
|---|---|
| `app/(auth)/login.tsx` | Working |
| `app/(auth)/signup1.tsx` | Working |
| `app/(auth)/signup2.tsx` | Working |
| `app/(tabs)/index.tsx` | Working — browse + search + filter |
| `app/(tabs)/messages.tsx` | Broken — routes to missing conversation route, `unread_count` bug |
| `app/(tabs)/list.tsx` | Needs audit |
| `app/(tabs)/rentals.tsx` | Needs audit |
| `app/(tabs)/profile.tsx` | Needs audit + Stripe Connect CTA |
| `app/item/[id].tsx` | Working — date picker, price calc, rental request creation |
| `app/contract/[id].tsx` | Working (client-side) — blocked on missing Edge Function |
| `app/conversation/[id].tsx` | **MISSING** — directory exists, no file |
| `supabase/functions/create-payment-intent/` | **MISSING index.ts** |
| `hooks/useAuth.ts` | Working |
| `lib/supabase.ts` | Working |
| `components/twirl/*` | Working design system components |
| `eas.json` | **MISSING** |

### What's confirmed absent
- Gluestack: not in `package.json`, not imported anywhere — no action needed
- `app/conversation/[id].tsx` — blocking US-01
- `supabase/functions/create-payment-intent/index.ts` — blocking US-03
- `eas.json` — blocking US-06

---

## Component Design

### `app/conversation/[id].tsx`

```typescript
// State
conversationId: string        // from route params
messages: Message[]           // fetched + realtime appended
newText: string               // controlled input
loading: boolean
otherUser: { id, full_name }
itemTitle: string

// Data shape (messages table)
type Message = {
  id: string
  sender_id: string
  text: string
  created_at: string
}

// Supabase realtime
supabase
  .channel(`conv:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, payload => setMessages(prev => [...prev, payload.new as Message]))
  .subscribe()

// On send
await supabase.from('messages').insert({ conversation_id, sender_id: user.id, text: newText })
await supabase.from('conversations').update({
  last_message: newText,
  last_message_at: new Date().toISOString(),
  [isUser1 ? 'unread_user2' : 'unread_user1']: supabase.rpc('increment', ...)
}).eq('id', conversationId)

// On mount — mark read
await supabase.from('conversations').update({
  [isUser1 ? 'unread_user1' : 'unread_user2']: 0
}).eq('id', conversationId)
```

**Layout:**
- Header: `← back | *item title* | other_user name`
- FlatList (inverted=false, ref for scroll-to-bottom on new message)
- Each bubble: right-aligned pink for `sender_id === user.id`, left-aligned cream otherwise
- Timestamp below each bubble (formatted relative)
- Input bar: sticky bottom, TextInput + send icon button

---

### `supabase/functions/create-payment-intent/index.ts`

```typescript
// Deno Edge Function
import Stripe from 'npm:stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

Deno.serve(async (req) => {
  const { rental_id, amount, deposit } = await req.json()

  // Verify rental exists in Supabase (service role client)
  // Create PaymentIntent for rental amount
  const paymentIntent = await stripe.paymentIntents.create({
    amount,          // cents
    currency: 'usd',
    capture_method: 'automatic',
    metadata: { rental_id }
  })

  // Create SetupIntent for deposit hold
  const setupIntent = await stripe.setupIntents.create({
    metadata: { rental_id, type: 'deposit', deposit_amount: deposit }
  })

  return new Response(JSON.stringify({
    paymentIntentClientSecret: paymentIntent.client_secret,
    depositIntentClientSecret: setupIntent.client_secret
  }))
})
```

**Env vars required in Supabase Edge Function settings:**
- `STRIPE_SECRET_KEY` — Stripe secret key (sandbox: `sk_test_...`)
- `SUPABASE_SERVICE_ROLE_KEY` — for server-side DB reads

---

### `supabase/functions/create-connect-account/index.ts`

```typescript
// Creates a Stripe Express account and returns the onboarding URL
const account = await stripe.accounts.create({ type: 'express', country: 'US' })
const link = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${APP_URL}/profile`,
  return_url: `${APP_URL}/profile?connected=true`,
  type: 'account_onboarding'
})

// Save account.id to profiles.stripe_account_id
await supabaseAdmin.from('profiles').update({ stripe_account_id: account.id }).eq('id', user_id)

return new Response(JSON.stringify({ url: link.url }))
```

---

### `app/(tabs)/messages.tsx` — Unread Fix

Current broken query:
```typescript
.select(`id, last_message, last_message_at, unread_count, ...`)
```

Fixed query:
```typescript
.select(`id, last_message, last_message_at, unread_user1, unread_user2, ...`)
```

Fixed display logic (after shaping):
```typescript
const shaped = (data ?? []).map((c: any) => ({
  ...c,
  other_user: c.user1.id === user!.id ? c.user2 : c.user1,
  item: c.items,
  unread_count: c.user1_id === user!.id ? c.unread_user1 : c.unread_user2
}))
```

---

### `eas.json`

```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "ios": { "buildConfiguration": "Release" }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "..." }
    }
  }
}
```

---

## Priority Ordering (Council Verdict)

**The Skeptic** flagged: "If the edge function fails silently, we won't know until someone tries to pay on a real device." → Add explicit error logging to edge functions.

**The Operator** says: conversation route first — it's pure frontend, zero external dependency, ships in a day.

**The Accountant** notes: EAS requires an Apple Developer account ($99/yr). Confirm this exists before scheduling build work.

**VERDICT:**

| # | Item | Est. Hours | Blocks |
|---|---|---|---|
| 1 | Fix `messages.tsx` unread query | 0.5h | US-02 |
| 2 | Build `conversation/[id].tsx` | 4h | US-01 |
| 3 | Deploy `create-payment-intent` Edge Function | 2h | US-03 |
| 4 | iPhone runtime test (prebuild + pod install + device) | 2h | US-05 |
| 5 | Add Stripe Connect onboarding to profile | 3h | US-04 |
| 6 | `eas.json` + EAS build + TestFlight | 2h | US-06 |
| 7 | Audit `list.tsx`, `rentals.tsx`, `profile.tsx` | 2h | completeness |

**Total: ~15.5h across 13 days. Feasible with 1–2 focused sessions.**

---

## Environment Variables Required

```
# .env (local, never commit)
EXPO_PUBLIC_SUPABASE_URL=https://qlulzatkhgblorbjndsz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=https://qlulzatkhgblorbjndsz.supabase.co/functions/v1
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Supabase Edge Function env (set in Supabase dashboard)
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `react-native-worklets` 0.5.1 / `reanimated` 4.1.1 native crash | Medium | Run `expo prebuild --clean` and verify pod compatibility on day 1 |
| Supabase realtime not enabled on `messages` table | Medium | Enable in dashboard before testing conversation screen |
| Apple Developer account not active | Low | Confirm before scheduling EAS build |
| Stripe Connect requires business verification | Low | Use sandbox Express accounts for MVP |
| `unread_user1`/`unread_user2` columns don't exist yet | Unknown | Query DB schema directly to confirm before writing fix |
