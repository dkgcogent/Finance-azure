import React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  className = "" 
}: PaginationProps) {
  
  if (totalPages <= 1) return null

  const renderPageNumbers = () => {
    const pages: React.ReactNode[] = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`w-9 h-9 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
              currentPage === i 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted"
            }`}
          >
            {i}
          </button>
        )
      }
    } else {
      // Complex logic for ellipsis could go here, simplifying for now
      pages.push(
        <button key={1} onClick={() => onPageChange(1)} className={`w-9 h-9 rounded-md text-sm ${currentPage === 1 ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>1</button>
      )
      
      if (currentPage > 3) {
        pages.push(<div key="e1" className="w-9 h-9 flex items-center justify-center text-muted-foreground"><MoreHorizontal className="h-4 w-4"/></div>)
      }
      
      if (currentPage !== 1 && currentPage !== totalPages) {
        pages.push(
          <button key={currentPage} className="w-9 h-9 rounded-md text-sm bg-primary text-primary-foreground">{currentPage}</button>
        )
      }
      
      if (currentPage < totalPages - 2) {
        pages.push(<div key="e2" className="w-9 h-9 flex items-center justify-center text-muted-foreground"><MoreHorizontal className="h-4 w-4"/></div>)
      }
      
      pages.push(
        <button key={totalPages} onClick={() => onPageChange(totalPages)} className={`w-9 h-9 rounded-md text-sm ${currentPage === totalPages ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{totalPages}</button>
      )
    }
    
    return pages
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <p className="text-sm text-muted-foreground">
        Page <span className="font-medium text-foreground">{currentPage}</span> of <span className="font-medium text-foreground">{totalPages}</span>
      </p>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        {renderPageNumbers()}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
