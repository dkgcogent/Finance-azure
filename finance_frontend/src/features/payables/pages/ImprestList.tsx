import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download, User, Wallet, Briefcase, Calculator } from "lucide-react"
import { apiClient } from "@/lib/api"

type SummaryRow = {
  id: string;
  date: string;
  head: string;
  transfer: number | '';
  expense: number | '';
  passAmount: number | '';
}

const getToday = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function SummaryTable({ title, icon: Icon, data = [] }: { title: string, icon: React.ElementType, data?: SummaryRow[] }) {
  const [rows, setRows] = useState<SummaryRow[]>([])

  useEffect(() => {
    if (data.length > 0) {
      setRows(data);
    } else {
      setRows([{ id: 'empty-1', date: getToday(), head: '', transfer: '', expense: '', passAmount: '' }])
    }
  }, [data]);

  const updateRow = (id: string, field: keyof SummaryRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  // Calculate opening and balance sequentially from oldest to newest
  let runningBalance = 0;
  // Reverse to process chronologically (oldest first)
  const chronologicalRows = [...rows].reverse();
  
  const computedChronological = chronologicalRows.map((row) => {
    const opening = runningBalance;
    const transferNum = Number(row.transfer) || 0;
    const passAmountNum = Number(row.passAmount) || 0;
    const balance = opening + transferNum - passAmountNum;
    runningBalance = balance;
    return { ...row, opening, balance };
  });

  // Reverse back to display newest first
  const computedRows = computedChronological.reverse();

  return (
    <Card className="mb-8 shadow-sm hover:shadow-md transition-shadow duration-200 border-zinc-200/60">
      <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4 pt-5 px-6 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-md">
            <Icon className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl text-zinc-800">{title}</CardTitle>
        </div>
        <Button variant="outline" size="sm" className="h-8 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 transition-colors">
          <Download className="mr-2 h-3.5 w-3.5" />
          Export
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200">
                <th className="py-3 px-4 font-semibold text-left text-xs uppercase tracking-wider text-zinc-500 w-40">Date</th>
                <th className="py-3 px-4 font-semibold text-left text-xs uppercase tracking-wider text-zinc-500">Head</th>
                <th className="py-3 px-4 font-semibold text-right text-xs uppercase tracking-wider text-zinc-500 w-36">Opening</th>
                <th className="py-3 px-4 font-semibold text-right text-xs uppercase tracking-wider text-zinc-500 w-36">Transfer</th>
                <th className="py-3 px-4 font-semibold text-right text-xs uppercase tracking-wider text-zinc-500 w-36">Expense</th>
                <th className="py-3 px-4 font-semibold text-right text-xs uppercase tracking-wider text-zinc-500 w-36">Pass Amount</th>
                <th className="py-3 px-4 font-semibold text-right text-xs uppercase tracking-wider text-zinc-500 w-36">Balance</th>
              </tr>
            </thead>
            <tbody>
              {computedRows.map((row, idx) => (
                <tr key={row.id} className={`border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors ${idx === computedRows.length - 1 ? 'border-none' : ''}`}>
                  <td className="p-1">
                    <input 
                      type="date"
                      className="w-full p-2.5 bg-transparent outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white rounded text-zinc-700 font-medium"
                      value={row.date}
                      min={getToday()}
                      max={getToday()}
                      onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                    />
                  </td>
                  <td className="p-1">
                    <input 
                      type="text"
                      className="w-full p-2.5 bg-transparent outline-none text-zinc-400 cursor-not-allowed placeholder:text-zinc-300"
                      value={row.head}
                      placeholder="Enter head..."
                      readOnly
                    />
                  </td>
                  <td className="p-3 text-right font-medium text-zinc-500">
                    {row.opening.toLocaleString()}
                  </td>
                  <td className="p-1">
                    <input 
                      type="number"
                      className="w-full p-2.5 bg-transparent outline-none text-right font-medium text-zinc-400 cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-zinc-300"
                      value={row.transfer}
                      placeholder="0"
                      readOnly
                    />
                  </td>
                  <td className="p-1">
                    <input 
                      type="number"
                      className="w-full p-2.5 bg-transparent outline-none text-right font-medium text-zinc-400 cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-zinc-300"
                      value={row.expense}
                      placeholder="0"
                      readOnly
                    />
                  </td>
                  <td className="p-1">
                    <input 
                      type="number"
                      className="w-full p-2.5 bg-transparent outline-none text-right font-medium text-zinc-400 cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-zinc-300"
                      value={row.passAmount}
                      placeholder="0"
                      readOnly
                    />
                  </td>
                  <td className="p-3 text-right font-bold text-zinc-800">
                    {row.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ImprestList() {
  const [allData, setAllData] = useState<any[]>([]);

  useEffect(() => {
    const fetchImprests = async () => {
      try {
        const res = await apiClient.get('/imprests');
        setAllData(res.data);
      } catch (err) {
        console.error("Failed to fetch imprest data", err);
      }
    };
    fetchImprests();
  }, []);

  // Map API data to SummaryRow format
  const mappedData = allData.map(item => ({
    id: String(item.id),
    date: item.date?.split('T')[0] ?? getToday(),
    head: item.head,
    transfer: Number(item.amount) || '',
    expense: '', // Assuming expense isn't stored in basic imprest API directly yet, or is calculated elsewhere
    passAmount: Number(item.pass_amount) || ''
  }));

  // Filter into the 3 buckets
  const adhocAdvanceData = mappedData.filter(d => d.head.toLowerCase().includes("adhoc") && d.head.toLowerCase().includes("advance"));
  const adhocBalanceData = mappedData.filter(d => d.head.toLowerCase().includes("adhoc") && d.head.toLowerCase().includes("balance"));
  
  const generalData = mappedData.filter(d => {
    const isAdhoc = d.head.toLowerCase().includes("adhoc");
    return !isAdhoc;
  });

  return (
    <div className="flex-1 space-y-8 pb-12 max-w-7xl mx-auto px-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-zinc-100">
        <div className="flex items-center gap-4">
          <Link to="/imprest">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full hover:bg-zinc-100">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Summary Dashboard</h2>
            <div className="flex items-center text-sm text-zinc-500 mt-1 gap-2">
              <User className="w-4 h-4" />
              <span>Employee: <strong className="text-zinc-700">John Doe (EMP-123)</strong></span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all rounded-full px-6">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <SummaryTable title="General Imprest" icon={Wallet} data={generalData} />
        <SummaryTable title="Adhoc Advance" icon={Briefcase} data={adhocAdvanceData} />
        <SummaryTable title="Adhoc Balance" icon={Calculator} data={adhocBalanceData} />
      </div>
    </div>
  )
}
