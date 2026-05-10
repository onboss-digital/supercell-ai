import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ 
  connectionString: 'postgresql://postgres.jjxqvczeblhwgrdlrzgs:Amominhamae1234@@aws-1-sa-east-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query('DELETE FROM "Lead" WHERE phone = \'942467638526909\'');
    console.log('✅ Lead antigo removido com sucesso!');
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
