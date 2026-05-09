import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkMessages() {
  try {
    const res = await pool.query('SELECT * FROM "Message" WHERE mid NOT LIKE \'aWdf%\' ORDER BY "createdAt" DESC LIMIT 5');
    console.log('=== ÚLTIMAS MENSAGENS (NÃO-INSTAGRAM) ===');
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

checkMessages();
