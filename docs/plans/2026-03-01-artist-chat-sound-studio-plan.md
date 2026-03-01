# Artist Chat, Living Artists & Sound Studio — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform artists from static profiles into living AI collaborators with iMessage-style chat, personality, memory, photo sharing, web awareness, taste feedback, and a dedicated Sound Studio for instrumental music.

**Architecture:** New types, stores, services, API routes, and UI components within `src/features/music-lab/`. Two new sub-tabs (Artist Chat, Sound Studio) added to MusicLabHub. LLM calls via OpenRouter (gpt-4.1 for deep work, gpt-4.1-mini for fast work). Image generation via Nano Banana 2 (Replicate). Chat messages and memory persisted in Supabase. Personality Print generated from Artist DNA.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind CSS v4, Zustand (state), Supabase (DB), OpenRouter (LLM), Replicate/Nano Banana 2 (images)

**Design doc:** `docs/plans/2026-03-01-artist-chat-sound-studio-design.md`

---

## Phase 1: Foundation Types & Database

### Task 1: Personality Print Types

**Files:**
- Create: `src/features/music-lab/types/personality-print.types.ts`

**Step 1: Create the types file**

```typescript
/**
 * Personality Print Types
 * Deep personality profile generated from Artist DNA
 * Drives how artists talk, think, argue, joke, and collaborate
 */

export interface SpeechProfile {
  tone: string
  pace: string
  formality: string
  slangLevel: number        // 0-100
  cursingLevel: number      // 0-100
  vocabularyLevel: string
  specialCharacteristics: string[]
  emphasisTactics: string[]
  sentenceComplexity: string
  questionStyle: string
}

export interface RhetoricProfile {
  debateStyle: string
  strategy: string
  persuasionTactics: string[]
  evidenceTypes: string[]
}

export interface EmotionalProfile {
  expressiveness: number    // 0-100
  primaryEmotions: string[]
  humorStyle: string
  humorSubjects: string[]
}

export interface CognitiveProfile {
  analyticalStrategy: string
  focusAreas: string[]
  problemSolving: string
  oppositionEval: string
}

export interface KnowledgeProfile {
  expertise: string[]
  otherKnowledge: string[]
  culturalRefTypes: string[]
  culturalRefFrequency: string
}

export interface ConversationStyleProfile {
  topicPreferences: string[]
  musicTalkRatio: number    // 0-100
  smallTalkAbility: string
  tangentStyle: string
  initiatesTopics: boolean
  conversationEnergy: string
  deepConvoTriggers: string[]
}

export interface ThematicProfile {
  commonThemes: string[]
  repeatedMotifs: string[]
  metaphorTypes: string[]
  imagery: string[]
}

export interface NonVerbalProfile {
  typingStyle: string
  emojiUsage: string
  responseSpeed: string
  listeningStyle: string
}

export interface EthicsProfile {
  moralBeliefs: string[]
  influences: string[]
  decisionDrivers: string[]
}

export interface CreativityProfile {
  problemSolvingStyle: string
  communicationStyle: string
}

export interface MotivationProfile {
  primaryDrivers: string[]
  impactOnDecisions: string
}

export interface SelfPerceptionProfile {
  selfView: string
  impactOnActions: string
}

export interface CollaborationProfile {
  opinionStrength: number   // 0-100 (how hard they fight for ideas)
  feedbackResponse: string
  conflictStyle: string
}

export interface PersonalityPrint {
  speech: SpeechProfile
  rhetoric: RhetoricProfile
  emotional: EmotionalProfile
  cognitive: CognitiveProfile
  knowledge: KnowledgeProfile
  conversationStyle: ConversationStyleProfile
  thematic: ThematicProfile
  nonVerbal: NonVerbalProfile
  ethics: EthicsProfile
  creativity: CreativityProfile
  motivation: MotivationProfile
  selfPerception: SelfPerceptionProfile
  collaborationStyle: CollaborationProfile
  generatedAt: string
}

export interface DbPersonalityPrint {
  id: string
  artist_id: string
  user_id: string
  print_json: PersonalityPrint
  created_at: string
  updated_at: string
}
```

**Step 2: Commit**

```bash
git add src/features/music-lab/types/personality-print.types.ts
git commit -m "feat(music-lab): add personality print types"
git push origin main
```

---

### Task 2: Living Context & Social Circle Types

**Files:**
- Create: `src/features/music-lab/types/living-context.types.ts`

**Step 1: Create the types file**

```typescript
/**
 * Living Context Types
 * Real-time awareness of what the artist is doing right now
 */

export interface PhoneProfile {
  model: string
  caseStyle: string
  photoStyle: string
  socialHabits: string
}

export interface EnvironmentContext {
  setting: string
  vibe: string
  clothing: string
}

export interface LivingContext {
  // Time awareness
  currentTime: string
  dayOfWeek: string
  date: string
  season: string
  holiday: string | null
  timeOfDay: string

  // Inferred activity
  currentActivity: string
  currentMood: string
  currentLocation: string
  whoTheyreWith: string[]

  // Environment (feeds image gen)
  environment: EnvironmentContext

  // Phone & photo behavior
  phone: PhoneProfile

  // Status bar display
  statusLine: string
  statusEmoji: string
  activityDescription: string
}

export interface EntourageMember {
  name: string
  role: string
  appearance: string
  frequency: string   // "always around", "weekends only"
}

export interface ArtistSocialCircle {
  entourage: EntourageMember[]
  hangoutSpots: string[]
  transportation: string
}
```

**Step 2: Commit**

```bash
git add src/features/music-lab/types/living-context.types.ts
git commit -m "feat(music-lab): add living context and social circle types"
git push origin main
```

---

### Task 3: Artist Memory Types

**Files:**
- Create: `src/features/music-lab/types/artist-memory.types.ts`

**Step 1: Create the types file**

```typescript
/**
 * Artist Memory Types
 * Persistent memory across chat sessions — remembers you, your work, your relationship
 */

export interface UserKnowledge {
  name: string | null
  preferences: string[]
  musicTaste: string[]
  personalDetails: string[]
  workStyle: string[]
  petPeeves: string[]
}

export interface SessionSummary {
  id: string
  date: string
  summary: string
  outcome: string
  moodOfSession: string
  keyDecisions: string[]
  unresolvedIdeas: string[]
}

export interface RelationshipState {
  rapportLevel: number       // 0-100, grows over time
  insideJokes: string[]
  sharedReferences: string[]
  conflictHistory: string[]
  trust: number              // affects vulnerability
}

export interface SelfReflection {
  growthNotes: string[]
  currentObsessions: string[]
  frustrations: string[]
  goals: string[]
}

export interface MemoryFact {
  content: string
  source: string             // "chat on 2/28"
  importance: number         // 0-10
}

export interface ArtistMemory {
  aboutUser: UserKnowledge
  sessions: SessionSummary[]
  relationship: RelationshipState
  selfReflections: SelfReflection[]
  facts: MemoryFact[]
}

export interface DbArtistMemory {
  id: string
  artist_id: string
  user_id: string
  memory_json: ArtistMemory
  updated_at: string
}

export function createEmptyMemory(): ArtistMemory {
  return {
    aboutUser: {
      name: null,
      preferences: [],
      musicTaste: [],
      personalDetails: [],
      workStyle: [],
      petPeeves: [],
    },
    sessions: [],
    relationship: {
      rapportLevel: 10,
      insideJokes: [],
      sharedReferences: [],
      conflictHistory: [],
      trust: 10,
    },
    selfReflections: [],
    facts: [],
  }
}
```

**Step 2: Commit**

```bash
git add src/features/music-lab/types/artist-memory.types.ts
git commit -m "feat(music-lab): add artist memory types"
git push origin main
```

---

### Task 4: Artist Chat Types

**Files:**
- Create: `src/features/music-lab/types/artist-chat.types.ts`

**Step 1: Create the types file**

```typescript
/**
 * Artist Chat Types
 * iMessage-style messaging with AI artists
 */

export type ChatMessageType = 'text' | 'lyrics' | 'photo' | 'action' | 'web-share' | 'system'

export type ChatReaction = 'thumbs-up' | 'thumbs-down' | null

export interface ChatActionData {
  type: 'start-song' | 'work-on-hook' | 'check-beat' | 'view-lyrics'
  label: string
  payload: Record<string, unknown>  // context to pass to destination
}

export interface WebShareData {
  title: string
  url: string
  summary: string
  source: string
}

export interface ChatMessage {
  id: string
  artistId: string
  role: 'user' | 'artist'
  content: string
  messageType: ChatMessageType
  photoUrl?: string
  actionData?: ChatActionData
  webShareData?: WebShareData
  reaction?: ChatReaction
  createdAt: string
}

export interface DbChatMessage {
  id: string
  artist_id: string
  user_id: string
  role: 'user' | 'artist'
  content: string
  message_type: ChatMessageType
  photo_url: string | null
  action_data: ChatActionData | null
  web_share_data: WebShareData | null
  reaction: ChatReaction
  created_at: string
}

/** Taste profile built from thumbs up/down reactions */
export interface TasteProfile {
  likedThemes: string[]
  dislikedThemes: string[]
  likedStyles: string[]
  dislikedStyles: string[]
  topicPreferences: Record<string, number> // topic -> score (-10 to +10)
}

/** Inspiration feed item (thumbs-up'd content) */
export interface InspirationItem {
  id: string
  type: 'lyric' | 'concept' | 'article' | 'photo' | 'beat'
  content: string
  url?: string
  artistId: string
  createdAt: string
}
```

**Step 2: Commit**

```bash
git add src/features/music-lab/types/artist-chat.types.ts
git commit -m "feat(music-lab): add artist chat types"
git push origin main
```

---

### Task 5: Sound Studio Types

**Files:**
- Create: `src/features/music-lab/types/sound-studio.types.ts`

**Step 1: Create the types file**

```typescript
/**
 * Sound Studio Types
 * Instrumental music workspace with genre taxonomy and Suno prompt building
 */

export interface GenreNode {
  id: string
  label: string
  children?: GenreNode[]
}

export interface InstrumentTag {
  id: string
  label: string
  category: string  // "keyboards", "strings", "drums", "brass", "electronic"
}

export interface MoodTag {
  id: string
  label: string
  valence: 'positive' | 'neutral' | 'dark'
}

export interface SoundStudioSettings {
  genre: string | null
  subgenre: string | null
  microgenre: string | null
  bpm: number
  mood: string | null
  energy: string | null
  era: string | null
  instruments: string[]
  productionTags: string[]
  negativeTags: string[]
}

export interface SoundStudioPreset {
  id: string
  userId: string
  artistId: string | null
  name: string
  settings: SoundStudioSettings
  sunoPrompt: string
  createdAt: string
}

export interface DbSoundStudioPreset {
  id: string
  user_id: string
  artist_id: string | null
  name: string
  preset_json: SoundStudioSettings
  suno_prompt: string
  created_at: string
}

export interface SoundAssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export function createDefaultSettings(): SoundStudioSettings {
  return {
    genre: null,
    subgenre: null,
    microgenre: null,
    bpm: 120,
    mood: null,
    energy: null,
    era: null,
    instruments: [],
    productionTags: [],
    negativeTags: ['no vocals', 'no singing', 'no humming', 'no choir', 'no spoken words'],
  }
}
```

**Step 2: Commit**

```bash
git add src/features/music-lab/types/sound-studio.types.ts
git commit -m "feat(music-lab): add sound studio types"
git push origin main
```

---

### Task 6: Database Tables

**Files:**
- Create: `supabase/migrations/20260301_artist_chat_tables.sql`

**Step 1: Write the migration SQL**

```sql
-- Personality prints
CREATE TABLE IF NOT EXISTS artist_personality_prints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  print_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_personality_prints_artist ON artist_personality_prints(artist_id);
CREATE INDEX idx_personality_prints_user ON artist_personality_prints(user_id);

-- Chat messages
CREATE TABLE IF NOT EXISTS artist_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'artist')),
  content text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'lyrics', 'photo', 'action', 'web-share', 'system')),
  photo_url text,
  action_data jsonb,
  web_share_data jsonb,
  reaction text CHECK (reaction IN ('thumbs-up', 'thumbs-down', NULL)),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_artist ON artist_chat_messages(artist_id, created_at DESC);
CREATE INDEX idx_chat_messages_user ON artist_chat_messages(user_id);

-- Artist memories
CREATE TABLE IF NOT EXISTS artist_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  memory_json jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artist_id, user_id)
);

-- Sound studio presets
CREATE TABLE IF NOT EXISTS sound_studio_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  artist_id uuid,
  name text NOT NULL,
  preset_json jsonb NOT NULL DEFAULT '{}',
  suno_prompt text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sound_presets_user ON sound_studio_presets(user_id);
```

**Step 2: Run the migration against Supabase**

Run via the Supabase dashboard SQL editor or `supabase db push` if CLI is configured.

**Step 3: Commit**

```bash
git add supabase/migrations/20260301_artist_chat_tables.sql
git commit -m "feat(music-lab): add database tables for chat, memory, prints, presets"
git push origin main
```

---

### Task 7: Update Layout Store with New Sub-Tabs

**Files:**
- Modify: `src/store/layout.store.ts` — add `'artist-chat'` and `'sound-studio'` to `MusicLabSubTab`

**Step 1: Update the type**

In `src/store/layout.store.ts`, change:
```typescript
export type MusicLabSubTab = 'artist-lab' | 'writing-studio' | 'music-video'
```
to:
```typescript
export type MusicLabSubTab = 'artist-lab' | 'artist-chat' | 'writing-studio' | 'sound-studio' | 'music-video'
```

**Step 2: Commit**

```bash
git add src/store/layout.store.ts
git commit -m "feat(music-lab): add artist-chat and sound-studio sub-tabs to layout store"
git push origin main
```

---

## Phase 2: Services & API Routes

### Task 8: Personality Print Service (DB CRUD)

**Files:**
- Create: `src/features/music-lab/services/personality-print.service.ts`

**Step 1: Create the service**

Follow the pattern from `artist-dna.service.ts`. Class-based service with Supabase CRUD:
- `getPrint(artistId: string, userId: string): Promise<PersonalityPrint | null>` — fetch from `artist_personality_prints`
- `savePrint(artistId: string, userId: string, print: PersonalityPrint): Promise<boolean>` — upsert
- `deletePrint(artistId: string): Promise<boolean>` — delete on artist deletion

Use `getClient()` from `@/lib/db/client` (same pattern as `artist-dna.service.ts`).

**Step 2: Commit**

```bash
git add src/features/music-lab/services/personality-print.service.ts
git commit -m "feat(music-lab): add personality print service (DB CRUD)"
git push origin main
```

---

### Task 9: Personality Print Generation API Route

**Files:**
- Create: `src/app/api/artist-dna/generate-personality-print/route.ts`

**Step 1: Create the API route**

Pattern: follow `seed-from-artist/route.ts`. POST endpoint that:
1. Authenticates user via `getAuthenticatedUser`
2. Receives `{ artistId, dna }` in body (full ArtistDNA object)
3. Calls OpenRouter with `gpt-4.1` model
4. System prompt instructs LLM to generate a complete `PersonalityPrint` from the DNA
5. The prompt should emphasize: generate from persona traits, lexicon, identity backstory, catalog genome, sound preferences, and look
6. Parse response as JSON, validate structure
7. Save to DB via personality print service
8. Return the print

The system prompt should include the full PersonalityPrint interface as the expected output format, plus calibration examples (e.g., "an artist with traits=['aggressive', 'confident', 'confrontational'] should have collaborationStyle.opinionStrength around 80-90").

**Step 2: Commit**

```bash
git add src/app/api/artist-dna/generate-personality-print/route.ts
git commit -m "feat(music-lab): add personality print generation API route"
git push origin main
```

---

### Task 10: Living Context Service

**Files:**
- Create: `src/features/music-lab/services/living-context.service.ts`

**Step 1: Create the service**

No DB — this is computed fresh each time. The service:
- `generateContext(dna: ArtistDNA, print: PersonalityPrint, socialCircle: ArtistSocialCircle): Promise<LivingContext>`
- Gets current datetime, determines season, checks for holidays (simple holiday list: Christmas, New Year, 4th of July, Halloween, Thanksgiving, Valentine's Day, Easter, Memorial Day, Labor Day, MLK Day)
- Calls OpenRouter (`gpt-4.1-mini`) with system prompt that includes: artist identity (city, neighborhood), persona (traits, likes, attitude), look (fashion), social circle (entourage, hangout spots, transportation)
- Prompt: "Given this artist, what would they realistically be doing at [day] [time] on [date]? Respond as JSON matching the LivingContext interface."
- Parse and return

**Step 2: Commit**

```bash
git add src/features/music-lab/services/living-context.service.ts
git commit -m "feat(music-lab): add living context service"
git push origin main
```

---

### Task 11: Artist Memory Service (DB CRUD + Extraction)

**Files:**
- Create: `src/features/music-lab/services/artist-memory.service.ts`

**Step 1: Create the service**

DB CRUD (Supabase, same pattern as other services):
- `getMemory(artistId: string, userId: string): Promise<ArtistMemory>`
- `saveMemory(artistId: string, userId: string, memory: ArtistMemory): Promise<boolean>`

Memory extraction (called after chat sessions):
- `extractMemoryUpdates(transcript: ChatMessage[], existingMemory: ArtistMemory, artistName: string): Promise<ArtistMemory>` — calls OpenRouter `gpt-4.1-mini` to identify new facts, session summary, preference updates, rapport changes. Returns updated memory object.

Memory caps enforcement:
- `sessions` array: keep last 50, drop oldest
- `facts` array: keep top 100 by importance, drop lowest

**Step 2: Commit**

```bash
git add src/features/music-lab/services/artist-memory.service.ts
git commit -m "feat(music-lab): add artist memory service with extraction"
git push origin main
```

---

### Task 12: Artist Chat Service (DB + Message Handling)

**Files:**
- Create: `src/features/music-lab/services/artist-chat.service.ts`

**Step 1: Create the service**

DB operations:
- `getMessages(artistId: string, userId: string, limit?: number): Promise<ChatMessage[]>` — fetch from `artist_chat_messages`, ordered by created_at DESC, default limit 50
- `saveMessage(msg: Omit<DbChatMessage, 'id' | 'created_at'>): Promise<ChatMessage>`
- `updateReaction(messageId: string, reaction: ChatReaction): Promise<boolean>`

No LLM here — that's in the API route. Service is pure DB CRUD.

**Step 2: Commit**

```bash
git add src/features/music-lab/services/artist-chat.service.ts
git commit -m "feat(music-lab): add artist chat service (DB CRUD)"
git push origin main
```

---

### Task 13: Chat Message API Route

**Files:**
- Create: `src/app/api/artist-chat/message/route.ts`

**Step 1: Create the API route**

POST endpoint — the brain of the chat system:
1. Auth check
2. Receives: `{ artistId, userMessage, dna, personalityPrint, livingContext, memory, recentMessages }`
3. Saves user message to DB
4. Builds system prompt from: personality print (drives how they talk), living context (what they're doing right now), memory (what they remember), recent messages (conversation continuity)
5. The system prompt should be carefully crafted:
   - "You are {stageName}, a {traits} artist from {city}. Right now it's {time} and you're {activity}."
   - Include full speech profile from personality print
   - Include conversation style preferences
   - Include collaboration style (opinionStrength drives pushback)
   - Include memory about the user
   - Rules: stay in character, never break the fourth wall, respond naturally based on typing style
6. Calls OpenRouter `gpt-4.1` with streaming
7. Parses response for special content: lyrics (detect verse/hook patterns), action links (detect "let's work on..." patterns), photo triggers (detect "let me show you" or "hold on")
8. Sets message_type appropriately
9. Saves artist response to DB
10. Returns the response + any metadata (photo trigger, action data)

**Step 2: Commit**

```bash
git add src/app/api/artist-chat/message/route.ts
git commit -m "feat(music-lab): add chat message API route with personality-driven responses"
git push origin main
```

---

### Task 14: Living Context Generation API Route

**Files:**
- Create: `src/app/api/artist-chat/generate-status/route.ts`

**Step 1: Create the API route**

POST endpoint:
1. Auth check
2. Receives: `{ artistId, dna, personalityPrint }` (socialCircle is part of DNA or personality print)
3. Calls living context service to generate current status
4. Returns the LivingContext object

**Step 2: Commit**

```bash
git add src/app/api/artist-chat/generate-status/route.ts
git commit -m "feat(music-lab): add living context generation API route"
git push origin main
```

---

### Task 15: Photo Generation API Route

**Files:**
- Create: `src/app/api/artist-chat/generate-photo/route.ts`

**Step 1: Create the API route**

POST endpoint:
1. Auth check + credit deduction
2. Receives: `{ artistId, dna, livingContext, photoContext }` — photoContext describes what kind of photo (selfie, environment, group shot)
3. Builds an image prompt from: Look DNA (skin tone, hair, fashion, tattoos, visual description), Living Context (environment, clothing, who they're with), phone personality (photo style — grainy vs crisp)
4. If artist has a `characterSheetUrl` or `portraitUrl`, use it as reference image for Nano Banana 2
5. Calls Replicate Nano Banana 2 API (follow pattern from existing `generate-photo-shoot/route.ts`)
6. Returns image URL
7. Saves a new `ArtistGalleryItem` with type `'chat-photo'` to the artist's gallery

**Step 2: Commit**

```bash
git add src/app/api/artist-chat/generate-photo/route.ts
git commit -m "feat(music-lab): add photo generation API route (Nano Banana 2)"
git push origin main
```

---

### Task 16: Memory Update API Route

**Files:**
- Create: `src/app/api/artist-chat/update-memory/route.ts`

**Step 1: Create the API route**

POST endpoint — called when user closes chat or after idle timeout:
1. Auth check
2. Receives: `{ artistId, recentMessages, existingMemory, artistName }`
3. Calls memory service's `extractMemoryUpdates()`
4. Saves updated memory to DB
5. Returns updated memory

**Step 2: Commit**

```bash
git add src/app/api/artist-chat/update-memory/route.ts
git commit -m "feat(music-lab): add memory update API route"
git push origin main
```

---

### Task 17: Chat Reaction API Route

**Files:**
- Create: `src/app/api/artist-chat/react/route.ts`

**Step 1: Create the API route**

POST endpoint — thumbs up/down on messages:
1. Auth check
2. Receives: `{ messageId, reaction, artistId }`
3. Updates the message reaction in DB
4. If thumbs-up on lyrics/concept/article: save to inspiration feed
5. If thumbs-down: note the disliked style/topic for taste profile
6. Returns success

**Step 2: Commit**

```bash
git add src/app/api/artist-chat/react/route.ts
git commit -m "feat(music-lab): add chat reaction API route"
git push origin main
```

---

### Task 18: Web Research API Route

**Files:**
- Create: `src/app/api/artist-chat/web-research/route.ts`

**Step 1: Create the API route**

POST endpoint — artist researches topics they care about:
1. Auth check
2. Receives: `{ artistId, personalityPrint, topic }` — topic can be auto-derived from knowledge.expertise + conversationStyle.topicPreferences, or user-requested
3. Calls OpenRouter with Perplexity Sonar model (same as seed-from-artist Pass 2) for web search
4. System prompt: "You are researching topics that interest {artistName}. Find recent, relevant content about {topic}. Return: title, url, 2-sentence summary."
5. Returns array of WebShareData items

**Step 2: Commit**

```bash
git add src/app/api/artist-chat/web-research/route.ts
git commit -m "feat(music-lab): add web research API route"
git push origin main
```

---

### Task 19: Sound Studio Service + API Routes

**Files:**
- Create: `src/features/music-lab/services/sound-studio.service.ts`
- Create: `src/app/api/sound-studio/suggest/route.ts`
- Create: `src/app/api/sound-studio/build-prompt/route.ts`

**Step 1: Create Sound Studio service**

DB CRUD for presets (Supabase):
- `getPresets(userId: string, artistId?: string): Promise<SoundStudioPreset[]>`
- `savePreset(preset: Omit<DbSoundStudioPreset, 'id' | 'created_at'>): Promise<SoundStudioPreset>`
- `deletePreset(id: string): Promise<boolean>`

Prompt builder (pure function, no LLM):
- `buildSunoPrompt(settings: SoundStudioSettings): string` — assembles genre + subgenre + microgenre + BPM + mood + instruments + production + negative tags into a Suno-compatible string. Enforces character limits (1000 chars for v4.5+).

**Step 2: Create suggest API route**

POST `/api/sound-studio/suggest`:
1. Receives: `{ currentSettings, userMessage, artistDna? }`
2. Calls `gpt-4.1-mini` via OpenRouter with system prompt: "You are a music production assistant helping build instrumental beats. Given the current settings, suggest improvements."
3. Returns suggestion text

**Step 3: Create build-prompt API route**

POST `/api/sound-studio/build-prompt`:
1. Receives: `{ description, artistDna? }` — natural language description of desired sound
2. Calls `gpt-4.1-mini` to convert description into SoundStudioSettings
3. Returns settings + assembled Suno prompt

**Step 4: Commit**

```bash
git add src/features/music-lab/services/sound-studio.service.ts src/app/api/sound-studio/suggest/route.ts src/app/api/sound-studio/build-prompt/route.ts
git commit -m "feat(music-lab): add sound studio service and API routes"
git push origin main
```

---

## Phase 3: Data Files

### Task 20: Suno Genre Taxonomy Data

**Files:**
- Create: `src/features/music-lab/data/suno-genres.data.ts`

**Step 1: Create the genre taxonomy**

Export a `GENRE_TAXONOMY: GenreNode[]` array with 3 levels of hierarchy. Cover all major genres from the Suno research:

- Hip Hop (Trap, Boom Bap, Lo-fi, Cloud Rap, Drill, Jazz Rap, etc.)
- Electronic (House, Techno, Ambient, Dubstep, D&B, Trance, Synthwave, etc.)
- R&B (Neo-Soul, Alternative R&B, PBR&B, Trapsoul, Quiet Storm, etc.)
- Rock (Indie, Psychedelic, Post-Rock, Garage, Shoegaze, etc.)
- Jazz (Smooth, Bebop, Modal, Nu Jazz, Dark Jazz, Fusion, etc.)
- Pop (Synth-pop, Dream Pop, City Pop, Hyperpop, etc.)
- Classical (Baroque, Romantic, Neoclassical, Cinematic, etc.)
- Folk/World (Afrobeat, Reggae, Bossa Nova, Celtic, Flamenco, etc.)
- Metal (Death, Black, Doom, Progressive, Symphonic, etc.)
- Country (Outlaw, Americana, Alt-Country, etc.)
- Punk (Pop Punk, Hardcore, Post-Punk, etc.)
- Soundtrack (Cinematic, Score, Video Game, etc.)

500+ tags total, organized as nested GenreNode objects.

**Step 2: Commit**

```bash
git add src/features/music-lab/data/suno-genres.data.ts
git commit -m "feat(music-lab): add 500+ genre Suno taxonomy data"
git push origin main
```

---

### Task 21: Instrument Tags & Mood Tags Data

**Files:**
- Create: `src/features/music-lab/data/instrument-tags.data.ts`
- Create: `src/features/music-lab/data/mood-tags.data.ts`

**Step 1: Create instrument tags**

Export `INSTRUMENT_TAGS: InstrumentTag[]` organized by category:
- Keyboards: Piano, Electric Piano, Rhodes, Synth, Analog Synth, Organ, Hammond Organ, Synth Pad
- Strings: Acoustic Guitar, Electric Guitar, Bass Guitar, Violin, Cello, Harp, Ukulele
- Drums: Drums, 808s, Drum Machine, TR-909, Percussion, Congas, Tambourine, Hi-hats
- Brass/Wind: Saxophone, Trumpet, Flute, Clarinet, Harmonica, Accordion
- Electronic: Synth Bass, Lead Synth, Acid Bass, Supersaw, Wobbly Bass

**Step 2: Create mood tags**

Export `MOOD_TAGS: MoodTag[]` with valence:
- Positive: uplifting, euphoric, joyful, triumphant, playful, festive, warm, hopeful
- Neutral: dreamy, nostalgic, mysterious, intimate, peaceful, bittersweet, ethereal, meditative
- Dark: haunting, melancholic, dark, anxious, aggressive, intense, menacing, eerie

**Step 3: Commit**

```bash
git add src/features/music-lab/data/instrument-tags.data.ts src/features/music-lab/data/mood-tags.data.ts
git commit -m "feat(music-lab): add instrument and mood tag data files"
git push origin main
```

---

## Phase 4: Stores

### Task 22: Artist Chat Store

**Files:**
- Create: `src/features/music-lab/store/artist-chat.store.ts`

**Step 1: Create the store**

Zustand store with `persist` middleware (localStorage). Pattern follows `artist-dna.store.ts`:

```typescript
interface ArtistChatState {
  // Active chat
  activeArtistId: string | null
  messages: ChatMessage[]
  isLoading: boolean
  isSending: boolean

  // Living context
  livingContext: LivingContext | null
  isLoadingContext: boolean

  // Memory
  memory: ArtistMemory | null
  isLoadingMemory: boolean

  // Personality print
  personalityPrint: PersonalityPrint | null

  // Photo generation
  isGeneratingPhoto: boolean

  // Actions
  openChat: (artistId: string, userId: string) => Promise<void>
  closeChat: (userId: string) => Promise<void>
  sendMessage: (content: string, userId: string) => Promise<void>
  reactToMessage: (messageId: string, reaction: ChatReaction) => Promise<void>
  refreshStatus: (dna: ArtistDNA) => Promise<void>
  requestPhoto: (context: string) => Promise<void>

  // Internal
  loadMessages: (artistId: string, userId: string) => Promise<void>
  loadMemory: (artistId: string, userId: string) => Promise<void>
  loadPersonalityPrint: (artistId: string, userId: string) => Promise<void>
  generateLivingContext: (dna: ArtistDNA) => Promise<void>
  updateMemory: (userId: string) => Promise<void>
}
```

Key behaviors:
- `openChat()`: loads messages, memory, personality print, generates living context
- `sendMessage()`: calls `/api/artist-chat/message`, appends user message immediately, appends artist response when received
- `closeChat()`: triggers memory extraction via `/api/artist-chat/update-memory`
- `reactToMessage()`: calls `/api/artist-chat/react`, updates local state immediately (optimistic)

Only persist `activeArtistId` — messages and memory come from DB.

**Step 2: Commit**

```bash
git add src/features/music-lab/store/artist-chat.store.ts
git commit -m "feat(music-lab): add artist chat store"
git push origin main
```

---

### Task 23: Sound Studio Store

**Files:**
- Create: `src/features/music-lab/store/sound-studio.store.ts`

**Step 1: Create the store**

Zustand store with `persist`:

```typescript
interface SoundStudioState {
  // Settings
  settings: SoundStudioSettings
  artistId: string | null       // null = standalone mode

  // Prompt
  sunoPrompt: string
  promptCharCount: number

  // Sound assistant
  assistantMessages: SoundAssistantMessage[]
  isAssistantLoading: boolean

  // Presets
  presets: SoundStudioPreset[]

  // Actions
  updateSetting: <K extends keyof SoundStudioSettings>(key: K, value: SoundStudioSettings[K]) => void
  loadFromArtist: (artistId: string, dna: ArtistDNA) => void
  resetToDefaults: () => void
  rebuildPrompt: () => void

  // Assistant
  askAssistant: (message: string, artistDna?: ArtistDNA) => Promise<void>
  clearAssistant: () => void

  // Presets
  savePreset: (name: string, userId: string) => Promise<void>
  loadPreset: (preset: SoundStudioPreset) => void
  deletePreset: (id: string) => Promise<void>
  loadPresets: (userId: string, artistId?: string) => Promise<void>
}
```

Key behavior:
- Any setting change triggers `rebuildPrompt()` which uses `buildSunoPrompt()` from the service
- `loadFromArtist()` maps `ArtistSound` fields to `SoundStudioSettings` (genres, subgenres, production preferences → instruments, etc.)
- Prompt is rebuilt in real-time as settings change

**Step 2: Commit**

```bash
git add src/features/music-lab/store/sound-studio.store.ts
git commit -m "feat(music-lab): add sound studio store"
git push origin main
```

---

## Phase 5: UI Components — Artist Chat

### Task 24: ChatHeader Component

**Files:**
- Create: `src/features/music-lab/components/artist-chat/ChatHeader.tsx`

**Step 1: Create the component**

Displays the artist status bar at the top of the chat:
- Back button (← navigates to artist list)
- Artist name (large, bold)
- Green/gray online dot
- Status line: location + day + time (from LivingContext)
- Activity description in quotes
- Menu (...) button for options (view profile, view inspiration feed, clear chat)

Use the design system: OKLCH colors, rounded corners, Inter font. Dark theme. The status area should feel premium — think iMessage header but with richer context.

The artist avatar (from `portraitUrl` or initials with deterministic color, matching `DirectorAvatar.tsx` pattern) should be prominent.

**Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-chat/ChatHeader.tsx
git commit -m "feat(music-lab): add ChatHeader component with status bar"
git push origin main
```

---

### Task 25: ChatMessage Component

**Files:**
- Create: `src/features/music-lab/components/artist-chat/ChatMessage.tsx`

**Step 1: Create the component**

Renders a single chat bubble. Props: `message: ChatMessage`, `isOwn: boolean`, `onReact: (reaction) => void`

Behavior by message type:
- **text**: Standard chat bubble. User messages right-aligned (accent color). Artist messages left-aligned (darker). Show timestamp.
- **lyrics**: Monospace font, accent-colored left border, indented. Wrap in a subtle card.
- **photo**: Image bubble with rounded corners. Loading skeleton while generating. Photo caption below if present.
- **action**: Tappable button/card with icon + label. Styled differently from text.
- **web-share**: Link card with title, summary, source. Includes small external link icon.

All artist messages get a thumbs up / thumbs down overlay on hover (except system messages). Use `ChatReaction` component (small thumb icons).

Typing style from personality print affects rendering: `rapid short messages` → compact bubbles with no extra padding. `long paragraphs` → wider bubbles.

**Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-chat/ChatMessage.tsx
git commit -m "feat(music-lab): add ChatMessage component with all message types"
git push origin main
```

---

### Task 26: ChatMessageList, ChatInput, ChatReaction Components

**Files:**
- Create: `src/features/music-lab/components/artist-chat/ChatMessageList.tsx`
- Create: `src/features/music-lab/components/artist-chat/ChatInput.tsx`
- Create: `src/features/music-lab/components/artist-chat/ChatReaction.tsx`

**Step 1: Create ChatMessageList**

Scrollable message container. Auto-scrolls to bottom on new messages. Renders `ChatMessage` for each message. Shows a typing indicator (three animated dots) when `isSending` is true. Groups consecutive messages by same sender.

**Step 2: Create ChatInput**

Text input at the bottom. Send button. Enter to send (Shift+Enter for newline). Show character count. Clean, minimal. Match iMessage input styling (rounded pill, subtle border).

**Step 3: Create ChatReaction**

Small thumbs up / thumbs down buttons that appear on hover over artist messages. Filled state when reacted. Animates on click (subtle scale).

**Step 4: Commit**

```bash
git add src/features/music-lab/components/artist-chat/ChatMessageList.tsx src/features/music-lab/components/artist-chat/ChatInput.tsx src/features/music-lab/components/artist-chat/ChatReaction.tsx
git commit -m "feat(music-lab): add ChatMessageList, ChatInput, ChatReaction components"
git push origin main
```

---

### Task 27: ChatPhotoMessage, ChatActionLink, ChatLyricsMessage, ChatWebShare Components

**Files:**
- Create: `src/features/music-lab/components/artist-chat/ChatPhotoMessage.tsx`
- Create: `src/features/music-lab/components/artist-chat/ChatActionLink.tsx`
- Create: `src/features/music-lab/components/artist-chat/ChatLyricsMessage.tsx`
- Create: `src/features/music-lab/components/artist-chat/ChatWebShare.tsx`

**Step 1: ChatPhotoMessage** — Image in a rounded bubble. Loading skeleton with shimmer. Click to expand (modal/lightbox). Caption text below.

**Step 2: ChatActionLink** — Tappable button card. Icon based on action type (music note for songs, headphones for beats, scroll for lyrics). Accent-colored border. onClick navigates to the appropriate sub-tab with payload pre-loaded.

**Step 3: ChatLyricsMessage** — Monospace text in a card with accent left border. Slightly different background. Includes thumbs up/down.

**Step 4: ChatWebShare** — Link card: title bold, 2-line summary, source domain. External link icon. Thumbs up/down prominent.

**Step 5: Commit**

```bash
git add src/features/music-lab/components/artist-chat/ChatPhotoMessage.tsx src/features/music-lab/components/artist-chat/ChatActionLink.tsx src/features/music-lab/components/artist-chat/ChatLyricsMessage.tsx src/features/music-lab/components/artist-chat/ChatWebShare.tsx
git commit -m "feat(music-lab): add specialized chat message components"
git push origin main
```

---

### Task 28: ChatPage — Main Chat View

**Files:**
- Create: `src/features/music-lab/components/artist-chat/ChatPage.tsx`

**Step 1: Create the page**

Full-height flex column:
1. **ChatHeader** (status bar, fixed top)
2. **ChatMessageList** (flex-1, scrollable)
3. **ChatInput** (fixed bottom)

On mount: calls `openChat()` from store, which loads everything.
On unmount / tab switch: calls `closeChat()` to trigger memory extraction.

If no artist is selected, show an artist picker (list of user's artists with avatars — reuse pattern from Writing Studio's artist context bar).

**Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-chat/ChatPage.tsx
git commit -m "feat(music-lab): add ChatPage main view"
git push origin main
```

---

### Task 29: InspirationFeed Component

**Files:**
- Create: `src/features/music-lab/components/artist-chat/InspirationFeed.tsx`

**Step 1: Create the component**

Accessible from ChatHeader menu or artist profile. Shows all thumbs-up'd content for this artist:
- Lyric ideas (with the text)
- Song concepts (with description)
- Articles (with title + link)
- Photos (thumbnails)
- Beat suggestions (with Suno prompt)

Grid or masonry layout. Each item shows the date it was saved. Can be removed (un-thumbs-up).

**Step 2: Commit**

```bash
git add src/features/music-lab/components/artist-chat/InspirationFeed.tsx
git commit -m "feat(music-lab): add InspirationFeed component"
git push origin main
```

---

## Phase 6: UI Components — Sound Studio

### Task 30: GenrePicker Component

**Files:**
- Create: `src/features/music-lab/components/sound-studio/GenrePicker.tsx`

**Step 1: Create the component**

Three cascading dropdowns: Genre → Subgenre → Micro-genre.
- Selecting a genre filters subgenre options
- Selecting a subgenre filters micro-genre options
- Each dropdown is a searchable select (type to filter)
- Tags from the `suno-genres.data.ts` taxonomy
- Selected values update the sound studio store

Use the OKLCH design system. Dropdowns styled like the existing app's selects.

**Step 2: Commit**

```bash
git add src/features/music-lab/components/sound-studio/GenrePicker.tsx
git commit -m "feat(music-lab): add GenrePicker component (3-tier taxonomy)"
git push origin main
```

---

### Task 31: InstrumentPalette, MoodSelector, BpmSlider Components

**Files:**
- Create: `src/features/music-lab/components/sound-studio/InstrumentPalette.tsx`
- Create: `src/features/music-lab/components/sound-studio/MoodSelector.tsx`
- Create: `src/features/music-lab/components/sound-studio/BpmSlider.tsx`

**Step 1: InstrumentPalette** — Tag-based multi-select. Instruments grouped by category (tabs or sections). Click to add/remove. Shows as pill tags in a row. Search/filter. Uses `instrument-tags.data.ts`.

**Step 2: MoodSelector** — Grid or list of mood tags. Color-coded by valence (warm for positive, blue/purple for neutral, red/dark for dark). Single select. Uses `mood-tags.data.ts`.

**Step 3: BpmSlider** — Range slider 40-200. Shows current value. Optional tap-tempo button. Common presets below (60, 80, 90, 100, 120, 140, 160).

**Step 4: Commit**

```bash
git add src/features/music-lab/components/sound-studio/InstrumentPalette.tsx src/features/music-lab/components/sound-studio/MoodSelector.tsx src/features/music-lab/components/sound-studio/BpmSlider.tsx
git commit -m "feat(music-lab): add InstrumentPalette, MoodSelector, BpmSlider components"
git push origin main
```

---

### Task 32: SunoPromptPreview and SoundAssistant Components

**Files:**
- Create: `src/features/music-lab/components/sound-studio/SunoPromptPreview.tsx`
- Create: `src/features/music-lab/components/sound-studio/SoundAssistant.tsx`

**Step 1: SunoPromptPreview** — Live preview of the assembled Suno prompt. Monospace font in a card. Character count with color indicator (green/yellow/red based on limit). Copy button. Shows negative tags (greyed out, appended automatically).

**Step 2: SoundAssistant** — Small chat panel below the prompt preview. Text input + send. Shows assistant suggestions as messages. Conversational — user describes what they want, assistant suggests tweaks to settings. "Try this" suggestions are clickable to auto-apply.

**Step 3: Commit**

```bash
git add src/features/music-lab/components/sound-studio/SunoPromptPreview.tsx src/features/music-lab/components/sound-studio/SoundAssistant.tsx
git commit -m "feat(music-lab): add SunoPromptPreview and SoundAssistant components"
git push origin main
```

---

### Task 33: SoundStudioPage — Main View

**Files:**
- Create: `src/features/music-lab/components/sound-studio/SoundStudioPage.tsx`

**Step 1: Create the page**

Layout: scrollable column with sections:
1. **Header** — "Sound Studio" + artist selector dropdown (or "Standalone" mode)
2. **Genre Picker** — 3-tier cascading selects
3. **Controls** — BPM slider, mood, energy dropdown, era dropdown
4. **Instruments** — InstrumentPalette
5. **Production** — tag multi-select for production textures (gritty, clean, lo-fi, polished, etc.)
6. **Suno Prompt Preview** — live-updating prompt
7. **Sound Assistant** — conversational helper

When artist is selected, load their sound DNA defaults via `loadFromArtist()`. Show a "Reset to artist defaults" button.

**Step 2: Commit**

```bash
git add src/features/music-lab/components/sound-studio/SoundStudioPage.tsx
git commit -m "feat(music-lab): add SoundStudioPage main view"
git push origin main
```

---

## Phase 7: Integration

### Task 34: Update MusicLabHub with New Tabs

**Files:**
- Modify: `src/features/music-lab/components/MusicLabHub.tsx`

**Step 1: Add imports and tab entries**

Add imports for `ChatPage` and `SoundStudioPage`. Add two new entries to `SUB_TABS`:
- `{ id: 'artist-chat', label: 'Artist Chat', icon: MessageCircle }` (from lucide-react)
- `{ id: 'sound-studio', label: 'Sound Studio', icon: Headphones }` (from lucide-react)

Add corresponding render blocks in the content area.

Tab order: Artist Lab, Artist Chat, Writing Studio, Sound Studio, Music Video.

**Step 2: Commit**

```bash
git add src/features/music-lab/components/MusicLabHub.tsx
git commit -m "feat(music-lab): add Artist Chat and Sound Studio tabs to MusicLabHub"
git push origin main
```

---

### Task 35: Wire Personality Print Generation into Artist Save

**Files:**
- Modify: `src/features/music-lab/store/artist-dna.store.ts`

**Step 1: Add personality print generation**

In the `saveArtist()` action, after a successful save to DB, fire an async (non-blocking) call to `/api/artist-dna/generate-personality-print` with the current draft DNA. This ensures the personality print stays in sync with the DNA without blocking the save.

Similarly in `createArtist()`, after the initial create, trigger personality print generation.

Add a `personalityPrintStatus: 'idle' | 'generating' | 'done' | 'error'` field to the store state so the UI can show a subtle indicator.

**Step 2: Commit**

```bash
git add src/features/music-lab/store/artist-dna.store.ts
git commit -m "feat(music-lab): trigger personality print generation on artist save"
git push origin main
```

---

### Task 36: Action Link Navigation (Chat → Writing Studio / Sound Studio)

**Files:**
- Modify: `src/features/music-lab/components/artist-chat/ChatActionLink.tsx`
- Modify: `src/features/music-lab/store/writing-studio.store.ts` (add `loadFromChat` action)
- Modify: `src/features/music-lab/store/sound-studio.store.ts` (add `loadFromChat` action)

**Step 1: Update ChatActionLink**

On click, based on action type:
- `'start-song'` or `'work-on-hook'`: call `writingStudioStore.loadFromChat(payload)`, then `layoutStore.setMusicLabSubTab('writing-studio')`
- `'check-beat'`: call `soundStudioStore.loadFromChat(payload)`, then `layoutStore.setMusicLabSubTab('sound-studio')`
- `'view-lyrics'`: open a modal with the lyrics

**Step 2: Add loadFromChat to Writing Studio store**

New action that sets the concept and optionally pre-fills a section with provided lyrics/hook content. Sets a `chatBanner` field to show "Continuing from chat — {artistName} suggested this".

**Step 3: Add loadFromChat to Sound Studio store**

New action that sets initial settings based on chat context (genre, mood, etc.).

**Step 4: Commit**

```bash
git add src/features/music-lab/components/artist-chat/ChatActionLink.tsx src/features/music-lab/store/writing-studio.store.ts src/features/music-lab/store/sound-studio.store.ts
git commit -m "feat(music-lab): wire action link navigation between chat and studios"
git push origin main
```

---

### Task 37: Add Social Circle to ArtistDNA Types

**Files:**
- Modify: `src/features/music-lab/types/artist-dna.types.ts`

**Step 1: Add social circle fields**

Add `socialCircle?: ArtistSocialCircle` to the `ArtistDNA` interface. Import the type from `living-context.types.ts`.

Update `createEmptyDNA()` to include `socialCircle: { entourage: [], hangoutSpots: [], transportation: '' }`.

Also add the phone profile to the Look DNA or as a separate field: `phone?: PhoneProfile` on `ArtistDNA`.

**Step 2: Update seed-from-artist prompt**

Add social circle and phone fields to the generation prompt in `src/app/api/artist-dna/seed-from-artist/route.ts` so they get populated when seeding from a real artist.

**Step 3: Commit**

```bash
git add src/features/music-lab/types/artist-dna.types.ts src/app/api/artist-dna/seed-from-artist/route.ts
git commit -m "feat(music-lab): add social circle and phone to ArtistDNA types"
git push origin main
```

---

### Task 38: Update Gallery Item Type for Chat Photos

**Files:**
- Modify: `src/features/music-lab/types/artist-dna.types.ts`

**Step 1: Extend GalleryItemType**

Change:
```typescript
export type GalleryItemType = 'character-sheet' | 'portrait' | 'photo-shoot'
```
to:
```typescript
export type GalleryItemType = 'character-sheet' | 'portrait' | 'photo-shoot' | 'chat-photo'
```

Add optional fields to `ArtistGalleryItem`:
```typescript
caption?: string      // what the artist said about the photo
context?: string      // "studio session, late night"
source?: 'editor' | 'chat' | 'photo-shoot'
```

**Step 2: Commit**

```bash
git add src/features/music-lab/types/artist-dna.types.ts
git commit -m "feat(music-lab): extend gallery item type for chat photos"
git push origin main
```

---

## Phase 8: Build & Verify

### Task 39: Clean Build Check

**Step 1: Run clean build**

```bash
cd D:/git/directors-palette-v2
rm -rf .next && npm run build
```

Fix any TypeScript errors, unused imports, or ESLint issues.

**Step 2: Commit any fixes**

```bash
git add -A && git commit -m "fix(music-lab): resolve build errors from artist chat implementation"
git push origin main
```

---

### Task 40: Manual Smoke Test

**Step 1: Start dev server**

```bash
cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &
```

**Step 2: Verify new tabs appear**

Navigate to `http://localhost:3002` → Music Lab. Confirm 5 sub-tabs are visible: Artist Lab, Artist Chat, Writing Studio, Sound Studio, Music Video.

**Step 3: Verify Artist Chat loads**

Click Artist Chat tab. If no artist selected, verify the artist picker appears. Select an artist and verify the chat header loads with status.

**Step 4: Verify Sound Studio loads**

Click Sound Studio tab. Verify genre picker, BPM slider, instrument palette, mood selector, and prompt preview all render.

**Step 5: Commit if any fixes needed**

```bash
git add -A && git commit -m "fix(music-lab): smoke test fixes"
git push origin main
```
