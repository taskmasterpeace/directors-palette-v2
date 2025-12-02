"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Loader2, Search, Wand2, CheckCircle } from "lucide-react"

interface MultiStageProgressProps {
  stage: 'idle' | 'structure' | 'breakdowns' | 'complete'
  currentStep?: number
  totalSteps?: number
  message?: string
  elapsedTime: number
  estimatedTime: number
}

export function MultiStageProgress({ 
  stage, 
  currentStep = 0, 
  totalSteps = 0, 
  message, 
  elapsedTime,
  estimatedTime 
}: MultiStageProgressProps) {
  if (stage === 'idle') return null

  const getStageInfo = () => {
    switch (stage) {
      case 'structure':
        return {
          icon: <Search className="h-5 w-5 animate-pulse text-accent" />,
          title: "Stage 1: Story Analysis",
          description: "Breaking story into logical chapters...",
          progress: 15,
          color: "bg-accent"
        }
      case 'breakdowns':
        const chapterProgress = totalSteps > 0 ? (currentStep / totalSteps) * 75 : 0
        return {
          icon: <Wand2 className="h-5 w-5 animate-spin text-amber-400" />,
          title: "Stage 2: Shot Generation",
          description: `Generating shots for chapter ${currentStep}/${totalSteps}...`,
          progress: 15 + chapterProgress,
          color: "bg-amber-500"
        }
      case 'complete':
        return {
          icon: <CheckCircle className="h-5 w-5 text-emerald-400" />,
          title: "Stage 3: Complete",
          description: "Generation finished successfully!",
          progress: 100,
          color: "bg-emerald-500"
        }
      default:
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-gray-400" />,
          title: "Processing",
          description: "Working...",
          progress: 0,
          color: "bg-gray-500"
        }
    }
  }

  const stageInfo = getStageInfo()
  // Calculate progress based on elapsed time vs estimated time
  const timeBasedProgress = estimatedTime > 0 ? (elapsedTime / estimatedTime) * 100 : 0
  const remainingTime = Math.max(0, estimatedTime - elapsedTime)
  // Use time-based progress instead of fixed stage progress
  const progressPercentage = Math.min(100, Math.max(timeBasedProgress, stageInfo.progress))

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="bg-background/60 border-border">
      <CardContent className="pt-6">
        {/* Stage Header */}
        <div className="flex items-center gap-3 mb-4">
          {stageInfo.icon}
          <div className="flex-1">
            <h3 className="font-medium text-white">{stageInfo.title}</h3>
            <p className="text-sm text-foreground">{message || stageInfo.description}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>Elapsed: {formatTime(elapsedTime)}</div>
            {remainingTime > 0 && (
              <div>Est: {formatTime(remainingTime)} left</div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressPercentage.toFixed(0)}% complete</span>
            <span>
              {stage === 'breakdowns' && totalSteps > 0 && (
                `Chapter ${currentStep}/${totalSteps}`
              )}
            </span>
          </div>
        </div>

        {/* Stage Indicators */}
        <div className="flex items-center justify-between mt-4 text-xs">
          <div className={`flex items-center gap-1 ${stage === 'structure' || stage === 'breakdowns' || stage === 'complete' ? 'text-accent' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${stage === 'structure' || stage === 'breakdowns' || stage === 'complete' ? 'bg-blue-400' : 'bg-gray-500'}`} />
            Analysis
          </div>
          <div className={`flex items-center gap-1 ${stage === 'breakdowns' || stage === 'complete' ? 'text-amber-400' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${stage === 'breakdowns' || stage === 'complete' ? 'bg-amber-400' : 'bg-gray-500'}`} />
            Generation
          </div>
          <div className={`flex items-center gap-1 ${stage === 'complete' ? 'text-emerald-400' : 'text-gray-500'}`}>
            <div className={`w-2 h-2 rounded-full ${stage === 'complete' ? 'bg-green-400' : 'bg-gray-500'}`} />
            Complete
          </div>
        </div>

        {/* Parallel Processing Indicator */}
        {stage === 'breakdowns' && totalSteps > 1 && (
          <div className="mt-3 p-2 bg-card/50 rounded-md">
            <p className="text-xs text-muted-foreground">
              ⚡ Running {totalSteps} chapters in parallel for faster generation
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}