import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
});

async function migrate() {
    console.log('🚀 Iniciando atualização segura do banco de dados...');
    try {
        // Adiciona colunas uma por uma, se não existirem
        await pool.query('ALTER TABLE "AiConfig" ADD COLUMN IF NOT EXISTS "markupPerUnit" DOUBLE PRECISION DEFAULT 0');
        await pool.query('ALTER TABLE "AiConfig" ADD COLUMN IF NOT EXISTS "targetConversionRate" DOUBLE PRECISION DEFAULT 0');
        await pool.query('ALTER TABLE "AiConfig" ADD COLUMN IF NOT EXISTS "cpaThreshold" DOUBLE PRECISION DEFAULT 0');
        await pool.query('ALTER TABLE "AiConfig" ADD COLUMN IF NOT EXISTS "ctrThreshold" DOUBLE PRECISION DEFAULT 0');
        await pool.query('ALTER TABLE "AiConfig" ADD COLUMN IF NOT EXISTS "weeklyMessageGoal" INTEGER DEFAULT 0');
        
        console.log('✅ Colunas de Metas de Negócio adicionadas com sucesso!');
        
        // Verifica se existe a linha default
        const check = await pool.query('SELECT id FROM "AiConfig" WHERE id = $1', ['default']);
        if (check.rows.length === 0) {
            console.log('ℹ️ Criando registro de configuração padrão...');
            await pool.query('INSERT INTO "AiConfig" (id, "systemPrompt") VALUES ($1, $2)', 
                ['default', 'Você é o Jarvis, um assistente estratégico especializado em gestão de tráfego pago e vendas de celulares.']);
        }
        
    } catch (err) {
        console.error('❌ Erro na migração SQL:', err.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

migrate();
