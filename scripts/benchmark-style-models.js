/**
 * Benchmark script for style expansion models
 * Tests speed and quality of different LLM models for style expansion
 *
 * Run with: node scripts/benchmark-style-models.js
 */

require('dotenv').config({ path: '.env.local' })

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

if (!OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY not found in .env.local')
  process.exit(1)
}

// Models to test
const MODELS = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o-mini (current)', cost: '$0.15-0.60/M' },
  { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B', cost: '$0.03/M' },
  { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B', cost: '$0.03/M' },
  { id: 'meta-llama/llama-3.2-3b-instruct', name: 'Llama 3.2 3B', cost: '$0.018/M' },
]

// Test prompt
const TEST_STYLE = 'LEGO'

const SYSTEM_PROMPT = `You are an expert in children's book illustration styles.
Take a simple style name and expand it into a detailed visual description (50-100 words).
Include: texture, lighting, color palette, artistic techniques, mood.
Respond with JSON: {"expandedStyle": "...", "keywords": ["...", "..."]}`

async function testModel(model) {
  const startTime = Date.now()

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://directors-palette.app',
        'X-Title': 'Directors Palette - Model Benchmark'
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Expand this style for a children's book: "${TEST_STYLE}"` }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    if (!response.ok) {
      const error = await response.text()
      return {
        model: model.name,
        cost: model.cost,
        duration: null,
        error: `HTTP ${response.status}: ${error.substring(0, 100)}`,
        output: null
      }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || 'No content'

    return {
      model: model.name,
      cost: model.cost,
      duration: duration,
      error: null,
      output: content.substring(0, 500),
      tokens: data.usage
    }
  } catch (err) {
    return {
      model: model.name,
      cost: model.cost,
      duration: null,
      error: err.message,
      output: null
    }
  }
}

async function runBenchmark() {
  console.log('=' .repeat(60))
  console.log('STYLE EXPANSION MODEL BENCHMARK')
  console.log('=' .repeat(60))
  console.log(`Test prompt: "${TEST_STYLE}"`)
  console.log('')

  const results = []

  for (const model of MODELS) {
    console.log(`\nTesting: ${model.name}...`)
    const result = await testModel(model)
    results.push(result)

    if (result.error) {
      console.log(`  ❌ Error: ${result.error}`)
    } else {
      console.log(`  ✅ Duration: ${result.duration}ms`)
      console.log(`  💰 Cost: ${result.cost}`)
      if (result.tokens) {
        console.log(`  📊 Tokens: ${result.tokens.prompt_tokens} in / ${result.tokens.completion_tokens} out`)
      }
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(60))
  console.log('SUMMARY - Sorted by Speed')
  console.log('=' .repeat(60))

  const successfulResults = results.filter(r => !r.error)
  successfulResults.sort((a, b) => a.duration - b.duration)

  console.log('')
  successfulResults.forEach((r, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '
    console.log(`${medal} ${r.model}`)
    console.log(`   Speed: ${r.duration}ms | Cost: ${r.cost}`)
  })

  // Show outputs for quality comparison
  console.log('\n' + '=' .repeat(60))
  console.log('OUTPUT QUALITY COMPARISON')
  console.log('=' .repeat(60))

  successfulResults.forEach(r => {
    console.log(`\n--- ${r.model} ---`)
    console.log(r.output)
  })

  // Failed models
  const failedResults = results.filter(r => r.error)
  if (failedResults.length > 0) {
    console.log('\n' + '=' .repeat(60))
    console.log('FAILED MODELS')
    console.log('=' .repeat(60))
    failedResults.forEach(r => {
      console.log(`\n❌ ${r.model}: ${r.error}`)
    })
  }
}

runBenchmark().catch(console.error)
