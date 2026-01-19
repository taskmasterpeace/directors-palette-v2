"use client"

import { forwardRef, useRef, useCallback, useImperativeHandle } from "react"
import HTMLFlipBook from "react-pageflip"
import Image from "next/image"
import { cn } from "@/utils/utils"
import type { StorybookPage, BookFormat } from "../types/storybook.types"
import { calculateBookDimensions } from "../utils/book-dimensions"
import { PageLayoutRenderer } from "./PageLayoutRenderer"

// Page component must use forwardRef for react-pageflip
interface PageProps {
  page: StorybookPage
  pageNumber: number
}

const Page = forwardRef<HTMLDivElement, PageProps>(({ page, pageNumber }, ref) => {
  return (
    <div ref={ref} className="page bg-white shadow-lg overflow-hidden relative" style={{ width: '100%', height: '100%' }}>
      {/* Use PageLayoutRenderer for all layout types */}
      <PageLayoutRenderer
        layout={page.layout || 'image-with-text'}
        imageUrl={page.imageUrl}
        text={page.text}
        richText={page.richText}
        textPosition={page.textPosition}
      />

      {/* Page Number */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-zinc-400 bg-white/80 px-2 py-0.5 rounded z-10">
        {pageNumber}
      </div>
    </div>
  )
})

Page.displayName = 'Page'

// Cover page component
const CoverPage = forwardRef<HTMLDivElement, { title: string; author?: string; coverUrl?: string }>(
  ({ title, author, coverUrl }, ref) => (
    <div
      ref={ref}
      className="page bg-gradient-to-br from-amber-600 to-amber-800 shadow-lg overflow-hidden"
      style={{ width: '100%', height: '100%' }}
    >
      {coverUrl ? (
        <div className="relative w-full h-full">
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white text-center">
            <h1 className="text-2xl md:text-3xl font-bold font-serif mb-2">{title}</h1>
            {author && <p className="text-lg opacity-80">by {author}</p>}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-8 text-white text-center">
          <h1 className="text-2xl md:text-3xl font-bold font-serif mb-4">{title}</h1>
          {author && <p className="text-lg opacity-80">by {author}</p>}
        </div>
      )}
    </div>
  )
)

CoverPage.displayName = 'CoverPage'

// Back cover
const BackCover = forwardRef<HTMLDivElement, { title: string }>(({ title }, ref) => (
  <div
    ref={ref}
    className="page bg-gradient-to-br from-amber-700 to-amber-900 shadow-lg overflow-hidden"
    style={{ width: '100%', height: '100%' }}
  >
    <div className="flex flex-col items-center justify-center h-full p-8 text-white text-center">
      <p className="text-lg font-serif italic opacity-80">The End</p>
      <p className="mt-4 text-sm opacity-60">{title}</p>
    </div>
  </div>
))

BackCover.displayName = 'BackCover'

// Main BookViewer component
export interface BookViewerRef {
  flipToPage: (pageIndex: number) => void
  flipNext: () => void
  flipPrev: () => void
  getCurrentPageIndex: () => number
}

interface BookViewerProps {
  pages: StorybookPage[]
  title: string
  author?: string
  coverUrl?: string
  currentPage?: number
  onPageChange?: (pageIndex: number) => void
  className?: string
  bookFormat?: BookFormat // NEW: Book format for responsive dimensions
}

export const BookViewer = forwardRef<BookViewerRef, BookViewerProps>(({
  pages,
  title,
  author,
  coverUrl,
  currentPage = 0,
  onPageChange,
  className,
  bookFormat = 'square', // Default to square format
}, ref) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRef = useRef<any>(null)

  // Calculate responsive dimensions based on book format
  const dimensions = calculateBookDimensions(bookFormat)

  const handleFlip = useCallback((e: { data?: number }) => {
    // react-pageflip uses 0-based indexing
    // Guard against undefined e.data (can happen during rapid flipping or edge cases)
    if (typeof e.data !== 'number') return
    // We add 1 for cover, so page 0 in data means cover, page 1 means first content page
    const contentPageIndex = Math.max(0, e.data - 1)
    onPageChange?.(contentPageIndex)
  }, [onPageChange])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    flipToPage: (pageIndex: number) => {
      // Add 1 for cover page
      bookRef.current?.pageFlip()?.flip(pageIndex + 1)
    },
    flipNext: () => {
      bookRef.current?.pageFlip()?.flipNext()
    },
    flipPrev: () => {
      bookRef.current?.pageFlip()?.flipPrev()
    },
    getCurrentPageIndex: () => {
      const current = bookRef.current?.pageFlip()?.getCurrentPageIndex() || 0
      return Math.max(0, current - 1)
    },
  }), [])

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <HTMLFlipBook
        ref={bookRef}
        width={dimensions.width}
        height={dimensions.height}
        size="stretch"
        minWidth={dimensions.minWidth}
        maxWidth={dimensions.maxWidth}
        minHeight={Math.round(dimensions.minWidth / dimensions.aspectRatio)}
        maxHeight={Math.round(dimensions.maxWidth / dimensions.aspectRatio)}
        maxShadowOpacity={0.5}
        showCover={true}
        mobileScrollSupport={true}
        onFlip={handleFlip}
        startPage={currentPage + 1} // Add 1 for cover
        drawShadow={true}
        flippingTime={600}
        usePortrait={false}
        startZIndex={0}
        autoSize={true}
        clickEventForward={true}
        useMouseEvents={true}
        swipeDistance={30}
        showPageCorners={true}
        disableFlipByClick={false}
        className="shadow-2xl"
        style={{}}
      >
        {/* Front Cover */}
        <CoverPage title={title} author={author} coverUrl={coverUrl} />

        {/* Content Pages */}
        {pages.map((page, index) => (
          <Page key={page.id} page={page} pageNumber={index + 1} />
        ))}

        {/* Back Cover */}
        <BackCover title={title} />
      </HTMLFlipBook>
    </div>
  )
})

BookViewer.displayName = 'BookViewer'
