import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/utils"

const premiumCardVariants = cva(
  "rounded-xl transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border shadow-sm",
        glass: "bg-white/10 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl hover:bg-white/15",
        elevated: "bg-card text-card-foreground shadow-lg hover:shadow-xl hover:scale-[1.02] border",
        neon: "bg-transparent border-2 shadow-lg hover:shadow-xl relative overflow-hidden",
        gradient: "text-white shadow-lg hover:shadow-xl hover:scale-[1.02] border-0",
        interactive: "bg-card text-card-foreground border shadow-sm hover:shadow-lg hover:scale-105 cursor-pointer transition-all duration-200",
        floating: "bg-card text-card-foreground border shadow-xl hover:shadow-2xl animate-float"
      },
      colorScheme: {
        blue: "",
        red: "",
        emerald: "",
        rose: "",
        amber: "",
        slate: "",
        white: ""
      }
    },
    compoundVariants: [
      // Neon variants with color schemes
      {
        variant: "neon",
        colorScheme: "blue",
        class: "border-blue-400 hover:shadow-blue-400/25 text-white"
      },
      {
        variant: "neon",
        colorScheme: "red",
        class: "border-primary hover:shadow-primary/25 text-white"
      },
      {
        variant: "neon",
        colorScheme: "emerald",
        class: "border-emerald-400 hover:shadow-emerald-400/25 text-white"
      },
      {
        variant: "neon",
        colorScheme: "rose",
        class: "border-rose-400 hover:shadow-rose-400/25 text-white"
      },
      {
        variant: "neon",
        colorScheme: "amber",
        class: "border-amber-400 hover:shadow-amber-400/25 text-white"
      },
      // Gradient variants with color schemes
      {
        variant: "gradient",
        colorScheme: "blue",
        class: "bg-gradient-to-br from-blue-600 to-blue-800"
      },
      {
        variant: "gradient",
        colorScheme: "red",
        class: "bg-gradient-to-br from-primary to-primary/70"
      },
      {
        variant: "gradient",
        colorScheme: "emerald",
        class: "bg-gradient-to-br from-emerald-600 to-emerald-800"
      },
      {
        variant: "gradient",
        colorScheme: "rose",
        class: "bg-gradient-to-br from-rose-600 to-rose-800"
      },
      {
        variant: "gradient",
        colorScheme: "amber",
        class: "bg-gradient-to-br from-amber-600 to-amber-800"
      },
      {
        variant: "gradient",
        colorScheme: "slate",
        class: "bg-gradient-to-br from-muted to-card"
      }
    ],
    defaultVariants: {
      variant: "default",
      colorScheme: "slate"
    },
  }
)

const premiumCardHeaderVariants = cva(
  "flex flex-col space-y-1.5 p-6"
)

const premiumCardTitleVariants = cva(
  "text-2xl font-semibold leading-none tracking-tight"
)

const premiumCardDescriptionVariants = cva(
  "text-sm text-muted-foreground"
)

const premiumCardContentVariants = cva("p-6 pt-0")

const premiumCardFooterVariants = cva("flex items-center p-6 pt-0")

export interface PremiumCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof premiumCardVariants> {
  glow?: boolean
  backgroundImage?: string
  backgroundOverlay?: string
}

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, variant, colorScheme, glow = false, backgroundImage, backgroundOverlay, style, ...props }, ref) => {
    const cardStyle = {
      ...style,
      ...(backgroundImage && {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      })
    }

    return (
      <div
        ref={ref}
        className={cn(
          premiumCardVariants({ variant, colorScheme }),
          glow && "animate-glow",
          backgroundImage && "relative overflow-hidden",
          className
        )}
        style={cardStyle}
        {...props}
      >
        {backgroundImage && backgroundOverlay && (
          <div
            className="absolute inset-0 z-0"
            style={{ background: backgroundOverlay }}
          />
        )}
        <div className={cn("relative z-10", backgroundImage && "h-full")}>
          {props.children}
        </div>
      </div>
    )
  }
)
PremiumCard.displayName = "PremiumCard"

const PremiumCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(premiumCardHeaderVariants(), className)} {...props} />
))
PremiumCardHeader.displayName = "PremiumCardHeader"

const PremiumCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn(premiumCardTitleVariants(), className)} {...props} />
))
PremiumCardTitle.displayName = "PremiumCardTitle"

const PremiumCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn(premiumCardDescriptionVariants(), className)} {...props} />
))
PremiumCardDescription.displayName = "PremiumCardDescription"

const PremiumCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(premiumCardContentVariants(), className)} {...props} />
))
PremiumCardContent.displayName = "PremiumCardContent"

const PremiumCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(premiumCardFooterVariants(), className)} {...props} />
))
PremiumCardFooter.displayName = "PremiumCardFooter"

export {
  PremiumCard,
  PremiumCardHeader,
  PremiumCardFooter,
  PremiumCardTitle,
  PremiumCardDescription,
  PremiumCardContent,
}