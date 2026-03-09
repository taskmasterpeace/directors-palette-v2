# LoRA Management Updates Design

**Date:** 2026-03-09

---

## 1. Remove LoRAs from Personal Stack

**Priority:** High

**Problem:** Users can add community LoRAs to their personal collection but cannot remove them. The delete button in `LoraSection.tsx` is admin-only.

**Solution:** Add a remove button on community-sourced LoRAs in the main LoRA section list, visible to all users.

**Scope:**
- Community-sourced LoRAs only (not built-ins like Nava/Pixar, which auto-restore)
- Uses existing `removeLora()` store action — no new store logic needed
- Toast: "Removed {name} from collection"
- Community browser reflects removal (toggle back to "+" add state)

**Key files:**
- `src/features/shot-creator/components/lora/LoraSection.tsx` — add remove button for non-admin users on community LoRAs
- `src/features/shot-creator/store/lora.store.ts` — `removeLora()` already exists

**UI:** Small X or minus icon button on each community LoRA card in the personal stack. No confirmation dialog needed (easy to re-add from community tab).

---

## 2. Storybook LoRA Selector (Future)

**Priority:** Low — foundation only, no implementation now

**Concept:** Per-project LoRA picker in storybook settings. When selected, all page generations for that storybook use the LoRA's trigger word + weights.

**Future considerations:**
- Store selected LoRA ID in storybook project data (`storybook.store.ts`)
- Pass LoRA settings through recipe execution pipeline
- LoRA picker UI in storybook project settings panel
- Needs recipe system to accept LoRA overrides
