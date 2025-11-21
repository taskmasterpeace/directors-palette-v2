# Story Creator - Complete Architecture Research & Proposals

**Date**: January 19, 2025
**Research Completed**: Prompting Language, Architecture Options, Mobile Patterns

---

## Executive Summary

Based on deep exploration of the codebase, we have:
1. ✅ **Fully documented** the existing prompting language (brackets, pipes, wildcards, @references)
2. ✅ **Designed 3 architecture proposals** for Story Creator implementation
3. ✅ **Researched mobile patterns** already in use (can reuse them)

**Recommendation**: **Proposal 1 (Shared Infrastructure)** - Build Story Creator as 4th tab, reuse existing generation service, share reference library, add queue system.

---

## Part 1: Prompting Language Deep Dive

### How It Actually Works

#### 1. Bracket Syntax `[option1, option2, option3]`
**What it does**: Generates separate images for each option

```
Input: "Hero in [city, forest, desert]"
Output: 3 images
  - Image 1: "Hero in city"
  - Image 2: "Hero in forest"
  - Image 3: "Hero in desert"
```

**Limits**:
- Max 10 options per prompt
- Only ONE bracket pair per prompt
- Cannot mix with pipes

**Files**: `src/features/shot-creator/helpers/prompt-syntax-feedback.ts`

---

#### 2. Pipe Syntax `prompt1 | prompt2 | prompt3`
**What it does**: Sequential chaining - each step uses previous image as reference

```
Input: "rough sketch | oil painting style | detailed artwork"
Execution:
  Step 1: Generate "rough sketch" → gets image A
  Step 2: Generate "oil painting style" using image A as reference → gets image B
  Step 3: Generate "detailed artwork" using image B as reference → gets image C
```

**Key Points**:
- NOT independent variations (that's brackets)
- Image-to-image transformation pipeline
- Waits for each step to complete before next
- Max 10 steps

**Cannot mix with brackets** (validation error)

**Files**: `src/features/shot-creator/hooks/useImageGeneration.ts` (lines 341-446)

---

#### 3. Wildcards `_wildcard_name_`
**What it does**: Random selection from predefined lists

```
Prompt: "_character_ in _location_"

Wildcard content:
  _character_: "hero\nvillain\nsidekick"
  _location_: "castle\nforest\ncity"

Generates: 9 images (3×3 cartesian product)
  - hero in castle
  - hero in forest
  - hero in city
  - villain in castle
  - (etc...)
```

**Key Points**:
- Underscores on both sides: `_name_`
- Content is newline-separated
- Multiple wildcards = cartesian product
- Warning at 50+ combinations, danger at 100+

**Files**: `src/features/shot-creator/helpers/wildcard/parser.ts`

---

#### 4. @Reference Tags (Current Implementation)
**What it does**: Auto-attaches reference images with matching tags

```
Prompt: "Show @hero fighting @villain in @city"

System:
  1. Finds gallery images tagged with @hero, @villain, @city
  2. Automatically attaches those images as references
  3. Sends to generation with all references
```

**Key Points**:
- Syntax: `@alphanumeric-with-hyphens_underscores`
- Case-insensitive: `@hero` = `@Hero`
- Multiple tags allowed per prompt
- No special location syntax (any tag works: `@hero`, `@city`, `@weapon`)

**Reserved tags** (not treated as image references):
- `@cinematic`, `@lighting`, `@environment`, `@camera`, `@style`, etc.
- These are prompt library categories

**Model Limits**:
- Nano Banana: max 10 reference images
- Seedream-4: max 10 reference images
- Gen4: max 3 reference images

**Files**:
- `src/features/shot-creator/helpers/parse-reference-tags.ts`
- `src/features/shot-creator/store/unified-gallery-store.ts` (lines 217-231)

---

### Syntax Combination Rules

| Syntax | Can Mix With | Result |
|--------|-------------|--------|
| Brackets | Wildcards | ✅ YES - Both apply |
| Brackets | Pipes | ❌ NO - Error |
| Pipes | Wildcards | ✅ YES - Both apply per step |
| @References | Any | ✅ YES - Always works |

---

### Story Creator Integration Challenge

**Problem**: Story system generates 180 individual prompts:
```
Shot 001: "Show @tsu_surf in @home standing"
Shot 002: "Show @tsu_surf in @home at window"
Shot 003: "Show @tsu_surf in @home worried"
```

**But with brackets, this could be**:
```
One prompt: "Show @tsu_surf in @home [standing, at window, worried]"
→ Generates 3 images
```

**Solution Options**:

**Option A: Individual prompts by default**
- Story Creator generates 180 separate prompts
- User can manually merge similar ones with brackets
- Simple, explicit

**Option B: Smart grouping**
- AI suggests: "Shots 5-8 are similar, combine with brackets?"
- User approves/rejects
- Reduces prompt count intelligently

**Option C: User choice**
- Generate individual by default
- User selects multiple shots, clicks "Merge with Brackets"
- Manual control

**Recommendation**: **Support all three** - Default to individual, offer smart suggestions, allow manual merge

---

## Part 2: Architecture Proposals

### Your Confirmed Requirements

1. ✅ **4th tab** in desktop navigation
2. ✅ **Dev branch** workflow (`feature/story-creator`)
3. ✅ **Hybrid generation**: Can send to Shot Creator OR batch generate
4. ✅ **Bracket integration**: Individual + Smart grouping + User choice
5. ✅ **Mobile support**: Required

---

### Proposal 1: SHARED INFRASTRUCTURE (Recommended)

**Philosophy**: Story Creator as specialized orchestrator, reuses existing Shot Creator systems

#### Architecture

```
Story Creator (New)
├─ UI: 4th tab, own interface
├─ State: New Zustand store (story projects, shots)
├─ Database: +3 new tables (story_projects, story_shots, generation_queue)
├─ References: SHARED with Shot Creator (same reference table)
└─ Generation: REUSES Shot Creator generation service

Shot Creator (Existing)
├─ UI: Existing tab
├─ Generation Service: imageGenerationService ← Story Creator uses this
└─ Reference Library: Shared ← Story Creator uses this
```

#### Data Model

**Shared Tables** (Existing):
- `gallery` - All generated images
- `reference` - All reference images (@tsu_surf, @courtroom, etc.)

**New Tables**:
```sql
story_projects (
  id, user_id, title, story_text, metadata, created_at, updated_at
)

story_shots (
  id, project_id, sequence_number, chapter, prompt,
  reference_tags text[], -- [@tsu_surf, @courtroom]
  gallery_id uuid,  -- Links to shared gallery table
  status, metadata, created_at
)

generation_queue (
  id, user_id, project_id, shot_ids uuid[],
  status, progress, created_at
)
```

#### Generation Flow: HYBRID

**Path A: Send to Shot Creator**
```typescript
// User clicks "Generate" on Shot 003
const shot = storyShots[2]

// Opens Shot Creator tab with prompt pre-filled
router.push('/shot-creator?prompt=' + encodeURI(shot.prompt))

// User can edit, add variations, then generate
// Result goes to shared gallery
```

**Path B: Generation Queue (Batch)**
```typescript
// User selects 20 shots, clicks "Generate All"
const queueId = await createGenerationQueue({
  project_id: currentProject.id,
  shot_ids: [shot1.id, shot2.id, ...shot20.id]
})

// Queue processor (sequential or parallel batches)
for (const shotId of queue.shot_ids) {
  const shot = await getShot(shotId)

  // Reuse existing Shot Creator generation service
  const result = await imageGenerationService.generate({
    prompt: shot.prompt,
    referenceImages: getReferencesByTags(shot.reference_tags),
    model: settings.model
  })

  // Link result to shot
  await updateShot(shotId, { gallery_id: result.galleryId })
}
```

#### Bracket Integration

**1. Individual Prompts (Default)**
```typescript
// Story Creator generates 180 separate prompts
const shots = [
  { prompt: "@tsu_surf in @home standing", seq: 1 },
  { prompt: "@tsu_surf in @home at window", seq: 2 },
  { prompt: "@tsu_surf in @home worried", seq: 3 },
]
```

**2. Smart Grouping (AI Suggests)**
```typescript
// AI analyzes shots, suggests merging similar ones
const suggestions = await aiAnalyzeShotGrouping(shots)

// Returns:
// "Shots 1-3 all feature @tsu_surf in @home doing different actions.
//  Suggest merging: '@tsu_surf in @home [standing, at window, worried]'"

// UI shows suggestion with Accept/Reject buttons
```

**3. Manual Merge (User Choice)**
```typescript
// User selects shots 1-3, clicks "Merge with Brackets"
// UI shows editor:
"@tsu_surf in @home [standing, at window, worried]"

// Saves as single shot that generates 3 images
// Each image links back to original shot number
```

#### Mobile Strategy

**Conditional Rendering**:
```typescript
// StoryCreator.tsx
const isMobile = useIsMobile()

if (isMobile) {
  return <StoryCreatorMobile />  // Accordion-based
}

return <StoryCreatorDesktop />  // Split panels
```

**Mobile Components** (Following existing patterns):
- **Accordion** for chapters (Radix UI, already used)
- **Sheet** for editing modals (bottom drawer, already used)
- **Virtual scrolling** with pagination (20 shots per page)
- **Touch targets**: min 48px height for buttons
- **Sticky header** with search/filters
- **Fixed bottom bar** for bulk actions

**Performance**:
- Pagination: 20 items per page (not all 180 at once)
- `useMemo` for filtering
- Zustand for state (handles 180 items fine)

#### File Structure

```
src/features/story-creator/
├── components/
│   ├── StoryCreator.tsx                    # Router
│   ├── mobile/
│   │   ├── StoryCreatorMobile.tsx          # Accordion layout
│   │   ├── ChapterAccordion.tsx
│   │   └── ShotPromptCard.tsx
│   ├── desktop/
│   │   └── StoryCreatorDesktop.tsx         # Split panels
│   ├── editor/
│   │   ├── StoryInputPanel.tsx             # Paste story
│   │   ├── CharacterManager.tsx            # Create references
│   │   ├── ShotEditor.tsx                  # Edit individual shots
│   │   └── BracketMergePanel.tsx           # Merge shots
│   └── queue/
│       ├── GenerationQueuePanel.tsx
│       └── QueueProgress.tsx
├── hooks/
│   ├── useStoryParser.ts                   # AI extraction
│   ├── useStoryCreatorState.ts             # State + pagination
│   ├── useShotGeneration.ts                # Wraps existing service
│   └── useSmartGrouping.ts                 # AI suggestions
├── services/
│   ├── story-parser.service.ts             # Parse story → shots
│   ├── prompt-generator.service.ts         # Generate prompts with @tags
│   ├── shot-grouping.service.ts            # Smart grouping logic
│   └── story-project.service.ts            # CRUD operations
├── store/
│   └── story-creator.store.ts              # Zustand state
└── types/
    ├── story.types.ts
    └── shot.types.ts
```

#### Tab Integration

**Update `src/app/page.tsx`**:
```tsx
import { StoryCreator } from '@/features/story-creator'
import { BookOpen } from 'lucide-react'

// Add 4th tab
<TabsList className="hidden sm:grid grid-cols-4 w-full">
  <TabsTrigger value="shot-creator">Shot Creator</TabsTrigger>
  <TabsTrigger value="shot-animator">Shot Animator</TabsTrigger>
  <TabsTrigger value="layout-annotation">Layout</TabsTrigger>
  <TabsTrigger value="story-creator">
    <BookOpen className="w-4 h-4 mr-2" />
    Story Creator
  </TabsTrigger>
</TabsList>

<TabsContent value="story-creator">
  <StoryCreator />
</TabsContent>
```

#### Development Strategy

**Branch**: `feature/story-creator`

**Feature Flag** (optional for gradual rollout):
```typescript
const ENABLE_STORY_CREATOR = process.env.NEXT_PUBLIC_ENABLE_STORY_CREATOR === 'true'

{ENABLE_STORY_CREATOR && (
  <TabsTrigger value="story-creator">Story Creator</TabsTrigger>
)}
```

**Migration Steps**:
1. Create feature branch
2. Add database migrations
3. Build Story Creator (isolated)
4. Test thoroughly
5. Merge to main
6. Deploy

#### Pros & Cons

**Pros**:
- ✅ Reuses proven generation infrastructure
- ✅ Shared reference library (characters work everywhere)
- ✅ Queue system reusable for other features
- ✅ Lower maintenance (one generation codebase)
- ✅ 4-5 week timeline

**Cons**:
- ⚠️ Story metadata in JSON column (less queryable)
- ⚠️ Need to extend existing services slightly
- ⚠️ More complex database queries (JOINs)

---

### Proposal 2: ISOLATED SUBSYSTEM

**Philosophy**: Story Creator as completely standalone feature

#### Key Differences from Proposal 1

1. **Separate reference library** - Story characters don't appear in Shot Creator
2. **Own generation service** - Calls Replicate API directly
3. **Own webhook handler** - `/api/webhooks/story-generation`
4. **Separate gallery** - Story images in separate table

#### Data Model

**All New Tables** (No sharing):
```sql
story_references (
  id, user_id, type, name, tags, image_url, metadata
)

story_projects (
  id, user_id, title, story_text, extracted_entities, settings
)

story_shots (
  id, project_id, sequence_number, prompt, generated_image_url, status
)

story_generation_queue (
  id, user_id, project_id, shots, status, progress
)
```

#### Pros & Cons

**Pros**:
- ✅ Complete isolation (no risk to existing features)
- ✅ Independent evolution
- ✅ Clear boundaries

**Cons**:
- ❌ Code duplication
- ❌ Characters don't work across tabs
- ❌ More tables to maintain
- ❌ Larger codebase
- ❌ 5-6 week timeline

---

### Proposal 3: PROGRESSIVE ENHANCEMENT

**Philosophy**: Start minimal, enhance as you learn

#### Phases

**Phase 1 (Week 1)**: MVP with localStorage
- Paste story → see prompts
- localStorage for state
- No database yet

**Phase 2 (Week 2)**: Add database
- Migrate to Supabase tables
- Share gallery/reference

**Phase 3 (Week 3)**: Add queue
- Batch generation
- Progress tracking

**Phase 4 (Weeks 4-5)**: AI features
- Smart grouping
- Character extraction

**Phase 5 (Week 6)**: Mobile polish
- Virtual scrolling
- Touch optimization

#### Pros & Cons

**Pros**:
- ✅ Fastest to working prototype (1 week)
- ✅ Learn as you go
- ✅ Iterative value delivery

**Cons**:
- ❌ Risk of technical debt
- ❌ Possible refactoring pain
- ❌ Unclear final architecture

---

## Part 3: Mobile Patterns Already in Codebase

### What's Already Built (You Can Reuse)

#### 1. Mobile Detection Hook
```typescript
// src/hooks/use-mobile.ts
const isMobile = useIsMobile()  // < 768px
```

#### 2. Conditional Rendering Pattern
```typescript
// src/features/shot-creator/components/prompt-library/PromptLibrary.tsx
if (isMobile) {
  return <PromptLibraryMobile />
}
return <PromptLibraryDesktop />
```

#### 3. Radix UI Components (Already Installed)
- **Accordion** - `@radix-ui/react-accordion` (perfect for chapters)
- **Sheet** - Bottom drawer modals (perfect for mobile editing)
- **ScrollArea** - Custom scrollbar styling

#### 4. Touch-Optimized Button Pattern
```typescript
<Button className="min-h-[48px] min-w-[44px] touch-manipulation active:scale-95">
  Action
</Button>
```

#### 5. Sticky Header Pattern
```typescript
<div className="sticky top-0 z-20 bg-slate-900 border-b border-slate-700">
  <Input placeholder="Search..." className="h-12" />
</div>
```

#### 6. Pagination (Not Virtual Scrolling)
Current app uses **pagination** for performance:
- 20-35 items per page
- Simple page navigation
- Works great for 180 items (9 pages of 20)

**No need for virtual scrolling** - pagination works fine.

#### 7. Responsive Grid
```typescript
// Mobile-first: 2 columns → 4 on desktop
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
```

#### 8. Mobile-Specific Layouts
```typescript
// Flex column on mobile, row on desktop
<div className={isMobile ? 'flex-col h-full' : 'flex-row gap-6'}>
```

### Performance Strategy for 180 Items

**Recommended Approach** (Based on codebase patterns):

```typescript
// Store
const SHOTS_PER_PAGE = 20

interface StoryCreatorStore {
  allShots: Shot[]  // All 180
  currentPage: number

  get paginatedShots() {
    const start = (this.currentPage - 1) * SHOTS_PER_PAGE
    return this.allShots.slice(start, start + SHOTS_PER_PAGE)
  }
}

// Component
function ShotList() {
  const { paginatedShots, currentPage, totalPages } = useStoryCreatorState()

  return (
    <>
      {paginatedShots.map(shot => <ShotCard key={shot.id} shot={shot} />)}
      <Pagination current={currentPage} total={totalPages} />
    </>
  )
}
```

**With search/filtering**:
```typescript
const filteredShots = useMemo(() => {
  if (!searchQuery) return allShots
  return allShots.filter(s => s.prompt.includes(searchQuery))
}, [allShots, searchQuery])

const paginatedShots = useMemo(() => {
  const start = (currentPage - 1) * SHOTS_PER_PAGE
  return filteredShots.slice(start, start + SHOTS_PER_PAGE)
}, [filteredShots, currentPage])
```

---

## Part 4: Implementation Recommendations

### My Recommendations

#### 1. Architecture: **Proposal 1 (Shared Infrastructure)**

**Why**:
- Leverages existing, proven systems
- Characters/locations work across all tabs (huge UX win)
- Queue system is reusable
- Lower maintenance
- 4-5 week realistic timeline

#### 2. Generation Flow: **Queue System + Send to Shot Creator**

**Queue for batch**:
```typescript
// Select 20 shots → Generate All
// Sequential or small parallel batches (5 at a time)
// Progress bar, pause/resume
```

**Send to Shot Creator for individual tweaking**:
```typescript
// Click shot → "Edit in Shot Creator"
// Opens Shot Creator with prompt pre-filled
// User can add brackets, change settings, etc.
```

#### 3. Prompting Language Integration

**Default**: Individual prompts
```
Shot 1: "@tsu_surf in @home standing"
Shot 2: "@tsu_surf in @home at window"
```

**Smart grouping**: AI suggests merging
```
AI: "Shots 1-3 are similar. Merge to:
     '@tsu_surf in @home [standing, at window, worried]'"
User: Accept or Reject
```

**Manual merge**: User selects + clicks "Merge with Brackets"

**Result**: Flexible - user controls grouping, AI helps suggest

#### 4. Mobile: **Accordion + Pagination**

- Chapters as accordion items
- 20 shots per page
- Bottom drawer for editing
- Touch-optimized (48px buttons)
- Reuse existing mobile patterns

#### 5. Development: **Feature Branch + Optional Flag**

```bash
git checkout -b feature/story-creator
```

```typescript
// Optional feature flag for safety
const ENABLE_STORY_CREATOR = process.env.NEXT_PUBLIC_ENABLE_STORY_CREATOR === 'true'
```

Build in isolation, merge when ready.

---

## Part 5: Open Questions for You

### Questions to Answer

1. **Timeline**: Need MVP fast (1-2 weeks) or full-featured (4-5 weeks)?
   - If fast: Consider Proposal 3 (Progressive) with localStorage first
   - If complete: Go with Proposal 1 (Shared)

2. **Reference Library**: Should story characters be available in Shot Creator?
   - I recommend: **YES** (shared library = better UX)

3. **Generation Speed**: Sequential (one at a time) or parallel batches?
   - Sequential: Safer, predictable
   - Parallel batches of 5: Faster, uses more API rate limit
   - I recommend: **Parallel batches of 3-5**

4. **Queue Management**: What happens if generation fails?
   - Skip and continue?
   - Pause queue for review?
   - Retry automatically?
   - I recommend: **Skip, log error, continue**

5. **Smart Grouping**: How aggressive should AI be?
   - Conservative: Only suggest when very similar (character + location same)
   - Aggressive: Suggest whenever possible
   - I recommend: **Conservative** - let user have control

---

## Part 6: Next Steps

### If You Choose Proposal 1 (Recommended)

**Week 1: Foundation**
- Create feature branch
- Add database migrations (3 tables)
- Basic project CRUD
- Tab integration

**Week 2: Story Parsing**
- AI story parsing (extract characters/locations/shots)
- Entity review UI
- Reference creation flow

**Week 3: Prompt Generation**
- Generate prompts with @tags
- Shot list UI (desktop + mobile)
- Individual shot editing

**Week 4: Generation System**
- Queue implementation
- Batch generation
- Progress tracking
- Error handling

**Week 5: Bracket Integration**
- Smart grouping AI
- Manual merge UI
- Bracket expansion

**Week 6: Polish & Testing**
- Mobile optimization
- Performance tuning
- Bug fixes
- Documentation

**Total**: 6 weeks to production-ready

---

## Conclusion

You have:
1. ✅ Complete understanding of prompting language
2. ✅ Three architecture proposals (Proposal 1 recommended)
3. ✅ Mobile patterns already in codebase (reuse them)
4. ✅ Clear implementation path

**What you need to decide**:
1. Which proposal? (I recommend Proposal 1)
2. Timeline? (MVP in 1 week or full feature in 6 weeks?)
3. Sequential or parallel generation?
4. How aggressive for smart grouping?

**Once you decide, I'll create detailed implementation tasks and start building.**

Ready to move forward?
