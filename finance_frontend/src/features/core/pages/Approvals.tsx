import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  FileSignature,
  FileCheck2,
  BadgeDollarSign
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const approvalModules = [
  {
    title: "Level-1 Approvals",
    description: "Review and approve employee imprest requests.",
    icon: FileSignature,
    path: "/approvals/imprest",
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  {
    title: "Level-2 Approvals",
    description: "Initial approval of auto-generated payment sheets by HO Ops Head.",
    icon: FileCheck2,
    path: "/approvals/payment-sheet-first",
    color: "text-amber-500",
    bg: "bg-amber-500/10"
  },
  {
    title: "Final Approvals",
    description: "Final executive sign-off on payment sheets by CEO.",
    icon: BadgeDollarSign,
    path: "/approvals/payment-sheet-final",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  }
]

export default function ApprovalsManagement() {
  return (
    <div className="flex-1 space-y-6 pb-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Approvals Desk</h2>
        <p className="text-muted-foreground mt-1">
          Select a category to review and action pending approvals.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {approvalModules.map((module, index) => {
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
