import pkg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query('SELECT * FROM "Sale"');
    console.log('Todas as vendas:', res.rows);
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    pool.end();
  }
}

check();
