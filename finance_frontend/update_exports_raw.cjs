const fs = require('fs');
const path = require('path');

const modules = ['budgeting', 'actual'];
const files = ['CorporateExpenses.tsx', 'Salary.tsx', 'BankCharges.tsx', 'Depreciation.tsx', 'Summary.tsx', 'RevenueDirectExpense.tsx'];
const basePath = path.join(__dirname, 'src', 'features');

modules.forEach(mod => {
  files.forEach(file => {
    const filePath = path.join(basePath, mod, 'pages', file);
    if (!fs.existsSync(filePath)) {
      console.log('Skipping', filePath);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Replace table_to_book(clone) or table_to_book(table) with { raw: true }
    if (content.includes('table_to_book(clone)') || content.includes('table_to_book(table)')) {
      content = content.replace(/table_to_book\((clone|table)\)/g, 'table_to_book($1, { raw: true })');
      fs.writeFileSync(filePath, content);
      console.log('Added raw: true to', filePath);
    }
  });
});
