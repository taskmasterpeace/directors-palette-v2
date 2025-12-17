/**
 * Test script for Music Lab transcription pipeline
 * Run with: npx ts-node scripts/test-transcription.ts
 */

import { readFileSync } from 'fs'
import path from 'path'

const API_BASE = 'http://localhost:5555'

async function testTranscription() {
    console.log('=== Testing Music Lab Transcription ===\n')

    // Test file path
    const testFile = path.join(process.cwd(), 'public', 'uploads', 'test', 'nava5.mp3')
    const audioUrl = '/uploads/test/nava5.mp3'

    console.log('1. Test file:', testFile)
    try {
        const stats = readFileSync(testFile)
        console.log('   File exists, size:', stats.length, 'bytes\n')
    } catch {
        console.log('   ERROR: File not found!\n')
        return
    }

    // Call transcription API
    console.log('2. Calling /api/music-lab/transcribe...')
    try {
        const response = await fetch(`${API_BASE}/api/music-lab/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioUrl })
        })

        console.log('   Status:', response.status)

        const data = await response.json()

        if (response.ok) {
            console.log('\n3. Transcription Result:')
            console.log('   Full Text:', data.fullText?.substring(0, 200) + '...')
            console.log('   Word Count:', data.words?.length || 0)
            console.log('   Segments:', data.segments?.length || 0)

            // Test section detection
            console.log('\n4. Calling /api/music-lab/analyze-structure...')
            const sectionsRes = await fetch(`${API_BASE}/api/music-lab/analyze-structure`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lyrics: data.fullText,
                    segments: data.segments || []
                })
            })

            console.log('   Status:', sectionsRes.status)
            const sectionsData = await sectionsRes.json()

            if (sectionsRes.ok) {
                console.log('\n5. Detected Sections:')
                sectionsData.sections?.forEach((s: any, i: number) => {
                    console.log(`   ${i + 1}. ${s.type.toUpperCase()} (${s.startTime}s - ${s.endTime}s)`)
                    console.log(`      ${s.lyrics?.substring(0, 50)}...`)
                })
            } else {
                console.log('   ERROR:', sectionsData.error)
            }
        } else {
            console.log('   ERROR:', data.error)
            console.log('   Details:', JSON.stringify(data, null, 2))
        }
    } catch (error) {
        console.log('   FETCH ERROR:', error)
    }

    console.log('\n=== Test Complete ===')
}

testTranscription()
