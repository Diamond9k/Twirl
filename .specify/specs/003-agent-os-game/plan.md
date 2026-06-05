# Implementation Plan: Agent OS Game

**Spec**: [spec.md](spec.md) | **Tasks**: [tasks.md](tasks.md)
**Created**: 2026-05-22 | **Repo**: `~/cooperbrain-os/`
**Live URL**: `https://brain.twirl.rentals/hq`

---

## Current State (as of 2026-05-22)

| Done | Item |
|---|---|
| ✅ | Phaser 3.90 scaffold at /hq — canvas renders, 60fps |
| ✅ | StationMapScene — 5 clickable room modules, stars, rain |
| ✅ | TwirlRoomScene — 5 NPCs, pink bg, relay terminal |
| ✅ | SystemRoomScene — 4 NPCs, library bg, sys monitor terminal |
| ✅ | ForgeRoomScene — 1 NPC, basement bg, pulsing glow ring |
| ✅ | FactoryRoomScene — 4 NPCs, gym bg, build board terminal |
| ✅ | CommandRoomScene — 3 NPCs, conference bg, scan lines |
| ✅ | AgentNPC — idle bob, dept tint, status dot, click handler |
| ✅ | EventBridge — SSR-safe SimpleEmitter, proper off() cleanup |
| ✅ | OnboardingOverlay — 6-step COMMANDER sequence, localStorage-gated |
| ✅ | BootScene — preloads all assets (run/idle/phone/sit + all room bgs) |
| ✅ | Asset gallery — /assets-preview shows every sprite |
| ✅ | Deployed + live on VPS (Docker, brain.twirl.rentals) |

---

## Phase Roadmap A–Z

```
Phase 0  SCAFFOLD          ✅ DONE
Phase 1  STATION MAP       ✅ DONE
Phase 2  ALL ROOMS + NPCS  ✅ DONE
Phase 3  LIVE DATA         🔲 NEXT
Phase 4  NPC ANIMATIONS    🔲
Phase 5  AGENT PANEL       🔲
Phase 6  TERMINAL OVERLAYS 🔲
Phase 7  XP EVENT SYSTEM   🔲
Phase 8  HALLWAY + MOVEMENT🔲
Phase 9  SOUND + POLISH    🔲
Phase 10 ELECTRON APP      🔲
Phase 11 WHOP MONETIZATION 🔲
Phase 12 TIKTOK STRATEGY   🔲
```

---

## Phase 3 — Live Data Pipeline (~3h)

**Goal**: Commander Panel and status pills show real data. XP is read from Supabase. Relay feed is live.

### API Route: `/api/hq-status`

Fetches in parallel with `AbortSignal.timeout(3000)`:
- `GET http://76.13.110.174:7777/` → relay online status
- `GET http://76.13.110.174:7777/history/MAC` → last 20 messages
- `GET http://76.13.110.174:7777/history/COOPER` → Cooper PC messages
- Supabase: `SELECT SUM(xp) FROM xp_events` → total XP
- Supabase: `SELECT COUNT(*) FROM rentals` → rental count for missions

Returns:
```typescript
{
  level: number;
  levelName: string;
  xp: number;
  xpNext: number;
  xpPercent: number;
  relayOnline: boolean;
  ollamaOnline: boolean;
  vpsOnline: boolean;
  missions: { label: string; progress: number; xpReward: number }[];
  latestAchievement: { title: string; subtitle: string } | null;
  relayMessages: { from: string; to: string; content: string; ts: string }[];
}
```

### Supabase Schema (new tables)

```sql
CREATE TABLE xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  xp integer NOT NULL,
  dept text,
  metadata jsonb,
  ts timestamptz DEFAULT now()
);

CREATE TABLE missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  target integer NOT NULL,
  current integer DEFAULT 0,
  xp_reward integer NOT NULL,
  active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);
```

### Level Thresholds

```typescript
const LEVELS = [
  { lv: 1,  name: "Intern",     xp: 0      },
  { lv: 2,  name: "Analyst",    xp: 500    },
  { lv: 3,  name: "Agent",      xp: 1500   },
  { lv: 4,  name: "Commander",  xp: 3000   },
  { lv: 5,  name: "Director",   xp: 6000   },
  { lv: 6,  name: "VP",         xp: 10000  },
  { lv: 7,  name: "Executive",  xp: 16000  },
  { lv: 8,  name: "President",  xp: 25000  },
  { lv: 9,  name: "Founder",    xp: 40000  },
  { lv: 10, name: "CEO",        xp: 999999 },
];
```

### CommanderPanel update

- Remove hardcoded LV.4 / 5700 XP
- Poll `/api/hq-status` every 30s
- XP bar: CSS transition `width: ${xpPercent}%` on data change
- Missions: map from API response, calculate % progress
- Latest achievement: last completed milestone from Supabase

### RelayTicker update

- Already renders in StationMapScene bottom bar
- Wire to `/api/hq-status` response `relayMessages` array
- Pass into EventBridge `relay:tick` event → StationMapScene.setTickerMessages()
- Auto-scroll: new message = current message slides to next slot every 4s

### StatusPills update

- Already renders in React layer
- Poll `/api/hq-status` every 15s
- `relayOnline` → RELAY pill green/red
- `ollamaOnline` → OLLAMA pill green/red
- `vpsOnline` → VPS pill green/red

---

## Phase 4 — NPC Animation System (~2h)

**Goal**: NPCs use proper idle sheet. Phone animations play when relay messages fire. NPCs feel alive.

### AgentNPC updates

**Idle animation fix**: Currently freezes run sheet on frame 1. Adam has a dedicated `_idle` sheet (64×32 = 4 frames × 2 rows). Bob/Alex/Amelia fall back to run frame 1 (acceptable V1).

```typescript
// Adam gets proper idle
if (textureKey === "adam" && scene.textures.exists("adam_idle")) {
  scene.anims.create({
    key: "idle_adam",
    frames: scene.anims.generateFrameNumbers("adam_idle", { start: 0, end: 3 }),
    frameRate: 4, repeat: -1,
  });
}
```

**Phone animation**: When EventBridge fires `relay:tick` with a message that matches this NPC's dept:
1. Play `_phone` animation (9 frames, 2 dirs — use row 0 = facing down)
2. Show bubble: truncated message content
3. After 3s: return to idle

```typescript
// Phone anim sequence
private playPhone(message: string) {
  if (this.isOnPhone) return;
  this.isOnPhone = true;
  this.sprite.play(`phone_${this.def.textureKey}`);
  this.showBubble(message.slice(0, 55) + "...", 3000);
  this.scene.time.delayedCall(3200, () => {
    this.isOnPhone = false;
    this.sprite.play(`idle_${this.def.textureKey}`);
  });
}
```

**Routing logic** (in each RoomScene):
- Each NPC has a `dept` field
- When relay message arrives: check if `message.content` or `message.tags` includes dept
- Route to the first matching NPC's `playPhone()` method

### New phone animation registrations (BootScene or first room)

```typescript
const chars = ["adam", "bob", "alex", "amelia"];
chars.forEach(name => {
  scene.anims.create({
    key: `phone_${name}`,
    frames: scene.anims.generateFrameNumbers(`${name}_phone`, { start: 0, end: 8 }),
    frameRate: 8, repeat: 0,
  });
});
```

---

## Phase 5 — Agent Panel (~2h)

**Goal**: Click any NPC → React panel slides in with live data for that agent.

### AgentPanel.tsx (new component)

Located: `src/components/game/AgentPanel.tsx`

Data sources:
- Relay feed: filter `relayMessages` by NPC dept
- XP events: `SELECT * FROM xp_events WHERE dept = $dept ORDER BY ts DESC LIMIT 5`
- `/api/agent-detail?agentId=twirl-lead` route

Layout:
```
┌─────────────────────────┐
│ DEPT BADGE   ✕          │
│ NPC NAME                │
│ Role subtitle           │
├─────────────────────────┤
│ LIVE RELAY FEED         │
│ > from MAC: ...         │
│ > from COOPER: ...      │
├─────────────────────────┤
│ RECENT XP               │
│ rental +50  5m ago      │
│ relay cycle +5  12m ago │
├─────────────────────────┤
│ STATUS  ● ACTIVE        │
└─────────────────────────┘
```

Slide-in animation: CSS `transform: translateX(100%)` → `translateX(0)` in 200ms.

---

## Phase 6 — Terminal Overlays (~2h)

**Goal**: Each room's clickable terminal opens a React overlay with real data.

### TerminalOverlay.tsx (new component)

Receives `{ roomId, type }` from `terminal:clicked` EventBridge event.

| Room | Type | Data |
|---|---|---|
| TWIRL | relay | Last 20 relay messages tagged twirl |
| SYSTEM | monitor | System health: VPS/Docker/Relay/n8n status |
| FORGE | ollama | Ollama model list + inference latency + Tailscale status |
| FACTORY | build | Last 5 GitHub commits + n8n pipeline runs |
| COMMAND | ops | Full relay feed, all depts, unfiltered |

Layout: dark modal, monospace, scrollable, auto-refresh 5s. ESC to close.

### New API routes

- `GET /api/terminal/twirl` → relay history filtered to twirl
- `GET /api/terminal/forge` → `http://76.13.110.174:7777/` status + Ollama models from relay
- `GET /api/terminal/factory` → GitHub recent commits (via GitHub MCP or direct API) + n8n webhook log
- `GET /api/terminal/system` → system-health aggregated
- `GET /api/terminal/command` → full relay dump, last 50 messages

---

## Phase 7 — XP Event System (~3h)

**Goal**: Every real business event inserts an xp_events row and fires live XP gain to the game.

### XP Event Sources + Wiring

| Event | Trigger | XP | Mechanism |
|---|---|---|---|
| Twirl rental completed | Supabase realtime `rentals` INSERT | +50 | Supabase realtime subscription in `/api/hq-status` SSE |
| Edge function deployed | Relay message with tag "deploy" | +200 | Relay history scan in poll |
| Per 10 relay cycles | Relay history count milestones | +5 | Count mod 10 in poll |
| GitHub PR merged | GitHub webhook → `/api/xp-events` | +150 | GitHub webhook |
| Vault note written | Obsidian API write event | +20 | Poll Obsidian vault modified timestamps |
| App Store upload | EAS build status | +1000 | EAS webhook or poll |
| Agent directive sent | Relay DISPATCH tag | +10 | Relay history scan |
| WHOP member joined | WHOP webhook | +500 | WHOP webhook → `/api/xp-events` |

### `/api/xp-events` route (new)

Accepts POST from webhooks and internal calls:
```typescript
POST /api/xp-events
{ event_type, xp, dept?, metadata? }
→ INSERT INTO xp_events
→ emit via SSE or polling pickup
```

### Level-up Detection

In `/api/hq-status`: compare previous level (from Supabase `settings` table or derived from prior XP) against current. If crossed threshold → add `levelUp: true` to response. Client emits `commander:levelup` event.

---

## Phase 8 — Hallway & NPC Movement (~4h)

**Goal**: When a relay message fires, the sending NPC walks a path. A dot travels the corridor. The receiving NPC answers. The game makes communication visible.

### HallwayScene (or HallwayLayer in StationMapScene)

Option A (simpler): Draw corridor graph as Phaser Graphics in StationMapScene. NPCs never leave their room scenes. Only the "dot" travels.

Option B (full): HallwayScene runs parallel to StationMapScene. NPCs have exit/entry positions. When dispatched, NPC walks to door, hands off to hallway dot, receiving NPC walks from door.

**Decision**: Phase 8 = Option A (corridor dot only). Option B is Phase 8.5.

### Corridor Dot

```typescript
// When relay event fires for dept A → dept B:
const startPos = ROOM_DEFS.find(r => r.id === fromDept);
const endPos   = ROOM_DEFS.find(r => r.id === toDept);

const dot = this.add.arc(startPos.x, startPos.y, 4, 0, 360, false, 0x00ff88, 1);
this.tweens.add({
  targets: dot,
  x: endPos.x, y: endPos.y,
  duration: 1500,
  ease: "Power2",
  onComplete: () => {
    dot.destroy();
    EventBridge.emit("relay:delivered", { toDept, message });
  },
});
```

### EasyStar.js (Phase 8.5 — full pathfinding)

Install: `npm install easystarjs @types/easystarjs`

Usage in HallwayScene:
```typescript
const easystar = new EasyStar.js();
easystar.setGrid(collisionMap);
easystar.setAcceptableTiles([0]);
easystar.findPath(startX, startY, endX, endY, (path) => {
  // Tween NPC along path array
});
easystar.calculate();
```

---

## Phase 9 — Sound & Visual Polish (~3h)

**Goal**: The game feels like a real game. Every action has feedback.

### Sound

| Event | Sound |
|---|---|
| Room enter | 8-bit whoosh (150ms) |
| NPC click | Pixel beep (50ms) |
| XP gain | 3-note ascending chime |
| Level up | 8-bit fanfare (2s) |
| Phone ring | 2-pulse ring |
| Ambient | Chiptune loop (looped, 30% volume) |

Source: `public/assets/sounds/` — generate with sfxr.me or use CC0 chiptune packs.

### Visual

- **Rain particles**: current skeleton already in StationMapScene.update(). Improve: 40 lines, diagonal, speed variation
- **Room glow pulse**: on XP gain event, the relevant RoomModule border alpha sine-waves 3× then returns to base
- **"+XP" float**: Phaser Text object spawns at RoomModule center, floats up 40px, fades out over 1.2s
- **CRT overlay**: semi-transparent scanline texture over entire canvas (WebGL shader or 1px-stripe PNG)
- **FORGE glow ring**: radius maps to actual Ollama ping latency (20ms = small, 500ms = large)
- **Status dot pulse**: when relay fires, the source dept's status dot pulses green once

### Particle System

```typescript
// Level up burst
const particles = this.add.particles(cx, cy, "star_particle", {
  speed: { min: 100, max: 300 },
  angle: { min: 0, max: 360 },
  scale: { start: 0.6, end: 0 },
  lifespan: 800,
  quantity: 60,
  tint: 0x00d4ff,
});
this.time.delayedCall(900, () => particles.destroy());
```

---

## Phase 10 — Electron Desktop App (~3h)

**Goal**: `Agent OS.app` runs on Cooper's Mac as a native window.

### Structure

```
electron/
  main.js          ← main process: creates BrowserWindow
  preload.js       ← exposes ipcRenderer to renderer
  tray.js          ← system tray icon + menu
  updater.js       ← electron-updater
package.json       ← add "electron" + "electron-builder" devDeps
```

### main.js

```javascript
const win = new BrowserWindow({
  width: 1280, height: 720,
  frame: false,
  titleBarStyle: "hiddenInset",
  webPreferences: { preload: path.join(__dirname, "preload.js") },
});
// Load deployed URL or local dev
win.loadURL(process.env.AGENT_OS_URL || "https://brain.twirl.rentals/hq");
```

### System Tray

- Icon: 16×16 dot (green=relay live, red=relay down)
- Menu: "Open Agent OS", "Status: RELAY ●", "Quit"
- Poll `/api/hq-status` every 60s to update tray icon

### Desktop Notifications

```javascript
// From renderer via preload bridge
ipcRenderer.send("xp-gain", { amount: 50, source: "Twirl rental" });
// Main process:
ipcMain.on("xp-gain", (_, { amount, source }) => {
  new Notification({ title: `+${amount} XP`, body: source }).show();
});
```

### Build Pipeline

```json
"scripts": {
  "electron:dev":   "electron .",
  "electron:build": "electron-builder --mac --win"
},
"build": {
  "appId": "com.cooperbrain.agentos",
  "productName": "Agent OS",
  "mac": { "target": "dmg" },
  "win": { "target": "nsis" }
}
```

---

## Phase 11 — WHOP Monetization

**Goal**: The game generates revenue.

### Products

| Tier | Price | What |
|---|---|---|
| Agent OS Course | $197 one-time | 10 recorded modules, one per phase of this build |
| Agent OS Command | $29/mo | Community + weekly relay dump + early features |

### Course Curriculum (10 modules)

1. Scaffold — Phaser in Next.js, EventBridge, SSR-safe patterns
2. Station Map — RoomModule, camera, particles
3. Room Scenes — NPC sprites, dept tinting, tileset backgrounds
4. Live Data — Supabase XP events, relay API, Commander Panel
5. NPC Animations — phone calls, idle sheets, relay routing
6. Agent Panel — NPC click detail, filtered relay feed
7. Terminal Overlays — per-room data feeds, Ollama status
8. XP Wiring — webhooks, Supabase realtime, level system
9. Hallway Movement — corridor dots, EasyStar, pathfinding
10. Electron — desktop app, system tray, notifications

### WHOP Webhook → XP

```
POST /api/xp-events
{ event_type: "whop_member_joined", xp: 500, metadata: { email } }
```

Webhook URL registered in WHOP dashboard → inserts xp_events row → Cooper levels up IRL when the community grows.

---

## Phase 12 — TikTok Content Strategy

**Goal**: Viral content drives WHOP sales.

### Video Plan

| # | Hook | What to Show | Target |
|---|---|---|---|
| 1 | "I turned my AI biz into a video game" | Station map, click TWIRL, NPCs idle | @androooooooooo8 audience |
| 2 | "My AI agents make phone calls" | Relay message fires, NPC picks up phone, dot travels | Viral / curiosity |
| 3 | "My business gives me literal XP" | Twirl rental → +50 XP, Commander Panel animates | Founder audience |
| 4 | "It runs as a Mac app now" | Electron app opening, system tray, notification | Maker / indie hacker |
| 5 | "The course is live" | 30s tour of all phases, WHOP link | Conversion |

### Format

- Duration: 30–45s each
- Text overlay: white Press Start 2P font against game capture
- Voiceover: conversational, not rehearsed
- CTA: "link in bio" → whop.com/agent-os
- Post cadence: 1 per week, Tuesday evening

---

## Deploy Workflow (Every Phase)

```
1. Write code locally
2. npm run build → zero TypeScript errors
3. npm run dev → smoke test in browser
4. rsync -az --exclude .git --exclude node_modules --exclude .next ./ root@76.13.110.174:/opt/brainos/
5. ssh: docker compose build --no-cache && docker compose up -d
6. curl https://brain.twirl.rentals/hq → 200
7. git commit + tag (v0.X-phase-name)
```

---

## File Map — Remaining Files To Create

```
src/game/scenes/
  HallwayScene.ts             ← Phase 8 (corridor dot + optional NPC walk)

src/game/objects/
  CorridorDot.ts              ← Phase 8 (traveling relay dot)

src/components/game/
  AgentPanel.tsx              ← Phase 5 (NPC click detail)
  TerminalOverlay.tsx         ← Phase 6 (room terminal data)
  LevelUpBanner.tsx           ← Phase 7 (full-screen level up)

src/app/api/
  hq-status/route.ts          ← Phase 3 (UPDATE — real data, remove stubs)
  xp-events/route.ts          ← Phase 7 (POST endpoint for webhooks)
  terminal/[room]/route.ts    ← Phase 6 (per-room terminal data)
  agent-detail/route.ts       ← Phase 5 (NPC detail data)

electron/
  main.js                     ← Phase 10
  preload.js                  ← Phase 10
  tray.js                     ← Phase 10

public/assets/sounds/
  whoosh.wav                  ← Phase 9
  beep.wav                    ← Phase 9
  chime.wav                   ← Phase 9
  levelup.wav                 ← Phase 9
  ambient.mp3                 ← Phase 9
```

---

## Version Tags

| Tag | Phase | Description |
|---|---|---|
| v0.1-scaffold | Phase 0 | Canvas renders |
| v0.2-twirl-room | Phase 2 | All rooms + onboarding |
| v0.3-live-data | Phase 3 | Real XP + relay |
| v0.4-animations | Phase 4 | Phone calls + idle |
| v0.5-agent-panel | Phase 5 | NPC click detail |
| v0.6-terminals | Phase 6 | Terminal overlays |
| v0.7-xp-system | Phase 7 | Full XP wiring |
| v0.8-hallway | Phase 8 | Corridor movement |
| v0.9-polish | Phase 9 | Sound + particles |
| v1.0-electron | Phase 10 | Desktop app |
| v1.1-whop | Phase 11 | Monetized |
| v1.2-tiktok | Phase 12 | Content live |
