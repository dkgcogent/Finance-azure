import React, { useMemo, useState, useRef, useEffect } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link } from "react-router-dom"
import {
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Save,
  Download,
  Loader2,
  Plus,
  Calendar,
  Building2,
  Briefcase,
  MapPin,
  X,
  RotateCcw,
  SlidersHorizontal,
  Pencil,
  Check,
  Trash2,
  Lock,
  Unlock,
  Edit3
} from "lucide-react"
import { apiClient } from "@/lib/api"
import { exportTableToExcel } from "@/lib/excelExportHelper"

export const parseDateHelper = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (!s) return null;

  const dmyMatch = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const ymdMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

export const calculateDaysDiff = (dueDateVal: any, pay3DateVal: any): string => {
  const d1 = parseDateHelper(dueDateVal);
  const d2 = parseDateHelper(pay3DateVal);
  if (!d1 || !d2) return "";
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  const diffDays = Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
  return String(diffDays);
};

export const getPayDelayStatus = (payDaysVal: any): string => {
  if (payDaysVal === null || payDaysVal === undefined || String(payDaysVal).trim() === '') return "";
  const num = Number(payDaysVal);
  if (isNaN(num)) return "";
  return num < 0 ? "Delay" : "Ontime";
};

type InvoiceRecord = {
  id: string
  invoiceNumber: string
  type: "Customer" | "Vendor"
  partyName: string
  amount: number
  date: string
  dueDate: string
  status: "Paid" | "Outstanding" | "Reconciled"
  aging: number // days overdue
}

const mockData: InvoiceRecord[] = [
  { id: "1", invoiceNumber: "INV-C-001", type: "Customer", partyName: "Acme Corp", amount: 15000.00, date: "2024-02-15", dueDate: "2024-03-15", status: "Outstanding", aging: 9 },
  { id: "2", invoiceNumber: "INV-V-089", type: "Vendor", partyName: "TechCorp Solutions", amount: 4500.00, date: "2024-03-01", dueDate: "2024-03-31", status: "Outstanding", aging: 0 },
  { id: "3", invoiceNumber: "INV-C-002", type: "Customer", partyName: "Globex Inc", amount: 8000.00, date: "2024-01-10", dueDate: "2024-02-10", status: "Paid", aging: 0 },
  { id: "4", invoiceNumber: "INV-V-112", type: "Vendor", partyName: "Office Supplies Co", amount: 1200.00, date: "2024-03-15", dueDate: "2024-04-15", status: "Reconciled", aging: 0 },
  { id: "5", invoiceNumber: "INV-C-003", type: "Customer", partyName: "Soylent Corp", amount: 25000.00, date: "2023-12-05", dueDate: "2024-01-05", status: "Outstanding", aging: 79 },
]

const initialDetailedData = [
  { gst: "DL", generationType: "System", gstNo: "07AAFCC4715N1ZG", invNo: "CLPL/26-27/0004", poNo: "", invDate: "30/4/2026", invMonth: "Apr-26", finYear: "2026-27", svcMonth: "Apr-26", jmsStatus: "", jmsNum: "", jmsDate: "", subDate: "05-07-2026", custName: "Flipkart", proj: "Non Large", creditDays: "30", projWork: "Non Large Fix UP LM", loc: "Uttarpradesh", revHead: "Transportation Of Goods by Road", hsn: "996601", invTo: "Flipkart India FK GTA Non Trade", rcm: "No", custGst: "09AABCF8078M1ZZ", invAmt: "10,82,657.10", igst: "", sgst: "", cgst: "", totGst: "-", totInvAmt: "10,82,657.10", tds: "21,653.00", payable: "10,61,004.10", dueDate: "04-08-2026", outstanding: "10,55,699", payStatus: "Pending", payDays: "46238" },
  { gst: "DL", generationType: "System", gstNo: "07AAFCC4715N1ZG", invNo: "CLPL/26-27/0005", poNo: "", invDate: "30/4/2026", invMonth: "Apr-26", finYear: "2026-27", svcMonth: "Apr-26", jmsStatus: "", jmsNum: "", jmsDate: "", subDate: "05-07-2026", custName: "Flipkart", proj: "Non Large", creditDays: "30", projWork: "Non Large Fix UP FM", loc: "Uttarpradesh", revHead: "Transportation Of Goods by Road", hsn: "996819", invTo: "Instakart Services Private Limited", rcm: "No", custGst: "09AADCI8374D1ZE", invAmt: "1,59,620.77", igst: "28,732.00", sgst: "-", cgst: "-", totGst: "28,732.00", totInvAmt: "1,88,352.77", tds: "3,192.00", payable: "1,85,160.77", dueDate: "04-08-2026", outstanding: "1,85,161", payStatus: "Pending", payDays: "46238" },
  { gst: "DL", generationType: "System", gstNo: "07AAFCC4715N1ZG", invNo: "CLPL/26-27/0006", poNo: "", invDate: "30/4/2026", invMonth: "Apr-26", finYear: "2026-27", svcMonth: "Apr-26", jmsStatus: "", jmsNum: "", jmsDate: "", subDate: "05-07-2026", custName: "Flipkart", proj: "Non Large", creditDays: "30", projWork: "Non Large Fix Haryana FM", loc: "Haryana", revHead: "Transportation Of Goods by Road", hsn: "996819", invTo: "Instakart Services Private Limited", rcm: "No", custGst: "06AADCI8374D1ZK", invAmt: "53,225.00", igst: "9,581.00", sgst: "-", cgst: "-", totGst: "9,581.00", totInvAmt: "62,806.00", tds: "1,065.00", payable: "61,741.00", dueDate: "04-08-2026", outstanding: "61,741", payStatus: "Pending", payDays: "46238" },
  { gst: "DL", generationType: "System", gstNo: "07AAFCC4715N1ZG", invNo: "CLPL/26-27/0007", poNo: "", invDate: "30/4/2026", invMonth: "Apr-26", finYear: "2026-27", svcMonth: "Apr-26", jmsStatus: "", jmsNum: "", jmsDate: "", subDate: "05-07-2026", custName: "Flipkart", proj: "Non Large", creditDays: "30", projWork: "Non Large Fix Haryana LM", loc: "Haryana", revHead: "Transportation Of Goods by Road", hsn: "996819", invTo: "Instakart Services Private Limited", rcm: "No", custGst: "06AADCI8374D1ZK", invAmt: "31,478.00", igst: "5,666.00", sgst: "-", cgst: "-", totGst: "5,666.00", totInvAmt: "37,144.00", tds: "630.00", payable: "36,514.00", dueDate: "04-08-2026", outstanding: "36,514", payStatus: "Pending", payDays: "46238" },
  { gst: "DL", generationType: "System", gstNo: "07AAFCC4715N1ZG", invNo: "CLPL/26-27/0008", poNo: "", invDate: "30/4/2026", invMonth: "Apr-26", finYear: "2026-27", svcMonth: "Apr-26", jmsStatus: "", jmsNum: "", jmsDate: "", subDate: "05-07-2026", custName: "Flipkart", proj: "Non Large", creditDays: "30", projWork: "Non Large Adhoc UP LM", loc: "Uttarpradesh", revHead: "Transportation Of Goods by Road", hsn: "996601", invTo: "Flipkart India FK GTA Non Trade", rcm: "No", custGst: "09AABCF8078M1ZZ", invAmt: "4,04,460.00", igst: "-", sgst: "-", cgst: "-", totGst: "-", totInvAmt: "4,04,460.00", tds: "8,089.00", payable: "3,96,371.00", dueDate: "04-08-2026", outstanding: "3,94,389", payStatus: "Pending", payDays: "46238" },
  { gst: "DL", generationType: "System", gstNo: "07AAFCC4715N1ZG", invNo: "CLPL/26-27/0014", poNo: "", invDate: "30/4/2026", invMonth: "Apr-26", finYear: "2026-27", svcMonth: "Apr-26", jmsStatus: "", jmsNum: "", jmsDate: "", subDate: "05-07-2026", custName: "Bisleri", proj: "Bisleri", creditDays: "7", projWork: "Bisleri - Mundka", loc: "Delhi", revHead: "Transportation Of Goods by Road", hsn: "996819", invTo: "Bisleri International Pvt Ltd", rcm: "No", custGst: "07AACCA4355K1ZN", invAmt: "15,54,396.87", igst: "-", sgst: "1,39,896.00", cgst: "1,39,896.00", totGst: "2,79,792.00", totInvAmt: "18,34,188.87", tds: "31,088.00", payable: "18,03,100.87", dueDate: "12-07-2026", outstanding: "18,03,101", payStatus: "Pending", payDays: "46215" },
  { gst: "DL", generationType: "System", gstNo: "07AAFCC4715N1ZG", invNo: "CLPL/26-27/0015", poNo: "5500174574", invDate: "05-08-2026", invMonth: "May-26", finYear: "2025-26", svcMonth: "Apr-26", jmsStatus: "", jmsNum: "", jmsDate: "", subDate: "05-08-2026", custName: "Reliance", proj: "B2B", creditDays: "30", projWork: "B2B - Faridabad FLM", loc: "Haryana", revHead: "Transportation Of Goods by Road", hsn: "996819", invTo: "QWIK Supply Chain Private Ltd", rcm: "No", custGst: "06AAACF5232A1ZD", invAmt: "4,40,905.00", igst: "79,363.00", sgst: "-", cgst: "-", totGst: "79,363.00", totInvAmt: "5,20,268.00", tds: "8,818.00", payable: "5,11,450.00", dueDate: "04-09-2026", outstanding: "5,11,450", payStatus: "Pending", payDays: "46269" },
];

const columnsConfig = [
  { key: 'action', label: 'Action', bg: 'bg-[#f1f5f9]', initialWidth: 90, isSticky: true },
  { key: 'gst', label: 'From GST', bg: 'bg-[#e6b8b7]', initialWidth: 100, isSticky: true },
  { key: 'generationType', label: 'Generated', bg: 'bg-[#e6b8b7]', initialWidth: 110, isSticky: true },
  { key: 'gstNo', label: 'From GST No.', bg: 'bg-[#e6b8b7]', initialWidth: 150, isSticky: true },
  { key: 'invNo', label: 'Invoice No', bg: 'bg-[#e6b8b7]', initialWidth: 150, isSticky: true },
  { key: 'poNo', label: 'Po No', bg: 'bg-[#e6b8b7]', initialWidth: 120 },
  { key: 'invDate', label: 'Invoice Date', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'invMonth', label: 'Invoice Month', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'finYear', label: 'Fin Year', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'svcMonth', label: 'Service Month', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'jmsStatus', label: 'JMS Status', bg: 'bg-[#d9d9d9]', initialWidth: 100 },
  { key: 'jmsNum', label: 'JMS Number', bg: 'bg-[#d9d9d9]', initialWidth: 100 },
  { key: 'jmsDate', label: 'JMS Date', bg: 'bg-[#d9d9d9]', initialWidth: 100 },
  { key: 'subDate', label: 'Invoice Submission/\nUpload Date', bg: 'bg-[#d9d9d9]', initialWidth: 150 },
  { key: 'custName', label: 'Customer Name', bg: 'bg-[#d9d9d9]', initialWidth: 150 },
  { key: 'proj', label: 'Project', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'creditDays', label: 'Credit\nPeriod in\nDays', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'projWork', label: 'Project work', bg: 'bg-[#d9d9d9]', initialWidth: 150 },
  { key: 'loc', label: 'Location', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'revHead', label: 'Revenue Head', bg: 'bg-[#d9d9d9]', initialWidth: 150 },
  { key: 'hsn', label: 'HSN/SAC', bg: 'bg-[#d9d9d9]', initialWidth: 100 },
  { key: 'invTo', label: 'Invoice To', bg: 'bg-[#d9d9d9]', initialWidth: 150 },
  { key: 'rcm', label: 'Invoice In RCM', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'custGst', label: 'Cutomer GST No.', bg: 'bg-[#e6b8b7]', initialWidth: 150 },
  { key: 'invAmt', label: 'Invoice Amount', bg: 'bg-[#e6b8b7]', initialWidth: 120, cellClasses: 'font-medium' },
  { key: 'igst', label: 'IGST', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'sgst', label: 'SGST', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'cgst', label: 'CGST', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'totGst', label: 'TOTAL GST', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'totInvAmt', label: 'Total Invoice Amt', bg: 'bg-[#e6b8b7]', initialWidth: 120, cellClasses: 'font-medium' },
  { key: 'tds', label: 'TDS to be deducted', bg: 'bg-[#e6b8b7]', initialWidth: 120 },
  { key: 'payable', label: 'Final Payable', bg: 'bg-[#e6b8b7]', initialWidth: 120, cellClasses: 'font-bold text-[#b42d2a]' },
  { key: 'dueDate', label: 'Due Date', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'pay1Amt', label: '1st Payment\nReceived Amount', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'pay1Date', label: 'Payment Receipt Date', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'pay1Adv', label: 'Payment Advise No.', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'pay2Amt', label: '2nd Payment\nReceived Amount', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'pay2Date', label: 'Payment Receipt Date', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'pay2Adv', label: 'Payment Advise No.', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'pay3Amt', label: '3rd Payment\nReceived Amount', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'pay3Date', label: 'Payment Receipt Date', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'pay3Adv', label: 'Payment Advise No.', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'gstPayAmt', label: 'GST Payment\nReceived', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'gstPayDate', label: 'GST Pay Date', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'totPay', label: 'Total Payment received', bg: 'bg-[#d9d9d9]', initialWidth: 120 },
  { key: 'cnNo', label: 'CN No', bg: 'bg-[#e6b8b7]', initialWidth: 120 },
  { key: 'cnAmt', label: 'CN Amount', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'cnIgst', label: 'IGST', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'cnCgst', label: 'CGST', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'cnSgst', label: 'SGST', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'cnTotGst', label: 'Total GST', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'cnTotAmt', label: 'Total CN Amount', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'outstanding', label: 'Current outstanding', bg: 'bg-[#e6b8b7]', initialWidth: 120, cellClasses: 'font-medium text-red-600' },
  { key: 'payStatus', label: 'Payment Status/Remark\n"Fully Paid, Partially Paid, Pending"', bg: 'bg-[#d9d9d9]', initialWidth: 150 },
  { key: 'payDays', label: 'Payment Done Days', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'payDelay', label: 'Payment Ontime /\nDelay', bg: 'bg-[#e6b8b7]', initialWidth: 100 },
  { key: 'netCredit', label: 'Net/Effective Credit\nPeriod', bg: 'bg-[#e6b8b7]', initialWidth: 120 },
];

export default function GlobalInvoiceMaster() {
  const [filterType, setFilterType] = useState<"All" | "Customer" | "Vendor">("All")
  const [masterRows, setMasterRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRowIds, setEditingRowIds] = useState<Set<string | number>>(new Set())

  const toggleRowEdit = (rowId: string | number) => {
    setEditingRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const toggleAllEdit = () => {
    if (editingRowIds.size === filteredMasterRows.length && filteredMasterRows.length > 0) {
      setEditingRowIds(new Set());
    } else {
      setEditingRowIds(new Set(filteredMasterRows.map(r => r.id)));
    }
  };

  const handleDeleteManualRow = (rowId: string | number) => {
    if (window.confirm("Are you sure you want to remove this manual row?")) {
      setMasterRows(prev => prev.filter(r => r.id !== rowId));
      setEditingRowIds(prev => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    }
  };
  
  const fetchMaster = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/invoicing/global-master');
      setMasterRows(res.data);
      setEditingRowIds(new Set());
    } catch (e) {
      console.error("Failed to fetch global master", e);
    } finally {
      setLoading(false);
    }
  };
  
  const [saving, setSaving] = useState(false);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post('/invoicing/global-master/save', { rows: masterRows });
      setEditingRowIds(new Set());
      alert("Manual overrides saved successfully!");
      // Re-fetch to see it merged from backend
      await fetchMaster();
    } catch (e) {
      console.error("Failed to save changes", e);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRow = () => {
    const today = new Date().toISOString().split('T')[0];
    const newId = `manual_${Date.now()}`;
    const newRow = {
      id: newId,
      isStandalone: true,
      type: "Customer",
      gst: "DL",
      generationType: "Manual",
      gstNo: "07AAFCC4715N1ZG",
      invNo: "",
      poNo: "",
      invDate: today,
      invMonth: "",
      finYear: "",
      svcMonth: "",
      jmsStatus: "Pending",
      jmsNum: "",
      jmsDate: "",
      subDate: today,
      custName: "",
      proj: "",
      creditDays: "30",
      projWork: "",
      loc: "",
      revHead: "Transportation Of Goods by Road",
      hsn: "996511",
      invTo: "",
      rcm: "No",
      custGst: "",
      invAmt: 0,
      igst: 0,
      sgst: 0,
      cgst: 0,
      totGst: 0,
      totInvAmt: 0,
      tds: 0,
      payable: 0,
      dueDate: "",
      pay1Amt: 0,
      pay1Date: "",
      pay1Adv: "",
      pay2Amt: 0,
      pay2Date: "",
      pay2Adv: "",
      pay3Amt: 0,
      pay3Date: "",
      pay3Adv: "",
      gstPayAmt: 0,
      gstPayDate: "",
      totPay: 0,
      cnNo: "",
      cnAmt: 0,
      cnIgst: 0,
      cnCgst: 0,
      cnSgst: 0,
      cnTotGst: 0,
      cnTotAmt: 0,
      outstanding: 0,
      payStatus: "Pending",
      payDays: "",
      payDelay: "",
      netCredit: "30"
    };

    setMasterRows(prev => [newRow, ...prev]);
    setEditingRowIds(prev => new Set(prev).add(newId));
  };

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("All");
  const [selectedCustomer, setSelectedCustomer] = useState("All");
  const [selectedProject, setSelectedProject] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");

  // Dynamic filter options derived from masterRows
  const customerOptions = useMemo(() => {
    const set = new Set<string>();
    masterRows.forEach(r => {
      const val = String(r.custName || '').trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterRows]);

  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    masterRows.forEach(r => {
      if (selectedCustomer !== "All" && String(r.custName || '').trim().toLowerCase() !== selectedCustomer.trim().toLowerCase()) {
        return;
      }
      const val = String(r.proj || '').trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterRows, selectedCustomer]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    masterRows.forEach(r => {
      const val = String(r.loc || '').trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterRows]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    masterRows.forEach(r => {
      if (r.invMonth && String(r.invMonth).trim()) {
        set.add(String(r.invMonth).trim());
      } else if (r.svcMonth && String(r.svcMonth).trim()) {
        set.add(String(r.svcMonth).trim());
      } else {
        const d = parseDateHelper(r.invDate);
        if (d) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const yy = String(d.getFullYear()).slice(-2);
          set.add(`${monthNames[d.getMonth()]}-${yy}`);
        }
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterRows]);

  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm.trim() !== "" ||
      startDate !== "" ||
      endDate !== "" ||
      selectedMonth !== "All" ||
      selectedCustomer !== "All" ||
      selectedProject !== "All" ||
      selectedLocation !== "All"
    );
  }, [searchTerm, startDate, endDate, selectedMonth, selectedCustomer, selectedProject, selectedLocation]);

  const resetFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setSelectedMonth("All");
    setSelectedCustomer("All");
    setSelectedProject("All");
    setSelectedLocation("All");
  };

  // Master rows filtered by all criteria
  const filteredMasterRows = useMemo(() => {
    return masterRows.filter(row => {
      // 1. Search query
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const searchableFields = [
          row.invNo, row.poNo, row.custName, row.proj, row.loc,
          row.gstNo, row.custGst, row.projWork, row.revHead, row.invTo,
          row.jmsNum, row.invMonth, row.svcMonth, row.payStatus
        ];
        const match = searchableFields.some(f => f && String(f).toLowerCase().includes(term));
        if (!match) return false;
      }

      // 2. Customer
      if (selectedCustomer !== "All") {
        if (String(row.custName || '').trim().toLowerCase() !== selectedCustomer.trim().toLowerCase()) {
          return false;
        }
      }

      // 3. Project
      if (selectedProject !== "All") {
        if (String(row.proj || '').trim().toLowerCase() !== selectedProject.trim().toLowerCase()) {
          return false;
        }
      }

      // 4. Location
      if (selectedLocation !== "All") {
        if (String(row.loc || '').trim().toLowerCase() !== selectedLocation.trim().toLowerCase()) {
          return false;
        }
      }

      // 5. Month
      if (selectedMonth !== "All") {
        const rowMonth = String(row.invMonth || row.svcMonth || '').trim().toLowerCase();
        const d = parseDateHelper(row.invDate);
        let derivedMonth = '';
        if (d) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const yy = String(d.getFullYear()).slice(-2);
          derivedMonth = `${monthNames[d.getMonth()]}-${yy}`.toLowerCase();
        }
        const targetMonth = selectedMonth.trim().toLowerCase();
        const monthMatch = rowMonth.includes(targetMonth) || targetMonth.includes(rowMonth) || derivedMonth === targetMonth;
        if (!monthMatch) return false;
      }

      // 6. Date Range
      if (startDate || endDate) {
        const d = parseDateHelper(row.invDate) || parseDateHelper(row.subDate);
        if (d) {
          const rowTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
          if (startDate) {
            const startD = new Date(startDate);
            const startTime = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate()).getTime();
            if (rowTime < startTime) return false;
          }
          if (endDate) {
            const endD = new Date(endDate);
            const endTime = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate()).getTime();
            if (rowTime > endTime) return false;
          }
        } else if (startDate || endDate) {
          return false;
        }
      }

      return true;
    });
  }, [masterRows, searchTerm, selectedCustomer, selectedProject, selectedLocation, selectedMonth, startDate, endDate]);

  const handleExport = async () => {
    const dataToExport = filteredMasterRows.length > 0 ? filteredMasterRows : masterRows;
    if (!dataToExport || dataToExport.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = columnsConfig.map(c => c.label.replace(/\n/g, ' '));
    
    const formattedData = dataToExport.map(row => {
      return columnsConfig.map(c => {
        const raw = row[c.key];
        if (raw === null || raw === undefined) return '';
        const strVal = String(raw).trim();
        const isNumeric = /^-?[\d,]+(\.\d+)?$/.test(strVal) && !c.key.toLowerCase().includes('gst') && !c.key.toLowerCase().includes('date') && !c.key.toLowerCase().includes('no') && !c.key.toLowerCase().includes('hsn');
        if (isNumeric) {
          const num = parseFloat(strVal.replace(/,/g, ''));
          if (!isNaN(num)) return num;
        }
        return strVal;
      });
    });

    await exportTableToExcel({
      sheetName: "Invoice Master",
      headers,
      data: formattedData,
      fileName: `Global_Invoice_Master_${new Date().toISOString().split('T')[0]}.xlsx`,
    });
  };

  useEffect(() => {
    fetchMaster();
  }, [])
  
  // Resizer state
  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const resizingRef = useRef<{ key: string, startX: number, startWidth: number } | null>(null)
  
  const getColWidth = (key: string, initialWidth: number) => {
    return colWidths[key] || initialWidth;
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { key, startX, startWidth } = resizingRef.current;
      const diff = e.clientX - startX;
      setColWidths(prev => ({
        ...prev,
        [key]: Math.max(50, startWidth + diff) // Min width 50px
      }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent, key: string, currentWidth: number) => {
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startWidth: currentWidth };
    document.body.style.cursor = 'col-resize';
  };

  const filteredData = mockData.filter(d => filterType === "All" || d.type === filterType)

  // Calculate dynamic sticky offsets based on columnsConfig order
  const stickyOffsets = useMemo(() => {
    let acc = 0;
    const offsets: Record<string, number> = {};
    columnsConfig.forEach(col => {
      if (col.isSticky) {
        offsets[col.key] = acc;
        acc += getColWidth(col.key, col.initialWidth);
      }
    });
    return offsets;
  }, [colWidths]);

  return (
    <div className="flex-1 space-y-6 pb-8 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/invoice">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Global Invoice Master</h2>
            <p className="text-muted-foreground mt-1">
              Unified tracker for both Customer and Vendor invoices, agings, and reconciliations.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddRow}>
            <Plus className="mr-2 h-4 w-4" />
            Add Row
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>


      <Card>
        <CardHeader className="pb-3 border-b space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Master Tracking Ledger</CardTitle>
              <CardDescription>Consolidated view of all payables and receivables.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {editingRowIds.size > 0 && (
                <Badge className="px-2.5 py-0.5 text-xs font-medium bg-blue-600 hover:bg-blue-600 text-white shadow-sm flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>{editingRowIds.size} Row{editingRowIds.size > 1 ? 's' : ''} in Edit Mode</span>
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 shadow-none border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 active:scale-95"
                onClick={toggleAllEdit}
              >
                {editingRowIds.size === filteredMasterRows.length && filteredMasterRows.length > 0 ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-slate-600 transition-transform duration-200" />
                    Lock All
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-blue-600 transition-transform duration-200" />
                    Edit All
                  </>
                )}
              </Button>
              <Badge variant="secondary" className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700">
                Showing {filteredMasterRows.length} of {masterRows.length} Invoices
              </Badge>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 px-2 font-medium transition-colors"
                  onClick={resetFilters}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end text-xs shadow-sm">
            {/* 1. Global Search */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <Search className="w-3 h-3 text-slate-500" />
                Search
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Invoice, PO, Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs bg-white pr-7 border-slate-300"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Date Range: From Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                From Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs bg-white border-slate-300"
              />
            </div>

            {/* 3. Date Range: To Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                To Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs bg-white border-slate-300"
              />
            </div>

            {/* 4. Month Wise */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
              >
                <option value="All">All Months</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* 5. Customer */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-500" />
                Customer
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => {
                  setSelectedCustomer(e.target.value);
                  setSelectedProject("All"); // Reset project when customer changes
                }}
                className="w-full h-8 px-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
              >
                <option value="All">All Customers</option>
                {customerOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* 6. Project & Location */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-slate-500" />
                  Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
                >
                  <option value="All">All Projects</option>
                  {projectOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
                >
                  <option value="All">All Locations</option>
                  {locationOptions.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMasterRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white">
              <Filter className="h-10 w-10 text-slate-300 mb-2" />
              <p className="font-semibold text-sm text-slate-700">No matching invoices found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your date range, month, customer, project, or location filter.</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4 text-xs gap-1.5" onClick={resetFilters}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-b-md overflow-x-auto bg-white" style={{ maxWidth: '100%', maxHeight: '65vh' }}>
                <table className="w-full text-xs text-center border-collapse min-w-max relative table-fixed">
                  <thead className="text-black sticky top-0 z-20">
                    <tr>
                      {columnsConfig.map((col) => {
                        const width = getColWidth(col.key, col.initialWidth);
                        const isSticky = !!col.isSticky;
                        const leftOffset = isSticky ? `${stickyOffsets[col.key] ?? 0}px` : undefined;
                        
                        return (
                          <th 
                            key={col.key} 
                            className={`p-2 border border-slate-300 font-semibold align-middle relative ${col.bg} ${isSticky ? 'sticky z-30' : ''}`}
                            style={{ 
                              width: `${width}px`, 
                              minWidth: `${width}px`, 
                              maxWidth: `${width}px`,
                              left: leftOffset 
                            }}
                          >
                            <div className="whitespace-pre-wrap">{col.label}</div>
                            <div 
                              className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-slate-400/50 z-40"
                              onMouseDown={(e) => handleMouseDown(e, col.key, width)}
                            />
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMasterRows.map((row, i) => {
                      const isRowStandalone = row.isStandalone || String(row.id).startsWith('manual_');
                      const isRowEditing = editingRowIds.has(row.id);

                      return (
                        <tr 
                          key={row.id || i} 
                          className={`group transition-colors duration-150 ${
                            isRowEditing 
                              ? 'bg-blue-50 ring-1 ring-blue-300 relative z-10' 
                              : isRowStandalone 
                                ? 'bg-amber-50/40 hover:bg-amber-50' 
                                : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          {columnsConfig.map((col) => {
                             const width = getColWidth(col.key, col.initialWidth);
                             const isSticky = !!col.isSticky;
                             const leftOffset = isSticky ? `${stickyOffsets[col.key] ?? 0}px` : undefined;

                             // Action Column
                             if (col.key === 'action') {
                               return (
                                 <td 
                                   key={col.key} 
                                   className={`p-1 border border-slate-300 text-center transition-colors duration-150 ${isSticky ? 'sticky z-10 bg-white group-hover:bg-slate-50' : 'bg-white'} ${isRowEditing ? '!bg-blue-50' : ''}`}
                                   style={{
                                     width: `${width}px`, 
                                     minWidth: `${width}px`, 
                                     maxWidth: `${width}px`,
                                     left: leftOffset 
                                   }}
                                 >
                                   <div className="flex items-center justify-center gap-1">
                                     {isRowEditing ? (
                                       <Button 
                                         size="sm" 
                                         variant="default" 
                                         className="h-6 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white gap-1 font-medium shadow-sm transition-all duration-150 ring-2 ring-emerald-400/30"
                                         onClick={() => toggleRowEdit(row.id)}
                                         title="Done editing (lock row)"
                                       >
                                         <Check className="w-3 h-3" />
                                         Done
                                       </Button>
                                     ) : (
                                       <Button 
                                         size="sm" 
                                         variant="outline" 
                                         className="h-6 px-2.5 text-[11px] border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-blue-600 hover:text-blue-700 active:scale-95 gap-1 font-medium shadow-none transition-all duration-150 hover:shadow-sm"
                                         onClick={() => toggleRowEdit(row.id)}
                                         title="Edit row"
                                       >
                                         <Pencil className="w-3 h-3" />
                                         Edit
                                       </Button>
                                     )}
                                     {isRowStandalone && (
                                       <button
                                         onClick={() => handleDeleteManualRow(row.id)}
                                         className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-all duration-150 active:scale-90"
                                         title="Delete manual row"
                                       >
                                         <Trash2 className="w-3.5 h-3.5" />
                                       </button>
                                     )}
                                   </div>
                                 </td>
                               );
                             }

                             const isCalculatedCol = ['totPay', 'outstanding', 'generationType', 'payDays', 'payDelay', 'action'].includes(col.key);
                             
                             let isEditable = false;
                             if (isRowEditing) {
                               if (isRowStandalone) {
                                 // Manual entry: both grey and red head columns can be edited
                                 isEditable = !isCalculatedCol && col.key !== 'generationType';
                               } else {
                                 // System generated: ONLY grey head columns can be edited
                                 isEditable = !isCalculatedCol && col.bg === 'bg-[#d9d9d9]';
                               }
                             }

                             const rawVal = row[col.key];
                             const isNumericCol = [
                               'invAmt', 'igst', 'sgst', 'cgst', 'totGst', 'totInvAmt',
                               'tds', 'payable', 'pay1Amt', 'pay2Amt', 'pay3Amt', 'gstPayAmt',
                               'totPay', 'cnAmt', 'cnIgst', 'cnCgst', 'cnSgst', 'cnTotGst', 'cnTotAmt', 'outstanding'
                             ].includes(col.key);
                             
                             let displayVal = rawVal || "";
                             if (isNumericCol && rawVal !== null && rawVal !== undefined && rawVal !== '') {
                               const num = Number(String(rawVal).replace(/,/g, ''));
                               if (!isNaN(num)) {
                                 displayVal = num.toFixed(2);
                               }
                             }

                             // Render non-editable badge for generated type
                             if (col.key === 'generationType') {
                               const isSys = displayVal === 'System' || displayVal === 'System Generated' || (!isRowStandalone && !displayVal);
                               return (
                                 <td 
                                   key={col.key} 
                                   className={`p-2 border border-slate-300 outline-none text-center ${col.cellClasses || ''} ${isSticky ? 'sticky z-10 bg-white group-hover:bg-slate-50' : ''} cursor-default`}
                                   style={{
                                     width: `${width}px`, 
                                     minWidth: `${width}px`, 
                                     maxWidth: `${width}px`, 
                                     left: leftOffset 
                                   }}
                                 >
                                   <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${isSys ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                     {isSys ? 'System' : 'Manual'}
                                   </span>
                                 </td>
                               );
                             }

                             // Render read-only badge for Payment Ontime / Delay
                             if (col.key === 'payDelay') {
                               if (!displayVal) {
                                 return (
                                   <td 
                                     key={col.key} 
                                     className={`p-2 border border-slate-300 outline-none text-center ${col.cellClasses || ''} ${isSticky ? 'sticky z-10 bg-white group-hover:bg-slate-50' : ''} cursor-default`}
                                     style={{
                                       width: `${width}px`, 
                                       minWidth: `${width}px`, 
                                       maxWidth: `${width}px`, 
                                       left: leftOffset 
                                     }}
                                   >
                                     -
                                   </td>
                                 );
                               }

                               const isDelay = displayVal === 'Delay';
                               return (
                                 <td 
                                   key={col.key} 
                                   className={`p-2 border border-slate-300 outline-none text-center ${col.cellClasses || ''} ${isSticky ? 'sticky z-10 bg-white group-hover:bg-slate-50' : ''} cursor-default`}
                                   style={{
                                     width: `${width}px`, 
                                     minWidth: `${width}px`, 
                                     maxWidth: `${width}px`, 
                                     left: leftOffset 
                                   }}
                                 >
                                   <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${isDelay ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                                     {displayVal}
                                   </span>
                                 </td>
                               );
                             }

                             return (
                              <td 
                                key={col.key} 
                                className={`p-2 border border-slate-300 outline-none truncate transition-colors duration-150 ${col.cellClasses || ''} ${isSticky ? 'sticky z-10 bg-white group-hover:bg-slate-50' : ''} ${
                                  isEditable 
                                    ? 'bg-amber-50 hover:bg-amber-100 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:shadow-sm cursor-text font-normal text-slate-900 border-dashed border-amber-400' 
                                    : (isRowEditing ? 'cursor-not-allowed bg-slate-100 text-slate-500 select-none' : 'cursor-default text-slate-800 select-none')
                                }`}
                                style={{
                                  width: `${width}px`, 
                                  minWidth: `${width}px`, 
                                  maxWidth: `${width}px`, 
                                  left: leftOffset 
                                }}
                                contentEditable={isEditable}
                                suppressContentEditableWarning={true}
                                title={!isEditable && isRowEditing && col.bg === 'bg-[#e6b8b7]' && !isRowStandalone ? 'System invoice billing fields are locked' : (!isRowEditing ? 'Click Edit on row to unlock' : undefined)}
                                onBlur={(e) => {
                                  if (!isEditable) return;
                                  const textVal = e.currentTarget.textContent || '';
                                  const originalIdx = masterRows.findIndex(r => (row.id ? r.id === row.id : r === row));
                                  if (originalIdx === -1) return;

                                  const newRows = [...masterRows];
                                  const updatedRow = { ...newRows[originalIdx], [col.key]: textVal };

                                  const parseNum = (v: any) => {
                                    if (v === null || v === undefined || v === '') return 0;
                                    const n = Number(String(v).replace(/,/g, ''));
                                    return isNaN(n) ? 0 : n;
                                  };

                                  if (isRowStandalone) {
                                    const invAmt = parseNum(updatedRow.invAmt);
                                    const igst = parseNum(updatedRow.igst);
                                    const sgst = parseNum(updatedRow.sgst);
                                    const cgst = parseNum(updatedRow.cgst);

                                    const totGst = Number((igst + sgst + cgst).toFixed(2));
                                    updatedRow.totGst = totGst;

                                    const totInvAmt = Number((invAmt + totGst).toFixed(2));
                                    updatedRow.totInvAmt = totInvAmt;

                                    if (col.key === 'invAmt' || !updatedRow.tds) {
                                      updatedRow.tds = Number((invAmt * 0.02).toFixed(2));
                                    }

                                    const tds = parseNum(updatedRow.tds);
                                    const payable = Number((totInvAmt - tds).toFixed(2));
                                    updatedRow.payable = payable;

                                    const cnAmt = parseNum(updatedRow.cnAmt);
                                    const cnIgst = parseNum(updatedRow.cnIgst);
                                    const cnCgst = parseNum(updatedRow.cnCgst);
                                    const cnSgst = parseNum(updatedRow.cnSgst);

                                    const cnTotGst = Number((cnIgst + cnCgst + cnSgst).toFixed(2));
                                    updatedRow.cnTotGst = cnTotGst;

                                    const cnTotAmt = Number((cnAmt + cnTotGst).toFixed(2));
                                    updatedRow.cnTotAmt = cnTotAmt;
                                  }

                                  const p1 = parseNum(updatedRow.pay1Amt);
                                  const p2 = parseNum(updatedRow.pay2Amt);
                                  const p3 = parseNum(updatedRow.pay3Amt);
                                  const gstP = parseNum(updatedRow.gstPayAmt);

                                  const totalPayment = Number((p1 + p2 + p3 + gstP).toFixed(2));
                                  updatedRow.totPay = totalPayment;

                                  const payable = parseNum(updatedRow.payable);
                                  const cnTotAmt = parseNum(updatedRow.cnTotAmt);
                                  const curOutstanding = Number((payable - totalPayment - cnTotAmt).toFixed(2));
                                  updatedRow.outstanding = curOutstanding;

                                  if (curOutstanding <= 0 && payable > 0) {
                                    updatedRow.payStatus = "Fully Paid";
                                  } else if (totalPayment > 0) {
                                    updatedRow.payStatus = "Partially Paid";
                                  } else {
                                    updatedRow.payStatus = "Pending";
                                  }

                                  const payDays = calculateDaysDiff(updatedRow.dueDate, updatedRow.pay3Date);
                                  updatedRow.payDays = payDays;
                                  updatedRow.payDelay = getPayDelayStatus(payDays);

                                  newRows[originalIdx] = updatedRow;
                                  setMasterRows(newRows);
                                }}
                              >
                                {displayVal}
                              </td>
                             )
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          )}
        </CardContent>
        <div className="p-4 border-t bg-slate-50 flex justify-start gap-4 rounded-b-md">
          <Button variant="outline" size="sm" onClick={fetchMaster} disabled={loading || saving}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button variant="default" size="sm" onClick={handleSave} disabled={loading || saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
