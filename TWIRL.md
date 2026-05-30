# TWIRL — Continue Here

> **Say "Twirl" to resume.** This file is the single catch-up point for the Twirl launch project. Read it, then pick up where we left off.

## What Twirl is
Peer-to-peer clothing-rental marketplace for sorority girls at the University of Arkansas. "Airbnb for dresses." 15% platform commission. Expo/React Native app + Supabase backend + Stripe Connect payments.

## Where the project stands (as of 2026-05-30)
The app **looks** finished but the **marketplace economy does not work yet** — a 12-agent deep-dive (`TWIRL_OVERHAUL_REPORT.md`, 75 findings / 17 critical, verified against live Supabase `qlulzatkhgblorbjndsz`) proved: owners are never actually paid, the security deposit is never held, and there were live security holes. Strategy is **incremental hardening (not a rebuild)**, **test-mode-first** (prove the money flow with Stripe test keys before going live), targeting **one clean, safe public launch ~mid-June 2026** (a forced June 1 was explicitly rejected).

## Active project
- **Branch:** `006-twirl-launch-readiness`  ← make sure you're on it (`git switch 006-twirl-launch-readiness`)
- **Spec:** `specs/006-twirl-launch-readiness/spec.md` — 5 user stories, 26 requirements, 5 phases (money/security → payments → legal → polish → launch)
- **Full session history:** `specs/006-twirl-launch-readiness/SESSION-2026-05-29.md`
- **Authoritative findings:** `TWIRL_OVERHAUL_REPORT.md`

## ▶ Next step
Run **`/speckit-plan`** on the 006 spec → produces the technical plan (how to build payouts, the deposit hold, the crash-safe rent flow). Then `/speckit-tasks` → `/speckit-implement`, phase by phase, with founder approval at each irreversible gate.

## ⏳ Pending founder (Cooper) actions — only these are human-gated
1. **Run the lockdown SQL** in Supabase SQL Editor — content is `supabase/migrations/20260528_lockdown_money_rpcs.sql`. Closes the live earnings-forgery exploit. *(Written, not yet applied — Claude is safety-blocked from touching the live DB.)*
2. **Set `STRIPE_SECRET_KEY` = `sk_test_…`** in Supabase → Edge Functions → Secrets. Completes the test-mode switch (the app side is already on `pk_test_`).
3. **File the Arkansas LLC** (~$45) before any real money moves.
4. **Drive affiliate inventory seeding** (KKG/Abby, Pi Phi) — 50–100 real items. Slowest non-code dependency; start early.

## Rules of engagement
- Nothing that moves real money or real user data happens until it's proven in test mode.
- Every irreversible step (live DB change, real charge, App Store submission) waits for explicit founder approval.
- Cooper is non-technical — Claude does all code/docs/testing; explain in plain language.
- Keep `006-twirl-launch-readiness` separate from `005-foundation-integrity` (different project).
