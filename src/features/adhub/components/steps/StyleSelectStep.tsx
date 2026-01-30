'use client'

import React, { useEffect, useState } from 'react'
import { Palette, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/utils'
import { useAdhubStore } from '../../store/adhub.store'
import type { AdhubStyle } from '../../types/adhub.types'

export function StyleSelectStep() {
  const {
    styles,
    setStyles,
    selectedStyle,
    selectStyle,
    nextStep,
    previousStep,
  } = useAdhubStore()

  const [isLoading, setIsLoading] = useState(true)

  // Fetch active styles
  useEffect(() => {
    async function fetchStyles() {
      try {
        const response = await fetch('/api/adhub/styles')
        if (response.ok) {
          const data = await response.json()
          setStyles(data.styles || [])
        }
      } catch (error) {
        console.error('Failed to fetch styles:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStyles()
  }, [setStyles])

  const handleSelect = (style: AdhubStyle) => {
    selectStyle(style)
  }

  const handleContinue = () => {
    if (selectedStyle) {
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

  if (styles.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <Palette className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Styles Available</h3>
          <p className="text-muted-foreground mb-6">
            An admin needs to create styles before you can generate ads.
          </p>
          <Button variant="outline" onClick={previousStep}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Select a Style</h2>
        <p className="text-muted-foreground mt-1">
          Choose a visual style for your ad. This affects the overall look and feel.
        </p>
      </div>

      {/* Style Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {styles.map((style) => (
          <div
            key={style.id}
            className={cn(
              'relative border rounded-lg p-4 cursor-pointer transition-all min-h-[140px]',
              selectedStyle?.id === style.id
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => handleSelect(style)}
          >
            {/* Icon or Default */}
            <div className="flex items-start gap-3 mb-3">
              {style.iconUrl ? (
                <img
                  src={style.iconUrl}
                  alt={style.displayName}
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded flex items-center justify-center">
                  <Palette className="w-6 h-6 text-purple-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{style.displayName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{style.name}</p>
              </div>
            </div>

            {/* Prompt Preview */}
            <p className="text-xs text-muted-foreground line-clamp-3">
              {style.promptModifiers}
            </p>

            {/* Selected Indicator */}
            {selectedStyle?.id === style.id && (
              <div className="absolute top-2 right-2">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Palette className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
            )}
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
          disabled={!selectedStyle}
          className="gap-2"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
