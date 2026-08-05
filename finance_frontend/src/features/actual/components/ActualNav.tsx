import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

const actualModules = [
  {
    title: "Summary",
    path: "/actual/summary",
  },
  {
    title: "Revenue & Direct Expense",
    path: "/actual/revenue",
  },
  {
    title: "Corporate Expenses",
    path: "/actual/corporate",
  },
  {
    title: "Salary",
    path: "/actual/salary",
  },
  {
    title: "Bank Charges",
    path: "/actual/bank-charges",
  },
  {
    title: "Depreciation",
    path: "/actual/depreciation",
  }
]

export function ActualNav() {
  const location = useLocation()

  if (location.pathname === "/actual") return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b pb-4">
      {actualModules.map((module) => (
        <Link
          key={module.path}
          to={module.path}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted",
            location.pathname === module.path
              ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              : "text-muted-foreground"
          )}
        >
          {module.title}
        </Link>
      ))}
    </div>
  )
}
