# Music Lab User Guide

> Director's Palette v0.95.0 — Artist Chat, Sound Studio & Writing Studio

---

## Overview

Music Lab is your creative hub for building virtual artists and producing music. It's organized into **5 tabs** across the top of the workspace:

| Tab | Icon | Purpose |
|-----|------|---------|
| **Artist Lab** | DNA helix | Create and edit virtual artist profiles |
| **Artist Chat** | Message bubble | Text conversations with your artists |
| **Writing Studio** | Pen | Collaborative songwriting with AI assistance |
| **Sound Studio** | Headphones | Build instrumental prompts for Suno |
| **Music Video** | Music note | Create music video treatments |

Click any tab to switch between sections. The active tab is highlighted in amber.

---

## 1. Artist Lab

Artist Lab is where you build your virtual artists from scratch or model them after real musicians.

### Getting Started

When you first open Artist Lab, you'll see two options:
- **Create New Artist** — Start with a blank slate and fill in every detail yourself
- **Start from Real Artist** — Use a real musician as inspiration, then customize from there

### Artist DNA Sections

Each artist has a full DNA profile organized into tabs:

- **Identity** — Stage name, real name, city, backstory, significant life events
- **Sound** — Genres, subgenres, vocal textures, flow style, production preferences, influences, melody bias (rap vs. singing slider)
- **Persona** — Personality traits, likes/dislikes, attitude, worldview
- **Lexicon** — Signature phrases, slang, banned words, ad-libs
- **Look** — Skin tone, hair, fashion, jewelry, tattoos, portrait, character sheet, photo gallery
- **Catalog** — Song entries with lyrics, mood, tempo. Includes catalog genome analysis that identifies your artist's signatures, tendencies, and writing patterns

### Tips
- Fill in as much DNA as you can — it makes Artist Chat and Writing Studio much more authentic
- The catalog genome analyzes all your songs to find patterns and build a writing blueprint
- Multiple artists can coexist. Switch between them from any tab that shows an artist dropdown

---

## 2. Artist Chat

Artist Chat lets you have text-message-style conversations with your virtual artists. They respond in character based on their DNA profile.

### No Artist Selected

If you haven't created or selected an artist yet, you'll see a prompt to either pick an existing artist or create one. The "Create Artist" button takes you directly to Artist Lab.

### Chatting with an Artist

Once an artist is active:

- **Message input** — Type at the bottom and press Enter (or tap Send) to send
- **Artist responses** — Appear as chat bubbles on the left with timestamps
- **Your messages** — Appear on the right in amber
- **Reactions** — Thumbs up/down on any artist message to train their personality
- **Camera button** — Request a selfie or photo from your artist
- **Back arrow** — Return to the artist picker

### Chat Header Features

- **Artist portrait** — Shows their profile image (or initials if none)
- **Status line** — Shows what the artist is currently doing (Living Context)
- **Refresh button** — Update the artist's current status/activity
- **Sparkles button** — Open the Inspiration Feed

### Living Context

Your artist has a simulated daily life. The context bar below the header shows:
- Time of day and day of week
- Current location
- What they're doing right now

Tap the activity line to expand details, tap again to collapse.

### Inspiration Feed

Hit the sparkles icon to open a saved collection of creative inspiration:
- **Lyrics** — Lyric fragments or hooks you've saved
- **Concepts** — Song ideas and themes
- **Articles** — Reference material
- **Photos** — Visual inspiration
- **Beats** — Sound references

Filter by type using the pill buttons at the top. Hover over any card to reveal the delete button.

---

## 3. Writing Studio

Writing Studio is where you write songs collaboratively with your artist and AI.

### Getting Started

You need an active artist to use Writing Studio. The artist context bar at the top lets you:
- Select or switch artists via dropdown
- Pick a track from the artist's catalog to work on

### The Studio

Once an artist is selected, the main writing area opens with:
- **StudioTab** — The primary writing workspace with AI-assisted songwriting tools
- **The Mix** — Collapsible section at the bottom showing the Suno prompt output generated from the current song

Click the "The Mix — Suno Prompt Output" header to expand or collapse the prompt preview.

---

## 4. Sound Studio

Sound Studio is an instrumental prompt builder for Suno. Use it to design beats, instrumentals, and soundscapes — no vocals.

### Header Controls

- **Artist dropdown** — Switch between your artists or use "Standalone Mode" for artist-independent work
- **Reset button** — Resets settings to defaults (or to the active artist's sound profile)

When an artist is selected, Sound Studio automatically seeds settings from their DNA (genres, production preferences, etc.).

### Genre Picker

Three-level genre selection:
1. **Genre** — Pick the main genre (Hip-Hop, R&B, Electronic, Pop, etc.)
2. **Subgenre** — Refines the genre (e.g., Trap, Lo-Fi, Drill)
3. **Microgenre** — Ultra-specific (e.g., Plugg, Hyperpop, Afrobeats Drill)

Each level is searchable — type to filter. Selecting a genre resets subgenre and microgenre. Selecting a subgenre resets microgenre.

### Tempo (BPM)

- **Slider** — Drag to set BPM anywhere from 40 to 200
- **Preset buttons** — Quick-set common tempos: 60, 80, 90, 100, 120, 140, 160
- **Color feedback** — The BPM number changes color based on tempo range:
  - Blue = slow (under 70)
  - Green = moderate (70-100)
  - Amber = medium (100-130)
  - Orange = uptempo (130-160)
  - Red = fast (160+)

### Mood Selector

Pick the emotional tone of your track. Moods are organized into three categories:

**Warm / Upbeat** (amber)
Uplifting, Euphoric, Joyful, Triumphant, Playful, Festive, Warm, Hopeful, Energetic, Confident, Empowering, Groovy, Funky, Sexy

**Reflective / Dreamy** (blue)
Dreamy, Nostalgic, Mysterious, Intimate, Peaceful, Bittersweet, Ethereal, Meditative, Hypnotic, Atmospheric, Cinematic, Spacey, Contemplative, Chill

**Dark / Intense** (rose)
Haunting, Melancholic, Dark, Anxious, Aggressive, Intense, Menacing, Eerie, Brooding, Ominous, Gritty, Raw, Somber, Tense

Click a mood to select it. Click again to deselect. One mood active at a time.

### Instrument Palette

Build your instrument stack:
- **Search** — Type to filter instruments by name
- **Category tabs** — Filter by type: All, Strings, Percussion, Synths, Woodwinds, Brass, etc.
- **Toggle instruments** — Click to add/remove (multiple selections allowed)
- **Selected instruments** — Show as amber pills at the top with X buttons to remove

### Production Tags

Add custom production descriptors:
- Type a tag (e.g., "lo-fi", "vinyl crackle", "reverb heavy") and press Enter
- Tags appear as rounded pills — click X to remove
- **Negative Tags** — Things to exclude from the prompt (e.g., "no autotune"). Shown in red. Default negative tags include: "no vocals, no singing, no humming, no choir, no spoken words"

### Suno Prompt Preview

Real-time preview of what gets sent to Suno:
- Updates automatically as you change any setting
- **Character count** — Green (under 500), Yellow (500-800), Red (over 800)
- **Copy button** — One-click copy to clipboard (shows checkmark confirmation)
- Negative tags displayed in a separate section below the main prompt

### Sound Assistant

AI chat assistant for sound design help:
- Ask for instrument suggestions, genre recommendations, or production tips
- Context-aware — knows your current settings and artist DNA
- Type a message and press Enter or click Send
- Clear conversation with the trash icon

**Example prompts:**
- "Suggest instruments for a dark trap beat"
- "What BPM works best for lo-fi hip-hop?"
- "Give me production tags for a cinematic orchestral piece"

---

## 5. Music Video

Music Video Treatment is the original Director's Palette feature for creating music video concepts.

### Workflow

1. **The Track** — Upload your audio file (MP3, WAV, M4A, AAC — max 50MB) via drag-and-drop
2. **The Lyrics** — Paste lyrics or let the system auto-transcribe from uploaded audio
3. **Director Selection** — Choose AI directors to create treatment concepts
4. **Shot Generation** — Generate cinematic shot-by-shot breakdowns

---

## Quick Start: Your First Session

1. Open **Artist Lab** and create your first artist (or start from a real one)
2. Fill in at least Identity, Sound, and Persona sections
3. Switch to **Artist Chat** and have a conversation — get to know your artist
4. Head to **Writing Studio** to write a song together
5. Open **Sound Studio** to build an instrumental — the artist's genres and preferences auto-populate
6. Copy the Suno prompt and generate your beat
7. Use **Music Video** to create a visual treatment for the finished track

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message (Chat), Add tag (Sound Studio) |
| `Shift + Enter` | New line in message |
| `Backspace` | Remove last production tag (when input is empty) |

---

*Built by Machine King Labs*
