// Utility functions to simulate auto-generation of sequence numbers

let currentInvoiceSequence = 1;
let currentCnDnSequence = 1;

/**
 * Generates an auto-incrementing invoice number
 * Format: INV-YYYYMM-XXXX
 */
export function generateInvoiceNumber(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const seq = String(currentInvoiceSequence++).padStart(4, '0');
  return `INV-${year}${month}-${seq}`;
}

/**
 * Generates an auto-incrementing Credit/Debit Note number
 * Format: CN-YYYY-XXXX or DN-YYYY-XXXX
 */
export function generateCnDnNumber(type: 'CN' | 'DN', date: Date = new Date()): string {
  const year = date.getFullYear();
  const seq = String(currentCnDnSequence++).padStart(4, '0');
  return `${type}-${year}-${seq}`;
}
