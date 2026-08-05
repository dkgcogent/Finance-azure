import { useState, useMemo, useEffect } from "react"
import { useDepreciationQuery, useSaveDepreciationMutation } from "../hooks/useDepreciation"
import { useAvailableYearsQuery } from "../hooks/useRevenueData"
import { useGlobalStore } from "@/store/useGlobalStore"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Plus, Save, Trash2, Download } from "lucide-react"
import { BudgetNav } from "../components/BudgetNav"

const YEARS = ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'];
const YEAR_OPTIONS = Array.from({ length: 18 }, (_, i) => `${2023 + i}-${2024 + i}`);

const CATEGORY_OPTIONS = [
  "IT",
  "Furniture & Fittings",
  "Motor Vehicle",
  "Lightning",
  "Office Equipment",
  "Mobile",
  "Plant & Machinery",
  "Others"
];

interface DepreciationRow {
  id: string;
  year: string;
  category: string;
  assetName: string;
  depPercentage: string;
  purchaseDate: string;
  purchaseValue: string;
  openingDate: string;
  wdvOpeningValue: string;
  [key: string]: string | null; // For dynamic years
}

const parseFormattedNumber = (val: string | null): number => {
  if (!val || val === "-") return 0;
  return parseFloat(val.replace(/,/g, '').replace(/%/g, '')) || 0;
}

const formatIndianNumber = (num: number): string => {
  if (isNaN(num) || num === 0) return "0";
  return num.toLocaleString('en-IN');
}

const getEmptyYears = () => {
  const yearsObj: Record<string, string | null> = {};
  YEARS.forEach(y => { yearsObj[y] = null; });
  return yearsObj;
}

const INITIAL_YEAR = "2026-2027";

export default function Depreciation() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [data, setData] = useState<DepreciationRow[]>([]);
  const { data: serverData, isLoading: isQueryLoading } = useDepreciationQuery(selectedYear);
  const { mutateAsync: saveDepreciation, isPending: isSaving } = useSaveDepreciationMutation();

  const { data: serverAvailableYears } = useAvailableYearsQuery();
  const availableYears = serverAvailableYears && serverAvailableYears.length > 0 ? serverAvailableYears : [selectedYear];

  useEffect(() => {
    if (!serverData) return;
    if (serverData.length > 0) {
      const formattedData = serverData.map((row: any, idx: number) => {
        const mappedRow: any = {
          id: `fetched-${idx}-${Date.now()}`,
          year: row.year || selectedYear,
          category: row.category || "",
          assetName: row.assetName || "",
          depPercentage: row.depPercentage ? row.depPercentage.toString() : "",
          purchaseDate: row.purchaseDate || "",
          purchaseValue: row.purchaseValue ? formatIndianNumber(row.purchaseValue) : "",
          openingDate: row.openingDate || "",
          wdvOpeningValue: row.wdvOpeningValue ? formatIndianNumber(row.wdvOpeningValue) : "",
        };
        YEARS.forEach(y => {
          if (row[y] != null && parseFloat(row[y]) > 0) {
            mappedRow[y] = formatIndianNumber(parseFloat(row[y]));
          } else {
            mappedRow[y] = null;
          }
        });
        return mappedRow;
      });
      setData(formattedData);
    } else {
      setData([]);
    }
  }, [serverData, selectedYear]);

  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [newCategory, setNewCategory] = useState(CATEGORY_OPTIONS[0]);
  const [newAssetName, setNewAssetName] = useState("");
  const [newRowYear, setNewRowYear] = useState(INITIAL_YEAR);

  // Column resizing state
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    category: 120, assetName: 120, depPercentage: 80, purchaseDate: 120, purchaseValue: 120, openingDate: 120, wdvOpeningValue: 130,
    ...YEARS.reduce((acc, y) => ({ ...acc, [y]: 80 }), {}),
    total: 100, action: 40
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

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAssetName.trim() === "") return;

    if (data.some(r => r.year === newRowYear && r.category === newCategory && r.assetName === newAssetName)) {
      alert("This asset already exists in the selected category for this year.");
      return;
    }

    const newRow: DepreciationRow = {
      id: `r-${Date.now()}`,
      year: newRowYear,
      category: newCategory,
      assetName: newAssetName,
      depPercentage: "",
      purchaseDate: "",
      purchaseValue: "",
      openingDate: "",
      wdvOpeningValue: "",
      ...getEmptyYears()
    };
    setData([...data, newRow]);
    setSelectedYear(newRowYear);
    setIsAddAssetOpen(false);
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

      if (YEARS.includes(field) || field === 'purchaseValue' || field === 'wdvOpeningValue' || field === 'depPercentage') {
        const sanitizedValue = value.replace(/[^0-9.,]/g, '');
        row[field] = sanitizedValue;
      } else {
        row[field] = value;
      }

      newData[rowIndex] = row;
      return newData;
    });
  };

  const handleFormatCurrency = (id: string, field: string) => {
    setData(prevData => {
      const newData = [...prevData];
      const rowIndex = newData.findIndex(r => r.id === id);
      if (rowIndex === -1) return prevData;

      const row = { ...newData[rowIndex] };
      const val = parseFormattedNumber(row[field]);
      if (val > 0) {
        row[field] = field === 'depPercentage' ? val.toString() : formatIndianNumber(val);
      }

      // Auto-calculate years if WDV or Dep% changes
      if (field === 'wdvOpeningValue' || field === 'depPercentage') {
        const rate = parseFormattedNumber(row.depPercentage) / 100;
        let currentWdv = parseFormattedNumber(row.wdvOpeningValue);
        
        if (rate > 0 && currentWdv > 0) {
          YEARS.forEach(y => {
            const annualDep = currentWdv * rate;
            const monthlyDep = annualDep / 12;
            row[y] = formatIndianNumber(Math.round(monthlyDep));
            currentWdv -= annualDep;
          });
        } else {
          YEARS.forEach(y => {
            row[y] = "";
          });
        }
      }

      newData[rowIndex] = row;
      return newData;
    });
  }

  const handleSaveChanges = async () => {
    try {
      await saveDepreciation({
        financialYear: selectedYear,
        data: currentYearData.map(row => {
          const rowData: any = {
            category: row.category,
            assetName: row.assetName,
            depPercentage: parseFormattedNumber(row.depPercentage),
            purchaseDate: row.purchaseDate,
            purchaseValue: parseFormattedNumber(row.purchaseValue),
            openingDate: row.openingDate,
            wdvOpeningValue: parseFormattedNumber(row.wdvOpeningValue)
          };
          YEARS.forEach(y => {
            rowData[y] = parseFormattedNumber(row[y]);
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
    const acc: Record<string, number> = { purchaseValue: 0, wdvOpeningValue: 0, total: 0 };
    YEARS.forEach(y => acc[y] = 0);

    currentYearData.forEach(row => {
      acc.purchaseValue += parseFormattedNumber(row.purchaseValue);
      acc.wdvOpeningValue += parseFormattedNumber(row.wdvOpeningValue);
      
      let rowTotal = 0;
      YEARS.forEach(y => { 
        const val = parseFormattedNumber(row[y]);
        acc[y] += val; 
        rowTotal += val;
      });
      acc.total += rowTotal;
    });
    return acc;
  }, [currentYearData]);

  // bg-[#e6f2ff] = light blue for dropdown
  // bg-[#ffe6e6] = light pink for manual
  // bg-[#ffff99] = yellow for calculated

  return (
    <div className="flex-1 space-y-6 pb-8">
      
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Depreciation</h2>
          <p className="text-muted-foreground mt-1">
            Manage asset depreciation and amortization projections.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => {
            import('xlsx').then(XLSX => {
              const table = document.getElementById('export-table');
              if (table) {
                const clone = table.cloneNode(true);
                const inputs = clone.querySelectorAll('input');
                inputs.forEach(input => {
                  const val = input.value;
                  const parent = input.parentElement;
                  if (parent) parent.textContent = val || '-';
                });
                const wb = XLSX.utils.table_to_book(clone, { raw: true });
                XLSX.writeFile(wb, `Depreciation_budgeting_${selectedYear}.xlsx`);
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

      <div className="flex gap-4 mb-2 text-xs font-medium">
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#e6f2ff] border"></div> Pick From Dropdown List</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#ffff99] border"></div> System Auto Calculated</div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#ffe6e6] border"></div> Manual Entry</div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar">
            <Table id="export-table" className="border-collapse w-max min-w-full" style={{ tableLayout: 'fixed' }}>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="relative border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths.category, minWidth: colWidths.category }}>
                    Category
                    <Resizer colKey="category" />
                  </TableHead>
                  <TableHead className="relative border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths.assetName, minWidth: colWidths.assetName }}>
                    Asset
                    <Resizer colKey="assetName" />
                  </TableHead>
                  <TableHead className="relative border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths.depPercentage, minWidth: colWidths.depPercentage }}>
                    Dep % age
                    <Resizer colKey="depPercentage" />
                  </TableHead>
                  <TableHead className="relative border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths.purchaseDate, minWidth: colWidths.purchaseDate }}>
                    Date of Purchase
                    <Resizer colKey="purchaseDate" />
                  </TableHead>
                  <TableHead className="relative border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths.purchaseValue, minWidth: colWidths.purchaseValue }}>
                    Purchase Value
                    <Resizer colKey="purchaseValue" />
                  </TableHead>
                  <TableHead className="relative border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths.openingDate, minWidth: colWidths.openingDate }}>
                    Opening Date
                    <Resizer colKey="openingDate" />
                  </TableHead>
                  <TableHead className="relative border-r-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-black dark:text-white h-10 px-2 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths.wdvOpeningValue, minWidth: colWidths.wdvOpeningValue }}>
                    WDV - Opening Value
                    <Resizer colKey="wdvOpeningValue" />
                  </TableHead>
                  {YEARS.map(y => (
                    <TableHead key={y} className="relative border-r-2 border-slate-300 dark:border-slate-700 text-center text-xs font-bold text-black dark:text-white h-10 px-0.5 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths[y], minWidth: colWidths[y] }}>
                      {y}
                      <Resizer colKey={y} />
                    </TableHead>
                  ))}
                  <TableHead className="px-0 bg-gray-200/50 dark:bg-gray-800/50" style={{ width: colWidths.action, minWidth: colWidths.action }}></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentYearData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 group">
                    <TableCell className="border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8">
                      <select
                        value={row.category}
                        onChange={(e) => handleCellChange(row.id, 'category', e.target.value)}
                        className="w-full h-full bg-[#e6f2ff] dark:bg-blue-900/40 border-none rounded-none px-2 text-xs shadow-none outline-none focus-visible:ring-1"
                      >
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </TableCell>

                    <TableCell className="border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8">
                      <Input
                        value={row.assetName}
                        onChange={(e) => handleCellChange(row.id, 'assetName', e.target.value)}
                        className="w-full h-full bg-[#ffe6e6] dark:bg-rose-900/20 border-none rounded-none px-2 text-xs shadow-none focus-visible:ring-1 text-black dark:text-white"
                      />
                    </TableCell>

                    <TableCell className="border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8">
                      <Input
                        value={row.depPercentage}
                        onChange={(e) => handleCellChange(row.id, 'depPercentage', e.target.value)}
                        onBlur={() => handleFormatCurrency(row.id, 'depPercentage')}
                        className="w-full h-full bg-[#ffe6e6] dark:bg-rose-900/20 text-center border-none rounded-none px-2 text-xs shadow-none focus-visible:ring-1 text-black dark:text-white"
                      />
                    </TableCell>

                    <TableCell className="border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8">
                      <Input
                        value={row.purchaseDate}
                        placeholder="DD-MM-YYYY"
                        onChange={(e) => handleCellChange(row.id, 'purchaseDate', e.target.value)}
                        className="w-full h-full bg-[#ffe6e6] dark:bg-rose-900/20 text-center border-none rounded-none px-2 text-xs shadow-none focus-visible:ring-1 text-black dark:text-white"
                      />
                    </TableCell>

                    <TableCell className="border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8">
                      <Input
                        value={row.purchaseValue}
                        onChange={(e) => handleCellChange(row.id, 'purchaseValue', e.target.value)}
                        onBlur={() => handleFormatCurrency(row.id, 'purchaseValue')}
                        className="w-full h-full bg-[#ffe6e6] dark:bg-rose-900/20 text-right border-none rounded-none px-2 text-xs shadow-none focus-visible:ring-1 text-black dark:text-white"
                      />
                    </TableCell>

                    <TableCell className="border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8">
                      <Input
                        value={row.openingDate}
                        placeholder="DD-MM-YYYY"
                        onChange={(e) => handleCellChange(row.id, 'openingDate', e.target.value)}
                        className="w-full h-full bg-[#ffe6e6] dark:bg-rose-900/20 text-center border-none rounded-none px-2 text-xs shadow-none focus-visible:ring-1 text-black dark:text-white"
                      />
                    </TableCell>

                    <TableCell className="border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8">
                      <Input
                        value={row.wdvOpeningValue}
                        onChange={(e) => handleCellChange(row.id, 'wdvOpeningValue', e.target.value)}
                        onBlur={() => handleFormatCurrency(row.id, 'wdvOpeningValue')}
                        className="w-full h-full bg-[#ffe6e6] dark:bg-rose-900/20 text-right font-semibold border-none rounded-none px-2 text-xs shadow-none focus-visible:ring-1 text-black dark:text-white"
                      />
                    </TableCell>

                    {YEARS.map(y => (
                      <TableCell key={y} className="border-r-2 border-slate-300 dark:border-slate-700 p-0 h-8">
                        <Input
                          value={row[y] || ""}
                          onChange={(e) => handleCellChange(row.id, y, e.target.value)}
                          onBlur={() => handleFormatCurrency(row.id, y)}
                          className="h-full w-full min-w-0 text-right text-xs bg-[#ffe6e6] dark:bg-rose-900/20 border-none shadow-none focus-visible:ring-1 px-1 rounded-none text-black dark:text-white"
                        />
                      </TableCell>
                    ))}

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
                    <TableCell colSpan={7 + YEARS.length + 1} className="h-24 text-center text-muted-foreground">
                      No assets found. Click "Add Asset" to start.
                    </TableCell>
                  </TableRow>
                )}

                {/* Totals Row */}
                <TableRow className="bg-[#ffff99] dark:bg-yellow-600/40 font-bold hover:bg-[#ffff99]">
                  <TableCell colSpan={4} className="border-r-2 border-slate-300 dark:border-slate-700 p-2 text-black dark:text-white text-xs text-right">
                    Total
                  </TableCell>
                  <TableCell className="border-r-2 border-slate-300 dark:border-slate-700 text-right p-1 truncate text-black dark:text-white text-xs">
                    {formatIndianNumber(totals.purchaseValue)}
                  </TableCell>
                  <TableCell className="border-r-2 border-slate-300 dark:border-slate-700"></TableCell>
                  <TableCell className="border-r-2 border-slate-300 dark:border-slate-700 text-right p-1 truncate text-black dark:text-white text-xs">
                    {formatIndianNumber(totals.wdvOpeningValue)}
                  </TableCell>
                  {YEARS.map(y => (
                    <TableCell key={y} className="border-r-2 border-slate-300 dark:border-slate-700 text-right p-1 truncate text-black dark:text-white text-xs">
                      {formatIndianNumber(totals[y])}
                    </TableCell>
                  ))}
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end items-center gap-2 pt-2">
        <Button onClick={() => {
          setNewCategory(CATEGORY_OPTIONS[0]);
          setNewAssetName("");
          setNewRowYear(selectedYear);
          setIsAddAssetOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
        <Button variant="outline" onClick={handleSaveChanges}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Add Asset Modal */}
      <Modal
        isOpen={isAddAssetOpen}
        onClose={() => setIsAddAssetOpen(false)}
        title="Add Asset for Depreciation"
      >
        <form onSubmit={handleAddAsset} className="space-y-4">
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
            <label className="text-sm font-medium">Category</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              required
            >
              {CATEGORY_OPTIONS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Asset Name</label>
            <Input
              placeholder="e.g. Laptop, Tata Ace"
              value={newAssetName}
              onChange={e => setNewAssetName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAddAssetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Asset
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
