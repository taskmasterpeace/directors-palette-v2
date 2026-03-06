'use client'

import { Save, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Brand } from '../../../types'

export interface SectionProps {
  brand: Brand
  onSave: (data: Partial<Brand> & { id: string }) => Promise<void>
  isSaving: boolean
}

export function SectionCard({ number, icon: Icon, title, iconColor, children, editing, onEdit, onSave, isSaving }: {
  number: number
  icon: React.ComponentType<{ className?: string }>
  title: string
  iconColor: string
  children: React.ReactNode
  editing: boolean
  onEdit: () => void
  onSave: () => void
  isSaving: boolean
}) {
  return (
    <Card className="border-border/25 bg-card/60 backdrop-blur-sm hover:border-border/40 transition-colors duration-300 group overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-primary/90 text-[9px] font-bold text-primary-foreground flex items-center justify-center ring-2 ring-background">
                {number}
              </span>
            </div>
            <span className="font-semibold tracking-tight">{title}</span>
          </span>
          {editing ? (
            <Button size="sm" className="gap-1.5 h-7 text-xs px-3" onClick={onSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onEdit}
            >
              Edit
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  )
}
