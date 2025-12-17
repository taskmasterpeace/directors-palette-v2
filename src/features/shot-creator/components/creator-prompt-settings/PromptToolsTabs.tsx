'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Shuffle, FlaskConical, Palette } from 'lucide-react'
import { PromptLibrary } from './PromptLibrary'
import { RecipeBuilder } from '../recipe/RecipeBuilder'
import { WildCardManager } from '../wildcard/WildCardManager'
import StyleSelector from './StyleSelector'
import { cn } from '@/utils/utils'
import { useRecipeStore } from '../../store/recipe.store'
import { useWildCardStore } from '../../store/wildcard.store'
import { usePromptLibraryStore } from '../../store/prompt-library-store'

interface PromptToolsTabsProps {
  onSelectPrompt: (prompt: string) => void
  onSelectRecipe: (recipeId: string) => void
  className?: string
}

export function PromptToolsTabs({
  onSelectPrompt,
  onSelectRecipe,
  className,
}: PromptToolsTabsProps) {
  const [activeTab, setActiveTab] = useState('library')

  const { recipes } = useRecipeStore()
  const { wildcards } = useWildCardStore()
  const { prompts } = usePromptLibraryStore()

  return (
    <div className={cn('border border-border rounded-lg bg-card/30', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 bg-card/50 rounded-t-lg rounded-b-none h-10">
          <TabsTrigger
            value="library"
            className="text-xs gap-1.5 data-[state=active]:bg-background"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Library</span>
            <Badge variant="secondary" className="h-4 px-1 text-[10px] hidden lg:inline-flex">
              {prompts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="wildcards"
            className="text-xs gap-1.5 data-[state=active]:bg-background"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Wildcards</span>
            <Badge variant="secondary" className="h-4 px-1 text-[10px] hidden lg:inline-flex">
              {wildcards.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="recipes"
            className="text-xs gap-1.5 data-[state=active]:bg-background"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Recipes</span>
            <Badge variant="secondary" className="h-4 px-1 text-[10px] hidden lg:inline-flex bg-amber-500/20 text-amber-400">
              {recipes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="styles"
            className="text-xs gap-1.5 data-[state=active]:bg-background"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Styles</span>
          </TabsTrigger>
        </TabsList>

        <div className="p-4">
          <TabsContent value="library" className="mt-0 h-[400px]">
            <PromptLibrary
              onSelectPrompt={onSelectPrompt}
              showQuickAccess={true}
              className="h-full"
            />
          </TabsContent>

          <TabsContent value="wildcards" className="mt-0 h-[400px]">
            <div className="h-full overflow-auto">
              <WildCardManager />
            </div>
          </TabsContent>

          <TabsContent value="recipes" className="mt-0 h-[400px]">
            <RecipeBuilder
              onSelectRecipe={onSelectRecipe}
              className="h-full"
            />
          </TabsContent>

          <TabsContent value="styles" className="mt-0 h-[400px]">
            <StylesTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

// Styles tab - shows style management
function StylesTab() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-white mb-1">Style Presets</h3>
        <p className="text-xs text-muted-foreground">
          Manage and create custom style presets for your generations
        </p>
      </div>

      <div className="flex-1">
        <StyleSelector />
      </div>

      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Coming Soon:</strong> Create custom styles with reference images
          and prompt templates. Style recipes will let you define consistent looks
          across all your generations.
        </p>
      </div>
    </div>
  )
}
