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
  Filter,
  Lock,
  Search,
  CheckCircle2,
  FileSpreadsheet,
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Loader2,
  Calendar,
  DollarSign,
  Users,
  Eye,
  Plus,
  Layers,
  Building2,
  Sparkles
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { apiClient } from "@/lib/api"
import html2pdf from "html2pdf.js"
import { generateImprestBankPaymentExcel, generateNormalPaymentExcel } from "../utils/generateImprestPaymentExcel"
import { exportStructuredPaymentPDF } from "../utils/exportPaymentPDF"

type VendorPaymentEntry = {
  id: string
  date: string
  vendorName: string
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

export default function VendorPaymentSheet() {
  const [searchParams] = useSearchParams()
  const initialView = searchParams.get("view") === "list" ? "list" : "sheet"
  const [viewMode, setViewMode] = useState<"sheet" | "list">(initialView)

  const currentDate = new Date()
  const [month, setMonth] = useState(currentDate.getMonth() + 1)
  const [year, setYear] = useState(currentDate.getFullYear())
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [ceoApproved, setCeoApproved] = React.useState(true)
  const [showPrintMenu, setShowPrintMenu] = React.useState(false)
  const [data, setData] = useState<VendorPaymentEntry[]>([])
  const [savedBankSheets, setSavedBankSheets] = useState<SavedBankSheet[]>([])
  const [isSavedLoading, setIsSavedLoading] = useState(false)

  // Generate Bank Payment Sheet Modal States
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [dateSelectionType, setDateSelectionType] = useState<"range" | "single" | "month">("range")
  const [modalFromDate, setModalFromDate] = useState(getTodayString())
  const [modalToDate, setModalToDate] = useState(getTodayString())
  const [modalSingleDate, setModalSingleDate] = useState(getTodayString())
  const [modalMonth, setModalMonth] = useState(currentDate.getMonth() + 1)
  const [modalYear, setModalYear] = useState(currentDate.getFullYear())
  const [isModalSubmitting, setIsModalSubmitting] = useState(false)

  const togglePrintMenu = () => setShowPrintMenu(!showPrintMenu)

  // Fetch saved vendor bank payment sheets from database
  const fetchSavedBankSheets = async () => {
    try {
      setIsSavedLoading(true);
      const res = await apiClient.get('/vendors/bank-payment-sheets');
      setSavedBankSheets(res.data || []);
    } catch (error) {
      console.error("Failed to fetch saved vendor bank payment sheets:", error);
    } finally {
      setIsSavedLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedBankSheets();
  }, []);

  const compileVendorEntries = (invoices: any[], notes: any[], fDate?: string, tDate?: string, sDate?: string, m?: number, y?: number): VendorPaymentEntry[] => {
    const parseDate = (dateStr: string) => {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // YYYY-MM-DD
      }
      return new Date(dateStr);
    };

    const formatEntryDate = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      if (dateStr.includes('T')) return dateStr.split('T')[0];
      return dateStr;
    };

    const filteredInvoices = invoices.filter((inv: any) => {
      const d = parseDate(inv.date);
      if (!d || isNaN(d.getTime())) return false;
      const recDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (fDate && tDate) {
        return recDateStr >= fDate && recDateStr <= tDate;
      } else if (fDate) {
        return recDateStr >= fDate;
      } else if (tDate) {
        return recDateStr <= tDate;
      } else if (sDate) {
        return recDateStr === sDate;
      }
      if (m && y) {
        return d.getMonth() + 1 === m && d.getFullYear() === y;
      }
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const filteredNotes = notes.filter((note: any) => {
      const noteDate = note.date || note.created_at;
      const d = parseDate(noteDate);
      if (!d || isNaN(d.getTime())) return false;
      const recDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (fDate && tDate) {
        return recDateStr >= fDate && recDateStr <= tDate;
      } else if (fDate) {
        return recDateStr >= fDate;
      } else if (tDate) {
        return recDateStr <= tDate;
      } else if (sDate) {
        return recDateStr === sDate;
      }
      if (m && y) {
        return d.getMonth() + 1 === m && d.getFullYear() === y;
      }
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const map = new Map<string, VendorPaymentEntry>();

    filteredInvoices.forEach((inv: any) => {
      const vName = inv.vendor_name || 'Unknown Vendor';
      const amt = Number(inv.amount) || 0;
      const invDate = formatEntryDate(inv.date || inv.created_at || inv.invoice_date);
      const accNo = inv.account_number || inv.accountNo || `000VEND${vName.substring(0,4).toUpperCase().padEnd(4, '0')}`;
      const ifsc = inv.ifsc_code || inv.ifscCode || inv.IFSCCode || 'SBIN0001234';
      const holderName = inv.account_holder_name || inv.accountHolderName || vName;
      
      if (map.has(vName)) {
        const existing = map.get(vName)!;
        existing.amount += amt;
        if (!existing.date && invDate) existing.date = invDate;
        if (!existing.beneficiaryAccountNo || existing.beneficiaryAccountNo.startsWith('000VEND')) {
          existing.beneficiaryAccountNo = accNo;
          existing.ifscCode = ifsc;
        }
      } else {
        map.set(vName, {
          id: `v-${vName}`,
          date: invDate || `${year}-${String(month).padStart(2, '0')}-01`,
          vendorName: vName,
          beneficiaryAccountNo: accNo,
          ifscCode: ifsc,
          beneficiaryName: holderName,
          amount: amt,
          remarksClient: "Vendor Bills",
          remarksBeneficiary: "Vendor Payment"
        });
      }
    });

    filteredNotes.forEach((note: any) => {
      const vName = note.party_name || note.customerOrVendor || 'Unknown Vendor';
      const amt = Number(note.amount) || 0;
      const noteDate = formatEntryDate(note.date || note.created_at);
      const type = note.type?.toLowerCase();
      const adjustment = type?.includes('credit') ? amt : (type?.includes('debit') ? -amt : 0);

      if (map.has(vName)) {
        const existing = map.get(vName)!;
        existing.amount += adjustment;
        existing.remarksClient = "Vendor Bills + CN/DN";
        if (!existing.date && noteDate) existing.date = noteDate;
      } else {
        map.set(vName, {
          id: `v-${vName}`,
          date: noteDate || `${year}-${String(month).padStart(2, '0')}-01`,
          vendorName: vName,
          beneficiaryAccountNo: `000VEND${vName.substring(0,4).toUpperCase().padEnd(4, '0')}`,
          ifscCode: 'SBIN0001234',
          beneficiaryName: vName,
          amount: adjustment,
          remarksClient: "Vendor CN/DN Adjustment",
          remarksBeneficiary: "Vendor Adjustment"
        });
      }
    });

    return Array.from(map.values()).filter(v => v.amount > 0);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const invRes = await apiClient.get('/vendors/invoices');
        const cndnRes = await apiClient.get('/vendors/cndn/list').catch(() => ({ data: [] }));

        const invoices = invRes.data || [];
        const notes = cndnRes.data || [];

        const compiled = compileVendorEntries(invoices, notes, fromDate, toDate, undefined, month, year);
        setData(compiled);
      } catch (err) {
        console.error("Failed to fetch vendor payment data", err);
      }
    };

    fetchData();
  }, [month, year, fromDate, toDate]);

  const fileSuffix = fromDate && toDate ? `${fromDate}_to_${toDate}` : fromDate ? `from_${fromDate}` : toDate ? `to_${toDate}` : `${year}-${String(month).padStart(2, '0')}`;

  // Save to database table VendorBankPaymentSheet & download Excel
  const saveAndDownloadBankSheet = async (
    entries: VendorPaymentEntry[],
    suffix: string,
    fDate?: string,
    tDate?: string
  ) => {
    if (!entries.length) return;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const derivedMonth = `${monthNames[month - 1]} ${year}`;
    const excelName = `Vendor_Payment_Bank_Format_${suffix}.xlsx`;

    const rowsToSave = entries.map(d => ({
      transactionType: "IFC",
      debitAccountNo: "163905500140",
      ifscCode: d.ifscCode || "SBIN0001234",
      beneficiaryAccountNo: d.beneficiaryAccountNo || "",
      beneficiaryName: d.beneficiaryName || d.vendorName,
      amount: d.amount,
      remarksClient: d.remarksClient || "VENDOR",
      remarksBeneficiary: d.remarksBeneficiary || "Vendor Payment"
    }));

    try {
      await apiClient.post('/vendors/bank-payment-sheets', {
        excelName,
        month: derivedMonth,
        dateFrom: fDate || fromDate || '',
        dateTo: tDate || toDate || '',
        rows: rowsToSave
      });
      fetchSavedBankSheets();
    } catch (err) {
      console.error("Error saving vendor bank payment sheet to database:", err);
    }

    await generateImprestBankPaymentExcel(rowsToSave, suffix, "Vendor_Payment_Bank_Format");
  };

  const handleGenerateBankPaymentSheet = async () => {
    try {
      setIsModalSubmitting(true);
      let targetFrom = '';
      let targetTo = '';
      let targetSingle = '';
      let targetMonth = month;
      let targetYear = year;
      let targetSuffix = '';

      if (dateSelectionType === "single") {
        targetSingle = modalSingleDate;
        targetSuffix = modalSingleDate;
        if (modalSingleDate) {
          const d = new Date(modalSingleDate);
          if (!isNaN(d.getTime())) {
            targetMonth = d.getMonth() + 1;
            targetYear = d.getFullYear();
          }
        }
      } else if (dateSelectionType === "range") {
        targetFrom = modalFromDate;
        targetTo = modalToDate;
        targetSuffix = `${modalFromDate}_to_${modalToDate}`;
        if (modalFromDate) {
          const d = new Date(modalFromDate);
          if (!isNaN(d.getTime())) {
            targetMonth = d.getMonth() + 1;
            targetYear = d.getFullYear();
          }
        }
      } else if (dateSelectionType === "month") {
        targetMonth = modalMonth;
        targetYear = modalYear;
        targetSuffix = `${modalYear}-${String(modalMonth).padStart(2, '0')}`;
      }

      const invRes = await apiClient.get('/vendors/invoices');
      const cndnRes = await apiClient.get('/vendors/cndn/list').catch(() => ({ data: [] }));

      const invoices = invRes.data || [];
      const notes = cndnRes.data || [];

      const filtered = compileVendorEntries(
        invoices,
        notes,
        targetFrom,
        targetTo,
        targetSingle,
        targetMonth,
        targetYear
      );

      if (filtered.length === 0) {
        alert("No approved vendor bill records found for the selected timeframe.");
        return;
      }

      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const derivedMonth = `${monthNames[targetMonth - 1]} ${targetYear}`;
      const excelName = `Vendor_Payment_Bank_Format_${targetSuffix}.xlsx`;

      const rowsToSave = filtered.map(d => ({
        transactionType: "IFC",
        debitAccountNo: "163905500140",
        ifscCode: d.ifscCode || "SBIN0001234",
        beneficiaryAccountNo: d.beneficiaryAccountNo || "",
        beneficiaryName: d.beneficiaryName || d.vendorName,
        amount: d.amount,
        remarksClient: d.remarksClient || "VENDOR",
        remarksBeneficiary: d.remarksBeneficiary || "Vendor Payment"
      }));

      try {
        await apiClient.post('/vendors/bank-payment-sheets', {
          excelName,
          month: derivedMonth,
          dateFrom: targetFrom || targetSingle || '',
          dateTo: targetTo || targetSingle || '',
          rows: rowsToSave
        });
        await fetchSavedBankSheets();
      } catch (err) {
        console.error("Error saving vendor bank payment sheet to database:", err);
      }

      await generateImprestBankPaymentExcel(rowsToSave, targetSuffix, "Vendor_Payment_Bank_Format");

      setIsGenerateModalOpen(false);
    } catch (err) {
      console.error("Failed to generate vendor bank payment sheet:", err);
      alert("Failed to generate vendor bank payment sheet");
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const downloadPDF = () => {
    setShowPrintMenu(false);
    if (!data.length) return;

    exportStructuredPaymentPDF({
      title: "Vendor Payment Sheet",
      subTitle: "Vendor Invoicing & CN/DN Payout Settlement Summary",
      periodLabel: `${monthName} ${year}`,
      batchId: `PS-VEND-${fileSuffix}`,
      type: "vendor",
      rows: data.map(d => ({
        date: d.date,
        name: d.vendorName,
        accountNo: d.beneficiaryAccountNo,
        ifscCode: d.ifscCode,
        beneficiaryName: d.beneficiaryName,
        amount: d.amount,
        remarks: d.remarksBeneficiary || d.remarksClient
      })),
      totalAmount: totalPayable,
      fileName: `Vendor_Payment_${month}_${year}.pdf`
    });
  };

  const downloadExcel = async () => {
    setShowPrintMenu(false);
    if (!data.length) return;

    const normalColumns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Vendor Name", key: "vendorName", width: 25 },
      { header: "Beneficiary Account No", key: "beneficiaryAccountNo", width: 24 },
      { header: "IFSC Code", key: "ifscCode", width: 18 },
      { header: "Beneficiary Name", key: "beneficiaryName", width: 25 },
      { header: "Amount (₹)", key: "amount", width: 18 },
      { header: "Remarks for Client", key: "remarksClient", width: 22 },
      { header: "Remarks for Beneficiary", key: "remarksBeneficiary", width: 25 }
    ];

    const fileName = `Vendor_Payment_Sheet_${fileSuffix}.xlsx`;
    await generateNormalPaymentExcel(normalColumns, data, fileName);
  };

  const downloadTXT = () => {
    setShowPrintMenu(false);
    if (!data.length) return;
    
    const txtContent = data.map(d => `${d.date || ''}|${d.beneficiaryAccountNo}|${d.ifscCode}|${d.amount}|${d.vendorName}|${d.remarksBeneficiary}`).join('\n');
    
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Vendor_Payment_Bank_Upload_${month}_${year}.txt`;
    link.click();
  };

  // Download directly from saved database sheet
  const downloadSavedBatchExcel = async (sheet: SavedBankSheet) => {
    try {
      const res = await apiClient.get(`/vendors/bank-payment-sheets/${sheet.batchId}`);
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
          ifscCode: r.ifsc_code || "SBIN0001234",
          beneficiaryAccountNo: r.beneficiary_account_no || "",
          beneficiaryName: r.beneficiary_name || "",
          amount: Number(r.amount) || 0,
          remarksClient: r.remarks_client || "VENDOR",
          remarksBeneficiary: r.remarks_beneficiary || "Vendor Payment"
        })),
        "",
        excelPrefix
      );
    } catch (err) {
      console.error("Failed to download saved vendor bank payment sheet:", err);
      alert("Failed to download saved vendor bank payment sheet");
    }
  };

  // View saved batch details
  const viewSavedBatchDetails = async (sheet: SavedBankSheet) => {
    try {
      setFromDate(sheet.dateFrom || '');
      setToDate(sheet.dateTo || '');
      setViewMode('sheet');
    } catch (err) {
      console.error("Failed to open saved batch details", err);
    }
  };

  // Columns for the Saved Vendor Bank Payment Sheets List Table
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
            <Building2 className="h-3.5 w-3.5 text-zinc-400" />
            <span>{row.getValue("totalEntries")} Vendors</span>
          </div>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: ({ column }) => <SortableHeader column={column} title="Total Net Payable" />,
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

  const totalSavedVendors = useMemo(() => {
    return filteredSavedSheets.reduce((sum, b) => sum + Number(b.totalEntries || 0), 0);
  }, [filteredSavedSheets]);

  const columns = useMemo<ColumnDef<VendorPaymentEntry>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => <SortableHeader column={column} title="Date" />,
        cell: ({ row }) => <div className="whitespace-nowrap font-mono text-xs">{row.getValue("date")}</div>,
      },
      {
        accessorKey: "vendorName",
        header: ({ column }) => <SortableHeader column={column} title="Vendor Name" />,
        cell: ({ row }) => <div className="font-semibold whitespace-nowrap">{row.getValue("vendorName")}</div>,
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
  const monthName = new Date(2000, month - 1).toLocaleString('default', { month: 'long' })

  // ==========================================
  // VIEW MODE: SAVED VENDOR BANK PAYMENT SHEETS LIST
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
              <h2 className="text-3xl font-bold tracking-tight">Saved Vendor Bank Payment Sheets</h2>
            </div>
            <p className="text-muted-foreground mt-1 ml-1 text-sm">
              View and download all generated vendor bank payment sheets stored in the <span className="font-mono text-zinc-700 font-medium">VendorBankPaymentSheet</span> table.
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-card shadow-sm border-zinc-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Sheets</p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Net Payable</p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Beneficiaries</p>
                <p className="text-2xl font-bold text-zinc-900 mt-1">{totalSavedVendors}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total payout records</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <Building2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Saved Sheets Table */}
        <div className="border rounded-lg bg-background shadow-sm overflow-hidden">
          {isSavedLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading saved vendor bank payment sheets...</div>
          ) : savedBankSheets.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
              <FileSpreadsheet className="h-12 w-12 text-zinc-300 mb-3" />
              <h3 className="text-lg font-semibold text-zinc-700">No Saved Vendor Bank Payment Sheets Found</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-md">
                When you click "Generate Bank Payment Sheet", the vendor payment data is automatically saved into the <span className="font-semibold text-zinc-700">VendorBankPaymentSheet</span> database table and listed here for instant downloading.
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

        {/* Generate Vendor Bank Payment Sheet Date Selection Modal */}
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
                Clicking <strong>Generate & Save Sheet</strong> will download the Excel bank converter file and save all row data into the <strong>VendorBankPaymentSheet</strong> table in database.
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
                onClick={handleGenerateBankPaymentSheet}
                disabled={isModalSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 cursor-pointer text-xs"
              >
                {isModalSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Generate & Save Sheet</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ==========================================
  // VIEW MODE: LIVE VENDOR PAYMENT SHEET VIEW
  // ==========================================
  return (
    <div className="flex-1 space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">Vendor Payment Sheet</h2>
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
          {/* View Bank Payment Sheet Button */}
          <Button
            variant="outline"
            onClick={() => {
              fetchSavedBankSheets();
              setViewMode("list");
            }}
            className="h-10 text-xs font-semibold bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 border-emerald-300 gap-1.5 cursor-pointer shadow-xs"
          >
            <Layers className="h-4 w-4 text-emerald-600" />
            View Bank Payment Sheet
            {savedBankSheets.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full">
                {savedBankSheets.length}
              </Badge>
            )}
          </Button>

          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">From:</span>
            <Input 
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[135px] text-xs h-10 bg-background border-input"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">To:</span>
            <Input 
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[135px] text-xs h-10 bg-background border-input"
            />
          </div>
          {(fromDate || toDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate(''); }} className="text-xs h-10 px-2 cursor-pointer">
              Clear Dates
            </Button>
          )}
          {/* Month and Year Selectors */}
          <select 
            value={month} 
            onChange={(e) => { setMonth(Number(e.target.value)); setFromDate(''); setToDate(''); }}
            className="flex h-10 w-[120px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => { setYear(Number(e.target.value)); setFromDate(''); setToDate(''); }}
            className="flex h-10 w-[85px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              <div className="absolute right-0 top-full mt-1 w-56 rounded-md border bg-popover text-popover-foreground shadow-md z-50">
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

      {/* Dynamic Summary Card */}
      <div className="flex justify-end mb-4">
          <Card className="inline-flex overflow-hidden shadow-xs">
            <CardContent className="p-4 bg-emerald-50/50 flex items-center gap-4">
               <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Net Payable</p>
                  <p className="text-2xl font-bold text-primary">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalPayable)}</p>
               </div>
               <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                 <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
               </div>
            </CardContent>
          </Card>
      </div>

      <div className="border rounded-lg bg-background shadow-sm overflow-hidden">
        {/* We use the shared DataTable component, but wrapper styling makes it feel more dense/Excel-like */}
        <div className="[&_td]:py-2 [&_th]:py-3 [&_tr]:border-b [&_table]:w-full overflow-x-auto">
          <DataTable columns={columns} data={data} searchPlaceholder="Search vendor name..." hideToolbarOptions />
        </div>
      </div>
    </div>
  )
}
