import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: 'postgresql://postgres.jjxqvczeblhwgrdlrzgs:Amominhamae1234@@aws-1-sa-east-1.pooler.supabase.com:5432/postgres' });

async function check() {
  try {
    const bms = await pool.query('SELECT * FROM "BusinessManager"');
    console.log('BMs:', bms.rows.map(r => ({ name: r.name, bmId: r.bmId })));
    
    const accounts = await pool.query('SELECT * FROM "AdAccount"');
    console.log('AdAccounts:', accounts.rows.map(r => ({ name: r.name, actId: r.actId, status: r.status })));
    
    const leads = await pool.query('SELECT COUNT(*) FROM "Lead"');
    console.log('Total Leads:', leads.rows[0].count);
    
    const sales = await pool.query('SELECT COUNT(*) FROM "Sale"');
    console.log('Total Sales:', sales.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
