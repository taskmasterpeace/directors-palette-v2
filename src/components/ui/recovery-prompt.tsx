import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RotateCcw, X } from 'lucide-react'

interface RecoveryPromptProps {
  onRecover: () => void
  onDiscard: () => void
  timestamp: number
  steps: string[]
}

export function RecoveryPrompt({ onRecover, onDiscard, timestamp, steps }: RecoveryPromptProps) {
  const timeAgo = new Date(timestamp).toLocaleTimeString()
  
  return (
    <Card className="bg-amber-900/20 border-amber-600/50">
      <CardHeader>
        <CardTitle className="text-amber-400 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Incomplete Generation Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-foreground">
          A previous generation was interrupted at {timeAgo}. 
          {steps.length > 0 && ` Completed steps: ${steps.join(', ')}.`}
        </p>
        <div className="flex gap-3">
          <Button
            onClick={onRecover}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Resume Generation
          </Button>
          <Button
            onClick={onDiscard}
            variant="outline"
            className="border-border"
          >
            <X className="h-4 w-4 mr-2" />
            Start Fresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}