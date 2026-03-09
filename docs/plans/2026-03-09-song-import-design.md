# Song Import & Collaborative Edit Design

**Date:** 2026-03-09
**Feature:** Import existing lyrics into Writing Studio for artist-driven editing

---

## Overview

Add an "Import Lyrics" flow to the Writing Studio that lets users paste existing song lyrics, auto-detect sections (intro, verse, hook, bridge, outro), confirm/adjust the detected structure, then load the sections into the Writing Studio for collaborative editing with the active artist.

## Flow

1. User clicks **"Import Lyrics"** button in the Writing Studio header (next to "Full Song" button)
2. Modal opens with a large textarea — user pastes full lyrics
3. User clicks "Analyze" — AI detects section breaks and labels (intro, verse 1, hook, verse 2, bridge, outro, etc.)
4. Modal shows detected sections with labels. User can:
   - Adjust where sections break (merge two sections or split one by clicking between lines)
   - Relabel any section via dropdown (intro, hook, verse, bridge, outro)
5. User clicks "Load into Studio" — sections populate the Writing Studio with default tone settings
6. Normal Writing Studio workflow applies: unlock a section, generate new options, judge, revise

## Auto-Detection

- Send full lyrics to LLM via existing OpenRouter API route (no new backend)
- Include active artist's DNA context in the prompt for style-aware detection
- LLM returns array of `{ type: SectionType, lines: string[] }` objects
- Detection identifies: repeated lines as hooks, narrative progression as verses, structural shifts as bridges, opening lines as intros, closing lines as outros
- Section types: `intro | verse | hook | bridge | outro`

## UI Changes

### Import Button
- Location: Writing Studio header, next to existing "Full Song" button
- Style: Secondary button with import/paste icon

### Import Modal
- Full-screen modal
- Left side: large textarea for pasting lyrics + "Analyze" button
- Right side: detected sections preview (appears after analysis)
- Each section shown as a card with:
  - Type dropdown (intro, hook, verse, bridge, outro)
  - Lines displayed as text
  - Ability to merge with adjacent section or split between lines
- "Load into Studio" button at bottom

### Writing Studio Integration
- Imported sections become standard `SongSection` objects
- `selectedDraft` populated with imported content as a `DraftOption`
- Sections loaded unlocked with default tone settings
- User can then use all existing Writing Studio features (generate options, judge, revise)

## Technical Details

### No New Backend
- Uses existing `/api/prompt-expander` or similar OpenRouter route
- Single LLM call with structured output prompt

### Data Flow
```
Paste lyrics → LLM analysis → DetectedSection[] → User adjusts → SongSection[] → Writing Studio store
```

### Types
```typescript
interface DetectedSection {
  type: 'intro' | 'verse' | 'hook' | 'bridge' | 'outro'
  label: string       // e.g. "Verse 1", "Hook", "Bridge"
  lines: string[]     // Lines of lyrics in this section
}
```

## What We Don't Build

- No audio upload/transcription
- No version history of original vs edits
- No special "imported" badge on sections
- No export functionality
