# Feature Analysis: Directors Palette v2 - User Flows & Edge Cases

**Analysis Date**: February 27, 2026
**Analyzer Role**: UX Flow Analyst & Requirements Engineer

---

## Executive Summary

This analysis examines nine interconnected issues spanning three feature areas:
1. **Reference Library & Tags** (Issues 1-3): Tag lifecycle, category consistency, auto-save
2. **Writing Studio** (Issues 4-7): Draft preservation, line selection, Idea Bank architecture
3. **System-Wide** (Issues 8-9): Image generation model selection, artist creation robustness

The analysis identifies **23 critical flow gaps** across these areas, with particular concern for data loss scenarios (Issue 4), inconsistent category systems (Issue 3), and null-safety issues causing crashes (Issue 9).

---

# ISSUE 1: Reference Library Tag Deletion Sync

## User Flow Overview

```
HAPPY PATH - Tag Lifecycle:
┌─ Add Image with Tags ─→ Image in Library ─→ Tags Usable in Prompts ─→ Delete Image
│                          @tag1, @tag2         @tag1 @tag2 work         (DELETE)
│                                               in Shot Creator
└─────────────────────────────────────────────────────────────────────────→ Tag SHOULD disappear
                                                                         from everywhere

CURRENT BROKEN PATH:
┌─ Add Image ─→ Reference Row Created ─→ Tags in Prompts Work ─→ Delete Reference Row
│              @tag1, @tag2              @tag1, @tag2 match       (@tag1 and @tag2 still
│                                        images correctly         work in prompts even
└─────────────────────────────────────────────────────────────── though source deleted!)
```

### Permutation Matrix - Tag Deletion Scenarios

| Scenario | User State | Tag State | Where Tag Used | Current Behavior | Expected Behavior |
|----------|-----------|-----------|-----------------|-----------------|-----------------|
| 1.1 | Delete unused image | @tag1, @tag2 in library | Not in any prompt | Tag removed from DB but orphaned | Clean removal ✓ (works accidentally) |
| 1.2 | Delete image with tag in active prompt | @tag1, @tag2 in use | In Shot Creator prompt field | @tag1, @tag2 still autocomplete/match | Should stop matching |
| 1.3 | Delete image, then generate new image | @tag1, @tag2 deleted | Was in prompt, now stale | Old reference still matches if typed manually | Should not match at all |
| 1.4 | Multiple images same tag | @tag1 on img1, img2 | @tag1 in prompt | Delete img1 - @tag1 still valid because img2 exists | Correct behavior, but no verification |
| 1.5 | Delete then recreate image | @tag1 deleted, re-added | Used to be in prompts | @tag1 reappears in results | Correct but creates orphaned data |
| 1.6 | Tag used in Unified Gallery | @tag1 searched in gallery | User filtering by @tag1 | Deleted image still appears in search | Gallery shows wrong results |
| 1.7 | Batch delete multiple images | Multiple @tags | Multiple prompts using tags | No cascade delete | Orphaned tags in database |

### Critical Flow Paths

**1A. Active Tag Reference Flow**
```
User Creates Shot Creator Prompt:
  "a beautiful portrait @character-archetype"
    ↓
Reference Library resolves @character-archetype:
  - DB Query: SELECT * FROM reference WHERE tags @> '["character-archetype"]'
  - Returns: [Image A, Image B] (both used as visual references)
    ↓
User Deletes Image A from Library:
  - Calls deleteReference(imageA_id)
  - Removes reference row from DB
  - draftOptions: [] (cleared on section switch - see Issue 4)
    ↓
Later, User Regenerates Shot:
  - @character-archetype autocomplete still shows Image A
  - BUT Image A not in reference table anymore
  - Prompt might not match correctly
  - User sees no image preview
  - Result: Confusion and silent failure
```

**1B. Unified Gallery Tag Filtering Flow**
```
User Opens Unified Gallery:
  - Filters by "places" category
  - Searches for @urban-street tag
    ↓
Gallery queries:
  - reference table: SELECT * FROM reference WHERE tags @> '["urban-street"]'
  - Gets: [Image X, Image Y, Image Z]
    ↓
User Deletes Image Y from library in another tab:
  - Reference row deleted immediately
  - Gallery still shows cached Image Y
  - Or Gallery shows stale result after refresh
    ↓
User clicks on deleted Image Y:
  - 404 error or broken image
  - No graceful handling
```

### Missing Specifications & Gaps

**Category: Data Consistency**
1. **Gap 1.1**: No cascade delete logic
   - When deleteReference() called, only reference row deleted
   - Images still appear in Unified Gallery because they're from gallery table
   - Tags not indexed separately for cleanup
   - **Missing**: Logic to invalidate gallery caches when reference deleted

2. **Gap 1.2**: Tag resolution strategy undefined
   - How does tag autocomplete work? (parse-reference-tags.ts?)
   - Is it DB query or in-memory cache?
   - What happens when tag has 0 matches?
   - **Missing**: Error handling for orphaned tags in prompts

3. **Gap 1.3**: No tag orphan cleanup
   - If reference deleted, tag still in database
   - No mechanism to find/clean orphaned tags
   - **Missing**: Orphan detection/cleanup utility

4. **Gap 1.4**: Unified Gallery sync undefined
   - Gallery uses gallery.public_url (from gallery table)
   - Reference uses reference.tags (from reference table)
   - These can diverge if reference deleted
   - **Missing**: Query strategy - join reference to gallery or separate queries?

**Category: Error Handling**
5. **Gap 1.5**: No validation on tag deletion
   - Deleting image doesn't warn about active references
   - No check for "is this tag used in any prompts?"
   - User gets no feedback on impact
   - **Missing**: Pre-deletion validation and warning

6. **Gap 1.6**: Autocomplete doesn't validate existence
   - Tag autocomplete might suggest deleted images
   - No fallback when tag exists but reference deleted
   - **Missing**: Stale data handling in autocomplete

### Edge Cases Not Specified

**Case 1A: Tag orphaning through indirect deletion**
```
User creates Shot Creator prompt: "dark mood @neon-city"
  ↓
Image in reference library: id=ref-123, gallery_id=gal-456, tags=["neon-city"]
  ↓
User deletes image via gallery page (not reference library)
  ↓
Result: reference row still exists with stale gallery_id
Impact: @neon-city still matches ref-123 but link broken
```

**Case 1B: Concurrent deletion race condition**
```
User A: Edits Shot Creator prompt, uses @historic-building
User B: Simultaneously deletes reference with @historic-building
User A: Saves prompt
User B: Refresh completes
User A: Generates shot using @historic-building
Result: What happens? Race condition on tag availability
```

**Case 1C: Tag exists but single image deleted**
```
Library has 3 images with @sunset: Image 1, 2, 3
User deletes Image 1
@sunset still valid because Images 2, 3 exist
User deletes Image 2, 3
@sunset now orphaned - should be invalid
Current: No check for "zero matching images"
```

### Critical Questions Requiring Clarification

**CRITICAL Priority**

1. **What is the source of truth for tag matching?**
   - When user types @tag in prompt, what query executes?
   - Is it: `SELECT * FROM reference WHERE tags @> '[@tag]'`?
   - Or cached in-memory tag list?
   - Or computed from gallery + reference join?
   - **Why it matters**: Determines where to fix the cascade
   - **Assumption if not answered**: Will assume DB query of reference table

2. **Should deleting a reference image warn the user?**
   - "This image with tag @tag is used in X prompts. Delete anyway?"
   - Or silent delete with orphaned tags?
   - **Why it matters**: Affects UX and data safety
   - **Assumption**: Silent delete (but this causes problems)

3. **How does tag resolution work across features?**
   - Shot Creator prompt parsing: parse-reference-tags.ts
   - Unified Gallery filtering: ShotReferenceLibrary.tsx
   - Reference autocomplete: usePromptAutocomplete.ts
   - Are these all hitting the same DB query?
   - **Why it matters**: Need single source of truth
   - **Assumption if not answered**: Will implement filtering at reference-library.service level

**IMPORTANT Priority**

4. **What happens when @tag used but no matching references?**
   - Suppress the tag in results?
   - Show grayed out?
   - Show error in prompt preview?
   - **Why it matters**: UX feedback to user
   - **Assumption**: Fail silently (problematic)

5. **Should reference deletion cascade to gallery?**
   - Or keep image in gallery, just remove reference row?
   - Current behavior: Image stays in gallery
   - **Why it matters**: Affects data model clarity
   - **Assumption if not answered**: Reference is just metadata; gallery is source of truth

6. **Is there an audit/activity log for tag deletion?**
   - Can we see which prompts used a deleted tag?
   - **Why it matters**: Debugging and user communication
   - **Assumption**: No audit trail exists

---

# ISSUE 2: Shot Creator Auto-Add to Library

## User Flow Overview

```
EXPECTED FLOW - Auto-Save to Library:
User Uploads Image ──→ Image in Reference Slot ──→ User Adds @tag ──→ Image Auto-Saves
     (paste or upload)      (preview shows)        (via InlineTagEditor)   to Library
                                                                           with that tag

CURRENT BROKEN FLOW:
User Uploads Image ──→ Image in Reference Slot ──→ User Adds @tag ──→ @tag Created
     (image loads)       (local state only)        (InlineTagEditor)   but NO Auto-Save
                         NOT in library yet                           User Must Manually
                                                                      Save to Library
```

### User Journey Permutation Matrix

| Step | User Action | Current Behavior | Expected Behavior | Gap |
|------|-------------|-------------------|-------------------|-----|
| 2.1a | Upload image to reference slot | Image in state, not in library | Image shows in state | State only - no auto-save |
| 2.1b | Click "Add tag" input | InlineTagEditor opens | Ready for tag input | ✓ Works |
| 2.2 | Type @character and press Enter | @character tag added to local state | @character tag stored | ✓ Tag added |
| 2.3 | Switch sections | Tags cleared (Issue 4) OR Tags preserved | Tags should persist | **ISSUE 4 interferes** |
| 2.4 | Expect auto-save to library | Nothing happens - no DB save | Auto-save triggered | **MISSING** |
| 2.5 | Check Reference Library | Image not there | Image appears with @character tag | **NOT IMPLEMENTED** |
| 2.6 | Generate shot | Can't use @character (no reference) | @character available as reference | **FAILS** |

### Critical Flow Paths

**2A. Tag Addition Without Auto-Save**
```
Shot Creator Reference Manager:
  - Reference Slot: <image preview>
  - @tag button clicks
  - InlineTagEditor opens and user types @character
  - OnSave callback: updateItemTags(itemId, newTags)
    ├─ This updates LOCAL component state ONLY
    ├─ Reference object: { imageData, tags: ['character'] }
    └─ NO database write occurs
  ↓
User switches sections or closes editor:
  - Tags lost when component unmounts
  - Image never added to reference table
  - @character tag never persists
  ↓
User searches reference library later:
  - Image not there (was never saved)
  - @character tag doesn't exist in reference table
  - User confused: "I added tags, where's the image?"
```

**2B. Race Condition: Upload + Tag + Generate**
```
User uploads image:
  - Creates File object
  - Converts to base64
  - Sets in local state: { imageData: "data:image/...", tags: [] }
  ↓
User adds @character tag immediately:
  - InlineTagEditor updates tags: ['character']
  - State updates: { imageData: "...", tags: ['character'] }
  ↓
User clicks Generate before auto-save completes:
  - Image not yet in reference library
  - @character tag doesn't resolve to reference
  - Shot generation might proceed without visual reference
  - Or fails silently
```

### Missing Specifications & Gaps

**Category: Feature Architecture**
1. **Gap 2.1**: No auto-save trigger defined
   - When should image be saved to reference library?
   - On tag addition? On blur? On generate? On manual save?
   - **Missing**: Specification of trigger point

2. **Gap 2.2**: No category assignment for auto-saved images
   - If auto-saving, what default category?
   - "Unorganized"? User selection first?
   - **Missing**: Category assignment logic

3. **Gap 2.3**: No clear separation of reference sources
   - Can reference slot images come from:
     - User upload (new, not in library)?
     - Library selection (already exists)?
     - Paste from clipboard?
   - Each might need different save logic
   - **Missing**: Unified reference image source handling

**Category: Integration**
4. **Gap 2.4**: InlineTagEditor doesn't trigger save
   - Component at `/src/features/shot-creator/components/creator-reference-manager/InlineTagEditor.tsx`
   - onSave callback: (newTags) => { updateItemTags(...) }
   - updateItemTags defined where? What does it do?
   - **Missing**: updateItemTags implementation details

5. **Gap 2.5**: Reference image lifecycle unclear
   - How is reference slot image stored?
   - Local state? Gallery table? Reference table?
   - Is there an imageId or galleryId available for auto-save?
   - **Missing**: Reference image source tracking

**Category: User Intent**
6. **Gap 2.6**: User expectations unclear
   - Does user expect immediate save when adding tag?
   - Or does save happen only on explicit "Save" button?
   - Or only when generating?
   - **Missing**: UX specification for save trigger

### Edge Cases Not Specified

**Case 2A: Paste image then tag**
```
User pastes image from clipboard:
  - Image loads as blob/data URL
  - No gallery_id yet (not saved)
  - User adds @pasted-reference
  ↓
What happens at auto-save?
  - Need to create gallery entry first (get gallery_id)
  - Then create reference with that gallery_id and tags
  - Current code only updates tags on existing reference
  - Result: Two-step save required, but not specified
```

**Case 2B: Upload same image twice with different tags**
```
User uploads Image A, adds @version1, saves
Reference table: { gallery_id=gal-100, tags=['version1'] }
  ↓
User uploads same Image A again, adds @version2
Gallery table now has: [gal-100, gal-101] (duplicate images)
  ↓
Should auto-save:
  - Create new reference for gal-101 with @version2?
  - Or recognize duplicate and update existing reference?
  - **Missing**: Deduplication logic
```

**Case 2C: Reference slot image cleared**
```
User uploads image + tags:
  { imageData: "...", tags: ['character'] }
  ↓
User clears reference slot (remove button?):
  { imageData: null, tags: ['character'] }
  ↓
Should auto-save:
  - Clear the reference?
  - Keep it?
  - **Missing**: Clear semantics
```

### Critical Questions Requiring Clarification

**CRITICAL Priority**

1. **What is the trigger for auto-save?**
   - On tag addition? (Immediately)
   - On blur/focus loss? (After user finishes)
   - On generate click? (Before generation)
   - Manual explicit save button?
   - **Why it matters**: Determines implementation point
   - **Assumption if not answered**: Will implement on tag save with confirmation

2. **What gallery_id does the auto-save use?**
   - If user uploads image, is gallery entry already created?
   - Or does auto-save need to create it first?
   - **Why it matters**: Affects API flow
   - **Assumption**: Image already in gallery (from Shot Creator upload), just need reference row

3. **What happens if auto-save fails?**
   - Network error during reference creation?
   - User gets notified? Silent fail?
   - Tags stay in UI but reference not saved?
   - **Why it matters**: Error recovery
   - **Assumption**: Silent fail (problematic)

**IMPORTANT Priority**

4. **Should user see confirmation before auto-save?**
   - "Add to library with tag @character?"
   - Or completely silent?
   - **Why it matters**: UX clarity
   - **Assumption**: Silent

5. **Can user cancel the auto-save?**
   - "I added tag but don't want to save to library"
   - **Why it matters**: Workflow flexibility
   - **Assumption**: No cancel mechanism

6. **Does auto-save also set category or use default?**
   - If saving reference, need category
   - Default to "unorganized"?
   - Prompt user to categorize?
   - **Why it matters**: Library organization
   - **Assumption**: Default category

---

# ISSUE 3: Category Mismatch

## User Flow Overview

```
INCONSISTENT CATEGORY SYSTEM:

Filter Tabs (ShotReferenceLibrary.tsx lines 85-101):
┌─ All
├─ People
├─ Places
├─ Props
└─ Layouts
   (5 categories - includes "Layouts")

Category Dropdown (ShotReferenceLibrary.tsx lines 220-231):
┌─ People
├─ Places
├─ Props
└─ Unorganized
   (4 categories - includes "Unorganized", no "Layouts")
```

### User Journey Permutation Matrix

| Scenario | User Action | Filter Tab | Edit Dropdown | Expected | Reality |
|----------|-------------|-----------|--------------|----------|---------|
| 3.1 | Add image, select "Layouts" in filter | Available in filter | Not available in edit | Category saved as "layouts" | ERROR: Category not saveable |
| 3.2 | Add image with "Unorganized" in edit | Not visible in filter | Available in edit | Can set, can filter | Category saved but "All" shows it, not "Unorganized" tab |
| 3.3 | View library, filter by "Layouts" | Clicks tab | No images appear | Shows layout images | Tab broken or no data |
| 3.4 | Edit existing image | Has category "layouts" | Opens dropdown | Can change category | "Layouts" option missing, user can't revert |
| 3.5 | Change image from category A to "Unorganized" | Selects from dropdown | Click "Unorganized" | Saved with category="unorganized" | Works, but inconsistent with filter tabs |
| 3.6 | Export/Import library data | Categories: people, places, props, layouts, unorganized | Category list in export | All 5+ categories | Only 4 available after import |

### Critical Flow Paths

**3A. Create-then-Edit Category Mismatch**
```
User creates new image, saves with "Layouts":
  - Clicks hover actions
  - DropdownMenu shows: People, Places, Props, Unorganized
  - "Layouts" NOT in dropdown
  - User selects "Props" instead
  - Image saved with category="props"
  ↓
User wants to see layout images:
  - Clicks "Layouts" tab at top
  - Filter applies: category='layouts'
  - No results (all layout images wrongly categorized as props)
  ↓
User tries to fix it:
  - Clicks edit button on "props" image
  - Dropdown still shows: People, Places, Props, Unorganized
  - NO "Layouts" option
  - Cannot change back to intended category
```

**3B. Filter Tab vs Dropdown Divergence**
```
Database state:
  reference table has categories: [
    { id: ref-1, category: 'people' },
    { id: ref-2, category: 'places' },
    { id: ref-3, category: 'props' },
    { id: ref-4, category: 'layouts' },      // ← Can't edit this!
    { id: ref-5, category: 'unorganized' }   // ← Can't filter by this tab!
  ]

User clicks "Layouts" tab:
  - Query: SELECT * FROM reference WHERE category='layouts'
  - Returns: ref-4
  - Displays correctly in grid

User tries to edit ref-4:
  - Dropdown options: People, Places, Props, Unorganized
  - "Layouts" missing
  - User can't confirm or change layout category
  - If selects "Props" by mistake, category changes wrong
```

**3C. New vs Existing Image Category Flow**
```
Creating new reference (CategorySelectionDialog.tsx):
  - Categories available: people, places, props, unorganized
  - "Layouts" NOT mentioned anywhere
  - User cannot initially categorize as "layouts"

Editing existing reference (ShotReferenceLibrary.tsx):
  - Filter shows: all, people, places, props, layouts
  - Edit dropdown shows: people, places, props, unorganized
  - If image category='layouts' in DB:
    - User can filter and see it
    - User cannot edit its category
```

### Missing Specifications & Gaps

**Category: Data Model Consistency**
1. **Gap 3.1**: Two separate category lists
   - Filter tabs: all, people, places, props, layouts
   - Edit dropdown: people, places, props, unorganized
   - No single source of truth
   - **Missing**: Canonical category list definition

2. **Gap 3.2**: "Layouts" category definition unclear
   - Available in filter but not in edit
   - Never mentioned in CategorySelectionDialog
   - How do "layouts" get created?
   - **Missing**: Specification of how layouts are added

3. **Gap 3.3**: "Unorganized" vs "All" relationship unclear
   - Is "All" = all categories including unorganized?
   - Is "All" = union of people+places+props+layouts?
   - What if image has no category?
   - **Missing**: Category fallback semantics

**Category: UI Consistency**
4. **Gap 3.4**: Two different UI components for category selection
   - CategorySelectionDialog (line 36-40): Used on create, shows 4 options
   - ShotReferenceLibrary dropdown (line 220-231): Used on edit, shows 4 different options
   - Why are they different?
   - **Missing**: Unified category picker

5. **Gap 3.5**: No enumeration of valid categories
   - Constants at line 51-56: `categories = [...4 items...]`
   - Filter config at line 15-21: `categoryConfig = {...5 items...}`
   - Two separate definitions with partial overlap
   - **Missing**: Single enum or constant

**Category: Database Integrity**
6. **Gap 3.6**: No validation on category values
   - Can user set category to arbitrary string?
   - Or must match enum?
   - `updateReferenceCategory()` accepts any string
   - **Missing**: Category value validation

### Edge Cases Not Specified

**Case 3A: Migration scenario**
```
Old data in database has categories:
  ['people', 'places', 'props', 'layouts', 'unorganized', 'custom-category']

User opens library with new code:
  Filter tabs show: all, people, places, props, layouts
  Dropdown shows: people, places, props, unorganized

What happens to images with:
  - category='layouts'? (In filter, can see, but can't edit)
  - category='custom-category'? (In filter as "All", edit as "unorganized"?)
  - category=null? (Not in any tab? Or in "All"?)
```

**Case 3B: Concurrent UI update**
```
User A views library, sees image with category='layouts'
User B edits same image, changes from 'layouts' to 'props'
User A refresh page

Expected:
  - Image appears in "Props" tab

What if filter tabs are cached client-side?
  - Image still shows in "Layouts" tab until refresh
  - Stale category display
```

**Case 3C: Empty or null category**
```
Database has reference with:
  { gallery_id: 'gal-123', category: null, tags: ['tag1'] }

Query: SELECT * FROM reference WHERE category='layouts'
  - Does null match any filter?
  - Image invisible?
  - Shows in "All"?
  - Shows in "Unorganized"?
```

**Case 3D: Reference table migration**
```
At time T1: reference table categories are [people, places, props, unorganized]
New code deployed: Filter adds 'layouts' category
At time T2: Some code path creates reference with category='layouts'
At time T3: Code reverted: Filter goes back to 4 categories

Result: Database has orphaned categories
Next edit dropdown update: Missing categories again
```

### Critical Questions Requiring Clarification

**CRITICAL Priority**

1. **What is the canonical list of categories?**
   - Should be: people, places, props, layouts, unorganized?
   - Or: people, places, props, unorganized?
   - Or: people, places, props, layouts (no unorganized)?
   - **Why it matters**: Entire feature depends on this
   - **Assumption if not answered**: Will use all 5: people, places, props, layouts, unorganized

2. **Why do CategorySelectionDialog and ShotReferenceLibrary dropdown differ?**
   - CategorySelectionDialog: people, places, props, unorganized
   - ShotReferenceLibrary: people, places, props, unorganized (but filter shows layouts)
   - Are they intentionally different?
   - **Why it matters**: Could be deliberate design or accidental inconsistency
   - **Assumption**: Accidental inconsistency to be fixed

3. **What is "Layouts" used for?**
   - Shot compositions/framing?
   - Page layouts?
   - Wardrobe layouts?
   - UI layouts?
   - **Why it matters**: Determines whether to keep or remove
   - **Assumption**: Shot composition/frame layouts

**IMPORTANT Priority**

4. **Should there be an "Unorganized" tab in filter?**
   - Current: all, people, places, props, layouts
   - Should it be: all, people, places, props, layouts, unorganized?
   - **Why it matters**: User expectation of filtering
   - **Assumption**: Yes, should exist for completeness

5. **What happens to images with null/empty category?**
   - Default to "unorganized"?
   - Show warning?
   - Hide until categorized?
   - **Why it matters**: Data integrity
   - **Assumption**: Default to "unorganized"

6. **Should category be editable or immutable after creation?**
   - Can user change people→places?
   - Or locked on initial selection?
   - **Why it matters**: Workflow flexibility
   - **Assumption**: Fully editable

---

# ISSUE 4: Writing Studio Content Loss Bug

## User Flow Overview

```
CONTENT LOSS SCENARIO:

User working on Verse Section:
  Text: "I was born under a neon sky"
  Selects Draft Option 1
  Locked Section: YES
  ↓
User switches to Hook Section (clicks tab):
  Section changed
  draftOptions cleared: []
  ↓
CONTENT LOST!
  User returns to Verse:
    - Section still locked
    - selectedDraft still exists (JSON persisted)
    - BUT draftOptions = [] (cleared on setActiveSection)

If User Edits While Viewing Verse Again:
  - Can edit the selectedDraft directly
  - BUT generates new options, overwrites selectedDraft
  - If user didn't save, lost forever

If User Switches Away During Edit:
  - draftOptions cleared
  - selectedDraft might be in-between state
  - Results in corruption
```

### User Journey Permutation Matrix

| Step | Section | Action | Draft State | draftOptions | Result |
|------|---------|--------|-------------|--------------|--------|
| 4.1a | Verse | Generate options | selectedDraft=null | [opt1, opt2, opt3, opt4] | ✓ Options shown |
| 4.1b | Verse | Select Option 2 | selectedDraft=opt2 | [] (cleared) | ✓ Draft locked |
| 4.2a | Hook | Click Hook tab | switchActiveSection() | draftOptions=[] | ✓ Switch works |
| 4.2b | Hook | Generate options | selectedDraft=null | [opt1, opt2, opt3, opt4] | ✓ New options |
| 4.3a | Verse | Click Verse tab | switchActiveSection() | draftOptions=[] | ✗ Options gone |
| 4.3b | Verse | selectedDraft exists | editableContent=opt2 | [] | ✗ Can see locked draft but not options |
| 4.4a | Verse | Edit locked draft inline | editDraft() | draftOptions=[] | ✓ Edit works (editDraft in store) |
| 4.4b | Verse | Generate (click button while editing) | Overwrites selectedDraft | draftOptions=[new] | ✗ Loses inline edits if not saved |
| 4.5a | Verse | Want to toss this option, keep last | selectedDraft=opt2 | [] | ✗ Can't toss (no options to toss) |
| 4.5b | Verse | Want to chop (save to idea bank) | selectedDraft=opt2 | [] | ✗ Can't chop (no draft in options) |

### Critical Flow Paths

**4A. Content Loss on Section Switch**
```
Writing Studio Store (writing-studio.store.ts line 103):
  setActiveSection: (id) => set({
    activeSectionId: id,
    draftOptions: []
  })

User Journey:
1. Verse Section open:
   - state = {
       activeSectionId: 'verse-1',
       sections: [{ id: 'verse-1', selectedDraft: DraftOption }],
       draftOptions: [opt1, opt2, opt3, opt4]
     }

2. User clicks Hook tab:
   - Calls setActiveSection('hook-1')
   - State becomes: {
       activeSectionId: 'hook-1',
       draftOptions: []  ← CLEARED!
     }

3. User switches back to Verse:
   - Calls setActiveSection('verse-1')
   - State becomes: {
       activeSectionId: 'verse-1',
       draftOptions: []  ← STILL CLEARED!
     }
   - Verse still has selectedDraft (persisted to localStorage)
   - But draftOptions empty
   - Result: User sees locked draft but can't see "Toss" or "Chop" buttons
```

**4B. Edit During Generation Race Condition**
```
User editing locked Verse draft inline:
  - Calls editDraft('verse-opt2-id', 'new text content')
  - Updates draftOptions[2].content = 'new text content'
  - Sees changes in editor

User clicks Generate before finishing edit:
  - Calls generateOptions('verse-1', ...)
  - Sets draftOptions: [] (line 133)
  - Starts async API call
  - Then sets draftOptions: [new results] (line 155)
  - Original edits discarded
  - User's inline edit lost

User saves (Keep button):
  - But if it completes before Generate calls API
  - keepDraft() might save the edited version
  - Race condition outcome unclear
```

**4C. Idea Bank Loss on Switch**
```
User chopping draft from Verse:
  - Calls chopDraft(selectedDraft, tags)
  - Function: draftOptions = draftOptions.filter(d => d.id !== draft.id)
  - So removes from draftOptions

User doesn't click "Save to Idea Bank" immediately:
  - But switching sections clears draftOptions anyway
  - What if user comes back?
  - Is the chopped draft still pending in ideaBank state?
  - Or lost because it was also in draftOptions?
```

### Missing Specifications & Gaps

**Category: State Management**
1. **Gap 4.1**: draftOptions cleared on section switch
   - Line 103: `setActiveSection: (id) => set({ activeSectionId: id, draftOptions: [] })`
   - Why is draftOptions tied to section switching?
   - Are draftOptions inherently per-section or global?
   - **Missing**: Specification of draftOptions scope

2. **Gap 4.2**: selectedDraft vs draftOptions relationship unclear
   - selectedDraft is persisted (in localStorage)
   - draftOptions is cleared on switch (not persisted)
   - What's the difference? When is each used?
   - **Missing**: Clear state design documentation

3. **Gap 4.3**: No per-section draft options storage
   - Could store: `sections[i].draftOptions` instead of global `draftOptions`
   - Current design prevents restoring options on section return
   - **Missing**: Decision to centralize vs decentralize draft state

**Category: UI/UX**
4. **Gap 4.4**: No visual indication of unsaved edits
   - User edits locked draft inline
   - No asterisk, warning, or save button
   - Switching sections loses changes silently
   - **Missing**: Unsaved edit indicator and save button

5. **Gap 4.5**: No confirmation before clearing draftOptions
   - When user switches sections, options silently cleared
   - No "You have 3 unsaved draft options, continue?"
   - **Missing**: Warning dialog

6. **Gap 4.6**: No undo/recovery for cleared draftOptions
   - Once section switched, draftOptions gone forever
   - Can't regenerate the same options (API would produce different results)
   - **Missing**: Draft history or undo mechanism

**Category: Generation Conflict**
7. **Gap 4.7**: Generate button behavior undefined with locked draft
   - If section is locked with selectedDraft
   - And user clicks Generate
   - Does it:
     a. Warn "Section locked, continue?"
     b. Unlock and regenerate?
     c. Disable button entirely?
   - **Missing**: Generate behavior with locked sections

### Edge Cases Not Specified

**Case 4A: Multi-edit scenario**
```
User working on Verse:
  - Generates options: [A, B, C, D]
  - Selects B as best so far
  - Edits B inline: "changed text"
  - Meanwhile sees other section needs work

User switches to Hook, does work, comes back to Verse:
  - draftOptions cleared
  - selectedDraft still shows B (from localStorage)
  - B shows original text (from persistent store), not edited text
  - OR B shows edited text if editDraft persisted it

Question: Is editDraft persisted?
  - If yes: Edit survives section switch ✓
  - If no: Edit lost ✗ (only in draftOptions which cleared)

Current code (line 193-198):
  editDraft: (draftId, content) => {
    set((state) => ({
      draftOptions: state.draftOptions.map(d => ...)
    }))
  }

  Only updates draftOptions (NOT persisted)
  So edits LOST on section switch
```

**Case 4B: Concurrent generation**
```
User on Verse, clicks Generate:
  - API call starts, isGenerating=true

User switches to Hook:
  - draftOptions cleared
  - setActiveSection called

Generation completes:
  - State: { activeSectionId: 'hook-1', draftOptions: [new-verse-results] }
  - Results stored in draftOptions but section is hook!
  - Mismatch: Verse results in Hook state

User clicks "Keep" on Hook thinking it's Hook results:
  - Actually keeping Verse results
  - Song structure corrupted
```

**Case 4C: Persistence mismatch**
```
localStorage persists (line 234-238):
  - sections
  - concept
  - ideaBank

Does NOT persist:
  - draftOptions
  - isGenerating
  - activeSectionId

User closes and reopens app:
  - activeSectionId lost
  - setActiveSection not called
  - draftOptions stays []
  - App opens with draftOptions=[] even if they had options before

Question: What's activeSectionId on reload?
  - null? (nothing selected)
  - first section? (auto-select)
  - **Missing**: Reload behavior specification
```

### Critical Questions Requiring Clarification

**CRITICAL Priority**

1. **Should draftOptions be cleared on section switch?**
   - Current: Yes, always cleared
   - Should be: Per-section or global?
   - **Why it matters**: This is the root cause of content loss
   - **Assumption if not answered**: Will move draftOptions to per-section storage

2. **Are inline edits to selectedDraft supposed to persist?**
   - User edits locked draft while viewing it
   - Should changes survive section switch?
   - Or should only Generate-then-Select count as "keeping"?
   - **Why it matters**: Data safety
   - **Assumption**: Should persist (user would expect)

3. **What happens when user generates with locked section?**
   - Replace selectedDraft?
   - Warn user?
   - Disable button?
   - Allow regenerate side-by-side?
   - **Why it matters**: Affects workflow
   - **Assumption**: Warn and allow if user confirms

**IMPORTANT Priority**

4. **Should switching sections require confirmation if unsaved work?**
   - "You have 3 draft options, leave without saving?"
   - Or silently allow switching?
   - **Why it matters**: UX friction vs data safety
   - **Assumption**: Confirmation dialog recommended

5. **Should edited drafts be marked as "edited"?**
   - Visual indicator that locked draft differs from generated?
   - So user knows to Save?
   - **Why it matters**: UX clarity
   - **Assumption**: Yes, show indicator

6. **What is activeSectionId on app reload?**
   - Persist to localStorage?
   - Auto-select first section?
   - Start null/none?
   - **Why it matters**: UX continuity
   - **Assumption**: Persist to localStorage

---

# ISSUE 5: Chop UX Improvement - Line Selection

## User Flow Overview

```
CURRENT BEHAVIOR - Chop Saves Entire Draft:
User selects Draft Option 2
  "I was born under a neon sky / City lights reflecting in my eyes"
  ↓
Clicks "Chop" button
  ↓
Entire draft saved to Idea Bank: "I was born under a neon sky / City lights reflecting in my eyes"
  ↓
User might only want line 1, not line 2
  ↓
Work duplication: User manually edits idea bank to remove line 2

DESIRED BEHAVIOR - Chop with Line Selection:
Draft Option 2:
  Line 1: "I was born under a neon sky"
  Line 2: "City lights reflecting in my eyes"
  ↓
User selects Line 1 only
  ↓
Clicks "Chop" button
  ↓
Only Line 1 saved to Idea Bank: "I was born under a neon sky"
```

### User Journey Permutation Matrix

| Scenario | Text Selection | Action | Current Behavior | Expected | Gap |
|----------|----------------|--------|-------------------|----------|-----|
| 5.1 | No selection | Click Chop | Full draft saved | Save selected text or full | No line selection |
| 5.2 | Line 1 selected | Click Chop | Full draft saved (selection ignored) | Save line 1 only | Selection not used |
| 5.3 | Multiple lines selected | Click Chop | Full draft saved (selection ignored) | Save selection | Multi-line not handled |
| 5.4 | Partial line selected | Click Chop | Full draft saved | Save partial text | Truncation handling missing |
| 5.5 | After Chop, edit idea | Idea Bank open | Shows full draft | Shows only selected line | Can't verify what was chopped |
| 5.6 | Chop multiple lines from same draft | Chop Line 1, then Line 2 | Two entries, full draft each | Two entries, specific lines | Duplicate content |

### Critical Flow Paths

**5A. Partial Selection Workflow**
```
OptionGrid.tsx renders draft with clickable text:
  <div className="draft-text" onClick={...}>
    I was born under a neon sky
    City lights reflecting in my eyes
    Standing alone where the streetlights die
  </div>

User selects lines 1-2:
  - Uses native browser selection (getSelection())
  - selectedText = "I was born under a neon sky\nCity lights reflecting in my eyes"

User clicks Chop:
  - Current: chopDraft(draft, tags)
  - Calls: addToIdeaBank(draft.content, tags, 'chopped')
  - Saves: Full draft.content (all 3 lines)
  - Lost: User's selection

Expected:
  - Reads selected text: window.getSelection().toString()
  - Saves: selectedText (lines 1-2 only)
  - Result: "I was born under a neon sky\nCity lights reflecting in my eyes"
```

**5B. Multiple Chops from Same Draft**
```
User has draft with 4 lines
  Line 1: "Born under neon"
  Line 2: "Reflecting in my eyes"
  Line 3: "Standing alone"
  Line 4: "Streetlights die"

Workflow:
1. Select Line 1, Chop:
   - Idea Bank: ["Born under neon"]

2. Select Line 2, Chop:
   - Idea Bank: ["Reflecting in my eyes", "Born under neon"]

3. Select Lines 3-4, Chop:
   - Idea Bank: ["Standing alone / Streetlights die", "Reflecting in my eyes", "Born under neon"]

Current behavior:
  - If all 3 Chops happen before Generate
  - All three create separate Idea Bank entries
  - Correct (no draftOptions clear interference - that's Issue 4)
  - But each entry might have full draft content instead of selected text
```

**5C. No Selection / Full Draft**
```
User opens OptionGrid, sees Draft 3
User doesn't select anything (no text highlighted)
User clicks Chop

Should behavior be:
  a. Save full draft (no selection = save all)
  b. Ask user to select text first
  c. Open editor to select specific lines

Current: Saves full draft (a)
Expected: Probably also (a), but should be clear
```

### Missing Specifications & Gaps

**Category: UI Implementation**
1. **Gap 5.1**: No text selection UI
   - OptionGrid doesn't show selection state
   - No highlight on selected text
   - No indication of what would be saved
   - **Missing**: Selection visualization

2. **Gap 5.2**: No selection API usage
   - chopDraft() ignores current text selection
   - Doesn't call window.getSelection()
   - Doesn't check if text highlighted
   - **Missing**: Selection reading logic

3. **Gap 5.3**: No feedback on Chop action
   - User clicks Chop, no confirmation
   - No indication of what was saved
   - No "Chopped to Idea Bank" message
   - **Missing**: Action feedback

**Category: UX Clarity**
4. **Gap 5.4**: Selection behavior undefined
   - If user selects text and clicks Chop, what happens?
   - Current assumption: Full draft saved (but should we verify?)
   - Expected: Selected text saved
   - **Missing**: Specification of intent

5. **Gap 5.5**: Editor vs Selection mode unclear
   - Could allow clicking lines to select them
   - Or use native browser selection
   - Or open mini-editor for line selection
   - **Missing**: Interaction model specification

6. **Gap 5.6**: Tag assignment with line selection
   - When chopping "Line 1", what tags?
   - Same tags as full draft?
   - Or user can customize per-line tags?
   - **Missing**: Tag handling with partial content

### Edge Cases Not Specified

**Case 5A: Partial word selection**
```
User selects: "born under a neon" (missing first "I was" and last "sky")
Chops this partial line

Idea Bank entry: "born under a neon"

Later, user copies to use in own lyric:
  - Looks awkward without "I was ... sky"
  - But user wanted just the phrase, not full line
  - Is this valid use case or edge case?
```

**Case 5B: Multi-line with mixed emphasis**
```
Draft has:
  Line 1: "Normal lyric text"
  Line 2: [Chorus] "Special line"
  Line 3: "Another normal line"

User selects Lines 1-3:
  - Should [Chorus] tag be preserved?
  - Or stripped when saved to Idea Bank?
  - Format preserved or plain text?
```

**Case 5C: Selection across stanza break**
```
Draft rendered as:
  [Verse 1]
  Line A
  Line B
  [Verse 2]
  Line C

User tries to select Line B through Line C (crosses stanza boundary):
  - What gets selected?
  - Just Line B?
  - Line B + stanza label + Line C?
  - Should UI prevent this?
```

**Case 5D: Empty selection then Chop**
```
User clicks somewhere in draft but doesn't drag (no selection)
Clicks Chop

Should behavior be:
  - Save full draft (current)
  - Do nothing / warn (better UX)
  - Ask "Full draft or select text?" (explicit)
```

### Critical Questions Requiring Clarification

**CRITICAL Priority**

1. **Should Chop use text selection or UI selection?**
   - Browser text selection (getSelection())?
   - Or click-based line selection in UI?
   - Or dropdown to choose lines?
   - **Why it matters**: Determines implementation approach
   - **Assumption if not answered**: Browser text selection (standard interaction pattern)

2. **What if user clicks Chop with no selection?**
   - Save full draft (current behavior)?
   - Show warning: "Select text first"?
   - Open selection UI?
   - **Why it matters**: UX clarity
   - **Assumption**: Save full draft as fallback

**IMPORTANT Priority**

3. **Should tags be applied to selected text or full draft?**
   - If user selects "neon sky" and adds tag @mood
   - Does tag apply to just that phrase?
   - Or to the full draft entry?
   - **Why it matters**: Idea Bank organization
   - **Assumption**: Apply to saved text (however much selected)

4. **Can user select from multiple drafts and chop together?**
   - Or chop is per-draft only?
   - **Why it matters**: Combines multiple snippets
   - **Assumption**: Per-draft only for now

5. **Should Chop action show confirmation?**
   - "Save selected text to Idea Bank?"
   - Or silent save with toast notification?
   - **Why it matters**: UX feedback
   - **Assumption**: Toast notification sufficient

---

# ISSUE 6: Idea Bank Per-Artist

## User Flow Overview

```
CURRENT - Global Idea Bank:
┌─ Artist: Drake
│  └─ Writing Studio
│     └─ Idea Bank (localStorage: "writing-studio")
│        ├─ Lyric idea 1 (Drake style)
│        ├─ Lyric idea 2 (Drake style)
│
├─ Artist: Kendrick
│  └─ Writing Studio
│     └─ Idea Bank (same localStorage: "writing-studio")
│        ├─ Drake idea 1 (wrong artist!)
│        ├─ Drake idea 2 (wrong artist!)
│        ├─ Kendrick idea 1
│        ├─ Kendrick idea 2

PROBLEM: Drake's ideas show up in Kendrick's Idea Bank!
```

### User Journey Permutation Matrix

| Step | Artist | Action | Idea Bank State | Expected | Reality |
|------|--------|--------|-----------------|----------|---------|
| 6.1a | Drake | Open Writing Studio | Empty | Just Drake's ideas | Shows all ideas |
| 6.1b | Drake | Add idea "Drake line 1" | ideaBank=['Drake line 1'] | Drake's bank only | Global store |
| 6.2a | Switch to Kendrick | Open Writing Studio | Empty or Kendrick's ideas | Only Kendrick's ideas | Shows Drake's + Kendrick's |
| 6.2b | Kendrick | Add idea "Kendrick line 1" | ideaBank=['Drake line 1', 'Kendrick line 1'] | 2 ideas, both Kendrick's | But one is Drake's! |
| 6.3a | Drake | Return to Drake | Filter/View Drake ideas | Drake's bank only | Sees Kendrick's too |
| 6.4a | Delete idea | Delete "Kendrick line 1" while on Kendrick | Drake's ideas still exist | Drake's bank unchanged | Correct, but confusing |
| 6.5a | Export lyrics | Save Kendrick's ideas | Export only Kendrick's | All Kendrick ideas | Includes Drake's |

### Critical Flow Paths

**6A. Cross-Artist Idea Pollution**
```
Writing Studio Store (writing-studio.store.ts):
  persist(
    (set, get) => ({
      // ...
      ideaBank: [],
      addToIdeaBank: (text, tags, source) => {
        const entry: IdeaEntry = { ... }
        set((state) => ({
          ideaBank: [entry, ...state.ideaBank]
        }))
      },
    }),
    {
      name: 'writing-studio',  // localStorage key: "writing-studio"
      partialize: (state) => ({
        sections: state.sections,
        concept: state.concept,
        ideaBank: state.ideaBank,
      }),
    }
  )

Browser localStorage:
  writing-studio: {
    sections: [...Drake's sections...],
    concept: "Drake album",
    ideaBank: [
      { text: "born under neon", source: "chopped" },
      { text: "cash rules everything", source: "manual" },
      { text: "kung fu grip", source: "chopped" },
      ... more Drake ideas ...
    ]
  }

User switches to Kendrick Artist:
  - ArtistDnaStore loads Kendrick profile
  - Writing Studio still uses same localStorage key: "writing-studio"
  - LoadingState: ideaBank = Drake's ideas (from storage)
  - User thinks they're Kendrick's ideas
  - User copies "born under neon" thinking it's Kendrick's style
  - But it's Drake's idea!

Workflow:
1. Drake artist open:
   - ideaBank loaded from localStorage
   - Add "city lights reflecting"
   - Store saves to localStorage["writing-studio"].ideaBank

2. Switch to Kendrick artist:
   - WritingStudioStore is SINGLETON (Zustand)
   - localStorage["writing-studio"] still has Drake's ideas
   - Hydrate reads Drake's ideaBank
   - Kendrick sees Drake's lyric!

3. Kendrick add idea:
   - "struggle and survival"
   - ideaBank becomes: ["struggle and survival", "city lights reflecting", ...]
   - Now mixed!

4. Export Kendrick's song:
   - Includes "city lights reflecting" (Drake's idea)
   - Wrong!
```

**6B. Section Switching Compounds the Problem**
```
Because sections are also global (not per-artist):

Drake Article Section Created:
  {
    id: "verse-1",
    type: "verse",
    selectedDraft: "Drake verse lyrics",
  }

Switch to Kendrick:
  - WritingStudioStore still has verse-1
  - Kendrick sees Drake's section!
  - If Kendrick starts writing, sections are mixed too

Note: Issue 4 (draftOptions cleared) actually HELPS here
  because draftOptions are transient
  But selectedDraft is persisted and WILL show Drake's content
```

### Missing Specifications & Gaps

**Category: Architecture**
1. **Gap 6.1**: Writing Studio store is global singleton
   - Line 62: `useWritingStudioStore = create<WritingStudioState>()(...)`
   - Single store shared across all artist contexts
   - No per-artist scoping
   - **Missing**: Decision to support multiple artists simultaneously or make per-artist

2. **Gap 6.2**: No artist context in Writing Studio
   - Store doesn't track which artist it belongs to
   - localStorage key doesn't include artist ID
   - No filtering by activeArtistId
   - **Missing**: Artist ID in store state

3. **Gap 6.3**: Persistence key doesn't include artist
   - localStorage key: "writing-studio" (global)
   - Should be: `writing-studio-${artistId}`
   - Or stored in artist profile (DB, not localStorage)
   - **Missing**: Per-artist storage strategy

**Category: State Management**
4. **Gap 6.4**: No reset on artist switch
   - Switching artists should reload Idea Bank for that artist
   - Currently: Old store state persists
   - **Missing**: Artist switch handler to reinitialize store

5. **Gap 6.5**: Idea Bank not in artist profile
   - ArtistDNA profile stored in DB
   - Writing Studio state stored in localStorage
   - Two separate systems
   - If user saves artist, Idea Bank doesn't save
   - **Missing**: Persistence layer for Idea Bank

**Category: UX**
6. **Gap 6.6**: No visual indication of artist-specific data
   - User can't see they're looking at Drake's ideas while on Kendrick
   - No warning "This idea was for Drake artist"
   - **Missing**: Artist context display

### Edge Cases Not Specified

**Case 6A: Rapid artist switching**
```
User on Drake, adds idea "born under neon"
Immediately switches to Kendrick
Idea Bank shows Drake's idea
User doesn't notice and adds to Kendrick's song

Later, on Drake:
  - Sees "born under neon" (correct)
  - Adds idea "city lights"

Switch to Kendrick:
  - Sees both "born under neon" and "city lights"
  - Both Drake's ideas!
  - User confused about what's Kendrick's

Expected:
  - Each artist has separate Idea Bank
```

**Case 6B: Export/Share**
```
User builds Kendrick song with Idea Bank:
  ["struggle", "survival", "city lights"]

Export song:
  - Should export only those 3 ideas

But if "city lights" is actually Drake's idea:
  - Shared song contains Drake's content
  - Attribution wrong
```

**Case 6C: Multi-user scenario**
```
User A working on Drake artist:
  - Adds idea "born under neon"
  - localStorage["writing-studio"] updated

User B logs in on same browser:
  - Loads Kendrick artist
  - WritingStudioStore still has Drake's state
  - Sees Drake's ideas!

Expected:
  - Each user/artist combo isolated
```

**Case 6D: Offline then online**
```
User offline, working on Drake:
  - Adds ideas to Idea Bank
  - Stored in localStorage

User switches device/logs out:
  - Data in localStorage never synced to DB

Switch to Kendrick on new device:
  - Drake's ideas not there (correct)
  - But user expected them to sync
```

### Critical Questions Requiring Clarification

**CRITICAL Priority**

1. **Should Idea Bank be per-artist or global across all artists?**
   - Current: Global (accidental)
   - Should be: Per-artist (seems likely given context)
   - Or: Shared library across artists?
   - **Why it matters**: Defines entire feature scope
   - **Assumption if not answered**: Per-artist with separate persistence

2. **Where should Idea Bank be stored?**
   - localStorage (current, per browser): Doesn't sync, lost on clear
   - Supabase DB: Syncs across devices, persists with artist
   - Hybrid: Cache in localStorage, source in DB?
   - **Why it matters**: Persistence and sync
   - **Assumption**: Should be in DB, associated with artist

3. **How should artist switching reset the store?**
   - Manually? (closeEditor() called when switching)
   - Automatically? (watch activeArtistId in store)
   - Via route param? (artist ID in URL)
   - **Why it matters**: Implementation point
   - **Assumption**: Watch activeArtistId and reinitialize

**IMPORTANT Priority**

4. **Can ideas be cross-artist or artist-specific?**
   - Ideas are artist-specific (each artist gets their own)
   - Or shared library for all artists?
   - **Why it matters**: UX and data model
   - **Assumption**: Artist-specific

5. **Should switching artists automatically save the current artist's ideas?**
   - Before switching, flush current artist's Idea Bank to DB?
   - **Why it matters**: Data loss prevention
   - **Assumption**: Yes, autosave before switch

---

# ISSUE 7: Generate Confirmation When Existing Drafts

## User Flow Overview

```
CURRENT BEHAVIOR - No Warning on Generate:
User has Verse section with:
  - Tossed: 1 draft (option-3-tossed)
  - Locked: selectedDraft = option-2-kept
  - Active draftOptions: [option-1, option-4]  (2 remaining)

User clicks Generate:
  - New draftOptions generated: [option-5, option-6, option-7, option-8]
  - Old draftOptions replaced (option-1, option-4 lost)
  - selectedDraft remains (option-2 still locked)
  ↓
User loses option-1 and option-4 without warning!

DESIRED BEHAVIOR - Warning with Options:
User clicks Generate:
  - System detects: 2 un-selected draft options exist
  - Shows dialog: "You have 2 unsaved draft options. Continue generating? (replaces them)"
  - User can:
    a. Continue (lose option-1, option-4)
    b. Cancel (keep exploring current options)
    c. Chop (save good lines from option-1 or option-4 first)
```

### User Journey Permutation Matrix

| State | Tossed | Kept | Active | Generate | Warning | Expected |
|-------|--------|------|--------|----------|---------|----------|
| 7.1 | 0 | 0 | 0 | Click | None | Continue (first gen) |
| 7.2 | 0 | 0 | 4 | Click | Yes, 4 options | Warn about loss |
| 7.3 | 0 | 1 | 0 | Click | None | Continue (just regenerate) |
| 7.4 | 0 | 1 | 3 | Click | Yes, 3 options | Warn about loss (kept draft safe) |
| 7.5 | 1 | 1 | 3 | Click | Yes, 3 options | Warn about loss (1 tossed, 3 active) |
| 7.6 | 1 | 1 | 0 | Click | None | Continue (kept draft only) |
| 7.7 | 2 | 1 | 2 | Click | Yes, 2 options | Warn about loss (2 tossed, 2 active) |
| 7.8 | 0 | 0 | 4 + editing | Generate while editing | Yes | Warn about unsaved edits too |

### Critical Flow Paths

**7A. Unsaved Options Lost on Generate**
```
Writing Studio State:
  sections: [{
    id: 'verse-1',
    type: 'verse',
    selectedDraft: {
      id: 'opt-2',
      content: 'I was born under a neon sky'
    },
    isLocked: true
  }],
  draftOptions: [
    { id: 'opt-1', content: 'Verse option 1' },
    { id: 'opt-4', content: 'Verse option 4' }
  ],
  activeSectionId: 'verse-1',
  isGenerating: false

User clicks Generate button:
  - Calls generateOptions('verse-1', artistDna, ...)
  - Sets isGenerating: true
  - Clears: draftOptions: []  ← LOSS POINT 1
  - API call starts
  - Options 1 and 4 no longer in memory

API completes:
  - Sets draftOptions: [opt-5, opt-6, opt-7, opt-8]

User realizes they liked option-1:
  - Too late, it's gone
  - Can't regenerate to find it (result would be different)
  - No undo mechanism
  - No backup in localStorage (draftOptions not persisted)

Expected Flow:
  - User clicks Generate
  - System checks: draftOptions.length > 0?
  - If yes: Show dialog "You have 2 draft options. Replace?"
  - User can cancel and chop option-1 first
  - Or click Keep if they want to lock option-2 before generating
```

**7B. Keep vs Generate Race Condition**
```
User sees good option (opt-3) and bad option (opt-4)
User clicks Keep on opt-3:
  - Calls keepDraft('verse-1', opt-3)
  - Sets: sections[verse].selectedDraft = opt-3
  - Clears: draftOptions = []

But user also has finger on Generate:
  - If race condition, could call generateOptions while keepDraft running
  - generateOptions checks draftOptions
  - At that moment, draftOptions might already be [] or still be [opt-3, opt-4]
  - Result: unpredictable behavior

With warning dialog:
  - User forced to explicitly confirm generate
  - No accidental generation
  - Clearer user intent
```

**7C. Chop vs Generate Workflow**
```
User has 4 options, likes 2 of them:
  opt-1: "born under neon sky" (KEEP THIS LINE)
  opt-2: "city lights dancing" (LIKE THIS VERSE)
  opt-3: "standing alone" (MUTED)
  opt-4: "streetlights die" (GOOD)

Current workflow:
  - Select opt-1, click Chop (saves to Idea Bank)
  - Select opt-2, click Keep (locks verse)
  - Click Generate (loses opt-3, opt-4 silently)
  - Can't go back for opt-4 line

With warning:
  - Get Generate confirmation: "You have 3 other options"
  - User can click Cancel
  - Go back and Chop opt-4 first
  - Then click Generate

Better workflow:
  1. Chop opt-1, Chop opt-4 (save good lines)
  2. Keep opt-2 (lock verse)
  3. Generate (confirmation shows 0 pending options, continue)
```

### Missing Specifications & Gaps

**Category: Confirmation Dialog**
1. **Gap 7.1**: No confirmation when unsaved options exist
   - generateOptions() called without checking draftOptions.length
   - No dialog shown to user
   - Line 129-162 (generateOptions): Just clears and regenerates
   - **Missing**: Pre-generation validation

2. **Gap 7.2**: No clear message about what will be lost
   - If dialog shown, should say:
     - "You have X draft options that will be replaced"
     - "Option 1: [preview of content]"
     - "Option 4: [preview of content]"
   - **Missing**: Detailed preview of what's being lost

3. **Gap 7.3**: No option to save before generating
   - Dialog could have button: "Chop First" (cancel, open Chop UI)
   - Or: "Keep Selected" (select one to lock, then generate)
   - **Missing**: Inline save opportunities

**Category: State Awareness**
4. **Gap 7.4**: generateOptions doesn't check keepDraft count
   - Could be smart: If 1 draft kept, don't warn (section locked anyway)
   - If 0 kept, warn about any pending options
   - **Missing**: Smart warning logic

5. **Gap 7.5**: No tracking of "important" options
   - User might want to keep option-2 and option-4
   - But can only lock one (selectedDraft)
   - Should be able to tag multiple options as "keep"
   - **Missing**: Multiple selection UI

**Category: UX Flow**
6. **Gap 7.6**: No undo after generation
   - Once generated, old options gone
   - No way to recover
   - **Missing**: Generation history or undo stack

### Edge Cases Not Specified

**Case 7A: User closes editor before confirming**
```
Verse section has 3 pending options
User sees notification: "You have unsaved ideas"
User clicks X to close Writing Studio
Should behavior be:
  - Warn "You have 3 unsaved draft options. Close anyway?"
  - Or silently close?
  - Or auto-chop all to Idea Bank?
```

**Case 7B: Tab switch with pending options**
```
User on Verse section with 4 pending options
Clicks Bridge tab
Current behavior (Issue 4): draftOptions cleared
Expected with warning: "You have 4 pending options in Verse. Switch anyway?"
```

**Case 7C: Regenerate same section**
```
User generates Verse (gets options 1-4)
Locks option-2
Generates again (gets options 5-8)
Then wants to see options 1-4 again
Options 1-4 lost forever
No "previous generation" history
```

**Case 7D: Multiple sections with pending options**
```
Verse: 4 pending options
Hook: 3 pending options
User clicks Generate on Verse
Warning: "4 verse options will be replaced"
But should also note: "Bridge still has 3 unsaved options"
Should user be warned about other sections too?
```

### Critical Questions Requiring Clarification

**CRITICAL Priority**

1. **Should Generate show a confirmation dialog if options exist?**
   - Current: No confirmation, silent replacement
   - Should be: Yes, warn user
   - **Why it matters**: Prevents accidental data loss
   - **Assumption if not answered**: Yes, always warn if draftOptions.length > 0

2. **What should dialog say and what options should it provide?**
   - Simple: "You have X options. Continue generating?"
     Buttons: [Continue] [Cancel]
   - Detailed: Show preview of options being replaced
     Buttons: [Continue] [Chop First] [Cancel]
   - **Why it matters**: UX clarity vs simplicity
   - **Assumption**: Detailed with Chop option

**IMPORTANT Priority**

3. **Should we warn about tossed options too?**
   - Tossed options: Already rejected by user
   - Are they loss-worthy? Or just confirming intent?
   - **Why it matters**: Dialog frequency
   - **Assumption**: Only warn about active options (not tossed)

4. **Should locked drafts prevent warning?**
   - If user has kept a draft (locked), safe to regenerate
   - Warning still needed for pending options?
   - **Why it matters**: UX friction
   - **Assumption**: Warn if any pending, regardless of kept status

5. **Should dialog preview the pending options?**
   - Show [Preview] button for each option?
   - Or just count?
   - **Why it matters**: User decision-making
   - **Assumption**: Show preview if count > 1

---

# ISSUE 8: Switch to nano-banana-2

## User Flow Overview

```
CURRENT - Using nano-banana-pro (expensive):
User in Writing Studio
Clicks "Generate Character Portrait"
  ↓
API: /api/artist-dna/generate-portrait
  Model: google/nano-banana-2 (actually already using this! ✓)
  ↓
But image generation elsewhere might use nano-banana-pro

ISSUE: Need to verify all image generation uses nano-banana-2 (cheaper)

SEARCH RESULTS:
/api/artist-dna/generate-portrait: nano-banana-2 ✓
/api/wardrobe/generate-reference: nano-banana-2 ✓
Writing Studio portrait generation: ??? (need to find)
```

### User Journey Permutation Matrix

| Feature | Model Used | Cost Implication | Expected | Reality |
|---------|-----------|-----------------|----------|---------|
| 8.1 | Artist portrait generation | nano-banana-2 | Good ✓ | Correct |
| 8.2 | Wardrobe reference generation | nano-banana-2 | Good ✓ | Correct |
| 8.3 | Writing Studio portrait (if exists) | nano-banana-? | Should be 2 | Unknown |
| 8.4 | Shot Creator reference generation | nano-banana-? | Should be 2 | Unknown |
| 8.5 | Multiple generations in session | All nano-2 | Cost-effective | Verify all |

### Critical Flow Paths

**8A. Image Generation Model Consistency**
```
Current documented usages of Replicate:
1. /api/artist-dna/generate-portrait
   - Line 55: model: 'google/nano-banana-2' ✓

2. /api/wardrobe/generate-reference
   - Line 14: IMAGE_MODEL = 'google/nano-banana-2' ✓

3. /api/artist-dna/generate-character-sheet
   - Unknown (need to check)

4. Writing Studio image generation
   - Unknown (need to check)

5. Shot Creator reference generation
   - Unknown (need to check)

6. Music Lab reference sheet generation
   - Found: /api/music-lab... (need to check)
   - services/reference-sheet.service.ts mentions nano-banana-2

Need audit:
- Search all routes for Replicate usage
- Search all service files for model selection
- Verify no nano-banana-pro usage
```

### Missing Specifications & Gaps

**Category: Model Selection**
1. **Gap 8.1**: No consistent model constant
   - nano-banana-2 hardcoded in some files
   - No single source of truth
   - **Missing**: Centralized model configuration

2. **Gap 8.2**: No specification of which model for which feature
   - Is nano-banana-2 used everywhere?
   - Are there features still using pro?
   - **Missing**: Audit of all image generation endpoints

**Category: Configuration**
3. **Gap 8.3**: Model not configurable
   - Hardcoded in each file
   - Can't switch models without code changes
   - **Missing**: Environment variable or config

4. **Gap 8.4**: No fallback strategy
   - If nano-banana-2 fails, try nano-banana-pro?
   - Or fail completely?
   - **Missing**: Fallback model specification

### Edge Cases Not Specified

**Case 8A: Model deprecation**
```
If google/nano-banana-2 gets deprecated:
  - Multiple files need updating
  - Each separately maintained
  - Risk of missed updates

If centralized config:
  - Single update point
  - All features automatically updated
```

**Case 8B: A/B testing models**
```
If we want to compare nano-banana-2 vs pro:
  - Can't easily split users
  - Would need to refactor

If centralized config with feature flags:
  - Easy to enable pro for 10% of users
  - Can measure quality vs cost
```

### Critical Questions Requiring Clarification

**CRITICAL Priority**

1. **Are there any features still using nano-banana-pro?**
   - Or is nano-banana-2 already used everywhere?
   - **Why it matters**: Identifies cost savings opportunity
   - **Assumption if not answered**: All already on nano-banana-2, but need verification

2. **Should nano-banana-2 be the standardized model?**
   - Yes, use consistently across entire app?
   - Or contextual (different models for different use cases)?
   - **Why it matters**: Determines scope of changes
   - **Assumption**: nano-banana-2 standard everywhere

**IMPORTANT Priority**

3. **Should model be configurable via environment variable?**
   - Yes: Single point of control
   - No: Performance/latency concerns?
   - **Why it matters**: Maintainability
   - **Assumption**: Yes, should be configurable

4. **Should there be fallback to pro if 2 unavailable?**
   - Yes: Graceful degradation
   - No: Fail completely
   - **Why it matters**: Reliability vs cost
   - **Assumption**: Fail immediately (cheaper)

---

# ISSUE 9: Artist Creation Crash - tags.map is not a function

## User Flow Overview

```
CRASH SCENARIO:

User creates new artist:
  1. Click "New Artist" button
  2. ArtistEditor opens
  3. User navigates to Sound tab
  4. IdentityTab rendered with draft data
    ├─ draft = createEmptyDNA()
    └─ Should have all fields initialized
  5. IdentityTab renders TagInput
    └─ tags={identity.significantEvents}
      └─ ERROR: tags is null/undefined
      └─ tags.map() fails

CRASH: TypeError: tags.map is not a function at line 66 of TagInput.tsx
       .map((tag, i) => ...)

ROOT CAUSE: safeDna() only guards 2 array fields
  - genreEvolution, keyCollaborators
  But not all arrays:
  - identity.significantEvents
  - persona.traits, likes, dislikes
  - lexicon.signaturePhrases, slang, bannedWords, adLibs
  - look.portraitUrl, characterSheetUrl (strings, but might be null)
```

### User Journey Permutation Matrix

| Step | State | Component | Expected | Reality |
|------|-------|-----------|----------|---------|
| 9.1 | New artist | ArtistEditor | No crash | Safe to view |
| 9.2 | View Identity tab | significantEvents used | Array or empty | Might be null |
| 9.3 | View Sound tab | genreEvolution used | Array (guarded) | ✓ Safe |
| 9.4 | View Persona tab | traits used | Array | Might be null |
| 9.5 | View Lexicon tab | signaturePhrases used | Array | Might be null |
| 9.6 | View Look tab | portraitUrl used | String | Might be null |
| 9.7 | Load old artist from DB | dna merged with safeDna | All arrays safe | Only 2 guarded |
| 9.8 | Edit and save | dna with potential nulls | All safe | Only 2 guarded |

### Critical Flow Paths

**9A. Artist Creation Initialization**
```
useArtistDnaStore initialization:
  Line 105: draft: createEmptyDNA()

createEmptyDNA() returns:
  {
    identity: {
      stageName: '',
      realName: '',
      ethnicity: '',
      city: '',
      state: '',
      neighborhood: '',
      backstory: '',
      significantEvents: [],  ✓ Safe
    },
    sound: {
      genres: [],  ✓ Safe
      subgenres: [],  ✓ Safe
      microgenres: [],  ✓ Safe
      genreEvolution: [],  ✓ Safe
      vocalTextures: [],  ✓ Safe
      flowStyle: '',
      productionPreferences: [],  ✓ Safe
      keyCollaborators: [],  ✓ Safe
      artistInfluences: [],  ✓ Safe
      melodyBias: 50,
      language: 'English',
      secondaryLanguages: [],  ✓ Safe
      soundDescription: '',
    },
    persona: {
      traits: [],  ✓ Safe (in empty)
      likes: [],  ✓ Safe
      dislikes: [],  ✓ Safe
      attitude: '',
      worldview: '',
    },
    lexicon: {
      signaturePhrases: [],  ✓ Safe (in empty)
      slang: [],  ✓ Safe
      bannedWords: [],  ✓ Safe
      adLibs: [],  ✓ Safe
    },
    look: {
      skinTone: '',
      hairStyle: '',
      fashionStyle: '',
      jewelry: '',
      tattoos: '',
      visualDescription: '',
      portraitUrl: '',  ✓ Safe
      characterSheetUrl: '',  ✓ Safe
    },
    catalog: { ... }
  }

So createEmptyDNA() is safe!
Problem is loading from DB:
```

**9B. DB Load Merging**
```
Artist loaded from database:
  dbProfile.dna = {
    identity: {
      stageName: 'Drake',
      realName: 'Aubrey Drake Graham',
      // ... other fields
      significantEvents: null  ← Could be null in DB!
    },
    // ...
  }

Calls artistDnaService.getArtist():
  Line 80: return dbToUserProfile(data as DbArtistProfile)

dbToUserProfile (line 34-42):
  return {
    id: db.id,
    userId: db.user_id,
    name: db.name,
    dna: safeDna(db.dna),  ← Calls safeDna
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }

safeDna (line 17-32):
  function safeDna(raw: ArtistDNA): ArtistDNA {
    const d = createEmptyDNA()
    const sound = { ...d.sound, ...raw.sound }
    if (!Array.isArray(sound.genreEvolution)) sound.genreEvolution = []  ← GUARD 1
    if (!Array.isArray(sound.keyCollaborators)) sound.keyCollaborators = []  ← GUARD 2
    return {
      identity: { ...d.identity, ...raw.identity },  ← NO GUARDS HERE
      sound,
      persona: { ...d.persona, ...raw.persona },  ← NO GUARDS HERE
      lexicon: { ...d.lexicon, ...raw.lexicon },  ← NO GUARDS HERE
      look: { ...d.look, ...raw.look },  ← NO GUARDS HERE
      catalog: { ...d.catalog, ...raw.catalog },  ← NO GUARDS HERE
      lowConfidenceFields: Array.isArray(raw.lowConfidenceFields) ? raw.lowConfidenceFields : [],
    }
  }

Problem:
  Spread of {...d.identity, ...raw.identity}:
    - d.identity.significantEvents = [] (safe)
    - raw.identity.significantEvents = null (from DB)
    - Result: { ...d, ...raw } yields null (raw overrides d)

Solution needed:
  Check all array fields like genreEvolution/keyCollaborators
```

**9C. Load Old Artist with Missing Fields**
```
Scenario: Artist created with old code that didn't have significantEvents

DB record:
  {
    id: 'artist-1',
    name: 'Kanye West',
    dna: {
      identity: {
        stageName: 'Kanye West',
        realName: 'Kanye Omari West',
        // ... other fields
        // significantEvents NOT in DB (old schema)
      },
      // ...
    }
  }

safeDna processes:
  identity: { ...d.identity, ...raw.identity }

  d.identity.significantEvents = []
  raw.identity.significantEvents = undefined (not in DB)
  Result: { ...d, ...raw } yields undefined (raw.significantEvents undefined, no guard)

Then at compile/load, possibly stringified/parsed:
  JSON.parse(persisted) might have:
    - significantEvents: null (or undefined, then removed)

When component renders:
  tags = identity.significantEvents  // null!
  tags.map() crash!
```

### Missing Specifications & Gaps

**Category: Null-Safety**
1. **Gap 9.1**: safeDna() only guards 2 array fields
   - Protects: sound.genreEvolution, sound.keyCollaborators
   - Unprotected: All identity, persona, lexicon arrays
   - **Missing**: Comprehensive null-safety for all arrays

2. **Gap 9.2**: No validation on component props
   - TagInput expects tags: string[]
   - But receives tags: string[] | null | undefined
   - No prop guard before passing
   - **Missing**: Type safety or runtime check

3. **Gap 9.3**: No type guard in safeDna return
   - Function signature says returns ArtistDNA
   - But could return object with null arrays
   - TypeScript doesn't catch spread-induced nulls
   - **Missing**: Post-merge validation

**Category: Component Robustness**
4. **Gap 9.4**: TagInput doesn't guard against null tags
   - Line 66: {tags.map((tag, i) => ...)}
   - Assumes tags is always array
   - Should check: if (!Array.isArray(tags)) return null
   - **Missing**: Defensive programming in component

5. **Gap 9.5**: No error boundary around tab content
   - If one field crashes, entire page breaks
   - No graceful degradation
   - **Missing**: Error boundary wrapper

**Category: Data Model**
6. **Gap 9.6**: JSONB null handling in DB unclear
   - Supabase stores dna as JSONB
   - When old records loaded, might have nulls
   - No migration to fix old records
   - **Missing**: Migration strategy

### Edge Cases Not Specified

**Case 9A: Partial old record**
```
DB artist created before significantEvents field existed:
  dna: {
    identity: {
      stageName: 'Drake',
      realName: 'Drake',
      // no significantEvents (didn't exist)
    }
  }

safeDna merges:
  { ...d.identity, ...raw.identity }
  where raw.identity has no significantEvents key

Result:
  - If raw object property undefined: get d.identity.significantEvents (safe)
  - But JSON round-trip might set to null (breaks)
```

**Case 9B: Custom JSONB with nulls**
```
User or API directly inserted:
  dna: {
    persona: {
      traits: null  // Explicitly set to null instead of []
    }
  }

safeDna doesn't check persona.traits:
  persona: { ...d.persona, ...raw.persona }
  Result: traits = null

PersonaTab tries:
  {traits.map(...)}
  Crash!
```

**Case 9C: Component receives undefined instead of null**
```
If DB has:
  { persona: { traits: undefined } }

After JSON stringify/parse:
  { persona: { } }  // undefined removed

Then spread:
  { ...d.persona, ...raw.persona }
  Gets d.persona.traits = [] (safe)

But if direct object:
  new URL query param or inline object might pass undefined
  Tags={undefined} → crash
```

### Critical Questions Requiring Clarification

**CRITICAL Priority**

1. **Should safeDna() guard ALL array fields or just problematic ones?**
   - Current: Guards only genreEvolution, keyCollaborators
   - Should: Guard all arrays that could be null
   - **Why it matters**: Prevents all similar crashes
   - **Assumption if not answered**: Guard all arrays

2. **What should happen to null arrays when loading from DB?**
   - Convert to empty array? (safest)
   - Convert to undefined? (less safe)
   - Keep as null? (current, causes crash)
   - **Why it matters**: Migration strategy
   - **Assumption**: Convert to empty array in safeDna()

**IMPORTANT Priority**

3. **Should TagInput guard against non-array tags prop?**
   - Add prop validation?
   - Or fix upstream in safeDna?
   - Both?
   - **Why it matters**: Defensive vs proactive fix
   - **Assumption**: Fix both (defense in depth)

4. **Should there be an error boundary around tabs?**
   - Wrap each tab in error boundary?
   - Show "Error loading this tab" gracefully?
   - **Why it matters**: UX when crash happens
   - **Assumption**: Yes, error boundary recommended

5. **Should old DB records be migrated?**
   - Run migration script to fix null arrays?
   - Or handle on-the-fly in code?
   - **Why it matters**: Data cleanup vs lazy fix
   - **Assumption**: Handle in code with safeDna(), no migration needed

---

# COMPREHENSIVE QUESTION SUMMARY

## Critical Questions (Blocks Implementation)

### Category: Reference Library & Tags (Issues 1-3)

| # | Question | Issue | Impact |
|---|----------|-------|--------|
| C1 | What is the source of truth for tag matching when user types @tag? | 1 | Affects where cascade delete needed |
| C2 | Should deleting a reference image warn user or silently delete? | 1 | Data safety vs silent deletion |
| C3 | What is the canonical list of categories (include layouts and/or unorganized)? | 3 | Entire category system depends on this |
| C4 | What is the trigger for auto-save when adding @tag in Shot Creator? | 2 | When does image actually save to library |
| C5 | What gallery_id does auto-save use if image not yet in library? | 2 | Affects API flow for auto-save |

### Category: Writing Studio (Issues 4-7)

| # | Question | Issue | Impact |
|---|----------|-------|--------|
| C6 | Should draftOptions be cleared on section switch, per-section, or persistent? | 4 | Root cause of content loss |
| C7 | Are inline edits to selectedDraft supposed to persist section switches? | 4 | Data persistence strategy |
| C8 | Should Idea Bank be per-artist or global across all artists? | 6 | Architecture of entire feature |
| C9 | Where should Idea Bank be stored: localStorage or Supabase DB? | 6 | Persistence and sync strategy |
| C10 | Should Generate show confirmation dialog if unsaved options exist? | 7 | Prevents data loss |
| C11 | Should text selection trigger Chop or full draft? | 5 | Feature scope |

### Category: System-Wide (Issues 8-9)

| # | Question | Issue | Impact |
|---|----------|-------|--------|
| C12 | Are there any features still using nano-banana-pro that need switching to 2? | 8 | Cost optimization scope |
| C13 | Should safeDna() guard ALL array fields in case of null from DB? | 9 | Prevents artist creation crash |

---

## Important Questions (Significantly Affects UX/Maintainability)

### Category: Error Handling & Validation (Issues 1-3)

| # | Question | Issue | Impact |
|---|----------|-------|--------|
| I1 | What should happen when @tag used in prompt but no matching references? | 1 | User feedback on invalid tags |
| I2 | Should reference deletion cascade to gallery or keep image visible? | 1 | Data model clarity |
| I3 | What happens if auto-save of image to library fails? | 2 | Error recovery for auto-save |
| I4 | Should user see confirmation before auto-save to library? | 2 | UX friction vs silent action |
| I5 | Should there be "Unorganized" tab in filter or only in edit? | 3 | Filter consistency |

### Category: State & UX (Issues 4-7)

| # | Question | Issue | Impact |
|---|----------|-------|--------|
| I6 | Should switching sections require confirmation if unsaved work exists? | 4 | Data loss prevention vs UX friction |
| I7 | Should edited drafts show "unsaved" indicator in UI? | 4 | User awareness of edits |
| I8 | Should Idea Bank edits auto-save to DB or remain in localStorage only? | 6 | Sync and backup |
| I9 | How should artist switching reset the Writing Studio store? | 6 | Per-artist state management |
| I10 | What should Chop warning dialog show and what buttons provide? | 7 | UX clarity on data loss |

### Category: Configuration (Issue 8-9)

| # | Question | Issue | Impact |
|---|----------|-------|--------|
| I11 | Should model (nano-banana-2) be configurable via environment variable? | 8 | Maintainability and flexibility |
| I12 | Should TagInput guard against non-array tags or rely on upstream fixes? | 9 | Defensive programming approach |
| I13 | Should there be error boundary around tab content for crash resilience? | 9 | Graceful degradation |

---

## Nice-to-Have Questions (Improves Clarity)

| # | Question | Issue | Impact |
|---|----------|-------|--------|
| N1 | Is there an audit/activity log for tag deletion? | 1 | Debugging capability |
| N2 | Can user cancel or undo auto-save once triggered? | 2 | Workflow flexibility |
| N3 | Should category be editable after creation or immutable? | 3 | Workflow flexibility |
| N4 | Should there be draft generation history or undo? | 4,7 | User recovery options |
| N5 | Can user select from multiple drafts to chop together? | 5 | Feature scope expansion |
| N6 | Should ideas be cross-artist shareable or artist-specific? | 6 | Feature scope |
| N7 | Should there be fallback to nano-banana-pro if nano-2 unavailable? | 8 | Reliability vs cost |
| N8 | Should old DB records with nulls be migrated? | 9 | Data cleanup approach |

---

# RECOMMENDED NEXT STEPS

## Phase 1: Clarification & Design (1-2 weeks)

1. **Schedule design review meeting** covering:
   - Issue 4 (draftOptions scope): Decide on per-section vs global persistence
   - Issue 6 (Idea Bank): Decide on per-artist vs global, storage location
   - Issue 3 (Categories): Finalize canonical category list
   - Issue 1 (Tags): Define tag resolution strategy

2. **Create implementation decision document** capturing:
   - Answers to all CRITICAL questions (C1-C13)
   - Justification for each decision
   - Affected components and files

3. **Audit existing code** for:
   - All Replicate model usage (Issue 8)
   - All array field null handling (Issue 9)
   - All category definitions (Issue 3)
   - All reference tag resolution (Issue 1)

## Phase 2: High-Priority Fixes (2-3 weeks)

1. **Issue 9 (Artist Creation Crash)** - HIGHEST PRIORITY
   - Comprehensive null-safety in safeDna()
   - Guard ALL array fields, not just 2
   - Add error boundary around tab content
   - Add runtime validation in TagInput

2. **Issue 4 (Content Loss)** - CRITICAL DATA LOSS
   - Move draftOptions to per-section storage
   - Add confirmation dialog on section switch if unsaved work
   - Mark edited drafts with unsaved indicator
   - Persist editDraft changes to localStorage

3. **Issue 1 (Tag Deletion Sync)** - DATA CONSISTENCY
   - Implement cascade delete for tag references
   - Add pre-deletion warning for referenced tags
   - Implement tag orphan cleanup utility

## Phase 3: Medium-Priority Improvements (3-4 weeks)

4. **Issue 6 (Idea Bank Per-Artist)** - FEATURE SCOPE
   - Redesign store to support per-artist isolation
   - Move Idea Bank to Supabase with artist FK
   - Add artist context watch to reinitialize store
   - Prevent cross-artist idea pollution

5. **Issue 3 (Category Mismatch)** - UI CONSISTENCY
   - Unify category definitions in single constant
   - Update both filter tabs and edit dropdown to match
   - Add category validation
   - Update CategorySelectionDialog

6. **Issue 7 (Generate Confirmation)** - DATA SAFETY
   - Add confirmation dialog when unsaved options exist
   - Show preview of options being replaced
   - Provide "Chop First" option in dialog

## Phase 4: Lower-Priority Enhancements (4-5 weeks)

7. **Issue 2 (Auto-Add to Library)** - FEATURE COMPLETION
   - Implement auto-save trigger on @tag addition
   - Create gallery entry if needed
   - Handle category assignment
   - Add error handling and feedback

8. **Issue 5 (Line Selection in Chop)** - UX IMPROVEMENT
   - Add text selection visualization
   - Implement selection reading (getSelection())
   - Save selected text vs full draft
   - Provide selection mode toggle

9. **Issue 8 (Model Configuration)** - CODE QUALITY
   - Centralize model configuration
   - Create environment variable for nano-banana model
   - Audit all endpoints for model consistency
   - Consider feature flags for A/B testing

---

# TESTING STRATEGY

## Unit Tests to Add

1. **safeDna() function** (Issue 9)
   - Test null arrays become empty
   - Test all field types handled correctly
   - Test merge behavior with partial objects

2. **Reference deletion** (Issue 1)
   - Test cascade delete logic
   - Test tag orphan detection
   - Test gallery sync

3. **Per-artist Idea Bank** (Issue 6)
   - Test isolation between artists
   - Test persistence per artist ID
   - Test switching doesn't mix ideas

## Integration Tests to Add

1. **Section switching with unsaved work** (Issue 4)
   - Generate options → switch sections → return
   - Verify options preserved or warned about

2. **Chop action with selection** (Issue 5)
   - Select text → chop → verify idea bank entry
   - Verify selection saved not full draft

3. **Auto-save on tag addition** (Issue 2)
   - Upload image → add @tag → verify library entry

## E2E Tests to Add

1. **Multi-artist workflow** (Issue 6)
   - Create artist 1 → add ideas → switch to artist 2
   - Verify ideas don't pollute

2. **Tag lifecycle** (Issue 1)
   - Add reference with tag → use in prompt → delete reference
   - Verify tag no longer resolves

3. **Category mismatch** (Issue 3)
   - Create with "layouts" category → verify can filter and edit

---

# ACCEPTANCE CRITERIA SUMMARY

## Issue 1: Reference Tag Deletion Sync
- [ ] Deleting reference removes tag from autocomplete
- [ ] Tag doesn't resolve in prompts after image deleted
- [ ] Pre-deletion warning shows affected prompts
- [ ] Gallery no longer shows deleted image even if referenced

## Issue 2: Auto-Add to Library
- [ ] Adding @tag in Shot Creator auto-saves image to library
- [ ] Image appears in Reference Library immediately
- [ ] Default category applied correctly
- [ ] User sees confirmation toast

## Issue 3: Category Mismatch
- [ ] Filter tabs show: All, People, Places, Props, Layouts, Unorganized
- [ ] Edit dropdown shows same categories
- [ ] Category can be set and edited for all items
- [ ] No data loss on category changes

## Issue 4: Draft Content Preservation
- [ ] Switching sections preserves draftOptions
- [ ] Inline edits survive section switches
- [ ] Confirmation shown before clearing unsaved work
- [ ] Edited drafts marked as "unsaved" in UI

## Issue 5: Chop with Line Selection
- [ ] Text selection in draft shows highlighted
- [ ] Chop saves selected text not full draft
- [ ] No selection = save full draft (fallback)
- [ ] Confirmation shows what will be saved

## Issue 6: Per-Artist Idea Bank
- [ ] Each artist has separate Idea Bank
- [ ] Switching artists shows correct ideas
- [ ] Ideas persist in Supabase per artist
- [ ] No cross-artist idea pollution

## Issue 7: Generate Confirmation
- [ ] Dialog shown if unsaved options exist
- [ ] Shows count of options being replaced
- [ ] Provides "Chop First" option
- [ ] User can cancel and chop before generating

## Issue 8: Model Consistency
- [ ] All image generation uses nano-banana-2
- [ ] Model configurable via environment variable
- [ ] No pro model used anywhere

## Issue 9: Artist Creation Robustness
- [ ] Artist creation doesn't crash on TagInput
- [ ] All array fields guarded against null
- [ ] Old DB records with nulls load safely
- [ ] Error boundary shows graceful error if crash

---

# APPENDIX: File References

## Key Files to Modify

### Issue 1: Reference Tag Deletion
- `/src/features/shot-creator/services/reference-library.service.ts` - Add cascade logic
- `/src/features/shot-creator/helpers/parse-reference-tags.ts` - Tag resolution
- `/src/features/shot-creator/components/reference-library/ShotReferenceLibrary.tsx` - UI

### Issue 2: Auto-Add to Library
- `/src/features/shot-creator/components/creator-reference-manager/InlineTagEditor.tsx` - Tag save trigger
- `/src/features/shot-creator/services/reference-library.service.ts` - Auto-save logic

### Issue 3: Category Mismatch
- `/src/features/shot-creator/constants/index.ts` - Centralize category list
- `/src/features/shot-creator/components/reference-library/ShotReferenceLibrary.tsx` - Filter tabs
- `/src/features/shot-creator/components/CategorySelectDialog.tsx` - Edit dropdown

### Issue 4: Content Loss
- `/src/features/music-lab/store/writing-studio.store.ts` - State management redesign
- `/src/features/music-lab/components/writing-studio/SectionPicker.tsx` - Section switch warning
- `/src/features/music-lab/components/writing-studio/OptionGrid.tsx` - Edit indication

### Issue 5: Line Selection
- `/src/features/music-lab/components/writing-studio/OptionGrid.tsx` - Selection visualization
- `/src/features/music-lab/store/writing-studio.store.ts` - chopDraft() modification

### Issue 6: Per-Artist Idea Bank
- `/src/features/music-lab/store/writing-studio.store.ts` - Redesign for per-artist
- `/src/app/api/writing-studio/idea-bank/route.ts` - Create endpoint if needed

### Issue 7: Generate Confirmation
- `/src/features/music-lab/components/writing-studio/OptionGrid.tsx` - Add confirmation dialog
- `/src/features/music-lab/store/writing-studio.store.ts` - generateOptions() logic

### Issue 8: Model Configuration
- `/src/app/api/artist-dna/generate-portrait/route.ts`
- `/src/app/api/wardrobe/generate-reference/route.ts`
- `/src/lib/config/models.ts` - Create centralized config

### Issue 9: Artist Creation Safety
- `/src/features/music-lab/services/artist-dna.service.ts` - Enhance safeDna()
- `/src/features/music-lab/components/artist-dna/TagInput.tsx` - Add prop guards
- `/src/features/music-lab/components/artist-dna/ArtistEditor.tsx` - Error boundary

---

**End of Analysis**
