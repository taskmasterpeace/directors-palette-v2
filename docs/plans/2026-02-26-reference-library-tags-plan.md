# Reference Library Tag Pills — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show tags as always-visible pills on Reference Library images in both grid and list views.

**Architecture:** Single file change to `ShotReferenceLibrary.tsx`. Tags data already exists on `LibraryImageReference.tags` and is loaded from Supabase. We just render it.

**Tech Stack:** React, Tailwind CSS, Next.js

---

### Task 1: Add tag pills to Grid View

**Files:**
- Modify: `src/features/shot-creator/components/reference-library/ShotReferenceLibrary.tsx:131-137`

**Step 1: Add tag pills between the `<Image>` and the category icon**

Insert a new block after line 129 (closing `/>` of `<Image>`) and before line 131 (`{/* Category icon */}`).

Replace the existing category icon block (lines 131-137):

```tsx
                                                {/* Category icon */}
                                                <div className="absolute bottom-1 right-1 bg-black/80 rounded p-1">
                                                    {item.category === 'people' && <Users className="w-3 h-3 text-accent" />}
                                                    {item.category === 'places' && <MapPin className="w-3 h-3 text-emerald-400" />}
                                                    {item.category === 'props' && <Package className="w-3 h-3 text-orange-400" />}
                                                    {(!item.category || item.category === 'unorganized') && <ImageIcon className="w-3 h-3 text-muted-foreground" />}
                                                </div>
```

With:

```tsx
                                                {/* Tag pills - bottom left */}
                                                {item.tags && item.tags.length > 0 && (
                                                    <div className="absolute bottom-1 left-1 flex gap-1 max-w-[calc(100%-2rem)]">
                                                        {item.tags.slice(0, 2).map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="bg-black/70 text-white text-[10px] leading-tight px-1.5 py-0.5 rounded-full truncate max-w-[5rem]"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {item.tags.length > 2 && (
                                                            <span className="bg-violet-500/70 text-white text-[10px] leading-tight px-1.5 py-0.5 rounded-full">
                                                                +{item.tags.length - 2}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Category icon */}
                                                <div className="absolute bottom-1 right-1 bg-black/80 rounded p-1">
                                                    {item.category === 'people' && <Users className="w-3 h-3 text-accent" />}
                                                    {item.category === 'places' && <MapPin className="w-3 h-3 text-emerald-400" />}
                                                    {item.category === 'props' && <Package className="w-3 h-3 text-orange-400" />}
                                                    {(!item.category || item.category === 'unorganized') && <ImageIcon className="w-3 h-3 text-muted-foreground" />}
                                                </div>
```

**Step 2: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/features/shot-creator/components/reference-library/ShotReferenceLibrary.tsx
git commit -m "feat(reference-library): add tag pills to grid view"
git push origin main
```

---

### Task 2: Add tag pills to List View

**Files:**
- Modify: `src/features/shot-creator/components/reference-library/ShotReferenceLibrary.tsx:215-218`

**Step 1: Add tags inline below the category line**

Replace the existing text block (lines 215-218):

```tsx
                                            <div className="flex-1">
                                                <p className="text-sm text-foreground">{item.prompt || 'Untitled'}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{item.category || 'unorganized'}</p>
                                            </div>
```

With:

```tsx
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground truncate">{item.prompt || 'Untitled'}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-xs text-muted-foreground capitalize">{item.category || 'unorganized'}</p>
                                                    {item.tags && item.tags.length > 0 && (
                                                        <div className="flex gap-1 flex-wrap">
                                                            {item.tags.map((tag) => (
                                                                <span
                                                                    key={tag}
                                                                    className="bg-violet-500/20 text-violet-300 text-[10px] leading-tight px-1.5 py-0.5 rounded-full"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
```

**Step 2: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/features/shot-creator/components/reference-library/ShotReferenceLibrary.tsx
git commit -m "feat(reference-library): add tag pills to list view"
git push origin main
```

---

### Task 3: Visual verification

**Step 1: Start dev server and verify**

Run: `cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &`

Open the shot creator page, navigate to the Reference Library tab. Verify:
- Grid view: tags appear as small dark pills at bottom-left of images
- Grid view: images with 3+ tags show first 2 + a violet `+N` pill
- Grid view: images with no tags show nothing extra
- List view: tags appear as violet-tinted pills after the category label
- List view: all tags are shown (no truncation)
- Category icon at bottom-right is not overlapped by tags

**Step 2: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix(reference-library): polish tag pill styling" && git push origin main
```
