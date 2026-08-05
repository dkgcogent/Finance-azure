const fs = require('fs');

const lines = fs.readFileSync('src/features/invoicing/pages/CustomerInvoice.tsx', 'utf8').split('\n');

let startIndex = -1;
let endIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{createStep === "preview" && (')) {
    startIndex = i + 1;
  }
  if (startIndex !== -1 && i >= startIndex) {
    if (lines[i].includes('              )') && lines[i+1] && lines[i+1].includes(')}')) {
      endIndex = i;
      break;
    }
  }
}

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find boundaries', startIndex, endIndex);
  process.exit(1);
}

const templateContent = lines.slice(startIndex, endIndex).join('\n');

const newComponent = `import React from 'react';

export interface InvoicePreviewTemplateProps {
  invoiceCustomer?: string;
  invoiceProject?: string;
  invoiceSubProject?: string;
  invoiceLocation?: string;
  invoiceType?: string;
}

export const InvoicePreviewTemplate: React.FC<InvoicePreviewTemplateProps> = ({
  invoiceCustomer,
  invoiceProject,
  invoiceSubProject,
  invoiceLocation,
  invoiceType
}) => {
  return (
    <>
${templateContent}
    </>
  );
};
`;

fs.mkdirSync('src/features/invoicing/components', { recursive: true });
fs.writeFileSync('src/features/invoicing/components/InvoicePreviewTemplate.tsx', newComponent);

const newCustomerInvoiceLines = [
  ...lines.slice(0, startIndex),
  '              <InvoicePreviewTemplate ',
  '                invoiceCustomer={invoiceCustomer}',
  '                invoiceProject={invoiceProject}',
  '                invoiceSubProject={invoiceSubProject}',
  '                invoiceLocation={invoiceLocation}',
  '                invoiceType={invoiceType}',
  '              />',
  ...lines.slice(endIndex)
];

let importAdded = false;
for (let i = 0; i < newCustomerInvoiceLines.length; i++) {
  if (newCustomerInvoiceLines[i].startsWith('import ') && !newCustomerInvoiceLines[i+1].startsWith('import ')) {
    newCustomerInvoiceLines.splice(i + 1, 0, 'import { InvoicePreviewTemplate } from "../components/InvoicePreviewTemplate";');
    importAdded = true;
    break;
  }
}

fs.writeFileSync('src/features/invoicing/pages/CustomerInvoice.tsx', newCustomerInvoiceLines.join('\n'));
console.log('Extraction complete.');
