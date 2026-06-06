import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AppError } from '../types';
import { generatePONumber, parsePagination, buildPaginationResponse, calculateGST } from '../utils/helpers';
import { logActivity, createNotification } from '../services/activity.service';
import { generatePurchaseOrderPDF, POPdfData } from '../services/pdf.service';
import { sendEmail, buildPurchaseOrderEmail } from '../services/email.service';

const prisma = new PrismaClient();

export async function getPurchaseOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, search, sortBy, sortOrder, status } = req.query as any;
    const { page: p, limit: l, skip } = parsePagination(page, limit);

    const where: any = {};

    if (req.user?.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (vendor) {
        where.vendorId = vendor.id;
      } else {
        where.vendorId = 'non-existent-id';
      }
    }

    if (req.user?.role === 'MANAGER') {
      where.status = { in: ['APPROVED', 'SENT'] };
    }

    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          rfq: { select: { id: true, rfqNumber: true, title: true } },
          quotation: { select: { id: true, quotationNumber: true, totalAmount: true } },
          vendor: { select: { id: true, companyName: true, email: true, contactName: true } },
          items: true,
          _count: { select: { invoices: true } },
        },
        skip,
        take: l,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({
      success: true,
      data: purchaseOrders,
      pagination: buildPaginationResponse(total, p, l),
    });
  } catch (error) {
    next(error);
  }
}

export async function getPurchaseOrderById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        rfq: {
          include: {
            items: true,
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        quotation: {
          include: {
            items: { include: { rfqItem: true } },
          },
        },
        vendor: true,
        approval: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        items: true,
        invoices: true,
      },
    });

    if (!po) throw new AppError('Purchase order not found.', 404);

    if (req.user?.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendor || vendor.id !== po.vendorId) {
        throw new AppError('You do not have access to this purchase order.', 403);
      }
    }

    if (req.user?.role === 'MANAGER' && po.status === 'DRAFT') {
      throw new AppError('You do not have access to draft purchase orders.', 403);
    }

    res.json({
      success: true,
      data: po,
    });
  } catch (error) {
    next(error);
  }
}

export async function createPurchaseOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { rfqId, quotationId, vendorId, approvalId, items } = req.body;

    // Verify entities exist
    const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
    if (!rfq) throw new AppError('RFQ not found.', 404);

    const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } });
    if (!quotation) throw new AppError('Quotation not found.', 404);

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new AppError('Vendor not found.', 404);

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
    const { gstAmount, grandTotal } = calculateGST(subtotal);

    const poNumber = generatePONumber();

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        rfqId,
        quotationId,
        vendorId,
        approvalId: approvalId || null,
        subtotal,
        gstAmount,
        grandTotal,
        status: 'DRAFT',
        items: {
          create: items.map((item: any) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: {
        rfq: { select: { id: true, rfqNumber: true, title: true } },
        quotation: { select: { id: true, quotationNumber: true } },
        vendor: { select: { id: true, companyName: true, email: true } },
        items: true,
      },
    });

    await logActivity(req.user.userId, 'CREATE_PO', 'PurchaseOrder', po.id, `Created PO: ${poNumber}`);

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: po,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePurchaseOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;
    const { status, items } = req.body;

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: { select: { id: true, companyName: true, userId: true } } },
    });
    if (!existing) throw new AppError('Purchase order not found.', 404);

    const updateData: any = {};

    if (items && existing.status === 'DRAFT') {
      await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      await prisma.purchaseOrderItem.createMany({
        data: items.map((item: any) => ({
          purchaseOrderId: id,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      });
      const subtotal = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
      const { gstAmount, grandTotal } = calculateGST(subtotal);
      updateData.subtotal = subtotal;
      updateData.gstAmount = gstAmount;
      updateData.grandTotal = grandTotal;
    }

    if (status) {
      updateData.status = status;

      if (status === 'SENT') {
        // Notify vendor when PO is sent
        await createNotification(
          existing.vendor.userId,
          'New Purchase Order',
          `A purchase order ${existing.poNumber} has been issued to ${existing.vendor.companyName}.`
        );
      }
    }

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        rfq: { select: { id: true, rfqNumber: true, title: true } },
        quotation: { select: { id: true, quotationNumber: true } },
        vendor: { select: { id: true, companyName: true, email: true } },
        items: true,
      },
    });

    await logActivity(req.user.userId, 'UPDATE_PO', 'PurchaseOrder', id, `Updated PO: ${po.poNumber}${status ? ` - Status: ${status}` : ''}`);

    res.json({
      success: true,
      message: 'Purchase order updated successfully',
      data: po,
    });
  } catch (error) {
    next(error);
  }
}

export async function generatePOPdf(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: true,
      },
    });

    if (!po) throw new AppError('Purchase order not found.', 404);

    if (req.user?.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendor || vendor.id !== po.vendorId) {
        throw new AppError('You do not have access to this purchase order.', 403);
      }
    }

    if (req.user?.role === 'MANAGER' && po.status === 'DRAFT') {
      throw new AppError('You do not have access to draft purchase orders.', 403);
    }

    const pdfData: POPdfData = {
      poNumber: po.poNumber,
      date: po.createdAt.toLocaleDateString(),
      vendorName: po.vendor.companyName,
      vendorEmail: po.vendor.email,
      vendorAddress: po.vendor.address || '',
      vendorGst: po.vendor.gstNumber || '',
      items: po.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      subtotal: po.subtotal,
      gstAmount: po.gstAmount,
      grandTotal: po.grandTotal,
    };

    const pdfBuffer = await generatePurchaseOrderPDF(pdfData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${po.poNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

export async function sendPurchaseOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true, items: true },
    });

    if (!po) throw new AppError('Purchase order not found.', 404);

    // Generate PDF
    const pdfData: POPdfData = {
      poNumber: po.poNumber,
      date: po.createdAt.toLocaleDateString(),
      vendorName: po.vendor.companyName,
      vendorEmail: po.vendor.email,
      vendorAddress: po.vendor.address || '',
      vendorGst: po.vendor.gstNumber || '',
      items: po.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      subtotal: po.subtotal,
      gstAmount: po.gstAmount,
      grandTotal: po.grandTotal,
    };

    const pdfBuffer = await generatePurchaseOrderPDF(pdfData);

    // Send email to vendor
    await sendEmail({
      to: po.vendor.email,
      subject: `Purchase Order: ${po.poNumber}`,
      html: buildPurchaseOrderEmail(po.poNumber, po.vendor.companyName),
      attachments: [
        {
          filename: `${po.poNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    // Update status to SENT
    await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT' },
    });

    await createNotification(
      po.vendor.userId,
      'Purchase Order Received',
      `Purchase order ${po.poNumber} has been sent to you via email.`
    );

    await logActivity(req.user.userId, 'SEND_PO', 'PurchaseOrder', id, `Sent PO: ${po.poNumber} to ${po.vendor.email}`);

    res.json({
      success: true,
      message: `Purchase order sent to ${po.vendor.email} successfully`,
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePurchaseOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;

    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new AppError('Purchase order not found.', 404);
    if (po.status !== 'DRAFT') throw new AppError('Only draft purchase orders can be deleted.', 400);

    await prisma.purchaseOrder.delete({ where: { id } });

    await logActivity(req.user.userId, 'DELETE_PO', 'PurchaseOrder', id, `Deleted PO: ${po.poNumber}`);

    res.json({
      success: true,
      message: 'Purchase order deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
