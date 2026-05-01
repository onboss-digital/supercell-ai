import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function sync() {
  try {
    const bms = await pool.query('SELECT * FROM "BusinessManager"');
    console.log(`Encontradas ${bms.rows.length} BMs para sincronizar.`);
    
    for (const bm of bms.rows) {
      console.log(`Sincronizando BM: ${bm.name} (${bm.bmId})`);
      
      const urlOwned = `https://graph.facebook.com/v19.0/${bm.bmId}/owned_ad_accounts?fields=name,account_id,account_status&access_token=${bm.accessToken}`;
      const urlClient = `https://graph.facebook.com/v19.0/${bm.bmId}/client_ad_accounts?fields=name,account_id,account_status&access_token=${bm.accessToken}`;
      
      const [resO, resC] = await Promise.all([
        fetch(urlOwned).then(r => r.json()),
        fetch(urlClient).then(r => r.json())
      ]);

      const all = [...(resO.data || []), ...(resC.data || [])];
      
      // Remove duplicatas
      const unique = Array.from(new Map(all.map(a => [a.account_id, a])).values());
      console.log(` - ${unique.length} contas de anúncio detectadas.`);

      for (const acc of unique) {
        const status = (acc.account_status === 1 || acc.account_status === 101) ? 'ACTIVE' : 'DISABLED';
        await pool.query(
          'INSERT INTO "AdAccount" (id, name, "actId", status, "bmId", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) ON CONFLICT ("actId") DO UPDATE SET status = EXCLUDED.status, name = EXCLUDED.name',
          [acc.name || 'Sem nome', acc.account_id, status, bm.id]
        );
        console.log(`   [OK] ${acc.name} (${acc.account_id})`);
      }
    }
    console.log('✅ Sincronização concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na sincronização:', err.message);
  } finally {
    process.exit();
  }
}

sync();
