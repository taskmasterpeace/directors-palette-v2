# Specification: Fix Mobile Layout Issues in Prompt Tools UI

## Overview

The Prompt Tools section (Recipes, Library, Wildcards, and Styles tabs) has critical mobile responsiveness issues that make the feature unusable on mobile devices. Content is being cut off, buttons are misaligned or off-screen, and text is overflowing containers. This task will fix all mobile layout issues across all four Prompt Tools tabs while avoiding any changes to the Gallery feature (which has separate ongoing work).

## Workflow Type

**Type**: feature

**Rationale**: This is a targeted fix for existing functionality that involves CSS/layout modifications across multiple components. It requires systematic changes to responsive breakpoints, flexbox/grid configurations, and container sizing across the Prompt Tools feature.

## Task Scope

### Services Involved
- **main** (primary) - Next.js frontend application with Tailwind CSS styling

### This Task Will:
- [ ] Fix Recipes tab mobile layout - buttons accessible, content not cut off
- [ ] Fix Library tab mobile layout - header buttons properly arranged, text within columns
- [ ] Fix Wildcards tab mobile layout - cards properly sized and scrollable
- [ ] Fix Styles tab mobile layout - style selector and create functionality working
- [ ] Ensure tab navigation works on mobile (icons/text not overflowing)
- [ ] Maintain desktop layout behavior unchanged

### Out of Scope:
- Gallery component/feature (active development, risk of conflicts)
- Any non-Prompt Tools sections
- Adding new features or functionality
- Backend/API changes

## Service Context

### Main (Next.js Frontend)

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- Styling: Tailwind CSS
- State Management: Zustand
- Key directories: `src/features/prompt-tools`, `src/features/shot-creator/components`

**Entry Point:** `src/app/page.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `src/features/prompt-tools/components/PromptToolsPage.tsx` | main | Add responsive breakpoints to TabsList, make tab content mobile-friendly |
| `src/features/shot-creator/components/creator-prompt-settings/PromptToolsTabs.tsx` | main | Improve mobile tab layout and content containers |
| `src/features/shot-creator/components/recipe/RecipeBuilder.tsx` | main | Fix header button overflow, make recipe cards mobile-friendly |
| `src/features/shot-creator/components/creator-prompt-settings/PromptLibraryCard.tsx` | main | Fix header with Export/Import/Add buttons, collapse to dropdown on mobile |
| `src/features/shot-creator/components/wildcard/WildCardManager.tsx` | main | Improve grid layout for small screens, ensure scrollability |
| `src/features/shot-creator/components/creator-prompt-settings/StyleSelector.tsx` | main | Ensure create style dialog works on mobile |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `src/components/ui/tabs.tsx` | Base tabs component structure |
| `src/components/ui/button.tsx` | Standard button sizing for mobile |
| `src/components/SidebarNavigation.tsx` | Mobile-responsive navigation patterns |
| `src/features/shot-creator/components/prompt-library/mobile/PromptLibraryMobile.tsx` | Existing mobile-specific implementation for prompts |

## Patterns to Follow

### Responsive Button Groups

Collapse multiple action buttons into a dropdown menu on mobile:

```tsx
// Desktop: Show all buttons
<div className="hidden md:flex items-center gap-2">
  <Button>Export</Button>
  <Button>Import</Button>
  <Button>Add</Button>
</div>

// Mobile: Collapse to dropdown
<div className="flex md:hidden">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="sm"><MoreVertical /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem>Export</DropdownMenuItem>
      <DropdownMenuItem>Import</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  <Button size="sm">Add</Button> {/* Keep primary action visible */}
</div>
```

**Key Points:**
- Use `hidden md:flex` and `flex md:hidden` to toggle visibility
- Keep primary actions visible on mobile, collapse secondary actions
- Match existing dropdown patterns in the codebase

### Responsive Grid Layout

Use proper responsive grid breakpoints:

```tsx
// Good: Responsive grid that reduces columns on mobile
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">

// Bad: Fixed columns that don't adapt
<div className="grid grid-cols-4 gap-3">
```

**Key Points:**
- Start with `grid-cols-1` for mobile-first design
- Progressively increase columns at larger breakpoints
- Ensure minimum column width is usable on small screens

### Tab List on Mobile

Make tab triggers icon-only on mobile:

```tsx
<TabsList className="w-full grid grid-cols-4">
  <TabsTrigger value="recipes" className="gap-1 px-2 sm:px-4">
    <FlaskConical className="w-4 h-4" />
    <span className="hidden sm:inline text-xs">Recipes</span>
    <Badge className="hidden sm:inline-flex">{count}</Badge>
  </TabsTrigger>
</TabsList>
```

**Key Points:**
- Hide text labels on mobile using `hidden sm:inline`
- Reduce padding on smaller screens with `px-2 sm:px-4`
- Keep icons visible as they're sufficient for navigation

### Overflow Handling

Ensure content scrolls properly without cutting off:

```tsx
// Container with proper overflow
<div className="h-full flex flex-col overflow-hidden">
  <div className="flex-shrink-0"> {/* Fixed header */}
    {/* Header content */}
  </div>
  <div className="flex-1 overflow-auto min-h-0"> {/* Scrollable content */}
    {/* Scrollable content */}
  </div>
</div>
```

**Key Points:**
- Use `overflow-hidden` on parent containers
- Use `min-h-0` on flex children that need to scroll
- Use `flex-shrink-0` on fixed elements like headers

## Requirements

### Functional Requirements

1. **Recipes Tab Mobile Layout**
   - Description: Recipe list and action buttons must be fully accessible on mobile
   - Acceptance: All buttons (Export, Import, New Recipe) reachable without horizontal scrolling; recipe cards stack vertically with full content visible

2. **Library Tab Mobile Layout**
   - Description: Library header buttons and content must fit within mobile viewport
   - Acceptance: Header buttons consolidated into dropdown on mobile; prompt cards and category grid display properly; no text overflow outside columns

3. **Wildcards Tab Mobile Layout**
   - Description: Wildcard cards must display and scroll properly on mobile
   - Acceptance: Grid adapts to single column on very small screens; all card content visible; vertical scroll works for bottom of screen

4. **Styles Tab Mobile Layout**
   - Description: Style selector and create functionality must work on mobile
   - Acceptance: Style dropdown accessible; Create Custom Style dialog usable with touch; form fields don't overflow

5. **Tab Navigation Mobile Layout**
   - Description: Tab navigation bar must not overflow on mobile
   - Acceptance: Tab icons visible; text labels hidden on small screens if needed; badges hidden on small screens; no horizontal overflow

### Edge Cases

1. **Very Small Screens (<320px)** - Ensure minimum usability with stacked elements
2. **Landscape Mobile** - Content should still be accessible in landscape orientation
3. **Long Content** - Recipe names, wildcard names, prompt text should truncate rather than overflow
4. **Empty States** - Empty state messages should also be mobile-friendly
5. **Dialog Overlays** - Create/Edit dialogs must be scrollable if content exceeds mobile viewport

## Implementation Notes

### DO
- Follow the pattern in `PromptLibraryMobile.tsx` for mobile-specific layouts
- Reuse existing dropdown/menu patterns from `PromptLibraryCard.tsx`
- Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) consistently
- Test changes at 375px, 428px, and 768px viewport widths
- Maintain flex/grid container hierarchy for proper overflow handling

### DON'T
- Create new mobile-specific components unless absolutely necessary (prefer responsive styles)
- Use fixed pixel widths that break on mobile
- Remove functionality - only reorganize for mobile accessibility
- Touch any Gallery-related code (`UnifiedImageGallery`, `ImageGallery`, etc.)
- Add JavaScript media queries when Tailwind responsive classes suffice

## Development Environment

### Start Services

```bash
npm run dev
```

### Service URLs
- Main Application: http://localhost:3000

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

## Success Criteria

The task is complete when:

1. [ ] Recipes tab fully usable on mobile - all buttons accessible, content visible
2. [ ] Library tab fully usable on mobile - header buttons in dropdown, text within bounds
3. [ ] Wildcards tab scrollable on mobile - can reach bottom of screen
4. [ ] Styles tab Create Style dialog functional on mobile
5. [ ] Tab navigation fits mobile viewport without overflow
6. [ ] No console errors related to layout
7. [ ] Existing tests still pass
8. [ ] Desktop layout unchanged - verified by visual comparison
9. [ ] Gallery code untouched - no conflicts with ongoing gallery work

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Component renders | `tests/prompt-tools.spec.ts` | PromptToolsPage renders without errors |
| Mobile class application | Component tests | Responsive classes are correctly applied |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Tab navigation | PromptToolsPage | All tabs switch correctly on mobile |
| Create actions | All tabs | Create dialogs open and submit on mobile |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Mobile Recipes Flow | 1. Navigate to Prompt Tools on mobile 2. Switch to Recipes tab 3. Click New Recipe | Recipe form opens and is usable |
| Mobile Library Flow | 1. Navigate to Prompt Tools on mobile 2. Switch to Library tab 3. Access Export/Import | Actions accessible via dropdown |
| Mobile Wildcards Flow | 1. Navigate to Prompt Tools on mobile 2. Switch to Wildcards tab 3. Scroll to bottom | Can scroll to see all wildcards |
| Mobile Styles Flow | 1. Navigate to Prompt Tools on mobile 2. Switch to Styles tab 3. Create new style | Dialog opens, form usable, style created |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Prompt Tools - Recipes | `http://localhost:3000` → Navigate to Prompt Tools | No horizontal overflow, buttons accessible at 375px width |
| Prompt Tools - Library | `http://localhost:3000` → Prompt Tools → Library | Header buttons in dropdown, text within columns at 375px |
| Prompt Tools - Wildcards | `http://localhost:3000` → Prompt Tools → Wildcards | Cards display in single column, scrollable at 375px |
| Prompt Tools - Styles | `http://localhost:3000` → Prompt Tools → Styles | Create dialog usable at 375px |
| Tab Navigation | `http://localhost:3000` → Prompt Tools | Tabs don't overflow, icons visible at 375px |

### Mobile Device Verification
| Device/Size | Test Steps | Expected |
|-------------|------------|----------|
| iPhone SE (375px) | Test all four tabs | All content accessible, no overflow |
| iPhone 12 (390px) | Test all four tabs | All content accessible, no overflow |
| iPad Mini (768px) | Test all four tabs | Transitional layout works correctly |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| N/A | N/A | No database changes required |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete at 375px, 428px, and 768px widths
- [ ] Mobile device testing complete (or equivalent emulation)
- [ ] No regressions in existing functionality
- [ ] Code follows established Tailwind responsive patterns
- [ ] No security vulnerabilities introduced
- [ ] Gallery code remains untouched
- [ ] Desktop layout verified unchanged
