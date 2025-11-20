import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/utils"

const enhancedButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // New premium variants
        premium: "bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg hover:shadow-xl hover:shadow-slate-500/25 hover:scale-105 transition-all duration-300 border border-slate-600",
        glass: "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/15 hover:border-white/30 shadow-lg hover:shadow-xl transition-all duration-300",
        neon: "bg-transparent border-2 text-white hover:shadow-lg transition-all duration-300 relative overflow-hidden",
        sleek: "bg-gradient-to-r text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 border-0",
        spark: "relative overflow-hidden bg-gradient-to-r text-white hover:scale-105 transition-all duration-300 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
      colorScheme: {
        blue: "",
        red: "",
        emerald: "",
        rose: "",
        amber: "",
        slate: "",
      }
    },
    compoundVariants: [
      // Neon variants with color schemes
      {
        variant: "neon",
        colorScheme: "blue",
        class: "border-blue-400 hover:shadow-blue-400/50 hover:text-blue-300"
      },
      {
        variant: "neon",
        colorScheme: "red",
        class: "border-red-400 hover:shadow-red-400/50 hover:text-red-300"
      },
      {
        variant: "neon",
        colorScheme: "emerald",
        class: "border-emerald-400 hover:shadow-emerald-400/50 hover:text-emerald-300"
      },
      {
        variant: "neon",
        colorScheme: "rose",
        class: "border-rose-400 hover:shadow-rose-400/50 hover:text-rose-300"
      },
      {
        variant: "neon",
        colorScheme: "amber",
        class: "border-amber-400 hover:shadow-amber-400/50 hover:text-amber-300"
      },
      // Sleek variants with color schemes
      {
        variant: "sleek",
        colorScheme: "blue",
        class: "from-blue-600 to-blue-500"
      },
      {
        variant: "sleek",
        colorScheme: "red",
        class: "from-red-600 to-red-500"
      },
      {
        variant: "sleek",
        colorScheme: "emerald",
        class: "from-emerald-600 to-emerald-500"
      },
      {
        variant: "sleek",
        colorScheme: "rose",
        class: "from-rose-600 to-rose-500"
      },
      {
        variant: "sleek",
        colorScheme: "amber",
        class: "from-amber-600 to-amber-500"
      },
      // Spark variants with color schemes
      {
        variant: "spark",
        colorScheme: "blue",
        class: "from-blue-600 to-blue-500"
      },
      {
        variant: "spark",
        colorScheme: "red",
        class: "from-red-600 to-red-500"
      },
      {
        variant: "spark",
        colorScheme: "emerald",
        class: "from-emerald-600 to-emerald-500"
      },
      {
        variant: "spark",
        colorScheme: "rose",
        class: "from-rose-600 to-rose-500"
      },
      {
        variant: "spark",
        colorScheme: "amber",
        class: "from-amber-600 to-amber-500"
      }
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      colorScheme: "slate"
    },
  }
)

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean
  shimmer?: boolean
  glow?: boolean
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ className, variant, size, colorScheme, asChild = false, shimmer = false, glow = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(
          enhancedButtonVariants({ variant, size, colorScheme, className }),
          shimmer && "animate-shimmer",
          glow && "animate-glow"
        )}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
EnhancedButton.displayName = "EnhancedButton"

export { EnhancedButton, enhancedButtonVariants }