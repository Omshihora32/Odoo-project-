import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AppError } from '../types';

const prisma = new PrismaClient();

export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { role, userId } = req.user;
    let vendorId: string | null = null;

    if (role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId } });
      if (vendor) {
        vendorId = vendor.id;
      }
    }

    // 0. Total Users
    const totalUsers = role === 'ADMIN' ? await prisma.user.count() : 0;

    // 1. Total Vendors
    const totalVendors = await prisma.vendor.count({
      where: role === 'VENDOR' ? { id: vendorId || undefined } : undefined,
    });

    // 2. Active RFQs
    const activeRFQsWhere: any = { status: 'PUBLISHED' };
    if (role === 'VENDOR' && vendorId) {
      activeRFQsWhere.vendors = { some: { vendorId } };
    }
    const activeRFQs = await prisma.rFQ.count({ where: activeRFQsWhere });

    // 3. Pending Approvals
    let pendingApprovals = 0;
    if (role !== 'VENDOR') {
      const approvalsWhere: any = { status: 'PENDING' };
      pendingApprovals = await prisma.approval.count({ where: approvalsWhere });
    }

    // 4. Total Purchase Orders
    const poWhere: any = {};
    if (role === 'VENDOR' && vendorId) {
      poWhere.vendorId = vendorId;
    }
    const totalPurchaseOrders = await prisma.purchaseOrder.count({ where: poWhere });

    // 5. Total Invoices
    const invoiceWhere: any = {};
    if (role === 'VENDOR' && vendorId) {
      invoiceWhere.vendorId = vendorId;
    }
    const totalInvoices = await prisma.invoice.count({ where: invoiceWhere });

    // 6. Total Spend
    const spendAggregate = await prisma.purchaseOrder.aggregate({
      _sum: {
        grandTotal: true,
      },
      where: role === 'VENDOR' && vendorId ? { vendorId } : { status: { in: ['APPROVED', 'SENT'] } },
    });
    const totalSpend = spendAggregate._sum.grandTotal || 0;

    // 7. Recent Activities
    const activityWhere: any = {};
    if (role === 'VENDOR') {
      activityWhere.userId = userId;
    }
    const recentActivities = await prisma.activityLog.findMany({
      where: activityWhere,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true, avatar: true },
        },
      },
    });

    // 8. Extra stats for role-specific widgets
    let vendorResponses = 0;
    let approvalRate = 100;
    let vendorStatus = 'PENDING';

    if (role !== 'VENDOR') {
      vendorResponses = await prisma.quotation.count({
        where: { status: { in: ['SUBMITTED', 'ACCEPTED', 'REJECTED'] } }
      });
    }

    if (role === 'MANAGER') {
      const [totalAppr, approvedAppr] = await Promise.all([
        prisma.approval.count({ where: { approverId: userId } }),
        prisma.approval.count({ where: { approverId: userId, status: 'APPROVED' } })
      ]);
      approvalRate = totalAppr > 0 ? Math.round((approvedAppr / totalAppr) * 100) : 100;
    }

    if (role === 'VENDOR' && vendorId) {
      const vendorRecord = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (vendorRecord) {
        vendorStatus = vendorRecord.status;
      }
    }

    res.json({
      success: true,
      data: {
        totalUsers,
        totalVendors,
        activeRFQs,
        pendingApprovals,
        totalPurchaseOrders,
        totalInvoices,
        totalSpend,
        recentActivities,
        vendorResponses,
        approvalRate,
        vendorStatus,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { role, userId } = req.user;
    let vendorId: string | null = null;

    if (role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId } });
      if (vendor) {
        vendorId = vendor.id;
      }
    }

    // 1. Spend Trend (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const poWhere: any = {
      createdAt: { gte: sixMonthsAgo },
    };
    if (role === 'VENDOR' && vendorId) {
      poWhere.vendorId = vendorId;
    } else {
      poWhere.status = { in: ['APPROVED', 'SENT'] };
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: poWhere,
      select: { grandTotal: true, createdAt: true },
    });

    // Group POs by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySpendMap: { [key: string]: number } = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthLabel = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthlySpendMap[monthLabel] = 0;
    }

    pos.forEach((po) => {
      const date = new Date(po.createdAt);
      const monthLabel = `${months[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      if (monthlySpendMap[monthLabel] !== undefined) {
        monthlySpendMap[monthLabel] += po.grandTotal;
      }
    });

    const spendTrend = Object.keys(monthlySpendMap).map((month) => ({
      month,
      spend: parseFloat(monthlySpendMap[month].toFixed(2)),
    }));

    // 2. Spend by Category
    const categoryWhere: any = {};
    if (role === 'VENDOR' && vendorId) {
      categoryWhere.vendorId = vendorId;
    } else {
      categoryWhere.status = { in: ['APPROVED', 'SENT'] };
    }

    const categoryPOs = await prisma.purchaseOrder.findMany({
      where: categoryWhere,
      include: {
        rfq: {
          select: { category: true },
        },
      },
    });

    const categorySpendMap: { [key: string]: number } = {};
    categoryPOs.forEach((po) => {
      const cat = po.rfq?.category || 'OTHER';
      categorySpendMap[cat] = (categorySpendMap[cat] || 0) + po.grandTotal;
    });

    const spendByCategory = Object.keys(categorySpendMap).map((category) => ({
      category,
      value: parseFloat(categorySpendMap[category].toFixed(2)),
    }));

    // 3. Vendor Performance list (for procurement/admin/managers)
    let vendorPerformance: any[] = [];
    if (role !== 'VENDOR') {
      const vendors = await prisma.vendor.findMany({
        select: {
          id: true,
          companyName: true,
          rating: true,
          performanceScore: true,
          category: true,
          status: true,
          _count: {
            select: { purchaseOrders: true },
          },
          purchaseOrders: {
            select: { grandTotal: true },
          },
        },
      });

      vendorPerformance = vendors.map((v) => {
        const totalSpend = v.purchaseOrders.reduce((sum, po) => sum + po.grandTotal, 0);
        return {
          id: v.id,
          companyName: v.companyName,
          rating: v.rating,
          performanceScore: v.performanceScore,
          category: v.category,
          status: v.status,
          totalOrders: v._count.purchaseOrders,
          totalSpend: parseFloat(totalSpend.toFixed(2)),
        };
      });
    }

    res.json({
      success: true,
      data: {
        spendTrend,
        spendByCategory,
        vendorPerformance,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function exportReports(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { format } = req.params;
    if (format !== 'csv' && format !== 'json') {
      throw new AppError('Format must be either csv or json.', 400);
    }

    const { role, userId } = req.user;
    let vendorId: string | null = null;

    if (role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId } });
      if (vendor) {
        vendorId = vendor.id;
      }
    }

    const poWhere: any = {};
    if (role === 'VENDOR' && vendorId) {
      poWhere.vendorId = vendorId;
    }

    // Gather report data (Purchase Orders filtered by role if VENDOR)
    const pos = await prisma.purchaseOrder.findMany({
      where: poWhere,
      include: {
        vendor: { select: { companyName: true, email: true } },
        rfq: { select: { rfqNumber: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const reportData = pos.map((po) => ({
      poNumber: po.poNumber,
      rfqNumber: po.rfq?.rfqNumber || 'N/A',
      category: po.rfq?.category || 'OTHER',
      vendor: po.vendor.companyName,
      vendorEmail: po.vendor.email,
      subtotal: po.subtotal,
      gstAmount: po.gstAmount,
      grandTotal: po.grandTotal,
      status: po.status,
      date: po.createdAt.toISOString().split('T')[0],
    }));

    if (format === 'json') {
      res.json({
        success: true,
        data: reportData,
      });
      return;
    }

    // Format is CSV
    let csv = 'PO Number,RFQ Number,Category,Vendor,Vendor Email,Subtotal,GST Amount,Grand Total,Status,Date\n';
    reportData.forEach((row) => {
      csv += `"${row.poNumber}","${row.rfqNumber}","${row.category}","${row.vendor.replace(/"/g, '""')}","${row.vendorEmail}",${row.subtotal},${row.gstAmount},${row.grandTotal},"${row.status}","${row.date}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=purchase_orders_report.csv');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}
