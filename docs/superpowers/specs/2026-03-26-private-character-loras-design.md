# Private Character LoRAs — Design Spec

**Date:** 2026-03-26
**Status:** Approved

## Summary

Move all user-uploaded LoRA metadata from browser localStorage to a `user_loras` database table in Supabase. Character LoRAs are automatically blocked from community sharing (enforced in application code). This gives cross-device persistence and real privacy via RLS.

## Immediate Trigger

Upload and register a character LoRA called "Twork" (Klein-compatible, scale 1.3) as private to taskmasterpeace@gmail.com.

---

## Database

### New Table: `user_loras`

```sql
CREATE TABLE user_loras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  lora_type TEXT NOT NULL DEFAULT 'style',  -- 'character' | 'style'
  trigger_word TEXT,
  weights_url TEXT NOT NULL,
  storage_path TEXT,                         -- e.g. 'loras/{userId}/{fileId}.safetensors'
  thumbnail_url TEXT,
  default_lora_scale NUMERIC DEFAULT 1.0,
  default_guidance_scale NUMERIC DEFAULT 3.5,
  compatible_models TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_loras_user_id ON user_loras(user_id);
```

**Notes:**
- `storage_path` stored explicitly for clean file deletion (no URL parsing needed)
- No `is_private` column — character privacy enforced in community submission API (`if type === 'character', reject`)
- No `updated_at` — LoRA metadata rarely changes after creation
- Only `'character'` and `'style'` types — add more when actual use cases exist

### Relationship to existing `loras` table

The v2 public API (`/api/v2/loras/route.ts`) queries a `loras` table. This table will be **replaced** by `user_loras`. The v2 endpoint will be updated to query `user_loras` instead.

### RLS Policies

```sql
ALTER TABLE user_loras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loras"
  ON user_loras FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loras"
  ON user_loras FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own loras"
  ON user_loras FOR DELETE
  USING (auth.uid() = user_id);
```

---

## API Routes

### `POST /api/lora/register`

Register a LoRA after file upload. Accepts JSON body:

```typescript
{
  name: string
  loraType: 'character' | 'style'
  triggerWord?: string
  weightsUrl: string
  storagePath?: string
  thumbnailUrl?: string
  defaultLoraScale?: number       // default 1.0
  defaultGuidanceScale?: number   // default 3.5
  compatibleModels?: string[]     // e.g. ['flux-2-klein-9b']
}
```

Returns the created `user_loras` row.

### `GET /api/lora/list`

Fetch all LoRAs for the authenticated user. RLS handles filtering.

### `DELETE /api/lora/[id]`

Delete a LoRA by ID. Uses `storage_path` column to delete the file from Supabase Storage.

### Existing `POST /api/lora/upload`

No changes needed. Continues to upload `.safetensors` files to `loras/{userId}/{fileId}.safetensors`. After upload, client calls `/api/lora/register` with the returned `weightsUrl` and `storagePath`.

---

## Store Changes

### `lora.store.ts` Modifications

1. **Remove `persist` middleware** for user-uploaded LoRAs. Database is the source of truth.
2. **Keep built-in LoRAs** (`BUILT_IN_LORAS`, `FLUX2_9B_LORAS`) as static arrays.
3. **Keep community LoRAs** (`COMMUNITY_LORAS`) as static browsing catalog.

### New/Modified Actions

- `fetchUserLoras()` — GET `/api/lora/list`, populate store
- `addLora(data)` — POST `/api/lora/register`, then add to local state
- `removeLora(id)` — DELETE `/api/lora/[id]`, then remove from local state

No update action — LoRA metadata doesn't change after creation.

### Hydration

On app load, call `fetchUserLoras()` to load from DB. Zustand store acts as in-memory cache only.

### Migration from localStorage

On first load after deployment: if localStorage has LoRAs and DB is empty for the user, sync them to DB, then clear localStorage. Simple one-time check, no toast needed.

---

## Twork LoRA — Immediate Upload

**File:** `C:\Users\taskm\Downloads\tSXPjC4Smhc8IPwvo705T_pytorch_lora_weights_comfy_converted.safetensors`

**Registration data:**
- `name`: "Twork"
- `lora_type`: "character"
- `trigger_word`: "Twork"
- `compatible_models`: ["flux-2-klein-9b"]
- `default_lora_scale`: 1.3
- `default_guidance_scale`: 3.5
- `user_id`: taskmasterpeace@gmail.com's UUID

**Steps:**
1. Upload safetensors to Supabase Storage under user's lora folder
2. Insert row into `user_loras` table
3. Verify it appears in the LoRA list

---

## Character Privacy Rule

Character LoRAs (`lora_type = 'character'`) are blocked from community sharing. Enforced with a simple check in the community submission API: `if (lora.lora_type === 'character') return 403`. No database trigger needed.

All user LoRAs are already invisible to other users via RLS (`auth.uid() = user_id`).

---

## What This Does NOT Change

- **Built-in LoRAs** (Nava, Pixar, Claymation, etc.) — remain hardcoded in store
- **Community LoRA catalog** — remains in `community_items` table
- **LoRA file storage** — still goes to Supabase Storage `directors-palette` bucket
- **Image generation API** — still receives `weightsUrl` from client, no change needed
- **LoRA ratings** — remain in localStorage (low-stakes)
- **Active LoRA selections** — remain in Zustand state (session-specific)
