import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function readBrain() {
  try {
    const res = await pool.query('SELECT * FROM "AiConfig" WHERE id = $1', ['default']);
    console.log('--- CONFIGURAÇÃO DO CÉREBRO ---');
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error('❌ Erro ao ler cérebro:', err.message);
  } finally {
    process.exit();
  }
}

readBrain();
