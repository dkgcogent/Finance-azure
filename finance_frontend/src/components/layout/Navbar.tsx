import React, { useState, useEffect } from "react"
import { Search, Bell, HelpCircle, Sun, Moon, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAuth, Role } from "@/contexts/AuthContext"

interface NavbarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  isMobile: boolean
}

export function Navbar({ sidebarOpen, setSidebarOpen, isMobile }: NavbarProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const { role, setRole } = useAuth()

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300"
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="shrink-0"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
        <div className="hidden max-w-md flex-1 md:flex">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search anything..."
              className="w-full rounded-full bg-muted pl-9 focus-visible:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "light" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>
        <div className="relative">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </div>
        <div className="flex items-center gap-2 border-l pl-4 ml-2">
          <select 
            className="text-sm bg-transparent border-none font-medium focus:ring-0 cursor-pointer"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="Admin">Admin</option>
            <option value="Billing Executive">Billing Exec</option>
            <option value="Operations Head">Ops Head</option>
            <option value="CEO">CEO</option>
          </select>
          <div className="h-8 w-8 overflow-hidden rounded-full border bg-muted">
            <img
              src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=b6e3f4"
              alt="User avatar"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
