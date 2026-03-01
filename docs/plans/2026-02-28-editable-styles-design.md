# Editable Styles Design

## Goal

Allow users to edit any style (preset or custom) in the Shot Creator, with the ability to reset presets back to their code-level defaults. Admins change defaults by editing `PRESET_STYLES` in code and deploying.

## Current State

The Shot Creator has a style system with two types:
- **Preset styles** — defined in `PRESET_STYLES` array in `storyboard.types.ts` (Puppet Theater, Neon Noir, etc.)
- **Custom styles** — user-created, stored in localStorage via Zustand persist

Custom styles can be created, edited, and deleted. Preset styles can only be selected or hidden — they cannot be edited from the UI.

## Design

### Preset Overrides

Add a `presetOverrides` map to the `custom-styles.store.ts` Zustand store:

```typescript
presetOverrides: Record<string, Partial<PresetStyle>>
```

When `getStyleById` or `getAllStyles` is called, merge code defaults with overrides:

```typescript
const preset = PRESET_STYLES.find(s => s.id === id)
const override = presetOverrides[id]
return override ? { ...preset, ...override } : preset
```

### Edit Button on All Styles

Currently the Edit (pencil) button only shows for custom styles. Change `StyleSelector.tsx` to show Edit for any selected style — preset or custom.

For presets, the edit dialog saves changes to `presetOverrides`. For custom styles, behavior is unchanged.

### Reset to Default

Add `resetPresetOverride(id: PresetStyleId)` to the store. When called, removes the override for that preset, restoring the code-level default.

In the UI, show a "Reset to Default" option on presets that have been overridden. This could be a small button in the edit dialog or next to the Edit button.

### Edit Dialog Improvements

Add the "AI Analyze Style" button to the edit dialog (currently only in the create dialog). This lets users upload a new reference image and have AI re-analyze it.

### Admin Flow

Admins change defaults by editing the `PRESET_STYLES` array in `src/features/storyboard/types/storyboard.types.ts` and deploying. All users get new defaults automatically. User overrides still take priority.

## Files Changed

1. `src/features/shot-creator/store/custom-styles.store.ts` — Add `presetOverrides`, `setPresetOverride`, `resetPresetOverride`, update `getAllStyles` and `getStyleById` to merge overrides
2. `src/features/shot-creator/components/creator-prompt-settings/StyleSelector.tsx` — Show Edit button for all styles, add Reset to Default, add AI Analyze to edit dialog
3. No database changes. No new API routes. No changes to generation logic.

## What Stays the Same

- Create custom style flow
- Delete/hide flow
- Style injection into generation (`useImageGeneration.ts`)
- `AddCustomStyleModal` in Storyboard (separate component)
- `PresetStyleSelector` in Storyboard (separate component)
