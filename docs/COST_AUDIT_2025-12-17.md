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

| Model | Our Cost | We Charge | Margin | Max Duration | Features |
|-------|----------|-----------|--------|--------------|----------|
| 🎬 WAN 2.2-5B Fast | 2.5¢ | 4 pts | 60% | 4 sec | Start frame |
| 🎬 WAN 2.2 I2V Fast | 11¢ | 16 pts | 45% | 5 sec | Start + Last frame |

### Per-Second Models (Variable Duration)

| Model | 480p | 720p | 1080p | Max Duration | Features |
|-------|------|------|-------|--------------|----------|
| ⚡ Seedance Pro Fast | 2 pts | 4 pts | 9 pts | 12 sec | Start frame |
| 🌟 Seedance Lite | 3 pts | 5 pts | 11 pts | 12 sec | Start + Last + Ref Images (1-4) |
| 👑 Kling 2.5 Turbo Pro | - | 10 pts | - | 10 sec | Premium motion |

### Video Cost Examples (5-second @ 720p)

| Model | Points | USD | Use Case |
|-------|--------|-----|----------|
| WAN 2.2-5B Fast | 4 pts | $0.04 | Quick previews |
| WAN 2.2 I2V Fast | 16 pts | $0.16 | Controlled with last frame |
| Seedance Pro Fast | 20 pts | $0.20 | Longer videos |
| Seedance Lite | 25 pts | $0.25 | Full control + ref images |
| Kling Premium | 50 pts | $0.50 | Best motion quality |

### Video Margins (Our Cost vs Revenue)

| Model | Our Cost (5s @720p) | Revenue | Margin |
|-------|---------------------|---------|--------|
| WAN 2.2-5B Fast | ~2.5¢ | 4¢ | 60% |
| WAN 2.2 I2V Fast | ~11¢ | 16¢ | 45% |
| Seedance Pro Fast | ~12.5¢ | 20¢ | 44% |
| Seedance Lite | ~18¢ | 25¢ | 44% |
| Kling Premium | ~35¢ | 50¢ | 43% |

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

Video Generation (Per-Video):
  - WAN 2.2-5B Fast:    4 tokens/video (max 4s)
  - WAN 2.2 I2V Fast:  16 tokens/video (max 5s)

Video Generation (Per-Second @ 720p):
  - Seedance Pro Fast:  4 tokens/second (max 12s)
  - Seedance Lite:      5 tokens/second (max 12s)
  - Kling Premium:     10 tokens/second (max 10s)

Resolution Multipliers (for per-second models):
  - 480p: 0.5x base rate
  - 720p: 1.0x base rate
  - 1080p: 2.0-2.2x base rate

Tools:
  - Background Removal: 3 tokens/image

Text/AI:
  - Scene Extraction:   3 tokens/call
  - Prompt Generation:  3 tokens/shot
  - B-Roll Suggestions: 1 token/scene

1 token = $0.01 (1 cent)
```
