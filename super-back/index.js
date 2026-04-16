import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import pg from 'pg';
const { Pool } = pg;

// Configuração de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Configuração da conexão direta com o banco de dados via Supabase Pooler
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middlewares globais
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(morgan('dev'));

// ---------------------------------------------------------
// ROTAS E ENDPOINTS DA FASE 2
// ---------------------------------------------------------

// 1. Rota de Saúde (Garantir que a máquina está respirando)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    timestamp: new Date().toISOString(),
    service: 'Supercell AI API'
  });
});

// 2. Rota para Listar as BMs Cadastradas (Teste de Banco de Dados)
app.get('/api/bms', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "BusinessManager" ORDER BY "createdAt" DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar BusinessManagers:', err);
    res.status(500).json({ error: 'Erro interno na comunicação com o banco' });
  }
});

// 3. Rota Simples para Receber e Inserir um Novo Lead (Webhooks vão bater aqui no futuro)
app.post('/api/leads', async (req, res) => {
  const { name, phone, adAccountId } = req.body;
  
  if (!name || !phone || !adAccountId) {
    return res.status(400).json({ error: 'Os campos name, phone e adAccountId são obrigatórios.' });
  }

  try {
    const query = `
      INSERT INTO "Lead" (name, phone, "adAccountId", "updatedAt") 
      VALUES ($1, $2, $3, NOW()) 
      RETURNING *;
    `;
    const values = [name, phone, adAccountId];
    const result = await pool.query(query, values);
    
    res.status(201).json({ message: 'Lead capturado com sucesso!', lead: result.rows[0] });
  } catch (err) {
    console.error('Erro ao inserir Lead:', err);
    res.status(500).json({ error: 'Erro interno ao tentar salvar o Lead.' });
  }
});

// 4. Rota de Verificação de Webhook (Meta/Facebook)
// O Facebook enviará um GET para validar se somos nós mesmos.
app.get('/api/webhooks/meta', (req, res) => {
  const verify_token = process.env.META_VERIFY_TOKEN;
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      console.log('✅ WEBHOOK_VERIFIED');
      // O desafio (challenge) deve ser retornado em texto puro
      res.status(200).send(challenge);
    } else {
      console.error('❌ Token de verificação inválido');
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Parâmetros ausentes');
  }
});

// 5. Rota para Receber os Eventos e Relatórios do Facebook (Payloads em Tempo Real)
app.post('/api/webhooks/meta', (req, res) => {
  const body = req.body;

  // Verifica se é um evento válido do WhatsApp ou de Páginas (Lead Ads)
  if (body.object === 'page' || body.object === 'whatsapp_business_account') {
    
    // Regra número 1 dos Webhooks: Sempre retorne 200 OK imediatamente 
    // para que a Meta saiba que recebemos e não tente reenviar infinitamente.
    res.status(200).send('EVENT_RECEIVED');
    
    console.log('📩 Novo evento recebido da Meta:', JSON.stringify(body, null, 2));
    
    // TODO na Fase 3: Limpar esse body cru e transformar nos dados que a IA lerá,
    // e dar um INSERT/UPDATE na nossa tabela "Lead" e "Campaign".
    
  } else {
    res.sendStatus(404);
  }
});

// 6. Rota para Receber o Token da Contingência e Puxar as AdAccounts da Graph API
app.post('/api/bms', async (req, res) => {
  const { name, bmId, accessToken } = req.body;

  if (!name || !bmId || !accessToken) {
    return res.status(400).json({ error: 'Os campos name, bmId e accessToken são obrigatórios.' });
  }

  try {
    // 1. Bater na porta do Mark Zuckerberg (Meta Graph API)
    // O endpoint client_ad_accounts puxa todas as contas de anúncio compartilhadas/pertencentes à BM
    const url = `https://graph.facebook.com/v19.0/${bmId}/client_ad_accounts?fields=name,account_id,account_status&access_token=${accessToken}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('Erro retornado pela Meta:', data.error);
      return res.status(400).json({ error: 'Erro ao validar Token na Meta', details: data.error.message });
    }

    const fbAccounts = data.data || [];

    // 2. Salvar ou Atualizar a BM no nosso Banco de Dados
    const bmQuery = `
      INSERT INTO "BusinessManager" (id, name, "bmId", "accessToken", "updatedAt") 
      VALUES (gen_random_uuid(), $1, $2, $3, NOW()) 
      ON CONFLICT ("bmId") DO UPDATE SET "accessToken" = EXCLUDED."accessToken", "updatedAt" = NOW()
      RETURNING id;
    `;
    const bmResult = await pool.query(bmQuery, [name, bmId, accessToken]);
    const internalBmId = bmResult.rows[0].id;

    // 3. Laço de repetição: Salvar todas as contas de anúncio no banco
    const savedAccounts = [];
    for (const acc of fbAccounts) {
      // account_status 1 e 101 significam ativo na documentação da meta. Qualquer outro é block/inativo.
      const status = (acc.account_status === 1 || acc.account_status === 101) ? 'ACTIVE' : 'DISABLED';
      const actIdQuery = `
        INSERT INTO "AdAccount" (id, name, "actId", status, "bmId", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
        ON CONFLICT ("actId") DO UPDATE SET status = EXCLUDED.status, name = EXCLUDED.name, "updatedAt" = NOW()
        RETURNING *;
      `;
      // 'acc.account_id' vem como act_1234, nós podemos salvar só o número ou com 'act_'
      const accRes = await pool.query(actIdQuery, [acc.name || 'Conta sem nome', acc.account_id, status, internalBmId]);
      savedAccounts.push(accRes.rows[0]);
    }

    res.status(201).json({ 
      message: 'Contingência conectada com sucesso!', 
      bmId: internalBmId,
      accountsFound: savedAccounts.length,
      accounts: savedAccounts 
    });

  } catch (err) {
    console.error('Erro geral ao processar BM:', err);
    res.status(500).json({ error: 'Erro interno no servidor de contingência' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
