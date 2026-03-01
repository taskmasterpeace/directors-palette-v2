# Artist Chat, Living Artists & Sound Studio — Design

**Date:** 2026-03-01
**Status:** Approved

---

## Overview

Two interconnected features that transform artists from static profiles into living collaborators:

1. **Artist Chat & Living Artist System** — iMessage-style messaging with AI artists who have deep personalities, time awareness, memory, and the ability to send photos from their "life"
2. **Sound Studio** — Dedicated instrumental music workspace with visual controls + LLM assistant, connectable to artist profiles or standalone

---

## Feature 1: The Personality Print

### Purpose

Artist DNA captures **what** an artist is (identity, sound, persona, lexicon, look, catalog). The Personality Print captures **who** they are as a person — how they think, talk, argue, joke, and make decisions.

### Generation

When an artist's DNA is saved/updated, an LLM call reads the full DNA (persona, lexicon, identity, catalog genome) and generates a complete Personality Print. Stored as JSON alongside the DNA.

### Structure

```typescript
interface PersonalityPrint {
  // SPEECH & COMMUNICATION
  speech: {
    tone: string                    // "laid-back with sudden intensity"
    pace: string                    // "rapid-fire when excited, slow drawl normally"
    formality: string               // "casual, drops into street vernacular"
    slangLevel: number              // 0-100
    cursingLevel: number            // 0-100
    vocabularyLevel: string         // "expansive but deliberately simple"
    specialCharacteristics: string[] // "starts sentences with 'yo look'"
    emphasisTactics: string[]       // "repetition", "dramatic pauses"
    sentenceComplexity: string      // "short punchy fragments"
    questionStyle: string           // "rhetorical", "confrontational"
  }

  // ARGUMENTATION & RHETORIC
  rhetoric: {
    debateStyle: string             // "passionate and emotional"
    strategy: string                // "appeals to experience"
    persuasionTactics: string[]     // "storytelling", "peer pressure"
    evidenceTypes: string[]         // "personal anecdotes", "cultural references"
  }

  // EMOTIONAL & HUMOR
  emotional: {
    expressiveness: number          // 0-100
    primaryEmotions: string[]       // "pride", "restlessness"
    humorStyle: string              // "self-deprecating", "dark", "absurdist"
    humorSubjects: string[]         // "industry politics", "growing up broke"
  }

  // COGNITIVE STYLE
  cognitive: {
    analyticalStrategy: string      // "intuitive gut-feel"
    focusAreas: string[]            // "melody first", "vibe first"
    problemSolving: string          // "try everything fast"
    oppositionEval: string          // "dismissive", "considers all angles"
  }

  // KNOWLEDGE & CULTURE
  knowledge: {
    expertise: string[]             // "90s hip hop history", "jazz theory"
    otherKnowledge: string[]        // "basketball", "fashion", "philosophy"
    culturalRefTypes: string[]      // "movies", "sports", "memes"
    culturalRefFrequency: string    // "constant", "occasional"
  }

  // CONVERSATION PREFERENCES
  conversationStyle: {
    topicPreferences: string[]      // "music production", "sneakers", "philosophy", "sports"
    musicTalkRatio: number          // 0-100 (0=never about music, 100=only music)
    smallTalkAbility: string        // "hates it", "natural", "only with people they trust"
    tangentStyle: string            // "stays focused", "goes on long tangents", "circles back"
    initiatesTopics: boolean        // do they bring up non-music topics naturally?
    conversationEnergy: string      // "matches your energy", "always hyped", "chill and low-key"
    deepConvoTriggers: string[]     // "ask about childhood", "mention legacy", "bring up failures"
  }

  // THEMATIC LANGUAGE
  thematic: {
    commonThemes: string[]          // "redemption", "loyalty"
    repeatedMotifs: string[]        // "fire imagery", "nighttime"
    metaphorTypes: string[]         // "nature", "warfare", "religious"
    imagery: string[]               // "dark urban landscapes", "celestial"
  }

  // NON-VERBAL (drives chat UI behavior)
  nonVerbal: {
    typingStyle: string             // "rapid short messages", "long paragraphs"
    emojiUsage: string              // "never", "fire emojis only", "heavy"
    responseSpeed: string           // "instant", "takes a minute to think", "leaves you on read sometimes"
    listeningStyle: string          // "interrupts with ideas", "quiet until you finish"
  }

  // ETHICS & SELF
  ethics: {
    moralBeliefs: string[]          // "loyalty above all", "art should be honest"
    influences: string[]            // "grew up in church", "street code"
    decisionDrivers: string[]       // "gut instinct", "what serves the art"
  }

  creativity: {
    problemSolvingStyle: string     // "break rules", "remix what exists"
    communicationStyle: string      // "vivid storytelling", "abstract concepts"
  }

  motivation: {
    primaryDrivers: string[]        // "legacy", "proving doubters wrong"
    impactOnDecisions: string       // "sacrifices commercial for authenticity"
  }

  selfPerception: {
    selfView: string                // "underrated genius", "student of the game"
    impactOnActions: string         // "takes big swings"
  }

  // COLLABORATION STYLE (drives pushback behavior)
  collaborationStyle: {
    opinionStrength: number         // 0-100 (how hard they fight for ideas)
    feedbackResponse: string        // "defensive then reflective"
    conflictStyle: string           // "debates passionately", "shuts down"
  }
}
```

### Conversation Preferences

Artists have distinct conversation personalities beyond music:

- **The all-business type** — `musicTalkRatio: 90`, only wants to talk about the craft, gets impatient with tangents
- **The philosopher** — `topicPreferences: ["philosophy", "spirituality", "society"]`, goes deep on meaning and purpose
- **The culture junkie** — `topicPreferences: ["sneakers", "sports", "fashion", "memes"]`, talks about everything happening in the world
- **The introvert** — `smallTalkAbility: "hates it"`, only opens up after trust is built, `deepConvoTriggers: ["ask about childhood"]`
- **The storyteller** — constant tangents, every question becomes a 5-minute story from their life

The `conversationStyle` section is generated from the artist's persona traits, interests, and cultural background.

---

## Feature 2: The Living Artist Engine

### Living Context

Generated every time you open the chat. An LLM snapshot of "what is this artist doing right now?"

```typescript
interface LivingContext {
  // TIME AWARENESS
  currentTime: string
  dayOfWeek: string
  date: string
  season: string
  holiday: string | null
  timeOfDay: string            // "late night", "early morning"

  // INFERRED ACTIVITY
  currentActivity: string      // "In the studio with Mike, been here since 10"
  currentMood: string          // "locked in, creative energy flowing"
  currentLocation: string      // "home studio, Inglewood"
  whoTheyreWith: string[]      // ["engineer Mike", "homie Trav"]

  // ENVIRONMENT (feeds image generation)
  environment: {
    setting: string            // "dimly lit studio, monitors glowing"
    vibe: string               // "beats playing low, smoke in the air"
    clothing: string           // "oversized hoodie, chains on"
  }

  // PHONE & PHOTO BEHAVIOR
  phone: {
    model: string              // "iPhone 16 Pro Max", "cracked iPhone 13"
    caseStyle: string          // "clear case", "Louis Vuitton"
    photoStyle: string         // "grainy close-ups", "wide angle flex shots"
    socialHabits: string       // "always on IG stories", "phone on DND"
  }

  // STATUS BAR
  statusLine: string           // "Studio — Inglewood, CA . Fri 2:47 AM"
  statusEmoji: string
  activityDescription: string  // "Locked in, third session tonight"
}
```

### Social Circle

```typescript
interface ArtistSocialCircle {
  entourage: {
    name: string               // "Mike"
    role: string               // "engineer", "day-one homie"
    appearance: string         // brief description for image gen
    frequency: string          // "always around", "weekends only"
  }[]
  hangoutSpots: string[]       // "Nobu", "the block", "home studio"
  transportation: string       // "black Escalade", "Uber everywhere"
}
```

### Status generation flow

1. User opens artist chat
2. System grabs current datetime + artist DNA (city, persona, lifestyle, look)
3. LLM call: *"Given this artist's identity, persona, and location, what would they be doing at [time] on [date]? Be specific."*
4. Response becomes the Living Context, injected into chat system prompt
5. Status refreshes if user returns hours later or on a new day

---

## Feature 3: Artist Memory

### Purpose

Artists remember past conversations, your preferences, unfinished ideas, and the relationship you've built. One conversation thread per artist, persistent memory across all sessions.

### Structure

```typescript
interface ArtistMemory {
  // ABOUT THE USER
  aboutUser: {
    name: string | null
    preferences: string[]           // "hates autotune", "loves 808 slides"
    musicTaste: string[]            // "into dark melodies"
    personalDetails: string[]       // "going through a breakup"
    workStyle: string[]             // "likes to work late", "scraps a lot"
    petPeeves: string[]             // "don't repeat the same flow"
  }

  // CREATIVE HISTORY
  sessions: {
    id: string
    date: string
    summary: string                 // "Worked on dark trap hook about trust"
    outcome: string                 // "kept the hook, scrapped 2 verses"
    moodOfSession: string
    keyDecisions: string[]
    unresolvedIdeas: string[]       // "bridge concept we never finished"
  }[]

  // RELATIONSHIP
  relationship: {
    rapportLevel: number            // 0-100, grows over time
    insideJokes: string[]
    sharedReferences: string[]      // "the Drake debate"
    conflictHistory: string[]
    trust: number                   // affects vulnerability in conversation
  }

  // SELF-REFLECTIONS
  selfReflections: {
    growthNotes: string[]           // "experimenting more with melodies"
    currentObsessions: string[]
    frustrations: string[]
    goals: string[]
  }[]

  // RAW FACTS
  facts: {
    content: string
    source: string                  // "chat on 2/28"
    importance: number              // 0-10
  }[]
}
```

### Memory lifecycle

- **After each conversation**: lightweight LLM call extracts meaningful info from transcript + updates memory. Only stores genuinely important things.
- **During conversation**: relevant memories pulled into system prompt (last 3-5 sessions, user preferences, high-importance facts, unresolved ideas)
- **Organic recall**: artist naturally references past sessions, inside jokes, unfinished ideas
- **Rapport growth**: early conversations are more formal, later ones feel like old friends. Trust unlocks deeper conversation.

### Storage

- Supabase table: `artist_memories` — `artist_id, user_id, memory_json, updated_at`
- Cap: ~50 session summaries (rolling), ~100 facts (lowest importance drops first)

---

## Feature 4: Chat UI

### Layout

iMessage-style dark interface. One thread per artist.

**Header bar:**
```
┌─────────────────────────────────────────────────┐
│  <- Back              KING VEGA            ...  │
│  green-dot Studio - Inglewood, CA . Fri 2:47 AM │
│  "Locked in with Mike, third session tonight"   │
└─────────────────────────────────────────────────┘
```

Status bar shows: online indicator, location, time, activity one-liner.

### Message types

| Type | Display | Example |
|------|---------|---------|
| **Text** | Chat bubbles, styled by personality (short bursts vs paragraphs) | "Yo what's good" |
| **Lyrics** | Monospace, accent border, indented | "trust is a currency / spent it all on you" |
| **Photo** | Image bubble, generated via Nano Banana 2 | Studio selfie, yacht party pic |
| **Action Link** | Tappable button in chat | "Work on this hook", "Start a new song", "Check this beat" |

### Photo system

**Triggers:**
- User asks "what you up to?" -> artist describes + optionally sends a pic
- Artist excited about something -> "hold on let me show you" -> image generates
- User says "prove it" / "let me see" -> photo
- Certain times of day trigger naturally (sunset, studio late night)

**Generation flow:**
1. Build prompt from: Character sheet (Look DNA) + wardrobe (current clothing from Living Context) + environment + photo style (from phone personality)
2. Call Nano Banana 2 with assembled prompt + character reference image
3. Image appears as photo message in chat
4. Auto-saves to artist's Gallery (`ArtistGalleryItem[]`) with metadata: type, caption, context, date, source

**Photo variety driven by personality:**
- Flexer: wide-angle shots, jewelry, cars, views
- Introvert: dark, grainy, close-up
- With entourage: group shots, candid moments
- Phone quality matters: cracked iPhone 13 = grainier; iPhone 16 Pro = crisp

### Action links (chat-to-app bridge)

| Action | Destination | Behavior |
|--------|-------------|----------|
| "Work on this hook" | Writing Studio | Pre-loads hook in active section |
| "Start a new song" | Writing Studio | Sets concept from chat context |
| "Check this beat" | Sound Studio | Pre-configures the instrumental idea |
| "Look at these lyrics" | Quick-view modal | Shows full lyrics from past session |

When transitioning to Writing Studio, a banner shows: *"Continuing from chat — King Vega suggested this hook"*

---

## Feature 5: Sound Studio

### Purpose

Dedicated workspace for building instrumental music (no vocals). Visual controls + LLM assistant. Can enter from an artist profile (pre-loaded with their sound DNA) or standalone (blank canvas).

### Genre Taxonomy

Three-tier picker: **Genre > Subgenre > Micro-genre**

500+ Suno-compatible tags organized hierarchically:

| Genre | Example Subgenres | Example Micro-genres |
|-------|-------------------|---------------------|
| Hip Hop | Trap, Boom Bap, Lo-fi Hip Hop | Dark Trap, Cloud Rap, Jazz Rap |
| Electronic | House, Techno, Ambient | Deep House, Dub Techno, Chillwave |
| R&B | Neo-Soul, Alternative R&B | PBR&B, Quiet Storm, Trapsoul |
| Rock | Indie Rock, Psychedelic | Shoegaze, Post-Rock, Math Rock |
| Jazz | Smooth Jazz, Bebop | Modal Jazz, Nu Jazz, Dark Jazz |
| Pop | Synth-pop, Indie Pop | Dream Pop, City Pop, Hyperpop |

### Controls layout

```
┌──────────────────────────────────────────────────┐
│  SOUND STUDIO              Artist: King Vega ▼   │
├──────────────────────────────────────────────────┤
│                                                  │
│  GENRE          SUBGENRE        MICRO-GENRE      │
│  [Hip Hop ▼]    [Trap ▼]       [Dark Trap ▼]    │
│                                                  │
│  BPM  ──────●────────────  140                   │
│                                                  │
│  MOOD        ENERGY          ERA                 │
│  [Menacing]  [High ▼]       [2020s ▼]           │
│                                                  │
│  INSTRUMENTS                                     │
│  [808 Bass] [Hi-hats] [Eerie Synth Pads] [+]    │
│                                                  │
│  PRODUCTION                                      │
│  [Gritty] [Spacious Mix] [+]                     │
│                                                  │
├──────────────────────────────────────────────────┤
│  SUNO PROMPT (live preview)                      │
│  ┌────────────────────────────────────────────┐  │
│  │ hip hop, dark trap, 140 BPM, menacing,     │  │
│  │ 808 bass, crisp hi-hats, eerie synth pads, │  │
│  │ gritty production, high energy,             │  │
│  │ instrumental only, no vocals                │  │
│  └────────────────────────────────────────────┘  │
│                                   [Copy] [Send]  │
├──────────────────────────────────────────────────┤
│  SOUND ASSISTANT                                 │
│  ┌────────────────────────────────────────────┐  │
│  │ "Try adding some vinyl crackle for texture. │  │
│  │  Also, at 140 BPM you might want to        │  │
│  │  consider half-time hi-hats for that heavy  │  │
│  │  dark trap feel."                           │  │
│  └────────────────────────────────────────────┘  │
│  [Type or ask for suggestions...]                │
└──────────────────────────────────────────────────┘
```

### Sound Assistant (LLM)

A fast conversational assistant that:
- Suggests tweaks based on your selections ("with dark trap, try adding reverb-heavy snares")
- Refines the Suno prompt when you describe what you want
- Helps you discover sounds you don't know the words for ("I want that underwater-sounding thing" -> "That's a low-pass filter with long reverb tail")
- Uses a fast model (gpt-4.1-mini via OpenRouter) for snappy responses

### Artist mode vs standalone

| | Artist Mode | Standalone |
|---|---|---|
| Entry point | From artist profile or chat | Main nav / Sound Studio tab |
| Genre defaults | Pre-loaded from artist's sound DNA | Blank |
| Instrument defaults | Artist's production preferences | Blank |
| BPM defaults | Based on artist's typical tempo | 120 |
| Sound Assistant | Knows the artist's style, suggests within their range | Generic suggestions |

### Suno prompt construction

The prompt follows the proven formula:
```
[genre], [subgenre], [micro-genre modifier], [BPM] BPM,
[mood], [2-4 instruments], [production texture],
[energy direction], instrumental only, no vocals
```

Character limit: 200 chars (v4) / 1,000 chars (v4.5+). System enforces limits and warns.

### Negative tags

Automatically appended for instrumentals:
```
no vocals, no singing, no humming, no choir, no spoken words
```

---

## Feature 6: Writing Studio Enhancement

### Chat integration

The existing Writing Studio gets enhanced with artist personality:

- **When scrapping a draft**: instead of just deleting, the artist reacts. Quick-select options appear:
  - "Flow wasn't right"
  - "Too generic"
  - "Doesn't fit the vibe"
  - "Hook is weak"
  - "Not feeling the words"
- Artist responds in-character based on their `collaborationStyle.opinionStrength`:
  - High (80+): "Nah hold on, what specifically? That second bar was fire"
  - Medium (40-70): "Alright, I hear you. What direction you wanna go?"
  - Low (0-30): "Cool, I'll switch it up. How about this instead..."

### Idea proposals from artists

Artists proactively suggest song ideas based on:
- Unresolved ideas from memory
- Current mood / Living Context (holiday inspiration, late night vibes)
- Catalog genome patterns (what they haven't explored yet)
- Recent conversations (you mentioned a breakup -> heartbreak song concept)

These appear as action links in chat: *"I got an idea for something. Dark, introspective, about losing yourself in success. Wanna run with it?"*

---

## Technical Architecture

### New database tables

```sql
-- Personality prints
artist_personality_prints (
  id uuid PRIMARY KEY,
  artist_id uuid REFERENCES artist_profiles(id),
  user_id uuid,
  print_json jsonb NOT NULL,
  created_at timestamptz,
  updated_at timestamptz
)

-- Chat messages
artist_chat_messages (
  id uuid PRIMARY KEY,
  artist_id uuid REFERENCES artist_profiles(id),
  user_id uuid,
  role text NOT NULL,          -- 'user' | 'artist'
  content text NOT NULL,
  message_type text NOT NULL,  -- 'text' | 'lyrics' | 'photo' | 'action'
  photo_url text,
  action_data jsonb,           -- for action links
  created_at timestamptz
)

-- Artist memories
artist_memories (
  id uuid PRIMARY KEY,
  artist_id uuid REFERENCES artist_profiles(id),
  user_id uuid,
  memory_json jsonb NOT NULL,
  updated_at timestamptz
)

-- Sound Studio presets
sound_studio_presets (
  id uuid PRIMARY KEY,
  user_id uuid,
  artist_id uuid,              -- null for standalone
  name text NOT NULL,
  preset_json jsonb NOT NULL,  -- genre, bpm, mood, instruments, etc.
  suno_prompt text,
  created_at timestamptz
)
```

### New API routes

| Route | Purpose |
|-------|---------|
| `POST /api/artist-chat/message` | Send message, get artist response |
| `POST /api/artist-chat/generate-status` | Generate Living Context |
| `POST /api/artist-chat/generate-photo` | Generate photo via Nano Banana 2 |
| `POST /api/artist-chat/update-memory` | Extract + save memory after session |
| `POST /api/artist-dna/generate-personality-print` | Generate Personality Print from DNA |
| `POST /api/sound-studio/suggest` | Sound Assistant LLM suggestions |
| `POST /api/sound-studio/build-prompt` | Build/refine Suno prompt |

### New feature files

```
src/features/music-lab/
  types/
    personality-print.types.ts
    artist-chat.types.ts
    living-context.types.ts
    artist-memory.types.ts
    sound-studio.types.ts
  store/
    artist-chat.store.ts
    sound-studio.store.ts
  services/
    artist-chat.service.ts
    personality-print.service.ts
    living-context.service.ts
    artist-memory.service.ts
    sound-studio.service.ts
    suno-genre-taxonomy.ts
  components/
    artist-chat/
      ChatPage.tsx
      ChatHeader.tsx
      ChatMessageList.tsx
      ChatMessage.tsx
      ChatInput.tsx
      ChatPhotoMessage.tsx
      ChatActionLink.tsx
      ChatLyricsMessage.tsx
    sound-studio/
      SoundStudioPage.tsx
      GenrePicker.tsx
      InstrumentPalette.tsx
      MoodSelector.tsx
      BpmSlider.tsx
      SunoPromptPreview.tsx
      SoundAssistant.tsx
  data/
    suno-genres.data.ts        -- 500+ genre taxonomy
    instrument-tags.data.ts    -- instrument categories
    mood-tags.data.ts          -- mood descriptors
```

### LLM usage

| Call | Model | Purpose | When |
|------|-------|---------|------|
| Personality Print generation | gpt-4.1 | Deep personality from DNA | On artist save |
| Living Context | gpt-4.1-mini | Status + activity inference | On chat open |
| Chat responses | gpt-4.1 | Artist conversation | Every message |
| Photo prompt building | gpt-4.1-mini | Image prompt from context | On photo trigger |
| Memory extraction | gpt-4.1-mini | Post-session memory update | On chat close/idle |
| Sound Assistant | gpt-4.1-mini | Quick suggestions | On user input |

### Image generation

All photos use **Nano Banana 2** via Replicate:
- Character sheet / portrait as reference image for consistency
- Living Context provides clothing, environment, lighting
- Phone personality affects "quality" and style of the photo
- Photos auto-save to artist Gallery

---

## Navigation

Sound Studio and Artist Chat become new sub-tabs in Music Lab:

```
Music Lab
  ├── Artist Lab       (existing - create/edit artist DNA)
  ├── Artist Chat      (NEW - messaging with artists)
  ├── Writing Studio   (existing - enhanced with artist reactions)
  ├── Sound Studio     (NEW - instrumental beat building)
  └── Music Video      (existing - director-driven video treatments)
```

Artist Chat is accessible from:
- Music Lab sub-tab
- Quick-open from any artist card (anywhere in the app)
- Action links from Writing Studio ("Ask the artist about this")
