import { v4 as uuidv4 } from 'uuid';

export function generateRFQNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RFQ-${year}${month}-${random}`;
}

export function generateQuotationNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `QT-${year}${month}-${random}`;
}

export function generatePONumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PO-${year}${month}-${random}`;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

export function generateUniqueId(): string {
  return uuidv4();
}

export function parsePagination(page?: string, limit?: string) {
  const p = Math.max(1, parseInt(page || '1', 10));
  const l = Math.min(100, Math.max(1, parseInt(limit || '10', 10)));
  return { page: p, limit: l, skip: (p - 1) * l };
}

export function buildPaginationResponse(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function formatCurrency(amount: number): string {
  return 'Rs. ' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function calculateGST(subtotal: number, gstRate: number = 18): { gstAmount: number; grandTotal: number } {
  const gstAmount = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
  const grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));
  return { gstAmount, grandTotal };
}
