# Contract: Session Protocol

**Source**: Blueprint OS v0.3 PG.09 — Memory System + Connections
**Machine deployment**: CLAUDE.md (embedded as executable instructions)

---

## Session Start — 7-Step Sequence (mandatory, ordered)

```
01  Verify connections: Obsidian → GitHub → Supabase → Stripe → EAS
    On fail: report failure, skip that domain, continue
    
02  Read CLAUDE.md → MEMORY.md → Sessions/latest → Active/Sprint.md
    
03  Cross-reference memory against this blueprint — flag conflicts or gaps
    
04  git status --short → CHECK UNSTAGED → GATE fires if prior-session changes detected
    GATE RULE: unstaged from prior session → write R-numbers from memory/spec BEFORE reading diff
    GATE RULE: git status = clean → proceed normally, write R-numbers from spec input
    
05  git pull — confirm current codebase state on disk
    
06  Smoke test — report what is working vs. broken RIGHT NOW
    
07  Report to Cooper:
    - what works
    - what is broken (#1 blocker)
    - days since May 24 launch deadline  
    - top task for this session
    → ASK: "What are we executing?"
```

---

## Session End — 7-Step Sequence (mandatory, ordered)

```
01  git add [specific files] && git commit -m "[Rn] summary"
    Prefix every commit with the R-number it satisfies
    
02  Write session log to Obsidian: Sessions/YYYY-MM-DD.md
    Include: what shipped, what's open, blockers, R-numbers completed
    
03  Update Active/Sprint.md
    - check off completed items
    - add new blockers discovered this session
    
04  Fill 10-dimension rubric — score honestly, not charitably
    
05  Self-critique: find 1–3 places blueprint reasoning was weak
    Classify: AMBIGUOUS / MISSING / WRONG_ORDER / OVER/UNDERSPECIFIED
    
06  Rewrite weak sections. Increment version number. Add changelog entry.
    
07  Return improved blueprint + filled rubric to Cooper
    Cooper sends to claude.ai for external adversarial sharpening
```

---

## Define Gate (new in v0.3)

**Source**: Blueprint OS v0.3 PG.05

```
Trigger: SESSION START → CHECK UNSTAGED (git status --short)

Condition A — git status = clean:
  No gate. Proceed: write R-numbers from spec input, architect, build.

Condition B — unstaged from current session:
  Write R-numbers. Read diff. Cross-validate diff against R-numbers.

Condition C — unstaged from prior session (RED):
  GATE FIRES: write R-numbers from memory/spec ONLY first.
  Then read diff. Validate diff against each R-number.

Condition D — age unknown (RED):
  Treat as Condition C. Gate fires. R-numbers before diff. Always.
```

**Why this rule exists** (per PDF PG.05): "The agreed=true contract bug would have been caught if spec existed first. With R-numbers written first, the spec would have required: Pay button disabled until checkbox ticked — agreed prop flows correctly. That criterion would have caught the bug immediately in validation. Spec-first means bugs are structural catches, not lucky observations."

---

## Ralph Loop (per Blueprint OS v0.3 PG.06)

```
Every build task runs this loop. Does not exit until PASS or circuit breaker fires.
Never guess. Never give up silently. Always diagnose before fixing.

READ    → requirement + all acceptance criteria loaded into full context
IMPL    → task executed exactly as specified in R-number — no improvisation
VALIDATE → test against every acceptance criterion — binary PASS or FAIL
PASS    → commit [Rn] · mark done · advance to next task
FAIL    → diagnose root cause specifically · fix · loop back to VALIDATE
3×FAIL  → CIRCUIT BREAKER: stop · report 3 resolution paths + confidence scores
```

**Convergence signals**:
- Same error 2+ attempts → re-read requirement from scratch
- Test passes / behavior wrong → rewrite criterion · re-run loop
- Fix breaks adjacent test → Council review before continuing
- 3 consecutive FAIL → 3 paths + confidence scores to Cooper
