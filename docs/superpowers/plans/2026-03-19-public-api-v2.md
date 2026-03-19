# Public API v2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a REST API exposing all Directors Palette capabilities via API key auth with pts billing.

**Architecture:** New `src/app/api/v2/` route tree wrapping existing internal services. Shared `_lib/` utilities handle auth, response formatting, rate limiting, and job management. An `api_jobs` table bridges external job IDs to internal predictions/gallery. The existing Replicate webhook handler is extended to update `api_jobs` and fire caller webhooks.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase (Postgres + service role client), Replicate API, existing creditsService/imageGenerationService/VideoGenerationService/CharacterSheetService/recipeExecutionService/wildcardService.

**Spec:** `docs/superpowers/specs/2026-03-19-public-api-v2-design.md`

---

## Chunk 1: Foundation — Database, Shared Utilities, Reference Endpoints

### Task 1: Create `api_jobs` Table in Supabase

**Files:**
- Create: `supabase/migrations/20260319_create_api_jobs.sql`

This migration creates the `api_jobs` table and indexes. Run via Supabase dashboard or CLI.

- [ ] **Step 1: Write the migration SQL**

```sql
-- api_jobs table: maps external API job IDs to internal predictions/gallery
CREATE TABLE IF NOT EXISTS api_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  api_key_id uuid NOT NULL REFERENCES api_keys(id),
  type text NOT NULL CHECK (type IN ('image', 'video', 'character', 'recipe')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  prediction_id text,
  gallery_id uuid,
  batch_id uuid,
  cost integer NOT NULL DEFAULT 0,
  input jsonb,
  result jsonb,
  error_message text,
  webhook_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Indexes
CREATE UNIQUE INDEX idx_api_jobs_prediction_id ON api_jobs(prediction_id) WHERE prediction_id IS NOT NULL;
CREATE INDEX idx_api_jobs_user_created ON api_jobs(user_id, created_at DESC);
CREATE INDEX idx_api_jobs_status ON api_jobs(status);
CREATE INDEX idx_api_jobs_batch ON api_jobs(batch_id) WHERE batch_id IS NOT NULL;

-- RLS
ALTER TABLE api_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own jobs" ON api_jobs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role full access" ON api_jobs FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Run migration against Supabase**

```bash
# Apply via Supabase dashboard SQL editor or:
npx supabase db push
```

Verify: Table exists in Supabase dashboard under Tables.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260319_create_api_jobs.sql
git commit -m "feat(api-v2): add api_jobs table migration"
```

---

### Task 2: Response Helpers (`_lib/response.ts`)

**Files:**
- Create: `src/app/api/v2/_lib/response.ts`

Standard JSON envelope helpers used by all v2 endpoints.

- [ ] **Step 1: Create response helpers**

```typescript
import { NextResponse } from 'next/server'

/**
 * Standard success response envelope
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Standard error response envelope
 */
export function errorResponse(
  code: string,
  message: string,
  status: number
) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  )
}

/** Common error shorthand helpers */
export const errors = {
  unauthorized: (msg = 'Missing or invalid API key') =>
    errorResponse('UNAUTHORIZED', msg, 401),

  insufficientPts: (required: number, balance: number) =>
    errorResponse('INSUFFICIENT_PTS', `Need ${required} pts, you have ${balance}`, 402),

  forbidden: (msg = 'Action not allowed') =>
    errorResponse('FORBIDDEN', msg, 403),

  notFound: (msg = 'Resource not found') =>
    errorResponse('NOT_FOUND', msg, 404),

  validation: (msg: string) =>
    errorResponse('VALIDATION_ERROR', msg, 422),

  rateLimited: (retryAfter: number) =>
    NextResponse.json(
      { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    ),

  internal: (msg = 'Internal server error') =>
    errorResponse('INTERNAL_ERROR', msg, 500),
}
```

- [ ] **Step 2: Verify file compiles**

```bash
npx tsc --noEmit src/app/api/v2/_lib/response.ts 2>&1 || echo "check manually"
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v2/_lib/response.ts
git commit -m "feat(api-v2): add response envelope helpers"
```

---

### Task 3: Auth Middleware (`_lib/middleware.ts`)

**Files:**
- Create: `src/app/api/v2/_lib/middleware.ts`

Validates API key, looks up user email, enforces rate limiting.

- [ ] **Step 1: Create middleware**

```typescript
import { NextRequest } from 'next/server'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { createClient } from '@supabase/supabase-js'
import { errors } from './response'
import { isAdminEmail } from '@/features/admin/types/admin.types'

export interface V2AuthContext {
  userId: string
  email: string
  apiKeyId: string
  isAdmin: boolean
}

/**
 * Validate API key and return auth context.
 * Returns V2AuthContext on success, or a NextResponse error on failure.
 */
export async function validateV2ApiKey(request: NextRequest): Promise<V2AuthContext | ReturnType<typeof errors.unauthorized>> {
  const authHeader = request.headers.get('authorization')
  const rawKey = apiKeyService.extractKeyFromHeader(authHeader)

  if (!rawKey) {
    return errors.unauthorized()
  }

  const validated = await apiKeyService.validateApiKey(rawKey)
  if (!validated) {
    return errors.unauthorized()
  }

  // Rate limit check (60 req/min per key)
  const rateLimitResult = checkRateLimit(validated.apiKey.id)
  if (!rateLimitResult.allowed) {
    return errors.rateLimited(rateLimitResult.retryAfter)
  }

  // Look up user email from auth.users
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: userData } = await supabase.auth.admin.getUserById(validated.userId)
  const email = userData?.user?.email || ''

  return {
    userId: validated.userId,
    email,
    apiKeyId: validated.apiKey.id,
    isAdmin: isAdminEmail(email),
  }
}

/** Check if result is an auth context (not an error response) */
export function isAuthContext(result: unknown): result is V2AuthContext {
  return typeof result === 'object' && result !== null && 'userId' in result && 'apiKeyId' in result
}

// ---- In-memory rate limiter ----
// Note: approximate on serverless (per-isolate counters)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 60

function checkRateLimit(keyId: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(keyId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfter: 0 }
  }

  entry.count++
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  return { allowed: true, retryAfter: 0 }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v2/_lib/middleware.ts
git commit -m "feat(api-v2): add auth middleware with rate limiting"
```

---

### Task 4: Job Manager (`_lib/job-manager.ts`)

**Files:**
- Create: `src/app/api/v2/_lib/job-manager.ts`

CRUD operations for the `api_jobs` table.

- [ ] **Step 1: Create job manager**

```typescript
import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiV2')

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type JobType = 'image' | 'video' | 'character' | 'recipe'
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ApiJob {
  id: string
  user_id: string
  api_key_id: string
  type: JobType
  status: JobStatus
  prediction_id: string | null
  gallery_id: string | null
  batch_id: string | null
  cost: number
  input: Record<string, unknown> | null
  result: Record<string, unknown> | null
  error_message: string | null
  webhook_url: string | null
  created_at: string
  completed_at: string | null
}

/**
 * Create a new API job record
 */
export async function createJob(params: {
  userId: string
  apiKeyId: string
  type: JobType
  predictionId?: string
  galleryId?: string
  batchId?: string
  cost: number
  input?: Record<string, unknown>
  webhookUrl?: string
}): Promise<ApiJob | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('api_jobs')
    .insert({
      user_id: params.userId,
      api_key_id: params.apiKeyId,
      type: params.type,
      status: 'pending',
      prediction_id: params.predictionId || null,
      gallery_id: params.galleryId || null,
      batch_id: params.batchId || null,
      cost: params.cost,
      input: params.input || null,
      webhook_url: params.webhookUrl || null,
    })
    .select()
    .single()

  if (error) {
    log.error('Failed to create API job', { error: error.message })
    return null
  }

  return data as ApiJob
}

/**
 * Get a single job by ID (scoped to user)
 */
export async function getJob(jobId: string, userId: string): Promise<ApiJob | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('api_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data as ApiJob
}

/**
 * List jobs for a user with optional filters
 */
export async function listJobs(params: {
  userId: string
  status?: string
  type?: string
  limit?: number
  offset?: number
}): Promise<{ jobs: ApiJob[]; total: number }> {
  const supabase = getSupabase()
  const limit = Math.min(params.limit || 20, 100)
  const offset = params.offset || 0

  let query = supabase
    .from('api_jobs')
    .select('*', { count: 'exact' })
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (params.status) query = query.eq('status', params.status)
  if (params.type) query = query.eq('type', params.type)

  const { data, error, count } = await query

  if (error) {
    log.error('Failed to list API jobs', { error: error.message })
    return { jobs: [], total: 0 }
  }

  return { jobs: (data || []) as ApiJob[], total: count || 0 }
}

/**
 * Update job status and result (called from webhook handler)
 */
export async function updateJob(
  predictionId: string,
  updates: {
    status?: JobStatus
    result?: Record<string, unknown>
    errorMessage?: string
    completedAt?: string
  }
): Promise<ApiJob | null> {
  const supabase = getSupabase()

  const updateData: Record<string, unknown> = {}
  if (updates.status) updateData.status = updates.status
  if (updates.result) updateData.result = updates.result
  if (updates.errorMessage) updateData.error_message = updates.errorMessage
  if (updates.completedAt) updateData.completed_at = updates.completedAt

  const { data, error } = await supabase
    .from('api_jobs')
    .update(updateData)
    .eq('prediction_id', predictionId)
    .select()
    .single()

  if (error) {
    log.error('Failed to update API job', { error: error.message, predictionId })
    return null
  }

  return data as ApiJob
}

/**
 * Get job by prediction ID (for webhook handler)
 */
export async function getJobByPredictionId(predictionId: string): Promise<ApiJob | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('api_jobs')
    .select('*')
    .eq('prediction_id', predictionId)
    .single()

  if (error) return null
  return data as ApiJob
}

/**
 * Fire webhook to caller's URL (best-effort, single attempt)
 */
export async function fireWebhook(webhookUrl: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, data: payload }),
      signal: AbortSignal.timeout(10_000), // 10s timeout
    })
  } catch (err) {
    log.error('Webhook delivery failed', {
      url: webhookUrl,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Format a job for API response
 */
export function formatJobResponse(job: ApiJob) {
  return {
    job_id: job.id,
    status: job.status,
    type: job.type,
    cost: job.cost,
    created_at: job.created_at,
    completed_at: job.completed_at,
    result: job.result,
    error_message: job.error_message,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v2/_lib/job-manager.ts
git commit -m "feat(api-v2): add job manager for api_jobs CRUD"
```

---

### Task 5: Balance Endpoint

**Files:**
- Create: `src/app/api/v2/balance/route.ts`

- [ ] **Step 1: Create balance route**

```typescript
import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse, errors } from '../_lib/response'
import { creditsService } from '@/features/credits'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

export async function GET(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const balance = await creditsService.getBalance(auth.userId, true)
    if (!balance) {
      return errors.internal('Failed to fetch balance')
    }

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/api/v2/balance',
      method: 'GET',
      statusCode: 200,
    })

    return successResponse({
      balance: balance.balance,
      unit: 'pts',
    })
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 2: Test with cURL**

```bash
curl -s http://localhost:3002/api/v2/balance \
  -H "Authorization: Bearer dp_YOUR_KEY" | jq .
```

Expected: `{ "success": true, "data": { "balance": N, "unit": "pts" } }`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v2/balance/route.ts
git commit -m "feat(api-v2): add balance endpoint"
```

---

### Task 6: Models Endpoint

**Files:**
- Create: `src/app/api/v2/models/route.ts`

Returns all available image and video models with capabilities and costs.

- [ ] **Step 1: Create models route**

```typescript
import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse, errors } from '../_lib/response'
import { MODEL_CONFIGS, ASPECT_RATIO_SIZES, type ModelId } from '@/config'
import { ANIMATION_MODELS } from '@/features/shot-animator/config/models.config'
import { VIDEO_MODEL_PRICING } from '@/features/shot-animator/types'
import { VideoGenerationService } from '@/features/shot-animator/services/video-generation.service'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

export async function GET(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    // Image models from MODEL_CONFIGS
    const imageModels = Object.values(MODEL_CONFIGS).map(config => ({
      id: config.id,
      name: config.displayName,
      category: 'image',
      type: config.type, // 'generation' | 'editing'
      cost_pts: Math.round(config.costPerImage * 100),
      supports_img2img: (config.maxReferenceImages || 0) > 0,
      supports_loras: config.id === 'flux-2-klein-9b',
      max_reference_images: config.maxReferenceImages || 0,
      requires_input_image: config.requiresInputImage || false,
      supported_aspect_ratios: Object.keys(ASPECT_RATIO_SIZES).filter(ar => ar !== 'match_input_image'),
      estimated_seconds: config.estimatedSeconds,
    }))

    // Video models from ANIMATION_MODELS
    const videoModels = Object.entries(ANIMATION_MODELS)
      .filter(([key]) => key !== 'seedance-pro') // Skip legacy
      .map(([id, config]) => ({
        id,
        name: config.displayName,
        category: 'video',
        type: 'generation',
        cost_pts_per_unit: VIDEO_MODEL_PRICING[id as keyof typeof VIDEO_MODEL_PRICING],
        pricing_type: config.pricingType,
        max_duration: config.maxDuration,
        supported_resolutions: config.supportedResolutions,
        supported_aspect_ratios: config.supportedAspectRatios,
        requires_input_image: id !== 'seedance-1.5-pro' && id !== 'p-video',
      }))

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/api/v2/models',
      method: 'GET',
      statusCode: 200,
    })

    return successResponse({ image_models: imageModels, video_models: videoModels })
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 2: Test with cURL**

```bash
curl -s http://localhost:3002/api/v2/models \
  -H "Authorization: Bearer dp_YOUR_KEY" | jq .data.image_models
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v2/models/route.ts
git commit -m "feat(api-v2): add models endpoint"
```

---

### Task 7: LoRAs Endpoint

**Files:**
- Create: `src/app/api/v2/loras/route.ts`

- [ ] **Step 1: Create loras route**

Returns available LoRAs from the user's LoRA store + built-in LoRAs.

```typescript
import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse, errors } from '../_lib/response'
import { createClient } from '@supabase/supabase-js'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

export async function GET(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's LoRAs and community LoRAs
    const { data: loras, error } = await supabase
      .from('loras')
      .select('*')
      .or(`user_id.eq.${auth.userId},is_community.eq.true`)
      .order('created_at', { ascending: false })

    if (error) {
      return errors.internal('Failed to fetch LoRAs')
    }

    const formatted = (loras || []).map((lora: Record<string, unknown>) => ({
      id: lora.id,
      name: lora.name,
      type: lora.lora_type || 'style',
      trigger_word: lora.trigger_word || null,
      compatible_models: ['flux-2-klein-9b'], // Currently only Klein 9B supports LoRAs
      thumbnail_url: lora.thumbnail_url || null,
      is_community: lora.is_community || false,
    }))

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/api/v2/loras',
      method: 'GET',
      statusCode: 200,
    })

    return successResponse({ loras: formatted })
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 2: Test with cURL**

```bash
curl -s http://localhost:3002/api/v2/loras \
  -H "Authorization: Bearer dp_YOUR_KEY" | jq .data.loras
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v2/loras/route.ts
git commit -m "feat(api-v2): add loras endpoint"
```

---

### Task 8: Jobs Endpoints (List + Poll)

**Files:**
- Create: `src/app/api/v2/jobs/route.ts`
- Create: `src/app/api/v2/jobs/[jobId]/route.ts`

- [ ] **Step 1: Create jobs list route**

```typescript
import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse, errors } from '../_lib/response'
import { listJobs, formatJobResponse } from '../_lib/job-manager'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

export async function GET(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || undefined
    const type = url.searchParams.get('type') || undefined
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const { jobs, total } = await listJobs({
      userId: auth.userId,
      status,
      type,
      limit,
      offset,
    })

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/api/v2/jobs',
      method: 'GET',
      statusCode: 200,
    })

    return successResponse({
      jobs: jobs.map(formatJobResponse),
      total,
      limit,
      offset,
    })
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 2: Create single job poll route**

```typescript
// src/app/api/v2/jobs/[jobId]/route.ts
import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { getJob, formatJobResponse } from '../../_lib/job-manager'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const { jobId } = await params
    const job = await getJob(jobId, auth.userId)

    if (!job) {
      return errors.notFound('Job not found')
    }

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: `/api/v2/jobs/${jobId}`,
      method: 'GET',
      statusCode: 200,
    })

    return successResponse(formatJobResponse(job))
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 3: Test with cURL**

```bash
curl -s http://localhost:3002/api/v2/jobs \
  -H "Authorization: Bearer dp_YOUR_KEY" | jq .
curl -s http://localhost:3002/api/v2/jobs/SOME_JOB_ID \
  -H "Authorization: Bearer dp_YOUR_KEY" | jq .
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/v2/jobs/
git commit -m "feat(api-v2): add job list and poll endpoints"
```

---

### Task 9: Build Check + Push

- [ ] **Step 1: Clean build**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

Fix any TypeScript or ESLint errors before proceeding.

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Chunk 2: Generation Endpoints — Images, Videos, Characters

### Task 10: Image Generation Endpoint

**Files:**
- Create: `src/app/api/v2/images/generate/route.ts`

Wraps the existing `POST /api/generation/image` logic but uses API key auth and creates an `api_jobs` record.

**Key references:**
- Existing route: `src/app/api/generation/image/route.ts` (lines 1-400+)
- Service: `src/features/shot-creator/services/image-generation.service.ts`
- Config: `src/config/index.ts` — `MODEL_CONFIGS`, `ASPECT_RATIO_SIZES`, `getModelCost()`
- Credits: `src/features/credits/services/credits.service.ts` — `creditsService.deductCredits()`

- [ ] **Step 1: Create image generation route**

The route should:
1. Validate API key via `validateV2ApiKey()`
2. Parse and validate request body (model, prompt required; aspect_ratio, loras, reference_image, num_images, seed, webhook_url optional)
3. Validate model exists in `MODEL_CONFIGS`
4. Check pts balance via `creditsService.getBalance()` (admin bypass)
5. Deduct pts via `creditsService.deductCredits()` with `useServiceRole: true`
6. Build Replicate input via `ImageGenerationService.buildReplicateInput()`
7. Call `replicate.predictions.create()` with webhook URL
8. Create gallery entry via service-role Supabase client
9. Create `api_jobs` record via `createJob()`
10. Return `{ job_id, status: 'pending', cost, poll_url }`

For `num_images > 1`, create separate predictions and jobs for each image (loop).

**Important implementation details:**
- Use service-role Supabase client (not session-based) since API key auth has no browser session
- Model settings must be assembled from flat API params into `ImageModelSettings` shape
- `loras` array support only for `flux-2-klein-9b`
- `reference_image` triggers img2img mode
- Cap `num_images` at 5
- LoRA resolution: accept LoRA ID strings, look up weights URL from `loras` table

```typescript
import { NextRequest } from 'next/server'
import Replicate from 'replicate'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { createJob } from '../../_lib/job-manager'
import { ImageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import { MODEL_CONFIGS, ASPECT_RATIO_SIZES, getModelCost, type ModelId } from '@/config'
import { creditsService } from '@/features/credits'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { createClient } from '@supabase/supabase-js'
import type { ImageModel, ImageModelSettings } from '@/features/shot-creator/types/image-generation.types'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const body = await request.json()
    const {
      model,
      prompt,
      width,
      height,
      aspect_ratio = '1:1',
      loras,
      reference_image,
      reference_strength = 0.75,
      num_images = 1,
      seed,
      webhook_url,
    } = body

    // Validate required fields
    if (!model) return errors.validation('model is required')
    if (!prompt) return errors.validation('prompt is required')
    if (!(model in MODEL_CONFIGS)) return errors.validation(`Invalid model: ${model}`)
    if (num_images < 1 || num_images > 5) return errors.validation('num_images must be 1-5')

    const modelConfig = MODEL_CONFIGS[model as ModelId]

    // Validate editing models require reference_image
    if (modelConfig.requiresInputImage && !reference_image) {
      return errors.validation(`${model} requires reference_image`)
    }

    // Validate LoRAs only for compatible models
    if (loras && loras.length > 0 && model !== 'flux-2-klein-9b') {
      return errors.validation(`${model} does not support LoRAs`)
    }

    // Calculate cost
    const costPerImage = Math.round(getModelCost(model as ModelId) * 100) // dollars to pts
    const totalCost = costPerImage * num_images

    // Check balance (admin bypass)
    if (!auth.isAdmin) {
      const balance = await creditsService.getBalance(auth.userId, true)
      const currentBalance = balance?.balance ?? 0
      if (currentBalance < totalCost) {
        return errors.insufficientPts(totalCost, currentBalance)
      }
    }

    // Build model settings
    const resolvedSize = ASPECT_RATIO_SIZES[aspect_ratio] || ASPECT_RATIO_SIZES['1:1']
    const modelSettings: ImageModelSettings = {
      aspectRatio: aspect_ratio,
      width: width || resolvedSize.width,
      height: height || resolvedSize.height,
      outputFormat: 'webp',
      maxImages: 1, // Each prediction = 1 image
      seed,
    }

    // Build reference images array
    const referenceImages: string[] = reference_image ? [reference_image] : []

    const supabase = getSupabase()
    const webhookUrl = `${process.env.WEBHOOK_URL}/api/webhooks/replicate`

    const jobs = []

    for (let i = 0; i < num_images; i++) {
      // Deduct credits
      if (!auth.isAdmin) {
        const deduction = await creditsService.deductCredits(auth.userId, model, {
          generationType: 'image',
          description: `API v2 image generation (${model})`,
          user_email: auth.email,
          useServiceRole: true,
        })
        if (!deduction.success) {
          return errors.insufficientPts(costPerImage, 0)
        }
      }

      // Build Replicate input
      const replicateInput = ImageGenerationService.buildReplicateInput({
        model: model as ImageModel,
        prompt,
        modelSettings,
        referenceImages,
      })

      // Get Replicate model ID
      const loraActive = !!(loras && loras.length > 0)
      const hasRef = referenceImages.length > 0
      const replicateModelId = ImageGenerationService.getReplicateModelId(
        model as ImageModel,
        loraActive,
        hasRef
      )

      // Create prediction
      const prediction = await replicate.predictions.create({
        model: replicateModelId,
        input: replicateInput,
        webhook: webhookUrl,
        webhook_events_filter: ['start', 'completed'],
      })

      // Create gallery entry
      const metadata = ImageGenerationService.buildMetadata({
        model: model as ImageModel,
        prompt,
        modelSettings,
        referenceImages,
      })

      const { data: gallery } = await supabase
        .from('gallery')
        .insert({
          user_id: auth.userId,
          prediction_id: prediction.id,
          generation_type: 'image',
          status: 'pending',
          metadata: { ...metadata, source: 'api_v2' },
        })
        .select('id')
        .single()

      // Create API job record
      const job = await createJob({
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        type: 'image',
        predictionId: prediction.id,
        galleryId: gallery?.id,
        cost: costPerImage,
        input: body,
        webhookUrl: webhook_url,
      })

      if (job) {
        jobs.push({
          job_id: job.id,
          status: 'pending',
          cost: costPerImage,
          poll_url: `/api/v2/jobs/${job.id}`,
        })
      }
    }

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/api/v2/images/generate',
      method: 'POST',
      statusCode: 200,
      creditsUsed: totalCost,
    })

    // Return single job or array depending on num_images
    if (jobs.length === 1) {
      return successResponse({ ...jobs[0], total_cost: totalCost })
    }
    return successResponse({ jobs, total_cost: totalCost })
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 2: Test with cURL**

```bash
curl -s -X POST http://localhost:3002/api/v2/images/generate \
  -H "Authorization: Bearer dp_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"z-image-turbo","prompt":"a cat astronaut","aspect_ratio":"1:1"}' | jq .
```

Expected: `{ "success": true, "data": { "job_id": "...", "status": "pending", "cost": 4, ... } }`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v2/images/
git commit -m "feat(api-v2): add image generation endpoint"
```

---

### Task 11: Video Generation Endpoint

**Files:**
- Create: `src/app/api/v2/videos/generate/route.ts`

**Key references:**
- Existing route: `src/app/api/generation/video/route.ts`
- Service: `src/features/shot-animator/services/video-generation.service.ts`
- Types: `src/features/shot-animator/types/index.ts` — `AnimationModel`, `ModelSettings`, `VIDEO_MODEL_PRICING`
- Config: `src/features/shot-animator/config/models.config.ts` — `ANIMATION_MODELS`

- [ ] **Step 1: Create video generation route**

The route should:
1. Auth via `validateV2ApiKey()`
2. Map flat API params (`duration`, `fps`, `resolution`, `camera_fixed`) to internal `ModelSettings` shape
3. Validate via `VideoGenerationService.validateInput()`
4. Calculate cost via `VideoGenerationService.calculateCost()`
5. Check balance, deduct pts (service role)
6. Build Replicate input via `VideoGenerationService.buildReplicateInput()`
7. Create prediction, gallery entry, api_jobs record

```typescript
import { NextRequest } from 'next/server'
import Replicate from 'replicate'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { createJob } from '../../_lib/job-manager'
import { VideoGenerationService } from '@/features/shot-animator/services/video-generation.service'
import { ANIMATION_MODELS } from '@/features/shot-animator/config/models.config'
import type { AnimationModel, ModelSettings } from '@/features/shot-animator/types'
import { creditsService } from '@/features/credits'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { createClient } from '@supabase/supabase-js'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const body = await request.json()
    const {
      model = 'wan-2.2-5b-fast',
      prompt,
      source_image,
      duration = 5,
      aspect_ratio = '16:9',
      fps = 24,
      resolution = '720p',
      camera_fixed = false,
      webhook_url,
    } = body

    if (!prompt) return errors.validation('prompt is required')

    // Validate model exists
    const modelConfig = ANIMATION_MODELS[model as AnimationModel]
    if (!modelConfig) return errors.validation(`Invalid model: ${model}`)

    // Check if source_image required
    const textToVideoModels = ['seedance-1.5-pro', 'p-video']
    if (!source_image && !textToVideoModels.includes(model)) {
      return errors.validation(`${model} requires source_image`)
    }

    // Build internal ModelSettings
    const modelSettings: ModelSettings = {
      duration,
      resolution,
      aspectRatio: aspect_ratio,
      fps,
      cameraFixed: camera_fixed,
    }

    // Validate input
    const validation = VideoGenerationService.validateInput({
      model: model as AnimationModel,
      prompt,
      image: source_image,
      modelSettings,
    })
    if (!validation.valid) {
      return errors.validation(validation.errors.join('; '))
    }

    // Calculate cost
    const cost = VideoGenerationService.calculateCost(
      model as AnimationModel,
      duration,
      resolution as '480p' | '720p' | '1080p'
    )

    // Check balance
    if (!auth.isAdmin) {
      const balance = await creditsService.getBalance(auth.userId, true)
      const currentBalance = balance?.balance ?? 0
      if (currentBalance < cost) {
        return errors.insufficientPts(cost, currentBalance)
      }

      // Deduct
      const deduction = await creditsService.deductCredits(auth.userId, model, {
        generationType: 'video',
        overrideAmount: cost,
        description: `API v2 video generation (${model})`,
        user_email: auth.email,
        useServiceRole: true,
      })
      if (!deduction.success) {
        return errors.insufficientPts(cost, 0)
      }
    }

    // Build Replicate input
    const replicateInput = VideoGenerationService.buildReplicateInput({
      model: model as AnimationModel,
      prompt,
      image: source_image,
      modelSettings,
    })

    const replicateModelId = VideoGenerationService.getReplicateModelId(model as AnimationModel)
    const webhookEndpoint = `${process.env.WEBHOOK_URL}/api/webhooks/replicate`

    const prediction = await replicate.predictions.create({
      model: replicateModelId,
      input: replicateInput,
      webhook: webhookEndpoint,
      webhook_events_filter: ['start', 'completed'],
    })

    // Create gallery entry
    const supabase = getSupabase()
    const metadata = VideoGenerationService.buildMetadata({
      model: model as AnimationModel,
      prompt,
      image: source_image,
      modelSettings,
    })

    const { data: gallery } = await supabase
      .from('gallery')
      .insert({
        user_id: auth.userId,
        prediction_id: prediction.id,
        generation_type: 'video',
        status: 'pending',
        metadata: { ...metadata, source: 'api_v2' },
      })
      .select('id')
      .single()

    // Create API job
    const job = await createJob({
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      type: 'video',
      predictionId: prediction.id,
      galleryId: gallery?.id,
      cost,
      input: body,
      webhookUrl: webhook_url,
    })

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/api/v2/videos/generate',
      method: 'POST',
      statusCode: 200,
      creditsUsed: cost,
    })

    return successResponse({
      job_id: job?.id,
      status: 'pending',
      cost,
      poll_url: `/api/v2/jobs/${job?.id}`,
    })
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 2: Test with cURL**

```bash
curl -s -X POST http://localhost:3002/api/v2/videos/generate \
  -H "Authorization: Bearer dp_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"slow zoom in","source_image":"https://example.com/image.jpg","model":"wan-2.2-5b-fast"}' | jq .
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v2/videos/
git commit -m "feat(api-v2): add video generation endpoint"
```

---

### Task 12: Character Sheet Generation Endpoint

**Files:**
- Create: `src/app/api/v2/characters/generate/route.ts`

**Key references:**
- Service: `src/features/storyboard/services/character-sheet.service.ts`
- Returns TWO jobs (turnaround + expressions)

- [ ] **Step 1: Create character generation route**

```typescript
import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { createJob } from '../../_lib/job-manager'
import {
  CharacterSheetService,
  DEFAULT_SIDE1_PROMPT,
  DEFAULT_SIDE2_PROMPT,
} from '@/features/storyboard/services/character-sheet.service'
import { getModelCost } from '@/config'
import { creditsService } from '@/features/credits'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

const characterSheetService = new CharacterSheetService()

export async function POST(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const body = await request.json()
    const {
      name,
      description,
      style = 'cinematic',
      reference_image,
      style_reference,
      aspect_ratio = '16:9',
      webhook_url,
    } = body

    if (!name) return errors.validation('name is required')
    if (!description) return errors.validation('description is required')

    // Cost: 2 images at nano-banana-2 rate
    const costPerSide = Math.round(getModelCost('nano-banana-2') * 100)
    const totalCost = costPerSide * 2

    // Check balance
    if (!auth.isAdmin) {
      const balance = await creditsService.getBalance(auth.userId, true)
      const currentBalance = balance?.balance ?? 0
      if (currentBalance < totalCost) {
        return errors.insufficientPts(totalCost, currentBalance)
      }
    }

    // Build prompts with character description injected
    const side1Prompt = DEFAULT_SIDE1_PROMPT
      .replace('<CHARACTER_NAME>', `${name}: ${description}`)
      .replace('<STYLE_NAME>', style)
    const side2Prompt = DEFAULT_SIDE2_PROMPT
      .replace('<CHARACTER_NAME>', `${name}: ${description}`)
      .replace('<STYLE_NAME>', style)

    // Generate both sides
    const result = await characterSheetService.generateCharacterSheet({
      characterName: name,
      styleName: style,
      side1Prompt,
      side2Prompt,
      characterReferenceUrl: reference_image,
      styleReferenceUrl: style_reference,
      aspectRatio: aspect_ratio,
    })

    // Deduct credits for successful predictions
    const jobs: Record<string, unknown> = {}

    if (result.side1.success && result.side1.predictionId) {
      if (!auth.isAdmin) {
        await creditsService.deductCredits(auth.userId, 'nano-banana-2', {
          generationType: 'image',
          predictionId: result.side1.predictionId,
          description: 'API v2 character sheet (turnaround)',
          user_email: auth.email,
          useServiceRole: true,
        })
      }

      const turnaroundJob = await createJob({
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        type: 'character',
        predictionId: result.side1.predictionId,
        galleryId: result.side1.galleryId,
        cost: costPerSide,
        input: { ...body, sheet_type: 'turnaround' },
        webhookUrl: webhook_url,
      })

      jobs.turnaround = {
        job_id: turnaroundJob?.id,
        status: 'pending',
        cost: costPerSide,
        poll_url: `/api/v2/jobs/${turnaroundJob?.id}`,
      }
    }

    if (result.side2.success && result.side2.predictionId) {
      if (!auth.isAdmin) {
        await creditsService.deductCredits(auth.userId, 'nano-banana-2', {
          generationType: 'image',
          predictionId: result.side2.predictionId,
          description: 'API v2 character sheet (expressions)',
          user_email: auth.email,
          useServiceRole: true,
        })
      }

      const expressionsJob = await createJob({
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        type: 'character',
        predictionId: result.side2.predictionId,
        galleryId: result.side2.galleryId,
        cost: costPerSide,
        input: { ...body, sheet_type: 'expressions' },
        webhookUrl: webhook_url,
      })

      jobs.expressions = {
        job_id: expressionsJob?.id,
        status: 'pending',
        cost: costPerSide,
        poll_url: `/api/v2/jobs/${expressionsJob?.id}`,
      }
    }

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/api/v2/characters/generate',
      method: 'POST',
      statusCode: 200,
      creditsUsed: totalCost,
    })

    return successResponse({ ...jobs, total_cost: totalCost })
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 2: Test with cURL**

```bash
curl -s -X POST http://localhost:3002/api/v2/characters/generate \
  -H "Authorization: Bearer dp_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Elena","description":"elven ranger with silver hair","style":"fantasy art"}' | jq .
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v2/characters/
git commit -m "feat(api-v2): add character sheet generation endpoint"
```

---

### Task 13: Build Check + Push

- [ ] **Step 1: Clean build**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

Fix any errors.

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Chunk 3: Recipes, Wildcards, Batch, Webhook Integration

### Task 14: Recipes List Endpoint

**Files:**
- Create: `src/app/api/v2/recipes/route.ts`

- [ ] **Step 1: Create recipes list route**

```typescript
import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse, errors } from '../_lib/response'
import { createClient } from '@supabase/supabase-js'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const supabase = getSupabase()

    const { data: recipes, error, count } = await supabase
      .from('recipes')
      .select('*', { count: 'exact' })
      .or(`user_id.eq.${auth.userId},is_shared.eq.true`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return errors.internal('Failed to fetch recipes')
    }

    const formatted = (recipes || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      stages: Array.isArray(r.stages) ? (r.stages as unknown[]).length : 0,
      fields: r.fields || [],
      suggested_model: r.suggested_model || 'nano-banana-2',
      suggested_aspect_ratio: r.suggested_aspect_ratio || '16:9',
    }))

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/api/v2/recipes',
      method: 'GET',
      statusCode: 200,
    })

    return successResponse({
      recipes: formatted,
      total: count || 0,
      limit,
      offset,
    })
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v2/recipes/route.ts
git commit -m "feat(api-v2): add recipes list endpoint"
```

---

### Task 15: Recipe Execution Endpoint

**Files:**
- Create: `src/app/api/v2/recipes/execute/route.ts`

**Key references:**
- Service: `src/features/shared/services/recipe-execution.service.ts`
- Recipe types: `src/features/shot-creator/types/recipe.types.ts`

Recipe execution is synchronous (multi-stage pipe chaining). The API wraps it as an async job: the endpoint starts execution in the background and returns a job ID. Since recipe execution already waits for each stage internally, we track the final result.

- [ ] **Step 1: Create recipe execute route**

```typescript
import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { createJob, updateJob } from '../../_lib/job-manager'
import { createClient } from '@supabase/supabase-js'
import { creditsService } from '@/features/credits'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { getModelCost, type ModelId } from '@/config'
import type { Recipe, RecipeFieldValues } from '@/features/shot-creator/types/recipe.types'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const maxDuration = 120 // 2 min timeout for multi-stage recipes

export async function POST(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const body = await request.json()
    const {
      recipe_id,
      fields,
      model,
      aspect_ratio,
      reference_images,
      webhook_url,
    } = body

    if (!recipe_id) return errors.validation('recipe_id is required')
    if (!fields) return errors.validation('fields is required')

    const supabase = getSupabase()

    // Fetch recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipe_id)
      .single()

    if (recipeError || !recipe) {
      return errors.notFound('Recipe not found')
    }

    // Validate required fields
    const recipeData = recipe as unknown as Recipe
    if (recipeData.fields) {
      for (const field of recipeData.fields) {
        if (field.required && !(field.name in fields)) {
          return errors.validation(`Missing required field: ${field.name}`)
        }
      }
    }

    // Estimate cost (one generation per stage that's a generation type)
    const stages = recipeData.stages || []
    const generationStages = stages.filter(s => s.type === 'generation')
    const modelId = (model || recipeData.suggested_model || 'nano-banana-2') as ModelId
    const costPerStage = Math.round(getModelCost(modelId) * 100)
    const totalCost = costPerStage * generationStages.length

    // Check balance
    if (!auth.isAdmin) {
      const balance = await creditsService.getBalance(auth.userId, true)
      const currentBalance = balance?.balance ?? 0
      if (currentBalance < totalCost) {
        return errors.insufficientPts(totalCost, currentBalance)
      }
    }

    // Create job record (status: processing since recipe runs synchronously)
    const job = await createJob({
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      type: 'recipe',
      cost: totalCost,
      input: body,
      webhookUrl: webhook_url,
    })

    if (!job) {
      return errors.internal('Failed to create job')
    }

    // Execute recipe in background (don't await — return job immediately)
    // Note: In serverless, this runs within the request timeout (maxDuration)
    const executeRecipeAsync = async () => {
      try {
        // Dynamic import to avoid circular deps
        const { executeRecipe } = await import('@/features/shared/services/recipe-execution.service')

        const result = await executeRecipe({
          recipe: recipeData,
          fieldValues: fields as RecipeFieldValues,
          stageReferenceImages: reference_images || [],
          model: modelId,
          aspectRatio: aspect_ratio || recipeData.suggested_aspect_ratio,
          extraMetadata: { source: 'api_v2', api_job_id: job.id },
        })

        if (result.success) {
          await updateJob(job.id, {
            status: 'completed',
            result: {
              image_urls: result.imageUrls,
              final_image_url: result.finalImageUrl,
              final_image_urls: result.finalImageUrls,
            },
            completedAt: new Date().toISOString(),
          })
        } else {
          await updateJob(job.id, {
            status: 'failed',
            errorMessage: result.error || 'Recipe execution failed',
          })
        }
      } catch (err) {
        await updateJob(job.id, {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    // Fire and forget (runs within serverless timeout)
    executeRecipeAsync()

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/api/v2/recipes/execute',
      method: 'POST',
      statusCode: 200,
      creditsUsed: totalCost,
    })

    return successResponse({
      job_id: job.id,
      status: 'processing',
      cost: totalCost,
      poll_url: `/api/v2/jobs/${job.id}`,
    })
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

**Note on updateJob:** The recipe execution uses `job.id` as the predictionId param since recipes don't have a Replicate prediction ID. We'll need to update the `updateJob` function to also accept a job ID lookup. Add this overload to `job-manager.ts`:

```typescript
/**
 * Update job by job ID directly (for recipes that don't use Replicate predictions)
 */
export async function updateJobById(
  jobId: string,
  updates: {
    status?: JobStatus
    result?: Record<string, unknown>
    errorMessage?: string
    completedAt?: string
  }
): Promise<ApiJob | null> {
  const supabase = getSupabase()

  const updateData: Record<string, unknown> = {}
  if (updates.status) updateData.status = updates.status
  if (updates.result) updateData.result = updates.result
  if (updates.errorMessage) updateData.error_message = updates.errorMessage
  if (updates.completedAt) updateData.completed_at = updates.completedAt

  const { data, error } = await supabase
    .from('api_jobs')
    .update(updateData)
    .eq('id', jobId)
    .select()
    .single()

  if (error) {
    log.error('Failed to update API job by ID', { error: error.message, jobId })
    return null
  }

  return data as ApiJob
}
```

- [ ] **Step 2: Update recipe execute to use `updateJobById` instead of `updateJob`**

Replace `updateJob(job.id, ...)` with `updateJobById(job.id, ...)` in the async function.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v2/recipes/ src/app/api/v2/_lib/job-manager.ts
git commit -m "feat(api-v2): add recipe list and execute endpoints"
```

---

### Task 16: Wildcards Endpoints (List + Expand)

**Files:**
- Create: `src/app/api/v2/wildcards/route.ts`
- Create: `src/app/api/v2/wildcards/expand/route.ts`

- [ ] **Step 1: Create wildcards list route**

```typescript
import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse, errors } from '../_lib/response'
import { createClient } from '@supabase/supabase-js'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const supabase = getSupabase()

    const { data: wildcards, error, count } = await supabase
      .from('wildcards')
      .select('*', { count: 'exact' })
      .or(`user_id.eq.${auth.userId},is_shared.eq.true`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return errors.internal('Failed to fetch wildcards')
    }

    const formatted = (wildcards || []).map((w: Record<string, unknown>) => ({
      id: w.id,
      name: w.name,
      category: w.category,
      description: w.description,
      line_count: typeof w.content === 'string'
        ? (w.content as string).split('\n').filter((l: string) => l.trim()).length
        : 0,
    }))

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/api/v2/wildcards',
      method: 'GET',
      statusCode: 200,
    })

    return successResponse({
      wildcards: formatted,
      total: count || 0,
      limit,
      offset,
    })
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 2: Create wildcard expand route (synchronous)**

```typescript
import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { createClient } from '@supabase/supabase-js'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const body = await request.json()
    const { prompt, count = 1 } = body

    if (!prompt) return errors.validation('prompt is required')
    if (count < 1 || count > 20) return errors.validation('count must be 1-20')

    // Find wildcard tokens in prompt: _wildcard_name_
    const wildcardPattern = /_([a-zA-Z0-9_]+)_/g
    const tokens = [...prompt.matchAll(wildcardPattern)].map((m: RegExpMatchArray) => m[1])

    if (tokens.length === 0) {
      // No wildcards found, return prompt as-is
      return successResponse({
        expansions: [{ text: prompt, wildcards_used: [] }],
      })
    }

    // Fetch matching wildcards
    const supabase = getSupabase()
    const { data: wildcards } = await supabase
      .from('wildcards')
      .select('name, content')
      .or(`user_id.eq.${auth.userId},is_shared.eq.true`)
      .in('name', tokens)

    // Build lookup
    const wildcardMap: Record<string, string[]> = {}
    for (const wc of wildcards || []) {
      const lines = (wc.content as string).split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
      wildcardMap[wc.name as string] = lines
    }

    // Generate expansions
    const expansions = []
    for (let i = 0; i < count; i++) {
      const usedWildcards: string[] = []
      let expanded = prompt

      for (const token of tokens) {
        const lines = wildcardMap[token]
        if (lines && lines.length > 0) {
          const randomLine = lines[Math.floor(Math.random() * lines.length)]
          expanded = expanded.replace(`_${token}_`, randomLine)
          if (!usedWildcards.includes(token)) usedWildcards.push(token)
        }
      }

      expansions.push({ text: expanded, wildcards_used: usedWildcards })
    }

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/api/v2/wildcards/expand',
      method: 'POST',
      statusCode: 200,
    })

    return successResponse({ expansions })
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v2/wildcards/
git commit -m "feat(api-v2): add wildcard list and expand endpoints"
```

---

### Task 17: Batch Generation Endpoint

**Files:**
- Create: `src/app/api/v2/batch/route.ts`

- [ ] **Step 1: Create batch route**

The batch endpoint validates total cost upfront, then dispatches individual generation requests. Each job in the batch reuses the existing v2 endpoint logic internally.

```typescript
import { NextRequest } from 'next/server'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse, errors } from '../_lib/response'
import { creditsService } from '@/features/credits'
import { MODEL_CONFIGS, getModelCost, type ModelId } from '@/config'
import { VideoGenerationService } from '@/features/shot-animator/services/video-generation.service'
import { ANIMATION_MODELS } from '@/features/shot-animator/config/models.config'
import type { AnimationModel } from '@/features/shot-animator/types'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const body = await request.json()
    const { jobs: jobRequests } = body

    if (!Array.isArray(jobRequests) || jobRequests.length === 0) {
      return errors.validation('jobs array is required and cannot be empty')
    }
    if (jobRequests.length > 20) {
      return errors.validation('Maximum 20 jobs per batch')
    }

    // Calculate total cost upfront
    let totalCost = 0
    const costBreakdown: number[] = []

    for (const jobReq of jobRequests) {
      let cost = 0

      switch (jobReq.type) {
        case 'image': {
          const model = jobReq.model || 'nano-banana-2'
          if (!(model in MODEL_CONFIGS)) {
            return errors.validation(`Invalid image model: ${model}`)
          }
          const numImages = Math.min(jobReq.num_images || 1, 5)
          cost = Math.round(getModelCost(model as ModelId) * 100) * numImages
          break
        }
        case 'video': {
          const model = jobReq.model || 'wan-2.2-5b-fast'
          if (!(model in ANIMATION_MODELS)) {
            return errors.validation(`Invalid video model: ${model}`)
          }
          cost = VideoGenerationService.calculateCost(
            model as AnimationModel,
            jobReq.duration || 5,
            jobReq.resolution || '720p'
          )
          break
        }
        case 'character': {
          cost = Math.round(getModelCost('nano-banana-2') * 100) * 2
          break
        }
        case 'recipe': {
          // Estimate: 1 generation stage at default model cost
          cost = Math.round(getModelCost('nano-banana-2') * 100)
          break
        }
        default:
          return errors.validation(`Invalid job type: ${jobReq.type}`)
      }

      costBreakdown.push(cost)
      totalCost += cost
    }

    // Check total balance
    if (!auth.isAdmin) {
      const balance = await creditsService.getBalance(auth.userId, true)
      const currentBalance = balance?.balance ?? 0
      if (currentBalance < totalCost) {
        return errors.insufficientPts(totalCost, currentBalance)
      }
    }

    // Dispatch individual jobs by calling internal v2 routes
    const batchId = uuidv4()
    const baseUrl = request.nextUrl.origin
    const authHeader = request.headers.get('authorization') || ''

    const results = await Promise.all(
      jobRequests.map(async (jobReq: Record<string, unknown>, index: number) => {
        const type = jobReq.type as string
        let endpoint = ''
        const jobBody = { ...jobReq }
        delete jobBody.type

        switch (type) {
          case 'image':
            endpoint = '/api/v2/images/generate'
            break
          case 'video':
            endpoint = '/api/v2/videos/generate'
            break
          case 'character':
            endpoint = '/api/v2/characters/generate'
            break
          case 'recipe':
            endpoint = '/api/v2/recipes/execute'
            break
        }

        try {
          const resp = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify(jobBody),
          })

          const data = await resp.json()
          return {
            index,
            cost: costBreakdown[index],
            ...data,
          }
        } catch (err) {
          return {
            index,
            success: false,
            error: { code: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Unknown error' },
          }
        }
      })
    )

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/api/v2/batch',
      method: 'POST',
      statusCode: 200,
      creditsUsed: totalCost,
    })

    return successResponse({
      batch_id: batchId,
      total_cost: totalCost,
      results,
    })
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v2/batch/
git commit -m "feat(api-v2): add batch generation endpoint"
```

---

### Task 18: Webhook Integration — Update Existing Handler

**Files:**
- Modify: `src/app/api/webhooks/replicate/route.ts`
- Modify: `src/features/generation/services/webhook.service.ts`

After the existing webhook processes a prediction, check if it has an `api_jobs` record. If yes, update the job status and fire the caller's webhook.

- [ ] **Step 1: Add api_jobs integration to WebhookService**

At the end of `WebhookService.processCompletedPrediction()`, after the gallery is updated, add:

```typescript
// After gallery update is complete, check for API v2 job
try {
  const { getJobByPredictionId, updateJob, fireWebhook, formatJobResponse } = await import('@/app/api/v2/_lib/job-manager')

  const apiJob = await getJobByPredictionId(prediction.id)
  if (apiJob) {
    const isCompleted = status === 'succeeded'
    const isFailed = status === 'failed' || status === 'canceled'

    if (isCompleted) {
      // Get the updated gallery entry for result URLs
      const { data: updatedGallery } = await getSupabase()
        .from('gallery')
        .select('public_url, metadata')
        .eq('prediction_id', prediction.id)
        .single()

      await updateJob(prediction.id, {
        status: 'completed',
        result: {
          url: updatedGallery?.public_url,
          metadata: updatedGallery?.metadata,
        },
        completedAt: new Date().toISOString(),
      })

      // Fire caller webhook if set
      if (apiJob.webhook_url) {
        const updatedJob = await getJobByPredictionId(prediction.id)
        if (updatedJob) {
          await fireWebhook(apiJob.webhook_url, formatJobResponse(updatedJob))
        }
      }
    } else if (isFailed) {
      await updateJob(prediction.id, {
        status: 'failed',
        errorMessage: error || 'Generation failed',
      })

      if (apiJob.webhook_url) {
        const updatedJob = await getJobByPredictionId(prediction.id)
        if (updatedJob) {
          await fireWebhook(apiJob.webhook_url, formatJobResponse(updatedJob))
        }
      }
    } else if (status === 'processing' || status === 'starting') {
      await updateJob(prediction.id, { status: 'processing' })
    }
  }
} catch (apiJobErr) {
  // Non-fatal: don't break existing webhook processing
  logger.api.error('Failed to update API job from webhook', {
    error: apiJobErr instanceof Error ? apiJobErr.message : String(apiJobErr),
    predictionId: prediction.id,
  })
}
```

- [ ] **Step 2: Test webhook integration**

Generate an image via the v2 API, wait for webhook, then poll the job:

```bash
# Generate image
JOB=$(curl -s -X POST http://localhost:3002/api/v2/images/generate \
  -H "Authorization: Bearer dp_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"z-image-turbo","prompt":"a test image"}' | jq -r .data.job_id)

# Poll until completed
sleep 15
curl -s http://localhost:3002/api/v2/jobs/$JOB \
  -H "Authorization: Bearer dp_YOUR_KEY" | jq .
```

Expected: Job status transitions from `pending` → `processing` → `completed` with result URLs.

- [ ] **Step 3: Commit**

```bash
git add src/features/generation/services/webhook.service.ts
git commit -m "feat(api-v2): integrate api_jobs with webhook handler"
```

---

### Task 19: Final Build Check + Push

- [ ] **Step 1: Clean build**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Chunk 4: Integration Testing

### Task 20: End-to-End API Testing

- [ ] **Step 1: Test all read-only endpoints**

```bash
API_KEY="dp_YOUR_KEY"
BASE="http://localhost:3002/api/v2"

# Balance
curl -s "$BASE/balance" -H "Authorization: Bearer $API_KEY" | jq .

# Models
curl -s "$BASE/models" -H "Authorization: Bearer $API_KEY" | jq .data.image_models

# LoRAs
curl -s "$BASE/loras" -H "Authorization: Bearer $API_KEY" | jq .data.loras

# Jobs (should be empty or have previous jobs)
curl -s "$BASE/jobs" -H "Authorization: Bearer $API_KEY" | jq .

# Recipes
curl -s "$BASE/recipes" -H "Authorization: Bearer $API_KEY" | jq .data.recipes

# Wildcards
curl -s "$BASE/wildcards" -H "Authorization: Bearer $API_KEY" | jq .data.wildcards
```

- [ ] **Step 2: Test auth failures**

```bash
# No key
curl -s "$BASE/balance" | jq .
# Bad key
curl -s "$BASE/balance" -H "Authorization: Bearer dp_invalid" | jq .
```

Expected: `{ "success": false, "error": { "code": "UNAUTHORIZED" } }`

- [ ] **Step 3: Test image generation + polling**

```bash
# Generate
RESP=$(curl -s -X POST "$BASE/images/generate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"z-image-turbo","prompt":"a glowing cat in space","aspect_ratio":"1:1"}')
echo $RESP | jq .

JOB_ID=$(echo $RESP | jq -r .data.job_id)

# Poll every 5s
for i in 1 2 3 4 5 6; do
  sleep 5
  curl -s "$BASE/jobs/$JOB_ID" -H "Authorization: Bearer $API_KEY" | jq .data.status
done
```

- [ ] **Step 4: Test wildcard expansion**

```bash
curl -s -X POST "$BASE/wildcards/expand" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a _fantasy_race_ warrior in _setting_","count":3}' | jq .
```

- [ ] **Step 5: Test insufficient pts**

```bash
# Use a test account with 0 pts
curl -s -X POST "$BASE/images/generate" \
  -H "Authorization: Bearer dp_LOW_BALANCE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"nano-banana-2","prompt":"test"}' | jq .
```

Expected: `402` with `INSUFFICIENT_PTS`

- [ ] **Step 6: Commit any fixes from testing**

```bash
git add -A && git commit -m "fix(api-v2): fixes from integration testing" && git push origin main
```

---

## Summary

| Task | Component | Type |
|------|-----------|------|
| 1 | api_jobs table | Database |
| 2 | Response helpers | Foundation |
| 3 | Auth middleware | Foundation |
| 4 | Job manager | Foundation |
| 5 | Balance endpoint | Read-only |
| 6 | Models endpoint | Read-only |
| 7 | LoRAs endpoint | Read-only |
| 8 | Jobs list + poll | Read-only |
| 9 | Build check | Verification |
| 10 | Image generation | Generation |
| 11 | Video generation | Generation |
| 12 | Character sheets | Generation |
| 13 | Build check | Verification |
| 14 | Recipes list | Read-only |
| 15 | Recipe execution | Generation |
| 16 | Wildcards list + expand | Sync utility |
| 17 | Batch generation | Orchestration |
| 18 | Webhook integration | Infrastructure |
| 19 | Build check | Verification |
| 20 | Integration testing | Testing |

**Dependency graph:**
- Tasks 1-4 must complete first (foundation)
- Tasks 5-8 can run in parallel (read-only endpoints)
- Tasks 10-12 can run in parallel (generation endpoints, depend on 1-4)
- Tasks 14-16 can run in parallel (depend on 1-4)
- Task 17 depends on 10-12, 14-15 (batch calls individual endpoints)
- Task 18 depends on 4 (webhook needs job manager)
- Task 20 depends on everything else
