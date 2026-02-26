# Reference Library Tag Pills — Design

**Date:** 2026-02-26
**Scope:** Show tags on images in the Shot Creator Reference Library

## Problem

Tags are stored on `LibraryImageReference.tags` and loaded from Supabase, but never rendered in the Reference Library UI. Users cannot see which tags are assigned to their reference images.

## Solution

Add always-visible tag pills to reference library images in both grid and list views.

## Visual Design

### Grid View
- **Position:** Bottom-left corner of each image, `absolute bottom-1 left-1`
- **Style:** `bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-full`
- **Layout:** Horizontal flex, `gap-1`, no wrapping
- **Truncation:** Max 2 tags shown. Overflow shown as `+N` pill in `bg-violet-500/70`
- **Category icon** stays at bottom-right — no collision

### List View
- Tags shown inline after category text as small pills or comma-separated text
- All tags shown (no truncation)

### No Tags
Render nothing — no empty placeholder.

## Data Flow

No changes needed. `tags: string[]` already exists on `LibraryImageReference` and is populated from Supabase query results.

## Files to Modify

- `src/features/shot-creator/components/reference-library/ShotReferenceLibrary.tsx` — add tag rendering in both grid and list views
