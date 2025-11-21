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
    private static model = 'moonshotai/kimi-k2-instruct' // Can also use 'openai/gpt-4o-mini'

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

        const userPrompt = `Extract visual scenes from this story. Return as JSON array:

\`\`\`
${storyText.slice(0, 12000)}
\`\`\`

Return JSON format:
[
  {
    "chapter": "Chapter 1: Title" or null,
    "sequence": 1,
    "text": "original text excerpt",
    "visualDescription": "concise visual description for image generation",
    "characters": ["Character1", "Character2"],
    "location": "Location name",
    "mood": "tense/calm/dramatic/etc",
    "cameraAngle": "wide/medium/close-up/etc"
  }
]

Extract 10-30 key visual moments. Return ONLY valid JSON, no markdown.`

        try {
            const response = await this.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ])

            // Parse JSON from response
            const jsonMatch = response.match(/\[[\s\S]*\]/)
            if (!jsonMatch) {
                throw new Error('No JSON array found in response')
            }

            return JSON.parse(jsonMatch[0])
        } catch (error) {
            console.error('LLM scene extraction failed:', error)
            throw error
        }
    }

    /**
     * Extract characters and locations from story text
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

        const userPrompt = `Extract characters and locations from this story:

\`\`\`
${storyText.slice(0, 12000)}
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
                throw new Error('No JSON object found in response')
            }

            return JSON.parse(jsonMatch[0])
        } catch (error) {
            console.error('LLM entity extraction failed:', error)
            throw error
        }
    }

    /**
     * Generate an image prompt from a scene description
     */
    static async generateImagePrompt(
        scene: ExtractedScene,
        entities: ExtractedEntities,
        style?: string
    ): Promise<{ prompt: string; referenceTags: string[] }> {
        // Find matching entities for reference tags
        const referenceTags: string[] = []

        scene.characters.forEach(charName => {
            const entity = entities.characters.find(c =>
                c.name.toLowerCase() === charName.toLowerCase()
            )
            if (entity) {
                referenceTags.push(`@${entity.tag}`)
            }
        })

        const locationEntity = entities.locations.find(l =>
            l.name.toLowerCase() === scene.location.toLowerCase()
        )
        if (locationEntity) {
            referenceTags.push(`@${locationEntity.tag}`)
        }

        // Build the prompt
        let prompt = scene.visualDescription

        // Add reference tags
        if (referenceTags.length > 0) {
            prompt = `${referenceTags.join(' ')} ${prompt}`
        }

        // Add camera angle
        if (scene.cameraAngle) {
            prompt = `${prompt}, ${scene.cameraAngle} shot`
        }

        // Add mood
        if (scene.mood) {
            prompt = `${prompt}, ${scene.mood} atmosphere`
        }

        // Add style
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
