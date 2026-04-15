import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { announcementService } from '@/features/announcements'

/** POST /api/announcements/dismiss — dismiss an announcement */
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

        const { announcement_id } = await request.json()
        if (!announcement_id) {
            return NextResponse.json({ error: 'announcement_id required' }, { status: 400 })
        }

        await announcementService.dismiss(announcement_id, user.id)
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to dismiss' },
            { status: 500 }
        )
    }
}
