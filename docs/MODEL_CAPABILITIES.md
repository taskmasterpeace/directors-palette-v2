# Model Capabilities Guide

A comprehensive guide to each image generation model's strengths and best use cases.

---

## Quick Reference

| Model | Speed | Text/Spelling | Reference Images | Context/Story | Cost |
|-------|-------|---------------|------------------|---------------|------|
| Qwen Image Fast | ★★★★★ (~2s) | ★★☆☆☆ | ❌ None | ★★★☆☆ | 2 pts |
| Z-Image Turbo | ★★★★☆ (~5s) | ★★★☆☆ | 1 image | ★★★☆☆ | 5 pts |
| Nano Banana | ★★★☆☆ (~8s) | ★★★☆☆ | Up to 10 | ★★★☆☆ | 8 pts |
| GPT Image Low | ★★☆☆☆ (~16s) | ★★★★☆ | ❌ None | ★★★★☆ | 3 pts |
| GPT Image Medium | ★★☆☆☆ (~18s) | ★★★★★ | ❌ None | ★★★★★ | 10 pts |
| GPT Image HD | ★☆☆☆☆ (~25s) | ★★★★★ | ❌ None | ★★★★★ | 27 pts |
| Nano Banana Pro | ★★☆☆☆ (~15s) | ★★★★★ | Up to 14 | ★★★★★ | 20 pts |

---

## Model Categories

### 🚀 Speed Champions
Best for rapid iteration and quick visualization.

**Qwen Image Fast** (2 pts, ~1.8s)
- Fastest model available - near instant results
- Great for rapid prototyping and idea exploration
- No reference image support (text-to-image only)
- Good general quality, acceptable text rendering
- *Use when*: Speed matters most, exploring many variations quickly

**Z-Image Turbo** (5 pts, ~5s)
- Ultra-fast with image-to-image support
- Accepts 1 reference image for style/content guidance
- Good for quick refinements with visual reference
- *Use when*: Fast iteration with a single reference image

### 🎨 Best Value
Excellent quality-to-cost ratio for everyday use.

**Nano Banana** (8 pts, ~7.5s)
- Best balance of speed, quality, and price
- Supports up to 10 reference images
- Good for multi-reference compositions
- Solid general-purpose model
- *Use when*: Need reference images, good everyday option

**GPT Image Low** (3 pts, ~16s)
- Budget OpenAI quality - surprisingly capable
- Excellent for drafts and initial concepts
- No reference images (text-to-image only)
- Better text rendering than most budget options
- *Use when*: Want GPT quality on a budget, text in image

### ✨ Premium Quality
Maximum quality for final renders and professional work.

**GPT Image Medium** (10 pts, ~18s)
- OpenAI's standard quality tier
- Excellent text rendering (signs, titles, labels)
- Great instruction following for complex prompts
- Handles long story-style prompts well
- *Use when*: Need accurate text, final quality renders

**GPT Image HD** (27 pts, ~25s)
- Highest quality OpenAI tier
- Best detail and resolution
- Premium for client work and final outputs
- Superior for detailed scenes
- *Use when*: Maximum quality needed, client deliverables

### 🔥 Professional Powerhouse
Best for complex creative work with multiple references.

**Nano Banana Pro** (20 pts, ~15-20s)
- State-of-the-art quality
- Near-perfect text rendering
- Handles extremely long context/prompts
- Up to 14 reference images
- 4K resolution support (35 pts)
- Best for complex multi-reference compositions
- *Use when*: Complex scenes, need many references, perfect text

---

## Capability Deep Dive

### Text/Spelling Accuracy

| Model | Simple ("OPEN") | Medium ("DIRECTOR'S PALETTE") | Complex (Menu/Numbers) |
|-------|-----------------|-------------------------------|------------------------|
| Nano Banana Pro | ★★★★★ | ★★★★★ | ★★★★★ |
| GPT Image HD | ★★★★★ | ★★★★★ | ★★★★☆ |
| GPT Image Medium | ★★★★★ | ★★★★☆ | ★★★★☆ |
| GPT Image Low | ★★★★☆ | ★★★★☆ | ★★★☆☆ |
| Nano Banana | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ |
| Z-Image Turbo | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ |
| Qwen Image Fast | ★★★☆☆ | ★★☆☆☆ | ★☆☆☆☆ |

**Recommendations for text-heavy images:**
1. **Best**: Nano Banana Pro - handles any text complexity
2. **Good**: GPT Image Medium/HD - excellent accuracy
3. **Budget**: GPT Image Low - surprisingly good for the price
4. **Avoid**: Qwen/Z-Image for complex text

### Reference Image Support

| Model | Max References | Best For |
|-------|---------------|----------|
| Nano Banana Pro | 14 | Complex multi-ref compositions |
| Nano Banana | 10 | Style transfer, character consistency |
| Z-Image Turbo | 1 | Quick image-to-image edits |
| GPT Image (all) | 0 | Text-to-image only |
| Qwen Image Fast | 0 | Text-to-image only |

### Long Prompt / Story Handling

Models that excel at understanding complex, narrative prompts:

1. **Nano Banana Pro** - Handles massive context, multiple instructions
2. **GPT Image HD/Medium** - Excellent instruction following
3. **GPT Image Low** - Good comprehension despite budget tier
4. **Nano Banana** - Solid for most prompt lengths
5. **Z-Image/Qwen** - Best with concise prompts

---

## Use Case Recommendations

### Quick Concept Art
**Best**: Qwen Image Fast (2 pts)
Generate 10 variations for the price of 1 premium image.

### Character Design with References
**Best**: Nano Banana (8 pts)
Upload multiple reference images for style/character consistency.

### Movie Posters / Title Cards
**Best**: Nano Banana Pro (20 pts) or GPT Image Medium (10 pts)
When text accuracy is critical.

### Storyboard Frames
**Best**: GPT Image Low (3 pts) or Qwen Image Fast (2 pts)
Fast iteration for visual planning.

### Final Client Deliverables
**Best**: GPT Image HD (27 pts) or Nano Banana Pro (20 pts)
Maximum quality and detail.

### Multi-Reference Compositions
**Best**: Nano Banana Pro (14 refs) or Nano Banana (10 refs)
When combining multiple visual elements.

---

## Speed Test Results (Dec 2025)

Measured with "spelling_simple" test (neon OPEN sign):

```
Model               | Time    | Notes
--------------------|---------|------------------
Qwen Image Fast     | 1.8s    | Lightning fast
Z-Image Turbo       | ~5s     | Very responsive
Nano Banana         | 7.5s    | Good balance
Nano Banana Pro     | ~15s    | Quality takes time
GPT Image Low       | ~16s    | Slower but solid
GPT Image Medium    | 17.6s   | Standard GPT speed
GPT Image HD        | ~25s    | Premium processing
```

---

## Model Selection Flowchart

```
Need reference images?
├─ Yes → How many?
│        ├─ 1 image → Z-Image Turbo (5 pts)
│        ├─ 2-10 → Nano Banana (8 pts)
│        └─ 11-14 → Nano Banana Pro (20 pts)
│
└─ No → Need text in image?
         ├─ Yes → Text complexity?
         │        ├─ Simple → GPT Image Low (3 pts)
         │        ├─ Medium → GPT Image Medium (10 pts)
         │        └─ Complex → Nano Banana Pro (20 pts)
         │
         └─ No → Priority?
                  ├─ Speed → Qwen Image Fast (2 pts)
                  ├─ Value → Nano Banana (8 pts)
                  └─ Quality → GPT Image HD (27 pts)
```

---

## Summary

| Priority | Recommended Model | Cost |
|----------|-------------------|------|
| Fastest | Qwen Image Fast | 2 pts |
| Best Value | Nano Banana | 8 pts |
| Best Text | Nano Banana Pro | 20 pts |
| Best Budget GPT | GPT Image Low | 3 pts |
| Best Overall | GPT Image Medium | 10 pts |
| Best Quality | GPT Image HD | 27 pts |
| Most Refs | Nano Banana Pro | 20 pts |
