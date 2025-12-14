# Wardrobe P-Edit Integration Examples

## Overview

The wardrobe system allows artists to **virtually try on** different outfits before shooting the music video.

---

## Example Scenario: Kendrick Lamar - "HUMBLE"

### Input: Artist Reference Photo
```
artistImageUrl: "https://storage.example.com/artists/kendrick-reference.jpg"
```
*(Kendrick standing, neutral pose, good lighting)*

---

## API 1: Generate Wardrobe Preview (Try-On)

### Request
```json
POST /api/wardrobe/generate-preview

{
  "artistImageUrl": "https://storage.example.com/artists/kendrick-reference.jpg",
  "wardrobeDescription": "All-white flowing robe with gold trim, biblical aesthetic, bare feet, minimalist and powerful",
  "aspectRatio": "match_input_image"
}
```

### Response
```json
{
  "success": true,
  "previewUrl": "https://replicate.delivery/pbxt/kendrick-white-robe-preview.jpg",
  "wardrobeDescription": "All-white flowing robe with gold trim..."
}
```

### Result
P-Edit takes Kendrick's face/pose and composites the white robe onto him - he can see exactly how he'll look in the "Last Supper" scene.

---

## API 2: Generate Wardrobe Reference (Lookbook)

### Request
```json
POST /api/wardrobe/generate-reference

{
  "wardrobeName": "Street King",
  "wardrobeDescription": "Black leather jacket with silver zippers, vintage Nike windbreaker underneath, baggy dark jeans, fresh white Air Force 1s, gold chain visible",
  "aspectRatio": "3:4"
}
```

### Response
```json
{
  "success": true,
  "referenceUrl": "https://replicate.delivery/pbxt/street-king-lookbook.jpg",
  "wardrobeName": "Street King",
  "wardrobeDescription": "Black leather jacket..."
}
```

### Result
Clean white-background image showing just the outfit (no person) - for the lookbook grid display.

---

## Full Flow Example: TLC "Waterfalls"

### Step 1: Artist Uploads Reference Photo
```
T-Boz uploads her headshot/body reference
```

### Step 2: Director Proposal Generates Wardrobe Suggestions
Ryan Coogler proposes:
```json
{
  "wardrobeLooks": [
    {
      "lookName": "Water Goddess",
      "description": "Sheer, flowing water-like dress in iridescent blue-green, barefoot, crystal jewelry catching light, ethereal and natural",
      "forSections": ["chorus", "bridge"]
    },
    {
      "lookName": "Urban Reality",
      "description": "90s streetwear - baggy jeans, crop top, Timberland boots, gold hoop earrings, bandana",
      "forSections": ["verse"]
    }
  ]
}
```

### Step 3: Generate Try-On Previews
```typescript
// For each proposed look
const waterGoddessPreview = await wardrobeService.generatePreview({
  artistImageUrl: tbozPhoto,
  wardrobeDescription: "Sheer, flowing water-like dress in iridescent blue-green, barefoot, crystal jewelry catching light, ethereal and natural"
})

const urbanRealityPreview = await wardrobeService.generatePreview({
  artistImageUrl: tbozPhoto,
  wardrobeDescription: "90s streetwear - baggy jeans, crop top, Timberland boots, gold hoop earrings, bandana"
})
```

### Step 4: T-Boz Reviews Previews
She sees herself wearing both outfits:
- ✅ Approves "Water Goddess" for the mystical waterfall scenes
- ✅ Approves "Urban Reality" for the neighborhood verse scenes

### Step 5: Add to Lookbook
Selected looks get white-background reference images generated and saved to the project's wardrobe lookbook.

---

## Service Code Example

```typescript
import { wardrobeService } from '@/features/music-lab/services/wardrobe.service'

// Try on a look
const preview = await wardrobeService.generatePreview({
  artistImageUrl: 'https://storage.com/artist.jpg',
  wardrobeDescription: 'Elegant black suit with red pocket square'
})

if (preview.success) {
  console.log('Preview URL:', preview.previewUrl)
  // Show artist the preview image
}

// Generate lookbook reference
const reference = await wardrobeService.generateReference({
  wardrobeName: 'Power Suit',
  wardrobeDescription: 'Elegant black suit with red pocket square'
})

if (reference.success) {
  console.log('Reference URL:', reference.referenceUrl)
  // Add to wardrobe grid
}
```

---

## P-Edit Model Details

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `images` | [artistImageUrl] | Source image to edit |
| `prompt` | "Change clothing to: {description}" | What to change |
| `aspect_ratio` | match_input_image | Keep original dimensions |
| `seed` | -1 | Random for variations |

---

## Expected P-Edit Output Quality

The P-Edit model:
- Preserves the original face perfectly
- Maintains pose and body position
- Only changes clothing/wardrobe
- Professional fashion photography quality
- Works best with clear, well-lit source photos
