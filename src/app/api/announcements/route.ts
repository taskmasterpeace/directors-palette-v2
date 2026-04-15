import { NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { announcementService } from '@/features/announcements'

/** GET /api/announcements — get announcements for the current user */
export async function GET() {
    try {
        const supabase = await getClient()
        if (!supabase) {
            return NextResponse.json({ announcements: [], muteAll: false })
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ announcements: [], muteAll: false })
        }

        const [announcements, prefs] = await Promise.all([
            announcementService.getUserAnnouncements(user.id),
            announcementService.getPreferences(user.id)
        ])

        return NextResponse.json({
            announcements,
            muteAll: prefs?.mute_all ?? false
        })
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch announcements' },
            { status: 500 }
        )
    }
}
