import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AppError, QuotationComparisonResult } from '../types';
import { generateQuotationNumber, parsePagination, buildPaginationResponse } from '../utils/helpers';
import { logActivity, createNotification } from '../services/activity.service';

const prisma = new PrismaClient();

export async function getQuotations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, search, sortBy, sortOrder, status, rfqId } = req.query as any;
    const { page: p, limit: l, skip } = parsePagination(page, limit);

    const where: any = {};

    // Vendors can only see their own quotations
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
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (rfqId) where.rfqId = rfqId;

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        include: {
          rfq: {
            select: { id: true, rfqNumber: true, title: true, status: true, deadline: true },
          },
          vendor: {
            select: { id: true, companyName: true, email: true, rating: true },
          },
          items: {
            include: {
              rfqItem: true,
            },
          },
        },
        skip,
        take: l,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      }),
      prisma.quotation.count({ where }),
    ]);

    res.json({
      success: true,
      data: quotations,
      pagination: buildPaginationResponse(total, p, l),
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuotationById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        rfq: {
          include: {
            items: true,
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        vendor: {
          select: { id: true, companyName: true, contactName: true, email: true, phone: true, address: true, gstNumber: true, rating: true },
        },
        items: {
          include: {
            rfqItem: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!quotation) {
      throw new AppError('Quotation not found.', 404);
    }

    // Vendors can only see their own quotations
    if (req.user?.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.userId } });
      if (!vendor || vendor.id !== quotation.vendorId) {
        throw new AppError('You do not have access to this quotation.', 403);
      }
    }

    res.json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
}

export async function createQuotation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { rfqId, vendorId, deliveryDays, notes, items } = req.body;

    // Determine vendor ID
    let actualVendorId = vendorId;
    if (req.user.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendor) throw new AppError('Vendor profile not found.', 404);
      actualVendorId = vendor.id;
    }

    if (!actualVendorId) throw new AppError('Vendor ID is required.', 400);

    // Check RFQ exists and is published
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: { items: true, vendors: true },
    });

    if (!rfq) throw new AppError('RFQ not found.', 404);
    if (rfq.status !== 'PUBLISHED') throw new AppError('Quotations can only be submitted for published RFQs.', 400);

    // Check deadline
    if (new Date() > rfq.deadline) {
      throw new AppError('The deadline for this RFQ has passed.', 400);
    }

    // Check vendor is invited
    const isInvited = rfq.vendors.some((v) => v.vendorId === actualVendorId);
    if (!isInvited) throw new AppError('This vendor is not invited to this RFQ.', 403);

    // Check for existing quotation
    const existingQuotation = await prisma.quotation.findUnique({
      where: { rfqId_vendorId: { rfqId, vendorId: actualVendorId } },
    });
    if (existingQuotation) throw new AppError('A quotation has already been submitted for this RFQ by this vendor.', 409);

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);

    const quotationNumber = generateQuotationNumber();

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        rfqId,
        vendorId: actualVendorId,
        totalAmount,
        deliveryDays,
        notes: notes || null,
        status: 'DRAFT',
        items: {
          create: items.map((item: any) => ({
            rfqItemId: item.rfqItemId,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: {
        rfq: { select: { id: true, rfqNumber: true, title: true } },
        vendor: { select: { id: true, companyName: true } },
        items: { include: { rfqItem: true } },
      },
    });

    await logActivity(req.user.userId, 'CREATE_QUOTATION', 'Quotation', quotation.id, `Created quotation: ${quotationNumber}`);

    res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateQuotation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;
    const { deliveryDays, notes, items } = req.body;

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) throw new AppError('Quotation not found.', 404);
    if (existing.status !== 'DRAFT') throw new AppError('Only draft quotations can be edited.', 400);

    if (req.user.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendor || existing.vendorId !== vendor.id) {
        throw new AppError('You do not have permission to modify this quotation.', 403);
      }
    }

    const updateData: any = {};
    if (deliveryDays !== undefined) updateData.deliveryDays = deliveryDays;
    if (notes !== undefined) updateData.notes = notes;

    if (items) {
      await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
      await prisma.quotationItem.createMany({
        data: items.map((item: any) => ({
          quotationId: id,
          rfqItemId: item.rfqItemId,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      });
      updateData.totalAmount = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: updateData,
      include: {
        rfq: { select: { id: true, rfqNumber: true, title: true } },
        vendor: { select: { id: true, companyName: true } },
        items: { include: { rfqItem: true } },
      },
    });

    await logActivity(req.user.userId, 'UPDATE_QUOTATION', 'Quotation', id, `Updated quotation: ${quotation.quotationNumber}`);

    res.json({
      success: true,
      message: 'Quotation updated successfully',
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
}

export async function submitQuotation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
        rfq: { select: { id: true, rfqNumber: true, title: true, createdById: true } },
        vendor: { select: { id: true, companyName: true } },
      },
    });

    if (!quotation) throw new AppError('Quotation not found.', 404);
    if (quotation.status !== 'DRAFT') throw new AppError('Only draft quotations can be submitted.', 400);
    if (quotation.items.length === 0) throw new AppError('Quotation must have at least one item.', 400);

    if (req.user.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendor || quotation.vendorId !== vendor.id) {
        throw new AppError('You do not have permission to submit this quotation.', 403);
      }
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: 'SUBMITTED' },
      include: {
        rfq: { select: { id: true, rfqNumber: true, title: true } },
        vendor: { select: { id: true, companyName: true } },
        items: { include: { rfqItem: true } },
      },
    });

    // Update RFQ vendor status
    await prisma.rFQVendor.updateMany({
      where: { rfqId: quotation.rfqId, vendorId: quotation.vendorId },
      data: { status: 'QUOTED' },
    });

    // Notify RFQ creator
    await createNotification(
      quotation.rfq.createdById,
      'Quotation Received',
      `${quotation.vendor.companyName} has submitted a quotation for RFQ ${quotation.rfq.rfqNumber}`
    );

    await logActivity(req.user.userId, 'SUBMIT_QUOTATION', 'Quotation', id, `Submitted quotation: ${quotation.quotationNumber}`);

    res.json({
      success: true,
      message: 'Quotation submitted successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function compareQuotations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { rfqId } = req.params;

    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: { items: true },
    });

    if (!rfq) throw new AppError('RFQ not found.', 404);

    // Get all submitted quotations for this RFQ
    const quotations = await prisma.quotation.findMany({
      where: {
        rfqId,
        status: { in: ['SUBMITTED', 'ACCEPTED', 'REJECTED'] },
      },
      include: {
        vendor: {
          select: { id: true, companyName: true, rating: true, performanceScore: true, email: true },
        },
        items: {
          include: { rfqItem: true },
        },
      },
    });

    if (quotations.length === 0) {
      res.json({
        success: true,
        data: {
          rfq,
          comparisons: [],
          message: 'No submitted quotations found for comparison.',
        },
      });
      return;
    }

    // ============ WEIGHTED SCORING ALGORITHM ============
    // 40% Price (lowest gets highest score)
    // 30% Rating (highest gets highest score)
    // 20% Delivery (fastest gets highest score)
    // 10% Previous Performance (highest gets highest score)

    const WEIGHT_PRICE = 0.40;
    const WEIGHT_RATING = 0.30;
    const WEIGHT_DELIVERY = 0.20;
    const WEIGHT_PERFORMANCE = 0.10;

    // Find min/max values for normalization
    const prices = quotations.map((q) => q.totalAmount);
    const deliveries = quotations.map((q) => q.deliveryDays);
    const ratings = quotations.map((q) => q.vendor.rating);
    const performances = quotations.map((q) => q.vendor.performanceScore);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minDelivery = Math.min(...deliveries);
    const maxDelivery = Math.max(...deliveries);
    const maxRating = Math.max(...ratings) || 5;
    const maxPerformance = Math.max(...performances) || 100;

    const comparisons: QuotationComparisonResult[] = quotations.map((q) => {
      // Price score: inverse - lower price = higher score (0-100)
      let priceScore: number;
      if (maxPrice === minPrice) {
        priceScore = 100;
      } else {
        priceScore = ((maxPrice - q.totalAmount) / (maxPrice - minPrice)) * 100;
      }

      // Delivery score: inverse - fewer days = higher score (0-100)
      let deliveryScore: number;
      if (maxDelivery === minDelivery) {
        deliveryScore = 100;
      } else {
        deliveryScore = ((maxDelivery - q.deliveryDays) / (maxDelivery - minDelivery)) * 100;
      }

      // Rating score: direct - higher rating = higher score (0-100)
      const ratingScore = maxRating > 0 ? (q.vendor.rating / 5) * 100 : 50;

      // Performance score: direct (already 0-100)
      const performanceScoreValue = q.vendor.performanceScore || 50;

      // Calculate weighted total
      const totalScore =
        priceScore * WEIGHT_PRICE +
        ratingScore * WEIGHT_RATING +
        deliveryScore * WEIGHT_DELIVERY +
        performanceScoreValue * WEIGHT_PERFORMANCE;

      return {
        vendorId: q.vendor.id,
        vendorName: q.vendor.companyName,
        quotationId: q.id,
        totalAmount: q.totalAmount,
        deliveryDays: q.deliveryDays,
        rating: q.vendor.rating,
        performanceScore: q.vendor.performanceScore,
        priceScore: Math.round(priceScore * 100) / 100,
        ratingScore: Math.round(ratingScore * 100) / 100,
        deliveryScore: Math.round(deliveryScore * 100) / 100,
        performanceScoreWeighted: Math.round(performanceScoreValue * 100) / 100,
        totalScore: Math.round(totalScore * 100) / 100,
        rank: 0,
        isRecommended: false,
        items: q.items.map((item) => ({
          rfqItemName: item.rfqItem.itemName,
          rfqItemQuantity: item.rfqItem.quantity,
          rfqItemUnit: item.rfqItem.unit,
          expectedPrice: item.rfqItem.expectedPrice,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      };
    });

    // Sort by total score descending and assign ranks
    comparisons.sort((a, b) => b.totalScore - a.totalScore);
    comparisons.forEach((c, index) => {
      c.rank = index + 1;
      c.isRecommended = index === 0;
    });

    res.json({
      success: true,
      data: {
        rfq: {
          id: rfq.id,
          rfqNumber: rfq.rfqNumber,
          title: rfq.title,
          category: rfq.category,
          deadline: rfq.deadline,
          items: rfq.items,
        },
        weights: {
          price: WEIGHT_PRICE,
          rating: WEIGHT_RATING,
          delivery: WEIGHT_DELIVERY,
          performance: WEIGHT_PERFORMANCE,
        },
        comparisons,
        recommendedVendor: comparisons[0] || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuotation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) throw new AppError('Quotation not found.', 404);
    if (quotation.status !== 'DRAFT') throw new AppError('Only draft quotations can be deleted.', 400);

    if (req.user.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendor || quotation.vendorId !== vendor.id) {
        throw new AppError('You do not have permission to delete this quotation.', 403);
      }
    }

    await prisma.quotation.delete({ where: { id } });

    await logActivity(req.user.userId, 'DELETE_QUOTATION', 'Quotation', id, `Deleted quotation: ${quotation.quotationNumber}`);

    res.json({
      success: true,
      message: 'Quotation deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
