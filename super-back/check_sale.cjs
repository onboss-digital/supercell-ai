const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT * FROM "Sale" ORDER BY "createdAt" DESC LIMIT 1')
  .then(res => { console.log(res.rows[0]); process.exit(); })
  .catch(err => { console.error(err); process.exit(1); });
