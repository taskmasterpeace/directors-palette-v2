# Sidebar Navigation Redesign - Directors Palette
**Date**: January 14, 2026
**Purpose**: Reorganize left sidebar using "By Creation Method" approach

---

## 🎯 Design Goals

1. **Clear hierarchy** - Projects vs. Tools vs. Library
2. **Collapsible sections** - Reduce visual clutter
3. **Maintain existing names** - "Shot Creator" stays "Shot Creator"
4. **Nested tools** - Canvas Editor under Shot Creator, Workflow under Canvas Editor
5. **Scalable** - Easy to add more features

---

## 🗂️ Proposed Sidebar Structure

### Current Structure (Flat List)
```
- Shot Creator
- Shot Animator
- Canvas Editor
- Storyboard
- Storybook
- Music Lab
- Prompt Tools
- Gallery
- Community
```

**Problems**:
- No organization (everything mixed together)
- Hard to find what you need
- Unclear relationships between features
- Will get worse when adding Node Workflow

---

### New Structure (Hierarchical, Left Sidebar)

```
┌─────────────────────────────────┐
│ [Logo] Directors Palette        │
│                                  │
│ ▼ CREATION TOOLS                │  ← Collapsible section
│   • Shot Creator                 │
│     └─ Canvas Editor             │  ← Nested under Shot Creator
│        └─ Workflow (Future)      │  ← Nested under Canvas Editor
│   • Shot Animator                │
│                                  │
│ ▼ PROJECTS                       │  ← Collapsible section
│   • Storyboard                   │
│   • Storybook                    │
│   • Music Lab                    │
│                                  │
│ ▼ LIBRARY                        │  ← Collapsible section
│   • Gallery                      │
│   • Community                    │
│                                  │
│ ▼ UTILITIES                      │  ← Collapsible section
│   • Prompt Tools                 │
│   • Help                         │
│                                  │
│ [Credits Display]                │
│ [User Avatar]                    │
│ [Collapse Button]                │
└─────────────────────────────────┘
```

---

## 🎨 Visual Design Specs

### Section Headers
- **Style**: Uppercase, small text, muted color
- **Icon**: Chevron (▼ expanded, ▶ collapsed)
- **Hover**: Subtle highlight
- **Click**: Toggle collapse/expand

### Main Items
- **Indent**: 16px from left
- **Icon**: Feature icon (Sparkles, Layout, etc.)
- **Active State**: Background highlight + border accent
- **Hover**: Subtle background change

### Nested Items
- **Indent**: 32px from left (additional 16px)
- **Visual Connection**: Vertical line connecting parent to children
- **Icon**: Smaller, muted
- **Style**: Slightly smaller text

---

## 🔍 Detailed Breakdown

### Section 1: CREATION TOOLS
**Purpose**: Single-shot and annotation workflows

```
▼ CREATION TOOLS
  ● Shot Creator              [Sparkles icon]
    └─ Canvas Editor          [Layout icon, nested]
       └─ Workflow (Future)   [GitBranch icon, nested, disabled]
  ● Shot Animator             [Film icon]
```

**Tooltips**:
- **Shot Creator**: "Generate single images with recipes and presets"
- **Canvas Editor**: "Annotate and inpaint specific areas"
- **Workflow** (future): "Multi-step visual pipelines (Coming Soon)"

**Collapsed State**: Show only section header "CREATION TOOLS ▶"

---

### Section 2: PROJECTS
**Purpose**: Goal-oriented creative workflows

```
▼ PROJECTS
  ● Storyboard    [BookOpen icon]
  ● Storybook     [BookHeart icon]
  ● Music Lab     [Music icon]
```

**Tooltips**:
- **Storyboard**: "Cinematic shot sequences for film/video"
- **Storybook**: "Children's illustrated books with narration"
- **Music Lab**: "Music video treatments with AI directors"

**Collapsed State**: Show only section header "PROJECTS ▶"

---

### Section 3: LIBRARY
**Purpose**: Storage and browsing

```
▼ LIBRARY
  ● Gallery     [Images icon]
  ● Community   [Users icon]
```

**Tooltips**:
- **Gallery**: "Browse all your generated images and videos"
- **Community**: "Explore and share creations"

**Collapsed State**: Show only section header "LIBRARY ▶"

---

### Section 4: UTILITIES
**Purpose**: Helper tools

```
▼ UTILITIES
  ● Prompt Tools    [FlaskConical icon]
  ● Help            [HelpCircle icon]
```

**Tooltips**:
- **Prompt Tools**: "Wildcards, style guides, and prompt engineering"
- **Help**: "User manual and documentation"

**Collapsed State**: Show only section header "UTILITIES ▶"

---

## 💾 Persistent State

### LocalStorage Keys
```typescript
'sidebar-section-creation-tools': 'true' | 'false'  // Expanded state
'sidebar-section-projects': 'true' | 'false'
'sidebar-section-library': 'true' | 'false'
'sidebar-section-utilities': 'true' | 'false'
'sidebar-collapsed': 'true' | 'false'              // Overall collapsed
```

### Default State
All sections expanded by default on first visit.

---

## 🎯 User Interaction Patterns

### Pattern 1: "I want to make a storybook"
1. Look at sidebar
2. See **PROJECTS** section
3. Click **Storybook**
4. Start creating

### Pattern 2: "I need to edit this image"
1. Look at sidebar
2. See **CREATION TOOLS** section
3. Click **Shot Creator** → **Canvas Editor**
4. Upload and annotate

### Pattern 3: "Where are my images?"
1. Look at sidebar
2. See **LIBRARY** section
3. Click **Gallery**
4. Browse images

---

## 🔧 Implementation Plan

### Phase 1: Data Structure (TypeScript)

```typescript
interface NavSection {
  id: string
  label: string
  icon?: React.ElementType
  items: NavItem[]
  defaultExpanded?: boolean
}

interface NavItem {
  id: TabValue
  label: string
  icon: React.ElementType
  banner: string
  comingSoon?: boolean
  children?: NavItem[]  // NEW: Support nesting
  tooltipCollapsed?: string
  tooltipExpanded?: string
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'creation-tools',
    label: 'CREATION TOOLS',
    defaultExpanded: true,
    items: [
      {
        id: 'shot-creator',
        label: 'Shot Creator',
        icon: Sparkles,
        banner: '/banners/shot-creator.webp',
        tooltipExpanded: 'Generate single images with recipes and presets',
        children: [
          {
            id: 'layout-annotation',
            label: 'Canvas Editor',
            icon: Layout,
            banner: '/banners/canvas-editor.webp',
            tooltipExpanded: 'Annotate and inpaint specific areas',
            // Future:
            // children: [
            //   {
            //     id: 'node-workflow',
            //     label: 'Workflow',
            //     icon: GitBranch,
            //     banner: '/banners/workflow.webp',
            //     comingSoon: true
            //   }
            // ]
          }
        ]
      },
      {
        id: 'shot-animator',
        label: 'Shot Animator',
        icon: Film,
        banner: '/banners/shot-animator.webp',
        tooltipExpanded: 'Animate still images into video'
      }
    ]
  },
  {
    id: 'projects',
    label: 'PROJECTS',
    defaultExpanded: true,
    items: [
      {
        id: 'storyboard',
        label: 'Storyboard',
        icon: BookOpen,
        banner: '/banners/storyboard.webp',
        tooltipExpanded: 'Cinematic shot sequences'
      },
      {
        id: 'storybook',
        label: 'Storybook',
        icon: BookHeart,
        banner: '/banners/storybook-banner.webp',
        tooltipExpanded: 'Children\\'s illustrated books'
      },
      {
        id: 'music-lab',
        label: 'Music Lab',
        icon: Music,
        banner: '/banners/music-lab.webp',
        tooltipExpanded: 'Music video treatments'
      }
    ]
  },
  {
    id: 'library',
    label: 'LIBRARY',
    defaultExpanded: true,
    items: [
      {
        id: 'gallery',
        label: 'Gallery',
        icon: Images,
        banner: '/banners/gallery.webp',
        tooltipExpanded: 'Browse all generations'
      },
      {
        id: 'community',
        label: 'Community',
        icon: Users,
        banner: '/banners/community.webp',
        tooltipExpanded: 'Explore and share'
      }
    ]
  },
  {
    id: 'utilities',
    label: 'UTILITIES',
    defaultExpanded: false, // Collapsed by default
    items: [
      {
        id: 'prompt-tools',
        label: 'Prompt Tools',
        icon: FlaskConical,
        banner: '/banners/prompt-tools.webp',
        tooltipExpanded: 'Wildcards and style guides'
      },
      {
        id: 'help',
        label: 'Help',
        icon: HelpCircle,
        banner: '/banners/help.webp',
        tooltipExpanded: 'User manual'
      }
    ]
  }
]
```

---

### Phase 2: Component Structure

```typescript
// New components needed:

1. NavSection.tsx
   - Renders section header
   - Handles collapse/expand
   - Manages persistent state

2. NavItem.tsx (refactor existing)
   - Supports nesting (recursive rendering)
   - Visual indent based on depth
   - Connection lines for children

3. Updated SidebarNavigation.tsx
   - Uses NavSection components
   - Maintains scroll position
   - Keyboard navigation (arrow keys)
```

---

### Phase 3: Styling

**Tailwind Classes**:

```typescript
// Section Header
className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-2"

// Top-level NavItem
className="mx-2 px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors"

// Nested NavItem (depth 1)
className="ml-4 px-3 py-2 rounded-lg flex items-center gap-2 text-sm"

// Nested NavItem (depth 2)
className="ml-8 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs"

// Active State
className="bg-primary/10 border-l-2 border-primary"

// Connection Line (for nested items)
className="absolute left-6 top-0 bottom-0 w-px bg-border"
```

---

## 📱 Mobile Behavior

**No changes needed** - mobile already uses Sheet menu. Can apply same organization to Sheet content.

---

## 🎨 Collapsed Sidebar Behavior

When sidebar is fully collapsed (via Ctrl+B or collapse button):

```
┌──────┐
│ [≡]  │  ← Expand button
│      │
│ ▶ C  │  ← "CREATION TOOLS" (first letter)
│      │
│ ▶ P  │  ← "PROJECTS"
│      │
│ ▶ L  │  ← "LIBRARY"
│      │
│ ▶ U  │  ← "UTILITIES"
│      │
│ [$]  │  ← Credits
│ [👤] │  ← Avatar
└──────┘
```

**On Hover**: Tooltip shows section name

---

## 🚀 Benefits

1. **Organization** - Clear mental model (Tools vs Projects vs Library)
2. **Scalability** - Easy to add Node Workflow without cluttering
3. **User Clarity** - Canvas Editor is "part of" Shot Creator workflow
4. **Collapsible** - Power users can collapse sections they don't use
5. **Consistent** - Matches modern app patterns (VS Code, Figma, etc.)

---

## ⚠️ Migration Notes

### Breaking Changes: NONE
- All existing routes stay the same
- All tab IDs unchanged
- Just reorganizing visual structure

### User Impact: POSITIVE
- More organized
- Easier to find features
- Clearer relationships

### Testing Required
- Keyboard navigation (arrow keys, Enter)
- Collapse/expand persistence
- Mobile Sheet rendering
- Active state highlighting
- Nested item clicks

---

## 🔮 Future: Adding Node Workflow

When ready to add Node Workflow:

```typescript
// In NAV_SECTIONS[0].items[0] (Shot Creator)
children: [
  {
    id: 'layout-annotation',
    label: 'Canvas Editor',
    icon: Layout,
    // ...
    children: [
      {
        id: 'node-workflow',  // NEW TAB VALUE
        label: 'Workflow',
        icon: GitBranch,
        banner: '/banners/workflow.webp',
        tooltipExpanded: 'Multi-step visual pipelines',
        comingSoon: false  // Remove flag when ready
      }
    ]
  }
]
```

**Steps to activate**:
1. Remove `comingSoon: true` flag
2. Add route in `src/app/page.tsx`
3. Create `src/features/node-workflow/` directory
4. Build React Flow implementation

---

## 📊 Comparison: Before vs After

### Before (Flat List - 9 items)
```
1. Shot Creator
2. Shot Animator
3. Canvas Editor
4. Storyboard
5. Storybook
6. Music Lab
7. Prompt Tools
8. Gallery
9. Community
```
**Cognitive Load**: HIGH (no organization)

### After (Hierarchical - 4 sections)
```
▼ CREATION TOOLS (2 items)
▼ PROJECTS (3 items)
▼ LIBRARY (2 items)
▼ UTILITIES (2 items)
```
**Cognitive Load**: LOW (clear categories)

---

## 🎯 Next Steps

### Step 1: Update TypeScript Types
- Add `children?: NavItem[]` to NavItem interface
- Create NavSection interface
- Update store types if needed

### Step 2: Create New Components
- `NavSection.tsx` - Section header with collapse
- Update `NavItem.tsx` - Support recursive rendering

### Step 3: Refactor SidebarNavigation
- Replace flat NAV_ITEMS with NAV_SECTIONS
- Implement section collapse state
- Add localStorage persistence

### Step 4: Test & Polish
- Test all interactions
- Verify mobile behavior
- Add animations (expand/collapse)
- Update keyboard shortcuts

---

**Estimated Implementation Time**: 4-6 hours
**Risk Level**: LOW (no breaking changes)
**User Impact**: HIGH (much better organization)

**Ready to implement this?**
