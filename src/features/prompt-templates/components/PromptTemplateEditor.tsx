"use client"

/**
 * PromptTemplateEditor Component
 *
 * Main admin UI for visual prompt template editing.
 * Combines TokenLibrary, TemplateBuilder, and TemplatePreview.
 */

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  FileText,
  Music,
  Camera,
  BookOpen,
  Plus,
  RefreshCw,
  Download,
  Upload,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { TokenLibrary } from './TokenLibrary'
import { TemplateBuilder } from './TemplateBuilder'
import { TemplatePreview } from './TemplatePreview'
import { usePromptTemplates } from '../hooks/usePromptTemplates'
import type { ModuleType, PromptTemplate, TemplateSlot } from '../types/prompt-template.types'
import { cn } from '@/utils/utils'

const MODULE_CONFIG: { id: ModuleType; label: string; icon: React.ReactNode }[] = [
  { id: 'storyboard', label: 'Storyboard', icon: <FileText className="w-4 h-4" /> },
  { id: 'musicLab', label: 'Music Lab', icon: <Music className="w-4 h-4" /> },
  { id: 'shotCreator', label: 'Shot Creator', icon: <Camera className="w-4 h-4" /> },
  { id: 'storybook', label: 'Storybook', icon: <BookOpen className="w-4 h-4" /> },
]

export function PromptTemplateEditor() {
  const {
    tokens,
    templates,
    categories,
    bannedTerms,
    selectedModule,
    selectedTemplate,
    hasUnsavedChanges,
    isLoading,
    error,
    setSelectedModule,
    setSelectedTemplate,
    addToken,
    updateToken,
    deleteToken,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    addSlotToTemplate,
    removeSlotFromTemplate,
    reorderSlots,
    updateSlot,
    addBannedTerm,
    removeBannedTerm,
    saveConfig,
    resetToDefaults,
  } = usePromptTemplates()

  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [libraryCollapsed, setLibraryCollapsed] = useState(false)
  const [previewCollapsed, setPreviewCollapsed] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Filter templates for selected module
  const moduleTemplates = templates.filter(t => t.moduleId === selectedModule)

  // Handle drag end from library to builder
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || !selectedTemplate) return

    // If dragging from library to template
    if (active.data.current?.type === 'token' && over.id === 'template-dropzone') {
      const token = active.data.current.token
      const newSlot: TemplateSlot = {
        id: crypto.randomUUID(),
        tokenId: token.id,
        prefix: '',
        suffix: ', ',
      }
      addSlotToTemplate(selectedTemplate.id, newSlot)
    }
  }

  // Create new template
  const handleCreateTemplate = () => {
    const newTemplate: PromptTemplate = {
      id: crypto.randomUUID(),
      moduleId: selectedModule,
      name: `New ${MODULE_CONFIG.find(m => m.id === selectedModule)?.label} Template`,
      description: '',
      slots: [],
      formatString: '',
      bannedTerms: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addTemplate(newTemplate)
  }

  // Export config
  const handleExport = () => {
    const config = {
      version: '1.0.0',
      tokens,
      templates,
      categories,
      bannedTerms,
    }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prompt-templates-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import config (placeholder - would need file input)
  const handleImport = () => {
    // TODO: Implement file import
    alert('Import functionality coming soon')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Prompt Template Editor</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Configure structured prompt templates for each module
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="text-xs border-zinc-700 hover:bg-zinc-800"
            >
              <Download className="w-3 h-3 mr-1.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImport}
              className="text-xs border-zinc-700 hover:bg-zinc-800"
            >
              <Upload className="w-3 h-3 mr-1.5" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Module Tabs */}
        <div className="flex items-center gap-1 p-1.5 bg-zinc-800/80 rounded-xl border border-zinc-700/50">
          {MODULE_CONFIG.map((module) => {
            const count = templates.filter(t => t.moduleId === module.id).length
            const isSelected = selectedModule === module.id
            return (
              <button
                key={module.id}
                onClick={() => setSelectedModule(module.id)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isSelected
                    ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/25'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700/70'
                )}
              >
                <span className={cn(
                  'transition-transform duration-200',
                  isSelected && 'scale-110'
                )}>
                  {module.icon}
                </span>
                {module.label}
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] px-1.5 py-0 h-4 font-semibold',
                    isSelected
                      ? 'bg-black/20 text-black'
                      : 'bg-zinc-700 text-zinc-400'
                  )}
                >
                  {count}
                </Badge>
              </button>
            )
          })}
        </div>

        {/* Template Selector */}
        <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <span className="text-xs text-zinc-500 font-medium">Template:</span>
          <Select
            value={selectedTemplate?.id || ''}
            onValueChange={setSelectedTemplate}
          >
            <SelectTrigger className="w-64 bg-zinc-900 border-zinc-700 hover:border-zinc-600 transition-colors">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {moduleTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateTemplate}
            className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400/60 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Template
          </Button>
          {hasUnsavedChanges && (
            <Badge
              variant="outline"
              className="text-amber-400 border-amber-500/50 bg-amber-500/10 animate-pulse"
            >
              Unsaved Changes
            </Badge>
          )}
        </div>

        {/* Main Content Grid - Full Width with Collapsible Panels */}
        <div className="flex gap-3 h-[calc(100vh-320px)] min-h-[500px]">
          {/* Token Library - Left (Collapsible) */}
          <div className={cn(
            'flex-shrink-0 h-full transition-all duration-300 ease-in-out relative',
            libraryCollapsed ? 'w-12' : 'w-80'
          )}>
            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute z-10 h-8 w-8 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-all',
                libraryCollapsed ? 'top-2 left-2' : 'top-2 -right-4'
              )}
              onClick={() => setLibraryCollapsed(!libraryCollapsed)}
              title={libraryCollapsed ? 'Expand Token Library' : 'Collapse Token Library'}
            >
              {libraryCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-zinc-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-zinc-400" />
              )}
            </Button>

            {libraryCollapsed ? (
              <div className="h-full bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center">
                <span className="text-zinc-600 text-xs [writing-mode:vertical-lr] rotate-180">Token Library</span>
              </div>
            ) : (
              <TokenLibrary
                tokens={tokens}
                categories={categories}
                onAddToken={addToken}
                onUpdateToken={updateToken}
                onDeleteToken={deleteToken}
              />
            )}
          </div>

          {/* Template Builder - Center (Flexible) */}
          <div className="flex-1 h-full min-w-0">
            <TemplateBuilder
              template={selectedTemplate}
              tokens={tokens}
              onAddSlot={addSlotToTemplate}
              onRemoveSlot={removeSlotFromTemplate}
              onReorderSlots={reorderSlots}
              onUpdateSlot={updateSlot}
              onUpdateTemplate={updateTemplate}
              onDuplicateTemplate={duplicateTemplate}
              onDeleteTemplate={deleteTemplate}
              onSave={saveConfig}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          </div>

          {/* Preview - Right (Collapsible) */}
          <div className={cn(
            'flex-shrink-0 h-full transition-all duration-300 ease-in-out relative',
            previewCollapsed ? 'w-12' : 'w-96'
          )}>
            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute z-10 h-8 w-8 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-all',
                previewCollapsed ? 'top-2 right-2' : 'top-2 -left-4'
              )}
              onClick={() => setPreviewCollapsed(!previewCollapsed)}
              title={previewCollapsed ? 'Expand Preview' : 'Collapse Preview'}
            >
              {previewCollapsed ? (
                <PanelRightOpen className="w-4 h-4 text-zinc-400" />
              ) : (
                <PanelRightClose className="w-4 h-4 text-zinc-400" />
              )}
            </Button>

            {previewCollapsed ? (
              <div className="h-full bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center">
                <span className="text-zinc-600 text-xs [writing-mode:vertical-lr]">Live Preview</span>
              </div>
            ) : (
              <TemplatePreview
                template={selectedTemplate}
                tokens={tokens}
                bannedTerms={bannedTerms}
                onAddBannedTerm={addBannedTerm}
                onRemoveBannedTerm={removeBannedTerm}
              />
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Reset to Defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all tokens and templates to their default values.
              Any custom changes will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetToDefaults()
                setResetDialogOpen(false)
              }}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  )
}
