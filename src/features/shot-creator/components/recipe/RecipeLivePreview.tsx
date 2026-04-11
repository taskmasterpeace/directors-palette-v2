'use client'

import { useState, useMemo } from 'react'
import { FlaskConical } from 'lucide-react'
import type { RecipeStage } from '../../types/recipe-stage.types'
import type { RecipeFieldValues } from '../../types/recipe-field.types'
import { parseStageTemplate, buildRecipePrompts } from '../../types/recipe-utils'

interface RecipeLivePreviewProps {
  stages: RecipeStage[]
  recipeName: string
}

export function RecipeLivePreview({ stages, recipeName }: RecipeLivePreviewProps) {
  const [testValues, setTestValues] = useState<RecipeFieldValues>({})

  // Parse and deduplicate fields from all stage templates
  const allFields = useMemo(() => {
    const parsed = stages.flatMap((stage, i) =>
      parseStageTemplate(stage.template, i)
    )
    const uniqueByName = new Map<string, (typeof parsed)[0]>()
    for (const field of parsed) {
      const existing = uniqueByName.get(field.name)
      if (existing) {
        if (field.required && !existing.required) {
          uniqueByName.set(field.name, { ...existing, required: true })
        }
      } else {
        uniqueByName.set(field.name, field)
      }
    }
    return Array.from(uniqueByName.values())
  }, [stages])

  const requiredFields = allFields.filter(f => f.required)
  const optionalFields = allFields.filter(f => !f.required)

  // Build assembled prompt preview
  const assembledPrompt = useMemo(() => {
    try {
      const stagesWithFields = stages.map((stage, i) => ({
        ...stage,
        fields: parseStageTemplate(stage.template, i),
      }))
      const result = buildRecipePrompts(stagesWithFields, testValues)
      return result.prompts.filter(p => p.trim()).join('\n\n--- Stage Break ---\n\n')
    } catch {
      return '(Error assembling prompt — check template syntax)'
    }
  }, [stages, testValues])

  const handleChange = (fieldId: string, value: string) => {
    setTestValues(prev => ({ ...prev, [fieldId]: value }))
  }

  // Empty state
  if (allFields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
        <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
          <FlaskConical className="w-6 h-6 text-cyan-400" />
        </div>
        <p className="text-sm text-muted-foreground">No fields detected</p>
        <p className="text-xs text-muted-foreground/70 max-w-[240px]">
          Add <code className="text-cyan-400 bg-cyan-500/10 px-1 rounded text-[10px]">{'<<FIELD:type>>'}</code> tokens
          to your template to create interactive form fields.
        </p>
      </div>
    )
  }

  const renderField = (field: (typeof allFields)[0]) => {
    const typeBadge = (
      <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono">
        {field.type}
      </span>
    )

    return (
      <div key={field.id} className="space-y-1">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">
            {field.label}
            {field.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          {typeBadge}
        </div>

        {field.type === 'select' ? (
          <select
            className="w-full bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50 transition-colors"
            value={testValues[field.id] || ''}
            onChange={e => handleChange(field.id, e.target.value)}
          >
            <option value="">Select...</option>
            {field.options?.map((opt, i) => {
              const isHeader = opt.startsWith('---') && opt.endsWith('---')
              if (isHeader) {
                return (
                  <option key={i} disabled className="text-muted-foreground font-semibold">
                    {opt.replace(/---/g, '').trim()}
                  </option>
                )
              }
              return (
                <option key={i} value={opt}>
                  {opt}
                </option>
              )
            })}
          </select>
        ) : field.type === 'name' ? (
          <input
            type="text"
            maxLength={30}
            className="w-full bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50 transition-colors"
            placeholder={field.placeholder}
            value={testValues[field.id] || ''}
            onChange={e => handleChange(field.id, e.target.value)}
          />
        ) : field.type === 'wildcard' ? (
          <div className="bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground italic">
            Wildcard: <span className="text-cyan-400 font-mono">{field.wildcardName}</span>
            <span className="ml-1.5 text-[10px] opacity-70">({field.wildcardMode || 'random'})</span>
          </div>
        ) : (
          <textarea
            rows={2}
            className="w-full bg-muted/30 border border-border rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50 transition-colors resize-none"
            placeholder={field.placeholder}
            value={testValues[field.id] || ''}
            onChange={e => handleChange(field.id, e.target.value)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Form Preview */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-white tracking-tight">Form Preview</h3>
          <p className="text-[10px] text-muted-foreground">What users will see</p>
        </div>

        {/* Required fields */}
        {requiredFields.length > 0 && (
          <div className="space-y-3">
            {requiredFields.map(renderField)}
          </div>
        )}

        {/* Divider between required and optional */}
        {requiredFields.length > 0 && optionalFields.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t border-border" />
            <span className="text-[10px] text-muted-foreground/50">optional</span>
            <div className="flex-1 border-t border-border" />
          </div>
        )}

        {/* Optional fields */}
        {optionalFields.length > 0 && (
          <div className="space-y-3">
            {optionalFields.map(renderField)}
          </div>
        )}
      </div>

      {/* Assembled Prompt Preview */}
      <div className="border-t border-border p-4 space-y-2">
        <h3 className="text-xs font-semibold text-white tracking-tight">
          Assembled Prompt Preview
        </h3>
        <div className="bg-muted/30 border border-border rounded-lg p-3 max-h-[200px] overflow-y-auto">
          <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-words leading-relaxed">
            {assembledPrompt || '(fill in fields above to see the assembled prompt)'}
          </pre>
        </div>
      </div>
    </div>
  )
}
