import React, { useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import { Invoice } from "@/data/mockData";
import { formatCurrency, formatDate, calculateAgingDays } from "@/utils/format";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Search, Filter, Download, Columns, FileText } from "lucide-react";

interface InvoiceTableProps {
  data: Invoice[];
  onRowClick: (invoice: Invoice) => void;
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
}

const columnHelper = createColumnHelper<Invoice>();

export function InvoiceTable({ data, onRowClick, globalFilter, setGlobalFilter }: InvoiceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);

  const columns = [
    columnHelper.accessor("invoiceNo", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-semibold hover:text-blue-600 transition-colors" onClick={() => column.toggleSorting()}>
          Invoice # <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: (info) => (
        <button 
          onClick={(e) => { e.stopPropagation(); onRowClick(info.row.original); }} 
          className="text-blue-600 hover:underline font-medium"
        >
          {info.getValue()}
        </button>
      ),
    }),
    columnHelper.accessor("type", {
      header: "Type",
      cell: (info) => {
        const type = info.getValue();
        return (
          <Badge variant={type === "Customer" ? "customer" : "vendor"} className="whitespace-nowrap">
            {type}
          </Badge>
        );
      },
    }),
    columnHelper.accessor("customerName", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-semibold hover:text-blue-600 transition-colors" onClick={() => column.toggleSorting()}>
          Party Name <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor("finalPayable", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-semibold hover:text-blue-600 transition-colors ml-auto" onClick={() => column.toggleSorting()}>
          Amount <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: (info) => <div className="text-right font-medium">{formatCurrency(info.getValue())}</div>,
    }),
    columnHelper.accessor("dueDate", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-semibold hover:text-blue-600 transition-colors" onClick={() => column.toggleSorting()}>
          Due Date <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: (info) => <span className="whitespace-nowrap">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor((row) => calculateAgingDays(row.dueDate, row.paymentStatus), {
      id: "aging",
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-semibold hover:text-blue-600 transition-colors" onClick={() => column.toggleSorting()}>
          Aging (Days) <ArrowUpDown className="w-3 h-3" />
        </button>
      ),
      cell: (info) => {
        const val = info.getValue();
        if (val === null) return <span className="text-gray-400">-</span>;
        return <span className="text-orange-600 font-semibold">{val}</span>;
      },
    }),
    columnHelper.accessor("paymentStatus", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        return (
          <Badge variant={status === "Fully Paid" ? "success" : status === "Outstanding" ? "error" : "warning"}>
            {status}
          </Badge>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <button 
          onClick={(e) => { e.stopPropagation(); onRowClick(info.row.original); }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline whitespace-nowrap flex items-center gap-1"
        >
          <FileText className="w-3 h-3" /> Details
        </button>
      )
    })
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const exportCSV = () => {
    // Only export currently visible/filtered rows
    const rows = table.getRowModel().rows.map(row => row.original);
    if (rows.length === 0) return;
    
    // Extract headers
    const headers = Object.keys(rows[0]).join(",");
    // Extract values
    const csvContent = rows.map(row => {
      return Object.values(row).map(val => {
        if (val === null || val === undefined) return "";
        // Escape quotes
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",");
    }).join("\n");

    const blob = new Blob([headers + "\n" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "invoice_master_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4 items-center bg-gray-50/50">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search all columns..." 
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="w-full sm:max-w-md pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative">
            <button 
              onClick={() => setShowColumnsMenu(!showColumnsMenu)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Columns className="w-4 h-4" />
              View
            </button>
            {showColumnsMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2">
                <div className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase">Toggle Columns</div>
                {table.getAllLeafColumns().map(column => {
                  if (column.id === 'actions') return null;
                  return (
                    <label key={column.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {column.id === 'invoiceNo' ? 'Invoice #' : 
                       column.id === 'customerName' ? 'Party Name' :
                       column.id === 'finalPayable' ? 'Amount' :
                       column.id === 'dueDate' ? 'Due Date' :
                       column.id}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-medium whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr 
                  key={row.id} 
                  onClick={() => onRowClick(row.original)}
                  className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  No invoices found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-gray-100 text-xs text-gray-500 text-center bg-gray-50/50">
        Showing {table.getRowModel().rows.length} of {data.length} invoices
      </div>
    </div>
  );
}
