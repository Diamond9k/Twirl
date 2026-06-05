# Feature Specification: Agent OS Game

**Feature Branch**: `003-agent-os-game`
**Created**: 2026-05-22
**Status**: In Progress — Phase 2 complete
**Repo**: `~/cooperbrain-os/` at `https://brain.twirl.rentals/hq`
**Product**: Steam-quality pixel-art RPG wrapping Cooper's entire AI infrastructure

---

## Vision

Every real business event — a Twirl rental, a relay cycle, a GitHub PR merge, a vault note — becomes XP in a live game. Cooper navigates a 5-room space station as Commander, clicking into departments that each map to a real infrastructure layer. NPCs are live agents. Terminals show real feeds. The game IS the dashboard.

End state: Electron-wrapped desktop app, sold on WHOP as a $197 course + $29/mo community. TikTok viral content demonstrates the concept.

---

## User Stories

### Story 1 — Enter a Room and See Live Agents (P1)

Cooper clicks TWIRL room on the station map. Camera zooms in. 5 NPCs idle in the Clothing Store. Status dots reflect actual relay feed activity. One NPC has a thought bubble showing the last relay message tagged "twirl".

**Acceptance Criteria**:
1. Click room → camera pan + zoom → room scene launches < 700ms
2. NPCs load with correct dept tint and idle animation
3. Status dot = green if relay has twirl-tagged message in last 60s, amber otherwise
4. Thought bubble auto-appears with actual relay message content (truncated to 60 chars)
5. ESC or ← BACK exits room, camera zooms back out cleanly

---

### Story 2 — Commander Panel Shows Real Level + XP (P1)

The Commander Panel floats left on `/hq`. It shows Cooper's actual level (LV.4 Commander), real XP total from Supabase `xp_events`, an animated XP bar, and 3 active missions with live progress bars.

**Acceptance Criteria**:
1. `/api/hq-status` returns live data: `{ level, levelName, xp, xpNext, missions[] }`
2. XP bar fills to correct % without hardcoded values
3. Missions pull from Supabase and show real progress %
4. Panel polls every 30s; XP bar animates on delta
5. Level name matches: Intern/Analyst/Agent/Commander/Director/VP/Executive/President/Founder/CEO

---

### Story 3 — Business Event Grants XP (P1)

A Twirl rental completes in Supabase. Within 60 seconds, the Commander Panel XP bar increments by 50. A "+50 XP" particle burst fires from the TWIRL room module on the station map.

**Acceptance Criteria**:
1. Supabase realtime subscription on `rentals` fires on INSERT
2. `xp_events` record inserted: `{ event_type: "rental_completed", xp: 50, ts }`
3. EventBridge emits `xp:gain` with amount
4. Phaser tween: room module glows + "+50 XP" text floats up and fades
5. Commander Panel total updates without page reload

---

### Story 4 — Relay Phone Call Visualization (P2)

A relay message fires from MAC to COMPUTER1. An NPC in the TWIRL hallway picks up a phone sprite. A glowing dot travels the corridor line toward the FORGE room. The FORGE NPC answers the phone. Both NPCs return to idle after 3 seconds.

**Acceptance Criteria**:
1. Relay event captured from `/api/agent-feed`
2. Sending NPC plays `_phone` animation
3. A Phaser Graphics dot travels the corridor path over 1.5s
4. Receiving NPC plays `_phone` animation
5. Both NPCs return to idle; bubble shows message summary

---

### Story 5 — Click NPC → Agent Panel Slides In (P1)

Cooper clicks the TWIRL LEAD NPC. A React panel slides in from the right showing: dept, role, live relay feed filtered to twirl-tagged messages, last 5 XP events sourced from that dept, and a status history sparkline.

**Acceptance Criteria**:
1. `EV_NPC_SELECTED` emitted with agentId, name, dept
2. Panel renders within 200ms of click
3. Relay feed shows last 10 messages tagged with dept
4. Last 5 XP events from that dept shown with timestamps
5. Panel closes on ✕ click or clicking another NPC

---

### Story 6 — Terminal Click Opens Live Overlay (P2)

Cooper clicks the RELAY terminal in TWIRL room. A React overlay opens showing the last 20 relay messages tagged "twirl" in a scrollable feed, auto-refreshing every 5s.

**Acceptance Criteria**:
1. `terminal:clicked` EventBridge event carries `{ roomId, type }`
2. React overlay renders with correct filter per room
3. FORGE terminal shows: Ollama model list + Tailscale status + latency
4. FACTORY terminal shows: last 5 GitHub commits + n8n pipeline status
5. Overlay dismisses on click-outside or ESC

---

### Story 7 — Level Up Animation (P2)

Cooper's XP crosses the LV.5 threshold (6,000 XP). The Commander Panel title flashes. A Phaser particle burst fires from the center of the station map. A full-screen "LEVEL UP" banner renders for 2 seconds with the new title.

**Acceptance Criteria**:
1. Level threshold detection in `/api/hq-status` or client-side XP delta
2. EventBridge emits `commander:levelup` with new level data
3. Phaser: white particle burst + screen flash
4. React: full-screen banner with new LV + title, fades after 2s
5. Commander Panel title updates to new level name

---

### Story 8 — Electron Desktop App (P2)

Cooper runs `Agent OS.app` on his Mac. The game opens in a borderless 1280×720 window. The system tray shows a small status dot. A desktop notification fires when a Twirl rental completes ("TWIRL rental +50 XP").

**Acceptance Criteria**:
1. `npm run electron:build` produces `.dmg` (macOS) and `.exe` (Windows)
2. Window: 1280×720, frameless, always-on-top optional
3. System tray: colored dot (green=live, red=relay down)
4. Desktop notification on `xp:gain` events above 100 XP
5. Auto-updater checks for new version on launch

---

### Story 9 — WHOP Monetization Page (P3)

Someone finds Agent OS on TikTok. They click the link in bio. They land on whop.com/agent-os. The page shows the game demo video, the $197 course breakdown (10 modules = 10 phases of this build), and the $29/mo community option.

**Acceptance Criteria**:
1. WHOP product created with correct pricing tiers
2. $197 course: "Build Agent OS" — 10 recorded modules
3. $29/mo: "Agent OS Command" community with weekly relay dump
4. WHOP webhook → Supabase → XP event (new member = +500 XP "Recruiter" badge)
5. Course modules match each phase of this spec

---

## Out of Scope (V1)

- Multi-user (one Cooper only)
- Mobile-responsive game view
- Custom tilemap editor / Tiled integration
- Public leaderboard
- Multiplayer relay visualization
- Windows NPC characters (LPC layers — available, not V1)

---

## Technical Constraints

1. All Phaser code inside `dynamic(ssr:false)` boundary — zero SSR violations
2. EventBridge never imports Phaser (SSR-safe SimpleEmitter)
3. `EventBridge.off()` in every scene `shutdown` event — no listener leaks
4. `AbortSignal.timeout(3000)` on all relay/VPS fetches
5. `OBSIDIAN_TOKEN` only via `process.env.OBSIDIAN_TOKEN` — never hardcoded
6. Electron wraps the deployed URL or local Next.js — not a separate codebase
7. XP events are append-only in Supabase — never delete, calculate totals via SUM

---

## Asset Inventory (wired as of Phase 2)

| Asset | File | Used In |
|---|---|---|
| TWIRL bg | `room_twirl_bg.png` 512×320 | TwirlRoomScene |
| SYSTEM bg | `room_system_bg.png` 512×320 | SystemRoomScene |
| FORGE bg | `room_forge_bg.png` 512×320 | ForgeRoomScene |
| FACTORY bg | `room_factory_bg.png` 512×320 | FactoryRoomScene |
| COMMAND bg | `room_command_bg.png` 512×320 | CommandRoomScene |
| Hallway sheet | `room_hallway.png` 512×2496 | Phase 8 |
| Adam run | `Adam_run_16x16.png` 384×32 | All rooms — walk cycle |
| Adam idle | `Adam_idle_16x16.png` 64×32 | Phase 4 |
| Adam/Bob/Alex/Amelia phone | `*_phone_16x16.png` 144×32 | Phase 4 |
| Adam sit | `Adam_sit_16x16.png` 384×32 | Phase 4 |
| New Characters 48×48 (×3) | 576×768 | Phase 9 (custom NPCs) |
| LPC modular layers (36) | `lpc/*.png` | Phase 9 (custom commander) |
