import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findOpa() {
  try {
    const res = await pool.query('SELECT * FROM "Message" WHERE content = \'opa\' LIMIT 1');
    console.log('=== MENSAGEM OPA ===');
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

findOpa();
