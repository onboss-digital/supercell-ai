import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fix() {
  console.log('--- MANUTENÇÃO JARVIS ---');
  
  // 1. Limpar todas as entradas antigas/fictícias
  await pool.query('DELETE FROM "DailyInsight"');
  console.log('✅ Histórico antigo removido com sucesso.');

  // 2. Verificar se o banco está limpo
  const res = await pool.query('SELECT count(*) FROM "DailyInsight"');
  console.log(`📊 Total de registros agora: ${res.rows[0].count}`);

  console.log('-------------------------');
  process.exit(0);
}

fix().catch(e => {
  console.error('❌ Erro na manutenção:', e.message);
  process.exit(1);
});
