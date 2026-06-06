import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AppError } from '../types';
import { generateRFQNumber, parsePagination, buildPaginationResponse } from '../utils/helpers';
import { logActivity, createNotification } from '../services/activity.service';
import { sendEmail, buildRFQInvitationEmail } from '../services/email.service';

const prisma = new PrismaClient();

export async function getRFQs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, search, sortBy, sortOrder, status, category } = req.query as any;
    const { page: p, limit: l, skip } = parsePagination(page, limit);

    const where: any = {};

    // Vendors can only see published RFQs they're invited to
    if (req.user?.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (vendor) {
        where.vendors = { some: { vendorId: vendor.id } };
        where.status = { in: ['PUBLISHED', 'CLOSED'] };
      } else {
        where.vendors = { some: { vendorId: 'non-existent-id' } };
        where.status = { in: [] };
      }
    }

    if (search) {
      where.OR = [
        { rfqNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status && req.user?.role !== 'VENDOR') where.status = status;
    if (category) where.category = category;

    const [rfqs, total] = await Promise.all([
      prisma.rFQ.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          items: true,
          vendors: {
            include: {
              vendor: {
                select: { id: true, companyName: true, email: true, status: true },
              },
            },
          },
          quotations: {
            where: { status: 'ACCEPTED' },
            select: { id: true },
          },
          _count: {
            select: { quotations: true, approvals: true },
          },
        },
        skip,
        take: l,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      }),
      prisma.rFQ.count({ where }),
    ]);

    const mappedRFQs = rfqs.map((rfq) => {
      const { quotations, ...rest } = rfq;
      return {
        ...rest,
        hasAcceptedQuotation: quotations.length > 0,
      };
    });

    res.json({
      success: true,
      data: mappedRFQs,
      pagination: buildPaginationResponse(total, p, l),
    });
  } catch (error) {
    next(error);
  }
}

export async function getRFQById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        items: true,
        vendors: {
          include: {
            vendor: {
              select: { id: true, companyName: true, contactName: true, email: true, status: true, rating: true },
            },
          },
        },
        quotations: {
          include: {
            vendor: {
              select: { id: true, companyName: true, email: true },
            },
            items: {
              include: {
                rfqItem: true,
              },
            },
          },
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, firstName: true, lastName: true },
            },
            quotation: {
              select: { id: true, quotationNumber: true },
            },
          },
        },
        _count: {
          select: { quotations: true, purchaseOrders: true },
        },
      },
    });

    if (!rfq) {
      throw new AppError('RFQ not found.', 404);
    }

    // Vendors should only see their own quotations
    if (req.user?.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendor) {
        throw new AppError('Vendor profile not found.', 404);
      }
      const isInvited = rfq.vendors.some((v) => v.vendorId === vendor.id);
      if (!isInvited) {
        throw new AppError('You do not have access to this RFQ.', 403);
      }
      // Filter quotations to only show this vendor's
      (rfq as any).quotations = rfq.quotations.filter((q) => q.vendorId === vendor.id);
    }

    const hasAcceptedQuotation = rfq.quotations.some((q) => q.status === 'ACCEPTED');

    res.json({
      success: true,
      data: {
        ...rfq,
        hasAcceptedQuotation,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createRFQ(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { title, description, category, deadline, items, vendorIds } = req.body;

    const rfqNumber = generateRFQNumber();

    const rfq = await prisma.rFQ.create({
      data: {
        rfqNumber,
        title,
        description: description || null,
        category: category || 'OTHER',
        deadline: new Date(deadline),
        status: 'DRAFT',
        createdById: req.user.userId,
        items: {
          create: items.map((item: any) => ({
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            expectedPrice: item.expectedPrice || null,
          })),
        },
        ...(vendorIds && vendorIds.length > 0
          ? {
              vendors: {
                create: vendorIds.map((vendorId: string) => ({
                  vendorId,
                  status: 'INVITED',
                })),
              },
            }
          : {}),
      },
      include: {
        items: true,
        vendors: {
          include: {
            vendor: { select: { id: true, companyName: true, email: true } },
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await logActivity(req.user.userId, 'CREATE_RFQ', 'RFQ', rfq.id, `Created RFQ: ${rfqNumber} - ${title}`);

    res.status(201).json({
      success: true,
      message: 'RFQ created successfully',
      data: rfq,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRFQ(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;
    const { title, description, category, deadline, status, items, vendorIds } = req.body;

    const existing = await prisma.rFQ.findUnique({ where: { id } });
    if (!existing) throw new AppError('RFQ not found.', 404);

    // Check if this RFQ has an approved/accepted quotation
    const acceptedQuotation = await prisma.quotation.findFirst({
      where: {
        rfqId: id,
        status: 'ACCEPTED',
      },
    });
    if (acceptedQuotation) {
      throw new AppError('Cannot modify or cancel this RFQ because it has an approved quotation.', 400);
    }

    if (existing.status !== 'DRAFT' && status !== 'CANCELLED') {
      // Only allow limited updates on non-draft RFQs
      if (title || description || category || deadline || items) {
        throw new AppError('Cannot modify a published RFQ. Only status changes are allowed.', 400);
      }
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (deadline !== undefined) updateData.deadline = new Date(deadline);
    if (status !== undefined) updateData.status = status;

    // Update items if provided and RFQ is draft
    if (items && existing.status === 'DRAFT') {
      await prisma.rFQItem.deleteMany({ where: { rfqId: id } });
      await prisma.rFQItem.createMany({
        data: items.map((item: any) => ({
          rfqId: id,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          expectedPrice: item.expectedPrice || null,
        })),
      });
    }

    // Update vendor assignments
    if (vendorIds && existing.status === 'DRAFT') {
      await prisma.rFQVendor.deleteMany({ where: { rfqId: id } });
      if (vendorIds.length > 0) {
        await prisma.rFQVendor.createMany({
          data: vendorIds.map((vendorId: string) => ({
            rfqId: id,
            vendorId,
            status: 'INVITED' as const,
          })),
        });
      }
    }

    const rfq = await prisma.rFQ.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        vendors: {
          include: {
            vendor: { select: { id: true, companyName: true, email: true } },
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await logActivity(req.user.userId, 'UPDATE_RFQ', 'RFQ', id, `Updated RFQ: ${rfq.rfqNumber}`);

    res.json({
      success: true,
      message: 'RFQ updated successfully',
      data: rfq,
    });
  } catch (error) {
    next(error);
  }
}

export async function publishRFQ(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;
    const { vendorIds } = req.body;

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: { items: true, vendors: true },
    });

    if (!rfq) throw new AppError('RFQ not found.', 404);
    if (rfq.status !== 'DRAFT') throw new AppError('Only draft RFQs can be published.', 400);
    if (rfq.items.length === 0) throw new AppError('RFQ must have at least one item.', 400);

    // Add new vendors if provided
    if (vendorIds && vendorIds.length > 0) {
      const existingVendorIds = rfq.vendors.map((v) => v.vendorId);
      const newVendorIds = vendorIds.filter((vid: string) => !existingVendorIds.includes(vid));

      if (newVendorIds.length > 0) {
        await prisma.rFQVendor.createMany({
          data: newVendorIds.map((vendorId: string) => ({
            rfqId: id,
            vendorId,
            status: 'INVITED' as const,
          })),
        });
      }
    }

    const updatedRFQ = await prisma.rFQ.update({
      where: { id },
      data: { status: 'PUBLISHED' },
      include: {
        items: true,
        vendors: {
          include: {
            vendor: {
              select: { id: true, companyName: true, email: true, userId: true },
            },
          },
        },
      },
    });

    // Notify vendors
    for (const rfqVendor of updatedRFQ.vendors) {
      await createNotification(
        rfqVendor.vendor.userId,
        'New RFQ Invitation',
        `You have been invited to submit a quotation for RFQ ${updatedRFQ.rfqNumber}: ${updatedRFQ.title}`
      );

      // Send email
      await sendEmail({
        to: rfqVendor.vendor.email,
        subject: `New RFQ Invitation: ${updatedRFQ.rfqNumber}`,
        html: buildRFQInvitationEmail(
          updatedRFQ.rfqNumber,
          updatedRFQ.title,
          updatedRFQ.deadline.toLocaleDateString()
        ),
      });
    }

    await logActivity(req.user.userId, 'PUBLISH_RFQ', 'RFQ', id, `Published RFQ: ${updatedRFQ.rfqNumber}`);

    res.json({
      success: true,
      message: 'RFQ published successfully. Vendors have been notified.',
      data: updatedRFQ,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteRFQ(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;

    const rfq = await prisma.rFQ.findUnique({ where: { id } });
    if (!rfq) throw new AppError('RFQ not found.', 404);

    // Check if this RFQ has an approved/accepted quotation
    const acceptedQuotation = await prisma.quotation.findFirst({
      where: {
        rfqId: id,
        status: 'ACCEPTED'
      }
    });
    if (acceptedQuotation) {
      throw new AppError('Cannot delete or cancel this RFQ because it has an approved quotation.', 400);
    }

    if (rfq.status !== 'DRAFT') {
      // Cancel instead of delete for non-draft RFQs
      await prisma.rFQ.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await logActivity(req.user.userId, 'CANCEL_RFQ', 'RFQ', id, `Cancelled RFQ: ${rfq.rfqNumber}`);

      res.json({
        success: true,
        message: 'RFQ cancelled successfully',
      });
      return;
    }

    await prisma.rFQ.delete({ where: { id } });

    await logActivity(req.user.userId, 'DELETE_RFQ', 'RFQ', id, `Deleted RFQ: ${rfq.rfqNumber}`);

    res.json({
      success: true,
      message: 'RFQ deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
