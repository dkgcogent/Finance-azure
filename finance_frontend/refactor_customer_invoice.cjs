const fs = require('fs');
const path = require('path');

// 1. Create API Service
const apiDir = path.join(__dirname, 'src/features/invoicing/api');
if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir, { recursive: true });

const serviceContent = `import { mockVendorBillsData } from "@/features/payables/pages/VendorBillsList";

export type Invoice = {
  id: string
  invoiceNumber: string
  customerName: string
  date: string
  dueDate: string
  amount: number
  status: "Paid" | "Pending" | "Overdue" | "Draft" | "Cancelled"
  format: string
  annexure?: string
}

export const mockData: Invoice[] = [
  { id: "1", invoiceNumber: "INV-2024-001", customerName: "Acme Corp", date: "2024-03-01", dueDate: "2024-03-31", amount: 15400.50, status: "Paid", format: "Standard Format" },
  { id: "2", invoiceNumber: "INV-2024-002", customerName: "Globex Inc", date: "2024-03-15", dueDate: "2024-04-14", amount: 8900.00, status: "Pending", format: "Logistics (with Annexure)", annexure: "Vehicle details and trip logs attached as per SLA." },
  { id: "3", invoiceNumber: "INV-2024-003", customerName: "Soylent Corp", date: "2024-02-10", dueDate: "2024-03-11", amount: 45000.00, status: "Overdue", format: "Standard Format" },
  { id: "4", invoiceNumber: "INV-2024-004", customerName: "Initech", date: "2024-03-20", dueDate: "2024-04-19", amount: 1250.00, status: "Draft", format: "Consulting Format" },
  { id: "5", invoiceNumber: "INV-2024-005", customerName: "Umbrella Corp", date: "2024-03-22", dueDate: "2024-04-21", amount: 56000.00, status: "Pending", format: "Standard Format" },
];

export const fetchCustomerInvoices = async (financialYear: string): Promise<Invoice[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const saved = localStorage.getItem("customerInvoices");
      let data = mockData;
      if (saved) {
        try {
          data = JSON.parse(saved);
        } catch (e) {}
      }
      resolve(data);
    }, 500);
  });
};

export const createCustomerInvoice = async (invoiceCustomer: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const saved = localStorage.getItem("customerInvoices");
      let invoices = mockData;
      if (saved) {
        try { invoices = JSON.parse(saved); } catch (e) {}
      }

      const newInvoice: Invoice = {
        id: String(invoices.length + 1),
        invoiceNumber: \`INV-2025-00\${invoices.length + 1}\`,
        customerName: invoiceCustomer ? invoiceCustomer.charAt(0).toUpperCase() + invoiceCustomer.slice(1) : "New Customer",
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: invoiceCustomer === "reliance" ? 562346.60 : 315497.00,
        status: "Pending",
        format: "Standard Format",
      }
      const updatedInvoices = [newInvoice, ...invoices]
      localStorage.setItem("customerInvoices", JSON.stringify(updatedInvoices))

      const savedBills = localStorage.getItem("vendorBills")
      let bills = []
      if (savedBills) {
        try { bills = JSON.parse(savedBills) } catch (e) { bills = mockVendorBillsData }
      } else {
        bills = mockVendorBillsData
      }

      const newVendorBill = {
        id: String(bills.length + 1),
        billNumber: \`BILL-2025-00\${bills.length + 1}\`,
        vendorName: invoiceCustomer ? invoiceCustomer.charAt(0).toUpperCase() + invoiceCustomer.slice(1) : "Auto-Generated Vendor",
        date: newInvoice.date,
        dueDate: newInvoice.dueDate,
        amount: newInvoice.amount,
        status: "Pending Verification"
      }
      const updatedBills = [newVendorBill, ...bills]
      localStorage.setItem("vendorBills", JSON.stringify(updatedBills))

      resolve(newInvoice);
    }, 500);
  });
};
`;
fs.writeFileSync(path.join(apiDir, 'customerInvoiceService.ts'), serviceContent);

// 2. Create Hook
const hooksDir = path.join(__dirname, 'src/features/invoicing/hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const hookContent = `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCustomerInvoices, createCustomerInvoice } from '../api/customerInvoiceService';

export const useCustomerInvoices = (financialYear: string) => {
  return useQuery({
    queryKey: ['customer-invoices', financialYear],
    queryFn: () => fetchCustomerInvoices(financialYear),
    enabled: !!financialYear,
  });
};

export const useCreateCustomerInvoice = (financialYear: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerName: string) => createCustomerInvoice(customerName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-invoices', financialYear] });
    },
  });
};
`;
fs.writeFileSync(path.join(hooksDir, 'useCustomerInvoices.ts'), hookContent);

// 3. Modifying CustomerInvoice.tsx
const componentPath = path.join(__dirname, 'src/features/invoicing/pages/CustomerInvoice.tsx');
let componentCode = fs.readFileSync(componentPath, 'utf8');

// Replace imports
componentCode = componentCode.replace(
  `import {
  Download,
  Plus,
  FileText,
  MoreHorizontal,
  X,
  Printer,
  CheckCircle2,
  Clock,
  Send,
  Ban,
  ArrowLeft
} from "lucide-react"`,
  `import {
  Download,
  Plus,
  FileText,
  MoreHorizontal,
  X,
  Printer,
  CheckCircle2,
  Clock,
  Send,
  Ban,
  ArrowLeft,
  Loader2
} from "lucide-react"
import { useGlobalStore } from "@/store/useGlobalStore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCustomerInvoices, useCreateCustomerInvoice } from "../hooks/useCustomerInvoices"
import { Invoice } from "../api/customerInvoiceService"`
);

// Remove local mockData and type Invoice
componentCode = componentCode.replace(/type Invoice = \{[\s\S]*?\]/g, "");

// Replace handleAddInvoice
const oldHandleAddBlock = `  const { canCreateInvoice } = usePermissions()
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem("customerInvoices")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error("Failed to parse customerInvoices from localStorage", e)
      }
    }
    return mockData
  })

  const handleAddInvoice = () => {
    const newInvoice: Invoice = {
      id: String(invoices.length + 1),
      invoiceNumber: \`INV-2025-00\${invoices.length + 1}\`,
      customerName: invoiceCustomer ? invoiceCustomer.charAt(0).toUpperCase() + invoiceCustomer.slice(1) : "New Customer",
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: invoiceCustomer === "reliance" ? 562346.60 : 315497.00,
      status: "Pending",
      format: "Standard Format",
    }
    const updatedInvoices = [newInvoice, ...invoices]
    setInvoices(updatedInvoices)
    localStorage.setItem("customerInvoices", JSON.stringify(updatedInvoices))

    // Automatically create a corresponding Vendor Bill
    const savedBills = localStorage.getItem("vendorBills")
    let bills = []
    if (savedBills) {
      try {
        bills = JSON.parse(savedBills)
      } catch (e) {
        bills = mockVendorBillsData
      }
    } else {
      bills = mockVendorBillsData
    }

    const newVendorBill = {
      id: String(bills.length + 1),
      billNumber: \`BILL-2025-00\${bills.length + 1}\`,
      vendorName: invoiceCustomer ? invoiceCustomer.charAt(0).toUpperCase() + invoiceCustomer.slice(1) : "Auto-Generated Vendor",
      date: newInvoice.date,
      dueDate: newInvoice.dueDate,
      amount: newInvoice.amount,
      status: "Pending Verification"
    }

    const updatedBills = [newVendorBill, ...bills]
    localStorage.setItem("vendorBills", JSON.stringify(updatedBills))

    setView("list")
    setCreateStep("details")

    // Clear form
    setInvoiceCustomer("")
    setInvoiceLocation("")
    setInvoiceType("")
    setInvoiceProject("")
    setInvoiceSubProject("")
  }`;

const newHandleAddBlock = `  const { canCreateInvoice } = usePermissions()
  const { financialYear, setFinancialYear } = useGlobalStore()
  const { data: invoices = [], isLoading } = useCustomerInvoices(financialYear)
  const createInvoiceMutation = useCreateCustomerInvoice(financialYear)

  const handleAddInvoice = () => {
    createInvoiceMutation.mutate(invoiceCustomer, {
      onSuccess: () => {
        setView("list")
        setCreateStep("details")
        setInvoiceCustomer("")
        setInvoiceLocation("")
        setInvoiceType("")
        setInvoiceProject("")
        setInvoiceSubProject("")
      }
    })
  }`;

componentCode = componentCode.replace(oldHandleAddBlock, newHandleAddBlock);


const headerOld = `          <div className="flex items-center gap-2">

            {canCreateInvoice && (
              <Button size="sm" onClick={() => setView("create")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            )}
          </div>`;

const headerNew = `          <div className="flex items-center gap-2">
            <Select value={financialYear} onValueChange={(val) => setFinancialYear(val || "")}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Financial Year" />
              </SelectTrigger>
              <SelectContent>
                {["2025-2026", "2026-2027", "2027-2028"].map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canCreateInvoice && (
              <Button size="sm" onClick={() => setView("create")} disabled={createInvoiceMutation.isPending}>
                {createInvoiceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Invoice
              </Button>
            )}
          </div>`;

componentCode = componentCode.replace(headerOld, headerNew);


const tableOld = `          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>A list of recent invoices generated for your customers.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={invoices} />
            </CardContent>
          </Card>`;

const tableNew = `          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>A list of recent invoices generated for your customers.</CardDescription>
            </CardHeader>
            <CardContent className="relative min-h-[300px]">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              )}
              <DataTable columns={columns} data={invoices} />
            </CardContent>
          </Card>`;

componentCode = componentCode.replace(tableOld, tableNew);

fs.writeFileSync(componentPath, componentCode);
console.log('Customer Invoice Refactored!');
