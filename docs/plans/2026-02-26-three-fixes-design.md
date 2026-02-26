# Three Fixes Design: Tag Editing, Nano-Banana Timer, Storyboard Save/Load

## 1. Library Tag Editing
Click tag pills on library images to open inline editor. Reuse existing `InlineTagEditor` component and `updateItemTags()` store action. Add "+ tag" hover button for untagged images. Works in grid and list views.

## 2. Nano-Banana-2 Timer → 60s + Continued Polling
- Config & spinner estimated time: 25s/10s → 60s
- Remove 90s hard timeout that gives up
- After progress hits 100%, poll every 5s until Replicate returns terminal status (succeeded/failed/canceled)
- No arbitrary give-up — always check actual status

## 3. Storyboard Project Save/Load Fix
Problem: `restoreProject()` only restores prompts/images/breakdown from IndexedDB. Story text, characters, settings etc. live in shared localStorage.

Fix: Add `projectState` table to IndexedDB storing all project-specific zustand fields. Save/restore full state on project switch. Add size indicator in project dropdown.
