# Style Expansion Feature - How It Works

## What You Saw

When you typed a style name (like "LEGO" or "Watercolor") in the custom style input, the system automatically expanded it into a detailed description. This happened while you were typing.

---

## Was This Intentional?

**YES!** This is a designed feature to help you preview what the AI will generate.

---

## How It Works (Technical)

### 1. Debounced Auto-Trigger

When you type in the style name field, the system waits 800 milliseconds (0.8 seconds) after you stop typing, then automatically calls the expansion API.

**Code location:** `src/features/storybook/components/wizard/steps/StyleSelectionStep.tsx` (lines 103-118)

```javascript
useEffect(() => {
  // Only trigger if name is at least 3 characters
  if (!customStyleName.trim() || customStyleName.length < 3) return

  // Wait 800ms after user stops typing
  const timer = setTimeout(() => {
    handleExpandStyle()  // Call the expansion API
  }, 800)

  return () => clearTimeout(timer)
}, [customStyleName])
```

### 2. The Expansion API

When triggered, it calls `/api/storybook/expand-style` which:

1. Takes your simple style name (e.g., "LEGO")
2. Sends it to OpenRouter API
3. Uses GPT-4o-mini model to expand it
4. Returns a detailed visual description

**Code location:** `src/app/api/storybook/expand-style/route.ts`

### 3. The AI Model

- **Model:** `openai/gpt-4o-mini`
- **Provider:** OpenRouter (an API aggregator for LLMs)
- **Why this model:** It's extremely fast (sub-second responses) and cheap

---

## Does This Cost You Points?

**NO!**

| Action | Cost to You | Why |
|--------|-------------|-----|
| Style expansion (the auto-typing you saw) | FREE (0 points) | This is text generation, not image generation |
| Generating the style guide image | 8 points | This uses Replicate/Imagen for image generation |

The style expansion is purely text - it uses GPT-4o-mini which costs the developer about $0.0003 per request (less than 1/10th of a cent). This cost is absorbed by the platform, not charged to users.

---

## Why Is It So Fast?

1. **GPT-4o-mini is optimized for speed** - It's one of the fastest LLM models available
2. **Small task** - It only generates about 100 words
3. **Structured output** - Uses tool calling for predictable, fast responses
4. **No image processing** - Pure text, no heavy computation

Typical response time: **0.5 - 1.5 seconds**

---

## What the Expansion Does

Takes a simple style name and expands it into:

1. **Detailed description** (50-100 words) including:
   - Visual texture (smooth, blocky, painted)
   - Lighting style (soft, dramatic, warm)
   - Color palette (bright, pastel, muted)
   - Artistic techniques (watercolor washes, 3D rendering)
   - Special effects (tilt-shift, bloom)
   - Overall mood/atmosphere

2. **Keywords** (5-8 tags) for quick reference

### Example

**Input:** "LEGO"

**Output:**
- **Description:** "LEGO brick minifigure aesthetic, blocky plastic toy figures, bright primary colors, glossy reflective surfaces, tilt-shift photography effect, cheerful playroom lighting, clean rendered 3D look"
- **Keywords:** `blocky`, `plastic`, `primary colors`, `glossy`, `tilt-shift`, `toy aesthetic`

---

## Summary

The style expansion is a **free preview feature** that uses a fast, cheap text AI (GPT-4o-mini) to help you understand what your style will look like before you spend points generating the actual style guide image.

Type away - it costs you nothing!
