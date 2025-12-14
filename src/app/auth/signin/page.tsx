'use client'

import { useState, useEffect } from 'react'
import { SignInForm } from '@/features/auth/components/SignInForm'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'

// Background images to rotate on desktop (admin configurable via database later)
const backgroundImages = [
  '/landing/login-bg-1.png',      // User provided image
  '/landing/9-shot-cinematic.png',
  '/landing/app-results-1.png',
]

// Portrait image for mobile
const mobileBackgroundImage = '/landing/mobile-login-bg.png'

export default function SignInPage() {
  const [currentBg, setCurrentBg] = useState(0)

  // Rotate backgrounds every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgroundImages.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      {/* Desktop: Rotating background images - LESS BLUR */}
      <div className="hidden md:block absolute inset-0 overflow-hidden">
        {backgroundImages.map((src, idx) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            className={`object-cover blur-[2px] transition-opacity duration-1000 ${idx === currentBg ? 'opacity-100' : 'opacity-0'
              }`}
            priority={idx === 0}
          />
        ))}
        {/* Lighter dark overlay - less black */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Mobile: Static portrait image - LESS BLUR */}
      <div className="md:hidden absolute inset-0 overflow-hidden">
        <Image
          src={mobileBackgroundImage}
          alt=""
          fill
          className="object-cover blur-[2px]"
          priority
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Back to Landing Link */}
      <div className="absolute top-4 left-4 z-20">
        <Link
          href="/landing"
          className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      {/* Login Modal - more transparent so background shows through */}
      <div className="relative z-10 bg-card/80 backdrop-blur-sm text-card-foreground p-8 rounded-lg shadow-2xl w-full max-w-md border border-border/50">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Image
              src="/favicon.ico"
              alt="Directors Palette"
              width={48}
              height={48}
            />
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">
                Directors Palette
              </h1>
              <Badge variant="outline" className="text-amber-500 border-amber-500/50 text-xs">
                Beta
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground text-center text-sm">
            Where vision becomes visual
          </p>
        </div>

        <p className="text-gray-400 text-center mb-8">
          Sign in to access your account
        </p>

        <SignInForm />
      </div>
    </div>
  )
}
