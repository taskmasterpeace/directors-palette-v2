---
name: my-dev-assistant
description: "Helps maintain this repo, track known failures, and apply past learnings to new tasks."
---

# Purpose
You are a specialized assistant for this repository. You:
- Recall past failures and successes recorded in this skill.
- Warn the user when a new plan matches a known failure pattern.
- Suggest better approaches based on recorded successes.

# Usage
- Run `/preflight` before major tasks to check for known failure patterns
- Run `/retro` at end of session to capture learnings
- This file is the persistent memory - update it when you learn something new

# Common Mistakes Checklist
Before any task, verify:
- [ ] Not using CRLF line endings in shell scripts
- [ ] Not trying to parse JSON in statusline (use pwd)
- [ ] Committing work frequently (never >30 min uncommitted)
- [ ] Using project-level .claude/ config, not global
- [ ] Testing shell scripts with `bash script.sh` before committing

## Failures
- **Statusline JSON parsing** (Dec 30, 2024): Tried parsing Claude Code's JSON input with jq and grep/sed - unreliable on Windows. Solution: Just use `pwd` directly.
- **CRLF line endings** (Dec 30, 2024): Windows CRLF corrupted shell scripts causing garbled output. Solution: Use `printf` or heredocs, add `*.sh text eol=lf` to .gitattributes.
- **Global statusline config** (Dec 30, 2024): Global `~/.claude/settings.json` statusline didn't work reliably. Solution: Use project-level `.claude/settings.json` instead.
- **API HTML error parsing** (Jan 6, 2026): Recipe save returned "Unexpected token '<'" because API returned HTML error page but code assumed JSON. Solution: Check `response.headers.get('content-type')` before calling `response.json()`.
- **Missing model cases in buildModelSettings** (Jan 6, 2026): Z-Image Turbo and Seedream 4.5 params weren't passed to API because switch statement only had nano-banana cases. Solution: Add cases for ALL models in buildModelSettings().
- **tsc --noEmit doesn't catch ESLint** (Jan 6, 2026): Used `tsc --noEmit` to verify build, but Vercel failed because unused import broke ESLint. Solution: Always run `npm run build` (not just tsc) before committing.

## Successes
- **Simple statusline script**: `pwd` + `git branch --show-current` works perfectly without JSON parsing.
- **Project-level Claude config**: Keep `.claude/settings.json` and `.claude/statusline.sh` in each project for reliability.
- **Git commit protocol**: Always commit after features, never leave uncommitted work (see LESSONS_LEARNED.md).
- **Parallel agent research**: Spawned 6 agents to research Replicate API docs simultaneously - efficient for gathering model parameter info.
- **Plan mode for config changes**: Used plan mode before editing model configs - prevented breaking changes by mapping current state vs API reality first.
- **Service layer already handles conversions**: Before adding conversion logic, check if service layer already does it (e.g., aspect_ratio→width/height was already handled).
