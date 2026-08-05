import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useGlobalStore } from "@/store/useGlobalStore";
import { useActualVsBudget } from "../hooks/useActualVsBudget";
import { MONTHS, ROWS } from "../api/actualVsBudgetService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"



export default function ActualVSBudget() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [selectedMonth, setSelectedMonth] = useState("All Months");
  const [selectedCustomer, setSelectedCustomer] = useState("All Customers");
  const [selectedProject, setSelectedProject] = useState("All Projects");
  const [selectedSubProject, setSelectedSubProject] = useState("All Sub Projects");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");

  const { data, isLoading: loading } = useActualVsBudget(selectedYear);
  const budgetData = data?.budgetData;
  const actualData = data?.actualData;

  const formatValue = (val: number, rowName: string) => {
    if (isNaN(val)) return "-";
    if (rowName.includes('%')) {
      return val.toFixed(1) + "%";
    }
    return val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  if (loading || !budgetData || !actualData) {
    return (
      <div className="flex-1 space-y-6 pb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Actual VS Budget</h2>
            <p className="text-muted-foreground mt-1">
              Compare actual performance against budgeted expectations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Actual VS Budget</h2>
          <p className="text-muted-foreground mt-1">
            Compare actual performance against budgeted expectations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => {
            import('xlsx').then(XLSX => {
              const table = document.getElementById('actual-vs-budget-table');
              if (table) {
                const clone = table.cloneNode(true) as HTMLTableElement;
                const wb = XLSX.utils.table_to_book(clone, { raw: true });
                XLSX.writeFile(wb, `Actual_VS_Budget_${selectedYear}.xlsx`);
              }
            });
          }}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Financial Year</label>
              <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {["2025-2026", "2026-2027", "2027-2028"].map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 hidden">
              <label className="text-xs font-medium text-muted-foreground">Month</label>
              <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Months">All Months</SelectItem>
                  {MONTHS.map(m => (
                    <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 hidden">
              <label className="text-xs font-medium text-muted-foreground">Customer</label>
              <Select value={selectedCustomer} onValueChange={(val) => setSelectedCustomer(val || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Customers">All Customers</SelectItem>
                  <SelectItem value="Flipkart">Flipkart</SelectItem>
                  <SelectItem value="Reliance">Reliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 hidden">
              <label className="text-xs font-medium text-muted-foreground">Project</label>
              <Select value={selectedProject} onValueChange={(val) => setSelectedProject(val || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Projects">All Projects</SelectItem>
                  <SelectItem value="Large">Large</SelectItem>
                  <SelectItem value="Non-Large">Non-Large</SelectItem>
                  <SelectItem value="Myntra">Myntra</SelectItem>
                  <SelectItem value="B2B">B2B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 hidden">
              <label className="text-xs font-medium text-muted-foreground">Sub Project</label>
              <Select value={selectedSubProject} onValueChange={(val) => setSelectedSubProject(val || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Sub Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Sub Projects">All Sub Projects</SelectItem>
                  <SelectItem value="FLM">FLM</SelectItem>
                  <SelectItem value="LLM">LLM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 hidden">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <Select value={selectedLocation} onValueChange={(val) => setSelectedLocation(val || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Locations">All Locations</SelectItem>
                  <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                  <SelectItem value="Delhi">Delhi</SelectItem>
                  <SelectItem value="Lucknow">Lucknow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end hidden">
            <Button onClick={() => {
              // Filters are applied automatically by React Query
            }}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-md border custom-scrollbar">
            <table id="actual-vs-budget-table" className="w-full text-xs text-left border-collapse min-w-[2400px]">
              <thead className="bg-slate-100 dark:bg-slate-800/50 sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="p-2 border-b border-r border-slate-300 dark:border-slate-700 font-bold sticky left-0 bg-slate-200 dark:bg-slate-900 z-30 min-w-[220px]" rowSpan={2}>
                    Head
                  </th>
                  {MONTHS.map(m => (
                    <th key={m.key} className="p-2 border-b border-r border-slate-300 dark:border-slate-700 text-center font-bold text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-800" colSpan={4}>
                      {m.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {MONTHS.map(m => (
                    <React.Fragment key={`${m.key}-sub`}>
                      <th className="p-2 border-b border-r border-slate-300 dark:border-slate-700 font-semibold text-center min-w-[110px] bg-slate-100 dark:bg-slate-800/80">Budget</th>
                      <th className="p-2 border-b border-r border-slate-300 dark:border-slate-700 font-semibold text-center min-w-[110px] bg-slate-100 dark:bg-slate-800/80">Actual</th>
                      <th className="p-2 border-b border-r border-slate-300 dark:border-slate-700 font-semibold text-center min-w-[110px] bg-slate-100 dark:bg-slate-800/80">Variance</th>
                      <th className="p-2 border-b border-r border-slate-300 dark:border-slate-700 font-semibold text-center min-w-[90px] bg-slate-100 dark:bg-slate-800/80">Variance %</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-950">
                {ROWS.map((rowName) => {
                  return (
                    <tr key={rowName} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 group">
                      <td className="p-2 border-b border-r border-slate-200 dark:border-slate-800 font-semibold sticky left-0 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900 z-10 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {rowName}
                      </td>
                      {MONTHS.map((m, i) => {
                        const budget = budgetData[rowName] ? budgetData[rowName][i] : 0;
                        const actual = actualData[rowName] ? actualData[rowName][i] : 0;

                        // Variance calculation: Actual - Budget
                        const variance = actual - budget;

                        let varPct = 0;
                        if (budget !== 0) {
                          varPct = (variance / Math.abs(budget)) * 100;
                        }

                        // Determine highlighting exactly as per user's screenshot
                        // The user's screenshot has yellow background for the Variance and Variance % columns.
                        // We apply a yellow text highlight to variance cells if there is any substantial variance.
                        const isSignificant = Math.abs(variance) > 0.01;
                        const varStyle = isSignificant ? "text-amber-600 font-bold" : "";
                        const varStyleDark = isSignificant ? "dark:text-amber-400 font-bold" : "";

                        return (
                          <React.Fragment key={`${rowName}-${m.key}`}>
                            <td className="p-2 border-b border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap">
                              {formatValue(budget, rowName)}
                            </td>
                            <td className="p-2 border-b border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap font-medium text-primary">
                              {formatValue(actual, rowName)}
                            </td>
                            <td className={`p-2 border-b border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap ${varStyle} ${varStyleDark}`}>
                              {formatValue(variance, rowName)}
                            </td>
                            <td className={`p-2 border-b border-r border-slate-200 dark:border-slate-800 text-right whitespace-nowrap ${varStyle} ${varStyleDark}`}>
                              {formatValue(varPct, "%")}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
      `}</style>
    </div>
  )
}
