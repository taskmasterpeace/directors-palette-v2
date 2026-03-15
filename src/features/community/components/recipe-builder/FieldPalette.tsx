'use client'

import { useState } from 'react'
import { Type, ListOrdered, Dices, User } from 'lucide-react'
import { cn } from '@/utils/utils'
import { WildcardFieldPicker } from './WildcardFieldPicker'

type FieldPaletteAction =
  | { type: 'text'; label: string }
  | { type: 'select'; label: string; options: string[] }
  | { type: 'wildcard'; label: string; wildcardName: string; mode: 'browse' | 'random' }
  | { type: 'name'; label: string }

interface FieldPaletteProps {
  onInsertField: (templateSnippet: string) => void
  className?: string
}

export function FieldPalette({ onInsertField, className }: FieldPaletteProps) {
  const [activePanel, setActivePanel] = useState<'none' | 'text' | 'select' | 'wildcard' | 'name'>('none')
  const [textLabel, setTextLabel] = useState('')
  const [nameLabel, setNameLabel] = useState('')
  const [selectLabel, setSelectLabel] = useState('')
  const [selectOptions, setSelectOptions] = useState('')

  const insertField = (action: FieldPaletteAction) => {
    const fieldName = action.label.toUpperCase().replace(/\s+/g, '_')
    let snippet = ''

    switch (action.type) {
      case 'text':
        snippet = `<<${fieldName}:text>>`
        break
      case 'select':
        snippet = `<<${fieldName}:select(${action.options.join(',')})>>`
        break
      case 'wildcard':
        snippet = `<<${fieldName}:wildcard(${action.wildcardName}, ${action.mode})>>`
        break
      case 'name':
        snippet = `<<${fieldName}:name>>`
        break
    }

    onInsertField(snippet)
    setActivePanel('none')
    setTextLabel('')
    setNameLabel('')
    setSelectLabel('')
    setSelectOptions('')
  }

  const buttons = [
    { id: 'text' as const, icon: Type, label: 'Text Input', desc: 'Free-form text field' },
    { id: 'select' as const, icon: ListOrdered, label: 'Multiple Choice', desc: 'Dropdown with options' },
    { id: 'wildcard' as const, icon: Dices, label: 'Wildcard', desc: 'Connect to a wildcard list' },
    { id: 'name' as const, icon: User, label: 'Character Ref', desc: 'Link a character' },
  ]

  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
        Add Field
      </div>

      {activePanel === 'none' && (
        <div className="grid grid-cols-2 gap-1">
          {buttons.map(btn => (
            <button
              key={btn.id}
              onClick={() => setActivePanel(btn.id)}
              className="flex items-center gap-2 rounded-md border border-border/30 px-2 py-2 text-left hover:border-amber-500/30 transition-colors"
            >
              <btn.icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div>
                <div className="text-[11px] font-medium text-foreground">{btn.label}</div>
                <div className="text-[9px] text-muted-foreground/50">{btn.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {activePanel === 'text' && (
        <div className="space-y-2">
          <input
            type="text"
            value={textLabel}
            onChange={(e) => setTextLabel(e.target.value)}
            placeholder="Field label (e.g. Story)"
            className="w-full h-8 px-2 text-sm bg-card border border-border rounded-md"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => setActivePanel('none')} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            <button
              onClick={() => textLabel.trim() && insertField({ type: 'text', label: textLabel.trim() })}
              disabled={!textLabel.trim()}
              className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50"
            >
              Insert
            </button>
          </div>
        </div>
      )}

      {activePanel === 'name' && (
        <div className="space-y-2">
          <input
            type="text"
            value={nameLabel}
            onChange={(e) => setNameLabel(e.target.value)}
            placeholder="Field label (e.g. Character Name)"
            className="w-full h-8 px-2 text-sm bg-card border border-border rounded-md"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => setActivePanel('none')} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            <button
              onClick={() => nameLabel.trim() && insertField({ type: 'name', label: nameLabel.trim() })}
              disabled={!nameLabel.trim()}
              className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50"
            >
              Insert
            </button>
          </div>
        </div>
      )}

      {activePanel === 'select' && (
        <div className="space-y-2">
          <input
            type="text"
            value={selectLabel}
            onChange={(e) => setSelectLabel(e.target.value)}
            placeholder="Field label (e.g. Style)"
            className="w-full h-8 px-2 text-sm bg-card border border-border rounded-md"
            autoFocus
          />
          <textarea
            value={selectOptions}
            onChange={(e) => setSelectOptions(e.target.value)}
            placeholder="Options (one per line)"
            className="w-full h-20 px-2 py-1 text-sm bg-card border border-border rounded-md resize-y"
          />
          <div className="flex gap-2">
            <button onClick={() => setActivePanel('none')} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            <button
              onClick={() => {
                const opts = selectOptions.split('\n').map(o => o.trim()).filter(Boolean)
                if (selectLabel.trim() && opts.length > 0) {
                  insertField({ type: 'select', label: selectLabel.trim(), options: opts })
                }
              }}
              disabled={!selectLabel.trim() || !selectOptions.trim()}
              className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50"
            >
              Insert
            </button>
          </div>
        </div>
      )}

      {activePanel === 'wildcard' && (
        <WildcardFieldPicker
          onSelect={(wildcardName, mode, label) => {
            insertField({ type: 'wildcard', label, wildcardName, mode })
          }}
          onCancel={() => setActivePanel('none')}
        />
      )}
    </div>
  )
}
