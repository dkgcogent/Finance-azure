import React, { useMemo, useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api"
import {
  Download,
  Printer,
  Filter,
  Lock,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  ShieldAlert,
  ArrowLeft,
  ChevronDown,
  Loader2
} from "lucide-react"
import { Input } from "@/components/ui/input"
import html2pdf from "html2pdf.js"

type PaymentEntry = {
  id: string
  employeeName: string
  employeeCode: string
  beneficiaryAccountNo: string
  beneficiaryName: string
  amount: number
  remarksClient: string
  remarksBeneficiary: string
}

export default function SalaryPaymentSheet() {
  const [ceoApproved, setCeoApproved] = useState(false)
  const [showPrintMenu, setShowPrintMenu] = useState(false)
  
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1)
  const [year, setYear] = useState(currentDate.getFullYear())

  const togglePrintMenu = () => setShowPrintMenu(!showPrintMenu)

  const { data: salaryData, isLoading } = useQuery({
    queryKey: ['salarySheet', month, year],
    queryFn: async () => {
      const response = await apiClient.get('/salaries/sheet', {
        params: { month, year }
      });
      return response.data;
    }
  });

  const paymentData: PaymentEntry[] = useMemo(() => {
    if (!salaryData) return [];
    return salaryData.map((row: any, index: number) => ({
      id: String(index),
      employeeName: row.EmployeeName || "Unknown",
      employeeCode: row.EmployeeCode || "N/A",
      beneficiaryAccountNo: row.AccountNumber || "N/A",
      beneficiaryName: row.AccountHolder || "N/A",
      amount: Number(row.NetPayableAmount || 0),
      remarksClient: "Salary Payment",
      remarksBeneficiary: `Salary for ${month}/${year}`
    }));
  }, [salaryData, month, year]);

  const columns = useMemo<ColumnDef<PaymentEntry>[]>(
    () => [
      {
        accessorKey: "employeeName",
        header: ({ column }) => <SortableHeader column={column} title="Employee Name" />,
        cell: ({ row }) => <div className="font-semibold whitespace-nowrap">{row.getValue("employeeName")}</div>,
      },
      {
        accessorKey: "employeeCode",
        header: ({ column }) => <SortableHeader column={column} title="Employee Code" />,
        cell: ({ row }) => <div className="whitespace-nowrap">{row.getValue("employeeCode")}</div>,
      },
      {
        accessorKey: "beneficiaryAccountNo",
        header: ({ column }) => (
          <div title="Max length for other bank 34 character alphanumeric and for ICICI Bank 12 digit number">
            <SortableHeader column={column} title="Beneficiary Account No" />
          </div>
        ),
        cell: ({ row }) => <div className="font-mono text-xs tracking-wider whitespace-nowrap">{row.getValue("beneficiaryAccountNo")}</div>,
      },
      {
        accessorKey: "beneficiaryName",
        header: ({ column }) => (
          <div title="(Max length 32 Character) (No Special Character is allowed but Space is allowed)">
            <SortableHeader column={column} title="Beneficiary Name" />
          </div>
        ),
        cell: ({ row }) => <div className="whitespace-nowrap">{row.getValue("beneficiaryName")}</div>,
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <SortableHeader column={column} title="Amount (₹)" />,
        cell: ({ row }) => <div className="text-right font-bold text-primary">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(row.getValue("amount"))}</div>,
      },
      {
        accessorKey: "remarksClient",
        header: ({ column }) => <SortableHeader column={column} title="Remarks for Client" />,
        cell: ({ row }) => <div className="whitespace-nowrap text-muted-foreground">{row.getValue("remarksClient")}</div>,
      },
      {
        accessorKey: "remarksBeneficiary",
        header: ({ column }) => <SortableHeader column={column} title="Remarks for Beneficiary" />,
        cell: ({ row }) => (
          <Input 
            defaultValue={row.getValue("remarksBeneficiary")} 
            className="h-8 text-xs min-w-[180px] bg-white border-zinc-200"
            placeholder="Manual entry..."
          />
        ),
      },
    ],
    []
  )

  const downloadPDF = () => {
    setShowPrintMenu(false);
    if (!paymentData.length) return;
    
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h2 style="text-align: center;">Salary Payment Sheet - ${month}/${year}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ccc; padding: 8px;">Emp Name</th>
              <th style="border: 1px solid #ccc; padding: 8px;">Account No</th>
              <th style="border: 1px solid #ccc; padding: 8px;">IFSC</th>
              <th style="border: 1px solid #ccc; padding: 8px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${paymentData.map(d => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px;">${d.employeeName}</td>
                <td style="border: 1px solid #ccc; padding: 8px;">${d.beneficiaryAccountNo}</td>
                <td style="border: 1px solid #ccc; padding: 8px;">${salaryData?.find((s:any) => s.EmployeeCode === d.employeeCode)?.IFSCCode || ''}</td>
                <td style="border: 1px solid #ccc; padding: 8px;">₹${d.amount}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    html2pdf().set({
      margin: 10,
      filename: `Salary_Payment_${month}_${year}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
  };

  const downloadExcel = () => {
    setShowPrintMenu(false);
    if (!paymentData.length) return;
    
    const headers = ['Employee Name', 'Employee Code', 'Account Number', 'IFSC Code', 'Amount', 'Remarks'];
    const csvContent = [
      headers.join(','),
      ...paymentData.map(d => {
        const ifsc = salaryData?.find((s:any) => s.EmployeeCode === d.employeeCode)?.IFSCCode || '';
        return `"${d.employeeName}","${d.employeeCode}","${d.beneficiaryAccountNo}","${ifsc}","${d.amount}","${d.remarksBeneficiary}"`;
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Salary_Payment_${month}_${year}.csv`;
    link.click();
  };

  const downloadTXT = () => {
    setShowPrintMenu(false);
    if (!paymentData.length) return;
    
    // Simple pipe-separated format common for bank uploads
    const txtContent = paymentData.map(d => {
      const ifsc = salaryData?.find((s:any) => s.EmployeeCode === d.employeeCode)?.IFSCCode || '';
      return `${d.beneficiaryAccountNo}|${d.amount}|${d.employeeName}|${ifsc}|${d.remarksBeneficiary}`;
    }).join('\n');
    
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Salary_Payment_Bank_Upload_${month}_${year}.txt`;
    link.click();
  };

  const totalPayable = paymentData.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="flex-1 space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">Salary Payment Sheet</h2>
            <div className="hidden gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 px-3 py-1">
                <CheckCircle2 className="h-3 w-3" /> Ops Head Approved
              </Badge>
              {ceoApproved ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 px-3 py-1">
                  <CheckCircle2 className="h-3 w-3" /> CEO Approved
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 px-3 py-1">
                  <ShieldAlert className="h-3 w-3" /> Pending CEO Approval
                </Badge>
              )}
            </div>
          </div>
          <p className="text-muted-foreground mt-1">
            Batch #PS-{year}-{String(month).padStart(2, '0')}-01 • Prepared for bank upload
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))}
            className="flex h-10 w-[140px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            className="flex h-10 w-[100px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <div className="relative ml-2">
            <Button variant="outline" onClick={togglePrintMenu}>
              <Printer className="mr-2 h-4 w-4" />
              Print Sheet
              <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
            </Button>
            {showPrintMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover text-popover-foreground shadow-md z-50">
                <div className="p-1 flex flex-col">
                  <button className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-left" onClick={downloadPDF}>
                    Download as PDF
                  </button>
                  <button className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-left" onClick={downloadExcel}>
                    Download as Excel (CSV)
                  </button>
                  <button className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-left" onClick={downloadTXT}>
                    Download as TXT (For Bank)
                  </button>
                </div>
              </div>
            )}
          </div>

          {!ceoApproved ? (
            <Button className="hidden bg-muted text-muted-foreground cursor-not-allowed" onClick={() => alert("CEO Approval is required before processing payments.")}>
              <Lock className="mr-2 h-4 w-4" />
              Process Payment (Locked)
            </Button>
          ) : (
            <Button className="hidden bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Process Bank Transfer
            </Button>
          )}
        </div>
        
        {/* DEV ONLY TOGGLE TO SHOW STATE */}
        <div className="absolute top-2 right-2 flex items-center gap-2">
           <span className="text-[10px] text-muted-foreground uppercase">Dev Mock:</span>
           <input type="checkbox" checked={ceoApproved} onChange={(e) => setCeoApproved(e.target.checked)} className="h-3 w-3"/>
        </div>
      </div>

      {/* Control Bar */}
      <Card className="bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="w-full md:w-64">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 h-9" placeholder="Search name or code..." />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg border">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Net Payable</p>
              <p className="text-xl font-bold text-primary">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalPayable)}</p>
            </div>
            <FileSpreadsheet className="h-8 w-8 text-emerald-500 opacity-80" />
          </div>
        </CardContent>
      </Card>

      <div className="border rounded-lg bg-background shadow-sm overflow-hidden relative min-h-[200px]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <div className="[&_td]:py-2 [&_th]:py-3 [&_tr]:border-b [&_table]:w-full overflow-x-auto">
          <DataTable columns={columns} data={paymentData} searchPlaceholder="Search name or code..." hideToolbarOptions />
        </div>
      </div>
    </div>
  )
}
