# Character Sheet Pipeline Comparison Tests

**Test Date**: January 22, 2026
**Model**: google/nano-banana-pro (v0785fb14f5aaa30eddf06fd49b6cbdaac4541b8854eb314211666e23a29087e3)

## Executive Summary

**Single-stage pipeline is the clear winner:**
- **~3.7x faster** than 3-stage pipeline
- **3x cheaper** (1 generation vs 3 generations)
- **Comparable quality** in feature preservation
- **Simpler implementation** (no intermediate stages to manage)

---

## Test Setup

### Reference Images

**Style Guides Generated:**
| Style | URL |
|-------|-----|
| Pixar 3D | https://replicate.delivery/xezq/BHMDNEKdEsp7G5P0eMZfFTFMQTVylQjQTpetHBwHhQfgPQAYB/tmph14l8m_c.jpeg |
| Watercolor | https://replicate.delivery/xezq/ZYVCHpeffkNF3oM0duzal7ZWcE5JtuKoQGAku9Elayz2HIAsA/tmpnwu__ive.jpeg |
| Comic Book | https://replicate.delivery/xezq/x0L0tQgYSl5VJlq4LWxc9V5jvK7Yz1tFeAjGz6Jk5DcICCALA/tmp9jhcbfga.jpeg |

**Character Sheet Template:**
https://tarohelkwuurakbxjyxm.supabase.co/storage/v1/object/public/templates/system/character-sheets/charactersheet-advanced.webp

**Test Subjects:**
- Subject 1: African American man (Unsplash portrait)
- Subject 2: Black woman with curly hair (Unsplash portrait)

---

## Single-Stage Pipeline Results

All references provided in a single generation call: [subject photo, style guide, template]

### Subject 1 (Man)

| Style | Time | Output URL |
|-------|------|------------|
| Pixar 3D | **25.7s** | https://replicate.delivery/xezq/dP3gupC5jf0MBKRx10e0hDLeX6zgZJQsreiR0tuLESfdsgAwC/tmpglivi0ws.jpeg |
| Watercolor | **28.6s** | https://replicate.delivery/xezq/oJHqrki8rPpWBF3aP3iPW2U0bryyHOaabjiHbBhJnyjZBBgF/tmp27wug8ji.jpeg |
| Comic Book | **33.4s** | https://replicate.delivery/xezq/yQHTjskcJVKvCdO5FGLCyOga5v6IuB70nF1aBGYLuyyaBBgF/tmp68ls3eki.jpeg |

### Subject 2 (Woman)

| Style | Time | Output URL |
|-------|------|------------|
| Pixar 3D | **46.8s** | https://replicate.delivery/xezq/flDe8N5qQeTjOoviWl9pwOiavS6Q1LzEKYKJOe9SZJeGZhAwC/tmpqbvgkqpe.jpeg |
| Watercolor | **50.0s** | https://replicate.delivery/xezq/rmW1f61AZryvBCBL00ue3oYjVea3yq5YxCF3H1lQWDRZWIAsA/tmptjk9nus1.jpeg |

**Average Single-Stage Time: ~37 seconds**

---

## 3-Stage Pipeline Results (Pixar Style)

Sequential stages: Isolate → Stylize → Sheet

### Subject 1 (Man)

| Stage | Purpose | Time | Output URL |
|-------|---------|------|------------|
| 1: Isolate | Character on white background | ~45s | https://replicate.delivery/xezq/UzFf7oA9la3SG6Y0yhwxqDtJuS2rbC2EP9LFApUcrWUrDCALA/tmp_5il6ih9.jpeg |
| 2: Stylize | Apply Pixar art style | ~45s | https://replicate.delivery/xezq/Ia4ueFCfF0udFEdo7xgz6ttfDWPgovZKwIfYxKv5IDvHhQAYB/tmpxe8wqct8.jpeg |
| 3: Sheet | Generate character sheet | **48.1s** | https://replicate.delivery/xezq/ypcwnsjOcLaWP1VWvaeSeaypubOV4UAa27D9zU4OAT6bJEAWA/tmpna1vkxh1.jpeg |

**Total 3-Stage Time: ~138 seconds**

---

## Comparison Summary

| Metric | Single-Stage | 3-Stage | Winner |
|--------|--------------|---------|--------|
| **Time** | ~37s avg | ~138s | Single-Stage (3.7x faster) |
| **API Calls** | 1 | 3 | Single-Stage (3x fewer) |
| **Cost** | 20 credits | 60 credits | Single-Stage (3x cheaper) |
| **Complexity** | Low | High | Single-Stage |
| **Control** | Less | More | 3-Stage |

---

## Recommendations

### Use Single-Stage For:
- **Default character sheet generation** - fast, cheap, good quality
- **Batch processing** - when generating multiple characters
- **Real-time user workflows** - where speed matters

### Consider 3-Stage For:
- **Fine-tuning intermediate results** - when you need to adjust isolation or stylization separately
- **Debugging character likeness** - to see where issues occur
- **Special cases** - complex backgrounds, unusual lighting conditions

---

## Optimal Single-Stage Recipe

```json
{
  "prompt": "Professional character sheet, 21:9 ultrawide format with 4 main panels showing @character_name, [visual description]. PANELS: 1) Front-facing portrait, 2) 3/4 view, 3) Profile silhouette, 4) Action pose. STYLE: [style description]. PRESERVE exact likeness from reference. Clean white background, black borders.",
  "reference_images": [
    "[subject_photo_url]",
    "[style_guide_url]",
    "[template_url]"
  ],
  "aspect_ratio": "21:9"
}
```

### Reference Image Order (Critical):
1. **Subject photo** - Primary reference for likeness
2. **Style guide** - Art style to match
3. **Template** - Layout structure

---

## Feature Preservation Analysis

Based on visual inspection of test results:

| Feature | Single-Stage | 3-Stage |
|---------|--------------|---------|
| Facial structure | Good | Good |
| Skin tone | Good | Good |
| Hair texture | Good | Good |
| Expression | Good | Moderate |
| Distinctive features | Good | Good |

Both approaches preserve distinctive features adequately. Single-stage sometimes produces more varied poses, while 3-stage provides more consistent character appearance across panels (due to using the stylized intermediate as reference).

---

## Next Steps

1. **Update CharacterStep.tsx** to use single-stage approach
2. **Create optimized system recipe** for character sheets
3. **Test with user-uploaded photos** (not just Unsplash)
4. **Verify with distinctive features** (dreadlocks, beards, glasses, tattoos)
