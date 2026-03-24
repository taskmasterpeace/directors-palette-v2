# Directors Palette API v2 Reference

---

## Quick Start

**Base URL:**
```
https://directorspalette.com/api/v2
```

**Generate an image and poll for the result:**

```bash
# 1. Submit a generation job
curl -X POST https://directorspalette.com/api/v2/images/generate \
  -H "Authorization: Bearer dp_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nano-banana-2",
    "prompt": "A cyberpunk cityscape at sunset, neon signs reflecting in rain puddles",
    "aspect_ratio": "16:9"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "job_id": "abc123",
#     "status": "pending",
#     "type": "image",
#     "cost": 4,
#     "created_at": "2026-03-19T12:00:00Z",
#     "completed_at": null,
#     "result": null,
#     "error_message": null
#   }
# }

# 2. Poll until completed
curl https://directorspalette.com/api/v2/jobs/abc123 \
  -H "Authorization: Bearer dp_your_key_here"

# When done:
# {
#   "success": true,
#   "data": {
#     "job_id": "abc123",
#     "status": "completed",
#     "type": "image",
#     "cost": 4,
#     "created_at": "2026-03-19T12:00:00Z",
#     "completed_at": "2026-03-19T12:00:15Z",
#     "result": {
#       "url": "https://storage.example.com/images/abc123.webp"
#     },
#     "error_message": null
#   }
# }
```

---

## Authentication

### Getting an API Key

Generate an API key from the Directors Palette web app under **Settings > API Keys**. Keys use the format `dp_XXXXX` and are shown once on creation. Store it securely -- it cannot be retrieved again.

### Using the Key

Pass the key in the `Authorization` header as a Bearer token:

```
Authorization: Bearer dp_your_key_here
```

### Auth Errors

If the key is missing or invalid, all endpoints return:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid API key"
  }
}
```

**HTTP status: 401**

---

## Response Format

All endpoints return a consistent JSON envelope.

### Success

```json
{
  "success": true,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "prompt is required"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `INSUFFICIENT_PTS` | 402 | Not enough pts for this operation |
| `FORBIDDEN` | 403 | Key valid but action not allowed |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 422 | Bad input -- details in `message` |
| `RATE_LIMITED` | 429 | Too many requests -- see `Retry-After` header |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

- **60 requests per minute** per API key
- When exceeded, the API returns **429** with a `Retry-After` header (seconds until the window resets)

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests"
  }
}
```

Back off for the number of seconds in `Retry-After` before retrying.

---

## Async Jobs

All generation endpoints (images, videos, characters, recipes) are **asynchronous**. They return a job immediately; you poll for the result.

### Job Lifecycle

```
POST /images/generate        GET /jobs/{jobId}          GET /jobs/{jobId}
        |                          |                          |
        v                          v                          v
   +---------+              +------------+              +-----------+
   | pending | -----------> | processing | -----------> | completed |
   +---------+              +------------+              +-----------+
                                   |
                                   +---> failed
```

1. **Submit** -- `POST` to a generation endpoint. You get back a `job_id` with `status: "pending"`.
2. **Poll** -- `GET /api/v2/jobs/{job_id}` every 2-5 seconds until `status` is `"completed"` or `"failed"`.
3. **Result** -- When completed, the `result` field contains the output (URLs, etc.).

### Webhooks (Optional)

Pass a `webhook_url` in your generation request. When the job completes, the API sends a POST to your URL:

```json
{
  "success": true,
  "data": {
    "job_id": "abc123",
    "status": "completed",
    "type": "image",
    "cost": 4,
    "result": { "url": "https://..." }
  }
}
```

Webhook delivery is best-effort (single attempt, 10s timeout). Always implement polling as a fallback.

---

## Endpoints

### GET /api/v2/balance

Returns the current pts balance for the authenticated user.

**Request:** No body required.

**Response:**

```json
{
  "success": true,
  "data": {
    "balance": 500,
    "unit": "pts"
  }
}
```

---

### GET /api/v2/models

Returns all available image and video models with their capabilities and pricing.

**Request:** No body required.

**Response:**

```json
{
  "success": true,
  "data": {
    "image_models": [
      {
        "id": "nano-banana-2",
        "name": "Nano Banana 2",
        "category": "image",
        "type": "generation",
        "cost_pts": 4,
        "supports_img2img": true,
        "supports_loras": false,
        "max_reference_images": 2,
        "requires_input_image": false,
        "supported_aspect_ratios": ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "3:2", "2:3"],
        "estimated_seconds": 15
      }
    ],
    "video_models": [
      {
        "id": "wan-2.2-5b-fast",
        "name": "Wan 2.2 5B Fast",
        "category": "video",
        "type": "generation",
        "cost_pts_per_unit": { "480p": 10, "720p": 15, "1080p": 25 },
        "pricing_type": "per_second",
        "max_duration": 10,
        "supported_resolutions": ["480p", "720p", "1080p"],
        "supported_aspect_ratios": ["16:9", "9:16"],
        "requires_input_image": true
      }
    ]
  }
}
```

Use the `id` field when calling generation endpoints.

---

### GET /api/v2/loras

Returns all LoRAs available to the authenticated user (personal + community).

**Request:** No body required.

**Response:**

```json
{
  "success": true,
  "data": {
    "loras": [
      {
        "id": "uuid-here",
        "name": "Nava Style",
        "type": "style",
        "trigger_word": "nava_style",
        "compatible_models": ["flux-2-klein-9b"],
        "thumbnail_url": "https://...",
        "is_community": true
      }
    ]
  }
}
```

> **Note:** LoRAs are only supported with the `flux-2-klein-9b` model.

---

### POST /api/v2/images/generate

Generate one or more images asynchronously.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Model ID from `/models` (e.g., `"nano-banana-2"`) |
| `prompt` | string | Yes | Text prompt describing the image |
| `aspect_ratio` | string | No | Aspect ratio. Default: `"16:9"`. Options: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`, `3:2`, `2:3` |
| `num_images` | integer | No | Number of images to generate, 1-5. Default: `1` |
| `loras` | array | No | Array of LoRA objects. Only for `flux-2-klein-9b` |
| `reference_image` | string | No | URL of a reference image for img2img |
| `reference_strength` | number | No | Strength of reference image influence (overrides model default) |
| `reference_tag` | string | No | Auto-tag the generated image with this @reference (e.g., `"@sasha-foxworth"`) |
| `reference_category` | string | No | Category for the reference tag: `people`, `places`, `props`, `layouts`, `styles`. Default: `"people"` |
| `seed` | integer | No | Random seed for reproducibility |
| `webhook_url` | string | No | URL to receive a POST when generation completes |

**Response (201):**

Single image (`num_images: 1`):

```json
{
  "success": true,
  "data": {
    "job_id": "abc123",
    "status": "pending",
    "type": "image",
    "cost": 4,
    "created_at": "2026-03-19T12:00:00Z",
    "completed_at": null,
    "result": null,
    "error_message": null
  }
}
```

Multiple images (`num_images` > 1) -- returns an array:

```json
{
  "success": true,
  "data": [
    { "job_id": "abc123", "status": "pending", "type": "image", "cost": 4, ... },
    { "job_id": "abc124", "status": "pending", "type": "image", "cost": 4, ... }
  ]
}
```

**Errors:**
- `422` -- Missing `model` or `prompt`, unknown model, `num_images` out of range, LoRA used with wrong model, editing model missing `reference_image`
- `402` -- Insufficient pts balance

---

### POST /api/v2/videos/generate

Generate a video from a source image (or text, for select models).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | No | Video model ID. Default: `"wan-2.2-5b-fast"` |
| `prompt` | string | Yes | Text prompt describing the motion/scene |
| `source_image` | string | Depends | URL of the source image. Required for all models except `seedance-1.5-pro` and `p-video` |
| `duration` | integer | No | Duration in seconds. Default: `5` |
| `aspect_ratio` | string | No | Aspect ratio. Default: `"16:9"` |
| `fps` | integer | No | Frames per second. Default: `24` |
| `resolution` | string | No | Output resolution: `"480p"`, `"720p"`, `"1080p"`. Default: `"720p"` |
| `camera_fixed` | boolean | No | Lock camera position. Default: `false` |
| `webhook_url` | string | No | URL to receive a POST when generation completes |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "job_id": "vid456",
    "status": "pending",
    "type": "video",
    "cost": 75,
    "created_at": "2026-03-19T12:00:00Z",
    "completed_at": null,
    "result": null,
    "error_message": null
  }
}
```

**Errors:**
- `422` -- Missing `prompt`, unknown model, missing `source_image` for models that require it, invalid duration/resolution per model constraints
- `402` -- Insufficient pts balance

---

### POST /api/v2/characters/generate

Generate a character sheet (turnaround pose + expression sheet) using nano-banana-2.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Character name |
| `description` | string | Yes | Character description (appearance, traits) |
| `style` | string | No | Art style. Default: `"cinematic"` |
| `reference_image` | string | No | URL of a character reference image |
| `style_reference` | string | No | URL of a style reference image |
| `aspect_ratio` | string | No | Aspect ratio. Default: `"16:9"` |
| `webhook_url` | string | No | URL to receive a POST when each side completes |

**Response (201):**

Returns two jobs (turnaround + expressions):

```json
{
  "success": true,
  "data": {
    "turnaround": {
      "job_id": "char-t-123",
      "status": "pending",
      "type": "character",
      "cost": 4,
      "created_at": "2026-03-19T12:00:00Z",
      "completed_at": null,
      "result": null,
      "error_message": null,
      "poll_url": "/api/v2/jobs/char-t-123"
    },
    "expressions": {
      "job_id": "char-e-124",
      "status": "pending",
      "type": "character",
      "cost": 4,
      "created_at": "2026-03-19T12:00:00Z",
      "completed_at": null,
      "result": null,
      "error_message": null,
      "poll_url": "/api/v2/jobs/char-e-124"
    },
    "total_cost": 8
  }
}
```

**Errors:**
- `422` -- Missing `name` or `description`
- `402` -- Insufficient pts balance (costs 2x nano-banana-2 rate)

---

### GET /api/v2/gallery

List gallery images with optional filters.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | 50 | Results per page (max 100) |
| `offset` | integer | 0 | Pagination offset |
| `reference` | string | — | Filter by @reference tag (e.g., `"@sasha-foxworth"`) |
| `has_reference` | string | — | Set to `"true"` to only show tagged images |
| `type` | string | — | Filter by type: `"image"` or `"video"` |

**Response:**

```json
{
  "success": true,
  "data": {
    "images": [
      {
        "id": "image-uuid",
        "url": "https://...",
        "type": "image",
        "reference": "@sasha-foxworth",
        "prompt": "A portrait of...",
        "model": "nano-banana-2",
        "created_at": "2026-03-23T12:00:00Z"
      }
    ],
    "total": 548,
    "limit": 50,
    "offset": 0
  }
}
```

---

### PATCH /api/v2/gallery/{id}/reference

Tag a gallery image with a @reference and add it to the reference library.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reference` | string | Yes | Reference tag (e.g., `"@sasha-foxworth"` or `"sasha-foxworth"`) |
| `category` | string | No | Category: `people`, `places`, `props`, `layouts`, `styles`. Default: `"people"` |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "image-uuid",
    "reference": "@sasha-foxworth",
    "category": "people",
    "message": "Tagged as @sasha-foxworth and added to people library"
  }
}
```

**Errors:**
- `422` -- Missing `reference`, invalid `category`
- `404` -- Image not found
- `403` -- You don't own this image

---

### DELETE /api/v2/gallery/{id}/reference

Remove a @reference tag from an image and remove it from the library.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "image-uuid",
    "message": "Reference tag removed"
  }
}
```

**Errors:**
- `404` -- Image not found or not owned by you

---

### GET /api/v2/storyboard/{id}/timeline

Generate a proposed timeline from a storyboard's shot list with timestamps.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `pace` | number | 4 | Seconds per shot (1-30) |
| `fps` | number | 24 | Frames per second |
| `format` | string | `"json"` | Output format: `"json"`, `"otio"`, or `"edl"` |

**Response (format=json):**

```json
{
  "success": true,
  "data": {
    "storyboard_id": "uuid",
    "title": "Battle Rap Documentary - Episode 1",
    "total_shots": 6,
    "total_duration_sec": 24,
    "fps": 24,
    "pace_sec": 4,
    "shots": [
      {
        "sequence": 1,
        "shot_id": "uuid",
        "prompt": "Wide cinematic shot...",
        "original_text": "Wide establishing shot of a venue",
        "characters": ["crowd"],
        "location": "Underground Venue",
        "image_url": "https://...",
        "status": "completed",
        "start_sec": 0,
        "end_sec": 4,
        "duration_sec": 4,
        "track": "V1"
      }
    ]
  }
}
```

**Response (format=otio):** Downloads a `.otio` file (OpenTimelineIO JSON) importable into Premiere Pro, DaVinci Resolve, and Avid.

**Response (format=edl):** Downloads a `.edl` file (CMX3600 Edit Decision List) importable into any NLE.

**Errors:**
- `404` -- Storyboard not found
- `403` -- You don't own this storyboard
- `422` -- No shots in storyboard, invalid format/pace

---

### GET /api/v2/recipes

List available recipes (your own + shared community recipes).

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | 50 | Results per page (max 100) |
| `offset` | integer | 0 | Pagination offset |

**Response:**

```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": "recipe-uuid",
        "name": "Cyberpunk Portrait",
        "description": "Generate a cyberpunk-styled character portrait",
        "stages": 3,
        "fields": [
          { "name": "character_name", "type": "text", "required": true },
          { "name": "mood", "type": "select", "required": false }
        ],
        "suggested_model": "nano-banana-2",
        "suggested_aspect_ratio": "16:9"
      }
    ],
    "total": 12,
    "limit": 50,
    "offset": 0
  }
}
```

---

### POST /api/v2/recipes/execute

Execute a recipe by filling in its fields. Runs asynchronously.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipe_id` | string | Yes | UUID of the recipe to execute |
| `fields` | object | Yes | Key-value map of field values (must include all required fields from the recipe) |
| `model` | string | No | Override model. Defaults to recipe's `suggested_model` |
| `aspect_ratio` | string | No | Override aspect ratio. Defaults to recipe's `suggested_aspect_ratio` |
| `reference_images` | array | No | Array of reference image URLs for stages that use img2img |
| `webhook_url` | string | No | URL to receive a POST when execution completes |

**Response (202):**

```json
{
  "success": true,
  "data": {
    "job_id": "recipe-job-789",
    "status": "processing",
    "cost": 12,
    "poll_url": "/api/v2/jobs/recipe-job-789"
  }
}
```

When complete, the job result contains:

```json
{
  "result": {
    "image_urls": ["https://...", "https://..."],
    "final_image_url": "https://..."
  }
}
```

**Errors:**
- `422` -- Missing `recipe_id` or `fields`, missing required field values
- `404` -- Recipe not found
- `402` -- Insufficient pts (cost = number of generation stages x model cost)

---

### GET /api/v2/wildcards

List available wildcards (your own + shared community wildcards).

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | 50 | Results per page (max 100) |
| `offset` | integer | 0 | Pagination offset |

**Response:**

```json
{
  "success": true,
  "data": {
    "wildcards": [
      {
        "id": "wc-uuid",
        "name": "hair_color",
        "category": "appearance",
        "description": "Random hair colors",
        "line_count": 25
      }
    ],
    "total": 8,
    "limit": 50,
    "offset": 0
  }
}
```

---

### POST /api/v2/wildcards/expand

Expand wildcard tokens in a prompt. Tokens use the format `_wildcard_name_` (surrounded by underscores).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Prompt containing wildcard tokens (e.g., `"A _hair_color_ haired warrior"`) |
| `count` | integer | No | Number of expansions to generate, 1-20. Default: `1` |

**Response:**

```json
{
  "success": true,
  "data": {
    "expansions": [
      {
        "text": "A crimson haired warrior",
        "wildcards_used": {
          "hair_color": "crimson"
        }
      },
      {
        "text": "A silver haired warrior",
        "wildcards_used": {
          "hair_color": "silver"
        }
      }
    ]
  }
}
```

If no wildcard tokens are found in the prompt, the original prompt is returned unchanged.

**Errors:**
- `422` -- Missing or non-string `prompt`

---

### POST /api/v2/batch

Submit multiple generation jobs in a single request.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jobs` | array | Yes | Array of job objects (1-20 items) |

Each job object requires a `type` field plus the corresponding endpoint's parameters:

```json
{
  "jobs": [
    {
      "type": "image",
      "model": "nano-banana-2",
      "prompt": "A sunset over mountains"
    },
    {
      "type": "video",
      "model": "wan-2.2-5b-fast",
      "prompt": "Camera slowly pans across the landscape",
      "source_image": "https://...",
      "duration": 5
    },
    {
      "type": "character",
      "name": "Aria",
      "description": "A young elven mage with silver hair"
    }
  ]
}
```

Valid `type` values: `"image"`, `"video"`, `"character"`, `"recipe"`

**Response (202):**

```json
{
  "success": true,
  "data": {
    "batch_id": "batch-uuid",
    "total_cost": 87,
    "results": [
      {
        "index": 0,
        "type": "image",
        "status": "accepted",
        "job_id": "abc123",
        ...
      },
      {
        "index": 1,
        "type": "video",
        "status": "accepted",
        "job_id": "def456",
        ...
      },
      {
        "index": 2,
        "type": "character",
        "status": "failed",
        "error": { "code": "VALIDATION_ERROR", "message": "name is required" }
      }
    ]
  }
}
```

**Notes:**
- The total pts cost is checked upfront. If your balance is insufficient for the entire batch, the whole request is rejected.
- Individual jobs can still fail (validation errors, etc.) even if the batch is accepted.
- Maximum 20 jobs per batch.

**Errors:**
- `422` -- `jobs` not an array, empty array, > 20 jobs, invalid `type` on any job
- `402` -- Insufficient pts for the total estimated cost

---

### GET /api/v2/jobs

List your recent jobs with optional filters.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | (all) | Filter by status: `"pending"`, `"processing"`, `"completed"`, `"failed"` |
| `type` | string | (all) | Filter by type: `"image"`, `"video"`, `"character"`, `"recipe"` |
| `limit` | integer | 20 | Results per page (max 100) |
| `offset` | integer | 0 | Pagination offset |

**Response:**

```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "job_id": "abc123",
        "status": "completed",
        "type": "image",
        "cost": 4,
        "created_at": "2026-03-19T12:00:00Z",
        "completed_at": "2026-03-19T12:00:15Z",
        "result": { "url": "https://..." },
        "error_message": null
      }
    ],
    "total": 42,
    "limit": 20,
    "offset": 0
  }
}
```

---

### GET /api/v2/jobs/{jobId}

Get details of a single job.

**Response:**

```json
{
  "success": true,
  "data": {
    "job_id": "abc123",
    "status": "completed",
    "type": "image",
    "cost": 4,
    "created_at": "2026-03-19T12:00:00Z",
    "completed_at": "2026-03-19T12:00:15Z",
    "result": {
      "url": "https://storage.example.com/images/abc123.webp"
    },
    "error_message": null
  }
}
```

**Statuses:**
- `"pending"` -- Job created, waiting to start
- `"processing"` -- Generation in progress
- `"completed"` -- Done. Check `result` for output URLs
- `"failed"` -- Error occurred. Check `error_message`

**Errors:**
- `404` -- Job not found (or belongs to a different user)

---

## Available Models

### Image Models

Query `GET /api/v2/models` for the live list. Common models:

| Model ID | Description | Cost (pts) | Supports LoRAs | Supports img2img |
|----------|-------------|------------|----------------|------------------|
| `nano-banana-2` | Fast, high-quality general purpose | 4 | No | Yes |
| `flux-2-klein-9b` | Flux model with LoRA support | 4 | Yes | Yes |
| `z-image-turbo` | Ultra-fast turbo generation | 1 | No | Yes |
| `qwen-image-edit` | Image editing model | 4 | No | Yes (required) |

> Costs are per image in pts (1 pt = $0.01). Always check `/models` for current pricing.

### Video Models

| Model ID | Description | Pricing Type | Cost Range (pts) |
|----------|-------------|--------------|------------------|
| `wan-2.2-5b-fast` | Fast video generation | per_second | Varies by resolution |
| `wan-2.1` | Standard Wan video | per_second | Varies by resolution |
| `seedance-1.5-pro` | Text-to-video (no source image needed) | per_second | Varies by resolution |
| `p-video` | Text-to-video (no source image needed) | per_second | Varies by resolution |

> Video costs depend on model, duration, and resolution. Use `/models` to see exact per-resolution pricing.

---

## Code Examples

### TypeScript / Node.js

```typescript
const API_BASE = "https://directorspalette.com/api/v2";
const API_KEY = "dp_your_key_here";

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(`${json.error.code}: ${json.error.message}`);
  return json.data;
}

async function generateImage(prompt: string): Promise<string> {
  // 1. Submit generation job
  const job = await api("/images/generate", {
    method: "POST",
    body: JSON.stringify({
      model: "nano-banana-2",
      prompt,
      aspect_ratio: "16:9",
    }),
  });

  console.log(`Job ${job.job_id} created (${job.cost} pts)`);

  // 2. Poll until complete
  let result = job;
  while (result.status !== "completed" && result.status !== "failed") {
    await new Promise((r) => setTimeout(r, 3000));
    result = await api(`/jobs/${job.job_id}`);
    console.log(`Status: ${result.status}`);
  }

  if (result.status === "failed") {
    throw new Error(`Generation failed: ${result.error_message}`);
  }

  return result.result.url;
}

// Usage
const url = await generateImage("A dragon flying over a medieval castle at dawn");
console.log("Image URL:", url);
```

### Python

```python
import time
import requests

API_BASE = "https://directorspalette.com/api/v2"
API_KEY = "dp_your_key_here"

def api(path, method="GET", json_body=None):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    resp = requests.request(method, f"{API_BASE}{path}", headers=headers, json=json_body)
    data = resp.json()
    if not data["success"]:
        raise Exception(f"{data['error']['code']}: {data['error']['message']}")
    return data["data"]

def generate_image(prompt):
    # 1. Submit generation job
    job = api("/images/generate", method="POST", json_body={
        "model": "nano-banana-2",
        "prompt": prompt,
        "aspect_ratio": "16:9",
    })
    print(f"Job {job['job_id']} created ({job['cost']} pts)")

    # 2. Poll until complete
    result = job
    while result["status"] not in ("completed", "failed"):
        time.sleep(3)
        result = api(f"/jobs/{job['job_id']}")
        print(f"Status: {result['status']}")

    if result["status"] == "failed":
        raise Exception(f"Generation failed: {result['error_message']}")

    return result["result"]["url"]

# Usage
url = generate_image("A dragon flying over a medieval castle at dawn")
print("Image URL:", url)
```
