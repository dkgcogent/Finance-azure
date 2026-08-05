import React, { useState, useMemo } from "react";
import { Invoice } from "@/data/mockData";
import { useGlobalStore } from "@/store/useGlobalStore";
import { useInvoices } from "./hooks/useInvoices";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { InvoiceTable } from "./components/InvoiceTable";
import { InvoiceDetailsDrawer } from "./components/InvoiceDetailsDrawer";
import { ArrowLeft, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type TabFilter = "All" | "Customer" | "Vendor";

export default function InvoiceMaster() {
  const { financialYear, setFinancialYear } = useGlobalStore();
  const [activeTab, setActiveTab] = useState<TabFilter>("All");
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: invoices = [], isLoading } = useInvoices(financialYear);

  // Filter data based on active tab
  const filteredData = useMemo(() => {
    if (activeTab === "All") return invoices;
    return invoices.filter(inv => inv.type === activeTab);
  }, [activeTab, invoices]);

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans text-gray-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors mt-1 md:mt-0">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Global Invoice Master</h1>
            <p className="text-sm text-gray-500 mt-1">Unified tracker for both Customer and Vendor invoices, agings, and reconciliations.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={financialYear} onValueChange={(val) => setFinancialYear(val || "")}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Financial Year" />
            </SelectTrigger>
            <SelectContent>
              {["2025-2026", "2026-2027", "2027-2028"].map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        {/* Master Tracking Ledger */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Master Tracking Ledger</h2>
              <p className="text-sm text-gray-500 mt-1">Consolidated view of all payables and receivables.</p>
            </div>
            
            {/* Tab Toggle */}
            <div className="inline-flex bg-gray-100 p-1 rounded-lg">
              {(["All", "Customer", "Vendor"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === tab 
                      ? "bg-white text-blue-600 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab === "Customer" ? "Receivables (AR)" : tab === "Vendor" ? "Payables (AP)" : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Data Table Component */}
          <div className="h-[600px] flex flex-col relative">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}
            <InvoiceTable 
              data={filteredData} 
              onRowClick={setSelectedInvoice}
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
            />
          </div>
        </section>
      </main>

      {/* Details Drawer */}
      <InvoiceDetailsDrawer 
        invoice={selectedInvoice} 
        isOpen={!!selectedInvoice} 
        onClose={() => setSelectedInvoice(null)} 
      />
    </div>
  );
}
