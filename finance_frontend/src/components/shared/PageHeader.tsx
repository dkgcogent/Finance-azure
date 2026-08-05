import React from "react"
import { Breadcrumb, BreadcrumbItem } from "@/components/shared/Breadcrumb"

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ 
  title, 
  description, 
  breadcrumbs, 
  actions, 
  className = "" 
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-4 mb-6 ${className}`}>
      {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
