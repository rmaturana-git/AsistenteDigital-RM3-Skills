import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        config: true
      }
    });
    console.log('---TENANTS_START---');
    console.log(JSON.stringify(tenants, null, 2));
    console.log('---TENANTS_END---');
  } catch (error) {
    console.error('Error fetching tenants:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
