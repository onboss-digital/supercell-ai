import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const accs = await pool.query('SELECT count(*) FROM "AdAccount"');
    const bms = await pool.query('SELECT count(*) FROM "BusinessManager"');
    const sales = await pool.query('SELECT count(*) FROM "Sale"');
    console.log('--- DB STATUS ---');
    console.log('AdAccounts:', accs.rows[0].count);
    console.log('BMs:', bms.rows[0].count);
    console.log('Sales:', sales.rows[0].count);
    
    if (accs.rows[0].count > 0) {
        const sample = await pool.query('SELECT * FROM "AdAccount" LIMIT 5');
        console.log('Sample Accs:', sample.rows);
    }
  } catch (e) {
    console.error('ERRO:', e.message);
  } finally {
    process.exit();
  }
}
check();
