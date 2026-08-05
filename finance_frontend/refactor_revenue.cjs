const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'features', 'budgeting', 'pages', 'RevenueDirectExpense.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
content = content.replace(
  /import \{ fetchAPI \} from "@\/lib\/api"\n/,
  `import { useRevenueQuery, useSaveRevenueMutation } from "../hooks/useRevenueData"\n`
);

// 2. Replace the massive useEffect fetchData block
content = content.replace(
  /useEffect\(\(\) => \{\n\s*const fetchData = async \(\) => \{\n[\s\S]*?fetchData\(\);\n\s*\}, \[selectedYear\]\);/,
  `const { data: serverData, isLoading: isQueryLoading } = useRevenueQuery(selectedYear);
  const { mutateAsync: saveRevenue, isPending: isSaving } = useSaveRevenueMutation();
  const isLoading = isQueryLoading;

  useEffect(() => {
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

// 3. Update handleSaveChanges
content = content.replace(
  /const handleSaveChanges = async \(\) => \{\n\s*try \{\n\s*await fetchAPI\('\/budget\/revenue-direct-expense', \{\n\s*method: 'POST',\n\s*body: JSON\.stringify\(\{\n\s*year: selectedYear,\n\s*groups\n\s*\}\)\n\s*\}\);/,
  `const handleSaveChanges = async () => {
    try {
      await saveRevenue({ financialYear: selectedYear, groups });`
);

// 4. Update the Save button to show loading
content = content.replace(
  /<Button onClick=\{handleSaveChanges\} className="bg-emerald-600 hover:bg-emerald-700">/,
  `<Button onClick={handleSaveChanges} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">`
);
content = content.replace(
  /<Save className="w-4 h-4 mr-2" \/>\n\s*Save Changes/,
  `{isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("RevenueDirectExpense.tsx refactored successfully.");
