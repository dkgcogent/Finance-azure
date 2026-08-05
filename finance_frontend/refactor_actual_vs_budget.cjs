const fs = require('fs');
const path = require('path');

// 1. Create API Service
const apiDir = path.join(__dirname, 'src/features/actual-vs-budget/api');
if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir, { recursive: true });

const serviceContent = `import { apiClient } from "@/lib/api";

export type MonthKey = 'apr' | 'may' | 'jun' | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec' | 'jan' | 'feb' | 'mar';

export const MONTHS: { key: MonthKey, label: string }[] = [
  { key: 'apr', label: 'Apr' },
  { key: 'may', label: 'May' },
  { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' },
  { key: 'aug', label: 'Aug' },
  { key: 'sep', label: 'Sep' },
  { key: 'oct', label: 'Oct' },
  { key: 'nov', label: 'Nov' },
  { key: 'dec', label: 'Dec' },
  { key: 'jan', label: 'Jan' },
  { key: 'feb', label: 'Feb' },
  { key: 'mar', label: 'Mar' },
];

export const ROWS = [
  "Revenue",
  "Direct Expenses",
  "Gross Margin",
  "Gross Margin %Age",
  "Total Corporate Expenses",
  "Corporate Expenses % Age",
  "Total Bank Interest / Expenses",
  "Total Bank Interest / Expenses % Age",
  "EBITA",
  "EBITA %Age",
  "Deprication",
  "Income Tax",
  "NP",
  "NP % Age"
];

const generateMockActuals = (budgetData: any) => {
  const actuals: any = {};
  ROWS.forEach(row => {
    actuals[row] = MONTHS.map((_, i) => {
      const budgetVal = budgetData[row] ? budgetData[row][i] : 0;
      const isPct = row.includes('%');
      const variance = isPct ? (Math.random() * 4 - 2) : (budgetVal * (Math.random() * 0.4 - 0.2));
      return budgetVal + variance;
    });
  });
  return actuals;
}

export const getActualVsBudget = async (financialYear: string) => {
  const response = await apiClient.get(\`/budget/summary?year=\${financialYear}\`);
  const budgetData = response.data;
  const actualData = generateMockActuals(budgetData);
  return { budgetData, actualData };
};
`;
fs.writeFileSync(path.join(apiDir, 'actualVsBudgetService.ts'), serviceContent);

// 2. Create Hook
const hooksDir = path.join(__dirname, 'src/features/actual-vs-budget/hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const hookContent = `import { useQuery } from '@tanstack/react-query';
import { getActualVsBudget } from '../api/actualVsBudgetService';

export const useActualVsBudget = (financialYear: string) => {
  return useQuery({
    queryKey: ['actual-vs-budget', financialYear],
    queryFn: () => getActualVsBudget(financialYear),
    enabled: !!financialYear,
  });
};
`;
fs.writeFileSync(path.join(hooksDir, 'useActualVsBudget.ts'), hookContent);

// 3. Refactor Component
const componentPath = path.join(__dirname, 'src/features/actual-vs-budget/pages/ActualVSBudget.tsx');
let componentCode = fs.readFileSync(componentPath, 'utf8');

// Replace imports and hardcoded arrays
componentCode = componentCode.replace(/import \{ fetchAPI \} from "@\/lib\/api"/, `import { useGlobalStore } from "@/store/useGlobalStore";\nimport { useActualVsBudget } from "../hooks/useActualVsBudget";\nimport { MONTHS, ROWS } from "../api/actualVsBudgetService";`);

// Remove MONTHS, ROWS, generateMockActuals block
componentCode = componentCode.replace(/type MonthKey[\s\S]*?generateMockActuals[\s\S]*?return actuals;\n\}/, '');

// Replace state and fetch logic inside the component
const oldStateBlock = `  const [selectedYear, setSelectedYear] = useState("2026-2027");
  const [selectedMonth, setSelectedMonth] = useState("All Months");
  const [selectedCustomer, setSelectedCustomer] = useState("All Customers");
  const [selectedProject, setSelectedProject] = useState("All Projects");
  const [selectedSubProject, setSelectedSubProject] = useState("All Sub Projects");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");

  const [budgetData, setBudgetData] = useState<any>(null);
  const [actualData, setActualData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const budgetRes = await fetchAPI(\`/budget/summary?year=\${selectedYear}\`);
        setBudgetData(budgetRes);
        // Mocking Actual Data based on Budget Data since no backend exists yet
        setActualData(generateMockActuals(budgetRes));
      } catch (error) {
        console.error("Failed to load budget summary", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedYear]);`;

const newStateBlock = `  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [selectedMonth, setSelectedMonth] = useState("All Months");
  const [selectedCustomer, setSelectedCustomer] = useState("All Customers");
  const [selectedProject, setSelectedProject] = useState("All Projects");
  const [selectedSubProject, setSelectedSubProject] = useState("All Sub Projects");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");

  const { data, isLoading: loading } = useActualVsBudget(selectedYear);
  const budgetData = data?.budgetData;
  const actualData = data?.actualData;`;

componentCode = componentCode.replace(oldStateBlock, newStateBlock);

fs.writeFileSync(componentPath, componentCode);
console.log('Refactoring complete!');
