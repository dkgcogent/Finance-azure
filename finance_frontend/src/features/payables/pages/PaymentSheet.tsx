import React, { useMemo, useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Download,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Layers,
  Calendar,
  DollarSign,
  Users,
  Eye,
  Plus,
  Filter,
  Sparkles
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { apiClient } from "@/lib/api"
import html2pdf from "html2pdf.js"
import { generateImprestBankPaymentExcel } from "../utils/generateImprestPaymentExcel"

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

type PaymentEntry = {
  id: string
  date: string
  employeeName: string
  employeeCode: string
  beneficiaryAccountNo: string
  ifscCode: string
  beneficiaryName: string
  amount: number
  remarksClient: string
  remarksBeneficiary: string
}

type GeneratedSheetBatch = {
  batchId: string
  date: string
  batchName: string
  beneficiariesCount: number
  totalAmount: number
  status: string
  entries: PaymentEntry[]
  categories: string[]
}

const getTodayString = () => {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

export default function PaymentSheet() {
  const [searchParams] = useSearchParams()
  const initialView = searchParams.get("view") === "list" ? "list" : "sheet"
  const [viewMode, setViewMode] = useState<"sheet" | "list">(initialView)

  const currentDate = new Date()
  const [month, setMonth] = useState(currentDate.getMonth() + 1)
  const [year, setYear] = useState(currentDate.getFullYear())
  const [selectedDate, setSelectedDate] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [ceoApproved, setCeoApproved] = useState(true)
  const [showPrintMenu, setShowPrintMenu] = useState(false)
  const [data, setData] = useState<PaymentEntry[]>([])
  const [allRawRecords, setAllRawRecords] = useState<ImprestRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Generate Payment Sheet Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [dateSelectionType, setDateSelectionType] = useState<"single" | "range" | "month">("range")
  const [modalSingleDate, setModalSingleDate] = useState(getTodayString())
  const [modalFromDate, setModalFromDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [modalToDate, setModalToDate] = useState(getTodayString())
  const [modalMonth, setModalMonth] = useState(currentDate.getMonth() + 1)
  const [modalYear, setModalYear] = useState(currentDate.getFullYear())

  const togglePrintMenu = () => setShowPrintMenu(!showPrintMenu)

  // Helper to compile entries from raw records based on filters
  const compileEntries = (
    records: ImprestRecord[],
    fDate: string,
    tDate: string,
    sDate: string,
    m: number,
    y: number
  ): PaymentEntry[] => {
    const filtered = records.filter(record => {
      if (!record.date) return false;
      const recDateStr = record.date.split('T')[0];
      
      if (fDate && tDate) {
        return recDateStr >= fDate && recDateStr <= tDate;
      } else if (fDate) {
        return recDateStr >= fDate;
      } else if (tDate) {
        return recDateStr <= tDate;
      } else if (sDate) {
        return recDateStr === sDate;
      }
      
      const recordDate = new Date(record.date);
      return recordDate.getMonth() + 1 === m && recordDate.getFullYear() === y;
    });

    const map = new Map<string, PaymentEntry>();

    filtered.forEach(record => {
      const userId = String(record.user_id);
      const recDate = record.date ? record.date.split('T')[0] : '';
      const key = `${recDate}_${userId}`;
      const amt = Number(record.pass_amount) || Number(record.amount) || 0;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          date: recDate,
          employeeName: `Employee ${userId}`,
          employeeCode: `EMP${userId}`,
          beneficiaryAccountNo: `000100000${userId.padStart(3, '0')}`,
          ifscCode: 'ICIC0000011',
          beneficiaryName: `Employee ${userId}`,
          amount: 0,
          remarksClient: "IMPREST",
          remarksBeneficiary: record.head || "Daily Requisition"
        });
      }

      const entry = map.get(key)!;
      entry.amount += amt;
    });

    return Array.from(map.values());
  };

  // Fetch all imprest records (Final Approved / Approved)
  useEffect(() => {
    const fetchImprests = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.get('/imprests');
        const allList: ImprestRecord[] = res.data || [];
        
        const finalApproved = allList.filter(r => r.status === 'Final Approved');
        const records = finalApproved.length > 0 ? finalApproved : allList.filter(r => r.status === 'Level-2 Approved' || r.status === 'Approved' || r.status === 'Final Approved');
        
        setAllRawRecords(records);
        
        const entries = compileEntries(records, fromDate, toDate, selectedDate, month, year);
        setData(entries);
      } catch (error) {
        console.error("Failed to fetch imprests for payment sheet:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImprests();
  }, [month, year, selectedDate, fromDate, toDate]);

  // Compute all generated batches grouped by date
  const generatedBatches = useMemo<GeneratedSheetBatch[]>(() => {
    if (!allRawRecords.length) return [];

    const batchMap = new Map<string, {
      date: string,
      records: ImprestRecord[],
      categories: Set<string>
    }>();

    allRawRecords.forEach(record => {
      const recDate = record.date ? record.date.split('T')[0] : 'Unknown';
      if (!batchMap.has(recDate)) {
        batchMap.set(recDate, {
          date: recDate,
          records: [],
          categories: new Set()
        });
      }
      const batch = batchMap.get(recDate)!;
      batch.records.push(record);
      if (record.head) batch.categories.add(record.head);
    });

    const result: GeneratedSheetBatch[] = [];

    batchMap.forEach((val, dateKey) => {
      const entryMap = new Map<string, PaymentEntry>();
      let totalAmount = 0;

      val.records.forEach(record => {
        const userId = String(record.user_id);
        const amt = Number(record.pass_amount) || Number(record.amount) || 0;
        totalAmount += amt;

        if (!entryMap.has(userId)) {
          entryMap.set(userId, {
            id: `${dateKey}_${userId}`,
            date: dateKey,
            employeeName: `Employee ${userId}`,
            employeeCode: `EMP${userId}`,
            beneficiaryAccountNo: `000100000${userId.padStart(3, '0')}`,
            ifscCode: 'ICIC0000011',
            beneficiaryName: `Employee ${userId}`,
            amount: 0,
            remarksClient: "IMPREST",
            remarksBeneficiary: record.head || "Daily Requisition"
          });
        }
        const entry = entryMap.get(userId)!;
        entry.amount += amt;
      });

      const entries = Array.from(entryMap.values());

      result.push({
        batchId: `PS-${dateKey}`,
        date: dateKey,
        batchName: `Imprest Payment Batch - ${dateKey}`,
        beneficiariesCount: entries.length,
        totalAmount,
        status: "Final Approved",
        entries,
        categories: Array.from(val.categories)
      });
    });

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [allRawRecords]);

  const totalGeneratedAmount = useMemo(() => {
    return generatedBatches.reduce((sum, b) => sum + b.totalAmount, 0);
  }, [generatedBatches]);

  const totalBeneficiaries = useMemo(() => {
    return generatedBatches.reduce((sum, b) => sum + b.beneficiariesCount, 0);
  }, [generatedBatches]);

  const columns = useMemo<ColumnDef<PaymentEntry>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => <SortableHeader column={column} title="Date" />,
        cell: ({ row }) => <div className="whitespace-nowrap font-medium text-xs text-zinc-600">{row.getValue("date")}</div>,
      },
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
        accessorKey: "ifscCode",
        header: ({ column }) => <SortableHeader column={column} title="IFSC Code" />,
        cell: ({ row }) => <div className="font-mono text-xs uppercase tracking-wider whitespace-nowrap">{row.getValue("ifscCode")}</div>,
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

  const fileSuffix = fromDate && toDate ? `${fromDate}_to_${toDate}` : fromDate ? `from_${fromDate}` : toDate ? `to_${toDate}` : selectedDate ? selectedDate : `${year}-${String(month).padStart(2, '0')}`;

  const downloadPDF = () => {
    setShowPrintMenu(false);
    if (!data.length) return;
    
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h2 style="text-align: center;">Imprest Payment Sheet - ${fileSuffix}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ccc; padding: 8px;">Date</th>
              <th style="border: 1px solid #ccc; padding: 8px;">Emp Name</th>
              <th style="border: 1px solid #ccc; padding: 8px;">Account No</th>
              <th style="border: 1px solid #ccc; padding: 8px;">IFSC Code</th>
              <th style="border: 1px solid #ccc; padding: 8px;">Beneficiary Name</th>
              <th style="border: 1px solid #ccc; padding: 8px;">Amount</th>
              <th style="border: 1px solid #ccc; padding: 8px;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(d => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px;">${d.date || ''}</td>
                <td style="border: 1px solid #ccc; padding: 8px;">${d.employeeName}</td>
                <td style="border: 1px solid #ccc; padding: 8px;">${d.beneficiaryAccountNo}</td>
                <td style="border: 1px solid #ccc; padding: 8px;">${d.ifscCode}</td>
                <td style="border: 1px solid #ccc; padding: 8px;">${d.beneficiaryName}</td>
                <td style="border: 1px solid #ccc; padding: 8px;">₹${d.amount}</td>
                <td style="border: 1px solid #ccc; padding: 8px;">${d.remarksBeneficiary}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    html2pdf().set({
      margin: 10,
      filename: `Imprest_Payment_${fileSuffix}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
  };

  const downloadExcel = async () => {
    setShowPrintMenu(false);
    if (!data.length) return;
    
    await generateImprestBankPaymentExcel(
      data.map(d => ({
        transactionType: "IFC",
        debitAccountNo: "163905500140",
        ifscCode: d.ifscCode || "ICIC0000011",
        beneficiaryAccountNo: d.beneficiaryAccountNo || "",
        beneficiaryName: d.beneficiaryName || d.employeeName,
        amount: d.amount,
        remarksClient: d.remarksClient || "IMPREST",
        remarksBeneficiary: d.remarksBeneficiary || "Imprest Payment"
      })),
      fileSuffix
    );
  };

  const downloadTXT = () => {
    setShowPrintMenu(false);
    if (!data.length) return;
    
    const txtContent = data.map(d => `${d.date || ''}|${d.beneficiaryAccountNo}|${d.ifscCode}|${d.amount}|${d.employeeName}|${d.remarksBeneficiary}`).join('\n');
    
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Imprest_Payment_Bank_Upload_${fileSuffix}.txt`;
    link.click();
  };

  const downloadBatchExcel = async (batch: GeneratedSheetBatch) => {
    await generateImprestBankPaymentExcel(
      batch.entries.map(d => ({
        transactionType: "IFC",
        debitAccountNo: "163905500140",
        ifscCode: d.ifscCode || "ICIC0000011",
        beneficiaryAccountNo: d.beneficiaryAccountNo || "",
        beneficiaryName: d.beneficiaryName || d.employeeName,
        amount: d.amount,
        remarksClient: d.remarksClient || "IMPREST",
        remarksBeneficiary: d.remarksBeneficiary || "Imprest Payment"
      })),
      batch.batchId
    );
  };

  const openBatchInSheetView = (batchDate: string) => {
    setSelectedDate(batchDate);
    setFromDate('');
    setToDate('');
    setViewMode('sheet');
  };

  // Handle Date Selection Modal Proceed: Triggers automatic Excel download and opens sheet
  const handleProceedWithDateSelection = async () => {
    let targetFrom = '';
    let targetTo = '';
    let targetSingle = '';
    let targetMonth = month;
    let targetYear = year;
    let targetSuffix = '';

    if (dateSelectionType === "single") {
      targetSingle = modalSingleDate;
      targetSuffix = modalSingleDate;
      setSelectedDate(modalSingleDate);
      setFromDate('');
      setToDate('');
    } else if (dateSelectionType === "range") {
      targetFrom = modalFromDate;
      targetTo = modalToDate;
      targetSuffix = `${modalFromDate}_to_${modalToDate}`;
      setFromDate(modalFromDate);
      setToDate(modalToDate);
      setSelectedDate('');
    } else if (dateSelectionType === "month") {
      targetMonth = modalMonth;
      targetYear = modalYear;
      targetSuffix = `${modalYear}-${String(modalMonth).padStart(2, '0')}`;
      setMonth(modalMonth);
      setYear(modalYear);
      setFromDate('');
      setToDate('');
      setSelectedDate('');
    }

    // Compile entries for the selected timeframe
    const targetEntries = compileEntries(
      allRawRecords,
      targetFrom,
      targetTo,
      targetSingle,
      targetMonth,
      targetYear
    );

    // Download Excel in bank format using ExcelJS
    await generateImprestBankPaymentExcel(
      targetEntries.map(d => ({
        transactionType: "IFC",
        debitAccountNo: "163905500140",
        ifscCode: d.ifscCode || "ICIC0000011",
        beneficiaryAccountNo: d.beneficiaryAccountNo || "",
        beneficiaryName: d.beneficiaryName || d.employeeName,
        amount: d.amount,
        remarksClient: d.remarksClient || "IMPREST",
        remarksBeneficiary: d.remarksBeneficiary || "Imprest Payment"
      })),
      targetSuffix
    );

    // Update active data and open sheet view
    setData(targetEntries);
    setIsGenerateModalOpen(false);
    setViewMode("sheet");
  };

  // Columns for the Generated Payment Sheets List Table
  const batchColumns = useMemo<ColumnDef<GeneratedSheetBatch>[]>(
    () => [
      {
        accessorKey: "batchId",
        header: ({ column }) => <SortableHeader column={column} title="Batch ID" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-zinc-900 text-sm block">{row.getValue("batchId")}</span>
              <span className="text-xs text-muted-foreground">{row.original.batchName}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "date",
        header: ({ column }) => <SortableHeader column={column} title="Sheet Date" />,
        cell: ({ row }) => (
          <div className="whitespace-nowrap font-medium text-xs text-zinc-700 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            {row.getValue("date")}
          </div>
        ),
      },
      {
        accessorKey: "categories",
        header: ({ column }) => <SortableHeader column={column} title="Expense Heads" />,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {row.original.categories.length > 0 ? (
              row.original.categories.map((cat, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-50 text-zinc-600 border-zinc-200">
                  {cat}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">General Imprest</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "beneficiariesCount",
        header: ({ column }) => <SortableHeader column={column} title="Beneficiaries" />,
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-xs font-medium text-zinc-700 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-zinc-400" />
            <span>{row.getValue("beneficiariesCount")} Employees</span>
          </div>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: ({ column }) => <SortableHeader column={column} title="Total Net Payable" />,
        cell: ({ row }) => (
          <div className="text-right font-bold text-primary text-sm whitespace-nowrap">
            {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(row.getValue("totalAmount"))}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column} title="Approval Status" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 px-2.5 py-0.5 text-xs whitespace-nowrap w-fit">
            <CheckCircle2 className="h-3 w-3" /> Ready for Payout
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const batch = row.original;
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openBatchInSheetView(batch.date)}
                className="h-8 text-xs font-medium bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 gap-1.5 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                View Sheet
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadBatchExcel(batch)}
                title="Download Excel (Bank Format)"
                className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const totalPayable = data.reduce((sum, item) => sum + item.amount, 0)

  // ==========================================
  // VIEW MODE: GENERATED PAYMENT SHEETS LIST
  // ==========================================
  if (viewMode === "list") {
    return (
      <div className="flex-1 space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("sheet")}
                className="h-8 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Sheet
              </Button>
              <h2 className="text-3xl font-bold tracking-tight">Generated Imprest Payment Sheets</h2>
            </div>
            <p className="text-muted-foreground mt-1 ml-1">
              List of all generated & finalized imprest payment sheets prepared for bank upload.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsGenerateModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-2 font-medium cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Generate Payment Sheet
            </Button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card shadow-sm border-zinc-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Sheets</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{generatedBatches.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Generated batches</p>
              </div>
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
                <Layers className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-zinc-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Net Payable</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalGeneratedAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Across all sheets</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                <DollarSign className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-zinc-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Beneficiaries</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{totalBeneficiaries}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total payout entries</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-zinc-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Payout Status</p>
                <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> 100% CEO Approved
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Ready for ICICI/Bank upload</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generated Sheets Table */}
        <div className="border rounded-lg bg-background shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading payment sheets...</div>
          ) : generatedBatches.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <FileSpreadsheet className="h-12 w-12 text-zinc-300 mb-3" />
              <h3 className="text-lg font-semibold text-zinc-700">No Generated Payment Sheets Found</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-md">
                Click "Generate Payment Sheet" above to select a date range or specific period to generate a payment sheet.
              </p>
              <Button 
                onClick={() => setIsGenerateModalOpen(true)}
                className="mt-4 bg-primary text-primary-foreground flex items-center gap-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Generate Payment Sheet Now
              </Button>
            </div>
          ) : (
            <div className="[&_td]:py-3 [&_th]:py-3.5 [&_tr]:border-b [&_table]:w-full overflow-x-auto">
              <DataTable 
                columns={batchColumns} 
                data={generatedBatches} 
                searchPlaceholder="Search by Batch ID, date, or category..." 
                hideToolbarOptions 
              />
            </div>
          )}
        </div>

        {/* Generate Payment Sheet Date Selection Modal */}
        <Modal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          title="Generate Imprest Payment Sheet"
          description="Select the date or period to generate the bank payment sheet."
          size="md"
        >
          <div className="space-y-5 pt-2">
            {/* Selection Mode Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-lg border text-xs font-medium">
              <button
                type="button"
                onClick={() => setDateSelectionType("range")}
                className={`py-2 rounded-md transition-all cursor-pointer text-center ${
                  dateSelectionType === "range"
                    ? "bg-background text-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Date Range
              </button>
              <button
                type="button"
                onClick={() => setDateSelectionType("single")}
                className={`py-2 rounded-md transition-all cursor-pointer text-center ${
                  dateSelectionType === "single"
                    ? "bg-background text-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Single Date
              </button>
              <button
                type="button"
                onClick={() => setDateSelectionType("month")}
                className={`py-2 rounded-md transition-all cursor-pointer text-center ${
                  dateSelectionType === "month"
                    ? "bg-background text-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Month & Year
              </button>
            </div>

            {/* Inputs based on selection */}
            {dateSelectionType === "range" && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-zinc-50 border border-zinc-200/80">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={modalFromDate}
                    onChange={(e) => setModalFromDate(e.target.value)}
                    className="bg-white text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={modalToDate}
                    onChange={(e) => setModalToDate(e.target.value)}
                    className="bg-white text-xs h-9"
                  />
                </div>
              </div>
            )}

            {dateSelectionType === "single" && (
              <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  Select Date
                </label>
                <Input
                  type="date"
                  value={modalSingleDate}
                  onChange={(e) => setModalSingleDate(e.target.value)}
                  className="bg-white text-xs h-9"
                />
              </div>
            )}

            {dateSelectionType === "month" && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-zinc-50 border border-zinc-200/80">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">Month</label>
                  <select
                    value={modalMonth}
                    onChange={(e) => setModalMonth(Number(e.target.value))}
                    className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1.5 text-xs text-zinc-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">Year</label>
                  <select
                    value={modalYear}
                    onChange={(e) => setModalYear(Number(e.target.value))}
                    className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1.5 text-xs text-zinc-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Information Card */}
            <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-purple-900 leading-relaxed">
                Clicking <strong>Proceed to Sheet</strong> will download the Excel bank converter file and open the payment sheet details.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGenerateModalOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleProceedWithDateSelection}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <span>Proceed to Sheet</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ==========================================
  // VIEW MODE: SINGLE / CURRENT PAYMENT SHEET
  // ==========================================
  return (
    <div className="flex-1 space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">Imprest Payment Sheet</h2>
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
            Batch #PS-{fileSuffix} • Prepared for bank upload
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">From:</span>
            <Input 
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setSelectedDate(''); }}
              className="w-[135px] text-xs h-10 bg-background border-input"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">To:</span>
            <Input 
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setSelectedDate(''); }}
              className="w-[135px] text-xs h-10 bg-background border-input"
            />
          </div>
          {(fromDate || toDate || selectedDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate(''); setSelectedDate(''); }} className="text-xs h-10 px-2 cursor-pointer">
              Clear Dates
            </Button>
          )}
          {/* Month and Year Selectors */}
          <select 
            value={month} 
            onChange={(e) => { setMonth(Number(e.target.value)); setFromDate(''); setToDate(''); setSelectedDate(''); }}
            className="flex h-10 w-[120px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => { setYear(Number(e.target.value)); setFromDate(''); setToDate(''); setSelectedDate(''); }}
            className="flex h-10 w-[85px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <div className="relative ml-2">
            <Button variant="outline" onClick={togglePrintMenu} className="cursor-pointer">
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
                    Download as Excel (Bank Format)
                  </button>
                  <button className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-left" onClick={downloadTXT}>
                    Download as TXT (For Bank)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <Card className="bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Payment Sheet Button on the left side inside the Card */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Button 
              variant="outline" 
              onClick={() => setViewMode("list")}
              className="bg-purple-50/70 hover:bg-purple-100/80 text-purple-700 border-purple-200 font-semibold flex items-center gap-2.5 h-11 px-4 shadow-sm hover:border-purple-300 transition-all cursor-pointer"
            >
              <div className="p-1 bg-purple-100 text-purple-700 rounded">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <span className="text-sm">Payment Sheets</span>
              <Badge variant="secondary" className="ml-1 bg-purple-200/80 text-purple-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {generatedBatches.length}
              </Badge>
            </Button>

            {selectedDate && (
              <Badge variant="outline" className="bg-zinc-100 text-zinc-700 border-zinc-300 px-3 py-1 text-xs flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                Batch Date: {selectedDate}
                <button 
                  onClick={() => setSelectedDate('')} 
                  className="ml-1 text-zinc-400 hover:text-zinc-700 font-bold cursor-pointer"
                >
                  ×
                </button>
              </Badge>
            )}

            {(fromDate || toDate) && (
              <Badge variant="outline" className="bg-zinc-100 text-zinc-700 border-zinc-300 px-3 py-1 text-xs flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                Range: {fromDate || 'Start'} → {toDate || 'End'}
                <button 
                  onClick={() => { setFromDate(''); setToDate(''); }} 
                  className="ml-1 text-zinc-400 hover:text-zinc-700 font-bold cursor-pointer"
                >
                  ×
                </button>
              </Badge>
            )}
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

      <div className="border rounded-lg bg-background shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading payment sheet...</div>
        ) : (
          <div className="[&_td]:py-2 [&_th]:py-3 [&_tr]:border-b [&_table]:w-full overflow-x-auto">
            <DataTable columns={columns} data={data} searchPlaceholder="Search name or code..." hideToolbarOptions />
          </div>
        )}
      </div>
    </div>
  )
}
