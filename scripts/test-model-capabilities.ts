/**
 * Model Capability Testing Script
 * Tests: Spelling, Token Limits, Story Handling, Instruction Following
 */

import { config } from 'dotenv'
import path from 'path'
import Replicate from 'replicate'

config({ path: path.join(process.cwd(), '.env.local') })

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
})

interface TestResult {
    model: string
    test: string
    prompt: string
    success: boolean
    notes: string
    outputUrl?: string
}

const results: TestResult[] = []

// Test prompts
const TESTS = {
    // Spelling tests - increasingly complex
    spelling_simple: 'A neon sign that says "OPEN" glowing in a dark alley',
    spelling_medium: 'A movie poster with the title "DIRECTOR\'S PALETTE" in bold letters at the top',
    spelling_complex: 'A chalkboard menu showing: "Today\'s Special: FISH & CHIPS $12.99"',

    // Story/long prompt test
    story_prompt: `A cinematic establishing shot of a dystopian city in 2147.
The skyline is dominated by massive corporate towers covered in holographic advertisements.
Flying vehicles weave between buildings. At street level, steam rises from grates
while citizens in weathered clothing hurry past neon-lit food stalls.
The color palette is predominantly cyan and orange. Shot on ARRI Alexa,
anamorphic lens flare, shallow depth of field, golden hour lighting breaking
through the smog. This is the opening shot of a noir thriller about a detective
searching for his missing partner in the underbelly of this technological dystopia.`,

    // Multi-element instruction following
    instruction_complex: `Create an image with ALL of these elements:
1. A red sports car (must be red, not any other color)
2. Parked in front of a yellow building
3. A black cat sitting on the hood of the car
4. Rain falling, creating reflections on the wet street
5. Neon "HOTEL" sign visible in the background
6. Shot from a low angle, looking up at the scene
7. Cinematic color grading with teal shadows`
}

interface ModelTestConfig {
    endpoint: string
    inputKey: string
    costPts: number
    extraParams?: Record<string, unknown>
}

// Model configurations (matching src/config/index.ts)
const MODELS: Record<string, ModelTestConfig> = {
    'qwen-image-fast': {
        endpoint: 'prunaai/qwen-image-fast:01b324d214eb4870ff424dc4215c067759c4c01a8751e327a434e2b16054db2f',
        inputKey: 'prompt',
        costPts: 2
    },
    'gpt-image-low': {
        endpoint: 'openai/gpt-image-1.5',
        inputKey: 'prompt',
        extraParams: { quality: 'low' },
        costPts: 3
    },
    'gpt-image-medium': {
        endpoint: 'openai/gpt-image-1.5',
        inputKey: 'prompt',
        extraParams: { quality: 'medium' },
        costPts: 10
    },
    'nano-banana': {
        endpoint: 'google/nano-banana',
        inputKey: 'prompt',
        costPts: 8
    },
    'nano-banana-pro': {
        endpoint: 'google/nano-banana-pro',
        inputKey: 'prompt',
        costPts: 20
    },
    'z-image-turbo': {
        endpoint: 'prunaai/z-image-turbo',
        inputKey: 'prompt',
        costPts: 5
    }
}

async function testModel(modelId: string, testName: string, prompt: string): Promise<TestResult> {
    const model = MODELS[modelId]
    if (!model) {
        return {
            model: modelId,
            test: testName,
            prompt: prompt.slice(0, 50) + '...',
            success: false,
            notes: 'Model not configured'
        }
    }

    console.log(`\n🧪 Testing ${modelId} - ${testName}...`)

    try {
        const input: Record<string, unknown> = {
            [model.inputKey]: prompt,
            ...(model.extraParams || {})
        }

        const startTime = Date.now()
        const output = await replicate.run(model.endpoint as `${string}/${string}`, { input })
        const duration = ((Date.now() - startTime) / 1000).toFixed(1)

        // Extract URL from output
        let outputUrl: string | undefined
        if (typeof output === 'string') {
            outputUrl = output
        } else if (output && typeof output === 'object') {
            outputUrl = String(output)
        }

        console.log(`   ✅ Completed in ${duration}s`)
        console.log(`   📸 Output: ${outputUrl?.slice(0, 60)}...`)

        return {
            model: modelId,
            test: testName,
            prompt: prompt.slice(0, 50) + '...',
            success: true,
            notes: `Generated in ${duration}s`,
            outputUrl
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.log(`   ❌ Failed: ${errorMsg.slice(0, 100)}`)

        return {
            model: modelId,
            test: testName,
            prompt: prompt.slice(0, 50) + '...',
            success: false,
            notes: errorMsg.slice(0, 200)
        }
    }
}

async function runTests() {
    console.log('🎬 Director\'s Palette - Model Capability Tests')
    console.log('=' .repeat(50))

    // Select which tests to run (comment out to skip)
    const testsToRun = [
        { name: 'spelling_simple', prompt: TESTS.spelling_simple },
        { name: 'spelling_medium', prompt: TESTS.spelling_medium },
        // { name: 'spelling_complex', prompt: TESTS.spelling_complex },
        // { name: 'story_prompt', prompt: TESTS.story_prompt },
        // { name: 'instruction_complex', prompt: TESTS.instruction_complex },
    ]

    // Select which models to test - focused comparison
    // Budget vs Mid vs Premium for spelling capability
    const modelsToTest = [
        'qwen-image-fast',      // 2 pts - fastest, budget
        'nano-banana',          // 8 pts - good balance
        'gpt-image-medium',     // 10 pts - standard GPT
        'nano-banana-pro',      // 20 pts - best text/spelling
    ]

    console.log(`\n📋 Running ${testsToRun.length} tests on ${modelsToTest.length} models`)
    console.log(`💰 Estimated cost: ~${modelsToTest.reduce((sum, m) => sum + (MODELS[m]?.costPts || 0), 0) * testsToRun.length} tokens`)

    for (const test of testsToRun) {
        console.log(`\n${'─'.repeat(50)}`)
        console.log(`📝 Test: ${test.name}`)
        console.log(`   Prompt: "${test.prompt.slice(0, 80)}..."`)

        for (const modelId of modelsToTest) {
            const result = await testModel(modelId, test.name, test.prompt)
            results.push(result)
        }
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 TEST RESULTS SUMMARY')
    console.log('='.repeat(50))

    // Group by model
    const byModel: Record<string, TestResult[]> = {}
    for (const r of results) {
        if (!byModel[r.model]) byModel[r.model] = []
        byModel[r.model].push(r)
    }

    for (const [model, modelResults] of Object.entries(byModel)) {
        const passed = modelResults.filter(r => r.success).length
        console.log(`\n${model}: ${passed}/${modelResults.length} passed`)
        for (const r of modelResults) {
            console.log(`  ${r.success ? '✅' : '❌'} ${r.test}: ${r.notes}`)
            if (r.outputUrl) {
                console.log(`     → ${r.outputUrl}`)
            }
        }
    }

    console.log('\n💡 Note: Check the output URLs to manually verify text accuracy')
}

runTests().catch(console.error)
