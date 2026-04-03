# Bug Report System — Design Document

**Date:** 2026-04-03
**Status:** Approved, ready for implementation

---

## Overview

An end-to-end bug reporting system where users report bugs from within the app, issues are auto-created on GitHub with structured labels and metadata, and a daily scheduled Claude Code agent triages, investigates, and opens draft PRs for each bug.

---

## 1. In-App Bug Report UI

### Floating Bug Button
- **Position:** Bottom-left corner, fixed, app-wide (all pages)
- **Icon:** Bug/beetle icon (Lucide `Bug` icon)
- **Style:** Matches app OKLCH dark theme — subtle background, cyan accent on hover
- **Size:** 40x40px, `border-radius: 0.625rem`
- **Behavior:** Opens bug report modal on click
- **Z-index:** Above page content, below existing modals

### Bug Report Modal
- Uses Radix AlertDialog (consistent with existing modal patterns)
- Styled with OKLCH dark theme, cyan accents, 0.625rem radius

**Form fields:**
| Field | Type | Required | Details |
|-------|------|----------|---------|
| What happened? | Textarea | Yes | Placeholder: "Describe what went wrong..." |
| Category | Dropdown | Yes | UI Glitch, Feature Broken, Slow / Laggy, Other |
| Screenshot | File upload | No | Drag & drop or click, accepts image files |
| Submit | Button | — | Disabled until description is filled |

### Auto-Captured Metadata (invisible to user)
- **Current page URL** (e.g. `/shot-creator`)
- **Active feature** — derived from URL path (e.g. "Shot Creator", "Music Lab")
- **Last 5 user actions** — from lightweight in-memory action logger (e.g. "Clicked Generate", "Changed model to Z-Image Turbo")
- **Browser + OS** — from `navigator.userAgent`
- **User ID + email** — from Supabase auth session
- **Viewport size** — `window.innerWidth x window.innerHeight`
- **Timestamp** — ISO 8601

### Action Logger
- Simple in-memory array (no persistence, no localStorage)
- Max 5 entries, FIFO
- Key UI interactions push to it: button clicks, model changes, form submissions, navigation
- Implemented as a lightweight hook/module imported by major interactive components
- Snapshotted at bug report submission time

### Visual Design Notes
- Dark modal background: `oklch(0.18 0.02 200)` (cyan hue family)
- Card/modal surface: `oklch(0.22 0.025 200)`
- Borders: `oklch(0.32 0.03 200)`
- Primary button: cyan `oklch(0.6 0.2 200)` with hover state
- Textarea/inputs: dark inset with subtle border, focus ring in cyan
- Category dropdown: Radix Select with custom dark styling
- Screenshot upload: dashed border drop zone, preview thumbnail after upload
- Success state: toast notification "Bug report submitted — thank you!"
- All corners: `0.625rem` radius
- Smooth transitions: `0.2s`
- Typography: Inter / system-ui, consistent with app

---

## 2. API Route

### `POST /api/bug-report`

**Auth:** Requires logged-in user (Supabase session check)

**Rate limit:** Max 3 reports per user per hour (tracked via simple in-memory map, reset on server restart — sufficient for this use case)

**Request body:**
```typescript
{
  description: string        // required
  category: 'ui' | 'feature' | 'performance' | 'other'  // required
  screenshot?: File          // optional, multipart
  metadata: {
    pageUrl: string
    feature: string
    recentActions: string[]  // last 5
    userAgent: string
    viewport: string         // "1920x1080"
    timestamp: string        // ISO 8601
  }
}
```

**Flow:**
1. Validate auth + rate limit
2. If screenshot provided: upload to Supabase Storage (`directors-palette` bucket, path `bug-reports/{userId}/{timestamp}.png`), get public URL
3. Create GitHub issue via GitHub REST API (`octokit` or raw fetch)
4. Return `{ success: true, issueUrl: string }` or error

**Environment variable:** `GITHUB_PAT` — a GitHub Personal Access Token with `repo` scope, stored in `.env.local`

### GitHub Issue Format

```markdown
## Bug Report

**Category:** UI Glitch
**Reported by:** user@email.com
**Page:** /shot-creator
**Feature:** Shot Creator

### Description
The generate button doesn't respond after switching models...

### Screenshot
![screenshot](https://supabase-url/bug-reports/xxx/123.png)

### Recent Actions
1. Changed model to "Z-Image Turbo"
2. Uploaded reference image
3. Clicked "Generate"
4. Error toast appeared

### Environment
- Browser: Chrome 124 / Windows 11
- Viewport: 1920x1080
- Timestamp: 2026-04-02T14:30:00Z
- User ID: `abc-123`
```

### Labels Auto-Applied
- `bug` (always)
- `user-reported` (always — distinguishes from dev-filed issues)
- One of: `bug:ui`, `bug:feature`, `bug:performance`, `bug:other` (from category)

---

## 3. Daily Automated Triage (Scheduled Claude Code Agent)

### Schedule
- **Frequency:** Once daily (8:00 AM local time)
- **Mechanism:** Claude Code cron/remote trigger

### Daily Flow
For each open issue with label `user-reported` AND without label `triaged`:

1. **Read the issue** — parse description, category, context, recent actions, environment
2. **Investigate the codebase:**
   - Identify the feature from the page URL / feature name
   - Search relevant feature directory for related code
   - Check for related error handling, known patterns
   - Query LogNog for matching errors around the reported timestamp (`/lognog` command)
3. **Create a fix branch:** `fix/bug-{issue-number}-{short-slug}` (e.g. `fix/bug-42-zimage-aspect-ratio`)
4. **Attempt a fix** based on investigation findings
5. **Verify:** Run `rm -rf .next && npm run build` — only proceed if build passes
6. **Push branch + open draft PR:**
   - PR title: `fix: {short description} (closes #{issue-number})`
   - PR body links to the issue, includes investigation notes
   - PR is a **draft** (not ready for merge)
7. **Update the issue:**
   - Add `triaged` label (prevents re-processing)
   - Add priority label: `priority:high`, `priority:medium`, or `priority:low`
   - Add investigation comment with: likely cause, relevant files, LogNog matches, suggested fix rationale
8. **If no fix can be determined:** Still label `triaged` + priority, add investigation comment explaining what was found, skip branch/PR creation

### Priority Heuristic
- **High:** Feature completely broken, affects core generation flows, multiple LogNog errors
- **Medium:** Feature partially broken, workaround exists, limited blast radius
- **Low:** Visual glitch, edge case, performance complaint with no measurable impact

### Notification
- Draft PRs trigger standard GitHub notifications
- User reviews PRs when ready, merges or provides feedback

---

## 4. GitHub Labels (One-Time Setup)

Create these labels on `taskmasterpeace/directors-palette-v2`:

| Label | Color | Description |
|-------|-------|-------------|
| `bug` | `#d73a4a` | Something isn't working |
| `user-reported` | `#0e8a16` | Reported by an end user |
| `triaged` | `#5319e7` | Investigated by automated triage |
| `bug:ui` | `#fbca04` | UI/visual glitch |
| `bug:feature` | `#d73a4a` | Feature broken or not working |
| `bug:performance` | `#f9d0c4` | Slow or laggy behavior |
| `bug:other` | `#e4e669` | Other issue |
| `priority:high` | `#b60205` | High priority — core flow affected |
| `priority:medium` | `#ff9f1c` | Medium priority — workaround exists |
| `priority:low` | `#0e8a16` | Low priority — minor issue |

---

## 5. File Structure

```
src/
├── features/
│   └── bug-report/
│       ├── components/
│       │   ├── BugReportFab.tsx          # Floating button
│       │   ├── BugReportModal.tsx        # Report modal dialog
│       │   └── ScreenshotUpload.tsx      # Drag & drop screenshot component
│       ├── hooks/
│       │   └── useActionLogger.ts        # In-memory last-5-actions tracker
│       ├── services/
│       │   └── bug-report.service.ts     # Client-side submit logic
│       └── types/
│           └── index.ts                  # BugReport, Category types
├── app/
│   └── api/
│       └── bug-report/
│           └── route.ts                  # POST handler
.claude/
├── commands/
│   └── triage-bugs.md                    # /triage-bugs command (manual fallback)
```

### Cron / Scheduled Agent
- Configured via Claude Code's cron system
- Runs the triage flow described in Section 3

---

## 6. Edge Cases & Decisions

### Authentication
- **Bug button only visible to logged-in users.** No point showing it to unauthenticated visitors.

### Failure Handling
- **GitHub API failure:** Return error to user, keep modal open so they don't lose their text. Show: "Something went wrong — please try again."
- **Screenshot upload failure:** Submit the report WITHOUT the screenshot. Note "(Screenshot upload failed)" in the issue body. Never block a report because of an optional field.
- **Session expiry mid-form:** If the API returns 401, show "Your session expired — please log in and try again." Keep the modal open.

### Privacy
- **No raw email in GitHub issues.** Use obfuscated format: `u***@domain.com`. Include user ID for internal lookup.
- Repo is currently private, but this protects against future changes.

### Validation
- **Description:** Min 20 characters, max 5,000 characters. Helper text: "Please describe the steps that led to the problem."
- **Screenshot:** Accept PNG, JPEG, WebP, GIF. Max 5MB. Reject other formats with a message.

### Rate Limiting
- When rate limited, show toast: "You've submitted 3 reports recently. Please wait before submitting another." Disable submit button.
- In-memory rate limit is fine — decorative on serverless but prevents casual spam.

### Mobile
- Screenshot upload uses file picker (not drag-and-drop) on mobile — standard `<input type="file" accept="image/*">`
- Floating button positioned with `safe-area-inset-bottom` padding for iOS

### Action Logger
- **Module-level singleton** (not a React hook) — a simple array with `logAction(description: string)` export
- Components call `logAction("Clicked Generate")` directly
- Navigation tracked via a `usePathname()` listener in the root layout
- Phase 1 instrumentation: Generate buttons, model selectors, form submissions across Shot Creator, Music Lab, Storyboard, Brand Studio

### Triage Agent
- **Max 5 issues per run** to cap compute costs. Prioritizes `bug:feature` > `bug:ui` > `bug:performance` > `bug:other`
- **Deduplication:** Before investigating, agent checks existing `triaged` issues for same feature/page. If a likely duplicate is found, it links the issues and labels `duplicate` instead of creating a new branch.
- **Partial failure:** If the agent crashes mid-run, untriaged issues remain untriaged and get picked up next day. No inconsistent state risk since `triaged` label is applied last.

### Success UX
- Toast shows: "Bug report #42 submitted — thank you!" (uses GitHub issue number, no URL)

---

## 7. Implementation Order

1. **GitHub labels** — one-time `gh label create` commands
2. **Feature scaffold** — `src/features/bug-report/` directory + types
3. **Action logger hook** — `useActionLogger.ts`
4. **Screenshot upload component** — `ScreenshotUpload.tsx`
5. **Bug report modal** — `BugReportModal.tsx` (form + validation)
6. **Floating button** — `BugReportFab.tsx` (added to root layout)
7. **API route** — `POST /api/bug-report` (Supabase upload + GitHub issue creation)
8. **Integration test** — submit a test bug report, verify issue appears on GitHub
9. **`/triage-bugs` command** — manual fallback for on-demand triage
10. **Scheduled cron agent** — daily automated triage pipeline
