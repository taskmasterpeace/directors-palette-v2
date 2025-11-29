'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, Download } from 'lucide-react'

interface BulkDownloadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageCount: number
  current: number
  status: 'downloading' | 'zipping' | 'complete' | 'error'
  error?: string
}

/**
 * Modal to display bulk download progress
 * Shows progress bar and status messages during download
 */
export function BulkDownloadModal({
  open,
  onOpenChange,
  imageCount,
  current,
  status,
  error
}: BulkDownloadModalProps) {
  // Calculate progress percentage
  const progress = imageCount > 0 ? (current / imageCount) * 100 : 0

  // Auto-close after successful completion
  useEffect(() => {
    if (status === 'complete') {
      const timer = setTimeout(() => {
        onOpenChange(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [status, onOpenChange])

  // Get status message
  const getStatusMessage = () => {
    switch (status) {
      case 'downloading':
        return `Downloading ${current} of ${imageCount} images...`
      case 'zipping':
        return 'Creating ZIP file...'
      case 'complete':
        return 'Download complete!'
      case 'error':
        return error || 'An error occurred during download'
      default:
        return ''
    }
  }

  // Get icon based on status
  const getIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-12 h-12 text-green-500" />
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500" />
      default:
        return <Download className="w-12 h-12 text-blue-500 animate-pulse" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={status !== 'downloading' && status !== 'zipping'}>
        <DialogHeader>
          <DialogTitle>
            {status === 'complete' ? 'Success' : status === 'error' ? 'Error' : 'Downloading Images'}
          </DialogTitle>
          <DialogDescription>
            {getStatusMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Icon */}
          <div className="flex items-center justify-center">
            {getIcon()}
          </div>

          {/* Progress bar - only show during download/zip */}
          {(status === 'downloading' || status === 'zipping') && (
            <div className="w-full space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-slate-500 text-center">
                {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Success message */}
          {status === 'complete' && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Successfully downloaded {imageCount} image{imageCount !== 1 ? 's' : ''}
            </p>
          )}

          {/* Error details */}
          {status === 'error' && error && (
            <div className="w-full p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {/* Only show close button when not actively downloading */}
          {(status === 'complete' || status === 'error') && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          )}

          {/* Show cancel button during download */}
          {(status === 'downloading' || status === 'zipping') && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
