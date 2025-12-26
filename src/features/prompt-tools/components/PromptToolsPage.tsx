'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Shuffle, FlaskConical, Palette } from 'lucide-react'
import { PromptLibrary } from '@/features/shot-creator/components/creator-prompt-settings/PromptLibrary'
import { RecipeBuilder } from '@/features/shot-creator/components/recipe/RecipeBuilder'
import { WildCardManager } from '@/features/shot-creator/components/wildcard/WildCardManager'
import StyleSelector from '@/features/shot-creator/components/creator-prompt-settings/StyleSelector'
import { useRecipeStore } from '@/features/shot-creator/store/recipe.store'
import { useWildCardStore } from '@/features/shot-creator/store/wildcard.store'
import { usePromptLibraryStore } from '@/features/shot-creator/store/prompt-library-store'
import { useShotCreatorStore } from '@/features/shot-creator/store/shot-creator.store'

export function PromptToolsPage() {
  const [activeTab, setActiveTab] = useState('recipes')
  const { setShotCreatorPrompt } = useShotCreatorStore()

  const { recipes } = useRecipeStore()
  const { wildcards } = useWildCardStore()
  const { prompts } = usePromptLibraryStore()

  // Handle selecting a prompt
  const handleSelectPrompt = (prompt: string) => {
    setShotCreatorPrompt(prompt)
  }

  // Handle selecting a recipe (just logs for now, actual use is in Shot Creator)
  const handleSelectRecipe = (recipeId: string) => {
    console.log('Recipe selected:', recipeId)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex-1 p-4 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-full grid grid-cols-4 bg-card/50 h-10 mb-4">
            <TabsTrigger
              value="recipes"
              className="text-xs gap-1.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Recipes</span>
              <Badge variant="secondary" className="h-4 px-1 text-[10px] hidden lg:inline-flex bg-amber-500/20 text-amber-400">
                {recipes.length}
              </Badge>
            </TabsTrigger>
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
              value="styles"
              className="text-xs gap-1.5 data-[state=active]:bg-background"
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Styles</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="recipes" className="h-full mt-0">
              <div className="h-full bg-card/30 rounded-lg border border-border p-4 overflow-auto">
                <RecipeBuilder onSelectRecipe={handleSelectRecipe} className="h-full" />
              </div>
            </TabsContent>

            <TabsContent value="library" className="h-full mt-0">
              <div className="h-full bg-card/30 rounded-lg border border-border p-4 overflow-auto">
                <PromptLibrary
                  onSelectPrompt={handleSelectPrompt}
                  showQuickAccess={true}
                  className="h-full"
                />
              </div>
            </TabsContent>

            <TabsContent value="wildcards" className="h-full mt-0">
              <div className="h-full bg-card/30 rounded-lg border border-border p-4 overflow-auto">
                <WildCardManager />
              </div>
            </TabsContent>

            <TabsContent value="styles" className="h-full mt-0">
              <div className="h-full bg-card/30 rounded-lg border border-border p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-white mb-1">Style Presets</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage and create custom style presets for your generations
                  </p>
                </div>
                <StyleSelector />
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    <strong>Coming Soon:</strong> Create custom styles with reference images
                    and prompt templates. Style recipes will let you define consistent looks
                    across all your generations.
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
