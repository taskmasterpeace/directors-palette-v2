# Director Image Generation Guide

## Directors

| Director | Style | Approach |
|----------|-------|----------|
| **Ryan Cooler** | Emotion-forward | Identity, legacy, communal stakes |
| **Clint Westwood** | Economical | Authenticity, moral weight, minimal authority |
| **David Pincher** | Precision | Psychological tension, systems, inevitability |
| **Wes Sanderson** | Whimsy & Symmetry | Composition, color, irony |
| **Hype Millions** | Glossy Futurist | Spectacle, performance, future-fashion |

---

## Generation Prompts

### Ryan Cooler
```
Professional photograph of Ryan Cooler, African-American male director 
in his late 30s, thoughtful expression, wearing casual smart clothing, 
warm lighting, on a film set, holding a director's viewfinder, intimate 
atmosphere, documentary style, high quality, photorealistic
```

### Clint Westwood
```
Professional photograph of Clint Westwood, Caucasian male director in 
his 90s, weathered face, silver hair, calm piercing gaze, wearing simple 
dark clothing, naturalistic lighting, on a film set, reserved posture, 
minimal background, documentary style, high quality, photorealistic
```

### David Pincher
```
Professional photograph of David Pincher, Caucasian male director in his 
early 60s, intense focused expression, clean-shaven, wearing dark technical 
clothing, precise controlled lighting, symmetrical composition, on a 
meticulously organized set, perfectionist energy, high quality, photorealistic
```

### Wes Sanderson
```
Professional photograph of Wes Sanderson, Caucasian male director in his 50s, 
wearing a tweed suit and scarf, quirky glasses, standing on a pastel colored set, 
perfectly symmetrical composition, whimsical atmosphere, soft lighting, 
holding a vintage camera, high quality, photorealistic
```

### Hype Millions
```
Professional photograph of Hype Millions, African-American male director in his 30s, 
wearing futuristic streetwear and sunglasses, standing in a high-tech wind tunnel, 
fisheye lens distortion, glossy lighting, high contrast, music video aesthetic, 
cool pose, wide angle, high quality, photorealistic
```

---

## Process

1. **Generate base** with `nano-banana-pro`
2. **Save to** `/public/directors/{id}.jpg`
3. **Variations** with `p-image-edit` using base as reference

## Negative Prompt
```
cartoon, anime, illustration, deformed, blurry, low quality, text, watermark
```

## Code Reference
- Data: `src/features/music-lab/data/directors.data.ts`
- Types: `src/features/music-lab/types/director.types.ts`
- Use `buildDirectorImagePrompt()` for programmatic generation
