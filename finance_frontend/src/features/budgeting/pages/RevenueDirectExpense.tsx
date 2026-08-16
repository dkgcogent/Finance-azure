import { useState, useMemo, useEffect } from "react"
import { useRevenueQuery, useSaveRevenueMutation, useAvailableYearsQuery } from "../hooks/useRevenueData"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Plus, Save, Trash2, Download, Loader2 } from "lucide-react"

type BudgetValue = string | null;
type MonthKey = 'apr' | 'may' | 'jun' | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec' | 'jan' | 'feb' | 'mar';

const MONTHS: MonthKey[] = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'];

const CUSTOMER_OPTIONS = ["Flipkart", "Reliance", "Amazon", "Google", "Microsoft", "Apple", "Meta"];
const PROJECT_OPTIONS = ["Large", "Non Large", "B2B", "Jio", "AWS Migration", "Cloud Setup", "Enterprise"];
const LOCATION_OPTIONS = ["UP", "Haryana", "Bangalore", "Mumbai", "Delhi", "Pune", "Hyderabad"];
const YEAR_OPTIONS = [
  "2025-2026", "2026-2027", "2027-2028", "2028-2029", "2029-2030", 
  "2030-2031", "2031-2032", "2032-2033", "2033-2034", "2034-2035", 
  "2035-2036", "2036-2037", "2037-2038", "2038-2039", "2039-2040", 
  "2040-2041"
];

interface BudgetRow {
  id: string;
  groupId: string;
  year: string;
  customer: string;
  project: string;
  location: string;
  head: string;
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
  isYellow: boolean;
}

const parseFormattedNumber = (val: BudgetValue): number => {
  if (!val || val === "-") return 0;
  return parseFloat(val.replace(/,/g, '').replace(/%/g, '')) || 0;
}

const formatIndianNumber = (num: number, isPercentage: boolean = false): string => {
  if (isNaN(num) || num === 0) return isPercentage ? "0%" : "0";
  if (isPercentage) {
    return Number.isInteger(num) ? `${num}%` : `${num.toFixed(2)}%`;
  }
  return num.toLocaleString('en-IN');
}

const getEmptyMonths = () => ({
  apr: null, may: null, jun: null, jul: null, aug: null, sep: null, oct: null, nov: null, dec: null, jan: null, feb: null, mar: null, total: null
});

const initialData: Omit<BudgetRow, 'id'>[] = [];


import { useGlobalStore } from "@/store/useGlobalStore";

export default function RevenueDirectExpense() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [data, setData] = useState<BudgetRow[]>([]);


  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [newGroupCustomer, setNewGroupCustomer] = useState("");
  const [newGroupProject, setNewGroupProject] = useState("");
  const [newGroupLocation, setNewGroupLocation] = useState("");
  const [newGroupYear, setNewGroupYear] = useState("2026-2027");
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  const [colWidths, setColWidths] = useState<Record<string, number>>({
    customer: 100,
    project: 95,
    location: 75,
    head: 135,
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

  const { data: serverAvailableYears } = useAvailableYearsQuery();
  const availableYears = serverAvailableYears && serverAvailableYears.length > 0 ? serverAvailableYears : [selectedYear];

  const { data: serverData, isLoading: isQueryLoading } = useRevenueQuery(selectedYear);
  const { mutateAsync: saveRevenue, isPending: isSaving } = useSaveRevenueMutation();
  const isLoading = isQueryLoading;

  useEffect(() => {
    if (!serverData) return;
    if (serverData.length > 0) {
      const newRows: BudgetRow[] = [];
      serverData.forEach((group: any, idx: number) => {
        const groupId = `fetched-g-${idx}-${Date.now()}`;
        const baseFields = {
          customer: group.customer,
          project: group.project,
          location: group.location,
          year: group.year || selectedYear,
        };

        const revRow: BudgetRow = { id: `${groupId}-1`, groupId, ...baseFields, head: "Revenue", isYellow: false, ...getEmptyMonths() };
        const pctRow: BudgetRow = { id: `${groupId}-2`, groupId, ...baseFields, head: "Direct Expense % Age", isYellow: false, ...getEmptyMonths() };
        const expRow: BudgetRow = { id: `${groupId}-3`, groupId, ...baseFields, head: "Direct Expenses", isYellow: true, ...getEmptyMonths() };
        const gmRow: BudgetRow = { id: `${groupId}-4`, groupId, ...baseFields, head: "Gross Margin", isYellow: true, ...getEmptyMonths() };
        const gmPctRow: BudgetRow = { id: `${groupId}-5`, groupId, ...baseFields, head: "Gross Margin %Age", isYellow: true, ...getEmptyMonths() };

        let revTotal = 0;
        let pctSum = 0;
        let pctCount = 0;
        let expTotal = 0;
        let gmTotal = 0;
        let hasExpData = false;
        let hasRevData = false;

        MONTHS.forEach(m => {
          const revVal = group.revenueMonths?.[m] || 0;
          const pctVal = group.directExpensePctMonths?.[m] || 0;
          
          if (group.revenueMonths?.[m] != null || group.directExpensePctMonths?.[m] != null) {
             hasExpData = true;
          }

          if (group.revenueMonths?.[m] != null) {
            hasRevData = true;
            revTotal += revVal;
            revRow[m] = formatIndianNumber(revVal);
          }
          if (group.directExpensePctMonths?.[m] != null) {
            pctSum += pctVal;
            pctCount++;
            pctRow[m] = pctVal.toString();
          }

          const expVal = (revVal * pctVal) / 100;
          expTotal += expVal;
          expRow[m] = hasExpData ? formatIndianNumber(expVal) : null;

          const gmVal = revVal - expVal;
          gmTotal += gmVal;
          gmRow[m] = hasExpData ? formatIndianNumber(gmVal) : null;

          gmPctRow[m] = (revVal > 0) ? ((gmVal / revVal) * 100).toFixed(2) : null;
        });

        revRow.total = hasRevData ? formatIndianNumber(revTotal) : null;
        pctRow.total = pctCount > 0 ? (pctSum / pctCount).toFixed(2) : null;
        expRow.total = hasExpData ? formatIndianNumber(expTotal) : null;
        gmRow.total = hasExpData ? formatIndianNumber(gmTotal) : null;
        gmPctRow.total = (revTotal > 0) ? ((gmTotal / revTotal) * 100).toFixed(2) : null;

        newRows.push(revRow, pctRow, expRow, gmRow, gmPctRow);
      });
      setData(newRows);
    } else {
      setData([]);
    }
  }, [serverData, selectedYear]);

  const handleCellChange = (id: string, month: MonthKey, value: string) => {
    // Restrict input to numbers, commas, and dots
    const sanitizedValue = value.replace(/[^0-9.,]/g, '');

    setData(prevData => {
      const newData = [...prevData];
      const rowIndex = newData.findIndex(r => r.id === id);
      if (rowIndex === -1) return prevData;

      const row = { ...newData[rowIndex] };
      row[month] = sanitizedValue;

      // Auto calculate row total if it's Revenue
      if (row.head === "Revenue") {
        let total = 0;
        MONTHS.forEach(m => {
          total += parseFormattedNumber(row[m]);
        });
        row.total = formatIndianNumber(total);
      }

      if (row.head === "Direct Expense % Age") {
        let sum = 0;
        let count = 0;
        MONTHS.forEach(m => {
          if (row[m]) {
            sum += parseFormattedNumber(row[m]);
            count++;
          }
        });
        row.total = count > 0 ? formatIndianNumber(sum / count, true) : "0%";
      }

      newData[rowIndex] = row;

      // Group recalculation logic
      const groupId = row.groupId;
      const groupIndices = newData.map((r, i) => r.groupId === groupId ? i : -1).filter(i => i !== -1);
      
      const revIdx = groupIndices.find(i => newData[i].head === "Revenue");
      const expPctIdx = groupIndices.find(i => newData[i].head === "Direct Expense % Age");
      const expIdx = groupIndices.find(i => newData[i].head === "Direct Expenses");
      const gmIdx = groupIndices.find(i => newData[i].head === "Gross Margin");
      const gmPctIdx = groupIndices.find(i => newData[i].head === "Gross Margin %Age");

      if (revIdx !== undefined && expPctIdx !== undefined && expIdx !== undefined && gmIdx !== undefined && gmPctIdx !== undefined) {
        const revRow = newData[revIdx];
        const expPctRow = newData[expPctIdx];
        const expRow = { ...newData[expIdx] };
        const gmRow = { ...newData[gmIdx] };
        const gmPctRow = { ...newData[gmPctIdx] };

        let expTotal = 0;
        let gmTotal = 0;
        let hasExpData = false;

        MONTHS.forEach(m => {
          const revVal = parseFormattedNumber(revRow[m]);
          const expPctVal = parseFormattedNumber(expPctRow[m]);

          if (revRow[m] || expPctRow[m]) {
            hasExpData = true;
            const dirExp = (revVal * expPctVal) / 100;
            expTotal += dirExp;
            expRow[m] = dirExp > 0 || revVal > 0 ? formatIndianNumber(dirExp) : "0";

            const gm = revVal - dirExp;
            gmTotal += gm;
            gmRow[m] = formatIndianNumber(gm);

            const gmPct = revVal > 0 ? (gm / revVal) * 100 : 0;
            gmPctRow[m] = formatIndianNumber(gmPct, true);
          } else {
            expRow[m] = null;
            gmRow[m] = null;
            gmPctRow[m] = null;
          }
        });

        expRow.total = hasExpData ? formatIndianNumber(expTotal) : null;
        gmRow.total = hasExpData ? formatIndianNumber(gmTotal) : null;
        const revTotal = parseFormattedNumber(revRow.total);
        gmPctRow.total = (hasExpData && revTotal > 0) ? formatIndianNumber((gmTotal / revTotal) * 100, true) : null;

        newData[expIdx] = expRow;
        newData[gmIdx] = gmRow;
        newData[gmPctIdx] = gmPctRow;
      }

      return newData;
    });
  };

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupCustomer || !newGroupProject || !newGroupLocation) return;

    const baseFields = {
      customer: newGroupCustomer,
      project: newGroupProject,
      location: newGroupLocation,
    };

    const newGroupId = `g-${Date.now()}`;
    const newRows: BudgetRow[] = [
      { id: `${newGroupId}-1`, groupId: newGroupId, year: newGroupYear, ...baseFields, head: "Revenue", isYellow: false, ...getEmptyMonths() },
      { id: `${newGroupId}-2`, groupId: newGroupId, year: newGroupYear, ...baseFields, head: "Direct Expense % Age", isYellow: false, ...getEmptyMonths() },
      { id: `${newGroupId}-3`, groupId: newGroupId, year: newGroupYear, ...baseFields, head: "Direct Expenses", isYellow: true, ...getEmptyMonths() },
      { id: `${newGroupId}-4`, groupId: newGroupId, year: newGroupYear, ...baseFields, head: "Gross Margin", isYellow: true, ...getEmptyMonths() },
      { id: `${newGroupId}-5`, groupId: newGroupId, year: newGroupYear, ...baseFields, head: "Gross Margin %Age", isYellow: true, ...getEmptyMonths() },
    ];

    setData(prev => [...prev, ...newRows]);
    setSelectedYear(newGroupYear);
    setIsAddGroupOpen(false);
    setNewGroupCustomer("");
    setNewGroupProject("");
    setNewGroupLocation("");
  };

  const confirmDeleteGroup = () => {
    if (!groupToDelete) return;
    setData(prev => prev.filter(row => row.groupId !== groupToDelete));
    setIsDeleteModalOpen(false);
    setGroupToDelete(null);
  };

  const handleSaveChanges = async () => {
    try {
      const groupsMap = new Map<string, any>();

      currentYearData.forEach(row => {
        if (!groupsMap.has(row.groupId)) {
          groupsMap.set(row.groupId, {
            customer: row.customer,
            project: row.project,
            location: row.location,
            revenueMonths: {},
            directExpensePctMonths: {}
          });
        }
        
        const group = groupsMap.get(row.groupId);
        if (row.head === "Revenue") {
          MONTHS.forEach(m => {
             group.revenueMonths[m] = parseFormattedNumber(row[m]);
          });
        } else if (row.head === "Direct Expense % Age") {
          MONTHS.forEach(m => {
             group.directExpensePctMonths[m] = parseFormattedNumber(row[m]);
          });
        }
      });

      await saveRevenue({
        financialYear: selectedYear,
        groups: Array.from(groupsMap.values())
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
    const init = () => ({ apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0, jan: 0, feb: 0, mar: 0, total: 0 });
    const acc = {
      "Revenue": init(),
      "Direct Expenses": init(),
      "Gross Margin": init(),
    };
    const expPctSum = init();
    const expPctCount = init();

    currentYearData.forEach(row => {
      if (row.head === "Revenue" || row.head === "Direct Expenses" || row.head === "Gross Margin") {
        MONTHS.forEach(m => {
          acc[row.head as keyof typeof acc][m] += parseFormattedNumber(row[m]);
        });
        acc[row.head as keyof typeof acc].total += parseFormattedNumber(row.total);
      }
      
      if (row.head === "Direct Expense % Age") {
        MONTHS.forEach(m => {
          if (row[m]) {
            expPctSum[m] += parseFormattedNumber(row[m]);
            expPctCount[m]++;
          }
        });
        if (row.total) {
          expPctSum.total += parseFormattedNumber(row.total);
          expPctCount.total++;
        }
      }
    });

    const gmPct = init();
    const finalExpPct = init();

    MONTHS.forEach(m => {
      gmPct[m] = acc.Revenue[m] > 0 ? (acc["Gross Margin"][m] / acc.Revenue[m]) * 100 : 0;
      finalExpPct[m] = expPctCount[m] > 0 ? (expPctSum[m] / expPctCount[m]) : 0;
    });
    gmPct.total = acc.Revenue.total > 0 ? (acc["Gross Margin"].total / acc.Revenue.total) * 100 : 0;
    finalExpPct.total = expPctCount.total > 0 ? (expPctSum.total / expPctCount.total) : 0;

    return {
      "Revenue": acc["Revenue"],
      "Direct Expense % Age": finalExpPct,
      "Direct Expenses": acc["Direct Expenses"],
      "Gross Margin": acc["Gross Margin"],
      "Gross Margin %Age": gmPct,
    }
  }, [currentYearData]);

  const getMonthHeaders = (yearRange: string) => {
    const [startYearStr, endYearStr] = yearRange.split('-');
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
          <h2 className="text-3xl font-bold tracking-tight">Revenue & Direct Expenses</h2>
          <p className="text-muted-foreground mt-1">
            Budget breakdown for Revenue and Direct Expenses by project and location.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => {
            import('xlsx').then(XLSX => {
              const table = document.getElementById('budget-table');
              if (table) {
                const clone = table.cloneNode(true) as HTMLTableElement;
                const inputs = clone.querySelectorAll('input');
                inputs.forEach(input => {
                  const val = input.value;
                  const parent = input.parentElement;
                  if (parent) parent.textContent = val || '-';
                });
                const wb = XLSX.utils.table_to_book(clone, { raw: true });
                XLSX.writeFile(wb, `RevenueDirectExpense_${selectedYear}.xlsx`);
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
          <div className="overflow-x-auto relative w-full no-scrollbar">
            <Table id="budget-table" className="border-collapse w-max min-w-full text-xs relative" style={{ tableLayout: 'fixed' }}>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="relative border-r border-border/50 font-bold text-foreground p-1" style={{ width: colWidths.customer, minWidth: colWidths.customer }}>
                    Customer
                    <Resizer colKey="customer" />
                  </TableHead>
                  <TableHead className="relative border-r border-border/50 font-bold text-foreground p-1" style={{ width: colWidths.project, minWidth: colWidths.project }}>
                    Project
                    <Resizer colKey="project" />
                  </TableHead>
                  <TableHead className="relative border-r border-border/50 font-bold text-foreground p-1" style={{ width: colWidths.location, minWidth: colWidths.location }}>
                    Location
                    <Resizer colKey="location" />
                  </TableHead>
                  <TableHead className="relative border-r border-border/50 font-bold text-foreground p-1" style={{ width: colWidths.head, minWidth: colWidths.head }}>
                    Head
                    <Resizer colKey="head" />
                  </TableHead>
                  {dynamicHeaders.map((header, idx) => (
                    <TableHead key={idx} className="relative border-r border-border/50 font-bold text-foreground text-right p-1 truncate" style={{ width: colWidths[MONTHS[idx]], minWidth: colWidths[MONTHS[idx]] }}>
                      {header}
                      <Resizer colKey={MONTHS[idx]} />
                    </TableHead>
                  ))}
                  <TableHead className="relative font-bold text-foreground text-right p-1" style={{ width: colWidths.total, minWidth: colWidths.total }}>
                    Total
                    <Resizer colKey="total" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentYearData.map((row, i) => (
                  <TableRow
                    key={row.id}
                    className={`hover:bg-muted/10 ${i % 5 === 4 ? "border-b-4 border-border" : ""}`}
                  >
                    <TableCell className="border-r border-border/50 p-1 group overflow-hidden">
                      <div className="flex items-center justify-between gap-0.5 min-w-0">
                        <span className="truncate flex-1">{row.customer}</span>
                        {row.head === "Revenue" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setGroupToDelete(row.groupId);
                              setIsDeleteModalOpen(true);
                            }}
                            title="Delete Group"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="border-r border-border/50 p-1 truncate" title={row.project}>{row.project}</TableCell>
                    <TableCell className="border-r border-border/50 p-1 truncate" title={row.location}>{row.location}</TableCell>
                    <TableCell className="border-r border-border/50 font-medium p-1 truncate" title={row.head}>{row.head}</TableCell>

                    {MONTHS.map(month => (
                      <TableCell key={month} className={`border-r border-border/50 p-0 ${row.isYellow ? "bg-[#fcf8e3] dark:bg-yellow-900/20" : ""}`}>
                        {row.isYellow ? (
                          <div className="w-full text-right text-foreground font-bold p-1 select-none">{row[month] ?? "-"}</div>
                        ) : (
                          <Input
                            value={row[month] || ""}
                            onChange={(e) => handleCellChange(row.id, month, e.target.value)}
                            onBlur={(e) => {
                              // Optional: auto format on blur
                              const val = parseFormattedNumber(e.target.value);
                              if (val > 0) handleCellChange(row.id, month, row.head.includes('%') ? val.toString() : formatIndianNumber(val));
                            }}
                            className="h-6 w-full min-w-0 text-right text-xs bg-transparent border-transparent hover:border-input focus:border-ring shadow-none focus-visible:ring-1 px-1 py-0 rounded-none"
                          />
                        )}
                      </TableCell>
                    ))}

                    <TableCell className={`text-right font-semibold p-1 truncate ${row.isYellow ? "bg-[#fcf8e3] dark:bg-yellow-900/20 text-muted-foreground/60" : ""}`}>
                      {row.total ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}

                {currentYearData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={15} className="h-24 text-center text-muted-foreground">
                      No groups exist for the selected year. Click "Add Group" to create one.
                    </TableCell>
                  </TableRow>
                )}

                {/* Grand Total Rows */}
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell className="border-r border-border/50 p-1">Total</TableCell>
                  <TableCell className="border-r border-border/50 p-1">Total</TableCell>
                  <TableCell className="border-r border-border/50 p-1">Total</TableCell>
                  <TableCell className="border-r border-border/50 p-1">Revenue</TableCell>
                  {MONTHS.map(m => (
                    <TableCell key={m} className="border-r border-border/50 text-right p-1 truncate">
                      {formatIndianNumber(totals.Revenue[m])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right p-1 text-primary truncate">{formatIndianNumber(totals.Revenue.total)}</TableCell>
                </TableRow>

                {/* Additional fixed total rows that are yellow/backend calculated can be rendered here */}
                {[
                  "Direct Expense % Age",
                  "Direct Expenses",
                  "Gross Margin",
                  "Gross Margin %Age"
                ].map(head => {
                  const isYellow = head !== "Direct Expense % Age";
                  const isPct = head.includes("%");
                  const totalData = totals[head as keyof typeof totals];
                  return (
                    <TableRow key={head} className={`font-bold ${isYellow ? "bg-[#fcf8e3] dark:bg-yellow-900/20" : "bg-muted/10"}`}>
                      <TableCell className="border-r border-border/50 text-muted-foreground p-1">Total</TableCell>
                      <TableCell className="border-r border-border/50 text-muted-foreground p-1">Total</TableCell>
                      <TableCell className="border-r border-border/50 text-muted-foreground p-1">Total</TableCell>
                      <TableCell className="border-r border-border/50 p-1 truncate">{head}</TableCell>
                      {MONTHS.map(m => (
                        <TableCell key={m} className="border-r border-border/50 text-right p-1 truncate">
                          {formatIndianNumber(totalData[m], isPct)}
                        </TableCell>
                      ))}
                      <TableCell className={`text-right p-1 truncate ${isPct ? '' : 'text-primary'}`}>
                        {formatIndianNumber(totalData.total, isPct)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end items-center gap-2 pt-2">
        <Button onClick={handleSaveChanges} disabled={isSaving || isLoading}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
        <Button onClick={() => {
          setNewGroupYear(selectedYear);
          setIsAddGroupOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Group
        </Button>
      </div>

      <Modal
        isOpen={isAddGroupOpen}
        onClose={() => setIsAddGroupOpen(false)}
        title="Add New Budget Group"
        description="Enter the details for the new group you want to allocate budget for."
      >
        <form onSubmit={handleAddGroup} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Financial Year</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newGroupYear}
                onChange={e => setNewGroupYear(e.target.value)}
                required
              >
                {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newGroupCustomer}
                onChange={e => setNewGroupCustomer(e.target.value)}
                required
              >
                <option value="" disabled>Select Customer</option>
                {CUSTOMER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newGroupProject}
                onChange={e => setNewGroupProject(e.target.value)}
                required
              >
                <option value="" disabled>Select Project</option>
                {PROJECT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newGroupLocation}
                onChange={e => setNewGroupLocation(e.target.value)}
                required
              >
                <option value="" disabled>Select Location</option>
                {LOCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsAddGroupOpen(false)}>Cancel</Button>
            <Button type="submit">Add Group</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        description="Are you sure you want to delete this group? This action cannot be undone."
      >
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={confirmDeleteGroup}>Delete Group</Button>
        </div>
      </Modal>
    </div>
  )
}
