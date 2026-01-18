'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, XCircle, Info } from 'lucide-react'

export type ErrorDialogVariant = 'error' | 'warning' | 'info'

interface ErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  variant?: ErrorDialogVariant
  actionLabel?: string
}

const variantConfig = {
  error: {
    icon: XCircle,
    iconColor: 'text-red-500',
    titleColor: 'text-red-900 dark:text-red-100',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-900 dark:text-amber-100',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-900 dark:text-blue-100',
  },
}

export function ErrorDialog({
  open,
  onOpenChange,
  title,
  message,
  variant = 'error',
  actionLabel = 'OK',
}: ErrorDialogProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
            <AlertDialogTitle className={config.titleColor}>
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
