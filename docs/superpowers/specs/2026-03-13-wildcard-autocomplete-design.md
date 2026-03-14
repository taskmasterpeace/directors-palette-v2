# Wildcard Autocomplete Design

**Date:** 2026-03-13
**Status:** Approved

## Summary

Add autocomplete/typeahead for wildcards in the prompt editor. When a user types `_` (preceded by whitespace or at start of text), a dropdown appears showing all available wildcards grouped by category, with entry counts. Selecting a wildcard inserts `_name_` into the prompt.

## Requirements

1. **Trigger on `_`** — dropdown appears when user types an underscore preceded by whitespace or at position 0 (not mid-word like `snake_case`)
2. **Filter as you type** — typing `_blk` filters to wildcards containing "blk". Internal underscores are part of the query (typing `_blkmen_h` matches `blkmen_hair`)
3. **Grouped by category** — wildcards organized under category headers (hair, outfits, accessories, footwear, settings, etc.)
4. **Show key info** — each item shows: name in `_name_` format, entry count
5. **Keyboard navigation** — Arrow keys to navigate, Enter/Tab to select, Escape to close
6. **Works everywhere** — reusable hook that plugs into Shot Creator, Merch Lab, Storyboard, and any future prompt textarea
7. **All wildcards visible** — uses shared wildcards (is_shared=true) so all users see the full catalog

## Architecture

### New Files

- `src/shared/hooks/useWildcardAutocomplete.ts` — reusable hook containing all autocomplete logic
- `src/shared/components/WildcardAutocomplete.tsx` — dropdown UI component

### Hook: `useWildcardAutocomplete`

**Input:**
- `textareaRef: RefObject<HTMLTextAreaElement>` — ref to the textarea element
- `value: string` — current prompt text
- `onChange: (value: string) => void` — callback to update prompt text

**Output:**
- `isOpen: boolean` — whether dropdown is visible
- `query: string` — current filter text (chars after `_`)
- `filteredGroups: { category: string; wildcards: WildCard[] }[]` — grouped results
- `selectedIndex: number` — currently highlighted item index
- `handleKeyDown: (e: KeyboardEvent) => void` — keyboard handler to wire up
- `selectWildcard: (name: string) => void` — programmatic selection
- `close: () => void` — close dropdown

**Trigger logic:**
- Scan backwards from cursor to find the trigger `_`
- Trigger only fires if `_` is preceded by whitespace, start-of-string, or another `_` that is itself preceded by whitespace/start (to handle the case where user is still typing)
- The query is everything between the trigger `_` and the cursor position (including internal underscores)
- Example: cursor after `_blkmen_h` → query is `blkmen_h` → matches `blkmen_hair`

**Selection behavior:**
- On selection: replaces from the trigger `_` to cursor with `_selectedName_ ` (trailing space)
- Cursor placed after the trailing space

**Closing behavior:**
- Escape key
- Click outside dropdown
- Textarea blur
- No matches found (hide dropdown)
- Typing a character that makes it clearly not a wildcard (e.g., space closes it)

### Mutual exclusion with `@` autocomplete

Only one autocomplete can be open at a time. Opening `_` wildcard autocomplete closes `@` reference autocomplete, and vice versa. Both hooks check the other's state before opening.

### Component: `WildcardAutocomplete`

**Visual design:**
- Dark dropdown panel (matches app theme)
- Category headers as small uppercase labels
- Each row: `_name_` in amber monospace + entry count on the right
- Highlighted row has subtle background
- Max height with scroll (shows ~8 items)
- Positioned relative to textarea element (same as existing `@` autocomplete, not cursor-level)
- Mobile: dropdown above textarea (matching `@` autocomplete mobile behavior)

### Integration Points

1. **Shot Creator** (`PromptActions.tsx`) — already has `@reference` autocomplete; add wildcard autocomplete alongside it with mutual exclusion.

2. **Merch Lab** (`DesignPrompt.tsx`) — currently a plain textarea. Swap to `HighlightedPromptEditor` and add autocomplete.

3. **Storyboard** — uses its own prompt editor; add the hook there too.

### Data Source

Uses `useWildCardStore` from Shot Creator. The hook calls `loadWildCards()` on mount if the store is empty, so each integration point doesn't need to manage loading separately.

## Non-Goals

- No inline preview of wildcard entries in the dropdown (keep it compact)
- No drag-and-drop reordering
- No wildcard creation from the dropdown (use the Wildcards tab for that)
- No cursor-level positioning (too complex for textarea)

## Testing

- Playwright test: type `_` in Shot Creator prompt, verify dropdown appears
- Playwright test: type `_blk`, verify filtered results
- Playwright test: select a wildcard, verify `_name_` inserted into prompt
- Playwright test: type `snake_case`, verify dropdown does NOT appear (mid-word underscore)
