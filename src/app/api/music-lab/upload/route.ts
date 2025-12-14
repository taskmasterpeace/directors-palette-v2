/**
 * Music Lab Audio Upload API
 * 
 * Handles audio file upload to Supabase storage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const { user, supabase } = auth

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
        const fileName = `${user.id}/music-lab/${timestamp}.${ext}`

        // Upload to Supabase Storage
        const arrayBuffer = await file.arrayBuffer()
        const { data: _data, error: uploadError } = await supabase.storage
            .from('audio')
            .upload(fileName, arrayBuffer, {
                contentType: file.type,
                upsert: true
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('audio')
            .getPublicUrl(fileName)

        return NextResponse.json({ url: publicUrl })
    } catch (error) {
        console.error('Audio upload error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
