import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany();
  console.log('--- LEADS NO BANCO ---');
  leads.forEach(l => {
    console.log(`ID: ${l.id} | Nome: ${l.name} | Status: ${l.status}`);
  });
  console.log('--- FIM ---');
  await prisma.$disconnect();
}

main();
