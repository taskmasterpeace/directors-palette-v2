# Final Frame Generation Design

**Date:** 2026-02-27
**Scope:** 2 features — AI Final Frame Generation in LastFrameModal, Two-Frame Magic Wand Enhancement

---

## Overview

Given a start frame, the Shot Animator can auto-generate what the scene looks like 15 seconds later using Nano Banana 2. This becomes the last frame. The magic wand then analyzes both frames to describe the transition — producing a more accurate animation prompt.

---

## Feature 1: AI Final Frame Generation

**Location:** Inside `LastFrameModal.tsx`, new "Generate with AI" section alongside existing drag-drop upload.

### Flow

1. User opens Last Frame modal on a shot card
2. Sees existing drag-drop zone + new **"Generate with AI"** button
3. Clicks button → loading spinner appears
4. System sends the shot's start frame as a reference image to Nano Banana 2 with the temporal advancement prompt
5. Generated image appears in the modal as a preview
6. User can: Accept (sets as last frame), Regenerate, or discard and upload manually

### Temporal Prompt

```
TEMPORAL UNIT ACTIVE. Input: reference image. Directive: render this scene as it appears 15 seconds later. Maintain all characters, style, lighting, and framing. Show realistic progression of motion, expression, and environment — nothing more, nothing less.
```

Hardcoded. Always 15 seconds. No user-adjustable controls.

### Image Generation

- **Model:** Nano Banana 2
- **Reference image:** The shot's start frame (passed as `referenceImages[0]`)
- **Aspect ratio:** Match the start frame's aspect ratio (or default 16:9)
- **Credits:** Standard Nano Banana 2 pricing

### API

Reuse existing `/api/generation/image` endpoint. The frontend calls `imageGenerationService.generateImage()` with:
- `model: 'nano-banana-2'`
- `prompt: TEMPORAL_PROMPT`
- `referenceImages: [startFrameUrl]`
- `modelSettings: { aspectRatio: '16:9' }`
- `waitForResult: true` (poll for result, return completed image URL)

Since `waitForResult` is supported by the image generation API (already used by storyboard batch generation), the modal can await the result directly.

### UI States

| State | Display |
|-------|---------|
| Idle | "Generate with AI" button below drag-drop zone |
| Generating | Spinner + "Generating final frame..." text, button disabled |
| Preview | Generated image shown with Accept/Regenerate buttons |
| Error | Error message with Retry button |

---

## Feature 2: Two-Frame Magic Wand Enhancement

**Location:** `animation-prompt.service.ts` + `/api/animation-prompt/generate` API

### Auto-Detection

When the magic wand is clicked:
- If `lastFrameUrl` exists on the shot config → use two-frame mode
- If no last frame → use existing single-frame mode (no change)

### Two-Frame System Prompts

**Reasoning style (Seedance models):**
```
You are a motion director. You are given TWO images: a START frame and an END frame from the same shot. Describe the animation that transitions from the first image to the second. Focus on:
- What moves, changes, or transforms between the frames
- Camera movement (push, pull, pan, tilt, track)
- Pacing and intensity of the motion
- Environmental changes (lighting shifts, particles, atmosphere)

Output 30-80 words. Camera direction first. Describe MOTION, not what's static.
```

**Specific style (WAN/Kling models):**
```
You see two frames: START and END of the same shot. Describe the transition in under 30 words. Camera move first, then subject action. Focus only on what changes.
```

### API Changes

The `/api/animation-prompt/generate` endpoint currently accepts `imageUrl` (single image). Add optional `lastFrameUrl` parameter:

```ts
// Request body additions
{
  imageUrl: string       // Start frame (existing)
  lastFrameUrl?: string  // End frame (new, optional)
  // ... existing fields
}
```

When `lastFrameUrl` is present:
- Send two images in the Gemini vision request (start frame first, end frame second)
- Use the two-frame system prompt variant
- Ignore `mode` parameter (always "generate" when two frames given)

### Frontend Changes

`animation-prompt.service.ts` passes `lastFrameUrl` from shot config.
`CompactShotCard.tsx` reads `lastFrameUrl` from shot config when calling the service.

---

## Data Flow

```
Start Frame (user uploads)
  → "Generate with AI" button in LastFrameModal
  → /api/generation/image (Nano Banana 2 + temporal prompt + reference image)
  → waitForResult: true → returns completed image URL
  → Sets as lastFrameUrl on shot config

Start Frame + Last Frame (both set)
  → Magic Wand clicked
  → /api/animation-prompt/generate (both images + two-frame system prompt)
  → Gemini 2.0 Flash analyzes transition between frames
  → Returns animation prompt describing the motion
  → User generates video with start frame, last frame, and AI prompt
```

---

## Non-Goals

- Custom time jump controls (always 15 seconds)
- Multiple final frame candidates to choose from
- Editing the temporal prompt
- Auto-generating final frame when magic wand is clicked (explicit user action in modal)
- Model selection for final frame generation (always Nano Banana 2)
