# Story Creator - Complete User Guide

## 📖 Overview

The **Story Creator** transforms your written story into a complete shot list with AI-generated prompts ready for image generation. No matter how long your story is, the system processes every chapter, extracts characters and locations, and creates professional cinematic prompts.

---

## 🎬 Complete Workflow: From Story to Image Prompts

### Step 1: Story Input
**What You Do:**
1. Navigate to **Story Creator** tab in the application
2. Enter or paste your story text (any length - no limits!)
3. Give your project a title
4. Click **"Extract Shots with AI"**

**Example Story Input:**
```
Chapter 1: The Interrogation

The fluorescent lights in the Cobb County interrogation room cast
everything in a sickly green pallor. Clone sat across from Detective
Morrison, his tattooed arms resting on the metal table between them.

Morrison had been at this for nearly thirty minutes already. He leaned
back, studied Clone's face.

Chapter 2: The Confession

Clone shifted in his seat. The room suddenly felt smaller. "Muscle
started eight," he said quietly. Three syllables that would echo
through battle rap forums for years.
```

**What Happens:**
- ✅ AI reads your entire story (unlimited length)
- ✅ Detects chapters automatically (Chapter 1, Chapter 2, Part I, etc.)
- ✅ Processes each chapter separately with LLM
- ✅ Extracts 30-50+ visual scenes (not limited to 15!)
- ✅ Creates initial image prompts for each scene
- ✅ Identifies all characters and locations

**Processing Time:** ~10-30 seconds depending on story length

---

### Step 2: Review Extracted Shots
**What You See:**
After extraction completes, you'll see a summary:
```
✅ Extracted 37 shots from 8 chapters
✅ Found 12 characters
✅ Found 5 locations
```

**Automatic Tab Navigation:**
The system automatically moves you to the **"Characters"** tab.

---

### Step 3: Characters & Locations Management
**Tab: "Characters"**

**What You See:**
A list of all detected characters and locations from your story:

```
CHARACTERS (12)
┌─────────────────────────────────────────────────┐
│ Clone                                           │
│ @clone                                          │
│ "A tattooed man in his late 20s with tattoos"  │
│                                                 │
│ In prompts: ["A tattooed man in his..."]       │
│ [Assign Ref]  [Edit]                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Detective Morrison                              │
│ @morrison                                       │
│ "A seasoned detective in his 40s"              │
│                                                 │
│ In prompts: ["A seasoned detective..."]        │
│ [Assign Ref]  [Edit]                           │
└─────────────────────────────────────────────────┘

LOCATIONS (5)
┌─────────────────────────────────────────────────┐
│ Interrogation Room                              │
│ @interrogation_room                             │
│ "A small, fluorescent-lit room"                │
└─────────────────────────────────────────────────┘
```

**What You Do:**
1. **Review** character and location descriptions
2. **Edit** descriptions if needed (click Edit button)
3. **Assign Reference Images** (the magic part!)

**How to Assign Reference Images:**
1. Click **"Assign Ref"** button on any character
2. Gallery modal opens showing all your generated images
3. Select an image that looks like how you want that character to appear
4. Click **"Assign Reference"**

**What Happens Next (AUTOMATIC):**
- 🎯 **Global Find/Replace Triggered**
- 🔄 ALL 37 prompts regenerate automatically
- ✅ Character name replaced with `@clone` everywhere
- ⚡ Takes 2-3 seconds to update all prompts

**Before Reference Assignment:**
```
Prompt: "A tattooed man in his late 20s sits across from a seasoned
detective in his 40s in the interrogation room"
```

**After Assigning References:**
```
Prompt: "@clone sits across from @morrison in the interrogation room"
```

**Visual Feedback:**
- Reference assigned button turns green: **"✓ Reference assigned"**
- Preview updates: Shows `@clone` in green badge instead of description

**When to Skip:**
- You can skip assigning references if you want unique characters in every shot
- System will use text descriptions instead

**Continue Button:**
Click **"Continue"** when done → Moves to Title Cards tab

---

### Step 4: Title Cards (Optional but Recommended)
**Tab: "Title Cards"**

**What This Does:**
Creates cinematic title cards for each chapter in your story (like movie chapter markers).

**What You See:**
```
┌─────────────────────────────────────────────────┐
│ Default Title Card Style                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ cinematic title card, elegant typography,   │ │
│ │ dark background with gold text              │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

Detected Chapters
[✓ Chapter 1: The Interrogation]  [○ Chapter 2: The Confession]
0 of 8 chapters have title cards

[+ Add Custom]  [✨ Generate All]
```

**Option 1: Auto-Generate All Title Cards**
1. Review the default style (or customize it)
2. Click **"Generate All"** button
3. System creates title cards for all 8 chapters automatically

**Generated Title Card Example:**
```
Sequence: 0.9 (inserts before Chapter 1's first shot)
Prompt: "Create a cinematic title card that says 'Chapter 1: The
Interrogation', cinematic title card, elegant typography, dark
background with gold text"
```

**Option 2: Add Custom Title Cards**
1. Click **"+ Add Custom"**
2. Enter custom title (e.g., "Prologue", "The Beginning", "Three Years Later")
3. Set sequence number (e.g., 0.5 to insert at start)
4. Optionally customize style for this specific card
5. Click **"Add Title Card"**

**Editing Title Cards:**
- Click **Edit** icon on any title card
- Change title text or style description
- Click **Save** to update

**Visual Indicators:**
- Title cards show with 🎬 film icon
- Gold/yellow borders distinguish them from scene shots
- Sequence numbers like 0.9, 1.9, 2.9 (inserts before each chapter)

**Untitled Chapters:**
If your story has chapters like "1", "2", "3", the system suggests:
```
1 → Chapter 1
2 → Chapter 2
Chapter 3 → Chapter 3: [Untitled]
```

**When to Use:**
- ✅ Long stories with multiple chapters
- ✅ Creating video content
- ✅ Professional presentation
- ❌ Skip if you just want scene shots

---

### Step 5: Shots Review
**Tab: "Shots Review"**

**What You See:**
All your shots in order, with title cards and scene shots clearly distinguished.

**Two View Modes:**

#### Cards View (Default)
Shows each shot as a card with full editing capability:

```
┌─────────────────────────────────────────────────┐
│ 🎬  [Title Card]  [Chapter 1: The Interrogation]│
│                                                 │
│ Create a cinematic title card that says        │
│ "Chapter 1: The Interrogation", cinematic      │
│ title card, elegant typography, dark           │
│ background with gold text                      │
│                                                 │
│ [@clone, @morrison]                            │
│                                      [Edit]     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 1   [Chapter 1: The Interrogation]             │
│                                                 │
│ @clone sits across from @morrison in a small,  │
│ fluorescent-lit interrogation room. The room   │
│ has green lighting. Wide shot.                 │
│                                                 │
│ [@clone, @morrison, @interrogation_room]       │
│                                      [Edit]     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 2   [Chapter 1: The Interrogation]             │
│                                                 │
│ @morrison leans back in his chair studying     │
│ @clone's face. Close-up on @morrison's         │
│ thoughtful expression. Dramatic lighting.      │
│                                                 │
│ [@morrison, @clone]                            │
│                                      [Edit]     │
└─────────────────────────────────────────────────┘
```

**Editing Shots:**
1. Click **Edit** button on any shot
2. Modify the prompt text
3. Add/remove reference tags (@clone, @morrison)
4. Click **Save**

#### Table View
Switch to table view for better organization and copying:

```
┌───┬────────────┬─────────┬──────────────────────────┬────────┐
│ # │ Characters │ Location│ Prompt                   │  Copy  │
├───┼────────────┼─────────┼──────────────────────────┼────────┤
│🎬 │            │Chapter 1│ Create a cinematic...    │ [Copy] │
├───┼────────────┼─────────┼──────────────────────────┼────────┤
│ 1 │@clone      │Chapter 1│ @clone sits across from  │ [Copy] │
│   │@morrison   │         │ @morrison in...          │        │
├───┼────────────┼─────────┼──────────────────────────┼────────┤
│ 2 │@morrison   │Chapter 1│ @morrison leans back...  │ [Copy] │
│   │@clone      │         │                          │        │
└───┴────────────┴─────────┴──────────────────────────┴────────┘

Summary: 2 unique characters • 1 location • 0 with variations
```

**Table View Features:**
- **Organized by** characters and locations
- **Copy Button** - Click to copy prompt to clipboard
  - Button turns green: **"✓ Copied!"** for 2 seconds
  - Paste directly into image generation tools
- **Bracket Variation Detection** - Shows badge if using `[option1, option2]` syntax
- **Summary Stats** - See character, location, variation counts

**Understanding Sequence Numbers:**
```
0.9  → Title Card (before Chapter 1)
1    → Chapter 1, Shot 1
2    → Chapter 1, Shot 2
3    → Chapter 1, Shot 3
1.9  → Title Card (before Chapter 2)
4    → Chapter 2, Shot 1
5    → Chapter 2, Shot 2
```

---

### Step 6: Generate All Images
**Final Step:**

1. Review all prompts in Shots Review
2. Make any final edits
3. Click **"Generate All"** button (top right)

**What Happens:**
- ✅ Creates generation queue for all shots
- ✅ Switches to **"Generation"** tab automatically
- ✅ Shows progress bar and current shot
- ✅ Can pause/resume at any time
- ✅ Images save to Gallery automatically

**Generation Queue Display:**
```
┌─────────────────────────────────────────────────┐
│ Generating Images...                            │
│ ████████████░░░░░░░░  Shot 15/37 (40%)         │
│                                                 │
│ Current: @clone sits across from @morrison...  │
│                                                 │
│ [⏸ Pause]                                       │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Understanding Your Prompts

### Prompt Structure
Your final prompts include:

1. **Character References**: `@clone`, `@morrison`
   - These map to the reference images you assigned
   - If no reference: uses text description instead

2. **Location Context**: "in the interrogation room"
   - Provides scene setting

3. **Visual Description**: "Wide shot", "Close-up", "Dramatic lighting"
   - Camera angles and mood from AI analysis

4. **Style Consistency**: Applied across all shots

### Example Final Prompt
```
@clone sits across from @morrison in a small, fluorescent-lit
interrogation room. The room has green lighting. @clone's tattooed
arms rest on the metal table between them. Wide shot, cinematic
framing, dramatic tension.
```

**When Generated:**
- `@clone` → Uses the reference image you assigned (e.g., image of tattooed man)
- `@morrison` → Uses Morrison's reference image (e.g., detective photo)
- System knows to keep Clone and Morrison consistent across all 37 shots

---

## 🔥 Advanced Features

### Bracket Variations (For Power Users)
You can add variations to prompts using brackets:

**Example:**
```
@clone sits in [an interrogation room, a parking lot, a boxing ring]
looking [angry, tired, determined]
```

**Result:**
- Creates 9 images (3 locations × 3 expressions)
- Table view shows: **"9 variations"** badge
- Prompt preserved as-is for your generation tool

**Other Supported Syntax:**
- Pipe notation: `prompt1 | prompt2 | prompt3`
- Wildcards: `_character_ in _location_` (requires wildcard library)

### Manual Prompt Editing
- Click **Edit** on any shot card
- Modify prompt text freely
- Add/remove reference tags
- Changes save to database immediately

### Deleting Shots
- Can't delete from Shots Review (to prevent accidents)
- Use Title Cards tab to delete title cards
- Scene shots persist once extracted

### Re-extracting
- Go back to Story Input tab
- Modify your story text
- Click "Extract Shots" again
- Creates new project (doesn't overwrite)

---

## 📊 What You Get

### Complete Shot List
```
37 shots total:
- 8 title cards (one per chapter)
- 29 scene shots (visual moments from your story)
```

### Organized by Chapter
```
Chapter 1: The Interrogation (4 shots)
Chapter 2: The Confession (3 shots)
Chapter 3: The Evidence (5 shots)
... (and so on)
```

### Reference-Mapped Prompts
```
All prompts use @tags pointing to your reference images:
- @clone (appears in 25 shots)
- @morrison (appears in 20 shots)
- @interrogation_room (appears in 10 shots)
```

### Ready for Generation
- Copy prompts from table view
- Paste into any image generation tool
- References automatically resolve to correct images
- Maintain character consistency across all shots

---

## 💡 Best Practices

### Writing Your Story
✅ **Use clear chapter markers**: "Chapter 1", "Part I", "Section A"
✅ **Describe scenes visually**: Colors, lighting, emotions, camera angles
✅ **Name characters consistently**: "Clone" throughout, not "the man" sometimes
✅ **Include location details**: "small room", "parking lot at night"

❌ **Avoid**: Huge walls of text without breaks
❌ **Avoid**: Abstract internal monologue without visual elements
❌ **Avoid**: Changing character names mid-story

### Assigning References
✅ **Do assign**: Main characters who appear multiple times
✅ **Do use**: Close-up portraits for best consistency
✅ **Do test**: Generate 2-3 shots first before doing all 37

❌ **Don't assign**: Background characters who appear once
❌ **Don't use**: Blurry or multi-person reference images
❌ **Don't worry**: You can always re-assign later

### Title Cards
✅ **Do use**: For professional video projects
✅ **Do customize**: Style per chapter if needed ("noir", "cyberpunk", etc.)
✅ **Do add**: Custom cards for "Prologue", "Epilogue", "Three Years Later"

❌ **Skip**: If you just want scene shots without chapter markers

---

## 🚀 Quick Start Checklist

- [ ] Navigate to Story Creator
- [ ] Paste your story (any length)
- [ ] Click "Extract Shots with AI"
- [ ] Wait 10-30 seconds for extraction
- [ ] Go to Characters tab
- [ ] Assign reference images to main characters
- [ ] Wait 2-3 seconds for prompts to regenerate
- [ ] Go to Title Cards tab
- [ ] Click "Generate All" (or skip this step)
- [ ] Go to Shots Review tab
- [ ] Switch to Table view
- [ ] Copy each prompt using Copy button
- [ ] Paste into your image generation tool
- [ ] Generate images!

---

## 🎬 Example: Complete Workflow

**Input Story: "The Weight of Words" (7,000 words, 8 chapters)**

1. **Extract**: 30 seconds → 37 shots extracted
2. **Characters**: 12 characters found, assign refs to Clone and Morrison
3. **Regenerate**: 3 seconds → All 37 prompts updated with @clone, @morrison
4. **Title Cards**: Click "Generate All" → 8 title cards created
5. **Review**: Switch to Table View → See 45 total shots (8 titles + 37 scenes)
6. **Copy**: Click Copy on each prompt → Paste into Midjourney/DALL-E/Flux
7. **Generate**: 45 images created with consistent characters

**Total Time: 5 minutes** (including your review time)
**Output: 45 ready-to-generate prompts** with character consistency

---

## ❓ Troubleshooting

### "No shots extracted"
- Check if your story has visual descriptions (not just dialogue)
- Try adding more descriptive paragraphs
- Ensure story is longer than 100 words

### "Characters not detected"
- Make sure character names are capitalized
- Use character names consistently throughout
- AI looks for proper nouns and character actions

### "Prompts not regenerating after assigning reference"
- Wait 3-5 seconds (processing time)
- Check browser console for errors
- Try refreshing page and re-assigning

### "Title cards not creating"
- Check if chapters are detected (Detected Chapters section)
- Try adding clear chapter markers: "Chapter 1:", "Part I:"
- Ensure shots exist before trying to create title cards

### "Copy button not working"
- Browser may block clipboard access
- Grant clipboard permissions when prompted
- Try right-click → Copy on prompt text instead

---

## 🎉 You're Ready!

You now have everything you need to:
- ✅ Turn any story into a professional shot list
- ✅ Extract unlimited scenes from any length story
- ✅ Manage characters and locations with references
- ✅ Create cinematic title cards
- ✅ Generate consistent, high-quality image prompts
- ✅ Copy and use prompts in any image generation tool

**Start creating!** 🎬
