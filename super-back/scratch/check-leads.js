import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkLeads() {
  try {
    const leadsCount = await pool.query('SELECT count(*) FROM "Lead"');
    console.log('Total Leads:', leadsCount.rows[0].count);
    
    if (leadsCount.rows[0].count > 0) {
        const sample = await pool.query('SELECT * FROM "Lead" LIMIT 5');
        console.log('Sample Leads:', sample.rows);
    }
  } catch (e) {
    console.error('ERRO:', e.message);
  } finally {
    process.exit();
  }
}
checkLeads();
