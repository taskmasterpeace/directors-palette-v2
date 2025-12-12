/**
 * LLM Service for Story Creator
 * Uses server-side API route to proxy LLM requests (keeps API key secure)
 */

interface LLMResponse {
    choices: Array<{
        message: {
            content: string
        }
    }>
}

interface ExtractedScene {
    chapter?: string
    sequence: number
    text: string
    visualDescription: string
    characters: string[]
    location: string
    mood: string
    cameraAngle?: string
}

interface ExtractedEntities {
    characters: Array<{
        name: string
        tag: string
        description: string
    }>
    locations: Array<{
        name: string
        tag: string
        description: string
    }>
}

type ProgressCallback = (update: { type: string; message: string }) => void

export class LLMService {
    private static model = 'openai/gpt-4o-mini'

    /**
     * Make a request to the LLM via secure server-side API route
     */
    private static async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
        const response = await fetch('/api/story-creator/llm-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature: 0.7,
                max_tokens: 4096
            })
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }))
            throw new Error(`LLM API error: ${response.status} - ${error.error || error.details || 'Unknown error'}`)
        }

        const data: LLMResponse = await response.json()
        return data.choices[0]?.message?.content || ''
    }

    /**
     * Extract visual scenes from story text using AI
     */
    static async extractScenes(storyText: string, onProgress?: ProgressCallback): Promise<ExtractedScene[]> {
        const systemPrompt = `You are a cinematographer breaking down a story into visual shots for film production.

CRITICAL REQUIREMENTS:
1. ALWAYS include specific location details in visualDescription (e.g., "Cobb County interrogation room" not just "room")
2. Generate 5-10 shots PER CHAPTER including:
   - ESTABLISHING SHOTS (wide shots showing the location)
   - CHARACTER SHOTS (medium/close-up of people, emotions, reactions)
   - INSERT SHOTS (close-ups of objects: hands, eyes, documents, phones, etc.)
   - REACTION SHOTS (emotional responses, facial expressions)
   - ACTION SHOTS (movement, interactions)

3. For EVERY shot, visualDescription must include:
   - Specific location name
   - What characters are doing
   - Emotional state if visible
   - Important details (lighting, objects, atmosphere)

SHOT TYPE EXAMPLES:
- Establishing: "Wide shot of the Cobb County interrogation room, fluorescent lights casting green pallor"
- Insert: "Close-up of @clone's tattooed hands clenched on metal table in interrogation room"
- Reaction: "Close-up of @clone's face in interrogation room, sweat forming as he realizes his mistake"
- Action: "Medium shot of @detective_morrison leaning across table in interrogation room, pointing finger"

Focus on:
- Emotional moments (fear, anger, realization, regret)
- Visual details that tell the story
- Everyday life moments (phone scrolling, driving, sitting alone)
- Environmental storytelling`

        const segments = this.splitStoryIntoSegments(storyText)
        onProgress?.({ type: 'analyzing', message: `Found ${segments.length} chapters/segments to process` })

        const allScenes: ExtractedScene[] = []
        let globalSequence = 1

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i]
            const progressMessage = `Extracting shots from ${segment.chapter || `segment ${i + 1}`} (${i + 1}/${segments.length})`
            onProgress?.({ type: 'extracting', message: progressMessage })

            const userPrompt = `Extract 8-15 visual shots from this ${segment.chapter ? 'section' : 'chapter'}. Include establishing shots, character close-ups, inserts, and reactions.

\`\`\`
${segment.text}
\`\`\`

Return JSON format:
[
  {
    ${segment.chapter ? `"chapter": "${segment.chapter}",` : '"chapter": null,'}
    "sequence": 1,
    "text": "original text excerpt",
    "visualDescription": "MUST include specific location + what we see + mood",
    "characters": ["Character1", "Character2"],
    "location": "Specific location name (e.g., BullPen Battle League venue in Atlanta, not just 'venue')",
    "mood": "tense/calm/dramatic/angry/fearful/triumphant/etc",
    "cameraAngle": "establishing/wide/medium/close-up/insert/POV/reaction"
  }
]

Extract 8-15 shots with good variety. Return ONLY valid JSON, no markdown.`

            try {
                const response = await this.chat([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ])

                // Parse JSON from response
                const jsonMatch = response.match(/\[[\s\S]*\]/)
                if (!jsonMatch) {
                    console.warn(`No JSON found in segment ${i + 1}, skipping...`)
                    continue
                }

                const scenes: ExtractedScene[] = JSON.parse(jsonMatch[0])

                // Renumber sequences to be globally unique
                scenes.forEach(scene => {
                    scene.sequence = globalSequence++
                    // Ensure chapter is set if we have one
                    if (segment.chapter && !scene.chapter) {
                        scene.chapter = segment.chapter
                    }
                })

                allScenes.push(...scenes)
                console.log(`  ✓ Extracted ${scenes.length} shots from ${segment.chapter || `segment ${i + 1}`}`)
            } catch (error) {
                console.error(`Scene extraction failed for segment ${i + 1}:`, error)
                // Continue with other segments
            }
        }

        console.log(`🎬 Total shots extracted: ${allScenes.length}`)

        // Validation: Ensure reasonable shot count
        const MIN_SHOTS = 3
        const MAX_SHOTS = 200

        if (allScenes.length === 0) {
            throw new Error('No visual scenes extracted from story. Please ensure your story contains descriptive action or scene changes.')
        }

        if (allScenes.length < MIN_SHOTS) {
            console.warn(`⚠️  Only ${allScenes.length} shots extracted (minimum recommended: ${MIN_SHOTS})`)
        }

        if (allScenes.length > MAX_SHOTS) {
            console.warn(`⚠️  Extracted ${allScenes.length} shots (max ${MAX_SHOTS}). Truncating...`)
            allScenes.splice(MAX_SHOTS)
        }

        return allScenes
    }

    /**
     * Split story into processable segments (by chapter or intelligent chunking)
     */
    private static splitStoryIntoSegments(storyText: string): Array<{ text: string; chapter?: string }> {
        // Detect chapter/section markers - includes plain headers on their own line
        // Matches: "Chapter 1", "Part I", or standalone headers like "BullPen Beginnings and Reputation"
        const chapterRegex = /^(?:(Chapter|Part|Section)\s+(\d+|[IVXLCDM]+)[^\n]*|([A-Z][A-Za-z\s,'&-]{10,80}))$/gim
        const chapters: Array<{ text: string; chapter: string }> = []

        let match
        const matches: Array<{ index: number; title: string }> = []

        while ((match = chapterRegex.exec(storyText)) !== null) {
            const title = match[0].trim()
            // Skip generic single words or very short titles
            if (title.length >= 10 && !title.match(/^(The|A|An|In|On|At|To|From|For|With|By|Of)\s+\w+$/i)) {
                matches.push({ index: match.index, title })
            }
        }

        // If we found chapters, split by them
        if (matches.length > 1) {
            console.log(`📚 Found ${matches.length} chapters, processing separately...`)

            for (let i = 0; i < matches.length; i++) {
                const start = matches[i].index
                const end = i < matches.length - 1 ? matches[i + 1].index : storyText.length
                const chapterText = storyText.slice(start, end).trim()

                // Skip tiny chapters (less than 100 chars)
                if (chapterText.length > 100) {
                    chapters.push({
                        text: chapterText,
                        chapter: matches[i].title
                    })
                }
            }

            return chapters
        }

        // No chapters found - create intelligent segments
        console.log('📄 No chapters detected, creating intelligent segments...')

        const targetSize = 8000 // Characters per segment
        const minSize = 500
        const segments: Array<{ text: string }> = []

        if (storyText.length <= targetSize) {
            return [{ text: storyText }]
        }

        // Split by double newlines (paragraph breaks)
        const paragraphs = storyText.split(/\n\n+/)
        let currentSegment = ''

        for (const paragraph of paragraphs) {
            if (currentSegment.length + paragraph.length > targetSize && currentSegment.length > minSize) {
                segments.push({ text: currentSegment.trim() })
                currentSegment = paragraph
            } else {
                currentSegment += (currentSegment ? '\n\n' : '') + paragraph
            }
        }

        // Add remaining segment
        if (currentSegment.trim().length > minSize) {
            segments.push({ text: currentSegment.trim() })
        }

        console.log(`📄 Created ${segments.length} intelligent segments`)
        return segments
    }

    /**
     * Extract characters and locations from story text
     * For long stories, processes in segments and deduplicates
     */
    static async extractEntities(storyText: string, onProgress?: ProgressCallback): Promise<ExtractedEntities> {
        const systemPrompt = `You are analyzing a story for film production. Extract all named characters and distinct locations.

For characters:
- Include main and supporting characters
- Generate a reference tag (lowercase, underscores)
- Brief visual description for image generation

For locations:
- Include all distinct settings
- Generate a reference tag
- Brief visual description`

        // For very long stories, extract from segments and merge
        const segments = this.splitStoryIntoSegments(storyText)
        const allCharacters: Array<{ name: string; tag: string; description: string }> = []
        const allLocations: Array<{ name: string; tag: string; description: string }> = []

        const entityMessage = `Extracting characters & locations from ${segments.length} ${segments.length === 1 ? 'segment' : 'segments'}...`
        onProgress?.({ type: 'entities', message: entityMessage })
        console.log(`👥 ${entityMessage}`)

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i]

            if (segments.length > 1) {
                onProgress?.({
                    type: 'entities',
                    message: `Processing entities from ${segment.chapter || `segment ${i + 1}`} (${i + 1}/${segments.length})`
                })
            }

            const userPrompt = `Extract characters and locations from this story segment:

\`\`\`
${segment.text}
\`\`\`

Return JSON format:
{
  "characters": [
    {"name": "Character Name", "tag": "character_name", "description": "visual description for image generation"}
  ],
  "locations": [
    {"name": "Location Name", "tag": "location_name", "description": "visual description for image generation"}
  ]
}

Return ONLY valid JSON, no markdown.`

            try {
                const response = await this.chat([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ])

                // Parse JSON from response
                const jsonMatch = response.match(/\{[\s\S]*\}/)
                if (!jsonMatch) {
                    console.warn(`No JSON found for entities in segment ${i + 1}, skipping...`)
                    continue
                }

                const entities: ExtractedEntities = JSON.parse(jsonMatch[0])
                allCharacters.push(...entities.characters)
                allLocations.push(...entities.locations)
                console.log(`  ✓ Found ${entities.characters.length} characters, ${entities.locations.length} locations`)
            } catch (error) {
                console.error(`Entity extraction failed for segment ${i + 1}:`, error)
                // Continue with other segments
            }
        }

        // Deduplicate by tag (case-insensitive)
        const uniqueCharacters = Array.from(
            new Map(
                allCharacters.map(c => [c.tag.toLowerCase(), c])
            ).values()
        )

        const uniqueLocations = Array.from(
            new Map(
                allLocations.map(l => [l.tag.toLowerCase(), l])
            ).values()
        )

        console.log(`👥 Total unique entities: ${uniqueCharacters.length} characters, ${uniqueLocations.length} locations`)

        // Validation: Ensure at least some entities were extracted
        const MAX_ENTITIES_PER_TYPE = 50

        if (uniqueCharacters.length === 0 && uniqueLocations.length === 0) {
            throw new Error('No entities extracted from story. Please ensure your story contains named characters or specific locations.')
        }

        if (uniqueCharacters.length > MAX_ENTITIES_PER_TYPE) {
            console.warn(`⚠️  Extracted ${uniqueCharacters.length} characters (max ${MAX_ENTITIES_PER_TYPE}). Truncating...`)
            uniqueCharacters.splice(MAX_ENTITIES_PER_TYPE)
        }

        if (uniqueLocations.length > MAX_ENTITIES_PER_TYPE) {
            console.warn(`⚠️  Extracted ${uniqueLocations.length} locations (max ${MAX_ENTITIES_PER_TYPE}). Truncating...`)
            uniqueLocations.splice(MAX_ENTITIES_PER_TYPE)
        }

        return {
            characters: uniqueCharacters,
            locations: uniqueLocations
        }
    }

    /**
     * Generate an image prompt from a scene description
     * Replaces character/location names INLINE with @tags or descriptions
     */
    static async generateImagePrompt(
        scene: ExtractedScene,
        entities: ExtractedEntities,
        referenceImages?: Map<string, string>, // tag -> imageUrl (if user has assigned refs)
        style?: string
    ): Promise<{ prompt: string; referenceTags: string[] }> {
        const referenceTags: string[] = []
        let prompt = scene.visualDescription

        // Replace character names inline with @tags
        scene.characters.forEach(charName => {
            const entity = entities.characters.find(c =>
                c.name.toLowerCase() === charName.toLowerCase()
            )
            if (entity) {
                const hasReference = referenceImages?.has(entity.tag)
                const regex = new RegExp(`\\b${charName}\\b`, 'gi')

                // ALWAYS use @tag in prompt (cleaner, consistent)
                prompt = prompt.replace(regex, `@${entity.tag}`)

                // Add to referenceTags array if reference image is assigned
                if (hasReference) {
                    referenceTags.push(`@${entity.tag}`)
                }
            }
        })

        // Replace location name inline with @tag
        const locationEntity = entities.locations.find(l =>
            l.name.toLowerCase() === scene.location.toLowerCase()
        )
        if (locationEntity) {
            const hasReference = referenceImages?.has(locationEntity.tag)
            const regex = new RegExp(`\\b${scene.location}\\b`, 'gi')

            // ALWAYS use @tag in prompt (cleaner, consistent)
            prompt = prompt.replace(regex, `@${locationEntity.tag}`)

            // Add to referenceTags array if reference image is assigned
            if (hasReference) {
                referenceTags.push(`@${locationEntity.tag}`)
            }
        }

        // Add camera angle if present
        if (scene.cameraAngle) {
            prompt = `${prompt}, ${scene.cameraAngle} shot`
        }

        // Add style if provided
        if (style) {
            prompt = `${prompt}, ${style}`
        }

        return {
            prompt: prompt.trim(),
            referenceTags
        }
    }

    /**
     * Check if LLM service is configured (always true since API key is server-side)
     */
    static isConfigured(): boolean {
        // API key is now server-side, assume configured
        // Server will return error if not configured
        return true
    }
}
