'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Play, X } from 'lucide-react'

interface QueueRecoveryBannerProps {
    message: string
    onResume: () => void
    onDismiss: () => void
}

/**
 * Banner shown when a recoverable queue checkpoint is detected
 */
export function QueueRecoveryBanner({
    message,
    onResume,
    onDismiss
}: QueueRecoveryBannerProps) {
    return (
        <Alert className="bg-blue-900/20 border-blue-700 mb-4">
            <AlertCircle className="h-4 w-4 text-accent" />
            <AlertTitle className="text-blue-300">Incomplete Generation Detected</AlertTitle>
            <AlertDescription className="text-foreground flex items-center justify-between">
                <span>{message}</span>
                <div className="flex gap-2 ml-4">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onDismiss}
                        className="h-8"
                    >
                        <X className="w-3 h-3 mr-1" />
                        Start Over
                    </Button>
                    <Button
                        size="sm"
                        onClick={onResume}
                        className="h-8 bg-accent hover:bg-accent/90"
                    >
                        <Play className="w-3 h-3 mr-1" />
                        Resume
                    </Button>
                </div>
            </AlertDescription>
        </Alert>
    )
}
