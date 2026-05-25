# Research: Blueprint OS v0.3 Full System Revamp

**Phase 0 Output** | **Date**: 2026-05-25 | **Feeds**: plan.md → tasks.md

> Per Blueprint OS PG.08 (Research Agent System): "Research before spec. Spec before code."
> Trigger: multiple unknown states across 9 domains. Parallel sub-agents dispatched on each.
> This brief resolves all NEEDS CLARIFICATION before any build task begins.

---

## Domain 1: CLAUDE.md / Blueprint OS

**Question**: Does the current CLAUDE.md already contain Blueprint OS v0.3 protocols?

**Finding**: Current CLAUDE.md contains Blueprint OS v0.2 structure — session protocol exists but lacks: Define Gate, Ralph Loop steps, 10-dimension rubric, Token Efficiency rules (R-TOKEN-1 through R-TOKEN-5), 12 Never-Break rules verbatim, and speculative execution protocol.

**Decision**: Full rewrite using Blueprint OS v0.3 PDF (~/Downloads/BLUEPRINT_OS_MASTER.pdf) as source of truth.

**Rationale**: Partial protocols are worse than none — they create false confidence. R-001–R-009 all require v0.3 content.

**Alternatives considered**: Surgical append-only edit — rejected because v0.2 structure conflicts with v0.3 (e.g., R-numbers written after diff instead of before).

---

## Domain 2: Twirl App State

**Question 1**: Is create-payment-intent empty or implemented?

**Finding**: IMPLEMENTED. `supabase/functions/create-payment-intent/index.ts` is ~90 lines — full Stripe PaymentIntent creation, deposit hold, auth verification, Supabase update. CLAUDE.md was outdated on this point.

**Decision**: Task is deploy + verify (supabase functions deploy), not implement.

---

**Question 2**: Is the unread_count schema drift fixed?

**Finding**: FIXED. messages.tsx line 58: `unread_count: viewerIsUser1 ? c.unread_user1 : c.unread_user2` — correctly maps the schema columns. The CLAUDE.md bug report was stale.

**Decision**: Task becomes "verify mapping holds under load" — not a fix.

---

**Question 3**: What is the EAS submission failure root cause?

**Finding**: Build #3 (f615ddf8) FINISHED with status STORE. .ipa artifact exists at EAS CDN. The failure was in the App Store Connect submission step, not the build. Latest build is on commit ccff434 (not the most recent commit 3a9cc7d with design token fixes).

**Decision**: Resubmit using the most recent completed .ipa OR trigger a new build from latest commit (3a9cc7d) to include all bug fixes before submitting.

**Recommended path**: New build from 3a9cc7d (includes tab redesign, design tokens, bug fixes) → then submit. Do not submit stale .ipa.

**Rationale**: App Store reviewers will see the app. The current .ipa is missing the Tab redesign and design tokens from the most recent commit. Build now, submit clean.

---

**Question 4**: Does fraunces have zero imports?

**Finding**: CONFIRMED ZERO IMPORTS. grep across all .ts/.tsx files returned nothing.

**Decision**: Remove `@expo-google-fonts/fraunces` from package.json. Verify with `npm install` after removal.

---

## Domain 3: MCP Server State

**Question**: What MCPs are currently configured and what's missing?

**Finding**: Current mcp.json has 7 entries: github, supabase, stripe, hostinger-mcp, higgsfield, codex, code-review.

**Missing**: Obsidian MCP (needs local REST API block), Manus MCP (needs API key first).

**Note**: The spec said "5 live MCPs" — actual count is 7 (higgsfield and code-review are also configured). These 7 are already present. Adding Obsidian and Manus brings total to 9.

**Decision**: Add Obsidian MCP block using community MCP server that wraps the REST API. Add Manus MCP block as placeholder with API key env var until key is obtained.

**Obsidian MCP**: Use `npx obsidian-mcp-server` or the REST API bridge approach via `~/.cooperbrain/obsidian-bridge.mjs` (already exists on disk).

**Rationale**: obsidian-bridge.mjs already written — wire it as the MCP command rather than installing a new package.

---

## Domain 4: Obsidian Vault

**Question**: Is the REST API live and is Active/Sprint.md current?

**Finding**: REST API LIVE (confirmed at session start — curl returned vault listing). Active/Sprint.md EXISTS and is current (post-deadline sprint with open items documented).

**Decision**: Active/Sprint.md needs updating to reflect post-revamp priorities, not creating from scratch. Session log protocol (Sessions/YYYY-MM-DD.md) needs to be written at this session's end.

---

## Domain 5: CooperBrain Connections

**Question**: What exists in ~/.cooperbrain/?

**Finding**: `~/.cooperbrain/` EXISTS with: agent-loop.log, agent-loop.py, connections.md, obsidian-bridge.mjs, sms.sh. Not empty — prior work done.

**Decision**: `manus.py` needs to be created (different from agent-loop.py — Manus-specific dispatcher). RAG at `~/cooperbrain-rag/` is fully missing — needs install from scratch.

---

## Domain 6: Blueprint OS HTML

**Question**: Does a prior Blueprint OS HTML exist?

**Finding**: No Blueprint OS HTML exists at ~/Desktop/. The Cloud OS files (agent-os, creative-os, life-os, cooperbrain-os) are at `~/` but none of them IS Blueprint OS. This is a new build.

**Decision**: Build from PDF. Source: `~/Downloads/BLUEPRINT_OS_MASTER.pdf` (15 pages, v0.3 FINAL).

**Visual spec from PDF**:
- Grid paper background (cream/tan)
- Monospace font throughout (matches terminal aesthetic)
- Color coding: blue boxes = Define, green boxes = Build/Pass, red boxes = Critical, orange = Warning
- Each page = one section with `//` comment-style headers
- Machine-readable text layer required (no content trapped in images)

---

## Domain 7: Cloud OS Audit

**Question**: Do all 4 HTML files exist and open cleanly?

**Finding**: All 4 CONFIRMED on disk: `~/agent-os.html`, `~/creative-os.html`, `~/life-os.html`, `~/cooperbrain-os.html`. File sizes: agent-os.html (42KB), cooperbrain-os.html (per memory — built in prior session).

**Decision**: Audit each for JS errors and Blueprint OS v0.3 architecture consistency. Flag any that reference the old 2-layer or 4-layer architecture instead of v0.3's Neuro/Agent/Skill 3-layer.

---

## Domain 8: ScrapYard

**Question**: Is NOWPayments integration a config change or a code change?

**Finding**: ScrapYard is at scrapyard.to — 11 games live per sprint notes. NOWPayments requires an API key and a payment button/webhook. This requires finding the ScrapYard codebase on disk.

**Decision**: Locate ScrapYard codebase, identify the payment integration point, add NOWPayments key and endpoint. If codebase not on local disk, document as blocked on Cooper locating it.

**Confidence**: MEDIUM — depends on ScrapYard code being accessible locally.

---

## Domain 9: CooperBrain OS

**Question**: Is cooperbrain-os.html already built?

**Finding**: `~/cooperbrain-os.html` EXISTS on disk. Prior session built it. The 002-cooperbrain-os spec has tasks.md with all phases (T001–T040+) all UNCHECKED — but that spec describes a Next.js app (multi-file, Supabase, Drizzle). The existing file at `~/cooperbrain-os.html` is a single-file HTML version built in a different session.

**Decision**: Audit existing `~/cooperbrain-os.html` — verify it covers all 7 phases from spec. If significant gaps exist, fill them. This is audit + patch, not rebuild.

**Alternatives considered**: Rebuild as Next.js app per tasks.md — rejected because scope exceeds this revamp's budget and the HTML version is already usable.

---

## Confidence Summary

| Domain | Confidence | Risk |
|--------|------------|------|
| CLAUDE.md rewrite | HIGH 9/10 | PDF is complete, no ambiguity |
| Twirl EAS resubmit | HIGH 8/10 | Build works, new build needed from latest commit |
| MCP config | HIGH 9/10 | obsidian-bridge.mjs already exists |
| Obsidian vault | HIGH 9/10 | API live, file exists |
| CooperBrain connections | MED 6/10 | Manus key is external dependency |
| Blueprint OS HTML | HIGH 8/10 | PDF is complete source |
| Cloud OS audit | HIGH 9/10 | Files exist, audit is read-only |
| ScrapYard | MED 5/10 | Codebase location unknown |
| CooperBrain OS | HIGH 8/10 | File exists, audit path is lower risk |
