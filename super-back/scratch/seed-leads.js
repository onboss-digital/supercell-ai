import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function seedLeads() {
  try {
    // Busca a primeira conta de anúncios disponível
    const accRes = await pool.query('SELECT id FROM "AdAccount" LIMIT 1');
    if (accRes.rows.length === 0) {
      console.error('Nenhuma conta de anúncios encontrada. Conecte uma BM primeiro.');
      return;
    }
    const adAccountId = accRes.rows[0].id;

    const leads = [
      {
        name: 'João Silva (Teste)',
        phone: '11999998888',
        status: 'Novo',
        temperature: 'Quente',
        platform: 'whatsapp',
        campaignName: 'Lançamento iPhone 15',
        adsetName: 'Público Geral SP',
        adName: 'Vídeo Reel v1'
      },
      {
        name: 'Maria Oliveira (Teste)',
        phone: '21988887777',
        status: 'Em Atendimento',
        temperature: 'Morno',
        platform: 'instagram',
        campaignName: 'Promoção Troca Smart',
        adsetName: 'Interesse Apple',
        adName: 'Estático Azul'
      },
      {
        name: 'Ricardo Souza (Teste)',
        phone: '31977776666',
        status: 'Qualificado',
        temperature: 'Quente',
        platform: 'whatsapp',
        campaignName: 'Lançamento iPhone 15',
        adsetName: 'Público Geral SP',
        adName: 'Carrossel v2'
      }
    ];

    for (const lead of leads) {
      await pool.query(
        'INSERT INTO "Lead" (id, name, phone, status, platform, "campaignName", "adsetName", "adName", "adAccountId", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())',
        [lead.name, lead.phone, lead.status, lead.platform, lead.campaignName, lead.adsetName, lead.adName, adAccountId]
      );
    }

    console.log('✅ 3 Leads de teste inseridos com sucesso!');
  } catch (e) {
    console.error('❌ ERRO ao inserir leads:', e.message);
  } finally {
    process.exit();
  }
}

seedLeads();
