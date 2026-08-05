import React from "react"

export interface LoadingSkeletonProps {
  type?: "card" | "table" | "text" | "chart"
  count?: number
  className?: string
}

export function LoadingSkeleton({ type = "text", count = 1, className = "" }: LoadingSkeletonProps) {
  const items = Array.from({ length: count })

  if (type === "card") {
    return (
      <div className={`grid gap-4 md:grid-cols-3 ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 shadow-sm animate-pulse">
            <div className="h-4 w-1/3 bg-muted rounded mb-4"></div>
            <div className="h-8 w-1/2 bg-muted rounded mb-2"></div>
            <div className="h-3 w-1/4 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (type === "table") {
    return (
      <div className={`rounded-md border ${className}`}>
        <div className="border-b bg-muted/20 p-4">
          <div className="h-6 w-1/4 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="p-4 space-y-4">
          {items.map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-4 w-4 bg-muted rounded"></div>
              <div className="h-4 w-1/4 bg-muted rounded"></div>
              <div className="h-4 w-1/3 bg-muted rounded"></div>
              <div className="h-4 w-1/4 bg-muted rounded"></div>
              <div className="h-4 w-8 bg-muted rounded ml-auto"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === "chart") {
    return (
      <div className={`rounded-xl border p-6 h-[300px] flex items-end gap-2 animate-pulse ${className}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div 
            key={i} 
            className="flex-1 bg-muted rounded-t-sm" 
            style={{ height: `${Math.max(20, Math.random() * 100)}%` }} 
          />
        ))}
      </div>
    )
  }

  // Default text skeleton
  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((_, i) => (
        <div 
          key={i} 
          className="h-4 bg-muted rounded animate-pulse" 
          style={{ width: i % 2 === 0 ? '100%' : '80%' }}
        />
      ))}
    </div>
  )
}
