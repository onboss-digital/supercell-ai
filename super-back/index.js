import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import pg from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { generateAiInsights, generateJarvisChatResponse } from './aiService.js';
import cron from 'node-cron';
import multer from 'multer';
const { Pool } = pg;

// CONFIGURAÇÃO DE SEGURANÇA (AES-256)
const algorithm = 'aes-256-cbc';
const encryptionKey = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'supercell_ai_default_secret_key_2026', 'salt', 32);

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text || !text.includes(':')) return text; // Fallback para migração suave
  try {
    const [ivHex, encryptedText] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, encryptionKey, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('❌ Erro na decriptação de token:', e.message);
    return text;
  }
}

dotenv.config();

// ESCUDO GLOBAL CONTRA QUEDAS (Resiliência do Servidor)
process.on('uncaughtException', (err) => {
  console.error('CRITICAL ERROR (Uncaught):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

const app = express();
const PORT = process.env.PORT || 3005;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Inicialização de Tabelas
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Sale" (
        "id" SERIAL PRIMARY KEY,
        "telefoneCliente" TEXT,
        "valorTotal" DECIMAL(10,2),
        "canalVenda" TEXT,
        "tipoVenda" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "DailyInsight" (
        "id" SERIAL PRIMARY KEY,
        "date" DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
        "content" TEXT NOT NULL,
        "metricsSummary" JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "CompanyProfile" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT DEFAULT 'Supercell AI Store',
        "timezone" TEXT DEFAULT 'UTC-3',
        "currency" TEXT DEFAULT 'BRL',
        "logoUrl" TEXT,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query('ALTER TABLE "CompanyProfile" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "TeamMember" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "role" TEXT DEFAULT 'Analista',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id" SERIAL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "status" TEXT DEFAULT 'Pago',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "SalesGoal" (
        "id" TEXT PRIMARY KEY,
        "dailySalesGoal" INTEGER DEFAULT 0,
        "dailyLeadsGoal" INTEGER DEFAULT 0,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "SecuritySettings" (
        "id" TEXT PRIMARY KEY,
        "twoFactorEnabled" BOOLEAN DEFAULT false,
        "lastPasswordChange" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "OnboardingState" (
        "id" TEXT PRIMARY KEY,
        "is_dismissed" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Inserir dados iniciais se não existirem
    await pool.query('INSERT INTO "SecuritySettings" (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', ['default']);
    await pool.query('INSERT INTO "OnboardingState" (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', ['default']);
    await pool.query('INSERT INTO "SalesGoal" (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', ['default']);

    const invoiceCheck = await pool.query('SELECT id FROM "Invoice" LIMIT 1');
    if (invoiceCheck.rows.length === 0) {
      await pool.query('INSERT INTO "Invoice" (date, value, status) VALUES ($1, $2, $3)', ['15/04/2026', '497,00', 'Pago']);
      await pool.query('INSERT INTO "Invoice" (date, value, status) VALUES ($1, $2, $3)', ['15/03/2026', '497,00', 'Pago']);
    }

    console.log('✅ Banco de Dados Preparado.');
  } catch (err) {
    console.error('❌ Erro ao inicializar banco:', err);
  }
};
initDb();


app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Rota de Saúde
app.get('/health', (req, res) => res.json({ status: 'online', db: 'connected' }));

// ---------------------------------------------------------
// WHATSAPP WEBHOOK (META CLOUD API)
// ---------------------------------------------------------

// 1. Verificação do Webhook (Necessário para a Meta configurar)
app.get('/api/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      console.log('✅ Webhook WhatsApp Verificado!');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// 2. Recebimento de Mensagens/Leads
app.post('/api/webhooks/whatsapp', async (req, res) => {
  const body = req.body;
  console.log('[META WEBHOOK] Payload Recebido:', JSON.stringify(body, null, 2));

  // --- LÓGICA INSTAGRAM DIRECT ---
  if (body.object === 'instagram') {
    try {
      const entry = body.entry[0];
      if (entry.messaging && entry.messaging[0]) {
        const msg = entry.messaging[0];
        const igSenderId = msg.sender.id;
        
        // Verifica se lead já existe (usamos o ID do IG como identificador único no campo "phone")
        const existing = await pool.query('SELECT id FROM "Lead" WHERE phone = $1', [igSenderId]);
        if (existing.rows.length > 0) return res.sendStatus(200);

        let name = `IG User ${igSenderId.slice(-4)}`;
        let adName = 'Orgânico / Direct';
        let campaignName = 'Instagram Direct';
        let adsetName = 'Inbound';

        // Tenta buscar o nome real do usuário IG via Graph API
        try {
          const userUrl = `https://graph.facebook.com/v19.0/${igSenderId}?fields=name&access_token=${process.env.META_ACCESS_TOKEN}`;
          const userRes = await fetch(userUrl).then(r => r.json());
          if (userRes.name) name = userRes.name;
        } catch(e) { console.error('[META WEBHOOK] Erro perfil IG:', e.message); }

        const accountRes = await pool.query('SELECT id FROM "AdAccount" WHERE status = \'ACTIVE\' LIMIT 1');
        const targetAccountId = accountRes.rows[0]?.id;

        if (targetAccountId) {
          await pool.query(
            'INSERT INTO "Lead" (id, name, phone, status, "adAccountId", "adName", "adsetName", "campaignName", "platform", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, \'Novo\', $3, $4, $5, $6, \'instagram\', NOW(), NOW())',
            [name, igSenderId, targetAccountId, adName, adsetName, campaignName]
          );
          console.log(`✅ Novo Lead Instagram Salvo: ${name} (ID: ${igSenderId})`);
        }
      }
      return res.sendStatus(200);
    } catch (err) {
      console.error('[META WEBHOOK] Erro Instagram:', err);
      return res.sendStatus(500);
    }
  }

  // --- LÓGICA WHATSAPP BUSINESS ---
  if (body.object === 'whatsapp_business_account' || (body.entry && body.entry[0]?.changes)) {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value || !value.messages) return res.sendStatus(200);

      const message = value.messages[0];
      const contact = value.contacts?.[0];
      const phone = message.from;
      const name = contact?.profile?.name || 'Cliente WhatsApp';

      // Atribuição de Origem (Referral de Anúncio)
      let detectedAdId = null;
      let adName = 'Direto/WhatsApp';
      let campaignName = 'Sem Campanha';
      let adsetName = 'Sem Conjunto';

      if (message.referral) {
        detectedAdId = message.referral.source_id;
        console.log(`[WA WEBHOOK] Lead vindo do anúncio: ${detectedAdId}`);
        
        try {
          const adDetailUrl = `https://graph.facebook.com/v19.0/${detectedAdId}?fields=name,campaign{name},adset{name}&access_token=${process.env.META_ACCESS_TOKEN}`;
          const adDetailRes = await fetch(adDetailUrl).then(r => r.json());
          if (adDetailRes.name) {
            adName = adDetailRes.name;
            campaignName = adDetailRes.campaign?.name || 'Campanha Direta';
            adsetName = adDetailRes.adset?.name || 'Conjunto Direto';
            console.log(`[WA WEBHOOK] Detalhes resolvidos: ${adName} | ${adsetName} | ${campaignName}`);
          }
        } catch (e) {
          console.error('[WA WEBHOOK] Erro ao resolver detalhes do anúncio:', e.message);
          adName = message.referral.headline || 'Anúncio sem nome';
          campaignName = 'Origem: WhatsApp Referral';
          adsetName = 'Conjunto: Inbox/Direto';
        }
      }

      // Lógica de Atribuição de Conta
      let targetAccountId = null;
      const accountRes = await pool.query('SELECT id FROM "AdAccount" WHERE status = \'ACTIVE\' LIMIT 1');
      if (accountRes.rows.length > 0) {
        targetAccountId = accountRes.rows[0].id;
      }

      if (targetAccountId) {
        await pool.query(
          'INSERT INTO "Lead" (id, name, phone, status, "adAccountId", "adName", "adsetName", "campaignName", "platform", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, \'Novo\', $3, $4, $5, $6, \'whatsapp\', NOW(), NOW())',
          [name, phone, targetAccountId, adName, adsetName, campaignName]
        );
        console.log(`✅ Novo Lead WhatsApp Salvo: ${name} (${phone}) - Anúncio: ${adName}`);
      }
      
      res.sendStatus(200);
    } catch (err) {
      console.error('❌ Erro no Webhook WhatsApp:', err);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(200);
  }
});

// ---------------------------------------------------------
// DASHBOARD OMNICHANNEL (META + MERCADOPHONE)
// ---------------------------------------------------------
// Função central para buscar métricas de qualquer período
async function fetchDashboardMetrics({ actId, periodo, dateStart, dateEnd }) {
  // 1. Buscar contas para processar
  let accountsToPull = [];
  if (actId && actId !== 'todas') {
    const q = await pool.query('SELECT a."actId", b."accessToken" FROM "AdAccount" a JOIN "BusinessManager" b ON a."bmId" = b.id WHERE a."actId" = $1', [actId]);
    accountsToPull = q.rows;
  } else {
    const q = await pool.query('SELECT a."actId", b."accessToken" FROM "AdAccount" a JOIN "BusinessManager" b ON a."bmId" = b.id');
    accountsToPull = q.rows.map(row => ({ ...row, accessToken: decrypt(row.accessToken) }));
  }

  // 2. Mapeamento de Datas
  let metaPeriod = 'today';
  if (periodo === '7dias') metaPeriod = 'last_7d';
  if (periodo === 'mes') metaPeriod = 'this_month';
  if (periodo === 'ontem') metaPeriod = 'yesterday';
  if (periodo === 'personalizado' && dateStart && dateEnd) {
    const start = dateStart.split('T')[0];
    const end = dateEnd.split('T')[0];
    metaPeriod = `{'since':'${start}','until':'${end}'}`;
  }

  let metrics = {
    totalSpent: 0, msgConversations: 0, linkClicks: 0, impressions: 0, purchases: 0,
    checkouts: 0, cart: 0, landingPageViews: 0, addPaymentInfo: 0, reach: 0,
    clicks: 0, purchaseValue: 0, activeCamps: 0, pausedCamps: 0, followers: 0, profileVisits: 0,
    frequency: 0, uniqueClicks: 0, uniqueCtr: 0, 
    video25: 0, video50: 0, video75: 0, video100: 0,
    postEngagement: 0, pageEngagement: 0, postReactions: 0, comments: 0, shares: 0
  };
  
  let dailyAggregated = {};
  let metaApiError = null;

  for (const acc of accountsToPull) {
    let fetchId = acc.actId;
    if (!fetchId.startsWith('act_')) fetchId = `act_${fetchId}`;
    const url = `https://graph.facebook.com/v19.0/${fetchId}/insights?fields=spend,actions,action_values,reach,impressions,clicks,frequency,unique_clicks,unique_ctr&date_preset=${metaPeriod.includes('since') ? '' : metaPeriod}&time_range=${metaPeriod.includes('since') ? metaPeriod : ''}&time_increment=1&access_token=${acc.accessToken}`;
    
    try {
      const response = await fetch(url);
      const fbRes = await response.json();
      if (fbRes.error) { metaApiError = fbRes.error.message; continue; }
      if (fbRes.data) {
        fbRes.data.forEach(stats => {
          const dateStr = stats.date_start;
          if (!dailyAggregated[dateStr]) dailyAggregated[dateStr] = { spent: 0, messages: 0 };
          const spent = parseFloat(stats.spend || 0);
          metrics.totalSpent += spent;
          dailyAggregated[dateStr].spent += spent;
          metrics.impressions += parseInt(stats.impressions || 0);
          metrics.reach += parseInt(stats.reach || 0);
          metrics.clicks += parseInt(stats.clicks || 0);
          metrics.frequency = (metrics.frequency + parseFloat(stats.frequency || 0)) / (metrics.frequency > 0 ? 2 : 1); // Média simples
          metrics.uniqueClicks += parseInt(stats.unique_clicks || 0);
          
          if (stats.action_values) {
            const pv = stats.action_values.find(a => a.action_type === 'purchase');
            if (pv) metrics.purchaseValue += parseFloat(pv.value || 0);
          }
          if (stats.actions) {
            stats.actions.forEach(a => {
              const val = parseInt(a.value || 0);
              const type = a.action_type;
              if (type === 'onsite_conversion.messaging_conversation_started_7d' || 
                  type === 'onsite_conversion.messaging_conversation_started' ||
                  type === 'lead' || 
                  type === 'contact') {
                  metrics.msgConversations += val;
                  dailyAggregated[dateStr].messages += val;
              }
              if (type === 'link_click') metrics.linkClicks += val;
              if (type === 'purchase') metrics.purchases += val;
              if (type === 'initiate_checkout') metrics.checkouts += val;
              if (type === 'add_to_cart') metrics.cart += val;
              if (type === 'landing_page_view') metrics.landingPageViews += val;
              if (type === 'add_payment_info') metrics.addPaymentInfo += val;
              if (type === 'follow' || type === 'page_like' || type === 'onsite_conversion.post_save') metrics.followers += val;
              if (type === 'profile_visit' || type === 'instagram_profile_visit') metrics.profileVisits += val;
              if (type === 'post_engagement') metrics.postEngagement += val;
              if (type === 'page_engagement') metrics.pageEngagement += val;
              if (type === 'post_reaction') metrics.postReactions += val;
              if (type === 'comment') metrics.comments += val;
              if (type === 'link_click') metrics.shares += val; // Na Meta share também pode ser link_click dependendo da versão, mas o correto é 'post_engagement' -> 'share'
              if (type === 'video_view' || type === 'video_p25_watched_actions') metrics.video25 += val;
              if (type === 'video_p50_watched_actions') metrics.video50 += val;
              if (type === 'video_p75_watched_actions') metrics.video75 += val;
              if (type === 'video_p100_watched_actions') metrics.video100 += val;
            });
          }
        });
      }
      const campUrl = `https://graph.facebook.com/v19.0/${fetchId}/campaigns?fields=status&access_token=${acc.accessToken}`;
      const campRes = await fetch(campUrl).then(r => r.json());
      if(campRes.data) campRes.data.forEach(c => c.status === 'ACTIVE' ? metrics.activeCamps++ : metrics.pausedCamps++);
    } catch (err) { metaApiError = "Falha de conexão com os servidores da Meta."; }
  }

  // Vendas PDV
  let wherePDV = "";
  let paramsPDV = [];
  if (periodo === 'personalizado' && dateStart && dateEnd) {
      wherePDV = 'WHERE "createdAt" >= $1 AND "createdAt" <= $2';
      paramsPDV = [new Date(dateStart), new Date(dateEnd)];
  } else if (periodo === 'hoje') { 
      wherePDV = 'WHERE DATE("createdAt") = CURRENT_DATE'; 
  }
  else if (periodo === '7dias') { 
      wherePDV = 'WHERE "createdAt" >= CURRENT_DATE - INTERVAL \'7 days\''; 
  }
  else if (periodo === 'mes') { 
      wherePDV = "WHERE date_trunc('month', \"createdAt\") = date_trunc('month', current_date)"; 
  }
  else if (periodo === 'ontem') { 
      wherePDV = "WHERE DATE(\"createdAt\") = CURRENT_DATE - INTERVAL '1 day'"; 
  }

  const salesRes = await pool.query(`SELECT SUM("valorTotal") as total, COUNT(*) as qtd, SUM(CASE WHEN "tipoVenda" = 'Trafego Pago' THEN "valorTotal" ELSE 0 END) as total_trafego FROM "Sale" ${wherePDV}`, paramsPDV);
  
  // Vendas por tipo (Donut Chart)
  const salesByTypeRes = await pool.query(`SELECT "tipoVenda" as label, SUM("valorTotal") as value FROM "Sale" ${wherePDV} GROUP BY "tipoVenda"`, paramsPDV);
  
  // Leads por Plataforma
  const leadsByPlatformRes = await pool.query(`SELECT platform as label, COUNT(*) as value FROM "Lead" ${wherePDV} GROUP BY platform`, paramsPDV);

  // Vendas diárias para o gráfico
  const salesDailyRes = await pool.query(`SELECT date_trunc('day', "createdAt") as day, SUM("valorTotal") as revenue, COUNT(*) as qty FROM "Sale" ${wherePDV} GROUP BY day`, paramsPDV);
  salesDailyRes.rows.forEach(row => {
     const dateStr = row.day.toISOString().split('T')[0];
     if (!dailyAggregated[dateStr]) dailyAggregated[dateStr] = { spent: 0, messages: 0 };
     dailyAggregated[dateStr].revenue = parseFloat(row.revenue || 0);
     dailyAggregated[dateStr].sales = parseInt(row.qty || 0);
  });

  const pdv = {
    faturamento: parseFloat(salesRes.rows[0].total || 0),
    qtd: parseInt(salesRes.rows[0].qtd || 0),
    faturamentoTrafego: parseFloat(salesRes.rows[0].total_trafego || 0),
    salesByType: salesByTypeRes.rows.map(r => ({ label: r.label || 'Outros', value: parseFloat(r.value || 0) })),
    leadsByPlatform: leadsByPlatformRes.rows.map(r => ({ label: r.label || 'Indefinido', value: parseInt(r.value || 0) }))
  };

  return { metrics, dailyAggregated, pdv, metaApiError };
}

// ---------------------------------------------------------
// CRON JOB: JARVIS DA MADRUGADA (03:00 AM)
// ---------------------------------------------------------
export async function runDailyJarvisAnalysis() {
    console.log('[CRON] Iniciando análise diária do Jarvis (03:00)...');
    try {
        const { metrics, pdv } = await fetchDashboardMetrics({ periodo: 'ontem' });
        
        const aiConfigRes = await pool.query('SELECT * FROM "AiConfig" WHERE id = $1', ['default']);
        const systemPrompt = aiConfigRes.rows[0]?.systemPrompt;
        const selectedModel = aiConfigRes.rows[0]?.model || "gpt-4o";

        const metricsData = {
            totalSpent: metrics.totalSpent.toFixed(2),
            results: metrics.msgConversations,
            cpa: metrics.msgConversations > 0 ? (metrics.totalSpent / metrics.msgConversations).toFixed(2) : "0.00",
            followers: metrics.followers,
            reach: metrics.reach,
            impressions: metrics.impressions,
            linkClicks: metrics.linkClicks,
            ctr: (metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0).toFixed(2) + "%",
            cpc: (metrics.clicks > 0 ? metrics.totalSpent / metrics.clicks : 0).toFixed(2),
            faturamentoPDV: pdv.faturamento.toFixed(2)
        };

        const insightText = await generateAiInsights(metricsData, systemPrompt, selectedModel);
        
        // Salva no Histórico (Data de ontem)
        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);
        ontem.setHours(0,0,0,0);

        await pool.query(
            'INSERT INTO "DailyInsight" (date, content, "metricsSummary", "createdAt") VALUES ($1, $2, $3, NOW()) ON CONFLICT (date) DO UPDATE SET content = EXCLUDED.content, "metricsSummary" = EXCLUDED."metricsSummary"',
            [ontem, insightText, JSON.stringify(metricsData)]
        );

        console.log('✅ [JARVIS] Análise estratégica concluída e salva!');
        return { content: insightText, metrics: metricsData };
    } catch (err) {
        console.error('❌ [JARVIS] Erro na análise diária:', err);
        throw err;
    }
}

// Agenda para rodar todo dia às 03:00
cron.schedule('0 3 * * *', runDailyJarvisAnalysis);

// ROTA DASHBOARD ATUALIZADA
app.get('/api/dashboard', async (req, res) => {
  // ANTI-CACHE: Força o navegador a sempre buscar dados novos
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { actId, periodo, dateStart, dateEnd } = req.query;

  try {
    const { metrics, dailyAggregated, pdv, metaApiError } = await fetchDashboardMetrics({ actId, periodo, dateStart, dateEnd });

    const accountCountResult = await pool.query('SELECT COUNT(*) FROM "AdAccount" WHERE status = $1', ['ACTIVE']);
    const activeAccountsCount = parseInt(accountCountResult.rows[0].count) || 0;

    // Busca as configurações do Jarvis (Prompt e Modelo)
    const aiConfigRes = await pool.query('SELECT * FROM "AiConfig" WHERE id = $1', ['default']);
    const systemPrompt = aiConfigRes.rows[0]?.systemPrompt;
    const selectedModel = aiConfigRes.rows[0]?.model || "gpt-4o-mini";

    const adAccountsResult = await pool.query('SELECT id, "actId", name, status FROM "AdAccount" ORDER BY name ASC');
    const availableAccounts = adAccountsResult.rows || [];

    const formatBRL = (val) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatNum = (val) => val.toLocaleString('pt-BR');

    const roasAPI = metrics.totalSpent > 0 ? metrics.purchaseValue / metrics.totalSpent : 0;
    const ctrAPI = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
    const cpmAPI = metrics.impressions > 0 ? (metrics.totalSpent / metrics.impressions) * 1000 : 0;
    const cpcAPI = metrics.clicks > 0 ? metrics.totalSpent / metrics.clicks : 0;

    const masterMetrics = [
      { id: "totalSpent", label: "Gasto", prefix: "R$ ", value: formatBRL(metrics.totalSpent) },
      { id: "impressions", label: "Impressões", prefix: "", value: formatNum(metrics.impressions) },
      { id: "reach", label: "Alcance", prefix: "", value: formatNum(metrics.reach) },
      { id: "frequency", label: "Frequência", prefix: "", value: metrics.frequency.toFixed(2) },
      { id: "clicks", label: "Cliques (Todos)", prefix: "", value: formatNum(metrics.clicks) },
      { id: "uniqueClicks", label: "Cliques Únicos", prefix: "", value: formatNum(metrics.uniqueClicks) },
      { id: "linkClicks", label: "Cliques no Link", prefix: "", value: formatNum(metrics.linkClicks) },
      { id: "ctr", label: "CTR (Todos)", prefix: "", value: ctrAPI.toFixed(2) + "%" },
      { id: "uniqueCtr", label: "CTR Único", prefix: "", value: (metrics.reach > 0 ? (metrics.uniqueClicks / metrics.reach) * 100 : 0).toFixed(2) + "%" },
      { id: "cpm", label: "CPM", prefix: "R$ ", value: formatBRL(cpmAPI) },
      { id: "cpc", label: "CPC (Todos)", prefix: "R$ ", value: formatBRL(cpcAPI) },
      { id: "results", label: "Conversas", prefix: "", value: formatNum(metrics.msgConversations) },
      { id: "costPerResult", label: "Custo por Conversa", prefix: "R$ ", value: formatBRL(metrics.msgConversations > 0 ? metrics.totalSpent / metrics.msgConversations : 0) },
      { id: "landingPageViews", label: "Landing Page Views", prefix: "", value: formatNum(metrics.landingPageViews) },
      { id: "cart", label: "Adições ao Carrinho", prefix: "", value: formatNum(metrics.cart) },
      { id: "checkouts", label: "Iniciações de Checkout", prefix: "", value: formatNum(metrics.checkouts) },
      { id: "addPaymentInfo", label: "Pagamento Iniciado", prefix: "", value: formatNum(metrics.addPaymentInfo) },
      { id: "purchases", label: "Vendas (Pixel)", prefix: "", value: formatNum(metrics.purchases) },
      { id: "purchaseValue", label: "Faturamento (Pixel)", prefix: "R$ ", value: formatBRL(metrics.purchaseValue) },
      { id: "faturamentoPDV", label: "Faturamento PDV", prefix: "R$ ", value: formatBRL(pdv.faturamento) },
      { id: "roas", label: "ROAS", prefix: "", value: roasAPI.toFixed(2) },
      { id: "postEngagement", label: "Engajamento com Post", prefix: "", value: formatNum(metrics.postEngagement) },
      { id: "pageEngagement", label: "Engajamento com Página", prefix: "", value: formatNum(metrics.pageEngagement) },
      { id: "postReactions", label: "Reações", prefix: "", value: formatNum(metrics.postReactions) },
      { id: "comments", label: "Comentários", prefix: "", value: formatNum(metrics.comments) },
      { id: "video25", label: "Vídeo 25%", prefix: "", value: formatNum(metrics.video25) },
      { id: "video50", label: "Vídeo 50%", prefix: "", value: formatNum(metrics.video50) },
      { id: "video75", label: "Vídeo 75%", prefix: "", value: formatNum(metrics.video75) },
      { id: "video100", label: "Vídeo 100%", prefix: "", value: formatNum(metrics.video100) },
      { id: "activeCamps", label: "Campanhas Ativas", prefix: "", value: formatNum(metrics.activeCamps) },
      { id: "profileVisits", label: "Visitas ao Perfil", prefix: "", value: formatNum(metrics.profileVisits) },
      { id: "followers", label: "Seguidores", prefix: "", value: formatNum(metrics.followers) }
    ];

    const metricsTemplates = {
      reconhecimento: masterMetrics.filter(m => ["totalSpent", "reach", "impressions", "cpm", "frequency"].includes(m.id)),
      trafego: masterMetrics.filter(m => ["totalSpent", "clicks", "linkClicks", "uniqueClicks", "cpc", "ctr", "uniqueCtr", "landingPageViews"].includes(m.id)),
      engajamento: masterMetrics.filter(m => ["totalSpent", "results", "costPerResult", "postEngagement", "comments", "video50", "profileVisits", "followers"].includes(m.id)),
      leads: masterMetrics.filter(m => ["totalSpent", "results", "costPerResult", "ctr", "cpm"].includes(m.id)),
      vendas: masterMetrics.filter(m => ["totalSpent", "linkClicks", "results", "purchaseValue", "faturamentoPDV", "roas"].includes(m.id)),
      personalizado: masterMetrics
    };

    const masterFunnels = [
      { id: "impressions", label: "Impressões", value: metrics.impressions, percentage: "100%" },
      { id: "reach", label: "Alcance", value: metrics.reach, percentage: "100%" },
      { id: "clicks", label: "Cliques no Link", value: metrics.linkClicks, percentage: metrics.impressions > 0 ? ((metrics.linkClicks / metrics.impressions) * 100).toFixed(2) + "%" : "0%" },
      { id: "ctr", label: "CTR", value: parseFloat(ctrAPI.toFixed(2)), percentage: ctrAPI.toFixed(2) + "%" },
      { id: "leads", label: "Mensagens", value: metrics.msgConversations, percentage: metrics.linkClicks > 0 ? ((metrics.msgConversations / metrics.linkClicks) * 100).toFixed(2) + "%" : "0%" },
      { id: "sales", label: "Vendas PDV", value: pdv.qtd, percentage: metrics.msgConversations > 0 ? ((pdv.qtd / metrics.msgConversations) * 100).toFixed(2) + "%" : "0%" },
      { id: "profileVisits", label: "Visitas ao Perfil", value: metrics.profileVisits, percentage: metrics.reach > 0 ? ((metrics.profileVisits / metrics.reach) * 100).toFixed(2) + "%" : "0%" },
      { id: "followers", label: "Seguidores", value: metrics.followers, percentage: metrics.profileVisits > 0 ? ((metrics.followers / metrics.profileVisits) * 100).toFixed(2) + "%" : "0%" }
    ];

    const funnelsTemplates = {
      reconhecimento: masterFunnels.filter(f => ["reach", "impressions"].includes(f.id)),
      trafego: masterFunnels.filter(f => ["impressions", "clicks"].includes(f.id)),
      engajamento: masterFunnels.filter(f => ["reach", "profileVisits", "followers"].includes(f.id)),
      leads: masterFunnels.filter(f => ["impressions", "clicks", "leads"].includes(f.id)),
      vendas: masterFunnels.filter(f => ["clicks", "ctr", "leads", "sales"].includes(f.id)),
      personalizado: masterFunnels
    };

    const dailyDataConverted = Object.keys(dailyAggregated).sort().map(d => ({
        day: d.split('-').reverse().slice(0, 2).join('/'),
        leads: dailyAggregated[d].messages || 0,
        spent: dailyAggregated[d].spent || 0,
        revenue: dailyAggregated[d].revenue || 0,
        sales: dailyAggregated[d].sales || 0
    }));

    // 5. INSIGHTS DESATIVADOS NO DASHBOARD (Otimização de Performance)
    const aiInsights = {
      title: `Análise do Jarvis`,
      subtitle: `Baseada em ${activeAccountsCount} conta(s).`,
      text: "Jarvis está focado no chat estratégico. Acesse o ícone do Jarvis para insights em tempo real."
    };

    res.json({
      metaStatus: (metaApiError || availableAccounts.length === 0) ? 'error' : 'ok',
      metaErrorMessage: metaApiError || (availableAccounts.length === 0 ? 'Integração Meta Ads Desativada' : null),
      metricsTemplates,
      funnelsTemplates,
      availableAccounts,
      rawSummary: {
        totalSpent: metrics.totalSpent,
        messages: metrics.msgConversations,
        faturamentoPDV: pdv.faturamento,
        faturamentoTrafegoPago: pdv.faturamentoTrafego,
        linkClicks: metrics.linkClicks,
        purchases: pdv.qtd,
        impressions: metrics.impressions,
        reach: metrics.reach
      },
      dailyData: dailyDataConverted,
      aiInsights
    });

  } catch (err) {
    console.error('Dash Error:', err);
    res.status(500).json({ 
      metaStatus: 'error',
      error: 'Erro no Processamento de Dados',
      metaErrorMessage: err.message.includes('API key') ? 'Chave OpenAI Inválida' : 'Falha ao processar métricas'
    });
  }
});

// ---------------------------------------------------------
// JARVIS INSIGHTS SOB DEMANDA
// ---------------------------------------------------------
app.post('/api/generate-insights', async (req, res) => {
  const { metricsData } = req.body;
  try {
    const aiConfigRes = await pool.query('SELECT * FROM "AiConfig" WHERE id = $1', ['default']);
    const systemPrompt = aiConfigRes.rows[0]?.systemPrompt;
    const selectedModel = aiConfigRes.rows[0]?.model || "gpt-4o";

    const insightText = await generateAiInsights(metricsData, systemPrompt, selectedModel);
    res.json({ text: insightText });
  } catch (err) {
    console.error('Erro ao gerar insights:', err);
    res.status(500).json({ error: 'Falha ao processar insights via IA' });
  }
});

// ---------------------------------------------------------
// JARVIS CHAT & VOICE INTELLIGENCE
// ---------------------------------------------------------
app.post('/api/jarvis/chat', async (req, res) => {
  const { messages } = req.body;
  try {
    // Busca config de IA do banco
    const aiConfigRes = await pool.query('SELECT * FROM "AiConfig" WHERE id = $1', ['default']);
    const systemPrompt = aiConfigRes.rows[0]?.systemPrompt;
    const selectedModel = aiConfigRes.rows[0]?.model || "gpt-4o";

    // Puxa as métricas para múltiplos períodos para dar "visão total" ao Jarvis
    const [metricsHoje, metricsOntem, metrics7Dias, metrics30Dias, metricsMes] = await Promise.all([
      fetchDashboardMetrics({ periodo: 'hoje' }),
      fetchDashboardMetrics({ periodo: 'ontem' }),
      fetchDashboardMetrics({ periodo: '7dias' }),
      fetchDashboardMetrics({ periodo: '30dias' }),
      fetchDashboardMetrics({ periodo: 'mes' })
    ]);

    // Puxa lista de campanhas para análise estratégica
    let campaignsContext = [];
    try {
      const qAcc = await pool.query('SELECT a."actId", b."accessToken" FROM "AdAccount" a JOIN "BusinessManager" b ON a."bmId" = b.id WHERE a.status = \'ACTIVE\' LIMIT 1');
      if (qAcc.rows.length > 0) {
        const acc = qAcc.rows[0];
        const decryptedToken = decrypt(acc.accessToken);
        const fetchId = acc.actId.startsWith('act_') ? acc.actId : `act_${acc.actId}`;
        const url = `https://graph.facebook.com/v19.0/${fetchId}/campaigns?fields=name,status,daily_budget,lifetime_budget,insights.date_preset(this_month){spend,actions,reach,impressions,clicks,cpc,cpm,ctr,frequency}&access_token=${decryptedToken}`;
        const campRes = await fetch(url).then(r => r.json());
        if (campRes.data) {
          campaignsContext = campRes.data.map(c => {
            const ins = c.insights?.data?.[0] || {};
            return {
              nome: c.name,
              status: c.status,
              orcamento: (parseFloat(c.daily_budget || c.lifetime_budget || 0) / 100).toFixed(2),
              gastoMes: parseFloat(ins.spend || 0).toFixed(2),
              ctr: parseFloat(ins.ctr || 0).toFixed(2) + "%",
              cpc: parseFloat(ins.cpc || 0).toFixed(2),
              cpm: parseFloat(ins.cpm || 0).toFixed(2),
              freq: parseFloat(ins.frequency || 0).toFixed(2),
              leadsMes: parseInt(ins.actions?.find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || 0)
            };
          });
        }
      }
    } catch (e) { console.error('Erro ao buscar campanhas para o Jarvis:', e); }
    
    // CONTAGEM EM TEMPO REAL (BANCO INTERNO)
    const leadsToday = await pool.query('SELECT COUNT(*) FROM "Lead" WHERE "createdAt" >= $1', [new Date(new Date().setHours(0,0,0,0))]).then(r => parseInt(r.rows[0].count));
    const salesToday = await pool.query('SELECT COUNT(*) FROM "Sale" WHERE "createdAt" >= $1', [new Date(new Date().setHours(0,0,0,0))]).then(r => parseInt(r.rows[0].count));
    
    const recentLeadsRes = await pool.query('SELECT name, status, platform FROM "Lead" ORDER BY "createdAt" DESC LIMIT 5');
    const recentSalesRes = await pool.query('SELECT "valorTotal", "canalVenda", "tipoVenda" FROM "Sale" ORDER BY "createdAt" DESC LIMIT 5');
    
    // Função auxiliar para formatar métricas completas para o Jarvis
    const formatFullMetrics = (d, leadsReal = null) => {
      const m = d.metrics;
      const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      const cpc = m.clicks > 0 ? m.totalSpent / m.clicks : 0;
      const roas = m.totalSpent > 0 ? d.pdv.faturamento / m.totalSpent : 0;
      return {
        gasto: Number(m.totalSpent).toFixed(2),
        leads: leadsReal !== null ? Math.max(leadsReal, Number(m.msgConversations)) : Number(m.msgConversations),
        faturamento: Number(d.pdv.faturamento).toFixed(2),
        cliques: m.clicks,
        impressoes: m.impressions,
        ctr: ctr.toFixed(2) + "%",
        cpc: cpc.toFixed(2),
        roas: roas.toFixed(2)
      };
    };

    const systemDiagnostics = {
      // CONTEXTO TEMPORAL ULTRA-DETALHADO
      timeContext: {
        hoje: formatFullMetrics(metricsHoje, leadsToday),
        ontem: formatFullMetrics(metricsOntem),
        ultimos7Dias: formatFullMetrics(metrics7Dias),
        ultimos30Dias: formatFullMetrics(metrics30Dias),
        mesAtual: formatFullMetrics(metricsMes)
      },
      campaigns: campaignsContext,
      integrations: {
        metaAds: metricsHoje.metaApiError ? `ERRO: ${metricsHoje.metaApiError}` : "Operacional",
        pdv: "Online",
        brain: !!process.env.OPENAI_API_KEY ? "Operacional" : "Offline"
      },
      recentLeads: recentLeadsRes.rows,
      recentSales: recentSalesRes.rows
    };

    const jarvisTextReply = await generateJarvisChatResponse(messages, systemDiagnostics, systemPrompt, selectedModel);
    
    res.json({ reply: jarvisTextReply });
  } catch (err) {
    console.error('Erro na Rota Jarvis Chat:', err);
    
    // Tenta identificar o erro para dar uma resposta útil
    let errorMessage = "Erro interno no Jarvis.";
    if (err.message.includes('API key')) errorMessage = "Sua chave da OpenAI parece estar inválida ou ausente no seu arquivo .env.";
    else if (err.message.includes('token')) errorMessage = "O token da Meta Ads parece estar expirado ou incorreto.";
    else if (err.message.includes('model')) errorMessage = "O modelo de IA selecionado não está disponível na sua conta.";

    res.status(500).json({ 
      error: errorMessage,
      details: err.message,
      suggestion: "Verifique suas chaves de API no arquivo .env ou tente reconectar a integração na aba de configurações."
    });
  }
});

// ---------------------------------------------------------
// MERCADOPHONE WEBHOOK & META CAPI
// ---------------------------------------------------------

const sendToMetaCAPI = async (pixelId, eventData) => {
  if (!pixelId || !process.env.META_ACCESS_TOKEN) return;
  try {
    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${process.env.META_ACCESS_TOKEN}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [eventData],
        test_event_code: process.env.META_TEST_EVENT_CODE // Opcional para testes
      })
    });
    console.log('✅ Evento CAPI enviado para Meta!');
  } catch (err) {
    console.error('❌ Erro ao enviar CAPI:', err);
  }
};

app.post('/api/webhooks/mercadophone', async (req, res) => {
  const { telefoneCliente, valorTotal, canalVenda = 'MercadoPhone', tipoVenda = 'Offline' } = req.body;

  if (!telefoneCliente || !valorTotal) {
    return res.status(400).json({ error: 'Dados incompletos: telefoneCliente e valorTotal são obrigatórios.' });
  }

  try {
    // 1. Salva a Venda no Banco
    const saleRes = await pool.query(
      'INSERT INTO "Sale" ("telefoneCliente", "valorTotal", "canalVenda", "tipoVenda") VALUES ($1, $2, $3, $4) RETURNING *',
      [telefoneCliente, valorTotal, canalVenda, tipoVenda]
    );

    console.log('💰 Nova Venda MercadoPhone:', saleRes.rows[0]);

    // 2. Tenta vincular ao Lead para atribuição
    const cleanPhone = telefoneCliente.replace(/\D/g, '');
    const leadRes = await pool.query('SELECT id FROM "Lead" WHERE phone LIKE $1 LIMIT 1', [`%${cleanPhone.slice(-8)}%`]);
    
    if (leadRes.rows.length > 0) {
      console.log(`🔗 Venda vinculada ao Lead ID: ${leadRes.rows[0].id}`);
      await pool.query('UPDATE "Lead" SET status = \'Vendido\' WHERE id = $1', [leadRes.rows[0].id]);
      await pool.query('UPDATE "Sale" SET "tipoVenda" = \'Trafego Pago\' WHERE id = $1', [saleRes.rows[0].id]);
    } else {
      await pool.query('UPDATE "Sale" SET "tipoVenda" = \'Direto\' WHERE id = $1', [saleRes.rows[0].id]);
    }

    // 3. Envia para Meta CAPI (se o Pixel ID estiver configurado)
    const pixelId = process.env.META_PIXEL_ID;
    if (pixelId) {
      const crypto = await import('crypto');
      const hashedPhone = crypto.createHash('sha256').update(cleanPhone).digest('hex');
      const eventData = {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        user_data: {
          ph: [hashedPhone]
        },
        custom_data: {
          value: parseFloat(valorTotal),
          currency: 'BRL'
        },
        event_source_url: 'https://supercell-ai.com.br/offline-sale',
        action_source: 'physical_store'
      };
      await sendToMetaCAPI(pixelId, eventData);
    }

    res.status(200).json({ status: 'success', sale: saleRes.rows[0] });

  } catch (err) {
    console.error('❌ Erro no Webhook MercadoPhone:', err);
    res.status(500).json({ error: 'Erro interno ao processar venda' });
  }
});

app.get('/api/integrations/mercadophone/status', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT "createdAt" FROM "Sale" WHERE "canalVenda" = \'MercadoPhone\' ORDER BY "createdAt" DESC LIMIT 1'
    );
    
    if (result.rows.length > 0) {
      res.json({ active: true, lastSync: result.rows[0].createdAt });
    } else {
      res.json({ active: false, lastSync: null });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar status da integração' });
  }
});

app.get('/api/daily-insight', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM "DailyInsight" ORDER BY "date" DESC LIMIT 1'
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar insight diário' });
  }
});

app.post('/api/generate-daily-insight', async (req, res) => {
  try {
    const result = await runDailyJarvisAnalysis();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao gerar análise real do Jarvis' });
  }
});

// ---------------------------------------------------------
// AI CONFIG (JARVIS)
// ---------------------------------------------------------

app.get('/api/ai-config', async (req, res) => {
  try {
    const config = await pool.query('SELECT * FROM "AiConfig" WHERE id = $1', ['default']);
    if (config.rows.length === 0) {
      const defaultPrompt = "Você é o Jarvis, um assistente virtual estrategista especializado em gestão de tráfego pago (Meta Ads) e vendas de celulares (iPhones e Androids). Seu objetivo é analisar os números do dia e dar conselhos práticos e diretos.";
      const newConfig = await pool.query(
        'INSERT INTO "AiConfig" (id, "systemPrompt", model, "updatedAt") VALUES ($1, $2, $3, NOW()) RETURNING *',
        ['default', defaultPrompt, 'gpt-4o']
      );
      return res.json(newConfig.rows[0]);
    }
    res.json({ 
      ...config.rows[0], 
      isConfigured: !!process.env.OPENAI_API_KEY 
    });
  } catch (err) {
    console.error('Erro ao buscar config de IA:', err);
    res.status(500).json({ error: 'Erro ao buscar config de IA' });
  }
});

app.post('/api/ai-config', async (req, res) => {
  const { systemPrompt, model } = req.body;
  try {
    const check = await pool.query('SELECT * FROM "AiConfig" WHERE id = $1', ['default']);
    if (check.rows.length === 0) {
        await pool.query(
            'INSERT INTO "AiConfig" (id, "systemPrompt", model, "updatedAt") VALUES ($1, $2, $3, NOW())',
            ['default', systemPrompt, model || 'gpt-4o']
        );
    } else {
        await pool.query(
            'UPDATE "AiConfig" SET "systemPrompt" = $1, "model" = $2, "updatedAt" = NOW() WHERE id = $3',
            [systemPrompt, model || 'gpt-4o', 'default']
        );
    }
    res.json({ message: 'Configuração salva com sucesso' });
  } catch (err) {
    console.error('Erro ao salvar config de IA:', err);
    res.status(500).json({ error: 'Erro ao salvar config de IA' });
  }
});

app.get('/api/ai-models', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.json(['gpt-4o', 'gpt-4o-mini']);
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    const data = await response.json();
    
    if (data.data) {
      // Filtra apenas modelos de chat relevantes (gpt-4, gpt-3.5, o1, etc)
      const filtered = data.data
        .filter(m => (m.id.startsWith('gpt-') || m.id.startsWith('o1-')) && !m.id.includes('vision') && !m.id.includes('instruct'))
        .map(m => m.id)
        .sort((a, b) => b.localeCompare(a)); // Modelos mais novos primeiro
      
      return res.json(filtered.length > 0 ? filtered : ['gpt-4o', 'gpt-4o-mini']);
    }
    res.json(['gpt-4o', 'gpt-4o-mini']);
  } catch (err) {
    console.error('Erro ao buscar modelos na OpenAI:', err);
    res.json(['gpt-4o', 'gpt-4o-mini']); // Fallback
  }
});

// ROTA DE CAMPANHAS (DADOS DETALHADOS)
app.get('/api/campaigns', async (req, res) => {
    const { periodo = 'hoje', dateStart, dateEnd } = req.query;
    
    // Tradução correta para a Meta
    const metaPeriods = {
      'hoje': 'today',
      '7dias': 'last_7d',
      'mes': 'this_month',
      'maximo': 'maximum'
    };
    let metaPeriod = metaPeriods[periodo] || periodo;
    if (periodo === 'personalizado' && dateStart && dateEnd) {
       // A Meta EXIGE aspas duplas no JSON para funcionar
       metaPeriod = `{"since":"${dateStart.split('T')[0]}","until":"${dateEnd.split('T')[0]}"}`;
    }

    try {
        const q = await pool.query('SELECT a."actId", b."accessToken" FROM "AdAccount" a JOIN "BusinessManager" b ON a."bmId" = b.id');
        const accounts = q.rows.map(r => ({ ...r, accessToken: decrypt(r.accessToken) }));
        let allCampaigns = [];

        for (const acc of accounts) {
            let fetchId = acc.actId;
            if (!fetchId.startsWith('act_')) fetchId = `act_${fetchId}`;

            // Define se usa preset ou range de datas
            let timeParams = metaPeriod.includes('since') 
                ? `.time_range(${metaPeriod})` 
                : `.date_preset(${metaPeriod})`;

            const url = `https://graph.facebook.com/v19.0/${fetchId}/campaigns?fields=name,status,effective_status,daily_budget,lifetime_budget,insights${timeParams}{spend,actions,action_values,reach,impressions,clicks,frequency,inline_link_clicks}&access_token=${acc.accessToken}`;
            const fbRes = await fetch(url).then(r => r.json());

            if (fbRes.data) {
                fbRes.data.forEach(camp => {
                    const insights = camp.insights?.data?.[0] || {};
                    const spend = parseFloat(insights.spend || 0);
                    
                    const actions = insights.actions || [];
                    const actionValues = insights.action_values || [];
                    
                    const messages = parseInt(actions.find(a => 
                        a.action_type === 'messaging_conversation_started_7d' || 
                        a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
                        a.action_type === 'onsite_conversion.messaging_conversation_started' ||
                        a.action_type === 'contact'
                    )?.value || 0);
                    
                    const purchases = parseInt(actions.find(a => a.action_type === 'purchase')?.value || 0);
                    const purchaseValue = parseFloat(actionValues.find(a => a.action_type === 'purchase')?.value || 0);
                    const checkouts = parseInt(actions.find(a => a.action_type === 'initiate_checkout')?.value || 0);
                    const reach = parseInt(insights.reach || 0);
                    const impressions = parseInt(insights.impressions || 0);
                    const clicks = parseInt(insights.clicks || 0);
                    const linkClicks = parseInt(actions.find(a => a.action_type === 'link_click')?.value || 0);
                    const frequency = parseFloat(insights.frequency || (reach > 0 ? impressions / reach : 0));
                    
                    const budget = parseFloat(camp.daily_budget || camp.lifetime_budget || 0) / 100;

                    allCampaigns.push({
                        id: camp.id,
                        name: camp.name,
                        status: camp.status.toLowerCase(),
                        effectiveStatus: camp.effective_status,
                        budget: budget,
                        spent: spend,
                        results: messages, // Para engajamento, resultados = mensagens
                        messages: messages,
                        purchases: purchases,
                        purchaseValue: purchaseValue,
                        checkouts: checkouts,
                        reach: reach,
                        impressions: impressions,
                        clicks: clicks,
                        linkClicks: linkClicks,
                        frequency: frequency,
                        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
                        cpc: clicks > 0 ? spend / clicks : 0,
                        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                        costPerResult: messages > 0 ? spend / messages : 0,
                        costPerCheckout: checkouts > 0 ? spend / checkouts : 0
                    });
                });
            }
        }
        res.json(allCampaigns);
    } catch (err) {
        console.error('Erro ao buscar campanhas:', err);
        res.status(500).json({ error: 'Erro ao buscar campanhas' });
    }
});

app.post('/api/webhooks/mercadophone', async (req, res) => {
  const { telefoneCliente, valorTotal, canalVenda, tipoVenda } = req.body;
  try {
    // 1. Limpa o valor para garantir que seja um número (Trata R$, vírgulas e pontos)
    let cleanValue = 0;
    if (valorTotal) {
        if (typeof valorTotal === 'string') {
            cleanValue = parseFloat(valorTotal.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.'));
        } else {
            cleanValue = parseFloat(valorTotal);
        }
    }

    // 2. Anonimiza o telefone para segurança (SHA-256)
    const crypto = await import('crypto');
    const telefoneHash = crypto.createHash('sha256').update(telefoneCliente || '').digest('hex');

    // 3. Salva no banco de dados com as novas tags
    await pool.query(
        'INSERT INTO "Sale" ("telefoneCliente", "valorTotal", "canalVenda", "tipoVenda") VALUES ($1, $2, $3, $4)', 
        [telefoneHash, cleanValue, canalVenda || 'Balcão', tipoVenda || 'Normal']
    );
    
    console.log(`\n[WEBHOOK PDV] Venda Processada: R$ ${cleanValue} | Canal: ${canalVenda} | Tipo: ${tipoVenda}`);
    res.json({ status: 'sucesso', valor: cleanValue });
  } catch (err) { 
    console.error('[WEBHOOK PDV] Erro:', err);
    res.status(500).json({ error: 'Erro ao processar venda' }); 
  }
});

// OUTRAS ROTAS
app.get('/api/bms', async (req, res) => {
    const r = await pool.query('SELECT id, name, "bmId", "createdAt" FROM "BusinessManager" ORDER BY "createdAt" DESC');
    res.json(r.rows);
});

app.post('/api/bms', async (req, res) => {
    const { name, bmId, accessToken } = req.body;
    try {
        const encryptedToken = encrypt(accessToken);
        const bmQuery = 'INSERT INTO "BusinessManager" (id, name, "bmId", "accessToken", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW()) ON CONFLICT ("bmId") DO UPDATE SET "accessToken" = EXCLUDED."accessToken" RETURNING id';
        const bmRes = await pool.query(bmQuery, [name, bmId, encryptedToken]);
        
        // Puxa contas próprias e contas de clientes
        const urlOwned = `https://graph.facebook.com/v19.0/${bmId}/owned_ad_accounts?fields=name,account_id,account_status&access_token=${accessToken}`;
        const urlClient = `https://graph.facebook.com/v19.0/${bmId}/client_ad_accounts?fields=name,account_id,account_status&access_token=${accessToken}`;
        
        const [resOwned, resClient] = await Promise.all([
            fetch(urlOwned).then(r => r.json()),
            fetch(urlClient).then(r => r.json())
        ]);

        const allAccounts = [];
        if (resOwned.data) allAccounts.push(...resOwned.data);
        if (resClient.data) allAccounts.push(...resClient.data);

        // Remove duplicatas por ID
        const uniqueAccounts = Array.from(new Map(allAccounts.map(a => [a.account_id, a])).values());

        if (uniqueAccounts.length === 0) {
            return res.status(400).json({ 
                error: 'Nenhuma conta de anúncio encontrada nesta BM.', 
                details: 'Certifique-se de que o Token tem permissão "ads_management" e que existem contas ativas vinculadas a esta BM.' 
            });
        }

        for(const acc of uniqueAccounts) {
            // Status 1 é o único que a Meta define como "ACTIVE" (rodando normalmente)
            // Vou logar o status real para entendermos o que a Meta está enviando
            console.log(`[Meta Sync] Conta: ${acc.name} | Status API: ${acc.account_status}`);
            
            const status = (acc.account_status === 1) ? 'ACTIVE' : 'DISABLED';
            
            await pool.query('INSERT INTO "AdAccount" (id, name, "actId", status, "bmId", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) ON CONFLICT ("actId") DO UPDATE SET status = EXCLUDED.status, name = EXCLUDED.name', [acc.name || 'Conta sem nome', acc.account_id, status, bmRes.rows[0].id]);
        }

        res.json({ message: 'Conectado!', found: uniqueAccounts.length });
    } catch(e) { 
        console.error('Erro ao conectar BM:', e);
        res.status(500).json({ error: e.message }); 
    }
});

app.delete('/api/bms/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Deletar Leads associados às AdAccounts desta BM
        await pool.query('DELETE FROM "Lead" WHERE "adAccountId" IN (SELECT id FROM "AdAccount" WHERE "bmId" = $1)', [id]);
        
        // 2. Deletar AdAccounts da BM
        await pool.query('DELETE FROM "AdAccount" WHERE "bmId" = $1', [id]);
        
        // 3. Deletar a BM
        await pool.query('DELETE FROM "BusinessManager" WHERE id = $1', [id]);
        
        res.json({ message: 'BM e dados associados removidos com sucesso!' });
    } catch (err) {
        console.error('Erro ao remover BM:', err);
        res.status(500).json({ error: 'Erro ao remover BM e dados vinculados.' });
    }
});

app.get('/api/leads', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT l.*, a.name as "adAccountName", s."tipoVenda" as "productName"
      FROM "Lead" l 
      JOIN "AdAccount" a ON l."adAccountId" = a.id 
      LEFT JOIN (
        SELECT DISTINCT ON ("telefoneCliente") "telefoneCliente", "tipoVenda"
        FROM "Sale"
        ORDER BY "telefoneCliente", "createdAt" DESC
      ) s ON l.phone = s."telefoneCliente"
      ORDER BY l."createdAt" DESC
    `);
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar leads' });
  }
});

app.patch('/api/leads/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE "Lead" SET status = $1, "updatedAt" = NOW() WHERE id = $2', [status, id]);
    res.json({ message: 'Status atualizado com sucesso' });
  } catch (err) {
    console.error('Erro ao atualizar status do lead:', err);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// ---------------------------------------------------------
// CUSTOM TEMPLATES (DASHBOARD)
// ---------------------------------------------------------

app.get('/api/custom-templates', async (req, res) => {
  try {
    const templates = await pool.query('SELECT * FROM "CustomTemplate" ORDER BY "createdAt" DESC');
    res.json(templates.rows);
  } catch (err) {
    console.error('Erro ao buscar templates:', err);
    res.status(500).json({ error: 'Erro ao buscar templates' });
  }
});

app.post('/api/custom-templates', async (req, res) => {
  const { name, metricIds, funnelIds } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO "CustomTemplate" (id, name, "metricIds", "funnelIds", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW()) RETURNING *',
      [name, JSON.stringify(metricIds), JSON.stringify(funnelIds)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao salvar template:', err);
    res.status(500).json({ error: 'Erro ao salvar template' });
  }
});

app.delete('/api/custom-templates/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM "CustomTemplate" WHERE id = $1', [id]);
    res.json({ message: 'Template removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover template:', err);
    res.status(500).json({ error: 'Erro ao remover template' });
  }
});

// ---------------------------------------------------------
// JARVIS STT (Whisper - OpenAI)
// ---------------------------------------------------------
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/jarvis/transcribe', upload.single('audio'), async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(400).json({ error: 'Chave API da OpenAI não configurada.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum áudio recebido.' });
  }

  try {
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Erro da OpenAI Whisper:', errBody);
      return res.status(response.status).json({ error: 'Falha ao transcrever o áudio.' });
    }

    const data = await response.json();
    res.json({ text: data.text });
  } catch (err) {
    console.error('Erro na transcrição de áudio:', err);
    res.status(500).json({ error: 'Erro interno ao transcrever áudio.' });
  }
});

// ---------------------------------------------------------
// JARVIS TTS (ElevenLabs) STREAMING
// ---------------------------------------------------------
app.get('/api/jarvis/speak', async (req, res) => {
  const { text, voiceId } = req.query;
  const targetVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID;
  
  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(400).json({ error: 'Chave API da ElevenLabs não configurada.' });
  }

  if (!targetVoiceId || !text) {
    return res.status(400).json({ error: 'Texto ou Voice ID ausente.' });
  }

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}/stream`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Erro da ElevenLabs:', errBody);
      return res.status(response.status).json({ error: 'Falha ao comunicar com a ElevenLabs.' });
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked'
    });
    
    const { Readable } = await import('stream');
    Readable.fromWeb(response.body).pipe(res);
    
  } catch (err) {
    console.error('Erro na rota de TTS:', err);
    res.status(500).json({ error: 'Erro interno ao gerar áudio.' });
  }
});

// ---------------------------------------------------------
// CONFIGURAÇÕES GERAIS E EQUIPE
// ---------------------------------------------------------

app.get('/api/settings/company', async (req, res) => {
  try {
    const profile = await pool.query('SELECT * FROM "CompanyProfile" WHERE id = $1', ['default']);
    if (profile.rows.length === 0) {
      const newProfile = await pool.query('INSERT INTO "CompanyProfile" (id) VALUES ($1) RETURNING *', ['default']);
      return res.json(newProfile.rows[0]);
    }
    res.json(profile.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erro ao buscar perfil' }); }
});

app.post('/api/settings/company', async (req, res) => {
  const { name, timezone, currency, logoUrl } = req.body;
  try {
    await pool.query(
      'UPDATE "CompanyProfile" SET name = $1, timezone = $2, currency = $3, "logoUrl" = $4, "updatedAt" = NOW() WHERE id = $5',
      [name, timezone, currency, logoUrl, 'default']
    );
    res.json({ message: 'Perfil atualizado com sucesso!' });
  } catch (err) { res.status(500).json({ error: 'Erro ao salvar perfil' }); }
});

app.get('/api/settings/team', async (req, res) => {
  try {
    const team = await pool.query('SELECT * FROM "TeamMember" ORDER BY "createdAt" ASC');
    res.json(team.rows);
  } catch (err) { res.status(500).json({ error: 'Erro ao buscar equipe' }); }
});

app.post('/api/settings/team', async (req, res) => {
  const { name, email, role } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO "TeamMember" (id, name, email, role) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *',
      [name, email, role]
    );
    res.json(result.rows[0]);
  } catch (err) { 
    if (err.code === '23505') return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    res.status(500).json({ error: 'Erro ao adicionar membro' }); 
  }
});

app.delete('/api/settings/team/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM "TeamMember" WHERE id = $1', [req.params.id]);
    res.json({ message: 'Membro removido com sucesso!' });
  } catch (err) { res.status(500).json({ error: 'Erro ao remover membro' }); }
});

// ---------------------------------------------------------
// FATURAMENTO E SEGURANÇA
// ---------------------------------------------------------

app.get('/api/settings/billing', async (req, res) => {
  try {
    const invoices = await pool.query('SELECT * FROM "Invoice" ORDER BY "createdAt" DESC');
    res.json({
      plan: 'Supercell AI Business',
      price: '497,00',
      nextBilling: '15/05/2026',
      invoices: invoices.rows
    });
  } catch (err) { res.status(500).json({ error: 'Erro ao buscar faturamento' }); }
});

app.get('/api/settings/security', async (req, res) => {
  try {
    const security = await pool.query('SELECT * FROM "SecuritySettings" WHERE id = $1', ['default']);
    res.json(security.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Erro ao buscar segurança' }); }
});

app.post('/api/settings/security/2fa', async (req, res) => {
  const { enabled } = req.body;
  try {
    await pool.query('UPDATE "SecuritySettings" SET "twoFactorEnabled" = $1 WHERE id = $2', [enabled, 'default']);
    res.json({ message: `Autenticação em dois fatores ${enabled ? 'ativada' : 'desativada'}!` });
  } catch (err) { res.status(500).json({ error: 'Erro ao atualizar 2FA' }); }
});

app.post('/api/settings/security/password', async (req, res) => {
  // Simulação de troca de senha (em produção usaria hash e verificação da senha antiga)
  try {
    await pool.query('UPDATE "SecuritySettings" SET "lastPasswordChange" = NOW() WHERE id = $1', ['default']);
    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (err) { res.status(500).json({ error: 'Erro ao alterar senha' }); }
});

// ---------------------------------------------------------
// ONBOARDING
// ---------------------------------------------------------

app.get('/api/onboarding', async (req, res) => {
  try {
    const state = await pool.query('SELECT * FROM "OnboardingState" WHERE id = $1', ['default']);
    res.json(state.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar onboarding' });
  }
});

app.post('/api/onboarding/dismiss', async (req, res) => {
  try {
    await pool.query('UPDATE "OnboardingState" SET is_dismissed = true, "updatedAt" = NOW() WHERE id = $1', ['default']);
    res.json({ message: 'Onboarding ignorado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar onboarding' });
  }
});

app.get('/api/onboarding/status', async (req, res) => {
  try {
    // 1. Empresa Configurada
    const company = await pool.query('SELECT name, "logoUrl" FROM "CompanyProfile" WHERE id = $1', ['default']);
    const isCompanyConfigured = company.rows.length > 0 && company.rows[0].name !== 'Supercell AI Store' && company.rows[0].logoUrl !== null;

    // 2. Facebook Conectado
    const bms = await pool.query('SELECT id FROM "BusinessManager" LIMIT 1');
    const isFacebookConnected = bms.rows.length > 0;

    // 3. MercadoFone Conectado
    const sales = await pool.query('SELECT id FROM "Sale" WHERE "canalVenda" = \'MercadoPhone\' LIMIT 1');
    const isMercadoFoneConnected = sales.rows.length > 0;

    // 4. Jarvis Configurado
    const aiConfig = await pool.query('SELECT "systemPrompt", "voiceId" FROM "AiConfig" WHERE id = $1', ['default']);
    const defaultPrompt = "Você é o Jarvis, um assistente virtual estrategista especializado em gestão de tráfego pago (Meta Ads) e vendas de celulares (iPhones e Androids). Seu objetivo é analisar os números do dia e dar conselhos práticos e diretos.";
    const isJarvisConfigured = aiConfig.rows.length > 0 && aiConfig.rows[0].systemPrompt.trim() !== defaultPrompt.trim();

    // 5. Metas Definidas
    const goals = await pool.query('SELECT "dailySalesGoal", "dailyLeadsGoal" FROM "SalesGoal" WHERE id = $1', ['default']);
    const isGoalsConfigured = goals.rows.length > 0 && goals.rows[0].dailySalesGoal > 0 && goals.rows[0].dailyLeadsGoal > 0;

    res.json({
      steps: [
        { id: 'company', label: 'Configurar Perfil da Empresa', completed: isCompanyConfigured, icon: 'business' },
        { id: 'facebook', label: 'Conectar Meta Ads (BM)', completed: isFacebookConnected, icon: 'facebook' },
        { id: 'webhook', label: 'Ativar Recebimento de Leads', completed: isFacebookConnected, icon: 'bolt' },
        { id: 'mercadofone', label: 'Vincular Vendas MercadoFone', completed: isMercadoFoneConnected, icon: 'point_of_sale' },
        { id: 'jarvis', label: 'Personalizar DNA do Jarvis', completed: isJarvisConfigured, icon: 'psychology' },
        { id: 'goals', label: 'Definir Metas Operacionais', completed: isGoalsConfigured, icon: 'track_changes' }
      ]
    });
  } catch (err) {
    console.error('❌ Erro ao calcular status de onboarding:', err);
    res.status(500).json({ error: 'Erro ao calcular status de onboarding', details: err.message });
  }
});

// ---------------------------------------------------------
// METAS DE VENDAS
// ---------------------------------------------------------

app.get('/api/settings/goals', async (req, res) => {
  try {
    const goals = await pool.query('SELECT * FROM "SalesGoal" WHERE id = $1', ['default']);
    res.json(goals.rows[0] || { dailySalesGoal: 0, dailyLeadsGoal: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
});

app.post('/api/settings/goals', async (req, res) => {
  const { dailySalesGoal, dailyLeadsGoal } = req.body;
  try {
    await pool.query(
      'UPDATE "SalesGoal" SET "dailySalesGoal" = $1, "dailyLeadsGoal" = $2, "updatedAt" = NOW() WHERE id = $3',
      [dailySalesGoal, dailyLeadsGoal, 'default']
    );
    res.json({ message: 'Metas atualizadas com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar metas' });
  }
});

// ---------------------------------------------------------
// WEBHOOKS WHATSAPP / META
// ---------------------------------------------------------

app.get('/api/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === 'supercell_verify_token') {
      console.log('✅ Webhook WhatsApp Verificado com Sucesso!');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

app.post('/api/webhooks/whatsapp', (req, res) => {
  // Logs para depuração de novos leads
  console.log('📩 Novo evento de Webhook recebido:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
