'use client'

import { Save, Loader2 } from 'lucide-react'
import { cn } from '@/utils/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Brand } from '../../../types'

export interface SectionProps {
  brand: Brand
  onSave: (data: Partial<Brand> & { id: string }) => Promise<void>
  isSaving: boolean
}

export function SectionCard({ icon: Icon, title, iconColor, children, editing, onEdit, onSave, onCancel, isSaving }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  iconColor: string
  children: React.ReactNode
  editing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel?: () => void
  isSaving: boolean
}) {
  return (
    <Card className={cn(
      'border-border/25 bg-card/60 backdrop-blur-sm transition-all duration-300 overflow-hidden',
      editing
        ? 'ring-1 ring-primary/20 border-primary/30 shadow-lg shadow-primary/5'
        : 'hover:border-border/40'
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-base font-semibold tracking-tight">{title}</span>
          </span>
          {editing ? (
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button size="sm" className="gap-1.5 h-7 text-xs px-3" onClick={onSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </Button>
            </div>
          ) : (
            <button
              className="text-xs text-muted-foreground/50 hover:text-primary transition-colors"
              onClick={onEdit}
            >
              Edit
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  )
}
