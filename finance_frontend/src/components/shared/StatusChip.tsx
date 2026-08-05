import React from "react"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Info,
  CircleDashed
} from "lucide-react"

export type StatusVariant = "success" | "warning" | "destructive" | "info" | "neutral" | "draft"

export interface StatusChipProps {
  status: string
  variant?: StatusVariant
  showIcon?: boolean
  className?: string
}

export function StatusChip({ 
  status, 
  variant, 
  showIcon = true,
  className = "" 
}: StatusChipProps) {
  
  // Auto-resolve variant if not explicitly provided
  let resolvedVariant = variant || "neutral"
  
  if (!variant) {
    const s = status.toLowerCase()
    if (s.includes("approved") || s.includes("paid") || s.includes("success") || s.includes("settled")) {
      resolvedVariant = "success"
    } else if (s.includes("rejected") || s.includes("failed") || s.includes("cancelled") || s.includes("exceeded")) {
      resolvedVariant = "destructive"
    } else if (s.includes("pending") || s.includes("warning") || s.includes("waiting")) {
      resolvedVariant = "warning"
    } else if (s.includes("draft") || s.includes("created")) {
      resolvedVariant = "draft"
    } else if (s.includes("info") || s.includes("sent")) {
      resolvedVariant = "info"
    }
  }

  // Map variant to badge variant prop
  let badgeVariant: "default" | "secondary" | "destructive" | "outline" | "success" = "default"
  
  switch (resolvedVariant) {
    case "success": badgeVariant = "success"; break;
    case "destructive": badgeVariant = "destructive"; break;
    case "warning": badgeVariant = "secondary"; break;
    case "info": badgeVariant = "default"; break;
    case "draft": badgeVariant = "outline"; break;
    case "neutral": badgeVariant = "secondary"; break;
  }

  const renderIcon = () => {
    if (!showIcon) return null
    
    const iconClass = "w-3 h-3 mr-1.5"
    
    switch (resolvedVariant) {
      case "success": return <CheckCircle2 className={iconClass} />
      case "destructive": return <XCircle className={iconClass} />
      case "warning": return <AlertCircle className={iconClass} />
      case "info": return <Info className={iconClass} />
      case "draft": return <CircleDashed className={iconClass} />
      case "neutral": return <Clock className={iconClass} />
    }
  }

  // Special coloring for warning since we map it to secondary usually
  const extraClasses = resolvedVariant === "warning" 
    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30" 
    : resolvedVariant === "info"
    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
    : ""

  return (
    <Badge 
      variant={badgeVariant} 
      className={`flex items-center w-fit ${extraClasses} ${className}`}
    >
      {renderIcon()}
      {status}
    </Badge>
  )
}
