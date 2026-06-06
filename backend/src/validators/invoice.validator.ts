import { z } from 'zod';

const invoiceItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().positive('Unit price must be positive'),
  gstAmount: z.number().min(0).optional(),
  totalPrice: z.number().positive('Total price must be positive'),
});

export const createInvoiceSchema = z.object({
  purchaseOrderId: z.string().min(1, 'Purchase Order ID is required'),
  vendorId: z.string().min(1, 'Vendor ID is required'),
  gstRate: z.number().min(0).max(100).optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
});

export const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID']).optional(),
  gstRate: z.number().min(0).max(100).optional(),
  items: z.array(invoiceItemSchema).optional(),
});
