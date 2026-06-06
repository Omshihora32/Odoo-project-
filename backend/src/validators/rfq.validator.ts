import { z } from 'zod';

const rfqItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  expectedPrice: z.number().positive().optional(),
});

export const createRFQSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.enum([
    'IT_HARDWARE', 'IT_SOFTWARE', 'OFFICE_SUPPLIES', 'RAW_MATERIALS',
    'LOGISTICS', 'CONSULTING', 'MAINTENANCE', 'ELECTRICAL', 'CONSTRUCTION', 'OTHER',
  ]).optional(),
  deadline: z.string().min(1, 'Deadline is required'),
  items: z.array(rfqItemSchema).min(1, 'At least one item is required'),
  vendorIds: z.array(z.string()).optional(),
});

export const updateRFQSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum([
    'IT_HARDWARE', 'IT_SOFTWARE', 'OFFICE_SUPPLIES', 'RAW_MATERIALS',
    'LOGISTICS', 'CONSULTING', 'MAINTENANCE', 'ELECTRICAL', 'CONSTRUCTION', 'OTHER',
  ]).optional(),
  deadline: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED']).optional(),
  items: z.array(rfqItemSchema).optional(),
  vendorIds: z.array(z.string()).optional(),
});

export const publishRFQSchema = z.object({
  vendorIds: z.array(z.string()).min(1, 'At least one vendor must be selected'),
});
