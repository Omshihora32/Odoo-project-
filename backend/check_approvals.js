const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const approvals = await prisma.approval.findMany({
    include: {
      rfq: true,
      quotation: true,
      approver: true
    }
  });
  console.log('Approvals:');
  console.log(JSON.stringify(approvals, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
