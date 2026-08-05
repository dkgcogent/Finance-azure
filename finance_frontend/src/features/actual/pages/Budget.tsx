import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  PieChart,
  TrendingUp,
  Building2,
  Users,
  Landmark
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const ActualModules = [
  {
    title: "Summary",
    description: "High-level overview of all Actual metrics.",
    icon: PieChart,
    path: "/Actual/summary",
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    title: "Revenue & Direct Expense",
    description: "Track income streams and direct operational costs.",
    icon: TrendingUp,
    path: "/Actual/revenue",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  },
  {
    title: "Corporate Expenses",
    description: "Manage organizational and overhead expenditures.",
    icon: Building2,
    path: "/Actual/corporate",
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  },
  {
    title: "Salary",
    description: "Payroll, bonuses, and employee compensation.",
    icon: Users,
    path: "/Actual/salary",
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  },
  {
    title: "Bank Charges",
    description: "Monitor banking fees and transaction costs.",
    icon: Landmark,
    path: "/Actual/bank-charges",
    color: "text-rose-500",
    bg: "bg-rose-500/10"
  }
]

export default function ActualManagement() {
  return (
    <div className="flex-1 space-y-6 pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Actual Management</h2>
        <p className="text-muted-foreground mt-1">
          Select a category to view and manage Actual details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ActualModules.map((module, index) => {
          const Icon = module.icon

          return (
            <Link key={module.title} to={module.path}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <div className={`mb-4 rounded-full p-4 ${module.bg}`}>
                      <Icon className={`h-8 w-8 ${module.color}`} />
                    </div>
                    <h3 className="mb-2 text-xl font-semibold tracking-tight">{module.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
