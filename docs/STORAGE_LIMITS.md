# Storage Limits System

This document explains the storage management system for Directors Palette, including image and video storage limits, enforcement mechanisms, and technical implementation details.

## Overview

The storage limits system prevents unbounded growth of user-generated content while maintaining a great user experience. Different rules apply to images and videos based on their typical usage patterns and storage costs.

---

## Image Storage Limits

### Limits

- **Maximum**: 500 images per user
- **Warning Threshold**: 400 images (amber badge)
- **Hard Limit**: 500 images (red badge, generation blocked)
- **Expiration**: None - images are permanent

### Enforcement

Image limits are checked **before each image generation**:

1. API receives generation request
2. System queries user's current image count
3. If count >= 500, generation is blocked with error
4. If count < 500, generation proceeds
5. UI displays current count and badge color

### User Experience

**Badge Display** (shown in GalleryHeader):
- **Green** (0-399 images): "X / 500 images"
- **Amber** (400-499 images): "X / 500 images" (warning state)
- **Red** (500 images): "500 / 500 images" (limit reached)

**Tooltip**:
- Shows remaining count: "X images remaining"
- At limit: "Storage limit reached"

**Error Handling**:
- At 500 images, generation requests return error
- User must delete existing images to create new ones

---

## Video Storage Limits

### Limits

- **Count Limit**: None (unlimited video count)
- **Time Limit**: 7 days after creation
- **Auto-Expiration**: Yes (automatic cleanup)

### Expiration System

Videos automatically expire and are deleted after 7 days:

1. **On Creation**: Database trigger sets `expires_at = created_at + 7 days`
2. **Daily Cleanup**: Cron job runs at 3:00 AM UTC
3. **Deletion**: Expired videos removed from storage and database

### Rationale

Videos are:
- Larger files (higher storage costs)
- Preview/draft content (temporary by nature)
- Less frequently referenced after initial viewing

Images are:
- Smaller files
- Reference material (permanent by nature)
- Frequently used across sessions

---

## Technical Implementation

### API Endpoints

#### Get Storage Limits
```
GET /api/storage/limits
```

**Response**:
```json
{
  "success": true,
  "data": {
    "images": {
      "count": 245,
      "limit": 500,
      "remaining": 255,
      "percentage": 49.0
    },
    "videos": {
      "count": 12,
      "limit": null,
      "expirationDays": 7
    }
  }
}
```

**Usage**:
- Called by GalleryHeader component
- Updates badge display
- Shows tooltips with remaining count

#### Cleanup Expired Content
```
GET /api/cron/cleanup-expired
Authorization: Bearer <CRON_SECRET>
```

**Response**:
```json
{
  "success": true,
  "deletedCount": 5,
  "message": "Successfully deleted 5 expired items"
}
```

**Configuration**:
- Runs daily at 3:00 AM UTC via Vercel Cron
- Defined in `vercel.json`
- Protected by CRON_SECRET environment variable

### Service Layer

**StorageLimitsService** (`src/features/storage/services/storage-limits.service.ts`)

Methods:
- `getUserStorageLimits(userId)`: Get current counts and limits
- `canCreateImage(userId)`: Check if user can generate images
- `cleanupExpiredContent()`: Remove expired videos

Business Logic:
- Queries database for counts
- Calculates percentages
- Enforces hard limits
- Manages expiration cleanup

### Database Schema

**Gallery Table**:
```sql
CREATE TABLE gallery (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'image' | 'video'
  expires_at TIMESTAMPTZ, -- NULL for images, set for videos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ...
);
```

**Indexes**:
- `gallery_user_id_idx`: Fast user queries
- `gallery_expires_at_idx`: Fast expiration queries
- `gallery_type_idx`: Fast type filtering

### Database Functions

#### get_user_image_count()
```sql
CREATE OR REPLACE FUNCTION get_user_image_count(p_user_id TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM gallery
  WHERE user_id = p_user_id
    AND type = 'image';
$$ LANGUAGE SQL;
```

**Purpose**: Fast image count for limit checks

#### can_create_image()
```sql
CREATE OR REPLACE FUNCTION can_create_image(p_user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT get_user_image_count(p_user_id) < 500;
$$ LANGUAGE SQL;
```

**Purpose**: Pre-generation validation

#### delete_expired_content()
```sql
CREATE OR REPLACE FUNCTION delete_expired_content()
RETURNS TABLE(deleted_count INTEGER) AS $$
  WITH deleted AS (
    DELETE FROM gallery
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER FROM deleted;
$$ LANGUAGE SQL;
```

**Purpose**: Automated cleanup execution

### Database Triggers

#### set_video_expiration
```sql
CREATE OR REPLACE FUNCTION set_video_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'video' THEN
    NEW.expires_at := NEW.created_at + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_expiration_trigger
  BEFORE INSERT ON gallery
  FOR EACH ROW
  EXECUTE FUNCTION set_video_expiration();
```

**Purpose**: Automatically set expiration on video creation

---

## UI Integration

### GalleryHeader Component

**Location**: `src/features/shot-creator/components/unified-gallery/GalleryHeader.tsx`

**Features**:
- Real-time storage count display
- Color-coded badge (green/amber/red)
- Tooltip with remaining count
- Automatic refresh on gallery changes

**Badge Colors**:
```typescript
const getBadgeColor = (count: number) => {
  if (count >= 500) return 'destructive'; // Red
  if (count >= 400) return 'secondary';   // Amber
  return 'default';                        // Green
};
```

**Data Flow**:
1. Component mounts
2. Calls `/api/storage/limits`
3. Displays badge with current count
4. Updates on gallery mutations

---

## Monitoring and Maintenance

### Metrics to Track

- Daily image generation rate
- Users approaching 500 limit
- Average images per user
- Video expiration cleanup success rate
- Storage usage trends

### Maintenance Tasks

**Daily**:
- Verify cron job execution (check logs)
- Monitor cleanup success rate

**Weekly**:
- Review users near limits
- Analyze storage growth trends

**Monthly**:
- Evaluate if limits need adjustment
- Review expiration policy effectiveness

### Troubleshooting

**Cron job not running**:
1. Check `vercel.json` configuration
2. Verify CRON_SECRET environment variable
3. Check Vercel deployment logs
4. Test endpoint manually with secret

**Image limit not enforced**:
1. Check database function `can_create_image()`
2. Verify API calls service correctly
3. Test with user at limit

**Videos not expiring**:
1. Check trigger `video_expiration_trigger`
2. Verify `expires_at` set on new videos
3. Test `delete_expired_content()` function manually

---

## Future Considerations

### Potential Enhancements

1. **Configurable Limits**: Allow admin to adjust limits per user tier
2. **Storage Analytics**: Dashboard showing usage patterns
3. **Notifications**: Email users near limits
4. **Archival**: Allow users to archive old images
5. **Quota Increases**: Premium tiers with higher limits

### Scalability

Current implementation scales well because:
- Database functions are indexed
- Cron runs off-peak (3 AM UTC)
- Service layer is stateless
- No complex joins in queries

If needed, future optimizations:
- Materialized views for counts
- Background workers for cleanup
- Partitioned tables by user_id
- Cache layer for limit checks

---

## Related Documentation

- `COST_AUDIT.md`: Cost analysis for storage and generation
- `supabase/migrations/20251217_storage_limits.sql`: Database migration
- `src/features/storage/`: Implementation code

## Questions?

For technical questions, see:
- Service implementation: `src/features/storage/services/storage-limits.service.ts`
- API routes: `src/app/api/storage/` and `src/app/api/cron/`
- Database migration: `supabase/migrations/20251217_storage_limits.sql`
