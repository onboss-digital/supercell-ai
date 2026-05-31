import pkg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkLucro() {
  try {
    const res = await pool.query(`
      SELECT id, "nomeCliente", "produto", "valorTotal", "lucro", "createdAt" 
      FROM "Sale" 
      WHERE id = 5547592 OR "createdAt" >= '2026-05-20T00:00:00Z' AND "createdAt" <= '2026-05-21T00:00:00Z'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkLucro();
