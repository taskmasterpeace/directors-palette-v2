"use client"

import { cn } from "@/utils/utils"
import Image from "next/image"

interface StepCardProps {
  backgroundImage: string
  children: React.ReactNode
  className?: string
}

export function StepCard({ backgroundImage, children, className }: StepCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border border-zinc-800",
        className
      )}
    >
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <Image
          src={backgroundImage}
          alt=""
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/60 via-zinc-900/70 to-zinc-900/85" />
      </div>

      {/* Content */}
      <div className="relative h-full overflow-auto p-6">
        {children}
      </div>
    </div>
  )
}
