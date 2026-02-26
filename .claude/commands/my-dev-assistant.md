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
- **Wrong Replicate API param name for nano-banana-2** (Feb 26, 2026): Used `image` (single string) for reference images but the actual API param is `image_input` (array of URIs). Caused production outage — model silently ignored the wrong param so images generated without references. Solution: ALWAYS check Replicate API schema (`curl -H "Authorization: Bearer $TOKEN" https://api.replicate.com/v1/models/{owner}/{model}` → `latest_version.openapi_schema.components.schemas.Input`) before assuming param names. Never trust code comments like "accepts a single `image` input".
- **Config vs validator mismatch** (Feb 26, 2026): Updated `maxReferenceImages: 14` in config but forgot to update `validateNanoBanana2()` which still rejected >1. Config controls UI; validator controls server-side — BOTH must be updated together. Solution: When changing model capabilities, grep for ALL validators/builders that reference the model name.
- **Three layers of validation, all independent** (Feb 26, 2026): Model config (`maxReferenceImages`), service validator (`validateNanoBanana2`), and API builder (`buildNanoBanana2Input`) all independently control reference images. Changing one doesn't fix the others. Solution: When changing model capabilities, update all 3: config → validator → builder.

## Successes
- **Simple statusline script**: `pwd` + `git branch --show-current` works perfectly without JSON parsing.
- **Project-level Claude config**: Keep `.claude/settings.json` and `.claude/statusline.sh` in each project for reliability.
- **Git commit protocol**: Always commit after features, never leave uncommitted work (see LESSONS_LEARNED.md).
- **Parallel agent research**: Spawned 6 agents to research Replicate API docs simultaneously - efficient for gathering model parameter info.
- **Plan mode for config changes**: Used plan mode before editing model configs - prevented breaking changes by mapping current state vs API reality first.
- **Service layer already handles conversions**: Before adding conversion logic, check if service layer already does it (e.g., aspect_ratio→width/height was already handled).
- **Replicate API schema as source of truth**: Use `curl -H "Authorization: Bearer $TOKEN" https://api.replicate.com/v1/models/{owner}/{model}` and parse `latest_version.openapi_schema.components.schemas.Input` to get exact param names, types, and defaults. Faster and more reliable than scraping the web UI.
- **Model capability change checklist**: When updating a model's capabilities, always update these 5 files in order: (1) types (`image-generation.types.ts`), (2) config (`config/index.ts`), (3) service validator+builder (`image-generation.service.ts`), (4) hook settings builder (`usePromptGeneration.ts`), (5) UI (`AdvancedSettings.tsx` or `BasicSettings.tsx`).
- **Playwright production build for tests**: Switched from `next dev --turbopack` to `next build && next start` for Playwright tests — fixed 143 additional tests passing and cut runtime from 24min to 12min. Turbopack's "React Client Manifest" bug causes random render failures in test.
