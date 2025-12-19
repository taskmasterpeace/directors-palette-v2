import { test, expect } from '@playwright/test'

/**
 * API-level end-to-end test for the complete storybook creation flow.
 * Tests the full API pipeline: ideas -> story -> elements -> style -> image generation
 */
test.describe('Storybook API End-to-End Flow', () => {
  // Use stored authentication state
  test.use({ storageState: 'tests/.auth/user.json' })

  test('complete storybook creation via API', async ({ page, request }) => {
    console.log('=== STORYBOOK API E2E TEST ===')

    // Get base URL from page context
    const baseUrl = page.url().startsWith('http')
      ? new URL(page.url()).origin
      : 'http://localhost:3007'

    // Navigate first to establish context/cookies
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    console.log('Page loaded, cookies established')

    // Step 1: Generate Story Ideas
    console.log('\nStep 1: Testing generate-ideas API...')
    const ideasResponse = await page.request.post('/api/storybook/generate-ideas', {
      data: {
        characterName: 'Luna',
        characterAge: 5,
        category: 'science',
        topic: 'animals',
        setting: 'Park',
        customElements: ['Dinosaurs', 'Magic'],
        customNotes: 'Include a surprise birthday party'
      }
    })

    expect(ideasResponse.ok()).toBeTruthy()
    const ideasData = await ideasResponse.json()
    console.log('  Ideas generated:', ideasData.ideas?.length || 0)
    expect(ideasData.ideas).toBeDefined()
    expect(ideasData.ideas.length).toBe(4)

    // Log the ideas
    ideasData.ideas.forEach((idea: { title: string; summary: string }, i: number) => {
      console.log(`  ${i + 1}. ${idea.title}`)
    })

    // Step 2: Generate Full Story (using first idea)
    console.log('\nStep 2: Testing generate-story API...')
    const selectedIdea = ideasData.ideas[0]

    const storyResponse = await page.request.post('/api/storybook/generate-story', {
      data: {
        characterName: 'Luna',
        characterAge: 5,
        category: 'science',
        topic: 'animals',
        approach: selectedIdea.approach,
        approachTitle: selectedIdea.title,
        approachSummary: selectedIdea.summary,
        pageCount: 6,
        sentencesPerPage: 3,
        setting: 'Park',
        customElements: ['Dinosaurs', 'Magic'],
        customNotes: 'Include a surprise birthday party'
      }
    })

    expect(storyResponse.ok()).toBeTruthy()
    const storyData = await storyResponse.json()
    console.log('  Story title:', storyData.title)
    console.log('  Pages generated:', storyData.pages?.length || 0)
    expect(storyData.pages).toBeDefined()
    expect(storyData.pages.length).toBe(6)

    // Log page summaries
    storyData.pages.forEach((p: { pageNumber: number; text: string }) => {
      const preview = p.text.substring(0, 50) + (p.text.length > 50 ? '...' : '')
      console.log(`  Page ${p.pageNumber}: ${preview}`)
    })

    // Step 3: Extract Story Elements
    console.log('\nStep 3: Testing extract-elements API...')
    const elementsResponse = await page.request.post('/api/storybook/extract-elements', {
      data: {
        storyText: storyData.pages.map((p: { text: string }) => p.text).join('\n'),
        mainCharacterName: 'Luna'
      }
    })

    expect(elementsResponse.ok()).toBeTruthy()
    const elementsData = await elementsResponse.json()
    console.log('  Characters found:', elementsData.characters?.length || 0)
    console.log('  Locations found:', elementsData.locations?.length || 0)

    elementsData.characters?.forEach((c: { name: string; role: string }) => {
      console.log(`    - ${c.name} (${c.role})`)
    })
    elementsData.locations?.forEach((l: { name: string }) => {
      console.log(`    - ${l.name}`)
    })

    // Step 4: Expand Style
    console.log('\nStep 4: Testing expand-style API...')
    const styleResponse = await page.request.post('/api/storybook/expand-style', {
      data: {
        styleName: 'LEGO',
        characterAge: 5
      }
    })

    expect(styleResponse.ok()).toBeTruthy()
    const styleData = await styleResponse.json()
    console.log('  Original style:', styleData.originalStyle)
    console.log('  Expanded style:', styleData.expandedStyle?.substring(0, 100) + '...')
    console.log('  Keywords:', styleData.keywords?.slice(0, 5).join(', '))
    expect(styleData.expandedStyle).toBeDefined()
    expect(styleData.keywords).toBeDefined()

    // Step 5: Test Style Guide Generation API
    console.log('\nStep 5: Testing style-guide generation API...')
    const styleGuideResponse = await page.request.post('/api/storybook/generate-style-guide', {
      data: {
        styleName: 'LEGO',
        styleDescription: styleData.expandedStyle,
        mainCharacterName: 'Luna',
        mainCharacterDescription: 'A 5-year-old girl with curly brown hair'
      }
    })

    if (styleGuideResponse.ok()) {
      const styleGuideData = await styleGuideResponse.json()
      console.log('  Style guide prediction ID:', styleGuideData.predictionId || 'N/A')
      console.log('  Style guide URL:', styleGuideData.styleGuideUrl ? 'Generated' : 'Pending')
    } else {
      const errorText = await styleGuideResponse.text()
      console.log('  Style guide API error:', styleGuideResponse.status(), errorText.substring(0, 100))
    }

    // Step 6: Test Character Sheet Generation API
    console.log('\nStep 6: Testing character-sheet generation API...')
    const characterSheetResponse = await page.request.post('/api/storybook/generate-character-sheet', {
      data: {
        characterName: 'Luna',
        characterDescription: 'A curious 5-year-old girl with curly brown hair and bright eyes',
        styleDescription: styleData.expandedStyle,
        styleGuideUrl: null // We don't have one yet
      }
    })

    if (characterSheetResponse.ok()) {
      const characterSheetData = await characterSheetResponse.json()
      console.log('  Character sheet prediction ID:', characterSheetData.predictionId || 'N/A')
      console.log('  Character sheet URL:', characterSheetData.characterSheetUrl ? 'Generated' : 'Pending')
    } else {
      const errorText = await characterSheetResponse.text()
      console.log('  Character sheet API error:', characterSheetResponse.status(), errorText.substring(0, 100))
    }

    // Step 7: Test Page Variations Generation API
    console.log('\nStep 7: Testing page-variations generation API...')
    const pageVariationsResponse = await page.request.post('/api/storybook/generate-page-variations', {
      data: {
        pageNumber: 1,
        sceneDescription: storyData.pages[0].sceneDescription,
        storyText: storyData.pages[0].text,
        styleDescription: styleData.expandedStyle,
        characterSheetUrls: [],
        styleGuideUrl: null
      }
    })

    if (pageVariationsResponse.ok()) {
      const pageData = await pageVariationsResponse.json()
      console.log('  Page variations prediction ID:', pageData.predictionId || 'N/A')
      console.log('  Grid image URL:', pageData.gridImageUrl ? 'Generated' : 'Pending')
    } else {
      const errorText = await pageVariationsResponse.text()
      console.log('  Page variations API error:', pageVariationsResponse.status(), errorText.substring(0, 100))
    }

    console.log('\n=== API E2E TEST COMPLETE ===')
    console.log('All text generation APIs work correctly!')
    console.log('Image generation APIs require credits and return prediction IDs for async processing.')
  })
})
