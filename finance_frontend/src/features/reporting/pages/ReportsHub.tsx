import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  BarChart,
  LineChart,
  Archive,
  FileSpreadsheet
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const reportsModules = [
  {
    title: "MIS Dashboard",
    description: "Management Information System metrics and KPI tracking.",
    icon: BarChart,
    path: "/reports/mis",
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    title: "Finance Dashboard",
    description: "Financial overview, revenue vs expenses, and cash flow.",
    icon: LineChart,
    path: "/reports/finance",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  },
  {
    title: "Record Keeping Vault",
    description: "Secure storage for all financial records and documents.",
    icon: Archive,
    path: "/record-keeping",
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  },
  {
    title: "Reporting Suite",
    description: "Generate, view, and export professional tabular reports.",
    icon: FileSpreadsheet,
    path: "/reports/suite",
    color: "text-orange-500",
    bg: "bg-orange-500/10"
  }
]

export default function ReportsManagement() {
  return (
    <div className="flex-1 space-y-6 pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
        <p className="text-muted-foreground mt-1">
          Access MIS dashboards, financial reports, and the record keeping vault.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {reportsModules.map((module, index) => {
          const Icon = module.icon

          return (
            <Link key={module.title} to={module.path}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="h-full"
              >
                <Card className="h-full cursor-pointer transition-colors hover:border-primary/50">
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center h-full">
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
