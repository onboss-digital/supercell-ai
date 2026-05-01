import pkg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixSale() {
  try {
    const res = await pool.query('UPDATE "Sale" SET "valorTotal" = 150.00 WHERE "valorTotal" IS NULL');
    console.log(`Sucesso! ${res.rowCount} venda(s) corrigida(s).`);
  } catch (err) {
    console.error('Erro ao corrigir:', err);
  } finally {
    pool.end();
  }
}

fixSale();
