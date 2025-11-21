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
        // Aim for ~8000 chars per segment (safe for LLM), but don't break mid-paragraph
        console.log('📄 No chapters detected, creating intelligent segments...')

        const targetSize = 8000 // Characters per segment
        const minSize = 500 // Don't create tiny segments
        const segments: Array<{ text: string }> = []

        if (storyText.length <= targetSize) {
            // Story is short enough, process as one segment
            return [{ text: storyText }]
        }

        // Split by double newlines (paragraph breaks)
        const paragraphs = storyText.split(/\n\n+/)
        let currentSegment = ''

        for (const paragraph of paragraphs) {
            // If adding this paragraph would exceed target, save current segment
            if (currentSegment.length + paragraph.length > targetSize && currentSegment.length > minSize) {
                segments.push({
                    text: currentSegment.trim()
                })
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
     * Extract visual scenes from story text using AI
     * Processes by chapter or intelligent segments to handle long stories
     */
    static async extractScenes(storyText: string): Promise<ExtractedScene[]> {
        const systemPrompt = `You are a film director's assistant. Analyze the story text and extract distinct visual scenes that would make compelling shots for a film or storyboard.

For each scene, identify:
- The chapter (if present in the text)
- A concise visual description (what we SEE, not internal thoughts)
- Characters present
- Location
- Mood/atmosphere
- Suggested camera angle (wide, medium, close-up, POV, etc.)

Focus on:
- Moments with strong visual imagery
- Character interactions
- Location establishing shots
- Emotional turning points
- Action sequences

Skip scenes that are purely internal monologue with no visual element.`

        // Split story into processable segments
        const segments = this.splitStoryIntoSegments(storyText)
        const allScenes: ExtractedScene[] = []
        let globalSequence = 1

        // Process each segment
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i]
            console.log(`🎬 Processing segment ${i + 1}/${segments.length}${segment.chapter ? ` (${segment.chapter})` : ''}...`)

            const userPrompt = `Extract visual scenes from this story segment. Return as JSON array:

\`\`\`
${segment.text}
\`\`\`

Return JSON format:
[
  {
    "chapter": "${segment.chapter || 'null'}",
    "sequence": 1,
    "text": "original text excerpt",
    "visualDescription": "concise visual description for image generation",
    "characters": ["Character1", "Character2"],
    "location": "Location name",
    "mood": "tense/calm/dramatic/etc",
    "cameraAngle": "wide/medium/close-up/etc"
  }
]

Extract 5-15 key visual moments from this segment. Return ONLY valid JSON, no markdown.`

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
                console.log(`  ✓ Extracted ${scenes.length} scenes`)
            } catch (error) {
                console.error(`LLM scene extraction failed for segment ${i + 1}:`, error)
                // Continue with other segments even if one fails
            }
        }

        console.log(`🎬 Total scenes extracted: ${allScenes.length}`)
        return allScenes
    }

    /**
     * Extract characters and locations from story text
     * For long stories, processes in segments and deduplicates
     */
    static async extractEntities(storyText: string): Promise<ExtractedEntities> {
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

        console.log(`👥 Extracting entities from ${segments.length} segment(s)...`)

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i]

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

        // Replace character names inline
        scene.characters.forEach(charName => {
            const entity = entities.characters.find(c =>
                c.name.toLowerCase() === charName.toLowerCase()
            )
            if (entity) {
                const hasReference = referenceImages?.has(entity.tag)
                const regex = new RegExp(`\\b${charName}\\b`, 'gi')

                if (hasReference) {
                    // Has reference image: use @tag
                    prompt = prompt.replace(regex, `@${entity.tag}`)
                    referenceTags.push(`@${entity.tag}`)
                } else {
                    // No reference: use description inline
                    prompt = prompt.replace(regex, entity.description || charName)
                }
            }
        })

        // Replace location name inline
        const locationEntity = entities.locations.find(l =>
            l.name.toLowerCase() === scene.location.toLowerCase()
        )
        if (locationEntity) {
            const hasReference = referenceImages?.has(locationEntity.tag)
            const regex = new RegExp(`\\b${scene.location}\\b`, 'gi')

            if (hasReference) {
                prompt = prompt.replace(regex, `@${locationEntity.tag}`)
                referenceTags.push(`@${locationEntity.tag}`)
            } else {
                prompt = prompt.replace(regex, locationEntity.description || scene.location)
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
