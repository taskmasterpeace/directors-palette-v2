"use client"

import { useState } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, ArrowRight, Sparkles, MapPin, X, Plus } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/utils/utils"
import {
  PAGE_COUNT_OPTIONS,
  SENTENCES_PER_PAGE_OPTIONS,
  getCategoryById,
  getTopicById,
  type PageCount,
  type SentencesPerPage
} from "../../../types/education.types"

// Preset story settings/locations
const PRESET_SETTINGS = [
  { id: 'park', name: 'Park', icon: '🌳' },
  { id: 'beach', name: 'Beach', icon: '🏖️' },
  { id: 'forest', name: 'Forest', icon: '🌲' },
  { id: 'city', name: 'City', icon: '🏙️' },
  { id: 'home', name: 'Home', icon: '🏠' },
  { id: 'school', name: 'School', icon: '🏫' },
  { id: 'space', name: 'Space', icon: '🚀' },
  { id: 'castle', name: 'Castle', icon: '🏰' },
  { id: 'underwater', name: 'Underwater', icon: '🐠' },
  { id: 'farm', name: 'Farm', icon: '🐄' },
]

// Quick-add story elements
const QUICK_ELEMENTS = [
  { id: 'dinosaurs', name: 'Dinosaurs', icon: '🦕' },
  { id: 'unicorns', name: 'Unicorns', icon: '🦄' },
  { id: 'robots', name: 'Robots', icon: '🤖' },
  { id: 'pirates', name: 'Pirates', icon: '🏴‍☠️' },
  { id: 'superheroes', name: 'Superheroes', icon: '🦸' },
  { id: 'fairies', name: 'Fairies', icon: '🧚' },
  { id: 'dragons', name: 'Dragons', icon: '🐉' },
  { id: 'animals', name: 'Animals', icon: '🐾' },
  { id: 'magic', name: 'Magic', icon: '✨' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
]

// Story theme quick-picks for custom stories
const STORY_THEMES = [
  { id: 'adventure', name: 'Adventure', icon: '🏔️', description: 'An exciting journey or quest' },
  { id: 'friendship', name: 'Friendship', icon: '🤝', description: 'Making or keeping friends' },
  { id: 'funny', name: 'Silly & Funny', icon: '😂', description: 'A hilarious, laugh-out-loud tale' },
  { id: 'magical', name: 'Magical', icon: '✨', description: 'Enchanted worlds and wonder' },
  { id: 'brave', name: 'Being Brave', icon: '🦁', description: 'Facing fears and challenges' },
  { id: 'hero', name: 'Everyday Hero', icon: '🦸', description: 'Helping others and saving the day' },
]

export function BookSettingsStep() {
  const { project, setBookSettings, setCustomization, setStoryIdeas, nextStep, previousStep, setStep } = useStorybookStore()

  const [pageCount, setPageCount] = useState<PageCount>((project?.pageCount as PageCount) || 8)
  const [sentencesPerPage, setSentencesPerPage] = useState<SentencesPerPage>((project?.sentencesPerPage as SentencesPerPage) || 3)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Customization state
  const [selectedSetting, setSelectedSetting] = useState<string | null>(project?.storySetting || null)
  const [customSetting, setCustomSetting] = useState(project?.customSetting || '')
  const [selectedElements, setSelectedElements] = useState<string[]>(project?.customElements || [])
  const [customNotes, setCustomNotes] = useState(project?.customNotes || '')
  const [showCustomSetting, setShowCustomSetting] = useState(false)

  // Custom story idea (for custom category)
  const [customStoryIdea, setCustomStoryIdea] = useState(project?.customNotes || '')
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)

  const toggleElement = (elementId: string) => {
    setSelectedElements(prev =>
      prev.includes(elementId)
        ? prev.filter(e => e !== elementId)
        : [...prev, elementId]
    )
  }

  const isCustomCategory = project?.educationCategory === 'custom'
  const category = project?.educationCategory ? getCategoryById(project.educationCategory) : null
  const topic = project?.educationCategory && project?.educationTopic
    ? getTopicById(project.educationCategory, project.educationTopic)
    : null

  const handleGenerateIdeas = async () => {
    // Validate required fields
    if (!project?.mainCharacterName) {
      setError("Missing character name")
      return
    }

    // For custom stories, require a story idea
    if (isCustomCategory && !customStoryIdea.trim()) {
      setError("Please describe what kind of story you'd like to create")
      return
    }

    // For educational stories, require category and topic
    if (!isCustomCategory && (!project?.educationCategory || !project?.educationTopic)) {
      setError("Missing category or topic information")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Save settings first
      setBookSettings(pageCount, sentencesPerPage)

      // Save customization options
      const finalSetting = showCustomSetting ? customSetting : selectedSetting

      // For custom stories, include the story idea in customNotes
      const finalNotes = isCustomCategory
        ? customStoryIdea.trim()
        : customNotes.trim()

      setCustomization(
        finalSetting || undefined,
        showCustomSetting ? customSetting : undefined,
        selectedElements.length > 0 ? selectedElements : undefined,
        finalNotes || undefined
      )

      // Build customization data for API
      const settingName = showCustomSetting
        ? customSetting
        : PRESET_SETTINGS.find(s => s.id === selectedSetting)?.name

      const elementNames = selectedElements.map(id =>
        QUICK_ELEMENTS.find(e => e.id === id)?.name || id
      )

      // Generate story ideas with customization
      const response = await fetch("/api/storybook/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName: project.mainCharacterName,
          characterAge: project.mainCharacterAge || 5,
          category: isCustomCategory ? 'custom' : project.educationCategory,
          topic: isCustomCategory ? 'custom' : project.educationTopic,
          // For custom stories, pass the story idea
          customStoryIdea: isCustomCategory ? customStoryIdea.trim() : undefined,
          // Also pass customization options
          setting: settingName,
          customElements: elementNames,
          customNotes: isCustomCategory ? undefined : customNotes.trim() || undefined,
          // Pass additional story characters (default to empty array)
          storyCharacters: project.storyCharacters || []
        })
      })

      if (!response.ok) {
        throw new Error("Failed to generate story ideas")
      }

      const data = await response.json()
      setStoryIdeas(data.ideas)
      nextStep()
    } catch (err) {
      console.error("Error generating ideas:", err)
      setError("Failed to generate story ideas. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const totalSentences = pageCount * sentencesPerPage
  const estimatedWordCount = totalSentences * 12 // ~12 words per sentence for children's books

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Configure Your Book</h2>
        <p className="text-muted-foreground">
          {isCustomCategory ? (
            <>✨ Custom Story - Tell us what kind of story you want!</>
          ) : (
            <>{category?.icon} {category?.name} → {topic?.icon} {topic?.name}</>
          )}
        </p>
      </div>

      {/* Settings Cards */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* Custom Story Idea (only for custom category) */}
        {isCustomCategory && (
          <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border-purple-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                What Kind of Story?
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Pick a theme or describe your own story idea
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Story Theme Quick-Picks */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {STORY_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      if (selectedTheme === theme.id) {
                        setSelectedTheme(null)
                        setCustomStoryIdea('')
                      } else {
                        setSelectedTheme(theme.id)
                        setCustomStoryIdea(`A ${theme.name.toLowerCase()} story: ${theme.description}`)
                      }
                    }}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-all hover:scale-[1.02]",
                      selectedTheme === theme.id
                        ? "bg-purple-500/30 border-purple-500 ring-2 ring-purple-500/50"
                        : "bg-zinc-800/50 border-zinc-700 hover:border-purple-500/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{theme.icon}</span>
                      <div>
                        <div className="font-medium text-white text-sm">{theme.name}</div>
                        <div className="text-xs text-muted-foreground">{theme.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Description */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-zinc-700" />
                  <span className="text-xs text-muted-foreground">or describe your own</span>
                  <div className="flex-1 h-px bg-zinc-700" />
                </div>
                <Textarea
                  placeholder={`Examples:\n• ${project?.mainCharacterName || 'Emma'} discovers they can talk to animals\n• A space journey to find a lost star\n• A mystery about a missing cookie`}
                  value={customStoryIdea}
                  onChange={(e) => {
                    setCustomStoryIdea(e.target.value)
                    // Clear theme selection if user types custom text
                    if (selectedTheme) {
                      const themeText = STORY_THEMES.find(t => t.id === selectedTheme)
                      if (themeText && !e.target.value.includes(themeText.description)) {
                        setSelectedTheme(null)
                      }
                    }
                  }}
                  className="bg-zinc-800/50 border-purple-700/50 min-h-[80px] text-white placeholder:text-zinc-500"
                />
              </div>

              {!customStoryIdea.trim() && !selectedTheme && (
                <p className="text-xs text-purple-400">
                  Select a theme above or describe your story idea
                </p>
              )}
            </CardContent>
          </Card>
        )}
        {/* Page Count - Compact inline */}
        <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <span className="text-sm font-medium text-white whitespace-nowrap">Pages:</span>
          <div className="flex gap-2 flex-1">
            {PAGE_COUNT_OPTIONS.map((count) => (
              <Button
                key={count}
                variant="outline"
                size="sm"
                onClick={() => setPageCount(count)}
                className={cn(
                  "flex-1 h-9 font-semibold transition-all",
                  pageCount === count
                    ? "bg-amber-500/20 border-amber-500 text-amber-400 hover:bg-amber-500/30"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                )}
              >
                {count}
              </Button>
            ))}
          </div>
        </div>

        {/* Sentences Per Page with Live Preview */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">Sentences Per Page</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click to see how each page will look
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {SENTENCES_PER_PAGE_OPTIONS.map((count) => (
                <Button
                  key={count}
                  variant="outline"
                  size="sm"
                  onClick={() => setSentencesPerPage(count)}
                  className={cn(
                    "flex-1 h-9 font-semibold transition-all",
                    sentencesPerPage === count
                      ? "bg-amber-500/20 border-amber-500 text-amber-400 hover:bg-amber-500/30"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  {count}
                </Button>
              ))}
            </div>

            {/* Live Sample Preview */}
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-amber-400">Sample Page Preview</span>
                <span className="text-xs text-muted-foreground">({sentencesPerPage} sentence{sentencesPerPage > 1 ? 's' : ''})</span>
              </div>
              <div className="text-sm text-zinc-300 leading-relaxed">
                {(() => {
                  const name = project?.mainCharacterName || 'Emma'
                  const sampleSentences = [
                    `${name} looked up at the sky.`,
                    `The stars were twinkling bright.`,
                    `"I wonder what's out there," ${name} said.`,
                    `A shooting star zoomed past!`,
                    `${name} made a special wish.`,
                    `It was the best night ever.`,
                  ]
                  return sampleSentences.slice(0, sentencesPerPage).join(' ')
                })()}
              </div>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>← Simple (ages 2-4)</span>
              <span>Dense (ages 6+) →</span>
            </div>
          </CardContent>
        </Card>

        {/* Story Setting (Location) */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-400" />
              Story Setting
            </CardTitle>
            <p className="text-sm text-muted-foreground">Where does the story take place? (Optional)</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {PRESET_SETTINGS.map((setting) => (
                <Button
                  key={setting.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSetting(setting.id === selectedSetting ? null : setting.id)
                    setShowCustomSetting(false)
                  }}
                  className={cn(
                    "transition-all",
                    selectedSetting === setting.id && !showCustomSetting
                      ? "bg-amber-500/20 border-amber-500 text-amber-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  <span className="mr-1">{setting.icon}</span>
                  {setting.name}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCustomSetting(true)
                  setSelectedSetting(null)
                }}
                className={cn(
                  "transition-all",
                  showCustomSetting
                    ? "bg-amber-500/20 border-amber-500 text-amber-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                )}
              >
                <Plus className="w-4 h-4 mr-1" />
                Custom
              </Button>
            </div>
            {showCustomSetting && (
              <div className="mt-3">
                <Input
                  placeholder="e.g., A magical treehouse, A cozy mountain cabin..."
                  value={customSetting}
                  onChange={(e) => setCustomSetting(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Story Elements */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Story Includes
            </CardTitle>
            <p className="text-sm text-muted-foreground">Add fun elements to your story (Optional)</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {QUICK_ELEMENTS.map((element) => (
                <Button
                  key={element.id}
                  variant="outline"
                  size="sm"
                  onClick={() => toggleElement(element.id)}
                  className={cn(
                    "transition-all",
                    selectedElements.includes(element.id)
                      ? "bg-amber-500/20 border-amber-500 text-amber-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  <span className="mr-1">{element.icon}</span>
                  {element.name}
                  {selectedElements.includes(element.id) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Button>
              ))}
            </div>
            <div className="mt-4">
              <Textarea
                placeholder="Any other special requests? (e.g., 'Include a talking cat named Whiskers', 'Make it about their first day of school')"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 min-h-[60px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview Summary */}
        <Card className={cn(
          "border",
          isCustomCategory
            ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20"
            : "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20"
        )}>
          <CardContent className="p-6">
            <h3 className="font-semibold text-white mb-3">Book Preview</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Character</p>
                <p className="text-white font-medium">
                  {project?.mainCharacterName}, {project?.mainCharacterAge} years old
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{isCustomCategory ? 'Story Type' : 'Learning'}</p>
                <p className="text-white font-medium">
                  {isCustomCategory ? 'Custom Story' : topic?.name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Pages</p>
                <p className={cn("font-medium", isCustomCategory ? "text-purple-400" : "text-amber-400")}>
                  {pageCount} pages
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Words</p>
                <p className={cn("font-medium", isCustomCategory ? "text-purple-400" : "text-amber-400")}>
                  ~{estimatedWordCount} words
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-zinc-900/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {isCustomCategory ? (
                  customStoryIdea.trim() ? (
                    <>A custom story for {project?.mainCharacterName} - {pageCount} pages with {sentencesPerPage} sentence{sentencesPerPage > 1 ? "s" : ""} per page.</>
                  ) : (
                    <>Describe your story idea above to create a custom story for {project?.mainCharacterName}.</>
                  )
                ) : (
                  <>{project?.mainCharacterName} will learn about {topic?.name?.toLowerCase()} in a {pageCount}-page story with {sentencesPerPage} sentence{sentencesPerPage > 1 ? "s" : ""} per page.</>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            // For custom stories, go back to category selection (skip topic)
            if (isCustomCategory) {
              setStep('category')
            } else {
              previousStep()
            }
          }}
          disabled={isGenerating}
          className="text-muted-foreground hover:text-white gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Button
          onClick={handleGenerateIdeas}
          disabled={isGenerating || (isCustomCategory && !customStoryIdea.trim())}
          className={cn(
            "gap-2 px-6 text-black",
            isCustomCategory
              ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          )}
        >
          {isGenerating ? (
            <>
              <LoadingSpinner size="sm" color="current" />
              Generating Ideas...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate 4 Story Ideas
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
