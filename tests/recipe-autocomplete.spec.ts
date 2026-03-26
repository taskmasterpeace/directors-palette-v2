import { test, expect } from '@playwright/test'

test.describe('Recipe field autocomplete', () => {
  test('Recipe name and text fields show @ autocomplete', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('text=Prompt', { timeout: 15000 })
    await page.waitForTimeout(3000)
    await page.setViewportSize({ width: 1400, height: 1000 })

    // Step 1: Click Recipes tab
    const recipesBtn = page.locator('button:has-text("Recipes")').nth(1)
    await recipesBtn.click()
    await page.waitForTimeout(1000)

    await page.screenshot({ path: 'tests/screenshots/rf-01-recipes.png' })

    // Step 2: List all recipe category buttons and click through them to find one with recipes
    const categoryChips = page.locator('button').filter({ hasText: /^(Consistency|Cinematic|Character|Lighting|Environment|Special|Moods|Camera|Art)/ })
    const chipCount = await categoryChips.count()
    console.log(`Found ${chipCount} category chips`)

    let foundRecipe = false
    for (let i = 0; i < chipCount && !foundRecipe; i++) {
      const chip = categoryChips.nth(i)
      const chipText = await chip.textContent()
      await chip.click()
      await page.waitForTimeout(500)

      // Check if "No prompts in this category" appears
      const noPrompts = page.locator('text=No prompts in this category')
      if (await noPrompts.isVisible({ timeout: 300 }).catch(() => false)) {
        console.log(`  ${chipText}: empty`)
        continue
      }

      // Look for recipe buttons in this category
      const recipeItems = await page.evaluate(() => {
        const items: string[] = []
        // Recipe items in the list — look for buttons with recipe-like text
        document.querySelectorAll('button').forEach(btn => {
          const rect = btn.getBoundingClientRect()
          const text = btn.textContent?.trim() || ''
          // Recipe items are typically in the lower portion of the panel
          if (rect.width > 100 && rect.y > 280 && rect.y < 600 && text.length > 5 && text.length < 100) {
            // Skip category chips themselves and UI buttons
            if (!text.includes('Prompts') && !text.includes('Recipes') && !text.includes('Generate')) {
              items.push(text.substring(0, 60))
            }
          }
        })
        return items
      })

      if (recipeItems.length > 0) {
        console.log(`  ${chipText}: ${recipeItems.length} recipes — ${recipeItems.join(', ')}`)
        foundRecipe = true
      } else {
        console.log(`  ${chipText}: no recipe items found`)
      }
    }

    // Step 3: If we didn't find recipes via categories, try "All" by clearing category filter
    if (!foundRecipe) {
      // Click the left arrow to go back/clear category
      const backArrow = page.locator('button:has(svg)').filter({ has: page.locator('[class*="chevron"], [class*="arrow"]') })
      // Or just click Recipes tab again to reset
      await recipesBtn.click()
      await page.waitForTimeout(500)
    }

    await page.screenshot({ path: 'tests/screenshots/rf-02-category-search.png' })

    // Step 4: Check if there's an active recipe already (maybe one is pre-selected)
    const recipeForm = page.locator('.rounded-xl.border').filter({ hasText: /Person|Name|Action|Outfit|Location/ })
    if (await recipeForm.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('Recipe form is visible with fields!')
    } else {
      // Try to find and click any recipe — look for the recipe header/switcher
      const recipeHeader = page.locator('button:has-text("Battle Rap"), button:has-text("Character Sheet"), button:has-text("Product Photography")')
      for (let i = 0; i < await recipeHeader.count(); i++) {
        const btn = recipeHeader.nth(i)
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          console.log('Clicking recipe:', await btn.textContent())
          await btn.click()
          await page.waitForTimeout(2000)
          break
        }
      }
    }

    await page.screenshot({ path: 'tests/screenshots/rf-03-recipe-form.png' })

    // Step 5: Analyze the recipe form fields
    const formInfo = await page.evaluate(() => {
      const info: string[] = []

      // Find the recipe form container (amber border)
      const forms = document.querySelectorAll('.rounded-xl')
      let recipeForm: Element | null = null
      forms.forEach(f => {
        if (f.className.includes('border-amber') || f.querySelector('[class*="bg-amber"]')) {
          recipeForm = f
        }
      })

      if (!recipeForm) {
        // Try broader search
        const amberHeaders = document.querySelectorAll('[class*="bg-amber"]')
        amberHeaders.forEach(h => {
          const parent = h.closest('.rounded-xl')
          if (parent) recipeForm = parent
        })
      }

      if (!recipeForm) {
        info.push('❌ No recipe form found')
        return info.join('\n')
      }

      info.push('✅ Recipe form found')

      // List all inputs
      const inputs = recipeForm.querySelectorAll('input[type="text"]')
      info.push(`Text inputs: ${inputs.length}`)
      inputs.forEach((el, i) => {
        const input = el as HTMLInputElement
        info.push(`  input ${i}: placeholder="${input.placeholder}" value="${input.value}"`)
      })

      // Textareas (RecipeTextField)
      const textareas = recipeForm.querySelectorAll('textarea')
      info.push(`Textareas: ${textareas.length}`)
      textareas.forEach((el, i) => {
        const ta = el as HTMLTextAreaElement
        info.push(`  textarea ${i}: placeholder="${ta.placeholder}"`)
      })

      // Labels
      const labels = recipeForm.querySelectorAll('label')
      info.push(`Labels: ${labels.length}`)
      labels.forEach((el, i) => {
        info.push(`  label ${i}: "${el.textContent?.trim()}"`)
      })

      // Select triggers
      const selects = recipeForm.querySelectorAll('[data-slot="select-trigger"]')
      info.push(`Select triggers: ${selects.length}`)

      return info.join('\n')
    })
    console.log('\n=== RECIPE FORM ===\n' + formInfo)

    // Step 6: Test @ autocomplete in recipe name input
    const recipeNameInput = page.locator('.rounded-xl input[type="text"]').first()
    if (await recipeNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('\n--- RECIPE NAME FIELD @ TEST ---')
      await recipeNameInput.scrollIntoViewIfNeeded()
      await recipeNameInput.click()
      await recipeNameInput.fill('@')
      await page.waitForTimeout(800)

      await page.screenshot({ path: 'tests/screenshots/rf-04-name-at.png' })

      // Check for autocomplete dropdown
      const nameDropdown = await page.evaluate(() => {
        // The name field autocomplete renders a div.absolute.z-50.bg-popover
        const dropdowns = document.querySelectorAll('.absolute.z-50, .bg-popover')
        const visible: string[] = []
        dropdowns.forEach(d => {
          const rect = (d as HTMLElement).getBoundingClientRect()
          if (rect.width > 20 && rect.height > 20) {
            const text = d.textContent?.trim().substring(0, 100) || ''
            if (text.includes('@') || text.includes('sasha') || text.includes('character')) {
              visible.push(`"${text.substring(0, 80)}" ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`)
            }
          }
        })
        return visible.length > 0 ? `✅ DROPDOWN: ${visible.join(' | ')}` : '❌ No dropdown'
      })
      console.log('Name field autocomplete:', nameDropdown)

      await recipeNameInput.fill('')
    } else {
      console.log('No recipe name input found')
    }

    // Step 7: Test @ in recipe text field (textarea inside recipe form)
    const recipeTextarea = page.locator('.rounded-xl textarea').first()
    if (await recipeTextarea.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('\n--- RECIPE TEXT FIELD @ TEST ---')
      await recipeTextarea.scrollIntoViewIfNeeded()
      await recipeTextarea.click()
      await recipeTextarea.pressSequentially('@', { delay: 100 })
      await page.waitForTimeout(800)

      await page.screenshot({ path: 'tests/screenshots/rf-05-text-at.png' })

      const textDropdown = await page.evaluate(() => {
        const options = document.querySelectorAll('[role="option"]')
        if (options.length > 0) {
          return '✅ OPTIONS: ' + Array.from(options).map(o => o.textContent?.trim()).join(', ')
        }
        // Check for visible dropdowns
        const dropdowns = document.querySelectorAll('.absolute')
        const visible: string[] = []
        dropdowns.forEach(d => {
          const rect = (d as HTMLElement).getBoundingClientRect()
          if (rect.width > 20 && rect.height > 20) {
            const text = d.textContent?.trim() || ''
            if (text.includes('@') || text.includes('people') || text.includes('places')) {
              visible.push(`"${text.substring(0, 80)}"`)
            }
          }
        })
        return visible.length > 0 ? `✅ DROPDOWNS: ${visible.join(' | ')}` : '❌ No dropdown'
      })
      console.log('Text field autocomplete:', textDropdown)

      await recipeTextarea.fill('')
    } else {
      console.log('No recipe textarea found')
    }

    await page.screenshot({ path: 'tests/screenshots/rf-06-final.png', fullPage: true })
    console.log('\n=== COMPLETE ===')
  })
})
