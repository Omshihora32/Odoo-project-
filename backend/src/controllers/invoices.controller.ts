import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AppError } from '../types';
import { generateInvoiceNumber, parsePagination, buildPaginationResponse, calculateGST } from '../utils/helpers';
import { logActivity, createNotification } from '../services/activity.service';
import { generateInvoicePDF, InvoicePdfData } from '../services/pdf.service';
import { sendEmail, buildInvoiceEmail } from '../services/email.service';

const prisma = new PrismaClient();

export async function getInvoices(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          purchaseOrder: {
            select: { id: true, poNumber: true, status: true },
          },
          vendor: {
            select: { id: true, companyName: true, email: true, contactName: true },
          },
          items: true,
        },
        skip,
        take: l,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: buildPaginationResponse(total, p, l),
    });
  } catch (error) {
    next(error);
  }
}

export async function getInvoiceById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            rfq: { select: { id: true, rfqNumber: true, title: true } },
            items: true,
          },
        },
        vendor: true,
        items: true,
      },
    });

    if (!invoice) throw new AppError('Invoice not found.', 404);

    if (req.user?.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendor || vendor.id !== invoice.vendorId) {
        throw new AppError('You do not have access to this invoice.', 403);
      }
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

export async function createInvoice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { purchaseOrderId, vendorId, gstRate, items } = req.body;

    let actualVendorId = vendorId;
    if (req.user.role === 'VENDOR') {
      const vendorUser = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendorUser) throw new AppError('Vendor profile not found.', 404);
      actualVendorId = vendorUser.id;
    }

    const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
    if (!po) throw new AppError('Purchase order not found.', 404);

    if (req.user.role === 'VENDOR' && po.vendorId !== actualVendorId) {
      throw new AppError('You do not have permission to invoice this purchase order.', 403);
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: actualVendorId } });
    if (!vendor) throw new AppError('Vendor not found.', 404);

    const rate = gstRate !== undefined ? gstRate : 18;
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0);
    const { gstAmount, grandTotal } = calculateGST(subtotal, rate);

    const invoiceNumber = generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        purchaseOrderId,
        vendorId,
        subtotal,
        gstRate: rate,
        gstAmount,
        grandTotal,
        status: 'DRAFT',
        items: {
          create: items.map((item: any) => {
            const itemGst = parseFloat(((item.unitPrice * item.quantity * rate) / 100).toFixed(2));
            return {
              itemName: item.itemName,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              gstAmount: item.gstAmount || itemGst,
              totalPrice: item.totalPrice || parseFloat((item.unitPrice * item.quantity + itemGst).toFixed(2)),
            };
          }),
        },
      },
      include: {
        purchaseOrder: { select: { id: true, poNumber: true } },
        vendor: { select: { id: true, companyName: true, email: true } },
        items: true,
      },
    });

    await logActivity(req.user.userId, 'CREATE_INVOICE', 'Invoice', invoice.id, `Created invoice: ${invoiceNumber}`);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateInvoice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;
    const { status, gstRate, items } = req.body;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw new AppError('Invoice not found.', 404);

    if (req.user?.role === 'VENDOR') {
      const vendorUser = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendorUser || existing.vendorId !== vendorUser.id) {
        throw new AppError('You do not have permission to modify this invoice.', 403);
      }
    }

    const updateData: any = {};

    if (items && existing.status === 'DRAFT') {
      const rate = gstRate !== undefined ? gstRate : existing.gstRate;
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await prisma.invoiceItem.createMany({
        data: items.map((item: any) => {
          const itemGst = parseFloat(((item.unitPrice * item.quantity * rate) / 100).toFixed(2));
          return {
            invoiceId: id,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            gstAmount: item.gstAmount || itemGst,
            totalPrice: item.totalPrice || parseFloat((item.unitPrice * item.quantity + itemGst).toFixed(2)),
          };
        }),
      });

      const subtotal = items.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0);
      const { gstAmount, grandTotal } = calculateGST(subtotal, rate);
      updateData.subtotal = subtotal;
      updateData.gstRate = rate;
      updateData.gstAmount = gstAmount;
      updateData.grandTotal = grandTotal;
    }

    if (gstRate !== undefined && !items) {
      updateData.gstRate = gstRate;
      const { gstAmount, grandTotal } = calculateGST(existing.subtotal, gstRate);
      updateData.gstAmount = gstAmount;
      updateData.grandTotal = grandTotal;
    }

    if (status) updateData.status = status;

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        purchaseOrder: { select: { id: true, poNumber: true } },
        vendor: { select: { id: true, companyName: true, email: true } },
        items: true,
      },
    });

    await logActivity(req.user.userId, 'UPDATE_INVOICE', 'Invoice', id, `Updated invoice: ${invoice.invoiceNumber}${status ? ` - Status: ${status}` : ''}`);

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

export async function generateInvoicePdf(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        purchaseOrder: { select: { poNumber: true } },
        vendor: true,
        items: true,
      },
    });

    if (!invoice) throw new AppError('Invoice not found.', 404);

    if (req.user?.role === 'VENDOR') {
      const vendorUser = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendorUser || invoice.vendorId !== vendorUser.id) {
        throw new AppError('You do not have access to this invoice PDF.', 403);
      }
    }

    const pdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.createdAt.toLocaleDateString(),
      vendorName: invoice.vendor.companyName,
      vendorEmail: invoice.vendor.email,
      vendorAddress: invoice.vendor.address || '',
      vendorGst: invoice.vendor.gstNumber || '',
      poNumber: invoice.purchaseOrder.poNumber,
      items: invoice.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        gstAmount: item.gstAmount,
        totalPrice: item.totalPrice,
      })),
      subtotal: invoice.subtotal,
      gstRate: invoice.gstRate,
      gstAmount: invoice.gstAmount,
      grandTotal: invoice.grandTotal,
    };

    const pdfBuffer = await generateInvoicePDF(pdfData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

export async function sendInvoiceEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        purchaseOrder: { select: { poNumber: true } },
        vendor: true,
        items: true,
      },
    });

    if (!invoice) throw new AppError('Invoice not found.', 404);

    const pdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.createdAt.toLocaleDateString(),
      vendorName: invoice.vendor.companyName,
      vendorEmail: invoice.vendor.email,
      vendorAddress: invoice.vendor.address || '',
      vendorGst: invoice.vendor.gstNumber || '',
      poNumber: invoice.purchaseOrder.poNumber,
      items: invoice.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        gstAmount: item.gstAmount,
        totalPrice: item.totalPrice,
      })),
      subtotal: invoice.subtotal,
      gstRate: invoice.gstRate,
      gstAmount: invoice.gstAmount,
      grandTotal: invoice.grandTotal,
    };

    const pdfBuffer = await generateInvoicePDF(pdfData);

    await sendEmail({
      to: invoice.vendor.email,
      subject: `Invoice: ${invoice.invoiceNumber}`,
      html: buildInvoiceEmail(invoice.invoiceNumber, invoice.vendor.companyName),
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    // Update status
    if (invoice.status === 'DRAFT') {
      await prisma.invoice.update({
        where: { id },
        data: { status: 'SENT' },
      });
    }

    await createNotification(
      invoice.vendor.userId,
      'Invoice Received',
      `Invoice ${invoice.invoiceNumber} has been sent to you via email.`
    );

    await logActivity(req.user.userId, 'SEND_INVOICE', 'Invoice', id, `Sent invoice: ${invoice.invoiceNumber} to ${invoice.vendor.email}`);

    res.json({
      success: true,
      message: `Invoice sent to ${invoice.vendor.email} successfully`,
    });
  } catch (error) {
    next(error);
  }
}

export async function printInvoice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          select: { poNumber: true },
        },
        vendor: true,
        items: true,
      },
    });

    if (!invoice) throw new AppError('Invoice not found.', 404);

    if (req.user?.role === 'VENDOR') {
      const vendorUser = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendorUser || invoice.vendorId !== vendorUser.id) {
        throw new AppError('You do not have access to print this invoice.', 403);
      }
    }

    // Return print-ready data
    res.json({
      success: true,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.createdAt.toLocaleDateString(),
        vendor: {
          companyName: invoice.vendor.companyName,
          contactName: invoice.vendor.contactName,
          email: invoice.vendor.email,
          phone: invoice.vendor.phone,
          address: invoice.vendor.address,
          gstNumber: invoice.vendor.gstNumber,
        },
        poNumber: invoice.purchaseOrder.poNumber,
        items: invoice.items,
        subtotal: invoice.subtotal,
        gstRate: invoice.gstRate,
        gstAmount: invoice.gstAmount,
        grandTotal: invoice.grandTotal,
        status: invoice.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteInvoice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new AppError('Invoice not found.', 404);
    if (invoice.status !== 'DRAFT') throw new AppError('Only draft invoices can be deleted.', 400);

    await prisma.invoice.delete({ where: { id } });

    await logActivity(req.user.userId, 'DELETE_INVOICE', 'Invoice', id, `Deleted invoice: ${invoice.invoiceNumber}`);

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
