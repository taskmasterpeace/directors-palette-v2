# Music Lab Look Tab Overhaul — Design Doc

## Goal

Transform the Look tab from a simple form + single character sheet into a full visual identity studio with sub-tabs for profile, character sheet, photo shoots (powered by an AI "Publicist"), and a gallery.

## Architecture Overview

The Look tab gets 4 sub-tabs:

1. **Profile** — Current look fields (unchanged)
2. **Character Sheet** — Full-width display + editable prompt + generation
3. **Photo Shoot** — AI Publicist generates dynamic lifestyle/promo shots
4. **Gallery** — All generated images with actions

The character sheet serves as the **identity anchor** — it's the reference image fed into every subsequent generation to lock the artist's appearance.

---

## Sub-Tab 1: Profile (existing, minor changes)

Keep all current fields: skin tone, hair style, fashion style, jewelry, tattoos, visual description. Portrait and character sheet move to their own sub-tabs.

---

## Sub-Tab 2: Character Sheet

### Layout
- **Top**: Full-width character sheet image (16:9), displayed large
- **Below**: Editable prompt textarea showing the exact prompt that will be sent
- **Actions**: "Generate Character Sheet", "Regenerate", "Download"
- Portrait auto-generated after character sheet (existing 2-phase flow)
- Portrait crop tool: extract 1:1 face from the sheet

### Prompt System
- Auto-builds prompt from artist DNA fields (existing `buildPrompt` logic)
- But user can **see and edit** the prompt before generating
- Accessories pulled dynamically from jewelry/tattoos/fashion fields (not hardcoded)

### Auto-Save
- Generated character sheet auto-saves to the Gallery sub-tab
- Tagged as type: "character-sheet"

---

## Sub-Tab 3: Photo Shoot (AI Publicist)

### Concept
An AI "Publicist" that knows the artist's full biography generates contextual photo shoot scenarios. It uses the character sheet as the reference image and the artist's DNA to build rich, personalized prompts.

### How It Works

1. **Publicist generates scenarios** — User picks a category, the system builds a prompt using:
   - The character sheet URL as `image_input` reference
   - Artist's full DNA (name, ethnicity, neighborhood, fashion, personality traits, genre)
   - Category-specific scene/environment/pose details

2. **Prompt is shown editable** — User can tweak before generating
3. **Image generates** — Uses nano-banana-2 with character sheet as reference
4. **Auto-saves to gallery** — Tagged with category

### Photo Shoot Categories (dynamic from artist DNA)

**Wardrobe / Outfits**
- Streetwear look in their neighborhood
- Stage outfit under concert lighting
- Studio casual (recording session)
- Red carpet / press event
- Seasonal/weather-appropriate fits

**Locations**
- Their neighborhood block (uses city/neighborhood from Identity)
- Recording studio
- Rooftop at golden hour
- Street corner at night
- Local hangout spot

**Social Media**
- Mirror selfie at home
- Car selfie (riding through the city)
- Candid with friends celebrating
- BTS in the studio
- Food spot / restaurant vibe

**Performance**
- On stage, crowd in background
- In the booth, headphones on
- Music video pose with props
- Backstage before a show
- Festival crowd shot

### Prompt Template Structure

Each photo shoot prompt follows this structure (inspired by the examples the user provided):

```
### Scene
[Dynamic description based on category + artist DNA]

### Subject
@[ARTIST_NAME] — refer to the character sheet reference image for exact appearance.
[Fashion pulled from artist DNA]
[Pose appropriate to scene]

### Environment
[Built from artist's city/neighborhood/genre aesthetic]

### Lighting
[Appropriate to scene — natural daylight, stage lights, neon, golden hour]

### Camera
[Aspect ratio, focal length, style — candid portrait, editorial, concert photography]
```

The `@[ARTIST_NAME]` tag activates the reference system, pointing to the character sheet.

### Publicist Mode (stretch goal)
LLM call that takes the artist's full DNA and generates a week of content scenarios:
- "Thursday night: [artist] celebrating at [neighborhood bar] with friends after finishing the album"
- "Saturday morning: [artist] getting a fresh cut at the barbershop, scrolling phone"
- "Sunday: [artist] in the studio, headphones around neck, reviewing lyrics on a notepad"

User picks scenarios, system builds the full prompt, generates with character sheet as reference.

---

## Sub-Tab 4: Gallery

### Layout
- Grid of all generated images for this artist
- Filter by type: All | Character Sheet | Portrait | Photo Shoot
- Each image shows: thumbnail, type badge, timestamp

### Actions per image
- **Fullscreen** — modal with zoom (reuse FullscreenImageModal from Shot Creator)
- **Download** — save to device
- **Delete** — remove with confirmation
- **Use as Wardrobe Ref** — sends to music video wardrobe system
- **Use in Shot Creator** — loads as reference in Shot Creator

### Auto-tagging
Every generated image gets metadata:
- `type`: "character-sheet" | "portrait" | "photo-shoot"
- `category`: (for photo shoots) "wardrobe" | "location" | "social" | "performance"
- `prompt`: the prompt used to generate it
- `timestamp`: when generated

---

## Technical Details

### Storage
- Images stored via existing `/api/upload-file` -> Supabase storage
- Gallery metadata stored in the artist DNA object (new `gallery` array field)
- Each gallery item: `{ id, url, type, category, prompt, createdAt }`

### Generation
- All generation uses `nano-banana-2` model
- Resolution: 1K (locked for now)
- Character sheet: 16:9 aspect ratio
- Photo shoots: 16:9 (landscape), 9:16 (portrait/social), or 1:1 (square) — user picks
- Character sheet URL always passed as `image_input` for identity lock

### Reference Tag System
- Photo shoot prompts use `@[ARTIST_NAME]` to reference the character sheet
- This integrates with the existing `@tag` reference system in the generation pipeline
- The character sheet URL is programmatically inserted as the reference image

### New API Endpoint
- `POST /api/artist-dna/generate-photo-shoot` — Takes artist DNA + category + custom prompt, returns generated image URL
- Uses character sheet as reference image input

---

## Files to Create/Modify

### New Files
- `src/features/music-lab/components/artist-dna/tabs/look/LookSubTabs.tsx` — Sub-tab container
- `src/features/music-lab/components/artist-dna/tabs/look/ProfileTab.tsx` — Extracted profile fields
- `src/features/music-lab/components/artist-dna/tabs/look/CharacterSheetTab.tsx` — Character sheet display + generation
- `src/features/music-lab/components/artist-dna/tabs/look/PhotoShootTab.tsx` — Photo shoot categories + generation
- `src/features/music-lab/components/artist-dna/tabs/look/ArtistGalleryTab.tsx` — Gallery grid + actions
- `src/features/music-lab/services/photo-shoot.service.ts` — Prompt building for photo shoots
- `src/app/api/artist-dna/generate-photo-shoot/route.ts` — Photo shoot generation API

### Modified Files
- `src/features/music-lab/components/artist-dna/tabs/LookTab.tsx` — Replace with sub-tab container
- `src/features/music-lab/types/artist-dna.types.ts` — Add gallery item types
- `src/features/music-lab/store/artist-dna.store.ts` — Add gallery state management

---

## What Stays the Same
- All other tabs (Identity, Sound, Persona, Lexicon, Catalog)
- Constellation widget
- Writing Studio
- Music Video tab
- Artist list/card views
