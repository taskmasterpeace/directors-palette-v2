"use client"

import { useState, useEffect } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { BookOpen, FileText, Sparkles, ChevronDown, ChevronUp, LayoutGrid, Baby, Loader2 } from "lucide-react"
import { cn } from "@/utils/utils"
import { BOOK_FORMATS, type BookFormat } from "../../../types/storybook.types"
import Image from "next/image"

// Example images for each book format
const FORMAT_EXAMPLES: Record<BookFormat, string> = {
  square: '/storybook/format-examples/square.jpg',
  landscape: '/storybook/format-examples/landscape.jpg',
  portrait: '/storybook/format-examples/portrait.jpg',
  wide: '/storybook/format-examples/wide.jpg',
}

export function StoryInputStep() {
  const { project, setStoryText, setPages, createProject, addCharacter, setBookFormat: storeSetBookFormat } = useStorybookStore()
  const [title, setTitle] = useState(project?.title || "")
  const [storyText, setLocalStoryText] = useState(project?.storyText || "")
  const [pageCount, setPageCount] = useState<string>("auto")
  const [showPages, setShowPages] = useState(false)
  const [targetAge, setTargetAge] = useState(project?.targetAge || 7)
  const [bookFormat, setBookFormat] = useState<BookFormat>(project?.bookFormat || "square")
  const [keepExactWords, setKeepExactWords] = useState(false)
  const [isPolishing, setIsPolishing] = useState(false)
  const [polishError, setPolishError] = useState<string | null>(null)

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

  const handlePolishAndSplit = async () => {
    setPolishError(null)

    // Create project if needed
    if (!project && storyText.trim()) {
      createProject(title || "Untitled Storybook", storyText)
    } else if (project) {
      setStoryText(storyText)
    }

    const targetPages = pageCount === 'auto' ? 8 : parseInt(pageCount, 10)

    // If keeping exact words, use local splitting
    if (keepExactWords) {
      const pageTexts = splitIntoPages(storyText, pageCount === 'auto' ? 'auto' : targetPages)
      const pages = pageTexts.map((text, index) => ({
        id: `page_${Date.now()}_${index}`,
        pageNumber: index + 1,
        text,
        textPosition: 'bottom' as const,
      }))
      setTimeout(() => {
        setPages(pages)
        setShowPages(true)
      }, 100)
      return
    }

    // Use AI to polish and split
    setIsPolishing(true)
    try {
      const response = await fetch('/api/storybook/polish-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyText,
          targetAge,
          pageCount: targetPages,
          keepExactWords,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to polish story')
      }

      const result = await response.json()

      // Create page objects from polished text
      const pages = result.pages.map((text: string, index: number) => ({
        id: `page_${Date.now()}_${index}`,
        pageNumber: index + 1,
        text,
        textPosition: 'bottom' as const,
      }))

      // Add detected characters to the store
      if (result.mainCharacter) {
        addCharacter(result.mainCharacter.name, result.mainCharacter.tag)
      }
      if (result.supportingCharacters) {
        for (const char of result.supportingCharacters) {
          addCharacter(char.name, `@${char.name.toLowerCase().replace(/\s+/g, '_')}`)
        }
      }

      setTimeout(() => {
        setPages(pages)
        setShowPages(true)
      }, 100)
    } catch (error) {
      console.error('Error polishing story:', error)
      setPolishError(error instanceof Error ? error.message : 'Failed to polish story')
      // Fallback to local splitting
      const pageTexts = splitIntoPages(storyText, pageCount === 'auto' ? 'auto' : targetPages)
      const pages = pageTexts.map((text, index) => ({
        id: `page_${Date.now()}_${index}`,
        pageNumber: index + 1,
        text,
        textPosition: 'bottom' as const,
      }))
      setTimeout(() => {
        setPages(pages)
        setShowPages(true)
      }, 100)
    } finally {
      setIsPolishing(false)
    }
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

      {/* Book Format Selection */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300">Book Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(BOOK_FORMATS) as BookFormat[]).map((format) => {
              const config = BOOK_FORMATS[format]
              const isSelected = bookFormat === format
              return (
                <button
                  key={format}
                  onClick={() => {
                    setBookFormat(format)
                    if (project) storeSetBookFormat(format)
                  }}
                  className={cn(
                    "relative p-4 rounded-lg border-2 transition-all text-left",
                    isSelected
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500"
                  )}
                >
                  {/* Example Image Preview */}
                  <div className="flex justify-center mb-3">
                    <div
                      className={cn(
                        "relative rounded overflow-hidden border-2",
                        isSelected ? "border-amber-400" : "border-zinc-600"
                      )}
                      style={{
                        width: format === 'square' ? '64px' : format === 'portrait' ? '48px' : format === 'wide' ? '80px' : '72px',
                        height: format === 'square' ? '64px' : format === 'portrait' ? '64px' : format === 'wide' ? '45px' : '54px',
                      }}
                    >
                      <Image
                        src={FORMAT_EXAMPLES[format]}
                        alt={`${config.name} format example`}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={cn("font-medium text-sm", isSelected ? "text-amber-400" : "text-zinc-300")}>
                      {config.name}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{config.aspectRatio}</div>
                    <div className="text-xs text-zinc-500">{config.dimensions}</div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </button>
              )
            })}
          </div>
          {/* Format Info with Larger Preview */}
          <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg flex gap-4">
            {/* Larger Example Preview */}
            <div
              className="relative rounded-lg overflow-hidden border border-zinc-600 flex-shrink-0"
              style={{
                width: bookFormat === 'square' ? '120px' : bookFormat === 'portrait' ? '96px' : bookFormat === 'wide' ? '160px' : '144px',
                height: bookFormat === 'square' ? '120px' : bookFormat === 'portrait' ? '128px' : bookFormat === 'wide' ? '90px' : '108px',
              }}
            >
              <Image
                src={FORMAT_EXAMPLES[bookFormat]}
                alt={`${BOOK_FORMATS[bookFormat].name} format example`}
                fill
                className="object-cover"
                sizes="160px"
              />
            </div>
            {/* Format Description */}
            <div className="flex-1">
              <div className="text-sm text-zinc-300">
                <span className="font-medium text-amber-400">{BOOK_FORMATS[bookFormat].name}:</span> {BOOK_FORMATS[bookFormat].description}
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                <p><strong>Best for:</strong> {BOOK_FORMATS[bookFormat].bestFor}</p>
                <p><strong>Words per page:</strong> {BOOK_FORMATS[bookFormat].wordsPerPage.min}-{BOOK_FORMATS[bookFormat].wordsPerPage.max} recommended</p>
                <p><strong>Dimensions:</strong> {BOOK_FORMATS[bookFormat].dimensions}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhancement Options */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300">Story Enhancement Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Age Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-zinc-300">
                <Baby className="w-4 h-4 text-amber-400" />
                Target Age
              </Label>
              <span className="text-lg font-bold text-amber-400">{targetAge} years old</span>
            </div>
            <Slider
              value={[targetAge]}
              onValueChange={([value]) => setTargetAge(value)}
              min={3}
              max={12}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-500">
              <span>3 yrs (simple)</span>
              <span>12 yrs (advanced)</span>
            </div>
          </div>

          {/* Page Count Selection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-zinc-400" />
              <Label htmlFor="pageCount" className="text-zinc-300">Number of Pages</Label>
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

          {/* Keep Exact Words Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-zinc-300">Keep Exact Words</Label>
              <p className="text-xs text-zinc-500">
                {keepExactWords
                  ? "Story will be split as-is without vocabulary changes"
                  : "AI will adapt vocabulary for the target age"}
              </p>
            </div>
            <Switch
              checked={keepExactWords}
              onCheckedChange={setKeepExactWords}
            />
          </div>
        </CardContent>
      </Card>

      {/* Polish & Split Button */}
      <div className="flex flex-col items-center gap-2">
        <Button
          onClick={handlePolishAndSplit}
          disabled={!storyText.trim() || isPolishing}
          className="gap-2 bg-amber-500 hover:bg-amber-600 text-black"
        >
          {isPolishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Polishing Story...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {keepExactWords ? "Split into Pages" : "Polish & Split into Pages"}
            </>
          )}
        </Button>
        {polishError && (
          <p className="text-sm text-red-400">{polishError}</p>
        )}
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
