const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("=== USERS ===");
  users.forEach(u => {
    console.log(`ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | IsActive: ${u.isActive}`);
  });

  const approvals = await prisma.approval.findMany();
  console.log("\n=== APPROVALS ===");
  approvals.forEach(a => {
    console.log(`ID: ${a.id} | RFQ: ${a.rfqId} | Quotation: ${a.quotationId} | ApproverId: ${a.approverId} | Status: ${a.status}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
