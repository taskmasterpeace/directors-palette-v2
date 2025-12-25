import * as React from "react"
import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils/utils"

const loadingSpinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      size: {
        xs: "h-3 w-3",
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-10 w-10",
      },
      color: {
        primary: "text-amber-500",
        accent: "text-violet-500",
        muted: "text-muted-foreground",
        current: "text-current",
      },
    },
    defaultVariants: {
      size: "md",
      color: "primary",
    },
  }
)

export interface LoadingSpinnerProps
  extends Omit<React.ComponentProps<typeof Loader2>, "color" | "size">,
    VariantProps<typeof loadingSpinnerVariants> {}

function LoadingSpinner({
  className,
  size,
  color,
  ...props
}: LoadingSpinnerProps) {
  return (
    <Loader2
      data-slot="loading-spinner"
      className={cn(loadingSpinnerVariants({ size, color, className }))}
      {...props}
    />
  )
}

export { LoadingSpinner, loadingSpinnerVariants }
export default LoadingSpinner
