import { useState, useMemo, useEffect } from "react"
import { useActualBankChargesQuery, useSaveActualBankChargesMutation } from "../hooks/useActualBankCharges"
import { useAvailableYearsQuery } from "../hooks/useActualRevenue"
import { useGlobalStore } from "@/store/useGlobalStore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Plus, Save, Trash2, Download, Upload, Loader2 } from "lucide-react"
import Papa from "papaparse"

type MonthKey = 'apr' | 'may' | 'jun' | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec' | 'jan' | 'feb' | 'mar';

const MONTHS: MonthKey[] = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'];

const YEAR_OPTIONS = Array.from({ length: 18 }, (_, i) => `${2023 + i}-${2024 + i}`);

interface BankChargeRow {
  id: string;
  year: string;
  head: string;
  apr: string | null;
  may: string | null;
  jun: string | null;
  jul: string | null;
  aug: string | null;
  sep: string | null;
  oct: string | null;
  nov: string | null;
  dec: string | null;
  jan: string | null;
  feb: string | null;
  mar: string | null;
  total: string | null;
}

const parseFormattedNumber = (val: string | null): number => {
  if (!val || val === "-") return 0;
  return parseFloat(val.replace(/,/g, '').replace(/%/g, '')) || 0;
}

const formatIndianNumber = (num: number): string => {
  if (isNaN(num) || num === 0) return "0";
  return num.toLocaleString('en-IN');
}

const getEmptyMonths = (defaultVal: string | null = null) => ({
  apr: defaultVal, may: defaultVal, jun: defaultVal, jul: defaultVal, aug: defaultVal, sep: defaultVal, oct: defaultVal, nov: defaultVal, dec: defaultVal, jan: defaultVal, feb: defaultVal, mar: defaultVal, total: defaultVal ? formatIndianNumber(parseFormattedNumber(defaultVal) * 12) : null
});

const DEFAULT_HEADS = [
  { name: 'ICICI OD Interest' },
  { name: 'Lendingkart Bank Interest/ EMI' },
  { name: 'Director Loan Interest' },
  { name: 'LAP Interest' },
  { name: 'ICICI Noida Office Loan Interest/ EMI' },
  { name: 'RED Funding Interest' }
];

const INITIAL_YEAR = "2026-2027";

const INITIAL_DATA: BankChargeRow[] = [];


export default function BankCharges() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [data, setData] = useState<BankChargeRow[]>([]);
  const { data: serverData, isLoading: isQueryLoading } = useActualBankChargesQuery(selectedYear);
  const { mutateAsync: saveBankCharges, isPending: isSaving } = useSaveActualBankChargesMutation();
  const isLoading = isQueryLoading;

  const { data: serverAvailableYears } = useAvailableYearsQuery();
  const availableYears = serverAvailableYears && serverAvailableYears.length > 0 ? serverAvailableYears : [selectedYear];

  useEffect(() => {
    if (!serverData) return;
    if (serverData.length > 0) {
      const formattedData = serverData.map((row: any, idx: number) => {
        let total = 0;
        let hasData = false;
        const mappedRow: any = {
          id: `fetched-${idx}-${Date.now()}`,
          year: row.year || selectedYear,
          head: row.head || "",
        };
        MONTHS.forEach(m => {
          if (row[m] != null) {
            hasData = true;
            total += parseFloat(row[m]);
            mappedRow[m] = formatIndianNumber(parseFloat(row[m]));
          } else {
            mappedRow[m] = null;
          }
        });
        mappedRow.total = hasData ? formatIndianNumber(total) : null;
        return mappedRow;
      });
      setData(formattedData);
    } else {
      setData([]);
    }
  }, [serverData, selectedYear]);

  const [isAddHeadOpen, setIsAddHeadOpen] = useState(false);
  const [newHeadName, setNewHeadName] = useState("");
  const [newRowYear, setNewRowYear] = useState(INITIAL_YEAR);

  // Column resizing state
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    head: 220,
    apr: 65, may: 65, jun: 65, jul: 65, aug: 65, sep: 65, oct: 65, nov: 65, dec: 65, jan: 65, feb: 65, mar: 65,
    total: 85,
    action: 40
  });

  const startResize = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = colWidths[colKey] || 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(40, startWidth + (moveEvent.pageX - startX));
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const Resizer = ({ colKey }: { colKey: string }) => (
    <div
      onMouseDown={(e) => startResize(e, colKey)}
      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-slate-400 dark:hover:bg-slate-500 z-10"
      title="Drag to resize"
    />
  );

  const handleAddHead = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHeadName.trim() === "") return;

    // Check if head already exists for current year
    if (data.some(r => r.year === newRowYear && r.head === newHeadName)) {
      alert("This head already exists in the selected year.");
      return;
    }

    const newRow: BankChargeRow = {
      id: `r-${Date.now()}`,
      year: newRowYear,
      head: newHeadName,
      ...getEmptyMonths()
    };
    setData([...data, newRow]);
    setSelectedYear(newRowYear);
    setIsAddHeadOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const keywords = ['interest', 'charge', 'fee', 'emi', 'penalty', 'bounce', 'processing'];
        const newTotals: Record<MonthKey, number> = { apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0 };
        let foundCharges = false;

        results.data.forEach((row: any) => {
          const rowKeys = Object.keys(row);
          const descKey = rowKeys.find(k => k.toLowerCase().includes('description') || k.toLowerCase().includes('particulars'));
          const dateKey = rowKeys.find(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('txn date'));
          const debitKey = rowKeys.find(k => k.toLowerCase().includes('withdrawal') || k.toLowerCase().includes('debit') || k.toLowerCase().includes('amount'));

          if (descKey && dateKey && debitKey) {
            const desc = (row[descKey] || '').toLowerCase();
            const isCharge = keywords.some(kw => desc.includes(kw));

            if (isCharge) {
              const debitStr = String(row[debitKey] || '').replace(/,/g, '');
              const amount = parseFloat(debitStr);
              
              if (amount > 0) {
                const dateParts = String(row[dateKey]).split(/[-/]/);
                let monthIdx = -1;
                
                if (dateParts.length >= 2) {
                   // Assume DD/MM/YYYY or DD-MMM-YY
                   const monthPart = dateParts[1];
                   if (isNaN(parseInt(monthPart))) {
                     // Month string like 'Jan'
                     const mMap: Record<string, number> = { 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11 };
                     monthIdx = mMap[monthPart.toLowerCase().substring(0,3)];
                   } else {
                     monthIdx = parseInt(monthPart) - 1; 
                   }
                }

                if (monthIdx >= 0 && monthIdx <= 11) {
                  const date = new Date(2020, monthIdx, 1);
                  const monthName = date.toLocaleString('default', { month: 'short' }).toLowerCase() as MonthKey;
                  if (MONTHS.includes(monthName)) {
                    newTotals[monthName] += amount;
                    foundCharges = true;
                  }
                }
              }
            }
          }
        });

        if (foundCharges) {
          const newRow: BankChargeRow = {
            id: `r-auto-${Date.now()}`,
            year: selectedYear,
            head: "Auto-Parsed Bank Charges",
            ...getEmptyMonths()
          };

          let rowTotal = 0;
          MONTHS.forEach(m => {
            if (newTotals[m] > 0) {
              (newRow as any)[m] = formatIndianNumber(newTotals[m]);
              rowTotal += newTotals[m];
            }
          });
          newRow.total = formatIndianNumber(rowTotal);

          setData(prev => {
            const existingIdx = prev.findIndex(r => r.head === "Auto-Parsed Bank Charges" && r.year === selectedYear);
            if (existingIdx >= 0) {
              const updated = [...prev];
              updated[existingIdx] = newRow;
              return updated;
            }
            return [...prev, newRow];
          });
          
          alert("Successfully parsed bank statement and extracted charges!");
        } else {
          alert("No bank charges found in the uploaded statement. Please ensure it has Date, Description, and Withdrawal columns.");
        }
        e.target.value = '';
      }
    });
  };

  const handleDeleteRow = (id: string) => {
    setData(data.filter(row => row.id !== id));
  };

  const handleCellChange = (id: string, field: string, value: string) => {
    setData(prevData => {
      const newData = [...prevData];
      const rowIndex = newData.findIndex(r => r.id === id);
      if (rowIndex === -1) return prevData;

      const row = { ...newData[rowIndex] };

      if (MONTHS.includes(field as MonthKey)) {
        const sanitizedValue = value.replace(/[^0-9.,]/g, '');
        (row as any)[field] = sanitizedValue;

        // Auto calculate row total
        let total = 0;
        let hasData = false;
        MONTHS.forEach(m => {
          if (row[m]) hasData = true;
          total += parseFormattedNumber(row[m]);
        });
        row.total = hasData ? formatIndianNumber(total) : null;
      } else {
        (row as any)[field] = value;
      }

      newData[rowIndex] = row;
      return newData;
    });
  };

  const handleSaveChanges = async () => {
    try {
      await saveBankCharges({
        financialYear: selectedYear,
        data: currentYearData.map(row => {
          const rowData: any = { head: row.head };
          MONTHS.forEach(m => {
            rowData[m] = parseFormattedNumber(row[m]);
          });
          return rowData;
        })
      });
      alert("Changes saved successfully!");
    } catch (error) {
      console.error("Save failed", error);
      alert("Failed to save changes.");
    }
  };

  const currentYearData = useMemo(() => {
    return data.filter(r => r.year === selectedYear);
  }, [data, selectedYear]);

  const totals = useMemo(() => {
    const acc: Record<string, number> = { apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, total: 0 };
    currentYearData.forEach(row => {
      MONTHS.forEach(m => { acc[m] += parseFormattedNumber(row[m]); });
      acc.total += parseFormattedNumber(row.total);
    });
    return acc;
  }, [currentYearData]);

  const getMonthHeaders = (yearRange: string) => {
    const [startYearStr, endYearStr] = yearRange.split('-');
    if (!startYearStr || !endYearStr) return MONTHS.map(m => m.charAt(0).toUpperCase() + m.slice(1));
    const startYr = startYearStr.substring(2);
    const endYr = endYearStr.substring(2);

    return [
      `Apr-${startYr}`, `May-${startYr}`, `Jun-${startYr}`, `Jul-${startYr}`, `Aug-${startYr}`, `Sep-${startYr}`, `Oct-${startYr}`, `Nov-${startYr}`, `Dec-${startYr}`,
      `Jan-${endYr}`, `Feb-${endYr}`, `Mar-${endYr}`
    ];
  };

  const dynamicHeaders = getMonthHeaders(selectedYear);

  return (
    <div className="flex-1 space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bank Charges</h2>
          <p className="text-muted-foreground mt-1">
            Manage interest, EMIs and bank-related charges month by month.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => document.getElementById('csvUpload')?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Statement
            </Button>
            <input type="file" id="csvUpload" accept=".csv" className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" size="sm" className="h-8" onClick={() => {
            import('xlsx').then(XLSX => {
              const table = document.getElementById('export-table');
              if (table) {
                const clone = table.cloneNode(true) as Element;
                const inputs = clone.querySelectorAll('input');
                inputs.forEach(input => {
                  const val = input.value;
                  const parent = input.parentElement;
                  if (parent) parent.textContent = val || '-';
                });
                const wb = XLSX.utils.table_to_book(clone, { raw: true });
                XLSX.writeFile(wb, `BankCharges_actual_${selectedYear}.xlsx`);
              }
            });
          }}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          </div>
          <div className="space-y-1 text-right sm:text-left">
            <label className="text-xs font-medium text-muted-foreground">Financial Year</label>
            <select
              className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar">
            <Table id="export-table" className="border-collapse w-max min-w-full" style={{ tableLayout: 'fixed' }}>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="relative border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths.head, minWidth: colWidths.head }}>
                    Head
                    <Resizer colKey="head" />
                  </TableHead>
                  {dynamicHeaders.map((header, idx) => (
                    <TableHead key={MONTHS[idx]} className="relative border-r-2 border-slate-300 dark:border-slate-700 text-center text-[10px] sm:text-xs font-bold text-black dark:text-white h-10 px-0.5 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths[MONTHS[idx]], minWidth: colWidths[MONTHS[idx]] }}>
                      {header}
                      <Resizer colKey={MONTHS[idx]} />
                    </TableHead>
                  ))}
                  <TableHead className="relative text-right text-xs font-bold text-black dark:text-white h-10 px-2 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths.total, minWidth: colWidths.total }}>
                    Total
                    <Resizer colKey="total" />
                  </TableHead>
                  <TableHead className="px-0 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths.action, minWidth: colWidths.action }}></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentYearData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 group">
                    <TableCell className="border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8">
                      <Input
                        value={row.head}
                        onChange={(e) => handleCellChange(row.id, 'head', e.target.value)}
                        className="w-full h-full bg-transparent border-none rounded-none px-2 text-xs shadow-none focus-visible:ring-1"
                      />
                    </TableCell>

                    {MONTHS.map(month => (
                      <TableCell key={month} className="border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8">
                        <Input
                          value={row[month] || ""}
                          onChange={(e) => handleCellChange(row.id, month, e.target.value)}
                          onBlur={(e) => {
                            const val = parseFormattedNumber(e.target.value);
                            if (val > 0) handleCellChange(row.id, month, formatIndianNumber(val));
                          }}
                          className="h-full w-full min-w-0 text-right text-xs bg-transparent border-none shadow-none focus-visible:ring-1 px-1 rounded-none"
                        />
                      </TableCell>
                    ))}

                    <TableCell className="text-right font-bold text-xs p-1 truncate align-middle bg-[#ffff99] dark:bg-yellow-600/40 text-black dark:text-white border-r-2 border-slate-300 dark:border-slate-700">
                      {row.total ?? "-"}
                    </TableCell>

                    <TableCell className="p-0 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteRow(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {currentYearData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={15} className="h-24 text-center text-muted-foreground">
                      No entries found. Click "Add Head" to start.
                    </TableCell>
                  </TableRow>
                )}

                {/* Grand Total Row */}
                <TableRow className="bg-[#ffff99] dark:bg-yellow-600/40 font-bold hover:bg-[#ffff99]">
                  <TableCell className="border-r-2 border-slate-300 dark:border-slate-700 p-2 text-black dark:text-white text-xs">
                    Grand Total
                  </TableCell>
                  {MONTHS.map(m => (
                    <TableCell key={m} className="border-r-2 border-slate-300 dark:border-slate-700 text-right p-1 truncate text-black dark:text-white text-xs">
                      {formatIndianNumber(totals[m])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right p-1 text-black dark:text-white truncate text-xs border-r-2 border-slate-300 dark:border-slate-700">
                    {formatIndianNumber(totals.total)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end items-center gap-2 pt-2">
        <Button onClick={() => {
          setNewHeadName("");
          setNewRowYear(selectedYear);
          setIsAddHeadOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Head
        </Button>
        <Button onClick={handleSaveChanges} disabled={isSaving || isLoading}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Add Head Modal */}
      <Modal
        isOpen={isAddHeadOpen}
        onClose={() => setIsAddHeadOpen(false)}
        title="Add Bank Charge Head"
      >
        <form onSubmit={handleAddHead} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Financial Year</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={newRowYear}
              onChange={e => setNewRowYear(e.target.value)}
              required
            >
              {YEAR_OPTIONS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Head Name</label>
            <Input
              list="bank-heads"
              placeholder="e.g. ICICI OD Interest, LAP Interest"
              value={newHeadName}
              onChange={e => setNewHeadName(e.target.value)}
              required
            />
            <datalist id="bank-heads">
              {DEFAULT_HEADS.map(head => (
                <option key={head.name} value={head.name} />
              ))}
            </datalist>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAddHeadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Head
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
