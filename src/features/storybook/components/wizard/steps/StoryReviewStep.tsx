"use client"

import { useState } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, ArrowRight, Edit2, Save, X, Users, MapPin, Lightbulb } from "lucide-react"
import { cn } from "@/utils/utils"

export function StoryReviewStep() {
  const { project, setGeneratedStory, updateProject, nextStep, previousStep } = useStorybookStore()

  const [editingPage, setEditingPage] = useState<number | null>(null)
  const [editText, setEditText] = useState("")

  const generatedStory = project?.generatedStory
  const extractedCharacters = project?.extractedCharacters || []
  const extractedLocations = project?.extractedLocations || []

  const handleEditPage = (pageNumber: number) => {
    const page = generatedStory?.pages.find(p => p.pageNumber === pageNumber)
    if (page) {
      setEditText(page.text)
      setEditingPage(pageNumber)
    }
  }

  const handleSaveEdit = () => {
    if (editingPage === null || !generatedStory) return

    const updatedPages = generatedStory.pages.map(p =>
      p.pageNumber === editingPage ? { ...p, text: editText } : p
    )

    // Update generatedStory with edited pages
    setGeneratedStory({
      ...generatedStory,
      pages: updatedPages
    })

    // SYNC storyText with edited pages
    const updatedStoryText = updatedPages.map(p => p.text).join('\n\n')
    updateProject({ storyText: updatedStoryText })

    setEditingPage(null)
    setEditText("")
  }

  const handleCancelEdit = () => {
    setEditingPage(null)
    setEditText("")
  }

  const handleContinue = () => {
    // Convert generated story to project pages and story text
    if (generatedStory) {
      // The store should handle this transition
      nextStep()
    }
  }

  if (!generatedStory) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-muted-foreground mb-4">No story generated yet.</p>
        <Button variant="ghost" onClick={previousStep}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Story Ideas
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-white mb-1">{generatedStory.title}</h2>
        <p className="text-muted-foreground text-sm">{generatedStory.summary}</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Story Pages */}
        <div className="flex-1 min-w-0">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              {generatedStory.pages.map((page) => (
                <Card
                  key={page.pageNumber}
                  className={cn(
                    "bg-zinc-900/50 border-zinc-800",
                    editingPage === page.pageNumber && "ring-2 ring-amber-500"
                  )}
                >
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-amber-400">
                        Page {page.pageNumber}
                      </CardTitle>
                      {editingPage !== page.pageNumber && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPage(page.pageNumber)}
                          className="h-7 text-xs text-muted-foreground hover:text-white"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    {editingPage === page.pageNumber ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[100px] bg-zinc-800 border-zinc-700"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="text-muted-foreground"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            className="bg-amber-500 hover:bg-amber-600 text-black"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-white text-sm leading-relaxed">{page.text}</p>
                        {page.learningNote && (
                          <div className="mt-3 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-amber-300">{page.learningNote}</p>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-zinc-500 mt-2 italic">
                          Scene: {page.sceneDescription}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Sidebar - Extracted Elements */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Characters */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Characters ({extractedCharacters.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              {extractedCharacters.length > 0 ? (
                <div className="space-y-3">
                  {extractedCharacters.map((char, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{char.name}</span>
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          char.role === "main" ? "border-amber-500 text-amber-400" : "border-zinc-600"
                        )}>
                          {char.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {char.description}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Pages: {char.appearances.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No characters extracted</p>
              )}
            </CardContent>
          </Card>

          {/* Locations */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                Locations ({extractedLocations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-4">
              {extractedLocations.length > 0 ? (
                <div className="space-y-3">
                  {extractedLocations.map((loc, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="font-medium text-white">{loc.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {loc.description}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Pages: {loc.appearances.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No locations extracted</p>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <div className="p-3 bg-zinc-800/50 rounded-lg text-xs text-muted-foreground">
            <p>Characters and locations will be used to create consistent reference images for your illustrations.</p>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={previousStep}
          className="text-muted-foreground hover:text-white gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Button
          onClick={handleContinue}
          className="bg-amber-500 hover:bg-amber-600 text-black gap-2"
        >
          Continue to Style Selection
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
