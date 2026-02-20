---
name: tdd
description: Enforce Test-Driven Development with strict Red-Green-Refactor cycle using Playwright integration tests. Trigger with /tdd or manually invoke when implementing new features. Does NOT auto-trigger - must be explicitly invoked.
---

# TDD Integration Testing (Playwright)

Enforce strict Test-Driven Development using the Red-Green-Refactor cycle with dedicated subagents for context isolation.

## Why Subagents?

Each phase runs in a separate context to prevent "context pollution" — the test writer can't see implementation plans, so tests reflect actual requirements rather than anticipated code structure.

## Mandatory Workflow

Every feature MUST follow this strict 3-phase cycle. Do NOT skip phases.

### Phase 1: RED - Write Failing Test

🔴 **RED PHASE**: Delegating to tdd-test-writer...

Invoke the `tdd-test-writer` subagent with:
- Feature requirement from user request
- Expected user behavior to test
- Relevant component/page locations

The subagent returns:
- Test file path
- Failure output confirming test fails
- Summary of what the test verifies

**Do NOT proceed to Green phase until test failure is confirmed.**

### Phase 2: GREEN - Make It Pass

🟢 **GREEN PHASE**: Delegating to tdd-implementer...

Invoke the `tdd-implementer` subagent with:
- Test file path from RED phase
- Feature requirement context
- Failure output so implementer knows what to target

The subagent returns:
- Files modified
- Success output confirming test passes
- Implementation summary

**Do NOT proceed to Refactor phase until test passes.**

### Phase 3: REFACTOR - Improve

🔵 **REFACTOR PHASE**: Delegating to tdd-refactorer...

Invoke the `tdd-refactorer` subagent with:
- Test file path
- Implementation files from GREEN phase

The subagent returns either:
- Changes made + test success output, OR
- "No refactoring needed" with reasoning

**Cycle complete when refactor phase returns.**

## Multiple Features

Complete the full cycle for EACH feature before starting the next:

```
Feature 1: 🔴 → 🟢 → 🔵 ✓
Feature 2: 🔴 → 🟢 → 🔵 ✓
Feature 3: 🔴 → 🟢 → 🔵 ✓
```

## Phase Violations

Never:
- Write implementation before the test
- Proceed to Green without seeing Red fail
- Skip Refactor evaluation
- Start a new feature before completing the current cycle

## Test Infrastructure

- Framework: Playwright
- Test dir: `./tests/`
- Config: `playwright.config.ts`
- Base URL: `http://localhost:3007` (Playwright's own dev server)
- Run single test: `npx playwright test tests/<file>.spec.ts --project=chromium`
- Auth: Tests use saved auth state from `tests/.auth/user.json`
- Helpers: `tests/helpers/` for shared test data and utilities

## Clean Build Gate

After the full cycle completes, run:
```bash
rm -rf .next && npm run build
```
Only report success if the build passes.
