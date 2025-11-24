'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  console.log(`[Pagination] Rendering with currentPage=${currentPage}, totalPages=${totalPages}`)

  if (totalPages <= 1) {
    console.log(`[Pagination] Hidden because totalPages=${totalPages}`)
    return null
  }

  return (
    <div className="flex flex-col items-center gap-2 mt-4 py-3">
      {/* Page indicator text */}
      <div className="text-sm text-slate-400">
        Page {currentPage} of {totalPages}
      </div>

      {/* Pagination buttons */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log(`[Pagination] Previous clicked: ${currentPage} -> ${currentPage - 1}`)
            onPageChange(currentPage - 1)
          }}
          disabled={currentPage === 1}
          className="min-h-[44px] min-w-[44px]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Show first page, last page, current page, and pages around current
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  className={`min-h-[44px] min-w-[44px] ${page === currentPage ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={() => {
                    console.log(`[Pagination] Page ${page} clicked`)
                    onPageChange(page)
                  }}
                >
                  {page}
                </Button>
              )
            }

            // Show ellipsis for gaps
            if (page === currentPage - 2 || page === currentPage + 2) {
              return (
                <span key={page} className="px-2 text-slate-500">
                  ...
                </span>
              )
            }

            return null
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            console.log(`[Pagination] Next clicked: ${currentPage} -> ${currentPage + 1}`)
            onPageChange(currentPage + 1)
          }}
          disabled={currentPage === totalPages}
          className="min-h-[44px] min-w-[44px]"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}