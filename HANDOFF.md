# Developer Handoff: Admin System & Credits

## 1. Project Overview
We are implementing a secure Admin System and updated Credits logic for "Director's Palette".
**Goal**: Enable Admin Dashboard access for `taskmasterpeace@gmail.com`, allow admin to view user stats/credits, and set default credits for NEW users to **65**.

## 2. Current Status
*   **Admin Access (UI)**: ✅ **Fixed**. The sidebar link appears, and the user can navigate to `/admin`.
    *   Auth check in `useAdminAuth` is passing.
*   **Database**: ✅ **Fixed**. `admin_users` table exists and contains the admin email.
*   **Data Fetching (API)**: ⚠️ **Partially Broken**.
    *   `GET /api/admin/stats` returns 403 Forbidden.
    *   `GET /api/admin/users` returns 403 Forbidden.
    *   **Root Cause**: The `isAdminEmail` check in the API routes is failing, likely because the new RLS policies on `admin_users` are not matching the API's authenticated user context correctly, OR the helper function is using a different client instantiation causing a mismatch.
*   **Default Credits**: ⚠️ **Pending Verification**.
    *   Migration `supabase/migrations/20251216_secure_update_v2.sql` was created to set default credits to 65 via a trigger.

## 3. Key Constraints
*   **Missing Service Key**: The `.env.local` is missing `SUPABASE_SERVICE_KEY`. We CANNOT use the Service Role (admin client) to bypass RLS. We must rely on standard `authenticated` role and RLS policies.
*   **Security**: No hardcoded emails in the codebase. Access must be controlled via the `admin_users` table.

## 4. Technical Details

### Database Schema
*   **`admin_users`**: Stores authorized admin emails.
*   **`user_credits`**: Stores user balances.
*   **RLS Policies** (Recently Updated):
    *   `admin_users`: Authenticated users can select rows WHERE `email = auth.jwt() ->> 'email'`.
    *   `user_credits`: Authenticated users can select rows IF they match `user_id` OR if they exist in `admin_users`.

### Code Reference
*   **API Routes**: `src/app/api/admin/stats/route.ts`, `src/app/api/admin/users/route.ts`
*   **Admin Service**: `src/features/admin/services/admin.service.ts`
*   **Migration**: `supabase/migrations/20251216_secure_update_v2.sql`

## 5. Next Steps for Developer
1.  **Debug API 403**: Check the server logs for `[StatsAPI] Check for ...`.
    *   If `isAdmin` is false, it means `adminService.checkAdminEmailAsync` failed.
    *   Investigate if `getClient()` in the API route context has the correct Auth headers forwarded.
2.  **Verify New User Credits**: Sign up a new user and confirm `user_credits` balance is initialized to **65**.
3.  **UI Polish**: Ensure the dashboard displays the "Empty" states gracefully if data fetch fails.

## 6. Attempts Made
*   Tried hardcoding email in API (Effective but rejected for security).
*   Tried updating RLS to allow "self-check" (Current state, theoretically correct but failing in practice).
