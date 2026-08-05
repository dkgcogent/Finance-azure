import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import AppLayout from "@/components/layout/AppLayout"
import BudgetLayout from "@/features/budgeting/components/BudgetLayout"
import ActualLayout from "@/features/actual/components/ActualLayout"

// Lazy loaded pages
const Dashboard = React.lazy(() => import("@/features/core/pages/Dashboard"))
const Budget = React.lazy(() => import("@/features/budgeting/pages/Budget"))
const BudgetDetails = React.lazy(() => import("@/features/budgeting/pages/BudgetDetails"))
const BudgetVsActual = React.lazy(() => import("@/features/budgeting/pages/BudgetVsActual"))
const RevenueDirectExpense = React.lazy(() => import("@/features/budgeting/pages/RevenueDirectExpense"))
const CorporateExpenses = React.lazy(() => import("@/features/budgeting/pages/CorporateExpenses"))
const Salary = React.lazy(() => import("@/features/budgeting/pages/Salary"))
const BankCharges = React.lazy(() => import("@/features/budgeting/pages/BankCharges"))
const Depreciation = React.lazy(() => import("@/features/budgeting/pages/Depreciation"))
const CustomerInvoice = React.lazy(() => import("@/features/invoicing/pages/CustomerInvoice"))
const VendorBills = React.lazy(() => import("@/features/payables/pages/VendorBillsList"))
const GlobalInvoiceMaster = React.lazy(() => import("@/features/invoicing/pages/GlobalInvoiceMaster"))
const PaymentSheet = React.lazy(() => import("@/features/payables/pages/PaymentSheet"))
const VendorPaymentSheet = React.lazy(() => import("@/features/payables/pages/VendorPaymentSheet"))
const SalaryPaymentSheet = React.lazy(() => import("@/features/payables/pages/SalaryPaymentSheet"))
const CNDNManagement = React.lazy(() => import("@/features/notes/pages/CNDNManagement"))
const Imprest = React.lazy(() => import("@/features/payables/pages/Imprest"))
const AdhocVehicles = React.lazy(() => import("@/features/payables/pages/AdhocVehicles"))
const VendorCNDNManagement = React.lazy(() => import("@/features/notes/pages/VendorCNDNManagement"))
const Approvals = React.lazy(() => import("@/features/core/pages/Approvals"))
const FinanceDashboard = React.lazy(() => import("@/features/reporting/pages/FinanceDashboard"))
const MisDashboard = React.lazy(() => import("@/features/reporting/pages/MisDashboard"))
const ReportsHub = React.lazy(() => import("@/features/reporting/pages/ReportsHub"))
const Reports = React.lazy(() => import("@/features/reporting/pages/Reports"))
const ProfitAndLoss = React.lazy(() => import("@/features/budgeting/pages/ProfitAndLoss"))
const Summary = React.lazy(() => import("@/features/budgeting/pages/Summary"))

// New Imprest & Payables Pages
const PayablesHub = React.lazy(() => import("@/features/payables/pages/Payables"))
const ImprestList = React.lazy(() => import("@/features/payables/pages/ImprestList"))
const NewImprestRequest = React.lazy(() => import("@/features/payables/pages/NewImprestRequest"))

// New Invoicing Pages
const InvoiceHub = React.lazy(() => import("@/features/invoicing/pages/Invoice"))

// New Approvals Pages
const ImprestApprovals = React.lazy(() => import("@/features/core/pages/ImprestApprovals"))
const PaymentSheetFirstApproval = React.lazy(() => import("@/features/core/pages/PaymentSheetFirstApproval"))
const PaymentSheetFinalApproval = React.lazy(() => import("@/features/core/pages/PaymentSheetFinalApproval"))


// Actual module lazy imports
const Actual = React.lazy(() => import("@/features/actual/pages/Actual"))
const ActualDetails = React.lazy(() => import("@/features/actual/pages/ActualDetails"))
const ActualRevenueDirectExpense = React.lazy(() => import("@/features/actual/pages/RevenueDirectExpense"))
const ActualCorporateExpenses = React.lazy(() => import("@/features/actual/pages/CorporateExpenses"))
const ActualSalary = React.lazy(() => import("@/features/actual/pages/Salary"))
const ActualBankCharges = React.lazy(() => import("@/features/actual/pages/BankCharges"))
const ActualProfitAndLoss = React.lazy(() => import("@/features/actual/pages/ProfitAndLoss"))
const ActualSummary = React.lazy(() => import("@/features/actual/pages/Summary"))
const ActualDepreciation = React.lazy(() => import("@/features/actual/pages/Depreciation"))
const ActualVSBudget = React.lazy(() => import("@/features/actual-vs-budget/pages/ActualVSBudget"))
const RecordKeeping = React.lazy(() => import("@/features/reporting/pages/RecordKeeping"))
const VehicleCostSheet = React.lazy(() => import("@/features/payables/pages/VehicleCostSheet"))

// Placeholders for other pages
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex h-[80vh] items-center justify-center">
    <h1 className="text-3xl font-bold text-muted-foreground">{title}</h1>
  </div>
)
const Login = React.lazy(() => import("@/features/auth/pages/Login"))

import { useAuth } from "@/contexts/AuthContext"
import { useLocation } from "react-router-dom"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Enforce Employee role restrictions directly based on path
  if (role === "employee" && !location.pathname.startsWith("/imprest")) {
    return <Navigate to="/imprest" replace />;
  }
  
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><Login /></React.Suspense>} />
        
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/budget" replace />} />
          <Route path="/budget" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><Budget /></React.Suspense>} />
          
          <Route element={<BudgetLayout />}>
            <Route path="/budget/summary" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><Summary /></React.Suspense>} />
            <Route path="/budget/revenue" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><RevenueDirectExpense /></React.Suspense>} />
            <Route path="/budget/corporate" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><CorporateExpenses /></React.Suspense>} />
            <Route path="/budget/salary" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><Salary /></React.Suspense>} />
            <Route path="/budget/bank-charges" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><BankCharges /></React.Suspense>} />
            <Route path="/budget/depreciation" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><Depreciation /></React.Suspense>} />
            <Route path="/budget/pnl" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ProfitAndLoss /></React.Suspense>} />
            <Route path="/budget/:id" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><BudgetDetails /></React.Suspense>} />
          </Route>

          <Route path="/budget-vs-actual" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><BudgetVsActual /></React.Suspense>} />
          <Route path="/invoice" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><InvoiceHub /></React.Suspense>} />
          <Route path="/customer-invoice" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><CustomerInvoice /></React.Suspense>} />
          <Route path="/payables" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><PayablesHub /></React.Suspense>} />
          <Route path="/vendor-bills" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><VendorBills /></React.Suspense>} />
          <Route path="/invoice-master" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><GlobalInvoiceMaster /></React.Suspense>} />
          <Route path="/payment-sheet" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><PaymentSheet /></React.Suspense>} />
          <Route path="/vendor-payment-sheet" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><VendorPaymentSheet /></React.Suspense>} />
          <Route path="/salary-payment-sheet" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><SalaryPaymentSheet /></React.Suspense>} />
          <Route path="/adhoc-vehicles" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><AdhocVehicles /></React.Suspense>} />
          <Route path="/cn-dn" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><CNDNManagement /></React.Suspense>} />
          <Route path="/vendor-cn-dn" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><VendorCNDNManagement /></React.Suspense>} />
          <Route path="/imprest" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><Imprest /></React.Suspense>} />
          <Route path="/imprest/list" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ImprestList /></React.Suspense>} />
          <Route path="/imprest/new" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><NewImprestRequest /></React.Suspense>} />
          <Route path="/approvals" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><Approvals /></React.Suspense>} />
          <Route path="/approvals/imprest" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ImprestApprovals /></React.Suspense>} />
          <Route path="/approvals/payment-sheet-first" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><PaymentSheetFirstApproval /></React.Suspense>} />
          <Route path="/approvals/payment-sheet-final" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><PaymentSheetFinalApproval /></React.Suspense>} />
          <Route path="/reports" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ReportsHub /></React.Suspense>} />
          <Route path="/reports/suite" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><Reports /></React.Suspense>} />
          <Route path="/reports/mis" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><MisDashboard /></React.Suspense>} />
          <Route path="/reports/finance" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><FinanceDashboard /></React.Suspense>} />
          <Route path="/record-keeping" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><RecordKeeping /></React.Suspense>} />
          <Route path="/vehicles" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><VehicleCostSheet /></React.Suspense>} />

          {/* Actual Module Routes */}
          <Route element={<ActualLayout />}>
            <Route path="/actual" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><Actual /></React.Suspense>} />
            <Route path="/actual/revenue" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ActualRevenueDirectExpense /></React.Suspense>} />
            <Route path="/actual/corporate" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ActualCorporateExpenses /></React.Suspense>} />
            <Route path="/actual/salary" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ActualSalary /></React.Suspense>} />
            <Route path="/actual/bank-charges" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ActualBankCharges /></React.Suspense>} />
            <Route path="/actual/depreciation" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ActualDepreciation /></React.Suspense>} />
            <Route path="/actual/:id" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ActualDetails /></React.Suspense>} />
            <Route path="/actual/pnl" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ActualProfitAndLoss /></React.Suspense>} />
            <Route path="/actual/summary" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ActualSummary /></React.Suspense>} />
          </Route>
          <Route path="/actual-vs-budget" element={<React.Suspense fallback={<div className="p-8">Loading...</div>}><ActualVSBudget /></React.Suspense>} />
          <Route path="*" element={<Placeholder title="404 Not Found" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
