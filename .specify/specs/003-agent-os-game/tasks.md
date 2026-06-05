# Tasks: Agent OS Game

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)
**Repo**: `~/cooperbrain-os/` | **Live**: `https://brain.twirl.rentals/hq`
**Created**: 2026-05-22

Legend: `[x]` done · `[ ]` todo · `[P]` parallel with previous · `[C]` Cooper's task

---

## Phase 0 — Scaffold ✅ COMPLETE

- [x] **T001** Install Phaser 3.90 via npm
- [x] **T002** Create `src/game/EventBridge.ts` — SSR-safe SimpleEmitter (no Phaser import)
- [x] **T003** Create `src/game/main.ts` — Phaser.Game config, RESIZE scale, 60fps
- [x] **T004** Create `src/app/hq/layout.tsx` — fullscreen, no BrainOS sidebar
- [x] **T005** Create `src/components/game/PhaserGame.tsx` — mounts game in useEffect, destroys on unmount
- [x] **T006** Create `src/app/hq/page.tsx` — dynamic(ssr:false) import, EventBridge listeners
- [x] **T007** Create stub `/api/hq-status/route.ts` — hardcoded LV.4/5700 XP
- [x] **T008** Add /hq to SidebarNav with Gamepad2 icon
- [x] **T009** Deploy → `curl https://brain.twirl.rentals/hq` → 200
- [x] **T010** `git tag v0.1-scaffold`

---

## Phase 1 — Station Map ✅ COMPLETE

- [x] **T011** Create `src/game/objects/RoomModule.ts` — glowing room card, dept color, agent dots
- [x] **T012** Create `src/game/scenes/StationMapScene.ts` — 5 rooms in cross layout
- [x] **T013** Add star particles (120 stars, random size/alpha)
- [x] **T014** Add rain overlay (35 diagonal lines, animated in update())
- [x] **T015** Draw corridor lines between COMMAND hub and 4 outer rooms
- [x] **T016** Implement camera pan + zoom transition on room click
- [x] **T017** Implement `resetCamera()` for exit transition
- [x] **T018** Add HUD top bar: "AGENT OS // STATION COMMAND" + 3 status pills
- [x] **T019** Add relay ticker at bottom bar

---

## Phase 2 — All Rooms + NPCs ✅ COMPLETE

- [x] **T020** Create `src/game/objects/AgentNPC.ts` — sprite container, bob, tint, status dot, click
- [x] **T021** Create `src/game/scenes/TwirlRoomScene.ts` — 5 NPCs, pink overlay, relay terminal
- [x] **T022** [P] Create `src/game/scenes/SystemRoomScene.ts` — 4 NPCs, purple, sys monitor terminal
- [x] **T023** [P] Create `src/game/scenes/ForgeRoomScene.ts` — 1 NPC, cyan, pulsing glow ring
- [x] **T024** [P] Create `src/game/scenes/FactoryRoomScene.ts` — 4 NPCs, orange, build board terminal
- [x] **T025** [P] Create `src/game/scenes/CommandRoomScene.ts` — 3 NPCs, cyan, scan lines
- [x] **T026** Update `BootScene.ts` — preload all assets (run/idle/phone/sit + room bgs + 48px sheets)
- [x] **T027** Update `main.ts` — register all 5 room scenes
- [x] **T028** Fix TwirlRoomScene scene key → "TWIRLRoomScene" to match lookup pattern
- [x] **T029** Create `OnboardingOverlay.tsx` — 6-step sequence, localStorage-gated, keyboard support
- [x] **T030** Wire onboarding into `page.tsx` — show on first visit, persist completion
- [x] **T031** Create `/assets-preview/page.tsx` — visual gallery of every asset at correct scale
- [x] **T032** Deploy + `git tag v0.2-twirl-room`

---

## Phase 3 — Live Data Pipeline 🔲 NEXT

**Est: ~3h**

- [ ] **T033** Create Supabase table: `xp_events(id, event_type, xp, dept, metadata, ts)`
- [ ] **T034** [P] Create Supabase table: `missions(id, label, target, current, xp_reward, active, updated_at)`
- [ ] **T035** Seed missions table with 3 initial missions (reach $3K revenue, 500 agent cycles, app store submit)
- [ ] **T036** Rewrite `/api/hq-status/route.ts` — fetch relay + Supabase XP sum in parallel with AbortSignal.timeout(3000)
- [ ] **T037** Implement `getLevelFromXP(xp)` utility — returns `{ level, levelName, xpNext, xpPercent }`
- [ ] **T038** Update `CommanderPanel.tsx` — remove hardcoded values, poll /api/hq-status every 30s
- [ ] **T039** Add XP bar CSS transition: `transition: width 0.8s ease` on bar fill element
- [ ] **T040** Update `StatusPills.tsx` — read `relayOnline/ollamaOnline/vpsOnline` from API, poll every 15s
- [ ] **T041** Wire relay messages from `/api/hq-status` → EventBridge `relay:tick` → StationMapScene ticker
- [ ] **T042** Test: visit /hq, verify Commander Panel shows real XP from Supabase (not hardcoded)
- [ ] **T043** Deploy + `git tag v0.3-live-data`

**Checkpoint**: Commander Panel shows real data. Status pills reflect actual relay/VPS status.

---

## Phase 4 — NPC Animation System 🔲

**Est: ~2h**

- [ ] **T044** Register idle animation for Adam using `adam_idle` sheet (frames 0–3, 4fps)
- [ ] **T045** [P] Register phone animations for Adam/Bob/Alex/Amelia (`*_phone_16x16.png`, frames 0–8, 8fps)
- [ ] **T046** Add `isOnPhone: boolean` state to AgentNPC
- [ ] **T047** Add `playPhone(message: string)` method to AgentNPC — plays phone anim, shows bubble, returns to idle after 3.2s
- [ ] **T048** Add dept-to-NPC routing in each RoomScene — on `relay:tick`, find matching NPC, call playPhone()
- [ ] **T049** Verify Bob/Alex/Amelia phone anims load and play correctly in browser
- [ ] **T050** Register sit animation for Adam using `adam_sit` sheet (for desk-working NPCs — optional enhancement)
- [ ] **T051** Deploy + verify phone animation fires when relay message arrives

**Checkpoint**: NPCs visually pick up phones when relay fires in their dept. Bubbles show real message content.

---

## Phase 5 — Agent Panel 🔲

**Est: ~2h**

- [ ] **T052** Create `src/app/api/agent-detail/route.ts` — accepts `?agentId=&dept=`, returns filtered relay + XP events
- [ ] **T053** Create `src/components/game/AgentPanel.tsx` — slide-in panel, dept badge, name, relay feed, XP history
- [ ] **T054** Import AgentPanel in `page.tsx`, render when `selectedNpc` state is set
- [ ] **T055** Style AgentPanel: `translateX(100%) → translateX(0)` CSS animation, dept-colored left border
- [ ] **T056** Wire relay feed: filter `relayMessages` from hq-status response by `npc.dept`
- [ ] **T057** Wire XP history: fetch from `/api/agent-detail` on panel open
- [ ] **T058** Add close on ✕ click + add close when clicking a different NPC
- [ ] **T059** Deploy + test: click each NPC in each room, verify panel opens with correct data

**Checkpoint**: Every NPC is clickable. Panel shows dept-filtered relay + XP events.

---

## Phase 6 — Terminal Overlays 🔲

**Est: ~2h**

- [ ] **T060** Create `src/app/api/terminal/[room]/route.ts` — dynamic route, returns data per room type
- [ ] **T061** Implement TWIRL handler — last 20 relay messages tagged "twirl"
- [ ] **T062** [P] Implement FORGE handler — relay status + parse Ollama data from relay history
- [ ] **T063** [P] Implement FACTORY handler — GitHub last 5 commits (GitHub API via GITHUB_TOKEN env var) + n8n last runs
- [ ] **T064** [P] Implement SYSTEM handler — VPS uptime, Docker container count, relay status
- [ ] **T065** [P] Implement COMMAND handler — full relay feed last 50 msgs, all depts
- [ ] **T066** Create `src/components/game/TerminalOverlay.tsx` — modal, monospace, scrollable, auto-refresh 5s
- [ ] **T067** Wire `terminal:clicked` EventBridge event in `page.tsx` → set `activeTerminal` state → render overlay
- [ ] **T068** Add ESC key handler + click-outside dismiss
- [ ] **T069** Deploy + test all 5 terminals

**Checkpoint**: Click terminal in any room → overlay opens with real filtered data. FORGE shows Ollama status.

---

## Phase 7 — XP Event System 🔲

**Est: ~3h**

- [ ] **T070** Create `src/app/api/xp-events/route.ts` — POST endpoint, validates payload, inserts to Supabase
- [ ] **T071** Add Supabase realtime subscription in `/api/hq-status` SSE stream OR in a webhook from Supabase `rentals` INSERT trigger
- [ ] **T072** **[C] Cooper's task** — create Supabase database webhook on `rentals` INSERT → POST to `/api/xp-events`
- [ ] **T073** Wire relay scan: in hq-status poll, scan last relay messages for "deploy" tag → insert xp_events row if new
- [ ] **T074** Wire relay cycle count: track relay history count, every 10 new messages → insert +5 XP row
- [ ] **T075** **[C] Cooper's task** — register WHOP webhook URL: `https://brain.twirl.rentals/api/xp-events`
- [ ] **T076** Wire WHOP webhook handler: validate signature, insert `whop_member_joined` +500 XP event
- [ ] **T077** Create `src/components/game/LevelUpBanner.tsx` — full-screen overlay, new level name, 2s duration
- [ ] **T078** Implement level-up detection in hq-status response — compare against previous level in localStorage
- [ ] **T079** Wire level-up: `commander:levelup` EventBridge event → Phaser particle burst → LevelUpBanner
- [ ] **T080** Add "+XP" float text in StationMapScene: spawn at room module, float up, fade over 1.2s
- [ ] **T081** Deploy + test: trigger a rental in Supabase directly, verify XP increments in Commander Panel

**Checkpoint**: Real rental → real XP → real Commander Panel update. Level up fires particle burst.

---

## Phase 8 — Hallway & NPC Movement 🔲

**Est: ~4h**

- [ ] **T082** Add `CorridorDot` logic to StationMapScene — creates Phaser Arc at source room, tweens to dest room
- [ ] **T083** Wire relay events to corridor dots: when `relay:tick` fires, parse from/to dept, spawn dot
- [ ] **T084** Map relay sender/receiver names to ROOM_DEFS IDs (MAC → SYSTEM, COOPER → FORGE, etc.)
- [ ] **T085** When corridor dot completes, emit `relay:delivered { toDept, message }` — target room NPC plays phone
- [ ] **T086** Install `npm install easystarjs @types/easystarjs`
- [ ] **T087** Create `src/game/scenes/HallwayScene.ts` stub — runs parallel to StationMapScene (Phase 8.5 full NPC movement)
- [ ] **T088** Wire corridor dot + phone animation as end-to-end sequence (send phone → dot travels → receive phone)
- [ ] **T089** Test with real relay messages: verify dot travels correct direction per message sender

**Checkpoint**: Relay messages create visible corridor dots on station map. Phone chain fires at both ends.

---

## Phase 9 — Sound & Visual Polish 🔲

**Est: ~3h**

- [ ] **T090** Source CC0 sound effects: sfxr.me or Freesound — whoosh, beep, chime, level-up fanfare, phone ring
- [ ] **T091** [P] Source CC0 ambient chiptune loop — 2–4 minute loop, < 1MB
- [ ] **T092** Add to BootScene preload: all .wav/.mp3 sound files
- [ ] **T093** Add `this.sound.play("whoosh")` in room enter/exit transitions
- [ ] **T094** Add `this.sound.play("beep")` on NPC hitZone pointerdown
- [ ] **T095** Add `this.sound.play("chime")` on xp:gain events
- [ ] **T096** Add `this.sound.play("levelup")` on commander:levelup event
- [ ] **T097** Add ambient music: `this.sound.play("ambient", { loop: true, volume: 0.25 })`
- [ ] **T098** Implement glow pulse tween on RoomModule border when XP event fires from that dept
- [ ] **T099** Implement "+50 XP" float text Phaser effect at room module position
- [ ] **T100** Improve rain particles: increase to 40 lines, add speed/alpha variation
- [ ] **T101** Create CRT scanline overlay: 1px horizontal stripe repeated PNG at 5% alpha over canvas
- [ ] **T102** FORGE glow ring: map ring radius to Ollama latency (fetch in FORGE terminal handler)
- [ ] **T103** Deploy + full playthrough: enter every room, trigger relay, verify all sound + visual feedback

**Checkpoint**: Game feels alive. Sound on every interaction. XP gains are visible. CRT vibe.

---

## Phase 10 — Electron Desktop App 🔲

**Est: ~3h**

- [ ] **T104** `npm install --save-dev electron electron-builder` in cooperbrain-os/
- [ ] **T105** Create `electron/main.js` — BrowserWindow 1280×720, frameless, load deployed URL
- [ ] **T106** Create `electron/preload.js` — contextBridge exposing ipcRenderer for notifications
- [ ] **T107** Create `electron/tray.js` — system tray with colored dot, poll /api/hq-status every 60s
- [ ] **T108** Wire EventBridge → ipcRenderer → main process notifications for XP events > 100
- [ ] **T109** Add `electron:dev` and `electron:build` scripts to package.json
- [ ] **T110** Configure electron-builder: appId `com.cooperbrain.agentos`, productName "Agent OS"
- [ ] **T111** Configure macOS build: `.dmg` target, icon `electron/assets/icon.icns`
- [ ] **T112** [P] Configure Windows build: `.nsis` target (runs from VPS Windows build environment)
- [ ] **T113** Test `npm run electron:dev` — app opens, loads /hq, game runs at 60fps
- [ ] **T114** Run `npm run electron:build` — produce `Agent OS-1.0.0.dmg`
- [ ] **T115** Install .dmg on Cooper's Mac — verify game launches, tray shows, notifications fire

**Checkpoint**: `Agent OS.app` runs natively on Mac. System tray reflects relay status. Notifications fire on rentals.

---

## Phase 11 — WHOP Monetization 🔲

**Est: ~2h + Cooper's tasks**

- [ ] **[C] T116** Create WHOP account at whop.com
- [ ] **[C] T117** Create product: "Agent OS Course" — $197 one-time, 10 modules
- [ ] **[C] T118** Create product: "Agent OS Command" — $29/mo community
- [ ] **T119** Write WHOP product description (Cooper reviews, Claude drafts)
- [ ] **T120** Record module 1 screen capture — Phase 0 Scaffold walkthrough
- [ ] **[C] T121** Record modules 2–10 (one per phase, 10–15 min each)
- [ ] **T122** Register WHOP webhook → `/api/xp-events` (POST on membership purchase)
- [ ] **T123** Test WHOP webhook end-to-end: test purchase → +500 XP fires → Commander Panel updates
- [ ] **T124** Create `whop.com/agent-os` landing page with game screenshot + course outline

**Checkpoint**: WHOP products live. Webhook wired. First test purchase grants XP.

---

## Phase 12 — TikTok Content Strategy 🔲

**Est: ~4h recording + editing**

- [ ] **[C] T125** Record TikTok #1 — station map overview, click TWIRL, show NPCs (record after Phase 2 — READY NOW)
- [ ] **[C] T126** Record TikTok #2 — NPC phone call visualization (record after Phase 4)
- [ ] **[C] T127** Record TikTok #3 — Level up with real revenue data (record after Phase 7)
- [ ] **[C] T128** Record TikTok #4 — Electron desktop app opening (record after Phase 10)
- [ ] **[C] T129** Record TikTok #5 — "The course is live" (record after Phase 11)
- [ ] **T130** Draft captions for all 5 TikToks — hook line + body + CTA
- [ ] **[C] T131** Post TikTok #1 (station map) — link in bio → WHOP waitlist or email capture
- [ ] **[C] T132** Post remaining TikToks on weekly cadence

**Checkpoint**: TikTok #1 posted. Link in bio captures leads.

---

## Running Totals

| Phase | Status | Tasks | Est Hours |
|---|---|---|---|
| 0 — Scaffold | ✅ Done | 10 | 2h |
| 1 — Station Map | ✅ Done | 9 | 2h |
| 2 — All Rooms | ✅ Done | 13 | 3h |
| 3 — Live Data | 🔲 Next | 11 | 3h |
| 4 — NPC Animations | 🔲 | 8 | 2h |
| 5 — Agent Panel | 🔲 | 8 | 2h |
| 6 — Terminal Overlays | 🔲 | 10 | 2h |
| 7 — XP System | 🔲 | 12 | 3h |
| 8 — Hallway + Movement | 🔲 | 8 | 4h |
| 9 — Sound + Polish | 🔲 | 14 | 3h |
| 10 — Electron App | 🔲 | 12 | 3h |
| 11 — WHOP | 🔲 | 9 | 2h + C |
| 12 — TikTok | 🔲 | 8 | 4h C |
| **TOTAL** | | **132 tasks** | **~35h** |

Cooper tasks `[C]` are marked separately — do not block engineering progress.
