# Music Lab Feature Report

**Date:** 2026-03-27
**Platform:** Directors Palette v2

---

## Table of Contents

1. [Artist Lab](#1-artist-lab)
2. [Artist Chat](#2-artist-chat)
3. [Writing Studio](#3-writing-studio)
4. [Sound Studio](#4-sound-studio)
5. [Artist Deletion](#5-artist-deletion)

---

## 1. Artist Lab

### What It Is
A virtual artist creator that lets users build comprehensive AI artist profiles from scratch or by seeding from real-world artists. Every dimension of an artist is captured — identity, sound, persona, lexicon, visual look, and song catalog — then synthesized into actionable outputs for music generation, lyrics writing, and visual creation.

### Six DNA Sections (Tabs)

#### Identity
- **Stage Name & Real Name**
- **Ethnicity** — specific cultural background
- **City, State, Neighborhood** — precise geographic origin
- **Backstory** — 3-4 sentence origin story (childhood, music entry, breakthrough)
- **Significant Events** — 5-7 real career milestones with years

#### Sound
- **Genre Cascade** — primary genres (2-4), subgenres (3-5), microgenres (1-2)
- **Genre Evolution** — for genre-fluid artists, tracks how sound changed over time per era (e.g., Beyoncé across 5 eras)
- **Vocal Textures** — 5 descriptive vocal qualities
- **Flow/Delivery Style** — rap flow or phrasing approach
- **Production Preferences** — 5-6 sonic elements and producer signatures
- **Key Collaborators** — 4-6 verified relationships
- **Artist Influences** — 5-6 documented predecessors
- **Melody Bias** — 0-100 slider (0 = pure rap → 100 = pure singing) with calibration anchors:
  - 0-10: Pure lyrical rapper (Pusha T)
  - 30-45: Rap-dominant, melodic elements (Drake ~40)
  - 50-60: True hybrid (Lauryn Hill ~55)
  - 80-90: Primarily singer (Beyoncé ~85)
  - 95-100: Pure singer (Adele ~98)
- **Language & Secondary Languages**
- **Sound Description** — 3-4 sentences painting sonic identity
- **Instruments** — preferred instruments
- **Rhyming DNA**:
  - Types: perfect, multi-syllable, slant, internal, compound, assonance
  - Patterns: AABB, ABAB, ABCB, ABBA, free, chain
  - Density: 0-100 (sparse to every line)

#### Persona
- **Traits** — 5-6 personality characteristics (tag input with AI suggestions)
- **Likes** — 4-5 genuine passions outside music
- **Dislikes** — 3-4 things they oppose
- **Attitude** — 6-10 word energy/demeanor encapsulation
- **Worldview** — 3-4 sentences about philosophy and recurring themes

#### Lexicon
- **Signature Phrases** — 4-6 real catchphrases (empty if none, never fabricated)
- **Slang** — 4-6 regional terms and invented words
- **Banned Words** — words to avoid in output
- **Ad-Libs** — actual vocal ad-libs unique to the artist (empty if not known for them)

#### Look (4 Sub-Tabs)
1. **Profile** — text fields: skin tone, hair, fashion, wardrobe style, jewelry, tattoos, visual description
2. **Character Sheet** — generates full-body multi-panel reference sheet (front/side/back views) via Replicate nano-banana. Supports "wardrobe wildcard" categories for random outfit generation.
3. **Photo Shoot** — generates lifestyle portrait shots in batches (x3 or x5)
4. **Gallery** — collection of all generated/uploaded images. Filter by type (character-sheet, portrait, photo-shoot, chat-photo). Download, fullscreen, delete.

#### Catalog (Genome System)
Users add existing songs with lyrics. System analyzes each song and synthesizes a **Genome** — a compressed understanding of the artist's writing DNA.

- **Song Analysis** (auto-triggered when lyrics added):
  - Themes, mood progression, rhyme schemes, storytelling approach, vocabulary level
  - Notable devices (wordplay, metaphor), recurring imagery
  - Verse attribution map, emotional intensity (1-10)

- **Catalog Genome** (synthesized from all analyzed songs):
  - **Signatures** (80%+ frequency) — traits appearing in most songs
  - **Tendencies** (40-79%) — common patterns
  - **Experiments** (<40%) — rare/new territory
  - **Essence Statement** — 2-3 paragraph "ghostwriter instructions"
  - **Blueprint** — must include, should include, avoid repeating, suggest exploring

### Seed from Real Artist
1. User enters artist name (e.g., "Kendrick Lamar")
2. **Pass 1** (GPT-4.1): generates initial profile with honest gaps ("unknown" not guesses)
3. **Pass 2** (Perplexity Sonar Pro): fact-checks and fills gaps via web search
4. Result: populated ArtistDNA with `lowConfidenceFields` flagging uncertain fields
5. User verifies and tweaks in editor
6. **Cost: 25 pts**

### AI Suggestion System
- Magic wand (✨) icon on text fields
- Fetches 10 context-aware suggestions via OpenRouter gpt-4.1-mini
- Suggestions cached per field, individually consumable or dismissable

### Constellation 3D Widget
- Three.js visualization at top of editor
- Central glowing star (artist identity) + 5 orbital rings (Sound, Influences, Persona, Lexicon, Profile)
- Ring fill % reflects completed fields
- Ring glow intensity reflects data richness
- Clicking a ring switches to that tab
- StarField background adapts to genre aesthetic

### Personality Print
- Deep 13-dimension psychological analysis generated from DNA
- Covers: speech, rhetoric, emotional expression, cognitive style, knowledge, conversation style, thematic recurrence, nonverbal cues, ethics, creativity, motivation, self-perception, collaboration
- Generated async after artist save (non-blocking)
- Cached in `artist_personality_prints` table

### API Endpoints

| Endpoint | Purpose | Cost |
|----------|---------|------|
| `/api/artist-dna/seed-from-artist` | 2-pass seeding (GPT-4.1 + Perplexity) | 25 pts |
| `/api/artist-dna/suggest` | Context-aware field suggestions | Free |
| `/api/artist-dna/suggest-concepts` | Song concept ideas | Free |
| `/api/artist-dna/analyze-song` | Song lyrics analysis | Free |
| `/api/artist-dna/analyze-lyrics` | Section detection for import | Free |
| `/api/artist-dna/calculate-genome` | Genome synthesis | Free |
| `/api/artist-dna/generate-mix` | Suno prompt generation | Free |
| `/api/artist-dna/generate-header-bg` | Atmospheric environment image | 10 pts |
| `/api/artist-dna/generate-portrait` | Artist headshot | 10 pts |
| `/api/artist-dna/generate-character-sheet` | Multi-panel reference sheet | pts |
| `/api/artist-dna/generate-photo-shoot` | Lifestyle portrait batch | pts |
| `/api/artist-dna/generate-personality-print` | Deep personality profile | Free |
| `/api/artist-dna/revise-section` | AI revises a DNA section | pts |
| `/api/artist-dna/judge-drafts` | Compare draft versions | pts |
| `/api/artist-dna/generate-options` | Generate alternatives for a field | pts |
| `/api/artist-dna/generate-full-song` | Complete song from DNA | pts |

### Data Storage
- **Database:** Supabase `artist_profiles` table (id, user_id, name, dna JSONB, timestamps)
- **Images:** Supabase Storage (`directors-palette` bucket)
- **State:** Zustand with localStorage persistence (editor state, draft, active tab)
- **Backward compat:** auto-migrates old `name` → `stageName`, `region` → `state`

---

## 2. Artist Chat

### What It Is
A real-time iMessage-style chat where users have natural conversations with their AI artists. The artist responds in character with their full personality, maintains persistent memory across sessions, and can generate photos, share web research, suggest music work, and build a genuine ongoing relationship.

### Core Chat Features

#### Messaging
- Send text messages to AI artists
- **Streaming responses** — character-by-character rendering via Server-Sent Events (SSE)
- **Message types:** text, lyrics, photos, actions (music work suggestions), web shares, system messages
- All messages saved to Supabase with timestamps

#### Photo Generation (5 pts each)
- Artist can suggest `[PHOTO:selfie description]` or user clicks camera button
- Uses Nano Banana 2 via Replicate API
- Combines artist DNA (skin tone, hair, fashion), living context (environment, clothing, vibe), and phone style
- Reference images used for consistency (portrait or character sheet URL)
- Phone quality varies: grainy lo-fi vs professional based on phone profile

#### Reactions
- Hover over artist messages → thumbs up/down buttons
- Reactions build taste profile
- Thumbs-up content auto-populates Inspiration Feed

#### Inspiration Feed
- Accessed via sparkles icon in chat header
- Shows all thumbs-up content: lyrics, concepts, articles, photos, beats
- Filter by category

#### Action Links (Music Workflow Triggers)
- `start-song` — create new song
- `work-on-hook` — refine hook
- `check-beat` — listen to beat
- `view-lyrics` — display lyrics
- Styled as amber-highlighted clickable buttons

### AI Personality System

#### Living Context (Real-Time Awareness)
The artist has dynamic moment-to-moment state that refreshes each session:
- **Time awareness:** current time, day, date, season, holidays
- **Activity:** what they're doing (in studio, at party, commuting)
- **Mood:** current emotional state
- **Location:** geographic + venue-specific
- **Social:** who they're with (entourage members)
- **Environment:** setting vibe, current outfit
- **Phone profile:** device model, photo style, social media habits
- **Status line:** appears in header (e.g., "🎵 working on beat · home studio")
- Refreshable manually or auto on chat open

#### 13-Dimension Personality Print
Drives how the artist talks and acts:

1. **Speech** — tone, pace, formality, slang level (0-100), cursing level, vocabulary, typing style, emoji usage
2. **Rhetoric** — debate style, persuasion tactics, evidence preferences
3. **Emotional** — expressiveness (0-100), primary emotions, humor style + subjects
4. **Cognitive** — analytical strategy, focus areas, problem-solving approach
5. **Knowledge** — expertise areas, cultural references, frequency
6. **Conversation Style** — topic preferences, music talk ratio (0-100), small talk ability, tangent style, energy, deep convo triggers
7. **Thematic** — common themes, repeated motifs, metaphor types, imagery
8. **Non-Verbal** — typing style, emoji usage, response speed, listening style
9. **Ethics** — moral beliefs, decision drivers
10. **Creativity** — problem-solving style, communication style
11. **Motivation** — primary drivers, impact on decisions
12. **Self-Perception** — how they see themselves
13. **Collaboration** — opinion strength (0-100), feedback response, conflict style

### Memory System (Persistent Across Sessions)

The artist builds memory organized into 5 categories:

#### 1. About You (User Knowledge)
- Name, preferences, music taste, personal details, work style, pet peeves

#### 2. Sessions (Chat History Summaries)
- Date, summary, outcome, mood, key decisions, unresolved ideas
- Capped at 50 sessions (oldest dropped)

#### 3. Relationship State
- **Rapport level** (0-100) — grows through positive interactions
- **Trust** (0-100) — how vulnerable/open they are with you
- **Inside jokes** — shared references and recurring humor
- **Shared references** — callbacks and context
- **Conflict history** — past disagreements

#### 4. Self-Reflections
- Artist's growth notes, current obsessions, frustrations, goals

#### 5. Facts
- Unstructured facts with importance scores (0-10)
- Source tagged with date
- Capped at 100 facts (sorted by importance)

#### Memory Extraction
- **Trigger:** on chat close or idle timeout
- **Tech:** GPT-4.1-mini analyzes recent messages
- **Extracts:** new facts, user profile updates, session summary, rapport/trust changes (-5 to +5 per conversation), self-reflections
- **Non-blocking:** fires in background after chat close

### Web Research
- Perplexity Sonar via OpenRouter
- Smart filtering using artist expertise and topic preferences
- Returns 3-5 curated results with title, URL, summary, domain

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/artist-chat/message` | GET | Load chat history |
| `/api/artist-chat/message` | POST | Send message, get streaming response (SSE) |
| `/api/artist-chat/generate-photo` | POST | Generate artist selfie (5 pts) |
| `/api/artist-chat/generate-status` | POST | Generate living context |
| `/api/artist-chat/update-memory` | POST | Extract & save memory |
| `/api/artist-chat/react` | POST | Save thumbs up/down |
| `/api/artist-chat/web-research` | POST | Research a topic |
| `/api/artist-chat/personality-print` | GET | Fetch cached personality print |

### Data Storage
- **Tables:** `artist_personality_prints`, `artist_chat_messages`, `artist_memories`
- **Message fields:** id, artist_id, user_id, role, content, message_type, photo_url, action_data, web_share_data, reaction, created_at
- **Memory:** upsert per artist/user pair (UNIQUE constraint)

---

## 3. Writing Studio

### What It Is
A full lyrics writing workspace where users compose songs section by section with deep AI assistance. The AI writes in the artist's voice using their complete DNA profile, judges drafts like the artist would, and helps iterate until every bar feels authentic.

### Song Structure & Section Management

#### 5 Section Types
- **Intro** (2-8 bars, default 4) — sets scene, establishes mood
- **Verse** (8-32 bars, default 20) — storytelling, vivid detail, narrative progression
- **Hook** (4-12 bars, default 8) — catchy, memorable, repeatable
- **Bridge** (2-8 bars, default 4) — shift perspective, build tension
- **Outro** (2-8 bars, default 4) — wrap up, lasting impression

#### Section Picker
- Add sections via dropdown (any type, any order)
- Reorder with up/down buttons
- Remove, lock/unlock sections
- Color-coded badges: intro=blue, verse=green, hook=amber, bridge=cyan, outro=rose
- Locked sections show green checkmark; sections with selected drafts show amber dot

### Tone Controls (Per Section)

| Control | Options |
|---------|---------|
| **Emotion** (12) | Defiant, Hungry, Triumphant, Vulnerable, Reflective, Playful, Menacing, Nostalgic, Euphoric, Melancholic, Confident, Desperate |
| **Energy** (0-100) | Chill (0-25), Moderate (26-50), Hype (51-75), Explosive (76-100) |
| **Delivery** (8) | Raw, Polished, Aggressive, Smooth, Conversational, Theatrical, Intimate, Anthemic |
| **Bar Count** | Per-section slider with type-specific ranges |

### Draft Generation Flow: Generate → Judge → Keep/Chop/Revise

#### 1. Generate (1 pt)
- Produces **4 draft options** (A, B, C, D) per section
- Uses full Artist DNA: identity, sound profile, persona, lexicon, catalog genome
- Considers previous locked sections for continuity
- Respects rhyming DNA preferences
- Bans AI-sounding phrases (neon, echoes, shadows, ethereal, tapestry, etc.)

#### 2. Auto-Judge (1 pt)
Automatically scores all 4 drafts:

| Field | Description |
|-------|-------------|
| **Vibe** | 1-2 sentence gut reaction in artist's voice |
| **Score** | 1-10 overall quality |
| **Rhyme Score** | 1-10 rhyme style match |
| **Line Notes** | Line-by-line feedback with suggestions |
| **Would Keep** | Whether the artist would actually record this |
| **Ranking** | Best to worst with reasoning |

**UI feedback:** color-coded scores (green ≥7, amber ≥4, red <4), artist vibe quotes, line notes under each line, gold star for "Would Keep"

#### 3. Draft Actions
- **Keep** → locks section, adds to Lyrics Preview
- **Edit** → inline textarea editor
- **Revise** (0.5 pt) → rewrite with user feedback + judgment notes
- **Chop** → select individual lines or entire draft → tag (Metaphor, Punchline, Imagery, Wordplay) → send to Idea Bank
- **Toss** → discard

### Idea Bank
- Per-artist storage (persisted to localStorage)
- Sources: chopped from drafts or manually typed
- Tags: Metaphor, Punchline, Imagery, Wordplay
- Filter by tag, copy to clipboard, delete
- Left sidebar drawer with collapsed preview

### Import Lyrics
1. **Paste** raw lyrics into textarea
2. **AI Detection** — `/api/artist-dna/analyze-lyrics` detects sections (verse/hook/bridge/outro)
3. **Manual Edit** — relabel sections, merge, split at any line
4. **Load** into studio — clears existing sections, imports detected ones

### Full Song Generation (1 pt)
- **3 preset structures:** Standard, Simple, Extended
- **Manual builder:** drag-and-drop section reordering (dnd-kit), per-section bar count, optional direction notes
- **Global tone controls** (emotion, delivery, energy)
- Generates entire song at once (30-60 seconds)
- All sections locked immediately, editable/revisable individually after

### Concept Suggestions (Free)
- AI generates 6 casual, specific concepts in the artist's voice
- References backstory, life events, personality
- Avoids repeating existing catalog titles

### Lyrics Preview (Right Sidebar)
- Shows all locked sections with content
- Sequential numbering ("Verse 1", "Verse 2", "Hook")
- **Rhyme detection** — color-codes last word of each line if it rhymes with other lines
- Character count tracking (X / 3000 chars)
- Copy full lyrics to clipboard

### Suno Prompt Preview
- Auto-generates vocal/music generation prompt from concept + unique tone combinations + song structure
- Copy to clipboard for Suno

### API Endpoints

| Endpoint | Purpose | Cost |
|----------|---------|------|
| `/api/artist-dna/generate-options` | 4 draft options | 1 pt |
| `/api/artist-dna/judge-drafts` | Score & rank 4 drafts | 1 pt |
| `/api/artist-dna/revise-section` | Rewrite with feedback | 0.5 pt |
| `/api/artist-dna/generate-full-song` | Entire song at once | 1 pt |
| `/api/artist-dna/suggest-concepts` | 6 concept ideas | Free |
| `/api/artist-dna/analyze-lyrics` | Section detection for import | Free |

---

## 4. Sound Studio

### What It Is
A full-screen instrumental music workspace that enables users to build professional Suno AI-compatible prompts through a deep, multi-layered interface. Designed for crafting instrumental beats with fine-grained control over genre, production elements, mood, tempo, and instrumentation.

### Core Capabilities
- Build instrumental music prompts (negative tags prevent vocals)
- Multi-tier genre taxonomy navigation (genre → subgenre → microgenre)
- Fine-grained production control across 8 specialized sections
- AI-powered suggestions based on current settings
- Artist DNA integration — loads artist preferences as pre-populated selections
- Preset saving/loading for reusable sound templates
- Real-time prompt preview with character count tracking
- Full-screen 2-column layout (left: controls, right: sticky preview + assistant)

### Production Control Sections

#### 1. Genre Picker (3-tier hierarchy)
- **500+ genre nodes** across 3 tiers
- Primary genres → subgenres → microgenres
- Auto-prunes invalid children when parent changes
- Searchable at each tier

#### 2. BPM (Tempo)
- 40-200 BPM range with ON/OFF toggle
- 7 preset buttons (60, 80, 90, 100, 120, 140, 160)
- Color-coded: blue <70, emerald 70-100, amber 100-130, orange 130-160, red 160+

#### 3. Energy (0-100)
- very low (0-20), low (21-40), medium (41-60), high (61-80), very high (81-100)

#### 4. Mood Selector (67 moods)
- **Positive (21):** Uplifting, Euphoric, Joyful, Triumphant, Playful, Festive, Warm, Hopeful, Energetic, Confident, Empowering, Groovy, Funky, Sexy, Soulful, Rebellious, Defiant, Carefree, Majestic, Sensual, Victorious
- **Neutral (18):** Dreamy, Nostalgic, Mysterious, Intimate, Peaceful, Bittersweet, Ethereal, Meditative, Hypnotic, Atmospheric, Cinematic, Spacey, Contemplative, Chill, Wistful, Pensive, Surreal, Floating
- **Dark (20):** Haunting, Melancholic, Dark, Anxious, Aggressive, Intense, Menacing, Eerie, Brooding, Ominous, Gritty, Raw, Somber, Tense, Desperate, Paranoid, Chaotic, Vengeful, Nocturnal...
- Green thumbs-up badges show Artist DNA matches

#### 5. Drum Design (36 tags)
- Grouped: Kick (boomy, punchy, deep, 808, distorted, soft), Snare (crispy, snappy, rimshot, fat, clap, lo-fi), Hi-hats (rolling, trap, closed, open, shimmering), Patterns (boom-bap, half-time, four-on-the-floor, breakbeat, shuffled, double-time, brushed, one-drop, double bass)

#### 6. Groove Feel (15 tags)
- swung, laid-back, bouncy, syncopated, behind-the-beat, pocket-groove, tight-quantized, loose-feel, driving, dragging, polyrhythmic, stuttered, shuffle, dembow, bossa-nova

#### 7. Bass Style (13 tags)
- 808-sub-bass, reese-bass, slap-bass, walking-bass, Moog-bass, filtered-bass, wobble-bass, distorted-bass, deep-bass, plucked-bass, acid-bass, fingerstyle-bass, analog-synth-bass

#### 8. Synth Texture (14 tags)
- warm-pads, glassy, analog-warmth, chord-stabs, Rhodes-chords, FM-textures, lush-pads, detuned-synth, bright-keys, pluck-melody, arpeggiated-synth, gritty-keys, ambient-pads, filtered-pads

#### 9. Harmony Color (~20 tags)
- minor-key, major-key, jazz-chords, diminished-chords, suspended-chords, power-chords, ninth-chords, modal-harmony, pentatonic, chromatic, dissonant, sparse-harmony, thick-harmony, cinematic-harmony...

#### 10. Space/FX (~20 tags)
- dry, reverb, hall-reverb, plate-reverb, room-reverb, delay, echo, stereo-width, lo-fi-filter, lo-fi-tape, bitcrusher, vinyl-crackle, analog-warmth, sidechain, pumping...

#### 11. Ear Candy (~20 tags)
- bell-hits, cymbal-crashes, vocal-chops, horn-stabs, string-riser, ascending-riser, noise-riser, tom-rolls, filtered-sweep, reverse-cymbal, filter-sweep, resonance-peak, shimmer...

#### 12. Structure (single select)
- Intro + Verse + Chorus + Bridge + Outro, Verse + Chorus Loop, Ambient Pad, Lofi Sample, Breakbeat Break, Industrial Loop, etc.

#### 13. Instrument Palette (100+ instruments)
- 6 categories: Keyboards, Strings, Drums & Percussion, Brass & Wind, Electronic, Synths
- Searchable with category tabs
- Artist DNA integration with green thumbs-up on preferred instruments

#### 14. Negative Tags
- Pre-populated: "no vocals", "no singing", "no humming", "no choir", "no spoken words"
- User can add custom negative tags
- Red-colored pills

### Suno Prompt Building
Assembles comma-separated text in order:
1. Genres → Subgenres → Microgenres
2. Era, Moods, Energy Label
3. BPM, Key
4. Drum Design → Groove Feel → Bass Style → Synth Texture → Harmony Color → Space/FX → Ear Candy
5. Structure, Instruments, Production Tags
6. Negative Tags (always at end)

**Hard limit:** 1,000 characters (truncates if exceeds)

### AI Sound Assistant
- Chat interface in right sidebar
- Uses OpenRouter gpt-4.1-mini
- Suggests changes to specific sections
- References Artist DNA if available
- Example: "Suggest instruments for a dark trap beat" → section-specific recommendations

### Natural Language → Settings
- Endpoint: `/api/sound-studio/build-prompt`
- User describes desired sound in plain English
- AI converts to full settings JSON

### Artist DNA Integration
- Select artist from dropdown → auto-populates: genres, subgenres, microgenres, production tags, instruments
- **Green thumbs-up badges** (fuzzy matching) show which tags match the artist's preferences across all panels
- `useArtistFit` hook normalizes and matches strings

### Preset System
- Save current settings as named presets
- Stored in Supabase `sound_studio_presets` table
- Load presets to restore all settings
- Optional artist context linking

### Key Design Notes
- Sound Studio builds prompts but does **NOT** generate audio
- Output is copied to clipboard for use in Suno
- Fully responsive: single column on mobile, 2-column on desktop
- Zustand store with localStorage persistence

---

## 5. Artist Deletion

### Current Status: Already Implemented

Artist deletion is fully functional end-to-end:

#### Backend
- **Service:** `artistDnaService.deleteArtist(id, userId)` — deletes from Supabase `artist_profiles` table with user ownership check
- **Store:** `deleteArtist(id)` action removes from local state, clears `activeArtistId` if deleting the active artist

#### Frontend
- **ArtistCard** — hover reveals red trash icon (ghost button, appears on hover with opacity transition)
- **ArtistList** — clicking trash sets `deleteTarget`, opens AlertDialog confirmation
- **Confirmation Dialog** — "Delete Artist" title, "This will permanently delete this artist profile. This action cannot be undone." message
- **Actions:** Cancel or Delete (red destructive button)

#### What Gets Deleted
- The `artist_profiles` row (including all DNA data stored as JSONB)
- Artist is removed from the in-memory store immediately

#### What Does NOT Get Deleted (Potential Gap)
The current delete does **not** cascade to:
- `artist_chat_messages` — chat history remains orphaned
- `artist_memories` — persistent memory remains orphaned
- `artist_personality_prints` — personality print remains orphaned
- `sound_studio_presets` — presets linked to artist remain
- **Supabase Storage images** — portraits, character sheets, photo shoot images, header backgrounds remain in storage

#### Recommendations
1. **Cascade deletes** — add cleanup for chat messages, memories, personality prints, and presets when an artist is deleted
2. **Storage cleanup** — delete associated images from Supabase Storage bucket
3. **Bulk delete** — add multi-select + batch delete for managing many artists
4. **Delete from editor** — add a delete button inside the artist editor (currently only available from the card list view)

---

## Architecture Summary

| Component | Store | Service | Types | API Routes |
|-----------|-------|---------|-------|------------|
| Artist Lab | `artist-dna.store.ts` | `artist-dna.service.ts` | `artist-dna.types.ts` | 16 endpoints under `/api/artist-dna/` |
| Artist Chat | `artist-chat.store.ts` | `artist-chat.service.ts`, `artist-memory.service.ts` | `artist-chat.types.ts`, `artist-memory.types.ts`, `living-context.types.ts`, `personality-print.types.ts` | 7 endpoints under `/api/artist-chat/` |
| Writing Studio | `writing-studio.store.ts` | (uses artist-dna APIs) | `writing-studio.types.ts` | Shares `/api/artist-dna/` endpoints |
| Sound Studio | `sound-studio.store.ts` | `sound-studio.service.ts` | (inline in store) | 2 endpoints under `/api/sound-studio/` |

### Shared Foundation
All four features share the **Artist DNA** as their foundation:
- **Artist Lab** creates and manages the DNA
- **Artist Chat** uses DNA for personality, living context, and photo generation
- **Writing Studio** uses DNA for lyrics generation, judging, and revision
- **Sound Studio** uses DNA for genre, instrument, and mood pre-population

### Database Tables
- `artist_profiles` — core artist data (DNA as JSONB)
- `artist_personality_prints` — cached personality analysis
- `artist_chat_messages` — chat history
- `artist_memories` — persistent relationship memory
- `sound_studio_presets` — saved sound configurations

### Cost Summary

| Operation | Cost |
|-----------|------|
| Seed from real artist | 25 pts |
| Generate portrait | 10 pts |
| Generate header background | 10 pts |
| Chat photo | 5 pts |
| Generate 4 draft options | 1 pt |
| Judge 4 drafts | 1 pt |
| Revise section | 0.5 pt |
| Generate full song | 1 pt |
| Suggest concepts | Free |
| Song analysis | Free |
| Genome calculation | Free |
| Lyrics section detection | Free |
| Sound Studio suggestions | Free |
| Memory extraction | Free |
