import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DirectorFingerprint } from '../types/director.types'
import { cn } from '@/utils/utils'

interface DirectorAvatarProps {
    director: DirectorFingerprint
    className?: string
    showStatus?: boolean
}

export function DirectorAvatar({ director, className, showStatus }: DirectorAvatarProps) {
    // Generate initials
    const initials = director.name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

    // Deterministic color based on ID (simple hash)
    const colors = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500',
        'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
        'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500',
        'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
        'bg-pink-500', 'bg-rose-500'
    ]

    // Use director ID to pick a stable color for the fallback
    const colorIndex = director.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    const fallbackColor = colors[colorIndex]

    return (
        <div className="relative inline-block">
            <Avatar className={cn("border-2 border-background shadow-sm", className)}>
                <AvatarImage src={`/images/directors/${director.id}.jpg`} alt={director.name} />
                <AvatarFallback className={cn("text-white font-bold", fallbackColor)}>
                    {initials}
                </AvatarFallback>
            </Avatar>

            {showStatus && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
            )}
        </div>
    )
}
