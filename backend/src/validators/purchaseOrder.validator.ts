import { z } from 'zod';

const poItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().positive('Unit price must be positive'),
  totalPrice: z.number().positive('Total price must be positive'),
});

export const createPurchaseOrderSchema = z.object({
  rfqId: z.string().min(1, 'RFQ ID is required'),
  quotationId: z.string().min(1, 'Quotation ID is required'),
  vendorId: z.string().min(1, 'Vendor ID is required'),
  approvalId: z.string().optional(),
  items: z.array(poItemSchema).min(1, 'At least one item is required'),
});

export const updatePurchaseOrderSchema = z.object({
  status: z.enum(['DRAFT', 'APPROVED', 'SENT']).optional(),
  items: z.array(poItemSchema).optional(),
});
