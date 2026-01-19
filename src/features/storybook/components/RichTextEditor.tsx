"use client"

import { useRef, useEffect, useState } from 'react'
import { Bold, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string, plainText: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter your story text...',
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  // Initialize content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const handleInput = () => {
    if (!editorRef.current) return

    const html = editorRef.current.innerHTML
    const plainText = editorRef.current.innerText || ''

    onChange(html, plainText)
  }

  const formatBold = () => {
    document.execCommand('bold', false)
    editorRef.current?.focus()
    handleInput()
  }

  const formatColor = (color: string) => {
    document.execCommand('foreColor', false, color)
    editorRef.current?.focus()
    handleInput()
  }

  const formatFont = (fontFamily: string) => {
    document.execCommand('fontName', false, fontFamily)
    editorRef.current?.focus()
    handleInput()
  }

  const colors = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Pink', value: '#ec4899' },
  ]

  const fonts = [
    { name: 'Default', value: 'ui-sans-serif, system-ui' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Comic Sans', value: 'Comic Sans MS, cursive' },
    { name: 'Courier', value: 'Courier New, monospace' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Times', value: 'Times New Roman, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Pacifico', value: 'Pacifico, cursive' },
    { name: 'Marker', value: 'Permanent Marker, cursive' },
  ]

  return (
    <div className={cn('border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-zinc-700 bg-zinc-900/50 flex-wrap">
        {/* Bold Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={formatBold}
          className="gap-1 h-8"
          title="Bold (Ctrl+B)"
          type="button"
        >
          <Bold className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Bold</span>
        </Button>

        {/* Font Selector */}
        <select
          onChange={(e) => formatFont(e.target.value)}
          className="text-xs bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1.5 h-8 min-w-[120px]"
          title="Font Family"
        >
          {fonts.map((font) => (
            <option key={font.value} value={font.value}>
              {font.name}
            </option>
          ))}
        </select>

        {/* Color Label */}
        <div className="flex items-center gap-1.5 ml-2">
          <Type className="w-4 h-4 text-zinc-400" />
          <span className="text-xs text-zinc-400 hidden sm:inline">Color:</span>
        </div>

        {/* Color Picker */}
        <div className="flex gap-1.5">
          {colors.map((color) => (
            <button
              key={color.value}
              onClick={() => formatColor(color.value)}
              className="w-7 h-7 rounded border-2 border-zinc-700 hover:scale-110 hover:border-zinc-500 transition-all"
              style={{ backgroundColor: color.value }}
              title={color.name}
              type="button"
            />
          ))}
        </div>
      </div>

      {/* Content Editable Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 text-white outline-none focus:bg-zinc-900/50"
          suppressContentEditableWarning
        />

        {/* Placeholder */}
        {!value && !isFocused && (
          <div className="absolute top-4 left-4 text-zinc-500 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-800 bg-zinc-900/30">
        Select text to format • Bold: Ctrl+B • Plain text preserved for narration
      </div>
    </div>
  )
}
