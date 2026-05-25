# Quickstart: Blueprint OS v0.3 Full System Revamp

**How to execute this revamp** | Branch: `001-blueprint-os-revamp`

---

## Prerequisites (verify before starting)

```bash
# Obsidian must be running
curl -sk -H "Authorization: Bearer $OBSIDIAN_TOKEN" https://127.0.0.1:27124/vault/

# EAS must be logged in
eas whoami

# Supabase CLI must be available
supabase --version

# PDF must be on disk
ls ~/Downloads/BLUEPRINT_OS_MASTER.pdf
```

---

## Execution Order

Per Blueprint OS PG.03, BUILD phase: parallel within tiers. ADVERSARIAL REVIEWER at each boundary.

### Tier 0 — No blockers (run in parallel)

```bash
# T01: CLAUDE.md rewrite
# Tell Claude Code: "Rewrite CLAUDE.md using Blueprint OS v0.3 PDF as source"
# Source: ~/Downloads/BLUEPRINT_OS_MASTER.pdf
# Target: ~/Twirl-Hub/repo/Twirl/CLAUDE.md + ~/CLAUDE.md

# T02: EAS — trigger new build from latest commit, then submit
eas build --platform ios --profile production
# After build: eas submit --platform ios --latest

# T03: Browse screen search
# Edit: app/(tabs)/browse.tsx — restore TextInput search bar

# T04: Remove fraunces dep
# Edit: package.json — remove @expo-google-fonts/fraunces
# Then: npm install

# T05: Deploy payment intent
supabase functions deploy create-payment-intent

# T07: Add MCP blocks to Cursor
# Edit: ~/.cursor/mcp.json — add obsidian + manus blocks per contracts/mcp-config-schema.md

# T08: Update Obsidian sprint
# curl PUT to https://127.0.0.1:27124/vault/Active/Sprint.md

# T10: Build Blueprint OS HTML
# Source: ~/Downloads/BLUEPRINT_OS_MASTER.pdf
# Target: ~/Desktop/blueprint-os-v2.html

# T11: Cloud OS audit
# Open each: ~/agent-os.html, ~/creative-os.html, ~/life-os.html, ~/cooperbrain-os.html
# Check: JS errors, Blueprint OS v0.3 layer names (Neuro/Agent/Skill)
```

### Tier 1 — After Tier 0 adversarial gate passes

```bash
# T14: Stripe Connect payout
# Verify: supabase/functions/release-deposit/index.ts has 85% transfer logic
# Deploy: supabase functions deploy release-deposit

# T15: Verify MCPs live
# Restart Cursor → /mcp → test tool call on each new server

# T16: Session log write
# curl PUT to https://127.0.0.1:27124/vault/Sessions/2026-05-25.md

# T17: Install RAG
mkdir -p ~/cooperbrain-rag
# Requires: requirements.txt + ingest.py files (create if missing)
```

### Tier 2 — Blocked on Manus API key (Cooper's action)

```bash
# T18: Manus wrapper + MCP block
echo 'export MANUS_MCP_API_KEY="YOUR_KEY"' >> ~/.zshrc && source ~/.zshrc
# Then: create ~/.cooperbrain/manus.py
```

### Tier 3 — Final smoke tests

```bash
# T19: Run session start protocol cold
# T20: Stripe E2E test (test mode)
# T21: Fill 10-dimension rubric
```

---

## External Actions Required from Cooper

1. **Manus API key** — log in at manus.im, get key, run the echo command above
2. **NOWPayments key** — get from NOWPayments dashboard for ScrapYard

---

## Success Check

After all tiers complete, open Claude Code cold and give no instructions.
It should:
1. Run session start protocol automatically
2. Read Active/Sprint.md from Obsidian
3. Report connections status
4. Ask "What are we executing?"

If it does this → Blueprint OS v0.3 is live.
