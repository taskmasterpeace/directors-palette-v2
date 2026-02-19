# Director's Palette — Prompt Language Video (60 seconds)

## VIDEO SCRIPT

---

### SCENE 1: Hook (0:00 - 0:05)
**VISUAL:** Quick montage of 4 stunning images being generated — different styles (claymation, blade runner, comic book, realistic)
**VO:** "One prompt. Infinite possibilities. This is the Director's Palette prompting language."

---

### SCENE 2: Brackets — Batch Variations (0:05 - 0:15)
**VISUAL:** Screen recording showing someone typing the prompt, then 3 images appearing side by side

**ON SCREEN TEXT:** `Brackets = Batch Variations`

**PROMPT SHOWN:**
```
a lone samurai standing in [a bamboo forest, a neon city, a desert storm]
```

**VO:** "Use brackets to generate variations in one shot. One prompt — three images."

**IMAGES TO GENERATE (3 images):**
1. `cinematic wide shot of a lone samurai standing in a bamboo forest, golden hour light filtering through, mist rising, photorealistic, dramatic lighting`
2. `cinematic wide shot of a lone samurai standing in a neon city, rain-soaked streets, cyberpunk atmosphere, reflections on wet pavement, photorealistic`
3. `cinematic wide shot of a lone samurai standing in a desert storm, sand swirling, dramatic backlighting, silhouette, photorealistic`

---

### SCENE 3: Pipes — Multi-Prompt Sequences (0:15 - 0:22)
**VISUAL:** Three completely different images appearing in sequence

**ON SCREEN TEXT:** `Pipes = Separate Prompts`

**PROMPT SHOWN:**
```
hero enters the ring | crowd erupts | champion raises belt
```

**VO:** "Pipes generate completely separate scenes. Tell a story in frames."

**IMAGES TO GENERATE (3 images):**
1. `cinematic medium shot of a boxer walking through smoke into a boxing ring, dramatic spotlight, crowd silhouettes, photorealistic, shallow depth of field`
2. `cinematic wide shot of an arena crowd erupting in celebration, confetti falling, dramatic arena lighting, thousands of fans, photorealistic`
3. `cinematic low angle close-up of a champion raising a gold belt overhead, triumphant expression, spotlight from above, photorealistic`

---

### SCENE 4: Anchor Transform — Style Transfer (0:22 - 0:32)
**VISUAL:** Show an anchor image (claymation style reference) + a photo of a person, then the result: person in claymation style

**ON SCREEN TEXT:** `@! = Anchor Transform`

**PROMPT SHOWN:**
```
@! Transform into claymation style
```

**VO:** "Drop in a style reference, add @-bang, and every image transforms to match. Your first image is the anchor — the rest follow its lead."

**IMAGES TO GENERATE:**
1. **Anchor reference (pre-made):** Use the built-in claymation preset image
2. **Input image:** A regular photo-style portrait
3. **Result:** The portrait transformed into claymation style

*(For the video, show the workflow: drag images in → type `@!` → click generate → result appears)*

---

### SCENE 5: Wildcards — Randomized Elements (0:32 - 0:40)
**VISUAL:** Show the wildcard list UI, then generate 2-3 images showing different wardrobe picks

**ON SCREEN TEXT:** `_wildcards_ = Random Picks`

**PROMPT SHOWN:**
```
portrait of a rapper wearing _wardrobe_ in _venue_
```

**WILDCARD LIST SHOWN:**
```
_wardrobe_:
  vintage Nike windbreaker, baggy jeans, gold chain
  Gucci tracksuit, designer shades
  leather jacket, white tee, diamond earrings

_venue_:
  a dimly lit recording studio
  a rooftop at sunset
  backstage at a concert
```

**VO:** "Underscores pull a random pick from your custom lists. Every generation is unique."

**IMAGES TO GENERATE (2 images with different combos):**
1. `cinematic portrait of a rapper wearing a vintage Nike windbreaker, baggy jeans, and gold chain in a dimly lit recording studio, dramatic rim lighting, shallow depth of field, photorealistic`
2. `cinematic portrait of a rapper wearing a Gucci tracksuit and designer shades on a rooftop at sunset, golden hour, city skyline behind, photorealistic`

---

### SCENE 6: Slot Machine — AI Variations (0:40 - 0:48)
**VISUAL:** Show typing `{seed}`, clicking the wand, and it expanding to `[variations]`

**ON SCREEN TEXT:** `{curly braces} = AI Expands`

**PROMPT SHOWN (before):**
```
a detective in {dramatic lighting}
```

**PROMPT SHOWN (after AI expansion):**
```
a detective in [harsh overhead fluorescent, rain-streaked neon glow, single desk lamp noir]
```

**VO:** "Curly braces let the AI surprise you. It expands your seed into creative variations you didn't think of."

**IMAGES TO GENERATE (3 images):**
1. `cinematic close-up of a detective sitting at a desk under harsh overhead fluorescent lighting, files scattered, cold blue tones, photorealistic`
2. `cinematic medium shot of a detective standing on a rain-soaked street, neon signs reflected in puddles, pink and blue glow, photorealistic`
3. `cinematic medium shot of a detective leaning over a desk lit by a single desk lamp, film noir shadows, high contrast, smoke in the air, photorealistic`

---

### SCENE 7: Reference Tags — Image Anchoring (0:48 - 0:55)
**VISUAL:** Show the @autocomplete dropdown appearing as user types, then a generated image using the reference

**ON SCREEN TEXT:** `@tags = Image References`

**PROMPT SHOWN:**
```
@hero walking through a rainy alley, cinematic lighting
```

**VO:** "Tag any image from your library with @. It becomes a visual anchor the AI uses to keep your character consistent across every shot."

**IMAGE TO GENERATE:**
1. `cinematic medium shot of a man walking through a rain-soaked alley at night, neon reflections on wet pavement, dramatic backlighting, shallow depth of field, photorealistic` (with a reference image attached)

---

### SCENE 8: Combo Power + Close (0:55 - 1:00)
**VISUAL:** Show all syntax elements combined in one prompt, then a grid of resulting images

**ON SCREEN TEXT:** `Combine them all.`

**PROMPT SHOWN:**
```
@hero wearing _wardrobe_ in [a rooftop, a warehouse, a ring] | crowd cheering
```

**VO:** "Mix and match. Brackets, pipes, wildcards, references — stack them to generate entire scenes from a single prompt. This is Director's Palette."

**END CARD:** Director's Palette logo + URL

---

## PRODUCTION ASSETS NEEDED

### Images to Pre-Generate (14 total)

| # | Scene | Prompt | Model | Aspect Ratio |
|---|-------|--------|-------|--------------|
| 1 | S2-A | `cinematic wide shot of a lone samurai standing in a bamboo forest, golden hour light filtering through tall bamboo stalks, mist rising from the ground, 35mm film grain, dramatic lighting, photorealistic` | nano-banana-pro | 16:9 |
| 2 | S2-B | `cinematic wide shot of a lone samurai standing in a neon-lit cyberpunk city, rain-soaked streets, holographic advertisements, reflections on wet pavement, teal and magenta color grading, photorealistic` | nano-banana-pro | 16:9 |
| 3 | S2-C | `cinematic wide shot of a lone samurai standing in a fierce desert sandstorm, sand swirling around silhouette, dramatic backlighting from low sun, warm amber tones, photorealistic` | nano-banana-pro | 16:9 |
| 4 | S3-A | `cinematic medium shot of a boxer walking through theatrical smoke into a boxing ring under a single spotlight, crowd silhouettes in background, dramatic atmosphere, photorealistic, shallow depth of field` | nano-banana-pro | 16:9 |
| 5 | S3-B | `cinematic wide shot of an arena crowd erupting in celebration, confetti falling from above, dramatic arena lighting, thousands of excited fans, energy and motion, photorealistic` | nano-banana-pro | 16:9 |
| 6 | S3-C | `cinematic low angle close-up of a boxing champion raising a gold championship belt overhead with both hands, triumphant expression, intense spotlight from above, sweat glistening, photorealistic` | nano-banana-pro | 16:9 |
| 7 | S5-A | `cinematic portrait of a rapper wearing a vintage Nike windbreaker with baggy jeans and a heavy gold chain, sitting in a dimly lit recording studio, dramatic rim lighting from behind, microphone visible, shallow depth of field, photorealistic` | nano-banana-pro | 16:9 |
| 8 | S5-B | `cinematic portrait of a rapper wearing a Gucci tracksuit and designer sunglasses standing on a rooftop at golden hour sunset, city skyline panorama behind, warm golden light, photorealistic` | nano-banana-pro | 16:9 |
| 9 | S6-A | `cinematic close-up of a hardboiled detective sitting at a cluttered desk under harsh overhead fluorescent office lighting, files and coffee cups scattered, cold blue-green tones, tired expression, photorealistic` | nano-banana-pro | 16:9 |
| 10 | S6-B | `cinematic medium shot of a detective standing on a rain-soaked city street at night, neon signs reflected in puddles, pink and blue neon glow illuminating face, trench coat, photorealistic` | nano-banana-pro | 16:9 |
| 11 | S6-C | `cinematic medium shot of a detective leaning over a wooden desk illuminated by a single warm desk lamp, deep film noir shadows, high contrast, cigarette smoke curling in the light, photorealistic` | nano-banana-pro | 16:9 |
| 12 | S7 | `cinematic medium shot of a man in a dark jacket walking through a rain-soaked narrow alley at night, neon light reflections on wet cobblestones, dramatic backlighting, atmospheric fog, shallow depth of field, photorealistic` | nano-banana-pro | 16:9 |
| 13 | S8-A | `cinematic wide shot of a boxer on a warehouse rooftop at dusk, wearing a leather jacket and gold chain, city lights in background, dramatic sky, photorealistic` | nano-banana-pro | 16:9 |
| 14 | S8-B | `cinematic wide shot of a crowd cheering wildly in a dimly lit underground venue, hands raised, spotlights cutting through haze, energy and motion, photorealistic` | nano-banana-pro | 16:9 |

### Screen Recordings Needed

1. **Bracket typing** — Type the samurai bracket prompt in the Shot Creator prompt box, show the syntax highlighting feedback
2. **Pipe typing** — Type the boxing pipe prompt, show the count indicator
3. **Anchor transform** — Upload 2+ images, type `@!`, show the anchor badge appear
4. **Wildcard editing** — Show the wildcard list editor, type a `_wardrobe_` tag in prompt
5. **Slot machine** — Type `{dramatic lighting}`, click the Organize Prompt wand button, show the AI expansion
6. **@tag autocomplete** — Type `@` in the prompt box, show the autocomplete dropdown appear
7. **Combined prompt** — Type the final combo prompt showing all syntax together

### Audio / Music

- **Background music:** Upbeat, modern, cinematic electronic — 60 seconds
- **VO style:** Confident, fast-paced, tutorial-style narration (think product launch energy)
- **SFX:** Subtle UI sounds on each generation (click, whoosh for image appearing)

### Text Overlays / Motion Graphics

| Timestamp | Text | Style |
|-----------|------|-------|
| 0:05 | `[ brackets ] = Batch Variations` | Large, bold, center screen, animate in |
| 0:15 | `pipes = Separate Prompts` | Same style |
| 0:22 | `@! = Anchor Transform` | Same style |
| 0:32 | `_wildcards_ = Random Picks` | Same style |
| 0:40 | `{ curly braces } = AI Expands` | Same style |
| 0:48 | `@tags = Image References` | Same style |
| 0:55 | `Combine them all.` | Larger, dramatic |
| 0:58 | Director's Palette logo + tagline | End card |

### Color Palette for Graphics
- Background: `#0A0A0F` (near-black)
- Accent: `#8B5CF6` (purple, matches the app's primary)
- Syntax highlight: `#F59E0B` (amber for brackets/pipes)
- Text: `#FFFFFF`

---

## CHEAT SHEET (for end card or separate asset)

```
DIRECTOR'S PALETTE — PROMPT SYNTAX CHEAT SHEET

[ a, b, c ]         Batch — generates one image per option
prompt1 | prompt2    Pipe — generates separate scenes
_wildcard_           Random pick from your custom list
{ seed text }        AI expands into [variations]
@reference           Uses a tagged image as visual anchor
@!                   Style transfer — first image = anchor
@category            Random from prompt library category

Combine freely:
@hero wearing _wardrobe_ in [city, forest] | crowd scene
```
