import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Iniciando limpeza do Banco de Dados...');

  try {
    // Deleta mensagens primeiro (chave estrangeira)
    const deletedMessages = await prisma.message.deleteMany({});
    console.log(`✅ ${deletedMessages.count} mensagens deletadas.`);

    // Deleta os leads
    const deletedLeads = await prisma.lead.deleteMany({});
    console.log(`✅ ${deletedLeads.count} leads deletados.`);

    console.log('🚀 Banco de dados zerado com sucesso! Pronto para novos testes.');
  } catch (error) {
    console.error('❌ Erro ao limpar o banco:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
