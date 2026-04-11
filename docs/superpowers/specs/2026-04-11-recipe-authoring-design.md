# Recipe Authoring & Catalog Redesign

## Overview

Transform the recipe system from a pre-loaded, admin-authored experience into a user-driven system where:
- Users start with a clean slate (zero recipes)
- A browsable Recipe Catalog replaces pre-loaded built-in recipes
- Power users can author their own recipes via a split-pane editor
- Recipes can be published to the catalog or shared via links

## Problem

Today, every user gets ~20+ built-in recipes dumped into their recipe dropdown. The quick access bar is pre-populated. New users are overwhelmed — they don't know what any of these recipes do, and the UI feels cluttered. Meanwhile, only admins can create recipes, so the recipe library stagnates.

## Decisions

| Decision | Choice |
|----------|--------|
| Who creates recipes | Power users (any user, advanced feature) |
| Editor style | Split-pane: raw template (left) + live form preview (right) |
| Sharing model | Catalog for discovery + share links for direct/private |
| Where authoring lives | Full-screen modal launched from Shot Creator |
| Wildcard integration | Light (reference by name) + bundled on publish/share |
| Default state | Zero recipes, empty quick access bar |

---

## Section 1: Clean Default State

### Current behavior
- New users get all system recipes pre-loaded in their recipe dropdown
- Quick access bar shows 5 pinned recipes (StyleGuide, CharSheet, Turnaround, DescSheet, 9-Frame)
- Recipe dropdown is a wall of ~20 options

### New behavior
- New users have **zero recipes** in their collection
- Quick access bar is **empty** — no buttons until user pins something
- Recipe dropdown shows empty state with two actions:
  - **Browse Catalog** — opens the recipe catalog modal
  - **Create Recipe** — opens the recipe editor modal (power user action, smaller/secondary button)
- Existing users keep their current recipes (no destructive migration)

### Quick Access Bar changes
- Still shows at top of prompt settings area
- When empty: shows a subtle prompt — "Add recipes from the catalog →" with a browse button
- When populated: works exactly as today (recipe buttons with labels, edit mode to remove)
- The "+" button opens the Catalog (not the Prompt Tools tab like today)

---

## Section 2: Recipe Catalog

The catalog is where all recipes live for discovery — system recipes (the current built-ins) and community-published recipes.

### Accessing the catalog
- **From empty state:** "Browse Catalog" button in empty recipe panel
- **From quick access bar:** "+" button
- **From recipe dropdown:** "Browse Catalog" option at bottom of list
- **From recipe editor:** "Browse" tab alongside "Editor" tab

### Catalog UI (full-screen modal)
Opens as a full-screen modal overlay (same treatment as the recipe editor).

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  Recipe Catalog                                    [✕]   │
├──────────────────────────────────────────────────────────┤
│  [Search recipes...]           [Filter: All ▼]           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ── Featured ──                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ preview │ │ preview │ │ preview │ │ preview │        │
│  │ img     │ │ img     │ │ img     │ │ img     │        │
│  │         │ │         │ │         │ │         │        │
│  │ Name    │ │ Name    │ │ Name    │ │ Name    │        │
│  │ desc... │ │ desc... │ │ desc... │ │ desc... │        │
│  │ [+ Add] │ │ [Added] │ │ [+ Add] │ │ [+ Add] │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                          │
│  ── Characters ──                                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │  ...    │ │  ...    │ │  ...    │                    │
│  └─────────┘ └─────────┘ └─────────┘                   │
│                                                          │
│  ── Scenes ──                                            │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

### Catalog cards
Each recipe card shows:
- **Preview image** — a sample output image (stored with the recipe, or a placeholder)
- **Name** — recipe name
- **Description** — 1-2 line description
- **Metadata badges** — stage count, cost (pts), model
- **Author** — "System" for built-ins, username for community recipes
- **Add button** — "+ Add" (not yet in collection) or "Added ✓" (already in collection)

### Card click behavior
- Clicking the card opens a **detail panel** (slide-out or expanded view) showing:
  - Full description and recipe note
  - Sample output images (gallery of 3-4 examples)
  - Template preview (read-only, shows the raw template)
  - Field list (what the user will fill out)
  - Stage count and pipeline visualization
  - Cost breakdown
  - "+ Add to My Recipes" button (primary action)
  - "Pin to Quick Access" toggle

### Categories
Reuse existing categories: Characters, Scenes, Environments, Narrative, Style Transfers, Products, Artists, Custom. Admin can feature recipes in a "Featured" section at top.

### Search and filter
- Text search across recipe name, description, and field names
- Category filter dropdown
- Sort: Featured, Newest, Most Popular (if we track add counts)

### System recipes migration
- All current built-in recipes in `recipe-samples.ts` become catalog entries
- They are flagged `is_system: true` (read-only, can be duplicated to edit)
- They appear in the catalog for everyone but are NOT auto-added to anyone's collection
- Existing users who already have these recipes keep them (check by recipe ID on migration)

---

## Section 3: Recipe Editor

A full-screen modal with a split-pane layout for authoring recipes.

### Accessing the editor
- **Create new:** "Create Recipe" button in empty state, or gear menu in recipe panel
- **Edit existing:** Edit button on a recipe in the user's collection (recipe dropdown or management view)
- **Duplicate & edit:** From catalog detail view, "Duplicate & Edit" on any system/community recipe
- **Save prompt as recipe:** Future shortcut in Shot Creator — take current prompt and open editor pre-filled

### Editor layout (full-screen modal)
```
┌──────────────────────────────────────────────────────────┐
│  Recipe Editor: "My Character Recipe"        [Save] [✕]  │
├────────────────────────────┬─────────────────────────────┤
│  TEMPLATE (left pane)      │  LIVE PREVIEW (right pane)  │
│                            │                             │
│  ┌─ Stage 1 ─────────────┐│  ┌─ Form Preview ─────────┐ │
│  │                        ││  │                        │ │
│  │ Generate a             ││  │ Style: [anime ▼]       │ │
│  │ <<STYLE:select(anime,  ││  │                        │ │
│  │   3D,claymation)>>     ││  │ Name*: [___________]   │ │
│  │ character named        ││  │                        │ │
│  │ <<NAME:name!>>         ││  │ Description*:          │ │
│  │ with                   ││  │ [                  ]   │ │
│  │ <<DESC:text!>>         ││  │ [                  ]   │ │
│  │                        ││  │                        │ │
│  └────────────────────────┘│  │ Outfit:                │ │
│                            │  │ [                  ]   │ │
│  [+ Add Stage]             │  │                        │ │
│                            │  │ ── Preview Prompt ──   │ │
│  ┌─ Recipe Settings ─────┐│  │ "Generate a anime      │ │
│  │ Name: [____________]  ││  │  character named ___   │ │
│  │ Description: [______] ││  │  with ___"             │ │
│  │ Category: [Chars ▼]   ││  │                        │ │
│  │ Model: [nano-banana▼] ││  └────────────────────────┘ │
│  │ Aspect: [16:9 ▼]      ││                             │
│  │ Requires image: [x]   ││  Cost: 5 pts               │
│  │ Recipe note: [______] ││  Stages: 1                  │
│  └────────────────────────┘│                             │
├────────────────────────────┴─────────────────────────────┤
│  [Delete]              [Test in Shot Creator]    [Save]   │
└──────────────────────────────────────────────────────────┘
```

### Template pane (left)

**Template textarea:**
- Monospace font, generous size
- Syntax highlighting for `<<FIELD:type>>` tokens — each token gets a colored background (e.g., cyan pill) so they visually pop against the prompt text
- Autocomplete/insert menu: typing `<<` triggers a dropdown with field type options:
  - `name` — short text (character names, labels)
  - `text` — long text (descriptions, prompts)
  - `select(opt1,opt2,opt3)` — dropdown with options
  - `wildcard(name,browse)` — wildcard reference
- Required marker: `!` before `>>` makes a field required
- Validation: red underline for malformed tokens

**Stage management:**
- Each stage is a collapsible section with its own template textarea
- Stages can be reordered (drag or up/down buttons)
- Stage type selector: Generation (default), Tool, Analysis
- For Tool stages: tool picker dropdown (remove-bg, grid-split, etc.)
- For Analysis stages: analysis picker (style, character, scene)
- Reference image upload per stage
- Delete stage button (with confirmation for multi-stage recipes)
- "+ Add Stage" button below the last stage

**Recipe settings (below template):**
- Name (required)
- Description (optional, shown in catalog)
- Recipe note (optional, shown to user when recipe is activated — instructions/tips)
- Category dropdown
- Suggested model dropdown
- Suggested aspect ratio dropdown
- Suggested resolution dropdown
- "Requires reference image" toggle
- Quick access label (short label for quick access bar, max ~12 chars)

### Live preview pane (right)

Updates in real-time as the user types in the template.

**Form preview:**
- Renders the exact same form the end user will see (using RecipeFormFields component)
- Fields are interactive — user can type test values to see how the prompt assembles
- Required fields marked with asterisk
- Select fields show actual dropdowns with the defined options
- Wildcard fields show the wildcard picker

**Assembled prompt preview:**
- Below the form, shows the final prompt with test values substituted
- Empty fields show as `___` placeholders
- Helps the author verify the prompt reads naturally

**Metadata display:**
- Cost estimate (based on model + stage count)
- Stage count
- Aspect ratio badge

### Editor actions (bottom bar)
- **Delete** — left-aligned, destructive, requires confirmation
- **Test in Shot Creator** — saves the recipe and closes the modal, activating the recipe in Shot Creator so the user can immediately generate with it
- **Save** — saves the recipe to the user's collection
- **Publish** — (if recipe is saved) opens publish flow (see Section 4)

---

## Section 4: Publishing & Sharing

### Publish to catalog
When a user clicks "Publish" on a saved recipe:
1. **Publish dialog** with:
   - Public name and description (pre-filled from recipe)
   - Preview image upload (or auto-use last generated image from this recipe)
   - Category selection
   - Visibility: **Public** (in catalog) or **Unlisted** (link-only)
2. On publish:
   - Recipe is copied to the community catalog (original stays in user's collection)
   - If recipe uses wildcards, those wildcard entries are bundled (snapshot of values at publish time)
   - Author shown as username
   - Admin can feature/unfeature published recipes

### Share links
- Every published recipe (public or unlisted) gets a shareable URL
- Format: `app-url/recipes/share/{recipe-id}`
- Link opens a preview page showing recipe details + "Add to My Recipes" button
- No account required to view, account required to add

### Unpublish
- Author can unpublish at any time (removes from catalog, invalidates share link)
- Users who already added the recipe keep their copy

---

## Section 5: Wildcard Bundling

### How it works
- When publishing a recipe, the system scans the template for `<<FIELD:wildcard(name,mode)>>` tokens
- For each referenced wildcard, it snapshots the wildcard's entries at publish time
- The snapshot is stored alongside the published recipe
- When a user adds the recipe from the catalog, the bundled wildcard entries are imported into their wildcard library (with a "from: recipe-name" tag to track origin)

### Conflict handling
- If the user already has a wildcard with the same name:
  - **Merge** — new entries from the bundle are added, duplicates are skipped
  - No overwriting of existing entries
- Users are shown a brief notification: "This recipe includes X wildcard entries that were added to your library"

---

## Section 6: Recipe Management (My Recipes)

Users need a place to manage their recipe collection beyond the recipe dropdown.

### Accessing management
- Gear icon in the recipe panel header → opens management view
- Or a "My Recipes" tab in the catalog modal

### Management UI
- List of all recipes in the user's collection
- For each recipe:
  - Name, category, stage count, cost
  - Source badge: "Created by you", "From catalog", "Imported"
  - Actions: Edit, Duplicate, Delete, Pin/Unpin from Quick Access
  - If published: "Published ✓" badge, "Unpublish" option
- Bulk actions: Delete selected
- Sort/filter by category, source, date added

---

## Section 7: Data Model Changes

### New fields on `recipes` table

| Column | Type | Purpose |
|--------|------|---------|
| `source` | text | 'created' \| 'catalog' \| 'imported' \| 'system' |
| `source_recipe_id` | UUID | Points to original catalog recipe (for tracking) |
| `published_at` | timestamptz | When published to catalog (null if unpublished) |
| `visibility` | text | 'public' \| 'unlisted' \| 'private' (default: private) |
| `preview_image_url` | text | Preview image for catalog card |
| `author_name` | text | Display name of the author |
| `add_count` | integer | Times added from catalog (for popularity sort) |
| `bundled_wildcards` | jsonb | Snapshot of wildcard entries at publish time |

### Migration plan
- Add new columns with defaults (non-breaking)
- Existing system recipes: set `source = 'system'`, `visibility = 'public'`
- Existing user recipes: set `source = 'created'`, `visibility = 'private'`
- **Do NOT delete any existing user recipes** — only change default loading behavior
- New users: no recipes auto-added to collection
- Existing users: keep all their current recipes as-is

---

## Section 8: Shot Creator Integration

### Recipe panel flow (updated)

```
User opens Shot Creator
    │
    ├─ Has recipes in collection?
    │   ├─ YES → Show recipe dropdown (current behavior)
    │   │        + Quick access bar with pinned recipes
    │   │        + "Browse Catalog" at bottom of dropdown
    │   │        + Gear icon → My Recipes management
    │   │
    │   └─ NO → Show empty state:
    │            "No recipes yet"
    │            [Browse Catalog]  [Create Recipe]
    │
    ├─ User selects recipe → RecipeFormInline (current behavior, unchanged)
    │
    ├─ User clicks "Browse Catalog" → Catalog modal opens
    │   └─ User adds recipe → appears in dropdown, optional pin to quick access
    │
    ├─ User clicks "Create Recipe" → Editor modal opens
    │   └─ User saves → appears in dropdown
    │
    └─ User clicks gear → My Recipes management view
```

### What stays the same
- RecipeFormInline (the form users fill out) — no changes
- Recipe execution pipeline — no changes
- Multi-stage support — no changes
- API v2 recipe execution — no changes

### What changes
- Quick access bar starts empty for new users
- Recipe dropdown no longer pre-populated with system recipes
- "+" button on quick access bar opens Catalog instead of Prompt Tools tab
- RecipeBuilder moves from Prompt Tools tab to the full-screen editor modal
- Prompt Tools "Recipes" tab replaced with a simpler "My Recipes" link that opens management view

---

## Section 9: Out of Scope (Phase 2+)

These are explicitly deferred:
- **Recipe versioning** — published recipes are immutable snapshots for now
- **Rating/reviews** on catalog recipes
- **Recipe analytics** (how many times used, success rate)
- **AI-assisted recipe creation** ("describe what you want and I'll write the template")
- **Recipe collections/playlists** (curated bundles of recipes)
- **"Save current prompt as recipe"** shortcut in Shot Creator (nice-to-have, not MVP)
- **Stylesheet API v2** — adding stylesheets to the public API
