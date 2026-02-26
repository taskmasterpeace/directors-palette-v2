
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const { user } = auth

        // Get form data
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Validate file type
        const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/x-m4a']
        if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|aac)$/i)) {
            return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
        }

        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
        }

        // Generate unique filename
        const timestamp = Date.now()
        const ext = file.name.split('.').pop()
        const safeFileName = `${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`

        // Define Local Storage Path: public/uploads/users/{userId}/audio
        // We use 'public' so Next.js can serve it directly
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'users', user.id, 'audio')

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true })

        // Write file to disk
        const buffer = Buffer.from(await file.arrayBuffer())
        const filePath = path.join(uploadDir, safeFileName)
        await writeFile(filePath, buffer)

        // Generate Public URL
        const publicUrl = `/uploads/users/${user.id}/audio/${safeFileName}`

        return NextResponse.json({ url: publicUrl })

    } catch (error: unknown) {
        logger.api.error('Local upload error', { error: error instanceof Error ? error.message : String(error) })
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({
            error: `Internal server error: ${message}`
        }, { status: 500 })
    }
}
