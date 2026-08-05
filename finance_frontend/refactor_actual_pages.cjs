const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/features/actual/pages');
const files = ['Summary.tsx', 'RevenueDirectExpense.tsx', 'CorporateExpenses.tsx', 'Salary.tsx', 'BankCharges.tsx'];

files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove any ActualNav imports or JSX tags
  content = content.replace(/import\s+(?:\{\s*ActualNav\s*\}|ActualNav)\s+from\s+["']\.\.\/components\/ActualNav["']\n?/g, '');
  content = content.replace(/<ActualNav \/>\n?\s*/g, '');

  if (file === 'Summary.tsx') {
    if (!content.includes('useGlobalStore')) {
      content = content.replace(
        /export default function Summary\(\) \{/,
        `import { useGlobalStore } from "@/store/useGlobalStore"\n\nexport default function Summary() {`
      );
      content = content.replace(
        /const \[selectedYear, setSelectedYear\] = useState\(INITIAL_YEAR\);/,
        `const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();`
      );
    }
  }

  if (file === 'RevenueDirectExpense.tsx') {
    if (!content.includes('useActualRevenueQuery')) {
      content = content.replace(
        /import \{ fetchAPI \} from "@\/lib\/api"\n?/,
        `import { useActualRevenueQuery, useSaveActualRevenueMutation } from "../hooks/useActualRevenue"\nimport { useGlobalStore } from "@/store/useGlobalStore"\n`
      );
      content = content.replace(
        /export default function RevenueDirectExpense\(\) \{\n\s*const \[selectedYear, setSelectedYear\] = useState\(INITIAL_YEAR\);\n\s*const \[data, setData\] = useState<BudgetRow\[\]>\(\[\]\);\n\s*const \[isLoading, setIsLoading\] = useState\(true\);/,
        `export default function RevenueDirectExpense() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [data, setData] = useState<BudgetRow[]>([]);
  const { data: serverData, isLoading: isQueryLoading } = useActualRevenueQuery(selectedYear);
  const { mutateAsync: saveRevenue, isPending: isSaving } = useSaveActualRevenueMutation();
  const isLoading = isQueryLoading;`
      );
      content = content.replace(
        /useEffect\(\(\) => \{\n\s*const fetchData = async \(\) => \{\n[\s\S]*?fetchData\(\);\n\s*\}, \[selectedYear\]\);/,
        `useEffect(() => {
    if (!serverData) return;
    if (serverData.length > 0) {
      const newRows: BudgetRow[] = [];
      serverData.forEach((group: any, idx: number) => {
        const groupId = \`fetched-g-\${idx}-\${Date.now()}\`;
        const baseFields = {
          customer: group.customer,
          project: group.project,
          location: group.location,
          year: group.year || selectedYear,
        };

        const revRow: BudgetRow = { id: \`\${groupId}-1\`, groupId, ...baseFields, head: "Revenue", isYellow: false, ...getEmptyMonths() };
        const pctRow: BudgetRow = { id: \`\${groupId}-2\`, groupId, ...baseFields, head: "Direct Expense % Age", isYellow: false, ...getEmptyMonths() };
        const expRow: BudgetRow = { id: \`\${groupId}-3\`, groupId, ...baseFields, head: "Direct Expenses", isYellow: true, ...getEmptyMonths() };
        const gmRow: BudgetRow = { id: \`\${groupId}-4\`, groupId, ...baseFields, head: "Gross Margin", isYellow: true, ...getEmptyMonths() };
        const gmPctRow: BudgetRow = { id: \`\${groupId}-5\`, groupId, ...baseFields, head: "Gross Margin %Age", isYellow: true, ...getEmptyMonths() };

        let revTotal = 0;
        let pctSum = 0;
        let pctCount = 0;
        let expTotal = 0;
        let gmTotal = 0;
        let hasExpData = false;
        let hasRevData = false;

        MONTHS.forEach(m => {
          const revVal = group.revenueMonths?.[m] || 0;
          const pctVal = group.directExpensePctMonths?.[m] || 0;
          
          if (group.revenueMonths?.[m] != null || group.directExpensePctMonths?.[m] != null) {
             hasExpData = true;
          }

          if (group.revenueMonths?.[m] != null) {
            hasRevData = true;
            revTotal += revVal;
            revRow[m] = formatIndianNumber(revVal);
          }
          if (group.directExpensePctMonths?.[m] != null) {
            pctSum += pctVal;
            pctCount++;
            pctRow[m] = pctVal.toString();
          }

          const expVal = (revVal * pctVal) / 100;
          expTotal += expVal;
          expRow[m] = hasExpData ? formatIndianNumber(expVal) : null;

          const gmVal = revVal - expVal;
          gmTotal += gmVal;
          gmRow[m] = hasExpData ? formatIndianNumber(gmVal) : null;

          gmPctRow[m] = (revVal > 0) ? ((gmVal / revVal) * 100).toFixed(2) : null;
        });

        revRow.total = hasRevData ? formatIndianNumber(revTotal) : null;
        pctRow.total = pctCount > 0 ? (pctSum / pctCount).toFixed(2) : null;
        expRow.total = hasExpData ? formatIndianNumber(expTotal) : null;
        gmRow.total = hasExpData ? formatIndianNumber(gmTotal) : null;
        gmPctRow.total = (revTotal > 0) ? ((gmTotal / revTotal) * 100).toFixed(2) : null;

        newRows.push(revRow, pctRow, expRow, gmRow, gmPctRow);
      });
      setData(newRows);
    } else {
      setData([]);
    }
  }, [serverData, selectedYear]);`
      );
      
      content = content.replace(
        /const handleSaveChanges = async \(\) => \{\n\s*try \{\n\s*await fetchAPI\('\/actual\/revenue-direct-expense', \{\n\s*method: 'POST',\n\s*body: JSON\.stringify\(\{\n\s*year: selectedYear,\n\s*groups: Array\.from\(groupsMap\.values\(\)\)\n\s*\}\)\n\s*\}\);/,
        `const handleSaveChanges = async () => {
    try {
      await saveRevenue({ financialYear: selectedYear, groups: Array.from(groupsMap.values()) });`
      );

      content = content.replace(
        /<Button onClick=\{handleSaveChanges\} className="bg-emerald-600 hover:bg-emerald-700">/,
        `<Button onClick={handleSaveChanges} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">`
      );
      content = content.replace(
        /<Save className="w-4 h-4 mr-2" \/>\n\s*Save Changes/,
        `{isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}`
      );
    }
  }

  if (file === 'CorporateExpenses.tsx') {
    if (!content.includes('useActualCorporateQuery')) {
      content = content.replace(
        /import \{ fetchAPI \} from "@\/lib\/api"\n?/,
        `import { useActualCorporateQuery, useSaveActualCorporateMutation } from "../hooks/useActualCorporate"\nimport { useGlobalStore } from "@/store/useGlobalStore"\n`
      );
      content = content.replace(
        /export default function CorporateExpenses\(\) \{\n\s*const \[selectedYear, setSelectedYear\] = useState\(INITIAL_YEAR\);\n\s*const \[data, setData\] = useState<ExpenseRow\[\]>\(\[\]\);\n\s*const \[isLoading, setIsLoading\] = useState\(true\);/,
        `export default function CorporateExpenses() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [data, setData] = useState<ExpenseRow[]>([]);
  const { data: serverData, isLoading: isQueryLoading } = useActualCorporateQuery(selectedYear);
  const { mutateAsync: saveCorporate, isPending: isSaving } = useSaveActualCorporateMutation();
  const isLoading = isQueryLoading;`
      );
      content = content.replace(
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
           isYellow: false,
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
      
      content = content.replace(
        /const handleSaveChanges = async \(\) => \{\n\s*try \{\n\s*await fetchAPI\('\/actual\/corporate-expenses', \{\n\s*method: 'POST',\n\s*body: JSON\.stringify\(\{\n\s*year: selectedYear,\n\s*data: currentYearData\.map\(row => \{/,
        `const handleSaveChanges = async () => {
    try {
      await saveCorporate({
        financialYear: selectedYear,
        data: currentYearData.map(row => {`
      );
      // Remove closing bracket of fetchAPI payload
      content = content.replace(
        /            return rowData;\n\s*\}\)\n\s*\}\)\n\s*\}\);/,
        `            return rowData;\n          })\n      });`
      );

      content = content.replace(
        /<Button onClick=\{handleSaveChanges\} className="bg-emerald-600 hover:bg-emerald-700">/,
        `<Button onClick={handleSaveChanges} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">`
      );
      content = content.replace(
        /<Save className="w-4 h-4 mr-2" \/>\n\s*Save Changes/,
        `{isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}`
      );
    }
  }

  if (file === 'Salary.tsx') {
    if (!content.includes('useActualSalaryQuery')) {
      content = content.replace(
        /import \{ fetchAPI \} from "@\/lib\/api"\n?/,
        `import { useActualSalaryQuery, useSaveActualSalaryMutation } from "../hooks/useActualSalary"\nimport { useGlobalStore } from "@/store/useGlobalStore"\n`
      );
      content = content.replace(
        /export default function Salary\(\) \{\n\s*const \[selectedYear, setSelectedYear\] = useState\(INITIAL_YEAR\);\n\s*const \[data, setData\] = useState<SalaryRow\[\]>\(\[\]\);\n\s*const \[isLoading, setIsLoading\] = useState\(true\);/,
        `export default function Salary() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [data, setData] = useState<SalaryRow[]>([]);
  const { data: serverData, isLoading: isQueryLoading } = useActualSalaryQuery(selectedYear);
  const { mutateAsync: saveSalary, isPending: isSaving } = useSaveActualSalaryMutation();
  const isLoading = isQueryLoading;`
      );
      content = content.replace(
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
      
      content = content.replace(
        /const handleSaveChanges = async \(\) => \{\n\s*try \{\n\s*await fetchAPI\('\/actual\/salaries', \{\n\s*method: 'POST',\n\s*body: JSON\.stringify\(\{\n\s*year: selectedYear,\n\s*data: currentYearData\.map\(row => \{/,
        `const handleSaveChanges = async () => {
    try {
      await saveSalary({
        financialYear: selectedYear,
        data: currentYearData.map(row => {`
      );
      content = content.replace(
        /            return rowData;\n\s*\}\)\n\s*\}\)\n\s*\}\);/,
        `            return rowData;\n          })\n      });`
      );

      content = content.replace(
        /<Button onClick=\{handleSaveChanges\} className="bg-emerald-600 hover:bg-emerald-700">/,
        `<Button onClick={handleSaveChanges} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">`
      );
      content = content.replace(
        /<Save className="w-4 h-4 mr-2" \/>\n\s*Save Changes/,
        `{isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}`
      );
    }
  }

  if (file === 'BankCharges.tsx') {
    if (!content.includes('useActualBankChargesQuery')) {
      content = content.replace(
        /import \{ fetchAPI \} from "@\/lib\/api"\n?/,
        `import { useActualBankChargesQuery, useSaveActualBankChargesMutation } from "../hooks/useActualBankCharges"\nimport { useGlobalStore } from "@/store/useGlobalStore"\n`
      );
      content = content.replace(
        /export default function BankCharges\(\) \{\n\s*const \[selectedYear, setSelectedYear\] = useState\(INITIAL_YEAR\);\n\s*const \[data, setData\] = useState<BankChargeRow\[\]>\(\[\]\);\n\s*const \[isLoading, setIsLoading\] = useState\(true\);/,
        `export default function BankCharges() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [data, setData] = useState<BankChargeRow[]>([]);
  const { data: serverData, isLoading: isQueryLoading } = useActualBankChargesQuery(selectedYear);
  const { mutateAsync: saveBankCharges, isPending: isSaving } = useSaveActualBankChargesMutation();
  const isLoading = isQueryLoading;`
      );
      content = content.replace(
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
      
      content = content.replace(
        /const handleSaveChanges = async \(\) => \{\n\s*try \{\n\s*await fetchAPI\('\/actual\/bank-charges', \{\n\s*method: 'POST',\n\s*body: JSON\.stringify\(\{\n\s*year: selectedYear,\n\s*data: currentYearData\.map\(row => \{/,
        `const handleSaveChanges = async () => {
    try {
      await saveBankCharges({
        financialYear: selectedYear,
        data: currentYearData.map(row => {`
      );
      content = content.replace(
        /            return rowData;\n\s*\}\)\n\s*\}\)\n\s*\}\);/,
        `            return rowData;\n          })\n      });`
      );

      content = content.replace(
        /<Button onClick=\{handleSaveChanges\} className="bg-emerald-600 hover:bg-emerald-700">/,
        `<Button onClick={handleSaveChanges} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">`
      );
      content = content.replace(
        /<Save className="w-4 h-4 mr-2" \/>\n\s*Save Changes/,
        `{isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}`
      );
    }
  }

  fs.writeFileSync(filePath, content);
});

console.log("Refactoring of all actual pages completed.");
