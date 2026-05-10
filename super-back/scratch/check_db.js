
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.aiConfig.findFirst();
  console.log('--- DNA ATUAL DO JARVIS ---');
  console.log(config ? config.systemPrompt : 'Nenhuma configuração encontrada.');
  process.exit(0);
}

main();
