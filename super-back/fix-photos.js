import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const zapiInstance = (process.env.ZAPI_INSTANCE_ID || '').replace(/['"]/g, '').trim();
const zapiToken = (process.env.ZAPI_INSTANCE_TOKEN || '').replace(/['"]/g, '').trim();
const zapiClientToken = (process.env.ZAPI_CLIENT_TOKEN || '').replace(/['"]/g, '').trim();

async function fixPhotos() {
  try {
    const leads = await pool.query('SELECT id, phone FROM "Lead" WHERE "profilePic" IS NULL AND platform = \'whatsapp\'');
    console.log(`Buscando fotos para ${leads.rows.length} leads...`);

    for (const lead of leads.rows) {
      const cleanPhone = lead.phone.split('@')[0];
      console.log(`- Buscando foto para ${cleanPhone}...`);
      
      try {
        const url = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/profile-picture?phone=${cleanPhone}`;
        const res = await fetch(url, {
          headers: { 'Client-Token': zapiClientToken }
        });
        const data = await res.json();
        console.log(`  - Resposta API (${cleanPhone}):`, data);
        
        const photoUrl = data.link || data.value;
        if (photoUrl) {
          await pool.query('UPDATE "Lead" SET "profilePic" = $1 WHERE id = $2', [photoUrl, lead.id]);
          console.log(`  ✅ Foto salva!`);
        } else {
          console.log(`  ❌ Nenhuma foto nesta resposta.`);
          // Tenta buscar o perfil completo se a foto falhar
          const profileRes = await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/profile/${cleanPhone}`, {
            headers: { 'Client-Token': zapiClientToken }
          });
          const profileData = await profileRes.json();
          console.log(`  - Resposta Perfil (${cleanPhone}):`, profileData);
          if (profileData.photo) {
            await pool.query('UPDATE "Lead" SET "profilePic" = $1 WHERE id = $2', [profileData.photo, lead.id]);
            console.log(`  ✅ Foto salva via Perfil!`);
          }
        }
      } catch (e) {
        console.error(`  ❌ Erro na API: ${e.message}`);
      }
    }
    console.log('Finalizado!');
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

fixPhotos();
