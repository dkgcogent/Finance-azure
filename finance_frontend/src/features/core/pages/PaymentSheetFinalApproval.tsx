import React, { useMemo, useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable, SortableHeader } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Download, 
  X,
  CheckCircle2,
  Ban,
  ArrowLeft
} from "lucide-react"
import { apiClient } from "@/lib/api"

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

type ApprovalRow = {
  id: string
  date: string
  employeeName: string
  employeeCode: string
  employeeLocation: string
  generalImprest: number
  adhocAdvance: number
  adhocBalance: number
  total: number
  status: string
  rawRecords: ImprestRecord[]
}

type SelectedSheet = {
  row: ApprovalRow
  sheetType: "General Imprest" | "Adhoc Advance" | "Adhoc Balance"
  records: ImprestRecord[]
}

export default function PaymentSheetFinalApproval() {
  const [allRecords, setAllRecords] = useState<ImprestRecord[]>([])
  const [selectedSheet, setSelectedSheet] = useState<SelectedSheet | null>(null)
  const [actionPopup, setActionPopup] = useState<{type: 'approve' | 'reject', recordIds: string[]} | null>(null)
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set())

  const fetchImprests = async () => {
    try {
      const res = await apiClient.get('/imprests?status=Level-2%20Approved')
      setAllRecords(res.data)
    } catch (error) {
      console.error('Failed to fetch imprests:', error)
    }
  }

  useEffect(() => {
    fetchImprests()
  }, [])

  const groupedData = useMemo(() => {
    const map = new Map<string, ApprovalRow>();
    
    allRecords.filter(record => record.status === 'Level-2 Approved').forEach(record => {
      const isAdhoc = record.head.toLowerCase().includes("adhoc");
      const isAdvance = record.head.toLowerCase().includes("advance");
      const isBalance = record.head.toLowerCase().includes("balance");

      const amt = Number(record.pass_amount) || Number(record.amount) || 0;
      
      let bucket = "General Imprest";
      if (isAdhoc && isAdvance) bucket = "Adhoc Advance";
      if (isAdhoc && isBalance) bucket = "Adhoc Balance";

      if (!map.has(String(record.user_id))) {
        map.set(String(record.user_id), {
          id: String(record.user_id),
          date: record.date.split('T')[0],
          employeeName: `Employee ${record.user_id}`,
          employeeCode: `EMP${record.user_id}`,
          employeeLocation: "HQ",
          generalImprest: 0,
          adhocAdvance: 0,
          adhocBalance: 0,
          total: 0,
          status: "Level-2 Approved",
          rawRecords: []
        });
      }
      
      const row = map.get(String(record.user_id))!;
      row.rawRecords.push(record);
      
      if (bucket === "General Imprest") row.generalImprest += amt;
      if (bucket === "Adhoc Advance") row.adhocAdvance += amt;
      if (bucket === "Adhoc Balance") row.adhocBalance += amt;
      
      row.total += amt;
    });

    return Array.from(map.values());
  }, [allRecords])

  const openSheet = (row: ApprovalRow, sheetType: SelectedSheet["sheetType"]) => {
    const relevantRecords = row.rawRecords.filter(r => {
      const isAdhoc = r.head.toLowerCase().includes("adhoc");
      const isAdvance = r.head.toLowerCase().includes("advance");
      const isBalance = r.head.toLowerCase().includes("balance");
      
      if (sheetType === "General Imprest") return !isAdhoc;
      if (sheetType === "Adhoc Advance") return isAdhoc && isAdvance;
      if (sheetType === "Adhoc Balance") return isAdhoc && isBalance;
      return false;
    });

    if (relevantRecords.length > 0) {
      setSelectedSheet({ row, sheetType, records: relevantRecords })
      setSelectedRecordIds(new Set())
    }
  }

  const columns = useMemo<ColumnDef<ApprovalRow>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => <SortableHeader column={column} title="Date" />,
      },
      {
        accessorKey: "employeeName",
        header: ({ column }) => <SortableHeader column={column} title="Employee name" />,
      },
      {
        accessorKey: "employeeCode",
        header: ({ column }) => <SortableHeader column={column} title="Employee Code" />,
      },
      {
        accessorKey: "employeeLocation",
        header: ({ column }) => <SortableHeader column={column} title="Employee locati" />,
      },
      {
        accessorKey: "generalImprest",
        header: ({ column }) => <SortableHeader column={column} title="General Imprest" />,
        cell: ({ row }) => {
          const val = row.getValue("generalImprest") as number
          return (
            <div 
              className={`text-right p-2 border border-zinc-200 cursor-pointer ${val > 0 ? 'bg-yellow-300 hover:bg-yellow-400 font-bold' : ''}`}
              onClick={() => openSheet(row.original, "General Imprest")}
            >
              {val > 0 ? val : ""}
            </div>
          )
        },
      },
      {
        accessorKey: "adhocAdvance",
        header: ({ column }) => <SortableHeader column={column} title="Adhoc advance" />,
        cell: ({ row }) => {
          const val = row.getValue("adhocAdvance") as number
          return (
            <div 
              className={`text-right p-2 border border-zinc-200 cursor-pointer ${val > 0 ? 'bg-yellow-300 hover:bg-yellow-400 font-bold' : ''}`}
              onClick={() => openSheet(row.original, "Adhoc Advance")}
            >
              {val > 0 ? val : ""}
            </div>
          )
        },
      },
      {
        accessorKey: "adhocBalance",
        header: ({ column }) => <SortableHeader column={column} title="Adhoc balance" />,
        cell: ({ row }) => {
          const val = row.getValue("adhocBalance") as number
          return (
            <div 
              className={`text-right p-2 border border-zinc-200 cursor-pointer ${val > 0 ? 'bg-yellow-300 hover:bg-yellow-400 font-bold' : ''}`}
              onClick={() => openSheet(row.original, "Adhoc Balance")}
            >
              {val > 0 ? val : ""}
            </div>
          )
        },
      },
      {
        accessorKey: "total",
        header: ({ column }) => <SortableHeader column={column} title="Total" />,
        cell: ({ row }) => {
          const val = row.getValue("total") as number
          return (
            <div className={`text-right p-2 border border-zinc-200 ${val > 0 ? 'bg-yellow-300 font-bold' : ''}`}>
              {val > 0 ? val : ""}
            </div>
          )
        },
      },
    ],
    []
  )

  const handleAction = async (type: 'approve' | 'reject') => {
    if (!actionPopup) return;
    const { recordIds } = actionPopup;
    if (recordIds.length === 0) return;

    try {
      const newStatus = type === 'approve' ? 'Final Approved' : 'Rejected';
      
      // Update all selected records concurrently
      await Promise.all(recordIds.map(async (recordId) => {
        const record = selectedSheet?.records.find(r => r.id == recordId);
        if (record) {
          const passAmount = Number(record.pass_amount) || Number(record.amount);
          await apiClient.put(`/imprests/${recordId}/status`, {
            status: newStatus,
            passAmount: passAmount
          });
        }
      }));

      // Refresh list
      await fetchImprests();
      
      setSelectedSheet(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          records: prev.records.map(r => recordIds.includes(r.id.toString()) ? { ...r, status: newStatus } : r)
        }
      });
      setSelectedRecordIds(new Set());
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setActionPopup(null);
    }
  };

  const toggleSelectAll = () => {
    if (!selectedSheet) return;
    const pendingRecords = selectedSheet.records.filter(r => r.status === 'Level-2 Approved');
    
    if (selectedRecordIds.size === pendingRecords.length && pendingRecords.length > 0) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(pendingRecords.map(r => r.id.toString())));
    }
  };

  const toggleRecordSelect = (id: string) => {
    const newSet = new Set(selectedRecordIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRecordIds(newSet);
  };

  return (
    <div className="flex-1 pb-8">
      {!selectedSheet ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/approvals">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Final Approvals</h2>
                <p className="text-muted-foreground mt-1">
                  Final executive sign-off on payment sheets by CEO.
                </p>
              </div>
            </div>
            {/* <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
            </div> */}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Final Approval Queue</CardTitle>
              <CardDescription>Payment sheets pending final executive sign-off.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={groupedData} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 border border-zinc-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setSelectedSheet(null)} className="rounded-full shrink-0 hover:bg-zinc-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-zinc-900">{selectedSheet.sheetType} Review</h3>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  Detailed view for <strong>{selectedSheet.row.employeeName}</strong> ({selectedSheet.row.employeeCode}).
                </p>
              </div>
            </div>
            
            {selectedRecordIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 mr-2">{selectedRecordIds.size} selected</span>
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setActionPopup({type: 'approve', recordIds: Array.from(selectedRecordIds)})}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Selected
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setActionPopup({type: 'reject', recordIds: Array.from(selectedRecordIds)})}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Reject Selected
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 items-start">
            {/* Detailed Table */}
            <div className="w-full bg-white shadow-sm border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-zinc-50/80 flex justify-between items-center">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Document Preview</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-200">
                      <th className="py-3 px-4 w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedSheet.records.filter(r => r.status === 'Level-2 Approved').length > 0 && selectedRecordIds.size === selectedSheet.records.filter(r => r.status === 'Level-2 Approved').length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="py-3 px-4 font-semibold text-xs text-zinc-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 font-semibold text-xs text-zinc-500 uppercase tracking-wider">Head</th>
                      <th className="py-3 px-4 font-semibold text-right text-xs text-zinc-500 uppercase tracking-wider">Opening</th>
                      <th className="py-3 px-4 font-semibold text-right text-xs text-zinc-500 uppercase tracking-wider">Transfer</th>
                      <th className="py-3 px-4 font-semibold text-right text-xs text-zinc-500 uppercase tracking-wider">Expense</th>
                      <th className="py-3 px-4 font-semibold text-right text-xs text-zinc-500 uppercase tracking-wider">Pass Amount</th>
                      <th className="py-3 px-4 font-semibold text-right text-xs text-zinc-500 uppercase tracking-wider">Balance</th>
                      <th className="py-3 px-4 font-semibold text-center text-xs text-zinc-500 uppercase tracking-wider w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSheet.records.map(record => (
                      <tr key={record.id} className={`border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${selectedRecordIds.has(record.id.toString()) ? 'bg-blue-50/50' : ''}`}>
                        <td className="py-4 px-4 text-center">
                          {record.status === 'Level-2 Approved' && (
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedRecordIds.has(record.id.toString())}
                              onChange={() => toggleRecordSelect(record.id.toString())}
                            />
                          )}
                        </td>
                        <td className="py-4 px-4 text-zinc-700">{record.date.split('T')[0]}</td>
                        <td className="py-4 px-4 text-zinc-700">{record.head}</td>
                        <td className="py-4 px-4 text-right text-zinc-500">0</td>
                        <td className="py-4 px-4 text-right text-zinc-500">{record.amount}</td>
                        <td className="py-4 px-4 text-right text-zinc-500">0</td>
                        <td className="py-4 px-4 text-right font-medium text-emerald-600">
                          {Number(record.pass_amount) || 0}
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-zinc-800">{Number(record.amount) - (Number(record.pass_amount) || 0)}</td>
                        <td className="py-4 px-4 text-center">
                          {record.status === 'Final Approved' ? (
                            <Badge variant="success">Final Approved</Badge>
                          ) : record.status === 'Rejected' ? (
                            <Badge variant="destructive">Rejected</Badge>
                          ) : (
                            <div className="flex justify-center items-center gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => setActionPopup({type: 'approve', recordIds: [record.id.toString()]})}>
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => setActionPopup({type: 'reject', recordIds: [record.id.toString()]})}>
                                <Ban className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Popup Modal */}
      {actionPopup && (
        <div className="fixed inset-0 bg-zinc-950/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-lg w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Confirm Action</h3>
              <Button variant="ghost" size="icon" onClick={() => setActionPopup(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-zinc-600 mb-6">
              Are you sure you want to {actionPopup.type === 'approve' ? 'approve' : 'reject'} {actionPopup.recordIds.length} request(s)?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setActionPopup(null)}>Cancel</Button>
              <Button 
                className={actionPopup.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                onClick={() => handleAction(actionPopup.type)}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
