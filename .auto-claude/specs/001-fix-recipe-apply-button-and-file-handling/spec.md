# Fix Recipe Apply Button and File Handling

## Overview

Fix recipe functionality so reference images stay hidden from UI while still being available for generation stages. The code was incorrectly adding recipe reference images to the visible user carousel (`setShotCreatorReferenceImages`). This has been removed so recipe reference images now only flow through `setStageReferenceImages()` which keeps them internal for pipe chaining during generation stages.

## Workflow Type

**simple** - Fix is already implemented in uncommitted changes, needs review and commit.

## Task Scope

### Status
**PARTIALLY COMPLETE** - Uncommitted changes exist that fix the main issue.

### Uncommitted Changes Found
- `src/features/shot-creator/components/creator-prompt-settings/PromptActions.tsx` - Already modified

### The Fix (Already Applied)
The code was incorrectly adding recipe reference images to the visible user carousel (`setShotCreatorReferenceImages`). This has been removed.

**Before:** Recipe images appeared in the reference image placeholder UI when clicking "apply"
**After:** Recipe images are only stored in `stageReferenceImages` for internal use during generation

### Change Details
The fix removes this block that was adding recipe images to visible carousel:
```typescript
// REMOVED - This was incorrectly showing recipe images in UI
if (recipeReferenceImages.length > 0) {
    setShotCreatorReferenceImages(...)
}
```

Recipe reference images now only flow through `setStageReferenceImages()` which keeps them internal for pipe chaining during generation stages.

## Success Criteria

- [ ] Click "apply" on a recipe with reference images
- [ ] Confirm images do NOT appear in the reference image carousel/placeholder
- [ ] Run generation with the recipe - verify reference images are still used behind-the-scenes
- [ ] Test with grizzly to confirm files are passed through correctly

## Next Steps
1. Review and commit the existing changes
2. Test the full recipe + grizzly flow to ensure files persist correctly
