import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function clearDatabase() {
  try {
    console.log('🗑️  Limpando banco de dados para o teste real...');
    
    // Deleta mensagens primeiro devido à chave estrangeira
    await pool.query('DELETE FROM "Message"');
    console.log('✅ Mensagens removidas.');
    
    // Deleta os leads
    await pool.query('DELETE FROM "Lead"');
    console.log('✅ Leads removidos.');
    
    console.log('🚀 Banco de dados zerado com sucesso! Pronto para o teste via Ngrok.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao zerar banco:', err);
    process.exit(1);
  }
}

clearDatabase();
