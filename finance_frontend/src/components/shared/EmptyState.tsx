import React from "react"
import { FolderX } from "lucide-react"

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ 
  title, 
  description, 
  icon, 
  action, 
  className = "" 
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 md:p-12 text-center border rounded-lg border-dashed bg-muted/10 ${className}`}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/30 text-muted-foreground mb-4">
        {icon || <FolderX className="h-10 w-10 opacity-60" />}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  )
}
