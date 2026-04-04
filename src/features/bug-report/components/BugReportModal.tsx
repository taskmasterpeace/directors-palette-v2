'use client'

import { useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { ScreenshotUpload } from './ScreenshotUpload'
import { submitBugReport } from '../services/bug-report.service'
import { CATEGORY_LABELS, type BugCategory } from '../types'

interface BugReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MIN_DESCRIPTION = 20
const MAX_DESCRIPTION = 5000

export function BugReportModal({ open, onOpenChange }: BugReportModalProps) {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<BugCategory>('feature')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const pathname = usePathname()
  const { toast } = useToast()

  const isValid = description.trim().length >= MIN_DESCRIPTION

  const handleSubmit = useCallback(async () => {
    if (!isValid || submitting) return
    setSubmitting(true)

    const result = await submitBugReport(description.trim(), category, pathname, screenshot)

    if (result.success) {
      toast({
        title: `Bug report #${result.issueNumber} submitted`,
        description: 'Thank you for the report!',
        variant: 'success' as 'default',
      })
      setDescription('')
      setCategory('feature')
      setScreenshot(null)
      onOpenChange(false)
    } else {
      toast({
        title: 'Failed to submit',
        description: result.error || 'Something went wrong — please try again.',
        variant: 'destructive',
      })
    }

    setSubmitting(false)
  }, [isValid, submitting, description, category, pathname, screenshot, toast, onOpenChange])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="sm:rounded-[0.625rem] max-w-md border p-0 overflow-hidden"
        style={{
          background: 'oklch(0.15 0.02 200)',
          borderColor: 'oklch(0.28 0.04 200)',
          boxShadow: '0 25px 50px oklch(0 0 0 / 0.5), 0 0 0 1px oklch(1 0 0 / 0.05) inset',
        }}
      >
        {/* Header with accent stripe */}
        <div
          className="px-6 pt-5 pb-4"
          style={{
            borderBottom: '1px solid oklch(0.25 0.03 200)',
            background: 'linear-gradient(to bottom, oklch(0.18 0.03 200), oklch(0.15 0.02 200))',
          }}
        >
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle
              className="text-base font-semibold tracking-[-0.025em] flex items-center gap-2.5"
              style={{ color: 'oklch(0.95 0.01 200)' }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ background: 'oklch(0.25 0.06 200)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="oklch(0.7 0.2 200)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" />
                  <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
                  <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
                  <path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
                  <path d="M6 13H2" /><path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
                  <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" /><path d="M22 13h-4" />
                  <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
                </svg>
              </div>
              Report a Bug
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs pl-[2.625rem]" style={{ color: 'oklch(0.55 0.03 200)' }}>
              Help us improve by describing what went wrong.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Form body */}
        <div className="flex flex-col gap-5 px-6 py-5">
          {/* Description */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium tracking-wide uppercase" style={{ color: 'oklch(0.6 0.04 200)', letterSpacing: '0.05em' }}>
              What happened? <span style={{ color: 'oklch(0.65 0.15 200)' }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              placeholder="Describe what went wrong and the steps that led to the problem..."
              rows={4}
              className="w-full rounded-lg border px-3.5 py-3 text-sm resize-none transition-all duration-200 focus:outline-none placeholder:text-[oklch(0.4_0.02_200)]"
              style={{
                background: 'oklch(0.12 0.015 200)',
                borderColor: 'oklch(0.25 0.03 200)',
                color: 'oklch(0.9 0.015 200)',
                boxShadow: 'inset 0 2px 4px oklch(0 0 0 / 0.2)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'oklch(0.5 0.15 200)'
                e.target.style.boxShadow = 'inset 0 2px 4px oklch(0 0 0 / 0.2), 0 0 0 2px oklch(0.5 0.15 200 / 0.2)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'oklch(0.25 0.03 200)'
                e.target.style.boxShadow = 'inset 0 2px 4px oklch(0 0 0 / 0.2)'
              }}
            />
            <div className="flex justify-between text-xs" style={{ color: 'oklch(0.45 0.02 200)' }}>
              <span>
                {description.trim().length < MIN_DESCRIPTION
                  ? `At least ${MIN_DESCRIPTION - description.trim().length} more characters`
                  : '\u00A0'}
              </span>
              <span>{description.length}/{MAX_DESCRIPTION}</span>
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium tracking-wide uppercase" style={{ color: 'oklch(0.6 0.04 200)', letterSpacing: '0.05em' }}>
              Category
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BugCategory)}
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm transition-all duration-200 focus:outline-none appearance-none cursor-pointer"
                style={{
                  background: 'oklch(0.12 0.015 200)',
                  borderColor: 'oklch(0.25 0.03 200)',
                  color: 'oklch(0.9 0.015 200)',
                  boxShadow: 'inset 0 2px 4px oklch(0 0 0 / 0.2)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'oklch(0.5 0.15 200)'
                  e.target.style.boxShadow = 'inset 0 2px 4px oklch(0 0 0 / 0.2), 0 0 0 2px oklch(0.5 0.15 200 / 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'oklch(0.25 0.03 200)'
                  e.target.style.boxShadow = 'inset 0 2px 4px oklch(0 0 0 / 0.2)'
                }}
              >
                {(Object.entries(CATEGORY_LABELS) as [BugCategory, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {/* Custom chevron */}
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="oklch(0.55 0.04 200)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* Screenshot */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium tracking-wide uppercase" style={{ color: 'oklch(0.6 0.04 200)', letterSpacing: '0.05em' }}>
              Screenshot <span className="normal-case tracking-normal font-normal" style={{ color: 'oklch(0.45 0.02 200)' }}>(optional)</span>
            </label>
            <ScreenshotUpload file={screenshot} onFileChange={setScreenshot} />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 justify-end px-6 py-4"
          style={{
            borderTop: '1px solid oklch(0.25 0.03 200)',
            background: 'oklch(0.13 0.015 200)',
          }}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:brightness-125"
            style={{
              color: 'oklch(0.65 0.04 200)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              background: isValid && !submitting
                ? 'linear-gradient(to bottom, oklch(0.65 0.2 200), oklch(0.55 0.2 200))'
                : 'oklch(0.25 0.03 200)',
              color: isValid && !submitting ? 'oklch(0.98 0 200)' : 'oklch(0.45 0.02 200)',
              cursor: isValid && !submitting ? 'pointer' : 'not-allowed',
              boxShadow: isValid && !submitting
                ? '0 1px 3px oklch(0 0 0 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.15)'
                : 'none',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
