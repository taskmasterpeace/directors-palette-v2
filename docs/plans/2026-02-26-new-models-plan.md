# New Models Sprint: Nano Banana 2 + P-Video Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `google/nano-banana-2` as the new default image model and `prunaai/p-video` as a new video model in the shot animator, with audio input support and draft mode.

**Architecture:** Two independent tracks: (1) Image model — add nano-banana-2 to ModelId union, MODEL_CONFIGS, image-generation service, and update all defaults from nano-banana/nano-banana-pro to nano-banana-2. Guard `match_input_image` aspect ratio when no reference image exists. (2) Video model — add p-video to AnimationModel union, video configs, pricing, and service layer. Wire audio file input into the shot animator UI.

**Tech Stack:** Next.js 15, TypeScript, Replicate API, Zustand stores, Tailwind CSS

---

## Track A: Nano Banana 2 Image Model

### Task 1: Add nano-banana-2 to ModelId and MODEL_CONFIGS

**Files:**
- Modify: `src/config/index.ts:25` (ModelId type)
- Modify: `src/config/index.ts:369-489` (MODEL_CONFIGS)
- Modify: `src/config/index.ts:62-78` (MODEL_PARAMETERS.aspectRatio — add nano-banana-2 aspect ratio variant)

**Step 1: Add 'nano-banana-2' to ModelId union**

In `src/config/index.ts:25`, change:
```typescript
export type ModelId = 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo' | 'seedream-5-lite' | 'riverflow-2-pro'
```
to:
```typescript
export type ModelId = 'nano-banana' | 'nano-banana-pro' | 'nano-banana-2' | 'z-image-turbo' | 'seedream-5-lite' | 'riverflow-2-pro'
```

**Step 2: Add nano-banana-2 aspect ratio parameter**

Nano-banana-2 supports: `1:1`, `9:16`, `16:9`, `3:4`, `4:3`, `match_input_image`. It does NOT support `21:9`, `3:2`, `2:3`, `4:5`, `5:4`. Add a new parameter entry after the existing `aspectRatio`:

```typescript
nanoBanana2AspectRatio: {
    id: 'aspectRatio',
    label: 'Aspect Ratio',
    type: 'select',
    default: '16:9',
    options: [
        { value: '16:9', label: '16:9 Landscape' },
        { value: '9:16', label: '9:16 Portrait' },
        { value: '1:1', label: '1:1 Square' },
        { value: '4:3', label: '4:3 Classic' },
        { value: '3:4', label: '3:4 Portrait' },
        { value: 'match_input_image', label: 'Match Input Image' }
    ]
},
```

**Step 3: Add nano-banana-2 safety filter + person generation parameters**

```typescript
nanoBanana2SafetyFilter: {
    id: 'safetyFilterLevel',
    label: 'Safety Filter',
    type: 'select',
    default: 'block_only_high',
    options: [
        { value: 'block_low_and_above', label: 'Strict (Block low & above)' },
        { value: 'block_medium_and_above', label: 'Moderate (Block medium & above)' },
        { value: 'block_only_high', label: 'Minimal (Block only high)' },
        { value: 'block_none', label: 'None (No filter)' }
    ],
    description: 'Content safety filtering level'
},
personGeneration: {
    id: 'personGeneration',
    label: 'Person Generation',
    type: 'select',
    default: 'allow_all',
    options: [
        { value: 'dont_allow', label: 'Don\'t Allow' },
        { value: 'allow_adult', label: 'Allow Adult Only' },
        { value: 'allow_all', label: 'Allow All' }
    ],
    description: 'Control person generation in images'
},
```

**Step 4: Add MODEL_CONFIGS entry for nano-banana-2**

Add after the `'nano-banana-pro'` config entry:

```typescript
'nano-banana-2': {
    id: 'nano-banana-2',
    name: 'nano-banana-2',
    displayName: 'Nano Banana 2',
    type: 'generation',
    icon: '🍌',
    description: 'Latest generation model. Fast, high quality. Currently free.',
    badge: 'New',
    badgeColor: 'bg-green-600',
    textColor: 'text-green-300',
    endpoint: 'google/nano-banana-2',
    costPerImage: 0, // Currently free — update when pricing announced
    supportedParameters: ['nanoBanana2AspectRatio', 'nanoBanana2SafetyFilter', 'personGeneration'],
    parameters: {
        aspectRatio: MODEL_PARAMETERS.nanoBanana2AspectRatio,
        safetyFilterLevel: MODEL_PARAMETERS.nanoBanana2SafetyFilter,
        personGeneration: MODEL_PARAMETERS.personGeneration
    },
    maxReferenceImages: 1 // nano-banana-2 accepts single `image` input
},
```

**Step 5: Build to verify types compile**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds (there will be runtime references to old defaults but types should compile)

**Step 6: Commit**

```bash
git add src/config/index.ts
git commit -m "feat(models): add nano-banana-2 to ModelId and MODEL_CONFIGS"
git push origin main
```

---

### Task 2: Add nano-banana-2 to image generation service

**Files:**
- Modify: `src/features/shot-creator/types/image-generation.types.ts` (add NanoBanana2Settings, update ImageModel)
- Modify: `src/features/shot-creator/services/image-generation.service.ts` (add validation + buildReplicateInput)

**Step 1: Add NanoBanana2Settings type**

In `src/features/shot-creator/types/image-generation.types.ts`, after `NanoBananaProSettings`:

```typescript
export interface NanoBanana2Settings {
  aspectRatio?: string
  safetyFilterLevel?: 'block_low_and_above' | 'block_medium_and_above' | 'block_only_high' | 'block_none'
  personGeneration?: 'dont_allow' | 'allow_adult' | 'allow_all'
}
```

Add `NanoBanana2Settings` to the `ImageModelSettings` union:
```typescript
export type ImageModelSettings =
  | NanoBananaSettings
  | NanoBananaProSettings
  | NanoBanana2Settings
  | ZImageTurboSettings
  | SeedreamSettings
  | RiverflowProSettings
```

**Step 2: Add validation for nano-banana-2**

In `image-generation.service.ts`, in the `validateInput` switch statement, add:

```typescript
case 'nano-banana-2':
    errors.push(...this.validateNanoBanana2(input))
    break
```

Add the validation method:

```typescript
private static validateNanoBanana2(input: ImageGenerationInput): string[] {
    const errors: string[] = []
    const settings = input.modelSettings as NanoBanana2Settings

    // nano-banana-2 supports only a single image input
    if (input.referenceImages && input.referenceImages.length > 1) {
        errors.push('Nano Banana 2 supports maximum 1 reference image')
    }

    // match_input_image requires a reference image
    if (settings.aspectRatio === 'match_input_image' && (!input.referenceImages || input.referenceImages.length === 0)) {
        errors.push('Match Input Image aspect ratio requires a reference image')
    }

    return errors
}
```

**Step 3: Add buildReplicateInput for nano-banana-2**

In the `buildReplicateInput` switch, add:
```typescript
case 'nano-banana-2':
    return this.buildNanoBanana2Input(input)
```

Add the builder method:

```typescript
private static buildNanoBanana2Input(input: ImageGenerationInput) {
    const settings = input.modelSettings as NanoBanana2Settings
    const replicateInput: Record<string, unknown> = {
        prompt: input.prompt,
    }

    if (settings.aspectRatio) {
        replicateInput.aspect_ratio = settings.aspectRatio
    }

    if (settings.safetyFilterLevel) {
        replicateInput.safety_filter_level = settings.safetyFilterLevel
    }

    if (settings.personGeneration) {
        replicateInput.person_generation = settings.personGeneration
    }

    // nano-banana-2 accepts a single `image` input (not array)
    if (input.referenceImages && input.referenceImages.length > 0) {
        const url = typeof input.referenceImages[0] === 'string'
            ? input.referenceImages[0]
            : (input.referenceImages[0] as { url: string }).url
        replicateInput.image = url
    }

    // Note: nano-banana-2 output is always WebP, no output_format param

    return replicateInput
}
```

Also add `getReplicateModelId` mapping. Find the `getReplicateModelId` method and add `'nano-banana-2'` to the model map:
```typescript
'nano-banana-2': 'google/nano-banana-2',
```

**Step 4: Import NanoBanana2Settings**

At the top of `image-generation.service.ts`, add `NanoBanana2Settings` to the imports:
```typescript
import type {
  ImageModel,
  ImageGenerationInput,
  ImageGenerationRequest,
  ImageGenerationResponse,
  NanoBananaSettings,
  NanoBananaProSettings,
  NanoBanana2Settings,
  ZImageTurboSettings,
  SeedreamSettings,
  RiverflowProSettings,
} from '../types/image-generation.types'
```

**Step 5: Build to verify**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/features/shot-creator/types/image-generation.types.ts src/features/shot-creator/services/image-generation.service.ts
git commit -m "feat(models): add nano-banana-2 image generation service support"
git push origin main
```

---

### Task 3: Update all defaults to nano-banana-2

**Files:**
- Modify: `src/features/shot-creator/store/shot-creator.store.ts:12` — change default model
- Modify: `src/features/storyboard/store/slices/ui.slice.ts:35,208` — change imageModel default
- Modify: `src/features/storyboard/hooks/useGalleryActions.ts:189,295,348,414` — change fallback model
- Modify: `src/features/storyboard/components/generation/GenerationQueue.tsx:201` — change fallback
- Modify: `src/features/storyboard/components/broll/BRollGenerator.tsx:162` — change hardcoded model
- Modify: `src/features/storyboard/services/character-sheet.service.ts:67,85` — change model
- Modify: `src/features/storyboard/services/contact-sheet.service.ts:178,195,266,454,468` — change model
- Modify: `src/features/storyboard/services/broll-sheet.service.ts:224` — change model
- Modify: `src/features/storyboard/services/style-generator.service.ts:44,62` — change model
- Modify: `src/features/storyboard/services/story-director.service.ts:100` — change fallback
- Modify: `src/features/storyboard/components/directors/DirectorTab.tsx:108` — change fallback
- Modify: `src/features/storyboard/components/entities/CharacterSheetGenerator.tsx:319` — change model

**Step 1: Global find-and-replace defaults**

Use `replace_all` to change every `'nano-banana-pro'` fallback/default to `'nano-banana-2'` in all the files listed above. The key change pattern:
- `model: 'nano-banana-pro'` → `model: 'nano-banana-2'`
- `|| 'nano-banana-pro'` → `|| 'nano-banana-2'`
- `imageModel: 'nano-banana-pro' as ModelId` → `imageModel: 'nano-banana-2' as ModelId`

**Also update shot-creator store default:**
- `model: "nano-banana"` → `model: "nano-banana-2"` in `DEFAULT_SETTINGS`

**Step 2: Build to verify**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(models): switch all defaults to nano-banana-2"
git push origin main
```

---

### Task 4: Guard match_input_image aspect ratio in UI

**Files:**
- Modify: `src/features/shot-creator/components/creator-prompt-settings/BasicSettings.tsx` — disable match_input_image when no refs

**Step 1: Find the aspect ratio select in BasicSettings.tsx**

Read the file to locate where aspect ratio options are rendered.

**Step 2: Add conditional disable logic**

When rendering aspect ratio options for nano-banana-2, disable or filter out `match_input_image` when `referenceImages` is empty. The logic should:

1. Check if current model is `nano-banana-2`
2. Check if there are any reference images loaded
3. If no references AND model is nano-banana-2, filter out the `match_input_image` option from the dropdown
4. If current value IS `match_input_image` and refs are removed, reset to `16:9`

**Step 3: Build to verify**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/features/shot-creator/components/creator-prompt-settings/BasicSettings.tsx
git commit -m "fix(models): guard match_input_image when no reference image"
git push origin main
```

---

## Track B: P-Video Animation Model

### Task 5: Add p-video to AnimationModel type and configs

**Files:**
- Modify: `src/features/shot-animator/types/index.ts:6-13` (AnimationModel union)
- Modify: `src/features/shot-animator/types/index.ts:41-49` (ModelSettings — add draftMode, audioUrl)
- Modify: `src/features/shot-animator/types/index.ts:52-60` (AnimatorSettings — add p-video)
- Modify: `src/features/shot-animator/types/index.ts:101-109` (VIDEO_MODEL_PRICING — add p-video)

**Step 1: Add 'p-video' to AnimationModel union**

```typescript
export type AnimationModel =
  | 'wan-2.2-5b-fast'
  | 'wan-2.2-i2v-fast'
  | 'seedance-pro-fast'
  | 'seedance-lite'
  | 'seedance-1.5-pro'
  | 'kling-2.5-turbo-pro'
  | 'p-video'              // Fast video gen with audio + draft mode
  | 'seedance-pro'         // Legacy
```

**Step 2: Add draftMode and audioUrl to ModelSettings**

```typescript
export interface ModelSettings {
  duration: number
  resolution: '480p' | '720p' | '1080p'
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '9:21'
  fps: number
  cameraFixed: boolean
  seed?: number
  generateAudio?: boolean
  draftMode?: boolean     // p-video: faster lower quality
  audioUrl?: string       // p-video: audio file URI for sync
}
```

**Step 3: Add p-video to AnimatorSettings**

```typescript
export interface AnimatorSettings {
  // ... existing entries ...
  'p-video': ModelSettings
  'seedance-pro': ModelSettings // Legacy
}
```

**Step 4: Add p-video pricing**

```typescript
'p-video': { '480p': 0, '720p': 0 },  // Currently free — update when pricing announced
```

**Step 5: Add p-video to ModelConfig interface**

The existing `ModelConfig` interface already has `supportsAudio?: boolean`. No change needed there.

**Step 6: Build to verify**

Run: `rm -rf .next && npm run build`
Expected: May have errors in files that exhaustively handle AnimationModel — fix in next task

**Step 7: Commit**

```bash
git add src/features/shot-animator/types/index.ts
git commit -m "feat(video): add p-video to AnimationModel types"
git push origin main
```

---

### Task 6: Add p-video to model configs and service

**Files:**
- Modify: `src/features/shot-animator/config/models.config.ts` (ANIMATION_MODELS, DEFAULT_MODEL_SETTINGS, ACTIVE_VIDEO_MODELS, MODEL_TIER_LABELS, VIDEO_MODEL_ICONS)
- Modify: `src/features/shot-animator/services/video-generation.service.ts` (VIDEO_MODEL_CONFIGS, getReplicateModelId, buildReplicateInput, validateInput)

**Step 1: Add ANIMATION_MODELS entry**

In `models.config.ts`, add after `'seedance-1.5-pro'`:

```typescript
'p-video': {
    id: 'p-video',
    displayName: 'P-Video',
    description: 'Fast video with audio input and draft mode. Text-to-video, image-to-video, audio-to-video.',
    maxReferenceImages: 0,
    supportsLastFrame: false,
    supportsAudio: true,
    defaultResolution: '480p',
    maxDuration: 10,
    supportedResolutions: ['480p', '720p'],
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    pricingType: 'per-video',
    promptStyle: 'specific',
    restrictions: [
        'Max 10 seconds',
        'Max 720p resolution',
        'Draft mode available for faster iteration'
    ]
},
```

**Step 2: Add DEFAULT_MODEL_SETTINGS entry**

```typescript
'p-video': {
    duration: 10,  // User requested default 10 seconds
    resolution: '480p',
    aspectRatio: '16:9',
    fps: 24,
    cameraFixed: false,
    draftMode: false
},
```

**Step 3: Add to ACTIVE_VIDEO_MODELS**

Add `'p-video'` after `'seedance-1.5-pro'`:
```typescript
export const ACTIVE_VIDEO_MODELS: AnimationModel[] = [
  'wan-2.2-5b-fast',
  'wan-2.2-i2v-fast',
  'seedance-pro-fast',
  'seedance-lite',
  'seedance-1.5-pro',
  'p-video',               // Free — fast video with audio input
  'kling-2.5-turbo-pro',
]
```

**Step 4: Add to MODEL_TIER_LABELS and VIDEO_MODEL_ICONS**

```typescript
// In MODEL_TIER_LABELS:
'p-video': 'Free',

// In VIDEO_MODEL_ICONS:
'p-video': '🎬',
```

**Step 5: Add VIDEO_MODEL_CONFIGS entry in video-generation.service.ts**

```typescript
'p-video': {
    id: 'p-video',
    displayName: 'P-Video',
    description: 'Free - Fast video gen with audio input + draft mode',
    maxReferenceImages: 0,
    supportsLastFrame: false,
    supportsAudio: true,
    defaultResolution: '480p',
    maxDuration: 10,
    supportedResolutions: ['480p', '720p'],
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    pricingType: 'per-video',
    promptStyle: 'specific',
    restrictions: ['Max 10s', 'Max 720p'],
},
```

**Step 6: Add Replicate model ID mapping**

In `getReplicateModelId`:
```typescript
'p-video': 'prunaai/p-video',
```

**Step 7: Add p-video input builder in buildReplicateInput**

P-video uses different input params than the seedance models. Add special handling:

```typescript
// In buildReplicateInput, after the common input building:
if (input.model === 'p-video') {
    // p-video uses different params: prompt, image (optional), audio (optional),
    // duration (5 or 10), resolution (480p or 720p), draft_mode (boolean), seed
    const pVideoInput: Record<string, unknown> = {
        prompt: input.prompt,
        duration: input.modelSettings.duration,
        resolution: input.modelSettings.resolution,
    }

    if (input.image) {
        pVideoInput.image = input.image
    }

    if (input.modelSettings.draftMode) {
        pVideoInput.draft_mode = true
    }

    if (input.modelSettings.audioUrl) {
        pVideoInput.audio = input.modelSettings.audioUrl
    }

    if (input.modelSettings.seed !== undefined) {
        pVideoInput.seed = input.modelSettings.seed
    }

    return pVideoInput as ReplicateVideoInput
}
```

**Step 8: Add p-video validation**

In `validateInput`, add p-video specific validation:
- Image is optional (supports text-to-video)
- Duration must be 5 or 10
- Resolution must be 480p or 720p

```typescript
// In the image-required check, also allow p-video to skip image:
if (!input.image && input.model !== 'seedance-1.5-pro' && input.model !== 'p-video') {
    errors.push('Base image is required for image-to-video generation')
}

// Duration constraint for p-video
if (input.model === 'p-video' && input.modelSettings.duration !== 5 && input.modelSettings.duration !== 10) {
    errors.push('P-Video supports only 5 or 10 second durations')
}
```

**Step 9: Build to verify**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds

**Step 10: Commit**

```bash
git add src/features/shot-animator/config/models.config.ts src/features/shot-animator/services/video-generation.service.ts
git commit -m "feat(video): add p-video model configs and service support"
git push origin main
```

---

### Task 7: Add audio file upload to shot animator UI

**Files:**
- Modify: `src/features/shot-animator/components/ShotAnimatorView.tsx` — add audio upload when p-video selected

**Step 1: Read the ShotAnimatorView component**

Read the full file to understand the current layout and where model settings are rendered.

**Step 2: Add audio file upload section**

When the selected model is `p-video` (or any model with `supportsAudio: true`), show an audio file upload area:

```tsx
{/* Audio Input (for models that support it) */}
{modelConfig.supportsAudio && (
    <div className="space-y-2">
        <label className="text-sm font-medium">Audio Track (Optional)</label>
        <div className="flex items-center gap-2">
            <input
                type="file"
                accept="audio/*"
                ref={audioInputRef}
                className="hidden"
                onChange={handleAudioFileChange}
            />
            <Button
                variant="outline"
                size="sm"
                onClick={() => audioInputRef.current?.click()}
            >
                {audioUrl ? 'Change Audio' : 'Upload Audio'}
            </Button>
            {audioUrl && (
                <>
                    <audio src={audioUrl} controls className="h-8 flex-1" />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAudioUrl(null)}
                    >
                        Remove
                    </Button>
                </>
            )}
        </div>
        <p className="text-xs text-muted-foreground">
            Upload audio to sync video generation. Video will be generated matching the audio.
        </p>
    </div>
)}
```

**Step 3: Add draft mode toggle**

When the selected model supports draft mode (p-video), show a toggle:

```tsx
{selectedModel === 'p-video' && (
    <div className="flex items-center gap-2">
        <input
            type="checkbox"
            checked={draftMode}
            onChange={(e) => setDraftMode(e.target.checked)}
            id="draft-mode"
        />
        <label htmlFor="draft-mode" className="text-sm">
            Draft Mode (faster, lower quality)
        </label>
    </div>
)}
```

**Step 4: Wire audio URL and draft mode into generation request**

When building the video generation request payload, include:
- `modelSettings.audioUrl` from the uploaded audio
- `modelSettings.draftMode` from the toggle

The audio file needs to be uploaded to a publicly accessible URL first (Replicate file upload or Supabase storage).

**Step 5: Build to verify**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/features/shot-animator/components/ShotAnimatorView.tsx
git commit -m "feat(video): add audio upload and draft mode UI for p-video"
git push origin main
```

---

### Task 8: Wire p-video into storyboard shot animation

**Files:**
- Modify: `src/features/storyboard/services/shot-animation.service.ts:14` — add 'p-video' to AnimationModel

**Step 1: Update the local AnimationModel type**

The storyboard's `shot-animation.service.ts` has its own `AnimationModel` type at line 14. Update it to include `p-video`:

```typescript
export type AnimationModel = 'seedance-lite' | 'seedance-pro' | 'p-video'
```

**Step 2: Build to verify**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/storyboard/services/shot-animation.service.ts
git commit -m "feat(storyboard): add p-video to storyboard animation model type"
git push origin main
```

---

## Track C: Final Verification

### Task 9: Clean build + Playwright tests

**Step 1: Full clean build**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds with zero errors

**Step 2: Start dev server**

Run: `cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &`

**Step 3: Run Playwright tests**

Run: `npx playwright test tests/storyboard.spec.ts`
Expected: All tests pass (12/12)

**Step 4: Commit any final fixes**

If any tests fail, fix and commit.

---

## Summary of Changes

| Area | Change | Files |
|------|--------|-------|
| ModelId type | Add `nano-banana-2` | `src/config/index.ts` |
| Model configs | Add NB2 config with safety + person params | `src/config/index.ts` |
| Image types | Add `NanoBanana2Settings` | `src/features/shot-creator/types/image-generation.types.ts` |
| Image service | Add validation + Replicate input builder | `src/features/shot-creator/services/image-generation.service.ts` |
| Defaults | Switch ~20 hardcoded `nano-banana-pro` → `nano-banana-2` | Multiple storyboard files |
| UI guard | Disable `match_input_image` when no ref image | `BasicSettings.tsx` |
| AnimationModel type | Add `p-video` | `src/features/shot-animator/types/index.ts` |
| Video configs | Add p-video model config | `src/features/shot-animator/config/models.config.ts` |
| Video service | Add validation + Replicate input builder | `src/features/shot-animator/services/video-generation.service.ts` |
| Shot animator UI | Add audio upload + draft mode toggle | `ShotAnimatorView.tsx` |
| Storyboard | Add p-video to local AnimationModel | `shot-animation.service.ts` |
