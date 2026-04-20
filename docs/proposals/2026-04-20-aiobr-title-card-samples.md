# AIOBR Title Card — 3 Sample Proposals

**Status:** Draft — awaiting selection
**Companion to:** AIOBR Thumbnail recipe (shipped 2026-04-19)

Three distinct visual approaches for the AIOBR Title Card recipe. Each is a standalone design philosophy — pick one (or combine elements across). After selection, I'll seed the recipe into `recipe-samples.ts` + prod Supabase, upload any new layout refs, and add the entry to `community_items`.

Shared assumptions across all three:
- `is_system=true`, `user_id=null`, category `scenes`, aspect `16:9`, model `nano-banana-2`
- No character reference image required (titles are typographic / environmental)
- Text treatment locked independent of illustration style (same decoupling pattern as the main AIOBR recipe)
- Layout refs baked in as per-stage `referenceImages` with `isStatic: true`

---

## Sample A — "Courtroom Dossier"

**Vibe:** Evidence file, police wall, redacted dossier. Parchment/manila texture, typewriter and stamped elements, document clutter with one hero chapter title punched through.

**Why it might win:** AIOBR documentary tone leans investigative — "who told on Surf", "the career suicide of Loso", "the attempted assassination of Big T". A dossier title card sells the investigative framing before a single word of narration lands. Evokes Serial / 30 for 30 / OJ: Made in America.

**Fields:**
| Name | Type | Purpose |
|---|---|---|
| CHAPTER_NUMBER | `text!` | "Chapter 03" / "Act II" / "Round 4" — renders as red-stamped top-left |
| CHAPTER_TITLE | `text!:row1` | Hero line — giant stenciled courtroom-style sans |
| SUBTITLE | `text:row1:collapsed` | Smaller line below, often a quote or date |
| EVIDENCE_TAG | `text:collapsed` | Tiny caption like "EXHIBIT A" or "PEOPLE v. DOE, 2019" |
| MOOD | `select(Damning,Ominous,Ironic,Triumphant,Tragic,Suspicious,Final)!` | Shifts lighting/paper tint |
| REDACTION_LEVEL | `select(None,Light,Heavy)` | Black bars over imaginary names — visual texture only |

**Layout refs (to upload):** 2-3 court document photos, redacted FBI pages, newspaper cutouts. Plus reuse 2 existing AIOBR thumbs for scale/punch reference.

**Prompt skeleton:**
```
Design a cinematic documentary title card styled as a courtroom/investigative dossier.

TEXT HIERARCHY (hero first):
- CHAPTER_NUMBER rendered top-left as a red rubber-stamped mark, slightly crooked.
- CHAPTER_TITLE dominates the center — giant stenciled or typewriter-bold caps, punched through the paper like a headline.
- SUBTITLE (if any) tucked below in smaller typewriter serif.
- EVIDENCE_TAG (if any) bottom corner in tiny all-caps, like a case filing.

BACKGROUND: aged manila / off-white paper, subtle coffee stains, faint grid lines,
overlapping document edges. Light redaction bars if REDACTION_LEVEL >= Light.

MOOD drives paper tint and lighting: ... (per value)

TEXT TREATMENT (DECOUPLED FROM ILLUSTRATION STYLE): all text remains clean,
bold, high-contrast. No comic-book hand-drawn letters, no 3D extruded text.
```

---

## Sample B — "Graffiti Wall Chapter"

**Vibe:** Concrete-jungle chapter marker. Hand-tagged wall, hero title as a huge mural spray-paint piece, supporting text as wheatpaste posters / stickers / cutouts around it.

**Why it might win:** Matches the raw, street-level culture of battle rap. Every AIOBR episode is a neighborhood story; this title card makes each chapter feel like arriving in that neighborhood. Pairs perfectly with an image cutaway to a street-level establishing shot next.

**Fields:**
| Name | Type | Purpose |
|---|---|---|
| CHAPTER_TITLE | `text!:row1` | Hero mural piece — giant tagged letters |
| TAG_ARTIST | `text:row1:collapsed` | Optional small signature bottom-right (like a writer's tag) |
| SUBTITLE | `text:collapsed` | Sticker/poster line: date, location, round number |
| CITY_OR_LOCATION | `text:collapsed` | Wheatpaste poster text — e.g. "BROOKLYN, 2019" |
| MOOD | `select(Gritty,Euphoric,Defiant,Somber,Explosive,Peaceful)!` | Drives palette + lighting |
| WALL_TYPE | `select(Brick,Concrete,Metal Shutter,Plywood,Subway Tile)` | Texture base for the wall |
| CHARACTER_GHOST | `text:collapsed` | Optional fill: faint stencil portrait worked into the wall as texture (no ref, pure text prompt) |

**Layout refs (to upload):** 2-3 graffiti murals, wheatpaste poster walls, street-level signage. Reuse 2 AIOBR thumbs for the "bold giant text, high energy" feel.

**Prompt skeleton:**
```
Design a documentary chapter title card rendered as an urban wall mural.

HERO: CHAPTER_TITLE as a huge hand-tagged mural piece occupying 70% of the frame,
in bold graffiti block letters with drop shadow, outline, and optional highlight.

SUPPORTING: SUBTITLE, CITY_OR_LOCATION, TAG_ARTIST render as wheatpaste posters,
stickers, and spray-tag signatures scattered around the mural. NOT stylized as
graffiti — they stay as clean sans-serif on "printed" poster backgrounds glued
to the wall, so the hero title stays dominant.

WALL_TYPE dictates surface texture. MOOD drives palette (palette word list).

TEXT TREATMENT: hero title may look hand-painted. Supporting text is flat
clean sans-serif on realistic poster paper — NEVER hand-lettered.
```

**Special trick:** hero text *is* stylized (graffiti), supporting text is decoupled. This is the one sample where typography intentionally bleeds into visual style for the *hero* line only.

---

## Sample C — "Neon Broadcast Lower-Third"

**Vibe:** Prestige-TV broadcast graphic. Cinematic blurred environmental backdrop, big animated-looking kinetic title, broadcast-grade lower-third bar. Think HBO Sports documentary meets ESPN 30 for 30.

**Why it might win:** Broadest commercial appeal — reads as "professional streaming documentary" instantly. Easy for viewers to parse. Scales across episode lengths from shorts to hour-longs without looking out of place.

**Fields:**
| Name | Type | Purpose |
|---|---|---|
| CHAPTER_NUMBER | `text:row1:collapsed` | "EP 04" / "CH 02" — small upper-left broadcast tag |
| CHAPTER_TITLE | `text!:row1` | Hero kinetic title, stacked/wrapped for punch |
| SUBTITLE | `text:row2:collapsed` | Airs directly below hero |
| LOWER_THIRD_TEXT | `text:collapsed` | Bottom bar broadcast line (e.g. narrator credit, network call-out) |
| MOOD | `select(Cinematic,Prestige,Urgent,Triumphant,Ominous,Tender,Electric)!` | Drives color grade |
| BACKDROP | `wildcard(battle_rap_lighting, random)` | Environmental blur (reuses existing wildcard) |
| ACCENT_COLOR | `select(Red,Blue,Gold,White,Cyan,Magenta)` | Hero title fill + lower-third bar tint |
| TICKER_TEXT | `text:collapsed` | Optional scrolling-style ticker at the very bottom |

**Layout refs (to upload):** 2 HBO/Netflix documentary title cards, 1 ESPN 30 for 30 frame, 1 lower-third broadcast graphic example. Plus 1 existing AIOBR thumb for energy reference.

**Prompt skeleton:**
```
Design a prestige-TV documentary chapter title card in broadcast style.

BACKDROP: <<BACKDROP>> scene, heavily blurred and darkened to 25% visibility,
atmospheric with deep contrast so titles read cleanly. Treat it as environmental
texture, not a photograph subject.

HERO: CHAPTER_TITLE dominates center-screen, stacked/wrapped for maximum punch,
in ACCENT_COLOR with thick white outline and subtle chromatic shadow (like kinetic
graphics captured mid-animation). SUBTITLE below in clean white.

FRAMING GRAPHICS:
- CHAPTER_NUMBER in an outlined box top-left, broadcast call-sign style.
- LOWER_THIRD_TEXT on a solid ACCENT_COLOR bar across the bottom 15%.
- TICKER_TEXT (if any) as a tiny scrolling-style line at the very bottom edge.

TEXT TREATMENT (DECOUPLED): all text is clean bold sans-serif (Impact / Anton).
Never stylized to match the illustration style. Title might have a subtle glow
or motion blur — never comic/painterly lettering.

MOOD drives color grade and atmospheric intensity.
```

---

## Comparison at a glance

| Attribute | A: Dossier | B: Graffiti | C: Broadcast |
|---|---|---|---|
| Primary texture | Paper + stamps | Brick + paint | Blurred scene + glass |
| Hero text energy | Stenciled punch | Tagged mural | Kinetic broadcast |
| Best for | Investigative chapters | Street culture stories | Any chapter, broad appeal |
| Works without character ref? | Yes | Yes | Yes |
| Closest real-world analog | Serial podcast art | Beastie Boys docs | 30 for 30 / HBO Sports |
| Unique risk | Might feel "cold" | Typography bleed intentional | Most generic if done wrong |

---

## Next steps (after you pick)

1. You tell me: A, B, C, or "mix these elements"
2. I finalize the prompt template with your chosen approach
3. Upload any new layout refs to `templates/system/aiobr-title-cards/` in Supabase Storage
4. Add recipe to `SAMPLE_RECIPES` in `recipe-samples.ts` AND seed to prod via a new `scripts/seed-aiobr-title-card.js`
5. Add `community_items` entry
6. Smoke test from Shot Creator → AIOBR Title Card → fill fields → generate

Ping me with your pick (or "let me think") and I'll execute.
