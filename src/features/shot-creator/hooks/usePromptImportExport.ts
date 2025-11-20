'use client'

import { useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { usePromptLibraryStore, SavedPrompt } from '../store/prompt-library-store'
import { promptLibraryService } from '../services/prompt-library.service'

interface ExportData { version: string; exportDate: string; prompts: Array<Omit<SavedPrompt, 'userId'>> }

export function usePromptImportExport() {
  const { toast } = useToast()
  const { prompts, addPrompt } = usePromptLibraryStore()

  const exportPrompts = useCallback(() => {
    try {
      const exportData: ExportData = { version: '1.0', exportDate: new Date().toISOString(), prompts: prompts.map(({ userId, ...rest }) => rest) }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prompt-library-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Export Successful', description: `Exported ${prompts.length} prompts` })
    } catch (_error) {
      toast({ title: 'Export Failed', description: 'Failed to export prompts', variant: 'destructive' })
    }
  }, [prompts, toast])

  const importPrompts = useCallback(async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as ExportData
      if (!data.prompts || !Array.isArray(data.prompts)) throw new Error('Invalid format')

      let imported = 0, skipped = 0
      for (const p of data.prompts) {
        const valid = promptLibraryService.validatePrompt(p.prompt, p.title)
        if (!valid.isValid || promptLibraryService.hasDuplicate(prompts, p.title, p.categoryId)) { skipped++; continue }
        try {
          await addPrompt({ ...p, tags: p.tags || [] })
          imported++
        } catch { skipped++ }
      }
      const msg = skipped > 0 ? `Imported ${imported}, skipped ${skipped}` : `Imported ${imported} prompts`
      toast({ title: 'Import Successful', description: msg })
    } catch (error) {
      toast({ title: 'Import Failed', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' })
    }
  }, [prompts, addPrompt, toast])

  return { exportPrompts, importPrompts }
}
