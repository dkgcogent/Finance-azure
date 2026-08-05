const fs = require('fs');
const file = 'CustomerInvoice.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
const newLines = [...lines.slice(0, 524), ...lines.slice(1214)];
fs.writeFileSync(file, newLines.join('\n'), 'utf8');
console.log('Fixed');
