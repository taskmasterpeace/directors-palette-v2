# Directors Palette API Guide for AI Agents

Base URL: `https://directorspalette.app`

## Authentication

All requests require a Bearer token:
```
Authorization: Bearer dp_your_api_key_here
```

---

## Endpoint 1: Generate Image

**POST `/api/v1/images/generate`**

### Basic Request

```json
{
  "prompt": "A cinematic wide shot of a lone astronaut standing on Mars, golden hour lighting, dust particles in the air, Ridley Scott style",
  "model": "nano-banana-2",
  "aspectRatio": "16:9"
}
```

### Full Request Shape

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | The image description |
| `model` | string | No | `nano-banana-2` | Model to use (see Models below) |
| `aspectRatio` | string | No | `1:1` | Aspect ratio |
| `outputFormat` | string | No | `jpg` | `jpg` or `png` |
| `referenceImages` | string[] | No | `[]` | Array of public image URLs for style/content reference |
| `seed` | number | No | - | For reproducible results |
| `enableAnchorTransform` | boolean | No | `false` | Style transfer mode (see below) |
| `resolution` | string | No | `1K` | `1K` or `2K` (nano-banana-2 only) |
| `safetyFilterLevel` | string | No | - | Safety filter (nano-banana-2 only) |
| `numInferenceSteps` | number | No | - | Quality steps (z-image-turbo only) |
| `guidanceScale` | number | No | - | Prompt adherence 0-20 (z-image-turbo only) |

### Aspect Ratios

`1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`, `3:2`, `2:3`

### Response (Success)

```json
{
  "success": true,
  "imageUrl": "https://storage.supabase.co/.../image.jpg",
  "creditsUsed": 0.10,
  "remainingCredits": 1450,
  "requestId": "api_1234567890_abc123def"
}
```

### Response (Error)

```json
{
  "success": false,
  "error": "Insufficient credits",
  "remainingCredits": 0
}
```

HTTP status codes: `400` (bad request), `401` (auth), `402` (no credits), `403` (wrong scope), `500` (server error)

---

## Endpoint 2: Recipe Execution (Templated Prompts)

**POST `/api/v1/recipes/execute`**

Recipes are prompt templates with fill-in-the-blank variables. Useful for generating variations.

### Request

```json
{
  "template": "A <<SHOT_TYPE:select(close-up,medium shot,wide shot)!>> of <<CHARACTER:name!>> wearing <<OUTFIT:text>>, <<MOOD:select(happy,serious,mysterious)!>> expression, cinematic lighting",
  "variables": {
    "SHOT_TYPE": "close-up",
    "CHARACTER": "Maya",
    "OUTFIT": "a leather jacket and aviator sunglasses",
    "MOOD": "mysterious"
  },
  "model": "nano-banana-2",
  "aspectRatio": "16:9"
}
```

### Template Syntax

| Syntax | Meaning | Example |
|--------|---------|---------|
| `<<NAME:name!>>` | Required short text field | `<<CHARACTER:name!>>` |
| `<<NAME:text>>` | Optional longer text field | `<<DESCRIPTION:text>>` |
| `<<NAME:select(a,b,c)!>>` | Required dropdown selection | `<<MOOD:select(happy,sad)!>>` |
| `\|` (pipe) | Separates multi-stage prompts | `stage1 prompt \| stage2 prompt` |

The `!` suffix means the field is required. Variables without `!` are optional.

### Multi-Stage Recipes

Use `|` to chain stages. Each stage generates one image. The output of each stage becomes the reference image for the next stage:

```json
{
  "template": "A pencil sketch of <<SUBJECT:name!>> | The same sketch now rendered in full color oil painting style | The oil painting with dramatic golden hour lighting added",
  "variables": { "SUBJECT": "a medieval castle on a cliff" },
  "model": "nano-banana-2",
  "aspectRatio": "16:9"
}
```

This generates 3 images, each building on the previous one.

### Response

```json
{
  "success": true,
  "images": [
    { "url": "https://...", "prompt": "A pencil sketch of a medieval castle on a cliff", "stage": 1 },
    { "url": "https://...", "prompt": "The same sketch now rendered in full color oil painting style", "stage": 2 },
    { "url": "https://...", "prompt": "The oil painting with dramatic golden hour lighting added", "stage": 3 }
  ],
  "totalCreditsUsed": 0.30,
  "remainingCredits": 1420,
  "requestId": "recipe_1234567890"
}
```

---

## Models

### nano-banana-2 (Recommended)
- **Cost:** 10 credits/image (1K), 15 credits/image (2K)
- **Speed:** ~60 seconds
- **Best for:** High quality production images, accurate text rendering, image editing
- **Reference images:** Up to 14
- **Special features:** Google search integration, 2K resolution, safety controls, person generation controls

### z-image-turbo
- **Cost:** 3 credits/image
- **Speed:** ~8 seconds
- **Best for:** Fast prototyping, rapid iteration, LoRA-based styles
- **Reference images:** NONE (text-to-image only)
- **Special features:** Ultra-fast, supports custom LoRA models

---

## Anchor Transform (Style Transfer)

Apply one image's style to multiple other images:

```json
{
  "prompt": "Transform into Studio Ghibli animation style",
  "model": "nano-banana-2",
  "enableAnchorTransform": true,
  "referenceImages": [
    "https://example.com/ghibli-style-reference.jpg",
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg",
    "https://example.com/photo3.jpg"
  ]
}
```

- First image = the style anchor (free, not charged)
- Remaining images = inputs to transform (1 credit each)
- Returns array of transformed images

### Response

```json
{
  "success": true,
  "images": [
    "https://storage.supabase.co/.../transformed1.jpg",
    "https://storage.supabase.co/.../transformed2.jpg",
    "https://storage.supabase.co/.../transformed3.jpg"
  ],
  "anchorTransformUsed": true,
  "creditsUsed": 0.30,
  "remainingCredits": 1400
}
```

---

## Prompting Guide

### Structure

The best prompts follow this pattern:
```
[Shot Type] of [Subject], [Details/Action], [Lighting], [Style/Mood], [Technical]
```

### Shot Types
- **Extreme Wide Shot (EWS):** Landscape, environment establishing
- **Wide Shot (WS):** Full body in environment
- **Medium Shot (MS):** Waist up
- **Medium Close-Up (MCU):** Chest up
- **Close-Up (CU):** Face/detail
- **Extreme Close-Up (ECU):** Eyes, texture, tiny detail
- **Over-the-Shoulder (OTS):** Conversation framing
- **Low Angle:** Looking up, makes subject powerful
- **High Angle:** Looking down, makes subject small
- **Dutch Angle:** Tilted, creates tension
- **Bird's Eye:** Directly overhead

### Lighting Keywords
- `golden hour lighting` - warm, cinematic
- `blue hour lighting` - cool, moody
- `Rembrandt lighting` - dramatic side light
- `rim lighting` - backlit edge glow
- `neon lighting` - cyberpunk, urban
- `soft diffused lighting` - even, flattering
- `harsh directional lighting` - dramatic shadows
- `volumetric lighting` - god rays, fog beams
- `practical lighting` - motivated by in-scene sources (lamps, candles)
- `chiaroscuro` - extreme light/dark contrast

### Style Keywords
- `cinematic, film grain, anamorphic` - movie look
- `photorealistic, 8K, sharp detail` - photo look
- `oil painting, impasto brushstrokes` - traditional art
- `watercolor, soft edges, paper texture` - watercolor
- `anime, cel-shaded, vibrant` - anime style
- `noir, high contrast, black and white` - film noir
- `retro 80s, synthwave, neon` - retro aesthetic
- `editorial photography, Vogue` - fashion
- `documentary style, raw, authentic` - doc look
- `Studio Ghibli, whimsical, pastoral` - Ghibli animation

### Mood/Atmosphere
- `ethereal, dreamlike, soft focus`
- `gritty, raw, urban decay`
- `serene, peaceful, zen`
- `tense, suspenseful, ominous`
- `nostalgic, vintage, warm tones`
- `futuristic, sleek, minimalist`
- `chaotic, dynamic, explosive`

### Color Palette Keywords
- `muted earth tones` - browns, greens, tans
- `vibrant saturated colors` - bold, punchy
- `monochromatic blue` - single color family
- `complementary orange and teal` - Hollywood color grade
- `pastel palette` - soft, desaturated
- `warm color palette` - reds, oranges, yellows
- `cool color palette` - blues, greens, purples
- `desaturated, washed out` - faded look

### Reference Images (nano-banana-2)

When you include URLs in `referenceImages`, the model uses them to guide style, composition, or content. Describe HOW you want the reference used in your prompt:

- "In the style of the reference image, create..."
- "Using the same color palette as the reference..."
- "Match the composition and framing of the reference image..."
- "Same character/person as shown in the reference, but now..."

---

## Example Prompts (Copy-Paste Ready)

### Cinematic Scene
```json
{
  "prompt": "A wide shot of a detective in a trench coat walking through rain-soaked Tokyo streets at night, neon signs reflecting in puddles, Blade Runner atmosphere, anamorphic lens flare, cinematic color grading with teal and orange, volumetric fog, 35mm film grain",
  "model": "nano-banana-2",
  "aspectRatio": "21:9"
}
```

### Character Portrait
```json
{
  "prompt": "A medium close-up portrait of an elderly fisherman with weathered skin and kind eyes, wearing a cable-knit sweater, golden hour sidelight, shallow depth of field, Kodak Portra 400 film look, warm tones",
  "model": "nano-banana-2",
  "aspectRatio": "4:5"
}
```

### Product Shot
```json
{
  "prompt": "A luxury perfume bottle on a marble surface, surrounded by fresh roses and gold leaf, soft studio lighting with subtle rim light, editorial product photography, clean minimalist composition, 4K sharp detail",
  "model": "nano-banana-2",
  "aspectRatio": "1:1",
  "resolution": "2K"
}
```

### Environment/Landscape
```json
{
  "prompt": "An extreme wide shot of a solitary lighthouse on dramatic sea cliffs during a storm, massive waves crashing, dark thunderclouds with a single break of golden light, Turner painting meets photorealism, epic scale, moody atmosphere",
  "model": "nano-banana-2",
  "aspectRatio": "16:9"
}
```

### Quick Prototype (Fast)
```json
{
  "prompt": "Cyberpunk street market, crowded, neon signs in Japanese, steam rising from food stalls, rain, nighttime",
  "model": "z-image-turbo",
  "aspectRatio": "16:9"
}
```

### Recipe: Character Sheet
```json
{
  "template": "A <<SHOT:select(full body front view,full body side view,full body back view,close-up face)!>> of <<CHARACTER:name!>>, <<DETAILS:text>>, character design sheet, white background, clean lines",
  "variables": {
    "SHOT": "full body front view",
    "CHARACTER": "a steampunk inventor woman",
    "DETAILS": "brass goggles on forehead, leather apron, mechanical arm, Victorian era clothing with gear motifs"
  },
  "model": "nano-banana-2",
  "aspectRatio": "3:4"
}
```

### Recipe: Multi-Stage Refinement
```json
{
  "template": "A rough concept sketch of <<SCENE:text!>>, pencil on paper, loose gestural lines | The same scene now fully rendered in photorealistic detail, cinematic lighting, 8K | The photorealistic scene reimagined as a vintage travel poster, bold colors, art deco typography saying <<TITLE:name!>>",
  "variables": {
    "SCENE": "a grand bazaar in Marrakech with spice merchants and colorful textiles",
    "TITLE": "MARRAKECH"
  },
  "model": "nano-banana-2",
  "aspectRatio": "3:4"
}
```

---

## cURL Examples

### Simple Generation
```bash
curl -X POST https://directorspalette.app/api/v1/images/generate \
  -H "Authorization: Bearer dp_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene Japanese garden with cherry blossoms, koi pond, wooden bridge, morning mist, soft natural lighting",
    "model": "nano-banana-2",
    "aspectRatio": "16:9"
  }'
```

### With Reference Image
```bash
curl -X POST https://directorspalette.app/api/v1/images/generate \
  -H "Authorization: Bearer dp_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "In the exact style and color palette of the reference image, create a portrait of a young woman with flowers in her hair",
    "model": "nano-banana-2",
    "aspectRatio": "4:5",
    "referenceImages": ["https://example.com/style-reference.jpg"]
  }'
```

### Recipe Execution
```bash
curl -X POST https://directorspalette.app/api/v1/recipes/execute \
  -H "Authorization: Bearer dp_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "A <<SHOT:select(CU,MS,WS)!>> of <<CHARACTER:name!>>, <<ACTION:text>>, cinematic lighting",
    "variables": {"SHOT": "CU", "CHARACTER": "a weary soldier", "ACTION": "looking at a faded photograph"},
    "model": "nano-banana-2",
    "aspectRatio": "16:9"
  }'
```

---

## Tips for AI Agents

1. **Be specific and descriptive.** Vague prompts = vague results. Include shot type, lighting, mood, and style.
2. **Use nano-banana-2 for quality, z-image-turbo for speed.** Prototyping? Use turbo. Final output? Use nano-banana-2.
3. **Reference images are powerful.** If you have a style you want to match, pass it as a reference image and describe what to match in the prompt.
4. **Multi-stage recipes build progressively.** Each stage's output becomes the next stage's reference. Use this for iterative refinement.
5. **Aspect ratio matters.** Landscapes = 16:9 or 21:9. Portraits = 3:4 or 4:5. Social media = 1:1 or 9:16.
6. **Seed for consistency.** If you like a result and want variations, use the same seed with slightly different prompts.
7. **Anchor Transform for batch styling.** Have a style you love? Use it as anchor to apply to many images at once.
8. **z-image-turbo cannot use reference images.** It's text-to-image only. Don't send referenceImages with this model.
9. **Check credits before batch operations.** Use smaller batches to avoid running out mid-generation.
10. **The API is synchronous.** It waits for the image to generate and returns the final URL. Nano-banana-2 takes ~60s, z-image-turbo ~8s.
