"use client"

import { useState } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, FileText, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/utils/utils"

export function StoryInputStep() {
  const { project, setStoryText, detectPages, createProject } = useStorybookStore()
  const [title, setTitle] = useState(project?.title || "")
  const [storyText, setLocalStoryText] = useState(project?.storyText || "")
  const [showPages, setShowPages] = useState(false)

  const handleTextChange = (text: string) => {
    setLocalStoryText(text)
    if (project) {
      setStoryText(text)
    }
  }

  const handleDetectPages = () => {
    if (!project && storyText.trim()) {
      createProject(title || "Untitled Storybook", storyText)
    } else if (project) {
      setStoryText(storyText)
    }
    // Small delay to ensure state is updated
    setTimeout(() => {
      detectPages()
      setShowPages(true)
    }, 100)
  }

  const pages = project?.pages || []

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <BookOpen className="w-6 h-6 text-amber-400" />
          Write Your Story
        </h2>
        <p className="text-zinc-400">
          Paste your story or write it here. We&apos;ll automatically detect page breaks.
        </p>
      </div>

      {/* Title Input */}
      <div className="space-y-2">
        <Label htmlFor="title">Book Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter your book title..."
          className="bg-zinc-800/50 border-zinc-700"
        />
      </div>

      {/* Story Text Area */}
      <div className="space-y-2">
        <Label htmlFor="story" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Story Text
        </Label>
        <Textarea
          id="story"
          value={storyText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Once upon a time..."
          className="min-h-[300px] bg-zinc-800/50 border-zinc-700 resize-none font-serif text-lg leading-relaxed"
        />
        <div className="flex justify-between items-center text-sm text-zinc-500">
          <span>{storyText.split(/\s+/).filter(w => w).length} words</span>
          <span>Use @CharacterName to tag characters (e.g., @Maya, @Jake)</span>
        </div>
      </div>

      {/* Detect Pages Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleDetectPages}
          disabled={!storyText.trim()}
          className="gap-2 bg-amber-500 hover:bg-amber-600 text-black"
        >
          <Sparkles className="w-4 h-4" />
          Detect Pages
        </Button>
      </div>

      {/* Pages Preview */}
      {pages.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowPages(!showPages)}
          >
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                {pages.length} Pages Detected
              </span>
              {showPages ? (
                <ChevronUp className="w-5 h-5 text-zinc-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-500" />
              )}
            </CardTitle>
          </CardHeader>
          {showPages && (
            <CardContent className="space-y-3">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className={cn(
                    "p-3 rounded-lg bg-zinc-800/50 border border-zinc-700",
                    "hover:border-amber-500/50 transition-colors"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                      Page {index + 1}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {page.text.split(/\s+/).length} words
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-3">
                    {page.text}
                  </p>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
