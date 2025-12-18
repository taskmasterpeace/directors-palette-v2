# Director's Palette - Complete Cost Audit
**Date:** December 17, 2025

## Executive Summary

This document details all costs and pricing across the platform. All amounts in USD cents unless noted.

---

## Image Generation Models

| Model | Our Cost | We Charge | Margin | Margin % |
|-------|----------|-----------|--------|----------|
| 🚀 Qwen Image Fast | ~1¢ | 2 pts (2¢) | 1¢ | ~100% |
| ⚡ Z-Image Turbo | ~2.5¢ | 5 pts (5¢) | 2.5¢ | ~100% |
| 🍌 Nano Banana | ~4¢ | 8 pts (8¢) | 4¢ | ~100% |
| 🔥 Nano Banana Pro (2K) | ~14¢ | 20 pts (20¢) | 6¢ | ~43% |
| 🔥 Nano Banana Pro (4K) | ~24¢ | 35 pts (35¢) | 11¢ | ~46% |
| 🎨 GPT Image Low | ~1.3¢ | 3 pts (3¢) | 1.7¢ | ~130% |
| 🎨 GPT Image Medium | ~5¢ | 10 pts (10¢) | 5¢ | ~100% |
| ✨ GPT Image High | ~13.6¢ | 27 pts (27¢) | 13.4¢ | ~99% |

### Notes:
- GPT Image models can generate 1-10 images per request (cost multiplied by count)
- GPT Image supports transparent PNG backgrounds (no extra cost)
- Nano Banana Pro 4K resolution costs 35 pts (vs 20 pts for 2K)

---

## Video Generation Models

### Per-Video Models (Fixed Duration)

These models charge a flat rate per video regardless of duration:

| Model | 480p | 720p | Max Duration | Features |
|-------|------|------|--------------|----------|
| 🎬 WAN 2.2-5B Fast | 1 pt | 1 pt | ~4 sec | Start frame |
| 🎬 WAN 2.2 I2V Fast | 2 pts | 3 pts | 5 sec | Start + Last frame |

**Cost Structure:** Fixed per-video pricing means the same cost whether the video is 1 second or max duration.

### Per-Second Models (Variable Duration)

These models charge per second of video generated:

| Model | 480p | 720p | 1080p | Max Duration | Features |
|-------|------|------|-------|--------------|----------|
| ⚡ Seedance Pro Fast | 2 pts/sec | 4 pts/sec | 9 pts/sec | 12 sec | Start frame |
| 🌟 Seedance Lite | 3 pts/sec | 5 pts/sec | 11 pts/sec | 12 sec | Start + Last + Ref Images (1-4) |
| 👑 Kling 2.5 Turbo Pro | - | 10 pts/sec | - | 10 sec | Premium motion (720p only) |

**Cost Structure:** Per-second pricing means total cost = rate × duration

### Pricing Formula Examples

#### Per-Video Models (Fixed Cost)
**WAN 2.2-5B Fast @ 720p:**
- Formula: Fixed 1 pt per video
- 1 second video: 1 pt ($0.01)
- 4 second video: 1 pt ($0.01)

**WAN 2.2 I2V Fast @ 720p:**
- Formula: Fixed 3 pts per video
- 1 second video: 3 pts ($0.03)
- 5 second video: 3 pts ($0.03)

#### Per-Second Models (Variable Cost)
**Seedance Pro Fast @ 720p:**
- Formula: 4 pts/sec × duration
- 5 second video: 4 × 5 = 20 pts ($0.20)
- 10 second video: 4 × 10 = 40 pts ($0.40)

**Seedance Lite @ 1080p:**
- Formula: 11 pts/sec × duration
- 5 second video: 11 × 5 = 55 pts ($0.55)
- 10 second video: 11 × 10 = 110 pts ($1.10)

**Kling 2.5 Turbo Pro @ 720p:**
- Formula: 10 pts/sec × duration
- 5 second video: 10 × 5 = 50 pts ($0.50)
- 10 second video: 10 × 10 = 100 pts ($1.00)

### Video Cost Comparison (5-second @ 720p)

| Model | Calculation | Points | USD | Use Case |
|-------|-------------|--------|-----|----------|
| WAN 2.2-5B Fast | Fixed | 1 pt | $0.01 | Quick previews |
| WAN 2.2 I2V Fast | Fixed | 3 pts | $0.03 | Controlled with last frame |
| Seedance Pro Fast | 4 × 5 sec | 20 pts | $0.20 | Longer videos |
| Seedance Lite | 5 × 5 sec | 25 pts | $0.25 | Full control + ref images |
| Kling Premium | 10 × 5 sec | 50 pts | $0.50 | Best motion quality |

### Video Margins (Our Cost vs Revenue)

| Model | Our Cost (5s @720p) | Revenue | Margin |
|-------|---------------------|---------|--------|
| WAN 2.2-5B Fast | ~0.5¢ | 1¢ | 100% |
| WAN 2.2 I2V Fast | ~1.5¢ | 3¢ | 100% |
| Seedance Pro Fast | ~12.5¢ | 20¢ | 60% |
| Seedance Lite | ~18¢ | 25¢ | 39% |
| Kling Premium | ~35¢ | 50¢ | 43% |

---

## Storage Limits & Auto-Expiration

### Image Storage
- **Maximum:** 500 images per user
- **Warning threshold:** 400 images (80% capacity)
- **Action required:** Delete old images before creating new ones
- **No auto-expiration:** Images persist until manually deleted

### Video Storage
- **Maximum:** No hard limit
- **Auto-expiration:** 7 days from creation
- **Cleanup:** Automatic deletion after expiration
- **Storage cost:** Included in generation cost (no separate storage fees)

### Storage Flow
1. User generates content (image/video)
2. Content stored in Supabase Storage
3. Images: Count tracked, warning at 400, hard limit at 500
4. Videos: Expiration date set to 7 days from creation
5. Daily cleanup job removes expired videos

---

## Credit Flow & Deduction

### Credit Check Flow
```
1. User initiates generation request
2. System checks user's current credit balance
3. System calculates required credits based on:
   - Model selected
   - Resolution (for videos)
   - Duration (for per-second video models)
   - Image count (for GPT Image models)
4. If credits insufficient: Reject with error
5. If credits sufficient: Proceed to generation
```

### Generation Flow
```
1. Request sent to provider (Replicate/OpenAI)
2. Generation starts (credits NOT deducted yet)
3. Webhook received on completion
4. Credits deducted from user balance
5. Content URL stored in database
```

### Credit Deduction Points

**Pre-Flight Check:**
- Credits validated BEFORE generation starts
- Prevents insufficient balance errors mid-generation

**Post-Completion Deduction:**
- Credits deducted AFTER successful generation
- Webhook triggers credit deduction
- Failed generations = No credit deduction

**Edge Cases:**
- Webhook failure: Credits may not deduct (manual reconciliation needed)
- Generation timeout: No deduction
- Provider error: No deduction

---

## Tools

| Tool | Our Cost | We Charge | Margin | Margin % |
|------|----------|-----------|--------|----------|
| 🖼️ Background Removal | ~2¢ | 3 pts (3¢) | 1¢ | ~50% |

---

## Text/AI Services (Storyboard)

Uses **OpenRouter** for LLM calls:

| Service | Model | Est. Cost/Call | We Charge | Notes |
|---------|-------|----------------|-----------|-------|
| Scene Extraction | GPT-4o-mini | ~0.5-2¢ | 3 pts | Per script segment |
| Prompt Generation | GPT-4o-mini | ~0.5-1¢ | 3 pts | Per shot |
| B-Roll Suggestions | GPT-4o-mini | ~0.3-0.5¢ | 1 pt | Per scene |

**Default text pricing:** 2¢ cost, 3 pts charge (~50% margin)

---

## Music Lab Services

| Service | Provider | Est. Cost | We Charge | Notes |
|---------|----------|-----------|-----------|-------|
| Transcription | Replicate Whisper | ~2-5¢/min | 5 pts/min | Audio transcription |
| Structure Analysis | OpenRouter | ~1-3¢ | 3 pts | Song analysis |

---

## Credit Packages

| Package | Credits | Price | Effective Rate | Bonus |
|---------|---------|-------|----------------|-------|
| Starter | 500 | $5.00 | 1¢/credit | 0% |
| Creator | 1,200 | $10.00 | 0.83¢/credit | 20% |
| Pro | 3,000 | $25.00 | 0.83¢/credit | 20% |
| Studio | 7,500 | $50.00 | 0.67¢/credit | 50% |

---

## Profitability Analysis

### High Margin Operations (>75%):
- GPT Image Low: ~130% margin
- Qwen Image Fast: ~100% margin
- Z-Image Turbo: ~100% margin
- Nano Banana: ~100% margin
- GPT Image Medium: ~100% margin
- GPT Image High: ~99% margin

### Moderate Margin Operations (25-75%):
- Background Removal: ~50% margin
- Text/AI calls: ~50% margin
- Nano Banana Pro: ~43-46% margin

### Cost Centers to Monitor:
- Heavy Nano Banana Pro usage (lowest margin)
- Music Lab transcription (variable cost based on audio length)
- Failed generation retries (full cost, no revenue)

---

## Monthly Cost Projection (Example)

Assuming 1,000 generations/month:

| Model Mix | Cost | Revenue | Profit |
|-----------|------|---------|--------|
| 50% Fast models (2-5¢) | $17.50 | $35.00 | $17.50 |
| 30% Standard (8-10¢) | $27.00 | $54.00 | $27.00 |
| 20% Premium (20-27¢) | $44.00 | $92.00 | $48.00 |
| **TOTAL** | **$88.50** | **$181.00** | **$92.50** |

**Overall margin: ~51%**

---

## Recommendations

1. **Push GPT Image Low** for quick iterations - highest margin
2. **Monitor Nano Banana Pro usage** - lowest margin, watch for abuse
3. **Consider tiered text pricing** - currently all text is 3 pts regardless of complexity
4. **Add batch discounts** - could improve volume while maintaining margin
5. **Track failed generation costs** - these eat into margins

---

## API Rate Card (For Documentation)

```
Image Generation:
  - GPT Image Low:     3 tokens/image
  - GPT Image Medium: 10 tokens/image
  - GPT Image High:   27 tokens/image
  - Qwen Image Fast:   2 tokens/image
  - Z-Image Turbo:     5 tokens/image
  - Nano Banana:       8 tokens/image
  - Nano Banana Pro:  20 tokens/image (35 for 4K)

Video Generation (Per-Video - Fixed Cost):
  - WAN 2.2-5B Fast:    1 token @ 480p/720p (max ~4s)
  - WAN 2.2 I2V Fast:   2 tokens @ 480p, 3 tokens @ 720p (max 5s)

Video Generation (Per-Second - Variable Cost):
  - Seedance Pro Fast:
    - 480p: 2 tokens/second (max 12s)
    - 720p: 4 tokens/second (max 12s)
    - 1080p: 9 tokens/second (max 12s)
  - Seedance Lite:
    - 480p: 3 tokens/second (max 12s)
    - 720p: 5 tokens/second (max 12s)
    - 1080p: 11 tokens/second (max 12s)
  - Kling 2.5 Turbo Pro:
    - 720p only: 10 tokens/second (max 10s)

Pricing Formula:
  - Per-Video: Fixed cost regardless of duration
  - Per-Second: Rate × Duration = Total Cost

Tools:
  - Background Removal: 3 tokens/image

Text/AI:
  - Scene Extraction:   3 tokens/call
  - Prompt Generation:  3 tokens/shot
  - B-Roll Suggestions: 1 token/scene

1 token = $0.01 (1 cent)
```
