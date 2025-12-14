# Director Image Generation Guide

## Directors

| Director | Style | Approach |
|----------|-------|----------|
| **Ryan Coogler** | Emotion-forward | Identity, legacy, communal stakes |
| **Clint Eastwood** | Economical | Authenticity, moral weight, minimal authority |
| **David Fincher** | Precision | Psychological tension, systems, inevitability |

---

## Generation Prompts

### Ryan Coogler
```
Professional photograph of Ryan Coogler, African-American male director 
in his late 30s, thoughtful expression, wearing casual smart clothing, 
warm lighting, on a film set, holding a director's viewfinder, intimate 
atmosphere, documentary style, high quality, photorealistic
```

### Clint Eastwood
```
Professional photograph of Clint Eastwood, Caucasian male director in 
his 90s, weathered face, silver hair, calm piercing gaze, wearing simple 
dark clothing, naturalistic lighting, on a film set, reserved posture, 
minimal background, documentary style, high quality, photorealistic
```

### David Fincher
```
Professional photograph of David Fincher, Caucasian male director in his 
early 60s, intense focused expression, clean-shaven, wearing dark technical 
clothing, precise controlled lighting, symmetrical composition, on a 
meticulously organized set, perfectionist energy, high quality, photorealistic
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
