import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AppError } from '../types';
import { hashPassword } from '../utils/hash';
import { parsePagination, buildPaginationResponse } from '../utils/helpers';
import { logActivity, createNotification } from '../services/activity.service';

const prisma = new PrismaClient();

export async function getVendors(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, search, sortBy, sortOrder, status, category } = req.query as any;
    const { page: p, limit: l, skip } = parsePagination(page, limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { gstNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'INACTIVE' };
    }
    if (category) where.category = category;

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              quotations: true,
              purchaseOrders: true,
            },
          },
        },
        skip,
        take: l,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      }),
      prisma.vendor.count({ where }),
    ]);

    res.json({
      success: true,
      data: vendors,
      pagination: buildPaginationResponse(total, p, l),
    });
  } catch (error) {
    next(error);
  }
}

export async function getVendorById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        quotations: {
          include: {
            rfq: { select: { id: true, rfqNumber: true, title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        purchaseOrders: {
          include: {
            rfq: { select: { id: true, rfqNumber: true, title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            quotations: true,
            purchaseOrders: true,
            invoices: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new AppError('Vendor not found.', 404);
    }

    if (req.user?.role === 'VENDOR') {
      const vendorUser = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendorUser || vendorUser.id !== vendor.id) {
        throw new AppError('You do not have permission to view other vendor profiles.', 403);
      }
    }

    res.json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
}

export async function createVendor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      companyName, gstNumber, category, contactName, email,
      phone, address, country, status, password, firstName, lastName,
    } = req.body;

    // Check if vendor email already exists
    const existingVendor = await prisma.vendor.findFirst({ where: { email } });
    if (existingVendor) {
      throw new AppError('A vendor with this email already exists.', 409);
    }

    // Create user account for the vendor
    const existingUser = await prisma.user.findUnique({ where: { email } });
    let userId: string;

    if (existingUser) {
      if (existingUser.role !== 'VENDOR') {
        throw new AppError('This email is already associated with a non-vendor account.', 409);
      }
      userId = existingUser.id;
    } else {
      const hashedPassword = await hashPassword(password || 'vendor123');
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: firstName || contactName.split(' ')[0] || 'Vendor',
          lastName: lastName || contactName.split(' ').slice(1).join(' ') || 'User',
          phone: phone || null,
          role: 'VENDOR',
          country: country || null,
        },
      });
      userId = user.id;
    }

    const vendor = await prisma.vendor.create({
      data: {
        companyName,
        gstNumber: gstNumber || null,
        category: category || 'OTHER',
        contactName,
        email,
        phone: phone || null,
        address: address || null,
        country: country || null,
        status: status || 'PENDING',
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (req.user) {
      await logActivity(req.user.userId, 'CREATE_VENDOR', 'Vendor', vendor.id, `Created vendor: ${companyName}`);
    }

    await createNotification(userId, 'Welcome to VendorBridge', `Your vendor account for ${companyName} has been created.`);

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateVendor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const {
      companyName, gstNumber, category, contactName, email,
      phone, address, country, status, rating, performanceScore,
    } = req.body;

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Vendor not found.', 404);
    }

    if (req.user?.role === 'VENDOR') {
      const vendorUser = await prisma.vendor.findUnique({ where: { userId: req.user.userId } });
      if (!vendorUser || vendorUser.id !== existing.id) {
        throw new AppError('You do not have permission to update other vendor profiles.', 403);
      }
      // Strip fields that VENDOR shouldn't update
      delete req.body.status;
      delete req.body.rating;
      delete req.body.performanceScore;
      delete req.body.category;
    }

    const updateData: any = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
    if (category !== undefined && req.user?.role !== 'VENDOR') updateData.category = category;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (country !== undefined) updateData.country = country;
    if (status !== undefined && req.user?.role !== 'VENDOR') updateData.status = status;
    if (rating !== undefined && req.user?.role !== 'VENDOR') updateData.rating = rating;
    if (performanceScore !== undefined && req.user?.role !== 'VENDOR') updateData.performanceScore = performanceScore;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (req.user) {
      await logActivity(req.user.userId, 'UPDATE_VENDOR', 'Vendor', id, `Updated vendor: ${vendor.companyName}`);
    }

    res.json({
      success: true,
      message: 'Vendor updated successfully',
      data: vendor,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteVendor(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      throw new AppError('Vendor not found.', 404);
    }

    let isHardDeleted = false;
    try {
      // Deleting the User will cascade delete the Vendor record due to schema onDelete: Cascade
      await prisma.user.delete({
        where: { id: vendor.userId },
      });
      isHardDeleted = true;

      if (req.user) {
        await logActivity(req.user.userId, 'DELETE_VENDOR', 'Vendor', id, `Permanently deleted vendor and user account: ${vendor.companyName}`);
      }
    } catch (dbError) {
      // Fallback: If there are existing transaction references, perform a soft delete instead
      await prisma.vendor.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });

      await prisma.user.update({
        where: { id: vendor.userId },
        data: { isActive: false },
      });

      if (req.user) {
        await logActivity(req.user.userId, 'DELETE_VENDOR', 'Vendor', id, `Soft deleted (deactivated) vendor: ${vendor.companyName}`);
      }
    }

    res.json({
      success: true,
      message: isHardDeleted ? 'Vendor permanently deleted' : 'Vendor deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
}
