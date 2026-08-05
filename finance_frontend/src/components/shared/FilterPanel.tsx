import React from "react"
import { Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface FilterOption {
  label: string
  value: string
}

export interface FilterGroup {
  id: string
  label: string
  options: FilterOption[]
}

export interface FilterPanelProps {
  groups: FilterGroup[]
  activeFilters: Record<string, string>
  onFilterChange: (groupId: string, value: string) => void
  onClearFilters: () => void
  className?: string
}

export function FilterPanel({ 
  groups, 
  activeFilters, 
  onFilterChange, 
  onClearFilters,
  className = "" 
}: FilterPanelProps) {
  
  const hasActiveFilters = Object.values(activeFilters).some(v => v !== "")

  return (
    <div className={`bg-muted/30 p-4 rounded-lg border flex flex-wrap items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-2">
        <Filter className="h-4 w-4" />
        Filters
      </div>
      
      {groups.map((group) => (
        <select
          key={group.id}
          value={activeFilters[group.id] || ""}
          onChange={(e) => onFilterChange(group.id, e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All {group.label}</option>
          {group.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearFilters}
          className="h-9 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  )
}
