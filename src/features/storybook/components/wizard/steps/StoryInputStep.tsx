"use client"

import { useState, useEffect } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, FileText, Sparkles, ChevronDown, ChevronUp, LayoutGrid } from "lucide-react"
import { cn } from "@/utils/utils"

export function StoryInputStep() {
  const { project, setStoryText, setPages, createProject } = useStorybookStore()
  const [title, setTitle] = useState(project?.title || "")
  const [storyText, setLocalStoryText] = useState(project?.storyText || "")
  const [pageCount, setPageCount] = useState<string>("auto")
  const [showPages, setShowPages] = useState(false)

  // Sync with project state
  useEffect(() => {
    if (project?.title) setTitle(project.title)
    if (project?.storyText) setLocalStoryText(project.storyText)
  }, [project?.title, project?.storyText])

  const handleTextChange = (text: string) => {
    setLocalStoryText(text)
    if (project) {
      setStoryText(text)
    }
  }

  // Smart page splitting that respects natural breaks
  const splitIntoPages = (text: string, targetPages: number | 'auto'): string[] => {
    // Clean up the text
    const cleanText = text.trim()

    // First, try to split by double newlines (explicit paragraph breaks)
    const paragraphs = cleanText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0)

    // If user selected auto and we have good paragraph breaks
    if (targetPages === 'auto') {
      if (paragraphs.length >= 3 && paragraphs.length <= 20) {
        return paragraphs
      }
      // Default to 8-12 pages for longer stories
      const wordCount = cleanText.split(/\s+/).length
      const targetCount = Math.min(12, Math.max(6, Math.ceil(wordCount / 50)))
      return splitTextEvenly(cleanText, targetCount)
    }

    // User specified a page count
    return splitTextEvenly(cleanText, targetPages)
  }

  // Split text evenly into N pages, trying to break at sentence boundaries
  const splitTextEvenly = (text: string, numPages: number): string[] => {
    // Split by sentences
    const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text]

    if (sentences.length <= numPages) {
      // If we have fewer sentences than pages, combine what we can
      return sentences.map(s => s.trim())
    }

    // Calculate target sentences per page
    const sentencesPerPage = Math.ceil(sentences.length / numPages)
    const pages: string[] = []

    for (let i = 0; i < numPages; i++) {
      const start = i * sentencesPerPage
      const end = Math.min(start + sentencesPerPage, sentences.length)
      const pageText = sentences.slice(start, end).join('').trim()
      if (pageText) {
        pages.push(pageText)
      }
    }

    return pages
  }

  const handleSplitPages = () => {
    // Create project if needed
    if (!project && storyText.trim()) {
      createProject(title || "Untitled Storybook", storyText)
    } else if (project) {
      setStoryText(storyText)
    }

    // Split into pages
    const targetPages = pageCount === 'auto' ? 'auto' : parseInt(pageCount, 10)
    const pageTexts = splitIntoPages(storyText, targetPages)

    // Create page objects
    const pages = pageTexts.map((text, index) => ({
      id: `page_${Date.now()}_${index}`,
      pageNumber: index + 1,
      text,
      textPosition: 'bottom' as const,
    }))

    // Small delay to ensure project is created
    setTimeout(() => {
      setPages(pages)
      setShowPages(true)
    }, 100)
  }

  const pages = project?.pages || []
  const wordCount = storyText.split(/\s+/).filter(w => w).length

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <BookOpen className="w-6 h-6 text-amber-400" />
          Write Your Story
        </h2>
        <p className="text-zinc-400">
          Paste your story below. Choose how many pages to split it into.
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
          className="min-h-[250px] bg-zinc-800/50 border-zinc-700 resize-none font-serif text-lg leading-relaxed"
        />
        <div className="flex justify-between items-center text-sm text-zinc-500">
          <span>{wordCount} words</span>
          <span>Tip: Add blank lines between paragraphs for better page breaks</span>
        </div>
      </div>

      {/* Page Count Selection */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-zinc-400" />
          <Label htmlFor="pageCount" className="text-zinc-300">Number of Pages:</Label>
        </div>
        <Select value={pageCount} onValueChange={setPageCount}>
          <SelectTrigger className="w-[140px] bg-zinc-800/50 border-zinc-700">
            <SelectValue placeholder="Select pages" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value="auto">Auto Detect</SelectItem>
            <SelectItem value="4">4 pages</SelectItem>
            <SelectItem value="6">6 pages</SelectItem>
            <SelectItem value="8">8 pages</SelectItem>
            <SelectItem value="10">10 pages</SelectItem>
            <SelectItem value="12">12 pages</SelectItem>
            <SelectItem value="16">16 pages</SelectItem>
            <SelectItem value="20">20 pages</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Split Pages Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSplitPages}
          disabled={!storyText.trim()}
          className="gap-2 bg-amber-500 hover:bg-amber-600 text-black"
        >
          <Sparkles className="w-4 h-4" />
          Split into Pages
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
