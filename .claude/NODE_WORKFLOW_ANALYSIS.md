# Node Workflow Analysis & UI Reorganization Proposal
**Date**: January 14, 2026
**Purpose**: Analyze node-banana vs BananaFlow-ZHO and propose Directors Palette reorganization

---

## 📊 Repository Comparison

### [node-banana](https://github.com/shrimbly/node-banana)

**What It Is**: Node-based visual workflow editor for Nano Banana image generation

**Tech Stack**:
- Next.js 16 (App Router) + TypeScript
- **@xyflow/react** (React Flow) - Node editor
- **Konva.js / react-konva** - Canvas annotation
- Zustand for state
- Tailwind CSS
- Google Gemini + OpenAI APIs

**Key Features**:
1. **Visual Node Editor** - Infinite pan/zoom canvas with drag-and-drop nodes
2. **Image Annotation** - Full-screen drawing tools (shapes, arrows, freehand, text)
3. **AI Quickstart** - Generate workflows from natural language descriptions
4. **Type-Safe Connections** - Image handles → image, text handles → text
5. **Workflow Chaining** - Connect multiple operations
6. **Save/Load** - Export/import workflows as JSON
7. **Lock Node Groups** - Skip execution for sections

**Node Types**:
- Image generation nodes
- Text generation nodes
- Annotation nodes
- Multiple image inputs, single text inputs

**Status**:
- MIT License
- 4 contributors
- Early development
- Built primarily with Claude Opus 4.5

**Strengths**:
- ✅ Clean React Flow implementation
- ✅ Type-safe node connections
- ✅ Built-in annotation tools (Konva)
- ✅ Simple, focused feature set
- ✅ MIT license (easy to learn from)

**Weaknesses**:
- ⚠️ Early stage, small community
- ⚠️ Google Gemini only (no Replicate/nano-banana-pro)
- ⚠️ Limited node types
- ⚠️ No video support

---

### [BananaFlow-ZHO](https://github.com/ZHO-ZHO-ZHO/BananaFlow-ZHO)

**What It Is**: Open-source workflow automation platform with Nano Banana + Veo3 (video)

**Tech Stack**:
- React + TypeScript (99.4%)
- Vite build tool
- Google Gemini API
- Veo3 for video generation
- Node.js runtime

**Key Features**:
1. **Dual-Mode Interface** - Workflow mode AND window mode
2. **High-Fidelity UI** - Polished design, extensive customization
3. **AI-Powered Automation** - Gemini 2.5 Flash integration
4. **Preset Workflows** - Template-based patterns
5. **Video Generation** - Veo3 integration (unique!)
6. **Scene-by-Scene Workflows** - Storyboard iteration

**Integration Points**:
- **Nano Banana** (Gemini 2.5 Flash Image) - Image generation/editing
- **Veo3** - Video generation with camera controls
- **Gemini Flow** - Scene builder, asset management

**Status**:
- Created: September 9, 2025
- 319 stars, 57 forks
- Active development (major UI refresh Sept 11)
- Chinese developer community

**Strengths**:
- ✅ More mature, polished UI
- ✅ Video generation (Veo3) - Directors Palette needs this!
- ✅ Dual-mode flexibility
- ✅ Larger community (319 stars vs node-banana's smaller base)
- ✅ Template/preset system
- ✅ Scene-by-scene workflow (perfect for film/music video work)

**Weaknesses**:
- ⚠️ Less documentation (Chinese-focused)
- ⚠️ Harder to extract code patterns
- ⚠️ Vite (we use Next.js/Turbopack)
- ⚠️ Potentially more complex to integrate

---

## 🎯 Head-to-Head Comparison

| Feature | node-banana | BananaFlow-ZHO | Winner |
|---------|-------------|----------------|--------|
| **Tech Alignment** | Next.js (matches ours) | Vite | node-banana |
| **UI Maturity** | Early stage | Polished | BananaFlow |
| **Video Support** | ❌ No | ✅ Veo3 | BananaFlow |
| **Code Clarity** | ✅ Clean, MIT | ⚠️ Less docs | node-banana |
| **Node Editor** | React Flow | Unknown | node-banana |
| **Canvas Tools** | Konva | Unknown | node-banana |
| **Community** | Small (4) | Medium (319⭐) | BananaFlow |
| **Presets** | ❌ No | ✅ Yes | BananaFlow |
| **Dual Modes** | ❌ No | ✅ Yes | BananaFlow |
| **License** | MIT (clear) | Unknown | node-banana |

---

## 💡 Recommendation for Directors Palette

### Primary Inspiration: **node-banana**

**Why**:
1. **Tech stack match** - Next.js 16 + React + TypeScript (exactly our stack)
2. **React Flow** - Industry-standard node editor, well-documented
3. **Konva canvas** - Proven annotation library
4. **MIT license** - Can study implementation freely
5. **Simpler to integrate** - Smaller surface area, cleaner code

### Secondary Inspiration: **BananaFlow-ZHO**

**What to borrow**:
1. **Dual-mode concept** - Workflow mode vs. simplified mode
2. **Preset/template system** - Pre-built workflows for common tasks
3. **Scene-by-scene approach** - Fits music video/storyboard workflows
4. **Video integration roadmap** - Plan for Veo3 later

---

## 🏗️ Implementation Strategy

### Phase 1: Core Node Workflow (Inspired by node-banana)

**Features to build**:
- React Flow canvas (infinite pan/zoom)
- Node types:
  - **Input Node** - Upload image/video
  - **Prompt Node** - Text prompt with style controls
  - **Generation Node** - nano-banana/nano-banana-pro
  - **Annotation Node** - Opens Canvas Editor inline
  - **Recipe Node** - Execute recipe from Shot Creator
  - **Output Node** - Preview/download
- Type-safe connections (image → image, text → text)
- Save/load workflows as JSON
- Execute workflow (run all nodes in sequence)

**Tech Stack**:
```
@xyflow/react (React Flow) - Node editor
zustand - Workflow state
Our existing services:
  - image-generation.service.ts
  - recipe-execution.service.ts
  - canvas annotation (FabricCanvas)
```

### Phase 2: Advanced Features (Inspired by BananaFlow-ZHO)

- **Preset Workflows**:
  - "Character Turnaround" (4 angles)
  - "Before/After" (2 variations)
  - "Style Exploration" (5 styles, same prompt)
  - "Storyboard Sequence" (8 shots from story)
- **Dual Mode**:
  - Expert Mode: Full node editor
  - Simple Mode: Template-based form
- **Video Nodes** (future):
  - Integrate Veo via Replicate
  - Scene-by-scene video generation

---

## 🗂️ CRITICAL: UI Reorganization Proposal

### Current Problem

After adding Node Workflow, you'll have:
- **Canvas Editor** - Annotation/inpainting (form-based)
- **Shot Creator** - Single shot generation (form-based)
- **Node Workflow** - Multi-step visual pipeline (node-based)

These are all IMAGE GENERATION tools but with different UX. Users will be confused about which to use when.

---

## 🎨 Proposed New Navigation Structure

### Option 1: "By Creation Method" (Recommended)

```
🎬 PROJECTS (what you're making)
├── 📖 Storybook (children's books)
├── 🎞️ Storyboard (cinematic sequences)
└── 🎵 Music Lab (music video treatments)

⚡ TOOLS (how you create)
├── 🎯 Quick Shot (single image, form-based) [was: Shot Creator]
├── 🔀 Workflow (multi-step, node-based) [NEW]
└── ✏️ Canvas Editor (annotation/inpainting)

📁 LIBRARY
├── 🖼️ Gallery (all generations)
└── 📦 Recipes (saved templates)

⚙️ ADMIN
└── 👑 Admin Panel
```

**Why this works**:
- **Projects** = Goal-oriented (user knows what they want to make)
- **Tools** = Creation method (user picks based on complexity)
- **Library** = Storage/organization
- Clear hierarchy: Make project → Use tool → Store in library

**Tool Selection Guide** (shown as tooltips):
- **Quick Shot**: "Single image, fastest way. Use presets or custom prompts."
- **Workflow**: "Multi-step pipeline. Chain operations, test variations, complex editing."
- **Canvas Editor**: "Annotate and inpaint. Fix specific areas with masks/arrows/text."

---

### Option 2: "By Complexity"

```
🚀 QUICK CREATE
├── 🎯 Shot Creator (single image)
├── ✏️ Canvas Editor (quick edits)

🔬 ADVANCED
├── 🔀 Node Workflow (pipelines)
├── 📖 Storybook (projects)
├── 🎞️ Storyboard (projects)
└── 🎵 Music Lab (projects)

📁 LIBRARY
├── 🖼️ Gallery
└── 📦 Recipes

⚙️ ADMIN
```

**Why this could work**:
- Beginner-friendly (Quick Create = easy tools)
- Power users go to Advanced
- Clear progression

**Concerns**:
- Storybook/Storyboard aren't necessarily "advanced"
- Mixing tools and projects in same category

---

### Option 3: "Tabs with Submenus"

```
CREATE ▼
├── Quick Shot
├── Node Workflow
└── Canvas Editor

PROJECTS ▼
├── Storybook
├── Storyboard
└── Music Lab

LIBRARY ▼
├── Gallery
└── Recipes
```

**Why this could work**:
- Compact navigation
- Clear separation
- Scalable (can add more tools/projects)

**Concerns**:
- Requires submenu interaction (extra click)
- Mobile experience?

---

## 🎯 Final Recommendation

**Use Option 1: "By Creation Method"** with these modifications:

### Top Navigation Structure

```
[Logo]  Projects ▼  |  Tools ▼  |  Library ▼  |  Admin

PROJECTS DROPDOWN:
├── 📖 Storybook
├── 🎞️ Storyboard
└── 🎵 Music Lab

TOOLS DROPDOWN:
├── 🎯 Quick Shot (form-based, single image)
├── 🔀 Workflow (node-based, multi-step)
└── ✏️ Canvas (annotation & inpainting)

LIBRARY DROPDOWN:
├── 🖼️ Gallery
└── 📦 Recipes
```

### Homepage Redesign

**Hero Section**: "What do you want to make today?"

**Quick Actions**:
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  🎯 Quick    │  │  🔀 Workflow │  │  📖 Story-   │
│     Shot     │  │              │  │     book     │
│              │  │              │  │              │
│  Generate a  │  │  Build multi-│  │  Create a    │
│  single      │  │  step image  │  │  children's  │
│  image fast  │  │  pipeline    │  │  book        │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  🎞️ Story-   │  │  🎵 Music    │  │  ✏️ Canvas   │
│     board    │  │     Lab      │  │     Editor   │
│              │  │              │  │              │
│  Cinematic   │  │  Music video │  │  Annotate &  │
│  sequences   │  │  treatments  │  │  inpaint     │
└──────────────┘  └──────────────┘  └──────────────┘
```

**User Flow**:
1. User lands on homepage
2. Sees 6 clear options (Projects + Tools)
3. Clicks based on WHAT they want (project) or HOW they want to work (tool)
4. Projects route to project-specific UIs
5. Tools route to creation UIs

---

## 🚧 Implementation Checklist

### Week 1-2: Research & Prototype
- [ ] Install React Flow: `npm install @xyflow/react`
- [ ] Study node-banana implementation (clone repo, run locally)
- [ ] Prototype basic node canvas with 3 node types
- [ ] Test workflow execution engine
- [ ] Design node UI components

### Week 3-4: Core Node Workflow
- [ ] Create `src/features/node-workflow/` structure
- [ ] Implement node types (Input, Prompt, Generation, Output)
- [ ] Build workflow execution service
- [ ] Connect to existing image-generation.service.ts
- [ ] Save/load workflow JSON

### Week 5: Integration
- [ ] Add "Workflow" to navigation
- [ ] Create workflow gallery/library
- [ ] Build 3 preset workflows
- [ ] Connect Recipe Node to Shot Creator recipes

### Week 6: Polish & Reorganization
- [ ] Implement new navigation structure (Option 1)
- [ ] Redesign homepage
- [ ] Add tooltips/help system
- [ ] Update documentation (CLAUDE.md)
- [ ] User testing

---

## 📚 Key Learnings from Both Repos

### From node-banana:
1. **React Flow is THE standard** for node editors (well-maintained, huge community)
2. **Konva.js** for canvas annotation (used by both projects)
3. **Type-safe connections** prevent user errors
4. **JSON serialization** for save/load (portable, debuggable)
5. **Infinite canvas** is expected UX for node editors

### From BananaFlow-ZHO:
1. **Preset workflows** massively improve UX for beginners
2. **Dual-mode interface** serves both experts and beginners
3. **Video integration** (Veo3) is a killer feature for Directors Palette's use case
4. **Scene-by-scene** workflow fits music videos perfectly
5. **Asset management** is crucial for complex projects

---

## 🎬 Why This Matters for Directors Palette

You're building a **professional creative tool for filmmakers**. Node workflows unlock:

1. **Experimentation** - Test 10 variations of a character design in one workflow
2. **Repeatability** - Save and reuse complex pipelines
3. **Collaboration** - Share workflows as JSON files
4. **Power User Features** - Without cluttering the simple UI
5. **Bridge to Video** - Foundation for Veo3 video workflows later

The reorganization is CRITICAL because:
- Users need to know **when to use which tool**
- Projects vs. Tools separation makes this obvious
- Scalable for future features (more tools, more project types)

---

## 🚀 Next Steps

1. **Clone node-banana** and run it locally to study implementation
2. **Prototype** a basic 3-node workflow in Directors Palette
3. **Design** the new navigation system (Option 1)
4. **Get user feedback** on navigation structure before building

**Want me to start prototyping the node workflow feature or redesigning the navigation first?**
