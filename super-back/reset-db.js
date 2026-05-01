import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetLeads() {
  console.log('--- Iniciando limpeza de dados do CRM ---');
  try {
    // Remove todos os Leads
    const resLeads = await pool.query('DELETE FROM "Lead"');
    console.log(`Sucesso: ${resLeads.rowCount} leads removidos.`);
    
    // Remove todas as Vendas (Sale) para zerar o dashboard também
    const resSales = await pool.query('DELETE FROM "Sale"');
    console.log(`Sucesso: ${resSales.rowCount} vendas removidas.`);

    console.log('--- Sistema zerado e pronto para novos testes ---');
  } catch (err) {
    console.error('Erro ao zerar dados:', err);
  } finally {
    await pool.end();
  }
}

resetLeads();
