'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Cloud } from 'lucide-react'

export function SaveIndicator() {
    const [showSaved, setShowSaved] = useState(false)

    useEffect(() => {
        const handleSave = () => {
            setShowSaved(true)
            // Hide after 2 seconds
            setTimeout(() => setShowSaved(false), 2000)
        }

        window.addEventListener('storyboard-saved', handleSave as EventListener)
        return () => window.removeEventListener('storyboard-saved', handleSave as EventListener)
    }, [])

    return (
        <div
            className={`flex items-center gap-1.5 text-xs transition-all duration-300 ${showSaved ? "opacity-100" : "opacity-0"}`}
        >
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span className="text-muted-foreground">Saved</span>
        </div>
    )
}

// Compact version for tight spaces
export function SaveIndicatorCompact() {
    const [showSaved, setShowSaved] = useState(false)

    useEffect(() => {
        const handleSave = () => {
            setShowSaved(true)
            setTimeout(() => setShowSaved(false), 1500)
        }

        window.addEventListener('storyboard-saved', handleSave)
        return () => window.removeEventListener('storyboard-saved', handleSave)
    }, [])

    return (
        <Cloud
            className={`w-4 h-4 transition-all duration-300 ${showSaved ? "text-green-500 opacity-100" : "text-muted-foreground/30 opacity-50"}`}
        />
    )
}
