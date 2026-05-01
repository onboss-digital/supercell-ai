import pkg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await pool.query('ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "canalVenda" TEXT');
    await pool.query('ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "tipoVenda" TEXT');
    console.log('Migração concluída: Colunas canalVenda e tipoVenda adicionadas.');
  } catch (err) {
    console.error('Erro na migração:', err);
  } finally {
    pool.end();
  }
}

migrate();
