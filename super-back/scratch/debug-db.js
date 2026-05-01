import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function debug() {
  try {
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'CompanyProfile';
    `);
    console.log('--- Table Structure ---');
    console.table(tableInfo.rows);

    const data = await pool.query('SELECT * FROM "CompanyProfile"');
    console.log('--- Table Data ---');
    console.log(data.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

debug();
