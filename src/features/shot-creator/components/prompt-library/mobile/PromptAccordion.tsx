'use client'

import { SavedPrompt, PromptCategory } from '@/features/shot-creator/store/prompt-library-store'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { MobilePromptCard } from './MobilePromptCard'

interface PromptAccordionProps {
  categories: PromptCategory[]
  getPromptsByCategory: (categoryId: string) => SavedPrompt[]
  onToggleQuickAccess: (id: string) => void
  onDeletePrompt: (id: string) => void
  onUsePrompt: (prompt: SavedPrompt) => void
}

export function PromptAccordion({
  categories,
  getPromptsByCategory,
  onToggleQuickAccess,
  onDeletePrompt,
  onUsePrompt
}: PromptAccordionProps) {
  return (
    <Accordion type="single" collapsible className="space-y-2">
      {categories.map((category) => {
        const categoryPrompts = getPromptsByCategory(category.id)
        const promptCount = categoryPrompts.length

        return (
          <AccordionItem
            key={category.id}
            value={category.id}
            className="bg-slate-900 border-slate-700 rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 hover:bg-slate-800 sticky top-0 z-10 bg-slate-900 border-b border-slate-700">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{category.icon}</span>
                  <div className="text-left">
                    <h3 className="font-medium text-white">{category.name}</h3>
                    <p className="text-xs text-slate-400">
                      {promptCount} {promptCount === 1 ? 'prompt' : 'prompts'}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-slate-800 text-slate-300 min-w-[40px] justify-center"
                >
                  {promptCount}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-3">
                {categoryPrompts.length > 0 ? (
                  categoryPrompts.map((prompt) => (
                    <MobilePromptCard
                      key={prompt.id}
                      prompt={prompt}
                      categoryName={category.name}
                      onToggleQuickAccess={onToggleQuickAccess}
                      onDelete={onDeletePrompt}
                      onUsePrompt={onUsePrompt}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    No prompts in this category yet
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
