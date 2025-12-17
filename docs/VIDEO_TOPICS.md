# Director's Palette Video Tutorial Topics

A comprehensive list of tutorial videos to help users get the most out of Director's Palette.

---

## Beginner Series

### 1. Quick Start Tour (3-5 min)
- Account creation and first login
- Dashboard overview
- Your first image generation
- Understanding token costs
- Navigating between sections

### 2. Shot Creator Basics (5-7 min)
- The prompt input area
- Selecting AI models (Qwen, Z-Image, Nano Banana, GPT Image)
- Aspect ratio and size options
- Generating your first image
- Downloading and saving to gallery

### 3. Understanding Your Gallery (4-6 min)
- Viewing generated images
- Creating folders/collections
- Filtering and searching
- Bulk operations (delete, move)
- Using images as references

---

## Intermediate Series

### 4. Prompt Syntax Masterclass (8-10 min)
**Variations with Brackets:**
- Basic bracket syntax: `A [red, blue, green] car`
- Multiple brackets in one prompt
- Nested variations
- Best practices for variation count

**Chain Prompting with Pipes:**
- Sequential generation: `sketch | colored | 3D render`
- How each step uses previous as reference
- Creative use cases: story progressions, style evolutions

**Wildcards for Randomization:**
- Creating wildcard lists in Prompt Tools
- Using `_wildcardname_` in prompts
- Combining wildcards with brackets
- Building a wildcard library

### 5. Recipes Deep Dive (6-8 min)
- What are recipes?
- Using built-in recipes (9-Shot Cinematic, Style Grid, Character Sheet)
- Creating custom recipes with `{{variables}}`
- Field types: text input, dropdown, number
- Adding recipes to Quick Access bar
- Recipe best practices

### 6. Reference Images & Character Consistency (8-10 min)
- Uploading reference images
- Tagging characters in your gallery
- Using character references in prompts
- Maintaining consistency across shots
- Style reference vs character reference
- Models that support references (Nano Banana: 4-14, Z-Image: 1)

---

## Advanced Series

### 7. Canvas Editor - Blocking & Composition (6-8 min)
**Use Case Example: Adding Details with VFX Bay**
- Opening an image in Canvas Editor
- Drawing mask over area to modify (e.g., octopus tentacle)
- Writing targeted prompt: "add a magic wand"
- How inpainting preserves the rest of the image
- Iterating on specific regions
- Perfect for: fixing hands, adding props, changing clothes, background swaps

**Blocking Scene Composition:**
- Actor proxies (purple) for character positioning
- Prop proxies (yellow) for set dressing
- Camera proxies (green) for angle indication
- Translating blocking to final shots

### 8. Storyboard Workflow - Start to Finish (10-12 min)
**Step 1:** Paste your script/story
**Step 2:** Define visual style
**Step 3:** Create characters with reference sheets
**Step 4:** Break story into shots (AI-assisted)
**Step 5:** Generate all images
**Step 6:** Review, rate, and greenlight
- Exporting your storyboard
- Collaboration tips

### 9. Shot Animator - Bringing Stills to Life (5-7 min)
- Selecting shots for animation
- Camera movement options
- Motion intensity settings
- Export formats
- Best practices for animatable shots

### 10. Director's Vision Styles (5-6 min)
- Built-in director styles (Ryan Cooler, Wes Sanderson, etc.)
- How each style affects output
- Creating your own style presets
- Combining styles with recipes

---

## Power User Series

### 11. Building a Wildcard Library (6-8 min)
- Essential wildcard categories:
  - `_emotions_` (happy, sad, angry, contemplative...)
  - `_camera_angles_` (low angle, bird's eye, dutch angle...)
  - `_lighting_` (golden hour, neon, harsh shadows...)
  - `_art_styles_` (watercolor, oil painting, digital art...)
  - `_time_of_day_` (dawn, noon, dusk, night...)
- Import/export wildcards
- Community wildcard sharing

### 12. Prompt Organizer - AI-Powered Prompt Building (5-7 min)
- Parsing existing prompts into structured components
- Cinematic token categories:
  - Cinematography: shot size, camera angle, framing
  - Content: subject, action, foreground, background
  - Visual Look: lens effect, depth of field, lighting
  - Motion: camera movement, subject motion
  - Style: prefix/suffix modifiers
- Reconstructing optimized prompts

### 13. Batch Generation Strategies (6-8 min)
- Using brackets for systematic variations
- Multi-wildcard combinations
- Planning large generation runs
- Token cost optimization
- Review and curation workflow

### 14. API Integration (Technical) (8-10 min)
- Getting API access
- Authentication with Bearer tokens
- Available endpoints:
  - `/api/v1/images/generate`
  - `/api/v1/recipes/execute`
  - `/api/v1/usage`
- Code examples: Python, JavaScript
- Rate limits and best practices
- Automating workflows

---

## Quick Tips Series (1-2 min each)

### QT1: Keyboard Shortcuts You Need to Know
### QT2: 5 Prompts That Always Look Great
### QT3: Fix Common AI Art Issues with Inpainting
### QT4: The Perfect Character Sheet Recipe
### QT5: Mobile Quick Access for Prompts & Recipes
### QT6: Model Selection Cheat Sheet
### QT7: Transparent Backgrounds with GPT Image
### QT8: Text in Images - Which Model to Use
### QT9: Saving Token Costs Without Sacrificing Quality
### QT10: Exporting for Print vs Web

---

## Example Prompts for Videos

### Wildcard Demo (3 variations)
**Setup wildcard `_mood_`:** dramatic, peaceful, mysterious

**Prompt:** `A _mood_ forest landscape at sunset`

**Results:**
1. "A dramatic forest landscape at sunset"
2. "A peaceful forest landscape at sunset"
3. "A mysterious forest landscape at sunset"

### Canvas Editor Demo (Octopus Example)
**Original prompt:** `A giant purple octopus in a wizard's study`
**Mask:** Draw over one tentacle
**Inpaint prompt:** `holding a glowing magic wand`
**Result:** Octopus now holds wand in that tentacle, rest unchanged

### Bracket Variation Demo
**Prompt:** `A cyberpunk [woman, man, robot] in a neon-lit alley`
**Results:** 3 images showing each subject variation

---

## Production Notes

- All videos should use consistent branding (logo watermark bottom-right)
- Screen recordings at 1920x1080, 60fps
- Voiceover or on-screen text captions
- End cards with "Try it yourself" CTA
- Timestamps in description for longer videos
- Upload to: YouTube, embedded in Help section
