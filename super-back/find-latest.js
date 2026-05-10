import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function findLatest() {
  try {
    const res = await pool.query('SELECT * FROM "Message" ORDER BY "createdAt" DESC LIMIT 1');
    console.log('=== MENSAGEM MAIS RECENTE ===');
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

findLatest();
