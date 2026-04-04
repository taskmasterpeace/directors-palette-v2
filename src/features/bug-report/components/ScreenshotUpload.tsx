'use client'

import { useCallback, useRef, useState } from 'react'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

interface ScreenshotUploadProps {
  file: File | null
  onFileChange: (file: File | null) => void
}

export function ScreenshotUpload({ file, onFileChange }: ScreenshotUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const validateAndSet = useCallback((f: File) => {
    setError(null)
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Please use PNG, JPEG, WebP, or GIF')
      return
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError(`File must be under ${MAX_SIZE_MB}MB`)
      return
    }
    onFileChange(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }, [onFileChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndSet(f)
  }, [validateAndSet])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) validateAndSet(f)
  }, [validateAndSet])

  const removeFile = useCallback(() => {
    onFileChange(null)
    setPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [onFileChange])

  if (preview && file) {
    return (
      <div
        className="relative rounded-lg overflow-hidden border"
        style={{ borderColor: 'oklch(0.28 0.04 200)' }}
      >
        <img src={preview} alt="Screenshot preview" className="w-full max-h-36 object-cover" />
        <button
          type="button"
          onClick={removeFile}
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 hover:scale-110"
          style={{
            background: 'oklch(0.2 0.04 200 / 0.9)',
            color: 'oklch(0.8 0.02 200)',
            backdropFilter: 'blur(4px)',
            border: '1px solid oklch(0.35 0.04 200)',
          }}
        >
          &times;
        </button>
        <div
          className="px-3 py-1.5 text-xs truncate flex items-center gap-1.5"
          style={{ background: 'oklch(0.12 0.015 200)', color: 'oklch(0.55 0.03 200)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {file.name} ({(file.size / 1024).toFixed(0)}KB)
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        className="flex flex-col items-center justify-center gap-2 py-5 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200"
        style={{
          borderColor: dragOver ? 'oklch(0.55 0.15 200)' : 'oklch(0.25 0.03 200)',
          background: dragOver ? 'oklch(0.16 0.03 200)' : 'oklch(0.12 0.015 200)',
          color: 'oklch(0.5 0.04 200)',
        }}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg"
          style={{ background: 'oklch(0.2 0.03 200)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(0.55 0.08 200)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        <span className="text-xs">Drop a screenshot or click to browse</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileInput}
      />
      {error && (
        <p className="text-xs mt-1.5" style={{ color: 'oklch(0.65 0.2 25)' }}>{error}</p>
      )}
    </div>
  )
}
