import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Users,
  FileText,
  TrendingDown,
  TrendingUp,
  Receipt
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const invoiceModules = [
  {
    title: "Customer Invoices",
    description: "Manage, generate, and track all customer invoices with annexures.",
    icon: FileText,
    path: "/customer-invoice",
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    title: "Customer CN/DN",
    description: "Manage Credit & Debit notes with multi-layer approval workflow.",
    icon: Receipt,
    path: "/cn-dn",
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  },
  {
    title: "Vendor Invoice",
    description: "Manage, generate, and track all vendor invoices.",
    icon: TrendingDown,
    path: "/vendor-bills", // linking to the existing vendor bills page
    color: "text-teal-500",
    bg: "bg-teal-500/10"
  },
  {
    title: "Vendor CN/DN",
    description: "Manage Vendor Credit & Debit notes.",
    icon: TrendingUp,
    path: "/vendor-cn-dn",
    color: "text-orange-500",
    bg: "bg-orange-500/10"
  }
]

export default function InvoiceManagement() {
  return (
    <div className="flex-1 space-y-6 pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Invoice Management</h2>
        <p className="text-muted-foreground mt-1">
          Manage customer invoices, credit/debit notes, and view the invoice master list.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {invoiceModules.map((module, index) => {
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
