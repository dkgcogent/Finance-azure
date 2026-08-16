import { useState, useMemo, useEffect } from "react"
import { useCorporateQuery, useSaveCorporateMutation } from "../hooks/useCorporateExpenses"
import { useAvailableYearsQuery } from "../hooks/useRevenueData"
import { useGlobalStore } from "@/store/useGlobalStore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Plus, Save, Trash2, CalendarPlus, Download, Loader2 } from "lucide-react"

type BudgetValue = string | null;
type MonthKey = 'apr' | 'may' | 'jun' | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec' | 'jan' | 'feb' | 'mar';

const MONTHS: MonthKey[] = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'];

const DEFAULT_EXPENSE_HEADS = [
  "HO Communication",
  "HO Courier Exp",
  "HO Customer Entertainment",
  "HO Fee Rates & Taxes",
  "HO Fuel",
  "HO Rent",
  "IT Cost - Development, AMC, Server",
  "Marketing",
  "Loss on sale of assets",
  "HO Salary",
  "HO Printing/ Stationery Expenses",
  "CA - Professional Expenses",
  "CS - Professional Expenses",
  "HO Staff Welfare Expenses",
  "HO Staff Travelling",
  "HO Staff Conveyance & Parking",
  "HO Vehicle Maintenance",
  "HO Legal Expenses",
  "HO Finance Consultancy",
  "HO Marketing Expense",
  "HO Compliance Cost (POSH, FASSAI, ISO)",
  "HO Business Chamber Membership Cost",
  "HO Festival Expenses",
  "Lucknow office Rent",
  "Lucknow Office Electricity",
  "Lucknow office Staff Welfare",
  "Lucknow office Stationery",
  "Lucknow/ Ops Staff Salary",
  "Lucknow Office - Customer Entertainment",
  "Noida Office EMI",
  "HO Team Entertainment",
  "HR Consultant",
  "Other Misc"
];

const YEAR_OPTIONS = [
  "2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028",
  "2028-2029", "2029-2030", "2030-2031", "2031-2032", "2032-2033",
  "2033-2034", "2034-2035", "2035-2036", "2036-2037", "2037-2038",
  "2038-2039", "2039-2040", "2040-2041"
];

interface ExpenseRow {
  id: string;
  year: string;
  head: string;
  isYellow: boolean;
  apr: BudgetValue;
  may: BudgetValue;
  jun: BudgetValue;
  jul: BudgetValue;
  aug: BudgetValue;
  sep: BudgetValue;
  oct: BudgetValue;
  nov: BudgetValue;
  dec: BudgetValue;
  jan: BudgetValue;
  feb: BudgetValue;
  mar: BudgetValue;
  total: BudgetValue;
}

const parseFormattedNumber = (val: BudgetValue): number => {
  if (!val || val === "-") return 0;
  return parseFloat(val.replace(/,/g, '').replace(/%/g, '')) || 0;
}

const formatIndianNumber = (num: number): string => {
  if (isNaN(num) || num === 0) return "0";
  return num.toLocaleString('en-IN');
}

const getEmptyMonths = () => ({
  apr: null, may: null, jun: null, jul: null, aug: null, sep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null, total: null
});


export default function CorporateExpenses() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [data, setData] = useState<ExpenseRow[]>([]);
  const { data: serverData, isLoading: isQueryLoading } = useCorporateQuery(selectedYear);
  const { mutateAsync: saveExpenses, isPending: isSaving } = useSaveCorporateMutation();
  const isLoading = isQueryLoading;

  const [isAddHeadOpen, setIsAddHeadOpen] = useState(false);
  const [newHeadName, setNewHeadName] = useState("");
  const [newRowYear, setNewRowYear] = useState("2023-2024");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>({
    head: 220,
    apr: 65, may: 65, jun: 65, jul: 65, aug: 65, sep: 65, oct: 65, nov: 65, dec: 65, jan: 65, feb: 65, mar: 65,
    total: 85
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
          isYellow: row.head === "HO Salary" || row.head === "Lucknow/ Ops Staff Salary",
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

  const { data: serverAvailableYears } = useAvailableYearsQuery();
  const availableYears = serverAvailableYears && serverAvailableYears.length > 0 ? serverAvailableYears : [selectedYear];

  const handleCellChange = (id: string, month: MonthKey, value: string) => {
    const sanitizedValue = value.replace(/[^0-9.,]/g, '');

    setData(prevData => {
      const newData = [...prevData];
      const rowIndex = newData.findIndex(r => r.id === id);
      if (rowIndex === -1) return prevData;

      const row = { ...newData[rowIndex] };
      row[month] = sanitizedValue;

      // Auto calculate row total
      let total = 0;
      let hasData = false;
      MONTHS.forEach(m => {
        if (row[m]) hasData = true;
        total += parseFormattedNumber(row[m]);
      });
      row.total = hasData ? formatIndianNumber(total) : null;

      newData[rowIndex] = row;
      return newData;
    });
  };

  const handleAddHead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeadName) return;

    const newRow: ExpenseRow = {
      id: `r-${Date.now()}`,
      year: newRowYear,
      head: newHeadName,
      isYellow: false,
      ...getEmptyMonths()
    };

    setData(prev => [...prev, newRow]);
    setSelectedYear(newRowYear);
    setIsAddHeadOpen(false);
    setNewHeadName("");
  };

  const confirmDeleteRow = () => {
    if (!rowToDelete) return;
    setData(prev => prev.filter(row => row.id !== rowToDelete));
    setIsDeleteModalOpen(false);
    setRowToDelete(null);
  };

  const handleSaveChanges = async () => {
    try {
      await saveExpenses({
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
      MONTHS.forEach(m => {
        acc[m] += parseFormattedNumber(row[m]);
      });
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
          <h2 className="text-3xl font-bold tracking-tight">Corporate Expenses</h2>
          <p className="text-muted-foreground mt-1">
            Budget breakdown for Head Office Corporate Expenses.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
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
                XLSX.writeFile(wb, `CorporateExpenses_budgeting_${selectedYear}.xlsx`);
              }
            });
          }}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-4 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium">Loading corporate expenses data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto relative w-full no-scrollbar">
              <Table id="export-table" className="w-max min-w-full border-collapse text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-slate-300 dark:border-slate-700">
                    <TableHead className="relative font-bold text-foreground p-1 border-r-2 border-slate-300 dark:border-slate-700 h-8" style={{ width: colWidths.head, minWidth: colWidths.head }}>
                      HEAD
                      <Resizer colKey="head" />
                    </TableHead>
                    {dynamicHeaders.map((header, idx) => (
                      <TableHead key={idx} className="relative font-bold text-foreground text-right p-1 border-r-2 border-slate-300 dark:border-slate-700 h-8 uppercase truncate" style={{ width: colWidths[MONTHS[idx]], minWidth: colWidths[MONTHS[idx]] }}>
                        {header}
                        <Resizer colKey={MONTHS[idx]} />
                      </TableHead>
                    ))}
                    <TableHead className="relative font-bold text-foreground text-right p-1 uppercase" style={{ width: colWidths.total, minWidth: colWidths.total }}>
                      TOTAL
                      <Resizer colKey="total" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentYearData.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30 group">
                      <TableCell className={`border-r-2 border-slate-300 dark:border-slate-700 font-medium p-1 relative h-8 group/cell overflow-hidden ${row.isYellow ? "bg-[#e5df8f] dark:bg-yellow-600/40" : ""}`}>
                        <div className="flex items-center w-full h-full text-sm min-w-0">
                          <div className={`flex-1 truncate ${row.isYellow ? 'font-bold' : ''}`} title={row.head}>{row.head}</div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 ml-1 opacity-0 group-hover/cell:opacity-100 transition-opacity flex-shrink-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setRowToDelete(row.id);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>

                      {MONTHS.map(month => (
                        <TableCell key={month} className={`border-r-2 border-slate-300 dark:border-slate-700 p-0 align-middle ${row.isYellow ? "bg-[#e5df8f] dark:bg-yellow-600/40" : ""}`}>
                          <Input
                            value={row[month] || ""}
                            readOnly={row.head === "HO Salary"}
                            onChange={(e) => handleCellChange(row.id, month, e.target.value)}
                            onBlur={(e) => {
                              const val = parseFormattedNumber(e.target.value);
                              if (val > 0) handleCellChange(row.id, month, formatIndianNumber(val));
                            }}
                            className={`h-full w-full min-w-0 text-right text-sm bg-transparent border-transparent hover:border-input focus:border-ring shadow-none focus-visible:ring-1 px-1 py-1 rounded-none ${row.isYellow ? "font-bold text-black dark:text-white" : ""}`}
                          />
                        </TableCell>
                      ))}

                      <TableCell className={`text-right font-medium p-1 truncate text-sm align-middle ${row.isYellow ? "bg-[#e5df8f] dark:bg-yellow-600/40 text-black dark:text-white font-bold" : ""}`}>
                        {row.total ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}

                  {currentYearData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={14} className="h-24 text-center text-muted-foreground">
                        No corporate expenses found for the selected year. Click "Add Head" to create one.
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Grand Total Row */}
                  <TableRow className="bg-[#e5df8f] dark:bg-yellow-600/40 font-bold hover:bg-[#e5df8f]">
                    <TableCell className="border-r-2 border-slate-300 dark:border-slate-700 p-1 text-black dark:text-white text-sm">Grand Total</TableCell>
                    {MONTHS.map(m => (
                      <TableCell key={m} className="border-r-2 border-slate-300 dark:border-slate-700 text-right p-1 truncate text-black dark:text-white text-sm">
                        {formatIndianNumber(totals[m])}
                      </TableCell>
                    ))}
                    <TableCell className="text-right p-1 text-black dark:text-white truncate text-sm">{formatIndianNumber(totals.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end items-center gap-2 pt-2">
        <Button variant="outline" onClick={() => {
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

      <Modal
        isOpen={isAddHeadOpen}
        onClose={() => setIsAddHeadOpen(false)}
        title="Add Expense Head"
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
              list="expense-heads"
              placeholder="e.g. IT Cost - Server, Courier Exp"
              value={newHeadName}
              onChange={e => setNewHeadName(e.target.value)}
              required
            />
            <datalist id="expense-heads">
              {DEFAULT_EXPENSE_HEADS.map((head, idx) => (
                <option key={idx} value={head} />
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

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this expense head? All data associated with it will be removed. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRow}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

