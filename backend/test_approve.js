const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find a pending approval
  const pending = await prisma.approval.findFirst({
    where: { status: 'PENDING' },
    include: {
      quotation: {
        include: {
          vendor: { select: { id: true, companyName: true, userId: true } },
        },
      },
      rfq: { select: { id: true, rfqNumber: true, title: true, createdById: true } },
    }
  });

  if (!pending) {
    console.log("No pending approvals found!");
    return;
  }

  console.log("Found pending approval:", pending.id);

  // Let's run a dry run of the transaction/update
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const appr = await tx.approval.update({
        where: { id: pending.id },
        data: {
          status: 'APPROVED',
          comments: 'Test approval',
          approverId: 'b5f72415-ed11-4b1d-99c9-87d1e65181ab', // manager1 ID
        }
      });

      await tx.quotation.update({
        where: { id: pending.quotationId },
        data: { status: 'ACCEPTED' },
      });

      await tx.quotation.updateMany({
        where: {
          rfqId: pending.rfqId,
          id: { not: pending.quotationId },
          status: 'SUBMITTED',
        },
        data: { status: 'REJECTED' },
      });

      return appr;
    });

    console.log("Transaction completed successfully! Approved ID:", updated.id);
  } catch (err) {
    console.error("Transaction failed:", err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
