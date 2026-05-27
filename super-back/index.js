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
import { PDFParse } from 'pdf-parse';
const { Pool } = pg;
let pdfParser = PDFParse; // Agora usamos a função exportada corretamente

// Força o carregamento ignorando cache do sistema (override: true)
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

// Função para logar em arquivo
const fileLog = (msg) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}\n`;
  try {
    fs.appendFileSync('debug.log', logMsg);
  } catch (err) { }
};

// Log de Verificação de Ambiente
const rawToken = process.env.META_ACCESS_TOKEN || '';
const cleanToken = rawToken.trim().replace(/^"|"$/g, ''); // Remove aspas extras se houver
const tokenDebug = cleanToken ? cleanToken.substring(0, 15) + '...' : 'NÃO ENCONTRADO';
fs.writeFileSync('debug.log', `=== SERVIDOR REINICIADO ===\n[TOKEN LOADED] ${tokenDebug}\n`);

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
  ssl: false
});

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// Inicialização de Tabelas
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Sale" (
        "id" SERIAL PRIMARY KEY,
        "telefoneCliente" TEXT,
        "nomeCliente" TEXT,
        "vendedor" TEXT,
        "produto" TEXT,
        "valorTotal" DECIMAL(10,2),
        "lucro" DECIMAL(10,2),
        "canalVenda" TEXT,
        "tipoVenda" TEXT,
        "statusVenda" TEXT DEFAULT 'Concluído',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "CustomGoal" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "unit" TEXT,
        "period" TEXT,
        "active" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "KnowledgeFile" (
        "id" TEXT PRIMARY KEY,
        "fileName" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "fileType" TEXT,
        "active" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "JarvisMessage" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "role" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "CustomTemplate" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "metricIds" JSONB,
        "funnelIds" JSONB,
        "icon" TEXT DEFAULT 'auto_awesome',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Banco de Dados Preparado.');
  } catch (err) {
    console.error('❌ Erro ao inicializar banco:', err);
  }
};
initDb();

export async function syncMercadoPhoneSales(limit = 100) {
  const API_URL = process.env.MERCADOPHONE_API_URL;
  const TOKEN = process.env.MERCADOPHONE_API_TOKEN;

  if (!API_URL || !TOKEN) {
    throw new Error('Configuracoes do MercadoPhone ausentes no .env');
  }

  console.log(`[SYNC] Sincronizando com MercadoPhone (limite: ${limit})...`);
  
  try {
    const mpRes = await fetch(`${API_URL}?class=VendaApiController&method=index`, {
      method: 'POST',
      headers: {
        'Authorization': TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        limit: limit,
        page: 1,
        order: 'id',
        direction: 'desc'
      })
    });

    if (!mpRes.ok) {
      throw new Error(`Erro na API do MercadoPhone: ${mpRes.status} ${mpRes.statusText}`);
    }

    const mpData = await mpRes.json();
    const sales = mpData.data?.itens || [];

    let countNew = 0;

    for (const sale of sales) {
      const existing = await pool.query('SELECT id FROM "Sale" WHERE id = $1', [sale.id]);
      
      const telefone = sale.cliente?.telefone || sale.cliente?.telefoneSecundario || '';
      const nome = sale.clienteNome;
      const valor = sale.totalVenda;
      const vendedor = sale.vendedorNome;
      const produto = sale.itens?.[0]?.produtoNome || 'Produto Indefinido';
      const tipoVenda = sale.tipoVendaDescricao || 'Offline';
      const createdAt = sale.dataVenda;
      const lucro = valor * 0.2;

      if (existing.rows.length === 0) {
        await pool.query(
          'INSERT INTO "Sale" (id, "telefoneCliente", "nomeCliente", "vendedor", "produto", "valorTotal", "lucro", "canalVenda", "tipoVenda", "statusVenda", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
          [sale.id, telefone, nome, vendedor, produto, valor, lucro, 'MercadoPhone', tipoVenda, 'Concluído', createdAt]
        );
        countNew++;

        const cleanPhone = telefone.replace(/\D/g, '');
        if (cleanPhone) {
          const leadSearch = await pool.query(
            'SELECT id FROM "Lead" WHERE phone = $1 OR phone = $2 OR phone = $3 ORDER BY "createdAt" DESC LIMIT 1', 
            [cleanPhone, '55' + cleanPhone, cleanPhone.startsWith('55') ? cleanPhone.substring(2) : cleanPhone]
          );
          
          if (leadSearch.rows.length > 0) {
            await pool.query(
              'UPDATE "Lead" SET status = $1, tags = $2, "productName" = $3, "updatedAt" = NOW() WHERE id = $4', 
              ['Venda Concluída', [tipoVenda], produto, leadSearch.rows[0].id]
            );
          }
        }
      }
    }

    console.log(`[SYNC] Sincronizacao concluida. Novas vendas: ${countNew}`);
    return { newSales: countNew, totalProcessed: sales.length };
  } catch (err) {
    console.error('[SYNC] Erro ao sincronizar:', err);
    throw err;
  }
}

app.use(cors({ 
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'] 
}));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toLocaleTimeString()}] CHAMADA RECEBIDA: ${req.method} ${req.url}`);
  next();
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

// Rota de Saúde
app.get('/health', (req, res) => res.json({ status: 'online', db: 'connected' }));

// ---------------------------------------------------------
// PERFIL DA EMPRESA (PÁGINA META)
// ---------------------------------------------------------
app.get('/api/company/profile', async (req, res) => {
  try {
    let profiles = {
      whatsapp: { name: 'Supercell AI', logoUrl: null },
      instagram: { name: 'Supercell AI', logoUrl: null }
    };

    // 1. Perfil WhatsApp (Z-API)
    const zapiInstance = (process.env.ZAPI_INSTANCE_ID || '').replace(/['"]/g, '').trim();
    const zapiToken = (process.env.ZAPI_INSTANCE_TOKEN || '').replace(/['"]/g, '').trim();
    const zapiClientToken = (process.env.ZAPI_CLIENT_TOKEN || '').replace(/['"]/g, '').trim();
    const companyPhone = (process.env.COMPANY_PHONE || '').replace(/\D/g, '');

    if (zapiInstance && zapiToken && companyPhone) {
      try {
        const photoRes = await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/profile-picture?phone=${companyPhone}`, {
          headers: { 'Client-Token': zapiClientToken }
        });
        const photoData = await photoRes.json();
        profiles.whatsapp.logoUrl = photoData.link || photoData.value || null;
      } catch (e) {
        console.error('[COMPANY PROFILE] Erro WhatsApp:', e.message);
      }
    }

    // 2. Perfil Instagram (Meta)
    const rawMetaToken = process.env.META_ACCESS_TOKEN || '';
    const META_TOKEN = rawMetaToken.trim().replace(/^["']|["']$/g, '');
    
    if (META_TOKEN) {
      try {
        const accountsRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${META_TOKEN}`);
        const accountsData = await accountsRes.json();
        if (accountsData.data && accountsData.data.length > 0) {
          const page = accountsData.data[0];
          const pageInfoRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=name,picture.type(large)&access_token=${page.access_token}`);
          const pageInfo = await pageInfoRes.json();
          profiles.instagram.name = pageInfo.name || profiles.instagram.name;
          profiles.instagram.logoUrl = pageInfo.picture?.data?.url || null;
        }
      } catch (e) {
        console.error('[COMPANY PROFILE] Erro Instagram:', e.message);
      }
    }

    res.json(profiles);
  } catch (err) {
    console.error('Erro ao buscar perfis da empresa:', err);
    res.status(500).json({ error: 'Falha ao buscar perfis' });
  }
});


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
  console.log('[META WEBHOOK] Objeto detectado:', body.object);

  // --- LÓGICA INSTAGRAM DIRECT ---
  if (body.object === 'instagram') {
    try {
      const entry = body.entry[0];
      if (entry.messaging && entry.messaging[0]) {
        const msg = entry.messaging[0];
        console.log('[DEBUG INSTAGRAM] Msg Object:', JSON.stringify(msg, null, 2));
        const senderId = msg.sender.id;
        const recipientId = msg.recipient.id;
        let igMessageText = msg.message?.text || '';
        const messageId = msg.message?.mid; // ID Único da Meta
        
        // Se não houver texto, verifica se há anexos (Mídia)
        if (!igMessageText && msg.message?.attachments) {
          const att = msg.message.attachments[0];
          if (att.type === 'image' || att.type === 'audio' || att.type === 'video') {
            igMessageText = `MEDIA:${att.type.toUpperCase()}:${att.payload.url}`;
          }
        }
        
        console.log('\n\n' + '='.repeat(50));
        console.log('🚨 EVENTO DE MENSAGEM DO INSTAGRAM! 🚨');
        fileLog(`EVENTO RECEBIDO: Sender=${senderId}, Recipient=${recipientId}, Msg=${igMessageText}`);

        // O token limpo para as chamadas de API
        const rawMetaToken = process.env.META_ACCESS_TOKEN || '';
        const META_TOKEN = rawMetaToken.trim().replace(/^["']|["']$/g, '');
        
        if (rawMetaToken !== META_TOKEN) {
          fileLog(`AVISO: Token precisou de limpeza. Original len=${rawMetaToken.length}, Limpo len=${META_TOKEN.length}`);
        }

        // 1. DETERMINAR QUEM É QUEM (Lead ou Página)
        // Se o sender for o mesmo ID que já temos em algum lead, é o lead.
        // Mas na primeira vez, não sabemos. Geralmente o entry.id é o ID da Página.
        const pageId = entry.id;
        const isFromPage = senderId === pageId;
        const leadIdForQuery = isFromPage ? recipientId : senderId;

        if (!META_TOKEN) {
          fileLog('ERRO: META_ACCESS_TOKEN não encontrado ou vazio!');
        }

        let name = `IG User ${leadIdForQuery.slice(-4)}`;
        let instagramHandle = null;
        let adName = 'Orgânico / Direct';
        let campaignName = 'Instagram Direct';
        let adsetName = 'Inbound';
        let profilePic = null;
        // Tenta buscar o perfil real no Instagram via Graph API
        try {
          if (META_TOKEN) {
            // 1. BUSCA O TOKEN DA PÁGINA (Fundamental para capturar perfis)
            const accountsRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${META_TOKEN}`);
            const accountsData = await accountsRes.json();
            
            let pageAccessToken = META_TOKEN; // Fallback
            if (accountsData.data && accountsData.data.length > 0) {
              // Pegamos o token da primeira página vinculada (geralmente a única)
              pageAccessToken = accountsData.data[0].access_token;
              console.log(`[DEBUG TOKEN] Trocado System Token por Page Token da página: ${accountsData.data[0].name}`);
            } else {
              console.log(`[DEBUG TOKEN] Aviso: Nenhuma página encontrada vinculada a este token. Usando token original.`);
            }

            const userUrl = `https://graph.facebook.com/v19.0/${leadIdForQuery}?fields=name,username,profile_pic&access_token=${pageAccessToken}`;
            console.log(`[DEBUG PERFIL] Tentando capturar perfil de: ${leadIdForQuery}`);
            
            const userRes = await fetch(userUrl);
            const userData = await userRes.json();

            console.log(`[DEBUG PERFIL] Resposta Meta:`, JSON.stringify(userData));
            
            if (userData.name || userData.profile_pic || userData.username) {
              if (userData.profile_pic) profilePic = userData.profile_pic;
              if (userData.name) name = userData.name;
              if (userData.username) instagramHandle = userData.username;
              fileLog(`✅ Perfil capturado com sucesso: ${name}`);
            } else if (userData.error) {
              fileLog(`Aviso: Falha na captura: ${userData.error.message}`);
            }
          }
        } catch (err) {
          fileLog(`FALHA CRÍTICA API: ${err.message}`);
          console.error(`[DEBUG PERFIL] Erro:`, err.message);
        }

        // Detecta se é Tráfego Pago ou Orgânico
        let tags = ['Tráfego Orgânico'];
        if (msg.ads_context_data) {
          tags = ['Tráfego Pago'];
          adName = msg.ads_context_data.ad_title || adName;
          campaignName = msg.ads_context_data.campaign_name || campaignName;
        }

        const existingLead = await pool.query('SELECT id, name, "instagramHandle", "profilePic", status, tags FROM "Lead" WHERE phone = $1', [leadIdForQuery]);
        let leadId;

        const accountRes = await pool.query('SELECT id FROM "AdAccount" WHERE status = \'ACTIVE\' LIMIT 1');
        const targetAccountId = accountRes.rows[0]?.id;
        
        if (!targetAccountId) {
          console.log('[DEBUG INSTAGRAM] Nenhuma conta ATIVA encontrada, lead será criado sem vínculo.');
        }

        if (existingLead.rows.length > 0) {
          leadId = existingLead.rows[0].id;
          const currentName = existingLead.rows[0].name || '';
          const currentHandle = existingLead.rows[0].instagramHandle;
          const currentPic = existingLead.rows[0].profilePic;

          console.log('[DEBUG INSTAGRAM] Lead Existente encontrado:', leadId);
          
          // Atualizamos o perfil se os dados novos forem reais (não genéricos) ou se as tags mudaram para Pago
          const isGeneric = currentName.startsWith('IG User');
          const isNowPaid = tags.includes('Tráfego Pago') && !existingLead.rows[0].tags?.includes('Tráfego Pago');
          const hasNewData = (isGeneric && !name.startsWith('IG User')) || (!currentHandle && instagramHandle) || (!currentPic && profilePic) || isNowPaid;

          let newStatus = existingLead.rows[0].status;
          if (isFromPage && newStatus === 'Novo') {
            newStatus = 'Em Atendimento';
            console.log('[DEBUG INSTAGRAM] Mudando status para Em Atendimento (Resposta do Agente via Webhook)');
          }

          if (hasNewData || newStatus !== existingLead.rows[0].status) {
            console.log('[DEBUG INSTAGRAM] Atualizando Perfil/Status do Lead:', { name, instagramHandle, profilePic, tags, newStatus });
            
            // Se agora é pago, mesclamos as tags ou substituímos se for a tag de origem
            let updatedTags = existingLead.rows[0].tags || [];
            if (isNowPaid) {
              updatedTags = updatedTags.filter(t => t !== 'Tráfego Orgânico');
              if (!updatedTags.includes('Tráfego Pago')) updatedTags.push('Tráfego Pago');
            }

            await pool.query(
              'UPDATE "Lead" SET name = $1, "instagramHandle" = $2, "profilePic" = $3, status = $4, "lastInteractionAt" = NOW(), "updatedAt" = NOW(), tags = $5 WHERE id = $6',
              [name || currentName, instagramHandle || currentHandle, profilePic || currentPic, newStatus, updatedTags, leadId]
            );
          } else {
            await pool.query(
              'UPDATE "Lead" SET "lastInteractionAt" = NOW(), "updatedAt" = NOW() WHERE id = $1',
              [leadId]
            );
          }

          // GATILHO DE PALAVRA-CHAVE (AGENTE)
          if (isFromPage && igMessageText) {
            const normalizedMsg = igMessageText.toLowerCase().trim();
            if (normalizedMsg.includes('você precisa vir na loja')) {
              console.log('[AUTO STATUS] Gatilho detectado: Movendo para Qualificado');
              await pool.query('UPDATE "Lead" SET status = $1, "updatedAt" = NOW() WHERE id = $2', ['Qualificado', leadId]);
            }
          }
        } else {
          // Só criamos lead se não for a página falando primeiro (improvável no direct)
          console.log('[DEBUG INSTAGRAM] Criando Novo Lead com Tags:', tags);
          const leadRes = await pool.query(
            'INSERT INTO "Lead" (id, name, phone, status, "adAccountId", "adName", "adsetName", "campaignName", "platform", "instagramHandle", "profilePic", tags, "createdAt", "updatedAt", "lastInteractionAt") VALUES (gen_random_uuid(), $1, $2, \'Novo\', $3, $4, $5, $6, \'instagram\', $7, $8, $9, NOW(), NOW(), NOW()) RETURNING id',
            [name, leadIdForQuery, targetAccountId, adName, adsetName, campaignName, instagramHandle, profilePic, tags]
          );
          leadId = leadRes.rows[0].id;
          console.log('[DEBUG INSTAGRAM] Novo Lead Criado:', leadId);
        }
          
        if (igMessageText) {
          const messageSender = isFromPage ? 'agent' : 'lead';
          
          // DEDUPLICAÇÃO DEFINITIVA VIA MID
          const result = await pool.query(
            'INSERT INTO "Message" (id, content, sender, "leadId", "createdAt", mid) VALUES (gen_random_uuid(), $1, $2, $3, NOW(), $4) ON CONFLICT (mid) DO NOTHING RETURNING id',
            [igMessageText, messageSender, leadId, messageId]
          );

          // Se houve inserção (result.rows.length > 0) e é do cliente, incrementa o contador
          if (result.rows.length > 0 && !isFromPage) {
            await pool.query('UPDATE "Lead" SET "hasUnread" = TRUE, "unreadCount" = "unreadCount" + 1 WHERE id = $1', [leadId]);
          }
        }
        console.log(`✅ Mensagem Instagram Processada (${isFromPage ? 'Agente' : 'Lead'}): ${name}`);
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
      let tags = ['Tráfego Orgânico'];

      if (message.referral) {
        detectedAdId = message.referral.source_id;
        console.log(`[WA WEBHOOK] Lead vindo do anúncio: ${detectedAdId}`);
        
        try {
          tags = ['Tráfego Pago'];
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

      if (true) {
        const leadRes = await pool.query(
          `INSERT INTO "Lead" (id, name, phone, status, "adAccountId", "adName", "adsetName", "campaignName", "platform", tags, "createdAt", "updatedAt", "lastInteractionAt") 
           VALUES (gen_random_uuid(), $1, $2, 'Novo', $3, $4, $5, $6, 'whatsapp', $7, NOW(), NOW(), NOW())
           ON CONFLICT (phone) DO UPDATE SET "lastInteractionAt" = NOW(), "updatedAt" = NOW(), tags = EXCLUDED.tags RETURNING id`,
          [name, phone, targetAccountId, adName, adsetName, campaignName, tags]
        );
        const leadId = leadRes.rows[0].id;

        // Salva a mensagem recebida no histórico (Deduplicação via mid)
        let messageText = message.text?.body || 'Mensagem de Mídia/Arquivo';
        const waMessageId = message.id; // ID Único WhatsApp

        // Detecção de Mídia WhatsApp
        if (message.type === 'image' || message.type === 'audio' || message.type === 'video' || message.type === 'voice') {
          const type = message.type === 'voice' ? 'AUDIO' : message.type.toUpperCase();
          const mediaId = message[message.type]?.id;
          messageText = `MEDIA:${type}:ID:${mediaId}`;
        }

        const resultWA = await pool.query(
          'INSERT INTO "Message" (id, content, sender, "leadId", "createdAt", mid) VALUES (gen_random_uuid(), $1, \'lead\', $2, NOW(), $3) ON CONFLICT (mid) DO NOTHING RETURNING id',
          [messageText, leadId, waMessageId]
        );

        if (resultWA.rows.length > 0) {
          // Incrementa contador se for mensagem nova
          await pool.query('UPDATE "Lead" SET "hasUnread" = TRUE, "unreadCount" = "unreadCount" + 1 WHERE id = $1', [leadId]);
        }
            console.log(`✅ Lead WhatsApp Atualizado/Salvo: ${name} (${phone})`);
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
// Z-API WEBHOOK (WHATSAPP)
// ---------------------------------------------------------
app.post('/api/webhooks/zapi', async (req, res) => {
  try {
    const body = req.body;
    // Ignora eventos de status de mensagem para não poluir o log, foca em mensagens e conexão
    if (body.type === 'message-received' || body.type === 'message-sent' || body.type === 'connected') {
       console.log(`[Z-API WEBHOOK] Evento: ${body.type} de ${body.phone || 'Sistema'}`);
    }

    if (body.text || body.image || body.audio || body.video || body.document) {
      const phone = body.phone;
      const isFromMe = body.fromMe;
      const messageText = body.text?.message || (body.image ? '📷 Imagem' : body.audio ? '🎵 Áudio' : body.video ? '🎥 Vídeo' : 'Arquivo');
      const waMessageId = body.messageId;
      const customerName = body.waitingMessage ? 'Cliente WhatsApp' : (body.senderName || 'Cliente WhatsApp');
      let profilePic = body.senderPhoto || null;

      // Se a foto não veio no webhook, tentamos buscar manualmente na Z-API
      if (!profilePic) {
        try {
          const zapiInstance = (process.env.ZAPI_INSTANCE_ID || '').replace(/['"]/g, '').trim();
          const zapiToken = (process.env.ZAPI_INSTANCE_TOKEN || '').replace(/['"]/g, '').trim();
          const zapiClientToken = (process.env.ZAPI_CLIENT_TOKEN || '').replace(/['"]/g, '').trim();
          
          // Z-API prefere o número limpo sem @c.us na busca de foto
          const cleanPhoneForPhoto = phone.split('@')[0];
          const photoRes = await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/profile-picture?phone=${cleanPhoneForPhoto}`, {
            headers: { 'Client-Token': zapiClientToken }
          });
          const photoData = await photoRes.json();
          if (photoData.link || photoData.value) {
            profilePic = photoData.link || photoData.value;
            console.log(`[Z-API PHOTO] Foto capturada manualmente para ${phone}`);
          }
        } catch (e) {
          console.error(`[Z-API PHOTO ERROR] Falha ao buscar foto para ${phone}`);
        }
      }

      let targetAccountId = null;
      const accountRes = await pool.query('SELECT id FROM "AdAccount" WHERE status = \'ACTIVE\' LIMIT 1');
      if (accountRes.rows.length > 0) targetAccountId = accountRes.rows[0].id;

      const leadRes = await pool.query(
        `INSERT INTO "Lead" (id, name, phone, status, "adAccountId", "adName", "adsetName", "campaignName", "platform", tags, "createdAt", "updatedAt", "lastInteractionAt", "profilePic") 
         VALUES (gen_random_uuid(), $1, $2, 'Novo', $3, 'Direto/Z-API', 'Inbound', 'Z-API', 'whatsapp', $4, NOW(), NOW(), NOW(), $5)
         ON CONFLICT (phone) DO UPDATE SET 
           "lastInteractionAt" = NOW(), 
           "updatedAt" = NOW(),
           "profilePic" = COALESCE(EXCLUDED."profilePic", "Lead"."profilePic"),
           name = CASE WHEN "Lead".name = 'Cliente WhatsApp' THEN EXCLUDED.name ELSE "Lead".name END
         RETURNING id, status`,
        [customerName, phone, targetAccountId, ['Tráfego Orgânico'], profilePic]
      );
      
      const leadId = leadRes.rows[0].id;
      const currentStatus = leadRes.rows[0].status;

      const resultWA = await pool.query(
        'INSERT INTO "Message" (id, content, sender, "leadId", "createdAt", mid) VALUES (gen_random_uuid(), $1, $2, $3, NOW(), $4) ON CONFLICT (mid) DO NOTHING RETURNING id',
        [messageText, isFromMe ? 'agent' : 'lead', leadId, waMessageId]
      );

      if (resultWA.rows.length > 0 && !isFromMe) {
        // Tenta atualizar unreadCount, mas não trava se a coluna não existir
        try {
          await pool.query('UPDATE "Lead" SET "hasUnread" = TRUE, "unreadCount" = COALESCE("unreadCount", 0) + 1 WHERE id = $1', [leadId]);
        } catch (e) {
          await pool.query('UPDATE "Lead" SET "hasUnread" = TRUE WHERE id = $1', [leadId]);
        }
      } else if (isFromMe && currentStatus === 'Novo') {
        await pool.query('UPDATE "Lead" SET status = \'Em Atendimento\', "updatedAt" = NOW() WHERE id = $1', [leadId]);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ [Z-API WEBHOOK] Erro Crítico:', err.message);
    res.sendStatus(500);
  }
});

// ---------------------------------------------------------
// Z-API MANAGEMENT
// ---------------------------------------------------------
app.get('/api/whatsapp/status', async (req, res) => {
  const zapiInstance = (process.env.ZAPI_INSTANCE_ID || '').replace(/['"]/g, '').trim();
  const zapiToken = (process.env.ZAPI_INSTANCE_TOKEN || '').replace(/['"]/g, '').trim();
  const zapiClientToken = (process.env.ZAPI_CLIENT_TOKEN || '').replace(/['"]/g, '').trim();

  console.log(`[Z-API STATUS] Verificando instância ${zapiInstance}`);

  try {
    const response = await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/status`, {
      headers: { 'Client-Token': zapiClientToken }
    });
    const data = await response.json();
    console.log(`[Z-API STATUS] Resposta:`, data);
    
    res.json({
      instance: {
        state: data.connected ? 'open' : 'disconnected'
      },
      ...data
    });
  } catch (err) {
    console.error(`[Z-API STATUS ERROR]`, err.message);
    res.status(500).json({ error: 'Erro ao verificar status do WhatsApp', details: err.message });
  }
});

app.get('/api/whatsapp/qrcode', async (req, res) => {
  const zapiInstance = (process.env.ZAPI_INSTANCE_ID || '').replace(/['"]/g, '').trim();
  const zapiToken = (process.env.ZAPI_INSTANCE_TOKEN || '').replace(/['"]/g, '').trim();
  const zapiClientToken = (process.env.ZAPI_CLIENT_TOKEN || '').replace(/['"]/g, '').trim();

  const url = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/qr-code`;
  console.log(`[Z-API QRCODE] Chamando URL: ${url}`);

  try {
    const response = await fetch(url, {
      headers: { 'Client-Token': zapiClientToken }
    });
    const data = await response.json();
    console.log(`[Z-API QRCODE] Resposta:`, data.value ? 'QR Code Recebido (Base64)' : data);

    if (data.value) {
      return res.json({ qrcode: data.value });
    }

    if (data.connected) {
      return res.json({ status: 'connected', message: 'WhatsApp já está conectado!' });
    }

    res.json({ 
      status: 'pending', 
      message: 'Aguardando geração do QR Code pela Z-API.' 
    });

  } catch (err) {
    console.error('[Z-API QRCODE ERROR]', err.message);
    res.status(500).json({ error: 'Erro ao buscar QR Code na Z-API', details: err.message });
  }
});

app.post('/api/whatsapp/logout', async (req, res) => {
  const zapiInstance = (process.env.ZAPI_INSTANCE_ID || '').replace(/['"]/g, '').trim();
  const zapiToken = (process.env.ZAPI_INSTANCE_TOKEN || '').replace(/['"]/g, '').trim();
  const zapiClientToken = (process.env.ZAPI_CLIENT_TOKEN || '').replace(/['"]/g, '').trim();

  try {
    console.log(`[Z-API LOGOUT] Desconectando ${zapiInstance}`);
    await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/disconnect`, {
      method: 'GET',
      headers: { 'Client-Token': zapiClientToken }
    });
    res.json({ success: true, message: 'Instância desconectada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desconectar instância' });
  }
});

// Configura o webhook automaticamente na Z-API
app.post('/api/whatsapp/setup-webhook', async (req, res) => {
  const { webhookUrl } = req.body;
  const zapiInstance = (process.env.ZAPI_INSTANCE_ID || '').replace(/['"]/g, '').trim();
  const zapiToken = (process.env.ZAPI_INSTANCE_TOKEN || '').replace(/['"]/g, '').trim();
  const zapiClientToken = (process.env.ZAPI_CLIENT_TOKEN || '').replace(/['"]/g, '').trim();

  if (!zapiInstance || !zapiToken || !webhookUrl) {
    return res.status(400).json({ error: 'Faltam parâmetros para configurar o webhook' });
  }

  try {
    console.log(`[Z-API SETUP] Configurando Webhook: ${webhookUrl}/api/webhooks/zapi`);
    const endpoints = [
      'update-webhook-received',
      'update-webhook-connected',
      'update-webhook-disconnected',
      'update-webhook-message-status'
    ];

    for (const endpoint of endpoints) {
      await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Client-Token': zapiClientToken
        },
        body: JSON.stringify({ value: `${webhookUrl}/api/webhooks/zapi` })
      });
    }

    res.json({ success: true, message: 'Webhooks configurados na Z-API' });
  } catch (err) {
    console.error('[Z-API SETUP ERROR]', err.message);
    res.status(500).json({ error: 'Erro ao configurar webhooks' });
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
    accountsToPull = q.rows.map(row => ({ ...row, accessToken: decrypt(row.accessToken) }));
  } else {
    const q = await pool.query('SELECT a."actId", b."accessToken" FROM "AdAccount" a JOIN "BusinessManager" b ON a."bmId" = b.id');
    accountsToPull = q.rows.map(row => ({ ...row, accessToken: decrypt(row.accessToken) }));
  }

  // 2. Mapeamento de Datas
  let metaPeriod = 'today';
  if (periodo === '7dias') metaPeriod = 'last_7d';
  if (periodo === 'mes') metaPeriod = 'last_30d'; // Ajustado para 30 dias conforme solicitado anteriormente
  if (periodo === 'ontem') metaPeriod = 'yesterday';
  if (periodo === 'maximo') metaPeriod = 'maximum';
  if (periodo === 'personalizado' && dateStart && dateEnd) {
    const start = dateStart.split('T')[0];
    const end = dateEnd.split('T')[0];
    metaPeriod = `{"since":"${start}","until":"${end}"}`;
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
    
    // Função recursiva para lidar com paginação da Meta (essencial para períodos longos como "Máximo")
    const fetchAllInsights = async (url) => {
      try {
        const response = await fetch(url);
        const fbRes = await response.json();
        
        if (fbRes.error) {
          metaApiError = fbRes.error.message;
          return;
        }

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
            metrics.frequency = (metrics.frequency + parseFloat(stats.frequency || 0)) / (metrics.frequency > 0 ? 2 : 1);
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
                if (type === 'link_click') metrics.shares += val;
                if (type === 'video_view' || type === 'video_p25_watched_actions') metrics.video25 += val;
                if (type === 'video_p50_watched_actions') metrics.video50 += val;
                if (type === 'video_p75_watched_actions') metrics.video75 += val;
                if (type === 'video_p100_watched_actions') metrics.video100 += val;
              });
            }
          });

          // Se houver próxima página, busca recursivamente
          if (fbRes.paging && fbRes.paging.next) {
            await fetchAllInsights(fbRes.paging.next);
          }
        }
      } catch (err) {
        metaApiError = "Erro ao processar dados da Meta.";
      }
    };

    const initialUrl = `https://graph.facebook.com/v19.0/${fetchId}/insights?fields=spend,actions,action_values,reach,impressions,clicks,frequency,unique_clicks,unique_ctr&date_preset=${metaPeriod.includes('since') ? '' : metaPeriod}&time_range=${metaPeriod.includes('since') ? metaPeriod : ''}&time_increment=1&limit=500&access_token=${acc.accessToken}`;
    
    await fetchAllInsights(initialUrl);

    try {
      const campUrl = `https://graph.facebook.com/v19.0/${fetchId}/campaigns?fields=status&access_token=${acc.accessToken}`;
      const campRes = await fetch(campUrl).then(r => r.json());
      if(campRes.data) campRes.data.forEach(c => c.status === 'ACTIVE' ? metrics.activeCamps++ : metrics.pausedCamps++);
    } catch (err) { 
      console.error('Erro ao buscar status de campanhas:', err);
    }
  }

  // Vendas PDV
  let wherePDV = "";
  let paramsPDV = [];

  const getLocalTodayRange = () => {
    const start = new Date();
    start.setHours(0,0,0,0);
    const end = new Date();
    end.setHours(23,59,59,999);
    return [start, end];
  };

  const getLocalYesterdayRange = () => {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(0,0,0,0);
    const end = new Date();
    end.setDate(end.getDate() - 1);
    end.setHours(23,59,59,999);
    return [start, end];
  };

  if (periodo === 'personalizado' && dateStart && dateEnd) {
      wherePDV = 'WHERE "createdAt" >= $1 AND "createdAt" <= $2';
      paramsPDV = [new Date(dateStart), new Date(dateEnd)];
  } else if (periodo === 'hoje') { 
      const [start, end] = getLocalTodayRange();
      wherePDV = 'WHERE "createdAt" >= $1 AND "createdAt" <= $2'; 
      paramsPDV = [start, end];
  }
  else if (periodo === '7dias') { 
      const start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0,0,0,0);
      const end = new Date();
      end.setHours(23,59,59,999);
      wherePDV = 'WHERE "createdAt" >= $1 AND "createdAt" <= $2'; 
      paramsPDV = [start, end];
  }
  else if (periodo === 'mes') { 
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0,0,0,0);
      const end = new Date();
      end.setHours(23,59,59,999);
      wherePDV = 'WHERE "createdAt" >= $1 AND "createdAt" <= $2'; 
      paramsPDV = [start, end];
  }
  else if (periodo === 'ontem') { 
      const [start, end] = getLocalYesterdayRange();
      wherePDV = 'WHERE "createdAt" >= $1 AND "createdAt" <= $2'; 
      paramsPDV = [start, end];
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

// Sincronizacao periodica a cada 15 minutos com o MercadoPhone
cron.schedule('*/15 * * * *', async () => {
  try {
    console.log('[CRON] Iniciando sincronizacao agendada do MercadoPhone...');
    await syncMercadoPhoneSales(200);
  } catch (err) {
    console.error('[CRON] Erro na sincronizacao agendada:', err);
  }
});

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
  const lastUserMessage = messages[messages.length - 1]?.content;

  try {
    // Sincronizacao rapida preventiva antes de carregar metricas e responder pelo Jarvis
    try {
      await syncMercadoPhoneSales(100);
    } catch (e) {
      console.error('[JARVIS] Erro na sincronizacao preventiva:', e.message);
    }

    // 1. Salva a última mensagem do usuário se for nova (e não for um comando de sistema/saudação)
    const isSystemCommand = lastUserMessage && (lastUserMessage.includes('Aja como se o sistema tivesse acabado de ser ativado') || lastUserMessage.includes('[FALA]'));
    
    if (lastUserMessage && !isSystemCommand) {
      await pool.query('INSERT INTO "JarvisMessage" (role, content) VALUES ($1, $2)', ['user', lastUserMessage]);
    }

    // 2. Busca histórico RECENTE do banco para dar contexto real (Memória Permanente)
    const historyRes = await pool.query('SELECT role, content FROM "JarvisMessage" ORDER BY "createdAt" DESC LIMIT 20');
    const dbHistory = historyRes.rows.reverse();

    // Mescla histórico do banco com as mensagens atuais da sessão (evita duplicidade e garante contexto)
    // Para simplificar e garantir precisão, vamos usar o dbHistory como base + a mensagem atual
    const contextualMessages = dbHistory;

    // Busca config de IA do banco
    const aiConfigRes = await pool.query('SELECT * FROM "AiConfig" WHERE id = $1', ['default']);
    const config = aiConfigRes.rows[0] || {};
    const systemPrompt = config.systemPrompt;
    const selectedModel = config.model || "gpt-4o";

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
    
    // CONTAGEM EM TEMPO REAL DO CRM (PARA TODOS OS PERÍODOS)
    const getLocalTodayRange = () => {
      const start = new Date();
      start.setHours(0,0,0,0);
      const end = new Date();
      end.setHours(23,59,59,999);
      return [start, end];
    };

    const getLocalYesterdayRange = () => {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0,0,0,0);
      const end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23,59,59,999);
      return [start, end];
    };

    const [todayStart, todayEnd] = getLocalTodayRange();
    const [yesterdayStart, yesterdayEnd] = getLocalYesterdayRange();

    const start7d = new Date();
    start7d.setDate(start7d.getDate() - 7);
    start7d.setHours(0,0,0,0);

    const start30d = new Date();
    start30d.setDate(start30d.getDate() - 30);
    start30d.setHours(0,0,0,0);

    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0,0,0,0);

    const leadsHojeDB = await pool.query('SELECT COUNT(*) FROM "Lead" WHERE "createdAt" >= $1 AND "createdAt" <= $2', [todayStart, todayEnd]).then(r => parseInt(r.rows[0].count));
    const leadsOntemDB = await pool.query('SELECT COUNT(*) FROM "Lead" WHERE "createdAt" >= $1 AND "createdAt" <= $2', [yesterdayStart, yesterdayEnd]).then(r => parseInt(r.rows[0].count));
    const leads7DiasDB = await pool.query('SELECT COUNT(*) FROM "Lead" WHERE "createdAt" >= $1', [start7d]).then(r => parseInt(r.rows[0].count));
    const leads30DiasDB = await pool.query('SELECT COUNT(*) FROM "Lead" WHERE "createdAt" >= $1', [start30d]).then(r => parseInt(r.rows[0].count));
    const leadsMesDB = await pool.query('SELECT COUNT(*) FROM "Lead" WHERE "createdAt" >= $1', [startMonth]).then(r => parseInt(r.rows[0].count));

    const salesToday = await pool.query('SELECT COUNT(*) FROM "Sale" WHERE "createdAt" >= $1 AND "createdAt" <= $2', [todayStart, todayEnd]).then(r => parseInt(r.rows[0].count));
    
    const recentLeadsRes = await pool.query(`
      SELECT l.name, l.status, l.platform,
        (
          SELECT string_agg(UPPER(m.sender) || ': ' || m.content, ' | ' ORDER BY m.idx ASC)
          FROM (
            SELECT sender, content, "createdAt" as idx 
            FROM "Message" 
            WHERE "leadId" = l.id 
            ORDER BY "createdAt" DESC 
            LIMIT 10
          ) m
        ) as "chatHistory"
      FROM "Lead" l 
      ORDER BY l."lastInteractionAt" DESC LIMIT 5
    `);
    const recentSalesRes = await pool.query(`
      SELECT s.*, 
             l.platform as lead_platform, 
             l."campaignName" as lead_campaign
      FROM "Sale" s
      LEFT JOIN "Lead" l ON s."telefoneCliente" = l.phone
      ORDER BY s."createdAt" DESC LIMIT 10
    `);
    
    // Função auxiliar para formatar métricas completas para o Jarvis
    const formatFullMetrics = (d, contatosReais = null) => {
      const m = d.metrics;
      const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      const cpc = m.clicks > 0 ? m.totalSpent / m.clicks : 0;
      const roas = m.totalSpent > 0 ? d.pdv.faturamento / m.totalSpent : 0;
      return {
        gasto: Number(m.totalSpent).toFixed(2),
        leads_facebook: Number(m.msgConversations),
        contatos_crm: contatosReais !== null ? contatosReais : 'N/A',
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
        hoje: formatFullMetrics(metricsHoje, leadsHojeDB),
        ontem: formatFullMetrics(metricsOntem, leadsOntemDB),
        ultimos7Dias: formatFullMetrics(metrics7Dias, leads7DiasDB),
        ultimos30Dias: formatFullMetrics(metrics30Dias, leads30DiasDB),
        mesAtual: formatFullMetrics(metricsMes, leadsMesDB)
      },
      campaigns: campaignsContext,
      integrations: {
        metaAds: metricsHoje.metaApiError ? `ERRO: ${metricsHoje.metaApiError}` : "Conectado e Operacional",
        pdv: recentSalesRes.rows.some(s => s.canalVenda === 'MercadoPhone') ? "Ativo (Vendas Recentes Detectadas)" : "Aguardando Primeiras Vendas",
        brain: !!process.env.OPENAI_API_KEY ? "Conectado" : "Offline (Sem Chave API)"
      },
      recentLeads: recentLeadsRes.rows,
      recentSales: recentSalesRes.rows
    };

    const customGoals = await prisma.customGoal.findMany({ where: { active: true } });
    
    // Busca Base de Conhecimento ativa
    const kbFiles = await prisma.knowledgeFile.findMany({ where: { active: true } });
    const knowledgeContext = kbFiles.map(f => `### DOCUMENTO: ${f.fileName} ###\n${f.content}`).join('\n\n');

    const jarvisTextReply = await generateJarvisChatResponse(
      contextualMessages, 
      systemDiagnostics, 
      config, 
      selectedModel, 
      customGoals,
      knowledgeContext
    );
    
    // 3. Salva a resposta do Jarvis no banco (Memória Eterna) - Apenas se não for saudação automática
    if (!isSystemCommand) {
      await pool.query('INSERT INTO "JarvisMessage" (role, content) VALUES ($1, $2)', ['assistant', jarvisTextReply]);
    }

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

// NOVO: Endpoint para carregar o histórico do Jarvis (Memória de Longo Prazo)
app.get('/api/jarvis/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT role, content, "createdAt" FROM "JarvisMessage" ORDER BY "createdAt" ASC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar histórico do Jarvis:', err);
    res.status(500).json({ error: 'Falha ao carregar memória do Jarvis' });
  }
});

// NOVO: Endpoint para limpar todo o histórico do Jarvis
app.delete('/api/jarvis/history', async (req, res) => {
  try {
    await pool.query('DELETE FROM "JarvisMessage"');
    res.json({ message: 'Histórico expurgado com sucesso' });
  } catch (err) {
    console.error('Erro ao limpar histórico do Jarvis:', err);
    res.status(500).json({ error: 'Falha ao limpar memória do Jarvis' });
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
        test_event_code: process.env.META_TEST_EVENT_CODE
      })
    });
    console.log('✅ Evento CAPI enviado para Meta!');
  } catch (err) {
    console.error('❌ Erro ao enviar CAPI:', err);
  }
};

app.post('/api/webhooks/mercadophone', async (req, res) => {
  // Aceita variações de nomes de campos para maior compatibilidade
  const body = req.body;
  const telefoneCliente = body.telefoneCliente || body.telefone || body.phone;
  const nomeCliente = body.nomeCliente || body.nome || body.customer_name;
  const vendedor = body.vendedor || body.seller_name || body.vendedor_nome;
  const produto = body.produto || body.product_name || body.item;
  const valorTotal = body.valorTotal || body.valor || body.amount || body.total;
  const lucro = body.lucro || body.profit || (parseFloat(valorTotal) * 0.2);
  const canalVenda = body.canalVenda || body.canal_venda || body.canal || body.channel || 'MercadoPhone';
  const tipoVenda = body.tipoVenda || body.tipo_venda || body.origem || body.sale_type || 'Offline';
  const statusVenda = body.statusVenda || body.status_venda || body.status || 'Concluído';

  console.log('📡 [WEBHOOK MERCADOPHONE] Corpo Completo:', JSON.stringify(body, null, 2));

  if (!telefoneCliente || !valorTotal) {
    console.error('❌ [WEBHOOK MERCADOPHONE] Dados faltantes. Recebido:', body);
    return res.status(400).json({ error: 'Dados obrigatórios ausentes (telefoneCliente/telefone, valorTotal/valor)' });
  }

  try {
    // Trata o valorTotal caso venha como string formatada
    let cleanValue = valorTotal;
    if (typeof valorTotal === 'string') {
        cleanValue = parseFloat(valorTotal.replace('R$', '').replace(/\s/g, '').replace('.', '').replace(',', '.'));
    }

    const saleRes = await pool.query(
      'INSERT INTO "Sale" ("telefoneCliente", "nomeCliente", "vendedor", "produto", "valorTotal", "lucro", "canalVenda", "tipoVenda", "statusVenda") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [telefoneCliente, nomeCliente, vendedor, produto, cleanValue, lucro, canalVenda, tipoVenda, statusVenda]
    );

    // Lógica Inteligente de Cruzamento de Leads
    const cleanPhone = telefoneCliente.replace(/\D/g, '');
    const leadRes = await pool.query(
      'SELECT platform, id FROM "Lead" WHERE phone = $1 OR phone = $2 OR phone = $3 ORDER BY "createdAt" DESC LIMIT 1', 
      [cleanPhone, '55' + cleanPhone, cleanPhone.startsWith('55') ? cleanPhone.substring(2) : cleanPhone]
    );

    if (leadRes.rows.length > 0) {
      console.log(`🎯 [WEBHOOK] Lead encontrado (${leadRes.rows[0].id}). Atualizando status...`);
      
      console.log(`🎯 [WEBHOOK] Lead encontrado (${leadRes.rows[0].id}). Sincronizando dados dinâmicos do PDV...`);
      
      // Atualiza o Lead: Status, Tag (Tipo de Venda) e Nome do Produto
      await pool.query(
        'UPDATE "Lead" SET status = $1, tags = $2, "productName" = $3, "updatedAt" = NOW() WHERE id = $4', 
        ['Venda Concluída', [tipoVenda], produto, leadRes.rows[0].id]
      );
    } else {
      console.log(`⚠️ [WEBHOOK] Nenhum lead correspondente para o telefone: ${cleanPhone}`);
    }

    // 3. Envia para Meta CAPI (se o Pixel ID estiver configurado)
    const pixelId = process.env.META_PIXEL_ID;
    if (pixelId) {
      const cleanPhone = telefoneCliente.replace(/\D/g, '');
      const crypto = await import('crypto');
      const hashedPhone = crypto.createHash('sha256').update(cleanPhone).digest('hex');
      const eventData = {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        user_data: {
          ph: [hashedPhone]
        },
        custom_data: {
          value: parseFloat(cleanValue),
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

// NOVO: Endpoint de Estatísticas do PDV (Espelho MercadoPhone)
app.get('/api/pdv/dashboard', async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    const localDateStr = localDate.toISOString().split('T')[0];

    let dateFilter = 'WHERE "createdAt"::date = $1';
    let queryParams = [localDateStr];

    if (startDate && endDate) {
      dateFilter = 'WHERE "createdAt"::date BETWEEN $1 AND $2';
      queryParams = [startDate, endDate];
    } else if (startDate) {
      dateFilter = 'WHERE "createdAt"::date >= $1';
      queryParams = [startDate];
    }

    // Métricas do Período
    const statsRes = await pool.query(`
      SELECT 
        COALESCE(SUM("valorTotal"), 0) as faturamento,
        COUNT(*) as qtd_vendas,
        COALESCE(SUM("lucro"), 0) as lucro_total,
        CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM("valorTotal"), 0) / COUNT(*) ELSE 0 END as ticket_medio,
        CASE WHEN COALESCE(SUM("valorTotal"), 0) > 0 THEN (COALESCE(SUM("lucro"), 0) / COALESCE(SUM("valorTotal"), 1)) * 100 ELSE 0 END as perc_lucro
      FROM "Sale"
      ${dateFilter}
    `, queryParams);

    // Agrupamento por Tipo de Venda (Gráfico)
    const typeStats = await pool.query(`
      SELECT "tipoVenda" as name, COALESCE(SUM("valorTotal"), 0) as value
      FROM "Sale"
      ${dateFilter}
      GROUP BY "tipoVenda"
    `, queryParams);

    // Ranking de Vendedores
    const sellerStats = await pool.query(`
      SELECT vendedor as name, COUNT(*) as sales, COALESCE(SUM("valorTotal"), 0) as total
      FROM "Sale"
      ${dateFilter} AND vendedor IS NOT NULL
      GROUP BY vendedor
      ORDER BY total DESC
      LIMIT 5
    `, queryParams);

    // Top Produtos
    const productStats = await pool.query(`
      SELECT produto as name, COUNT(*) as count
      FROM "Sale"
      ${dateFilter} AND produto IS NOT NULL
      GROUP BY produto
      ORDER BY count DESC
      LIMIT 5
    `, queryParams);

    // Vendas do Período
    const recentSales = await pool.query(`
      SELECT * FROM "Sale" 
      ${dateFilter}
      ORDER BY "createdAt" DESC 
      LIMIT 20
    `, queryParams);

    res.json({
      metrics: statsRes.rows[0],
      byType: typeStats.rows,
      bySeller: sellerStats.rows,
      byProduct: productStats.rows,
      recentSales: recentSales.rows
    });
  } catch (err) {
    console.error('Erro no Dashboard PDV:', err);
    res.status(500).json({ error: 'Falha ao buscar dados do PDV' });
  }
});

app.get('/api/pdv/sync', async (req, res) => {
  try {
    const result = await syncMercadoPhoneSales(500);
    res.json({ status: 'success', new_sales: result.newSales, total_processed: result.totalProcessed });
  } catch (err) {
    console.error('[SYNC] Erro ao sincronizar pela rota:', err);
    res.status(500).json({ error: 'Falha na sincronizacao' });
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
  const { 
    systemPrompt, 
    model, 
    markupPerUnit, 
    targetConversionRate, 
    cpaThreshold, 
    ctrThreshold, 
    weeklyMessageGoal 
  } = req.body;
  
  try {
    const check = await pool.query('SELECT * FROM "AiConfig" WHERE id = $1', ['default']);
    if (check.rows.length === 0) {
        await pool.query(
            `INSERT INTO "AiConfig" (
                id, "systemPrompt", model, "markupPerUnit", 
                "targetConversionRate", "cpaThreshold", "ctrThreshold", 
                "weeklyMessageGoal", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
                'default', systemPrompt, model || 'gpt-4o', 
                markupPerUnit || 0, targetConversionRate || 0, 
                cpaThreshold || 0, ctrThreshold || 0, 
                weeklyMessageGoal || 0
            ]
        );
    } else {
        await pool.query(
            `UPDATE "AiConfig" SET 
                "systemPrompt" = $1, 
                "model" = $2, 
                "markupPerUnit" = $3, 
                "targetConversionRate" = $4, 
                "cpaThreshold" = $5, 
                "ctrThreshold" = $6, 
                "weeklyMessageGoal" = $7, 
                "updatedAt" = NOW() 
            WHERE id = $8`,
            [
                systemPrompt, model || 'gpt-4o', 
                markupPerUnit || 0, targetConversionRate || 0, 
                cpaThreshold || 0, ctrThreshold || 0, 
                weeklyMessageGoal || 0,
                'default'
            ]
        );
    }
    res.json({ message: 'Configuração salva com sucesso' });
  } catch (err) {
    console.error('Erro ao salvar config de IA:', err);
    res.status(500).json({ error: 'Erro ao salvar config de IA' });
  }
});

// --- Rotas de Metas Dinâmicas ---
app.get('/api/custom-goals', async (req, res) => {
  try {
    const goals = await pool.query('SELECT * FROM "CustomGoal" ORDER BY "createdAt" DESC');
    res.json(goals.rows);
  } catch (err) {
    console.error('Erro ao buscar metas dinâmicas:', err);
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
});

app.post('/api/custom-goals', async (req, res) => {
  const { name, value, unit, period } = req.body;
  try {
    const id = crypto.randomUUID();
    const result = await pool.query(
      'INSERT INTO "CustomGoal" (id, name, value, unit, period, active, "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
      [id, name, String(value), unit || null, period || null, true]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar meta dinâmica:', err);
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

app.delete('/api/custom-goals/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM "CustomGoal" WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar meta dinâmica:', err);
    res.status(500).json({ error: 'Erro ao deletar meta' });
  }
});

// --- Rotas de Base de Conhecimento ---
app.get('/api/knowledge', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, "fileName", "fileType", "createdAt", active FROM "KnowledgeFile" ORDER BY "createdAt" DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar base de conhecimento' });
  }
});

app.post('/api/knowledge/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  try {
    console.log('📂 [KNOWLEDGE] Recebido arquivo:', req.file.originalname, 'Tipo:', req.file.mimetype);
    let content = '';
    
    const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
    const isTxt = req.file.mimetype === 'text/plain' || req.file.originalname.toLowerCase().endsWith('.txt');

    if (isPdf) {
      console.log('📄 [KNOWLEDGE] Processando PDF...');
      if (!pdfParser) {
        throw new Error('O motor de leitura de PDF não está disponível no servidor.');
      }
      const parser = new pdfParser({ data: req.file.buffer });
      const result = await parser.getText();
      content = result.text;
    } else if (isTxt) {
      console.log('📝 [KNOWLEDGE] Processando TXT...');
      content = req.file.buffer.toString('utf-8');
    } else {
      console.warn('⚠️ [KNOWLEDGE] Formato não suportado:', req.file.mimetype, req.file.originalname);
      return res.status(400).json({ error: `Formato ${req.file.mimetype} não suportado. Use PDF ou TXT.` });
    }

    if (!content || content.trim().length === 0) {
      console.error('❌ [KNOWLEDGE] Conteúdo extraído vazio!');
      return res.status(400).json({ error: 'O arquivo parece estar vazio ou não pôde ser lido.' });
    }

    console.log(`✅ [KNOWLEDGE] Texto extraído (${content.length} caracteres). Salvando no banco...`);

    const id = crypto.randomUUID();
    const result = await pool.query(
      'INSERT INTO "KnowledgeFile" (id, "fileName", content, "fileType", active, "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, "fileName", "fileType", "createdAt"',
      [id, req.file.originalname, content, req.file.mimetype, true]
    );

    console.log('🎯 [KNOWLEDGE] Arquivo memorizado com sucesso! ID:', id);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ [KNOWLEDGE] Erro crítico no upload:', err);
    res.status(500).json({ error: `Erro ao processar arquivo: ${err.message}` });
  }
});

app.delete('/api/knowledge/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM "KnowledgeFile" WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar arquivo.' });
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
      'mes': 'last_30d',
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
        // 1. Desvincular Leads associados às AdAccounts desta BM (Para não perder os leads)
        await pool.query('UPDATE "Lead" SET "adAccountId" = NULL WHERE "adAccountId" IN (SELECT id FROM "AdAccount" WHERE "bmId" = $1)', [id]);

        // 2. Deletar AdAccounts da BM
        await pool.query('DELETE FROM "AdAccount" WHERE "bmId" = $1', [id]);
        
        // 3. Deletar a BM
        await pool.query('DELETE FROM "BusinessManager" WHERE id = $1', [id]);
        
        res.json({ message: 'BM e AdAccounts removidas com sucesso! Os leads foram preservados.' });
    } catch (err) {
        console.error('Erro ao remover BM:', err);
        res.status(500).json({ error: 'Erro ao remover BM e dados vinculados.' });
    }
});

app.get('/api/leads', async (req, res) => {
  try {
    // Primeiro limpamos nomes genéricos se houver handle (Correção retroativa)
    await pool.query(`UPDATE "Lead" SET name = "instagramHandle" WHERE name LIKE 'IG User%' AND "instagramHandle" IS NOT NULL`);
    
    const r = await pool.query(`
      SELECT l.*, a.name as "adAccountName",
        (SELECT content FROM "Message" WHERE "leadId" = l.id ORDER BY "createdAt" DESC LIMIT 1) as "lastMessage"
      FROM "Lead" l 
      LEFT JOIN "AdAccount" a ON l."adAccountId" = a.id 
      ORDER BY l."lastInteractionAt" DESC
    `);

    // Lógica de Temperatura em tempo real
    const now = new Date();
    const leadsComTemp = r.rows.map(lead => {
      const lastInt = new Date(lead.lastInteractionAt || lead.createdAt);
      const diffHours = (now - lastInt) / (1000 * 60 * 60);
      
      let currentTemp = 'Quente';
      if (diffHours > 48) currentTemp = 'Frio';
      else if (diffHours > 12) currentTemp = 'Morno';
      
      return { ...lead, temperature: currentTemp };
    });

    res.json(leadsComTemp);
  } catch (err) {
    console.error('Erro ao buscar leads:', err);
    res.status(500).json({ error: 'Erro ao buscar leads' });
  }
});

app.get('/api/leads/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const leadsHoje = await pool.query('SELECT COUNT(*) FROM "Lead" WHERE "createdAt"::date = $1', [today]);
    const vendasHoje = await pool.query('SELECT COUNT(*), SUM("valorTotal") FROM "Sale" WHERE "createdAt"::date = $1', [today]);
    
    // Calcula conversão geral (Simplificado)
    const totalLeads = await pool.query('SELECT COUNT(*) FROM "Lead"');
    const totalVendas = await pool.query('SELECT COUNT(*) FROM "Sale"');
    const conversao = totalLeads.rows[0].count > 0 ? (totalVendas.rows[0].count / totalLeads.rows[0].count) * 100 : 0;

    res.json({
      leadsHoje: parseInt(leadsHoje.rows[0].count),
      vendasHoje: parseInt(vendasHoje.rows[0].count),
      valorVendasHoje: parseFloat(vendasHoje.rows[0].sum || 0),
      conversao: conversao.toFixed(1)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

app.get('/api/media/:id', async (req, res) => {
  const { id } = req.params;
  const rawMetaToken = process.env.META_ACCESS_TOKEN || '';
  const META_TOKEN = rawMetaToken.trim().replace(/^["']|["']$/g, '');
  
  try {
    const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${id}?access_token=${META_TOKEN}`);
    const mediaData = await mediaRes.json();
    
    if (mediaData.url) {
      const downloadRes = await fetch(mediaData.url, {
        headers: { 'Authorization': `Bearer ${META_TOKEN}` }
      });
      const contentType = downloadRes.headers.get('Content-Type');
      res.setHeader('Content-Type', contentType);
      const buffer = await downloadRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    } else {
      res.status(404).json({ error: 'Mídia não encontrada' });
    }
  } catch (err) {
    console.error('Erro no proxy de mídia:', err);
    res.status(500).json({ error: 'Erro ao buscar mídia' });
  }
});

app.patch('/api/leads/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE "Lead" SET "hasUnread" = FALSE, "unreadCount" = 0 WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar status de leitura' });
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

app.patch('/api/leads/:id/tags', async (req, res) => {
  const { id } = req.params;
  const { tags } = req.body;
  try {
    await pool.query('UPDATE "Lead" SET tags = $1, "updatedAt" = NOW() WHERE id = $2', [tags, id]);
    res.json({ message: 'Tags atualizadas com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar tags' });
  }
});

app.post('/api/leads/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) return res.status(400).json({ error: 'Conteúdo da mensagem é obrigatório' });

  try {
    // 1. Busca o Lead para saber a plataforma e o ID de destino
    const leadRes = await pool.query('SELECT * FROM "Lead" WHERE id = $1', [id]);
    if (leadRes.rows.length === 0) return res.status(404).json({ error: 'Lead não encontrado' });

    const lead = leadRes.rows[0];
    const platform = lead.platform;
    const recipientId = lead.phone; // No Instagram, phone guarda o IGSID

    console.log(`[SEND MESSAGE] Enviando para ${lead.name} (${platform}) - ID: ${recipientId}`);

    // 2. Envio via API (Instagram)
    if (platform === 'instagram') {
      const rawMetaToken = process.env.META_ACCESS_TOKEN || '';
      const META_TOKEN = rawMetaToken.trim().replace(/^["']|["']$/g, '');

      // A) Precisamos do Token da PÁGINA, não o do Usuário/Sistema direto para enviar mensagens
      const accountsRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${META_TOKEN}`);
      const accountsData = await accountsRes.json();
      
      if (!accountsData.data || accountsData.data.length === 0) {
        console.error('[IG SEND ERROR] Nenhuma página vinculada ao token encontrada.');
        return res.status(500).json({ error: 'Falha na permissão: Nenhuma página Meta vinculada ao token.' });
      }

      const pageToken = accountsData.data[0].access_token;
      const pageId = accountsData.data[0].id;

      const url = `https://graph.facebook.com/v19.0/${pageId}/messages?access_token=${pageToken}`;
      const payload = {
        recipient: { id: recipientId },
        message: { text: content }
      };

      const fbRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const fbData = await fbRes.json();

      if (fbData.error) {
        console.error('[IG SEND ERROR]', fbData.error);
        return res.status(500).json({ error: 'Erro ao enviar mensagem via Instagram', details: fbData.error.message });
      }

      // Salva no banco com o message_id retornado para evitar duplicidade no echo
      const metaMid = fbData.message_id;
      const msgRes = await pool.query(
        'INSERT INTO "Message" (id, content, sender, "leadId", "createdAt", mid) VALUES (gen_random_uuid(), $1, \'agent\', $2, NOW(), $3) ON CONFLICT (mid) DO NOTHING RETURNING *',
        [content, id, metaMid]
      );
      
      // Automação de Status: Muda para 'Em Atendimento' se for a primeira resposta
      if (lead.status === 'Novo') {
        await pool.query('UPDATE "Lead" SET status = $1, "updatedAt" = NOW() WHERE id = $2', ['Em Atendimento', id]);
      }

      return res.json(msgRes.rows[0]);
    } else if (platform === 'whatsapp') {
      // Integração WhatsApp via Z-API
      const zapiInstance = (process.env.ZAPI_INSTANCE_ID || '').replace(/['"]/g, '').trim();
      const zapiToken = (process.env.ZAPI_INSTANCE_TOKEN || '').replace(/['"]/g, '').trim();
      const zapiClientToken = (process.env.ZAPI_CLIENT_TOKEN || '').replace(/['"]/g, '').trim();

      if (!zapiInstance || !zapiToken) {
        return res.status(500).json({ error: 'Z-API não configurada ou credenciais ausentes no .env' });
      }

      console.log(`[Z-API SEND] Enviando para ${recipientId}`);
      
      const sendUrl = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`;
      
      const waRes = await fetch(sendUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Client-Token': zapiClientToken
        },
        body: JSON.stringify({
          phone: recipientId,
          message: content
        })
      });

      const waData = await waRes.json();

      if (!waRes.ok) {
        console.error('[Z-API SEND ERROR]', waData);
        return res.status(500).json({ error: 'Erro ao enviar via Z-API', details: waData });
      }

      const waMid = waData.messageId || `zapi-${Date.now()}`;
      const msgRes = await pool.query(
        'INSERT INTO "Message" (id, content, sender, "leadId", "createdAt", mid) VALUES (gen_random_uuid(), $1, \'agent\', $2, NOW(), $3) ON CONFLICT (mid) DO NOTHING RETURNING *',
        [content, id, waMid]
      );
      
      if (lead.status === 'Novo') {
        await pool.query('UPDATE "Lead" SET status = $1, "updatedAt" = NOW() WHERE id = $2', ['Em Atendimento', id]);
      }

      return res.json(msgRes.rows[0]);
    }

    // 3. Salva no Histórico do Banco de Dados
    const msgRes = await pool.query(
      'INSERT INTO "Message" (id, content, sender, "leadId", "createdAt") VALUES (gen_random_uuid(), $1, \'agent\', $2, NOW()) RETURNING *',
      [content, id]
    );

    // 4. Automação de Status: Muda para 'Em Atendimento' se for a primeira resposta
    if (lead.status === 'Novo') {
      await pool.query('UPDATE "Lead" SET status = $1, "updatedAt" = NOW() WHERE id = $2', ['Em Atendimento', id]);
    }

    res.json(msgRes.rows[0]);
  } catch (err) {
    console.error('Erro ao processar envio de mensagem:', err);
    res.status(500).json({ error: 'Erro interno ao enviar mensagem' });
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

// Listar mensagens de um lead
app.get('/api/leads/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM "Message" WHERE "leadId" = $1 ORDER BY "createdAt" ASC', [id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HANDLER GLOBAL 404
app.use((req, res) => {
  console.log(`⚠️ Rota não encontrada: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Rota não encontrada no servidor backend', path: req.url });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
