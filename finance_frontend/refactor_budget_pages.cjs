const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'features', 'budgeting', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx') && f !== 'Budget.tsx');

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove BudgetNav import and usage
  content = content.replace(/import\s+\{\s*BudgetNav\s*\}\s+from\s+["'].*BudgetNav["'];?\n?/g, '');
  content = content.replace(/<BudgetNav\s*\/>\s*\n?/g, '');
  
  // If the file is Summary.tsx or RevenueDirectExpense.tsx, inject Zustand
  if (file === 'Summary.tsx') {
    // Inject useGlobalStore import
    if (!content.includes('useGlobalStore')) {
      content = content.replace(/export default function Summary\(\) \{/, 'import { useGlobalStore } from "@/store/useGlobalStore";\n\nexport default function Summary() {');
    }
    // Replace useState for selectedYear
    content = content.replace(/const \[selectedYear, setSelectedYear\] = useState\(INITIAL_YEAR\);/, 'const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();');
    
    // Also remove the unused INITIAL_YEAR and useState import if possible, but it's okay to leave for now.
  }
  
  if (file === 'RevenueDirectExpense.tsx') {
    if (!content.includes('useGlobalStore')) {
      content = content.replace(/export default function RevenueDirectExpense\(\) \{/, 'import { useGlobalStore } from "@/store/useGlobalStore";\n\nexport default function RevenueDirectExpense() {');
    }
    content = content.replace(/const \[selectedYear, setSelectedYear\] = useState\("2026-2027"\);/, 'const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Refactored ${file}`);
});
