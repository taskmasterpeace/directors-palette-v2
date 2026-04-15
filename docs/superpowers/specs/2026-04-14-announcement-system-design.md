# Announcement System Design

## Overview
In-app announcement system for communicating with users — refunds, bug fixes, feature launches, maintenance notices. Supports global, targeted (specific users), and segmented (user attributes) delivery.

## Data Model

### `announcements` table
- `id`, `title`, `body`, `type` (info/refund/feature/maintenance/warning)
- `targeting` JSONB: `{type: "global"}`, `{type: "user", user_ids: [...]}`, `{type: "segment", filter: "has_purchased"}`
- `priority` (normal/urgent — urgent shows top banner)
- `published_at`, `expires_at`, `created_by`, `created_at`

### `announcement_dismissals` table
- Per-user dismiss tracking (announcement_id + user_id, unique)

### `announcement_preferences` table  
- `mute_all` boolean toggle per user

### `get_user_announcements` RPC
- Server-side targeting evaluation via SECURITY DEFINER function
- Pre-fetches user data (signup date, purchase history, spend, balance)
- Evaluates segments: `has_purchased`, `signed_up_after`, `signed_up_before`, `min_spend`, `min_balance`
- Returns announcements with `is_dismissed` flag

## UI Components

### AnnouncementBanner (top of main content)
- Shows latest urgent undismissed announcement as a colored strip
- Type-specific colors and icons (refund=green, warning=red, etc.)
- Dismiss button (X) removes banner

### AnnouncementBell (sidebar footer)
- Bell icon with unread count badge
- Opens AnnouncementPanel popover

### AnnouncementPanel (popover from bell)
- Lists all announcements: "New" section (undismissed) + "Earlier" section (dismissed)
- Mute toggle (bell-off icon) to suppress all announcements
- Per-announcement dismiss via X button

### Admin AnnouncementsTab (admin dashboard)
- Full CRUD: create, edit, publish, delete
- Targeting selector: global / specific users / segment
- Type and priority selectors
- Publish immediately or save as draft
- Optional expiration date

## API Routes

- `GET /api/announcements` — user's announcements + preferences
- `POST /api/announcements/dismiss` — dismiss an announcement
- `POST /api/announcements/preferences` — update mute_all
- `GET /api/admin/announcements` — list all (admin)
- `POST /api/admin/announcements` — create (admin)
- `PATCH /api/admin/announcements` — update (admin)
- `DELETE /api/admin/announcements` — delete (admin)

## State Management
- Zustand store (`useAnnouncementStore`) with optimistic dismiss
- Fetches on first load, caches in memory
- Bell badge shows unread count reactively
