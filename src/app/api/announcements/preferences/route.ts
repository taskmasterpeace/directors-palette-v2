import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { announcementService } from '@/features/announcements'

/** POST /api/announcements/preferences — update mute_all preference */
export async function POST(request: NextRequest) {
    try {
        const supabase = await getClient()
        if (!supabase) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const { mute_all } = await request.json()
        if (typeof mute_all !== 'boolean') {
            return NextResponse.json({ error: 'mute_all must be a boolean' }, { status: 400 })
        }

        await announcementService.setMuteAll(user.id, mute_all)
        return NextResponse.json({ success: true, mute_all })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update preferences' },
            { status: 500 }
        )
    }
}
