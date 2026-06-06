import { z } from 'zod';

const quotationItemSchema = z.object({
  rfqItemId: z.string().min(1, 'RFQ Item ID is required'),
  unitPrice: z.number().positive('Unit price must be positive'),
  totalPrice: z.number().positive('Total price must be positive'),
});

export const createQuotationSchema = z.object({
  rfqId: z.string().min(1, 'RFQ ID is required'),
  vendorId: z.string().optional(),
  deliveryDays: z.number().int().positive('Delivery days must be positive'),
  notes: z.string().optional(),
  items: z.array(quotationItemSchema).min(1, 'At least one item is required'),
});

export const updateQuotationSchema = z.object({
  deliveryDays: z.number().int().positive().optional(),
  notes: z.string().optional(),
  items: z.array(quotationItemSchema).optional(),
});

export const submitQuotationSchema = z.object({});
