# Image Generation Models

This document provides comprehensive details about all image generation models available in Directors Palette v2.

## Quick Reference

| Model | Tier | Cost | Reference Images | Aspect Ratios | Key Features |
|-------|------|------|:----------------:|---------------|--------------|
| **Nano Banana** | Fast | 8 pts | ✅ 10 max | All 9 | Budget-friendly, quick iterations |
| **Nano Banana Pro** | Pro | 20 pts | ✅ 14 max | All 9 | SOTA quality, 4K, text rendering |
| **Z-Image Turbo** | Turbo | 5 pts | ✅ 1 max | All 9 | Ultra-fast generation |
| **Qwen Image Fast** | Instant | 2 pts | ❌ | All 9 | Lightning-fast, text-to-image only |
| **GPT Image Low** | Budget | 3 pts | ❌ | 3 only | OpenAI, fast drafts |
| **GPT Image** | Standard | 10 pts | ❌ | 3 only | OpenAI, excellent text |
| **GPT Image HD** | Premium | 27 pts | ❌ | 3 only | OpenAI, highest quality |

## Reference Image Support

| Model | Supports Refs | Max Count | Notes |
|-------|:-------------:|:---------:|-------|
| **Nano Banana** | ✅ | 10 | Style/subject reference |
| **Nano Banana Pro** | ✅ | 14 | Best reference handling |
| **Z-Image Turbo** | ✅ | 1 | Single reference only |
| **Qwen Image Fast** | ❌ | 0 | Text-to-image only |
| **GPT Image (all)** | ❌ | 0 | Text-to-image only |

---

## Detailed Model Specifications

### Nano Banana (Fast Tier)

**API Endpoint:** `google/nano-banana`

**Pricing:**
- 8 points per image (~$0.08)
- Cost to us: ~$0.04 (100% margin)

**Reference Images:**
- Supported: Yes
- Maximum: 10 images
- Use for: Style transfer, subject consistency

**Aspect Ratios (All 9 supported):**
- 16:9 (Landscape)
- 9:16 (Portrait)
- 1:1 (Square)
- 4:3 (Classic)
- 3:4 (Portrait)
- 21:9 (Ultrawide)
- 3:2 (Photo)
- 2:3 (Photo Portrait)
- Match Input Image

**Output Formats:**
- WebP (recommended)
- JPG
- PNG

**Best For:**
- Quick iterations and testing
- Budget-conscious projects
- Storyboard drafts
- Concept exploration

---

### Nano Banana Pro (Pro Tier)

**API Endpoint:** `google/nano-banana-pro`

**Pricing:**
- 20 points per image (~$0.20)
- Cost to us: ~$0.10 (100% margin)
- 4K resolution: 35 points

**Reference Images:**
- Supported: Yes
- Maximum: 14 images
- Best-in-class reference handling

**Resolutions:**
- 1K (1024px) - 20 points
- 2K (2048px) - 20 points (recommended)
- 4K (4096px) - 35 points (premium)

**Aspect Ratios (All 9 supported):**
- 16:9, 9:16, 1:1, 4:3, 3:4, 21:9, 3:2, 2:3
- Match Input Image

**Special Features:**
- State-of-the-art quality
- Accurate text rendering
- 4K output support
- Advanced editing capabilities
- Safety filter controls

**Best For:**
- Final production renders
- Text-heavy images (logos, signs)
- High-resolution prints
- Professional deliverables

---

### Z-Image Turbo (Turbo Tier)

**API Endpoint:** `prunaai/z-image-turbo`

**Pricing:**
- 5 points per image (~$0.05)

**Reference Images:**
- Supported: Yes
- Maximum: 1 image only

**Parameters:**
- Inference Steps: 1-4 (default: 2)
- Guidance Scale: 0-2 (default: 1.0)

**Aspect Ratios (All 9 supported):**
- Full support for all standard ratios

**Best For:**
- Rapid visualization
- Quick concept testing
- High-volume generation
- Speed-critical workflows

---

### Qwen Image Fast (Instant Tier)

**API Endpoint:** `prunaai/qwen-image-fast`

**Pricing:**
- 2 points per image (~$0.02)
- Lowest cost option

**Reference Images:**
- NOT supported (text-to-image only)

**Parameters:**
- Guidance: 0-10 (default: 3)
- Inference Steps: 10-50 (default: 30)
- Negative Prompt: Supported

**Aspect Ratios (All 9 supported):**
- Full support for all standard ratios

**Best For:**
- Ultra-fast drafts
- High-volume testing
- Budget-constrained projects
- Quick iterations

---

### GPT Image Low (Budget Tier)

**API Endpoint:** `openai/gpt-image-1.5` (quality: low)

**Pricing:**
- 3 points per image (~$0.03)
- Cost to us: ~$0.013

**Reference Images:**
- NOT supported (text-to-image only)

**Aspect Ratios (3 supported):**
- 1:1 (Square)
- 3:2 (Landscape)
- 2:3 (Portrait)

**Special Features:**
- Multiple images: 1-10 per request
- Background options: Opaque, Transparent, Auto
- Transparent backgrounds (PNG only)

**Best For:**
- Quick drafts
- Budget text-to-image
- Testing prompts
- Batch generation

---

### GPT Image (Standard Tier)

**API Endpoint:** `openai/gpt-image-1.5` (quality: medium)

**Pricing:**
- 10 points per image (~$0.10)
- Cost to us: ~$0.05

**Reference Images:**
- NOT supported (text-to-image only)

**Aspect Ratios (3 supported):**
- 1:1 (Square)
- 3:2 (Landscape)
- 2:3 (Portrait)

**Special Features:**
- Excellent text rendering
- Multiple images: 1-10 per request
- Background options: Opaque, Transparent, Auto

**Best For:**
- Standard quality needs
- Text-heavy images
- Product mockups
- Marketing materials

---

### GPT Image HD (Premium Tier)

**API Endpoint:** `openai/gpt-image-1.5` (quality: high)

**Pricing:**
- 27 points per image (~$0.27)
- Cost to us: ~$0.136

**Reference Images:**
- NOT supported (text-to-image only)

**Aspect Ratios (3 supported):**
- 1:1 (Square)
- 3:2 (Landscape)
- 2:3 (Portrait)

**Special Features:**
- Highest OpenAI quality
- Best text rendering accuracy
- Multiple images: 1-10 per request
- Background options: Opaque, Transparent, Auto

**Best For:**
- Final production renders
- Detailed artwork
- Professional deliverables
- Quality-critical projects

---

## Aspect Ratio Comparison

| Ratio | Nano Banana | Nano Pro | Z-Turbo | Qwen | GPT Image |
|-------|:-----------:|:--------:|:-------:|:----:|:---------:|
| 16:9 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 9:16 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 1:1 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4:3 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 3:4 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 21:9 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 3:2 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2:3 | ✅ | ✅ | ✅ | ✅ | ✅ |

**Note:** GPT Image models only support 3 aspect ratios (1:1, 3:2, 2:3)

---

## Cost Comparison (per image)

| Quality Level | Model | Cost |
|---------------|-------|:----:|
| **Cheapest** | Qwen Image Fast | 2 pts |
| **Budget** | GPT Image Low | 3 pts |
| **Fast** | Z-Image Turbo | 5 pts |
| **Value** | Nano Banana | 8 pts |
| **Standard** | GPT Image | 10 pts |
| **Pro** | Nano Banana Pro | 20 pts |
| **Premium** | GPT Image HD | 27 pts |

---

## Model Selection Guide

### Choose Nano Banana When:
- You need reference image support
- Budget is important but quality matters
- Rapid iteration is needed
- Working on storyboards

### Choose Nano Banana Pro When:
- Maximum quality is required
- 4K output is needed
- Text rendering must be accurate
- Multiple reference images needed

### Choose Z-Image Turbo When:
- Speed is critical
- Single reference is enough
- Testing concepts rapidly
- Budget is moderate

### Choose Qwen Image Fast When:
- Lowest cost is priority
- Text-to-image only is fine
- Volume is high
- Quality can be lower

### Choose GPT Image (any) When:
- OpenAI quality is preferred
- Text rendering is critical
- Aspect ratio limits are acceptable
- Batch generation needed

---

## Industry Leaderboard Context

How image generation models compare (December 2025):

### Artificial Analysis Image Arena Rankings

| Rank | Model | ELO Score | Win Rate |
|:----:|-------|:---------:|:--------:|
| #1 | Recraft V3 | 1172 | 72% |
| #2 | FLUX1.1 Pro | 1143 | 68% |
| #3 | Ideogram v2 | 1102 | 63% |
| #4 | Midjourney v6.1 | 1093 | 64% |
| - | DALL-E 3 HD | 984 | 51% |

**Model Type Strengths:**
- **Photorealism:** FLUX > DALL-E 3 > Stable Diffusion > Midjourney
- **Artistic Style:** Midjourney > FLUX > DALL-E 3 > Stable Diffusion
- **Prompt Adherence:** FLUX ≈ DALL-E 3 > Midjourney > Stable Diffusion

**Our Models' Positioning:**
- **Nano Banana Pro**: Comparable to FLUX quality with reference support
- **GPT Image HD**: OpenAI's latest, excellent text rendering
- **Qwen Image Fast**: Speed-focused alternative

**Sources:**
- [Recraft Blog - Model Comparison](https://www.recraft.ai/blog/comparing-popular-and-high-performing-text-to-image-models-and-providers)
- [AI Image Model Comparison 2025](https://medium.com/@inchristiely/ai-image-model-comparison-2025-midjourney-vs-chatgpt-vs-flux-vs-imagen-vs-nano-banana-9db41af5ef7a)

---

## Code References

### Configuration Files

**Model Configuration:**
```
src/config/index.ts
```
Contains:
- `MODEL_CONFIGS` - Complete model configurations
- `MODEL_PARAMETERS` - Parameter definitions
- `getModelConfig()` - Get config by model ID

**Type Definitions:**
```
src/features/shot-creator/types/image-generation.types.ts
```
Contains:
- `ImageModel` - Available model types
- `ImageModelSettings` - Settings interfaces
- `ImageGenerationInput` - Input types

**Service Layer:**
```
src/features/shot-creator/services/image-generation.service.ts
```
Contains:
- Input validation
- Replicate API integration
- Cost calculation

---

## Updates and Versioning

**Last Updated:** December 18, 2025

**Model Versions:**
- Nano Banana (current)
- GPT Image 1.5 (current)
- Qwen Image Fast (current)
- Z-Image Turbo (current)

For the latest pricing and model availability, check the configuration files listed above.

---

## Support

For questions or issues related to image models:
1. Check this documentation first
2. Review the source code references above
3. Consult the COST_AUDIT.md for detailed pricing audit
4. Check Replicate/OpenAI API documentation for model-specific details
