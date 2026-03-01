'use client'

import { Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useBrandStore } from '../hooks/useBrandStore'

interface BrandSelectorProps {
  onNewBrand: () => void
}

export function BrandSelector({ onNewBrand }: BrandSelectorProps) {
  const { brands, activeBrandId, setActiveBrandId } = useBrandStore()

  return (
    <div className="flex items-center gap-2">
      <Select value={activeBrandId ?? ''} onValueChange={setActiveBrandId}>
        <SelectTrigger className="flex-1 bg-secondary/50 border-border/60 h-9">
          <SelectValue placeholder="Select a brand..." />
        </SelectTrigger>
        <SelectContent>
          {brands.map((brand) => (
            <SelectItem key={brand.id} value={brand.id}>
              <span className="flex items-center gap-2">
                {brand.logo_url && (
                  <img
                    src={brand.logo_url}
                    alt=""
                    className="w-4 h-4 rounded-sm object-contain"
                  />
                )}
                {brand.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 border-dashed border-primary/40 text-primary hover:bg-primary/10 hover:text-primary h-9"
        onClick={onNewBrand}
      >
        <Plus className="w-4 h-4 mr-1" />
        New
      </Button>
    </div>
  )
}
