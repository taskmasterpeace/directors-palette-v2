'use client'

import React from 'react'
import { Download, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GenerationQueueItem } from '../types'

interface GenerationQueueProps {
  items: GenerationQueueItem[]
  onRetry?: (id: string) => void
  onDownload?: (url: string) => void
}

export function GenerationQueue({ items, onRetry, onDownload }: GenerationQueueProps) {
  return (
    <div className="space-y-3">
      {items.map(item => (
        <QueueItem
          key={item.id}
          item={item}
          onRetry={onRetry}
          onDownload={onDownload}
        />
      ))}
    </div>
  )
}

interface QueueItemProps {
  item: GenerationQueueItem
  onRetry?: (id: string) => void
  onDownload?: (url: string) => void
}

function QueueItem({ item, onRetry, onDownload }: QueueItemProps) {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-muted-foreground" />
      case 'processing':
        return <LoadingSpinner size="sm" color="accent" />
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-primary" />
    }
  }

  const getStatusBadge = () => {
    switch (item.status) {
      case 'queued':
        return <Badge variant="outline" className="border-border text-muted-foreground">Queued</Badge>
      case 'processing':
        return <Badge variant="outline" className="border-blue-600 text-accent">Processing</Badge>
      case 'completed':
        return <Badge variant="outline" className="border-green-600 text-emerald-400">Completed</Badge>
      case 'failed':
        return <Badge variant="outline" className="border-primary text-primary">Failed</Badge>
    }
  }

  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {getStatusIcon()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white font-medium truncate">
                {item.shotConfig.imageName}
              </p>
              {getStatusBadge()}
            </div>

            <p className="text-sm text-muted-foreground truncate mb-2">
              {item.model === 'seedance-lite' ? 'Seedance Lite' : 'Seedance Pro'} •{' '}
              {item.modelSettings.resolution} • {item.modelSettings.duration}s
            </p>

            {/* Progress Bar */}
            {item.status === 'processing' && item.progress !== undefined && (
              <div className="space-y-1">
                <Progress value={item.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{item.progress}%</p>
              </div>
            )}

            {/* Error Message */}
            {item.status === 'failed' && item.error && (
              <p className="text-sm text-primary mt-2">{item.error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0">
            {item.status === 'completed' && item.videoUrl && onDownload && (
              <Button
                size="sm"
                onClick={() => onDownload(item.videoUrl!)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}

            {item.status === 'failed' && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRetry(item.id)}
                className="border-border text-foreground hover:bg-secondary"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
