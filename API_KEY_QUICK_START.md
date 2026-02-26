# API Key Quick Start Guide

## For Developers Integrating with Director's Palette API

### 1. Get Your API Key

1. Sign in to Director's Palette as an admin user
2. Navigate to `/admin` → **API** tab
3. Click **"Create Key"**
4. Copy the key immediately (shown only once!)
5. Save it securely (e.g., environment variable)

### 2. Make Your First API Call

```bash
curl -X POST https://directorspalette.app/api/v1/images/generate \
  -H "Authorization: Bearer dp_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene mountain landscape at sunset",
    "model": "nano-banana",
    "aspectRatio": "16:9"
  }'
```

### 3. Response

```json
{
  "success": true,
  "imageUrl": "https://tarohelkwuurakbxjyxm.supabase.co/storage/...",
  "creditsUsed": 0.08,
  "remainingCredits": 9992,
  "requestId": "api_1737040123_abc123"
}
```

---

## Available Models

| Model | Cost | Best For |
|-------|------|----------|
| `seedream-5-lite` | 4¢ | Budget-friendly, reasoning, editing |
| `z-image-turbo` | 5¢ | Rapid prototyping |
| `nano-banana` | 8¢ | Quick iterations, style matching |
| `nano-banana-pro` | 20¢ | High-quality 4K production |
| `riverflow-2-pro` | 27¢ | Custom fonts, logos, infographics |

---

## Aspect Ratios

- `1:1` - Square
- `16:9` - Widescreen (landscape)
- `9:16` - Portrait (mobile)
- `4:3` - Standard
- `3:4` - Portrait
- `21:9` - Ultrawide
- `3:2` - Classic photo
- `2:3` - Portrait photo

---

## Reference Images (Style Transfer)

Pass image URLs to match their style:

```json
{
  "prompt": "A cyberpunk city street",
  "model": "nano-banana",
  "referenceImages": [
    "https://example.com/style-guide.jpg",
    "https://example.com/character-ref.png"
  ]
}
```

**Limits by Model**:
- `nano-banana`: Up to 10 images
- `nano-banana-pro`: Up to 14 images
- `seedream-5-lite`: Up to 14 images
- `riverflow-2-pro`: Up to 10 source + 4 detail refs
- `z-image-turbo`: None (text-to-image only)

---

## Anchor Transform (@!) - Batch Style Transfer

Use one image (anchor) to transform multiple other images in a consistent style. **Cost-effective**: Only pay for input images, not the anchor!

### How It Works

1. Provide 2+ reference images in `referenceImages` array
2. Set `enableAnchorTransform: true`
3. First image = anchor (style guide)
4. Remaining images = inputs to be transformed
5. API returns an array of transformed images

### Example Request

```json
{
  "prompt": "Transform into claymation style",
  "model": "nano-banana",
  "enableAnchorTransform": true,
  "referenceImages": [
    "https://example.com/claymation-style-guide.jpg",
    "https://example.com/character1.jpg",
    "https://example.com/character2.jpg",
    "https://example.com/character3.jpg"
  ]
}
```

### Example Response

```json
{
  "success": true,
  "images": [
    "https://storage.supabase.co/.../character1-claymation.jpg",
    "https://storage.supabase.co/.../character2-claymation.jpg",
    "https://storage.supabase.co/.../character3-claymation.jpg"
  ],
  "anchorTransformUsed": true,
  "creditsUsed": 0.24,
  "remainingCredits": 9976
}
```

**Cost Breakdown**: 3 input images x $0.08 = $0.24 (anchor is FREE!)

### cURL Example

```bash
curl -X POST https://directorspalette.app/api/v1/images/generate \
  -H "Authorization: Bearer dp_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Transform to anime style",
    "model": "nano-banana",
    "enableAnchorTransform": true,
    "referenceImages": [
      "https://example.com/anime-style.jpg",
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg"
    ]
  }'
```

### Python Example

```python
def anchor_transform_batch(anchor_url, input_urls, prompt="Transform to match style"):
    """Transform multiple images using one anchor style."""

    reference_images = [anchor_url] + input_urls

    payload = {
        "prompt": prompt,
        "model": "nano-banana",
        "enableAnchorTransform": True,
        "referenceImages": reference_images
    }

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    response = requests.post(API_URL, json=payload, headers=headers)
    result = response.json()

    if result["success"]:
        print(f"Transformed {len(result['images'])} images")
        print(f"Cost: ${result['creditsUsed']}")
        print(f"Anchor was FREE (only paid for {len(input_urls)} inputs)")
        return result["images"]
    else:
        print(f"Error: {result['error']}")
        return []

# Usage
anchor = "https://example.com/watercolor-style.jpg"
inputs = [
    "https://example.com/landscape1.jpg",
    "https://example.com/landscape2.jpg",
    "https://example.com/landscape3.jpg",
    "https://example.com/landscape4.jpg",
]

transformed_images = anchor_transform_batch(anchor, inputs, "Watercolor painting style")
```

### Use Cases

- **Character Consistency**: Transform 10 character photos into one art style
- **Brand Style Guides**: Apply company visual style to product images
- **Storyboard Shots**: Convert script scenes to consistent cinematic style
- **Batch Processing**: Process 100 images for $8 instead of $16

---

## Code Examples

### Python

```python
import requests

API_KEY = "dp_your_api_key_here"
API_URL = "https://directorspalette.app/api/v1/images/generate"

def generate_image(prompt, model="nano-banana", aspect_ratio="16:9"):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "prompt": prompt,
        "model": model,
        "aspectRatio": aspect_ratio
    }

    response = requests.post(API_URL, json=payload, headers=headers)
    return response.json()

# Example usage
result = generate_image("A serene mountain landscape at sunset")
if result["success"]:
    print(f"Image URL: {result['imageUrl']}")
    print(f"Credits used: {result['creditsUsed']}")
else:
    print(f"Error: {result['error']}")
```

### JavaScript/TypeScript

```typescript
const API_KEY = "dp_your_api_key_here";
const API_URL = "https://directorspalette.app/api/v1/images/generate";

interface GenerateImageRequest {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  referenceImages?: string[];
  seed?: number;
}

interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  creditsUsed?: number;
  remainingCredits?: number;
  error?: string;
  requestId?: string;
}

async function generateImage(
  request: GenerateImageRequest
): Promise<GenerateImageResponse> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return await response.json();
}

// Example usage
const result = await generateImage({
  prompt: "A serene mountain landscape at sunset",
  model: "nano-banana",
  aspectRatio: "16:9",
});

if (result.success) {
  console.log(`Image URL: ${result.imageUrl}`);
  console.log(`Credits used: ${result.creditsUsed}`);
} else {
  console.error(`Error: ${result.error}`);
}
```

### Node.js

```javascript
const fetch = require('node-fetch');

const API_KEY = process.env.DIRECTORS_PALETTE_API_KEY;
const API_URL = 'https://directorspalette.app/api/v1/images/generate';

async function generateImage(prompt, options = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      model: options.model || 'nano-banana',
      aspectRatio: options.aspectRatio || '1:1',
      ...options
    })
  });

  return await response.json();
}

// Example usage
(async () => {
  const result = await generateImage(
    'A serene mountain landscape at sunset',
    { model: 'nano-banana', aspectRatio: '16:9' }
  );

  if (result.success) {
    console.log('Image URL:', result.imageUrl);
    console.log('Credits used:', result.creditsUsed);
  } else {
    console.error('Error:', result.error);
  }
})();
```

---

## Error Handling

### Common Error Responses

#### 401 Unauthorized - Missing/Invalid API Key
```json
{
  "success": false,
  "error": "Invalid or expired API key"
}
```

**Fix**: Check your API key is correct and active.

#### 402 Payment Required - Insufficient Credits
```json
{
  "success": false,
  "error": "Insufficient credits",
  "remainingCredits": 0
}
```

**Fix**: Purchase more credits in the app.

#### 403 Forbidden - Missing Scope
```json
{
  "success": false,
  "error": "API key does not have images:generate scope"
}
```

**Fix**: Regenerate your API key with correct scopes.

#### 400 Bad Request - Invalid Parameters
```json
{
  "success": false,
  "error": "Invalid model: invalid-model. Use: nano-banana, nano-banana-pro, ..."
}
```

**Fix**: Check your request parameters match the API spec.

---

## Check Your Usage

### Get Usage Statistics

```bash
curl -X GET "https://directorspalette.app/api/v1/usage?days=30" \
  -H "Authorization: Bearer dp_your_api_key_here"
```

### Response

```json
{
  "period": "Last 30 days",
  "currentCredits": 10000,
  "totalRequests": 42,
  "totalCreditsUsed": 3.36,
  "averageResponseTime": 1234,
  "requestsByEndpoint": {
    "/api/v1/images/generate": 42
  },
  "requestsByDay": [
    {
      "date": "2026-01-16",
      "count": 10,
      "credits": 0.8
    }
  ],
  "recentRequests": [...]
}
```

---

## Best Practices

### 1. Store API Keys Securely

```bash
# .env file (never commit!)
DIRECTORS_PALETTE_API_KEY=dp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Handle Errors Gracefully

```python
try:
    result = generate_image(prompt)
    if not result["success"]:
        print(f"API Error: {result['error']}")
except requests.exceptions.RequestException as e:
    print(f"Network Error: {e}")
```

### 3. Use Seed for Reproducibility

```json
{
  "prompt": "A serene mountain landscape",
  "seed": 12345
}
```

Same seed + same prompt = same image.

### 4. Monitor Your Credits

```python
result = generate_image(prompt)
print(f"Remaining credits: ${result['remainingCredits'] / 100:.2f}")

if result['remainingCredits'] < 100:  # Less than $1
    print("Warning: Low credits!")
```

### 5. Use Reference Images for Consistency

For character consistency or style matching:

```json
{
  "prompt": "@character_name in a modern office",
  "referenceImages": [
    "https://example.com/character-sheet.jpg"
  ]
}
```

---

## Rate Limits

Currently no rate limits enforced. Use responsibly!

**Recommended limits**:
- Max 100 requests/hour per key
- Max 1000 requests/day per key

---

## Advanced: Model-Specific Parameters

### nano-banana-pro

```json
{
  "prompt": "High-quality portrait",
  "model": "nano-banana-pro",
  "resolution": "4k",
  "safetyFilterLevel": "strict"
}
```

### z-image-turbo

```json
{
  "prompt": "Quick concept art",
  "model": "z-image-turbo",
  "numInferenceSteps": 4,
  "guidanceScale": 7.5
}
```

---

## Support

- **Issues**: Check `/admin` -> **API** tab for usage stats
- **Credits**: Purchase at `/credits`
- **Questions**: Contact support or check documentation

---

**Quick Links**:
- API Dashboard: `/admin` -> API tab
- Credits: `/credits`
- Gallery: `/gallery`
- Help: `/help`
