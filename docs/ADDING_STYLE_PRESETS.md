# Adding Style Presets to Storybook

This guide explains how to add new art style presets to the Storybook feature.

## Quick Steps

1. **Generate a style guide image** (9-panel grid showing your art style)
2. **Save the image** to `/public/storybook/styles/{style-id}-preset.jpg`
3. **Add an entry** to the `PRESET_STYLES` array in `StyleSelectionStep.tsx`

---

## Step 1: Generate a Style Guide Image

A style guide is a 9-panel grid (16:9 aspect ratio) that demonstrates your art style across different subjects.

### Using the API

```bash
curl -X POST "https://api.replicate.com/v1/predictions" \
  -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "0785fb14f5aaa30eddf06fd49b6cbdaac4541b8854eb314211666e23a29087e3",
    "input": {
      "prompt": "Professional visual style guide sheet. TOP: Dark gray banner with white text '@your_style_name'. BELOW: 3x3 grid of 9 panels in [YOUR STYLE DESCRIPTION]. Panels show: 1) face portrait, 2) casual scene, 3) interior/exterior, 4) animal/creature, 5) action pose, 6) establishing shot, 7) two characters, 8) vehicle/object, 9) group scene. Black borders, white label bars. 16:9 format.",
      "aspect_ratio": "16:9"
    }
  }'
```

### Example Style Descriptions

| Style | Description to use in prompt |
|-------|------------------------------|
| **Anime** | "anime illustration style - large expressive eyes, colorful hair, clean line art, cell shading, vibrant saturated colors" |
| **Oil Painting** | "classical oil painting style - visible brushstrokes, rich color depth, dramatic lighting, renaissance composition" |
| **Minimalist** | "minimalist illustration style - simple shapes, limited color palette, negative space, clean lines, geometric forms" |
| **Retro 80s** | "retro 80s illustration style - neon colors, synthwave aesthetic, chrome effects, grid patterns, sunset gradients" |
| **Chibi** | "chibi illustration style - oversized heads, small bodies, cute proportions, large sparkly eyes, kawaii aesthetic" |

---

## Step 2: Save the Style Guide Image

Download the generated image and save it to:

```
/public/storybook/styles/{style-id}-preset.jpg
```

**Naming convention:**
- Use lowercase
- Replace spaces with hyphens
- End with `-preset.jpg` or `-preset.webp`

**Examples:**
- `anime-preset.jpg`
- `oil-painting-preset.jpg`
- `retro-80s-preset.jpg`

---

## Step 3: Add to PRESET_STYLES Array

Open `src/features/storybook/components/wizard/steps/StyleSelectionStep.tsx` and add your style to the `PRESET_STYLES` array:

```typescript
const PRESET_STYLES = [
  // ... existing styles ...
  {
    id: 'your-style-id',        // Unique identifier (lowercase, hyphens)
    name: 'Your Style Name',     // Display name shown to users
    preview: '/storybook/styles/your-style-id-preset.jpg',  // Path to image
    description: 'Brief description of the style',  // Short description
  },
]
```

---

## Complete Example: Adding "Anime" Style

### 1. Generate the style guide

```bash
REPLICATE_TOKEN="your_token_here"

curl -X POST "https://api.replicate.com/v1/predictions" \
  -H "Authorization: Bearer $REPLICATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "0785fb14f5aaa30eddf06fd49b6cbdaac4541b8854eb314211666e23a29087e3",
    "input": {
      "prompt": "Professional visual style guide sheet. TOP: Dark gray banner with white text '@anime'. BELOW: 3x3 grid of 9 panels in anime illustration style - large expressive eyes, colorful hair, clean line art, cell shading, vibrant saturated colors, dynamic action poses. Panels show: 1) close-up portrait, 2) school scene, 3) bedroom interior, 4) cute mascot creature, 5) action pose with motion lines, 6) city skyline, 7) two friends together, 8) mecha robot, 9) group of characters. Black borders, white label bars. 16:9 format.",
      "aspect_ratio": "16:9"
    }
  }'
```

### 2. Wait for completion and get the output URL

```bash
# Check prediction status
curl "https://api.replicate.com/v1/predictions/YOUR_PREDICTION_ID" \
  -H "Authorization: Bearer $REPLICATE_TOKEN"
```

### 3. Download the image

```bash
cd public/storybook/styles
curl -L -o "anime-preset.jpg" "https://replicate.delivery/xezq/YOUR_OUTPUT_URL.jpeg"
```

### 4. Add to PRESET_STYLES

```typescript
{
  id: 'anime',
  name: 'Anime',
  preview: '/storybook/styles/anime-preset.jpg',
  description: 'Japanese anime style with expressive eyes',
},
```

---

## Using the Style Guide Grid API (Alternative)

You can also use the Style Guide Grid API endpoint which is designed specifically for this:

```bash
curl -X POST "http://localhost:3002/api/tools/style-guide-grid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "styleName": "anime",
    "styleDescription": "Japanese anime style - large expressive eyes, colorful hair, clean line art, cell shading, vibrant saturated colors"
  }'
```

This endpoint:
- Generates a properly formatted 9-panel style guide
- Includes the style name banner
- Automatically handles the layout

---

## Tips for Good Style Guides

1. **Be specific** - Include details about line quality, color palette, and rendering technique
2. **Show variety** - The 9 panels should demonstrate the style across different subjects
3. **Consistent lighting** - All panels should have similar lighting approach
4. **Clear examples** - Each panel should clearly show the art style characteristics

---

## Current Preset Styles

| ID | Name | Description |
|----|------|-------------|
| `watercolor` | Watercolor | Soft, dreamy watercolor illustrations |
| `cartoon` | Cartoon | Fun, vibrant cartoon style |
| `storybook` | Classic Storybook | Traditional children's book illustration |
| `pixar` | 3D Animated | Pixar-style 3D rendering |
| `comic-book` | Comic Book | Bold ink outlines, cel shading, vibrant colors |
