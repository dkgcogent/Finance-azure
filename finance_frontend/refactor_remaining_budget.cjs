const fs = require('fs');
const path = require('path');

// 1. Types
const typesPath = 'src/features/budgeting/types/index.ts';
let typesContent = fs.readFileSync(typesPath, 'utf8');
if (!typesContent.includes('SalaryRowSchema')) {
  typesContent += `
export const SalaryRowSchema = z.object({
  head: z.string(),
  customer: z.string().optional(),
  project: z.string().optional(),
  location: z.string().optional(),
  designation: z.string().optional(),
  nameOfEmployee: z.string().optional(),
}).catchall(z.number());
export type SalaryRowType = z.infer<typeof SalaryRowSchema>;

export const BankChargeRowSchema = z.object({
  head: z.string(),
}).catchall(z.number());
export type BankChargeRowType = z.infer<typeof BankChargeRowSchema>;
`;
  fs.writeFileSync(typesPath, typesContent);
}

// 2. API Service
const apiPath = 'src/features/budgeting/api/budgetService.ts';
let apiContent = fs.readFileSync(apiPath, 'utf8');
if (!apiContent.includes('getSalaryData')) {
  apiContent += `
export const getSalaryData = async (financialYear: string) => {
  return fetchAPI(\`/budget/salaries?year=\${financialYear}\`);
};
export const saveSalaryData = async (financialYear: string, data: any[]) => {
  return fetchAPI('/budget/salaries', {
    method: 'POST',
    body: JSON.stringify({ year: financialYear, data })
  });
};

export const getBankCharges = async (financialYear: string) => {
  return fetchAPI(\`/budget/bank-charges?year=\${financialYear}\`);
};
export const saveBankCharges = async (financialYear: string, data: any[]) => {
  return fetchAPI('/budget/bank-charges', {
    method: 'POST',
    body: JSON.stringify({ year: financialYear, data })
  });
};
`;
  fs.writeFileSync(apiPath, apiContent);
}

// 3. Hooks
const hooksDir = 'src/features/budgeting/hooks';
fs.writeFileSync(path.join(hooksDir, 'useSalaryData.ts'), `
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSalaryData, saveSalaryData } from '../api/budgetService';

export const useSalaryQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['salary', financialYear],
    queryFn: () => getSalaryData(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveSalaryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveSalaryData(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['salary', financialYear] });
    },
  });
};
`);

fs.writeFileSync(path.join(hooksDir, 'useBankCharges.ts'), `
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBankCharges, saveBankCharges } from '../api/budgetService';

export const useBankChargesQuery = (financialYear: string) => {
  return useQuery({
    queryKey: ['bank-charges', financialYear],
    queryFn: () => getBankCharges(financialYear),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSaveBankChargesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ financialYear, data }: { financialYear: string, data: any[] }) => saveBankCharges(financialYear, data),
    onSuccess: (_, { financialYear }) => {
      queryClient.invalidateQueries({ queryKey: ['bank-charges', financialYear] });
    },
  });
};
`);

// 4. Refactor Salary.tsx
const salaryPath = path.join(__dirname, 'src', 'features', 'budgeting', 'pages', 'Salary.tsx');
let salaryContent = fs.readFileSync(salaryPath, 'utf8');

// Imports
salaryContent = salaryContent.replace(
  /import \{ fetchAPI \} from "@\/lib\/api"\n/,
  `import { useSalaryQuery, useSaveSalaryMutation } from "../hooks/useSalaryData"\nimport { useGlobalStore } from "@/store/useGlobalStore"\n`
);
salaryContent = salaryContent.replace(
  /export default function Salary\(\) \{\n\s*const \[selectedYear, setSelectedYear\] = useState\("2026-2027"\);\n\s*const \[data, setData\] = useState<SalaryRow\[\]>\(\[\]\);\n\s*const \[isLoading, setIsLoading\] = useState\(true\);/,
  `export default function Salary() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [data, setData] = useState<SalaryRow[]>([]);
  const { data: serverData, isLoading: isQueryLoading } = useSalaryQuery(selectedYear);
  const { mutateAsync: saveSalary, isPending: isSaving } = useSaveSalaryMutation();
  const isLoading = isQueryLoading;`
);

salaryContent = salaryContent.replace(
  /useEffect\(\(\) => \{\n\s*const fetchData = async \(\) => \{\n[\s\S]*?fetchData\(\);\n\s*\}, \[selectedYear\]\);/,
  `useEffect(() => {
    if (!serverData) return;
    if (serverData.length > 0) {
      const formattedData = serverData.map((row: any, idx: number) => {
         let total = 0;
         let hasData = false;
         const mappedRow: any = {
           id: \`fetched-\${idx}-\${Date.now()}\`,
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
  }, [serverData, selectedYear]);`
);

salaryContent = salaryContent.replace(
  /const handleSaveChanges = async \(\) => \{\n\s*try \{\n\s*await fetchAPI\('\/budget\/salaries', \{\n\s*method: 'POST',\n\s*body: JSON\.stringify\(\{\n\s*year: selectedYear,\n\s*data: currentYearData\.map\(row => \{/,
  `const handleSaveChanges = async () => {
    try {
      await saveSalary({
        financialYear: selectedYear,
        data: currentYearData.map(row => {`
);

salaryContent = salaryContent.replace(
  /<Button onClick=\{handleSaveChanges\} className="bg-emerald-600 hover:bg-emerald-700">/,
  `<Button onClick={handleSaveChanges} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">`
);
salaryContent = salaryContent.replace(
  /<Save className="w-4 h-4 mr-2" \/>\n\s*Save Changes/,
  `{isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}`
);
fs.writeFileSync(salaryPath, salaryContent, 'utf8');

// 5. Refactor BankCharges.tsx
const bcPath = path.join(__dirname, 'src', 'features', 'budgeting', 'pages', 'BankCharges.tsx');
let bcContent = fs.readFileSync(bcPath, 'utf8');

// Imports
bcContent = bcContent.replace(
  /import \{ fetchAPI \} from "@\/lib\/api"\n/,
  `import { useBankChargesQuery, useSaveBankChargesMutation } from "../hooks/useBankCharges"\nimport { useGlobalStore } from "@/store/useGlobalStore"\n`
);
bcContent = bcContent.replace(
  /export default function BankCharges\(\) \{\n\s*const \[selectedYear, setSelectedYear\] = useState\("2026-2027"\);\n\s*const \[data, setData\] = useState<BankChargeRow\[\]>\(\[\]\);\n\s*const \[isLoading, setIsLoading\] = useState\(true\);/,
  `export default function BankCharges() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [data, setData] = useState<BankChargeRow[]>([]);
  const { data: serverData, isLoading: isQueryLoading } = useBankChargesQuery(selectedYear);
  const { mutateAsync: saveBankCharges, isPending: isSaving } = useSaveBankChargesMutation();
  const isLoading = isQueryLoading;`
);

bcContent = bcContent.replace(
  /useEffect\(\(\) => \{\n\s*const fetchData = async \(\) => \{\n[\s\S]*?fetchData\(\);\n\s*\}, \[selectedYear\]\);/,
  `useEffect(() => {
    if (!serverData) return;
    if (serverData.length > 0) {
      const formattedData = serverData.map((row: any, idx: number) => {
         let total = 0;
         let hasData = false;
         const mappedRow: any = {
           id: \`fetched-\${idx}-\${Date.now()}\`,
           year: row.year || selectedYear,
           head: row.head || "",
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
  }, [serverData, selectedYear]);`
);

bcContent = bcContent.replace(
  /const handleSaveChanges = async \(\) => \{\n\s*try \{\n\s*await fetchAPI\('\/budget\/bank-charges', \{\n\s*method: 'POST',\n\s*body: JSON\.stringify\(\{\n\s*year: selectedYear,\n\s*data: currentYearData\.map\(row => \{/,
  `const handleSaveChanges = async () => {
    try {
      await saveBankCharges({
        financialYear: selectedYear,
        data: currentYearData.map(row => {`
);

bcContent = bcContent.replace(
  /<Button onClick=\{handleSaveChanges\} className="bg-emerald-600 hover:bg-emerald-700">/,
  `<Button onClick={handleSaveChanges} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">`
);
bcContent = bcContent.replace(
  /<Save className="w-4 h-4 mr-2" \/>\n\s*Save Changes/,
  `{isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}`
);
fs.writeFileSync(bcPath, bcContent, 'utf8');

console.log("Salary and BankCharges refactored successfully.");
