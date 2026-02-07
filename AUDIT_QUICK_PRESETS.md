# Quick Presets System Audit

## Problem Summary
When users mark prompts as "Quick Access" in the Prompt Library, they DON'T appear in the Quick Presets bar. The two systems are completely disconnected.

---

## Architecture Discovery

### TWO SEPARATE SYSTEMS (Not Connected!)

#### 1. Static Quick Presets (What's Actually Shown)
**File:** `src/features/shot-creator/constants/index.ts` (lines 8-15)
```typescript
export const quickPresets = [
    { name: 'Cinematic', prompt: 'cinematic shot, dramatic lighting...' },
    { name: 'Portrait', prompt: 'professional portrait...' },
    { name: 'Landscape', prompt: 'stunning landscape...' },
    { name: 'Abstract', prompt: 'abstract composition...' },
    { name: 'Street', prompt: 'street photography...' },
    { name: 'Macro', prompt: 'macro photography...' }
]
```
- **Hardcoded** - Cannot be changed by users
- **This is what the UI displays** in the Quick Presets bar

#### 2. Dynamic Quick Prompts (User's Saved Prompts - NOT Shown!)
**File:** `src/features/shot-creator/store/prompt-library-store.ts`
```typescript
interface PromptLibraryState {
  quickPrompts: SavedPrompt[]  // Filtered from prompts where isQuickAccess: true
  // ...
}
```
- Stored in Zustand store
- Saved to Supabase via `prompt-library-settings.service.ts`
- Has `toggleQuickAccess(id)` action
- **NOT connected to the UI Quick Presets bar!**

---

## The Disconnect

```
PROMPT LIBRARY (Zustand Store)          QUICK PRESETS BAR (UI)
================================        ========================
SavedPrompt { isQuickAccess: true }     quickPresets[] from constants
         ↓                                        ↓
store.quickPrompts                      Static array (6 items)
         ↓                                        ↓
   [NOT USED]                           Rendered in UI
         ↓                                        ↓
   DEAD END                             User sees hardcoded presets
```

---

## Key Files

| File | Purpose | Issue |
|------|---------|-------|
| `constants/index.ts` | Static quickPresets array | Hardcoded, can't be modified |
| `prompt-library-store.ts` | Dynamic quickPrompts in Zustand | Not connected to UI |
| `creator-prompt-settings/index.tsx` | Renders Quick Presets bar | Uses static array, ignores Zustand |
| `prompt-library-presets.ts` | 96 prompts with `isQuickAccess` flag | Seeded but not used in bar |
| `NanoBananaPromptLoader.tsx` | Seeds prompts with isQuickAccess | Works, but bar ignores it |
| `PromptBrowser.tsx` | New component showing all prompts | Shows isQuickAccess badge but can't toggle |

---

## UI Rendering Flow

**Current (Broken):**
```
creator-prompt-settings/index.tsx line 21:
  import { quickPresets } from "../../constants"

creator-prompt-settings/index.tsx lines 122-134:
  {quickPresets.map((preset) => (
      <Button onClick={() => insertPreset(preset.prompt)}>
          {preset.name}
      </Button>
  ))}
```

**Should Be:**
```
// Import from Zustand store instead
const { quickPrompts } = usePromptLibraryStore()

// Or use the hook
const { quickPrompts } = usePromptLibraryManager()

// Then render user's saved quick prompts
{quickPrompts.map((prompt) => (
    <Button onClick={() => insertPreset(prompt.prompt)}>
        {prompt.title}
    </Button>
))}
```

---

## Issues to Fix

### 1. Connect Quick Presets Bar to Zustand Store
- Replace `quickPresets` import with `usePromptLibraryStore().quickPrompts`
- Render user's actual quick access prompts

### 2. Allow Deleting Quick Presets
- Add delete/remove button to each quick preset chip
- Call `toggleQuickAccess(id)` to remove from quick access

### 3. Keep Space Efficient
- Don't expand the quick presets area
- Use compact chips with X button on hover
- Limit to ~8-10 quick presets max

### 4. PromptBrowser Integration
- Add star/toggle button to PromptBrowser items
- When clicked, adds/removes from quick access
- Should reflect immediately in Quick Presets bar

---

## Recommended Fix Approach

### Option A: Minimal Change (Replace Static with Dynamic)
1. In `creator-prompt-settings/index.tsx`:
   - Import `usePromptLibraryStore` instead of `quickPresets`
   - Map over `quickPrompts` instead of static array
   - Add X button to remove from quick access

2. In `PromptBrowser.tsx`:
   - Add star/toggle button to add to quick access
   - Connect to `toggleQuickAccess(id)`

### Option B: Unified Quick Presets Component
1. Create `QuickPresetsBar.tsx` component
   - Reads from Zustand store
   - Shows compact chips
   - X button to remove
   - "+ Add" button that opens PromptBrowser

---

## Store Actions Available

Already implemented in `prompt-library-store.ts`:
- `toggleQuickAccess(id)` - Toggles isQuickAccess for a prompt
- `quickPrompts` - Computed list of prompts where isQuickAccess: true
- `loadUserPrompts(userId)` - Loads from Supabase
- `debouncedSaveToSettings(userId)` - Auto-saves changes

---

## Data Flow (How It Should Work)

```
1. User opens Prompt Library
2. Clicks star on a prompt → toggleQuickAccess(id)
3. Zustand updates quickPrompts array
4. Quick Presets bar re-renders with new prompt
5. Changes saved to Supabase (debounced)

To remove:
1. User clicks X on quick preset chip
2. toggleQuickAccess(id) called
3. Prompt removed from quickPrompts
4. Bar updates immediately
```

---

## Testing Checklist

After fix:
- [ ] Mark prompt as quick access → appears in bar
- [ ] Click X on quick preset → removed from bar
- [ ] Quick presets persist after page reload
- [ ] Quick presets sync across sessions
- [ ] Space-efficient (doesn't overflow)
- [ ] Works on mobile
