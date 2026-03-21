# Directors Palette v2 — World Map

> A comprehensive guide to every screen, button, and interactive element in the application.

---

## Table of Contents

1. [App Architecture](#app-architecture)
2. [Authentication](#authentication)
3. [App Shell & Navigation](#app-shell--navigation)
4. [Shot Creator](#shot-creator)
5. [Storyboard](#storyboard)
6. [Storybook](#storybook)
7. [Music Lab](#music-lab)
8. [Shot Animator](#shot-animator)
9. [Figurine Studio](#figurine-studio)
10. [Brand Studio](#brand-studio)
11. [Merch Lab](#merch-lab)
12. [Node Workflow](#node-workflow)
13. [Layout & Annotation](#layout--annotation)
14. [Community](#community)
15. [Gallery](#gallery)
16. [Prompt Tools](#prompt-tools)
17. [Credits System](#credits-system)
18. [Admin Dashboard](#admin-dashboard)
19. [Landing Page](#landing-page)
20. [Help System](#help-system)

---

## App Architecture

**Framework:** Next.js 15, React 19, TypeScript strict, Tailwind CSS v4, Turbopack

**Navigation Model:** Single-page app with tab-based routing. All authenticated features render as `<Tabs>` on the home page (`src/app/page.tsx`), controlled by `useLayoutStore` (Zustand). The sidebar switches tabs — there are no nested routes for features.

**Global Providers (in `src/app/layout.tsx`):**
- `ThemeProvider` (dark theme default)
- `PromptProvider` (global confirmation/input modals)
- `CapacitorProvider` (native app shell)
- `Toaster` (Sonner toast notifications)
- `DragDropPrevention`

---

## Authentication

All auth pages live under `src/app/auth/` with rotating cinematic background images.

### Sign In (`/auth/signin`)
| Element | Type | Details |
|---------|------|---------|
| "Continue with Google" | Button | Google OAuth |
| Email | Input | Required |
| Password | Input | Required |
| "Forgot?" | Link | Goes to `/auth/forgot-password` |
| "Sign In" | Button | Submit form |
| "Create one" | Link | Goes to `/auth/signup` |
| "Back to Home" | Link | Top-left |

### Sign Up (`/auth/signup`)
| Element | Type | Details |
|---------|------|---------|
| "Continue with Google" | Button | Google OAuth |
| Email | Input | Required |
| Password | Input | Required |
| Confirm Password | Input | Must match |
| "Create Account" | Button | Submit, shows success state on completion |
| "Sign in" | Link | Goes to `/auth/signin` |

### Forgot Password (`/auth/forgot-password`)
| Element | Type | Details |
|---------|------|---------|
| Email Address | Input | Required |
| "Send Reset Link" | Button | Sends email, shows green success message |
| "Back to Sign In" | Link | Returns to sign in |

### Reset Password (`/auth/reset-password`)
| Element | Type | Details |
|---------|------|---------|
| New Password | Input | 8+ chars, upper, lower, number |
| Confirm New Password | Input | Must match |
| "Reset Password" | Button | Submit, auto-redirects to sign in |

### Auth Callback (`/auth/callback`)
- OAuth/magic-link callback handler, no visible UI

---

## App Shell & Navigation

### Sidebar (`src/components/SidebarNavigation.tsx`)

**Mobile:** Hamburger menu opens a Sheet/Drawer.
**Desktop:** Fixed left sidebar, collapsible with `Ctrl+B`.

Organized into 4 collapsible sections (state persisted in localStorage):

#### CREATION TOOLS (default: expanded)
| Item | Icon | Tab ID |
|------|------|--------|
| Shot Creator | Sparkles | `shot-creator` |
| Canvas Editor | Layout | `layout-annotation` |
| Shot Animator | Film | `shot-animator` |
| Node Workflow | Workflow | `node-workflow` |
| Figurine Studio | Box | `figurine-studio` |
| Merch Lab | Shirt | `merch-lab` |

#### PROJECTS (default: expanded)
| Item | Icon | Tab ID |
|------|------|--------|
| Storyboard | BookOpen | `storyboard` |
| Storybook | BookHeart | `storybook` |
| Music Lab | Music | `music-lab` |
| Brand Studio | Brush | `brand-studio` |

#### LIBRARY (default: expanded)
| Item | Icon | Tab ID |
|------|------|--------|
| Gallery | Images | `gallery` |
| Community | Users | `community` |

#### UTILITIES (default: collapsed)
| Item | Icon | Tab ID |
|------|------|--------|
| Prompt Tools | FlaskConical | `prompt-tools` |

**Sidebar Footer:**
- User avatar + email
- Credits balance display + Purchase button
- Sign Out button

### Global Modals
- **PromptModal** — Global confirmation/input dialog (injected at root)
- **CreditInsufficiencyModal** — Triggered when user lacks pts for an operation
- **HelpDialog** — In-app manual triggered from sidebar

---

## Shot Creator

**Location:** `src/features/shot-creator/`
**Tab ID:** `shot-creator`

The primary image generation workspace. Desktop uses resizable 60/40 panels.

### Left Panel — Controls

#### Reference Images Manager
| Element | Type | Details |
|---------|------|---------|
| Upload button | Button | Single/multi image upload |
| Camera capture | Button | Capture from device camera |
| Paste image | Button | Paste from clipboard |
| Image cards | Cards | Per-image: remove, edit tags, remove background (3 pts), save to gallery |
| Aspect ratio toggle | Button | 16:9 vs native per image |

*Hidden when a recipe is active (recipe has its own reference area).*

#### Model Selector
| Element | Type | Details |
|---------|------|---------|
| Model dropdown | Select | Grid of model cards with icon, name, cost badge, speed/quality tooltips |

#### Prompt Area
| Element | Type | Details |
|---------|------|---------|
| Prompt textarea | Textarea | Syntax-highlighted. `@` triggers autocomplete (library refs + session images). `_` triggers wildcard autocomplete. Multiline, resizable. |
| Auto-enhance toggle | Button | Wand icon, cyan when active. Pauses when prompt is 5+ sentences. |
| Organize button | Button | Opens PromptOrganizerModal |
| Prompt Expander | Button | Expands compressed `[bracket]` and `{slot}` syntax |
| Slot Machine Panel | Panel | Expands `{curly brace}` syntax to variations |

#### Basic Settings Row (4-column grid)
| Element | Type | Details |
|---------|------|---------|
| Style | Dropdown | Style image previews |
| Aspect Ratio | Dropdown | Model-dependent |
| Resolution | Dropdown | With cost display for tiered pricing |
| Output Format | Dropdown | WebP/JPG/PNG (model-dependent) |

#### Camera Angle Control (Qwen Image Edit only)
- 3D gizmo with rotation, zoom, preset angles, on/off toggle

#### Advanced Settings (collapsible gear icon)
| Element | Type | Details |
|---------|------|---------|
| Settings Presets | Save/Load/Delete | Named preset system |
| Seed | Number input | + shuffle button |
| Safety Filter | Dropdown | Minimal/Moderate/Strict (Nano Banana only) |
| Google Web Search | Checkbox | Enables web info context |
| Google Image Search | Checkbox | Enables visual web context |
| Guidance Scale | Slider | 0-20, step 0.5 |
| Camera LoRA Scale | Slider | 0-2, step 0.1 (Qwen only) |
| Sequential Generation | Checkbox | + Max Images slider (2-15) |

#### Generation Controls (sticky on mobile)
| Element | Type | Details |
|---------|------|---------|
| Batch toggle | Buttons | x1, x3, x5 |
| Cost display | Text | "X pts — Y images x Z pts" |
| Generate button | Button | Shows cost, countdown timer, spinner. Disabled when insufficient pts. |
| Cancel button | Button | Appears during generation |

#### Desktop Prompts/Recipes Bar (tabbed, below prompt)
| Tab | Content |
|-----|---------|
| Prompts | Categories, browse, add, rename, delete, star prompts |
| Recipes | Quick-access pinned recipes, browse all, rename, delete, pin/unpin |

#### Recipe Form Inline (when recipe active)
- Recipe name header
- Required/optional fields (text, textarea, file upload, wildcard browse)
- Reference image area (up to 14 images, drag-drop)
- Stage progression display
- Generate button (overrides normal generation)
- Close/exit recipe button

### Right Panel — Gallery & Library

**Two tabs:** Images | Library

#### Images Tab (UnifiedImageGallery)

**Gallery Header:**
| Element | Type | Details |
|---------|------|---------|
| Search bar | Input | Filter images |
| Grid size buttons | Buttons | Small/medium/large |
| Select All | Button | |
| Select Recent | Dropdown | Last 5/10/20/All |
| Clear Selection | Button | When in selection mode |
| Native Aspect Ratio | Toggle | Square vs original |
| Source Filter | Dropdown | All / Shot Creator / Storyboard / etc. |

**Image Cards:**
- Thumbnail with checkboxes, model badge, reference badge, source badge
- Metadata bar: cost, model, aspect ratio, prompt tooltip

**Image Action Menu (dropdown per card):**
| Action | Details |
|--------|---------|
| Copy prompt | Clipboard |
| Copy image | Clipboard |
| Download | Direct download |
| Save to library | Opens CategorySelectionDialog |
| Send to... | Shot Animator / Layout & Annotation |
| Set as reference | Use in prompt |
| Remove background | 3 pts |
| Make figurine | Send to Figurine Studio |
| Share | Creates shareable link |
| Move to folder | Submenu with all folders |
| Delete | With confirmation |

**Bulk Actions Toolbar (when items selected):**
- Selected count, Download ZIP, Move to folder, Delete selected, Clear selection

**Folder Sidebar:**
- All Images, Uncategorized, user-created folders
- Create folder, rename, delete (via context menu)

#### Library Tab (ShotReferenceLibrary)
- Browse saved references by category (People, Places, Props, Layouts, Styles, Unorganized)
- Search/filter, use as reference, edit tags, delete

### Shot Creator Modals

| Modal | Trigger | Content |
|-------|---------|---------|
| PromptOrganizerModal | Organize button | Collapsible sections: Shot Details, Subject, Mood, Technical, Composition. Edit components, apply to prompt. |
| CategorySelectDialog | Save to Library | Image preview, category dropdown, tags input with suggestions |
| FullscreenImageModal | Click image | Large image, download, copy URL, send to animator/layout, remove bg, delete |
| FolderManagerModal | Create/edit folder | Name input, 6 color options |
| BulkDownloadModal | Bulk download | Progress bar, file list |
| WildCardManager | Wildcards button | List/create/edit/import/delete wildcards |
| LoRA Community Browser | LoRA button | Browse/search LoRAs by category, add to project |

---

## Storyboard

**Location:** `src/features/storyboard/`
**Tab ID:** `storyboard`

A 7-step cinematic shot breakdown pipeline with left sidebar tab navigation.

### Navigation Sidebar (7 vertical tabs)
| Tab | Icon | Label | Step |
|-----|------|-------|------|
| Input | FileText | Input | 1 |
| Style | Palette | Style | 2 |
| Director | Video | Director | 3 |
| Chars | Users | Chars | 4 |
| Shots | SplitSquareVertical | Shots | 5 |
| Gen | Play | Gen | 6 |
| Results | Images | Results | 7 |

Each tab shows step number badge (or green checkmark when complete). Tabs are disabled until dependencies are met.

### Header Bar
| Element | Type | Details |
|---------|------|---------|
| Tab label | Text | Current tab name |
| Project Selector | Dropdown | Project list with rename (Pencil), delete (Trash2) per project |
| New Project | Button | FilePlus2 icon |
| View Mode Toggle | Buttons | List/Grid (gallery tab only) |

### Tab 1: Story Input
| Element | Type | Details |
|---------|------|---------|
| AI Model Selector | Card | LLM model dropdown |
| Mode Toggle | Pill buttons | "Storyboard" / "Documentary" |
| Story Text | Textarea | 300px min-height, monospace, word/char count |
| "Extract Characters & Locations" | Button | Sparkles icon, shows spinner when processing |
| "Clear & Start Fresh" | Button | Outline, opens confirmation dialog |
| Clear Confirmation Dialog | Dialog | Lists items being deleted, "Clear Everything" destructive button |

### Tab 2: Style Guide
| Element | Type | Details |
|---------|------|---------|
| PresetStyleSelector | Grid | Preset style thumbnails with selection state |
| Custom Style Generator | Card | Description input + generate button |

### Tab 3: Director
| Element | Type | Details |
|---------|------|---------|
| Director cards | Scrollable row | Thumbnails, names, enthusiasm scores (% badge) |
| Director Comparison | Panel | Side-by-side base vs director-enhanced image + prompt |
| Director Proposal Dialog | Modal | Vision text, Cancel / Apply buttons |

### Tab 4: Characters & Locations

**Characters:**
| Element | Type | Details |
|---------|------|---------|
| Character cards | Expandable cards | Thumbnail, name, aliases, role badge (main/supporting/background), mention count, reference tag, style match dot |
| Reference image area | Upload/URL/Gallery tabs | Drag-drop, URL input, GalleryImagePicker |
| Description textarea | Textarea | Character appearance |
| "Generate Sheet" | Button | Opens Character Sheet recipe |
| "Save to Library" | Button | Saves reference with tag |
| Add Character form | Inline form | Name input, role select, Add/Cancel |

**Locations:**
| Element | Type | Details |
|---------|------|---------|
| Location cards | Expandable cards | Thumbnail, name, tag badge, mention count |
| Reference image area | Upload/URL tabs | Drag-drop or URL input |
| Description textarea | Textarea | Visual description |

### Tab 5: Shots
| Element | Type | Details |
|---------|------|---------|
| Director Selector | Header | Shows selected director |
| Granularity Select | Dropdown | Number of segments |
| Chapter tabs | Tabs | "All Shots" + per-chapter |
| Coherence Review toggle | Switch | Enable/disable coherence pass |
| "Generate Shot Prompts" | Button | Main CTA, shows spinner |
| Coherence Suggestions | Panel | Up to 10 suggestions with toggle switch |

**Editable Shot Component (per shot):**
| Element | Type | Details |
|---------|------|---------|
| Sequence badge | Circle | Colored by segment |
| Shot type badge | Badge | cyan/blue/green/amber/red |
| "edited" badge | Badge | If modified |
| Director's Notes | Input | Optional guidance for AI |
| Shot prompt | Text/Textarea | HighlightedPrompt display, edit mode with Save/Cancel |
| Characters in Shot | Badge row | Thumbnails + names, add/remove dropdown |
| Location | Badge | Thumbnail + name, change/set dropdown |
| Copy | Button | Copy prompt to clipboard |
| Angles | Button | Grid3X3 icon (if image exists) |
| B-Roll | Button | Film icon (if image exists) |

### Tab 6: Generation
| Element | Type | Details |
|---------|------|---------|
| Prefix/Suffix toggle | Toggle | Shows global prompt modifier inputs |
| Model selector | Dropdown | Image generation model |
| Aspect ratio | Dropdown | |
| Resolution | Dropdown | |
| Wildcard toggle | Toggle | + wildcard selector |
| "Generate All" / "Generate Selected" | Button | Main CTA |
| Pause / Resume / Cancel | Buttons | During generation |
| Progress | Text + Bar | "X/total shots (%)%" |
| Cost estimate | Text | "Estimated cost: X pts" |

### Tab 7: Results (Gallery)

**Header:**
| Element | Type | Details |
|---------|------|---------|
| Status badges | Badges | Green (completed), Amber (pending), Red (failed + "Retry Failed") |
| View Mode | Buttons | Grid / List / Carousel |
| "Completed only" / "Show all" | Toggle | Filter |
| Export / Import / Download All | Buttons | JSON export/import, ZIP download |
| Shots / B-Roll tabs | Tabs | Toggle between images and video clips |

**Per-shot actions (hover):**
- Preview (Eye), Angles (Grid3X3), B-Roll (Layers), Make Video (Clapperboard/Play), Download

### Storyboard Modals

| Modal | Trigger | Content |
|-------|---------|---------|
| Shot Lab | Click shot | Two tabs: Blocking (layout/composition canvas) + VFX (refinement/effects) |
| Contact Sheet | Angles button | 9-grid angle variations, aspect ratio/resolution settings, generate button |
| B-Roll Sheet | B-Roll button | 6-cell B-roll variation grid, resolution settings |
| Image Preview | Preview button | Full-screen dark overlay with large image |
| Video Preview | Play button | Full-screen video player with autoplay + loop |
| Character Sheet Generator | Generate Sheet | Recipe-based character turnaround generation |
| Gallery Image Picker | Gallery browse | Browse gallery images with category filter |

---

## Storybook

**Location:** `src/features/storybook/`
**Tab ID:** `storybook`

A wizard-based children's book creator with two modes: Generate (AI creates story) and Paste (user provides story text).

### Project Management Bar
| Element | Type | Details |
|---------|------|---------|
| Unsaved Draft badge | Badge | Shows when changes exist |
| Save | Button | Save/Saved status with icon |
| Load | Dropdown | Saved projects list with delete per project |
| New | Button | Confirmation dialog if unsaved work |

### Wizard Navigation (WizardTopNav)
| Element | Type | Details |
|---------|------|---------|
| Back button | Button | Left chevron, disabled on step 1 |
| Step icon + title | Display | Circular icon + step label + project title |
| Step pills | Navigation | Numbered circles, click to jump to visited steps |
| Next/Finish button | Button | Amber "Next" or green "Finish" |

### Generate Mode Steps (12 steps)

#### Step 1: Character Setup
| Element | Type | Details |
|---------|------|---------|
| Character Name | Input | Auto-focus, required |
| Character Age | Dropdown | Ages 2-12 |
| Visual Description | Textarea | Optional, 3 rows |
| Preview | Display | "[Name], [age] years old, is ready for an adventure!" |
| Additional Characters | Section | 0/3 limit, quick-pick role buttons (emoji + name), inline add form |
| "I have my own story" | Button | Red text, switches to paste mode |
| "Continue" | Button | Amber, next step |

#### Step 2: Category Selection
- Grid of educational category cards (emoji + name + description)
- Custom option available
- Selected state: amber border + background tint

#### Step 3: Topic Selection
- Topic grid filtered by category
- Age-inappropriate topics grayed out (40% opacity)
- Each shows emoji, name, description, age ranges

#### Step 4: Book Settings
| Element | Type | Details |
|---------|------|---------|
| Story Theme quick-picks | Buttons | Emoji + name + description (for custom stories) |
| Custom Description | Textarea | "or describe your own" |
| Page Count | Button grid | 6, 8, 10, 12, 14, 16 |
| Book Format | Buttons | With aspect ratio, dimensions, "best for" text |
| Sentences Per Page | Button grid | 2, 3, 4, 5, 6 + live sample preview |
| Story Setting | Preset buttons | 10 locations (emoji + name) + custom input |
| Story Elements | Toggle buttons | 10 elements (emoji + name), toggleable, + "other requests" textarea |
| Preview Summary | Card | Character, story type, pages, est. words |
| "Generate 4 Story Ideas" | Button | Gradient amber-to-orange, Sparkles icon |

#### Step 5: Story Approach
- 4 story idea cards (emoji, approach label, title, summary)
- Click to select and generate
- "New Ideas" button to regenerate

#### Step 6: Story Review
| Element | Type | Details |
|---------|------|---------|
| Story beats (left) | Expandable cards | Beat number, text, learning note, scene description. Edit button opens textarea with Save/Cancel. |
| Characters sidebar (right) | Card | Name, role badge, description, beat appearances |
| Locations sidebar (right) | Card | Name, description, beat appearances |
| "Continue to Style Selection" | Button | Amber |

#### Step 7: Style Selection
- 5 preset style cards (preview image, name, description)
- Custom style option: name input, style description textarea, reference image upload
- "Expand Style" button (AI expansion)

#### Step 8: Characters
- Auto-detected character list with photo upload, generate character sheet, enhance description
- Per-character: upload photo, generate sheet (Sparkles), edit description, delete

#### Step 9: Pages (Page Generation)
| Element | Type | Details |
|---------|------|---------|
| Spread mode toggle | Switch | "50% cost savings" |
| "Generate All Missing Pages" | Button | Primary |
| "Regenerate All Pages" | Button | Secondary |
| "Generate Default Cover" | Button | If no cover |
| Page navigation | Buttons | Previous/Next + thumbnail grid |
| Text position selector | Buttons | Top/Bottom |
| "Generate Illustration" | Button | Per-page, Sparkles icon |
| Page text editor | Inline | DraggableTextEditor or RichTextEditor |

#### Step 10: Title Page
- 4 variation cards (2 "Portrait" + 2 "Story Scene")
- "Generate Title Page Variations" button (Sparkles, amber gradient)
- Click to select, shows checkmark

#### Step 11: Back Cover
| Element | Type | Details |
|---------|------|---------|
| Synopsis display/edit | Text/Textarea | Edit (pencil) / Save (checkmark) / Cancel (X) |
| "Generate Synopsis" | Button | Sparkles icon |
| 4 variation cards | Grid | 2 "Closing Scene" + 2 "Decorative" |

#### Step 12: Preview
| Element | Type | Details |
|---------|------|---------|
| BookViewer | Component | react-pageflip with page flip animation, fullscreen button |
| Page navigation | Buttons | Previous/Next + thumbnail strip |
| Paper Type | Dropdown | KDP paper types |
| Audio Player | Component | Voice dropdown (Rachel/Adam/Charlotte/Dorothy), "Generate Narration" button, playback controls (skip, play/pause, progress, volume, speed 0.75x-1.5x) |
| Print Guides toggle | Switch | Shows bleed lines and safe zones |
| "Export Interior PDF" | Button | Just pages |
| "Export Cover PDF" | Button | Covers only |
| "Export Full PDF" | Button | Interior + covers |
| "Finish" | Button | Green, completes project |

### Paste Mode Steps
Same as Generate mode but starts with **Story Input** step instead of Character Setup through Story Approach:
- Book title input, author name, target age slider (3-12), story textarea, page count dropdown, "Keep exact words" toggle, book format selection, "Polish & Split" button

---

## Music Lab

**Location:** `src/features/music-lab/`
**Tab ID:** `music-lab`

A 5-tab hub for AI music production.

### Hub Navigation (5 pill tabs)
| Tab | Icon | Content |
|-----|------|---------|
| Artist Lab | DNA | Create/edit AI artists |
| Artist Chat | Message | Real-time artist conversation |
| Writing Studio | Pen | Song concepts & lyrics |
| Sound Studio | Headphones | Instrumental sound profiles |
| Music Video | Music | Commission video treatments |

### Music Video Treatment

#### Phase 1: Setup (7 input steps)

**Step 1 — The Track:**
- Audio drop zone (MP3/WAV/M4A/AAC, 50MB max), file status card, remove button

**Step 2 — The Lyrics:**
| Element | Type | Details |
|---------|------|---------|
| Lyrics textarea | Textarea | Monospace, word count |
| "Auto-Transcribe" | Button | Sparkles icon (when audio uploaded) |
| "Detect Sections" | Button | When lyrics only |
| "Isolate Vocals First" | Switch | Demucs preprocessing |
| BPM input | Number | Default 120, range 1-300 |

**Step 3 — Genre:**
- Primary Genre input, Subgenre/Style input

**Step 4 — Visual Style:**
- 4 preset style cards (click to select)

**Step 5 — Scout Locations:**
| Element | Type | Details |
|---------|------|---------|
| Location cards | Cards | Name, description, "Required" badge, section tags, delete (X) |
| "Add Location" | Button | Plus icon, opens inline form |
| Add form | Inline | Name, description, 6 section toggles (intro/verse/pre-chorus/chorus/bridge/outro), "Required" checkbox |

**Step 6 — Creative Vision:**
- 4 textareas: Vision Statement, Location Ideas, Wardrobe Thoughts, Reference Videos/Artists

**Step 7 — Reference Sheets (3-card grid):**
| Card | Controls |
|------|----------|
| Identity Lock | Artist name input, visual description textarea, "Generate Identity Lock" button, regenerate button |
| Wardrobe Sheet | Character name, scrollable wardrobe items (name + description + delete), "Add Wardrobe" (max 6), "Generate Wardrobe Sheet" button |
| Location Sheet | Character name, scrollable location items (name + description + delete), "Add Location" (max 6), "Generate Location Sheet" button |

**Center CTA:** "Ingest Track & Structure" button (blue, disabled until audio/lyrics + genre)

#### Phase 2: Confirming
- Section cards with: type selector dropdown, color-coded backgrounds, custom name (edit pencil), time badge, lyrics preview
- "Confirm Sections" button

#### Phase 3: Generating Proposals
| Element | Type | Details |
|---------|------|---------|
| "Open The Palette" | Button | Opens director commissioning |
| Proposal cards (grid) | Cards | Director avatar, name, vision badge, star rating (1-5), logline, location/looks/shots badges |
| Expand toggle | Button | "See Full Treatment" / "Hide Details" |
| Cherry-pick checkmarks | Buttons | Per location, wardrobe look, and key shot |
| "Greenlight This Vision" | Button | Per proposal, Clapperboard icon |
| Director Questions Dialog | Modal | Category-colored questions with radio group options, "Skip Questions" / "Continue with Vision" |

#### Phase 4: Building Timeline
| Element | Type | Details |
|---------|------|---------|
| Play/Pause | Toggle | Playback control |
| Skip-back | Button | |
| Time display | Text | Monospace current/duration |
| Zoom slider | Slider | 1-10, step 0.5 |
| Section markers | Colored bars | Horizontal, labeled |
| Shot blocks | Rectangles | Clickable, preview images, white border when selected |
| Playhead | Red line | Diamond marker, tracks audio position |

### Artist Lab
| Element | Type | Details |
|---------|------|---------|
| Artist cards (grid) | Cards | Portrait, name, brief info |
| "Create New Artist" | Button | Dashed border, Plus icon |
| "Start from Real Artist" | Button | Sparkles icon, 25 pts |
| Create Artist Dialog | Modal | Artist name input, "Build Profile" button |
| Delete Confirmation | AlertDialog | Destructive delete |

**Artist Editor (6 tabs):**
| Tab | Icon | Content |
|-----|------|---------|
| Identity | User | Stage/real name, ethnicity, city, backstory (MagicWandField), events (TagInput) |
| Sound | Music2 | Genre cascade, vocal textures, influences, melody bias slider, instruments |
| Persona | Smile | Personality traits, attitude, social persona |
| Lexicon | Quote | Signature phrases, slang, speaking style |
| Look | Palette | 4 sub-tabs: Profile, Character Sheet, Photo Shoot, Gallery |
| Catalog | Music | Song catalog/discography management |

- Low-confidence banner on AI-estimated fields
- Sticky Save Bar: "Unsaved changes" + Ctrl+S + "Save Artist" button

### Artist Chat
| Element | Type | Details |
|---------|------|---------|
| Artist picker grid | Buttons | Portrait circles with artist names |
| Chat header | Bar | Back, artist portrait, name, living context status, refresh, inspiration button |
| Living Context Drawer | Collapsible | Time of day, location, activity |
| User messages | Bubbles | Amber, right-aligned |
| Artist messages | Bubbles | Muted, left-aligned, with optional photo/action messages |
| Reaction buttons | Buttons | ThumbsUp / ThumbsDown per artist message |
| Typing indicator | Animation | 3 bouncing dots |
| Camera button | Button | Request photo from artist |
| Text input | Input | Shift+Enter for newline, Enter to send |
| Inspiration Feed | Overlay | Full-screen overlay when activated |

### Writing Studio
- Artist context bar (active artist + track selector)
- StudioTab (main writing interface)
- Collapsible "The Mix — Suno Prompt Output" section

### Sound Studio
| Element | Type | Details |
|---------|------|---------|
| Artist dropdown | Select | With Reset button |
| Genre Picker | Card | |
| BPM + Energy sliders | Sliders | |
| Mood Selector | Card | |
| Drum/Groove, Bass/Synth, Harmony/Space | 2-column grids | |
| Instrument Palette | Card | |
| Production Style Tags | MultiSelectPills | Color-coded, shows artist preferences |
| Negative Tags | Tag input | Red pills, X to remove |
| Suno Prompt Preview | Card | Right column (desktop), real-time |
| Sound Assistant | Card | Right column (desktop) |

---

## Shot Animator

**Location:** `src/features/shot-animator/`
**Tab ID:** `shot-animator`

### Controls Toolbar
| Element | Type | Details |
|---------|------|---------|
| Model Selector | Dropdown | Animation models (seedance-1.5-pro, etc.) |
| Settings Modal | Button | Opens ModelSettingsModal |
| Search | Input | Filter shots by name |
| Show Only Selected | Checkbox | Toggle filtered view |
| Select All / Deselect All | Buttons | Batch selection |
| Upload Images | Button | File picker + drag-drop |
| Gallery Modal | Button | Opens GallerySelectModal |
| Video Modal | Button | Opens VideoPreviewsModal |

### Shots Grid (left)

**Per shot (CompactShotCard):**
| Element | Type | Details |
|---------|------|---------|
| Start frame image | Preview | |
| Selection checkbox | Checkbox | Batch select |
| Prompt textarea | Textarea | Editable |
| Model badge | Badge | |
| Reference images | Carousel | Max 4 thumbnails |
| Video results | Cards | CompactVideoCard items |
| Auto-generate prompt | Button | Wand2 icon |
| Manage references | Button | Image icon |
| Manage last frame | Button | Clapperboard (if supported) |
| Replace start/last frame | Buttons | Replace icon |
| Fullscreen view | Button | ZoomIn icon |
| Delete shot | Button | Trash2 icon |

### Gallery Panel (right, collapsible)
- Video cards with download, delete, maximize buttons
- Fullscreen video modal

### Generate Bar (bottom, fixed, when shots selected)
| Element | Type | Details |
|---------|------|---------|
| Play button | Button | Large |
| Label | Text | "Generate [N] Video(s) - [COST] pts" |
| Cost Confirmation Dialog | Dialog | Model, count, cost per video, total |

---

## Figurine Studio

**Location:** `src/features/figurine-studio/`
**Tab ID:** `figurine-studio`

### Pipeline Progress Bar (3 steps)
1. Upload Image (Image icon)
2. Generate 3D (Layers icon)
3. Order Physical (Package icon)

### Left Column — Image Upload
| Element | Type | Details |
|---------|------|---------|
| Drop zone | Drag-drop area | Upload character image |
| URL input | Input | Paste image URL, Enter to load |
| Reset button | Button | RotateCcw icon, clears image |
| "Generate 3D Model — 25 pts" | Button | Sparkles icon, spinner during generation |

### Right Column — 3D Viewer
| Element | Type | Details |
|---------|------|---------|
| Model Viewer | Web component | `<model-viewer>` with grid floor |
| Zoom In/Out | Buttons | +/- |
| Pan Up/Down | Buttons | Move icon |
| Toggle Auto-Rotate | Button | Play/Pause |
| Reset Camera | Button | RotateCcw |
| Background colors | 8 preset circles + custom picker | Dark/Gray/White/Blue/Green/Purple/Warm/Red |
| Download menu | Dropdown | "Download GLB" / "Download OBJ (Print-Ready)" |
| "Order Print — From 780 pts" | Button | Truck icon, gradient cyan |

### Order Print Modal (4 steps)

**Step 1 — Configure:**
- Size selector: 5cm Mini / 10cm Standard
- "Get Quote" button

**Step 2 — Review Quote:**
- Dimension preview (SVG isometric box with measurements)
- Material picker (gradient swatches, name, description, price in pts)
- Back / Continue buttons

**Step 3 — Shipping:**
- Form: First Name, Last Name, Address 1 & 2, City, State, ZIP, Country dropdown (15 countries), Phone
- "Place Order — {price} pts" button

**Step 4 — Confirmation:**
- CheckCircle2 icon, Order ID, Material, Size, Charged amount, Est. Delivery 10-14 days
- "Done" button

### Physical Figurine Showcase Section
- 4 material preview cards (gradient + name + price range + "Popular" badge)
- "How It Works" 3-step cards (Choose Material, We Print It, Ships To You)

### Order History Section
- Order rows: material, size, date, price in pts, status badge (Pending/In Production/Shipped/Cancelled)
- Refresh button

### Saved Figurines Grid
- Source image thumbnails with status badges (Ready/Generating/Failed)
- Delete button on hover

---

## Brand Studio

**Location:** `src/features/brand-studio/`
**Tab ID:** `brand-studio`

### Sidebar (w-60)
| Element | Type | Details |
|---------|------|---------|
| Brand display | Card | Logo/initials + name + tagline |
| Brand dropdown | Select | Switch between brands |
| "New Brand" | Button | Plus icon, opens NewBrandDialog |
| 4 tab buttons | Navigation | Brand (Palette), Library (FolderOpen, LOCKED), Create (Wand2), Campaigns (Megaphone, LOCKED) |

### New Brand Dialog (2-step)
**Step 1:** Logo upload (optional), Brand name input, Description textarea, "Generate Brand Guide" button
**Step 2:** Loading spinner with "Analyzing brand identity..." status

### Brand Tab (when brand selected)

**Brand Guide Hero:** Logo, name, tagline, industry tag, gradient background
**Brand Score Ring:** Completeness circle (X/7), Quality grade (A+ to D)

**4 Sub-tabs:**

#### Visual Identity
| Section | Elements |
|---------|----------|
| Colors | Grouped by role (primary/secondary/accent/bg/text), color circles + name + hex. Edit: color picker + name input + "Add Color" button |
| Typography | Heading font, body font, weights (badge pills). Edit: font name inputs |
| Visual Style | Photography tone (quote), subjects (pills), composition. Edit: text inputs |

#### Voice & Messaging
| Section | Elements |
|---------|----------|
| Voice | Tone words (emerald pills), persona (quote), avoid words (red pills). Edit: comma-separated inputs + textarea |
| Audience | Primary/secondary audience cards, psychographics. Edit: inputs + textarea |

#### Audio
| Section | Elements |
|---------|----------|
| Music & Sound | Genre badges (rose), mood badges, BPM range bar (visual 40-200 scale). Edit: comma-separated inputs + min/max BPM numbers |

#### Brand Guide
- Generated brand guide image display with "Regenerate" button, or "Generate Visual Brand Guide (15 pts)" button

### Create Tab

**6 Generator Cards (grid):**
| Generator | Theme | Cost | Status |
|-----------|-------|------|--------|
| Image | Violet | 10 pts | Available |
| Video | Cyan | 25-40 pts | Available |
| Voice | Indigo | 5 pts | Available |
| Music | Fuchsia | 15 pts | Available |
| Script | Pink | — | Locked |
| Assemble | Amber | — | Locked |

**Each Generator Screen:**
| Element | Type | Details |
|---------|------|---------|
| Back button | Button | Return to grid |
| Prompt | Textarea | 120-140px min-height |
| Generator-specific controls | Various | Aspect ratio (Image), Model + Duration (Video), Voice selector (Voice), Duration + Instrumental toggle (Music) |
| Brand Boost | Switch | "Auto-inject brand colors & style" (Sparkles icon) |
| Generate button | Button | Full width, shows cost, spinner during generation |
| Result display | Panel | Image preview + download, video status card, audio player + download |

---

## Merch Lab

**Location:** `src/features/merch-lab/`
**Tab ID:** `merch-lab`

3-panel resizable layout (25% / 50% / 25%).

### Left Panel — Design Controls
| Element | Type | Details |
|---------|------|---------|
| Pipeline Stepper | Steps | Pick Product > Design > Order |
| Product Picker | Grid | Category tabs (Apparel/Wall Art/Drinkware/Stickers/Accessories), 2-col product grid |
| Color Picker | Palette | 12 presets + custom color picker |
| Model selector | Buttons | Ideogram V3 / Nano Banana |
| Quality tier | Dropdown | Varies by model |
| Batch count | Selector | 1, 3, 5 |
| Prompt textarea | Textarea | With wildcard autocomplete |
| Generate button | Button | Sparkles icon |

### Center Panel — Mockup Preview
- Canvas-rendered mockup (product + color + design)
- Zoom/rotate controls

### Right Panel — Order
| Element | Type | Details |
|---------|------|---------|
| Design thumbnails | Grid | Generated designs with select radio + delete |
| Order details | Display | Product, color, price |
| Order button | Button | Opens OrderModal |
| OrderModal | Dialog | Print partner confirmation, design preview, price breakdown, confirm/cancel |

---

## Node Workflow

**Location:** `src/features/node-workflow/`
**Tab ID:** `node-workflow`

### Node Palette (left sidebar, 256px)
5 draggable node types: Input, Prompt, Generation, Tool, Output

### Canvas (right, main area)
| Element | Type | Details |
|---------|------|---------|
| React Flow canvas | Interactive | Grid background, pan/zoom |
| Control buttons | Buttons | Zoom In/Out, Fit to View |
| Minimap | Display | Bottom-left |
| 5 custom node types | Nodes | InputNode (upload), PromptNode (text + variables), GenerationNode (model + settings), ToolNode (processing), OutputNode (result + download) |
| Edge connections | Lines | Drag between node ports |
| Save/Load/Delete workflow | Buttons | Toolbar |
| Execute/Run | Button | Play icon |

---

## Layout & Annotation

**Location:** `src/features/layout-annotation/`
**Tab ID:** `layout-annotation`

### Canvas Toolbar (desktop top / mobile floating right)
| Element | Type | Details |
|---------|------|---------|
| Zoom In/Out | Buttons | |
| Fit to Screen | Button | |
| Actual Size | Button | |
| Clear Canvas | Button | |
| Properties panel toggle | Button | |
| Undo/Redo | Buttons | Top-left |
| Download canvas | Button | |

### Fabric Canvas
- Drag-to-pan, scroll-to-zoom, right-click context menu
- Drawable: rectangles, circles, lines, text, images (all with drag handles)

### Properties Panel (right sidebar)
- Fill color picker, stroke color picker, stroke width slider, opacity slider, rotation slider, delete button

### Layers Panel (left sidebar)
- Layer list with visibility (eye icon) and lock toggles, drag to reorder, delete per layer

### Canvas Settings
- Canvas size (width x height inputs), background color picker, aspect ratio presets

### Canvas Export
- Download (PNG, SVG, PDF), Save to gallery

### Frame Extractor (modal)
| Element | Type | Details |
|---------|------|---------|
| Video frame preview | Canvas | With draggable grid overlay |
| Rows/Columns | Sliders | |
| Offset X/Y | Sliders | |
| Gutter X/Y | Sliders | |
| Trim | Slider | |
| Aspect ratio presets | Buttons | 16:9, 9:16 |
| 4 corner previews | Canvases | Cropped preview |
| Previous/Next frame | Buttons | |
| Extract | Button | Batch extracts all grid cells |

---

## Community

**Location:** `src/features/community/`
**Tab ID:** `community`

### Filters Bar
| Element | Type | Details |
|---------|------|---------|
| Type tabs (6) | Tabs | All / Wildcards / Recipes / Prompts / LoRAs / Directors |
| Search | Input | Search community items |
| Category | Dropdown | Varies by type |
| Sort | Dropdown | Most Popular / Highest Rated / Newest / A-Z |
| Create Recipe | Button | Amber, opens GuidedRecipeBuilder |
| Refresh | Button | Reload items |

### Community Cards (grid, 1-4 columns)
| Element | Type | Details |
|---------|------|---------|
| Type badge | Badge | Colored with icon |
| Add/Remove | Button | Plus/Check toggle |
| Admin controls | Buttons | Edit (pencil), Delete (trash) — admin only, hover visible |
| Title | Text | With "Official" badge if applicable |
| Description | Text | 2-line clamp |
| Type-specific preview | Content | Wildcard entries, recipe stages/fields, prompt quote, LoRA thumbnail/trigger word, director focus tags |
| Author | Text | User icon + name |
| Rating stars | Display | Average + count |
| Tags | Badges | Up to 3 + "+N" overflow |
| Rating prompt | Overlay | Appears after adding, 5-star input + Skip |

### Admin Edit Dialog
- Name, category, description, tags inputs
- For recipes: recipe note, aspect ratio, pipeline stages (collapsible), template textarea, detected fields, reference images (drag-upload)

### Guided Recipe Builder (3-step wizard)
**Step 1 — Basics:** Name, description, category, aspect ratio
**Step 2 — Template:** Prompt template textarea (monospace) + FieldPalette sidebar (Text Input, Multiple Choice, Wildcard, Character Ref panels)
**Step 3 — Save:** Summary preview, "Share to Community" checkbox, "Save Recipe" button

---

## Gallery

**Tab ID:** `gallery`

The unified gallery is shared across Shot Creator and the standalone Gallery tab. See [Shot Creator > Right Panel > Images Tab](#images-tab-unifiedimagegallery) for the full gallery component breakdown.

### Standalone Gallery Route (`/gallery`)
- Same `UnifiedImageGallery` component with gradient background
- Accessible without authentication

### Share Page (`/share/[shareId]`)
- Server-rendered page with image metadata
- Public share link for individual images
- Returns 404 if not found

---

## Prompt Tools

**Tab ID:** `prompt-tools`

Wildcard and style guide management tools. Contains the WildCardManager and prompt template utilities.

---

## Credits System

### Credits Display (sidebar)
| Element | Type | Details |
|---------|------|---------|
| Pts amount + Sparkles | Button | Opens pts store dialog |
| Pts Store dialog | Dialog | Balance display, coupon redemption bar, 4-column package grid |

**Credit Packages:**
| Package | Price | Pts | Color |
|---------|-------|-----|-------|
| Starter | $5.99 | 500 | Zap icon |
| Creator | $11.99 | 1,000 | Star icon |
| Pro | $23.99 | 2,000 | Crown icon |
| Studio | $47.99 | 4,000 | Sparkles icon |

Each: icon, name, price, pts, bonus (if any), image/video estimates, "Buy" button

**Footer:** "Secure checkout" | "Pts never expire" | "Instant delivery"

### Redeem Code Dialog
- Code input (uppercase), "Redeem" button
- Success: Green checkmark + "You've received {points} pts." + "Awesome" button

### Credit Insufficiency Modal
- Required vs Available vs Shortfall display
- 4 credit packages with "Recommended" badge
- "Alternative Options" section (if lower-cost alternatives exist)
- "Buy {amount} Pts - ${price}" button

---

## Admin Dashboard

**Route:** `/admin`
**Protection:** `useAdminAuth()` hook — shows "Authentication Required" or "Access Denied" if not authorized.

### 9 Admin Tabs

| Tab | Key Elements |
|-----|-------------|
| **Users** | 4 stat cards (Total Users, Pts Purchased, Pts Used, Revenue). Search bar + table (Email, Balance, Gens, Purchased, Used, Joined, Actions). Grant Pts dialog (amount input, description, conversion display). |
| **Activity** | "Hide my accounts" checkbox. GenerationStats chart. GenerationsTable with export. |
| **Coupons** | Coupons table (Code, Points, Max Uses, Used, Expires, Active, Actions). Create Coupon dialog (code, points, max uses, expiration date). Delete button per coupon. |
| **Templates** | PromptTemplateEditor component for creating/editing/deleting templates. |
| **Community** | CommunityModerationTab for moderating community-submitted content. |
| **API** | ApiUsageTab for API usage tracking and key management. |
| **Financials** | Period selector (Today/Week/Month/All/Custom). 5 stat cards (Customers, Revenue, Purchases, Avg Order, Refund Rate). Transactions table (Email, Amount, Pts, Status, Date, Package). Export button. |
| **Recipes** | Recipe management: category/type filters, search, bulk delete. Expandable recipe rows. Recipe Editor dialog (3 tabs: Details, Fields, Stages). |
| **Styles** | StyleSheetsTab for managing style sheets. |

---

## Landing Page

**Route:** `/landing`

### Sections (top to bottom)
1. **Sticky Nav** — Logo + "Start Creating" button (appears on scroll)
2. **Cinematic Hero** — ClapperboardHero component
3. **Trusted By Marquee** — Infinite scroll: AIOBR, Hood History Club, Machine King Labs, LogNog, MyFieldTime
4. **Feature Sections (4)** — Storyboard, Music Lab, Storybook, Shot Animator. Each: headline, description, 3 bullets, flipbook/banner, "Try It Free" button
5. **Shot Creator** — "One Prompt. Ten Images." with prompt visualizer video, 3 bullets
6. **Pricing** — 4-column grid (Starter $5.99, Creator $11.99 "Most Popular", Pro $23.99, Studio $47.99)
7. **Final CTA** — "Your Vision. Rendered." + "Start Creating Free" button + 2 checkmarks

---

## Help System

### Help Dialog (modal, triggered from sidebar HelpCircle)
**Component:** `UserManual` with 6 tabs:

| Tab | Content |
|-----|---------|
| Getting Started | Intro and navigation guide |
| Storyboard | Generating shots, greenlight & ratings |
| Director Vision | 4 AI directors (Ryan Cooler, Wes Sanderson, Hype Millions, David Pincher) |
| Shot Lab | Blocking (layout) + VFX Bay (masking) |
| Syntax | Prompt syntax: INT/EXT, [style]/[lighting], {character} |
| Gallery | Folders, filtering, bulk actions |

---

## Interactive Element Totals (Approximate)

| Category | Count |
|----------|-------|
| Main feature tabs | 14 |
| Auth screens | 5 |
| Admin tabs | 9 |
| Modal dialogs | 35+ |
| Form inputs (text/textarea/number) | 100+ |
| Buttons (primary, secondary, icon) | 200+ |
| Dropdowns/selects | 40+ |
| Toggle switches | 25+ |
| Sliders | 15+ |
| Drag-drop zones | 10+ |
| Grids/tables | 20+ |

---

*Generated from codebase analysis of Directors Palette v2.*
