'use client'

import { useState, useRef, useEffect } from 'react'
import { Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/utils/utils'

interface InlineTagEditorProps {
    initialTags?: string[]
    onSave: (newTags: string[]) => void
    onCancel?: () => void
    placeholder?: string
    className?: string
    autoFocus?: boolean
}

export default function InlineTagEditor({
    initialTags = [],
    onSave,
    onCancel,
    placeholder = 'Add tags...',
    className,
    autoFocus = true
}: InlineTagEditorProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (initialTags.length > 0) {
            setEditValue(initialTags.join(', '))
        } else {
            setEditValue('')
        }
    }, [initialTags])

    useEffect(() => {
        if (isEditing && autoFocus && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing, autoFocus])

    const handleSave = () => {
        const tags = editValue
            .split(',')
            .map(tag => tag.trim().replace(/[@\s]/g, '').toLowerCase())
            .filter(tag => tag.length > 0)

        const uniqueTags = [...new Set(tags)]
        if (JSON.stringify(uniqueTags) !== JSON.stringify(initialTags)) {
            onSave(uniqueTags)
        }
        setIsEditing(false)
    }

    const handleCancelEdit = () => {
        if (initialTags.length > 0) {
            setEditValue(initialTags.join(', '))
        } else {
            setEditValue('')
        }
        setIsEditing(false)
        if (onCancel) {
            onCancel()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSave()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            handleCancelEdit()
        }
    }

    if (isEditing) {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <Tag className="w-3 h-3 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="h-6 text-xs bg-transparent border-border focus:border-primary px-2"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        )
    }

    return (
        <div
            className={cn(
                "flex items-center gap-1 cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded transition-colors",
                className
            )}
            onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
            }}
        >
            <Tag className="w-3 h-3" />
            <span className={cn("text-xs", initialTags.length === 0 && "text-muted-foreground")}>
                {initialTags.length > 0 ? initialTags.map(tag => `@${tag}`).join(', ') : placeholder}
            </span>
        </div>
    )
}