# Directors Palette - Gotchas & Known Pitfalls

This document captures known issues, constraints, and lessons learned to prevent repeating past mistakes.

## Critical: Git Commit Protocol

### Incident (December 16, 2024)
194 files (27,881 lines of code) were nearly lost because changes were never committed. This is now a **MANDATORY** protocol:

1. **Session Start**: Always run `git status` first
2. **During Development**: Commit after every feature, never exceed 30 minutes uncommitted
3. **Session End**: ALWAYS commit and push before ending

```bash
# Emergency commit pattern
git add -A && git commit -m "type: description" && git push origin main
```

## Next.js 15 / React 19 Specifics

### Async Server Components
Server components in Next.js 15 can be async. Don't forget to await data fetching:

```tsx
// Correct - async server component
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### Client Component Directive
Always add `'use client'` at the top of files using:
- React hooks (useState, useEffect, etc.)
- Browser APIs (localStorage, window, etc.)
- Event handlers
- Zustand stores

### Turbopack Considerations
- HMR may behave differently than Webpack
- Some edge cases with CSS modules may occur
- Dynamic imports work but may have slight timing differences

## Supabase Authentication

### Server vs Client
- **Server**: Use `createClient()` from `@/lib/supabase/server`
- **Client**: Use `createClient()` from `@/lib/supabase/client`

### Cookie Handling
Server-side auth requires proper cookie handling. The auth state is stored in cookies.

### Session Refresh
Sessions auto-refresh but middleware must be configured properly in `middleware.ts`.

## Replicate API

### Webhook Timing
- Predictions are async; always use webhooks or polling
- Don't assume immediate results
- Webhook endpoint: `/api/webhooks/replicate`

### Model Versions
Model versions change! Always use the version string, not just the model name:
```tsx
// Use specific version
version: "model-owner/model-name:version-hash"
```

### Credit Costs
Different models have different credit costs:
- `google/nano-banana`: 8 pts (fast, cheap)
- `google/nano-banana-pro`: 20 pts (high quality)
- Video models: 50-200 pts depending on model

### Reference Images
- Must be publicly accessible URLs
- Supabase storage URLs work well
- Data URLs do NOT work with Replicate

## Zustand Stores

### Persistence Hydration
When using `persist` middleware, handle hydration mismatch:

```tsx
const [isHydrated, setIsHydrated] = useState(false);

useEffect(() => {
  setIsHydrated(true);
}, []);

if (!isHydrated) return <Skeleton />;
```

### Store Updates in Effects
Avoid updating store in useEffect without proper deps:
```tsx
// BAD - infinite loop
useEffect(() => {
  store.setItems(items);
}); // Missing deps!

// GOOD
useEffect(() => {
  store.setItems(items);
}, [items]); // Explicit deps
```

## File Upload & Storage

### Supabase Storage Buckets
- `generations`: User-generated images
- `references`: Reference images for generation
- Bucket policies must allow authenticated uploads

### Image Compression
Always compress before upload:
```tsx
import imageCompression from 'browser-image-compression';

const compressed = await imageCompression(file, {
  maxSizeMB: 1,
  maxWidthOrHeight: 2048,
});
```

### CORS Issues
Storage URLs may need proper CORS configuration in Supabase dashboard.

## Fabric.js Canvas (Layout Annotation)

### Canvas Cleanup
Always dispose canvas on unmount:
```tsx
useEffect(() => {
  return () => {
    canvas?.dispose();
  };
}, [canvas]);
```

### Object Selection
Fabric objects need explicit selectable/evented flags:
```tsx
const obj = new fabric.Image(img, {
  selectable: true,
  evented: true,
});
```

## Stripe Integration

### Webhook Verification
Always verify Stripe webhook signatures:
```tsx
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

### Idempotency
Webhooks may fire multiple times. Handle idempotency:
```tsx
// Check if already processed
const existing = await db.query('SELECT * FROM payments WHERE stripe_id = $1', [event.id]);
if (existing) return;
```

## API Route Gotchas

### Request Body
`request.json()` can only be called once per request. Store the result:
```tsx
// BAD
const name = (await request.json()).name;
const email = (await request.json()).email; // Fails!

// GOOD
const body = await request.json();
const { name, email } = body;
```

### Response Streaming
For long-running operations, consider streaming responses or use webhooks.

## TypeScript Strict Mode

### Null Checks
All values must be explicitly checked:
```tsx
// Required pattern
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
// Now TypeScript knows user is defined
```

### Type Assertions
Avoid `as any`. Use proper type guards:
```tsx
// BAD
const data = response as any;

// GOOD
if (isExpectedType(response)) {
  // TypeScript narrows the type
}
```

## Testing

### Playwright Selectors
Prefer data-testid for stable selectors:
```tsx
<button data-testid="submit-btn">Submit</button>
```

```tsx
await page.getByTestId('submit-btn').click();
```

### API Mocking
Mock external APIs (Replicate, Stripe) in tests to avoid real charges.

## Environment Variables

### Client-side Access
Only variables prefixed with `NEXT_PUBLIC_` are available client-side:
```
NEXT_PUBLIC_SUPABASE_URL=...  # Available in browser
SUPABASE_SERVICE_ROLE_KEY=... # Server only
```

### Missing Variables
Build will fail silently with undefined env vars. Always validate:
```tsx
if (!process.env.REQUIRED_VAR) {
  throw new Error('REQUIRED_VAR is not set');
}
```

## Performance

### Large Lists
Use virtualization for lists > 100 items. Consider `react-virtual` or windowing.

### Image Optimization
Always use `next/image` for automatic optimization:
```tsx
import Image from 'next/image';

<Image src={url} width={300} height={200} alt="..." />
```

### Bundle Size
Avoid importing entire libraries. Use tree-shakeable imports:
```tsx
// BAD
import * as _ from 'lodash';

// GOOD
import { debounce } from 'lodash/debounce';
```

## Mobile (Capacitor)

### Platform Detection
```tsx
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // Native iOS/Android code
} else {
  // Web code
}
```

### Safe Areas
Account for notches and safe areas on mobile devices.

## Common Mistakes to Avoid

1. **Don't** create new files when editing existing ones suffices
2. **Don't** add comments to code you didn't modify
3. **Don't** add emoji unless explicitly requested
4. **Don't** over-engineer or add features not requested
5. **Don't** skip TypeScript strict checks
6. **Don't** forget to handle loading and error states
7. **Don't** commit .env files or secrets
8. **Don't** use console.log in production code (use proper logging)
