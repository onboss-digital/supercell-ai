import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// CONFIGURAÇÃO DE SEGURANÇA (AES-256)
const algorithm = 'aes-256-cbc';
const encryptionKey = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'supercell_ai_default_secret_key_2026', 'salt', 32);

function decrypt(text) {
  if (!text || !text.includes(':')) return text;
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

async function sync() {
  try {
    const bms = await pool.query('SELECT * FROM "BusinessManager"');
    console.log(`Encontradas ${bms.rows.length} BMs para sincronizar.`);
    
    for (const bm of bms.rows) {
      console.log(`Sincronizando BM: ${bm.name} (${bm.bmId})`);
      
      const decryptedToken = decrypt(bm.accessToken);
      
      const urlOwned = `https://graph.facebook.com/v19.0/${bm.bmId}/owned_ad_accounts?fields=name,account_id,account_status&access_token=${decryptedToken}`;
      const urlClient = `https://graph.facebook.com/v19.0/${bm.bmId}/client_ad_accounts?fields=name,account_id,account_status&access_token=${decryptedToken}`;
      
      const [resO, resC] = await Promise.all([
        fetch(urlOwned).then(r => r.json()),
        fetch(urlClient).then(r => r.json())
      ]);

      if (resO.error) {
        console.error(`[Meta Error Owned] BM ${bm.bmId}:`, resO.error.message);
      }
      if (resC.error) {
        console.error(`[Meta Error Client] BM ${bm.bmId}:`, resC.error.message);
      }

      const all = [...(resO.data || []), ...(resC.data || [])];
      
      // Remove duplicatas
      const unique = Array.from(new Map(all.map(a => [a.account_id, a])).values());
      console.log(` - ${unique.length} contas de anúncio detectadas.`);

      for (const acc of unique) {
        const status = (acc.account_status === 1 || acc.account_status === 9 || acc.account_status === 3) ? 'ACTIVE' : 'DISABLED';
        await pool.query(
          'INSERT INTO "AdAccount" (id, name, "actId", status, "bmId", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) ON CONFLICT ("actId") DO UPDATE SET status = EXCLUDED.status, name = EXCLUDED.name',
          [acc.name || 'Sem nome', acc.account_id, status, bm.id]
        );
        console.log(`   [OK] ${acc.name} (${acc.account_id}) -> Status no DB: ${status}`);
      }
    }
    console.log('✅ Sincronização concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na sincronização:', err.message);
  } finally {
    await pool.end();
  }
}

sync();
