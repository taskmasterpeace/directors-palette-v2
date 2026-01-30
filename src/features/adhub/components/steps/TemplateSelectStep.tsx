'use client'

import React, { useEffect, useState } from 'react'
import { Plus, LayoutTemplate, Trash2, Edit2, ChevronRight, ChevronLeft, Globe, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/utils/utils'
import { useAdhubStore } from '../../store/adhub.store'
import type { AdhubTemplate, AdhubTemplateFieldInput } from '../../types/adhub.types'
import { TemplateInfoTip } from '../InfoTip'

export function TemplateSelectStep() {
  const {
    templates,
    setTemplates,
    selectedTemplate,
    selectTemplate,
    nextStep,
    previousStep,
  } = useAdhubStore()

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<AdhubTemplate | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [iconUrl, setIconUrl] = useState('')
  const [goalPrompt, setGoalPrompt] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [fields, setFields] = useState<AdhubTemplateFieldInput[]>([])

  // Fetch templates
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const response = await fetch('/api/adhub/templates')
        if (response.ok) {
          const data = await response.json()
          setTemplates(data.templates || [])
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTemplates()
  }, [setTemplates])

  const resetForm = () => {
    setName('')
    setIconUrl('')
    setGoalPrompt('')
    setIsPublic(false)
    setFields([])
    setEditingTemplate(null)
  }

  const handleOpenDialog = async (template?: AdhubTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setName(template.name)
      setIconUrl(template.iconUrl || '')
      setGoalPrompt(template.goalPrompt)
      setIsPublic(template.isPublic)
      setFields(template.fields?.map(f => ({
        fieldType: f.fieldType,
        fieldName: f.fieldName,
        fieldLabel: f.fieldLabel,
        isRequired: f.isRequired,
        placeholder: f.placeholder,
        fieldOrder: f.fieldOrder,
      })) || [])
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleAddField = () => {
    setFields([...fields, {
      fieldType: 'text',
      fieldName: `field_${fields.length + 1}`,
      fieldLabel: `Field ${fields.length + 1}`,
      isRequired: true,
      placeholder: '',
      fieldOrder: fields.length,
    }])
  }

  const handleUpdateField = (index: number, updates: Partial<AdhubTemplateFieldInput>) => {
    setFields(fields.map((f, i) => i === index ? { ...f, ...updates } : f))
  }

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim() || !goalPrompt.trim()) return

    setIsCreating(true)
    try {
      const endpoint = editingTemplate
        ? `/api/adhub/templates/${editingTemplate.id}`
        : '/api/adhub/templates'
      const method = editingTemplate ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          iconUrl: iconUrl.trim() || undefined,
          goalPrompt: goalPrompt.trim(),
          isPublic,
          fields, // Send fields on both create and edit
        }),
      })

      if (response.ok) {
        // Refetch templates to get updated data
        const listResponse = await fetch('/api/adhub/templates')
        if (listResponse.ok) {
          const data = await listResponse.json()
          setTemplates(data.templates || [])
        }
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error('Failed to save template:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/adhub/templates/${templateId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== templateId))
        if (selectedTemplate?.id === templateId) {
          selectTemplate(undefined)
        }
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const handleSelect = async (template: AdhubTemplate) => {
    // Fetch full template with fields
    try {
      const response = await fetch(`/api/adhub/templates/${template.id}`)
      if (response.ok) {
        const data = await response.json()
        selectTemplate(data.template)
      }
    } catch (error) {
      console.error('Failed to fetch template:', error)
      selectTemplate(template)
    }
  }

  const handleContinue = () => {
    if (selectedTemplate) {
      nextStep()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Select a Template</h2>
          <TemplateInfoTip />
        </div>
        <p className="text-muted-foreground mt-1">
          Choose a template that defines what fields you&apos;ll fill in for your ad.
        </p>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Create New Template Card */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button
              onClick={() => handleOpenDialog()}
              className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors min-h-[160px]"
            >
              <Plus className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Create Template</span>
            </button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Template Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Product Showcase"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Icon URL</label>
                <Input
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  placeholder="https://example.com/icon.png"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Goal Prompt *</label>
                <Textarea
                  value={goalPrompt}
                  onChange={(e) => setGoalPrompt(e.target.value)}
                  placeholder="A static ad image showing {{product_name}} with {{tagline}}. Use field placeholders like {{field_name}}."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {`{{field_name}}`} syntax to insert field values
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                <label className="text-sm">Make template public</label>
              </div>

              {/* Fields Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Template Fields</label>
                  <Button variant="outline" size="sm" onClick={handleAddField}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Field
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No fields yet. Add fields that users will fill in.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        <div className="flex gap-2">
                          <select
                            value={field.fieldType}
                            onChange={(e) => handleUpdateField(index, { fieldType: e.target.value as 'text' | 'image' })}
                            className="w-24 text-sm border rounded px-2 py-1 bg-background"
                          >
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                          </select>
                          <Input
                            value={field.fieldName}
                            onChange={(e) => handleUpdateField(index, { fieldName: e.target.value })}
                            placeholder="field_name"
                            className="flex-1"
                          />
                          <Input
                            value={field.fieldLabel}
                            onChange={(e) => handleUpdateField(index, { fieldLabel: e.target.value })}
                            placeholder="Field Label"
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveField(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <Input
                          value={field.placeholder || ''}
                          onChange={(e) => handleUpdateField(index, { placeholder: e.target.value })}
                          placeholder="Placeholder text"
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!name.trim() || !goalPrompt.trim() || isCreating}>
                  {isCreating ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Existing Templates */}
        {templates.map((template) => (
          <div
            key={template.id}
            className={cn(
              'relative border rounded-lg p-4 cursor-pointer transition-all min-h-[160px] group',
              selectedTemplate?.id === template.id
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => handleSelect(template)}
          >
            {/* Icon or Default */}
            <div className="flex items-start gap-3 mb-3">
              {template.iconUrl ? (
                <img
                  src={template.iconUrl}
                  alt={template.name}
                  className="w-10 h-10 object-contain rounded"
                />
              ) : (
                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                  <LayoutTemplate className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate flex items-center gap-1.5">
                  {template.name}
                  {template.isPublic ? (
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {template.goalPrompt}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenDialog(template)
                }}
                className="p-1.5 rounded hover:bg-accent"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(template.id)
                }}
                className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={previousStep} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!selectedTemplate}
          className="gap-2"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
