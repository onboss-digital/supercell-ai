import pg from 'pg';
import dotenv from 'dotenv';
import { runDailyJarvisAnalysis } from './index.js';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function maintain() {
  console.log('--- 🛠️ MANUTENÇÃO DO CÉREBRO JARVIS ---');
  
  try {
    // 1. Limpeza
    console.log('🧹 Limpando insights obsoletos...');
    const deleteRes = await pool.query('DELETE FROM "DailyInsight" WHERE date >= CURRENT_DATE');
    console.log(`✅ ${deleteRes.rowCount} registros removidos.`);

    // 2. Geração Forçada de Insight de Teste
    console.log('🧠 Gerando nova análise estratégica (Ontem -> Hoje)...');
    const insight = await runDailyJarvisAnalysis();
    
    console.log('\n--- 📝 INSIGHT GERADO ---');
    console.log(insight.content.substring(0, 300) + '...');
    console.log('\n✅ Cérebro validado e operando com dados reais!');

  } catch (err) {
    console.error('\n❌ ERRO NA MANUTENÇÃO:', err.message);
    if (err.message.includes('API key')) {
      console.log('💡 Dica: Verifique se a OPENAI_API_KEY no .env é válida.');
    }
  } finally {
    await pool.end();
    process.exit();
  }
}

maintain();
