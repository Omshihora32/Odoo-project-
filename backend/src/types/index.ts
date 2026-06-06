import { Role } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthRequest extends Request<any, any, any, any> {
  user?: JwtPayload;
  params: { [key: string]: string };
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardStats {
  totalVendors: number;
  activeRFQs: number;
  pendingApprovals: number;
  totalPurchaseOrders: number;
  totalInvoices: number;
  totalSpend: number;
  recentActivities: any[];
}

export interface QuotationComparisonResult {
  vendorId: string;
  vendorName: string;
  quotationId: string;
  totalAmount: number;
  deliveryDays: number;
  rating: number;
  performanceScore: number;
  priceScore: number;
  ratingScore: number;
  deliveryScore: number;
  performanceScoreWeighted: number;
  totalScore: number;
  rank: number;
  isRecommended: boolean;
  items: any[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
