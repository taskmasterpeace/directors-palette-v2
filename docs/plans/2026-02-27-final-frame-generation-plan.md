# Final Frame Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-generate end frames from start frames using Nano Banana 2, then use both frames for smarter animation prompt generation.

**Architecture:** Add "Generate with AI" button to LastFrameModal that calls the existing image generation API with a temporal advancement prompt. Enhance the animation prompt API to accept two images (start + end frame) and describe the transition between them.

**Tech Stack:** Next.js 15, React 19, Replicate (Nano Banana 2), Gemini 2.0 Flash (OpenRouter), Zustand

---

### Task 1: Add "Generate with AI" to LastFrameModal

**Files:**
- Modify: `src/features/shot-animator/components/LastFrameModal.tsx`

**Context:** The LastFrameModal currently has a drag-drop upload zone and save/cancel buttons. We need to add an AI generation button that calls the image generation API with the start frame as a reference image.

**Step 1: Add `startFrameUrl` prop and AI generation state**

The modal needs to know the start frame URL to send it as a reference image. Add the prop and new state variables.

Update the interface and component:

```tsx
interface LastFrameModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (imageUrl?: string) => void
  initialImage?: string
  imageName: string
  startFrameUrl?: string  // NEW: start frame for AI generation
}
```

Add state inside the component:

```tsx
const [isGenerating, setIsGenerating] = useState(false)
const [generationError, setGenerationError] = useState<string | null>(null)
```

**Step 2: Add the temporal advancement generation function**

```tsx
const TEMPORAL_PROMPT = 'TEMPORAL UNIT ACTIVE. Input: reference image. Directive: render this scene as it appears 15 seconds later. Maintain all characters, style, lighting, and framing. Show realistic progression of motion, expression, and environment — nothing more, nothing less.'

const handleGenerateLastFrame = async () => {
  if (!startFrameUrl) return
  setIsGenerating(true)
  setGenerationError(null)

  try {
    const response = await fetch('/api/generation/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nano-banana-2',
        prompt: TEMPORAL_PROMPT,
        referenceImages: [startFrameUrl],
        modelSettings: { aspectRatio: '16:9', resolution: '1024x1024' },
        waitForResult: true,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate final frame')
    }

    const result = await response.json()
    if (result.status === 'completed' && result.imageUrl) {
      setImage(result.imageUrl)
    } else if (result.status === 'failed') {
      throw new Error(result.error || 'Generation failed')
    } else {
      throw new Error('Generation did not complete')
    }
  } catch (err) {
    setGenerationError(err instanceof Error ? err.message : 'Generation failed')
  } finally {
    setIsGenerating(false)
  }
}
```

**Step 3: Add the "Generate with AI" button to the UI**

Below the drag-drop zone (inside `<div className="space-y-4 py-4 ...">` after the image preview section), add:

```tsx
{/* AI Generation Section */}
{startFrameUrl && (
  <div className="flex flex-col items-center gap-2 pt-2 border-t border-border">
    <Button
      onClick={handleGenerateLastFrame}
      disabled={isGenerating}
      variant="outline"
      className="w-full max-w-sm bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary min-h-[44px] touch-manipulation"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating final frame...
        </>
      ) : (
        <>
          <Wand2 className="w-4 h-4 mr-2" />
          Generate with AI
        </>
      )}
    </Button>
    <p className="text-xs text-muted-foreground text-center">
      Uses AI to imagine this scene 15 seconds later
    </p>
    {generationError && (
      <p className="text-xs text-red-400 text-center">{generationError}</p>
    )}
  </div>
)}
```

Add `Wand2` and `Loader2` to the lucide-react imports at the top of the file.

**Step 4: Build and verify**

```bash
rm -rf .next && npm run build
```

Expected: Clean build, no errors.

**Step 5: Commit**

```bash
git add src/features/shot-animator/components/LastFrameModal.tsx
git commit -m "feat(shot-animator): add AI final frame generation to LastFrameModal"
git push origin main
```

---

### Task 2: Pass `startFrameUrl` from ShotAnimatorView to LastFrameModal

**Files:**
- Modify: `src/features/shot-animator/components/ShotAnimatorView.tsx`

**Context:** The `LastFrameModal` now accepts `startFrameUrl` but we need to pass it from the parent. The `currentLastFrameConfig` already has `imageUrl` (the start frame).

**Step 1: Add startFrameUrl prop to the LastFrameModal invocation**

Find this block (around line 1124-1131):

```tsx
{currentLastFrameConfig && (
  <LastFrameModal
    isOpen={lastFrameEditState.isOpen}
    onClose={() => setLastFrameEditState({ isOpen: false })}
    onSave={(image) => handleSaveLastFrame(currentLastFrameConfig.id, image)}
    initialImage={currentLastFrameConfig.lastFrameImage}
    imageName={currentLastFrameConfig.imageName}
  />
)}
```

Add the new prop:

```tsx
{currentLastFrameConfig && (
  <LastFrameModal
    isOpen={lastFrameEditState.isOpen}
    onClose={() => setLastFrameEditState({ isOpen: false })}
    onSave={(image) => handleSaveLastFrame(currentLastFrameConfig.id, image)}
    initialImage={currentLastFrameConfig.lastFrameImage}
    imageName={currentLastFrameConfig.imageName}
    startFrameUrl={currentLastFrameConfig.imageUrl}
  />
)}
```

**Step 2: Build and verify**

```bash
rm -rf .next && npm run build
```

**Step 3: Commit**

```bash
git add src/features/shot-animator/components/ShotAnimatorView.tsx
git commit -m "feat(shot-animator): pass startFrameUrl to LastFrameModal"
git push origin main
```

---

### Task 3: Add `lastFrameUrl` support to animation prompt service (client)

**Files:**
- Modify: `src/features/shot-animator/services/animation-prompt.service.ts`

**Context:** The client-side service needs to accept and pass an optional `lastFrameUrl` to the API.

**Step 1: Add `lastFrameUrl` to the interfaces**

In `AnimationPromptOptions`, add:

```ts
export interface AnimationPromptOptions {
    originalPrompt?: string
    existingPrompt?: string
    mode: 'generate' | 'enhance'
    promptStyle?: 'specific' | 'reasoning'
    audioEnabled?: boolean
    multiShot?: boolean
    lastFrameUrl?: string  // NEW
}
```

In `AnimationPromptRequest`, add:

```ts
export interface AnimationPromptRequest {
    imageUrl: string
    originalPrompt?: string
    existingPrompt?: string
    mode: 'generate' | 'enhance'
    promptStyle?: 'specific' | 'reasoning'
    audioEnabled?: boolean
    multiShot?: boolean
    lastFrameUrl?: string  // NEW
}
```

**Step 2: Pass `lastFrameUrl` in the fetch call**

In `generateAnimationPrompt()`, add `lastFrameUrl` to the JSON body:

```ts
body: JSON.stringify({
    imageUrl,
    originalPrompt: options.originalPrompt,
    existingPrompt: options.existingPrompt,
    mode: options.mode,
    promptStyle: options.promptStyle,
    audioEnabled: options.audioEnabled,
    multiShot: options.multiShot,
    lastFrameUrl: options.lastFrameUrl,  // NEW
}),
```

**Step 3: Build and verify**

```bash
rm -rf .next && npm run build
```

**Step 4: Commit**

```bash
git add src/features/shot-animator/services/animation-prompt.service.ts
git commit -m "feat(shot-animator): add lastFrameUrl to animation prompt service"
git push origin main
```

---

### Task 4: Add two-frame system prompts to animation prompt API

**Files:**
- Modify: `src/app/api/animation-prompt/generate/route.ts`

**Context:** The API receives images and generates animation prompts using Gemini. Add two new system prompts for when both start and end frames are provided, and modify the user message to include two images.

**Step 1: Add the two-frame system prompts**

After the existing `SYSTEM_GENERATE_REASONING` constant (around line 93), add:

```ts
const SYSTEM_TWOFRAME_SPECIFIC = `You are a motion director. You are given TWO images: a START frame and an END frame from the same shot. Describe the animation that transitions from the first image to the second in under 30 words.

FORMAT: "[Camera movement], [subject action and/or environment change]"

RULES:
1. Camera move FIRST
2. Under 30 words, one sentence
3. Focus ONLY on what changes between the frames — ignore what's static
4. Include a pacing adverb (slowly, rapidly, gently, powerfully, deliberately)
5. Present tense, active voice
6. NEVER use negative phrasing
7. Use standard film terminology

OUTPUT: Return ONLY the animation direction. No quotes, no explanation.`

const SYSTEM_TWOFRAME_REASONING = `You are a motion director. You are given TWO images: a START frame and an END frame from the same shot. Describe the animation that transitions from the first image to the second.

Focus on:
- What moves, changes, or transforms between the frames
- Camera movement (push-in, pull-out, pan, tilt, track, orbit, crane, dolly)
- Pacing and intensity of the motion (slowly, rapidly, gently, powerfully)
- Environmental changes (lighting shifts, particles, atmosphere)

RULES:
1. 30-80 words
2. Camera direction first, then subject action, then atmosphere
3. Present tense, active voice
4. Describe MOTION and CHANGE, not what's already there
5. Include motion intensity adverbs — the model cannot infer speed
6. NEVER use negative phrasing — only describe what DOES happen
7. Use standard film terminology
8. When appropriate, describe 2-3 sequential actions in chronological order

OUTPUT: Return ONLY the animation direction. No quotes, no explanation.`
```

**Step 2: Update `getSystemPrompt` to handle two-frame mode**

Replace the `getSystemPrompt` function:

```ts
function getSystemPrompt(
  mode: PromptMode,
  style: PromptStyle,
  options?: { audioEnabled?: boolean; multiShot?: boolean; hasTwoFrames?: boolean }
): string {
    let base: string

    if (options?.hasTwoFrames) {
      // Two-frame mode: always generate (never enhance), use two-frame prompts
      base = style === 'specific' ? SYSTEM_TWOFRAME_SPECIFIC : SYSTEM_TWOFRAME_REASONING
    } else if (mode === 'generate' && style === 'specific') base = SYSTEM_GENERATE_SPECIFIC
    else if (mode === 'generate' && style === 'reasoning') base = SYSTEM_GENERATE_REASONING
    else if (mode === 'enhance' && style === 'specific') base = SYSTEM_ENHANCE_SPECIFIC
    else base = SYSTEM_ENHANCE_REASONING

    if (options?.audioEnabled) base += AUDIO_ADDON
    if (options?.multiShot) base += MULTI_SHOT_ADDON

    return base
}
```

**Step 3: Add `lastFrameUrl` to the request interface**

In `AnimationPromptRequest` (the server-side one around line 166):

```ts
interface AnimationPromptRequest {
    imageUrl: string
    lastFrameUrl?: string  // NEW
    originalPrompt?: string
    existingPrompt?: string
    mode: PromptMode
    promptStyle?: PromptStyle
    storyContext?: string
    directorMotion?: string
    audioEnabled?: boolean
    multiShot?: boolean
}
```

**Step 4: Update the POST handler to use two frames**

In the POST handler, after destructuring (around line 250):

```ts
const { imageUrl, lastFrameUrl, originalPrompt, existingPrompt, mode, promptStyle, storyContext, directorMotion, audioEnabled, multiShot } = body
```

Update the `getSystemPrompt` call (around line 261):

```ts
const hasTwoFrames = !!lastFrameUrl
const systemPrompt = getSystemPrompt(
  hasTwoFrames ? 'generate' : mode,
  effectiveStyle,
  { audioEnabled, multiShot, hasTwoFrames }
)
```

When building the user message text, add context about two frames (after the storyContext block, before the mode-specific instruction):

```ts
if (hasTwoFrames) {
    textParts.push('You are given TWO images. The FIRST image is the START frame and the SECOND image is the END frame. Describe the transition between them.')
} else if (mode === 'generate') {
    textParts.push('Analyze the image and create an animation direction that feels natural for this scene.')
} else {
    textParts.push('Analyze the image and enhance the user\'s animation prompt while keeping their core intent.')
}
```

When building `userContent`, add the second image if present:

```ts
const userContent: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [
    { type: 'text', text: textParts.join('\n\n') },
    { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } }
]

if (lastFrameUrl) {
    userContent.push({ type: 'image_url', image_url: { url: lastFrameUrl, detail: 'low' } })
}
```

**Step 5: Build and verify**

```bash
rm -rf .next && npm run build
```

**Step 6: Commit**

```bash
git add src/app/api/animation-prompt/generate/route.ts
git commit -m "feat(animation-prompt): add two-frame transition prompts for start+end frame analysis"
git push origin main
```

---

### Task 5: Pass `lastFrameUrl` from CompactShotCard to magic wand

**Files:**
- Modify: `src/features/shot-animator/components/CompactShotCard.tsx`

**Context:** The `handleGenerateAnimationPrompt` function calls `generateAnimationPrompt(config.imageUrl, {...})`. We need to pass `config.lastFrameImage` as `lastFrameUrl` in the options.

**Step 1: Add `lastFrameUrl` to the magic wand call**

Find `handleGenerateAnimationPrompt` (around line 184). The call looks like:

```ts
const result = await generateAnimationPrompt(config.imageUrl, {
    originalPrompt: config.originalPrompt,
    existingPrompt: wandMode === 'enhance' ? config.prompt : undefined,
    mode: wandMode,
    promptStyle: ...,
    audioEnabled: ...,
    multiShot: ...,
})
```

Add `lastFrameUrl`:

```ts
const result = await generateAnimationPrompt(config.imageUrl, {
    originalPrompt: config.originalPrompt,
    existingPrompt: wandMode === 'enhance' ? config.prompt : undefined,
    mode: wandMode,
    promptStyle: ...,
    audioEnabled: ...,
    multiShot: ...,
    lastFrameUrl: config.lastFrameImage,  // NEW: two-frame mode when last frame exists
})
```

**Step 2: Build and verify**

```bash
rm -rf .next && npm run build
```

**Step 3: Commit**

```bash
git add src/features/shot-animator/components/CompactShotCard.tsx
git commit -m "feat(shot-animator): pass lastFrameUrl to magic wand for two-frame prompts"
git push origin main
```

---

### Task 6: Clean build + manual test

**Step 1: Clean build**

```bash
rm -rf .next && npm run build
```

Expected: Zero errors, zero warnings.

**Step 2: Manual test plan**

1. Start dev server: `node node_modules/next/dist/bin/next dev --port 3002`
2. Navigate to Shot Animator
3. Add an image (drag or upload)
4. Select a model that supports last frame (e.g., seedance-lite, wan-2.2-i2v-fast)
5. Open Last Frame modal → verify "Generate with AI" button appears
6. Click "Generate with AI" → verify loading state, then generated image appears
7. Click Save → verify last frame thumbnail appears on shot card
8. Click magic wand → verify the generated prompt describes the TRANSITION between frames (not just the start frame)
9. Test with no last frame → verify magic wand still works as before (single-frame mode)

**Step 3: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix(shot-animator): final frame generation fixes" && git push origin main
```
