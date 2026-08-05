import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download } from 'lucide-react'
import { Button } from "@/components/ui/button"

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const YEAR_OPTIONS = Array.from({ length: 18 }, (_, i) => `${2023 + i}-${2024 + i}`);
const INITIAL_YEAR = "2026-2027";

interface SummaryRow {
  name: string;
  isBold?: boolean;
  isPercent?: boolean;
  isDivider?: boolean;
}

const ROWS: SummaryRow[] = [
  { name: 'Revenue', isBold: true },
  { name: 'Direct Expenses' },
  { name: 'Gross Margin' },
  { name: 'Gross Margin %Age', isBold: true, isPercent: true },
  { name: 'divider1', isDivider: true },
  { name: 'Total Corporate Expenses' },
  { name: 'Corporate Expenses % Age', isBold: true, isPercent: true },
  { name: 'divider2', isDivider: true },
  { name: 'Total Bank Interest / Expenses' },
  { name: 'Total Bank Interest / Expenses % Age', isBold: true, isPercent: true },
  { name: 'divider3', isDivider: true },
  { name: 'EBITA' },
  { name: 'EBITA %Age', isBold: true, isPercent: true },
  { name: 'Deprication' },
  { name: 'Income Tax' },
  { name: 'NP' },
  { name: 'NP % Age', isBold: true, isPercent: true },
];

import { useActualSummary } from "../hooks/useActualSummary"
import { useAvailableYearsQuery } from "../hooks/useActualRevenue"
import { useGlobalStore } from "@/store/useGlobalStore";

export default function Summary() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const { data: serverAvailableYears } = useAvailableYearsQuery();
  const availableYears = serverAvailableYears && serverAvailableYears.length > 0 ? serverAvailableYears : [selectedYear];
  const { data, isLoading, isError } = useActualSummary(selectedYear);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 pb-8">
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground animate-pulse">Loading summary data...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex-1 space-y-6 pb-8">
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-red-500">Failed to load summary data.</p>
        </div>
      </div>
    );
  }

  const { chartData, pieData, headers } = data;

  return (
    <div className="flex-1 space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Summary</h2>
          <p className="text-muted-foreground mt-1">
            Consolidated financial summary and profitability.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => {
            import('xlsx').then(XLSX => {
              const table = document.getElementById('summary-table');
              if (table) {
                const wb = XLSX.utils.table_to_book(table, { raw: true });
                XLSX.writeFile(wb, `Actual_Summary_${selectedYear}.xlsx`);
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

      <Card className="overflow-hidden border border-slate-300 dark:border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar">
            <Table id="summary-table" className="border-collapse w-full">
              <TableHeader>
                <TableRow className="bg-gray-300/60 dark:bg-gray-800 border-b-2 border-slate-400 dark:border-slate-600">
                  <TableHead className="font-bold text-black dark:text-white border-r-2 border-slate-400 dark:border-slate-600 px-2 py-1.5 text-[11px] sm:text-xs w-36 sm:w-40 max-w-[160px]">
                    Head
                  </TableHead>
                  {headers.map(h => (
                    <TableHead key={h} className="text-center font-bold text-black dark:text-white border-r-2 border-slate-400 dark:border-slate-600 px-1 py-1.5 text-[10px] sm:text-[11px] leading-tight">
                      {h}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-bold text-black dark:text-white px-2 py-1.5 text-[11px] sm:text-xs bg-gray-400/50 dark:bg-gray-700">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROWS.map((row, idx) => {
                  if (row.isDivider) {
                    return (
                      <TableRow key={`div-${idx}`} className="h-6 bg-white dark:bg-transparent">
                        <TableCell colSpan={14} className="p-0 border-r-2 border-slate-300 dark:border-slate-700"></TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={row.name} className="hover:bg-muted/50">
                      <TableCell className={`border-r-2 border-slate-300 dark:border-slate-700 px-2 py-1.5 text-[11px] sm:text-xs leading-tight whitespace-normal break-words w-36 sm:w-40 max-w-[160px] ${row.isBold ? 'font-bold text-black dark:text-white' : 'text-slate-800 dark:text-slate-200'} bg-white dark:bg-slate-950`}>
                        {row.name}
                      </TableCell>

                      {/* 12 Months Columns */}
                      {headers.map((h, i) => {
                        const val = data.resultRows?.[row.name]?.[i] ?? 0;
                        return (
                          <TableCell key={h} className={`border-r-2 border-slate-300 dark:border-slate-700 px-1 py-1.5 text-right text-[10px] sm:text-[11px] font-medium text-black dark:text-white bg-[#ffffcc] dark:bg-yellow-900/20`}>
                            {val === 0 ? '-' : (row.isPercent ? `${val.toFixed(2)}%` : val.toLocaleString('en-IN', { maximumFractionDigits: 0 }))}
                          </TableCell>
                        );
                      })}

                      {/* Total Column */}
                      <TableCell className={`px-2 py-1.5 text-right text-[11px] sm:text-xs font-bold text-black dark:text-white bg-[#e6e699] dark:bg-yellow-800/30`}>
                        {(() => {
                          if (!data.resultRows?.[row.name]) return '-';
                          if (row.isPercent) {
                            const revTotal = data.resultRows['Revenue']?.reduce((a, b) => a + b, 0) || 0;
                            const relatedRowName = row.name.replace(' %Age', '').replace(' % Age', '');
                            let targetTotal = 0;
                            if (relatedRowName === 'Gross Margin') targetTotal = data.resultRows['Gross Margin']?.reduce((a,b)=>a+b,0) || 0;
                            else if (relatedRowName === 'Corporate Expenses') targetTotal = data.resultRows['Total Corporate Expenses']?.reduce((a,b)=>a+b,0) || 0;
                            else if (relatedRowName === 'Total Bank Interest / Expenses') targetTotal = data.resultRows['Total Bank Interest / Expenses']?.reduce((a,b)=>a+b,0) || 0;
                            else if (relatedRowName === 'EBITA') targetTotal = data.resultRows['EBITA']?.reduce((a,b)=>a+b,0) || 0;
                            else if (relatedRowName === 'NP') targetTotal = data.resultRows['NP']?.reduce((a,b)=>a+b,0) || 0;
                            
                            const pct = revTotal > 0 ? (targetTotal / revTotal) * 100 : 0;
                            return pct === 0 ? '-' : `${pct.toFixed(2)}%`;
                          } else {
                            const total = data.resultRows[row.name].reduce((a, b) => a + b, 0);
                            return total === 0 ? '-' : total.toLocaleString('en-IN', { maximumFractionDigits: 0 });
                          }
                        })()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-300 dark:border-slate-700">
        <CardHeader>
          <CardTitle>Monthly Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
            <div className="h-[350px] w-full lg:col-span-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} tickMargin={10} />
                  <YAxis tickFormatter={(val) => `${val}%`} tickLine={false} axisLine={false} fontSize={12} tickMargin={10} />
                  <Tooltip formatter={(value: any) => [`${value?.toFixed(2)}%`]} cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="Gross Margin %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Corporate Exp %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="EBITA %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="NP %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="h-[350px] w-full flex flex-col items-center">
              <h3 className="text-center text-large font-bold text-slate-700 dark:text-slate-300 mb-2">Annual Averages</h3>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value?.toFixed(2)}%`]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
