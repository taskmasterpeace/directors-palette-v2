# Gallery Upgrades & Bugfixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix black text bug, add gallery upscale button, fix recipe aspect ratio override, add wildcard community preview modal.

**Architecture:** Four independent changes. Bug fixes are surgical edits to existing files. Upscale button mirrors the remove-background pattern (API route + UI button in 3 locations). Wildcard preview adds a modal component and wires up existing click handler.

**Tech Stack:** Next.js 15, React 19, TypeScript, Replicate API (nightmareai/real-esrgan), Supabase, Zustand, Radix Dialog

---

### File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/features/shot-creator/components/prompt-editor/HighlightedPromptEditor.tsx` | Fix useMemo + backgroundColor |
| Create | `src/app/api/tools/upscale/route.ts` | Replicate Real-ESRGAN API route |
| Modify | `src/features/shot-creator/components/unified-gallery/UnifiedImageGallery.tsx` | Add handleUpscale + upscalingId state |
| Modify | `src/features/shot-creator/components/unified-gallery/ImageActionMenu.tsx` | Add upscale dropdown item |
| Modify | `src/features/shot-creator/components/unified-gallery/FullScreenModal.tsx` | Add upscale button |
| Modify | `src/features/shot-creator/components/unified-gallery/MobileImageActionSheet.tsx` | Add upscale action |
| Modify | `src/features/shot-creator/hooks/usePromptGeneration.ts` | Fix recipe aspect ratio override |
| Create | `src/features/community/components/WildcardDetailModal.tsx` | Full wildcard entry list modal |
| Modify | `src/features/community/components/CommunityPage.tsx` | Wire onItemClick for wildcards |

---

### Task 1: Fix Black Text Bug in HighlightedPromptEditor

**Files:**
- Modify: `src/features/shot-creator/components/prompt-editor/HighlightedPromptEditor.tsx`

- [ ] **Step 1: Replace useState+useEffect with useMemo**

In `HighlightedPromptEditor.tsx`, change the import on line 3 and the token computation on lines 55-60:

```typescript
// Line 3 — change import:
// FROM:
import React, { useRef, useCallback, useEffect, useState } from 'react'
// TO:
import React, { useRef, useCallback, useEffect, useMemo } from 'react'

// Lines 55-60 — replace token state:
// FROM:
    const [tokens, setTokens] = useState<SyntaxToken[]>([])

    // Tokenize the prompt on value change
    useEffect(() => {
        setTokens(tokenizePrompt(value))
    }, [value])
// TO:
    const tokens = useMemo(() => tokenizePrompt(value), [value])
```

- [ ] **Step 2: Fix backgroundColor CSS**

On lines 149 and 151, change `'hsl(var(--background))'` to `'var(--background)'`:

```typescript
// FROM (line 146-152):
style={hasSyntax ? {
    color: 'transparent',
    caretColor: DEFAULT_TEXT_COLOR,
    backgroundColor: 'hsl(var(--background))',
} : {
    backgroundColor: 'hsl(var(--background))',
}}

// TO:
style={hasSyntax ? {
    color: 'transparent',
    caretColor: DEFAULT_TEXT_COLOR,
    backgroundColor: 'var(--background)',
} : {
    backgroundColor: 'var(--background)',
}}
```

- [ ] **Step 3: Verify build passes**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Manual test**

Start dev server, go to Shot Creator, type a prompt with `@` references, then delete the reference text. Text should remain visible (not turn black/invisible).

- [ ] **Step 5: Commit**

```bash
git add src/features/shot-creator/components/prompt-editor/HighlightedPromptEditor.tsx
git commit -m "fix(prompt-editor): use useMemo for token sync + fix backgroundColor CSS"
git push origin main
```

---

### Task 2: Create Upscale API Route

**Files:**
- Create: `src/app/api/tools/upscale/route.ts`
- Reference: `src/app/api/tools/remove-background/route.ts` (copy this pattern exactly)

- [ ] **Step 1: Create the API route**

Create `src/app/api/tools/upscale/route.ts`. Mirror the remove-background route exactly — same auth, credit check, Replicate call, gallery insertion, error handling:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { getAuthenticatedUser } from '@/lib/auth/api-auth';
import { creditsService } from '@/features/credits';
import { isAdminEmail } from '@/features/admin/types/admin.types';
import { lognog } from '@/lib/lognog';
import { logger } from '@/lib/logger';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const UPSCALE_MODEL = 'nightmareai/real-esrgan';
const UPSCALE_COST_POINTS = 2;

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth instanceof NextResponse) return auth;

    const { user, supabase } = auth;
    const body = await request.json();
    const { imageUrl, galleryId } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const userIsAdmin = isAdminEmail(user.email || '');

    if (!userIsAdmin) {
      const balance = await creditsService.getBalance(user.id);
      if (!balance || balance.balance < UPSCALE_COST_POINTS) {
        return NextResponse.json(
          { error: `Insufficient credits. Need ${UPSCALE_COST_POINTS}, have ${balance?.balance || 0}` },
          { status: 402 }
        );
      }
    }

    logger.api.info('Starting upscale', { detail: imageUrl });

    const rawOutput = await replicate.run(UPSCALE_MODEL, {
      input: {
        image: imageUrl,
        scale: 4,
        face_enhance: false,
      },
    });

    logger.api.info('Upscale completed');

    let outputUrl: string | undefined;
    if (typeof rawOutput === 'string') {
      outputUrl = rawOutput;
    } else if (rawOutput && typeof rawOutput === 'object') {
      const stringified = String(rawOutput);
      if (stringified && stringified.startsWith('http')) {
        outputUrl = stringified;
      }
    }

    if (outputUrl && typeof outputUrl === 'string' && outputUrl.startsWith('http')) {
      if (!userIsAdmin) {
        const deductResult = await creditsService.addCredits(user.id, -UPSCALE_COST_POINTS, {
          type: 'usage',
          description: 'Image upscale 4x',
          metadata: {
            originalImage: imageUrl,
            tool: 'upscale',
          },
        });
        if (!deductResult.success) {
          logger.api.error('Failed to deduct credits', { error: deductResult.error });
        }
      }

      if (galleryId) {
        const { data: originalEntry } = await supabase
          .from('gallery')
          .select('metadata, folder_id')
          .eq('id', galleryId)
          .single();

        const { data: newEntry, error: insertError } = await supabase
          .from('gallery')
          .insert({
            user_id: user.id,
            prediction_id: `upscaled-${Date.now()}`,
            generation_type: 'image',
            status: 'completed',
            public_url: outputUrl,
            folder_id: originalEntry?.folder_id || null,
            metadata: {
              ...((originalEntry?.metadata as Record<string, unknown>) || {}),
              originalImage: imageUrl,
              tool: 'upscale-4x',
              prompt: `[Upscaled 4x] ${((originalEntry?.metadata as Record<string, unknown>)?.prompt as string) || 'Unknown'}`,
            },
          })
          .select()
          .single();

        if (insertError) {
          logger.api.error('Failed to create gallery entry', { error: insertError instanceof Error ? insertError.message : String(insertError) });
        }

        return NextResponse.json({
          success: true,
          imageUrl: outputUrl,
          galleryId: newEntry?.id,
          creditsUsed: userIsAdmin ? 0 : UPSCALE_COST_POINTS,
        });
      }

      return NextResponse.json({
        success: true,
        imageUrl: outputUrl,
        creditsUsed: userIsAdmin ? 0 : UPSCALE_COST_POINTS,
      });
    } else {
      return NextResponse.json(
        { error: 'No output from upscale model' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.api.error('Upscale error', { error: error instanceof Error ? error.message : String(error) });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);

    lognog.error('tool_upscale_failed', {
      error: errorMessage,
      tool: 'upscale',
    });

    return NextResponse.json(
      {
        error: 'Failed to upscale image',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test with cURL**

```bash
curl -X POST http://localhost:3002/api/tools/upscale \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat tests/.auth/cookies.txt)" \
  -d '{"imageUrl": "https://some-test-image-url.jpg"}'
```

Expected: `{ "success": true, "imageUrl": "...", "creditsUsed": 2 }`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tools/upscale/route.ts
git commit -m "feat(api): add upscale endpoint using Real-ESRGAN (2 pts)"
git push origin main
```

---

### Task 3: Add Upscale Button to Gallery UI

**Files:**
- Modify: `src/features/shot-creator/components/unified-gallery/UnifiedImageGallery.tsx`
- Modify: `src/features/shot-creator/components/unified-gallery/ImageActionMenu.tsx`
- Modify: `src/features/shot-creator/components/unified-gallery/FullScreenModal.tsx`
- Modify: `src/features/shot-creator/components/unified-gallery/MobileImageActionSheet.tsx`

- [ ] **Step 1: Add handleUpscale to UnifiedImageGallery.tsx**

Add `upscalingId` state and `handleUpscale` function, mirroring the `removingBackgroundId` / `handleRemoveBackground` pattern exactly.

Add state near line 144 (next to `removingBackgroundId`):

```typescript
const [upscalingId, setUpscalingId] = useState<string | null>(null)
```

Add handler (mirror `handleRemoveBackground` pattern exactly — same toast, setTimeout refresh, logger):

```typescript
const handleUpscale = useCallback(async (image: GeneratedImage) => {
    if (upscalingId) return
    setUpscalingId(image.id)
    toast({
        title: "Upscaling Image",
        description: "Processing image... (2 pts)"
    })
    try {
        const response = await fetch('/api/tools/upscale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: image.url, galleryId: image.id }),
        })
        const result = await response.json()
        if (!response.ok) {
            throw new Error(result.error || 'Failed to upscale image')
        }
        toast({
            title: "Image Upscaled!",
            description: "New image saved to gallery. Refreshing..."
        })
        // Refresh gallery to show new upscaled image (same pattern as handleRemoveBackground)
        setTimeout(async () => {
            await useUnifiedGalleryStore.getState().refreshGallery()
        }, 500)
    } catch (error) {
        logger.shotCreator.error('Upscale error', { error: error instanceof Error ? error.message : String(error) })
        toast({
            title: "Upscale Failed",
            description: error instanceof Error ? error.message : "An error occurred",
            variant: "destructive",
        })
    } finally {
        setUpscalingId(null)
    }
}, [upscalingId, toast])
```

Wire it into the `imageActions` object (near line 827):

```typescript
onUpscale: (image: GeneratedImage) => handleUpscale(image),
```

Pass to `ImageActionMenu` in the grid render (near line 892):

```typescript
onUpscale={() => handleUpscale(image)}
isUpscaling={upscalingId === image.id}
```

Pass to `FullScreenModal` (near line 1028):

```typescript
onUpscale={() => handleUpscale(fullscreenImage)}
isUpscaling={upscalingId === fullscreenImage.id}
```

- [ ] **Step 2: Add upscale item to ImageActionMenu.tsx**

Add props to the interface (after `isRemovingBackground`):

```typescript
onUpscale?: () => void
isUpscaling?: boolean
```

Add the `ArrowUpFromLine` import from lucide-react.

Add the menu item right after the Remove Background section (after line 286):

```typescript
{/* Upscale 4x */}
{onUpscale && (
  <DropdownMenuItem
    onClick={onUpscale}
    disabled={isUpscaling}
    className="hover:bg-secondary cursor-pointer"
  >
    {isUpscaling ? (
      <>
        <LoadingSpinner size="sm" color="current" className="mr-2" />
        Upscaling...
      </>
    ) : (
      <>
        <ArrowUpFromLine className="mr-2 h-4 w-4" />
        Upscale 4x (2 pts)
      </>
    )}
  </DropdownMenuItem>
)}
```

Also pass through to `MobileImageActionSheet` (add to props at line 131):

```typescript
onUpscale={onUpscale}
isUpscaling={isUpscaling}
```

- [ ] **Step 3: Add upscale button to FullScreenModal.tsx**

Add props to interface (after `isRemovingBackground`):

```typescript
onUpscale?: () => void
isUpscaling?: boolean
```

Add the `ArrowUpFromLine` import from lucide-react.

Add button right after the Remove Background button (after line 709):

```typescript
{/* Upscale 4x */}
{onUpscale && (
    <div className="flex gap-2">
        <Button
            size="sm"
            variant="outline"
            className="w-full text-white border-border"
            onClick={onUpscale}
            disabled={isUpscaling}
            title="Upscale 4x (2 pts)"
        >
            {isUpscaling ? (
                <>
                    <LoadingSpinner size="xs" color="current" className="w-3.5 h-3.5 mr-1" />
                    Upscaling...
                </>
            ) : (
                <>
                    <ArrowUpFromLine className="w-3.5 h-3.5 mr-1" />
                    Upscale 4x (2 pts)
                </>
            )}
        </Button>
    </div>
)}
```

- [ ] **Step 4: Add upscale action to MobileImageActionSheet.tsx**

Add props to interface (after `isRemovingBackground`):

```typescript
onUpscale?: () => void
isUpscaling?: boolean
```

Add the `ArrowUpFromLine` import from lucide-react.

Add action right after the Remove Background section (after line 197):

```typescript
{/* Upscale 4x */}
{onUpscale && (
  <MenuButton
    icon={isUpscaling ? (
      <LoadingSpinner size="md" color="current" className="h-5 w-5" />
    ) : (
      <ArrowUpFromLine className="h-5 w-5" />
    )}
    label={isUpscaling ? "Upscaling..." : "Upscale 4x (2 pts)"}
    onClick={() => {
      if (!isUpscaling) {
        onUpscale()
        handleClose()
      }
    }}
  />
)}
```

- [ ] **Step 5: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Manual test**

Open gallery, click dropdown on an image, verify "Upscale 4x (2 pts)" appears next to "Remove Background". Click it, verify loading state, verify new upscaled image appears in gallery.

- [ ] **Step 7: Commit**

```bash
git add src/features/shot-creator/components/unified-gallery/UnifiedImageGallery.tsx \
        src/features/shot-creator/components/unified-gallery/ImageActionMenu.tsx \
        src/features/shot-creator/components/unified-gallery/FullScreenModal.tsx \
        src/features/shot-creator/components/unified-gallery/MobileImageActionSheet.tsx
git commit -m "feat(gallery): add Upscale 4x button next to Remove Background"
git push origin main
```

---

### Task 4: Fix Recipe Aspect Ratio Override

**Files:**
- Modify: `src/features/shot-creator/hooks/usePromptGeneration.ts`

- [ ] **Step 1: Remove permanent aspect ratio override**

In `usePromptGeneration.ts`, find lines 608-609:

```typescript
if (activeRecipe.suggestedAspectRatio) {
    updateSettings({ aspectRatio: activeRecipe.suggestedAspectRatio })
}
```

Delete these two lines entirely.

- [ ] **Step 2: Fix the tool-stages code path**

Line 629 needs the recipe's aspect ratio to take priority (since user chose to generate with that recipe). Change:

```typescript
// FROM:
const aspectRatio = shotCreatorSettings.aspectRatio || activeRecipe.suggestedAspectRatio || '16:9'

// TO:
const aspectRatio = activeRecipe.suggestedAspectRatio || shotCreatorSettings.aspectRatio || '16:9'
```

Recipe suggestion takes priority over user default, since the user explicitly chose to use this recipe.

- [ ] **Step 3: Fix the non-tool-stages code path**

After line 669 where `buildModelSettings()` is called, override the aspect ratio if the recipe has a suggestion. Change from:

```typescript
const model = (activeRecipe.suggestedModel || shotCreatorSettings.model || 'nano-banana-2') as ModelId
const modelSettings = buildModelSettings()
```

To:

```typescript
const model = (activeRecipe.suggestedModel || shotCreatorSettings.model || 'nano-banana-2') as ModelId
const modelSettings = buildModelSettings()

// Use recipe's suggested aspect ratio for this generation (without permanently overwriting user setting)
if (activeRecipe.suggestedAspectRatio) {
    modelSettings.aspectRatio = activeRecipe.suggestedAspectRatio
}
```

- [ ] **Step 4: Also remove the model override that permanently changes settings**

Line 605-606 does the same permanent override for model:

```typescript
if (activeRecipe.suggestedModel) {
    updateSettings({ model: activeRecipe.suggestedModel as ModelId })
}
```

Delete these two lines as well. The model is already handled correctly on lines 628 and 668 with fallback chains.

- [ ] **Step 5: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Manual test**

1. Set aspect ratio to `9:16` in settings
2. Select a recipe that has `suggestedAspectRatio: '16:9'`
3. Generate an image
4. Deselect the recipe
5. Check settings — aspect ratio should still be `9:16` (not overwritten)

- [ ] **Step 7: Commit**

```bash
git add src/features/shot-creator/hooks/usePromptGeneration.ts
git commit -m "fix(recipes): use temporary aspect ratio override instead of permanent settings mutation"
git push origin main
```

---

### Task 5: Add Wildcard Detail Modal to Community Browser

**Files:**
- Create: `src/features/community/components/WildcardDetailModal.tsx`
- Modify: `src/features/community/components/CommunityPage.tsx`

- [ ] **Step 1: Create WildcardDetailModal component**

Create `src/features/community/components/WildcardDetailModal.tsx`:

```typescript
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Hash } from 'lucide-react'
import type { CommunityItem, WildcardContent } from '../types/community.types'

interface WildcardDetailModalProps {
  item: CommunityItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: () => void
  isInLibrary: boolean
}

export function WildcardDetailModal({ item, open, onOpenChange, onAdd, isInLibrary }: WildcardDetailModalProps) {
  if (!item || item.type !== 'wildcard') return null

  const content = item.content as WildcardContent
  const entries = content.entries || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-white max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-amber-400" />
            {item.name}
          </DialogTitle>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Badge>
          {item.creator_name && (
            <span className="text-xs text-muted-foreground">by {item.creator_name}</span>
          )}
        </div>

        {/* Scrollable entries list */}
        <div className="flex-1 overflow-y-auto border border-border rounded-md bg-background/50 p-3 space-y-1 min-h-0">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-start gap-2 text-sm py-0.5">
              <span className="text-muted-foreground text-xs w-6 text-right shrink-0 pt-0.5">{i + 1}</span>
              <span className="text-foreground break-words">{entry}</span>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No entries</p>
          )}
        </div>

        {/* Add button */}
        <div className="pt-2">
          <Button
            onClick={() => {
              onAdd()
              onOpenChange(false)
            }}
            disabled={isInLibrary}
            className="w-full"
            variant={isInLibrary ? 'secondary' : 'default'}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isInLibrary ? 'Already in My Wildcards' : 'Add to My Wildcards'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Wire up onItemClick in CommunityPage.tsx**

Add imports at top of `CommunityPage.tsx`:

```typescript
import { WildcardDetailModal } from './WildcardDetailModal'
import type { CommunityItem } from '../types/community.types'
```

Add state (near other state declarations):

```typescript
const [wildcardDetailItem, setWildcardDetailItem] = useState<CommunityItem | null>(null)
```

Add click handler:

```typescript
const handleItemClick = useCallback((item: CommunityItem) => {
  if (item.type === 'wildcard') {
    setWildcardDetailItem(item)
  }
}, [])
```

Pass `onItemClick` to BOTH `CommunityGrid` instances in the JSX. The featured grid (if it exists) and the regular grid around line 597:

```typescript
<CommunityGrid
  items={regularItems}
  // ... existing props ...
  onItemClick={handleItemClick}
/>
```

Add the modal at the end of the component JSX (before the closing wrapper div):

```typescript
<WildcardDetailModal
  item={wildcardDetailItem}
  open={wildcardDetailItem !== null}
  onOpenChange={(open) => { if (!open) setWildcardDetailItem(null) }}
  onAdd={() => wildcardDetailItem && handleAdd(wildcardDetailItem.id)}
  isInLibrary={wildcardDetailItem ? isInLibrary(wildcardDetailItem.id) : false}
/>
```

- [ ] **Step 3: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Manual test**

Go to Community tab, find a wildcard card, click it. Modal should open showing all entries with a numbered list. "Add to My Wildcards" button should work. Modal should close on X or clicking outside.

- [ ] **Step 5: Commit**

```bash
git add src/features/community/components/WildcardDetailModal.tsx \
        src/features/community/components/CommunityPage.tsx
git commit -m "feat(community): add wildcard detail modal showing all entries"
git push origin main
```

---

### Task 6: Final Build + Integration Test

- [ ] **Step 1: Clean build**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

- [ ] **Step 2: Manual smoke test all 4 features**

1. Type `@reference` in prompt, delete it — text stays visible (not black)
2. Gallery dropdown shows "Upscale 4x (2 pts)" next to "Remove Background"
3. Generate with a recipe that has suggestedAspectRatio — user's setting not permanently changed
4. Click a wildcard in Community — modal shows all entries

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: integration fixes for gallery upgrades" && git push origin main
```
