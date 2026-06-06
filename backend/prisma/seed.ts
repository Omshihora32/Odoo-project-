import { PrismaClient, Role, VendorCategory, VendorStatus, RFQStatus, RFQVendorStatus, QuotationStatus, ApprovalStatus, POStatus, InvoiceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('Start seeding...');

  // Clean existing data
  await prisma.notification.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.approval.deleteMany({});
  await prisma.quotationItem.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.rFQVendor.deleteMany({});
  await prisma.rFQItem.deleteMany({});
  await prisma.rFQ.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Database cleared.');

  // Create Users
  const adminPass = await hashPassword('admin123');
  const managerPass = await hashPassword('manager123');
  const procurementPass = await hashPassword('procurement123');
  const vendorPass = await hashPassword('vendor123');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@vendorbridge.com',
      password: adminPass,
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
      isActive: true,
      country: 'India',
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      email: 'manager1@vendorbridge.com',
      password: managerPass,
      firstName: 'John',
      lastName: 'Doe',
      role: Role.MANAGER,
      isActive: true,
      country: 'India',
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      email: 'manager2@vendorbridge.com',
      password: managerPass,
      firstName: 'Sarah',
      lastName: 'Smith',
      role: Role.MANAGER,
      isActive: true,
      country: 'USA',
    },
  });

  const procurement1 = await prisma.user.create({
    data: {
      email: 'procurement1@vendorbridge.com',
      password: procurementPass,
      firstName: 'David',
      lastName: 'Lee',
      role: Role.PROCUREMENT_OFFICER,
      isActive: true,
      country: 'India',
    },
  });

  const procurement2 = await prisma.user.create({
    data: {
      email: 'procurement2@vendorbridge.com',
      password: procurementPass,
      firstName: 'Emily',
      lastName: 'Wong',
      role: Role.PROCUREMENT_OFFICER,
      isActive: true,
      country: 'India',
    },
  });

  console.log('Staff users created.');

  // Create Vendors and their corresponding User accounts
  const vendorData = [
    { companyName: 'Acme Hardware Corp', email: 'vendor1@vendorbridge.com', contactName: 'Robert Baratheon', category: VendorCategory.IT_HARDWARE, rating: 4.8, score: 92 },
    { companyName: 'LogiSoft Technologies', email: 'vendor2@vendorbridge.com', contactName: 'Ned Stark', category: VendorCategory.IT_SOFTWARE, rating: 4.5, score: 88 },
    { companyName: 'Office Depot Solutions', email: 'vendor3@vendorbridge.com', contactName: 'Cersei Lannister', category: VendorCategory.OFFICE_SUPPLIES, rating: 4.2, score: 81 },
    { companyName: 'Steel & Raw Co', email: 'vendor4@vendorbridge.com', contactName: 'Daenerys Targaryen', category: VendorCategory.RAW_MATERIALS, rating: 4.9, score: 95 },
    { companyName: 'FastTrack Logistics', email: 'vendor5@vendorbridge.com', contactName: 'Jon Snow', category: VendorCategory.LOGISTICS, rating: 4.0, score: 78 },
  ];

  const vendors: any[] = [];

  for (const v of vendorData) {
    const user = await prisma.user.create({
      data: {
        email: v.email,
        password: vendorPass,
        firstName: v.contactName.split(' ')[0],
        lastName: v.contactName.split(' ')[1] || 'Vendor',
        role: Role.VENDOR,
        isActive: true,
        country: 'India',
      },
    });

    const vendor = await prisma.vendor.create({
      data: {
        companyName: v.companyName,
        gstNumber: `29AAAAA${Math.floor(1000 + Math.random() * 9000)}A1Z${Math.floor(Math.random() * 9)}`,
        category: v.category,
        contactName: v.contactName,
        email: v.email,
        phone: `+91 98765 ${Math.floor(10000 + Math.random() * 90000)}`,
        address: `${Math.floor(10 + Math.random() * 900)}, Industrial Area Phase II, Mumbai`,
        country: 'India',
        status: VendorStatus.ACTIVE,
        rating: v.rating,
        performanceScore: v.score,
        userId: user.id,
      },
    });

    vendors.push(vendor);
  }

  console.log('Vendors and vendor users created.');

  // Create RFQs
  // RFQ 1: Draft RFQ
  const rfq1 = await prisma.rFQ.create({
    data: {
      rfqNumber: 'RFQ-2606-0001',
      title: 'IT Hardware Procurement for New Hires',
      description: 'Laptops, monitors, and docks for engineering department expansion.',
      category: VendorCategory.IT_HARDWARE,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: RFQStatus.DRAFT,
      createdById: procurement1.id,
      items: {
        create: [
          { itemName: 'MacBook Pro 16" (M3 Max, 32GB, 1TB)', quantity: 10, unit: 'Units', expectedPrice: 250000 },
          { itemName: 'Dell UltraSharp 27" 4K Monitor', quantity: 15, unit: 'Units', expectedPrice: 40000 },
          { itemName: 'CalDigit TS4 Thunderbolt Dock', quantity: 10, unit: 'Units', expectedPrice: 25000 },
        ],
      },
      vendors: {
        create: [
          { vendorId: vendors[0].id, status: RFQVendorStatus.INVITED },
          { vendorId: vendors[2].id, status: RFQVendorStatus.INVITED },
        ],
      },
    },
  });

  // RFQ 2: Published RFQ (Open for quotations)
  const rfq2 = await prisma.rFQ.create({
    data: {
      rfqNumber: 'RFQ-2606-0002',
      title: 'Annual Office Stationery Supplies',
      description: 'Bulk order for paper reams, notebooks, pens, and desk organizer kits.',
      category: VendorCategory.OFFICE_SUPPLIES,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      status: RFQStatus.PUBLISHED,
      createdById: procurement1.id,
      items: {
        create: [
          { itemName: 'A4 Copier Paper Ream (75 GSM)', quantity: 200, unit: 'Reams', expectedPrice: 280 },
          { itemName: 'Premium Hardbound Notebooks', quantity: 100, unit: 'Units', expectedPrice: 150 },
          { itemName: 'Gel Pen Box (Blue, Pack of 50)', quantity: 20, unit: 'Boxes', expectedPrice: 300 },
        ],
      },
      vendors: {
        create: [
          { vendorId: vendors[0].id, status: RFQVendorStatus.INVITED },
          { vendorId: vendors[2].id, status: RFQVendorStatus.INVITED },
        ],
      },
    },
    include: { items: true },
  });

  // RFQ 3: Closed RFQ (Quotations submitted)
  const rfq3 = await prisma.rFQ.create({
    data: {
      rfqNumber: 'RFQ-2606-0003',
      title: 'Logistics Partner for Q3 Freight',
      description: 'Logistics services for inter-state transportation of finished goods.',
      category: VendorCategory.LOGISTICS,
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (closed)
      status: RFQStatus.CLOSED,
      createdById: procurement2.id,
      items: {
        create: [
          { itemName: 'Mumbai to Delhi 32ft Container Truck', quantity: 12, unit: 'Trips', expectedPrice: 65000 },
          { itemName: 'Mumbai to Chennai 20ft Container Truck', quantity: 8, unit: 'Trips', expectedPrice: 50000 },
        ],
      },
      vendors: {
        create: [
          { vendorId: vendors[4].id, status: RFQVendorStatus.QUOTED },
        ],
      },
    },
    include: { items: true },
  });

  console.log('RFQs created.');

  // Create Quotations
  // Quotation for RFQ 2 (Office Depot Solutions)
  const quotation1 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2606-0001',
      rfqId: rfq2.id,
      vendorId: vendors[2].id,
      totalAmount: 76000,
      deliveryDays: 5,
      notes: 'We can deliver these items within 5 business days. Pricing includes delivery charges.',
      status: QuotationStatus.SUBMITTED,
      items: {
        create: [
          { rfqItemId: rfq2.items[0].id, unitPrice: 270, totalPrice: 54000 },
          { rfqItemId: rfq2.items[1].id, unitPrice: 160, totalPrice: 16000 },
          { rfqItemId: rfq2.items[2].id, unitPrice: 300, totalPrice: 6000 },
        ],
      },
    },
  });

  // Quotation for RFQ 2 (Acme Hardware Corp)
  const quotation2 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2606-0002',
      rfqId: rfq2.id,
      vendorId: vendors[0].id,
      totalAmount: 73000,
      deliveryDays: 7,
      notes: 'Slightly longer delivery time but offering a lower price on Copier Paper.',
      status: QuotationStatus.SUBMITTED,
      items: {
        create: [
          { rfqItemId: rfq2.items[0].id, unitPrice: 250, totalPrice: 50000 },
          { rfqItemId: rfq2.items[1].id, unitPrice: 170, totalPrice: 17000 },
          { rfqItemId: rfq2.items[2].id, unitPrice: 300, totalPrice: 6000 },
        ],
      },
    },
  });

  // Quotation for RFQ 3 (FastTrack Logistics)
  const quotation3 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2606-0003',
      rfqId: rfq3.id,
      vendorId: vendors[4].id,
      totalAmount: 1140000,
      deliveryDays: 3,
      notes: 'All vehicles equipped with GPS tracking. Rates are final and inclusive of toll.',
      status: QuotationStatus.ACCEPTED,
      items: {
        create: [
          { rfqItemId: rfq3.items[0].id, unitPrice: 62000, totalPrice: 744000 },
          { rfqItemId: rfq3.items[1].id, unitPrice: 49500, totalPrice: 396000 },
        ],
      },
    },
  });

  console.log('Quotations created.');

  // Create Approvals
  const approval1 = await prisma.approval.create({
    data: {
      rfqId: rfq3.id,
      quotationId: quotation3.id,
      approverId: manager1.id,
      status: ApprovalStatus.APPROVED,
      comments: 'Recommended. Vendor has high performance rating and competitive pricing.',
    },
  });

  console.log('Approvals created.');

  // Create Purchase Orders
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2606-0001',
      rfqId: rfq3.id,
      quotationId: quotation3.id,
      vendorId: vendors[4].id,
      approvalId: approval1.id,
      subtotal: 1140000,
      gstAmount: 205200,
      grandTotal: 1345200,
      status: POStatus.SENT,
      items: {
        create: [
          { itemName: 'Mumbai to Delhi 32ft Container Truck', quantity: 12, unit: 'Trips', unitPrice: 62000, totalPrice: 744000 },
          { itemName: 'Mumbai to Chennai 20ft Container Truck', quantity: 8, unit: 'Trips', unitPrice: 49500, totalPrice: 396000 },
        ],
      },
    },
  });

  console.log('Purchase Orders created.');

  // Create Invoices
  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2606-0001',
      purchaseOrderId: po1.id,
      vendorId: vendors[4].id,
      subtotal: 1140000,
      gstRate: 18,
      gstAmount: 205200,
      grandTotal: 1345200,
      status: InvoiceStatus.PAID,
      items: {
        create: [
          { itemName: 'Mumbai to Delhi 32ft Container Truck', quantity: 12, unit: 'Trips', unitPrice: 62000, gstAmount: 133920, totalPrice: 877920 },
          { itemName: 'Mumbai to Chennai 20ft Container Truck', quantity: 8, unit: 'Trips', unitPrice: 49500, gstAmount: 71280, totalPrice: 467280 },
        ],
      },
    },
  });

  console.log('Invoices created.');

  // Create Activity Logs
  await prisma.activityLog.createMany({
    data: [
      { userId: admin.id, action: 'SEED', entity: 'System', details: 'Database seeded with sample data' },
      { userId: procurement1.id, action: 'CREATE_RFQ', entity: 'RFQ', entityId: rfq1.id, details: `Created RFQ ${rfq1.rfqNumber}` },
      { userId: procurement1.id, action: 'CREATE_RFQ', entity: 'RFQ', entityId: rfq2.id, details: `Created RFQ ${rfq2.rfqNumber}` },
      { userId: procurement1.id, action: 'PUBLISH_RFQ', entity: 'RFQ', entityId: rfq2.id, details: `Published RFQ ${rfq2.rfqNumber}` },
      { userId: vendors[2].userId, action: 'CREATE_QUOTATION', entity: 'Quotation', entityId: quotation1.id, details: `Submitted quotation ${quotation1.quotationNumber}` },
      { userId: vendors[0].userId, action: 'CREATE_QUOTATION', entity: 'Quotation', entityId: quotation2.id, details: `Submitted quotation ${quotation2.quotationNumber}` },
      { userId: manager1.id, action: 'APPROVE_QUOTATION', entity: 'Approval', entityId: approval1.id, details: `Approved quotation ${quotation3.quotationNumber} for RFQ ${rfq3.rfqNumber}` },
      { userId: procurement2.id, action: 'CREATE_PO', entity: 'PurchaseOrder', entityId: po1.id, details: `Generated Purchase Order ${po1.poNumber}` },
      { userId: procurement2.id, action: 'SEND_PO', entity: 'PurchaseOrder', entityId: po1.id, details: `Sent PO ${po1.poNumber} to vendor` },
      { userId: vendors[4].userId, action: 'CREATE_INVOICE', entity: 'Invoice', entityId: invoice1.id, details: `Generated Invoice ${invoice1.invoiceNumber} against PO ${po1.poNumber}` },
    ],
  });

  // Create Notifications
  await prisma.notification.createMany({
    data: [
      { userId: manager1.id, title: 'Pending Approval Request', message: `Quotation ${quotation3.quotationNumber} requires your approval.`, isRead: true },
      { userId: vendors[0].userId, title: 'New RFQ Invitation', message: `You have been invited to quote for RFQ ${rfq2.rfqNumber}: ${rfq2.title}`, isRead: false },
      { userId: vendors[2].userId, title: 'New RFQ Invitation', message: `You have been invited to quote for RFQ ${rfq2.rfqNumber}: ${rfq2.title}`, isRead: true },
      { userId: vendors[4].userId, title: 'Purchase Order Issued', message: `Purchase Order ${po1.poNumber} has been issued to you.`, isRead: true },
    ],
  });

  console.log('Activity logs and notifications created.');
  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
