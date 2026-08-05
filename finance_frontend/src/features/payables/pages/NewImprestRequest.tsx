import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { ArrowLeft, CheckCircle2, Plus, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api"

type ImprestRow = {
  id: string;
  date: string;
  head: string;
  description: string;
  amount: number | '';
  passAmount: number | '';
  crAmount: number | '';
  isSubmitted?: boolean;
  status?: string;
}

const HEAD_OPTIONS = [
  "Adhoc vehicle Advance",
  "Adhoc vehicle Balance",
  "Commuting/Travel",
  "Tea/Coffee",
  "Electricity"
];

const getToday = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

const newDraftRow = (): ImprestRow => ({
  id: `draft-${Math.random().toString(36).slice(2)}`,
  date: getToday(),
  head: '',
  description: '',
  amount: '',
  passAmount: '',
  crAmount: '',
  isSubmitted: false
});

export default function NewImprestRequest() {
  const [savedRows, setSavedRows] = useState<ImprestRow[]>([]);
  const [draftRows, setDraftRows] = useState<ImprestRow[]>([newDraftRow()]);
  const [submittingRowId, setSubmittingRowId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load previously saved imprests on mount
  useEffect(() => {
    const fetchImprests = async () => {
      try {
        const res = await apiClient.get('/imprests');
        const data: any[] = res.data;
        const mapped: ImprestRow[] = data.map((item) => ({
          id: String(item.id),
          date: item.date?.split('T')[0] ?? getToday(),
          head: item.head,
          description: item.description,
          amount: Number(item.amount),
          passAmount: Number(item.pass_amount),
          crAmount: Number(item.cr_amount),
          isSubmitted: true,
          status: item.status,
        }));
        setSavedRows(mapped);
      } catch (err) {
        console.error("Failed to load imprests", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchImprests();
  }, []);

  const confirmSubmitRow = async () => {
    if (!submittingRowId) return;
    const rowToSubmit = draftRows.find(r => r.id === submittingRowId);
    if (!rowToSubmit) return;

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/imprests', {
        date: rowToSubmit.date,
        head: rowToSubmit.head,
        description: rowToSubmit.description,
        amount: rowToSubmit.amount || 0,
        passAmount: rowToSubmit.passAmount || 0,
        crAmount: rowToSubmit.crAmount || 0
      });

      // Move from draft → saved (with real DB id)
      const submittedRow: ImprestRow = {
        ...rowToSubmit,
        id: String(res.data.id),
        isSubmitted: true,
        status: res.data.status || 'Pending for approval',
      };
      setSavedRows(prev => [submittedRow, ...prev]);
      setDraftRows(prev => prev.filter(r => r.id !== submittingRowId));
      setSubmittingRowId(null);
    } catch (error) {
      console.error("Failed to submit imprest", error);
      alert("Failed to submit imprest request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addRow = () => {
    setDraftRows(prev => [...prev, newDraftRow()]);
  };

  const updateDraftRow = async (id: string, field: keyof ImprestRow, value: any) => {
    if (field === 'head' && (value === "Adhoc vehicle Advance" || value === "Adhoc vehicle Balance")) {
      const type = value === "Adhoc vehicle Advance" ? "advance" : "balance";
      try {
        const res = await apiClient.get(`/imprests/tms-data?type=${type}`);
        const tmsAmount = res.data.total || 0;
        
        setDraftRows(prev => prev.map(r => {
          if (r.id !== id) return r;
          return {
            ...r,
            head: value,
            amount: tmsAmount,
            passAmount: tmsAmount,
            crAmount: tmsAmount
          };
        }));
      } catch (error) {
        console.error("Failed to fetch TMS data", error);
        // Fallback or just set to 0 if it fails
        setDraftRows(prev => prev.map(r => {
          if (r.id !== id) return r;
          return { ...r, head: value, amount: 0, passAmount: 0, crAmount: 0 };
        }));
      }
    } else {
      setDraftRows(prev => prev.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === 'head') {
          updated.amount = '';
          updated.passAmount = '';
          updated.crAmount = '';
        }
        return updated;
      }));
    }
  };

  const allRows = [...savedRows, ...draftRows];
  const totalAmount = allRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalPass   = allRows.reduce((sum, r) => sum + (Number(r.passAmount) || 0), 0);
  const totalCr     = allRows.reduce((sum, r) => sum + (Number(r.crAmount) || 0), 0);

  return (
    <div className="flex-1 space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/imprest">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Daily Imprest Requisition</h2>
            <p className="text-muted-foreground mt-1">
              Master / Daily imprest requisition form
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading your imprest records...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-[#d9d9d9] border-b border-gray-300">
                    <th className="p-2 border-r border-gray-300 font-semibold text-left w-36">Date</th>
                    <th className="p-2 border-r border-gray-300 font-semibold text-left w-64">Head</th>
                    <th className="p-2 border-r border-gray-300 font-semibold text-left min-w-[200px]">Description</th>
                    <th className="p-2 border-r border-gray-300 font-semibold text-right w-32">Amount</th>
                    <th className="p-2 border-r border-gray-300 font-semibold text-right w-32">Pass Amount</th>
                    <th className="p-2 border-r border-gray-300 font-semibold text-right w-32">Cr Amount</th>
                    <th className="p-2 font-semibold text-center w-36">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Saved / submitted rows — read-only */}
                  {savedRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-200 bg-gray-50/50">
                      <td className="border-r border-gray-300 p-2.5 text-gray-600">{row.date}</td>
                      <td className="border-r border-gray-300 p-2.5 text-gray-700 font-medium">{row.head}</td>
                      <td className="border-r border-gray-300 p-2.5 text-gray-600">{row.description}</td>
                      <td className="border-r border-gray-300 p-2.5 text-right font-medium text-gray-900">{Number(row.amount).toLocaleString()}</td>
                      <td className="border-r border-gray-300 p-2.5 text-right text-gray-500">{Number(row.passAmount).toLocaleString()}</td>
                      <td className="border-r border-gray-300 p-2.5 text-right text-gray-500">{Number(row.crAmount).toLocaleString()}</td>
                      <td className="p-2 text-center">
                        <span className={`inline-flex whitespace-nowrap items-center rounded-full px-2 py-1 text-xs font-medium border ${
                          row.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          row.status === 'Level-2 Approved' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          row.status === 'Final Approved' ? 'bg-green-100 text-green-800 border-green-200' :
                          row.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                          'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {row.status || 'Pending for approval'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Editable draft rows */}
                  {draftRows.map((row) => {
                    const isAdhoc = row.head === "Adhoc vehicle Advance" || row.head === "Adhoc vehicle Balance";
                    const bgClass = isAdhoc ? "bg-yellow-200" : "bg-transparent";
                    const inputBgClass = isAdhoc ? "focus:bg-yellow-300" : "focus:bg-blue-50";

                    return (
                      <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        <td className="border-r border-gray-300 p-0">
                          <input
                            type="date"
                            className="w-full p-2.5 bg-transparent outline-none focus:bg-blue-50 text-gray-700"
                            value={row.date}
                            min={getToday()}
                            max={getToday()}
                            onChange={(e) => updateDraftRow(row.id, 'date', e.target.value)}
                          />
                        </td>
                        <td className="border-r border-gray-300 p-0">
                          <input
                            list="head-options"
                            className="w-full p-2.5 bg-transparent outline-none focus:bg-blue-50 text-gray-700"
                            placeholder="Select or type head..."
                            value={row.head}
                            onChange={(e) => updateDraftRow(row.id, 'head', e.target.value)}
                          />
                        </td>
                        <td className="border-r border-gray-300 p-0">
                          <input
                            type="text"
                            className="w-full p-2.5 bg-transparent outline-none focus:bg-blue-50 text-gray-700"
                            placeholder="Enter description..."
                            value={row.description}
                            onChange={(e) => updateDraftRow(row.id, 'description', e.target.value)}
                          />
                        </td>
                        <td className={`border-r border-gray-300 p-0 ${bgClass}`}>
                          <input
                            type="number"
                            className={`w-full p-2.5 bg-transparent outline-none text-right ${inputBgClass} font-medium text-gray-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isAdhoc ? 'cursor-not-allowed text-gray-600' : ''}`}
                            value={row.amount}
                            placeholder="0"
                            onChange={(e) => updateDraftRow(row.id, 'amount', e.target.value)}
                            readOnly={isAdhoc}
                          />
                        </td>
                        <td className={`border-r border-gray-300 p-0 ${bgClass}`}>
                          <input
                            type="number"
                            className="w-full p-2.5 bg-gray-50 outline-none text-right font-medium text-gray-500 cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={row.passAmount}
                            placeholder="0"
                            readOnly
                          />
                        </td>
                        <td className={`border-r border-gray-300 p-0 ${bgClass}`}>
                          <input
                            type="number"
                            className="w-full p-2.5 bg-gray-50 outline-none text-right font-medium text-gray-500 cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={row.crAmount}
                            placeholder="0"
                            readOnly
                          />
                        </td>
                        <td className="p-2 text-center align-middle">
                          <Button
                            size="sm"
                            className="bg-blue-600 text-white hover:bg-blue-700 h-8 px-4 text-xs font-semibold rounded-full shadow-sm flex items-center justify-center mx-auto"
                            onClick={() => setSubmittingRowId(row.id)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Submit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                    <td colSpan={3} className="p-3 border-r border-gray-300 text-right text-gray-700">
                      Total
                    </td>
                    <td className="p-3 border-r border-gray-300 text-right bg-yellow-200 text-gray-900">
                      {totalAmount.toLocaleString()}
                    </td>
                    <td className="p-3 border-r border-gray-300 text-right bg-yellow-200 text-gray-900">
                      {totalPass.toLocaleString()}
                    </td>
                    <td className="p-3 border-r border-gray-300 text-right bg-yellow-200 text-gray-900">
                      {totalCr.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              <datalist id="head-options">
                {HEAD_OPTIONS.map(opt => <option key={opt} value={opt} />)}
              </datalist>
            </div>
            <div className="p-3 border-t bg-white">
              <Button variant="outline" size="sm" onClick={addRow} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={!!submittingRowId}
        onClose={() => setSubmittingRowId(null)}
        title="Confirm Requisition"
        description="Are you sure you want to proceed with this Requisition Request?"
      >
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setSubmittingRowId(null)}>Cancel</Button>
          <Button
            onClick={confirmSubmitRow}
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              : 'Proceed'
            }
          </Button>
        </div>
      </Modal>
    </div>
  )
}
