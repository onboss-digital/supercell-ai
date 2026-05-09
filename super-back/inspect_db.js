import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ 
  connectionString: 'postgresql://postgres.jjxqvczeblhwgrdlrzgs:Amominhamae1234@@aws-1-sa-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const leads = await pool.query('SELECT id, name, "instagramHandle", "profilePic", "createdAt" FROM "Lead" ORDER BY "createdAt" DESC LIMIT 1');
    console.log('--- LATEST LEAD ---');
    console.log(JSON.stringify(leads.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

check();
