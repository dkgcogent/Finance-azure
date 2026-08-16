import React, { useState, useMemo, useEffect } from "react"
import { useSalaryQuery, useSaveSalaryMutation } from "../hooks/useSalaryData"
import { useAvailableYearsQuery } from "../hooks/useRevenueData"
import { useGlobalStore } from "@/store/useGlobalStore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Plus, Save, Trash2, Download, Loader2 } from "lucide-react"

type BudgetValue = string | null;
type MonthKey = 'apr' | 'may' | 'jun' | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec' | 'jan' | 'feb' | 'mar';

const MONTHS: MonthKey[] = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'];

const YEAR_OPTIONS = [
  "2023-2024", "2024-2025", "2025-2026", "2026-2027", "2027-2028"
];

const HEAD_OPTIONS = [
  "Manpower",
  "Consultant",
  "Contractor",
  "Interns",
  "Temporary Staff"
];


interface SalaryRow {
  id: string;
  year: string;
  head: string;
  customer: string;
  project: string;
  location: string;
  designation: string;
  nameOfEmployee: string;
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

const getEmptyMonths = (defaultVal: string | null = null) => ({
  apr: defaultVal, may: defaultVal, jun: defaultVal, jul: defaultVal, aug: defaultVal, sep: defaultVal, oct: defaultVal, nov: defaultVal, dec: defaultVal, jan: defaultVal, feb: defaultVal, mar: defaultVal, total: defaultVal ? formatIndianNumber(parseFormattedNumber(defaultVal) * 12) : null
});

const INITIAL_YEAR = "2023-2024";
const INITIAL_DATA: SalaryRow[] = [
  { id: '1', year: INITIAL_YEAR, head: 'Manpower', customer: 'Head Office', project: 'Head Office', location: 'Delhi', designation: 'Director', nameOfEmployee: 'Sushil Kumar Chandra', ...getEmptyMonths('100000') },
  { id: '2', year: INITIAL_YEAR, head: 'Manpower', customer: 'Head Office', project: 'Head Office', location: 'Delhi', designation: 'General Manager', nameOfEmployee: 'Naveen Kumar Rai', ...getEmptyMonths('100000') },
  { id: '3', year: INITIAL_YEAR, head: 'Manpower', customer: 'Head Office', project: 'Back Office', location: 'Roorkee', designation: 'Asst. Manager', nameOfEmployee: 'Usha Rani', ...getEmptyMonths('50000') },
  { id: '4', year: INITIAL_YEAR, head: 'Manpower', customer: 'Head Office', project: 'Head Office', location: 'Delhi', designation: 'Head - Accounts & Finance', nameOfEmployee: 'Suraj Kumar', ...getEmptyMonths('26400') },
  { id: '5', year: INITIAL_YEAR, head: 'Manpower', customer: 'Head Office', project: 'Head Office', location: 'Delhi', designation: 'Asst. Manager - Operations', nameOfEmployee: 'Nitin Kumar', ...getEmptyMonths('35058') },
  { id: '6', year: INITIAL_YEAR, head: 'Manpower', customer: 'Head Office', project: 'Head Office', location: 'Delhi', designation: 'HR Manager', nameOfEmployee: 'TBA', ...getEmptyMonths('25000') },
  { id: '7', year: INITIAL_YEAR, head: 'Manpower', customer: 'Head Office', project: 'Head Office', location: 'Delhi', designation: 'Driver', nameOfEmployee: 'TBA', ...getEmptyMonths('22000') },
  { id: '8', year: INITIAL_YEAR, head: 'Manpower', customer: 'Head Office', project: 'Head Office', location: 'Delhi', designation: 'Office Boy', nameOfEmployee: 'TBA', ...getEmptyMonths() },
  { id: '9', year: INITIAL_YEAR, head: 'Manpower', customer: 'Head Office', project: 'Head Office', location: 'Delhi', designation: 'HR/ Admin / Back Office', nameOfEmployee: 'TBA', ...getEmptyMonths() },
  { id: '10', year: INITIAL_YEAR, head: 'Manpower', customer: 'Head Office', project: 'Head Office', location: 'Delhi', designation: 'Billing', nameOfEmployee: 'TBA', ...getEmptyMonths() },
  { id: '11', year: INITIAL_YEAR, head: 'Manpower', customer: 'Head Office', project: 'Head Office', location: 'Noida', designation: 'Operations Executive', nameOfEmployee: 'TBA', ...getEmptyMonths() },
  { id: '12', year: INITIAL_YEAR, head: 'Manpower', customer: 'Head Office', project: 'Head Office', location: 'Faridabad', designation: 'Operations Executive', nameOfEmployee: 'TBA', ...getEmptyMonths() },
];


export default function Salary() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [data, setData] = useState<SalaryRow[]>([]);
  const { data: serverData, isLoading: isQueryLoading } = useSalaryQuery(selectedYear);
  const { mutateAsync: saveSalary, isPending: isSaving } = useSaveSalaryMutation();
  const isLoading = isQueryLoading;

  const [isAddRowOpen, setIsAddRowOpen] = useState(false);
  const [newRowHead, setNewRowHead] = useState("");
  const [newRowYear, setNewRowYear] = useState(INITIAL_YEAR);

  // Column resizing state
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    srNo: 45,
    head: 80,
    customer: 90,
    project: 65,
    location: 75,
    designation: 155,
    nameOfEmployee: 145,
    apr: 65, may: 65, jun: 65, jul: 65, aug: 65, sep: 65, oct: 65, nov: 65, dec: 65, jan: 65, feb: 65, mar: 65,
    totalFY: 85,
    action: 40
  });

  const startResize = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = colWidths[colKey] || 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
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

  const confirmAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    const newRow: SalaryRow = {
      id: `r-${Date.now()}`,
      year: newRowYear,
      head: newRowHead,
      customer: "",
      project: "",
      location: "",
      designation: "",
      nameOfEmployee: "",
      ...getEmptyMonths()
    };
    setData([...data, newRow]);
    setSelectedYear(newRowYear);
    setIsAddRowOpen(false);
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
      await saveSalary({
        financialYear: selectedYear,
        data: currentYearData.map(row => {
            const rowData: any = {
              head: row.head,
              customer: row.customer,
              project: row.project,
              location: row.location,
              designation: row.designation,
              nameOfEmployee: row.nameOfEmployee,
            };
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
           customer: row.customer || "",
           project: row.project || "",
           location: row.location || "",
           designation: row.designation || "",
           nameOfEmployee: row.nameOfEmployee || "",
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

  const srNoLeft = 0;
  const headLeft = srNoLeft + (colWidths.srNo || 45);
  const customerLeft = headLeft + (colWidths.head || 80);
  const projectLeft = customerLeft + (colWidths.customer || 90);
  const locationLeft = projectLeft + (colWidths.project || 65);
  const designationLeft = locationLeft + (colWidths.location || 75);
  const nameLeft = designationLeft + (colWidths.designation || 155);

  return (
    <div className="flex-1 space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Salary</h2>
          <p className="text-muted-foreground mt-1">
            Manage employee salaries, designations and monthly distributions.
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
                XLSX.writeFile(wb, `Salary_budgeting_${selectedYear}.xlsx`);
              }
            });
          }}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Financial Year</label>
            <select
              className="bg-background border border-input rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
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
              <p className="text-sm font-medium">Loading salary data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <Table id="export-table" className="border-collapse w-max min-w-full" style={{ tableLayout: 'fixed' }}>
                <TableHeader className="bg-slate-200 dark:bg-slate-800">
                  <TableRow className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800">
                    <TableHead className="sticky left-0 z-30 bg-slate-200 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 text-center text-xs font-bold text-black dark:text-white h-10 px-1" style={{ width: colWidths.srNo, minWidth: colWidths.srNo, left: srNoLeft }}>
                      Sr No
                      <Resizer colKey="srNo" />
                    </TableHead>
                    <TableHead className="sticky z-30 bg-slate-200 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2" style={{ width: colWidths.head, minWidth: colWidths.head, left: headLeft }}>
                      Head
                      <Resizer colKey="head" />
                    </TableHead>
                    <TableHead className="sticky z-30 bg-slate-200 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2" style={{ width: colWidths.customer, minWidth: colWidths.customer, left: customerLeft }}>
                      Customer
                      <Resizer colKey="customer" />
                    </TableHead>
                    <TableHead className="sticky z-30 bg-slate-200 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2" style={{ width: colWidths.project, minWidth: colWidths.project, left: projectLeft }}>
                      Project
                      <Resizer colKey="project" />
                    </TableHead>
                    <TableHead className="sticky z-30 bg-slate-200 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2" style={{ width: colWidths.location, minWidth: colWidths.location, left: locationLeft }}>
                      Location
                      <Resizer colKey="location" />
                    </TableHead>
                    <TableHead className="sticky z-30 bg-slate-200 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2" style={{ width: colWidths.designation, minWidth: colWidths.designation, left: designationLeft }}>
                      Designation
                      <Resizer colKey="designation" />
                    </TableHead>
                    <TableHead className="sticky z-30 bg-slate-200 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2" style={{ width: colWidths.nameOfEmployee, minWidth: colWidths.nameOfEmployee, left: nameLeft }}>
                      Name Of Employee
                      <Resizer colKey="nameOfEmployee" />
                    </TableHead>

                    {dynamicHeaders.map((header, idx) => (
                      <TableHead key={idx} className="relative bg-slate-200 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 text-center text-xs font-bold text-black dark:text-white h-10 px-0" style={{ width: colWidths[MONTHS[idx]], minWidth: colWidths[MONTHS[idx]] }}>
                        {header}
                        <Resizer colKey={MONTHS[idx]} />
                      </TableHead>
                    ))}

                    <TableHead className="relative bg-slate-200 dark:bg-slate-800 text-right text-xs font-bold uppercase tracking-wider text-black dark:text-white h-10 px-2" style={{ width: colWidths.totalFY, minWidth: colWidths.totalFY }}>
                      Total FY
                      <Resizer colKey="totalFY" />
                    </TableHead>
                    <TableHead style={{ width: colWidths.action, minWidth: colWidths.action }}></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {currentYearData.map((row, idx) => (
                    <TableRow key={row.id} className="hover:bg-muted/30 group">
                      <TableCell className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 text-center font-medium p-1 text-xs text-muted-foreground" style={{ left: srNoLeft }}>
                        {idx + 1}
                      </TableCell>

                      <TableCell className="sticky z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8" style={{ left: headLeft }}>
                        <Input
                          value={row.head}
                          onChange={(e) => handleCellChange(row.id, 'head', e.target.value)}
                          className="w-full h-full bg-transparent border-none rounded-none px-2 text-xs shadow-none focus-visible:ring-1"
                        />
                      </TableCell>
                      <TableCell className="sticky z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8" style={{ left: customerLeft }}>
                        <Input
                          value={row.customer}
                          onChange={(e) => handleCellChange(row.id, 'customer', e.target.value)}
                          className="w-full h-full bg-transparent border-none rounded-none px-2 text-xs shadow-none focus-visible:ring-1"
                        />
                      </TableCell>
                      <TableCell className="sticky z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8" style={{ left: projectLeft }}>
                        <Input
                          value={row.project}
                          onChange={(e) => handleCellChange(row.id, 'project', e.target.value)}
                          className="w-full h-full bg-transparent border-none rounded-none px-2 text-xs shadow-none focus-visible:ring-1"
                        />
                      </TableCell>
                      <TableCell className="sticky z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8" style={{ left: locationLeft }}>
                        <Input
                          value={row.location}
                          onChange={(e) => handleCellChange(row.id, 'location', e.target.value)}
                          className="w-full h-full bg-transparent border-none rounded-none px-2 text-xs shadow-none focus-visible:ring-1"
                        />
                      </TableCell>
                      <TableCell className="sticky z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8" style={{ left: designationLeft }}>
                        <Input
                          value={row.designation}
                          onChange={(e) => handleCellChange(row.id, 'designation', e.target.value)}
                          className="w-full h-full bg-transparent border-none rounded-none px-2 text-xs shadow-none focus-visible:ring-1"
                        />
                      </TableCell>
                      <TableCell className="sticky z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8" style={{ left: nameLeft }}>
                        <Input
                          value={row.nameOfEmployee}
                          onChange={(e) => handleCellChange(row.id, 'nameOfEmployee', e.target.value)}
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

                      <TableCell className="text-right font-bold text-xs p-1 truncate align-middle bg-[#e5df8f] dark:bg-yellow-600/40 text-black dark:text-white">
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
                      <TableCell colSpan={21} className="h-24 text-center text-muted-foreground">
                        No salary entries found. Click "Add Row" to create one.
                      </TableCell>
                    </TableRow>
                  )}

                  <TableRow className="bg-[#e5df8f] dark:bg-yellow-600/40 font-bold hover:bg-[#e5df8f]">
                    <TableCell colSpan={7} className="sticky left-0 z-20 bg-[#e5df8f] dark:bg-yellow-600/40 border-r-2 border-slate-300 dark:border-slate-700 p-2 text-black dark:text-white text-sm text-right font-bold" style={{ left: 0 }}>
                      Total
                    </TableCell>
                    {MONTHS.map(m => (
                      <TableCell key={m} className="border-r-2 border-slate-300 dark:border-slate-700 text-right p-1 truncate text-black dark:text-white text-xs">
                        {formatIndianNumber(totals[m])}
                      </TableCell>
                    ))}
                    <TableCell className="text-right p-1 text-black dark:text-white truncate text-xs">{formatIndianNumber(totals.total)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end items-center gap-2 pt-2">
        <Button onClick={() => {
          setNewRowHead("");
          setNewRowYear(selectedYear);
          setIsAddRowOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Row
        </Button>
        <Button onClick={handleSaveChanges} disabled={isSaving || isLoading}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Modal
        isOpen={isAddRowOpen}
        onClose={() => setIsAddRowOpen(false)}
        title="Add Salary Row"
      >
        <form onSubmit={confirmAddRow} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Financial Year</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={newRowYear}
              onChange={e => setNewRowYear(e.target.value)}
              required
            >
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Head</label>
            <Input
              list="expense-heads"
              placeholder="e.g. Manpower, Consultant"
              value={newRowHead}
              onChange={e => setNewRowHead(e.target.value)}
              required
            />
            <datalist id="expense-heads">
              {HEAD_OPTIONS.map(opt => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAddRowOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Row
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
