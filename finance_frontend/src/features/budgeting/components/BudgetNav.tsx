import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

const budgetModules = [
  {
    title: "Summary",
    path: "/budget/summary",
  },
  {
    title: "Revenue & Direct Expense",
    path: "/budget/revenue",
  },
  {
    title: "Corporate Expenses",
    path: "/budget/corporate",
  },
  {
    title: "Salary",
    path: "/budget/salary",
  },
  {
    title: "Bank Charges",
    path: "/budget/bank-charges",
  },
  {
    title: "Depreciation",
    path: "/budget/depreciation",
  }
]

export function BudgetNav() {
  const location = useLocation()

  if (location.pathname === "/budget") return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b pb-4">
      {budgetModules.map((module) => (
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
