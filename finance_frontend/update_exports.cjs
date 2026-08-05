const fs = require('fs');
const path = require('path');

const modules = ['budgeting', 'actual'];
const files = ['CorporateExpenses.tsx', 'Salary.tsx', 'BankCharges.tsx', 'Depreciation.tsx'];
const basePath = path.join(__dirname, 'src', 'features');

modules.forEach(mod => {
  files.forEach(file => {
    const filePath = path.join(basePath, mod, 'pages', file);
    if (!fs.existsSync(filePath)) {
      console.log('Skipping', filePath);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Only apply if it contains an unimplemented Export button
    if (content.includes('<Button variant="outline" size="sm" className="h-8">') && content.includes('Export')) {
      // Add table id to first Table
      content = content.replace(
        /<Table className="/,
        `<Table id="export-table" className="`
      );

      // Replace Export button
      const exportBtnRegex = /<Button variant="outline" size="sm" className="h-8">\s*<Download className="mr-2 h-4 w-4" \/>\s*Export\s*<\/Button>/g;
      
      content = content.replace(exportBtnRegex, `<Button variant="outline" size="sm" className="h-8" onClick={() => {
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
                const wb = XLSX.utils.table_to_book(clone);
                XLSX.writeFile(wb, \`${file.replace('.tsx', '')}_${mod}_\${selectedYear}.xlsx\`);
              }
            });
          }}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>`);

      fs.writeFileSync(filePath, content);
      console.log('Updated', filePath);
    } else {
      console.log('Already updated or no match:', filePath);
    }
  });
});
