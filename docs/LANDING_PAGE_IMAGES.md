# Landing Page Images Needed

A checklist of images to generate/capture for the enhanced landing page.

---

## Wildcard Example Section (3 images)

**Prompt pattern:** `A [dramatic/peaceful/mysterious] forest landscape at sunset`

Generate 3 images:
1. **dramatic-forest.jpg** - "A dramatic forest landscape at sunset"
   - Aspect ratio: 16:9 (landscape)
   - Intense lighting, stormy clouds, dark silhouettes

2. **peaceful-forest.jpg** - "A peaceful forest landscape at sunset"
   - Aspect ratio: 16:9 (landscape)
   - Soft golden light, calm atmosphere, gentle colors

3. **mysterious-forest.jpg** - "A mysterious forest landscape at sunset"
   - Aspect ratio: 16:9 (landscape)
   - Foggy, ethereal, moody, subtle lighting

**Save to:** `/public/landing/wildcards/`

---

## VFX Bay / Canvas Editor Section (Optional)

If you want to add visuals to the VFX Bay section:

1. **octopus-before.jpg** - Base image of purple octopus in wizard study
2. **octopus-after.jpg** - Same image with magic wand added to one tentacle
3. **inpaint-demo.gif** (optional) - Animation showing mask → result

**Save to:** `/public/landing/vfx-bay/`

---

## Image Specifications

- **Format:** JPG or PNG (PNG for transparency if needed)
- **Size:** 800x450 minimum for landscape, 400x400 for square
- **Optimization:** Compress for web (use TinyPNG or similar)

---

## Quick Prompts to Generate

### RECOMMENDED: Variation Demo Set (Nano Banana Pro)

**Purpose:** Show bracket syntax creating 3 variations of same subject with different items

**Prompt for landing page showcase:**
```
Extreme close up portrait of a confident 30-year-old man, [wearing a green golf polo shirt, wearing an orange football helmet, wearing tactical black body armor], neutral expression, dramatic studio lighting, solid black background, professional portrait photography, sharp focus, high detail
```

**This generates 3 images:**
1. Man wearing golf polo shirt
2. Man wearing football helmet
3. Man wearing body armor

**Settings:**
- Model: Nano Banana Pro (20 tokens)
- Aspect ratio: 1:1 square OR 3:2 landscape (800x533)
- Use same seed for consistency across all 3

**Post-processing:**
- Add white text labels below each image: "golf shirt" / "football helmet" / "body armor"
- Or add text overlay showing the prompt variation

**Save to:** `/public/landing/variations/`
- variation-1-golf.jpg
- variation-2-helmet.jpg
- variation-3-armor.jpg

---

### Alternative: Wildcard Demo Set (Forest Moods)
```
Generate with same seed for consistency, only change the mood word:

A dramatic forest landscape at sunset, cinematic lighting, towering pine trees, intense orange and red sky, dark silhouettes, moody atmosphere

A peaceful forest landscape at sunset, soft golden hour lighting, gentle rays through trees, calm serene atmosphere, warm colors

A mysterious forest landscape at sunset, thick fog rolling through trees, ethereal light beams, moody and atmospheric, muted colors
```

---

### Octopus Demo (VFX Bay)
```
Base: A purple octopus wearing a wizard hat sitting at an antique wooden desk in a cluttered wizard's study, spell books, candles, magical artifacts, warm ambient lighting

Inpaint prompt for one tentacle: holding a glowing crystal magic wand
```

---

## Current Images in /public/landing/

- [x] app-results-1.png - Main hero screenshot
- [x] app-results-2.png - Secondary screenshot
- [x] 9-shot-cinematic.png - 9-shot grid example
- [x] storyboard-preview.png - Storyboard feature
- [x] login-bg-1.png - Login background
- [x] mobile-login-bg.png - Mobile login background

---

## After Generating Images

1. Optimize file sizes (compress)
2. Add to `/public/landing/wildcards/` folder
3. Update `landing/page.tsx` to use Image components with the new images
4. Test on localhost
5. Commit and push
