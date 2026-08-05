const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'features', 'budgeting', 'pages', 'CorporateExpenses.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
content = content.replace(
  /import \{ fetchAPI \} from "@\/lib\/api"\n/,
  `import { useCorporateQuery, useSaveCorporateMutation } from "../hooks/useCorporateExpenses"\nimport { useGlobalStore } from "@/store/useGlobalStore"\n`
);

// 2. Replace local state with global state and query hooks
content = content.replace(
  /export default function CorporateExpenses\(\) \{\n\s*const \[selectedYear, setSelectedYear\] = useState\("2023-2024"\);\n\s*const \[data, setData\] = useState<ExpenseRow\[\]>\(\[\]\);\n\s*const \[isLoading, setIsLoading\] = useState\(true\);/,
  `export default function CorporateExpenses() {
  const { financialYear: selectedYear, setFinancialYear: setSelectedYear } = useGlobalStore();
  const [data, setData] = useState<ExpenseRow[]>([]);
  const { data: serverData, isLoading: isQueryLoading } = useCorporateQuery(selectedYear);
  const { mutateAsync: saveExpenses, isPending: isSaving } = useSaveCorporateMutation();
  const isLoading = isQueryLoading;`
);

// 3. Replace the massive useEffect fetchData block
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
           isYellow: row.head === "HO Salary" || row.head === "Lucknow/ Ops Staff Salary",
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
      const newRows = DEFAULT_EXPENSE_HEADS.map((head, index) => ({
        id: \`default-\${index}-\${selectedYear}\`,
        year: selectedYear,
        head: head,
        isYellow: head === "HO Salary" || head === "Lucknow/ Ops Staff Salary",
        ...getEmptyMonths()
      }));
      setData(newRows);
    }
  }, [serverData, selectedYear]);`
);

// 4. Update handleSaveChanges
content = content.replace(
  /const handleSaveChanges = async \(\) => \{\n\s*try \{\n\s*await fetchAPI\('\/budget\/corporate-expenses', \{\n\s*method: 'POST',\n\s*body: JSON\.stringify\(\{\n\s*year: selectedYear,\n\s*data: currentYearData\.map\(row => \{\n\s*const rowData: any = \{\n\s*head: row\.head,\n\s*\};\n\s*MONTHS\.forEach\(m => \{\n\s*rowData\[m\] = parseFormattedNumber\(row\[m\]\);\n\s*\}\);\n\s*return rowData;\n\s*\}\)\n\s*\}\)\n\s*\}\);/,
  `const handleSaveChanges = async () => {
    try {
      await saveExpenses({
        financialYear: selectedYear,
        data: currentYearData.map(row => {
          const rowData: any = { head: row.head };
          MONTHS.forEach(m => {
            rowData[m] = parseFormattedNumber(row[m]);
          });
          return rowData;
        })
      });`
);

// 5. Update the Save button to show loading
content = content.replace(
  /<Button onClick=\{handleSaveChanges\} className="bg-emerald-600 hover:bg-emerald-700">/,
  `<Button onClick={handleSaveChanges} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">`
);
content = content.replace(
  /<Save className="w-4 h-4 mr-2" \/>\n\s*Save Changes/,
  `{isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("CorporateExpenses.tsx refactored successfully.");
