"use client"

import { forwardRef, useRef, useCallback, useImperativeHandle } from "react"
import HTMLFlipBook from "react-pageflip"
import Image from "next/image"
import { cn } from "@/utils/utils"
import type { StorybookPage, TextPosition } from "../types/storybook.types"

// Page component must use forwardRef for react-pageflip
interface PageProps {
  page: StorybookPage
  pageNumber: number
}

const Page = forwardRef<HTMLDivElement, PageProps>(({ page, pageNumber }, ref) => {
  const getTextPositionClasses = (position: TextPosition): string => {
    switch (position) {
      case 'top':
        return 'top-0 left-0 right-0'
      case 'bottom':
        return 'bottom-0 left-0 right-0'
      case 'left':
        return 'left-0 top-0 bottom-0 w-1/3'
      case 'right':
        return 'right-0 top-0 bottom-0 w-1/3'
      default:
        return 'hidden'
    }
  }

  return (
    <div
      ref={ref}
      className="page bg-white shadow-lg overflow-hidden"
      style={{ width: '100%', height: '100%' }}
    >
      <div className="relative w-full h-full">
        {page.imageUrl ? (
          <Image
            src={page.imageUrl}
            alt={`Page ${pageNumber}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center">
            <span className="text-amber-400 text-lg">Page {pageNumber}</span>
          </div>
        )}

        {/* Text Overlay */}
        {page.text && page.textPosition !== 'none' && (
          <div
            className={cn(
              "absolute p-4 bg-white/90 backdrop-blur-sm",
              getTextPositionClasses(page.textPosition)
            )}
          >
            <p className="text-zinc-800 text-sm md:text-base leading-relaxed font-serif">
              {page.text}
            </p>
          </div>
        )}

        {/* Page Number */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-zinc-400 bg-white/80 px-2 py-0.5 rounded">
          {pageNumber}
        </div>
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
}

export const BookViewer = forwardRef<BookViewerRef, BookViewerProps>(({
  pages,
  title,
  author,
  coverUrl,
  currentPage = 0,
  onPageChange,
  className,
}, ref) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRef = useRef<any>(null)

  const handleFlip = useCallback((e: { data: number }) => {
    // react-pageflip uses 0-based indexing
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
        width={400}
        height={533}
        size="stretch"
        minWidth={280}
        maxWidth={600}
        minHeight={373}
        maxHeight={800}
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
