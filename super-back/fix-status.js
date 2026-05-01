import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
  try {
    // Força o status ACTIVE em todas as contas que tenham o actId da Super Cell
    const res = await pool.query('UPDATE "AdAccount" SET status = \'ACTIVE\' WHERE "actId" = $1', ['888488439454577']);
    console.log(`✅ Resultado: ${res.rowCount} conta(s) ativada(s) com sucesso!`);
    
    // Verifica quantas contas ativas temos agora
    const check = await pool.query('SELECT name, status FROM "AdAccount" WHERE status = \'ACTIVE\'');
    console.log('--- CONTAS ATIVAS NO MOMENTO ---');
    check.rows.forEach(row => console.log(` - ${row.name}: ${row.status}`));
    
  } catch (err) {
    console.error('❌ Erro ao ativar conta:', err.message);
  } finally {
    process.exit();
  }
}

fix();
