import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-auth'
import { announcementService } from '@/features/announcements'
import { logger } from '@/lib/logger'

/** GET /api/admin/announcements — list all announcements */
export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    try {
        const announcements = await announcementService.listAll()
        return NextResponse.json({ announcements })
    } catch (error) {
        logger.api.error('Failed to list announcements', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: 'Failed to list announcements' }, { status: 500 })
    }
}

/** POST /api/admin/announcements — create a new announcement */
export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    try {
        const body = await request.json()
        const { title, body: msgBody, type, targeting, priority, published_at, expires_at } = body

        if (!title || !msgBody) {
            return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
        }

        const announcement = await announcementService.create(
            {
                title,
                body: msgBody,
                type: type || 'info',
                targeting: targeting || { type: 'global' },
                priority: priority || 'normal',
                published_at: published_at ?? new Date().toISOString(),
                expires_at: expires_at || null
            },
            auth.user.email || 'admin'
        )

        return NextResponse.json({ announcement })
    } catch (error) {
        logger.api.error('Failed to create announcement', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
    }
}

/** PATCH /api/admin/announcements — update an announcement */
export async function PATCH(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    try {
        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        const announcement = await announcementService.update(id, updates)
        return NextResponse.json({ announcement })
    } catch (error) {
        logger.api.error('Failed to update announcement', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
    }
}

/** DELETE /api/admin/announcements — delete an announcement */
export async function DELETE(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        await announcementService.remove(id)
        return NextResponse.json({ success: true })
    } catch (error) {
        logger.api.error('Failed to delete announcement', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 })
    }
}
