import { NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await getClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user || !user.email) {
            return NextResponse.json({ isAdmin: false })
        }

        // Use the authenticated client to check.
        // This requires the RLS policy: create policy "Allow read access to authenticated users" on admin_users for select to authenticated using (true);
        // Note: admin_users table not in generated types, using type assertion
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .from('admin_users')
            .select('email')
            .eq('email', user.email)
            .maybeSingle()

        if (error) {
            logger.api.error('Admin check error', { error: error instanceof Error ? error.message : String(error) })
            return NextResponse.json({ isAdmin: false })
        }



        return NextResponse.json({ isAdmin: !!data })

    } catch (error) {
        logger.api.error('Admin status API error', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({
            isAdmin: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
