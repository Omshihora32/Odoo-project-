// ========== User & Auth ==========
export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'manager' | 'procurement_officer' | 'vendor' | 'viewer';
  avatar?: string;
  phone?: string;
  department?: string;
  company?: string;
  country?: string;
  vendor?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  country?: string;
  department?: string;
  company?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

// ========== Vendor ==========
export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstNumber?: string;
  panNumber?: string;
  bankName?: string;
  bankAccount?: string;
  ifscCode?: string;
  category: string;
  rating: number;
  status: 'active' | 'inactive' | 'blacklisted';
  totalOrders: number;
  totalSpend: number;
  onTimeDelivery: number;
  qualityScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface VendorFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstNumber?: string;
  panNumber?: string;
  bankName?: string;
  bankAccount?: string;
  ifscCode?: string;
  category: string;
  status: string;
}

// ========== RFQ ==========
export interface RFQItem {
  id?: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  specifications?: string;
}

export interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'open' | 'closed' | 'cancelled' | 'awarded';
  items: RFQItem[];
  vendors: Vendor[];
  assignedVendorIds: string[];
  attachments: string[];
  deadline: string;
  estimatedBudget: number;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
  quotationCount: number;
}

export interface RFQFormData {
  title: string;
  description: string;
  category: string;
  priority: string;
  deadline: string;
  estimatedBudget: number;
  items: RFQItem[];
  assignedVendorIds: string[];
  attachments?: File[];
}

// ========== Quotation ==========
export interface QuotationItem {
  id?: string;
  rfqItemId: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  tax: number;
  discount: number;
  deliveryDays: number;
  notes?: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  rfqId: string;
  rfq: RFQ;
  vendorId: string;
  vendor: Vendor;
  items: QuotationItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  validUntil: string;
  deliveryTerms: string;
  paymentTerms: string;
  warranty?: string;
  notes?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'expired';
  score?: number;
  rank?: number;
  isRecommended?: boolean;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationFormData {
  rfqId: string;
  items: {
    rfqItemId: string;
    unitPrice: number;
    tax: number;
    discount: number;
    deliveryDays: number;
    notes?: string;
  }[];
  validUntil: string;
  deliveryTerms: string;
  paymentTerms: string;
  warranty?: string;
  notes?: string;
}

// ========== Approval ==========
export interface ApprovalStep {
  id: string;
  step: number;
  approverName: string;
  approverId: string;
  approver: User;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  actionDate?: string;
}

export interface Approval {
  id: string;
  referenceType: 'quotation' | 'purchase_order' | 'invoice';
  referenceId: string;
  referenceNumber: string;
  title: string;
  requestedBy: User;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  currentStep: number;
  steps: ApprovalStep[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

// ========== Purchase Order ==========
export interface POItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  tax: number;
  discount: number;
  hsnCode?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  rfqId?: string;
  quotationId?: string;
  vendor: Vendor;
  vendorId: string;
  items: POItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'sent' | 'acknowledged' | 'in_progress' | 'completed' | 'cancelled';
  paymentTerms: string;
  deliveryTerms: string;
  expectedDelivery: string;
  actualDelivery?: string;
  shippingAddress: string;
  billingAddress: string;
  notes?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

// ========== Invoice ==========
export interface InvoiceItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  hsnCode?: string;
  cgst: number;
  sgst: number;
  igst: number;
  cessAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  poId: string;
  purchaseOrder: PurchaseOrder;
  vendorId: string;
  vendor: Vendor;
  items: InvoiceItem[];
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  totalTax: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  status: 'draft' | 'sent' | 'received' | 'approved' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  transactionRef?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== Activity Log ==========
export interface ActivityLog {
  id: string;
  userId: string;
  user: User;
  action: string;
  module: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

// ========== Dashboard ==========
export interface DashboardStats {
  activeRFQs: number;
  pendingApprovals: number;
  totalSpend: number;
  activeVendors: number;
  rfqTrend: number;
  approvalTrend: number;
  spendTrend: number;
  vendorTrend: number;
}

export interface ProcurementOverview {
  id: string;
  type: string;
  reference: string;
  title: string;
  vendor: string;
  amount: number;
  status: string;
  date: string;
}

export interface SpendData {
  month: string;
  amount: number;
  budget: number;
}

export interface VendorPerformanceData {
  name: string;
  onTime: number;
  quality: number;
  cost: number;
  overall: number;
}

// ========== Reports ==========
export interface ReportData {
  procurementTrend: { month: string; orders: number; amount: number }[];
  spendByCategory: { category: string; amount: number; percentage: number }[];
  vendorRanking: { vendor: string; score: number; orders: number; spend: number; onTime: number }[];
  topVendors: { name: string; company: string; totalOrders: number; totalSpend: number; rating: number; onTimeRate: number }[];
  summary: {
    totalOrders: number;
    totalSpend: number;
    avgOrderValue: number;
    activeVendors: number;
    savingsAchieved: number;
    complianceRate: number;
  };
}

// ========== Notification ==========
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// ========== Pagination ==========
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  category?: string;
}
