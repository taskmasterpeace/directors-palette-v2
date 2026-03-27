# Music Lab DNA Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 20 approved improvements to the Music Lab Artist DNA system — fix missing constraints, wire dead fields into prompts, fix deletion cascade, add export/import, connect genome sub-fields, wire underused fields, and add UX improvements.

**Architecture:** All changes touch existing files only. API routes get additional DNA fields wired into their prompt builders. The delete service gets cascade logic. A new export/import utility is added to the artist store and UI. The constellation completion score gets expanded to cover more fields.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, Supabase (DB + Storage), OpenRouter API

---

## File Map

**API routes (prompt wiring):**
- `src/app/api/artist-chat/message/route.ts` — Add bannedWords + dislikes to chat system prompt
- `src/app/api/artist-dna/generate-options/route.ts` — Wire flowStyle, language, secondaryLanguages, significantEvents
- `src/app/api/artist-dna/generate-full-song/route.ts` — Same wiring as generate-options
- `src/app/api/artist-dna/revise-section/route.ts` — Wire flowStyle, language, secondaryLanguages
- `src/app/api/artist-dna/judge-drafts/route.ts` — Wire flowStyle
- `src/app/api/artist-dna/suggest-concepts/route.ts` — Wire genome.blueprint.suggestExploring + genome.dominantThemes
- `src/app/api/artist-dna/generate-header-bg/route.ts` — Wire soundDescription

**Services:**
- `src/features/music-lab/services/artist-dna.service.ts` — Cascade deletion (4 tables + storage)
- `src/features/music-lab/services/suno-prompt-builder.ts` — Add microgenres to buildMusicStylePrompt

**Store:**
- `src/features/music-lab/store/artist-dna.store.ts` — Export/import actions
- `src/features/music-lab/store/writing-studio.store.ts` — Use genome.dominantMood as default tone

**Components:**
- `src/features/music-lab/components/artist-dna/ArtistEditor.tsx` — Delete button in editor header
- `src/features/music-lab/components/artist-dna/ArtistList.tsx` — Export/import buttons
- `src/features/music-lab/components/artist-dna/constellation/utils.ts` — Expand completion score

**Types:**
- No type changes needed — all fields already exist in `artist-dna.types.ts`

---

### Task 1: Add bannedWords to Artist Chat system prompt

**Files:**
- Modify: `src/app/api/artist-chat/message/route.ts:70-109`

This is the highest-priority fix. bannedWords exist in the DNA but are never enforced in chat.

- [ ] **Step 1: Add bannedWords + dislikes to buildSystemPrompt**

**IMPORTANT:** This file uses `lines` (not `parts`) as its array variable, and accesses fields directly (e.g., `dna.lexicon.bannedWords.length`) without an `sa()` helper.

In `buildSystemPrompt()`, after the lexicon section (after line 79, before the empty `lines.push('')`), add bannedWords enforcement:
```typescript
if (dna.lexicon.bannedWords.length) {
  lines.push(`BANNED WORDS — never use these: ${dna.lexicon.bannedWords.join(', ')}`)
}
```

In the RULES section (around line 108, after the existing rules), add:
```typescript
if (dna.persona.dislikes.length) {
  lines.push(`- Never positively reference these topics (artist dislikes them): ${dna.persona.dislikes.join(', ')}`)
}
```

- [ ] **Step 2: Test with cURL**

```bash
# Start dev server if needed
curl -s http://localhost:3002/api/artist-chat/message -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test","artistId":"test"}' | head -c 500
```

Verify the route still responds (will get auth error, that's fine — confirms no syntax errors).

- [ ] **Step 3: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/artist-chat/message/route.ts
git commit -m "fix(music-lab): enforce bannedWords + dislikes in artist chat prompt"
git push origin main
```

---

### Task 2: Wire dead fields into generate-options prompt

**Files:**
- Modify: `src/app/api/artist-dna/generate-options/route.ts:82-120`

Wire flowStyle, language, secondaryLanguages, and significantEvents into the prompt builder.

- [ ] **Step 1: Add missing fields to buildSystemPrompt**

After the identity section (around line 80), add significantEvents:
```typescript
if (artistDna.identity?.significantEvents?.length > 0) {
  parts.push(`Significant life events: ${artistDna.identity.significantEvents.slice(0, 5).join('; ')}`)
}
```

After the sound profile section (around line 96), add the dead fields:
```typescript
if (artistDna.sound?.flowStyle) parts.push(`Flow style: ${artistDna.sound.flowStyle}`)
if (artistDna.sound?.language && artistDna.sound.language !== 'English') {
  parts.push(`Primary language: ${artistDna.sound.language}`)
}
if (artistDna.sound?.secondaryLanguages?.length > 0) {
  parts.push(`Also writes in: ${artistDna.sound.secondaryLanguages.join(', ')}. Mix in words/phrases from these languages naturally.`)
}
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artist-dna/generate-options/route.ts
git commit -m "feat(music-lab): wire flowStyle, language, secondaryLanguages, significantEvents into lyric generation"
git push origin main
```

---

### Task 3: Wire dead fields into generate-full-song prompt

**Files:**
- Modify: `src/app/api/artist-dna/generate-full-song/route.ts:74-96`

Same pattern as Task 2 — this file has the same prompt builder structure.

- [ ] **Step 1: Add missing fields to buildFullSongPrompt**

After line 79 (backstory), add:
```typescript
if (artistDna.identity?.significantEvents?.length > 0) {
  parts.push(`Significant life events: ${artistDna.identity.significantEvents.slice(0, 5).join('; ')}`)
}
```

After line 96 (instruments), add:
```typescript
if (artistDna.sound?.flowStyle) parts.push(`Flow style: ${artistDna.sound.flowStyle}`)
if (artistDna.sound?.language && artistDna.sound.language !== 'English') {
  parts.push(`Primary language: ${artistDna.sound.language}`)
}
if (artistDna.sound?.secondaryLanguages?.length > 0) {
  parts.push(`Also writes in: ${artistDna.sound.secondaryLanguages.join(', ')}. Mix in words/phrases from these languages naturally.`)
}
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artist-dna/generate-full-song/route.ts
git commit -m "feat(music-lab): wire dead fields into full song generation prompt"
git push origin main
```

---

### Task 4: Wire dead fields into revise-section and judge-drafts

**Files:**
- Modify: `src/app/api/artist-dna/revise-section/route.ts`
- Modify: `src/app/api/artist-dna/judge-drafts/route.ts`

- [ ] **Step 1: Add flowStyle + language to revise-section**

In `buildRevisionPrompt()`, after the sound section, add:
```typescript
if (dna.sound?.flowStyle) parts.push(`Flow style: ${dna.sound.flowStyle}`)
if (dna.sound?.language && dna.sound.language !== 'English') {
  parts.push(`Primary language: ${dna.sound.language}`)
}
if (dna.sound?.secondaryLanguages?.length > 0) {
  parts.push(`Also writes in: ${dna.sound.secondaryLanguages.join(', ')}`)
}
```

- [ ] **Step 2: Add flowStyle to judge-drafts**

In `buildJudgePrompt()`, after the sound section, add:
```typescript
if (dna.sound?.flowStyle) parts.push(`Flow style: ${dna.sound.flowStyle}`)
```

- [ ] **Step 3: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/artist-dna/revise-section/route.ts src/app/api/artist-dna/judge-drafts/route.ts
git commit -m "feat(music-lab): wire flowStyle + language into revision and judging prompts"
git push origin main
```

---

### Task 5: Wire genome sub-fields into suggest-concepts

**Files:**
- Modify: `src/app/api/artist-dna/suggest-concepts/route.ts:53-57`

The suggest-concepts route already uses catalog entries for dedup but misses genome.blueprint.suggestExploring and genome.dominantThemes.

- [ ] **Step 1: Add genome fields to buildArtistProfile**

**IMPORTANT:** This file uses `lines` (not `parts`) as its array variable in `buildArtistProfile()`.

After the existing catalog titles section, add:
```typescript
if (dna.catalog?.genome?.dominantThemes?.length > 0) {
  lines.push(`Dominant catalog themes: ${dna.catalog.genome.dominantThemes.join(', ')}`)
}
if (dna.catalog?.genome?.blueprint?.suggestExploring?.length > 0) {
  lines.push(`EXPLORE THESE (genome recommends new territory): ${dna.catalog.genome.blueprint.suggestExploring.join('; ')}`)
}
if (dna.catalog?.genome?.blueprint?.avoidRepeating?.length > 0) {
  lines.push(`Avoid repeating (overused in catalog): ${dna.catalog.genome.blueprint.avoidRepeating.join('; ')}`)
}
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artist-dna/suggest-concepts/route.ts
git commit -m "feat(music-lab): use genome suggestExploring + dominantThemes in concept suggestions"
git push origin main
```

---

### Task 6: Wire soundDescription into header background generation

**Files:**
- Modify: `src/app/api/artist-dna/generate-header-bg/route.ts:52-97`

The `buildPrompt()` function uses genre/attitude/worldview/fashion but ignores `soundDescription`, which is a free-text field describing the artist's overall sound aesthetic.

- [ ] **Step 1: Add soundDescription to buildPrompt**

After the genre-derived aesthetic section (around line 70), add:
```typescript
// Sound description (user's own words about the vibe)
if (dna.sound.soundDescription) {
  parts.push(dna.sound.soundDescription)
}
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artist-dna/generate-header-bg/route.ts
git commit -m "feat(music-lab): include soundDescription in header background prompt"
git push origin main
```

---

### Task 7: Add microgenres to Suno music style prompt

**Files:**
- Modify: `src/features/music-lab/services/suno-prompt-builder.ts:52-77`

`buildMusicStylePrompt()` uses genres, subgenres, production preferences, and artist influences — but skips microgenres entirely.

- [ ] **Step 1: Add microgenres after subgenres**

After the subgenres block (line 65), add:
```typescript
// Microgenres
if (sa(dna.sound.microgenres).length > 0) {
  tags.push(...sa(dna.sound.microgenres).slice(0, 2))
}
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/services/suno-prompt-builder.ts
git commit -m "feat(music-lab): include microgenres in Suno music style prompt"
git push origin main
```

---

### Task 8: Fix deletion cascade — clean up all related tables + storage

**Files:**
- Modify: `src/features/music-lab/services/artist-dna.service.ts:137-157`

The current `deleteArtist()` only deletes from `artist_profiles`. It must also delete from: `artist_chat_messages`, `artist_memories`, `artist_personality_prints`, `sound_studio_presets`, and clean up Supabase Storage images.

- [ ] **Step 1: Add cascade deletion logic**

**IMPORTANT:** The existing method signature is `deleteArtist(id: string, userId: string)` and uses `getArtistClient()` (module-level function, NOT `this.getClient()`). Keep the `userId` parameter — it's used for auth-scoping.

Replace the existing `deleteArtist` method body with:
```typescript
async deleteArtist(id: string, userId: string): Promise<boolean> {
  const supabase = await getArtistClient()
  if (!supabase) return false

  // Cascade: delete related records from all tables (order doesn't matter, no FK constraints)
  const deletions = await Promise.allSettled([
    supabase.from('artist_chat_messages').delete().eq('artist_id', id),
    supabase.from('artist_memories').delete().eq('artist_id', id),
    supabase.from('artist_personality_prints').delete().eq('artist_id', id),
    supabase.from('sound_studio_presets').delete().eq('artist_id', id),
  ])

  // Log any failures but don't block deletion
  deletions.forEach((result, i) => {
    if (result.status === 'rejected') {
      logger.musicLab.error(`Cascade delete failed for table ${i}`, { error: result.reason })
    }
  })

  // Clean up storage images (portraits, character sheets, gallery, header bg)
  try {
    const { data: files } = await supabase.storage
      .from('directors-palette')
      .list(`artists/${id}`)
    if (files?.length) {
      const paths = files.map(f => `artists/${id}/${f.name}`)
      await supabase.storage.from('directors-palette').remove(paths)
    }
  } catch {
    // Storage cleanup is best-effort
  }

  // Delete the artist profile itself
  const { error } = await supabase
    .from('artist_profiles')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    logger.musicLab.error('Error deleting artist profile', { error })
    return false
  }

  return true
}
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/services/artist-dna.service.ts
git commit -m "fix(music-lab): cascade delete artist data from all related tables + storage"
git push origin main
```

---

### Task 9: Add Export Artist (JSON download)

**Files:**
- Modify: `src/features/music-lab/store/artist-dna.store.ts` — Add `exportArtist` action
- Modify: `src/features/music-lab/components/artist-dna/ArtistCard.tsx` — Add export button

- [ ] **Step 1: Add exportArtist action to store**

Add to the store interface and implementation:
```typescript
// In interface:
exportArtist: (artistId: string) => void

// In implementation:
exportArtist: (artistId: string) => {
  const artist = get().artists.find(a => a.id === artistId)
  if (!artist) return

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    artist: {
      name: artist.name,
      dna: artist.dna,
    },
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${artist.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-dna.json`
  a.click()
  URL.revokeObjectURL(url)
},
```

- [ ] **Step 2: Add export button to ArtistCard dropdown or hover actions**

In `ArtistCard.tsx`, add a Download icon button next to the trash icon:
```typescript
import { Trash2, Download } from 'lucide-react'

// Next to the trash button:
<button
  onClick={(e) => { e.stopPropagation(); onExport?.() }}
  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-cyan-500/10 text-muted-foreground hover:text-cyan-400"
  title="Export artist DNA"
>
  <Download className="w-4 h-4" />
</button>
```

Update the component props to accept `onExport?: () => void`.

- [ ] **Step 3: Wire export in ArtistList**

In `ArtistList.tsx`, pass the export handler:
```typescript
onExport={() => exportArtist(artist.id)}
```

Add `exportArtist` to the store destructure.

- [ ] **Step 4: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/features/music-lab/store/artist-dna.store.ts src/features/music-lab/components/artist-dna/ArtistCard.tsx src/features/music-lab/components/artist-dna/ArtistList.tsx
git commit -m "feat(music-lab): export artist DNA as JSON file"
git push origin main
```

---

### Task 10: Add Import Artist (JSON upload)

**Files:**
- Modify: `src/features/music-lab/store/artist-dna.store.ts` — Add `importArtist` action
- Modify: `src/features/music-lab/components/artist-dna/ArtistList.tsx` — Add import button

- [ ] **Step 1: Add importArtist action to store**

```typescript
// In interface:
importArtist: (jsonString: string) => Promise<boolean>

// In implementation:
importArtist: async (jsonString: string) => {
  try {
    const data = JSON.parse(jsonString)
    if (!data?.artist?.dna || !data?.artist?.name) {
      console.error('Invalid artist export format')
      return false
    }

    // Load imported DNA into draft as a new artist
    set({
      draft: { ...data.artist.dna, identity: { ...data.artist.dna.identity } },
      activeArtistId: null,
      editorOpen: true,
      isDirty: true,
    })
    return true
  } catch {
    console.error('Failed to parse artist JSON')
    return false
  }
},
```

- [ ] **Step 2: Add import button to ArtistList**

Add an "Import Artist" button next to "Create New Artist":
```typescript
<label className="cursor-pointer ...button-styles...">
  <Upload className="w-4 h-4 mr-2" />
  Import Artist
  <input
    type="file"
    accept=".json"
    className="hidden"
    onChange={async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const text = await file.text()
      await importArtist(text)
      e.target.value = ''
    }}
  />
</label>
```

- [ ] **Step 3: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/features/music-lab/store/artist-dna.store.ts src/features/music-lab/components/artist-dna/ArtistList.tsx
git commit -m "feat(music-lab): import artist DNA from JSON file"
git push origin main
```

---

### Task 11: Wire genome suggestExploring + avoidRepeating into lyric generation

**Files:**
- Modify: `src/app/api/artist-dna/generate-options/route.ts:153-177`
- Modify: `src/app/api/artist-dna/generate-full-song/route.ts:111-124`

Both files already read genome data but skip `suggestExploring`. They also have `avoidRepeating` available but don't use it.

- [ ] **Step 1: Add suggestExploring to generate-options**

In the catalog genome section, after the existing `blueprint.avoidRepeating` block, add:
```typescript
if (genome.blueprint.suggestExploring.length > 0) {
  parts.push(`Fresh territory to explore: ${genome.blueprint.suggestExploring.join('; ')}`)
}
```

- [ ] **Step 2: Add suggestExploring to generate-full-song**

Same pattern — after the existing genome blueprint section.

- [ ] **Step 3: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/artist-dna/generate-options/route.ts src/app/api/artist-dna/generate-full-song/route.ts
git commit -m "feat(music-lab): wire genome suggestExploring into lyric generation prompts"
git push origin main
```

---

### Task 12: Use genome.dominantMood as Writing Studio default tone

**Files:**
- Modify: `src/features/music-lab/store/writing-studio.store.ts`

When creating a new section, the tone defaults to `{ emotion: 'Confident', energy: 50, delivery: 'Raw' }`. If the artist has a `genome.dominantMood`, use it as the default emotion instead.

- [ ] **Step 1: Add optional defaultEmotion parameter to addSection**

The writing studio store and artist DNA store are separate Zustand stores. The concrete approach: add an optional `defaultEmotion?: string` parameter to `addSection`, and have the calling component pass it from the artist DNA store.

In the store's `addSection` implementation, change the tone creation:
```typescript
// Change addSection signature:
addSection: (type: SectionType, defaultEmotion?: string) => {
  // ...existing code...
  const section: SongSection = {
    id: crypto.randomUUID(),
    type,
    tone: { ...DEFAULT_TONE, emotion: defaultEmotion || DEFAULT_TONE.emotion, barCount: barDefaults.default },
    selectedDraft: null,
    isLocked: false,
  }
```

Then in the component that calls `addSection`, import the artist DNA store and pass the genome mood:
```typescript
const genome = useArtistDnaStore(s => s.draft?.catalog?.genome)
// When calling addSection:
addSection('verse', genome?.dominantMood)
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/store/writing-studio.store.ts
git commit -m "feat(music-lab): default Writing Studio tone to genome dominantMood when available"
git push origin main
```

---

### Task 13: Wire keyCollaborators into lyric prompts

**Files:**
- Modify: `src/app/api/artist-dna/generate-options/route.ts`
- Modify: `src/app/api/artist-dna/generate-full-song/route.ts`

`keyCollaborators` is a dead field — never read anywhere. Wire it into the prompt context so lyric generation can reference collaboration history.

- [ ] **Step 1: Add keyCollaborators to both prompt builders**

After the `artistInfluences` line in both files, add:
```typescript
if (artistDna.sound?.keyCollaborators?.length > 0) {
  parts.push(`Key collaborators: ${artistDna.sound.keyCollaborators.join(', ')}`)
}
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artist-dna/generate-options/route.ts src/app/api/artist-dna/generate-full-song/route.ts
git commit -m "feat(music-lab): wire keyCollaborators into lyric generation prompts"
git push origin main
```

---

### Task 14: Wire genreEvolution into prompts

**Files:**
- Modify: `src/app/api/artist-dna/generate-options/route.ts`
- Modify: `src/app/api/artist-dna/generate-full-song/route.ts`

`genreEvolution` tracks how an artist's sound changed over time. This context helps AI generate era-appropriate lyrics.

- [ ] **Step 1: Add genreEvolution to both prompt builders**

After the genres/subgenres section in both files:
```typescript
if (artistDna.sound?.genreEvolution?.length > 0) {
  const evoDesc = artistDna.sound.genreEvolution
    .map(e => `${e.era}: ${e.genres.join(', ')}`)
    .join(' → ')
  parts.push(`Sound evolution: ${evoDesc}`)
}
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artist-dna/generate-options/route.ts src/app/api/artist-dna/generate-full-song/route.ts
git commit -m "feat(music-lab): wire genreEvolution timeline into lyric generation"
git push origin main
```

---

### Task 15: Expand Constellation completion score

**Files:**
- Modify: `src/features/music-lab/components/artist-dna/constellation/utils.ts:7-39`

The current `calculateRingFill` misses several fields: `flowStyle`, `instruments`, `microgenres`, `genreEvolution`, `keyCollaborators`, `language`, `signficantEvents`, `dislikes`. Adding these gives users a more accurate picture of how complete their artist is.

- [ ] **Step 1: Expand calculateRingFill**

Update the `sound` calculation to include more fields. Change from 5 items × 0.2 to a weighted calculation:
```typescript
const sound =
  (sa(dna.sound.genres).length > 0 ? 0.15 : 0) +
  (sa(dna.sound.vocalTextures).length > 0 ? 0.15 : 0) +
  (sa(dna.sound.productionPreferences).length > 0 ? 0.15 : 0) +
  (sa(dna.sound.artistInfluences).length > 0 ? 0.15 : 0) +
  (dna.sound.soundDescription ? 0.1 : 0) +
  (dna.sound.flowStyle ? 0.1 : 0) +
  (sa(dna.sound.instruments).length > 0 ? 0.1 : 0) +
  (sa(dna.sound.microgenres).length > 0 ? 0.05 : 0) +
  (sa(dna.sound.keyCollaborators).length > 0 ? 0.05 : 0)
```

Update `profile` to include significantEvents:
```typescript
const profile =
  (dna.identity.stageName || dna.identity.realName ? 0.2 : 0) +
  (dna.identity.backstory ? 0.2 : 0) +
  (dna.identity.city ? 0.15 : 0) +
  (dna.look.visualDescription ? 0.15 : 0) +
  (Array.isArray(dna.catalog.entries) && dna.catalog.entries.length > 0 ? 0.15 : 0) +
  (sa(dna.identity.significantEvents).length > 0 ? 0.15 : 0)
```

Update `persona` to include dislikes weight:
```typescript
const persona =
  (sa(dna.persona.traits).length > 0 ? 0.2 : 0) +
  (sa(dna.persona.likes).length > 0 ? 0.2 : 0) +
  (sa(dna.persona.dislikes).length > 0 ? 0.2 : 0) +
  (dna.persona.attitude ? 0.2 : 0) +
  (dna.persona.worldview ? 0.2 : 0)
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/components/artist-dna/constellation/utils.ts
git commit -m "feat(music-lab): expand constellation completion score to cover more DNA fields"
git push origin main
```

---

### Task 16: Add Delete button inside ArtistEditor

**Files:**
- Modify: `src/features/music-lab/components/artist-dna/ArtistEditor.tsx`
- Modify: `src/features/music-lab/components/artist-dna/ConstellationWidget.tsx`

Currently delete only works from the artist list card hover. Add a delete option inside the editor (in the constellation header dropdown or as a menu item).

- [ ] **Step 1: Add delete to ConstellationWidget dropdown**

The ConstellationWidget already has a dropdown menu for artist switching. Add a "Delete Artist" option with a separator:
```typescript
<DropdownMenuSeparator />
<DropdownMenuItem
  className="text-red-400 focus:text-red-300"
  onClick={() => onDeleteRequest?.()}
>
  <Trash2 className="w-4 h-4 mr-2" />
  Delete Artist
</DropdownMenuItem>
```

Add `onDeleteRequest` prop. Wire it from ArtistEditor with a confirmation dialog (reuse the AlertDialog pattern from ArtistList).

- [ ] **Step 2: Add AlertDialog confirmation in ArtistEditor**

```typescript
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
// Add AlertDialog with same pattern as ArtistList
```

On confirm, call `deleteArtist(activeArtistId)` then `closeEditor()`.

- [ ] **Step 3: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/features/music-lab/components/artist-dna/ArtistEditor.tsx src/features/music-lab/components/artist-dna/ConstellationWidget.tsx
git commit -m "feat(music-lab): add delete artist option inside editor header"
git push origin main
```

---

### Task 17: Wire instruments into Suno vocal prompt

**Files:**
- Modify: `src/features/music-lab/services/suno-prompt-builder.ts`

`instruments` is in the DNA but only used in API prompt builders, not in the Suno prompt. Add it to `buildMusicStylePrompt`.

- [ ] **Step 1: Add instruments to buildMusicStylePrompt**

After the microgenres block (added in Task 7), add:
```typescript
// Instruments
if (sa(dna.sound.instruments).length > 0) {
  tags.push(...sa(dna.sound.instruments).slice(0, 2))
}
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/services/suno-prompt-builder.ts
git commit -m "feat(music-lab): include instruments in Suno music style prompt"
git push origin main
```

---

### Task 18: Verify persona.dislikes in lyric generation prompts (likely no-op)

**Files:**
- Verify: `src/app/api/artist-dna/generate-full-song/route.ts`

**NOTE:** `dislikes` may already be wired in `generate-full-song` (line 103). This task is verify-only — check the file and skip if already present.

- [ ] **Step 1: Verify dislikes in generate-full-song**

Check if `dislikes` is already in generate-full-song at line 103. If it's already there, skip to commit step with a no-op commit message. If not, add after the likes line:
```typescript
if (artistDna.persona?.dislikes?.length > 0) parts.push(`Themes they avoid: ${artistDna.persona.dislikes.join(', ')}`)
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artist-dna/generate-full-song/route.ts
git commit -m "fix(music-lab): ensure dislikes enforced in full song generation"
git push origin main
```

---

### Task 19: Wire persona.likes + dislikes into chat system prompt

**Files:**
- Modify: `src/app/api/artist-chat/message/route.ts`

This extends Task 1. Ensure `likes` (topics the artist gravitates toward) are also in the chat prompt so the AI can organically reference them.

- [ ] **Step 1: Add likes to chat system prompt**

**IMPORTANT:** This file uses `lines` (not `parts`) and accesses fields directly without `sa()`.

In the persona section of `buildSystemPrompt()`, after the lexicon block (around line 79):
```typescript
if (dna.persona.likes.length) {
  lines.push(`Topics you're passionate about: ${dna.persona.likes.join(', ')}`)
}
```

Note: Task 1 already adds dislikes to the RULES section. This task adds likes to the persona section. Can be combined with Task 1 during implementation.

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artist-chat/message/route.ts
git commit -m "feat(music-lab): wire persona likes into artist chat prompt"
git push origin main
```

---

### Task 20: Wire ethnicity into chat and lyric prompts for cultural authenticity

**Files:**
- Modify: `src/app/api/artist-chat/message/route.ts`
- Modify: `src/app/api/artist-dna/generate-options/route.ts`
- Modify: `src/app/api/artist-dna/generate-full-song/route.ts`

`ethnicity` exists in identity but is only used for image generation. Wire it into text generation so cultural references are authentic.

- [ ] **Step 1: Add ethnicity to identity sections in all three files**

After the origin/city line in each prompt builder:
```typescript
if (artistDna.identity?.ethnicity) {
  parts.push(`Cultural background: ${artistDna.identity.ethnicity}`)
}
```

- [ ] **Step 2: Build check**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/artist-chat/message/route.ts src/app/api/artist-dna/generate-options/route.ts src/app/api/artist-dna/generate-full-song/route.ts
git commit -m "feat(music-lab): wire ethnicity into text generation for cultural authenticity"
git push origin main
```

---

## Implementation Order Summary

| Priority | Tasks | Theme |
|----------|-------|-------|
| P0 — Fix constraints | 1, 18, 19 | bannedWords + dislikes + likes in chat/lyrics |
| P1 — Wire dead fields | 2, 3, 4, 13, 14, 20 | flowStyle, language, secondaryLanguages, significantEvents, keyCollaborators, genreEvolution, ethnicity |
| P2 — Fix deletion | 8, 16 | Cascade delete + in-editor delete button |
| P3 — Export/import | 9, 10 | JSON download/upload |
| P4 — Genome sub-fields | 5, 11, 12 | suggestExploring, dominantThemes, dominantMood |
| P5 — Suno prompts | 6, 7, 17 | soundDescription, microgenres, instruments |
| P6 — UX | 15 | Constellation completion score expansion |

Total: 20 tasks, ~40-50 file edits, 20 commits.
