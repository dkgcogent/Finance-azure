const fs = require('fs');
const path = require('path');

// 1. Update router.tsx
const routerPath = path.join(__dirname, 'src/app/router.tsx');
let routerCode = fs.readFileSync(routerPath, 'utf8');
routerCode = routerCode.replace(
  /const GlobalInvoiceMaster = React\.lazy\(\(\) => import\("@\/features\/invoicing\/pages\/GlobalInvoiceMaster"\)\)/,
  `const GlobalInvoiceMaster = React.lazy(() => import("@/features/invoice-master/InvoiceMaster"))`
);
fs.writeFileSync(routerPath, routerCode);

// 2. Create API Service
const apiDir = path.join(__dirname, 'src/features/invoice-master/api');
if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir, { recursive: true });

const serviceContent = `import { mockData, Invoice } from "@/data/mockData";

export const fetchInvoices = async (financialYear: string): Promise<Invoice[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Filter mock data by financial year (if finYear is present in mockData)
      // We will fallback to mockData if no finYear matched, so UI isn't completely empty for demo purposes if mock data has wrong years
      const filtered = mockData.filter(inv => inv.finYear === (financialYear.substring(0,4) + '-' + financialYear.substring(7)));
      // Note: financialYear is "2026-2027", but mockData has "2026-27"
      resolve(filtered.length > 0 ? filtered : mockData); 
    }, 800);
  });
};
`;
fs.writeFileSync(path.join(apiDir, 'invoiceService.ts'), serviceContent);

// 3. Create Hook
const hooksDir = path.join(__dirname, 'src/features/invoice-master/hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const hookContent = `import { useQuery } from '@tanstack/react-query';
import { fetchInvoices } from '../api/invoiceService';

export const useInvoices = (financialYear: string) => {
  return useQuery({
    queryKey: ['invoices', financialYear],
    queryFn: () => fetchInvoices(financialYear),
    enabled: !!financialYear,
  });
};
`;
fs.writeFileSync(path.join(hooksDir, 'useInvoices.ts'), hookContent);

// 4. Refactor InvoiceMaster.tsx
const componentPath = path.join(__dirname, 'src/features/invoice-master/InvoiceMaster.tsx');
let componentCode = fs.readFileSync(componentPath, 'utf8');

// Replace imports
componentCode = componentCode.replace(
  /import \{ mockData, Invoice \} from "@\/data\/mockData";/,
  `import { Invoice } from "@/data/mockData";
import { useGlobalStore } from "@/store/useGlobalStore";
import { useInvoices } from "./hooks/useInvoices";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";`
);

// Replace state block
const oldStateBlock = `  const [activeTab, setActiveTab] = useState<TabFilter>("All");
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);



  // Filter data based on active tab
  const filteredData = useMemo(() => {
    if (activeTab === "All") return mockData;
    return mockData.filter(inv => inv.type === activeTab);
  }, [activeTab]);`;

const newStateBlock = `  const { financialYear, setFinancialYear } = useGlobalStore();
  const [activeTab, setActiveTab] = useState<TabFilter>("All");
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const { data: invoices = [], isLoading } = useInvoices(financialYear);

  // Filter data based on active tab
  const filteredData = useMemo(() => {
    if (activeTab === "All") return invoices;
    return invoices.filter(inv => inv.type === activeTab);
  }, [activeTab, invoices]);`;

componentCode = componentCode.replace(oldStateBlock, newStateBlock);

// Replace Header actions
const oldHeaderActions = `<div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>`;

const newHeaderActions = `<div className="flex items-center gap-2">
          <Select value={financialYear} onValueChange={setFinancialYear}>
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
        </div>`;

componentCode = componentCode.replace(oldHeaderActions, newHeaderActions);

// Replace Data Table container
const oldTableContainer = `<div className="h-[600px] flex flex-col">
            <InvoiceTable`;

const newTableContainer = `<div className="h-[600px] flex flex-col relative">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            )}
            <InvoiceTable`;

componentCode = componentCode.replace(oldTableContainer, newTableContainer);

fs.writeFileSync(componentPath, componentCode);
console.log('InvoiceMaster refactored successfully!');
