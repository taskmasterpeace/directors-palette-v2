// Run with: npx tsx scripts/export-recipes-json.ts
import { SAMPLE_RECIPES } from '../src/features/shot-creator/constants/recipe-samples'
import { writeFileSync, mkdirSync } from 'fs'

mkdirSync('scripts/data', { recursive: true })
writeFileSync(
  'scripts/data/sample-recipes.json',
  JSON.stringify(SAMPLE_RECIPES, null, 2)
)
console.log(`Exported ${SAMPLE_RECIPES.length} recipes to scripts/data/sample-recipes.json`)
