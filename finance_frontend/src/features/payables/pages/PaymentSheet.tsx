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
import { generateImprestBankPaymentExcel, generateNormalPaymentExcel } from "../utils/generateImprestPaymentExcel"
import { exportStructuredPaymentPDF } from "../utils/exportPaymentPDF"

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

type SavedBankSheet = {
  batchId: string
  excelName: string
  month: string
  dateFrom: string
  dateTo: string
  totalEntries: number
  totalAmount: number
  createdAt: string
  updatedAt: string
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
  const [savedBankSheets, setSavedBankSheets] = useState<SavedBankSheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavedLoading, setIsSavedLoading] = useState(false)

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

  // Fetch saved bank payment sheets from database
  const fetchSavedBankSheets = async () => {
    try {
      setIsSavedLoading(true);
      const res = await apiClient.get('/imprests/bank-payment-sheets');
      setSavedBankSheets(res.data || []);
    } catch (error) {
      console.error("Failed to fetch saved bank payment sheets:", error);
    } finally {
      setIsSavedLoading(false);
    }
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
    fetchSavedBankSheets();
  }, [month, year, selectedDate, fromDate, toDate]);

  const fileSuffix = fromDate && toDate ? `${fromDate}_to_${toDate}` : fromDate ? `from_${fromDate}` : toDate ? `to_${toDate}` : selectedDate ? selectedDate : `${year}-${String(month).padStart(2, '0')}`;

  // Save to database table ImprestBankPaymentSheet & download Excel
  const saveAndDownloadBankSheet = async (
    entries: PaymentEntry[],
    suffix: string,
    fDate?: string,
    tDate?: string,
    mMonth?: number | string,
    mYear?: number | string
  ) => {
    if (!entries.length) return;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const derivedMonth = typeof mMonth === 'number' ? `${monthNames[mMonth - 1]} ${mYear || year}` : (mMonth || `${monthNames[month - 1]} ${year}`);
    const excelName = `Imprest_Payment_Bank_Format_${suffix}.xlsx`;

    const rowsToSave = entries.map(d => ({
      transactionType: "IFC",
      debitAccountNo: "163905500140",
      ifscCode: d.ifscCode || "ICIC0000011",
      beneficiaryAccountNo: d.beneficiaryAccountNo || "",
      beneficiaryName: d.beneficiaryName || d.employeeName,
      amount: d.amount,
      remarksClient: d.remarksClient || "IMPREST",
      remarksBeneficiary: d.remarksBeneficiary || "Imprest Payment"
    }));

    try {
      await apiClient.post('/imprests/bank-payment-sheets', {
        excelName,
        month: derivedMonth,
        dateFrom: fDate || fromDate || selectedDate || '',
        dateTo: tDate || toDate || selectedDate || '',
        rows: rowsToSave
      });
      fetchSavedBankSheets();
    } catch (err) {
      console.error("Error saving bank payment sheet to database:", err);
    }

    await generateImprestBankPaymentExcel(rowsToSave, suffix);
  };

  const downloadPDF = () => {
    setShowPrintMenu(false);
    if (!data.length) return;

    exportStructuredPaymentPDF({
      title: "Imprest Payment Sheet",
      subTitle: "Operational & Site Imprest Disbursement Summary",
      periodLabel: `Period: ${fileSuffix}`,
      batchId: `PS-IMP-${fileSuffix}`,
      type: "imprest",
      rows: data.map(d => ({
        date: d.date,
        name: d.employeeName,
        code: d.employeeCode,
        accountNo: d.beneficiaryAccountNo,
        ifscCode: d.ifscCode,
        beneficiaryName: d.beneficiaryName,
        amount: d.amount,
        remarks: d.remarksBeneficiary || d.remarksClient
      })),
      totalAmount: totalPayable,
      fileName: `Imprest_Payment_Sheet_${fileSuffix}.pdf`
    });
  };

  const downloadExcel = async () => {
    setShowPrintMenu(false);
    if (!data.length) return;

    const normalColumns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Employee Name", key: "employeeName", width: 25 },
      { header: "Employee Code", key: "employeeCode", width: 18 },
      { header: "Beneficiary Account No", key: "beneficiaryAccountNo", width: 24 },
      { header: "IFSC Code", key: "ifscCode", width: 18 },
      { header: "Beneficiary Name", key: "beneficiaryName", width: 25 },
      { header: "Amount (₹)", key: "amount", width: 18 },
      { header: "Remarks for Client", key: "remarksClient", width: 22 },
      { header: "Remarks for Beneficiary", key: "remarksBeneficiary", width: 25 }
    ];

    const fileName = `Imprest_Payment_Sheet_${fileSuffix}.xlsx`;
    await generateNormalPaymentExcel(normalColumns, data, fileName);
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

  // Download directly from saved database sheet
  const downloadSavedBatchExcel = async (sheet: SavedBankSheet) => {
    try {
      const res = await apiClient.get(`/imprests/bank-payment-sheets/${sheet.batchId}`);
      const batchRows: any[] = res.data || [];
      if (batchRows.length === 0) {
        alert("No records found for this saved sheet");
        return;
      }

      const excelPrefix = sheet.excelName.replace(/\.xlsx$/i, '');
      await generateImprestBankPaymentExcel(
        batchRows.map(r => ({
          transactionType: r.transaction_type || "IFC",
          debitAccountNo: r.debit_account_no || "163905500140",
          ifscCode: r.ifsc_code || "ICIC0000011",
          beneficiaryAccountNo: r.beneficiary_account_no || "",
          beneficiaryName: r.beneficiary_name || "",
          amount: Number(r.amount) || 0,
          remarksClient: r.remarks_client || "IMPREST",
          remarksBeneficiary: r.remarks_beneficiary || "Imprest Payment"
        })),
        "",
        excelPrefix
      );
    } catch (err) {
      console.error("Failed to download saved bank payment sheet:", err);
      alert("Failed to download saved bank payment sheet");
    }
  };

  // View saved batch details in sheet table
  const viewSavedBatchDetails = async (sheet: SavedBankSheet) => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/imprests/bank-payment-sheets/${sheet.batchId}`);
      const batchRows: any[] = res.data || [];
      
      setData(batchRows.map((r, idx) => ({
        id: String(r.id || idx),
        date: r.date_from || r.date_to || (r.created_at ? r.created_at.split('T')[0] : ''),
        employeeName: r.beneficiary_name || '',
        employeeCode: `EMP${r.id || idx}`,
        beneficiaryAccountNo: r.beneficiary_account_no || '',
        ifscCode: r.ifsc_code || '',
        beneficiaryName: r.beneficiary_name || '',
        amount: Number(r.amount) || 0,
        remarksClient: r.remarks_client || 'IMPREST',
        remarksBeneficiary: r.remarks_beneficiary || ''
      })));

      setFromDate(sheet.dateFrom || '');
      setToDate(sheet.dateTo || '');
      setSelectedDate('');
      setViewMode('sheet');
    } catch (err) {
      console.error("Failed to load saved batch details", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Date Selection Modal Proceed: Triggers automatic database storage and Excel download
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

    // Save to Database & Download Excel in bank format
    await saveAndDownloadBankSheet(
      targetEntries,
      targetSuffix,
      targetFrom || targetSingle,
      targetTo || targetSingle,
      targetMonth,
      targetYear
    );

    // Update active data and open sheet view
    setData(targetEntries);
    setIsGenerateModalOpen(false);
    setViewMode("sheet");
  };

  // Columns for the Saved Bank Payment Sheets List Table
  const savedBankSheetColumns = useMemo<ColumnDef<SavedBankSheet>[]>(
    () => [
      {
        accessorKey: "excelName",
        header: ({ column }) => <SortableHeader column={column} title="Bank Payment Sheet Excel name" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-zinc-900 text-xs block">{row.getValue("excelName")}</span>
              <span className="text-[11px] text-muted-foreground font-mono">{row.original.batchId}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "month",
        header: ({ column }) => <SortableHeader column={column} title="Month" />,
        cell: ({ row }) => (
          <div className="font-medium text-xs text-zinc-700">
            {row.getValue("month") || "-"}
          </div>
        ),
      },
      {
        accessorKey: "dateFrom",
        header: ({ column }) => <SortableHeader column={column} title="Date to (From)" />,
        cell: ({ row }) => (
          <div className="whitespace-nowrap font-medium text-xs text-zinc-700 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            {row.getValue("dateFrom") || "-"}
          </div>
        ),
      },
      {
        accessorKey: "dateTo",
        header: ({ column }) => <SortableHeader column={column} title="Date End (To)" />,
        cell: ({ row }) => (
          <div className="whitespace-nowrap font-medium text-xs text-zinc-700 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            {row.getValue("dateTo") || "-"}
          </div>
        ),
      },
      {
        accessorKey: "totalEntries",
        header: ({ column }) => <SortableHeader column={column} title="Beneficiaries" />,
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-xs font-medium text-zinc-700 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-zinc-400" />
            <span>{row.getValue("totalEntries")} Records</span>
          </div>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: ({ column }) => <SortableHeader column={column} title="Total Amount" />,
        cell: ({ row }) => (
          <div className="font-bold text-primary text-xs whitespace-nowrap">
            {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(row.getValue("totalAmount")) || 0)}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableHeader column={column} title="Generated On" />,
        cell: ({ row }) => {
          const d = row.getValue("createdAt") ? new Date(row.getValue("createdAt") as string) : null;
          return (
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {d ? d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Download</div>,
        cell: ({ row }) => {
          const sheet = row.original;
          return (
            <div className="flex items-center justify-end">
              <Button
                variant="default"
                size="sm"
                onClick={() => downloadSavedBatchExcel(sheet)}
                title="Download Bank Payment Sheet Excel"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5 cursor-pointer shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Download Excel
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const [listFromDate, setListFromDate] = useState<string>('');
  const [listToDate, setListToDate] = useState<string>('');
  const [listMonth, setListMonth] = useState<number | "all">("all");
  const [listYear, setListYear] = useState<number | "all">("all");

  const parseCreatedDateInfo = (createdAt?: string) => {
    if (!createdAt) return null;
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { dateStr, month, year };
    }
    const clean = createdAt.split('T')[0].split(' ')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return {
        dateStr: `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`,
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10)
      };
    }
    return null;
  };

  const filteredSavedSheets = useMemo(() => {
    return savedBankSheets.filter(sheet => {
      const createdInfo = parseCreatedDateInfo(sheet.createdAt);
      if (!createdInfo) return true;

      // 1. Filter strictly by Generated On Date Range (From & To)
      if (listFromDate && createdInfo.dateStr < listFromDate) {
        return false;
      }
      if (listToDate && createdInfo.dateStr > listToDate) {
        return false;
      }

      // 2. Filter strictly by Generated On Month
      if (listMonth !== "all" && createdInfo.month !== listMonth) {
        return false;
      }

      // 3. Filter strictly by Generated On Year
      if (listYear !== "all" && createdInfo.year !== listYear) {
        return false;
      }

      return true;
    });
  }, [savedBankSheets, listFromDate, listToDate, listMonth, listYear]);

  const isListFilterActive = !!(listFromDate || listToDate || listMonth !== "all" || listYear !== "all");

  const clearListFilters = () => {
    setListFromDate('');
    setListToDate('');
    setListMonth('all');
    setListYear('all');
  };

  const totalSavedAmount = useMemo(() => {
    return filteredSavedSheets.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
  }, [filteredSavedSheets]);

  const totalSavedBeneficiaries = useMemo(() => {
    return filteredSavedSheets.reduce((sum, b) => sum + Number(b.totalEntries || 0), 0);
  }, [filteredSavedSheets]);

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
        header: ({ column }) => (
          <div className="flex justify-center">
            <SortableHeader column={column} title="Amount (₹)" className="ml-0" />
          </div>
        ),
        cell: ({ row }) => <div className="text-center font-bold text-primary">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(row.getValue("amount"))}</div>,
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

  const totalPayable = data.reduce((sum, item) => sum + item.amount, 0)

  // ==========================================
  // VIEW MODE: SAVED BANK PAYMENT SHEETS LIST
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
              <h2 className="text-3xl font-bold tracking-tight">Saved Bank Payment Sheets</h2>
            </div>
            <p className="text-muted-foreground mt-1 ml-1 text-sm">
              View and download all generated & stored bank payment sheets in Excel format from <span className="font-mono text-zinc-700 font-medium">ImprestBankPaymentSheet</span> table.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsGenerateModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 font-medium cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Generate Bank Payment Sheet
            </Button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card shadow-sm border-zinc-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Sheets</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{savedBankSheets.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Saved in database</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-zinc-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Net Payable</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalSavedAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Across all saved batches</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                <DollarSign className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-sm border-zinc-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Beneficiaries</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{totalSavedBeneficiaries}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total payout records</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Saved Sheets Table */}
        <div className="border rounded-lg bg-background shadow-sm overflow-hidden">
          {isSavedLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading saved bank payment sheets...</div>
          ) : savedBankSheets.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <FileSpreadsheet className="h-12 w-12 text-zinc-300 mb-3" />
              <h3 className="text-lg font-semibold text-zinc-700">No Saved Bank Payment Sheets Found</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-md">
                When you click "Generate Bank Payment Sheet", the data will be simultaneously stored into the <span className="font-semibold text-zinc-700">ImprestBankPaymentSheet</span> database table and listed here for instant downloading.
              </p>
              <Button 
                onClick={() => setIsGenerateModalOpen(true)}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Generate Bank Payment Sheet Now
              </Button>
            </div>
          ) : (
            <div className="[&_td]:py-3 [&_th]:py-3.5 [&_tr]:border-b [&_table]:w-full overflow-x-auto">
              <DataTable 
                columns={savedBankSheetColumns} 
                data={filteredSavedSheets} 
                searchPlaceholder="Search by Excel name, month, or batch ID..." 
                hideToolbarOptions 
                toolbarRight={
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1 shadow-2xs">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-[11px] text-muted-foreground font-medium">From:</span>
                      <input 
                        type="date" 
                        value={listFromDate} 
                        onChange={(e) => setListFromDate(e.target.value)}
                        className="bg-transparent text-xs outline-none cursor-pointer text-zinc-800"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1 shadow-2xs">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-[11px] text-muted-foreground font-medium">To:</span>
                      <input 
                        type="date" 
                        value={listToDate} 
                        onChange={(e) => setListToDate(e.target.value)}
                        className="bg-transparent text-xs outline-none cursor-pointer text-zinc-800"
                      />
                    </div>

                    <select
                      value={listMonth}
                      onChange={(e) => setListMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
                      className="h-8 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 text-xs text-zinc-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer font-medium"
                    >
                      <option value="all">All Months</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                        </option>
                      ))}
                    </select>

                    <select
                      value={listYear}
                      onChange={(e) => setListYear(e.target.value === "all" ? "all" : Number(e.target.value))}
                      className="h-8 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 text-xs text-zinc-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer font-medium"
                    >
                      <option value="all">All Years</option>
                      {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>

                    {isListFilterActive && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearListFilters}
                        className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer font-medium"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                }
              />
            </div>
          )}
        </div>

        {/* Generate Payment Sheet Date Selection Modal */}
        <Modal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          title="Generate Bank Payment Sheet"
          description="Select the date range or month to generate and save the bank payment sheet."
          size="md"
        >
          <div className="space-y-5 pt-2">
            {/* Selection Mode Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-lg border text-xs font-medium">
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
            <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-emerald-900 leading-relaxed">
                Clicking <strong>Generate & Save Sheet</strong> will download the Excel bank converter file and save all row data into the <strong>ImprestBankPaymentSheet</strong> table in database.
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <span>Generate & Save Sheet</span>
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
                    Download as Excel
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
          {/* View Bank Payment Sheet Button on the left side inside the Card (Circled in UI) */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Button 
              variant="outline" 
              onClick={() => setViewMode("list")}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold flex items-center gap-2.5 h-10 px-4 shadow-sm hover:border-emerald-400 transition-all cursor-pointer"
            >
              <div className="p-1 bg-emerald-100 text-emerald-700 rounded">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <span className="text-sm">View Bank Payment Sheet</span>
              <Badge variant="secondary" className="ml-1 bg-emerald-200 text-emerald-900 text-xs font-bold px-2 py-0.5 rounded-full">
                {savedBankSheets.length}
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
