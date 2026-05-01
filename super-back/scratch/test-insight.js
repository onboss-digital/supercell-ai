import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres.jjxqvczeblhwgrdlrzgs:Amominhamae1234@@aws-1-sa-east-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  try {
    // 1. Limpa a tabela se estiver com erro
    console.log('Limpando tabela...');
    await pool.query('DROP TABLE IF EXISTS "DailyInsight"');

    // 2. Recria com a estrutura correta
    console.log('Recriando tabela...');
    await pool.query(`
      CREATE TABLE "DailyInsight" (
        "id" SERIAL PRIMARY KEY,
        "date" DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
        "content" TEXT NOT NULL,
        "metricsSummary" JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const mockContent = `Senhor Gustavo, analisei os dados das últimas 24 horas. Aqui estão suas diretrizes estratégicas:

Ontem tivemos um faturamento total de R$ 4.850,00, com 12 novos leads qualificados. O custo por lead caiu 15%, o que é excelente para o dia da semana.

🔴 A frequência de anúncios da Campanha 'Promo iPhones' atingiu 2.8. O público está saturando, sugiro renovar os criativos ou expandir o público amanhã.
🟢 O ROAS do conjunto de anúncios 'Público Quente - SP' atingiu 6.5. Recomendo aumentar o orçamento diário em R$ 100,00 imediatamente para escalar.
🔴 Recebemos 5 vendas pelo MercadoPhone que não estavam vinculadas a leads no CRM. Precisamos melhorar o tempo de primeira resposta no WhatsApp para capturar mais dados.

Estou de prontidão para ajustar a escala conforme sua ordem.`;

    console.log('Inserindo primeiro insight...');
    await pool.query(
      'INSERT INTO "DailyInsight" ("date", "content") VALUES (CURRENT_DATE, $1)',
      [mockContent]
    );
    console.log('✅ Tudo Pronto! Insight gerado e tabela corrigida.');
  } catch (err) {
    console.error('❌ Erro Crítico:', err.message);
  } finally {
    await pool.end();
  }
}

run();
