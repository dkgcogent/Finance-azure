import React, { useState } from "react"

export interface Tab {
  id: string
  label: string
  content: React.ReactNode
  icon?: React.ReactNode
}

export interface TabsProps {
  tabs: Tab[]
  defaultTabId?: string
  orientation?: "horizontal" | "vertical"
  variant?: "underline" | "pills" | "enclosed"
  className?: string
}

export function Tabs({ 
  tabs, 
  defaultTabId, 
  orientation = "horizontal", 
  variant = "underline",
  className = "" 
}: TabsProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTabId || tabs[0]?.id)

  const activeContent = tabs.find(t => t.id === activeTab)?.content

  if (orientation === "vertical") {
    return (
      <div className={`flex flex-col md:flex-row gap-6 ${className}`}>
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>
        <div className="flex-1">
          {activeContent}
        </div>
      </div>
    )
  }

  // Horizontal Orientations
  let navClasses = "flex overflow-x-auto gap-2"
  let buttonBaseClasses = "whitespace-nowrap transition-colors text-sm font-medium px-4 py-2"
  
  if (variant === "underline") {
    navClasses = "flex overflow-x-auto border-b"
    buttonBaseClasses = "whitespace-nowrap transition-colors text-sm font-medium px-4 py-2 border-b-2 -mb-px"
  } else if (variant === "enclosed") {
    navClasses = "flex overflow-x-auto border-b rounded-t-lg bg-muted/50 p-1 gap-1"
    buttonBaseClasses = "whitespace-nowrap transition-colors text-sm font-medium px-4 py-2 rounded-md"
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className={navClasses}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          
          let stateClasses = ""
          if (variant === "underline") {
            stateClasses = isActive 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          } else if (variant === "pills" || variant === "enclosed") {
            stateClasses = isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${buttonBaseClasses} ${stateClasses} flex items-center gap-2`}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>
      <div>
        {activeContent}
      </div>
    </div>
  )
}
