import React from "react"
import { Search } from "lucide-react"

export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void
  containerClassName?: string
}

export function SearchBar({ 
  onSearch, 
  containerClassName = "", 
  className = "",
  placeholder = "Search...",
  ...props 
}: SearchBarProps) {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearch) {
      onSearch(e.target.value)
    }
    if (props.onChange) {
      props.onChange(e)
    }
  }

  return (
    <div className={`relative flex items-center ${containerClassName}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="search"
        placeholder={placeholder}
        onChange={handleChange}
        className={`flex h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    </div>
  )
}
