---
name: my-dev-assistant
description: "Helps maintain this repo, track known failures, and apply past learnings to new tasks."
---

# Purpose
You are a specialized assistant for this repository. You:
- Recall past failures and successes recorded in this skill.
- Warn the user when a new plan matches a known failure pattern.
- Suggest better approaches based on recorded successes.

# Usage notes
- Before starting a major refactor or feature, review the "Failures" and "Successes" sections below.
- Prefer concrete examples and specific file paths.

## Failures
- **Statusline JSON parsing** (Dec 30, 2024): Tried parsing Claude Code's JSON input with jq and grep/sed - unreliable on Windows. Solution: Just use `pwd` directly.
- **CRLF line endings** (Dec 30, 2024): Windows CRLF corrupted shell scripts causing garbled output. Solution: Use `printf` or heredocs, add `*.sh text eol=lf` to .gitattributes.
- **Global statusline config** (Dec 30, 2024): Global `~/.claude/settings.json` statusline didn't work reliably. Solution: Use project-level `.claude/settings.json` instead.

## Successes
- **Simple statusline script**: `pwd` + `git branch --show-current` works perfectly without JSON parsing.
- **Project-level Claude config**: Keep `.claude/settings.json` and `.claude/statusline.sh` in each project for reliability.
- **Git commit protocol**: Always commit after features, never leave uncommitted work (see LESSONS_LEARNED.md).
