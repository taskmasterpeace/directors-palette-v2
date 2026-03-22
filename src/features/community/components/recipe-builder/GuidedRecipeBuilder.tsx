'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FieldPalette } from './FieldPalette'
import { parseStageTemplate } from '@/features/shot-creator/types/recipe.types'
import { RECIPE_CATEGORIES } from '../../types/community.types'
import { useRecipeStore } from '@/features/shot-creator/store/recipe.store'
import { useWildCardStore } from '@/features/shot-creator/store/wildcard.store'
import { useCommunity } from '../../hooks/useCommunity'
import { communityService } from '../../services/community.service'
import type { BundledWildcard } from '../../types/community.types'
import { ChevronLeft, ChevronRight, Save, Share2 } from 'lucide-react'
import { cn } from '@/utils/utils'

interface GuidedRecipeBuilderProps {
  open: boolean
  onClose: () => void
}

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '2:3', '3:2', '4:3', '3:4', '21:9']

type Step = 'basics' | 'template' | 'save'
const STEPS: Step[] = ['basics', 'template', 'save']

export function GuidedRecipeBuilder({ open, onClose }: GuidedRecipeBuilderProps) {
  const [step, setStep] = useState<Step>('basics')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('character-sheets')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [template, setTemplate] = useState('')
  const [shareToComm, setShareToComm] = useState(false)
  const [saving, setSaving] = useState(false)
  const templateRef = useRef<HTMLTextAreaElement>(null)

  const addRecipe = useRecipeStore(s => s.addRecipe)
  const { userId, userName } = useCommunity()

  const parsedFields = template ? parseStageTemplate(template, 0) : []
  const stepIdx = STEPS.indexOf(step)

  const canGoNext = () => {
    if (step === 'basics') return name.trim().length > 0
    if (step === 'template') return template.trim().length > 0
    return true
  }

  const handleInsertField = (snippet: string) => {
    const ta = templateRef.current
    if (!ta) {
      setTemplate(prev => prev + ' ' + snippet)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = template.slice(0, start)
    const after = template.slice(end)
    const newTemplate = before + snippet + after
    setTemplate(newTemplate)
    // Restore cursor after snippet
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + snippet.length, start + snippet.length)
    }, 0)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const stageId = `stage_${Date.now()}`
      const recipe = await addRecipe({
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId: category,
        suggestedAspectRatio: aspectRatio,
        isQuickAccess: false,
        stages: [{
          id: stageId,
          order: 0,
          template,
          fields: parsedFields,
          referenceImages: [],
        }],
      })

      if (shareToComm && recipe && userId) {
        // Bundle referenced wildcards
        const wildcardNames = [...template.matchAll(/wildcard\(([^)]+)\)/g)].map(m => m[1])
        const bundled_wildcards: BundledWildcard[] = []
        if (wildcardNames.length > 0) {
          const wcStore = useWildCardStore.getState()
          for (const wcName of [...new Set(wildcardNames)].slice(0, 10)) {
            const wc = wcStore.getWildCardByName(wcName)
            if (wc) {
              // Enforce 1000 entry limit
              const entries = wc.content.split('\n').filter(e => e.trim()).slice(0, 1000)
              bundled_wildcards.push({
                name: wc.name,
                category: wc.category || '',
                content: entries.join('\n'),
                description: wc.description || '',
              })
            }
          }
        }

        await communityService.submitItem(
          {
            type: 'recipe',
            name: name.trim(),
            description: description.trim() || undefined,
            category,
            content: {
              stages: [{
                id: stageId,
                order: 0,
                template,
                fields: parsedFields,
                referenceImages: [],
              }],
              suggestedAspectRatio: aspectRatio,
              referenceImages: [],
            },
            bundled_wildcards: bundled_wildcards.length > 0 ? bundled_wildcards : undefined,
          },
          userId,
          userName || 'Anonymous'
        )
      }

      onClose()
    } catch (err) {
      console.error('Failed to save recipe:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Create Recipe</DialogTitle>
          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  i <= stepIdx ? 'bg-amber-500 text-black' : 'bg-muted text-muted-foreground'
                )}>
                  {i + 1}
                </div>
                <span className={cn(
                  'text-xs capitalize',
                  i === stepIdx ? 'text-amber-400' : 'text-muted-foreground/50'
                )}>
                  {s}
                </span>
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30 mx-1" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Basics */}
          {step === 'basics' && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Recipe Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Street Style Lookbook"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this recipe creates"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECIPE_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Aspect Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map(ar => (
                        <SelectItem key={ar} value={ar}>{ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Template */}
          {step === 'template' && (
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-xs">Prompt Template</Label>
                <Textarea
                  ref={templateRef}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder={`Write your prompt template here. Use the field palette on the right to insert dynamic fields like <<OUTFIT:wildcard(blkmen_fullbody, browse)>> or <<STYLE:select(Cinematic,Anime,Watercolor)>>.`}
                  className="min-h-[200px] font-mono text-sm"
                />
                {/* Parsed fields preview */}
                {parsedFields.length > 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground/50 mb-1">Detected Fields:</div>
                    <div className="flex flex-wrap gap-1">
                      {parsedFields.map(f => (
                        <Badge key={f.id} variant="outline" className={cn(
                          'text-[10px]',
                          f.type === 'wildcard' ? 'border-amber-500/40 text-amber-400' :
                          f.type === 'select' ? 'border-blue-500/40 text-blue-400' :
                          f.type === 'name' ? 'border-green-500/40 text-green-400' :
                          'border-border text-muted-foreground'
                        )}>
                          {f.label} ({f.type}{f.wildcardName ? `:${f.wildcardName}` : ''})
                          {f.required && ' *'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="w-[200px] shrink-0">
                <FieldPalette onInsertField={handleInsertField} />
              </div>
            </div>
          )}

          {/* Step 3: Save */}
          {step === 'save' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 space-y-2">
                <h3 className="font-medium text-sm">{name}</h3>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>{category}</span>
                  <span>|</span>
                  <span>{aspectRatio}</span>
                  <span>|</span>
                  <span>{parsedFields.length} fields</span>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareToComm}
                  onChange={(e) => setShareToComm(e.target.checked)}
                  className="rounded border-border"
                />
                <div>
                  <div className="text-sm font-medium flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5" /> Share to Community
                  </div>
                  <div className="text-[10px] text-muted-foreground/50">
                    Let others discover and use your recipe
                  </div>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => stepIdx > 0 ? setStep(STEPS[stepIdx - 1]) : onClose()}
            className="text-xs"
          >
            <ChevronLeft className="w-3 h-3 mr-1" />
            {stepIdx > 0 ? 'Back' : 'Cancel'}
          </Button>

          {step === 'save' ? (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-amber-600 hover:bg-amber-500"
            >
              <Save className="w-3 h-3 mr-1" />
              {saving ? 'Saving...' : 'Save Recipe'}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setStep(STEPS[stepIdx + 1])}
              disabled={!canGoNext()}
              className="text-xs bg-amber-600 hover:bg-amber-500"
            >
              Next
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
