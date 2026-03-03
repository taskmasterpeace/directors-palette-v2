# Artist-Aware UX Improvements

## 1. Artist-Voiced Concept Suggestions

Rewrite the suggest-concepts API prompt so the LLM responds as the artist character. Feed full DNA: slang, ad-libs, signature phrases, attitude, city, backstory, events, banned words, catalog. Output stays as 6 concepts in the same UI, but each reads like the artist pitched it.

**Files:** `/api/artist-dna/suggest-concepts/route.ts`

## 2. Sound Studio: Highlight What Fits the Artist

When an artist is selected, visually highlight options that match their DNA:

- **Moods:** Match persona traits/attitude to mood tag IDs
- **Production tags:** Match `dna.sound.productionPreferences` to tag IDs
- **Instruments:** Match `dna.sound.instruments`

**Implementation:**
- `useArtistFit` hook returns `Set<string>` of matching tag IDs
- Each multi-select component renders amber indicator on matches
- Small "N match your artist" label per section

**Files:** New hook, updates to MoodSelector, MultiSelectPills, InstrumentPalette, DrumDesignPanel, GrooveFeelPanel, BassStylePanel, SynthTexturePanel, HarmonyPanel, SpaceFxPanel, EarCandyPanel
