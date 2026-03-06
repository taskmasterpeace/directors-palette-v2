# Storyboard Director's Coverage — Design Doc

## Goal

Overhaul storyboard shot generation and management so it works like a real director: proper shot sequences with character coverage, a spreadsheet-style shot table, @ autocomplete for characters, and AI-powered "write them in" when adding characters to shots.

## Problems With Current System

1. **Flat shot generation** — One shot per text segment. No establishing → wide → medium → close-up sequences.
2. **Characters missing from shots** — Main characters don't appear in enough shots. Documentary style especially should show the subject constantly.
3. **No overview** — Card-based shot list makes it hard to see which characters are in which shots at a glance.
4. **Clunky character assignment** — Adding a character to a shot requires expanding a card, hovering an "Add" button, picking from a dropdown. Too many clicks.
5. **No @ autocomplete in storyboard** — Shot Creator has it, storyboard doesn't.
6. **No export** — Can't export the shot list.

## Design

### 1. Shot Table View (Replaces Shots Tab)

The card-based shot list is replaced with a spreadsheet-style table.

**Columns:**
| # | Type | Shot Description | Characters |
|---|------|-----------------|------------|
| 1 | establishing | Gray Ohio highway, snow falling... | |
| 2 | wide | Rental car rolling south... | @geechi_gotti |
| 3 | medium | Behind the wheel, gripping... | @geechi_gotti |
| 4 | close-up | Rearview mirror, lights flashing... | @geechi_gotti |
| 5 | wide | Cruiser lights up, pursuit... | @geechi_gotti @det_berger |

**Behavior:**
- **Rows** = shots in sequence order
- **# column** = sequence number with color dot (from segment color)
- **Type column** = shot type badge (establishing/wide/medium/close-up/detail)
- **Shot Description** = editable inline. Click to edit. Supports @ autocomplete (reuses Shot Creator's `PromptAutocomplete` component and `usePromptAutocomplete` hook)
- **Characters column** = shows @tags as small badges with character thumbnails. Click the cell to type `@` and autocomplete to add a character.
- No location column (locations stay as @tags in the description text — keep it simple)

**Row actions (on hover or right-click):**
- Edit description
- Delete shot
- Insert shot above/below
- Add character (opens @ autocomplete)

**Table header actions:**
- Export button (same pattern as Shot Creator)
- "Refine Prompts" button (existing functionality)
- Shot count display

### 2. Smarter Shot Generation (Director's Coverage)

Upgrade the LLM prompt in `/api/storyboard/generate-prompts` to think like a director.

**Current behavior:** One shot per text segment. Flat. Characters often missing.

**New behavior:** For each story beat, generate a proper shot sequence:
- Establishing → wide → medium → close-up as the story demands
- Not every beat needs all four types — the LLM uses judgment
- Main characters appear in 70%+ of shots
- Documentary style: subject almost always on screen (directly shown, or visual references like belongings, documents, silhouettes)

**LLM prompt changes:**
- Add explicit instruction: "You are a director planning shot coverage. For each story beat, generate the appropriate shot sequence."
- Include character roles: "Main character: @geechi_gotti. He should appear in most shots."
- Include style context: "Documentary style — the subject should be visually present in the majority of shots."
- Each generated shot MUST populate `characterRefs` with the characters that appear in it
- Shot types should follow natural cinematic grammar (don't jump from establishing to close-up without a medium)

**Breakdown level adjustment:**
- Level 1 (Fine) may now generate 2-4 shots per segment instead of 1
- Level 3 (Coarse) generates 1-2 shots per segment
- Total shot count will be higher than before — this is correct and expected

### 3. @ Autocomplete in Shot Descriptions

**Reuse existing components from Shot Creator:**
- `PromptAutocomplete` component (`src/features/shot-creator/components/prompt-autocomplete/PromptAutocomplete.tsx`)
- `usePromptAutocomplete` hook (`src/features/shot-creator/hooks/usePromptAutocomplete.ts`)
- `ReferenceItem` component for rendering items with thumbnails
- `AutocompleteOption` types

**Adaptation needed:**
- The Shot Creator autocomplete pulls from the reference library (gallery images with @tags)
- For storyboard, we also need to include storyboard characters (from `useStoryboardStore().characters`)
- Extend `buildOptions()` to merge both sources: gallery references AND storyboard characters
- Character options show: thumbnail (if available) + name + role badge

**Where it appears:**
- Shot description cells in the table (inline editing)
- Any shot prompt textarea throughout storyboard

### 4. AI "Write Them In" (Add Character to Scene)

When a user adds a character to a shot via the Characters cell:

1. User clicks the Characters cell on shot #5 and types `@geechi_gotti`
2. Character @tag is added to shot #5's `characterRefs`
3. AI call generates 1-3 new coverage shots that naturally introduce the character into the scene
4. New shots are inserted after shot #5, sequence numbers renumbered
5. Each new shot has appropriate type (medium, close-up, etc.) and the character in `characterRefs`

**API route:** `POST /api/storyboard/expand-shot`
- Input: `{ shotSequence, characterId, existingPrompt, storyContext, characters }`
- Output: `{ newShots: GeneratedShotPrompt[] }` (1-3 shots)
- LLM prompt: "You are a director. Shot #5 currently shows [existing prompt]. The director wants to add @geechi_gotti to this scene. Generate 1-3 new shots that naturally cover this character in context. Use appropriate shot types (medium, close-up, etc.)."

**When NOT to generate new shots:**
- If the character is already mentioned in the shot description, just add them to `characterRefs` (no new shots needed)
- If user is typing @ in the description itself (they're manually editing, not requesting coverage)

### 5. Export

**Button location:** Top of the shot table, alongside "Refine Prompts"

**Export format:** Same pattern as Shot Creator. Options:
- Copy to clipboard (formatted text with shot numbers, types, descriptions, characters)
- CSV download

**Format example (clipboard):**
```
SHOT LIST — [Story Title]
Generated: 2026-03-06

#1 | ESTABLISHING | Gray Ohio highway, snow falling in that dull Midwest way...
   Characters: —

#2 | WIDE | Rental car rolling south on I-75, four silhouettes inside...
   Characters: @geechi_gotti

#3 | MEDIUM | Behind the wheel, @geechi_gotti gripping the steering wheel...
   Characters: @geechi_gotti
```

## Architecture

### New Components
- `ShotTable.tsx` — Replaces `ShotBreakdown.tsx` as the Shots tab content
- `ShotTableRow.tsx` — Individual row with inline editing
- `CharacterCell.tsx` — Characters cell with @tag badges and add functionality
- `ShotTableHeader.tsx` — Column headers + export button

### Modified Components
- `Storyboard.tsx` — Swap `ShotBreakdown` for `ShotTable`
- `openrouter.service.ts` — Updated LLM prompt for director-style coverage

### Reused from Shot Creator
- `PromptAutocomplete` component
- `usePromptAutocomplete` hook
- `ReferenceItem`, `CategoryItem` components
- `AutocompleteOption` types

### New API Route
- `POST /api/storyboard/expand-shot` — AI generates coverage shots when adding character

### Store Changes
- Add `insertShotsAfter(sequence, newShots)` action to storyboard store
- Add `renumberShots()` utility for sequence management
- Add `exportShotList()` utility

## What We're NOT Building
- Location column in the table (locations stay as @tags in description)
- Drag-and-drop shot reordering (future)
- Multi-select bulk character assignment (future)
- Shot duration/timing column (future — for ad pipeline)
