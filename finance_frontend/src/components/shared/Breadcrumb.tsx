import React from "react"
import { ChevronRight, Home } from "lucide-react"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav className={`flex items-center text-sm text-muted-foreground ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1 md:space-x-2">
        <li className="inline-flex items-center">
          <a href="/" className="inline-flex items-center hover:text-foreground transition-colors">
            <Home className="w-3.5 h-3.5 mr-2" />
            Home
          </a>
        </li>
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          
          return (
            <li key={index}>
              <div className="flex items-center">
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 mx-1" />
                {isLast || !item.href ? (
                  <span className="font-medium text-foreground ml-1">{item.label}</span>
                ) : (
                  <a href={item.href} className="ml-1 hover:text-foreground transition-colors">
                    {item.label}
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
