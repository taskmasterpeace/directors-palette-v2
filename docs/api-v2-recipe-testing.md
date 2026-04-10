# API v2 Recipe Testing Guide

Test recipes via the API using cURL. All examples use the production URL.

---

## Setup

Set your API key as an env variable:

```bash
export DP_KEY="dp_your_key_here"
export BASE="https://directorspalette.com/api/v2"
```

For local dev testing:

```bash
export BASE="http://localhost:3002/api/v2"
```

---

## Step 1: Check Your Balance

```bash
curl -s "$BASE/balance" \
  -H "Authorization: Bearer $DP_KEY" | jq
```

Expected:
```json
{ "success": true, "data": { "balance": 500, "unit": "pts" } }
```

---

## Step 2: List Your Recipes

```bash
curl -s "$BASE/recipes" \
  -H "Authorization: Bearer $DP_KEY" | jq
```

This returns all your recipes with their fields. Look for:
- `id` — the UUID you pass to execute
- `fields` — the field names and types your recipe expects
- `fields[].required` — which fields you must provide

Example output:
```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": "1ad1ebf0-f257-42dc-8585-231f59006a6d",
        "name": "Character Sheet (From Description)",
        "description": "Generate a character sheet from text description only",
        "stages": 2,
        "fields": [
          { "name": "CHARACTER_NAME", "type": "name", "required": true },
          { "name": "CHARACTER_DESCRIPTION", "type": "text", "required": true },
          { "name": "OUTFIT", "type": "text", "required": false },
          { "name": "ATTRIBUTES", "type": "text", "required": false }
        ],
        "suggested_model": null,
        "suggested_aspect_ratio": "21:9"
      }
    ]
  }
}
```

---

## Step 3: Execute a Recipe

### Simple Example (Character Sheet from Description)

```bash
curl -s -X POST "$BASE/recipes/execute" \
  -H "Authorization: Bearer $DP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipe_id": "1ad1ebf0-f257-42dc-8585-231f59006a6d",
    "fields": {
      "CHARACTER_NAME": "Marcus",
      "CHARACTER_DESCRIPTION": "A weathered sea captain in his 50s with a salt-and-pepper beard and piercing blue eyes",
      "OUTFIT": "Navy peacoat, captain hat, worn leather boots",
      "ATTRIBUTES": "Tall, broad-shouldered, scar across left cheek"
    },
    "model": "nano-banana-2",
    "aspect_ratio": "21:9"
  }' | jq
```

Expected (202):
```json
{
  "success": true,
  "data": {
    "job_id": "recipe-job-abc123",
    "status": "processing",
    "cost": 8,
    "poll_url": "/api/v2/jobs/recipe-job-abc123"
  }
}
```

### With a Reference Tag (saves result for future use)

```bash
curl -s -X POST "$BASE/recipes/execute" \
  -H "Authorization: Bearer $DP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipe_id": "1ad1ebf0-f257-42dc-8585-231f59006a6d",
    "fields": {
      "CHARACTER_NAME": "Elena",
      "CHARACTER_DESCRIPTION": "Young astronaut with short black hair and confident smile"
    },
    "model": "nano-banana-2",
    "reference_tag": "elena",
    "reference_category": "character"
  }' | jq
```

The `reference_tag` saves the result so you can use `@elena` in future prompts.

### With a Reference Image (img2img)

```bash
curl -s -X POST "$BASE/recipes/execute" \
  -H "Authorization: Bearer $DP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipe_id": "77a4ca15-53ac-4bec-9870-b10cd5ba07bf",
    "fields": {},
    "model": "nano-banana-2",
    "reference_image": "https://example.com/my-photo.jpg"
  }' | jq
```

For multi-stage recipes that need different images per stage, use `reference_images` (array of arrays):

```bash
"reference_images": [
  ["https://example.com/stage0-ref.jpg"],
  ["https://example.com/stage1-ref.jpg"]
]
```

---

## Step 4: Poll for Results

Save the `job_id` from Step 3, then poll every 3-5 seconds:

```bash
JOB_ID="recipe-job-abc123"

curl -s "$BASE/jobs/$JOB_ID" \
  -H "Authorization: Bearer $DP_KEY" | jq
```

### Status: processing

```json
{
  "success": true,
  "data": {
    "job_id": "recipe-job-abc123",
    "status": "processing",
    "result": null
  }
}
```

### Status: completed

```json
{
  "success": true,
  "data": {
    "job_id": "recipe-job-abc123",
    "status": "completed",
    "result": {
      "image_urls": ["https://storage.example.com/img1.webp", "https://storage.example.com/img2.webp"],
      "final_image_url": "https://storage.example.com/img2.webp"
    }
  }
}
```

### Status: failed

```json
{
  "success": true,
  "data": {
    "job_id": "recipe-job-abc123",
    "status": "failed",
    "error_message": "Prediction failed: model unavailable"
  }
}
```

### Auto-Poll Script (bash)

```bash
JOB_ID="recipe-job-abc123"

while true; do
  RESULT=$(curl -s "$BASE/jobs/$JOB_ID" -H "Authorization: Bearer $DP_KEY")
  STATUS=$(echo "$RESULT" | jq -r '.data.status')
  echo "Status: $STATUS"

  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    echo "$RESULT" | jq
    break
  fi

  sleep 4
done
```

---

## Step 5: Verify the Output

Download the final image:

```bash
FINAL_URL=$(echo "$RESULT" | jq -r '.data.result.final_image_url')
curl -o result.webp "$FINAL_URL"
```

---

## Common Errors

### Missing required fields (422)

```bash
curl -s -X POST "$BASE/recipes/execute" \
  -H "Authorization: Bearer $DP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"recipe_id": "1ad1ebf0-...", "fields": {}}' | jq
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields: CHARACTER_NAME, CHARACTER_DESCRIPTION"
  }
}
```

### Recipe not found (404)

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Recipe not found" }
}
```

### Insufficient pts (402)

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PTS",
    "message": "Not enough pts. Required: 8, available: 2"
  }
}
```

---

## Available Models

| Model | Cost | Notes |
|-------|------|-------|
| `nano-banana-2` | 4 pts | Default. Fast, good quality |
| `nano-banana-pro` | 8-20 pts | Higher quality, resolution tiers |
| `z-image-turbo` | 2 pts | Cheapest, turbo speed |

Pass `"model": "z-image-turbo"` in the request body to override.

---

## Full End-to-End Test Script

Copy and run this to test the entire flow:

```bash
#!/bin/bash
set -e

DP_KEY="dp_your_key_here"
BASE="https://directorspalette.com/api/v2"

echo "=== 1. Check balance ==="
curl -s "$BASE/balance" -H "Authorization: Bearer $DP_KEY" | jq

echo ""
echo "=== 2. List recipes ==="
curl -s "$BASE/recipes?limit=3" -H "Authorization: Bearer $DP_KEY" | jq '.data.recipes[] | {id, name, fields: [.fields[].name]}'

echo ""
echo "=== 3. Execute recipe ==="
RESPONSE=$(curl -s -X POST "$BASE/recipes/execute" \
  -H "Authorization: Bearer $DP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipe_id": "1ad1ebf0-f257-42dc-8585-231f59006a6d",
    "fields": {
      "CHARACTER_NAME": "TestBot",
      "CHARACTER_DESCRIPTION": "A friendly robot with glowing blue eyes and brushed steel plating"
    },
    "model": "nano-banana-2"
  }')
echo "$RESPONSE" | jq

JOB_ID=$(echo "$RESPONSE" | jq -r '.data.job_id')
echo ""
echo "=== 4. Poll job: $JOB_ID ==="

for i in $(seq 1 30); do
  sleep 5
  RESULT=$(curl -s "$BASE/jobs/$JOB_ID" -H "Authorization: Bearer $DP_KEY")
  STATUS=$(echo "$RESULT" | jq -r '.data.status')
  echo "  [$i] Status: $STATUS"

  if [ "$STATUS" = "completed" ]; then
    echo ""
    echo "=== DONE ==="
    echo "$RESULT" | jq '.data.result'
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo ""
    echo "=== FAILED ==="
    echo "$RESULT" | jq '.data.error_message'
    exit 1
  fi
done

echo "Timed out after 150 seconds"
exit 1
```

---

## Using Webhooks Instead of Polling

Pass `webhook_url` to get notified when the job finishes:

```bash
curl -s -X POST "$BASE/recipes/execute" \
  -H "Authorization: Bearer $DP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipe_id": "1ad1ebf0-f257-42dc-8585-231f59006a6d",
    "fields": {
      "CHARACTER_NAME": "Marcus",
      "CHARACTER_DESCRIPTION": "Grizzled detective in a noir setting"
    },
    "model": "nano-banana-2",
    "webhook_url": "https://your-server.com/webhook/dp-callback"
  }' | jq
```

Your webhook endpoint receives a POST with the completed job data when it finishes. Always implement polling as a fallback — webhook delivery is best-effort (single attempt, 10s timeout).
