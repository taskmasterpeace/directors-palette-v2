'use client'

import Image from 'next/image'
import Link from 'next/link'

interface SharePageClientProps {
  publicUrl: string | null
  prompt?: string
  model?: string
  source?: string
  createdAt: string
}

export function SharePageClient({ publicUrl, prompt, model, source, createdAt }: SharePageClientProps) {
  if (!publicUrl) return null

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Google Fonts */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/landing"
            className="text-xl tracking-wider text-white hover:text-amber-400 transition-colors"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            DIRECTOR&apos;S PALETTE
          </Link>
          <Link
            href="/landing"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm rounded-lg transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Create Yours Free
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-12">
        <div className="max-w-4xl w-full">
          {/* Image */}
          <div className="relative w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-amber-500/5">
            <Image
              src={publicUrl}
              alt={prompt || 'AI-generated image'}
              width={1200}
              height={675}
              className="w-full h-auto object-contain"
              quality={95}
              priority
            />
          </div>

          {/* Prompt / Details */}
          {prompt && (
            <div className="mt-6 px-1">
              <p
                className="text-white/50 text-xs uppercase tracking-wider mb-2"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Prompt
              </p>
              <p
                className="text-white/80 text-base leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                &ldquo;{prompt}&rdquo;
              </p>
            </div>
          )}

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap gap-3 px-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {model && (
              <span className="text-xs text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {model}
              </span>
            )}
            {source && (
              <span className="text-xs text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/10 capitalize">
                {source.replace('-', ' ')}
              </span>
            )}
            <span className="text-xs text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              {new Date(createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>

          {/* CTA */}
          <div className="mt-10 text-center">
            <Link
              href="/landing"
              className="inline-flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors text-lg"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Create Yours Free
            </Link>
            <p
              className="mt-3 text-white/30 text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              No subscription required
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 py-4">
        <div className="max-w-5xl mx-auto text-center">
          <Link
            href="/landing"
            className="text-white/30 text-sm hover:text-white/50 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            directorspal.com
          </Link>
        </div>
      </footer>
    </div>
  )
}
