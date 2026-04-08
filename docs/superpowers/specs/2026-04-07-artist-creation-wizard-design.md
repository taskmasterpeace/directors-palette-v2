# Artist Creation Wizard — Design Spec

**Date:** 2026-04-07
**Status:** Design approved, ready for implementation plan
**Owner:** Music Lab / Artist DNA

---

## Problem

The current artist creation flow drops users into a 6-tab editor (`ArtistEditor.tsx`, ~1,470 lines across 6 tab files) with 30+ fields. Users report it feels **overwhelming**. The existing "seed from real artist" feature is great but hidden, and there's no structured path for users who have a *partial* idea in their head ("a Texas trap artist with knee-length colorful dreads") — they have to either seed from someone real or stare at empty fields.

The building blocks for a smarter on-ramp already exist:
- **2-pass seed API** (`/api/artist-dna/seed-from-artist`): GPT-4.1 + Perplexity Sonar Pro web search, flags `lowConfidenceFields`.
- **Per-field AI suggestions** (`MagicWandField` + `/api/artist-dna/suggest`).
- **Vibe beat, constellation widget, character sheet generators.**

What's missing is the **entry experience**. Users need a low-friction on-ramp that produces a *complete* artist they can react to, not empty fields to fill.

## Goals

1. **No empty-field wall.** Every creation path produces a complete artist before the user has to edit anything.
2. **Pin what you care about, let AI fill the rest.** Users with partial ideas (just a genre, just a look, a full description) should each have a natural path.
3. **Three clear doors on entry.** No tabs, no mode switches, no decisions about where to click first.
4. **Legal safety on real-artist seeding** without being paternalistic.
5. **Preserve power-user access** to the full editor.

## Non-goals

- Replacing the underlying DNA schema (identity / sound / persona / lexicon / look / catalog — unchanged).
- Rewriting the existing APIs (`seed-from-artist`, `suggest`, etc. — reused as-is).
- Removing the 6-tab editor. It becomes **Advanced view**, still reachable.
- Touching the Artist List page, constellation widget, or character sheet generation.

---

## The Three Doors

On "Create Artist," the user lands on a **Door Selection screen**. Three big cards, no other UI. Each card has an icon, a one-line promise, and a short subtitle.

### Door 1 — Inspired by an artist 🎤
> *"Start from someone real. Make them yours."*

**Flow:**
1. User types a real artist name (autocomplete suggestions optional, not required for v1).
2. Clicks **Seed**. Runs the existing `/api/artist-dna/seed-from-artist` 2-pass pipeline (GPT-4.1 + Perplexity). Cost: **25 pts** (unchanged).
3. On success, a **new helper endpoint** generates 3 fictional stage name alternatives in the same vibe (e.g. seeding from "Travis Scott" → "Nova Cactus", "Astro Lane", "Houston Halo"). Cheap (single cheap LLM call, ~$0.001, no credit charge).
4. User lands on the **Review & Remix screen** with:
   - Stage name field pre-filled with the real name, highlighted amber, pill labeled **"Rename suggested"**.
   - Three alternative-name chips below the field. One-click to accept.
   - If user keeps the real name, a small disclaimer appears on save: *"Saving a real artist's name may impersonate them. Consider renaming."* Not a hard block.

**Legal posture:** Inspired-by is the standard fan-fiction / creative tribute paradigm. We keep the sonic/persona DNA (fair use territory) but nudge users away from storing the real name as the saved artist's identity (impersonation risk). No hard block — respects user agency.

### Door 2 — Build it 🧬
> *"You have an idea. Pin what matters. We fill the rest."*

**Flow:**
1. User lands on a single screen with:
   - **Big chat box** at the top — placeholder: *"Describe your artist in your own words… (e.g. 'Texas trap artist, Black guy, knee-length colorful dreads, melodic but raw')"*
   - Below it, a **pin chip row** with these optional dimensions, each clickable to pin a value:
     - 🎵 **Genre** (cascade: base → sub → micro)
     - 📍 **Region** (country / state / city)
     - 🌍 **Ethnicity / heritage** (free text with chip suggestions)
     - 👤 **Gender / presentation** (chip picker)
     - 🎤 **Vocal style** (chip picker: rapper / singer / hybrid + descriptor chips)
     - 👗 **Signature look** (free text + chip suggestions)
     - ⚡ **Energy / vibe** (chip picker: menacing, sunshine, introspective, regal, etc.)
     - 📖 **Era / time period** (optional — "80s New York", "2020s internet")
     - 🌐 **Language** (if not English)
   - **Generate** button.
2. User types whatever they want, pins whatever they want. Generate button is disabled until the user has provided **at least one signal** — either a non-empty description OR at least one pin. (Pure zero-input would be indistinguishable from Door 3 without a genre, which isn't a meaningful request.)
3. Hits Generate. Calls a **new** `/api/artist-dna/build-from-pins` endpoint that takes the free-form description + the pin list and produces a complete DNA profile, respecting every pin as a hard constraint.
4. Lands on **Review & Remix screen**.

**Cost:** 15 pts (single-pass GPT-4.1, no web search needed since there's no real artist to verify).

### Door 3 — Surprise me 🎲
> *"Pick the genre. We'll do the rest."*

**Flow:**
1. User lands on a minimal screen:
   - **Genre cascade picker** at the top (required — base genre is the anchor, subgenre and microgenre optional).
   - A **"Spice it up (optional)"** row with four small pin slots:
     - 🏷️ **Stage name** (type one if you've got a fun word in mind)
     - 📍 **From** (city / state / country)
     - ⚡ **Vibe word** (single word: menacing, sunshine, hungover, regal, etc.)
     - 👤 **Look hint** (one phrase: "knee-length dreads," "gold grills," "always in white")
   - A giant **ROLL** button.
2. User picks genre + any 0–4 spice pins. Hits Roll.
3. Same `/api/artist-dna/build-from-pins` endpoint as Door 2 (Door 3 is a low-friction UI on the same engine).
4. Lands on **Review & Remix screen**.

**Cost:** 15 pts (same endpoint as Door 2).

**Why these four spice pins:** They map to the things people most often *imagine first* about an artist — the fun name they thought of, where the artist is from, the feeling, the visual hook.

---

## Review & Remix Screen (the new default editor)

This replaces the 6-tab `ArtistEditor` as the **default landing experience** after any door. The 6-tab editor still exists as **Advanced view** — a small link in the corner of the Review & Remix screen.

### Layout

Magazine-spread style, not form-style. The user's eye should land on the artist as a **character**, not as a dataset.

**Top section (hero):**
- Large portrait (generated via existing `generate-portrait` API, or placeholder if none yet)
- Stage name (large, inline-editable) + amber "Rename suggested" pill if Door 1 and unchanged
- One-line tagline (attitude field, inline-editable)
- Three quick-stat badges: primary genre, city/region, melody bias (e.g. *"Trap · Houston, TX · 65% melodic"*)
- Vibe beat auto-plays in background (existing behavior)

**Below the hero — editable cards in a 2-column grid:**

1. **Identity card** — real name, ethnicity, city/neighborhood, backstory preview (click → side panel for full edit), significant events list
2. **Sound card** — genres (chips), vocal textures, flow style, production preferences, melody bias slider, key collaborators, influences
3. **Persona card** — traits chips, attitude, worldview preview (click → side panel), likes/dislikes
4. **Lexicon card** — signature phrases, slang, ad-libs
5. **Look card** — skin tone, hair, fashion, jewelry, tattoos, visual description preview
6. **Catalog card** — existing entries, "Add song" button

Each card has:
- **Sparkle button** on every field (existing `MagicWandField` behavior) to re-roll that field with AI
- **Inline edit** for short fields: click the field, type, blur to save
- **Side panel** for long-form fields (backstory, sound description, worldview, visual description): click preview → side panel slides in with full editor + suggestion chips + regenerate button
- **Low-confidence indicator** on fields flagged by the seed API (existing behavior, unchanged)

### Save behavior

- **Auto-save on blur** for inline edits (no dirty state to manage)
- **Explicit save** only required on initial creation (when the artist doesn't exist yet in the DB). After first save, everything auto-persists.
- **"Advanced view"** link in top-right corner opens the existing 6-tab editor for the same artist. Useful for power users who want to see and edit every field in one place.

---

## New API: `/api/artist-dna/build-from-pins`

Used by Door 2 and Door 3.

**Request:**
```ts
{
  description?: string  // free-form text from Door 2's chat box (Door 3 omits)
  pins: {
    genre?: { base: string, sub?: string, micro?: string }
    region?: { city?: string, state?: string, country?: string }
    ethnicity?: string
    gender?: string
    vocalStyle?: string
    signatureLook?: string
    vibe?: string
    era?: string
    language?: string
    stageName?: string  // Door 3 can pin this
  }
}
```

**Behavior:**
1. Deduct 15 pts (single generation, no web search).
2. Build a prompt that includes the description + enumerates each pin as a **hard constraint**.
3. Call GPT-4.1 with the same DNA schema structure as `seed-from-artist` (reuse the JSON structure from that prompt — keep one source of truth).
4. Return the complete DNA object.

**Cost:** ~$0.03 per call. Charged as 15 pts.

**Why a new endpoint vs reusing `seed-from-artist`:** `seed-from-artist` is built around a real artist name and runs a web-search verification pass, which is meaningless for invented artists. The prompt shape is also different: seed is "reconstruct a real person accurately," build is "invent a coherent character respecting these constraints." Mixing them into one endpoint would muddy both.

## New helper endpoint: `/api/artist-dna/suggest-rename`

Used by Door 1 only. Generates 3 fictional stage name alternatives in the same vibe as the seeded real artist.

**Request:**
```ts
{ realName: string, dna: ArtistDNA }
```

**Response:**
```ts
{ alternatives: string[] }  // 3 fictional stage names
```

**Cost:** Not charged. Single cheap call (~$0.001) using a cheap model (e.g. `openai/gpt-4.1-mini`).

---

## Component Inventory

### New components

| Component | Purpose | Location |
|---|---|---|
| `ArtistDoorSelector.tsx` | Three-card door selection screen | `src/features/music-lab/components/artist-dna/wizard/` |
| `Door1SeedFromArtist.tsx` | Door 1 input screen | `.../wizard/` |
| `Door2BuildIt.tsx` | Door 2 chat box + pin chip row | `.../wizard/` |
| `Door3SurpriseMe.tsx` | Door 3 genre cascade + spice pins + ROLL | `.../wizard/` |
| `PinChipRow.tsx` | Reusable row of optional dimension pins (used by Door 2) | `.../wizard/` |
| `PinChip.tsx` | Single pin chip with empty/filled state + picker popover | `.../wizard/` |
| `ReviewAndRemixScreen.tsx` | New default post-creation editor | `.../artist-dna/` |
| `ReviewHero.tsx` | Top hero section (portrait, name, tagline, stat badges) | `.../artist-dna/review/` |
| `EditableCard.tsx` | Reusable card with inline edit + sparkle + side-panel trigger | `.../artist-dna/review/` |
| `FieldSidePanel.tsx` | Slide-in side panel for long-form field editing | `.../artist-dna/review/` |
| `RenameSuggestionPill.tsx` | Amber pill + 3 alternative chips shown on Door 1 real-name field | `.../artist-dna/review/` |

### Reused (unchanged)

- `MagicWandField` — sparkle button + suggestion chips
- `GenreCascade` — used in Door 2's pin chip and Door 3's main picker
- `ConstellationWidget` — still shown on Advanced view
- `VibeBeatPlayer` — still autoplays in Review hero
- `ArtistEditor.tsx` — becomes **Advanced view**, reachable via link

### Reused APIs (unchanged)

- `/api/artist-dna/seed-from-artist` — Door 1
- `/api/artist-dna/suggest` — per-field sparkle buttons on Review screen
- `/api/artist-dna/generate-portrait` — hero portrait
- `/api/artist-dna/generate-character-sheet` — still reachable from Look card
- `/api/artist-dna/calculate-genome` — still used after saves

### New APIs

- `/api/artist-dna/build-from-pins` — Door 2 and Door 3
- `/api/artist-dna/suggest-rename` — Door 1 review screen

---

## Data Flow

```
Door Selection screen
    │
    ├─ Door 1 ──► seed-from-artist API ──► suggest-rename API ──┐
    │                                                             │
    ├─ Door 2 ──► build-from-pins API ───────────────────────────┤
    │                                                             │
    └─ Door 3 ──► build-from-pins API ───────────────────────────┤
                                                                  │
                                                                  ▼
                                                    Review & Remix screen
                                                    (complete DNA draft)
                                                                  │
                                                                  ▼
                                                        User edits / re-rolls
                                                                  │
                                                                  ▼
                                                          Save to store
                                                                  │
                                                                  ▼
                                                      Artist list / Advanced view
```

## Store Changes

`useArtistDnaStore` today manages the editor's draft/dirty state for the 6-tab editor. Minimal additions:

- New action `startWizard()` — clears draft, opens door selection
- New action `applyWizardResult(dna)` — populates draft from API response and opens Review & Remix screen
- New piece of state: `wizardStep: 'doors' | 'door1' | 'door2' | 'door3' | 'review'` — drives which screen is shown
- Existing `activeTab`, `isDirty`, `saveArtist`, `closeEditor` all stay. Advanced view still uses `activeTab`.

## Routing

The music lab artist-dna page reads `wizardStep` and renders:
- `'doors'` → `ArtistDoorSelector`
- `'door1'` / `'door2'` / `'door3'` → respective door component
- `'review'` → `ReviewAndRemixScreen` (default for existing saved artists too — open an artist from the list → review screen, not the old editor)
- Advanced view link → sets `activeTab = 'identity'` and renders `ArtistEditor` in an overlay/modal

Existing artists in the list open directly into **Review & Remix** (skipping the wizard), giving everyone the benefit of the new editor without a migration.

---

## Error Handling

| Scenario | Handling |
|---|---|
| Door 1 seed API fails | Show error toast, refund pts, return to Door 1 input |
| Door 1 suggest-rename fails | Silently skip — Review screen still loads without alternative chips |
| Door 2/3 build-from-pins fails | Show error toast, refund pts, return to the door the user came from |
| User hits Review with insufficient pts | Error toast shown before API call; don't deduct |
| Network drop mid-save on Review | Existing save-error toast + retry (unchanged) |
| User navigates away mid-wizard | Draft is discarded; no auto-save until Review screen |

## Testing Strategy

- **Playwright**: a happy-path test for each door ending in a saved artist. Test files in `tests/artist-wizard/`.
- **Manual smoke**: verify every existing artist still opens correctly in the Review screen.
- **Legal rename flow**: verify real-name save-without-rename shows disclaimer but doesn't block.

## Rollout

Single-phase ship. No feature flag needed — the new wizard *is* the default, existing artists continue to work (they just open into Review & Remix instead of the 6-tab editor). Advanced view preserves the old experience 1:1 for anyone who wants it.

## Open Questions (none blocking)

- Should the Door Selection screen have a fourth small link — *"I already have lyrics"* → imports via the existing song-import flow and reverse-engineers the artist? Out of scope for v1 but listed as a natural extension.
- Should `generate-portrait` auto-run after any door completes, or only on user click? Recommendation: auto-run on Door 1 and Door 3 (where user just wants to see the result), manual click on Door 2 (where user wrote a description and may want to refine before spending pts on a portrait).

---

## Summary

Three doors on entry — **Inspired by an artist**, **Build it**, **Surprise me** — each producing a complete artist that lands on a new **Review & Remix** screen. The 6-tab editor becomes Advanced view. No empty-field wall, no overwhelming tabs, and the user's first interaction is always *reacting to something the AI made*, not filling in blanks. Legal safety on Door 1 via a suggested-rename nudge, not a hard block. Every existing API stays; two small new endpoints (`build-from-pins`, `suggest-rename`) and a handful of new components do the work.
