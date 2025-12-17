
import { StoryDirectorService } from '../src/features/storyboard/services/story-director.service'
import { DIRECTORS } from '../src/features/music-lab/data/directors.data'
import { GeneratedShotPrompt } from '../src/features/storyboard/types/storyboard.types'

// Mock Data
const mockPrompts: GeneratedShotPrompt[] = [
    {
        sequence: 1,
        originalText: "A hero stands on the edge of a building, looking at the city.",
        prompt: "Wide shot of a hero on a rooftop overlooking a city skyline.",
        shotType: "wide",
        characterRefs: [],
        edited: false
    },
    {
        sequence: 2,
        originalText: "He jumps off.",
        prompt: "Action shot of the hero leaping from the ledge.",
        shotType: "medium",
        characterRefs: [],
        edited: false
    }
]

async function testDirectorApplication() {
    console.log("🎬 Testing Director Application to Storyboard...\n")

    // 1. Select Director (Ryan Cooler)
    const director = DIRECTORS.find(d => d.id === 'director_ryan_coogler')
    if (!director) throw new Error("Director Ryan Cooler not found")

    console.log(`Selected Director: ${director.name}`)
    console.log(`Core Intent: ${director.coreIntent.primaryFocus.join(", ")}`)
    console.log(`Image Prompt Base: ${director.imagePrompt.base}\n`)

    // 2. Apply to Prompts
    console.log("Original Prompt 1:", mockPrompts[0].prompt)

    const enhancedPrompts = StoryDirectorService.enhanceGeneratedPrompts(mockPrompts, director)

    console.log("\n✨ Enhanced Prompt 1:", enhancedPrompts[0].prompt)

    // 3. Verify Changes
    const p1 = enhancedPrompts[0]
    const p2 = enhancedPrompts[1]

    // Check Metadata
    if (p1.metadata?.directorId !== director.id) console.error("❌ Director ID not set on prompt 1")
    else console.log("✅ Director ID set correctly")

    if (p1.metadata?.rating !== 0) console.error("❌ Rating not reset to 0")
    else console.log("✅ Rating reset verified")

    // Check Text Content (Basic heuristic)
    if (p1.prompt === mockPrompts[0].prompt) {
        console.error("❌ Prompt text did not change!")
    } else {
        console.log("✅ Prompt text modified successfully")
    }

    // Check for Director specific keywords (heuristic)
    // Ryan Cooler often adds "emotional", "intimate", "warm"
    const lowerPrompt = p1.prompt.toLowerCase()
    const keywords = [director.imagePrompt.base.toLowerCase(), 'emotional', 'community']
    const hasKeyword = keywords.some(k => lowerPrompt.includes(k))

    if (hasKeyword) {
        console.log("✅ Director keywords found in prompt")
    } else {
        console.warn("⚠️ No obvious director keywords found (might be subtle or using different phrasing)")
    }

    console.log("\nSummary:")
    console.log(`Processed ${enhancedPrompts.length} shots.`)
}

testDirectorApplication().catch(console.error)
