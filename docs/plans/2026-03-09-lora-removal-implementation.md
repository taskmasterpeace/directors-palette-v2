# LoRA Removal from Personal Stack - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow non-admin users to remove community-added LoRAs from their personal stack.

**Architecture:** Add a remove (X) button to `LoraCard` for non-built-in LoRAs. Built-in LoRAs (Nava, Pixar) cannot be removed since they auto-restore. The store already has `removeLora()` — only the UI gate needs changing.

**Tech Stack:** React, Zustand, Lucide icons, Sonner toasts

---

### Task 1: Export BUILT_IN_LORAS IDs from the store

**Files:**
- Modify: `src/features/shot-creator/store/lora.store.ts`

**Step 1: Add exported set of built-in IDs**

After the `BUILT_IN_LORAS` array (line 66), add:

```typescript
export const BUILT_IN_LORA_IDS = new Set(BUILT_IN_LORAS.map(l => l.id))
```

**Step 2: Commit**

```bash
git add src/features/shot-creator/store/lora.store.ts
git commit -m "feat(lora): export built-in LoRA IDs set"
git push origin main
```

---

### Task 2: Add remove button for non-admin users on non-built-in LoRAs

**Files:**
- Modify: `src/features/shot-creator/components/lora/LoraSection.tsx`

**Step 1: Import BUILT_IN_LORA_IDS**

Update the import from lora.store to also import `BUILT_IN_LORA_IDS`:

```typescript
import { useLoraStore, type LoraItem, BUILT_IN_LORA_IDS } from '../../store/lora.store'
```

**Step 2: Add `isBuiltIn` prop to LoraCard**

Update the `LoraCard` props to include `isBuiltIn`:

```typescript
function LoraCard({ lora, isActive, isAdmin, isBuiltIn, onToggle, onDelete, onUpdateScale, onEdit }: {
    lora: LoraItem
    isActive: boolean
    isAdmin: boolean
    isBuiltIn: boolean
    onToggle: () => void
    onDelete: () => void
    onUpdateScale: (scale: number) => void
    onEdit: () => void
}) {
```

**Step 3: Update the action buttons area in LoraCard**

Replace the admin-only delete button block (lines 105-113) with logic that shows:
- Admin: edit + delete buttons (existing behavior)
- Non-admin on non-built-in LoRAs: remove (X) button

```typescript
{/* Admin actions */}
{isAdmin && (
    <button
        onClick={onEdit}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        title="Edit LoRA"
    >
        <Pencil className="w-3 h-3" />
    </button>
)}
{isAdmin && (
    <button
        onClick={onDelete}
        className="p-1 text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0"
        title="Delete LoRA"
    >
        <Trash2 className="w-3 h-3" />
    </button>
)}
{/* Non-admin remove for community LoRAs */}
{!isAdmin && !isBuiltIn && (
    <button
        onClick={onDelete}
        className="p-1 text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0"
        title="Remove from collection"
    >
        <X className="w-3 h-3" />
    </button>
)}
```

**Step 4: Pass `isBuiltIn` when rendering LoraCard**

In the `LoraSection` component, update the `LoraCard` usage (around line 443):

```typescript
<LoraCard
    lora={lora}
    isActive={activeLoraId === lora.id}
    isAdmin={isAdmin}
    isBuiltIn={BUILT_IN_LORA_IDS.has(lora.id)}
    onToggle={() => {
        setActiveLora(activeLoraId === lora.id ? null : lora.id)
    }}
    onEdit={() => {
        setEditingLora(lora)
        setShowDialog(true)
    }}
    onDelete={() => {
        if (isAdmin) {
            if (window.confirm(`Delete "${lora.name}"?`)) {
                removeLora(lora.id)
            }
        } else {
            removeLora(lora.id)
            toast.success(`Removed "${lora.name}" from collection`)
        }
    }}
    onUpdateScale={(scale) => {
        updateLora(lora.id, { defaultLoraScale: scale })
    }}
/>
```

Note: Non-admin removal has no confirm dialog (easy to re-add from community tab) but shows a toast.

**Step 5: Clean build and commit**

```bash
rm -rf .next && npm run build
git add src/features/shot-creator/components/lora/LoraSection.tsx
git commit -m "feat(lora): allow users to remove community LoRAs from personal stack"
git push origin main
```
