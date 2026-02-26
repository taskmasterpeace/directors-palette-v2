# Image Generation Models

This document provides comprehensive details about all image generation models available in Directors Palette v2.

## Quick Reference

| Model | Tier | Cost | Reference Images | Aspect Ratios | Key Features |
|-------|------|------|:----------------:|---------------|--------------|
| **Z-Image Turbo** | Turbo | 5 pts | ❌ | All 9 | Ultra-fast, text-to-image only |
| **Nano Banana** | Fast | 8 pts | ✅ 10 max | All 9 | Budget-friendly, quick iterations |
| **Nano Banana Pro** | Pro | 20-35 pts | ✅ 14 max | All 9 | SOTA quality, 4K, text rendering |
| **Seedream 5 Lite** | Value | 4 pts | ✅ 14 max | All 9 | Deep thinking, reasoning, editing |
| **Riverflow 2 Pro** | Design | 27 pts | ✅ 10 + 4 detail | All 9 | Custom fonts, logo cleanup, infographics |

## Reference Image Support

| Model | Supports Refs | Max Count | Notes |
|-------|:-------------:|:---------:|-------|
| **Z-Image Turbo** | ❌ | 0 | Text-to-image only |
| **Nano Banana** | ✅ | 10 | Style/subject reference |
| **Nano Banana Pro** | ✅ | 14 | Best reference handling |
| **Seedream 5 Lite** | ✅ | 14 | i2i + sequential generation |
| **Riverflow 2 Pro** | ✅ | 10 + 4 | 10 source + 4 detail/logo refs |

---

## Detailed Model Specifications

### Z-Image Turbo (Turbo Tier)

**API Endpoint:** `prunaai/z-image-turbo`

**Pricing:**
- 5 points per image (~$0.05)

**Reference Images:**
- NOT supported (text-to-image only)

**Parameters:**
- Inference Steps: 1-4 (default: 2)
- Guidance Scale: 0-2 (default: 1.0)

**Aspect Ratios (All 9 supported):**
- Full support for all standard ratios
- Converted to width/height (max 2048px)

**Best For:**
- Rapid visualization
- Quick concept testing
- High-volume generation
- Speed-critical workflows

---

### Nano Banana (Fast Tier)

**API Endpoint:** `google/nano-banana`

**Pricing:**
- 8 points per image (~$0.08)

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
- JPG (default)
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
- 20 points per image (~$0.20) at 1K/2K
- 35 points per image (~$0.35) at 4K

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

### Seedream 5 Lite (Value Tier)

**API Endpoint:** `bytedance/seedream-5-lite`

**Pricing:**
- 4 points per image (~$0.04)

**Reference Images:**
- Supported: Yes
- Maximum: 14 images

**Resolutions:**
- 2K (default)
- 3K
- 4K

**Special Features:**
- Deep thinking / reasoning model
- Sequential image generation (auto mode, up to 15 images)
- Image editing capabilities
- Very low cost

**Best For:**
- Budget-friendly generation
- Reasoning-heavy prompts
- Batch sequential generation
- Image editing workflows

---

### Riverflow 2 Pro (Design Tier)

**API Endpoint:** `bytedance/riverflow-2-pro`

**Pricing:**
- 27 points per image (~$0.27)

**Reference Images:**
- Source/product images: Up to 10 (`init_images`)
- Detail/logo cleanup refs: Up to 4 (`super_resolution_refs`)

**Resolutions:**
- 1K
- 2K (default)
- 4K

**Special Features:**
- Custom font rendering (up to 2 fonts, 300 chars each)
- Logo cleanup and detail enhancement
- AI prompt enhancement
- Transparency support (PNG)
- Reasoning iterations (1-3 passes)

**Output Formats:**
- WebP (default)
- PNG (required for transparency)

**Best For:**
- Custom font/typography work
- Logo and brand design
- Infographics
- Product shots
- Design-heavy compositions

---

## Aspect Ratio Comparison

| Ratio | Z-Turbo | Nano Banana | Nano Pro | Seedream 5 | Riverflow 2 |
|-------|:-------:|:-----------:|:--------:|:----------:|:-----------:|
| 16:9 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 9:16 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1:1 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4:3 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3:4 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 21:9 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3:2 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2:3 | ✅ | ✅ | ✅ | ✅ | ✅ |

All models support all 9 aspect ratios.

---

## Cost Comparison (per image)

| Quality Level | Model | Cost |
|---------------|-------|:----:|
| **Cheapest** | Seedream 5 Lite | 4 pts |
| **Fast** | Z-Image Turbo | 5 pts |
| **Value** | Nano Banana | 8 pts |
| **Pro** | Nano Banana Pro | 20 pts |
| **Design** | Riverflow 2 Pro | 27 pts |

---

## Model Selection Guide

### Choose Z-Image Turbo When:
- Speed is critical
- Text-to-image only is fine
- Testing concepts rapidly
- Budget is moderate

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

### Choose Seedream 5 Lite When:
- Lowest cost is priority
- Reasoning-heavy prompts
- Sequential/batch generation needed
- Image editing workflows

### Choose Riverflow 2 Pro When:
- Custom typography is needed
- Logo/brand design work
- Infographics and product shots
- Detail cleanup and enhancement

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

**Last Updated:** February 25, 2026

**Available Models:**
- Nano Banana (current)
- Nano Banana Pro (current)
- Z-Image Turbo (current)
- Seedream 5 Lite (current)
- Riverflow 2 Pro (current)

For the latest pricing and model availability, check the configuration files listed above.
