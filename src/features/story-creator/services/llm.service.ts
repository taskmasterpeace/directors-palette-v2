/**
 * LLM Service for Story Creator
 * Uses Requesty.ai API for intelligent story analysis
 */

const REQUESTY_API_URL = 'https://router.requesty.ai/v1/chat/completions'

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
    private static apiKey = process.env.NEXT_PUBLIC_REQUESTY_API_KEY || ''
    private static model = 'openai/gpt-4o-mini'

    /**
     * Make a request to the LLM
     */
    private static async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
        if (!this.apiKey) {
            throw new Error('NEXT_PUBLIC_REQUESTY_API_KEY not configured')
        }

        const response = await fetch(REQUESTY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature: 0.7,
                max_tokens: 4096
            })
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`LLM API error: ${response.status} - ${error}`)
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

            const userPrompt = `Extract 5-10 visual shots from this chapter. Include establishing shots, character close-ups, inserts, and reactions.

\`\`\`
${segment.text}
\`\`\`

Return JSON format:
[
  {
    "chapter": "${segment.chapter || 'null'}",
    "sequence": 1,
    "text": "original text excerpt",
    "visualDescription": "MUST include specific location + what we see + mood",
    "characters": ["Character1", "Character2"],
    "location": "Specific location name (e.g., Cobb County interrogation room, not just 'room')",
    "mood": "tense/calm/dramatic/angry/fearful/etc",
    "cameraAngle": "establishing/wide/medium/close-up/insert/POV/reaction"
  }
]

Extract 5-10 shots. Return ONLY valid JSON, no markdown.`

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
        return allScenes
    }

    /**
     * Split story into processable segments (by chapter or intelligent chunking)
     */
    private static splitStoryIntoSegments(storyText: string): Array<{ text: string; chapter?: string }> {
        // Detect chapter markers (Chapter 1, Chapter 2, etc. or Part I, Part II, etc.)
        const chapterRegex = /^(Chapter|Part|Section)\s+(\d+|[IVXLCDM]+).*$/gim
        const chapters: Array<{ text: string; chapter: string }> = []

        let match
        const matches: Array<{ index: number; title: string }> = []

        while ((match = chapterRegex.exec(storyText)) !== null) {
            matches.push({ index: match.index, title: match[0].trim() })
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
     * Check if LLM service is configured
     */
    static isConfigured(): boolean {
        return !!this.apiKey
    }
}
