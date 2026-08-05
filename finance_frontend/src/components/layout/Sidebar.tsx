import React, { useState } from "react"
import { NavLink } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  FileText,
  CreditCard,
  Building,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  PiggyBank,
  FileSpreadsheet,
  CheckSquare,
  Database,
  Archive,
  ShieldCheck,
  Car,
  Landmark,
  Umbrella,
  FileSignature,
  Target,
  Scale,
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface NavItem {
  title: string
  path?: string
  icon?: React.ElementType
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: "Budget ",
    path: "/budget",
    icon: Wallet,
  },
  {
    title: "Actual (P&L)",
    icon: Target,
    path: "/actual",
  },
  {
    title: "Actual VS Budget",
    path: "/actual-vs-budget",
    icon: Scale,
  },
  {
    title: "Invoice",
    path: "/invoice",
    icon: Receipt,
  },
  {
    title: "Imprest",
    path: "/imprest",
    icon: FileText,
  },
  {
    title: "Approvals",
    path: "/approvals",
    icon: CheckSquare,
  },
  {
    title: "Payables",
    path: "/payables",
    icon: CreditCard,
  },
  {
    title: "Invoice Master",
    path: "/invoice-master",
    icon: Users,
  },
]

import { useAuth } from "@/contexts/AuthContext"
import { LogOut } from "lucide-react"

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isMobile: boolean
}

export function Sidebar({ isOpen, setIsOpen, isMobile }: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const { role, logout } = useAuth()

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]
    )
  }

  const sidebarVariants = {
    open: { width: 280, x: 0 },
    closed: { width: 80, x: 0 },
    mobileOpen: { x: 0 },
    mobileClosed: { x: "-100%" },
  }
  
  const filteredNavItems = navItems.filter((item) => {
    if (role === "employee") {
      return item.title === "Imprest";
    }
    return true;
  });

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
      <motion.aside
        initial={isMobile ? "mobileClosed" : "open"}
        animate={
          isMobile ? (isOpen ? "mobileOpen" : "mobileClosed") : isOpen ? "open" : "closed"
        }
        variants={sidebarVariants}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r bg-card text-card-foreground",
          isMobile ? "w-[280px]" : "w-[280px]"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building className="h-5 w-5" />
            </div>
            {(isOpen || isMobile) && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap font-bold text-lg"
              >
                Finance
              </motion.span>
            )}
          </div>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          <nav className="flex flex-col gap-1 px-3">
            {filteredNavItems.map((item) => (
              <NavItem
                key={item.title}
                item={item}
                isOpen={isOpen || isMobile}
                isExpanded={expandedItems.includes(item.title)}
                toggleExpand={() => toggleExpand(item.title)}
              />
            ))}
          </nav>
        </div>
        
        <div className="border-t p-4">
          <Button 
            variant="ghost" 
            className={cn("w-full justify-start gap-3", !isOpen && !isMobile && "justify-center px-2")}
            onClick={logout}
          >
            <LogOut className="h-5 w-5 shrink-0 text-muted-foreground" />
            {(isOpen || isMobile) && <span>Logout</span>}
          </Button>
        </div>
      </motion.aside>
    </>
  )
}

function NavItem({
  item,
  isOpen,
  isExpanded,
  toggleExpand,
}: {
  item: NavItem
  isOpen: boolean
  isExpanded: boolean
  toggleExpand: () => void
}) {
  const Icon = item.icon

  if (item.children) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={toggleExpand}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 hover:text-foreground",
            isExpanded ? "bg-muted/50 text-foreground" : "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-5 w-5 shrink-0" />}
            {isOpen && <span className="whitespace-nowrap">{item.title}</span>}
          </div>
          {isOpen && (
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          )}
        </button>
        <AnimatePresence>
          {isExpanded && isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="ml-9 flex flex-col gap-1 border-l pl-3 pt-1">
                {item.children.map((child) => (
                  <NavLink
                    key={child.path}
                    to={child.path || "#"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-foreground",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted/50"
                      )
                    }
                  >
                    <span className="truncate">{child.title}</span>
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <NavLink
      to={item.path || "#"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 hover:text-foreground",
          isActive
            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            : "text-muted-foreground"
        )
      }
    >
      {Icon && <Icon className="h-5 w-5 shrink-0" />}
      {isOpen && <span className="whitespace-nowrap">{item.title}</span>}
    </NavLink>
  )
}
