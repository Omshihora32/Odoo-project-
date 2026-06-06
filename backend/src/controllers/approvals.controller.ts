import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AppError } from '../types';
import { parsePagination, buildPaginationResponse } from '../utils/helpers';
import { logActivity, createNotification } from '../services/activity.service';

const prisma = new PrismaClient();

export async function getApprovals(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, status, sortBy, sortOrder } = req.query as any;
    const { page: p, limit: l, skip } = parsePagination(page, limit);

    const where: any = {};

    // Managers see all pending approvals or approvals in the queue

    if (status) where.status = status;

    const [approvals, total] = await Promise.all([
      prisma.approval.findMany({
        where,
        include: {
          rfq: {
            select: { id: true, rfqNumber: true, title: true, category: true },
          },
          quotation: {
            include: {
              vendor: {
                select: { id: true, companyName: true, email: true },
              },
              items: { include: { rfqItem: true } },
            },
          },
          approver: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        skip,
        take: l,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      }),
      prisma.approval.count({ where }),
    ]);

    res.json({
      success: true,
      data: approvals,
      pagination: buildPaginationResponse(total, p, l),
    });
  } catch (error) {
    next(error);
  }
}

export async function getApprovalById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const approval = await prisma.approval.findUnique({
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
        quotation: {
          include: {
            vendor: true,
            items: { include: { rfqItem: true } },
          },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!approval) {
      throw new AppError('Approval not found.', 404);
    }



    res.json({
      success: true,
      data: approval,
    });
  } catch (error) {
    next(error);
  }
}

export async function createApproval(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { rfqId, quotationId, comments } = req.body;

    // Verify RFQ and quotation exist
    const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
    if (!rfq) throw new AppError('RFQ not found.', 404);

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { vendor: { select: { companyName: true } } },
    });
    if (!quotation) throw new AppError('Quotation not found.', 404);
    if (quotation.status !== 'SUBMITTED') throw new AppError('Only submitted quotations can be sent for approval.', 400);

    // Find a manager to assign the approval to
    let approverId = req.user.userId;
    if (req.user.role !== 'MANAGER') {
      const manager = await prisma.user.findFirst({
        where: { role: 'MANAGER', isActive: true },
      });
      if (manager) {
        approverId = manager.id;
      }
    }

    const approval = await prisma.approval.create({
      data: {
        rfqId,
        quotationId,
        approverId,
        status: 'PENDING',
        comments: comments || null,
      },
      include: {
        rfq: { select: { id: true, rfqNumber: true, title: true } },
        quotation: {
          include: {
            vendor: { select: { id: true, companyName: true } },
          },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Notify approver
    await createNotification(
      approverId,
      'New Approval Request',
      `A quotation from ${quotation.vendor.companyName} for RFQ ${rfq.rfqNumber} requires your approval.`
    );

    await logActivity(req.user.userId, 'CREATE_APPROVAL', 'Approval', approval.id, `Created approval for quotation ${quotation.quotationNumber}`);

    res.status(201).json({
      success: true,
      message: 'Approval request created successfully',
      data: approval,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateApproval(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;
    const { status, comments } = req.body;

    const existing = await prisma.approval.findUnique({
      where: { id },
      include: {
        quotation: {
          include: {
            vendor: { select: { id: true, companyName: true, userId: true } },
          },
        },
        rfq: { select: { id: true, rfqNumber: true, title: true, createdById: true } },
      },
    });

    if (!existing) throw new AppError('Approval not found.', 404);
    if (existing.status !== 'PENDING') throw new AppError('This approval has already been processed.', 400);

    const approval = await prisma.approval.update({
      where: { id },
      data: {
        status,
        comments: comments || existing.comments,
        approverId: req.user.userId,
      },
      include: {
        rfq: { select: { id: true, rfqNumber: true, title: true } },
        quotation: {
          include: {
            vendor: { select: { id: true, companyName: true } },
          },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Update quotation status
    if (status === 'APPROVED') {
      await prisma.quotation.update({
        where: { id: existing.quotationId },
        data: { status: 'ACCEPTED' },
      });

      // Reject other quotations for this RFQ
      await prisma.quotation.updateMany({
        where: {
          rfqId: existing.rfqId,
          id: { not: existing.quotationId },
          status: 'SUBMITTED',
        },
        data: { status: 'REJECTED' },
      });

      // Notify vendor
      await createNotification(
        existing.quotation.vendor.userId,
        'Quotation Approved',
        `Your quotation for RFQ ${existing.rfq.rfqNumber} has been approved!`
      );

      // Notify RFQ creator
      await createNotification(
        existing.rfq.createdById,
        'Approval Completed',
        `The quotation from ${existing.quotation.vendor.companyName} for RFQ ${existing.rfq.rfqNumber} has been approved.`
      );
    } else if (status === 'REJECTED') {
      await prisma.quotation.update({
        where: { id: existing.quotationId },
        data: { status: 'REJECTED' },
      });

      // Notify vendor
      await createNotification(
        existing.quotation.vendor.userId,
        'Quotation Rejected',
        `Your quotation for RFQ ${existing.rfq.rfqNumber} has been rejected. ${comments ? 'Reason: ' + comments : ''}`
      );

      // Notify RFQ creator
      await createNotification(
        existing.rfq.createdById,
        'Approval Rejected',
        `The quotation from ${existing.quotation.vendor.companyName} for RFQ ${existing.rfq.rfqNumber} has been rejected.`
      );
    }

    await logActivity(
      req.user.userId,
      status === 'APPROVED' ? 'APPROVE_QUOTATION' : 'REJECT_QUOTATION',
      'Approval',
      id,
      `${status} quotation for RFQ ${existing.rfq.rfqNumber}`
    );

    res.json({
      success: true,
      message: `Approval ${status.toLowerCase()} successfully`,
      data: approval,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteApproval(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError('Authentication required.', 401);

    const { id } = req.params;

    const approval = await prisma.approval.findUnique({ where: { id } });
    if (!approval) throw new AppError('Approval not found.', 404);
    if (approval.status !== 'PENDING') throw new AppError('Only pending approvals can be deleted.', 400);

    await prisma.approval.delete({ where: { id } });

    await logActivity(req.user.userId, 'DELETE_APPROVAL', 'Approval', id, 'Deleted approval request');

    res.json({
      success: true,
      message: 'Approval deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
