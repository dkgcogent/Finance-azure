import { Outlet } from "react-router-dom"
import { BudgetNav } from "./BudgetNav"

export default function BudgetLayout() {
  return (
    <div className="flex-1 space-y-6 pb-8">
      <BudgetNav />
      <div className="pt-2">
        <Outlet />
      </div>
    </div>
  )
}
