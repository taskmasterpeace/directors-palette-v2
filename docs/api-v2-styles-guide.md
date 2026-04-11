# API v2 Styles & Recipe Catalog Guide

Use premade styles and the recipe catalog through the API.

---

## Setup

```bash
export DP_KEY="dp_your_key_here"
export BASE="https://directorspalette.com/api/v2"
```

For local testing:

```bash
export BASE="http://localhost:3002/api/v2"
```

---

## Styles

### List All Premade Styles

```bash
curl -s "$BASE/styles" \
  -H "Authorization: Bearer $DP_KEY" | jq '.data.styles[] | {name, description}'
```

Example output:

```json
{ "name": "Muppet Style", "description": "Jim Henson-inspired felt puppet aesthetic" }
{ "name": "Anime Cel", "description": "Classic anime cel-shaded look" }
{ "name": "Watercolor", "description": "Soft watercolor painting style" }
```

### Get a Style's Prompt

```bash
curl -s "$BASE/styles" \
  -H "Authorization: Bearer $DP_KEY" | jq -r '.data.styles[] | select(.name == "Muppet Style") | .style_prompt'
```

### Generate an Image with a Style

Copy the `style_prompt` and append it to your prompt:

```bash
# Get the style prompt
STYLE=$(curl -s "$BASE/styles" \
  -H "Authorization: Bearer $DP_KEY" | jq -r '.data.styles[] | select(.name == "Muppet Style") | .style_prompt')

# Generate with it
curl -s -X POST "$BASE/images/generate" \
  -H "Authorization: Bearer $DP_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"nano-banana-2\",
    \"prompt\": \"A dragon sitting on a mountain. $STYLE\",
    \"aspect_ratio\": \"16:9\"
  }" | jq

# Poll for result
JOB_ID="the-job-id-from-above"
curl -s "$BASE/jobs/$JOB_ID" \
  -H "Authorization: Bearer $DP_KEY" | jq
```

---

## Recipe Catalog

### List Available Recipes

The catalog API returns all published recipes (system + community):

```bash
curl -s "http://localhost:3002/api/recipes/catalog" | jq '.recipes[] | {name, category, description}'
```

Note: The catalog endpoint doesn't require API key auth (it uses session auth from the web app). For API v2 recipe usage, use the `/api/v2/recipes` endpoints below.

### List Your Recipes (API v2)

```bash
curl -s "$BASE/recipes" \
  -H "Authorization: Bearer $DP_KEY" | jq '.data.recipes[] | {id, name, category_id}'
```

### Execute a Recipe (API v2)

```bash
# Get recipe ID from the list above
RECIPE_ID="your-recipe-id"

curl -s -X POST "$BASE/recipes/execute" \
  -H "Authorization: Bearer $DP_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"recipe_id\": \"$RECIPE_ID\",
    \"fields\": {
      \"STYLE\": \"anime\",
      \"NAME\": \"Luna\",
      \"DESC\": \"A brave warrior with silver hair\"
    }
  }" | jq
```

Fields depend on the recipe template. Check the recipe's stages to see what `<<FIELD:type>>` tokens it expects.

### Execute a Recipe with a Style Override

Combine a style with a recipe by passing the style prompt in the `style_override` field:

```bash
STYLE=$(curl -s "$BASE/styles" \
  -H "Authorization: Bearer $DP_KEY" | jq -r '.data.styles[] | select(.name == "Muppet Style") | .style_prompt')

curl -s -X POST "$BASE/recipes/execute" \
  -H "Authorization: Bearer $DP_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"recipe_id\": \"$RECIPE_ID\",
    \"fields\": {
      \"NAME\": \"Kermit\",
      \"DESC\": \"A cheerful frog\"
    },
    \"prompt_suffix\": \"$STYLE\"
  }" | jq
```

---

## Full Workflow Example

Generate a Muppet-style character sheet in one script:

```bash
#!/bin/bash
export DP_KEY="dp_your_key_here"
export BASE="https://directorspalette.com/api/v2"

# 1. Get the Muppet style prompt
STYLE=$(curl -s "$BASE/styles" \
  -H "Authorization: Bearer $DP_KEY" \
  | jq -r '.data.styles[] | select(.name | test("muppet"; "i")) | .style_prompt')

echo "Style: $STYLE"

# 2. Generate with style applied
RESULT=$(curl -s -X POST "$BASE/images/generate" \
  -H "Authorization: Bearer $DP_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"nano-banana-2\",
    \"prompt\": \"A friendly wizard character with a long beard and pointy hat, full body, character sheet with multiple angles. $STYLE\",
    \"aspect_ratio\": \"1:1\"
  }")

JOB_ID=$(echo "$RESULT" | jq -r '.data.job_id')
echo "Job: $JOB_ID"

# 3. Poll until done
while true; do
  STATUS=$(curl -s "$BASE/jobs/$JOB_ID" \
    -H "Authorization: Bearer $DP_KEY")
  STATE=$(echo "$STATUS" | jq -r '.data.status')
  
  if [ "$STATE" = "completed" ]; then
    echo "Done!"
    echo "$STATUS" | jq '.data.result'
    break
  elif [ "$STATE" = "failed" ]; then
    echo "Failed:"
    echo "$STATUS" | jq '.data.error_message'
    break
  fi
  
  echo "Status: $STATE..."
  sleep 3
done
```

---

## Endpoints Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v2/styles` | GET | API Key | List premade style sheets |
| `/api/v2/recipes` | GET | API Key | List your recipes |
| `/api/v2/recipes/execute` | POST | API Key | Execute a recipe with field values |
| `/api/v2/images/generate` | POST | API Key | Generate an image (use style_prompt in prompt) |
| `/api/v2/jobs/{id}` | GET | API Key | Check job status |
| `/api/recipes/catalog` | GET | Session | Browse recipe catalog (web app) |
