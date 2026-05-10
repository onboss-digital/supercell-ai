import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clear() {
  try {
    console.log('🧹 Limpando banco de dados...');
    await pool.query('DELETE FROM "Message"');
    await pool.query('DELETE FROM "Lead"');
    console.log('✅ Banco de dados limpo com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao limpar:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

clear();
