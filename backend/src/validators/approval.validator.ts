import { z } from 'zod';

export const createApprovalSchema = z.object({
  rfqId: z.string().min(1, 'RFQ ID is required'),
  quotationId: z.string().min(1, 'Quotation ID is required'),
  comments: z.string().optional(),
});

export const updateApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  comments: z.string().optional(),
});
