# Story Creator - Entities Panel Implementation

## ✅ What Was Built

### 1. **EntitiesSection Component** (`src/features/story-creator/components/sections/EntitiesSection.tsx`)
- Displays extracted characters and locations in scrollable card views
- **Character Section**: Shows all extracted characters with names, @tags, and descriptions
- **Location Section**: Shows all extracted locations with names, @tags, and descriptions
- **Edit Mode**: Click "Edit" button to modify character/location name and description inline
- **Assign Reference Button**: Placeholder for assigning reference images from gallery (TODO)
- **Continue Button**: Navigate to Shots Review tab after reviewing/editing entities

### 2. **Updated StoryCreatorDesktop** (`src/features/story-creator/components/desktop/StoryCreatorDesktop.tsx`)
- Added "Characters" tab between "Story Input" and "Shots Review"
- Tab shows entity count badge when entities are extracted
- Workflow now: **Input → Entities → Review → Generation**
- Automatic navigation: After extraction, goes to "Entities" tab if entities found, otherwise directly to "Review"
- Integrated with Zustand store for state management

### 3. **LLM Service** (`src/features/story-creator/services/llm.service.ts`)
- `extractScenes()`: Extracts 10-30 key visual moments with:
  - Chapter, sequence number, visual description
  - Characters present, location, mood, camera angle
- `extractEntities()`: Extracts all characters and locations with:
  - Name, tag (e.g., "clone"), description for image generation
- `generateImagePrompt()`: **Inline name replacement**
  - Replaces character/location names with @tags if reference assigned
  - Uses text descriptions if NO reference assigned
  - Example: `@clone sits across from @morrison` (NOT prepending tags)

## 🧪 Testing Results

### Test Script Results (`test-llm-extraction.js`)
**Story Sample**: "The Weight of Words" excerpt (Clone interrogation scene)

**Extracted:**
- ✅ 4 visual scenes with chapters, sequences, camera angles
- ✅ 2 characters: Clone, Detective Morrison
- ✅ 1 location: Cobb County interrogation room
- ✅ Proper mood detection: "tense", "dramatic", "calm yet tense"
- ✅ Camera angles: "medium", "close-up"

### Dev Server Status
- ✅ Running cleanly on `http://localhost:3002`
- ✅ No compilation errors
- ✅ All TypeScript types properly defined
- ✅ Zustand store integration working

## 🎯 How It Works (User Flow)

1. **Story Input Tab**
   - User enters story title and text (or uses "The Weight of Words" test story)
   - Clicks "Extract Shots with AI"

2. **LLM Extraction** (Automatic)
   - Extracts 10-30 visual scenes from story
   - Extracts all characters and locations
   - Generates initial prompts with inline entity descriptions
   - Stores entities in Zustand store

3. **Characters Tab** (NEW!)
   - Shows all extracted characters (e.g., Clone, Morrison, Pacino, Caesar, etc.)
   - Shows all extracted locations (e.g., Cobb County interrogation room, courtroom)
   - Each entity shows:
     - Name
     - @tag (e.g., @clone)
     - Visual description
     - "Assign Ref" button (placeholder)
     - "Edit" button to modify name/description

4. **Shots Review Tab**
   - Shows all extracted shots with prompts
   - Prompts use inline @tags or descriptions based on reference assignment

5. **Generation Queue Tab**
   - Queue shots for generation
   - Monitor progress

## 🔧 Current Limitations / TODO

### 1. **Reference Picker Dialog** (High Priority)
**Status**: Placeholder only - logs to console

**What's Needed**:
- Create a dialog/modal that opens when "Assign Ref" is clicked
- Show user's Gallery images in a grid
- Allow user to select an image as reference for the character/location
- Save `referenceImageUrl` to entity in store

**Where to Implement**:
- `EntitiesSection.tsx` line 55: `handleAssignReference()`
- Likely reuse existing Gallery components from `src/features/gallery/`

### 2. **Prompt Regeneration After Reference Assignment** (High Priority)
**Status**: Initial prompts generated, but not regenerated after user assigns references

**What's Needed**:
- After user assigns a reference image to an entity, regenerate ALL prompts
- Call `LLMService.generateImagePrompt()` again with updated reference map
- Update shots in database and store

**Where to Implement**:
- `StoryCreatorDesktop.tsx`: Add handler that listens for entity updates
- Check if `referenceImageUrl` changed
- Regenerate prompts for all affected shots

### 3. **Build Reference Images Map** (Required for #2)
**Status**: `generateImagePrompt()` accepts `referenceImages?: Map<string, string>` but nothing builds this map yet

**What's Needed**:
- Build `Map<string, string>` from `extractedEntities` array
- Key: entity.tag (e.g., "clone")
- Value: entity.referenceImageUrl (if assigned)
- Pass this map when regenerating prompts

### 4. **Supabase Credentials** (Blocking Production Build)
**Status**: .env.local only has Requesty API key

**What's Needed** (from `.env.example`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_service_role_key_here
```

## 📝 Code Architecture

### Component Hierarchy
```
StoryCreatorDesktop (Main orchestrator)
├── StoryInputSection (Tab 1)
├── EntitiesSection (Tab 2 - NEW!)
│   ├── Character Cards (Scrollable)
│   └── Location Cards (Scrollable)
├── ShotsReviewSection (Tab 3)
└── GenerationQueueSection (Tab 4)
```

### Data Flow
```
Story Text
    ↓
LLMService.extractScenes() + extractEntities()
    ↓
Store in Zustand (setExtractedEntities, setShots)
    ↓
Display in EntitiesSection
    ↓
User assigns references (TODO: picker dialog)
    ↓
Regenerate prompts (TODO: with reference map)
    ↓
Update shots in DB and store
```

### Key Files Modified/Created
- ✅ `src/features/story-creator/components/sections/EntitiesSection.tsx` (NEW - 255 lines)
- ✅ `src/features/story-creator/components/desktop/StoryCreatorDesktop.tsx` (MODIFIED - added entities tab)
- ✅ `src/features/story-creator/services/llm.service.ts` (CREATED - 264 lines)
- ✅ `src/features/story-creator/store/story-creator.store.ts` (READ - already had entity management)
- ✅ `src/features/story-creator/types/story.types.ts` (READ - ExtractedEntity type already defined)

## 🚀 Next Steps

### Immediate (High Priority)
1. **Implement Reference Picker Dialog**
   - Reuse Gallery components
   - Wire up to `handleAssignReference()` in EntitiesSection
   - Save selected image URL to entity

2. **Add Prompt Regeneration Logic**
   - Build reference images map from entities
   - Regenerate prompts when references change
   - Update shots in DB and store

### Future Enhancements
- Add bulk reference assignment (select multiple characters at once)
- Show reference image thumbnail in entity card
- Add "Skip" option to bypass entities tab
- Add entity filtering/search for long stories
- Export/import entity reference mappings

## 📊 Scale Testing

**Test Story**: "The Weight of Words" (~7000+ words, 8 chapters, 10+ characters)

**Expected Results**:
- 15-30 extracted scenes (based on 12000 char limit in LLM service)
- 10+ characters: Clone, Morrison, Pacino, Caesar, Lady Muscle, SOS, Hurt, Muscle, etc.
- 5+ locations: Interrogation room, courtroom, prison, street corners, etc.

**Performance**: LLM extraction tested successfully with excerpt (4 scenes, 2 characters, 1 location)

## 🎉 Summary

The Characters/Entities panel is **functionally complete** for reviewing and editing extracted entities. The workflow integrates seamlessly into the Story Creator tabs.

**What works:**
✅ LLM extraction of characters and locations
✅ Display in tabbed UI with edit capability
✅ Inline name replacement in prompts (@tags or descriptions)
✅ Automatic tab navigation based on extraction results
✅ Test story with realistic scale (Clone RICO case)

**What's needed to complete:**
🔧 Reference picker dialog (connect to Gallery)
🔧 Prompt regeneration after reference assignment
🔧 Build reference images Map from entities array

**Estimated effort for remaining work**: ~2-3 hours
