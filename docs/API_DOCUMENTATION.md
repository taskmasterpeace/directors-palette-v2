# Director's Palette External API Documentation

**Base URL:** `https://directorspalette.app/api/v1`

**Authentication:** Bearer Token (API Key)
```
Authorization: Bearer dp_your_api_key
```

API keys are available to admin users only. Keys are auto-generated when an admin account is created.

---

## Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/images/generate` | POST | Generate images from text prompts |
| `/api/v1/recipes` | GET | List all available recipe templates |
| `/api/v1/recipes/execute` | POST | Execute a recipe with variable substitution |
| `/api/v1/keys` | GET/POST/DELETE | Manage API keys (admin only) |
| `/api/v1/usage` | GET | View API usage statistics |

---

## Image Generation

### POST /api/v1/images/generate

Generate images from text prompts using various AI models.

#### Request Body

```json
{
  "prompt": "A serene mountain landscape at sunset",
  "model": "nano-banana",
  "aspectRatio": "16:9",
  "outputFormat": "jpg",
  "referenceImages": ["https://example.com/reference.jpg"],
  "seed": 12345
}
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | Text description for image generation |
| `model` | string | No | nano-banana | Model to use (see Models section) |
| `aspectRatio` | string | No | 1:1 | Image aspect ratio |
| `outputFormat` | string | No | webp | Output format: webp, jpg, png |
| `referenceImages` | string[] | No | [] | URLs of reference images for style matching |
| `seed` | number | No | - | Seed for reproducible results |

#### Model-Specific Parameters

**nano-banana-pro only:**
- `resolution`: "1K" | "2K" | "4K" (default: "2K")
- `safetyFilterLevel`: "block_low_and_above" | "block_medium_and_above" | "block_only_high"

**z-image-turbo only:**
- `numInferenceSteps`: 1-4 (default: 2)
- `guidanceScale`: 0-2 (default: 1.0)

**qwen-image-fast only:**
- `guidance`: 0-10 (default: 3) - Guidance scale
- `num_inference_steps`: 10-50 (default: 30)
- `negative_prompt`: string - Things to avoid

**gpt-image-low / gpt-image-medium / gpt-image-high:**
- `background`: "opaque" | "transparent" | "auto" (default: "opaque") - Background type
- `numImages`: 1-10 (default: 1) - Number of images to generate (cost multiplied by count)
- Note: Only supports aspect ratios 1:1, 3:2, 2:3

#### Response

```json
{
  "success": true,
  "imageUrl": "https://storage.supabase.co/...",
  "creditsUsed": 0.06,
  "remainingCredits": 1234,
  "requestId": "api_1702657890_abc123"
}
```

#### Example

```bash
curl -X POST https://directorspalette.app/api/v1/images/generate \
  -H "Authorization: Bearer dp_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene mountain landscape at sunset",
    "model": "nano-banana",
    "aspectRatio": "16:9"
  }'
```

---

## Available Models

### qwen-image-fast (Fastest & Cheapest)
- **Speed:** Almost Instant (~1 sec)
- **Quality:** Good
- **Cost:** 2 points ($0.02)
- **Reference Images:** None (text-to-image only)
- **Best For:** Ultra-fast generation, real-time previews, rapid prototyping, bulk operations

### z-image-turbo
- **Speed:** Very Fast (~2 sec)
- **Quality:** Good
- **Cost:** 5 points ($0.05)
- **Reference Images:** Up to 1
- **Best For:** Quick visualization with style reference

### nano-banana
- **Speed:** Fast (~5 sec)
- **Quality:** Good
- **Cost:** 8 points ($0.08)
- **Reference Images:** Up to 10
- **Best For:** Style matching, consistent character generation, reference-based work

### nano-banana-pro (Highest Quality)
- **Speed:** Medium (~8 sec)
- **Quality:** Excellent (SOTA)
- **Cost:** 20 points ($0.20)
- **Reference Images:** Up to 14
- **Resolution:** Up to 4K
- **Best For:** Production-quality images, accurate text rendering, final assets

### gpt-image-low (Fast Drafts)
- **Speed:** Fast (~3 sec)
- **Quality:** Good
- **Cost:** 3 points ($0.03)
- **Reference Images:** None
- **Special Features:** Transparent PNG backgrounds, multi-image generation (1-10)
- **Aspect Ratios:** 1:1, 3:2, 2:3 only
- **Best For:** Quick iterations, compositing work, transparent backgrounds

### gpt-image-medium (Standard)
- **Speed:** Medium (~5 sec)
- **Quality:** Very Good
- **Cost:** 10 points ($0.10)
- **Reference Images:** None
- **Special Features:** Transparent PNG backgrounds, multi-image generation (1-10)
- **Aspect Ratios:** 1:1, 3:2, 2:3 only
- **Best For:** Balanced quality/speed, product images, text-heavy designs

### gpt-image-high (Premium)
- **Speed:** Slower (~8 sec)
- **Quality:** Excellent
- **Cost:** 27 points ($0.27)
- **Reference Images:** None
- **Special Features:** Transparent PNG backgrounds, multi-image generation (1-10)
- **Aspect Ratios:** 1:1, 3:2, 2:3 only
- **Best For:** Final renders, premium quality, professional assets

---

## Aspect Ratios

| Ratio | Dimensions | Use Case |
|-------|------------|----------|
| 1:1 | 1024x1024 | Square, social media |
| 16:9 | 1280x720 | Widescreen, video |
| 9:16 | 720x1280 | Portrait, mobile |
| 4:3 | 1024x768 | Classic photo |
| 3:4 | 768x1024 | Portrait photo |
| 21:9 | 1344x576 | Ultrawide, cinematic |
| 3:2 | 1152x768 | Photo landscape |
| 2:3 | 768x1152 | Photo portrait |

---

## Recipes

### GET /api/v1/recipes

List all available recipe templates with their field definitions.

**No authentication required** - recipes are public.

#### Response

```json
{
  "success": true,
  "recipes": [
    {
      "id": "recipe_1",
      "name": "Style Guide Grid",
      "description": "Create a 2x3 visual style guide with 6 example tiles",
      "recipeNote": "Attach a style reference image...",
      "template": "Create a visual style guide...",
      "fields": [
        {
          "name": "STYLE_NAME",
          "label": "Style Name",
          "type": "text",
          "required": true,
          "description": "Name for the style guide being created"
        }
      ],
      "stageCount": 1,
      "suggestedAspectRatio": "3:2",
      "category": "styles",
      "quickAccessLabel": "StyleGuide"
    }
  ],
  "total": 6,
  "categories": ["characters", "scenes", "styles", "products", "custom"],
  "commonOptions": {
    "shotTypes": ["ECU", "BCU", "CU", "MCU", "MS", "MCS", "MWS", "WS", "EWS", "EST"],
    "cameraAngles": ["eye-level", "low-angle", "high-angle", "dutch", "birds-eye", "worms-eye", "POV", "OTS"],
    "lighting": ["natural", "golden-hour", "dramatic", "soft", "rim", "silhouette", "high-key", "low-key"],
    "moods": ["dramatic", "peaceful", "tense", "joyful", "mysterious", "romantic", "energetic"]
  },
  "templateSyntax": {...}
}
```

---

### POST /api/v1/recipes/execute

Execute a recipe template with variable substitution.

#### Request Body

```json
{
  "template": "A <<SHOT_TYPE:select(CU,MS,WS)!>> shot of <<CHARACTER:name!>>",
  "variables": {
    "SHOT_TYPE": "CU",
    "CHARACTER": "Maya"
  },
  "model": "nano-banana",
  "aspectRatio": "16:9",
  "outputFormat": "jpg",
  "referenceImages": ["https://example.com/style.jpg"],
  "seed": 12345
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `template` | string | Yes | Recipe template with placeholders |
| `variables` | object | Yes | Key-value pairs for placeholders |
| `model` | string | No | Model to use (default: nano-banana) |
| `aspectRatio` | string | No | Aspect ratio (default: 1:1) |
| `outputFormat` | string | No | jpg or png (default: jpg) |
| `referenceImages` | string[] | No | Style reference URLs |
| `seed` | number | No | Seed for reproducibility |

#### Multi-Stage Recipes

Use `|` (pipe) to separate stages. Each stage generates an image, with the previous stage's output becoming the reference for the next.

```json
{
  "template": "Stage 1: <<SUBJECT:text!>> | Stage 2: Close-up of the same subject | Stage 3: Wide shot showing environment",
  "variables": {
    "SUBJECT": "A mysterious forest"
  }
}
```

#### Response

```json
{
  "success": true,
  "images": [
    {
      "url": "https://storage.supabase.co/.../image1.jpg",
      "prompt": "Stage 1: A mysterious forest",
      "stage": 1
    },
    {
      "url": "https://storage.supabase.co/.../image2.jpg",
      "prompt": "Stage 2: Close-up of the same subject",
      "stage": 2
    }
  ],
  "totalCreditsUsed": 0.12,
  "remainingCredits": 1234,
  "requestId": "recipe_1702657890"
}
```

---

## Recipe Template Language (Complete Reference)

Director's Palette uses a powerful template language for creating dynamic, reusable prompts. This section covers everything you need to know.

### Field Syntax

Fields are placeholders that get replaced with user-provided values:

```
<<FIELD_NAME:type>>     - Optional field
<<FIELD_NAME:type!>>    - Required field (note the ! at the end)
```

### Field Types

| Type | Description | Example |
|------|-------------|---------|
| `name` | Short text input (1-3 words) | `<<CHARACTER:name!>>` |
| `text` | Long text input (sentences/paragraphs) | `<<STORY:text!>>` |
| `select(a,b,c)` | Dropdown with predefined options | `<<SHOT:select(CU,MS,WS)!>>` |

### Field Naming

- Use `UPPER_SNAKE_CASE` for field names
- Names should be descriptive: `CHARACTER_NAME`, `SHOT_TYPE`, `BACKGROUND_STYLE`
- Same field name in multiple places = same value (variable reuse)

### Pipe Chaining (Multi-Stage Recipes)

Use `|` to create multi-stage recipes where each stage generates an image:

```
Stage 1 prompt | Stage 2 prompt | Stage 3 prompt
```

**How it works:**
1. Stage 1 generates an image
2. That image becomes the reference for Stage 2
3. Stage 2's output becomes reference for Stage 3
4. And so on...

**Example - Character Evolution:**
```
<<CHARACTER:name!>> as a child, full body portrait |
<<CHARACTER:name!>> as a teenager, same character aged up |
<<CHARACTER:name!>> as an adult, same character fully grown
```

This generates 3 images showing the character at different ages, with each stage using the previous as reference for consistency.

### Common Select Options

**Shot Types:**
```
ECU, BCU, CU, MCU, MS, MCS, MWS, WS, EWS, EST
```
- ECU = Extreme Close-Up (eyes only)
- BCU = Big Close-Up (face fills frame)
- CU = Close-Up (head and shoulders)
- MCU = Medium Close-Up (chest up)
- MS = Medium Shot (waist up)
- WS = Wide Shot (full body + environment)
- EST = Establishing Shot (location-focused)

**Camera Angles:**
```
eye-level, low-angle, high-angle, dutch, birds-eye, worms-eye, POV, OTS
```

**Lighting:**
```
natural, golden-hour, dramatic, soft, rim, silhouette, high-key, low-key
```

**Art Styles:**
```
claymation, anime, 3D render, cartoon, realistic, watercolor, oil painting
```

### Complete Example

**Template:**
```
A <<SHOT_TYPE:select(CU,MS,WS)!>> shot of <<CHARACTER:name!>>
in a <<LOCATION:text>> setting, <<LIGHTING:select(natural,dramatic,golden-hour)>> lighting,
<<STYLE:select(realistic,anime,claymation)>> style
```

**Variables:**
```json
{
  "SHOT_TYPE": "CU",
  "CHARACTER": "Maya",
  "LOCATION": "enchanted forest",
  "LIGHTING": "golden-hour",
  "STYLE": "anime"
}
```

**Result:**
```
A CU shot of Maya in a enchanted forest setting, golden-hour lighting, anime style
```

### API Request Example

```bash
curl -X POST https://directorspalette.app/api/v1/recipes/execute \
  -H "Authorization: Bearer dp_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "A <<SHOT:select(CU,MS,WS)!>> of <<CHAR:name!>> | Close-up detail of same subject",
    "variables": {
      "SHOT": "WS",
      "CHAR": "a mysterious wanderer"
    },
    "model": "nano-banana",
    "aspectRatio": "16:9",
    "referenceImages": ["https://example.com/style-reference.jpg"]
  }'
```

This generates 2 images:
1. Wide shot of the wanderer (with your style reference)
2. Close-up detail (using image 1 as reference for consistency)

---

## Built-in Recipe Templates

### 1. Style Guide Grid
Creates a 2x3 visual style guide with 6 example tiles.

**Fields:**
- `STYLE_NAME` (text, required): Name for the style guide

**Suggested Aspect Ratio:** 3:2

---

### 2. Character Sheet
Two-sided character reference sheet with full-body and expression closeups.

**Fields:**
- `CHARACTER_NAME` (name, required): Character name/tag
- `STYLE` (select): Rendering style (claymation, anime, 3D render, cartoon, realistic, watercolor, oil painting)

**Suggested Aspect Ratio:** 3:2

---

### 3. 9-Frame Cinematic
3x3 cinematic contact sheet covering full shot range.

**Fields:**
- `FRAME_1` through `FRAME_9` (select, required): Shot types for each frame
- `STYLE` (select, optional): Art style override

**Suggested Aspect Ratio:** 1:1

---

### 4. Holiday Vibe
Add holiday decorations and atmosphere to an existing image.

**Fields:**
- `HOLIDAY` (select, required): Christmas, Valentine's Day, Halloween, etc.

**Suggested Aspect Ratio:** 1:1

---

### 5. Story to 9 Frames
Analyze a story and create 9 key frames featuring a character.

**Fields:**
- `CHARACTER_NAME` (name, required): Character identifier
- `STORY` (text, required): Full story or scene description
- `STYLE` (select, optional): Rendering style

**Suggested Aspect Ratio:** 1:1

---

### 6. Time of Day
Same location across 6 different times of day.

**Fields:**
- `NIGHT_LIGHTING` (select, required): Nighttime lighting style
- `STYLE` (select, optional): Rendering style override

**Suggested Aspect Ratio:** 3:2

---

## Error Responses

### Authentication Error (401)
```json
{
  "success": false,
  "error": "Missing API key. Use Authorization: Bearer dp_xxx"
}
```

### Authorization Error (403)
```json
{
  "success": false,
  "error": "API key does not have images:generate scope"
}
```

### Insufficient Credits (402)
```json
{
  "success": false,
  "error": "Insufficient credits",
  "remainingCredits": 0
}
```

### Validation Error (400)
```json
{
  "success": false,
  "error": "Missing required variables: SHOT_TYPE, CHARACTER"
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Rate Limits

- **Standard:** 60 requests/minute
- **Burst:** Up to 100 requests in short bursts

---

## Credits System

Credits are stored in cents (100 credits = $1.00). 1 point = 1 cent.

| Model | Points per Image | Cost |
|-------|------------------|------|
| qwen-image-fast | 2 points | $0.02 |
| gpt-image-low | 3 points | $0.03 |
| z-image-turbo | 5 points | $0.05 |
| nano-banana | 8 points | $0.08 |
| gpt-image-medium | 10 points | $0.10 |
| nano-banana-pro | 20 points | $0.20 |
| gpt-image-high | 27 points | $0.27 |

---

## Usage Tracking

### GET /api/v1/usage

Get API usage statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalRequests": 1500,
    "totalCreditsUsed": 90.50,
    "averageResponseTime": 2340,
    "requestsByEndpoint": {
      "/api/v1/images/generate": 1200,
      "/api/v1/recipes/execute": 300
    },
    "requestsByDay": [
      { "date": "2024-12-15", "count": 150, "credits": 9.00 },
      { "date": "2024-12-16", "count": 200, "credits": 12.00 }
    ]
  },
  "period": "30 days"
}
```

---

## Code Examples

### Python

```python
import requests

API_KEY = "dp_your_api_key"
BASE_URL = "https://directorspalette.app/api/v1"

def generate_image(prompt, model="nano-banana", aspect_ratio="16:9"):
    response = requests.post(
        f"{BASE_URL}/images/generate",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "prompt": prompt,
            "model": model,
            "aspectRatio": aspect_ratio
        }
    )
    return response.json()

# Generate an image
result = generate_image("A sunset over mountains")
print(result["imageUrl"])
```

### JavaScript/Node.js

```javascript
const API_KEY = 'dp_your_api_key';
const BASE_URL = 'https://directorspalette.app/api/v1';

async function generateImage(prompt, options = {}) {
  const response = await fetch(`${BASE_URL}/images/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      model: options.model || 'nano-banana',
      aspectRatio: options.aspectRatio || '16:9',
      ...options,
    }),
  });
  return response.json();
}

// Generate an image
generateImage('A sunset over mountains').then(result => {
  console.log(result.imageUrl);
});
```

### cURL

```bash
# Generate an image
curl -X POST https://directorspalette.app/api/v1/images/generate \
  -H "Authorization: Bearer dp_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A sunset over mountains",
    "model": "qwen-image-fast",
    "aspectRatio": "16:9"
  }'

# Execute a recipe
curl -X POST https://directorspalette.app/api/v1/recipes/execute \
  -H "Authorization: Bearer dp_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "A <<SHOT_TYPE:select(CU,MS,WS)!>> shot of <<CHARACTER:name!>>",
    "variables": {"SHOT_TYPE": "CU", "CHARACTER": "Maya"},
    "model": "nano-banana",
    "aspectRatio": "16:9"
  }'

# List recipes (no auth required)
curl https://directorspalette.app/api/v1/recipes
```

---

## Support

For questions or issues, contact support or open an issue at the repository.
