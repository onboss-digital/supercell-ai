import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function clean() {
  try {
    // Apaga todas as análises de hoje para forçar o Jarvis a gerar uma nova com os dados da tela
    const res = await pool.query('DELETE FROM "DailyInsight" WHERE date >= CURRENT_DATE');
    console.log(`✅ Resultado: ${res.rowCount} análises antigas removidas. Memória do Jarvis resetada!`);
    
  } catch (err) {
    console.error('❌ Erro ao limpar memória:', err.message);
  } finally {
    process.exit();
  }
}

clean();
