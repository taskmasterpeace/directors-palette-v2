"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

function ClapperIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      {/* Clapperboard body */}
      <rect x="2" y="10" width="28" height="20" rx="2" fill="#8B4513" />
      {/* Screen area */}
      <rect x="4" y="14" width="24" height="14" rx="1" fill="#1a1a1a" opacity="0.3" />
      {/* Clapper top */}
      <rect x="2" y="4" width="28" height="8" rx="2" fill="#2A2A2A" />
      {/* Clapper stripes */}
      <rect x="6" y="5" width="3" height="6" rx="0.5" fill="white" transform="rotate(-12 7.5 8)" />
      <rect x="14" y="5" width="3" height="6" rx="0.5" fill="white" transform="rotate(-12 15.5 8)" />
      <rect x="22" y="5" width="3" height="6" rx="0.5" fill="white" transform="rotate(-12 23.5 8)" />
      {/* Paint dots */}
      <circle cx="9" cy="22" r="2.5" fill="#E74C3C" />
      <circle cx="16" cy="20" r="2" fill="#3498DB" />
      <circle cx="23" cy="22" r="2" fill="#2ECC71" />
    </svg>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3 w-full">
              {/* Branded icon */}
              <div className={`flex-shrink-0 mt-0.5 rounded-lg p-1.5 ${
                variant === 'destructive'
                  ? 'bg-red-950/50'
                  : 'bg-amber-900/30'
              }`}>
                <ClapperIcon className="h-5 w-5" />
              </div>
              {/* Content */}
              <div className="grid gap-0.5 flex-1 min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
