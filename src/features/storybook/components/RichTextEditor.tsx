"use client"

import { useEffect } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary'
import { $getRoot, $getSelection, EditorState, LexicalEditor } from 'lexical'
import { $isRangeSelection } from 'lexical'
import { $patchStyleText } from '@lexical/selection'
import { Bold, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/utils'

// Editor theme configuration
const theme = {
  paragraph: 'mb-2',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
}

// Toolbar component
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()

  const formatBold = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, {
          'font-weight': selection.hasFormat('bold') ? 'normal' : 'bold',
        })
      }
    })
  }

  const formatColor = (color: string) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color })
      }
    })
  }

  const formatFont = (fontFamily: string) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'font-family': fontFamily })
      }
    })
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
    'Arial',
    'Comic Sans MS',
    'Courier New',
    'Georgia',
    'Times New Roman',
    'Verdana',
    'Pacifico',
    'Permanent Marker',
  ]

  return (
    <div className="flex items-center gap-2 p-2 border-b border-zinc-700 bg-zinc-900/50 flex-wrap">
      {/* Bold Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={formatBold}
        className="gap-1"
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
        <span className="hidden sm:inline">Bold</span>
      </Button>

      {/* Font Selector */}
      <select
        onChange={(e) => formatFont(e.target.value)}
        className="text-sm bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1"
        title="Font Family"
      >
        <option value="">Default Font</option>
        {fonts.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>

      {/* Color Picker */}
      <div className="flex items-center gap-1">
        <Type className="w-4 h-4 text-zinc-400" />
        <div className="flex gap-1">
          {colors.map((color) => (
            <button
              key={color.value}
              onClick={() => formatColor(color.value)}
              className="w-6 h-6 rounded border border-zinc-700 hover:scale-110 transition-transform"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Plugin to initialize content
function InitialContentPlugin({ initialContent }: { initialContent: string }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (initialContent) {
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        const paragraph = root.getFirstChild()
        if (paragraph) {
          // Parse HTML and insert
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = initialContent
          paragraph.append(tempDiv.textContent || '')
        }
      })
    }
  }, [editor, initialContent])

  return null
}

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
  const initialConfig = {
    namespace: 'StoryPageEditor',
    theme,
    onError: (error: Error) => {
      console.error('Lexical Error:', error)
    },
  }

  const handleChange = (editorState: EditorState, editor: LexicalEditor) => {
    editorState.read(() => {
      const root = $getRoot()
      const plainText = root.getTextContent()

      // Generate HTML with inline styles
      let html = ''
      root.getChildren().forEach((child) => {
        const childText = child.getTextContent()
        html += `<p>${childText}</p>`
      })

      onChange(html, plainText)
    })
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn('border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900', className)}>
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[200px] p-4 text-white outline-none" />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-zinc-500 pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <OnChangePlugin onChange={handleChange} />
        <InitialContentPlugin initialContent={value} />
      </div>
    </LexicalComposer>
  )
}
