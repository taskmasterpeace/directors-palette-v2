# Video Generation Models

This document provides comprehensive details about all video generation models available in Directors Palette v2.

## Quick Reference

| Model | Tier | Pricing Type | Max Duration | Resolutions | Aspect Ratios | Key Features |
|-------|------|--------------|--------------|-------------|---------------|--------------|
| **WAN 2.2-5B Fast** | Budget | Per-video | ~4s (fixed) | 480p, 720p | 16:9, 9:16 | Ultra-low cost, quick previews |
| **WAN 2.2 I2V Fast** | Budget+ | Per-video | 5s (fixed) | 480p, 720p | 16:9, 9:16 | Last frame control |
| **Seedance Pro Fast** | Standard | Per-second | 3-12s | 480p, 720p, 1080p | All 7 | Fast generation, variable duration |
| **Seedance Lite** | Featured | Per-second | 3-12s | 480p, 720p, 1080p | All 7 | Reference images + last frame |
| **Kling 2.5 Turbo Pro** | Premium | Per-second | 3-10s | 720p | 16:9, 9:16, 1:1 | Best motion quality |

## Input Image Requirements

All video models require a **start image** (image-to-video). Support for additional inputs varies:

| Model | Start Image | Last Frame | Reference Images | Max Refs |
|-------|:-----------:|:----------:|:----------------:|:--------:|
| **WAN 2.2-5B Fast** | ✅ Required | ❌ | ❌ | 0 |
| **WAN 2.2 I2V Fast** | ✅ Required | ✅ | ❌ | 0 |
| **Seedance Pro Fast** | ✅ Required | ❌ | ❌ | 0 |
| **Seedance Lite** | ✅ Required | ✅ | ✅ | 4 |
| **Kling 2.5 Turbo Pro** | ✅ Required | ❌ | ❌ | 0 |

**Notes:**
- **Start Image**: The initial frame that the video animates from (required for all models)
- **Last Frame**: Optional end frame for keyframe-style animation control
- **Reference Images**: Style/subject reference for consistency (Seedance Lite only)
- Seedance Lite: Reference images cannot be used with 1080p or with last frame

---

## Detailed Model Specifications

### WAN 2.2-5B Fast (Budget Tier)

**Replicate ID:** `wan-video/wan-2.2-5b-fast`

**Pricing:**
- Type: Per-video (flat rate)
- 480p: 1 point per video
- 720p: 1 point per video

**Duration:**
- Fixed at approximately 4 seconds
- Not configurable

**Resolutions:**
- 480p (854x480)
- 720p (1280x720)
- Default: 720p

**Aspect Ratios:**
- 16:9 (Landscape)
- 9:16 (Vertical)
- Note: Limited aspect ratio support compared to Seedance models

**Features:**
- Start frame (image-to-video)
- No last frame control
- No reference images support
- Fixed duration only

**Restrictions:**
- Cannot exceed 4 seconds
- No last frame support
- Maximum 720p resolution
- No reference images
- Only 16:9 and 9:16 aspect ratios

**Best For:**
- Quick previews and testing
- Ultra-budget projects
- Rapid iteration
- Concept validation

**Example Cost:**
```
1 video @ 720p = 1 point
10 videos @ 720p = 10 points
```

---

### WAN 2.2 I2V Fast (Budget+ Tier)

**Replicate ID:** `wan-video/wan-2.2-i2v-fast`

**Pricing:**
- Type: Per-video (flat rate)
- 480p: 2 points per video
- 720p: 3 points per video

**Duration:**
- Fixed at 5 seconds
- Not configurable

**Resolutions:**
- 480p (854x480)
- 720p (1280x720)
- Default: 720p

**Aspect Ratios:**
- 16:9 (Landscape)
- 9:16 (Vertical)
- Note: Limited aspect ratio support compared to Seedance models

**Features:**
- Start frame (image-to-video)
- Last frame control (keyframe animation)
- No reference images support
- Fixed duration

**Restrictions:**
- Fixed 5 second duration
- Maximum 720p resolution
- No reference images
- Only 16:9 and 9:16 aspect ratios

**Best For:**
- Budget videos with precise end state
- Keyframe-style animations
- Controlled transformations
- Cost-effective storytelling

**Example Cost:**
```
1 video @ 720p = 3 points
1 video @ 480p = 2 points
10 videos @ 720p = 30 points
```

---

### Seedance Pro Fast (Standard Tier)

**Replicate ID:** `bytedance/seedance-1-pro-fast`

**Pricing:**
- Type: Per-second
- 480p: 2 points/second
- 720p: 4 points/second
- 1080p: 9 points/second

**Duration:**
- Minimum: 3 seconds
- Maximum: 12 seconds
- Default: 5 seconds
- Fully configurable

**Resolutions:**
- 480p (854x480)
- 720p (1280x720)
- 1080p (1920x1080)
- Default: 720p

**Aspect Ratios (All 7 supported):**
- 16:9 (Landscape)
- 4:3 (Standard)
- 1:1 (Square)
- 3:4 (Portrait)
- 9:16 (Vertical)
- 21:9 (Ultrawide)
- 9:21 (Vertical Ultra)

**Features:**
- Start frame (image-to-video)
- Variable duration (3-12s)
- Fast generation speed
- All resolution options
- All aspect ratio options

**Restrictions:**
- No last frame support
- No reference images
- Per-second billing

**Best For:**
- Quick longer videos
- Standard quality projects
- Flexible duration needs
- High-resolution output
- Any aspect ratio requirement

**Example Cost:**
```
5s @ 720p = 4 × 5 = 20 points
10s @ 1080p = 9 × 10 = 90 points
3s @ 480p = 2 × 3 = 6 points
12s @ 720p = 4 × 12 = 48 points
```

---

### Seedance Lite (Featured Tier)

**Replicate ID:** `bytedance/seedance-1-lite`

**Pricing:**
- Type: Per-second
- 480p: 3 points/second
- 720p: 5 points/second
- 1080p: 11 points/second

**Duration:**
- Minimum: 3 seconds
- Maximum: 12 seconds
- Default: 5 seconds
- Fully configurable

**Resolutions:**
- 480p (854x480)
- 720p (1280x720)
- 1080p (1920x1080)
- Default: 720p

**Aspect Ratios (All 7 supported):**
- 16:9 (Landscape)
- 4:3 (Standard)
- 1:1 (Square)
- 3:4 (Portrait)
- 9:16 (Vertical)
- 21:9 (Ultrawide)
- 9:21 (Vertical Ultra)

**Features:**
- Start frame (image-to-video)
- Last frame control (keyframe animation)
- Reference images (1-4 images)
- Variable duration (3-12s)
- Full creative control
- All aspect ratio options

**Restrictions:**
- Reference images CANNOT be used with 1080p resolution
- Reference images CANNOT be used with last frame
- Maximum 4 reference images

**Best For:**
- Full creative control
- Style consistency (reference images)
- Keyframe animations (last frame)
- Professional productions
- Any aspect ratio requirement

**Example Cost:**
```
5s @ 720p = 5 × 5 = 25 points
10s @ 1080p = 11 × 10 = 110 points
5s @ 480p with refs = 3 × 5 = 15 points
12s @ 720p with last frame = 5 × 12 = 60 points
```

**Feature Combinations:**
```
✓ Start frame only
✓ Start + Last frame
✓ Start + Reference images (1-4)
✗ Start + Last + Reference (NOT allowed)
✗ Reference images @ 1080p (NOT allowed)
```

---

### Kling 2.5 Turbo Pro (Premium Tier)

**Replicate ID:** `kwaivgi/kling-v2.5-turbo-pro`

**Pricing:**
- Type: Per-second
- 720p: 10 points/second
- Note: Only 720p supported

**Duration:**
- Minimum: 3 seconds
- Maximum: 10 seconds
- Default: 5 seconds
- Fully configurable

**Resolutions:**
- 720p (1280x720) only
- Default: 720p

**Aspect Ratios (3 supported):**
- 16:9 (Landscape)
- 9:16 (Vertical)
- 1:1 (Square)
- Note: Limited compared to Seedance models (no 4:3, 3:4, 21:9, 9:21)

**Features:**
- Start frame (image-to-video)
- Premium motion quality
- Best-in-class motion coherence
- Professional output

**Restrictions:**
- 720p resolution only
- No last frame support
- No reference images
- Higher cost per second
- Only 16:9, 9:16, and 1:1 aspect ratios

**Best For:**
- High-quality final renders
- Complex motion sequences
- Professional deliverables
- Quality-critical projects

**Example Cost:**
```
5s @ 720p = 10 × 5 = 50 points
10s @ 720p = 10 × 10 = 100 points
3s @ 720p = 10 × 3 = 30 points
```

---

## Pricing Calculation Examples

### Per-Video Models (Fixed Cost)

**WAN 2.2-5B Fast:**
```
Single video @ 480p = 1 point
Single video @ 720p = 1 point
Batch of 5 @ 720p = 5 points
```

**WAN 2.2 I2V Fast:**
```
Single video @ 480p = 2 points
Single video @ 720p = 3 points
Batch of 5 @ 720p = 15 points
```

### Per-Second Models (Variable Cost)

**Formula:** `points = (points_per_second × duration)`

**Seedance Pro Fast Examples:**
```
3s @ 480p = 2 pts/s × 3s = 6 points
5s @ 720p = 4 pts/s × 5s = 20 points
10s @ 1080p = 9 pts/s × 10s = 90 points
12s @ 720p = 4 pts/s × 12s = 48 points
```

**Seedance Lite Examples:**
```
3s @ 480p = 3 pts/s × 3s = 9 points
5s @ 720p = 5 pts/s × 5s = 25 points
10s @ 1080p = 11 pts/s × 10s = 110 points
12s @ 720p with last frame = 5 pts/s × 12s = 60 points
```

**Kling 2.5 Turbo Pro Examples:**
```
3s @ 720p = 10 pts/s × 3s = 30 points
5s @ 720p = 10 pts/s × 5s = 50 points
10s @ 720p = 10 pts/s × 10s = 100 points
```

### Cost Comparison Table

| Duration | WAN Fast | WAN I2V | Seedance Fast | Seedance Lite | Kling Pro |
|----------|----------|---------|---------------|---------------|-----------|
| 3s @ 480p | 1 pt | 2 pts | 6 pts | 9 pts | N/A |
| 5s @ 720p | 1 pt | 3 pts | 20 pts | 25 pts | 50 pts |
| 10s @ 720p | N/A | N/A | 40 pts | 50 pts | 100 pts |
| 12s @ 1080p | N/A | N/A | 108 pts | 132 pts | N/A |

---

## Model Selection Guide

### Choose WAN 2.2-5B Fast When:
- You need ultra-low cost
- Quick previews are sufficient
- 4 seconds is enough
- Testing concepts rapidly

### Choose WAN 2.2 I2V Fast When:
- You need last frame control
- Budget is tight
- 5 seconds is sufficient
- Keyframe animation needed

### Choose Seedance Pro Fast When:
- You need variable duration
- Fast generation is important
- No last frame needed
- 1080p output desired

### Choose Seedance Lite When:
- You need reference images
- Last frame control required
- Full creative control needed
- Style consistency matters

### Choose Kling 2.5 Turbo Pro When:
- Motion quality is critical
- Professional output required
- Budget allows premium pricing
- Complex movements needed

---

## Common Resolution Dimensions

| Resolution | Dimensions | Aspect Ratio |
|-----------|------------|--------------|
| 480p | 854×480 | 16:9 |
| 720p | 1280×720 | 16:9 |
| 1080p | 1920×1080 | 16:9 |

**Aspect Ratios Per Model:**

| Model | Supported Aspect Ratios |
|-------|------------------------|
| WAN 2.2-5B Fast | 16:9, 9:16 |
| WAN 2.2 I2V Fast | 16:9, 9:16 |
| Seedance Pro Fast | 16:9, 4:3, 1:1, 3:4, 9:16, 21:9, 9:21 (All 7) |
| Seedance Lite | 16:9, 4:3, 1:1, 3:4, 9:16, 21:9, 9:21 (All 7) |
| Kling 2.5 Turbo Pro | 16:9, 9:16, 1:1 |

**All Available Aspect Ratios:**
- 16:9 (Landscape) - YouTube, standard video
- 4:3 (Standard) - Classic TV format
- 1:1 (Square) - Instagram, social media
- 3:4 (Portrait) - Portrait photos
- 9:16 (Vertical) - TikTok, Reels, Stories
- 21:9 (Ultrawide) - Cinematic widescreen
- 9:21 (Vertical Ultra) - Tall vertical content

**Fixed Settings:**
- FPS: 24 (all models)

---

## Code References

### Configuration Files

**Model Configuration:**
```
src/features/shot-animator/config/models.config.ts
```
Contains:
- `ANIMATION_MODELS` - Complete model configurations
- `DEFAULT_MODEL_SETTINGS` - Default settings per model
- `ACTIVE_VIDEO_MODELS` - Active models list
- `MODEL_TIER_LABELS` - UI tier labels

**Type Definitions:**
```
src/features/shot-animator/types/index.ts
```
Contains:
- `AnimationModel` - Available model types
- `ModelConfig` - Model configuration interface
- `ModelSettings` - Generation settings interface
- `VIDEO_MODEL_PRICING` - Pricing configuration

**Service Layer:**
```
src/features/shot-animator/services/video-generation.service.ts
```
Contains:
- `VideoGenerationService.validateInput()` - Input validation
- `VideoGenerationService.buildReplicateInput()` - Build API inputs
- `VideoGenerationService.calculateCost()` - Cost calculation
- `VideoGenerationService.getReplicateModelId()` - Get Replicate IDs

### API Integration

**Replicate Model IDs:**
```typescript
const replicateModels = {
  'wan-2.2-5b-fast': 'wan-video/wan-2.2-5b-fast',
  'wan-2.2-i2v-fast': 'wan-video/wan-2.2-i2v-fast',
  'seedance-pro-fast': 'bytedance/seedance-1-pro-fast',
  'seedance-lite': 'bytedance/seedance-1-lite',
  'kling-2.5-turbo-pro': 'kwaivgi/kling-v2.5-turbo-pro'
}
```

### Usage Example

```typescript
import { VideoGenerationService } from '@/features/shot-animator/services/video-generation.service'

// Calculate cost
const cost = VideoGenerationService.calculateCost(
  'seedance-lite',  // model
  5,                // duration in seconds
  '720p'            // resolution
)
// Returns: 25 points

// Validate input
const validation = VideoGenerationService.validateInput({
  model: 'seedance-lite',
  prompt: 'A beautiful sunset over mountains',
  image: 'https://example.com/image.jpg',
  modelSettings: {
    duration: 5,
    resolution: '720p',
    aspectRatio: '16:9',
    fps: 24,
    cameraFixed: false
  },
  referenceImages: ['ref1.jpg', 'ref2.jpg'],
  lastFrameImage: 'last.jpg'  // This will fail validation
})
// Returns: { valid: false, errors: ['Reference images cannot be used with last frame...'] }
```

---

## Legacy Models

### Seedance Pro (Legacy)

**Status:** Deprecated - Use Seedance Pro Fast instead

**Replicate ID:** `bytedance/seedance-1-pro`

This model is kept for backwards compatibility but should not be used for new projects. Use **Seedance Pro Fast** for better performance at lower cost.

---

## Troubleshooting

### Validation Errors

**"Reference images cannot be used with 1080p resolution"**
- Solution: Use 720p or 480p when using reference images with Seedance Lite

**"Reference images cannot be used with last frame image"**
- Solution: Choose either reference images OR last frame, not both

**"Model does not support last frame control"**
- Solution: Use WAN I2V Fast, Seedance Lite, or Seedance Pro (legacy)

**"Duration exceeds maximum for this model"**
- Solution: Reduce duration or choose a model with higher max duration

### Cost Optimization Tips

1. **Use per-video models for short videos** - WAN models are most cost-effective for <5s
2. **Choose appropriate resolution** - 480p costs significantly less than 1080p
3. **Optimize duration** - Every second counts on per-second models
4. **Batch similar settings** - Reduces switching between models
5. **Use reference images wisely** - Only when style consistency is critical

---

## Updates and Versioning

**Last Updated:** December 18, 2025

**Model Versions:**
- WAN 2.2 (current)
- Seedance 1 (current)
- Kling 2.5 (current)

For the latest pricing and model availability, check the Replicate API documentation or the source code configuration files listed above.

---

## Industry Leaderboard Context

How our models compare to the broader AI video generation landscape (December 2025):

### Artificial Analysis Video Arena Rankings

| Rank | Model | ELO Score | Notes |
|:----:|-------|:---------:|-------|
| #1 | Runway Gen-4.5 | 1247 | Top overall |
| #2 | Google Veo 3 | ~1200 | Strong competitor |
| #9 | **Kling AI** | 1171 | Best for image-to-video |
| #10 | Alibaba WAN v2.2 | 1130 | Budget-friendly |
| #11 | **Seedance Lite** | 1098 | Full-featured |
| #12 | OpenAI Sora | 1078 | Text-to-video focused |
| #14 | Pika v2.2 | 1007 | Creative effects |

**Our Models' Strengths:**
- **Kling 2.5 Turbo Pro**: #1 for image-to-video quality
- **Seedance Lite**: Most features (refs + last frame) at reasonable cost
- **WAN 2.2**: Best budget option for quick iterations

**Sources:**
- [AIBase Text-to-Video Leaderboard](https://model.aibase.com/leaderboard/text-to-vedio)
- [Pixazo AI Video Comparison](https://www.pixazo.ai/blog/ai-video-generation-models-comparison-t2v)

---

## Support

For questions or issues related to video models:
1. Check this documentation first
2. Review the source code references above
3. Consult the COST_AUDIT.md for detailed pricing audit
4. Check Replicate API documentation for model-specific details
