'use client'

import { Copy, Check, FileText } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'

export function SunoPromptPreview() {
  const { sunoPrompt, promptCharCount, settings } = useSoundStudioStore()
  const [copied, setCopied] = useState(false)

  const charColor =
    promptCharCount === 0
      ? 'text-[oklch(0.45_0.03_55)]'
      : promptCharCount < 500
        ? 'text-emerald-400'
        : promptCharCount < 800
          ? 'text-yellow-400'
          : 'text-red-400'

  const charBgColor =
    promptCharCount === 0
      ? 'bg-[oklch(0.25_0.03_55)]'
      : promptCharCount < 500
        ? 'bg-emerald-500/10'
        : promptCharCount < 800
          ? 'bg-yellow-500/10'
          : 'bg-red-500/10'

  const handleCopy = useCallback(async () => {
    if (!sunoPrompt) return
    try {
      await navigator.clipboard.writeText(sunoPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = sunoPrompt
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [sunoPrompt])

  const hasNegativeTags = settings.negativeTags.length > 0

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-[oklch(0.88_0.02_55)] tracking-[-0.025em]">
          Suno Prompt
        </h3>

        <div className="ml-auto flex items-center gap-2">
          {/* Character count */}
          <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${charBgColor} ${charColor}`}>
            {promptCharCount}
          </span>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            disabled={!sunoPrompt}
            className="p-1.5 rounded-lg hover:bg-[oklch(0.28_0.03_55)] transition-colors disabled:opacity-30"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-[oklch(0.55_0.04_55)]" />
            )}
          </button>
        </div>
      </div>

      {/* Preview card */}
      <div className="p-4 rounded-[0.625rem] border border-[oklch(0.30_0.03_55)] bg-[oklch(0.15_0.015_55)]">
        {sunoPrompt ? (
          <pre className="text-sm font-mono text-[oklch(0.78_0.02_55)] leading-relaxed whitespace-pre-wrap break-words">
            {sunoPrompt}
          </pre>
        ) : (
          <p className="text-sm font-mono text-[oklch(0.40_0.03_55)] italic">
            Configure genre, instruments, mood, and BPM above to generate prompt...
          </p>
        )}

        {/* Negative tags */}
        {hasNegativeTags && (
          <div className="mt-3 pt-3 border-t border-[oklch(0.25_0.025_55)]">
            <p className="text-[10px] uppercase tracking-wider text-[oklch(0.40_0.03_55)] mb-1.5">
              Negative tags
            </p>
            <div className="flex flex-wrap gap-1">
              {settings.negativeTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-[11px] font-mono text-[oklch(0.50_0.03_55)] bg-[oklch(0.20_0.02_55)] border border-[oklch(0.25_0.025_55)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
