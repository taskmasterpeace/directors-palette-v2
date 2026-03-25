/**
 * End-to-end test for Copy Generator + Ad Card APIs
 * Tests the OpenRouter copy generation and verifies output parsing
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

// Load env from .env.local
import { readFileSync } from 'fs'
const envFile = readFileSync('.env.local', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key && val.length) env[key.trim()] = val.join('=').trim()
})

const openrouterKey = env.OPENROUTER_API_KEY
const replicateToken = env.REPLICATE_API_TOKEN

if (!openrouterKey) { console.error('Missing OPENROUTER_API_KEY'); process.exit(1) }

// Import approach data
const { AD_APPROACHES } = await import('../src/features/brand-studio/data/ad-approaches.ts')

// Test brand data (VerbaDeck)
const testBrand = {
  name: 'VerbaDeck',
  tagline: 'Voice-Driven Presentations, Effortless Delivery.',
  industry: 'Software/Technology',
  voice_json: {
    tone: ['Confident', 'Innovative', 'Helpful', 'Professional', 'Approachable'],
    avoid: ['Condescending', 'Technical Jargon', 'Arrogant'],
    persona: 'VerbaDeck is your intelligent presentation partner, offering cutting-edge technology with a friendly and supportive tone.',
  },
  audience_json: {
    primary: 'Public speakers, presenters, educators, and business professionals',
    secondary: 'Students, trainers, and anyone improving public speaking skills',
    psychographics: 'Tech-savvy, values efficiency and innovation, career-oriented',
  },
  visual_identity_json: {
    colors: [
      { name: 'Teal', hex: '#00A9B5', role: 'primary' },
      { name: 'Light Blue', hex: '#72D6F1', role: 'secondary' },
      { name: 'Dark Blue', hex: '#0052A5', role: 'accent' },
      { name: 'White', hex: '#FFFFFF', role: 'background' },
      { name: 'Dark Gray', hex: '#333333', role: 'text' },
    ],
  },
}

const SYSTEM_PROMPT = `You are an elite advertising copywriter and strategist. You generate compelling ad copy, headlines, hooks, taglines, and campaign concepts.

RULES:
- Write in the specific advertising approach/style you are given
- Be bold, creative, and memorable — never generic
- Output structured copy with clear sections
- Adapt tone and style to the brand identity when provided
- Keep headlines punchy (under 15 words)
- Write body copy that feels human, not corporate

OUTPUT FORMAT (use markdown):
## Headline
[One powerful headline]

## Hook
[Opening line that stops the scroll — 1-2 sentences]

## Body Copy
[Main ad copy — 3-5 sentences that drive the message home]

## Tagline
[Short, memorable brand tagline — under 8 words]

## Variants
### Alt Headline 1
[Alternative headline option]

### Alt Headline 2
[Another headline option]

### Alt Hook
[Alternative hook/opening]`

function parseCopySections(text) {
  const sections = {}
  let currentSection = ''
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      currentSection = line.slice(3).trim().toLowerCase()
    } else if (currentSection && line.trim() && !line.startsWith('#')) {
      sections[currentSection] = (sections[currentSection] || '') + line.trim() + ' '
    }
  }
  return {
    headline: (sections['headline'] || '').trim(),
    hook: (sections['hook'] || '').trim(),
    body: (sections['body copy'] || sections['body'] || '').trim(),
    tagline: (sections['tagline'] || '').trim(),
  }
}

// ==========================================
// TEST 1: Copy Generation with multiple approaches
// ==========================================
console.log('\n========================================')
console.log('TEST 1: Copy Generation API')
console.log('========================================\n')

const testApproaches = ['blunt-commentary', 'emotional-mastery', 'irresistible-offer']
const testPrompt = 'VerbaDeck is an AI-powered presentation tool that lets you rehearse and deliver presentations with real-time voice coaching. Target: professionals who hate boring presentations.'

for (const approachId of testApproaches) {
  const approach = AD_APPROACHES.find(a => a.id === approachId)
  if (!approach) { console.error(`Approach ${approachId} not found!`); continue }

  console.log(`\n--- Testing: ${approach.name} (${approach.expert}) ---`)

  // Build brand context (mirrors what the API does)
  const brandParts = []
  brandParts.push(`Brand name: ${testBrand.name}`)
  brandParts.push(`Tagline: ${testBrand.tagline}`)
  brandParts.push(`Industry: ${testBrand.industry}`)
  brandParts.push(`Brand tone: ${testBrand.voice_json.tone.join(', ')}`)
  brandParts.push(`Brand persona: ${testBrand.voice_json.persona}`)
  brandParts.push(`Avoid in copy: ${testBrand.voice_json.avoid.join(', ')}`)
  brandParts.push(`Primary audience: ${testBrand.audience_json.primary}`)
  brandParts.push(`Psychographics: ${testBrand.audience_json.psychographics}`)
  brandParts.push(`Brand colors: ${testBrand.visual_identity_json.colors.map(c => `${c.name} (${c.hex})`).join(', ')}`)
  const brandContext = brandParts.join('. ')

  const userPrompt = [
    `ADVERTISING APPROACH: ${approach.name} (${approach.expert})`,
    `CORE PRINCIPLE: ${approach.corePrinciple}`,
    `HOW IT WORKS: ${approach.howItWorks}`,
    `KEY ELEMENTS: ${approach.keyElements.join('; ')}`,
    `TEMPLATE - Big Idea: ${approach.template.bigIdea}`,
    `TEMPLATE - Execution: ${approach.template.execution}`,
    `TEMPLATE - Hook: ${approach.template.hook}`,
    '',
    `OUTPUT TYPE: full-campaign`,
    '',
    `BRAND CONTEXT: ${brandContext}`,
    '',
    `USER BRIEF: ${testPrompt}`,
    '',
    'Now generate compelling ad copy following this approach. Be bold and creative.',
  ].join('\n')

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://directorspal.com',
        'X-Title': 'Directors Palette Brand Studio',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4.1-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      console.error(`  API Error: ${response.status}`)
      const err = await response.json().catch(() => ({}))
      console.error('  ', JSON.stringify(err))
      continue
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) { console.error('  No content returned'); continue }

    // Parse sections
    const parsed = parseCopySections(text)

    console.log(`  Headline: ${parsed.headline || '(MISSING!)'}`)
    console.log(`  Hook: ${parsed.hook ? parsed.hook.slice(0, 80) + '...' : '(MISSING!)'}`)
    console.log(`  Body: ${parsed.body ? parsed.body.slice(0, 80) + '...' : '(MISSING!)'}`)
    console.log(`  Tagline: ${parsed.tagline || '(MISSING!)'}`)

    // Validate
    const issues = []
    if (!parsed.headline) issues.push('Missing headline')
    if (!parsed.hook) issues.push('Missing hook')
    if (!parsed.body) issues.push('Missing body')
    if (!parsed.tagline) issues.push('Missing tagline')
    if (parsed.headline && parsed.headline.split(' ').length > 20) issues.push('Headline too long (>20 words)')

    if (issues.length === 0) {
      console.log(`  ✅ PASS — All sections present and well-formed`)
    } else {
      console.log(`  ⚠️  Issues: ${issues.join(', ')}`)
    }

    console.log(`  Tokens used: ${data.usage?.total_tokens || 'unknown'}`)
  } catch (e) {
    console.error(`  Error: ${e.message}`)
  }
}

// ==========================================
// TEST 2: All 21 approaches load correctly
// ==========================================
console.log('\n========================================')
console.log('TEST 2: Approach Data Integrity')
console.log('========================================\n')

let allValid = true
for (const approach of AD_APPROACHES) {
  const issues = []
  if (!approach.id) issues.push('missing id')
  if (!approach.name) issues.push('missing name')
  if (!approach.expert) issues.push('missing expert')
  if (!approach.corePrinciple) issues.push('missing corePrinciple')
  if (!approach.keyElements?.length) issues.push('missing keyElements')
  if (!approach.howItWorks) issues.push('missing howItWorks')
  if (!approach.applicationSteps?.length) issues.push('missing applicationSteps')
  if (!approach.template?.bigIdea) issues.push('missing template.bigIdea')
  if (!approach.template?.hook) issues.push('missing template.hook')
  if (!approach.bestFor) issues.push('missing bestFor')
  if (!approach.color) issues.push('missing color')

  if (issues.length > 0) {
    console.log(`  ❌ ${approach.id}: ${issues.join(', ')}`)
    allValid = false
  }
}

if (allValid) {
  console.log(`  ✅ All ${AD_APPROACHES.length} approaches have complete data`)
} else {
  console.log(`  ⚠️  Some approaches have issues`)
}

// Check unique IDs
const ids = AD_APPROACHES.map(a => a.id)
const uniqueIds = new Set(ids)
if (uniqueIds.size === ids.length) {
  console.log(`  ✅ All ${ids.length} approach IDs are unique`)
} else {
  console.log(`  ❌ Duplicate IDs found!`)
}

// ==========================================
// TEST 3: parseCopySections robustness
// ==========================================
console.log('\n========================================')
console.log('TEST 3: Copy Parser Robustness')
console.log('========================================\n')

const testOutputs = [
  {
    name: 'Standard format',
    text: `## Headline\nStop boring your audience to death.\n\n## Hook\nYou know that moment when you see 47 glazed eyes staring back at you?\n\n## Body Copy\nVerbaDeck coaches you in real-time so you never lose the room again.\n\n## Tagline\nSpeak. Captivate. Repeat.`,
  },
  {
    name: 'With variants',
    text: `## Headline\nYour slides are fine. Your delivery isn't.\n\n## Hook\nEvery presenter thinks their problem is design.\n\n## Body Copy\nIt's not. VerbaDeck fixes the real problem.\n\n## Tagline\nDeliver like you mean it.\n\n## Variants\n### Alt Headline 1\nNobody remembers your slides.\n### Alt Headline 2\nAI that makes you a better speaker.`,
  },
  {
    name: 'Messy LLM output',
    text: `Here's your copy:\n\n## Headline\n**Wake up, presenter.** Your audience already left.\n\n## Hook\nMentally, they checked out at slide 3.\n\n## Body Copy\nVerbaDeck gives you real-time coaching.\n\n## Tagline\nPresent with power.`,
  },
]

for (const test of testOutputs) {
  const parsed = parseCopySections(test.text)
  const pass = parsed.headline && parsed.hook && parsed.body && parsed.tagline
  console.log(`  ${pass ? '✅' : '❌'} ${test.name}: headline="${parsed.headline?.slice(0, 40)}" tagline="${parsed.tagline}"`)
}

console.log('\n========================================')
console.log('ALL TESTS COMPLETE')
console.log('========================================\n')
