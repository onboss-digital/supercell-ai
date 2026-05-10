const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`UPDATE "Sale" SET "canalVenda" = 'WhatsApp' WHERE "nomeCliente" = 'LUIZ BUSINESS'`)
  .then(res => { console.log('Atualizado com sucesso!'); process.exit(); })
  .catch(err => { console.error(err); process.exit(1); });
