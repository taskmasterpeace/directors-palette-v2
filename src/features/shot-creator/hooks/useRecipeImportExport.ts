'use client'

import { useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useRecipeStore } from '../store/recipe.store'
import { recipeValidationService, RecipeExportData } from '../services/recipe-validation.service'
import { Recipe } from '../types/recipe.types'

// Export format excludes userId since recipes are user-specific
type ExportableRecipe = Omit<Recipe, 'userId'>
interface ExportData extends Omit<RecipeExportData, 'recipes'> { recipes: ExportableRecipe[] }

export function useRecipeImportExport() {
  const { toast } = useToast()
  const { recipes, addRecipe } = useRecipeStore()

  const exportRecipes = useCallback((recipesToExport?: Recipe[]) => {
    try {
      // Use provided recipes or fall back to all recipes from store
      const recipesForExport = recipesToExport ?? recipes
      // Exclude userId from exported recipes
      const exportableRecipes = recipesForExport.map(({ ...recipe }) => recipe)
      const exportData: ExportData = { version: '1.0', exportDate: new Date().toISOString(), recipes: exportableRecipes }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recipe-library-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Export Successful', description: `Exported ${recipesForExport.length} recipes` })
    } catch (_error) {
      toast({ title: 'Export Failed', description: 'Failed to export recipes', variant: 'destructive' })
    }
  }, [recipes, toast])

  const importRecipes = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Validate export data structure using validation service
      const exportValidation = recipeValidationService.validateExportData(data)
      if (!exportValidation.isValid) {
        throw new Error(exportValidation.errors[0])
      }

      const exportData = data as RecipeExportData
      let imported = 0
      let skipped = 0

      for (const recipe of exportData.recipes) {
        // Validate recipe using validation service
        const validationResult = recipeValidationService.validateRecipeForImport(recipe)
        if (!validationResult.isValid) {
          skipped++
          continue
        }

        // Check for duplicates using validation service
        const recipeObj = recipe as Record<string, unknown>
        const isDuplicate = recipeValidationService.hasDuplicateRecipe(
          recipes,
          recipeObj.name as string,
          recipeObj.categoryId as string | undefined
        )
        if (isDuplicate) {
          skipped++
          continue
        }

        // Sanitize and add recipe using store action
        try {
          const sanitizedRecipe = recipeValidationService.sanitizeRecipeForImport(recipeObj)
          const result = await addRecipe(sanitizedRecipe)
          if (result) {
            imported++
          } else {
            skipped++
          }
        } catch {
          skipped++
        }
      }

      const msg = skipped > 0
        ? `Imported ${imported}, skipped ${skipped}`
        : `Imported ${imported} recipes`
      toast({ title: 'Import Successful', description: msg })
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import recipes',
        variant: 'destructive'
      })
    }
  }, [recipes, addRecipe, toast])

  return { exportRecipes, importRecipes }
}
