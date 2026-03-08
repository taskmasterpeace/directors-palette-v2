# LoRA System Design

**Date:** 2026-03-08
**Status:** Approved, ready for implementation planning

---

## Overview

Redesign the LoRA system from a simple toggle list into a full community-driven library with character and style LoRAs that users can browse, add to their collection, and stack during generation.

## Model Lineup (Implemented)

| Model | Type | Cost | Best For |
|-------|------|------|----------|
| Nano Banana 2 | Generation | 10-15 pts | Text rendering, Google search, up to 14 refs |
| Z-Image Turbo | Generation | 3 pts | Ultra-fast, LoRA support, concept exploration |
| Z-Image Edit | Editing | 2 pts | Edit images: add/remove objects, bg swap, style transfer |

- Z-Image Turbo: no image inputs (text-to-image only), supports LoRAs
- Z-Image Edit: requires input image, instruction-based editing
- Nano Banana 2: up to 14 reference images, no LoRA support
- LoRA section only visible when Z-Image Turbo is selected

## LoRA Types

### Character LoRAs
- Represent a specific character (person, creature, etc.)
- `@tag` in prompt gets **replaced** with the trigger phrase
- Example: `@marcus standing on a cliff` -> `ohwx man standing on a cliff`

### Style LoRAs
- Represent a visual style (Nava, Battle Rap, etc.)
- `@tag` trigger phrase gets **prepended or appended** to the prompt
- Example: `a warrior @nava` -> `in the style of nava, a warrior`

## LoRA Data Model

```typescript
interface LoraItem {
  id: string
  name: string
  type: 'character' | 'style'      // NEW
  referenceTag: string              // NEW - e.g. 'nava', 'marcus'
  triggerWord: string               // Actual text sent to model
  weightsUrl: string
  thumbnailUrl?: string
  defaultGuidanceScale: number
  defaultLoraScale: number
  createdAt: number
}
```

## Community Tab (Browse & Add)

**Location:** New tab in prompt tools: `Library | Wildcards | Recipes | Styles | LoRAs`

### Layout
- **Thumbnail grid** - visual-first browsing
- **Two sections**: Characters and Styles (sub-headers or filter pills)
- **Add button (+)** on each card to add to personal collection
- **Admin curated** - only admins can add LoRAs to the community catalog

### Card Design
- Thumbnail image (or placeholder icon)
- Name
- Type badge (Character/Style)
- `+` button to add to collection (or checkmark if already added)

## Generation Controls (Z-Image Turbo Only)

### Two Dropdown Slots
- **Character** dropdown: pick from added character LoRAs (or "None")
- **Style** dropdown: pick from added style LoRAs (or "None")
- Each selected LoRA shows inline scale slider
- **Can stack multiple**: multiple characters + multiple styles simultaneously

### Empty State
- If no LoRAs added: "No characters added" / "No styles added" with "Browse" link to LoRAs tab
- Nudges user to the community tab

### Visibility Rules
- LoRA section: **hidden on Nano Banana 2 and Z-Image Edit**
- Reference images: **hidden on Z-Image Turbo** (text-to-image only)
- Reference images: **required on Z-Image Edit** (editing model)

## @tag System

- Each LoRA gets a reference tag (e.g. `@nava`, `@marcus`)
- Tags appear in autocomplete alongside reference images
- **Only added LoRAs** (from community tab) show in autocomplete
- Character tags: replace `@tag` with trigger phrase in prompt
- Style tags: prepend/append trigger phrase to prompt
- Multiple tags can be used in one prompt

## Metadata Storage

Every generation saves:
- LoRA name(s) used
- LoRA type(s) (character/style)
- LoRA scale(s)
- Visible when viewing the image in gallery

## Admin Upload Dialog

When adding a new LoRA, admin specifies:
- **Type**: Character or Style (dropdown)
- **Reference tag**: The `@tag` users will use (e.g. `nava`)
- **Trigger phrase**: Actual text sent to model
- Name, weights file, thumbnail (existing fields)
