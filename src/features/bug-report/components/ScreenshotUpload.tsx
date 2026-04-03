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
      <div className="relative rounded-[0.625rem] overflow-hidden border"
        style={{ borderColor: 'oklch(0.32 0.03 200)' }}>
        <img src={preview} alt="Screenshot preview" className="w-full max-h-40 object-cover" />
        <button
          type="button"
          onClick={removeFile}
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors"
          style={{
            background: 'oklch(0.22 0.025 200)',
            color: 'oklch(0.85 0.02 200)',
          }}
        >
          &times;
        </button>
        <div className="px-3 py-1.5 text-xs truncate"
          style={{ background: 'oklch(0.18 0.02 200)', color: 'oklch(0.65 0.04 200)' }}>
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
        className="flex flex-col items-center justify-center gap-1.5 py-6 rounded-[0.625rem] border-2 border-dashed cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? 'oklch(0.6 0.2 200)' : 'oklch(0.32 0.03 200)',
          background: dragOver ? 'oklch(0.2 0.03 200)' : 'transparent',
          color: 'oklch(0.65 0.04 200)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
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
