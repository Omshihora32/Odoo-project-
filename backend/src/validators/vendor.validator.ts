import { z } from 'zod';

export const createVendorSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  gstNumber: z.string().optional(),
  category: z.enum([
    'IT_HARDWARE', 'IT_SOFTWARE', 'OFFICE_SUPPLIES', 'RAW_MATERIALS',
    'LOGISTICS', 'CONSULTING', 'MAINTENANCE', 'ELECTRICAL', 'CONSTRUCTION', 'OTHER',
  ]).optional(),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED', 'PENDING']).optional(),
  // For creating vendor with user account
  password: z.string().min(6).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const updateVendorSchema = z.object({
  companyName: z.string().min(1).optional(),
  gstNumber: z.string().optional(),
  category: z.enum([
    'IT_HARDWARE', 'IT_SOFTWARE', 'OFFICE_SUPPLIES', 'RAW_MATERIALS',
    'LOGISTICS', 'CONSULTING', 'MAINTENANCE', 'ELECTRICAL', 'CONSTRUCTION', 'OTHER',
  ]).optional(),
  contactName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED', 'PENDING']).optional(),
  rating: z.number().min(0).max(5).optional(),
  performanceScore: z.number().min(0).max(100).optional(),
});
