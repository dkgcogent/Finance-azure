import React, { useMemo, useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Download, 
  X, 
  CheckCircle2, 
  Ban, 
  ArrowLeft,
  Calendar,
  Users,
  Building2,
  CreditCard,
  FileSpreadsheet
} from "lucide-react"
import { apiClient } from "@/lib/api"

type ImprestRecord = {
  id: string;
  user_id: string;
  date: string;
  head: string;
  description: string;
  amount: number;
  pass_amount: number;
  status: string;
}

type SalarySheetRecord = {
  id: number | string;
  month_str: string;
  start_date: string;
  end_date: string;
  status: string;
  sent_date: string | null;
  approved_date: string | null;
  total_employees: number;
  total_gross: number;
  total_net: number;
  sheet_data: any[];
  notes?: string | null;
}

type ApprovalRow = {
  id: string
  type: 'imprest' | 'salary'
  date: string
  employeeName: string
  employeeCode: string
  employeeLocation: string
  generalImprest: number
  adhocAdvance: number
  adhocBalance: number
  salary: number
  total: number
  status: string
  rawRecords: ImprestRecord[]
  salarySheet?: SalarySheetRecord
}

type SelectedSheet = 
  | {
      type: 'imprest'
      row: ApprovalRow
      sheetType: "General Imprest" | "Adhoc Advance" | "Adhoc Balance"
      records: ImprestRecord[]
    }
  | {
      type: 'salary'
      row: ApprovalRow
      salarySheet: SalarySheetRecord
    }

export default function PaymentSheetFinalApproval() {
  const [allRecords, setAllRecords] = useState<ImprestRecord[]>([])
  const [salarySheets, setSalarySheets] = useState<SalarySheetRecord[]>([])
  const [selectedSheet, setSelectedSheet] = useState<SelectedSheet | null>(null)
  
  // Imprest action popup
  const [actionPopup, setActionPopup] = useState<{type: 'approve' | 'reject', recordIds: string[]} | null>(null)
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set())

  // Salary action popup
  const [salaryActionPopup, setSalaryActionPopup] = useState<{type: 'approve' | 'reject', sheet: SalarySheetRecord} | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = async () => {
    try {
      // Fetch Level-2 approved imprest records
      const imprestRes = await apiClient.get('/imprests?status=Level-2%20Approved')
      setAllRecords(imprestRes.data || [])
    } catch (error) {
      console.error('Failed to fetch imprests:', error)
    }

    try {
      // Fetch pending salary payment sheets
      const salaryRes = await apiClient.get('/salaries/pending-approvals')
      setSalarySheets(salaryRes.data || [])
    } catch (error) {
      console.error('Failed to fetch pending salary sheets:', error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const groupedData = useMemo(() => {
    const rows: ApprovalRow[] = []

    // 1. Imprest rows
    const map = new Map<string, ApprovalRow>()
    allRecords.filter(record => record.status === 'Level-2 Approved').forEach(record => {
      const isAdhoc = record.head.toLowerCase().includes("adhoc")
      const isAdvance = record.head.toLowerCase().includes("advance")
      const isBalance = record.head.toLowerCase().includes("balance")

      const amt = Number(record.pass_amount) || Number(record.amount) || 0
      
      let bucket = "General Imprest"
      if (isAdhoc && isAdvance) bucket = "Adhoc Advance"
      if (isAdhoc && isBalance) bucket = "Adhoc Balance"

      if (!map.has(String(record.user_id))) {
        map.set(String(record.user_id), {
          id: `imprest-${record.user_id}`,
          type: 'imprest',
          date: record.date ? record.date.split('T')[0] : '',
          employeeName: `Employee ${record.user_id}`,
          employeeCode: `EMP${record.user_id}`,
          employeeLocation: "HQ",
          generalImprest: 0,
          adhocAdvance: 0,
          adhocBalance: 0,
          salary: 0,
          total: 0,
          status: "Level-2 Approved",
          rawRecords: []
        })
      }
      
      const row = map.get(String(record.user_id))!
      row.rawRecords.push(record)
      
      if (bucket === "General Imprest") row.generalImprest += amt
      if (bucket === "Adhoc Advance") row.adhocAdvance += amt
      if (bucket === "Adhoc Balance") row.adhocBalance += amt
      
      row.total += amt
    })

    rows.push(...Array.from(map.values()))

    // 2. Salary rows from pending payment sheets
    salarySheets.forEach(sheet => {
      const netAmount = Number(sheet.total_net) || 0
      const sentDateFormatted = sheet.sent_date ? sheet.sent_date.split('T')[0] : (sheet.start_date ? sheet.start_date.split('T')[0] : '')

      rows.push({
        id: `salary-${sheet.id}`,
        type: 'salary',
        date: sentDateFormatted,
        employeeName: `Salary - ${sheet.month_str}`,
        employeeCode: `SAL-${sheet.month_str.toUpperCase().replace(/[^A-Z0-9]/g, '')}`,
        employeeLocation: `HQ (${sheet.total_employees} Emps)`,
        generalImprest: 0,
        adhocAdvance: 0,
        adhocBalance: 0,
        salary: netAmount,
        total: netAmount,
        status: "Pending Approval",
        rawRecords: [],
        salarySheet: sheet
      })
    })

    return rows
  }, [allRecords, salarySheets])

  const openImprestSheet = (row: ApprovalRow, sheetType: "General Imprest" | "Adhoc Advance" | "Adhoc Balance") => {
    const relevantRecords = row.rawRecords.filter(r => {
      const isAdhoc = r.head.toLowerCase().includes("adhoc")
      const isAdvance = r.head.toLowerCase().includes("advance")
      const isBalance = r.head.toLowerCase().includes("balance")
      
      if (sheetType === "General Imprest") return !isAdhoc
      if (sheetType === "Adhoc Advance") return isAdhoc && isAdvance
      if (sheetType === "Adhoc Balance") return isAdhoc && isBalance
      return false
    })

    if (relevantRecords.length > 0) {
      setSelectedSheet({ type: 'imprest', row, sheetType, records: relevantRecords })
      setSelectedRecordIds(new Set())
    }
  }

  const openSalarySheet = (row: ApprovalRow) => {
    if (row.salarySheet) {
      setSelectedSheet({ type: 'salary', row, salarySheet: row.salarySheet })
    }
  }

  const columns = useMemo<ColumnDef<ApprovalRow>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => <SortableHeader column={column} title="Date" />,
      },
      {
        accessorKey: "employeeName",
        header: ({ column }) => <SortableHeader column={column} title="Employee name" />,
        cell: ({ row }) => (
          <div className="font-medium text-zinc-900">
            {row.getValue("employeeName")}
            {row.original.type === 'salary' && (
              <Badge variant="outline" className="ml-2 text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                Salary Sheet
              </Badge>
            )}
          </div>
        )
      },
      {
        accessorKey: "employeeCode",
        header: ({ column }) => <SortableHeader column={column} title="Employee Code" />,
      },
      {
        accessorKey: "employeeLocation",
        header: ({ column }) => <SortableHeader column={column} title="Employee locati" />,
      },
      {
        accessorKey: "generalImprest",
        header: ({ column }) => <SortableHeader column={column} title="General Imprest" />,
        cell: ({ row }) => {
          const val = row.getValue("generalImprest") as number
          return (
            <div 
              className={`text-right p-2 border border-zinc-200 ${val > 0 ? 'bg-yellow-300 hover:bg-yellow-400 font-bold cursor-pointer' : ''}`}
              onClick={() => val > 0 && openImprestSheet(row.original, "General Imprest")}
            >
              {val > 0 ? val.toLocaleString('en-IN') : ""}
            </div>
          )
        },
      },
      {
        accessorKey: "adhocAdvance",
        header: ({ column }) => <SortableHeader column={column} title="Adhoc advance" />,
        cell: ({ row }) => {
          const val = row.getValue("adhocAdvance") as number
          return (
            <div 
              className={`text-right p-2 border border-zinc-200 ${val > 0 ? 'bg-yellow-300 hover:bg-yellow-400 font-bold cursor-pointer' : ''}`}
              onClick={() => val > 0 && openImprestSheet(row.original, "Adhoc Advance")}
            >
              {val > 0 ? val.toLocaleString('en-IN') : ""}
            </div>
          )
        },
      },
      {
        accessorKey: "adhocBalance",
        header: ({ column }) => <SortableHeader column={column} title="Adhoc balance" />,
        cell: ({ row }) => {
          const val = row.getValue("adhocBalance") as number
          return (
            <div 
              className={`text-right p-2 border border-zinc-200 ${val > 0 ? 'bg-yellow-300 hover:bg-yellow-400 font-bold cursor-pointer' : ''}`}
              onClick={() => val > 0 && openImprestSheet(row.original, "Adhoc Balance")}
            >
              {val > 0 ? val.toLocaleString('en-IN') : ""}
            </div>
          )
        },
      },
      {
        accessorKey: "salary",
        header: ({ column }) => <SortableHeader column={column} title="Salary" />,
        cell: ({ row }) => {
          const val = row.getValue("salary") as number
          return (
            <div 
              className={`text-right p-2 border border-zinc-200 ${val > 0 ? 'bg-yellow-300 hover:bg-yellow-400 font-bold cursor-pointer' : ''}`}
              onClick={() => val > 0 && openSalarySheet(row.original)}
              title={val > 0 ? "Click to review and approve salary sheet" : ""}
            >
              {val > 0 ? val.toLocaleString('en-IN') : ""}
            </div>
          )
        },
      },
      {
        accessorKey: "total",
        header: ({ column }) => <SortableHeader column={column} title="Total" />,
        cell: ({ row }) => {
          const val = row.getValue("total") as number
          return (
            <div className={`text-right p-2 border border-zinc-200 ${val > 0 ? 'bg-yellow-300 font-bold' : ''}`}>
              {val > 0 ? val.toLocaleString('en-IN') : ""}
            </div>
          )
        },
      },
    ],
    []
  )

  const handleImprestAction = async (type: 'approve' | 'reject') => {
    if (!actionPopup) return
    const { recordIds } = actionPopup
    if (recordIds.length === 0) return

    try {
      const newStatus = type === 'approve' ? 'Final Approved' : 'Rejected'
      
      await Promise.all(recordIds.map(async (recordId) => {
        if (selectedSheet && selectedSheet.type === 'imprest') {
          const record = selectedSheet.records.find(r => r.id == recordId)
          if (record) {
            const passAmount = Number(record.pass_amount) || Number(record.amount)
            await apiClient.put(`/imprests/${recordId}/status`, {
              status: newStatus,
              passAmount: passAmount
            })
          }
        }
      }))

      await fetchData()
      
      if (selectedSheet && selectedSheet.type === 'imprest') {
        setSelectedSheet(prev => {
          if (!prev || prev.type !== 'imprest') return prev
          return {
            ...prev,
            records: prev.records.map(r => recordIds.includes(r.id.toString()) ? { ...r, status: newStatus } : r)
          }
        })
      }
      setSelectedRecordIds(new Set())
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setActionPopup(null)
    }
  }

  const handleSalaryAction = async (type: 'approve' | 'reject') => {
    if (!salaryActionPopup) return
    const { sheet } = salaryActionPopup
    try {
      setActionLoading(true)
      const newStatus = type === 'approve' ? 'APPROVED' : 'REJECTED'
      await apiClient.put(`/salaries/sheets/${sheet.id}/status`, {
        status: newStatus
      })

      await fetchData()
      setSelectedSheet(null)
    } catch (error) {
      console.error('Failed to update salary payment sheet status:', error)
    } finally {
      setActionLoading(false)
      setSalaryActionPopup(null)
    }
  }

  const toggleSelectAll = () => {
    if (!selectedSheet || selectedSheet.type !== 'imprest') return
    const pendingRecords = selectedSheet.records.filter(r => r.status === 'Level-2 Approved')
    
    if (selectedRecordIds.size === pendingRecords.length && pendingRecords.length > 0) {
      setSelectedRecordIds(new Set())
    } else {
      setSelectedRecordIds(new Set(pendingRecords.map(r => r.id.toString())))
    }
  }

  const toggleRecordSelect = (id: string) => {
    const newSet = new Set(selectedRecordIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedRecordIds(newSet)
  }

  return (
    <div className="flex-1 pb-8">
      {!selectedSheet ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/approvals">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Final Approvals</h2>
                <p className="text-muted-foreground mt-1">
                  Final executive sign-off on payment sheets by CEO.
                </p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Final Approval Queue</CardTitle>
              <CardDescription>Payment sheets and salary disbursements pending final executive sign-off.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={groupedData} />
            </CardContent>
          </Card>
        </div>
      ) : selectedSheet.type === 'salary' ? (
        /* SALARY REVIEW DETAIL VIEW */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 border border-zinc-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setSelectedSheet(null)} className="rounded-full shrink-0 hover:bg-zinc-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-zinc-900">Salary Payment Sheet Review ({selectedSheet.salarySheet.month_str})</h3>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Pending Final Sign-off
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  Reviewing monthly salary sheet containing <strong>{selectedSheet.salarySheet.total_employees} employees</strong> • Total Net: <strong>₹{Number(selectedSheet.salarySheet.total_net).toLocaleString('en-IN')}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                size="sm" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setSalaryActionPopup({ type: 'approve', sheet: selectedSheet.salarySheet })}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Salary Sheet
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setSalaryActionPopup({ type: 'reject', sheet: selectedSheet.salarySheet })}
              >
                <Ban className="h-4 w-4 mr-2" />
                Reject Sheet
              </Button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="bg-zinc-50 border-zinc-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Payroll Month</p>
                  <p className="text-lg font-bold text-zinc-900">{selectedSheet.salarySheet.month_str}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-50 border-zinc-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Employees</p>
                  <p className="text-lg font-bold text-zinc-900">{selectedSheet.salarySheet.total_employees}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-50 border-zinc-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-200 text-zinc-700">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Gross</p>
                  <p className="text-lg font-bold text-zinc-900">₹{Number(selectedSheet.salarySheet.total_gross).toLocaleString('en-IN')}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-200 text-emerald-800">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-emerald-800 font-medium">Total Net Payable</p>
                  <p className="text-lg font-bold text-emerald-700">₹{Number(selectedSheet.salarySheet.total_net).toLocaleString('en-IN')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Salary Breakdown Table */}
          <div className="w-full bg-white shadow-sm border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-zinc-50/80 flex justify-between items-center">
              <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee Wage & Disbursement Preview</h4>
              <span className="text-xs text-zinc-500 font-medium">{selectedSheet.salarySheet.sheet_data?.length || 0} Records</span>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm border-collapse text-left">
                <thead className="sticky top-0 bg-zinc-100 z-10">
                  <tr className="border-b border-zinc-200">
                    <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-12 text-center">#</th>
                    <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Employee Name</th>
                    <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Emp Code</th>
                    <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bank Name</th>
                    <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Account Number</th>
                    <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">IFSC Code</th>
                    <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Gross (₹)</th>
                    <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Deductions (₹)</th>
                    <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Net Salary (₹)</th>
                    <th className="py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Payment Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSheet.salarySheet.sheet_data && selectedSheet.salarySheet.sheet_data.map((emp: any, idx: number) => {
                    const gross = Number(emp.grossSalary || emp.gross_salary || 0)
                    const deductions = Number(emp.totalDeductions || emp.total_deductions || 0)
                    const net = Number(emp.netSalary || emp.net_salary || 0)

                    return (
                      <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <td className="py-3 px-4 text-center text-zinc-400 text-xs">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900">{emp.employeeName || emp.employee_name || 'N/A'}</td>
                        <td className="py-3 px-4 text-zinc-600 font-mono text-xs">{emp.employeeCode || emp.employee_code || (emp.employeeId ? `EMP${emp.employeeId}` : 'N/A')}</td>
                        <td className="py-3 px-4 text-zinc-600 text-xs">{emp.bankName || emp.branch_name || 'SBI'}</td>
                        <td className="py-3 px-4 font-mono text-xs text-zinc-700">{emp.accountNumber || emp.account_no || 'N/A'}</td>
                        <td className="py-3 px-4 font-mono text-xs text-zinc-700">{emp.ifscCode || emp.ifsc_code || 'SBIN0001234'}</td>
                        <td className="py-3 px-4 text-right text-zinc-600">₹{gross.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right text-red-600">₹{deductions.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">₹{net.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className="text-[11px] bg-zinc-100 text-zinc-700">
                            {emp.paymentMode || 'Bank Transfer'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* IMPREST REVIEW DETAIL VIEW */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 border border-zinc-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setSelectedSheet(null)} className="rounded-full shrink-0 hover:bg-zinc-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-zinc-900">{selectedSheet.sheetType} Review</h3>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  Detailed view for <strong>{selectedSheet.row.employeeName}</strong> ({selectedSheet.row.employeeCode}).
                </p>
              </div>
            </div>
            
            {selectedRecordIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 mr-2">{selectedRecordIds.size} selected</span>
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setActionPopup({type: 'approve', recordIds: Array.from(selectedRecordIds)})}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Selected
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setActionPopup({type: 'reject', recordIds: Array.from(selectedRecordIds)})}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Reject Selected
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 items-start">
            <div className="w-full bg-white shadow-sm border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-zinc-50/80 flex justify-between items-center">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Document Preview</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-200">
                      <th className="py-3 px-4 w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedSheet.records.filter(r => r.status === 'Level-2 Approved').length > 0 && selectedRecordIds.size === selectedSheet.records.filter(r => r.status === 'Level-2 Approved').length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="py-3 px-4 font-semibold text-xs text-zinc-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 font-semibold text-xs text-zinc-500 uppercase tracking-wider">Head</th>
                      <th className="py-3 px-4 font-semibold text-right text-xs text-zinc-500 uppercase tracking-wider">Opening</th>
                      <th className="py-3 px-4 font-semibold text-right text-xs text-zinc-500 uppercase tracking-wider">Transfer</th>
                      <th className="py-3 px-4 font-semibold text-right text-xs text-zinc-500 uppercase tracking-wider">Expense</th>
                      <th className="py-3 px-4 font-semibold text-right text-xs text-zinc-500 uppercase tracking-wider">Pass Amount</th>
                      <th className="py-3 px-4 font-semibold text-right text-xs text-zinc-500 uppercase tracking-wider">Balance</th>
                      <th className="py-3 px-4 font-semibold text-center text-xs text-zinc-500 uppercase tracking-wider w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSheet.records.map(record => (
                      <tr key={record.id} className={`border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${selectedRecordIds.has(record.id.toString()) ? 'bg-blue-50/50' : ''}`}>
                        <td className="py-4 px-4 text-center">
                          {record.status === 'Level-2 Approved' && (
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedRecordIds.has(record.id.toString())}
                              onChange={() => toggleRecordSelect(record.id.toString())}
                            />
                          )}
                        </td>
                        <td className="py-4 px-4 text-zinc-700">{record.date.split('T')[0]}</td>
                        <td className="py-4 px-4 text-zinc-700">{record.head}</td>
                        <td className="py-4 px-4 text-right text-zinc-500">0</td>
                        <td className="py-4 px-4 text-right text-zinc-500">{record.amount}</td>
                        <td className="py-4 px-4 text-right text-zinc-500">0</td>
                        <td className="py-4 px-4 text-right font-medium text-emerald-600">
                          {Number(record.pass_amount) || 0}
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-zinc-800">{Number(record.amount) - (Number(record.pass_amount) || 0)}</td>
                        <td className="py-4 px-4 text-center">
                          {record.status === 'Final Approved' ? (
                            <Badge variant="success">Final Approved</Badge>
                          ) : record.status === 'Rejected' ? (
                            <Badge variant="destructive">Rejected</Badge>
                          ) : (
                            <div className="flex justify-center items-center gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => setActionPopup({type: 'approve', recordIds: [record.id.toString()]})}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => setActionPopup({type: 'reject', recordIds: [record.id.toString()]})}>
                                <Ban className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Imprest Action Popup Modal */}
      {actionPopup && (
        <div className="fixed inset-0 bg-zinc-950/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-lg w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Confirm Action</h3>
              <Button variant="ghost" size="icon" onClick={() => setActionPopup(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-zinc-600 mb-6">
              Are you sure you want to {actionPopup.type === 'approve' ? 'approve' : 'reject'} {actionPopup.recordIds.length} request(s)?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setActionPopup(null)}>Cancel</Button>
              <Button 
                className={actionPopup.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                onClick={() => handleImprestAction(actionPopup.type)}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Action Popup Modal */}
      {salaryActionPopup && (
        <div className="fixed inset-0 bg-zinc-950/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {salaryActionPopup.type === 'approve' ? 'Approve Salary Payment Sheet' : 'Reject Salary Payment Sheet'}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setSalaryActionPopup(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-zinc-600 mb-4">
              Are you sure you want to {salaryActionPopup.type === 'approve' ? 'give final executive approval for' : 'reject'} the salary payment sheet for <strong>{salaryActionPopup.sheet.month_str}</strong>?
            </p>
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 mb-6 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employees:</span>
                <span className="font-semibold">{salaryActionPopup.sheet.total_employees}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Net Amount:</span>
                <span className="font-bold text-emerald-600">₹{Number(salaryActionPopup.sheet.total_net).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" disabled={actionLoading} onClick={() => setSalaryActionPopup(null)}>Cancel</Button>
              <Button 
                disabled={actionLoading}
                className={salaryActionPopup.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                onClick={() => handleSalaryAction(salaryActionPopup.type)}
              >
                {actionLoading ? 'Processing...' : salaryActionPopup.type === 'approve' ? 'Approve & Sign Off' : 'Reject Sheet'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
