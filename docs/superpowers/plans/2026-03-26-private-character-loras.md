# Private Character LoRAs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move user-uploaded LoRA metadata from localStorage to a Supabase `user_loras` table with RLS, upload the "Twork" character LoRA, and make character LoRAs automatically private.

**Architecture:** New `user_loras` table with full RLS (users see only their own). Three CRUD API routes (`register`, `list`, `delete`). Zustand store refactored: DB is source of truth, store is in-memory cache. Built-in and community LoRAs stay hardcoded. One-time localStorage→DB migration on first load.

**Tech Stack:** Supabase (Postgres + RLS + Storage), Next.js API routes, Zustand

**Spec:** `docs/superpowers/specs/2026-03-26-private-character-loras-design.md`

---

### File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/20260326_user_loras.sql` | Table, index, RLS policies |
| Create | `src/app/api/lora/register/route.ts` | POST — insert LoRA metadata |
| Create | `src/app/api/lora/list/route.ts` | GET — fetch user's LoRAs |
| Create | `src/app/api/lora/[id]/route.ts` | DELETE — remove LoRA + storage file |
| Modify | `src/features/shot-creator/store/lora.store.ts` | Remove persist for loras, add DB-backed actions |
| Modify | `src/features/shot-creator/components/lora/LoraSection.tsx:250-282` | Upload form: capture storagePath, use addLoraToDb |
| Modify | `src/features/shot-creator/components/lora/LoraSection.tsx` | Call `fetchUserLoras()` on mount |
| Modify | `src/app/api/v2/loras/route.ts` | Query `user_loras` instead of `loras`, remove `is_community` |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260326_user_loras.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- User-uploaded LoRA metadata (replaces localStorage persistence)
CREATE TABLE IF NOT EXISTS user_loras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  lora_type TEXT NOT NULL DEFAULT 'style',
  trigger_word TEXT,
  weights_url TEXT NOT NULL,
  storage_path TEXT,
  thumbnail_url TEXT,
  default_lora_scale NUMERIC DEFAULT 1.0,
  default_guidance_scale NUMERIC DEFAULT 3.5,
  compatible_models TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_loras_user_id ON user_loras(user_id);

ALTER TABLE user_loras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loras"
  ON user_loras FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loras"
  ON user_loras FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own loras"
  ON user_loras FOR DELETE USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration to production Supabase**

Run via Supabase SQL Editor (Dashboard → SQL Editor → paste and run). Verify table exists:

```sql
SELECT * FROM user_loras LIMIT 1;
```

Expected: empty result set, no error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260326_user_loras.sql
git commit -m "feat(db): add user_loras table with RLS"
```

---

### Task 2: API Route — Register LoRA

**Files:**
- Create: `src/app/api/lora/register/route.ts`

- [ ] **Step 1: Create the register route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth
    const body = await request.json()

    const { name, loraType, triggerWord, weightsUrl, storagePath, thumbnailUrl,
            defaultLoraScale, defaultGuidanceScale, compatibleModels } = body

    if (!name || !weightsUrl) {
      return NextResponse.json({ error: 'name and weightsUrl are required' }, { status: 400 })
    }

    const validTypes = ['character', 'style']
    const type = validTypes.includes(loraType) ? loraType : 'style'

    const { data, error } = await supabase
      .from('user_loras')
      .insert({
        user_id: user.id,
        name,
        lora_type: type,
        trigger_word: triggerWord || null,
        weights_url: weightsUrl,
        storage_path: storagePath || null,
        thumbnail_url: thumbnailUrl || null,
        default_lora_scale: defaultLoraScale ?? 1.0,
        default_guidance_scale: defaultGuidanceScale ?? 3.5,
        compatible_models: compatibleModels || [],
      })
      .select()
      .single()

    if (error) {
      lognog.error('LoRA register failed', { error: error.message, user_id: user.id })
      return NextResponse.json({ error: 'Failed to register LoRA' }, { status: 500 })
    }

    lognog.info('LoRA registered', { user_id: user.id, lora_id: data.id, name, type })

    return NextResponse.json(data)
  } catch (error) {
    lognog.error('LoRA register error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Test with cURL**

```bash
# Get a valid auth token first, then:
curl -X POST http://localhost:3002/api/lora/register \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>" \
  -d '{"name":"Test","loraType":"style","weightsUrl":"https://example.com/test.safetensors"}'
```

Expected: 200 with JSON containing the inserted row.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/lora/register/route.ts
git commit -m "feat(api): add POST /api/lora/register"
```

---

### Task 3: API Route — List LoRAs

**Files:**
- Create: `src/app/api/lora/list/route.ts`

- [ ] **Step 1: Create the list route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { supabase } = auth

    const { data, error } = await supabase
      .from('user_loras')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch LoRAs' }, { status: 500 })
    }

    return NextResponse.json({ loras: data || [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Test with cURL**

```bash
curl http://localhost:3002/api/lora/list -H "Cookie: <auth-cookie>"
```

Expected: `{"loras": [...]}` — should include the test LoRA from Task 2.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/lora/list/route.ts
git commit -m "feat(api): add GET /api/lora/list"
```

---

### Task 4: API Route — Delete LoRA

**Files:**
- Create: `src/app/api/lora/[id]/route.ts`

- [ ] **Step 1: Create the delete route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth
    const { id } = await params

    // Fetch the LoRA first to get storage_path
    const { data: lora, error: fetchError } = await supabase
      .from('user_loras')
      .select('id, storage_path')
      .eq('id', id)
      .single()

    if (fetchError || !lora) {
      return NextResponse.json({ error: 'LoRA not found' }, { status: 404 })
    }

    // Delete from storage if path exists
    if (lora.storage_path) {
      await supabase.storage
        .from('directors-palette')
        .remove([lora.storage_path])
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('user_loras')
      .delete()
      .eq('id', id)

    if (deleteError) {
      lognog.error('LoRA delete failed', { error: deleteError.message, lora_id: id })
      return NextResponse.json({ error: 'Failed to delete LoRA' }, { status: 500 })
    }

    lognog.info('LoRA deleted', { user_id: user.id, lora_id: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    lognog.error('LoRA delete error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/lora/\[id\]/route.ts
git commit -m "feat(api): add DELETE /api/lora/[id]"
```

---

### Task 5: Refactor LoRA Store — DB-Backed Actions

**Files:**
- Modify: `src/features/shot-creator/store/lora.store.ts`

- [ ] **Step 1: Restructure persist middleware**

The `persist` middleware currently persists the entire store including `loras[]`. Change it to only persist UI-state fields (ratings, thumbnails, activeLoraIds, usedLoraIds). LoRA items will come from the DB.

In the `persist` config (line 345-366), update the `partialize` option:

```typescript
{
    name: 'directors-palette-lora-store',
    version: 20,  // bump from 19
    partialize: (state) => ({
        // Only persist UI state — LoRA items come from DB
        activeLoraIds: state.activeLoraIds,
        loraRatings: state.loraRatings,
        usedLoraIds: state.usedLoraIds,
        loraThumbnails: state.loraThumbnails,
    }),
    migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>
        return {
            activeLoraIds: (state?.activeLoraIds as string[]) || [],
            loraRatings: (state?.loraRatings as Record<string, LoraRating>) || {},
            usedLoraIds: (state?.usedLoraIds as string[]) || [],
            loraThumbnails: (state?.loraThumbnails as Record<string, string>) || {},
        }
    },
}
```

- [ ] **Step 2: Add `storagePath` to `LoraItem` interface**

Add after `weightsUrl` (line 15):

```typescript
storagePath?: string   // Supabase Storage path for deletion
```

- [ ] **Step 3: Add DB-backed actions to interface and implementation**

Add to `LoraStore` interface (after line 61):

```typescript
// DB-backed actions
fetchUserLoras: () => Promise<void>
addLoraToDb: (lora: Omit<LoraItem, 'id' | 'createdAt'>) => Promise<string | null>
removeLoraFromDb: (id: string) => Promise<boolean>
migrateFromLocalStorage: () => Promise<void>
```

Add the implementations inside the store creator (after the `getActiveLora` method):

```typescript
fetchUserLoras: async () => {
    try {
        const res = await fetch('/api/lora/list')
        if (!res.ok) return
        const { loras: dbLoras } = await res.json()
        if (!Array.isArray(dbLoras)) return
        const mapped: LoraItem[] = dbLoras.map((row: Record<string, unknown>) => ({
            id: row.id as string,
            name: row.name as string,
            type: (row.lora_type as 'character' | 'style') || 'style',
            triggerWord: (row.trigger_word as string) || '',
            weightsUrl: row.weights_url as string,
            thumbnailUrl: row.thumbnail_url as string | undefined,
            defaultGuidanceScale: Number(row.default_guidance_scale) || 3.5,
            defaultLoraScale: Number(row.default_lora_scale) || 1.0,
            compatibleModels: (row.compatible_models as string[]) || [],
            createdAt: new Date(row.created_at as string).getTime(),
        }))
        set((state) => {
            // Merge: keep built-in/community LoRAs (createdAt === 0), replace user LoRAs with DB
            const builtIns = state.loras.filter(l => l.createdAt === 0)
            return { loras: [...builtIns, ...mapped] }
        })
    } catch { /* silent — offline fallback to cached state */ }
},

addLoraToDb: async (lora) => {
    try {
        const res = await fetch('/api/lora/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: lora.name,
                loraType: lora.type || 'style',
                triggerWord: lora.triggerWord,
                weightsUrl: lora.weightsUrl,
                storagePath: lora.storagePath,
                thumbnailUrl: lora.thumbnailUrl,
                defaultLoraScale: lora.defaultLoraScale,
                defaultGuidanceScale: lora.defaultGuidanceScale,
                compatibleModels: lora.compatibleModels,
            }),
        })
        if (!res.ok) return null
        const row = await res.json()
        const newLora: LoraItem = {
            id: row.id,
            name: row.name,
            type: row.lora_type || 'style',
            triggerWord: row.trigger_word || '',
            weightsUrl: row.weights_url,
            thumbnailUrl: row.thumbnail_url,
            defaultGuidanceScale: Number(row.default_guidance_scale) || 3.5,
            defaultLoraScale: Number(row.default_lora_scale) || 1.0,
            compatibleModels: row.compatible_models || [],
            createdAt: new Date(row.created_at).getTime(),
        }
        set((state) => ({ loras: [...state.loras, newLora] }))
        return row.id
    } catch { return null }
},

removeLoraFromDb: async (id) => {
    try {
        const res = await fetch(`/api/lora/${id}`, { method: 'DELETE' })
        if (!res.ok) return false
        set((state) => ({
            loras: state.loras.filter(l => l.id !== id),
            activeLoraIds: state.activeLoraIds.filter(lid => lid !== id),
        }))
        return true
    } catch { return false }
},

migrateFromLocalStorage: async () => {
    // One-time: sync localStorage LoRAs to DB if DB is empty
    const state = get()
    const userLoras = state.loras.filter(l => l.createdAt !== 0)
    if (userLoras.length === 0) return

    // Check if DB already has LoRAs
    const res = await fetch('/api/lora/list')
    if (!res.ok) return
    const { loras: dbLoras } = await res.json()
    if (dbLoras && dbLoras.length > 0) return // Already migrated

    // Sync each localStorage LoRA to DB
    for (const lora of userLoras) {
        await fetch('/api/lora/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: lora.name,
                loraType: lora.type || 'style',
                triggerWord: lora.triggerWord,
                weightsUrl: lora.weightsUrl,
                thumbnailUrl: lora.thumbnailUrl,
                defaultLoraScale: lora.defaultLoraScale,
                defaultGuidanceScale: lora.defaultGuidanceScale,
                compatibleModels: lora.compatibleModels,
            }),
        })
    }

    // Re-fetch to get DB-assigned IDs
    await get().fetchUserLoras()
},
```

- [ ] **Step 2: Build and verify no type errors**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5
```

Expected: successful build.

- [ ] **Step 3: Commit**

```bash
git add src/features/shot-creator/store/lora.store.ts
git commit -m "feat(store): add DB-backed LoRA actions + migration"
```

---

### Task 6: Update Upload Form + Hydrate on Mount

**Files:**
- Modify: `src/features/shot-creator/components/lora/LoraSection.tsx:250-282`

- [ ] **Step 1: Update upload form to use `addLoraToDb` and capture `storagePath`**

In the upload handler (around line 264), change:

```typescript
// Old (line 264):
const { weightsUrl } = await res.json()
addLora({
    name: name.trim(),
    triggerWord: triggerWord.trim(),
    weightsUrl,
    thumbnailUrl: thumbnailPreview || undefined,
    defaultGuidanceScale: defaultGuidance,
    defaultLoraScale: defaultScale,
})

// New:
const { weightsUrl, storagePath } = await res.json()
const addLoraToDb = useLoraStore.getState().addLoraToDb
await addLoraToDb({
    name: name.trim(),
    triggerWord: triggerWord.trim(),
    weightsUrl,
    storagePath,
    thumbnailUrl: thumbnailPreview || undefined,
    defaultGuidanceScale: defaultGuidance,
    defaultLoraScale: defaultScale,
})
```

- [ ] **Step 2: Add useEffect to fetch LoRAs from DB on mount**

Add at the top of the `LoraSection` component (after existing hooks):

```typescript
// Hydrate user LoRAs from database on mount
useEffect(() => {
    const store = useLoraStore.getState()
    store.migrateFromLocalStorage().then(() => {
        store.fetchUserLoras()
    })
}, [])
```

- [ ] **Step 3: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/features/shot-creator/components/lora/LoraSection.tsx
git commit -m "feat(lora): DB-backed upload + hydrate on mount"
```

---

### Task 7: Update V2 API to Use `user_loras`

**Files:**
- Modify: `src/app/api/v2/loras/route.ts`

- [ ] **Step 1: Change table and fix response mapper**

Replace line 17 — change table:
```typescript
.from('user_loras')  // was: .from('loras')
```

Replace line 19 — use service role key directly (bypasses RLS), filter by user:
```typescript
.eq('user_id', auth.userId)  // was: .or(`user_id.eq.${auth.userId},is_community.eq.true`)
```

Fix response mapper (lines 22-30) — remove `is_community` field which doesn't exist on `user_loras`:
```typescript
const loras = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    type: row.lora_type || 'style',
    trigger_word: row.trigger_word,
    compatible_models: row.compatible_models || ['flux-2-klein-9b'],
    thumbnail_url: row.thumbnail_url,
}))
```

- [ ] **Step 2: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v2/loras/route.ts
git commit -m "fix(api): v2 loras endpoint uses user_loras table"
```

---

### Task 8: Upload Twork LoRA

**Files:** No code changes — operational task.

- [ ] **Step 1: Upload safetensors file to Supabase Storage**

Use the existing upload API or direct Supabase Storage upload:

```bash
# Via cURL to the upload endpoint (with auth cookie from browser):
curl -X POST http://localhost:3002/api/lora/upload \
  -H "Cookie: <auth-cookie>" \
  -F "file=@C:\Users\taskm\Downloads\tSXPjC4Smhc8IPwvo705T_pytorch_lora_weights_comfy_converted.safetensors" \
  -F "loraId=twork-character"
```

Note the returned `weightsUrl` and `storagePath`.

- [ ] **Step 2: Register Twork in the database**

```bash
curl -X POST http://localhost:3002/api/lora/register \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>" \
  -d '{
    "name": "Twork",
    "loraType": "character",
    "triggerWord": "Twork",
    "weightsUrl": "<weightsUrl from step 1>",
    "storagePath": "<storagePath from step 1>",
    "defaultLoraScale": 1.3,
    "defaultGuidanceScale": 3.5,
    "compatibleModels": ["flux-2-klein-9b"]
  }'
```

- [ ] **Step 3: Verify in database**

```sql
SELECT id, name, lora_type, trigger_word, default_lora_scale, compatible_models
FROM user_loras WHERE name = 'Twork';
```

Expected: one row with `lora_type='character'`, `default_lora_scale=1.3`, `compatible_models={'flux-2-klein-9b'}`.

- [ ] **Step 4: Verify in UI**

Open Shot Creator → LoRA section. "Twork" should appear as a character LoRA with scale 1.3.

---

### Task 9: Build, Test, Push

- [ ] **Step 1: Clean build**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

- [ ] **Step 2: Push all changes**

```bash
git push origin main
```

- [ ] **Step 3: Verify on production**

After Vercel deploys, verify Twork LoRA appears in Shot Creator.
