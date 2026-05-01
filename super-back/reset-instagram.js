import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetInstagramLeads() {
  console.log('--- Iniciando limpeza de leads do Instagram ---');
  try {
    // Remove apenas os leads que vieram do Instagram
    const res = await pool.query('DELETE FROM "Lead" WHERE platform = $1', ['instagram']);
    console.log(`Sucesso: ${res.rowCount} leads do Instagram removidos.`);
    console.log('--- CRM limpo para novo teste de Instagram ---');
  } catch (err) {
    console.error('Erro ao zerar dados do Instagram:', err);
  } finally {
    await pool.end();
  }
}

resetInstagramLeads();
